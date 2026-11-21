/* ===== DM Group KSA — Admin & HR Platforms Expiry Dashboard — SCRIPT field · v2 =====
   Moves v1 onto the DM dashboard standard. Client-side only and read-only: permission-checked get_list / get_count.
   Kept from v1 unchanged: the four sources (DM Companies Management, DM Facilities Management, Employee, IT Renewals
   Subscription) and the fields read from each, one item per document expiry field, the status buckets (expired, 0–7,
   8–30, 31–60, 61–90, > 90 days, not recorded), the "missing" rule (required slots only), inactive records hidden unless
   asked for, the lease / rent double-count guard, the platform coverage check, every label and the EN/AR dictionary.
   The shared runtime between the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js (edit the kit, not the copy). */
(function () {
  'use strict';
  var T = {
    en: {
      title: 'Admin & HR Platforms Expiry Dashboard', 
      refresh: 'Refresh', refreshing: 'Refreshing…', last: 'Last refreshed', loading: 'Loading data from ERPNext…',
      tab_overview: 'Overview', tab_platforms: 'Government Platforms', tab_companies: 'Company Documents', tab_facilities: 'Facilities & Licences', tab_hr: 'HR & Employee Expiries', tab_alerts: 'Renewal Alerts',
      f_company: 'Company', f_category: 'Category', f_type: 'Document type', f_status: 'Expiry status', f_from: 'Expiry from', f_to: 'Expiry to', f_search: 'Search', f_sortby: 'Sort by', f_dir: 'Order',
      f_responsible: 'Responsible person', f_dept: 'Department', f_branch: 'Branch / location', f_employee: 'Employee', f_platform: 'Platform / document',
      s_expiry: 'Expiry date', s_name: 'Name', asc: 'Ascending', desc: 'Descending', all: 'All', reset: 'Reset filters', inactive: 'Include Inactive / Historical Records', search_ph: 'Search by record name…',
      k_total: 'Total monitored items', k_expired: 'Expired', k_d7: 'Within 7 days', k_d30: 'Within 8–30 days', k_d60: 'Within 31–60 days', k_d90: 'Within 61–90 days', k_valid: 'Valid beyond 90 days', k_missing: 'Missing expiry information',
      st_expired: 'Expired', st_critical: '0–7 days', st_high: '8–30 days', st_upcoming: '31–60 days', st_advance: '61–90 days', st_valid: 'Valid (>90 days)', st_missing: 'Not recorded',
      pr_expired: 'Expired', pr_critical: 'Critical', pr_high: 'High priority', pr_upcoming: 'Upcoming', pr_advance: 'Advance warning', pr_valid: 'Valid', pr_missing: 'Not recorded',
      ch_status: 'Expiry status distribution', ch_month: 'Upcoming expiries by month', ch_category: 'Expiry distribution by category', ch_company: 'Company-wise expiry summary', ch_priority: 'Priority renewal list', ch_types: 'Breakdown by document type',
      later: 'Later', expiredBar: 'Expired', items: 'items', itemsOf: 'items', total: 'Total', undated: 'No date',
      c_entity: 'Entity / Company / Employee', c_doc: 'Document / Platform', c_expiry: 'Expiry date', c_days: 'Days remaining', c_status: 'Status', c_resp: 'Responsible person', c_erp: 'ERP record', c_details: 'Details',
      c_platform: 'Platform name', c_company: 'Company', c_ref: 'Account / registration reference', c_renewal: 'Renewal status', c_remarks: 'Remarks', c_facility: 'Facility', c_employee: 'Employee', c_dept: 'Department', c_branch: 'Branch',
      c_expired_n: 'Expired', c_30: '≤ 30 days', c_90: '31–90 days', c_valid: '> 90 days', c_missing: 'Missing',
      notAvail: 'Not Available', notRec: 'Not Recorded', notCfg: 'Not Configured', details: 'Details', openErp: 'Open ERP Record', close: 'Close', view: 'View',
      d_over: 'days overdue', d_today: 'Today', d_left: 'days', page: 'Page', of: 'of', prev: 'Previous', next: 'Next', showing: 'Showing', rows: 'rows', showAll: 'Show all', showLess: 'Show less',
      empty: 'No records match the current filters.', emptySrc: 'No records found in this source.', err_src: 'Source unavailable', err_perm: 'permission denied for your user', err_tech: 'technical error while reading', err_timeout: 'no response within 10 seconds - press Refresh to retry', err_partial: 'Counts may be incomplete: the number of rows read did not match the ERP record count for',
      nextRenewal: 'Next renewal', basis: 'Status is calculated from the expiry date recorded in ERP.',
      inactiveTag: 'Inactive / cancelled', hidden_inactive: 'record(s) hidden because they are inactive/cancelled (cancelled CR, non-Active employee, Closed facility contract, cancelled renewal).',
      missingRule: 'Missing = a required slot with no date: CR and National Address for every non-cancelled company, MISA for parent companies, and Iqama / Passport / Medical insurance / Contract for Active employees. Optional facility permits are not counted as missing.',
      platRegister: 'Platform coverage in ERP', platTracked: 'Tracked', platNone: 'No expiry record in ERP', platInCompany: 'Tracked per company (Company Documents tab)', platInHR: 'Qiwa contract expiries are tracked in the HR tab',
      cat_company: 'Company Documents', cat_facility: 'Facilities & Licences', cat_hr: 'HR & Employee', cat_platform: 'IT & Platform Subscriptions',
      t_cr: 'Commercial Registration', t_na: 'National Address', t_misa: 'MISA Licence',
      t_f_com: 'Commercial Licence', t_f_ind: 'Industrial Licence', t_f_fire: 'Fire Maintenance', t_f_na: 'National Address', t_f_rent: 'Rent / Lease Agreement', t_f_cd: 'Civil Defense', t_f_cr: 'Facility CR', t_f_clean: 'Cleaning Contract', t_f_cam: 'Camera Maintenance', t_f_env1: 'Construction Environmental Permit', t_f_env2: 'Operational Environmental Permit', t_f_lease: 'Lease Contract End',
      t_e_iqama: 'Iqama', t_e_passport: 'Passport', t_e_ins: 'Medical Insurance', t_e_contract: 'Qiwa Contract (Employment)', t_e_legacy: 'Contract End (legacy HRMS)',
      t_p_other: 'Subscription',
      l_name: 'Record', l_company_name: 'Company', l_type: 'Type', l_location: 'Location', l_cr_number: 'CR Number', l_unified: 'Unified Number', l_chamber: 'Chamber', l_misa: 'MISA Number', l_cancelled: 'CR Cancelled', l_canc_date: 'Cancellation Date',
      l_facility: 'Facility', l_fdetail: 'Facility Detail', l_ftype: 'Facility Type', l_fstatus: 'Contract Status', l_building: 'Building No', l_contract: 'Contract Number', l_licno: 'Commercial Licence No', l_muni: 'Municipality', l_auth: 'Issue Authority', l_fire_c: 'Fire Contractor', l_clean_c: 'Cleaning Contract', l_cam_c: 'Camera Contractor',
      l_emp: 'Employee', l_emp_id: 'Employee ID', l_emp_status: 'Employee Status', l_dept: 'Department', l_branch: 'Branch', l_job_loc: 'Job Location', l_desig: 'Designation', l_sponsor: 'Sponsor', l_ctype: 'Contract Type',
      l_renewal: 'Renewal Name', l_rtype: 'Type of Renewal', l_provider: 'Provider / Source', l_period: 'Renewal Period', l_amount: 'Total Amount', l_remarks: 'Remarks', l_docstatus: 'Document Status', l_resp: 'Responsible Person',
      l_expiry_sel: 'Selected expiry date', l_days: 'Days remaining', l_status: 'Status',
      loadErr: 'The dashboard could not start.', nodata: 'No data sources could be read with your permissions.'
    },
    ar: {
      title: 'لوحة متابعة انتهاء المنصات والمستندات الإدارية والموارد البشرية', 
      refresh: 'تحديث', refreshing: 'جارٍ التحديث…', last: 'آخر تحديث', loading: 'جارٍ تحميل البيانات من ERPNext…',
      tab_overview: 'نظرة عامة', tab_platforms: 'المنصات الحكومية', tab_companies: 'مستندات الشركات', tab_facilities: 'المنشآت والتراخيص', tab_hr: 'الموارد البشرية والموظفون', tab_alerts: 'تنبيهات التجديد',
      f_company: 'الشركة', f_category: 'الفئة', f_type: 'نوع المستند', f_status: 'حالة الانتهاء', f_from: 'الانتهاء من', f_to: 'الانتهاء إلى', f_search: 'بحث', f_sortby: 'ترتيب حسب', f_dir: 'الاتجاه',
      f_responsible: 'المسؤول', f_dept: 'القسم', f_branch: 'الفرع / الموقع', f_employee: 'الموظف', f_platform: 'المنصة / المستند',
      s_expiry: 'تاريخ الانتهاء', s_name: 'الاسم', asc: 'تصاعدي', desc: 'تنازلي', all: 'الكل', reset: 'إعادة ضبط المرشحات', inactive: 'تضمين السجلات غير النشطة / التاريخية', search_ph: 'ابحث باسم السجل…',
      k_total: 'إجمالي البنود المتابَعة', k_expired: 'منتهية', k_d7: 'خلال 7 أيام', k_d30: 'خلال 8–30 يومًا', k_d60: 'خلال 31–60 يومًا', k_d90: 'خلال 61–90 يومًا', k_valid: 'سارية لأكثر من 90 يومًا', k_missing: 'تاريخ الانتهاء غير مسجل',
      st_expired: 'منتهية', st_critical: '0–7 أيام', st_high: '8–30 يومًا', st_upcoming: '31–60 يومًا', st_advance: '61–90 يومًا', st_valid: 'سارية (>90 يومًا)', st_missing: 'غير مسجل',
      pr_expired: 'منتهية', pr_critical: 'حرجة', pr_high: 'أولوية عالية', pr_upcoming: 'قادمة', pr_advance: 'تنبيه مبكر', pr_valid: 'سارية', pr_missing: 'غير مسجل',
      ch_status: 'توزيع حالات الانتهاء', ch_month: 'الانتهاءات القادمة حسب الشهر', ch_category: 'توزيع الانتهاءات حسب الفئة', ch_company: 'ملخص الانتهاءات حسب الشركة', ch_priority: 'قائمة التجديدات ذات الأولوية', ch_types: 'التوزيع حسب نوع المستند',
      later: 'لاحقًا', expiredBar: 'منتهية', items: 'بند', itemsOf: 'بند', total: 'الإجمالي', undated: 'بدون تاريخ',
      c_entity: 'الجهة / الشركة / الموظف', c_doc: 'المستند / المنصة', c_expiry: 'تاريخ الانتهاء', c_days: 'الأيام المتبقية', c_status: 'الحالة', c_resp: 'المسؤول', c_erp: 'سجل ERP', c_details: 'التفاصيل',
      c_platform: 'اسم المنصة', c_company: 'الشركة', c_ref: 'الحساب / رقم التسجيل', c_renewal: 'حالة التجديد', c_remarks: 'ملاحظات', c_facility: 'المنشأة', c_employee: 'الموظف', c_dept: 'القسم', c_branch: 'الفرع',
      c_expired_n: 'منتهية', c_30: '≤ 30 يومًا', c_90: '31–90 يومًا', c_valid: '> 90 يومًا', c_missing: 'غير مسجل',
      notAvail: 'غير متوفر', notRec: 'غير مسجل', notCfg: 'غير مهيأ', details: 'التفاصيل', openErp: 'فتح سجل ERP', close: 'إغلاق', view: 'عرض',
      d_over: 'يومًا متأخرة', d_today: 'اليوم', d_left: 'يومًا', page: 'صفحة', of: 'من', prev: 'السابق', next: 'التالي', showing: 'عرض', rows: 'سجل', showAll: 'عرض الكل', showLess: 'عرض أقل',
      empty: 'لا توجد سجلات مطابقة للمرشحات الحالية.', emptySrc: 'لا توجد سجلات في هذا المصدر.', err_src: 'المصدر غير متاح', err_perm: 'لا تملك صلاحية القراءة', err_tech: 'خطأ تقني أثناء القراءة', err_timeout: 'لا توجد استجابة خلال 10 ثوانٍ - اضغط تحديث لإعادة المحاولة', err_partial: 'قد تكون الأعداد غير مكتملة: عدد الصفوف المقروءة لا يطابق عدد سجلات ERP لـ',
      nextRenewal: 'التجديد القادم', basis: 'الحالة محسوبة من تاريخ الانتهاء المسجل في ERP.',
      inactiveTag: 'غير نشط / ملغى', hidden_inactive: 'سجل مخفي لأنه غير نشط/ملغى (سجل تجاري ملغى، موظف غير نشط، عقد منشأة مغلق، تجديد ملغى).',
      missingRule: 'غير مسجل = بند مطلوب بلا تاريخ: السجل التجاري والعنوان الوطني لكل شركة غير ملغاة، وترخيص الاستثمار للشركات الأم، والإقامة / الجواز / التأمين الطبي / العقد للموظفين النشطين. تصاريح المنشآت الاختيارية لا تُحتسب كغير مسجلة.',
      platRegister: 'تغطية المنصات في النظام', platTracked: 'مُتابَع', platNone: 'لا يوجد سجل انتهاء في ERP', platInCompany: 'يُتابع لكل شركة (تبويب مستندات الشركات)', platInHR: 'تُتابع عقود قوى في تبويب الموارد البشرية',
      cat_company: 'مستندات الشركات', cat_facility: 'المنشآت والتراخيص', cat_hr: 'الموارد البشرية والموظفون', cat_platform: 'اشتراكات تقنية المعلومات والمنصات',
      t_cr: 'السجل التجاري', t_na: 'العنوان الوطني', t_misa: 'ترخيص وزارة الاستثمار (MISA)',
      t_f_com: 'الرخصة التجارية', t_f_ind: 'الرخصة الصناعية', t_f_fire: 'صيانة الحريق', t_f_na: 'العنوان الوطني', t_f_rent: 'عقد الإيجار / التأجير', t_f_cd: 'الدفاع المدني', t_f_cr: 'سجل المنشأة التجاري', t_f_clean: 'عقد النظافة', t_f_cam: 'صيانة الكاميرات', t_f_env1: 'التصريح البيئي الإنشائي', t_f_env2: 'التصريح البيئي التشغيلي', t_f_lease: 'نهاية عقد التأجير',
      t_e_iqama: 'الإقامة', t_e_passport: 'جواز السفر', t_e_ins: 'التأمين الطبي', t_e_contract: 'عقد قوى (عقد العمل)', t_e_legacy: 'نهاية العقد (حقل قديم)',
      t_p_other: 'اشتراك',
      l_name: 'السجل', l_company_name: 'الشركة', l_type: 'النوع', l_location: 'الموقع', l_cr_number: 'رقم السجل التجاري', l_unified: 'الرقم الموحد', l_chamber: 'الغرفة التجارية', l_misa: 'رقم ترخيص الاستثمار', l_cancelled: 'السجل ملغى', l_canc_date: 'تاريخ الإلغاء',
      l_facility: 'المنشأة', l_fdetail: 'نوع المنشأة', l_ftype: 'ملكية المنشأة', l_fstatus: 'حالة العقد', l_building: 'رقم المبنى', l_contract: 'رقم العقد', l_licno: 'رقم الرخصة التجارية', l_muni: 'البلدية', l_auth: 'جهة الإصدار', l_fire_c: 'مقاول الحريق', l_clean_c: 'عقد النظافة', l_cam_c: 'مقاول الكاميرات',
      l_emp: 'الموظف', l_emp_id: 'رقم الموظف', l_emp_status: 'حالة الموظف', l_dept: 'القسم', l_branch: 'الفرع', l_job_loc: 'موقع العمل', l_desig: 'المسمى الوظيفي', l_sponsor: 'الكفيل', l_ctype: 'نوع العقد',
      l_renewal: 'اسم التجديد', l_rtype: 'نوع التجديد', l_provider: 'المزوّد / المصدر', l_period: 'فترة التجديد', l_amount: 'المبلغ الإجمالي', l_remarks: 'ملاحظات', l_docstatus: 'حالة المستند', l_resp: 'المسؤول',
      l_expiry_sel: 'تاريخ الانتهاء المحدد', l_days: 'الأيام المتبقية', l_status: 'الحالة',
      loadErr: 'تعذر تشغيل اللوحة.', nodata: 'لا يمكن قراءة أي مصدر بيانات بصلاحياتك.'
    }
  };
  function t(k) { var d = T[LANG]; return (d && d[k] != null) ? d[k] : (T.en[k] != null ? T.en[k] : k); }
  var APP = {
    key: '__dmxExpiryDashboard',
    period: false,
    tabs: [['overview', 'tab_overview'], ['platforms', 'tab_platforms'], ['companies', 'tab_companies'], ['facilities', 'tab_facilities'], ['hr', 'tab_hr'], ['alerts', 'tab_alerts']].map(function (x) { return { id: x[0], en: T.en[x[1]], ar: T.ar[x[1]] }; }).concat([{ id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }]),
    filters: [
      { k: 'company', en: T.en.f_company, ar: T.ar.f_company, options: function () { return uq(ITEMS.map(function (i) { return i.company; })); } },
      { k: 'category', en: T.en.f_category, ar: T.ar.f_category, options: function () { return Object.keys(CAT).map(function (s) { return { v: s, l: t(CAT[s]) }; }); } },
      { k: 'type', en: T.en.f_type, ar: T.ar.f_type, options: function () { var m = {}; ITEMS.forEach(function (i) { m[i.type] = typeLabel(i); }); return Object.keys(m).map(function (k) { return { v: k, l: m[k] }; }).sort(function (a, b) { return a.l.localeCompare(b.l); }); } },
      { k: 'status', en: T.en.f_status, ar: T.ar.f_status, options: function () { return STATUS.map(function (s) { return { v: s.key, l: t('pr_' + s.key) + ' — ' + t('st_' + s.key) }; }); } },
      { k: 'resp', en: T.en.f_responsible, ar: T.ar.f_responsible, options: function () { return uq(ITEMS.map(function (i) { return i.resp; })); } },
      { k: 'dept', en: T.en.f_dept, ar: T.ar.f_dept, options: function () { return uq(ITEMS.map(function (i) { return i.dept; })); } },
      { k: 'branch', en: T.en.f_branch, ar: T.ar.f_branch, options: function () { return uq(ITEMS.map(function (i) { return i.branch; })); } },
      { k: 'inactive', en: 'Inactive / historical records', ar: 'السجلات غير النشطة / التاريخية', none: ['Hidden', 'مخفية'], options: function () { return [{ v: '1', l: t('inactive') }]; } },
      { k: 'from', en: T.en.f_from, ar: T.ar.f_from, type: 'date' },
      { k: 'to', en: T.en.f_to, ar: T.ar.f_to, type: 'date' },
      { k: 'q', en: T.en.f_search, ar: T.ar.f_search, type: 'text', ph: [T.en.search_ph, T.ar.search_ph] }
    ],
    sources: ['company', 'facility', 'employee', 'platform'],
    dtLabels: { 'DM Companies Management': ['Company document', 'مستند شركة'], 'DM Facilities Management': ['Facility', 'منشأة'], 'Employee': ['Employee', 'موظف'], 'IT Renewals Subscription': ['Subscription', 'اشتراك'] },
    title: function () { return t('title'); },
    stamp: function () { return tr('DM Group KSA · status from the expiry date recorded in ERP, as of today', 'مجموعة DM السعودية · الحالة من تاريخ الانتهاء المسجل في النظام حتى اليوم'); },
    filterNote: function () { return t('missingRule'); },
    load: function () { ITEMS = []; Object.keys(SOURCES).forEach(function (k) { run(k, function (chk) { return fetchAll({ doctype: SOURCES[k].doctype, fields: SOURCES[k].fields, filters: [] }, chk); }); }); },
    afterLoad: function () { buildItems(); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return bannerHTML(); },
    content: function (x, AM) { return view(x, AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v) { return onAct(a, v); }
  };
  var ITEMS = [], CHIP = '', SHOWALLCO = false;

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

  /* ============================================================ v1 model (unchanged rules) */
  var CFG1 = { includeLegacyContractEnd: false };   // Employee.contract_end_date (stale HRMS field): off, as v1, to avoid double-counting contracts
  var STATUS = [{ key: 'expired', color: '#c62828' }, { key: 'critical', color: '#e65100' }, { key: 'high', color: '#fb8c00' }, { key: 'upcoming', color: '#d4a017' }, { key: 'advance', color: '#1e88e5' }, { key: 'valid', color: '#2e7d32' }, { key: 'missing', color: '#78909c' }];
  var SMAP = {}; STATUS.forEach(function (s) { SMAP[s.key] = s; });
  var STONE = { expired: 'bad', critical: 'bad', high: 'warn', upcoming: 'warn', advance: 'n', valid: 'ok', missing: 'n' };
  function classify(days) { if (days == null) { return 'missing'; } if (days < 0) { return 'expired'; } if (days <= 7) { return 'critical'; } if (days <= 30) { return 'high'; } if (days <= 60) { return 'upcoming'; } if (days <= 90) { return 'advance'; } return 'valid'; }
  var SOURCES = {
    company: { doctype: 'DM Companies Management', label: 'DM Companies Management', fields: ['name', 'company_name', 'type', 'location', 'cr_number', 'unified_number', 'riyadh_chamber', 'misa', 'cr_expiry', 'national_address_expiry', 'misa_expiry', 'cr_cancelled', 'cancellation_date'] },
    facility: { doctype: 'DM Facilities Management', label: 'DM Facilities Management', fields: ['name', 'facility_name', 'facility_detail', 'facility_type', 'facility_contract_status', 'building_no', 'location', 'company', 'contract_number', 'com_act_no', 'municipality', 'issued_authority', 'fire_contractor', 'cleaning_cont', 'camera_contractor', 'rentdate_to', 'lease_end', 'cd_date_to', 'cr_date_to', 'com_lic_exp', 'industrial_expiry', 'construction_environmental_permit_expiry', 'operational_environmental_permit_expiry', 'fire_expiry', 'cleanig_exp_date', 'camera_expiry', 'national_adress_expiry'] },
    employee: { doctype: 'Employee', label: 'Employee', fields: ['name', 'employee_name', 'status', 'company', 'department', 'branch', 'designation', 'custom_job_location', 'custom_sponsor', 'custom_contract_type', 'expiry_date', 'passport_expiry_date', 'insurance_expiry_date', 'agreement_expiry_date'] },
    platform: { doctype: 'IT Renewals Subscription', label: 'IT Renewals Subscription', fields: ['name', 'type_renewal', 'renewal_name', 'expiry_date', 'next_renewal', 'renewal_period', 'total_amount', 'currency', 'provider__source', 'responsible_person', 'remarks', 'docstatus'] }
  };
  if (CFG1.includeLegacyContractEnd) { SOURCES.employee.fields.push('contract_end_date'); }
  var CAT = { company: 'cat_company', facility: 'cat_facility', employee: 'cat_hr', platform: 'cat_platform' };
  var CO_TYPES = [['cr', 'cr_expiry', 't_cr'], ['na', 'national_address_expiry', 't_na'], ['misa', 'misa_expiry', 't_misa']];
  var FAC_TYPES = [['f_com', 'com_lic_exp', 't_f_com'], ['f_ind', 'industrial_expiry', 't_f_ind'], ['f_fire', 'fire_expiry', 't_f_fire'], ['f_na', 'national_adress_expiry', 't_f_na'], ['f_rent', 'rentdate_to', 't_f_rent'], ['f_cd', 'cd_date_to', 't_f_cd'], ['f_cr', 'cr_date_to', 't_f_cr'], ['f_clean', 'cleanig_exp_date', 't_f_clean'], ['f_cam', 'camera_expiry', 't_f_cam'], ['f_env1', 'construction_environmental_permit_expiry', 't_f_env1'], ['f_env2', 'operational_environmental_permit_expiry', 't_f_env2'], ['f_lease', 'lease_end', 't_f_lease']];
  var EMP_TYPES = [['e_iqama', 'expiry_date', 't_e_iqama', true], ['e_contract', 'agreement_expiry_date', 't_e_contract', true], ['e_passport', 'passport_expiry_date', 't_e_passport', true], ['e_ins', 'insurance_expiry_date', 't_e_ins', true]];
  if (CFG1.includeLegacyContractEnd) { EMP_TYPES.push(['e_legacy', 'contract_end_date', 't_e_legacy', false]); }
  function cln(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function uq(arr) { var m = {}; arr.forEach(function (x) { if (x) { m[x] = 1; } }); return Object.keys(m).sort(function (a, b) { return a.localeCompare(b); }); }
  function buildItems() {
    var items = [], seen = {};
    function push(o) { var id = o.doctype + '::' + o.rec.name + '::' + o.field; if (seen[id]) { return; } seen[id] = 1; var ok = o.date && /^\d{4}-\d{2}-\d{2}/.test(o.date); o.id = id; o.date = ok ? String(o.date).slice(0, 10) : null; o.days = ok ? diffDays(TODAY, o.date) : null; o.status = classify(o.days); items.push(o); }
    (D.company || []).forEach(function (r) { var inactive = r.cr_cancelled == 1; CO_TYPES.forEach(function (ty) { var d = r[ty[1]]; if (!d && (inactive || (ty[0] === 'misa' && r.type !== 'Company'))) { return; } push({ src: 'company', doctype: SOURCES.company.doctype, rec: r, field: ty[1], type: ty[0], typeKey: ty[2], entity: cln(r.company_name || r.name), company: cln(r.company_name || r.name), ref: ty[0] === 'cr' ? r.cr_number : (ty[0] === 'misa' ? r.misa : null), date: d, inactive: inactive, resp: null, remarks: null, dept: null, branch: r.location || null }); }); });
    (D.facility || []).forEach(function (r) { var inactive = r.facility_contract_status === 'Closed'; FAC_TYPES.forEach(function (ty) { var d = r[ty[1]]; if (!d) { return; } if (ty[0] === 'f_lease' && d === r.rentdate_to) { return; } push({ src: 'facility', doctype: SOURCES.facility.doctype, rec: r, field: ty[1], type: ty[0], typeKey: ty[2], entity: cln(r.facility_name || r.name), company: cln(r.company) || null, ref: r.com_act_no || r.contract_number || null, date: d, inactive: inactive, resp: null, remarks: null, dept: null, branch: r.location || null }); }); });
    (D.employee || []).forEach(function (r) { var inactive = r.status !== 'Active'; EMP_TYPES.forEach(function (ty) { var d = r[ty[1]]; if (!d && (inactive || !ty[3])) { return; } push({ src: 'employee', doctype: SOURCES.employee.doctype, rec: r, field: ty[1], type: ty[0], typeKey: ty[2], entity: cln(r.employee_name || r.name), company: cln(r.company) || null, ref: null, date: d, inactive: inactive, resp: null, remarks: null, dept: r.department || null, branch: r.branch || null }); }); });
    (D.platform || []).forEach(function (r) { var inactive = r.docstatus === 2, tp = cln(r.type_renewal) || 'Other'; var d = r.expiry_date; if (!d && inactive) { return; } push({ src: 'platform', doctype: SOURCES.platform.doctype, rec: r, field: 'expiry_date', type: 'p:' + tp, typeKey: null, typeLabelRaw: tp, entity: cln(r.renewal_name || r.name), company: null, ref: r.provider__source || null, date: d, inactive: inactive, resp: r.responsible_person || null, remarks: r.remarks || null, dept: null, branch: null, nextRenewal: r.next_renewal || null }); });
    ITEMS = items;
  }
  function typeLabel(it) { return it.typeKey ? t(it.typeKey) : it.typeLabelRaw; }
  function catLabel(it) { return t(CAT[it.src]); }
  var SCOPE = { overview: function () { return true; }, platforms: function (i) { return i.src === 'platform' || i.src === 'company'; }, companies: function (i) { return i.src === 'company'; }, facilities: function (i) { return i.src === 'facility'; }, hr: function (i) { return i.src === 'employee'; }, alerts: function () { return true; }, actions: function () { return true; } };
  function hpFilter(list, skip) {
    skip = skip || {}; var q = String(F.q || '').trim().toLowerCase();
    return list.filter(function (it) {
      if (!F.inactive && it.inactive) { return false; }
      if (F.company && (it.company || '') !== F.company) { return false; }
      if (F.category && it.src !== F.category) { return false; }
      if (F.type && it.type !== F.type) { return false; }
      if (!skip.status && F.status && it.status !== F.status) { return false; }
      if (!skip.status && CHIP && it.status !== CHIP) { return false; }
      if (F.resp && (it.resp || '') !== F.resp) { return false; }
      if (F.dept && (it.dept || '') !== F.dept) { return false; }
      if (F.branch && (it.branch || '') !== F.branch) { return false; }
      if (F.from || F.to) { if (!it.date) { return false; } if (F.from && it.date < F.from) { return false; } if (F.to && it.date > F.to) { return false; } }
      if (q) { var hay = (it.entity + ' ' + (it.company || '') + ' ' + typeLabel(it) + ' ' + (it.rec.name || '') + ' ' + (it.ref || '') + ' ' + (it.resp || '')).toLowerCase(); if (hay.indexOf(q) < 0) { return false; } }
      return true;
    });
  }
  function sortItems(list) { return list.slice().sort(function (a, b) { if (a.days == null && b.days == null) { return a.entity.localeCompare(b.entity); } if (a.days == null) { return 1; } if (b.days == null) { return -1; } return (a.days - b.days) || a.entity.localeCompare(b.entity); }); }
  function counts(list) { var c = { total: list.length, expired: 0, critical: 0, high: 0, upcoming: 0, advance: 0, valid: 0, missing: 0 }; list.forEach(function (i) { c[i.status]++; }); return c; }
  function scoped(x, skip) { return sortItems(hpFilter(ITEMS.filter(SCOPE[x] || SCOPE.overview), skip)); }
  function daysText(d) { if (d == null) { return '—'; } if (d < 0) { return (-d) + ' ' + t('d_over'); } if (d === 0) { return t('d_today'); } return d + ' ' + t('d_left'); }
  function stLabel(k) { var p = t('pr_' + k), q = t('st_' + k); return q.indexOf(p) === 0 ? q : p + ' · ' + q; }
  function stBadge(st) { return stat(STONE[st], t('pr_' + st)); }

  /* ============================================================ sources state */
  function ready() { return Object.keys(SOURCES).every(function (k) { return D[k] != null || D[k + 'Err']; }); }
  function bannerHTML() {
    var h = '';
    Object.keys(SOURCES).forEach(function (k) { var e = D[k + 'Err']; if (e) { h += alertBox('err', '<b>' + esc(t('err_src')) + ':</b> ' + bdi(SOURCES[k].label) + ' — ' + esc(/^large:/.test(e) ? e : t(e === 'perm' ? 'err_perm' : 'err_tech'))); } });
    if (ready() && Object.keys(SOURCES).every(function (k) { return D[k + 'Err']; })) { h += alertBox('err', esc(t('nodata'))); }
    return h;
  }

  /* ============================================================ actions pending (v1 buckets that need a renewal) */
  var ACT = [['a_expired', 'high', 'expired', 'Expired documents and subscriptions', 'منتهية: مستندات واشتراكات', 'Renew now or record the new expiry date', 'جدّد الآن أو سجّل تاريخ الانتهاء الجديد'],
    ['a_critical', 'high', 'critical', 'Expiring within 7 days', 'تنتهي خلال 7 أيام', 'Start the renewal this week', 'ابدأ التجديد هذا الأسبوع'],
    ['a_high', 'med', 'high', 'Expiring in 8–30 days', 'تنتهي خلال 8–30 يومًا', 'Plan the renewal this month', 'خطط للتجديد هذا الشهر'],
    ['a_missing', 'low', 'missing', 'Required expiry date not recorded', 'تاريخ انتهاء مطلوب غير مسجل', 'Record the expiry date in ERP', 'سجّل تاريخ الانتهاء في النظام']];
  function actSpecs() { return ACT.map(function (a) { return { id: a[0], client: true, short: tr(a[3], a[4]), title: tr(a[3], a[4]), why: tr(a[5], a[6]) }; }); }
  function actClient() {
    if (!ready()) { return null; } var errs = Object.keys(SOURCES).filter(function (k) { return D[k + 'Err']; }); if (errs.length === 4) { return 'ERR:' + D[errs[0] + 'Err']; }
    var base = hpFilter(ITEMS, { status: true }), o = {};
    ACT.forEach(function (a) { o[a[0]] = { rows: base.filter(function (i) { return i.status === a[2]; }), item: function (i) { return { p: a[1], score: score(a[1], 0, i.days == null ? 0 : Math.max(0, -i.days)), dt: i.doctype, name: i.rec.name, title: i.entity, desc: typeLabel(i) + ' · ' + catLabel(i) + (i.date ? ' · ' + i.date : ''), who: i.resp || i.company || '', due: daysText(i.days), tone: a[1] === 'high' ? 'bad' : a[1] === 'med' ? 'warn' : 'n' }; } }; });
    return o;
  }

  /* ============================================================ views */
  function kpiRow(list, act) {
    var c = counts(list), defs = [['all', 'k_total', c.total, null], ['expired', 'k_expired', c.expired], ['critical', 'k_d7', c.critical], ['high', 'k_d30', c.high], ['upcoming', 'k_d60', c.upcoming], ['advance', 'k_d90', c.advance], ['valid', 'k_valid', c.valid], ['missing', 'k_missing', c.missing]];
    return kpis(defs.map(function (d) { return kpi({ label: t(d[1]), dot: d[0] === 'all' ? null : SMAP[d[0]].color, val: num(d[2]), sub: d[0] === 'all' ? esc(t('items')) : esc(t('st_' + d[0])), act: act + d[0] }); }), true);
  }
  function chips(list) {
    var c = counts(list);
    return '<div class="hp-chips" role="group">' + STATUS.map(function (s) { var on = CHIP === s.key; return '<button type="button" class="hp-chip' + (on ? ' hp-on' : '') + '" data-act="chip" data-v="' + s.key + '" aria-pressed="' + on + '" style="--hp-c:' + s.color + '"><i></i>' + esc(t('pr_' + s.key)) + ' <b class="dms-num">' + num(c[s.key]) + '</b></button>'; }).join('') + '</div>';
  }
  function statusMix(list) { var c = counts(list); return mixBar(STATUS.map(function (s) { return { label: t('pr_' + s.key), value: c[s.key], color: s.color }; })); }
  function stackRows(list, groupFn, labelFn) {
    var g = {}; list.forEach(function (i) { var k = groupFn(i); (g[k] = g[k] || []).push(i); });
    var keys = Object.keys(g).sort(function (a, b) { return g[b].length - g[a].length; });
    return keys.length ? '<div class="hp-stack">' + keys.map(function (k) { return '<div class="hp-srow"><span class="hp-sl">' + bdi(labelFn(k)) + '</span><span class="hp-sb">' + statusMix(g[k]) + '</span><span class="dms-num">' + num(g[k].length) + '</span></div>'; }).join('') + '</div>' + legend2() : empty(t('empty'));
  }
  function legend2() { return '<div class="hp-legend">' + STATUS.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(t('pr_' + s.key)) + '</span>'; }).join('') + '</div>'; }
  function monthChart(list) {
    var dated = list.filter(function (i) { return i.days != null; }), keys = ['__exp'], by = { __exp: 0, __later: 0 };
    for (var k = 0; k < 12; k++) { var m = addMonths(TODAY, k).slice(0, 7); keys.push(m); by[m] = 0; } keys.push('__later');
    dated.forEach(function (i) { if (i.days < 0) { by.__exp++; return; } var m = i.date.slice(0, 7); if (by[m] != null && m !== '__exp') { by[m]++; } else { by.__later++; } });
    var lab = function (k) { return k === '__exp' ? t('expiredBar') : k === '__later' ? t('later') : fmtMonth(k); };
    return hbars(keys.map(function (k) { return { label: lab(k), value: by[k], color: k === '__exp' ? '#c62828' : k === '__later' ? '#78909c' : 'var(--dms-royal)' }; }), num);
  }
  function fmtMonth(k) { try { return new Intl.DateTimeFormat(LANG === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(k + '-01T00:00:00Z')); } catch (e) { return k; } }
  function companyTable(list) {
    var g = {}; list.forEach(function (i) { var k = i.company || t('notAvail'); (g[k] = g[k] || []).push(i); });
    var rows = Object.keys(g).map(function (k) { return { name: k, c: counts(g[k]) }; }).sort(function (a, b) { return (b.c.expired + b.c.critical + b.c.high) - (a.c.expired + a.c.critical + a.c.high) || b.c.total - a.c.total; });
    var num2 = function (k, h, f, color) { return { k: k, h: h, num: 1, s: f, r: function (r) { return '<span class="dms-num"' + (color && f(r) ? ' style="color:' + color + '"' : '') + '>' + num(f(r)) + '</span>'; }, c: f }; };
    return regTable({ id: 't_co', rows: rows, pageSize: 10, file: 'company_summary', text: function (r) { return r.name; }, empty: t('empty'), sk: 'ex', dir: -1,
      cols: [{ k: 'n', h: t('c_company'), s: function (r) { return r.name; }, r: function (r) { return bdi(r.name); }, c: function (r) { return r.name; } }, num2('t', t('total'), function (r) { return r.c.total; }), num2('ex', t('c_expired_n'), function (r) { return r.c.expired; }, '#c62828'), num2('d30', t('c_30'), function (r) { return r.c.critical + r.c.high; }, '#e65100'), num2('d90', t('c_90'), function (r) { return r.c.upcoming + r.c.advance; }), num2('v', t('c_valid'), function (r) { return r.c.valid; }), num2('m', t('c_missing'), function (r) { return r.c.missing; })] });
  }
  function typeCards(list) {
    var g = {}, order = []; list.forEach(function (i) { if (!g[i.type]) { g[i.type] = []; order.push(i.type); } g[i.type].push(i); });
    if (!order.length) { return ''; }
    return '<div class="dms-grid hp-cards">' + order.map(function (k) { var arr = g[k], c = counts(arr); return '<div class="dms-panelbox hp-card"><b>' + esc(typeLabel(arr[0])) + '</b><div class="hp-big dms-num">' + num(arr.length - c.missing) + '<span class="dms-sm"> / ' + num(arr.length) + '</span></div>' + statusMix(arr) + '<span class="dms-sm">' + esc(t('c_expired_n')) + ' <b style="color:#c62828">' + c.expired + '</b> · ' + esc(t('c_30')) + ' <b style="color:#e65100">' + (c.critical + c.high) + '</b> · ' + esc(t('c_missing')) + ' <b>' + c.missing + '</b></span></div>'; }).join('') + '</div>';
  }
  function coverage() {
    var pl = ITEMS.filter(function (i) { return i.src === 'platform'; }), co = ITEMS.filter(function (i) { return i.src === 'company' && !i.inactive; });
    var hit = function (rx) { return pl.filter(function (i) { return rx.test(i.entity + ' ' + (i.typeLabelRaw || '') + ' ' + (i.ref || '')); }).length; };
    var rows = [['Qiwa', 'qiwa', 'inHR'], ['Muqeem', 'muqeem|muqim', null], ['GOSI', 'gosi', null], ['Mudad', 'mudad', null], ['Chamber of Commerce', 'chamber', null], ['Balady', 'balady', null], ['MISA', 'misa', 'inCo'], ['National Address', 'national address', 'inCo']];
    return panel(t('platRegister'), '<div class="hp-chips">' + rows.map(function (r) {
      var n = hit(new RegExp(r[1], 'i')), txt, k;
      if (n) { txt = t('platTracked') + ' (' + n + ')'; k = 'ok'; } else if (r[2] === 'inCo') { txt = t('platInCompany') + ' (' + co.filter(function (i) { return r[0] === 'MISA' ? i.type === 'misa' : i.type === 'na'; }).length + ')'; k = 'n'; } else if (r[2] === 'inHR') { txt = t('platInHR'); k = 'n'; } else { txt = t('notCfg'); k = 'warn'; }
      return '<span class="hp-cov">' + bdi(r[0]) + ' ' + stat(k, txt) + '</span>';
    }).join('') + '</div>');
  }
  var COLS = {
    alerts: ['c_entity', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_resp', 'c_erp'],
    companies: ['c_company', 'c_doc', 'c_ref', 'c_expiry', 'c_days', 'c_status', 'c_erp'],
    facilities: ['c_facility', 'c_company', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_erp'],
    hr: ['c_employee', 'c_company', 'c_dept', 'c_branch', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_erp'],
    platforms: ['c_platform', 'c_company', 'c_ref', 'c_expiry', 'c_days', 'c_resp', 'c_renewal', 'c_remarks'],
    list: ['c_entity', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_erp']
  };
  function na() { return '<span class="dms-sm">' + esc(t('notAvail')) + '</span>'; }
  function vv(v) { return v == null || v === '' ? na() : bdi(v); }
  function detBtn(it, label) { return '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="it:' + esc(it.id) + '">' + bdi(label) + '</button>'; }
  function colDef(c) {
    var tag = function (it) { return it.inactive ? ' ' + stat('n', t('inactiveTag')) : ''; };
    var D1 = {
      c_entity: [function (it) { return it.entity; }, function (it) { return detBtn(it, it.entity) + tag(it) + (it.src !== 'employee' && it.company && it.company !== it.entity ? '<div class="dms-sm">' + bdi(it.company) + '</div>' : ''); }],
      c_facility: [function (it) { return it.entity; }, function (it) { return detBtn(it, it.entity) + tag(it); }],
      c_employee: [function (it) { return it.entity; }, function (it) { return detBtn(it, it.entity) + tag(it); }],
      c_platform: [function (it) { return it.entity; }, function (it) { return detBtn(it, it.entity) + tag(it) + '<div class="dms-sm">' + esc(it.src === 'platform' ? typeLabel(it) : catLabel(it) + ' · ' + typeLabel(it)) + '</div>'; }],
      c_company: [function (it) { return it.src === 'company' ? it.entity : it.company || ''; }, function (it) { return it.src === 'platform' ? na() : it.src === 'company' ? detBtn(it, it.entity) + tag(it) : vv(it.company); }],
      c_doc: [function (it) { return typeLabel(it); }, function (it) { return esc(typeLabel(it)) + '<div class="dms-sm">' + esc(catLabel(it)) + '</div>'; }],
      c_ref: [function (it) { return it.ref || ''; }, function (it) { return vv(it.ref); }],
      c_expiry: [function (it) { return it.date || '9999'; }, function (it) { return it.date ? dtc(it.date) : '<span class="dms-sm">' + esc(t('notRec')) + '</span>'; }],
      c_days: [function (it) { return it.days == null ? 1e9 : it.days; }, function (it) { return '<span class="dms-num">' + esc(daysText(it.days)) + '</span>'; }, 1],
      c_status: [function (it) { return STATUS.indexOf(SMAP[it.status]); }, function (it) { return stBadge(it.status); }],
      c_resp: [function (it) { return it.resp || ''; }, function (it) { return it.resp ? bdi(it.resp) : '<span class="dms-sm">' + esc(t('notRec')) + '</span>'; }],
      c_renewal: [function (it) { return STATUS.indexOf(SMAP[it.status]); }, function (it) { return stBadge(it.status) + (it.nextRenewal ? '<div class="dms-sm">' + esc(t('nextRenewal')) + ': ' + esc(it.nextRenewal) + '</div>' : ''); }],
      c_remarks: [function (it) { return it.remarks || ''; }, function (it) { return it.remarks ? '<span title="' + esc(it.remarks) + '">' + bdi(String(it.remarks).slice(0, 70) + (String(it.remarks).length > 70 ? '…' : '')) + '</span>' : na(); }],
      c_dept: [function (it) { return it.dept || ''; }, function (it) { return vv(it.dept); }],
      c_branch: [function (it) { return it.branch || ''; }, function (it) { return vv(it.branch); }],
      c_erp: [function (it) { return it.rec.name; }, function (it) { return docLink(it.doctype, it.rec.name, t('view')); }]
    }[c];
    return { k: c, h: t(c), num: D1[2], s: D1[0], r: D1[1], c: function (it) { return c === 'c_status' || c === 'c_renewal' ? t('pr_' + it.status) : c === 'c_days' ? (it.days == null ? '' : it.days) : String(D1[0](it)); } };
  }
  function itemsTable(id, list, cols, ps) { return regTable({ id: id, rows: list, pageSize: ps || 25, file: id, text: function (it) { return [it.entity, it.company, typeLabel(it), it.rec.name, it.ref, it.resp].join(' '); }, empty: t('empty'), cols: COLS[cols].map(colDef) }); }
  function noteHTML(x, extra) { var hid = ITEMS.filter(SCOPE[x] || SCOPE.overview).filter(function (i) { return i.inactive; }).length; return note(esc(t('basis') + (extra ? ' ' + extra : ''))) + (!F.inactive && hid ? note(esc(hid + ' ' + t('hidden_inactive'))) : ''); }
  function view(x, AM) {
    if (ready()) { buildItems(); }
    if (!ready()) { return (x === 'overview' ? '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(8, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>' : '<div class="dms-skel dms-skel-panel"></div>'); }
    if (Object.keys(SOURCES).every(function (k) { return D[k + 'Err']; })) { return x === 'actions' ? actionsTab(AM) : actionsPanel(AM); }
    if (x === 'actions') { return actionsTab(AM, tr('Renewal actions are as of today and follow the filters.', 'إجراءات التجديد حتى اليوم وتتبع المرشحات.')); }
    var list = scoped(x), h = '';
    if (x === 'overview') {
      var pri = list.filter(function (i) { return i.days != null && i.days <= 30; }).slice(0, 10);
      h += kpiRow(scoped(x, { status: true }), 'st:');
      h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(t('ch_status'), statusMix(list) + hbars(STATUS.map(function (s) { var n = counts(list)[s.key]; return { label: stLabel(s.key), value: n, color: s.color, act: 'st:' + s.key }; }), num), '', esc(num(list.length) + ' ' + t('items'))) + '</div></div>';
      h += '<div class="dms-cols-2 dms-grid">' + panel(t('ch_month'), monthChart(list)) + panel(t('ch_category'), stackRows(list, function (i) { return i.src; }, function (k) { return t(CAT[k]); })) + '</div>';
      h += panel(t('ch_company'), companyTable(list));
      h += panel(t('ch_priority'), itemsTable('t_pri', pri, 'list', 10));
      return h + noteHTML(x, t('missingRule'));
    }
    if (x === 'alerts') { return kpiRow(scoped(x, { status: true }), 'chipk:') + panel(t('tab_alerts'), itemsTable('t_alerts', list, 'alerts')) + noteHTML(x); }
    h += chips(scoped(x, { status: true }));
    if (x === 'platforms') { h += coverage(); }
    if (x === 'companies' || x === 'facilities' || x === 'hr') { h += typeCards(list); }
    if (x === 'facilities') { h += panel(t('ch_types'), stackRows(list, function (i) { return i.type; }, function (k) { var f = list.filter(function (i) { return i.type === k; })[0]; return f ? typeLabel(f) : k; })); }
    return h + panel(t('tab_' + x), itemsTable('t_' + x, list, x)) + noteHTML(x);
  }

  /* ============================================================ details and events */
  var LBL = {
    company: [['company_name', 'l_company_name'], ['type', 'l_type'], ['location', 'l_location'], ['cr_number', 'l_cr_number'], ['unified_number', 'l_unified'], ['riyadh_chamber', 'l_chamber'], ['misa', 'l_misa'], ['cr_cancelled', 'l_cancelled'], ['cancellation_date', 'l_canc_date']],
    facility: [['facility_name', 'l_facility'], ['facility_detail', 'l_fdetail'], ['facility_type', 'l_ftype'], ['facility_contract_status', 'l_fstatus'], ['company', 'l_company_name'], ['building_no', 'l_building'], ['location', 'l_location'], ['contract_number', 'l_contract'], ['com_act_no', 'l_licno'], ['municipality', 'l_muni'], ['issued_authority', 'l_auth'], ['fire_contractor', 'l_fire_c'], ['cleaning_cont', 'l_clean_c'], ['camera_contractor', 'l_cam_c']],
    employee: [['employee_name', 'l_emp'], ['name', 'l_emp_id'], ['status', 'l_emp_status'], ['company', 'l_company_name'], ['department', 'l_dept'], ['branch', 'l_branch'], ['custom_job_location', 'l_job_loc'], ['designation', 'l_desig'], ['custom_sponsor', 'l_sponsor'], ['custom_contract_type', 'l_ctype']],
    platform: [['renewal_name', 'l_renewal'], ['type_renewal', 'l_rtype'], ['provider__source', 'l_provider'], ['renewal_period', 'l_period'], ['total_amount', 'l_amount'], ['responsible_person', 'l_resp'], ['remarks', 'l_remarks']]
  };
  function detailBody(it) {
    var r = it.rec, rows = [[t('c_doc'), typeLabel(it), 1], [t('l_expiry_sel'), it.date || t('notRec'), 1], [t('l_days'), daysText(it.days), 1], [t('l_status'), t('pr_' + it.status) + ' — ' + t('st_' + it.status), 1]];
    (LBL[it.src] || []).forEach(function (p) { var v = r[p[0]]; if (v == null || v === '') { return; } if (p[0] === 'cr_cancelled') { v = v == 1 ? tr('Yes', 'نعم') : tr('No', 'لا'); } if (p[0] === 'total_amount') { v = amt(v) + (r.currency ? ' ' + r.currency : ''); } rows.push([t(p[1]), v]); });
    if (it.src === 'platform') { rows.push([t('nextRenewal'), r.next_renewal || t('notAvail')]); rows.push([t('l_docstatus'), r.docstatus === 2 ? 'Cancelled' : r.docstatus === 1 ? 'Submitted' : 'Draft']); }
    var defs = it.src === 'company' ? CO_TYPES : it.src === 'facility' ? FAC_TYPES : it.src === 'employee' ? EMP_TYPES : [];
    defs.forEach(function (d) { if (r[d[1]] && d[1] !== it.field) { rows.push([t(d[2]), String(r[d[1]]).slice(0, 10)]); } });
    return '<div class="dms-actions-row">' + stBadge(it.status) + (it.inactive ? ' ' + stat('n', t('inactiveTag')) : '') + '</div><div class="dms-facts hp-facts">' + rows.map(function (x) { return '<div' + (x[2] ? ' class="hp-hl"' : '') + '><span class="dms-sm">' + esc(x[0]) + '</span><b>' + bdi(x[1]) + '</b></div>'; }).join('') + '</div>';
  }
  function drill(id) {
    if (id.indexOf('it:') === 0) { var it = ITEMS.filter(function (i) { return i.id === id.slice(3); })[0]; if (!it) { return null; } return { title: it.entity, sub: typeLabel(it) + ' · ' + catLabel(it), link: [it.doctype, it.rec.name, it.rec.name], body: detailBody(it) }; }
    if (id.indexOf('st:') === 0) {
      var st = id.slice(3), base = scoped(tab === 'actions' ? 'overview' : tab, { status: true }), list = st === 'all' ? base : base.filter(function (i) { return i.status === st; });
      return { title: (st === 'all' ? t('k_total') : t('pr_' + st) + ' — ' + t('st_' + st)) + ' (' + num(list.length) + ')', sub: t('basis'), spec: { rows: list, file: 'expiry_' + st, text: function (i) { return [i.entity, typeLabel(i), i.company].join(' '); }, cols: COLS.list.map(colDef) } };
    }
    if (id.indexOf('cli:') === 0) {
      var k = id.slice(4), cc = actClient(), y = cc && typeof cc === 'object' && cc[k], s = actSpecs().filter(function (z) { return z.id === k; })[0]; if (!y || !s) { return null; }
      return { title: s.title, sub: s.why, spec: { rows: y.rows, file: k, text: function (i) { return [i.entity, typeLabel(i), i.company].join(' '); }, cols: COLS.alerts.map(colDef) } };
    }
    return null;
  }
  function onAct(a, v) {
    if (a === 'kpi' && /^(it|st):/.test(v)) { openDrill(v); return true; }
    if (a === 'kpi' && v.indexOf('chipk:') === 0) { var s = v.slice(6); CHIP = s === 'all' || CHIP === s ? '' : s; renderSoft(); return true; }
    if (a === 'chip') { CHIP = CHIP === v ? '' : v; renderSoft(); return true; }
    if (a === 'tab') { CHIP = ''; return false; }
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
