/* ===== DM Group KSA — Admin & HR Platforms Expiry Dashboard — SCRIPT field =====
   Client-side only. Read-only: uses frappe.client.get_list / get_count under the logged-in user's permissions.
   No server scripts, no writes, no external services. */
(function () {
  'use strict';

  /* ---------- bootstrap / isolation ---------- */
  var G = window;
  var ROOT = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
  var HOST = ROOT.querySelector('[data-dmx-root]');
  if (!HOST) { return; }
  var KEY = '__dmxExpiryDashboard';
  if (G[KEY] && typeof G[KEY].destroy === 'function') { try { G[KEY].destroy(); } catch (e) { /* ignore */ } }
  var abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var SIG = abort ? { signal: abort.signal } : false;
  var timers = [];
  var destroyed = false;
  G[KEY] = { destroy: function () { destroyed = true; if (abort) { abort.abort(); } timers.forEach(clearTimeout); timers = []; } };

  var CFG = {
    pageSize: 25, fetchPage: 500, listPageSize: 15,
    requestTimeoutMs: 10000,   // one request may not hold the dashboard on "Loading" for longer than this
    includeLegacyContractEnd: false   // Employee.contract_end_date (stale HRMS field) — off by default to avoid double-counting contracts
  };

  /* ---------- i18n ---------- */
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
  var L = 'en';
  try { var sv = G.localStorage.getItem('dmx_lang'); if (sv === 'ar' || sv === 'en') { L = sv; } } catch (e) { /* storage unavailable */ }
  function t(k) { var d = T[L]; return (d && d[k] != null) ? d[k] : (T.en[k] != null ? T.en[k] : k); }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function $(sel) { return HOST.querySelector(sel); }
  function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) { fn(); } }, ms); timers.push(id); return id; }

  var STATUS = [
    { key: 'expired', color: '#c62828', dark: false }, { key: 'critical', color: '#e65100', dark: false },
    { key: 'high', color: '#fb8c00', dark: false }, { key: 'upcoming', color: '#f9a825', dark: true },
    { key: 'advance', color: '#1e88e5', dark: false }, { key: 'valid', color: '#2e7d32', dark: false },
    { key: 'missing', color: '#78909c', dark: false }
  ];
  var SMAP = {}; STATUS.forEach(function (s) { SMAP[s.key] = s; });
  function classify(days) {
    if (days == null) { return 'missing'; }
    if (days < 0) { return 'expired'; }
    if (days <= 7) { return 'critical'; }
    if (days <= 30) { return 'high'; }
    if (days <= 60) { return 'upcoming'; }
    if (days <= 90) { return 'advance'; }
    return 'valid';
  }

  /* ---------- site date (ERP timezone, calendar-date arithmetic) ---------- */
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
    var tz = siteTz(), o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    if (tz) { o.timeZone = tz; }
    var p;
    try { p = new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()); } catch (e) { delete o.timeZone; p = new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()); }
    var m = {}; p.forEach(function (x) { m[x.type] = x.value; });
    if (m.hour === '24') { m.hour = '00'; }
    return m;
  }
  function parseISO(s) {
    if (!s || typeof s !== 'string') { return null; }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3], ms = Date.UTC(y, mo - 1, d), dt = new Date(ms);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) { return null; }
    return ms;
  }
  var TODAY = '', TODAY_MS = 0, STAMP = '';
  function setToday() {
    var p = siteParts(); TODAY = p.year + '-' + p.month + '-' + p.day; TODAY_MS = parseISO(TODAY);
    STAMP = TODAY + ' ' + p.hour + ':' + p.minute;
  }

  /* ---------- data model ---------- */
  var SOURCES = {
    company: { doctype: 'DM Companies Management', label: 'DM Companies Management', fields: ['name', 'company_name', 'type', 'location', 'cr_number', 'unified_number', 'riyadh_chamber', 'misa', 'cr_expiry', 'national_address_expiry', 'misa_expiry', 'cr_cancelled', 'cancellation_date'] },
    facility: { doctype: 'DM Facilities Management', label: 'DM Facilities Management', fields: ['name', 'facility_name', 'facility_detail', 'facility_type', 'facility_contract_status', 'building_no', 'location', 'company', 'contract_number', 'com_act_no', 'municipality', 'issued_authority', 'fire_contractor', 'cleaning_cont', 'camera_contractor', 'rentdate_to', 'lease_end', 'cd_date_to', 'cr_date_to', 'com_lic_exp', 'industrial_expiry', 'construction_environmental_permit_expiry', 'operational_environmental_permit_expiry', 'fire_expiry', 'cleanig_exp_date', 'camera_expiry', 'national_adress_expiry'] },
    employee: { doctype: 'Employee', label: 'Employee', fields: ['name', 'employee_name', 'status', 'company', 'department', 'branch', 'designation', 'custom_job_location', 'custom_sponsor', 'custom_contract_type', 'expiry_date', 'passport_expiry_date', 'insurance_expiry_date', 'agreement_expiry_date'] },
    platform: { doctype: 'IT Renewals Subscription', label: 'IT Renewals Subscription', fields: ['name', 'type_renewal', 'renewal_name', 'expiry_date', 'next_renewal', 'renewal_period', 'total_amount', 'currency', 'provider__source', 'responsible_person', 'remarks', 'docstatus'] }
  };
  if (CFG.includeLegacyContractEnd) { SOURCES.employee.fields.push('contract_end_date'); }

  var DATA = { raw: {}, status: {}, items: [], hiddenInactive: 0 };
  var CAT = { company: 'cat_company', facility: 'cat_facility', employee: 'cat_hr', platform: 'cat_platform' };

  var CO_TYPES = [['cr', 'cr_expiry', 't_cr'], ['na', 'national_address_expiry', 't_na'], ['misa', 'misa_expiry', 't_misa']];
  var FAC_TYPES = [['f_com', 'com_lic_exp', 't_f_com'], ['f_ind', 'industrial_expiry', 't_f_ind'], ['f_fire', 'fire_expiry', 't_f_fire'], ['f_na', 'national_adress_expiry', 't_f_na'],
    ['f_rent', 'rentdate_to', 't_f_rent'], ['f_cd', 'cd_date_to', 't_f_cd'], ['f_cr', 'cr_date_to', 't_f_cr'], ['f_clean', 'cleanig_exp_date', 't_f_clean'], ['f_cam', 'camera_expiry', 't_f_cam'],
    ['f_env1', 'construction_environmental_permit_expiry', 't_f_env1'], ['f_env2', 'operational_environmental_permit_expiry', 't_f_env2'], ['f_lease', 'lease_end', 't_f_lease']];
  var EMP_TYPES = [['e_iqama', 'expiry_date', 't_e_iqama', true], ['e_contract', 'agreement_expiry_date', 't_e_contract', true], ['e_passport', 'passport_expiry_date', 't_e_passport', true], ['e_ins', 'insurance_expiry_date', 't_e_ins', true]];
  if (CFG.includeLegacyContractEnd) { EMP_TYPES.push(['e_legacy', 'contract_end_date', 't_e_legacy', false]); }

  function buildItems() {
    var items = [], seen = {}, hidden = 0;
    function push(o) {
      var id = o.doctype + '::' + o.rec.name + '::' + o.field;
      if (seen[id]) { return; } seen[id] = 1;
      var ms = o.date ? parseISO(o.date) : null;
      var days = (ms == null) ? null : Math.round((ms - TODAY_MS) / 86400000);
      o.id = id; o.date = (ms == null) ? null : o.date.slice(0, 10); o.days = days; o.status = classify(days);
      items.push(o);
    }
    var raw = DATA.raw;
    (raw.company || []).forEach(function (r) {
      var inactive = r.cr_cancelled == 1;
      CO_TYPES.forEach(function (ty) {
        var d = r[ty[1]];
        if (!d && (inactive || (ty[0] === 'misa' && r.type !== 'Company'))) { return; }
        push({ src: 'company', doctype: SOURCES.company.doctype, rec: r, field: ty[1], type: ty[0], typeKey: ty[2], entity: clean(r.company_name || r.name), company: clean(r.company_name || r.name),
          ref: ty[0] === 'cr' ? r.cr_number : (ty[0] === 'misa' ? r.misa : null), date: d, inactive: inactive, resp: null, remarks: null, dept: null, branch: r.location || null });
      });
    });
    (raw.facility || []).forEach(function (r) {
      var inactive = r.facility_contract_status === 'Closed';
      FAC_TYPES.forEach(function (ty) {
        var d = r[ty[1]]; if (!d) { return; }
        if (ty[0] === 'f_lease' && d === r.rentdate_to) { return; }   // same contract recorded twice — count once
        push({ src: 'facility', doctype: SOURCES.facility.doctype, rec: r, field: ty[1], type: ty[0], typeKey: ty[2], entity: clean(r.facility_name || r.name), company: clean(r.company) || null,
          ref: r.com_act_no || r.contract_number || null, date: d, inactive: inactive, resp: null, remarks: null, dept: null, branch: r.location || null });
      });
    });
    (raw.employee || []).forEach(function (r) {
      var inactive = r.status !== 'Active';
      EMP_TYPES.forEach(function (ty) {
        var d = r[ty[1]];
        if (!d && (inactive || !ty[3])) { return; }
        push({ src: 'employee', doctype: SOURCES.employee.doctype, rec: r, field: ty[1], type: ty[0], typeKey: ty[2], entity: clean(r.employee_name || r.name), company: clean(r.company) || null,
          ref: null, date: d, inactive: inactive, resp: null, remarks: null, dept: r.department || null, branch: r.branch || null });
      });
    });
    (raw.platform || []).forEach(function (r) {
      var inactive = r.docstatus === 2, tp = clean(r.type_renewal) || 'Other';
      var d = r.expiry_date; if (!d && inactive) { return; }
      push({ src: 'platform', doctype: SOURCES.platform.doctype, rec: r, field: 'expiry_date', type: 'p:' + tp, typeKey: null, typeLabelRaw: tp, entity: clean(r.renewal_name || r.name), company: null,
        ref: r.provider__source || null, date: d, inactive: inactive, resp: r.responsible_person || null, remarks: r.remarks || null, dept: null, branch: null, nextRenewal: r.next_renewal || null });
    });
    items.forEach(function (it) { if (it.inactive) { hidden++; } });
    DATA.items = items; DATA.hiddenInactive = hidden;
  }
  function typeLabel(it) { return it.typeKey ? t(it.typeKey) : it.typeLabelRaw; }
  function catLabel(it) { return t(CAT[it.src]); }

  /* ---------- fetching (read-only, paginated, verified with get_count) ---------- */
  function callP(method, args) {
    return new Promise(function (resolve, reject) {
      var done = false, tid = setTimeout(function () { if (!done) { done = true; reject({ timeout: true }); } }, CFG.requestTimeoutMs);
      function fin(fn, v) { if (done) { return; } done = true; clearTimeout(tid); fn(v); }
      try {
        frappe.call({ method: method, args: args, silent: true, freeze: false,
          callback: function (r) { fin(resolve, r ? r.message : null); },
          error: function (e) { fin(reject, e || new Error('request failed')); } });
      } catch (ex) { fin(reject, ex); }
    });
  }
  function errKind(e) {
    if (e && e.timeout) { return 'timeout'; }
    var txt = ''; try { txt = (e && (e.responseText || e.statusText || e.message)) || ''; } catch (x) { /* ignore */ }
    return (/PermissionError|not permitted|403/i.test(String(txt)) || (e && e.status === 403)) ? 'perm' : 'tech';
  }
  function fetchAll(key) {
    var s = SOURCES[key], out = [], start = 0, guard = 0;
    function page() {
      return callP('frappe.client.get_list', { doctype: s.doctype, fields: s.fields, limit_start: start, limit_page_length: CFG.fetchPage, order_by: 'name asc' }).then(function (rows) {
        rows = rows || []; out = out.concat(rows); start += CFG.fetchPage; guard++;
        if (rows.length === CFG.fetchPage && guard < 400) { return page(); }
        return callP('frappe.client.get_count', { doctype: s.doctype }).then(function (n) {
          DATA.status[key] = { ok: true, n: out.length, partial: (typeof n === 'number' && n !== out.length), expected: n };
          DATA.raw[key] = out;
        }, function () { DATA.status[key] = { ok: true, n: out.length, partial: false }; DATA.raw[key] = out; });
      });
    }
    return page().catch(function (e) { DATA.status[key] = { ok: false, kind: errKind(e) }; DATA.raw[key] = []; });
  }
  var loading = false, loaded = false;
  function loadAll() {
    if (loading) { return Promise.resolve(); }
    loading = true; renderHeaderState();
    DATA.raw = {}; DATA.status = {};
    return Promise.all(Object.keys(SOURCES).map(fetchAll)).then(function () {
      if (destroyed) { return; }
      setToday(); buildItems(); loading = false; loaded = true; page = 1;
      renderAll();
    }).catch(function () { loading = false; if (!destroyed) { HOST.innerHTML = '<div class="dmx-empty">' + esc(t('loadErr')) + '</div>'; } });
  }

  /* ---------- state ---------- */
  var tab = 'overview', page = 1;
  var F = { company: '', category: '', type: '', status: '', from: '', to: '', q: '', sortBy: 'date', dir: 'asc', inactive: false, resp: '', dept: '', branch: '', employee: '' };
  var OV = { drawer: null, list: null, listPage: 1, showAllCo: false };
  var TABS = [
    { id: 'overview', k: 'tab_overview', scope: function () { return true; }, ic: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { id: 'platforms', k: 'tab_platforms', scope: function (i) { return i.src === 'platform' || i.src === 'company'; }, ic: 'M12 2 2 7v2h20V7L12 2zM4 11v7h3v-7H4zm6.5 0v7h3v-7h-3zM17 11v7h3v-7h-3zM2 20v2h20v-2H2z' },
    { id: 'companies', k: 'tab_companies', scope: function (i) { return i.src === 'company'; }, ic: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z' },
    { id: 'facilities', k: 'tab_facilities', scope: function (i) { return i.src === 'facility'; }, ic: 'M3 21V8l9-5 9 5v13h-6v-7H9v7H3z' },
    { id: 'hr', k: 'tab_hr', scope: function (i) { return i.src === 'employee'; }, ic: 'M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.9 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z' },
    { id: 'alerts', k: 'tab_alerts', scope: function () { return true; }, ic: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.1-1.6-5.6-4.5-6.3V4a1.5 1.5 0 0 0-3 0v.7C7.6 5.4 6 7.9 6 11v5l-2 2v1h16v-1l-2-2z' }
  ];
  function curTab() { for (var i = 0; i < TABS.length; i++) { if (TABS[i].id === tab) { return TABS[i]; } } return TABS[0]; }
  function scoped() { var sc = curTab().scope; return DATA.items.filter(sc); }

  function applyFilters(list, skip) {
    skip = skip || {};
    var q = F.q.trim().toLowerCase(), fromMs = F.from ? parseISO(F.from) : null, toMs = F.to ? parseISO(F.to) : null;
    return list.filter(function (it) {
      if (!F.inactive && it.inactive) { return false; }
      if (!skip.company && F.company && (it.company || '') !== F.company) { return false; }
      if (F.category && it.src !== F.category) { return false; }
      if (F.type && it.type !== F.type) { return false; }
      if (!skip.status && F.status && it.status !== F.status) { return false; }
      if (F.resp && (it.resp || '') !== F.resp) { return false; }
      if (F.dept && (it.dept || '') !== F.dept) { return false; }
      if (F.branch && (it.branch || '') !== F.branch) { return false; }
      if (F.employee && it.entity !== F.employee) { return false; }
      if (fromMs != null || toMs != null) {
        if (!it.date) { return false; }
        var ms = parseISO(it.date);
        if (fromMs != null && ms < fromMs) { return false; }
        if (toMs != null && ms > toMs) { return false; }
      }
      if (q) {
        var hay = (it.entity + ' ' + (it.company || '') + ' ' + typeLabel(it) + ' ' + (it.rec.name || '') + ' ' + (it.ref || '') + ' ' + (it.resp || '')).toLowerCase();
        if (hay.indexOf(q) < 0) { return false; }
      }
      return true;
    });
  }
  function sortItems(list) {
    var dir = F.dir === 'desc' ? -1 : 1, out = list.slice();
    out.sort(function (a, b) {
      if (F.sortBy === 'name') { return dir * a.entity.localeCompare(b.entity); }
      if (a.days == null && b.days == null) { return a.entity.localeCompare(b.entity); }
      if (a.days == null) { return 1; } if (b.days == null) { return -1; }   // missing dates always last
      return (a.days - b.days) * dir || a.entity.localeCompare(b.entity);
    });
    return out;
  }
  function counts(list) {
    var c = { total: list.length, expired: 0, critical: 0, high: 0, upcoming: 0, advance: 0, valid: 0, missing: 0 };
    list.forEach(function (i) { c[i.status]++; }); return c;
  }
  function uniq(arr) { var m = {}; arr.forEach(function (x) { if (x) { m[x] = 1; } }); return Object.keys(m).sort(function (a, b) { return a.localeCompare(b); }); }

  /* ---------- formatting ---------- */
  function badge(st) { var s = SMAP[st]; return '<span class="dmx-badge' + (s.dark ? ' dmx-dark' : '') + '" style="--dmx-c:' + s.color + '">' + esc(t('pr_' + st)) + '</span>'; }
  function daysText(d) { if (d == null) { return '—'; } if (d < 0) { return (-d) + ' ' + t('d_over'); } if (d === 0) { return t('d_today'); } return d + ' ' + t('d_left'); }
  function bdi(s) { return '<bdi>' + esc(s) + '</bdi>'; }
  function val(v) { return (v == null || v === '') ? '<span class="dmx-sm">' + esc(t('notAvail')) + '</span>' : bdi(v); }
  function erpUrl(it) {
    try { if (G.frappe && frappe.utils && frappe.utils.get_form_link) { return frappe.utils.get_form_link(it.doctype, it.rec.name); } } catch (e) { /* fall through */ }
    return '/app/' + it.doctype.toLowerCase().replace(/ /g, '-') + '/' + encodeURIComponent(it.rec.name);
  }
  var ICON_EMPTY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11z"/></svg>';

  /* ---------- UI: header / tabs / banner ---------- */
  function headerHTML() {
    return '<div class="dmx-header"><div class="dmx-brand"><div style="min-width:0"><h2 class="dmx-title">' + esc(t('title')) + '</h2><p class="dmx-sub">DM Group KSA · </p></div></div>' +
      '<div class="dmx-actions"><span class="dmx-stamp" data-ref="stamp"></span>' +
      '<button class="dmx-btn dmx-btn-primary" data-act="refresh" data-ref="refresh" type="button"></button>' +
      '<div class="dmx-lang" role="group" aria-label="Language"><button type="button" data-act="lang" data-v="en" class="' + (L === 'en' ? 'dmx-on' : '') + '">EN</button><button type="button" data-act="lang" data-v="ar" class="' + (L === 'ar' ? 'dmx-on' : '') + '">عربي</button></div></div></div>';
  }
  function renderHeaderState() {
    var b = $('[data-ref="refresh"]'), s = $('[data-ref="stamp"]');
    if (b) { b.disabled = loading; b.innerHTML = loading ? '<span class="dmx-spin"></span> ' + esc(t('refreshing')) : '↻ ' + esc(t('refresh')); }
    if (s) { s.textContent = STAMP ? (t('last') + ': ' + STAMP) : ''; }
  }
  function tabsHTML() {
    return '<div class="dmx-tabs" role="tablist">' + TABS.map(function (x) {
      return '<button class="dmx-tab' + (x.id === tab ? ' dmx-on' : '') + '" role="tab" aria-selected="' + (x.id === tab) + '" data-act="tab" data-v="' + x.id + '" type="button"><svg viewBox="0 0 24 24" fill="currentColor"><path d="' + x.ic + '"/></svg>' + esc(t(x.k)) + '</button>';
    }).join('') + '</div>';
  }
  function bannerHTML() {
    var h = '';
    Object.keys(SOURCES).forEach(function (k) {
      var st = DATA.status[k]; if (!st) { return; }
      if (!st.ok) { h += '<div class="dmx-alert dmx-alert-err"><b>' + esc(t('err_src')) + ':</b> ' + bdi(SOURCES[k].label) + ' — ' + esc(t(st.kind === 'perm' ? 'err_perm' : st.kind === 'timeout' ? 'err_timeout' : 'err_tech')) + '</div>'; }
      else if (st.partial) { h += '<div class="dmx-alert dmx-alert-warn">' + esc(t('err_partial')) + ' ' + bdi(SOURCES[k].label) + ' (' + st.n + ' / ' + st.expected + ')</div>'; }
    });
    var okAny = Object.keys(SOURCES).some(function (k) { return DATA.status[k] && DATA.status[k].ok; });
    if (loaded && !okAny) { h += '<div class="dmx-alert dmx-alert-err">' + esc(t('nodata')) + '</div>'; }
    return h;
  }

  /* ---------- UI: filters ---------- */
  function selectHTML(f, label, opts, cur, fmt) {
    return '<div class="dmx-field"><label>' + esc(label) + '</label><select class="dmx-input" data-f="' + f + '"><option value="">' + esc(t('all')) + '</option>' +
      opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, lb = Array.isArray(o) ? o[1] : (fmt ? fmt(o) : o); return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(lb) + '</option>'; }).join('') + '</select></div>';
  }
  function renderFilters() {
    var el = $('[data-ref="filters"]'); if (!el) { return; }
    var base = scoped(), h = '';
    var companies = uniq(base.map(function (i) { return i.company; }));
    var cats = uniq(base.map(function (i) { return i.src; })).map(function (s) { return [s, t(CAT[s])]; });
    var typeMap = {}; base.forEach(function (i) { typeMap[i.type] = typeLabel(i); });
    var types = Object.keys(typeMap).map(function (k) { return [k, typeMap[k]]; }).sort(function (a, b) { return a[1].localeCompare(b[1]); });
    var stats = STATUS.map(function (s) { return [s.key, t('pr_' + s.key) + ' — ' + t('st_' + s.key)]; });
    h += selectHTML('company', t('f_company'), companies, F.company);
    if (tab === 'overview' || tab === 'alerts') { h += selectHTML('category', t('f_category'), cats, F.category); }
    h += selectHTML('type', tab === 'platforms' ? t('f_platform') : t('f_type'), types, F.type);
    h += selectHTML('status', t('f_status'), stats, F.status);
    if (tab === 'platforms') { h += selectHTML('resp', t('f_responsible'), uniq(base.map(function (i) { return i.resp; })), F.resp); }
    if (tab === 'hr') {
      h += '<div class="dmx-field"><label>' + esc(t('f_employee')) + '</label><input class="dmx-input" list="dmx-emp-list" data-f="employee" value="' + esc(F.employee) + '" autocomplete="off"><datalist id="dmx-emp-list">' +
        uniq(base.map(function (i) { return i.entity; })).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist></div>';
      h += selectHTML('dept', t('f_dept'), uniq(base.map(function (i) { return i.dept; })), F.dept);
      h += selectHTML('branch', t('f_branch'), uniq(base.map(function (i) { return i.branch; })), F.branch);
    }
    h += '<div class="dmx-field"><label>' + esc(t('f_from')) + '</label><input type="date" class="dmx-input" data-f="from" value="' + esc(F.from) + '"></div>';
    h += '<div class="dmx-field"><label>' + esc(t('f_to')) + '</label><input type="date" class="dmx-input" data-f="to" value="' + esc(F.to) + '"></div>';
    h += '<div class="dmx-field"><label>' + esc(t('f_search')) + '</label><input type="search" class="dmx-input" data-f="q" placeholder="' + esc(t('search_ph')) + '" value="' + esc(F.q) + '"></div>';
    h += selectHTML('sortBy', t('f_sortby'), [['date', t('s_expiry')], ['name', t('s_name')]], F.sortBy).replace('<option value="">' + esc(t('all')) + '</option>', '');
    h += selectHTML('dir', t('f_dir'), [['asc', t('asc')], ['desc', t('desc')]], F.dir).replace('<option value="">' + esc(t('all')) + '</option>', '');
    h += '<div class="dmx-field"><label>&nbsp;</label><label class="dmx-check" style="text-transform:none;font-weight:600"><input type="checkbox" data-f="inactive"' + (F.inactive ? ' checked' : '') + '> ' + esc(t('inactive')) + '</label></div>';
    h += '<div class="dmx-field"><label>&nbsp;</label><div class="dmx-fbtns"><button type="button" class="dmx-btn" data-act="reset">' + esc(t('reset')) + '</button></div></div>';
    el.innerHTML = h;
  }

  /* ---------- UI: components ---------- */
  function statusChips(list) {
    var c = counts(list);
    return '<div class="dmx-chips">' + STATUS.map(function (s) {
      return '<button type="button" class="dmx-chip' + (F.status === s.key ? ' dmx-on' : '') + '" data-act="chip" data-v="' + s.key + '" style="--dmx-c:' + s.color + '"><i></i>' + esc(t('pr_' + s.key)) + ' <b>' + c[s.key] + '</b></button>';
    }).join('') + '</div>';
  }
  function kpiHTML(list) {
    var c = counts(list), defs = [
      ['all', 'k_total', c.total, '#0f2547'], ['expired', 'k_expired', c.expired, '#c62828'], ['critical', 'k_d7', c.critical, '#e65100'], ['high', 'k_d30', c.high, '#fb8c00'],
      ['upcoming', 'k_d60', c.upcoming, '#f9a825'], ['advance', 'k_d90', c.advance, '#1e88e5'], ['valid', 'k_valid', c.valid, '#2e7d32'], ['missing', 'k_missing', c.missing, '#78909c']];
    return '<div class="dmx-grid dmx-kpis">' + defs.map(function (d) {
      return '<button type="button" class="dmx-kpi" data-act="kpi" data-v="' + d[0] + '" style="--dmx-c:' + d[3] + '"><div class="dmx-kpi-n">' + d[2] + '</div><div class="dmx-kpi-l">' + esc(t(d[1])) + '</div></button>';
    }).join('') + '</div>';
  }
  function donutHTML(list) {
    var c = counts(list), R = 70, C = 2 * Math.PI * R, off = 0, segs = '';
    if (c.total) {
      STATUS.forEach(function (s) {
        var n = c[s.key]; if (!n) { return; }
        var len = n / c.total * C;
        segs += '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="' + s.color + '" stroke-width="26" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 90 90)"><title>' + esc(t('pr_' + s.key)) + ': ' + n + '</title></circle>';
        off += len;
      });
    } else { segs = '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="#e3e8ef" stroke-width="26"/>'; }
    var leg = STATUS.map(function (s) { return '<div><span><i style="--dmx-c:' + s.color + '"></i>' + esc(t('pr_' + s.key)) + (t('pr_' + s.key) !== t('st_' + s.key) ? ' · ' + esc(t('st_' + s.key)) : '') + '</span><b>' + c[s.key] + '</b></div>'; }).join('');
    return '<div class="dmx-chartwrap"><svg class="dmx-donut" viewBox="0 0 180 180" role="img" aria-label="' + esc(t('ch_status')) + '">' + segs +
      '<text x="90" y="88" text-anchor="middle" font-size="26" font-weight="800" fill="#0f2547">' + c.total + '</text><text x="90" y="106" text-anchor="middle" font-size="10" fill="#64748b">' + esc(t('total')) + '</text></svg>' +
      '<div class="dmx-donut-legend">' + leg + '</div></div>';
  }
  function monthBarsHTML(list) {
    var dated = list.filter(function (i) { return i.days != null; });
    var base = new Date(TODAY_MS), y0 = base.getUTCFullYear(), m0 = base.getUTCMonth(), bars = [];
    bars.push({ label: t('expiredBar'), n: dated.filter(function (i) { return i.days < 0; }).length, color: '#c62828' });
    var fm; try { fm = new Intl.DateTimeFormat(L === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }); } catch (e) { fm = null; }
    var idx = {}; for (var k = 0; k < 12; k++) { var dt = new Date(Date.UTC(y0, m0 + k, 1)); idx[dt.getUTCFullYear() + '-' + dt.getUTCMonth()] = bars.length; bars.push({ label: fm ? fm.format(dt) : (dt.getUTCMonth() + 1) + '/' + dt.getUTCFullYear(), n: 0, color: '#1d4ed8' }); }
    var laterBar = { label: t('later'), n: 0, color: '#78909c' }; bars.push(laterBar);
    dated.forEach(function (i) {
      if (i.days < 0) { return; }
      var d = new Date(parseISO(i.date)), key = d.getUTCFullYear() + '-' + d.getUTCMonth();
      if (idx[key] != null) { bars[idx[key]].n++; } else { laterBar.n++; }
    });
    var max = Math.max.apply(null, bars.map(function (b) { return b.n; }).concat([1])), W = 660, H = 230, pl = 8, bw = (W - pl * 2) / bars.length, h = '';
    bars.forEach(function (b, i) {
      var bh = Math.round(b.n / max * 150), x = pl + i * bw + 4, y = 180 - bh;
      h += '<g><title>' + esc(b.label) + ': ' + b.n + '</title><rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw - 8).toFixed(1) + '" height="' + bh + '" rx="4" fill="' + b.color + '"/>' +
        '<text class="dmx-val" x="' + (x + (bw - 8) / 2).toFixed(1) + '" y="' + (y - 5) + '" text-anchor="middle">' + b.n + '</text>' +
        '<text x="' + (x + (bw - 8) / 2).toFixed(1) + '" y="198" text-anchor="middle" transform="rotate(-35 ' + (x + (bw - 8) / 2).toFixed(1) + ' 198)">' + esc(b.label) + '</text></g>';
    });
    return '<div style="overflow-x:auto"><svg class="dmx-bars" style="min-width:520px" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('ch_month')) + '"><line x1="0" y1="180" x2="' + W + '" y2="180" stroke="#e3e8ef"/>' + h + '</svg></div>';
  }
  function stackHTML(list, groupFn, labelFn) {
    var groups = {}; list.forEach(function (i) { var g = groupFn(i); (groups[g] = groups[g] || []).push(i); });
    var keys = Object.keys(groups).sort(function (a, b) { return groups[b].length - groups[a].length; });
    var rows = keys.map(function (k) {
      var arr = groups[k], c = counts(arr), max = arr.length;
      var segs = STATUS.map(function (s) { return c[s.key] ? '<i style="width:' + (c[s.key] / max * 100).toFixed(2) + '%;background:' + s.color + '" title="' + esc(t('pr_' + s.key)) + ': ' + c[s.key] + '"></i>' : ''; }).join('');
      return '<div class="dmx-stack-row"><span title="' + esc(labelFn(k)) + '">' + esc(labelFn(k)) + '</span><div class="dmx-stack">' + segs + '</div><span>' + arr.length + '</span></div>';
    }).join('');
    var leg = '<div class="dmx-legend">' + STATUS.map(function (s) { return '<span><i style="--dmx-c:' + s.color + '"></i>' + esc(t('pr_' + s.key)) + '</span>'; }).join('') + '</div>';
    return (rows || '<div class="dmx-empty">' + esc(t('empty')) + '</div>') + leg;
  }
  function typeCardsHTML(list) {
    var groups = {}, order = [];
    list.forEach(function (i) { if (!groups[i.type]) { groups[i.type] = []; order.push(i.type); } groups[i.type].push(i); });
    if (!order.length) { return ''; }
    return '<div class="dmx-grid dmx-typecards">' + order.map(function (k) {
      var arr = groups[k], c = counts(arr), dated = arr.length - c.missing;
      var seg = STATUS.map(function (s) { return c[s.key] ? '<i style="width:' + (c[s.key] / arr.length * 100).toFixed(2) + '%;background:' + s.color + '"></i>' : ''; }).join('');
      return '<div class="dmx-tcard"><b>' + esc(typeLabel(arr[0])) + '</b><div class="dmx-big">' + dated + '<span class="dmx-sm" style="display:inline;margin-inline-start:6px">/ ' + arr.length + '</span></div><div class="dmx-stack">' + seg + '</div>' +
        '<small>' + esc(t('c_expired_n')) + ' <b style="color:#c62828">' + c.expired + '</b> · ' + esc(t('c_30')) + ' <b style="color:#e65100">' + (c.critical + c.high) + '</b> · ' + esc(t('c_missing')) + ' <b>' + c.missing + '</b></small></div>';
    }).join('') + '</div>';
  }
  function companyTableHTML(list) {
    var g = {}; list.forEach(function (i) { var k = i.company || t('notAvail'); (g[k] = g[k] || []).push(i); });
    var rows = Object.keys(g).map(function (k) { var c = counts(g[k]); return { name: k, c: c }; });
    rows.sort(function (a, b) { return (b.c.expired + b.c.critical + b.c.high) - (a.c.expired + a.c.critical + a.c.high) || b.c.total - a.c.total; });
    var lim = OV.showAllCo ? rows.length : 10, shown = rows.slice(0, lim);
    var h = '<div class="dmx-tablewrap"><table class="dmx-table" style="min-width:520px"><thead><tr><th>' + esc(t('c_company')) + '</th><th>' + esc(t('total')) + '</th><th>' + esc(t('c_expired_n')) + '</th><th>' + esc(t('c_30')) + '</th><th>' + esc(t('c_90')) + '</th><th>' + esc(t('c_valid')) + '</th><th>' + esc(t('c_missing')) + '</th></tr></thead><tbody>' +
      shown.map(function (r) { return '<tr><td>' + bdi(r.name) + '</td><td class="dmx-num"><b>' + r.c.total + '</b></td><td class="dmx-num" style="color:#c62828">' + r.c.expired + '</td><td class="dmx-num" style="color:#e65100">' + (r.c.critical + r.c.high) + '</td><td class="dmx-num">' + (r.c.upcoming + r.c.advance) + '</td><td class="dmx-num" style="color:#2e7d32">' + r.c.valid + '</td><td class="dmx-num">' + r.c.missing + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    if (rows.length > 10) { h += '<div class="dmx-pager"><span></span><button type="button" class="dmx-link" data-act="showallco">' + esc(OV.showAllCo ? t('showLess') : t('showAll') + ' (' + rows.length + ')') + '</button></div>'; }
    return h;
  }

  var COLS = {
    alerts: ['c_entity', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_resp', 'c_erp', 'c_details'],
    companies: ['c_company', 'c_doc', 'c_ref', 'c_expiry', 'c_days', 'c_status', 'c_erp', 'c_details'],
    facilities: ['c_facility', 'c_company', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_erp', 'c_details'],
    hr: ['c_employee', 'c_company', 'c_dept', 'c_branch', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_erp', 'c_details'],
    platforms: ['c_platform', 'c_company', 'c_ref', 'c_expiry', 'c_days', 'c_resp', 'c_renewal', 'c_remarks', 'c_details'],
    list: ['c_entity', 'c_doc', 'c_expiry', 'c_days', 'c_status', 'c_details']
  };
  function erpCell(it) { return '<a class="dmx-link" href="' + esc(erpUrl(it)) + '" target="_blank" rel="noopener noreferrer">' + esc(t('view')) + ' ↗</a>'; }
  function cell(col, it) {
    var tag = it.inactive ? '<span class="dmx-tag">' + esc(t('inactiveTag')) + '</span>' : '';
    switch (col) {
      case 'c_entity': case 'c_facility': case 'c_employee': return bdi(it.entity) + tag + (it.src !== 'employee' && it.company && it.company !== it.entity ? '<span class="dmx-sm">' + bdi(it.company) + '</span>' : '');
      case 'c_platform': return bdi(it.entity) + tag + '<span class="dmx-sm">' + esc(it.src === 'platform' ? typeLabel(it) : catLabel(it)) + (it.src === 'company' ? ' · ' + typeLabel(it) : '') + '</span>';
      case 'c_company': return it.src === 'platform' ? '<span class="dmx-sm">' + esc(t('notAvail')) + '</span>' : val(it.src === 'company' ? it.entity : it.company);
      case 'c_doc': return esc(typeLabel(it)) + '<span class="dmx-sm">' + esc(catLabel(it)) + '</span>';
      case 'c_ref': return val(it.ref);
      case 'c_expiry': return it.date ? '<span class="dmx-num">' + esc(it.date) + '</span>' : '<span class="dmx-sm">' + esc(t('notRec')) + '</span>';
      case 'c_days': return '<span class="dmx-num" data-sort="' + (it.days == null ? '' : it.days) + '">' + esc(daysText(it.days)) + '</span>';
      case 'c_status': return badge(it.status);
      case 'c_resp': return it.resp ? bdi(it.resp) : '<span class="dmx-sm">' + esc(t('notRec')) + '</span>';
      case 'c_renewal': return badge(it.status) + (it.nextRenewal ? '<span class="dmx-sm">' + esc(t('nextRenewal')) + ': ' + esc(it.nextRenewal) + '</span>' : '');
      case 'c_remarks': return it.remarks ? '<span title="' + esc(it.remarks) + '">' + bdi(String(it.remarks).slice(0, 70) + (String(it.remarks).length > 70 ? '…' : '')) + '</span>' : '<span class="dmx-sm">' + esc(t('notAvail')) + '</span>';
      case 'c_dept': return val(it.dept);
      case 'c_branch': return val(it.branch);
      case 'c_erp': return erpCell(it);
      case 'c_details': return '<button type="button" class="dmx-link" data-act="details" data-id="' + esc(it.id) + '">' + esc(t('details')) + '</button>';
    }
    return '';
  }
  function tableHTML(list, cols, pg, pageSize, pagerAct) {
    if (!list.length) { return '<div class="dmx-tablewrap"><div class="dmx-empty">' + ICON_EMPTY + '<div>' + esc(t('empty')) + '</div></div></div>'; }
    var pages = Math.max(1, Math.ceil(list.length / pageSize)); if (pg > pages) { pg = pages; }
    var slice = list.slice((pg - 1) * pageSize, pg * pageSize);
    var h = '<div class="dmx-tablewrap"><table class="dmx-table"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(t(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      slice.map(function (it) { return '<tr>' + cols.map(function (c) { return '<td>' + cell(c, it) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    h += '<div class="dmx-pager"><span>' + esc(t('showing')) + ' ' + ((pg - 1) * pageSize + 1) + '–' + Math.min(pg * pageSize, list.length) + ' / ' + list.length + ' ' + esc(t('rows')) + '</span><span>' +
      '<button type="button" class="dmx-btn" data-act="' + pagerAct + '" data-v="-1"' + (pg <= 1 ? ' disabled' : '') + '>‹ ' + esc(t('prev')) + '</button> ' + esc(t('page')) + ' ' + pg + ' ' + esc(t('of')) + ' ' + pages +
      ' <button type="button" class="dmx-btn" data-act="' + pagerAct + '" data-v="1"' + (pg >= pages ? ' disabled' : '') + '>' + esc(t('next')) + ' ›</button></span></div>';
    return h;
  }

  /* ---------- UI: tab content ---------- */
  function noteHTML(extra) {
    var h = '<p class="dmx-note">' + esc(t('basis')) + (extra ? ' ' + esc(extra) : '') + '</p>';
    var hid = scoped().filter(function (i) { return i.inactive; }).length;
    if (!F.inactive && hid) { h += '<p class="dmx-note">' + hid + ' ' + esc(t('hidden_inactive')) + '</p>'; }
    return h;
  }
  function renderContent() {
    var el = $('[data-ref="content"]'); if (!el) { return; }
    if (!loaded) { el.innerHTML = '<div class="dmx-grid dmx-kpis"><div class="dmx-skel"></div><div class="dmx-skel"></div><div class="dmx-skel"></div><div class="dmx-skel"></div></div><p class="dmx-note">' + esc(t('loading')) + '</p>'; return; }
    var list = sortItems(applyFilters(scoped())), h = '';
    var okAny = Object.keys(SOURCES).some(function (k) { return DATA.status[k] && DATA.status[k].ok; });
    if (!okAny) { el.innerHTML = ''; return; }
    if (tab === 'overview') {
      var cats = '';
      h += kpiHTML(list);
      h += '<div class="dmx-grid dmx-cols-2"><div class="dmx-panelbox"><h3 class="dmx-h3">' + esc(t('ch_status')) + '</h3>' + donutHTML(list) + '</div>' +
        '<div class="dmx-panelbox"><h3 class="dmx-h3">' + esc(t('ch_month')) + '</h3>' + monthBarsHTML(list) + '</div></div>';
      h += '<div class="dmx-grid dmx-cols-2"><div class="dmx-panelbox"><h3 class="dmx-h3">' + esc(t('ch_category')) + '</h3>' + stackHTML(list, function (i) { return i.src; }, function (k) { return t(CAT[k]); }) + '</div>' +
        '<div class="dmx-panelbox"><h3 class="dmx-h3">' + esc(t('ch_company')) + '</h3>' + companyTableHTML(list) + '</div></div>';
      var pri = list.filter(function (i) { return i.days != null && i.days <= 30; }).sort(function (a, b) { return a.days - b.days || a.entity.localeCompare(b.entity); }).slice(0, 10);
      h += '<div class="dmx-panelbox dmx-mb"><h3 class="dmx-h3">' + esc(t('ch_priority')) + '</h3>' + tableHTML(pri, COLS.list, 1, 10, 'noop') .replace(/<div class="dmx-pager">[\s\S]*$/, '') + '</div>';
      h += noteHTML(t('missingRule'));
    } else if (tab === 'platforms') {
      h += statusChips(list) + platformCoverageHTML() + '<div class="dmx-panelbox dmx-mb">' + tableHTML(list, COLS.platforms, page, CFG.pageSize, 'page') + '</div>' + noteHTML();
    } else if (tab === 'companies') {
      h += statusChips(list) + typeCardsHTML(list) + '<div class="dmx-panelbox dmx-mb">' + tableHTML(list, COLS.companies, page, CFG.pageSize, 'page') + '</div>' + noteHTML();
    } else if (tab === 'facilities') {
      h += statusChips(list) + typeCardsHTML(list) + '<div class="dmx-panelbox dmx-mb"><h3 class="dmx-h3">' + esc(t('ch_types')) + '</h3>' + stackHTML(list, function (i) { return i.type; }, function (k) { var f = list.filter(function (i) { return i.type === k; })[0]; return f ? typeLabel(f) : k; }) + '</div>' +
        '<div class="dmx-panelbox dmx-mb">' + tableHTML(list, COLS.facilities, page, CFG.pageSize, 'page') + '</div>' + noteHTML();
    } else if (tab === 'hr') {
      h += statusChips(list) + typeCardsHTML(list) + '<div class="dmx-panelbox dmx-mb">' + tableHTML(list, COLS.hr, page, CFG.pageSize, 'page') + '</div>' + noteHTML();
    } else {
      h += kpiHTML(list).replace(/data-act="kpi"/g, 'data-act="chipk"') + '<div class="dmx-panelbox dmx-mb">' + tableHTML(list, COLS.alerts, page, CFG.pageSize, 'page') + '</div>' + noteHTML();
    }
    el.innerHTML = h;
  }
  function platformCoverageHTML() {
    var pl = DATA.items.filter(function (i) { return i.src === 'platform'; }), co = DATA.items.filter(function (i) { return i.src === 'company' && !i.inactive; });
    function hit(rx) { return pl.filter(function (i) { return rx.test(i.entity + ' ' + (i.typeLabelRaw || '') + ' ' + (i.ref || '')); }).length; }
    var rows = [['Qiwa', 'qiwa', 'inHR'], ['Muqeem', 'muqeem|muqim', null], ['GOSI', 'gosi', null], ['Mudad', 'mudad', null], ['Chamber of Commerce', 'chamber', null], ['Balady', 'balady', null],
      ['MISA', 'misa', 'inCo'], ['National Address', 'national address', 'inCo']];
    var h = '<div class="dmx-panelbox dmx-mb"><h3 class="dmx-h3">' + esc(t('platRegister')) + '</h3><div class="dmx-chips">' + rows.map(function (r) {
      var n = hit(new RegExp(r[1], 'i')), txt, color;
      if (n) { txt = t('platTracked') + ' (' + n + ')'; color = '#2e7d32'; }
      else if (r[2] === 'inCo') { txt = t('platInCompany') + ' (' + co.filter(function (i) { return (r[0] === 'MISA' ? i.type === 'misa' : i.type === 'na'); }).length + ')'; color = '#1e88e5'; }
      else if (r[2] === 'inHR') { txt = t('platInHR'); color = '#1e88e5'; }
      else { txt = t('notCfg'); color = '#78909c'; }
      return '<span class="dmx-chip" style="--dmx-c:' + color + ';cursor:default" title="' + esc(txt) + '"><i></i>' + bdi(r[0]) + ' · ' + esc(txt) + '</span>';
    }).join('') + '</div></div>';
    return h;
  }

  /* ---------- UI: overlays (details drawer + KPI list) ---------- */
  var LBL = {
    company: [['company_name', 'l_company_name'], ['type', 'l_type'], ['location', 'l_location'], ['cr_number', 'l_cr_number'], ['unified_number', 'l_unified'], ['riyadh_chamber', 'l_chamber'], ['misa', 'l_misa'], ['cr_cancelled', 'l_cancelled'], ['cancellation_date', 'l_canc_date']],
    facility: [['facility_name', 'l_facility'], ['facility_detail', 'l_fdetail'], ['facility_type', 'l_ftype'], ['facility_contract_status', 'l_fstatus'], ['company', 'l_company_name'], ['building_no', 'l_building'], ['location', 'l_location'], ['contract_number', 'l_contract'], ['com_act_no', 'l_licno'], ['municipality', 'l_muni'], ['issued_authority', 'l_auth'], ['fire_contractor', 'l_fire_c'], ['cleaning_cont', 'l_clean_c'], ['camera_contractor', 'l_cam_c']],
    employee: [['employee_name', 'l_emp'], ['name', 'l_emp_id'], ['status', 'l_emp_status'], ['company', 'l_company_name'], ['department', 'l_dept'], ['branch', 'l_branch'], ['custom_job_location', 'l_job_loc'], ['designation', 'l_desig'], ['custom_sponsor', 'l_sponsor'], ['custom_contract_type', 'l_ctype']],
    platform: [['renewal_name', 'l_renewal'], ['type_renewal', 'l_rtype'], ['provider__source', 'l_provider'], ['renewal_period', 'l_period'], ['total_amount', 'l_amount'], ['responsible_person', 'l_resp'], ['remarks', 'l_remarks']]
  };
  function expiryRows(it) {
    var r = it.rec, defs = it.src === 'company' ? CO_TYPES : it.src === 'facility' ? FAC_TYPES : it.src === 'employee' ? EMP_TYPES : [];
    return defs.filter(function (d) { return r[d[1]]; }).map(function (d) { return [t(d[2]), r[d[1]], d[1] === it.field]; });
  }
  function drawerHTML(it) {
    var r = it.rec, rows = [];
    rows.push([t('c_doc'), typeLabel(it), true]);
    rows.push([t('l_expiry_sel'), it.date || t('notRec'), true]);
    rows.push([t('l_days'), daysText(it.days), true]);
    rows.push([t('l_status'), t('pr_' + it.status) + ' — ' + t('st_' + it.status), true]);
    (LBL[it.src] || []).forEach(function (p) {
      var v = r[p[0]]; if (v == null || v === '') { return; }
      if (p[0] === 'cr_cancelled') { v = v == 1 ? 'Yes' : 'No'; }
      if (p[0] === 'total_amount') { v = v + (r.currency ? ' ' + r.currency : ''); }
      rows.push([t(p[1]), v, false]);
    });
    if (it.src === 'platform') {
      rows.push([t('nextRenewal'), r.next_renewal || t('notAvail'), false]);
      rows.push([t('l_docstatus'), r.docstatus === 2 ? 'Cancelled' : r.docstatus === 1 ? 'Submitted' : 'Draft', false]);
    }
    expiryRows(it).forEach(function (e) { if (!e[2]) { rows.push([e[0], e[1], false]); } });
    return '<div class="dmx-overlay" data-act="ovbg"><div class="dmx-drawer" role="dialog" aria-modal="true" aria-label="' + esc(t('details')) + '"><div class="dmx-dhead"><div><h3>' + bdi(it.entity) + '</h3><div style="margin-top:4px">' + badge(it.status) + (it.inactive ? '<span class="dmx-tag">' + esc(t('inactiveTag')) + '</span>' : '') + '</div></div>' +
      '<button type="button" class="dmx-x" data-act="closeov" aria-label="' + esc(t('close')) + '">×</button></div>' +
      '<a class="dmx-btn dmx-btn-primary" href="' + esc(erpUrl(it)) + '" target="_blank" rel="noopener noreferrer">' + esc(t('openErp')) + ' ↗</a>' +
      '<dl class="dmx-dl">' + rows.map(function (x) { return '<dt' + (x[2] ? ' class="dmx-hl"' : '') + '>' + esc(x[0]) + '</dt><dd' + (x[2] ? ' class="dmx-hl"' : '') + '>' + bdi(x[1]) + '</dd>'; }).join('') + '</dl></div></div>';
  }
  function listHTML() {
    var base = sortItems(applyFilters(scoped(), { status: true })), st = OV.list;
    var list = st === 'all' ? base : base.filter(function (i) { return i.status === st; });
    var title = st === 'all' ? t('k_total') : t('pr_' + st) + ' — ' + t('st_' + st);
    return '<div class="dmx-overlay dmx-center" data-act="ovbg"><div class="dmx-modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="dmx-dhead"><h3>' + esc(title) + ' (' + list.length + ')</h3>' +
      '<button type="button" class="dmx-x" data-act="closeov" aria-label="' + esc(t('close')) + '">×</button></div>' + tableHTML(list, COLS.list, OV.listPage, CFG.listPageSize, 'lpage') + '</div></div>';
  }
  function renderOverlay() {
    var el = $('[data-ref="overlay"]'); if (!el) { return; }
    var h = '';
    if (OV.list) { h += listHTML(); }
    if (OV.drawer) { var it = null; for (var i = 0; i < DATA.items.length; i++) { if (DATA.items[i].id === OV.drawer) { it = DATA.items[i]; break; } } if (it) { h += drawerHTML(it); } }
    el.innerHTML = h;
    var x = el.querySelector('.dmx-overlay:last-child .dmx-x'); if (x) { x.focus(); }
  }

  /* ---------- render orchestration ---------- */
  function renderAll() {
    HOST.setAttribute('dir', L === 'ar' ? 'rtl' : 'ltr'); HOST.setAttribute('lang', L);
    HOST.innerHTML = headerHTML() + tabsHTML() + '<div class="dmx-banner" data-ref="banner"></div><div class="dmx-filters" data-ref="filters"></div><div class="dmx-content" data-ref="content"></div><div data-ref="overlay"></div>';
    var bn = $('[data-ref="banner"]'); if (bn) { bn.innerHTML = bannerHTML(); }
    renderHeaderState(); renderFilters(); renderContent(); renderOverlay();
  }
  function resetFilters() { F = { company: '', category: '', type: '', status: '', from: '', to: '', q: '', sortBy: 'date', dir: 'asc', inactive: false, resp: '', dept: '', branch: '', employee: '' }; }

  /* ---------- events (single delegated set, removed on destroy) ---------- */
  function onClick(ev) {
    var n = ev.target.closest ? ev.target.closest('[data-act]') : null; if (!n || !HOST.contains(n)) { return; }
    var a = n.getAttribute('data-act'), v = n.getAttribute('data-v');
    if (a === 'ovbg') { if (ev.target !== n) { return; } closeOv(); return; }
    if (a === 'tab') { if (tab !== v) { tab = v; page = 1; var keep = { inactive: F.inactive, sortBy: F.sortBy, dir: F.dir }; resetFilters(); F.inactive = keep.inactive; F.sortBy = keep.sortBy; F.dir = keep.dir; renderAll(); } return; }
    if (a === 'lang') { L = v; try { G.localStorage.setItem('dmx_lang', L); } catch (e) { /* ignore */ } renderAll(); return; }
    if (a === 'refresh') { loadAll(); return; }
    if (a === 'reset') { resetFilters(); page = 1; renderFilters(); renderContent(); return; }
    if (a === 'chip') { F.status = (F.status === v) ? '' : v; page = 1; renderFilters(); renderContent(); return; }
    if (a === 'chipk') { F.status = (v === 'all' || F.status === v) ? '' : v; page = 1; renderFilters(); renderContent(); return; }
    if (a === 'kpi') { OV.list = v; OV.listPage = 1; renderOverlay(); return; }
    if (a === 'details') { OV.drawer = n.getAttribute('data-id'); renderOverlay(); return; }
    if (a === 'closeov') { closeOv(); return; }
    if (a === 'page') { page = Math.max(1, page + (+v)); renderContent(); var c = $('[data-ref="content"]'); if (c && c.scrollIntoView) { c.scrollIntoView({ block: 'start', behavior: 'smooth' }); } return; }
    if (a === 'lpage') { OV.listPage = Math.max(1, OV.listPage + (+v)); renderOverlay(); return; }
    if (a === 'showallco') { OV.showAllCo = !OV.showAllCo; renderContent(); return; }
  }
  function closeOv() { if (OV.drawer) { OV.drawer = null; } else { OV.list = null; } renderOverlay(); }
  var qTimer = null;
  function onInput(ev) {
    var n = ev.target; var f = n && n.getAttribute ? n.getAttribute('data-f') : null; if (!f || !HOST.contains(n)) { return; }
    var v = n.type === 'checkbox' ? n.checked : n.value;
    if (F[f] === v) { return; }
    F[f] = v; page = 1;
    var upd = function () { if (f !== 'q' && f !== 'employee') { renderFilters(); } renderContent(); };
    if (f === 'q' || f === 'employee') { clearTimeout(qTimer); qTimer = later(upd, 220); } else { upd(); }
  }
  function onKey(ev) { if (ev.key === 'Escape' && (OV.drawer || OV.list)) { closeOv(); } }
  HOST.addEventListener('click', onClick, SIG);
  HOST.addEventListener('input', onInput, SIG);
  HOST.addEventListener('change', onInput, SIG);
  HOST.addEventListener('keydown', onKey, SIG);

  /* ---------- start ---------- */
  setToday();
  if (!G.frappe || !frappe.call) { HOST.innerHTML = '<div class="dmx-empty">' + esc(t('loadErr')) + '</div>'; return; }
  HOST.setAttribute('dir', L === 'ar' ? 'rtl' : 'ltr');
  HOST.innerHTML = headerHTML() + tabsHTML() + '<div class="dmx-banner" data-ref="banner"></div><div class="dmx-filters" data-ref="filters"></div><div class="dmx-content" data-ref="content"></div><div data-ref="overlay"></div>';
  renderHeaderState(); renderContent();
  loadAll().then(function () { if (!destroyed) { var bn = $('[data-ref="banner"]'); if (bn) { bn.innerHTML = bannerHTML(); } } });
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
