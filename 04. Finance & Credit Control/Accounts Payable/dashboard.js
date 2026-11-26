/* ===== DM Group KSA — Accounts Payable Dashboard — SCRIPT field · v2 =====
   READ-ONLY. Balances come from the native "Accounts Payable" report (Due Date ageing, per company, as of the report
   date) and are reconciled with "Accounts Payable Summary"; activity from Purchase Invoice and Payment Entry; supplier
   attributes from Supplier. All through standard endpoints under the viewer's permissions.
   Built on the DM dashboard standard; the shared runtime between the "DMS kit" markers is generated from
   tools/erp/kit/dms-kit.js (edit the kit and run build_kit.py, not the copy). */
(function () {
  'use strict';
  var APP = {
    key: '__dmsAccountsPayable',
    period: 'month',
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'supplier', en: 'Suppliers', ar: 'الموردون' }, { id: 'ageing', en: 'Ageing', ar: 'الأعمار' },
      { id: 'invoices', en: 'Purchase invoices', ar: 'فواتير الشراء' }, { id: 'payments', en: 'Payments', ar: 'المدفوعات' },
      { id: 'exceptions', en: 'Exceptions', ar: 'الاستثناءات' }, { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', none: ['All ' + 'system-currency companies', 'كل شركات عملة النظام'], options: function () { return (REF.companies || []).map(function (c) { return { v: c.name, l: c.name + (c.default_currency !== CUR ? ' (' + c.default_currency + ')' : '') }; }); } },
      { k: 'supplier', en: 'Supplier', ar: 'المورد', options: function () { return supplierOptions(); }, label: function (v) { var m = REF.supM[v]; return m ? m.supplier_name || v : v; } },
      { k: 'group', en: 'Supplier group', ar: 'مجموعة الموردين', options: function () { return REF.groups || []; } },
      { k: 'loc', en: 'Local / foreign', ar: 'محلي / أجنبي', options: function () { return REF.locMissing ? [] : [{ v: 'local', l: t('loc_local') }, { v: 'foreign', l: t('loc_foreign') }, { v: 'unc', l: t('loc_unc') }]; } },
      { k: 'search', type: 'text', en: 'Search', ar: 'بحث', ph: ['Supplier, invoice, bill no.', 'مورد، فاتورة، رقم المورد'] }
    ],
    sources: ['ap', 'per', 'act'],
    dtLabels: { 'Purchase Invoice': ['Purchase invoice', 'فاتورة شراء'], 'Payment Entry': ['Payment', 'دفعة'], 'Journal Entry': ['Journal entry', 'قيد يومية'] },
    title: function () { return tr('Accounts payable', 'الذمم الدائنة'); },
    stamp: function () { return tr('Read-only · ', 'للقراءة فقط · ') + scopeCur() + ' · ' + t('asofL') + ' ' + asOf(); },
    filterNote: function () { return tr('Without a company, totals cover companies in ' + CUR + ' only (no currency is added to another). Supplier, group and local/foreign filters use the Supplier list.', 'بدون شركة تشمل الإجماليات شركات ' + CUR + ' فقط. مرشحات المورد والمجموعة ومحلي/أجنبي تستخدم قائمة الموردين.'); },
    periodNote: function () { return tr('Balances and ageing are as of the period end (capped at today). Invoices posted and payments made use the whole period.', 'الأرصدة والأعمار كما في نهاية الفترة (حتى اليوم كحد أقصى). الفواتير والمدفوعات تشمل الفترة كاملة.'); },
    boot: function (chk) { return loadRef(chk); },
    load: function () { loadAll(); },
    onTab: function (id) { if (id === 'invoices') { loadPiKpis(); } if (id === 'payments') { loadWf(); } },
    actSpecs: function () { return actSpecs(); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return banners(); },
    content: function (tb, AM) { return { overview: renderOverview, supplier: renderSupplier, ageing: renderAgeing, invoices: renderInvoices, payments: renderPayments, exceptions: renderExceptions, actions: renderActions }[tb](AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v) {
      if (a === 'pis') { PIS[v.split(':')[0]] = v.split(':')[1]; delete SS.t_pi; renderSoft(); return true; }
      if (a === 'pes') { PES = v; delete SS.t_pe; renderSoft(); return true; }
      if (a === 'exs') { var p = v.split(':'); EXF[p[0]] = EXF[p[0]] === p[1] ? '' : p[1]; delete TS.t_ex; renderSoft(); return true; }
      if (a === 'kpi' && v.indexOf('co:') === 0) { F.company = F.company === v.slice(3) ? '' : v.slice(3); reload(); return true; }
      return false;
    },
    onInput: function (n) {
      var r = n.getAttribute('data-rule'); if (!r) { return false; }
      var x = parseFloat(n.value); if (!isNaN(x) && x >= 0) { RULES[r] = x; delete TS.t_ex; later(renderSoft, 0); }
      return true;
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

  var PI = 'Purchase Invoice', PE = 'Payment Entry', SU = 'Supplier';
  var REF = { companies: null, groups: [], supM: {}, locMissing: false, supFail: false };
  var RULES = { warn: 90, crit: 120, old: 365, large: 10, unalloc: 30, term: 365, tol: 0.01 };
  var PIS = { status: '', due: '', posted: '' }, PES = 'sub', EXF = { type: '', sev: '' };
  var BC = ['var(--dms-age0)', 'var(--dms-age1)', 'var(--dms-age2)', 'var(--dms-age3)', 'var(--dms-age4)', 'var(--dms-age5)'];
  var L = {
    asofL: ['AP as of', 'الذمم كما في'], loc_local: ['Local', 'محلي'], loc_foreign: ['Foreign', 'أجنبي'], loc_unc: ['Unclassified', 'غير مصنف'],
    bk0: ['Not yet due', 'لم يحن'], bk1: ['1–30 days', '1–30 يومًا'], bk2: ['31–60 days', '31–60 يومًا'], bk3: ['61–90 days', '61–90 يومًا'], bk4: ['91–120 days', '91–120 يومًا'], bk5: ['Over 120 days', 'أكثر من 120 يومًا'],
    sev_crit: ['Critical', 'حرج'], sev_warn: ['Warning', 'تحذير'], sev_info: ['Informational', 'معلومة'],
    x_over90: ['Overdue beyond warning days', 'تأخر يتجاوز حد التحذير'], x_large: ['Large outstanding supplier', 'مورد برصيد كبير'], x_adv: ['Supplier advance / credit', 'دفعة مقدمة / رصيد دائن'], x_neg: ['Negative net balance', 'رصيد صافي سالب'], x_unalloc: ['Unallocated payment', 'دفعة غير مخصصة'], x_recon: ['Reconciliation difference', 'فرق مطابقة'], x_due: ['Missing / questionable due date', 'تاريخ استحقاق مفقود / مشكوك'], x_inter: ['Intercompany supplier balance', 'رصيد مورد بين شركات المجموعة'], x_old: ['Unusually old unresolved item', 'عنصر قديم غير مسوى'],
    rule_over90: ['Supplier overdue over warning days: Warning; over critical days: Critical.', 'تأخر المورد أكثر من حد التحذير: تحذير؛ أكثر من الحد الحرج: حرج.'], rule_large: ['Supplier net outstanding at or above the share of its company total: Warning.', 'رصيد المورد الصافي يساوي أو يفوق النسبة من إجمالي شركته: تحذير.'], rule_adv: ['Credit / advance documents on a supplier account: Informational.', 'مستندات دائنة / دفعات مقدمة على حساب المورد: معلومة.'], rule_neg: ['Supplier whose net balance is negative: Warning.', 'مورد رصيده الصافي سالب: تحذير.'], rule_unalloc: ['Submitted payment with unallocated amount: Warning if older than parameter, else Informational.', 'دفعة معتمدة بمبلغ غير مخصص: تحذير إن تجاوزت المدة وإلا معلومة.'], rule_recon: ['Report totals differ beyond tolerance: Critical (Summary vs detail) / Warning (ageing buckets).', 'اختلاف إجماليات التقارير: حرج (الملخص مقابل التفصيل) / تحذير (شرائح الأعمار).'], rule_due: ['Invoice with missing due date, due before posting, or term beyond parameter: Warning.', 'فاتورة بلا تاريخ استحقاق أو قبل الترحيل أو مدة تتجاوز الحد: تحذير.'], rule_inter: ['Balances with suppliers flagged as internal (intercompany): Informational.', 'أرصدة موردين مصنفين كشركات داخلية: معلومة.'], rule_old: ['Open item older than the parameter: Critical.', 'بند مفتوح أقدم من الحد: حرج.'],
    r_warn: ['Overdue warning (days)', 'تحذير التأخر (أيام)'], r_crit: ['Overdue critical (days)', 'حرج التأخر (أيام)'], r_old: ['Unusually old item (days)', 'عنصر قديم جدا (أيام)'], r_large: ['Large supplier (% of company outstanding)', 'مورد كبير (% من رصيد الشركة)'], r_unalloc: ['Unallocated payment aged (days)', 'دفعة غير مخصصة متقادمة (أيام)'], r_term: ['Questionable credit term (days)', 'مدة ائتمان مشكوك بها (أيام)'], r_tol: ['Reconciliation tolerance', 'هامش المطابقة'],
    d_over: ['Overdue balance', 'رصيد متأخر'], d_large: ['of company outstanding', 'من رصيد الشركة'], d_adv: ['credit documents', 'مستندات دائنة'], d_neg: ['Net balance is negative', 'الرصيد الصافي سالب'], d_unalloc: ['Unallocated amount on payment', 'مبلغ غير مخصص في الدفعة'], d_sumdet: ['Summary report total vs detail report total', 'إجمالي الملخص مقابل إجمالي التفصيل'], d_bkt: ['Ageing 31+ days: ours vs native buckets', 'أعمار 31+ يوم: حسابنا مقابل التقرير الأصلي'], d_supdiff: ['Supplier balance: summary vs detail', 'رصيد المورد: الملخص مقابل التفصيل'], d_due_missing: ['Due date missing', 'تاريخ الاستحقاق مفقود'], d_due_before: ['Due date is before posting date', 'الاستحقاق قبل تاريخ الترحيل'], d_due_long: ['Credit term days', 'مدة الائتمان بالأيام'], d_inter: ['Intercompany balance', 'رصيد بين الشركات'], d_old: ['Open item age (days)', 'عمر البند المفتوح (أيام)'], days: ['days', 'يوم'],
    st_Paid: ['Paid', 'مسددة'], st_Unpaid: ['Unpaid', 'غير مسددة'], 'st_Partly Paid': ['Partly paid', 'مسددة جزئيا'], st_Overdue: ['Overdue', 'متأخرة'], st_Return: ['Return', 'مرتجع'], 'st_Debit Note Issued': ['Debit note issued', 'إشعار مدين صادر'], st_Draft: ['Draft', 'مسودة'], st_Submitted: ['Submitted', 'معتمد'], st_Cancelled: ['Cancelled', 'ملغى'],
    nogrp: ['(no group)', '(بدون مجموعة)']
  };
  function t(k) { var v = L[k]; return v ? v[LANG === 'ar' ? 1 : 0] : k; }

  /* ---------- scope: one currency per view ---------- */
  function scopeCos() {
    var cs = REF.companies || [];
    if (F.company) { return cs.filter(function (c) { return c.name === F.company; }).map(function (c) { return c.name; }); }
    var same = cs.filter(function (c) { return c.default_currency === CUR; }).map(function (c) { return c.name; });
    return same.length ? same : cs.slice(0, 1).map(function (c) { return c.name; });
  }
  function otherCos() { return F.company ? [] : (REF.companies || []).filter(function (c) { return scopeCos().indexOf(c.name) < 0; }).map(function (c) { return c.name + ' (' + c.default_currency + ')'; }); }
  function curOf(co) { var c = (REF.companies || []).filter(function (x) { return x.name === co; })[0]; return c ? c.default_currency : 'SAR'; }
  function scopeCur() { var s = scopeCos(); return s.length ? curOf(s[0]) : CUR; }
  function AF() { var r = clip(PERIOD); return { company: F.company, supplier: F.supplier, group: F.group, loc: F.loc, search: clean(F.search), from: r[0], to: r[1] > TODAY ? TODAY : r[1] }; }
  function asOf() { return AF().to; }
  /* Purchase Invoice balance in company currency: party-currency balances convert only from their own invoice currency. */
  function invoiceBalance(r){
   var target=curOf(r.company), party=r.party_account_currency;
   if(!party)throw new Error('Missing party account currency');
   if(party===target)return Number(r.outstanding_amount)||0;
   if(party!==r.currency || !(Number(r.conversion_rate)>0))throw new Error('Unsupported party currency conversion: '+party);
   return (Number(r.outstanding_amount)||0)*Number(r.conversion_rate);
  }

  /* ---------- loaders ---------- */
  function loadRef(chk) {
    return Promise.all([
      getList({ doctype: 'Company', fields: ['name', 'default_currency'], order_by: 'name asc', limit_page_length: 0 }, chk).then(function (r) { return r || []; }, function () { var dc = ''; try { dc = (frappe.defaults && frappe.defaults.get_user_default('Company')) || (frappe.boot.sysdefaults || {}).company || ''; } catch (x) { /* none */ } return dc ? [{ name: dc, default_currency: CUR }] : []; }),
      getList({ doctype: 'Supplier Group', fields: ['name'], order_by: 'name asc', limit_page_length: 0 }, chk).then(function (r) { return (r || []).map(function (x) { return x.name; }); }, function () { return []; }),
      getList({ doctype: SU, fields: ['name', 'supplier_name', 'supplier_group', 'is_internal_supplier', 'country', 'disabled', 'default_currency', 'custom_type_of_supplier_'], limit_page_length: 0 }, chk)
        .catch(function () { REF.locMissing = true; return getList({ doctype: SU, fields: ['name', 'supplier_name', 'supplier_group', 'is_internal_supplier', 'country', 'disabled', 'default_currency'], limit_page_length: 0 }, chk); })
        .catch(function () { REF.supFail = true; REF.locMissing = true; return []; })
    ]).then(function (r) { REF.companies = r[0]; REF.groups = r[1]; var m = {}; (r[2] || []).forEach(function (s) { m[s.name] = s; }); REF.supM = m; });
  }
  function pool(items, n, fn) {
    var out = new Array(items.length), i = 0;
    function next() { if (i >= items.length) { return Promise.resolve(); } var k = i++; return fn(items[k]).then(function (v) { out[k] = v; }).then(next); }
    var w = []; for (var j = 0; j < Math.min(n, items.length); j++) { w.push(next()); }
    return Promise.all(w).then(function () { return out; });
  }
  function loadAll() {
    var asof = asOf(), cos = scopeCos(), af = AF();
    run('ap', function (chk) {
      return pool(cos, 2, function (co) {
        return guarded(chk, 'frappe.desk.query_report.run', { report_name: 'Accounts Payable', ignore_prepared_report: true, filters: { company: co, report_date: asof, ageing_based_on: 'Due Date', range1: 30, range2: 60, range3: 90, range4: 120, group_by_party: 0 } }).then(function (m) {
          if (!m || !m.result) { throw new Error('Report returned no data (prepared report)'); }
          return { co: co, rows: m.result.filter(function (r) { return r && r.party; }).map(function (r) {
            var ref = r.due_date || r.posting_date;
            return { co: co, sup: r.party, name: r.supplier_name || r.party, grp: r.supplier_group || '', vt: r.voucher_type, vn: r.voucher_no, post: r.posting_date, due: r.due_date || null, bill: r.bill_no || '', inv: +r.invoiced || 0, paid: +r.paid || 0, cn: +r.credit_note || 0, out: +r.outstanding || 0, age: ref ? diffDays(String(ref).slice(0, 10), asof) : 0, nat: [+r.range1 || 0, +r.range2 || 0, +r.range3 || 0, +r.range4 || 0, +r.range5 || 0] };
          }) };
        }, function (e) { return { co: co, err: errKind(e) === 'perm' ? tr('permission denied', 'لا صلاحية') : (e.message || 'error') }; });
      }).then(function (res) {
        var list = [], ok = [], errs = [];
        res.forEach(function (r) { if (r.err) { errs.push(r.co + ': ' + r.err); } else { list = list.concat(r.rows); ok.push(r.co); } });
        if (!ok.length && errs.length) { var e = new Error(errs.join('; ')); e.status = /permission|صلاحية/.test(errs.join()) ? 403 : 500; throw e; }
        return { asof: asof, list: list, cos: ok, errs: errs };
      });
    });
    run('per', function (chk) {
      var start = winStart(af.from, af.to), co = [['company', 'in', cos]];
      return Promise.all([
        getList({ doctype: PI, fields: ['name', 'supplier', 'supplier_name', 'company', 'posting_date', 'base_grand_total', 'is_return'], filters: [['docstatus', '=', 1], ['posting_date', '>=', start], ['posting_date', '<=', af.to]].concat(co), limit_page_length: 0 }, chk),
        getList({ doctype: PE, fields: ['name', 'party', 'party_name', 'company', 'posting_date', 'base_paid_amount', 'unallocated_amount', 'mode_of_payment', 'reference_no', 'workflow_state'], filters: [['docstatus', '=', 1], ['payment_type', '=', 'Pay'], ['party_type', '=', 'Supplier'], ['posting_date', '>=', start], ['posting_date', '<=', af.to]].concat(co), limit_page_length: 0 }, chk)
      ]).then(function (a) { return { pi: a[0] || [], pe: a[1] || [] }; });
    });
    run('sum', function (chk) {
      return pool(cos, 2, function (co) {
        return guarded(chk, 'frappe.desk.query_report.run', { report_name: 'Accounts Payable Summary', ignore_prepared_report: true, filters: { company: co, report_date: asof, ageing_based_on: 'Due Date', range1: 30, range2: 60, range3: 90, range4: 120 } }).then(function (m) {
          if (!m || !m.result) { throw new Error('Summary returned no data'); }
          var map = {}, tot = 0; m.result.forEach(function (r) { if (!r.party) { return; } map[r.party] = { out: +r.outstanding || 0, adv: +r.advance || 0 }; tot += +r.outstanding || 0; });
          return { co: co, map: map, total: tot };
        }, function (e) { return { co: co, err: e.message || 'error' }; });
      }).then(function (res) { var sums = {}, errs = []; res.forEach(function (r) { if (r.err) { errs.push(r.co + ': ' + r.err); } else { sums[r.co] = r; } }); return { sums: sums, errs: errs }; });
    });
    loadActions(actSpecs());
    if (tab === 'invoices') { loadPiKpis(); }
    if (tab === 'payments') { loadWf(); }
  }
  function winStart(from, to) { var m0 = addMonths(monthStart(to), -11); return from < m0 ? from : m0; }
  function piBase() { var lf = listFilters('supplier'); return lf ? [[PI, 'docstatus', '=', 1]].concat(lf.map(function (f) { return [PI].concat(f); })) : null; }
  function loadPiKpis() {
    if (D.pik || D.pikTok) { return; }
    run('pik', function (chk) {
      var b = piBase(), af = AF(); if (!b) { return Promise.resolve({ sub: 0, unpaid: 0, part: 0, over: 0, soon: 0 }); }
      var c = function (x) { return getCount(PI, b.concat(x), chk); };
      return Promise.all([c([[PI, 'is_return', '=', 0], [PI, 'posting_date', 'between', [af.from, af.to]]]), c([[PI, 'status', '=', 'Unpaid']]), c([[PI, 'status', '=', 'Partly Paid']]), c([[PI, 'status', '=', 'Overdue']]), c([[PI, 'is_return', '=', 0], [PI, 'outstanding_amount', '>', 0], [PI, 'due_date', 'between', [TODAY, addDays(TODAY, 7)]]])])
        .then(function (r) { return { sub: r[0], unpaid: r[1], part: r[2], over: r[3], soon: r[4] }; });
    });
  }
  function loadWf() {
    if (D.wf || D.wfTok) { return; }
    run('wf', function (chk) {
      var f = [[PE, 'docstatus', '=', 0], [PE, 'payment_type', '=', 'Pay'], [PE, 'party_type', '=', 'Supplier'], [PE, 'company', 'in', scopeCos()]];
      return getList({ doctype: PE, fields: ['workflow_state', 'count(name) as c', 'sum(base_paid_amount) as amt'], filters: f, group_by: 'workflow_state', limit_page_length: 0 }, chk).then(function (r) { return r || []; });
    });
  }

  /* ---------- model (kept from v1) ---------- */
  function bk(age) { return age <= 0 ? 0 : age <= 30 ? 1 : age <= 60 ? 2 : age <= 90 ? 3 : age <= 120 ? 4 : 5; }
  function supMeta(id) { return REF.supM[id] || null; }
  function locOf(id) { if (REF.locMissing) { return 'na'; } var m = supMeta(id), v = m && m.custom_type_of_supplier_; return v === 'Local' ? 'local' : v === 'Foreign' ? 'foreign' : 'unc'; }
  function isInter(id) { var m = supMeta(id); return !!(m && m.is_internal_supplier); }
  function supMatch(id, nm, f) {
    if (f.supplier && id !== f.supplier && nm !== f.supplier) { return false; }
    if (f.group) { var m = supMeta(id); if (!m || m.supplier_group !== f.group) { return false; } }
    if (f.loc && locOf(id) !== f.loc) { return false; }
    return true;
  }
  function textMatch(s, f) { if (!f.search) { return true; } var q = f.search.toLowerCase(); return s.some(function (x) { return x && String(x).toLowerCase().indexOf(q) >= 0; }); }
  function apRows(skipCo) { var out = [], f = AF(); if (!D.ap) { return out; } D.ap.list.forEach(function (r) { if (!skipCo && f.company && r.co !== f.company) { return; } if (!supMatch(r.sup, r.name, f)) { return; } if (!textMatch([r.name, r.sup, r.vn, r.bill], f)) { return; } out.push(r); }); return out; }
  function agg(rows) { var a = { net: 0, over: 0, nd: 0, cr: 0, gross: 0, b: [0, 0, 0, 0, 0, 0], bp: [0, 0, 0, 0, 0, 0], bn: [0, 0, 0, 0, 0, 0] }; rows.forEach(function (r) { a.net += r.out; var i = bk(r.age); a.b[i] += r.out; if (r.out > 0) { a.gross += r.out; a.bp[i] += r.out; if (r.age > 0) { a.over += r.out; } else { a.nd += r.out; } } else if (r.out < 0) { a.cr += r.out; a.bn[i] += r.out; } }); return a; }
  function bySup(rows) {
    var m = {};
    rows.forEach(function (r) {
      var k = r.co + '|' + r.sup, s = m[k] || (m[k] = { key: k, co: r.co, sup: r.sup, name: r.name, grp: r.grp, rows: [], net: 0, over: 0, nd: 0, cr: 0, oldest: null, maxOver: 0, b: [0, 0, 0, 0, 0, 0], bp: [0, 0, 0, 0, 0, 0] });
      s.rows.push(r); s.net += r.out; s.b[bk(r.age)] += r.out;
      if (r.out > 0) { s.bp[bk(r.age)] += r.out; if (r.age > 0) { s.over += r.out; if (r.age > s.maxOver) { s.maxOver = r.age; } } else { s.nd += r.out; } if (!s.oldest || r.post < s.oldest) { s.oldest = r.post; } } else if (r.out < 0) { s.cr += r.out; }
    });
    return vals(m);
  }
  function perRows(kind) { var out = [], f = AF(); if (!D.per) { return out; } (D.per[kind] || []).forEach(function (r) { var sid = kind === 'pi' ? r.supplier : r.party, nm = kind === 'pi' ? r.supplier_name : r.party_name; if (f.company && r.company !== f.company) { return; } if (!supMatch(sid, nm, f)) { return; } if (!textMatch([sid, nm, r.name, r.reference_no], f)) { return; } out.push(r); }); return out; }
  function inRange(d) { var f = AF(); return d >= f.from && d <= f.to; }
  function periodStats() { var pi = perRows('pi').filter(function (r) { return !r.is_return && inRange(r.posting_date); }), pe = perRows('pe').filter(function (r) { return inRange(r.posting_date); }); return { pi: pi, pe: pe, piSum: sum(pi, function (r) { return r.base_grand_total; }), peSum: sum(pe, function (r) { return r.base_paid_amount; }) }; }
  function monthly() { var ms = monthList(addMonths(monthStart(asOf()), -11), asOf()), inv = {}, pay = {}; ms.forEach(function (m) { inv[m] = 0; pay[m] = 0; }); perRows('pi').forEach(function (r) { if (r.is_return) { return; } var m = String(r.posting_date).slice(0, 7); if (m in inv) { inv[m] += r.base_grand_total || 0; } }); perRows('pe').forEach(function (r) { var m = String(r.posting_date).slice(0, 7); if (m in pay) { pay[m] += r.base_paid_amount || 0; } }); return { ms: ms, inv: inv, pay: pay }; }
  function resolveSup(v) { if (!v) { return ''; } if (REF.supM[v]) { return v; } var h = Object.keys(REF.supM).filter(function (id) { return REF.supM[id].supplier_name === v; })[0]; return h || v; }
  function listFilters(sup) {
    var f = AF(), flt = [['company', 'in', scopeCos()]];
    if (f.supplier) { flt.push([sup, '=', resolveSup(f.supplier)]); }
    if (f.group || f.loc) { var ids = Object.keys(REF.supM).filter(function (id) { return supMatch(id, '', { supplier: '', group: f.group, loc: f.loc }); }); if (!ids.length) { return null; } flt.push([sup, 'in', ids]); }
    return flt;
  }
  var SEVO = { crit: 0, warn: 1, info: 2 };
  function buildExceptions() {
    var R = RULES, out = []; if (!D.ap) { return out; } var rows = apRows(), asof = asOf(), sl = bySup(rows), f = AF();
    var coNet = {}; D.ap.list.forEach(function (r) { coNet[r.co] = (coNet[r.co] || 0) + r.out; });
    sl.forEach(function (s) {
      var ov = 0, mx = 0; s.rows.forEach(function (r) { if (r.out > 0 && r.age > R.warn) { ov += r.out; if (r.age > mx) { mx = r.age; } } });
      if (ov > 0) { out.push({ type: 'over90', co: s.co, sup: s.sup, name: s.name, ref: null, amt: ov, days: mx, sev: mx > R.crit ? 'crit' : 'warn', detail: t('d_over') + ' > ' + R.warn + ' ' + t('days') }); }
      var tn = coNet[s.co] || 0; if (s.net > 0 && tn > 0 && s.net / tn * 100 >= R.large) { out.push({ type: 'large', co: s.co, sup: s.sup, name: s.name, ref: null, amt: s.net, days: s.maxOver, sev: 'warn', detail: (s.net / tn * 100).toFixed(1) + '% ' + t('d_large') }); }
      if (s.cr < 0) { out.push({ type: 'adv', co: s.co, sup: s.sup, name: s.name, ref: null, amt: s.cr, days: null, sev: 'info', detail: s.rows.filter(function (r) { return r.out < 0; }).length + ' ' + t('d_adv') }); }
      if (s.net < 0) { out.push({ type: 'neg', co: s.co, sup: s.sup, name: s.name, ref: null, amt: s.net, days: null, sev: 'warn', detail: t('d_neg') }); }
      if (isInter(s.sup) && Math.abs(s.net) > R.tol) { out.push({ type: 'inter', co: s.co, sup: s.sup, name: s.name, ref: null, amt: s.net, days: s.maxOver || null, sev: 'info', detail: t('d_inter') }); }
    });
    rows.forEach(function (r) {
      if (r.out > 0 && r.age > R.old) { out.push({ type: 'old', co: r.co, sup: r.sup, name: r.name, ref: { dt: r.vt, name: r.vn }, amt: r.out, days: r.age, sev: 'crit', detail: t('d_old') + ': ' + r.age }); }
      if (r.vt === PI) { var dd = null; if (!r.due) { dd = t('d_due_missing'); } else if (r.due < r.post) { dd = t('d_due_before') + ' (' + r.post + ' / ' + r.due + ')'; } else if (diffDays(r.post, r.due) > R.term) { dd = t('d_due_long') + ': ' + diffDays(r.post, r.due); }
        if (dd) { out.push({ type: 'due', co: r.co, sup: r.sup, name: r.name, ref: { dt: r.vt, name: r.vn }, amt: r.out, days: r.age, sev: 'warn', detail: dd }); } }
    });
    perRows('pe').forEach(function (r) { var u = r.unallocated_amount || 0; if (u > R.tol) { var d = diffDays(String(r.posting_date).slice(0, 10), asof); out.push({ type: 'unalloc', co: r.company, sup: r.party, name: r.party_name || r.party, ref: { dt: PE, name: r.name }, amt: u, days: d, sev: d > R.unalloc ? 'warn' : 'info', detail: t('d_unalloc') }); } });
    var cos = {}; D.ap.list.forEach(function (r) { if (f.company && r.co !== f.company) { return; } (cos[r.co] = cos[r.co] || []).push(r); });
    Object.keys((D.sum && D.sum.sums) || {}).forEach(function (co) {
      if (f.company && co !== f.company) { return; }
      var sm = D.sum.sums[co], rs = cos[co] || [], det = sum(rs, function (r) { return r.out; });
      if (Math.abs(det - sm.total) > R.tol) { out.push({ type: 'recon', co: co, sup: '', name: '', ref: null, amt: det - sm.total, days: null, sev: 'crit', detail: t('d_sumdet') + ': ' + amt(sm.total) + ' / ' + amt(det) }); }
      var g2 = agg(rs), nh = 0; rs.forEach(function (r) { nh += r.nat[1] + r.nat[2] + r.nat[3] + r.nat[4]; }); var mine = g2.b[2] + g2.b[3] + g2.b[4] + g2.b[5];
      if (Math.abs(mine - nh) > R.tol) { out.push({ type: 'recon', co: co, sup: '', name: '', ref: null, amt: mine - nh, days: null, sev: 'warn', detail: t('d_bkt') + ': ' + amt(mine) + ' / ' + amt(nh) }); }
      var dm = {}; rs.forEach(function (r) { dm[r.sup] = (dm[r.sup] || 0) + r.out; }); var ids = {}; Object.keys(dm).forEach(function (k) { ids[k] = 1; }); Object.keys(sm.map).forEach(function (k) { ids[k] = 1; });
      Object.keys(ids).forEach(function (k) { var dv = dm[k] || 0, sv2 = sm.map[k] ? sm.map[k].out : 0; if (Math.abs(dv - sv2) > R.tol) { var m = supMeta(k); if (!supMatch(k, m ? m.supplier_name : '', f)) { return; } out.push({ type: 'recon', co: co, sup: k, name: m ? m.supplier_name : k, ref: null, amt: dv - sv2, days: null, sev: 'warn', detail: t('d_supdiff') + ': ' + amt(sv2) + ' / ' + amt(dv) }); } });
    });
    return out;
  }
  function supplierOptions() { var ids = {}; if (D.ap) { D.ap.list.forEach(function (r) { ids[r.sup] = r.name; }); } else { Object.keys(REF.supM).forEach(function (k) { ids[k] = REF.supM[k].supplier_name || k; }); } return Object.keys(ids).map(function (k) { return { v: k, l: ids[k] }; }).sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); }); }

  /* ---------- actions pending ---------- */
  function actSpecs() {
    var pf = [[PE, 'payment_type', '=', 'Pay'], [PE, 'party_type', '=', 'Supplier'], [PE, 'company', 'in', scopeCos()]];
    if (F.supplier) { pf.push([PE, 'party', '=', resolveSup(F.supplier)]); }
    var peTable = function () { return { fields: ['name', 'party', 'party_name', 'company', 'posting_date', 'base_paid_amount', 'unallocated_amount', 'mode_of_payment', 'reference_no', 'workflow_state', 'docstatus'], cols: peCols(true), search: ['name', 'party_name', 'reference_no'] }; };
    return [
      { id: 'a_long', client: true, short: tr('Overdue > 90 days', 'متأخر > 90 يومًا'), title: tr('Supplier balances overdue more than 90 days', 'أرصدة موردين متأخرة أكثر من 90 يومًا'), why: tr('Open items from the Accounts Payable report, due more than 90 days ago. Largest first.', 'بنود مفتوحة من تقرير الذمم الدائنة، استحقت قبل أكثر من 90 يومًا. الأكبر أولًا.') },
      { id: 'a_wf', server: true, dt: PE, short: tr('Payments awaiting approval', 'دفعات بانتظار الاعتماد'), title: tr('Supplier payments awaiting approval', 'مدفوعات موردين بانتظار الاعتماد'), why: tr('Draft Payment Entries (type Pay) in the approval workflow.', 'قيود دفع مسودة (دفع) في مسار الاعتماد.'),
        filters: pf.concat([[PE, 'docstatus', '=', 0]]), order: 'posting_date asc', fields: ['name', 'party_name', 'company', 'posting_date', 'base_paid_amount', 'workflow_state', 'owner'], table: peTable,
        it: function (r) { return { p: 'high', score: score('high', r.base_paid_amount, ageOf(r.posting_date)) - 20, title: r.party_name || r.name, desc: r.name + ' · ' + moneyFull(r.base_paid_amount, curOf(r.company)), who: r.workflow_state || r.owner, due: agoTxt(r.posting_date, 'Waiting', 'منذ'), tone: 'warn' }; } },
      { id: 'a_due7', client: true, short: tr('Due in 7 days', 'مستحق خلال 7 أيام'), title: tr('Supplier items due in the next 7 days', 'بنود موردين تستحق خلال 7 أيام'), why: tr('Plan the payment run. Largest first.', 'خطط لدفعة السداد. الأكبر أولًا.') },
      { id: 'a_od', client: true, short: tr('Overdue 1–90 days', 'متأخر 1–90 يومًا'), title: tr('Supplier balances overdue up to 90 days', 'أرصدة موردين متأخرة حتى 90 يومًا'), why: tr('Pay or agree new dates before they age further.', 'سدد أو اتفق على مواعيد جديدة قبل أن تتقادم.') },
      { id: 'a_unalloc', server: true, dt: PE, short: tr('Unallocated payments', 'دفعات غير مخصصة'), title: tr('Supplier payments with an unallocated amount', 'مدفوعات موردين بمبلغ غير مخصص'), why: tr('Submitted payments not matched to invoices: allocate or reconcile.', 'دفعات معتمدة غير مطابقة للفواتير: خصصها أو طابقها.'),
        filters: pf.concat([[PE, 'docstatus', '=', 1], [PE, 'unallocated_amount', '>', RULES.tol]]), order: 'posting_date asc', fields: ['name', 'party_name', 'company', 'posting_date', 'unallocated_amount', 'owner'], table: peTable,
        it: function (r) { return { p: ageOf(r.posting_date) > RULES.unalloc ? 'med' : 'low', score: score(ageOf(r.posting_date) > RULES.unalloc ? 'med' : 'low', r.unallocated_amount, ageOf(r.posting_date)), title: r.party_name || r.name, desc: r.name + ' · ' + moneyFull(r.unallocated_amount, curOf(r.company)) + ' ' + tr('unallocated', 'غير مخصص'), who: r.owner, due: agoTxt(r.posting_date, 'Paid', 'منذ'), tone: 'n' }; } },
      { id: 'a_due', client: true, short: tr('Questionable due dates', 'تواريخ استحقاق مشكوك بها'), title: tr('Invoices with a missing or questionable due date', 'فواتير بتاريخ استحقاق مفقود أو مشكوك به'), why: tr('Due date missing, before posting, or a credit term beyond ' + RULES.term + ' days. Fix the invoice so ageing is right.', 'تاريخ استحقاق مفقود أو قبل الترحيل أو مدة تتجاوز ' + RULES.term + ' يومًا. صحح الفاتورة لتصح الأعمار.') }
    ];
  }
  function actClient() {
    if (D.apErr) { return 'ERR:' + D.apErr; } if (!D.ap) { return null; }
    var rows = apRows(), byOut = function (a, b) { return b.out - a.out; };
    var item = function (p, tone) { return function (r) { return { p: p, score: score(p, r.out, Math.max(0, r.age)), dt: r.vt, name: r.vn, title: r.name, desc: r.vn + (r.bill ? ' (' + r.bill + ')' : '') + ' · ' + moneyFull(r.out, curOf(r.co)), who: r.co, due: r.due ? lateTxt(r.due) : '', tone: tone }; }; };
    return {
      a_long: { rows: rows.filter(function (r) { return r.out > 0 && r.age > 90; }).sort(byOut), item: item('high', 'bad') },
      a_due7: { rows: rows.filter(function (r) { return r.out > 0 && r.age <= 0 && r.age >= -7; }).sort(byOut), item: item('med', 'warn') },
      a_od: { rows: rows.filter(function (r) { return r.out > 0 && r.age > 0 && r.age <= 90; }).sort(byOut), item: item('med', 'warn') },
      a_due: { rows: buildExceptions().filter(function (x) { return x.type === 'due'; }).map(function (x) { return apRows().filter(function (r) { return r.vn === x.ref.name; })[0] || null; }).filter(Boolean), item: item('low', 'n') }
    };
  }

  /* ---------- columns ---------- */
  function supBtn(id, name) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="sup:' + esc(id) + '"><bdi>' + esc(name || id) + '</bdi></button>'; }
  function amtc(v) { return v == null ? '<span class="dms-sm">—</span>' : '<span class="dms-num' + (v < 0 ? ' dms-tone-n' : '') + '">' + esc(amt(v)) + '</span>'; }
  function ageTxt(r) { return r.age > 0 ? overdueTag(r.due || r.post) : (r.out > 0 && r.age < 0 ? '<span class="dms-sm">' + esc(tr('due in ', 'يستحق بعد ') + daysTxt(-r.age)) + '</span>' : '<span class="dms-sm">—</span>'); }
  function docCols(noSup) {
    var c = [
      { k: 'name', h: tr('Supplier', 'المورد'), s: function (r) { return r.name; }, r: function (r) { return supBtn(r.sup, r.name); }, c: function (r) { return r.name; } },
      { k: 'co', h: tr('Company', 'الشركة'), s: function (r) { return r.co; }, r: function (r) { return bdi(r.co); }, c: function (r) { return r.co; } },
      { k: 'vn', h: tr('Document', 'المستند'), s: function (r) { return r.vn; }, r: function (r) { return docLink(r.vt, r.vn); }, c: function (r) { return r.vn; } },
      { k: 'bill', h: tr('Supplier bill no.', 'رقم فاتورة المورد'), r: function (r) { return txt(r.bill); }, c: function (r) { return r.bill; } },
      { k: 'post', h: tr('Posting date', 'تاريخ الترحيل'), s: function (r) { return r.post; }, r: function (r) { return dtc(r.post); }, c: function (r) { return r.post; } },
      { k: 'due', h: tr('Due date', 'تاريخ الاستحقاق'), s: function (r) { return r.due || ''; }, r: function (r) { return dtc(r.due); }, c: function (r) { return r.due; } },
      { k: 'out', h: tr('Outstanding', 'القائم'), num: 1, s: function (r) { return r.out; }, r: function (r) { return amtc(r.out); }, c: function (r) { return r.out; } },
      { k: 'age', h: tr('Days overdue', 'أيام التأخير'), num: 1, s: function (r) { return r.age; }, r: ageTxt, c: function (r) { return r.age; } }
    ];
    return noSup ? c.slice(1) : c;
  }
  function docSpec(id, rows, extra) { return Object.assign({ id: id, rows: rows, cols: docCols(), text: function (r) { return [r.name, r.sup, r.vn, r.bill, r.co].join(' '); }, sk: 'out', dir: -1, file: 'ap_documents' }, extra || {}); }
  function supAggCols() {
    return [
      { k: 'name', h: tr('Supplier', 'المورد'), s: function (r) { return r.name; }, r: function (r) { return supBtn(r.sup, r.name); }, c: function (r) { return r.name; } },
      { k: 'co', h: tr('Company', 'الشركة'), s: function (r) { return r.co; }, r: function (r) { return bdi(r.co); }, c: function (r) { return r.co; } },
      { k: 'grp', h: tr('Supplier group', 'مجموعة الموردين'), s: function (r) { return r.grp; }, r: function (r) { var m = supMeta(r.sup); return txt(r.grp || (m && m.supplier_group)); }, c: function (r) { return r.grp; } },
      { k: 'loc', h: tr('Local / foreign', 'محلي / أجنبي'), r: function (r) { var l = locOf(r.sup); return l === 'na' ? '<span class="dms-sm">—</span>' : esc(t('loc_' + l)); }, c: function (r) { return locOf(r.sup); } },
      { k: 'net', h: tr('Total outstanding', 'إجمالي القائم'), num: 1, s: function (r) { return r.net; }, r: function (r) { return '<b class="dms-num">' + esc(amt(r.net)) + '</b>'; }, c: function (r) { return r.net; } },
      { k: 'over', h: tr('Overdue', 'متأخر'), num: 1, s: function (r) { return r.over; }, r: function (r) { return r.over ? '<span class="dms-num dms-tone-bad">' + esc(amt(r.over)) + '</span>' : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.over; } },
      { k: 'nd', h: tr('Not yet due', 'غير مستحق'), num: 1, s: function (r) { return r.nd; }, r: function (r) { return amtc(r.nd || null); }, c: function (r) { return r.nd; } },
      { k: 'cr', h: tr('Advance / credit', 'دفعة مقدمة / دائن'), num: 1, s: function (r) { return r.cr; }, r: function (r) { return amtc(r.cr || null); }, c: function (r) { return r.cr; } },
      { k: 'oldest', h: tr('Oldest unpaid', 'أقدم غير مسدد'), s: function (r) { return r.oldest || ''; }, r: function (r) { return dtc(r.oldest); }, c: function (r) { return r.oldest; } },
      { k: 'maxOver', h: tr('Max days overdue', 'أقصى أيام تأخير'), num: 1, s: function (r) { return r.maxOver; }, r: function (r) { return r.maxOver ? '<span class="dms-days ' + (r.maxOver > 90 ? 'dms-days-bad' : 'dms-days-warn') + '">' + num(r.maxOver) + '</span>' : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.maxOver; } }
    ];
  }
  function supSpec(id, list, extra) { return Object.assign({ id: id, rows: list, cols: supAggCols(), text: function (r) { return [r.name, r.sup, r.co, r.grp].join(' '); }, sk: 'net', dir: -1, file: 'ap_suppliers' }, extra || {}); }
  function piCols() { return [linkCol(tr('Purchase invoice', 'فاتورة الشراء'), PI, 'name'), { h: tr('Supplier', 'المورد'), sf: 'supplier_name', r: function (r) { return supBtn(r.supplier, r.supplier_name || r.supplier); }, c: function (r) { return r.supplier_name; } }, col(tr('Company', 'الشركة'), 'company'), col(tr('Posting date', 'تاريخ الترحيل'), 'posting_date', { fmt: dtc }), col(tr('Amount', 'المبلغ'), 'base_grand_total', { num: 1, fmt: amc })]; }
  function peCols(withState) {
    var c = [linkCol(tr('Payment', 'الدفعة'), PE, 'name'), { h: tr('Supplier', 'المورد'), sf: 'party_name', r: function (r) { return supBtn(r.party, r.party_name || r.party); }, c: function (r) { return r.party_name; } }, col(tr('Company', 'الشركة'), 'company'), col(tr('Posting date', 'تاريخ الترحيل'), 'posting_date', { fmt: dtc }),
      col(tr('Amount', 'المبلغ'), 'base_paid_amount', { num: 1, fmt: amc }), col(tr('Unallocated', 'غير مخصص'), 'unallocated_amount', { num: 1, fmt: function (v) { return +v ? '<span class="dms-num dms-tone-warn">' + esc(amt(v)) + '</span>' : '<span class="dms-sm">—</span>'; } }), col(tr('Mode', 'طريقة الدفع'), 'mode_of_payment'), col(tr('Reference', 'المرجع'), 'reference_no', { sort: false })];
    if (withState) { c.push({ h: tr('Status', 'الحالة'), sf: 'workflow_state', r: function (r) { var st = r.workflow_state || ['Draft', 'Submitted', 'Cancelled'][r.docstatus || 0]; return stat(r.docstatus === 1 ? 'ok' : 'warn', st); }, c: function (r) { return r.workflow_state; } }); }
    return c;
  }
  function clientCols(cols) { return cols.map(function (c) { return c.k ? c : Object.assign({ k: c.sf || c.h, s: c.sf ? function (r) { return r[c.sf]; } : null }, c); }); }

  /* ---------- drill-downs ---------- */
  function drill(id) {
    if (!D.ap) { return null; }
    var av = tr('As of ', 'كما في ') + asOf(), rows = apRows();
    if (id.indexOf('sup:') === 0) { return supplierPanel(id.slice(4)); }
    if (id.indexOf('bk:') === 0) { var i = +id.slice(3); return { title: t('bk' + i), sub: av, link: ['query-report', 'Accounts Payable', tr('Open the Accounts Payable report', 'فتح تقرير الذمم الدائنة')], spec: docSpec('drill', rows.filter(function (r) { return bk(r.age) === i; })) }; }
    if (id === 'ap:all') { return { title: tr('All open documents', 'كل المستندات المفتوحة'), sub: av, spec: docSpec('drill', rows) }; }
    if (id === 'ap:over') { return { title: tr('Overdue documents', 'المستندات المتأخرة'), sub: av, spec: docSpec('drill', rows.filter(function (r) { return r.out > 0 && r.age > 0; })) }; }
    if (id === 'ap:cr') { return { title: tr('Supplier advances and credits', 'دفعات مقدمة وأرصدة دائنة'), sub: av, spec: docSpec('drill', rows.filter(function (r) { return r.out < 0; })) }; }
    if (id === 'ap:due7') { return { title: tr('Due in the next 7 days', 'مستحق خلال 7 أيام'), sub: av, spec: docSpec('drill', rows.filter(function (r) { return r.out > 0 && r.age <= 0 && r.age >= -7; })) }; }
    if (id === 'ap:up30') { return { title: tr('Upcoming payments (next 30 days)', 'مدفوعات قادمة (30 يومًا)'), sub: av, spec: docSpec('drill', rows.filter(function (r) { return r.out > 0 && r.age <= 0 && r.age >= -30; })) }; }
    if (id === 'per:pi' || id === 'per:pe' || id === 'per:unalloc' || id.indexOf('mon:') === 0) {
      var ps = periodStats(), kind = id === 'per:pi' || id.indexOf('mon:pi') === 0 ? 'pi' : 'pe', list = kind === 'pi' ? ps.pi : ps.pe;
      if (id.indexOf('mon:') === 0) { var m = id.split(':')[2]; list = perRows(kind).filter(function (r) { return String(r.posting_date).slice(0, 7) === m && (kind !== 'pi' || !r.is_return); }); }
      if (id === 'per:unalloc') { list = ps.pe.filter(function (r) { return (r.unallocated_amount || 0) > RULES.tol; }); }
      return { title: kind === 'pi' ? tr('Purchase invoices posted', 'فواتير الشراء المرحلة') : tr('Supplier payments', 'مدفوعات الموردين'), sub: rangeLabel([AF().from, AF().to]), spec: { rows: list, cols: clientCols(kind === 'pi' ? piCols() : peCols()), text: function (r) { return [r.name, r.supplier_name, r.party_name, r.company, r.reference_no].join(' '); }, sk: 'posting_date', dir: -1, file: kind === 'pi' ? 'purchase_invoices' : 'supplier_payments' } };
    }
    if (id.indexOf('cli:') === 0) {
      var s = actSpecs().filter(function (x) { return x.id === id.slice(4); })[0], c = actClient(); if (!s || !c || typeof c === 'string') { return null; }
      return { title: s.title, sub: s.why, spec: docSpec('drill', c[s.id].rows, { file: s.id }) };
    }
    if (id === 'act:active') { return { title: tr('Suppliers with balances', 'موردون بأرصدة'), sub: av, spec: supSpec('drill', bySup(rows).filter(function (s) { return s.net > 0.005; })) }; }
    return null;
  }
  function supplierPanel(id) {
    var rows = D.ap.list.filter(function (r) { return r.sup === id && scopeCos().indexOf(r.co) >= 0 && (!F.company || r.co === F.company); }), g = agg(rows), m = supMeta(id) || {}, cur = scopeCur();
    var cos = uniq(rows.map(function (r) { return r.co; })), name = (rows[0] && rows[0].name) || m.supplier_name || id;
    var info = '<div class="dms-facts">' + [[tr('Supplier group', 'مجموعة الموردين'), m.supplier_group], [tr('Local / foreign', 'محلي / أجنبي'), REF.locMissing ? '—' : t('loc_' + (locOf(id) === 'na' ? 'unc' : locOf(id)))], [tr('Country', 'الدولة'), m.country], [tr('Currency', 'العملة'), m.default_currency], [tr('Intercompany', 'بين شركات المجموعة'), isInter(id) ? tr('Yes', 'نعم') : tr('No', 'لا')], [tr('Companies', 'الشركات'), cos.join(', ')]]
      .map(function (x) { return '<div><span class="dms-sm">' + esc(x[0]) + '</span><b>' + bdi(x[1] || '—') + '</b></div>'; }).join('') + '</div>';
    var body = info + kpis([kpi({ label: tr('Total outstanding', 'إجمالي القائم'), val: cur$(g.net, cur) }), kpi({ label: tr('Overdue', 'متأخر'), dot: 'var(--dms-bad)', val: cur$(g.over, cur) }), kpi({ label: tr('Not yet due', 'غير مستحق'), val: cur$(g.nd, cur) }), kpi({ label: tr('Advance / credit', 'دفعة مقدمة / دائن'), val: cur$(g.cr, cur) })]) +
      panel(tr('Ageing', 'الأعمار'), shareList([0, 1, 2, 3, 4, 5].map(function (i) { return { label: t('bk' + i), value: Math.max(0, g.bp[i]), color: BC[i] }; }), '', money, true), 'dms-mb') +
      '<h4 class="dms-h4">' + esc(tr('Open documents', 'المستندات المفتوحة')) + '</h4>' + regTable(docSpec('drill_docs', rows, { cols: docCols(true), pageSize: 8 })) +
      '<h4 class="dms-h4">' + esc(tr('Latest payments', 'آخر الدفعات')) + '</h4>';
    var pf = [[PE, 'party', '=', id], [PE, 'docstatus', '=', 1], [PE, 'payment_type', '=', 'Pay'], [PE, 'company', 'in', scopeCos()]];
    return { title: name, sub: id, link: REF.supM[id] ? [SU, id, tr('Open supplier', 'فتح المورد')] : null, body: body,
      spec: { server: true, dt: PE, filters: pf, order: 'posting_date desc', fields: ['name', 'party', 'party_name', 'company', 'posting_date', 'base_paid_amount', 'unallocated_amount', 'mode_of_payment', 'reference_no'], cols: peCols().filter(function (c) { return c.sf !== 'party_name'; }), search: ['name', 'reference_no'], pageSize: 10, file: 'supplier_payments' } };
  }

  /* ---------- views ---------- */
  function banners() {
    var h = '', o = otherCos();
    if (o.length) { h += alertBox('info', esc(tr('Totals are in ' + scopeCur() + '. Not included (other currency): ', 'الإجماليات بعملة ' + scopeCur() + '. غير مشمولة (عملة أخرى): ') + o.join(', ') + '. ' + tr('Choose one in Filters to see it in its own currency.', 'اخترها من المرشحات لعرضها بعملتها.'))); }
    if (D.ap && D.ap.errs.length) { h += alertBox('warn', esc(tr('Accounts Payable report unavailable for ', 'تقرير الذمم الدائنة غير متاح لـ ') + D.ap.errs.join('; '))); }
    if (REF.supFail) { h += alertBox('warn', esc(tr('The Supplier list is not readable for your user; supplier group and local/foreign filters are unavailable.', 'قائمة الموردين غير متاحة لمستخدمك؛ مرشحات مجموعة الموردين ومحلي/أجنبي غير متاحة.'))); }
    else if (REF.locMissing) { h += alertBox('info', esc(tr('The local/foreign classification field is not available for your user.', 'حقل تصنيف محلي/أجنبي غير متاح لمستخدمك.'))); }
    if (PERIOD[1] > TODAY && PERIOD[0] <= TODAY && false) { h += ''; }
    return h;
  }
  function need() { return D.apErr ? srcErr(D.apErr, tr('Accounts Payable report', 'تقرير الذمم الدائنة')) : !D.ap ? skel(1, 'dms-skel-panel') : null; }
  function src2(av) { return '<p class="dms-note">' + esc(tr('Source: Accounts Payable report (due date ageing) · as of ', 'المصدر: تقرير الذمم الدائنة (حسب الاستحقاق) · كما في ') + av) + '</p>'; }
  function renderOverview(AM) {
    var n = need(); if (n) { return n + actionsPanel(AM); }
    var rows = apRows(), g = agg(rows), cur = scopeCur(), ps = periodStats(), av = asOf(), P = D.per, perErr = D.perErr, mm = P ? monthly() : null;
    var net = {}; rows.forEach(function (r) { net[r.sup] = (net[r.sup] || 0) + r.out; });
    var active = Object.keys(net).filter(function (k) { return net[k] > 0.005; }).length, due7 = rows.filter(function (r) { return r.out > 0 && r.age <= 0 && r.age >= -7; }), gi = agg(rows.filter(function (r) { return isInter(r.sup); }));
    var h = kpis([
      kpi({ label: tr('Total payables', 'إجمالي الذمم الدائنة'), val: cur$(g.net, cur), act: 'ap:all', sub: num(active) + ' ' + esc(tr('suppliers', 'مورد')) + (gi.net ? ' · ' + esc(tr('intercompany', 'بين الشركات')) + ' ' + moneyB(gi.net, cur) : ''),
        foot: mixBar([0, 1, 2, 3, 4, 5].map(function (i) { return { label: t('bk' + i), value: Math.max(0, g.bp[i]), color: BC[i], fmt: function (v) { return moneyS(v, cur); } }; })), tip: tr('Net outstanding from the Accounts Payable report as of the period end.', 'صافي القائم من تقرير الذمم الدائنة كما في نهاية الفترة.') }),
      kpi({ label: tr('Overdue', 'متأخر'), dot: 'var(--dms-bad)', val: cur$(g.over, cur), act: 'ap:over', top: g.gross ? stat(g.over ? 'warn' : 'ok', pct(g.over, g.gross, 0)) : '', sub: num(rows.filter(function (r) { return r.out > 0 && r.age > 0; }).length) + ' ' + esc(tr('documents', 'مستند')), foot: ctx(esc(tr('Over 120 days', 'أكثر من 120 يومًا')) + ' ' + moneyB(g.bp[5], cur)) }),
      kpi({ label: tr('Due in 7 days', 'مستحق خلال 7 أيام'), dot: 'var(--dms-age3)', val: cur$(sum(due7, function (r) { return r.out; }), cur), act: 'ap:due7', sub: num(due7.length) + ' ' + esc(tr('documents', 'مستند')), foot: ctx(esc(tr('Not yet due', 'غير مستحق')) + ' ' + moneyB(g.nd, cur)) }),
      kpi({ label: tr('Advances & credits', 'دفعات مقدمة وأرصدة دائنة'), val: cur$(g.cr, cur), act: 'ap:cr', sub: esc(tr('Negative balances, shown apart', 'أرصدة سالبة تظهر منفصلة')) }),
      kpi({ label: tr('Invoices posted', 'الفواتير المرحلة'), val: perErr ? '—' : P ? cur$(ps.piSum, cur) : '…', act: P ? 'per:pi' : null, sub: perErr ? esc(tr('Unavailable', 'غير متاح')) : P ? num(ps.pi.length) + ' ' + esc(tr('in period, excl. returns', 'في الفترة دون المرتجعات')) : wait(), foot: mm ? spark(mm.ms.map(function (m) { return mm.inv[m]; })) : '' }),
      kpi({ label: tr('Payments made', 'المدفوعات'), dot: 'var(--dms-ok)', val: perErr ? '—' : P ? cur$(ps.peSum, cur) : '…', act: P ? 'per:pe' : null, sub: perErr ? esc(tr('Unavailable', 'غير متاح')) : P ? num(ps.pe.length) + ' ' + esc(tr('in period', 'في الفترة')) : wait(), foot: mm ? spark(mm.ms.map(function (m) { return mm.pay[m]; })) : '' })
    ], true);
    var ageP = shareList([0, 1, 2, 3, 4, 5].map(function (i) { return { label: t('bk' + i), value: Math.max(0, g.bp[i]), color: BC[i], act: 'bk:' + i }; }), '<b class="dms-num">' + moneyB(g.gross, cur) + '</b> ' + esc(tr('gross payables', 'إجمالي الذمم الموجبة')) + (g.cr ? ' · ' + esc(tr('credits', 'أرصدة دائنة')) + ' ' + moneyB(g.cr, cur) : ''), money, true);
    var monP = perErr ? srcErr(perErr, tr('Purchase invoices and payments', 'فواتير الشراء والمدفوعات')) : mm ? barChart(mm.ms, 'month', [{ label: tr('Invoices posted', 'فواتير مرحلة'), color: 'var(--dms-s-q)', val: function (k) { return mm.inv[k]; } }, { label: tr('Payments made', 'مدفوعات'), color: 'var(--dms-ok)', val: function (k) { return mm.pay[k]; } }], function (v) { return moneyFull(v, cur); }) : skel(1, 'dms-skel-panel');
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(tr('Payables ageing', 'أعمار الذمم'), ageP, '', esc(tr('As of ', 'كما في ') + av + ' · ' + tr('days past due', 'أيام بعد الاستحقاق'))) +
      panel(tr('Invoices vs payments by month', 'الفواتير مقابل المدفوعات شهريًا'), monP, '', esc(cur) + ' · ' + esc(tr('activity, last 12 months', 'النشاط، آخر 12 شهرًا'))) + '</div></div>';
    var byCo = groupBy(apRows(true), function (r) { return r.co; });
    var coItems = Object.keys(byCo).map(function (k) { return { label: k, value: agg(byCo[k]).net, act: 'co:' + k }; }).sort(function (a, b) { return b.value - a.value; });
    var top = bySup(rows).reduce(function (m, s) { var x = m[s.sup] || (m[s.sup] = { label: s.name, total: 0, part: 0, act: 'sup:' + s.sup }); x.total += s.net; x.part += s.over; return m; }, {});
    top = vals(top).filter(function (x) { return x.total > 0; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 10);
    var grp = {}; rows.forEach(function (r) { if (r.out <= 0) { return; } var m = supMeta(r.sup), k = r.grp || (m && m.supplier_group) || t('nogrp'); var x = grp[k] || (grp[k] = { label: k, total: 0, part: 0 }); x.total += r.out; if (r.age > 0) { x.part += r.out; } });
    h += '<div class="dms-breakdowns">' +
      panel(tr('Top suppliers by outstanding', 'أعلى الموردين بالرصيد القائم'), top.length ? splitBars(top, [{ label: tr('Overdue', 'متأخر'), color: 'var(--dms-bad)' }, { label: tr('Not yet due', 'غير مستحق'), color: 'var(--dms-royal)' }]) : empty(), '', esc(cur) + ' · ' + esc(tr('select a supplier', 'اختر موردًا'))) +
      panel(tr('Payables by company', 'الذمم حسب الشركة'), hbars(coItems, money), '', esc(cur) + ' · ' + esc(tr('select to filter', 'اختر للتصفية'))) +
      panel(tr('Overdue by supplier group', 'المتأخر حسب مجموعة الموردين'), splitBars(vals(grp).sort(function (a, b) { return b.part - a.part; }).slice(0, 8), [{ label: tr('Overdue', 'متأخر'), color: 'var(--dms-bad)' }, { label: tr('Not yet due', 'غير مستحق'), color: 'var(--dms-royal)' }]), '', esc(cur)) + '</div>';
    return h + src2(av);
  }
  function renderSupplier() {
    var n = need(); if (n) { return n; }
    var list = bySup(apRows()); return panel(tr('Supplier positions', 'المركز المالي لكل مورد'), regTable(supSpec('t_sup', list)), '', num(list.length) + ' ' + esc(tr('supplier–company pairs · select a supplier for details', 'زوج مورد–شركة · اختر موردًا للتفاصيل'))) + src2(asOf());
  }
  function renderAgeing() {
    var n = need(); if (n) { return n; }
    var rows = apRows(), g = agg(rows), cur = scopeCur(), tot = sum(g.b), d1 = Math.abs(tot - g.net), mine = g.b[2] + g.b[3] + g.b[4] + g.b[5], nat = 0;
    rows.forEach(function (r) { nat += r.nat[1] + r.nat[2] + r.nat[3] + r.nat[4]; });
    var d2 = Math.abs(mine - nat), h = '';
    h += alertBox(d1 <= RULES.tol ? 'info' : 'err', esc(d1 <= RULES.tol ? tr('Aged total equals the reported outstanding.', 'إجمالي الأعمار يساوي الرصيد القائم المعلن.') : tr('Ageing total differs from reported outstanding by ', 'إجمالي الأعمار يختلف عن الرصيد القائم بمقدار ') + amt(d1)));
    h += alertBox(d2 <= RULES.tol ? 'info' : 'warn', esc(d2 <= RULES.tol ? tr('Buckets above 30 days match the native Accounts Payable report.', 'شرائح ما بعد 30 يومًا تطابق التقرير الأصلي.') : tr('Differs from the native report buckets (31+ days) by ', 'يختلف عن شرائح التقرير الأصلي (31+ يوم) بمقدار ') + amt(d2)));
    h += kpis([0, 1, 2, 3, 4, 5].map(function (i) { return kpi({ label: t('bk' + i), dot: BC[i], val: cur$(g.b[i], cur), act: 'bk:' + i, sub: esc(tr('gross ', 'موجب ')) + esc(money(g.bp[i])) + (g.bn[i] ? ' · ' + esc(tr('credits ', 'دائن ')) + esc(money(g.bn[i])) : '') }); }));
    var byCo = groupBy(apRows(true), function (r) { return r.co; });
    var coRows = Object.keys(byCo).map(function (k) { var x = agg(byCo[k]); return { label: k, total: x.gross, part: x.over }; }).sort(function (a, b) { return b.total - a.total; });
    var sl = bySup(rows), ov = sl.filter(function (s) { return s.over > 0; }).sort(function (a, b) { return b.over - a.over; }).slice(0, 15);
    var gm = {}; rows.forEach(function (r) { var m = supMeta(r.sup), k = r.grp || (m && m.supplier_group) || t('nogrp'), x = gm[k] || (gm[k] = { gross: 0, over: 0 }); if (r.out > 0) { x.gross += r.out; if (r.age > 0) { x.over += r.out; } } });
    var gItems = Object.keys(gm).filter(function (k) { return gm[k].gross > 0; }).map(function (k) { return { label: k, value: gm[k].over / gm[k].gross * 100 }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 12);
    h += '<div class="dms-breakdowns">' + panel(tr('Ageing by company', 'الأعمار حسب الشركة'), splitBars(coRows, [{ label: tr('Overdue', 'متأخر'), color: 'var(--dms-bad)' }, { label: tr('Not yet due', 'غير مستحق'), color: 'var(--dms-royal)' }]), '', esc(cur)) +
      panel(tr('Overdue by supplier (top 15)', 'المتأخر حسب المورد (أعلى 15)'), hbars(ov.map(function (s) { return { label: s.name, value: s.over, color: 'var(--dms-bad)', act: 'sup:' + s.sup }; }), money), '', esc(cur)) +
      panel(tr('Overdue % by supplier group', 'نسبة التأخر حسب مجموعة الموردين'), hbars(gItems, function (v) { return v.toFixed(1) + '%'; }, 'var(--dms-orange)'), '', esc(tr('overdue ÷ gross payables', 'المتأخر ÷ إجمالي الذمم'))) + '</div>';
    var cols = [supAggCols()[0], supAggCols()[1]].concat([0, 1, 2, 3, 4, 5].map(function (i) { return { k: 'b' + i, h: t('bk' + i), num: 1, s: function (r) { return r.b[i]; }, r: function (r) { return amtc(r.b[i] || null); }, c: function (r) { return r.b[i]; } }; })).concat([supAggCols()[4]]);
    return h + panel(tr('Ageing by supplier', 'الأعمار حسب المورد'), regTable({ id: 't_age', rows: sl, cols: cols, sk: 'net', dir: -1, file: 'ap_ageing', text: function (r) { return r.name + ' ' + r.co; } }), '', esc(tr('select a supplier for its documents', 'اختر موردًا لعرض مستنداته'))) + src2(asOf());
  }
  function chipRow(act, cur, opts) { return '<div class="dms-chips dms-bchips" role="group">' + opts.map(function (o) { var on = cur === o[0]; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="' + act + '" data-v="' + esc(o[2] || o[0]) + '"><span>' + esc(o[1]) + '</span></button>'; }).join('') + '</div>'; }
  function renderInvoices() {
    loadPiKpis();
    var K = D.pik, b = piBase(), af = AF(), h = alertBox('info', esc(tr('Outstanding amounts and statuses on this tab are current values (today), not as of the period end. Draft and cancelled invoices are excluded.', 'المبالغ القائمة والحالات هنا هي القيم الحالية (اليوم) وليست كما في نهاية الفترة. المسودات والملغاة مستبعدة.')));
    var kv2 = function (k) { return D.pikErr ? '—' : K ? num(K[k]) : '…'; };
    h += kpis([
      kpi({ label: tr('Posted in period', 'مرحلة في الفترة'), val: kv2('sub'), sub: esc(rangeLabel([af.from, af.to])), act: 'pi:posted' }),
      kpi({ label: tr('Unpaid', 'غير مسددة'), val: kv2('unpaid'), act: 'pi:Unpaid' }), kpi({ label: tr('Partly paid', 'مسددة جزئيا'), val: kv2('part'), act: 'pi:Partly Paid' }),
      kpi({ label: tr('Overdue', 'متأخرة'), dot: 'var(--dms-bad)', val: kv2('over'), act: 'pi:Overdue' }), kpi({ label: tr('Due in 7 days', 'تستحق خلال 7 أيام'), dot: 'var(--dms-age3)', val: kv2('soon'), act: 'pi:soon' })
    ]);
    h += chipRow('pis', 'status:' + PIS.status, [['status:', tr('All statuses', 'كل الحالات')], ['status:open', tr('Open (outstanding)', 'مفتوحة (قائمة)')], ['status:Unpaid', t('st_Unpaid')], ['status:Partly Paid', t('st_Partly Paid')], ['status:Overdue', t('st_Overdue')], ['status:Paid', t('st_Paid')], ['status:Return', t('st_Return')], ['status:Debit Note Issued', t('st_Debit Note Issued')]]);
    h += chipRow('pis', 'due:' + PIS.due, [['due:', tr('Any due date', 'أي تاريخ استحقاق')], ['due:past', tr('Due date passed', 'تجاوز الاستحقاق')], ['due:7', tr('Due in 7 days', 'خلال 7 أيام')], ['due:30', tr('Due in 30 days', 'خلال 30 يومًا')]]) + chipRow('pis', 'posted:' + PIS.posted, [['posted:', tr('Any posting date', 'أي تاريخ ترحيل')], ['posted:1', tr('Posted in the period', 'مرحلة في الفترة')]]);
    if (!b) { return h + empty(tr('No supplier matches the group and local/foreign filters.', 'لا يوجد مورد يطابق المرشحات.')); }
    var f = b.slice();
    if (PIS.status === 'open') { f.push([PI, 'outstanding_amount', '>', 0]); } else if (PIS.status) { f.push([PI, 'status', '=', PIS.status]); }
    if (PIS.due === 'past') { f.push([PI, 'outstanding_amount', '>', 0], [PI, 'due_date', '<', TODAY]); } else if (PIS.due) { f.push([PI, 'due_date', 'between', [TODAY, addDays(TODAY, +PIS.due)]]); }
    if (PIS.posted) { f.push([PI, 'posting_date', 'between', [af.from, af.to]]); }
    if (af.search) { f.push([PI, 'name', 'like', '%' + af.search + '%']); }
    var cols = [linkCol(tr('Purchase invoice', 'فاتورة الشراء'), PI, 'name'), { h: tr('Supplier', 'المورد'), sf: 'supplier_name', r: function (r) { return supBtn(r.supplier, r.supplier_name || r.supplier); }, c: function (r) { return r.supplier_name; } }, col(tr('Company', 'الشركة'), 'company'), col(tr('Posting date', 'تاريخ الترحيل'), 'posting_date', { fmt: dtc }), col(tr('Due date', 'تاريخ الاستحقاق'), 'due_date', { fmt: dtc }),
      { h: tr('Invoice amount', 'قيمة الفاتورة'), num: 1, sf: 'base_grand_total', r: function (r) { return amc(r.base_grand_total) + (r.currency !== curOf(r.company) ? '<span class="dms-sm">' + esc(r.currency + ' ' + amt(r.grand_total)) + '</span>' : ''); }, c: function (r) { return r.base_grand_total; } },
      { h: tr('Outstanding', 'القائم'), num: 1, sf: 'outstanding_amount', r: function (r) { try { return amc(invoiceBalance(r)); } catch (e) { return '<span class="dms-sm dms-tone-warn" title="' + esc(e.message) + '">' + esc(tr('Check currency', 'راجع العملة')) + '</span>'; } }, c: function (r) { try { return invoiceBalance(r); } catch (e) { return ''; } } },
      { h: tr('Status', 'الحالة'), sf: 'status', r: function (r) { return stat(r.status === 'Paid' ? 'ok' : r.status === 'Overdue' ? 'bad' : r.status === 'Partly Paid' ? 'warn' : 'n', t('st_' + r.status) === 'st_' + r.status ? r.status : t('st_' + r.status)); }, c: function (r) { return r.status; } },
      { h: tr('Days overdue', 'أيام التأخير'), num: 1, r: function (r) { return r.outstanding_amount > 0 && r.due_date && r.due_date < TODAY ? overdueTag(r.due_date) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.outstanding_amount > 0 && r.due_date && r.due_date < TODAY ? diffDays(r.due_date, TODAY) : ''; } }];
    return h + panel(tr('Purchase invoices', 'فواتير الشراء'), regTable({ id: 't_pi', server: true, dt: PI, filters: f, order: 'posting_date desc', pageSize: CFG.pageSize, cols: cols, search: ['name', 'supplier_name', 'bill_no'], searchHint: tr('Invoice, supplier or bill no.…', 'فاتورة أو مورد أو رقم فاتورة المورد…'), file: 'purchase_invoices',
      fields: ['name', 'supplier', 'supplier_name', 'company', 'posting_date', 'due_date', 'grand_total', 'base_grand_total', 'outstanding_amount', 'party_account_currency', 'conversion_rate', 'currency', 'status', 'is_return', 'bill_no'] }), '', esc(tr('Live ERP status · sortable', 'حالة النظام الحالية · قابلة للفرز')));
  }
  function renderPayments(AM) {
    loadWf();
    var P = D.per, perErr = D.perErr, ps = periodStats(), cur = scopeCur(), af = AF(), rows = apRows(), up = rows.filter(function (r) { return r.out > 0 && r.age <= 0 && r.age >= -30; });
    var mo = af.to.slice(0, 7), pm = perRows('pe').filter(function (r) { return String(r.posting_date).slice(0, 7) === mo && r.posting_date <= af.to; }), adv = ps.pe.filter(function (r) { return (r.unallocated_amount || 0) > RULES.tol; });
    var W = D.wf, wn = W ? sum(W, function (x) { return +x.c; }) : null, wtxt = W ? W.map(function (x) { return (x.workflow_state || '—') + ': ' + x.c; }).join(' · ') : '';
    var h = kpis([
      kpi({ label: tr('Payments in period', 'المدفوعات في الفترة'), dot: 'var(--dms-ok)', val: perErr ? '—' : P ? cur$(ps.peSum, cur) : '…', act: P ? 'per:pe' : null, sub: P ? num(ps.pe.length) + ' ' + esc(tr('payments', 'دفعة')) : '' }),
      kpi({ label: tr('Payments in ', 'مدفوعات ') + bucketLabel(mo, 'month'), val: perErr ? '—' : P ? cur$(sum(pm, function (r) { return r.base_paid_amount; }), cur) : '…', sub: P ? num(pm.length) + ' ' + esc(tr('payments', 'دفعة')) : '' }),
      kpi({ label: tr('Unallocated in period', 'غير مخصص في الفترة'), dot: 'var(--dms-age3)', val: perErr ? '—' : P ? cur$(sum(adv, function (r) { return r.unallocated_amount; }), cur) : '…', act: adv.length ? 'per:unalloc' : null, sub: P ? num(adv.length) + ' ' + esc(tr('payments', 'دفعة')) : '' }),
      kpi({ label: tr('Awaiting approval', 'بانتظار الاعتماد'), val: D.wfErr ? '—' : W ? num(wn) : '…', act: wn ? 'srv:a_wf' : null, sub: D.wfErr ? esc(tr('Unavailable', 'غير متاح')) : W ? (wn ? esc(wtxt) : esc(tr('No drafts awaiting approval', 'لا مسودات بانتظار الاعتماد'))) : '' }),
      kpi({ label: tr('Upcoming 30 days', 'القادمة خلال 30 يومًا'), val: D.ap ? cur$(sum(up, function (r) { return r.out; }), cur) : '…', act: D.ap ? 'ap:up30' : null, sub: num(up.length) + ' ' + esc(tr('documents by due date', 'مستند حسب الاستحقاق')) })
    ]);
    var mm = P ? monthly() : null, byC = {}, byS = {}, invC = {};
    ps.pe.forEach(function (r) { byC[r.company] = (byC[r.company] || 0) + r.base_paid_amount; var k = r.party; (byS[k] = byS[k] || { label: r.party_name || k, value: 0, act: 'sup:' + k }).value += r.base_paid_amount; });
    ps.pi.forEach(function (r) { invC[r.company] = (invC[r.company] || 0) + r.base_grand_total; });
    var ivRows = uniq(Object.keys(byC).concat(Object.keys(invC))).map(function (co) { return { label: co, total: Math.max(invC[co] || 0, byC[co] || 0), part: Math.min(byC[co] || 0, invC[co] || 0), inv: invC[co] || 0, paid: byC[co] || 0 }; });
    h += '<div class="dms-breakdowns">' +
      panel(tr('Supplier payments by month', 'المدفوعات الشهرية للموردين'), perErr ? srcErr(perErr, tr('Payments', 'المدفوعات')) : mm ? barChart(mm.ms, 'month', { label: tr('Payments made', 'مدفوعات'), color: 'var(--dms-ok)', val: function (k) { return mm.pay[k]; } }, function (v) { return moneyFull(v, cur); }) : skel(1, 'dms-skel-panel'), '', esc(cur)) +
      panel(tr('Top suppliers paid', 'أعلى الموردين المدفوع لهم'), hbars(vals(byS).sort(function (a, b) { return b.value - a.value; }).slice(0, 10), money, 'var(--dms-ok)'), '', esc(cur) + ' · ' + esc(rangeLabel([af.from, af.to]))) +
      panel(tr('Invoiced vs paid by company', 'المفوتر مقابل المدفوع حسب الشركة'), hbars(ivRows.map(function (x) { return { label: x.label + ' — ' + tr('invoiced', 'مفوتر'), value: x.inv, color: 'var(--dms-s-q)' }; }).concat(ivRows.map(function (x) { return { label: x.label + ' — ' + tr('paid', 'مدفوع'), value: x.paid, color: 'var(--dms-ok)' }; })), money), '', esc(cur)) + '</div>';
    var lf = listFilters('party'), f = lf ? [[PE, 'payment_type', '=', 'Pay'], [PE, 'party_type', '=', 'Supplier'], [PE, 'posting_date', 'between', [af.from, af.to]]].concat(lf.map(function (x) { return [PE].concat(x); })) : null;
    if (f) { f.push(PES === 'sub' ? [PE, 'docstatus', '=', 1] : PES === 'draft' ? [PE, 'docstatus', '=', 0] : [PE, 'docstatus', 'in', [0, 1]]); }
    h += chipRow('pes', PES, [['sub', tr('Submitted', 'معتمد')], ['draft', tr('Draft / in workflow', 'مسودة / قيد المسار')], ['all', tr('All', 'الكل')]]);
    return h + panel(tr('Payment history', 'سجل المدفوعات'), f ? regTable({ id: 't_pe', server: true, period: true, dt: PE, filters: f, order: 'posting_date desc', pageSize: CFG.pageSize, cols: peCols(true), search: ['name', 'party_name', 'reference_no'], file: 'supplier_payments',
      fields: ['name', 'party', 'party_name', 'company', 'posting_date', 'base_paid_amount', 'unallocated_amount', 'mode_of_payment', 'reference_no', 'docstatus', 'workflow_state'] }) : empty(), '', esc(rangeLabel([af.from, af.to]) + ' · ' + tr('approval states come from the Payment Entry workflow', 'حالات الاعتماد من مسار قيد الدفع')));
  }
  function renderExceptions() {
    var n = need(); if (n) { return n; }
    var all = buildExceptions(), cnt = { crit: 0, warn: 0, info: 0 }, h = '';
    all.forEach(function (x) { cnt[x.sev]++; });
    if (!D.sum && !D.sumErr) { h += alertBox('info', esc(tr('Loading the Summary report for reconciliation…', 'جارٍ تحميل تقرير الملخص للمطابقة…'))); }
    if (D.sum && D.sum.errs.length) { h += alertBox('warn', esc(tr('Accounts Payable Summary unavailable for ', 'ملخص الذمم الدائنة غير متاح لـ ') + D.sum.errs.join('; '))); }
    h += kpis(['crit', 'warn', 'info'].map(function (s) { return kpi({ label: t('sev_' + s), dot: s === 'crit' ? 'var(--dms-bad)' : s === 'warn' ? 'var(--dms-age2)' : 'var(--dms-royal)', val: num(cnt[s]), top: EXF.sev === s ? stat('n', tr('Filtered', 'مُصفّى')) : '', act: 'exs:sev:' + s }); }));
    var types = ['over90', 'large', 'adv', 'neg', 'unalloc', 'recon', 'due', 'inter', 'old'];
    h += chipRow('exs', 'type:' + EXF.type, [['type:', tr('All types', 'كل الأنواع'), 'type:']].concat(types.map(function (k) { return ['type:' + k, t('x_' + k) + ' (' + all.filter(function (x) { return x.type === k; }).length + ')']; })));
    var fl = all.filter(function (x) { return (!EXF.type || x.type === EXF.type) && (!EXF.sev || x.sev === EXF.sev); });
    var cols = [{ k: 'type', h: tr('Type', 'النوع'), s: function (r) { return r.type; }, r: function (r) { return esc(t('x_' + r.type)); }, c: function (r) { return t('x_' + r.type); } }, { k: 'co', h: tr('Company', 'الشركة'), s: function (r) { return r.co; }, r: function (r) { return bdi(r.co); }, c: function (r) { return r.co; } },
      { k: 'name', h: tr('Supplier', 'المورد'), s: function (r) { return r.name; }, r: function (r) { return r.sup ? supBtn(r.sup, r.name) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.name; } }, { k: 'ref', h: tr('Document', 'المستند'), r: function (r) { return r.ref ? docLink(r.ref.dt, r.ref.name) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.ref ? r.ref.name : ''; } },
      { k: 'amt', h: tr('Amount', 'المبلغ'), num: 1, s: function (r) { return r.amt; }, r: function (r) { return amtc(r.amt); }, c: function (r) { return r.amt; } }, { k: 'days', h: tr('Days', 'الأيام'), num: 1, s: function (r) { return r.days || 0; }, r: function (r) { return r.days == null ? '<span class="dms-sm">—</span>' : '<span class="dms-num">' + num(r.days) + '</span>'; }, c: function (r) { return r.days; } },
      { k: 'sev', h: tr('Severity', 'الخطورة'), s: function (r) { return SEVO[r.sev]; }, r: function (r) { return stat(r.sev === 'crit' ? 'bad' : r.sev === 'warn' ? 'warn' : 'n', t('sev_' + r.sev)); }, c: function (r) { return r.sev; } }, { k: 'detail', h: tr('Details', 'التفاصيل'), r: function (r) { return bdi(r.detail); }, c: function (r) { return r.detail; } }];
    h += panel(tr('Exception register', 'سجل الاستثناءات'), regTable({ id: 't_ex', rows: fl, cols: cols, sk: 'sev', dir: 1, file: 'ap_exceptions', text: function (r) { return [r.name, r.co, r.detail, r.ref && r.ref.name].join(' '); } }), 'dms-mb', num(fl.length) + ' / ' + num(all.length));
    var rp = function (k) { return '<div class="dms-ff"><label for="dms-rule-' + k + '">' + esc(t('r_' + k)) + '</label><input type="number" min="0" step="' + (k === 'tol' ? '0.01' : '1') + '" id="dms-rule-' + k + '" class="dms-input" data-rule="' + k + '" value="' + esc(RULES[k]) + '"></div>'; };
    return h + panel(tr('Rule parameters', 'معايير القواعد'), '<div class="dms-rules">' + ['warn', 'crit', 'old', 'large', 'unalloc', 'term', 'tol'].map(rp).join('') + '</div><ul class="dms-list">' + types.map(function (k) { return '<li><b>' + esc(t('x_' + k)) + ':</b> ' + esc(t('rule_' + k)) + '</li>'; }).join('') + '</ul>', '', esc(tr('Applied to every check on this page; not saved.', 'تنطبق على كل الفحوصات في الصفحة؛ لا تُحفظ.')));
  }
  function renderActions(AM) { return actionsTab(AM, tr('Action lists follow the filters. Supplier balances are as of the period end (Accounts Payable report); payment approvals and allocations are live.', 'قوائم الإجراءات تتبع المرشحات. أرصدة الموردين كما في نهاية الفترة؛ اعتمادات الدفع والتخصيص حالية.')); }
  /* KPI shortcuts on the invoices tab set the chips */
  var baseOnAct = APP.onAct;
  APP.onAct = function (a, v, n, id) {
    if (a === 'kpi' && v.indexOf('pi:') === 0) { var x = v.slice(3); PIS = { status: '', due: '', posted: '' }; if (x === 'posted') { PIS.posted = '1'; } else if (x === 'soon') { PIS.status = 'open'; PIS.due = '7'; } else { PIS.status = x; if (x === 'Overdue') { PIS.due = ''; } } delete SS.t_pi; renderSoft(); return true; }
    if (a === 'kpi' && v.indexOf('exs:') === 0) { return baseOnAct('exs', v.slice(4), n, id); }
    return baseOnAct(a, v, n, id);
  };

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
