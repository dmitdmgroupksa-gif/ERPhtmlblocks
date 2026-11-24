/* DM Document Control Command Center - read-only, client-side only. Uses existing Frappe APIs (permissions enforced server-side). */
(function () {
'use strict';
var ROOT = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
var host = ROOT.querySelector('#dmdc') || document.querySelector('#dmdc');
if (!host) { return; }
if (host.getAttribute('data-ready') === '1') { return; }
host.setAttribute('data-ready', '1');

/* ---------- utils ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fmt(n) { return (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('en-US'); }
function p2(n) { return (n < 10 ? '0' : '') + n; }
function todayStr() { try { return frappe.datetime.get_today(); } catch (e) { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); } }
function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
function dayDiff(a, b) { return Math.round((Date.parse(b.slice(0, 10) + 'T00:00:00Z') - Date.parse(a.slice(0, 10) + 'T00:00:00Z')) / 86400000); }
function slug(dt) { try { return frappe.router.slug(dt); } catch (e) { return String(dt).toLowerCase().replace(/ /g, '-'); } }
function docUrl(dt, name) { return '/app/' + slug(dt) + '/' + encodeURIComponent(name); }
function $(sel, el) { return (el || host).querySelector(sel); }
function $$(sel, el) { return Array.prototype.slice.call((el || host).querySelectorAll(sel)); }
function sum(a, f) { var s = 0; a.forEach(function (x) { s += f(x) || 0; }); return s; }
function uniq(a) { var m = {}, o = []; a.forEach(function (x) { if (x != null && x !== '' && !m[x]) { m[x] = 1; o.push(x); } }); return o; }
var PAL = ['#1d4ed8', '#3b82f6', '#0ea5e9', '#64748b', '#93c5fd', '#0b2a5b', '#94a3b8', '#38bdf8', '#475569', '#bfdbfe', '#1e3a8a', '#cbd5e1'];
var C_DRAFT = '#94a3b8', C_SUB = '#1d4ed8', C_CANC = '#dc2626', C_PEND = '#d97706';

/* ---------- i18n ---------- */
var L = {
 title: ['DOCUMENT CONTROL COMMAND CENTER', 'مركز التحكم في المستندات'],
 sub: ['Centralized Document Monitoring, Compliance & Employee Activity', 'مراقبة مركزية للمستندات والامتثال ونشاط الموظفين'],
 refresh: ['Refresh', 'تحديث'], updated: ['Last updated', 'آخر تحديث'], reset: ['Reset Filters', 'إعادة ضبط الفلاتر'],
 company: ['Company', 'الشركة'], division: ['Division', 'القسم / الشعبة'], location: ['Location', 'الموقع'], department: ['Department', 'الإدارة'],
 employee: ['Employee', 'الموظف'], from: ['From Date', 'من تاريخ'], to: ['To Date', 'إلى تاريخ'], dtype: ['Document Type', 'نوع المستند'], dstatus: ['Document Status', 'حالة المستند'],
 all: ['All', 'الكل'], draft: ['Draft', 'مسودة'], submitted: ['Submitted', 'مُعتمد / مُرسل'], cancelled: ['Cancelled', 'ملغى'], pendapp: ['Pending Approval', 'بانتظار الموافقة'],
 t_overview: ['Executive Overview', 'نظرة تنفيذية'], t_sales: ['Sales Documents', 'مستندات المبيعات'], t_proc: ['Procurement Documents', 'مستندات المشتريات'], t_internal: ['Internal Documents', 'المستندات الداخلية'],
 t_activity: ['Employee Activity', 'نشاط الموظفين'], t_expiry: ['Expiry & Compliance', 'الانتهاء والامتثال'], t_pending: ['Pending Actions', 'الإجراءات المعلقة'], t_reports: ['Detailed Reports', 'التقارير التفصيلية'],
 t_manual: ['Physical copy handover', 'الفحوصات اليدوية'],
 mc_note: ['Reads the Manual Checks fields already on each DocType (physical copy tracking). Counts are submitted documents in the selected date range. To update a check, open the record from the table.', 'يقرأ حقول الفحوصات اليدوية الموجودة في كل DocType (تتبع النسخة الورقية). الأعداد للمستندات المعتمدة ضمن نطاق التاريخ المحدد. لتحديث أي فحص افتح السجل من الجدول.'],
 mc_miss: ['No Manual Checks section found on', 'لم يُعثر على قسم الفحوصات اليدوية في'], mc_total: ['Submitted documents', 'المستندات المعتمدة'], mc_norec: ['Not recorded', 'غير مسجل'], mc_notyes: ['Not Yes', 'ليس نعم'], mc_resp: ['Responsible user', 'المستخدم المسؤول'], mc_upd: ['Open to update', 'افتح للتحديث'],
 k_total: ['Total Documents', 'إجمالي المستندات'], k_sales: ['Sales Documents', 'مستندات المبيعات'], k_proc: ['Procurement Documents', 'مستندات المشتريات'], k_internal: ['Internal Documents', 'المستندات الداخلية'],
 k_draft: ['Draft Documents', 'المستندات المسودة'], k_sub: ['Submitted Documents', 'المستندات المعتمدة'], k_pend: ['Pending Approvals', 'الموافقات المعلقة'], k_soon: ['Expiring Soon (30d)', 'تنتهي قريبًا (30 يومًا)'],
 k_expired: ['Expired Documents', 'مستندات منتهية'], k_today: ['Created Today', 'أُنشئت اليوم'], k_canc: ['Cancelled Documents', 'المستندات الملغاة'],
 c_div: ['Documents by Division', 'المستندات حسب القسم'], c_type: ['Documents by Type', 'المستندات حسب النوع'], c_ds: ['Draft vs Submitted by Division', 'مسودة مقابل معتمد حسب القسم'],
 c_trend: ['Monthly Document Creation (last 12 months)', 'إنشاء المستندات شهريًا (آخر 12 شهرًا)'], c_emp: ['Employee Activity – Top Contributors', 'نشاط الموظفين – أكثر المساهمين'], c_status: ['Document Status Distribution', 'توزيع حالات المستندات'],
 loading: ['Loading…', 'جارٍ التحميل…'], empty: ['No records found for the selected filters.', 'لا توجد سجلات للفلاتر المحددة.'], err: ['Could not load some data', 'تعذر تحميل بعض البيانات'],
 partial: ['Partial / restricted', 'جزئي / مقيد'], unavail: ['Unavailable or not permitted for your user', 'غير متاح أو غير مسموح لمستخدمك'],
 excl: ['Excluded because they have no field for the selected filter', 'مستثناة لعدم وجود حقل مناسب للفلتر المحدد'],
 search: ['Search…', 'بحث…'], csv: ['Export PDF', 'تصدير PDF'], print: ['Print', 'طباعة'], open: ['Open', 'فتح'], openlist: ['Open in ERPNext list', 'فتح في قائمة ERPNext'],
 page: ['Page', 'صفحة'], of: ['of', 'من'], rows: ['rows', 'سجل'], prev: ['Prev', 'السابق'], next: ['Next', 'التالي'], close: ['Close', 'إغلاق'], showing: ['Showing', 'عرض'], total: ['Total', 'الإجمالي'],
 id: ['Document ID', 'رقم المستند'], type: ['Document Type', 'نوع المستند'], customer: ['Customer', 'العميل'], supplier: ['Supplier', 'المورد'], party: ['Party', 'الطرف'], createdby: ['Created By', 'أنشئ بواسطة'],
 docdate: ['Document Date', 'تاريخ المستند'], status: ['Status', 'الحالة'], modified: ['Modified Date', 'تاريخ التعديل'], action: ['Action', 'إجراء'], created: ['Date Created', 'تاريخ الإنشاء'],
 empparty: ['Employee / Vendor / Party', 'الموظف / المورد / الطرف'], start: ['Agreement Start Date', 'تاريخ بداية الاتفاقية'], end: ['Agreement End Date', 'تاريخ نهاية الاتفاقية'], resp: ['Responsible Employee', 'الموظف المسؤول'],
 daysrem: ['Days Remaining', 'الأيام المتبقية'], assigned: ['Assigned Employee', 'الموظف المكلّف'], dayspend: ['Days Pending', 'أيام التعليق'], name: ['Name', 'الاسم'],
 breakdown: ['Document-type breakdown', 'التوزيع حسب نوع المستند'], empact: ['Employee-wise activity (creator)', 'نشاط الموظفين (المنشئ)'], statuschart: ['Status breakdown', 'توزيع الحالات'],
 s_pending: ['Pending Sales Documents', 'مستندات مبيعات معلقة'], s_draft: ['Draft Sales Documents', 'مستندات مبيعات مسودة'], p_pending: ['Pending Procurement Documents', 'مستندات مشتريات معلقة'],
 i_total: ['Total Internal Documents', 'إجمالي المستندات الداخلية'], i_active: ['Active Agreements', 'اتفاقيات سارية'], i_pending: ['Pending Agreements', 'اتفاقيات معلقة'], i_exp: ['Expiring Agreements (30d)', 'اتفاقيات تنتهي قريبًا'], i_expd: ['Expired Agreements', 'اتفاقيات منتهية'], i_miss: ['Missing Attachments', 'مرفقات مفقودة'],
 notavail: ['Expiry Not Available', 'تاريخ الانتهاء غير متوفر'], expired: ['Expired', 'منتهي'], soon: ['Expiring soon', 'ينتهي قريبًا'], valid: ['Valid', 'ساري'], noexp: ['No Expiry Date', 'بدون تاريخ انتهاء'],
 w7: ['Within 7 days', 'خلال 7 أيام'], w15: ['Within 15 days', 'خلال 15 يومًا'], w30: ['Within 30 days', 'خلال 30 يومًا'], w60: ['Within 60 days', 'خلال 60 يومًا'],
 agname: ['Agreement / Document', 'الاتفاقية / المستند'], deptresp: ['Responsible Department', 'الإدارة المسؤولة'],
 p_draft: ['Draft Documents', 'مستندات مسودة'], p_appr: ['Pending Approvals', 'موافقات معلقة'], p_subm: ['Pending Submissions', 'إرسال/اعتماد معلق'], p_agr: ['Pending Agreements', 'اتفاقيات معلقة'], p_sign: ['Pending Signatures', 'توقيعات معلقة'], p_bal: ['Pending Balance Confirmations', 'مصادقات أرصدة معلقة'], p_other: ['Other Pending Actions', 'إجراءات معلقة أخرى'],
 activity: ['Document type', 'نوع المستند'], tdraft: ['Total Draft', 'إجمالي المسودات'], tsub: ['Total Submitted', 'إجمالي المعتمد'], tcanc: ['Total Cancelled', 'إجمالي الملغى'], grand: ['Grand Total', 'الإجمالي العام'],
 jobloc: ['Employee Job Location', 'موقع عمل الموظف'], topemp: ['Top employees by documents created', 'أعلى الموظفين إنشاءً للمستندات'], contrib: ['Contribution %', 'نسبة المساهمة'], dvs: ['Draft vs Submitted per employee', 'مسودة مقابل معتمد لكل موظف'],
 rep: ['Report', 'التقرير'], generate: ['Generate', 'إنشاء'], r_dept: ['Department-wise Document Report', 'تقرير المستندات حسب الإدارة'], r_emp: ['Employee-wise Document Activity', 'نشاط المستندات حسب الموظف'], r_type: ['Document Type Summary', 'ملخص أنواع المستندات'],
 r_ds: ['Draft vs Submitted Report', 'تقرير مسودة مقابل معتمد'], r_pend: ['Pending Documents Report', 'تقرير المستندات المعلقة'], r_exp: ['Agreement Expiry Report', 'تقرير انتهاء الاتفاقيات'], r_month: ['Monthly Document Activity', 'النشاط الشهري للمستندات'], r_comp: ['Company-wise Document Summary', 'ملخص المستندات حسب الشركة'],
 other: ['Other', 'أخرى'], unassigned: ['Unassigned', 'غير مسند'], incomplete: ['Results are incomplete (partial data)', 'النتائج غير مكتملة (بيانات جزئية)'],
 foot: ['Read-only. Data comes live from ERPNext and respects your permissions. Draft/Submitted use docstatus; Pending Approval = workflow state containing "Pending" or "Review" (excluding payment states) on non-cancelled documents.', 'للقراءة فقط. البيانات مباشرة من ERPNext وتحترم صلاحياتك. مسودة/معتمد حسب docstatus؛ بانتظار الموافقة = حالة سير عمل تحتوي "Pending" أو "Review" (باستثناء حالات الدفع) للمستندات غير الملغاة.'],
 expnote: ['Expiry views ignore the date range and show all live agreements/records that have actual expiry fields.', 'شاشات الانتهاء تتجاهل نطاق التاريخ وتعرض كل الاتفاقيات/السجلات الحالية التي لديها حقول انتهاء فعلية.'],
 actnote: ['Counted per document owner (creator) by creation date, for Active employees only – same logic as the ERP Employees Activity Report.', 'يُحتسب لكل مالك مستند (المنشئ) حسب تاريخ الإنشاء وللموظفين النشطين فقط – بنفس منطق تقرير نشاط الموظفين في النظام.'],
 mergednote: ['Showing latest records per type (select a document type for full paging).', 'عرض أحدث السجلات لكل نوع (اختر نوع مستند للتصفح الكامل).'],
 exportall: ['Export all (max 5,000)', 'تصدير الكل (حتى 5,000)'], unmapped: ['Records created by users without an Active employee record (not in matrix)', 'سجلات أنشأها مستخدمون بدون موظف نشط (غير مدرجة في المصفوفة)'],
 supstat: ['Statuses', 'الحالات'], mo: ['Month', 'الشهر'], count: ['Count', 'العدد'], ratio: ['Submitted %', 'نسبة المعتمد %'], hold: ['On Hold', 'معلق (Hold)'], none: ['None', 'لا يوجد'], emps: ['Active employees with activity', 'موظفون نشطون لديهم نشاط'], avg: ['Avg per employee', 'المتوسط لكل موظف'], topc: ['Top contributor', 'أعلى مساهم']
};
var DSL = { 'Yes': 'نعم', 'No': 'لا', 'Draft': 'مسودة', 'Submitted': 'مُعتمد', 'Cancelled': 'ملغى', 'Approved': 'موافق عليه', 'Pending': 'معلّق', 'Pending Approval': 'بانتظار الموافقة', 'Rejected': 'مرفوض', 'Closed': 'مغلق', 'Active': 'ساري', 'Unsigned': 'غير موقّع', 'Inactive': 'غير ساري', 'Expired': 'منتهي', 'Archieved': 'مؤرشف', 'On-Hold': 'معلّق (Hold)', 'Record': 'سجل', 'Lost': 'مفقود', 'Paid': 'مدفوع', 'Open': 'مفتوح', 'Completed': 'مكتمل', 'Stopped': 'متوقف', 'Cancelled ': 'ملغى', 'Final Rejection': 'رفض نهائي', 'Finally Rejected': 'رفض نهائي', 'Accepted By Customer': 'مقبول من العميل', 'Rejected By Customer': 'مرفوض من العميل', 'Unpaid': 'غير مدفوع', 'Overdue': 'متأخر', 'Partly Paid': 'مدفوع جزئيًا', 'To Bill': 'للفوترة', 'To Deliver': 'للتسليم', 'To Deliver and Bill': 'للتسليم والفوترة', 'Return': 'مرتجع', 'Credit Note Issued': 'تم إصدار إشعار دائن', 'Approved ': 'موافق عليه', 'Review With CEO': 'مراجعة مع الرئيس التنفيذي', 'Review With Sales Manager': 'مراجعة مع مدير المبيعات', 'Pending Review': 'بانتظار المراجعة', 'cancelled': 'ملغى', 'submitted': 'مُعتمد', 'Draft ': 'مسودة', 'Open ': 'مفتوح', 'Expired ': 'منتهي', 'Accepted': 'مقبول', 'Ordered': 'تم الطلب', 'Received': 'تم الاستلام', 'Partially Received': 'استلام جزئي', 'Transferred': 'تم التحويل', 'Issued': 'مصروف', 'Delivered': 'تم التسليم', 'To Receive and Bill': 'للاستلام والفوترة', 'To Receive': 'للاستلام', 'Pending ': 'معلّق' };
function t(k) { var v = L[k]; if (!v) { return k; } return v[S.lang === 'ar' ? 1 : 0]; }
function ts(s) { if (S.lang !== 'ar' || s == null) { return s; } return DSL[s] || s; }
function en(o) { return S.lang === 'ar' ? (o.ar || o.en) : o.en; }

var S = { lang: 'en', tab: 'overview', ts: null, ready: false,
  f: { company: '', division: '', location: '', department: '', employee: '', from: addDays(todayStr(), -30), to: todayStr(), dtype: '', dstatus: '' }, ejl: '', epoch: 0 };
var D = { stats: {}, today: {}, own: {}, trend: {}, exp: null, expP: null, ps: {}, pcount: {}, errs: {}, bad: {} };
var EMPS = [], EMPBYUSER = {}, OPT = { company: [], division: [], location: [], department: [], employee: [], ejl: [] };

/* ---------- API layer: queue + cache, only existing Frappe methods ---------- */
var Q = { run: 0, q: [], max: 4 };
function pump() { while (Q.run < Q.max && Q.q.length) { (function (j) { Q.run++; j.fn().then(j.ok, j.no).then(function () { Q.run--; pump(); }); })(Q.q.shift()); } }
function enqueue(fn) { return new Promise(function (ok, no) { Q.q.push({ fn: fn, ok: ok, no: no }); pump(); }); }
var CACHE = {};
function api(method, args) {
  var key = method + '|' + JSON.stringify(args);
  if (CACHE[key]) { return CACHE[key]; }
  var ep = S.epoch;
  var p = enqueue(function () { return new Promise(function (res, rej) {
    frappe.call({ method: method, args: JSON.parse(JSON.stringify(args)), silent: true, callback: function (r) { res(r ? r.message : null); }, error: function (e) { rej(e || new Error('api')); } });
  }); });
  CACHE[key] = p; p.catch(function () { if (CACHE[key] === p) { delete CACHE[key]; } });
  return p;
}
function gcount(dt, filters) { return api('frappe.client.get_count', { doctype: dt, filters: filters || [] }); }
function glist(dt, o) { var a = { doctype: dt, fields: o.fields, filters: o.filters || [], limit_start: o.start || 0, limit_page_length: o.limit || 20 }; if (o.order_by) { a.order_by = o.order_by; } if (o.group_by) { a.group_by = o.group_by; } if (o.or_filters) { a.or_filters = o.or_filters; } return api('frappe.client.get_list', a); }

/* ---------- meta / field verification ---------- */
var META = {};
function loadMeta(dt) {
  if (META[dt]) { return META[dt].p; }
  var m = META[dt] = { ok: false, f: {}, sub: false };
  m.p = new Promise(function (res) {
    var done = false; var to = setTimeout(function () { if (!done) { done = true; res(); } }, 15000);
    try { frappe.model.with_doctype(dt, function () {
      try { var mm = frappe.get_meta(dt); if (mm && mm.fields && mm.fields.length) { mm.fields.forEach(function (x) { m.f[x.fieldname] = x; }); m.ok = true; m.sub = !!mm.is_submittable; } } catch (e) { }
      if (!done) { done = true; clearTimeout(to); res(); }
    }); } catch (e) { if (!done) { done = true; clearTimeout(to); res(); } }
  });
  return m.p;
}
var STD = { name: 1, owner: 1, creation: 1, modified: 1, docstatus: 1, modified_by: 1 };
function has(dt, f) { return !!STD[f] || !!(META[dt] && META[dt].f[f]); }
function isSub(dt) { return !!(META[dt] && META[dt].sub); }
function ftype(dt, f) { return META[dt] && META[dt].f[f] ? META[dt].f[f].fieldtype : ''; }

/* ---------- registry (only DocTypes verified in the ERP audit) ---------- */
var REG = [
 { id: 'so', dt: 'Sales Order', g: 'sales', date: 'transaction_date', party: ['customer_name', 'customer'], en: 'Sales Order', ar: 'أمر بيع' },
 { id: 'si', dt: 'Sales Invoice', g: 'sales', date: 'posting_date', party: ['customer_name', 'customer'], en: 'Sales Invoice', ar: 'فاتورة مبيعات' },
 { id: 'qt', dt: 'Quotation', g: 'sales', date: 'transaction_date', party: ['customer_name', 'party_name'], en: 'Quotation', ar: 'عرض سعر' },
 { id: 'dn', dt: 'Delivery Note', g: 'sales', date: 'posting_date', party: ['customer_name', 'customer'], en: 'Delivery Note', ar: 'إشعار تسليم' },
 { id: 'cbc', dt: 'Customer Balance Confirmation', g: 'sales', date: 'date', party: ['customer'], en: 'Customer Balance Confirmation (CBC)', ar: 'مصادقة رصيد عميل (CBC)' },
 { id: 'cagr', dt: 'Contract', fx: { party_type: 'Customer' }, g: 'sales', date: 'creation', party: ['party_full_name', 'party_name'], en: 'Customer Agreement', ar: 'اتفاقية عميل' },
 { id: 'cust', dt: 'Customer', g: 'sales', date: 'creation', party: ['customer_name'], en: 'Customer Creation', ar: 'إنشاء عميل' },
 { id: 'rcv', dt: 'Payment Entry', fx: { payment_type: 'Receive' }, g: 'sales', date: 'posting_date', party: ['party_name', 'party'], en: 'Collection / Receipt Entry', ar: 'سند قبض / تحصيل' },
 { id: 'dvc', dt: 'Daily Visit Collection', g: 'sales', date: 'creation', party: [], en: 'Daily Visit Collection', ar: 'تحصيل الزيارات اليومية' },
 { id: 'po', dt: 'Purchase Order', g: 'proc', date: 'transaction_date', party: ['supplier_name', 'supplier'], en: 'Purchase Order', ar: 'أمر شراء' },
 { id: 'pi', dt: 'Purchase Invoice', g: 'proc', date: 'posting_date', party: ['supplier_name', 'supplier'], en: 'Purchase Invoice', ar: 'فاتورة مشتريات' },
 { id: 'pr', dt: 'Purchase Receipt', g: 'proc', date: 'posting_date', party: ['supplier_name', 'supplier'], en: 'Purchase Receipt (GRN)', ar: 'إيصال استلام (GRN)' },
 { id: 'mr', dt: 'Material Request', g: 'proc', date: 'transaction_date', party: [], en: 'Material Request', ar: 'طلب مواد' },
 { id: 'rfq', dt: 'Request for Quotation', g: 'proc', date: 'transaction_date', party: [], en: 'Request for Quotation (RFQ)', ar: 'طلب عرض سعر (RFQ)' },
 { id: 'sq', dt: 'Supplier Quotation', g: 'proc', date: 'transaction_date', party: ['supplier_name', 'supplier'], en: 'Supplier Quotation', ar: 'عرض سعر مورد' },
 { id: 'sbc', dt: 'Supplier Balance Confirmation', g: 'proc', date: 'date', party: ['supplier'], en: 'Supplier Balance Confirmation (SBC)', ar: 'مصادقة رصيد مورد (SBC)' },
 { id: 'sagr', dt: 'Contract', fx: { party_type: 'Supplier' }, g: 'proc', date: 'creation', party: ['party_full_name', 'party_name'], en: 'Supplier Agreement', ar: 'اتفاقية مورد' },
 { id: 'eagr', dt: 'Contract', fx: { party_type: 'Employee' }, g: 'int', date: 'creation', party: ['party_full_name', 'party_name'], en: 'Employee / HR Contract', ar: 'عقد موظف / موارد بشرية' },
 { id: 'sca', dt: 'Sub Contract Agreement', g: 'int', date: 'issue_date', party: ['sub_contract', 'customer'], en: 'Sub Contract Agreement', ar: 'اتفاقية مقاولة من الباطن' },
 { id: 'memo', dt: 'DM Official Memo', g: 'int', date: 'memo_date', party: ['memo_subject'], en: 'Internal Memo', ar: 'مذكرة داخلية' },
 { id: 'let', dt: 'DM Letters', g: 'int', date: 'creation', party: [], en: 'Company Letter', ar: 'خطاب الشركة' },
 { id: 'lf', dt: 'DM Letter Forms', g: 'int', date: 'creation', party: [], en: 'Letter Form', ar: 'نموذج خطاب' },
 { id: 'docrec', dt: 'Document Record', g: 'int', date: 'issued_date', party: ['document_title__document_no'], en: 'Document Record (Legal/HR/Admin)', ar: 'سجل مستند (قانوني/موارد/إداري)' },
 { id: 'qiwa', dt: 'Qiwa contract renewal request', g: 'int', date: 'creation', party: [], en: 'Qiwa Contract Renewal', ar: 'طلب تجديد عقد قوى' },
 { id: 'legal', dt: 'Legal Case List', g: 'int', date: 'creation', party: [], en: 'Legal Case', ar: 'قضية قانونية' },
 { id: 'court', dt: 'Court Cases', g: 'int', date: 'creation', party: [], en: 'Court Case', ar: 'قضية محكمة' }
];
var REGBY = {}; REG.forEach(function (e) { REGBY[e.id] = e; });
/* Employee Activity rows - mirrors the ERP Employees Activity Reports copy script (owner + creation date) */
var ACT = [
 { id: 'a_cbc', dt: 'Customer Balance Confirmation', en: 'Customer Balance Confirmation', ar: 'مصادقة رصيد عميل' },
 { id: 'a_cust', dt: 'Customer', en: 'Customer Creation', ar: 'إنشاء عميل' },
 { id: 'a_dvc', dt: 'Daily Visit Collection', en: 'Daily Visit Collection', ar: 'تحصيل الزيارات اليومية' },
 { id: 'a_dn', dt: 'Delivery Note', en: 'Delivery Note', ar: 'إشعار تسليم' },
 { id: 'a_dt', dt: 'Delivery Trip', en: 'Delivery Trip', ar: 'رحلة توصيل' },
 { id: 'a_ec', dt: 'Expense Claim', en: 'Expense Claim', ar: 'مطالبة مصروفات' },
 { id: 'a_fl', dt: 'ForkLift', en: 'ForkLift', ar: 'رافعة شوكية' },
 { id: 'a_je', dt: 'Journal Entry', en: 'Journal Entry', ar: 'قيد يومية' },
 { id: 'a_lead', dt: 'Lead', en: 'Lead', ar: 'عميل محتمل' },
 { id: 'a_la', dt: 'Leave Application', en: 'Leave Application', ar: 'طلب إجازة' },
 { id: 'a_mr', dt: 'Material Request', en: 'Material Request', ar: 'طلب مواد' },
 { id: 'a_mt', dt: 'Stock Entry', fx: { purpose: 'Material Transfer' }, en: 'Material Transfer', ar: 'تحويل مواد' },
 { id: 'a_pe', dt: 'Payment Entry', fx: { payment_type: 'Pay' }, en: 'Payment Entry', ar: 'سند دفع' },
 { id: 'a_prod', dt: 'Stock Entry', fx: { purpose: 'Manufacture' }, en: 'Production Entry', ar: 'قيد إنتاج' },
 { id: 'a_pi', dt: 'Purchase Invoice', en: 'Purchase Invoice', ar: 'فاتورة مشتريات' },
 { id: 'a_po', dt: 'Purchase Order', en: 'Purchase Order', ar: 'أمر شراء' },
 { id: 'a_pr', dt: 'Purchase Receipt', en: 'Purchase Receipt', ar: 'إيصال استلام' },
 { id: 'a_qt', dt: 'Quotation', en: 'Quotation', ar: 'عرض سعر' },
 { id: 'a_re', dt: 'Payment Entry', fx: { payment_type: 'Receive' }, en: 'Receipt Entry', ar: 'سند قبض' },
 { id: 'a_rfq', dt: 'Request for Quotation', en: 'Request for Quotation', ar: 'طلب عرض سعر' },
 { id: 'a_si', dt: 'Sales Invoice', en: 'Sales Invoice', ar: 'فاتورة مبيعات' },
 { id: 'a_so', dt: 'Sales Order', en: 'Sales Order', ar: 'أمر بيع' },
 { id: 'a_sbc', dt: 'Supplier Balance Confirmation', en: 'Supplier Balance Confirmation', ar: 'مصادقة رصيد مورد' }
];
ACT.forEach(function (a) { a.act = true; a.date = 'creation'; a.party = []; });
/* other workflow documents (Pending Actions only) */
var PX = [
 { id: 'x_la', dt: 'Leave Application', en: 'Leave Application', ar: 'طلب إجازة', date: 'posting_date', party: ['employee_name'] },
 { id: 'x_ec', dt: 'Expense Claim', en: 'Expense Claim', ar: 'مطالبة مصروفات', date: 'posting_date', party: ['employee_name'] },
 { id: 'x_je', dt: 'Journal Entry', en: 'Journal Entry', ar: 'قيد يومية', date: 'posting_date', party: [] },
 { id: 'x_pe', dt: 'Payment Entry', en: 'Payment Entry (all)', ar: 'سند دفع/قبض (الكل)', date: 'posting_date', party: ['party_name'] },
 { id: 'x_se', dt: 'Stock Entry', en: 'Stock Entry', ar: 'قيد مخزون', date: 'posting_date', party: [] }
];
PX.forEach(function (x) { x.g = 'other'; });
var ALLDT = uniq(REG.concat(ACT, PX).map(function (e) { return e.dt; }).concat(['Employee', 'Document Record', 'Sub Contract Agreement', 'Contract', 'Qiwa contract renewal request', 'Supplier Quotation']));

/* ---------- employees ---------- */
function empName(e) { return String(e.employee_name || e.name || '').replace(/\s+/g, ' ').trim(); }
function ownerName(u) { var e = EMPBYUSER[u]; if (e) { return empName(e); } try { return frappe.user.full_name(u) || u; } catch (x) { return u; } }
function ownerDept(u) { var e = EMPBYUSER[u]; return e ? (e.department || '') : ''; }
function deptShort(d) { return d ? String(d).replace(/\s*-\s*DMG$/i, '') : ''; }

/* ---------- filters ---------- */
function dField(e) { return (e.date && has(e.dt, e.date)) ? e.date : 'creation'; }
function locF(dt) { var c = ['location', 'custom_location', 'location_']; for (var i = 0; i < c.length; i++) { if (META[dt] && META[dt].f[c[i]]) { return c[i]; } } return ''; }
var NONE = '__none__';
function F(e, o) {
  o = o || {}; var dt = e.dt, f = [], q = S.f;
  if (e.fx) { Object.keys(e.fx).forEach(function (k) { f.push([dt, k, '=', e.fx[k]]); }); }
  if (!o.noDate) {
    var df = o.dateField || dField(e);
    if (q.from && q.to) { f.push([dt, df, 'between', [q.from, q.to]]); }
    else if (q.from) { f.push([dt, df, '>=', q.from]); }
    else if (q.to) { f.push([dt, df, '<=', df === 'creation' ? q.to + ' 23:59:59' : q.to]); }
  }
  if (q.company && has(dt, 'company')) { f.push(ftype(dt, 'company') === 'Link' ? [dt, 'company', '=', q.company] : [dt, 'company', 'like', '%' + q.company + '%']); }
  if (q.division && has(dt, 'custom_division')) { f.push([dt, 'custom_division', '=', q.division]); }
  if (q.location && locF(dt)) { f.push([dt, locF(dt), '=', q.location]); }
  if (q.employee) { var em = empByName(q.employee); f.push([dt, 'owner', '=', (em && em.user_id) ? em.user_id : NONE]); }
  if (q.department) { var us = deptUsers(q.department); f.push(us.length ? [dt, 'owner', 'in', us] : [dt, 'owner', '=', NONE]); }
  if (q.dstatus && !o.noStatus) {
    if (q.dstatus === 'draft') { f.push([dt, 'docstatus', '=', 0]); }
    else if (q.dstatus === 'sub') { f.push([dt, 'docstatus', '=', 1]); }
    else if (q.dstatus === 'canc') { f.push([dt, 'docstatus', '=', 2]); }
    else if (q.dstatus === 'pend') { f.push([dt, 'docstatus', '<', 2]); var ps = D.ps[dt] || []; f.push([dt, 'workflow_state', 'in', ps.length ? ps : [NONE]]); }
  }
  return f;
}
function empByName(n) { for (var i = 0; i < EMPS.length; i++) { if (EMPS[i].name === n) { return EMPS[i]; } } return null; }
function deptUsers(d) { return uniq(EMPS.filter(function (e) { return e.department === d && e.user_id; }).map(function (e) { return e.user_id; })); }
/* reason an entry cannot honour current filters ('' = ok) */
function compat(e) {
  var q = S.f, dt = e.dt;
  if (!META[dt] || !META[dt].ok || D.bad[dt]) { return 'unavail'; }
  if (q.division && !has(dt, 'custom_division')) { return 'division'; }
  if (q.location && !locF(dt)) { return 'location'; }
  if (q.company && !has(dt, 'company')) { return 'company'; }
  if (q.dstatus === 'pend' && !has(dt, 'workflow_state')) { return 'status'; }
  if ((q.dstatus === 'draft' || q.dstatus === 'sub' || q.dstatus === 'canc') && !isSub(dt)) { return 'status'; }
  return '';
}
function entries(g, pool) {
  var out = [], ex = [], un = [];
  (pool || REG).forEach(function (e) {
    if (g && e.g !== g) { return; }
    if (!pool && S.f.dtype && S.f.dtype !== e.id) { return; }
    var c = compat(e);
    if (c === 'unavail') { un.push(e); } else if (c) { ex.push(e); } else { out.push(e); }
  });
  out.excluded = ex; out.unavailable = un; return out;
}
function isPend(s) { return !!s && /(pending|review)/i.test(s) && !/payment/i.test(s); }
function isHold(s) { return !!s && /hold/i.test(s); }
function prep(e) {
  return loadMeta(e.dt).then(function () {
    if (has(e.dt, 'workflow_state') && !D.ps[e.dt] && (S.f.dstatus === 'pend' || e.needPS)) { return ensurePS(e); }
  });
}
function ensurePS(e) {
  if (D.ps[e.dt]) { return Promise.resolve(D.ps[e.dt]); }
  if (!has(e.dt, 'workflow_state')) { D.ps[e.dt] = []; return Promise.resolve([]); }
  return glist(e.dt, { fields: ['workflow_state', 'count(name) as c'], group_by: 'workflow_state', limit: 200 }).then(function (r) {
    D.ps[e.dt] = (r || []).map(function (x) { return x.workflow_state; }).filter(isPend); D['ph_' + e.dt] = (r || []).map(function (x) { return x.workflow_state; }).filter(isHold); return D.ps[e.dt];
  }).catch(function () { D.ps[e.dt] = []; D.bad[e.dt] = D.bad[e.dt] || 0; return []; });
}

/* ---------- stats (server-side aggregation: one grouped call per DocType) ---------- */
function dsLabel(e, ds) { return isSub(e.dt) ? ['Draft', 'Submitted', 'Cancelled'][ds] || 'Draft' : 'Record'; }
function stats(e) {
  if (D.stats[e.id]) { return D.stats[e.id]; }
  var p = prep(e).then(function () {
    var fields = ['docstatus'], gb = ['docstatus'];
    if (has(e.dt, 'workflow_state')) { fields.push('workflow_state'); gb.push('workflow_state'); }
    else if (has(e.dt, 'status')) { fields.push('status'); gb.push('status'); }
    fields.push('count(name) as c');
    return glist(e.dt, { fields: fields, filters: F(e), group_by: gb.join(', '), limit: 500 });
  }).then(function (rows) {
    var r = { e: e, ok: true, total: 0, draft: 0, sub: 0, canc: 0, pend: 0, hold: 0, na: 0, dist: {} };
    (rows || []).forEach(function (x) {
      var c = x.c || 0, ds = x.docstatus || 0, wf = x.workflow_state, st = wf || x.status;
      r.total += c;
      if (isSub(e.dt)) { if (ds === 0) { r.draft += c; } else if (ds === 1) { r.sub += c; } else { r.canc += c; } } else { r.na += c; }
      if (ds < 2 && isPend(wf)) { r.pend += c; }
      if (ds < 2 && isHold(wf)) { r.hold += c; }
      var lab = st || dsLabel(e, ds); r.dist[lab] = (r.dist[lab] || 0) + c;
    });
    return r;
  }).catch(function (err) { D.bad[e.dt] = 1; return { e: e, ok: false, total: 0, draft: 0, sub: 0, canc: 0, pend: 0, hold: 0, na: 0, dist: {} }; });
  D.stats[e.id] = p; return p;
}
function todayCount(e) {
  if (D.today[e.id]) { return D.today[e.id]; }
  var td = todayStr();
  var f = F(e, { noDate: true }); f.push([e.dt, 'creation', 'between', [td, td]]);
  D.today[e.id] = prep(e).then(function () { return gcount(e.dt, f); }).catch(function () { return 0; });
  return D.today[e.id];
}

/* ---------- records / drill-down ---------- */
function bucketFilters(e, b) {
  var dt = e.dt, td = todayStr();
  if (b === 'draft') { return isSub(dt) ? [[dt, 'docstatus', '=', 0]] : [[dt, 'name', '=', NONE]]; }
  if (b === 'sub') { return isSub(dt) ? [[dt, 'docstatus', '=', 1]] : [[dt, 'name', '=', NONE]]; }
  if (b === 'canc') { return isSub(dt) ? [[dt, 'docstatus', '=', 2]] : [[dt, 'name', '=', NONE]]; }
  if (b === 'pend') { var ps = D.ps[dt] || []; return has(dt, 'workflow_state') ? [[dt, 'docstatus', '<', 2], [dt, 'workflow_state', 'in', ps.length ? ps : [NONE]]] : [[dt, 'name', '=', NONE]]; }
  if (b === 'hold') { var ph = D['ph_' + dt] || []; return has(dt, 'workflow_state') ? [[dt, 'docstatus', '<', 2], [dt, 'workflow_state', 'in', ph.length ? ph : [NONE]]] : [[dt, 'name', '=', NONE]]; }
  if (b === 'today') { return [[dt, 'creation', 'between', [td, td]]]; }
  return [];
}
function fieldsFor(e) {
  var dt = e.dt, f = ['name', 'owner', 'creation', 'modified', 'docstatus'];
  [dField(e)].concat(e.party || [], e.xf || [], ['company', 'custom_division', locF(dt), 'workflow_state', 'status', 'department', 'owner__department', 'set_department']).forEach(function (x) { if (x && f.indexOf(x) < 0 && has(dt, x)) { f.push(x); } });
  return f;
}
function normRow(e, r) {
  var party = ''; (e.party || []).some(function (x) { if (r[x]) { party = r[x]; return true; } return false; });
  var lf = locF(e.dt);
  var st = r.workflow_state || r.status || dsLabel(e, r.docstatus || 0);
  var cls = (r.docstatus === 2) ? 'canc' : isPend(r.workflow_state) ? 'pend' : (r.docstatus === 1 ? 'sub' : (isSub(e.dt) ? 'draft' : 'na'));
  return { raw: r, e: e, dt: e.dt, id: r.name, type: en(e), party: party, company: r.company || '', division: r.custom_division || '', location: lf ? (r[lf] || '') : '',
    owner: r.owner, by: ownerName(r.owner), date: String(r[dField(e)] || r.creation || '').slice(0, 10), created: String(r.creation || '').slice(0, 10), modified: String(r.modified || '').slice(0, 10),
    status: st, cls: cls, docstatus: r.docstatus, dept: r.department || r.owner__department || r.set_department || ownerDept(r.owner) };
}
function searchOr(e, q) { var o = [[e.dt, 'name', 'like', '%' + q + '%']]; (e.party || []).forEach(function (x) { if (has(e.dt, x)) { o.push([e.dt, x, 'like', '%' + q + '%']); } }); return o; }
var SORTMAP = { id: 'name', date: null, created: 'creation', modified: 'modified', by: 'owner', status: null, type: null };
function fetchRecs(e, filters, o) {
  o = o || {}; var sf = o.sortField && has(e.dt, o.sortField) ? o.sortField : 'modified';
  var ob = '' + sf + ' ' + (o.dir || 'desc');
  var base = { fields: fieldsFor(e), filters: filters, order_by: ob, start: o.start || 0, limit: o.limit || 20 };
  if (o.q) { base.or_filters = searchOr(e, o.q); }
  var cp = o.q ? glist(e.dt, { fields: ['count(name) as c'], filters: filters, or_filters: base.or_filters, limit: 1 }).then(function (r) { return r && r[0] ? r[0].c : 0; }) : gcount(e.dt, filters);
  return Promise.all([glist(e.dt, base), cp]).then(function (x) { return { rows: (x[0] || []).map(function (r) { return normRow(e, r); }), total: x[1] || 0 }; });
}
function openForm(dt, name) { try { closeModal(); frappe.set_route('Form', dt, name); } catch (e) { window.open(docUrl(dt, name), '_blank'); } }
function toRouteOpts(filters) {
  var o = {}; filters.forEach(function (f) { var k = f[1], op = f[2], v = f[3]; if (v === NONE || (op === 'in' && v.length === 1 && v[0] === NONE)) { return; } o[k] = op === '=' ? v : [op, v]; }); return o;
}
function openList(dt, filters) { try { closeModal(); frappe.route_options = toRouteOpts(filters); frappe.set_route('List', dt, 'List'); } catch (e) { toast(String(e), 1); } }

var DK = [];
function dk(d) { DK.push(d); return DK.length - 1; }
var DR = null;
function openDrill(d) {
  DR = { title: d.title, items: [], sel: 0, loading: true, d: d };
  paintModal();
  var es = d.es || [];
  Promise.all(es.map(function (e) { return prep(Object.assign(e, d.bucket === 'pend' ? { needPS: 1 } : {})).then(function () { return (d.bucket === 'pend' || d.bucket === 'hold') ? ensurePS(e) : null; }); })).then(function () {
    return Promise.all(es.map(function (e) {
      var extra = (d.extra ? d.extra(e) : []).concat(d.bucket ? bucketFilters(e, d.bucket) : []);
      var f = F(e, d.fopts || {}).concat(extra);
      return gcount(e.dt, f).then(function (n) { return { e: e, f: f, n: n || 0 }; }).catch(function () { return { e: e, f: f, n: 0, bad: 1 }; });
    }));
  }).then(function (items) {
    items = items.filter(function (i) { return i.n > 0; }).sort(function (a, b) { return b.n - a.n; });
    DR.items = items; DR.loading = false; DR.sel = 0; paintModal();
    if (items.length) { setupDrillTable(); }
  });
}
function setupDrillTable() {
  var it = DR.items[DR.sel]; if (!it) { return; }
  TB.drill = mkTable('drill', { mode: 'server', size: 15, sort: { k: 'modified', d: 'desc' }, cols: recCols(), name: 'records',
    loader: function (tb) { return fetchRecs(it.e, it.f, { start: (tb.page - 1) * tb.size, limit: tb.size, sortField: tb.sort.sf, dir: tb.sort.d, q: tb.q }); },
    exportAll: function () { return exportAllRecs(it.e, it.f); } });
  var box = $('[data-tbx="drill"]'); if (box) { box.innerHTML = tableShell('drill'); drawTable('drill'); }
}
function paintModal() {
  var m = $('#dm-modal'); if (!m) { return; }
  if (!DR) { m.innerHTML = ''; return; }
  var h = '<div class="dm-ov" data-act="mbg"><div class="dm-md" role="dialog"><div class="dm-mh"><h2>' + esc(DR.title) + '</h2><button class="dm-btn" data-act="mclose">' + t('close') + '</button></div>';
  if (DR.loading) { h += '<div class="dm-ld"><div class="dm-sp"></div>' + t('loading') + '</div>'; }
  else if (!DR.items.length) { h += '<div class="dm-empty">' + t('empty') + '</div>'; }
  else {
    h += '<div class="dm-chips">'; DR.items.forEach(function (i, ix) { h += '<button class="dm-chip' + (ix === DR.sel ? ' on' : '') + '" data-act="msel" data-i="' + ix + '">' + esc(en(i.e)) + '<b>' + fmt(i.n) + '</b></button>'; }); h += '</div>';
    h += '<div style="margin-bottom:8px"><button class="dm-btn" data-act="mlist">' + t('openlist') + ' – ' + esc(DR.items[DR.sel].e.dt) + '</button></div><div data-tbx="drill"></div>';
  }
  m.innerHTML = h + '</div></div>';
}
function closeModal() { DR = null; var m = $('#dm-modal'); if (m) { m.innerHTML = ''; } delete TB.drill; }
function exportAllRecs(e, f) {
  var out = [], cap = 5000, step = 500;
  function nx(s) { return fetchRecs(e, f, { start: s, limit: step }).then(function (r) { out = out.concat(r.rows); if (out.length < r.total && out.length < cap) { return nx(s + step); } return { rows: out, total: r.total, partial: r.total > out.length }; }); }
  return nx(0);
}

/* ---------- generic table component ---------- */
var TB = {};
function mkTable(id, cfg) { var tb = Object.assign({ id: id, page: 1, size: 20, q: '', rows: [], all: [], total: 0, sort: { k: '', d: 'asc' }, dirty: true, loading: false, partial: false, tok: 0 }, cfg); tb.name = cfg.name || id; TB[id] = tb; return tb; }
function recCols() {
  return [
    { k: 'id', h: 'id', sf: 'name', r: function (x) { return '<a href="' + docUrl(x.dt, x.id) + '" data-act="open" data-dt="' + esc(x.dt) + '" data-name="' + esc(x.id) + '">' + esc(x.id) + '</a>'; }, c: function (x) { return x.id; }, sk: function (x) { return x.id; } },
    { k: 'type', h: 'type', r: function (x) { return esc(en(x.e)); }, c: function (x) { return en(x.e); }, sk: function (x) { return en(x.e); } },
    { k: 'party', h: 'party', r: function (x) { return esc(x.party); }, c: function (x) { return x.party; }, sk: function (x) { return x.party; } },
    { k: 'company', h: 'company', r: function (x) { return esc(x.company); }, c: function (x) { return x.company; }, sk: function (x) { return x.company; } },
    { k: 'by', h: 'createdby', sf: 'owner', r: function (x) { return esc(x.by); }, c: function (x) { return x.by; }, sk: function (x) { return x.by; } },
    { k: 'date', h: 'docdate', r: function (x) { return esc(x.date); }, c: function (x) { return x.date; }, sk: function (x) { return x.date; } },
    { k: 'status', h: 'status', r: function (x) { return '<span class="dm-tag ' + x.cls + '">' + esc(ts(x.status)) + '</span>'; }, c: function (x) { return x.status; }, sk: function (x) { return x.status; } },
    { k: 'modified', h: 'modified', sf: 'modified', r: function (x) { return esc(x.modified); }, c: function (x) { return x.modified; }, sk: function (x) { return x.modified; } },
    { k: 'act', h: 'action', r: function (x) { return '<a data-act="open" data-dt="' + esc(x.dt) + '" data-name="' + esc(x.id) + '">' + t('open') + '</a>'; }, c: null }
  ];
}
function tableShell(id) {
  var tb = TB[id];
  return '<div class="dm-tb"><div class="l"><input class="dm-in" style="max-width:260px" data-tq="' + id + '" placeholder="' + esc(t('search')) + '" value="' + esc(tb.q) + '"></div><div><button class="dm-btn" data-act="tcsv" data-t="' + id + '">' + t('csv') + '</button> ' +
    (tb.exportAll ? '<button class="dm-btn" data-act="tcsvall" data-t="' + id + '">' + t('exportall') + '</button> ' : '') + '<button class="dm-btn" data-act="tprint" data-t="' + id + '">' + t('print') + '</button></div></div><div data-tbb="' + id + '"></div>';
}
function viewRows(tb) {
  if (tb.mode === 'server') { return tb.rows; }
  var rows = tb.all.slice(), q = (tb.q || '').toLowerCase();
  if (tb.filter) { rows = rows.filter(tb.filter); }
  if (q) { rows = rows.filter(function (r) { return tb.cols.some(function (c) { return c.c && String(c.c(r) == null ? '' : c.c(r)).toLowerCase().indexOf(q) >= 0; }); }); }
  var sc = tb.sort.k && tb.cols.filter(function (c) { return c.k === tb.sort.k; })[0];
  if (sc && sc.sk) { var d = tb.sort.d === 'asc' ? 1 : -1; rows.sort(function (a, b) { var x = sc.sk(a), y = sc.sk(b); if (x == null || x === '') { return 1; } if (y == null || y === '') { return -1; } return (x > y ? 1 : x < y ? -1 : 0) * d; }); }
  tb.viewTotal = rows.length; return rows;
}
function drawTable(id) {
  var tb = TB[id], el = $('[data-tbb="' + id + '"]'); if (!el || !tb) { return; }
  if (tb.loader && tb.dirty) {
    tb.dirty = false; tb.loading = true; var tok = ++tb.tok; paintTable(tb, el);
    tb.loader(tb).then(function (res) { if (tok !== tb.tok) { return; } if (tb.mode === 'server') { tb.rows = res.rows; tb.total = res.total; } else { tb.all = res.rows; } tb.partial = !!res.partial; tb.loading = false; tb.err = 0; paintTable(tb, $('[data-tbb="' + id + '"]')); })
      .catch(function () { if (tok !== tb.tok) { return; } tb.loading = false; tb.err = 1; paintTable(tb, $('[data-tbb="' + id + '"]')); });
    return;
  }
  paintTable(tb, el);
}
function paintTable(tb, el) {
  if (!el) { return; }
  if (tb.loading) { el.innerHTML = '<div class="dm-ld"><div class="dm-sp"></div>' + t('loading') + '</div>'; return; }
  if (tb.err) { el.innerHTML = '<div class="dm-note err">' + t('err') + '</div>'; return; }
  var rows = viewRows(tb), total = tb.mode === 'server' ? tb.total : tb.viewTotal, page = rows;
  if (tb.mode !== 'server') { page = rows.slice((tb.page - 1) * tb.size, tb.page * tb.size); }
  var pages = Math.max(1, Math.ceil(total / tb.size)); if (tb.page > pages) { tb.page = pages; }
  var h = '';
  if (tb.note) { h += '<div class="dm-note info">' + tb.note() + '</div>'; }
  if (tb.partial) { h += '<div class="dm-note">' + t('incomplete') + '</div>'; }
  if (!page.length) { el.innerHTML = h + '<div class="dm-empty">' + t('empty') + '</div>'; return; }
  h += '<div class="dm-tw"><table class="dm-t"><thead><tr>';
  tb.cols.forEach(function (c) {
    var on = tb.sort.k === c.k, canSort = tb.mode === 'server' ? !!c.sf : !!c.sk;
    h += '<th class="' + (canSort ? 's' : '') + (c.num ? ' num' : '') + '"' + (canSort ? ' data-act="tsort" data-t="' + tb.id + '" data-k="' + c.k + '"' : '') + '>' + esc(c.hl ? c.hl() : t(c.h)) + (on ? (tb.sort.d === 'asc' ? ' ▲' : ' ▼') : '') + '</th>';
  });
  h += '</tr></thead><tbody>';
  page.forEach(function (r) { h += '<tr>'; tb.cols.forEach(function (c) { h += '<td' + (c.num ? ' class="num"' : '') + '>' + c.r(r) + '</td>'; }); h += '</tr>'; });
  h += '</tbody></table></div><div class="dm-pg"><span>' + t('showing') + ' ' + fmt((tb.page - 1) * tb.size + 1) + '–' + fmt(Math.min(total, tb.page * tb.size)) + ' ' + t('of') + ' ' + fmt(total) + '</span><span>' +
    '<button class="dm-btn" data-act="tpg" data-t="' + tb.id + '" data-d="-1"' + (tb.page <= 1 ? ' disabled' : '') + '>' + t('prev') + '</button> ' + t('page') + ' ' + tb.page + ' ' + t('of') + ' ' + pages + ' <button class="dm-btn" data-act="tpg" data-t="' + tb.id + '" data-d="1"' + (tb.page >= pages ? ' disabled' : '') + '>' + t('next') + '</button></span></div>';
  el.innerHTML = h;
}
  /* ==== DM PDF export v1 · same as the DMS kit exportPdf, for dashboards not built on the kit (tools/erp/kit/dm-pdf-standalone.js) ====
     Tables print as a PDF on the DM Letter Head: the HTML is rendered by ERPNext (frappe.utils.print_format.report_to_pdf,
     the route Desk reports use) and the browser saves the file. Replaces the CSV exports. */
  function dmPdfExport(name, title, head, rows, o) {
    o = o || {};
    var W = window, F = W.frappe, LH = { name: '2026 DMG - NEW', img: '/files/WhatsApp Image 2026-08-20 at 3.32.18 PM.jpeg', foot: '/files/erp footer.jpeg' };
    var e = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var abs = function (h) { return String(h || '').replace(/(src|href)=(["'])\/(?!\/)/g, '$1=$2' + W.location.origin + '/'); };
    var lh = F && F.boot && F.boot.letter_heads && F.boot.letter_heads[o.letterHead || LH.name];
    var top = abs(lh && lh.header ? lh.header : '<div style="text-align:center"><img src="' + encodeURI(LH.img) + '" style="max-width:100%"></div>');
    var bottom = abs(String(lh && lh.footer ? lh.footer : '<div style="text-align:center"><img src="' + encodeURI(LH.foot) + '" style="max-width:100%"></div>').replace(/position\s*:\s*fixed;?/gi, ''));
    var rtl = !!o.rtl, al = rtl ? 'right' : 'left', today = new Date().toISOString().slice(0, 10), max = 2000, cut = rows.slice(0, max);
    var isNum = head.map(function (_, i) { var vals = cut.map(function (r) { return r[i]; }).filter(function (v) { return v !== '' && v != null; }); return vals.length > 0 && vals.every(function (v) { return typeof v === 'number' || /^-?[\d,]+(\.\d+)?$/.test(String(v)); }); });
    var cell = function (v, n) { if (v == null) { return ''; } if (n && !isNaN(String(v).replace(/,/g, ''))) { return Number(String(v).replace(/,/g, '')).toLocaleString('en-US', { maximumFractionDigits: 2 }); } return String(v).replace(/\s+/g, ' ').trim(); };
    var sub = [o.sub, cut.length + (rows.length > cut.length ? ' of ' + rows.length : '') + ' rows', 'Printed ' + today].filter(Boolean).join(' · ');
    var html = '<!DOCTYPE html><html dir="' + (rtl ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><style>body{font-family:Arial,"DejaVu Sans","Noto Naskh Arabic",sans-serif;font-size:10px;color:#1b2430;margin:0}' +
      '.t{font-size:15px;font-weight:bold;margin:12px 0 2px;color:#0f2147}.s{color:#5b6678;margin:0 0 10px;font-size:9.5px}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid}' +
      'th{background:#0f2147;color:#fff;text-align:' + al + ';padding:5px 6px;font-size:9.5px}td{padding:4px 6px;border-bottom:1px solid #dde2ea;vertical-align:top;text-align:' + al + '}tbody tr:nth-child(even) td{background:#f4f6fa}.n{text-align:right;white-space:nowrap}.f{margin-top:16px}</style></head><body>' +
      top + '<div class="t">' + e(title) + '</div><div class="s">' + e(sub) + '</div><table><thead><tr>' + head.map(function (h, i) { return '<th' + (isNum[i] ? ' class="n"' : '') + '>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cut.map(function (r) { return '<tr>' + head.map(function (_, i) { return '<td' + (isNum[i] ? ' class="n"' : '') + '>' + e(cell(r[i], isNum[i])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      (o.note ? '<div class="s" style="margin-top:8px">' + e(o.note) + '</div>' : '') + (rows.length > cut.length ? '<div class="s">Only the first ' + max + ' rows are included. Narrow the filters to print the rest.</div>' : '') + '<div class="f">' + bottom + '</div></body></html>';
    var done = function (msg, bad) { if (F && F.show_alert) { F.show_alert({ message: msg, indicator: bad ? 'red' : 'blue' }); } };
    done(rtl ? 'جارٍ تجهيز ملف PDF…' : 'Preparing PDF…');
    return fetch('/api/method/frappe.utils.print_format.report_to_pdf', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Frappe-CSRF-Token': (F && F.csrf_token) || '', 'Accept': 'application/pdf' },
      body: 'html=' + encodeURIComponent(html) + '&orientation=' + (head.length > 6 ? 'Landscape' : 'Portrait') })
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.blob(); })
      .then(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b.type === 'application/pdf' ? b : new Blob([b], { type: 'application/pdf' }));
        a.download = String(name || 'export').replace(/[^\w-]+/g, '_') + '_' + today + '.pdf'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }, function () { done(rtl ? 'تعذر تصدير PDF.' : 'PDF export failed. Try again or narrow the list.', true); });
  }
  /* ==== end DM PDF export ==== */
function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function downloadCSV(name, head, rows, partial) {   /* now a PDF on the DM letterhead (name kept so the callers stay unchanged) */
  var title = String(name).replace(/[_-]+/g, ' ').replace(/^./, function (s) { return s.toUpperCase(); });
  dmPdfExport(name + (partial ? '_PARTIAL' : ''), title, head, rows, { rtl: document.documentElement.dir === 'rtl', sub: 'DM Document Control Command Center', note: partial ? t('incomplete') : '' });
}
function tableToCsv(tb, rows, partial) {
  var cols = tb.cols.filter(function (c) { return c.c; });
  downloadCSV(tb.name || tb.id, cols.map(function (c) { return c.hl ? c.hl() : t(c.h); }), rows.map(function (r) { return cols.map(function (c) { return c.c(r); }); }), partial);
}
function printHTML(title, inner) {
  var w = window.open('', '_blank'); if (!w) { toast('Pop-up blocked', 1); return; }
  w.document.write('<html dir="' + (S.lang === 'ar' ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{font:12px Segoe UI,Tahoma,Arial;margin:20px;color:#0f172a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:start}th{background:#0b2a5b;color:#fff}h2{color:#0b2a5b}.m{color:#64748b;font-size:11px}</style></head><body><h2>DM ' + esc(title) + '</h2><div class="m">' + esc(t('updated')) + ': ' + esc(new Date().toLocaleString('en-GB')) + ' | ' + esc(S.f.from) + ' → ' + esc(S.f.to) + '</div>' + inner + '</body></html>');
  w.document.close(); setTimeout(function () { try { w.focus(); w.print(); } catch (e) { } }, 400);
}
function tablePrint(tb) {
  var rows = tb.mode === 'server' ? tb.rows : viewRows(tb).slice(0, 2000), cols = tb.cols.filter(function (c) { return c.c; });
  var h = '<table><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c.hl ? c.hl() : t(c.h)) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + esc(c.c(r)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  if (tb.partial || (tb.mode === 'server' && tb.total > rows.length)) { h += '<p class="m">' + esc(t('incomplete')) + '</p>'; }
  printHTML(tb.name || tb.id, h);
}
function toast(msg, bad) { var el = document.createElement('div'); el.className = 'dm-toast' + (bad ? ' err' : ''); el.textContent = msg; host.appendChild(el); setTimeout(function () { el.remove(); }, 4500); }

/* ---------- SVG / HTML charts (self-contained, clickable) ---------- */
function donut(items, total) {
  var R = 60, C = 2 * Math.PI * R, cum = 0, s = '<svg viewBox="0 0 170 170" role="img"><g transform="rotate(-90 85 85)">';
  items.forEach(function (i) { var fr = total ? i.v / total : 0, dash = C * fr; s += '<circle cx="85" cy="85" r="' + R + '" fill="none" stroke="' + i.c + '" stroke-width="26" stroke-dasharray="' + dash.toFixed(2) + ' ' + (C - dash).toFixed(2) + '" stroke-dashoffset="' + (-cum).toFixed(2) + '" style="cursor:pointer"' + (i.d != null ? ' data-act="drill" data-d="' + i.d + '"' : '') + '><title>' + esc(i.l) + ': ' + fmt(i.v) + '</title></circle>'; cum += dash; });
  s += '</g><text x="85" y="82" text-anchor="middle" font-size="20" font-weight="800" fill="#12408c">' + fmt(total) + '</text><text x="85" y="100" text-anchor="middle" font-size="10" fill="#64748b">' + esc(t('total')) + '</text></svg>';
  var lg = '<div class="dm-lg">' + items.map(function (i) { return '<div' + (i.d != null ? ' data-act="drill" data-d="' + i.d + '"' : '') + '><i style="background:' + i.c + '"></i>' + esc(i.l) + '<b>' + fmt(i.v) + '</b></div>'; }).join('') + '</div>';
  return '<div class="dm-donut">' + s + lg + '</div>';
}
function bars(items, opt) {
  opt = opt || {}; var mx = 0; items.forEach(function (i) { mx = Math.max(mx, i.v); }); if (!items.length || !mx) { return '<div class="dm-empty">' + t('empty') + '</div>'; }
  return '<div class="dm-bars">' + items.map(function (i) {
    var inner = i.segs ? i.segs.map(function (g) { return '<i style="width:' + (g.v / mx * 100).toFixed(2) + '%;background:' + g.c + '" title="' + esc(g.l || '') + ': ' + fmt(g.v) + '"></i>'; }).join('') : '<i style="width:' + (i.v / mx * 100).toFixed(2) + '%;background:' + (i.c || '#1d4ed8') + '"></i>';
    return '<div class="dm-br"' + (i.d != null ? ' data-act="drill" data-d="' + i.d + '"' : '') + ' title="' + esc(i.l) + '"><span class="n">' + esc(i.l) + '</span><span class="t">' + inner + '</span><span class="c">' + (opt.fmtv ? opt.fmtv(i) : fmt(i.v)) + '</span></div>';
  }).join('') + '</div>';
}
function line(labels, vals) {
  var W = 640, H = 200, pl = 36, pb = 28, pt = 14, n = vals.length, mx = Math.max.apply(null, vals.concat([1])), x = function (i) { return pl + (n > 1 ? i * (W - pl - 10) / (n - 1) : 0); }, y = function (v) { return pt + (H - pt - pb) * (1 - v / mx); };
  var pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
  var s = '<div class="dm-svgw"><svg dir="ltr" viewBox="0 0 ' + W + ' ' + H + '" style="min-width:420px;width:100%;max-height:230px" role="img">';
  for (var g = 0; g <= 4; g++) { var gv = mx * g / 4, gy = y(gv); s += '<line x1="' + pl + '" x2="' + (W - 6) + '" y1="' + gy + '" y2="' + gy + '" stroke="#e2e8f0"/><text x="' + (pl - 4) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="9" fill="#64748b">' + fmt(Math.round(gv)) + '</text>'; }
  s += '<polyline fill="none" stroke="#1d4ed8" stroke-width="2.5" points="' + pts + '"/>';
  vals.forEach(function (v, i) { s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="#1d4ed8"><title>' + esc(labels[i]) + ': ' + fmt(v) + '</title></circle><text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="9" fill="#64748b">' + esc(String(labels[i]).slice(0, 8)) + '</text>'; });
  return s + '</svg></div>';
}
function kpi(label, val, cls, d, sub) {
  var h = '<button class="dm-kpi ' + (cls || '') + (d == null ? ' dis' : '') + '"' + (d != null ? ' data-act="drill" data-d="' + d + '"' : '') + '><div class="l">' + esc(label) + '</div><div class="v">' + (val == null ? '<span class="dm-pill"><span class="dm-sp"></span></span>' : fmt(val)) + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</button>';
  return h;
}
function loadingBlock() { return '<div class="dm-ld"><div class="dm-sp"></div>' + t('loading') + '</div>'; }

/* ---------- shared data loaders ---------- */
D.sr = {}; D.sp = {}; D.orr = {}; D.orp = {}; D.tr = {}; D.trp = {}; D.td = {}; D.tdp = {};
var renderTimer = null;
function sched() { clearTimeout(renderTimer); renderTimer = setTimeout(function () { renderBody(); }, 180); }
function ensureStats(es) { es.forEach(function (e) { if (!D.sr[e.id] && !D.sp[e.id]) { D.sp[e.id] = 1; stats(e).then(function (r) { D.sr[e.id] = r; sched(); }); } }); }
function ensureToday(es) { es.forEach(function (e) { if (D.td[e.id] == null && !D.tdp[e.id]) { D.tdp[e.id] = 1; todayCount(e).then(function (n) { D.td[e.id] = n || 0; sched(); }); } }); }
function ownerFor(e) {
  if (D.own[e.id]) { return D.own[e.id]; }
  D.own[e.id] = prep(e).then(function () { return glist(e.dt, { fields: ['owner', 'docstatus', 'count(name) as c'], filters: F(e), group_by: 'owner, docstatus', limit: 2000 }); })
    .then(function (r) { return r || []; }).catch(function () { D.bad[e.dt] = 1; return []; });
  return D.own[e.id];
}
function ensureOwn(es) { es.forEach(function (e) { if (!D.orr[e.id] && !D.orp[e.id]) { D.orp[e.id] = 1; ownerFor(e).then(function (r) { D.orr[e.id] = r; sched(); }); } }); }
function trendFor(e) {
  if (D.trend[e.id]) { return D.trend[e.id]; }
  D.trend[e.id] = prep(e).then(function () {
    var chart = { chart_name: 'dm_tmp', chart_type: 'Count', document_type: e.dt, based_on: 'creation', timeseries: 1, time_interval: 'Monthly', timespan: 'Last Year', filters_json: JSON.stringify(F(e, { noDate: true })), type: 'Bar', doctype: 'Dashboard Chart', group_by_type: 'Count', value_based_on: '' };
    return api('frappe.desk.doctype.dashboard_chart.dashboard_chart.get', { chart: JSON.stringify(chart), no_cache: 1 });
  }).then(function (r) { return r && r.labels ? { labels: r.labels, v: r.datasets[0].values } : null; }).catch(function () { return null; });
  return D.trend[e.id];
}
function ensureTrend(es) { es.forEach(function (e) { if (D.tr[e.id] === undefined && !D.trp[e.id]) { D.trp[e.id] = 1; trendFor(e).then(function (r) { D.tr[e.id] = r; sched(); }); } }); }
function agg(es) {
  var a = { total: 0, draft: 0, sub: 0, canc: 0, pend: 0, hold: 0, na: 0, ready: true, miss: 0, dist: {} };
  es.forEach(function (e) { var r = D.sr[e.id]; if (!r) { a.ready = false; return; } if (!r.ok) { a.miss++; } a.total += r.total; a.draft += r.draft; a.sub += r.sub; a.canc += r.canc; a.pend += r.pend; a.hold += r.hold; a.na += r.na; Object.keys(r.dist).forEach(function (k) { a.dist[k] = (a.dist[k] || 0) + r.dist[k]; }); });
  return a;
}
function V(a, k) { return a.ready ? a[k] : null; }
function notes(es) {
  var h = '';
  if (es.excluded && es.excluded.length) { h += '<div class="dm-note">' + t('excl') + ': ' + esc(es.excluded.map(function (e) { return en(e); }).join(', ')) + '</div>'; }
  if (es.unavailable && es.unavailable.length) { h += '<div class="dm-note err">' + t('partial') + ' – ' + t('unavail') + ': ' + esc(es.unavailable.map(function (e) { return en(e); }).join(', ')) + '</div>'; }
  var failed = es.filter(function (e) { return D.sr[e.id] && !D.sr[e.id].ok; });
  if (failed.length) { h += '<div class="dm-note err">' + t('err') + ': ' + esc(failed.map(function (e) { return en(e); }).join(', ')) + '</div>'; }
  return h;
}
function statusExtra(label) {
  return function (e) {
    if (has(e.dt, 'workflow_state')) { return [[e.dt, 'workflow_state', '=', label]]; }
    if (has(e.dt, 'status')) { return [[e.dt, 'status', '=', label]]; }
    var m = { 'Draft': 0, 'Submitted': 1, 'Cancelled': 2 }; return m[label] != null && isSub(e.dt) ? [[e.dt, 'docstatus', '=', m[label]]] : [[e.dt, 'name', '=', NONE]];
  };
}
function distDonut(a, es) {
  var ks = Object.keys(a.dist).sort(function (x, y) { return a.dist[y] - a.dist[x]; }), items = [], oth = 0;
  ks.forEach(function (k, i) { if (i < 9) { items.push({ l: ts(k), v: a.dist[k], c: PAL[i % PAL.length], d: dk({ title: ts(k), es: es, extra: statusExtra(k) }) }); } else { oth += a.dist[k]; } });
  if (oth) { items.push({ l: t('other'), v: oth, c: '#cbd5e1' }); }
  return items.length ? donut(items, a.total) : '<div class="dm-empty">' + t('empty') + '</div>';
}
function typeBars(es) {
  var items = es.map(function (e) { var r = D.sr[e.id]; return r ? { l: en(e), v: r.total, c: PAL[0], d: dk({ title: en(e), es: [e] }) } : null; }).filter(function (x) { return x && x.v > 0; }).sort(function (a, b) { return b.v - a.v; });
  return bars(items);
}
function empTop(es, n) {
  var m = {}; es.forEach(function (e) { (D.orr[e.id] || []).forEach(function (r) { var o = m[r.owner] || (m[r.owner] = { u: r.owner, v: 0, d: 0, s: 0 }); o.v += r.c; if (r.docstatus === 0) { o.d += r.c; } else if (r.docstatus === 1) { o.s += r.c; } }); });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.v - a.v; }).slice(0, n || 10);
}
function empBars(es) {
  if (!es.every(function (e) { return D.orr[e.id]; })) { return loadingBlock(); }
  var top = empTop(es, 10); var items = top.map(function (o) { return { l: ownerName(o.u), v: o.v, c: PAL[0], d: dk({ title: ownerName(o.u), es: es, extra: function (e) { return [[e.dt, 'owner', '=', o.u]]; } }) }; });
  return bars(items);
}
function tabsLoadedOnce() { }

/* ---------- Tab 1: overview ---------- */
function tabOverview() {
  var es = entries(null); ensureStats(es); ensureToday(es);
  var grp = function (g) { return es.filter(function (e) { return e.g === g; }); };
  var a = agg(es), as = agg(grp('sales')), ap = agg(grp('proc')), ai = agg(grp('int'));
  var ex = expSummary(); ensureExp();
  var tdv = es.every(function (e) { return D.td[e.id] != null; }) ? sum(es, function (e) { return D.td[e.id]; }) : null;
  var h = notes(es) + '<div class="dm-kpis">' +
    kpi(t('k_total'), V(a, 'total'), '', dk({ title: t('k_total'), es: es }), a.miss ? t('partial') : '') +
    kpi(t('k_sales'), V(as, 'total'), '', dk({ title: t('k_sales'), es: grp('sales') })) +
    kpi(t('k_proc'), V(ap, 'total'), '', dk({ title: t('k_proc'), es: grp('proc') })) +
    kpi(t('k_internal'), V(ai, 'total'), '', dk({ title: t('k_internal'), es: grp('int') })) +
    kpi(t('k_draft'), V(a, 'draft'), 'grey', dk({ title: t('k_draft'), es: es, bucket: 'draft' })) +
    kpi(t('k_sub'), V(a, 'sub'), '', dk({ title: t('k_sub'), es: es, bucket: 'sub' })) +
    kpi(t('k_pend'), V(a, 'pend'), 'warn', dk({ title: t('k_pend'), es: es, bucket: 'pend' })) +
    kpi(t('k_soon'), ex ? ex.w30 : null, 'warn', dk({ go: 'expiry', chip: 'w30' })) +
    kpi(t('k_expired'), ex ? ex.expired : null, 'bad', dk({ go: 'expiry', chip: 'expired' })) +
    kpi(t('k_today'), tdv, 'ok', dk({ title: t('k_today'), es: es, bucket: 'today', fopts: { noDate: true } })) + '</div>';
  var divItems = [['sales', 'k_sales', PAL[0]], ['proc', 'k_proc', PAL[2]], ['int', 'k_internal', PAL[3]]].map(function (x) { var ag = agg(grp(x[0])); return { l: t(x[1]), v: ag.total, c: x[2], d: dk({ title: t(x[1]), es: grp(x[0]) }) }; });
  var dsItems = [['sales', 'k_sales'], ['proc', 'k_proc'], ['int', 'k_internal']].map(function (x) { var ag = agg(grp(x[0])); return { l: t(x[1]), v: ag.draft + ag.sub, segs: [{ v: ag.draft, c: C_DRAFT, l: t('draft') }, { v: ag.sub, c: C_SUB, l: t('submitted') }], d: dk({ title: t(x[1]) + ' – ' + t('draft'), es: grp(x[0]), bucket: 'draft' }), draft: ag.draft, sub: ag.sub }; });
  h += '<div class="dm-grid">' +
    '<div class="dm-card"><h3>' + t('c_div') + '</h3>' + (a.ready ? donut(divItems, a.total) : loadingBlock()) + '</div>' +
    '<div class="dm-card"><h3>' + t('c_type') + '</h3>' + (a.ready ? typeBars(es) : loadingBlock()) + '</div>' +
    '<div class="dm-card"><h3>' + t('c_ds') + '</h3>' + (a.ready ? bars(dsItems, { fmtv: function (i) { return '<span style="color:#64748b">' + fmt(i.draft) + '</span> / <span style="color:#1d4ed8">' + fmt(i.sub) + '</span>'; } }) + '<div class="dm-foot"><i style="background:' + C_DRAFT + ';display:inline-block;width:9px;height:9px;border-radius:2px"></i> ' + t('draft') + ' &nbsp; <i style="background:' + C_SUB + ';display:inline-block;width:9px;height:9px;border-radius:2px"></i> ' + t('submitted') + '</div>' : loadingBlock()) + '</div>' +
    '<div class="dm-card"><h3>' + t('c_status') + '</h3>' + (a.ready ? distDonut(a, es) : loadingBlock()) + '</div>' +
    '<div class="dm-card wide"><h3>' + t('c_trend') + '</h3>' + trendBlock(es) + '</div>' +
    '<div class="dm-card wide"><h3>' + t('c_emp') + '</h3>' + empBlock(es) + '</div></div>';
  return h;
}
function trendBlock(es) {
  ensureTrend(es); var done = es.filter(function (e) { return D.tr[e.id] !== undefined; }).length;
  if (done < es.length) { return loadingBlock() + '<div class="dm-foot" style="text-align:center">' + done + ' / ' + es.length + '</div>'; }
  var labels = null, vals = null; es.forEach(function (e) { var r = D.tr[e.id]; if (!r) { return; } if (!labels) { labels = r.labels; vals = r.v.map(function () { return 0; }); } r.v.forEach(function (x, i) { if (i < vals.length) { vals[i] += x; } }); });
  return labels ? line(labels, vals) : '<div class="dm-empty">' + t('empty') + '</div>';
}
function empBlock(es) {
  var acts = entries(null, ACT); ensureOwn(acts);
  if (!acts.every(function (e) { return D.orr[e.id]; })) { return loadingBlock(); }
  var m = {}; acts.forEach(function (e) { D.orr[e.id].forEach(function (r) { if (!EMPBYUSER[r.owner] || EMPBYUSER[r.owner].status !== 'Active') { return; } m[r.owner] = (m[r.owner] || 0) + r.c; }); });
  var items = Object.keys(m).map(function (u) { return { l: ownerName(u), v: m[u], c: PAL[0], d: dk({ go: 'activity', emp: EMPBYUSER[u].name }) }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
  return bars(items) + '<div class="dm-foot">' + t('actnote') + '</div>';
}

/* ---------- Tabs 2 & 3: sales / procurement ---------- */
var SEL = { sales: '', proc: '' };
function pickCols(keys, partyKey) {
  var all = recCols().concat([
    { k: 'division', h: 'division', r: function (x) { return esc(x.division); }, c: function (x) { return x.division; }, sk: function (x) { return x.division; } },
    { k: 'location', h: 'location', r: function (x) { return esc(x.location); }, c: function (x) { return x.location; }, sk: function (x) { return x.location; } }]);
  return keys.map(function (k) { var c = Object.assign({}, all.filter(function (x) { return x.k === k; })[0]); if (k === 'party') { c.hl = function () { return t(partyKey); }; } return c; });
}
function tabGroup(g) {
  var es = entries(g); ensureStats(es); var a = agg(es), id = 'tbl_' + g;
  var byId = {}; es.forEach(function (e) { byId[e.id] = e; });
  function K(idn, label, cls) { var e = byId[idn]; var r = e && D.sr[e.id]; return kpi(label, !e ? 0 : (r ? r.total : null), cls || '', e ? dk({ title: label, es: [e] }) : null, !e ? t('partial') : ''); }
  var h = notes(es) + '<div class="dm-kpis">';
  if (g === 'sales') {
    h += K('so', en({ en: 'Sales Orders', ar: 'أوامر البيع' })) + K('si', en({ en: 'Sales Invoices', ar: 'فواتير المبيعات' })) + K('qt', en({ en: 'Quotations', ar: 'عروض الأسعار' })) + K('dn', en({ en: 'Delivery Notes', ar: 'إشعارات التسليم' })) +
      K('cbc', en({ en: 'CBC Documents', ar: 'مستندات CBC' })) +
      kpi(t('s_pending'), V(a, 'pend'), 'warn', dk({ title: t('s_pending'), es: es, bucket: 'pend' })) + kpi(t('s_draft'), V(a, 'draft'), 'grey', dk({ title: t('s_draft'), es: es, bucket: 'draft' }));
  } else {
    h += K('po', en({ en: 'Purchase Orders', ar: 'أوامر الشراء' })) +
      K('pi', en({ en: 'Purchase Invoices', ar: 'فواتير المشتريات' })) + K('pr', en({ en: 'Purchase Receipts', ar: 'إيصالات الاستلام' })) + K('mr', en({ en: 'Material Requests', ar: 'طلبات المواد' })) +
      K('sbc', en({ en: 'SBC Documents', ar: 'مستندات SBC' })) +
      kpi(t('p_pending'), V(a, 'pend'), 'warn', dk({ title: t('p_pending'), es: es, bucket: 'pend' }));
  }
  h += '</div><div class="dm-grid"><div class="dm-card"><h3>' + t('breakdown') + '</h3>' + (a.ready ? typeBars(es) : loadingBlock()) + '</div>' +
    '<div class="dm-card"><h3>' + t('statuschart') + '</h3>' + (a.ready ? distDonut(a, es) : loadingBlock()) + '</div>';
  ensureOwn(es);
  h += '<div class="dm-card wide"><h3>' + t('empact') + '</h3>' + empBars(es) + '</div></div>';
  h += '<div class="dm-card"><div class="dm-chips"><button class="dm-chip' + (SEL[g] === '' ? ' on' : '') + '" data-act="gsel" data-g="' + g + '" data-e="">' + t('all') + '</button>' +
    es.map(function (e) { var r = D.sr[e.id]; return '<button class="dm-chip' + (SEL[g] === e.id ? ' on' : '') + '" data-act="gsel" data-g="' + g + '" data-e="' + e.id + '">' + esc(en(e)) + '<b>' + (r ? fmt(r.total) : '…') + '</b></button>'; }).join('') +
    '</div><div data-tbx="' + id + '"></div></div>';
  if (!TB[id] || TB[id].sel !== SEL[g] || TB[id].sig !== sigNow()) { setupGroupTable(g, es); }
  return h;
}
function sigNow() { return JSON.stringify(S.f) + S.epoch; }
function setupGroupTable(g, es) {
  var id = 'tbl_' + g, sel = SEL[g] && REGBY[SEL[g]] && es.indexOf(REGBY[SEL[g]]) >= 0 ? REGBY[SEL[g]] : null;
  var keys = g === 'sales' ? ['id', 'type', 'party', 'company', 'division', 'location', 'by', 'date', 'status', 'modified', 'act'] : ['id', 'type', 'party', 'company', 'division', 'by', 'date', 'status', 'modified', 'act'];
  var pk = g === 'sales' ? 'customer' : 'supplier', cols = pickCols(keys, pk);
  var tb;
  if (sel) {
    tb = mkTable(id, { mode: 'server', cols: cols, name: g + '_' + sel.id, sort: { k: 'modified', d: 'desc' },
      loader: function (t0) { return fetchRecs(sel, F(sel), { start: (t0.page - 1) * t0.size, limit: t0.size, sortField: t0.sort.sf, dir: t0.sort.d, q: t0.q }); },
      exportAll: function () { return exportAllRecs(sel, F(sel)); } });
  } else {
    tb = mkTable(id, { mode: 'client', cols: cols, name: g + '_latest', sort: { k: 'modified', d: 'desc' }, note: function () { return t('mergednote'); },
      loader: function () { return Promise.all(es.map(function (e) { return prep(e).then(function () { return fetchRecs(e, F(e), { limit: 25, sortField: 'modified' }); }).catch(function () { return { rows: [], total: 0 }; }); })).then(function (rs) { var rows = []; var tot = 0; rs.forEach(function (r) { rows = rows.concat(r.rows); tot += r.total; }); return { rows: rows, total: rows.length, partial: tot > rows.length }; }); } });
  }
  tb.sel = SEL[g]; tb.sig = sigNow();
}

/* ---------- expiry sources (only fields that exist in this ERP) ---------- */
var EXPS = [
 { id: 'contract', dt: 'Contract', f: ['name', 'party_type', 'party_name', 'party_full_name', 'start_date', 'end_date', 'status', 'is_signed', 'docstatus', 'owner'], flt: [['docstatus', '<', 2]], hasCompany: false,
   map: function (r) { var g = r.party_type === 'Customer' ? 'sales' : r.party_type === 'Supplier' ? 'proc' : 'int'; var tn = { Customer: ['Customer Agreement', 'اتفاقية عميل'], Supplier: ['Supplier Agreement', 'اتفاقية مورد'], Employee: ['Employee / HR Contract', 'عقد موظف / موارد بشرية'] }[r.party_type] || ['Contract', 'عقد'];
     return { g: g, type: { en: tn[0], ar: tn[1] }, party: r.party_full_name || r.party_name || '', dept: ownerDept(r.owner), resp: r.party_type === 'Employee' ? (r.party_full_name || ownerName(r.owner)) : ownerName(r.owner), start: r.start_date, end: r.end_date, status: r.status || '', pending: r.status === 'Unsigned' || r.docstatus === 0, active: r.status === 'Active', unsigned: !r.is_signed }; } },
 { id: 'docrec', dt: 'Document Record', f: ['name', 'document_title__document_no', 'category', 'status', 'owner__department', 'employee', 'customer', 'supplier', 'issued_date', 'expired_date', 'file_attachment', 'docstatus', 'owner', 'company'], flt: [['docstatus', '<', 2]],
   map: function (r) { return { g: 'int', type: { en: 'Document Record – ' + (r.category || 'General'), ar: 'سجل مستند – ' + (r.category || 'عام') }, party: r.document_title__document_no || r.customer || r.supplier || r.employee || '', dept: r.owner__department || ownerDept(r.owner), resp: ownerName(r.owner), start: r.issued_date, end: r.expired_date, status: r.status || '', pending: r.status === 'Draft', active: r.status === 'Active', attach: r.file_attachment ? 1 : 0 }; } },
 { id: 'emp', dt: 'Employee', f: ['name', 'employee_name', 'department', 'status', 'contract_end_date', 'company', 'user_id'], flt: [['status', '=', 'Active']], noOwner: true,
   map: function (r) { return { g: 'int', type: { en: 'Employee Contract', ar: 'عقد موظف' }, party: empName(r), dept: r.department || '', resp: empName(r), start: '', end: r.contract_end_date, status: r.status || '', pending: false, active: true }; } },
 { id: 'sca', dt: 'Sub Contract Agreement', f: ['name', 'sub_contract', 'customer', 'actual_startdate', 'comple_agreedate', 'docstatus', 'owner', 'project'], flt: [['docstatus', '<', 2]],
   map: function (r) { return { g: 'int', type: { en: 'Sub Contract Agreement', ar: 'اتفاقية مقاولة من الباطن' }, party: r.sub_contract || r.customer || '', dept: ownerDept(r.owner), resp: ownerName(r.owner), start: r.actualstart || r.actual_startdate, end: r.comple_agreedate, status: r.docstatus === 0 ? 'Draft' : 'Submitted', pending: r.docstatus === 0, active: r.docstatus === 1 }; } },
 { id: 'qiwa', dt: 'Qiwa contract renewal request', f: ['name', 'department', 'workflow_state', 'contract_end_date', 'docstatus', 'owner', 'company'], flt: [['docstatus', '<', 2]],
   map: function (r) { return { g: 'int', type: { en: 'Qiwa Contract Renewal', ar: 'تجديد عقد قوى' }, party: '', dept: r.department || ownerDept(r.owner), resp: ownerName(r.owner), start: '', end: r.contract_end_date, status: r.workflow_state || (r.docstatus === 0 ? 'Draft' : 'Submitted'), pending: r.docstatus === 0, active: r.docstatus === 1 }; } }
];
function loadSrc(src) {
  return loadMeta(src.dt).then(function () {
    if (!META[src.dt].ok) { D.errs[src.dt] = 'unavail'; return []; }
    var fields = src.f.filter(function (f) { return has(src.dt, f); }), dt = src.dt;
    var filters = src.flt.filter(function (x) { return has(dt, x[0]); }).map(function (x) { return [dt, x[0], x[1], x[2]]; });
    if (S.f.company && has(dt, 'company')) { filters.push([dt, 'company', '=', S.f.company]); }
    if (src.id === 'emp') { if (S.f.department) { filters.push([dt, 'department', '=', S.f.department]); } if (S.f.employee) { filters.push([dt, 'name', '=', S.f.employee]); } }
    else { if (S.f.employee) { var em = empByName(S.f.employee); filters.push([dt, 'owner', '=', em && em.user_id ? em.user_id : NONE]); } if (S.f.department) { var us = deptUsers(S.f.department); filters.push(us.length ? [dt, 'owner', 'in', us] : [dt, 'owner', '=', NONE]); } }
    return glist(dt, { fields: fields, filters: filters, order_by: 'modified desc', limit: 1000 }).then(function (rows) {
      var td = todayStr();
      return (rows || []).map(function (r) {
        var m = src.map(r), end = m.end ? String(m.end).slice(0, 10) : '', days = end ? dayDiff(td, end) : null;
        var cls = days == null ? 'na' : days < 0 ? 'expired' : days <= 30 ? 'soon' : 'valid';
        return { dt: dt, id: r.name, src: src.id, g: m.g, type: m.type, party: m.party, dept: m.dept, resp: m.resp, start: m.start ? String(m.start).slice(0, 10) : '', end: end, days: days, cls: cls, status: m.status, pending: !!m.pending, active: !!m.active, attach: m.attach, unsigned: !!m.unsigned, docstatus: r.docstatus, owner: r.owner };
      });
    }).catch(function () { D.errs[dt] = 'err'; return []; });
  });
}
function markFiles(rows) {
  var by = {}; rows.forEach(function (r) { if (r.src === 'contract' || r.src === 'sca' || r.src === 'docrec') { (by[r.dt] = by[r.dt] || []).push(r); } });
  return Promise.all(Object.keys(by).map(function (dt) {
    var list = by[dt], names = list.map(function (r) { return r.id; }), chunks = [];
    for (var i = 0; i < names.length; i += 150) { chunks.push(names.slice(i, i + 150)); }
    return Promise.all(chunks.map(function (c) { return glist('File', { fields: ['attached_to_name'], filters: [['File', 'attached_to_doctype', '=', dt], ['File', 'attached_to_name', 'in', c]], limit: 1000 }).catch(function () { return null; }); })).then(function (res) {
      if (res.some(function (x) { return x === null; })) { list.forEach(function (r) { if (r.attach == null) { r.attach = null; } }); return; }
      var set = {}; res.forEach(function (x) { (x || []).forEach(function (f) { set[f.attached_to_name] = 1; }); });
      list.forEach(function (r) { r.attach = (r.attach || set[r.id]) ? 1 : 0; });
    });
  }));
}
function loadOthers() {
  var defs = [['DM Official Memo', 'memo', ['name', 'memo_subject', 'memo_type', 'workflow_state', 'attch_signed', 'memo_date', 'issued_by', 'docstatus', 'owner', 'company'], { en: 'Internal Memo', ar: 'مذكرة داخلية' }], ['DM Letters', 'let', ['name', 'workflow_state', 'docstatus', 'owner', 'company'], { en: 'Company Letter', ar: 'خطاب الشركة' }], ['DM Letter Forms', 'lf', ['name', 'department', 'docstatus', 'owner', 'company'], { en: 'Letter Form', ar: 'نموذج خطاب' }], ['Legal Case List', 'legal', ['name', 'owner'], { en: 'Legal Case', ar: 'قضية قانونية' }], ['Court Cases', 'court', ['name', 'docstatus', 'owner'], { en: 'Court Case', ar: 'قضية محكمة' }]];
  return Promise.all(defs.map(function (d) {
    var dt = d[0];
    return loadMeta(dt).then(function () {
      if (!META[dt].ok) { D.errs[dt] = 'unavail'; return []; }
      var fields = d[2].filter(function (f) { return has(dt, f); }), filters = [];
      if (S.f.company && has(dt, 'company')) { filters.push([dt, 'company', '=', S.f.company]); }
      if (S.f.employee) { var em = empByName(S.f.employee); filters.push([dt, 'owner', '=', em && em.user_id ? em.user_id : NONE]); }
      if (S.f.department) { var us = deptUsers(S.f.department); filters.push(us.length ? [dt, 'owner', 'in', us] : [dt, 'owner', '=', NONE]); }
      return glist(dt, { fields: fields, filters: filters, order_by: 'modified desc', limit: 500 }).then(function (rows) {
        return (rows || []).map(function (r) {
          var st = r.workflow_state || (isSub(dt) ? ['Draft', 'Submitted', 'Cancelled'][r.docstatus || 0] : 'Record');
          return { dt: dt, id: r.name, src: d[1], g: 'int', type: d[3], party: r.memo_subject || '', dept: r.department || ownerDept(r.owner), resp: ownerName(r.owner), start: '', end: '', days: null, cls: 'na', status: st, pending: r.docstatus === 0, active: false, attach: d[1] === 'memo' ? (r.docstatus === 1 ? (r.attch_signed ? 1 : 0) : null) : null, docstatus: r.docstatus, owner: r.owner, other: true };
        });
      }).catch(function () { D.errs[dt] = 'err'; return []; });
    });
  }));
}
function ensureExp() {
  if (D.expP) { return D.expP; }
  D.expP = Promise.all(EXPS.map(loadSrc)).then(function (parts) {
    var rows = [].concat.apply([], parts); return markFiles(rows).then(function () { D.exp = rows; sched(); return rows; });
  }).catch(function () { D.exp = []; D.errs.exp = 'err'; sched(); return []; });
  return D.expP;
}
function ensureInternal() {
  if (D.intP) { return D.intP; }
  D.intP = Promise.all([ensureExp(), loadOthers()]).then(function (x) { D.int = x[0].filter(function (r) { return r.g === 'int'; }).concat([].concat.apply([], x[1])); sched(); return D.int; }).catch(function () { D.int = []; sched(); });
  return D.intP;
}
function expSummary() {
  if (!D.exp) { return null; }
  var s = { w7: 0, w15: 0, w30: 0, w60: 0, expired: 0, na: 0, valid: 0 };
  D.exp.forEach(function (r) { if (r.days == null) { s.na++; return; } if (r.days < 0) { s.expired++; return; } s.valid++; if (r.days <= 7) { s.w7++; } if (r.days <= 15) { s.w15++; } if (r.days <= 30) { s.w30++; } if (r.days <= 60) { s.w60++; } });
  return s;
}
var EXPCOLS = null;
function expCols() {
  return [
    { k: 'id', h: 'agname', r: function (x) { return '<a href="' + docUrl(x.dt, x.id) + '" data-act="open" data-dt="' + esc(x.dt) + '" data-name="' + esc(x.id) + '">' + esc(x.id) + '</a>'; }, c: function (x) { return x.id; }, sk: function (x) { return x.id; } },
    { k: 'type', h: 'type', r: function (x) { return esc(en(x.type)); }, c: function (x) { return en(x.type); }, sk: function (x) { return en(x.type); } },
    { k: 'party', h: 'empparty', r: function (x) { return esc(x.party); }, c: function (x) { return x.party; }, sk: function (x) { return x.party; } },
    { k: 'dept', h: 'deptresp', r: function (x) { return esc(deptShort(x.dept)); }, c: function (x) { return x.dept; }, sk: function (x) { return x.dept; } },
    { k: 'resp', h: 'resp', r: function (x) { return esc(x.resp); }, c: function (x) { return x.resp; }, sk: function (x) { return x.resp; } },
    { k: 'start', h: 'start', r: function (x) { return esc(x.start); }, c: function (x) { return x.start; }, sk: function (x) { return x.start; } },
    { k: 'end', h: 'end', r: function (x) { return x.end ? esc(x.end) : '<span class="dm-tag na">' + t('notavail') + '</span>'; }, c: function (x) { return x.end || 'Expiry Not Available'; }, sk: function (x) { return x.end; } },
    { k: 'days', h: 'daysrem', num: 1, r: function (x) { return x.days == null ? '–' : fmt(x.days); }, c: function (x) { return x.days == null ? '' : x.days; }, sk: function (x) { return x.days; } },
    { k: 'status', h: 'status', r: function (x) { return '<span class="dm-tag ' + x.cls + '">' + esc(x.days == null ? t('notavail') : x.days < 0 ? t('expired') : x.days <= 30 ? t('soon') : t('valid')) + '</span> <span style="color:#64748b">' + esc(ts(x.status)) + '</span>'; }, c: function (x) { return (x.days == null ? 'Expiry Not Available' : x.days < 0 ? 'Expired' : x.days <= 30 ? 'Expiring soon' : 'Valid') + ' / ' + x.status; }, sk: function (x) { return x.cls; } },
    { k: 'act', h: 'action', r: function (x) { return '<a data-act="open" data-dt="' + esc(x.dt) + '" data-name="' + esc(x.id) + '">' + t('open') + '</a>'; }, c: null }
  ];
}
function expFilterFn(chip) {
  return function (r) {
    switch (chip) {
      case 'w7': return r.days != null && r.days >= 0 && r.days <= 7; case 'w15': return r.days != null && r.days >= 0 && r.days <= 15;
      case 'w30': return r.days != null && r.days >= 0 && r.days <= 30; case 'w60': return r.days != null && r.days >= 0 && r.days <= 60;
      case 'expired': return r.days != null && r.days < 0; case 'na': return r.days == null; case 'valid': return r.days != null && r.days >= 0;
      case 'active': return r.active && (r.days == null || r.days >= 0); case 'pending': return r.pending; case 'missing': return r.attach === 0; case 'agr': return !r.other;
      default: return true;
    }
  };
}
var EXPCHIP = '', INTCHIP = '';
function tabExpiry() {
  var h = '<div class="dm-note info">' + t('expnote') + '</div>';
  ensureExp(); if (!D.exp) { return h + loadingBlock(); }
  var s = expSummary(), srcErr = Object.keys(D.errs).filter(function (k) { return D.errs[k]; });
  if (srcErr.length) { h += '<div class="dm-note err">' + t('partial') + ': ' + esc(srcErr.join(', ')) + '</div>'; }
  var cards = [['w7', 'w7', 'warn'], ['w15', 'w15', 'warn'], ['w30', 'w30', 'warn'], ['w60', 'w60', ''], ['expired', 'expired', 'bad'], ['na', 'noexp', 'grey']];
  h += '<div class="dm-kpis">' + cards.map(function (c) { return '<button class="dm-kpi ' + c[2] + '" data-act="echip" data-c="' + c[0] + '"><div class="l">' + t(c[1]) + '</div><div class="v">' + fmt(c[0] === 'na' ? s.na : s[c[0]]) + '</div></button>'; }).join('') + '</div>';
  h += '<div class="dm-card"><div class="dm-chips">' + [['', 'all'], ['valid', 'valid'], ['w30', 'soon'], ['expired', 'expired'], ['na', 'noexp']].map(function (c) { return '<button class="dm-chip' + (EXPCHIP === c[0] ? ' on' : '') + '" data-act="echip" data-c="' + c[0] + '">' + t(c[1]) + '</button>'; }).join('') + '</div><div data-tbx="tbl_exp"></div></div>';
  var tb = TB.tbl_exp;
  if (!tb || tb.sig !== sigNow() + EXPCHIP) {
    mkTable('tbl_exp', { mode: 'client', cols: expCols(), size: 20, name: 'expiry_compliance', sort: { k: 'days', d: 'asc' }, filter: expFilterFn(EXPCHIP) }); TB.tbl_exp.all = D.exp; TB.tbl_exp.dirty = false; TB.tbl_exp.sig = sigNow() + EXPCHIP;
  } else { TB.tbl_exp.all = D.exp; }
  return h;
}

/* ---------- Tab 4: internal ---------- */
function tabInternal() {
  var es = entries('int'); ensureStats(es); ensureInternal(); var a = agg(es), h = notes(es);
  var rows = D.int, ex = null;
  if (rows) { ex = { active: rows.filter(expFilterFn('active')).filter(function (r) { return !r.other; }).length, pending: rows.filter(function (r) { return r.pending && !r.other; }).length, soon: rows.filter(expFilterFn('w30')).length, expd: rows.filter(expFilterFn('expired')).length, miss: rows.filter(expFilterFn('missing')).length }; }
  function IK(label, key, cls) { return '<button class="dm-kpi ' + cls + '" data-act="ichip" data-c="' + key + '"><div class="l">' + label + '</div><div class="v">' + (ex ? fmt(ex[key === 'w30' ? 'soon' : key === 'expired' ? 'expd' : key === 'missing' ? 'miss' : key]) : '<span class="dm-sp"></span>') + '</div></button>'; }
  h += '<div class="dm-kpis">' + kpi(t('i_total'), V(a, 'total'), '', dk({ title: t('i_total'), es: es })) + IK(t('i_active'), 'active', 'ok') + IK(t('i_pending'), 'pending', 'warn') + IK(t('i_exp'), 'w30', 'warn') + IK(t('i_expd'), 'expired', 'bad') + IK(t('i_miss'), 'missing', 'grey') + '</div>';
  h += '<div class="dm-grid"><div class="dm-card"><h3>' + t('breakdown') + '</h3>' + (a.ready ? typeBars(es) : loadingBlock()) + '</div><div class="dm-card"><h3>' + t('statuschart') + '</h3>' + (a.ready ? distDonut(a, es) : loadingBlock()) + '</div></div>';
  var chips = [['', 'all'], ['agr', 'i_active'], ['active', 'i_active'], ['pending', 'i_pending'], ['w30', 'i_exp'], ['expired', 'i_expd'], ['missing', 'i_miss'], ['na', 'notavail']];
  chips = chips.filter(function (c, i) { return i !== 1; });
  h += '<div class="dm-card"><div class="dm-chips">' + chips.map(function (c) { return '<button class="dm-chip' + (INTCHIP === c[0] ? ' on' : '') + '" data-act="ichip" data-c="' + c[0] + '">' + t(c[1]) + '</button>'; }).join('') + '</div><div data-tbx="tbl_int"></div></div>';
  if (!rows) { return h.replace('<div data-tbx="tbl_int"></div>', loadingBlock()); }
  var cols = expCols().map(function (c) { return c; });
  cols[1] = Object.assign({}, cols[1]); cols[2] = Object.assign({}, cols[2]);
  var tb = TB.tbl_int;
  if (!tb || tb.sig !== sigNow() + INTCHIP) { mkTable('tbl_int', { mode: 'client', cols: cols, size: 20, name: 'internal_documents', sort: { k: 'days', d: 'asc' }, filter: expFilterFn(INTCHIP) }); TB.tbl_int.all = rows; TB.tbl_int.dirty = false; TB.tbl_int.sig = sigNow() + INTCHIP; } else { TB.tbl_int.all = rows; }
  return h;
}

/* ---------- Tab 5: employee activity (mirrors the ERP Employees Activity Report: owner + creation date + Active employees) ---------- */
var ACTSEL = '';
function activeActs() { var a = entries(null, ACT); return ACTSEL ? a.filter(function (x) { return x.id === ACTSEL; }) : a; }
function buildMatrix(acts) {
  var rows = [], colT = {}, unmapped = 0;
  acts.forEach(function (a) {
    var r = { a: a, cells: {}, d: 0, s: 0, c: 0, n: 0 };
    (D.orr[a.id] || []).forEach(function (x) {
      var em = EMPBYUSER[x.owner];
      if (!em || em.status !== 'Active') { unmapped += x.c; return; }
      if (S.ejl && em.custom_job_location !== S.ejl) { return; }
      r.cells[x.owner] = (r.cells[x.owner] || 0) + x.c; r.n += x.c;
      if (x.docstatus === 0) { r.d += x.c; } else if (x.docstatus === 1) { r.s += x.c; } else { r.c += x.c; }
      var ct = colT[x.owner] || (colT[x.owner] = { n: 0, d: 0, s: 0, c: 0 }); ct.n += x.c; if (x.docstatus === 0) { ct.d += x.c; } else if (x.docstatus === 1) { ct.s += x.c; } else { ct.c += x.c; }
    });
    rows.push(r);
  });
  var cols = Object.keys(colT).sort(function (a, b) { return colT[b].n - colT[a].n; });
  return { rows: rows.filter(function (r) { return r.n > 0 || !D.orr[r.a.id]; }), cols: cols, colT: colT, unmapped: unmapped };
}
function actDrill(a, user, title) { return dk({ title: title, es: Array.isArray(a) ? a : [a], extra: user ? function (e) { return [[e.dt, 'owner', '=', user]]; } : null }); }
function tabActivity() {
  var acts = activeActs(); ensureOwn(acts);
  var h = '<div class="dm-note info">' + t('actnote') + '</div>' + notes(acts);
  var jl = '<option value="">' + t('all') + '</option>' + OPT.ejl.map(function (x) { return '<option' + (S.ejl === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  var ao = '<option value="">' + t('all') + '</option>' + entries(null, ACT).map(function (x) { return '<option value="' + x.id + '"' + (ACTSEL === x.id ? ' selected' : '') + '>' + esc(en(x)) + '</option>'; }).join('');
  h += '<div class="dm-fl" style="margin:0 0 12px"><div><label>' + t('jobloc') + '</label><select data-ctl="ejl">' + jl + '</select></div><div><label>' + t('activity') + '</label><select data-ctl="actsel">' + ao + '</select></div><div><button class="dm-btn pri" data-act="mxcsv">' + t('csv') + '</button></div></div>';
  if (!acts.every(function (a) { return D.orr[a.id]; })) { return h + loadingBlock(); }
  var M = buildMatrix(acts); D.mx = M;
  var tot = sum(M.cols, function (u) { return M.colT[u].n; }), dr = sum(M.cols, function (u) { return M.colT[u].d; }), sb = sum(M.cols, function (u) { return M.colT[u].s; });
  var topU = M.cols[0];
  h += '<div class="dm-kpis">' + kpi(t('total'), tot, '', null) + kpi(t('emps'), M.cols.length, '', null) + kpi(t('avg'), M.cols.length ? Math.round(tot / M.cols.length) : 0, '', null) +
    kpi(t('tdraft'), dr, 'grey', null) + kpi(t('tsub'), sb, '', null) + '<button class="dm-kpi dis"><div class="l">' + t('topc') + '</div><div class="v" style="font-size:15px">' + esc(topU ? ownerName(topU) : '–') + '</div><div class="s">' + (topU ? fmt(M.colT[topU].n) + ' (' + (tot ? (M.colT[topU].n / tot * 100).toFixed(1) : 0) + '%)' : '') + '</div></button></div>';
  var top = M.cols.slice(0, 10);
  h += '<div class="dm-grid"><div class="dm-card"><h3>' + t('topemp') + ' – ' + t('contrib') + '</h3>' + bars(top.map(function (u) { return { l: ownerName(u), v: M.colT[u].n, c: PAL[0], d: actDrill(acts, u, ownerName(u)) }; }), { fmtv: function (i) { return fmt(i.v) + ' · ' + (tot ? (i.v / tot * 100).toFixed(1) : 0) + '%'; } }) + '</div>' +
    '<div class="dm-card"><h3>' + t('dvs') + '</h3>' + bars(top.map(function (u) { return { l: ownerName(u), v: M.colT[u].d + M.colT[u].s, segs: [{ v: M.colT[u].d, c: C_DRAFT, l: t('draft') }, { v: M.colT[u].s, c: C_SUB, l: t('submitted') }], draft: M.colT[u].d, sub: M.colT[u].s }; }), { fmtv: function (i) { return fmt(i.draft) + ' / ' + fmt(i.sub); } }) + '</div></div>';
  if (!M.cols.length) { return h + '<div class="dm-empty">' + t('empty') + '</div>'; }
  h += '<div class="dm-card"><div class="dm-tw" style="max-height:70vh"><table class="dm-t dm-mx"><thead><tr><th>' + t('activity') + '</th>' +
    M.cols.map(function (u) { return '<th class="emp" data-act="drill" data-d="' + actDrill(acts, u, ownerName(u)) + '" title="' + esc(ownerName(u)) + '">' + esc(ownerName(u)) + '</th>'; }).join('') + '<th class="num">' + t('tdraft') + '</th><th class="num">' + t('tsub') + '</th><th class="num">' + t('tcanc') + '</th><th class="num">' + t('grand') + '</th></tr></thead><tbody>';
  M.rows.forEach(function (r) {
    h += '<tr><td>' + esc(en(r.a)) + '</td>' + M.cols.map(function (u) { var v = r.cells[u]; return '<td class="num">' + (v ? '<a data-act="drill" data-d="' + actDrill(r.a, u, en(r.a) + ' – ' + ownerName(u)) + '">' + fmt(v) + '</a>' : '') + '</td>'; }).join('') +
      '<td class="num">' + fmt(r.d) + '</td><td class="num">' + fmt(r.s) + '</td><td class="num">' + fmt(r.c) + '</td><td class="num"><a data-act="drill" data-d="' + actDrill(r.a, null, en(r.a)) + '">' + fmt(r.n) + '</a></td></tr>';
  });
  h += '</tbody><tfoot><tr><td>' + t('grand') + '</td>' + M.cols.map(function (u) { return '<td class="num">' + fmt(M.colT[u].n) + '</td>'; }).join('') + '<td class="num">' + fmt(dr) + '</td><td class="num">' + fmt(sb) + '</td><td class="num">' + fmt(sum(M.cols, function (u) { return M.colT[u].c; })) + '</td><td class="num">' + fmt(tot) + '</td></tr></tfoot></table></div>';
  h += '<div class="dm-foot">' + t('unmapped') + ': ' + fmt(M.unmapped) + '</div></div>';
  return h;
}
function matrixCsv() {
  var M = D.mx; if (!M) { return; }
  var head = [t('activity')].concat(M.cols.map(ownerName), [t('tdraft'), t('tsub'), t('tcanc'), t('grand')]);
  var rows = M.rows.map(function (r) { return [en(r.a)].concat(M.cols.map(function (u) { return r.cells[u] || 0; }), [r.d, r.s, r.c, r.n]); });
  rows.push([t('grand')].concat(M.cols.map(function (u) { return M.colT[u].n; }), [sum(M.cols, function (u) { return M.colT[u].d; }), sum(M.cols, function (u) { return M.colT[u].s; }), sum(M.cols, function (u) { return M.colT[u].c; }), sum(M.cols, function (u) { return M.colT[u].n; })]));
  downloadCSV('employee_activity_' + S.f.from + '_' + S.f.to, head, rows, false);
}

/* ---------- Tab 7: pending actions ---------- */
var PCAT = 'p_draft', PSELE = '';
function psrc(cat) {
  var R = function (ids) { return ids.map(function (i) { return REGBY[i]; }).filter(Boolean); }, P = function (id) { return PX.filter(function (x) { return x.id === id; })[0]; };
  var out = [];
  var add = function (e, fn) { out.push({ e: e, x: fn }); };
  if (cat === 'p_draft') { REG.forEach(function (e) { add(e, function () { return bucketFilters(e, 'draft'); }); }); }
  else if (cat === 'p_appr') { REG.forEach(function (e) { add(e, function () { return bucketFilters(e, 'pend'); }); }); }
  else if (cat === 'p_subm') { REG.forEach(function (e) { add(e, function () { return has(e.dt, 'workflow_state') && isSub(e.dt) ? [[e.dt, 'docstatus', '=', 0], [e.dt, 'workflow_state', '=', 'Approved']] : [[e.dt, 'name', '=', NONE]]; }); }); }
  else if (cat === 'p_agr') { R(['cagr', 'sagr', 'eagr', 'sca', 'qiwa']).forEach(function (e) { add(e, function () { return [[e.dt, 'docstatus', '=', 0]]; }); }); add(REGBY.docrec, function () { return [['Document Record', 'status', '=', 'Draft'], ['Document Record', 'docstatus', '<', 2]]; }); }
  else if (cat === 'p_sign') { R(['cagr', 'sagr', 'eagr']).forEach(function (e) { add(e, function () { return [[e.dt, 'is_signed', '=', 0], [e.dt, 'docstatus', '<', 2]]; }); }); add(REGBY.memo, function () { return [['DM Official Memo', 'docstatus', '=', 1], ['DM Official Memo', 'attch_signed', 'is', 'not set']]; }); }
  else if (cat === 'p_bal') { R(['cbc', 'sbc']).forEach(function (e) { add(e, function () { return bucketFilters(e, 'draft'); }); }); }
  else if (cat === 'p_other') { PX.forEach(function (e) { add(e, function () { return bucketFilters(e, 'pend'); }); }); }
  return out.filter(function (s) { return s.e; });
}
var PCATS = ['p_draft', 'p_appr', 'p_subm', 'p_agr', 'p_sign', 'p_bal', 'p_other'];
function pcounts(cat) {
  var key = cat + '|' + sigNow();
  if (D.pc && D.pc[key]) { return D.pc[key]; }
  D.pc = D.pc || {};
  var srcs = psrc(cat).filter(function (s) { if (S.f.dtype && s.e.g !== 'other' && S.f.dtype !== s.e.id) { return false; } return true; });
  D.pc[key] = Promise.all(srcs.map(function (s) {
    s.e.needPS = 1;
    return prep(s.e).then(function () { return ensurePS(s.e); }).then(function () {
      var c = compat(Object.assign({}, s.e)); var saved = S.f.dstatus; S.f.dstatus = '';
      var cm = compat(s.e); S.f.dstatus = saved;
      if (cm && cm !== 'status') { return { e: s.e, n: 0, skip: cm }; }
      var f = F(s.e, { noDate: true, noStatus: true }).concat(s.x());
      return gcount(s.e.dt, f).then(function (n) { return { e: s.e, f: f, n: n || 0 }; }).catch(function () { return { e: s.e, n: 0, bad: 1 }; });
    });
  })).then(function (r) { D.pcr = D.pcr || {}; D.pcr[key] = r; sched(); return r; });
  return D.pc[key];
}
function pcRes(cat) { var key = cat + '|' + sigNow(); return D.pcr && D.pcr[key]; }
function enrichPending(rows) {
  var by = {}; rows.forEach(function (r) { (by[r.dt] = by[r.dt] || []).push(r.id); });
  var td = todayStr();
  rows.forEach(function (r) { r.days = r.created ? dayDiff(r.created, td) : null; r.assigned = ''; });
  return Promise.all(Object.keys(by).map(function (dt) {
    return glist('ToDo', { fields: ['reference_name', 'allocated_to'], filters: [['ToDo', 'reference_type', '=', dt], ['ToDo', 'reference_name', 'in', by[dt]], ['ToDo', 'status', '=', 'Open']], limit: 500 }).then(function (r) {
      var m = {}; (r || []).forEach(function (x) { m[x.reference_name] = (m[x.reference_name] ? m[x.reference_name] + ', ' : '') + ownerName(x.allocated_to); });
      rows.forEach(function (x) { if (x.dt === dt && m[x.id]) { x.assigned = m[x.id]; } });
    }).catch(function () { });
  })).then(function () { return rows; });
}
function pendCols() {
  var base = recCols();
  var pick = function (k) { return Object.assign({}, base.filter(function (c) { return c.k === k; })[0]); };
  return [pick('id'), pick('type'),
    { k: 'dept', h: 'department', r: function (x) { return esc(deptShort(x.dept)); }, c: function (x) { return x.dept; }, sk: function (x) { return x.dept; } },
    { k: 'assigned', h: 'assigned', r: function (x) { return esc(x.assigned || x.by) + (x.assigned ? '' : ' <span style="color:#94a3b8" title="Owner (no open ToDo assignment)">*</span>'); }, c: function (x) { return x.assigned || x.by; } },
    { k: 'created', h: 'created', sf: 'creation', r: function (x) { return esc(x.created); }, c: function (x) { return x.created; }, sk: function (x) { return x.created; } },
    { k: 'days', h: 'dayspend', num: 1, r: function (x) { return x.days == null ? '–' : fmt(x.days); }, c: function (x) { return x.days; }, sk: function (x) { return x.days; } },
    pick('status'), pick('act')];
}
function tabPending() {
  var h = '<div class="dm-note info">' + en({ en: 'Pending items ignore the date range. Assigned Employee = open ToDo assignee, otherwise the document owner (*). Pending Submissions = draft documents whose workflow state is "Approved". Pending Signatures = unsigned Contracts and submitted Memos without a signed copy attached. Approval/signature status is shown only where ERPNext stores it.', ar: 'العناصر المعلقة تتجاهل نطاق التاريخ. الموظف المكلّف = المكلّف في ToDo المفتوح وإلا مالك المستند (*). الإرسال المعلق = مسودات حالة سير عملها "Approved". التوقيعات المعلقة = عقود غير موقعة ومذكرات معتمدة بدون نسخة موقعة. تُعرض حالات الموافقة/التوقيع فقط عند وجودها في ERPNext.' }) + '</div>';
  var cards = '';
  PCATS.forEach(function (c) {
    pcounts(c); var r = pcRes(c), n = r ? sum(r, function (x) { return x.n; }) : null;
    cards += '<button class="dm-kpi ' + (c === PCAT ? 'warn' : 'grey') + '" data-act="pcat" data-c="' + c + '"><div class="l">' + t(c) + '</div><div class="v">' + (n == null ? '<span class="dm-sp"></span>' : fmt(n)) + '</div></button>';
  });
  h += '<div class="dm-kpis">' + cards + '</div>';
  var r = pcRes(PCAT);
  if (!r) { return h + loadingBlock(); }
  var list = r.filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });
  var skipped = r.filter(function (x) { return x.skip; });
  if (skipped.length) { h += '<div class="dm-note">' + t('excl') + ': ' + esc(skipped.map(function (x) { return en(x.e); }).join(', ')) + '</div>'; }
  if (!list.length) { return h + '<div class="dm-empty">' + t('empty') + '</div>'; }
  if (!PSELE || !list.some(function (x) { return x.e.id === PSELE; })) { PSELE = list[0].e.id; }
  h += '<div class="dm-card"><h3>' + t(PCAT) + '</h3><div class="dm-chips">' + list.map(function (x) { return '<button class="dm-chip' + (x.e.id === PSELE ? ' on' : '') + '" data-act="psel" data-e="' + x.e.id + '">' + esc(en(x.e)) + '<b>' + fmt(x.n) + '</b></button>'; }).join('') + '</div><div data-tbx="tbl_pend"></div></div>';
  var sel = list.filter(function (x) { return x.e.id === PSELE; })[0], sg = PCAT + PSELE + sigNow();
  if (!TB.tbl_pend || TB.tbl_pend.sig !== sg) {
    mkTable('tbl_pend', { mode: 'server', cols: pendCols(), name: 'pending_' + PCAT + '_' + PSELE, sort: { k: 'created', d: 'asc', sf: 'creation' },
      loader: function (t0) { return fetchRecs(sel.e, sel.f, { start: (t0.page - 1) * t0.size, limit: t0.size, sortField: t0.sort.sf || 'creation', dir: t0.sort.d, q: t0.q }).then(function (res) { return enrichPending(res.rows).then(function () { return res; }); }); },
      exportAll: function () { return exportAllRecs(sel.e, sel.f).then(function (res) { return enrichPending(res.rows).then(function () { return res; }); }); } });
    TB.tbl_pend.sig = sg;
  }
  return h;
}

/* ---------- Tab 8: detailed reports ---------- */
var RP = { sel: 'r_type', res: null, loading: false, tok: 0 };
var REPS = ['r_dept', 'r_emp', 'r_type', 'r_ds', 'r_pend', 'r_exp', 'r_month', 'r_comp'];
function repCols(headers) {
  return headers.map(function (hd, i) {
    return { k: 'c' + i, h: hd, hl: function () { return hd; }, num: i > 0 && hd.num !== false && !hd.txt,
      r: function (x) { var c = x[i]; if (c && typeof c === 'object') { return c.d != null ? '<a data-act="drill" data-d="' + c.d + '">' + fmt(c.t) + '</a>' : esc(c.t); } return typeof c === 'number' ? fmt(c) : esc(c); },
      c: function (x) { var c = x[i]; return c && typeof c === 'object' ? c.t : c; }, sk: function (x) { var c = x[i]; return c && typeof c === 'object' ? c.t : c; } };
  });
}
function allStats(es) { return Promise.all(es.map(function (e) { return stats(e).then(function (r) { D.sr[e.id] = r; return r; }); })); }
var REPGEN = {
  r_type: function () { var es = entries(null); return allStats(es).then(function (rs) {
    return { headers: [t('type'), t('total'), t('draft'), t('submitted'), t('cancelled'), t('pendapp'), t('hold')], rows: rs.map(function (r) { var e = r.e, c = function (v, b) { return { t: v, d: dk({ title: en(e), es: [e], bucket: b }) }; }; return [en(e), c(r.total, ''), c(r.draft, 'draft'), c(r.sub, 'sub'), c(r.canc, 'canc'), c(r.pend, 'pend'), c(r.hold, 'hold')]; }), es: es }; }); },
  r_ds: function () { var es = entries(null).filter(function (e) { return isSub(e.dt); }); return allStats(es).then(function (rs) {
    return { headers: [t('type'), t('draft'), t('submitted'), t('cancelled'), t('ratio')], rows: rs.map(function (r) { var e = r.e, c = function (v, b) { return { t: v, d: dk({ title: en(e), es: [e], bucket: b }) }; }; var den = r.draft + r.sub; return [en(e), c(r.draft, 'draft'), c(r.sub, 'sub'), c(r.canc, 'canc'), den ? Math.round(r.sub / den * 1000) / 10 : 0]; }), es: es }; }); },
  r_pend: function () { var es = entries(null); return Promise.all(es.map(function (e) { e.needPS = 1; return prep(e).then(function () { return ensurePS(e); }); })).then(function () { return allStats(es); }).then(function (rs) {
    return { headers: [t('type'), t('draft'), t('pendapp'), t('hold')], rows: rs.map(function (r) { var e = r.e, c = function (v, b) { return { t: v, d: dk({ title: en(e) + ' – ' + t('rep'), es: [e], bucket: b }) }; }; return [en(e), c(r.draft, 'draft'), c(r.pend, 'pend'), c(r.hold, 'hold')]; }), es: es }; }); },
  r_dept: function () { var es = entries(null); return Promise.all(es.map(function (e) { return ownerFor(e).then(function (r) { D.orr[e.id] = r; }); })).then(function () {
    var m = {}; es.forEach(function (e) { (D.orr[e.id] || []).forEach(function (x) { var d = ownerDept(x.owner) || '', o = m[d] || (m[d] = { n: 0, d: 0, s: 0, c: 0 }); o.n += x.c; if (x.docstatus === 0) { o.d += x.c; } else if (x.docstatus === 1) { o.s += x.c; } else { o.c += x.c; } }); });
    return { headers: [t('department'), t('total'), t('draft'), t('submitted'), t('cancelled')], rows: Object.keys(m).sort(function (a, b) { return m[b].n - m[a].n; }).map(function (d) { var o = m[d], us = d ? deptUsers(d) : null; var cc = function (v) { return d && us.length ? { t: v, d: dk({ title: deptShort(d), es: es, extra: function (e) { return [[e.dt, 'owner', 'in', us]]; } }) } : v; }; return [d ? deptShort(d) : t('unassigned'), cc(o.n), o.d, o.s, o.c]; }), es: es }; }); },
  r_emp: function () { var es = entries(null, ACT); return Promise.all(es.map(function (e) { return ownerFor(e).then(function (r) { D.orr[e.id] = r; }); })).then(function () {
    var m = {}; es.forEach(function (e) { (D.orr[e.id] || []).forEach(function (x) { var em = EMPBYUSER[x.owner]; if (!em || em.status !== 'Active') { return; } var o = m[x.owner] || (m[x.owner] = { n: 0, d: 0, s: 0, c: 0 }); o.n += x.c; if (x.docstatus === 0) { o.d += x.c; } else if (x.docstatus === 1) { o.s += x.c; } else { o.c += x.c; } }); });
    return { headers: [t('employee'), t('department'), t('jobloc'), t('draft'), t('submitted'), t('cancelled'), t('total')], rows: Object.keys(m).sort(function (a, b) { return m[b].n - m[a].n; }).map(function (u) { var o = m[u], em = EMPBYUSER[u]; return [ownerName(u), deptShort(em.department), em.custom_job_location || '', o.d, o.s, o.c, { t: o.n, d: dk({ title: ownerName(u), es: es, extra: function (e) { return [[e.dt, 'owner', '=', u]]; } }) }]; }), es: es, txtCols: [1, 2] }; }); },
  r_comp: function () { var es = entries(null).filter(function (e) { return has(e.dt, 'company'); }); return Promise.all(es.map(function (e) { return prep(e).then(function () { return glist(e.dt, { fields: ['company', 'docstatus', 'count(name) as c'], filters: F(e), group_by: 'company, docstatus', limit: 500 }); }).then(function (r) { return { e: e, r: r || [] }; }).catch(function () { return { e: e, r: [] }; }); })).then(function (rs) {
    var m = {}; rs.forEach(function (x) { x.r.forEach(function (y) { var k = y.company || '', o = m[k] || (m[k] = { sales: 0, proc: 0, int: 0, n: 0, es: {} }); o[x.e.g] += y.c; o.n += y.c; o.es[x.e.id] = x.e; }); });
    return { headers: [t('company'), t('k_sales'), t('k_proc'), t('k_internal'), t('total')], rows: Object.keys(m).sort(function (a, b) { return m[b].n - m[a].n; }).map(function (k) { var o = m[k], es2 = Object.keys(o.es).map(function (i) { return o.es[i]; }); return [k || t('unassigned'), o.sales, o.proc, o.int, { t: o.n, d: dk({ title: k, es: es2, extra: function (e) { return k ? [[e.dt, 'company', '=', k]] : []; } }) }]; }), es: es, txtCols: [] }; }); },
  r_month: function () { var es = entries(null); return Promise.all(es.map(trendFor)).then(function (rs) {
    var labels = null; rs.forEach(function (r) { if (r && !labels) { labels = r.labels; } }); if (!labels) { return { headers: [t('type')], rows: [], es: es }; }
    return { headers: [t('type')].concat(labels, [t('total')]), rows: es.map(function (e, i) { var r = rs[i]; var v = r ? r.v : labels.map(function () { return 0; }); return [en(e)].concat(v, [sum(v, function (x) { return x; })]); }), es: es }; }); },
  r_exp: function () { return ensureExp().then(function (rows) { return { expiry: rows }; }); }
};
function runReport() {
  RP.loading = true; RP.res = null; var tok = ++RP.tok; renderBody();
  var sel = RP.sel;
  REPGEN[sel]().then(function (res) { if (tok !== RP.tok) { return; } RP.res = res; RP.loading = false; RP.at = sel; renderBody(); }).catch(function () { if (tok !== RP.tok) { return; } RP.loading = false; RP.res = { err: 1 }; renderBody(); });
}
function tabReports() {
  var h = '<div class="dm-fl" style="margin:0 0 12px"><div><label>' + t('rep') + '</label><select data-ctl="repsel">' + REPS.map(function (r) { return '<option value="' + r + '"' + (RP.sel === r ? ' selected' : '') + '>' + t(r) + '</option>'; }).join('') + '</select></div><div><button class="dm-btn pri" data-act="repgo">' + t('generate') + '</button></div></div>';
  h += '<div class="dm-note info">' + t('foot') + '</div>';
  if (RP.loading) { return h + loadingBlock(); }
  if (!RP.res) { return h + '<div class="dm-empty">' + t('generate') + ' →</div>'; }
  if (RP.res.err) { return h + '<div class="dm-note err">' + t('err') + '</div>'; }
  var res = RP.res, sg = RP.at + sigNow() + S.lang;
  h += '<div class="dm-card"><h3>' + t(RP.at) + '</h3><div data-tbx="tbl_rep"></div></div>';
  if (!TB.tbl_rep || TB.tbl_rep.sig !== sg) {
    var cols, rows;
    if (res.expiry) { cols = expCols(); rows = res.expiry; } else { cols = repCols(res.headers); rows = res.rows; }
    mkTable('tbl_rep', { mode: 'client', cols: cols, name: RP.at, size: 25, sort: res.expiry ? { k: 'days', d: 'asc' } : { k: '', d: 'asc' } }); TB.tbl_rep.all = rows; TB.tbl_rep.dirty = false; TB.tbl_rep.sig = sg;
    if (res.es) { var bad = res.es.filter(function (e) { return D.sr[e.id] && !D.sr[e.id].ok; }); if (bad.length) { TB.tbl_rep.partial = true; } }
  }
  return h;
}


/* ---------- Manual Checks tab (physical copy tracking) - reads the Manual Checks fields already added on each DocType; read-only ---------- */
var MCDEPT = [
 { id: 'sales', en: 'Sales', ar: 'المبيعات', dts: ['Sales Order', 'Sales Invoice', 'Quotation', 'Delivery Note', 'Customer Balance Confirmation'] },
 { id: 'proc', en: 'Procurement', ar: 'المشتريات', dts: ['Purchase Order', 'Purchase Invoice', 'Purchase Receipt'] },
 { id: 'acc', en: 'Accounts', ar: 'الحسابات', dts:[ 'Payment Entry', 'Journal Entry', 'Expense Claim'] },
 { id: 'hr', en: 'HR', ar: 'الموارد البشرية', dts: ['Leave Application'] },
 { id: 'adm', en: 'Admin & Legal', ar: 'الإدارة والشؤون القانونية', dts: ['DM Official Memo', 'DM Letters'] }
];
var MC = { dept: 'sales', dt: '', filt: '' };
var MCD = {}, MCE = {};
/* find the "Manual Checks" section on a DocType from its real field list (nothing is assumed about field names) */
function mcDiscover(dt) {
  if (MCD[dt]) { return MCD[dt].p; }
  var o = MCD[dt] = { none: true, done: false, fields: [], user: '', remarks: '', why: '' };
  o.p = loadMeta(dt).then(function () {
    if (!META[dt] || !META[dt].ok) { o.why = 'unavail'; return o; }
    var fl = []; try { fl = frappe.get_meta(dt).fields || []; } catch (e) { }
    var on = false, found = [], user = '', rem = '';
    fl.forEach(function (x) {
      if (x.fieldtype === 'Section Break' || x.fieldtype === 'Tab Break') { on = /manual\s*check/i.test(x.label || ''); return; }
      if (!on || x.hidden) { return; }
      if ((x.fieldtype === 'Select' && /yes/i.test(x.options || '')) || x.fieldtype === 'Check') { found.push({ f: x.fieldname, l: x.label || x.fieldname, type: x.fieldtype }); }
      else if ((x.fieldtype === 'Link' || x.fieldtype === 'Data') && /user/i.test((x.label || '') + ' ' + x.fieldname)) { if (!user) { user = x.fieldname; } }
      else if (/Text/.test(x.fieldtype) && !rem) { rem = x.fieldname; }
    });
    if (!found.length) {
      fl.forEach(function (x) { if (!x.hidden && (x.fieldtype === 'Select' || x.fieldtype === 'Check') && /^(org gd note|printed|submitted to|received from|scanning|filing)/i.test(x.label || '')) { found.push({ f: x.fieldname, l: x.label || x.fieldname, type: x.fieldtype }); } });
    }
    if (found.length) { o.none = false; o.fields = found; o.user = user; o.remarks = rem; } else { o.why = 'nosection'; }
    return o;
  }).catch(function () { o.why = 'err'; return o; }).then(function (r) { o.done = true; sched(); return r; });
  return o.p;
}
function mcEntry(dt) {
  if (MCE[dt]) { return MCE[dt]; }
  var o = MCD[dt], id = 'm_' + dt.replace(/[^A-Za-z0-9]/g, '_');
  var df = ['posting_date', 'transaction_date', 'date', 'memo_date'].filter(function (f) { return has(dt, f); })[0] || 'creation';
  var party = ['customer_name', 'supplier_name', 'party_name', 'party_full_name', 'employee_name', 'customer', 'supplier'].filter(function (f) { return has(dt, f); }).slice(0, 1);
  var xf = o.fields.map(function (x) { return x.f; }).concat(o.user ? [o.user] : [], o.remarks ? [o.remarks] : []);
  MCE[dt] = { id: id, dt: dt, g: 'mc', date: df, party: party, en: dt, ar: dt, xf: xf };
  return MCE[dt];
}
function mcBase(e) { var f = F(e, { noStatus: true }); if (isSub(e.dt)) { f.push([e.dt, 'docstatus', '=', 1]); } return f; }
function mcVal(v, fd) {
  if (fd.type === 'Check') { return (v === 1 || v === '1' || v === true) ? 'Yes' : ((v === 0 || v === '0' || v === false) ? 'No' : ''); }
  return v || '';
}
function ensureMc(e) {
  D.mc = D.mc || {}; D.mcp = D.mcp || {};
  if (D.mc[e.id] || D.mcp[e.id]) { return; }
  D.mcp[e.id] = 1;
  var o = MCD[e.dt], base = mcBase(e);
  Promise.all([gcount(e.dt, base)].concat(o.fields.map(function (fd) {
    return glist(e.dt, { fields: [fd.f, 'count(name) as c'], filters: base, group_by: fd.f, limit: 50 }).catch(function () { return null; });
  }))).then(function (rs) {
    var r = { total: rs[0] || 0, f: {} };
    o.fields.forEach(function (fd, i) {
      var rows = rs[i + 1]; if (!rows) { r.f[fd.f] = null; return; }
      var y = 0, n = 0, b = 0;
      rows.forEach(function (x) { var v = mcVal(x[fd.f], fd), c = x.c || 0; if (v === 'Yes') { y += c; } else if (v === 'No') { n += c; } else { b += c; } });
      r.f[fd.f] = { y: y, n: n, b: b };
    });
    D.mc[e.id] = r; sched();
  }).catch(function () { D.mc[e.id] = { total: 0, f: {}, err: 1 }; sched(); });
}
function mcDrill(e, fd, mode, title) {
  var yes = fd && fd.type === 'Check' ? 1 : 'Yes';
  return dk({ title: title, es: [e], bucket: isSub(e.dt) ? 'sub' : '', fopts: { noStatus: true },
    extra: function () { return !fd || mode === 'all' ? [] : [[e.dt, fd.f, mode === 'yes' ? '=' : '!=', yes]]; } });
}
function mcCols(e, o) {
  var base = recCols(), pick = function (k) { return Object.assign({}, base.filter(function (c) { return c.k === k; })[0]); };
  var cols = [pick('id')];
  if ((e.party || []).length) { var p = pick('party'); p.hl = function () { return t('party'); }; cols.push(p); }
  cols.push(pick('date'));
  o.fields.forEach(function (fd) {
    cols.push({ k: 'f_' + fd.f, hl: function () { return fd.l; }, sf: fd.f,
      r: function (x) { var v = mcVal(x.raw[fd.f], fd); return '<span class="dm-tag ' + (v === 'Yes' ? 'valid' : v === 'No' ? 'pend' : 'na') + '">' + esc(v ? ts(v) : t('mc_norec')) + '</span>'; },
      c: function (x) { return mcVal(x.raw[fd.f], fd); } });
  });
  if (o.user) { cols.push({ k: 'mcuser', hl: function () { return t('mc_resp'); }, sf: o.user, r: function (x) { return esc(x.raw[o.user] ? ownerName(x.raw[o.user]) : ''); }, c: function (x) { return x.raw[o.user] || ''; } }); }
  cols.push({ k: 'act', hl: function () { return t('mc_upd'); }, r: function (x) { return '<a href="' + docUrl(x.dt, x.id) + '" data-act="open" data-dt="' + esc(x.dt) + '" data-name="' + esc(x.id) + '">' + t('mc_upd') + '</a>'; }, c: null });
  return cols;
}
function tabManual() {
  var h = '<div class="dm-note info">' + t('mc_note') + '</div>';
  h += '<div class="dm-chips">' + MCDEPT.map(function (d) { return '<button class="dm-chip' + (MC.dept === d.id ? ' on' : '') + '" data-act="mcdept" data-d="' + d.id + '">' + esc(en(d)) + '</button>'; }).join('') + '</div>';
  var dep = MCDEPT.filter(function (d) { return d.id === MC.dept; })[0] || MCDEPT[0];
  dep.dts.forEach(mcDiscover);
  if (!dep.dts.every(function (dt) { return MCD[dt] && MCD[dt].done; })) { return h + loadingBlock(); }
  var have = dep.dts.filter(function (dt) { return !MCD[dt].none; }), miss = dep.dts.filter(function (dt) { return MCD[dt].none; });
  if (miss.length) { h += '<div class="dm-note">' + t('mc_miss') + ': ' + esc(miss.join(', ')) + '</div>'; }
  if (!have.length) { return h + '<div class="dm-empty">' + t('empty') + '</div>'; }
  if (have.indexOf(MC.dt) < 0) { MC.dt = have[0]; MC.filt = ''; }
  var ents = have.map(mcEntry); ents.forEach(ensureMc);
  h += '<div class="dm-chips">' + have.map(function (dt) { var r = D.mc && D.mc[mcEntry(dt).id]; return '<button class="dm-chip' + (MC.dt === dt ? ' on' : '') + '" data-act="mcdt" data-t="' + esc(dt) + '">' + esc(dt) + '<b>' + (r ? fmt(r.total) : '…') + '</b></button>'; }).join('') + '</div>';
  var e = mcEntry(MC.dt), o = MCD[MC.dt], r = D.mc && D.mc[e.id];
  if (!r) { return h + loadingBlock(); }
  if (r.err) { h += '<div class="dm-note err">' + t('err') + '</div>'; }
  h += '<div class="dm-kpis">' + kpi(t('mc_total'), r.total, '', mcDrill(e, null, 'all', MC.dt));
  o.fields.forEach(function (fd) {
    var c = r.f[fd.f];
    h += c ? kpi(fd.l, c.y, (c.n + c.b === 0) ? 'ok' : 'warn', mcDrill(e, fd, 'yes', fd.l + ' – ' + ts('Yes')), ts('No') + ': ' + fmt(c.n) + ' · ' + t('mc_norec') + ': ' + fmt(c.b)) : kpi(fd.l, null, 'grey', null, t('partial'));
  });
  h += '</div>';
  h += '<div class="dm-card"><div class="dm-chips"><button class="dm-chip' + (MC.filt === '' ? ' on' : '') + '" data-act="mcf" data-f="">' + t('all') + '</button>' +
    o.fields.map(function (fd) { return '<button class="dm-chip' + (MC.filt === fd.f ? ' on' : '') + '" data-act="mcf" data-f="' + esc(fd.f) + '">' + t('mc_notyes') + ': ' + esc(fd.l) + '</button>'; }).join('') + '</div><div data-tbx="tbl_mc"></div></div>';
  var sg = MC.dt + '|' + MC.filt + '|' + sigNow(), tb = TB.tbl_mc;
  if (!tb || tb.sig !== sg) {
    var flt = function () { var f = mcBase(e); if (MC.filt) { var fd = o.fields.filter(function (x) { return x.f === MC.filt; })[0]; f.push([e.dt, MC.filt, '!=', fd && fd.type === 'Check' ? 1 : 'Yes']); } return f; };
    mkTable('tbl_mc', { mode: 'server', cols: mcCols(e, o), name: 'manual_checks_' + MC.dt, sort: { k: 'modified', d: 'desc' },
      loader: function (t0) { return fetchRecs(e, flt(), { start: (t0.page - 1) * t0.size, limit: t0.size, sortField: t0.sort.sf, dir: t0.sort.d, q: t0.q }); },
      exportAll: function () { return exportAllRecs(e, flt()); } });
    TB.tbl_mc.sig = sg;
  }
  return h;
}

/* ---------- shell / filters / events ---------- */
var TABS = ['overview', 'sales', 'proc', 'internal', 'activity', 'expiry', 'pending', 'manual', 'reports'];
var TABFN = { overview: tabOverview, sales: function () { return tabGroup('sales'); }, proc: function () { return tabGroup('proc'); }, internal: tabInternal, activity: tabActivity, expiry: tabExpiry, pending: tabPending, manual: tabManual, reports: tabReports };
var TABKEY = { overview: 't_overview', sales: 't_sales', proc: 't_proc', internal: 't_internal', activity: 't_activity', expiry: 't_expiry', pending: 't_pending', manual: 't_manual', reports: 't_reports' };
function opt(v, l, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(l) + '</option>'; }
function drawFilters() {
  var f = S.f, el = $('#dm-fl'); if (!el) { return; }
  function sel(key, label, opts) { return '<div><label>' + t(label) + '</label><select data-f="' + key + '">' + opt('', t('all'), !f[key]) + opts.map(function (o) { return opt(o[0], o[1], f[key] === o[0]); }).join('') + '</select></div>'; }
  var emps = EMPS.filter(function (e) { return e.status === 'Active' && e.user_id; }).sort(function (a, b) { return empName(a) > empName(b) ? 1 : -1; });
  el.innerHTML = sel('company', 'company', OPT.company.map(function (x) { return [x, x]; })) + sel('division', 'division', OPT.division.map(function (x) { return [x, x]; })) + sel('location', 'location', OPT.location.map(function (x) { return [x, x]; })) +
    sel('department', 'department', OPT.department.map(function (x) { return [x, deptShort(x)]; })) + sel('employee', 'employee', emps.map(function (x) { return [x.name, empName(x)]; })) +
    '<div><label>' + t('from') + '</label><input type="date" data-f="from" value="' + esc(f.from) + '"></div><div><label>' + t('to') + '</label><input type="date" data-f="to" value="' + esc(f.to) + '"></div>' +
    sel('dtype', 'dtype', REG.map(function (e) { return [e.id, en(e)]; })) + sel('dstatus', 'dstatus', [['draft', t('draft')], ['sub', t('submitted')], ['canc', t('cancelled')], ['pend', t('pendapp')]]) +
    '<div><button class="dm-btn" data-act="reset" style="width:100%">' + t('reset') + '</button></div>';
}
function drawTabs() { var el = $('#dm-tabs'); if (!el) { return; } el.innerHTML = TABS.map(function (k) { return '<button class="dm-tab' + (S.tab === k ? ' on' : '') + '" data-act="tab" data-k="' + k + '">' + t(TABKEY[k]) + '</button>'; }).join(''); }
function shell() {
  host.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr');
  host.innerHTML = '<div class="dm-hd"><div class="dm-brand"><div class="dm-logo">DM </div><div><h1>' + esc(t('title')) + '</h1><p>' + esc(t('sub')) + '</p></div></div><div class="dm-hr"><span class="dm-ts" id="dm-ts"></span><button class="dm-btn" data-act="refresh">⟳ ' + t('refresh') + '</button><button class="dm-btn" data-act="lang">' + (S.lang === 'ar' ? 'English' : 'العربية') + '</button></div></div>' +
    '<div class="dm-fl" id="dm-fl"></div><div class="dm-tabs" id="dm-tabs"></div><div class="dm-body" id="dm-body"></div><div class="dm-foot">' + esc(t('foot')) + '</div><div id="dm-modal"></div>';
  drawFilters(); drawTabs(); updateTs();
}
function updateTs() { var el = $('#dm-ts'); if (el && S.ts) { el.textContent = t('updated') + ': ' + S.ts.toLocaleString('en-GB'); } }
function renderBody() {
  var b = $('#dm-body'); if (!b) { return; }
  if (!S.ready) { b.innerHTML = loadingBlock(); return; }
  var sc = b.scrollLeft; DK = [];
  var h; try { h = TABFN[S.tab](); } catch (e) { h = '<div class="dm-note err">' + esc(t('err')) + ': ' + esc(e && e.message) + '</div>'; if (window.console) { console.error('DM Document Control', e); } }
  b.innerHTML = h;
  $$('[data-tbx]', b).forEach(function (box) { var id = box.getAttribute('data-tbx'); if (TB[id]) { box.innerHTML = tableShell(id); drawTable(id); } });
}
function resetData(full) {
  S.epoch++; CACHE = {}; var keep = full ? {} : D.ps, ph = {};
  if (!full) { Object.keys(D).forEach(function (k) { if (k.indexOf('ph_') === 0) { ph[k] = D[k]; } }); }
  D = { stats: {}, today: {}, own: {}, trend: {}, exp: null, expP: null, ps: keep, errs: {}, bad: {}, sr: {}, sp: {}, orr: {}, orp: {}, tr: {}, trp: {}, td: {}, tdp: {}, pc: {}, pcr: {}, int: null, intP: null, mx: null };
  Object.keys(ph).forEach(function (k) { D[k] = ph[k]; });
  TB = {}; RP.res = null; closeModal();
}
function onFilters() { resetData(false); renderBody(); }
function goExpiry(chip) { S.tab = 'expiry'; EXPCHIP = chip || ''; delete TB.tbl_exp; drawTabs(); renderBody(); }
function csvOfTable(id, all) {
  var tb = TB[id]; if (!tb) { return; }
  if (tb.mode === 'server') { tableToCsv(tb, tb.rows, tb.total > tb.rows.length); } else { tableToCsv(tb, viewRows(tb), !!tb.partial); }
}
host.addEventListener('click', function (ev) {
  var el = ev.target.closest ? ev.target.closest('[data-act]') : null; if (!el || !host.contains(el)) { return; }
  var act = el.getAttribute('data-act');
  if (act === 'mbg' && ev.target !== el) { return; }
  if (act === 'open') { ev.preventDefault(); openForm(el.getAttribute('data-dt'), el.getAttribute('data-name')); return; }
  ev.preventDefault();
  if (act === 'tab') { S.tab = el.getAttribute('data-k'); drawTabs(); renderBody(); }
  else if (act === 'lang') { S.lang = S.lang === 'ar' ? 'en' : 'ar'; window.__dmdcLang = S.lang; delete TB.tbl_rep; var m = DR; shell(); renderBody(); if (m) { paintModal(); if (DR && DR.items && DR.items.length) { setupDrillTable(); } } }
  else if (act === 'refresh') { S.ts = new Date(); resetData(true); updateTs(); renderBody(); }
  else if (act === 'reset') { S.f = { company: '', division: '', location: '', department: '', employee: '', from: addDays(todayStr(), -30), to: todayStr(), dtype: '', dstatus: '' }; S.ejl = ''; ACTSEL = ''; drawFilters(); onFilters(); }
  else if (act === 'drill') {
    var d = DK[+el.getAttribute('data-d')]; if (!d) { return; }
    if (d.go === 'expiry') { goExpiry(d.chip); }
    else if (d.go === 'activity') { S.f.employee = d.emp; S.tab = 'activity'; drawFilters(); drawTabs(); onFilters(); }
    else { openDrill(d); }
  }
  else if (act === 'mclose' || act === 'mbg') { closeModal(); }
  else if (act === 'msel') { DR.sel = +el.getAttribute('data-i'); paintModal(); setupDrillTable(); }
  else if (act === 'mlist') { var it = DR.items[DR.sel]; openList(it.e.dt, it.f); }
  else if (act === 'tsort') {
    var tb = TB[el.getAttribute('data-t')], k = el.getAttribute('data-k'), col = tb.cols.filter(function (c) { return c.k === k; })[0];
    tb.sort = { k: k, d: (tb.sort.k === k && tb.sort.d === 'asc') ? 'desc' : 'asc', sf: col.sf }; tb.page = 1; if (tb.mode === 'server') { tb.dirty = true; } drawTable(tb.id);
  }
  else if (act === 'tpg') { var tb2 = TB[el.getAttribute('data-t')]; tb2.page += +el.getAttribute('data-d'); if (tb2.mode === 'server') { tb2.dirty = true; } drawTable(tb2.id); }
  else if (act === 'tcsv') { csvOfTable(el.getAttribute('data-t')); }
  else if (act === 'tcsvall') { var tb3 = TB[el.getAttribute('data-t')]; toast(t('loading')); tb3.exportAll().then(function (res) { tableToCsv(tb3, res.rows, res.partial); }).catch(function () { toast(t('err'), 1); }); }
  else if (act === 'tprint') { tablePrint(TB[el.getAttribute('data-t')]); }
  else if (act === 'gsel') { var g = el.getAttribute('data-g'); SEL[g] = el.getAttribute('data-e'); delete TB['tbl_' + g]; renderBody(); }
  else if (act === 'echip') { EXPCHIP = el.getAttribute('data-c'); delete TB.tbl_exp; renderBody(); }
  else if (act === 'ichip') { INTCHIP = el.getAttribute('data-c'); delete TB.tbl_int; renderBody(); }
  else if (act === 'pcat') { PCAT = el.getAttribute('data-c'); PSELE = ''; delete TB.tbl_pend; renderBody(); }
  else if (act === 'psel') { PSELE = el.getAttribute('data-e'); delete TB.tbl_pend; renderBody(); }
  else if (act === 'mxcsv') { matrixCsv(); }
  else if (act === 'repgo') { delete TB.tbl_rep; runReport(); }
  else if (act === 'mcdept') { MC.dept = el.getAttribute('data-d'); MC.dt = ''; MC.filt = ''; delete TB.tbl_mc; renderBody(); }
  else if (act === 'mcdt') { MC.dt = el.getAttribute('data-t'); MC.filt = ''; delete TB.tbl_mc; renderBody(); }
  else if (act === 'mcf') { MC.filt = el.getAttribute('data-f'); delete TB.tbl_mc; renderBody(); }
});
host.addEventListener('change', function (ev) {
  var el = ev.target, k = el.getAttribute && el.getAttribute('data-f');
  if (k) { S.f[k] = el.value; if (S.f.from && S.f.to && S.f.from > S.f.to) { toast(en({ en: 'From Date is after To Date', ar: 'تاريخ البداية بعد تاريخ النهاية' }), 1); return; } onFilters(); return; }
  var c = el.getAttribute && el.getAttribute('data-ctl');
  if (c === 'ejl') { S.ejl = el.value; renderBody(); } else if (c === 'actsel') { ACTSEL = el.value; renderBody(); } else if (c === 'repsel') { RP.sel = el.value; }
});
var qTimer = null;
host.addEventListener('input', function (ev) {
  var id = ev.target.getAttribute && ev.target.getAttribute('data-tq'); if (!id || !TB[id]) { return; }
  var v = ev.target.value; clearTimeout(qTimer); qTimer = setTimeout(function () { var tb = TB[id]; if (!tb) { return; } tb.q = v; tb.page = 1; if (tb.mode === 'server') { tb.dirty = true; } drawTable(id); }, 350);
});
host.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && DR) { closeModal(); } });

/* ---------- init ---------- */
function loadEmployees() {
  return glist('Employee', { fields: ['name', 'employee_name', 'user_id', 'department', 'custom_job_location', 'company', 'status'], limit: 3000, order_by: 'name asc' }).then(function (r) {
    EMPS = r || []; EMPBYUSER = {};
    EMPS.forEach(function (e) { if (!e.user_id) { return; } var cur = EMPBYUSER[e.user_id]; if (!cur || (cur.status !== 'Active' && e.status === 'Active')) { EMPBYUSER[e.user_id] = e; } });
    OPT.ejl = uniq(EMPS.filter(function (e) { return e.status === 'Active'; }).map(function (e) { return e.custom_job_location; })).sort();
  }).catch(function () { EMPS = []; D.errs.Employee = 'err'; });
}
function names(dt) { return glist(dt, { fields: ['name'], limit: 1000, order_by: 'name asc' }).then(function (r) { return (r || []).map(function (x) { return x.name; }); }).catch(function () { return []; }); }
function loadOptions() {
  return Promise.all([names('Company'), names('Division'), names('Department'),
    glist('Quotation', { fields: ['location', 'count(name) as c'], group_by: 'location', limit: 200 }).catch(function () { return []; }),
    glist('Delivery Note', { fields: ['location', 'count(name) as c'], group_by: 'location', limit: 200 }).catch(function () { return []; })]).then(function (x) {
    OPT.company = x[0]; OPT.division = x[1]; OPT.department = x[2].filter(function (d) { return !/^All Departments/i.test(d); });
    OPT.location = uniq((x[3] || []).concat(x[4] || []).map(function (r) { return r.location; })).sort();
  });
}
function preloadMeta() {
  var list = ALLDT.slice(), n = 0;
  function worker() { var dt = list.shift(); if (!dt) { return Promise.resolve(); } return loadMeta(dt).then(worker); }
  return Promise.all([worker(), worker(), worker(), worker()]);
}
function init() {
  if (typeof frappe === 'undefined' || !frappe.call) { host.innerHTML = '<div class="dm-note err">Frappe client not available.</div>'; return; }
  S.lang = window.__dmdcLang || 'en'; shell(); renderBody();
  Promise.all([loadEmployees(), loadOptions(), preloadMeta()]).then(function () {
    S.ready = true; S.ts = new Date(); drawFilters(); updateTs(); renderBody();
  }).catch(function (e) { host.querySelector('#dm-body').innerHTML = '<div class="dm-note err">' + esc(t('err')) + ': ' + esc(e && (e.message || e)) + '</div>'; });
}
init();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
