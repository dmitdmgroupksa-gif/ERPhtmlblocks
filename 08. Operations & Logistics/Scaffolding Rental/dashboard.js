(function () {
'use strict';
var R = (typeof root_element !== 'undefined' && root_element) ? root_element : document;

/* Repair only this block's own transient Frappe widget heading. No Workspace record is changed. */
function repairBlockHeading(blockRoot,label){
  if(!blockRoot)return;
  var shadow=blockRoot.getRootNode?blockRoot.getRootNode():blockRoot;
  var host=blockRoot.host||(shadow&&shadow.host);
  var widget=host&&host.closest?host.closest('.custom-block-widget-box'):null;
  var heading=widget&&widget.querySelector('.widget-head .widget-title');
  if(heading&&['','undefined','null'].indexOf(heading.textContent.trim())!==-1){heading.textContent=label;heading.setAttribute('title',label);}
}
repairBlockHeading(R, 'Scaffolding Rental — Employee Dashboard');

/* The Custom HTML Block's HTML section is left BLANK: the whole DOM is built here inside root_element. */
var HOST = (R && R.querySelector) ? R : document.body;
var old0 = HOST.querySelector('#dmemp-root'); if (old0) { old0.remove(); }
var ROOT = document.createElement('div'); ROOT.id = 'dmemp-root'; ROOT.className = 'dmemp-app';
ROOT.innerHTML = '<div class="dmemp-welcome dmemp-ttlbar"><h2 id="dmemp-title"></h2><div class="dmemp-card-s" id="dmemp-sub" style="max-width:none;white-space:normal"></div></div>'
  + '<div class="dmemp-top"><div class="dmemp-tabs" id="dmemp-tabs" role="tablist"></div><div class="dmemp-meta"><span class="dmemp-live" id="dmemp-live"></span><span id="dmemp-upd"></span>'
  + '<label class="dmemp-auto"><input type="checkbox" id="dmemp-auto"><span id="dmemp-autol"></span></label>'
  + '<button type="button" class="dmemp-refresh" id="dmemp-refresh" aria-label="Refresh">&#8635;</button><button type="button" class="dmemp-lang" id="dmemp-lang"></button></div></div>'
  + '<section class="dmemp-filters" id="dmemp-filters" aria-label="Filters"></section><main class="dmemp-view" id="dmemp-view" aria-live="polite"></main><footer class="dmemp-foot" id="dmemp-foot"></footer>';
HOST.appendChild(ROOT);
var AUTOT = null;

/* ---------- i18n ---------- */
var I18N = { en: {}, ar: {} };
function K(k, e, a) { I18N.en[k] = e; I18N.ar[k] = a; }
var S = { lang: 'en', tab: null, f: {}, drill: null, ctx: {}, lv: {} };
var epoch = 0, uid = 0, cache = {}, loadedAt = null;
try { var _l = localStorage.getItem('dmemp-lang'); if (_l === 'ar' || _l === 'en') { S.lang = _l; } } catch (e0) {}
function t(k, v) {
  var s = I18N[S.lang][k]; if (s === undefined) { s = I18N.en[k]; } if (s === undefined) { s = k; }
  if (v) { for (var x in v) { s = s.split('{' + x + '}').join(v[x]); } }
  return s;
}
function st(v) { var s = I18N[S.lang]['st_' + v]; return s !== undefined ? s : (v === null || v === undefined ? '' : v); }
K('loading', 'Loading…', 'جاري التحميل…'); K('empty', 'No records found.', 'لا توجد سجلات.');
K('error', 'Error', 'خطأ'); K('retry', 'Retry', 'إعادة المحاولة'); K('back', 'Back', 'رجوع');
K('search', 'Search…', 'بحث…'); K('records', 'records', 'سجل'); K('prev', 'Previous', 'السابق'); K('next', 'Next', 'التالي');
K('showing', 'Showing {a}–{b} of {n}', 'عرض {a}–{b} من {n}'); K('export', 'Export CSV', 'تصدير CSV');
K('exported', 'Exported {n} of {total} records.', 'تم تصدير {n} من {total} سجل.');
K('trunc', 'Export limited to the first {cap} records (partially loaded).', 'التصدير محدود بأول {cap} سجل (تحميل جزئي).');
K('unavailable', 'Unavailable', 'غير متاح'); K('refresh', 'Refresh', 'تحديث'); K('all', 'All', 'الكل');
K('from', 'Date From', 'من تاريخ'); K('to', 'Date To', 'إلى تاريخ'); K('docstatus', 'Document Status', 'حالة المستند');
K('st_Draft', 'Draft', 'مسودة'); K('st_Submitted', 'Submitted', 'مقدّم'); K('st_Cancelled', 'Cancelled', 'ملغى');
K('st_Open', 'Open', 'مفتوح'); K('st_Completed', 'Completed', 'مكتمل'); K('st_Working', 'Working', 'قيد العمل');
K('st_Pending Review', 'Pending Review', 'بانتظار المراجعة'); K('st_Overdue', 'Overdue', 'متأخر'); K('st_Template', 'Template', 'قالب');
K('st_Approved', 'Approved', 'موافق عليه'); K('st_Rejected', 'Rejected', 'مرفوض'); K('st_Present', 'Present', 'حاضر');
K('st_Absent', 'Absent', 'غائب'); K('st_On Leave', 'On Leave', 'في إجازة'); K('st_Half Day', 'Half Day', 'نصف يوم');
K('st_Work From Home', 'Work From Home', 'عمل من المنزل'); K('st_Closed', 'Closed', 'مغلق');
K('st_To Receive and Bill', 'To Receive and Bill', 'للاستلام والفوترة'); K('st_To Bill', 'To Bill', 'للفوترة');
K('st_To Receive', 'To Receive', 'للاستلام'); K('st_Pending', 'Pending', 'قيد الانتظار');
K('st_Partially Ordered', 'Partially Ordered', 'مطلوب جزئياً'); K('st_Ordered', 'Ordered', 'تم الطلب');
K('st_Stopped', 'Stopped', 'متوقف'); K('st_Received', 'Received', 'مستلم'); K('st_On Hold', 'On Hold', 'معلّق');
K('st_In Maintenance', 'In Maintenance', 'قيد الصيانة'); K('st_Out of Order', 'Out of Order', 'معطّل');
K('st_Partially Depreciated', 'Partially Depreciated', 'مستهلك جزئياً'); K('st_Fully Depreciated', 'Fully Depreciated', 'مستهلك بالكامل');
K('st_Sold', 'Sold', 'مباع'); K('st_Scrapped', 'Scrapped', 'مخرّد'); K('st_Issue', 'Issue', 'صرف'); K('st_Receipt', 'Receipt', 'استلام');
K('st_Capitalized', 'Capitalized', 'مرسمل'); K('st_Decapitalized', 'Decapitalized', 'غير مرسمل');
K('st_In Progress', 'In Progress', 'قيد التنفيذ');
K('foot_ro', 'Read-only dashboard. All data is loaded live from ERPNext and limited by your own permissions.', 'لوحة للقراءة فقط. تُحمَّل البيانات مباشرة من ERPNext وتخضع لصلاحياتك.');
K('loaded_at', 'Last loaded', 'آخر تحميل'); K('partial', 'Partially loaded: only the first {n} records were read.', 'تحميل جزئي: تمت قراءة أول {n} سجل فقط.');
K('auto5', 'Auto 5 min', 'تحديث كل 5 دقائق'); K('upd', 'Updated {t}', 'آخر تحديث {t}');
K('lang_btn', 'العربية', 'English');
K('open_doc', 'Open', 'فتح'); K('total', 'Total', 'الإجمالي');

/* ---------- utils ---------- */
function $(s, el) { return (el || ROOT).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || ROOT).querySelectorAll(s)); }
function esc(v) { if (v === null || v === undefined) { return ''; } return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function slug(dt) { try { return frappe.router.slug(dt); } catch (e) { return String(dt).toLowerCase().replace(/[^a-z0-9]+/g, '-'); } }
function docUrl(dt, name) { return '/app/' + slug(dt) + '/' + encodeURIComponent(name); }
function link(dt, name) { return name ? '<a class="dmemp-lnk" target="_blank" rel="noopener" href="' + esc(docUrl(dt, name)) + '">' + esc(name) + '</a>' : ''; }
function n(v, d) { if (v === null || v === undefined || v === '') { return '—'; } var x = Number(v); if (!isFinite(x)) { return '—'; } return x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d }); }
function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
var TODAY = (function () { try { return frappe.datetime.get_today(); } catch (e) { return iso(new Date()); } })();
function addDays(s, k) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + k); return iso(d); }
function monthStart(s) { return s.slice(0, 8) + '01'; }
function monthEnd(s) { return iso(new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)), 0)); }
function addMonths(s, k) { var d = new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1 + k, 1); return iso(d); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
function dstr(v) { return v ? String(v).slice(0, 10) : ''; }
function tstr(v) { return v ? String(v).slice(11, 16) : ''; }
function errText(e) {
  try {
    var j = e && (e.responseJSON || e);
    if (j && j._server_messages) { var m = JSON.parse(j._server_messages); return m.map(function (x) { try { return JSON.parse(x).message; } catch (_) { return x; } }).join(' ').replace(/<[^>]+>/g, '').slice(0, 300); }
    if (j && j.exc_type) { return j.exc_type; }
    if (e && e.status === 403) { return 'Permission denied (403)'; }
    if (e && e.message) { return e.message; }
    if (e && e.statusText) { return e.statusText; }
  } catch (_) {}
  return 'Request failed';
}
function sum(arr, f) { var s = 0; arr.forEach(function (r) { s += Number(f(r)) || 0; }); return s; }
function group(rows, kf) { var o = {}; rows.forEach(function (r) { var k = kf(r); (o[k] = o[k] || []).push(r); }); return o; }
function chunk(a, k) { var o = []; for (var i = 0; i < a.length; i += k) { o.push(a.slice(i, i + k)); } return o; }
function uniq(a) { var o = {}; a.forEach(function (x) { if (x !== null && x !== undefined && x !== '') { o[x] = 1; } }); return Object.keys(o); }

/* ---------- API (client-side, permission-checked, read-only) ---------- */
var inflight = 0, queue = [], MAXPAR = 4;
function pump() { while (inflight < MAXPAR && queue.length) { (function (j) { inflight++; j.fn().then(function (r) { inflight--; j.res(r); pump(); }, function (e) { inflight--; j.rej(e); pump(); }); })(queue.shift()); } }
function sched(fn) { return new Promise(function (res, rej) { queue.push({ fn: fn, res: res, rej: rej }); pump(); }); }
function rpc(method, args) {
  return new Promise(function (res, rej) {
    frappe.call({ method: method, args: args, type: 'POST', freeze: false, no_spinner: true, silent: true, callback: function (r) { res(r.message); }, error: function (x) { rej(x); } });
  });
}
function retry(fn, tries) {
  return fn().catch(function (e) {
    var denied = e && (e.status === 403 || e.status === 404 || (e.responseJSON && e.responseJSON.exc_type === 'PermissionError'));
    if (tries > 0 && !denied) { return new Promise(function (r) { setTimeout(r, 400); }).then(function () { return retry(fn, tries - 1); }); }
    throw e;
  });
}
function cached(key, fn) {
  if (!cache[key]) { cache[key] = sched(function () { return retry(fn, 1); }); cache[key].catch(function () { delete cache[key]; }); }
  return cache[key];
}
function memo(key, fn) { if (!cache[key]) { cache[key] = fn(); cache[key].catch(function () { delete cache[key]; }); } return cache[key]; }
function gl(dt, o) {
  o = o || {};
  var a = { doctype: dt, fields: o.fields || ['name'], filters: o.filters || [], limit_start: o.start || 0, limit_page_length: o.limit === undefined ? 20 : o.limit };
  if (o.or && o.or.length) { a.or_filters = o.or; }
  if (o.order) { a.order_by = o.order; }
  if (o.group) { a.group_by = o.group; }
  if (o.parent) { a.parent = o.parent; }
  return cached('gl|' + JSON.stringify(a), function () { return rpc('frappe.client.get_list', a); }).then(function (r) { return r || []; });
}
function cnt(dt, o) { o = o || {}; return gl(dt, { fields: ['count(name) as c'], filters: o.filters, or: o.or, parent: o.parent, limit: 1 }).then(function (r) { return (r[0] && r[0].c) || 0; }); }
function sumf(dt, field, o) { o = o || {}; return gl(dt, { fields: ['sum(' + field + ') as s'], filters: o.filters, or: o.or, parent: o.parent, limit: 1 }).then(function (r) { return (r[0] && Number(r[0].s)) || 0; }); }
function grp(dt, field, o) { o = o || {}; return gl(dt, { fields: [field + ' as k', 'count(name) as c'], filters: o.filters, or: o.or, parent: o.parent, group: field, limit: 500 }).then(function (r) { var m = {}; r.forEach(function (x) { m[x.k === null ? '' : x.k] = x.c; }); return m; }); }
function call(method, args) { return cached('rpc|' + method + '|' + JSON.stringify(args), function () { return rpc(method, args); }); }
/* load up to cap rows in pages of 500; returns {rows,total,truncated} */
function fetchAll(dt, o, cap) {
  cap = cap || 5000; o = o || {};
  return cnt(dt, o).then(function (total) {
    var pages = [], lim = Math.min(total, cap);
    for (var s = 0; s < lim; s += 500) { pages.push(s); }
    return Promise.all(pages.map(function (s) { return gl(dt, { fields: o.fields, filters: o.filters, or: o.or, order: o.order, parent: o.parent, start: s, limit: Math.min(500, lim - s) }); })).then(function (ps) {
      var rows = []; ps.forEach(function (p) { rows = rows.concat(p); });
      return { rows: rows, total: total, truncated: total > cap };
    });
  });
}
var NONE = ['__none__'];

/* ---------- status colours ---------- */
var CAT = { g: ['Completed', 'Approved', 'Present', 'Submitted', 'Closed', 'Received', 'Paid', 'Delivered'], b: ['Working', 'In Progress', 'On Leave', 'Work From Home', 'To Receive and Bill', 'Partially Depreciated', 'Receipt', 'Ordered'], y: ['Open', 'Pending', 'Pending Review', 'Draft', 'Partially Ordered'], o: ['Half Day', 'To Bill', 'To Receive', 'In Maintenance'], r: ['Overdue', 'Rejected', 'Absent', 'Out of Order', 'Critical'], n: ['Cancelled', 'Template', 'On Hold', 'Stopped', 'Fully Depreciated', 'Sold', 'Scrapped'] };
function cat(s) { for (var k in CAT) { if (CAT[k].indexOf(s) >= 0) { return k; } } return 'n'; }
function pill(label, c) { return '<span class="dmemp-pill dmemp-p-' + (c || 'n') + '">' + esc(label) + '</span>'; }
function spill(s, c) { return s ? pill(st(s), c || cat(s)) : ''; }
function dpill(ds) { var m = { 0: ['Draft', 'y'], 1: ['Submitted', 'g'], 2: ['Cancelled', 'n'] }[ds]; return m ? pill(st(m[0]), m[1]) : ''; }
function pbar(v, c) { v = Math.max(0, Math.min(100, Number(v) || 0)); return '<div class="dmemp-pb"><i style="width:' + v + '%;background:' + (c || 'var(--royal)') + '"></i></div><span class="dmemp-pbv">' + n(v, 0) + '%</span>'; }

/* ---------- charts (plain HTML/SVG, no external libs) ---------- */
function hbars(items, d) {
  if (!items.length) { return '<div class="dmemp-empty">' + esc(t('empty')) + '</div>'; }
  var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
  return '<div class="dmemp-hb">' + items.map(function (i) { return '<div class="dmemp-hr"><span class="dmemp-hl" title="' + esc(i.l) + '">' + esc(i.l) + '</span><span class="dmemp-ht"><i style="width:' + (i.v / max * 100) + '%;background:' + (i.c || 'var(--royal)') + '"></i></span><b>' + n(i.v, d) + '</b></div>'; }).join('') + '</div>';
}
function donut(items) {
  var tot = sum(items, function (i) { return i.v; });
  if (!tot) { return '<div class="dmemp-empty">' + esc(t('empty')) + '</div>'; }
  var off = 25, segs = '', leg = '';
  items.forEach(function (i) { if (!i.v) { return; } var p = i.v / tot * 100; segs += '<circle r="15.9155" cx="18" cy="18" fill="none" stroke="' + i.c + '" stroke-width="5" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + off + '"></circle>'; off -= p; });
  items.forEach(function (i) { leg += '<li><i style="background:' + i.c + '"></i>' + esc(i.l) + ' <b>' + n(i.v, 0) + '</b></li>'; });
  return '<div class="dmemp-dn"><svg viewBox="0 0 36 36" role="img">' + segs + '<text x="18" y="19.5" text-anchor="middle" class="dmemp-dnt">' + n(tot, 0) + '</text></svg><ul>' + leg + '</ul></div>';
}
/* stacked columns: cols=[{l, parts:[{v,c,l}]}] */
function colchart(cols) {
  if (!cols.length) { return '<div class="dmemp-empty">' + esc(t('empty')) + '</div>'; }
  var max = Math.max.apply(null, cols.map(function (c) { return sum(c.parts, function (p) { return p.v; }); }).concat([1]));
  var legend = {}; var h = '<div class="dmemp-cc">';
  cols.forEach(function (c) {
    var tot = sum(c.parts, function (p) { return p.v; });
    h += '<div class="dmemp-cl" title="' + esc(c.l + ': ' + c.parts.map(function (p) { return p.l + ' ' + n(p.v); }).join(', ')) + '"><div class="dmemp-cs" style="height:' + (tot / max * 100) + '%">';
    c.parts.forEach(function (p) { legend[p.l] = p.c; if (p.v) { h += '<i style="flex:' + p.v + ';background:' + p.c + '"></i>'; } });
    h += '</div><span>' + esc(c.l) + '</span></div>';
  });
  h += '</div><ul class="dmemp-lg">' + Object.keys(legend).map(function (k) { return '<li><i style="background:' + legend[k] + '"></i>' + esc(k) + '</li>'; }).join('') + '</ul>';
  return h;
}
var COL = { g: '#16a34a', b: '#2b4fc1', y: '#eab308', o: '#ed8930', r: '#dc2626', n: '#94a3b8', l: '#60a5fa' };

/* ---------- async panel helper ---------- */
var SKEL = '<div class="dmemp-sk"></div>';
function errBox(e) { return '<div class="dmemp-err"><b>' + esc(t('error')) + ':</b> ' + esc(errText(e)) + ' <button class="dmemp-btn dmemp-sm" data-retry="1">' + esc(t('retry')) + '</button></div>'; }
function fill(el, my, load, render) {
  var run = function () {
    el.innerHTML = SKEL;
    load().then(function (d) { if (my !== epoch) { return; } el.innerHTML = render(d); }, function (e) {
      if (my !== epoch) { return; } el.innerHTML = errBox(e); var b = el.querySelector('[data-retry]'); if (b) { b.onclick = run; }
    });
  };
  run();
}
function panel(title, cls) { var id = 'p' + (++uid); return { id: id, html: '<section class="dmemp-card ' + (cls || '') + '"><div class="dmemp-card-h"><div class="dmemp-card-t">' + esc(t(title)) + '</div></div><div class="dmemp-card-b" data-pid="' + id + '"></div></section>' }; }
function pel(p) { return ROOT.querySelector('[data-pid="' + p.id + '"]'); }
function note(key) { return '<div class="dmemp-note">' + esc(t(key)) + '</div>'; }


var ICONS = {
 chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
 clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2', cal: 'M3 6h18v15H3zM3 10h18M8 2v4M16 2v4', check: 'M20 6 9 17l-5-5',
 alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0', box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
 truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18.5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4', money: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
 file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
 folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z'
};
function guessIco(l) {
  l = String(l).toLowerCase();
  var m = [[/leave|holiday|date|calendar|day/, 'cal'], [/hour|time|late|early|attend|overtime/, 'clock'], [/overdue|delay|risk|issue|alert|late|block|escal/, 'alert'], [/employee|manpower|worker|staff|team|assign|user/, 'users'],
    [/deliver|dispatch|vehicle|fleet|transport|return/, 'truck'], [/cost|budget|amount|revenue|invoice|payment|margin|commit|outstanding|value|finance|bill|price|total/, 'money'],
    [/material|stock|item|quantity|qty|asset|equipment|order|po\b|purchase|request/, 'box'], [/task|todo|progress|complete|approved|done/, 'check'], [/quot|report|doc|note/, 'file'], [/project|site/, 'folder']];
  for (var i = 0; i < m.length; i++) { if (m[i][0].test(l)) { return m[i][1]; } } return 'chart';
}
function ico(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICONS[k] || ICONS.chart) + '"/></svg>'; }

/* ---------- KPI cards ---------- */
function kpis(el, my, defs) {
  el.innerHTML = defs.map(function (d, i) {
    var un = !!d.unavail, click = !!d.spec && !un, tn = d.tone || 'blue', ik = d.ico || guessIco(d.label + ' ' + (d.spec ? '' : ''));
    return '<div class="dmemp-kpi dmemp-tone-' + tn + (click ? ' click' : ' dmemp-static') + '" data-i="' + i + '"' + (click ? ' tabindex="0" role="button"' : '') + '><div class="dmemp-kpi-ico">' + ico(ik) + '</div><div class="dmemp-kpi-body"><div class="dmemp-kpi-l">' + esc(t(d.label)) + '</div><div class="dmemp-kpi-v">' + (un ? '<span class="dmemp-na">' + esc(t('unavailable')) + '</span>' : '<div class="dmemp-sk dmemp-sk-v"></div>') + '</div><div class="dmemp-kpi-s">' + (un ? esc(t(d.unavail)) : '') + '</div></div></div>';
  }).join('');
  $$('.dmemp-kpi', el).forEach(function (card) {
    var d = defs[Number(card.getAttribute('data-i'))];
    if (d.unavail) { return; }
    if (d.spec) { var go = function () { openDrill(d); }; card.onclick = go; card.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; }
    d.load().then(function (r) {
      if (my !== epoch) { return; }
      card.querySelector('.dmemp-kpi-v').innerHTML = r.html !== undefined ? r.html : esc(r.fmt !== undefined ? r.fmt : n(r.v, r.d));
      card.querySelector('.dmemp-kpi-s').textContent = r.sub || '';
      if (r.tone) { card.className = card.className.replace(/dmemp-tone-\w+/, 'dmemp-tone-' + r.tone); }
    }, function (e) {
      if (my !== epoch) { return; }
      card.querySelector('.dmemp-kpi-v').innerHTML = '<span class="dmemp-na">' + esc(t('error')) + '</span>'; card.querySelector('.dmemp-kpi-s').textContent = errText(e);
      card.classList.add('dmemp-static'); card.classList.remove('click'); card.onclick = null; card.onkeydown = null;
    });
  });
}
function openDrill(d) { S.drill = { tk: d.label, mk: d.spec, tab: S.tab }; renderView(); }

/* ---------- list view: search + pagination + CSV (server-side or static rows) ---------- */
function csvCell(v) { v = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function downloadCsv(name, spec, rows) {
  var head = spec.cols.map(function (c) { return csvCell(t(c.h)); }).join(',');
  var body = rows.map(function (r) { return spec.cols.map(function (c) { return csvCell(c.c(r)); }).join(','); }).join('\r\n');
  var blob = new Blob(['﻿' + head + '\r\n' + body], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '_' + TODAY + '.csv'; ROOT.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function listView(el, my, spec) {
  if (spec.rowsP && !spec.rows) {
    el.innerHTML = SKEL;
    spec.rowsP().then(function (r) { if (my !== epoch) { return; } spec.rows = r; listView(el, my, spec); }, function (e) { if (my !== epoch) { return; } el.innerHTML = errBox(e); var b = el.querySelector('[data-retry]'); if (b) { b.onclick = function () { listView(el, my, spec); }; } });
    return;
  }
  var st0 = S.lv[spec.id] || (S.lv[spec.id] = { page: 0, q: '', size: 20 });
  var isStatic = !!spec.rows;
  el.innerHTML = '<div class="dmemp-tb"><input type="search" class="dmemp-in dmemp-q" placeholder="' + esc(t('search')) + '" value="' + esc(st0.q) + '"><span class="dmemp-cnt"></span><span class="dmemp-sp"></span><select class="dmemp-in dmemp-sz">' + [20, 50, 100].map(function (s) { return '<option' + (s === st0.size ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><button class="dmemp-btn dmemp-ex">' + esc(t('export')) + '</button></div><div class="dmemp-msg"></div><div class="dmemp-tw"></div><div class="dmemp-pgr"></div>';
  var tw = $('.dmemp-tw', el), pg = $('.dmemp-pgr', el), cn = $('.dmemp-cnt', el), msg = $('.dmemp-msg', el);
  function qf() {
    var f = (spec.filters || []).slice(), or = spec.or;
    if (st0.q && spec.search && spec.search.length) {
      if (or && or.length) { f.push([spec.search[0], 'like', '%' + st0.q + '%']); }
      else { or = spec.search.map(function (s) { return [s, 'like', '%' + st0.q + '%']; }); }
    }
    return { f: f, or: or };
  }
  function srows() {
    var rows = spec.rows;
    if (st0.q) { var q = st0.q.toLowerCase(); rows = rows.filter(function (r) { return spec.cols.some(function (c) { return String(c.c(r) === null || c.c(r) === undefined ? '' : c.c(r)).toLowerCase().indexOf(q) >= 0; }); }); }
    return rows;
  }
  function table(rows) {
    if (!rows.length) { return '<div class="dmemp-empty">' + esc(t('empty')) + '</div>'; }
    return '<table class="dmemp-tbl"><thead><tr>' + spec.cols.map(function (c) { return '<th' + (c.num ? ' class="dmemp-num"' : '') + '>' + esc(t(c.h)) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + spec.cols.map(function (c) { return '<td' + (c.num ? ' class="dmemp-num"' : '') + ' data-l="' + esc(t(c.h)) + '">' + (c.f ? c.f(r) : esc(c.c(r))) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function pager(total) {
    var a = total ? st0.page * st0.size + 1 : 0, b = Math.min(total, (st0.page + 1) * st0.size), last = Math.max(0, Math.ceil(total / st0.size) - 1);
    pg.innerHTML = '<span>' + esc(t('showing', { a: n(a, 0), b: n(b, 0), n: n(total, 0) })) + '</span><span class="dmemp-sp"></span><button class="dmemp-btn dmemp-sm" data-pp="-1"' + (st0.page <= 0 ? ' disabled' : '') + '>' + esc(t('prev')) + '</button><button class="dmemp-btn dmemp-sm" data-pp="1"' + (st0.page >= last ? ' disabled' : '') + '>' + esc(t('next')) + '</button>';
    $$('[data-pp]', pg).forEach(function (b2) { b2.onclick = function () { st0.page += Number(b2.getAttribute('data-pp')); load(); }; });
    cn.textContent = n(total, 0) + ' ' + t('records');
  }
  function load() {
    tw.innerHTML = SKEL;
    if (isStatic) { var rows = srows(); tw.innerHTML = table(rows.slice(st0.page * st0.size, (st0.page + 1) * st0.size)); pager(rows.length); return; }
    var q = qf();
    Promise.all([cnt(spec.dt, { filters: q.f, or: q.or, parent: spec.parent }), gl(spec.dt, { fields: spec.fields, filters: q.f, or: q.or, order: spec.order, start: st0.page * st0.size, limit: st0.size, parent: spec.parent })]).then(function (r) {
      if (my !== epoch) { return; }
      var rows = spec.post ? spec.post(r[1]) : r[1];
      Promise.resolve(rows).then(function (rows2) { if (my !== epoch) { return; } tw.innerHTML = table(rows2); pager(r[0]); }, function (e) { if (my !== epoch) { return; } tw.innerHTML = errBox(e); });
    }, function (e) { if (my !== epoch) { return; } tw.innerHTML = errBox(e); var b = tw.querySelector('[data-retry]'); if (b) { b.onclick = load; } });
  }
  var timer = null;
  $('.dmemp-q', el).oninput = function (ev) { var v = ev.target.value; clearTimeout(timer); timer = setTimeout(function () { st0.q = v.trim(); st0.page = 0; load(); }, 350); };
  $('.dmemp-sz', el).onchange = function (ev) { st0.size = Number(ev.target.value); st0.page = 0; load(); };
  $('.dmemp-ex', el).onclick = function () {
    msg.textContent = t('loading');
    if (isStatic) { var rows = srows(); downloadCsv(spec.id, spec, rows); msg.textContent = t('exported', { n: n(rows.length, 0), total: n(rows.length, 0) }); return; }
    var q = qf();
    fetchAll(spec.dt, { fields: spec.fields, filters: q.f, or: q.or, order: spec.order, parent: spec.parent }, 5000).then(function (r) {
      var rows = spec.post ? spec.post(r.rows) : r.rows;
      return Promise.resolve(rows).then(function (rows2) { downloadCsv(spec.id, spec, rows2); msg.textContent = t('exported', { n: n(rows2.length, 0), total: n(r.total, 0) }) + (r.truncated ? ' ' + t('trunc', { cap: 5000 }) : ''); });
    }, function (e) { msg.textContent = t('error') + ': ' + errText(e); });
  };
  load();
}

/* ---------- chrome: header, filters, tabs, drill ---------- */
function renderChrome() {
  ROOT.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr'); ROOT.setAttribute('lang', S.lang);
  $('#dmemp-title').textContent = t('title'); $('#dmemp-sub').textContent = t('subtitle');
  $('#dmemp-lang').textContent = t('lang_btn'); $('#dmemp-refresh').title = t('refresh'); $('#dmemp-autol').textContent = t('auto5');
  ROOT.classList.toggle('dmemp-rtl', S.lang === 'ar');
  renderFilters(); renderTabs(); setUpd();
}
function renderFilters() {
  var h = '';
  APP.filters.forEach(function (f) {
    var v = S.f[f.k] === undefined ? '' : S.f[f.k], inner = '';
    if (f.type === 'select') {
      var opts = typeof f.opts === 'function' ? f.opts() : f.opts;
      inner = '<select class="dmemp-in" data-f="' + f.k + '"' + (f.ro ? ' disabled' : '') + '>' + opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(v) ? ' selected' : '') + '>' + esc(o.lk ? t(o.lk) : o.l) + '</option>'; }).join('') + '</select>';
    } else { inner = '<input class="dmemp-in" data-f="' + f.k + '" type="' + (f.type === 'date' ? 'date' : 'text') + '" value="' + esc(v) + '"' + (f.ro ? ' disabled' : '') + (f.ph ? ' placeholder="' + esc(t(f.ph)) + '"' : '') + '>'; }
    h += '<div class="dmemp-fc"><label>' + esc(t(f.lbl)) + '</label>' + inner + '</div>';
  });
  $('#dmemp-filters').innerHTML = h;
  var tm = null;
  $$('[data-f]', $('#dmemp-filters')).forEach(function (inp) {
    var go = function () { S.f[inp.getAttribute('data-f')] = inp.value; S.lv = {}; renderView(); };
    if (inp.tagName === 'INPUT' && inp.type === 'text') { inp.oninput = function () { clearTimeout(tm); tm = setTimeout(go, 500); }; } else { inp.onchange = go; }
  });
}
function renderTabs() {
  $('#dmemp-tabs').innerHTML = APP.tabs.map(function (tb) { return '<button class="dmemp-tab' + (S.tab === tb.id ? ' on' : '') + '" role="tab" data-tab="' + tb.id + '">' + esc(t(tb.label)) + '</button>'; }).join('');
  $$('[data-tab]', $('#dmemp-tabs')).forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-tab'); S.drill = null; renderTabs(); renderView(); }; });
}
function renderDrill(v, my) {
  var d = S.drill;
  v.innerHTML = '<div class="dmemp-drillh"><button class="dmemp-btn" id="dmemp-back">← ' + esc(t('back')) + '</button><h2>' + esc(t(d.tk)) + '</h2></div><div class="dmemp-card"><div class="dmemp-card-b" id="dmemp-dl"></div></div></div>';
  $('#dmemp-back').onclick = function () { S.drill = null; renderView(); };
  if (d.render) { d.render($('#dmemp-dl'), my); } else { listView($('#dmemp-dl'), my, d.mk()); }
}
function currentTab() { return APP.tabs.filter(function (x) { return x.id === S.tab; })[0] || APP.tabs[0]; }
function renderView() {
  var my = ++epoch, v = $('#dmemp-view');
  v.innerHTML = SKEL;
  Promise.resolve().then(function () { return APP.prepare(); }).then(function () {
    if (my !== epoch) { return; }
    v.innerHTML = ''; loadedAt = new Date();
    if (S.drill) { renderDrill(v, my); } else { currentTab().render(v, my); }
    $('#dmemp-foot').textContent = t('foot_ro') + ' — ' + t('loaded_at') + ': ' + loadedAt.toLocaleTimeString('en-GB'); setUpd();
  }, function (e) { if (my !== epoch) { return; } v.innerHTML = errBox(e); var b = v.querySelector('[data-retry]'); if (b) { b.onclick = renderView; } });
}
function setUpd() { var u = $('#dmemp-upd'); if (u) { u.textContent = loadedAt ? t('upd', { t: loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }) : ''; } }
function applyTheme() { try { var m = document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme-mode'); ROOT.classList.toggle('dmemp-dark', m === 'dark'); } catch (e) {} }
function boot() {
  applyTheme(); try { new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] }); } catch (e1) {}
  $('#dmemp-auto').onchange = function (ev) { clearInterval(AUTOT); if (ev.target.checked) { AUTOT = setInterval(function () { if (!document.hidden && !S.drill) { cache = {}; S.lv = {}; S.ctx = {}; renderView(); } }, 300000); } };
  $('#dmemp-lang').onclick = function () { S.lang = S.lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('dmemp-lang', S.lang); } catch (e) {} renderChrome(); renderView(); };
  $('#dmemp-refresh').onclick = function () { cache = {}; S.lv = {}; S.ctx = {}; renderView(); };
  S.tab = APP.tabs[0].id; renderChrome();
  Promise.resolve().then(function () { return APP.init ? APP.init() : null; }).then(function () { renderFilters(); renderView(); }, function () { renderFilters(); renderView(); });
}

/* =====================================================================
   SCAFFOLDING RENTAL – EMPLOYEE DASHBOARD  (application layer)
   ===================================================================== */
K('title', 'Scaffolding Rental – Employee Dashboard', 'لوحة موظف تأجير السقالات');
K('subtitle', 'Your attendance, leave, tasks and rental work in one place', 'حضورك وإجازاتك ومهامك وأعمال التأجير في مكان واحد');
K('no_emp', 'No Employee record is linked to your user account (Employee.user_id). Ask HR to link it. Personal data is never shown without this link.', 'لا يوجد سجل موظف مرتبط بحساب المستخدم الخاص بك (Employee.user_id). اطلب من الموارد البشرية ربطه. لا تُعرض البيانات الشخصية دون هذا الربط.');
K('welcome', 'Welcome, {name}', 'مرحباً، {name}');
K('f_emp', 'Employee (locked to you)', 'الموظف (مقفل على حسابك)'); K('f_project', 'Project / Site', 'المشروع / الموقع');
K('f_customer', 'Customer', 'العميل'); K('f_taskst', 'Task Status', 'حالة المهمة'); K('f_attst', 'Attendance Status', 'حالة الحضور');
K('ph_contains', 'contains…', 'يحتوي…');
K('tab_ov', 'My Overview', 'نظرة عامة'); K('tab_att', 'Attendance & Working Hours', 'الحضور وساعات العمل'); K('tab_lv', 'Leave Management', 'إدارة الإجازات');
K('tab_tk', 'My Tasks & Responsibilities', 'مهامي ومسؤولياتي'); K('tab_rt', 'Rental Operations', 'عمليات التأجير'); K('tab_dp', 'Equipment Dispatch & Returns', 'صرف المعدات وإرجاعها'); K('tab_rp', 'My Reports', 'تقاريري');
/* column headers */
K('c_id', 'Document', 'المستند'); K('c_date', 'Date', 'التاريخ'); K('c_emp', 'Employee', 'الموظف'); K('c_in', 'Check-in', 'وقت الدخول'); K('c_out', 'Check-out', 'وقت الخروج');
K('c_hours', 'Working Hours', 'ساعات العمل'); K('c_late', 'Late Entry', 'تأخر'); K('c_early', 'Early Exit', 'خروج مبكر'); K('c_status', 'Status', 'الحالة'); K('c_shift', 'Shift', 'الوردية');
K('c_ltype', 'Leave Type', 'نوع الإجازة'); K('c_from', 'From', 'من'); K('c_to', 'To', 'إلى'); K('c_days', 'Days', 'الأيام'); K('c_appst', 'Approval Status', 'حالة الموافقة');
K('c_approver', 'Approver', 'المعتمد'); K('c_remarks', 'Remarks', 'ملاحظات'); K('c_subject', 'Subject', 'الموضوع'); K('c_project', 'Project', 'المشروع');
K('c_by', 'Assigned By', 'أُسندت بواسطة'); K('c_prio', 'Priority', 'الأولوية'); K('c_start', 'Start Date', 'تاريخ البدء'); K('c_end', 'Expected End', 'الانتهاء المتوقع');
K('c_done', 'Completion Date', 'تاريخ الإنجاز'); K('c_prog', 'Progress', 'التقدم'); K('c_over', 'Overdue Days', 'أيام التأخير'); K('c_hrs', 'Total Hours', 'إجمالي الساعات');
K('c_type', 'Document Type', 'نوع المستند'); K('c_cust', 'Customer', 'العميل'); K('c_site', 'Project / Site (text)', 'المشروع / الموقع (نص)'); K('c_total', 'Total', 'الإجمالي');
K('c_disp', 'Dispatch Date', 'تاريخ الصرف'); K('c_item', 'Item Code', 'رمز الصنف'); K('c_iname', 'Item Name', 'اسم الصنف'); K('c_qty', 'Quantity', 'الكمية'); K('c_uom', 'UOM', 'وحدة القياس');
K('c_docs', 'Documents', 'المستندات'); K('c_party', 'Customer / Supplier', 'العميل / المورد'); K('c_lm', 'Line Manager', 'المدير المباشر'); K('c_desig', 'Designation', 'المسمى الوظيفي');
K('c_alloc', 'Allocated', 'المخصص'); K('c_taken', 'Taken', 'المستخدم'); K('c_remain', 'Remaining', 'المتبقي'); K('c_pend', 'Pending approval', 'بانتظار الموافقة');
/* KPI labels */
K('k_empinfo', 'Employee', 'الموظف'); K('k_today', "Today's Attendance", 'حضور اليوم'); K('k_present', 'Present Days', 'أيام الحضور'); K('k_absent', 'Absent Days', 'أيام الغياب');
K('k_late', 'Late Arrivals', 'مرات التأخر'); K('k_early', 'Early Checkouts', 'خروج مبكر'); K('k_hours', 'Total Working Hours', 'إجمالي ساعات العمل'); K('k_pct', 'Attendance %', 'نسبة الحضور');
K('k_attreq', 'Pending Attendance Requests', 'طلبات حضور معلقة'); K('k_onleave', 'On-Leave Days', 'أيام الإجازة'); K('k_halfday', 'Half Days', 'أنصاف الأيام');
K('k_bal', 'Available Leave Balance', 'رصيد الإجازات المتاح'); K('k_taken', 'Leave Taken (range)', 'الإجازات المستخدمة (الفترة)'); K('k_lpend', 'Pending Leave Applications', 'طلبات إجازة معلقة');
K('k_lup', 'Approved Upcoming Leaves', 'إجازات معتمدة قادمة'); K('k_lrej', 'Rejected Leave Applications', 'طلبات إجازة مرفوضة');
K('k_tasks', 'Assigned Tasks', 'المهام المسندة'); K('k_tdone', 'Completed Tasks', 'المهام المكتملة'); K('k_tpend', 'Pending Tasks', 'المهام المعلقة'); K('k_tover', 'Overdue Tasks', 'المهام المتأخرة');
K('k_proj', 'Active Projects / Site Assignments', 'المشاريع / المواقع النشطة'); K('k_appr', 'Leave Approvals Assigned to Me', 'موافقات إجازات مسندة إليّ'); K('k_dtm', 'Daily Task Logs (range)', 'سجلات المهام اليومية (الفترة)'); K('k_ts', 'Timesheets (range)', 'سجلات الوقت (الفترة)');
K('k_rq', 'Rental Quotations', 'عروض أسعار التأجير'); K('k_rdn', 'Rental Delivery Notes', 'إشعارات تسليم التأجير'); K('k_rsi', 'Rental Sales Invoices', 'فواتير مبيعات التأجير'); K('k_rpo', 'Rental Purchase Orders', 'أوامر شراء التأجير');
K('k_rpend', 'Pending Rental Transactions (Draft)', 'معاملات تأجير معلقة (مسودة)'); K('k_disp', 'Equipment Dispatched (submitted)', 'المعدات المصروفة (مقدّمة)'); K('k_dpdraft', 'Dispatch Notes in Draft', 'إشعارات صرف مسودة');
K('k_active', 'Active Rentals', 'عقود التأجير النشطة'); K('k_await', 'Equipment Awaiting Return', 'معدات بانتظار الإرجاع'); K('k_overret', 'Overdue Returns', 'مرتجعات متأخرة'); K('k_retqty', 'Returned Quantity', 'الكمية المرتجعة'); K('k_outqty', 'Outstanding Quantity', 'الكمية المتبقية');
K('na_return', 'The rental DocTypes have no return date, returned-quantity or return-status fields, so this cannot be calculated.', 'لا توجد في مستندات التأجير حقول تاريخ الإرجاع أو الكمية المرتجعة أو حالة الإرجاع، لذا لا يمكن احتسابه.');
K('na_balance', 'Leave balance could not be read from the HR API.', 'تعذّر قراءة رصيد الإجازات.');
K('na_req', 'Attendance Request data is not accessible.', 'بيانات طلبات الحضور غير متاحة.');
/* panels */
K('p_profile', 'Employee Profile', 'بطاقة الموظف'); K('p_month', 'Attendance Summary (selected range)', 'ملخص الحضور (الفترة المحددة)'); K('p_taskprog', 'Task Completion Progress', 'تقدم إنجاز المهام');
K('p_deadl', 'Upcoming Deadlines', 'المواعيد القادمة'); K('p_overd', 'Overdue Tasks', 'المهام المتأخرة'); K('p_rentals', 'Recent Rental Documents Assigned to Me', 'أحدث مستندات التأجير المسندة إليّ');
K('p_act', 'Recent Activity', 'النشاط الأخير'); K('p_hol', 'Upcoming Holidays', 'العطلات القادمة'); K('p_cal', 'Monthly Attendance Calendar', 'تقويم الحضور الشهري');
K('p_daily', 'Daily Attendance', 'الحضور اليومي'); K('p_trend', 'Monthly Attendance Trend', 'اتجاه الحضور الشهري'); K('p_lbal', 'Leave Balance by Leave Type', 'رصيد الإجازات حسب النوع');
K('p_lup', 'Upcoming Approved Leaves', 'الإجازات المعتمدة القادمة'); K('p_lpend', 'Pending Applications', 'الطلبات المعلقة'); K('p_lhist', 'Leave History', 'سجل الإجازات'); K('p_ldist', 'Monthly Leave Distribution (approved days)', 'توزيع الإجازات شهرياً (أيام معتمدة)');
K('p_active', 'My Active Tasks', 'مهامي النشطة'); K('p_completed', 'Completed Tasks', 'المهام المكتملة'); K('p_projs', 'Project Assignments', 'تكليفات المشاريع'); K('p_ts', 'Timesheet Entries', 'سجلات الوقت'); K('p_dtm', 'Daily Task Log (Daily Task Management)', 'سجل المهام اليومية');
K('p_alltasks', 'All My Tasks', 'جميع مهامي'); K('p_rdocs', 'Rental Documents Linked to Me', 'مستندات التأجير المرتبطة بي'); K('p_dhist', 'Dispatch History (Rental Delivery Notes)', 'سجل الصرف (إشعارات تسليم التأجير)');
K('p_ditems', 'Dispatched Items', 'الأصناف المصروفة'); K('p_itemsum', 'Item-wise Summary (per UOM, never mixed)', 'ملخص حسب الصنف (لكل وحدة قياس على حدة)'); K('p_custsum', 'Customer-wise Summary', 'ملخص حسب العميل');
K('p_unav', 'Not available in this ERP', 'غير متاح في هذا النظام');
K('n_unav_list', 'Not tracked by the rental DocTypes (no field exists): Expected Return Date, Actual Return Date, Returned Quantity, Outstanding Quantity, Warehouse, Rental Status, Equipment Awaiting Return, Overdue Returns. These are therefore NOT shown and never estimated.', 'غير متتبَّعة في مستندات التأجير (لا يوجد حقل): تاريخ الإرجاع المتوقع والفعلي، الكمية المرتجعة والمتبقية، المستودع، حالة التأجير، المعدات بانتظار الإرجاع، المرتجعات المتأخرة. لذلك لا تُعرض ولا يتم تقديرها.');
K('n_link', 'Rental documents are linked to you only through the Employee fields "From" and "Prepared By" (Rental Sales Invoice: "Prepared By"; Rental Purchase Order and Rental Quotation likewise).', 'ترتبط مستندات التأجير بك فقط عبر حقلي "From" و"Prepared By" (فاتورة مبيعات التأجير: "Prepared By").');
K('n_tasks', 'Tasks are linked to you through ToDo assignments (allocated_to = your user), not through the task owner. The Task Status filter applies to the task tables; KPI cards always cover all your tasks in the selected project.', 'ترتبط المهام بك عبر تكليفات ToDo (allocated_to = مستخدمك) وليس عبر مالك المهمة. يطبَّق مرشح الحالة على الجداول، أما البطاقات فتشمل كل مهامك في المشروع المحدد.');
K('n_hours', 'Working hours exist only on attendance rows that carry them; coverage is shown on the card.', 'ساعات العمل متوفرة فقط في سجلات الحضور التي تحتويها؛ وتظهر التغطية على البطاقة.');
K('n_att', 'Attendance counts include submitted records up to today only. Attendance % = (Present + Work From Home + ½ × Half Day) ÷ (Present + Work From Home + Half Day + Absent). On-Leave days are excluded from the denominator.', 'يشمل العدّ سجلات الحضور المقدّمة حتى اليوم فقط. النسبة = (حاضر + عمل من المنزل + ½ نصف يوم) ÷ (حاضر + عمل من المنزل + نصف يوم + غائب). تُستثنى أيام الإجازة.');
K('n_bal', 'Leave balance is read from the HR app (get_leave_details) for today. The total card adds remaining days across leave types; see the per-type cards for exact balances.', 'يُقرأ الرصيد من تطبيق الموارد البشرية لليوم. تجمع البطاقة الإجمالية الأيام المتبقية لكل الأنواع؛ راجع البطاقات التفصيلية.');
K('no_att_today', 'Not marked yet', 'لم يُسجَّل بعد'); K('none_hol', 'No upcoming holidays found (or Holiday List not accessible).', 'لا توجد عطلات قادمة (أو قائمة العطلات غير متاحة).');
K('ret_na', 'Overdue rental returns: Unavailable (no return tracking fields in ERP).', 'المرتجعات المتأخرة: غير متاح (لا توجد حقول تتبع الإرجاع).');
K('coverage', '{a} of {b} present days have recorded hours', '{a} من {b} يوم حضور لها ساعات مسجلة');
K('rep_att', 'Monthly attendance report', 'تقرير الحضور الشهري'); K('rep_lv', 'Leave summary', 'ملخص الإجازات'); K('rep_tk', 'Task completion report', 'تقرير إنجاز المهام'); K('rep_rent', 'Assigned rental transactions', 'معاملات التأجير المسندة');
K('rep_disp', 'Equipment dispatch summary', 'ملخص صرف المعدات'); K('rep_ret', 'Equipment return summary', 'ملخص إرجاع المعدات'); K('rep_out', 'Outstanding rental assignments', 'تكليفات التأجير المتبقية'); K('rep_over', 'Overdue task report', 'تقرير المهام المتأخرة');
K('open_report', 'Open report', 'فتح التقرير'); K('prevm', '‹ Previous month', '‹ الشهر السابق'); K('nextm', 'Next month ›', 'الشهر التالي ›');
K('dt_Rental Quotation', 'Rental Quotation', 'عرض سعر تأجير'); K('dt_Rental Delivery Note', 'Rental Delivery Note', 'إشعار تسليم تأجير'); K('dt_Rental Sales Invoice', 'Rental Sales Invoice', 'فاتورة مبيعات تأجير'); K('dt_Rental Purchase Order', 'Rental Purchase Order', 'أمر شراء تأجير');
K('dt_Leave Application', 'Leave Application', 'طلب إجازة'); K('dt_Task', 'Task', 'مهمة'); K('dt_Daily Task Management', 'Daily Task Management', 'إدارة المهام اليومية');
K('hdr_rnote', 'Statuses are document states (Draft / Submitted / Cancelled); the rental DocTypes have no separate rental-status field.', 'الحالات هي حالات المستند (مسودة / مقدّم / ملغى)؛ لا يوجد حقل حالة تأجير مستقل.');
K('st_Not marked', 'Not marked', 'غير مسجل');

var APP = { filters: [], tabs: [] };
var ATT_ST = ['Present', 'Absent', 'On Leave', 'Half Day', 'Work From Home'];
APP.filters = [
  { k: 'emp', type: 'select', lbl: 'f_emp', ro: true, opts: function () { var e = S.ctx.emp; return e ? [{ v: e.name, l: e.name }] : [{ v: '', l: '—' }]; } },
  { k: 'from', type: 'date', lbl: 'from' }, { k: 'to', type: 'date', lbl: 'to' },
  { k: 'project', type: 'select', lbl: 'f_project', opts: function () { return [{ v: '', lk: 'all' }].concat((S.ctx.projOpts || []).map(function (p) { return { v: p.name, l: p.name + (p.project_name ? ' – ' + p.project_name : '') }; })); } },
  { k: 'customer', type: 'text', lbl: 'f_customer', ph: 'ph_contains' },
  { k: 'taskst', type: 'select', lbl: 'f_taskst', opts: function () { return [{ v: '', lk: 'all' }].concat(['Open', 'Working', 'Pending Review', 'Overdue', 'Completed', 'Cancelled'].map(function (s) { return { v: s, lk: 'st_' + s }; })); } },
  { k: 'attst', type: 'select', lbl: 'f_attst', opts: function () { return [{ v: '', lk: 'all' }].concat(ATT_ST.map(function (s) { return { v: s, lk: 'st_' + s }; })); } },
  { k: 'ds', type: 'select', lbl: 'docstatus', opts: function () { return [{ v: '', lk: 'all' }, { v: '0', lk: 'st_Draft' }, { v: '1', lk: 'st_Submitted' }, { v: '2', lk: 'st_Cancelled' }]; } }
];
APP.tabs = [
  { id: 'ov', label: 'tab_ov', render: tabOverview }, { id: 'att', label: 'tab_att', render: tabAttendance }, { id: 'lv', label: 'tab_lv', render: tabLeave },
  { id: 'tk', label: 'tab_tk', render: tabTasks }, { id: 'rt', label: 'tab_rt', render: tabRental }, { id: 'dp', label: 'tab_dp', render: tabDispatch }, { id: 'rp', label: 'tab_rp', render: tabReports }
];

/* ---------- context: employee (from user), assigned tasks, projects ---------- */
function loadCtx() {
  return gl('Employee', { fields: ['name', 'employee_name', 'designation', 'department', 'branch', 'reports_to', 'status', 'company', 'holiday_list', 'image'], filters: [['user_id', '=', frappe.session.user]], limit: 1 }).then(function (r) {
    var e = r[0] || null; S.ctx.emp = e; S.ctx.todos = []; S.ctx.taskNames = []; S.ctx.projOpts = [];
    if (!e) { return; }
    var p1 = e.reports_to ? gl('Employee', { fields: ['employee_name'], filters: [['name', '=', e.reports_to]], limit: 1 }).then(function (x) { e.manager = x[0] ? x[0].employee_name : e.reports_to; }, function () { e.manager = e.reports_to; }) : Promise.resolve();
    var p2 = fetchAll('ToDo', { fields: ['reference_name', 'assigned_by', 'assigned_by_full_name', 'status', 'priority', 'modified'], filters: [['allocated_to', '=', frappe.session.user], ['reference_type', '=', 'Task'], ['status', '!=', 'Cancelled']] }, 2000).then(function (x) { S.ctx.todos = x.rows; S.ctx.taskNames = uniq(x.rows.map(function (q) { return q.reference_name; })); S.ctx.todoMap = {}; x.rows.forEach(function (q) { S.ctx.todoMap[q.reference_name] = q; }); }, function () { S.ctx.todoErr = true; });
    var p3 = gl('Project User', { parent: 'Project', fields: ['parent'], filters: [['user', '=', frappe.session.user]], limit: 500 }).then(function (x) { S.ctx.puProjects = uniq(x.map(function (q) { return q.parent; })); }, function () { S.ctx.puProjects = []; });
    return Promise.all([p1, p2, p3]).then(function () {
      return gl('Task', { fields: ['project'], filters: [['name', 'in', S.ctx.taskNames.length ? S.ctx.taskNames : NONE], ['project', '!=', '']], limit: 2000 }).then(function (x) {
        S.ctx.taskProjects = uniq(x.map(function (q) { return q.project; }));
        var all = uniq((S.ctx.puProjects || []).concat(S.ctx.taskProjects));
        S.ctx.projAll = all;
        return all.length ? gl('Project', { fields: ['name', 'project_name', 'status'], filters: [['name', 'in', all]], limit: 500 }).then(function (pp) { S.ctx.projOpts = pp; }) : null;
      });
    });
  });
}
APP.init = function () { S.f.from = monthStart(TODAY); S.f.to = TODAY; S.f.ds = ''; S.f.project = ''; return loadCtx().then(function () { if (S.ctx.emp) { S.f.emp = S.ctx.emp.name; } }); };
APP.prepare = function () { if (!S.ctx.ready) { S.ctx.ready = loadCtx(); } return S.ctx.ready; };
function EMP() { return S.ctx.emp; }
function needEmp(v) { if (!EMP()) { v.innerHTML = '<div class="dmemp-note">' + esc(t('no_emp')) + '</div>'; return false; } return true; }
function rng() { return [S.f.from || monthStart(TODAY), S.f.to || TODAY]; }
function sec(k) { return '<div class="dmemp-sech">' + esc(t(k)) + '</div>'; }
function mk(cls) { return '<div class="dmemp-grid ' + cls + '"></div>'; }
function kfmtN(r) { return { v: r }; }

/* ---------- attendance ---------- */
function attF(extra) { var r = rng(), to = r[1] > TODAY ? TODAY : r[1]; var f = [['employee', '=', EMP().name], ['docstatus', '=', 1], ['attendance_date', '>=', r[0]], ['attendance_date', '<=', to]]; return extra ? f.concat(extra) : f; }
function attSpec(id, extra, order) {
  return {
    id: id, dt: 'Attendance', fields: ['name', 'attendance_date', 'employee_name', 'status', 'in_time', 'out_time', 'working_hours', 'late_entry', 'early_exit', 'shift', 'leave_type'],
    filters: attF(extra), order: order || 'attendance_date desc', search: ['name', 'status', 'shift'],
    cols: [
      { h: 'c_date', c: function (r) { return r.attendance_date; }, f: function (r) { return link('Attendance', r.name) + ' · ' + esc(r.attendance_date); } },
      { h: 'c_in', c: function (r) { return tstr(r.in_time); } }, { h: 'c_out', c: function (r) { return tstr(r.out_time); } },
      { h: 'c_hours', num: true, c: function (r) { return r.working_hours > 0 ? n(r.working_hours, 2) : ''; } },
      { h: 'c_late', c: function (r) { return r.late_entry ? '✓' : ''; } }, { h: 'c_early', c: function (r) { return r.early_exit ? '✓' : ''; } },
      { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } },
      { h: 'c_shift', c: function (r) { return r.shift || ''; } }, { h: 'c_ltype', c: function (r) { return r.leave_type || ''; } }
    ]
  };
}
function attSummary() { return memo('attsum|' + JSON.stringify(attF()), function () { return grp('Attendance', 'status', { filters: attF() }); }); }
function pctOf(m) { var p = (m['Present'] || 0) + (m['Work From Home'] || 0), h = m['Half Day'] || 0, a = m['Absent'] || 0, den = p + h + a; return den ? (p + 0.5 * h) / den * 100 : null; }
function attKpis(withExtra) {
  var d = [
    { label: 'k_present', tone: 'green', load: function () { return attSummary().then(function (m) { return { v: (m['Present'] || 0) + (m['Work From Home'] || 0) }; }); }, spec: function () { return attSpec('att_p', [['status', 'in', ['Present', 'Work From Home']]]); } },
    { label: 'k_absent', tone: 'red', load: function () { return attSummary().then(function (m) { return { v: m['Absent'] || 0 }; }); }, spec: function () { return attSpec('att_a', [['status', '=', 'Absent']]); } },
    { label: 'k_late', tone: 'orange', load: function () { return cnt('Attendance', { filters: attF([['late_entry', '=', 1]]) }).then(kfmtN); }, spec: function () { return attSpec('att_l', [['late_entry', '=', 1]]); } },
    { label: 'k_early', tone: 'orange', load: function () { return cnt('Attendance', { filters: attF([['early_exit', '=', 1]]) }).then(kfmtN); }, spec: function () { return attSpec('att_e', [['early_exit', '=', 1]]); } },
    { label: 'k_pct', tone: 'blue', load: function () { return attSummary().then(function (m) { var p = pctOf(m); return p === null ? { fmt: '—', sub: t('empty') } : { fmt: n(p, 1) + '%', sub: t('n_att').split('.')[0] }; }); }, spec: function () { return attSpec('att_pct'); } }
  ];
  if (withExtra) {
    d.push({ label: 'k_hours', tone: 'blue', load: function () { return Promise.all([sumf('Attendance', 'working_hours', { filters: attF([['working_hours', '>', 0]]) }), cnt('Attendance', { filters: attF([['working_hours', '>', 0]]) }), attSummary()]).then(function (r) { var pd = (r[2]['Present'] || 0) + (r[2]['Work From Home'] || 0); return r[1] === 0 ? { html: '<span class="dmemp-na">' + esc(t('unavailable')) + '</span>', sub: t('coverage', { a: 0, b: n(pd, 0) }) } : { fmt: n(r[0], 1) + ' h', sub: t('coverage', { a: n(r[1], 0), b: n(pd, 0) }) }; }); }, spec: function () { return attSpec('att_h', [['working_hours', '>', 0]]); } });
    d.push({ label: 'k_onleave', tone: 'blue', load: function () { return attSummary().then(function (m) { return { v: m['On Leave'] || 0 }; }); }, spec: function () { return attSpec('att_ol', [['status', '=', 'On Leave']]); } });
    d.push({ label: 'k_halfday', tone: 'orange', load: function () { return attSummary().then(function (m) { return { v: m['Half Day'] || 0 }; }); }, spec: function () { return attSpec('att_hd', [['status', '=', 'Half Day']]); } });
    d.push({ label: 'k_attreq', tone: 'yellow', load: function () { return cnt('Attendance Request', { filters: [['employee', '=', EMP().name], ['docstatus', '=', 0]] }).then(kfmtN); }, spec: function () { return { id: 'attreq', dt: 'Attendance Request', fields: ['name', 'from_date', 'to_date', 'reason', 'docstatus'], filters: [['employee', '=', EMP().name], ['docstatus', '=', 0]], order: 'modified desc', search: ['name'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Attendance Request', r.name); } }, { h: 'c_from', c: function (r) { return r.from_date; } }, { h: 'c_to', c: function (r) { return r.to_date; } }, { h: 'c_remarks', c: function (r) { return r.reason || ''; } }, { h: 'c_status', c: function (r) { return st('Draft'); }, f: function () { return pill(st('Draft'), 'y'); } }] }; } });
  }
  return d;
}

/* ---------- leave ---------- */
function lvF(extra) { var r = rng(); var f = [['employee', '=', EMP().name], ['docstatus', '<', 2], ['from_date', '<=', r[1]], ['to_date', '>=', r[0]]]; return extra ? f.concat(extra) : f; }
function lvBase(extra) { var f = [['employee', '=', EMP().name], ['docstatus', '<', 2]]; return extra ? f.concat(extra) : f; }
function lvSpec(id, filters, order) {
  return {
    id: id, dt: 'Leave Application', fields: ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'status', 'workflow_state', 'leave_approver_name', 'leave_approver', 'description', 'docstatus'],
    filters: filters, order: order || 'from_date desc', search: ['name', 'leave_type'],
    cols: [
      { h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Leave Application', r.name); } }, { h: 'c_ltype', c: function (r) { return r.leave_type; } },
      { h: 'c_from', c: function (r) { return r.from_date; } }, { h: 'c_to', c: function (r) { return r.to_date; } }, { h: 'c_days', num: true, c: function (r) { return r.total_leave_days; } },
      { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_appst', c: function (r) { return r.workflow_state || (r.docstatus === 1 ? st('Submitted') : st('Draft')); } },
      { h: 'c_approver', c: function (r) { return r.leave_approver_name || r.leave_approver || ''; } }, { h: 'c_remarks', c: function (r) { return r.description || ''; } }
    ]
  };
}
function leaveDetails() { return memo('lvdet|' + EMP().name + TODAY, function () { return call('hrms.hr.doctype.leave_application.leave_application.get_leave_details', { employee: EMP().name, date: TODAY }); }); }
function allocSpec() { return { id: 'lalloc', dt: 'Leave Allocation', fields: ['name', 'leave_type', 'from_date', 'to_date', 'total_leaves_allocated', 'docstatus'], filters: [['employee', '=', EMP().name], ['docstatus', '=', 1], ['to_date', '>=', TODAY]], order: 'from_date desc', search: ['name', 'leave_type'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Leave Allocation', r.name); } }, { h: 'c_ltype', c: function (r) { return r.leave_type; } }, { h: 'c_from', c: function (r) { return r.from_date; } }, { h: 'c_to', c: function (r) { return r.to_date; } }, { h: 'c_alloc', num: true, c: function (r) { return r.total_leaves_allocated; } }] }; }
function lvKpis() {
  return [
    { label: 'k_bal', tone: 'green', spec: allocSpec, load: function () { return leaveDetails().then(function (d) { var la = (d && d.leave_allocation) || {}, ks = Object.keys(la); if (!ks.length) { return { fmt: '—', sub: t('na_balance') }; } return { v: sum(ks, function (k) { return la[k].remaining_leaves; }), d: 1, sub: ks.length + ' ' + t('c_ltype') }; }); } },
    { label: 'k_taken', tone: 'blue', load: function () { return sumf('Leave Application', 'total_leave_days', { filters: lvF([['status', '=', 'Approved'], ['docstatus', '=', 1]]) }).then(function (v) { return { v: v, d: 1 }; }); }, spec: function () { return lvSpec('lv_t', lvF([['status', '=', 'Approved'], ['docstatus', '=', 1]])); } },
    { label: 'k_lpend', tone: 'yellow', load: function () { return cnt('Leave Application', { filters: lvBase([['status', '=', 'Open']]) }).then(kfmtN); }, spec: function () { return lvSpec('lv_p', lvBase([['status', '=', 'Open']])); } },
    { label: 'k_lup', tone: 'green', load: function () { return cnt('Leave Application', { filters: lvBase([['status', '=', 'Approved'], ['docstatus', '=', 1], ['from_date', '>=', TODAY]]) }).then(kfmtN); }, spec: function () { return lvSpec('lv_u', lvBase([['status', '=', 'Approved'], ['docstatus', '=', 1], ['from_date', '>=', TODAY]]), 'from_date asc'); } },
    { label: 'k_lrej', tone: 'red', load: function () { return cnt('Leave Application', { filters: lvF([['status', '=', 'Rejected']]) }).then(kfmtN); }, spec: function () { return lvSpec('lv_r', lvF([['status', '=', 'Rejected']])); } }
  ];
}

/* ---------- tasks ---------- */
function tkBase(extra, useStatus) {
  var f = [['name', 'in', S.ctx.taskNames && S.ctx.taskNames.length ? S.ctx.taskNames : NONE]];
  if (S.f.project) { f.push(['project', '=', S.f.project]); }
  if (useStatus && S.f.taskst) { f.push(['status', '=', S.f.taskst]); }
  return extra ? f.concat(extra) : f;
}
var OPEN_ST = ['Open', 'Working', 'Pending Review'], DONE_ST = ['Completed', 'Cancelled', 'Template'];
var OVERDUE_OR = function () { return [['status', '=', 'Overdue'], ['exp_end_date', '<', TODAY]]; };
function overdueDays(r) { return r.exp_end_date && DONE_ST.indexOf(r.status) < 0 && r.exp_end_date < TODAY ? daysBetween(r.exp_end_date, TODAY) : ''; }
function tkSpec(id, extra, order, useStatus, orf) {
  return {
    id: id, dt: 'Task', fields: ['name', 'subject', 'project', 'priority', 'exp_start_date', 'exp_end_date', 'act_end_date', 'completed_on', 'progress', 'status'],
    filters: tkBase(extra, useStatus), or: orf, order: order || 'exp_end_date asc', search: ['subject', 'name'],
    cols: [
      { h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Task', r.name); } }, { h: 'c_subject', c: function (r) { return r.subject; } },
      { h: 'c_project', c: function (r) { return r.project || ''; }, f: function (r) { return link('Project', r.project); } },
      { h: 'c_by', c: function (r) { var q = (S.ctx.todoMap || {})[r.name]; return q ? (q.assigned_by_full_name || q.assigned_by || '') : ''; } },
      { h: 'c_prio', c: function (r) { return r.priority || ''; } }, { h: 'c_start', c: function (r) { return r.exp_start_date || ''; } }, { h: 'c_end', c: function (r) { return r.exp_end_date || ''; } },
      { h: 'c_done', c: function (r) { return r.completed_on || r.act_end_date || ''; } }, { h: 'c_prog', c: function (r) { return r.progress === null ? '' : n(r.progress, 0) + '%'; }, f: function (r) { return pbar(r.progress, COL.b); } },
      { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_over', num: true, c: function (r) { return overdueDays(r); } }
    ]
  };
}
function tkKpis() {
  return [
    { label: 'k_tasks', tone: 'blue', load: function () { return cnt('Task', { filters: tkBase() }).then(kfmtN); }, spec: function () { return tkSpec('tk_all', []); } },
    { label: 'k_tdone', tone: 'green', load: function () { return cnt('Task', { filters: tkBase([['status', '=', 'Completed']]) }).then(kfmtN); }, spec: function () { return tkSpec('tk_c', [['status', '=', 'Completed']], 'modified desc'); } },
    { label: 'k_tpend', tone: 'yellow', load: function () { return cnt('Task', { filters: tkBase([['status', 'in', OPEN_ST]]) }).then(kfmtN); }, spec: function () { return tkSpec('tk_p', [['status', 'in', OPEN_ST]]); } },
    { label: 'k_tover', tone: 'red', load: function () { return cnt('Task', { filters: tkBase([['status', 'not in', DONE_ST]]), or: OVERDUE_OR() }).then(kfmtN); }, spec: function () { return tkSpec('tk_o', [['status', 'not in', DONE_ST]], 'exp_end_date asc', false, OVERDUE_OR()); } },
    { label: 'k_proj', tone: 'blue', load: function () { var all = S.ctx.projAll || []; return (all.length ? cnt('Project', { filters: [['name', 'in', all], ['status', '=', 'Open']] }) : Promise.resolve(0)).then(kfmtN); }, spec: function () { var all = S.ctx.projAll || []; return projSpec(all.length ? all : NONE); } },
    { label: 'k_appr', tone: 'yellow', load: function () { return cnt('Leave Application', { filters: [['leave_approver', '=', frappe.session.user], ['status', '=', 'Open'], ['docstatus', '<', 2]] }).then(kfmtN); }, spec: function () { var s = lvSpec('lv_ap', [['leave_approver', '=', frappe.session.user], ['status', '=', 'Open'], ['docstatus', '<', 2]]); s.cols.splice(1, 0, { h: 'c_emp', c: function (r) { return r.employee_name || ''; } }); s.fields.push('employee_name'); return s; } }
  ];
}
function projSpec(names) {
  return { id: 'projs', dt: 'Project', fields: ['name', 'project_name', 'customer', 'status', 'expected_end_date', 'percent_complete'], filters: [['name', 'in', names]], order: 'modified desc', search: ['name', 'project_name'], cols: [{ h: 'c_project', c: function (r) { return r.name; }, f: function (r) { return link('Project', r.name); } }, { h: 'c_subject', c: function (r) { return r.project_name || ''; } }, { h: 'c_cust', c: function (r) { return r.customer || ''; } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_end', c: function (r) { return r.expected_end_date || ''; } }, { h: 'c_prog', c: function (r) { return n(r.percent_complete, 0) + '%'; }, f: function (r) { return pbar(r.percent_complete, COL.b); } }] };
}
function dtmSpec() { var r = rng(); return { id: 'dtm', dt: 'Daily Task Management', fields: ['name', 'date', 'line_manager', 'designation', 'docstatus'], filters: [['employee', '=', EMP().name], ['docstatus', '<', 2], ['date', '>=', r[0]], ['date', '<=', r[1]]], order: 'date desc', search: ['name'], cols: [{ h: 'c_id', c: function (r2) { return r2.name; }, f: function (r2) { return link('Daily Task Management', r2.name); } }, { h: 'c_date', c: function (r2) { return r2.date; } }, { h: 'c_lm', c: function (r2) { return r2.line_manager || ''; } }, { h: 'c_desig', c: function (r2) { return r2.designation || ''; } }, { h: 'docstatus', c: function (r2) { return r2.docstatus === 1 ? st('Submitted') : st('Draft'); }, f: function (r2) { return dpill(r2.docstatus); } }] }; }
function tsSpec() { var r = rng(); var f = [['employee', '=', EMP().name], ['docstatus', '<', 2], ['start_date', '>=', r[0]], ['start_date', '<=', r[1]]]; if (S.f.project) { f.push(['parent_project', '=', S.f.project]); } return { id: 'ts', dt: 'Timesheet', fields: ['name', 'start_date', 'end_date', 'total_hours', 'status', 'parent_project', 'docstatus'], filters: f, order: 'start_date desc', search: ['name'], cols: [{ h: 'c_id', c: function (r2) { return r2.name; }, f: function (r2) { return link('Timesheet', r2.name); } }, { h: 'c_from', c: function (r2) { return r2.start_date || ''; } }, { h: 'c_to', c: function (r2) { return r2.end_date || ''; } }, { h: 'c_project', c: function (r2) { return r2.parent_project || ''; }, f: function (r2) { return link('Project', r2.parent_project); } }, { h: 'c_hrs', num: true, c: function (r2) { return n(r2.total_hours, 2); } }, { h: 'c_status', c: function (r2) { return st(r2.status); }, f: function (r2) { return spill(r2.status); } }] }; }

/* ---------- rental (verified document types; employee link = From / Prepared By) ---------- */
var RENT = {
  'Rental Quotation': { dateF: 'date', custF: 'ms', fields: ['name', 'date', 'ms', 'project_and_address', 'subject', 'total', '`from`', 'prepared_by', 'docstatus'], emp: ['from', 'prepared_by'], party: 'ms', total: 'total' },
  'Rental Delivery Note': { dateF: 'date', custF: 'customer', fields: ['name', 'date', 'delivery_date', 'customer', 'project_and_address', '`from`', 'prepared_by', 'docstatus'], emp: ['from', 'prepared_by'], party: 'customer' },
  'Rental Sales Invoice': { dateF: 'invoice_date', custF: 'customer', fields: ['name', 'invoice_date', 'customer', 'project_and_address', 'total', 'prepared_by', 'docstatus'], emp: ['prepared_by'], party: 'customer', total: 'total' },
  'Rental Purchase Order': { dateF: 'date', custF: null, fields: ['name', 'date', 'supplier', 'project_and_address', 'total', '`from`', 'prepared_by', 'docstatus'], emp: ['from', 'prepared_by'], party: 'supplier', total: 'total' }
};
function rentF(dt, extra) {
  var m = RENT[dt], r = rng(), f = [[m.dateF, '>=', r[0]], [m.dateF, '<=', r[1]]];
  if (S.f.ds !== '' && S.f.ds !== undefined) { f.push(['docstatus', '=', Number(S.f.ds)]); } else { f.push(['docstatus', '<', 2]); }
  if (S.f.customer && m.custF) { f.push([m.custF, 'like', '%' + S.f.customer + '%']); }
  return extra ? f.concat(extra) : f;
}
function rentOr(dt) { return RENT[dt].emp.map(function (c) { return [c, '=', EMP().name]; }); }
function rentCols(dt) {
  var m = RENT[dt];
  var c = [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link(dt, r.name); } }, { h: 'c_date', c: function (r) { return r[m.dateF]; } }, { h: 'c_party', c: function (r) { return r[m.party] || ''; } }, { h: 'c_site', c: function (r) { return r.project_and_address || ''; } }];
  if (dt === 'Rental Delivery Note') { c.push({ h: 'c_disp', c: function (r) { return r.delivery_date || ''; } }); }
  if (m.total) { c.push({ h: 'c_total', num: true, c: function (r) { return n(r.total, 2); } }); }
  c.push({ h: 'c_emp', c: function (r) { return r['from'] || r.prepared_by || ''; } }); c.push({ h: 'c_status', c: function (r) { return r.docstatus === 1 ? st('Submitted') : r.docstatus === 2 ? st('Cancelled') : st('Draft'); }, f: function (r) { return dpill(r.docstatus); } });
  return c;
}
function rentSpec(dt, id, extra) { var m = RENT[dt]; return { id: id || ('r_' + dt), dt: dt, fields: m.fields, filters: rentF(dt, extra), or: rentOr(dt), order: m.dateF + ' desc', search: ['name', 'project_and_address'], cols: rentCols(dt) }; }
function rentAllRows(draftOnly) {
  var key = 'rentall|' + (draftOnly ? 1 : 0) + JSON.stringify([S.f, EMP().name]);
  return memo(key, function () {
    return Promise.all(Object.keys(RENT).map(function (dt) {
      var m = RENT[dt];
      return fetchAll(dt, { fields: m.fields, filters: rentF(dt, draftOnly ? [['docstatus', '=', 0]] : null).filter(function (x) { return !(draftOnly && x[0] === 'docstatus' && x[1] === '<'); }), or: rentOr(dt), order: m.dateF + ' desc' }, 500).then(function (r) { return r.rows.map(function (x) { return { dt: dt, name: x.name, date: x[m.dateF], party: x[m.party] || '', site: x.project_and_address || '', total: m.total ? x.total : null, emp: x['from'] || x.prepared_by || '', docstatus: x.docstatus }; }); });
    })).then(function (parts) { var rows = []; parts.forEach(function (p) { rows = rows.concat(p); }); rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }); return rows; });
  });
}
function rentAllSpec(id, draftOnly) {
  return { id: id, rowsP: function () { return rentAllRows(draftOnly); }, cols: [{ h: 'c_type', c: function (r) { return t('dt_' + r.dt); } }, { h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link(r.dt, r.name); } }, { h: 'c_date', c: function (r) { return r.date; } }, { h: 'c_party', c: function (r) { return r.party; } }, { h: 'c_site', c: function (r) { return r.site; } }, { h: 'c_total', num: true, c: function (r) { return r.total === null ? '' : n(r.total, 2); } }, { h: 'c_status', c: function (r) { return r.docstatus === 1 ? st('Submitted') : r.docstatus === 2 ? st('Cancelled') : st('Draft'); }, f: function (r) { return dpill(r.docstatus); } }] };
}
function rdnItems(ds) {
  var key = 'rdnitems|' + ds + JSON.stringify([S.f, EMP().name]);
  return memo(key, function () {
    var extra = ds === '' ? null : [['docstatus', '=', Number(ds)]], f = rentF('Rental Delivery Note', extra);
    if (ds !== '') { f = f.filter(function (x) { return !(x[0] === 'docstatus' && x[1] === '<'); }); }
    return fetchAll('Rental Delivery Note', { fields: RENT['Rental Delivery Note'].fields, filters: f, or: rentOr('Rental Delivery Note') }, 500).then(function (h) {
      var hm = {}; h.rows.forEach(function (x) { hm[x.name] = x; });
      if (!h.rows.length) { return { rows: [], headers: [], partial: h.truncated }; }
      return fetchAll('Rental Delivery Note Table', { parent: 'Rental Delivery Note', fields: ['parent', 'item_code', 'item_name', 'quantity', 'uom'], filters: [['parent', 'in', h.rows.map(function (x) { return x.name; })]] }, 3000).then(function (c) {
        return { headers: h.rows, rows: c.rows.map(function (x) { var p = hm[x.parent] || {}; return { parent: x.parent, item_code: x.item_code, item_name: x.item_name, quantity: x.quantity, uom: x.uom, customer: p.customer, site: p.project_and_address, delivery_date: p.delivery_date, date: p.date, docstatus: p.docstatus }; }), partial: h.truncated || c.truncated };
      });
    });
  });
}
function itemSpec(id, ds) {
  return { id: id, rowsP: function () { return rdnItems(ds).then(function (x) { return x.rows; }); }, cols: [{ h: 'c_id', c: function (r) { return r.parent; }, f: function (r) { return link('Rental Delivery Note', r.parent); } }, { h: 'c_cust', c: function (r) { return r.customer || ''; } }, { h: 'c_site', c: function (r) { return r.site || ''; } }, { h: 'c_disp', c: function (r) { return r.delivery_date || ''; } }, { h: 'c_item', c: function (r) { return r.item_code || ''; } }, { h: 'c_iname', c: function (r) { return r.item_name || ''; } }, { h: 'c_qty', num: true, c: function (r) { return n(r.quantity, 2); } }, { h: 'c_uom', c: function (r) { return r.uom || ''; } }, { h: 'c_status', c: function (r) { return r.docstatus === 1 ? st('Submitted') : r.docstatus === 2 ? st('Cancelled') : st('Draft'); }, f: function (r) { return dpill(r.docstatus); } }] };
}
function qtyByUom(rows) { var m = {}; rows.forEach(function (r) { var u = r.uom || '—'; m[u] = (m[u] || 0) + (Number(r.quantity) || 0); }); return m; }
function qtyHtml(m) { var ks = Object.keys(m); return ks.length ? ks.map(function (u) { return n(m[u], 2) + ' <small>' + esc(u) + '</small>'; }).join(' · ') : '0'; }
function rentKpis() {
  var mk1 = function (dt, lab, tone) { return { label: lab, tone: tone, load: function () { return cnt(dt, { filters: rentF(dt), or: rentOr(dt) }).then(kfmtN); }, spec: function () { return rentSpec(dt, 'rk_' + dt); } }; };
  return [
    mk1('Rental Quotation', 'k_rq', 'blue'), mk1('Rental Delivery Note', 'k_rdn', 'blue'), mk1('Rental Sales Invoice', 'k_rsi', 'blue'), mk1('Rental Purchase Order', 'k_rpo', 'blue'),
    { label: 'k_rpend', tone: 'yellow', load: function () { return Promise.all(Object.keys(RENT).map(function (dt) { return cnt(dt, { filters: rentF(dt, [['docstatus', '=', 0]]).filter(function (x) { return !(x[0] === 'docstatus' && x[1] === '<'); }), or: rentOr(dt) }); })).then(function (a) { return { v: sum(a, function (x) { return x; }) }; }); }, spec: function () { return rentAllSpec('rk_pend', true); } },
    { label: 'k_disp', tone: 'green', load: function () { return rdnItems('1').then(function (x) { return { html: qtyHtml(qtyByUom(x.rows)), sub: x.partial ? t('partial', { n: 500 }) : '' }; }); }, spec: function () { return itemSpec('rk_disp', '1'); } },
    { label: 'k_active', tone: 'grey', unavail: 'na_return' }, { label: 'k_await', tone: 'grey', unavail: 'na_return' }, { label: 'k_overret', tone: 'grey', unavail: 'na_return' }
  ];
}

/* ---------- small renderers ---------- */
function listPanel(el, my, titleKey, spec) { var p = panel(titleKey); el.insertAdjacentHTML('beforeend', p.html); listView(pel(p), my, spec); }
function simpleList(items, emptyKey) { return items.length ? '<ul class="dmemp-list">' + items.join('') + '</ul>' : '<div class="dmemp-empty">' + esc(t(emptyKey || 'empty')) + '</div>'; }
function addPanel(el, titleKey, cls) { var p = panel(titleKey, cls); el.insertAdjacentHTML('beforeend', p.html); return pel(p); }
function addGrid(v, cls) { var g = document.createElement('div'); g.className = 'dmemp-grid ' + cls; v.appendChild(g); return g; }
function addKpis(v, my, defs) { var g = addGrid(v, 'dmemp-kg'); kpis(g, my, defs); }

/* ---------- TAB: overview ---------- */
function tabOverview(v, my) {
  if (!needEmp(v)) { return; }
  var e = EMP();
  v.insertAdjacentHTML('beforeend', '<div class="dmemp-welcome"><h2>' + esc(t('welcome', { name: e.employee_name })) + '</h2></div>');
  addKpis(v, my, [{ label: 'k_today', tone: 'blue', load: function () { return gl('Attendance', { fields: ['status', 'in_time', 'out_time'], filters: [['employee', '=', e.name], ['attendance_date', '=', TODAY], ['docstatus', '=', 1]], limit: 1 }).then(function (r) { return r[0] ? { html: spill(r[0].status), sub: [tstr(r[0].in_time), tstr(r[0].out_time)].filter(Boolean).join(' → ') } : { html: pill(t('no_att_today'), 'n') }; }); }, spec: function () { var s = attSpec('att_today'); s.filters = [['employee', '=', e.name], ['attendance_date', '=', TODAY], ['docstatus', '=', 1]]; return s; } }].concat(attKpis(false)));
  sec1(v, 'k_bal'); addKpis(v, my, lvKpis().slice(0, 4));
  sec1(v, 'k_tasks'); addKpis(v, my, tkKpis().slice(0, 4).concat(rentKpis().slice(4, 6)));
  var g = addGrid(v, 'dmemp-g2');
  var pr = addPanel(g, 'p_profile'); pr.innerHTML = '<div class="dmemp-prof">' + [['k_empinfo', e.employee_name], ['c_empid', e.name], ['c_desig', e.designation], ['c_dept', e.department], ['c_branch', e.branch], ['c_mgr', e.manager || e.reports_to], ['c_status', e.status ? st(e.status) : '']].map(function (x) { return '<div><span>' + esc(t(x[0])) + '</span><b>' + esc(x[1] || '—') + '</b></div>'; }).join('') + '</div>';
  var pm = addPanel(g, 'p_month'); fill(pm, my, attSummary, function (m) { return donut(ATT_ST.map(function (s) { return { l: st(s), v: m[s] || 0, c: COL[cat(s)] }; })); });
  var pt = addPanel(g, 'p_taskprog'); fill(pt, my, function () { return grp('Task', 'status', { filters: tkBase() }); }, function (m) { return donut(Object.keys(m).map(function (s) { return { l: st(s), v: m[s], c: COL[cat(s)] }; })); });
  var ph = addPanel(g, 'p_hol'); fill(ph, my, holidays, function (rows) { return simpleList(rows.map(function (h) { return '<li><span>' + esc(h.description || '') + '</span><b>' + esc(h.holiday_date) + '</b></li>'; }), 'none_hol'); });
  var g2 = addGrid(v, 'dmemp-g2');
  var pd = addPanel(g2, 'p_deadl'); fill(pd, my, function () { return gl('Task', { fields: ['name', 'subject', 'exp_end_date', 'status', 'project'], filters: tkBase([['status', 'not in', DONE_ST], ['exp_end_date', '>=', TODAY]]), order: 'exp_end_date asc', limit: 6 }); }, function (rows) { return simpleList(rows.map(function (r) { return '<li><span>' + link('Task', r.name) + ' ' + esc(r.subject) + '</span><b>' + esc(r.exp_end_date) + '</b></li>'; })); });
  var po = addPanel(g2, 'p_overd'); fill(po, my, function () { return gl('Task', { fields: ['name', 'subject', 'exp_end_date', 'status'], filters: tkBase([['status', 'not in', DONE_ST]]), or: OVERDUE_OR(), order: 'exp_end_date asc', limit: 6 }); }, function (rows) { return simpleList(rows.map(function (r) { return '<li><span>' + link('Task', r.name) + ' ' + esc(r.subject) + '</span>' + pill(r.exp_end_date ? n(daysBetween(r.exp_end_date, TODAY), 0) + ' d' : st('Overdue'), 'r') + '</li>'; })) + '<div class="dmemp-note">' + esc(t('ret_na')) + '</div>'; });
  var g3 = addGrid(v, 'dmemp-g2');
  var pa = addPanel(g3, 'p_rentals'); fill(pa, my, function () { return rentAllRows(false); }, function (rows) { return simpleList(rows.slice(0, 6).map(function (r) { return '<li><span>' + esc(t('dt_' + r.dt)) + ' ' + link(r.dt, r.name) + ' · ' + esc(r.party) + '</span>' + dpill(r.docstatus) + '</li>'; })); });
  var pc = addPanel(g3, 'p_act'); fill(pc, my, recent, function (rows) { return simpleList(rows.map(function (r) { return '<li><span>' + esc(t('dt_' + r.dt)) + ' ' + link(r.dt, r.name) + '</span><small>' + esc(dstr(r.modified)) + '</small></li>'; })); });
}
function sec1(v, k) { }
function holidays() {
  var e = EMP(); if (!e.holiday_list) { return Promise.resolve([]); }
  return memo('hol|' + e.holiday_list, function () { return call('frappe.client.get', { doctype: 'Holiday List', name: e.holiday_list }).then(function (d) { return ((d && d.holidays) || []).filter(function (h) { return h.holiday_date >= TODAY; }).sort(function (a, b) { return a.holiday_date < b.holiday_date ? -1 : 1; }).slice(0, 6); }); }).catch(function () { return []; });
}
function recent() {
  var e = EMP(), srcs = [
    gl('Leave Application', { fields: ['name', 'modified'], filters: [['employee', '=', e.name]], order: 'modified desc', limit: 4 }).then(function (r) { return r.map(function (x) { return { dt: 'Leave Application', name: x.name, modified: x.modified }; }); }),
    gl('Daily Task Management', { fields: ['name', 'modified'], filters: [['employee', '=', e.name]], order: 'modified desc', limit: 4 }).then(function (r) { return r.map(function (x) { return { dt: 'Daily Task Management', name: x.name, modified: x.modified }; }); }),
    gl('Task', { fields: ['name', 'modified'], filters: tkBase(), order: 'modified desc', limit: 4 }).then(function (r) { return r.map(function (x) { return { dt: 'Task', name: x.name, modified: x.modified }; }); })
  ];
  ['Rental Quotation', 'Rental Delivery Note'].forEach(function (dt) { srcs.push(gl(dt, { fields: ['name', 'modified'], or: rentOr(dt), order: 'modified desc', limit: 3 }).then(function (r) { return r.map(function (x) { return { dt: dt, name: x.name, modified: x.modified }; }); })); });
  return Promise.all(srcs.map(function (p) { return p.catch(function () { return []; }); })).then(function (a) { var rows = []; a.forEach(function (x) { rows = rows.concat(x); }); rows.sort(function (p, q) { return String(q.modified).localeCompare(String(p.modified)); }); return rows.slice(0, 8); });
}
K('st_Active', 'Active', 'نشط'); K('c_empid', 'Employee ID', 'رقم الموظف'); K('c_dept', 'Department', 'القسم'); K('c_branch', 'Branch / Location', 'الفرع / الموقع'); K('c_mgr', 'Reporting Manager', 'المدير المباشر');

/* ---------- TAB: attendance ---------- */
function tabAttendance(v, my) {
  if (!needEmp(v)) { return; }
  v.insertAdjacentHTML('beforeend', '<div class="dmemp-info">' + esc(t('n_att')) + ' ' + esc(t('n_hours')) + '</div>');
  addKpis(v, my, attKpis(true));
  var g = addGrid(v, 'dmemp-g2');
  var pc = addPanel(g, 'p_cal'), pt = addPanel(g, 'p_trend');
  calendar(pc, my);
  var r = rng();
  fill(pt, my, function () { return fetchAll('Attendance', { fields: ['attendance_date', 'status'], filters: attF(), order: 'attendance_date asc' }, 1500); }, function (x) {
    var by = group(x.rows, function (q) { return q.attendance_date.slice(0, 7); });
    var cols = Object.keys(by).sort().map(function (m) { return { l: m.slice(2), parts: ATT_ST.map(function (s) { return { l: st(s), c: COL[cat(s)], v: by[m].filter(function (q) { return q.status === s; }).length }; }) }; });
    return colchart(cols) + (x.truncated ? '<div class="dmemp-note">' + esc(t('partial', { n: 1500 })) + '</div>' : '');
  });
  var pd = addPanel(v, 'p_daily');
  listView(pd, my, attSpec('att_daily', S.f.attst ? [['status', '=', S.f.attst]] : null));
}
function calendar(el, my) {
  var r = rng(); var m0 = S.ctx.cal || monthStart(r[1] > TODAY ? TODAY : r[1]);
  var mEnd = monthEnd(m0);
  el.innerHTML = SKEL;
  gl('Attendance', { fields: ['attendance_date', 'status', 'in_time', 'out_time'], filters: [['employee', '=', EMP().name], ['docstatus', '=', 1], ['attendance_date', '>=', m0], ['attendance_date', '<=', mEnd]], limit: 62 }).then(function (rows) {
    if (my !== epoch) { return; }
    var map = {}; rows.forEach(function (q) { map[q.attendance_date] = q; });
    var first = new Date(m0 + 'T00:00:00'), pad = first.getDay(), days = Number(mEnd.slice(8)), loc = S.lang === 'ar' ? 'ar-SA' : 'en-GB';
    var h = '<div class="dmemp-calh"><button class="dmemp-btn dmemp-sm" data-cm="-1">' + esc(t('prevm')) + '</button><b>' + esc(first.toLocaleDateString(loc, { month: 'long', year: 'numeric' })) + '</b><button class="dmemp-btn dmemp-sm" data-cm="1">' + esc(t('nextm')) + '</button></div><div class="dmemp-cal">';
    for (var i = 0; i < 7; i++) { h += '<div class="dmemp-dh">' + esc(new Date(2023, 0, 1 + i).toLocaleDateString(loc, { weekday: 'short' })) + '</div>'; }
    for (i = 0; i < pad; i++) { h += '<div></div>'; }
    for (var d = 1; d <= days; d++) { var ds = m0.slice(0, 8) + ('0' + d).slice(-2), q = map[ds]; h += '<div class="dmemp-cd' + (q ? ' dmemp-p-' + cat(q.status) : '') + (ds === TODAY ? ' dmemp-today' : '') + '"' + (q ? ' title="' + esc(st(q.status) + ' ' + tstr(q.in_time) + ' ' + tstr(q.out_time)) + '"' : '') + '><b>' + d + '</b>' + (q ? esc(st(q.status)) : '') + '</div>'; }
    el.innerHTML = h + '</div>';
    $$('[data-cm]', el).forEach(function (b) { b.onclick = function () { S.ctx.cal = addMonths(m0, Number(b.getAttribute('data-cm'))); calendar(el, my); }; });
  }, function (e) { if (my !== epoch) { return; } el.innerHTML = errBox(e); var b = el.querySelector('[data-retry]'); if (b) { b.onclick = function () { calendar(el, my); }; } });
}

/* ---------- TAB: leave ---------- */
function tabLeave(v, my) {
  if (!needEmp(v)) { return; }
  v.insertAdjacentHTML('beforeend', '<div class="dmemp-info">' + esc(t('n_bal')) + '</div>');
  addKpis(v, my, lvKpis());
  var pb = addPanel(v, 'p_lbal'); fill(pb, my, leaveDetails, function (d) {
    var la = (d && d.leave_allocation) || {}, ks = Object.keys(la); if (!ks.length) { return '<div class="dmemp-empty">' + esc(t('na_balance')) + '</div>'; }
    return '<table class="dmemp-tbl"><thead><tr><th>' + esc(t('c_ltype')) + '</th><th class="dmemp-num">' + esc(t('c_alloc')) + '</th><th class="dmemp-num">' + esc(t('c_taken')) + '</th><th class="dmemp-num">' + esc(t('c_pend')) + '</th><th class="dmemp-num">' + esc(t('c_remain')) + '</th></tr></thead><tbody>' + ks.map(function (k) { var x = la[k]; return '<tr><td data-l="' + esc(t('c_ltype')) + '">' + esc(k) + '</td><td class="dmemp-num">' + n(x.total_leaves, 1) + '</td><td class="dmemp-num">' + n(x.leaves_taken, 1) + '</td><td class="dmemp-num">' + n(x.leaves_pending_approval, 1) + '</td><td class="dmemp-num"><b>' + n(x.remaining_leaves, 1) + '</b></td></tr>'; }).join('') + '</tbody></table>';
  });
  var g = addGrid(v, 'dmemp-g2');
  var pu = addPanel(g, 'p_lup'), pp = addPanel(g, 'p_lpend');
  fill(pu, my, function () { return gl('Leave Application', { fields: ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days'], filters: lvBase([['status', '=', 'Approved'], ['docstatus', '=', 1], ['from_date', '>=', TODAY]]), order: 'from_date asc', limit: 8 }); }, function (rows) { return simpleList(rows.map(function (r) { return '<li><span>' + link('Leave Application', r.name) + ' ' + esc(r.leave_type) + '</span><b>' + esc(r.from_date + ' → ' + r.to_date) + ' (' + n(r.total_leave_days, 1) + ')</b></li>'; })); });
  fill(pp, my, function () { return gl('Leave Application', { fields: ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'workflow_state'], filters: lvBase([['status', '=', 'Open']]), order: 'from_date asc', limit: 8 }); }, function (rows) { return simpleList(rows.map(function (r) { return '<li><span>' + link('Leave Application', r.name) + ' ' + esc(r.leave_type) + '</span><b>' + esc(r.from_date + ' → ' + r.to_date) + ' ' + pill(r.workflow_state || st('Open'), 'y') + '</b></li>'; })); });
  var pd = addPanel(v, 'p_ldist'); fill(pd, my, function () { return fetchAll('Leave Application', { fields: ['from_date', 'total_leave_days'], filters: lvF([['status', '=', 'Approved'], ['docstatus', '=', 1]]), order: 'from_date asc' }, 1000); }, function (x) { var by = group(x.rows, function (q) { return q.from_date.slice(0, 7); }); return colchart(Object.keys(by).sort().map(function (m) { return { l: m.slice(2), parts: [{ l: t('k_taken'), c: COL.b, v: sum(by[m], function (q) { return q.total_leave_days; }) }] }; })) + (x.truncated ? '<div class="dmemp-note">' + esc(t('partial', { n: 1000 })) + '</div>' : ''); });
  var ph = addPanel(v, 'p_lhist'); listView(ph, my, lvSpec('lv_hist', lvF()));
}

/* ---------- TAB: tasks ---------- */
function tabTasks(v, my) {
  if (!needEmp(v)) { return; }
  v.insertAdjacentHTML('beforeend', '<div class="dmemp-info">' + esc(t('n_tasks')) + '</div>');
  addKpis(v, my, tkKpis());
  var g = addGrid(v, 'dmemp-g2');
  var pa = addPanel(g, 'p_active'); listView(pa, my, tkSpec('tk_active', [['status', 'in', OPEN_ST]], 'exp_end_date asc', true));
  var pc = addPanel(g, 'p_completed'); listView(pc, my, tkSpec('tk_comp', [['status', '=', 'Completed']], 'modified desc', false));
  var pall = addPanel(v, 'p_alltasks'); listView(pall, my, tkSpec('tk_every', [], 'exp_end_date asc', true));
  var pp = addPanel(v, 'p_projs'); listView(pp, my, projSpec((S.ctx.projAll || []).length ? S.ctx.projAll : NONE));
  var pt = addPanel(v, 'p_ts'); listView(pt, my, tsSpec());
  var pd = addPanel(v, 'p_dtm'); listView(pd, my, dtmSpec());
}

/* ---------- TAB: rental ---------- */
function tabRental(v, my) {
  if (!needEmp(v)) { return; }
  v.insertAdjacentHTML('beforeend', '<div class="dmemp-info">' + esc(t('n_link')) + ' ' + esc(t('hdr_rnote')) + '</div><div class="dmemp-note"><b>' + esc(t('p_unav')) + ':</b> ' + esc(t('n_unav_list')) + '</div>');
  addKpis(v, my, rentKpis());
  var pa = addPanel(v, 'p_rdocs'); listView(pa, my, rentAllSpec('rt_all', false));
  Object.keys(RENT).forEach(function (dt) { var p = addPanel(v, 'dt_' + dt); listView(p, my, rentSpec(dt, 'rt_' + dt)); });
}

/* ---------- TAB: dispatch & returns ---------- */
function tabDispatch(v, my) {
  if (!needEmp(v)) { return; }
  v.insertAdjacentHTML('beforeend', '<div class="dmemp-note"><b>' + esc(t('p_unav')) + ':</b> ' + esc(t('n_unav_list')) + '</div>');
  var dn = 'Rental Delivery Note';
  addKpis(v, my, [
    { label: 'k_rdn', tone: 'blue', load: function () { return cnt(dn, { filters: rentF(dn), or: rentOr(dn) }).then(kfmtN); }, spec: function () { return rentSpec(dn, 'dp_all'); } },
    { label: 'k_disp', tone: 'green', load: function () { return rdnItems('1').then(function (x) { return { html: qtyHtml(qtyByUom(x.rows)), sub: x.partial ? t('partial', { n: 500 }) : '' }; }); }, spec: function () { return itemSpec('dp_disp', '1'); } },
    { label: 'k_dpdraft', tone: 'yellow', load: function () { return cnt(dn, { filters: rentF(dn, [['docstatus', '=', 0]]).filter(function (x) { return !(x[0] === 'docstatus' && x[1] === '<'); }), or: rentOr(dn) }).then(kfmtN); }, spec: function () { return rentSpec(dn, 'dp_draft', [['docstatus', '=', 0]]); } },
    { label: 'k_retqty', tone: 'grey', unavail: 'na_return' }, { label: 'k_outqty', tone: 'grey', unavail: 'na_return' }, { label: 'k_overret', tone: 'grey', unavail: 'na_return' }
  ]);
  var ph = addPanel(v, 'p_dhist'); listView(ph, my, rentSpec(dn, 'dp_hist'));
  var pi = addPanel(v, 'p_ditems'); listView(pi, my, itemSpec('dp_items', ''));
  var g = addGrid(v, 'dmemp-g2');
  var ps = addPanel(g, 'p_itemsum'), pc = addPanel(g, 'p_custsum');
  fill(ps, my, function () { return rdnItems(''); }, function (x) {
    var by = group(x.rows, function (r) { return (r.item_code || '') + '||' + (r.uom || ''); });
    var rows = Object.keys(by).map(function (k) { var a = by[k][0]; return { code: a.item_code, name: a.item_name, uom: a.uom, qty: sum(by[k], function (r) { return r.quantity; }) }; });
    return summaryTable(rows, [['c_item', function (r) { return esc(r.code); }], ['c_iname', function (r) { return esc(r.name); }], ['c_uom', function (r) { return esc(r.uom); }], ['c_qty', function (r) { return n(r.qty, 2); }, 1]]);
  });
  fill(pc, my, function () { return rdnItems(''); }, function (x) {
    var by = group(x.rows, function (r) { return (r.customer || '') + '||' + (r.uom || ''); });
    var rows = Object.keys(by).map(function (k) { var a = by[k][0]; return { cust: a.customer, uom: a.uom, qty: sum(by[k], function (r) { return r.quantity; }), docs: uniq(by[k].map(function (r) { return r.parent; })).length }; });
    return summaryTable(rows, [['c_cust', function (r) { return esc(r.cust); }], ['c_docs', function (r) { return n(r.docs, 0); }, 1], ['c_uom', function (r) { return esc(r.uom); }], ['c_qty', function (r) { return n(r.qty, 2); }, 1]]);
  });
}
function summaryTable(rows, cols) {
  if (!rows.length) { return '<div class="dmemp-empty">' + esc(t('empty')) + '</div>'; }
  return '<div class="dmemp-tw"><table class="dmemp-tbl"><thead><tr>' + cols.map(function (c) { return '<th' + (c[2] ? ' class="dmemp-num"' : '') + '>' + esc(t(c[0])) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td' + (c[2] ? ' class="dmemp-num"' : '') + ' data-l="' + esc(t(c[0])) + '">' + c[1](r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
}

/* ---------- TAB: reports ---------- */
function tabReports(v, my) {
  if (!needEmp(v)) { return; }
  var reps = [
    ['rep_att', function () { return attSpec('rep_att_s'); }], ['rep_lv', function () { return lvSpec('rep_lv_s', lvF()); }], ['rep_tk', function () { return tkSpec('rep_tk_s', [], 'exp_end_date asc', true); }],
    ['rep_rent', function () { return rentAllSpec('rep_rent_s', false); }], ['rep_disp', function () { return itemSpec('rep_disp_s', ''); }], ['rep_ret', null], ['rep_out', null],
    ['rep_over', function () { return tkSpec('rep_over_s', [['status', 'not in', DONE_ST]], 'exp_end_date asc', false, OVERDUE_OR()); }]
  ];
  var host = addPanel(v, 'tab_rp');
  host.innerHTML = reps.map(function (r, i) { return '<div class="dmemp-rep"><div><b>' + esc(t(r[0])) + '</b>' + (r[1] ? '' : '<small>' + esc(t('na_return')) + '</small>') + '</div>' + (r[1] ? '<button class="dmemp-btn" data-rep="' + i + '">' + esc(t('open_report')) + '</button>' : '<span class="dmemp-na">' + esc(t('unavailable')) + '</span>') + '</div>'; }).join('');
  $$('[data-rep]', host).forEach(function (b) { b.onclick = function () { var r = reps[Number(b.getAttribute('data-rep'))]; S.drill = { tk: r[0], mk: r[1], tab: S.tab }; renderView(); }; });
}

boot();
})();