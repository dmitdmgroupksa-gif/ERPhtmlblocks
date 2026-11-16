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
repairBlockHeading(R, 'DM Contracting Dashboard');

/* The Custom HTML Block's HTML section is left BLANK: the whole DOM is built here inside root_element. */
var HOST = (R && R.querySelector) ? R : document.body;
var old0 = HOST.querySelector('#dmcon-root'); if (old0) { old0.remove(); }
var ROOT = document.createElement('div'); ROOT.id = 'dmcon-root'; ROOT.className = 'dmcon-app';
ROOT.innerHTML = '<div class="dmcon-welcome dmcon-ttlbar"><h2 id="dmcon-title"></h2><div class="dmcon-card-s" id="dmcon-sub" style="max-width:none;white-space:normal"></div></div>'
  + '<div class="dmcon-top"><div class="dmcon-tabs" id="dmcon-tabs" role="tablist"></div><div class="dmcon-meta"><span class="dmcon-live" id="dmcon-live"></span><span id="dmcon-upd"></span>'
  + '<label class="dmcon-auto"><input type="checkbox" id="dmcon-auto"><span id="dmcon-autol"></span></label>'
  + '<button type="button" class="dmcon-refresh" id="dmcon-refresh" aria-label="Refresh">&#8635;</button><button type="button" class="dmcon-lang" id="dmcon-lang"></button></div></div>'
  + '<section class="dmcon-filters" id="dmcon-filters" aria-label="Filters"></section><main class="dmcon-view" id="dmcon-view" aria-live="polite"></main><footer class="dmcon-foot" id="dmcon-foot"></footer>';
HOST.appendChild(ROOT);
var AUTOT = null;

/* ---------- i18n ---------- */
var I18N = { en: {}, ar: {} };
function K(k, e, a) { I18N.en[k] = e; I18N.ar[k] = a; }
var S = { lang: 'en', tab: null, f: {}, drill: null, ctx: {}, lv: {} };
var epoch = 0, uid = 0, cache = {}, loadedAt = null;
try { var _l = localStorage.getItem('dmcon-lang'); if (_l === 'ar' || _l === 'en') { S.lang = _l; } } catch (e0) {}
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
function link(dt, name) { return name ? '<a class="dmcon-lnk" target="_blank" rel="noopener" href="' + esc(docUrl(dt, name)) + '">' + esc(name) + '</a>' : ''; }
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
function pill(label, c) { return '<span class="dmcon-pill dmcon-p-' + (c || 'n') + '">' + esc(label) + '</span>'; }
function spill(s, c) { return s ? pill(st(s), c || cat(s)) : ''; }
function dpill(ds) { var m = { 0: ['Draft', 'y'], 1: ['Submitted', 'g'], 2: ['Cancelled', 'n'] }[ds]; return m ? pill(st(m[0]), m[1]) : ''; }
function pbar(v, c) { v = Math.max(0, Math.min(100, Number(v) || 0)); return '<div class="dmcon-pb"><i style="width:' + v + '%;background:' + (c || 'var(--royal)') + '"></i></div><span class="dmcon-pbv">' + n(v, 0) + '%</span>'; }

/* ---------- charts (plain HTML/SVG, no external libs) ---------- */
function hbars(items, d) {
  if (!items.length) { return '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; }
  var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
  return '<div class="dmcon-hb">' + items.map(function (i) { return '<div class="dmcon-hr"><span class="dmcon-hl" title="' + esc(i.l) + '">' + esc(i.l) + '</span><span class="dmcon-ht"><i style="width:' + (i.v / max * 100) + '%;background:' + (i.c || 'var(--royal)') + '"></i></span><b>' + n(i.v, d) + '</b></div>'; }).join('') + '</div>';
}
function donut(items) {
  var tot = sum(items, function (i) { return i.v; });
  if (!tot) { return '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; }
  var off = 25, segs = '', leg = '';
  items.forEach(function (i) { if (!i.v) { return; } var p = i.v / tot * 100; segs += '<circle r="15.9155" cx="18" cy="18" fill="none" stroke="' + i.c + '" stroke-width="5" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + off + '"></circle>'; off -= p; });
  items.forEach(function (i) { leg += '<li><i style="background:' + i.c + '"></i>' + esc(i.l) + ' <b>' + n(i.v, 0) + '</b></li>'; });
  return '<div class="dmcon-dn"><svg viewBox="0 0 36 36" role="img">' + segs + '<text x="18" y="19.5" text-anchor="middle" class="dmcon-dnt">' + n(tot, 0) + '</text></svg><ul>' + leg + '</ul></div>';
}
/* stacked columns: cols=[{l, parts:[{v,c,l}]}] */
function colchart(cols) {
  if (!cols.length) { return '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; }
  var max = Math.max.apply(null, cols.map(function (c) { return sum(c.parts, function (p) { return p.v; }); }).concat([1]));
  var legend = {}; var h = '<div class="dmcon-cc">';
  cols.forEach(function (c) {
    var tot = sum(c.parts, function (p) { return p.v; });
    h += '<div class="dmcon-cl" title="' + esc(c.l + ': ' + c.parts.map(function (p) { return p.l + ' ' + n(p.v); }).join(', ')) + '"><div class="dmcon-cs" style="height:' + (tot / max * 100) + '%">';
    c.parts.forEach(function (p) { legend[p.l] = p.c; if (p.v) { h += '<i style="flex:' + p.v + ';background:' + p.c + '"></i>'; } });
    h += '</div><span>' + esc(c.l) + '</span></div>';
  });
  h += '</div><ul class="dmcon-lg">' + Object.keys(legend).map(function (k) { return '<li><i style="background:' + legend[k] + '"></i>' + esc(k) + '</li>'; }).join('') + '</ul>';
  return h;
}
var COL = { g: '#16a34a', b: '#2b4fc1', y: '#eab308', o: '#ed8930', r: '#dc2626', n: '#94a3b8', l: '#60a5fa' };

/* ---------- async panel helper ---------- */
var SKEL = '<div class="dmcon-sk"></div>';
function errBox(e) { return '<div class="dmcon-err"><b>' + esc(t('error')) + ':</b> ' + esc(errText(e)) + ' <button class="dmcon-btn dmcon-sm" data-retry="1">' + esc(t('retry')) + '</button></div>'; }
function fill(el, my, load, render) {
  var run = function () {
    el.innerHTML = SKEL;
    load().then(function (d) { if (my !== epoch) { return; } el.innerHTML = render(d); }, function (e) {
      if (my !== epoch) { return; } el.innerHTML = errBox(e); var b = el.querySelector('[data-retry]'); if (b) { b.onclick = run; }
    });
  };
  run();
}
function panel(title, cls) { var id = 'p' + (++uid); return { id: id, html: '<section class="dmcon-card ' + (cls || '') + '"><div class="dmcon-card-h"><div class="dmcon-card-t">' + esc(t(title)) + '</div></div><div class="dmcon-card-b" data-pid="' + id + '"></div></section>' }; }
function pel(p) { return ROOT.querySelector('[data-pid="' + p.id + '"]'); }
function note(key) { return '<div class="dmcon-note">' + esc(t(key)) + '</div>'; }


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
    return '<div class="dmcon-kpi dmcon-tone-' + tn + (click ? ' click' : ' dmcon-static') + '" data-i="' + i + '"' + (click ? ' tabindex="0" role="button"' : '') + '><div class="dmcon-kpi-ico">' + ico(ik) + '</div><div class="dmcon-kpi-body"><div class="dmcon-kpi-l">' + esc(t(d.label)) + '</div><div class="dmcon-kpi-v">' + (un ? '<span class="dmcon-na">' + esc(t('unavailable')) + '</span>' : '<div class="dmcon-sk dmcon-sk-v"></div>') + '</div><div class="dmcon-kpi-s">' + (un ? esc(t(d.unavail)) : '') + '</div></div></div>';
  }).join('');
  $$('.dmcon-kpi', el).forEach(function (card) {
    var d = defs[Number(card.getAttribute('data-i'))];
    if (d.unavail) { return; }
    if (d.spec) { var go = function () { openDrill(d); }; card.onclick = go; card.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; }
    d.load().then(function (r) {
      if (my !== epoch) { return; }
      card.querySelector('.dmcon-kpi-v').innerHTML = r.html !== undefined ? r.html : esc(r.fmt !== undefined ? r.fmt : n(r.v, r.d));
      card.querySelector('.dmcon-kpi-s').textContent = r.sub || '';
      if (r.tone) { card.className = card.className.replace(/dmcon-tone-\w+/, 'dmcon-tone-' + r.tone); }
    }, function (e) {
      if (my !== epoch) { return; }
      card.querySelector('.dmcon-kpi-v').innerHTML = '<span class="dmcon-na">' + esc(t('error')) + '</span>'; card.querySelector('.dmcon-kpi-s').textContent = errText(e);
      card.classList.add('dmcon-static'); card.classList.remove('click'); card.onclick = null; card.onkeydown = null;
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
  el.innerHTML = '<div class="dmcon-tb"><input type="search" class="dmcon-in dmcon-q" placeholder="' + esc(t('search')) + '" value="' + esc(st0.q) + '"><span class="dmcon-cnt"></span><span class="dmcon-sp"></span><select class="dmcon-in dmcon-sz">' + [20, 50, 100].map(function (s) { return '<option' + (s === st0.size ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><button class="dmcon-btn dmcon-ex">' + esc(t('export')) + '</button></div><div class="dmcon-msg"></div><div class="dmcon-tw"></div><div class="dmcon-pgr"></div>';
  var tw = $('.dmcon-tw', el), pg = $('.dmcon-pgr', el), cn = $('.dmcon-cnt', el), msg = $('.dmcon-msg', el);
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
    if (!rows.length) { return '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; }
    return '<table class="dmcon-tbl"><thead><tr>' + spec.cols.map(function (c) { return '<th' + (c.num ? ' class="dmcon-num"' : '') + '>' + esc(t(c.h)) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + spec.cols.map(function (c) { return '<td' + (c.num ? ' class="dmcon-num"' : '') + ' data-l="' + esc(t(c.h)) + '">' + (c.f ? c.f(r) : esc(c.c(r))) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function pager(total) {
    var a = total ? st0.page * st0.size + 1 : 0, b = Math.min(total, (st0.page + 1) * st0.size), last = Math.max(0, Math.ceil(total / st0.size) - 1);
    pg.innerHTML = '<span>' + esc(t('showing', { a: n(a, 0), b: n(b, 0), n: n(total, 0) })) + '</span><span class="dmcon-sp"></span><button class="dmcon-btn dmcon-sm" data-pp="-1"' + (st0.page <= 0 ? ' disabled' : '') + '>' + esc(t('prev')) + '</button><button class="dmcon-btn dmcon-sm" data-pp="1"' + (st0.page >= last ? ' disabled' : '') + '>' + esc(t('next')) + '</button>';
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
  $('.dmcon-q', el).oninput = function (ev) { var v = ev.target.value; clearTimeout(timer); timer = setTimeout(function () { st0.q = v.trim(); st0.page = 0; load(); }, 350); };
  $('.dmcon-sz', el).onchange = function (ev) { st0.size = Number(ev.target.value); st0.page = 0; load(); };
  $('.dmcon-ex', el).onclick = function () {
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
  $('#dmcon-title').textContent = t('title'); $('#dmcon-sub').textContent = t('subtitle');
  $('#dmcon-lang').textContent = t('lang_btn'); $('#dmcon-refresh').title = t('refresh'); $('#dmcon-autol').textContent = t('auto5');
  ROOT.classList.toggle('dmcon-rtl', S.lang === 'ar');
  renderFilters(); renderTabs(); setUpd();
}
function renderFilters() {
  var h = '';
  APP.filters.forEach(function (f) {
    var v = S.f[f.k] === undefined ? '' : S.f[f.k], inner = '';
    if (f.type === 'select') {
      var opts = typeof f.opts === 'function' ? f.opts() : f.opts;
      inner = '<select class="dmcon-in" data-f="' + f.k + '"' + (f.ro ? ' disabled' : '') + '>' + opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(v) ? ' selected' : '') + '>' + esc(o.lk ? t(o.lk) : o.l) + '</option>'; }).join('') + '</select>';
    } else { inner = '<input class="dmcon-in" data-f="' + f.k + '" type="' + (f.type === 'date' ? 'date' : 'text') + '" value="' + esc(v) + '"' + (f.ro ? ' disabled' : '') + (f.ph ? ' placeholder="' + esc(t(f.ph)) + '"' : '') + '>'; }
    h += '<div class="dmcon-fc"><label>' + esc(t(f.lbl)) + '</label>' + inner + '</div>';
  });
  $('#dmcon-filters').innerHTML = h;
  var tm = null;
  $$('[data-f]', $('#dmcon-filters')).forEach(function (inp) {
    var go = function () { S.f[inp.getAttribute('data-f')] = inp.value; S.lv = {}; renderView(); };
    if (inp.tagName === 'INPUT' && inp.type === 'text') { inp.oninput = function () { clearTimeout(tm); tm = setTimeout(go, 500); }; } else { inp.onchange = go; }
  });
}
function renderTabs() {
  $('#dmcon-tabs').innerHTML = APP.tabs.map(function (tb) { return '<button class="dmcon-tab' + (S.tab === tb.id ? ' on' : '') + '" role="tab" data-tab="' + tb.id + '">' + esc(t(tb.label)) + '</button>'; }).join('');
  $$('[data-tab]', $('#dmcon-tabs')).forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-tab'); S.drill = null; renderTabs(); renderView(); }; });
}
function renderDrill(v, my) {
  var d = S.drill;
  v.innerHTML = '<div class="dmcon-drillh"><button class="dmcon-btn" id="dmcon-back">← ' + esc(t('back')) + '</button><h2>' + esc(t(d.tk)) + '</h2></div><div class="dmcon-card"><div class="dmcon-card-b" id="dmcon-dl"></div></div></div>';
  $('#dmcon-back').onclick = function () { S.drill = null; renderView(); };
  if (d.render) { d.render($('#dmcon-dl'), my); } else { listView($('#dmcon-dl'), my, d.mk()); }
}
function currentTab() { return APP.tabs.filter(function (x) { return x.id === S.tab; })[0] || APP.tabs[0]; }
function renderView() {
  var my = ++epoch, v = $('#dmcon-view');
  v.innerHTML = SKEL;
  Promise.resolve().then(function () { return APP.prepare(); }).then(function () {
    if (my !== epoch) { return; }
    v.innerHTML = ''; loadedAt = new Date();
    if (S.drill) { renderDrill(v, my); } else { currentTab().render(v, my); }
    $('#dmcon-foot').textContent = t('foot_ro') + ' — ' + t('loaded_at') + ': ' + loadedAt.toLocaleTimeString('en-GB'); setUpd();
  }, function (e) { if (my !== epoch) { return; } v.innerHTML = errBox(e); var b = v.querySelector('[data-retry]'); if (b) { b.onclick = renderView; } });
}
function setUpd() { var u = $('#dmcon-upd'); if (u) { u.textContent = loadedAt ? t('upd', { t: loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }) : ''; } }
function applyTheme() { try { var m = document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme-mode'); ROOT.classList.toggle('dmcon-dark', m === 'dark'); } catch (e) {} }
function boot() {
  applyTheme(); try { new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] }); } catch (e1) {}
  $('#dmcon-auto').onchange = function (ev) { clearInterval(AUTOT); if (ev.target.checked) { AUTOT = setInterval(function () { if (!document.hidden && !S.drill) { cache = {}; S.lv = {}; S.ctx = {}; renderView(); } }, 300000); } };
  $('#dmcon-lang').onclick = function () { S.lang = S.lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('dmcon-lang', S.lang); } catch (e) {} renderChrome(); renderView(); };
  $('#dmcon-refresh').onclick = function () { cache = {}; S.lv = {}; S.ctx = {}; renderView(); };
  S.tab = APP.tabs[0].id; renderChrome();
  Promise.resolve().then(function () { return APP.init ? APP.init() : null; }).then(function () { renderFilters(); renderView(); }, function () { renderFilters(); renderView(); });
}

/* =====================================================================
   DM CONTRACTING DEPARTMENT DASHBOARD  (application layer)
   ===================================================================== */
var DMCC = 'Durar Masagh Contracting Co.';
K('title', 'DM Contracting Department Dashboard', 'لوحة قسم المقاولات – دي إم');
K('subtitle', 'Projects, work progress, manpower, materials, equipment and cost control', 'المشاريع وسير العمل والقوى العاملة والمواد والمعدات وضبط التكاليف');
K('f_company', 'Company', 'الشركة'); K('f_scope', 'Contracting scope (default)', 'نطاق المقاولات (افتراضي)'); K('f_dept', 'Department', 'القسم'); K('f_project', 'Project (ID / name contains)', 'المشروع (يحتوي على)');
K('f_customer', 'Customer (contains)', 'العميل (يحتوي على)'); K('f_supplier', 'Supplier (contains)', 'المورد (يحتوي على)'); K('f_employee', 'Employee (contains)', 'الموظف (يحتوي على)'); K('f_wh', 'Warehouse', 'المستودع');
K('tab_ov', 'Department Overview', 'نظرة عامة على القسم'); K('tab_pr', 'Projects & Sites', 'المشاريع والمواقع'); K('tab_wp', 'Work Progress', 'تقدم العمل'); K('tab_mp', 'Manpower Management', 'إدارة القوى العاملة');
K('tab_mt', 'Materials & Procurement', 'المواد والمشتريات'); K('tab_eq', 'Equipment & Fleet', 'المعدات والأسطول'); K('tab_fi', 'Finance & Cost Control', 'المالية وضبط التكاليف');
K('tab_dl', 'Delays, Risks & Issues', 'التأخيرات والمخاطر والمشاكل'); K('tab_rp', 'Reports & Analytics', 'التقارير والتحليلات');
/* columns */
K('c_id', 'ID', 'الرقم'); K('c_name', 'Name', 'الاسم'); K('c_cust', 'Customer', 'العميل'); K('c_dept', 'Department', 'القسم'); K('c_start', 'Start Date', 'تاريخ البدء'); K('c_end', 'Expected End', 'الانتهاء المتوقع'); K('c_aend', 'Actual End', 'الانتهاء الفعلي');
K('c_status', 'Status', 'الحالة'); K('c_prio', 'Priority', 'الأولوية'); K('c_budget', 'Budget (Project.estimated_costing)', 'الميزانية (التكلفة المقدّرة)'); K('c_actual', 'Actual Cost', 'التكلفة الفعلية'); K('c_prog', 'Progress', 'التقدم'); K('c_method', 'Progress Method', 'طريقة التقدم');
K('c_subject', 'Task Subject', 'موضوع المهمة'); K('c_project', 'Project', 'المشروع'); K('c_asg', 'Assigned Employee', 'الموظف المسند'); K('c_tstart', 'Start Date', 'تاريخ البدء'); K('c_done', 'Completion Date', 'تاريخ الإنجاز'); K('c_over', 'Overdue Days', 'أيام التأخير');
K('c_emp', 'Employee', 'الموظف'); K('c_desig', 'Designation', 'المسمى الوظيفي'); K('c_branch', 'Branch', 'الفرع'); K('c_att', 'Attendance Today', 'حضور اليوم'); K('c_shift', 'Shift', 'الوردية'); K('c_hours', 'Working Hours', 'ساعات العمل'); K('c_tasks', 'Assigned Tasks', 'المهام المسندة'); K('c_tdone', 'Tasks Completed', 'المهام المكتملة'); K('c_ts', 'Timesheets', 'سجلات الوقت'); K('c_projs', 'Assigned Project(s)', 'المشاريع المسندة');
K('c_doc', 'Document', 'المستند'); K('c_type', 'Type', 'النوع'); K('c_item', 'Item Code', 'رمز الصنف'); K('c_iname', 'Item Name', 'اسم الصنف'); K('c_qty', 'Quantity', 'الكمية'); K('c_uom', 'UOM', 'الوحدة'); K('c_wh', 'Warehouse', 'المستودع'); K('c_date', 'Date', 'التاريخ'); K('c_sup', 'Supplier', 'المورد'); K('c_outq', 'Outstanding Qty', 'الكمية المتبقية'); K('c_recq', 'Received/Ordered Qty', 'الكمية المستلمة/المطلوبة');
K('c_sales', 'Sales Orders (Project)', 'أوامر البيع (المشروع)'); K('c_billed', 'Invoiced (Project)', 'المفوتر (المشروع)'); K('c_pcost', 'Purchase Cost', 'تكلفة الشراء'); K('c_mcost', 'Material Cost', 'تكلفة المواد'); K('c_tcost', 'Timesheet Cost', 'تكلفة الوقت'); K('c_margin', 'Gross Margin (ERP calc.)', 'هامش الربح (حساب ERP)'); K('c_util', 'Budget Utilization', 'استخدام الميزانية'); K('c_var', 'Cost Variance', 'انحراف التكلفة');
K('c_inv', 'Invoice', 'الفاتورة'); K('c_outst', 'Outstanding', 'المستحق'); K('c_due', 'Due Date', 'تاريخ الاستحقاق'); K('c_total', 'Grand Total', 'الإجمالي');
K('c_asset', 'Asset', 'الأصل'); K('c_aname', 'Asset Name', 'اسم الأصل'); K('c_cat', 'Category', 'الفئة'); K('c_loc', 'Location', 'الموقع'); K('c_cust2', 'Custodian', 'المسؤول'); K('c_img', 'Image', 'الصورة'); K('c_plate', 'Registration No.', 'رقم اللوحة'); K('c_model', 'Model', 'الطراز'); K('c_driver', 'Employee / Driver', 'الموظف / السائق'); K('c_odo', 'Last Odometer', 'آخر عداد'); K('c_failure', 'Failure Date', 'تاريخ العطل'); K('c_repair', 'Repair Status', 'حالة الإصلاح');
K('c_desc', 'Issue / Delay Description', 'وصف المشكلة / التأخير'); K('c_rdoc', 'Related Document', 'المستند المرتبط'); K('c_resp', 'Responsible', 'المسؤول'); K('c_exp', 'Expected Date', 'التاريخ المتوقع'); K('c_reason', 'Reason(s)', 'السبب'); K('c_count', 'Count', 'العدد'); K('c_pct', '%', '%'); K('c_month', 'Month', 'الشهر'); K('c_metric', 'Metric', 'المؤشر'); K('c_value', 'Value', 'القيمة');
K('c_bud', 'Budget', 'الميزانية'); K('c_fy', 'Fiscal Year', 'السنة المالية'); K('c_cc', 'Cost Center', 'مركز التكلفة'); K('c_against', 'Budget Against', 'الميزانية على');
/* KPI labels */
K('k_ptotal', 'Total Projects', 'إجمالي المشاريع'); K('k_pactive', 'Active Projects', 'المشاريع النشطة'); K('k_pdone', 'Completed Projects', 'المشاريع المكتملة'); K('k_phold', 'Projects on Hold', 'مشاريع معلّقة'); K('k_pdelay', 'Delayed Projects', 'مشاريع متأخرة');
K('k_pupc', 'Upcoming Project Deadlines (30 d)', 'مواعيد مشاريع قادمة (30 يوماً)'); K('k_pattn', 'Projects Requiring Attention', 'مشاريع تتطلب اهتماماً');
K('k_sites', 'Active Sites', 'المواقع النشطة'); K('k_sdone', 'Completed Site Activities (Tasks)', 'أنشطة موقع مكتملة (مهام)'); K('k_spend', 'Pending Site Activities (Tasks)', 'أنشطة موقع معلقة (مهام)'); K('k_sover', 'Overdue Site Activities (Tasks)', 'أنشطة موقع متأخرة (مهام)'); K('k_sappr', 'Pending Approvals', 'موافقات معلقة'); K('k_sissue', 'Open Issues / Site Requests', 'مشاكل / طلبات موقع مفتوحة');
K('k_massign', 'Total Assigned Employees', 'إجمالي الموظفين المسندين'); K('k_mactive', 'Employees on Active Projects', 'موظفون على مشاريع نشطة'); K('k_mpres', 'Assigned – Present Today', 'المسندون – حاضرون اليوم'); K('k_mabs', 'Assigned – Absent Today', 'المسندون – غائبون اليوم'); K('k_mleave', 'Assigned – On Leave Today', 'المسندون – في إجازة اليوم'); K('k_mts', 'Pending Timesheets (Draft)', 'سجلات وقت معلقة (مسودة)');
K('k_mdept', 'Department Roster (active employees)', 'قائمة القسم (موظفون نشطون)'); K('k_mdpres', 'Department – Present Today', 'القسم – حاضرون اليوم'); K('k_mdabs', 'Department – Absent Today', 'القسم – غائبون اليوم'); K('k_mdleave', 'Department – On Leave Today', 'القسم – في إجازة اليوم');
K('k_xmr', 'Pending Material Requests', 'طلبات مواد معلقة'); K('k_xpo', 'Pending Purchase Orders', 'أوامر شراء معلقة'); K('k_xrcpt', 'Pending Material Receipts (PO lines)', 'استلامات مواد معلقة (بنود أوامر الشراء)'); K('k_xissue', 'Material Issues (Stock Entry)', 'صرف مواد (قيد مخزون)'); K('k_xrecv', 'Material Receipts (Stock Entry)', 'استلام مواد (قيد مخزون)'); K('k_xret', 'Material Returns (Delivery Note returns)', 'مرتجعات مواد (مرتجعات إشعار التسليم)');
K('k_xout_order', 'Outstanding to Order (MR lines)', 'متبقٍ للطلب (بنود طلب المواد)'); K('k_xout_recv', 'Outstanding to Receive (PO lines)', 'متبقٍ للاستلام (بنود أوامر الشراء)'); K('k_xrepl', 'Materials Requiring Replenishment', 'مواد تحتاج إعادة تموين');
K('k_etotal', 'Assets (visible to you)', 'الأصول (المتاحة لك)'); K('k_emaint', 'Assets In Maintenance', 'أصول قيد الصيانة'); K('k_eooo', 'Assets Out of Order', 'أصول معطّلة'); K('k_erepair', 'Pending Asset Repairs', 'إصلاحات أصول معلقة'); K('k_vehicles', 'Vehicles (visible to you)', 'المركبات (المتاحة لك)');
K('k_euse', 'Equipment in Use / Available', 'معدات قيد الاستخدام / متاحة'); K('k_eoverret', 'Overdue Equipment Returns', 'مرتجعات معدات متأخرة'); K('k_ealloc', 'Equipment Allocation by Project / Site', 'توزيع المعدات حسب المشروع / الموقع'); K('k_esched', 'Maintenance Schedules / Visits / Plans', 'جداول / زيارات / خطط الصيانة');
K('k_fbudget', 'Project Budget (estimated costing)', 'ميزانية المشاريع (التكلفة المقدّرة)'); K('k_factual', 'Actual Project Cost (ERP-recorded)', 'التكلفة الفعلية (مسجلة في ERP)'); K('k_futil', 'Budget Utilization', 'استخدام الميزانية'); K('k_fvar', 'Cost Variance (budgeted projects)', 'انحراف التكلفة (المشاريع ذات الميزانية)');
K('k_fcommit', 'Open Purchase Commitments', 'التزامات الشراء المفتوحة'); K('k_fsup', 'Supplier Outstanding (submitted)', 'مستحقات الموردين (مقدّمة)'); K('k_fcust', 'Customer Outstanding (submitted)', 'مستحقات العملاء (مقدّمة)'); K('k_frev', 'Project Revenue (invoiced)', 'إيراد المشاريع (مفوتر)'); K('k_fsales', 'Sales Orders Value', 'قيمة أوامر البيع'); K('k_fmargin', 'Gross Margin (ERP-calculated estimate)', 'هامش الربح (تقدير محسوب)');
K('k_fdsi', 'Draft Sales Invoices (not included)', 'فواتير مبيعات مسودة (غير محسوبة)'); K('k_fdpi', 'Draft Purchase Invoices (not included)', 'فواتير شراء مسودة (غير محسوبة)');
K('k_tall', 'All Tasks', 'جميع المهام'); K('k_tdone', 'Completed Tasks', 'المهام المكتملة'); K('k_tpend', 'Pending Tasks', 'المهام المعلقة'); K('k_tover', 'Overdue Tasks', 'المهام المتأخرة');
/* notes */
K('na_hold', 'Project.status only has Open / Completed / Cancelled in this ERP — there is no On Hold status.', 'حالة المشروع في هذا النظام: مفتوح / مكتمل / ملغى فقط — لا توجد حالة معلّق.');
K('na_site', 'Projects and Tasks have no Site / Location field in this ERP, so sites cannot be counted or grouped.', 'لا يوجد حقل موقع في المشاريع أو المهام، لذا لا يمكن عدّ المواقع أو تجميعها.');
K('na_appr', 'Approvals run through per-DocType workflows with no project link, so project-level pending approvals cannot be identified reliably.', 'تتم الموافقات عبر مسارات عمل لكل مستند دون ربط بالمشروع، لذا لا يمكن تحديدها.');
K('na_repl', 'Reorder levels are held in custom Item fields and Bins are not project-specific, so a reliable department-level replenishment list is not possible.', 'مستويات إعادة الطلب في حقول مخصصة والأرصدة غير مرتبطة بالمشروع.');
K('na_equse', 'Assets have no project/site allocation, return date or usage-status field, so in-use / available / overdue-return / allocation metrics cannot be calculated.', 'لا تحتوي الأصول على حقول تخصيص مشروع/موقع أو تاريخ إرجاع أو حالة استخدام.');
K('na_load', 'Could not load.', 'تعذّر التحميل.');
K('n_scope', 'Scope: projects where Company = "Durar Masagh Contracting Co." OR Project.custom_division = "Contracting" (change the Company filter to view a single company). Every project-linked figure below is limited to these projects. The date filter applies to transactions and trends; project and budget totals are cumulative.', 'النطاق: المشاريع التي الشركة فيها "Durar Masagh Contracting Co." أو القسم "Contracting". كل الأرقام المرتبطة بالمشاريع محدودة بهذه المشاريع. يطبَّق مرشح التاريخ على المعاملات والاتجاهات؛ إجماليات المشاريع والميزانيات تراكمية.');
K('n_link', 'Most ERP records are not linked to these projects (tasks, orders, invoices, stock entries and timesheets carry a project reference only occasionally). Zero values therefore mean "no linked records", not "no activity".', 'معظم السجلات غير مرتبطة بهذه المشاريع، لذا تعني القيمة صفر "لا سجلات مرتبطة" وليس "لا نشاط".');
K('n_prog', 'Progress = Project.percent_complete as stored by ERPNext (method shown per project: Manual / Task Completion / Task Progress / Task Weight). No progress is derived from document statuses. Task completion % in the detail view = completed tasks ÷ total tasks of the project.', 'التقدم = قيمة percent_complete المخزنة في ERPNext (الطريقة تظهر لكل مشروع). لا يُشتق تقدم من حالات المستندات. نسبة المهام في التفاصيل = المكتملة ÷ الإجمالي.');
K('n_delay', 'Delay rules: a project is delayed only when Status = Open and a valid Expected End Date is earlier than today. A task is overdue when its status is Overdue, or when it is not Completed/Cancelled and its Expected End Date is earlier than today. Missing dates are never treated as overdue.', 'قواعد التأخير: المشروع متأخر فقط إذا كانت حالته مفتوحة وتاريخ الانتهاء المتوقع قبل اليوم. لا تُعتبر التواريخ الفارغة تأخيراً.');
K('n_man', 'Assigned employees = distinct employees reached through Project User (user → Employee.user_id), ToDo assignments on the projects\' tasks, and Timesheets with that project. Department roster = active employees whose Department matches the projects\' departments (NOT a project assignment). Salary and contact details are never loaded.', 'الموظفون المسندون = الموظفون عبر مستخدمي المشروع وتكليفات ToDo وسجلات الوقت. قائمة القسم = موظفون نشطون في أقسام المشاريع (وليست تكليفاً). لا تُحمَّل الرواتب ولا بيانات الاتصال.');
K('n_mat', 'Quantities are shown per UOM and are never added across different UOMs. MR lines ("to order") and PO lines ("to receive") are different pipeline stages and are never summed together. Lines are read from the item tables where Project is set.', 'تُعرض الكميات لكل وحدة قياس ولا تُجمع عبر وحدات مختلفة. بنود طلب المواد وبنود أمر الشراء مراحل مختلفة ولا تُجمع.');
K('n_fin', 'Methodology — Budget: Project.estimated_costing. Actual cost: Project.total_costing_amount + total_purchase_cost + total_consumed_material_cost (values ERPNext maintains from submitted Timesheets, Purchase Invoices and Stock Entries). Utilization and variance use only projects whose budget is > 0. Revenue: Project.total_billed_amount (submitted Sales Invoices). Customer/Supplier outstanding: submitted Sales/Purchase Invoices linked to the projects (draft invoices are listed separately and excluded). Commitments: Σ(PO line amount − billed amount) on submitted POs, not double-counted with invoices. Gross margin is ERPNext\'s own estimate. Company-wide transactions are never allocated to projects.', 'المنهجية — الميزانية: estimated_costing. التكلفة الفعلية: مجموع total_costing_amount و total_purchase_cost و total_consumed_material_cost (تحدّثها ERPNext من المستندات المقدّمة). الإيراد: total_billed_amount. المستحقات: فواتير مقدّمة مرتبطة بالمشاريع (المسودات تُعرض منفصلة). الالتزامات: مجموع (مبلغ بند أمر الشراء − المفوتر). هامش الربح تقدير من ERPNext. لا تُوزَّع معاملات الشركة على المشاريع.');
K('n_bud', 'Budget DocTypes in this ERP are Cost-Center budgets (FY2024); no Project budgets exist, so budget-vs-actual by cost center is not computed — the budgets are listed for reference.', 'ميزانيات النظام مرتبطة بمراكز التكلفة (2024) ولا توجد ميزانيات مشاريع، لذا لا يُحسب الفعلي مقابل الميزانية لمراكز التكلفة؛ تُعرض الميزانيات للمرجع.');
K('n_eq', 'Equipment is not linked to projects in this ERP. Assets / Vehicles shown are all records visible to you (Company / Department filters apply to Assets). Images appear only where the record has an image file.', 'المعدات غير مرتبطة بالمشاريع. تُعرض كل الأصول/المركبات المتاحة لك. تظهر الصور فقط عند وجود ملف صورة.');
K('n_color', 'Colors — Green: completed · Blue: in progress · Yellow: pending · Orange: partial · Red: overdue/critical · Grey: on hold/cancelled.', 'الألوان — أخضر: مكتمل · أزرق: قيد التنفيذ · أصفر: معلق · برتقالي: جزئي · أحمر: متأخر/حرج · رمادي: معلّق/ملغى.');
K('n_rep', 'Reports use the filters above. Exports contain the fully loaded rows (up to 5,000 per report); a notice appears if a report was truncated.', 'تستخدم التقارير المرشحات أعلاه. يحتوي التصدير على الصفوف المحمّلة (حتى 5000)، ويظهر تنبيه عند الاقتطاع.');
K('scope_cap', 'Project scope was truncated at 2,000 projects.', 'تم اقتطاع نطاق المشاريع عند 2000 مشروع.');
K('sel_wh', 'Select a Warehouse in the filter bar to list its stock.', 'اختر مستودعاً من المرشحات لعرض مخزونه.');
/* panels */
K('p_status', 'Project Status Distribution', 'توزيع حالات المشاريع'); K('p_monthly', 'Monthly Project Activity (projects created)', 'النشاط الشهري للمشاريع (المشاريع المنشأة)'); K('p_compare', 'Project Completion Comparison (stored progress)', 'مقارنة إنجاز المشاريع (التقدم المخزّن)'); K('p_manpow', 'Manpower Allocation by Project', 'توزيع القوى العاملة حسب المشروع');
K('p_issued', 'Materials Issued by Project (Stock Entries)', 'المواد المصروفة حسب المشروع (قيود المخزون)'); K('p_equtil', 'Asset Status Distribution', 'توزيع حالات الأصول'); K('p_proc', 'Monthly Procurement Activity (POs)', 'النشاط الشهري للمشتريات (أوامر الشراء)'); K('p_attn', 'Projects Requiring Attention', 'مشاريع تتطلب اهتماماً');
K('p_recent', 'Recent Department Activity', 'النشاط الأخير للقسم'); K('p_plist', 'Project List', 'قائمة المشاريع'); K('p_pcards', 'Project Status Cards', 'بطاقات حالة المشاريع'); K('p_site', 'Site-wise Overview', 'نظرة عامة حسب الموقع'); K('p_dept', 'Department-wise Overview (substitute for sites)', 'نظرة عامة حسب القسم (بديل عن المواقع)');
K('p_timeline', 'Project Timeline (expected start → end)', 'الجدول الزمني للمشاريع (البدء ← الانتهاء المتوقع)'); K('p_upc', 'Upcoming Deadlines', 'المواعيد القادمة'); K('p_delayed', 'Delayed Projects', 'المشاريع المتأخرة'); K('p_tcomp', 'Completed vs Pending Tasks', 'المهام المكتملة مقابل المعلقة'); K('p_tproj', 'Project-wise Task Progress', 'تقدم المهام حسب المشروع');
K('p_temp', 'Employee-wise Task Allocation', 'توزيع المهام حسب الموظف'); K('p_tlist', 'Task List', 'قائمة المهام'); K('p_overd', 'Overdue Activities', 'الأنشطة المتأخرة'); K('p_miles', 'Upcoming Milestones (tasks flagged milestone)', 'المعالم القادمة (مهام محددة كمعلم)');
K('p_emptable', 'Employee Allocation', 'توزيع الموظفين'); K('p_roster', 'Department Roster (not a project assignment)', 'قائمة القسم (ليست تكليفاً بمشروع)'); K('p_atrend', 'Attendance Trend – Department (last 6 months)', 'اتجاه الحضور – القسم (آخر 6 أشهر)'); K('p_tspend', 'Pending Timesheets', 'سجلات الوقت المعلقة'); K('p_avail', 'Today\'s Availability – Assigned Employees', 'توفر اليوم – الموظفون المسندون');
K('p_mr', 'Material Request Lines', 'بنود طلبات المواد'); K('p_po', 'Purchase Order Lines', 'بنود أوامر الشراء'); K('p_se', 'Stock Entry Lines (issues / receipts / transfers)', 'بنود قيود المخزون (صرف / استلام / نقل)'); K('p_pipe', 'Procurement Pipeline (documents)', 'مسار المشتريات (مستندات)'); K('p_itemw', 'Item-wise Consumption (Stock Entry issues, per UOM)', 'الاستهلاك حسب الصنف (صرف المخزون، لكل وحدة)'); K('p_bin', 'Warehouse Stock (Bin)', 'مخزون المستودع (Bin)');
K('p_assets', 'Assets', 'الأصول'); K('p_vehicles', 'Vehicles', 'المركبات'); K('p_repairs', 'Asset Repairs', 'إصلاحات الأصول');
K('p_pfin', 'Project-wise Financial Summary', 'الملخص المالي حسب المشروع'); K('p_mtrend', 'Monthly Income & Expense (project-linked, submitted invoices)', 'الدخل والمصروف الشهري (فواتير مقدّمة مرتبطة بالمشاريع)'); K('p_bva', 'Budget vs Actual (projects with a budget)', 'الميزانية مقابل الفعلي (مشاريع ذات ميزانية)'); K('p_psi', 'Pending Customer Invoices', 'فواتير العملاء المعلقة'); K('p_ppi', 'Pending Supplier Invoices', 'فواتير الموردين المعلقة'); K('p_budgets', 'Cost-Center Budgets (reference)', 'ميزانيات مراكز التكلفة (للمرجع)');
K('p_delays', 'Delays, Risks & Open Items', 'التأخيرات والمخاطر والبنود المفتوحة'); K('p_dna', 'Not available in this ERP', 'غير متاح في هذا النظام');
K('p_det', 'Project Detail', 'تفاصيل المشروع'); K('p_dtasks', 'Related Tasks', 'المهام المرتبطة'); K('p_dman', 'Related Manpower', 'القوى العاملة المرتبطة'); K('p_dmat', 'Related Material Transactions', 'معاملات المواد المرتبطة'); K('p_deq', 'Related Equipment', 'المعدات المرتبطة'); K('p_dfin', 'Related Financial Records', 'السجلات المالية المرتبطة');
K('inc', 'Income', 'الدخل'); K('exp', 'Expense', 'المصروف'); K('lt_delayed', 'Delayed project', 'مشروع متأخر'); K('lt_task', 'Overdue task', 'مهمة متأخرة'); K('lt_po', 'PO line past required date, not fully received', 'بند أمر شراء تجاوز التاريخ المطلوب دون استلام كامل'); K('lt_mr', 'MR line past required date, not fully ordered', 'بند طلب مواد تجاوز التاريخ المطلوب دون طلب كامل'); K('lt_upc', 'Deadline within 14 days', 'موعد خلال 14 يوماً'); K('lt_overrun', 'Cost exceeds budget', 'التكلفة تتجاوز الميزانية'); K('lt_issue', 'Open issue', 'مشكلة مفتوحة'); K('lt_repair', 'Pending asset repair', 'إصلاح أصل معلق');
K('st_Critical', 'Critical', 'حرج'); K('st_Partially Completed', 'Partially Completed', 'مكتمل جزئياً'); K('st_Upcoming', 'Upcoming', 'قادم'); K('st_Active', 'Active', 'نشط'); K('st_Medium', 'Medium', 'متوسط'); K('st_High', 'High', 'عالٍ'); K('st_Low', 'Low', 'منخفض'); K('st_Urgent', 'Urgent', 'عاجل');
K('rep_perf', 'Project performance report', 'تقرير أداء المشاريع'); K('rep_tproj', 'Project-wise task completion', 'إنجاز المهام حسب المشروع'); K('rep_site', 'Site-wise progress', 'التقدم حسب الموقع'); K('rep_man', 'Manpower allocation report', 'تقرير توزيع القوى العاملة'); K('rep_att', 'Attendance summary (department)', 'ملخص الحضور (القسم)');
K('rep_mat', 'Material consumption report', 'تقرير استهلاك المواد'); K('rep_proc', 'Procurement status report', 'تقرير حالة المشتريات'); K('rep_equip', 'Equipment status report', 'تقرير حالة المعدات'); K('rep_bva', 'Project budget vs actual report', 'تقرير الميزانية مقابل الفعلي'); K('rep_delay', 'Delayed activities report', 'تقرير الأنشطة المتأخرة'); K('rep_month', 'Monthly department performance', 'الأداء الشهري للقسم');
K('open_report', 'Open report', 'فتح التقرير'); K('back_list', 'Open project detail', 'فتح تفاصيل المشروع'); K('erp_doc', 'Open in ERP', 'فتح في ERP'); K('proj_created', 'Projects created', 'مشاريع أنشأت'); K('tasks_completed', 'Tasks completed', 'مهام مكتملة'); K('projs_completed', 'Projects completed', 'مشاريع مكتملة'); K('pos_created', 'Purchase orders', 'أوامر شراء'); K('no_proj', 'No projects match the current scope and filters.', 'لا توجد مشاريع ضمن النطاق والمرشحات الحالية.');
K('st_Not marked', 'Not marked', 'غير مسجل'); K('dt_Task', 'Task', 'مهمة'); K('dt_Project', 'Project', 'مشروع'); K('dt_Purchase Order', 'Purchase Order', 'أمر شراء'); K('dt_Material Request', 'Material Request', 'طلب مواد'); K('dt_Stock Entry', 'Stock Entry', 'قيد مخزون'); K('dt_Issue', 'Issue', 'مشكلة');

var APP = { filters: [], tabs: [] };
APP.filters = [
  { k: 'company', type: 'select', lbl: 'f_company', opts: function () { return [{ v: '', lk: 'f_scope' }].concat((S.ctx.companies || []).map(function (c) { return { v: c, l: c }; })); } },
  { k: 'department', type: 'select', lbl: 'f_dept', opts: function () { return [{ v: '', lk: 'all' }].concat((S.ctx.departments || []).map(function (c) { return { v: c, l: c }; })); } },
  { k: 'project', type: 'text', lbl: 'f_project' }, { k: 'customer', type: 'text', lbl: 'f_customer' }, { k: 'supplier', type: 'text', lbl: 'f_supplier' }, { k: 'employee', type: 'text', lbl: 'f_employee' },
  { k: 'warehouse', type: 'select', lbl: 'f_wh', opts: function () { return [{ v: '', lk: 'all' }].concat((S.ctx.warehouses || []).map(function (c) { return { v: c, l: c }; })); } },
  { k: 'from', type: 'date', lbl: 'from' }, { k: 'to', type: 'date', lbl: 'to' },
  { k: 'ds', type: 'select', lbl: 'docstatus', opts: function () { return [{ v: '', lk: 'all' }, { v: '0', lk: 'st_Draft' }, { v: '1', lk: 'st_Submitted' }, { v: '2', lk: 'st_Cancelled' }]; } }
];
APP.tabs = [
  { id: 'ov', label: 'tab_ov', render: tabOverview }, { id: 'pr', label: 'tab_pr', render: tabProjects }, { id: 'wp', label: 'tab_wp', render: tabWork }, { id: 'mp', label: 'tab_mp', render: tabManpower },
  { id: 'mt', label: 'tab_mt', render: tabMaterials }, { id: 'eq', label: 'tab_eq', render: tabEquipment }, { id: 'fi', label: 'tab_fi', render: tabFinance }, { id: 'dl', label: 'tab_dl', render: tabDelays }, { id: 'rp', label: 'tab_rp', render: tabReports }
];

/* ---------- scope ---------- */
var PF = ['name', 'project_name', 'status', 'percent_complete', 'percent_complete_method', 'expected_start_date', 'expected_end_date', 'actual_end_date', 'customer', 'company', 'department', 'cost_center', 'priority', 'project_type', 'custom_division', 'estimated_costing', 'total_costing_amount', 'total_purchase_cost', 'total_consumed_material_cost', 'total_sales_amount', 'total_billed_amount', 'gross_margin', 'creation'];
APP.init = function () {
  S.f.from = addMonths(monthStart(TODAY), -11); S.f.to = TODAY; S.f.ds = '';
  ROOT.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-pd]'); if (a) { e.preventDefault(); openProject(a.getAttribute('data-pd')); } });
  return Promise.all([
    gl('Company', { fields: ['name'], limit: 100 }).then(function (r) { S.ctx.companies = r.map(function (x) { return x.name; }); }),
    gl('Department', { fields: ['name'], filters: [['disabled', '=', 0]], order: 'name asc', limit: 300 }).then(function (r) { S.ctx.departments = r.map(function (x) { return x.name; }); }, function () { S.ctx.departments = []; }),
    gl('Warehouse', { fields: ['name'], filters: [['disabled', '=', 0], ['is_group', '=', 0]], order: 'name asc', limit: 300 }).then(function (r) { S.ctx.warehouses = r.map(function (x) { return x.name; }); }, function () { S.ctx.warehouses = []; })
  ]);
};
function loadScope() {
  var f = [], or = null;
  if (S.f.company) { f.push(['company', '=', S.f.company]); } else { or = [['company', '=', DMCC], ['custom_division', '=', 'Contracting']]; }
  if (S.f.department) { f.push(['department', '=', S.f.department]); }
  return fetchAll('Project', { fields: PF, filters: f, or: or, order: 'modified desc' }, 2000).then(function (r) {
    var rows = r.rows, pt = (S.f.project || '').toLowerCase(), cu = (S.f.customer || '').toLowerCase();
    if (pt) { rows = rows.filter(function (p) { return (p.name + ' ' + (p.project_name || '')).toLowerCase().indexOf(pt) >= 0; }); }
    if (cu) { rows = rows.filter(function (p) { return (p.customer || '').toLowerCase().indexOf(cu) >= 0; }); }
    S.ctx.scope = { projects: rows, names: rows.map(function (p) { return p.name; }), total: r.total, truncated: r.truncated };
    S.ctx.pmap = {}; rows.forEach(function (p) { S.ctx.pmap[p.name] = p; });
  });
}
APP.prepare = function () { var key = JSON.stringify([S.f.company, S.f.department, S.f.project, S.f.customer]); if (S.ctx.key !== key || !S.ctx.scopeP) { S.ctx.key = key; S.ctx.scopeP = loadScope(); } return S.ctx.scopeP; };
function SC() { return S.ctx.scope; }
function PIN() { return SC().names.length ? SC().names : NONE; }
function SK() { return JSON.stringify([S.ctx.key, S.f.from, S.f.to, S.f.ds, S.f.supplier, S.f.warehouse, S.f.employee]); }
function mm(name, fn) { return memo(name + '|' + SK(), fn); }
function dsF(field) { var f = [[field || 'docstatus', '<', 2]]; if (S.f.ds !== '' && S.f.ds !== undefined) { f = [['docstatus', '=', Number(S.f.ds)]]; } return f; }
function inRange(d) { return d && d >= (S.f.from || '0000') && d <= (S.f.to || '9999'); }
function isOpen(p) { return p.status === 'Open'; }
function isDelayed(p) { return isOpen(p) && p.expected_end_date && p.expected_end_date < TODAY; }
function isUpcoming(p) { return isOpen(p) && p.expected_end_date && p.expected_end_date >= TODAY && p.expected_end_date <= addDays(TODAY, 30); }
function projPill(p) { if (p.status === 'Completed') { return pill(st('Completed'), 'g'); } if (p.status === 'Cancelled') { return pill(st('Cancelled'), 'n'); } return isDelayed(p) ? pill(st('Overdue'), 'r') : pill(st('In Progress'), 'b'); }
function projLink(p) { return '<a href="#" class="dmcon-lnk" data-pd="' + esc(p.name) + '">' + esc(p.name) + '</a> <a class="dmcon-lnk" target="_blank" rel="noopener" title="' + esc(t('erp_doc')) + '" href="' + esc(docUrl('Project', p.name)) + '">↗</a>'; }
function projCols() {
  return [
    { h: 'c_id', c: function (p) { return p.name; }, f: projLink }, { h: 'c_name', c: function (p) { return p.project_name || ''; } }, { h: 'c_cust', c: function (p) { return p.customer || ''; } }, { h: 'c_dept', c: function (p) { return p.department || ''; } },
    { h: 'c_start', c: function (p) { return p.expected_start_date || ''; } }, { h: 'c_end', c: function (p) { return p.expected_end_date || ''; } }, { h: 'c_aend', c: function (p) { return p.actual_end_date || ''; } },
    { h: 'c_status', c: function (p) { return p.status === 'Open' && isDelayed(p) ? st('Overdue') : st(p.status); }, f: projPill }, { h: 'c_prio', c: function (p) { return p.priority || ''; } },
    { h: 'c_budget', num: true, c: function (p) { return p.estimated_costing > 0 ? n(p.estimated_costing, 2) : ''; } },
    { h: 'c_actual', num: true, c: function (p) { return actualCost(p) > 0 ? n(actualCost(p), 2) : ''; } },
    { h: 'c_prog', c: function (p) { return n(p.percent_complete, 0) + '%'; }, f: function (p) { return pbar(p.percent_complete, p.status === 'Completed' ? COL.g : COL.b); } }, { h: 'c_method', c: function (p) { return p.percent_complete_method || ''; } }
  ];
}
function actualCost(p) { return (Number(p.total_costing_amount) || 0) + (Number(p.total_purchase_cost) || 0) + (Number(p.total_consumed_material_cost) || 0); }
function pSpec(id, pred, order) { var rows = SC().projects.filter(pred || function () { return true; }); if (order) { rows = rows.slice().sort(order); } return { id: id, rows: rows, cols: projCols() }; }
function byEnd(a, b) { return String(a.expected_end_date || '9999').localeCompare(String(b.expected_end_date || '9999')); }
function sSpec(id, rowsP, cols) { return { id: id, rowsP: rowsP, cols: cols }; }
function simple(items, k) { return items.length ? '<ul class="dmcon-list">' + items.join('') + '</ul>' : '<div class="dmcon-empty">' + esc(t(k || 'empty')) + '</div>'; }
function addPanel(el, k, cls) { var p = panel(k, cls); el.insertAdjacentHTML('beforeend', p.html); return pel(p); }
function addGrid(v, cls) { var g = document.createElement('div'); g.className = 'dmcon-grid ' + cls; v.appendChild(g); return g; }
function addKpis(v, my, defs) { var g = addGrid(v, 'dmcon-kg'); kpis(g, my, defs); }
function listPanel(el, my, k, spec) { listView(addPanel(el, k), my, spec); }
function infoBox(v, keys, cls) { v.insertAdjacentHTML('beforeend', '<div class="dmcon-' + (cls || 'info') + '">' + keys.map(function (k) { return esc(t(k)); }).join(' ') + '</div>'); }
function scopeNote(v) { infoBox(v, ['n_scope', 'n_link']); if (SC().truncated) { infoBox(v, ['scope_cap'], 'note'); } if (!SC().names.length) { infoBox(v, ['no_proj'], 'note'); } }
function kv(label, value) { return '<div><span>' + esc(t(label)) + '</span><b>' + esc(value === null || value === undefined || value === '' ? '—' : value) + '</b></div>'; }
function moneyHtml(v) { return n(v, 2); }
function qtyHtml(m) { var ks = Object.keys(m).filter(function (k) { return m[k]; }); return ks.length ? ks.map(function (u) { return n(m[u], 2) + ' <small>' + esc(u) + '</small>'; }).join(' · ') : '0'; }

/* ---------- tasks (server-side) ---------- */
var OPEN_ST = ['Open', 'Working', 'Pending Review'], DONE_ST = ['Completed', 'Cancelled', 'Template'];
function tkF(extra) { return [['project', 'in', PIN()]].concat(extra || []); }
var OVR = function () { return [['status', '=', 'Overdue'], ['exp_end_date', '<', TODAY]]; };
function empNames(users) { if (!users.length) { return Promise.resolve({}); } return gl('Employee', { fields: ['user_id', 'employee_name'], filters: [['user_id', 'in', users]], limit: 500 }).then(function (r) { var m = {}; r.forEach(function (e) { m[e.user_id] = e.employee_name; }); return m; }, function () { return {}; }); }
function tkPost(rows) {
  if (!rows.length) { return rows; }
  return gl('ToDo', { fields: ['reference_name', 'allocated_to'], filters: [['reference_type', '=', 'Task'], ['reference_name', 'in', rows.map(function (r) { return r.name; })], ['status', '!=', 'Cancelled']], limit: 500 }).then(function (td) {
    var m = {}; td.forEach(function (x) { (m[x.reference_name] = m[x.reference_name] || []).push(x.allocated_to); });
    return empNames(uniq(td.map(function (x) { return x.allocated_to; }))).then(function (en) { rows.forEach(function (r) { r._asg = (m[r.name] || []).map(function (u) { return en[u] || u; }).join(', '); }); return rows; });
  }, function () { return rows; });
}
function tOver(r) { return r.exp_end_date && DONE_ST.indexOf(r.status) < 0 && r.exp_end_date < TODAY ? daysBetween(r.exp_end_date, TODAY) : ''; }
function tkSpec(id, extra, order, orf) {
  return {
    id: id, dt: 'Task', fields: ['name', 'subject', 'project', 'priority', 'exp_start_date', 'exp_end_date', 'act_end_date', 'completed_on', 'progress', 'status'], filters: tkF(extra), or: orf, order: order || 'exp_end_date asc', search: ['subject', 'name'], post: tkPost,
    cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Task', r.name); } }, { h: 'c_subject', c: function (r) { return r.subject; } }, { h: 'c_project', c: function (r) { return r.project || ''; }, f: function (r) { return r.project ? '<a href="#" class="dmcon-lnk" data-pd="' + esc(r.project) + '">' + esc(r.project) + '</a>' : ''; } },
      { h: 'c_asg', c: function (r) { return r._asg || ''; } }, { h: 'c_prio', c: function (r) { return r.priority || ''; } }, { h: 'c_tstart', c: function (r) { return r.exp_start_date || ''; } }, { h: 'c_end', c: function (r) { return r.exp_end_date || ''; } }, { h: 'c_done', c: function (r) { return r.completed_on || r.act_end_date || ''; } },
      { h: 'c_prog', c: function (r) { return r.progress === null ? '' : n(r.progress, 0) + '%'; }, f: function (r) { return pbar(r.progress, COL.b); } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_over', num: true, c: tOver }]
  };
}
var TK = {
  all: function () { return { label: 'k_tall', tone: 'blue', load: function () { return cnt('Task', { filters: tkF() }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_all', []); } }; },
  done: function (lab) { return { label: lab || 'k_tdone', tone: 'green', load: function () { return cnt('Task', { filters: tkF([['status', '=', 'Completed']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_done', [['status', '=', 'Completed']], 'modified desc'); } }; },
  pend: function (lab) { return { label: lab || 'k_tpend', tone: 'yellow', load: function () { return cnt('Task', { filters: tkF([['status', 'in', OPEN_ST]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_pend', [['status', 'in', OPEN_ST]]); } }; },
  over: function (lab) { return { label: lab || 'k_tover', tone: 'red', load: function () { return cnt('Task', { filters: tkF([['status', 'not in', DONE_ST]]), or: OVR() }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_over', [['status', 'not in', DONE_ST]], 'exp_end_date asc', OVR()); } }; }
};
/* ---------- projects KPIs ---------- */
var PK = {
  total: function () { return { label: 'k_ptotal', tone: 'blue', load: function () { return Promise.resolve({ v: SC().projects.length }); }, spec: function () { return pSpec('pk_total'); } }; },
  active: function () { return { label: 'k_pactive', tone: 'blue', load: function () { return Promise.resolve({ v: SC().projects.filter(isOpen).length }); }, spec: function () { return pSpec('pk_act', isOpen); } }; },
  done: function () { return { label: 'k_pdone', tone: 'green', load: function () { return Promise.resolve({ v: SC().projects.filter(function (p) { return p.status === 'Completed'; }).length }); }, spec: function () { return pSpec('pk_done', function (p) { return p.status === 'Completed'; }); } }; },
  hold: function () { return { label: 'k_phold', tone: 'grey', unavail: 'na_hold' }; },
  delay: function () { return { label: 'k_pdelay', tone: 'red', load: function () { return Promise.resolve({ v: SC().projects.filter(isDelayed).length }); }, spec: function () { return pSpec('pk_delay', isDelayed, byEnd); } }; },
  upc: function () { return { label: 'k_pupc', tone: 'orange', load: function () { return Promise.resolve({ v: SC().projects.filter(isUpcoming).length }); }, spec: function () { return pSpec('pk_upc', isUpcoming, byEnd); } }; },
  attn: function () { return { label: 'k_pattn', tone: 'red', load: function () { return attention().then(function (a) { return { v: a.length }; }); }, spec: function () { return attnSpec('pk_attn'); } }; }
};
/* projects requiring attention = delayed OR overdue task OR PO line past date OR cost above a stated budget (all measurable) */
function attention() {
  return mm('attn', function () {
    return Promise.all([
      SC().names.length ? fetchAll('Task', { fields: ['project'], filters: tkF([['status', 'not in', DONE_ST]]), or: OVR() }, 2000) : Promise.resolve({ rows: [] }),
      poLines()
    ]).then(function (r) {
      var reasons = {}; function add(p, k) { (reasons[p] = reasons[p] || []).indexOf(k) < 0 && reasons[p].push(k); }
      SC().projects.forEach(function (p) { if (isDelayed(p)) { add(p.name, 'lt_delayed'); } if (p.estimated_costing > 0 && actualCost(p) > p.estimated_costing) { add(p.name, 'lt_overrun'); } });
      r[0].rows.forEach(function (x) { add(x.project, 'lt_task'); });
      r[1].filter(function (l) { return l.open && l.schedule_date && l.schedule_date < TODAY && l.qty > l.received_qty; }).forEach(function (l) { add(l.project, 'lt_po'); });
      return Object.keys(reasons).filter(function (k) { return SC().names.indexOf(k) >= 0; }).map(function (k) { return { p: S.ctx.pmap[k], reasons: reasons[k] }; });
    });
  });
}
function attnSpec(id) { return sSpec(id, function () { return attention(); }, [{ h: 'c_id', c: function (r) { return r.p.name; }, f: function (r) { return projLink(r.p); } }, { h: 'c_name', c: function (r) { return r.p.project_name || ''; } }, { h: 'c_cust', c: function (r) { return r.p.customer || ''; } }, { h: 'c_end', c: function (r) { return r.p.expected_end_date || ''; } }, { h: 'c_reason', c: function (r) { return r.reasons.map(function (k) { return t(k); }).join('; '); }, f: function (r) { return r.reasons.map(function (k) { return pill(t(k), 'r'); }).join(' '); } }]); }

/* ---------- materials loaders (line tables carry the project; headers carry status) ---------- */
function withHeaders(dt, hfields, lines) {
  var parents = uniq(lines.map(function (l) { return l.parent; }));
  if (!parents.length) { return Promise.resolve([]); }
  return Promise.all(chunk(parents, 400).map(function (c) { return gl(dt, { fields: hfields, filters: [['name', 'in', c]], limit: 400 }); })).then(function (ps) {
    var hm = {}; ps.forEach(function (p) { p.forEach(function (h) { hm[h.name] = h; }); });
    return lines.map(function (l) { return { l: l, h: hm[l.parent] || {} }; });
  });
}
function poLines() {
  return mm('polines', function () {
    if (!SC().names.length) { return Promise.resolve([]); }
    return fetchAll('Purchase Order Item', { parent: 'Purchase Order', fields: ['parent', 'item_code', 'item_name', 'qty', 'received_qty', 'billed_amt', 'amount', 'uom', 'warehouse', 'project', 'schedule_date', 'docstatus'], filters: [['project', 'in', PIN()], ['docstatus', '<', 2]] }, 2000).then(function (r) {
      return withHeaders('Purchase Order', ['name', 'status', 'transaction_date', 'supplier', 'docstatus'], r.rows).then(function (rows) {
        return rows.map(function (x) { var l = x.l, h = x.h; return { parent: l.parent, item_code: l.item_code, item_name: l.item_name, qty: Number(l.qty) || 0, received_qty: Number(l.received_qty) || 0, billed_amt: Number(l.billed_amt) || 0, amount: Number(l.amount) || 0, uom: l.uom, warehouse: l.warehouse, project: l.project, schedule_date: l.schedule_date, docstatus: h.docstatus === undefined ? l.docstatus : h.docstatus, status: h.status, date: h.transaction_date, supplier: h.supplier, open: h.docstatus === 1 && ['Closed', 'Cancelled', 'Completed'].indexOf(h.status) < 0 }; });
      });
    });
  });
}
function mrLines() {
  return mm('mrlines', function () {
    if (!SC().names.length) { return Promise.resolve([]); }
    return fetchAll('Material Request Item', { parent: 'Material Request', fields: ['parent', 'item_code', 'item_name', 'qty', 'ordered_qty', 'uom', 'warehouse', 'project', 'schedule_date', 'docstatus'], filters: [['project', 'in', PIN()], ['docstatus', '<', 2]] }, 2000).then(function (r) {
      return withHeaders('Material Request', ['name', 'status', 'transaction_date', 'material_request_type', 'docstatus'], r.rows).then(function (rows) {
        return rows.map(function (x) { var l = x.l, h = x.h; return { parent: l.parent, item_code: l.item_code, item_name: l.item_name, qty: Number(l.qty) || 0, ordered_qty: Number(l.ordered_qty) || 0, uom: l.uom, warehouse: l.warehouse, project: l.project, schedule_date: l.schedule_date, docstatus: h.docstatus === undefined ? l.docstatus : h.docstatus, status: h.status, date: h.transaction_date, open: h.docstatus === 1 && ['Pending', 'Partially Ordered'].indexOf(h.status) >= 0 }; });
      });
    });
  });
}
function seLines() {
  return mm('selines', function () {
    if (!SC().names.length) { return Promise.resolve([]); }
    return fetchAll('Stock Entry', { fields: ['name', 'stock_entry_type', 'posting_date', 'docstatus', 'project'], filters: [['project', 'in', PIN()], ['docstatus', '<', 2]] }, 2000).then(function (h) {
      if (!h.rows.length) { return []; }
      var hm = {}; h.rows.forEach(function (x) { hm[x.name] = x; });
      return Promise.all(chunk(h.rows.map(function (x) { return x.name; }), 300).map(function (c) { return fetchAll('Stock Entry Detail', { parent: 'Stock Entry', fields: ['parent', 'item_code', 'item_name', 'qty', 'uom', 's_warehouse', 't_warehouse'], filters: [['parent', 'in', c]] }, 2000); })).then(function (ps) {
        var rows = []; ps.forEach(function (p) { p.rows.forEach(function (l) { var x = hm[l.parent] || {}; rows.push({ parent: l.parent, type: x.stock_entry_type, item_code: l.item_code, item_name: l.item_name, qty: Number(l.qty) || 0, uom: l.uom, warehouse: l.s_warehouse || l.t_warehouse, s_wh: l.s_warehouse, t_wh: l.t_warehouse, project: x.project, date: x.posting_date, docstatus: x.docstatus }); }); });
        return rows;
      });
    });
  });
}
function whOk(w) { return !S.f.warehouse || (w && w.indexOf(S.f.warehouse) === 0 && w === S.f.warehouse); }
function supOk(s) { return !S.f.supplier || (s || '').toLowerCase().indexOf(S.f.supplier.toLowerCase()) >= 0; }
function dsOk(d) { return S.f.ds === '' || S.f.ds === undefined ? d < 2 : d === Number(S.f.ds); }
function poView() { return poLines().then(function (rows) { return rows.filter(function (r) { return (!r.date || inRange(r.date)) && supOk(r.supplier) && whOk(r.warehouse) && dsOk(r.docstatus); }); }); }
function mrView() { return mrLines().then(function (rows) { return rows.filter(function (r) { return (!r.date || inRange(r.date)) && whOk(r.warehouse) && dsOk(r.docstatus); }); }); }
function seView() { return seLines().then(function (rows) { return rows.filter(function (r) { return inRange(r.date) && (!S.f.warehouse || r.s_wh === S.f.warehouse || r.t_wh === S.f.warehouse) && dsOk(r.docstatus); }); }); }
function lineCols(kind) {
  var c = [{ h: 'c_doc', c: function (r) { return r.parent; }, f: function (r) { return link(kind === 'po' ? 'Purchase Order' : kind === 'mr' ? 'Material Request' : 'Stock Entry', r.parent); } }];
  if (kind === 'se') { c.push({ h: 'c_type', c: function (r) { return r.type || ''; } }); }
  c = c.concat([{ h: 'c_project', c: function (r) { return r.project || ''; }, f: function (r) { return r.project ? '<a href="#" class="dmcon-lnk" data-pd="' + esc(r.project) + '">' + esc(r.project) + '</a>' : ''; } }, { h: 'c_item', c: function (r) { return r.item_code || ''; } }, { h: 'c_iname', c: function (r) { return r.item_name || ''; } }, { h: 'c_qty', num: true, c: function (r) { return n(r.qty, 2); } }, { h: 'c_uom', c: function (r) { return r.uom || ''; } }, { h: 'c_wh', c: function (r) { return r.warehouse || ''; } }, { h: 'c_date', c: function (r) { return r.date || ''; } }]);
  if (kind === 'po') { c.push({ h: 'c_sup', c: function (r) { return r.supplier || ''; } }); }
  if (kind === 'po' || kind === 'mr') { c.push({ h: 'c_outq', num: true, c: function (r) { return n(Math.max(0, r.qty - (kind === 'po' ? r.received_qty : r.ordered_qty)), 2); } }); }
  c.push({ h: 'c_status', c: function (r) { return r.status ? st(r.status) : (r.docstatus === 1 ? st('Submitted') : st('Draft')); }, f: function (r) { return r.status ? spill(r.status) : dpill(r.docstatus); } });
  return c;
}
function poPendingHeaders(rows) { var m = {}; rows.filter(function (r) { return r.docstatus === 1 && ['To Receive and Bill', 'To Receive'].indexOf(r.status) >= 0; }).forEach(function (r) { m[r.parent] = r; }); return Object.keys(m).map(function (k) { return m[k]; }); }
function uomOut(rows, f) { var m = {}; rows.forEach(function (r) { var o = f(r); if (o > 0) { m[r.uom || '—'] = (m[r.uom || '—'] || 0) + o; } }); return m; }
var XK = {
  mr: function () { return { label: 'k_xmr', tone: 'yellow', load: function () { return mrView().then(function (rows) { var u = {}; rows.filter(function (r) { return r.open; }).forEach(function (r) { u[r.parent] = 1; }); return { v: Object.keys(u).length }; }); }, spec: function () { return sSpec('xk_mr', function () { return mrView().then(function (r) { return r.filter(function (x) { return x.open; }); }); }, lineCols('mr')); } }; },
  po: function () { return { label: 'k_xpo', tone: 'yellow', load: function () { return poView().then(function (rows) { return { v: poPendingHeaders(rows).length }; }); }, spec: function () { return sSpec('xk_po', function () { return poView().then(poPendingHeaders); }, lineCols('po')); } }; },
  rcpt: function () { return { label: 'k_xrcpt', tone: 'orange', load: function () { return poView().then(function (rows) { return { v: rows.filter(function (r) { return r.open && r.qty > r.received_qty; }).length }; }); }, spec: function () { return sSpec('xk_rcpt', function () { return poView().then(function (r) { return r.filter(function (x) { return x.open && x.qty > x.received_qty; }); }); }, lineCols('po')); } }; },
  issue: function () { return { label: 'k_xissue', tone: 'blue', load: function () { return seView().then(function (rows) { return { v: uniq(rows.filter(function (r) { return r.type === 'Material Issue' && r.docstatus === 1; }).map(function (r) { return r.parent; })).length }; }); }, spec: function () { return sSpec('xk_issue', function () { return seView().then(function (r) { return r.filter(function (x) { return x.type === 'Material Issue'; }); }); }, lineCols('se')); } }; },
  recv: function () { return { label: 'k_xrecv', tone: 'green', load: function () { return seView().then(function (rows) { return { v: uniq(rows.filter(function (r) { return r.type === 'Material Receipt' && r.docstatus === 1; }).map(function (r) { return r.parent; })).length }; }); }, spec: function () { return sSpec('xk_recv', function () { return seView().then(function (r) { return r.filter(function (x) { return x.type === 'Material Receipt'; }); }); }, lineCols('se')); } }; },
  ret: function () { return { label: 'k_xret', tone: 'orange', load: function () { return cnt('Delivery Note', { filters: [['project', 'in', PIN()], ['is_return', '=', 1], ['docstatus', '=', 1]] }).then(function (v) { return { v: v }; }); }, spec: function () { return { id: 'xk_ret', dt: 'Delivery Note', fields: ['name', 'posting_date', 'customer', 'project', 'docstatus'], filters: [['project', 'in', PIN()], ['is_return', '=', 1], ['docstatus', '=', 1]], order: 'posting_date desc', search: ['name', 'customer'], cols: [{ h: 'c_doc', c: function (r) { return r.name; }, f: function (r) { return link('Delivery Note', r.name); } }, { h: 'c_date', c: function (r) { return r.posting_date; } }, { h: 'c_cust', c: function (r) { return r.customer || ''; } }, { h: 'c_project', c: function (r) { return r.project || ''; } }] }; } }; },
  outOrder: function () { return { label: 'k_xout_order', tone: 'orange', load: function () { return mrView().then(function (rows) { return { html: qtyHtml(uomOut(rows.filter(function (r) { return r.open; }), function (r) { return r.qty - r.ordered_qty; })) }; }); }, spec: function () { return sSpec('xk_oo', function () { return mrView().then(function (r) { return r.filter(function (x) { return x.open && x.qty > x.ordered_qty; }); }); }, lineCols('mr')); } }; },
  outRecv: function () { return { label: 'k_xout_recv', tone: 'orange', load: function () { return poView().then(function (rows) { return { html: qtyHtml(uomOut(rows.filter(function (r) { return r.open; }), function (r) { return r.qty - r.received_qty; })) }; }); }, spec: function () { return sSpec('xk_or', function () { return poView().then(function (r) { return r.filter(function (x) { return x.open && x.qty > x.received_qty; }); }); }, lineCols('po')); } }; },
  repl: function () { return { label: 'k_xrepl', tone: 'grey', unavail: 'na_repl' }; }
};

/* ---------- manpower ---------- */
var EF = ['name', 'employee_name', 'designation', 'department', 'branch', 'user_id'];
function assigned(openOnly) {
  return mm('assigned' + openOnly, function () {
    var names = openOnly ? SC().projects.filter(isOpen).map(function (p) { return p.name; }) : SC().names;
    if (!names.length) { return Promise.resolve([]); }
    return Promise.all([
      fetchAll('Project User', { parent: 'Project', fields: ['parent', 'user'], filters: [['parent', 'in', names]] }, 2000).catch(function () { return { rows: [] }; }),
      fetchAll('Task', { fields: ['name', 'project', 'status'], filters: [['project', 'in', names]] }, 2000),
      fetchAll('Timesheet', { fields: ['employee', 'parent_project', 'status', 'docstatus'], filters: [['parent_project', 'in', names], ['docstatus', '<', 2]] }, 2000)
    ]).then(function (r) {
      var pu = r[0].rows, tk = r[1].rows, ts = r[2].rows, tkm = {}; tk.forEach(function (x) { tkm[x.name] = x; });
      return (tk.length ? Promise.all(chunk(tk.map(function (x) { return x.name; }), 400).map(function (c) { return gl('ToDo', { fields: ['reference_name', 'allocated_to'], filters: [['reference_type', '=', 'Task'], ['reference_name', 'in', c], ['status', '!=', 'Cancelled']], limit: 2000 }); })) : Promise.resolve([])).then(function (tds) {
        var td = []; tds.forEach(function (x) { td = td.concat(x); });
        var users = uniq(pu.map(function (x) { return x.user; }).concat(td.map(function (x) { return x.allocated_to; })));
        return (users.length ? gl('Employee', { fields: EF, filters: [['user_id', 'in', users], ['status', '=', 'Active']], limit: 1000 }) : Promise.resolve([])).then(function (ers) {
          var byUser = {}, map = {}; ers.forEach(function (e) { byUser[e.user_id] = e; });
          function row(e) { return map[e.name] || (map[e.name] = { id: e.name, name: e.employee_name, designation: e.designation, department: e.department, branch: e.branch, projects: {}, tasks: 0, done: 0, ts: 0, tsDraft: 0 }); }
          pu.forEach(function (x) { if (byUser[x.user]) { row(byUser[x.user]).projects[x.parent] = 1; } });
          td.forEach(function (x) { var e = byUser[x.allocated_to], tkx = tkm[x.reference_name]; if (e && tkx) { var q = row(e); q.projects[tkx.project] = 1; q.tasks++; if (tkx.status === 'Completed') { q.done++; } } });
          var tsIds = uniq(ts.map(function (x) { return x.employee; }));
          return (tsIds.length ? gl('Employee', { fields: EF, filters: [['name', 'in', tsIds]], limit: 1000 }) : Promise.resolve([])).then(function (es) {
            var em = {}; es.forEach(function (e) { em[e.name] = e; });
            ts.forEach(function (x) { if (em[x.employee]) { var q = row(em[x.employee]); q.projects[x.parent_project] = 1; q.ts++; if (x.docstatus === 0) { q.tsDraft++; } } });
            return Object.keys(map).map(function (k) { var q = map[k]; q.projects = Object.keys(q.projects); return q; });
          });
        });
      });
    });
  });
}
function empFilter(rows) { var q = (S.f.employee || '').toLowerCase(); return q ? rows.filter(function (r) { return (r.id + ' ' + r.name).toLowerCase().indexOf(q) >= 0; }) : rows; }
function todayAtt(ids) {
  if (!ids.length) { return Promise.resolve([]); }
  return Promise.all(chunk(ids, 400).map(function (c) { return gl('Attendance', { fields: ['employee', 'status', 'shift', 'working_hours'], filters: [['employee', 'in', c], ['attendance_date', '=', TODAY], ['docstatus', '=', 1]], limit: 500 }); })).then(function (ps) { var o = []; ps.forEach(function (p) { o = o.concat(p); }); return o; });
}
function deptSet() { var d = S.f.department ? [S.f.department] : uniq(SC().projects.map(function (p) { return p.department; })); return d.length ? d : NONE; }
function rosterF(extra) { var f = [['status', '=', 'Active'], ['department', 'in', deptSet()]]; if (S.f.employee) { f.push(['employee_name', 'like', '%' + S.f.employee + '%']); } return extra ? f.concat(extra) : f; }
function empCols(withAtt) {
  var c = [{ h: 'c_emp', c: function (r) { return r.name; }, f: function (r) { return link('Employee', r.id) + ' ' + esc(r.name); } }, { h: 'c_id', c: function (r) { return r.id; } }, { h: 'c_desig', c: function (r) { return r.designation || ''; } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_projs', c: function (r) { return (r.projects || []).join(', '); } }];
  if (withAtt) { c.push({ h: 'c_att', c: function (r) { return r.att ? st(r.att.status) : t('st_Not marked'); }, f: function (r) { return r.att ? spill(r.att.status) : pill(t('st_Not marked'), 'n'); } }, { h: 'c_shift', c: function (r) { return r.att && r.att.shift || ''; } }, { h: 'c_hours', num: true, c: function (r) { return r.att && r.att.working_hours > 0 ? n(r.att.working_hours, 2) : ''; } }); }
  c.push({ h: 'c_tasks', num: true, c: function (r) { return r.tasks; } }, { h: 'c_tdone', num: true, c: function (r) { return r.done; } }, { h: 'c_ts', num: true, c: function (r) { return r.ts + (r.tsDraft ? ' (' + r.tsDraft + ' ' + t('st_Draft') + ')' : ''); } });
  return c;
}
function assignedRows(openOnly) { return assigned(openOnly).then(function (rows) { rows = empFilter(rows); return todayAtt(rows.map(function (r) { return r.id; })).then(function (at) { var m = {}; at.forEach(function (a) { m[a.employee] = a; }); rows.forEach(function (r) { r.att = m[r.id]; }); return rows; }); }); }
function assignedAtt(status) { return assignedRows(false).then(function (rows) { return rows.filter(function (r) { return r.att && (Array.isArray(status) ? status.indexOf(r.att.status) >= 0 : r.att.status === status); }); }); }
function rosterAttF(extra) { return [['attendance_date', '=', TODAY], ['docstatus', '=', 1], ['department', 'in', deptSet()]].concat(extra || []); }
function attSpecDept(id, extra) { return { id: id, dt: 'Attendance', fields: ['name', 'attendance_date', 'employee', 'employee_name', 'status', 'shift', 'working_hours', 'department'], filters: rosterAttF(extra), order: 'employee_name asc', search: ['employee_name', 'employee'], cols: [{ h: 'c_emp', c: function (r) { return r.employee_name; }, f: function (r) { return link('Employee', r.employee) + ' ' + esc(r.employee_name); } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_att', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_shift', c: function (r) { return r.shift || ''; } }, { h: 'c_hours', num: true, c: function (r) { return r.working_hours > 0 ? n(r.working_hours, 2) : ''; } }] }; }
function tsSpec(draftOnly) { var f = [['parent_project', 'in', PIN()]].concat(draftOnly ? [['docstatus', '=', 0]] : [['docstatus', '<', 2]]); return { id: draftOnly ? 'ts_draft' : 'ts_all', dt: 'Timesheet', fields: ['name', 'employee', 'employee_name', 'parent_project', 'start_date', 'end_date', 'total_hours', 'status', 'docstatus'], filters: f, order: 'modified desc', search: ['name', 'employee_name'], cols: [{ h: 'c_doc', c: function (r) { return r.name; }, f: function (r) { return link('Timesheet', r.name); } }, { h: 'c_emp', c: function (r) { return r.employee_name || r.employee; } }, { h: 'c_project', c: function (r) { return r.parent_project || ''; } }, { h: 'c_start', c: function (r) { return r.start_date || ''; } }, { h: 'c_end', c: function (r) { return r.end_date || ''; } }, { h: 'c_hours', num: true, c: function (r) { return n(r.total_hours, 2); } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }] }; }
function empSpecStatic(id, rowsP, withAtt) { return sSpec(id, rowsP, empCols(withAtt)); }
var MK = {
  assign: function () { return { label: 'k_massign', tone: 'blue', load: function () { return assignedRows(false).then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_assign', function () { return assignedRows(false); }, true); } }; },
  active: function () { return { label: 'k_mactive', tone: 'blue', load: function () { return assignedRows(true).then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_active', function () { return assignedRows(true); }, true); } }; },
  pres: function () { return { label: 'k_mpres', tone: 'green', load: function () { return assignedAtt(['Present', 'Work From Home']).then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_pres', function () { return assignedAtt(['Present', 'Work From Home']); }, true); } }; },
  abs: function () { return { label: 'k_mabs', tone: 'red', load: function () { return assignedAtt('Absent').then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_abs', function () { return assignedAtt('Absent'); }, true); } }; },
  leave: function () { return { label: 'k_mleave', tone: 'blue', load: function () { return assignedAtt('On Leave').then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_leave', function () { return assignedAtt('On Leave'); }, true); } }; },
  ts: function () { return { label: 'k_mts', tone: 'yellow', load: function () { return cnt('Timesheet', { filters: [['parent_project', 'in', PIN()], ['docstatus', '=', 0]] }).then(function (v) { return { v: v }; }); }, spec: function () { return tsSpec(true); } }; },
  dept: function () { return { label: 'k_mdept', tone: 'blue', load: function () { return cnt('Employee', { filters: rosterF() }).then(function (v) { return { v: v }; }); }, spec: function () { return rosterSpec(); } }; },
  dpres: function () { return { label: 'k_mdpres', tone: 'green', load: function () { return cnt('Attendance', { filters: rosterAttF([['status', 'in', ['Present', 'Work From Home']]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return attSpecDept('mk_dp', [['status', 'in', ['Present', 'Work From Home']]]); } }; },
  dabs: function () { return { label: 'k_mdabs', tone: 'red', load: function () { return cnt('Attendance', { filters: rosterAttF([['status', '=', 'Absent']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return attSpecDept('mk_da', [['status', '=', 'Absent']]); } }; },
  dleave: function () { return { label: 'k_mdleave', tone: 'blue', load: function () { return cnt('Attendance', { filters: rosterAttF([['status', '=', 'On Leave']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return attSpecDept('mk_dl', [['status', '=', 'On Leave']]); } }; }
};
function rosterSpec() { return { id: 'roster', dt: 'Employee', fields: ['name', 'employee_name', 'designation', 'department', 'branch'], filters: rosterF(), order: 'employee_name asc', search: ['employee_name', 'name'], cols: [{ h: 'c_emp', c: function (r) { return r.employee_name; }, f: function (r) { return link('Employee', r.name) + ' ' + esc(r.employee_name); } }, { h: 'c_id', c: function (r) { return r.name; } }, { h: 'c_desig', c: function (r) { return r.designation || ''; } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_branch', c: function (r) { return r.branch || ''; } }] }; }

/* ---------- equipment ---------- */
function assetF(extra) { var f = [['docstatus', '<', 2]]; if (S.f.company) { f.push(['company', '=', S.f.company]); } if (S.f.department) { f.push(['department', '=', S.f.department]); } return extra ? f.concat(extra) : f; }
function imgOk(v) { return v && /^\/(private\/)?files\/[^"'<>\s]+$/.test(v); }
function assetSpec(id, extra) { return { id: id, dt: 'Asset', fields: ['name', 'asset_name', 'asset_category', 'status', 'location', 'custodian', 'department', 'image'], filters: assetF(extra), order: 'modified desc', search: ['asset_name', 'name'], cols: [{ h: 'c_asset', c: function (r) { return r.name; }, f: function (r) { return link('Asset', r.name); } }, { h: 'c_aname', c: function (r) { return r.asset_name || ''; } }, { h: 'c_cat', c: function (r) { return r.asset_category || ''; } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_loc', c: function (r) { return r.location || ''; } }, { h: 'c_cust2', c: function (r) { return r.custodian || ''; } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_img', c: function (r) { return imgOk(r.image) ? r.image : ''; }, f: function (r) { return imgOk(r.image) ? '<img src="' + esc(r.image) + '" alt="" style="height:34px;border-radius:5px">' : ''; } }] }; }
function vehSpec() { return { id: 'veh', dt: 'Vehicle', fields: ['name', 'license_plate', 'model', 'employee', 'last_odometer', 'location'], filters: [], order: 'modified desc', search: ['license_plate', 'model', 'name'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Vehicle', r.name); } }, { h: 'c_plate', c: function (r) { return r.license_plate || ''; } }, { h: 'c_model', c: function (r) { return r.model || ''; } }, { h: 'c_driver', c: function (r) { return r.employee || ''; } }, { h: 'c_odo', num: true, c: function (r) { return r.last_odometer === null ? '' : n(r.last_odometer, 0); } }, { h: 'c_loc', c: function (r) { return r.location || ''; } }] }; }
function repairSpec() { return { id: 'repairs', dt: 'Asset Repair', fields: ['name', 'asset', 'asset_name', 'failure_date', 'repair_status', 'docstatus'], filters: [['repair_status', '!=', 'Completed'], ['docstatus', '<', 2]], order: 'failure_date desc', search: ['name', 'asset_name'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Asset Repair', r.name); } }, { h: 'c_asset', c: function (r) { return r.asset; }, f: function (r) { return link('Asset', r.asset) + ' ' + esc(r.asset_name || ''); } }, { h: 'c_failure', c: function (r) { return r.failure_date || ''; } }, { h: 'c_repair', c: function (r) { return r.repair_status || ''; }, f: function (r) { return pill(r.repair_status || '', 'o'); } }] }; }
var EK = {
  total: function () { return { label: 'k_etotal', tone: 'blue', load: function () { return cnt('Asset', { filters: assetF() }).then(function (v) { return { v: v }; }); }, spec: function () { return assetSpec('ek_all'); } }; },
  maint: function () { return { label: 'k_emaint', tone: 'orange', load: function () { return cnt('Asset', { filters: assetF([['status', '=', 'In Maintenance']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return assetSpec('ek_m', [['status', '=', 'In Maintenance']]); } }; },
  ooo: function () { return { label: 'k_eooo', tone: 'red', load: function () { return cnt('Asset', { filters: assetF([['status', '=', 'Out of Order']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return assetSpec('ek_o', [['status', '=', 'Out of Order']]); } }; },
  repair: function () { return { label: 'k_erepair', tone: 'orange', load: function () { return cnt('Asset Repair', { filters: repairSpec().filters }).then(function (v) { return { v: v }; }); }, spec: repairSpec }; },
  veh: function () { return { label: 'k_vehicles', tone: 'blue', load: function () { return cnt('Vehicle', {}).then(function (v) { return { v: v }; }); }, spec: vehSpec }; },
  use: function () { return { label: 'k_euse', tone: 'grey', unavail: 'na_equse' }; }, over: function () { return { label: 'k_eoverret', tone: 'grey', unavail: 'na_equse' }; }, alloc: function () { return { label: 'k_ealloc', tone: 'grey', unavail: 'na_equse' }; },
  sched: function () { return { label: 'k_esched', tone: 'blue', load: function () { return Promise.all([cnt('Maintenance Schedule', {}), cnt('Maintenance Visit', {}), cnt('Asset Maintenance', {})]).then(function (a) { return { fmt: a.join(' / '), sub: 'Schedules / Visits / Plans' }; }); } }; }
};

/* ---------- finance ---------- */
function sumP(f) { return sum(SC().projects, f); }
function budgeted() { return SC().projects.filter(function (p) { return p.estimated_costing > 0; }); }
function siF(extra) { return [['project', 'in', PIN()]].concat(extra || []); }
function invSpec(dt, id, extra) {
  var isSI = dt === 'Sales Invoice', pf = isSI ? 'customer' : 'supplier';
  return { id: id, dt: dt, fields: ['name', 'posting_date', pf, 'project', 'grand_total', 'outstanding_amount', 'due_date', 'docstatus'], filters: siF(extra), order: 'posting_date desc', search: ['name', pf], cols: [{ h: 'c_inv', c: function (r) { return r.name; }, f: function (r) { return link(dt, r.name); } }, { h: 'c_date', c: function (r) { return r.posting_date; } }, { h: isSI ? 'c_cust' : 'c_sup', c: function (r) { return r[pf] || ''; } }, { h: 'c_project', c: function (r) { return r.project || ''; } }, { h: 'c_total', num: true, c: function (r) { return n(r.grand_total, 2); } }, { h: 'c_outst', num: true, c: function (r) { return n(r.outstanding_amount, 2); } }, { h: 'c_due', c: function (r) { return r.due_date || ''; } }, { h: 'c_status', c: function (r) { return r.docstatus === 1 ? st('Submitted') : st('Draft'); }, f: function (r) { return dpill(r.docstatus); } }] };
}
function finProjSpec(id) { return { id: id, rows: SC().projects, cols: [{ h: 'c_id', c: function (p) { return p.name; }, f: projLink }, { h: 'c_name', c: function (p) { return p.project_name || ''; } }, { h: 'c_budget', num: true, c: function (p) { return p.estimated_costing > 0 ? n(p.estimated_costing, 2) : ''; } }, { h: 'c_tcost', num: true, c: function (p) { return n(p.total_costing_amount, 2); } }, { h: 'c_pcost', num: true, c: function (p) { return n(p.total_purchase_cost, 2); } }, { h: 'c_mcost', num: true, c: function (p) { return n(p.total_consumed_material_cost, 2); } }, { h: 'c_actual', num: true, c: function (p) { return n(actualCost(p), 2); } }, { h: 'c_util', num: true, c: function (p) { return p.estimated_costing > 0 ? n(actualCost(p) / p.estimated_costing * 100, 1) + '%' : ''; } }, { h: 'c_var', num: true, c: function (p) { return p.estimated_costing > 0 ? n(p.estimated_costing - actualCost(p), 2) : ''; } }, { h: 'c_sales', num: true, c: function (p) { return n(p.total_sales_amount, 2); } }, { h: 'c_billed', num: true, c: function (p) { return n(p.total_billed_amount, 2); } }, { h: 'c_margin', num: true, c: function (p) { return n(p.gross_margin, 2); } }] }; }
function commitments() { return poLines().then(function (rows) { return rows.filter(function (r) { return r.open; }); }); }
var FK = {
  budget: function () { return { label: 'k_fbudget', tone: 'blue', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.estimated_costing; })), sub: budgeted().length + ' / ' + SC().projects.length + ' ' + t('records') }); }, spec: function () { var s = finProjSpec('fk_b'); s.rows = budgeted(); return s; } }; },
  actual: function () { return { label: 'k_factual', tone: 'orange', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(actualCost)) }); }, spec: function () { return finProjSpec('fk_a'); } }; },
  util: function () { return { label: 'k_futil', tone: 'blue', load: function () { var b = budgeted(), bud = sum(b, function (p) { return p.estimated_costing; }); return Promise.resolve(bud ? { fmt: n(sum(b, actualCost) / bud * 100, 1) + '%', sub: b.length + ' ' + t('records') } : { fmt: '—', sub: t('empty') }); }, spec: function () { var s = finProjSpec('fk_u'); s.rows = budgeted(); return s; } }; },
  variance: function () { return { label: 'k_fvar', tone: 'blue', load: function () { var b = budgeted(); return Promise.resolve(b.length ? { fmt: moneyHtml(sum(b, function (p) { return p.estimated_costing - actualCost(p); })) } : { fmt: '—', sub: t('empty') }); }, spec: function () { var s = finProjSpec('fk_v'); s.rows = budgeted(); return s; } }; },
  commit: function () { return { label: 'k_fcommit', tone: 'orange', load: function () { return commitments().then(function (rows) { return { fmt: moneyHtml(sum(rows, function (r) { return Math.max(0, r.amount - r.billed_amt); })) }; }); }, spec: function () { return sSpec('fk_c', function () { return commitments().then(function (r) { return r.filter(function (x) { return x.amount > x.billed_amt; }); }); }, lineCols('po')); } }; },
  sup: function () { return { label: 'k_fsup', tone: 'red', load: function () { return sumf('Purchase Invoice', 'outstanding_amount', { filters: siF([['docstatus', '=', 1], ['outstanding_amount', '>', 0]]) }).then(function (v) { return { fmt: moneyHtml(v) }; }); }, spec: function () { return invSpec('Purchase Invoice', 'fk_s', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]); } }; },
  cust: function () { return { label: 'k_fcust', tone: 'red', load: function () { return sumf('Sales Invoice', 'outstanding_amount', { filters: siF([['docstatus', '=', 1], ['outstanding_amount', '>', 0]]) }).then(function (v) { return { fmt: moneyHtml(v) }; }); }, spec: function () { return invSpec('Sales Invoice', 'fk_cu', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]); } }; },
  rev: function () { return { label: 'k_frev', tone: 'green', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.total_billed_amount; })) }); }, spec: function () { return finProjSpec('fk_r'); } }; },
  sales: function () { return { label: 'k_fsales', tone: 'green', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.total_sales_amount; })) }); }, spec: function () { return finProjSpec('fk_so'); } }; },
  margin: function () { return { label: 'k_fmargin', tone: 'grey', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.gross_margin; })), sub: 'ERPNext estimate' }); }, spec: function () { return finProjSpec('fk_m'); } }; },
  dsi: function () { return { label: 'k_fdsi', tone: 'yellow', load: function () { return cnt('Sales Invoice', { filters: siF([['docstatus', '=', 0]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return invSpec('Sales Invoice', 'fk_dsi', [['docstatus', '=', 0]]); } }; },
  dpi: function () { return { label: 'k_fdpi', tone: 'yellow', load: function () { return cnt('Purchase Invoice', { filters: siF([['docstatus', '=', 0]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return invSpec('Purchase Invoice', 'fk_dpi', [['docstatus', '=', 0]]); } }; }
};
function monthSeries(rows, df) { var m = {}; rows.forEach(function (r) { var k = String(r[df] || '').slice(0, 7); if (k) { m[k] = (m[k] || 0) + 1; } }); return m; }
function last12() { var o = [], s = monthStart(TODAY); for (var i = 11; i >= 0; i--) { o.push(addMonths(s, -i).slice(0, 7)); } return o; }

/* ---------- delays / risks ---------- */
function delayRows() {
  return mm('delays', function () {
    return Promise.all([
      SC().names.length ? fetchAll('Task', { fields: ['name', 'subject', 'project', 'priority', 'exp_end_date', 'status', 'is_milestone'], filters: tkF([['status', 'not in', DONE_ST]]), or: OVR().concat([['exp_end_date', 'between', [TODAY, addDays(TODAY, 14)]]]), order: 'exp_end_date asc' }, 1000) : Promise.resolve({ rows: [] }),
      poLines(), mrLines(),
      SC().names.length ? gl('Issue', { fields: ['name', 'subject', 'project', 'priority', 'status', 'opening_date'], filters: [['project', 'in', PIN()], ['status', '!=', 'Closed']], limit: 500 }).catch(function () { return []; }) : Promise.resolve([]),
      gl('Asset Repair', { fields: ['name', 'asset', 'failure_date', 'repair_status'], filters: [['repair_status', '!=', 'Completed'], ['docstatus', '<', 2]], limit: 200 }).catch(function () { return []; })
    ]).then(function (r) {
      return tkPost(r[0].rows).then(function (tasks) {
        var rows = [];
        function over(d) { return d && d < TODAY ? daysBetween(d, TODAY) : ''; }
        SC().projects.filter(isDelayed).forEach(function (p) { rows.push({ project: p.name, desc: t('lt_delayed') + ' – ' + (p.project_name || ''), dt: 'Project', doc: p.name, resp: '', exp: p.expected_end_date, status: 'Overdue', over: over(p.expected_end_date), prio: p.priority || '' }); });
        tasks.forEach(function (x) { var late = x.exp_end_date && x.exp_end_date < TODAY || x.status === 'Overdue'; rows.push({ project: x.project, desc: (late ? t('lt_task') : t('lt_upc')) + ' – ' + x.subject, dt: 'Task', doc: x.name, resp: x._asg || '', exp: x.exp_end_date, status: late ? 'Overdue' : 'Upcoming', over: late ? over(x.exp_end_date) : '', prio: x.priority || '' }); });
        r[1].filter(function (l) { return l.open && l.schedule_date && l.schedule_date < TODAY && l.qty > l.received_qty; }).forEach(function (l) { rows.push({ project: l.project, desc: t('lt_po') + ' – ' + (l.item_code || ''), dt: 'Purchase Order', doc: l.parent, resp: l.supplier || '', exp: l.schedule_date, status: 'Overdue', over: over(l.schedule_date), prio: '' }); });
        r[2].filter(function (l) { return l.open && l.schedule_date && l.schedule_date < TODAY && l.qty > l.ordered_qty; }).forEach(function (l) { rows.push({ project: l.project, desc: t('lt_mr') + ' – ' + (l.item_code || ''), dt: 'Material Request', doc: l.parent, resp: '', exp: l.schedule_date, status: 'Overdue', over: over(l.schedule_date), prio: '' }); });
        r[3].forEach(function (x) { rows.push({ project: x.project, desc: t('lt_issue') + ' – ' + x.subject, dt: 'Issue', doc: x.name, resp: '', exp: '', status: 'Open', over: '', prio: x.priority || '' }); });
        r[4].forEach(function (x) { rows.push({ project: '', desc: t('lt_repair') + ' – ' + x.asset, dt: 'Asset Repair', doc: x.name, resp: '', exp: x.failure_date, status: 'Pending', over: '', prio: '' }); });
        rows.sort(function (a, b) { return (b.over || 0) - (a.over || 0); });
        return rows;
      });
    });
  });
}
function delayCols() { return [{ h: 'c_project', c: function (r) { return r.project || ''; }, f: function (r) { return r.project ? '<a href="#" class="dmcon-lnk" data-pd="' + esc(r.project) + '">' + esc(r.project) + '</a>' : '—'; } }, { h: 'c_desc', c: function (r) { return r.desc; } }, { h: 'c_rdoc', c: function (r) { return r.doc; }, f: function (r) { return link(r.dt, r.doc); } }, { h: 'c_resp', c: function (r) { return r.resp || ''; } }, { h: 'c_exp', c: function (r) { return r.exp || ''; } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return pill(st(r.status), r.status === 'Overdue' ? 'r' : r.status === 'Upcoming' ? 'b' : r.status === 'Open' ? 'y' : 'y'); } }, { h: 'c_over', num: true, c: function (r) { return r.over; } }, { h: 'c_prio', c: function (r) { return r.prio ? st(r.prio) : ''; } }]; }

/* ---------- TAB: overview ---------- */
function tabOverview(v, my) {
  scopeNote(v);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_pr')) + '</div>');
  addKpis(v, my, [PK.total(), PK.active(), PK.done(), PK.hold(), PK.delay(), PK.upc(), PK.attn()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_wp')) + '</div>');
  addKpis(v, my, [{ label: 'k_sites', tone: 'grey', unavail: 'na_site' }, TK.done('k_sdone'), TK.pend('k_spend'), TK.over('k_sover'), { label: 'k_sappr', tone: 'grey', unavail: 'na_appr' }, { label: 'k_sissue', tone: 'yellow', load: function () { return cnt('Issue', { filters: [['project', 'in', PIN()], ['status', '!=', 'Closed']] }).then(function (x) { return { v: x }; }); }, spec: function () { return { id: 'issues', dt: 'Issue', fields: ['name', 'subject', 'project', 'priority', 'status', 'opening_date'], filters: [['project', 'in', PIN()], ['status', '!=', 'Closed']], order: 'opening_date desc', search: ['name', 'subject'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Issue', r.name); } }, { h: 'c_subject', c: function (r) { return r.subject; } }, { h: 'c_project', c: function (r) { return r.project || ''; } }, { h: 'c_prio', c: function (r) { return r.priority || ''; } }, { h: 'c_status', c: function (r) { return r.status; }, f: function (r) { return spill(r.status); } }] }; } }]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_mp')) + '</div>');
  addKpis(v, my, [MK.assign(), MK.active(), MK.pres(), MK.abs(), MK.leave(), MK.ts()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_mt')) + '</div>');
  addKpis(v, my, [XK.mr(), XK.po(), XK.rcpt(), XK.issue(), XK.ret(), XK.outOrder(), XK.outRecv(), XK.repl()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_eq')) + '</div>');
  addKpis(v, my, [EK.total(), EK.maint(), EK.ooo(), EK.repair(), EK.use(), EK.over()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_fi')) + '</div>');
  addKpis(v, my, [FK.budget(), FK.actual(), FK.util(), FK.commit(), FK.sup(), FK.cust(), FK.rev(), FK.margin()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_status'); a.innerHTML = donut([{ l: st('Open'), v: SC().projects.filter(function (p) { return isOpen(p) && !isDelayed(p); }).length, c: COL.b }, { l: st('Overdue'), v: SC().projects.filter(isDelayed).length, c: COL.r }, { l: st('Completed'), v: SC().projects.filter(function (p) { return p.status === 'Completed'; }).length, c: COL.g }, { l: st('Cancelled'), v: SC().projects.filter(function (p) { return p.status === 'Cancelled'; }).length, c: COL.n }]);
  var b = addPanel(g, 'p_monthly'); var ms = monthSeries(SC().projects, 'creation'); b.innerHTML = colchart(last12().map(function (m) { return { l: m.slice(2), parts: [{ l: t('proj_created'), c: COL.b, v: ms[m] || 0 }] }; }));
  var c = addPanel(g, 'p_compare'); c.innerHTML = hbars(SC().projects.slice().sort(function (x, y) { return y.percent_complete - x.percent_complete; }).slice(0, 10).map(function (p) { return { l: p.name + ' ' + (p.project_name || ''), v: Number(p.percent_complete) || 0, c: p.status === 'Completed' ? COL.g : COL.b }; }), 0);
  var d = addPanel(g, 'p_manpow'); fill(d, my, function () { return assigned(false); }, function (rows) { var m = {}; rows.forEach(function (r) { r.projects.forEach(function (p) { m[p] = (m[p] || 0) + 1; }); }); return hbars(Object.keys(m).map(function (k) { return { l: k, v: m[k] }; }).sort(function (x, y) { return y.v - x.v; }).slice(0, 10), 0); });
  var e = addPanel(g, 'p_issued'); fill(e, my, seView, function (rows) { var m = {}; uniq(rows.map(function (r) { return r.parent; })).forEach(function (p) { var r0 = rows.filter(function (r) { return r.parent === p; })[0]; m[r0.project] = (m[r0.project] || 0) + 1; }); return hbars(Object.keys(m).map(function (k) { return { l: k, v: m[k] }; }), 0); });
  var f = addPanel(g, 'p_equtil'); fill(f, my, function () { return grp('Asset', 'status', { filters: assetF() }); }, function (m) { return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  var h = addPanel(g, 'p_proc'); fill(h, my, poLines, function (rows) { var hd = {}; rows.forEach(function (r) { hd[r.parent] = r; }); var ms2 = monthSeries(Object.keys(hd).map(function (k) { return hd[k]; }).filter(function (r) { return inRange(r.date); }), 'date'); return colchart(last12().map(function (m) { return { l: m.slice(2), parts: [{ l: t('pos_created'), c: COL.o, v: ms2[m] || 0 }] }; })); });
  var i = addPanel(g, 'p_recent'); fill(i, my, function () { return Promise.all([gl('Project', { fields: ['name', 'modified'], filters: [['name', 'in', PIN()]], order: 'modified desc', limit: 4 }), gl('Task', { fields: ['name', 'modified'], filters: tkF(), order: 'modified desc', limit: 4 })]).then(function (r) { var o = r[0].map(function (x) { return { dt: 'Project', name: x.name, m: x.modified }; }).concat(r[1].map(function (x) { return { dt: 'Task', name: x.name, m: x.modified }; })); o.sort(function (x, y) { return String(y.m).localeCompare(String(x.m)); }); return o; }); }, function (rows) { return simple(rows.map(function (r) { return '<li><span>' + esc(t('dt_' + r.dt)) + ' ' + link(r.dt, r.name) + '</span><small>' + esc(dstr(r.m)) + '</small></li>'; })); });
  listPanel(v, my, 'p_attn', attnSpec('ov_attn'));
}

/* ---------- TAB: projects & sites ---------- */
function tabProjects(v, my) {
  scopeNote(v); infoBox(v, ['n_prog', 'n_color']);
  addKpis(v, my, [PK.total(), PK.active(), PK.done(), PK.hold(), PK.delay(), PK.upc(), PK.attn(), { label: 'k_sites', tone: 'grey', unavail: 'na_site' }]);
  var g = addGrid(v, 'dmcon-g2');
  var pc = addPanel(g, 'p_pcards'); pc.innerHTML = '<div class="dmcon-prof">' + [['Open', SC().projects.filter(function (p) { return isOpen(p) && !isDelayed(p); }).length, 'b'], ['Overdue', SC().projects.filter(isDelayed).length, 'r'], ['Completed', SC().projects.filter(function (p) { return p.status === 'Completed'; }).length, 'g'], ['Cancelled', SC().projects.filter(function (p) { return p.status === 'Cancelled'; }).length, 'n']].map(function (x) { return '<div>' + pill(st(x[0] === 'Open' ? 'In Progress' : x[0]), x[2]) + '<b style="font-size:22px;display:block">' + n(x[1], 0) + '</b></div>'; }).join('') + '</div>';
  var pd = addPanel(g, 'p_dept'); var dm = group(SC().projects, function (p) { return p.department || '—'; }); pd.innerHTML = hbars(Object.keys(dm).map(function (k) { return { l: k, v: dm[k].length }; }).sort(function (a, b2) { return b2.v - a.v; }).slice(0, 12), 0);
  var ps = addPanel(v, 'p_site'); ps.innerHTML = '<div class="dmcon-note">' + esc(t('na_site')) + '</div>';
  var pt = addPanel(v, 'p_timeline'); pt.innerHTML = timeline(SC().projects.filter(function (p) { return p.expected_start_date && p.expected_end_date; }).sort(byEnd).slice(0, 15));
  var g2 = addGrid(v, 'dmcon-g2'); listView(addPanel(g2, 'p_upc'), my, pSpec('pr_upc', isUpcoming, byEnd)); listView(addPanel(g2, 'p_delayed'), my, pSpec('pr_delay', isDelayed, byEnd));
  listPanel(v, my, 'p_plist', pSpec('pr_list'));
}
function timeline(rows) {
  if (!rows.length) { return '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; }
  var mn = rows.reduce(function (a, p) { return p.expected_start_date < a ? p.expected_start_date : a; }, rows[0].expected_start_date), mx = rows.reduce(function (a, p) { return p.expected_end_date > a ? p.expected_end_date : a; }, rows[0].expected_end_date), span = Math.max(1, daysBetween(mn, mx));
  return '<div class="dmcon-hb">' + rows.map(function (p) { var l = Math.max(0, daysBetween(mn, p.expected_start_date)) / span * 100, w = Math.max(1.5, daysBetween(p.expected_start_date, p.expected_end_date) / span * 100); return '<div class="dmcon-hr" style="grid-template-columns:minmax(80px,28%) 1fr"><span class="dmcon-hl" title="' + esc(p.name + ' ' + (p.project_name || '')) + '"><a href="#" class="dmcon-lnk" data-pd="' + esc(p.name) + '">' + esc(p.name) + '</a></span><span class="dmcon-ht" style="position:relative"><i style="position:absolute;left:' + l + '%;width:' + w + '%;background:' + (isDelayed(p) ? COL.r : p.status === 'Completed' ? COL.g : COL.b) + '"></i></span></div>'; }).join('') + '</div><div class="dmcon-ks" style="margin-top:6px">' + esc(mn + ' → ' + mx) + '</div>';
}
function openProject(name) { S.drill = { tk: 'p_det', title: t('p_det') + ': ' + name, tab: S.tab, render: function (el, my) { projectDetail(el, my, name); } }; renderView(); }
function projectDetail(el, my, name) {
  var p = S.ctx.pmap[name];
  if (!p) { el.innerHTML = '<div class="dmcon-note">' + esc(t('na_load')) + '</div>'; return; }
  var u = actualCost(p);
  el.innerHTML = '<div class="dmcon-prof">' + kv('c_id', p.name) + kv('c_name', p.project_name) + kv('c_cust', p.customer) + kv('c_dept', p.department) + kv('c_start', p.expected_start_date) + kv('c_end', p.expected_end_date) + kv('c_aend', p.actual_end_date) + kv('c_prio', p.priority) + '<div><span>' + esc(t('c_status')) + '</span>' + projPill(p) + '</div><div><span>' + esc(t('c_prog')) + ' (' + esc(p.percent_complete_method || '—') + ')</span>' + pbar(p.percent_complete, COL.b) + '</div><div><a class="dmcon-lnk" target="_blank" rel="noopener" href="' + esc(docUrl('Project', p.name)) + '">' + esc(t('erp_doc')) + ' ↗</a></div></div>';
  var one = function (extra) { return [['project', '=', name]].concat(extra || []); };
  var k = addGrid(el, 'dmcon-kg');
  kpis(k, my, [
    { label: 'k_tall', tone: 'blue', load: function () { return cnt('Task', { filters: one() }).then(function (x) { return { v: x }; }); }, spec: function () { var s = tkSpec('pd_t'); s.filters = one(); return s; } },
    { label: 'k_tdone', tone: 'green', load: function () { return Promise.all([cnt('Task', { filters: one([['status', '=', 'Completed']]) }), cnt('Task', { filters: one() })]).then(function (r) { return { v: r[0], sub: r[1] ? n(r[0] / r[1] * 100, 0) + '% ' + t('k_tdone') : '' }; }); }, spec: function () { var s = tkSpec('pd_td'); s.filters = one([['status', '=', 'Completed']]); return s; } },
    { label: 'k_tover', tone: 'red', load: function () { return cnt('Task', { filters: one([['status', 'not in', DONE_ST]]), or: OVR() }).then(function (x) { return { v: x }; }); }, spec: function () { var s = tkSpec('pd_to'); s.filters = one([['status', 'not in', DONE_ST]]); s.or = OVR(); return s; } },
    { label: 'k_fbudget', tone: 'blue', load: function () { return Promise.resolve(p.estimated_costing > 0 ? { fmt: n(p.estimated_costing, 2) } : { fmt: '—', sub: t('empty') }); } },
    { label: 'k_factual', tone: 'orange', load: function () { return Promise.resolve({ fmt: n(u, 2) }); } },
    { label: 'k_frev', tone: 'green', load: function () { return Promise.resolve({ fmt: n(p.total_billed_amount, 2) }); } }
  ]);
  var pm = addPanel(el, 'p_dtasks'); var s1 = tkSpec('pd_tasks'); s1.filters = one(); listView(pm, my, s1);
  var mp = addPanel(el, 'p_dman'); fill(mp, my, function () { return assigned(false); }, function (rows) { rows = rows.filter(function (r) { return r.projects.indexOf(name) >= 0; }); return rows.length ? '<div class="dmcon-tw"><table class="dmcon-tbl"><thead><tr><th>' + esc(t('c_emp')) + '</th><th>' + esc(t('c_desig')) + '</th><th class="dmcon-num">' + esc(t('c_tasks')) + '</th><th class="dmcon-num">' + esc(t('c_ts')) + '</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + link('Employee', r.id) + ' ' + esc(r.name) + '</td><td>' + esc(r.designation || '') + '</td><td class="dmcon-num">' + r.tasks + '</td><td class="dmcon-num">' + r.ts + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; });
  var mt = addPanel(el, 'p_dmat'); fill(mt, my, function () { return Promise.all([poLines(), mrLines(), seLines()]); }, function (r) { var rows = []; r[0].filter(function (x) { return x.project === name; }).forEach(function (x) { rows.push({ t: 'Purchase Order', d: x.parent, i: x.item_code, q: x.qty, u: x.uom, s: x.status }); }); r[1].filter(function (x) { return x.project === name; }).forEach(function (x) { rows.push({ t: 'Material Request', d: x.parent, i: x.item_code, q: x.qty, u: x.uom, s: x.status }); }); r[2].filter(function (x) { return x.project === name; }).forEach(function (x) { rows.push({ t: 'Stock Entry', d: x.parent, i: x.item_code, q: x.qty, u: x.uom, s: x.type }); }); return rows.length ? '<div class="dmcon-tw"><table class="dmcon-tbl"><thead><tr><th>' + esc(t('c_type')) + '</th><th>' + esc(t('c_doc')) + '</th><th>' + esc(t('c_item')) + '</th><th class="dmcon-num">' + esc(t('c_qty')) + '</th><th>' + esc(t('c_uom')) + '</th><th>' + esc(t('c_status')) + '</th></tr></thead><tbody>' + rows.slice(0, 200).map(function (x) { return '<tr><td>' + esc(t('dt_' + x.t)) + '</td><td>' + link(x.t, x.d) + '</td><td>' + esc(x.i) + '</td><td class="dmcon-num">' + n(x.q, 2) + '</td><td>' + esc(x.u) + '</td><td>' + esc(x.s ? st(x.s) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; });
  addPanel(el, 'p_deq').innerHTML = '<div class="dmcon-note">' + esc(t('na_equse')) + '</div>';
  var fp = addPanel(el, 'p_dfin'); var si = invSpec('Sales Invoice', 'pd_si', []); si.filters = [['project', '=', name]]; listView(fp, my, si);
  var pp = addPanel(el, 'p_ppi'); var pi = invSpec('Purchase Invoice', 'pd_pi', []); pi.filters = [['project', '=', name]]; listView(pp, my, pi);
}

/* ---------- TAB: work progress ---------- */
function tabWork(v, my) {
  scopeNote(v); infoBox(v, ['n_prog', 'n_delay']);
  addKpis(v, my, [TK.all(), TK.done(), TK.pend(), TK.over()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_tcomp'); fill(a, my, function () { return grp('Task', 'status', { filters: tkF() }); }, function (m) { return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  var b = addPanel(g, 'p_tproj'); fill(b, my, function () { return fetchAll('Task', { fields: ['project', 'status'], filters: tkF() }, 2000); }, function (x) { var by = group(x.rows, function (r) { return r.project; }); return hbars(Object.keys(by).map(function (k) { return { l: k, v: by[k].filter(function (r) { return r.status === 'Completed'; }).length / by[k].length * 100, c: COL.g }; }).sort(function (p, q) { return q.v - p.v; }).slice(0, 12), 0) + '<div class="dmcon-ks">% = completed ÷ total tasks per project</div>'; });
  var c = addPanel(g, 'p_temp'); fill(c, my, function () { return assigned(false); }, function (rows) { return hbars(rows.map(function (r) { return { l: r.name, v: r.tasks }; }).filter(function (x) { return x.v; }).sort(function (p, q) { return q.v - p.v; }).slice(0, 12), 0); });
  var d = addPanel(g, 'p_miles'); fill(d, my, function () { return gl('Task', { fields: ['name', 'subject', 'project', 'exp_end_date', 'status'], filters: tkF([['is_milestone', '=', 1], ['status', 'not in', DONE_ST]]), order: 'exp_end_date asc', limit: 8 }); }, function (rows) { return simple(rows.map(function (r) { return '<li><span>' + link('Task', r.name) + ' ' + esc(r.subject) + '</span><b>' + esc(r.exp_end_date || '') + '</b></li>'; })); });
  listPanel(v, my, 'p_overd', tkSpec('wp_over', [['status', 'not in', DONE_ST]], 'exp_end_date asc', OVR()));
  listPanel(v, my, 'p_tlist', tkSpec('wp_all', []));
  listPanel(v, my, 'p_plist', pSpec('wp_proj'));
}

/* ---------- TAB: manpower ---------- */
function tabManpower(v, my) {
  scopeNote(v); infoBox(v, ['n_man']);
  addKpis(v, my, [MK.assign(), MK.active(), MK.pres(), MK.abs(), MK.leave(), MK.ts(), MK.dept(), MK.dpres(), MK.dabs(), MK.dleave()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_avail'); fill(a, my, function () { return assignedRows(false); }, function (rows) { var m = {}; rows.forEach(function (r) { var k = r.att ? r.att.status : 'Not marked'; m[k] = (m[k] || 0) + 1; }); return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  var b = addPanel(g, 'p_manpow'); fill(b, my, function () { return assigned(false); }, function (rows) { var m = {}; rows.forEach(function (r) { r.projects.forEach(function (p) { m[p] = (m[p] || 0) + 1; }); }); return hbars(Object.keys(m).map(function (k) { return { l: k, v: m[k] }; }).sort(function (x, y) { return y.v - x.v; }).slice(0, 12), 0); });
  var c = addPanel(v, 'p_atrend'); fill(c, my, function () { var months = []; for (var i = 5; i >= 0; i--) { months.push(addMonths(monthStart(TODAY), -i)); } return Promise.all(months.map(function (m) { return grp('Attendance', 'status', { filters: [['docstatus', '=', 1], ['department', 'in', deptSet()], ['attendance_date', '>=', m], ['attendance_date', '<=', monthEnd(m) > TODAY ? TODAY : monthEnd(m)]] }).then(function (g2) { return { l: m.slice(2, 7), g: g2 }; }); })); }, function (rows) { return colchart(rows.map(function (r) { return { l: r.l, parts: ['Present', 'Work From Home', 'Half Day', 'On Leave', 'Absent'].map(function (s) { return { l: st(s), c: COL[cat(s)], v: r.g[s] || 0 }; }) }; })); });
  listPanel(v, my, 'p_emptable', empSpecStatic('mp_alloc', function () { return assignedRows(false); }, true));
  listPanel(v, my, 'p_roster', rosterSpec());
  listPanel(v, my, 'p_tspend', tsSpec(true));
}

/* ---------- TAB: materials ---------- */
function tabMaterials(v, my) {
  scopeNote(v); infoBox(v, ['n_mat']);
  addKpis(v, my, [XK.mr(), XK.po(), XK.rcpt(), XK.recv(), XK.issue(), XK.ret(), XK.outOrder(), XK.outRecv(), XK.repl()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_pipe'); fill(a, my, function () { return Promise.all([mrView(), poView()]); }, function (r) { var mrh = {}; r[0].filter(function (x) { return x.open; }).forEach(function (x) { mrh[x.parent] = 1; }); return hbars([{ l: t('k_xmr'), v: Object.keys(mrh).length, c: COL.y }, { l: t('k_xpo'), v: poPendingHeaders(r[1]).length, c: COL.b }, { l: t('k_xrcpt'), v: r[1].filter(function (x) { return x.open && x.qty > x.received_qty; }).length, c: COL.o }], 0); });
  var b = addPanel(g, 'p_itemw'); fill(b, my, seView, function (rows) { var by = group(rows.filter(function (r) { return r.type === 'Material Issue' && r.docstatus === 1; }), function (r) { return r.item_code + '||' + r.uom; }); var out = Object.keys(by).map(function (k) { return { l: by[k][0].item_code + ' (' + by[k][0].uom + ')', v: sum(by[k], function (r) { return r.qty; }) }; }).sort(function (x, y) { return y.v - x.v; }).slice(0, 12); return hbars(out, 2); });
  listPanel(v, my, 'p_mr', sSpec('mt_mr', mrView, lineCols('mr')));
  listPanel(v, my, 'p_po', sSpec('mt_po', poView, lineCols('po')));
  listPanel(v, my, 'p_se', sSpec('mt_se', seView, lineCols('se')));
  var pb = addPanel(v, 'p_bin');
  if (!S.f.warehouse) { pb.innerHTML = '<div class="dmcon-note">' + esc(t('sel_wh')) + '</div>'; } else { listView(pb, my, { id: 'bin', dt: 'Bin', fields: ['item_code', 'actual_qty', 'projected_qty', 'reserved_qty', 'ordered_qty', 'stock_uom', 'warehouse'], filters: [['warehouse', '=', S.f.warehouse], ['actual_qty', '!=', 0]], order: 'item_code asc', search: ['item_code'], cols: [{ h: 'c_item', c: function (r) { return r.item_code; }, f: function (r) { return link('Item', r.item_code); } }, { h: 'c_wh', c: function (r) { return r.warehouse; } }, { h: 'c_qty', num: true, c: function (r) { return n(r.actual_qty, 2); } }, { h: 'c_uom', c: function (r) { return r.stock_uom; } }] }); }
}

/* ---------- TAB: equipment ---------- */
function tabEquipment(v, my) {
  infoBox(v, ['n_eq']); infoBox(v, ['na_equse'], 'note');
  addKpis(v, my, [EK.total(), EK.maint(), EK.ooo(), EK.repair(), EK.veh(), EK.use(), EK.over(), EK.alloc(), EK.sched()]);
  var a = addPanel(v, 'p_equtil'); fill(a, my, function () { return grp('Asset', 'status', { filters: assetF() }); }, function (m) { return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  listPanel(v, my, 'p_assets', assetSpec('eq_assets')); listPanel(v, my, 'p_vehicles', vehSpec()); listPanel(v, my, 'p_repairs', repairSpec());
}

/* ---------- TAB: finance ---------- */
function tabFinance(v, my) {
  scopeNote(v); infoBox(v, ['n_fin']);
  addKpis(v, my, [FK.budget(), FK.actual(), FK.util(), FK.variance(), FK.commit(), FK.sup(), FK.cust(), FK.rev(), FK.sales(), FK.margin(), FK.dsi(), FK.dpi()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_mtrend'); fill(a, my, function () { return Promise.all(['Sales Invoice', 'Purchase Invoice'].map(function (dt) { return SC().names.length ? fetchAll(dt, { fields: ['posting_date', 'base_net_total'], filters: siF([['docstatus', '=', 1], ['posting_date', '>=', S.f.from], ['posting_date', '<=', S.f.to]]) }, 2000) : Promise.resolve({ rows: [], truncated: false }); })); }, function (r) { var inc = {}, ex = {}, ms = {}; r[0].rows.forEach(function (x) { var k = x.posting_date.slice(0, 7); inc[k] = (inc[k] || 0) + (Number(x.base_net_total) || 0); ms[k] = 1; }); r[1].rows.forEach(function (x) { var k = x.posting_date.slice(0, 7); ex[k] = (ex[k] || 0) + (Number(x.base_net_total) || 0); ms[k] = 1; }); return colchart(Object.keys(ms).sort().map(function (k) { return { l: k.slice(2), parts: [{ l: t('inc'), c: COL.g, v: inc[k] || 0 }, { l: t('exp'), c: COL.o, v: ex[k] || 0 }] }; })) + (r[0].truncated || r[1].truncated ? '<div class="dmcon-note">' + esc(t('partial', { n: 2000 })) + '</div>' : ''); });
  var b = addPanel(g, 'p_bva'); b.innerHTML = hbars(budgeted().map(function (p) { return { l: p.name + ' ' + (p.project_name || ''), v: actualCost(p) / p.estimated_costing * 100, c: actualCost(p) > p.estimated_costing ? COL.r : COL.b }; }).slice(0, 12), 1) + '<div class="dmcon-ks">% of budget used</div>';
  listPanel(v, my, 'p_pfin', finProjSpec('fi_proj'));
  listPanel(v, my, 'p_psi', invSpec('Sales Invoice', 'fi_psi', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]));
  listPanel(v, my, 'p_ppi', invSpec('Purchase Invoice', 'fi_ppi', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]));
  infoBox(v, ['n_bud'], 'note');
  listPanel(v, my, 'p_budgets', { id: 'budgets', dt: 'Budget', fields: ['name', 'budget_against', 'cost_center', 'project', 'fiscal_year', 'company', 'docstatus'], filters: [['docstatus', '=', 1]], order: 'fiscal_year desc', search: ['name'], cols: [{ h: 'c_bud', c: function (r) { return r.name; }, f: function (r) { return link('Budget', r.name); } }, { h: 'c_against', c: function (r) { return r.budget_against; } }, { h: 'c_cc', c: function (r) { return r.cost_center || r.project || ''; } }, { h: 'c_fy', c: function (r) { return r.fiscal_year; } }] });
}

/* ---------- TAB: delays ---------- */
function tabDelays(v, my) {
  scopeNote(v); infoBox(v, ['n_delay', 'n_color']);
  addKpis(v, my, [PK.delay(), PK.upc(), TK.over(), XK.rcpt(), EK.over(), { label: 'k_sappr', tone: 'grey', unavail: 'na_appr' }]);
  listPanel(v, my, 'p_delays', sSpec('dl_all', delayRows, delayCols()));
}

/* ---------- TAB: reports ---------- */
function tabReports(v, my) {
  scopeNote(v); infoBox(v, ['n_rep']);
  var reps = [
    ['rep_perf', function () { return pSpec('rp_perf'); }],
    ['rep_tproj', function () { return sSpec('rp_tproj', function () { return fetchAll('Task', { fields: ['project', 'status', 'exp_end_date'], filters: tkF() }, 5000).then(function (x) { var by = group(x.rows, function (r) { return r.project; }); return Object.keys(by).map(function (k) { var a = by[k], d = a.filter(function (r) { return r.status === 'Completed'; }).length, o = a.filter(function (r) { return DONE_ST.indexOf(r.status) < 0 && (r.status === 'Overdue' || (r.exp_end_date && r.exp_end_date < TODAY)); }).length; return { project: k, total: a.length, done: d, over: o, pct: d / a.length * 100 }; }); }); }, [{ h: 'c_project', c: function (r) { return r.project; } }, { h: 'c_count', num: true, c: function (r) { return r.total; } }, { h: 'c_tdone', num: true, c: function (r) { return r.done; } }, { h: 'k_tover', num: true, c: function (r) { return r.over; } }, { h: 'c_pct', num: true, c: function (r) { return n(r.pct, 1); } }]); }],
    ['rep_site', null],
    ['rep_man', function () { return empSpecStatic('rp_man', function () { return assignedRows(false); }, true); }],
    ['rep_att', function () { return sSpec('rp_att', function () { return grp('Attendance', 'status', { filters: [['docstatus', '=', 1], ['department', 'in', deptSet()], ['attendance_date', '>=', S.f.from], ['attendance_date', '<=', S.f.to]] }).then(function (m) { return Object.keys(m).map(function (k) { return { s: k, c: m[k] }; }); }); }, [{ h: 'c_status', c: function (r) { return st(r.s); } }, { h: 'c_count', num: true, c: function (r) { return r.c; } }]); }],
    ['rep_mat', function () { return sSpec('rp_mat', seView, lineCols('se')); }],
    ['rep_proc', function () { return sSpec('rp_proc', poView, lineCols('po')); }],
    ['rep_equip', function () { return assetSpec('rp_equip'); }],
    ['rep_bva', function () { var s = finProjSpec('rp_bva'); s.rows = budgeted(); return s; }],
    ['rep_delay', function () { return sSpec('rp_delay', delayRows, delayCols()); }],
    ['rep_month', function () { return sSpec('rp_month', function () { return Promise.all([SC().names.length ? fetchAll('Task', { fields: ['completed_on'], filters: tkF([['status', '=', 'Completed'], ['completed_on', 'is', 'set']]) }, 5000) : Promise.resolve({ rows: [] }), poLines()]).then(function (r) { var tm = monthSeries(r[0].rows, 'completed_on'), pm = monthSeries(SC().projects, 'creation'), dm = monthSeries(SC().projects.filter(function (p) { return p.status === 'Completed' && p.actual_end_date; }), 'actual_end_date'), hd = {}; r[1].forEach(function (x) { hd[x.parent] = x; }); var om = monthSeries(Object.keys(hd).map(function (k) { return hd[k]; }), 'date'); var all = uniq(Object.keys(tm).concat(Object.keys(pm), Object.keys(dm), Object.keys(om))).sort(); return all.filter(function (m) { return m >= (S.f.from || '').slice(0, 7) && m <= (S.f.to || '9999').slice(0, 7); }).map(function (m) { return { m: m, p: pm[m] || 0, d: dm[m] || 0, t: tm[m] || 0, o: om[m] || 0 }; }); }); }, [{ h: 'c_month', c: function (r) { return r.m; } }, { h: 'proj_created', num: true, c: function (r) { return r.p; } }, { h: 'projs_completed', num: true, c: function (r) { return r.d; } }, { h: 'tasks_completed', num: true, c: function (r) { return r.t; } }, { h: 'pos_created', num: true, c: function (r) { return r.o; } }]); }]
  ];
  var host = addPanel(v, 'tab_rp');
  host.innerHTML = reps.map(function (r, i) { return '<div class="dmcon-rep"><div><b>' + esc(t(r[0])) + '</b>' + (r[1] ? '' : '<small>' + esc(t('na_site')) + '</small>') + '</div>' + (r[1] ? '<button class="dmcon-btn" data-rep="' + i + '">' + esc(t('open_report')) + '</button>' : '<span class="dmcon-na">' + esc(t('unavailable')) + '</span>') + '</div>'; }).join('');
  $$('[data-rep]', host).forEach(function (b) { b.onclick = function () { var r = reps[Number(b.getAttribute('data-rep'))]; S.drill = { tk: r[0], mk: r[1], tab: S.tab }; renderView(); }; });
}

boot();
})();