/* DM Group KSA - Payroll Cost Center Dashboard | Custom HTML Block (JavaScript section)
   Read-only. Uses only the logged-in user's authenticated Frappe APIs (frappe.client.get_list,
   frappe.client.get_count, frappe.client.get, frappe.desk.reportview.get). No server scripts, no new endpoints. */
(function () {
'use strict';
var R = (typeof root_element !== 'undefined' && root_element) || document;
var $ = function (s, r) { return (r || R).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || R).querySelectorAll(s)); };
var root = $('#dmp');
if (!root) { return; }

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
function t(s) { return S.lang === 'ar' && AR[s] ? AR[s] : s; }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function n0(v) { return (+v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function n1(v) { return (+v || 0).toLocaleString('en-US', { maximumFractionDigits: 1 }); }
function n2(v) { return (+v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function sar(v) { return 'SAR ' + n2(v); }
function short(v) { v = +v || 0; var a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K' : String(Math.round(v)); }
function U(s) { var p = String(s).slice(0, 10).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
function Y(ms) { return new Date(ms).toISOString().slice(0, 10); }
function addD(s, n) { return Y(U(s) + n * 864e5); }
function dow(s) { return new Date(U(s)).getUTCDay(); }
function diffDays(a, b) { return Math.round((U(b) - U(a)) / 864e5); }
function today() { return frappe.datetime.get_today(); }
function eachDay(a, b) { var r = []; for (var x = U(a); x <= U(b); x += 864e5) { r.push(Y(x)); } return r; }
function monthStart(s) { return s.slice(0, 8) + '01'; }
function monthEnd(s) { var d = new Date(U(s)); return Y(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); }
function addMonths(s, n) { var d = new Date(U(s)); return Y(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)); }
function monthName(ym, short_) { var l = S.lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US'; return new Intl.DateTimeFormat(l, { month: short_ ? 'short' : 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(U(ym + '-01'))); }
function wdNames() { return S.lang === 'ar' ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; }
function hm(ts) { return String(ts).slice(11, 19); }
function chip(txt, cls) { return '<span class="chip ' + (cls || '') + '">' + esc(txt) + '</span>'; }
function fk() { return JSON.stringify(S.f); }
function sum(a, k) { var s = 0; for (var i = 0; i < a.length; i++) { s += +a[i][k] || 0; } return s; }
function uniq(a) { return Array.from(new Set(a)); }
function cmp(a, b) { if (a == null) { return -1; } if (b == null) { return 1; } return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)); }

/* ---------- API layer (all read-only, authenticated) ---------- */
function busyInc(d) { busy += d; $('#loadbar').classList.toggle('on', busy > 0); }
function errOf(e) {
  try {
    var x = (e && e.responseJSON) || {}, m = '';
    if (x._server_messages) { m = JSON.parse(JSON.parse(x._server_messages)[0]).message; }
    else if (x.exception) { m = x.exception; }
    else if (e && e.status) { m = e.status + ' ' + (e.statusText || ''); }
    var er = new Error(String(m || 'Request failed').replace(/<[^>]+>/g, ''));
    er.status = e && e.status; return er;
  } catch (_) { return new Error('Request failed'); }
}
var REQ_TIMEOUT = 90000;
/* Direct, silent API call: no Frappe popups, always settles (timeout), clear "No access to X" on 403. */
function call(method, args) {
  busyInc(1);
  return new Promise(function (ok, no) {
    var done = false, ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (done) { return; } done = true; busyInc(-1); if (ctl) { try { ctl.abort(); } catch (_) { } } no(new Error(t('Request timed out'))); }, REQ_TIMEOUT);
    var body = new URLSearchParams();
    Object.keys(args || {}).forEach(function (k) { var v = args[k]; if (v === undefined || v === null) { return; } body.append(k, (typeof v === 'object') ? JSON.stringify(v) : String(v)); });
    fetch('/api/method/' + method, { method: 'POST', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined,
      headers: { 'X-Frappe-CSRF-Token': (window.frappe && frappe.csrf_token) || '', 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() })
      .then(function (r) { return r.text().then(function (txt) { return { r: r, txt: txt }; }); })
      .then(function (o) {
        if (done) { return; } done = true; clearTimeout(timer); busyInc(-1);
        var j = null; try { j = JSON.parse(o.txt); } catch (_) { }
        if (o.r.ok && j && !j.exc) { ok(j.message); return; }
        var ex = String((j && (j.exception || j.exc_type)) || '');
        if (o.r.status === 401 || o.r.status === 403 || /permission/i.test(ex)) { var pe = new Error(t('No access to') + ' ' + ((args && (args.doctype || args.report_name)) || method)); pe.status = o.r.status || 403; pe.perm = true; no(pe); return; }
        no(errOf({ responseJSON: j || {}, status: o.r.status, statusText: o.r.statusText }));
      })
      .catch(function (err) { if (done) { return; } done = true; clearTimeout(timer); busyInc(-1); no(new Error((err && err.message) || 'Network error')); });
  });
}
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
  if (F.company) { fl.push(['company', '=', F.company]); }
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
function idsIfNeeded() { return getEmployees().then(function (e) { return (S.f.company || fRestricted()) ? e.map(function (x) { return x.name; }) : null; }); }
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
    var fl = F.company ? [['company', '=', F.company]] : [];
    return all('Employee', ['name'], fl, { or: [['employee_name', 'like', '%' + F.q + '%'], ['name', 'like', '%' + F.q + '%']] }).then(function (r) { return r.map(function (x) { return x.name; }); });
  });
}
function slipFilters(extra) {
  var F = S.f, fl = [['docstatus', '<', 2], ['start_date', '<=', F.to], ['end_date', '>=', F.from]];
  if (F.company) { fl.push(['company', '=', F.company]); }
  if (F.branch) { fl.push(['branch', '=', F.branch]); }
  if (F.dept) { fl.push(['department', '=', F.dept]); }
  return fl.concat(extra || []);
}
function getPayroll() {
  var F = S.f;
  return memo('pay|' + fk(), function () {
    var pef = [['docstatus', '<', 2], ['start_date', '<=', F.to], ['end_date', '>=', F.from]];
    if (F.company) { pef.push(['company', '=', F.company]); }
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
    if (F.company) { fl.push(['company', '=', F.company]); } if (F.cc) { fl.push(['cost_center', '=', F.cc]); }
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

/* ---------- charts (self-contained SVG/HTML, no external libraries) ---------- */
function niceMax(v) { if (v <= 0) { return 1; } var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
function legend(series) { return '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div>'; }
function plot(cats, series, o) {
  o = o || {}; var W = 640, H = 230, L = 52, B = 26, T = 10, Rr = 10, iw = W - L - Rr, ih = H - T - B, fmt = o.fmt || n0;
  var max = niceMax(Math.max.apply(null, [1].concat(series.reduce(function (a, s) { return a.concat(s.data); }, [])))), g = '', gw = iw / Math.max(cats.length, 1), i;
  for (i = 0; i <= 4; i++) { var y = T + ih - ih * i / 4; g += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (L - 6) + '" y="' + (y + 3) + '" class="ax" text-anchor="end">' + short(max * i / 4) + '</text>'; }
  cats.forEach(function (c, ci) {
    var cx = L + gw * ci + gw / 2; if (ci % Math.ceil(cats.length / 12) === 0) { g += '<text x="' + cx + '" y="' + (H - 8) + '" class="ax" text-anchor="middle">' + esc(c) + '</text>'; }
    if (o.line) { return; }
    var bw = Math.min(30, gw * 0.8 / series.length);
    series.forEach(function (s, si) {
      var v = s.data[ci] || 0, h = ih * v / max, x = cx - bw * series.length / 2 + bw * si;
      g += '<rect x="' + x + '" y="' + (T + ih - h) + '" width="' + Math.max(bw - 2, 1) + '" height="' + Math.max(h, 0) + '" rx="2" fill="' + s.color + '" data-tip="' + esc(c + ' · ' + s.name + ': ' + fmt(v)) + '"' + (o.act ? ' data-act="' + o.act + '" data-k="' + esc(o.keys[ci]) + '"' : '') + '/>';
    });
  });
  if (o.line) {
    series.forEach(function (s) {
      var pts = s.data.map(function (v, ci) { return [L + gw * ci + gw / 2, T + ih - ih * (v || 0) / max]; });
      g += '<polyline fill="none" stroke="' + s.color + '" stroke-width="2.2" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>';
      pts.forEach(function (p, ci) { g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + s.color + '" data-tip="' + esc(cats[ci] + ' · ' + s.name + ': ' + fmt(s.data[ci] || 0)) + '"' + (o.act ? ' data-act="' + o.act + '" data-k="' + esc(o.keys[ci]) + '"' : '') + '/>'; });
    });
  }
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" dir="ltr" role="img">' + g + '</svg>' + legend(series);
}
function donut(items, o) {
  o = o || {}; var tot = items.reduce(function (a, i) { return a + i.v; }, 0), r = 54, c = 2 * Math.PI * r, off = 0, g = '';
  if (!tot) { return '<div class="empty">' + esc(t('No data')) + '</div>'; }
  items.forEach(function (it, i) {
    var len = c * it.v / tot; it.color = it.color || PAL[i % PAL.length];
    g += '<circle r="' + r + '" cx="75" cy="75" fill="none" stroke="' + it.color + '" stroke-width="24" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 75 75)" data-tip="' + esc(it.l + ': ' + (o.fmt || n0)(it.v) + ' (' + (100 * it.v / tot).toFixed(1) + '%)') + '"' + (it.act ? ' data-act="' + it.act + '" data-k="' + esc(it.k) + '"' : '') + '/>';
    off += len;
  });
  return '<div class="donutwrap"><svg viewBox="0 0 150 150" dir="ltr">' + g + '<text x="75" y="80" text-anchor="middle" font-size="13" font-weight="700" fill="#1b2430">' + short(tot) + '</text></svg><div class="legend" style="flex-direction:column;margin:0">' + items.map(function (i) { return '<span><i style="background:' + i.color + '"></i>' + esc(i.l) + ' — ' + (o.fmt || n0)(i.v) + '</span>'; }).join('') + '</div></div>';
}
function hbars(items, o) {
  o = o || {}; var max = Math.max.apply(null, [1].concat(items.map(function (i) { return i.v; })));
  if (!items.length) { return '<div class="empty">' + esc(t('No data')) + '</div>'; }
  return '<div class="bars">' + items.map(function (i, ix) {
    return '<button type="button" class="bar" data-act="' + (o.act || '') + '" data-k="' + esc(i.k) + '" data-tip="' + esc(i.l + ': ' + (o.fmt || n0)(i.v)) + '"><span class="lb">' + esc(i.l) + '</span><span class="tr"><span class="fill" style="display:block;width:' + Math.max(1.5, 100 * i.v / max) + '%;background:' + (i.color || PAL[ix % PAL.length]) + '"></span></span><span class="vl">' + (o.fmt || n0)(i.v) + '</span></button>';
  }).join('') + '</div>';
}

/* ---------- tables with sorting, pagination, CSV export ---------- */
function tbl(id, cols, rows, o) {
  o = o || {}; var st = TB[id] = TB[id] || { page: 1, sort: null, dir: 1 };
  st.cols = cols; st.rows = rows; st.o = o; if (o.resetPage) { st.page = 1; }
  return '<div class="tw" id="tw-' + id + '">' + tblInner(id) + '</div>';
}
function tblInner(id) {
  var st = TB[id], rows = st.rows.slice(), cols = st.cols, o = st.o, size = o.size || 25;
  if (st.sort != null) { var c = cols[st.sort]; rows.sort(function (a, b) { return cmp(c.s ? c.s(a) : a[c.k], c.s ? c.s(b) : b[c.k]) * st.dir; }); }
  var pages = Math.max(1, Math.ceil(rows.length / size)); if (st.page > pages) { st.page = pages; }
  var view = rows.slice((st.page - 1) * size, st.page * size); st.view = view;
  var h = '<div class="tbar"><span>' + n0(rows.length) + ' ' + esc(t('records')) + '</span>' + (o.name && rows.length ? '<button type="button" class="btn sm" data-act="export" data-k="' + id + '">⬇ ' + esc(t('Export CSV')) + '</button>' : '') + '</div>';
  if (!rows.length) { return h + '<div class="empty">' + esc(o.empty || t('No records found')) + '</div>'; }
  h += '<div class="scroll"><table><thead><tr>' + cols.map(function (c, i) { return '<th class="' + (c.n ? 'n' : '') + '" data-sort="' + id + '|' + i + '">' + esc(t(c.label)) + (st.sort === i ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
  view.forEach(function (r, vi) {
    h += '<tr' + (o.onRow ? ' data-row="' + id + '|' + vi + '"' : '') + '>' + cols.map(function (c) { return '<td class="' + (c.n ? 'n' : '') + '">' + (c.h ? c.h(r) : esc(c.f ? c.f(r[c.k], r) : (r[c.k] == null ? '' : r[c.k]))) + '</td>'; }).join('') + '</tr>';
  });
  h += '</tbody>';
  if (o.foot) { h += '<tfoot><tr>' + cols.map(function (c, i) { return '<td class="' + (c.n ? 'n' : '') + '">' + (i === 0 ? esc(t('Total')) : (o.foot[c.k] != null ? esc(c.f ? c.f(o.foot[c.k], o.foot) : o.foot[c.k]) : '')) + '</td>'; }).join('') + '</tr></tfoot>'; }
  h += '</table></div>';
  if (pages > 1) {
    var p = st.page, a = Math.max(1, p - 2), b = Math.min(pages, p + 2), btn = '';
    btn += '<button data-pg="' + id + '|' + (p - 1) + '"' + (p <= 1 ? ' disabled' : '') + '>‹</button>';
    if (a > 1) { btn += '<button data-pg="' + id + '|1">1</button>' + (a > 2 ? '<button disabled>…</button>' : ''); }
    for (var i = a; i <= b; i++) { btn += '<button class="' + (i === p ? 'on' : '') + '" data-pg="' + id + '|' + i + '">' + i + '</button>'; }
    if (b < pages) { btn += (b < pages - 1 ? '<button disabled>…</button>' : '') + '<button data-pg="' + id + '|' + pages + '">' + pages + '</button>'; }
    btn += '<button data-pg="' + id + '|' + (p + 1) + '"' + (p >= pages ? ' disabled' : '') + '>›</button>';
    h += '<div class="pager">' + btn + '</div>';
  }
  return h;
}
function tblRefresh(id) { var el = $('#tw-' + id); if (el) { el.innerHTML = tblInner(id); } }
function exportCSV(id) {
  var st = TB[id]; if (!st) { return; }
  var q = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var txt = '﻿' + [st.cols.map(function (c) { return q(t(c.label)); }).join(',')].concat(st.rows.map(function (r) { return st.cols.map(function (c) { return q(c.x ? c.x(r) : (c.s ? c.s(r) : r[c.k])); }).join(','); })).join('\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = (st.o.name || id) + '_' + today() + '.csv';
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 600);
}

/* ---------- UI helpers ---------- */
function kpi(l, v, s, o) { o = o || {}; return '<button type="button" class="kpi ' + (o.tone || '') + '" ' + (o.go ? 'data-go="' + o.go + '"' : 'disabled') + '><span class="kl">' + esc(t(l)) + '</span><span class="kv">' + v + '</span><span class="ks">' + (s || '&nbsp;') + '</span></button>'; }
function note(txt, cls) { return '<div class="note ' + (cls || '') + '">' + txt + '</div>'; }
function card(title, body, hint) { return '<div class="card"><h3>' + esc(t(title)) + '</h3>' + (hint ? '<p class="hint">' + esc(t(hint)) + '</p>' : '') + body + '</div>'; }
function seg(id, items, cur) { return '<div class="seg">' + items.map(function (i) { return '<button type="button" class="' + (i[0] === cur ? 'on' : '') + '" data-seg="' + id + '|' + i[0] + '">' + esc(t(i[1])) + '</button>'; }).join('') + '</div>'; }
function skeleton() { return '<div class="loadtxt">' + esc(t('Loading live data…')) + '</div><div class="skel"><i></i><i></i><i></i></div>'; }
function showErr(msg, where) { var b = $('#errBox'); b.hidden = false; b.innerHTML = '<b>' + esc(t('Could not load data')) + (where ? ' — ' + esc(t(where)) : '') + '</b>' + esc(msg) + ' <button type="button" class="btn sm" data-act="retry">' + esc(t('Retry')) + '</button>'; }
function hideErr() { $('#errBox').hidden = true; }
function failBox(r, what) { return note('<b>' + esc(t(what)) + '</b> — ' + esc(r.err) + ' (' + esc(t('check your ERPNext permissions')) + ')', 'bad'); }
function openModal(title, html) { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; $('#modal').hidden = false; $('#mBody').scrollTop = 0; }
function closeModal() { $('#modal').hidden = true; $('#mBody').innerHTML = ''; }
function stChip(s) { return s.docstatus === 0 ? chip(t('Draft / Not posted'), 'warn') : chip(t('Submitted'), 'ok'); }
function empLink(id) { return '<a href="#" data-emp="' + esc(id) + '">' + esc(ename(id)) + '</a> <span class="ks">' + esc(id) + '</span>'; }

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
  return '<div class="calnav"><button type="button" class="btn sm" data-act="calnav" data-k="-1">‹</button><span>' + esc(monthName(c.ym)) + '</span><button type="button" class="btn sm" data-act="calnav" data-k="1">›</button></div>' +
    '<div class="kpis" style="grid-template-columns:repeat(3,1fr)">' + kpi('Present', n1(cnt.P), '', { tone: 'ok' }) + kpi('Absent', n1(cnt.A), '', { tone: 'bad' }) + kpi('Approved leave', n1(cnt.L), '', {}) + '</div>' +
    '<div class="cal">' + cells + '</div><div class="legend">' + ['P', 'A', 'L', 'H', 'W', 'T'].map(function (k) { return '<span><i class="s-' + k + '" style="border:1px solid #ccc"></i>' + esc(t(ATTLAB[k])) + '</span>'; }).join('') + '</div><div id="calDetail" style="margin-top:10px">' + esc(t('Click a day to see punch details.')) + '</div>';
}
async function calDay(day) {
  var d = await empMonth(S.cal.id, S.cal.ym), ps = d.pe[day] || [], s = dayStat(d.e, day, d.pe, d.lm, today(), S.ui.att.mode);
  var h = '<h4>' + esc(day) + ' · ' + esc(wdNames()[dow(day)]) + ' — ' + esc(t(ATTLAB[s])) + '</h4>';
  if (!ps.length) { return h + '<div class="empty">' + esc(t('No punches recorded.')) + '</div>'; }
  return h + '<table><thead><tr><th>' + esc(t('Time')) + '</th><th>' + esc(t('Type')) + '</th><th>' + esc(t('Device')) + '</th></tr></thead><tbody>' + ps.map(function (p) { return '<tr><td>' + esc(hm(p.time)) + '</td><td>' + chip(p.log_type || '—', p.log_type === 'IN' ? 'ok' : 'info') + '</td><td>' + esc(p.custom_attendance_device || p.device_id || '') + '</td></tr>'; }).join('') + '</tbody></table>';
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
    if (F.company) { fl.push(['company', '=', F.company]); } if (F.branch) { fl.push(['branch', '=', F.branch]); } if (F.dept) { fl.push(['department', '=', F.dept]); }
    if (F.cc) {
      var pf = [['docstatus', '<', 2], ['start_date', '>=', startM], ['start_date', '<=', endD], ['cost_center', '=', F.cc]]; if (F.company) { pf.push(['company', '=', F.company]); }
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
      '<div class="kv2">' + [['Employee', d.employee + ' — ' + d.employee_name], ['Payroll Entry', d.payroll_entry || '—'], ['Cost Center (payroll entry)', pe.cost_center || '—'], ['Department', d.department || '—'], ['Branch', d.branch || '—'], ['Period', d.start_date + ' → ' + d.end_date], ['Status', d.docstatus === 0 ? t('Draft / Not posted') : d.docstatus === 1 ? t('Submitted') : t('Cancelled')], ['Payment Days', d.payment_days]].map(function (x) { return '<div><span>' + esc(t(x[0])) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' +
      '<div class="row2" style="margin-top:12px"><div class="card"><h4>' + esc(t('Earnings')) + '</h4><table><tbody>' + line(d.earnings || []) + '</tbody><tfoot><tr><td>' + esc(t('Gross')) + '</td><td class="n">' + n2(d.gross_pay) + '</td></tr></tfoot></table></div>' +
      '<div class="card"><h4>' + esc(t('Deductions')) + '</h4><table><tbody>' + line(d.deductions || []) + '</tbody><tfoot><tr><td>' + esc(t('Total Deductions')) + '</td><td class="n">' + n2(d.total_deduction) + '</td></tr><tr><td>' + esc(t('Net Pay')) + '</td><td class="n">' + n2(d.net_pay) + '</td></tr></tfoot></table></div></div>');
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
        '<div class="kv2">' + rows.map(function (x) { return '<div><span>' + esc(t(x[0])) + '</span><b>' + esc(x[1] || '—') + '</b></div>'; }).join('') + '</div>' +
        '<div class="kv2" style="margin-top:10px"><div><span>' + esc(t('Weekly off')) + '</span><b>' + esc(isSaudi(e) ? t('Friday + Saturday') : t('Friday')) + '</b></div></div>';
    } else if (tab === 'payroll') {
      var sl = await list('Salary Slip', ['name', 'employee', 'employee_name', 'start_date', 'end_date', 'docstatus', 'gross_pay', 'net_pay', 'total_deduction', 'payroll_entry'], [['employee', '=', id], ['docstatus', '<', 2]], { order: 'start_date desc', len: 36 });
      var pm = (await getPayroll()).peMap; sl.forEach(function (s) { s.cc = (pm[s.payroll_entry] && pm[s.payroll_entry].cost_center) || ''; });
      box.innerHTML = tbl('emslips', slipCols, sl, { name: 'employee_slips_' + id, size: 12, resetPage: true, onRow: function (r) { openSlip(r.name); }, empty: t('No salary slips (or no permission).') });
    } else if (tab === 'attendance') {
      box.innerHTML = '<div id="calBox"></div>'; $('#calBox').innerHTML = await calHtml();
    } else {
      var ap = await all('Leave Application', LV_FIELDS, [['employee', '=', id], ['docstatus', '<', 2], ['status', '!=', 'Cancelled']], { order: 'from_date desc', cap: 500 });
      var bal = await balances([id], today() < S.f.to ? today() : S.f.to);
      box.innerHTML = '<h4>' + esc(t('Leave balances')) + '</h4>' + tbl('embal', balCols, bal, { size: 10, name: 'leave_balance_' + id, resetPage: true }) + '<h4 style="margin-top:14px">' + esc(t('Leave applications')) + '</h4>' + tbl('emleaves', leaveCols, ap, { size: 10, name: 'leave_history_' + id, resetPage: true });
    }
  } catch (er) { box.innerHTML = note(esc(er.message), 'bad'); }
}
var balCols = [
  { k: 'name', label: 'Employee', h: function (r) { return empLink(r.emp); }, s: function (r) { return r.name; } }, { k: 'type', label: 'Leave Type' },
  { k: 'from', label: 'Period', f: function (v, r) { return r.from + ' → ' + r.to; } }, { k: 'alloc', label: 'Allocated', n: 1, f: n1 }, { k: 'taken', label: 'Taken', n: 1, f: n1 },
  { k: 'bal', label: 'Balance', n: 1, h: function (r) { return '<b class="' + (r.bal < 0 ? 'sev-high' : '') + '">' + n1(r.bal) + '</b>'; } }
];

/* ---------- tab renderers ---------- */
var RT = {};
var TLAB = { overview: 'Overview', cc: 'Cost Center Breakdown', register: 'Payroll Register', components: 'Salary Component Analysis', employees: 'Employees', attendance: 'Employee Attendance', leaves: 'Employee Leaves', trends: 'Monthly Trends', controls: 'Controls & Audit' };
function glByCC(rows) {
  var m = {}; rows.forEach(function (r) { var k = r.cost_center || '—'; var o = m[k] = m[k] || { cc: k, dr: 0, cr: 0, net: 0 }; o.dr += +r.debit || 0; o.cr += +r.credit || 0; o.net += (+r.debit || 0) - (+r.credit || 0); });
  return Object.keys(m).map(function (k) { return m[k]; });
}

RT.overview = async function () {
  var F = S.f, td = today(), latest = F.to < td ? F.to : td;
  var emps = await getEmployees();
  var r = await Promise.all([safe(getPayroll()), safe(getGL(F.from, F.to, true)), safe(attRaw(true)), safe(leaveNow()), safe(pendingCount()), safe(trendData())]);
  var pay = r[0], gl = r[1], att = r[2], lvn = r[3], pend = r[4], tr = r[5], h = '', k = '';
  var active = emps.filter(function (e) { return e.status === 'Active'; }).length;
  var sm = pay.ok ? sumSlips(pay.v.slips) : null, glNet = gl.ok ? gl.v.reduce(function (a, x) { return a + (+x.debit || 0) - (+x.credit || 0); }, 0) : null;
  if (sm && sm.dn) { h += note('<b>' + esc(t('Draft / Not posted payroll')) + ':</b> ' + n0(sm.dn) + ' ' + esc(t('slips')) + ' · ' + esc(t('Gross')) + ' ' + sar(sm.dg) + ' · ' + esc(t('Net Pay')) + ' ' + sar(sm.dnet) + '. ' + esc(t('Shown separately from posted payroll expense (GL), which is')) + ' ' + (glNet == null ? '—' : sar(glNet)) + ' ' + esc(t('for this period.'))); }
  [pay, gl, att, lvn, pend, tr].forEach(function (x, i) { if (!x.ok) { h += failBox(x, ['Payroll', 'GL expense', 'Attendance', 'Employees on leave', 'Pending leaves', 'Trends'][i]); } });
  var emN = pay.ok ? new Set(pay.v.slips.map(function (s) { return s.employee; })).size : 0, mo = null;
  if (tr.ok && tr.v.months.length > 1) { var mc = tr.v.months[tr.v.months.length - 1], mp = tr.v.months[tr.v.months.length - 2]; mo = { cur: mc, prev: mp, pct: mp.gross > 0 ? (mc.gross - mp.gross) / mp.gross * 100 : null }; }
  k += kpi('Total gross payroll', sm ? sar(sm.gross) : '—', sm ? n0(sm.n) + ' ' + t('slips') + ' · ' + t('Draft + submitted salary slips') : '', { go: 'register' });
  k += kpi('Total net pay', sm ? sar(sm.net) : '—', sm ? t('Total deductions') + ' ' + sar(sm.ded) : '', { go: 'register' });
  k += kpi('Cost per head (gross)', sm && emN ? sar(sm.gross / emN) : '—', sm ? n0(emN) + ' ' + t('employees paid') : '', { go: 'cc' });
  k += kpi('Month-on-month (gross)', mo && mo.pct != null ? (mo.pct > 0 ? '+' : '') + mo.pct.toFixed(1) + '%' : '—', mo ? (mo.pct != null ? monthName(mo.cur.m, true) + ' ' + n0(mo.cur.gross) + ' ' + t('vs previous month') + ' ' + monthName(mo.prev.m, true) + ' ' + n0(mo.prev.gross) : t('No previous month data')) : '', { tone: mo && mo.pct != null && mo.pct > 10 ? 'warn' : '', go: 'trends' });
  k += kpi('Active employees', n0(active), n0(emps.length) + ' ' + t('in selection'), { go: 'employees' });
  k += kpi('Draft payroll – gross (not posted)', sm ? sar(sm.dg) : '—', sm ? n0(sm.dn) + ' ' + t('slips') : '', { tone: 'warn', go: 'register|draft' });
  k += kpi('Draft payroll – net pay', sm ? sar(sm.dnet) : '—', t('Not posted'), { tone: 'warn', go: 'register|draft' });
  k += kpi('Posted payroll expense (GL)', glNet == null ? '—' : sar(glNet), t('Accrual journals in period') + (F.branch || F.dept || F.q ? ' · ' + t('Branch / Department / Search not applied') : ''), { tone: 'ok', go: 'cc' });
  k += kpi('Submitted slips – gross', sm ? sar(sm.sg) : '—', sm ? n0(sm.sn) + ' ' + t('slips') : '', { go: 'register|submitted' });
  if (att.ok && !att.v.empty) {
    var c = attCompute(att.v, S.ui.att.mode), dayOff = c.last.H > 0 && c.last.P + c.last.A + c.last.L === 0;
    k += kpi('Present', n0(c.last.P), latest + ' · ' + (dayOff ? t('Weekly off / holiday') : t('of') + ' ' + n0(c.elig) + ' ' + t('eligible')), { tone: 'ok', go: 'attendance' });
    k += kpi('Absent', n0(c.last.A), latest + (c.last.T ? ' · ' + n0(c.last.T) + ' ' + t('pending punch') : ''), { tone: 'bad', go: 'attendance|day' });
  } else { k += kpi('Present', '—', att.ok ? t('No days in range up to today') : '', { go: 'attendance' }); }
  k += kpi('On leave today', lvn.ok ? n0(lvn.v.length) : '—', t('Approved, submitted'), { tone: 'info', go: 'leaves|now' });
  k += kpi('Pending leave requests', pend.ok ? n0(pend.v) : '—', t('Status Open in period'), { tone: 'warn', go: 'leaves|pending' });
  h += '<div class="kpis">' + k + '</div>';
  h += '<p class="sub" style="margin:-6px 0 12px">' + esc(t('Totals include every non-cancelled Salary Slip overlapping the selected dates. To reconcile a month, set From / To to its first and last day.')) + '</p>';
  var g = pay.ok ? groupCC(pay.v.slips).sort(function (a, b) { return b.gross - a.gross; }).slice(0, 10) : [];
  var ch1 = pay.ok ? card('Gross payroll by cost center (payroll entry allocation)', hbars(g.map(function (x) { return { l: x.cc, v: x.gross, k: x.cc }; }), { act: 'cc', fmt: n0 }), 'Click a bar to list the salary slips') : '';
  var ch2 = sm ? card('Payroll status', donut([{ l: t('Draft / Not posted'), v: sm.dg, color: '#d98e04', act: 'status', k: 'draft' }, { l: t('Submitted'), v: sm.sg, color: '#0f9d6b', act: 'status', k: 'submitted' }], { fmt: n0 })) : '';
  h += '<div class="row2">' + ch1 + ch2 + '</div>';
  if (tr.ok) { h += card('Gross payroll – last 12 months', plot(tr.v.months.map(function (m) { return monthName(m.m, true); }), [{ name: t('Draft / Not posted'), color: '#d98e04', data: tr.v.months.map(function (m) { return m.dg; }) }, { name: t('Submitted'), color: '#0f9d6b', data: tr.v.months.map(function (m) { return m.sg; }) }], { act: 'month', keys: tr.v.months.map(function (m) { return m.m; }), fmt: n0 })); }
  return h;
};

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
  h += '<div class="kpis">' + kpi('Slips', n0(sm.n), '', {}) + kpi('Gross', sar(sm.gross), '', { tone: 'info' }) + kpi('Deductions', sar(sm.ded), '') + kpi('Net Pay', sar(sm.net), '', { tone: 'ok' }) + kpi('Draft / Not posted', sar(sm.dg), n0(sm.dn) + ' ' + t('slips'), { tone: 'warn', go: 'register|draft' }) + kpi('Submitted', sar(sm.sg), n0(sm.sn) + ' ' + t('slips'), { tone: 'ok', go: 'register|submitted' }) + '</div>';
  h += seg('reg|st', [['all', 'All'], ['draft', 'Draft / Not posted'], ['submitted', 'Submitted']], st);
  h += tbl('reg', slipCols.concat([{ k: 'department', label: 'Department' }, { k: 'branch', label: 'Branch' }]), rows, { name: 'payroll_register', size: 25, resetPage: true, onRow: function (r) { openSlip(r.name); }, foot: { gross_pay: sm.gross, total_deduction: sm.ded, net_pay: sm.net } });
  return h;
};

function rvSlipFilters() {
  var F = S.f, st = S.ui.cmp.st, fl = [['Salary Slip', 'start_date', '<=', F.to], ['Salary Slip', 'end_date', '>=', F.from], ['Salary Slip', 'docstatus', st === 'draft' ? '=' : st === 'submitted' ? '=' : '<', st === 'draft' ? 0 : st === 'submitted' ? 1 : 2]];
  if (F.company) { fl.push(['Salary Slip', 'company', '=', F.company]); } if (F.branch) { fl.push(['Salary Slip', 'branch', '=', F.branch]); } if (F.dept) { fl.push(['Salary Slip', 'department', '=', F.dept]); }
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
  h += '<div class="kpis">' + kpi('Total earnings (components)', sar(te), '', { tone: 'info' }) + kpi('Total deductions (components)', sar(td_), '') + kpi('Gross per salary slips', sar(sm.gross), n0(sm.n) + ' ' + t('slips')) + kpi('Reconciliation difference', sar(diff), Math.abs(diff) < 0.5 ? t('Components reconcile to slip gross') : t('Check statistical / non-counted components'), { tone: Math.abs(diff) < 0.5 ? 'ok' : 'bad' }) + '</div>';
  var cols = function (name) { return [{ k: 'comp', label: 'Salary Component' }, { k: 'n', label: 'Lines', n: 1, f: n0 }, { k: 'amt', label: 'Amount', n: 1, f: n2 }, { k: 'stat', label: 'Flags', h: function (r) { return (r.stat ? chip(t('Statistical'), 'info') : '') + (r.dni ? chip(t('Not in total'), 'warn') : ''); }, s: function (r) { return (r.stat ? 1 : 0) + (r.dni ? 1 : 0); } }]; };
  var top = function (a) { return a.filter(counted).sort(function (x, y) { return y.amt - x.amt; }).slice(0, 10).map(function (x) { return { l: x.comp, v: x.amt, k: x.pf + '|' + x.comp }; }); };
  h += '<div class="row2">' + card('Top earnings', hbars(top(earn), { act: 'comp' })) + card('Top deductions', hbars(top(ded), { act: 'comp', fmt: n0 })) + '</div>';
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
  var h = '<div class="kpis">' + kpi('Employees', n0(rows.length), '') + kpi('Active', n0(emps.filter(function (e) { return e.status === 'Active'; }).length), '', { tone: 'ok' }) + kpi('Saudi nationals', n0(rows.filter(isSaudi).length), '', {}) + kpi('Nationality conflicts', n0(rows.filter(natConflict).length), t('primary ≠ secondary field'), { tone: 'bad' }) + '</div>';
  h += '<div class="seg"><select class="sel" data-sel="emp|st">' + [['Active', 'Active'], ['Inactive', 'Inactive'], ['Left', 'Left'], ['all', 'All statuses']].map(function (o) { return '<option value="' + o[0] + '"' + (u.st === o[0] ? ' selected' : '') + '>' + esc(t(o[1])) + '</option>'; }).join('') + '</select>' +
    '<select class="sel" data-sel="emp|loc"><option value="">' + esc(t('All job locations')) + '</option>' + locs.map(function (l) { return '<option' + (u.loc === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select></div>';
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
  h += '<div class="kpis">' + kpi('Eligible employees', n0(c.elig), t('excl. Back Office & WFH'), {}) + kpi('Present', n0(c.last.P), raw.end, { tone: 'ok', go: 'attendance|day' }) + kpi('Absent', n0(c.last.A), raw.end + (c.last.T ? ' · ' + n0(c.last.T) + ' ' + t('pending punch') : ''), { tone: 'bad', go: 'attendance|day' }) + kpi('On approved leave', n0(c.last.L), raw.end, { tone: 'info' }) +
    kpi('Back Office – excluded', n0(c.bo), t('employees'), { tone: 'warn' }) + kpi('Work from home – excluded', n0(c.wfh), t('employees'), { tone: 'warn' }) + kpi('Nationality conflicts', n0(c.conflicts.length), t('primary ≠ secondary field'), { tone: 'bad', go: 'attendance|conf' }) + '</div>';
  h += '<div class="seg">' + [['sum', 'Employee summary'], ['day', 'Daily punch details'], ['conf', 'Nationality conflicts'], ['rules', 'Rules & limits']].map(function (x) { return '<button type="button" class="' + (u.sub === x[0] ? 'on' : '') + '" data-seg="att|sub|' + x[0] + '">' + esc(t(x[1])) + '</button>'; }).join('') +
    '<select class="sel" data-sel="att|mode"><option value="any"' + (u.mode === 'any' ? ' selected' : '') + '>' + esc(t('Count any punch')) + '</option><option value="in"' + (u.mode === 'in' ? ' selected' : '') + '>' + esc(t('Count IN punches only')) + '</option></select></div>';
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
    h += '<div class="seg"><input type="date" class="sel" min="' + raw.a + '" max="' + raw.end + '" value="' + day + '" data-sel="att|day"> ' + [['A', 'Absent'], ['P', 'Present'], ['L', 'Leave'], ['X', 'Excluded / off'], ['punch', 'All punches']].map(function (x) { return '<button type="button" class="' + (u.dv === x[0] ? 'on' : '') + '" data-seg="att|dv|' + x[0] + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div>';
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
  h += '<div class="kpis">' + kpi('Approved leaves', n0(d.appr.length), t('submitted applications'), { tone: 'ok', go: 'leaves|approved' }) + kpi('Leave days taken', n1(taken), t('de-duplicated, holidays & half-days applied'), { tone: 'info', go: 'leaves|types' }) + kpi('Pending leaves', n0(d.pend.length), '', { tone: 'warn', go: 'leaves|pending' }) + kpi('Rejected leaves', n0(d.rej.length), '', { tone: 'bad', go: 'leaves|rejected' }) + kpi('Employees currently on leave', r[0].ok ? n0(new Set(now.map(function (a) { return a.employee; })).size) : '—', today(), { tone: 'info', go: 'leaves|now' }) + '</div>';
  h += '<div class="seg">' + [['approved', 'Approved'], ['pending', 'Pending'], ['rejected', 'Rejected'], ['now', 'On leave now'], ['balances', 'Leave balances'], ['types', 'Leave type breakdown'], ['cal', 'Leave calendar']].map(function (x) { return '<button type="button" class="' + (u.sub === x[0] ? 'on' : '') + '" data-seg="lv|sub|' + x[0] + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div>';
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
    h += '<div class="row2">' + card('Approved leave days by type', donut(tr.filter(function (x) { return x.days > 0; }).map(function (x) { return { l: x.type, v: x.days }; }), { fmt: n1 })) + card('Applications by type', hbars(tr.map(function (x) { return { l: x.type, v: x.na + x.pend + x.rej, k: x.type }; }), {})) + '</div>';
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
  return '<div class="card"><div class="calnav"><button type="button" class="btn sm" data-act="lcalnav" data-k="-1">‹</button><span>' + esc(monthName(u.ym)) + '</span><button type="button" class="btn sm" data-act="lcalnav" data-k="1">›</button></div><div class="cal">' + cells + '</div><div id="lcalDetail" style="margin-top:10px">' + esc(t('Click a day to see who is on leave.')) + '</div></div>';
}
var LCAL = {};

RT.trends = async function () {
  var tr = await trendData(), m = tr.months, li = m.length - 1; while (li > 0 && !m[li].n) { li--; } var last = m[li], prev = m[li - 1], mom = prev && prev.gross ? 100 * (last.gross - prev.gross) / prev.gross : null;
  var h = '';
  if (!tr.glOk) { h += failBox({ err: tr.glErr }, 'GL expense'); }
  if (S.f.branch || S.f.dept || S.f.q) { h += note(esc(t('Branch, Department and Employee filters cannot be applied to GL entries (they carry no such fields).')), 'info'); }
  h += '<div class="kpis">' + kpi('Latest month gross', sar(last.gross), monthName(last.m), { go: 'register' }) + kpi('Month-on-month', mom == null ? '—' : (mom >= 0 ? '+' : '') + n1(mom) + '%', t('vs previous month'), { tone: mom > 0 ? 'warn' : 'ok' }) + kpi('12-month gross', sar(sum(m, 'gross')), '') + kpi('Average monthly gross', sar(sum(m, 'gross') / 12), '') + kpi('12-month posted GL expense', tr.glOk ? sar(sum(m, 'gl')) : '—', t('Accrual journals'), { tone: 'ok', go: 'cc' }) + '</div>';
  var cats = m.map(function (x) { return monthName(x.m, true); }), keys = m.map(function (x) { return x.m; });
  h += '<div class="row2">' + card('Gross payroll by status', plot(cats, [{ name: t('Draft / Not posted'), color: '#d98e04', data: m.map(function (x) { return x.dg; }) }, { name: t('Submitted'), color: '#0f9d6b', data: m.map(function (x) { return x.sg; }) }], { act: 'month', keys: keys })) + card('Gross vs Net vs Deductions', plot(cats, [{ name: t('Gross'), color: '#1f6feb', data: m.map(function (x) { return x.gross; }) }, { name: t('Net Pay'), color: '#10b981', data: m.map(function (x) { return x.net; }) }, { name: t('Deductions'), color: '#ef4444', data: m.map(function (x) { return x.ded; }) }], { line: true, act: 'month', keys: keys })) + '</div>';
  h += '<div class="row2">' + card('Submitted gross vs posted GL expense', plot(cats, [{ name: t('Submitted gross'), color: '#1f6feb', data: m.map(function (x) { return x.sg; }) }, { name: t('GL posted expense'), color: '#0f9d6b', data: m.map(function (x) { return x.gl; }) }], { act: 'month', keys: keys })) + card('Payslips per month', plot(cats, [{ name: t('Slips'), color: '#8b5cf6', data: m.map(function (x) { return x.n; }) }], { line: true, act: 'month', keys: keys })) + '</div>';
  h += tbl('trT', [{ k: 'm', label: 'Month', f: function (v) { return monthName(v); } }, { k: 'n', label: 'Slips', n: 1, f: n0 }, { k: 'dg', label: 'Draft gross (not posted)', n: 1, f: n2 }, { k: 'sg', label: 'Submitted gross', n: 1, f: n2 }, { k: 'gross', label: 'Gross', n: 1, f: n2 }, { k: 'ded', label: 'Deductions', n: 1, f: n2 }, { k: 'net', label: 'Net Pay', n: 1, f: n2 }, { k: 'gl', label: 'GL posted expense', n: 1, f: n2 }], m, { name: 'monthly_trends', size: 12, resetPage: true, onRow: function (x) { drillMonth(x.m); } });
  return h;
};
async function drillMonth(ym) {
  openModal(monthName(ym), skeleton());
  try {
    var F = S.f, fl = [['docstatus', '<', 2], ['start_date', '>=', ym + '-01'], ['start_date', '<=', monthEnd(ym + '-01')]];
    if (F.company) { fl.push(['company', '=', F.company]); } if (F.branch) { fl.push(['branch', '=', F.branch]); } if (F.dept) { fl.push(['department', '=', F.dept]); }
    var ids = await searchIds(); if (ids) { fl.push(['employee', 'in', ids.length ? ids : ['__none__']]); }
    var sl = await all('Salary Slip', ['name', 'employee', 'employee_name', 'start_date', 'end_date', 'docstatus', 'gross_pay', 'net_pay', 'total_deduction', 'payroll_entry'], fl, { order: 'employee_name asc' });
    var pes = uniq(sl.map(function (s) { return s.payroll_entry; }).filter(Boolean)), pm = {};
    if (pes.length) { (await all('Payroll Entry', ['name', 'cost_center'], [['name', 'in', pes]])).forEach(function (p) { pm[p.name] = p.cost_center; }); }
    sl.forEach(function (s) { s.cc = pm[s.payroll_entry] || ''; }); if (F.cc) { sl = sl.filter(function (s) { return s.cc === F.cc; }); }
    openSlips(monthName(ym), sl, 'mmonth');
  } catch (e) { openModal(monthName(ym), note(esc(e.message), 'bad')); }
}

RT.controls = async function () {
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
    add('lunsub', 'med', 'Leave approved but not submitted', 'Excluded from approved leave calculations.', d.unsub, leaveCols, function (x) { openEmp(x.employee, 'leaves'); });
    add('lopen', 'low', 'Pending leave older than 30 days', '', d.pend.filter(function (a) { return a.posting_date && diffDays(a.posting_date, td) > 30; }), leaveCols, function (x) { openEmp(x.employee, 'leaves'); });
    add('lov', 'med', 'Overlapping approved leaves (same employee)', 'Overlaps are de-duplicated in day counts.', uniq(ov.map(function (a) { return a.name; })).map(function (n) { return ov.filter(function (a) { return a.name === n; })[0]; }), leaveCols, function (x) { openEmp(x.employee, 'leaves'); });
    add('lmis', 'low', 'Stored leave days ≠ recalculated days', 'total_leave_days differs from the day count after Friday/Saturday/holiday and half-day rules.', mism, leaveCols.concat([{ k: 'calc', label: 'Recalculated', n: 1, f: n1 }]), function (x) { openEmp(x.employee, 'leaves'); });
  }
  var hlGap = hl.ok ? hl.v.filter(function (x) { return x.to_date < S.f.to; }) : [];
  add('hol', 'med', 'Holiday Lists do not cover the selected period', 'Lists end before the period; the Friday/Saturday rules are applied instead of listed holidays.', hlGap, [{ k: 'name', label: 'Holiday List' }, { k: 'from_date', label: 'From' }, { k: 'to_date', label: 'To' }]);
  var order = { high: 0, med: 1, low: 2 };
  checks.sort(function (a, b) { return (a.rows.length ? 0 : 1) - (b.rows.length ? 0 : 1) || order[a.sev] - order[b.sev]; });
  CHK = checks;
  var open = checks.filter(function (c) { return c.rows.length; });
  var h = '<div class="kpis">' + kpi('Checks run', n0(checks.length), '') + kpi('Open findings', n0(open.length), '', { tone: open.length ? 'warn' : 'ok' }) + kpi('High severity', n0(open.filter(function (c) { return c.sev === 'high'; }).length), '', { tone: 'bad' }) + kpi('Medium severity', n0(open.filter(function (c) { return c.sev === 'med'; }).length), '', { tone: 'warn' }) + '</div>';
  h += '<div class="card"><div class="scroll"><table><thead><tr><th>' + esc(t('Severity')) + '</th><th>' + esc(t('Control check')) + '</th><th class="n">' + esc(t('Findings')) + '</th><th></th></tr></thead><tbody>' + checks.map(function (c, i) {
    return '<tr><td>' + chip(t(c.sev === 'high' ? 'High' : c.sev === 'med' ? 'Medium' : 'Low'), c.rows.length ? (c.sev === 'high' ? 'bad' : c.sev === 'med' ? 'warn' : 'info') : 'ok') + '</td><td><b>' + esc(t(c.title)) + '</b><div class="ks">' + esc(t(c.desc)) + '</div></td><td class="n">' + (c.rows.length ? '<b class="sev-' + c.sev + '">' + n0(c.rows.length) + '</b>' : chip(t('OK'), 'ok')) + '</td><td>' + (c.rows.length ? '<button type="button" class="btn sm" data-act="chk" data-k="' + i + '">' + esc(t('View')) + '</button>' : '') + '</td></tr>';
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
var CHK = [];

/* ---------- Arabic translations (English text is the key) ---------- */
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

/* ---------- orchestration: render, navigation, filters ---------- */
var TOK = {};
async function render(tab, soft) {
  var v = S.ver, el = $('#p-' + tab), tk = TOK[tab] = (TOK[tab] || 0) + 1; S.rendered[tab] = v;
  if (!soft) { el.innerHTML = skeleton(); } hideErr();
  try {
    var html = await RT[tab]();
    if (v !== S.ver || tk !== TOK[tab]) { return; }
    el.innerHTML = html; $('#asof').textContent = t('Live data') + ' · ' + new Date().toLocaleTimeString();
  } catch (e) {
    if (v !== S.ver || tk !== TOK[tab]) { return; }
    S.rendered[tab] = -1; el.innerHTML = '<div class="empty">' + esc(t('Could not load data')) + '</div>'; showErr(e.message, TLAB[tab]);
  }
}
function setTab(tab) {
  S.tab = tab;
  $$('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
  TABS.forEach(function (x) { $('#p-' + x).hidden = x !== tab; });
  if (S.rendered[tab] !== S.ver) { render(tab); } else { hideErr(); }
}
function goTo(spec) {
  var p = spec.split('|'), tab = p[0], sub = p[1];
  if (tab === 'register' && sub) { S.ui.reg.st = sub; }
  if (tab === 'attendance' && sub) { S.ui.att.sub = sub; S.ui.att.dv = 'A'; }
  if (tab === 'leaves' && sub) { S.ui.lv.sub = sub; }
  S.rendered[tab] = -1; setTab(tab);
  var el = $('.tabs'); if (el && el.scrollIntoView) { el.scrollIntoView({ block: 'nearest' }); }
}
function readFilters() {
  S.f = { company: $('#fCompany').value, from: $('#fFrom').value, to: $('#fTo').value, cc: $('#fCC').value, branch: $('#fBranch').value, dept: $('#fDept').value, q: $('#fQ').value.trim() };
}
function fillSel(id, items, allLabel, keep) {
  var el = $('#' + id), cur = keep == null ? el.value : keep;
  el.innerHTML = '<option value="">' + esc(t(allLabel)) + '</option>' + items.map(function (i) { return '<option value="' + esc(i) + '"' + (i === cur ? ' selected' : '') + '>' + esc(i) + '</option>'; }).join('');
  el.value = items.indexOf(cur) >= 0 ? cur : '';
}
function paintOptions() {
  var o = S.opts; if (!o.companies) { return; }
  fillSel('fCompany', o.companies, 'All companies'); fillSel('fCC', o.ccs, 'All cost centers'); fillSel('fBranch', o.branches, 'All branches'); fillSel('fDept', o.depts, 'All departments');
}
async function loadOptions() {
  var comp = $('#fCompany').value, cf = comp ? [['company', '=', comp]] : [];
  var r = await Promise.all([list('Company', ['name'], [], { order: 'name asc', len: 200 }), list('Cost Center', ['name'], [['is_group', '=', 0], ['disabled', '=', 0]].concat(cf), { order: 'name asc', len: 2000 }), list('Branch', ['name'], [], { order: 'name asc', len: 500 }), list('Department', ['name'], [['is_group', '=', 0]].concat(cf), { order: 'name asc', len: 2000 })]);
  S.opts = { companies: r[0].map(function (x) { return x.name; }), ccs: r[1].map(function (x) { return x.name; }), branches: r[2].map(function (x) { return x.name; }), depts: r[3].map(function (x) { return x.name; }) };
  paintOptions();
}
function applyFilters() {
  readFilters();
  if (!S.f.from || !S.f.to || S.f.from > S.f.to) { showErr(t('From Date must be on or before To Date.'), ''); return; }
  S.ver++; render(S.tab);
}
function applyLang() {
  root.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr'); root.setAttribute('lang', S.lang);
  $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  $('#btnLang').textContent = S.lang === 'ar' ? 'English' : 'العربية'; paintOptions();
}
function rerenderModalSoft() { if (!$('#modal').hidden && $('#emBody')) { emTab(); } }

/* ---------- events ---------- */
var tipEl = $('#tip');
root.addEventListener('mouseover', function (ev) { var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) { tipEl.textContent = el.getAttribute('data-tip'); tipEl.hidden = false; } });
root.addEventListener('mousemove', function (ev) { if (!tipEl.hidden) { tipEl.style.left = Math.min(ev.clientX + 12, window.innerWidth - 290) + 'px'; tipEl.style.top = (ev.clientY + 14) + 'px'; } });
root.addEventListener('mouseout', function (ev) { if (ev.target.closest && ev.target.closest('[data-tip]')) { tipEl.hidden = true; } });
root.addEventListener('click', async function (ev) {
  if (ev.target.id === 'modal') { closeModal(); return; }
  var el = ev.target.closest('[data-tab],[data-go],[data-seg],[data-sort],[data-pg],[data-row],[data-emp],[data-act]'); if (!el || !root.contains(el)) { return; }
  var d = el.dataset;
  if (el.tagName === 'A') { ev.preventDefault(); }
  try {
    if (d.tab) { setTab(d.tab); }
    else if (d.go) { goTo(d.go); }
    else if (d.seg) {
      var p = d.seg.split('|');
      if (p[0] === 'em') { S.ui.em.tab = p[1]; await emTab(); return; }
      S.ui[p[0]][p[1]] = p[2]; if (p[0] === 'att' && p[1] === 'sub') { S.ui.att.dv = S.ui.att.dv || 'A'; } render(S.tab, true);
    }
    else if (d.sort) { var s = d.sort.split('|'), st = TB[s[0]]; st.dir = st.sort === +s[1] ? -st.dir : 1; st.sort = +s[1]; tblRefresh(s[0]); }
    else if (d.pg) { var q = d.pg.split('|'); TB[q[0]].page = +q[1]; tblRefresh(q[0]); }
    else if (d.row) { var r = d.row.split('|'), tb = TB[r[0]]; tb.o.onRow(tb.view[+r[1]]); }
    else if (d.emp) { openEmp(d.emp); }
    else if (d.act) {
      var a = d.act, k = d.k;
      if (a === 'export') { exportCSV(k); }
      else if (a === 'retry') { S.ver++; render(S.tab); }
      else if (a === 'cc') { drillCC(k); }
      else if (a === 'status') { goTo('register|' + k); }
      else if (a === 'month') { drillMonth(k); }
      else if (a === 'comp') { var cp = k.split('|'); drillComp(cp[0], cp.slice(1).join('|')); }
      else if (a === 'calnav') { S.cal.ym = addMonths(S.cal.ym + '-01', +k).slice(0, 7); $('#calBox').innerHTML = skeleton(); $('#calBox').innerHTML = await calHtml(); }
      else if (a === 'calday') { $('#calDetail').innerHTML = await calDay(k); }
      else if (a === 'lcalnav') { S.ui.lv.ym = addMonths(S.ui.lv.ym + '-01', +k).slice(0, 7); render('leaves', true); }
      else if (a === 'lcalday') {
        var l = LCAL[k] || [];
        $('#lcalDetail').innerHTML = '<h4>' + esc(k) + '</h4>' + (l.length ? '<table><tbody>' + l.map(function (x) { return '<tr><td>' + empLink(x.emp) + '</td><td>' + esc(x.type) + '</td><td class="n">' + (x.f < 1 ? '½' : '1') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">' + esc(t('Nobody on leave.')) + '</div>');
      }
      else if (a === 'attday') { S.ui.att.sub = 'day'; S.ui.att.day = k; S.ui.att.dv = 'A'; render('attendance', true); }
      else if (a === 'chk') { var c = CHK[+k]; openModal(t(c.title), tbl('chk' + k, c.cols, c.rows, { name: c.id, size: 15, resetPage: true, onRow: c.onRow })); }
    }
  } catch (e) { showErr(e.message, ''); }
});
root.addEventListener('change', function (ev) {
  var el = ev.target.closest('[data-sel]'); if (!el) { return; }
  var p = el.getAttribute('data-sel').split('|'); S.ui[p[0]][p[1]] = el.value; render(S.tab, true);
});
$('#mClose').addEventListener('click', closeModal);
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && root.isConnected && !$('#modal').hidden) { closeModal(); } });
$('#btnApply').addEventListener('click', applyFilters);
$('#fQ').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { applyFilters(); } });
$('#btnReset').addEventListener('click', function () { setDefaults(); readFilters(); S.ver++; loadOptions().then(function () { render(S.tab); }); });
$('#btnRefresh').addEventListener('click', function () {
  cache.clear(); EMP = {}; HOL = {}; readFilters(); S.ver++;
  loadOptions().then(function () { render(S.tab); }, function (e) { showErr(e.message, ''); });
});
$('#btnLang').addEventListener('click', function () {
  var nl = S.lang === 'ar' ? 'en' : 'ar'; var lb = this; lb.disabled = true; frappe.xcall('frappe.client.set_value', {doctype: 'User', name: frappe.session.user, fieldname: 'language', value: nl}).then(function () { location.reload(); }).catch(function () { lb.disabled = false; });
});
$('#fCompany').addEventListener('change', async function () { $('#fCC').value = ''; $('#fDept').value = ''; try { await loadOptions(); } catch (e) { showErr(e.message, ''); } });

function setDefaults() {
  var td = today(); $('#fFrom').value = monthStart(addMonths(td, -1)); $('#fTo').value = td;
  ['fCompany', 'fCC', 'fBranch', 'fDept'].forEach(function (id) { $('#' + id).value = ''; }); $('#fQ').value = '';
}
(async function init() {
  /* lang-sync 2026-11-15 (Phase 1E): ERP User.language is the source of truth */ S.lang = (window.frappe && frappe.boot && frappe.boot.lang === 'ar') ? 'ar' : 'en';
  setDefaults(); readFilters(); applyLang(); setTab('overview');
  try { await loadOptions(); } catch (e) { showErr(e.message, 'Filters'); }
})();
})();