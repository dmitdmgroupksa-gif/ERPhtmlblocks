/* ===== DM Group KSA — DMS Sales Management — SCRIPT field · v2 =====
   Project allocation, sales follow-up, daily activity, project explorer and key-personnel contact requests.
   Server Scripts unchanged: dms_sales_dashboard_data, dms_daily_sales_activity_report, dms_project_explorer_sectors,
   dms_manager_contact_requests (read) and dms_share_key_personnel_contact (the only write: share / in progress / reject a
   contact request, same arguments as v1). Built on the DM dashboard standard; the shared runtime between the "DMS kit"
   markers is generated from tools/erp/kit/dms-kit.js (edit the kit and run build_kit.py, not the copy). */
(function () {
  'use strict';
  var APP = {
    key: '__dmsSalesMgmt',
    period: false,
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'team', en: 'Sales team', ar: 'فريق المبيعات' }, { id: 'followups', en: 'Follow-ups', ar: 'المتابعات' },
      { id: 'activity', en: 'Daily activity', ar: 'النشاط اليومي' }, { id: 'explorer', en: 'Project explorer', ar: 'مستكشف المشاريع' }, { id: 'requests', en: 'Contact requests', ar: 'طلبات جهات الاتصال' },
      { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'sp', en: 'Salesperson', ar: 'المندوب', none: ['All salespeople', 'كل المندوبين'], options: function () { return ((D.d && D.d.sales_people) || []).map(function (p) { return { v: p.employee, l: pname(p) }; }).sort(function (a, b) { return a.l.localeCompare(b.l); }); } },
      { k: 'st', en: 'Follow-up status', ar: 'حالة المتابعة', none: ['All statuses', 'كل الحالات'], options: function () { return STAGES.map(function (s) { return { v: s[0], l: tr(s[1], s[2]) }; }); } }
    ],
    sources: ['d'],
    dtLabels: { 'DMS Project': ['DMS project', 'مشروع DMS'], 'DMS Key Personnel Request': ['Contact request', 'طلب جهة اتصال'] },
    title: function () { return tr('DMS Sales Management', 'إدارة مبيعات DMS'); },
    stamp: function () { return tr('Project allocation, follow-up and pipeline', 'توزيع المشاريع والمتابعة ومسار المبيعات'); },
    filterNote: function () { return tr('Salesperson applies to the sales team, follow-ups and contact requests; status applies to the team and follow-ups. Overview counts are always for all projects.', 'المندوب ينطبق على الفريق والمتابعات وطلبات جهات الاتصال؛ والحالة على الفريق والمتابعات. أرقام النظرة العامة لكل المشاريع دائمًا.'); },
    load: function () { loadAll(); },
    onTab: function (id) { if (id === 'activity' && !D.da && !D.daErr) { loadDa(); } if (id === 'explorer' && !D.ex && !D.exErr) { loadEx(); } },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return banner(); },
    content: function (t, AM) { return ({ overview: tabOverview, team: tabTeam, followups: tabFu, activity: tabDa, explorer: tabEx, requests: tabKpr, actions: tabActions })[t](AM); },
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

  /* ============================================================ helpers */
  var STAGES = [['Not Contacted', 'Not contacted', 'لم يتم التواصل', 'never_contacted', '#8a97a8'], ['Contacted', 'Contacted', 'تم التواصل', 'contacted', '#6b8be0'], ['Meeting Scheduled', 'Meeting scheduled', 'اجتماع مجدول', 'meetings', 'var(--dms-royal)'],
    ['Quotation Submitted', 'Quotation submitted', 'عرض سعر مقدم', 'quotations', '#7a5bd0'], ['Negotiation', 'Negotiation', 'تفاوض', 'negotiation', '#d97a1e'], ['Won', 'Won', 'تم الفوز', 'won', 'var(--dms-ok)'], ['Lost', 'Lost', 'خسارة', 'lost', 'var(--dms-bad)']];
  var STK = {}; STAGES.forEach(function (s) { STK[s[0]] = s; });
  var DRILL = { never_contacted: 'never_contacted', contacted: 'contacted', meetings: 'meeting', quotations: 'quotation', negotiation: 'negotiation', won: 'won', lost: 'lost', assigned: 'assigned', due_today: 'due_today', overdue: 'overdue' };
  function cname(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function pname(p) { return cname(p.employee_name || p.sales_person_name || p.employee || p.sales_person); }
  function stLbl(s) { var x = STK[s || 'Not Contacted']; return x ? tr(x[1], x[2]) : (s || ''); }
  function stTag(s) { var v = s || 'Not Contacted'; return stat(v === 'Won' ? 'ok' : v === 'Lost' ? 'bad' : v === 'Negotiation' || v === 'Quotation Submitted' ? 'warn' : 'n', stLbl(v)); }
  function projCell(r) { return docLink('DMS Project', r.project || r.dms_project, r.project_code || r.project || r.dms_project) + (r.project_name ? '<span class="dms-sm sx-pn">' + esc(r.project_name) + '</span>' : ''); }
  function fdate(v) { return v ? dtc(String(v).slice(0, 10)) : '<span class="dms-sm">—</span>'; }
  /* v1 drill filters: the DMS Project list with the same filters as before */
  function listFilters(type, emp) {
    var y = addDays(TODAY, -1), open = ['not in', ['Won', 'Lost']], f = {};
    if (type === 'allocated') { f.sales_person = ['is', 'set']; }
    else if (type === 'unallocated') { f.sales_person = ['is', 'not set']; }
    else if (type === 'mismatch') { f.sales_person = ['is', 'not set']; f.allocation_status = ['in', ['Allocated', 'Reallocated']]; }
    else if (type === 'never_contacted') { f.sales_person = ['is', 'set']; f.follow_up_status = ['is', 'not set']; }
    else if (type === 'contacted') { f.follow_up_status = 'Contacted'; } else if (type === 'meeting') { f.follow_up_status = 'Meeting Scheduled'; }
    else if (type === 'quotation') { f.follow_up_status = 'Quotation Submitted'; } else if (type === 'negotiation') { f.follow_up_status = 'Negotiation'; }
    else if (type === 'won') { f.follow_up_status = 'Won'; } else if (type === 'lost') { f.follow_up_status = 'Lost'; }
    else if (type === 'due_today') { f.next_follow_up_date = TODAY; f.follow_up_status = open; }
    else if (type === 'overdue') { f.next_follow_up_date = ['between', ['1900-01-01', y]]; f.follow_up_status = open; }
    if (emp) { f.sales_person = emp; }
    return f;
  }
  function listUrl(f) { return '/app/dms-project' + (Object.keys(f).length ? '?' + Object.keys(f).map(function (k) { var v = f[k]; return encodeURIComponent(k) + '=' + encodeURIComponent(typeof v === 'string' ? v : JSON.stringify(v)); }).join('&') : ''); }
  function openList(f) {
    try { if (G.frappe && frappe.set_route) { frappe.route_options = f; frappe.set_route('List', 'DMS Project'); return; } } catch (e) { /* fall back to a link */ }
    G.open(listUrl(f), '_blank');
  }
  function listBtn(f, label) { return '<button type="button" class="dms-btn dms-btn-sm" data-act="plist" data-v="' + esc(JSON.stringify(f)) + '">' + esc(label || tr('Open in ERPNext', 'فتح في ERPNext')) + ' ↗</button>'; }

  /* ============================================================ loading (same Server Scripts as v1) */
  var DA = { date: '', person: '', tab: 'people', email: false }, FUV = 'overdue', KPR = { filter: 'open', q: '' }, EX = { region: '', sector: null, tab: 'contractors', stage: 'all', q: '', all: false };
  function loadAll() {
    run('d', function (chk) { return guarded(chk, 'dms_sales_dashboard_data', {}).then(function (m) { if (!m || m.status !== 'success') { throw new Error('Unable to load DMS Sales Dashboard'); } prepare(m); return m; }); });
    run('kpr', function (chk) { return guarded(chk, 'dms_manager_contact_requests', {}).then(function (m) { if (!m || !m.counts) { var e = new Error('No access to contact requests'); e.status = 403; throw e; } return m; }); });
    if (tab === 'activity') { loadDa(); } if (tab === 'explorer') { loadEx(); }
  }
  function loadDa() { run('da', function (chk) { return guarded(chk, 'dms_daily_sales_activity_report', { date: DA.date, sales_person: DA.person }).then(function (m) { if (!m) { throw new Error('The report could not be loaded for your account.'); } DA.date = m.date; if (!DA.person) { DA.people = m.salespeople || []; } return m; }); }); }
  function loadEx() { run('ex', function (chk) { return guarded(chk, 'dms_project_explorer_sectors', {}).then(function (m) { if (!m || !m.projects) { throw new Error('The sector data could not be loaded.'); } var map = {}; m.projects.forEach(function (p) { map[p[0]] = p; }); m.map = map; return m; }); }); }

  /* ============================================================ contractor data (v1 logic: bit-packed stages, alias groups) */
  var CC = { data: null, alloc: {}, pflags: {}, hasContr: {}, regionMap: {} }, CC_BITS = { all: 0, pq: 1, bid: 2, awd: 4 };
  var CC_STAGES = [['all', 'All', 'الكل'], ['pq', 'Pre-qualified', 'مؤهل مسبقًا'], ['bid', 'Bidding', 'مناقصة'], ['awd', 'Awarded', 'تمت الترسية']];
  function prepare(data) {
    CC.data = data.contractor_data || null; CC.alloc = {}; CC.pflags = {}; CC.hasContr = {}; CC.regionMap = {};
    (data.region_cards || []).forEach(function (c) { CC.regionMap[c.region] = c; });
    if (!CC.data) { return; }
    (CC.data.allocated_ids || []).forEach(function (id) { CC.alloc[id] = 1; });
    (CC.data.contractors.companies || []).forEach(function (c) { (c.p || []).forEach(function (v) { var k = v >> 3; CC.pflags[k] = (CC.pflags[k] || 0) | (v & 7); CC.hasContr[CC.data.project_ids[k]] = 1; }); });
  }
  function exInfo(id) { return (D.ex && D.ex.map[id]) || [id, [], 0]; }
  function exRegionIds() { var c = CC.regionMap[EX.region]; return c && c.ids ? c.ids : []; }
  function exMatching() { var ids = exRegionIds(); if (EX.sector === null) { return ids; } if (EX.sector === '__none__') { return ids.filter(function (id) { return !exInfo(id)[1].length; }); } var si = D.ex.sectors.indexOf(EX.sector); return ids.filter(function (id) { return exInfo(id)[1].indexOf(si) >= 0; }); }
  function exAlloc(ids) { var n = 0; ids.forEach(function (id) { n += exInfo(id)[2]; }); return n; }
  function exTop(fl) { return (fl & 4) ? 4 : ((fl & 2) ? 2 : (fl & 1)); }
  function exCompanies(tb, stage, inS) {
    var g = tb === 'subcontractors' ? CC.data.subcontractors : CC.data.contractors, bit = CC_BITS[stage], rows = [];
    (g.companies || []).forEach(function (c, idx) {
      var seen = {}, ids = [];
      (c.p || []).forEach(function (v) { var id = CC.data.project_ids[v >> 3]; if (!inS[id] || seen[id]) { return; } var fl = tb === 'contractors' ? (v & 7) : (CC.pflags[v >> 3] || 0); if (bit && exTop(fl) !== bit) { return; } seen[id] = 1; ids.push(id); });
      if (ids.length) { rows.push({ c: c, idx: idx, ids: ids, al: exAlloc(ids) }); }
    });
    return rows.sort(function (a, b) { return (b.ids.length - a.ids.length) || String(a.c.name).localeCompare(String(b.c.name)); });
  }
  function setOf(ids) { var s = {}; ids.forEach(function (id) { s[id] = 1; }); return s; }

  /* ============================================================ actions pending */
  function actSpecs() {
    return [
      { id: 'a_over', client: true, short: tr('Overdue follow-ups', 'متابعات متأخرة'), title: tr('Overdue follow-ups', 'متابعات متأخرة'), why: tr('Next follow-up date passed, project still open. Oldest first (up to 50 listed).', 'تاريخ المتابعة التالية مضى والمشروع مفتوح. الأقدم أولًا (حتى 50).') },
      { id: 'a_kpr', client: true, short: tr('Contact requests', 'طلبات جهات اتصال'), title: tr('Contact requests waiting', 'طلبات جهات اتصال بانتظار الرد'), why: tr('Pending or in progress. Review and share the contact, or reject.', 'معلقة أو قيد التنفيذ. راجع وشارك جهة الاتصال أو ارفض.') },
      { id: 'a_today', client: true, short: tr('Due today', 'مستحقة اليوم'), title: tr('Follow-ups due today', 'متابعات مستحقة اليوم'), why: tr('Scheduled for today on open projects.', 'مجدولة اليوم على مشاريع مفتوحة.') },
      { id: 'a_mis', client: true, short: tr('Allocation mismatch', 'خلل في التوزيع'), title: tr('Projects marked allocated without a salesperson', 'مشاريع موزعة بدون مندوب'), why: tr('Allocation status says Allocated / Reallocated but no salesperson is set.', 'حالة التوزيع موزع لكن لا يوجد مندوب.') },
      { id: 'a_never', client: true, short: tr('Never contacted', 'لم يتم التواصل'), title: tr('Allocated projects never contacted', 'مشاريع موزعة لم يتم التواصل معها'), why: tr('A salesperson is assigned but no follow-up was ever recorded.', 'المندوب معيّن لكن لم تسجل أي متابعة.') }
    ];
  }
  function actClient() {
    var o = {};
    if (D.dErr) { ['a_over', 'a_today', 'a_mis', 'a_never'].forEach(function (k) { o[k] = 'ERR:' + D.dErr; }); }
    else if (D.d) {
      var s = D.d.summary || {}, none = function () { return {}; };
      o.a_over = { rows: D.d.overdue_followups || [], count: +s.overdue || 0, item: function (r) { return { p: 'high', score: score('high', 0, +r.days_overdue || 0), dt: 'DMS Project', name: r.project, title: r.project_code || r.project, desc: cname(r.project_name) + ' · ' + stLbl(r.follow_up_status), who: pname(r), due: lateTxt(r.next_follow_up_date), tone: 'bad' }; } };
      o.a_today = { rows: (D.d.upcoming_followups || []).filter(function (r) { return String(r.next_follow_up_date).slice(0, 10) === TODAY; }), count: +s.due_today || 0, item: function (r) { return { p: 'med', score: score('med', 0, 0), dt: 'DMS Project', name: r.project, title: r.project_code || r.project, desc: cname(r.project_name) + ' · ' + stLbl(r.follow_up_status), who: pname(r), due: tr('Due today', 'مستحق اليوم'), tone: 'warn' }; } };
      o.a_mis = { rows: [], count: +s.allocation_mismatch || 0, item: none }; o.a_never = { rows: [], count: +s.never_contacted || 0, item: none };
    }
    if (D.kprErr) { o.a_kpr = 'ERR:' + D.kprErr; } else if (D.kpr) {
      o.a_kpr = { rows: (D.kpr.requests || []).filter(function (r) { return r.status === 'Pending' || r.status === 'In Progress'; }), item: function (r) { return { p: 'high', score: score('high', 0, ageOf(r.request_date)) + (r.status === 'Pending' ? 2 : 0), dt: 'DMS Key Personnel Request', name: r.name, title: (r.project_code || r.dms_project) + ' · ' + (r.required_designation || ''), desc: plain(r.request_reason, 120), who: cname(r.sales_person), due: agoTxt(r.request_date, 'Requested', 'طُلب منذ'), tone: r.status === 'Pending' ? 'bad' : 'warn' }; } };
    }
    return Object.keys(o).length ? o : null;
  }

  /* ============================================================ views */
  function banner() {
    var s = D.d && D.d.summary; if (!s || !(+s.allocation_mismatch > 0)) { return ''; }
    return alertBox('warn', '<b>' + esc(tr('Allocation mismatch', 'خلل في التوزيع')) + ':</b> ' + esc(num(s.allocation_mismatch) + ' ' + tr('projects are marked allocated but have no salesperson.', 'مشروعًا موزعًا بدون مندوب.')) + ' ' + listBtn(listFilters('mismatch'), tr('Open them', 'فتحها')));
  }
  function tabOverview(AM) {
    if (D.dErr) { return srcErr(D.dErr, 'dms_sales_dashboard_data') + actionsPanel(AM); }
    if (!D.d) { return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>'; }
    var s = D.d.summary || {}, pipe = (+s.contacted || 0) + (+s.meeting_scheduled || 0) + (+s.quotation_submitted || 0) + (+s.negotiation || 0), won = +s.won || 0, lost = +s.lost || 0;
    var kp = D.kpr ? (+(D.kpr.counts.Pending || 0) + +(D.kpr.counts['In Progress'] || 0)) : null;
    var h = kpis([
      kpi({ label: tr('Projects', 'المشاريع'), val: num(s.total_projects), top: tagc(esc(pct(s.allocated, s.total_projects, 0) + ' ' + tr('allocated', 'موزعة'))), sub: esc(num(s.allocated) + ' ' + tr('allocated', 'موزعة') + ' · ' + num(s.unallocated) + ' ' + tr('unallocated', 'غير موزعة')), act: 'list:unallocated' }),
      kpi({ label: tr('Never contacted', 'لم يتم التواصل'), dot: +s.never_contacted ? 'var(--dms-age3)' : 'var(--dms-ok)', val: num(s.never_contacted), sub: esc(tr('Allocated, no follow-up yet', 'موزعة بلا متابعة بعد')), act: 'list:never_contacted' }),
      kpi({ label: tr('Overdue follow-ups', 'متابعات متأخرة'), dot: +s.overdue ? 'var(--dms-bad)' : 'var(--dms-ok)', val: num(s.overdue), sub: esc(tr('Due today: ', 'مستحقة اليوم: ') + num(s.due_today)), act: 'goto:followups' }),
      kpi({ label: tr('Active pipeline', 'مسار نشط'), val: num(pipe), sub: esc(tr('Meetings ', 'اجتماعات ') + num(s.meeting_scheduled) + ' · ' + tr('Quotations ', 'عروض ') + num(s.quotation_submitted) + ' · ' + tr('Negotiation ', 'تفاوض ') + num(s.negotiation)),
        foot: mixBar(STAGES.slice(1, 5).map(function (x) { return { label: tr(x[1], x[2]), value: +s[{ contacted: 'contacted', meetings: 'meeting_scheduled', quotations: 'quotation_submitted', negotiation: 'negotiation' }[x[3]]] || 0, color: x[4] }; })), act: 'goto:team' }),
      kpi({ label: tr('Won', 'تم الفوز'), dot: 'var(--dms-ok)', val: num(won), top: won + lost ? tagc(esc(pct(won, won + lost, 0) + ' ' + tr('win rate', 'نسبة الفوز'))) : '', sub: esc(num(lost) + ' ' + tr('lost', 'خسارة') + ' · ' + tr('recorded by salespeople', 'مسجلة من المندوبين')), act: 'list:won', tip: tr('Recorded pipeline status; Won does not confirm an ERPNext Sales Order.', 'حالة مسجلة؛ الفوز لا يؤكد أمر بيع في ERPNext.') }),
      kpi({ label: tr('Contact requests open', 'طلبات اتصال مفتوحة'), dot: kp ? 'var(--dms-age3)' : null, val: D.kprErr ? '—' : kp == null ? '…' : num(kp), sub: esc(D.kprErr ? tr('Not available for your user', 'غير متاح لمستخدمك') : tr('Pending and in progress', 'معلقة وقيد التنفيذ')), act: D.kprErr ? null : 'goto:requests' })
    ], true);
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(tr('Pipeline by stage', 'المسار حسب المرحلة'), shareList(STAGES.map(function (x) {
      var v = x[0] === 'Not Contacted' ? s.never_contacted : s[{ contacted: 'contacted', meetings: 'meeting_scheduled', quotations: 'quotation_submitted', negotiation: 'negotiation', won: 'won', lost: 'lost' }[x[3]]];
      return { label: tr(x[1], x[2]), value: +v || 0, color: x[4], act: 'list:' + DRILL[x[3]] };
    }), '<b class="dms-num">' + num(s.allocated) + '</b> ' + esc(tr('allocated projects', 'مشروعًا موزعًا')), num, true), '', esc(tr('Current status of each project', 'الحالة الحالية لكل مشروع'))) + '</div></div>';
    var people = (D.d.sales_people || []).slice().sort(function (a, b) { return (+b.assigned || 0) - (+a.assigned || 0); });
    h += '<div class="dms-cols-2 dms-grid">' + panel(tr('Projects by salesperson', 'المشاريع حسب المندوب'), splitBars(people.slice(0, 10).map(function (p) { return { label: pname(p), total: +p.assigned || 0, part: Math.min(+p.assigned || 0, +p.never_contacted || 0), act: 'person:' + p.employee }; }), [{ label: tr('Never contacted', 'لم يتم التواصل'), color: 'var(--dms-age3)' }, { label: tr('Followed up', 'تمت متابعته'), color: 'var(--dms-royal)' }], num), '', esc(tr('Top 10 by assigned projects', 'أعلى 10 حسب المشاريع')))
      + panel(tr('Projects by region', 'المشاريع حسب المنطقة'), hbars((D.d.region_cards || []).map(function (c) { return { label: c.region, value: +c.count || 0, act: 'exr:' + c.region }; }), num) + note(esc(tr('From each project City. Select a region to explore its sectors and companies.', 'من حقل المدينة لكل مشروع. اختر منطقة لاستكشاف قطاعاتها وشركاتها.')))) + '</div>';
    return h;
  }
  function metricCell(p, key, tone) { var v = +p[key] || 0; return v ? '<button type="button" class="dms-linkbtn dms-num' + (tone && v ? ' dms-tone-' + tone : '') + '" data-act="plist" data-v="' + esc(JSON.stringify(listFilters(DRILL[key], p.employee))) + '">' + num(v) + '</button>' : '<span class="dms-sm">0</span>'; }
  function tabTeam() {
    return src('d', 'dms_sales_dashboard_data', function (d) {
      var key = F.st ? STK[F.st][3] : null, all = d.sales_people || [];
      var rows = all.filter(function (p) { return (!F.sp || p.employee === F.sp) && (!key || +p[key] > 0); });
      var totAll = sum(all, function (p) { return +p.assigned || 0; }), allocated = +((d.summary || {}).allocated || 0);
      var cols = [{ k: 'n', h: tr('Salesperson', 'المندوب'), s: function (p) { return pname(p); }, r: function (p) { return '<b>' + bdi(pname(p)) + '</b><span class="dms-sm"> ' + esc(p.employee) + '</span>'; }, c: function (p) { return pname(p); } }]
        .concat([['assigned', 'Projects', 'المشاريع'], ['never_contacted', 'Never contacted', 'لم يتم التواصل', 'warn'], ['due_today', 'Due today', 'اليوم', 'warn'], ['overdue', 'Overdue', 'متأخرة', 'bad'], ['contacted', 'Contacted', 'تواصل'], ['meetings', 'Meetings', 'اجتماعات'], ['quotations', 'Quotations', 'عروض'], ['negotiation', 'Negotiation', 'تفاوض'], ['won', 'Won', 'فوز'], ['lost', 'Lost', 'خسارة']].map(function (m) {
          return { k: m[0], h: tr(m[1], m[2]), num: 1, s: function (p) { return +p[m[0]] || 0; }, r: function (p) { return metricCell(p, m[0], m[3]); }, c: function (p) { return +p[m[0]] || 0; } };
        }));
      return (totAll === allocated ? '' : alertBox('warn', esc(tr('Assigned across salespeople (' + num(totAll) + ') does not match allocated projects (' + num(allocated) + '). Please review.', 'مجموع المشاريع المسندة (' + num(totAll) + ') لا يطابق المشاريع الموزعة (' + num(allocated) + '). يرجى المراجعة.')))) +
        panel(tr('Sales team performance', 'أداء فريق المبيعات'), regTable({ id: 't_team', rows: rows, cols: cols, sk: 'assigned', dir: -1, file: 'dms_sales_team', text: function (p) { return pname(p) + ' ' + p.employee; }, empty: tr('No salespeople match the current filters.', 'لا يوجد مندوبون مطابقون.'),
          foot: function (f) { return '<tr><td>' + esc(tr('Total', 'الإجمالي')) + ' (' + num(f.length) + ')</td>' + cols.slice(1).map(function (c) { return '<td class="dms-td-n"><b class="dms-num">' + num(sum(f, function (p) { return +p[c.k] || 0; })) + '</b></td>'; }).join('') + '</tr>'; } }), '', esc(tr('Select a number to open those projects in ERPNext.', 'اختر رقمًا لفتح تلك المشاريع في ERPNext.')));
    });
  }
  function fuRows(kind) { var d = D.d; return ((d && d[kind + '_followups']) || []).filter(function (r) { return (!F.sp || r.sales_person === F.sp) && (!F.st || (r.follow_up_status || 'Not Contacted') === F.st); }); }
  function tabFu() {
    return src('d', 'dms_sales_dashboard_data', function (d) {
      var s = d.summary || {}, v = [['overdue', tr('Overdue', 'متأخرة'), fuRows('overdue').length], ['upcoming', tr('Next 7 days', 'خلال 7 أيام'), fuRows('upcoming').length], ['recent', tr('Recent activity', 'آخر النشاط'), fuRows('recent').length]];
      var h = '<div class="dms-chips dms-bchips" role="group">' + v.map(function (x) { var on = FUV === x[0]; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="fuv" data-v="' + x[0] + '"><span>' + esc(x[1]) + '</span><b class="dms-num">' + num(x[2]) + '</b></button>'; }).join('') + '</div>';
      var pc = { k: 'p', h: tr('Project', 'المشروع'), s: function (r) { return r.project_code; }, r: projCell, c: function (r) { return r.project_code + ' ' + (r.project_name || ''); } };
      var spc = { k: 'sp', h: tr('Salesperson', 'المندوب'), s: function (r) { return pname(r); }, r: function (r) { return bdi(pname(r)); }, c: function (r) { return pname(r); } };
      var stc = { k: 'st', h: tr('Status', 'الحالة'), s: function (r) { return r.follow_up_status; }, r: function (r) { return stTag(r.follow_up_status); }, c: function (r) { return r.follow_up_status; } };
      var dc = function (k, en, ar) { return { k: k, h: tr(en, ar), s: function (r) { return r[k] || ''; }, r: function (r) { return fdate(r[k]); }, c: function (r) { return r[k]; } }; };
      var cols = FUV === 'overdue' ? [pc, spc, stc, dc('next_follow_up_date', 'Due date', 'تاريخ الاستحقاق'), { k: 'days', h: tr('Days overdue', 'أيام التأخير'), num: 1, s: function (r) { return +r.days_overdue || 0; }, r: function (r) { return '<b class="dms-num dms-tone-bad">' + num(r.days_overdue) + '</b>'; }, c: function (r) { return r.days_overdue; } }, dc('last_follow_up_date', 'Last follow-up', 'آخر متابعة')]
        : FUV === 'upcoming' ? [pc, spc, stc, dc('next_follow_up_date', 'Next follow-up', 'المتابعة التالية'), dc('last_follow_up_date', 'Last follow-up', 'آخر متابعة')]
          : [dc('follow_up_date', 'Date', 'التاريخ'), pc, spc, stc, dc('next_follow_up_date', 'Next follow-up', 'المتابعة التالية'), { h: tr('Remarks', 'الملاحظات'), r: function (r) { return '<span class="dms-sm">' + esc(r.remarks || '—') + '</span>'; }, c: function (r) { return r.remarks; } }];
      var meta = FUV === 'overdue' ? tr('Showing ' + num(fuRows('overdue').length) + ' of ' + num(s.overdue) + ', oldest first', 'المعروض ' + num(fuRows('overdue').length) + ' من ' + num(s.overdue) + '، الأقدم أولًا') : FUV === 'upcoming' ? tr('Today and the next 7 days', 'اليوم والأيام السبعة القادمة') : tr('Latest 20 entries', 'آخر 20 إدخالًا');
      return h + panel(v.filter(function (x) { return x[0] === FUV; })[0][1], regTable({ id: 't_fu_' + FUV, rows: fuRows(FUV), cols: cols, file: 'dms_followups_' + FUV, text: function (r) { return [r.project_code, r.project_name, pname(r), r.remarks].join(' '); }, empty: tr('Nothing here for the current filters.', 'لا شيء هنا للمرشحات الحالية.') }), '', esc(meta) + ' · ' + listBtn(listFilters(FUV === 'overdue' ? 'overdue' : FUV === 'upcoming' ? 'due_today' : 'allocated')));
    });
  }

  /* ---------- daily activity (v1 report, export and print) ---------- */
  function prevWorking(d) { var dt = Date.parse(String(d) + 'T00:00:00Z'); for (var i = 0; i < 7; i++) { dt -= 864e5; var wd = new Date(dt).getUTCDay(); if (wd !== 5 && wd !== 6) { break; } } return new Date(dt).toISOString().slice(0, 10); }
  function tabDa() {
    var people = (DA.people || []).slice().sort(function (a, b) { return String(a.employee_name).localeCompare(String(b.employee_name)); });
    var tools = '<div class="sx-tools"><div class="dms-ff sx-ff"><label for="sx-dad">' + esc(tr('Report date', 'تاريخ التقرير')) + '</label><input id="sx-dad" type="date" class="dms-input" data-da="date" value="' + esc(DA.date) + '" max="' + esc(TODAY) + '"></div>' +
      '<div class="dms-ff sx-ff"><label for="sx-dap">' + esc(tr('Salesperson', 'المندوب')) + '</label><select id="sx-dap" class="dms-input" data-da="person"><option value="">' + esc(tr('All salespeople', 'كل المندوبين')) + '</option>' + people.map(function (p) { return '<option value="' + esc(p.employee) + '"' + (p.employee === DA.person ? ' selected' : '') + '>' + esc(p.employee_name) + (p.inactive ? ' (' + esc(tr('inactive', 'غير نشط')) + ')' : '') + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="dms-btn dms-btn-sm" data-act="da" data-v="prev">' + esc(tr('Previous working day', 'يوم العمل السابق')) + '</button><button type="button" class="dms-btn dms-btn-sm" data-act="da" data-v="today">' + esc(tr('Today', 'اليوم')) + '</button>' +
      '<button type="button" class="dms-btn dms-btn-sm' + (DA.email ? ' dms-btn-on' : '') + '" aria-pressed="' + DA.email + '" data-act="da" data-v="email">' + esc(tr('Email preview', 'معاينة البريد')) + '</button>' +
      '<button type="button" class="dms-btn dms-btn-sm" data-act="da" data-v="csv">' + esc(tr('Export CSV', 'تصدير CSV')) + '</button><button type="button" class="dms-btn dms-btn-sm" data-act="da" data-v="print">' + esc(tr('Printable view', 'عرض للطباعة')) + '</button></div>';
    if (D.daErr) { return tools + srcErr(D.daErr, 'dms_daily_sales_activity_report'); }
    if (!D.da) { return tools + skel(2, 'dms-skel-panel'); }
    var d = D.da, s = d.summary || {}, sc = d.status_counts || {};
    var h = tools + note(esc(d.date_label + ' (' + d.weekday + ')' + (d.is_working_day ? '' : ' · ' + tr('non-working day', 'يوم غير عمل')))) + kpis([
      kpi({ label: tr('Activities', 'الأنشطة'), val: num(s.activities), sub: esc(+s.late_entries > 0 ? num(s.late_entries) + ' ' + tr('late entries', 'إدخالات متأخرة') : tr('No late entries', 'لا إدخالات متأخرة')) }),
      kpi({ label: tr('Active salespeople', 'المندوبون النشطون'), val: num(s.active_salespeople) + ' / ' + num(s.total_salespeople), sub: esc(+s.inactive_salespeople > 0 ? num(s.inactive_salespeople) + ' ' + tr('inactive flagged separately', 'غير نشطين مستقلون') : tr('Active employees only', 'الموظفون النشطون فقط')) }),
      kpi({ label: tr('Projects with activity', 'مشاريع بها نشاط'), val: num(s.projects_with_activity), sub: esc(tr('Unique projects', 'مشاريع فريدة')) }),
      kpi({ label: tr('Overdue follow-ups', 'متابعات متأخرة'), dot: +s.overdue_followups ? 'var(--dms-bad)' : null, val: num(s.overdue_followups), sub: esc(tr('As of ', 'حتى ') + (s.overdue_as_of_label || '')) })
    ]);
    h += panel(tr('Recorded statuses', 'الحالات المسجلة'), shareList(STAGES.slice(1).map(function (x) { return { label: tr(x[1], x[2]), value: +sc[x[0]] || 0, color: x[4] }; }), '', num, true) + note(esc(tr('Statuses entered by salespeople; Won does not confirm an ERPNext Sales Order.', 'حالات أدخلها المندوبون؛ الفوز لا يؤكد أمر بيع في ERPNext.'))), 'dms-mb');
    var none = d.is_working_day ? (d.no_activity || []).length : 0;
    h += '<div class="dms-chips dms-bchips" role="group">' + [['people', tr('Salespeople', 'المندوبون'), (d.salespeople || []).length], ['activities', tr('Project activities', 'أنشطة المشاريع'), (d.activities || []).length], ['none', tr('No activity', 'بلا نشاط'), none]].map(function (x) { var on = DA.tab === x[0]; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="da" data-v="tab:' + x[0] + '"><span>' + esc(x[1]) + '</span><b class="dms-num">' + num(x[2]) + '</b></button>'; }).join('') + '</div>';
    if (DA.tab === 'activities') {
      h += regTable({ id: 't_da_act', rows: d.activities || [], file: 'dms_activities_' + d.date, text: function (a) { return [a.project_code, a.project_name, a.employee_name, a.status, a.remarks].join(' '); }, empty: tr('No project activity was recorded for this date.', 'لم يسجل نشاط في هذا التاريخ.'), cols: [
        { k: 'p', h: tr('Project', 'المشروع'), s: function (a) { return a.project_code; }, r: projCell, c: function (a) { return a.project_code; } },
        { k: 'e', h: tr('Salesperson', 'المندوب'), s: function (a) { return a.employee_name; }, r: function (a) { return bdi(a.employee_name); }, c: function (a) { return a.employee_name; } },
        { k: 'st', h: tr('Activity', 'النشاط'), s: function (a) { return a.status; }, r: function (a) { return stTag(a.status); }, c: function (a) { return a.status; } },
        { h: tr('Remarks', 'الملاحظات'), r: function (a) { return '<span class="dms-sm">' + esc(a.remarks || '—') + '</span>'; }, c: function (a) { return a.remarks; } },
        { k: 'nx', h: tr('Next follow-up', 'المتابعة التالية'), s: function (a) { return a.next_follow_up_date || ''; }, r: function (a) { return fdate(a.next_follow_up_date); }, c: function (a) { return a.next_follow_up_date; } },
        { h: tr('Entry', 'الإدخال'), r: function (a) { return a.late ? stat('warn', tr('Late entry ', 'إدخال متأخر ') + (a.created_on || '')) : '<span class="dms-sm">' + esc(tr('On time', 'في الوقت')) + '</span>'; }, c: function (a) { return a.late ? 'Late ' + a.created_on : 'On time'; } }] });
    } else if (DA.tab === 'none') {
      if (!d.is_working_day) { h += empty(d.weekday + ' ' + tr('is outside the Sunday to Thursday working week.', 'خارج أسبوع العمل من الأحد إلى الخميس.')); }
      else {
        var by = {}; (d.salespeople || []).forEach(function (p) { by[p.employee] = p; });
        h += regTable({ id: 't_da_none', rows: d.no_activity || [], file: 'dms_no_activity_' + d.date, text: function (n) { return n.employee_name; }, empty: tr('Every active salesperson recorded at least one DMS activity.', 'كل مندوب نشط سجل نشاطًا واحدًا على الأقل.'), cols: [
          { k: 'e', h: tr('Salesperson', 'المندوب'), s: function (n) { return n.employee_name; }, r: function (n) { return bdi(n.employee_name) + '<span class="dms-sm"> ' + esc(n.employee) + '</span>'; }, c: function (n) { return n.employee_name; } },
          { k: 'p', h: tr('Projects', 'المشاريع'), num: 1, s: function (n) { return +n.projects || 0; }, r: function (n) { return num(n.projects); }, c: function (n) { return n.projects; } },
          { k: 'o', h: tr('Overdue', 'متأخرة'), num: 1, s: function (n) { return +(by[n.employee] || {}).overdue || 0; }, r: function (n) { var o = +(by[n.employee] || {}).overdue || 0; return '<span class="dms-num' + (o ? ' dms-tone-bad' : '') + '">' + num(o) + '</span>'; }, c: function (n) { return (by[n.employee] || {}).overdue; } }] });
        var inact = (d.salespeople || []).filter(function (p) { return p.inactive; });
        if (inact.length) { h += alertBox('warn', '<b>' + esc(tr('Inactive employees holding projects', 'موظفون غير نشطين لديهم مشاريع')) + ':</b> ' + esc(inact.map(function (p) { return p.employee_name + ' (' + num(p.projects) + ')'; }).join(', ')) + '. ' + esc(tr('Reallocation may be needed.', 'قد يلزم إعادة التوزيع.'))); }
      }
    } else {
      h += regTable({ id: 't_da_people', rows: d.salespeople || [], file: 'dms_activity_people_' + d.date, sk: 'act', dir: -1, text: function (p) { return p.employee_name + ' ' + p.employee; }, cols: [
        { k: 'e', h: tr('Salesperson', 'المندوب'), s: function (p) { return p.employee_name; }, r: function (p) { return bdi(p.employee_name) + '<span class="dms-sm"> ' + esc(p.employee) + '</span>'; }, c: function (p) { return p.employee_name; } },
        { k: 'p', h: tr('Projects', 'المشاريع'), num: 1, s: function (p) { return +p.projects || 0; }, r: function (p) { return num(p.projects); }, c: function (p) { return p.projects; } },
        { k: 'act', h: tr('Activities', 'الأنشطة'), num: 1, s: function (p) { return +p.activities || 0; }, r: function (p) { return '<b class="dms-num">' + num(p.activities) + '</b>'; }, c: function (p) { return p.activities; } },
        { k: 'o', h: tr('Overdue', 'متأخرة'), num: 1, s: function (p) { return +p.overdue || 0; }, r: function (p) { return '<span class="dms-num' + (+p.overdue ? ' dms-tone-bad' : '') + '">' + num(p.overdue) + '</span>'; }, c: function (p) { return p.overdue; } },
        { k: 'l', h: tr('Late entries', 'إدخالات متأخرة'), num: 1, s: function (p) { return +p.late || 0; }, r: function (p) { return num(p.late); }, c: function (p) { return p.late; } },
        { h: tr('Status', 'الحالة'), r: function (p) { return p.inactive ? stat('n', tr('Inactive employee', 'موظف غير نشط')) : +p.activities > 0 ? stat('ok', tr('Active', 'نشط')) : d.is_working_day ? stat('bad', tr('No activity recorded', 'لا نشاط مسجل')) : '<span class="dms-sm">' + esc(tr('Non-working day', 'يوم غير عمل')) + '</span>'; }, c: function (p) { return p.inactive ? 'Inactive' : +p.activities > 0 ? 'Active' : 'No activity'; } }] });
    }
    if (DA.email) { h += panel(tr('Email preview', 'معاينة البريد'), '<p class="dms-sm"><b>' + esc(tr('Subject', 'الموضوع')) + ':</b> ' + esc(d.email_subject || '') + ' · ' + esc(tr('preview only — sending is not enabled', 'معاينة فقط — الإرسال غير مفعّل')) + '</p><iframe class="sx-frame" sandbox="" title="' + esc(tr('Email preview', 'معاينة البريد')) + '" srcdoc="' + esc(d.email_html || '') + '"></iframe>', 'dms-mb'); }
    return h + note(esc(tr('Tracks DMS follow-up entries only, by the follow-up date entered. Overdue is the live count, not as of the report date.', 'يتتبع إدخالات متابعة DMS فقط حسب تاريخ المتابعة المدخل. المتأخر هو العدد الحالي وليس حسب تاريخ التقرير.')));
  }
  function daCsv() {
    var d = D.da; if (!d) { return; }
    var s = d.summary || {}, out = [], line = function (a) { out.push(a.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',')); };
    line(['Daily DMS Sales Activity Report']); line(['Report date', d.date_label + ' (' + d.weekday + ')']); line(['Source', 'DMS Follow Up History (follow-up date entered by the salesperson)']); line(['Note', 'Recorded pipeline statuses only; Won does not confirm an ERPNext Sales Order.']); out.push('');
    line(['Summary']); line(['Total activities', s.activities]); line(['Active salespeople', s.active_salespeople + ' / ' + s.total_salespeople]); line(['Projects with activity (unique)', s.projects_with_activity]); line(['Overdue follow-ups as of ' + s.overdue_as_of_label, s.overdue_followups]); line(['Late entries', s.late_entries]); out.push('');
    line(['Salespeople']); line(['Salesperson', 'Employee', 'Projects', 'Activities', 'Overdue', 'Late entries', 'Status']);
    (d.salespeople || []).forEach(function (p) { line([p.employee_name, p.employee, p.projects, p.activities, p.overdue, p.late, p.inactive ? 'Inactive employee' : (+p.activities > 0 ? 'Active' : (d.is_working_day ? 'No Activity Recorded' : 'Non-working day'))]); });
    out.push(''); line(['Project Activities']); line(['Project', 'Project name', 'Salesperson', 'Activity', 'Remarks', 'Next follow-up', 'Entered', 'Late entry']);
    (d.activities || []).forEach(function (a) { line([a.project_code, a.project_name, a.employee_name, a.status, a.remarks, a.next_follow_up_date, a.created_on, a.late ? 'Yes' : 'No']); });
    if (d.is_working_day) { out.push(''); line(['No Activity Recorded']); line(['Salesperson', 'Employee', 'Projects']); (d.no_activity || []).forEach(function (n) { line([n.employee_name, n.employee, n.projects]); }); }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + out.join('\r\n')], { type: 'text/csv;charset=utf-8;' })); a.download = 'Daily_DMS_Sales_Activity_' + d.date + '.csv'; HOST.appendChild(a); a.click(); a.remove();
  }
  function daPrint() {
    var d = D.da; if (!d) { return; } var w = G.open('', '_blank');
    if (!w) { toast(tr('Allow pop-ups to open the printable view.', 'اسمح بالنوافذ المنبثقة لفتح عرض الطباعة.'), true); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Daily DMS Sales Activity Report - ' + esc(d.date_label) + '</title></head><body style="margin:24px">' + d.email_html + '</body></html>'); w.document.close(); w.focus(); later(function () { w.print(); }, 500);
  }

  /* ---------- project explorer: region → sector → companies → projects ---------- */
  function exCard(label, n, allocated, act, sub) { return kpi({ label: label, val: num(n), sub: esc(sub || (num(allocated) + ' ' + tr('allocated', 'موزعة'))), act: act }); }
  function tabEx() {
    if (D.dErr) { return srcErr(D.dErr, 'dms_sales_dashboard_data'); }
    if (!D.d) { return skel(2, 'dms-skel-panel'); }
    var crumbs = ['<button type="button" class="dms-linkbtn" data-act="ex" data-v="reset">' + esc(tr('All regions', 'كل المناطق')) + '</button>'];
    if (EX.region) { crumbs.push(EX.sector === null ? '<b>' + esc(EX.region) + '</b>' : '<button type="button" class="dms-linkbtn" data-act="ex" data-v="crumb">' + esc(EX.region) + '</button>'); }
    if (EX.sector !== null) { crumbs.push('<b>' + esc(EX.sector === '__none__' ? tr('Not classified', 'غير مصنف') : EX.sector) + '</b>'); }
    var h = '<nav class="sx-crumbs" aria-label="' + esc(tr('Explorer path', 'مسار الاستكشاف')) + '">' + crumbs.join(' <span aria-hidden="true">›</span> ') + (EX.region ? ' <button type="button" class="dms-btn dms-btn-sm" data-act="ex" data-v="back">' + esc(tr('Back', 'رجوع')) + '</button>' : '') + '</nav>';
    if (!EX.region) {
      return h + kpis(['Riyadh', 'Eastern', 'Western', 'Other', 'Unclassified'].filter(function (r) { return CC.regionMap[r]; }).map(function (r) { var c = CC.regionMap[r]; return exCard(r, c.count, c.allocated, 'exr:' + r, r === 'Unclassified' ? tr('Requires location verification', 'يتطلب تحقق الموقع') : ''); })) +
        note(esc(tr('From each project City; every project is in exactly one region. Select a region to see its sectors.', 'من حقل المدينة؛ كل مشروع في منطقة واحدة. اختر منطقة لعرض قطاعاتها.')));
    }
    if (D.exErr) { return h + srcErr(D.exErr, 'dms_project_explorer_sectors'); }
    if (!D.ex) { if (!D.exTok) { loadEx(); } return h + skel(1, 'dms-skel-panel'); }
    var ids = exMatching();
    if (EX.sector === null) {
      var counts = {}, alloc = {}, none = { n: 0, a: 0 };
      exRegionIds().forEach(function (id) { var p = exInfo(id); if (!p[1].length) { none.n++; none.a += p[2]; } p[1].forEach(function (i) { var nm = D.ex.sectors[i]; counts[nm] = (counts[nm] || 0) + 1; alloc[nm] = (alloc[nm] || 0) + p[2]; }); });
      var list = Object.keys(counts).sort(function (a, b) { return (counts[b] - counts[a]) || a.localeCompare(b); });
      return h + '<div class="dms-actions-row sx-sum"><span><b>' + esc(EX.region) + '</b>: ' + esc(num(ids.length) + ' ' + tr('projects', 'مشروعًا') + ', ' + num(exAlloc(ids)) + ' ' + tr('allocated', 'موزعة')) + '</span>' + listBtn({ name: ['in', ids.length ? ids : ['-']] }, tr('Open all ' + num(ids.length) + ' projects', 'فتح كل المشاريع (' + num(ids.length) + ')')) + '</div>' +
        kpis(list.map(function (nm) { return exCard(nm, counts[nm], alloc[nm], 'exs:' + nm); }).concat([exCard(tr('Not classified', 'غير مصنف'), none.n, none.a, 'exs:__none__')])) + note(esc(tr('A project can have several sectors, so counts overlap. Select a sector to see its contractors and subcontractors.', 'قد يكون للمشروع أكثر من قطاع فتتداخل الأعداد. اختر قطاعًا لعرض المقاولين والمقاولين من الباطن.')));
    }
    if (!CC.data) { return h + empty(tr('Company data is not available.', 'بيانات الشركات غير متاحة.')); }
    var inS = setOf(ids), nCon = exCompanies('contractors', EX.stage, inS).length, nSub = exCompanies('subcontractors', EX.stage, inS).length, miss = ids.filter(function (id) { return !CC.hasContr[id]; });
    h += '<div class="dms-actions-row sx-sum"><span>' + esc(num(ids.length) + ' ' + tr('projects', 'مشروعًا') + ', ' + num(exAlloc(ids)) + ' ' + tr('allocated', 'موزعة')) + '</span>' + listBtn({ name: ['in', ids.length ? ids : ['-']] }, tr('Open all projects', 'فتح كل المشاريع')) + '</div>';
    h += '<div class="dms-chips dms-bchips" role="group">' + [['contractors', tr('Contractors', 'المقاولون'), nCon], ['subcontractors', tr('Subcontractors', 'مقاولو الباطن'), nSub], ['nocontractor', tr('No contractor information', 'بلا معلومات مقاول'), miss.length]].map(function (x) { var on = EX.tab === x[0]; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="ex" data-v="tab:' + x[0] + '"><span>' + esc(x[1]) + '</span><b class="dms-num">' + num(x[2]) + '</b></button>'; }).join('') + '</div>';
    if (EX.tab === 'nocontractor') { return h + (miss.length ? alertBox('info', esc(num(miss.length) + ' ' + tr('matching projects have no contractor record (' + num(exAlloc(miss)) + ' allocated). Some may still list subcontractors.', 'مشروعًا بلا سجل مقاول (' + num(exAlloc(miss)) + ' موزعة). قد تحتوي بعضها على مقاولين من الباطن.')) + ' ' + listBtn({ name: ['in', miss] }, tr('Open these projects', 'فتح هذه المشاريع'))) : empty(tr('Every matching project has at least one contractor record.', 'كل مشروع مطابق لديه سجل مقاول واحد على الأقل.'))); }
    h += '<div class="sx-tools"><div class="dms-chips dms-bchips" role="group">' + CC_STAGES.map(function (s) { var on = EX.stage === s[0]; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="ex" data-v="stage:' + s[0] + '"><span>' + esc(tr(s[1], s[2])) + '</span></button>'; }).join('') + '</div><input type="search" class="dms-input sx-q" data-exq="1" value="' + esc(EX.q) + '" placeholder="' + esc(tr('Search company names…', 'ابحث في أسماء الشركات…')) + '" aria-label="' + esc(tr('Search company names', 'ابحث في أسماء الشركات')) + '"></div>';
    var q = EX.q.trim().toLowerCase(), rows = exCompanies(EX.tab, EX.stage, inS).filter(function (r) { return !q || String(r.c.name).toLowerCase().indexOf(q) >= 0 || (r.c.entities || []).some(function (e) { return String(e.name || '').toLowerCase().indexOf(q) >= 0; }); });
    if (!rows.length) { return h + empty(tr('No companies match the selected region, sector and filters.', 'لا شركات مطابقة للمنطقة والقطاع والمرشحات.')); }
    var shown = EX.all ? rows : rows.slice(0, 14);
    h += kpis(shown.map(function (r) { var ents = (r.c.entities || []).length; return kpi({ label: r.c.name, val: num(r.ids.length), sub: esc(num(r.al) + ' ' + tr('allocated', 'موزعة') + (ents > 1 ? ' · ' + num(ents) + ' ' + tr('entities', 'كيانات') : '')), act: 'exc:' + EX.tab + ':' + r.idx, tip: (r.c.entities || []).map(function (e) { return e.name + ' (' + e.projects + ')'; }).join(', ') }); }));
    if (rows.length > shown.length) { h += '<div class="dms-actions-row"><button type="button" class="dms-btn dms-btn-sm" data-act="ex" data-v="more">' + esc(tr('Show all ' + num(rows.length) + ' companies', 'عرض كل الشركات (' + num(rows.length) + ')')) + '</button></div>'; }
    return h + note(esc(tr('Counts are unique projects. Stage shows the highest stage reached (pre-qualified, bidding or awarded); subcontractors take the highest stage among the contractors on the same project. Company names use display aliases only.', 'الأعداد مشاريع فريدة. المرحلة هي أعلى مرحلة تم الوصول إليها؛ ومقاولو الباطن يأخذون أعلى مرحلة لمقاولي المشروع نفسه. أسماء الشركات أسماء عرض فقط.')));
  }

  /* ---------- key personnel contact requests (write: dms_share_key_personnel_contact) ---------- */
  var KS = [['Pending', 'Pending', 'معلقة', 'warn'], ['In Progress', 'In progress', 'قيد التنفيذ', 'n'], ['Shared', 'Shared', 'تمت المشاركة', 'ok'], ['Rejected', 'Rejected', 'مرفوضة', 'bad']];
  function kprRows() {
    var q = KPR.q.trim().toLowerCase(), spn = F.sp ? pname(((D.d && D.d.sales_people) || []).filter(function (p) { return p.employee === F.sp; })[0] || {}) : '';
    return ((D.kpr && D.kpr.requests) || []).filter(function (r) {
      var ok = KPR.filter === 'open' ? (r.status === 'Pending' || r.status === 'In Progress') : KPR.filter === 'all' || r.status === KPR.filter;
      return ok && (!F.sp || cname(r.sales_person) === spn || r.sales_person === F.sp) && (!q || [r.name, r.project_code, r.project_name, r.sales_person, r.required_designation, r.request_reason].join(' ').toLowerCase().indexOf(q) >= 0);
    });
  }
  function tabKpr() {
    if (D.kprErr) { return alertBox('info', esc(tr('Contact requests are only available to managers authorised for them.', 'طلبات جهات الاتصال متاحة فقط للمديرين المخولين.'))) + (D.kprErr === 'tech' ? srcErr(D.kprErr, 'dms_manager_contact_requests') : ''); }
    if (!D.kpr) { return skel(2, 'dms-skel-panel'); }
    var c = D.kpr.counts || {};
    var h = kpis(KS.map(function (k) { var on = KPR.filter === k[0]; return kpi({ label: tr(k[1], k[2]), dot: k[3] === 'n' ? 'var(--dms-royal)' : k[3] === 'warn' ? 'var(--dms-age3)' : k[3] === 'ok' ? 'var(--dms-ok)' : 'var(--dms-bad)', val: num(+c[k[0]] || 0), top: on ? tagc(esc(tr('Shown', 'معروضة'))) : '', act: 'kprf:' + k[0] }); }));
    h += '<div class="dms-chips dms-bchips" role="group">' + [['open', tr('Open (pending + in progress)', 'مفتوحة (معلقة + قيد التنفيذ)')], ['all', tr('All statuses', 'كل الحالات')]].map(function (x) { var on = KPR.filter === x[0]; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="kprf" data-v="' + x[0] + '"><span>' + esc(x[1]) + '</span></button>'; }).join('') + '</div>';
    var rows = kprRows();
    return h + panel(tr('Key personnel contact requests', 'طلبات جهات الاتصال'), regTable({ id: 't_kpr', rows: rows, file: 'dms_contact_requests', text: function (r) { return [r.name, r.project_code, r.project_name, r.sales_person, r.required_designation, r.request_reason].join(' '); }, empty: tr('No requests in this view.', 'لا طلبات في هذا العرض.'), cols: [
      { k: 'n', h: tr('Request', 'الطلب'), s: function (r) { return r.name; }, r: function (r) { return docLink('DMS Key Personnel Request', r.name); }, c: function (r) { return r.name; } },
      { k: 'p', h: tr('Project', 'المشروع'), s: function (r) { return r.project_code; }, r: function (r) { return projCell({ project: r.dms_project, project_code: r.project_code, project_name: r.project_name }); }, c: function (r) { return r.project_code; } },
      { k: 'sp', h: tr('Salesperson', 'المندوب'), s: function (r) { return cname(r.sales_person); }, r: function (r) { return bdi(cname(r.sales_person)); }, c: function (r) { return cname(r.sales_person); } },
      { k: 'd', h: tr('Designation needed', 'المسمى المطلوب'), s: function (r) { return r.required_designation; }, r: function (r) { return bdi(r.required_designation || '—'); }, c: function (r) { return r.required_designation; } },
      { h: tr('Reason', 'السبب'), r: function (r) { return '<span class="dms-sm" title="' + esc(r.request_reason || '') + '">' + esc(plain(r.request_reason, 110)) + '</span>'; }, c: function (r) { return r.request_reason; } },
      { k: 'dt', h: tr('Date', 'التاريخ'), s: function (r) { return r.request_date || ''; }, r: function (r) { return fdate(r.request_date); }, c: function (r) { return r.request_date; } },
      { k: 'st', h: tr('Status', 'الحالة'), s: function (r) { return r.status; }, r: function (r) { var k = KS.filter(function (x) { return x[0] === r.status; })[0] || ['', r.status, r.status, 'n']; return stat(k[3], tr(k[1], k[2])) + (r.status === 'Shared' && r.contact_count > 1 ? '<span class="dms-sm"> · ' + num(r.contact_count) + '</span>' : ''); }, c: function (r) { return r.status; } },
      { h: '', r: function (r) { return r.status === 'Pending' || r.status === 'In Progress' ? '<button type="button" class="dms-btn dms-btn-sm dms-btn-primary" data-act="kpr" data-v="' + esc(r.name) + '">' + esc(r.status === 'Pending' ? tr('Review / share', 'مراجعة / مشاركة') : tr('Share contact', 'مشاركة جهة الاتصال')) + '</button>' : ''; }, c: function () { return ''; } }] }), '', esc(num(rows.length) + ' ' + tr('shown', 'معروضة') + (D.kpr.truncated ? ' · ' + tr('latest ' + num((D.kpr.requests || []).length) + ' loaded', 'تم تحميل آخر ' + num((D.kpr.requests || []).length)) : '')));
  }
  /* Share dialog: one request can carry several contacts (v1 validation; up to 10). */
  var MC = null, MC_MAX = 10;
  function mcBlank(row) { var d = String(row.required_designation || '').trim(); return { contact_name: '', mobile_number: '', designation: (d && d.toLowerCase() !== 'any') ? d : '', email_address: '', company: '' }; }
  function mcValidate(list) {
    var seen = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i], lab = tr('Contact ', 'جهة الاتصال ') + (i + 1) + ': ', nm = String(c.contact_name || '').trim(), mob = String(c.mobile_number || '').trim(), em = String(c.email_address || '').trim();
      if (!nm) { return lab + tr('Contact name is required.', 'الاسم مطلوب.'); }
      if (!mob && !em) { return lab + tr('enter a mobile number or an email address.', 'أدخل رقم جوال أو بريدًا إلكترونيًا.'); }
      if (em && (em.indexOf('@') < 1 || em.split('@').pop().indexOf('.') < 0 || /\s/.test(em))) { return lab + tr('the email address is not valid.', 'البريد الإلكتروني غير صالح.'); }
      var key = nm.toLowerCase() + '|' + mob + '|' + em.toLowerCase(); if (seen.indexOf(key) >= 0) { return lab + tr('this contact duplicates an earlier one.', 'هذه الجهة مكررة.'); } seen.push(key);
    }
    return '';
  }
  function mcBody() {
    var r = MC.row, f = function (i, k, en, ar, req, type) { return '<div class="dms-ff"><label for="mc-' + i + k + '">' + esc(tr(en, ar)) + (req ? ' <span class="dms-tone-bad">*</span>' : '') + '</label><input id="mc-' + i + k + '" class="dms-input" type="' + (type || 'text') + '" maxlength="140" data-mc-i="' + i + '" data-mc-k="' + k + '" value="' + esc(MC.list[i][k]) + '"></div>'; };
    return '<div class="dms-facts"><div><span class="dms-sm">' + esc(tr('Project', 'المشروع')) + '</span><b>' + esc((r.project_code || '') + ' · ' + cname(r.project_name)) + '</b></div><div><span class="dms-sm">' + esc(tr('Requested by', 'مقدم الطلب')) + '</span><b>' + esc(cname(r.sales_person)) + '</b></div>' +
      '<div><span class="dms-sm">' + esc(tr('Designation needed', 'المسمى المطلوب')) + '</span><b>' + esc(r.required_designation || '—') + '</b></div><div><span class="dms-sm">' + esc(tr('Status', 'الحالة')) + '</span><b>' + esc(r.status) + '</b></div></div>' +
      (r.request_reason ? '<p class="dms-sm">' + esc(r.request_reason) + '</p>' : '') + (MC.err ? alertBox('err', esc(MC.err)) : '') +
      MC.list.map(function (c, i) { return '<fieldset class="sx-mc"><legend>' + esc(tr('Contact ', 'جهة الاتصال ') + (i + 1)) + (MC.list.length > 1 ? ' <button type="button" class="dms-linkbtn dms-tone-bad" data-act="mc" data-v="rm:' + i + '">' + esc(tr('Remove', 'إزالة')) + '</button>' : '') + '</legend><div class="sx-mc-g">' +
        f(i, 'contact_name', 'Contact name', 'الاسم', true) + f(i, 'mobile_number', 'Mobile number', 'رقم الجوال', false, 'tel') + f(i, 'designation', 'Designation', 'المسمى') + f(i, 'email_address', 'Email address', 'البريد الإلكتروني', false, 'email') + f(i, 'company', 'Company', 'الشركة') + '</div></fieldset>'; }).join('') +
      '<div class="dms-actions-row"><button type="button" class="dms-btn dms-btn-sm" data-act="mc" data-v="add"' + (MC.list.length >= MC_MAX || MC.busy ? ' disabled' : '') + '>+ ' + esc(tr('Add another contact', 'إضافة جهة أخرى')) + '</button></div>' +
      '<div class="dms-actions-row sx-mc-act"><button type="button" class="dms-btn dms-btn-primary" data-act="mc" data-v="share"' + (MC.busy ? ' disabled' : '') + '>' + esc(MC.list.length > 1 ? tr('Share ' + MC.list.length + ' contacts', 'مشاركة ' + MC.list.length + ' جهات') : tr('Share contact', 'مشاركة جهة الاتصال')) + '</button>' +
      (r.status === 'Pending' ? '<button type="button" class="dms-btn" data-act="mc" data-v="progress"' + (MC.busy ? ' disabled' : '') + '>' + esc(tr('Mark in progress', 'تحديد قيد التنفيذ')) + '</button>' : '') +
      '<button type="button" class="dms-btn sx-bad" data-act="mc" data-v="reject"' + (MC.busy ? ' disabled' : '') + '>' + esc(MC.confirm ? tr('Confirm reject — cannot be undone', 'تأكيد الرفض — لا يمكن التراجع') : tr('Reject', 'رفض')) + '</button></div>';
  }
  function mcRedraw(focusSel) { if (OVL && OVL.mc) { OVL.body = mcBody(); renderOverlay(); var el = focusSel && HOST.querySelector(focusSel); if (el) { el.focus(); } } }
  function mcSend(action) {
    var args = { request_id: MC.row.name, action: action }; if (action === 'Shared') { args.contacts = JSON.stringify(MC.list); }
    MC.busy = true; MC.err = ''; mcRedraw();
    callP('dms_share_key_personnel_contact', args).then(function (m) {
      MC.busy = false; if (!m || !m.success) { MC.err = tr('The request was not updated.', 'لم يتم تحديث الطلب.'); mcRedraw(); return; }
      var n = m.contacts_shared; toast(MC.row.name + ': ' + action + (action === 'Shared' && n ? ' (' + n + ')' : '')); MC = null; closeOverlay();
      run('kpr', function (chk) { return guarded(chk, 'dms_manager_contact_requests', {}); });
    }, function (e) { MC.busy = false; MC.err = e && e.message ? e.message : tr('Something went wrong. Try again.', 'حدث خطأ. حاول مرة أخرى.'); mcRedraw(); });
  }
  function tabActions(AM) { return actionsTab(AM, tr('Live counts for all projects; the lists open the records. Not limited by the filters.', 'أعداد حية لكل المشاريع؛ والقوائم تفتح السجلات. غير مقيدة بالمرشحات.')); }

  /* ============================================================ drill-downs and events */
  function drill(id) {
    if (id.indexOf('kpr:') === 0 && MC) { return { title: tr('Contact request ', 'طلب جهة اتصال ') + MC.row.name, sub: tr('Share the contact details with the salesperson, mark in progress, or reject.', 'شارك بيانات جهة الاتصال مع المندوب أو حدده قيد التنفيذ أو ارفض.'), body: mcBody(), mc: true, stack: false }; }
    if (id === 'cli:a_mis' || id === 'cli:a_never') {
      var t = id === 'cli:a_mis' ? 'mismatch' : 'never_contacted', s = actSpecs().filter(function (x) { return x.id === id.slice(4); })[0];
      return { title: s.title, sub: s.why, body: '<p>' + esc(num(D.d.summary[t === 'mismatch' ? 'allocation_mismatch' : 'never_contacted']) + ' ' + tr('projects', 'مشروعًا')) + '</p><div class="dms-actions-row">' + listBtn(listFilters(t)) + '</div>' };
    }
    if (id.indexOf('cli:') === 0) {
      var k = id.slice(4), cc = actClient(), x = cc && cc[k], sp = actSpecs().filter(function (y) { return y.id === k; })[0];
      if (!x || typeof x === 'string' || !sp) { return null; }
      return { title: sp.title, sub: sp.why, spec: { rows: x.rows.map(x.item), file: k, text: function (it) { return [it.title, it.desc, it.who].join(' '); }, cols: [
        { h: tr('Record', 'السجل'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.name; } },
        { h: tr('Details', 'التفاصيل'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc) + '</span>'; }, c: function (it) { return it.desc; } },
        { h: tr('Salesperson', 'المندوب'), r: function (it) { return bdi(it.who || '—'); }, c: function (it) { return it.who; } },
        { h: tr('When', 'متى'), r: function (it) { return '<span class="dms-tone-' + it.tone + '">' + esc(it.due) + '</span>'; }, c: function (it) { return it.due; } }] } };
    }
    return null;
  }
  function onAct(a, v, n) {
    if (a === 'plist') { try { openList(JSON.parse(v)); } catch (e) { /* ignore */ } return true; }
    if (a === 'kpi' && v.indexOf('list:') === 0) { openList(listFilters(v.slice(5))); return true; }
    if (a === 'kpi' && v.indexOf('person:') === 0) { openList(listFilters('assigned', v.slice(7))); return true; }
    if (a === 'kpi' && v.indexOf('exr:') === 0) { EX.region = v.slice(4); EX.sector = null; EX.tab = 'contractors'; EX.stage = 'all'; EX.q = ''; EX.all = false; if (tab !== 'explorer') { goTab('explorer'); } else { renderSoft(); } return true; }
    if (a === 'kpi' && v.indexOf('exs:') === 0) { EX.sector = v.slice(4); EX.tab = 'contractors'; EX.stage = 'all'; EX.q = ''; EX.all = false; renderSoft(); return true; }
    if (a === 'kpi' && v.indexOf('exc:') === 0) { var p = v.slice(4).split(':'), hit = exCompanies(p[0], EX.stage, setOf(exMatching())).filter(function (r) { return String(r.idx) === p[1]; })[0]; if (hit) { openList({ name: ['in', hit.ids] }); } return true; }
    if (a === 'kpi' && v.indexOf('kprf:') === 0) { var f = v.slice(5); KPR.filter = KPR.filter === f ? 'open' : f; renderSoft(); return true; }
    if (a === 'kprf') { KPR.filter = v; renderSoft(); return true; }
    if (a === 'ex') {
      if (v === 'reset') { EX.region = ''; EX.sector = null; } else if (v === 'crumb') { EX.sector = null; } else if (v === 'back') { if (EX.sector !== null) { EX.sector = null; } else { EX.region = ''; } }
      else if (v === 'more') { EX.all = true; } else if (v.indexOf('tab:') === 0) { EX.tab = v.slice(4); EX.q = ''; EX.all = false; } else if (v.indexOf('stage:') === 0) { EX.stage = v.slice(6); EX.all = false; }
      renderSoft(); return true;
    }
    if (a === 'fuv') { FUV = v; renderSoft(); var b = HOST.querySelector('[data-act="fuv"][data-v="' + v + '"]'); if (b) { b.focus(); } return true; }
    if (a === 'da') {
      if (v === 'prev') { DA.date = prevWorking(DA.date || (D.da && D.da.date) || TODAY); loadDa(); } else if (v === 'today') { DA.date = TODAY; loadDa(); }
      else if (v === 'email') { DA.email = !DA.email; renderSoft(); } else if (v === 'csv') { daCsv(); } else if (v === 'print') { daPrint(); } else if (v.indexOf('tab:') === 0) { DA.tab = v.slice(4); renderSoft(); }
      return true;
    }
    if (a === 'kpr') { var row = ((D.kpr && D.kpr.requests) || []).filter(function (r) { return r.name === v; })[0]; if (row) { MC = { row: row, list: [mcBlank(row)], err: '', busy: false, confirm: false }; openDrill('kpr:' + v); } return true; }
    if (a === 'mc' && MC) {
      if (v === 'add' && MC.list.length < MC_MAX) { MC.list.push(mcBlank(MC.row)); MC.err = ''; mcRedraw('[data-mc-i="' + (MC.list.length - 1) + '"][data-mc-k="contact_name"]'); }
      else if (v.indexOf('rm:') === 0) { MC.list.splice(+v.slice(3), 1); mcRedraw(); }
      else if (v === 'share') { MC.err = mcValidate(MC.list); if (MC.err) { mcRedraw(); } else { mcSend('Shared'); } }
      else if (v === 'progress') { mcSend('In Progress'); }
      else if (v === 'reject') { if (MC.confirm) { mcSend('Rejected'); } else { MC.confirm = true; mcRedraw('.sx-bad'); } }
      return true;
    }
    return false;
  }
  function onInputApp(n) {
    var g = function (k) { return n.getAttribute(k); };
    if (g('data-mc-k')) { if (MC && MC.list[+g('data-mc-i')]) { MC.list[+g('data-mc-i')][g('data-mc-k')] = n.value; } return true; }
    if (g('data-exq')) { if (EX.q !== n.value) { EX.q = n.value; EX.all = false; renderSoft(); var e1 = HOST.querySelector('[data-exq]'); if (e1) { e1.focus(); try { e1.setSelectionRange(e1.value.length, e1.value.length); } catch (x) { /* ignore */ } } } return true; }
    if (g('data-da') === 'date') { if (n.value && n.value !== DA.date) { DA.date = n.value; loadDa(); } return true; }
    if (g('data-da') === 'person') { if (n.value !== DA.person) { DA.person = n.value; loadDa(); } return true; }
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
