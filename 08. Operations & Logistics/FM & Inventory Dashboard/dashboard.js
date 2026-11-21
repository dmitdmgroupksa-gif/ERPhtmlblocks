/* ===== DM Group KSA — FM, Inventory & Finance — SCRIPT field · v6 =====
   Aligns the v5 redesign (17 Nov 2026) with the DM dashboard standard. v5's data layer, rules, thresholds, speed work and
   per-user cache are kept; the shell, tables and drawer move onto the shared kit, and one currency per view is added.
   Read-only. Sources (frappe.client.get_list, the user's own permissions):
   FM        : DM Facilities Management · Asset · Asset Repair
   Inventory : Bin · Warehouse · Item · Stock Ledger Entry (last movement in 30 / 90 / 180 / 365-day windows; the site rejects max())
   Finance   : Sales Invoice · Purchase Invoice · Account · GL Entry (grouped) · Payment Entry (grouped) · Company
   The shared runtime between the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js (edit the kit, not the copy). */
(function () {
  'use strict';
  var APP = {
    key: '__dmsFmInv',
    period: 'ytd',
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'fm', en: 'Facilities', ar: 'المرافق' }, { id: 'inventory', en: 'Inventory', ar: 'المخزون' },
      { id: 'finance', en: 'Finance', ar: 'المالية' }, { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', none: ['All system-currency companies', 'كل شركات عملة النظام'], options: function () { return (REF.co || []).map(function (c) { return { v: c.name, l: c.name + (c.default_currency && c.default_currency !== CUR ? ' (' + c.default_currency + ')' : '') }; }); } },
      { k: 'q', en: 'Search', ar: 'بحث', type: 'text', ph: ['Facility, item, party or document', 'المرفق أو الصنف أو الطرف أو المستند'] }
    ],
    sources: ['fm', 'inv', 'fin'],
    dtLabels: { 'DM Facilities Management': ['Facility', 'مرفق'], 'Item': ['Item', 'صنف'], 'Sales Invoice': ['Sales invoice', 'فاتورة مبيعات'], 'Purchase Invoice': ['Purchase invoice', 'فاتورة شراء'], 'Account': ['Account', 'حساب'] },
    title: function () { return tr('FM, Inventory & Finance', 'المرافق والمخزون والمالية'); },
    stamp: function () { return tr('Facilities, stock and money across DM Group', 'المرافق والمخزون والأموال عبر مجموعة DM'); },
    periodNote: function () { return tr('The period applies to revenue, expenses and payments (the last 12 months are loaded). Balances, stock and contracts are as of today.', 'الفترة تطبق على الإيرادات والمصروفات والمدفوعات (تحمّل آخر 12 شهرًا). الأرصدة والمخزون والعقود حتى اليوم.'); },
    filterNote: function () { return tr('Search matches facility, item, party and document names.', 'البحث يطابق أسماء المرافق والأصناف والأطراف والمستندات.'); },
    boot: function () { return boot(); },
    load: function () { loadAll(); },
    afterLoad: function (k) { afterLoad(k); },
    onRefresh: function () { FORCE = true; },
    onPeriod: function () { renderSoft(); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return banner(); },
    content: function (t, AM) { return ({ overview: tabOverview, fm: tabFm, inventory: tabInv, finance: tabFin, actions: tabActions })[t](AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v, n, id) { return onAct(a, v, n, id); }
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

  /* ============================================================ 1. settings (v5) */
  var EXPIRY_SOON_DAYS = 90, DOC_SOON_DAYS = 60, RENT_DUE_DAYS = 30, DEAD_STOCK_DAYS = 180, PAYABLE_SOON_DAYS = 7;
  var DOC_DEFS = [['com_lic_exp', 'Commercial licence', 'الرخصة التجارية'], ['cr_date_to', 'Commercial registration (CR)', 'السجل التجاري'], ['cd_date_to', 'Civil defence (CD)', 'الدفاع المدني'], ['national_adress_expiry', 'National address', 'العنوان الوطني'],
    ['fire_expiry', 'Fire maintenance contract', 'عقد صيانة الحريق'], ['cleanig_exp_date', 'Cleaning contract', 'عقد النظافة'], ['camera_expiry', 'Camera maintenance contract', 'عقد صيانة الكاميرات'], ['industrial_expiry', 'Industrial licence', 'الرخصة الصناعية'],
    ['construction_environmental_permit_expiry', 'Construction environmental permit', 'تصريح بيئي إنشائي'], ['operational_environmental_permit_expiry', 'Operational environmental permit', 'تصريح بيئي تشغيلي']];
  var FM_FIELDS = ['name', 'docstatus', 'modified', 'company', 'facility_detail', 'facility_name', 'facility_catogory', 'facility_contract_status', 'facility_type', 'location', 'area_in_sqm', 'agreement_type', 'contract_number', 'auto_renewal', 'date_frm', 'rentdate_to', 'lease_start', 'lease_end',
    'rent_amount', 'rental_amount', 'rent_installments', 'amount_intallments', 'rent_mode', 'owner_name', 'owner_number', 'additional_notes', 'installment_1_dues_on', 'installment_2_dues_on', 'installment_3_dues_on', 'installment_4_dues_on', 'paid1_not', 'paid2_not', 'paid3_not', 'paid4_not',
    'com_lic_exp', 'cr_date_to', 'cd_date_to', 'national_adress_expiry', 'fire_expiry', 'cleanig_exp_date', 'camera_expiry', 'industrial_expiry', 'construction_environmental_permit_expiry', 'operational_environmental_permit_expiry', 'fire_contractor', 'cleaning_cont', 'camera_contractor', 'fire_layout', 'sign_board', 'medical_kit'];
  var ASSET_FIELDS = ['name', 'asset_name', 'company', 'asset_category', 'location', 'status', 'gross_purchase_amount', 'value_after_depreciation', 'insurance_end_date', 'maintenance_required'];
  var BIN_FIELDS = ['name', 'item_code', 'warehouse', 'actual_qty', 'projected_qty', 'reserved_qty', 'ordered_qty', 'stock_value', 'stock_uom'];
  var WH_FIELDS = ['name', 'warehouse_name', 'company', 'is_group', 'disabled', 'warehouse_type'];
  var ITEM_FIELDS = ['name', 'item_name', 'item_group', 'stock_uom', 'custom_reorder_level_qty', 'safety_stock'];
  var SI_FIELDS = ['name', 'customer', 'customer_name', 'company', 'posting_date', 'due_date', 'base_grand_total', 'outstanding_amount', 'conversion_rate', 'status'];
  var PI_FIELDS = ['name', 'supplier', 'supplier_name', 'company', 'posting_date', 'due_date', 'base_grand_total', 'outstanding_amount', 'conversion_rate', 'status', 'bill_no'];
  var BUCKETS = [['current', 'Not yet due', 'غير مستحق', 'var(--dms-age0)'], ['d30', '1–30 days', '1–30 يومًا', 'var(--dms-age1)'], ['d60', '31–60 days', '31–60 يومًا', 'var(--dms-age2)'], ['d90', '61–90 days', '61–90 يومًا', 'var(--dms-age3)'], ['d180', '91–180 days', '91–180 يومًا', 'var(--dms-age4)'], ['d180p', '> 180 days', 'أكثر من 180 يومًا', 'var(--dms-age5)']];
  var AGE_WINDOWS = [30, 90, 180, 365];

  /* ============================================================ 2. helpers */
  function num0(v) { if (v == null || v === '') { return 0; } var n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
  function sumK(arr, key) { return arr.reduce(function (s, r) { return s + (r[key] || 0); }, 0); }
  function daysTo(d) { return d ? diffDays(TODAY, String(d).slice(0, 10)) : null; }
  function plural(n, one, many) { return num(n) + ' ' + (n === 1 ? one : many || one + 's'); }
  function groupSum(arr, kf, vf) { var m = {}; arr.forEach(function (r) { var k = kf(r) || '—', g = m[k] || (m[k] = { key: k, v: 0, n: 0 }); g.v += vf(r); g.n++; }); return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.v - a.v; }); }
  function shortWh(n) { return String(n || '').replace(/\s+-\s+[A-Z0-9]{2,8}$/, ''); }
  function last12() { var out = []; for (var i = 11; i >= 0; i--) { var k = addMonths(TODAY.slice(0, 7) + '-01', -i).slice(0, 7); out.push({ key: k, from: k + '-01', to: addDays(addMonths(k + '-01', 1), -1) }); } return out; }

  /* ============================================================ 3. scope and state */
  var REF = { co: null };
  function coCur(c) { var x = (REF.co || []).filter(function (y) { return y.name === c; })[0]; return (x && x.default_currency) || CUR; }
  function scopeCos() { var cs = REF.co || []; if (F.company) { return [F.company]; } return cs.filter(function (c) { return (c.default_currency || CUR) === CUR; }).map(function (c) { return c.name; }); }
  function scopeCur() { return F.company ? coCur(F.company) : CUR; }
  function otherCos() { return F.company ? [] : (REF.co || []).filter(function (c) { return (c.default_currency || CUR) !== CUR; }).map(function (c) { return c.name + ' (' + c.default_currency + ')'; }); }
  function inCo(r) { var s = scopeCos(); return F.company ? r._company === F.company : (s.indexOf(r._company) > -1 || r._company === 'Unassigned' || !REF.co || !REF.co.length); }
  function matchQ(parts) { var q = String(F.q || '').trim().toLowerCase(); return !q || parts.join(' ').toLowerCase().indexOf(q) > -1; }
  var RAW = { fm: [], assets: [], repairs: [], bins: [], whs: [], items: {}, lastMove: {}, noAge: true, noAgeWhy: 'pending', si: [], pi: [], cash: [], pl: {}, pe: [], fin12: [], plFail: null };
  var HAVE = { fm: false, inv: false, fin: false }, ERR = { fm: [], inv: [], fin: [] }, CACHED_AT = 0;

  /* ============================================================ 4. data access (v5 loaders on the kit request layer) */
  function fetchList(doctype, fields, filters, opts) {
    opts = opts || {}; var a = { doctype: doctype, fields: fields, filters: filters || [], limit_page_length: opts.limit || 100000 };
    if (opts.order) { a.order_by = opts.order; } if (opts.group) { a.group_by = opts.group; } if (opts.start) { a.limit_start = opts.start; }
    return getList(a, null).then(function (r) { return r || []; });
  }
  function why(label, e) { var k = errKind(e); return k === 'perm' ? tr('No access to ', 'لا صلاحية على ') + label : label + ' — ' + ((e && e.message) || tr('request failed', 'فشل الطلب')); }
  function safe(tab, label, p, fallback) { return p.catch(function (e) { ERR[tab].push(why(label, e)); return fallback; }); }
  function enrichFM(r) {
    r._company = r.company || 'Unassigned';
    var lease = r.agreement_type === 'Lease Agreement' && r.lease_start;
    r._start = (lease ? r.lease_start : r.date_frm) || r.date_frm || r.lease_start || '';
    r._end = (lease && r.lease_end) ? r.lease_end : (r.rentdate_to || r.lease_end || '');
    r._active = r.facility_contract_status !== 'Closed';
    r._days = r._end ? daysTo(r._end) : null;
    r._total = num0(r.rent_amount) || num0(r.rental_amount);
    var yrs = (r._start && r._end) ? diffDays(String(r._start).slice(0, 10), String(r._end).slice(0, 10)) / 365.25 : 0;
    r._annual = yrs > 1.05 ? r._total / yrs : r._total;
    r._area = parseFloat(String(r.area_in_sqm || '').replace(/[^0-9.]/g, '')) || 0;
    r._psqm = r._area ? r._annual / r._area : 0;
    r._type = r.facility_detail || '—'; r._loc = String(r.location || '').trim() || tr('Unspecified', 'غير محدد'); r._name = String(r.facility_name || '').trim() || r.name;
    var n = parseInt(r.rent_installments, 10) || 0, inst = [];
    for (var k = 1; k <= 4; k++) { if (n && k > n) { break; } var due = r['installment_' + k + '_dues_on']; if (!due) { continue; } inst.push({ k: k, due: due, paid: !!r['paid' + k + '_not'], amt: num0(r.amount_intallments) || (n ? r._total / n : r._total) }); }
    r._inst = inst;
    r._instOver = r._active ? inst.filter(function (i) { return !i.paid && i.due < TODAY && (!r._start || i.due >= r._start); }) : [];
    r._instSoon = r._active ? inst.filter(function (i) { return !i.paid && i.due >= TODAY && i.due <= addDays(TODAY, RENT_DUE_DAYS); }) : [];
    r._docs = DOC_DEFS.map(function (d) { var dt = r[d[0]]; return dt ? { key: d[0], label: tr(d[1], d[2]), date: dt, days: daysTo(dt) } : null; }).filter(Boolean);
    r._docBad = r._active ? r._docs.filter(function (d) { return d.days <= DOC_SOON_DAYS; }) : [];
    r._attn = r._active && ((r._days != null && r._days <= EXPIRY_SOON_DAYS) || r._docBad.length > 0 || r._instOver.length > 0);
    return r;
  }
  function loadFM() {
    ERR.fm = [];
    return Promise.all([
      fetchList('DM Facilities Management', FM_FIELDS, [['docstatus', '<', 2]], { order: 'modified desc' }),
      safe('fm', 'Asset', fetchList('Asset', ASSET_FIELDS, [['docstatus', '=', 1], ['status', 'not in', ['Sold', 'Scrapped']]]), []),
      safe('fm', 'Asset Repair', fetchList('Asset Repair', ['name', 'asset', 'company', 'repair_status', 'failure_date', 'total_repair_cost'], [['docstatus', '<', 2], ['repair_status', '=', 'Pending']]), [])
    ]).then(function (res) {
      RAW.fm = res[0].map(enrichFM); RAW.assets = res[1].map(function (r) { r._company = r.company || 'Unassigned'; r._gross = num0(r.gross_purchase_amount); r._nbv = num0(r.value_after_depreciation); return r; });
      RAW.repairs = res[2].map(function (r) { r._company = r.company || 'Unassigned'; return r; }); HAVE.fm = true; return true;
    });
  }
  function fetchItems(codes) { var ch = []; for (var i = 0; i < codes.length; i += 400) { ch.push(codes.slice(i, i + 400)); } return Promise.all(ch.map(function (c) { return fetchList('Item', ITEM_FIELDS, [['name', 'in', c]]); })).then(function (p) { return [].concat.apply([], p); }); }
  function loadInv() {
    ERR.inv = [];
    return Promise.all([fetchList('Bin', BIN_FIELDS, [['actual_qty', '!=', 0]]), safe('inv', tr('Bin (shortages)', 'Bin (النقص)'), fetchList('Bin', BIN_FIELDS, [['actual_qty', '=', 0], ['projected_qty', '<', 0]]), []), safe('inv', 'Warehouse', fetchList('Warehouse', WH_FIELDS, []), [])]).then(function (r0) {
      var codes = {}; r0[0].concat(r0[1]).forEach(function (b) { if (b.item_code) { codes[b.item_code] = 1; } });
      return safe('inv', 'Item', fetchItems(Object.keys(codes)), []).then(function (items) { return r0.concat([items]); });
    }).then(function (res) {
      var wm = {}; res[2].forEach(function (w) { wm[w.name] = w; }); RAW.whs = res[2];
      var seen = {}, bins = []; res[0].concat(res[1]).forEach(function (b) { if (!seen[b.name]) { seen[b.name] = 1; bins.push(b); } });
      bins.forEach(function (b) { var w = wm[b.warehouse]; b._company = (w && w.company) || 'Unassigned'; b._wh = shortWh(b.warehouse); b._qty = num0(b.actual_qty); b._val = num0(b.stock_value); b._res = num0(b.reserved_qty); b._proj = num0(b.projected_qty); b._ord = num0(b.ordered_qty); });
      RAW.bins = bins; var im = {}; res[3].forEach(function (i) { im[i.name] = i; }); RAW.items = im; HAVE.inv = true; return true;
    });
  }
  /* v5: stock age by movement window (count() is permitted, max() is not); lm[item] = smallest window the item moved in */
  function loadLastMovement() {
    return Promise.all(AGE_WINDOWS.map(function (d) { return fetchList('Stock Ledger Entry', ['item_code', 'count(name) as n'], [['is_cancelled', '=', 0], ['posting_date', '>=', addDays(TODAY, -d)]], { group: 'item_code' }); }))
      .then(function (res) { var lm = {}; res.forEach(function (rows, i) { rows.forEach(function (r) { if (r.item_code && lm[r.item_code] == null) { lm[r.item_code] = AGE_WINDOWS[i]; } }); }); RAW.lastMove = lm; RAW.noAge = false; RAW.noAgeWhy = ''; return true; },
        function (e) { RAW.noAge = true; RAW.noAgeWhy = errKind(e) === 'perm' ? 'perm' : 'tech'; ERR.inv.push(why('Stock Ledger Entry', e)); throw e; });
  }
  function enrichInvoice(r, kind) {
    r._kind = kind; r._party = (kind === 'AR' ? (r.customer_name || r.customer) : (r.supplier_name || r.supplier)) || '—'; r._company = r.company || 'Unassigned';
    r._out = num0(r.outstanding_amount) * (num0(r.conversion_rate) || 1); r._total = num0(r.base_grand_total); r._due = r.due_date || r.posting_date;
    r._overdue = !!(r._due && r._due < TODAY); r._days = r._overdue ? diffDays(r._due, TODAY) : 0;
    r._bucket = !r._overdue ? 'current' : r._days <= 30 ? 'd30' : r._days <= 60 ? 'd60' : r._days <= 90 ? 'd90' : r._days <= 180 ? 'd180' : 'd180p';
    return r;
  }
  function loadFin() {
    ERR.fin = []; var months = last12(); RAW.plFail = null;
    var glP = months.map(function (m) { return fetchList('GL Entry', ['account', 'sum(debit) as debit', 'sum(credit) as credit'], [['posting_date', 'between', [m.from, m.to]], ['is_cancelled', '=', 0], ['voucher_type', '!=', 'Period Closing Voucher']], { group: 'account' }).catch(function (e) { RAW.plFail = RAW.plFail || { n: 0, months: [], why: '' }; RAW.plFail.n++; RAW.plFail.months.push(m.key); RAW.plFail.why = errKind(e) === 'perm' ? tr('No access to GL Entry', 'لا صلاحية على قيود الأستاذ') : (e.message || ''); return null; }); });
    return Promise.all([
      fetchList('Sales Invoice', SI_FIELDS, [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]),
      safe('fin', 'Purchase Invoice', fetchList('Purchase Invoice', PI_FIELDS, [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]), []),
      safe('fin', tr('Account (bank / cash)', 'الحساب (بنك / نقد)'), fetchList('Account', ['name', 'account_name', 'company', 'account_type'], [['account_type', 'in', ['Bank', 'Cash']], ['is_group', '=', 0], ['disabled', '=', 0]]), []),
      safe('fin', tr('Account (profit & loss)', 'الحساب (الأرباح والخسائر)'), fetchList('Account', ['name', 'company', 'root_type'], [['report_type', '=', 'Profit and Loss'], ['is_group', '=', 0]]), []),
      safe('fin', 'Payment Entry', Promise.all(months.map(function (m) { return fetchList('Payment Entry', ['company', 'payment_type', 'sum(base_paid_amount) as base_paid_amount', 'sum(base_received_amount) as base_received_amount'], [['docstatus', '=', 1], ['posting_date', 'between', [m.from, m.to]], ['payment_type', 'in', ['Receive', 'Pay']]], { group: 'company, payment_type' }).then(function (rows) { rows.forEach(function (r) { r._m = m.key; }); return rows; }); })).then(function (p) { return [].concat.apply([], p); }), []),
      Promise.all(glP)
    ]).then(function (res) {
      RAW.si = res[0].map(function (r) { return enrichInvoice(r, 'AR'); }); RAW.pi = res[1].map(function (r) { return enrichInvoice(r, 'AP'); });
      RAW.cash = res[2].map(function (a) { a._company = a.company || 'Unassigned'; a._bal = 0; return a; }); RAW.pe = res[4].map(function (p) { p._company = p.company || 'Unassigned'; return p; });
      var acc = {}; res[3].forEach(function (a) { acc[a.name] = a; }); var pl = {};
      months.forEach(function (m, i) { pl[m.key] = {}; (res[5][i] || []).forEach(function (row) { var a = acc[row.account]; if (!a) { return; } var co = a.company || 'Unassigned', c = pl[m.key][co] || (pl[m.key][co] = { rev: 0, exp: 0 }); if (a.root_type === 'Income') { c.rev += num0(row.credit) - num0(row.debit); } else if (a.root_type === 'Expense') { c.exp += num0(row.debit) - num0(row.credit); } }); });
      RAW.pl = pl; RAW.fin12 = months;
      if (RAW.plFail) { ERR.fin.push('GL Entry — ' + RAW.plFail.n + tr(' of 12 months failed (', ' من 12 شهرًا فشلت (') + RAW.plFail.why + ')'); }
      if (!res[3].length) { RAW.plFail = RAW.plFail || { n: 12, months: [], why: tr('no income / expense accounts could be read', 'تعذرت قراءة حسابات الإيرادات والمصروفات') }; }
      if (!RAW.cash.length) { HAVE.fin = true; return true; }
      return fetchList('GL Entry', ['account', 'sum(debit) as debit', 'sum(credit) as credit'], [['account', 'in', RAW.cash.map(function (a) { return a.name; })], ['is_cancelled', '=', 0]], { group: 'account' })
        .then(function (rows) { var bm = {}; rows.forEach(function (r) { bm[r.account] = num0(r.debit) - num0(r.credit); }); RAW.cash.forEach(function (a) { a._bal = bm[a.name] || 0; }); }, function () { ERR.fin.push(tr('GL Entry (cash balances)', 'قيود الأستاذ (أرصدة النقد)')); RAW.cashErr = true; })
        .then(function () { HAVE.fin = true; return true; });
    });
  }
  /* v5 per-viewer cache (this browser only, same day, 12 h): saved data shows at once while fresh data loads */
  var CACHE_KEY = 'fif-cache-v2:' + ((G.frappe && frappe.session && frappe.session.user) || 'user'), CACHE_MAX = 12 * 3600 * 1000;
  function saveCache() { if (!HAVE.fm || !HAVE.inv || !HAVE.fin) { return; } try { G.localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), today: TODAY, raw: RAW })); } catch (e) { try { G.localStorage.removeItem(CACHE_KEY); } catch (x) { /* storage unavailable */ } } }
  function loadCache() { try { var c = JSON.parse(G.localStorage.getItem(CACHE_KEY) || 'null'); if (!c || !c.raw || Date.now() - c.t > CACHE_MAX || c.today !== TODAY) { return; } Object.keys(c.raw).forEach(function (k) { RAW[k] = c.raw[k]; }); HAVE.fm = HAVE.inv = HAVE.fin = true; CACHED_AT = c.t; } catch (e) { /* ignore */ } }
  function boot() { loadCache(); return getList({ doctype: 'Company', fields: ['name', 'default_currency'], limit_page_length: 0, order_by: 'name asc' }, null).then(function (r) { REF.co = r || []; }, function () { REF.co = []; }); }
  /* Filters are applied client-side (v5): data is fetched on the first load and on Refresh only. */
  var FORCE = false, FRESH = false;
  function loadAll() {
    if (FRESH && !FORCE) { ['fm', 'inv', 'age', 'fin'].forEach(function (k) { run(k, function () { return Promise.resolve(true); }); }); return; }
    FORCE = false;
    run('fm', function () { return loadFM(); });
    run('inv', function () { return loadInv(); });
    run('age', function () { return loadLastMovement(); });
    run('fin', function () { return loadFin(); });
  }
  function afterLoad() { if (D.fm && D.inv && D.fin && !FRESH) { FRESH = true; CACHED_AT = 0; saveCache(); } else if (D.fm && D.inv && D.fin && D.age) { saveCache(); } }

  /* ============================================================ 5. derived views (v5 rules) */
  function fmRows() { return RAW.fm.filter(function (r) { return inCo(r) && matchQ([r._name, r.name, r._loc, r.owner_name, r._company, r._type, r.contract_number]); }); }
  function fmStats() {
    var Fr = fmRows(), A = Fr.filter(function (r) { return r._active; }), s = { F: Fr, A: A };
    s.annual = sumK(A, '_annual'); s.area = sumK(A, '_area');
    var aw = A.filter(function (r) { return r._area > 0 && r._annual > 0; }); s.psqm = sumK(aw, '_area') ? sumK(aw, '_annual') / sumK(aw, '_area') : 0;
    s.exp90 = A.filter(function (r) { return r._days != null && r._days >= 0 && r._days <= EXPIRY_SOON_DAYS; }); s.expired = A.filter(function (r) { return r._days != null && r._days < 0; }); s.nodate = A.filter(function (r) { return r._days == null; });
    s.instOver = []; s.instSoon = []; A.forEach(function (r) { r._instOver.forEach(function (i) { s.instOver.push({ r: r, i: i }); }); r._instSoon.forEach(function (i) { s.instSoon.push({ r: r, i: i }); }); });
    s.instOverAmt = s.instOver.reduce(function (t, x) { return t + x.i.amt; }, 0); s.instSoonAmt = s.instSoon.reduce(function (t, x) { return t + x.i.amt; }, 0);
    s.docs = []; A.forEach(function (r) { r._docBad.forEach(function (d) { s.docs.push({ r: r, d: d }); }); });
    s.docsExpired = s.docs.filter(function (x) { return x.d.days < 0; }).length; s.docsSoon = s.docs.length - s.docsExpired;
    return s;
  }
  var HEALTH = { neg: ['Negative stock', 'مخزون سالب', 'bad', 'var(--dms-age5)'], short: ['Shortage', 'نقص', 'bad', 'var(--dms-bad)'], low: ['Low stock', 'مخزون منخفض', 'warn', 'var(--dms-age3)'], dead: ['Dead stock', 'مخزون راكد', 'n', '#8a97a8'], ok: ['Healthy', 'سليم', 'ok', 'var(--dms-ok)'] };
  var AGE_B = [['a30', '0–30 days', '0–30 يومًا', 'var(--dms-age0)', 30], ['a90', '31–90 days', '31–90 يومًا', 'var(--dms-age2)', 90], ['a180', '91–180 days', '91–180 يومًا', 'var(--dms-age3)', 180], ['a365', '181–365 days', '181–365 يومًا', 'var(--dms-age4)', 365], ['a365p', '> 1 year', 'أكثر من سنة', 'var(--dms-age5)', 400]];
  function ageLabel(w) { return w === 30 ? tr('Within 30 days', 'خلال 30 يومًا') : w === 90 ? tr('31–90 days ago', 'قبل 31–90 يومًا') : w === 180 ? tr('91–180 days ago', 'قبل 91–180 يومًا') : w === 365 ? tr('181–365 days ago', 'قبل 181–365 يومًا') : tr('Over 1 year ago', 'قبل أكثر من سنة'); }
  function invItems() {
    var bins = RAW.bins.filter(inCo), im = RAW.items, lm = RAW.lastMove, m = {};
    bins.forEach(function (b) { var it = im[b.item_code] || {}, g = m[b.item_code] || (m[b.item_code] = { name: b.item_code, _title: it.item_name || b.item_code, group: it.item_group || '—', uom: b.stock_uom || it.stock_uom || '', qty: 0, value: 0, reserved: 0, ordered: 0, projected: 0, reorder: num0(it.custom_reorder_level_qty) || num0(it.safety_stock) || 0, whs: [] }); g.qty += b._qty; g.value += b._val; g.reserved += b._res; g.ordered += b._ord; g.projected += b._proj; g.whs.push(b); });
    return Object.keys(m).map(function (k) {
      var g = m[k], win = lm[k]; g.days = RAW.noAge ? null : (win || 400); g.ageLabel = RAW.noAge ? '' : ageLabel(win); g.nwh = g.whs.length;
      var neg = g.whs.some(function (b) { return b._qty < 0; });
      g.health = neg ? 'neg' : g.projected < 0 ? 'short' : (g.reorder > 0 && g.qty <= g.reorder) ? 'low' : (!RAW.noAge && g.qty > 0 && g.value > 0 && g.days > DEAD_STOCK_DAYS) ? 'dead' : 'ok';
      g._age = (g.qty > 0 && g.value > 0 && g.days != null) ? AGE_B.filter(function (b) { return g.days <= b[4]; })[0][0] : '';
      return g;
    }).filter(function (g) { return matchQ([g.name, g._title, g.group, g.whs.map(function (b) { return b._wh; }).join(' ')]); });
  }
  function invStats() {
    var I = invItems(), s = { I: I }, pos = I.filter(function (g) { return g.qty > 0; }), whs = {};
    s.value = sumK(I, 'value'); s.itemsInStock = pos.length; RAW.bins.filter(inCo).forEach(function (b) { if (b._qty > 0) { whs[b.warehouse] = 1; } }); s.whCount = Object.keys(whs).length;
    s.top10 = pos.slice().sort(function (a, b) { return b.value - a.value; }).slice(0, 10); s.top10Val = sumK(s.top10, 'value');
    ['low', 'short', 'neg', 'dead'].forEach(function (h) { s[h] = I.filter(function (g) { return g.health === h; }); s[h + 'Val'] = sumK(s[h], 'value'); });
    return s;
  }
  function periodKeys() { var a = PERIOD[0].slice(0, 7), b = PERIOD[1].slice(0, 7); return (RAW.fin12 || []).map(function (x) { return x.key; }).filter(function (k) { return k >= a && k <= b; }); }
  function plSum(keys) { var out = { rev: 0, exp: 0, byCo: {} }; keys.forEach(function (k) { var cell = RAW.pl[k] || {}; Object.keys(cell).forEach(function (co) { if (!inCo({ _company: co })) { return; } out.rev += cell[co].rev; out.exp += cell[co].exp; var g = out.byCo[co] || (out.byCo[co] = { rev: 0, exp: 0 }); g.rev += cell[co].rev; g.exp += cell[co].exp; }); }); return out; }
  function finStats() {
    var f = function (r) { return inCo(r) && matchQ([r._party, r.name, r.bill_no || '', r._company]); }, AR = RAW.si.filter(f), AP = RAW.pi.filter(f), cash = RAW.cash.filter(inCo), keys = periodKeys(), pl = plSum(keys);
    var s = { AR: AR, AP: AP, cash: cash, keys: keys, pl: pl, net: pl.rev - pl.exp, cashTot: sumK(cash, '_bal'), arTot: sumK(AR, '_out'), apTot: sumK(AP, '_out') };
    s.arOver = AR.filter(function (r) { return r._overdue; }); s.apOver = AP.filter(function (r) { return r._overdue; }); s.arOverAmt = sumK(s.arOver, '_out'); s.apOverAmt = sumK(s.apOver, '_out');
    s.apSoon = AP.filter(function (r) { return r._due >= TODAY && r._due <= addDays(TODAY, PAYABLE_SOON_DAYS); });
    return s;
  }

  /* ============================================================ 6. actions pending (v5 "Needs attention" lists) */
  function actSpecs() {
    return [
      { id: 'a_fmend', client: true, short: tr('Facility contracts ending', 'عقود مرافق تنتهي'), title: tr('Facility contracts past their end date or ending within ' + EXPIRY_SOON_DAYS + ' days', 'عقود مرافق انتهت أو تنتهي خلال ' + EXPIRY_SOON_DAYS + ' يومًا'), why: tr('Active contracts. Renew the agreement or mark the facility Closed.', 'عقود نشطة. جدد العقد أو أغلق المرفق.') },
      { id: 'a_fmdoc', client: true, short: tr('Licences and permits', 'التراخيص والتصاريح'), title: tr('Licences / permits expired or expiring within ' + DOC_SOON_DAYS + ' days', 'تراخيص / تصاريح منتهية أو تنتهي خلال ' + DOC_SOON_DAYS + ' يومًا'), why: tr('Commercial licence, CR, civil defence, national address, service contracts and permits on active facilities.', 'الرخصة التجارية والسجل والدفاع المدني والعنوان الوطني وعقود الخدمات والتصاريح على المرافق النشطة.') },
      { id: 'a_fmrent', client: true, short: tr('Rent instalments', 'أقساط الإيجار'), title: tr('Rent instalments not marked paid', 'أقساط إيجار غير مسددة'), why: tr('Past due, or due within ' + RENT_DUE_DAYS + ' days, by the Paid tick-boxes on each facility.', 'متأخرة أو مستحقة خلال ' + RENT_DUE_DAYS + ' يومًا، حسب خانات السداد في كل مرفق.') },
      { id: 'a_short', client: true, short: tr('Shortage or negative stock', 'نقص أو مخزون سالب'), title: tr('Items short (projected qty below zero) or negative in a warehouse', 'أصناف ناقصة (المتوقع أقل من صفر) أو سالبة في مستودع'), why: tr('Post the missing receipt, correct the stock or raise a request.', 'رحّل الاستلام الناقص أو صحح المخزون أو أنشئ طلبًا.') },
      { id: 'a_low', client: true, short: tr('Low stock', 'مخزون منخفض'), title: tr('Items at or below their reorder level', 'أصناف عند حد إعادة الطلب أو أقل'), why: tr('Reorder level from the item (custom reorder level, else safety stock).', 'حد إعادة الطلب من الصنف (الحد المخصص وإلا مخزون الأمان).') },
      { id: 'a_ar', client: true, short: tr('Overdue receivables', 'مستحقات متأخرة'), title: tr('Customer invoices past their due date', 'فواتير عملاء تجاوزت الاستحقاق'), why: tr('Largest first. Chase or escalate.', 'الأكبر أولًا. تابع أو صعّد.') },
      { id: 'a_ap', client: true, short: tr('Payables due', 'مدفوعات مستحقة'), title: tr('Supplier bills overdue or due within ' + PAYABLE_SOON_DAYS + ' days', 'فواتير موردين متأخرة أو مستحقة خلال ' + PAYABLE_SOON_DAYS + ' أيام'), why: tr('Earliest due first.', 'الأقرب استحقاقًا أولًا.') },
      { id: 'a_cash', client: true, short: tr('Negative cash / bank', 'نقد / بنك سالب'), title: tr('Bank and cash accounts with a negative balance', 'حسابات بنك ونقد برصيد سالب'), why: tr('GL balance below zero.', 'رصيد الأستاذ أقل من صفر.') }
    ];
  }
  function actClient() {
    var o = {};
    if (D.fmErr) { ['a_fmend', 'a_fmdoc', 'a_fmrent'].forEach(function (k) { o[k] = 'ERR:' + D.fmErr; }); }
    else if (HAVE.fm) {
      var s = fmStats(), con = s.A.filter(function (r) { return r._days != null && r._days <= EXPIRY_SOON_DAYS; }).sort(function (a, b) { return a._days - b._days; });
      o.a_fmend = { rows: con, count: con.length, item: function (r) { var p = r._days < 0 ? 'high' : r._days <= 30 ? 'med' : 'low'; return { p: p, score: score(p, r._annual, Math.max(0, -r._days)), dt: 'DM Facilities Management', name: r.name, title: r._name, desc: [r._type, r._loc].join(' · '), who: r._company, due: r._days < 0 ? tr('Ended ' + daysTxt(-r._days) + ' ago', 'انتهى قبل ' + daysTxt(-r._days)) : tr('Ends in ' + daysTxt(r._days), 'ينتهي خلال ' + daysTxt(r._days)), tone: r._days < 0 ? 'bad' : 'warn' }; } };
      var docs = s.docs.slice().sort(function (a, b) { return a.d.days - b.d.days; });
      o.a_fmdoc = { rows: docs, count: docs.length, item: function (x) { var p = x.d.days < 0 ? 'high' : 'med'; return { p: p, score: score(p, 0, Math.max(0, -x.d.days)), dt: 'DM Facilities Management', name: x.r.name, title: x.r._name, desc: x.d.label, who: x.r._company, due: x.d.days < 0 ? tr('Expired ' + fmtD(x.d.date), 'انتهى ' + fmtD(x.d.date)) : tr('Expires ' + fmtD(x.d.date), 'ينتهي ' + fmtD(x.d.date)), tone: x.d.days < 0 ? 'bad' : 'warn' }; } };
      var rent = s.instOver.map(function (x) { return { r: x.r, i: x.i, over: true }; }).concat(s.instSoon.map(function (x) { return { r: x.r, i: x.i, over: false }; })).sort(function (a, b) { return a.i.due < b.i.due ? -1 : 1; });
      o.a_fmrent = { rows: rent, count: rent.length, item: function (x) { var p = x.over ? 'med' : 'low'; return { p: p, score: score(p, x.i.amt, Math.max(0, -daysTo(x.i.due))), dt: 'DM Facilities Management', name: x.r.name, title: x.r._name, desc: tr('Instalment ', 'القسط ') + x.i.k + ' · ' + moneyS(x.i.amt, coCur(x.r._company)), who: x.r._company, due: (x.over ? tr('Not paid · due ', 'غير مسدد · ') : tr('Due ', 'يستحق ')) + fmtD(x.i.due), tone: x.over ? 'bad' : 'warn' }; } };
    }
    if (D.invErr) { ['a_short', 'a_low'].forEach(function (k) { o[k] = 'ERR:' + D.invErr; }); }
    else if (HAVE.inv) {
      var v = invStats(), sh = v.neg.concat(v.short).sort(function (a, b) { return Math.min(a.projected, a.qty) - Math.min(b.projected, b.qty); });
      o.a_short = { rows: sh, count: sh.length, item: function (g) { return { p: 'high', score: score('high', g.value, 0), dt: 'Item', name: g.name, title: g._title, desc: g.name + ' · ' + g.group, who: plural(g.nwh, tr('warehouse', 'مستودع'), tr('warehouses', 'مستودعات')), due: g.health === 'neg' ? tr('Negative ', 'سالب ') + '⁦' + amtq(g.qty) + ' ' + g.uom + '⁩' : tr('Short ', 'نقص ') + '⁦' + amtq(-g.projected) + ' ' + g.uom + '⁩', tone: 'bad' }; } };
      var lw = v.low.slice().sort(function (a, b) { return (a.qty / (a.reorder || 1)) - (b.qty / (b.reorder || 1)); });
      o.a_low = { rows: lw, count: lw.length, item: function (g) { return { p: 'med', score: score('med', g.value, 0), dt: 'Item', name: g.name, title: g._title, desc: g.name + ' · ' + g.group, who: null, due: '⁦' + amtq(g.qty) + ' / ' + amtq(g.reorder) + ' ' + g.uom + '⁩', tone: 'warn' }; } };
    }
    if (D.finErr) { ['a_ar', 'a_ap', 'a_cash'].forEach(function (k) { o[k] = 'ERR:' + D.finErr; }); }
    else if (HAVE.fin) {
      var n = finStats(), inv = function (dt, p) { return function (r) { return { p: p, score: score(p, r._out, r._days), dt: dt, name: r.name, title: r._party, desc: r.name + ' · ' + moneyS(r._out, coCur(r._company)), who: r._company, due: r._overdue ? tr(daysTxt(r._days) + ' late', 'متأخر ' + daysTxt(r._days)) : tr('Due ', 'يستحق ') + fmtD(r._due), tone: r._overdue ? 'bad' : 'warn' }; }; };
      var ar = n.arOver.slice().sort(function (a, b) { return b._out - a._out; }), ap = n.apOver.concat(n.apSoon).sort(function (a, b) { return a._due < b._due ? -1 : 1; }), neg = n.cash.filter(function (a) { return a._bal < 0; }).sort(function (a, b) { return a._bal - b._bal; });
      o.a_ar = { rows: ar, count: ar.length, item: inv('Sales Invoice', 'high') }; o.a_ap = { rows: ap, count: ap.length, item: inv('Purchase Invoice', 'med') };
      o.a_cash = RAW.cashErr ? 'ERR:tech' : { rows: neg, count: neg.length, item: function (a) { return { p: 'low', score: score('low', -a._bal, 0), dt: 'Account', name: a.name, title: a.account_name || a.name, desc: a.account_type, who: a._company, due: moneyS(a._bal, coCur(a._company)), tone: 'bad' }; } };
    }
    return Object.keys(o).length ? o : null;
  }

  /* ============================================================ 7. shared pieces */
  function amtq(v) { return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function fmtD(d) { return d ? String(d).slice(0, 10) : '—'; }
  function banner() {
    var h = '', o = otherCos(), errs = [].concat(tab === 'fm' ? ERR.fm : tab === 'inventory' ? ERR.inv : tab === 'finance' ? ERR.fin : ERR.fm.concat(ERR.inv, ERR.fin));
    if (CACHED_AT && busy()) { var t = new Date(CACHED_AT); h += alertBox('info', esc(tr('Showing saved data from ', 'عرض البيانات المحفوظة من ') + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) + tr(' while fresh data loads.', ' أثناء تحميل البيانات الحديثة.'))); }
    if (o.length) { h += alertBox('info', esc(tr('Amounts are in ', 'المبالغ بعملة ') + scopeCur() + tr('. Companies in another currency are not included: ', '. الشركات بعملة أخرى غير مشمولة: ') + o.join(', ') + tr('. Pick one in Filters to see it on its own.', '. اخترها من المرشحات لعرضها منفردة.'))); }
    var stale = ['fm', 'inv', 'fin'].filter(function (k) { return D[k + 'Err'] && HAVE[k]; });
    if (stale.length) { h += alertBox('warn', esc(tr('Refresh failed (source unavailable); showing the last loaded data for ', 'فشل التحديث (المصدر غير متاح)؛ تظهر آخر بيانات محملة لـ ') + stale.map(function (k) { return { fm: tr('facilities', 'المرافق'), inv: tr('inventory', 'المخزون'), fin: tr('finance', 'المالية') }[k]; }).join(', ') + '.')); }
    if (errs.length) { h += alertBox('warn', '<b>' + esc(tr('Some data could not be loaded: ', 'تعذر تحميل بعض البيانات: ')) + '</b>' + esc(errs.join(' · '))); }
    return h;
  }
  function need(k, AM) {
    if (D[k + 'Err'] && !HAVE[k]) { return srcErr(D[k + 'Err'], k === 'fm' ? 'DM Facilities Management' : k === 'inv' ? 'Bin' : 'Sales Invoice') + (AM ? actionsPanel(AM) : ''); }
    if (!HAVE[k]) { return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div>' + (AM ? '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>' : '<div class="dms-skel dms-skel-panel"></div>'); }
    return '';
  }
  function facts(rows) { return '<div class="dms-facts fi-facts">' + rows.map(function (r) { return '<div><span class="dms-sm">' + esc(r[0]) + '</span><b class="dms-num' + (r[2] ? ' dms-tone-' + r[2] : '') + '">' + r[1] + '</b></div>'; }).join('') + '</div>'; }
  function m$(v) { return cur$(v, scopeCur()); }
  function mm(v) { return esc(money(v)) + ' <small>' + esc(scopeCur()) + '</small>'; }
  var QF = { fm: '', inventory: '', finance: '' };
  function chips(t, list) { return '<div class="fi-qf" role="group">' + list.map(function (q) { return '<button type="button" class="dms-btn dms-btn-sm' + (QF[t] === q[0] ? ' dms-btn-primary' : '') + '" data-act="qf" data-v="' + t + ':' + q[0] + '" aria-pressed="' + (QF[t] === q[0]) + '">' + esc(q[1]) + '</button>'; }).join('') + '</div>'; }
  function monthsBar(keys, series, fmt) { return barChart(keys, 'month', series, fmt || money); }

  /* ============================================================ 8. overview */
  function tabOverview(AM) {
    if (!HAVE.fm && !HAVE.inv && !HAVE.fin) { return D.fmErr && D.invErr && D.finErr ? srcErr(D.fmErr, 'DM Facilities Management') + actionsPanel(AM) : need('fm', AM); }
    var f = HAVE.fm ? fmStats() : null, v = HAVE.inv ? invStats() : null, n = HAVE.fin ? finStats() : null, na = function (x, k) { return x ? null : (D[k + 'Err'] ? '—' : '…'); };
    var h = kpis([
      kpi({ label: tr('Active facilities', 'المرافق النشطة'), dot: 'var(--dms-navy)', val: na(f, 'fm') || num(f.A.length), sub: f ? esc(money(f.annual) + ' ' + scopeCur() + tr(' annual rent', ' إيجار سنوي')) : '', act: 'go:fm:' }),
      kpi({ label: tr('Contracts ending ≤ ' + EXPIRY_SOON_DAYS + ' days', 'عقود تنتهي ≤ ' + EXPIRY_SOON_DAYS + ' يومًا'), dot: 'var(--dms-age3)', val: na(f, 'fm') || num(f.exp90.length), sub: f ? esc(num(f.expired.length) + tr(' already past end date', ' تجاوزت تاريخ الانتهاء')) : '', act: 'go:fm:exp90' }),
      kpi({ label: tr('Stock value', 'قيمة المخزون'), val: na(v, 'inv') || m$(v.value), sub: v ? esc(num(v.itemsInStock) + tr(' items in stock', ' صنف متوفر')) : '', act: 'go:inventory:' }),
      kpi({ label: tr('Shortage / negative', 'نقص / سالب'), dot: 'var(--dms-bad)', val: na(v, 'inv') || num(v.short.length) + ' / ' + num(v.neg.length), sub: v ? esc(num(v.low.length) + tr(' more at low stock', ' أخرى منخفضة')) : '', act: 'go:inventory:short' }),
      kpi({ label: tr('Cash and bank', 'النقد والبنك'), val: na(n, 'fin') || (RAW.cashErr ? '—' : m$(n.cashTot)), sub: n ? esc(tr('GL balance · ', 'رصيد الأستاذ · ') + num(n.cash.length) + tr(' accounts', ' حساب')) : '', act: 'go:finance:' }),
      kpi({ label: tr('Overdue receivable', 'مستحقات متأخرة'), dot: 'var(--dms-bad)', val: na(n, 'fin') || m$(n.arOverAmt), sub: n ? esc(tr('of ', 'من ') + money(n.arTot) + tr(' receivable', ' مستحقة')) : '', act: 'go:finance:arover' })
    ], true);
    var keys = (RAW.fin12 || []).map(function (x) { return x.key; }), pr = function (k) { return plSum([k]); };
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(tr('Revenue vs expenses', 'الإيرادات مقابل المصروفات'), !n ? skel(1, 'dms-skel-panel') : plChart(keys, pr), '', esc(scopeCur() + tr(' · last 12 months · GL', ' · آخر 12 شهرًا · الأستاذ'))) +
      panel(tr('Group summary', 'ملخص المجموعة'), (f ? facts([[tr('Annualised rent', 'الإيجار السنوي'), mm(f.annual)], [tr('Licences expired', 'تراخيص منتهية'), num(f.docsExpired), f.docsExpired ? 'bad' : ''], [tr('Rent instalments overdue', 'أقساط متأخرة'), mm(f.instOverAmt), f.instOverAmt ? 'warn' : '']]) : '') +
        (v ? facts([[tr('Low stock', 'مخزون منخفض'), num(v.low.length), v.low.length ? 'warn' : ''], [tr('Dead stock value', 'قيمة المخزون الراكد'), RAW.noAge ? (RAW.noAgeWhy === 'pending' ? esc(tr('Calculating…', 'جارٍ الحساب…')) : '—') : mm(v.deadVal), v.deadVal ? 'warn' : ''], [tr('Warehouses with stock', 'مستودعات بها مخزون'), num(v.whCount)]]) : '') +
        (n ? facts([[tr('Payable', 'الدائنون'), mm(n.apTot)], [tr('Overdue payable', 'دائنون متأخرون'), mm(n.apOverAmt), n.apOverAmt ? 'warn' : ''], [tr('Net profit · period', 'صافي الربح · الفترة'), mm(n.net), n.net < 0 ? 'bad' : 'ok']]) : '')) + '</div></div>';
    return h;
  }
  function plChart(keys, pr) {
    var F = RAW.plFail; if (F && F.n >= 12) { return alertBox('err', esc(tr('Revenue vs expenses could not be loaded: ', 'تعذر تحميل الإيرادات والمصروفات: ') + F.why)); }
    var c = {}; keys.forEach(function (k) { c[k] = pr(k); });
    return monthsBar(keys, [{ label: tr('Revenue', 'الإيرادات'), color: 'var(--dms-ok)', val: function (k) { return c[k].rev; } }, { label: tr('Expenses', 'المصروفات'), color: 'var(--dms-age3)', val: function (k) { return c[k].exp; } }]) + (F ? note(esc(F.n + tr(' of 12 months could not be loaded (', ' من 12 شهرًا تعذر تحميلها (') + F.months.join(', ') + '): ' + F.why)) : '');
  }

  /* ============================================================ 9. facilities */
  var FMQ = { '': function () { return true; }, attn: function (r) { return r._attn; }, exp90: function (r) { return r._active && r._days != null && r._days >= 0 && r._days <= EXPIRY_SOON_DAYS; }, expired: function (r) { return r._active && r._days != null && r._days < 0; }, inst: function (r) { return r._instOver.length > 0; }, docs: function (r) { return r._docBad.length > 0; }, nodate: function (r) { return r._active && r._days == null; } };
  function fmBadge(r) { if (!r._active) { return stat('n', tr('Closed', 'مغلق')); } if (r._days == null) { return stat('n', tr('No end date', 'بلا تاريخ انتهاء')); } if (r._days < 0) { return stat('bad', tr('Ended ' + daysTxt(-r._days) + ' ago', 'انتهى قبل ' + daysTxt(-r._days))); } if (r._days <= EXPIRY_SOON_DAYS) { return stat(r._days <= 30 ? 'bad' : 'warn', tr('Ends in ' + daysTxt(r._days), 'ينتهي خلال ' + daysTxt(r._days))); } return stat('ok', tr('Active', 'نشط')); }
  function tabFm() {
    var n0 = need('fm'); if (n0) { return n0; }
    var s = fmStats(), A = s.A;
    var h = kpis([
      kpi({ label: tr('Active facilities', 'المرافق النشطة'), dot: 'var(--dms-navy)', val: num(A.length), sub: esc(num(s.F.length - A.length) + tr(' closed · ', ' مغلق · ') + money(s.area) + tr(' sqm', ' م²')), act: 'qf2:fm:' }),
      kpi({ label: tr('Annualised rent', 'الإيجار السنوي'), val: m$(s.annual), sub: esc(tr('Avg ', 'المتوسط ') + money(s.psqm) + ' ' + scopeCur() + tr(' / sqm / year', ' / م² / سنة')) }),
      kpi({ label: tr('Ending in ' + EXPIRY_SOON_DAYS + ' days', 'تنتهي خلال ' + EXPIRY_SOON_DAYS + ' يومًا'), dot: 'var(--dms-age3)', val: num(s.exp90.length), sub: esc(money(sumK(s.exp90, '_annual')) + ' ' + scopeCur() + tr(' annual rent', ' إيجار سنوي')), top: QF.fm === 'exp90' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:fm:exp90' }),
      kpi({ label: tr('Past contract end', 'تجاوزت نهاية العقد'), dot: 'var(--dms-bad)', val: num(s.expired.length), sub: esc(tr('Still marked active', 'ما زالت نشطة')), top: QF.fm === 'expired' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:fm:expired' }),
      kpi({ label: tr('Instalments overdue', 'أقساط متأخرة'), dot: 'var(--dms-bad)', val: m$(s.instOverAmt), sub: esc(plural(s.instOver.length, tr('instalment', 'قسط'), tr('instalments', 'أقساط')) + tr(' unpaid', ' غير مسددة')), top: QF.fm === 'inst' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:fm:inst' }),
      kpi({ label: tr('Licences / permits', 'التراخيص / التصاريح'), dot: 'var(--dms-age4)', val: num(s.docsExpired) + ' / ' + num(s.docsSoon), sub: esc(tr('expired / expiring ≤ ' + DOC_SOON_DAYS + 'd', 'منتهية / تنتهي ≤ ' + DOC_SOON_DAYS + ' يومًا')), top: QF.fm === 'docs' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:fm:docs' })
    ]);
    var keys = []; for (var i = 0; i < 12; i++) { keys.push(addMonths(TODAY.slice(0, 7) + '-01', i).slice(0, 7)); }
    var agg = {}; A.forEach(function (r) { if (r._days != null && r._days >= 0) { var k = String(r._end).slice(0, 7); agg[k] = (agg[k] || 0) + r._annual; } });
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Contracts ending, next 12 months', 'العقود المنتهية، 12 شهرًا القادمة'), keys.some(function (k) { return agg[k]; }) ? monthsBar(keys, [{ label: tr('Annual rent ending', 'الإيجار السنوي المنتهي'), color: 'var(--dms-royal)', val: function (k) { return agg[k] || 0; } }]) : empty(tr('No active contract ends in the next 12 months.', 'لا عقد نشط ينتهي خلال 12 شهرًا.')), '', esc(scopeCur() + ' · ' + num(s.expired.length) + tr(' already past end', ' تجاوزت النهاية'))) +
      panel(tr('Licences and permits', 'التراخيص والتصاريح'), docMix(A), '', esc(tr('Active facilities', 'المرافق النشطة'))) + '</div>';
    var gb = function (kf) { return hbars(groupSum(A, kf, function (r) { return r._annual; }).filter(function (g) { return g.v; }).slice(0, 8).map(function (g) { return { label: g.key + ' (' + g.n + ')', value: g.v }; }), money); };
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Annual rent by facility type', 'الإيجار السنوي حسب نوع المرفق'), A.length ? gb(function (r) { return r._type; }) : empty(), '', esc(scopeCur())) + panel(tr('Annual rent by location', 'الإيجار السنوي حسب الموقع'), A.length ? gb(function (r) { return r._loc; }) : empty(), '', esc(scopeCur())) + '</div>';
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Annual rent by company', 'الإيجار السنوي حسب الشركة'), A.length ? gb(function (r) { return r._company; }) : empty(), '', esc(scopeCur())) + panel(tr('Assets', 'الأصول'), assetsPanel(), '', D.fmErr ? '' : esc(scopeCur())) + '</div>';
    var rows = s.F.filter(FMQ[QF.fm] || FMQ['']);
    return h + panel(tr('Facilities', 'المرافق'), chips('fm', [['', tr('All', 'الكل')], ['attn', tr('Needs attention', 'تحتاج متابعة')], ['exp90', tr('Ending ≤ 90 days', 'تنتهي ≤ 90 يومًا')], ['expired', tr('Past end', 'تجاوزت النهاية')], ['inst', tr('Instalments overdue', 'أقساط متأخرة')], ['docs', tr('Licence flags', 'تنبيهات التراخيص')], ['nodate', tr('No end date', 'بلا تاريخ انتهاء')]]) +
      regTable({ id: 't_fm', rows: rows, sk: 'annual', dir: -1, file: 'facilities', text: function (r) { return [r._name, r.name, r._loc, r.owner_name, r._company, r._type, r.contract_number].join(' '); }, empty: tr('No facilities match.', 'لا مرافق مطابقة.'), cols: [
        { k: 'name', h: tr('Facility', 'المرفق'), s: function (r) { return r._name; }, r: function (r) { return '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="fac:' + esc(r.name) + '">' + bdi(r._name) + '</button><span class="dms-sm fi-sub">' + esc(r.name) + '</span>'; }, c: function (r) { return r._name; } },
        { k: 'type', h: tr('Type', 'النوع'), s: function (r) { return r._type; }, r: function (r) { return bdi(r._type) + '<span class="dms-sm fi-sub">' + esc(r.facility_type || '') + '</span>'; }, c: function (r) { return r._type; } },
        { k: 'co', h: tr('Company / location', 'الشركة / الموقع'), s: function (r) { return r._company; }, r: function (r) { return bdi(r._company) + '<span class="dms-sm fi-sub">' + esc(r._loc) + '</span>'; }, c: function (r) { return r._company + ' / ' + r._loc; } },
        { k: 'area', h: tr('Area sqm', 'المساحة م²'), num: 1, s: function (r) { return r._area; }, r: function (r) { return r._area ? num(r._area) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r._area; } },
        { k: 'end', h: tr('Contract end', 'نهاية العقد'), s: function (r) { return r._end || '9999'; }, r: function (r) { return r._end ? dtc(String(r._end).slice(0, 10)) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r._end; } },
        { k: 'annual', h: tr('Annual rent', 'الإيجار السنوي'), num: 1, s: function (r) { return r._annual; }, r: function (r) { return r._annual ? '<b>' + moneyB(r._annual, coCur(r._company)) + '</b>' : '<span class="dms-sm">—</span>'; }, c: function (r) { return r._annual; } },
        { k: 'psqm', h: tr('Rent / sqm', 'الإيجار / م²'), num: 1, s: function (r) { return r._psqm; }, r: function (r) { return r._psqm ? esc(money(r._psqm)) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r._psqm; } },
        { k: 'flags', h: tr('Licence flags', 'تنبيهات التراخيص'), num: 1, s: function (r) { return r._docBad.length; }, r: function (r) { return r._docBad.length ? stat(r._docBad.some(function (d) { return d.days < 0; }) ? 'bad' : 'warn', String(r._docBad.length)) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r._docBad.length; } },
        { k: 'st', h: tr('Status', 'الحالة'), s: function (r) { return r._active ? (r._days == null ? 1e6 : r._days) : 2e6; }, r: fmBadge, c: function (r) { return r._active ? (r._days == null ? 'No end date' : r._days < 0 ? 'Ended' : 'Active') : 'Closed'; } }] }), '', esc(num(rows.length) + ' / ' + num(RAW.fm.length) + tr(' facility records · annualised rent = total rent ÷ contract years', ' سجل مرفق · الإيجار السنوي = إجمالي الإيجار ÷ سنوات العقد')));
  }
  function docMix(A) {
    var rows = DOC_DEFS.map(function (d) { var l = A.filter(function (r) { return r[d[0]]; }); if (!l.length) { return null; } var ex = 0, so = 0; l.forEach(function (r) { var dy = daysTo(r[d[0]]); if (dy < 0) { ex++; } else if (dy <= DOC_SOON_DAYS) { so++; } }); return { label: tr(d[1], d[2]), total: l.length, ex: ex, so: so }; }).filter(Boolean);
    if (!rows.length) { return empty(tr('No licence or permit expiry is recorded on the active facilities.', 'لا تواريخ انتهاء مسجلة للتراخيص على المرافق النشطة.')); }
    return '<div class="fi-docs">' + rows.map(function (r) { return '<div class="fi-doc"><span>' + bdi(r.label) + '</span>' + mixBar([{ label: tr('Valid', 'سارية'), value: r.total - r.ex - r.so, color: 'var(--dms-ok)' }, { label: tr('Expiring', 'تنتهي قريبًا'), value: r.so, color: 'var(--dms-age3)' }, { label: tr('Expired', 'منتهية'), value: r.ex, color: 'var(--dms-bad)' }]) + '<span class="dms-sm">' + esc(num(r.total - r.ex - r.so) + tr(' valid · ', ' سارية · ') + num(r.so) + tr(' soon · ', ' قريبًا · ')) + '<b class="' + (r.ex ? 'dms-tone-bad' : '') + '">' + esc(num(r.ex) + tr(' expired', ' منتهية')) + '</b></span></div>'; }).join('') + '</div>';
  }
  function assetsPanel() {
    var A = RAW.assets.filter(inCo); if (!A.length) { return empty(tr('No submitted assets for this scope.', 'لا أصول معتمدة لهذا النطاق.')); }
    var ins = A.filter(function (r) { return r.insurance_end_date && r.insurance_end_date <= addDays(TODAY, DOC_SOON_DAYS); }).length, rep = RAW.repairs.filter(inCo).length;
    return facts([[tr('Assets', 'الأصول'), num(A.length)], [tr('Gross cost', 'التكلفة الإجمالية'), mm(sumK(A, '_gross'))], [tr('Net book value', 'القيمة الدفترية'), mm(sumK(A, '_nbv'))], [tr('Repairs pending', 'إصلاحات معلقة'), num(rep), rep ? 'warn' : '']]) +
      hbars(groupSum(A, function (r) { return r.asset_category; }, function (r) { return r._gross; }).slice(0, 5).map(function (g) { return { label: g.key + ' (' + g.n + ')', value: g.v }; }), money) + (ins ? note(esc(num(ins) + tr(' assets with insurance expired or expiring in ' + DOC_SOON_DAYS + ' days.', ' أصل بتأمين منتهٍ أو ينتهي خلال ' + DOC_SOON_DAYS + ' يومًا.'))) : '');
  }

  /* ============================================================ 10. inventory */
  var INQ = { '': function () { return true; }, act: function (g) { return g.health !== 'ok'; }, neg: function (g) { return g.health === 'neg'; }, short: function (g) { return g.health === 'short' || g.health === 'neg'; }, low: function (g) { return g.health === 'low'; }, dead: function (g) { return g.health === 'dead'; } };
  function tabInv() {
    var n0 = need('inv'); if (n0) { return n0; }
    var s = invStats(), I = s.I, topPct = s.value > 0 ? Math.round(s.top10Val / s.value * 100) : 0, ageTxt = RAW.noAge ? (RAW.noAgeWhy === 'pending' ? tr('Calculating…', 'جارٍ الحساب…') : tr('Movement data unavailable', 'بيانات الحركة غير متاحة')) : '';
    var h = kpis([
      kpi({ label: tr('Stock value', 'قيمة المخزون'), dot: 'var(--dms-navy)', val: m$(s.value), sub: esc(num(s.itemsInStock) + tr(' items in stock · top 10 hold ', ' صنف متوفر · أعلى 10 تمثل ') + topPct + '%'), act: 'qf2:inventory:' }),
      kpi({ label: tr('Warehouses with stock', 'مستودعات بها مخزون'), val: num(s.whCount), sub: esc(tr('Active, non-empty', 'نشطة وغير فارغة')) }),
      kpi({ label: tr('Dead stock', 'مخزون راكد'), dot: '#8a97a8', val: RAW.noAge ? (RAW.noAgeWhy === 'pending' ? '…' : '—') : m$(s.deadVal), sub: esc(RAW.noAge ? ageTxt : plural(s.dead.length, tr('item', 'صنف'), tr('items', 'أصناف')) + tr(' idle > ' + DEAD_STOCK_DAYS + 'd', ' خامل > ' + DEAD_STOCK_DAYS + ' يومًا')), top: QF.inventory === 'dead' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: RAW.noAge ? null : 'qf2:inventory:dead' }),
      kpi({ label: tr('Low stock', 'مخزون منخفض'), dot: 'var(--dms-age3)', val: num(s.low.length), sub: esc(tr('At / below reorder level', 'عند حد إعادة الطلب أو أقل')), top: QF.inventory === 'low' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:inventory:low' }),
      kpi({ label: tr('Shortage', 'نقص'), dot: 'var(--dms-bad)', val: num(s.short.length), sub: esc(tr('Projected qty below zero', 'المتوقع أقل من صفر')), top: QF.inventory === 'short' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:inventory:short' }),
      kpi({ label: tr('Negative stock', 'مخزون سالب'), dot: 'var(--dms-age5)', val: num(s.neg.length), sub: esc(tr('Needs a stock correction', 'يحتاج تصحيح مخزون')), top: QF.inventory === 'neg' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:inventory:neg' })
    ]);
    var byWh = {}; RAW.bins.filter(inCo).forEach(function (b) { if (!matchQ([b.item_code, b._wh])) { return; } var g = byWh[b.warehouse] || (byWh[b.warehouse] = { label: b._wh, value: 0 }); g.value += b._val; });
    var whl = Object.keys(byWh).map(function (k) { return byWh[k]; }).filter(function (g) { return g.value > 0; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
    var hr = ['neg', 'short', 'low', 'dead', 'ok'].map(function (k) { var l = I.filter(function (g) { return g.health === k; }); return { label: tr(HEALTH[k][0], HEALTH[k][1]) + ' (' + l.length + ')', value: sumK(l, 'value'), color: HEALTH[k][3] }; });
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Stock value by warehouse', 'قيمة المخزون حسب المستودع'), whl.length ? hbars(whl, money) : empty(), '', esc(scopeCur() + tr(' · top 8', ' · أعلى 8'))) + panel(tr('Stock condition', 'حالة المخزون'), I.length ? hbars(hr, money) : empty(), '', esc(tr('Value by condition', 'القيمة حسب الحالة'))) + '</div>';
    var ag = AGE_B.map(function (b) { var l = I.filter(function (g) { return g._age === b[0]; }); return { label: tr(b[1], b[2]) + ' (' + l.length + ')', value: sumK(l, 'value'), color: b[3] }; });
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Stock value by last movement', 'قيمة المخزون حسب آخر حركة'), RAW.noAge ? (RAW.noAgeWhy === 'pending' ? skel(1, 'dms-skel-panel') : alertBox('warn', esc(RAW.noAgeWhy === 'perm' ? tr('Your role cannot read Stock Ledger Entry, so stock age cannot be calculated.', 'دورك لا يقرأ قيود دفتر المخزون، فلا يمكن حساب العمر.') : tr('Stock Ledger Entry query failed. Use Refresh to retry.', 'فشل استعلام دفتر المخزون. استخدم التحديث.')))) : hbars(ag, money), '', esc(tr('Windows of 30 / 90 / 180 / 365 days', 'فترات 30 / 90 / 180 / 365 يومًا'))) +
      panel(tr('Stock value by item group', 'قيمة المخزون حسب مجموعة الأصناف'), hbars(groupSum(I.filter(function (g) { return g.qty > 0 && g.value > 0; }), function (g) { return g.group; }, function (g) { return g.value; }).slice(0, 8).map(function (g) { return { label: g.key + ' (' + g.n + ')', value: g.v }; }), money), '', esc(scopeCur())) + '</div>';
    var rows = I.filter(INQ[QF.inventory] || INQ['']);
    return h + panel(tr('Stock items', 'أصناف المخزون'), chips('inventory', [['', tr('All', 'الكل')], ['act', tr('Needs action', 'تحتاج إجراء')], ['short', tr('Short or negative', 'نقص أو سالب')], ['low', tr('Low', 'منخفض')], ['dead', tr('Dead', 'راكد')]]) +
      regTable({ id: 't_inv', rows: rows, sk: 'value', dir: -1, file: 'stock_items', text: function (g) { return [g.name, g._title, g.group].join(' '); }, empty: tr('No items match.', 'لا أصناف مطابقة.'), cols: [
        { k: 'item', h: tr('Item', 'الصنف'), s: function (g) { return g._title; }, r: function (g) { return '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="item:' + esc(g.name) + '">' + bdi(g._title) + '</button><span class="dms-sm fi-sub">' + esc(g.name + ' · ' + g.group) + '</span>'; }, c: function (g) { return g.name + ' ' + g._title; } },
        { k: 'nwh', h: tr('Warehouses', 'المستودعات'), num: 1, s: function (g) { return g.nwh; }, r: function (g) { return num(g.nwh); }, c: function (g) { return g.nwh; } },
        { k: 'qty', h: tr('Qty', 'الكمية'), num: 1, s: function (g) { return g.qty; }, r: function (g) { return '<span class="dms-num' + (g.qty < 0 ? ' dms-tone-bad' : '') + '">' + esc(amtq(g.qty)) + '</span> <span class="dms-sm">' + esc(g.uom) + '</span>'; }, c: function (g) { return g.qty; } },
        { k: 'value', h: tr('Stock value', 'قيمة المخزون'), num: 1, s: function (g) { return g.value; }, r: function (g) { return '<b>' + esc(money(g.value)) + '</b>'; }, c: function (g) { return g.value; } },
        { k: 'res', h: tr('Reserved', 'المحجوز'), num: 1, s: function (g) { return g.reserved; }, r: function (g) { return g.reserved ? esc(amtq(g.reserved)) : '<span class="dms-sm">—</span>'; }, c: function (g) { return g.reserved; } },
        { k: 'proj', h: tr('Projected', 'المتوقع'), num: 1, s: function (g) { return g.projected; }, r: function (g) { return '<span class="dms-num' + (g.projected < 0 ? ' dms-tone-bad' : '') + '">' + esc(amtq(g.projected)) + '</span>'; }, c: function (g) { return g.projected; } },
        { k: 'reorder', h: tr('Reorder level', 'حد إعادة الطلب'), num: 1, s: function (g) { return g.reorder; }, r: function (g) { return g.reorder ? esc(amtq(g.reorder)) : '<span class="dms-sm">—</span>'; }, c: function (g) { return g.reorder; } },
        { k: 'last', h: tr('Last moved', 'آخر حركة'), s: function (g) { return g.days == null ? 1e9 : g.days; }, r: function (g) { return g.ageLabel ? esc(g.ageLabel) : '<span class="dms-sm">—</span>'; }, c: function (g) { return g.ageLabel; } },
        { k: 'health', h: tr('Condition', 'الحالة'), s: function (g) { return ['neg', 'short', 'low', 'dead', 'ok'].indexOf(g.health); }, r: function (g) { return stat(HEALTH[g.health][2], tr(HEALTH[g.health][0], HEALTH[g.health][1])); }, c: function (g) { return HEALTH[g.health][0]; } }] }), '', esc(tr('Value from Bin.stock_value · last movement from Stock Ledger Entry windows · quantities in each item’s stock UOM', 'القيمة من Bin.stock_value · آخر حركة من فترات دفتر المخزون · الكميات بوحدة مخزون الصنف')));
  }

  /* ============================================================ 11. finance */
  var FIQ = { '': function () { return true; }, ar: function (r) { return r._kind === 'AR'; }, ap: function (r) { return r._kind === 'AP'; }, arover: function (r) { return r._kind === 'AR' && r._overdue; }, apover: function (r) { return r._kind === 'AP' && r._overdue; }, ar90: function (r) { return r._kind === 'AR' && r._days > 90; } };
  function tabFin() {
    var n0 = need('fin'); if (n0) { return n0; }
    var s = finStats(), all = s.AR.concat(s.AP), pc = function (a, b) { return b ? Math.round(a / b * 100) + '%' : '0%'; };
    var h = kpis([
      kpi({ label: tr('Cash and bank', 'النقد والبنك'), dot: 'var(--dms-navy)', val: RAW.cashErr ? '—' : m$(s.cashTot), sub: esc(num(s.cash.length) + tr(' active accounts', ' حساب نشط')) }),
      kpi({ label: tr('Receivable', 'المدينون'), dot: 'var(--dms-ok)', val: m$(s.arTot), sub: esc(num(s.AR.length) + tr(' open invoices · ', ' فاتورة مفتوحة · ') + pc(s.arOverAmt, s.arTot) + tr(' overdue', ' متأخر')), top: QF.finance === 'ar' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:finance:ar' }),
      kpi({ label: tr('Overdue receivable', 'مدينون متأخرون'), dot: 'var(--dms-bad)', val: m$(s.arOverAmt), sub: esc(num(s.arOver.length) + tr(' invoices', ' فاتورة')), top: QF.finance === 'arover' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:finance:arover' }),
      kpi({ label: tr('Payable', 'الدائنون'), dot: 'var(--dms-age3)', val: m$(s.apTot), sub: esc(num(s.AP.length) + tr(' open bills · ', ' فاتورة مفتوحة · ') + pc(s.apOverAmt, s.apTot) + tr(' overdue', ' متأخر')), top: QF.finance === 'ap' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:finance:ap' }),
      kpi({ label: tr('Overdue payable', 'دائنون متأخرون'), dot: 'var(--dms-age4)', val: m$(s.apOverAmt), sub: esc(num(s.apSoon.length) + tr(' more due in ' + PAYABLE_SOON_DAYS + ' days', ' أخرى خلال ' + PAYABLE_SOON_DAYS + ' أيام')), top: QF.finance === 'apover' ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'qf2:finance:apover' }),
      kpi({ label: tr('Net profit · period', 'صافي الربح · الفترة'), dot: s.net >= 0 ? 'var(--dms-ok)' : 'var(--dms-bad)', val: s.keys.length ? m$(s.net) : '—', sub: esc(s.keys.length ? tr('Revenue ', 'الإيرادات ') + money(s.pl.rev) + ' · ' + pc(s.net, s.pl.rev) + tr(' margin', ' هامش') : tr('Period outside the last 12 months', 'الفترة خارج آخر 12 شهرًا')) })
    ]);
    var b = function (list) { var m = {}; BUCKETS.forEach(function (x) { m[x[0]] = 0; }); list.forEach(function (r) { m[r._bucket] += r._out; }); return BUCKETS.map(function (x) { return { label: tr(x[1], x[2]), value: m[x[0]], color: x[3] }; }); };
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Receivable aging', 'أعمار المدينين'), s.AR.length ? hbars(b(s.AR), money) : empty(tr('No open receivables.', 'لا مدينون مفتوحون.')), '', esc(scopeCur())) + panel(tr('Payable aging', 'أعمار الدائنين'), s.AP.length ? hbars(b(s.AP), money) : empty(tr('No open payables.', 'لا دائنون مفتوحون.')), '', esc(scopeCur())) + '</div>';
    var keys = (RAW.fin12 || []).map(function (x) { return x.key; }), inn = {}, out = {};
    RAW.pe.filter(inCo).forEach(function (p) { if (p.payment_type === 'Receive') { inn[p._m] = (inn[p._m] || 0) + num0(p.base_received_amount); } else { out[p._m] = (out[p._m] || 0) + num0(p.base_paid_amount); } });
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Revenue vs expenses', 'الإيرادات مقابل المصروفات'), plChart(keys, function (k) { return plSum([k]); }), '', esc(scopeCur() + tr(' · last 12 months', ' · آخر 12 شهرًا'))) +
      panel(tr('Payments received vs paid', 'المقبوضات مقابل المدفوعات'), keys.some(function (k) { return inn[k] || out[k]; }) ? monthsBar(keys, [{ label: tr('Received', 'المقبوض'), color: 'var(--dms-royal)', val: function (k) { return inn[k] || 0; } }, { label: tr('Paid', 'المدفوع'), color: 'var(--dms-age3)', val: function (k) { return out[k] || 0; } }]) : empty(tr('No payment entries in the last 12 months.', 'لا قيود دفع في آخر 12 شهرًا.')), '', esc(scopeCur())) + '</div>';
    var net = s.cashTot + s.arTot - s.apTot, cashL = s.cash.slice().sort(function (a, b2) { return Math.abs(b2._bal) - Math.abs(a._bal); }).filter(function (a) { return Math.abs(a._bal) >= 0.5; }).slice(0, 8);
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Net position', 'صافي المركز'), facts([[tr('Cash and bank', 'النقد والبنك'), RAW.cashErr ? '—' : mm(s.cashTot)], [tr('+ Receivable', '+ المدينون'), mm(s.arTot), 'ok'], [tr('− Payable', '− الدائنون'), mm(s.apTot), 'warn'], [tr('Net position', 'صافي المركز'), mm(net), net >= 0 ? 'ok' : 'bad']]) + note(esc(tr('Liquid funds plus what customers owe, less what is owed to suppliers.', 'الأموال السائلة زائد مستحقات العملاء ناقص مستحقات الموردين.')))) +
      panel(tr('Bank and cash balances', 'أرصدة البنوك والنقد'), RAW.cashErr ? alertBox('warn', esc(tr('Cash balances could not be read.', 'تعذرت قراءة أرصدة النقد.'))) : cashL.length ? hbars(cashL.map(function (a) { return { label: String(a.account_name || a.name).replace(/^\d+\s*-\s*/, ''), value: a._bal, color: a._bal < 0 ? 'var(--dms-bad)' : null }; }), money) : empty(), '', esc(scopeCur())) + '</div>';
    var topC = groupSum(s.AR, function (r) { return r._party; }, function (r) { return r._out; }).slice(0, 7), topS = groupSum(s.AP, function (r) { return r._party; }, function (r) { return r._out; }).slice(0, 7);
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Top customers by receivable', 'أعلى العملاء مديونية'), topC.length ? hbars(topC.map(function (g) { return { label: g.key, value: g.v }; }), money) : empty(), '', esc(scopeCur())) + panel(tr('Top suppliers by payable', 'أعلى الموردين دائنية'), topS.length ? hbars(topS.map(function (g) { return { label: g.key, value: g.v }; }), money) : empty(), '', esc(scopeCur())) + '</div>';
    var rows = all.filter(FIQ[QF.finance] || FIQ['']);
    return h + panel(tr('Open invoices', 'الفواتير المفتوحة'), chips('finance', [['', tr('All', 'الكل')], ['ar', tr('Receivable', 'مدينون')], ['ap', tr('Payable', 'دائنون')], ['arover', tr('Overdue receivable', 'مدينون متأخرون')], ['apover', tr('Overdue payable', 'دائنون متأخرون')], ['ar90', tr('Receivable > 90 days late', 'مدينون متأخرون > 90 يومًا')]]) +
      regTable({ id: 't_fin', rows: rows, sk: 'out', dir: -1, file: 'open_invoices', text: function (r) { return [r._party, r.name, r.bill_no || '', r._company].join(' '); }, empty: tr('No open invoices match.', 'لا فواتير مطابقة.'), cols: [
        { k: 'kind', h: tr('Type', 'النوع'), s: function (r) { return r._kind; }, r: function (r) { return stat(r._kind === 'AR' ? 'ok' : 'warn', r._kind === 'AR' ? tr('Receivable', 'مدين') : tr('Payable', 'دائن')); }, c: function (r) { return r._kind === 'AR' ? 'Receivable' : 'Payable'; } },
        { k: 'party', h: tr('Party', 'الطرف'), s: function (r) { return r._party; }, r: function (r) { return bdi(r._party) + '<span class="dms-sm fi-sub">' + docLink(r._kind === 'AR' ? 'Sales Invoice' : 'Purchase Invoice', r.name) + '</span>'; }, c: function (r) { return r._party + ' / ' + r.name; } },
        { k: 'co', h: tr('Company', 'الشركة'), s: function (r) { return r._company; }, r: function (r) { return bdi(r._company); }, c: function (r) { return r._company; } },
        { k: 'due', h: tr('Due date', 'الاستحقاق'), s: function (r) { return r._due || ''; }, r: function (r) { return dtc(String(r._due).slice(0, 10)) + (r._overdue ? ' ' + stat('bad', tr(daysTxt(r._days) + ' late', 'متأخر ' + daysTxt(r._days))) : ''); }, c: function (r) { return r._due; } },
        { k: 'tot', h: tr('Invoice total', 'إجمالي الفاتورة'), num: 1, s: function (r) { return r._total; }, r: function (r) { return moneyB(r._total, coCur(r._company)); }, c: function (r) { return r._total; } },
        { k: 'out', h: tr('Outstanding', 'المستحق'), num: 1, s: function (r) { return r._out; }, r: function (r) { return '<b>' + moneyB(r._out, coCur(r._company)) + '</b>'; }, c: function (r) { return r._out; } }] }), '', esc(tr('Submitted documents with outstanding amount > 0 · revenue / expense from GL Entry (period closing vouchers excluded)', 'مستندات معتمدة برصيد > 0 · الإيرادات / المصروفات من قيود الأستاذ (دون قيود إقفال الفترة)')));
  }
  function tabActions(AM) { return actionsTab(AM, tr('As of today across the company scope; not limited by the period.', 'حتى اليوم ضمن نطاق الشركات؛ غير مقيدة بالفترة.')); }

  /* ============================================================ 12. drill-downs (v5 drawer) and events */
  function drill(id) {
    if (id.indexOf('fac:') === 0) {
      var r = RAW.fm.filter(function (x) { return x.name === id.slice(4); })[0]; if (!r) { return null; } var cur = coCur(r._company);
      var svc = [[tr('Fire maintenance', 'صيانة الحريق'), r.fire_contractor], [tr('Cleaning', 'النظافة'), r.cleaning_cont], [tr('Camera maintenance', 'صيانة الكاميرات'), r.camera_contractor]].filter(function (x) { return x[1]; });
      var body = facts([[tr('Annual rent', 'الإيجار السنوي'), esc(moneyFull(r._annual, cur))], [tr('Contract value', 'قيمة العقد'), esc(moneyFull(r._total, cur))], [tr('Area sqm', 'المساحة م²'), r._area ? num(r._area) : '—'], [tr('Status', 'الحالة'), fmBadge(r)]]) +
        '<h4 class="fi-h">' + esc(tr('Agreement', 'العقد')) + '</h4>' + facts([[tr('Company', 'الشركة'), esc(r._company)], [tr('Facility type', 'نوع المرفق'), esc(r.facility_type || '—')], [tr('Category', 'الفئة'), esc(r.facility_catogory || '—')], [tr('Agreement', 'نوع الاتفاقية'), esc(r.agreement_type || '—')], [tr('Contract no', 'رقم العقد'), esc(r.contract_number || '—')], [tr('Start', 'البداية'), esc(fmtD(r._start))], [tr('End', 'النهاية'), esc(fmtD(r._end))], [tr('Auto renewal', 'تجديد تلقائي'), esc(r.auto_renewal || '—')], [tr('Landlord', 'المالك'), esc(r.owner_name || '—')], [tr('Landlord phone', 'هاتف المالك'), r.owner_number ? '<a href="tel:' + esc(r.owner_number) + '">' + bdi(r.owner_number) + '</a>' : '—'], [tr('Payment mode', 'طريقة الدفع'), esc(r.rent_mode || '—')], [tr('Instalments', 'الأقساط'), esc(r.rent_installments || '—')]]) +
        (r._inst.length ? '<h4 class="fi-h">' + esc(tr('Rent instalments', 'أقساط الإيجار')) + '</h4>' + facts(r._inst.map(function (i) { return [tr('Instalment ', 'القسط ') + i.k + ' · ' + fmtD(i.due), esc(moneyFull(i.amt, cur)) + ' ' + (i.paid ? stat('ok', tr('Paid', 'مسدد')) : i.due < TODAY ? stat('bad', tr('Not paid', 'غير مسدد')) : stat('n', tr('Upcoming', 'قادم'))), '']; })) : '') +
        (r._docs.length ? '<h4 class="fi-h">' + esc(tr('Licences and compliance', 'التراخيص والامتثال')) + '</h4>' + facts(r._docs.slice().sort(function (a, b) { return a.days - b.days; }).map(function (d) { return [d.label + ' · ' + fmtD(d.date), d.days < 0 ? stat('bad', tr('Expired', 'منتهية')) : d.days <= DOC_SOON_DAYS ? stat('warn', tr(daysTxt(d.days) + ' left', 'متبقٍ ' + daysTxt(d.days))) : stat('ok', tr('Valid', 'سارية')), '']; })) : '') +
        '<h4 class="fi-h">' + esc(tr('Safety and services', 'السلامة والخدمات')) + '</h4>' + facts([[tr('Fire layout', 'مخطط الحريق'), r.fire_layout ? stat('ok', tr('Yes', 'نعم')) : stat('n', tr('No', 'لا'))], [tr('Sign board', 'اللوحة'), r.sign_board ? stat('ok', tr('Yes', 'نعم')) : stat('n', tr('No', 'لا'))], [tr('Medical kit', 'حقيبة الإسعاف'), r.medical_kit ? stat('ok', tr('Yes', 'نعم')) : stat('n', tr('No', 'لا'))]].concat(svc.map(function (x) { return [x[0] + tr(' contractor', ' المقاول'), esc(x[1])]; }))) +
        (r.additional_notes ? '<h4 class="fi-h">' + esc(tr('Notes', 'ملاحظات')) + '</h4><p class="fi-pre">' + esc(r.additional_notes) + '</p>' : '');
      return { title: r._name, sub: [r._type, r._loc].join(' · '), link: ['DM Facilities Management', r.name, r.name], body: body };
    }
    if (id.indexOf('item:') === 0) {
      var g = invItems().filter(function (x) { return x.name === id.slice(5); })[0]; if (!g) { return null; }
      return { title: g._title, sub: g.name + ' · ' + g.group, link: ['Item', g.name, g.name], body: facts([[tr('On hand', 'المتوفر'), esc(amtq(g.qty) + ' ' + g.uom)], [tr('Stock value', 'قيمة المخزون'), mm(g.value)], [tr('Projected', 'المتوقع'), esc(amtq(g.projected)), g.projected < 0 ? 'bad' : ''], [tr('Reserved', 'المحجوز'), esc(amtq(g.reserved))], [tr('Incoming (ordered)', 'الوارد (مطلوب)'), esc(amtq(g.ordered))], [tr('Reorder level', 'حد إعادة الطلب'), g.reorder ? esc(amtq(g.reorder)) : '—'], [tr('Last movement', 'آخر حركة'), esc(g.ageLabel || '—')], [tr('Condition', 'الحالة'), stat(HEALTH[g.health][2], tr(HEALTH[g.health][0], HEALTH[g.health][1]))]]),
        spec: { rows: g.whs.slice().sort(function (a, b) { return b._val - a._val; }), file: 'item_' + g.name, cols: [{ h: tr('Warehouse', 'المستودع'), r: function (b) { return bdi(b._wh); }, c: function (b) { return b.warehouse; } }, { h: tr('Qty', 'الكمية'), num: 1, r: function (b) { return '<span class="dms-num' + (b._qty < 0 ? ' dms-tone-bad' : '') + '">' + esc(amtq(b._qty)) + '</span>'; }, c: function (b) { return b._qty; } }, { h: tr('Reserved', 'المحجوز'), num: 1, r: function (b) { return b._res ? esc(amtq(b._res)) : '—'; }, c: function (b) { return b._res; } }, { h: tr('Value', 'القيمة'), num: 1, r: function (b) { return esc(money(b._val)); }, c: function (b) { return b._val; } }] } };
    }
    if (id.indexOf('cli:') === 0) {
      var k = id.slice(4), cc = actClient(), x = cc && cc[k], sp = actSpecs().filter(function (y) { return y.id === k; })[0];
      if (!x || typeof x === 'string' || !sp) { return null; }
      return { title: sp.title, sub: sp.why, spec: { rows: x.rows.slice(0, 500).map(x.item), file: k, text: function (it) { return [it.title, it.desc, it.who].join(' '); }, cols: [
        { h: tr('Record', 'السجل'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.name; } },
        { h: tr('Details', 'التفاصيل'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc) + '</span>'; }, c: function (it) { return it.desc; } },
        { h: tr('Company', 'الشركة'), r: function (it) { return bdi(it.who || '—'); }, c: function (it) { return it.who; } },
        { h: tr('When / amount', 'متى / المبلغ'), r: function (it) { return '<span class="dms-tone-' + it.tone + '">' + esc(it.due) + '</span>'; }, c: function (it) { return it.due; } }] } };
    }
    return null;
  }
  function onAct(a, v) {
    if (a === 'kpi' && v.indexOf('go:') === 0) { var p = v.split(':'); QF[p[1]] = p[2] || ''; goTab(p[1], false, true); return true; }
    if (a === 'kpi' && v.indexOf('qf2:') === 0) { var q = v.split(':'); QF[q[1]] = QF[q[1]] === q[2] ? '' : (q[2] || ''); renderSoft(); return true; }
    if (a === 'qf') { var r = v.split(':'); QF[r[0]] = r[1] || ''; renderSoft(); return true; }
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
