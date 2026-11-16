/* ===== DM Group KSA — Sales CRM & Conversion Tracker — SCRIPT field =====
   Client-side only and READ-ONLY. Uses native frappe.client.get_list / get_count under the logged-in user's
   permissions (User Permissions and Permission Query scripts therefore apply). No writes, no external services. */
(function () {
  'use strict';

  /* ---------- bootstrap / isolation ---------- */
  var G = window;
  var ROOT = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
  var HOST = ROOT.querySelector('[data-dms-root]');
  if (!HOST) { return; }
  var KEY = '__dmsSalesDashboard';
  if (G[KEY] && typeof G[KEY].destroy === 'function') { try { G[KEY].destroy(); } catch (e) { /* ignore */ } }
  var abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var SIG = abort ? { signal: abort.signal } : false;
  var timers = [], destroyed = false, TOK = 0, AGTOK = 0;
  G[KEY] = { destroy: function () { destroyed = true; TOK++; AGTOK++; if (abort) { abort.abort(); } timers.forEach(clearTimeout); timers = []; } };

  var CFG = {
    cap: 20000,          // max rows loaded client-side per document type (above this a clear "narrow the range" notice is shown)
    page: 500,           // get_list page size
    batch: 300,          // names per "in" batch for child-table / link queries
    conc: 4,             // max parallel ERP requests
    pageSize: 25, modalPage: 15,
    activeMaxAge: 90,    // outstanding quotations up to this age (days) are "active pipeline"
    weekStart: 0         // 0 = Sunday (KSA working week)
  };
  var NA = '__NA__';
  var LANG = 'en';
  try { var sv = G.localStorage.getItem('dms_lang'); if (sv === 'ar' || sv === 'en') { LANG = sv; } } catch (e) { /* storage unavailable */ }
  function tr(en, ar) { return LANG === 'ar' ? ar : en; }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
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
  function moneyFull(v) { return (v == null || isNaN(v)) ? '' : 'SAR ' + (Math.round(v * 100) / 100).toLocaleString('en-US'); }
  function pct(n, d, dp) { return (d > 0 && n != null) ? (n / d * 100).toFixed(dp == null ? 1 : dp) + '%' : tr('N/A', 'غير متاح'); }
  function sum(arr, f) { var t = 0; for (var i = 0; i < arr.length; i++) { t += (f ? f(arr[i]) : arr[i]) || 0; } return t; }
  function uniq(a) { var m = {}; a.forEach(function (x) { if (x) { m[x] = 1; } }); return Object.keys(m).sort(function (x, y) { return x.localeCompare(y); }); }
  var NAtxt = function () { return tr('Not Assigned', 'غير مُعيَّن'); };
  var NAvail = function () { return tr('Not Available', 'غير متوفر'); };
  var NCfg = function () { return tr('Not Configured', 'غير مهيأ'); };
  var PAL = ['#1d4ed8', '#0f9d8a', '#f59e0b', '#c62828', '#7c3aed', '#64748b', '#ec4899', '#14b8a6', '#8b5cf6', '#84cc16'];

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
  function setToday() { var p = siteParts(); TODAY = p.year + '-' + p.month + '-' + p.day; STAMP = TODAY + ' ' + p.hour + ':' + p.minute; }
  function monthStart(iso) { return iso.slice(0, 8) + '01'; }
  function monthEnd(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return isoOf(Date.UTC(y, m, 0)); }
  function addMonths(iso, n) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n; return isoOf(Date.UTC(y, m, 1)); }
  function periodRange(key, cf, ct) {
    var t = TODAY, y = t.slice(0, 4);
    switch (key) {
      case 'today': return [t, t];
      case 'week': var dow = new Date(parseISO(t)).getUTCDay(), st = addDays(t, -((dow - CFG.weekStart + 7) % 7)); return [st, addDays(st, 6)];
      case 'month': return [monthStart(t), monthEnd(t)];
      case 'lastMonth': var lm = addMonths(monthStart(t), -1); return [lm, monthEnd(lm)];
      case 'year': return [y + '-01-01', y + '-12-31'];
      case 'prevYear': return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
      case 'custom': return [cf, ct];
      default: return [y + '-01-01', t];   // ytd
    }
  }
  function monthsInPeriod(from, to) {   // fractional calendar months covered (for prorating monthly targets)
    var tot = 0, cur = monthStart(from);
    for (var g = 0; g < 120 && cur <= to; g++) {
      var ms = cur, me = monthEnd(cur), a = from > ms ? from : ms, b = to < me ? to : me;
      if (b >= a) { tot += (diffDays(a, b) + 1) / (diffDays(ms, me) + 1); }
      cur = addMonths(cur, 1);
    }
    return tot;
  }
  function monthList(from, to) { var out = [], cur = monthStart(from); for (var i = 0; i < 72 && cur <= to; i++) { out.push(cur.slice(0, 7)); cur = addMonths(cur, 1); } return out; }
  function monthLabel(ym) {
    try { return new Intl.DateTimeFormat(LANG === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1))); } catch (e) { return ym; }
  }

  /* ---------- ERP read-only API layer (bounded concurrency, retry, cancellation) ---------- */
  var REQ_TIMEOUT = 90000;
  /* Direct, silent API call: no Frappe popups (e.g. "No permission for BDM"), always settles so a
     failed request can never hold a concurrency slot forever, and permission errors carry status 403. */
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
          var e = new Error((perm ? 'No access to ' + ((args && args.doctype) || method) : (ex.split(':').slice(-1)[0].trim() || ('HTTP ' + o.r.status))));
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
  function guarded(tokCheck, method, args) {
    return limited(function () {
      if (destroyed || (tokCheck && !tokCheck())) { return Promise.resolve(null); }
      return callP(method, args).catch(function (e) { if (e && (e.status === 403 || e.timeout)) { throw e; } return new Promise(function (r) { setTimeout(r, 400); }).then(function () { return callP(method, args); }); });
    });
  }
  function errKind(e) {
    var txt = ''; try { txt = (e && (e.responseText || e.statusText || e.message)) || ''; } catch (x) { /* ignore */ }
    return (/PermissionError|not permitted|403/i.test(String(txt)) || (e && e.status === 403)) ? 'perm' : 'tech';
  }
  function getList(args, chk) { return guarded(chk, 'frappe.client.get_list', args); }
  function getCount(dt, filters, chk) { return guarded(chk, 'frappe.client.get_count', { doctype: dt, filters: filters || [] }); }
  function fetchAll(dt, fields, filters, chk) {
    return getCount(dt, filters, chk).then(function (n) {
      if (n == null) { return { rows: [], expected: 0 }; }
      if (n > CFG.cap) { var e = new Error('too large'); e.tooLarge = n; throw e; }
      var pages = Math.ceil(n / CFG.page), jobs = [];
      for (var i = 0; i < pages; i++) { jobs.push(getList({ doctype: dt, fields: fields, filters: filters, order_by: 'name asc', limit_start: i * CFG.page, limit_page_length: CFG.page }, chk)); }
      return Promise.all(jobs).then(function (res) { var out = []; res.forEach(function (r) { if (r) { out = out.concat(r); } }); return { rows: out, expected: n }; });
    });
  }
  function chunks(arr, n) { var out = []; for (var i = 0; i < arr.length; i += n) { out.push(arr.slice(i, i + n)); } return out; }
  function childBatches(dt, parentDt, fields, names, extra, chk) {
    var jobs = chunks(names, CFG.batch).map(function (b) {
      return getList({ doctype: dt, parent: parentDt, fields: fields, filters: [['parent', 'in', b]].concat(extra || []), limit_page_length: 50000 }, chk);
    });
    return Promise.all(jobs).then(function (res) { var out = []; res.forEach(function (r) { if (r) { out = out.concat(r); } }); return out; });
  }
  function docUrl(dt, name) {
    try { if (G.frappe && frappe.utils && frappe.utils.get_form_link) { return frappe.utils.get_form_link(dt, name); } } catch (e) { /* fall through */ }
    return '/app/' + dt.toLowerCase().replace(/ /g, '-') + '/' + encodeURIComponent(name);
  }
  function docLink(dt, name) { return '<a class="dms-link" href="' + esc(docUrl(dt, name)) + '" target="_blank" rel="noopener noreferrer"><bdi>' + esc(name) + '</bdi> ↗</a>'; }

  /* ---------- workflow classification (verified against the live Quotation workflow "Quotation New") ---------- */
  var WF = {
    accepted: ['Accepted By Customer', 'Make Sales Order from Customer Accepted Quotation'],
    rejected: ['Rejected By Customer'], lost: ['Lost'], closed: ['Closed'], awaiting: ['Approved'],
    review: ['Review With Sales Manager', 'Review With CEO', 'Pending', 'Approval Pending With Sales Supervisor']
  };
  var QCLS = {
    awaiting: { c: '#1e88e5', en: 'Awaiting customer (Approved)', ar: 'بانتظار العميل (معتمد)' },
    accepted: { c: '#2e7d32', en: 'Accepted by customer', ar: 'مقبول من العميل' },
    rejected: { c: '#c62828', en: 'Rejected by customer', ar: 'مرفوض من العميل' },
    lost: { c: '#e65100', en: 'Lost', ar: 'مفقود' },
    closed: { c: '#78909c', en: 'Closed', ar: 'مغلق' },
    review: { c: '#f9a825', en: 'Internal review / approval', ar: 'مراجعة / اعتماد داخلي' },
    cancelled: { c: '#9e9e9e', en: 'Cancelled', ar: 'ملغى' },
    other: { c: '#b0bec5', en: 'Other', ar: 'أخرى' }
  };
  function qcLabel(k) { return tr(QCLS[k].en, QCLS[k].ar); }
  function qClass(q) {
    var wf = q.workflow_state || '';
    if (q.docstatus === 2 || wf === 'cancelled') { return 'cancelled'; }
    for (var k in WF) { if (WF[k].indexOf(wf) >= 0) { return k; } }
    return 'other';
  }
  var ISSUED = ['awaiting', 'accepted', 'rejected', 'lost'];   // quotations actually put to the customer
  var SOSTAT = {
    'Completed': { c: '#2e7d32', ar: 'مكتمل' }, 'Closed': { c: '#78909c', ar: 'مغلق' }, 'To Bill': { c: '#f59e0b', ar: 'للفوترة' },
    'To Deliver and Bill': { c: '#1e88e5', ar: 'للتسليم والفوترة' }, 'To Deliver': { c: '#7c3aed', ar: 'للتسليم' }, 'On Hold': { c: '#e65100', ar: 'معلق' },
    'Draft': { c: '#b0bec5', ar: 'مسودة' }, 'Cancelled': { c: '#9e9e9e', ar: 'ملغى' }
  };
  function soStatLabel(s) { return LANG === 'ar' && SOSTAT[s] ? SOSTAT[s].ar : s; }

  /* ---------- data store ---------- */
  var DATA = freshData();
  function freshData() {
    return { quotes: [], so: [], status: {}, notes: [], qLink: null, soTeam: null, soItems: null, s2: { running: false, done: false, p: 0 },
      sp: [], bdm: [], divisions: [], aged: null, agedErr: null, leads: null, cust: null, custOrders: null, act: {}, recon: null, loadedAt: '' };
  }
  var CACHE = {};   // key -> DATA (max 3 periods)
  var loading = false;

  var QF = ['name', 'transaction_date', 'valid_till', 'status', 'docstatus', 'workflow_state', 'sales_person', 'quotation_to', 'party_name', 'customer_name', 'company', 'custom_division', 'location', 'base_net_total'];
  var SF = ['name', 'transaction_date', 'delivery_date', 'status', 'docstatus', 'customer', 'customer_name', 'company', 'custom_division', 'location_', 'sales_persons', 'base_net_total', 'per_delivered', 'per_billed', 'amended_from'];

  function normQuote(q) {
    q.date = (q.transaction_date || '').slice(0, 10); q.val = +q.base_net_total || 0; q.sp = clean(q.sales_person) || ''; q.div = clean(q.custom_division) || ''; q.loc = clean(q.location) || '';
    q.customer = q.quotation_to === 'Customer' ? (q.party_name || '') : ''; q.cname = clean(q.customer_name || q.party_name); q.cls = qClass(q); return q;
  }
  function normSO(s) {
    s.date = (s.transaction_date || '').slice(0, 10); s.val = +s.base_net_total || 0; s.div = clean(s.custom_division) || ''; s.loc = clean(s.location_) || '';
    s.cname = clean(s.customer_name || s.customer); s.pdel = +s.per_delivered || 0; s.pbill = +s.per_billed || 0; return s;
  }

  var F = { period: 'ytd', from: '', to: '', company: '', division: '', location: '', sp: '' };
  var PERIOD = [];
  function curPeriod() { return periodRange(F.period, F.from, F.to); }

  function loadRef(chk) {
    return Promise.all([
      getList({ doctype: 'Sales Person', fields: ['name', 'enabled', 'is_group', 'custom_sales_persons_bdm', 'custom__sales_monthly_target', 'custom_bdm_team_target_'], limit_page_length: 1000 }, chk).catch(function () { return null; }),
      getList({ doctype: 'BDM', fields: ['name', 'sales_person', 'type_bdm'], limit_page_length: 200 }, chk).catch(function () { return null; }),
      getList({ doctype: 'Division', fields: ['name'], limit_page_length: 200 }, chk).catch(function () { return null; })
    ]);
  }

  function startLoad(force) {
    var tok = ++TOK, chk = function () { return tok === TOK && !destroyed; };
    PERIOD = curPeriod();
    var from = PERIOD[0], to = PERIOD[1];
    if (!from || !to || from > to || parseISO(from) == null || parseISO(to) == null) { renderAll(); return; }
    var key = from + '|' + to;
    if (!force && CACHE[key]) { DATA = CACHE[key]; loading = false; renderAll(); loadAgedLater(); return; }
    if (force) { CACHE = {}; }
    DATA = freshData(); loading = true; setToday(); renderAll();
    var qf = [['transaction_date', 'between', [from, to]]];
    Promise.all([
      fetchAll('Quotation', QF, qf, chk).then(function (r) { DATA.status.quote = { ok: true, n: r.rows.length, expected: r.expected }; return r.rows; }, function (e) { DATA.status.quote = e && e.tooLarge ? { ok: false, kind: 'large', n: e.tooLarge } : { ok: false, kind: errKind(e) }; return []; }),
      fetchAll('Sales Order', SF, qf, chk).then(function (r) { DATA.status.so = { ok: true, n: r.rows.length, expected: r.expected }; return r.rows; }, function (e) { DATA.status.so = e && e.tooLarge ? { ok: false, kind: 'large', n: e.tooLarge } : { ok: false, kind: errKind(e) }; return []; }),
      loadRef(chk)
    ]).then(function (res) {
      if (!chk()) { return; }
      DATA.quotes = res[0].map(normQuote); DATA.so = res[1].map(normSO);
      var rf = res[2]; DATA.refMissing = ['Sales Person', 'BDM', 'Division'].filter(function (n, k) { return rf[k] === null; }); DATA.sp = rf[0] || []; DATA.bdm = rf[1] || []; DATA.divisions = (rf[2] || []).map(function (d) { return d.name; });
      DATA.loadedAt = STAMP; loading = false; renderAll();
      loadAgedLater(); loadStage2(tok, key);
    }).catch(function () { if (chk()) { loading = false; renderAll(); } });
  }

  /* Stage 2: quotation -> Sales Order links (via Sales Order Item.prevdoc_docname) and Sales Team / item references per Sales Order.
     Only rows of parent documents visible to the current user are used (parent visibility is re-checked through get_list). */
  function loadStage2(tok, key) {
    var chk = function () { return tok === TOK && !destroyed; }, D = DATA;
    D.s2 = { running: true, done: false, p: 0, err: null };
    var linkNames = D.quotes.filter(function (q) { return q.docstatus === 1 || q.status === 'Ordered' || q.status === 'Partially Ordered'; }).filter(function (q) { return q.docstatus !== 2; }).map(function (q) { return q.name; });
    var soNames = D.so.filter(function (s) { return s.docstatus === 1; }).map(function (s) { return s.name; });
    var totalJobs = chunks(linkNames, CFG.batch).length * 2 + chunks(soNames, CFG.batch).length * 2 + 1, doneJobs = 0;
    function tick(v) { doneJobs++; D.s2.p = Math.min(1, doneJobs / totalJobs); if (chk() && doneJobs % 3 === 0) { renderProgress(); } return v; }
    var linkP = Promise.all(chunks(linkNames, CFG.batch).map(function (b) {
      return getList({ doctype: 'Sales Order Item', parent: 'Sales Order', fields: ['parent', 'prevdoc_docname', 'base_net_amount'], filters: [['prevdoc_docname', 'in', b], ['docstatus', '=', 1]], limit_page_length: 50000 }, chk).then(tick);
    })).then(function (res) {
      var rows = []; res.forEach(function (r) { if (r) { rows = rows.concat(r); } });
      var parents = uniq(rows.map(function (r) { return r.parent; }));
      return Promise.all(chunks(parents, CFG.batch).map(function (b) {
        return getList({ doctype: 'Sales Order', fields: ['name', 'status', 'docstatus'], filters: [['name', 'in', b], ['docstatus', '=', 1]], limit_page_length: 50000 }, chk).then(tick);
      })).then(function (hs) {
        var vis = {}; hs.forEach(function (h) { (h || []).forEach(function (x) { if (x.status !== 'Cancelled') { vis[x.name] = 1; } }); });
        var link = {}; rows.forEach(function (r) {
          if (!vis[r.parent] || !r.prevdoc_docname) { return; }
          var l = link[r.prevdoc_docname] || (link[r.prevdoc_docname] = { val: 0, orders: {}, lines: 0 });
          l.val += +r.base_net_amount || 0; l.orders[r.parent] = 1; l.lines++;
        });
        D.qLink = link;
      });
    });
    var teamP = childBatches('Sales Team', 'Sales Order', ['parent', 'sales_person', 'allocated_percentage'], soNames, [], chk).then(function (rows) {
      var m = {}; rows.forEach(function (r) { (m[r.parent] = m[r.parent] || []).push(r); }); D.soTeam = m; return tick(); });
    var itemP = childBatches('Sales Order Item', 'Sales Order', ['parent', 'prevdoc_docname'], soNames, [], chk).then(function (rows) {
      var m = {}; rows.forEach(function (r) { var o = m[r.parent] || (m[r.parent] = { n: 0, refs: {} }); o.n++; if (r.prevdoc_docname) { o.refs[r.prevdoc_docname] = 1; } }); D.soItems = m; return tick(); });
    Promise.all([linkP, teamP, itemP]).then(function () {
      if (!chk()) { return; }
      D.s2 = { running: false, done: true, p: 1, err: null };
      CACHE[key] = D; var ks = Object.keys(CACHE); if (ks.length > 3) { delete CACHE[ks[0]]; }
      renderAll();
    }).catch(function (e) { if (chk()) { D.s2 = { running: false, done: false, p: 0, err: errKind(e) }; renderAll(); } });
  }

  /* ---------- lazily loaded sources: aged quotations, leads, customers, action center ---------- */
  var AGED = { rows: null, loading: false, err: null };
  var LEADS = { rows: null, loading: false, err: null };
  var CUST = { rows: null, orders: null, loading: false, err: null };
  var ACT = { counts: null, loading: false };

  function sfilter(field, val) { return val === NA ? [field, 'is', 'not set'] : [field, '=', val]; }
  function qServerFilters() {
    var f = [];
    if (F.company) { f.push(['company', '=', F.company]); }
    if (F.division) { f.push(sfilter('custom_division', F.division)); }
    if (F.location) { f.push(sfilter('location', F.location)); }
    if (F.sp) { f.push(sfilter('sales_person', F.sp)); }
    return f;
  }
  function agedBuckets() {
    var t = TODAY;
    return [
      { k: 'b0', en: '0–7 days', ar: '0–7 أيام', from: addDays(t, -7), to: t },
      { k: 'b1', en: '8–30 days', ar: '8–30 يومًا', from: addDays(t, -30), to: addDays(t, -8) },
      { k: 'b2', en: '31–90 days', ar: '31–90 يومًا', from: addDays(t, -90), to: addDays(t, -31) },
      { k: 'b3', en: '91–180 days', ar: '91–180 يومًا', from: addDays(t, -180), to: addDays(t, -91) },
      { k: 'b4', en: 'Over 180 days', ar: 'أكثر من 180 يومًا', from: null, to: addDays(t, -181) }
    ];
  }
  function agedFilters(b) {
    var f = [['docstatus', '=', 0], ['workflow_state', '=', 'Approved']].concat(qServerFilters());
    if (b.from) { f.push(['transaction_date', 'between', [b.from, b.to]]); } else { f.push(['transaction_date', '<=', b.to]); }
    return f;
  }
  function loadAgedLater() { later(loadAged, 200); later(loadRecon, 900); }
  function loadAged() {
    var tok = ++AGTOK, chk = function () { return tok === AGTOK && !destroyed; };
    setToday(); AGED.loading = true; AGED.err = null;
    var bs = agedBuckets();
    var totalP = getList({ doctype: 'Quotation', fields: ['count(name) as n', 'sum(base_net_total) as v'], filters: [['docstatus', '=', 0], ['workflow_state', '=', 'Approved']].concat(qServerFilters()), limit_page_length: 1 }, chk).catch(function () { return null; });
    Promise.all(bs.map(function (b) {
      return getList({ doctype: 'Quotation', fields: ['company', 'count(name) as n', 'sum(base_net_total) as v'], filters: agedFilters(b), group_by: 'company', limit_page_length: 100 }, chk);
    }).concat([totalP])).then(function (res) {
      if (!chk()) { return; }
      var tot = res[bs.length]; AGED.total = (tot && tot[0]) ? { n: +tot[0].n || 0, v: +tot[0].v || 0 } : null;
      AGED.rows = bs.map(function (b, i) { var r = res[i] || []; return { b: b, n: sum(r, function (x) { return +x.n; }), v: sum(r, function (x) { return +x.v; }), byCo: r }; });
      AGED.loading = false; AGED.asOf = TODAY; renderAll(true);
    }).catch(function (e) { if (chk()) { AGED.loading = false; AGED.err = errKind(e); renderAll(true); } });
  }
  function loadLeads() {
    if (LEADS.rows || LEADS.loading) { return; }
    LEADS.loading = true;
    var tok = TOK, chk = function () { return !destroyed; };
    fetchAll('Lead', ['name', 'lead_name', 'company_name', 'source', 'status', 'qualification_status', 'custom_allocation_status', 'lead_owner', 'custom_sales_person_', 'customer', 'custom_expected_value', 'company', 'creation'], [], chk).then(function (r) {
      LEADS.rows = r.rows.map(function (l) { l.date = (l.creation || '').slice(0, 10); l.alloc = clean(l.custom_allocation_status); l.src = clean(l.source); l.qual = clean(l.qualification_status); return l; });
      LEADS.loading = false; renderAll(true);
    }).catch(function (e) { LEADS.loading = false; LEADS.err = e && e.tooLarge ? 'large' : errKind(e); renderAll(true); });
  }
  function loadCustomers() {
    if (CUST.rows || CUST.loading) { return; }
    CUST.loading = true;
    var chk = function () { return !destroyed; };
    var allP = fetchAll('Customer', ['name', 'customer_name', 'customer_group', 'territory', 'custom_sales_person', 'custom_customer_account_status', 'custom_collection_status', 'disabled', 'creation'], [], chk);
    function ordersPage(start, acc) {
      return getList({ doctype: 'Sales Order', fields: ['customer', 'count(name) as n', 'sum(base_net_total) as v'], filters: [['docstatus', '=', 1]], group_by: 'customer', order_by: 'customer asc', limit_start: start, limit_page_length: CFG.page }, chk).then(function (r) {
        r = r || []; acc = acc.concat(r); return r.length === CFG.page ? ordersPage(start + CFG.page, acc) : acc;
      });
    }
    Promise.all([allP, ordersPage(0, [])]).then(function (res) {
      CUST.rows = res[0].rows.map(function (c) { c.date = (c.creation || '').slice(0, 10); return c; });
      var m = {}; res[1].forEach(function (o) { m[o.customer] = { n: +o.n, v: +o.v }; }); CUST.orders = m;
      CUST.loading = false; renderAll(true);
    }).catch(function (e) { CUST.loading = false; CUST.err = e && e.tooLarge ? 'large' : errKind(e); renderAll(true); });
  }

  /* Action Center sources (server-side paginated lists, as of today; not tied to the date filter) */
  function actSpecs() {
    var t = TODAY, sf = qServerFilters(), cf = F.company ? [['company', '=', F.company]] : [];
    return [
      { id: 'a_acc', dt: 'Quotation', title: tr('Accepted quotations without a Sales Order', 'عروض مقبولة بدون أمر بيع'), why: tr('Customer accepted, but no order was created (status Open or Expired).', 'قبل العميل العرض ولم يُنشأ أمر بيع (الحالة مفتوح أو منتهي).'),
        filters: [['docstatus', '=', 1], ['status', 'in', ['Open', 'Expired']], ['workflow_state', 'in', WF.accepted]].concat(sf), order: 'transaction_date desc', kind: 'q' },
      { id: 'a_valid', dt: 'Quotation', title: tr('Active quotations nearing or past validity', 'عروض نشطة قاربت أو تجاوزت الصلاحية'), why: tr('Approved, awaiting customer, ≤ ' + CFG.activeMaxAge + ' days old, valid-till within 14 days or already passed.', 'معتمدة وبانتظار العميل، عمرها ≤ ' + CFG.activeMaxAge + ' يومًا، وتنتهي صلاحيتها خلال 14 يومًا أو انتهت.'),
        filters: [['docstatus', '=', 0], ['workflow_state', '=', 'Approved'], ['transaction_date', '>=', addDays(t, -CFG.activeMaxAge)], ['valid_till', '<=', addDays(t, 14)]].concat(sf), order: 'valid_till asc', kind: 'q' },
      { id: 'a_deliv', dt: 'Sales Order', title: tr('Sales Orders past delivery date', 'أوامر بيع تجاوزت تاريخ التسليم'), why: tr('Submitted, still to deliver, delivery date before today.', 'مُعتمدة وما زالت للتسليم وتاريخ التسليم قبل اليوم.'),
        filters: [['docstatus', '=', 1], ['status', 'in', ['To Deliver', 'To Deliver and Bill']], ['delivery_date', '<', t]].concat(cf), order: 'delivery_date asc', kind: 's' },
      { id: 'a_bill', dt: 'Sales Order', title: tr('Sales Orders delivered but not fully billed', 'أوامر بيع سُلّمت ولم تُفوتر بالكامل'), why: tr('Status To Bill.', 'الحالة: للفوترة.'),
        filters: [['docstatus', '=', 1], ['status', '=', 'To Bill']].concat(cf), order: 'transaction_date desc', kind: 's' },
      { id: 'a_lead', dt: 'Lead', title: tr('Leads needing allocation', 'عملاء محتملون بحاجة للتخصيص'), why: tr('Allocation status is empty or Non Allocated (excluding Do Not Contact).', 'حالة التخصيص فارغة أو غير مخصص (باستثناء عدم الاتصال).'),
        filters: [['status', '!=', 'Do Not Contact'], ['custom_allocation_status', 'in', ['', 'Non Allocated']]], order: 'creation desc', kind: 'l' },
      { id: 'a_coll', dt: 'Customer', title: tr('Customers flagged for collection follow-up', 'عملاء بحاجة لمتابعة التحصيل'), why: tr('Collection status Follow up, Critical or Escalated.', 'حالة التحصيل: متابعة أو حرج أو مُصعَّد.'),
        filters: [['custom_collection_status', 'in', ['Follow up', 'Critical', 'Escalated']]], order: 'modified desc', kind: 'c' },
      { id: 'a_opp', dt: 'Opportunity', title: tr('Open opportunities', 'فرص مفتوحة'), why: tr('Opportunity status Open.', 'حالة الفرصة: مفتوحة.'), filters: [['status', '=', 'Open']], order: 'modified desc', kind: 'o' },
      { id: 'a_todo', dt: 'ToDo', title: tr('Open ToDo follow-ups', 'مهام متابعة مفتوحة'), why: tr('ToDo status Open (only a few are used in ERP).', 'مهام بحالة مفتوحة (يُستخدم عدد قليل منها في النظام).'), filters: [['status', '=', 'Open']], order: 'modified desc', kind: 't' }
    ];
  }
  function loadActionCounts() {
    if (ACT.loading) { return; }
    ACT.loading = true; setToday();
    var specs = actSpecs(), chk = function () { return !destroyed; };
    Promise.all(specs.map(function (s) {
      return getList({ doctype: s.dt, fields: ['count(name) as n'], filters: s.filters, limit_page_length: 1 }, chk).then(function (r) { return (r && r[0]) ? +r[0].n : (r ? 0 : null); }, function (e) { return 'ERR:' + errKind(e); });
    })).then(function (res) { ACT.counts = {}; specs.forEach(function (s, i) { ACT.counts[s.id] = res[i]; }); ACT.loading = false; renderAll(true); });
  }

  /* ---------- model (recomputed from loaded rows whenever data or global filters change) ---------- */
  function eqf(val, filt) { if (!filt) { return true; } if (filt === NA) { return !val; } return val === filt; }
  function passQ(q) { return (!F.company || q.company === F.company) && eqf(q.div, F.division) && eqf(q.loc, F.location) && eqf(q.sp, F.sp); }
  function passSO(s) { return (!F.company || s.company === F.company) && eqf(s.div, F.division) && eqf(s.loc, F.location); }
  function soShare(s) {   // value attributed to the selected salesperson (Sales Team %), or full value when no salesperson filter
    if (!F.sp) { return s.val; }
    var rows = (DATA.soTeam && DATA.soTeam[s.name]) || [];
    if (F.sp === NA) { return rows.length ? 0 : s.val; }
    var p = 0; rows.forEach(function (r) { if (r.sales_person === F.sp) { p += +r.allocated_percentage || 0; } });
    return s.val * p / 100;
  }
  function soIncluded(s) { if (!F.sp) { return true; } var rows = (DATA.soTeam && DATA.soTeam[s.name]) || []; return F.sp === NA ? !rows.length : rows.some(function (r) { return r.sales_person === F.sp; }); }

  function buildModel() {
    var M = { s2: DATA.s2.done && !!DATA.qLink && !!DATA.soTeam && !!DATA.soItems, qc: {}, months: monthList(PERIOD[0] || TODAY, PERIOD[1] || TODAY) };
    var qs = DATA.quotes.filter(passQ); M.qs = qs;
    Object.keys(QCLS).forEach(function (k) { M.qc[k] = { n: 0, v: 0 }; });
    qs.forEach(function (q) { M.qc[q.cls].n++; M.qc[q.cls].v += q.val; });
    var issued = qs.filter(function (q) { return ISSUED.indexOf(q.cls) >= 0; }); M.issued = issued;
    M.issuedN = issued.length; M.issuedV = sum(issued, function (q) { return q.val; });
    var link = M.s2 ? DATA.qLink : null;
    qs.forEach(function (q) { var l = link && link[q.name]; q.linkVal = l ? l.val : 0; q.linked = !!(l && l.val > 0); q.linkOrders = l ? Object.keys(l.orders) : []; });
    if (M.s2) {
      var cN = 0, cV = 0, cAcc = 0, cCap = 0, cOver = 0; issued.forEach(function (q) { if (q.linked) { cN++; cV += q.linkVal; cCap += Math.min(q.linkVal, q.val); if (q.linkVal > q.val + 1) { cOver++; } if (q.cls === 'accepted') { cAcc++; } } });
      var part = qs.filter(function (q) { return q.status === 'Partially Ordered' && q.docstatus !== 2; });
      M.conv = { n: cN, v: cV, vCap: cCap, over: cOver, accN: cAcc, part: { n: part.length, quoted: sum(part, function (q) { return q.val; }), ordered: sum(part, function (q) { return q.linkVal; }), list: part } };
      M.anom = {
        statusNoLink: qs.filter(function (q) { return (q.status === 'Ordered' || q.status === 'Partially Ordered') && q.docstatus !== 2 && !q.linked; }),
        linkedOutside: qs.filter(function (q) { return q.linked && ISSUED.indexOf(q.cls) < 0; }),
        rejectedOrdered: qs.filter(function (q) { return q.cls === 'rejected' && q.linked; }),
        acceptedNotOrdered: qs.filter(function (q) { return q.cls === 'accepted' && !q.linked && q.docstatus !== 2; })
      };
    }
    /* Sales Orders */
    var soAll = DATA.so.filter(passSO); M.soCancelled = soAll.filter(function (s) { return s.docstatus === 2; }).length; M.soDraft = soAll.filter(function (s) { return s.docstatus === 0; }).length;
    M.soWait = !!F.sp && !M.s2;
    var so1 = soAll.filter(function (s) { return s.docstatus === 1; });
    if (F.sp) { so1 = M.s2 ? so1.filter(soIncluded) : []; }
    M.so = so1; M.soV = sum(so1, soShare);
    M.soBilledV = sum(so1, function (s) { return soShare(s) * s.pbill / 100; });
    M.soDelivV = sum(so1, function (s) { return soShare(s) * s.pdel / 100; });
    M.soStat = {}; so1.forEach(function (s) { var o = M.soStat[s.status] || (M.soStat[s.status] = { n: 0, v: 0 }); o.n++; o.v += soShare(s); });
    M.soOverdue = so1.filter(function (s) { return s.delivery_date && s.delivery_date.slice(0, 10) < TODAY && (s.status === 'To Deliver' || s.status === 'To Deliver and Bill'); });
    if (M.s2) { M.soNoQuote = so1.filter(function (s) { var o = DATA.soItems[s.name]; return !(o && Object.keys(o.refs).length); }); M.soNoTeam = so1.filter(function (s) { return !(DATA.soTeam[s.name] || []).length; }); }
    /* Salesperson attribution: quotations by header sales_person, Sales Orders by Sales Team contribution % */
    var P = {}; function person(n) { return P[n] || (P[n] = { name: n, qn: 0, qv: 0, issued: 0, acc: 0, convN: 0, convV: 0, issuedV: 0, soN: 0, contrib: 0 }); }
    qs.forEach(function (q) {
      if (q.cls === 'cancelled') { return; }
      var p = person(q.sp || NA); p.qn++; p.qv += q.val;
      if (ISSUED.indexOf(q.cls) >= 0) { p.issued++; p.issuedV += q.val; if (q.cls === 'accepted') { p.acc++; } if (q.linked) { p.convN++; p.convV += q.linkVal; } }
    });
    var unalloc = 0, over = 0;
    if (M.s2) {
      soAll.filter(function (s) { return s.docstatus === 1; }).forEach(function (s) {
        var rows = DATA.soTeam[s.name] || [], tot = 0;
        if (!rows.length) { var pn = person(NA); pn.soN++; pn.contrib += s.val; return; }
        var seen = {};
        rows.forEach(function (r) { var pc = +r.allocated_percentage || 0; tot += pc; var p = person(r.sales_person || NA); p.contrib += s.val * pc / 100; if (!seen[p.name]) { p.soN++; seen[p.name] = 1; } });
        if (tot < 99.99) { unalloc += s.val * (100 - tot) / 100; } else if (tot > 100.01) { over++; }
      });
    }
    M.persons = P; M.unalloc = unalloc; M.overAlloc = over;
    /* monthly series */
    var mm = {}; M.months.forEach(function (m) { mm[m] = { qn: 0, qv: 0, sn: 0, sv: 0 }; });
    qs.forEach(function (q) { if (q.cls !== 'cancelled' && mm[q.date.slice(0, 7)]) { var o = mm[q.date.slice(0, 7)]; o.qn++; o.qv += q.val; } });
    so1.forEach(function (s) { var o = mm[s.date.slice(0, 7)]; if (o) { o.sn++; o.sv += soShare(s); } });
    M.monthly = mm;
    M.targetMonths = monthsInPeriod(PERIOD[0] || TODAY, PERIOD[1] || TODAY);
    return M;
  }

  /* ---------- UI primitives ---------- */
  var tab = 'overview', OVL = null, TBL = {}, TS = {}, SS = {}, LF = { cls: '', lsrc: '', lstat: '' }, MM = null;
  var TABS = [
    { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'leads', en: 'Lead Tracker', ar: 'متابعة العملاء المحتملين' },
    { id: 'customers', en: 'Customer Analysis', ar: 'تحليل العملاء' }, { id: 'quotes', en: 'Quotation Tracker', ar: 'متابعة عروض الأسعار' },
    { id: 'orders', en: 'Sales Order Tracker', ar: 'متابعة أوامر البيع' }, { id: 'conv', en: 'Conversion Analysis', ar: 'تحليل التحويل' },
    { id: 'team', en: 'Sales Team & BDM', ar: 'فريق المبيعات و BDM' }, { id: 'actions', en: 'Follow-ups & Actions', ar: 'المتابعة والإجراءات' }
  ];
  var PERIODS = [['ytd', 'Current Year to Date', 'السنة الحالية حتى اليوم'], ['today', 'Today', 'اليوم'], ['week', 'This Week', 'هذا الأسبوع'], ['month', 'This Month', 'هذا الشهر'],
    ['lastMonth', 'Last Month', 'الشهر الماضي'], ['year', 'This Year', 'هذه السنة'], ['prevYear', 'Previous Year', 'السنة الماضية'], ['custom', 'Custom Date Range', 'نطاق تاريخ مخصص']];

  function badge(txt, color, dark) { return '<span class="dms-badge' + (dark ? ' dms-dark' : '') + '" style="--dms-c:' + color + '">' + esc(txt) + '</span>'; }
  function clsBadge(k) { return badge(qcLabel(k), QCLS[k].c, k === 'review'); }
  function soBadge(s) { var c = (SOSTAT[s] || { c: '#78909c' }).c; return badge(soStatLabel(s), c); }
  function kpi(o) {
    var inner = '<div class="dms-kpi-n">' + o.val + '</div><div class="dms-kpi-l">' + esc(o.label) + (o.warn ? '<span class="dms-warn">' + esc(o.warn) + '</span>' : '') + '</div>' + (o.sub ? '<div class="dms-kpi-s">' + o.sub + '</div>' : '');
    return o.act ? '<button type="button" class="dms-kpi" data-act="kpi" data-v="' + esc(o.act) + '" style="--dms-c:' + (o.c || '#0f2547') + '">' + inner + '</button>'
      : '<div class="dms-kpi" style="--dms-c:' + (o.c || '#0f2547') + ';cursor:default">' + inner + '</div>';
  }
  function panel(title, body, extra) { return '<div class="dms-panelbox ' + (extra || '') + '"><h3 class="dms-h3">' + esc(title) + '</h3>' + body + '</div>'; }
  function note(txt) { return '<p class="dms-note">' + txt + '</p>'; }
  function alertBox(kind, html) { return '<div class="dms-alert dms-alert-' + kind + '">' + html + '</div>'; }
  function empty(txt) { return '<div class="dms-empty">' + esc(txt || tr('No data for the current period and filters.', 'لا توجد بيانات للفترة والمرشحات الحالية.')) + '</div>'; }
  function calc() { return '<span class="dms-sm">' + esc(tr('Calculating…', 'جارٍ الحساب…')) + '</span>'; }

  /* charts */
  function donut(segs, top, bottom) {
    var tot = sum(segs, function (s) { return s.value; }), R = 70, C = 2 * Math.PI * R, off = 0, h = '';
    if (!tot) { return empty(); }
    segs.forEach(function (s) { if (!s.value) { return; } var len = s.value / tot * C; h += '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="' + s.color + '" stroke-width="26" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 90 90)"><title>' + esc(s.label) + ': ' + num(s.value) + '</title></circle>'; off += len; });
    var leg = segs.map(function (s) { return '<div><span><i style="--dms-c:' + s.color + '"></i>' + esc(s.label) + '</span><b>' + (s.fmt || num)(s.value) + '</b></div>'; }).join('');
    return '<div class="dms-chartwrap"><svg class="dms-donut" viewBox="0 0 180 180" role="img"><g>' + h + '</g><text x="90" y="88" text-anchor="middle" font-size="22" font-weight="800" fill="#0f2547">' + esc(top) + '</text><text x="90" y="106" text-anchor="middle" font-size="10" fill="#64748b">' + esc(bottom || '') + '</text></svg><div class="dms-donut-legend">' + leg + '</div></div>';
  }
  function groupedBars(months, series, data) {
    if (!months.length) { return empty(); }
    var max = 1; months.forEach(function (m) { series.forEach(function (s) { max = Math.max(max, data[m][s.k]); }); });
    var W = 700, H = 230, pl = 6, gw = (W - pl * 2) / months.length, bw = Math.max(4, Math.min(24, (gw - 8) / series.length)), h = '';
    months.forEach(function (m, i) {
      var gx = pl + i * gw + (gw - bw * series.length) / 2;
      series.forEach(function (s, j) {
        var v = data[m][s.k], bh = Math.round(v / max * 150), x = gx + j * bw, y = 180 - bh;
        h += '<g><title>' + esc(monthLabel(m) + ' · ' + s.label + ': ' + moneyFull(v)) + '</title><rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw - 2).toFixed(1) + '" height="' + bh + '" rx="3" fill="' + s.color + '"/></g>';
      });
      h += '<text x="' + (pl + i * gw + gw / 2).toFixed(1) + '" y="198" text-anchor="middle" transform="rotate(-35 ' + (pl + i * gw + gw / 2).toFixed(1) + ' 198)">' + esc(monthLabel(m)) + '</text>';
    });
    var leg = '<div class="dms-legend">' + series.map(function (s) { return '<span><i style="--dms-c:' + s.color + '"></i>' + esc(s.label) + '</span>'; }).join('') + '<span>' + esc(tr('Peak', 'الأعلى')) + ': ' + money(max) + '</span></div>';
    return '<div style="overflow-x:auto"><svg class="dms-bars2" style="min-width:520px" viewBox="0 0 ' + W + ' ' + H + '" role="img"><line x1="0" y1="180" x2="' + W + '" y2="180" stroke="#e3e8ef"/>' + h + '</svg></div>' + leg;
  }
  function hbars(items, fmt, color) {
    if (!items.length) { return empty(); }
    var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); }).concat([1])); fmt = fmt || num;
    return items.map(function (i) {
      return '<div class="dms-stack-row"><span title="' + esc(i.label) + '">' + bdi(i.label) + '</span><div class="dms-stack"><i style="width:' + (Math.abs(i.value) / max * 100).toFixed(2) + '%;background:' + (i.color || color || '#1d4ed8') + '"></i></div><span>' + fmt(i.value) + '</span></div>';
    }).join('');
  }
  function stackByClass(list, groupFn, labelFn, limit) {
    var g = {}; list.forEach(function (q) { var k = groupFn(q) || NA; (g[k] = g[k] || []).push(q); });
    var keys = Object.keys(g).sort(function (a, b) { return g[b].length - g[a].length; }).slice(0, limit || 8);
    if (!keys.length) { return empty(); }
    var rows = keys.map(function (k) {
      var arr = g[k], c = {}; arr.forEach(function (q) { c[q.cls] = (c[q.cls] || 0) + 1; });
      var segs = Object.keys(QCLS).map(function (cl) { return c[cl] ? '<i style="width:' + (c[cl] / arr.length * 100).toFixed(2) + '%;background:' + QCLS[cl].c + '" title="' + esc(qcLabel(cl)) + ': ' + c[cl] + '"></i>' : ''; }).join('');
      return '<div class="dms-stack-row"><span title="' + esc(labelFn(k)) + '">' + bdi(labelFn(k)) + '</span><div class="dms-stack">' + segs + '</div><span>' + num(arr.length) + '</span></div>';
    }).join('');
    return rows + '<div class="dms-legend">' + Object.keys(QCLS).map(function (cl) { return '<span><i style="--dms-c:' + QCLS[cl].c + '"></i>' + esc(qcLabel(cl)) + '</span>'; }).join('') + '</div>';
  }
  function funnel(steps) {
    var max = Math.max.apply(null, steps.map(function (s) { return s.n || 0; }).concat([1]));
    return '<div class="dms-fun">' + steps.map(function (s) {
      return '<div><span>' + esc(s.label) + '</span><i style="--dms-c:' + s.c + ';width:' + (s.n == null ? 0 : Math.max(0.5, s.n / max * 100)).toFixed(1) + '%"></i><b>' + (s.n == null ? '…' : num(s.n)) + '</b></div>';
    }).join('') + '</div>';
  }

  /* ---------- tables: client-side (search / sort / pagination) and server-side (paginated) ---------- */
  function regTable(spec) { TBL[spec.id] = spec; return '<div class="dms-tbl" data-tbl="' + esc(spec.id) + '"></div>'; }
  function fillTables() { var els = HOST.querySelectorAll('[data-tbl]'); for (var i = 0; i < els.length; i++) { fillTable(els[i].getAttribute('data-tbl'), els[i]); } }
  function fillTable(id, el) {
    var sp = TBL[id]; el = el || HOST.querySelector('[data-tbl="' + id + '"]'); if (!sp || !el) { return; }
    if (sp.server) { return fillServer(id, el); }
    var st = TS[id] || (TS[id] = { q: '', page: 1, sk: '', dir: 1 }), rows = sp.rows, q = st.q.trim().toLowerCase();
    if (q) { rows = rows.filter(function (r) { return sp.text(r).toLowerCase().indexOf(q) >= 0; }); }
    if (st.sk) { var col = sp.cols.filter(function (c) { return c.k === st.sk; })[0]; if (col && col.s) { rows = rows.slice().sort(function (a, b) { var x = col.s(a), y = col.s(b); return (x < y ? -1 : x > y ? 1 : 0) * st.dir; }); } }
    var ps = sp.pageSize || CFG.pageSize, pages = Math.max(1, Math.ceil(rows.length / ps)); if (st.page > pages) { st.page = pages; }
    var slice = rows.slice((st.page - 1) * ps, st.page * ps);
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(tr('Search this table…', 'ابحث في الجدول…')) + '" value="' + esc(st.q) + '"><span class="dms-sm">' + num(rows.length) + ' ' + esc(tr('rows', 'سجل')) + (q ? ' / ' + num(sp.rows.length) : '') + '</span></div>';
    if (!rows.length) { el.innerHTML = h + '<div class="dms-tablewrap">' + empty(sp.empty) + '</div>'; return restoreFocus(el, id); }
    h += '<div class="dms-tablewrap"><table class="dms-table"><thead><tr>' + sp.cols.map(function (c) { return '<th' + (c.s ? ' class="dms-th-s" data-act="tsort" data-id="' + esc(id) + '" data-k="' + c.k + '"' : '') + '>' + esc(c.h) + (st.sk === c.k ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      slice.map(function (r) { return '<tr>' + sp.cols.map(function (c) { return '<td>' + c.r(r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    h += pager(id, 'tpage', st.page, pages, rows.length, ps);
    el.innerHTML = h; restoreFocus(el, id);
  }
  function pager(id, act, pg, pages, total, ps) {
    return '<div class="dms-pager"><span>' + esc(tr('Showing', 'عرض')) + ' ' + num((pg - 1) * ps + 1) + '–' + num(Math.min(pg * ps, total)) + ' / ' + num(total) + '</span><span><button type="button" class="dms-btn" data-act="' + act + '" data-id="' + esc(id) + '" data-v="-1"' + (pg <= 1 ? ' disabled' : '') + '>‹ ' + esc(tr('Previous', 'السابق')) + '</button> ' +
      esc(tr('Page', 'صفحة')) + ' ' + pg + ' ' + esc(tr('of', 'من')) + ' ' + pages + ' <button type="button" class="dms-btn" data-act="' + act + '" data-id="' + esc(id) + '" data-v="1"' + (pg >= pages ? ' disabled' : '') + '>' + esc(tr('Next', 'التالي')) + ' ›</button></span></div>';
  }
  var focusId = null;
  function restoreFocus(el, id) { if (focusId === id) { var i = el.querySelector('[data-tq]'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { /* ignore */ } } } }

  function fillServer(id, el) {
    var sp = TBL[id], st = SS[id] || (SS[id] = { q: '', page: 1, total: null, rows: null, loading: false, err: null, req: 0 });
    var req = ++st.req; st.loading = true; st.err = null;
    var ps = sp.pageSize || CFG.modalPage, q = st.q.trim();
    var or = q && sp.sf ? sp.sf.map(function (f) { return [f, 'like', '%' + q + '%']; }) : null;
    var base = { doctype: sp.dt, filters: sp.filters };
    if (or) { base.or_filters = or; }
    paintServer(id, el);
    var chk = function () { return !destroyed && SS[id] && SS[id].req === req; };
    var cnt = getList(Object.assign({}, base, { fields: ['count(name) as n'], limit_page_length: 1 }), chk).then(function (r) { return r ? +r[0].n : null; });
    var rows = getList(Object.assign({}, base, { fields: sp.fields, order_by: sp.order, limit_start: (st.page - 1) * ps, limit_page_length: ps }), chk);
    Promise.all([cnt, rows]).then(function (res) {
      if (!chk()) { return; } st.total = res[0]; st.rows = res[1] || []; st.loading = false; paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]'));
    }).catch(function (e) { if (chk()) { st.loading = false; st.err = errKind(e); paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); } });
  }
  function paintServer(id, el) {
    if (!el) { return; } var sp = TBL[id], st = SS[id], ps = sp.pageSize || CFG.modalPage;
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(tr('Search…', 'بحث…')) + '" value="' + esc(st.q) + '"><span class="dms-sm">' + (st.total == null ? '' : num(st.total) + ' ' + esc(tr('records (server-side)', 'سجل (من الخادم)'))) + '</span></div>';
    if (st.err) { el.innerHTML = h + alertBox('err', esc(st.err === 'perm' ? tr('Permission denied for your user.', 'لا تملك صلاحية القراءة.') : tr('Technical error while reading this list.', 'خطأ تقني أثناء قراءة القائمة.'))); return restoreFocus(el, id); }
    if (st.loading && !st.rows) { el.innerHTML = h + '<div class="dms-skel"></div>'; return restoreFocus(el, id); }
    if (!st.rows || !st.rows.length) { el.innerHTML = h + '<div class="dms-tablewrap">' + empty() + '</div>'; return restoreFocus(el, id); }
    var pages = Math.max(1, Math.ceil((st.total || 0) / ps));
    h += '<div class="dms-tablewrap" style="opacity:' + (st.loading ? .55 : 1) + '"><table class="dms-table"><thead><tr>' + sp.cols.map(function (c) { return '<th>' + esc(c.h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      st.rows.map(function (r) { return '<tr>' + sp.cols.map(function (c) { return '<td>' + c.r(r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' + pager(id, 'spage', st.page, pages, st.total || 0, ps);
    el.innerHTML = h; restoreFocus(el, id);
  }

  /* column sets */
  function dt(v) { return v ? '<span class="dms-num">' + esc(String(v).slice(0, 10)) + '</span>' : '<span class="dms-sm">—</span>'; }
  function spTxt(v) { return v ? bdi(v) : '<span class="dms-sm">' + esc(NAtxt()) + '</span>'; }
  function quoteCols() {
    return [
      { k: 'n', h: tr('Quotation', 'عرض السعر'), r: function (q) { return docLink('Quotation', q.name); }, s: function (q) { return q.name; } },
      { k: 'd', h: tr('Date', 'التاريخ'), r: function (q) { return dt(q.date); }, s: function (q) { return q.date; } },
      { k: 'c', h: tr('Customer', 'العميل'), r: function (q) { return bdi(q.cname); }, s: function (q) { return q.cname; } },
      { k: 'w', h: tr('Workflow state', 'حالة سير العمل'), r: function (q) { return clsBadge(q.cls) + '<span class="dms-sm">' + esc(q.workflow_state || '') + ' · ' + esc(q.status || '') + '</span>'; }, s: function (q) { return q.cls; } },
      { k: 'v', h: tr('Value (SAR)', 'القيمة (ريال)'), r: function (q) { return '<span class="dms-num" title="' + esc(moneyFull(q.val)) + '">' + money(q.val) + '</span>'; }, s: function (q) { return q.val; } },
      { k: 'o', h: tr('Ordered (SAR)', 'المطلوب (ريال)'), r: function (q) { return MM && MM.s2 ? (q.linkVal ? '<span class="dms-num">' + money(q.linkVal) + '</span>' : '<span class="dms-sm">—</span>') : calc(); }, s: function (q) { return q.linkVal || 0; } },
      { k: 's', h: tr('Salesperson', 'مندوب المبيعات'), r: function (q) { return spTxt(q.sp); }, s: function (q) { return q.sp; } },
      { k: 'x', h: tr('Valid till', 'صالح حتى'), r: function (q) { return dt(q.valid_till); }, s: function (q) { return q.valid_till || ''; } }
    ];
  }
  function soTeamTxt(s) {
    if (!MM || !MM.s2) { return calc(); }
    var rows = DATA.soTeam[s.name] || []; if (!rows.length) { return '<span class="dms-sm">' + esc(NAtxt()) + '</span>'; }
    return rows.map(function (r) { return bdi(r.sales_person || NAtxt()) + ' <span class="dms-sm" style="display:inline">' + (+r.allocated_percentage || 0) + '%</span>'; }).join('<br>');
  }
  function soCols() {
    return [
      { k: 'n', h: tr('Sales Order', 'أمر البيع'), r: function (s) { return docLink('Sales Order', s.name); }, s: function (s) { return s.name; } },
      { k: 'd', h: tr('Date', 'التاريخ'), r: function (s) { return dt(s.date); }, s: function (s) { return s.date; } },
      { k: 'c', h: tr('Customer', 'العميل'), r: function (s) { return bdi(s.cname); }, s: function (s) { return s.cname; } },
      { k: 'st', h: tr('Status', 'الحالة'), r: function (s) { return soBadge(s.status); }, s: function (s) { return s.status; } },
      { k: 'v', h: tr('Value (SAR)', 'القيمة (ريال)'), r: function (s) { return '<span class="dms-num" title="' + esc(moneyFull(s.val)) + '">' + money(s.val) + '</span>'; }, s: function (s) { return s.val; } },
      { k: 'dl', h: tr('Delivered', 'التسليم'), r: function (s) { return '<span class="dms-num">' + Math.round(s.pdel) + '%</span>'; }, s: function (s) { return s.pdel; } },
      { k: 'bl', h: tr('Billed', 'الفوترة'), r: function (s) { return '<span class="dms-num">' + Math.round(s.pbill) + '%</span>'; }, s: function (s) { return s.pbill; } },
      { k: 'dd', h: tr('Delivery date', 'تاريخ التسليم'), r: function (s) { return dt(s.delivery_date); }, s: function (s) { return s.delivery_date || ''; } },
      { k: 'q', h: tr('Quotation ref.', 'مرجع العرض'), r: function (s) { if (!MM || !MM.s2) { return calc(); } var o = DATA.soItems[s.name], refs = o ? Object.keys(o.refs) : []; return refs.length ? refs.slice(0, 2).map(function (r) { return docLink('Quotation', r); }).join('<br>') + (refs.length > 2 ? ' +' + (refs.length - 2) : '') : '<span class="dms-sm">' + esc(tr('None on item lines', 'لا يوجد في البنود')) + '</span>'; } },
      { k: 't', h: tr('Sales Team', 'فريق المبيعات'), r: soTeamTxt }
    ];
  }
  function specQ(id, rows, extra) { return Object.assign({ id: id, cols: quoteCols(), rows: rows, text: function (q) { return [q.name, q.cname, q.sp, q.workflow_state, q.status, q.company].join(' '); } }, extra || {}); }
  function specS(id, rows, extra) { return Object.assign({ id: id, cols: soCols(), rows: rows, text: function (s) { return [s.name, s.cname, s.status, s.company].join(' '); } }, extra || {}); }
  function srvCols(kind) {
    var L = function (d, f) { return function (r) { return docLink(d, r[f]); }; };
    var D = { q: ['Quotation', [['name', tr('Quotation', 'عرض السعر')], ['transaction_date', tr('Date', 'التاريخ')], ['customer_name', tr('Customer', 'العميل')], ['workflow_state', tr('Workflow state', 'حالة سير العمل')], ['base_net_total', tr('Value (SAR)', 'القيمة')], ['sales_person', tr('Salesperson', 'المندوب')], ['valid_till', tr('Valid till', 'صالح حتى')]]],
      s: ['Sales Order', [['name', tr('Sales Order', 'أمر البيع')], ['transaction_date', tr('Date', 'التاريخ')], ['customer_name', tr('Customer', 'العميل')], ['status', tr('Status', 'الحالة')], ['base_net_total', tr('Value (SAR)', 'القيمة')], ['delivery_date', tr('Delivery date', 'تاريخ التسليم')], ['per_billed', tr('Billed %', 'مفوتر %')]]],
      l: ['Lead', [['name', tr('Lead', 'العميل المحتمل')], ['lead_name', tr('Name', 'الاسم')], ['company_name', tr('Company', 'الشركة')], ['source', tr('Source', 'المصدر')], ['status', tr('Status', 'الحالة')], ['custom_allocation_status', tr('Allocation', 'التخصيص')], ['lead_owner', tr('Owner', 'المالك')]]],
      c: ['Customer', [['name', tr('Customer', 'العميل')], ['customer_group', tr('Group', 'المجموعة')], ['custom_collection_status', tr('Collection', 'التحصيل')], ['custom_customer_account_status', tr('Account status', 'حالة الحساب')], ['custom_sales_person', tr('Salesperson', 'المندوب')]]],
      o: ['Opportunity', [['name', tr('Opportunity', 'الفرصة')], ['party_name', tr('Party', 'الطرف')], ['opportunity_from', tr('From', 'من')], ['status', tr('Status', 'الحالة')], ['transaction_date', tr('Date', 'التاريخ')]]],
      t: ['ToDo', [['name', 'ToDo'], ['description', tr('Description', 'الوصف')], ['allocated_to', tr('Assigned to', 'مسند إلى')], ['date', tr('Due', 'الاستحقاق')], ['reference_type', tr('Ref. type', 'نوع المرجع')], ['priority', tr('Priority', 'الأولوية')]]] }[kind];
    var cols = D[1].map(function (p, i) {
      var f = p[0];
      return { k: f, h: p[1], r: function (r) {
        var v = r[f]; if (i === 0) { return docLink(D[0], v); }
        if (f === 'base_net_total') { return '<span class="dms-num" title="' + esc(moneyFull(v)) + '">' + money(v) + '</span>'; }
        if (f === 'per_billed') { return '<span class="dms-num">' + Math.round(v || 0) + '%</span>'; }
        if (/date|valid_till/.test(f)) { return dt(v); }
        if (f === 'description') { return bdi(String(v || '').replace(/<[^>]*>/g, '').slice(0, 90)); }
        return v ? bdi(v) : '<span class="dms-sm">—</span>';
      } };
    });
    return { dt: D[0], cols: cols, fields: D[1].map(function (p) { return p[0]; }), sf: { q: ['name', 'customer_name'], s: ['name', 'customer_name'], l: ['name', 'lead_name', 'company_name'], c: ['name', 'customer_name'], o: ['name', 'party_name'], t: ['name', 'description'] }[kind] };
  }

  /* ---------- reconciliation (server aggregates vs loaded rows) ---------- */
  function loadRecon() {
    if (!DATA.quotes) { return; }
    var tok = TOK, chk = function () { return tok === TOK && !destroyed; }, key = PERIOD.join('|') + '|' + [F.company, F.division, F.location, F.sp].join('|');
    var qf = [['transaction_date', 'between', PERIOD], ['docstatus', '!=', 2]].concat(qServerFilters()), qraw = [['transaction_date', 'between', PERIOD]].concat(qServerFilters());
    var sf = [['transaction_date', 'between', PERIOD], ['docstatus', '=', 1]]; if (F.company) { sf.push(['company', '=', F.company]); } if (F.division) { sf.push(sfilter('custom_division', F.division)); } if (F.location) { sf.push(sfilter('location_', F.location)); }
    Promise.all([
      getList({ doctype: 'Quotation', fields: ['count(name) as n', 'sum(base_net_total) as v'], filters: qf, limit_page_length: 1 }, chk),
      getList({ doctype: 'Quotation', fields: ['count(name) as n'], filters: qraw, limit_page_length: 1 }, chk),
      F.sp ? Promise.resolve(null) : getList({ doctype: 'Sales Order', fields: ['count(name) as n', 'sum(base_net_total) as v'], filters: sf, limit_page_length: 1 }, chk)
    ]).then(function (r) {
      if (!chk()) { return; }
      DATA.recon = { key: key, q: r[0] ? { n: r[0][0] ? +r[0][0].n : 0, v: r[0][0] ? +r[0][0].v || 0 : 0 } : null, raw: r[1] && r[1][0] ? +r[1][0].n : null, s: r[2] ? { n: r[2][0] ? +r[2][0].n : 0, v: r[2][0] ? +r[2][0].v || 0 : 0 } : null };
      if (tab === 'overview') { renderContentOnly(); }
    }).catch(function () { DATA.recon = { key: key, err: true }; });
  }
  function reconHTML(M) {
    var R = DATA.recon, h = '';
    if (!R || R.err || !loadedQS()) { return panel(tr('Data reconciliation', 'مطابقة البيانات'), R && R.err ? esc(tr('Server totals unavailable.', 'تعذر جلب إجماليات الخادم.')) : calc()); }
    var lq = M.qs.filter(function (q) { return q.docstatus !== 2; }), ln = lq.length, lv = sum(lq, function (q) { return q.val; });
    function row(label, dn, dv, sn, sv) {
      var ok = dn === sn && Math.abs(dv - sv) < 1;
      return '<tr><td>' + esc(label) + '</td><td class="dms-num">' + num(dn) + '</td><td class="dms-num">' + num(sn) + '</td><td class="dms-num">' + money(dv) + '</td><td class="dms-num">' + money(sv) + '</td><td class="' + (ok ? 'dms-ok' : 'dms-bad') + '">' + (ok ? '✓ ' + esc(tr('Matches', 'مطابق')) : 'Δ ' + num(dn - sn) + ' / ' + money(dv - sv)) + '</td></tr>';
    }
    h += '<div class="dms-tablewrap"><table class="dms-table" style="min-width:520px"><thead><tr><th>' + esc(tr('Source', 'المصدر')) + '</th><th>' + esc(tr('Dashboard count', 'عدد اللوحة')) + '</th><th>' + esc(tr('ERP count', 'عدد النظام')) + '</th><th>' + esc(tr('Dashboard value', 'قيمة اللوحة')) + '</th><th>' + esc(tr('ERP value', 'قيمة النظام')) + '</th><th></th></tr></thead><tbody>';
    h += row(tr('Quotations (document not cancelled)', 'عروض الأسعار (المستند غير ملغى)'), ln, lv, R.q.n, R.q.v);
    if (R.s) { var so = DATA.so.filter(passSO).filter(function (s) { return s.docstatus === 1; }); h += row(tr('Sales Orders (submitted)', 'أوامر البيع (معتمدة)'), so.length, sum(so, function (s) { return s.val; }), R.s.n, R.s.v); }
    h += '</tbody></table></div>' + note(esc(tr('ERP figures are server-side aggregates for the same date range and filters; dashboard figures are computed from the loaded rows.', 'أرقام النظام تجميعات من الخادم لنفس النطاق والمرشحات؛ وأرقام اللوحة محسوبة من الصفوف المحمّلة.')));
    var dsC = M.qs.filter(function (q) { return q.docstatus === 2; }).length, wfC = M.qs.filter(function (q) { return q.docstatus !== 2 && q.cls === 'cancelled'; }).length;
    h += '<div class="dms-sec" style="margin-top:10px">' + esc(tr('From raw quotations to the KPI base', 'من إجمالي العروض الخام إلى قاعدة المؤشرات')) + '</div><div class="dms-tablewrap"><table class="dms-table" style="min-width:420px"><tbody>' +
      '<tr><td>' + esc(tr('Raw quotations in period (any document status)', 'إجمالي العروض في الفترة (أي حالة مستند)')) + '</td><td class="dms-num"><b>' + num(M.qs.length) + '</b></td><td class="dms-num">' + (R.raw != null ? num(R.raw) + ' ERP' : '') + '</td></tr>' +
      '<tr><td>− ' + esc(tr('Cancelled documents (docstatus = Cancelled)', 'مستندات ملغاة (docstatus = ملغى)')) + '</td><td class="dms-num">' + num(dsC) + '</td><td></td></tr>' +
      '<tr><td>= ' + esc(tr('Quotations whose document is not cancelled', 'عروض مستندها غير ملغى')) + '</td><td class="dms-num"><b>' + num(ln) + '</b></td><td></td></tr>' +
      '<tr><td>− ' + esc(tr('Submitted but workflow state "cancelled"', 'معتمدة لكن حالة سير العمل "ملغى"')) + '</td><td class="dms-num">' + num(wfC) + '</td><td></td></tr>' +
      '<tr><td>= ' + esc(tr('KPI base: "Quotations (not cancelled)"', 'قاعدة المؤشرات: "عروض الأسعار (غير الملغاة)"')) + '</td><td class="dms-num"><b>' + num(ln - wfC) + '</b></td><td></td></tr></tbody></table></div>';
    if (M.s2) { h += note(esc(tr('Sales Orders with Sales Team rows: ', 'أوامر البيع التي لها فريق مبيعات: ') + num(M.so.length - (M.soNoTeam || []).length) + ' / ' + num(M.so.length))); }
    return panel(tr('Data reconciliation', 'مطابقة البيانات'), h);
  }
  function loadedQS() { return DATA.status.quote && DATA.status.quote.ok; }

  /* ---------- drill-down specs ---------- */
  function openDrill(id) {
    var M = MM, spec = null, title = id;
    function qlist(arr, t, sid) { title = t; spec = specQ('drill', sortQ(arr), { pageSize: CFG.modalPage }); }
    function slist(arr, t) { title = t; spec = specS('drill', arr.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }), { pageSize: CFG.modalPage }); }
    if (id.indexOf('goto:') === 0) { tab = id.slice(5); OVL = null; resetTables(); renderAll(); window.scrollTo && 0; return; }
    if (id === 'q_all') { qlist(M.qs.filter(function (q) { return q.cls !== 'cancelled'; }), tr('Quotations in period (not cancelled)', 'عروض الفترة (غير الملغاة)')); }
    else if (id.indexOf('q_cls_') === 0) { var k = id.slice(6); qlist(M.qs.filter(function (q) { return q.cls === k; }), qcLabel(k)); }
    else if (id === 'q_issued') { qlist(M.issued, tr('Issued quotations (Approved + Accepted + Rejected + Lost)', 'العروض المُصدرة (معتمد + مقبول + مرفوض + مفقود)')); }
    else if (id === 'q_conv') { qlist(M.issued.filter(function (q) { return q.linked; }), tr('Issued quotations converted to a Sales Order', 'عروض مُصدرة تحوّلت إلى أمر بيع')); }
    else if (id === 'q_part') { qlist(M.conv.part.list, tr('Partially ordered quotations', 'عروض مطلوبة جزئيًا')); }
    else if (id === 'q_acc') { qlist(M.qs.filter(function (q) { return q.cls === 'accepted'; }), qcLabel('accepted')); }
    else if (id.indexOf('anom_') === 0) { var a = id.slice(5); var T = { statusNoLink: tr('Status Ordered/Partially Ordered but no visible Sales Order line', 'الحالة مطلوب/مطلوب جزئيًا بدون بند أمر بيع ظاهر'), linkedOutside: tr('Linked to a Sales Order but not counted as issued', 'مرتبطة بأمر بيع وغير محسوبة كمُصدرة'), rejectedOrdered: tr('Rejected by customer yet linked to a Sales Order', 'مرفوضة من العميل ومع ذلك مرتبطة بأمر بيع'), acceptedNotOrdered: tr('Accepted by customer, no Sales Order created', 'مقبولة من العميل بدون أمر بيع') }; qlist(M.anom[a], T[a]); }
    else if (id === 's_all') { slist(M.so, tr('Submitted Sales Orders in period', 'أوامر البيع المعتمدة في الفترة')); }
    else if (id === 's_overdue') { slist(M.soOverdue, tr('Sales Orders past delivery date', 'أوامر بيع تجاوزت تاريخ التسليم')); }
    else if (id === 's_noquote') { slist(M.soNoQuote, tr('Sales Orders with no quotation reference on any item line', 'أوامر بيع بلا مرجع عرض سعر في أي بند')); }
    else if (id.indexOf('s_st_') === 0) { var st = id.slice(5); slist(M.so.filter(function (s) { return s.status === st; }), soStatLabel(st)); }
    else if (id.indexOf('aged_') === 0) {
      var b = agedBuckets().filter(function (x) { return x.k === id.slice(5); })[0], kd = srvCols('q');
      title = tr('Aged quotations (awaiting customer): ', 'عروض متقادمة (بانتظار العميل): ') + tr(b.en, b.ar); delete SS.drill;
      spec = { id: 'drill', server: true, dt: 'Quotation', fields: kd.fields, filters: agedFilters(b), order: 'transaction_date desc', cols: kd.cols, sf: kd.sf, pageSize: CFG.modalPage };
    } else if (id.indexOf('srv:') === 0) {
      var sp = actSpecs().filter(function (x) { return x.id === id.slice(4); })[0], k2 = srvCols(sp.kind); title = sp.title; delete SS.drill;
      spec = { id: 'drill', server: true, dt: sp.dt, fields: k2.fields, filters: sp.filters, order: sp.order, cols: k2.cols, sf: k2.sf, pageSize: CFG.modalPage };
    }
    if (!spec) { return; }
    delete TS.drill; OVL = { title: title, spec: spec }; renderOverlay();
  }
  function sortQ(arr) { return arr.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }); }
  function overlayHTML() {
    if (!OVL) { return ''; }
    return '<div class="dms-overlay dms-center" data-act="ovbg"><div class="dms-modal" role="dialog" aria-modal="true"><div class="dms-dhead"><h3>' + esc(OVL.title) + '</h3><button type="button" class="dms-x" data-act="closeov" aria-label="' + esc(tr('Close', 'إغلاق')) + '">×</button></div>' + regTable(OVL.spec) + '</div></div>';
  }
  function renderOverlay() { var el = $('[data-ref="overlay"]'); if (!el) { return; } delete TBL.drill; el.innerHTML = overlayHTML(); fillTables(); var x = el.querySelector('.dms-x'); if (x) { x.focus(); } }
  function resetTables() { Object.keys(TS).forEach(function (k) { TS[k].page = 1; }); }

  /* ---------- tabs ---------- */
  function srcAlerts() {
    var h = '', s = DATA.status;
    [['quote', tr('Quotations', 'عروض الأسعار')], ['so', tr('Sales Orders', 'أوامر البيع')]].forEach(function (p) {
      var st = s[p[0]]; if (!st) { return; }
      if (!st.ok) { h += alertBox('err', '<b>' + esc(tr('Source unavailable', 'المصدر غير متاح')) + ':</b> ' + esc(p[1]) + ' — ' + esc(st.kind === 'large' ? tr('the selected range has ' + num(st.n) + ' records, above the ' + num(CFG.cap) + ' limit for complete client-side analysis. Choose a shorter range.', 'النطاق المحدد يحتوي ' + num(st.n) + ' سجلًا وهو أكبر من حد ' + num(CFG.cap) + ' للتحليل الكامل. اختر نطاقًا أقصر.') : st.kind === 'perm' ? tr('permission denied for your user', 'لا تملك صلاحية القراءة') : tr('technical error while reading', 'خطأ تقني أثناء القراءة'))); }
      else if (st.n !== st.expected) { h += alertBox('warn', esc(tr('Counts may be incomplete: rows read ', 'قد تكون الأعداد غير مكتملة: الصفوف المقروءة ')) + st.n + ' / ' + st.expected + ' (' + esc(p[1]) + ')'); }
    });
    if (DATA.refMissing && DATA.refMissing.length) { h += alertBox('info', esc(tr('Some reference lists are not available for your role: ', 'بعض القوائم المرجعية غير متاحة لدورك: ')) + esc(DATA.refMissing.join(', ')) + '. ' + esc(tr('Sections that depend on them (for example BDM teams) are limited.', 'الأقسام التي تعتمد عليها (مثل فرق BDM) محدودة.'))); }
    if (DATA.s2.err) { h += alertBox('err', esc(tr('Conversion and Sales Team data could not be loaded (', 'تعذر تحميل بيانات التحويل وفريق المبيعات (')) + esc(DATA.s2.err) + ').'); }
    return h;
  }
  function pipelineKpi() {
    if (!AGED.rows) { return { val: AGED.err ? '—' : '…', sub: AGED.err ? esc(tr('Unavailable', 'غير متاح')) : esc(tr('Calculating…', 'جارٍ الحساب…')) }; }
    var act = AGED.rows.slice(0, 3); return { n: sum(act, function (r) { return r.n; }), v: sum(act, function (r) { return r.v; }) };
  }
  function tabOverview(M) {
    var nonCan = M.qs.filter(function (q) { return q.cls !== 'cancelled'; }), h = '', acc = M.qc.accepted.n, pk = pipelineKpi();
    var lp = LEADS.rows ? LEADS.rows.filter(function (l) { return l.date >= PERIOD[0] && l.date <= PERIOD[1]; }).length : null;
    var buyers = {}; M.so.forEach(function (s) { buyers[s.customer] = 1; });
    h += '<div class="dms-grid dms-kpis">' +
      kpi({ label: tr('Quotations (not cancelled)', 'عروض الأسعار (غير الملغاة)'), val: num(nonCan.length), sub: money(sum(nonCan, function (q) { return q.val; })) + ' SAR', act: 'q_all', c: '#0f2547' }) +
      kpi({ label: tr('Active pipeline (as of today)', 'خط المبيعات النشط (حتى اليوم)'), val: pk.n == null ? pk.val : num(pk.n), sub: pk.n == null ? pk.sub : money(pk.v) + ' SAR · ' + esc(tr('Approved, ≤ ' + CFG.activeMaxAge + ' days', 'معتمد، ≤ ' + CFG.activeMaxAge + ' يومًا')), act: 'goto:quotes', c: '#1e88e5' }) +
      kpi({ label: tr('Customer acceptance rate', 'نسبة قبول العملاء'), val: pct(acc, M.issuedN), sub: num(acc) + ' ' + esc(tr('of', 'من')) + ' ' + num(M.issuedN) + ' ' + esc(tr('issued (excl. Closed)', 'مُصدرة (دون المغلقة)')), act: 'q_acc', c: '#2e7d32' }) +
      kpi({ label: tr('Acceptance incl. Closed in base', 'نسبة القبول مع احتساب المغلقة'), val: pct(acc, M.issuedN + M.qc.closed.n), sub: num(acc) + ' ' + esc(tr('of', 'من')) + ' ' + num(M.issuedN + M.qc.closed.n) + ' (' + esc(tr('issued + Closed', 'مُصدرة + مغلقة')) + ')', act: M.qc.closed.n ? 'q_cls_closed' : null, c: '#78909c' }) +
      kpi({ label: tr('Quotation → SO conversion (count)', 'تحويل العرض → أمر بيع (العدد)'), val: M.s2 ? pct(M.conv.n, M.issuedN) : '…', sub: M.s2 ? num(M.conv.n) + ' ' + esc(tr('of', 'من')) + ' ' + num(M.issuedN) : esc(tr('Calculating…', 'جارٍ الحساب…')), act: M.s2 ? 'q_conv' : null, c: '#7c3aed' }) +
      kpi({ label: tr('Quotation → SO conversion (value)', 'تحويل العرض → أمر بيع (القيمة)'), val: M.s2 ? pct(M.conv.v, M.issuedV) : '…', sub: M.s2 ? money(M.conv.v) + ' / ' + money(M.issuedV) + ' SAR' : esc(tr('Calculating…', 'جارٍ الحساب…')), c: '#7c3aed' }) +
      kpi({ label: tr('Sales Orders (submitted)', 'أوامر البيع (معتمدة)'), val: M.soWait ? '…' : num(M.so.length), sub: M.soWait ? esc(tr('Waiting for Sales Team data', 'بانتظار بيانات فريق المبيعات')) : money(M.soV) + ' SAR' + (F.sp ? ' (' + esc(tr('attributed share', 'الحصة المنسوبة')) + ')' : ''), act: M.soWait ? null : 's_all', c: '#0f9d8a' }) +
      kpi({ label: tr('Billed / Delivered (value-weighted)', 'مفوتر / مُسلَّم (موزون بالقيمة)'), val: pct(M.soBilledV, M.soV, 0), sub: esc(tr('Delivered', 'مُسلَّم')) + ' ' + pct(M.soDelivV, M.soV, 0), c: '#f59e0b' }) +
      kpi({ label: tr('Overdue deliveries', 'تسليمات متأخرة'), val: num(M.soOverdue.length), sub: money(sum(M.soOverdue, soShare)) + ' SAR', act: M.soOverdue.length ? 's_overdue' : null, c: '#e65100' }) +
      kpi({ label: tr('Leads created in period', 'عملاء محتملون في الفترة'), val: lp == null ? (LEADS.err ? '—' : '…') : num(lp), sub: esc(tr('Lead→Customer links incomplete', 'روابط العميل المحتمل→عميل ناقصة')), warn: tr('data quality', 'جودة البيانات'), act: 'goto:leads', c: '#64748b' }) +
      kpi({ label: tr('Active buyers (≥1 Sales Order)', 'مشترون نشطون (أمر بيع ≥ 1)'), val: M.soWait ? '…' : num(Object.keys(buyers).length), sub: esc(tr('distinct customers in period', 'عملاء مميزون في الفترة')), act: 'goto:customers', c: '#14b8a6' }) +
      '</div>';
    var cls = Object.keys(QCLS).map(function (k) { return { label: qcLabel(k), value: M.qc[k].n, color: QCLS[k].c }; }).filter(function (s) { return s.value; });
    var sos = Object.keys(M.soStat).map(function (k) { return { label: soStatLabel(k), value: M.soStat[k].n, color: (SOSTAT[k] || { c: '#78909c' }).c }; });
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Quotations vs Sales Orders by month (SAR)', 'العروض مقابل أوامر البيع شهريًا (ريال)'), groupedBars(M.months, [{ k: 'qv', label: tr('Quotations', 'عروض الأسعار'), color: '#1d4ed8' }, { k: 'sv', label: tr('Sales Orders', 'أوامر البيع'), color: '#0f9d8a' }], M.monthly)) +
      panel(tr('Quotation workflow distribution', 'توزيع حالات سير العمل للعروض'), donut(cls, num(M.qs.length), tr('quotations', 'عرض'))) + '</div>';
    var steps = [{ label: tr('Quotations (not cancelled)', 'عروض الأسعار'), n: nonCan.length, c: '#0f2547' }, { label: tr('Issued to customer', 'مُصدرة للعميل'), n: M.issuedN, c: '#1d4ed8' }, { label: tr('Accepted by customer', 'مقبولة'), n: acc, c: '#2e7d32' }, { label: tr('Converted to Sales Order', 'تحوّلت لأمر بيع'), n: M.s2 ? M.conv.n : null, c: '#7c3aed' }];
    var top = Object.keys(M.persons).filter(function (k) { return k !== NA && M.persons[k].contrib > 0; }).sort(function (a, b) { return M.persons[b].contrib - M.persons[a].contrib; }).slice(0, 8).map(function (k) { return { label: k, value: M.persons[k].contrib }; });
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Conversion funnel', 'قمع التحويل'), funnel(steps) + note(esc(tr('Closed quotations are excluded from "issued". Acceptance and Sales Order conversion are separate events.', 'العروض المغلقة مستبعدة من "المُصدرة". القبول والتحويل لأمر بيع حدثان منفصلان.')))) +
      panel(tr('Top salespeople by Sales Order contribution (SAR)', 'أعلى المندوبين بمساهمة أوامر البيع (ريال)'), M.s2 ? hbars(top, money) : calc()) + '</div>';
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Quotations by division', 'العروض حسب القسم'), stackByClass(M.qs, function (q) { return q.div; }, function (k) { return k === NA ? tr('Not Assigned', 'غير مُعيَّن') : k; })) +
      panel(tr('Sales Orders by status', 'أوامر البيع حسب الحالة'), donut(sos, num(M.so.length), tr('orders', 'أمر'))) + '</div>';
    h += reconHTML(M);
    return h;
  }
  function agedSection() {
    var h = '<div class="dms-sec">' + esc(tr('Aged Quotations', 'العروض المتقادمة')) + '<small>' + esc(tr('Approved, awaiting customer response — as of today, independent of the period filter', 'معتمدة وبانتظار رد العميل — حتى اليوم ومستقلة عن مرشح الفترة')) + '</small></div>';
    if (AGED.err) { return h + alertBox('err', esc(tr('Aged quotations could not be loaded.', 'تعذر تحميل العروض المتقادمة.')) + (AGED.err === 'perm' ? ' ' + esc(tr('No access to Quotation.', 'لا توجد صلاحية للوصول إلى عروض الأسعار.')) : '')); }
    if (!AGED.rows) { return h + '<div class="dms-grid dms-kpis"><div class="dms-skel"></div><div class="dms-skel"></div><div class="dms-skel"></div></div>'; }
    var cols = ['#2e7d32', '#7cb342', '#f9a825', '#e65100', '#c62828'];
    h += '<div class="dms-grid dms-kpis">' + AGED.rows.map(function (r, i) {
      return kpi({ label: tr(r.b.en, r.b.ar), val: num(r.n), sub: money(r.v) + ' SAR · ' + esc(i < 3 ? tr('active pipeline', 'خط نشط') : tr('aged', 'متقادم')), act: r.n ? 'aged_' + r.b.k : null, c: cols[i] });
    }).join('') + '</div>';
    var act = AGED.rows.slice(0, 3), old = AGED.rows.slice(3);
    h += alertBox('info', esc(tr('Active pipeline (≤ ' + CFG.activeMaxAge + ' days): ', 'الخط النشط (≤ ' + CFG.activeMaxAge + ' يومًا): ')) + '<b>' + num(sum(act, function (r) { return r.n; })) + '</b> / ' + money(sum(act, function (r) { return r.v; })) + ' SAR &nbsp;·&nbsp; ' +
      esc(tr('Aged (> ' + CFG.activeMaxAge + ' days): ', 'متقادم (> ' + CFG.activeMaxAge + ' يومًا): ')) + '<b>' + num(sum(old, function (r) { return r.n; })) + '</b> / ' + money(sum(old, function (r) { return r.v; })) + ' SAR. ' +
      esc(tr('Old Approved quotations are never mixed into the active pipeline.', 'لا تُدمج العروض المعتمدة القديمة في الخط النشط.')));
    var sn = sum(AGED.rows, function (r) { return r.n; }), sv = sum(AGED.rows, function (r) { return r.v; });
    if (AGED.total) {
      var okT = AGED.total.n === sn && Math.abs(AGED.total.v - sv) < 1;
      h += alertBox(okT ? 'info' : 'warn', esc(tr('Total open quotations (Approved, awaiting response): ', 'إجمالي العروض المفتوحة (معتمدة وبانتظار الرد): ')) + '<b>' + num(AGED.total.n) + '</b> / ' + money(AGED.total.v) + ' SAR &nbsp;·&nbsp; ' +
        (okT ? esc(tr('equals the sum of the buckets above', 'يساوي مجموع الفئات أعلاه')) : esc(tr('DIFFERS from the buckets (', 'يختلف عن مجموع الفئات (')) + num(sn) + ' / ' + money(sv) + ' SAR) — ' + esc(tr('future-dated quotations are not in any bucket', 'العروض بتاريخ مستقبلي غير مدرجة في أي فئة'))));
    }
    return h;
  }
  function tabQuotes(M) {
    var h = '<div class="dms-grid dms-kpis">' + Object.keys(QCLS).filter(function (k) { return M.qc[k].n || ISSUED.indexOf(k) >= 0; }).map(function (k) {
      return kpi({ label: qcLabel(k), val: num(M.qc[k].n), sub: money(M.qc[k].v) + ' SAR', act: M.qc[k].n ? 'q_cls_' + k : null, c: QCLS[k].c });
    }).join('') + '</div>';
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Quotations by month (SAR)', 'العروض شهريًا (ريال)'), groupedBars(M.months, [{ k: 'qv', label: tr('Quoted value', 'قيمة العروض'), color: '#1d4ed8' }], M.monthly)) +
      panel(tr('Workflow state by division', 'حالة سير العمل حسب القسم'), stackByClass(M.qs, function (q) { return q.div; }, function (k) { return k === NA ? tr('Not Assigned', 'غير مُعيَّن') : k; })) + '</div>';
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Workflow state by location', 'حالة سير العمل حسب الموقع'), stackByClass(M.qs, function (q) { return q.loc; }, function (k) { return k === NA ? tr('Not Assigned', 'غير مُعيَّن') : k; }, 10)) +
      panel(tr('Workflow state by salesperson (header)', 'حالة سير العمل حسب المندوب'), stackByClass(M.qs, function (q) { return q.sp; }, function (k) { return k === NA ? tr('Not Assigned', 'غير مُعيَّن') : k; }, 10)) + '</div>';
    var rows = M.qs; if (LF.cls) { rows = rows.filter(function (q) { return q.cls === LF.cls; }); }
    h += '<div class="dms-sec">' + esc(tr('Quotations in selected period', 'عروض الفترة المحددة')) + '</div><div class="dms-toolbar"><span class="dms-field" style="flex-direction:row;gap:8px;align-items:center"><label>' + esc(tr('Workflow class', 'تصنيف سير العمل')) + '</label><select class="dms-input" data-lf="cls"><option value="">' + esc(tr('All', 'الكل')) + '</option>' +
      Object.keys(QCLS).map(function (k) { return '<option value="' + k + '"' + (LF.cls === k ? ' selected' : '') + '>' + esc(qcLabel(k)) + '</option>'; }).join('') + '</select></span></div>';
    h += '<div class="dms-panelbox dms-mb">' + regTable(specQ('t_quotes', sortQ(rows))) + '</div>' + agedSection();
    return h;
  }
  function tabOrders(M) {
    var h = '';
    if (M.soWait) { h += alertBox('info', esc(tr('The salesperson filter needs Sales Team data (still loading).', 'مرشح المندوب يحتاج بيانات فريق المبيعات (قيد التحميل).'))); }
    h += '<div class="dms-grid dms-kpis">' +
      kpi({ label: tr('Submitted Sales Orders', 'أوامر البيع المعتمدة'), val: num(M.so.length), sub: money(M.soV) + ' SAR' + (F.sp ? ' (' + esc(tr('attributed share', 'الحصة المنسوبة')) + ')' : ''), act: 's_all', c: '#0f9d8a' }) +
      Object.keys(M.soStat).sort(function (a, b) { return M.soStat[b].n - M.soStat[a].n; }).map(function (k) { return kpi({ label: soStatLabel(k), val: num(M.soStat[k].n), sub: money(M.soStat[k].v) + ' SAR', act: 's_st_' + k, c: (SOSTAT[k] || { c: '#78909c' }).c }); }).join('') +
      kpi({ label: tr('Billed (value-weighted)', 'مفوتر (موزون)'), val: pct(M.soBilledV, M.soV, 0), sub: money(M.soBilledV) + ' SAR', c: '#f59e0b' }) +
      kpi({ label: tr('Delivered (value-weighted)', 'مُسلَّم (موزون)'), val: pct(M.soDelivV, M.soV, 0), sub: money(M.soDelivV) + ' SAR', c: '#1e88e5' }) +
      kpi({ label: tr('Past delivery date', 'تجاوزت تاريخ التسليم'), val: num(M.soOverdue.length), sub: money(sum(M.soOverdue, soShare)) + ' SAR', act: M.soOverdue.length ? 's_overdue' : null, c: '#e65100' }) +
      kpi({ label: tr('No quotation reference', 'بدون مرجع عرض سعر'), val: M.s2 ? num(M.soNoQuote.length) : '…', sub: M.s2 ? money(sum(M.soNoQuote, soShare)) + ' SAR · ' + esc(tr('no item line cites a quotation', 'لا يوجد بند يشير لعرض')) : esc(tr('Calculating…', 'جارٍ الحساب…')), act: M.s2 && M.soNoQuote.length ? 's_noquote' : null, c: '#78909c' }) +
      kpi({ label: tr('Cancelled / Draft (not counted)', 'ملغاة / مسودة (غير محسوبة)'), val: num(M.soCancelled) + ' / ' + num(M.soDraft), sub: esc(tr('shown for information only', 'للعلم فقط')), c: '#9e9e9e' }) + '</div>';
    var byDiv = {}; M.so.forEach(function (s) { var k = s.div || NA; byDiv[k] = (byDiv[k] || 0) + soShare(s); });
    var byLoc = {}; M.so.forEach(function (s) { var k = s.loc || NA; byLoc[k] = (byLoc[k] || 0) + soShare(s); });
    function toItems(o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).slice(0, 10).map(function (k) { return { label: k === NA ? tr('Not Assigned', 'غير مُعيَّن') : k, value: o[k] }; }); }
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Sales Orders by month (SAR)', 'أوامر البيع شهريًا (ريال)'), groupedBars(M.months, [{ k: 'sv', label: tr('Sales Orders', 'أوامر البيع'), color: '#0f9d8a' }], M.monthly)) +
      panel(tr('Order value by division (SAR)', 'قيمة الأوامر حسب القسم (ريال)'), hbars(toItems(byDiv), money)) + '</div>';
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Order value by location (SAR)', 'قيمة الأوامر حسب الموقع (ريال)'), hbars(toItems(byLoc), money)) +
      panel(tr('Order status', 'حالة الأوامر'), donut(Object.keys(M.soStat).map(function (k) { return { label: soStatLabel(k), value: M.soStat[k].n, color: (SOSTAT[k] || { c: '#78909c' }).c }; }), num(M.so.length), tr('orders', 'أمر'))) + '</div>';
    h += '<div class="dms-panelbox dms-mb">' + regTable(specS('t_so', M.so.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }))) + '</div>';
    return h;
  }
  function tabConv(M) {
    var h = '', acc = M.qc.accepted.n, cl = M.qc.closed.n;
    h += alertBox('info', '<b>' + esc(tr('Definitions', 'التعريفات')) + ':</b> ' + esc(tr('Acceptance rate = quotations in workflow state Accepted By Customer ÷ issued quotations (a workflow-based measure). The second rate adds Closed quotations to the denominator. Conversion = issued quotations that have at least one submitted, non-cancelled Sales Order item line referencing them (a linked-document measure, not workflow); value conversion = linked Sales Order item amounts ÷ quoted value of issued quotations. Issued = Approved + Accepted + Rejected + Lost quotations. Customer acceptance (workflow state) and Sales Order conversion (actual Sales Order item lines referencing the quotation) are separate events. Cancelled documents are excluded; each quotation counts once even if split across several orders.', 'نسبة القبول = عروض حالتها "مقبول من العميل" ÷ العروض المُصدرة (مقياس قائم على سير العمل). النسبة الثانية تضيف العروض المغلقة للمقام. التحويل = عروض مُصدرة لها بند أمر بيع معتمد وغير ملغى يشير إليها (مقياس قائم على المستندات المرتبطة وليس سير العمل)؛ وتحويل القيمة = مبالغ بنود أمر البيع المرتبطة ÷ قيمة العروض المُصدرة. المُصدرة = العروض المعتمدة + المقبولة + المرفوضة + المفقودة. قبول العميل (حالة سير العمل) وتحويل أمر البيع (بنود أوامر بيع تشير للعرض فعليًا) حدثان منفصلان. تُستبعد المستندات الملغاة، ويُحسب كل عرض مرة واحدة حتى لو قُسّم على عدة أوامر.')));
    var leadsP = LEADS.rows ? LEADS.rows.filter(function (l) { return l.date >= PERIOD[0] && l.date <= PERIOD[1]; }) : null;
    var leadsConv = leadsP ? leadsP.filter(function (l) { return l.customer; }).length : null;
    h += '<div class="dms-grid dms-kpis">' +
      kpi({ label: tr('Customer acceptance rate', 'نسبة قبول العملاء'), val: pct(acc, M.issuedN), sub: num(acc) + ' / ' + num(M.issuedN) + ' ' + esc(tr('issued, excluding Closed', 'مُصدرة دون المغلقة')), act: 'q_acc', c: '#2e7d32' }) +
      kpi({ label: tr('Acceptance incl. Closed in base', 'القبول مع احتساب المغلقة'), val: pct(acc, M.issuedN + cl), sub: num(acc) + ' / ' + num(M.issuedN + cl) + ' · ' + num(cl) + ' ' + esc(tr('Closed', 'مغلقة')), act: cl ? 'q_cls_closed' : null, c: '#78909c' }) +
      kpi({ label: tr('Quotation → SO (count)', 'العرض → أمر بيع (العدد)'), val: M.s2 ? pct(M.conv.n, M.issuedN) : '…', sub: M.s2 ? num(M.conv.n) + ' / ' + num(M.issuedN) + ' · ' + esc(tr('of accepted', 'من المقبولة')) + ' ' + pct(M.conv.accN, acc) : esc(tr('Calculating…', 'جارٍ الحساب…')), act: M.s2 ? 'q_conv' : null, c: '#7c3aed' }) +
      kpi({ label: tr('Quotation → SO (value)', 'العرض → أمر بيع (القيمة)'), val: M.s2 ? pct(M.conv.v, M.issuedV) : '…', sub: M.s2 ? money(M.conv.v) + ' / ' + money(M.issuedV) + ' SAR · ' + esc(tr('capped per quotation: ', 'بحد أقصى قيمة العرض: ')) + pct(M.conv.vCap, M.issuedV) + ' (' + num(M.conv.over) + ' ' + esc(tr('quotations ordered above quoted value', 'عرضًا طُلب بأكثر من قيمته')) + ')' : esc(tr('Calculating…', 'جارٍ الحساب…')), c: '#7c3aed' }) +
      kpi({ label: tr('Partially converted quotations', 'عروض محوّلة جزئيًا'), val: M.s2 ? num(M.conv.part.n) : '…', sub: M.s2 ? esc(tr('ordered', 'مطلوب')) + ' ' + pct(M.conv.part.ordered, M.conv.part.quoted) + ' · ' + esc(tr('remaining', 'متبقي')) + ' ' + money(Math.max(0, M.conv.part.quoted - M.conv.part.ordered)) + ' SAR' : esc(tr('Calculating…', 'جارٍ الحساب…')), act: M.s2 && M.conv.part.n ? 'q_part' : null, c: '#f59e0b' }) +
      kpi({ label: tr('Lead → Customer (indicative)', 'عميل محتمل → عميل (إرشادي)'), val: leadsP ? (leadsP.length ? pct(leadsConv, leadsP.length) : tr('N/A', 'غير متاح')) : '…', warn: tr('incomplete', 'ناقص'), sub: leadsP ? num(leadsConv) + ' ' + esc(tr('of', 'من')) + ' ' + num(leadsP.length) + ' ' + esc(tr('leads have a Customer link — links are largely not recorded; do not read as a true conversion rate', 'عميل محتمل لديه رابط عميل — الروابط غير مسجلة غالبًا؛ لا تُقرأ كنسبة تحويل حقيقية')) : '', c: '#64748b' }) + '</div>';
    var steps = [{ label: tr('Quotations (not cancelled)', 'العروض'), n: M.qs.filter(function (q) { return q.cls !== 'cancelled'; }).length, c: '#0f2547' }, { label: tr('Issued', 'مُصدرة'), n: M.issuedN, c: '#1d4ed8' }, { label: tr('Accepted', 'مقبولة'), n: acc, c: '#2e7d32' }, { label: tr('Converted to SO', 'محوّلة لأمر بيع'), n: M.s2 ? M.conv.n : null, c: '#7c3aed' }, { label: tr('…of which partial', '…منها جزئية'), n: M.s2 ? M.conv.part.n : null, c: '#f59e0b' }];
    var excl = [[tr('Closed (excluded)', 'مغلقة (مستبعدة)'), M.qc.closed.n], [tr('Internal review / approval (excluded)', 'مراجعة داخلية (مستبعدة)'), M.qc.review.n], [tr('Cancelled (excluded)', 'ملغاة (مستبعدة)'), M.qc.cancelled.n]].map(function (x) { return '<div><span>' + esc(x[0]) + '</span><b>' + num(x[1]) + '</b></div>'; }).join('');
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Conversion funnel', 'قمع التحويل'), funnel(steps)) + panel(tr('Not in the issued base', 'خارج قاعدة المُصدرة'), '<div class="dms-donut-legend" style="min-width:0">' + excl + '</div>') + '</div>';
    if (M.s2) {
      var mrows = M.months.map(function (m) { var arr = M.issued.filter(function (q) { return q.date.slice(0, 7) === m; }); return { m: m, issued: arr.length, acc: arr.filter(function (q) { return q.cls === 'accepted'; }).length, conv: arr.filter(function (q) { return q.linked; }).length, iv: sum(arr, function (q) { return q.val; }), cv: sum(arr, function (q) { return q.linkVal; }) }; });
      h += panel(tr('By quotation month', 'حسب شهر العرض'), regTable({ id: 't_cm', rows: mrows, pageSize: 24, text: function (r) { return r.m; }, cols: [
        { k: 'm', h: tr('Month', 'الشهر'), r: function (r) { return esc(monthLabel(r.m)); }, s: function (r) { return r.m; } }, { k: 'i', h: tr('Issued', 'مُصدرة'), r: function (r) { return num(r.issued); }, s: function (r) { return r.issued; } },
        { k: 'a', h: tr('Accepted %', 'قبول %'), r: function (r) { return pct(r.acc, r.issued); }, s: function (r) { return r.issued ? r.acc / r.issued : -1; } }, { k: 'c', h: tr('To SO % (count)', 'لأمر بيع % (عدد)'), r: function (r) { return pct(r.conv, r.issued); }, s: function (r) { return r.issued ? r.conv / r.issued : -1; } },
        { k: 'v', h: tr('To SO % (value)', 'لأمر بيع % (قيمة)'), r: function (r) { return pct(r.cv, r.iv); }, s: function (r) { return r.iv ? r.cv / r.iv : -1; } }] }), 'dms-mb');
      var an = M.anom, items = [['statusNoLink', an.statusNoLink], ['linkedOutside', an.linkedOutside], ['rejectedOrdered', an.rejectedOrdered], ['acceptedNotOrdered', an.acceptedNotOrdered]];
      var lab = { statusNoLink: tr('Status says Ordered/Partially Ordered but no visible Sales Order line (possibly an order you cannot see)', 'الحالة مطلوب/جزئي بدون بند أمر بيع ظاهر (قد يكون أمرًا لا تراه)'), linkedOutside: tr('Linked to a Sales Order but not in the issued base (Closed / review / other)', 'مرتبطة بأمر بيع وخارج قاعدة المُصدرة'), rejectedOrdered: tr('"Rejected By Customer" yet a Sales Order exists', '"مرفوض من العميل" ومع ذلك يوجد أمر بيع'), acceptedNotOrdered: tr('Accepted by customer, no Sales Order created (leakage)', 'مقبول من العميل بدون أمر بيع (فاقد)') };
      h += panel(tr('Data-quality checks and leakage', 'فحوصات جودة البيانات والفاقد'), '<div class="dms-grid dms-kpis">' + items.map(function (it) { return kpi({ label: lab[it[0]], val: num(it[1].length), sub: money(sum(it[1], function (q) { return q.val; })) + ' SAR', act: it[1].length ? 'anom_' + it[0] : null, c: it[0] === 'acceptedNotOrdered' ? '#e65100' : '#78909c' }); }).join('') + '</div>', 'dms-mb');
    } else { h += panel(tr('Conversion detail', 'تفاصيل التحويل'), calc() + progressBar()); }
    return h;
  }
  function progressBar() { return '<div class="dms-prog"><i data-ref="progbar" style="width:' + Math.round((DATA.s2.p || 0) * 100) + '%"></i></div>'; }
  function renderProgress() { var b = HOST.querySelector('[data-ref="progbar"]'); if (b) { b.style.width = Math.round((DATA.s2.p || 0) * 100) + '%'; } var p = $('[data-ref="prog"]'); if (p) { p.textContent = tr('Loading conversion and Sales Team data… ', 'جارٍ تحميل بيانات التحويل وفريق المبيعات… ') + Math.round((DATA.s2.p || 0) * 100) + '%'; } }

  function tabTeam(M) {
    var h = '';
    if (!M.s2) { h += alertBox('info', '<span data-ref="prog"></span>' + progressBar()); }
    var mt = {}, tt = {}, bdmOf = {}; DATA.sp.forEach(function (s) { mt[s.name] = +s.custom__sales_monthly_target || 0; tt[s.name] = +s.custom_bdm_team_target_ || 0; bdmOf[s.name] = s.custom_sales_persons_bdm || ''; });
    var P = M.persons; DATA.sp.forEach(function (s) { if (s.enabled && mt[s.name] > 0 && !P[s.name]) { P[s.name] = { name: s.name, qn: 0, qv: 0, issued: 0, acc: 0, convN: 0, convV: 0, issuedV: 0, soN: 0, contrib: 0 }; } });
    var rows = Object.keys(P).map(function (k) { var p = P[k]; p.target = (k !== NA && mt[k] > 0) ? mt[k] * M.targetMonths : null; p.bdm = bdmOf[k] || ''; return p; });
    h += alertBox('info', esc(tr('Quotations use the header salesperson; Sales Orders use Sales Team contribution %. Targets = configured monthly target × months in the selected period; partial months are prorated by days (' + M.targetMonths.toFixed(2) + ' months).', 'عروض الأسعار حسب مندوب الرأس؛ وأوامر البيع حسب نسبة مساهمة فريق المبيعات. الهدف = الهدف الشهري × أشهر الفترة (' + M.targetMonths.toFixed(2) + ').')));
    h += panel(tr('Salesperson performance', 'أداء مندوبي المبيعات'), regTable({ id: 't_sp', rows: rows, text: function (p) { return p.name + ' ' + p.bdm; }, empty: tr('No salesperson activity or targets for this selection.', 'لا نشاط أو أهداف لهذا الاختيار.'), cols: [
      { k: 'n', h: tr('Salesperson', 'المندوب'), r: function (p) { return p.name === NA ? '<b>' + esc(NAtxt()) + '</b>' : bdi(p.name); }, s: function (p) { return p.name; } },
      { k: 'b', h: tr('BDM team', 'فريق BDM'), r: function (p) { return p.bdm ? bdi(p.bdm) : '<span class="dms-sm">—</span>'; }, s: function (p) { return p.bdm; } },
      { k: 'q', h: tr('Quotes', 'العروض'), r: function (p) { return num(p.qn); }, s: function (p) { return p.qn; } },
      { k: 'qv', h: tr('Quoted (SAR)', 'المعروض (ريال)'), r: function (p) { return money(p.qv); }, s: function (p) { return p.qv; } },
      { k: 'a', h: tr('Acceptance', 'القبول'), r: function (p) { return pct(p.acc, p.issued); }, s: function (p) { return p.issued ? p.acc / p.issued : -1; } },
      { k: 'c', h: tr('To SO (count)', 'لأمر بيع (عدد)'), r: function (p) { return M.s2 ? pct(p.convN, p.issued) : calc(); }, s: function (p) { return p.issued ? p.convN / p.issued : -1; } },
      { k: 'so', h: tr('Orders credited', 'أوامر منسوبة'), r: function (p) { return M.s2 ? num(p.soN) : calc(); }, s: function (p) { return p.soN; } },
      { k: 'ct', h: tr('SO contribution (SAR)', 'مساهمة أوامر البيع (ريال)'), r: function (p) { return M.s2 ? '<span class="dms-num" title="' + esc(moneyFull(p.contrib)) + '">' + money(p.contrib) + '</span>' : calc(); }, s: function (p) { return p.contrib; } },
      { k: 't', h: tr('Target (period)', 'الهدف (للفترة)'), r: function (p) { return p.name === NA ? '<span class="dms-sm">—</span>' : p.target == null ? '<span class="dms-sm">' + esc(NCfg()) + '</span>' : money(p.target); }, s: function (p) { return p.target || 0; } },
      { k: 'ach', h: tr('Achievement', 'التحقيق'), r: function (p) { return !M.s2 ? calc() : p.target ? pct(p.contrib, p.target, 0) : '<span class="dms-sm">' + esc(p.name === NA ? '—' : NCfg()) + '</span>'; }, s: function (p) { return p.target ? p.contrib / p.target : -1; } }] }), 'dms-mb');
    if (M.s2) { h += note(esc(tr('Sales Order contribution not allocated to any salesperson (Sales Team % below 100): ', 'مساهمة أوامر البيع غير المنسوبة (نسبة أقل من 100): ')) + '<b>' + money(M.unalloc) + ' SAR</b>' + (M.overAlloc ? ' · ' + esc(tr('Orders with Sales Team above 100%: ', 'أوامر بنسبة تتجاوز 100%: ')) + '<b>' + M.overAlloc + '</b>' : '')); }
    var teams = DATA.bdm.map(function (b) {
      var members = DATA.sp.filter(function (s) { return s.custom_sales_persons_bdm === b.name; }).map(function (s) { return s.name; });
      var q = 0, c = 0, tgt = 0; members.forEach(function (m) { var p = P[m]; if (p) { q += p.qn; c += p.contrib; } tgt += (mt[m] || 0) * M.targetMonths; });
      var lead = b.sales_person || '', cfg = lead && tt[lead] > 0 ? tt[lead] * M.targetMonths : null;
      return { name: b.name, lead: lead, members: members.length, q: q, c: c, tgt: tgt, cfg: cfg };
    });
    h += panel(tr('BDM teams (members linked via Sales Person → BDM)', 'فرق BDM (الأعضاء المرتبطون عبر مندوب المبيعات ← BDM)'), regTable({ id: 't_bdm', rows: teams, text: function (t) { return t.name + ' ' + t.lead; }, empty: tr('No BDM records.', 'لا توجد سجلات BDM.'), cols: [
      { k: 'n', h: tr('BDM team', 'فريق BDM'), r: function (t) { return docLink('BDM', t.name); }, s: function (t) { return t.name; } },
      { k: 'l', h: tr('BDM (lead)', 'مسؤول الفريق'), r: function (t) { return spTxt(t.lead); }, s: function (t) { return t.lead; } },
      { k: 'm', h: tr('Members', 'الأعضاء'), r: function (t) { return num(t.members); }, s: function (t) { return t.members; } },
      { k: 'q', h: tr('Member quotes', 'عروض الأعضاء'), r: function (t) { return num(t.q); }, s: function (t) { return t.q; } },
      { k: 'c', h: tr('Member SO contribution (SAR)', 'مساهمة الأعضاء (ريال)'), r: function (t) { return M.s2 ? money(t.c) : calc(); }, s: function (t) { return t.c; } },
      { k: 't', h: tr('Σ member targets (period)', 'مجموع أهداف الأعضاء'), r: function (t) { return t.tgt > 0 ? money(t.tgt) : '<span class="dms-sm">' + esc(NCfg()) + '</span>'; }, s: function (t) { return t.tgt; } },
      { k: 'a', h: tr('Achievement vs Σ targets', 'التحقيق مقابل الأهداف'), r: function (t) { return M.s2 && t.tgt > 0 ? pct(t.c, t.tgt, 0) : '<span class="dms-sm">' + esc(t.tgt > 0 ? tr('Calculating…', 'جارٍ الحساب…') : NCfg()) + '</span>'; }, s: function (t) { return t.tgt ? t.c / t.tgt : -1; } },
      { k: 'g', h: tr('Configured team target (lead, period)', 'هدف الفريق المُهيّأ (للفترة)'), r: function (t) { return t.cfg == null ? '<span class="dms-sm">' + esc(NCfg()) + '</span>' : money(t.cfg); }, s: function (t) { return t.cfg || 0; } }] }), 'dms-mb');
    return h;
  }
  function tabLeads() {
    if (LEADS.err) { return alertBox('err', esc(tr('Leads could not be loaded: ', 'تعذر تحميل العملاء المحتملين: ')) + esc(LEADS.err)); }
    if (!LEADS.rows) { return '<div class="dms-grid dms-kpis"><div class="dms-skel"></div><div class="dms-skel"></div><div class="dms-skel"></div></div>' + note(esc(tr('Loading leads…', 'جارٍ تحميل العملاء المحتملين…'))); }
    var all = LEADS.rows, ls = all.filter(function (l) { return l.date >= PERIOD[0] && l.date <= PERIOD[1]; }), h = '';
    var latest = all.reduce(function (m, l) { return l.date > m ? l.date : m; }, ''), linkedAll = all.filter(function (l) { return l.customer; }).length, unq = all.filter(function (l) { return l.qual === 'Unqualified'; }).length;
    var warns = [];
    warns.push(tr('Lead→Customer links: only ' + linkedAll + ' of ' + all.length + ' leads (all time) have a Customer linked. Conversion cannot be inferred and is not estimated here.', 'روابط العميل المحتمل→عميل: ' + linkedAll + ' فقط من ' + all.length + ' (كل الفترات). لا يمكن استنتاج التحويل ولا يُقدَّر هنا.'));
    if (all.length && unq / all.length > 0.9) { warns.push(tr('Qualification status is "Unqualified" on ' + unq + ' of ' + all.length + ' leads — the field is not actively maintained.', 'حالة التأهيل "غير مؤهل" على ' + unq + ' من ' + all.length + ' — الحقل غير محدَّث.')); }
    if (latest && diffDays(latest, TODAY) > 60) { warns.push(tr('The newest lead was created on ' + latest + ' (' + diffDays(latest, TODAY) + ' days ago). Period filters may therefore show few or no leads.', 'أحدث عميل محتمل أُنشئ في ' + latest + ' (قبل ' + diffDays(latest, TODAY) + ' يومًا). قد تظهر الفترات الحديثة بلا عملاء محتملين.')); }
    h += warns.map(function (w) { return alertBox('warn', esc(w)); }).join('');
    function cnt(f) { return ls.filter(f).length; }
    var alloc = cnt(function (l) { return l.alloc === 'Allocated'; }), unal = cnt(function (l) { return l.alloc === '' || l.alloc === 'Non Allocated'; }), irr = cnt(function (l) { return l.alloc === 'Irrelevant'; }), clo = cnt(function (l) { return l.alloc === 'Closed'; });
    h += '<div class="dms-grid dms-kpis">' + kpi({ label: tr('Total leads (created in period)', 'إجمالي العملاء المحتملين (بالفترة)'), val: num(ls.length), sub: esc(tr('All time: ', 'كل الفترات: ')) + num(all.length), c: '#0f2547' }) +
      kpi({ label: tr('Allocated', 'مخصص'), val: num(alloc), sub: pct(alloc, ls.length), c: '#2e7d32' }) + kpi({ label: tr('Unallocated (Non Allocated / blank)', 'غير مخصص (فارغ)'), val: num(unal), sub: pct(unal, ls.length), c: '#e65100' }) +
      kpi({ label: tr('Irrelevant', 'غير ذي صلة'), val: num(irr), c: '#78909c' }) + kpi({ label: tr('Closed', 'مغلق'), val: num(clo), c: '#9e9e9e' }) +
      kpi({ label: tr('With a Customer link', 'لديه رابط عميل'), val: num(cnt(function (l) { return l.customer; })), warn: tr('incomplete', 'ناقص'), sub: esc(tr('indicative only', 'إرشادي فقط')), c: '#64748b' }) + '</div>';
    function grp(f) { var m = {}; ls.forEach(function (l) { var k = f(l) || NA; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).map(function (k, i) { return { label: k === NA ? tr('Not Available', 'غير متوفر') : k, value: m[k], color: PAL[i % PAL.length] }; }); }
    h += '<div class="dms-grid dms-three">' + panel(tr('Lead sources', 'مصادر العملاء المحتملين'), hbars(grp(function (l) { return l.src; }))) + panel(tr('Lead qualification', 'تأهيل العملاء المحتملين'), donut(grp(function (l) { return l.qual; }), num(ls.length), tr('leads', 'عميل'))) + panel(tr('Lead status', 'حالة العميل المحتمل'), hbars(grp(function (l) { return l.status; }))) + '</div>';
    var rows = ls; if (LF.lsrc) { rows = rows.filter(function (l) { return (l.src || NA) === LF.lsrc; }); } if (LF.lstat) { rows = rows.filter(function (l) { return l.status === LF.lstat; }); }
    h += '<div class="dms-toolbar"><span class="dms-field" style="flex-direction:row;gap:8px;align-items:center"><label>' + esc(tr('Source', 'المصدر')) + '</label><select class="dms-input" data-lf="lsrc"><option value="">' + esc(tr('All', 'الكل')) + '</option>' + uniq(ls.map(function (l) { return l.src; })).map(function (s) { return '<option' + (LF.lsrc === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select><label>' + esc(tr('Status', 'الحالة')) + '</label><select class="dms-input" data-lf="lstat"><option value="">' + esc(tr('All', 'الكل')) + '</option>' + uniq(ls.map(function (l) { return l.status; })).map(function (s) { return '<option' + (LF.lstat === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></span></div>';
    h += '<div class="dms-panelbox dms-mb">' + regTable({ id: 't_leads', rows: rows.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }), text: function (l) { return [l.name, l.lead_name, l.company_name, l.src, l.status, l.lead_owner, l.custom_sales_person_].join(' '); }, cols: [
      { k: 'n', h: tr('Lead', 'العميل المحتمل'), r: function (l) { return docLink('Lead', l.name); }, s: function (l) { return l.name; } }, { k: 'nm', h: tr('Name / Company', 'الاسم / الشركة'), r: function (l) { return bdi(l.lead_name || l.company_name || ''); }, s: function (l) { return l.lead_name || ''; } },
      { k: 'd', h: tr('Created', 'أُنشئ'), r: function (l) { return dt(l.date); }, s: function (l) { return l.date; } }, { k: 'sr', h: tr('Source', 'المصدر'), r: function (l) { return l.src ? bdi(l.src) : '<span class="dms-sm">' + esc(NAvail()) + '</span>'; }, s: function (l) { return l.src; } },
      { k: 'st', h: tr('Status', 'الحالة'), r: function (l) { return bdi(l.status || ''); }, s: function (l) { return l.status; } }, { k: 'q', h: tr('Qualification', 'التأهيل'), r: function (l) { return l.qual ? bdi(l.qual) : '<span class="dms-sm">' + esc(NAvail()) + '</span>'; }, s: function (l) { return l.qual; } },
      { k: 'a', h: tr('Allocation', 'التخصيص'), r: function (l) { return l.alloc ? bdi(l.alloc) : '<span class="dms-sm">' + esc(NAtxt()) + '</span>'; }, s: function (l) { return l.alloc; } }, { k: 'sp', h: tr('Salesperson', 'المندوب'), r: function (l) { return spTxt(l.custom_sales_person_); }, s: function (l) { return l.custom_sales_person_ || ''; } },
      { k: 'c', h: tr('Customer link', 'رابط العميل'), r: function (l) { return l.customer ? docLink('Customer', l.customer) : '<span class="dms-sm">' + esc(NAvail()) + '</span>'; } }] }) + '</div>';
    return h;
  }
  function tabCustomers(M) {
    if (CUST.err) { return alertBox('err', esc(tr('Customers could not be loaded: ', 'تعذر تحميل العملاء: ')) + esc(CUST.err)); }
    if (!CUST.rows) { return '<div class="dms-grid dms-kpis"><div class="dms-skel"></div><div class="dms-skel"></div><div class="dms-skel"></div></div>' + note(esc(tr('Loading customers…', 'جارٍ تحميل العملاء…'))); }
    var rows = CUST.rows, en = rows.filter(function (c) { return !c.disabled; }), h = '', newC = rows.filter(function (c) { return c.date >= PERIOD[0] && c.date <= PERIOD[1]; });
    var cnt = {}, val = {}, last = {}; M.so.forEach(function (s) { cnt[s.customer] = (cnt[s.customer] || 0) + 1; val[s.customer] = (val[s.customer] || 0) + soShare(s); if (!last[s.customer] || s.date > last[s.customer]) { last[s.customer] = s.date; } });
    var buyers = Object.keys(cnt), repeat = buyers.filter(function (k) { return cnt[k] >= 2; });
    var nobuy = en.filter(function (c) { return !CUST.orders[c.name]; });
    h += alertBox('info', esc(tr('"Purchase" = a submitted Sales Order. Customers without purchases = enabled customers that have no submitted Sales Order visible to you in any period. New customers = created in ERP during the period (no separate "customer since" date exists).', '"الشراء" = أمر بيع معتمد. العملاء بلا مشتريات = عملاء مفعّلون ليس لهم أي أمر بيع معتمد ظاهر لك في أي فترة. العملاء الجدد = أُنشئوا في النظام خلال الفترة (لا يوجد حقل "عميل منذ").')));
    h += '<div class="dms-grid dms-kpis">' + kpi({ label: tr('Customers (enabled)', 'العملاء (مفعّلون)'), val: num(en.length), sub: num(rows.length - en.length) + ' ' + esc(tr('disabled', 'معطّل')), c: '#0f2547' }) +
      kpi({ label: tr('New customers (created in period)', 'عملاء جدد (بالفترة)'), val: num(newC.length), c: '#2e7d32' }) +
      kpi({ label: tr('Active buyers (≥1 order in period)', 'مشترون نشطون'), val: M.soWait ? '…' : num(buyers.length), c: '#1e88e5' }) +
      kpi({ label: tr('Repeat customers (≥2 orders in period)', 'عملاء متكررون (≥2)'), val: M.soWait ? '…' : num(repeat.length), sub: pct(repeat.length, buyers.length), c: '#7c3aed' }) +
      kpi({ label: tr('Customers without purchases', 'عملاء بلا مشتريات'), val: num(nobuy.length), sub: pct(nobuy.length, en.length) + ' ' + esc(tr('of enabled', 'من المفعّلين')), c: '#e65100' }) +
      kpi({ label: tr('With a salesperson assigned', 'لديهم مندوب مُعيَّن'), val: num(en.filter(function (c) { return c.custom_sales_person; }).length), sub: num(en.filter(function (c) { return !c.custom_sales_person; }).length) + ' ' + esc(tr('Not Assigned', 'غير مُعيَّن')), c: '#14b8a6' }) + '</div>';
    function grp(f, lim) { var m = {}; en.forEach(function (c) { var k = f(c) || NA; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, lim || 10).map(function (k, i) { return { label: k === NA ? tr('Not Available', 'غير متوفر') : k, value: m[k], color: PAL[i % PAL.length] }; }); }
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Customers by group', 'العملاء حسب المجموعة'), hbars(grp(function (c) { return c.customer_group; }))) + panel(tr('Customers by territory (top 10)', 'العملاء حسب المنطقة'), hbars(grp(function (c) { return c.territory; }))) + '</div>';
    h += '<div class="dms-grid dms-cols-2">' + panel(tr('Customer account status', 'حالة حساب العميل'), hbars(grp(function (c) { return c.custom_customer_account_status; }))) + panel(tr('Collection status', 'حالة التحصيل'), hbars(grp(function (c) { return c.custom_collection_status; }))) + '</div>';
    var byName = {}; rows.forEach(function (c) { byName[c.name] = c; });
    var tbl = buyers.map(function (k) { var c = byName[k] || {}; return { name: k, cn: c.customer_name || k, grp: c.customer_group || '', sp: c.custom_sales_person || '', n: cnt[k], v: val[k], last: last[k], known: !!byName[k] }; });
    h += '<div class="dms-sec">' + esc(tr('Customers with orders in the period', 'عملاء لديهم أوامر في الفترة')) + '</div><div class="dms-panelbox dms-mb">' + regTable({ id: 't_cust', rows: tbl.sort(function (a, b) { return b.v - a.v; }), text: function (r) { return r.name + ' ' + r.cn + ' ' + r.grp + ' ' + r.sp; }, cols: [
      { k: 'c', h: tr('Customer', 'العميل'), r: function (r) { return docLink('Customer', r.name) + '<span class="dms-sm">' + bdi(r.cn) + '</span>'; }, s: function (r) { return r.cn; } }, { k: 'g', h: tr('Group', 'المجموعة'), r: function (r) { return r.grp ? bdi(r.grp) : '<span class="dms-sm">' + esc(NAvail()) + '</span>'; }, s: function (r) { return r.grp; } },
      { k: 'sp', h: tr('Salesperson', 'المندوب'), r: function (r) { return spTxt(r.sp); }, s: function (r) { return r.sp; } }, { k: 'n', h: tr('Orders', 'الأوامر'), r: function (r) { return num(r.n) + (r.n >= 2 ? ' <span class="dms-tag">' + esc(tr('repeat', 'متكرر')) + '</span>' : ''); }, s: function (r) { return r.n; } },
      { k: 'v', h: tr('Order value (SAR)', 'قيمة الأوامر (ريال)'), r: function (r) { return '<span class="dms-num" title="' + esc(moneyFull(r.v)) + '">' + money(r.v) + '</span>'; }, s: function (r) { return r.v; } }, { k: 'l', h: tr('Last order', 'آخر أمر'), r: function (r) { return dt(r.last); }, s: function (r) { return r.last; } }] }) + '</div>';
    return h;
  }
  function tabActions() {
    var specs = actSpecs(), h = alertBox('info', esc(tr('Action lists are as of today and are not filtered by the period. They respect the company, division, location and salesperson filters where the source supports them.', 'قوائم الإجراءات حتى اليوم وغير مرتبطة بالفترة، وتراعي مرشحات الشركة والقسم والموقع والمندوب حيثما يدعمها المصدر.')));
    if (!ACT.counts) { loadActionCounts(); }
    h += '<div class="dms-grid dms-kpis">' + specs.map(function (s) {
      var c = ACT.counts ? ACT.counts[s.id] : undefined, err = typeof c === 'string';
      return kpi({ label: s.title, val: c === undefined ? '…' : err ? '—' : num(c), sub: esc(err ? (c === 'ERR:perm' ? tr('Permission denied', 'لا صلاحية') : tr('Unavailable', 'غير متاح')) : s.why), act: (!err && c) ? 'srv:' + s.id : null, c: '#1d4ed8' });
    }).join('') + '</div>';
    return h;
  }

  /* ---------- header / controls / banners ---------- */
  function headerHTML() {
    return '<div class="dms-header"><div class="dms-brand"><div class="dms-logo">DM</div><div style="min-width:0"><h2 class="dms-title">' + esc(tr('Quotation & SO tracker', 'لوحة المبيعات CRM ومتابعة التحويل')) + '</h2><p class="dms-sub">DM Group KSA · ' + esc(tr('Read-only view of ERP data under your permissions. Amounts in SAR (company base currency).', 'عرض للقراءة فقط لبيانات النظام وفق صلاحياتك. المبالغ بالريال (عملة الشركة الأساسية).')) + '</p></div></div>' +
      '<div class="dms-actions"><span class="dms-stamp" data-ref="stamp"></span><button class="dms-btn dms-btn-primary" data-act="refresh" data-ref="refresh" type="button"></button>' +
      '<div class="dms-lang" role="group" aria-label="Language"><button type="button" data-act="lang" data-v="en" class="' + (LANG === 'en' ? 'dms-on' : '') + '">EN</button><button type="button" data-act="lang" data-v="ar" class="' + (LANG === 'ar' ? 'dms-on' : '') + '">عربي</button></div></div></div>';
  }
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function controlsHTML() {
    var cos = uniq(DATA.quotes.map(function (q) { return q.company; }).concat(DATA.so.map(function (s) { return s.company; })));
    var divs = uniq(DATA.divisions.concat(DATA.quotes.map(function (q) { return q.div; })).concat(DATA.so.map(function (s) { return s.div; })));
    var locs = uniq(DATA.quotes.map(function (q) { return q.loc; }).concat(DATA.so.map(function (s) { return s.loc; })));
    var sps = uniq(DATA.sp.map(function (s) { return s.name; }).concat(DATA.quotes.map(function (q) { return q.sp; })));
    function sel(f, label, list, withNA) { return '<div class="dms-field"><label>' + esc(label) + '</label><select class="dms-input" data-g="' + f + '">' + opt('', tr('All', 'الكل'), F[f]) + (withNA ? opt(NA, NAtxt(), F[f]) : '') + list.map(function (x) { return opt(x, x, F[f]); }).join('') + '</select></div>'; }
    var h = '<div class="dms-field"><label>' + esc(tr('Period', 'الفترة')) + '</label><select class="dms-input" data-g="period">' + PERIODS.map(function (p) { return opt(p[0], tr(p[1], p[2]), F.period); }).join('') + '</select></div>';
    if (F.period === 'custom') { h += '<div class="dms-field"><label>' + esc(tr('From', 'من')) + '</label><input type="date" class="dms-input" data-g="from" value="' + esc(F.from) + '"></div><div class="dms-field"><label>' + esc(tr('To', 'إلى')) + '</label><input type="date" class="dms-input" data-g="to" value="' + esc(F.to) + '"></div>'; }
    h += sel('company', tr('Company', 'الشركة'), cos, false) + sel('division', tr('Division', 'القسم'), divs, true) + sel('location', tr('Location', 'الموقع'), locs, true) + sel('sp', tr('Salesperson', 'المندوب'), sps, true);
    h += '<div class="dms-field"><label>' + esc(tr('Selected range', 'النطاق المحدد')) + '</label><div class="dms-sm" style="font-size:12px;color:var(--dms-ink)">' + esc(PERIOD[0] || '—') + ' → ' + esc(PERIOD[1] || '—') + '</div></div>';
    return h;
  }
  function tabsHTML() { return '<div class="dms-tabs" role="tablist">' + TABS.map(function (x) { return '<button class="dms-tab' + (x.id === tab ? ' dms-on' : '') + '" role="tab" aria-selected="' + (x.id === tab) + '" data-act="tab" data-v="' + x.id + '" type="button">' + esc(tr(x.en, x.ar)) + '</button>'; }).join('') + '</div>'; }
  function renderHeaderState() {
    var b = $('[data-ref="refresh"]'), s = $('[data-ref="stamp"]'), busy = loading || DATA.s2.running;
    if (b) { b.disabled = loading; b.innerHTML = loading ? '<span class="dms-spin"></span> ' + esc(tr('Loading…', 'جارٍ التحميل…')) : '↻ ' + esc(tr('Refresh', 'تحديث')); }
    if (s) { s.textContent = DATA.loadedAt ? tr('Last refreshed', 'آخر تحديث') + ': ' + DATA.loadedAt + (busy ? ' · …' : '') : ''; }
  }
  function renderContentOnly() { MM = buildModel(); var c = $('[data-ref="content"]'); if (!c) { return; } TBL = {}; c.innerHTML = contentHTML(MM); fillTables(); }
  function contentHTML(M) {
    if (loading) { return '<div class="dms-grid dms-kpis"><div class="dms-skel"></div><div class="dms-skel"></div><div class="dms-skel"></div><div class="dms-skel"></div></div>' + note(esc(tr('Loading quotations and sales orders from ERPNext…', 'جارٍ تحميل عروض الأسعار وأوامر البيع من ERPNext…'))); }
    var okAny = (DATA.status.quote && DATA.status.quote.ok) || (DATA.status.so && DATA.status.so.ok);
    if (!okAny) { return ''; }
    if (!PERIOD[0] || PERIOD[0] > PERIOD[1]) { return alertBox('err', esc(tr('Choose a valid date range.', 'اختر نطاق تاريخ صحيحًا.'))); }
    var body = { overview: tabOverview, leads: tabLeads, customers: tabCustomers, quotes: tabQuotes, orders: tabOrders, conv: tabConv, team: tabTeam, actions: tabActions }[tab](M);
    return (M.s2 || tab === 'leads' || tab === 'customers' || tab === 'actions' ? '' : '<div class="dms-alert dms-alert-info"><span data-ref="prog"></span>' + progressBar() + '</div>') + body;
  }
  function renderAll(soft) {
    HOST.setAttribute('dir', LANG === 'ar' ? 'rtl' : 'ltr'); HOST.setAttribute('lang', LANG);
    PERIOD = curPeriod(); MM = buildModel(); TBL = {};
    HOST.innerHTML = headerHTML() + '<div class="dms-controls" data-ref="controls">' + controlsHTML() + '</div>' + tabsHTML() + '<div data-ref="banner">' + srcAlerts() + '</div><div class="dms-content" data-ref="content">' + contentHTML(MM) + '</div><div data-ref="overlay"></div>';
    if (OVL) { var o = $('[data-ref="overlay"]'); o.innerHTML = overlayHTML(); }
    renderHeaderState(); fillTables(); renderProgress();
    if (tab === 'leads' || tab === 'overview' || tab === 'conv') { loadLeads(); }
    if (tab === 'customers') { loadCustomers(); }
  }

  /* ---------- events (single delegated set, removed on destroy) ---------- */
  function onClick(ev) {
    var n = ev.target.closest ? ev.target.closest('[data-act]') : null; if (!n || !HOST.contains(n)) { return; }
    var a = n.getAttribute('data-act'), v = n.getAttribute('data-v'), id = n.getAttribute('data-id');
    if (a === 'ovbg') { if (ev.target === n) { OVL = null; renderOverlay(); } return; }
    if (a === 'closeov') { OVL = null; renderOverlay(); return; }
    if (a === 'tab') { if (tab !== v) { tab = v; resetTables(); renderAll(); } return; }
    if (a === 'lang') { LANG = v; try { G.localStorage.setItem('dms_lang', LANG); } catch (e) { /* ignore */ } OVL = null; renderAll(); return; }
    if (a === 'refresh') { AGED.rows = null; LEADS.rows = null; CUST.rows = null; ACT.counts = null; DATA.recon = null; startLoad(true); return; }
    if (a === 'kpi') { openDrill(v); return; }
    if (a === 'tpage') { TS[id].page = Math.max(1, TS[id].page + (+v)); fillTable(id); return; }
    if (a === 'tsort') { var st = TS[id]; if (st.sk === v) { st.dir = -st.dir; } else { st.sk = v; st.dir = 1; } st.page = 1; fillTable(id); return; }
    if (a === 'spage') { var ss = SS[id]; ss.page = Math.max(1, ss.page + (+v)); ss.dirty = true; fillTable(id); return; }
  }
  function onInput(ev) {
    var n = ev.target; if (!n || !n.getAttribute || !HOST.contains(n)) { return; }
    var g = n.getAttribute('data-g'), lf = n.getAttribute('data-lf'), tq = n.getAttribute('data-tq');
    if (g) {
      if (F[g] === n.value) { return; } F[g] = n.value; resetTables();
      if (g === 'period' || g === 'from' || g === 'to') { if (F.period === 'custom' && (!F.from || !F.to) ) { renderAll(); return; } startLoad(false); }
      else { renderAll(); loadAgedLater(); later(loadRecon, 300); }
      return;
    }
    if (lf) { if (LF[lf] === n.value) { return; } LF[lf] = n.value; renderContentOnly(); return; }
    if (tq) {
      focusId = tq; var spx = TBL[tq]; if (!spx) { return; }
      if (spx.server) { var s2 = SS[tq]; if (s2.q === n.value) { return; } s2.q = n.value; s2.page = 1; clearTimeout(onInput.t); onInput.t = later(function () { s2.dirty = true; fillTable(tq); }, 350); }
      else { var s1 = TS[tq] || (TS[tq] = { q: '', page: 1, sk: '', dir: 1 }); if (s1.q === n.value) { return; } s1.q = n.value; s1.page = 1; fillTable(tq); }
    }
  }
  function onKey(ev) { if (ev.key === 'Escape' && OVL) { OVL = null; renderOverlay(); } }
  HOST.addEventListener('click', onClick, SIG);
  HOST.addEventListener('input', onInput, SIG);
  HOST.addEventListener('change', onInput, SIG);
  HOST.addEventListener('keydown', onKey, SIG);

  /* ---------- start ---------- */
  if (!G.frappe || !frappe.call) { HOST.innerHTML = '<div class="dms-empty">Frappe client API not available.</div>'; return; }
  setToday(); PERIOD = curPeriod();
  startLoad(false);
})();