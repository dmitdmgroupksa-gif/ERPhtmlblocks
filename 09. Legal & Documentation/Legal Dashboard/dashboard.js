/* =====================================================================
   Taradhi & Legal Dashboard v4 — Frappe Custom HTML Block (JS field)
   `root_element` is provided by Frappe (the block's shadow root).

   DocTypes / fields used (verified against your ERPNext):
   - Taradhi Cases : customer, amount, judgement_no, expected_collection, remarks,
                     order_no, sales_person, date, phone_number, email,
                     contact_person_name, first/second_session_date, time_1/2,
                     notes_from_first/second_session, payment_term,
                     first..sixth_payment, receive_payment_1..6, total_payment,
                     payment_status, remaining_balance, first/second_payment_date, upload_file
   - Court Cases   : customer_name, amount, judgement_no, expected_collection, remarks, creation
   - Customer      : name, customer_name, territory (= Location), custom_sales_person,
                     custom_collection_status, custom_customer_account_status, custom_phone
   - Legal Case List: customer (Link), party, amount (Data), order_no, assigned_lawyer, legal_case_authority (Select),
                     legal_case_status (Select), case_filing_date, sales_person (Link), remarks
   (Trademarks is intentionally NOT used.)

   Language: English / Arabic toggle (button in the top bar). Choice is remembered.
   ===================================================================== */
(function () {
  'use strict';

  var root = root_element;
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     1. SETTINGS  (safe to edit)
     ------------------------------------------------------------------ */
  var THEME_MODE = 'light';        // 'light' = always white UI  ·  'auto' = follow the ERPNext desk theme (light/dark)
  var BRAND_NAME = 'Taradhi & Legal Dashboard'; // title in the top bar
  var BRAND_MARK = 'DM';           // letters shown in the logo square (used when LOGO_URL is empty)
  var LOGO_URL = '';               // e.g. '/files/logo.png' — leave '' to show the "DM" mark
  var DUE_SOON_DAYS = 14;          // "due soon" window for expected collections
  var SESSION_LOOKAHEAD_DAYS = 30; // upcoming court sessions window
  var REPORT_NAME = 'Taradhi Case Payment Report';
  var CURRENCY = (window.frappe && frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.currency) || 'SAR';

  var DT = { taradhi: 'Taradhi Cases', court: 'Court Cases', legal: 'Legal Case List', customer: 'Customer' };
  // Legal Case Status values that count as finished (everything else, e.g. "Opened", counts as open)
  var LEGAL_CLOSED_RE = /clos|settl|complet|dismiss|withdraw|finish|resolv|archiv|won|decided|executed/i;

  var FIELDS = {
    taradhi: [
      'name', 'docstatus', 'modified', 'customer', 'amount', 'judgement_no', 'expected_collection', 'remarks',
      'order_no', 'sales_person', 'date', 'phone_number', 'email', 'contact_person_name',
      'first_session_date', 'time_1', 'notes_from_first_session',
      'second_session_date', 'time_2', 'notes_from_second_session',
      'payment_term', 'first_payment', 'second_payment', 'third_payment', 'fourth_payment', 'fifth_payment', 'sixth_payment',
      'receive_payment_1', 'receive_payment_2', 'receive_payment_3', 'receive_payment_4', 'receive_payment_5', 'receive_payment_6',
      'total_payment', 'payment_status', 'remaining_balance', 'first_payment_date', 'second_payment_date', 'upload_file'
    ],
    court: ['name', 'docstatus', 'modified', 'creation', 'customer_name', 'amount', 'judgement_no', 'expected_collection', 'remarks'],
    legal: ['name', 'docstatus', 'modified', 'creation', 'case_filing_date', 'order_no', 'amount', 'assigned_lawyer', 'customer', 'legal_case_authority', 'remarks', 'party', 'sales_person', 'legal_case_status'],
    customer: ['name', 'customer_name', 'territory', 'custom_sales_person', 'custom_collection_status', 'custom_customer_account_status', 'custom_phone']
  };

  var PAY_STATUS = {
    'Paid':     { cls: 'b-ok',    color: 'var(--c-ok)' },
    'Partial':  { cls: 'b-warn',  color: 'var(--c-warn)' },
    'Not Paid': { cls: 'b-bad',   color: 'var(--c-bad)' },
    'Lost':     { cls: 'b-slate', color: 'var(--c-slate)' },
    'Unset':    { cls: 'b-slate', color: 'var(--c-muted)' }
  };
  var COLL_STATUS = {
    'Normal':    { cls: 'b-ok' },
    'Follow up': { cls: 'b-warn' },
    'Escalated': { cls: 'b-bad' },
    'Critical':  { cls: 'b-bad' }
  };
  var ACCT_STATUS = {
    'Active':  { cls: 'b-ok' },
    'Blocked': { cls: 'b-bad' },
    'Legal':   { cls: 'b-warn' }
  };
  var BUCKETS = [
    { k: 'current', label: 'Not yet due', color: 'var(--c-ok)' },
    { k: 'd30',     label: '1–30 days',   color: 'var(--c-lime)' },
    { k: 'd60',     label: '31–60 days',  color: 'var(--c-warn)' },
    { k: 'd90',     label: '61–90 days',  color: 'var(--c-orange)' },
    { k: 'd180',    label: '91–180 days', color: 'var(--c-bad)' },
    { k: 'd180p',   label: '> 180 days',  color: 'var(--c-deep)' },
    { k: 'nodate',  label: 'No date',     color: 'var(--c-muted)' }
  ];
  var TAB_LABELS = {
    overview:  ['grid',  'Overview'],
    taradhi:   ['file',  'Taradhi cases'],
    court:     ['bank',  'Court cases'],
    legal:     ['scale', 'Legal cases'],
    customers: ['users', 'Customers']
  };

  /* ------------------------------------------------------------------
     1b. LANGUAGE  (English / Arabic)
     ------------------------------------------------------------------ */
  var LANG = 'en';
  try { var savedLang = localStorage.getItem('tld-lang'); if (savedLang === 'ar' || savedLang === 'en') LANG = savedLang; } catch (e) { /* ignore */ }

  var AR = {
    /* legal cases (Legal Case List) */
    'Legal cases': 'القضايا القانونية', 'Legal Case List': 'قائمة القضايا القانونية', 'Legal list': 'القضايا القانونية',
    'Legal Cases': 'القضايا القانونية', 'Cases filed with legal authorities and assigned lawyers': 'القضايا المرفوعة لدى الجهات القانونية والمحامون المكلفون',
    'Open legal cases': 'القضايا القانونية المفتوحة', 'Legal claim (open)': 'المطالبات القانونية (المفتوحة)', 'Open cases': 'القضايا المفتوحة', 'of {0} cases': 'من {0} قضية',
    '{0} under legal action · {1} {2}': '{0} قيد الإجراء القانوني · {1} {2}', 'Oldest filed {0} ago · {1}': 'الأقدم رُفعت منذ {0} · {1}',
    'Legal cases by status': 'القضايا القانونية حسب الحالة', 'Cases and amount': 'عدد القضايا والمبلغ',
    'Legal cases by authority': 'القضايا القانونية حسب الجهة', 'Amount by court / authority': 'المبلغ حسب المحكمة / الجهة',
    'Cases by assigned lawyer': 'القضايا حسب المحامي المكلّف', 'Amount by lawyer · open cases': 'المبلغ حسب المحامي · القضايا المفتوحة',
    'Longest-open cases': 'القضايا الأطول بقاءً مفتوحة', 'Open legal cases ordered by days since filing': 'القضايا القانونية المفتوحة مرتبة حسب الأيام منذ رفعها',
    'Open': 'مفتوحة', 'Closed': 'مغلقة', 'Opened': 'مفتوحة', 'Open amount': 'المبلغ المفتوح', 'Average age of open cases': 'متوسط عمر القضايا المفتوحة',
    'All legal statuses': 'كل حالات القضايا', 'Open only': 'المفتوحة فقط',
    'Party': 'الطرف', 'Authority': 'الجهة', 'Lawyer': 'المحامي', 'Filed': 'تاريخ الرفع', 'Age': 'العمر', 'Unspecified': 'غير محدد',
    'Filed {0}': 'رُفعت {0}', 'Legal case details': 'تفاصيل القضية القانونية', 'Legal case authority': 'الجهة القضائية', 'Assigned lawyer': 'المحامي المكلّف',
    'Order no': 'رقم الأمر', 'Legal case status': 'حالة القضية', 'Case filing date': 'تاريخ رفع القضية', 'Amount': 'المبلغ',
    'No open legal cases': 'لا قضايا قانونية مفتوحة', 'All legal cases are closed or none match the current filters.': 'جميع القضايا القانونية مغلقة أو لا توجد قضايا تطابق الفلاتر الحالية.',
    '{0} open': '{0} مفتوحة', 'Legal Case List (needed for the Legal cases tab)': 'قائمة القضايا القانونية (لتبويب القضايا القانونية)',
    'Legal cases: {0} open of {1} ({2} {3} open amount)': 'القضايا القانونية: {0} مفتوحة من {1} (المبلغ المفتوح {2} {3})',
    'Customer, party, lawyer, order no…': 'العميل، الطرف، المحامي، رقم الأمر…',
    ', Court Cases by creation date and Legal cases by filing date.': '، وقضايا المحكمة حسب تاريخ الإنشاء والقضايا القانونية حسب تاريخ الرفع.',
    /* brand / top bar */
    'Taradhi & Legal Dashboard': 'لوحة التراضي والقضايا القانونية',
    'Receivables, court cases and repayment follow-ups in one place.': 'المستحقات وقضايا المحكمة ومتابعات السداد في مكان واحد.',
    'Reports & lists': 'التقارير والقوائم',
    'Payment report': 'تقرير المدفوعات',
    'Taradhi list': 'قائمة التراضي',
    'Court list': 'قائمة المحكمة',
    'Overview': 'نظرة عامة',
    'Taradhi cases': 'قضايا التراضي',
    'Court cases': 'قضايا المحكمة',
    'Customers': 'العملاء',
    'Refresh': 'تحديث',
    'Copy summary': 'نسخ الملخص',
    'Copy management summary': 'نسخ ملخص الإدارة',
    'Loading…': 'جارٍ التحميل…',
    'Updated {0}': 'آخر تحديث {0}',
    'English': 'English',
    'عربي': 'عربي',
    'Switch language': 'تغيير اللغة',

    /* filters */
    'Search': 'بحث',
    'Customer, judgement no, sales person…': 'العميل، رقم الحكم، مندوب المبيعات…',
    'Date range': 'الفترة الزمنية',
    'All dates': 'كل التواريخ',
    'This month': 'هذا الشهر',
    'Last month': 'الشهر الماضي',
    'Last 30 days': 'آخر 30 يوماً',
    'Next 30 days': 'الـ 30 يوماً القادمة',
    'This quarter': 'هذا الربع',
    'This year': 'هذه السنة',
    'From': 'من',
    'To': 'إلى',
    'Apply': 'تطبيق',
    'Filters Taradhi cases by': 'تصفية قضايا التراضي حسب',
    'Expected Collection Date': 'تاريخ التحصيل المتوقع',
    'and Court Cases by creation date.': 'وقضايا المحكمة حسب تاريخ الإنشاء.',
    'Location': 'الموقع',
    'Salesperson': 'مندوب المبيعات',
    'All locations': 'كل المواقع',
    'All salespersons': 'كل المندوبين',
    'Reset': 'إعادة ضبط',
    'Unassigned': 'غير محدد',
    'Some data could not be loaded:': 'تعذّر تحميل بعض البيانات:',
    '. You may not have read permission for these DocTypes.': '. قد لا تملك صلاحية القراءة لهذه المستندات.',
    'Customer (needed for Location / sales person lookup)': 'العميل (مطلوب لمعرفة الموقع / مندوب المبيعات)',

    /* overview static */
    'Receivables aging': 'أعمار المستحقات',
    'Open balance by days past expected collection · click a bar to drill in': 'الرصيد المفتوح حسب أيام التأخر عن التحصيل المتوقع · انقر على عمود للتفاصيل',
    'Collection rate': 'نسبة التحصيل',
    'Collected ÷ total claim': 'المحصّل ÷ إجمالي المطالبة',
    'Payment status': 'حالة الدفع',
    'Cases and open balance': 'القضايا والرصيد المفتوح',
    'Expected collections by month': 'التحصيلات المتوقعة حسب الشهر',
    'Light bar = case total · solid bar = still outstanding': 'العمود الفاتح = إجمالي القضية · العمود الغامق = المتبقي',
    'Case total': 'إجمالي القضية',
    'Outstanding': 'المستحق',
    'Needs attention': 'يحتاج إلى اهتمام',
    'Items that should be actioned': 'بنود تتطلب إجراءً',
    'Outstanding by location': 'المستحق حسب الموقع',
    'Customer territory': 'منطقة العميل',
    'Sales person performance': 'أداء مندوبي المبيعات',
    'Open balance · % of claim collected': 'الرصيد المفتوح · % المحصّل من المطالبة',
    'Top outstanding balances': 'أعلى الأرصدة المستحقة',
    'By customer · share of total open balance': 'حسب العميل · حصته من إجمالي الرصيد المفتوح',
    'Customer repayment follow-up': 'متابعة سداد العملاء',
    'Customers with the largest overdue balances · next action is a suggestion based on days overdue': 'العملاء ذوو أكبر الأرصدة المتأخرة · الإجراء التالي مقترح بناءً على أيام التأخر',
    'View all overdue': 'عرض كل المتأخر',

    /* views static */
    'Taradhi Cases': 'قضايا التراضي',
    'Settlement agreements, sessions and instalment collections': 'اتفاقيات التسوية والجلسات وتحصيل الأقساط',
    'Court Cases': 'قضايا المحكمة',
    'Judgements and expected collections': 'الأحكام والتحصيلات المتوقعة',
    'Everything owed per customer across Taradhi cases · click a row for the full picture': 'كل ما يستحق على كل عميل عبر قضايا التراضي · انقر على صف لعرض التفاصيل',
    'Export CSV': 'تصدير CSV',
    'Open list': 'فتح القائمة',
    'New': 'جديد',

    /* statuses */
    'Paid': 'مدفوع', 'Partial': 'جزئي', 'Not Paid': 'غير مدفوع', 'Lost': 'خسارة', 'Unset': 'غير محدد', 'No status': 'بدون حالة',
    'Normal': 'عادي', 'Follow up': 'متابعة', 'Escalated': 'مصعّد', 'Critical': 'حرج',
    'Active': 'نشط', 'Blocked': 'محظور', 'Legal': 'قانوني',
    'Draft': 'مسودة', 'Submitted': 'معتمد', 'Cancelled': 'ملغى',
    'Received': 'مستلم', 'Pending': 'معلّق',

    /* aging buckets */
    'Not yet due': 'غير مستحق بعد', '1–30 days': '1–30 يوماً', '31–60 days': '31–60 يوماً', '61–90 days': '61–90 يوماً',
    '91–180 days': '91–180 يوماً', '> 180 days': 'أكثر من 180 يوماً', 'No date': 'بدون تاريخ',
    'Aging:': 'العمر:',

    /* KPI band */
    'Taradhi · Receivables': 'التراضي · المستحقات',
    'Total outstanding': 'إجمالي المستحق',
    'Overdue amount': 'المبلغ المتأخر',
    'Overdue %': 'نسبة المتأخر',
    'Collected': 'المحصّل',
    'Amount claimed': 'المبلغ المطالب به',
    'Judgement value': 'قيمة الحكم',
    '{0} lost excl.': '{0} خسائر مستبعدة',
    '{0} with open balance': '{0} لديهم رصيد مفتوح',
    'of outstanding': 'من المستحق',
    '{0}% of {1} claim': '{0}% من مطالبة {1}',
    'SAR': 'ر.س',

    /* insights */
    '{0}% of open balance sits with {1} customers': '{0}% من الرصيد المفتوح لدى {1} عملاء',
    'Largest: {0} · {1} {2}': 'الأكبر: {0} · {1} {2}',
    '{0} overdue by more than 90 days': '{0} متأخرة لأكثر من 90 يوماً',
    '{0} {1} · consider escalation to legal': '{0} {1} · يُنصح بالتصعيد إلى الإدارة القانونية',
    '{0} {1} due in the next {2} days': '{0} {1} مستحقة خلال الأيام الـ {2} القادمة',
    '{0} expected to pay': '{0} متوقع سدادها',
    '{0} without an expected date': '{0} بدون تاريخ متوقع',
    'Set an Expected Collection Date so aging can be tracked': 'حدّد تاريخ التحصيل المتوقع لتتبع أعمار الديون',
    'Average {0} days overdue': 'متوسط التأخر {0} يوماً',
    'Weighted by balance across {0}': 'موزون بالرصيد عبر {0}',
    'Everything looks on track': 'كل شيء على المسار الصحيح',
    'No overdue or high-risk items for the current filters.': 'لا توجد بنود متأخرة أو عالية المخاطر للتصفية الحالية.',
    'Overdue > 90 days': 'متأخر أكثر من 90 يوماً',
    'Critical (> {0} days overdue)': 'حرج (متأخر أكثر من {0} يوماً)',
    'Escalated ({0}-{1} days overdue)': 'مصعّد (متأخر من {0} إلى {1} يوماً)',
    '{0} critical: overdue by more than {1} days': '{0} حرجة: متأخرة لأكثر من {1} يوماً',
    '{0} {1} · escalate to legal now': '{0} {1} · صعّد إلى الإدارة القانونية الآن',
    'Escalation': 'التصعيد', 'Escalation (by days overdue)': 'التصعيد (حسب أيام التأخر)', 'auto': 'تلقائي', 'No access to': 'لا توجد صلاحية للوصول إلى', 'Request timed out': 'انتهت مهلة الطلب',
    'Due in next {0} days': 'مستحق خلال الأيام الـ {0} القادمة',
    'No expected date': 'بدون تاريخ متوقع',

    /* charts */
    'Nothing outstanding': 'لا يوجد مستحق',
    'No open balances for the current filters.': 'لا توجد أرصدة مفتوحة للتصفية الحالية.',
    'Collection rate {0}%': 'نسبة التحصيل {0}%',
    'collected': 'محصّل',
    'Claim': 'المطالبة',
    'No cases': 'لا توجد قضايا',
    'Nothing matches the current filters.': 'لا يوجد ما يطابق التصفية الحالية.',
    'No scheduled collections': 'لا توجد تحصيلات مجدولة',
    'No case has an Expected Collection Date in this window.': 'لا توجد قضية لها تاريخ تحصيل متوقع في هذه الفترة.',
    'total': 'الإجمالي',
    'outstanding': 'المستحق',
    'No data': 'لا توجد بيانات',
    'Nothing to show for the current filters.': 'لا شيء لعرضه للتصفية الحالية.',
    'No outstanding balances.': 'لا توجد أرصدة مستحقة.',
    'No data for the current filters.': 'لا توجد بيانات للتصفية الحالية.',
    '{0}% collected': '{0}% محصّل',

    /* alerts */
    'Overdue': 'متأخر',
    'Due soon': 'مستحق قريباً',
    'Sessions': 'الجلسات',
    'Data checks': 'فحص البيانات',
    'Expected {0} · {1}': 'المتوقع {0} · {1}',
    '{0} late': 'متأخر {0}',
    'All clear': 'لا شيء معلّق',
    'No collections are past their expected date.': 'لا توجد تحصيلات تجاوزت تاريخها المتوقع.',
    'Nothing due soon': 'لا شيء مستحق قريباً',
    'No balances fall due in the next {0} days.': 'لا توجد أرصدة تستحق خلال الأيام الـ {0} القادمة.',
    'Today': 'اليوم',
    'Tomorrow': 'غداً',
    'In {0} days': 'خلال {0} أيام',
    'No upcoming sessions': 'لا توجد جلسات قادمة',
    'Nothing scheduled in the next {0} days.': 'لا شيء مجدول خلال الأيام الـ {0} القادمة.',
    'First session': 'الجلسة الأولى',
    'Second session': 'الجلسة الثانية',
    'at': 'الساعة',
    'Looks clean': 'البيانات سليمة',
    'No data inconsistencies detected.': 'لم يتم اكتشاف أي تعارض في البيانات.',
    'Marked “Paid” but {0} {1} balance remains': 'مسجّلة «مدفوع» لكن يتبقى رصيد {0} {1}',
    'Over-collected by {0} {1}': 'تم تحصيل مبلغ زائد قدره {0} {1}',
    'Balance outstanding but no Expected Collection Date': 'يوجد رصيد مستحق بدون تاريخ تحصيل متوقع',
    'Payment Status is empty': 'حالة الدفع فارغة',
    'Customer not matched to a Customer record (no Location)': 'لم تتم مطابقة العميل مع سجل عميل (بدون موقع)',

    /* next actions */
    'Review / write-off': 'مراجعة / شطب',
    'Confirm payment date': 'تأكيد موعد الدفع',
    'Send payment reminder': 'إرسال تذكير بالدفع',
    'Call and follow up': 'الاتصال والمتابعة',
    'Share settlement options': 'عرض خيارات التسوية',
    'Escalate to management': 'التصعيد إلى الإدارة',
    'Escalate to legal': 'التصعيد إلى الإدارة القانونية',

    /* follow-up table + tables */
    'Customer': 'العميل',
    'Days overdue': 'أيام التأخر',
    'Suggested next action': 'الإجراء التالي المقترح',
    'Status': 'الحالة',
    'Nothing to follow up': 'لا شيء للمتابعة',
    'Sales person': 'مندوب المبيعات',
    'Total': 'الإجمالي',
    'Balance': 'الرصيد',
    'Expected': 'المتوقع',
    '{0} overdue': 'متأخر {0}',
    'All payment statuses': 'كل حالات الدفع',
    'Overdue only': 'المتأخر فقط',
    'All document states': 'كل حالات المستند',
    'Judgement no': 'رقم الحكم',
    'Amount': 'المبلغ',
    'Expected collection': 'التحصيل المتوقع',
    'Remarks': 'ملاحظات',
    'State': 'الحالة',
    'All collection statuses': 'كل حالات التحصيل',
    'With overdue only': 'مع المتأخر فقط',
    'Total claim': 'إجمالي المطالبة',
    'Max days late': 'أقصى أيام تأخر',
    'Collection status': 'حالة التحصيل',
    'Account': 'الحساب',
    'Filter': 'تصفية',
    'No records found': 'لا توجد سجلات',
    'Try changing the filters.': 'جرّب تغيير التصفية.',
    'No records match the current dashboard filters.': 'لا توجد سجلات تطابق تصفية اللوحة الحالية.',
    'of {0}': 'من {0}',
    'Showing {0}–{1} of {2}': 'عرض {0}–{1} من {2}',

    /* mini KPIs */
    'Cases': 'القضايا',
    'Total amount': 'إجمالي المبلغ',
    'With open balance': 'لديهم رصيد مفتوح',
    'With overdue': 'لديهم متأخرات',
    'Flagged Follow up / Escalated / Critical': 'مُعلَّم: متابعة / مصعّد / حرج',

    /* drawer */
    'Close': 'إغلاق',
    'Not matched': 'غير مطابق',
    'Judgement {0} · {1}': 'الحكم {0} · {1}',
    'Judgement': 'الحكم',
    'Received ': 'المستلم ',
    'Collection status ': 'حالة التحصيل ',
    '{0}% of {1} {2} collected': '{0}% من {1} {2} محصّل',
    'up to {0} overdue': 'حتى {0} تأخر',
    'suggested:': 'المقترح:',
    'Case details': 'تفاصيل القضية',
    'Account status': 'حالة الحساب',
    'Phone': 'الهاتف',
    'Customer record': 'سجل العميل',
    'Cases ': 'القضايا ',
    'Sales order': 'أمر البيع',
    'Customer collection status': 'حالة تحصيل العميل',
    'Amount requested': 'تاريخ طلب المبلغ',
    'Payment terms': 'شروط الدفع',
    'Contact': 'جهة الاتصال',
    'Email': 'البريد الإلكتروني',
    'Payment schedule': 'جدول الدفعات',
    'Planned': 'المخطط',
    'Date': 'التاريخ',
    'No sessions recorded.': 'لا توجد جلسات مسجّلة.',
    'Attachment': 'المرفق',
    'Open in ERPNext': 'فتح في ERPNext',
    'Open customer': 'فتح العميل',
    'Copy reminder text': 'نسخ نص التذكير',
    'Created': 'تاريخ الإنشاء',
    'WhatsApp': 'واتساب',
    'Record details': 'تفاصيل السجل',

    /* copy / summary */
    'Summary copied': 'تم نسخ الملخص',
    'Reminder text copied': 'تم نسخ نص التذكير',
    'Copied': 'تم النسخ',
    'Dear {0},\n\nThis is a kind reminder that {1} {2} is outstanding{3}{4}. Please arrange the payment or contact us to agree a schedule.\n\nThank you.':
      'عزيزي {0}،\n\nنود تذكيركم بوجود مبلغ مستحق قدره {1} {2}{3}{4}. نرجو سداد المبلغ أو التواصل معنا للاتفاق على جدول سداد.\n\nشكراً لكم.',
    ' under judgement no. {0}': ' بموجب الحكم رقم {0}',
    ' (expected collection {0})': ' (تاريخ التحصيل المتوقع {0})',
    'Taradhi & Legal summary — {0}': 'ملخص التراضي والقضايا القانونية — {0}',
    '(filtered: {0})': '(بعد التصفية: {0})',
    'Outstanding: {0} {1} across {2} / {3}': 'المستحق: {0} {1} عبر {2} / {3}',
    'Overdue: {0} {1} ({2}% of outstanding, {3})': 'المتأخر: {0} {1} ({2}% من المستحق، {3})',
    'Collected: {0} {1} ({2}% of {3} claim)': 'المحصّل: {0} {1} ({2}% من مطالبة {3})',
    'Top balances: {0}': 'أعلى الأرصدة: {0}',
    'Court cases: {0} ({1} {2})': 'قضايا المحكمة: {0} ({1} {2})',

    /* footer */
    'Showing {0} of {1} Taradhi cases · Location matched from Customer for {2} of {3} cases': 'عرض {0} من {1} قضية تراضي · تمت مطابقة الموقع من سجل العميل لـ {2} من {3} قضية',
    'Confidential · {0} · data as of {1}': 'سري · {0} · البيانات حتى {1}'
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var MONTHS_AR_SHORT = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
  function mon(i) { return LANG === 'ar' ? MONTHS_AR[i] : MONTHS[i]; }
  function monShort(i) { return LANG === 'ar' ? MONTHS_AR_SHORT[i] : MONTHS[i]; }

  function tr(s) { return (LANG === 'ar' && AR.hasOwnProperty(s)) ? AR[s] : s; }
  function tf(s, a) {
    return tr(s).replace(/\{(\d+)\}/g, function (m, i) { return (a && a[+i] != null) ? a[+i] : ''; });
  }
  function cur() { return tr(CURRENCY); }

  // Arabic noun forms: [singular, dual, plural(3-10 / 0)]
  var PL = {
    'case': ['حالة', 'حالتان', 'حالات'],
    'open case': ['حالة مفتوحة', 'حالتان مفتوحتان', 'حالات مفتوحة'],
    'submitted': ['معتمدة', 'معتمدتان', 'معتمدة'],
    'day': ['يوم', 'يومان', 'أيام'],
    'record': ['سجل', 'سجلان', 'سجلات'],
    'instalment': ['قسط', 'قسطان', 'أقساط'],
    'Taradhi case': ['قضية تراضي', 'قضيتا تراضي', 'قضايا تراضي'],
    'customer': ['عميل', 'عميلان', 'عملاء'],
    'legal case': ['قضية قانونية', 'قضيتان قانونيتان', 'قضايا قانونية']
  };

  /* ------------------------------------------------------------------
     2. HELPERS
     ------------------------------------------------------------------ */
  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M21 9h-5a2 2 0 0 0 0 4h5z"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.01"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 5a3.5 3.5 0 0 1 0 7M22 20c0-2.5-1.5-4.5-4-5.5"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    scale: '<path d="M12 3v18M6 21h12M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'
  };
  function icon(n, small) {
    return '<svg class="ico' + (small ? ' ico-sm' : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) {
    if (v == null || v === '') return 0;
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function money(n) { return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function money2(n) { return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function compact(n) {
    n = Number(n) || 0;
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
    return money(n);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return ds(new Date()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ds(d); }
  function parseDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
    return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  }
  function fmtDate(s) { var d = parseDate(s); return d ? d.getDate() + ' ' + mon(d.getMonth()) + ' ' + d.getFullYear() : '—'; }
  function daysBetween(a, b) {
    var A = parseDate(a), B = parseDate(b);
    return (A && B) ? Math.round((B - A) / 86400000) : null;
  }
  function fmtTime(t) { return t ? String(t).slice(0, 5) : ''; }
  function plural(n, one, many) {
    if (LANG === 'ar' && PL[one]) {
      var f = PL[one], w = n === 2 ? f[1] : ((n >= 3 && n <= 10) || n === 0) ? f[2] : f[0];
      return n + ' ' + w;
    }
    return n + ' ' + (n === 1 ? one : many || one + 's');
  }
  function docLabel(d) { return d === 1 ? 'Submitted' : d === 2 ? 'Cancelled' : 'Draft'; }
  function docCls(d) { return d === 1 ? 'b-ok' : d === 2 ? 'b-bad' : 'b-slate'; }
  function badge(text, map) {
    var m = (map && map[text]) || { cls: 'b-slate' };
    return '<span class="badge ' + m.cls + '">' + esc(tr(text)) + '</span>';
  }
  function sum(arr, key) { return arr.reduce(function (s, r) { return s + (r[key] || 0); }, 0); }
  function emptyState(title, text) { return '<div class="empty"><b>' + esc(tr(title)) + '</b>' + esc(tr(text || '')) + '</div>'; }
  function locTag(loc) { return '<span class="loc-tag">' + icon('pin') + esc(tr(loc || 'Unassigned')) + '</span>'; }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  var TODAY = todayStr();
  var DEFAULT_FILTERS = { q: '', from: '', to: '', preset: 'all', location: 'all', sales: 'all' };
  var state = {
    raw: { taradhi: [], court: [], legal: [], customers: [] },
    view: { taradhi: [], court: [], legal: [] },
    custAgg: [],
    filters: Object.assign({}, DEFAULT_FILTERS),
    loaded: false, tab: 'overview', tables: {}, alertTab: 'overdue', alerts: {}, matched: 0, errors: [], updated: ''
  };

  /* ------------------------------------------------------------------
     3. DATA
     ------------------------------------------------------------------ */
  var REQ_TIMEOUT = 90000;
  /* Direct, silent API call: no Frappe popups, always settles (timeout), clear "No access to X" on 403. */
  function fetchList(key, withDocstatus) {
    return new Promise(function (resolve, reject) {
      var done = false, ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { if (done) return; done = true; if (ctl) { try { ctl.abort(); } catch (x) { /* ignore */ } } reject(new Error(tr('Request timed out'))); }, REQ_TIMEOUT);
      var body = new URLSearchParams();
      body.append('doctype', DT[key]);
      body.append('fields', JSON.stringify(FIELDS[key]));
      body.append('filters', JSON.stringify(withDocstatus ? [['docstatus', '<', 2]] : []));
      body.append('limit_page_length', '20000');
      body.append('order_by', 'modified desc');
      fetch('/api/method/frappe.client.get_list', { method: 'POST', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined,
        headers: { 'X-Frappe-CSRF-Token': (window.frappe && frappe.csrf_token) || '', 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() })
        .then(function (r) { return r.text().then(function (txt) { return { r: r, txt: txt }; }); })
        .then(function (o) {
          if (done) return; done = true; clearTimeout(timer);
          var j = null; try { j = JSON.parse(o.txt); } catch (x) { /* ignore */ }
          if (o.r.ok && j && !j.exc) { resolve(j.message || []); return; }
          var ex = String((j && (j.exception || j.exc_type)) || '');
          var e = new Error((o.r.status === 401 || o.r.status === 403 || /permission/i.test(ex)) ? tr('No access to') + ' ' + DT[key] : (ex.split(':').slice(-1)[0].trim() || ('HTTP ' + o.r.status)));
          e.perm = /^No access|^لا توجد/.test(e.message); reject(e);
        })
        .catch(function (err) { if (done) return; done = true; clearTimeout(timer); reject(new Error((err && err.message) || 'Network error')); });
    });
  }

  /* --- Customer lookup (Taradhi "customer" is a plain text field) --- */
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
  var custIdx = { exact: {}, list: [], cache: {} };
  function buildCustIdx(list) {
    custIdx = { exact: {}, list: [], cache: {} };
    list.forEach(function (c) {
      [c.name, c.customer_name].forEach(function (n) { var k = norm(n); if (k && !custIdx.exact[k]) custIdx.exact[k] = c; });
      custIdx.list.push({ c: c, k: ' ' + norm(c.customer_name || c.name) + ' ' });
    });
  }
  function findCustomer(name) {
    var k = norm(name);
    if (!k || k.length < 3) return null;
    if (custIdx.cache.hasOwnProperty(k)) return custIdx.cache[k];
    var hit = custIdx.exact[k] || null;
    if (!hit) {                       // whole-word containment, only if it is unambiguous
      var pad_ = ' ' + k + ' ', hits = [];
      for (var i = 0; i < custIdx.list.length && hits.length < 2; i++) if (custIdx.list[i].k.indexOf(pad_) > -1) hits.push(custIdx.list[i].c);
      if (hits.length === 1) hit = hits[0];
    }
    custIdx.cache[k] = hit;
    return hit;
  }

  function bucketOf(r) {
    if (r._balance <= 0 || r._status === 'Lost') return null;
    if (!r.expected_collection) return 'nodate';
    if (!r._overdue) return 'current';
    var d = r._daysOverdue;
    return d <= 30 ? 'd30' : d <= 60 ? 'd60' : d <= 90 ? 'd90' : d <= 180 ? 'd180' : 'd180p';
  }

  /* Automatic escalation by days overdue (a manual Customer "Collection Status" can only raise it) */
  var ESC_DAYS = 90, CRIT_DAYS = 180, COLL_RANK = { '': 0, 'Normal': 0, 'Follow up': 1, 'Escalated': 2, 'Critical': 3 };
  function autoColl(days) { return days > CRIT_DAYS ? 'Critical' : days > ESC_DAYS ? 'Escalated' : ''; }
  function maxColl(a, b) { return (COLL_RANK[b || ''] || 0) > (COLL_RANK[a || ''] || 0) ? b : (a || ''); }

  function enrichTaradhi(r) {
    var c = findCustomer(r.customer);
    r._cust = c;
    r._location = (c && c.territory) || 'Unassigned';
    r._sales = r.sales_person || (c && c.custom_sales_person) || 'Unassigned';
    r._collStatus = (c && c.custom_collection_status) || '';
    r._phone = r.phone_number || (c && c.custom_phone) || '';
    r._amount = num(r.amount);
    r._total = num(r.total_payment) || r._amount;
    r._received = 0;
    for (var i = 1; i <= 6; i++) r._received += num(r['receive_payment_' + i]);
    r._balance = Math.max(num(r.remaining_balance), 0);
    r._status = r.payment_status || 'Unset';
    r._customer = r.customer || '—';
    r._overdue = !!(r.expected_collection && r.expected_collection < TODAY && r._balance > 0 && r._status !== 'Lost');
    r._daysOverdue = r._overdue ? daysBetween(r.expected_collection, TODAY) : 0;
    r._bucket = bucketOf(r);
    r._autoColl = autoColl(r._daysOverdue);
    r._collEff = maxColl(r._collStatus, r._autoColl);
    return r;
  }
  function enrichCourt(r) {
    var c = findCustomer(r.customer_name);
    r._cust = c;
    r._location = (c && c.territory) || 'Unassigned';
    r._sales = (c && c.custom_sales_person) || 'Unassigned';
    r._amount = num(r.amount);
    r._customer = r.customer_name || '—';
    return r;
  }

  function enrichLegal(r) {
    var c = findCustomer(r.customer);
    r._cust = c;
    r._location = (c && c.territory) || 'Unassigned';
    r._sales = r.sales_person || (c && c.custom_sales_person) || 'Unassigned';
    r._customer = (c && c.customer_name) || r.customer || '—';
    r._party = r.party || '';
    r._amount = num(r.amount);
    r._status = r.legal_case_status || 'Unset';
    r._open = !LEGAL_CLOSED_RE.test(r._status);
    r._authority = r.legal_case_authority || 'Unspecified';
    r._lawyer = r.assigned_lawyer || 'Unassigned';
    r._age = r.case_filing_date ? Math.max(daysBetween(r.case_filing_date, TODAY) || 0, 0) : null;
    return r;
  }
  function legalCls(r) { return !r._open ? 'b-ok' : r._status === 'Unset' ? 'b-slate' : 'b-warn'; }
  function legalBadge(r) { return '<span class="badge ' + legalCls(r) + '">' + esc(tr(r._status === 'Unset' ? 'No status' : r._status)) + '</span>'; }

  function renderBanner() {
    var b = $('#banner');
    if (state.errors.length) {
      b.hidden = false;
      b.innerHTML = '<b>' + esc(tr('Some data could not be loaded:')) + '</b> ' + esc(state.errors.map(tr).join(', ')) + esc(tr('. You may not have read permission for these DocTypes.'));
    } else { b.hidden = true; }
  }
  function renderUpdated() {
    $('#lastUpdated').textContent = state.updated ? tf('Updated {0}', [state.updated]) : tr('Loading…');
  }

  function load() {
    setLoading(true);
    var errors = [];
    var safe = function (key, withDs, label) {
      return fetchList(key, withDs).catch(function () { errors.push(label); return []; });
    };
    return Promise.all([
      safe('taradhi', true, DT.taradhi),
      safe('court', true, DT.court),
      safe('customer', false, 'Customer (needed for Location / sales person lookup)'),
      safe('legal', true, DT.legal)
    ]).then(function (res) {
      buildCustIdx(res[2]);
      state.raw.customers = res[2];
      state.raw.taradhi = res[0].map(enrichTaradhi);
      state.raw.court = res[1].map(enrichCourt);
      state.raw.legal = res[3].map(enrichLegal);
      refreshLegalOptions();
      state.matched = state.raw.taradhi.filter(function (r) { return r._cust; }).length;
      state.loaded = true;

      state.errors = errors;
      renderBanner();

      fillFilterOptions();
      applyFilters();
      state.updated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      renderUpdated();
      setLoading(false);
    });
  }

  function setLoading(on) {
    var b = $('#btnRefresh');
    b.classList.toggle('spin', on);
    b.disabled = on;
    if (on && !state.loaded) $('#kpiBand').innerHTML = '<div class="band-grp" style="grid-column:1/-1"><div class="skel" style="height:84px"></div></div>';
  }

  /* ------------------------------------------------------------------
     4. FILTERS
     ------------------------------------------------------------------ */
  function presetRange(p) {
    var now = new Date(), y = now.getFullYear(), m = now.getMonth(), q = Math.floor(m / 3);
    switch (p) {
      case 'thismonth': return [ds(new Date(y, m, 1)), ds(new Date(y, m + 1, 0))];
      case 'lastmonth': return [ds(new Date(y, m - 1, 1)), ds(new Date(y, m, 0))];
      case 'last30': return [addDays(-30), TODAY];
      case 'next30': return [TODAY, addDays(30)];
      case 'quarter': return [ds(new Date(y, q * 3, 1)), ds(new Date(y, q * 3 + 3, 0))];
      case 'year': return [y + '-01-01', y + '-12-31'];
      default: return ['', ''];
    }
  }
  var PRESET_NAMES = { all: 'All dates', thismonth: 'This month', lastmonth: 'Last month', last30: 'Last 30 days', next30: 'Next 30 days', quarter: 'This quarter', year: 'This year' };

  function passes(r, kind) {
    var f = state.filters;
    if (f.location !== 'all' && r._location !== f.location) return false;
    if (f.sales !== 'all' && r._sales !== f.sales) return false;
    if (f.from || f.to) {
      var d = kind === 'court' ? String(r.creation || '').slice(0, 10) : kind === 'legal' ? (r.case_filing_date || '') : (r.expected_collection || '');
      if (!d) return false;
      if (f.from && d < f.from) return false;
      if (f.to && d > f.to) return false;
    }
    if (f.q) {
      var hay = (kind === 'legal' ? [r._customer, r.customer, r._party, r.name, r.order_no, r._lawyer, r._authority, r._sales, r._location, r.remarks] : [r._customer, r.judgement_no, r.name, r._sales, r._location, r.remarks]).join(' ').toLowerCase();
      if (hay.indexOf(f.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function buildCustAgg(T) {
    var m = {};
    T.forEach(function (r) {
      var g = m[r._customer] || (m[r._customer] = {
        name: r._customer, location: r._location, sales: r._sales, cases: 0, total: 0, collected: 0, out: 0, over: 0, days: 0,
        coll: r._collStatus, acct: (r._cust && r._cust.custom_customer_account_status) || '', phone: r._phone, cust: r._cust, rows: []
      });
      g.cases++; g.total += r._total; g.collected += r._received;
      if (r._status !== 'Lost') g.out += r._balance;
      if (r._overdue) { g.over += r._balance; if (r._daysOverdue > g.days) g.days = r._daysOverdue; }
      if (!g.phone && r._phone) g.phone = r._phone;
      if (!g.coll && r._collStatus) g.coll = r._collStatus;
      g.rows.push(r);
    });
    return Object.keys(m).map(function (k) {
      var g = m[k]; g.collManual = g.coll; g.coll = maxColl(g.coll, autoColl(g.days)); g.collAuto = g.coll !== (g.collManual || '') && !!g.coll;
      return g;
    });
  }

  function applyFilters() {
    state.view.taradhi = state.raw.taradhi.filter(function (r) { return passes(r); });
    state.view.court = state.raw.court.filter(function (r) { return passes(r, 'court'); });
    state.view.legal = state.raw.legal.filter(function (r) { return passes(r, 'legal'); });
    state.custAgg = buildCustAgg(state.view.taradhi);
    updateFilterUI();
    renderAll();
  }

  function activeFilterCount() {
    var f = state.filters;
    return (f.q ? 1 : 0) + ((f.from || f.to) ? 1 : 0) + (f.location !== 'all' ? 1 : 0) + (f.sales !== 'all' ? 1 : 0);
  }

  function updateFilterUI() {
    var f = state.filters, label;
    if (!f.from && !f.to) label = tr('All dates');
    else if (PRESET_NAMES[f.preset]) label = tr(PRESET_NAMES[f.preset]);
    else label = (f.from ? fmtDate(f.from) : '…') + ' – ' + (f.to ? fmtDate(f.to) : '…');
    $('#drLabel').textContent = label;
    $$('[data-preset]').forEach(function (b) { b.classList.toggle('active', b.dataset.preset === f.preset); });
    $('#drFrom').value = f.from; $('#drTo').value = f.to;
    $('#fLocation').value = f.location; $('#fSales').value = f.sales;
    var n = activeFilterCount(), rb = $('#btnReset');
    rb.hidden = n === 0;
    rb.innerHTML = icon('reset', true) + '<span>' + esc(tr('Reset')) + '</span><span class="n">' + n + '</span>';
  }

  function optionList(sel, all, values, current) {
    sel.innerHTML = '<option value="all">' + esc(all) + '</option>' + values.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(tr(v)) + '</option>';
    }).join('');
    var ok = current === 'all' || values.indexOf(current) > -1;
    sel.value = ok ? current : 'all';
    return ok ? current : 'all';
  }
  function distinct(arr, key) {
    var m = {};
    arr.forEach(function (r) { m[r[key]] = 1; });
    var v = Object.keys(m).filter(function (x) { return x !== 'Unassigned'; }).sort();
    if (m['Unassigned']) v.push('Unassigned');
    return v;
  }
  function fillFilterOptions() {
    var all = state.raw.taradhi.concat(state.raw.court, state.raw.legal);
    state.filters.location = optionList($('#fLocation'), tr('All locations'), distinct(all, '_location'), state.filters.location);
    state.filters.sales = optionList($('#fSales'), tr('All salespersons'), distinct(all, '_sales'), state.filters.sales);
  }
  function setDateRange(from, to, preset) {
    state.filters.from = from; state.filters.to = to; state.filters.preset = preset;
    $('#drPop').hidden = true;
    applyFilters();
  }

  /* ------------------------------------------------------------------
     5. CHART PRIMITIVES
     ------------------------------------------------------------------ */
  function plotHtml(cols, labels, max, h) {
    var gl = [0, 0.25, 0.5, 0.75, 1].map(function (t) {
      return '<i class="gl' + (t === 0 ? ' zero' : '') + '" style="bottom:' + (t * 100) + '%"></i><span class="yl" style="bottom:' + (t * 100) + '%">' + (t === 0 ? '0' : compact(max * t)) + '</span>';
    }).join('');
    var tpl = 'grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))';
    return '<div class="plot" style="height:' + h + 'px"><div class="pa">' + gl + '<div class="bars" style="' + tpl + '">' + cols.join('') + '</div></div>' +
      '<div class="xl" style="' + tpl + '">' + labels.join('') + '</div></div>';
  }

  function hbars(items, opts) {
    opts = opts || {};
    if (!items.length) return emptyState('No data', opts.empty || 'Nothing to show for the current filters.');
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
    return '<div class="hbars">' + items.map(function (i) {
      var w = Math.max((i.value / max) * 100, 2);
      return '<div class="hbar-row"><div class="top"><span class="nm" title="' + esc(i.label) + '">' + esc(i.label) + '</span>' +
        '<span class="vl">' + money(i.value) + (i.note ? ' <small>' + esc(i.note) + '</small>' : '') + '</span></div>' +
        '<div class="progress thin"><i class="' + (opts.cls || 'p-bad') + '" style="width:' + w + '%"></i></div></div>';
    }).join('') + '</div>';
  }

  function groupAgg(arr, gkey) {
    var m = {};
    arr.forEach(function (r) {
      var k = r[gkey] || '—';
      var g = m[k] || (m[k] = { key: k, out: 0, collected: 0, total: 0, count: 0 });
      g.out += r._status === 'Lost' ? 0 : r._balance; g.collected += r._received; g.total += r._total; g.count++;
    });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.out - a.out; });
  }

  /* ------------------------------------------------------------------
     6. OVERVIEW
     ------------------------------------------------------------------ */
  function nextAction(days, overdue, lost) {
    if (lost) return tr('Review / write-off');
    if (!overdue) return tr('Confirm payment date');
    if (days <= 30) return tr('Send payment reminder');
    if (days <= 60) return tr('Call and follow up');
    if (days <= 90) return tr('Share settlement options');
    if (days <= 180) return tr('Escalate to management');
    return tr('Escalate to legal');
  }

  var EXTRA = {
    gt90:   { label: 'Overdue > 90 days', fn: function (r) { return r._overdue && r._daysOverdue > 90; } },
    crit:   { label: 'Critical (> {0} days overdue)', args: [CRIT_DAYS], fn: function (r) { return r._overdue && r._daysOverdue > CRIT_DAYS; } },
    escal:  { label: 'Escalated ({0}-{1} days overdue)', args: [ESC_DAYS + 1, CRIT_DAYS], fn: function (r) { return r._overdue && r._daysOverdue > ESC_DAYS && r._daysOverdue <= CRIT_DAYS; } },
    due14:  { label: 'Due in next {0} days', args: [DUE_SOON_DAYS], fn: function (r) { return r._balance > 0 && r._status !== 'Lost' && r.expected_collection && r.expected_collection >= TODAY && r.expected_collection <= addDays(DUE_SOON_DAYS); } },
    nodate: { label: 'No expected date', fn: function (r) { return r._bucket === 'nodate'; } }
  };

  function stats(T, C, L) {
    var live = T.filter(function (r) { return r._status !== 'Lost'; });
    L = L || [];
    var s = { T: T, C: C, L: L, live: live };
    s.legalOpen = L.filter(function (r) { return r._open; });
    s.legalOpenAmt = sum(s.legalOpen, '_amount');
    s.lostAmt = sum(T.filter(function (r) { return r._status === 'Lost'; }), '_balance');
    s.totalClaim = sum(T, '_total');
    s.collected = sum(T, '_received');
    s.outstanding = sum(live, '_balance');
    s.overdue = T.filter(function (r) { return r._overdue; });
    s.overdueAmt = sum(s.overdue, '_balance');
    s.rate = s.totalClaim ? Math.min(s.collected / s.totalClaim, 1) : 0;
    s.overPct = s.outstanding ? Math.round((s.overdueAmt / s.outstanding) * 100) : 0;
    s.openCases = live.filter(function (r) { return r._balance > 0; }).length;
    s.custCount = state.custAgg.length;
    s.custOpen = state.custAgg.filter(function (g) { return g.out > 0; }).length;
    return s;
  }

  function renderBand(s) {
    var a = [
      { tab: 'taradhi', icon: 'wallet', color: 'var(--c-warn)', label: 'Total outstanding', value: compact(s.outstanding), unit: cur(), sub: plural(s.openCases, 'open case') + (s.lostAmt ? ' · ' + tf('{0} lost excl.', [compact(s.lostAmt)]) : '') },
      { tab: 'customers', icon: 'users', color: 'var(--c-info)', label: 'Customers', value: s.custCount, sub: tf('{0} with open balance', [s.custOpen]) },
      { tab: 'taradhi', overdue: 1, icon: 'alert', color: 'var(--c-bad)', label: 'Overdue amount', value: compact(s.overdueAmt), unit: cur(), sub: plural(s.overdue.length, 'case') },
      { tab: 'taradhi', overdue: 1, icon: 'percent', color: 'var(--c-orange)', label: 'Overdue %', value: s.overPct + '%', sub: tr('of outstanding') },
      { tab: 'taradhi', icon: 'check', color: 'var(--c-ok)', label: 'Collected', value: compact(s.collected), unit: cur(), sub: tf('{0}% of {1} claim', [Math.round(s.rate * 100), compact(s.totalClaim)]) }
    ];
    var b = [
      { tab: 'court', icon: 'bank', color: 'var(--c-slate)', label: 'Court cases', value: s.C.length, sub: plural(s.C.filter(function (r) { return r.docstatus === 1; }).length, 'submitted') },
      { tab: 'court', icon: 'wallet', color: 'var(--c-slate)', label: 'Amount claimed', value: compact(sum(s.C, '_amount')), unit: cur(), sub: tr('Judgement value') }
    ];
    var c = [
      { tab: 'legal', icon: 'scale', color: 'var(--c-deep)', label: 'Open legal cases', value: s.legalOpen.length, sub: tf('of {0} cases', [s.L.length]) },
      { tab: 'legal', icon: 'wallet', color: 'var(--c-deep)', label: 'Legal claim (open)', value: compact(s.legalOpenAmt), unit: cur(), sub: tr('Open cases') }
    ];
    var m = function (x) {
      return '<button class="metric" data-goto="' + x.tab + '"' + (x.overdue ? ' data-overdue="1"' : '') + ' style="--mc:' + x.color + '" title="' + esc(x.value) + '">' +
        '<div class="ml">' + icon(x.icon) + esc(tr(x.label)) + '</div><div class="mv">' + x.value + (x.unit ? '<small>' + x.unit + '</small>' : '') + '</div><div class="ms">' + esc(x.sub) + '</div></button>';
    };
    $('#kpiBand').innerHTML =
      '<div class="band-grp"><div class="band-title">' + esc(tr('Taradhi · Receivables')) + '</div><div class="metrics" style="--n:' + a.length + '">' + a.map(m).join('') + '</div></div>' +
      '<div class="band-grp"><div class="band-title">' + esc(tr('Court cases')) + '</div><div class="metrics" style="--n:' + b.length + '">' + b.map(m).join('') + '</div></div>' +
      '<div class="band-grp"><div class="band-title">' + esc(tr('Legal cases')) + '</div><div class="metrics" style="--n:' + c.length + '">' + c.map(m).join('') + '</div></div>';
    $('#kpiBand').classList.add('three');
  }

  function buildInsights(s) {
    var res = [], out = s.outstanding;
    var cust = groupAgg(s.live, '_customer').filter(function (g) { return g.out > 0; });
    if (out > 0 && cust.length) {
      var top5 = cust.slice(0, 5), share = top5.reduce(function (t, g) { return t + g.out; }, 0) / out;
      res.push({ lvl: share >= 0.6 && cust.length > 5 ? 'warn' : 'info', icon: 'users', goto: 'customers',
        title: tf('{0}% of open balance sits with {1} customers', [Math.round(share * 100), Math.min(5, cust.length)]),
        text: tf('Largest: {0} · {1} {2}', [cust[0].key, compact(cust[0].out), cur()]) });
    }
    var gt90 = s.T.filter(EXTRA.gt90.fn);
    if (gt90.length) res.push({ lvl: 'bad', icon: 'alert', extra: 'gt90', title: tf('{0} overdue by more than 90 days', [plural(gt90.length, 'case')]), text: tf('{0} {1} · consider escalation to legal', [compact(sum(gt90, '_balance')), cur()]) });
    var crit = s.T.filter(EXTRA.crit.fn);
    if (crit.length) res.push({ lvl: 'bad', icon: 'alert', extra: 'crit', title: tf('{0} critical: overdue by more than {1} days', [plural(crit.length, 'case'), CRIT_DAYS]), text: tf('{0} {1} · escalate to legal now', [compact(sum(crit, '_balance')), cur()]) });
    var due = s.T.filter(EXTRA.due14.fn);
    if (due.length) res.push({ lvl: 'info', icon: 'calendar', extra: 'due14', title: tf('{0} {1} due in the next {2} days', [compact(sum(due, '_balance')), cur(), DUE_SOON_DAYS]), text: tf('{0} expected to pay', [plural(due.length, 'case')]) });
    var nod = s.T.filter(EXTRA.nodate.fn);
    if (nod.length) res.push({ lvl: 'warn', icon: 'clock', extra: 'nodate', title: tf('{0} without an expected date', [plural(nod.length, 'open case')]), text: tr('Set an Expected Collection Date so aging can be tracked') });
    if (s.legalOpen.length) {
      var oldest = s.legalOpen.slice().sort(function (a, b) { return (b._age || 0) - (a._age || 0); })[0];
      res.push({ lvl: 'warn', icon: 'scale', goto: 'legal', title: tf('{0} under legal action · {1} {2}', [plural(s.legalOpen.length, 'legal case'), compact(s.legalOpenAmt), cur()]),
        text: oldest && oldest._age != null ? tf('Oldest filed {0} ago · {1}', [plural(oldest._age, 'day'), oldest._customer]) : tr('Open legal cases') });
    }
    if (s.overdue.length) {
      var w = sum(s.overdue.map(function (r) { return { v: r._balance * r._daysOverdue }; }), 'v') / (s.overdueAmt || 1);
      res.push({ lvl: 'info', icon: 'trend', goto: 'taradhi', overdueFlag: 1, title: tf('Average {0} days overdue', [Math.round(w)]), text: tf('Weighted by balance across {0}', [plural(s.overdue.length, 'case')]) });
    }
    if (!res.length) res.push({ lvl: 'ok', icon: 'check', title: tr('Everything looks on track'), text: tr('No overdue or high-risk items for the current filters.') });
    return res.slice(0, 4);
  }

  function renderInsights(s) {
    $('#insights').innerHTML = buildInsights(s).map(function (i) {
      var at = i.extra ? ' data-extra="' + i.extra + '"' : i.goto ? ' data-goto="' + i.goto + '"' + (i.overdueFlag ? ' data-overdue="1"' : '') : '';
      return '<button class="ins ' + i.lvl + '"' + at + '><span class="ii">' + icon(i.icon) + '</span><span><span class="it">' + esc(i.title) + '</span><span class="id">' + esc(i.text || '') + '</span></span></button>';
    }).join('');
  }

  function renderOverview() {
    var s = stats(state.view.taradhi, state.view.court, state.view.legal);
    renderBand(s);
    renderInsights(s);
    renderAging(s.T);
    renderGauge(s);
    renderStatus(s.T);
    renderMonthly(s.T);
    renderAlerts();
    renderFollowUp(s.T);

    var loc = groupAgg(s.live, '_location').filter(function (g) { return g.out > 0; }).slice(0, 7);
    $('#byLocation').innerHTML = hbars(loc.map(function (g) { return { label: g.key === 'Unassigned' ? tr('Unassigned') : g.key, value: g.out, note: plural(g.count, 'case') }; }), { empty: 'No outstanding balances.' });

    var sales = groupAgg(s.T, '_sales').filter(function (g) { return g.out > 0 || g.collected > 0; }).slice(0, 6);
    $('#bySales').innerHTML = hbars(sales.map(function (g) { return { label: g.key === 'Unassigned' ? tr('Unassigned') : g.key, value: g.out, note: tf('{0}% collected', [g.total ? Math.round(Math.min(g.collected / g.total, 1) * 100) : 0]) }; }), { empty: 'No data for the current filters.', cls: 'p-ok' });

    var cust = groupAgg(s.live, '_customer').filter(function (g) { return g.out > 0; }).slice(0, 7);
    $('#topDebtors').innerHTML = hbars(cust.map(function (g) { return { label: g.key, value: g.out, note: (s.outstanding ? Math.round(g.out / s.outstanding * 100) : 0) + '%' }; }), { empty: 'No outstanding balances.' });

    var all = state.raw.taradhi.length;
    $('#foot').innerHTML = '<span>' + esc(tf('Showing {0} of {1} Taradhi cases · Location matched from Customer for {2} of {3} cases', [s.T.length, all, state.matched, all])) + '</span>' +
      '<span>' + esc(tf('Confidential · {0} · data as of {1}', [cur(), fmtDate(TODAY)])) + '</span>';
  }

  function renderAging(T) {
    var agg = {}, cnt = {};
    BUCKETS.forEach(function (b) { agg[b.k] = 0; cnt[b.k] = 0; });
    T.forEach(function (r) { if (r._bucket) { agg[r._bucket] += r._balance; cnt[r._bucket]++; } });
    var list = BUCKETS.filter(function (b) { return b.k !== 'nodate' || cnt.nodate > 0; });
    var mx = Math.max.apply(null, list.map(function (b) { return agg[b.k]; })) || 0;
    if (!mx) { $('#agingChart').innerHTML = emptyState('Nothing outstanding', 'No open balances for the current filters.'); return; }
    var max = niceMax(mx);
    var cols = list.map(function (b) {
      var h = agg[b.k] / max * 100;
      return '<button class="bcol" data-aging="' + b.k + '" style="--bc:' + b.color + '" title="' + esc(tr(b.label)) + ' — ' + money(agg[b.k]) + ' ' + esc(cur()) + ' · ' + plural(cnt[b.k], 'case') + '">' +
        '<span class="bv" style="bottom:calc(' + h + '% + 4px)">' + (agg[b.k] ? compact(agg[b.k]) : '') + '</span><div class="bar" style="height:' + h + '%"></div></button>';
    });
    var labels = list.map(function (b) { return '<span>' + esc(tr(b.label)) + '<small>' + plural(cnt[b.k], 'case') + '</small></span>'; });
    $('#agingChart').innerHTML = plotHtml(cols, labels, max, 300);
  }

  function renderGauge(s) {
    var pct = Math.round(s.rate * 100);
    $('#collectionGauge').innerHTML =
      '<div class="gauge"><svg viewBox="0 0 120 70" role="img" aria-label="' + esc(tf('Collection rate {0}%', [pct])) + '">' +
      '<path class="g-bg" d="M10 62 A50 50 0 0 1 110 62" pathLength="100"/>' +
      '<path class="g-fg" d="M10 62 A50 50 0 0 1 110 62" pathLength="100" stroke-dasharray="' + (pct || 0.01) + ' 100"/></svg>' +
      '<div class="g-txt"><b>' + pct + '%</b><span>' + esc(tr('collected')) + '</span></div></div>' +
      '<div class="g-sub"><span>' + esc(tr('Collected')) + ' <b>' + money(s.collected) + '</b></span><span>' + esc(tr('Claim')) + ' <b>' + money(s.totalClaim) + '</b></span></div>';
  }

  function renderStatus(T) {
    var order = ['Paid', 'Partial', 'Not Paid', 'Lost', 'Unset'];
    var rows = order.map(function (k) {
      var list = T.filter(function (r) { return r._status === k; });
      return { k: k, label: k === 'Unset' ? 'No status' : k, n: list.length, amt: sum(list, '_balance'), color: PAY_STATUS[k].color };
    });
    var total = rows.reduce(function (t, r) { return t + r.n; }, 0);
    if (!total) { $('#statusStack').innerHTML = emptyState('No cases', 'Nothing matches the current filters.'); return; }
    $('#statusStack').innerHTML =
      '<div class="stack">' + rows.filter(function (r) { return r.n; }).map(function (r) { return '<i style="flex:' + r.n + ';background:' + r.color + '" title="' + esc(tr(r.label)) + ': ' + r.n + '"></i>'; }).join('') + '</div>' +
      '<div class="stack-legend">' + rows.map(function (r) {
        return '<div class="sl-row"><span class="nm"><i style="background:' + r.color + '"></i>' + esc(tr(r.label)) + '</span><span class="n">' + r.n + '</span><span class="a">' + (r.amt ? compact(r.amt) : '—') + '</span></div>';
      }).join('') + '</div>';
  }

  function renderMonthly(T) {
    var now = new Date(), months = [], agg = {};
    for (var i = -5; i <= 6; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      var key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      months.push({ key: key, label: monShort(d.getMonth()), full: mon(d.getMonth()), now: i === 0, yr: d.getFullYear() });
      agg[key] = { total: 0, out: 0, n: 0 };
    }
    T.forEach(function (r) {
      var k = (r.expected_collection || '').slice(0, 7);
      if (agg[k]) { agg[k].total += r._total; agg[k].out += (r._status === 'Lost' ? 0 : r._balance); agg[k].n++; }
    });
    var mx = Math.max.apply(null, months.map(function (m) { return agg[m.key].total; })) || 0;
    if (!mx) { $('#monthlyChart').innerHTML = emptyState('No scheduled collections', 'No case has an Expected Collection Date in this window.'); return; }
    var max = niceMax(mx);
    var cols = months.map(function (m) {
      var a = agg[m.key], h = a.total / max * 100, inner = a.total ? Math.min(a.out / a.total * 100, 100) : 0;
      return '<div class="bcol" title="' + esc(m.full) + ' ' + m.yr + ' — ' + plural(a.n, 'case') + ' · ' + esc(tr('total')) + ' ' + money(a.total) + ' · ' + esc(tr('outstanding')) + ' ' + money(a.out) + ' ' + esc(cur()) + '">' +
        (a.total ? '<span class="bv" style="bottom:calc(' + h + '% + 4px)">' + compact(a.out) + '</span>' : '') +
        '<div class="bar soft" style="height:' + h + '%"><i style="height:' + inner + '%"></i></div></div>';
    });
    var labels = months.map(function (m) { return '<span' + (m.now ? ' class="now"' : '') + '>' + esc(m.label) + '</span>'; });
    $('#monthlyChart').innerHTML = plotHtml(cols, labels, max, 300);
  }

  /* ---- Needs attention ---- */
  function buildAlerts() {
    var T = state.view.taradhi;
    var overdue = T.filter(function (r) { return r._overdue; }).sort(function (a, b) { return b._balance - a._balance; });
    var due = T.filter(EXTRA.due14.fn).sort(function (a, b) { return a.expected_collection < b.expected_collection ? -1 : 1; });

    var sessions = [];
    T.forEach(function (r) {
      [['first_session_date', 'time_1', 'First session'], ['second_session_date', 'time_2', 'Second session']].forEach(function (p) {
        var d = r[p[0]];
        if (!d) return;
        var diff = daysBetween(TODAY, d);
        if (diff != null && diff >= 0 && diff <= SESSION_LOOKAHEAD_DAYS) sessions.push({ row: r, date: d, time: fmtTime(r[p[1]]), label: p[2], diff: diff });
      });
    });
    sessions.sort(function (a, b) { return a.diff - b.diff; });

    var checks = [];
    T.forEach(function (r) {
      if (r._status === 'Paid' && r._balance > 0) checks.push({ row: r, msg: tf('Marked “Paid” but {0} {1} balance remains', [money(r._balance), cur()]) });
      else if (num(r.remaining_balance) < 0) checks.push({ row: r, msg: tf('Over-collected by {0} {1}', [money(-num(r.remaining_balance)), cur()]) });
      else if (r._balance > 0 && !r.expected_collection) checks.push({ row: r, msg: tr('Balance outstanding but no Expected Collection Date') });
      else if (!r.payment_status && r._balance > 0) checks.push({ row: r, msg: tr('Payment Status is empty') });
      else if (!r._cust) checks.push({ row: r, msg: tr('Customer not matched to a Customer record (no Location)') });
    });
    state.alerts = { overdue: overdue, due: due, sessions: sessions, checks: checks };
  }

  function whenText(diff) { return diff === 0 ? tr('Today') : diff === 1 ? tr('Tomorrow') : tf('In {0} days', [diff]); }

  function renderAlerts() {
    buildAlerts();
    var A = state.alerts;
    var defs = [
      { k: 'overdue', label: 'Overdue', n: A.overdue.length, hot: true },
      { k: 'due', label: 'Due soon', n: A.due.length },
      { k: 'sessions', label: 'Sessions', n: A.sessions.length },
      { k: 'checks', label: 'Data checks', n: A.checks.length }
    ];
    $('#alertSeg').innerHTML = defs.map(function (d) {
      return '<button role="tab" data-alert="' + d.k + '" class="' + (state.alertTab === d.k ? 'active' : '') + '">' + esc(tr(d.label)) +
        '<span class="n' + (d.hot && d.n ? ' hot' : '') + '">' + d.n + '</span></button>';
    }).join('');

    var html = '';
    if (state.alertTab === 'overdue') {
      html = A.overdue.slice(0, 30).map(function (r) {
        return '<button class="alert-item" data-open="taradhi" data-name="' + esc(r.name) + '"><div class="l"><div class="t">' + esc(r._customer) + '</div>' +
          '<div class="s">' + esc(tf('Expected {0} · {1}', [fmtDate(r.expected_collection), tr(r._location)])) + '</div></div>' +
          '<div class="r"><div class="amt">' + money(r._balance) + '</div><span class="pill bad">' + esc(tf('{0} late', [plural(r._daysOverdue, 'day')])) + '</span></div></button>';
      }).join('') || emptyState('All clear', 'No collections are past their expected date.');
    } else if (state.alertTab === 'due') {
      html = A.due.slice(0, 30).map(function (r) {
        var diff = daysBetween(TODAY, r.expected_collection);
        return '<button class="alert-item" data-open="taradhi" data-name="' + esc(r.name) + '"><div class="l"><div class="t">' + esc(r._customer) + '</div>' +
          '<div class="s">' + esc(tf('Expected {0} · {1}', [fmtDate(r.expected_collection), tr(r._location)])) + '</div></div>' +
          '<div class="r"><div class="amt">' + money(r._balance) + '</div><span class="pill ' + (diff <= 3 ? 'warn' : 'info') + '">' + esc(whenText(diff)) + '</span></div></button>';
      }).join('') || emptyState('Nothing due soon', tf('No balances fall due in the next {0} days.', [DUE_SOON_DAYS]));
    } else if (state.alertTab === 'sessions') {
      html = A.sessions.map(function (x) {
        return '<button class="alert-item" data-open="taradhi" data-name="' + esc(x.row.name) + '"><div class="l"><div class="t">' + esc(x.row._customer) + '</div>' +
          '<div class="s">' + esc(tr(x.label)) + ' · ' + fmtDate(x.date) + (x.time ? ' ' + esc(tr('at')) + ' ' + x.time : '') + '</div></div>' +
          '<div class="r"><span class="pill ' + (x.diff <= 3 ? 'warn' : 'info') + '">' + esc(whenText(x.diff)) + '</span></div></button>';
      }).join('') || emptyState('No upcoming sessions', tf('Nothing scheduled in the next {0} days.', [SESSION_LOOKAHEAD_DAYS]));
    } else {
      html = A.checks.slice(0, 40).map(function (c) {
        return '<button class="alert-item" data-open="taradhi" data-name="' + esc(c.row.name) + '"><div class="l"><div class="t">' + esc(c.row._customer) + '</div>' +
          '<div class="s">' + esc(c.msg) + '</div></div><div class="r">' + badge(c.row._status === 'Unset' ? 'No status' : c.row._status, PAY_STATUS) + '</div></button>';
      }).join('') || emptyState('Looks clean', 'No data inconsistencies detected.');
    }
    $('#alertList').innerHTML = html;
  }

  /* ---- Customer repayment follow-up (bottom of Overview) ---- */
  function renderFollowUp(T) {
    var g = {};
    T.forEach(function (r) {
      if (r._status === 'Lost' || r._balance <= 0) return;
      var x = g[r._customer] || (g[r._customer] = { name: r._customer, loc: r._location, out: 0, over: 0, days: 0, cases: 0, worst: null, coll: r._collStatus });
      x.out += r._balance; x.cases++;
      if (r._overdue) { x.over += r._balance; if (r._daysOverdue > x.days) x.days = r._daysOverdue; }
      if (!x.worst || r._balance > x.worst._balance) x.worst = r;
      if (!x.coll && r._collStatus) x.coll = r._collStatus;
    });
    var arr = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return (b.over - a.over) || (b.out - a.out); }).slice(0, 8);
    if (!arr.length) { $('#followUp').innerHTML = emptyState('Nothing to follow up', 'No open balances for the current filters.'); return; }
    $('#followUp').innerHTML = '<div class="tbl-wrap"><table class="fu-table"><thead><tr>' +
      '<th>' + esc(tr('Customer')) + '</th><th>' + esc(tr('Location')) + '</th><th class="num">' + esc(tr('Outstanding')) + '</th><th class="num">' + esc(tr('Overdue')) + '</th><th class="num">' + esc(tr('Days overdue')) + '</th><th>' + esc(tr('Suggested next action')) + '</th><th>' + esc(tr('Status')) + '</th></tr></thead><tbody>' +
      arr.map(function (x) {
        var cs = maxColl(x.coll, autoColl(x.days)), stat = cs ? badge(cs, COLL_STATUS) : badge(x.worst._status === 'Unset' ? 'No status' : x.worst._status, PAY_STATUS);
        var days = x.days ? '<span class="pill ' + (x.days <= 30 ? 'warn' : 'bad') + '">' + x.days + '</span>' : '<span style="color:var(--muted)">—</span>';
        return '<tr class="row-click" tabindex="0" data-open="taradhi" data-name="' + esc(x.worst.name) + '">' +
          '<td><div class="main-t">' + esc(x.name) + '</div><div class="sub">' + esc(plural(x.cases, 'open case')) + '</div></td>' +
          '<td>' + locTag(x.loc) + '</td><td class="num">' + money(x.out) + '</td>' +
          '<td class="num">' + (x.over ? '<b style="color:var(--bad)">' + money(x.over) + '</b>' : '0') + '</td>' +
          '<td class="num">' + days + '</td><td>' + esc(nextAction(x.days, x.over > 0, false)) + '</td><td>' + stat + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }


  /* ------------------------------------------------------------------
     6b. LEGAL CASES TAB  (doctype: Legal Case List)
     ------------------------------------------------------------------ */
  var legalStatusOpts = [];
  function refreshLegalOptions() {
    var m = {};
    state.raw.legal.forEach(function (r) { m[r._status] = 1; });
    legalStatusOpts.length = 0;
    Object.keys(m).sort().forEach(function (k) { legalStatusOpts.push(k); });
    if (state.tables.legal) state.tables.legal.relabel();
  }
  var LEGAL_PALETTE = ['var(--c-warn)', 'var(--c-ok)', 'var(--c-info)', 'var(--c-orange)', 'var(--c-bad)', 'var(--c-slate)', 'var(--c-lime)', 'var(--c-deep)'];
  function legalGroup(arr, key) {
    var m = {};
    arr.forEach(function (r) { var k = r[key] || '—'; var g = m[k] || (m[k] = { key: k, n: 0, amt: 0, open: 0 }); g.n++; g.amt += r._amount; if (r._open) g.open++; });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return (b.amt - a.amt) || (b.n - a.n); });
  }
  function renderLegal() {
    var L = state.view.legal, open = L.filter(function (r) { return r._open; });
    var aged = open.filter(function (r) { return r._age != null; });
    var avg = aged.length ? Math.round(sum(aged, '_age') / aged.length) : 0;
    mini('#legalMini', [
      ['Cases', L.length], ['Open', open.length], ['Closed', L.length - open.length],
      ['Open amount', compact(sum(open, '_amount')), cur()], ['Average age of open cases', avg ? plural(avg, 'day') : '—']
    ]);

    var st = legalGroup(L, '_status');
    if (!L.length) {
      $('#legalStatus').innerHTML = emptyState('No cases', 'Nothing matches the current filters.');
    } else {
      $('#legalStatus').innerHTML =
        '<div class="stack">' + st.map(function (g, i) { return '<i style="flex:' + g.n + ';background:' + LEGAL_PALETTE[i % LEGAL_PALETTE.length] + '" title="' + esc(tr(g.key === 'Unset' ? 'No status' : g.key)) + ': ' + g.n + '"></i>'; }).join('') + '</div>' +
        '<div class="stack-legend">' + st.map(function (g, i) {
          return '<div class="sl-row"><span class="nm"><i style="background:' + LEGAL_PALETTE[i % LEGAL_PALETTE.length] + '"></i>' + esc(tr(g.key === 'Unset' ? 'No status' : g.key)) + '</span><span class="n">' + g.n + '</span><span class="a">' + (g.amt ? compact(g.amt) : '—') + '</span></div>';
        }).join('') + '</div>';
    }

    var au = legalGroup(L, '_authority').slice(0, 7);
    $('#legalAuthority').innerHTML = hbars(au.map(function (g) { return { label: tr(g.key), value: g.amt, note: plural(g.n, 'legal case') }; }), { empty: 'No data for the current filters.' });
    var lw = legalGroup(L, '_lawyer').slice(0, 7);
    $('#legalLawyer').innerHTML = hbars(lw.map(function (g) { return { label: g.key === 'Unassigned' ? tr('Unassigned') : g.key, value: g.amt, note: tf('{0} open', [g.open]) }; }), { empty: 'No data for the current filters.', cls: 'p-ok' });

    var old = open.slice().sort(function (a, b) { return (b._age == null ? -1 : b._age) - (a._age == null ? -1 : a._age); }).slice(0, 30);
    $('#legalOldest').innerHTML = old.map(function (r) {
      return '<button class="alert-item" data-open="legal" data-name="' + esc(r.name) + '"><div class="l"><div class="t">' + esc(r._customer) + (r._party ? ' · ' + esc(r._party) : '') + '</div>' +
        '<div class="s">' + esc(tr(r._authority)) + ' · ' + esc(tf('Filed {0}', [fmtDate(r.case_filing_date)])) + ' · ' + esc(r._lawyer === 'Unassigned' ? tr('Unassigned') : r._lawyer) + '</div></div>' +
        '<div class="r"><div class="amt">' + money(r._amount) + '</div>' + (r._age != null ? '<span class="pill ' + (r._age > 365 ? 'bad' : r._age > 180 ? 'warn' : 'slate') + '">' + esc(plural(r._age, 'day')) + '</span>' : '') + '</div></button>';
    }).join('') || emptyState('No open legal cases', 'All legal cases are closed or none match the current filters.');
  }

  /* ------------------------------------------------------------------
     7. TABLES
     ------------------------------------------------------------------ */
  function DataTable(host, cfg) {
    var st = { filter: 'all', toggle: false, extra: null, extraLabel: '', sortKey: cfg.sort && cfg.sort.key, dir: (cfg.sort && cfg.sort.dir) || 'desc', page: 1 };
    var size = cfg.pageSize || 10;
    var rows = [];
    var drawn = false;

    host.innerHTML =
      '<div class="tbl-tools"></div>' +
      '<div class="tbl-wrap"><table><thead><tr></tr></thead><tbody></tbody></table></div>' +
      '<div class="pager"><span class="info"></span><div class="btns"></div></div>';

    var thead = $('thead tr', host), tbody = $('tbody', host);

    function buildChrome() {
      var filterHtml = cfg.filter ? '<select data-f="filter" aria-label="' + esc(tr('Filter')) + '"><option value="all">' + esc(tr(cfg.filter.label)) + '</option>' +
        cfg.filter.options.map(function (o) { return '<option value="' + esc(o) + '">' + esc(tr(o)) + '</option>'; }).join('') + '</select>' : '';
      var toggleHtml = cfg.toggle ? '<label class="toggle"><input type="checkbox" data-f="toggle"> ' + esc(tr(cfg.toggle.label)) + '</label>' : '';
      $('.tbl-tools', host).innerHTML = filterHtml + toggleHtml + '<button class="chip" data-f="clearExtra" hidden></button><span class="tbl-count"></span>';
      var sel = $('[data-f="filter"]', host); if (sel) sel.value = st.filter;
      var cb = $('[data-f="toggle"]', host); if (cb) cb.checked = st.toggle;
      thead.innerHTML = cfg.columns.map(function (c, i) {
        return '<th class="' + (c.num ? 'num ' : '') + (c.sort === false ? '' : 'sortable') + '" data-col="' + i + '">' + esc(tr(c.label)) + (c.sort === false ? '' : '<span class="arr">↕</span>') + '</th>';
      }).join('');
    }
    buildChrome();

    function filtered() {
      var out = rows.filter(function (r) {
        if (st.filter !== 'all' && cfg.filter.get(r) !== st.filter) return false;
        if (st.toggle && !cfg.toggle.test(r)) return false;
        if (st.extra && !st.extra(r)) return false;
        return true;
      });
      var col = cfg.columns.filter(function (c) { return c.key === st.sortKey; })[0];
      if (col) {
        out.sort(function (a, b) {
          var x = a[col.key], y = b[col.key];
          var xn = x == null || x === '', yn = y == null || y === '';
          if (xn && yn) return 0; if (xn) return 1; if (yn) return -1;
          var res = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
          return st.dir === 'asc' ? res : -res;
        });
      }
      return out;
    }

    function draw() {
      drawn = true;
      var list = filtered();
      var pages = Math.max(Math.ceil(list.length / size), 1);
      if (st.page > pages) st.page = pages;
      var slice = list.slice((st.page - 1) * size, st.page * size);

      $$('th', thead).forEach(function (th) {
        var c = cfg.columns[+th.dataset.col], on = c.key === st.sortKey;
        th.classList.toggle('sorted', on);
        var a = $('.arr', th);
        if (a) a.textContent = on ? (st.dir === 'asc' ? '↑' : '↓') : '↕';
      });

      tbody.innerHTML = slice.length ? slice.map(function (r) {
        return '<tr class="row-click" tabindex="0" data-name="' + esc(r.name) + '">' + cfg.columns.map(function (c) {
          return '<td class="' + (c.num ? 'num' : '') + '">' + c.render(r) + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + cfg.columns.length + '">' + emptyState('No records found', rows.length ? 'Try changing the filters.' : 'No records match the current dashboard filters.') + '</td></tr>';

      var chip = $('[data-f="clearExtra"]', host);
      var exLabel = typeof st.extraLabel === 'function' ? st.extraLabel() : st.extraLabel;
      chip.hidden = !st.extra;
      chip.innerHTML = st.extra ? esc(exLabel) + ' ' + icon('close', true) : '';
      $('.tbl-count', host).textContent = plural(list.length, 'record') + (list.length !== rows.length ? ' ' + tf('of {0}', [rows.length]) : '');
      $('.info', host).textContent = list.length ? tf('Showing {0}–{1} of {2}', [(st.page - 1) * size + 1, Math.min(st.page * size, list.length), list.length]) : '';
      var prevG = LANG === 'ar' ? '›' : '‹', nextG = LANG === 'ar' ? '‹' : '›';
      var btns = '<button data-p="prev" ' + (st.page <= 1 ? 'disabled' : '') + '>' + prevG + '</button>';
      var to = Math.min(pages, Math.max(1, st.page - 2) + 4), from = Math.max(1, to - 4);
      for (var p = from; p <= to; p++) btns += '<button data-p="' + p + '" class="' + (p === st.page ? 'cur' : '') + '">' + p + '</button>';
      btns += '<button data-p="next" ' + (st.page >= pages ? 'disabled' : '') + '>' + nextG + '</button>';
      $('.btns', host).innerHTML = pages > 1 ? btns : '';
      api.filteredRows = list;
    }

    host.addEventListener('change', function (e) {
      var f = e.target.dataset && e.target.dataset.f;
      if (f === 'filter') { st.filter = e.target.value; st.page = 1; draw(); }
      if (f === 'toggle') { st.toggle = !!e.target.checked; st.page = 1; draw(); }
    });
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-f="clearExtra"]')) { st.extra = null; st.page = 1; draw(); return; }
      var th = e.target.closest('th.sortable');
      if (th) {
        var c = cfg.columns[+th.dataset.col];
        if (st.sortKey === c.key) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sortKey = c.key; st.dir = c.num ? 'desc' : 'asc'; }
        draw(); return;
      }
      var pb = e.target.closest('.pager button');
      if (pb && !pb.disabled) {
        var p = pb.dataset.p;
        st.page = p === 'prev' ? st.page - 1 : p === 'next' ? st.page + 1 : +p; draw(); return;
      }
      var tr_ = e.target.closest('tr.row-click');
      if (tr_ && !e.target.closest('a')) openDrawer(cfg.key, tr_.dataset.name);
    });
    host.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr.row-click')) { e.preventDefault(); openDrawer(cfg.key, e.target.dataset.name); }
    });

    var api = {
      setRows: function (r) { rows = r; draw(); },
      setToggle: function (v) { st.toggle = !!v; var cb = $('[data-f="toggle"]', host); if (cb) cb.checked = !!v; st.page = 1; draw(); },
      setExtra: function (fn, label) { st.extra = fn; st.extraLabel = label; st.page = 1; draw(); },
      reset: function () { st.filter = 'all'; st.toggle = false; st.extra = null; st.page = 1; var s = $('[data-f="filter"]', host); if (s) s.value = 'all'; var cb = $('[data-f="toggle"]', host); if (cb) cb.checked = false; },
      relabel: function () { buildChrome(); if (drawn) draw(); },
      filteredRows: []
    };
    return api;
  }

  function cust(name, sub) { return '<div class="main-t">' + esc(name || '—') + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : ''); }

  function initTables() {
    state.tables.taradhi = DataTable($('#taradhiTable'), {
      key: 'taradhi',
      filter: { label: 'All payment statuses', options: ['Paid', 'Partial', 'Not Paid', 'Lost', 'Unset'], get: function (r) { return r._status; } },
      toggle: { label: 'Overdue only', test: function (r) { return r._overdue; } },
      sort: { key: 'expected_collection', dir: 'desc' },
      columns: [
        { key: '_customer', label: 'Customer', render: function (r) { return cust(r._customer, '<span class="mono">' + esc(r.judgement_no || r.name) + '</span>'); } },
        { key: '_location', label: 'Location', render: function (r) { return locTag(r._location); } },
        { key: '_sales', label: 'Sales person', render: function (r) { return esc(r._sales === 'Unassigned' ? '—' : r._sales); } },
        { key: '_total', label: 'Total', num: true, render: function (r) { return money(r._total); } },
        { key: '_received', label: 'Received', num: true, render: function (r) { return money(r._received); } },
        { key: '_balance', label: 'Balance', num: true, render: function (r) { return r._balance > 0 ? '<b>' + money(r._balance) + '</b>' : '<span style="color:var(--muted)">0</span>'; } },
        { key: 'expected_collection', label: 'Expected', render: function (r) { return fmtDate(r.expected_collection) + (r._overdue ? '<div class="sub" style="color:var(--bad)">' + esc(tf('{0} overdue', [plural(r._daysOverdue, 'day')])) + '</div>' : ''); } },
        { key: '_status', label: 'Status', render: function (r) { return badge(r._status === 'Unset' ? 'No status' : r._status, PAY_STATUS); } },
        { key: '_collEff', label: 'Escalation', render: function (r) { return (COLL_RANK[r._collEff || ''] >= 2) ? badge(r._collEff, COLL_STATUS) : '<span style="color:var(--muted)">—</span>'; } }
      ]
    });

    state.tables.court = DataTable($('#courtTable'), {
      key: 'court',
      filter: { label: 'All document states', options: ['Draft', 'Submitted'], get: function (r) { return docLabel(r.docstatus); } },
      sort: { key: 'modified', dir: 'desc' },
      columns: [
        { key: '_customer', label: 'Customer', render: function (r) { return cust(r._customer, '<span class="mono">' + esc(r.name) + '</span>'); } },
        { key: '_location', label: 'Location', render: function (r) { return locTag(r._location); } },
        { key: 'judgement_no', label: 'Judgement no', render: function (r) { return '<span class="mono">' + esc(r.judgement_no || '—') + '</span>'; } },
        { key: '_amount', label: 'Amount', num: true, render: function (r) { return money(r._amount); } },
        { key: 'expected_collection', label: 'Expected collection', render: function (r) { return esc(r.expected_collection || '—'); } },
        { key: 'remarks', label: 'Remarks', sort: false, render: function (r) { return '<span style="color:var(--text-2)">' + esc((r.remarks || '').slice(0, 60) || '—') + '</span>'; } },
        { key: 'docstatus', label: 'State', render: function (r) { return '<span class="badge ' + docCls(r.docstatus) + '">' + esc(tr(docLabel(r.docstatus))) + '</span>'; } }
      ]
    });

    state.tables.legal = DataTable($('#legalTable'), {
      key: 'legal',
      filter: { label: 'All legal statuses', options: legalStatusOpts, get: function (r) { return r._status; } },
      toggle: { label: 'Open only', test: function (r) { return r._open; } },
      sort: { key: 'case_filing_date', dir: 'desc' },
      columns: [
        { key: '_customer', label: 'Customer', render: function (r) { return cust(r._customer, '<span class="mono">' + esc(r.order_no || r.name) + '</span>'); } },
        { key: '_party', label: 'Party', render: function (r) { return esc(r._party || '—'); } },
        { key: '_location', label: 'Location', render: function (r) { return locTag(r._location); } },
        { key: '_authority', label: 'Authority', render: function (r) { return esc(tr(r._authority)); } },
        { key: '_lawyer', label: 'Lawyer', render: function (r) { return esc(r._lawyer === 'Unassigned' ? '—' : r._lawyer); } },
        { key: '_amount', label: 'Amount', num: true, render: function (r) { return money(r._amount); } },
        { key: 'case_filing_date', label: 'Filed', render: function (r) { return fmtDate(r.case_filing_date) + (r._open && r._age != null ? '<div class="sub">' + esc(plural(r._age, 'day')) + '</div>' : ''); } },
        { key: '_status', label: 'Status', render: function (r) { return legalBadge(r); } },
        { key: 'remarks', label: 'Remarks', sort: false, render: function (r) { return '<span style="color:var(--text-2)">' + esc((r.remarks || '').slice(0, 60) || '—') + '</span>'; } }
      ]
    });

    state.tables.customers = DataTable($('#custTable'), {
      key: 'customers',
      filter: { label: 'All collection statuses', options: ['Normal', 'Follow up', 'Escalated', 'Critical', 'Unset'], get: function (r) { return r.coll || 'Unset'; } },
      toggle: { label: 'With overdue only', test: function (r) { return r.over > 0; } },
      sort: { key: 'out', dir: 'desc' },
      columns: [
        { key: 'name', label: 'Customer', render: function (r) { return cust(r.name, esc(plural(r.cases, 'case'))); } },
        { key: 'location', label: 'Location', render: function (r) { return locTag(r.location); } },
        { key: 'sales', label: 'Sales person', render: function (r) { return esc(r.sales === 'Unassigned' ? '—' : r.sales); } },
        { key: 'total', label: 'Total claim', num: true, render: function (r) { return money(r.total); } },
        { key: 'collected', label: 'Collected', num: true, render: function (r) { return money(r.collected); } },
        { key: 'out', label: 'Outstanding', num: true, render: function (r) { return r.out > 0 ? '<b>' + money(r.out) + '</b>' : '<span style="color:var(--muted)">0</span>'; } },
        { key: 'over', label: 'Overdue', num: true, render: function (r) { return r.over > 0 ? '<b style="color:var(--bad)">' + money(r.over) + '</b>' : '<span style="color:var(--muted)">0</span>'; } },
        { key: 'days', label: 'Max days late', num: true, render: function (r) { return r.days ? '<span class="pill ' + (r.days <= 30 ? 'warn' : 'bad') + '">' + r.days + '</span>' : '—'; } },
        { key: 'coll', label: 'Collection status', render: function (r) { return r.coll ? badge(r.coll, COLL_STATUS) + (r.collAuto ? ' <span class="sub">' + esc(tr('auto')) + '</span>' : '') : '<span style="color:var(--muted)">—</span>'; } },
        { key: 'acct', label: 'Account', render: function (r) { return r.acct ? badge(r.acct, ACCT_STATUS) : '<span style="color:var(--muted)">—</span>'; } }
      ]
    });
  }

  function mini(sel, items) {
    $(sel).innerHTML = items.map(function (i) {
      return '<div class="mini"><div class="l">' + esc(tr(i[0])) + '</div><div class="v">' + esc(i[1]) + (i[2] ? '<small>' + i[2] + '</small>' : '') + '</div></div>';
    }).join('');
  }

  function renderTables() {
    var T = state.view.taradhi, C = state.view.court, CA = state.custAgg;
    state.tables.taradhi.setRows(T);
    state.tables.court.setRows(C);
    state.tables.legal.setRows(state.view.legal);
    state.tables.customers.setRows(CA);
    var live = T.filter(function (r) { return r._status !== 'Lost'; });
    mini('#taradhiMini', [
      ['Cases', T.length], ['Total claim', compact(sum(T, '_total')), cur()], ['Collected', compact(sum(T, '_received')), cur()],
      ['Outstanding', compact(sum(live, '_balance')), cur()], ['Overdue', T.filter(function (r) { return r._overdue; }).length]
    ]);
    mini('#courtMini', [
      ['Cases', C.length], ['Total amount', compact(sum(C, '_amount')), cur()],
      ['Draft', C.filter(function (r) { return r.docstatus === 0; }).length], ['Submitted', C.filter(function (r) { return r.docstatus === 1; }).length]
    ]);
    mini('#custMini', [
      ['Customers', CA.length], ['With open balance', CA.filter(function (g) { return g.out > 0; }).length],
      ['Outstanding', compact(sum(CA, 'out')), cur()], ['With overdue', CA.filter(function (g) { return g.over > 0; }).length],
      ['Flagged Follow up / Escalated / Critical', CA.filter(function (g) { return g.coll && g.coll !== 'Normal'; }).length]
    ]);
    var counts = { taradhi: T.length, court: C.length, legal: state.view.legal.length, customers: CA.length };
    $$('.tab').forEach(function (t) { var el = $('.count', t); if (el && counts[t.dataset.tab] != null) el.textContent = counts[t.dataset.tab]; });
  }

  /* ------------------------------------------------------------------
     8. DETAIL DRAWER
     ------------------------------------------------------------------ */
  function kv(k, v, full) { return '<div class="' + (full ? 'full' : '') + '"><div class="k">' + esc(tr(k)) + '</div><div class="v">' + (v == null || v === '' ? '—' : v) + '</div></div>'; }
  function link(dt, name) { return name ? '<a data-route="' + esc(dt) + '|' + esc(name) + '">' + esc(name) + '</a>' : '—'; }
  function phoneKv(phone) {
    var digits = String(phone || '').replace(/\D/g, '');
    return phone ? '<a href="tel:' + esc(phone) + '">' + esc(phone) + '</a>' + (digits.length >= 8 ? ' · <a href="https://wa.me/' + digits + '" target="_blank" rel="noopener">' + esc(tr('WhatsApp')) + '</a>' : '') : '';
  }

  // ERPNext's sticky navbar sits above the dashboard; start the drawer below it so its header is never hidden.
  function navOffset() {
    var off = 0;
    try {
      var nb = document.querySelector('header.navbar') || document.querySelector('.navbar');
      if (nb) { var r = nb.getBoundingClientRect(); if (r.height && r.bottom > 0) off = Math.min(Math.ceil(r.bottom), 140); }
    } catch (e) { /* ignore */ }
    return off;
  }

  function reminderText(name, balance, judgement, expected) {
    return tf('Dear {0},\n\nThis is a kind reminder that {1} {2} is outstanding{3}{4}. Please arrange the payment or contact us to agree a schedule.\n\nThank you.', [
      name, money2(balance), cur(),
      judgement ? tf(' under judgement no. {0}', [judgement]) : '',
      expected ? tf(' (expected collection {0})', [fmtDate(expected)]) : ''
    ]);
  }

  function openDrawer(key, name) {
    var h = '', title, sub, statusHtml, actions = '', r;

    if (key === 'customers') {
      r = state.custAgg.filter(function (x) { return x.name === name; })[0];
      if (!r) return;
      title = r.name; sub = plural(r.cases, 'Taradhi case') + ' · ' + tr(r.location);
      statusHtml = r.coll ? badge(r.coll, COLL_STATUS) + (r.collAuto ? ' <span class="sub">' + esc(tr('auto')) + '</span>' : '') : '';
      h += '<div class="dr-kpis">' +
        '<div class="mini"><div class="l">' + esc(tr('Outstanding')) + '</div><div class="v" style="color:var(--warn)">' + money(r.out) + '</div></div>' +
        '<div class="mini"><div class="l">' + esc(tr('Collected')) + '</div><div class="v" style="color:var(--ok)">' + money(r.collected) + '</div></div>' +
        '<div class="mini"><div class="l">' + esc(tr('Overdue')) + '</div><div class="v" style="color:' + (r.over ? 'var(--bad)' : 'var(--ok)') + '">' + money(r.over) + '</div></div></div>';
      var pctC = r.total ? Math.min(r.collected / r.total, 1) * 100 : 0;
      h += '<div class="dr-section"><div class="progress"><i class="p-ok" style="width:' + pctC + '%"></i></div><div class="card-sub" style="margin-top:8px;padding:0">' + esc(tf('{0}% of {1} {2} collected', [Math.round(pctC), money(r.total), cur()])) + (r.days ? ' · <b style="color:var(--bad)">' + esc(tf('up to {0} overdue', [plural(r.days, 'day')])) + '</b> · ' + esc(tr('suggested:')) + ' ' + esc(nextAction(r.days, true, false)) : '') + '</div></div>';
      h += '<div class="dr-section"><h4>' + esc(tr('Customer')) + '</h4><div class="kv">' +
        kv('Location', locTag(r.location)) + kv('Sales person', esc(r.sales === 'Unassigned' ? '' : r.sales)) +
        kv('Collection status', r.coll ? badge(r.coll, COLL_STATUS) : '') + kv('Account status', r.acct ? badge(r.acct, ACCT_STATUS) : '') +
        kv('Phone', phoneKv(r.phone)) + kv('Customer record', r.cust ? link('Customer', r.cust.name) : esc(tr('Not matched'))) + '</div></div>';
      var trs = r.rows.slice().sort(function (a, b) { return (b._balance - a._balance); }).map(function (c) {
        return '<tr class="row-click" tabindex="0" data-open="taradhi" data-name="' + esc(c.name) + '"><td class="mono">' + esc(c.judgement_no || c.name) + '</td><td>' + fmtDate(c.expected_collection) + '</td><td class="num">' + money(c._balance) + '</td><td>' + badge(c._status === 'Unset' ? 'No status' : c._status, PAY_STATUS) + '</td></tr>';
      }).join('');
      h += '<div class="dr-section"><h4>' + esc(tr('Cases')) + '</h4><table class="mini-tbl"><thead><tr><th>' + esc(tr('Judgement')) + '</th><th>' + esc(tr('Expected')) + '</th><th class="num">' + esc(tr('Balance')) + '</th><th>' + esc(tr('Status')) + '</th></tr></thead><tbody>' + trs + '</tbody></table></div>';
      if (r.cust) actions += '<button class="btn btn-primary" data-route-btn="Customer|' + esc(r.cust.name) + '">' + icon('external', true) + ' ' + esc(tr('Open customer')) + '</button>';
      if (r.out > 0) actions += '<button class="btn btn-soft" data-copy-cust="' + esc(r.name) + '">' + icon('copy', true) + ' ' + esc(tr('Copy reminder text')) + '</button>';
    }

    if (key === 'taradhi') {
      r = state.raw.taradhi.filter(function (x) { return x.name === name; })[0];
      if (!r) return;
      title = r._customer; sub = tf('Judgement {0} · {1}', [r.judgement_no || '—', r.name]); statusHtml = badge(r._status === 'Unset' ? 'No status' : r._status, PAY_STATUS);
      var pct = r._total ? Math.min(r._received / r._total, 1) * 100 : 0;
      h += '<div class="dr-kpis">' +
        '<div class="mini"><div class="l">' + esc(tr('Total')) + '</div><div class="v">' + money(r._total) + '</div></div>' +
        '<div class="mini"><div class="l">' + esc(tr('Received')) + '</div><div class="v" style="color:var(--ok)">' + money(r._received) + '</div></div>' +
        '<div class="mini"><div class="l">' + esc(tr('Balance')) + '</div><div class="v" style="color:' + (r._balance > 0 ? 'var(--warn)' : 'var(--ok)') + '">' + money(r._balance) + '</div></div></div>';
      h += '<div class="dr-section"><div class="progress"><i class="p-ok" style="width:' + pct + '%"></i></div>' +
        '<div class="card-sub" style="margin-top:8px;padding:0">' + esc(tf('{0}% collected', [Math.round(pct)])) + (r._overdue ? ' · <b style="color:var(--bad)">' + esc(tf('{0} overdue', [plural(r._daysOverdue, 'day')])) + '</b> · ' + esc(tr('suggested:')) + ' ' + esc(nextAction(r._daysOverdue, true, false)) : '') + '</div></div>';
      h += '<div class="dr-section"><h4>' + esc(tr('Case details')) + '</h4><div class="kv">' +
        kv('Customer', esc(r.customer)) + kv('Location', locTag(r._location)) +
        kv('Judgement no', '<span class="mono">' + esc(r.judgement_no || '—') + '</span>') + kv('Sales person', esc(r._sales === 'Unassigned' ? '' : r._sales)) +
        kv('Sales order', link('Sales Order', r.order_no)) + kv('Customer collection status', r._collStatus ? badge(r._collStatus, COLL_STATUS) : '') + kv('Escalation (by days overdue)', r._autoColl ? badge(r._autoColl, COLL_STATUS) : '') +
        kv('Amount', money2(r._amount) + ' ' + esc(cur())) + kv('Amount requested', fmtDate(r.date)) +
        kv('Expected collection', fmtDate(r.expected_collection)) + kv('Payment terms', r.payment_term ? esc(plural(+r.payment_term, 'instalment')) : '—') +
        kv('Contact', esc(r.contact_person_name)) + kv('Phone', phoneKv(r._phone)) +
        kv('Email', r.email ? '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : '', true) + '</div></div>';

      var n = +r.payment_term || 6, ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'], rows = '';
      for (var i = 1; i <= Math.min(n, 6); i++) {
        var planned = num(r[ord[i - 1] + '_payment']), got = num(r['receive_payment_' + i]);
        var d = i <= 2 ? r[ord[i - 1] + '_payment_date'] : null;
        var st = got >= planned && planned > 0 ? '<span class="pill ok">' + esc(tr('Received')) + '</span>' : got > 0 ? '<span class="pill warn">' + esc(tr('Partial')) + '</span>' : planned > 0 ? '<span class="pill slate">' + esc(tr('Pending')) + '</span>' : '<span class="pill slate">—</span>';
        rows += '<tr><td>#' + i + '</td><td class="num">' + (planned ? money(planned) : '—') + '</td><td class="num">' + (got ? money(got) : '—') + '</td><td>' + (d ? fmtDate(d) : '—') + '</td><td>' + st + '</td></tr>';
      }
      h += '<div class="dr-section"><h4>' + esc(tr('Payment schedule')) + '</h4><table class="mini-tbl"><thead><tr><th>#</th><th class="num">' + esc(tr('Planned')) + '</th><th class="num">' + esc(tr('Received')) + '</th><th>' + esc(tr('Date')) + '</th><th>' + esc(tr('Status')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

      var tl = '';
      if (r.first_session_date) tl += '<div class="tl-item"><span class="tl-dot"></span><div><div class="t">' + esc(tr('First session')) + '</div><div class="s">' + fmtDate(r.first_session_date) + (r.time_1 ? ' · ' + fmtTime(r.time_1) : '') + '</div>' + (r.notes_from_first_session ? '<p>' + esc(r.notes_from_first_session) + '</p>' : '') + '</div></div>';
      if (r.second_session_date) tl += '<div class="tl-item"><span class="tl-dot"></span><div><div class="t">' + esc(tr('Second session')) + '</div><div class="s">' + fmtDate(r.second_session_date) + (r.time_2 ? ' · ' + fmtTime(r.time_2) : '') + '</div>' + (r.notes_from_second_session ? '<p>' + esc(r.notes_from_second_session) + '</p>' : '') + '</div></div>';
      h += '<div class="dr-section"><h4>' + esc(tr('Sessions')) + '</h4>' + (tl ? '<div class="timeline">' + tl + '</div>' : '<span class="card-sub" style="padding:0">' + esc(tr('No sessions recorded.')) + '</span>') + '</div>';
      if (r.remarks) h += '<div class="dr-section"><h4>' + esc(tr('Remarks')) + '</h4><div>' + esc(r.remarks) + '</div></div>';
      if (r.upload_file) h += '<div class="dr-section"><h4>' + esc(tr('Attachment')) + '</h4><a href="' + esc(r.upload_file) + '" target="_blank" rel="noopener">' + esc(r.upload_file.split('/').pop()) + '</a></div>';

      actions += '<button class="btn btn-primary" data-route-btn="' + esc(DT.taradhi) + '|' + esc(r.name) + '">' + icon('external', true) + ' ' + esc(tr('Open in ERPNext')) + '</button>';
      if (r._balance > 0) actions += '<button class="btn btn-soft" data-copy="' + esc(r.name) + '">' + icon('copy', true) + ' ' + esc(tr('Copy reminder text')) + '</button>';
    }

    if (key === 'court') {
      r = state.raw.court.filter(function (x) { return x.name === name; })[0];
      if (!r) return;
      title = r._customer; sub = r.name; statusHtml = '<span class="badge ' + docCls(r.docstatus) + '">' + esc(tr(docLabel(r.docstatus))) + '</span>';
      h += '<div class="dr-section"><h4>' + esc(tr('Case details')) + '</h4><div class="kv">' +
        kv('Customer', link('Customer', r.customer_name)) + kv('Location', locTag(r._location)) +
        kv('Judgement no', '<span class="mono">' + esc(r.judgement_no || '—') + '</span>') + kv('Sales person', esc(r._sales === 'Unassigned' ? '' : r._sales)) +
        kv('Amount', money2(r._amount) + ' ' + esc(cur())) + kv('Expected collection', esc(r.expected_collection)) +
        kv('Created', fmtDate(String(r.creation || '').slice(0, 10))) + kv('Remarks', esc(r.remarks), true) + '</div></div>';
      actions += '<button class="btn btn-primary" data-route-btn="' + esc(DT.court) + '|' + esc(r.name) + '">' + icon('external', true) + ' ' + esc(tr('Open in ERPNext')) + '</button>';
    }

    if (key === 'legal') {
      r = state.raw.legal.filter(function (x) { return x.name === name; })[0];
      if (!r) return;
      title = r._customer; sub = (r._party ? r._party + ' · ' : '') + r.name; statusHtml = legalBadge(r);
      h += '<div class="dr-kpis">' +
        '<div class="mini"><div class="l">' + esc(tr('Amount')) + '</div><div class="v" style="color:var(--warn)">' + money(r._amount) + '</div></div>' +
        '<div class="mini"><div class="l">' + esc(tr('Filed')) + '</div><div class="v" style="font-size:15px">' + fmtDate(r.case_filing_date) + '</div></div>' +
        '<div class="mini"><div class="l">' + esc(tr('Age')) + '</div><div class="v">' + (r._age != null ? esc(plural(r._age, 'day')) : '—') + '</div></div></div>';
      h += '<div class="dr-section"><h4>' + esc(tr('Legal case details')) + '</h4><div class="kv">' +
        kv('Customer', r.customer ? link('Customer', r.customer) : '') + kv('Party', esc(r._party)) +
        kv('Location', locTag(r._location)) + kv('Sales person', esc(r._sales === 'Unassigned' ? '' : r._sales)) +
        kv('Legal case authority', esc(tr(r._authority))) + kv('Assigned lawyer', esc(r._lawyer === 'Unassigned' ? '' : r._lawyer)) +
        kv('Order no', '<span class="mono">' + esc(r.order_no || '—') + '</span>') + kv('Legal case status', legalBadge(r)) +
        kv('Amount', money2(r._amount) + ' ' + esc(cur())) + kv('Case filing date', fmtDate(r.case_filing_date)) +
        kv('Remarks', esc(r.remarks), true) + '</div></div>';
      actions += '<button class="btn btn-primary" data-route-btn="' + esc(DT.legal) + '|' + esc(r.name) + '">' + icon('external', true) + ' ' + esc(tr('Open in ERPNext')) + '</button>';
    }

    if (!title) return;
    actions += '<button class="btn btn-soft" data-close>' + esc(tr('Close')) + '</button>';
    $('#drawerBody').innerHTML =
      '<div class="dr-head"><div><h2>' + esc(title) + '</h2><div class="sub">' + esc(sub) + '</div><div style="margin-top:8px">' + statusHtml + '</div></div>' +
      '<button class="icon-btn" data-close aria-label="' + esc(tr('Close')) + '">' + icon('close') + '</button></div>' + h + '<div class="dr-actions">' + actions + '</div>';

    var sc = $('#scrim'), dr = $('#drawer'), off = navOffset();
    sc.style.top = off + 'px'; dr.style.top = off + 'px';
    sc.hidden = false;
    requestAnimationFrame(function () { sc.classList.add('show'); dr.classList.add('open'); });
    dr.setAttribute('aria-hidden', 'false');
    dr.scrollTop = 0;
  }

  function closeDrawer() {
    var sc = $('#scrim'), dr = $('#drawer');
    sc.classList.remove('show'); dr.classList.remove('open');
    dr.setAttribute('aria-hidden', 'true');
    setTimeout(function () { if (!dr.classList.contains('open')) sc.hidden = true; }, 220);
  }

  /* ------------------------------------------------------------------
     9. ACTIONS
     ------------------------------------------------------------------ */
  function exportCsv(key) {
    var rows = state.tables[key].filteredRows || [], head, body;
    if (key === 'customers') {
      head = ['customer', 'location', 'sales_person', 'cases', 'total_claim', 'collected', 'outstanding', 'overdue', 'max_days_overdue', 'collection_status', 'account_status'];
      body = rows.map(function (g) { return [g.name, g.location, g.sales, g.cases, g.total, g.collected, g.out, g.over, g.days, g.coll, g.acct]; });
    } else {
      var cols = FIELDS[key].filter(function (f) { return f !== 'docstatus' && f !== 'modified'; });
      head = cols.concat(['location', 'sales_person_resolved']);
      body = rows.map(function (r) { return cols.map(function (c) { return r[c]; }).concat([r._location, r._sales]); });
    }
    var q = function (v) { v = v == null ? '' : String(v); return '"' + v.replace(/"/g, '""') + '"'; };
    var csv = '﻿' + head.map(q).join(',') + '\n' + body.map(function (row) { return row.map(q).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = (key === 'customers' ? 'taradhi_customers' : DT[key].replace(/\s+/g, '_').toLowerCase()) + '_' + TODAY + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function copyText(text, msg) {
    var done = function () { if (window.frappe && frappe.show_alert) frappe.show_alert({ message: msg || tr('Copied'), indicator: 'green' }, 3); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done); return; }
    } catch (e) { /* fall through */ }
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e2) { /* ignore */ }
    ta.remove();
  }

  function buildSummary() {
    var s = stats(state.view.taradhi, state.view.court, state.view.legal), f = state.filters, L = [];
    L.push(tf('Taradhi & Legal summary — {0}', [fmtDate(TODAY)]));
    if (activeFilterCount()) L.push(tf('(filtered: {0})', [[f.q && '“' + f.q + '”', (f.from || f.to) && ($('#drLabel').textContent), f.location !== 'all' && tr(f.location), f.sales !== 'all' && tr(f.sales)].filter(Boolean).join(', ')]));
    L.push('');
    L.push(tf('Outstanding: {0} {1} across {2} / {3}', [cur(), money(s.outstanding), plural(s.openCases, 'open case'), plural(s.custOpen, 'customer')]));
    L.push(tf('Overdue: {0} {1} ({2}% of outstanding, {3})', [cur(), money(s.overdueAmt), s.overPct, plural(s.overdue.length, 'case')]));
    L.push(tf('Collected: {0} {1} ({2}% of {3} claim)', [cur(), money(s.collected), Math.round(s.rate * 100), money(s.totalClaim)]));
    var top = groupAgg(s.live, '_customer').filter(function (g) { return g.out > 0; }).slice(0, 3);
    if (top.length) L.push(tf('Top balances: {0}', [top.map(function (g) { return g.key + ' ' + compact(g.out); }).join(' · ')]));
    L.push(tf('Court cases: {0} ({1} {2})', [s.C.length, cur(), money(sum(s.C, '_amount'))]));
    L.push(tf('Legal cases: {0} open of {1} ({2} {3} open amount)', [s.legalOpen.length, s.L.length, cur(), money(s.legalOpenAmt)]));
    return L.join('\n');
  }

  function goRoute(dt, name) { if (window.frappe && frappe.set_route) frappe.set_route('Form', dt, name); }

  function setTab(name) {
    state.tab = name;
    $$('.tab').forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    try { localStorage.setItem('tld-tab', name); } catch (e) { /* ignore */ }
    closeDrawer();
  }

  function renderAll() {
    renderOverview();
    renderLegal();
    renderTables();
  }

  /* ------------------------------------------------------------------
     9b. LANGUAGE SWITCHING
     ------------------------------------------------------------------ */
  // Translates the static (HTML) text nodes; originals are remembered so English can be restored.
  function translateStatic() {
    var w = document.createTreeWalker($('#tld'), NodeFilter.SHOW_TEXT, null), n, nodes = [];
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (nd) {
      var raw = nd.__o != null ? nd.__o : nd.nodeValue;
      var key = raw.trim();
      if (!key) return;
      if (nd.__o == null) { if (!AR.hasOwnProperty(key)) return; nd.__o = raw; }
      var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      nd.nodeValue = LANG === 'ar' ? lead + AR[key] + trail : raw;
    });
  }

  function applyStaticLabels() {
    $('#brandName').textContent = tr(BRAND_NAME);
    $$('.tab').forEach(function (t) {
      var l = TAB_LABELS[t.dataset.tab], s = $('.lbl', t);
      if (s) s.textContent = tr(l[1]);
      t.title = tr(l[1]);
    });
    $$('.rlink').forEach(function (b) { var l = $('.lbl', b); if (l) b.title = l.textContent.trim(); });
    $('#btnRefresh').innerHTML = icon('refresh', true) + '<span>' + esc(tr('Refresh')) + '</span>';
    $('#btnCopy').innerHTML = icon('copy', true) + '<span>' + esc(tr('Copy summary')) + '</span>';
    $('#btnCopy').title = tr('Copy management summary');
    $$('[data-action="export"]').forEach(function (b) { b.innerHTML = icon('download', true) + ' ' + esc(tr('Export CSV')); });
    $$('[data-action="list"]').forEach(function (b) { b.innerHTML = icon('list', true) + ' ' + esc(tr('Open list')); });
    $$('[data-action="new"]').forEach(function (b) { b.innerHTML = icon('plus', true) + ' ' + esc(tr('New')); });
    var lb = $('#btnLang');
    if (lb) { lb.textContent = LANG === 'ar' ? 'English' : 'عربي'; lb.title = LANG === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'; }
    $('#fSearch').placeholder = tr('Customer, judgement no, sales person…');
    renderUpdated();
  }

  function applyLang() {
    var el = $('#tld');
    el.setAttribute('dir', LANG === 'ar' ? 'rtl' : 'ltr');
    el.setAttribute('lang', LANG);
    translateStatic();
    applyStaticLabels();
    Object.keys(state.tables).forEach(function (k) { state.tables[k].relabel(); });
    renderBanner();
    if (state.loaded) { fillFilterOptions(); applyFilters(); } else updateFilterUI();
  }

  function toggleLang() {
    LANG = LANG === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('tld-lang', LANG); } catch (e) { /* ignore */ }
    closeDrawer();
    applyLang();
  }

  /* ------------------------------------------------------------------
     10. THEME & RESPONSIVE WIDTH
     ------------------------------------------------------------------ */
  function erpTheme() {
    var el = document.documentElement;
    var t = el.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    var m = el.getAttribute('data-theme-mode');
    if (m === 'dark' || m === 'light') return m;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function syncTheme() { $('#tld').setAttribute('data-theme', THEME_MODE === 'auto' ? erpTheme() : 'light'); }
  function setWidthClass() {
    var el = $('#tld'), w = 0;
    try { w = el.getBoundingClientRect().width; } catch (e) { /* ignore */ }
    if (!w) w = el.offsetWidth || 1200;
    el.setAttribute('data-w', w >= 1320 ? 'xl' : w >= 1040 ? 'l' : w >= 740 ? 'm' : 's');
  }

  /* ------------------------------------------------------------------
     11. EVENTS & BOOT
     ------------------------------------------------------------------ */
  function initStatic() {
    $$('[data-ico]').forEach(function (el) { el.innerHTML = icon(el.dataset.ico, true); });
    $('#brandName').textContent = tr(BRAND_NAME);

    // language toggle button (added next to Copy / Refresh in the top bar)
    var foot = $('.rail-foot');
    if (foot && !$('#btnLang')) {
      var lb = document.createElement('button');
      lb.className = 'btn-rail ghost lang'; lb.id = 'btnLang'; lb.type = 'button';
      foot.insertBefore(lb, $('#btnCopy'));
    }

    $$('.tab').forEach(function (t) {
      var l = TAB_LABELS[t.dataset.tab];
      t.innerHTML = icon(l[0]) + '<span class="lbl">' + esc(tr(l[1])) + '</span>' + (t.dataset.tab === 'overview' ? '' : '<span class="count">0</span>');
      t.setAttribute('aria-selected', t.classList.contains('active'));
      t.title = tr(l[1]);
    });
    applyStaticLabels();

    root.addEventListener('click', function (e) {
      var t;
      if (!e.target.closest('#drp')) { var pop = $('#drPop'); if (pop && !pop.hidden) pop.hidden = true; }

      if (e.target.closest('#btnLang')) return toggleLang();
      if (e.target.closest('#drToggle')) { var p = $('#drPop'); p.hidden = !p.hidden; return; }
      if ((t = e.target.closest('[data-preset]'))) { var rg = presetRange(t.dataset.preset); return setDateRange(rg[0], rg[1], t.dataset.preset); }
      if (e.target.closest('[data-drapply]')) { var f = $('#drFrom').value, to = $('#drTo').value; if (f && to && f > to) { var tmp = f; f = to; to = tmp; } return setDateRange(f, to, (f || to) ? 'custom' : 'all'); }
      if (e.target.closest('#btnReset')) { state.filters = Object.assign({}, DEFAULT_FILTERS); $('#fSearch').value = ''; return applyFilters(); }
      if (e.target.closest('#btnCopy')) return copyText(buildSummary(), tr('Summary copied'));

      if ((t = e.target.closest('.tab'))) return setTab(t.dataset.tab);
      if ((t = e.target.closest('[data-aging]'))) {
        var b = BUCKETS.filter(function (x) { return x.k === t.dataset.aging; })[0];
        state.tables.taradhi.reset();
        state.tables.taradhi.setExtra(function (r) { return r._bucket === b.k; }, function () { return tr('Aging:') + ' ' + tr(b.label); });
        return setTab('taradhi');
      }
      if ((t = e.target.closest('[data-extra]'))) {
        var ex = EXTRA[t.dataset.extra];
        state.tables.taradhi.reset();
        state.tables.taradhi.setExtra(ex.fn, function () { return tf(ex.label, ex.args || []); });
        return setTab('taradhi');
      }
      if ((t = e.target.closest('[data-goto]'))) {
        var tab = t.dataset.goto;
        if (tab === 'taradhi') { state.tables.taradhi.reset(); state.tables.taradhi.setToggle(!!t.dataset.overdue); }
        if (tab === 'customers') state.tables.customers.reset();
        return setTab(tab);
      }
      if ((t = e.target.closest('[data-alert]'))) { state.alertTab = t.dataset.alert; return renderAlerts(); }
      if ((t = e.target.closest('[data-open]'))) return openDrawer(t.dataset.open, t.dataset.name);
      if (e.target.closest('[data-close]') || e.target.closest('#scrim')) return closeDrawer();
      if ((t = e.target.closest('[data-copy]'))) {
        var rec = state.raw.taradhi.filter(function (x) { return x.name === t.dataset.copy; })[0];
        if (rec) copyText(reminderText(rec._customer, rec._balance, rec.judgement_no || rec.name, rec.expected_collection), tr('Reminder text copied'));
        return;
      }
      if ((t = e.target.closest('[data-copy-cust]'))) {
        var g = state.custAgg.filter(function (x) { return x.name === t.dataset.copyCust; })[0];
        if (g) copyText(reminderText(g.name, g.out, g.cases === 1 ? (g.rows[0].judgement_no || g.rows[0].name) : '', null), tr('Reminder text copied'));
        return;
      }
      if ((t = e.target.closest('[data-route]'))) { var pr = t.dataset.route.split('|'); return goRoute(pr[0], pr[1]); }
      if ((t = e.target.closest('[data-route-btn]'))) { var qr = t.dataset.routeBtn.split('|'); return goRoute(qr[0], qr[1]); }
      if ((t = e.target.closest('[data-report]'))) return frappe.set_route('query-report', t.dataset.report);
      if ((t = e.target.closest('[data-list]'))) return frappe.set_route('List', t.dataset.list);
      if ((t = e.target.closest('[data-action]'))) {
        var a = t.dataset.action;
        if (a === 'export') return exportCsv(t.dataset.target);
        if (a === 'list') return frappe.set_route('List', t.dataset.doctype);
        if (a === 'new') return frappe.new_doc(t.dataset.doctype);
      }
      if (e.target.closest('#btnRefresh')) return load();
    });

    root.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'fLocation') { state.filters.location = e.target.value; applyFilters(); }
      if (id === 'fSales') { state.filters.sales = e.target.value; applyFilters(); }
    });

    var timer = null;
    root.addEventListener('input', function (e) {
      if (e.target.id !== 'fSearch') return;
      var v = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(function () { state.filters.q = v.trim(); applyFilters(); }, 180);
    });

    root.addEventListener('keydown', function (e) {
      var tr_ = e.target.closest && e.target.closest('tr[data-open]');
      if (tr_ && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(tr_.dataset.open, tr_.dataset.name); }
    });
    $('.tabs').addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'ArrowDown' && k !== 'ArrowUp') return;
      var fwd = k === 'ArrowRight' || k === 'ArrowDown';
      var tabs = $$('.tab'), i = tabs.findIndex(function (t) { return t.dataset.tab === state.tab; });
      i = (i + (fwd ? 1 : -1) + tabs.length) % tabs.length;
      e.preventDefault(); setTab(tabs[i].dataset.tab); tabs[i].focus();
    });
    document.addEventListener('keydown', function onKey(ev) {
      if (!root.host || !root.host.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (ev.key === 'Escape') { closeDrawer(); var pop = $('#drPop'); if (pop) pop.hidden = true; }
    });
  }

  initStatic();
  initTables();

  syncTheme();
  if (THEME_MODE === 'auto' && typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function () {
      if (root.host && !root.host.isConnected) { mo.disconnect(); return; }
      syncTheme();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] });
  }
  setWidthClass();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(setWidthClass).observe($('#tld'));
  else window.addEventListener('resize', setWidthClass);

  var savedTab = null;
  try { savedTab = localStorage.getItem('tld-tab'); } catch (e) { /* ignore */ }
  if (savedTab && TAB_LABELS[savedTab]) setTab(savedTab);

  applyLang();
  load();
})();