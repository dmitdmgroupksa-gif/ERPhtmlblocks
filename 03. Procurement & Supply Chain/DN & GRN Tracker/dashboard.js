/* ===== DM Group KSA — GDN & GRN Tracker — SCRIPT field · v3 =====
   v3 (22 Nov 2026): GDN and GRN documents linked to a Sales Order or Sales Invoice are shown on the Delivery notes tab only
   (including Purchase Receipts linked to a Sales Order); documents with no such link are shown on the Goods receipts tab.
   Read-only. Delivery Note, Purchase Receipt, Sales Order and Purchase Order (with their item tables) through
   frappe.client.get_list with the user's own permissions, using v1's aggregate queries (distinct document counts, net stock
   quantities per stock UOM, item-level order links). Quantities are never added across units. Built on the DM dashboard
   standard; the shared runtime between the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js (edit the kit). */
(function () {
  'use strict';
  var APP = {
    key: '__dmsDnGrn',
    period: 'ytd',
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'dn', en: 'Delivery notes', ar: 'إشعارات التسليم' }, { id: 'grn', en: 'Goods receipts', ar: 'استلام البضائع' },
      { id: 'orders', en: 'Orders and delays', ar: 'الطلبات والتأخير' }, { id: 'wh', en: 'Warehouses', ar: 'المستودعات' }, { id: 'rep', en: 'Reports', ar: 'التقارير' }, { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', options: function () { return REF.comp; } },
      { k: 'division', en: 'Division', ar: 'القسم', options: function () { return REF.div; } },
      { k: 'warehouse', en: 'Warehouse', ar: 'المستودع', dependsOn: 'company', options: function (d) { return REF.wh.filter(function (w) { return !d.company || w.company === d.company; }).map(function (w) { return { v: w.name, l: whLabel(w.name) }; }); } },
      { k: 'status', en: 'Document status', ar: 'حالة المستند', options: function () { return [{ v: 'draft', l: tr('Draft', 'مسودة') }, { v: 'submitted', l: tr('Submitted', 'معتمد') }, { v: 'cancelled', l: tr('Cancelled', 'ملغى') }, { v: 'returned', l: tr('Returned', 'مرتجع') }]; } },
      { k: 'party', en: 'Customer / supplier', ar: 'العميل / المورد', type: 'text', ph: ['Name contains…', 'الاسم يحتوي…'] }
    ],
    sources: ['dnc', 'prc'],
    dtLabels: { 'Delivery Note': ['Delivery note', 'إشعار تسليم'], 'Purchase Receipt': ['Goods receipt', 'استلام بضائع'], 'Sales Order': ['Sales order', 'أمر بيع'], 'Purchase Order': ['Purchase order', 'أمر شراء'] },
    title: function () { return tr('GDN & GRN Tracker', 'متتبع GDN و GRN'); },
    stamp: function () { return tr('Delivery and goods receipt management', 'إدارة التسليم واستلام البضائع'); },
    periodNote: function () { return tr('Posting date for delivery notes and receipts; order date for sales and purchase orders.', 'تاريخ الترحيل لإشعارات التسليم والاستلام؛ تاريخ الطلب لأوامر البيع والشراء.'); },
    filterNote: function () { return tr('Division applies to delivery notes and sales orders only. Cards and status charts ignore Document status; tables apply it. Warehouse matches item lines.', 'القسم ينطبق على إشعارات التسليم وأوامر البيع فقط. البطاقات ورسوم الحالة تتجاهل حالة المستند؛ الجداول تطبقها. المستودع يطابق بنود الأصناف.'); },
    load: function () { loadAll(); },
    onTab: function (id) { needTab(id); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return banner(); },
    content: function (t, AM) { return ({ overview: tabOverview, dn: function () { return tabDoc('dn'); }, grn: function () { return tabDoc('pr'); }, orders: tabOrders, wh: tabWh, rep: tabRep, actions: tabActions })[t](AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v, n, id) { return onAct(a, v, n, id); },
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

  /* ============================================================ v1 query layer */
  var DT = {
    dn: { p: 'Delivery Note', c: 'Delivery Note Item', date: 'posting_date', party: 'customer_name', slug: 'delivery-note' },
    pr: { p: 'Purchase Receipt', c: 'Purchase Receipt Item', date: 'posting_date', party: 'supplier_name', slug: 'purchase-receipt' },
    so: { p: 'Sales Order', c: 'Sales Order Item', date: 'transaction_date', party: 'customer_name', slug: 'sales-order' },
    po: { p: 'Purchase Order', c: 'Purchase Order Item', date: 'transaction_date', party: 'supplier_name', slug: 'purchase-order' } };
  function Pf(k) { return '`tab' + DT[k].p + '`.'; }
  function Cf(k) { return '`tab' + DT[k].c + '`.'; }
  function E(k, s) { return s.replace(/@p\./g, Pf(k)).replace(/@c\./g, Cf(k)); }
  function gl(dt, o) {
    var a = { doctype: dt, fields: o.fields, filters: o.filters || [], limit_start: o.start || 0, limit_page_length: o.len || 20 };
    if (o.parent) { a.parent = o.parent; } if (o.or && o.or.length) { a.or_filters = o.or; } if (o.group) { a.group_by = o.group; } if (o.order) { a.order_by = o.order; }
    return guarded(null, 'frappe.client.get_list', a).then(function (r) { return r || []; });
  }
  /* o: {nostatus, noPeriod, extra} */
  function flt(k, o) {
    o = o || {}; var d = DT[k].p, i = DT[k].c, a = [];
    if (F.company) { a.push([d, 'company', '=', F.company]); }
    if (F.division && (k === 'dn' || k === 'so')) { a.push([d, 'custom_division', '=', F.division]); }
    if (!o.noPeriod) { a.push([d, DT[k].date, '>=', PERIOD[0]]); a.push([d, DT[k].date, '<=', PERIOD[1]]); }
    if (F.warehouse) { a.push([i, 'warehouse', '=', F.warehouse]); }
    if (F.party) { a.push([d, DT[k].party, 'like', '%' + F.party + '%']); }
    if (!o.nostatus) {
      var s = F.status;
      if (s === 'draft') { a.push([d, 'docstatus', '=', 0]); } else if (s === 'submitted') { a.push([d, 'docstatus', '=', 1]); } else if (s === 'cancelled') { a.push([d, 'docstatus', '=', 2]); }
      else if (s === 'returned' && (k === 'dn' || k === 'pr')) { a.push([d, 'docstatus', '=', 1]); a.push([d, 'is_return', '=', 1]); }
    }
    return a.concat(o.extra || []);
  }
  function sub1(k) { return [DT[k].p, 'docstatus', '=', 1]; }
  var PSTAT = { so: ['To Deliver and Bill', 'To Deliver'], po: ['To Receive and Bill', 'To Receive'] };
  /* order-line modes: pend / part / over (v1 pending tab) and done / every (v1 reconciliation) */
  function modeF(k, mode) {
    var d = DT[k].p, i = DT[k].c, a = [[d, 'docstatus', '=', 1]];
    if (mode === 'done') { a.push([d, 'status', 'in', ['Completed', 'To Bill']]); return a; }
    if (mode === 'every') { return a; }
    a.push([d, 'status', 'in', PSTAT[k]]);
    if (mode === 'part') { a.push([d, k === 'so' ? 'per_delivered' : 'per_received', '>', 0]); }
    if (mode === 'over') { a.push([i, k === 'so' ? 'delivery_date' : 'schedule_date', '<', TODAY]); }
    return a;
  }
  function cntDocs(k, filters) { return gl(DT[k].p, { fields: ['count(distinct ' + Pf(k) + 'name) as n'], filters: filters }).then(function (r) { return +((r[0] || {}).n) || 0; }); }
  function docCounts(k, extra) {
    if (extra === null) { return Promise.resolve({ total: 0, sub: 0, draft: 0, canc: 0, ret: 0 }); }
    return gl(DT[k].p, { fields: [Pf(k) + 'docstatus as ds', Pf(k) + 'is_return as r', 'count(distinct ' + Pf(k) + 'name) as n'], filters: flt(k, { nostatus: true, extra: extra }), group: Pf(k) + 'docstatus,' + Pf(k) + 'is_return', len: 20 })
      .then(function (rows) { var m = { total: 0, sub: 0, draft: 0, canc: 0, ret: 0 }; rows.forEach(function (r) { m.total += r.n; if (r.ds == 1) { m.sub += r.n; } if (r.ds == 0) { m.draft += r.n; } if (r.ds == 2) { m.canc += r.n; } if (r.ds == 1 && r.r) { m.ret += r.n; } }); return m; });
  }
  function qtyByUom(k, extra) {
    return gl(DT[k].p, { fields: [Cf(k) + 'stock_uom as u', 'sum(' + Cf(k) + 'stock_qty) as q'], filters: flt(k, { nostatus: true, extra: [sub1(k)].concat(extra || []) }), group: Cf(k) + 'stock_uom', len: 200 })
      .then(function (r) { return r.filter(function (x) { return x.q; }).sort(function (a, b) { return Math.abs(b.q) - Math.abs(a.q); }); });
  }
  function groupedCount(k, field, extra, len) { return gl(DT[k].p, { fields: [field + ' as g', 'count(distinct ' + Pf(k) + 'name) as n'], filters: flt(k, { extra: extra || [sub1(k)], nostatus: true }), group: field, order: 'n desc', len: len || 10 }); }
  function dailyCounts(k, extra) { return gl(DT[k].p, { fields: [Pf(k) + DT[k].date + ' as d', 'count(distinct ' + Pf(k) + 'name) as n'], filters: flt(k, { nostatus: true, extra: [sub1(k)].concat(extra || []) }), group: Pf(k) + DT[k].date, order: Pf(k) + DT[k].date + ' asc', len: 5000 }); }
  function bucketMonths(rows, key) { var m = {}; rows.forEach(function (r) { var k = String(r.d).slice(0, 7); m[k] = (m[k] || 0) + (+r[key || 'n'] || 0); }); return m; }
  var SRC = {
    dn: { pf: ['name', 'posting_date', 'company', 'custom_division as division', 'customer', 'customer_name', 'docstatus', 'status', 'is_return', 'owner', 'sales_order as hso'],
      cf: ['name as rid', 'item_code', 'item_name', 'qty', 'uom', 'warehouse', 'against_sales_order as so', 'so_detail', 'returned_qty'],
      ps: ['name', 'customer_name', 'customer', 'sales_order'], cs: ['against_sales_order', 'item_code', 'item_name'],
      sort: { name: '@p.name', date: '@p.posting_date', party: '@p.customer_name', status: '@p.status', item: '@c.item_code', qty: '@c.qty', wh: '@c.warehouse' }, ord: '@p.posting_date desc, @p.name desc' },
    pr: { pf: ['name', 'posting_date', 'company', 'supplier', 'supplier_name', 'docstatus', 'status', 'is_return', 'owner'],
      cf: ['name as rid', 'item_code', 'item_name', 'qty', 'received_qty', 'rejected_qty', 'returned_qty', 'uom', 'warehouse', 'purchase_order as po', 'purchase_order_item as poi'],
      ps: ['name', 'supplier_name', 'supplier'], cs: ['purchase_order', 'item_code', 'item_name'],
      sort: { name: '@p.name', date: '@p.posting_date', party: '@p.supplier_name', status: '@p.status', item: '@c.item_code', qty: '@c.qty', wh: '@c.warehouse' }, ord: '@p.posting_date desc, @p.name desc' },
    so: { pf: ['name', 'transaction_date as odate', 'company', 'customer_name', 'status', 'per_delivered as per', 'docstatus', 'sales_persons as sp'],
      cf: ['name as rid', 'item_code', 'item_name', 'qty', 'delivered_qty as done', 'uom', 'warehouse', 'delivery_date as idate'],
      ps: ['name', 'customer_name'], cs: ['item_code', 'item_name'],
      sort: { name: '@p.name', date: '@p.transaction_date', idate: '@c.delivery_date', party: '@p.customer_name', item: '@c.item_code', qty: '@c.qty', wh: '@c.warehouse' }, ord: '@p.transaction_date desc, @p.name desc' },
    po: { pf: ['name', 'transaction_date as odate', 'company', 'supplier_name', 'status', 'per_received as per', 'docstatus'],
      cf: ['name as rid', 'item_code', 'item_name', 'qty', 'received_qty as done', 'uom', 'warehouse', 'schedule_date as idate'],
      ps: ['name', 'supplier_name'], cs: ['item_code', 'item_name'],
      sort: { name: '@p.name', date: '@p.transaction_date', idate: '@c.schedule_date', party: '@p.supplier_name', item: '@c.item_code', qty: '@c.qty', wh: '@c.warehouse' }, ord: '@p.transaction_date desc, @p.name desc' }
  };
  function fl(arr, pre) { return arr.map(function (s) { var p = s.split(' as '); return pre + p[0] + ' as ' + (p[1] || p[0]); }); }
  /* server-paged source: level 'doc' (one row per document) or 'item' (one row per line) */
  function fetchRows(k, lvl, filters, start, len, q, order) {
    var src = SRC[k], or = [];
    if (q) { var like = '%' + q + '%'; src.ps.forEach(function (f) { or.push([DT[k].p, f, 'like', like]); }); if (lvl === 'item') { src.cs.forEach(function (f) { or.push([DT[k].c, f, 'like', like]); }); } }
    var fields = lvl === 'doc' ? fl(src.pf, Pf(k)) : fl(src.pf, Pf(k)).concat(fl(src.cf, Cf(k)));
    var o = String(order || '').split(' '), ord = o[0] && src.sort[o[0]] ? E(k, src.sort[o[0]]) + ' ' + (o[1] || 'desc') + (lvl === 'doc' ? ', ' + Pf(k) + 'name desc' : '') : E(k, src.ord) + (lvl === 'item' ? ', ' + Cf(k) + 'idx asc' : '');
    var cf = lvl === 'doc' ? ['count(distinct ' + Pf(k) + 'name) as n'] : ['count(' + Cf(k) + 'name) as n'];
    return Promise.all([gl(DT[k].p, { fields: fields, filters: filters, or: or, group: lvl === 'doc' ? Pf(k) + 'name' : undefined, order: ord, start: start, len: len }),
      gl(DT[k].p, { fields: cf, filters: lvl === 'item' ? filters.concat([[DT[k].c, 'name', 'is', 'set']]) : filters, or: or })])
      .then(function (r) { var rows = r[0], total = +((r[1][0] || {}).n) || 0; return (lvl === 'item' ? enrich(k, rows) : Promise.resolve()).then(function () { return { rows: rows, total: total }; }); });
  }
  /* order-line info for the current page only (bounded queries) */
  function enrich(k, rows) {
    var chunk = function (a) { var o = []; for (var i = 0; i < a.length; i += 100) { o.push(a.slice(i, i + 100)); } return o; }, uniq = function (a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); };
    var p;
    if (k === 'dn') {
      var ids = uniq(rows.map(function (r) { return r.so_detail; })), sos = uniq(rows.map(function (r) { return r.so || r.hso; }));
      p = Promise.all([Promise.all(chunk(ids).map(function (c) { return gl('Sales Order Item', { parent: 'Sales Order', fields: ['name', 'qty', 'delivered_qty'], filters: [['name', 'in', c]], len: c.length }); })),
        Promise.all(chunk(sos).map(function (c) { return gl('Sales Order', { fields: ['name', 'sales_persons'], filters: [['name', 'in', c]], len: c.length }); }))]).then(function (res) {
        var m = {}, sp = {}; [].concat.apply([], res[0]).forEach(function (x) { m[x.name] = x; }); [].concat.apply([], res[1]).forEach(function (x) { sp[x.name] = x.sales_persons; });
        rows.forEach(function (r) { var x = m[r.so_detail]; r.ordered = x ? x.qty : null; r.pend = x ? Math.max(x.qty - x.delivered_qty, 0) : null; r.sperson = sp[r.so || r.hso] || ''; r.sref = r.so || r.hso || ''; });
      });
    } else if (k === 'pr') {
      var pids = uniq(rows.map(function (r) { return r.poi; }));
      p = Promise.all(chunk(pids).map(function (c) { return gl('Purchase Order Item', { parent: 'Purchase Order', fields: ['name', 'qty', 'received_qty'], filters: [['name', 'in', c]], len: c.length }); })).then(function (res) {
        var m = {}; [].concat.apply([], res).forEach(function (x) { m[x.name] = x; }); rows.forEach(function (r) { var x = m[r.poi]; r.ordered = x ? x.qty : null; r.out = x ? Math.max(x.qty - x.received_qty, 0) : null; });
      });
    } else { return Promise.resolve(); }
    return p.catch(function () { rows.forEach(function (r) { r.enrichErr = true; }); });
  }

  /* ============================================================ reference lists and loading */
  var REF = { comp: [], div: [], wh: [], whErr: false, labels: {} };
  function whLabel(c) { return (c && REF.labels[c]) || c || ''; }
  var REFP = null;
  function loadRef() {
    return Promise.all([
      gl('Company', { fields: ['name'], len: 200, order: 'name asc' }).then(function (r) { REF.comp = r.map(function (x) { return x.name; }); }, function () { /* list optional */ }),
      gl('Division', { fields: ['name'], len: 200, order: 'name asc' }).then(function (r) { REF.div = r.map(function (x) { return x.name; }); }, function () { /* list optional */ }),
      gl('Warehouse', { fields: ['name', 'company', 'warehouse_name'], filters: [['is_group', '=', 0]], len: 1000, order: 'name asc' }).then(function (r) {
        REF.wh = r; var cnt = {}; r.forEach(function (w) { var n = (w.warehouse_name || '').trim(); if (n) { cnt[n] = (cnt[n] || 0) + 1; } });
        r.forEach(function (w) { var n = (w.warehouse_name || '').trim(); REF.labels[w.name] = !n || n === w.name ? w.name : (cnt[n] > 1 ? n + ' (' + w.name + ')' : n); });
      }, function () { REF.whErr = true; })]);
  }
  /* ---- SO / SINV link split (v3) ----
     A Delivery Note (GDN or GRN series) is linked when its header sales_order or sales_invoice_data is set (these carry the
     item-level links on this site) or a Sales Invoice line points to it. A Purchase Receipt is linked when an item line has
     sales_order. Linked documents belong on the Delivery notes tab; the rest on the Goods receipts tab. The two lists below are
     small (about 100 unlinked delivery notes and 16 linked receipts a year), so they are passed as name filters. */
  var LNKP = null;
  function loadLinks() {
    var chunks = function (a) { var o = []; for (var i = 0; i < a.length; i += 200) { o.push(a.slice(i, i + 200)); } return o; };
    var cand = gl(DT.dn.p, { fields: [Pf('dn') + 'name as name'], filters: flt('dn', { nostatus: true, extra: [[DT.dn.p, 'sales_order', 'is', 'not set'], [DT.dn.p, 'sales_invoice_data', 'is', 'not set']] }), group: Pf('dn') + 'name', len: 5000 });
    var u = cand.then(function (rows) {
      var names = rows.map(function (r) { return r.name; }), siErr = false; if (!names.length) { return { names: [], siErr: false }; }
      return Promise.all(chunks(names).map(function (c) { return gl('Sales Invoice', { fields: ['`tabSales Invoice Item`.delivery_note as dn'], filters: [['Sales Invoice Item', 'delivery_note', 'in', c], ['Sales Invoice', 'docstatus', '<', 2]], group: '`tabSales Invoice Item`.delivery_note', len: c.length }).catch(function () { siErr = true; return []; }); }))
        .then(function (res) { var hit = {}; [].concat.apply([], res).forEach(function (x) { hit[x.dn] = 1; }); return { names: names.filter(function (n) { return !hit[n]; }), siErr: siErr }; });
    });
    var pr = gl(DT.pr.p, { fields: [Pf('pr') + 'name as name'], filters: flt('pr', { nostatus: true, extra: [[DT.pr.c, 'sales_order', 'is', 'set']] }), group: Pf('pr') + 'name', len: 5000 }).then(function (rows) { return rows.map(function (r) { return r.name; }); });
    return Promise.all([u, pr]).then(function (r) { return { u: r[0].names, p: r[1], siErr: r[0].siErr }; });
  }
  /* name filters: 'main' = documents that stay on their own tab, 'moved' = documents shown on the other tab (null = none) */
  function splitF(l, k, side) {
    var list = k === 'dn' ? l.u : l.p, d = DT[k].p;
    if (side === 'main') { return list.length ? [[d, 'name', 'not in', list]] : []; }
    return list.length ? [[d, 'name', 'in', list]] : null;
  }
  function sumCounts(a, b) { var m = {}; ['total', 'sub', 'draft', 'canc', 'ret'].forEach(function (x) { m[x] = (a[x] || 0) + (b[x] || 0); }); return m; }
  function tabCounts(l, k) { var o = k === 'dn' ? 'pr' : 'dn'; return Promise.all([docCounts(k, splitF(l, k, 'main')), docCounts(o, splitF(l, o, 'moved'))]).then(function (r) { var s = sumCounts(r[0], r[1]); s.moved = r[1].total; return s; }); }
  function loadAll() {
    REFP = REFP || loadRef();
    LNKP = loadLinks();
    run('lnk', function () { return LNKP; });
    run('dnc', function () { return LNKP.then(function (l) { return tabCounts(l, 'dn'); }); });
    run('prc', function () { return LNKP.then(function (l) { return tabCounts(l, 'pr'); }); });
    run('kp', function () { var jobs = []; ['so', 'po'].forEach(function (k) { ['pend', 'part', 'over'].forEach(function (m) { jobs.push(cntDocs(k, flt(k, { nostatus: true, extra: modeF(k, m) }))); }); }); return Promise.all(jobs).then(function (r) { return { so: { pend: r[0], part: r[1], over: r[2] }, po: { pend: r[3], part: r[4], over: r[5] } }; }); });
    run('mon', function () { return Promise.all([dailyCounts('dn'), dailyCounts('pr')]); });
    run('st', function () { return Promise.all(['dn', 'pr'].map(function (k) { return gl(DT[k].p, { fields: [Pf(k) + 'docstatus as ds', Pf(k) + 'status as g', 'count(distinct ' + Pf(k) + 'name) as n'], filters: flt(k, { nostatus: true }), group: Pf(k) + 'docstatus,' + Pf(k) + 'status', len: 40 }); })); });
    run('top', function () { return Promise.all([groupedCount('dn', Pf('dn') + 'customer_name'), groupedCount('pr', Pf('pr') + 'supplier_name')]); });
    actSpecs().forEach(function (s) { run(s.id, function () { return Promise.all([cntDocs(s.k, s.f()), gl(DT[s.k].p, { fields: s.fields, filters: s.f(), group: Pf(s.k) + 'name', order: s.order, len: 6 })]).then(function (r) { return { count: r[0], rows: r[1] }; }); }); });
    needTab(tab);
  }
  function needTab(id) {
    if (id === 'wh' && !D.wh && !D.whErr) { run('wh', loadWh); }
    if (id === 'rep' && !D['rep' + RP.i] && !D['rep' + RP.i + 'Err']) { run('rep' + RP.i, REPORTS[RP.i].load); }
    if (id === 'dn' && !D.dnq && !D.dnqErr) { run('dnq', function () { return LNKP.then(function (l) { return qtyByUom('dn', splitF(l, 'dn', 'main')); }); }); }
    if (id === 'grn' && !D.prq && !D.prqErr) { run('prq', function () { return LNKP.then(function (l) { return qtyByUom('pr', splitF(l, 'pr', 'main')); }); }); }
  }

  /* ============================================================ actions pending (all open, not the period) */
  function actSpecs() {
    var head = function (k, extra) { return fl(SRC[k].pf.filter(function (x) { return /^(name|company|status|docstatus|customer_name|supplier_name|posting_date|transaction_date as odate)/.test(x); }), Pf(k)).concat(extra || []); };
    return [
      { id: 'a_soo', client: true, k: 'so', p: 'high', tone: 'bad', order: 'due asc', fields: head('so', [Pf('so') + 'delivery_date as due']), short: tr('Late deliveries', 'تسليمات متأخرة'), title: tr('Sales orders with a delivery date passed and goods still to deliver', 'أوامر بيع تجاوزت تاريخ التسليم وما زالت للتسليم'), why: tr('Status To Deliver (and Bill), at least one line past its delivery date. Late days use the order delivery date. Earliest first.', 'الحالة للتسليم، بند واحد على الأقل تجاوز تاريخه. الأقدم أولًا.'),
        f: function () { return flt('so', { nostatus: true, noPeriod: true, extra: modeF('so', 'over') }); } },
      { id: 'a_poo', client: true, k: 'po', p: 'high', tone: 'bad', order: 'due asc', fields: head('po', [Pf('po') + 'schedule_date as due']), short: tr('Late receipts', 'استلامات متأخرة'), title: tr('Purchase orders past their required-by date and still to receive', 'أوامر شراء تجاوزت تاريخ الاحتياج وما زالت للاستلام'), why: tr('Status To Receive (and Bill), at least one line past its required-by date. Late days use the order required-by date. Earliest first.', 'الحالة للاستلام، بند واحد على الأقل تجاوز تاريخه. الأقدم أولًا.'),
        f: function () { return flt('po', { nostatus: true, noPeriod: true, extra: modeF('po', 'over') }); } },
      { id: 'a_rej', client: true, k: 'pr', p: 'med', tone: 'warn', order: Pf('pr') + 'posting_date desc', fields: head('pr', ['sum(' + Cf('pr') + 'rejected_qty) as rej']), short: tr('Receipts with rejected qty', 'استلامات بكمية مرفوضة'), title: tr('Goods receipts in the period with rejected quantity', 'استلامات في الفترة بها كمية مرفوضة'), why: tr('Submitted receipts where a line has rejected quantity. Follow up with the supplier.', 'استلامات معتمدة بها بند بكمية مرفوضة. تابع مع المورد.'),
        f: function () { return flt('pr', { nostatus: true, extra: [sub1('pr'), [DT.pr.c, 'rejected_qty', '>', 0]] }); } },
      { id: 'a_dnd', client: true, k: 'dn', p: 'med', tone: 'warn', order: Pf('dn') + 'posting_date asc', fields: head('dn'), short: tr('Draft delivery notes', 'إشعارات تسليم مسودة'), title: tr('Delivery notes still in draft', 'إشعارات تسليم ما زالت مسودة'), why: tr('Not submitted, so stock and the order are not updated. Oldest first.', 'غير معتمدة، فلا يتحدث المخزون والطلب. الأقدم أولًا.'),
        f: function () { return flt('dn', { nostatus: true, noPeriod: true, extra: [[DT.dn.p, 'docstatus', '=', 0]] }); } },
      { id: 'a_prd', client: true, k: 'pr', p: 'med', tone: 'warn', order: Pf('pr') + 'posting_date asc', fields: head('pr'), short: tr('Draft goods receipts', 'استلامات مسودة'), title: tr('Goods receipts still in draft', 'استلامات ما زالت مسودة'), why: tr('Not submitted, so stock and the purchase order are not updated. Oldest first.', 'غير معتمدة، فلا يتحدث المخزون وأمر الشراء. الأقدم أولًا.'),
        f: function () { return flt('pr', { nostatus: true, noPeriod: true, extra: [[DT.pr.p, 'docstatus', '=', 0]] }); } }
    ];
  }
  function actItem(s) {
    return function (r) {
      var late = r.due ? diffDays(String(r.due).slice(0, 10), TODAY) : 0, dt = r.posting_date || r.odate, old = dt ? diffDays(String(dt).slice(0, 10), TODAY) : 0, isLate = s.id === 'a_soo' || s.id === 'a_poo';
      return { p: s.p, score: score(s.p, 0, isLate ? late : old), dt: DT[s.k].p, name: r.name, title: r.customer_name || r.supplier_name || r.name, desc: r.name + (s.id === 'a_rej' ? ' · ' + tr('rejected ', 'مرفوض ') + amtq(r.rej) : ''), who: r.company || null,
        due: isLate ? tr(daysTxt(late) + ' late', 'متأخر ' + daysTxt(late)) : (dt ? String(dt).slice(0, 10) + ' · ' + daysTxt(old) : ''), tone: s.tone };
    };
  }
  function actClient() { var o = {}; actSpecs().forEach(function (s) { if (D[s.id + 'Err']) { o[s.id] = 'ERR:' + D[s.id + 'Err']; } else if (D[s.id]) { o[s.id] = { rows: D[s.id].rows, count: D[s.id].count, item: actItem(s) }; } }); return Object.keys(o).length ? o : null; }

  /* ============================================================ shared pieces */
  function amtq(v) { return v == null || v === '' ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function banner() {
    var h = '';
    if (REF.whErr) { h += alertBox('info', esc(tr('The warehouse list is not available for your role; the Warehouse filter is off.', 'قائمة المستودعات غير متاحة لدورك؛ مرشح المستودع معطل.'))); }
    if (F.division && (tab === 'grn')) { h += alertBox('info', esc(tr('Division does not apply to goods receipts.', 'القسم لا ينطبق على استلام البضائع.'))); }
    return h;
  }
  function uomList(rows) { if (!rows || !rows.length) { return '0'; } return rows.slice(0, 3).map(function (r) { return amtq(r.q) + ' ' + r.u; }).join(' · ') + (rows.length > 3 ? ' +' + (rows.length - 3) : ''); }
  function stName(r) { return r.docstatus == 0 ? 'Draft' : r.docstatus == 2 ? 'Cancelled' : (r.status || 'Submitted'); }
  function stTone(s) { return /Completed|To Bill/.test(s) ? 'ok' : /Draft|To Deliver|To Receive|Partly/.test(s) ? 'warn' : /Return/.test(s) ? 'bad' : 'n'; }
  function lineStatus(r) {
    if (r.docstatus == 2) { return { tone: 'n', t: tr('Cancelled', 'ملغى'), over: 0 }; } if (r.status === 'Closed') { return { tone: 'n', t: tr('Closed', 'مغلق'), over: 0 }; }
    var pend = (+r.qty || 0) - (+r.done || 0); if (pend <= 0) { return { tone: 'ok', t: tr('Completed', 'مكتمل'), over: 0 }; }
    if (r.idate && r.idate < TODAY) { return { tone: 'bad', t: tr('Overdue', 'متأخر'), over: diffDays(r.idate, TODAY) }; }
    return (+r.done || 0) > 0 ? { tone: 'warn', t: tr('Partial', 'جزئي'), over: 0 } : { tone: 'n', t: tr('Pending', 'معلق'), over: 0 };
  }
  function dl(k, n) { return n ? docLink(DT[k].p, n) : '<span class="dms-sm">—</span>'; }
  function qc(v) { return '<span class="dms-num">' + esc(amtq(v)) + '</span>'; }
  function loadingBlock(AM) { return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div>' + (AM ? '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>' : '<div class="dms-skel dms-skel-panel"></div>'); }
  function monthChart(a, p) { var keys = monthList(PERIOD[0], PERIOD[1] > TODAY ? TODAY : PERIOD[1]), A = bucketMonths(a), B = bucketMonths(p); return barChart(keys, 'month', [{ label: tr('Delivery notes', 'إشعارات التسليم'), color: 'var(--dms-navy)', val: function (k) { return A[k] || 0; } }, { label: tr('Goods receipts', 'استلامات البضائع'), color: 'var(--dms-royal)', val: function (k) { return B[k] || 0; } }], num); }

  /* ============================================================ overview */
  function tabOverview(AM) {
    if (D.dncErr && D.prcErr) { return srcErr(D.dncErr, DT.dn.p) + actionsPanel(AM); }
    var dc = D.dnc, pc = D.prc, kp = D.kp;
    if (!dc && !D.dncErr || !pc && !D.prcErr) { return loadingBlock(AM); }
    var c = function (x, f) { return x ? num(f(x)) : '—'; }, kv = function (k, m) { return D.kpErr ? '—' : kp ? num(kp[k][m]) : '…'; };
    var h = kpis([
      kpi({ label: tr('Delivery notes submitted', 'إشعارات تسليم معتمدة'), dot: 'var(--dms-navy)', val: c(dc, function (x) { return x.sub; }), sub: dc ? esc(num(dc.draft) + tr(' draft · ', ' مسودة · ') + num(dc.ret) + tr(' returns · ', ' مرتجع · ') + num(dc.canc) + tr(' cancelled', ' ملغى')) : esc(tr('Unavailable', 'غير متاح')), act: dc ? 'dx:dn:sub' : null }),
      kpi({ label: tr('Goods receipts submitted', 'استلامات معتمدة'), dot: 'var(--dms-royal)', val: c(pc, function (x) { return x.sub; }), sub: pc ? esc(num(pc.draft) + tr(' draft · ', ' مسودة · ') + num(pc.ret) + tr(' returns · ', ' مرتجع · ') + num(pc.canc) + tr(' cancelled', ' ملغى')) : esc(tr('Unavailable', 'غير متاح')), act: pc ? 'dx:pr:sub' : null }),
      kpi({ label: tr('Sales orders to deliver', 'أوامر بيع للتسليم'), dot: 'var(--dms-age3)', val: kv('so', 'pend'), sub: kp ? esc(num(kp.so.part) + tr(' partly delivered', ' مسلمة جزئيًا')) : '', act: 'om:so:pend' }),
      kpi({ label: tr('Purchase orders to receive', 'أوامر شراء للاستلام'), dot: 'var(--dms-age3)', val: kv('po', 'pend'), sub: kp ? esc(num(kp.po.part) + tr(' partly received', ' مستلمة جزئيًا')) : '', act: 'om:po:pend' }),
      kpi({ label: tr('Late deliveries', 'تسليمات متأخرة'), dot: 'var(--dms-bad)', val: kv('so', 'over'), sub: esc(tr('Sales orders, a line past its date', 'أوامر بيع ببند تجاوز تاريخه')), act: 'om:so:over' }),
      kpi({ label: tr('Late receipts', 'استلامات متأخرة'), dot: 'var(--dms-bad)', val: kv('po', 'over'), sub: esc(tr('Purchase orders, a line past its date', 'أوامر شراء ببند تجاوز تاريخه')), act: 'om:po:over' })
    ], true);
    var mon = D.mon, st = D.st, top = D.top;
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(tr('Submitted per month', 'المعتمد شهريًا'), D.monErr ? srcErr(D.monErr, DT.dn.p) : mon ? monthChart(mon[0], mon[1]) : skel(1, 'dms-skel-panel'), '', esc(tr('Distinct documents', 'مستندات مميزة'))) +
      panel(tr('Status mix', 'توزيع الحالات'), D.stErr ? srcErr(D.stErr, DT.dn.p) : st ? stMix(st) : skel(1, 'dms-skel-panel'), '', esc(tr('All statuses, the period', 'كل الحالات، الفترة'))) + '</div></div>';
    var topBars = function (rows, f) { var l = (rows || []).filter(function (x) { return x.g; }); return l.length ? hbars(l.map(function (x) { return { label: x.g, value: x.n, act: 'party:' + x.g }; }), num) : empty(tr('No submitted documents in this period.', 'لا مستندات معتمدة في هذه الفترة.')); };
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Top customers by delivery notes', 'أعلى العملاء حسب إشعارات التسليم'), D.topErr ? srcErr(D.topErr, DT.dn.p) : top ? topBars(top[0]) : skel(1, 'dms-skel-panel'), '', esc(tr('Select to filter by the name', 'اختر للترشيح بالاسم'))) +
      panel(tr('Top suppliers by goods receipts', 'أعلى الموردين حسب الاستلامات'), D.topErr ? srcErr(D.topErr, DT.pr.p) : top ? topBars(top[1]) : skel(1, 'dms-skel-panel'), '', esc(tr('Select to filter by the name', 'اختر للترشيح بالاسم'))) + '</div>';
    return h;
  }
  function stMix(st) {
    var rows = function (r, k) { return r.map(function (x) { var s = x.ds == 0 ? 'Draft' : x.ds == 2 ? 'Cancelled' : (x.g || 'Submitted'); return { s: s, n: x.n }; }).reduce(function (m, x) { m[x.s] = (m[x.s] || 0) + x.n; return m; }, {}); };
    var a = rows(st[0]), b = rows(st[1]), keys = Object.keys(a).concat(Object.keys(b)).filter(function (x, i, l) { return l.indexOf(x) === i; }).sort(function (x, y) { return ((b[y] || 0) + (a[y] || 0)) - ((b[x] || 0) + (a[x] || 0)); });
    if (!keys.length) { return empty(tr('No documents in this period.', 'لا مستندات في هذه الفترة.')); }
    return splitBars(keys.map(function (k) { return { label: k, total: (a[k] || 0) + (b[k] || 0), part: a[k] || 0 }; }), [{ label: tr('Delivery notes', 'إشعارات التسليم'), color: 'var(--dms-navy)' }, { label: tr('Goods receipts', 'استلامات البضائع'), color: 'var(--dms-royal)' }], num);
  }

  /* ============================================================ delivery notes / goods receipts */
  var LV = { dn: 'item', pr: 'item' }, DX = { dn: '', pr: '' };
  var DXF = { sub: [['docstatus', '=', 1]], draft: [['docstatus', '=', 0]], canc: [['docstatus', '=', 2]], ret: [['docstatus', '=', 1], ['is_return', '=', 1]] };
  function tabDoc(k) {
    var c = D[k + 'c'], q = D[k + 'q'], cErr = D[k + 'cErr'];
    if (cErr) { return srcErr(cErr, DT[k].p); }
    var dn = k === 'dn', lab = dn ? [tr('All delivery notes', 'كل إشعارات التسليم'), tr('Submitted', 'معتمدة'), tr('Draft', 'مسودة'), tr('Cancelled', 'ملغاة'), tr('Returns', 'مرتجعة')] : [tr('All goods receipts', 'كل الاستلامات'), tr('Submitted', 'معتمدة'), tr('Draft', 'مسودة'), tr('Cancelled', 'ملغاة'), tr('Returns', 'مرتجعة')];
    var keys = ['', 'sub', 'draft', 'canc', 'ret'], vals = c ? [c.total, c.sub, c.draft, c.canc, c.ret] : [];
    var h = kpis(keys.map(function (x, i) { return kpi({ label: lab[i], dot: ['', 'var(--dms-ok)', 'var(--dms-age3)', '#8a97a8', 'var(--dms-bad)'][i] || null, val: c ? num(vals[i]) : '…', sub: !i && c && c.moved ? esc(tr('incl. ' + num(c.moved) + (dn ? ' goods receipts linked to a sales order' : ' delivery notes without SO / SINV'), 'منها ' + num(c.moved) + (dn ? ' استلامات مرتبطة بأمر بيع' : ' إشعارات تسليم بلا أمر بيع / فاتورة'))) : '', top: DX[k] === x ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'dx:' + k + ':' + (x || 'all') }); }).concat([kpi({ label: dn ? tr('Delivered quantity', 'الكمية المسلمة') : tr('Received quantity', 'الكمية المستلمة'), val: D[k + 'qErr'] ? '—' : q ? '<span class="dg-uom">' + esc(uomList(q)) + '</span>' : '…', sub: esc(tr('Net, submitted, stock UOM', 'صافي، معتمد، وحدة المخزون')), act: q && q.length ? 'uom:' + k : null })]));
    var lvl = LV[k], extra = (DXF[DX[k]] || []).map(function (a) { return [DT[k].p].concat(a); });
    var filters = flt(k, { nostatus: !!DX[k], extra: extra }), o = dn ? 'pr' : 'dn', L = D.lnk;
    var oFilters = flt(o, { nostatus: !!DX[k], extra: (DXF[DX[k]] || []).map(function (a) { return [DT[o].p].concat(a); }) });
    var seg = '<div class="dg-seg" role="group" aria-label="' + esc(tr('Rows', 'الصفوف')) + '">' + [['item', tr('Item lines', 'البنود')], ['doc', tr('Documents', 'المستندات')]].map(function (o) { return '<button type="button" class="dms-btn dms-btn-sm' + (lvl === o[0] ? ' dms-btn-primary' : '') + '" data-act="lv" data-v="' + k + ':' + o[0] + '" aria-pressed="' + (lvl === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
    return h + panel(dn ? tr('Delivery notes', 'إشعارات التسليم') : tr('Goods receipts', 'استلامات البضائع'), seg + regTable({ id: 't_' + k, server: true, filters: [JSON.stringify([filters, lvl, GEN])], pageSize: 25, order: '', file: DT[k].slug + '_' + lvl, searchHint: dn ? tr('DN, customer, order or item', 'الإشعار، العميل، الطلب أو الصنف') : tr('Receipt, supplier, order or item', 'الاستلام، المورد، الطلب أو الصنف'), empty: tr('No records for the selected filters.', 'لا سجلات للمرشحات المحددة.'),
      loader: function (p, size, q2, order) { return LNKP.then(function (l) { return fetchRows(k, lvl, filters.concat(splitF(l, k, 'main')), p * size, size, q2, order); }); }, cols: docCols(k, lvl) }), '', esc(lvl === 'item' && dn ? tr('Ordered and pending use the sales order line the DN line is linked to; unlinked lines show —.', 'المطلوب والمعلق من بند أمر البيع المرتبط؛ البنود غير المرتبطة تظهر —.') : lvl === 'item' ? tr('Ordered and outstanding use the linked purchase order line.', 'المطلوب والمتبقي من بند أمر الشراء المرتبط.') : '')) + movedPanel(k, o, lvl, oFilters, L);
  }
  /* Documents of the other type that belong on this tab (v3 rule). */
  function movedPanel(k, o, lvl, oFilters, L) {
    var dn = k === 'dn', rule = dn ? tr('GDN and GRN documents linked to a Sales Order or Sales Invoice are shown on this tab only. Delivery notes with no such link are on the Goods receipts tab.', 'مستندات GDN و GRN المرتبطة بأمر بيع أو فاتورة مبيعات تظهر في هذا التبويب فقط. إشعارات التسليم غير المرتبطة في تبويب استلام البضائع.')
      : tr('Delivery notes with no Sales Order or Sales Invoice link are shown here; receipts linked to a Sales Order are on the Delivery notes tab.', 'إشعارات التسليم غير المرتبطة بأمر بيع أو فاتورة تظهر هنا؛ الاستلامات المرتبطة بأمر بيع في تبويب إشعارات التسليم.');
    if (D.lnkErr) { return alertBox('warn', esc(tr('The Sales Order / Sales Invoice link check could not be loaded; each tab shows its own document type only.', 'تعذر تحميل فحص الارتباط بأمر البيع / الفاتورة؛ كل تبويب يعرض نوع مستنداته فقط.'))); }
    if (!L) { return note(esc(rule)); }
    var h = L.siErr ? alertBox('warn', esc(tr('Sales Invoices are not readable with your permissions, so delivery notes linked only through an invoice are treated as unlinked.', 'فواتير المبيعات غير مقروءة بصلاحياتك، لذا تُعامل إشعارات التسليم المرتبطة عبر الفاتورة فقط كغير مرتبطة.'))) : '';
    var moved = splitF(L, o, 'moved');
    if (!moved) { return h + note(esc(rule)); }
    var title = dn ? tr('Goods receipts linked to a Sales Order', 'استلامات بضائع مرتبطة بأمر بيع') : tr('Delivery notes not linked to a Sales Order or Sales Invoice', 'إشعارات تسليم غير مرتبطة بأمر بيع أو فاتورة مبيعات');
    return h + panel(title, regTable({ id: 't_mv_' + k, server: true, filters: [JSON.stringify([oFilters, moved, lvl, GEN])], pageSize: 25, order: '', file: (dn ? 'receipts_linked_to_so_' : 'delivery_notes_unlinked_') + lvl,
      searchHint: tr('Document, party, order or item', 'المستند أو الطرف أو الطلب أو الصنف'), empty: tr('No records for the selected filters.', 'لا سجلات للمرشحات المحددة.'),
      loader: function (p, size, q2, order) { return fetchRows(o, lvl, oFilters.concat(moved), p * size, size, q2, order); }, cols: docCols(o, lvl) }), '', esc(rule));
  }
  function docCols(k, lvl) {
    var dn = k === 'dn';
    var st = { h: tr('Status', 'الحالة'), sf: 'status', r: function (r) { return stat(stTone(stName(r)), stName(r)) + (r.is_return ? ' ' + stat('bad', tr('Return', 'مرتجع')) : ''); }, c: function (r) { return stName(r) + (r.is_return ? ' (return)' : ''); } };
    var a = [{ h: dn ? tr('Delivery note', 'إشعار التسليم') : tr('Goods receipt', 'الاستلام'), sf: 'name', r: function (r) { return dl(k, r.name) + '<span class="dms-sm dg-sub">' + esc(r.company || '') + '</span>'; }, c: function (r) { return r.name; } },
      { h: tr('Posting date', 'تاريخ الترحيل'), sf: 'date', r: function (r) { return r.posting_date ? dtc(r.posting_date) : '—'; }, c: function (r) { return r.posting_date; } },
      { h: dn ? tr('Customer', 'العميل') : tr('Supplier', 'المورد'), sf: 'party', r: function (r) { return bdi(r.customer_name || r.supplier_name || ''); }, c: function (r) { return r.customer_name || r.supplier_name; } }];
    if (lvl === 'doc') { return a.concat(dn ? [{ h: tr('Sales order', 'أمر البيع'), r: function (r) { return dl('so', r.hso); }, c: function (r) { return r.hso; } }, { h: tr('Division', 'القسم'), r: function (r) { return bdi(r.division || '—'); }, c: function (r) { return r.division; } }] : []).concat([st, { h: tr('Created by', 'أنشأه'), r: function (r) { return '<span class="dms-sm">' + bdi(r.owner || '') + '</span>'; }, c: function (r) { return r.owner; } }]); }
    var item = { h: tr('Item', 'الصنف'), sf: 'item', r: function (r) { return bdi(r.item_code || '') + '<span class="dms-sm dg-sub">' + esc(r.item_name || '') + '</span>'; }, c: function (r) { return r.item_code + ' ' + (r.item_name || ''); } };
    var wh = { h: tr('Warehouse', 'المستودع'), sf: 'wh', r: function (r) { return '<span title="' + esc(r.warehouse || '') + '">' + bdi(whLabel(r.warehouse)) + '</span>'; }, c: function (r) { return whLabel(r.warehouse); } };
    var q = function (h, f, sf) { return { h: h, num: 1, sf: sf, r: function (r) { return r.enrichErr && (f === 'ordered' || f === 'pend' || f === 'out') ? '<span class="dms-sm">—</span>' : qc(r[f]); }, c: function (r) { return r[f]; } }; };
    if (dn) { return a.concat([{ h: tr('Sales order', 'أمر البيع'), r: function (r) { return dl('so', r.sref) + (r.sperson ? '<span class="dms-sm dg-sub">' + esc(r.sperson) + '</span>' : ''); }, c: function (r) { return r.sref; } }, wh, item, q(tr('Ordered', 'المطلوب'), 'ordered'), q(tr('Delivered', 'المسلم'), 'qty', 'qty'), q(tr('Returned', 'المرتجع'), 'returned_qty'), q(tr('Pending', 'المعلق'), 'pend'), { h: tr('UOM', 'الوحدة'), r: function (r) { return esc(r.uom || ''); }, c: function (r) { return r.uom; } }, st]); }
    return a.concat([{ h: tr('Purchase order', 'أمر الشراء'), r: function (r) { return dl('po', r.po); }, c: function (r) { return r.po; } }, wh, item, q(tr('Ordered', 'المطلوب'), 'ordered'), q(tr('Received', 'المستلم'), 'received_qty'), q(tr('Accepted', 'المقبول'), 'qty', 'qty'), { h: tr('Rejected', 'المرفوض'), num: 1, r: function (r) { return +r.rejected_qty ? '<b class="dms-num dms-tone-bad">' + esc(amtq(r.rejected_qty)) + '</b>' : qc(r.rejected_qty); }, c: function (r) { return r.rejected_qty; } }, q(tr('Returned', 'المرتجع'), 'returned_qty'), q(tr('Outstanding', 'المتبقي'), 'out'), { h: tr('UOM', 'الوحدة'), r: function (r) { return esc(r.uom || ''); }, c: function (r) { return r.uom; } }, st]);
  }

  /* ============================================================ orders and delays (v1 pending + reconciliation) */
  var OM = { k: 'so', mode: 'pend' };
  var MODES = [['pend', 'All pending', 'كل المعلق'], ['part', 'Partly done', 'منجز جزئيًا'], ['over', 'Overdue', 'متأخر'], ['done', 'Completed', 'مكتمل'], ['every', 'All submitted', 'كل المعتمد']];
  function tabOrders() {
    var k = OM.k, so = k === 'so', filters = flt(k, { nostatus: true, extra: modeF(k, OM.mode) });
    var seg = function (items, cur, act) { return '<div class="dg-seg" role="group">' + items.map(function (o) { return '<button type="button" class="dms-btn dms-btn-sm' + (cur === o[0] ? ' dms-btn-primary' : '') + '" data-act="' + act + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + esc(tr(o[1], o[2])) + '</button>'; }).join('') + '</div>'; };
    var h = '<div class="dg-bar">' + seg([['so', 'Sales orders → deliveries', 'أوامر البيع ← التسليم'], ['po', 'Purchase orders → receipts', 'أوامر الشراء ← الاستلام']], k, 'omk') + seg(MODES, OM.mode, 'omm') + '</div>';
    var oq = D['oq_' + k + '_' + OM.mode], oqe = D['oq_' + k + '_' + OM.mode + 'Err'];
    if (!oq && !oqe && ['pend', 'part', 'over'].indexOf(OM.mode) > -1) { later(function () { run('oq_' + k + '_' + OM.mode, function () { return gl(DT[k].p, { fields: [Cf(k) + 'uom as u', 'sum(' + Cf(k) + 'qty) as q', 'sum(' + Cf(k) + (so ? 'delivered_qty' : 'received_qty') + ') as d'], filters: filters, group: Cf(k) + 'uom', len: 100 }); }); soon(); }, 0); }
    if (['pend', 'part', 'over'].indexOf(OM.mode) > -1) {
      var x = oq ? oq.map(function (a) { return { u: a.u, p: (+a.q || 0) - (+a.d || 0) }; }).filter(function (a) { return a.p > 0; }).sort(function (a, b) { return b.p - a.p; }) : null;
      h += '<div class="dg-strip"><b>' + esc(tr('Outstanding quantity', 'الكمية المتبقية')) + '</b>' + (oqe ? ' —' : !x ? ' …' : x.length ? x.slice(0, 8).map(function (a) { return '<span class="dms-stat dms-stat-n">' + esc(amtq(a.p) + ' ' + a.u) + '</span>'; }).join('') : ' 0') + '</div>';
    }
    return h + panel(so ? tr('Sales order lines', 'بنود أوامر البيع') : tr('Purchase order lines', 'بنود أوامر الشراء'), regTable({ id: 't_ord', server: true, filters: [JSON.stringify([filters, GEN])], pageSize: 25, order: 'idate asc', file: (so ? 'sales' : 'purchase') + '_order_lines_' + OM.mode, searchHint: tr('Order, party or item', 'الطلب أو الطرف أو الصنف'), empty: tr('No order lines match.', 'لا بنود مطابقة.'),
      loader: function (p, size, q, order) { return fetchRows(k, 'item', filters, p * size, size, q, order); }, cols: [
        { h: so ? tr('Sales order', 'أمر البيع') : tr('Purchase order', 'أمر الشراء'), sf: 'name', r: function (r) { return dl(k, r.name) + '<span class="dms-sm dg-sub">' + esc(r.company || '') + '</span>'; }, c: function (r) { return r.name; } },
        { h: tr('Order date', 'تاريخ الطلب'), sf: 'date', r: function (r) { return r.odate ? dtc(r.odate) : '—'; }, c: function (r) { return r.odate; } },
        { h: so ? tr('Delivery date', 'تاريخ التسليم') : tr('Required by', 'مطلوب بتاريخ'), sf: 'idate', r: function (r) { var s = lineStatus(r); return (r.idate ? dtc(r.idate) : '—') + (s.over ? ' ' + stat('bad', tr(daysTxt(s.over) + ' late', 'متأخر ' + daysTxt(s.over))) : ''); }, c: function (r) { return r.idate; } },
        { h: so ? tr('Customer', 'العميل') : tr('Supplier', 'المورد'), sf: 'party', r: function (r) { return bdi(r.customer_name || r.supplier_name || ''); }, c: function (r) { return r.customer_name || r.supplier_name; } },
        { h: tr('Warehouse', 'المستودع'), sf: 'wh', r: function (r) { return bdi(whLabel(r.warehouse)); }, c: function (r) { return whLabel(r.warehouse); } },
        { h: tr('Item', 'الصنف'), sf: 'item', r: function (r) { return bdi(r.item_code || '') + '<span class="dms-sm dg-sub">' + esc(r.item_name || '') + '</span>'; }, c: function (r) { return r.item_code; } },
        { h: tr('Ordered', 'المطلوب'), sf: 'qty', num: 1, r: function (r) { return qc(r.qty); }, c: function (r) { return r.qty; } },
        { h: so ? tr('Delivered', 'المسلم') : tr('Received', 'المستلم'), num: 1, r: function (r) { return qc(r.done); }, c: function (r) { return r.done; } },
        { h: tr('Pending', 'المعلق'), num: 1, r: function (r) { return qc(Math.max((+r.qty || 0) - (+r.done || 0), 0)); }, c: function (r) { return Math.max((+r.qty || 0) - (+r.done || 0), 0); } },
        { h: tr('UOM', 'الوحدة'), r: function (r) { return esc(r.uom || ''); }, c: function (r) { return r.uom; } },
        { h: tr('Line status', 'حالة البند'), r: function (r) { var s = lineStatus(r); return stat(s.tone, s.t); }, c: function (r) { return lineStatus(r).t; } },
        { h: '', r: function (r) { return '<button type="button" class="dms-btn dms-btn-sm" data-act="lnk" data-v="' + esc(k + '|' + r.name) + '">' + esc(so ? tr('Deliveries', 'التسليمات') : tr('Receipts', 'الاستلامات')) + '</button>'; } }] }), '', esc(tr('Only lines with an item-level order link are reconciled. Overdue: the line date has passed while the order is still open.', 'تتم مطابقة البنود المرتبطة بأمر على مستوى البند فقط. المتأخر: تاريخ البند مضى والطلب مفتوح.')));
  }

  /* ============================================================ warehouses */
  function loadWh() {
    var q1 = function (k, extra) { return gl(DT[k].p, { fields: [Cf(k) + 'warehouse as w', 'count(distinct ' + Pf(k) + 'name) as n'], filters: flt(k, { nostatus: true, extra: extra }), group: Cf(k) + 'warehouse', len: 500 }); };
    var q2 = function (k) { return gl(DT[k].p, { fields: [Cf(k) + 'warehouse as w', Cf(k) + 'stock_uom as u', 'sum(' + Cf(k) + 'stock_qty) as q'], filters: flt(k, { nostatus: true, extra: [sub1(k)] }), group: Cf(k) + 'warehouse,' + Cf(k) + 'stock_uom', len: 2000 }); };
    return Promise.all([q1('dn', [sub1('dn')]), q2('dn'), q1('pr', [sub1('pr')]), q2('pr'), q1('so', modeF('so', 'pend')), q1('so', modeF('so', 'over')), q1('po', modeF('po', 'pend')), q1('po', modeF('po', 'over'))]).then(function (r) {
      var m = {}, get = function (w) { return m[w] || (m[w] = { w: w, dn: 0, pr: 0, sop: 0, soo: 0, pop: 0, poo: 0, dq: [], pq: [] }); };
      [[0, 'dn'], [2, 'pr'], [4, 'sop'], [5, 'soo'], [6, 'pop'], [7, 'poo']].forEach(function (x) { r[x[0]].forEach(function (y) { if (y.w) { get(y.w)[x[1]] = y.n; } }); });
      r[1].forEach(function (y) { if (y.w && y.q) { get(y.w).dq.push({ u: y.u, q: y.q }); } }); r[3].forEach(function (y) { if (y.w && y.q) { get(y.w).pq.push({ u: y.u, q: y.q }); } });
      return Object.keys(m).map(function (k) { var o = m[k]; o.dq.sort(function (a, b) { return Math.abs(b.q) - Math.abs(a.q); }); o.pq.sort(function (a, b) { return Math.abs(b.q) - Math.abs(a.q); }); return o; });
    });
  }
  function tabWh() {
    if (D.whErr) { return srcErr(D.whErr, DT.dn.p); }
    var rows = D.wh; if (!rows) { return loadingBlock(); }
    var top = rows.slice().sort(function (a, b) { return (b.dn + b.pr) - (a.dn + a.pr); }).slice(0, 10);
    var h = '<div class="dms-cols-2 dms-grid">' + panel(tr('Busiest warehouses', 'أكثر المستودعات نشاطًا'), top.length ? splitBars(top.map(function (x) { return { label: whLabel(x.w), total: x.dn + x.pr, part: x.dn, act: 'wh:' + x.w }; }), [{ label: tr('Delivery notes', 'إشعارات التسليم'), color: 'var(--dms-navy)' }, { label: tr('Goods receipts', 'الاستلامات'), color: 'var(--dms-royal)' }], num) : empty(tr('No submitted documents in this period.', 'لا مستندات معتمدة في هذه الفترة.')), '', esc(tr('Submitted documents', 'مستندات معتمدة'))) +
      panel(tr('Overdue orders by warehouse', 'الطلبات المتأخرة حسب المستودع'), (function () { var l = rows.filter(function (x) { return x.soo + x.poo; }).sort(function (a, b) { return (b.soo + b.poo) - (a.soo + a.poo); }).slice(0, 10); return l.length ? splitBars(l.map(function (x) { return { label: whLabel(x.w), total: x.soo + x.poo, part: x.soo, act: 'wh:' + x.w }; }), [{ label: tr('Sales orders', 'أوامر البيع'), color: 'var(--dms-bad)' }, { label: tr('Purchase orders', 'أوامر الشراء'), color: 'var(--dms-age3)' }], num) : empty(tr('No overdue orders.', 'لا طلبات متأخرة.')); })(), '', esc(tr('All open orders', 'كل الطلبات المفتوحة'))) + '</div>';
    var n = function (f, sf) { return { k: f, h: sf, num: 1, s: function (r) { return r[f]; }, r: function (r) { return r[f] ? num(r[f]) : '<span class="dms-sm">0</span>'; }, c: function (r) { return r[f]; } }; };
    return h + panel(tr('Warehouse performance', 'أداء المستودعات'), regTable({ id: 't_wh', rows: rows, sk: 'dn', dir: -1, file: 'warehouse_performance', text: function (r) { return whLabel(r.w) + ' ' + r.w; }, cols: [
      { k: 'w', h: tr('Warehouse', 'المستودع'), s: function (r) { return whLabel(r.w); }, r: function (r) { return '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="wh:' + esc(r.w) + '" title="' + esc(r.w) + '">' + bdi(whLabel(r.w)) + '</button>'; }, c: function (r) { return whLabel(r.w); } },
      n('dn', tr('Delivery notes', 'إشعارات التسليم')), n('pr', tr('Goods receipts', 'الاستلامات')),
      { k: 'dq', h: tr('Net outgoing', 'صافي الصادر'), r: function (r) { return '<span class="dms-sm">' + esc(uomList(r.dq)) + '</span>'; }, c: function (r) { return uomList(r.dq); } }, { k: 'pq', h: tr('Net incoming', 'صافي الوارد'), r: function (r) { return '<span class="dms-sm">' + esc(uomList(r.pq)) + '</span>'; }, c: function (r) { return uomList(r.pq); } },
      n('sop', tr('Open SOs', 'أوامر بيع مفتوحة')), n('pop', tr('Open POs', 'أوامر شراء مفتوحة')), n('soo', tr('Overdue SOs', 'أوامر بيع متأخرة')), n('poo', tr('Overdue POs', 'أوامر شراء متأخرة'))] }), '', esc(tr('Documents and quantities: submitted, in the period. Open and overdue orders: all open orders with a line in the warehouse, issued in the period.', 'المستندات والكميات: المعتمدة في الفترة. الطلبات المفتوحة والمتأخرة: الصادرة في الفترة ولها بند في المستودع.')));
  }

  /* ============================================================ reports (v1) */
  var RP = { i: 0, uom: '' };
  var REPORTS = [
    { en: 'Monthly comparison', ar: 'المقارنة الشهرية', load: function () { return Promise.all([dailyCounts('dn'), dailyCounts('pr')]); },
      draw: function (d) { var keys = monthList(PERIOD[0], PERIOD[1] > TODAY ? TODAY : PERIOD[1]), A = bucketMonths(d[0]), B = bucketMonths(d[1]); return panel(tr('Submitted per month', 'المعتمد شهريًا'), monthChart(d[0], d[1])) + panel(tr('By month', 'حسب الشهر'), regTable({ id: 't_rep', rows: keys.slice().reverse().map(function (k) { return { m: k, dn: A[k] || 0, pr: B[k] || 0 }; }), file: 'monthly_comparison', text: function (r) { return r.m; }, cols: [{ k: 'm', h: tr('Month', 'الشهر'), s: function (r) { return r.m; }, r: function (r) { return esc(r.m); }, c: function (r) { return r.m; } }, { k: 'dn', h: tr('Delivery notes', 'إشعارات التسليم'), num: 1, s: function (r) { return r.dn; }, r: function (r) { return num(r.dn); }, c: function (r) { return r.dn; } }, { k: 'pr', h: tr('Goods receipts', 'الاستلامات'), num: 1, s: function (r) { return r.pr; }, r: function (r) { return num(r.pr); }, c: function (r) { return r.pr; } }] })); } },
    { en: 'Daily delivery notes', ar: 'التسليم اليومي', load: function () { return dailyCounts('dn'); }, draw: function (d) { return daily(d, 'dn'); } },
    { en: 'Daily goods receipts', ar: 'الاستلام اليومي', load: function () { return dailyCounts('pr'); }, draw: function (d) { return daily(d, 'pr'); } },
    { en: 'Delivered vs received quantity', ar: 'المسلم مقابل المستلم', load: function () { return Promise.all([qtyByUom('dn'), qtyByUom('pr')]).then(function (r) { var us = r[0].concat(r[1]).map(function (x) { return x.u; }).filter(function (x, i, l) { return l.indexOf(x) === i; }); var u = RP.uom && us.indexOf(RP.uom) > -1 ? RP.uom : us[0]; if (!u) { return { us: us, u: '', a: [], b: [] }; } return Promise.all(['dn', 'pr'].map(function (k) { return gl(DT[k].p, { fields: [Pf(k) + DT[k].date + ' as d', 'sum(' + Cf(k) + 'stock_qty) as q'], filters: flt(k, { nostatus: true, extra: [sub1(k), [DT[k].c, 'stock_uom', '=', u]] }), group: Pf(k) + DT[k].date, order: Pf(k) + DT[k].date + ' asc', len: 5000 }); })).then(function (x) { return { us: us, u: u, a: x[0], b: x[1] }; }); }); },
      draw: function (d) { if (!d.u) { return panel(tr('Delivered vs received quantity', 'المسلم مقابل المستلم'), empty(tr('No submitted quantities in this period.', 'لا كميات معتمدة في هذه الفترة.'))); } var keys = monthList(PERIOD[0], PERIOD[1] > TODAY ? TODAY : PERIOD[1]), A = bucketMonths(d.a, 'q'), B = bucketMonths(d.b, 'q'); return panel(tr('Delivered vs received quantity', 'المسلم مقابل المستلم'), '<div class="dms-ff dg-ff"><label for="dg-uom">' + esc(tr('Stock UOM', 'وحدة المخزون')) + '</label><select id="dg-uom" class="dms-input" data-uom="1">' + d.us.map(function (u) { return '<option' + (u === d.u ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') + '</select></div>' + barChart(keys, 'month', [{ label: tr('Delivered', 'المسلم') + ' (' + d.u + ')', color: 'var(--dms-navy)', val: function (k) { return A[k] || 0; } }, { label: tr('Received', 'المستلم') + ' (' + d.u + ')', color: 'var(--dms-royal)', val: function (k) { return B[k] || 0; } }], function (v) { return amtq(Math.round(v)); }), '', esc(tr('One unit at a time; units are never added together', 'وحدة واحدة كل مرة؛ لا تجمع الوحدات'))); } },
    { en: 'Customer delivery summary', ar: 'ملخص التسليم حسب العميل', load: function () { return party('dn'); }, draw: function (d) { return partyTable(d, 'dn'); } },
    { en: 'Supplier receipt summary', ar: 'ملخص الاستلام حسب المورد', load: function () { return party('pr'); }, draw: function (d) { return partyTable(d, 'pr'); } }
  ];
  function daily(rows, k) {
    return panel(k === 'dn' ? tr('Daily delivery notes', 'التسليم اليومي') : tr('Daily goods receipts', 'الاستلام اليومي'), rows.length ? lineChart(rows.map(function (r) { return String(r.d).slice(0, 10); }), 'day', [{ label: k === 'dn' ? tr('Delivery notes', 'إشعارات التسليم') : tr('Goods receipts', 'الاستلامات'), color: k === 'dn' ? 'var(--dms-navy)' : 'var(--dms-royal)', val: (function () { var m = {}; rows.forEach(function (r) { m[String(r.d).slice(0, 10)] = r.n; }); return function (x) { return m[x] || 0; }; })() }], num) : empty(tr('No submitted documents in this period.', 'لا مستندات معتمدة في هذه الفترة.'))) +
      panel(tr('By day', 'حسب اليوم'), regTable({ id: 't_rep', rows: rows.slice().reverse(), file: 'daily_' + k, text: function (r) { return String(r.d); }, cols: [{ k: 'd', h: tr('Date', 'التاريخ'), s: function (r) { return String(r.d); }, r: function (r) { return dtc(String(r.d).slice(0, 10)); }, c: function (r) { return r.d; } }, { k: 'n', h: tr('Documents', 'المستندات'), num: 1, s: function (r) { return r.n; }, r: function (r) { return num(r.n); }, c: function (r) { return r.n; } }] }));
  }
  function party(k) { var f = Pf(k) + (k === 'dn' ? 'customer_name' : 'supplier_name'), q = function (extra) { return gl(DT[k].p, { fields: [f + ' as g', 'count(distinct ' + Pf(k) + 'name) as n'], filters: flt(k, { nostatus: true, extra: extra }), group: f, order: 'n desc', len: 500 }); }; return Promise.all([q([sub1(k), [DT[k].p, 'is_return', '=', 0]]), q([sub1(k), [DT[k].p, 'is_return', '=', 1]])]); }
  function partyTable(d, k) {
    var rm = {}; d[1].forEach(function (x) { rm[x.g] = x.n; }); var seen = {}, rows = d[0].map(function (x) { seen[x.g] = 1; return { g: x.g || '', n: x.n, r: rm[x.g] || 0 }; }).concat(d[1].filter(function (x) { return !seen[x.g]; }).map(function (x) { return { g: x.g || '', n: 0, r: x.n }; }));
    return panel(k === 'dn' ? tr('Customer delivery summary', 'ملخص التسليم حسب العميل') : tr('Supplier receipt summary', 'ملخص الاستلام حسب المورد'), regTable({ id: 't_rep', rows: rows, sk: 'n', dir: -1, file: (k === 'dn' ? 'customer' : 'supplier') + '_summary', text: function (r) { return r.g; }, cols: [
      { k: 'g', h: k === 'dn' ? tr('Customer', 'العميل') : tr('Supplier', 'المورد'), s: function (r) { return r.g; }, r: function (r) { return '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="party:' + esc(r.g) + '">' + bdi(r.g || '—') + '</button>'; }, c: function (r) { return r.g; } },
      { k: 'n', h: k === 'dn' ? tr('Delivery notes', 'إشعارات التسليم') : tr('Goods receipts', 'الاستلامات'), num: 1, s: function (r) { return r.n; }, r: function (r) { return num(r.n); }, c: function (r) { return r.n; } },
      { k: 'r', h: tr('Returns', 'المرتجعات'), num: 1, s: function (r) { return r.r; }, r: function (r) { return r.r ? '<b class="dms-tone-bad">' + num(r.r) + '</b>' : '0'; }, c: function (r) { return r.r; } }] }), '', esc(rows.length >= 500 ? tr('Top 500 only.', 'أعلى 500 فقط.') : tr('Submitted documents in the period.', 'مستندات معتمدة في الفترة.')));
  }
  function tabRep() {
    var h = '<div class="dg-bar"><div class="dms-ff dg-ff"><label for="dg-rep">' + esc(tr('Report', 'التقرير')) + '</label><select id="dg-rep" class="dms-input" data-rep="1">' + REPORTS.map(function (r, i) { return '<option value="' + i + '"' + (i === RP.i ? ' selected' : '') + '>' + esc(tr(r.en, r.ar)) + '</option>'; }).join('') + '</select></div></div>';
    var k = 'rep' + RP.i; if (D[k + 'Err']) { return h + srcErr(D[k + 'Err'], DT.dn.p); } if (!D[k]) { return h + skel(1, 'dms-skel-panel'); }
    return h + REPORTS[RP.i].draw(D[k]);
  }
  function tabActions(AM) { return actionsTab(AM, tr('Late deliveries and receipts and drafts cover all open documents, whatever the period; rejected quantity covers the period.', 'التسليمات والاستلامات المتأخرة والمسودات تشمل كل المستندات المفتوحة بغض النظر عن الفترة؛ الكمية المرفوضة تشمل الفترة.')); }

  /* ============================================================ drill-downs and events */
  var LNK = null;
  function drill(id) {
    if (id === 'lnk' && LNK) {
      var tk = LNK.k === 'so' ? 'dn' : 'pr';
      return { title: tr('Linked to ', 'مرتبط بـ ') + LNK.name, sub: tk === 'dn' ? tr('Delivery note lines against this sales order', 'بنود إشعارات التسليم مقابل أمر البيع') : tr('Goods receipt lines against this purchase order', 'بنود الاستلام مقابل أمر الشراء'), link: [DT[LNK.k].p, LNK.name, LNK.name], body: LNK.err ? alertBox('err', esc(LNK.err)) : LNK.rows ? '' : skel(1, 'dms-skel-panel'),
        spec: LNK.rows ? { rows: LNK.rows, file: 'linked_' + LNK.name, empty: tr('Nothing delivered or received against this order yet.', 'لا شيء مسلم أو مستلم مقابل هذا الطلب بعد.'), text: function (r) { return r.name + ' ' + r.item; }, cols: [
          { h: tk === 'dn' ? tr('Delivery note', 'إشعار التسليم') : tr('Goods receipt', 'الاستلام'), r: function (r) { return dl(tk, r.name); }, c: function (r) { return r.name; } },
          { h: tr('Date', 'التاريخ'), r: function (r) { return r.date ? dtc(r.date) : '—'; }, c: function (r) { return r.date; } },
          { h: tr('Item', 'الصنف'), r: function (r) { return bdi(r.item || ''); }, c: function (r) { return r.item; } },
          { h: tr('Quantity', 'الكمية'), num: 1, r: function (r) { return qc(r.qty) + ' <span class="dms-sm">' + esc(r.uom || '') + '</span>'; }, c: function (r) { return r.qty; } },
          { h: tr('Warehouse', 'المستودع'), r: function (r) { return bdi(whLabel(r.wh)); }, c: function (r) { return whLabel(r.wh); } },
          { h: tr('Status', 'الحالة'), r: function (r) { return stat(stTone(stName(r)), stName(r)) + (r.is_return ? ' ' + stat('bad', tr('Return', 'مرتجع')) : ''); }, c: function (r) { return stName(r); } }] } : null, dg: 'lnk' };
    }
    if (id.indexOf('uom:') === 0) {
      var k = id.slice(4), rows = D[k + 'q'] || [];
      return { title: k === 'dn' ? tr('Delivered quantity by unit', 'الكمية المسلمة حسب الوحدة') : tr('Received quantity by unit', 'الكمية المستلمة حسب الوحدة'), sub: tr('Net (returns deducted), submitted, stock UOM. Units are never added together.', 'صافي (بعد المرتجعات)، معتمد، وحدة المخزون. لا تجمع الوحدات.'),
        spec: { rows: rows, file: k + '_qty_by_uom', text: function (r) { return r.u; }, cols: [{ h: tr('UOM', 'الوحدة'), r: function (r) { return esc(r.u); }, c: function (r) { return r.u; } }, { h: tr('Quantity', 'الكمية'), num: 1, r: function (r) { return qc(r.q); }, c: function (r) { return r.q; } }] } };
    }
    if (id.indexOf('wh:') === 0) {
      var w = id.slice(3), r0 = (D.wh || []).filter(function (x) { return x.w === w; })[0] || { dn: 0, pr: 0, sop: 0, soo: 0, pop: 0, poo: 0, dq: [], pq: [] };
      return { title: whLabel(w), sub: w, body: '<div class="dms-facts">' + [[tr('Delivery notes', 'إشعارات التسليم'), num(r0.dn)], [tr('Goods receipts', 'الاستلامات'), num(r0.pr)], [tr('Net outgoing', 'صافي الصادر'), uomList(r0.dq)], [tr('Net incoming', 'صافي الوارد'), uomList(r0.pq)], [tr('Open / overdue SOs', 'أوامر بيع مفتوحة / متأخرة'), num(r0.sop) + ' / ' + num(r0.soo)], [tr('Open / overdue POs', 'أوامر شراء مفتوحة / متأخرة'), num(r0.pop) + ' / ' + num(r0.poo)]].map(function (f) { return '<div><span class="dms-sm">' + esc(f[0]) + '</span><b>' + esc(f[1]) + '</b></div>'; }).join('') + '</div>' +
        '<div class="dms-actions-row"><button type="button" class="dms-btn dms-btn-primary" data-act="whgo" data-v="dn|' + esc(w) + '">' + esc(tr('Open delivery notes', 'فتح إشعارات التسليم')) + '</button><button type="button" class="dms-btn" data-act="whgo" data-v="grn|' + esc(w) + '">' + esc(tr('Open goods receipts', 'فتح الاستلامات')) + '</button></div>' };
    }
    if (id.indexOf('cli:') === 0) {
      var ak = id.slice(4), cc = actClient(), x = cc && cc[ak], sp = actSpecs().filter(function (y) { return y.id === ak; })[0];
      if (!x || typeof x === 'string' || !sp) { return null; }
      return { title: sp.title, sub: sp.why + ' ' + tr('Showing ', 'عرض ') + num(x.rows.length) + tr(' of ', ' من ') + num(x.count) + '.', spec: { rows: x.rows.map(x.item), file: ak, text: function (it) { return [it.title, it.desc].join(' '); }, cols: [
        { h: tr('Document', 'المستند'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.name; } },
        { h: tr('Details', 'التفاصيل'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc) + '</span>'; }, c: function (it) { return it.desc; } },
        { h: tr('When', 'متى'), r: function (it) { return '<span class="dms-tone-' + it.tone + '">' + esc(it.due) + '</span>'; }, c: function (it) { return it.due; } }] } };
    }
    return null;
  }
  function nextF(patch) { var nf = {}; APP.filters.forEach(function (f) { nf[f.k] = F[f.k]; }); return Object.assign(nf, patch); }
  function onAct(a, v) {
    if (a === 'kpi' && v.indexOf('dx:') === 0) { var p = v.split(':'), k = p[1]; DX[k] = p[2] === 'all' ? '' : p[2]; LV[k] = 'doc'; goTab(k === 'dn' ? 'dn' : 'grn', false, true); return true; }
    if (a === 'kpi' && v.indexOf('om:') === 0) { var o = v.split(':'); OM.k = o[1]; OM.mode = o[2]; goTab('orders', false, true); return true; }
    if (a === 'kpi' && v.indexOf('party:') === 0) { applyFilters(nextF({ party: v.slice(6) })); return true; }
    if (a === 'lv') { var q = v.split(':'); LV[q[0]] = q[1]; renderSoft(); return true; }
    if (a === 'omk') { OM.k = v; renderSoft(); return true; }
    if (a === 'omm') { OM.mode = v; renderSoft(); return true; }
    if (a === 'whgo') { var i = v.indexOf('|'), wk = v.slice(0, i) === 'dn' ? 'dn' : 'pr'; DX[wk] = ''; LV[wk] = 'item'; closeOverlay(); applyFilters(nextF({ warehouse: v.slice(i + 1) })); goTab(v.slice(0, i), false, true); return true; }
    if (a === 'lnk') {
      var j = v.indexOf('|'), ok = v.slice(0, j), nm = v.slice(j + 1), tk = ok === 'so' ? 'dn' : 'pr'; LNK = { k: ok, name: nm, rows: null }; openDrill('lnk');
      var d = DT[tk].p, ci = DT[tk].c, fields = [Pf(tk) + 'name as name', Pf(tk) + DT[tk].date + ' as date', Pf(tk) + 'docstatus as docstatus', Pf(tk) + 'status as status', Pf(tk) + 'is_return as is_return', Cf(tk) + 'name as rid', Cf(tk) + 'item_code as item', Cf(tk) + 'qty as qty', Cf(tk) + 'uom as uom', Cf(tk) + 'warehouse as wh'];
      var qs = [gl(d, { fields: fields, filters: [[ci, ok === 'so' ? 'against_sales_order' : 'purchase_order', '=', nm]], len: 200, order: Pf(tk) + DT[tk].date + ' desc' })];
      if (ok === 'so') { qs.push(gl(d, { fields: fields, filters: [[d, 'sales_order', '=', nm]], len: 200 })); }
      Promise.all(qs).then(function (res) { if (!LNK || LNK.name !== nm) { return; } var seen = {}, rows = []; [].concat.apply([], res).forEach(function (r) { if (!seen[r.rid]) { seen[r.rid] = 1; rows.push(r); } }); LNK.rows = rows; if (OVL && OVL.dg === 'lnk') { var o2 = drill('lnk'); OVL.body = o2.body; if (o2.spec) { o2.spec.id = 'drill'; o2.spec.pageSize = CFG.modalPage; } OVL.spec = o2.spec; delete TS.drill; renderOverlay(); } },
        function (e) { if (LNK && LNK.name === nm) { LNK.err = errKind(e) === 'perm' ? tr('No permission to read the linked documents.', 'لا صلاحية لقراءة المستندات المرتبطة.') : tr('Could not load the linked documents.', 'تعذر تحميل المستندات المرتبطة.'); if (OVL && OVL.dg === 'lnk') { OVL.body = drill('lnk').body; renderOverlay(); } } });
      return true;
    }
    return false;
  }
  function onInputApp(n) {
    if (n.getAttribute('data-rep')) { RP.i = +n.value; needTab('rep'); renderSoft(); var e1 = HOST.querySelector('[data-rep]'); if (e1) { e1.focus(); } return true; }
    if (n.getAttribute('data-uom')) { RP.uom = n.value; delete D.rep3; run('rep3', REPORTS[3].load); renderSoft(); return true; }
    return false;
  }

  start();
})();

/* ==== DM theme sync (same as tools/erp/shell/dark_theme.py output; maintained here since this block left the generated shell) ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
