/* ===== DM Group KSA — Finance Internal Controller Dashboard — SCRIPT field · v2 =====
   READ-ONLY control dashboard: workflow approvals, payments, journals, payables, receivables, expense claims, bank
   reconciliation and control exceptions, through frappe.client.get_list / frappe.client.get and
   erpnext.accounts.utils.get_balance_on under the viewer's permissions. The v1 model (workflow state sets, merged
   paging across document types, exception rules, record trail) is kept.
   Built on the DM dashboard standard; the shared runtime between the "DMS kit" markers is generated from
   tools/erp/kit/dms-kit.js (edit the kit and run build_kit.py, not the copy). */
(function () {
  'use strict';
  var APP = {
    key: '__dmsFinanceInternalController',
    period: 'year',
    defaultTab: 'approvals',
    defaultApprovalStatus: 'pending',
    cfg: { kpiCount: 6, pageSize: 25 },
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'approvals', en: 'Approvals', ar: 'الاعتمادات' }, { id: 'payments', en: 'Payments', ar: 'المدفوعات' },
      { id: 'journals', en: 'Journals', ar: 'القيود' }, { id: 'ap', en: 'Payables', ar: 'الدائنون' }, { id: 'ar', en: 'Receivables', ar: 'المدينون' },
      { id: 'expenses', en: 'Expense claims', ar: 'مطالبات المصروفات' }, { id: 'bank', en: 'Bank', ar: 'البنك' }, { id: 'audit', en: 'Control exceptions', ar: 'استثناءات الرقابة' },
      { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', none: ['All system-currency companies', 'كل شركات عملة النظام'], options: function () { return COMPANIES.map(function (c) { return { v: c, l: c + (COMPANY_CURRENCIES[c] && COMPANY_CURRENCIES[c] !== CUR ? ' (' + COMPANY_CURRENCIES[c] + ')' : '') }; }); } },
      { k: 'doctype', en: 'Document type', ar: 'نوع المستند', options: function () { return PEND4.map(function (d) { return { v: d, l: dtl(d) }; }); } },
      { k: 'wf', en: 'Workflow state', ar: 'حالة سير العمل', options: function () { return WFSTATES.map(function (s) { return { v: s, l: tState(s) }; }); } },
      { k: 'ap', en: 'Approval status', ar: 'حالة الاعتماد', options: function () { return [['pending', 's_pending'], ['approved', 's_approved'], ['rejected', 's_rejected'], ['returned', 's_returned']].map(function (x) { return { v: x[0], l: t(x[1]) }; }); } },
      { k: 'age', en: 'Waiting longer than', ar: 'بانتظار أكثر من', options: function () { return [3, 7, 14, 30, 60].map(function (d) { return { v: String(d), l: '> ' + daysTxt(d) }; }); } },
      { k: 'search', type: 'text', en: 'Search', ar: 'بحث', ph: ['Document, party, reference…', 'مستند، طرف، مرجع…'] }
    ],
    sources: ['acts'],
    dtLabels: { 'Payment Entry': ['Payment', 'سند دفع'], 'Journal Entry': ['Journal entry', 'قيد يومية'], 'Expense Claim': ['Expense claim', 'مطالبة مصروفات'], 'Purchase Invoice': ['Purchase invoice', 'فاتورة شراء'], 'Sales Invoice': ['Sales invoice', 'فاتورة مبيعات'], 'Bank Transaction': ['Bank transaction', 'معاملة بنكية'] },
    title: function () { return tr('Finance internal controller', 'الرقابة المالية الداخلية'); },
    stamp: function () { return tr('Read-only · ', 'للقراءة فقط · ') + CUR; },
    filterNote: function () { return tr('Without a company, figures cover companies in ' + CUR + ' only. Document type, workflow state, approval status, waiting time and search shape the approval and record tables.', 'بدون شركة تشمل الأرقام شركات ' + CUR + ' فقط. نوع المستند وحالة سير العمل والاعتماد ومدة الانتظار والبحث تخص جداول الاعتماد والسجلات.'); },
    periodNote: function () { return tr('Counts use the posting date in the period. Open balances and actions pending are as of today.', 'الأعداد حسب تاريخ الترحيل في الفترة. الأرصدة المفتوحة والإجراءات المعلقة حتى اليوم.'); },
    boot: function (chk) { return boot(chk); },
    load: function () { sync(); KC = {}; EXC_CACHE = {}; NEST = {}; loadActs(); },
    onFilters: function (prev) { if (prev.company !== F.company) { sync(); loadWfStates(); } },
    onRefresh: function () { WFDEF = null; loadWF(); },
    actions: function () { return actModel(ACTS(), 'acts', actClient()); },
    banner: function () { var o = otherCos(); return o.length ? alertBox('info', esc(tr('Amounts are in ' + CUR + '. Not included (other currency): ', 'المبالغ بعملة ' + CUR + '. غير مشمولة (عملة أخرى): ') + o.join(', ') + '.')) : ''; },
    content: function (tb, AM) { sync(); return { overview: tabOverview, approvals: tabApprovals, payments: tabPayments, journals: tabJournals, ap: function () { return tabBalances('ap'); }, ar: function () { return tabBalances('ar'); }, expenses: tabExpenses, bank: tabBank, audit: tabAudit, actions: tabActions }[tb](AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v) {
      if (a === 'chip') { var p = v.split(':'); S[p[0]] = p[1] === 'true' ? true : p[1] === 'false' ? false : p[1]; if (p[0] === 'apRange' || p[0] === 'arRange') { KC = {}; } Object.keys(SS).forEach(function (k) { SS[k].dirty = true; SS[k].page = 1; }); renderSoft(); return true; }
      return false;
    }
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

  var SCAN_CAP = 2000, BACKDATE_DAYS = 7, ATTACH_SAMPLE = 300;
  var I18N = {
  en: {
  title:'Finance – Internal Controller Dashboard', subtitle:'DM Group KSA', refresh:'Refresh', company:'Company', period:'Period',
  from:'From Date', to:'To Date', doctype:'Document Type', wfstate:'Workflow Status', apstatus:'Approval Status', search:'Search',
  search_ph:'Document no., party, reference…', reset:'Reset', all:'All', any:'Any', all_companies:'All Companies',
  p_today:'Today', p_week:'This Week', p_month:'This Month', p_year:'This Year', p_all:'All Time', p_custom:'Custom',
  s_pending:'Pending', s_approved:'Approved', s_rejected:'Rejected', s_returned:'Returned',
  t_overview:'Overview', t_approvals:'Approvals & Workflow', t_payments:'Payment Control', t_journals:'Journal Entry Control',
  t_ap:'Accounts Payable', t_ar:'Accounts Receivable', t_expenses:'Expense Claims', t_bank:'Bank & Reconciliation', t_audit:'Audit & Internal Controls',
  ch_status:'Approval Status Distribution', ch_trend:'Monthly Payment Trend', ch_pendtype:'Pending Documents by Type',
  ch_apprej:'Approved vs Rejected Transactions', ch_payrec:'Outstanding Payables vs Receivables', attention:'Needs Immediate Attention',
  wf_summary:'Workflow Summary (by document type and state)', pendingdur:'Pending Duration',
  age_hint:'Pending days = today − posting date (ERPNext keeps no transition timestamp on the document; see the approval trail in details).',
  ch_paytype:'Payments by Type', ch_paymode:'Payments by Mode of Payment', ch_paystate:'Payments by Approval State',
  ch_jestate:'Journal Entries by Workflow State', ch_jetype:'Journal Entries by Voucher Type',
  bal_note:'Balances are live as of today (outstanding converted to company currency at each invoice\'s exchange rate).',
  bal_note_ar:'Balances are live as of today. Cancelled documents are excluded.', apply_range:'Apply the date range to invoice posting date',
  ch_apage:'Payables Ageing (days past due)', ch_topsup:'Top Suppliers by Outstanding', ch_arage:'Receivables Ageing (days past due)',
  ch_topcust:'Top Overdue Customers', v_invoices:'Invoices', v_suppliers:'Suppliers', v_customers:'Customers',
  ch_ecstatus:'Claims by Approval Status', ch_ecpay:'Claims by Payment Status', ch_ecemp:'Top Employees by Claimed Amount',
  ch_bankstatus:'Bank Transactions by Status', ch_bankacc:'Unreconciled Amount by Bank Account', bank_wise:'Bank-wise Summary', bank_tx:'Bank Transactions',
  ex_type:'Exception Type', ex_sev:'Severity', sev_high:'High', sev_medium:'Medium', sev_low:'Low', ex_register:'Exception Register',
  audit_legend:'Confirmed = proven by the stated server-side check on all matching records. Indicative = derived from a capped scan or a proxy field and must be verified in the record\'s approval trail.',
  open_erp:'Open in ERP', back:'Back', close:'Close', loading:'Loading…', empty:'No records match the current filters.', na:'N/A',
  err_load:'Could not load this data', prev:'Previous', next:'Next', page:'Page', of:'of', records:'records', view:'View',
  /* kpis */
  k_pending_total:'Total Pending Approvals', k_pay_pending:'Payments Pending Review', k_je_pending:'Journal Entries Pending Review',
  k_pi_pending:'Purchase Invoices Pending Review', k_ec_pending:'Expense Claims Pending Approval', k_approved:'Total Approved Transactions',
  k_rejected:'Total Rejected Transactions', k_overdue_pi:'Overdue Supplier Invoices', k_ar_out:'Outstanding Receivables', k_ap_out:'Outstanding Payables',
  k_attention:'Transactions Requiring Attention', k_exceptions:'Financial Control Exceptions',
  k_aged7:'Pending > 7 Days', k_returned:'Returned for Amendment',
  k_pe_total:'Total Payment Entries', k_pe_pending:'Pending Payment Entries', k_pe_approved:'Approved Payments', k_pe_rejected:'Rejected Payments',
  k_pe_sup:'Supplier Payments', k_pe_cust:'Customer Receipts', k_pe_unalloc:'Unallocated Payments', k_pe_exc:'Payment Exceptions',
  k_je_total:'Total Journal Entries', k_je_pend:'Pending Journal Entries', k_je_appr:'Approved Journal Entries', k_je_rej:'Rejected Journal Entries',
  k_je_canc:'Cancelled Entries', k_je_back:'Backdated Entries', k_je_rev:'Reversal Entries', k_je_unbal:'Unbalanced Entries',
  k_ap_total:'Total Outstanding Payables', k_ap_overdue:'Overdue Payables', k_ap_unpaid:'Unpaid Invoices', k_ap_7:'Due Within 7 Days',
  k_ap_30:'Due Within 30 Days', k_ap_cn:'Supplier Credit Notes', k_ap_review:'Invoices Pending Review',
  k_ar_total:'Total Outstanding Receivables', k_ar_overdue:'Overdue Receivables', k_ar_credit:'Customer Credit Balances',
  k_ar_count:'Outstanding Invoices', k_ar_unalloc:'Unallocated Customer Receipts',
  k_ec_total:'Total Claims', k_ec_pend:'Pending Claims', k_ec_appr:'Approved Claims', k_ec_rej:'Rejected Claims', k_ec_unpaid:'Unpaid Approved Claims',
  k_ec_claimed:'Total Claimed Amount', k_ec_sanct:'Total Sanctioned Amount', k_ec_reimb:'Total Reimbursed Amount',
  k_bk_bal:'Bank Account Balances', k_bk_unrec:'Unreconciled Transactions', k_bk_rec:'Reconciled Transactions', k_bk_dep:'Outstanding Deposits',
  k_bk_wd:'Outstanding Withdrawals', k_bk_unm:'Unmatched Bank Transactions',
  k_ex_types:'Exception Types Triggered', k_ex_high:'High-Severity Records', k_ex_conf:'Confirmed Records', k_ex_ind:'Indicative Records',
  /* columns */
  c_doc:'Document No.', c_type:'Document Type', c_company:'Company', c_date:'Posting Date', c_by:'Requested By', c_amount:'Amount',
  c_state:'Workflow State', c_role:'Current Approver / Role', c_days:'Pending Days', c_act:'Actions', c_ptype:'Payment Type', c_party:'Party Name',
  c_paid:'Paid Amount', c_recv:'Received Amount', c_mode:'Payment Mode', c_ref:'Reference No.', c_status:'Status', c_vtype:'Voucher Type',
  c_debit:'Total Debit', c_credit:'Total Credit', c_diff:'Difference', c_created:'Created By', c_flags:'Flags', c_supplier:'Supplier',
  c_customer:'Customer', c_bill:'Supplier Inv. No.', c_due:'Due Date', c_cur:'Currency', c_inv:'Invoice Amount', c_out:'Outstanding',
  c_outbase:'Outstanding (' + CUR + ')', c_overdue:'Days Overdue', c_count:'Invoices', c_employee:'Employee', c_claimed:'Claimed',
  c_sanct:'Sanctioned', c_reimb:'Reimbursed', c_appr:'Approval Status', c_paystatus:'Payment Status', c_bank:'Bank Account', c_deposit:'Deposit',
  c_withdraw:'Withdrawal', c_unalloc:'Unallocated', c_balance:'Balance', c_ntx:'Transactions', c_sev:'Severity', c_conf:'Confidence', c_exc:'Exception',
  c_cnt:'Count', c_basis:'Check performed', c_workflow_active:'Workflow', c_docstatus:'Doc Status', c_n:'Count', c_posted:'Posted without approval',
  /* misc */
  conf_confirmed:'Confirmed', conf_indicative:'Indicative', wf_active:'Active', wf_inactive:'Inactive', wf_none:'No workflow',
  d_draft:'Draft', d_submitted:'Submitted', d_cancelled:'Cancelled', scanned:'scanned {a} of {b}', trail:'Approval Trail', attachments:'Attachments',
  none:'None', lines:'Accounts', refs:'References', expenses:'Expenses', verify_same:'Created and approved by the same user (confirmed from approval trail)',
  verify_diff:'Approver differs from creator', no_trail:'No workflow changes recorded', flag_unbal:'Unbalanced', flag_hdr:'Header ≠ lines', flag_back:'Backdated',
  flag_unappr:'Posted unapproved', flag_canc:'Cancelled', scope_default:'Company and date filters apply to every tab.',
  scope_appr:'All filters apply to this tab (company, dates, document type, workflow status, approval status, search, pending duration).',
  scope_tbl:'Company, dates, workflow status, approval status and search apply to the table; KPIs and charts follow company and dates.',
  scope_bal:'Company applies to balances; dates apply only if the checkbox is ticked.', scope_bank:'Company and dates (transaction date) apply.',
  scope_audit:'Company and dates apply; exception type and severity filter the register.',
  no_wf:'Not available', bank_note_norec:'The “Bank Reconciliation” DocType does not exist in this ERP; reconciliation is read from Bank Transaction status. Balances come from the General Ledger and are shown as N/A when they cannot be read.',
  open_report:'Open Bank Reconciliation Statement report', emp_claims:'Claims of {x}', grp_oldest:'Oldest pending approvals', grp_overdue:'Largest overdue supplier invoices', grp_exc:'Detected control exceptions',
  dup_group:'Duplicate group', view_all:'View all', def_attn:'Pending approvals older than 7 days + returned documents + expense claims on hold',
  def_exc:'Confirmed core checks: unbalanced journals, records posted without approval, unallocated payments, duplicate payment references, duplicate supplier invoice numbers.'
  },
  ar: {
  title:'المالية – لوحة المراقب الداخلي', subtitle:'مجموعة دي إم – السعودية', refresh:'تحديث', company:'الشركة', period:'الفترة',
  from:'من تاريخ', to:'إلى تاريخ', doctype:'نوع المستند', wfstate:'حالة سير العمل', apstatus:'حالة الاعتماد', search:'بحث',
  search_ph:'رقم المستند، الطرف، المرجع…', reset:'إعادة ضبط', all:'الكل', any:'أي', all_companies:'جميع الشركات',
  p_today:'اليوم', p_week:'هذا الأسبوع', p_month:'هذا الشهر', p_year:'هذه السنة', p_all:'كل الفترات', p_custom:'مخصص',
  s_pending:'قيد الانتظار', s_approved:'معتمد', s_rejected:'مرفوض', s_returned:'مُعاد',
  t_overview:'نظرة عامة', t_approvals:'الاعتمادات وسير العمل', t_payments:'رقابة المدفوعات', t_journals:'رقابة قيود اليومية',
  t_ap:'الحسابات الدائنة', t_ar:'الحسابات المدينة', t_expenses:'مطالبات المصروفات', t_bank:'البنوك والتسوية', t_audit:'التدقيق والرقابة الداخلية',
  ch_status:'توزيع حالات الاعتماد', ch_trend:'اتجاه المدفوعات الشهري', ch_pendtype:'المستندات المعلقة حسب النوع',
  ch_apprej:'المعاملات المعتمدة مقابل المرفوضة', ch_payrec:'الذمم الدائنة مقابل المدينة', attention:'يتطلب اهتمامًا فوريًا',
  wf_summary:'ملخص سير العمل (حسب نوع المستند والحالة)', pendingdur:'مدة الانتظار',
  age_hint:'أيام الانتظار = اليوم − تاريخ الترحيل (لا يحتفظ النظام بتاريخ الانتقال في المستند؛ راجع سجل الاعتماد في التفاصيل).',
  ch_paytype:'المدفوعات حسب النوع', ch_paymode:'المدفوعات حسب طريقة الدفع', ch_paystate:'المدفوعات حسب حالة الاعتماد',
  ch_jestate:'القيود حسب حالة سير العمل', ch_jetype:'القيود حسب نوع السند',
  bal_note:'الأرصدة حية حتى اليوم (المستحق محوّل لعملة الشركة بسعر صرف كل فاتورة).',
  bal_note_ar:'الأرصدة حية حتى اليوم. المستندات الملغاة مستبعدة.', apply_range:'تطبيق نطاق التاريخ على تاريخ ترحيل الفاتورة',
  ch_apage:'أعمار الذمم الدائنة (أيام التأخير)', ch_topsup:'أكبر الموردين رصيدًا', ch_arage:'أعمار الذمم المدينة (أيام التأخير)',
  ch_topcust:'أكبر العملاء المتأخرين', v_invoices:'الفواتير', v_suppliers:'الموردون', v_customers:'العملاء',
  ch_ecstatus:'المطالبات حسب حالة الاعتماد', ch_ecpay:'المطالبات حسب حالة الدفع', ch_ecemp:'أعلى الموظفين مطالبةً',
  ch_bankstatus:'المعاملات البنكية حسب الحالة', ch_bankacc:'المبلغ غير المسوّى حسب الحساب البنكي', bank_wise:'ملخص حسب البنك', bank_tx:'المعاملات البنكية',
  ex_type:'نوع الاستثناء', ex_sev:'الخطورة', sev_high:'عالية', sev_medium:'متوسطة', sev_low:'منخفضة', ex_register:'سجل الاستثناءات',
  audit_legend:'مؤكد = ثبت بالفحص المذكور على جميع السجلات المطابقة. إرشادي = ناتج عن فحص محدود أو حقل بديل ويجب التحقق منه في سجل اعتماد المستند.',
  open_erp:'فتح في النظام', back:'رجوع', close:'إغلاق', loading:'جارٍ التحميل…', empty:'لا توجد سجلات مطابقة للمرشحات الحالية.', na:'غير متاح',
  err_load:'تعذر تحميل هذه البيانات', prev:'السابق', next:'التالي', page:'صفحة', of:'من', records:'سجل', view:'عرض',
  k_pending_total:'إجمالي الاعتمادات المعلقة', k_pay_pending:'مدفوعات بانتظار المراجعة', k_je_pending:'قيود يومية بانتظار المراجعة',
  k_pi_pending:'فواتير شراء بانتظار المراجعة', k_ec_pending:'مطالبات مصروفات بانتظار الاعتماد', k_approved:'إجمالي المعاملات المعتمدة',
  k_rejected:'إجمالي المعاملات المرفوضة', k_overdue_pi:'فواتير موردين متأخرة', k_ar_out:'الذمم المدينة المستحقة', k_ap_out:'الذمم الدائنة المستحقة',
  k_attention:'معاملات تتطلب انتباهًا', k_exceptions:'استثناءات الرقابة المالية',
  k_aged7:'معلق لأكثر من 7 أيام', k_returned:'مُعاد للتعديل',
  k_pe_total:'إجمالي سندات الدفع', k_pe_pending:'سندات دفع معلقة', k_pe_approved:'مدفوعات معتمدة', k_pe_rejected:'مدفوعات مرفوضة',
  k_pe_sup:'مدفوعات الموردين', k_pe_cust:'مقبوضات العملاء', k_pe_unalloc:'مدفوعات غير مخصصة', k_pe_exc:'استثناءات المدفوعات',
  k_je_total:'إجمالي قيود اليومية', k_je_pend:'قيود معلقة', k_je_appr:'قيود معتمدة', k_je_rej:'قيود مرفوضة',
  k_je_canc:'قيود ملغاة', k_je_back:'قيود بأثر رجعي', k_je_rev:'قيود عكسية', k_je_unbal:'قيود غير متوازنة',
  k_ap_total:'إجمالي الذمم الدائنة', k_ap_overdue:'ذمم دائنة متأخرة', k_ap_unpaid:'فواتير غير مدفوعة', k_ap_7:'مستحقة خلال 7 أيام',
  k_ap_30:'مستحقة خلال 30 يومًا', k_ap_cn:'إشعارات دائنة للموردين', k_ap_review:'فواتير بانتظار المراجعة',
  k_ar_total:'إجمالي الذمم المدينة', k_ar_overdue:'ذمم مدينة متأخرة', k_ar_credit:'أرصدة العملاء الدائنة',
  k_ar_count:'فواتير مستحقة', k_ar_unalloc:'مقبوضات عملاء غير مخصصة',
  k_ec_total:'إجمالي المطالبات', k_ec_pend:'مطالبات معلقة', k_ec_appr:'مطالبات معتمدة', k_ec_rej:'مطالبات مرفوضة', k_ec_unpaid:'مطالبات معتمدة غير مدفوعة',
  k_ec_claimed:'إجمالي المبلغ المطالب به', k_ec_sanct:'إجمالي المبلغ المعتمد', k_ec_reimb:'إجمالي المبلغ المسدد',
  k_bk_bal:'أرصدة الحسابات البنكية', k_bk_unrec:'معاملات غير مسوّاة', k_bk_rec:'معاملات مسوّاة', k_bk_dep:'إيداعات معلقة',
  k_bk_wd:'سحوبات معلقة', k_bk_unm:'معاملات بنكية غير مطابقة',
  k_ex_types:'أنواع الاستثناءات المكتشفة', k_ex_high:'سجلات عالية الخطورة', k_ex_conf:'سجلات مؤكدة', k_ex_ind:'سجلات إرشادية',
  c_doc:'رقم المستند', c_type:'نوع المستند', c_company:'الشركة', c_date:'تاريخ الترحيل', c_by:'مقدم الطلب', c_amount:'المبلغ',
  c_state:'حالة سير العمل', c_role:'المعتمد / الدور الحالي', c_days:'أيام الانتظار', c_act:'إجراءات', c_ptype:'نوع الدفع', c_party:'اسم الطرف',
  c_paid:'المبلغ المدفوع', c_recv:'المبلغ المستلم', c_mode:'طريقة الدفع', c_ref:'رقم المرجع', c_status:'الحالة', c_vtype:'نوع السند',
  c_debit:'إجمالي المدين', c_credit:'إجمالي الدائن', c_diff:'الفرق', c_created:'أنشأه', c_flags:'تنبيهات', c_supplier:'المورد',
  c_customer:'العميل', c_bill:'رقم فاتورة المورد', c_due:'تاريخ الاستحقاق', c_cur:'العملة', c_inv:'مبلغ الفاتورة', c_out:'المستحق',
  c_outbase:'المستحق (' + CUR + ')', c_overdue:'أيام التأخير', c_count:'الفواتير', c_employee:'الموظف', c_claimed:'المطالَب به',
  c_sanct:'المعتمد', c_reimb:'المسدد', c_appr:'حالة الاعتماد', c_paystatus:'حالة الدفع', c_bank:'الحساب البنكي', c_deposit:'إيداع',
  c_withdraw:'سحب', c_unalloc:'غير مخصص', c_balance:'الرصيد', c_ntx:'المعاملات', c_sev:'الخطورة', c_conf:'الموثوقية', c_exc:'الاستثناء',
  c_cnt:'العدد', c_basis:'الفحص المنفذ', c_workflow_active:'سير العمل', c_docstatus:'حالة المستند', c_n:'العدد', c_posted:'مرحّل دون اعتماد',
  conf_confirmed:'مؤكد', conf_indicative:'إرشادي', wf_active:'فعّال', wf_inactive:'غير فعّال', wf_none:'بلا سير عمل',
  d_draft:'مسودة', d_submitted:'مُرحّل', d_cancelled:'ملغى', scanned:'تم فحص {a} من {b}', trail:'سجل الاعتماد', attachments:'المرفقات',
  none:'لا يوجد', lines:'الحسابات', refs:'المراجع', expenses:'المصروفات', verify_same:'أنشأه واعتمده المستخدم نفسه (مؤكد من سجل الاعتماد)',
  verify_diff:'المعتمد يختلف عن المنشئ', no_trail:'لا توجد تغييرات سير عمل مسجلة', flag_unbal:'غير متوازن', flag_hdr:'الرأس ≠ البنود', flag_back:'بأثر رجعي',
  flag_unappr:'مرحّل دون اعتماد', flag_canc:'ملغى', scope_default:'مرشحا الشركة والتاريخ يطبقان على كل التبويبات.',
  scope_appr:'جميع المرشحات تطبق على هذا التبويب (الشركة، التواريخ، نوع المستند، حالة سير العمل، حالة الاعتماد، البحث، مدة الانتظار).',
  scope_tbl:'الشركة والتواريخ وحالة سير العمل وحالة الاعتماد والبحث تطبق على الجدول؛ المؤشرات والرسوم تتبع الشركة والتواريخ.',
  scope_bal:'الشركة تطبق على الأرصدة؛ التواريخ تطبق فقط عند تفعيل الخيار.', scope_bank:'الشركة والتواريخ (تاريخ المعاملة) تطبق.',
  scope_audit:'الشركة والتواريخ تطبق؛ نوع الاستثناء والخطورة يصفّيان السجل.',
  no_wf:'غير متاح', bank_note_norec:'نوع المستند «تسوية بنكية» غير موجود في هذا النظام؛ تُقرأ التسوية من حالة المعاملة البنكية. الأرصدة من دفتر الأستاذ وتظهر «غير متاح» إن تعذرت قراءتها.',
  open_report:'فتح تقرير كشف التسوية البنكية', emp_claims:'مطالبات {x}', grp_oldest:'أقدم الاعتمادات المعلقة', grp_overdue:'أكبر فواتير الموردين المتأخرة', grp_exc:'استثناءات الرقابة المكتشفة',
  dup_group:'مجموعة مكررة', view_all:'عرض الكل', def_attn:'اعتمادات معلقة لأكثر من 7 أيام + مستندات مُعادة + مطالبات معلقة (Hold)',
  def_exc:'فحوص أساسية مؤكدة: قيود غير متوازنة، سجلات مرحّلة دون اعتماد، مدفوعات غير مخصصة، مراجع دفع مكررة، أرقام فواتير موردين مكررة.'
  }};
  var STATE_AR = {'Pending':'قيد الانتظار','Pending Approval':'بانتظار الاعتماد','Pending Review':'بانتظار المراجعة','Approved':'معتمد','Rejected':'مرفوض',
   'Finally Rejected':'مرفوض نهائيًا','Review':'قيد المراجعة','submitted':'مُقدَّم','Submitted After Review':'مُقدَّم بعد المراجعة','Hold':'معلق','Paid':'مدفوع',
   'Pending Payment':'بانتظار الدفع','Submitted':'مُرحّل','Unpaid':'غير مدفوع','Draft':'مسودة','Cancelled':'ملغى','Overdue':'متأخر','Partly Paid':'مدفوع جزئيًا',
   'Return':'مرتجع','Credit Note Issued':'أُصدر إشعار دائن','Debit Note Issued':'أُصدر إشعار مدين','Unreconciled':'غير مسوّى','Reconciled':'مسوّى','Settled':'مسوّى',
   'Receive':'قبض','Pay':'دفع','Internal Transfer':'تحويل داخلي','Under Primary Ammendment':'تحت التعديل الأولي','Accounting Review And Payment':'مراجعة محاسبية ودفع'};
  var DT_LABEL = {en:{'Payment Entry':'Payment Entry','Journal Entry':'Journal Entry','Expense Claim':'Expense Claim','Purchase Invoice':'Purchase Invoice','Sales Invoice':'Sales Invoice','Bank Transaction':'Bank Transaction'},
   ar:{'Payment Entry':'سند دفع','Journal Entry':'قيد يومية','Expense Claim':'مطالبة مصروفات','Purchase Invoice':'فاتورة شراء','Sales Invoice':'فاتورة مبيعات','Bank Transaction':'معاملة بنكية'}};
  var S = { lang: 'en', company: '', from: '', to: '', doctype: '', wf: '', ap: '', search: '', age: 0, apRange: false, arRange: false, apView: 'inv', arView: 'inv', exType: '', exSev: '', ver: 0 };
  var COMPANIES = [], WFSTATES = [], WFDEF = null, KC = {}, NEST = {}, NSEQ = 0, SCOPE = [];
  function t(k, o) { var s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k; if (o) { for (var x in o) { s = s.replace('{' + x + '}', o[x]); } } return s; }
  function tState(s) { if (s == null || s === '') { return '—'; } return S.lang === 'ar' && STATE_AR[s] ? STATE_AR[s] : s; }
  function dtl(dt) { return (DT_LABEL[S.lang] && DT_LABEL[S.lang][dt]) || dt; }
  function userName(u) { try { var i = frappe.user_info(u); return (i && i.fullname) || u || '—'; } catch (e) { return u || '—'; } }
  function docLbl(ds) { return ds === 0 ? t('d_draft') : ds === 1 ? t('d_submitted') : t('d_cancelled'); }
  function n0(v) { return num(v || 0); }
  function n2(v) { return amt(v || 0); }
  function today() { return TODAY; }
  function dayDiff(a, b) { return diffDays(String(a).slice(0, 10), String(b).slice(0, 10)); }
  function sync() {
    var r = clip(PERIOD); S.lang = LANG; S.company = F.company; S.from = r[0]; S.to = r[1]; S.doctype = F.doctype; S.wf = F.wf; S.ap = F.ap; S.age = +F.age || 0; S.search = clean(F.search); S.ver = GEN;
    SCOPE = F.company ? [F.company] : COMPANIES.filter(function (c) { return COMPANY_CURRENCIES[c] === CUR; });
    if (!SCOPE.length && COMPANIES.length && !F.company) { SCOPE = COMPANIES.slice(0, 1); }
  }
  function otherCos() { return F.company ? [] : COMPANIES.filter(function (c) { return SCOPE.indexOf(c) < 0; }).map(function (c) { return c + ' (' + (COMPANY_CURRENCIES[c] || '?') + ')'; }); }

  /* ---------- API ---------- */
  var COMPANY_CURRENCIES = {};
  function baseBalance(r){
   var co=COMPANY_CURRENCIES[r.company],party=r.party_account_currency,amount=Number(r.o==null?r.outstanding_amount:r.o)||0;
   if(!co || co!==CUR)throw new Error('Select a company whose base currency is '+CUR);
   if(party===co)return amount;
   if(party!==r.currency || !(Number(r.conversion_rate)>0))throw new Error('Unsupported party account currency conversion');
   return amount*Number(r.conversion_rate);
  }
  function gl(dt, o) {
    var a = { doctype: dt, fields: o.fields, filters: o.filters || [], order_by: o.order || '', limit_start: o.start || 0, limit_page_length: o.limit == null ? 20 : o.limit };
    if (o.or && o.or.length) { a.or_filters = o.or; } if (o.group) { a.group_by = o.group; } if (o.parent) { a.parent = o.parent; }
    return getList(a).then(function (r) { return r || []; });
  }
  function cnt(dt, filters, or) { return gl(dt, { fields: ['count(name) as n'], filters: filters, or: or, limit: 1 }).then(function (r) { return (r[0] && +r[0].n) || 0; }); }
  function sumOf(dt, field, filters) { return gl(dt, { fields: ['sum(' + field + ') as s', 'count(name) as n'], filters: filters, limit: 1 }).then(function (r) { return { s: (r[0] && +r[0].s) || 0, n: (r[0] && +r[0].n) || 0 }; }); }
  function boot(chk) {
    return getList({ doctype: 'Company', fields: ['name', 'default_currency'], order_by: 'name asc', limit_page_length: 0 }, chk).then(function (c) { (c || []).forEach(function (x) { COMPANY_CURRENCIES[x.name] = x.default_currency; }); COMPANIES = (c || []).map(function (x) { return x.name; }); }, function () { COMPANIES = []; })
      .then(function () { sync(); return Promise.all([loadWF(), loadWfStates()]); });
  }
  /* async cells: one promise per key and data generation; the view repaints when each settles */
  function cell(key, fn) { var k = GEN + '|' + key, c = KC[k]; if (!c) { c = KC[k] = { p: 1 }; Promise.resolve().then(fn).then(function (v) { c.v = v; c.p = 0; soon(); }, function (e) { c.e = (e && e.message) || 'Error'; c.p = 0; soon(); }); } return c; }
  function CH(key, fn, draw) { var c = cell(key, fn); return c.p ? skel(1, 'dms-skel-panel') : c.e ? alertBox('err', esc(t('err_load') + ': ' + c.e)) : draw(c.v); }

  /* ---------- filters (kept from v1; company scope is one currency) ---------- */
  var DF = { 'Bank Transaction': 'date', 'Payment Request': 'transaction_date' };
  function dfield(dt) { return DF[dt] || 'posting_date'; }
  var HASWF = { 'Payment Entry': 1, 'Journal Entry': 1, 'Expense Claim': 1 };
  function coF() { return S.company ? [['company', '=', S.company]] : SCOPE.length ? [['company', 'in', SCOPE]] : []; }
  function base(dt, o) {
    o = o || {}; var f = coF();
    if (!o.noDate) { if (S.from) { f.push([dfield(dt), '>=', S.from]); } if (S.to) { f.push([dfield(dt), '<=', S.to]); } }
    return f;
  }
  var SEARCHF = { 'Payment Entry': ['name', 'party_name', 'party', 'reference_no'], 'Journal Entry': ['name', 'user_remark', 'cheque_no', 'bill_no'], 'Expense Claim': ['name', 'employee', 'employee_name'], 'Purchase Invoice': ['name', 'supplier', 'supplier_name', 'bill_no'], 'Sales Invoice': ['name', 'customer', 'customer_name'], 'Bank Transaction': ['name', 'reference_number', 'bank_account'] };
  function orQ(dt, s) { return s ? (SEARCHF[dt] || ['name']).map(function (f) { return [f, 'like', '%' + s + '%']; }) : null; }
  function orSearch(dt) { return orQ(dt, S.search); }
  var WF_PEND = { 'Payment Entry': ['Pending', 'submitted'], 'Journal Entry': ['Pending', 'submitted', 'Submitted After Review'], 'Expense Claim': ['Pending', 'Pending Approval', 'Pending Review'] };
  var WF_RET = { 'Payment Entry': ['Review'], 'Journal Entry': ['Review'], 'Expense Claim': ['Under Primary Ammendment'] };
  var WF_REJ = { 'Payment Entry': ['Finally Rejected', 'Rejected'], 'Journal Entry': ['Finally Rejected', 'Rejected'], 'Expense Claim': ['Rejected', 'Finally Rejected'] };
  function stat2(dt, k) {
    if (dt === 'Purchase Invoice') { return k === 'pending' ? [['docstatus', '=', 0]] : null; }
    if (!HASWF[dt]) { return null; }
    if (k === 'pending') { return [['workflow_state', 'in', WF_PEND[dt]], ['docstatus', '!=', 2]]; }
    if (k === 'returned') { return [['workflow_state', 'in', WF_RET[dt]], ['docstatus', '!=', 2]]; }
    if (k === 'rejected') { return [['workflow_state', 'in', WF_REJ[dt]]]; }
    if (k === 'approved') { return dt === 'Expense Claim' ? [['approval_status', '=', 'Approved'], ['docstatus', '=', 1]] : [['workflow_state', '=', 'Approved'], ['docstatus', '=', 1]]; }
    return null;
  }
  function part(dt, k, extra, noDate) { var s = stat2(dt, k); if (!s) { return null; } return { dt: dt, filters: base(dt, { noDate: noDate }).concat(s, extra || []) }; }
  function parts(k, dts, extra, noDate) { return dts.map(function (d) { return part(d, k, extra, noDate); }).filter(Boolean); }
  var CORE3 = ['Payment Entry', 'Journal Entry', 'Expense Claim'], PEND4 = ['Payment Entry', 'Journal Entry', 'Expense Claim', 'Purchase Invoice'];
  function userFilters(dt) { var f = []; if (HASWF[dt] && S.wf) { f.push(['workflow_state', '=', S.wf]); } if (S.ap) { var s = stat2(dt, S.ap); if (s) { f = f.concat(s); } } return f; }

  /* ---------- field sets, normalisation, merged paging (v1) ---------- */
  var FIELDS = {
    'Payment Entry': ['name', 'posting_date', 'company', 'payment_type', 'party_type', 'party_name', 'party', 'paid_amount', 'received_amount', 'mode_of_payment', 'reference_no', 'workflow_state', 'status', 'docstatus', 'owner', 'creation', 'modified_by', 'unallocated_amount'],
    'Journal Entry': ['name', 'posting_date', 'company', 'voucher_type', 'total_debit', 'total_credit', 'difference', 'workflow_state', 'docstatus', 'owner', 'creation', 'modified_by', 'reversal_of'],
    'Expense Claim': ['name', 'posting_date', 'company', 'employee', 'employee_name', 'total_claimed_amount', 'total_sanctioned_amount', 'total_amount_reimbursed', 'approval_status', 'status', 'workflow_state', 'docstatus', 'owner'],
    'Purchase Invoice': ['name', 'posting_date', 'due_date', 'company', 'supplier', 'supplier_name', 'bill_no', 'currency', 'conversion_rate', 'grand_total', 'base_grand_total', 'outstanding_amount', 'party_account_currency', 'status', 'docstatus', 'owner', 'is_return'],
    'Sales Invoice': ['name', 'posting_date', 'due_date', 'company', 'customer', 'customer_name', 'currency', 'conversion_rate', 'grand_total', 'base_grand_total', 'outstanding_amount', 'party_account_currency', 'status', 'docstatus', 'owner', 'is_return'],
    'Bank Transaction': ['name', 'date', 'company', 'bank_account', 'deposit', 'withdrawal', 'unallocated_amount', 'status', 'reference_number', 'currency', 'docstatus']
  };
  function norm(dt, r) {
    var o = { dt: dt, name: r.name, company: r.company, date: r.posting_date || r.date, ds: r.docstatus, by: r.owner, raw: r };
    if (dt === 'Payment Entry') { o.party = r.party_name || r.party || '—'; o.amount = r.payment_type === 'Receive' ? r.received_amount : r.paid_amount; o.state = r.workflow_state; o.status = r.status; }
    else if (dt === 'Journal Entry') { o.party = r.voucher_type; o.amount = r.total_debit; o.state = r.workflow_state; o.status = docLbl(r.docstatus); }
    else if (dt === 'Expense Claim') { o.party = r.employee_name || r.employee; o.amount = r.total_claimed_amount; o.state = r.workflow_state || r.approval_status; o.status = r.status; }
    else if (dt === 'Purchase Invoice') { o.party = r.supplier_name || r.supplier; o.amount = r.base_grand_total; o.state = null; o.status = r.status; }
    else if (dt === 'Sales Invoice') { o.party = r.customer_name || r.customer; o.amount = r.base_grand_total; o.state = null; o.status = r.status; }
    else { o.party = r.bank_account; o.amount = (r.deposit || 0) || (r.withdrawal || 0); o.state = null; o.status = r.status; }
    return o;
  }
  function mergedLoader(pts, page, size) {
    return Promise.all(pts.map(function (p) { return cnt(p.dt, p.filters, p.or); })).then(function (cs) {
      var total = sum(cs), start = page * size, end = start + size, off = 0, jobs = [];
      pts.forEach(function (p, i) { var a = Math.max(start, off), b = Math.min(end, off + cs[i]); if (b > a) { jobs.push({ p: p, start: a - off, limit: b - a }); } off += cs[i]; });
      return Promise.all(jobs.map(function (j) {
        return gl(j.p.dt, { fields: FIELDS[j.p.dt], filters: j.p.filters, or: j.p.or, order: j.p.order || (dfield(j.p.dt) + ' ' + (j.p.asc ? 'asc' : 'desc') + ', creation desc'), start: j.start, limit: j.limit })
          .then(function (rows) { return rows.map(function (r) { return norm(j.p.dt, r); }); });
      })).then(function (arr) { return { rows: [].concat.apply([], arr), total: total }; });
    });
  }
  function staticLoader(list) { return function (page, size) { return Promise.resolve({ rows: list.slice(page * size, page * size + size), total: list.length }); }; }
  function loadWF() {
    if (WFDEF) { return Promise.resolve(WFDEF); }
    return gl('Workflow', { fields: ['name', 'document_type', 'is_active'], filters: [['document_type', 'in', CORE3]], limit: 50 }).then(function (ws) {
      return Promise.all(ws.map(function (w) { return guarded(null, 'frappe.client.get', { doctype: 'Workflow', name: w.name }).catch(function () { return null; }); }));
    }).then(function (docs) {
      var d = {};
      docs.forEach(function (w) { if (!w) { return; } var e = d[w.document_type] || (d[w.document_type] = { active: false, roles: {} });
        if (w.is_active) { e.active = true; (w.transitions || []).forEach(function (x) { var a = e.roles[x.state] || (e.roles[x.state] = []); if (a.indexOf(x.allowed) < 0) { a.push(x.allowed); } }); } });
      WFDEF = d; return d;
    }).catch(function () { WFDEF = {}; return WFDEF; });
  }
  function roleOf(dt, state) { var e = WFDEF && WFDEF[dt]; if (!e || !e.active || !state) { return '—'; } var a = e.roles[state]; return a && a.length ? a.join(', ') : '—'; }
  function isPendingState(dt, s) { return (WF_PEND[dt] || []).indexOf(s) >= 0 || (WF_RET[dt] || []).indexOf(s) >= 0; }
  function loadWfStates() {
    return Promise.all(CORE3.map(function (dt) { return gl(dt, { fields: ['workflow_state', 'count(name) as n'], filters: coF(), group: 'workflow_state', limit: 50 }).catch(function () { return []; }); })).then(function (r) {
      var m = {}; r.forEach(function (rows) { rows.forEach(function (x) { if (x.workflow_state) { m[x.workflow_state] = 1; } }); }); WFSTATES = Object.keys(m).sort();
    });
  }

  /* ---------- cells, columns and drill-downs ---------- */
  function tone2(s) { s = String(s || ''); if (/^(Approved|Paid|Submitted After|Reconciled|Settled|Submitted)$/i.test(s)) { return 'ok'; } if (/Finally Rejected|^Rejected|Cancelled|Overdue/i.test(s)) { return 'bad'; } if (/^Review$|Return|Ammend|Pending|submitted|Unpaid|Unreconciled|Hold|Partly|Draft/i.test(s)) { return 'warn'; } return 'n'; }
  function bdg(s) { return s == null || s === '' ? '<span class="dms-sm">—</span>' : stat(tone2(s), tState(s)); }
  function nest(title, spec) { var id = 'n' + (++NSEQ); NEST[id] = { title: title, spec: spec }; return 'nest:' + id; }
  function docBtn(dt, name) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="doc:' + esc(dt + '|' + name) + '"><bdi>' + esc(name) + '</bdi></button>'; }
  function daysOf(r) { var p = isPendingState(r.dt, r.state) || (r.dt === 'Purchase Invoice' && r.ds === 0); return p && r.date ? Math.max(0, dayDiff(r.date, TODAY)) : null; }
  function genCols() {
    return [
      { h: t('c_doc'), r: function (r) { return docBtn(r.dt, r.name); }, c: function (r) { return r.name; } }, { h: t('c_type'), r: function (r) { return esc(dtl(r.dt)); }, c: function (r) { return r.dt; } },
      { h: t('c_company'), r: function (r) { return txt(r.company); }, c: function (r) { return r.company; } }, { h: t('c_date'), r: function (r) { return dtc(r.date); }, c: function (r) { return r.date; } },
      { h: t('c_by'), r: function (r) { return who(userName(r.by)); }, c: function (r) { return r.by; } }, { h: t('c_party'), r: function (r) { return txt(r.party); }, c: function (r) { return r.party; } },
      { h: t('c_amount'), num: 1, r: function (r) { return amc(r.amount); }, c: function (r) { return r.amount; } }, { h: t('c_state'), r: function (r) { return bdg(r.state); }, c: function (r) { return r.state; } },
      { h: t('c_role'), r: function (r) { return txt(roleOf(r.dt, r.state)); }, c: function (r) { return roleOf(r.dt, r.state); } }, { h: t('c_status'), r: function (r) { return bdg(r.status); }, c: function (r) { return r.status; } },
      { h: t('c_days'), num: 1, r: function (r) { var d = daysOf(r); return d == null ? '<span class="dms-sm">—</span>' : '<span class="dms-days ' + (d > BACKDATE_DAYS ? 'dms-days-bad' : 'dms-days-warn') + '">' + num(d) + '</span>'; }, c: function (r) { return daysOf(r); } }
    ];
  }
  /* A drill spec is {parts:[{dt, filters, order?}], asc?} (merged paging, search box filters each type) or {cols, loader(page, size)} */
  function specOf(spec, file) {
    if (spec.parts) { return { server: true, cols: genCols(), file: file || 'records', loader: function (p, s, q) { return mergedLoader(spec.parts.map(function (x) { return Object.assign({ asc: spec.asc }, x, { or: q ? orQ(x.dt, q) : x.or }); }), p, s); } }; }
    return { server: true, cols: spec.cols || genCols(), file: file || 'records', loader: spec.loader };
  }
  var DRL = {};
  function KP(d) {
    var c = cell(d.key || d.label, d.load), r = c.v || {}, n = r.v, tn = d.tone === 'auto' ? (n > 0 ? 'warn' : 'ok') : d.tone;
    if (d.drill) { DRL[d.key || d.label] = { title: t(d.label), spec: d.drill }; }
    return kpi({ label: t(d.label), dot: c.p || c.e ? null : { warn: 'var(--dms-age2)', ok: 'var(--dms-ok)', bad: 'var(--dms-bad)' }[tn], act: d.drill && !c.e && !c.p ? 'd:' + (d.key || d.label) : null,
      val: c.p ? '…' : c.e ? '—' : n == null ? esc(t('na')) : r.money ? cur$(n, CUR) : num(n), sub: c.e ? esc(c.e) : esc(r.sub || ''), tip: c.e || '' });
  }
  function cnts(pts) { return Promise.all(pts.map(function (p) { return cnt(p.dt, p.filters, p.or); })).then(sum); }
  function cdef(label, pts, tone, key) { return { label: label, key: key || label, tone: tone, load: function () { return cnts(pts).then(function (n) { return { v: n }; }); }, drill: { parts: pts } }; }
  function drill(id) {
    if (id.indexOf('d:') === 0 && DRL[id.slice(2)]) { var d = DRL[id.slice(2)]; return { title: d.title, spec: specOf(d.spec) }; }
    if (id.indexOf('nest:') === 0 && NEST[id.slice(5)]) { var n = NEST[id.slice(5)]; return { title: n.title, spec: specOf(n.spec) }; }
    if (id.indexOf('doc:') === 0) { var p = id.slice(4).split('|'); return docDetail(p[0], p.slice(1).join('|')); }
    if (id.indexOf('cli:') === 0) { var a = ACTS().filter(function (x) { return x.id === id.slice(4); })[0]; return a ? { title: a.title, sub: a.why, spec: specOf({ parts: a.parts, asc: a.id !== 'a_apod' }, a.id) } : null; }
    return null;
  }

  /* ---------- record detail: fields, lines, attachments and the approval trail (v1) ---------- */
  var DETAIL_KEYS = {
    'Payment Entry': ['payment_type', 'posting_date', 'company', 'party_type', 'party', 'party_name', 'mode_of_payment', 'paid_from', 'paid_to', 'paid_amount', 'received_amount', 'base_paid_amount', 'unallocated_amount', 'reference_no', 'reference_date', 'cheque_no', 'workflow_state', 'status', 'owner', 'creation', 'modified_by', 'remarks'],
    'Journal Entry': ['voucher_type', 'posting_date', 'company', 'total_debit', 'total_credit', 'difference', 'workflow_state', 'is_opening', 'reversal_of', 'cheque_no', 'owner', 'creation', 'modified_by', 'user_remark'],
    'Expense Claim': ['employee', 'employee_name', 'company', 'posting_date', 'total_claimed_amount', 'total_sanctioned_amount', 'total_amount_reimbursed', 'approval_status', 'status', 'workflow_state', 'expense_approver', 'mode_of_payment', 'owner', 'creation', 'remark'],
    'Purchase Invoice': ['supplier', 'supplier_name', 'company', 'posting_date', 'due_date', 'bill_no', 'bill_date', 'currency', 'conversion_rate', 'grand_total', 'base_grand_total', 'outstanding_amount', 'party_account_currency', 'status', 'is_return', 'owner', 'creation'],
    'Sales Invoice': ['customer', 'customer_name', 'company', 'posting_date', 'due_date', 'currency', 'conversion_rate', 'grand_total', 'base_grand_total', 'outstanding_amount', 'party_account_currency', 'status', 'is_return', 'owner', 'creation'],
    'Bank Transaction': ['date', 'company', 'bank_account', 'deposit', 'withdrawal', 'unallocated_amount', 'allocated_amount', 'status', 'reference_number', 'description', 'currency']
  };
  var CHILD = { 'Journal Entry': [['accounts', 'lines', ['account', 'party', 'debit', 'credit']]], 'Payment Entry': [['references', 'refs', ['reference_doctype', 'reference_name', 'total_amount', 'outstanding_amount', 'allocated_amount']]], 'Expense Claim': [['expenses', 'expenses', ['expense_date', 'expense_type', 'description', 'amount', 'sanctioned_amount']]] };
  function docDetail(dt, name) {
    var o = { title: dtl(dt) + ' · ' + name, link: [dt, name, tr('Open in ERP', 'فتح في النظام')], body: skel(1, 'dms-skel-panel') };
    Promise.all([guarded(null, 'frappe.client.get', { doctype: dt, name: name }),
      gl('Version', { fields: ['creation', 'owner', 'data'], filters: [['ref_doctype', '=', dt], ['docname', '=', name]], order: 'creation asc', limit: 100 }).catch(function () { return null; }),
      gl('File', { fields: ['file_name', 'file_url', 'is_private'], filters: [['attached_to_doctype', '=', dt], ['attached_to_name', '=', name]], limit: 50 }).catch(function () { return null; })])
      .then(function (res) {
        var d = res[0] || {}, ver = res[1], files = res[2], h = '<div class="dms-facts">';
        (DETAIL_KEYS[dt] || Object.keys(d).slice(0, 30)).forEach(function (k) {
          var v = d[k]; if (v == null || v === '') { return; } if (typeof v === 'number') { v = /rate/.test(k) ? String(v) : n2(v); }
          if (k === 'owner' || k === 'modified_by') { v = userName(v) + ' (' + v + ')'; } if (k === 'workflow_state' || k === 'status') { v = tState(v); }
          h += '<div><span class="dms-sm">' + esc(k) + '</span><b>' + bdi(String(v).replace(/<[^>]+>/g, ' ').slice(0, 400)) + '</b></div>';
        });
        h += '<div><span class="dms-sm">docstatus</span><b>' + esc(docLbl(d.docstatus)) + '</b></div></div>';
        (CHILD[dt] || []).forEach(function (c) {
          var rows = d[c[0]] || []; if (!rows.length) { return; } var dr = 0, cr = 0;
          h += '<h4 class="dms-h4">' + esc(t(c[1])) + ' (' + rows.length + ')</h4><div class="dms-tablewrap"><table class="dms-table"><thead><tr>' + c[2].map(function (f) { return '<th>' + esc(f) + '</th>'; }).join('') + '</tr></thead><tbody>' +
            rows.slice(0, 60).map(function (r) { if (dt === 'Journal Entry') { dr += r.debit || 0; cr += r.credit || 0; } return '<tr>' + c[2].map(function (f) { var v = r[f]; return typeof v === 'number' ? '<td class="dms-td-n"><span class="dms-num">' + esc(n2(v)) + '</span></td>' : '<td>' + bdi(v || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
          if (dt === 'Journal Entry') { var df = Math.round((dr - cr) * 100) / 100; h += note('Σ debit ' + esc(n2(dr)) + ' · Σ credit ' + esc(n2(cr)) + ' · ' + esc(t('c_diff')) + ' ' + esc(n2(df))); }
        });
        h += '<h4 class="dms-h4">' + esc(t('attachments')) + '</h4>' + (files && files.length ? '<ul class="dms-list">' + files.map(function (f) { return '<li><a class="dms-link" href="' + esc(f.file_url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.file_name || f.file_url) + '</a></li>'; }).join('') + '</ul>' : note(esc(files ? t('none') : t('na'))));
        var trail = [], approver = null;
        (ver || []).forEach(function (v) { try { var j = JSON.parse(v.data); (j.changed || []).forEach(function (c) { if (c[0] === 'workflow_state' || c[0] === 'approval_status') { trail.push({ at: v.creation, by: v.owner, a: c[1], b: c[2] }); if (c[2] === 'Approved') { approver = v.owner; } } }); } catch (e) { /* skip */ } });
        h += '<h4 class="dms-h4">' + esc(t('trail')) + '</h4><ul class="dms-list"><li>' + esc(d.creation || '') + ' — ' + esc(userName(d.owner)) + ' (created)</li>' + trail.map(function (x) { return '<li>' + esc(x.at) + ' — ' + esc(userName(x.by)) + ': ' + esc(tState(x.a)) + ' → ' + esc(tState(x.b)) + '</li>'; }).join('') + '</ul>';
        if (!trail.length) { h += note(esc(t('no_trail'))); }
        if (approver) { h += '<p>' + stat(approver === d.owner ? 'bad' : 'ok', approver === d.owner ? t('verify_same') : t('verify_diff')) + '</p>'; }
        if (OVL === o) { o.body = h; renderOverlay(); }
      }, function (e) { if (OVL === o) { o.body = alertBox('err', esc(t('err_load') + ': ' + e.message)); renderOverlay(); } });
    return o;
  }

  /* ---------- balances (AP / AR) ---------- */
  function balF(dt, apply) { var f = [['docstatus', '=', 1], ['outstanding_amount', '!=', 0]].concat(coF()); if (apply) { if (S.from) { f.push(['posting_date', '>=', S.from]); } if (S.to) { f.push(['posting_date', '<=', S.to]); } } return f; }
  function openF(dt, apply, extra) { return balF(dt, apply).concat([['is_return', '=', 0], ['outstanding_amount', '>', 0]], extra || []); }
  function agg(dt, filters) {
    return gl(dt, { fields: ['company', 'party_account_currency', 'currency', 'conversion_rate', 'count(name) as n', 'sum(outstanding_amount) as o'], filters: filters, group: 'company,party_account_currency,currency,conversion_rate', limit: 0 })
      .then(function (rows) { var n = 0, b = 0; rows.forEach(function (r) { n += +r.n; b += baseBalance(r); }); return { n: n, base: b }; });
  }
  function dueF(from, to) { return [['due_date', 'between', [from, to]]]; }
  function ageBuckets(dt, apply) {
    var T = TODAY, L = [{ k: tr('Not yet due', 'غير مستحق'), c: 'var(--dms-age0)', f: [['due_date', '>=', T]] }, { k: '1–30', c: 'var(--dms-age1)', f: dueF(addDays(T, -30), addDays(T, -1)) }, { k: '31–60', c: 'var(--dms-age2)', f: dueF(addDays(T, -60), addDays(T, -31)) },
      { k: '61–90', c: 'var(--dms-age3)', f: dueF(addDays(T, -90), addDays(T, -61)) }, { k: '90+', c: 'var(--dms-age5)', f: [['due_date', '<', addDays(T, -90)]] }];
    return Promise.all(L.map(function (b) { return agg(dt, openF(dt, apply, b.f)).then(function (a) { return { k: b.k, c: b.c, f: b.f, a: a }; }); }));
  }
  function partyAgg(dt, pf, nf, filters) {
    return gl(dt, { fields: [pf, nf, 'company', 'party_account_currency', 'currency', 'conversion_rate', 'count(name) as n', 'sum(outstanding_amount) as o'], filters: filters, group: pf + ',' + nf + ',company,party_account_currency,currency,conversion_rate', limit: 0 }).then(function (rows) {
      var m = {}; rows.forEach(function (r) { var k = r[pf], e = m[k] || (m[k] = { id: k, name: r[nf] || k, n: 0, base: 0 }); e.n += +r.n; e.base += baseBalance(r); });
      return vals(m).sort(function (a, b) { return b.base - a.base; });
    });
  }

  /* ---------- capped scans and control exceptions (v1 rules) ---------- */
  function scan(dt, extra) {
    var f = base(dt).concat([['docstatus', '=', 1]], extra || []);
    return Promise.all([gl(dt, { fields: ['name', 'posting_date', 'creation', 'owner', 'modified_by', 'workflow_state', 'company', 'docstatus', 'party_name', 'voucher_type', 'total_debit', 'paid_amount', 'received_amount', 'payment_type'], filters: f, order: 'posting_date desc', limit: SCAN_CAP }), cnt(dt, f)])
      .then(function (r) { return { rows: r[0], total: r[1], capped: r[0].length < r[1] }; });
  }
  function backdatedRows(dt) { return scan(dt).then(function (s) { s.hits = s.rows.filter(function (r) { return dayDiff(r.posting_date, String(r.creation).slice(0, 10)) > BACKDATE_DAYS; }).map(function (r) { return norm(dt, r); }); return s; }); }
  var EXC_CACHE = {};
  var EXC_DEFS = [
    { id: 'je_unbal', label: 'x_je_unbal', sev: 'high', core: 1 }, { id: 'unapproved', label: 'x_unapproved', sev: 'high', core: 1 }, { id: 'dup_pay', label: 'x_dup_pay', sev: 'high', core: 1 }, { id: 'dup_bill', label: 'x_dup_bill', sev: 'high', core: 1 },
    { id: 'period', label: 'x_period', sev: 'high' }, { id: 'same_user', label: 'x_same_user', sev: 'high' }, { id: 'unalloc', label: 'x_unalloc', sev: 'medium', core: 1 }, { id: 'backdated', label: 'x_backdated', sev: 'medium' },
    { id: 'attach', label: 'x_attach', sev: 'medium' }, { id: 'rejected', label: 'x_rejected', sev: 'medium' }, { id: 'ap_over', label: 'x_ap_over', sev: 'medium' }, { id: 'ar_over', label: 'x_ar_over', sev: 'medium' }, { id: 'cancelled', label: 'x_cancelled', sev: 'low' }];
  (function () {
    var en = { x_je_unbal: 'Journal debit/credit mismatches', x_unapproved: 'Posted without approved workflow state (Payment/Journal)', x_dup_pay: 'Duplicate payment references (same party + reference)', x_dup_bill: 'Duplicate supplier invoice numbers (same supplier + bill no.)', x_period: 'Backdated documents in a currently closed period (review required)', x_same_user: 'Created and approved by the same user', x_unalloc: 'Unallocated payments', x_backdated: 'Backdated transactions (posting date > ' + BACKDATE_DAYS + ' days before creation)', x_attach: 'Missing supporting attachments (latest ' + ATTACH_SAMPLE + ' per type)', x_rejected: 'Rejected workflow records', x_ap_over: 'Overdue supplier invoices', x_ar_over: 'Overdue customer invoices', x_cancelled: 'Cancelled financial transactions' };
    var ar = { x_je_unbal: 'عدم توازن مدين/دائن في القيود', x_unapproved: 'مرحّل دون حالة اعتماد (دفع/قيود)', x_dup_pay: 'مراجع دفع مكررة (نفس الطرف + المرجع)', x_dup_bill: 'أرقام فواتير موردين مكررة (نفس المورد + الرقم)', x_period: 'مستندات بأثر رجعي ضمن فترة مغلقة — تتطلب المراجعة', x_same_user: 'أنشأه واعتمده المستخدم نفسه', x_unalloc: 'مدفوعات غير مخصصة', x_backdated: 'معاملات بأثر رجعي (تاريخ الترحيل قبل الإنشاء بأكثر من ' + BACKDATE_DAYS + ' أيام)', x_attach: 'مرفقات داعمة مفقودة (آخر ' + ATTACH_SAMPLE + ' لكل نوع)', x_rejected: 'سجلات سير عمل مرفوضة', x_ap_over: 'فواتير موردين متأخرة', x_ar_over: 'فواتير عملاء متأخرة', x_cancelled: 'معاملات مالية ملغاة' };
    Object.assign(I18N.en, en); Object.assign(I18N.ar, ar);
  })();
  function dupGroups(dt) {
    var f = dt === 'Payment Entry' ? base(dt).concat([['docstatus', '=', 1], ['reference_no', 'is', 'set']]) : base(dt).concat([['docstatus', '=', 1], ['is_return', '=', 0], ['bill_no', 'is', 'set']]);
    var k1 = dt === 'Payment Entry' ? 'party' : 'supplier', k2 = dt === 'Payment Entry' ? 'reference_no' : 'bill_no', rows = [];
    function page(offset) { return gl(dt, { fields: [k1, k2, 'count(name) as n'], filters: f, group: k1 + ',' + k2, order: k1 + ' asc,' + k2 + ' asc', start: offset, limit: 500 }).then(function (p) { rows = rows.concat(p); return p.length < 500 ? rows : page(offset + p.length); }); }
    return page(0).then(function (all) { return all.filter(function (x) { return +x.n > 1; }).map(function (x) { return { k1: x[k1], k2: x[k2], n: +x.n }; }); });
  }
  function groupSpec(dt, g, dupF) { return { loader: staticLoader(g), cols: [{ h: t('dup_group'), r: function (r) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="' + esc(nest(r.k1 + ' · ' + r.k2, { parts: [{ dt: dt, filters: base(dt).concat(dupF(r)) }] })) + '"><bdi>' + esc(r.k1 + ' · ' + r.k2) + '</bdi></button>'; }, c: function (r) { return r.k1 + ' · ' + r.k2; } }, { h: t('c_cnt'), num: 1, r: function (r) { return '<span class="dms-num">' + num(r.n) + '</span>'; }, c: function (r) { return r.n; } }] }; }
  function missingAttach(dt) {
    var f = base(dt).concat([['docstatus', '=', 1]]);
    return Promise.all([gl(dt, { fields: FIELDS[dt], filters: f, order: dfield(dt) + ' desc', limit: ATTACH_SAMPLE }), cnt(dt, f)]).then(function (r) {
      var names = r[0].map(function (x) { return x.name; }); if (!names.length) { return { rows: [], total: r[1], scanned: 0 }; }
      return gl('File', { fields: ['attached_to_name', 'count(name) as n'], filters: [['attached_to_doctype', '=', dt], ['attached_to_name', 'in', names]], group: 'attached_to_name', limit: names.length + 5 }).then(function (fs) {
        var has = {}; fs.forEach(function (x) { has[x.attached_to_name] = 1; });
        return { rows: r[0].filter(function (x) { return !has[x.name]; }).map(function (x) { return norm(dt, x); }), total: r[1], scanned: r[0].length };
      });
    });
  }
  function periodHits() {
    var f = []; if (S.company) f.push(['company', '=', S.company]); if (S.from) f.push(['end_date', '>=', S.from]); if (S.to) f.push(['start_date', '<=', S.to]);
    return gl('Accounting Period', { fields: ['name', 'company', 'start_date', 'end_date'], filters: f, limit: 200 }).then(function (ps) {
      if (!ps.length) return { hits: [], checked: 0, total: 0 };
      return gl('Closed Document', { parent: 'Accounting Period', fields: ['parent', 'document_type'], filters: [['closed', '=', 1], ['parent', 'in', ps.map(function (p) { return p.name; })], ['document_type', 'in', ['Payment Entry', 'Journal Entry', 'Purchase Invoice', 'Sales Invoice', 'Expense Claim']]], limit: 1000 }).then(function (cd) {
        var pm = {}; ps.forEach(function (p) { pm[p.name] = p; });
        var jobs = cd.map(function (c) { return { p: pm[c.parent], dt: c.document_type }; }).filter(function (j) { return j.p; }), total = jobs.length; jobs = jobs.slice(0, 40);
        return Promise.all(jobs.map(function (j) {
          var flt = [['docstatus', '=', 1], ['company', '=', j.p.company], ['posting_date', 'between', [j.p.start_date, j.p.end_date]], ['creation', '>', j.p.end_date + ' 23:59:59']];
          return cnt(j.dt, flt).then(function (n) { return { p: j.p, dt: j.dt, n: n, filters: flt }; }); })).then(function (rs) { return { hits: rs.filter(function (x) { return x.n > 0; }), checked: jobs.length, total: total }; }); });
    });
  }
  function excRun(id) {
    var key = GEN + ':' + id; if (EXC_CACHE[key]) { return EXC_CACHE[key]; }
    var T = TODAY, PE = 'Payment Entry', JE = 'Journal Entry', pr, Gp = function (dt, extra) { return [{ dt: dt, filters: base(dt).concat(extra) }]; };
    var C = function (pts, conf, basis) { return cnts(pts).then(function (n) { return { count: n, conf: conf, basis: basis, drill: { parts: pts } }; }); };
    var hitsSpec = function (rows) { return { loader: staticLoader(rows) }; };
    switch (id) {
      case 'je_unbal': pr = C(Gp(JE, [['docstatus', '!=', 2], ['difference', '!=', 0]]), 'confirmed', 'Journal Entry.difference ≠ 0'); break;
      case 'unapproved': pr = C(Gp(PE, [['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']]).concat(Gp(JE, [['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']])), 'confirmed', 'docstatus = 1 and workflow_state ≠ Approved'); break;
      case 'unalloc': pr = C(Gp(PE, [['docstatus', '=', 1], ['unallocated_amount', '>', 0]]), 'confirmed', 'Payment Entry.unallocated_amount > 0'); break;
      case 'rejected': pr = C(parts('rejected', CORE3), 'confirmed', 'Workflow state Rejected / Finally Rejected'); break;
      case 'cancelled': pr = C(['Payment Entry', 'Journal Entry', 'Purchase Invoice', 'Sales Invoice', 'Expense Claim'].map(function (d) { return { dt: d, filters: base(d).concat([['docstatus', '=', 2]]) }; }), 'confirmed', 'docstatus = 2'); break;
      case 'ap_over': pr = C([{ dt: 'Purchase Invoice', filters: openF('Purchase Invoice', false, [['due_date', '<', T]]) }], 'confirmed', 'due_date < today and outstanding > 0 (balance view)'); break;
      case 'ar_over': pr = C([{ dt: 'Sales Invoice', filters: openF('Sales Invoice', false, [['due_date', '<', T]]) }], 'confirmed', 'due_date < today and outstanding > 0 (balance view)'); break;
      case 'dup_pay': pr = dupGroups(PE).then(function (g) { return { count: g.length, conf: 'confirmed', basis: 'Same party + reference_no on ≥ 2 submitted Payment Entries', drill: groupSpec(PE, g, function (r) { return [['party', '=', r.k1], ['reference_no', '=', r.k2], ['docstatus', '=', 1]]; }) }; }); break;
      case 'dup_bill': pr = dupGroups('Purchase Invoice').then(function (g) { return { count: g.length, conf: 'confirmed', basis: 'Same supplier + bill_no on ≥ 2 submitted invoices', drill: groupSpec('Purchase Invoice', g, function (r) { return [['supplier', '=', r.k1], ['bill_no', '=', r.k2], ['docstatus', '=', 1], ['is_return', '=', 0]]; }) }; }); break;
      case 'backdated': pr = Promise.all([backdatedRows(JE), backdatedRows(PE)]).then(function (r) { var hits = r[0].hits.concat(r[1].hits), capped = r[0].capped || r[1].capped;
        return { count: hits.length, conf: capped ? 'indicative' : 'confirmed', basis: 'posting_date earlier than creation by > ' + BACKDATE_DAYS + ' days; ' + t('scanned', { a: n0(r[0].rows.length + r[1].rows.length), b: n0(r[0].total + r[1].total) }), drill: hitsSpec(hits) }; }); break;
      case 'same_user': pr = Promise.all([scan(JE, [['workflow_state', '=', 'Approved']]), scan(PE, [['workflow_state', '=', 'Approved']])]).then(function (r) {
        var hits = [].concat(r[0].rows.map(function (x) { return norm(JE, x); }), r[1].rows.map(function (x) { return norm(PE, x); })).filter(function (x) { return x.raw.owner === x.raw.modified_by; });
        return { count: hits.length, conf: 'indicative', basis: 'owner = last modifier on Approved records (proxy); open a record to verify its approval trail. ' + t('scanned', { a: n0(r[0].rows.length + r[1].rows.length), b: n0(r[0].total + r[1].total) }), drill: hitsSpec(hits) }; }); break;
      case 'attach': pr = Promise.all([PE, JE, 'Purchase Invoice'].map(missingAttach)).then(function (r) { var rows = [].concat.apply([], r.map(function (x) { return x.rows; })), cap = r.some(function (x) { return x.scanned < x.total; });
        return { count: rows.length, conf: cap ? 'indicative' : 'confirmed', basis: 'No File attached among the latest ' + ATTACH_SAMPLE + ' submitted records per type', drill: hitsSpec(rows) }; }); break;
      case 'period': pr = periodHits().then(function (r) { var rows = r.hits;
        return { count: sum(rows.map(function (x) { return x.n; })), conf: 'indicative', basis: 'Closed period; creation after period end (' + r.checked + '/' + r.total + ' period-type checks). Users with an exempted role may legitimately post.',
          drill: { loader: staticLoader(rows), cols: [{ h: t('c_exc'), r: function (x) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="' + esc(nest(x.p.name + ' · ' + dtl(x.dt), { parts: [{ dt: x.dt, filters: x.filters }] })) + '">' + esc(x.p.name + ' · ' + dtl(x.dt)) + '</button>'; }, c: function (x) { return x.p.name + ' ' + x.dt; } }, { h: t('c_cnt'), num: 1, r: function (x) { return '<span class="dms-num">' + num(x.n) + '</span>'; }, c: function (x) { return x.n; } }] } }; }); break;
    }
    EXC_CACHE[key] = pr; pr.catch(function () { delete EXC_CACHE[key]; }); return pr;
  }
  function excRows(filterFn) { return Promise.all(EXC_DEFS.filter(filterFn || function () { return true; }).map(function (d) { return excRun(d.id).then(function (r) { return Object.assign({ d: d }, r); }, function (e) { return { d: d, count: null, err: e.message, conf: 'indicative', basis: t('err_load') + ': ' + e.message, drill: null }; }); })); }
  function excCols() {
    return [{ k: 'x', h: t('c_exc'), s: function (r) { return t(r.d.label); }, r: function (r) { return r.drill && r.count ? '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="' + esc(nest(t(r.d.label), r.drill)) + '">' + esc(t(r.d.label)) + '</button>' : esc(t(r.d.label)); }, c: function (r) { return t(r.d.label); } },
      { k: 'sev', h: t('c_sev'), s: function (r) { return ['high', 'medium', 'low'].indexOf(r.d.sev); }, r: function (r) { return stat(r.d.sev === 'high' ? 'bad' : r.d.sev === 'medium' ? 'warn' : 'n', t('sev_' + r.d.sev)); }, c: function (r) { return r.d.sev; } },
      { k: 'conf', h: t('c_conf'), r: function (r) { return stat(r.conf === 'confirmed' ? 'ok' : 'warn', t('conf_' + r.conf)); }, c: function (r) { return r.conf; } },
      { k: 'n', h: t('c_cnt'), num: 1, s: function (r) { return r.count == null ? -1 : r.count; }, r: function (r) { return r.count == null ? '<span class="dms-sm">—</span>' : '<b class="dms-num' + (r.count && r.d.sev === 'high' ? ' dms-tone-bad' : '') + '">' + num(r.count) + '</b>'; }, c: function (r) { return r.count; } },
      { k: 'b', h: t('c_basis'), r: function (r) { return '<span class="dms-sm">' + esc(r.basis) + '</span>'; }, c: function (r) { return r.basis; } }];
  }
  /* A failed check is reported as unavailable, never as zero; if every check fails the total fails too. */
  function coreExc() { return excRows(function (d) { return d.core; }).then(function (l) { if (l.length && l.every(function (x) { return x.err; })) { throw new Error(l[0].err); } return l; }); }
  function excTotal(l) { return sum(l.filter(function (x) { return !x.err; }).map(function (x) { return x.count; })); }

  /* ---------- actions pending (as of today, all dates) ---------- */
  function ACTS() {
    var T = TODAY, nd = function (dt) { return base(dt, { noDate: true }); };
    return [
      { id: 'a_aged', p: 'high', short: tr('Waiting > ' + BACKDATE_DAYS + ' days', 'بانتظار > ' + BACKDATE_DAYS + ' أيام'), title: tr('Approvals waiting more than ' + BACKDATE_DAYS + ' days', 'اعتمادات بانتظار أكثر من ' + BACKDATE_DAYS + ' أيام'), why: tr('Payments, journals and expense claims in a pending workflow state, oldest first.', 'دفعات وقيود ومطالبات في حالة انتظار، الأقدم أولًا.'), client: true,
        parts: CORE3.map(function (dt) { return { dt: dt, filters: nd(dt).concat(stat2(dt, 'pending'), [['posting_date', '<=', addDays(T, -BACKDATE_DAYS)]]) }; }) },
      { id: 'a_unbal', p: 'high', short: tr('Unbalanced journals', 'قيود غير متوازنة'), title: tr('Journal entries whose debit and credit differ', 'قيود يومية يختلف مدينها عن دائنها'), why: tr('Journal Entry difference is not zero (not cancelled).', 'فرق القيد ليس صفرًا (غير ملغى).'), client: true, parts: [{ dt: 'Journal Entry', filters: nd('Journal Entry').concat([['docstatus', '!=', 2], ['difference', '!=', 0]]) }] },
      { id: 'a_unappr', p: 'high', short: tr('Posted without approval', 'مرحّل دون اعتماد'), title: tr('Payments and journals posted without an approved workflow state', 'دفعات وقيود مرحّلة دون حالة اعتماد'), why: tr('Submitted while the workflow state is not Approved.', 'معتمدة بينما حالة سير العمل ليست معتمد.'), client: true,
        parts: ['Payment Entry', 'Journal Entry'].map(function (dt) { return { dt: dt, filters: nd(dt).concat([['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']]) }; }) },
      { id: 'a_ret', p: 'med', short: tr('Returned for review', 'معادة للمراجعة'), title: tr('Records returned for review or on hold', 'سجلات معادة للمراجعة أو معلّقة'), why: tr('Workflow state Review / amendment, or expense claims on Hold.', 'حالة مراجعة أو تعديل، أو مطالبات معلّقة.'), client: true,
        parts: ['Payment Entry', 'Journal Entry'].map(function (dt) { return part(dt, 'returned', null, true); }).concat([{ dt: 'Expense Claim', filters: nd('Expense Claim').concat([['workflow_state', '=', 'Hold'], ['docstatus', '!=', 2]]) }]) },
      { id: 'a_pend', p: 'med', short: tr('Recent pending approvals', 'اعتمادات معلقة حديثة'), title: tr('Approvals pending (last ' + BACKDATE_DAYS + ' days) and draft purchase invoices', 'اعتمادات معلقة (آخر ' + BACKDATE_DAYS + ' أيام) وفواتير شراء مسودة'), why: tr('Newer pending workflow records and purchase invoices not yet submitted.', 'سجلات معلقة أحدث وفواتير شراء غير معتمدة.'), client: true,
        parts: CORE3.map(function (dt) { return { dt: dt, filters: nd(dt).concat(stat2(dt, 'pending'), [['posting_date', '>', addDays(T, -BACKDATE_DAYS)]]) }; }).concat([{ dt: 'Purchase Invoice', filters: nd('Purchase Invoice').concat([['docstatus', '=', 0]]) }]) },
      { id: 'a_apod', p: 'med', short: tr('Overdue supplier invoices', 'فواتير موردين متأخرة'), title: tr('Supplier invoices past their due date', 'فواتير موردين تجاوزت الاستحقاق'), why: tr('Open balance, due date passed. Oldest first.', 'رصيد مفتوح وتجاوز الاستحقاق. الأقدم أولًا.'), client: true, parts: [{ dt: 'Purchase Invoice', filters: openF('Purchase Invoice', false, [['due_date', '<', T]]), order: 'due_date asc' }] },
      { id: 'a_unalloc', p: 'low', short: tr('Unallocated payments', 'دفعات غير مخصصة'), title: tr('Payments with an unallocated amount', 'دفعات بمبلغ غير مخصص'), why: tr('Submitted Payment Entries not matched to documents.', 'سندات دفع معتمدة غير مطابقة لمستندات.'), client: true, parts: [{ dt: 'Payment Entry', filters: nd('Payment Entry').concat([['docstatus', '=', 1], ['unallocated_amount', '>', 0]]) }] }
    ];
  }
  function loadActs() {
    run('acts', function () {
      return Promise.all(ACTS().map(function (a) {
        return Promise.all([cnts(a.parts), mergedLoader(a.parts.map(function (x) { return Object.assign({ asc: true }, x); }), 0, 6)]).then(function (r) { return { id: a.id, count: r[0], rows: r[1].rows }; }, function (e) { return { id: a.id, err: errKind(e) }; });
      })).then(function (l) { var o = {}; l.forEach(function (x) { o[x.id] = x; }); return o; });
    });
  }
  function actClient() {
    var A = D.acts; if (D.actsErr) { return 'ERR:' + D.actsErr; } if (!A) { return null; }
    var o = {};
    ACTS().forEach(function (a) {
      var x = A[a.id]; if (!x) { return; } if (x.err) { o[a.id] = 'ERR:' + x.err; return; }
      o[a.id] = { count: x.count, rows: x.rows, item: function (r) {
        var dueTxt = a.id === 'a_apod' ? lateTxt(r.raw.due_date) : agoTxt(r.date, 'Waiting', 'منذ'), amtV = a.id === 'a_apod' ? r.raw.outstanding_amount : a.id === 'a_unalloc' ? r.raw.unallocated_amount : r.amount;
        var role = roleOf(r.dt, r.state);
        return { p: a.p, score: score(a.p, amtV, a.id === 'a_apod' ? ageOf(r.raw.due_date) : ageOf(r.date)), dt: r.dt, name: r.name, title: r.party || r.name, desc: r.name + (r.state ? ' · ' + tState(r.state) : '') + (amtV ? ' · ' + moneyFull(amtV) : ''), who: role !== '—' ? role : userName(r.by), due: dueTxt, tone: a.p === 'high' ? 'bad' : a.p === 'med' ? 'warn' : 'n' };
      } };
    });
    return o;
  }

  /* ---------- views ---------- */
  function scopeNote(k) { return note(esc(t(k))); }
  function tabOverview(AM) {
    var T = TODAY, pendP = parts('pending', PEND4), apF = openF('Purchase Invoice', false), arF = openF('Sales Invoice', false), overdueF = openF('Purchase Invoice', false, [['due_date', '<', T]]);
    var attnP = CORE3.map(function (dt) { return { dt: dt, filters: base(dt, { noDate: true }).concat(stat2(dt, 'pending'), [['posting_date', '<=', addDays(T, -BACKDATE_DAYS)]]) }; });
    var h = kpis([
      KP(cdef('k_pending_total', pendP, 'auto')),
      KP({ label: 'k_attention', tone: 'warn', load: function () { return cnts(attnP).then(function (n) { return { v: n, sub: t('def_attn') }; }); }, drill: { parts: attnP, asc: true } }),
      KP({ label: 'k_overdue_pi', tone: 'bad', load: function () { return cnt('Purchase Invoice', overdueF).then(function (n) { return { v: n }; }); }, drill: { parts: [{ dt: 'Purchase Invoice', filters: overdueF, order: 'due_date asc' }] } }),
      KP({ label: 'k_ar_out', load: function () { return agg('Sales Invoice', arF).then(function (a) { return { v: a.base, money: 1, sub: n0(a.n) + ' ' + tr('invoices', 'فاتورة') }; }); }, drill: { parts: [{ dt: 'Sales Invoice', filters: arF, order: 'due_date asc' }] } }),
      KP({ label: 'k_ap_out', load: function () { return agg('Purchase Invoice', apF).then(function (a) { return { v: a.base, money: 1, sub: n0(a.n) + ' ' + tr('invoices', 'فاتورة') }; }); }, drill: { parts: [{ dt: 'Purchase Invoice', filters: apF, order: 'due_date asc' }] } }),
      KP({ label: 'k_exceptions', tone: 'bad', load: function () { return coreExc().then(function (l) { var bad = l.filter(function (x) { return x.err; }).length; return { v: excTotal(l), sub: bad ? tr(bad + ' checks unavailable', bad + ' فحوص غير متاحة') : t('def_exc') }; }); }, drill: { loader: function (p, s) { return coreExc().then(function (l) { return staticLoader(l)(p, s); }); }, cols: excCols() } })
    ], true);
    var st = CH('ov_status', function () { return Promise.all(['pending', 'approved', 'rejected', 'returned'].map(function (k) { return cnts(parts(k, CORE3)); })); }, function (c) {
      return shareList([['pending', 'var(--dms-age2)'], ['approved', 'var(--dms-ok)'], ['rejected', 'var(--dms-bad)'], ['returned', 'var(--dms-orange)']].map(function (x, i) { return { label: t('s_' + x[0]), value: c[i], color: x[1], act: c[i] ? nestAct(t('s_' + x[0]), { parts: parts(x[0], CORE3) }) : null }; }), '<b class="dms-num">' + num(sum(c)) + '</b> ' + esc(tr('workflow records', 'سجل سير عمل')), num, true);
    });
    var trend = CH('ov_trend', function () {
      var ms = monthList(addMonths(monthStart(S.to || T), -11), S.to || T).filter(function (m) { return !S.from || m >= S.from.slice(0, 7); });
      return Promise.all(ms.map(function (m) { var f = [['docstatus', '=', 1], ['posting_date', 'between', [m + '-01', monthEnd(m + '-01')]]].concat(coF()); return gl('Payment Entry', { fields: ['payment_type', 'sum(base_paid_amount) as p', 'sum(base_received_amount) as r'], filters: f, group: 'payment_type', limit: 10 }); }))
        .then(function (res) { var o = { ms: ms, pay: {}, rec: {} }; res.forEach(function (rows, i) { var p = 0, r = 0; rows.forEach(function (x) { if (x.payment_type === 'Pay') { p += +x.p || 0; } if (x.payment_type === 'Receive') { r += +x.r || 0; } }); o.pay[ms[i]] = p; o.rec[ms[i]] = r; }); return o; });
    }, function (o) { return barChart(o.ms, 'month', [{ label: tr('Receipts', 'المقبوضات'), color: 'var(--dms-ok)', val: function (k) { return o.rec[k]; } }, { label: tr('Payments', 'المدفوعات'), color: 'var(--dms-bad)', val: function (k) { return o.pay[k]; } }]); });
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(tr('Approval status', 'حالة الاعتماد'), st, '', esc(tr('Payments, journals, expense claims · period', 'دفعات وقيود ومطالبات · الفترة'))) +
      panel(tr('Payments vs receipts', 'المدفوعات مقابل المقبوضات'), trend, '', esc(CUR) + ' · ' + esc(tr('by month', 'شهريًا'))) + '</div></div>';
    var pend = CH('ov_pend', function () { return Promise.all(PEND4.map(function (d) { return cnts(parts('pending', [d])); })); }, function (c) { return hbars(PEND4.map(function (d, i) { return { label: dtl(d), value: c[i], color: 'var(--dms-age2)', act: c[i] ? nestAct(dtl(d) + ' · ' + t('s_pending'), { parts: parts('pending', [d]), asc: true }) : null }; }), num); });
    var ar2 = CH('ov_apprej', function () { return Promise.all(CORE3.map(function (d) { return Promise.all([cnts(parts('approved', [d])), cnts(parts('rejected', [d]))]); })); }, function (c) { return splitBars(CORE3.map(function (d, i) { return { label: dtl(d), total: c[i][0] + c[i][1], part: c[i][1] }; }), [{ label: t('s_rejected'), color: 'var(--dms-bad)' }, { label: t('s_approved'), color: 'var(--dms-ok)' }], num); });
    var bal = CH('ov_payrec', function () { return Promise.all([agg('Purchase Invoice', apF), agg('Sales Invoice', arF), agg('Purchase Invoice', overdueF), agg('Sales Invoice', openF('Sales Invoice', false, [['due_date', '<', T]]))]); }, function (a) { return splitBars([{ label: tr('Payables', 'الدائنون'), total: a[0].base, part: a[2].base }, { label: tr('Receivables', 'المدينون'), total: a[1].base, part: a[3].base }], [{ label: tr('Overdue', 'متأخر'), color: 'var(--dms-bad)' }, { label: tr('Not yet due', 'غير مستحق'), color: 'var(--dms-royal)' }]); });
    var exc = CH('ov_exc', coreExc, function (l) { var x = l.filter(function (r) { return r.count; }); return x.length ? hbars(x.map(function (r) { return { label: t(r.d.label), value: r.count, color: r.d.sev === 'high' ? 'var(--dms-bad)' : 'var(--dms-age2)', act: r.drill ? nestAct(t(r.d.label), r.drill) : null }; }), num) : empty(tr('No control exceptions in the period.', 'لا استثناءات رقابية في الفترة.')); });
    h += '<div class="dms-breakdowns">' + panel(tr('Pending by document type', 'المعلق حسب نوع المستند'), pend) + panel(tr('Approved vs rejected', 'المعتمد مقابل المرفوض'), ar2) + panel(tr('Payables and receivables', 'الدائنون والمدينون'), bal, '', esc(CUR)) + panel(t('grp_exc'), exc) + '</div>';
    return scopeNote('scope_default') + h;
  }
  function nestAct(title, spec) { return nest(title, spec); }
  function approvalParts() {
    var dts = S.doctype ? [S.doctype] : PEND4, k = S.ap, out = [];
    dts.forEach(function (dt) {
      // The pending queue is a live backlog: include old pending items regardless of the selected reporting period.
      var f = base(dt, { noDate: k === 'pending' }).concat(userFilters(dt));
      if (dt === 'Purchase Invoice') { if (S.wf || (k && k !== 'pending')) { return; } f = base(dt, { noDate: k === 'pending' }).concat([['docstatus', '=', 0]]); }
      else if (S.wf && !HASWF[dt]) { return; }
      if (k === 'pending' || k === 'returned') { if (S.age > 0) { f.push(['posting_date', '<=', addDays(TODAY, -S.age)]); } }
      else if (S.age > 0) { f = f.concat(stat2(dt, 'pending') || [], [['posting_date', '<=', addDays(TODAY, -S.age)]]); }
      out.push({ dt: dt, filters: f, or: orSearch(dt), asc: (k === 'pending' || k === 'returned' || S.age > 0) });
    });
    return out;
  }
  function tabApprovals() {
    var T = TODAY, h = scopeNote('scope_appr') + kpis([KP(cdef('k_pending_total', parts('pending', PEND4, null, true), 'auto')), KP(cdef('k_aged7', CORE3.map(function (dt) { return { dt: dt, filters: base(dt, { noDate: true }).concat(stat2(dt, 'pending'), [['posting_date', '<=', addDays(T, -BACKDATE_DAYS)]]) }; }), 'auto')),
      KP(cdef('k_returned', parts('returned', CORE3), 'warn')), KP(cdef('k_approved', parts('approved', CORE3), 'ok')), KP(cdef('k_rejected', parts('rejected', CORE3), 'bad'))]);
    var sumT = CH('ap_sum', function () { return Promise.all(CORE3.map(function (dt) { return gl(dt, { fields: ['workflow_state', 'docstatus', 'count(name) as n'], filters: base(dt, { noDate: true }).concat(stat2(dt, 'pending')), group: 'workflow_state,docstatus', limit: 100 }); }).concat([cnt('Purchase Invoice', base('Purchase Invoice', { noDate: true }).concat([['docstatus', '=', 0]]))])); }, function (res) {
      var rows = []; CORE3.forEach(function (dt, i) { res[i].sort(function (a, b) { return b.n - a.n; }).forEach(function (r) { rows.push({ dt: dt, state: r.workflow_state, ds: r.docstatus, n: +r.n }); }); }); rows.push({ dt: 'Purchase Invoice', state: null, ds: 0, n: res[3] });
      return regTable({ id: 't_wfsum', rows: rows, sk: 'n', dir: -1, file: 'workflow_summary', text: function (r) { return [r.dt, r.state].join(' '); }, cols: [
        { k: 'dt', h: t('c_type'), s: function (r) { return r.dt; }, r: function (r) { return esc(dtl(r.dt)); }, c: function (r) { return r.dt; } },
        { k: 'st', h: t('c_state'), s: function (r) { return r.state || ''; }, r: function (r) { return r.state ? bdg(r.state) : stat('n', t('wf_none')); }, c: function (r) { return r.state; } },
        { k: 'ds', h: t('c_docstatus'), r: function (r) { return esc(docLbl(r.ds)); }, c: function (r) { return r.ds; } },
        { k: 'n', h: t('c_n'), num: 1, s: function (r) { return r.n; }, r: function (r) { var f = base(r.dt, { noDate: true }).concat([['docstatus', '=', r.ds]]); if (r.state) { f.push(['workflow_state', '=', r.state]); } return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="' + esc(nest(dtl(r.dt) + ' · ' + tState(r.state) + ' · ' + docLbl(r.ds), { parts: [{ dt: r.dt, filters: f }] })) + '">' + num(r.n) + '</button>'; }, c: function (r) { return r.n; } },
        { k: 'role', h: t('c_role'), r: function (r) { return txt(roleOf(r.dt, r.state)); }, c: function (r) { return roleOf(r.dt, r.state); } },
        { k: 'wf', h: t('c_workflow_active'), r: function (r) { var w = WFDEF && WFDEF[r.dt]; return esc(w ? (w.active ? t('wf_active') : t('wf_inactive')) : t('wf_none')); }, c: function () { return ''; } }] });
    });
    var pts = approvalParts();
    return h + panel(tr('Pending workflow summary', 'ملخص سير العمل المعلق'), sumT, 'dms-mb') + panel(tr('Approval queue', 'قائمة الاعتماد'), pts.length ? regTable(Object.assign({ id: 't_appr', pageSize: CFG.pageSize }, specOf({ parts: pts, asc: true }, 'approvals'))) : empty(), '', esc(tr('Follows the document type, workflow, approval status, waiting time and search filters', 'يتبع مرشحات نوع المستند وسير العمل والاعتماد ومدة الانتظار والبحث')));
  }
  function tabPayments() {
    var B = base('Payment Entry'), P = function (extra) { return [{ dt: 'Payment Entry', filters: B.concat(extra) }]; };
    var h = scopeNote('scope_tbl') + kpis([KP(cdef('k_pe_total', P([]))), KP(cdef('k_pe_pending', parts('pending', ['Payment Entry']), 'auto')), KP(cdef('k_pe_approved', parts('approved', ['Payment Entry']), 'ok')), KP(cdef('k_pe_rejected', parts('rejected', ['Payment Entry']), 'bad')),
      KP(cdef('k_pe_sup', P([['docstatus', '=', 1], ['payment_type', '=', 'Pay'], ['party_type', '=', 'Supplier']]))), KP(cdef('k_pe_cust', P([['docstatus', '=', 1], ['payment_type', '=', 'Receive'], ['party_type', '=', 'Customer']]))),
      KP({ label: 'k_pe_unalloc', tone: 'warn', load: function () { return sumOf('Payment Entry', 'unallocated_amount', B.concat([['docstatus', '=', 1], ['unallocated_amount', '>', 0]])).then(function (r) { return { v: r.n, sub: n0(r.s) + ' ' + CUR }; }); }, drill: { parts: P([['docstatus', '=', 1], ['unallocated_amount', '>', 0]]) } }),
      KP({ label: 'k_pe_exc', tone: 'bad', load: function () { return cnt('Payment Entry', B.concat([['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']])).then(function (n) { return { v: n, sub: t('c_posted') }; }); }, drill: { parts: P([['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']]) } })]);
    var g = function (key, field, extra, draw) { return CH(key, function () { return gl('Payment Entry', { fields: [field, 'count(name) as n'], filters: B.concat(extra), group: field, limit: 20 }); }, draw); };
    h += '<div class="dms-breakdowns">' + panel(tr('By payment type', 'حسب نوع الدفع'), g('pe_type', 'payment_type', [['docstatus', '=', 1]], function (r) { return shareList(r.map(function (x, i) { return { label: tState(x.payment_type), value: +x.n, color: PAL[i % PAL.length] }; }), '', num); })) +
      panel(tr('By mode of payment', 'حسب طريقة الدفع'), g('pe_mode', 'mode_of_payment', [['docstatus', '=', 1]], function (r) { return hbars(r.map(function (x) { return { label: x.mode_of_payment || '—', value: +x.n }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8), num); })) +
      panel(tr('By workflow state', 'حسب حالة سير العمل'), g('pe_state', 'workflow_state', [], function (r) { return hbars(r.map(function (x) { return { label: tState(x.workflow_state), value: +x.n, color: 'var(--dms-navy)' }; }).sort(function (a, b) { return b.value - a.value; }), num); })) + '</div>';
    var cols = [{ h: t('c_doc'), r: function (r) { return docBtn(r.dt, r.name); }, c: function (r) { return r.name; } }, col(t('c_date'), 'date', { fmt: dtc }), col(t('c_company'), 'company'), { h: t('c_ptype'), r: function (r) { return esc(tState(r.raw.payment_type)); }, c: function (r) { return r.raw.payment_type; } }, col(t('c_party'), 'party'),
      { h: t('c_paid'), num: 1, r: function (r) { return amc(r.raw.paid_amount); }, c: function (r) { return r.raw.paid_amount; } }, { h: t('c_recv'), num: 1, r: function (r) { return amc(r.raw.received_amount); }, c: function (r) { return r.raw.received_amount; } },
      { h: t('c_mode'), r: function (r) { return txt(r.raw.mode_of_payment); }, c: function (r) { return r.raw.mode_of_payment; } }, { h: t('c_ref'), r: function (r) { return txt(r.raw.reference_no); }, c: function (r) { return r.raw.reference_no; } }, { h: t('c_state'), r: function (r) { return bdg(r.state); }, c: function (r) { return r.state; } }, { h: t('c_status'), r: function (r) { return bdg(r.status); }, c: function (r) { return r.status; } }];
    return h + panel(t('t_payments') === 't_payments' ? tr('Payment entries', 'سندات الدفع') : t('t_payments'), regTable({ id: 't_pe', server: true, cols: cols, file: 'payments', pageSize: CFG.pageSize, loader: function (p, s, q) { return mergedLoader([{ dt: 'Payment Entry', filters: B.concat(userFilters('Payment Entry')), or: q ? orQ('Payment Entry', q) : orSearch('Payment Entry') }], p, s); } }));
  }
  function jeRows(page, size, q) {
    var pts = [{ dt: 'Journal Entry', filters: base('Journal Entry').concat(userFilters('Journal Entry')), or: q ? orQ('Journal Entry', q) : orSearch('Journal Entry') }];
    return mergedLoader(pts, page, size).then(function (res) {
      var names = res.rows.map(function (r) { return r.name; }); if (!names.length) { return res; }
      return gl('Journal Entry Account', { parent: 'Journal Entry', fields: ['parent', 'sum(debit) as d', 'sum(credit) as c'], filters: [['parent', 'in', names]], group: 'parent', limit: names.length + 5 }).then(function (c) {
        var m = {}; c.forEach(function (x) { m[x.parent] = x; }); res.rows.forEach(function (r) { var x = m[r.name]; r.d = x ? +x.d : null; r.c = x ? +x.c : null; }); return res;
      });
    });
  }
  function jeFlags(r) {
    var f = [], raw = r.raw;
    if (r.d != null && Math.abs((r.d || 0) - (r.c || 0)) > 0.005) { f.push(t('flag_unbal')); }
    if (r.d != null && (Math.abs(r.d - (raw.total_debit || 0)) > 0.005 || Math.abs(r.c - (raw.total_credit || 0)) > 0.005)) { f.push(t('flag_hdr')); }
    if (dayDiff(r.date, String(raw.creation).slice(0, 10)) > BACKDATE_DAYS) { f.push(t('flag_back')); }
    if (r.ds === 1 && (WF_PEND['Journal Entry'].indexOf(r.state) >= 0)) { f.push(t('flag_unappr')); }
    if (r.ds === 2) { f.push(t('flag_canc')); }
    return f;
  }
  function tabJournals() {
    var B = base('Journal Entry'), J = function (extra) { return [{ dt: 'Journal Entry', filters: B.concat(extra) }]; };
    var h = scopeNote('scope_tbl') + kpis([KP(cdef('k_je_total', J([]))), KP(cdef('k_je_pend', parts('pending', ['Journal Entry']), 'auto')), KP(cdef('k_je_appr', parts('approved', ['Journal Entry']), 'ok')), KP(cdef('k_je_rej', parts('rejected', ['Journal Entry']), 'bad')), KP(cdef('k_je_canc', J([['docstatus', '=', 2]]))),
      KP({ label: 'k_je_back', tone: 'warn', load: function () { return backdatedRows('Journal Entry').then(function (s) { return { v: s.hits.length, sub: s.capped ? t('scanned', { a: n0(s.rows.length), b: n0(s.total) }) : t('conf_confirmed') }; }); }, drill: { loader: function (p, s) { return backdatedRows('Journal Entry').then(function (x) { return staticLoader(x.hits)(p, s); }); } } }),
      KP(cdef('k_je_rev', J([['reversal_of', 'is', 'set']]))), KP(cdef('k_je_unbal', J([['docstatus', '!=', 2], ['difference', '!=', 0]]), 'auto'))]);
    var g = function (key, field, extra, draw) { return CH(key, function () { return gl('Journal Entry', { fields: [field, 'count(name) as n'], filters: B.concat(extra), group: field, limit: 20 }); }, draw); };
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('By workflow state', 'حسب حالة سير العمل'), g('je_state', 'workflow_state', [], function (r) { return hbars(r.map(function (x) { return { label: tState(x.workflow_state), value: +x.n, color: 'var(--dms-navy)' }; }).sort(function (a, b) { return b.value - a.value; }), num); })) +
      panel(tr('By entry type', 'حسب نوع القيد'), g('je_type', 'voucher_type', [['docstatus', '=', 1]], function (r) { return shareList(r.map(function (x, i) { return { label: x.voucher_type, value: +x.n, color: PAL[i % PAL.length] }; }), '', num); })) + '</div>';
    var cols = [{ h: t('c_doc'), r: function (r) { return docBtn(r.dt, r.name); }, c: function (r) { return r.name; } }, col(t('c_date'), 'date', { fmt: dtc }), col(t('c_company'), 'company'), { h: t('c_vtype'), r: function (r) { return txt(r.raw.voucher_type); }, c: function (r) { return r.raw.voucher_type; } },
      { h: t('c_debit'), num: 1, r: function (r) { return r.d == null ? esc(t('na')) : amc(r.d); }, c: function (r) { return r.d; } }, { h: t('c_credit'), num: 1, r: function (r) { return r.c == null ? esc(t('na')) : amc(r.c); }, c: function (r) { return r.c; } },
      { h: t('c_diff'), num: 1, r: function (r) { return r.d == null ? esc(t('na')) : amc((r.d || 0) - (r.c || 0)); }, c: function (r) { return r.d == null ? '' : (r.d || 0) - (r.c || 0); } }, { h: t('c_state'), r: function (r) { return bdg(r.state); }, c: function (r) { return r.state; } }, { h: t('c_created'), r: function (r) { return who(userName(r.by)); }, c: function (r) { return r.by; } },
      { h: t('c_flags'), r: function (r) { var f = jeFlags(r); return f.length ? f.map(function (x) { return stat('bad', x); }).join(' ') : '<span class="dms-sm">—</span>'; }, c: function (r) { return jeFlags(r).join('; '); } }];
    return h + panel(tr('Journal entries', 'القيود'), regTable({ id: 't_je', server: true, cols: cols, file: 'journals', pageSize: CFG.pageSize, loader: jeRows }), '', esc(tr('Debit and credit are summed from the journal lines, not the header. Flags: ', 'المدين والدائن من بنود القيد وليس الرأس. التنبيهات: ') + t('flag_unbal') + ', ' + t('flag_hdr') + ', ' + t('flag_back') + ' (> ' + BACKDATE_DAYS + ' d), ' + t('flag_unappr')));
  }
  function chipRow(key, cur, opts) { return '<div class="dms-chips dms-bchips" role="group">' + opts.map(function (o) { var on = String(cur) === String(o[0]); return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="chip" data-v="' + esc(key + ':' + o[0]) + '"><span>' + esc(o[1]) + '</span></button>'; }).join('') + '</div>'; }
  function tabBalances(kind) {
    var ap = kind === 'ap', dt = ap ? 'Purchase Invoice' : 'Sales Invoice', apply = ap ? S.apRange : S.arRange, T = TODAY, O = function (extra) { return openF(dt, apply, extra); }, P = function (f, order) { return { parts: [{ dt: dt, filters: f, order: order || 'due_date asc' }] }; };
    var aggDef = function (label, f, tone, money) { return { label: label, key: label + apply, tone: tone, load: function () { return agg(dt, f).then(function (a) { return money ? { v: a.base, money: 1, sub: n0(a.n) + ' ' + tr('invoices', 'فاتورة') } : { v: a.n, sub: n0(a.base) + ' ' + CUR }; }); }, drill: P(f) }; };
    var defs = ap ? [aggDef('k_ap_total', balF(dt, apply), '', true), aggDef('k_ap_overdue', O([['due_date', '<', T]]), 'bad'), aggDef('k_ap_unpaid', O([]), ''), aggDef('k_ap_7', O(dueF(T, addDays(T, 7))), 'warn'), aggDef('k_ap_30', O(dueF(T, addDays(T, 30))), 'warn'), aggDef('k_ap_cn', balF(dt, apply).concat([['is_return', '=', 1]]), ''), cdef('k_ap_review', [{ dt: dt, filters: base(dt).concat([['docstatus', '=', 0]]) }], 'auto')]
      : [aggDef('k_ar_total', balF(dt, apply), '', true), aggDef('k_ar_overdue', O([['due_date', '<', T]]), 'bad'),
        { label: 'k_ar_credit', key: 'k_ar_credit' + apply, tone: 'ok', load: function () { return agg(dt, balF(dt, apply).concat([['is_return', '=', 1], ['outstanding_amount', '<', 0]])).then(function (a) { return { v: -a.base, money: 1, sub: n0(a.n) }; }); }, drill: P(balF(dt, apply).concat([['is_return', '=', 1], ['outstanding_amount', '<', 0]])) },
        aggDef('k_ar_count', O([]), ''),
        { label: 'k_ar_unalloc', key: 'k_ar_unalloc' + apply, tone: 'warn', load: function () { var f = base('Payment Entry', { noDate: !apply }).concat([['docstatus', '=', 1], ['payment_type', '=', 'Receive'], ['party_type', '=', 'Customer'], ['unallocated_amount', '>', 0]]); return sumOf('Payment Entry', 'unallocated_amount', f).then(function (r) { return { v: r.s, money: 1, sub: n0(r.n) }; }); },
          drill: { parts: [{ dt: 'Payment Entry', filters: base('Payment Entry', { noDate: !apply }).concat([['docstatus', '=', 1], ['payment_type', '=', 'Receive'], ['party_type', '=', 'Customer'], ['unallocated_amount', '>', 0]]) }] } }];
    var view = ap ? S.apView : S.arView, h = scopeNote('scope_bal') + chipRow(ap ? 'apRange' : 'arRange', apply, [[false, tr('All open balances', 'كل الأرصدة المفتوحة')], [true, tr('Posted in the period', 'مرحلة في الفترة')]]) + kpis(defs.map(KP));
    var age = CH(kind + '_age' + apply, function () { return ageBuckets(dt, apply); }, function (b) { return shareList(b.map(function (x) { return { label: x.k, value: x.a.base, color: x.c, act: x.a.n ? nest((ap ? t('k_ap_total') : t('k_ar_total')) + ' · ' + x.k, P(O(x.f))) : null }; }), '', money, true); });
    var pf = ap ? 'supplier' : 'customer', nf = ap ? 'supplier_name' : 'customer_name';
    var top = CH(kind + '_top' + apply, function () { return partyAgg(dt, pf, nf, ap ? O([]) : O([['due_date', '<', T]])); }, function (l) { return hbars(l.slice(0, 10).map(function (x) { return { label: x.name, value: x.base, color: ap ? 'var(--dms-navy)' : 'var(--dms-bad)', act: nest(x.name, P(balF(dt, apply).concat([[pf, '=', x.id]]))) }; }), money); });
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Ageing (base currency)', 'الأعمار (العملة الأساسية)'), age, '', esc(CUR)) + panel(ap ? tr('Top suppliers by outstanding', 'أعلى الموردين بالرصيد') : tr('Top customers by overdue', 'أعلى العملاء بالمتأخر'), top, '', esc(CUR)) + '</div>';
    h += chipRow(ap ? 'apView' : 'arView', view, [['inv', tr('Invoices', 'الفواتير')], ['party', ap ? tr('By supplier', 'حسب المورد') : tr('By customer', 'حسب العميل')]]);
    if (view === 'inv') {
      var cols = [{ h: t('c_doc'), r: function (r) { return docBtn(r.dt, r.name); }, c: function (r) { return r.name; } }, { h: ap ? t('c_supplier') : t('c_customer'), r: function (r) { return txt(r.raw[nf]); }, c: function (r) { return r.raw[nf]; } }]
        .concat(ap ? [{ h: t('c_bill'), r: function (r) { return txt(r.raw.bill_no); }, c: function (r) { return r.raw.bill_no; } }] : [])
        .concat([col(t('c_date'), 'date', { fmt: dtc }), { h: t('c_due'), r: function (r) { return dtc(r.raw.due_date); }, c: function (r) { return r.raw.due_date; } }, { h: t('c_cur'), r: function (r) { return esc(r.raw.currency + ' / ' + r.raw.party_account_currency); }, c: function (r) { return r.raw.currency; } },
          { h: t('c_inv'), num: 1, r: function (r) { return amc(r.raw.grand_total); }, c: function (r) { return r.raw.grand_total; } }, { h: t('c_out'), num: 1, r: function (r) { return amc(r.raw.outstanding_amount); }, c: function (r) { return r.raw.outstanding_amount; } },
          { h: t('c_outbase'), num: 1, r: function (r) { try { return amc(baseBalance(r.raw)); } catch (e) { return '<span class="dms-sm dms-tone-warn" title="' + esc(e.message) + '">—</span>'; } }, c: function (r) { try { return baseBalance(r.raw); } catch (e) { return ''; } } },
          { h: t('c_overdue'), num: 1, r: function (r) { return r.raw.outstanding_amount > 0 && r.raw.due_date && r.raw.due_date < T ? overdueTag(r.raw.due_date) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.raw.due_date && r.raw.due_date < T ? dayDiff(r.raw.due_date, T) : ''; } }, { h: t('c_status'), r: function (r) { return bdg(r.status); }, c: function (r) { return r.status; } }]);
      return h + panel(ap ? tr('Supplier invoices with a balance', 'فواتير موردين برصيد') : tr('Customer invoices with a balance', 'فواتير عملاء برصيد'), regTable({ id: 't_' + kind, server: true, cols: cols, file: kind + '_invoices', pageSize: CFG.pageSize, loader: function (p, s, q) { return mergedLoader([{ dt: dt, filters: balF(dt, apply), or: q ? orQ(dt, q) : orSearch(dt), order: 'due_date asc' }], p, s); } }));
    }
    var list = CH(kind + '_party' + apply, function () { return partyAgg(dt, pf, nf, balF(dt, apply).concat([['is_return', 'in', [0, 1]]])); }, function (l) {
      return regTable({ id: 't_' + kind + 'p', rows: l, sk: 'base', dir: -1, file: kind + '_parties', text: function (x) { return x.id + ' ' + x.name; }, cols: [
        { k: 'name', h: ap ? t('c_supplier') : t('c_customer'), s: function (x) { return x.name; }, r: function (x) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="' + esc(nest(x.name, P(balF(dt, apply).concat([[pf, '=', x.id]])))) + '"><bdi>' + esc(x.name) + '</bdi></button>'; }, c: function (x) { return x.name; } },
        { k: 'n', h: t('c_count'), num: 1, s: function (x) { return x.n; }, r: function (x) { return '<span class="dms-num">' + num(x.n) + '</span>'; }, c: function (x) { return x.n; } },
        { k: 'base', h: t('c_outbase'), num: 1, s: function (x) { return x.base; }, r: function (x) { return amc(x.base); }, c: function (x) { return x.base; } }] });
    });
    return h + panel(ap ? tr('Balances by supplier', 'الأرصدة حسب المورد') : tr('Balances by customer', 'الأرصدة حسب العميل'), list, '', esc(CUR));
  }
  function tabExpenses() {
    var B = base('Expense Claim'), E = function (extra) { return [{ dt: 'Expense Claim', filters: B.concat(extra) }]; };
    var sumDef = function (label, field) { return { label: label, load: function () { return sumOf('Expense Claim', field, B.concat([['docstatus', '=', 1]])).then(function (r) { return { v: r.s, money: 1, sub: n0(r.n) + ' ' + tr('claims', 'مطالبة') }; }); }, drill: { parts: E([['docstatus', '=', 1]]) } }; };
    var h = scopeNote('scope_tbl') + kpis([KP(cdef('k_ec_total', E([]))), KP(cdef('k_ec_pend', parts('pending', ['Expense Claim']), 'auto')), KP(cdef('k_ec_appr', parts('approved', ['Expense Claim']), 'ok')), KP(cdef('k_ec_rej', parts('rejected', ['Expense Claim']), 'bad')),
      KP(cdef('k_ec_unpaid', E([['approval_status', '=', 'Approved'], ['docstatus', '=', 1], ['status', '=', 'Unpaid']]), 'auto')), KP(sumDef('k_ec_claimed', 'total_claimed_amount')), KP(sumDef('k_ec_sanct', 'total_sanctioned_amount')), KP(sumDef('k_ec_reimb', 'total_amount_reimbursed'))]);
    var g = function (key, field, draw) { return CH(key, function () { return gl('Expense Claim', { fields: [field, 'count(name) as n'], filters: B, group: field, limit: 20 }); }, draw); };
    var emp = CH('ec_emp', function () { return gl('Expense Claim', { fields: ['employee', 'employee_name', 'count(name) as n', 'sum(total_claimed_amount) as s'], filters: B.concat([['docstatus', '=', 1]]), group: 'employee,employee_name', limit: 0 }); }, function (r) { return hbars(r.map(function (x) { return { label: x.employee_name || x.employee, value: +x.s, act: nest(t('emp_claims', { x: x.employee_name || x.employee }), { parts: E([['employee', '=', x.employee]]) }) }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 10), money); });
    h += '<div class="dms-breakdowns">' + panel(tr('Approval status', 'حالة الاعتماد'), g('ec_status', 'approval_status', function (r) { return shareList(r.map(function (x) { return { label: tState(x.approval_status), value: +x.n, color: { Approved: 'var(--dms-ok)', Rejected: 'var(--dms-bad)', Draft: 'var(--dms-age2)' }[x.approval_status] || '#8a97a8' }; }), '', num); })) +
      panel(tr('Payment status', 'حالة الدفع'), g('ec_pay', 'status', function (r) { return hbars(r.map(function (x) { return { label: tState(x.status), value: +x.n }; }).sort(function (a, b) { return b.value - a.value; }), num); })) + panel(tr('Top claimants', 'أعلى المطالبين'), emp, '', esc(CUR)) + '</div>';
    var cols = [{ h: t('c_doc'), r: function (r) { return docBtn(r.dt, r.name); }, c: function (r) { return r.name; } }, { h: t('c_employee'), r: function (r) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="' + esc(nest(t('emp_claims', { x: r.raw.employee_name || r.raw.employee }), { parts: E([['employee', '=', r.raw.employee]]) })) + '"><bdi>' + esc(r.raw.employee_name || r.raw.employee) + '</bdi></button>'; }, c: function (r) { return r.raw.employee_name; } },
      col(t('c_company'), 'company'), col(t('c_date'), 'date', { fmt: dtc }), { h: t('c_claimed'), num: 1, r: function (r) { return amc(r.raw.total_claimed_amount); }, c: function (r) { return r.raw.total_claimed_amount; } }, { h: t('c_sanct'), num: 1, r: function (r) { return amc(r.raw.total_sanctioned_amount); }, c: function (r) { return r.raw.total_sanctioned_amount; } },
      { h: t('c_reimb'), num: 1, r: function (r) { return amc(r.raw.total_amount_reimbursed); }, c: function (r) { return r.raw.total_amount_reimbursed; } }, { h: t('c_appr'), r: function (r) { return bdg(r.raw.approval_status); }, c: function (r) { return r.raw.approval_status; } }, { h: t('c_state'), r: function (r) { return bdg(r.state); }, c: function (r) { return r.state; } }, { h: t('c_paystatus'), r: function (r) { return bdg(r.raw.status); }, c: function (r) { return r.raw.status; } }];
    return h + panel(tr('Expense claims', 'مطالبات المصروفات'), regTable({ id: 't_ec', server: true, cols: cols, file: 'expense_claims', pageSize: CFG.pageSize, loader: function (p, s, q) { return mergedLoader([{ dt: 'Expense Claim', filters: B.concat(userFilters('Expense Claim')), or: q ? orQ('Expense Claim', q) : orSearch('Expense Claim') }], p, s); } }));
  }
  var UNREC = ['Pending', 'Unreconciled'], RECD = ['Reconciled', 'Settled'];
  function btF(extra) { return base('Bank Transaction').concat(extra || []); }
  function bankBalances() {
    var f = [['is_company_account', '=', 1]].concat(coF());
    return gl('Bank Account', { fields: ['name', 'account', 'bank', 'company'], filters: f, limit: 60 }).then(function (accs) {
      return Promise.all(accs.map(function (a) {
        if (!a.account) { return Promise.resolve({ a: a, bal: null }); }
        return guarded(null, 'erpnext.accounts.utils.get_balance_on', { account: a.account, date: TODAY, company: a.company }).then(function (b) { return { a: a, bal: typeof b === 'number' ? b : null }; }, function () { return { a: a, bal: null }; });
      }));
    });
  }
  function tabBank() {
    var B = function (extra) { return [{ dt: 'Bank Transaction', filters: btF(extra) }]; };
    var h = alertBox('info', esc(t('bank_note_norec')) + ' <a class="dms-link" href="/app/query-report/Bank Reconciliation Statement" target="_blank" rel="noopener noreferrer">' + esc(t('open_report')) + ' ↗</a>');
    h += kpis([
      KP({ label: 'k_bk_bal', load: function () { return bankBalances().then(function (l) { var ok = l.filter(function (x) { return x.bal != null; }); if (!ok.length) { return { v: null, sub: l.length ? t('no_wf') : t('empty') }; } return { v: sum(ok.map(function (x) { return x.bal; })), money: 1, sub: ok.length + '/' + l.length + ' ' + tr('accounts', 'حساب') }; }); } }),
      KP(cdef('k_bk_unrec', B([['status', 'in', UNREC], ['docstatus', '=', 1]]), 'auto')), KP(cdef('k_bk_rec', B([['status', 'in', RECD], ['docstatus', '=', 1]]), 'ok')),
      KP({ label: 'k_bk_dep', load: function () { return sumOf('Bank Transaction', 'deposit', btF([['status', 'in', UNREC], ['docstatus', '=', 1]])).then(function (r) { return { v: r.s, money: 1, sub: n0(r.n) }; }); }, drill: { parts: B([['status', 'in', UNREC], ['docstatus', '=', 1], ['deposit', '>', 0]]) } }),
      KP({ label: 'k_bk_wd', load: function () { return sumOf('Bank Transaction', 'withdrawal', btF([['status', 'in', UNREC], ['docstatus', '=', 1]])).then(function (r) { return { v: r.s, money: 1, sub: n0(r.n) }; }); }, drill: { parts: B([['status', 'in', UNREC], ['docstatus', '=', 1], ['withdrawal', '!=', 0]]) } }),
      KP(cdef('k_bk_unm', B([['docstatus', '=', 1], ['unallocated_amount', '>', 0]]), 'auto'))]);
    var stt = CH('bk_status', function () { return gl('Bank Transaction', { fields: ['status', 'count(name) as n'], filters: btF([['docstatus', '=', 1]]), group: 'status', limit: 10 }); }, function (r) { return shareList(r.map(function (x) { return { label: tState(x.status), value: +x.n, color: RECD.indexOf(x.status) >= 0 ? 'var(--dms-ok)' : UNREC.indexOf(x.status) >= 0 ? 'var(--dms-age2)' : '#8a97a8' }; }), '', num); });
    var wise = CH('bk_wise', function () { return Promise.all([gl('Bank Transaction', { fields: ['bank_account', 'status', 'count(name) as n', 'sum(deposit) as dep', 'sum(withdrawal) as wd', 'sum(unallocated_amount) as un'], filters: btF([['docstatus', '=', 1]]), group: 'bank_account,status', limit: 200 }), bankBalances()]); }, function (res) {
      var m = {}; res[0].forEach(function (r) { var e = m[r.bank_account] || (m[r.bank_account] = { acc: r.bank_account, n: 0, unrec: 0, dep: 0, wd: 0, un: 0 }); e.n += +r.n; e.dep += +r.dep || 0; e.wd += +r.wd || 0; e.un += +r.un || 0; if (UNREC.indexOf(r.status) >= 0) { e.unrec += +r.n; } });
      var bal = {}; res[1].forEach(function (x) { bal[x.a.name] = x.bal; });
      return regTable({ id: 't_bkw', rows: vals(m), sk: 'un', dir: -1, file: 'bank_accounts', text: function (x) { return x.acc; }, cols: [
        { k: 'acc', h: t('c_bank'), s: function (x) { return x.acc; }, r: function (x) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="' + esc(nest(x.acc, { parts: B([['bank_account', '=', x.acc]]) })) + '"><bdi>' + esc(x.acc) + '</bdi></button>'; }, c: function (x) { return x.acc; } },
        { k: 'bal', h: t('c_balance'), num: 1, s: function (x) { return bal[x.acc] || 0; }, r: function (x) { return bal[x.acc] == null ? esc(t('na')) : amc(bal[x.acc]); }, c: function (x) { return bal[x.acc]; } },
        { k: 'n', h: t('c_ntx'), num: 1, s: function (x) { return x.n; }, r: function (x) { return '<span class="dms-num">' + num(x.n) + '</span>'; }, c: function (x) { return x.n; } },
        { k: 'unrec', h: t('k_bk_unrec'), num: 1, s: function (x) { return x.unrec; }, r: function (x) { return '<span class="dms-num' + (x.unrec ? ' dms-tone-warn' : '') + '">' + num(x.unrec) + '</span>'; }, c: function (x) { return x.unrec; } },
        { k: 'dep', h: t('c_deposit'), num: 1, s: function (x) { return x.dep; }, r: function (x) { return amc(x.dep); }, c: function (x) { return x.dep; } }, { k: 'wd', h: t('c_withdraw'), num: 1, s: function (x) { return x.wd; }, r: function (x) { return amc(x.wd); }, c: function (x) { return x.wd; } },
        { k: 'un', h: t('c_unalloc'), num: 1, s: function (x) { return x.un; }, r: function (x) { return amc(x.un); }, c: function (x) { return x.un; } }] });
    });
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Transactions by status', 'المعاملات حسب الحالة'), stt) + panel(tr('By bank account', 'حسب الحساب البنكي'), wise) + '</div>';
    var cols = [{ h: t('c_doc'), r: function (r) { return docBtn(r.dt, r.name); }, c: function (r) { return r.name; } }, col(t('c_date'), 'date', { fmt: dtc }), col(t('c_company'), 'company'), { h: t('c_bank'), r: function (r) { return txt(r.raw.bank_account); }, c: function (r) { return r.raw.bank_account; } },
      { h: t('c_deposit'), num: 1, r: function (r) { return amc(r.raw.deposit); }, c: function (r) { return r.raw.deposit; } }, { h: t('c_withdraw'), num: 1, r: function (r) { return amc(r.raw.withdrawal); }, c: function (r) { return r.raw.withdrawal; } },
      { h: t('c_unalloc'), num: 1, r: function (r) { return amc(r.raw.unallocated_amount); }, c: function (r) { return r.raw.unallocated_amount; } }, { h: t('c_ref'), r: function (r) { return txt(r.raw.reference_number); }, c: function (r) { return r.raw.reference_number; } }, { h: t('c_status'), r: function (r) { return bdg(r.status); }, c: function (r) { return r.status; } }];
    return h + panel(tr('Bank transactions', 'المعاملات البنكية'), regTable({ id: 't_bk', server: true, cols: cols, file: 'bank_transactions', pageSize: CFG.pageSize, loader: function (p, s, q) { var f = btF(); if (S.ap === 'approved') { f.push(['status', 'in', RECD]); } if (S.ap === 'pending') { f.push(['status', 'in', UNREC]); } return mergedLoader([{ dt: 'Bank Transaction', filters: f, or: q ? orQ('Bank Transaction', q) : orSearch('Bank Transaction') }], p, s); } }));
  }
  function tabAudit() {
    var filt = function (d) { return (!S.exType || d.id === S.exType) && (!S.exSev || d.sev === S.exSev); };
    var h = scopeNote('scope_audit') + chipRow('exSev', S.exSev, [['', tr('All severities', 'كل المستويات')], ['high', t('sev_high')], ['medium', t('sev_medium')], ['low', t('sev_low')]]) +
      chipRow('exType', S.exType, [['', tr('All checks', 'كل الفحوص')]].concat(EXC_DEFS.map(function (d) { return [d.id, t(d.label)]; })));
    var key = 'aud' + S.exType + S.exSev;
    var c = cell(key, function () { return excRows(filt).then(function (l) { if (l.length && l.every(function (x) { return x.err; })) { throw new Error(l[0].err); } return l; }); });
    var l = c.v || [];
    h += kpis([['k_ex_types', function () { return l.filter(function (x) { return x.count > 0; }).length; }], ['k_ex_high', function () { return excTotal(l.filter(function (x) { return x.d.sev === 'high'; })); }],
      ['k_ex_conf', function () { return excTotal(l.filter(function (x) { return x.conf === 'confirmed'; })); }], ['k_ex_ind', function () { return excTotal(l.filter(function (x) { return x.conf === 'indicative' && !x.err; })); }]]
      .map(function (k, i) { return kpi({ label: t(k[0]), dot: i === 1 ? 'var(--dms-bad)' : null, val: c.p ? '…' : c.e ? '—' : num(k[1]()) }); }));
    return h + panel(t('ex_register'), c.p ? skel(1, 'dms-skel-panel') : c.e ? alertBox('err', esc(c.e)) : regTable({ id: 't_exc', rows: l, cols: excCols(), sk: 'n', dir: -1, file: 'control_exceptions', text: function (r) { return t(r.d.label) + ' ' + r.basis; } }), '', esc(tr('Select a check to see its records. Indicative checks scan a capped sample.', 'اختر فحصًا لعرض سجلاته. الفحوص الإرشادية تفحص عينة محدودة.')));
  }
  function tabActions(AM) { return actionsTab(AM, tr('Action lists are as of today across all dates and follow the company filter.', 'قوائم الإجراءات حتى اليوم لكل التواريخ وتتبع مرشح الشركة.')); }

  start();
})();

/* ==== DM theme sync (same as tools/erp/shell/dark_theme.py output; maintained here since this block left the generated shell) ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync ==== */