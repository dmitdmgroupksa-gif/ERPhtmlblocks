/* ===== DM Group KSA — Government Relations Dashboard — SCRIPT field · v2 =====
   Moves v1 onto the DM dashboard standard. Read-only: permission-checked get_list / get_count on DM Facilities Management
   (EJAR rent contracts and facility licences), DM Companies Management (CR, MISA) and Prepaid Expense.
   Kept from v1 unchanged: the items (EJAR contract per facility; licences of Active facilities; CR per non-cancelled
   entity; MISA per entity with a MISA number), the status rule (Expired < 0 days, Expiring Soon within the alert window,
   Valid beyond it; inactive EJAR contracts and records without a date are not counted), the alert window choice
   (30 / 60 / 90 days, default 60), the expiry-range presets, the data-gap checks, the entity matrix and the EN/AR dictionary.
   The shared runtime between the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js (edit the kit, not the copy). */
(function () {
  'use strict';
  /* ---- v1 Arabic dictionary (display only; English UI text is the key) ---- */
  var GAR = {
    "Government Relations": "العلاقات الحكومية",
    "Government Relations Dashboard": "لوحة معلومات العلاقات الحكومية",
    "EJAR Contracts & Prepaid": "عقود إيجار والمصروفات المدفوعة مقدماً",
    "License Expiry": "انتهاء التراخيص",
    "Commercial Registration": "السجل التجاري",
    "MISA": "وزارة الاستثمار",
    "Search entity, number, company...": "ابحث عن الكيان أو الرقم أو الشركة...",
    "Alert: 30 days": "تنبيه: 30 يوماً",
    "Alert: 60 days": "تنبيه: 60 يوماً",
    "Alert: 90 days": "تنبيه: 90 يوماً",
    "Dark / Light": "داكن / فاتح",
    "Expiry date range": "نطاق تاريخ الانتهاء",
    "All time": "كل الفترات",
    "Overdue": "متأخر",
    "Next 30 days": "خلال 30 يوماً",
    "Next 60 days": "خلال 60 يوماً",
    "Next 90 days": "خلال 90 يوماً",
    "This month": "هذا الشهر",
    "This quarter": "هذا الربع",
    "This year": "هذه السنة",
    "From": "من",
    "To": "إلى",
    "Clear": "مسح",
    "Overview": "نظرة عامة",
    "EJAR & Prepaid": "إيجار والمدفوعات المقدمة",
    "Commercial Registration": "السجل التجاري",
    "Tip: click any KPI tile to open the matching records in ERP.": "ملاحظة: اضغط على أي مؤشر لفتح السجلات المرتبطة في النظام.",
    "Overall status": "الحالة العامة",
    "counted items": "العناصر المحتسبة",
    "Expiries by month": "حالات الانتهاء حسب الشهر",
    "overdue + next 12 months": "المتأخر + الاثنا عشر شهراً القادمة",
    "Compliance score": "مؤشر الامتثال",
    "valid ÷ counted": "الصالح ÷ المحتسب",
    "Status by category": "الحالة حسب الفئة",
    "Cumulative expiries": "إجمالي حالات الانتهاء",
    "next 12 months": "الاثنا عشر شهراً القادمة",
    "Next renewals": "التجديدات القادمة",
    "soonest upcoming": "الأقرب موعداً",
    "Items by type": "العناصر حسب النوع",
    "status mix": "توزيع الحالات",
    "Renewal heatmap": "خريطة التجديد الحرارية",
    "items expiring per month": "العناصر التي تنتهي شهرياً",
    "Needs action now": "يتطلب إجراءً الآن",
    "expired or within alert window": "منتهي أو ضمن فترة التنبيه",
    "Data gaps in ERP": "نواقص البيانات في النظام",
    "fix at source": "يرجى التصحيح من المصدر",
    "Entity compliance matrix": "مصفوفة امتثال الكيانات",
    "All tracked items": "جميع العناصر المتابعة",
    "Active contracts only": "العقود النشطة فقط",
    "All contracts (incl. closed)": "جميع العقود (بما فيها المغلقة)",
    "All facility types": "جميع أنواع المنشآت",
    "Contract status": "حالة العقد",
    "Days to contract end": "الأيام المتبقية لانتهاء العقد",
    "soonest first": "الأقرب أولاً",
    "Contracts ending by month": "العقود المنتهية حسب الشهر",
    "Total rent by facility type": "إجمالي الإيجار حسب نوع المنشأة",
    "Total rent by company": "إجمالي الإيجار حسب الشركة",
    "EJAR rent contracts": "عقود إيجار",
    "Prepaid expenses": "المصروفات المدفوعة مقدماً",
    "Prepaid Expense doctype": "مستند المصروفات المدفوعة مقدماً",
    "All statuses": "جميع الحالات",
    "All license types": "جميع أنواع التراخيص",
    "Government + service contracts": "العقود الحكومية والخدمية",
    "Government": "حكومي",
    "Service Contract": "عقد خدمة",
    "License status": "حالة الترخيص",
    "Days remaining": "الأيام المتبقية",
    "Status by license type": "الحالة حسب نوع الترخيص",
    "License register": "سجل التراخيص",
    "active facilities": "المنشآت النشطة",
    "CR status": "حالة السجل التجاري",
    "Days to CR expiry": "الأيام المتبقية لانتهاء السجل التجاري",
    "active CRs": "السجلات التجارية النشطة",
    "Entities by location": "الكيانات حسب الموقع",
    "CR expiries by month": "انتهاء السجلات التجارية حسب الشهر",
    "Commercial registrations": "السجلات التجارية",
    "field: CR Expiry": "الحقل: تاريخ انتهاء السجل التجاري",
    "MISA status": "حالة وزارة الاستثمار",
    "Days to MISA expiry": "الأيام المتبقية لانتهاء ترخيص الاستثمار",
    "entities with a date": "الكيانات التي لديها تاريخ",
    "MISA expiry coverage": "تغطية تواريخ انتهاء تراخيص الاستثمار",
    "MISA expiries by month": "انتهاء تراخيص الاستثمار حسب الشهر",
    "MISA licenses": "تراخيص الاستثمار",
    "field: MISA Expiry": "الحقل: تاريخ انتهاء ترخيص الاستثمار",
    "Entity": "الكيان",
    "CR Expiry": "انتهاء السجل التجاري",
    "National Address Expiry": "انتهاء العنوان الوطني",
    "MISA Expiry": "انتهاء ترخيص الاستثمار",
    "Industrial License (date)": "تاريخ الرخصة الصناعية",
    "Chamber No.": "رقم الغرفة التجارية",
    "ERP": "النظام",
    "Cancelled": "ملغى",
    "No date": "لا يوجد تاريخ",
    "Expired": "منتهي",
    "Expiring Soon": "ينتهي قريباً",
    "Valid": "ساري",
    "Tracked items": "العناصر المتابعة",
    "Expired – renew now": "منتهي – يرجى التجديد",
    "Expiring in": "ينتهي خلال",
    "Active EJAR contracts": "عقود إيجار النشطة",
    "Active CRs": "السجلات التجارية النشطة",
    "Compliance (valid items)": "الامتثال (العناصر السارية)",
    "Showing all dates": "عرض جميع التواريخ",
    "No gaps found.": "لا توجد نواقص.",
    "No expiry on record": "لا يوجد تاريخ انتهاء مسجل",
    "Has expiry date": "يوجد تاريخ انتهاء",
    "CR cancelled": "السجل التجاري ملغى",
    "Days Left": "الأيام المتبقية",
    "CR Number": "رقم السجل التجاري",
    "Unified No.": "الرقم الموحد",
    "Location": "الموقع",
    "Type": "النوع",
    "Status": "الحالة",
    "Note": "ملاحظة",
    "Open": "فتح",
    "Close": "إغلاق",
    "No date on record": "لا يوجد تاريخ مسجل",
    "All records": "جميع السجلات",
    "Total records": "إجمالي السجلات",
    "Next to expire": "الأقرب انتهاءً",
    "No action needed": "لا يلزم إجراء",
    "renew immediately": "يرجى التجديد فوراً",
    "within": "خلال",
    "days": "أيام",
    "items": "عناصر",
    "Showing": "عرض",
    "of": "من",
    "Data:": "البيانات:",
    "snapshot, retrieved": "لقطة بيانات، تم جلبها",
    "Government Relations Dashboard • Data: DM ERPNext snapshot (see data.js)": "لوحة معلومات العلاقات الحكومية • البيانات: لقطة من نظام DM ERPNext (راجع data.js)"
  };
  /* ---- v2 additions to the v1 dictionary ---- */
  Object.assign(GAR, {
    'License Expiry': 'انتهاء التراخيص', 'Inactive / no date': 'غير نشط / بلا تاريخ', 'Expiring soon': 'ينتهي قريباً', 'Entity / Facility': 'الكيان / المنشأة', 'Category': 'الفئة',
    'Type / Detail': 'النوع / التفاصيل', 'Number': 'الرقم', 'Authority': 'الجهة', 'Company': 'الشركة', 'Expiry date': 'تاريخ الانتهاء', 'Total Rent': 'إجمالي الإيجار', 'Auto Renewal': 'التجديد التلقائي',
    'Record': 'السجل', 'No records.': 'لا توجد سجلات.', 'No data': 'لا توجد بيانات', 'Licences': 'التراخيص', 'EJAR contracts': 'عقود إيجار', 'Commercial Reg.': 'السجل التجاري', 'EJAR': 'إيجار', 'CR': 'السجل التجاري',
    'EJAR Contract': 'عقد إيجار', 'MISA License': 'ترخيص الاستثمار', 'No MISA expiry on record in ERP': 'لا يوجد تاريخ انتهاء لترخيص الاستثمار في النظام', 'Accommodation': 'سكن',
    'Commercial Licence': 'الرخصة التجارية', 'Civil Defense Certificate': 'شهادة الدفاع المدني', 'National Address': 'العنوان الوطني', 'Industrial License': 'الرخصة الصناعية', 'Construction Env. Permit': 'التصريح البيئي الإنشائي',
    'Operational Env. Permit': 'التصريح البيئي التشغيلي', 'Fire Maintenance Contract': 'عقد صيانة الحريق', 'Camera Maintenance Contract': 'عقد صيانة الكاميرات', 'Cleaning Contract': 'عقد النظافة',
    'Zakat details empty': 'بيانات الزكاة فارغة', 'MISA expiry missing': 'تاريخ انتهاء ترخيص الاستثمار غير موجود', 'National Address expiry missing': 'تاريخ انتهاء العنوان الوطني غير موجود', 'Commercial Licence expiry missing': 'تاريخ انتهاء الرخصة التجارية غير موجود',
    'Civil Defense date missing': 'تاريخ الدفاع المدني غير موجود', 'No Prepaid Expense records': 'لا توجد سجلات مصروفات مدفوعة مقدماً', 'Placeholder CR number (0000000000)': 'رقم سجل تجاري مؤقت (0000000000)', 'Industrial License field has dates only': 'حقل الرخصة الصناعية يحتوي تواريخ فقط',
    'Today': 'اليوم', 'Open': 'فتح', 'Alert: 30 days': 'تنبيه: 30 يوماً', 'Alert: 90 days': 'تنبيه: 90 يوماً', 'Overdue': 'متأخر', 'MISA': 'وزارة الاستثمار'
  });
  function L(s) { return LANG === 'ar' && Object.prototype.hasOwnProperty.call(GAR, s) ? GAR[s] : s; }
  var APP = {
    key: '__dmsGovRelations',
    period: false,
    tabs: [['overview', 'Overview'], ['ejar', 'EJAR & Prepaid'], ['licenses', 'License Expiry'], ['cr', 'Commercial Registration'], ['misa', 'MISA']].map(function (x) { return { id: x[0], en: x[1], ar: GAR[x[1]] || x[1] }; }).concat([{ id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }]),
    filters: [
      { k: 'range', en: 'Expiry date range', ar: 'نطاق تاريخ الانتهاء', none: ['All time', 'كل الفترات'], options: function () { return [['overdue', 'Overdue'], ['n30', 'Next 30 days'], ['n60', 'Next 60 days'], ['n90', 'Next 90 days'], ['month', 'This month'], ['quarter', 'This quarter'], ['year', 'This year']].map(function (x) { return { v: x[0], l: L(x[1]) }; }); } },
      { k: 'from', en: 'Expiry from', ar: 'الانتهاء من', type: 'date' },
      { k: 'to', en: 'Expiry to', ar: 'الانتهاء إلى', type: 'date' },
      { k: 'win', en: 'Alert window', ar: 'فترة التنبيه', none: ['60 days', '60 يوماً'], options: function () { return [{ v: '30', l: L('Alert: 30 days') }, { v: '90', l: L('Alert: 90 days') }]; } },
      { k: 'q', en: 'Search', ar: 'بحث', type: 'text', ph: ['Search entity, number, company...', GAR['Search entity, number, company...']] }
    ],
    sources: ['fac', 'com', 'pre'],
    dtLabels: { 'DM Facilities Management': ['Facility', 'منشأة'], 'DM Companies Management': ['Entity', 'كيان'], 'Prepaid Expense': ['Prepaid expense', 'مصروف مقدم'] },
    title: function () { return L('Government Relations Dashboard'); },
    stamp: function () { return [L('EJAR Contracts & Prepaid'), L('License Expiry'), L('Commercial Registration'), L('MISA')].join(' · '); },
    filterNote: function () { return tr('A from / to date overrides the range preset. Status uses the alert window.', 'تاريخ "من / إلى" يتقدم على الفترة المحددة مسبقاً. تعتمد الحالة على فترة التنبيه.'); },
    load: function () {
      ITEMS = { ejar: [], lic: [], cr: [], misa: [] }; ENT = []; FACS = [];
      var rd = function (k, dt, fields) { run(k, function (chk) { return fetchAll({ doctype: dt, fields: fields, filters: [], order_by: 'name asc' }, chk); }); };
      rd('fac', FAC, FAC_F); rd('com', COM, COM_F); rd('pre', PRE, PRE_F);
    },
    afterLoad: function () { build(); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return ['fac', 'com', 'pre'].filter(function (k) { return D[k + 'Err']; }).map(function (k) { return alertBox('err', '<b>' + esc(tr('Source unavailable', 'المصدر غير متاح')) + ':</b> ' + bdi({ fac: FAC, com: COM, pre: PRE }[k]) + ' — ' + esc(D[k + 'Err'] === 'perm' ? tr('permission denied for your user', 'لا تملك صلاحية القراءة') : D[k + 'Err'])); }).join(''); },
    content: function (x, AM) { return view(x, AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v) { return onAct(a, v); }
  };
  var FAC = 'DM Facilities Management', COM = 'DM Companies Management', PRE = 'Prepaid Expense';
  var ITEMS = { ejar: [], lic: [], cr: [], misa: [] }, ENT = [], FACS = [], EJF = 'active', EJT = '', LGRP = '', CHIP = '';

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

  /* ============================================================ v1 sources and items (unchanged rules) */
  var FAC_F = ['name', 'facility_name', 'company', 'facility_detail', 'facility_type', 'location', 'contract_number', 'agreement_type', 'date_frm', 'rentdate_to', 'rent_amount', 'auto_renewal', 'facility_contract_status', 'com_act_no', 'com_lic_exp', 'municipality', 'civil_def_no', 'cd_date_to', 'national_adress_expiry', 'industrial_expiry', 'construction_environmental_permit_expiry', 'operational_environmental_permit_expiry', 'fire_expiry', 'camera_expiry', 'cleanig_exp_date'];
  var COM_F = ['name', 'company_name', 'type', 'location', 'cr_number', 'unified_number', 'riyadh_chamber', 'cr_expiry', 'national_address_expiry', 'misa', 'misa_expiry', 'zakat_details', 'industrial_license1', 'cr_cancelled', 'cancellation_date'];
  var PRE_F = ['name', 'company', 'total_amount', 'start_date', 'end_date', 'status'];
  var LIC_FIELDS = [['com_lic_exp', 'Commercial Licence', 'Government', 'com_act_no', 1], ['cd_date_to', 'Civil Defense Certificate', 'Government', 'civil_def_no'], ['national_adress_expiry', 'National Address', 'Government', null, 1], ['industrial_expiry', 'Industrial License', 'Government', null], ['construction_environmental_permit_expiry', 'Construction Env. Permit', 'Government', null], ['operational_environmental_permit_expiry', 'Operational Env. Permit', 'Government', null], ['fire_expiry', 'Fire Maintenance Contract', 'Service Contract', null], ['camera_expiry', 'Camera Maintenance Contract', 'Service Contract', null], ['cleanig_exp_date', 'Cleaning Contract', 'Service Contract', null]];
  var COLORS = { ok: '#1e9e5a', warn: '#d98a0b', danger: '#d93f3f', muted: '#9aa6b6' };
  function win() { return +F.win || 60; }
  function dd(v) { return v ? String(v).slice(0, 10) : null; }
  function mk(o) { o.expiry = dd(o.expiry); o.days = o.expiry ? diffDays(TODAY, o.expiry) : null; return o; }
  function build() {
    if (!['fac', 'com', 'pre'].every(function (k) { return D[k] != null || D[k + 'Err']; })) { return; }
    FACS = D.fac || []; ENT = (D.com || []).map(function (r) { return { id: r.name, n: r.company_name || r.name, type: r.type || '', loc: r.location || '', cr: r.cr_number || '', uni: r.unified_number || '', ch: r.riyadh_chamber || '', crExp: dd(r.cr_expiry), naExp: dd(r.national_address_expiry), misa: r.misa || '', misaExp: dd(r.misa_expiry), zakat: r.zakat_details || null, ind: dd(r.industrial_license1), canc: !!r.cr_cancelled, cancDate: dd(r.cancellation_date) }; });
    var I = { ejar: [], lic: [], cr: [], misa: [] };
    FACS.forEach(function (f) {
      var active = f.facility_contract_status === 'Active';
      I.ejar.push(mk({ category: 'EJAR', src: 'ejar', dt: FAC, doc: f.name, entity: f.facility_name || f.name, company: f.company || '—', name: (f.facility_detail || '') + ' • ' + (f.facility_type || ''), detail: f.facility_detail || '', ref: f.contract_number || '—', expiry: f.rentdate_to, from: dd(f.date_frm), rent: f.rent_amount || 0, auto: f.auto_renewal || '—', fstatus: f.facility_contract_status || 'Not set', active: active, loc: f.location || '' }));
      if (!active) { return; }
      LIC_FIELDS.forEach(function (lf) { if (!f[lf[0]]) { return; } I.lic.push(mk({ category: 'License', src: lf[0], dt: FAC, doc: f.name, group: lf[2], entity: f.facility_name || f.name, company: f.company || '—', name: lf[1], ref: (lf[3] && f[lf[3]]) || '—', authority: lf[4] ? (f.municipality || '') : '', expiry: f[lf[0]] })); });
    });
    ENT.forEach(function (e) {
      if (!e.canc) { I.cr.push(mk({ category: 'CR', src: 'cr', dt: COM, doc: e.id, entity: e.n, name: e.type, loc: e.loc, ref: e.cr, uni: e.uni, chamber: e.ch, expiry: e.crExp })); }
      if (e.misa) { I.misa.push(mk({ category: 'MISA', src: 'misa', dt: COM, doc: e.id, entity: e.n, name: e.type, ref: e.misa, expiry: e.misaExp, cancelled: e.canc, cancDate: e.cancDate, loc: e.loc })); }
    });
    ITEMS = I;
  }
  function ready() { return ['fac', 'com', 'pre'].every(function (k) { return D[k] != null || D[k + 'Err']; }); }
  function statusOf(x) { var w = win(); return x.cancelled ? 'Cancelled' : (x.category === 'EJAR' && !x.active) ? x.fstatus : x.days == null ? 'No Date' : x.days < 0 ? 'Expired' : x.days <= w ? 'Expiring Soon' : 'Valid'; }
  function counted(x) { return x.status === 'Valid' || x.status === 'Expiring Soon' || x.status === 'Expired'; }
  function range() {
    if (F.from || F.to) { return { from: F.from || null, to: F.to || null }; }
    var t = TODAY, y = t.slice(0, 4), m = +t.slice(5, 7), p = F.range;
    if (p === 'overdue') { return { from: null, to: addDays(t, -1) }; } if (p === 'n30' || p === 'n60' || p === 'n90') { return { from: t, to: addDays(t, +p.slice(1)) }; }
    if (p === 'month') { return { from: t.slice(0, 8) + '01', to: addDays(addMonths(t, 1), -1) }; }
    if (p === 'quarter') { var q = Math.floor((m - 1) / 3) * 3 + 1, qs = y + '-' + String(q).padStart(2, '0') + '-01'; return { from: qs, to: addDays(addMonths(qs, 3), -1) }; }
    if (p === 'year') { return { from: y + '-01-01', to: y + '-12-31' }; }
    return { from: null, to: null };
  }
  function vis(k) {
    var r = range(), q = String(F.q || '').trim().toLowerCase();
    return ITEMS[k].map(function (x) { x.status = statusOf(x); return x; }).filter(function (x) {
      if (r.from || r.to) { if (!x.expiry) { return false; } if (r.from && x.expiry < r.from) { return false; } if (r.to && x.expiry > r.to) { return false; } }
      return !q || [x.entity, x.company, x.name, x.ref, x.loc].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }
  function allCounted() { return vis('ejar').filter(function (x) { return x.active; }).concat(vis('lic').filter(function (x) { return x.group === 'Government'; }), vis('cr'), vis('misa')).filter(counted); }
  function cnt(a, s) { return a.filter(function (x) { return x.status === s; }).length; }
  function daysText(x) { return x.days == null ? '—' : x.days < 0 ? Math.abs(x.days) + ' ' + tr('days overdue', 'يوماً متأخراً') : x.days === 0 ? L('Today') : x.days + ' ' + L('days'); }
  function stTag(s) { return stat(s === 'Expired' ? 'bad' : s === 'Expiring Soon' ? 'warn' : s === 'Valid' ? 'ok' : 'n', L(s)); }
  function sar(n) { return num(Math.round(Number(n) || 0)) + ' SAR'; }

  /* ============================================================ actions pending */
  function gapRows() {
    var act = ENT.filter(function (e) { return !e.canc; }), comm = FACS.filter(function (f) { return f.facility_contract_status === 'Active' && f.facility_detail !== 'Accomadation'; }), o = [];
    act.forEach(function (e) { if (e.misa && !e.misaExp) { o.push({ dt: COM, name: e.id, title: e.n, gap: 'MISA expiry missing' }); } if (!e.naExp) { o.push({ dt: COM, name: e.id, title: e.n, gap: 'National Address expiry missing' }); } if (/^0+$/.test(e.cr)) { o.push({ dt: COM, name: e.id, title: e.n, gap: 'Placeholder CR number (0000000000)' }); } });
    comm.forEach(function (f) { if (!f.com_lic_exp) { o.push({ dt: FAC, name: f.name, title: f.facility_name || f.name, gap: 'Commercial Licence expiry missing' }); } if (!f.cd_date_to) { o.push({ dt: FAC, name: f.name, title: f.facility_name || f.name, gap: 'Civil Defense date missing' }); } });
    return o;
  }
  var ACT = [['a_exp', 'high', 'Expired', 'Expired items', 'عناصر منتهية', 'Renew now; tracked items past their expiry date', 'جدّد الآن؛ عناصر متابعة تجاوزت تاريخ انتهائها'], ['a_soon', 'med', 'Expiring Soon', 'Expiring within the alert window', 'تنتهي خلال فترة التنبيه', 'Start the renewal before the expiry date', 'ابدأ التجديد قبل تاريخ الانتهاء'], ['a_gap', 'low', null, 'Data gaps in ERP', 'نواقص البيانات في النظام', 'Required dates or numbers missing; fix at source', 'تواريخ أو أرقام مطلوبة ناقصة؛ صحّحها من المصدر']];
  function actSpecs() { return ACT.map(function (a) { return { id: a[0], client: true, short: tr(a[3], a[4]), title: tr(a[3], a[4]), why: tr(a[5], a[6]) }; }); }
  function actClient() {
    if (!ready()) { return null; } if (D.facErr && D.comErr) { return 'ERR:' + D.facErr; }
    var a = allCounted(), o = {};
    ['a_exp', 'a_soon'].forEach(function (k, i) { var st = ACT[i][2], pr = ACT[i][1]; o[k] = { rows: a.filter(function (x) { return x.status === st; }), item: function (x) { return { p: pr, score: score(pr, 0, x.days < 0 ? -x.days : 0), dt: x.dt, name: x.doc, title: x.entity, desc: L(x.category === 'License' ? x.name : x.category === 'EJAR' ? 'EJAR rent contracts' : x.category === 'CR' ? 'Commercial Registration' : 'MISA') + (x.expiry ? ' · ' + x.expiry : ''), who: x.company && x.company !== '—' ? x.company : x.loc || '', due: daysText(x), tone: pr === 'high' ? 'bad' : 'warn' }; } }; });
    o.a_gap = { rows: gapRows(), item: function (g) { return { p: 'low', score: score('low', 0, 0), dt: g.dt, name: g.name, title: g.title, desc: L(g.gap), who: '', due: '', tone: 'n' }; } };
    return o;
  }

  /* ============================================================ shared pieces */
  function two(a, b) { return '<div class="dms-cols-2 dms-grid">' + a + b + '</div>'; }
  function statusBars(arr, act) { var items = [['Valid', COLORS.ok], ['Expiring Soon', COLORS.warn], ['Expired', COLORS.danger]].map(function (s) { return { label: L(s[0]), value: cnt(arr, s[0]), color: s[1], act: act ? act + s[0] : null }; }); items.push({ label: L('Inactive / no date'), value: arr.filter(function (x) { return !counted(x); }).length, color: COLORS.muted }); return mixBar(items) + hbars(items, num); }
  function stackRows(rows) { return rows.length ? '<div class="gr-stack">' + rows.map(function (r) { var tot = r.arr.length; return '<div class="gr-srow"><span title="' + esc(r.label) + '">' + bdi(r.label) + '</span><span>' + mixBar([{ label: L('Expired'), value: cnt(r.arr, 'Expired'), color: COLORS.danger }, { label: L('Expiring Soon'), value: cnt(r.arr, 'Expiring Soon'), color: COLORS.warn }, { label: L('Valid'), value: cnt(r.arr, 'Valid'), color: COLORS.ok }]) + '</span><span class="dms-num">' + num(tot) + '</span></div>'; }).join('') + '</div>' + legendS() : empty(L('No data')); }
  function legendS() { return '<div class="gr-legend">' + [['Expired', COLORS.danger], ['Expiring Soon', COLORS.warn], ['Valid', COLORS.ok]].map(function (s) { return '<span><i style="background:' + s[1] + '"></i>' + esc(L(s[0])) + '</span>'; }).join('') + '</div>'; }
  function monthKeys() { var k = ['__od']; for (var i = 0; i < 12; i++) { k.push(addMonths(TODAY, i).slice(0, 7)); } return k; }
  function monthOf(x) { return x.days < 0 ? '__od' : x.expiry.slice(0, 7); }
  function monthChart(arr) {
    var keys = monthKeys(), c = arr.filter(counted), lab = function (k) { return k === '__od' ? L('Overdue') : fmtDate(k + '-01').replace(/^\d+\s*/, ''); };
    if (!c.length) { return empty(L('No data')); }
    var back = {}, labs = keys.map(function (k) { var l = lab(k); back[l] = k; return l; });
    return barChart(labs, 'cat', [['Expired', COLORS.danger], ['Expiring Soon', COLORS.warn], ['Valid', COLORS.ok]].map(function (s) { return { label: L(s[0]), color: s[1], val: function (l) { return c.filter(function (x) { return x.status === s[0] && monthOf(x) === back[l]; }).length; } }; }), num);
  }
  function heat(a) {
    var keys = monthKeys(), rows = [['EJAR contracts', 'EJAR'], ['Licences', 'License'], ['Commercial Reg.', 'CR'], ['MISA', 'MISA']];
    return '<div class="dms-tablewrap"><table class="dms-table gr-heat"><thead><tr><th scope="col"></th>' + keys.map(function (k) { return '<th scope="col" class="dms-num">' + esc(k === '__od' ? L('Overdue') : fmtDate(k + '-01').replace(/^\d+\s*/, '').replace(/\s\d{4}$/, '')) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
      var arr = a.filter(function (x) { return x.category === r[1]; });
      return '<tr><th scope="row">' + esc(L(r[0])) + '</th>' + keys.map(function (k) { var n = arr.filter(function (x) { return monthOf(x) === k; }).length; return '<td class="dms-num' + (n ? (k === '__od' ? ' gr-h-od' : ' gr-h-' + Math.min(3, n)) : '') + '">' + (n ? n : '·') + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }
  function itemCols(extra) {
    var C = {
      cat: { k: 'cat', h: L('Category'), s: function (r) { return r.category; }, r: function (r) { return stat('n', r.category); }, c: function (r) { return r.category; } },
      entity: { k: 'entity', h: L('Entity / Facility'), s: function (r) { return r.entity; }, r: function (r) { return docLink(r.dt, r.doc, r.entity); }, c: function (r) { return r.entity; } },
      company: { k: 'company', h: L('Company'), s: function (r) { return r.company || ''; }, r: function (r) { return bdi(r.company || '—'); }, c: function (r) { return r.company; } },
      name: { k: 'name', h: L('Type / Detail'), s: function (r) { return r.name; }, r: function (r) { return esc(L(r.name)) + (r.group ? '<div class="dms-sm">' + esc(L(r.group)) + '</div>' : ''); }, c: function (r) { return r.name; } },
      ref: { k: 'ref', h: L('Number'), s: function (r) { return r.ref || ''; }, r: function (r) { return bdi(r.ref || '—'); }, c: function (r) { return r.ref; } },
      authority: { k: 'auth', h: L('Authority'), s: function (r) { return r.authority || ''; }, r: function (r) { return bdi(r.authority || '—'); }, c: function (r) { return r.authority; } },
      loc: { k: 'loc', h: L('Location'), s: function (r) { return r.loc || ''; }, r: function (r) { return bdi(r.loc || '—'); }, c: function (r) { return r.loc; } },
      uni: { k: 'uni', h: L('Unified No.'), s: function (r) { return r.uni || ''; }, r: function (r) { return bdi(r.uni || '—'); }, c: function (r) { return r.uni; } },
      chamber: { k: 'ch', h: L('Chamber No.'), s: function (r) { return r.chamber || ''; }, r: function (r) { return bdi(r.chamber || '—'); }, c: function (r) { return r.chamber; } },
      from: { k: 'from', h: L('From'), s: function (r) { return r.from || ''; }, r: function (r) { return dtc(r.from); }, c: function (r) { return r.from; } },
      expiry: { k: 'expiry', h: L('Expiry date'), s: function (r) { return r.expiry || '9999'; }, r: function (r) { return dtc(r.expiry); }, c: function (r) { return r.expiry; } },
      days: { k: 'days', h: L('Days Left'), num: 1, s: function (r) { return r.days == null ? 1e9 : r.days; }, r: function (r) { return counted(r) ? '<span class="dms-num gr-d gr-d-' + (r.status === 'Expired' ? 'bad' : r.status === 'Expiring Soon' ? 'warn' : 'ok') + '">' + esc(daysText(r)) + '</span>' : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.days; } },
      rent: { k: 'rent', h: L('Total Rent'), num: 1, s: function (r) { return r.rent; }, r: function (r) { return '<span class="dms-num">' + esc(sar(r.rent)) + '</span>'; }, c: function (r) { return r.rent; } },
      auto: { k: 'auto', h: L('Auto Renewal'), s: function (r) { return r.auto; }, r: function (r) { return esc(r.auto); }, c: function (r) { return r.auto; } },
      status: { k: 'status', h: L('Status'), s: function (r) { return ['Expired', 'Expiring Soon', 'Valid'].indexOf(r.status) + 1 || 9; }, r: function (r) { return stTag(r.status) + (r.cancelled ? '<div class="dms-sm">' + esc(L('CR cancelled') + ' ' + (r.cancDate || '')) + '</div>' : r.category === 'MISA' && !r.expiry ? '<div class="dms-sm">' + esc(L('No MISA expiry on record in ERP')) + '</div>' : ''); }, c: function (r) { return r.status; } }
    };
    return extra.map(function (k) { return C[k]; });
  }
  function itemTable(id, rows, cols, ps) { return regTable({ id: id, rows: rows, pageSize: ps || 15, file: id, text: function (r) { return [r.entity, r.company, r.name, r.ref, r.loc].join(' '); }, empty: L('No records.'), sk: 'days', dir: 1, cols: itemCols(cols) }); }
  function nextKpi(a) { var n = a.filter(function (x) { return counted(x) && x.days >= 0; }).sort(function (x, y) { return x.days - y.days; })[0]; return kpi({ label: L('Next to expire'), val: n ? num(n.days) + ' d' : '–', sub: n ? bdi(n.entity) : '' }); }
  function statusKpis(a, src, label, extraSub) {
    var w = win();
    return [kpi({ label: L(label), val: num(a.length), sub: extraSub || '', act: 'st:' + src + ':all' }), kpi({ label: L('Expired'), dot: cnt(a, 'Expired') ? COLORS.danger : null, val: num(cnt(a, 'Expired')), sub: esc(L('renew immediately')), act: 'st:' + src + ':Expired' }), kpi({ label: L('Expiring soon'), dot: cnt(a, 'Expiring Soon') ? COLORS.warn : null, val: num(cnt(a, 'Expiring Soon')), sub: esc(L('within') + ' ' + w + ' ' + L('days')), act: 'st:' + src + ':Expiring Soon' }), kpi({ label: L('Valid'), dot: COLORS.ok, val: num(cnt(a, 'Valid')), sub: esc(L('No action needed')), act: 'st:' + src + ':Valid' })];
  }
  function segBtns(act, list, cur) { return '<div class="gr-seg" role="group">' + list.map(function (x) { return '<button type="button" class="dms-btn dms-btn-sm' + (x[0] === cur ? ' dms-btn-primary' : '') + '" data-act="' + act + '" data-v="' + esc(x[0]) + '" aria-pressed="' + (x[0] === cur) + '">' + esc(L(x[1])) + '</button>'; }).join('') + '</div>'; }

  /* ============================================================ views */
  function view(x, AM) {
    if (ready()) { build(); }
    if (!ready()) { return x === 'overview' ? '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>' : '<div class="dms-skel dms-skel-panel"></div>'; }
    if (D.facErr && D.comErr) { return srcErr(D.facErr, FAC) + srcErr(D.comErr, COM) + (x === 'overview' ? actionsPanel(AM) : ''); }
    if (x === 'actions') { return actionsTab(AM, tr('Actions follow the expiry range, alert window and search.', 'تتبع الإجراءات نطاق تاريخ الانتهاء وفترة التنبيه والبحث.')); }
    return ({ overview: vOverview, ejar: vEjar, licenses: vLic, cr: vCR, misa: vMisa })[x](AM);
  }
  function vOverview(AM) {
    var a = allCounted(), act = vis('ejar').filter(function (x) { return x.active; }), pctv = a.length ? cnt(a, 'Valid') / a.length * 100 : null;
    var h = kpis(statusKpis(a, 'all', 'Tracked items', esc('EJAR + licences + CR + MISA')).concat([kpi({ label: L('Compliance score'), dot: pctv == null ? null : pctv >= 90 ? COLORS.ok : pctv >= 70 ? COLORS.warn : COLORS.danger, val: pctv == null ? '—' : pct(cnt(a, 'Valid'), a.length, 0), sub: esc(L('valid ÷ counted')) }), kpi({ label: L('Active EJAR contracts'), val: num(act.length), sub: esc(sar(act.reduce(function (s, x) { return s + x.rent; }, 0))), act: 'goto:ejar' })]), true);
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(L('Overall status'), statusBars(a, 'st:all:'), '', esc(num(a.length) + ' ' + L('counted items'))) + '</div></div>';
    h += two(panel(L('Expiries by month'), monthChart(a), '', esc(L('overdue + next 12 months'))), panel(L('Status by category'), stackRows([['EJAR', 'EJAR'], ['Licences', 'License'], ['CR', 'CR'], ['MISA', 'MISA']].map(function (c) { return { label: L(c[0]), arr: a.filter(function (x) { return x.category === c[1]; }) }; }))));
    h += panel(L('Renewal heatmap'), heat(a), '', esc(L('items expiring per month')));
    var tmap = {}; a.forEach(function (x) { var k = x.category === 'EJAR' ? 'EJAR Contract' : x.category === 'CR' ? 'Commercial Registration' : x.category === 'MISA' ? 'MISA License' : x.name; (tmap[k] = tmap[k] || []).push(x); });
    var gaps = gapsPanel();
    h += two(panel(L('Items by type'), stackRows(Object.keys(tmap).map(function (k) { return { label: L(k), arr: tmap[k] }; }).sort(function (x, y) { return y.arr.length - x.arr.length; }).slice(0, 10)), '', esc(L('status mix'))), gaps);
    h += panel(L('Entity compliance matrix'), matrix());
    return h + panel(L('All tracked items'), itemTable('t_all', a, ['cat', 'entity', 'name', 'ref', 'expiry', 'days', 'status'], 15), '', esc(num(a.length) + ' ' + L('items')));
  }
  function gapsPanel() {
    var act = ENT.filter(function (e) { return !e.canc; }), comm = FACS.filter(function (f) { return f.facility_contract_status === 'Active' && f.facility_detail !== 'Accomadation'; });
    var out = [[ENT.filter(function (e) { return !e.zakat; }).length, 'Zakat details empty', 'of ' + ENT.length + ' entities', COM, {}], [act.filter(function (e) { return e.misa && !e.misaExp; }).length, 'MISA expiry missing', 'active entities with a MISA no. but no expiry (branches share the HQ MISA no.)', COM, { cr_cancelled: 0, misa_expiry: ['is', 'not set'] }], [act.filter(function (e) { return !e.naExp; }).length, 'National Address expiry missing', 'active entities', COM, { cr_cancelled: 0, national_address_expiry: ['is', 'not set'] }], [comm.filter(function (f) { return !f.com_lic_exp; }).length, 'Commercial Licence expiry missing', 'active non-accommodation facilities', FAC, { facility_contract_status: 'Active', com_lic_exp: ['is', 'not set'] }], [comm.filter(function (f) { return !f.cd_date_to; }).length, 'Civil Defense date missing', 'active non-accommodation facilities', FAC, { facility_contract_status: 'Active', cd_date_to: ['is', 'not set'] }], [D.pre && D.pre.length === 0 ? 1 : 0, 'No Prepaid Expense records', 'nothing to track under EJAR prepaid yet', PRE, {}], [act.filter(function (e) { return /^0+$/.test(e.cr); }).length, 'Placeholder CR number (0000000000)', 'check entity record', COM, { cr_number: '0000000000' }], [ENT.filter(function (e) { return e.ind; }).length, 'Industrial License field has dates only', "field is not labelled 'expiry' — confirm meaning before alerting", COM, { industrial_license1: ['is', 'set'] }]].filter(function (g) { return g[0]; });
    var url = function (dt, f) { return '/app/' + dt.toLowerCase().replace(/[^a-z0-9]+/g, '-') + (Object.keys(f).length ? '?' + Object.keys(f).map(function (k) { var v = f[k]; return encodeURIComponent(k) + '=' + encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : v); }).join('&') : ''); };
    return panel(L('Data gaps in ERP'), out.length ? '<ul class="gr-gaps">' + out.map(function (g) { return '<li><div><b>' + esc(L(g[1])) + '</b><span class="dms-sm">' + esc(L(g[2])) + '</span></div><span>' + stat('warn', num(g[0])) + ' <a class="dms-link" href="' + esc(url(g[3], g[4])) + '" target="_blank" rel="noopener noreferrer">' + esc(L('Open')) + ' ↗</a></span></li>'; }).join('') + '</ul>' : empty(L('No gaps found.')), '', esc(L('fix at source')));
  }
  function dateCell(v, canc) { if (canc) { return stat('n', L('Cancelled')); } if (!v) { return stat('n', L('No date')); } var d2 = diffDays(TODAY, v), st = d2 < 0 ? 'Expired' : d2 <= win() ? 'Expiring Soon' : 'Valid'; return dtc(v) + ' ' + stTag(st); }
  function matrix() {
    return regTable({ id: 't_mx', rows: ENT.filter(function (e) { return !e.canc; }), pageSize: 15, file: 'entity_matrix', text: function (e) { return e.n + ' ' + e.type + ' ' + e.loc; }, empty: L('No records.'), cols: [
      { k: 'n', h: L('Entity'), s: function (e) { return e.n; }, r: function (e) { return docLink(COM, e.id, e.n) + '<div class="dms-sm">' + esc(e.type + ' • ' + e.loc) + '</div>'; }, c: function (e) { return e.n; } },
      { k: 'cr', h: L('CR Expiry'), s: function (e) { return e.crExp || '9999'; }, r: function (e) { return dateCell(e.crExp, false); }, c: function (e) { return e.crExp; } },
      { k: 'na', h: L('National Address Expiry'), s: function (e) { return e.naExp || '9999'; }, r: function (e) { return dateCell(e.naExp, e.canc); }, c: function (e) { return e.naExp; } },
      { k: 'misa', h: L('MISA Expiry'), s: function (e) { return e.misaExp || '9999'; }, r: function (e) { return dateCell(e.misaExp, e.canc); }, c: function (e) { return e.misaExp; } },
      { k: 'ind', h: L('Industrial License (date)'), s: function (e) { return e.ind || ''; }, r: function (e) { return dtc(e.ind); }, c: function (e) { return e.ind; } },
      { k: 'ch', h: L('Chamber No.'), s: function (e) { return e.ch; }, r: function (e) { return bdi(e.ch || '—'); }, c: function (e) { return e.ch; } }] });
  }
  function vEjar() {
    var all = vis('ejar'), rows = all.filter(function (x) { return (EJF !== 'active' || x.active) && (!EJT || x.detail === EJT); }), a = all.filter(function (x) { return x.active; }), pre = D.pre || [];
    var h = kpis([kpi({ label: L('Active contracts'), val: num(a.length), sub: esc(num(all.length - a.length) + ' ' + tr('closed / inactive', 'مغلقة / غير نشطة')), act: 'st:ejar:all' }), kpi({ label: tr('Past end date', 'تجاوزت تاريخ الانتهاء'), dot: cnt(a, 'Expired') ? COLORS.danger : null, val: num(cnt(a, 'Expired')), sub: esc(tr('active but overdue', 'نشطة لكنها متأخرة')), act: 'st:ejar:Expired' }), kpi({ label: tr('Ending soon', 'تنتهي قريباً'), dot: cnt(a, 'Expiring Soon') ? COLORS.warn : null, val: num(cnt(a, 'Expiring Soon')), sub: esc(L('within') + ' ' + win() + ' ' + L('days')), act: 'st:ejar:Expiring Soon' }), kpi({ label: tr('Auto-renew off', 'التجديد التلقائي متوقف'), val: num(a.filter(function (x) { return x.auto === 'No'; }).length), sub: esc(tr('need manual renewal', 'تحتاج تجديداً يدوياً')) }), kpi({ label: tr('Prepaid records', 'سجلات المدفوع مقدماً'), val: D.preErr ? '—' : num(pre.length), sub: esc(D.preErr ? tr('not readable', 'غير مقروء') : pre.length ? tr('in ERP', 'في النظام') : tr('none in ERP yet', 'لا يوجد في النظام بعد')) })]);
    h += segBtns('ejf', [['active', 'Active contracts only'], ['all', 'All contracts (incl. closed)']], EJF) + segBtns('ejt', [['', 'All facility types']].concat(uq(all.map(function (x) { return x.detail; })).map(function (d) { return [d, d === 'Accomadation' ? 'Accommodation' : d]; })), EJT);
    var gsum = function (keyFn) { var m = {}; rows.forEach(function (x) { var k = keyFn(x) || 'Unassigned'; m[k] = (m[k] || 0) + (x.rent || 0); }); return Object.keys(m).map(function (k) { return { label: k, value: m[k] }; }).sort(function (p, q) { return q.value - p.value; }); };
    h += two(panel(L('Contract status'), statusBars(rows)), panel(L('Contracts ending by month'), monthChart(rows)));
    h += two(panel(L('Total rent by facility type'), hbars(gsum(function (x) { return x.detail === 'Accomadation' ? 'Accommodation' : x.detail; }), sar)), panel(L('Total rent by company'), hbars(gsum(function (x) { return x.company === '—' ? '' : x.company; }).slice(0, 8), sar)));
    h += panel(L('EJAR rent contracts'), itemTable('t_ejar', rows, ['entity', 'company', 'name', 'ref', 'from', 'expiry', 'days', 'rent', 'auto', 'status']));
    return h + panel(L('Prepaid expenses'), D.preErr ? srcErr(D.preErr, PRE) : pre.length ? regTable({ id: 't_pre', rows: pre, pageSize: 15, file: 'prepaid', text: function (r) { return r.name + ' ' + r.company; }, empty: L('No records.'), cols: [{ k: 'n', h: L('Record'), s: function (r) { return r.name; }, r: function (r) { return docLink(PRE, r.name); }, c: function (r) { return r.name; } }, { k: 'c', h: L('Company'), s: function (r) { return r.company || ''; }, r: function (r) { return bdi(r.company || '—'); }, c: function (r) { return r.company; } }, { k: 'a', h: tr('Total Amount', 'المبلغ الإجمالي'), num: 1, s: function (r) { return r.total_amount || 0; }, r: function (r) { return '<span class="dms-num">' + esc(sar(r.total_amount)) + '</span>'; }, c: function (r) { return r.total_amount; } }, { k: 's', h: L('From'), s: function (r) { return r.start_date || ''; }, r: function (r) { return dtc(r.start_date); }, c: function (r) { return r.start_date; } }, { k: 'e', h: L('To'), s: function (r) { return r.end_date || ''; }, r: function (r) { return dtc(r.end_date); }, c: function (r) { return r.end_date; } }, { k: 'st', h: L('Status'), s: function (r) { return r.status || ''; }, r: function (r) { return esc(r.status || '—'); }, c: function (r) { return r.status; } }] }) : empty(tr('No Prepaid Expense records exist in ERP yet. Once prepaid rent / EJAR fees are booked in the Prepaid Expense doctype, they will list here.', 'لا توجد سجلات مصروفات مدفوعة مقدماً في النظام بعد. ستظهر هنا بمجرد تسجيلها.')), '', esc(L('Prepaid Expense doctype')));
  }
  function uq(a) { var m = {}; a.forEach(function (x) { if (x) { m[x] = 1; } }); return Object.keys(m).sort(); }
  function vLic() {
    var all = vis('lic'), rows = all.filter(function (x) { return (!LGRP || x.group === LGRP) && (!CHIP || x.status === CHIP); }), base = all.filter(function (x) { return !LGRP || x.group === LGRP; });
    var h = kpis(statusKpis(base, 'lic', 'Total records', esc(L('active facilities'))).concat([nextKpi(base)]));
    h += segBtns('lgrp', [['', 'Government + service contracts'], ['Government', 'Government'], ['Service Contract', 'Service Contract']], LGRP) + segBtns('chip', [['', 'All statuses'], ['Expired', 'Expired'], ['Expiring Soon', 'Expiring Soon'], ['Valid', 'Valid']], CHIP);
    var types = {}; rows.forEach(function (x) { if (counted(x)) { (types[x.name] = types[x.name] || []).push(x); } });
    h += two(panel(L('License status'), statusBars(rows)), panel(L('Status by license type'), stackRows(Object.keys(types).map(function (k) { return { label: L(k), arr: types[k] }; }).sort(function (p, q) { return q.arr.length - p.arr.length; }))));
    h += panel(tr('Licence expiries by month', 'انتهاء التراخيص حسب الشهر'), monthChart(rows));
    return h + panel(L('License register'), itemTable('t_lic', rows, ['entity', 'company', 'name', 'ref', 'authority', 'expiry', 'days', 'status']));
  }
  function vCR() {
    var rows = vis('cr'), loc = {}; rows.forEach(function (x) { var k = x.loc || 'Unassigned'; loc[k] = (loc[k] || 0) + 1; });
    return kpis(statusKpis(rows, 'cr', 'Total records', esc(L('active CRs'))).concat([nextKpi(rows)])) + two(panel(L('CR status'), statusBars(rows)), panel(L('Entities by location'), hbars(Object.keys(loc).map(function (k) { return { label: k, value: loc[k] }; }).sort(function (p, q) { return q.value - p.value; }), num))) +
      panel(L('CR expiries by month'), monthChart(rows)) + panel(L('Commercial registrations'), itemTable('t_cr', rows, ['entity', 'name', 'loc', 'ref', 'uni', 'chamber', 'expiry', 'days', 'status']), '', esc(L('field: CR Expiry')));
  }
  function vMisa() {
    var rows = vis('misa');
    var cov = [{ label: L('Has expiry date'), value: rows.filter(function (x) { return !x.cancelled && x.expiry; }).length, color: COLORS.ok }, { label: L('No expiry on record'), value: rows.filter(function (x) { return !x.cancelled && !x.expiry; }).length, color: COLORS.warn }, { label: L('CR cancelled'), value: rows.filter(function (x) { return x.cancelled; }).length, color: COLORS.muted }];
    return kpis(statusKpis(rows, 'misa', 'Total records', esc(L('entities with a date'))).concat([nextKpi(rows)])) + two(panel(L('MISA status'), statusBars(rows)), panel(L('MISA expiry coverage'), mixBar(cov) + hbars(cov, num))) +
      panel(L('MISA expiries by month'), monthChart(rows)) + panel(L('MISA licenses'), itemTable('t_misa', rows, ['entity', 'name', 'ref', 'expiry', 'days', 'status']), '', esc(L('field: MISA Expiry')));
  }

  /* ============================================================ drills and events */
  function srcList(src) { return src === 'all' ? allCounted() : src === 'ejar' ? vis('ejar').filter(function (x) { return x.active; }) : vis(src); }
  function drill(id) {
    if (id.indexOf('st:') === 0) {
      var p = id.split(':'), src = p[1], st = p.slice(2).join(':'), list = srcList(src).filter(function (x) { return st === 'all' ? counted(x) : x.status === st; });
      return { title: (st === 'all' ? L('Tracked items') : L(st)) + ' (' + num(list.length) + ')', sub: L('Tip: click any KPI tile to open the matching records in ERP.').replace(/^.*$/, tr('Records in this group; each opens in ERP.', 'سجلات هذه المجموعة؛ يفتح كل منها في النظام.')), spec: { rows: list.slice().sort(function (x, y) { return (x.days == null ? 1e9 : x.days) - (y.days == null ? 1e9 : y.days); }), file: 'gov_' + src, text: function (x) { return [x.entity, x.name, x.ref].join(' '); }, cols: itemCols(['cat', 'entity', 'name', 'expiry', 'days', 'status']).map(function (c) { return { h: c.h, r: c.r, c: c.c }; }) } };
    }
    if (id.indexOf('cli:') === 0) {
      var k = id.slice(4), cc = actClient(), y = cc && typeof cc === 'object' && cc[k], s = actSpecs().filter(function (z) { return z.id === k; })[0]; if (!y || !s) { return null; }
      return { title: s.title, sub: s.why, spec: { rows: y.rows.map(y.item), file: k, text: function (it) { return [it.title, it.desc].join(' '); }, cols: [{ h: L('Entity / Facility'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.title; } }, { h: L('Type / Detail'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc) + '</span>'; }, c: function (it) { return it.desc; } }, { h: L('Days Left'), r: function (it) { return esc(it.due || ''); }, c: function (it) { return it.due; } }] } };
    }
    return null;
  }
  function onAct(a, v) {
    if (a === 'kpi' && v.indexOf('goto:') === 0) { goTab(v.slice(5), false, true); return true; }
    if (a === 'kpi' && v.indexOf('st:') === 0) { openDrill(v); return true; }
    if (a === 'ejf') { EJF = v; renderSoft(); return true; } if (a === 'ejt') { EJT = v; renderSoft(); return true; }
    if (a === 'lgrp') { LGRP = v; renderSoft(); return true; } if (a === 'chip') { CHIP = v; renderSoft(); return true; }
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
