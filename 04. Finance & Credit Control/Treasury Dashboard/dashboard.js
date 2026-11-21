/* ===== DM Group KSA — Treasury Dashboard — SCRIPT field · v2 =====
   Reads the API Server Script `treasury_dashboard_data` (role-gated: Accounts Manager, Treasury Manager, System Manager)
   and, for expense claims, frappe.client.get_list. The only write is the minimum cash buffer on the Treasury Dashboard
   settings (frappe.client.set_value), as before. Built on the DM dashboard standard; the shared runtime between the
   "DMS kit" markers is generated from tools/erp/kit/dms-kit.js (edit the kit and run build_kit.py, not the copy). */
(function () {
  'use strict';
  var APP = {
    key: '__dmsTreasury',
    period: 'custom',
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'banks', en: 'Bank & cash accounts', ar: 'الحسابات البنكية والنقدية' },
      { id: 'cash', en: 'Cash flow', ar: 'التدفق النقدي' }, { id: 'ap', en: 'Payables & payments', ar: 'الدائنون والمدفوعات' },
      { id: 'forecast', en: 'Forecast', ar: 'التوقعات' }, { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', none: ['Group (system currency)', 'المجموعة (عملة النظام)'], options: function () { return REF.companies; } },
      { k: 'incl', en: 'Overdue customer receipts', ar: 'مقبوضات العملاء المتأخرة', none: ['Leave out of the forecast', 'استبعادها من التوقع'], options: function () { return [{ v: '1', l: tr('Count as collectible today', 'احتسابها كقابلة للتحصيل اليوم') }]; } }
    ],
    sources: ['d', 'act'],
    dtLabels: { 'Purchase Invoice': ['Supplier invoice', 'فاتورة مورد'], 'Treasury Planned Payment': ['Planned payment', 'دفعة مخططة'], 'Expense Claim': ['Expense claim', 'مطالبة مصروفات'] },
    title: function () { return tr('Treasury', 'الخزينة'); },
    stamp: function () { var d = D.d; return tr('Group cash management', 'إدارة النقد للمجموعة') + (d ? ' · ' + d.currency : ''); },
    filterNote: function () { return tr('The group view covers companies whose currency is the system currency, so balances are never added across currencies. Pick a company to see it in its own currency.', 'عرض المجموعة يشمل الشركات بعملة النظام فقط، فلا تُجمع الأرصدة بعملات مختلفة. اختر شركة لعرضها بعملتها.'); },
    periodNote: function () { return tr('Days up to today show actual bank and cash movements (up to 90 days back). Days after today show the planned forecast (up to 13 weeks).', 'الأيام حتى اليوم تعرض الحركات الفعلية (حتى 90 يومًا). الأيام بعد اليوم تعرض التوقع المخطط (حتى 13 أسبوعًا).'); },
    boot: function () { F.from = addDays(TODAY, -30); F.to = addDays(TODAY, 30); },
    load: function () { loadAll(); },
    onTab: function (id) { if (id === 'forecast') { loadMonth(); } },
    actSpecs: function () { return actSpecs(); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return banner(); },
    content: function (t, AM) { return { overview: tabOverview, banks: tabBanks, cash: tabCash, ap: tabAP, forecast: tabForecast, actions: tabActions }[t](AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v) {
      if (a === 'ack') { var k = dismissed(); k.push(v); try { G.localStorage.setItem('td_dismissed', JSON.stringify(k)); } catch (e) { /* ignore */ } renderSoft(); return true; }
      if (a === 'apb') { APB = v; renderSoft(); var b = HOST.querySelector('[data-act="apb"][data-v="' + v + '"]'); if (b) { b.focus(); } return true; }
      if (a === 'kpi' && v.indexOf('apb:') === 0) { APB = v.slice(4); goTab('ap', false, true); return true; }
      if (a === 'gl') { openGL(v); return true; }
      if (a === 'buffer') { editBuffer(); return true; }
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

  var API = 'treasury_dashboard_data', PI = 'Purchase Invoice', TPP = 'Treasury Planned Payment', EC = 'Expense Claim';
  var REF = { companies: [] }, APB = 'all';

  /* ---------- loaders: one API call for the whole view; the month forecast loads when its tab opens ---------- */
  function windows() {
    var p = PERIOD;
    return { lookback: Math.max(1, Math.min(90, diffDays(p[0], TODAY) + 1)), horizon: Math.max(1, Math.min(91, diffDays(TODAY, p[1]))) };
  }
  function loadAll() {
    run('d', function (chk) {
      var w = windows();
      return guarded(chk, API, { company: F.company, lookback: w.lookback, horizon: w.horizon, include_overdue_receipts: F.incl ? 1 : 0 }).then(function (d) {
        if (!d || !d.summary) { throw new Error('Unexpected response from ' + API); }
        REF.companies = (d.companies || []).map(function (c) { var k = (d.company_currency || {})[c]; return { v: c, l: c + (k && k !== d.currency && !F.company ? ' (' + k + ')' : '') }; });
        return d;
      });
    });
    loadActions(actSpecs());
    if (tab === 'forecast') { loadMonth(); }
  }
  function loadMonth() {
    if (D.fc || D.fcTok) { return; }
    run('fc', function (chk) {
      var ms = monthStart(TODAY), me = monthEnd(TODAY);
      return guarded(chk, API, { company: F.company, lookback: diffDays(ms, TODAY) + 2, horizon: Math.max(1, diffDays(TODAY, me)), include_overdue_receipts: F.incl ? 1 : 0 }).then(function (fc) { return monthWeeks(fc, ms, me); });
    });
  }
  /* This month, week by week (1–7, 8–14, …): days before today are actual, today onward is planned. */
  function monthWeeks(fc, ms, me) {
    var days = {}, buf = fc.summary.buffer;
    (fc.actual_daily || []).forEach(function (r) { if (r.date < TODAY && r.date >= ms) { days[r.date] = { receipts: r.receipts || 0, payments: r.payments || 0, closing: r.closing, actual: 1 }; } });
    (fc.planned_daily || []).forEach(function (r) { if (r.date >= TODAY && r.date <= me) { days[r.date] = { receipts: r.receipts || 0, payments: r.payments != null ? r.payments : (r.ap || 0) + (r.payroll || 0) + (r.other || 0), closing: r.closing, actual: 0 }; } });
    var map = {}, out = [];
    Object.keys(days).sort().forEach(function (dt) {
      var r = days[dt], wk = Math.ceil(parseInt(dt.slice(8, 10), 10) / 7), m = map[wk];
      if (!m) { m = map[wk] = { wk: wk, from: dt, to: dt, receipts: 0, payments: 0, closing: 0, min: r.closing, nA: 0, nP: 0, opening: r.closing - (r.receipts - r.payments) }; out.push(m); }
      m.to = dt; m.receipts += r.receipts; m.payments += r.payments; m.closing = r.closing; m.min = Math.min(m.min, r.closing); if (r.actual) { m.nA++; } else { m.nP++; }
    });
    out.forEach(function (m) { m.net = m.receipts - m.payments; m.below = m.min < buf; m.kind = m.nA && m.nP ? 'both' : m.nA ? 'actual' : 'planned'; });
    return { weeks: out, buffer: buf, currency: fc.currency };
  }

  /* ---------- helpers ---------- */
  function C() { return D.d ? D.d.currency : CUR; }
  function m$(v) { return moneyS(v, C()); }
  function mF(v) { return moneyFull(v, C()); }
  function dismissed() { try { return JSON.parse(G.localStorage.getItem('td_dismissed') || '[]'); } catch (e) { return []; } }
  function liveAccounts(d) { return (d.accounts || []).filter(function (a) { return Math.round(a.balance || 0) !== 0 || Math.round(a.balance_ac || 0) !== 0; }); }
  var APBK = [
    { id: 'overdue', en: 'Overdue', ar: 'متأخر', c: 'var(--dms-bad)', test: function (r) { return !r.on_hold && r.days < 0; } },
    { id: 'd0_7', en: 'Due in 0–7 days', ar: 'خلال 0–7 أيام', c: 'var(--dms-age3)', test: function (r) { return !r.on_hold && r.days >= 0 && r.days <= 7; } },
    { id: 'd8_14', en: '8–14 days', ar: '8–14 يومًا', c: 'var(--dms-age2)', test: function (r) { return !r.on_hold && r.days >= 8 && r.days <= 14; } },
    { id: 'd15_30', en: '15–30 days', ar: '15–30 يومًا', c: 'var(--dms-age1)', test: function (r) { return !r.on_hold && r.days >= 15 && r.days <= 30; } },
    { id: 'd31_60', en: '31–60 days', ar: '31–60 يومًا', c: '#6b8be0', test: function (r) { return !r.on_hold && r.days >= 31 && r.days <= 60; } },
    { id: 'd61_90', en: '61–90 days', ar: '61–90 يومًا', c: 'var(--dms-royal)', test: function (r) { return !r.on_hold && r.days >= 61; } },
    { id: 'hold', en: 'On hold', ar: 'معلّقة', c: '#8a97a8', test: function (r) { return !!r.on_hold; } }
  ];
  function apInvoices(d) { return (d.ap_list || []).filter(function (r) { return Math.round(r.amount || 0) !== 0; }); }
  function apRows(d) { var b = APBK.filter(function (x) { return x.id === APB; })[0]; return apInvoices(d).filter(function (r) { return !b || b.test(r); }); }
  function bySupplier(list) {
    var map = {};
    list.forEach(function (r) {
      var g = map[r.supplier] || (map[r.supplier] = { supplier: r.supplier, n: 0, amount: 0, companies: [], hold: true, overdue: false, oldest: null });
      g.n++; g.amount += r.amount || 0; if (g.companies.indexOf(r.company) < 0) { g.companies.push(r.company); }
      if (!r.on_hold) { g.hold = false; } if (r.days < 0) { g.overdue = true; } if (!g.oldest || r.due_date < g.oldest.due_date) { g.oldest = r; }
    });
    return vals(map).filter(function (g) { return Math.round(g.amount) !== 0; });
  }
  function openGL(v) {
    var p = v.split('\u0001');
    try { frappe.set_route('query-report', 'General Ledger', { company: p[1], account: [p[0]], from_date: addMonths(TODAY, -1).slice(0, 8) + TODAY.slice(8), to_date: TODAY }); }
    catch (e) { G.open('/app/query-report/General Ledger', '_blank'); }
  }
  function editBuffer() {
    var cur = D.d ? D.d.summary.buffer : 0;
    var save = function (v) {
      callP('frappe.client.set_value', { doctype: 'Treasury Dashboard', name: 'Treasury Dashboard', fieldname: 'min_cash_buffer', value: v })
        .then(function () { toast(tr('Minimum cash buffer saved', 'تم حفظ الحد الأدنى للنقد')); reload(); }, function (e) { toast(errKind(e) === 'perm' ? tr('You cannot change the buffer.', 'لا يمكنك تغيير الحد.') : tr('Could not save the buffer.', 'تعذر حفظ الحد.'), true); });
    };
    if (G.frappe && frappe.prompt) { frappe.prompt([{ fieldname: 'v', label: tr('Minimum cash buffer', 'الحد الأدنى للنقد'), fieldtype: 'Currency', reqd: 1, default: cur }], function (vals) { save(vals.v); }, tr('Minimum cash buffer', 'الحد الأدنى للنقد'), tr('Save', 'حفظ')); }
  }

  /* ---------- actions pending: supplier payments, planned payments, expense claims ---------- */
  function actSpecs() {
    var ef = [[EC, 'docstatus', '=', 1], [EC, 'status', '=', 'Unpaid']];
    if (F.company) { ef.push([EC, 'company', '=', F.company]); }
    return [
      { id: 'a_od', client: true, short: tr('Overdue supplier invoices', 'فواتير موردين متأخرة'), title: tr('Supplier invoices past their due date', 'فواتير موردين تجاوزت تاريخ الاستحقاق'), why: tr('Not on hold, due date passed. Oldest first.', 'غير معلّقة، تجاوزت تاريخ الاستحقاق. الأقدم أولًا.') },
      { id: 'a_pp', client: true, short: tr('Planned payments past due', 'دفعات مخططة متأخرة'), title: tr('Planned payments past their date', 'دفعات مخططة تجاوزت تاريخها'), why: tr('Treasury Planned Payments still "Planned" after their date: pay, mark paid or reschedule.', 'دفعات خزينة مخططة ما زالت "مخططة" بعد تاريخها: ادفع أو علّمها مدفوعة أو أعد جدولتها.') },
      { id: 'a_due7', client: true, short: tr('Supplier invoices due in 7 days', 'فواتير موردين تستحق خلال 7 أيام'), title: tr('Supplier invoices due in the next 7 days', 'فواتير موردين تستحق خلال 7 أيام'), why: tr('Not on hold. Plan the payment run.', 'غير معلّقة. خطط لدفعة السداد.') },
      { id: 'a_exp', server: true, dt: EC, short: tr('Unpaid expense claims', 'مطالبات مصروفات غير مدفوعة'), title: tr('Approved expense claims awaiting payment', 'مطالبات مصروفات معتمدة بانتظار الدفع'), why: tr('Submitted, status Unpaid. Amounts in each company’s currency.', 'معتمدة وحالتها غير مدفوعة. المبالغ بعملة كل شركة.'),
        filters: ef, order: 'posting_date asc', fields: ['name', 'employee_name', 'posting_date', 'total_sanctioned_amount', 'total_amount_reimbursed', 'company'],
        table: function () { return { fields: ['name', 'employee_name', 'posting_date', 'total_sanctioned_amount', 'total_amount_reimbursed', 'company'], search: ['name', 'employee_name'], cols: [linkCol(tr('Claim', 'المطالبة'), EC, 'name'), col(tr('Employee', 'الموظف'), 'employee_name'), col(tr('Posting date', 'تاريخ الترحيل'), 'posting_date', { fmt: dtc }), col(tr('Sanctioned', 'المعتمد'), 'total_sanctioned_amount', { num: 1, fmt: amc }), col(tr('Reimbursed', 'المسدد'), 'total_amount_reimbursed', { num: 1, fmt: amc }), col(tr('Company', 'الشركة'), 'company')] }; },
        it: function (r) { var due = (+r.total_sanctioned_amount || 0) - (+r.total_amount_reimbursed || 0); return { p: 'med', score: score('med', due, ageOf(r.posting_date)) - 15, title: r.employee_name || r.name, desc: r.name + ' · ' + amt(due) + ' · ' + r.company, who: r.employee_name, due: agoTxt(r.posting_date, 'Approved', 'منذ'), tone: 'warn' }; } },
      { id: 'a_pp14', client: true, short: tr('Planned payments in 14 days', 'دفعات مخططة خلال 14 يومًا'), title: tr('Planned payments in the next 14 days', 'دفعات مخططة خلال 14 يومًا'), why: tr('Rent, loans, fees and other planned outflows coming up.', 'إيجارات وقروض ورسوم ومدفوعات مخططة قادمة.') },
      { id: 'a_hold', client: true, short: tr('Held invoices past due', 'فواتير معلّقة متأخرة'), title: tr('Supplier invoices on hold past their due date', 'فواتير موردين معلّقة تجاوزت تاريخ الاستحقاق'), why: tr('Review the hold: release or settle the dispute.', 'راجع التعليق: أفرج عنها أو سوِّ الخلاف.') }
    ];
  }
  function actClient() {
    var d = D.d; if (D.dErr) { return 'ERR:' + D.dErr; } if (!d) { return null; }
    var ap = apInvoices(d), pp = (d.scheduled || []).filter(function (r) { return r.dt === TPP && r.dn; });
    var inv = function (p, tone) { return function (r) { return { p: p, score: score(p, r.amount, Math.max(0, -r.days)), dt: PI, name: r.name, title: r.supplier, desc: r.name + (r.bill_no ? ' (' + r.bill_no + ')' : '') + ' · ' + mF(r.amount), who: r.company, due: lateTxt(r.due_date), tone: tone }; }; };
    var ppi = function (p, tone) { return function (r) { return { p: p, score: score(p, r.amount, ageOf(r.date)), dt: TPP, name: r.dn, title: r.label, desc: mF(r.amount) + ' · ' + r.company, who: r.company, due: r.overdue ? lateTxt(r.date) : lateTxt(r.date), tone: tone }; }; };
    return {
      a_od: { rows: ap.filter(function (r) { return !r.on_hold && r.days < 0; }).sort(function (a, b) { return a.days - b.days; }), item: inv('high', 'bad'), kind: 'inv' },
      a_pp: { rows: pp.filter(function (r) { return r.overdue; }), item: ppi('high', 'bad'), kind: 'pp' },
      a_due7: { rows: ap.filter(function (r) { return !r.on_hold && r.days >= 0 && r.days <= 7; }).sort(function (a, b) { return a.days - b.days; }), item: inv('med', 'warn'), kind: 'inv' },
      a_pp14: { rows: pp.filter(function (r) { return !r.overdue && r.date <= addDays(TODAY, 14); }), item: ppi('med', 'warn'), kind: 'pp' },
      a_hold: { rows: ap.filter(function (r) { return r.on_hold && r.days < 0; }).sort(function (a, b) { return a.days - b.days; }), item: inv('low', 'n'), kind: 'inv' }
    };
  }

  /* ---------- tables ---------- */
  function invCols() {
    return [
      { k: 'due_date', h: tr('Due date', 'تاريخ الاستحقاق'), s: function (x) { return x.due_date; }, r: function (x) { return dtc(x.due_date); }, c: function (x) { return x.due_date; } },
      { k: 'name', h: tr('Invoice', 'الفاتورة'), s: function (x) { return x.name; }, r: function (x) { return docLink(PI, x.name); }, c: function (x) { return x.name; } },
      { k: 'supplier', h: tr('Supplier', 'المورد'), s: function (x) { return x.supplier; }, r: function (x) { return bdi(x.supplier); }, c: function (x) { return x.supplier; } },
      { k: 'bill_no', h: tr('Supplier invoice no.', 'رقم فاتورة المورد'), r: function (x) { return txt(x.bill_no); }, c: function (x) { return x.bill_no; } },
      { k: 'company', h: tr('Company', 'الشركة'), s: function (x) { return x.company; }, r: function (x) { return bdi(x.company); }, c: function (x) { return x.company; } },
      { k: 'days', h: tr('Days late', 'أيام التأخير'), num: 1, s: function (x) { return -x.days; }, r: function (x) { return overdueTag(x.due_date); }, c: function (x) { return Math.max(0, -x.days); } },
      { k: 'amount', h: tr('Outstanding', 'المستحق') + ' (' + C() + ')', num: 1, s: function (x) { return x.amount; }, r: function (x) { return '<b class="dms-num">' + esc(amt(x.amount)) + '</b>'; }, c: function (x) { return x.amount; } },
      { k: 'st', h: tr('Status', 'الحالة'), r: function (x) { return x.on_hold ? stat('n', tr('On hold', 'معلّقة')) : x.days < 0 ? stat('bad', tr('Overdue', 'متأخرة')) : stat('ok', tr('Scheduled', 'مجدولة')); }, c: function (x) { return x.on_hold ? 'On hold' : x.days < 0 ? 'Overdue' : 'Scheduled'; } }
    ];
  }
  function invSpec(id, rows, extra) { return Object.assign({ id: id, rows: rows, cols: invCols(), text: function (x) { return [x.name, x.supplier, x.bill_no, x.company].join(' '); }, sk: 'due_date', dir: 1, file: 'supplier_invoices' }, extra || {}); }
  function ppCols() {
    return [
      { k: 'date', h: tr('Date', 'التاريخ'), s: function (x) { return x.date; }, r: function (x) { return dtc(x.date) + (x.overdue ? ' ' + stat('bad', tr('Overdue', 'متأخر')) : ''); }, c: function (x) { return x.date; } },
      { k: 'cat', h: tr('Type', 'النوع'), s: function (x) { return x.cat; }, r: function (x) { return bdi(x.cat === 'Payroll' ? tr('Payroll', 'الرواتب') : tr('Other', 'أخرى')); }, c: function (x) { return x.cat; } },
      { k: 'label', h: tr('Description', 'الوصف'), s: function (x) { return x.label; }, r: function (x) { return bdi(x.label) + (x.est ? ' <span class="dms-sm">' + esc(tr('Estimate from the last payroll', 'تقدير من آخر رواتب')) + '</span>' : ''); }, c: function (x) { return x.label; } },
      { k: 'company', h: tr('Company', 'الشركة'), s: function (x) { return x.company; }, r: function (x) { return bdi(x.company); }, c: function (x) { return x.company; } },
      { k: 'amount', h: tr('Amount', 'المبلغ') + ' (' + C() + ')', num: 1, s: function (x) { return x.amount; }, r: function (x) { return '<span class="dms-num">' + esc(amt(x.amount)) + '</span>'; }, c: function (x) { return x.amount; } },
      { k: 'ref', h: tr('Record', 'السجل'), r: function (x) { return x.dn ? docLink(x.dt, x.dn) : '<span class="dms-sm">—</span>'; }, c: function (x) { return x.dn; } }
    ];
  }
  function drill(id) {
    var d = D.d; if (!d) { return null; }
    if (id.indexOf('cli:') === 0) {
      var s = actSpecs().filter(function (x) { return x.id === id.slice(4); })[0], c = actClient()[id.slice(4)]; if (!s || !c || typeof c === 'string') { return null; }
      return { title: s.title, sub: s.why, spec: c.kind === 'inv' ? invSpec('drill', c.rows, { file: s.id }) : { id: 'drill', rows: c.rows, cols: ppCols(), text: function (x) { return [x.label, x.company, x.dn].join(' '); }, sk: 'date', dir: 1, file: s.id } };
    }
    if (id.indexOf('sup:') === 0) {
      var name = id.slice(4), rows = apInvoices(d).filter(function (r) { return r.supplier === name; });
      return { title: name, sub: tr('Outstanding invoices', 'الفواتير المستحقة') + ' · ' + m$(sum(rows, function (r) { return r.amount; })), spec: invSpec('drill', rows, { file: 'supplier' }) };
    }
    return null;
  }

  /* ---------- views ---------- */
  function banner() {
    var d = D.d, h = ''; if (!d) { return ''; }
    if ((d.other_currency_companies || []).length) { h += alertBox('info', esc(tr('Group view in ' + d.currency + '. Not included (other currency): ', 'عرض المجموعة بعملة ' + d.currency + '. غير مشمولة (عملة أخرى): ') + d.other_currency_companies.join(', ') + '. ' + tr('Choose one of them in Filters to see it in its own currency.', 'اخترها من المرشحات لعرضها بعملتها.'))); }
    var gone = dismissed();
    (d.alerts || []).filter(function (a) { return gone.indexOf(a.key) < 0; }).forEach(function (a) {
      var toAP = /^od/.test(a.key || '');
      h += alertBox(a.level === 'danger' ? 'err' : 'warn', '<b>' + esc(a.title) + '.</b> ' + esc(a.text) + ' ' + (toAP ? '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="apb:overdue">' + esc(tr('View overdue suppliers', 'عرض الموردين المتأخرين')) + '</button> · ' : '') +
        '<button type="button" class="dms-linkbtn" data-act="ack" data-v="' + esc(a.key) + '">' + esc(tr('Acknowledge', 'تم الاطلاع')) + '</button>');
    });
    if ((d.ap_list || []).length >= 500) { h += alertBox('warn', esc(tr('The supplier list shows the first 500 open invoices; totals and aging use all of them.', 'قائمة الموردين تعرض أول 500 فاتورة مفتوحة؛ الإجماليات والأعمار تشمل الكل.'))); }
    return h;
  }
  function lowPoint(d) { var m = null; (d.planned_daily || []).forEach(function (r) { if (!m || r.closing < m.closing) { m = r; } }); return m; }
  function projChart(d) {
    var rows = d.planned_daily || [], keys = rows.map(function (r) { return r.date; }), by = {}; rows.forEach(function (r) { by[r.date] = r; });
    return lineChart(keys, keys.length > 45 ? 'week' : 'day', [{ label: tr('Projected closing', 'الرصيد المتوقع'), color: 'var(--dms-royal)', val: function (k) { return by[k].closing; } }, { label: tr('Minimum buffer', 'الحد الأدنى'), color: 'var(--dms-bad)', dash: 1, val: function () { return d.summary.buffer; } }], mF);
  }
  function actualChart(d) {
    var rows = d.actual_daily || [], keys = rows.map(function (r) { return r.date; }), by = {}; rows.forEach(function (r) { by[r.date] = r; });
    return barChart(keys, 'day', [{ label: tr('Receipts', 'المقبوضات'), color: 'var(--dms-ok)', val: function (k) { return by[k].receipts; } }, { label: tr('Payments', 'المدفوعات'), color: 'var(--dms-bad)', val: function (k) { return by[k].payments; } }], mF, function (k) { return '\n' + tr('Closing balance', 'الرصيد الختامي') + ': ' + mF(by[k].closing); }, tr('No bank or cash movements in this range.', 'لا توجد حركات بنكية أو نقدية في هذا النطاق.'));
  }
  function plannedChart(d) {
    var rows = d.planned_daily || [], keys = rows.map(function (r) { return r.date; }), by = {}; rows.forEach(function (r) { by[r.date] = r; });
    return barChart(keys, 'day', [{ label: tr('Expected receipts', 'المقبوضات المتوقعة'), color: 'var(--dms-ok)', val: function (k) { return by[k].receipts; } }, { label: tr('Planned payments', 'المدفوعات المخططة'), color: 'var(--dms-bad)', val: function (k) { return by[k].payments; } }], mF, function (k) { return '\n' + tr('Projected closing', 'الرصيد المتوقع') + ': ' + mF(by[k].closing); }, tr('Nothing planned in this range.', 'لا شيء مخطط في هذا النطاق.'));
  }
  function tabOverview(AM) {
    var d = D.d, h = '';
    if (D.dErr) { return srcErr(D.dErr, tr('Treasury data (Server Script ' + API + ')', 'بيانات الخزينة (Server Script ' + API + ')')) + actionsPanel(AM); }
    if (!d) { return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>'; }
    var sm = d.summary, cur = d.currency, lp = lowPoint(d), acc = liveAccounts(d), ag = d.ap_aging || {};
    var bankTot = sum(acc.filter(function (a) { return a.type === 'Bank'; }), function (a) { return a.balance; }), cashTot = sum(acc.filter(function (a) { return a.type === 'Cash'; }), function (a) { return a.balance; });
    h += kpis([
      kpi({ label: tr('Cash & bank', 'النقد والبنوك'), val: cur$(sm.total_balance, cur), act: 'goto:banks', top: asOf(), sub: num(acc.length) + ' ' + esc(tr('accounts with a balance', 'حساب برصيد')),
        foot: mixBar([{ label: tr('Bank', 'بنك'), value: Math.max(0, bankTot), color: 'var(--dms-royal)', fmt: m$ }, { label: tr('Cash', 'نقد'), value: Math.max(0, cashTot), color: '#a3b4ef', fmt: m$ }]),
        tip: tr('Sum of GL balances on Bank and Cash accounts up to today, company currency.', 'مجموع أرصدة الأستاذ العام لحسابات البنوك والنقد حتى اليوم، بعملة الشركة.') }),
      kpi({ label: tr('Lowest projected', 'أدنى رصيد متوقع'), dot: lp && lp.closing < sm.buffer ? 'var(--dms-bad)' : 'var(--dms-ok)', val: lp ? cur$(lp.closing, cur) : '—', act: 'goto:forecast',
        top: lp ? (lp.closing < sm.buffer ? stat('bad', tr('Below buffer', 'دون الحد')) : stat('ok', tr('Above buffer', 'فوق الحد'))) : '', sub: lp ? esc(tr('on ', 'في ')) + esc(fmtDate(lp.date, true)) : esc(tr('No forecast days', 'لا أيام توقع')),
        foot: ctx(esc(tr('Minimum buffer', 'الحد الأدنى')) + ' ' + moneyB(sm.buffer, cur)), tip: tr('Lowest projected closing balance within the period after today, against the minimum cash buffer.', 'أدنى رصيد ختامي متوقع خلال الفترة بعد اليوم مقارنة بالحد الأدنى للنقد.') }),
      kpi({ label: tr('Expected receipts · 7 days', 'مقبوضات متوقعة · 7 أيام'), dot: 'var(--dms-ok)', val: cur$(sm.receipts_7d, cur), sub: esc(F.incl ? tr('Includes overdue customer invoices', 'تشمل فواتير العملاء المتأخرة') : tr('Customer invoices due in 7 days', 'فواتير عملاء تستحق خلال 7 أيام')), tip: tr('Outstanding Sales Invoices by due date, in company currency.', 'فواتير المبيعات المستحقة حسب تاريخ الاستحقاق، بعملة الشركة.') }),
      kpi({ label: tr('Planned payments · 7 days', 'مدفوعات مخططة · 7 أيام'), dot: 'var(--dms-bad)', val: cur$(sm.payments_7d, cur), sub: esc(tr('incl.', 'منها')) + ' ' + moneyB(ag.overdue || 0, cur) + ' ' + esc(tr('overdue', 'متأخر')), act: ag.overdue ? 'apb:overdue' : null, tip: tr('Supplier invoices due (overdue counted today), payroll, planned payments and unpaid expense claims.', 'فواتير الموردين المستحقة (المتأخرة تُحتسب اليوم) والرواتب والمدفوعات المخططة ومطالبات المصروفات غير المدفوعة.') }),
      kpi({ label: tr('Open payables', 'الدائنون المفتوحون'), val: cur$(sm.open_ap, cur), act: 'goto:ap', top: ag.overdue ? stat('warn', pct(ag.overdue, sm.open_ap, 0) + ' ' + tr('overdue', 'متأخر')) : '', sub: sm.ap_held ? moneyB(sm.ap_held, cur) + ' ' + esc(tr('on hold', 'معلّقة')) : esc(tr('Nothing on hold', 'لا شيء معلّق')),
        foot: mixBar(APBK.slice(0, 6).map(function (b) { return { label: tr(b.en, b.ar), value: ag[b.id] || 0, color: b.c, fmt: m$ }; }).concat([{ label: tr('Later', 'لاحقًا'), value: ag.later || 0, color: '#cfd6df', fmt: m$ }])) }),
      kpi({ label: tr('Next payroll', 'الرواتب القادمة'), val: sm.payroll_date ? cur$(sm.payroll_amount, cur) : '—', sub: sm.payroll_date ? esc(fmtDate(sm.payroll_date, true)) + (sm.payroll_est ? ' · ' + esc(tr('estimate', 'تقدير')) : '') : esc(tr('No payroll found', 'لا رواتب')),
        top: sm.payroll_date ? tagc(esc(daysTxt(Math.max(0, diffDays(TODAY, sm.payroll_date))))) : '', tip: tr('Salary slips (company base net pay), paid on the last day of the month; months without slips use the latest payroll as an estimate.', 'قسائم الرواتب (صافي الأجر بعملة الشركة) تُدفع آخر الشهر؛ الأشهر بلا قسائم تُقدّر من آخر رواتب.') })
    ], true);
    var meta = esc(cur) + ' · ' + esc(tr('buffer', 'الحد')) + ' ' + moneyB(sm.buffer, cur) + ' · <button type="button" class="dms-linkbtn" data-act="buffer">' + esc(tr('Edit buffer', 'تعديل الحد')) + '</button> · <a class="dms-link" href="/app/treasury-dashboard" target="_blank" rel="noopener noreferrer">' + esc(tr('Settings', 'الإعدادات')) + ' ↗</a>';
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' +
      panel(tr('Projected balance', 'الرصيد المتوقع'), projChart(d), '', meta) +
      panel(tr('Actual receipts and payments', 'المقبوضات والمدفوعات الفعلية'), actualChart(d), '', esc(cur) + ' · ' + esc(tr('internal transfers excluded', 'دون التحويلات الداخلية'))) + '</div></div>';
    var byBank = groupBy(acc, function (a) { return a.bank || (a.type === 'Cash' ? tr('Cash', 'نقد') : tr('No bank set', 'بدون بنك')); }), byCo = groupBy(acc, function (a) { return a.company; });
    h += '<div class="dms-breakdowns">' +
      panel(tr('Payables by due date', 'الدائنون حسب الاستحقاق'), shareList(APBK.map(function (b) { return { label: tr(b.en, b.ar), value: b.id === 'hold' ? sm.ap_held : (ag[b.id] || 0), color: b.c, act: 'apb:' + b.id }; }).concat([{ label: tr('Due after 90 days', 'بعد 90 يومًا'), value: ag.later || 0, color: '#cfd6df' }]), '<b class="dms-num">' + moneyB(sm.open_ap, cur) + '</b> ' + esc(tr('open', 'مفتوح')), money, true)) +
      panel(tr('Balance by bank', 'الرصيد حسب البنك'), hbars(Object.keys(byBank).map(function (k) { return { label: k, value: sum(byBank[k], function (a) { return a.balance; }) }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8), money), '', esc(cur)) +
      panel(tr('Balance by company', 'الرصيد حسب الشركة'), hbars(Object.keys(byCo).map(function (k) { return { label: k, value: sum(byCo[k], function (a) { return a.balance; }) }; }).sort(function (a, b) { return b.value - a.value; }), money), '', esc(cur)) + '</div>';
    return h + note(esc(tr('Balances from GL entries on Bank and Cash accounts. Planned items: customer and supplier invoice due dates, salary slips, approved unpaid expense claims and Treasury Planned Payments. Excluded companies: ', 'الأرصدة من قيود الأستاذ العام لحسابات البنوك والنقد. البنود المخططة: تواريخ استحقاق فواتير العملاء والموردين، قسائم الرواتب، مطالبات المصروفات المعتمدة غير المدفوعة، ودفعات الخزينة المخططة. الشركات المستبعدة: ') + ((d.excluded || []).join(', ') || tr('none', 'لا يوجد'))));
  }
  function need() { return D.dErr ? srcErr(D.dErr, tr('Treasury data', 'بيانات الخزينة')) : !D.d ? skel(1, 'dms-skel-panel') : null; }
  function tabBanks() {
    var n = need(); if (n) { return n; }
    var d = D.d, cur = d.currency, acc = liveAccounts(d);
    var cols = [
      { k: 'account', h: tr('Account', 'الحساب'), s: function (x) { return x.account; }, r: function (x) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="gl" data-v="' + esc(x.account + '\u0001' + x.company) + '" title="' + esc(tr('Open General Ledger', 'فتح دفتر الأستاذ')) + '"><bdi>' + esc(x.account) + '</bdi></button>'; }, c: function (x) { return x.account; } },
      { k: 'bank', h: tr('Bank', 'البنك'), s: function (x) { return x.bank; }, r: function (x) { return txt(x.bank) + (x.acc_no ? '<span class="dms-sm">' + esc(x.acc_no) + '</span>' : ''); }, c: function (x) { return x.bank; } },
      { k: 'company', h: tr('Company', 'الشركة'), s: function (x) { return x.company; }, r: function (x) { return bdi(x.company); }, c: function (x) { return x.company; } },
      { k: 'type', h: tr('Type', 'النوع'), s: function (x) { return x.type; }, r: function (x) { return bdi(x.type === 'Cash' ? tr('Cash', 'نقد') : tr('Bank', 'بنك')); }, c: function (x) { return x.type; } },
      { k: 'bal_ac', h: tr('Balance (account currency)', 'الرصيد (عملة الحساب)'), num: 1, s: function (x) { return x.balance_ac; }, r: function (x) { return '<span class="dms-num">' + esc(amt(x.balance_ac)) + ' <small>' + esc(x.currency) + '</small></span>'; }, c: function (x) { return x.balance_ac + ' ' + x.currency; } },
      { k: 'balance', h: tr('Balance', 'الرصيد') + ' (' + cur + ')', num: 1, s: function (x) { return x.balance; }, r: function (x) { return '<b class="dms-num' + (x.balance < 0 ? ' dms-tone-bad' : '') + '">' + esc(amt(x.balance)) + '</b>'; }, c: function (x) { return x.balance; } },
      { k: 'last', h: tr('Last movement', 'آخر حركة'), s: function (x) { return x.last_txn; }, r: function (x) { return dtc(x.last_txn) + (x.last_txn && ageOf(x.last_txn) > 60 ? '<span class="dms-sm dms-tone-warn">' + esc(daysTxt(ageOf(x.last_txn))) + '</span>' : ''); }, c: function (x) { return x.last_txn; } }
    ];
    var neg = acc.filter(function (a) { return a.balance < 0; });
    return kpis([
      kpi({ label: tr('Bank accounts', 'الحسابات البنكية'), val: cur$(sum(acc.filter(function (a) { return a.type === 'Bank'; }), function (a) { return a.balance; }), cur), sub: num(acc.filter(function (a) { return a.type === 'Bank'; }).length) + ' ' + esc(tr('accounts', 'حساب')) }),
      kpi({ label: tr('Cash accounts', 'حسابات النقد'), val: cur$(sum(acc.filter(function (a) { return a.type === 'Cash'; }), function (a) { return a.balance; }), cur), sub: num(acc.filter(function (a) { return a.type === 'Cash'; }).length) + ' ' + esc(tr('accounts', 'حساب')) }),
      kpi({ label: tr('Overdrawn accounts', 'حسابات مكشوفة'), val: num(neg.length), top: neg.length ? stat('bad', tr('Check', 'راجع')) : stat('ok', tr('None', 'لا يوجد')), sub: neg.length ? moneyB(sum(neg, function (a) { return a.balance; }), cur) : esc(tr('No negative balances', 'لا أرصدة سالبة')) })
    ]) + panel(tr('Bank and cash accounts', 'الحسابات البنكية والنقدية'), regTable({ id: 't_acc', rows: acc, cols: cols, sk: 'balance', dir: -1, file: 'bank_cash_accounts', text: function (x) { return [x.account, x.bank, x.company, x.acc_no].join(' '); },
      foot: function (rows) { return '<tr><td colspan="5">' + esc(tr('Total', 'الإجمالي')) + '</td><td class="dms-td-n"><b class="dms-num">' + esc(amt(sum(rows, function (r) { return r.balance; }))) + '</b></td><td></td></tr>'; } }), '', esc(tr('Accounts with a zero balance are hidden. Select an account for its General Ledger.', 'الحسابات بلا رصيد مخفية. اختر حسابًا لعرض دفتر الأستاذ.')));
  }
  function tabCash() {
    var n = need(); if (n) { return n; }
    var d = D.d, cur = d.currency, A = d.actual_daily || [], P = d.planned_daily || [];
    var aCols = [col(tr('Date', 'التاريخ'), 'date', { fmt: dtc, k: 'date', s: function (x) { return x.date; } }), col(tr('Receipts', 'المقبوضات'), 'receipts', { num: 1, fmt: amc }), col(tr('Payments', 'المدفوعات'), 'payments', { num: 1, fmt: amc }),
      col(tr('Net', 'الصافي'), 'net', { num: 1, fmt: function (v) { return '<span class="dms-num ' + (v < 0 ? 'dms-tone-bad' : '') + '">' + esc(amt(v)) + '</span>'; } }), col(tr('Closing balance', 'الرصيد الختامي'), 'closing', { num: 1, fmt: amc })];
    var pCols = [col(tr('Date', 'التاريخ'), 'date', { fmt: function (v, x) { return dtc(v) + (x.closing < d.summary.buffer ? ' ' + stat('bad', tr('Below buffer', 'دون الحد')) : ''); }, k: 'date', s: function (x) { return x.date; } }), col(tr('Receipts', 'المقبوضات'), 'receipts', { num: 1, fmt: amc }),
      col(tr('Supplier invoices', 'فواتير الموردين'), 'ap', { num: 1, fmt: amc }), col(tr('Payroll', 'الرواتب'), 'payroll', { num: 1, fmt: amc }), col(tr('Other', 'أخرى'), 'other', { num: 1, fmt: amc }), col(tr('Projected closing', 'الرصيد المتوقع'), 'closing', { num: 1, fmt: amc })];
    var ra = sum(A, function (r) { return r.receipts; }), pa = sum(A, function (r) { return r.payments; });
    return kpis([
      kpi({ label: tr('Actual receipts', 'المقبوضات الفعلية'), dot: 'var(--dms-ok)', val: cur$(ra, cur), sub: esc(rangeLabel([A.length ? A[0].date : TODAY, TODAY])) }),
      kpi({ label: tr('Actual payments', 'المدفوعات الفعلية'), dot: 'var(--dms-bad)', val: cur$(pa, cur), sub: esc(tr('Internal transfers excluded', 'دون التحويلات الداخلية')) }),
      kpi({ label: tr('Net actual cash flow', 'صافي التدفق الفعلي'), val: cur$(ra - pa, cur), top: ra - pa < 0 ? stat('bad', tr('Outflow', 'تدفق خارج')) : stat('ok', tr('Inflow', 'تدفق داخل')) }),
      kpi({ label: tr('Planned net', 'الصافي المخطط'), val: cur$(sum(P, function (r) { return r.receipts - r.payments; }), cur), sub: esc(rangeLabel([TODAY, P.length ? P[P.length - 1].date : TODAY])) })
    ]) + '<div class="dms-cols-2 dms-grid">' + panel(tr('Actual daily receipts and payments', 'المقبوضات والمدفوعات اليومية الفعلية'), actualChart(d), '', esc(cur)) + panel(tr('Planned daily cash flow', 'التدفق النقدي اليومي المخطط'), plannedChart(d), '', esc(cur)) + '</div>' +
      panel(tr('Actual by day', 'الفعلي حسب اليوم'), regTable({ id: 't_act', rows: A.slice().reverse(), cols: aCols, file: 'actual_cash_flow', text: function (x) { return x.date; } }), 'dms-mb', esc(cur)) +
      panel(tr('Planned by day', 'المخطط حسب اليوم'), regTable({ id: 't_plan', rows: P, cols: pCols, file: 'planned_cash_flow', text: function (x) { return x.date; } }), '', esc(tr('Overdue supplier invoices are counted on today’s date.', 'فواتير الموردين المتأخرة تُحتسب بتاريخ اليوم.')));
  }
  function tabAP() {
    var n = need(); if (n) { return n; }
    var d = D.d, cur = d.currency, ag = d.ap_aging || {}, all = apInvoices(d);
    var chips = [{ id: 'all', en: 'All open', ar: 'كل المفتوح', v: sum(all, function (r) { return r.amount; }) }].concat(APBK.map(function (b) { return { id: b.id, en: b.en, ar: b.ar, c: b.c, v: sum(all.filter(b.test), function (r) { return r.amount; }) }; }));
    var h = '<div class="dms-chips dms-bchips" role="group" aria-label="' + esc(tr('Due date bucket', 'فئة الاستحقاق')) + '">' + chips.map(function (b) {
      var on = APB === b.id; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="apb" data-v="' + b.id + '">' + (b.c ? '<i class="dms-dot" style="--dms-c:' + b.c + '"></i>' : '') + '<span>' + esc(tr(b.en, b.ar)) + '</span><b class="dms-num">' + esc(money(b.v)) + '</b></button>';
    }).join('') + '</div>';
    var groups = bySupplier(apRows(d));
    var gcols = [
      { k: 'oldest', h: tr('Oldest due date', 'أقدم تاريخ استحقاق'), s: function (x) { return x.oldest.due_date; }, r: function (x) { return dtc(x.oldest.due_date); }, c: function (x) { return x.oldest.due_date; } },
      { k: 'supplier', h: tr('Supplier', 'المورد'), s: function (x) { return x.supplier; }, r: function (x) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="kpi" data-v="sup:' + esc(x.supplier) + '"><bdi>' + esc(x.supplier) + '</bdi></button>'; }, c: function (x) { return x.supplier; } },
      { k: 'days', h: tr('Days late', 'أيام التأخير'), num: 1, s: function (x) { return -x.oldest.days; }, r: function (x) { return overdueTag(x.oldest.due_date); }, c: function (x) { return Math.max(0, -x.oldest.days); } },
      { k: 'n', h: tr('Invoices', 'الفواتير'), num: 1, s: function (x) { return x.n; }, r: function (x) { return '<span class="dms-num">' + num(x.n) + '</span>'; }, c: function (x) { return x.n; } },
      { k: 'amount', h: tr('Outstanding', 'المستحق') + ' (' + cur + ')', num: 1, s: function (x) { return x.amount; }, r: function (x) { return '<b class="dms-num">' + esc(amt(x.amount)) + '</b>'; }, c: function (x) { return x.amount; } },
      { k: 'st', h: tr('Status', 'الحالة'), r: function (x) { return x.hold ? stat('n', tr('On hold', 'معلّقة')) : x.overdue ? stat('bad', tr('Overdue', 'متأخرة')) : stat('ok', tr('Scheduled', 'مجدولة')); }, c: function (x) { return x.hold ? 'On hold' : x.overdue ? 'Overdue' : 'Scheduled'; } },
      { k: 'co', h: tr('Company', 'الشركة'), r: function (x) { return bdi(x.companies.join(', ')); }, c: function (x) { return x.companies.join(' '); } }
    ];
    h += panel(tr('Suppliers by oldest due invoice', 'الموردون حسب أقدم فاتورة مستحقة'), regTable({ id: 't_sup', rows: groups, cols: gcols, sk: 'oldest', dir: 1, file: 'suppliers', text: function (x) { return x.supplier; },
      foot: function (rows) { return '<tr><td colspan="4">' + esc(tr('Total', 'الإجمالي')) + ' (' + num(rows.length) + ')</td><td class="dms-td-n"><b class="dms-num">' + esc(amt(sum(rows, function (r) { return r.amount; }))) + '</b></td><td colspan="2"></td></tr>'; } }), 'dms-mb', esc(tr('Select a supplier for its invoices', 'اختر موردًا لعرض فواتيره')));
    return h + panel(tr('Payroll and other planned outflows', 'الرواتب والمدفوعات المخططة الأخرى'), regTable({ id: 't_sched', rows: d.scheduled || [], cols: ppCols(), sk: 'date', dir: 1, file: 'planned_outflows', text: function (x) { return [x.label, x.company, x.dn].join(' '); }, empty: tr('Nothing scheduled.', 'لا شيء مجدول.') }), '',
      '<a class="dms-link" href="/app/treasury-planned-payment/new" target="_blank" rel="noopener noreferrer">' + esc(tr('+ Planned payment', '+ دفعة مخططة')) + ' ↗</a>');
  }
  function tabForecast() {
    loadMonth();
    var n = need(); if (n) { return n; }
    var d = D.d, cur = d.currency, W = d.weeks || [];
    var wcols = [
      { k: 'week', h: tr('Week', 'الأسبوع'), r: function (x) { return '<span class="dms-num">' + x.week + '</span>'; }, c: function (x) { return x.week; } },
      { k: 'from', h: tr('Dates', 'التواريخ'), r: function (x) { return '<bdi>' + esc(rangeLabel([x.from, x.to])) + '</bdi>'; }, c: function (x) { return x.from + ' - ' + x.to; } },
      col(tr('Opening', 'الافتتاحي'), 'opening', { num: 1, fmt: amc }), col(tr('Receipts', 'المقبوضات'), 'receipts', { num: 1, fmt: amc }), col(tr('Supplier invoices', 'فواتير الموردين'), 'ap', { num: 1, fmt: amc }),
      col(tr('Payroll', 'الرواتب'), 'payroll', { num: 1, fmt: amc }), col(tr('Other', 'أخرى'), 'other', { num: 1, fmt: amc }),
      col(tr('Net', 'الصافي'), 'net', { num: 1, fmt: function (v) { return '<span class="dms-num ' + (v < 0 ? 'dms-tone-bad' : 'dms-ok') + '">' + esc(amt(v)) + '</span>'; } }),
      col(tr('Closing', 'الختامي'), 'closing', { num: 1, fmt: amc }), { h: tr('Buffer', 'الحد'), r: function (x) { return x.below_buffer ? stat('bad', tr('Below', 'دون الحد')) : stat('ok', tr('OK', 'سليم')); }, c: function (x) { return x.below_buffer ? 'Below' : 'OK'; } }
    ];
    var by = {}; W.forEach(function (w) { by[w.from] = w; });
    var h = panel(tr('13-week cash forecast', 'توقع النقد لـ 13 أسبوعًا'), lineChart(W.map(function (w) { return w.from; }), 'week', [{ label: tr('Projected closing', 'الرصيد المتوقع'), color: 'var(--dms-royal)', val: function (k) { return by[k].closing; } }, { label: tr('Minimum buffer', 'الحد الأدنى'), color: 'var(--dms-bad)', dash: 1, val: function () { return d.summary.buffer; } }], mF) +
      regTable({ id: 't_wk', rows: W, cols: wcols, file: 'cash_forecast_13_weeks', text: function (x) { return x.from; } }), 'dms-mb', esc(cur) + ' · ' + esc(tr('from today; overdue items counted in week 1', 'من اليوم؛ المتأخر يُحتسب في الأسبوع 1')));
    var M = D.fc, body;
    if (D.fcErr) { body = srcErr(D.fcErr, tr('Month forecast', 'توقع الشهر')); }
    else if (!M) { body = skel(1, 'dms-skel-panel'); }
    else {
      body = regTable({ id: 't_mon', rows: M.weeks, file: 'treasury_month_weekly_forecast', text: function (x) { return x.from; }, cols: [
        { h: tr('Week', 'الأسبوع'), r: function (x) { return esc(tr('Week ', 'الأسبوع ') + x.wk); }, c: function (x) { return 'Week ' + x.wk; } },
        { h: tr('Dates', 'التواريخ'), r: function (x) { return '<bdi>' + esc(rangeLabel([x.from, x.to])) + '</bdi>'; }, c: function (x) { return x.from + ' - ' + x.to; } },
        { h: tr('Basis', 'الأساس'), r: function (x) { return esc(x.kind === 'both' ? tr('Actual + planned', 'فعلي + مخطط') : x.kind === 'actual' ? tr('Actual', 'فعلي') : tr('Planned', 'مخطط')); }, c: function (x) { return x.kind; } },
        col(tr('Opening', 'الافتتاحي'), 'opening', { num: 1, fmt: amc }), col(tr('Receipts', 'المقبوضات'), 'receipts', { num: 1, fmt: amc }), col(tr('Payments', 'المدفوعات'), 'payments', { num: 1, fmt: amc }),
        col(tr('Net', 'الصافي'), 'net', { num: 1, fmt: function (v) { return '<span class="dms-num ' + (v < 0 ? 'dms-tone-bad' : 'dms-ok') + '">' + esc(amt(v)) + '</span>'; } }), col(tr('Closing', 'الختامي'), 'closing', { num: 1, fmt: amc }),
        { h: tr('Buffer', 'الحد'), r: function (x) { return x.below ? stat('bad', tr('Below', 'دون الحد')) : stat('ok', tr('OK', 'سليم')); }, c: function (x) { return x.below ? 'Below' : 'OK'; } }] });
    }
    return h + panel(tr('This month by week', 'هذا الشهر حسب الأسبوع'), body, '', esc(tr('Weeks 1–7, 8–14, 15–21, 22–28 and 29 to month end. Days before today are actual.', 'الأسابيع 1–7، 8–14، 15–21، 22–28، و29 حتى نهاية الشهر. الأيام قبل اليوم فعلية.')));
  }
  function tabActions(AM) { return actionsTab(AM, tr('Action lists are as of today. Supplier invoices and planned payments come from the treasury data for the selected company or group; expense claims follow the company filter.', 'قوائم الإجراءات حتى اليوم. فواتير الموردين والدفعات المخططة من بيانات الخزينة للشركة أو المجموعة المختارة؛ مطالبات المصروفات تتبع مرشح الشركة.')); }

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
