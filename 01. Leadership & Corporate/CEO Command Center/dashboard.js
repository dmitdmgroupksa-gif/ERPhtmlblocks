/* CEO Command Centre · v3 — Frappe Custom HTML Block (Script field).
   Decision & escalation centre: what needs the CEO, who owns it, and what happens next.
   Data: one Server Script API, `ceo_command_center_api` (bootstrap / overview / department / actions / drilldown / approvals / approval_detail).
   Decisions in the Approvals tab go through Frappe's native workflow call; every other view is read-only.
   Speed: last results are kept per viewer in localStorage (same day, 12 h) and shown at once while fresh data loads;
   bootstrap and the first view load in parallel; Approvals is prefetched after the overview; tabs prefetch on hover/touch;
   "View all" fetches 100 rows per server call and pages locally. Previous version: legacy/dashboard.v1.* and git history. */
(function () {
  'use strict';
  const root = typeof root_element !== 'undefined' ? root_element : document;
  const host = root.querySelector('#ceo-command-center');
  if (!host) return;
  if (host._ccDispose) host._ccDispose();
  const controller = new AbortController();
  let disposed = false, gen = 0, queueGen = 0, searchTimer;
  host._ccDispose = () => { disposed = true; gen++; clearTimeout(searchTimer); controller.abort(); };

  const API = 'ceo_command_center_api';
  const STORE = 'cc-v2-state', CACHE = 'cc-v3-cache';
  const DEPTS = [['sales', 'Sales'], ['procurement', 'Procurement'], ['finance', 'Finance'], ['people', 'People & Admin'], ['projects', 'Projects'], ['operations', 'Operations'],
    ['manufacturing', 'Manufacturing'], ['it', 'IT & Assets'], ['legal', 'Legal & Compliance'], ['dmcc', 'DMCC']];   // same as the API's DEPTS; replaced by bootstrap
  const DEPT_TEXT = {
    sales: 'Leads, DMS projects, quotations and sales orders that need follow-up. Performance uses invoiced and booked sales in the selected period.',
    procurement: 'Purchase requests, purchase orders, shipments and customs clearance. Old backlog is bundled separately from newly overdue demand.',
    finance: 'Receivables, credit-limit breaches, supplier payables, SOA and collection-list exceptions. Amounts stay in their own currency.',
    people: 'HR and admin approvals, leave returns, re-entry visas, facility rent and facility licences.',
    projects: 'Technical submittals, DMS contact requests and project tasks with a verified due date.',
    operations: 'Vehicle issues, maintenance, vehicle documents and delivery trips. Fleet rules match the Fleet dashboard.',
    manufacturing: 'Work orders, factory job orders, daily production reporting and monthly targets.',
    it: 'IT help-desk requests, subscription renewals, asset requests and repairs.',
    legal: 'Taradhi sessions and payments, legal cases, company registrations and document control.',
    dmcc: 'External DMCC business. Shown separately and never added to native ERP totals.'
  };
  const GROUPS = [['decision', 'Workflow actions'], ['escalation', 'Escalations'], ['followup', 'Department follow-up'], ['verification', 'Data verification']];
  const SEV = { critical: 'Critical', overdue: 'Overdue', due_soon: 'Due soon', pending: 'Pending', verify: 'Needs verification' };
  const STATE_TEXT = { complete: 'Complete', partial: 'Data incomplete', restricted: 'Permission restricted', not_configured: 'Not configured', unavailable: 'Source unavailable', configured: 'Configured', external: 'External' };
  const ICONS = {
    refresh: '<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>', open: '<path d="M14 4h6v6M20 4l-9 9M19 14v5H5V5h5"/>', prev: '<path d="m15 6-6 6 6 6"/>', next: '<path d="m9 6 6 6-6 6"/>',
    check: '<path d="m5 12 5 5L20 7"/>', filter: '<path d="M4 5h16l-6.2 7.6V19l-3.6 1.6v-8z"/>', cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    down: '<path d="m6 9 6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'
  };
  const icon = (k, cls) => '<svg class="cc-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[k] || '') + '</svg>';

  /* ───────── Arabic UI text (ERP data is shown as recorded) ───────── */
  const AR = {
    'companies': 'شركات', 'Other': 'أخرى', 'by month': 'شهريًا', 'Company currency': 'عملة الشركة', 'Value': 'القيمة', 'Receivables outstanding': 'الذمم القائمة', 'Overdue receivables': 'الذمم المتأخرة', 'Customer receipts in period': 'تحصيلات العملاء في الفترة', 'Cash & bank': 'النقد والبنوك', 'Invoiced': 'المفوتر', 'Booked orders': 'الأوامر المسجلة', 'Open purchase commitments': 'التزامات الشراء المفتوحة', 'Receipts in period': 'الاستلامات في الفترة',
    'Quoted value': 'قيمة العروض', 'Order value': 'قيمة الأوامر', 'PO value': 'قيمة أوامر الشراء', 'Received value': 'قيمة المستلم', 'Invoiced value': 'قيمة الفواتير', 'Supplier billing': 'فواتير الموردين', 'Revenue billed': 'الإيرادات المفوترة',
    'Sales orders booked': 'أوامر البيع المسجلة', 'Purchase orders placed': 'أوامر الشراء الصادرة', 'Goods received': 'البضائع المستلمة', 'Customer invoices': 'فواتير العملاء', 'Supplier invoices': 'فواتير الموردين', 'Leave applications': 'طلبات الإجازة', 'Work orders': 'أوامر العمل', 'Factory job orders': 'أوامر عمل المصنع', 'IT help-desk requests': 'طلبات الدعم الفني', 'DMCC invoices': 'فواتير DMCC', 'DMCC quotations': 'عروض DMCC', 'DMCC projects': 'مشاريع DMCC',
    'Nothing was recorded in this source for the selected scope.': 'لم يُسجَّل شيء في هذا المصدر ضمن النطاق المحدد.', 'External DMCC · current snapshot · all external companies. ERP filters do not apply and nothing is added to ERP totals.': 'DMCC خارجي · الوضع الحالي · كل الشركات الخارجية. لا تنطبق مرشحات النظام ولا يُضاف شيء إلى إجماليات النظام.',
    'Records': 'سجلات', 'Records by month': 'السجلات حسب الشهر', 'Peak': 'الأعلى', 'Current snapshot': 'الوضع الحالي', 'Current records': 'السجلات الحالية', 'Records in period': 'سجلات الفترة', 'All permitted records': 'كل السجلات المسموحة', 'No records in this period': 'لا توجد سجلات في هذه الفترة',
    'Quotation pipeline': 'مسار عروض الأسعار', 'Order fulfilment': 'تنفيذ أوامر البيع', 'Purchasing pipeline': 'مسار المشتريات', 'Goods receipts': 'استلام البضائع', 'Customer invoicing': 'فواتير العملاء', 'Supplier invoicing': 'فواتير الموردين', 'Workforce': 'القوى العاملة', 'Vacation requests': 'طلبات الإجازة', 'Technical submittals': 'التقديمات الفنية', 'Project tasks': 'مهام المشاريع', 'Delivery trips': 'رحلات التسليم', 'Fleet availability': 'حالة الأسطول', 'Production orders': 'أوامر الإنتاج', 'Factory jobs': 'أعمال المصانع', 'IT service requests': 'طلبات خدمات التقنية', 'Asset requests': 'طلبات الأصول', 'Legal cases': 'القضايا القانونية', 'Controlled documents': 'الوثائق المراقبة',
    'Workflow actions': 'إجراءات سير العمل',
    'CEO Command Centre': 'مركز قيادة الرئيس التنفيذي', 'Refresh data': 'تحديث البيانات', 'Loading…': 'جارٍ التحميل…', 'Updating…': 'جارٍ التحديث…',
    'Overview': 'نظرة عامة', 'Sales': 'المبيعات', 'Procurement': 'المشتريات', 'Finance': 'المالية', 'People & Admin': 'الموارد البشرية والإدارة', 'Projects': 'المشاريع',
    'Operations': 'العمليات', 'Manufacturing': 'التصنيع', 'IT & Assets': 'تقنية المعلومات والأصول', 'Legal & Compliance': 'الشؤون القانونية والامتثال', 'DMCC': 'DMCC',
    'Company': 'الشركة', 'All permitted companies': 'كل الشركات المسموح بها', 'Action due window': 'نافذة الاستحقاق', 'days': 'أيام', 'Apply': 'تطبيق', 'Clear all': 'مسح الكل',
    'Search actions': 'بحث في الإجراءات', 'My decisions': 'قراراتي', 'Escalations': 'التصعيدات', 'Department follow-up': 'متابعة الإدارات', 'Data verification': 'التحقق من البيانات',
    'Critical issues': 'مشكلات حرجة', 'Overdue': 'متأخر', 'Due within': 'مستحق خلال', 'Unowned': 'بلا مسؤول', 'Owner': 'المسؤول', 'Unassigned': 'غير مسند',
    'Action queue': 'قائمة الإجراءات', 'Departments': 'الإدارات', 'Department': 'الإدارة', 'Decisions': 'قرارات', 'Critical': 'حرج', 'Follow-up': 'متابعة', 'Oldest due': 'أقدم استحقاق',
    'Upcoming commitments': 'الالتزامات القادمة', 'Company pulse': 'نبض الشركة', 'Source health': 'سلامة المصادر', 'Actions': 'الإجراءات', 'Performance': 'الأداء', 'Upcoming': 'القادم',
    'Data checks': 'فحوصات البيانات', 'View all': 'عرض الكل', 'Top items': 'أهم العناصر', 'Previous': 'السابق', 'Next': 'التالي', 'Open record': 'فتح السجل', 'Open filtered list': 'فتح القائمة المصفاة',
    'Open department dashboard': 'فتح لوحة الإدارة', 'Close': 'إغلاق', 'Reason': 'السبب', 'Status': 'الحالة', 'Due': 'الاستحقاق', 'Amount': 'المبلغ', 'Source': 'المصدر', 'Record': 'السجل',
    'Assigned in ERP': 'مسند في النظام', 'Open ToDos': 'مهام مفتوحة', 'Created by': 'أنشأه', 'Last change': 'آخر تعديل', 'Related records': 'سجلات مرتبطة', 'No matching actions': 'لا توجد إجراءات مطابقة',
    'Read-only': 'للقراءة فقط', 'Severity': 'الخطورة', 'All severities': 'كل الدرجات', 'Owner filter': 'تصفية المسؤول', 'Anyone': 'الكل', 'Unowned only': 'بلا مسؤول فقط', 'Has owner': 'له مسؤول',
    'Pending': 'قيد الانتظار', 'Due soon': 'قريب الاستحقاق', 'Needs verification': 'يحتاج تحقق', 'Complete': 'مكتمل', 'Data incomplete': 'بيانات غير مكتملة', 'Permission restricted': 'صلاحية مقيدة',
    'Not configured': 'غير مهيأ', 'Source unavailable': 'المصدر غير متاح', 'currency not recorded': 'العملة غير مسجلة', 'items': 'عناصر', 'overdue': 'متأخر', 'Retry': 'إعادة المحاولة', 'Decision': 'قرار',
    'old': 'عمر السجل', 'Showing': 'عرض', 'of': 'من', 'All': 'الكل', 'sources': 'مصادر', 'need attention': 'تحتاج انتباه', 'Updated': 'آخر تحديث', 'Saved': 'محفوظ',
    'Nothing in this view needs attention for the selected scope.': 'لا شيء في هذا العرض يحتاج انتباهًا ضمن النطاق المحدد.',
    'Approvals': 'الموافقات', 'Waiting for your decision': 'بانتظار قرارك', 'documents': 'مستندات', 'document': 'مستند', 'Value awaiting': 'القيمة المعلقة', 'Oldest waiting': 'أقدم انتظار',
    'Urgent': 'عاجل', 'High priority': 'أولوية عالية', 'Routine': 'روتيني', 'Stale': 'متقادم', 'Normal': 'عادي', 'High': 'عالي',
    'Deadline ≤ 3 days, in progress or high value': 'موعد خلال 3 أيام أو قيد التنفيذ أو قيمة عالية', 'Deadline ≤ 14 days or significant value': 'موعد خلال 14 يومًا أو قيمة كبيرة',
    'Small requests, safe to approve in bulk': 'طلبات صغيرة يمكن اعتمادها دفعة واحدة', 'Dates already passed': 'تواريخ انقضت',
    'Urgent — decide today': 'عاجل — قرر اليوم', 'Stale — overtaken by events': 'متقادم — تجاوزته الأحداث', 'Sort': 'الترتيب', 'Priority': 'الأولوية', 'Nearest deadline': 'أقرب موعد',
    'Longest waiting': 'الأطول انتظارًا', 'Highest value': 'الأعلى قيمة', 'Document type': 'نوع المستند', 'Show everything': 'عرض الكل', 'Search approvals': 'بحث في الموافقات',
    'Some approval sources could not be read:': 'تعذرت قراءة بعض مصادر الموافقات:', 'Nothing is waiting for your decision': 'لا يوجد ما ينتظر قرارك', 'No matching approvals': 'لا توجد موافقات مطابقة',
    'Select routine': 'تحديد الروتيني', 'selected': 'محدد', 'Approve selected': 'اعتماد المحدد', 'Select for bulk approval': 'تحديد للاعتماد الجماعي',
    'Waiting': 'الانتظار', 'Approve': 'اعتماد', 'Reject': 'رفض', 'Hold': 'تعليق', 'Resume': 'استئناف', 'Final APPROVAL': 'الاعتماد النهائي', 'Details': 'التفاصيل',
    'A rule in the ERP decides the final check.': 'قاعدة في النظام تحدد التحقق النهائي.', 'Open attachment': 'فتح المرفق', 'Recent comments': 'آخر التعليقات', 'Open full form': 'فتح النموذج كاملًا',
    'and': 'و', 'more': 'أخرى', 'completed': 'مكتمل', 'failed': 'فشل', 'Reason for rejection (required, added as a comment)': 'سبب الرفض (مطلوب، يُضاف كتعليق)',
    'Comment (optional, added to the document)': 'تعليق (اختياري، يُضاف إلى المستند)', 'Working…': 'جارٍ التنفيذ…', 'Done': 'تم', 'Cancel': 'إلغاء',
    'Applied through the ERP workflow with your own permissions, exactly like the button on the form. It is recorded in each document\'s history.': 'يُطبَّق عبر سير العمل في النظام بصلاحياتك، تمامًا مثل الزر في النموذج، ويُسجَّل في سجل كل مستند.',
    'Please give a reason for rejecting.': 'يرجى ذكر سبب الرفض.', 'decision applied': 'قرار طُبق', 'Decision applied, but the comment could not be saved:': 'طُبق القرار لكن تعذر حفظ التعليق:',
    'decisions applied': 'قرارات طُبقت', 'Checking the latest status…': 'جارٍ التحقق من آخر حالة…',
    'Credit note request': 'طلب إشعار دائن', 'Loan application': 'طلب قرض', 'Quotation': 'عرض سعر', 'Sales order': 'أمر بيع', 'Leave': 'إجازة', 'Travel request': 'طلب سفر', 'Resignation': 'استقالة',
    'Contract renewal (Qiwa)': 'تجديد عقد (قوى)', 'Training': 'تدريب', 'General request': 'طلب عام', 'Letter': 'خطاب', 'Official memo': 'مذكرة رسمية', 'Event': 'فعالية',
    'Money & credit': 'المال والائتمان', 'Sales & pricing': 'المبيعات والتسعير', 'People & HR': 'الموظفون والموارد البشرية', 'Requests & admin': 'الطلبات والإدارة', 'Other approvals': 'موافقات أخرى',
    'Material rejected': 'رفض المواد', 'Invoicing error': 'خطأ في الفوترة', 'Discount error': 'خطأ في الخصم', 'Other reason': 'سبب آخر', 'Salesman error': 'خطأ المندوب',
    'Leave starts': 'تبدأ الإجازة', 'Last working day': 'آخر يوم عمل', 'Contract ends': 'ينتهي العقد', 'Training date': 'تاريخ التدريب', 'Event date': 'تاريخ الفعالية', 'Delivery due': 'موعد التسليم',
    'Performance period': 'فترة الأداء', 'Today': 'اليوم', 'Yesterday': 'أمس', 'This week': 'هذا الأسبوع', 'Last week': 'الأسبوع الماضي', 'This month': 'هذا الشهر', 'Last month': 'الشهر الماضي',
    'This quarter': 'هذا الربع', 'Year to date': 'السنة حتى اليوم', 'Custom range': 'نطاق مخصص', 'Select a start date': 'اختر تاريخ البداية', 'Select an end date': 'اختر تاريخ النهاية',
    'Previous month': 'الشهر السابق', 'Next month': 'الشهر التالي', 'The performance period is limited to 400 days.': 'فترة الأداء محدودة بـ 400 يوم.', 'Filters': 'المرشحات',
    'decisions': 'قرارات', 'Go to approvals': 'الانتقال إلى الموافقات', 'Remove filter': 'إزالة المرشح', 'Due window': 'نافذة الاستحقاق', 'Sections': 'الأقسام',
    'Permitted workflow actions for you': 'إجراءات سير عمل مسموحة لك', 'Safety, compliance or exposure flags': 'مؤشرات سلامة أو امتثال أو تعرض', 'Past a recorded due date': 'تجاوزت تاريخ استحقاق مسجل',
    'Escalations and follow-ups with no owner': 'تصعيدات ومتابعات بلا مسؤول', 'dated commitments': 'التزامات مؤرخة', 'urgent': 'عاجل', 'Oldest': 'الأقدم', 'Most in': 'الأكثر في',
    'These counts can overlap and should not be added together.': 'قد تتداخل هذه الأعداد ولا يجب جمعها.', 'Show all': 'عرض الكل', 'Show fewer': 'عرض أقل',
    'Actions cover all open work; the period applies to performance only.': 'الإجراءات تشمل كل العمل المفتوح؛ والفترة تخص الأداء فقط.',
    'Showing saved data while the latest loads.': 'تُعرض بيانات محفوظة أثناء تحميل الأحدث.', 'Could not refresh:': 'تعذر التحديث:', 'source unavailable': 'مصدر غير متاح', 'sources unavailable': 'مصادر غير متاحة',
    'Decisions are applied through the ERP workflow with your own permissions, exactly like the button on each form, and are recorded in the document history. Priority rules: urgent = deadline within 3 days, in progress or value ≥ 50,000; high = deadline within 14 days or value ≥ 10,000; routine = requests under 1,000; stale = dates already passed.': 'تُطبَّق القرارات عبر سير العمل في النظام بصلاحياتك، مثل زر كل نموذج، وتُسجَّل في سجل المستند. قواعد الأولوية: عاجل = موعد خلال 3 أيام أو قيد التنفيذ أو قيمة ≥ 50,000؛ عالي = موعد خلال 14 يومًا أو قيمة ≥ 10,000؛ روتيني = طلبات أقل من 1,000؛ متقادم = تواريخ انقضت.'
  };
  const S = {
    lang: 'en', tab: 'overview', sub: 'actions', company: '', window: 7, period: 'month', from: '', to: '', q: '', group: '', severity: '', owner: '', page: 0, queueAll: false, upAll: false,
    boot: null, overview: null, appr: null, dept: {}, busy: false, error: '', refreshError: '', notices: [], drawer: null, drill: {}, allRows: null
  };
  const UI = { pop: null, fd: null, fs: '', cal: null };   // open popover, filter draft, company search, calendar draft
  Object.assign(AR, {"Management Insights": "رؤى الإدارة", "Reports": "التقارير", "As of": "حتى", "the end of the selected period": "نهاية الفترة المحددة", "Sales year to date": "المبيعات منذ بداية السنة", "vs last year": "مقابل العام الماضي", "target to date": "الهدف حتى تاريخه", "Collected": "المحصّل", "Year to date": "منذ بداية السنة", "Receivables outstanding": "الذمم المدينة القائمة", "invoices": "فاتورة", "Cash & bank": "النقد والبنوك", "Bank": "البنك", "Cash": "النقد", "Stock value": "قيمة المخزون", "Purchased": "المشتريات", "to bill": "للفوترة", "Sales by month": "المبيعات حسب الشهر", "vs": "مقابل", "Month": "الشهر", "Change": "التغير", "same period": "الفترة نفسها", "Company target": "هدف الشركة", "Locations: achieved vs target": "المواقع: المحقق مقابل الهدف", "Location": "الموقع", "Monthly target": "الهدف الشهري", "Month %": "نسبة الشهر", "Previous month": "الشهر السابق", "YTD %": "نسبة السنة", "Sales orders": "أوامر البيع", "New orders": "أوامر جديدة", "Fully invoiced": "مفوترة بالكامل", "Pending billing": "بانتظار الفوترة", "Closed": "مغلقة", "Payments": "المدفوعات", "Paid out": "المدفوع", "Suppliers": "الموردون", "Employees": "الموظفون", "payments": "دفعة", "Petty cash": "العهدة النقدية", "cash accounts, credits": "حسابات النقد، الدائن", "Cash & bank accounts": "حسابات النقد والبنوك", "Account": "الحساب", "Opening": "الافتتاحي", "In": "وارد", "Out": "صادر", "Closing": "الختامي", "Management reports": "تقارير الإدارة", "Sales, targets & collections": "المبيعات والأهداف والتحصيل", "Form / list": "نموذج / قائمة", "Chart dashboard": "لوحة رسوم", "Report": "تقرير", "Jan": "يناير", "Feb": "فبراير", "Mar": "مارس", "Apr": "أبريل", "May": "مايو", "Jun": "يونيو", "Jul": "يوليو", "Aug": "أغسطس", "Sep": "سبتمبر", "Oct": "أكتوبر", "Nov": "نوفمبر", "Dec": "ديسمبر"});
  const t = s => (S.lang === 'ar' && AR[s]) || s;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const today = () => frappe.datetime.get_today();
  const loc = () => (S.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB');
  const n0 = v => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString(loc(), { maximumFractionDigits: 0 }));
  const pct = v => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%');
  function money(v, cur, compact) {
    if (v == null || v === '' || isNaN(v)) return '<span class="muted">—</span>';
    const a = Math.abs(Number(v));
    const s = compact && a >= 1e6 ? (Number(v) / 1e6).toLocaleString(loc(), { maximumFractionDigits: 2 }) + 'M' : compact && a >= 1e4 ? (Number(v) / 1e3).toLocaleString(loc(), { maximumFractionDigits: 1 }) + 'K'
      : Number(v).toLocaleString(loc(), { minimumFractionDigits: a >= 1000 ? 0 : 2, maximumFractionDigits: a >= 1000 ? 0 : 2 });
    return cur ? '<bdi class="ltr">' + esc(cur) + ' ' + s + '</bdi>' : '<bdi class="ltr">' + s + '</bdi> <small class="muted">· ' + t('currency not recorded') + '</small>';
  }
  /* dates are ISO strings (site day from frappe.datetime) handled as UTC calendar days */
  const ms = d => Date.parse(d + 'T00:00:00Z'), iso = m => new Date(m).toISOString().slice(0, 10), addDays = (d, n) => iso(ms(d) + n * 864e5), diff = (a, b) => Math.round((ms(b) - ms(a)) / 864e5);
  const monthStart = d => d.slice(0, 8) + '01';
  const addMonths = (d, n) => { const x = new Date(ms(monthStart(d))); x.setUTCMonth(x.getUTCMonth() + n); return iso(x.getTime()); };
  const weekStart = d => addDays(d, -new Date(ms(d)).getUTCDay());   // Sunday-first (KSA working week)
  function fmtD(d, yr) { try { const o = { day: 'numeric', month: 'short', timeZone: 'UTC' }; if (yr) o.year = 'numeric'; return new Intl.DateTimeFormat(loc(), o).format(new Date(ms(d))); } catch (e) { return d; } }
  const rangeLabel = (a, b) => (!a || !b ? '' : a === b ? fmtD(a, 1) : fmtD(a, a.slice(0, 4) !== b.slice(0, 4)) + ' – ' + fmtD(b, 1));
  const fmtDate = d => (d ? '<bdi class="ltr">' + esc(fmtD(String(d).slice(0, 10), 1)) + '</bdi>' : '<span class="muted">—</span>');
  const daysTxt = n => (S.lang === 'ar' ? n0(n) + ' ' + t('days') : n0(n) + (Math.abs(n) === 1 ? ' day' : ' days'));
  const pill = (txt, cls) => '<span class="cc-pill ' + (cls || '') + '">' + esc(t(txt)) + '</span>';
  const depts = () => (S.boot?.departments || DEPTS.map(([key, label]) => ({ key, label, dashboards: [] })));
  const deptLabel = k => { if (k === 'overview') return t('Overview'); const d = depts().find(x => x.key === k); return t(d ? d.label : k); };

  /* performance period presets (end date never after today; the API caps a period at 400 days) */
  const PERIODS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['lastWeek', 'Last week'], ['month', 'This month'], ['lastMonth', 'Last month'], ['quarter', 'This quarter'], ['ytd', 'Year to date'], ['custom', 'Custom range']];
  const PGROUPS = [['today', 'yesterday'], ['week', 'lastWeek'], ['month', 'lastMonth'], ['quarter', 'ytd'], ['custom']];
  function periodRange(k) {
    const d = today(), ws = weekStart(d), lm = addMonths(d, -1), m = +d.slice(5, 7), qs = d.slice(0, 5) + String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0') + '-01';
    return { today: [d, d], yesterday: [addDays(d, -1), addDays(d, -1)], week: [ws, d], lastWeek: [addDays(ws, -7), addDays(ws, -1)], month: [monthStart(d), d],
      lastMonth: [lm, addDays(monthStart(d), -1)], quarter: [qs, d], ytd: [d.slice(0, 4) + '-01-01', d] }[k] || [S.from, S.to];
  }
  const periodName = k => t((PERIODS.find(p => p[0] === k) || [k, k])[1]);

  /* ───────── Persistence (per viewer convenience only) ───────── */
  function restore() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (v.lang === 'ar') S.lang = 'ar';
      ['tab', 'sub', 'company', 'window', 'period', 'from', 'to'].forEach(k => { if (v[k] != null) S[k] = v[k]; });
    } catch (e) { /* storage unavailable: defaults */ }
  }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify({ lang: S.lang, tab: S.tab, sub: S.sub, company: S.company, window: S.window, period: S.period, from: S.from, to: S.to })); } catch (e) { /* optional */ } }

  /* ───────── Saved results (stale-while-revalidate). Per viewer and scope, same site day, at most 12 h old. ───────── */
  const me = () => (frappe.session && frappe.session.user) || '';
  const key = () => [S.company, S.window, S.from, S.to].join('|');
  const ckey = (action, extra, scoped) => [CACHE, me(), action, scoped === false ? '' : key(), extra || ''].join('~');
  function cacheGet(k) {
    try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && v.day === today() && Date.now() - v.at < 432e5 ? v : null; } catch (e) { return null; }
  }
  function cachePut(k, d) {
    try {
      const s = JSON.stringify({ at: Date.now(), day: today(), d });
      if (s.length > 15e5) return;                                    // shortcut: very large department payloads are not saved
      const idx = (JSON.parse(localStorage.getItem(CACHE + '~idx') || '[]')).filter(x => x !== k).concat([k]);
      while (idx.length > 10) localStorage.removeItem(idx.shift());   // keep the 10 most recent views
      localStorage.setItem(k, s); localStorage.setItem(CACHE + '~idx', JSON.stringify(idx));
    } catch (e) { cacheDrop(); }                                       // quota: start again rather than fail
  }
  function cacheDrop(keepBoot) {
    try {
      const idx = JSON.parse(localStorage.getItem(CACHE + '~idx') || '[]'), keep = idx.filter(k => keepBoot && k.indexOf('~bootstrap~') > 0);
      idx.forEach(k => { if (keep.indexOf(k) < 0) localStorage.removeItem(k); }); localStorage.setItem(CACHE + '~idx', JSON.stringify(keep));
    } catch (e) { /* optional */ }
  }
  function cacheOthers() {   // never show another user's saved data on a shared browser
    try { const idx = JSON.parse(localStorage.getItem(CACHE + '~idx') || '[]'); if (idx.some(k => k.split('~')[1] !== me())) cacheDrop(); } catch (e) { /* optional */ }
  }

  /* ───────── API ───────── */
  /* Management Insights and Reports (CEO and Finance Manager): the tabs are shown to those roles, and ceo_management_insights checks the
     role again on the server. Reports is a static list of ERP reports; each report keeps its own ERP role permissions. */
  const isCEO = () => ((window.frappe && frappe.user_roles) || []).some(r => r === 'CEO' || r === 'Finance Manager');
  const EXTRA_TABS = () => (isCEO() ? [['insights', 'Management Insights'], ['reports', 'Reports']] : []);
  const REPORT_LINKS = [["Management reports", "Report", "Monthly Sales Report - Individual"], ["Management reports", "Report", "Customer Payment History"], ["Management reports", "Report", "Brand wise Target"], ["Management reports", "DocType", "Weekly Sales Report"], ["Management reports", "DocType", "Sales person weekly collection - Invoice wise"], ["Management reports", "Report", "PO Analysis Report - SYSS"], ["Management reports", "Report", "Approvals Report"], ["Management reports", "Report", "CR Expiry Report"], ["Management reports", "Report", "Inventory Replenishment Report 2026"], ["Management reports", "Report", "Submittals Report"], ["Management reports", "Report", "Facility Rent Expiry Report"], ["Sales, targets & collections", "Dashboard", "Collection Analysis Dashboard"], ["Sales, targets & collections", "Report", "ERP Employees Activity Reports copy"], ["Sales, targets & collections", "Report", "Daily Visits Task Report"], ["Sales, targets & collections", "Report", "DM sales Reports All Locations % Wise"], ["Sales, targets & collections", "Report", "Salesperson Attendance Today"], ["Sales, targets & collections", "Dashboard", "Department Wise Revenue breakdown"], ["Sales, targets & collections", "Report", "Sales Report - Department wise"], ["Sales, targets & collections", "Report", "Sales Report - Department wise Dated"], ["Sales, targets & collections", "Report", "Sales Vs Target VS Collection Analysis Manual Date"], ["Sales, targets & collections", "Report", "DM Sales Report - Monthlyyy"], ["Sales, targets & collections", "Report", "DM - Outstanding - As Per Submitted Days and Payment Terms - Due Date"], ["Sales, targets & collections", "Report", "Sales Vs Target VS Collection Analysis"], ["Sales, targets & collections", "Report", "DM - Outstanding - As Per Submitted Days and Payment Terms - Posting Date"], ["Sales, targets & collections", "Report", "DM Sales Report - Month Wise"], ["Sales, targets & collections", "Report", "Weekly Collection Invoice Summary Report"]];
  async function call(action, args) {
    if (action === 'reports') return { links: REPORT_LINKS };
    const body = new URLSearchParams(Object.assign({ action, company: S.company || '', window: String(S.window), from_date: S.from, to_date: S.to }, args || {}));
    const res = await fetch('/api/method/' + (action === 'insights' ? 'ceo_management_insights' : API), { method: 'POST', body, credentials: 'same-origin', signal: controller.signal, headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token, Accept: 'application/json' } });
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || !data || !data.message) {
      let msg = 'HTTP ' + res.status;
      try { const sm = JSON.parse(data._server_messages || '[]'); if (sm.length) msg = JSON.parse(sm[0]).message || msg; } catch (e) { /* keep status */ }
      if (data && data.exc_type) msg = data.exc_type + ': ' + msg;
      const err = new Error(String(msg).replace(/<[^>]+>/g, '')); err.status = res.status; throw err;
    }
    return data.message;
  }
  const INFLIGHT = new Map();   // one request per view and scope, shared by loads and prefetches
  function view(tab) {
    if (tab === 'overview') return { action: 'overview', args: {}, get: () => S.overview, set: d => { S.overview = d; } };
    if (tab === 'approvals') return { action: 'approvals', args: {}, get: () => S.appr, set: d => { S.appr = d; AP.sel.clear(); AP.detail = {}; } };
    if (tab === 'insights' || tab === 'reports') return { action: tab, args: {}, get: () => S[tab], set: d => { S[tab] = d; } };
    return { action: 'department', args: { department: tab }, get: () => S.dept[tab], set: d => { S.dept[tab] = d; } };
  }
  function fetchView(tab) {
    const v = view(tab), k = ckey(v.action, v.args.department), scope = key();
    if (INFLIGHT.has(k)) return INFLIGHT.get(k);
    const p = call(v.action, v.args).then(d => { d._key = scope; if (scope === key()) { v.set(d); cachePut(k, d); } return d; }).finally(() => INFLIGHT.delete(k));
    INFLIGHT.set(k, p); return p;
  }
  function fresh(tab) { const d = view(tab).get(); return d && d._key === key() && !d._stale; }
  function prefetch(tab) {
    if (disposed || fresh(tab) || !S.boot) return;
    fetchView(tab).then(() => { if (!disposed) render(); }, () => { /* shown when the tab is opened */ });
  }

  async function boot() {
    restore(); cacheOthers();
    if (S.period !== 'custom' || !S.from || !S.to || S.from > S.to) {   // presets are recomputed for today; only a custom range is kept as saved
      if (!PERIODS.some(p => p[0] === S.period) || S.period === 'custom') S.period = 'month';
      const p = periodRange(S.period); S.from = p[0]; S.to = p[1];
    }
    const cb = cacheGet(ckey('bootstrap', '', false)); if (cb) S.boot = cb.d;
    const bootP = call('bootstrap').then(d => { cachePut(ckey('bootstrap', '', false), d); return d; });
    load();                                                            // first view in parallel with bootstrap
    try {
      S.boot = await bootP;
      const valid = ['overview', 'approvals'].concat(EXTRA_TABS().map(x => x[0]), S.boot.departments.map(d => d.key));
      if (!valid.includes(S.tab)) { S.notices.push('Your remembered tab is no longer available, so Overview is shown.'); S.tab = 'overview'; load(); }
      if (S.company && !S.boot.companies.some(c => c.name === S.company)) { S.notices.push('Your remembered company is not accessible any more; showing all permitted companies.'); S.company = ''; persist(); load(true); }
      if (![7, 14, 30].includes(Number(S.window))) S.window = 7;
      render();
    } catch (e) { if (!disposed && !S.boot) { S.error = e.message || String(e); S.busy = false; render(); } }
  }
  async function load(force) {
    const my = ++gen, tab = S.tab, v = view(tab), k = ckey(v.action, v.args.department);
    let cur = v.get();
    if (!force && cur && cur._key === key() && !cur._stale) { S.busy = false; S.refreshError = ''; render(); return; }
    if (!force && (!cur || cur._key !== key())) { const c = cacheGet(k); if (c) { c.d._stale = true; c.d._savedAt = c.at; v.set(c.d); cur = c.d; } }
    if (force && cur) cur._stale = true;                                // keep showing it while the fresh copy loads
    S.busy = true; S.error = ''; S.refreshError = ''; render();
    try { await fetchView(tab); }
    catch (e) {
      if (my !== gen || disposed) return;
      const msg = e.message || String(e);
      if (/Company is not accessible/i.test(msg) && S.company) { S.company = ''; persist(); return load(true); }
      if (v.get() && v.get()._key === key()) S.refreshError = msg; else S.error = msg;
    }
    if (my !== gen || disposed) return;
    S.busy = false; render();
    if (tab === 'dmcc' && S.sub === 'performance') loadDMCC();
    if (tab === 'overview' && S.queueAll && !S.error && !S.refreshError) loadAll();
    if (tab === 'overview') setTimeout(() => prefetch('approvals'), 250);   // badge + instant Approvals tab
  }
  /* "View all": 100 rows per server call (each call re-runs every source), paged 25 at a time here. */
  async function loadAll() {
    const my = gen, request = ++queueGen, sp = Math.floor(S.page * 25 / 100), sig = [S.group, S.severity, S.q, key(), sp].join('|');
    if (S.allRows && S.allRows.sig === sig && !S.allRows.error) { render(); return; }
    S.allRows = { busy: true, rows: S.allRows?.rows || [], total: S.allRows?.total || 0, sig }; render();
    try {
      const d = await call('actions', { group: S.group || '', severity: S.severity || '', q: S.q || '', page: String(sp), page_size: '100' });
      if (my !== gen || request !== queueGen || disposed || !S.queueAll) return;
      S.allRows = { busy: false, rows: d.rows, total: d.total, sig, sp };
    } catch (e) {
      if (my !== gen || request !== queueGen || disposed || !S.queueAll) return;
      S.allRows = { busy: false, rows: [], total: 0, error: e.message, sig };
    }
    render();
  }

  /* ───────── Building blocks ───────── */
  function stateBox(state, title, detail) { return '<div class="cc-state ' + esc(state || '') + '" role="status"><strong>' + esc(t(title)) + '</strong>' + (detail ? '<span>' + esc(detail) + '</span>' : '') + '</div>'; }
  const ROWS = new Map();
  function remember(a) { ROWS.set(a.key, a); return a.key; }
  function sevPill(a) { return (a.group === 'decision' ? pill('Decision', 'decision') : '') + pill(SEV[a.severity] || a.severity, a.severity); }
  /* One action row: priority · what/why/where · owner · due · impact. Folds into two lines in narrow panels. */
  function actionRow(a, opts) {
    const id = remember(a), od = a.overdue_days;
    const due = a.due ? '<span class="' + (od ? 'bad-text' : '') + '">' + fmtDate(a.due) + '</span><small' + (od ? ' class="bad-text"' : '') + '>' + (od ? esc(daysTxt(od)) + ' ' + t('overdue') : esc(a.due_basis || '')) + '</small>'
      : '<span class="muted">—</span>' + (a.age_days != null ? '<small>' + esc(daysTxt(a.age_days)) + ' ' + t('old') + '</small>' : '');
    return '<button type="button" class="cc-row" data-key="' + esc(id) + '"><span class="cc-row-pri">' + sevPill(a) + '</span>'
      + '<span class="cc-row-main"><span class="cc-row-t">' + esc(a.title) + (a.bundle ? ' <span class="cc-pill muted">' + n0(a.bundle) + ' ' + t('items') + '</span>' : '') + '</span><span class="cc-row-r">' + esc(a.reason) + '</span>'
      + '<span class="cc-row-m">' + (opts && opts.dept ? '' : '<span>' + esc(deptLabel(a.dept)) + '</span>') + '<bdi>' + esc(a.doctype) + (a.name && !a.bundle ? ' · ' + esc(a.name) : '') + '</bdi>' + (a.company ? '<span>' + esc(a.company) + '</span>' : '') + '</span></span>'
      + '<span class="cc-row-own">' + (a.owner ? '<b>' + esc(a.owner) + '</b>' + (a.owner_basis && a.owner_basis !== 'unassigned' ? '<small>' + esc(a.owner_basis) + '</small>' : '') : '<b class="cc-unowned">' + t('Unassigned') + '</b>') + '</span>'
      + '<span class="cc-row-due">' + due + '</span><span class="cc-row-amt num">' + (a.amount != null ? money(a.amount, a.currency, 1) : '') + '</span></button>';
  }
  function actionList(rows, opts) {
    if (!rows.length) return stateBox('', 'No matching actions', (opts && opts.empty) || t('Nothing in this view needs attention for the selected scope.'));
    return '<div class="cc-rows">' + rows.map(a => actionRow(a, opts)).join('') + '</div>';
  }
  function kpi(o) {
    const inner = '<span class="cc-kpi-h"><span class="cc-kpi-l">' + esc(o.label) + '</span>' + (o.chip || '') + '</span><strong class="cc-kpi-v' + (o.tone ? ' ' + o.tone : '') + '">' + o.value + '</strong><span class="cc-kpi-s">' + (o.sub || '') + '</span>';
    return o.act ? '<button type="button" class="cc-kpi' + (o.on ? ' on' : '') + '" ' + o.act + ' aria-pressed="' + !!o.on + '"' + (o.tip ? ' title="' + esc(o.tip) + '"' : '') + '>' + inner + '</button>' : '<div class="cc-kpi">' + inner + '</div>';
  }
  const tag = (txt, cls) => '<span class="cc-tag' + (cls ? ' ' + cls : '') + '">' + txt + '</span>';
  function panel(title, body, meta, cls, aside) {
    return '<section class="cc-panel ' + (cls || '') + '"><header><h3>' + esc(title) + '</h3>' + (meta ? '<span class="cc-meta">' + meta + '</span>' : '') + (aside || '') + '</header>' + body + '</section>';
  }
  const matchSev = a => !S.severity || (S.severity === 'decision' ? a.group === 'decision' : S.severity === 'unowned' ? a.unowned && a.group !== 'verification' : S.severity === 'due_soon' ? (a.severity === 'due_soon' || (a.due && a.due >= today() && !a.overdue_days)) : S.severity === 'overdue' ? !!a.overdue_days : a.severity === S.severity);
  const matchQ = a => !S.q || (a.title + ' ' + a.owner + ' ' + a.name + ' ' + a.doctype + ' ' + a.reason + ' ' + (a.company || '')).toLowerCase().includes(S.q.toLowerCase());
  function searchBox(label) { return '<label class="cc-search">' + icon('search') + '<span class="sr-only">' + esc(t(label)) + '</span><input type="search" data-search data-fk="search" placeholder="' + esc(t(label)) + '" value="' + esc(S.q) + '"></label>'; }
  function pagerHTML(total, size, extra) {
    const pages = Math.max(1, Math.ceil(total / size));
    return '<div class="cc-pager"><span>' + n0(total) + ' ' + t('items') + ' · ' + (S.page + 1) + ' / ' + pages + '</span><span class="cc-pager-b"><button class="cc-btn sm" data-page="-1" data-fk="pgprev"' + (S.page <= 0 ? ' disabled' : '') + '>' + icon('prev', 'flip') + '<span class="sr-only">' + t('Previous') + '</span></button><button class="cc-btn sm" data-page="1" data-fk="pgnext"' + (S.page + 1 >= pages ? ' disabled' : '') + '>' + icon('next', 'flip') + '<span class="sr-only">' + t('Next') + '</span></button>' + (extra || '') + '</span></div>';
  }

  /* ───────── Toolbar: title · decisions · period · filters · refresh · language ───────── */
  const curData = () => (S.tab === 'overview' ? S.overview : S.tab === 'approvals' ? S.appr : S.tab === 'insights' || S.tab === 'reports' ? S[S.tab] : S.dept[S.tab]);
  function decisionsCount() { return S.appr && S.appr._key === key() ? apItems().length : null; }
  function statusLine() {
    const d = curData();
    if (!d) return S.busy ? t('Loading…') : '';
    const bad = (d.sources || []).filter(s => !['complete', 'configured'].includes(s.state) && s.scope !== 'external').length;
    const when = d._stale && d._savedAt ? t('Saved') + ' ' + new Date(d._savedAt).toTimeString().slice(0, 5) : t('Updated') + ' ' + String(d.retrieved || '').slice(11, 16);
    return esc(when) + (S.busy ? ' · <span class="cc-live">' + t('Updating…') + '</span>' : '') + (bad ? ' · <b>' + n0(bad) + ' ' + t(bad === 1 ? 'source unavailable' : 'sources unavailable') + '</b>' : '');
  }
  function toolbar() {
    const dc = decisionsCount(), urgent = S.appr && S.appr._key === key() ? apSummary(apItems()).tiers.urgent : 0, nf = S.company ? 1 : 0;
    return '<div class="cc-top"><div class="cc-top-t"><h2>' + t('CEO Command Centre') + '</h2><p role="status">' + statusLine() + '</p></div>'
      + '<div class="cc-top-c"><button type="button" class="cc-pend' + (dc ? ' on' : '') + '" data-tab="approvals" data-fk="pend" title="' + esc(t('Go to approvals')) + '"><i aria-hidden="true"></i><b class="num">' + (dc == null ? '…' : n0(dc)) + '</b><span>' + t('decisions') + '</span>' + (urgent ? '<em>' + n0(urgent) + ' ' + t('urgent') + '</em>' : '') + '</button>'
      + '<div class="cc-anchor"><button type="button" class="cc-btn cc-period" data-pop="period" data-fk="pop:period" aria-haspopup="dialog" aria-expanded="' + (UI.pop === 'period') + '" title="' + esc(t('Performance period')) + '">' + icon('cal') + '<span class="cc-period-t"><b>' + esc(periodName(S.period)) + '</b><span>' + esc(rangeLabel(S.from, S.to)) + '</span></span>' + icon('down', 'chev') + '</button>' + (UI.pop === 'period' ? periodPop() : '') + '</div>'
      + '<div class="cc-anchor"><button type="button" class="cc-btn' + (nf || Number(S.window) !== 7 ? ' on' : '') + '" data-pop="filters" data-fk="pop:filters" aria-haspopup="dialog" aria-expanded="' + (UI.pop === 'filters') + '">' + icon('filter') + '<span class="cc-btn-t">' + t('Filters') + '</span>' + (nf ? '<span class="cc-count">' + nf + '</span>' : '') + '</button>' + (UI.pop === 'filters' ? filtersPop() : '') + '</div>'
      + '<button type="button" class="cc-btn icon' + (S.busy ? ' busy' : '') + '" data-action="refresh" data-fk="refresh" aria-label="' + esc(t('Refresh data')) + '" title="' + esc(t('Refresh data')) + '" aria-busy="' + S.busy + '">' + icon('refresh') + '</button></div>'
      + '<div class="cc-lang" role="group" aria-label="Language / اللغة"><button type="button" data-lang="en" data-fk="lang:en" lang="en" aria-pressed="' + (S.lang === 'en') + '">English</button><button type="button" data-lang="ar" data-fk="lang:ar" lang="ar" aria-pressed="' + (S.lang === 'ar') + '">العربية</button></div></div>';
  }
  function filtersPop() {
    const cos = S.boot?.companies || [], q = UI.fs.toLowerCase(), list = cos.filter(c => !q || c.name.toLowerCase().includes(q) || c.name === UI.fd.company);
    return '<div class="cc-pop cc-pop-f" role="dialog" aria-label="' + esc(t('Filters')) + '"><div class="cc-pop-b"><div class="cc-ff"><label for="cc-f-co">' + t('Company') + '</label>'
      + (cos.length > 8 ? '<input type="search" class="cc-input" data-fs data-fk="fs" value="' + esc(UI.fs) + '" placeholder="' + esc(t('Company')) + '…" aria-label="' + esc(t('Company')) + '">' : '')
      + '<select id="cc-f-co" class="cc-input" data-fd="company" data-fk="fd:company"><option value="">' + t('All permitted companies') + '</option>' + list.map(c => '<option value="' + esc(c.name) + '"' + (UI.fd.company === c.name ? ' selected' : '') + '>' + esc(c.name) + ' (' + esc(c.currency) + ')</option>').join('') + '</select></div>'
      + '<div class="cc-ff"><span id="cc-f-w">' + t('Action due window') + '</span><div class="cc-segs" role="group" aria-labelledby="cc-f-w">' + [7, 14, 30].map(w => '<button type="button" data-fw="' + w + '" data-fk="fw:' + w + '" aria-pressed="' + (Number(UI.fd.window) === w) + '">' + w + ' ' + t('days') + '</button>').join('') + '</div></div></div>'
      + '<div class="cc-pop-f2"><button type="button" class="cc-btn" data-fclear="1" data-fk="fclear">' + t('Clear all') + '</button><button type="button" class="cc-btn primary" data-fapply="1" data-fk="fapply">' + t('Apply') + '</button></div></div>';
  }
  function periodPop() {
    return '<div class="cc-pop cc-pop-p' + (UI.cal ? ' has-cal' : '') + '" role="dialog" aria-label="' + esc(t('Performance period')) + '"><div class="cc-presets"><p class="cc-pop-h">' + t('Performance period') + '</p>'
      + PGROUPS.map(g => '<div class="cc-pg">' + g.map(k => { const on = UI.cal ? k === 'custom' : S.period === k, r = k === 'custom' ? null : periodRange(k);
        return '<button type="button" class="cc-preset' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-preset="' + k + '" data-fk="preset:' + k + '"><span>' + esc(periodName(k)) + '</span>' + (r ? '<small>' + esc(rangeLabel(r[0], r[1])) + '</small>' : '') + '</button>'; }).join('') + '</div>').join('')
      + '<p class="cc-pop-note">' + t('Actions cover all open work; the period applies to performance only.') + '</p></div>' + (UI.cal ? calendar() : '') + '</div>';
  }
  function calendar() {
    const c = UI.cal, v = c.view, first = weekStart(v), mon = v.slice(0, 7), td = today(), fd = c.focus && c.focus.slice(0, 7) === mon ? c.focus : v;
    let wd = '', rows = '';
    for (let i = 0; i < 7; i++) { let w = ''; try { w = new Intl.DateTimeFormat(loc(), { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(ms(addDays(first, i)))); } catch (e) { /* blank */ } wd += '<span role="columnheader">' + esc(w) + '</span>'; }
    for (let r = 0; r < 6; r++) {
      rows += '<div role="row" class="cc-cal-r">';
      for (let i = 0; i < 7; i++) {
        const d = addDays(first, r * 7 + i), end = d === c.from || d === c.to, inR = c.from && c.to && d > c.from && d < c.to, fut = d > td;
        rows += '<button type="button" role="gridcell" class="cc-day' + (d.slice(0, 7) !== mon ? ' out' : '') + (d === td ? ' today' : '') + (inR ? ' in' : '') + (end ? ' end' : '') + (c.from && c.to && d === c.from && d !== c.to ? ' s' : '') + (c.from && c.to && d === c.to && d !== c.from ? ' e' : '')
          + '" data-day="' + d + '" data-fk="day:' + d + '" tabindex="' + (d === fd ? 0 : -1) + '" aria-pressed="' + end + '" aria-label="' + esc(fmtD(d, 1)) + '"' + (fut ? ' disabled' : '') + '><bdi>' + (+d.slice(8)) + '</bdi></button>';
      }
      rows += '</div>';
    }
    const ok = c.from && c.to, long = ok && diff(c.from, c.to) > 400;
    let title = v; try { title = new Intl.DateTimeFormat(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(ms(v))); } catch (e) { /* ISO */ }
    const msg = long ? '<b class="bad-text">' + t('The performance period is limited to 400 days.') + '</b>' : ok ? esc(rangeLabel(c.from, c.to)) + ' · ' + esc(daysTxt(diff(c.from, c.to) + 1)) : esc(t(c.from ? 'Select an end date' : 'Select a start date'));
    return '<div class="cc-cal"><div class="cc-cal-h"><button type="button" class="cc-btn icon ghost" data-calnav="-1" data-fk="calprev" aria-label="' + esc(t('Previous month')) + '">' + icon('prev', 'flip') + '</button><b aria-live="polite">' + esc(title) + '</b>'
      + '<button type="button" class="cc-btn icon ghost" data-calnav="1" data-fk="calnext" aria-label="' + esc(t('Next month')) + '"' + (addMonths(v, 1) > td ? ' disabled' : '') + '>' + icon('next', 'flip') + '</button></div>'
      + '<div class="cc-cal-g" role="grid" aria-label="' + esc(title) + '"><div class="cc-cal-r wd" role="row">' + wd + '</div>' + rows + '</div>'
      + '<div class="cc-cal-f"><span aria-live="polite">' + msg + '</span><span><button type="button" class="cc-btn" data-popclose="1" data-fk="calcancel">' + t('Cancel') + '</button> <button type="button" class="cc-btn primary" data-calapply="1" data-fk="calapply"' + (ok && !long ? '' : ' disabled') + '>' + t('Apply') + '</button></span></div></div>';
  }
  function chips() {
    if (!S.company) return '';
    return '<div class="cc-chiprow"><span class="cc-chip"><span class="muted">' + t('Company') + '</span> <bdi>' + esc(S.company) + '</bdi><button type="button" data-rmco="1" data-fk="rmco" aria-label="' + esc(t('Remove filter') + ': ' + S.company) + '">' + icon('x') + '</button></span></div>';
  }
  function tabs() {
    const m = S.overview?.matrix || {}, dc = decisionsCount();
    const items = [['overview', t('Overview')], ['approvals', t('Approvals')]].concat(EXTRA_TABS().map(x => [x[0], t(x[1])]), depts().map(d => [d.key, t(d.label)]));
    return '<div class="cc-tabs" role="tablist" aria-label="' + esc(t('Sections')) + '">' + items.map(([k, l]) => {
      const c = m[k], hot = c ? (c.critical || 0) + (c.overdue || 0) : 0;
      const badge = k === 'approvals' ? (dc ? '<span class="cc-badge' + (S.appr && apSummary(apItems()).tiers.urgent ? ' bad' : '') + '" title="' + esc(t('Waiting for your decision')) + '">' + n0(dc) + '</span>' : '')
        : k !== 'overview' && hot ? '<span class="cc-badge" title="' + esc(t('Critical') + ' + ' + t('Overdue')) + '">' + n0(hot) + '</span>' : '';
      return '<button role="tab" id="cc-tab-' + k + '" data-tab="' + k + '" data-fk="tab:' + k + '" aria-selected="' + (S.tab === k) + '" aria-controls="cc-panel" tabindex="' + (S.tab === k ? 0 : -1) + '" title="' + esc(l) + '"><span>' + esc(l) + '</span>' + badge + '</button>';
    }).join('') + '</div>';
  }
  function healthBlock(sources, deptKey) {
    const list = (sources || []).filter(s => !deptKey || s.dept === deptKey || s.dept === 'all');
    const bad = list.filter(s => !['complete', 'configured'].includes(s.state));
    return '<details class="cc-health"' + (bad.some(s => ['restricted', 'unavailable'].includes(s.state)) && deptKey ? ' open' : '') + '><summary>' + icon('down', 'chev') + '<b>' + t('Source health') + '</b>'
      + (bad.length ? pill(n0(bad.length) + ' / ' + n0(list.length) + ' ' + t('need attention'), 'warn') : pill(n0(list.length) + ' ' + t('sources') + ' · ' + t('Complete'), 'good')) + '</summary>'
      + '<div class="cc-hl">' + list.map(s => '<div class="cc-hl-r"><span><b>' + esc(s.label) + '</b><small><bdi>' + esc((s.doctypes || []).join(', ')) + '</bdi>' + (s.message ? ' · ' + esc(s.message) : '') + '</small></span>'
        + '<span>' + pill(STATE_TEXT[s.state] || s.state, s.state === 'complete' || s.state === 'configured' ? 'good' : s.state === 'partial' || s.state === 'not_configured' ? 'warn' : 'bad') + (s.scope === 'unscoped' ? ' ' + pill('No company link', 'muted') : '') + '</span></div>').join('') + '</div></details>';
  }

  /* ───────── Overview ───────── */
  function overview() {
    const d = S.overview; if (!d) return '';
    const tot = d.totals, cg = d.counts_by_group, m = d.matrix || {};
    const topDept = k => { const x = depts().map(dd => [dd.key, (m[dd.key] || {})[k] || 0]).sort((a, b) => b[1] - a[1])[0]; return x && x[1] ? tag(t('Most in') + ' ' + esc(deptLabel(x[0])) + ' · ' + n0(x[1])) : ''; };
    const ap = S.appr && S.appr._key === key() ? apSummary(apItems()) : null;
    const apVal = ap ? Object.keys(ap.value).slice(0, 1).map(c => money(ap.value[c], c, 1)).join('') : '';
    const sevOn = k => S.severity === k;
    let h = '<div class="cc-kpis">'
      + kpi({ label: t('My decisions'), value: n0(ap ? ap.total : null), act: 'data-tab="approvals"', chip: ap && ap.tiers.urgent ? tag(n0(ap.tiers.urgent) + ' ' + t('urgent'), 'bad') : '',
        sub: ap ? (apVal ? t('Value awaiting') + ' ' + apVal + ' · ' : '') + t('Oldest waiting') + ' ' + esc(daysTxt(ap.oldest)) : esc(t('Checking the latest status…')), tip: t('Go to approvals') })
      + kpi({ label: t('Critical issues'), value: n0(tot.critical), tone: tot.critical ? 'bad' : '', act: 'data-att="critical"', on: sevOn('critical'), chip: topDept('critical'), sub: esc(t('Safety, compliance or exposure flags')) })
      + kpi({ label: t('Overdue'), value: n0(tot.overdue), tone: tot.overdue ? 'bad' : '', act: 'data-att="overdue"', on: sevOn('overdue'), chip: tot.oldest_due ? tag(t('Oldest') + ' ' + esc(fmtD(tot.oldest_due, 1))) : '', sub: esc(t('Past a recorded due date')) })
      + kpi({ label: t('Due within') + ' ' + d.window + ' ' + t('days'), value: n0(tot.due_soon), tone: tot.due_soon ? 'warn' : '', act: 'data-att="due_soon"', on: sevOn('due_soon'), sub: '+ ' + n0(d.upcoming_total || 0) + ' ' + t('dated commitments') })
      + kpi({ label: t('Unowned'), value: n0(tot.unowned), tone: tot.unowned ? 'warn' : '', act: 'data-att="unowned"', on: sevOn('unowned'), chip: topDept('unowned'), sub: esc(t('Escalations and follow-ups with no owner')) })
      + '</div><p class="cc-legend">' + t('These counts can overlap and should not be added together.') + '</p>';
    const grp = S.group || (cg.decision ? 'decision' : 'escalation');
    let rows, foot;
    if (S.queueAll && S.allRows) { const off = (S.page * 25) % 100; rows = S.allRows.rows.slice(off, off + 25); foot = pagerHTML(S.allRows.total, 25, '<button class="cc-btn sm ghost" data-action="view-top" data-fk="viewtop">' + t('Top items') + '</button>'); }
    else { rows = (d.top[grp] || []).filter(a => matchSev(a) && matchQ(a)); foot = cg[grp] > (d.top[grp] || []).length ? '<div class="cc-pager"><span>' + t('Showing') + ' ' + n0((d.top[grp] || []).length) + ' ' + t('of') + ' ' + n0(cg[grp]) + '</span><button class="cc-btn sm" data-action="view-all" data-fk="viewall">' + t('View all') + '</button></div>' : ''; }
    const queue = '<div class="cc-qbar"><div class="cc-chips" role="group" aria-label="' + esc(t('Action queue')) + '">' + GROUPS.map(([k, l]) => '<button type="button" data-group="' + k + '" data-fk="grp:' + k + '" aria-pressed="' + (grp === k) + '">' + t(l) + ' <b>' + n0(cg[k]) + '</b></button>').join('') + '</div>' + searchBox('Search actions') + '</div>'
      + (S.severity ? '<div class="cc-note">' + esc(t(S.severity === 'unowned' ? 'Unowned' : SEV[S.severity] || S.severity)) + ' <button class="cc-link" data-action="clear-sev" data-fk="clearsev">' + t('Show everything') + '</button></div>' : '')
      + (S.queueAll && S.allRows?.error ? stateBox('error', 'Source unavailable', S.allRows.error) : S.queueAll && S.allRows?.busy && !rows.length ? skelRows(6) : '<div' + (S.queueAll && S.allRows?.busy ? ' class="cc-dim" inert aria-busy="true"' : '') + '>' + actionList(rows) + '</div>') + foot;
    h += '<div class="cc-main2">' + panel(t('Action queue'), queue, '', 'cc-queue') + '<div class="cc-stack">' + matrixPanel(d) + upcomingPanel(d.upcoming, d.upcoming_total, d.horizon) + '</div></div>';
    h += pulsePanel(d.performance) + healthBlock(d.sources);
    return h;
  }
  function matrixPanel(d) {
    const head = '<div class="cc-mx-r cc-mx-h" aria-hidden="true"><span>' + t('Department') + '</span><span>' + t('Decisions') + '</span><span>' + t('Critical') + '</span><span>' + t('Overdue') + '</span><span class="cc-mx-x">' + t('Follow-up') + '</span><span class="cc-mx-x">' + t('Unowned') + '</span><span class="cc-mx-x">' + t('Oldest due') + '</span></div>';
    const num = (v, bad) => '<span class="num' + (v ? (bad ? ' bad-text' : '') : ' zero') + '">' + n0(v || 0) + '</span>';
    const body = depts().map(x => {
      const m = d.matrix[x.key] || {}, unavailable = (d.sources || []).filter(s => s.dept === x.key && ['restricted', 'unavailable'].includes(s.state)).length;
      return '<button type="button" class="cc-mx-r" data-tab="' + x.key + '" data-fk="mx:' + x.key + '" aria-label="' + esc(t(x.label) + ': ' + t('Critical') + ' ' + (m.critical || 0) + ', ' + t('Overdue') + ' ' + (m.overdue || 0)) + '"><span class="cc-mx-n"><b>' + esc(t(x.label)) + '</b>'
        + (unavailable ? '<small class="bad-text">' + n0(unavailable) + ' ' + t(unavailable === 1 ? 'source unavailable' : 'sources unavailable') + '</small>' : '') + '</span>'
        + num(m.decision) + num(m.critical, 1) + num(m.overdue, 1) + '<span class="cc-mx-x">' + num(m.followup) + '</span><span class="cc-mx-x">' + num(m.unowned) + '</span><span class="cc-mx-x cc-mx-d">' + (m.oldest_due ? fmtDate(m.oldest_due) : '<span class="muted">—</span>') + '</span></button>';
    }).join('');
    return panel(t('Departments'), '<div class="cc-mx">' + head + body + '</div>', '', 'cc-matrix');
  }
  function upcomingList(list, all, idxAttr) {
    const shown = all ? list : list.slice(0, 6);
    return '<ul class="cc-up">' + shown.map(u => '<li><button type="button" ' + idxAttr(u) + '><time>' + esc(fmtD(u.date, 0)) + '</time><span><b>' + esc(u.title) + '</b><small>' + esc(u.kind) + (S.tab === 'overview' ? ' · ' + esc(deptLabel(u.dept)) : '') + (u.owner ? ' · ' + esc(u.owner) : '') + '</small></span><span class="num">' + (u.amount != null ? money(u.amount, u.currency, 1) : '') + '</span></button></li>').join('') + '</ul>';
  }
  function upcomingPanel(list, total, horizon) {
    list = (list || []).filter(u => !S.q || (u.title + ' ' + u.kind).toLowerCase().includes(S.q.toLowerCase()));
    const body = list.length ? upcomingList(list, S.upAll, u => 'data-up="' + S.overview.upcoming.indexOf(u) + '"') + (list.length > 6 ? '<div class="cc-pager"><span>' + t('Showing') + ' ' + n0(S.upAll ? list.length : 6) + ' ' + t('of') + ' ' + n0(total) + '</span><button class="cc-btn sm" data-action="up-all" data-fk="upall">' + t(S.upAll ? 'Show fewer' : 'Show all') + '</button></div>' : '')
      : stateBox('', 'No dated commitments in this window', 'Sources without dates cannot appear here.');
    return panel(t('Upcoming commitments'), body, esc(t('Today') + ' – ' + fmtD(horizon || today(), 0)), 'cc-upc');
  }
  function coTable(rows, cols) {
    if (!rows || !rows.length) return '<p class="muted">No records in this scope.</p>';
    return '<div class="cc-table-wrap"><table><thead><tr>' + cols.map(c => '<th' + (c[2] ? ' class="num"' : '') + '>' + esc(c[0]) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + cols.map(c => '<td' + (c[2] ? ' class="num"' : '') + '>' + c[1](r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function pulsePanel(p) {
    p = p || {};
    const s = p.sales?.by_company, fin = p.finance || {}, cells = [];
    if (s) cells.push('<div><h4>Sales · <bdi class="ltr">' + esc(rangeLabel(s.period[0], s.period[1])) + '</bdi></h4>' + coTable(s.rows, [['Company', r => esc(r.company)], ['Invoiced', r => money(r.invoiced, r.currency, 1), 1], ['Target', r => r.target ? money(r.target, r.currency, 1) : '<span class="muted">Not set</span>', 1], ['Attainment', r => r.attainment != null ? attain(r.attainment) : '—', 1]])
      + '<p class="cc-basis">' + esc(s.basis) + (s.target_state !== 'available' ? ' Targets: CEO Sales Target has no Overall records for this period.' : '') + '</p></div>');
    if (fin.cash) cells.push('<div><h4>Cash & bank · today</h4>' + coTable(fin.cash.rows, [['Company', r => esc(r.company)], ['Balance', r => money(r.amount, r.currency, 1), 1]]) + '<p class="cc-basis">' + esc(fin.cash.basis) + '</p></div>');
    if (fin.receivables) cells.push('<div><h4>Receivables · today</h4>' + coTable(fin.receivables.rows, [['Company', r => esc(r.company)], ['Outstanding', r => money(r.outstanding, r.currency, 1), 1], ['Overdue', r => money(r.overdue, r.currency, 1), 1]]) + '<p class="cc-basis">' + esc(fin.receivables.basis) + '</p></div>');
    if (fin.collections) cells.push('<div><h4>Customer receipts in period</h4>' + coTable(fin.collections.rows, [['Company', r => esc(r.company)], ['Received', r => money(r.amount, r.currency, 1), 1], ['Entries', r => n0(r.count), 1]]) + '<p class="cc-basis">' + esc(fin.collections.basis) + '</p></div>');
    Object.keys(p).forEach(k => { if (p[k]?.error) cells.push('<div>' + stateBox(p[k].error.state, deptLabel(k) + ' · ' + (STATE_TEXT[p[k].error.state] || 'Unavailable'), p[k].error.message) + '</div>'); });
    if (!cells.length) return '';
    return panel(t('Company pulse'), '<div class="cc-pulse">' + cells.join('') + '</div>', esc('Each company in its own currency; nothing is converted or summed across currencies.'));
  }
  function attain(v) { return '<span class="cc-att"><span class="cc-att-b"><i style="width:' + Math.max(0, Math.min(100, v)).toFixed(1) + '%"></i></span>' + pct(v) + '</span>'; }

  /* ───────── Management Insights (CEO) ───────── */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function chg(cur, prev) { if (!prev || cur == null) return '<span class="muted">—</span>'; const v = 100 * (cur - prev) / Math.abs(prev); return '<span class="' + (v < 0 ? 'cc-neg' : 'cc-pos') + '">' + (v > 0 ? '+' : '') + pct(v) + '</span>'; }
  function insights() {
    const d = S.insights; if (!d) return '';
    const m = d.meta, s = d.sales, c = d.collections, r = d.receivables, cb = d.cash_bank, iv = d.inventory, o = d.orders, p = d.payments, CUR = m.currency;
    const mon = MONTHS[Number(m.month_from.slice(5, 7)) - 1] + ' ' + m.month_from.slice(0, 4);
    let h = '<p class="cc-basis">' + esc(t('As of') + ' ' + m.asof + ' · ' + t('the end of the selected period') + (m.company ? ' · ' + m.company : ' · ' + t('All permitted companies'))) + '</p>';
    h += '<div class="cc-kpis cc-kpis-d">'
      + kpi({ label: t('Sales') + ' · ' + mon, value: money(s.month, CUR, 1), sub: t('Previous month') + ' ' + money(s.prev_month, CUR, 1) })
      + kpi({ label: t('Sales year to date'), value: money(s.ytd, CUR, 1), sub: t('vs last year') + ' ' + chg(s.ytd, s.ly_ytd) + ' · ' + t('target to date') + ' ' + pct(100 * s.ytd / (s.ytd_target_to_date || 1)) })
      + kpi({ label: t('Collected') + ' · ' + mon, value: money(c.month, CUR, 1), sub: t('Year to date') + ' ' + money(c.ytd, CUR, 1) })
      + kpi({ label: t('Receivables outstanding'), value: money(r.outstanding, CUR, 1), tone: r.overdue ? 'warn' : '', sub: t('Overdue') + ' ' + money(r.overdue, CUR, 1) + ' · ' + n0(r.invoices) + ' ' + t('invoices') })
      + kpi({ label: t('Cash & bank'), value: money(cb.closing, CUR, 1), sub: t('Bank') + ' ' + money(cb.bank, CUR, 1) + ' · ' + t('Cash') + ' ' + money(cb.cash, CUR, 1) })
      + kpi({ label: t('Stock value'), value: money(iv.stock_value, CUR, 1), sub: t('Purchased') + ' ' + money(iv.purchased_month, CUR, 1) + ' · ' + t('to bill') + ' ' + money(iv.to_bill, CUR, 1) })
      + '</div>';
    const yr = m.asof.slice(0, 4), ly = String(Number(yr) - 1), mx = Math.max(1, ...s.months.map(x => Math.max(x.current || 0, x.previous || 0)));
    const bar = (v, cls) => '<span class="cc-att-b ' + (cls || '') + '"><i style="width:' + (100 * (v || 0) / mx).toFixed(1) + '%"></i></span>';
    h += panel(t('Sales by month') + ' · ' + yr + ' ' + t('vs') + ' ' + ly, coTable(s.months.map(x => Object.assign({ label: MONTHS[x.month - 1] }, x)), [[t('Month'), x => esc(t(x.label))],
      [yr, x => x.current == null ? '<span class="muted">—</span>' : '<span class="cc-ins-bar">' + bar(x.current) + money(x.current, CUR, 1) + '</span>', 1],
      [ly, x => '<span class="cc-ins-bar">' + bar(x.previous, 'prev') + money(x.previous, CUR, 1) + '</span>', 1], [t('Change'), x => chg(x.current, x.previous), 1]])
      + '<p class="cc-basis">' + esc(t('Year to date') + ' ' + yr + ': ') + money(s.ytd, CUR) + ' · ' + esc(t('same period') + ' ' + ly + ': ') + money(s.ly_ytd, CUR) + ' · ' + esc(t('Company target') + ' ' + yr + ': ') + money(s.ytd_target, CUR) + '</p>', '', 'cc-ins');
    h += panel(t('Locations: achieved vs target'), coTable(d.locations, [[t('Location'), x => '<b>' + esc(x.location) + '</b> <span class="muted">· ' + n0(x.salespeople) + '</span>'],
      [mon, x => money(x.month, CUR, 1), 1], [t('Monthly target'), x => x.target ? money(x.target, CUR, 1) : '<span class="muted">' + t('Not set') + '</span>', 1], [t('Month %'), x => x.pct_month == null ? '<span class="muted">—</span>' : attain(x.pct_month), 1],
      [t('Previous month'), x => money(x.prev_month, CUR, 1), 1], [t('Year to date'), x => money(x.ytd, CUR, 1), 1], [t('YTD %'), x => x.pct_ytd == null ? '<span class="muted">—</span>' : attain(x.pct_ytd), 1]])
      + '<p class="cc-basis">' + esc(t('Sales Team share of invoices, grouped by Sales Person location; target = the salespeople\'s monthly targets (Sales Person), YTD target = monthly target × months elapsed. Management accounts excluded, as in the previous location reports.')) + '</p>', '', 'cc-ins');
    h += '<div class="cc-ins-2">' + panel(t('Sales orders') + ' · ' + mon, '<div class="cc-kpis cc-kpis-d">' + kpi({ label: t('New orders'), value: n0(o.new), sub: money(o.value, CUR, 1) }) + kpi({ label: t('Fully invoiced'), value: n0(o.invoiced) })
        + kpi({ label: t('Pending billing'), value: n0(o.pending), tone: o.pending ? 'warn' : '' }) + kpi({ label: t('Closed'), value: n0(o.closed) }) + '</div>', '', 'cc-ins')
      + panel(t('Payments') + ' · ' + mon, '<div class="cc-kpis cc-kpis-d">' + kpi({ label: t('Paid out'), value: money(p.total, CUR, 1) }) + p.by_party.map(x => kpi({ label: t(x.party_type === 'Supplier' ? 'Suppliers' : x.party_type === 'Employee' ? 'Employees' : x.party_type), value: money(x.value, CUR, 1), sub: n0(x.count) + ' ' + t('payments') })).join('')
        + kpi({ label: t('Petty cash'), value: money(p.petty_cash, CUR, 1), sub: t('cash accounts, credits') }) + '</div>', '', 'cc-ins') + '</div>';
    const acc = cb.accounts.slice(0, 15);
    h += panel(t('Cash & bank accounts') + ' · ' + m.asof, coTable(acc, [[t('Account'), x => '<bdi>' + esc(x.name) + '</bdi> <span class="muted">· ' + esc(t(x.type)) + '</span>'], [t('Company'), x => esc(x.company)], [t('Opening'), x => money(x.opening, CUR), 1], [t('In'), x => money(x.in, CUR), 1], [t('Out'), x => money(x.out, CUR), 1], [t('Closing'), x => '<b>' + money(x.closing, CUR) + '</b>', 1]])
      + (cb.accounts.length > acc.length ? '<p class="cc-basis">' + esc(t('Largest 15 of') + ' ' + cb.accounts.length + ' ' + t('accounts; the totals above include all.')) + '</p>' : ''), '', 'cc-ins');
    h += '<p class="cc-basis">' + esc(t('Sales are submitted Sales Invoices before VAT, returns net. Collected = customer receipts (Payment Entry, VAT included). Paid out = Payment Entries of type Pay. Petty cash = credits on cash accounts. Cash & bank = ledger balance of every Bank and Cash account. Stock value = current stock value in all warehouses.')) + '</p>';
    return h;
  }
  function reportsTab() {
    const d = S.reports || { links: REPORT_LINKS }, groups = {};
    d.links.forEach(x => { (groups[x[0]] = groups[x[0]] || []).push(x); });
    const url = (ty, n) => ty === 'DocType' ? '/app/' + String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ty === 'Dashboard' ? '/app/dashboard-view/' + encodeURIComponent(n) : '/app/query-report/' + encodeURIComponent(n);
    return '<p class="cc-basis">' + esc(t('ERP reports from the former Management Reports and Sales Comparison workspaces. Each report keeps its own ERP permissions.')) + '</p>' + Object.keys(groups).map(g => panel(t(g), '<div class="cc-links">' + groups[g].map(x => '<a class="cc-linkcard" href="' + esc(url(x[1], x[2])) + '"><b>' + esc(x[2]) + '</b><span class="muted">' + esc(t(x[1] === 'DocType' ? 'Form / list' : x[1] === 'Dashboard' ? 'Chart dashboard' : 'Report')) + '</span></a>').join('') + '</div>', n0(groups[g].length))).join('');
  }

  /* ───────── Department tab ───────── */
  function department() {
    const d = S.dept[S.tab]; if (!d) return '';
    const dash = d.dashboards || [], rows = d.rows || [];
    let h = '<div class="cc-dept-head"><div><h3>' + esc(deptLabel(S.tab)) + '</h3><p>' + esc(DEPT_TEXT[S.tab] || '') + '</p></div><div class="cc-dept-links">' + dash.map(x => '<a class="cc-btn sm ghost" href="' + esc(x.route) + '">' + esc(x.label) + icon('open') + '</a>').join('') + '</div></div>';
    const inds = (d.indicators || {})[S.tab] || [];
    if (inds.length) h += '<div class="cc-kpis cc-kpis-d">' + inds.slice(0, 6).map(i => kpi({ label: i.label, value: n0(i.value), tone: i.tone === 'bad' ? 'bad' : i.tone === 'warn' ? 'warn' : '', sub: esc(i.basis) })).join('') + '</div>';
    const subs = [['actions', 'Actions', rows.filter(a => a.group !== 'verification').length], ['performance', 'Performance'], ['upcoming', 'Upcoming', (d.upcoming || []).filter(u => u.dept === S.tab).length], ['checks', 'Data checks', rows.filter(a => a.group === 'verification').length]];
    h += '<div class="cc-seg" role="tablist" aria-label="' + esc(deptLabel(S.tab)) + '">' + subs.map(([k, l, c]) => '<button type="button" role="tab" data-sub="' + k + '" data-fk="sub:' + k + '" aria-selected="' + (S.sub === k) + '">' + t(l) + (c != null ? ' <b>' + n0(c) + '</b>' : '') + '</button>').join('') + '</div>';
    if (S.tab === 'dmcc') return h + dmcc(d);
    if (S.sub === 'performance') h += performance(d);
    else if (S.sub === 'upcoming') h += upcomingDept(d);
    else if (S.sub === 'checks') h += checks(d);
    else h += deptActions(d);
    return h;
  }
  function deptActions(d) {
    const all = (d.rows || []).filter(a => a.group !== 'verification'), counts = {};
    all.forEach(a => { counts[a.group] = (counts[a.group] || 0) + 1; });
    const rows = all.filter(a => (!S.group || a.group === S.group) && matchSev(a) && matchQ(a) && (!S.owner || (S.owner === 'unowned' ? a.unowned : !a.unowned)));
    const size = 25, pages = Math.max(1, Math.ceil(rows.length / size)); if (S.page >= pages) S.page = 0;
    const bar = '<div class="cc-qbar"><div class="cc-chips" role="group" aria-label="' + esc(t('Action queue')) + '"><button type="button" data-group="" data-fk="grp:" aria-pressed="' + !S.group + '">' + t('All') + ' <b>' + n0(all.length) + '</b></button>'
      + GROUPS.filter(g => g[0] !== 'verification').map(([k, l]) => '<button type="button" data-group="' + k + '" data-fk="grp:' + k + '" aria-pressed="' + (S.group === k) + '">' + t(l) + ' <b>' + n0(counts[k] || 0) + '</b></button>').join('') + '</div>'
      + '<div class="cc-qtools"><label><span class="sr-only">' + t('Severity') + '</span><select class="cc-input" data-sev data-fk="sev"><option value="">' + t('All severities') + '</option>' + ['critical', 'overdue', 'due_soon', 'pending'].map(k => '<option value="' + k + '"' + (S.severity === k ? ' selected' : '') + '>' + t(SEV[k]) + '</option>').join('') + '</select></label>'
      + '<label><span class="sr-only">' + t('Owner filter') + '</span><select class="cc-input" data-owner data-fk="owner"><option value="">' + t('Owner') + ': ' + t('Anyone') + '</option><option value="unowned"' + (S.owner === 'unowned' ? ' selected' : '') + '>' + t('Unowned only') + '</option><option value="owned"' + (S.owner === 'owned' ? ' selected' : '') + '>' + t('Has owner') + '</option></select></label>' + searchBox('Search actions') + '</div></div>';
    return panel(t('Actions'), bar + sourceNotes(d) + actionList(rows.slice(S.page * size, (S.page + 1) * size), { dept: 1 }) + (rows.length > size ? pagerHTML(rows.length, size) : '')
      + (d.row_total > (d.rows || []).length ? '<p class="cc-basis">Showing the first ' + n0(d.rows.length) + ' of ' + n0(d.row_total) + ' actions. Use the department dashboard for the full list.</p>' : ''), '', 'cc-queue');
  }
  function sourceNotes(d) {
    const bad = (d.sources || []).filter(s => !['complete', 'configured'].includes(s.state));
    return bad.map(s => '<div class="cc-note ' + (s.state === 'partial' || s.state === 'not_configured' ? 'warn' : 'bad') + '"><b>' + esc(s.label) + ' — ' + esc(t(STATE_TEXT[s.state] || s.state)) + '.</b> ' + esc(s.message || '') + ' Its actions are not counted, so totals here are incomplete.</div>').join('')
      + ((d.sources || []).some(s => s.scope === 'unscoped') && S.company ? '<div class="cc-note">Some sources have no verified Company link and are not filtered by company. They are labelled “No company link” in Source health.</div>' : '');
  }
  function upcomingDept(d) {
    const list = (d.upcoming || []).filter(u => u.dept === S.tab);
    return panel(t('Upcoming commitments'), list.length ? upcomingList(list, true, u => 'data-up-dept="' + (d.upcoming || []).indexOf(u) + '"') : stateBox('', 'No dated commitments in this window', 'Only sources with a recorded date can appear here.'), esc(t('Today') + ' – ' + fmtD(d.horizon || today(), 0)));
  }
  function checks(d) {
    const rows = (d.rows || []).filter(a => a.group === 'verification');
    const body = rows.length ? '<div class="cc-rows">' + rows.map(a => { const id = remember(a); return '<div class="cc-check"><button type="button" class="cc-row cc-row-c" data-key="' + esc(id) + '"><span class="cc-row-main"><span class="cc-row-t">' + esc(a.title) + '</span><span class="cc-row-r">' + esc(a.reason) + '</span></span><span class="cc-row-amt num">' + (a.extra?.count != null ? n0(a.extra.count) + ' ' + t('items') : '') + '</span></button>' + (a.list ? '<button type="button" class="cc-btn sm" data-list="' + esc(id) + '">' + t('Open filtered list') + '</button>' : '') + '</div>'; }).join('') + '</div>'
      : stateBox('', 'No data checks raised', 'All sources for this department returned complete data.');
    return panel(t('Data checks'), body, esc('Source failures, missing mappings, contradictory statuses and incomplete targets. Not counted as business actions.')) + healthBlock(d.sources, S.tab);
  }
  /* Headline cards from the reconciled measures: one card per measure, summed only within a currency. */
  function performanceHighlights(p) {
    const specs = { sales: [['by_company', 'invoiced', 'Invoiced'], ['by_company', 'booked', 'Booked orders']], procurement: [['open_commitments', 'amount', 'Open purchase commitments'], ['receipts', 'amount', 'Receipts in period']],
      finance: [['cash', 'amount', 'Cash & bank'], ['receivables', 'outstanding', 'Receivables outstanding'], ['receivables', 'overdue', 'Overdue receivables'], ['collections', 'amount', 'Customer receipts in period']] }[S.tab] || [];
    const cards = specs.filter(([k]) => p[k]?.rows?.length).map(([k, f, label]) => {
      const by = {}; p[k].rows.forEach(r => { if (r[f] != null && r.currency) by[r.currency] = (by[r.currency] || 0) + Number(r[f]); });
      const curs = Object.keys(by).sort((x, y) => by[y] - by[x]); if (!curs.length) return '';
      return kpi({ label: t(label), value: money(by[curs[0]], curs[0], 1), tone: /Overdue/.test(label) ? 'bad' : '', sub: curs.slice(1).map(c => money(by[c], c, 1)).join(' · ') + (curs.length > 1 ? ' · ' : '') + n0(p[k].rows.length) + ' ' + t('companies'), tip: p[k].basis });
    }).join('');
    return cards ? '<div class="cc-kpis cc-performance-kpis">' + cards + '</div>' : '';
  }
  const PERF_PAL = ['#2b4fc1', '#6b8be0', '#a7b8ec', '#e07a1f', '#1f8a5b', '#8a97a8'];
  const vals = (o, curs) => (curs || Object.keys(o || {})).filter(c => o && o[c] != null).map(c => money(o[c], c, 1)).join(' · ');
  const mLabel = ym => { try { return new Intl.DateTimeFormat(loc(), { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(ms(ym + '-01'))); } catch (e) { return ym; } };
  /* One card per source: count and value, status split (donut + ranked legend), and a monthly series for the period. */
  function executivePerformance(p) {
    const data = p.executive; if (!data) return '';
    return (data.sections || []).map(sec => {
      const when = sec.date_field ? rangeLabel(data.period[0], data.period[1]) : t('Current snapshot');
      const meta = esc(t(sec.source)) + ' · ' + esc(when);
      if (sec.state !== 'complete') return panel(t(sec.title), stateBox(sec.state, STATE_TEXT[sec.state] || 'Source unavailable', sec.message), meta, 'cc-executive-source');
      const total = sec.total || 0, curs = (sec.currencies || []).slice().sort((x, y) => (sec.values[y] || 0) - (sec.values[x] || 0)), c0 = curs[0];   // largest value leads
      const rows = sec.statuses || [], top = rows.slice(0, 5), rest = rows.slice(5);
      if (rest.length) top.push({ label: t('Other'), count: rest.reduce((x, r) => x + r.count, 0), values: rest.reduce((o, r) => { Object.keys(r.values || {}).forEach(c => { o[c] = (o[c] || 0) + r.values[c]; }); return o; }, {}) });
      let off = 0;
      const stops = top.map((r, i) => { const a = off; off += total ? 100 * r.count / total : 0; return PERF_PAL[i % PERF_PAL.length] + ' ' + a.toFixed(2) + '% ' + off.toFixed(2) + '%'; });
      const kpis = '<div class="cc-kpis cc-kpis-d">' + kpi({ label: t(sec.date_field ? 'Records in period' : 'Current records'), value: n0(total), sub: '<bdi>' + esc(sec.doctype) + '</bdi>' })
        + (c0 ? kpi({ label: t(sec.value_label || 'Value'), value: money(sec.values[c0], c0, 1), sub: curs.length > 1 ? vals(sec.values, curs.slice(1)) : t('Company currency') }) : '') + '</div>';
      const dist = total ? '<div class="cc-distribution"><div class="cc-donut" role="img" aria-label="' + esc(top.map(r => r.label + ': ' + n0(r.count)).join(', ')) + '" style="background:conic-gradient(' + stops.join(',') + ')"><span><b>' + n0(total) + '</b><small>' + t('Records') + '</small></span></div>'
        + '<ul class="cc-perf-legend">' + top.map((r, i) => '<li><i style="background:' + PERF_PAL[i % PERF_PAL.length] + '"></i><span>' + esc(t(r.label)) + '</span><b class="num">' + n0(r.count) + '</b><small class="num">' + (c0 && r.values && r.values[c0] != null ? money(r.values[c0], c0, 1) : pct(total ? 100 * r.count / total : 0)) + '</small></li>').join('') + '</ul></div>'
        : stateBox('', 'No records in this period', t('Nothing was recorded in this source for the selected scope.'));
      const tr = sec.trend || [], useV = !!c0, val = r => (useV ? (r.values || {})[c0] || 0 : r.count), max = Math.max(1, ...tr.map(val));
      const chart = tr.length > 1 && tr.some(r => r.count) ? '<figure class="cc-trend"><figcaption>' + esc(useV ? t(sec.value_label || 'Value') + ' · ' + c0 + ' · ' + t('by month') : t('Records by month')) + '</figcaption><div class="cc-trend-b' + (tr.length > 8 ? ' dense' : '') + '" dir="ltr" role="img" aria-label="'
        + esc(tr.map(r => mLabel(r.label) + ': ' + (useV ? money(val(r), c0, 1).replace(/<[^>]+>/g, '') : n0(r.count))).join(', ')) + '">'
        + tr.map(r => '<span title="' + esc(mLabel(r.label) + ': ' + n0(r.count) + (useV ? ' · ' + c0 + ' ' + n0(val(r)) : '')) + '"><i style="height:' + (100 * val(r) / max).toFixed(1) + '%"></i><small>' + esc(mLabel(r.label)) + '</small></span>').join('') + '</div></figure>' : '';
      const scope = sec.scope === 'unscoped' && S.company ? '<p class="cc-note warn">' + t('No company link') + ' · ' + t('All permitted records') + '</p>' : '';
      return panel(t(sec.title), scope + kpis + dist + chart, meta, 'cc-executive-source');
    }).join('');
  }
  function performance(d) {
    const p = (d.performance || {})[S.tab];
    if (!p) return stateBox('not_configured', 'Not configured', 'No reconciled performance measure is defined for this department yet. Use the department dashboard.');
    let h = performanceHighlights(p) + executivePerformance(p);
    const blk = (title, body, basis) => { h += panel(title, body + (basis ? '<p class="cc-basis">' + esc(basis) + '</p>' : '')); };
    if (p.error) blk('Performance', stateBox(p.error.state, STATE_TEXT[p.error.state] || 'Unavailable', p.error.message));
    if (S.tab === 'sales') {
      if (p.by_company) blk('Sales by company', coTable(p.by_company.rows, [['Company', r => esc(r.company)], ['Invoiced', r => money(r.invoiced, r.currency, 1), 1], ['Booked orders', r => money(r.booked, r.currency, 1), 1], ['Target', r => r.target ? money(r.target, r.currency, 1) + '<br><small class="muted">' + esc(r.target_basis) + '</small>' : '<span class="muted">Not set</span>', 1], ['Attainment', r => r.attainment != null ? attain(r.attainment) : '—', 1]]), p.by_company.basis);
      if (p.quotation_conversion) blk('Quotation conversion', '<div class="cc-kpis cc-kpis-d">' + kpi({ label: 'Submitted quotations', value: n0(p.quotation_conversion.submitted) }) + kpi({ label: 'Ordered / partly ordered', value: n0(p.quotation_conversion.ordered) }) + kpi({ label: 'Conversion', value: pct(p.quotation_conversion.rate) }) + '</div>', p.quotation_conversion.basis);
    } else if (S.tab === 'procurement') {
      if (p.open_commitments) blk('Open purchase commitments', coTable(p.open_commitments.rows, [['Company', r => esc(r.company)], ['Open POs', r => n0(r.count), 1], ['PO value', r => money(r.amount, r.currency, 1), 1]]), p.open_commitments.basis);
      if (p.receipts) blk('Receipts in period', coTable(p.receipts.rows, [['Company', r => esc(r.company)], ['Receipts', r => n0(r.count), 1], ['Net value', r => money(r.amount, r.currency, 1), 1]]), p.receipts.basis);
    } else if (S.tab === 'finance') {
      if (p.cash) blk('Cash & bank', coTable(p.cash.rows, [['Company', r => esc(r.company)], ['GL balance', r => money(r.amount, r.currency, 1), 1]]), p.cash.basis);
      if (p.receivables) blk('Receivables', coTable(p.receivables.rows, [['Company', r => esc(r.company)], ['Outstanding', r => money(r.outstanding, r.currency, 1), 1], ['Overdue', r => money(r.overdue, r.currency, 1), 1], ['Overdue share', r => r.outstanding ? pct(100 * r.overdue / r.outstanding) : '—', 1]]), p.receivables.basis);
      if (p.collections) blk('Customer receipts in period', coTable(p.collections.rows, [['Company', r => esc(r.company)], ['Received', r => money(r.amount, r.currency, 1), 1], ['Entries', r => n0(r.count), 1]]), p.collections.basis);
    } else if (S.tab === 'people') {
      if (p.workforce) blk('Workforce', coTable(p.workforce.rows, [['Company', r => esc(r.company)], ['Active employees', r => n0(r.count), 1]]), p.workforce.basis);
      if (p.payroll) blk('Payroll processing (current month)', p.payroll.rows.length ? coTable(p.payroll.rows, [['Payroll Entry', r => '<bdi>' + esc(r.name) + '</bdi>'], ['Company', r => esc(r.company)], ['Period', r => esc(r.period)], ['Status', r => pill(r.status || (r.docstatus ? 'Submitted' : 'Draft'), r.docstatus == 1 ? 'good' : 'warn')]]) : stateBox('', 'Payroll not run yet', 'No Payroll Entry covers this month. This is not a zero salary cost.'), p.payroll.basis);
    } else if (S.tab === 'projects') {
      if (p.submittal_status) blk('Submittals by status', bars(p.submittal_status.rows), p.submittal_status.basis);
      if (p.approvals) blk('Approvals in period', '<div class="cc-kpis cc-kpis-d">' + kpi({ label: 'Approved submittals', value: n0(p.approvals.count) }) + '</div>', p.approvals.basis);
    } else if (S.tab === 'operations') {
      if (p.trips) blk('Delivery trips in period', bars(p.trips.rows), p.trips.basis);
      if (p.fleet) blk('Fleet master', bars(p.fleet.rows), p.fleet.basis);
    } else if (S.tab === 'manufacturing') {
      if (p.reporting) blk('Daily production reporting (30 days)', coTable(p.reporting.rows, [['Branch', r => esc(r.label)], ['Reports', r => n0(r.count), 1], ['Last report', r => fmtDate(r.last)]]), p.reporting.basis);
      if (p.targets) blk('Targets this month', p.targets.rows.length ? bars(p.targets.rows) : stateBox('not_configured', 'Not configured', 'No Manufacturing Production Target dated this month.'), p.targets.basis);
    }
    return h ? '<div class="cc-perf">' + h + '</div>' : stateBox('not_configured', 'Not configured', 'No reconciled performance measure for this department yet.');
  }
  function bars(rows) {
    if (!rows || !rows.length) return '<p class="muted">No records.</p>';
    const max = Math.max(1, ...rows.map(r => r.count || 0));
    return '<div class="cc-bars">' + rows.map(r => '<div class="cc-bars-r"><span>' + esc(r.label || 'Not set') + '</span><span class="cc-att-b"><i style="width:' + (100 * (r.count || 0) / max).toFixed(1) + '%"></i></span><b class="num">' + n0(r.count) + '</b></div>').join('') + '</div>';
  }
  async function loadDMCC() {
    const scope = key(), epoch = gen, d = S.dept.dmcc;
    if (!d || d._dmccLoading || d.performance?.dmcc?.executive) return;
    d._dmccLoading = true; render();
    const sections = await Promise.all(['Invoice', 'Quotation', 'Project'].map(async entity => {
      const section = { title: { Invoice: 'DMCC invoices', Quotation: 'DMCC quotations', Project: 'DMCC projects' }[entity], source: 'DMCC Dashboard', doctype: entity, date_field: '', scope: 'unscoped', state: 'complete' };
      try {
        let rows = [], total = null;
        do {
          const response = await fetch('/api/method/dmcc_dashboard_proxy?entity=' + entity + '&limit=500&skip=' + rows.length, { credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json' } });
          const payload = await response.json(), page = payload.message;
          if (!response.ok || !Array.isArray(page?.data)) throw new Error(page?.error || 'External source unavailable');
          total = Number(page.total);
          if (!Number.isFinite(total) || total < 0 || total > 5000 || (!page.data.length && rows.length < total)) throw new Error('Complete external totals unavailable; use the DMCC dashboard.');
          rows = rows.concat(page.data);
        } while (rows.length < total);
        if (rows.length !== total) throw new Error('External totals changed; refresh to reconcile.');
        const by = {}, sumV = {}; rows.forEach(row => { const st = row.status || 'Not set', v = entity === 'Invoice' ? Number(row.total_amount) || 0 : null; by[st] = by[st] || { label: st, count: 0, values: {} }; by[st].count++; if (v != null) { by[st].values.SAR = (by[st].values.SAR || 0) + v; sumV.SAR = (sumV.SAR || 0) + v; } });
        Object.assign(section, { total, statuses: Object.values(by).sort((a, b) => b.count - a.count), values: sumV, currencies: Object.keys(sumV), value_label: entity === 'Invoice' ? 'Revenue billed' : '', trend: [] });
      } catch (error) { Object.assign(section, { state: 'unavailable', message: error.message }); }
      return section;
    }));
    if (disposed || scope !== key() || epoch !== gen || S.dept.dmcc !== d) return;
    d._dmccLoading = false; d.performance = d.performance || {}; d.performance.dmcc = d.performance.dmcc || {};
    d.performance.dmcc.executive = { sections, period: [S.from, S.to] }; render();
  }
  function dmcc(d) {
    if (S.sub === 'performance') {
      if (d._dmccLoading) return stateBox('', 'Loading…');
      if (d.performance?.dmcc?.executive) return '<p class="cc-note">' + esc(t('External DMCC · current snapshot · all external companies. ERP filters do not apply and nothing is added to ERP totals.')) + '</p><div class="cc-perf">' + executivePerformance(d.performance.dmcc) + '</div>';
    }
    const c = (d.performance || {}).dmcc?.connection || { state: 'not_configured', message: '' };
    return panel('External DMCC connection', stateBox(c.state, STATE_TEXT[c.state] || c.state, c.message) + '<p class="cc-basis">Exception counts are enabled only after DMCC entity, status, ownership, currency and date mappings are verified. Use the DMCC dashboard for the live external view.</p>',
      esc('From an external system through its own proxy; never added to ERP totals, and a failed connection is never shown as zero.'));
  }
  const skelRows = n => '<div class="cc-rows" aria-busy="true">' + '<div class="cc-skel-row"></div>'.repeat(n) + '</div>';
  function skeleton() {
    if (S.tab === 'approvals') return '<div class="cc-kpis">' + '<div class="cc-skel-kpi"></div>'.repeat(4) + '</div>' + skelRows(5);
    return '<div class="cc-kpis">' + '<div class="cc-skel-kpi"></div>'.repeat(5) + '</div><div class="cc-main2"><div class="cc-panel">' + skelRows(7) + '</div><div class="cc-panel">' + skelRows(7) + '</div></div>';
  }

  /* ───────── Drawer ───────── */
  function drawer() {
    const a = S.drawer; if (!a) return '';
    const dr = S.drill[a.key], dash = depts().find(x => x.key === a.dept)?.dashboards?.[0];
    const row = (k, v, small) => '<dt>' + esc(t(k)) + '</dt><dd>' + v + (small ? '<small>' + esc(small) + '</small>' : '') + '</dd>';
    let body = '<p>' + esc(a.reason) + '</p><dl>'
      + row('Priority', sevPill(a) + ' ' + pill(GROUPS.find(g => g[0] === a.group)?.[1] || a.group, 'muted'))
      + row('Owner', a.owner ? esc(a.owner) : '<span class="cc-unowned">' + t('Unassigned') + '</span>', a.owner_basis !== 'unassigned' ? a.owner_basis : 'No responsible person recorded. The record creator is not treated as the owner.')
      + row('Due', a.due ? fmtDate(a.due) + (a.overdue_days ? ' · <span class="bad-text">' + esc(daysTxt(a.overdue_days)) + ' ' + t('overdue') + '</span>' : '') : '—', a.due_basis || (a.age_days != null ? a.age_days + ' days since last change' : ''))
      + row('Amount', a.amount != null ? money(a.amount, a.currency) : 'Not available', a.amount_basis || 'No verified amount for this action.')
      + row('Status', esc(a.status || '—')) + row('Department', esc(deptLabel(a.dept))) + (a.company ? row('Company', esc(a.company)) : '')
      + row('Record', '<bdi>' + esc(a.doctype) + (a.name && !a.bundle ? ' · ' + esc(a.name) : '') + '</bdi>', a.bundle ? n0(a.bundle) + ' records in this bundle' : '')
      + (a.extra?.actions ? row('Your permitted actions', esc(a.extra.actions.join(', '))) : '') + '</dl>';
    if (!a.bundle && a.name && a.doctype && a.type !== 'source_state' && a.type !== 'data_check') {
      if (!dr) body += stateBox('', 'Loading…');
      else if (dr.error) body += stateBox('restricted', 'Record details unavailable', dr.error);
      else body += '<dl>' + row('Assigned in ERP', dr.assigned.length ? esc(dr.assigned.map(x => x.name).join(', ')) : '—')
        + row('Open ToDos', dr.todos.length ? dr.todos.map(x => esc(x.user) + ' · ' + fmtDate(x.date)).join('<br>') : '—')
        + row('Created by', esc(dr.created_by) + ' · ' + fmtDate(dr.fields.creation)) + row('Last change', esc(dr.modified_by) + ' · ' + esc(String(dr.fields.modified || '').slice(0, 16)))
        + (dr.related.length ? row('Related records', dr.related.map(r => r.doctype ? '<button class="cc-link" data-related="' + esc(r.doctype) + '|' + esc(r.value) + '">' + esc(r.label) + ': ' + esc(r.value) + '</button>' : esc(r.label) + ': ' + esc(r.value)).join('<br>')) : '') + '</dl>';
    }
    body += '<p class="cc-basis">Retrieved ' + esc(curData()?.retrieved || '') + '. Act in the original form; this view does not approve, submit or reassign.</p>';
    return '<div class="cc-backdrop" data-action="close"></div><aside class="cc-drawer" role="dialog" aria-modal="true" aria-labelledby="cc-drawer-title"><header><div><p class="muted"><bdi>' + esc(a.doctype) + '</bdi></p><h3 id="cc-drawer-title">' + esc(a.title) + '</h3></div><button class="cc-close" data-action="close" aria-label="' + t('Close') + '">' + icon('x') + '</button></header>'
      + '<div class="cc-drawer-body">' + body + '</div><footer>'
      + (a.name && !a.bundle && a.doctype && a.type !== 'data_check' && a.type !== 'source_state' ? '<button class="cc-btn primary" data-route-form="1">' + icon('open') + t('Open record') + '</button>' : '')
      + (a.list ? '<button class="cc-btn' + (a.bundle ? ' primary' : '') + '" data-route-list="1">' + t('Open filtered list') + '</button>' : '')
      + (dash ? '<a class="cc-btn" href="' + esc(dash.route) + '">' + t('Open department dashboard') + '</a>' : '') + '</footer></aside>';
  }
  async function openDrawer(a) {
    S.drawer = a; S.returnFocus = a.key; render();
    if (a.bundle || !a.name || ['source_state', 'data_check'].includes(a.type) || S.drill[a.key]) return;
    try { S.drill[a.key] = await call('drilldown', { doctype: a.doctype, name: a.name }); } catch (e) { S.drill[a.key] = { error: e.message }; }
    if (S.drawer === a) render();
  }
  function openList(spec) {
    if (!spec) return;
    const opts = {}; (spec.filters || []).forEach(f => { opts[f[0]] = f[1] === '=' ? f[2] : [f[1], f[2]]; });
    frappe.route_options = opts; frappe.set_route('List', spec.doctype);
  }

  /* ───────── Approvals inbox ─────────
     Everything waiting for the viewer's workflow decision, categorised and prioritised by the API (explicit rules shown as reasons).
     Decisions go through Frappe's native frappe.model.workflow.apply_workflow, the same call as the form's action button, so roles,
     transition conditions and self-approval rules are enforced by the ERP itself. Saved (stale) data never enables a decision. */
  const AP = { cat: '', tier: '', sort: 'priority', sel: new Set(), open: null, detail: {}, confirm: null, toast: '' };
  const TIERS = [['urgent', 'Urgent — decide today'], ['high', 'High priority'], ['normal', 'Normal'], ['stale', 'Stale — overtaken by events']];
  const TIER_SHORT = { urgent: 'Urgent', high: 'High', normal: 'Normal', stale: 'Stale' };
  async function post(method, params) {
    const res = await fetch('/api/method/' + method, { method: 'POST', body: new URLSearchParams(params), credentials: 'same-origin', signal: controller.signal, headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token, Accept: 'application/json' } });
    let data = null; try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || (data && data.exc)) {
      let msg = 'HTTP ' + res.status;
      try { const sm = JSON.parse((data && data._server_messages) || '[]'); if (sm.length) msg = JSON.parse(sm[sm.length - 1]).message || msg; } catch (e) { /* keep */ }
      throw new Error(String(msg).replace(/<[^>]+>/g, ''));
    }
    return data ? data.message : null;
  }
  const apItems = () => (S.appr?.items || []);
  const apLive = () => !!S.appr && !S.appr._stale && S.appr._key === key();
  function apVisible() {
    let xs = apItems().filter(a => (!AP.cat || a.category === AP.cat) && (!AP.tier || (AP.tier === 'routine' ? a.routine : a.priority === AP.tier))
      && (!S.q || (a.title + ' ' + a.requester + ' ' + a.name + ' ' + a.type_label + ' ' + (a.note || '') + ' ' + a.tags.join(' ')).toLowerCase().includes(S.q.toLowerCase())));
    const by = { oldest: (a, b) => b.waiting_days - a.waiting_days, value: (a, b) => (b.amount || 0) - (a.amount || 0),
      deadline: (a, b) => (a.days_to_deadline ?? 9e9) - (b.days_to_deadline ?? 9e9), type: (a, b) => a.type_label.localeCompare(b.type_label) || b.waiting_days - a.waiting_days };
    if (by[AP.sort]) xs = xs.slice().sort(by[AP.sort]);
    return xs;
  }
  function apSummary(items) {
    const s = { total: items.length, tiers: { urgent: 0, high: 0, normal: 0, stale: 0 }, categories: {}, value: {}, oldest: 0, routine: 0 };
    items.forEach(a => { s.tiers[a.priority]++; s.categories[a.category] = (s.categories[a.category] || 0) + 1; if (a.amount && a.currency) s.value[a.currency] = (s.value[a.currency] || 0) + a.amount; s.oldest = Math.max(s.oldest, a.waiting_days || 0); s.routine += a.routine ? 1 : 0; });
    return s;
  }
  function approvals() {
    const d = S.appr; if (!d) return '';
    const s = apSummary(apItems()), cats = d.categories || {}, live = apLive();
    const tile = (k, label, v, sub, tone) => kpi({ label: t(label), value: n0(v), tone, sub: esc(t(sub)), act: 'data-aptier="' + k + '" data-fk="tier:' + k + '"', on: AP.tier === k });
    const value = Object.keys(s.value).map(c => money(s.value[c], c, 1)).join(' · ') || '—';
    let h = '<div class="ap-hero"><div><h3>' + t('Waiting for your decision') + '</h3><p>' + n0(s.total) + ' ' + t('documents') + ' · ' + t('Value awaiting') + ' ' + value + ' · ' + t('Oldest waiting') + ' ' + esc(daysTxt(s.oldest)) + '</p></div>'
      + '<div class="ap-roles">' + (d.user_roles || []).map(r => pill(r, 'decision')).join(' ') + '</div></div>';
    h += '<div class="cc-kpis ap-tiles">' + tile('urgent', 'Urgent', s.tiers.urgent, 'Deadline ≤ 3 days, in progress or high value', s.tiers.urgent ? 'bad' : '') + tile('high', 'High priority', s.tiers.high, 'Deadline ≤ 14 days or significant value', s.tiers.high ? 'warn' : '')
      + tile('routine', 'Routine', s.routine, 'Small requests, safe to approve in bulk') + tile('stale', 'Stale', s.tiers.stale, 'Dates already passed') + '</div>';
    h += '<div class="cc-qbar"><div class="cc-chips" role="group" aria-label="Categories"><button type="button" data-apcat="" data-fk="cat:" aria-pressed="' + !AP.cat + '">' + t('All') + ' <b>' + n0(s.total) + '</b></button>'
      + Object.keys(cats).filter(k => s.categories[k]).map(k => '<button type="button" data-apcat="' + k + '" data-fk="cat:' + k + '" aria-pressed="' + (AP.cat === k) + '">' + esc(t(cats[k])) + ' <b>' + n0(s.categories[k]) + '</b></button>').join('') + '</div>'
      + '<div class="cc-qtools"><label><span class="sr-only">' + t('Sort') + '</span><select class="cc-input" data-apsort data-fk="apsort">' + [['priority', 'Priority'], ['deadline', 'Nearest deadline'], ['oldest', 'Longest waiting'], ['value', 'Highest value'], ['type', 'Document type']].map(([k, l]) => '<option value="' + k + '"' + (AP.sort === k ? ' selected' : '') + '>' + t('Sort') + ': ' + t(l) + '</option>').join('') + '</select></label>' + searchBox('Search approvals') + '</div></div>';
    if (!live) h += '<div class="cc-note">' + t('Checking the latest status…') + '</div>';
    if (AP.tier || AP.cat || S.q) h += '<div class="cc-note">' + esc(t(AP.tier ? TIER_SHORT[AP.tier] || 'Routine' : '')) + ' <button class="cc-link" data-apclear="1" data-fk="apclear">' + t('Show everything') + '</button></div>';
    if (d.problems && d.problems.length) h += '<div class="cc-note warn">' + t('Some approval sources could not be read:') + ' ' + esc(d.problems.join(', ')) + '</div>';
    const xs = apVisible();
    if (!apItems().length) return h + stateBox('', 'Nothing is waiting for your decision', 'New requests appear here as soon as they reach a step your role approves.');
    if (!xs.length) return h + stateBox('', 'No matching approvals', 'Change the filters or search.');
    if (AP.sort === 'priority') TIERS.forEach(([k, l]) => { const g = xs.filter(a => a.priority === k); if (g.length) h += '<section class="ap-group ' + k + '"><header><h4>' + esc(t(l)) + '</h4><span class="num">' + n0(g.length) + '</span>' + (live && g.some(a => a.bulk) ? '<button class="cc-link" data-apselall="' + k + '">' + t('Select routine') + '</button>' : '') + '</header>' + g.map(apCard).join('') + '</section>'; });
    else h += '<section class="ap-group">' + xs.map(apCard).join('') + '</section>';
    const sel = apItems().filter(a => AP.sel.has(a.key));
    if (sel.length) { const v = apSummary(sel).value; h += '<div class="ap-bulkbar" role="region" aria-label="Bulk approval"><span><b>' + n0(sel.length) + '</b> ' + t('selected') + (Object.keys(v).length ? ' · ' + Object.keys(v).map(c => money(v[c], c, 1)).join(' · ') : '') + '</span><span><button class="cc-btn" data-apclearsel="1">' + t('Cancel') + '</button> <button class="cc-btn ap-approve" data-apbulk="1"' + (live ? '' : ' disabled') + '>' + icon('check') + t('Approve selected') + ' (' + n0(sel.length) + ')</button></span></div>'; }
    return h;
  }
  function apButtons(a, small) {
    const live = apLive();
    return a.actions.map(x => { const k = x.toLowerCase(), cls = /approv|accept/.test(k) ? 'ap-approve' : /reject/.test(k) ? 'ap-reject' : /hold/.test(k) ? 'ap-hold' : '';
      return '<button class="cc-btn ' + (small ? 'sm ' : '') + cls + '" data-fk="apaction:' + esc(a.key) + ':' + esc(x) + '" data-apact="' + esc(a.key) + '" data-apaction="' + esc(x) + '"' + (live ? '' : ' disabled title="' + esc(t('Checking the latest status…')) + '"') + '>' + esc(t(x)) + '</button>'; }).join('');
  }
  function apCard(a) {
    const deadline = a.deadline ? '<span>' + esc(t(a.deadline_label)) + ' ' + fmtDate(a.deadline) + '</span>' : '';
    const tone = a.priority === 'urgent' ? 'critical' : a.priority === 'high' ? 'due_soon' : a.priority === 'stale' ? 'muted' : 'pending';
    return '<article class="ap-card ' + a.priority + (AP.sel.has(a.key) ? ' selected' : '') + '" data-apkey="' + esc(a.key) + '">'
      + '<div class="ap-check">' + (a.bulk && apLive() ? '<input type="checkbox" data-apsel="' + esc(a.key) + '" aria-label="' + esc(t('Select for bulk approval') + ': ' + a.title) + '"' + (AP.sel.has(a.key) ? ' checked' : '') + '>' : '') + '</div>'
      + '<div class="ap-main"><div class="ap-top">' + pill(TIER_SHORT[a.priority], tone) + '<span class="ap-type">' + esc(t(a.type_label)) + '</span>' + (a.routine ? pill('Routine', 'good') : '') + '<span class="ap-state">' + esc(a.state) + '</span></div>'
      + '<h4 class="ap-title">' + esc(a.title) + '</h4>'
      + '<div class="ap-meta">' + (a.requester && a.requester !== a.title ? '<span>' + esc(a.requester) + '</span>' : '') + '<span' + (a.waiting_days >= 30 ? ' class="warn-text"' : '') + '>' + t('Waiting') + ' ' + esc(daysTxt(a.waiting_days)) + '</span>' + deadline + (a.company ? '<span class="ap-co">' + esc(a.company) + '</span>' : '') + '<bdi class="muted">' + esc(a.name) + '</bdi></div>'
      + (a.why.length || a.tags.length ? '<div class="ap-why">' + a.why.map(w => '<span class="ap-reason ' + a.priority + '">' + esc(w) + '</span>').join('') + a.tags.map(x => '<span class="ap-tagx">' + esc(t(x)) + '</span>').join('') + '</div>' : '')
      + (a.facts.length ? '<dl class="ap-facts">' + a.facts.slice(0, 4).map(f => '<div><dt>' + esc(t(f[0])) + '</dt><dd>' + (typeof f[1] === 'number' ? money(f[1], a.currency) : esc(f[1])) + '</dd></div>').join('') + '</dl>' : '')
      + (a.note ? '<p class="ap-note">' + esc(String(a.note).replace(/<[^>]+>/g, ' ')) + '</p>' : '') + '</div>'
      + '<div class="ap-side">' + (a.amount != null ? '<div class="ap-amount"><small>' + esc(t(a.amount_label)) + '</small><strong>' + money(a.amount, a.currency) + '</strong></div>' : '<span></span>')
      + '<div class="ap-actions">' + apButtons(a, 1) + '<button class="cc-btn sm ghost" data-apopen="' + esc(a.key) + '">' + t('Details') + '</button></div>' + (a.conditional ? '<small class="muted">' + t('A rule in the ERP decides the final check.') + '</small>' : '') + '</div></article>';
  }
  function apDrawer() {
    const a = AP.open && apItems().find(x => x.key === AP.open); if (!a) return '';
    const dd = AP.detail[a.key];
    const txt = v => { try { return new DOMParser().parseFromString(String(v), 'text/html').body.textContent || ''; } catch (e) { return String(v); } };
    let body = '<div class="ap-why">' + a.why.map(w => '<span class="ap-reason ' + a.priority + '">' + esc(w) + '</span>').join('') + '</div>';
    if (a.amount != null) body += '<div class="ap-amount big"><small>' + esc(t(a.amount_label)) + '</small><strong>' + money(a.amount, a.currency) + '</strong></div>';
    if (!dd) body += stateBox('', 'Loading…');
    else if (dd.error) body += stateBox('restricted', 'Details unavailable', dd.error);
    else {
      body += '<dl>' + dd.fields.filter(f => !/^(Workflow State|Amended From)$/.test(f.label)).map(f => '<dt>' + esc(f.label) + '</dt><dd>' + (/Attach/.test(f.type) ? '<a href="' + esc(f.value) + '" target="_blank" rel="noopener">' + t('Open attachment') + '</a>' : f.type === 'Check' ? '✓' : esc(txt(f.value)).slice(0, 1500)) + '</dd>').join('') + '</dl>';
      dd.tables.forEach(tb => { body += '<h4 class="ap-sub">' + esc(tb.label) + ' · ' + tb.rows.length + '</h4><div class="cc-table-wrap"><table><thead><tr>' + tb.columns.map(c => '<th>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>' + tb.rows.map(r => '<tr>' + tb.columns.map(c => '<td' + (/Currency|Float|Int/.test(c.type) ? ' class="num"' : '') + '>' + esc(r[c.field]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'; });
      if (dd.comments.length) body += '<h4 class="ap-sub">' + t('Recent comments') + '</h4><ul class="ap-comments">' + dd.comments.map(c => '<li><b>' + esc(c.by) + '</b> <small>' + esc(c.when) + '</small><p>' + esc(txt(c.content)) + '</p></li>').join('') + '</ul>';
      body += '<p class="cc-basis">' + t('Created by') + ' ' + esc(dd.created_by) + ' · ' + esc(dd.created) + ' · ' + t('Last change') + ' ' + esc(dd.modified_by) + ' · ' + esc(dd.modified) + '</p>';
    }
    return '<div class="cc-backdrop" data-apclose="1"></div><aside class="cc-drawer ap-drawer" role="dialog" aria-modal="true" aria-labelledby="ap-dt"><header><div><p class="muted">' + esc(t(a.type_label)) + ' · <bdi>' + esc(a.name) + '</bdi></p><h3 id="ap-dt">' + esc(a.title) + '</h3><p class="muted">' + esc(a.requester) + ' · ' + esc(a.state) + '</p></div><button class="cc-close" data-apclose="1" aria-label="' + t('Close') + '">' + icon('x') + '</button></header>'
      + '<div class="cc-drawer-body">' + body + '</div><footer>' + apButtons(a) + '<button class="cc-btn ghost" data-apform="' + esc(a.key) + '">' + icon('open') + t('Open full form') + '</button></footer></aside>';
  }
  function apModal() {
    const c = AP.confirm; if (!c) return '';
    const n = c.items.length, reject = /reject/i.test(c.action), done = c.done.length + c.failed.length;
    const list = c.items.slice(0, 8).map(a => '<li><b>' + esc(a.title) + '</b> <small class="muted">' + esc(t(a.type_label)) + ' · <bdi>' + esc(a.name) + '</bdi></small>' + (a.amount != null ? ' <span class="num">' + money(a.amount, a.currency) + '</span>' : '') + '</li>').join('') + (n > 8 ? '<li class="muted">… ' + t('and') + ' ' + n0(n - 8) + ' ' + t('more') + '</li>' : '');
    let body;
    if (c.finished) body = '<p><b>' + n0(c.done.length) + '</b> ' + t('completed') + (c.failed.length ? ', <b class="bad-text">' + n0(c.failed.length) + '</b> ' + t('failed') : '') + '.</p>' + (c.failed.length ? '<ul class="ap-fail">' + c.failed.map(f => '<li><b>' + esc(f.item.name) + '</b>: ' + esc(f.error) + '</li>').join('') + '</ul>' : '');
    else body = '<ul class="ap-confirm-list">' + list + '</ul><label class="ap-reason-box">' + (reject ? t('Reason for rejection (required, added as a comment)') : t('Comment (optional, added to the document)')) + '<textarea data-apcomment data-fk="apcomment" rows="3"' + (c.running ? ' disabled' : '') + '>' + esc(c.comment || '') + '</textarea></label>'
      + (c.running ? '<p role="status">' + t('Working…') + ' ' + n0(done) + ' / ' + n0(n) + '</p><div class="cc-att-b"><i style="width:' + Math.round(100 * done / n) + '%"></i></div>' : '')
      + '<p class="cc-basis">' + t('Applied through the ERP workflow with your own permissions, exactly like the button on the form. It is recorded in each document\'s history.') + '</p>';
    const btn = c.finished ? '<button class="cc-btn primary" data-apdone="1" data-fk="apdone">' + t('Done') + '</button>'
      : '<button class="cc-btn" data-apcancel="1" data-fk="apcancel"' + (c.running ? ' disabled' : '') + '>' + t('Cancel') + '</button><button class="cc-btn ' + (reject ? 'ap-reject solid' : /hold/i.test(c.action) ? 'ap-hold solid' : 'ap-approve') + '" data-apgo="1" data-fk="apgo"' + (c.running ? ' disabled' : '') + '>' + esc(t(c.action)) + (n > 1 ? ' ' + n0(n) : '') + '</button>';
    return '<div class="cc-backdrop ap-modal-bg"></div><div class="ap-modal" role="alertdialog" aria-modal="true" aria-labelledby="ap-mt"><h3 id="ap-mt">' + esc(t(c.action)) + ' · ' + n0(n) + ' ' + (n === 1 ? t('document') : t('documents')) + '</h3>' + body + '<footer>' + btn + '</footer></div>';
  }
  async function apRun() {
    const c = AP.confirm; if (!c || c.running) return;
    c.comment = (host.querySelector('[data-apcomment]')?.value || '').trim();
    if (/reject/i.test(c.action) && !c.comment) { frappe.show_alert ? frappe.show_alert({ message: t('Please give a reason for rejecting.'), indicator: 'red' }) : alert(t('Please give a reason for rejecting.')); host.querySelector('[data-apcomment]')?.focus(); return; }
    c.running = true; render();
    for (const a of c.items) {
      const action = c.bulk ? a.approve_action : c.action;
      const who = (frappe.session && frappe.session.user) || '', whoName = (frappe.session && (frappe.session.user_fullname || frappe.session.user)) || '';
      const comment = () => post('frappe.desk.form.utils.add_comment', { reference_doctype: a.doctype, reference_name: a.name, content: esc(action + ' — CEO Command Centre: ' + c.comment), comment_email: who, comment_by: whoName });
      try {
        if (c.comment && /reject/i.test(action)) await comment();   // a rejection reason is saved first; if it cannot be recorded, nothing is rejected
        await post('frappe.model.workflow.apply_workflow', { doc: JSON.stringify({ doctype: a.doctype, name: a.name }), action });
        if (c.comment && !/reject/i.test(action)) { try { await comment(); } catch (e) { c.failed.push({ item: a, error: t('Decision applied, but the comment could not be saved:') + ' ' + (e.message || e) }); } }
        c.done.push(a);
      } catch (e) { c.failed.push({ item: a, error: e.message || String(e) }); }
      if (disposed) return;
      render();
    }
    const doneKeys = new Set(c.done.map(a => a.key));
    S.appr.items = S.appr.items.filter(a => !doneKeys.has(a.key)); doneKeys.forEach(k => AP.sel.delete(k));
    if (AP.open && doneKeys.has(AP.open)) AP.open = null;
    S.overview = null; S.dept = {}; cacheDrop(true);   // decisions change counts everywhere: saved views are discarded
    c.running = false; c.finished = true; render();
  }
  function apStart(items, action, bulk) { if (!apLive()) return; AP.returnFocus = (root.activeElement || document.activeElement)?.getAttribute('data-fk') || 'tab:approvals'; AP.confirm = { items, action, bulk: !!bulk, done: [], failed: [], comment: '' }; render(); setTimeout(() => host.querySelector('.ap-modal textarea, .ap-modal [data-apgo]')?.focus(), 0); }
  async function apOpen(key2) {
    AP.returnFocus = (root.activeElement || document.activeElement)?.getAttribute('data-fk') || 'tab:approvals';
    AP.open = key2; render(); host.querySelector('.ap-drawer .cc-close')?.focus();
    const a = apItems().find(x => x.key === key2); if (!a || AP.detail[key2]) return;
    try { AP.detail[key2] = await call('approval_detail', { doctype: a.doctype, name: a.name }); } catch (e) { AP.detail[key2] = { error: e.message }; }
    if (AP.open === key2) render();
  }
  function apClick(el, d) {
    if (d.apcat !== undefined) { AP.cat = d.apcat; render(); return true; }
    if (d.aptier) { AP.tier = AP.tier === d.aptier ? '' : d.aptier; render(); return true; }
    if (d.apclear) { AP.cat = ''; AP.tier = ''; S.q = ''; render(); return true; }
    if (d.apselall) { apItems().filter(a => a.priority === d.apselall && a.bulk).forEach(a => AP.sel.add(a.key)); render(); return true; }
    if (d.apclearsel) { AP.sel.clear(); render(); return true; }
    if (d.apbulk) { const xs = apItems().filter(a => AP.sel.has(a.key) && a.bulk); if (xs.length) apStart(xs, 'Approve', true); return true; }
    if (d.apact) { const a = apItems().find(x => x.key === d.apact); if (a) apStart([a], d.apaction, false); return true; }
    if (d.apopen) { apOpen(d.apopen); return true; }
    if (d.apclose) { AP.open = null; render(); return true; }
    if (d.apform) { const a = apItems().find(x => x.key === d.apform); if (a) frappe.set_route('Form', a.doctype, a.name); return true; }
    if (d.apcancel) { AP.confirm = null; render(); return true; }
    if (d.apgo) { apRun(); return true; }
    if (d.apdone) { const c = AP.confirm; AP.confirm = null; AP.toast = c ? n0(c.done.length) + ' ' + t(c.done.length === 1 ? 'decision applied' : 'decisions applied') + (c.failed.length ? ' · ' + n0(c.failed.length) + ' ' + t('failed') : '') : ''; render(); setTimeout(() => { AP.toast = ''; if (!disposed) render(); }, 4000); return true; }
    return false;
  }

  /* ───────── Render (focus is kept across repaints through data-fk) ───────── */
  let lastTab = null;
  function render() {
    if (disposed) return;
    ROWS.clear();
    const act = root.activeElement || document.activeElement, fk = act && host.contains(act) && act.getAttribute ? act.getAttribute('data-fk') : null;
    let sel = null; if (fk && typeof act.selectionStart === 'number') { try { sel = [act.selectionStart, act.selectionEnd]; } catch (e) { /* not text */ } }
    const d = curData();
    if (AP.confirm && !AP.confirm.running && !AP.confirm.finished) {
      const input = host.querySelector('[data-apcomment]');
      if (input) AP.confirm.comment = input.value;
    }
    let body = '';
    if (S.error && !d) body = stateBox(/permission|access/i.test(S.error) ? 'restricted' : 'error', /permission|access/i.test(S.error) ? 'Permission restricted' : 'Source unavailable', S.error) + '<p class="cc-center"><button class="cc-btn" data-action="refresh">' + t('Retry') + '</button></p>';
    else if (!d || d._key !== key() && S.busy) body = skeleton();
    else body = '<div class="cc-view' + (lastTab !== S.tab ? ' enter' : '') + '"' + (S.busy ? ' aria-busy="true"' : '') + '>' + (S.tab === 'overview' ? overview() : S.tab === 'approvals' ? approvals() : S.tab === 'insights' ? insights() : S.tab === 'reports' ? reportsTab() : department()) + '</div>';
    const notes = S.notices.map(n => '<div class="cc-note warn">' + esc(n) + ' <button class="cc-link" data-action="dismiss">OK</button></div>').join('')
      + (S.refreshError ? '<div class="cc-note bad">' + t('Could not refresh:') + ' ' + esc(S.refreshError) + ' <button class="cc-link" data-action="refresh">' + t('Retry') + '</button></div>' : '');
    const foot = S.tab === 'approvals' ? t('Decisions are applied through the ERP workflow with your own permissions, exactly like the button on each form, and are recorded in the document history. Priority rules: urgent = deadline within 3 days, in progress or value ≥ 50,000; high = deadline within 14 days or value ≥ 10,000; routine = requests under 1,000; stale = dates already passed.')
      : 'Read-only. Actions include all open work regardless of the performance period. Unavailable, restricted or unconfigured sources are labelled, never shown as zero. Policy ' + esc(S.boot?.policy?.version || '') + ': stalled = ' + esc(S.boot?.policy?.stale_days || 14) + ' days without change; receivables follow-up after ' + esc(S.boot?.policy?.ar_followup_days || 60) + ' days overdue.';
    const layer = S.tab === 'approvals' ? apDrawer() + apModal() + (AP.toast ? '<div class="ap-toast" role="status">' + esc(AP.toast) + '</div>' : '') : drawer();
    host.innerHTML = '<div class="cc-app">' + toolbar() + chips() + tabs() + '<div class="cc-sheet" role="tabpanel" id="cc-panel" aria-labelledby="cc-tab-' + S.tab + '">' + notes + body + '<p class="cc-footnote">' + foot + '</p></div></div><div class="cc-layer">' + layer + '</div>';
    const dialog = host.querySelector('.ap-modal') || host.querySelector('.cc-drawer');
    if (dialog) {
      host.querySelector('.cc-app').inert = true;
      if (AP.confirm && host.querySelector('.ap-drawer')) host.querySelector('.ap-drawer').inert = true;
    }
    lastTab = d ? S.tab : lastTab;
    host.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr'); host.setAttribute('lang', S.lang); host.classList.toggle('cc-rtl', S.lang === 'ar');
    const on = host.querySelector('.cc-tabs [aria-selected="true"]'), bar = host.querySelector('.cc-tabs');
    if (bar) bar.classList.toggle('ovf', bar.scrollWidth > bar.clientWidth + 2);
    if (on && bar && bar.scrollWidth > bar.clientWidth) { const b = bar.getBoundingClientRect(), r = on.getBoundingClientRect(); if (r.left < b.left || r.right > b.right) bar.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2); }
    if (fk) { const n = host.querySelector('[data-fk="' + CSS.escape(fk) + '"]'); if (n) { n.focus({ preventScroll: true }); if (sel) { try { n.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } } } }
    if (dialog) {
      if (!dialog.contains(root.activeElement || document.activeElement)) dialog.querySelector('textarea:not([disabled]), button:not([disabled]), a[href]')?.focus({ preventScroll: true });
    }
    else if (S.returnFocus) { host.querySelector('[data-key="' + CSS.escape(S.returnFocus) + '"]')?.focus({ preventScroll: true }); S.returnFocus = null; }
    else if (AP.returnFocus) { const target = host.querySelector('[data-fk="' + CSS.escape(AP.returnFocus) + '"]') || on; target?.focus({ preventScroll: true }); AP.returnFocus = null; }
  }
  const focusFk = k => host.querySelector('[data-fk="' + CSS.escape(k) + '"]')?.focus({ preventScroll: true });

  /* ───────── Events ───────── */
  function switchTab(k) {
    if (k === S.tab) return; S.tab = k; S.page = 0; S.queueAll = false; S.allRows = null; S.group = ''; S.severity = ''; S.owner = '';
    if (k !== 'overview' && !['actions', 'performance', 'upcoming', 'checks'].includes(S.sub)) S.sub = 'actions';
    UI.pop = null; persist(); load();
  }
  function applyScope() { S.page = 0; S.queueAll = false; S.allRows = null; UI.pop = null; UI.cal = null; persist(); load(); }
  function closePop(restore) { const w = UI.pop; if (!w) return; UI.pop = null; UI.cal = null; render(); if (restore) focusFk('pop:' + w); }
  host.addEventListener('click', ev => {
    if (ev.target.matches('[data-apsel]')) return;
    if (UI.pop && !ev.target.closest('.cc-anchor')) closePop(false);
    if (!ev.target.closest('button, a, input, select, textarea, label')) { const card = ev.target.closest('.ap-card'); if (card && host.contains(card)) { apOpen(card.dataset.apkey); return; } }
    const el = ev.target.closest('button, a'); if (!el || !host.contains(el)) return;
    const d = el.dataset;
    if (el.tagName === 'A') return;
    if (apClick(el, d)) return;
    if (d.tab) return switchTab(d.tab);
    if (d.lang) { if (S.lang !== d.lang) { S.lang = d.lang; persist(); UI.pop = null; render(); } return; }
    if (d.pop) { if (UI.pop === d.pop) { closePop(true); return; } UI.pop = d.pop; UI.cal = null; UI.fd = { company: S.company, window: S.window }; UI.fs = '';
      if (d.pop === 'period' && S.period === 'custom') UI.cal = { from: S.from, to: S.to, view: monthStart(S.to), focus: S.to };
      render(); focusFk(d.pop === 'filters' ? 'fd:company' : UI.cal ? 'day:' + UI.cal.focus : 'preset:' + S.period); return; }
    if (d.popclose) { closePop(true); return; }
    if (d.preset) {
      if (d.preset === 'custom') { UI.cal = { from: S.from, to: S.to, view: monthStart(S.to), focus: S.to }; render(); focusFk('day:' + UI.cal.focus); return; }
      const r = periodRange(d.preset); S.period = d.preset; S.from = r[0]; S.to = r[1]; applyScope(); focusFk('pop:period'); return;
    }
    if (d.calnav && UI.cal) { UI.cal.view = addMonths(UI.cal.view, +d.calnav); UI.cal.focus = UI.cal.view; render(); return; }
    if (d.day && UI.cal) { const c = UI.cal; if (!c.from || c.to) { c.from = d.day; c.to = null; } else if (d.day < c.from) { c.to = c.from; c.from = d.day; } else c.to = d.day; c.focus = d.day; render(); focusFk('day:' + d.day); return; }
    if (d.calapply && UI.cal && UI.cal.from && UI.cal.to) { S.period = 'custom'; S.from = UI.cal.from; S.to = UI.cal.to; applyScope(); focusFk('pop:period'); return; }
    if (d.fw && UI.fd) { UI.fd.window = Number(d.fw); render(); return; }
    if (d.fapply && UI.fd) { S.company = UI.fd.company; S.window = UI.fd.window; applyScope(); focusFk('pop:filters'); return; }
    if (d.fclear) { S.company = ''; S.window = 7; applyScope(); focusFk('pop:filters'); return; }
    if (d.rmco) { S.company = ''; applyScope(); focusFk('pop:filters'); return; }
    if (d.open) { const a = ROWS.get(d.open); if (a) openDrawer(a); return; }
    if (d.list) { ev.stopPropagation(); openList(ROWS.get(d.list)?.list); return; }
    if (d.key) { const a = ROWS.get(d.key); if (a) openDrawer(a); return; }
    if (d.att) { const k = d.att; S.severity = S.severity === k ? '' : k; S.group = k === 'critical' ? 'escalation' : k === 'unowned' ? (S.group && S.group !== 'decision' ? S.group : 'followup') : (S.group || 'followup'); S.queueAll = false; S.page = 0; render(); return; }
    if (d.group !== undefined) { S.group = d.group; S.page = 0; if (S.queueAll) loadAll(); else render(); return; }
    if (d.sub) { S.sub = d.sub; S.page = 0; persist(); render(); if (S.tab === 'dmcc' && S.sub === 'performance') loadDMCC(); return; }
    if (d.page) { S.page = Math.max(0, S.page + Number(d.page)); if (S.tab === 'overview' && S.queueAll) loadAll(); else render(); return; }
    if (d.up !== undefined) { const u = S.overview.upcoming[Number(d.up)]; if (u) u.list ? openList(u.list) : frappe.set_route('Form', u.doctype, u.name); return; }
    if (d.upDept !== undefined) { const u = (S.dept[S.tab].upcoming || [])[Number(d.upDept)]; if (u) u.list ? openList(u.list) : frappe.set_route('Form', u.doctype, u.name); return; }
    if (d.routeForm) { frappe.set_route('Form', S.drawer.doctype, S.drawer.name); return; }
    if (d.routeList) { openList(S.drawer.list); return; }
    if (d.related) { const p = d.related.split('|'); frappe.set_route('Form', p[0], p[1]); return; }
    switch (d.action) {
      case 'refresh': { const current = S.dept[S.tab]; S.dept = {}; if (current) S.dept[S.tab] = current; S.drill = {}; if (S.tab !== 'overview') S.overview = null; if (S.tab !== 'approvals') S.appr = null; if (S.tab !== 'insights') S.insights = null; S.allRows = null; load(true); break; }
      case 'close': S.drawer = null; render(); break;
      case 'view-all': S.queueAll = true; S.page = 0; if (!S.group) S.group = S.overview.counts_by_group.decision ? 'decision' : 'escalation'; loadAll(); break;
      case 'view-top': S.queueAll = false; S.page = 0; render(); break;
      case 'clear-sev': S.severity = ''; S.page = 0; if (S.queueAll) loadAll(); else render(); break;
      case 'up-all': S.upAll = !S.upAll; render(); break;
      case 'dismiss': S.notices = []; render(); break;
    }
  }, { signal: controller.signal });
  /* intent prefetch: hovering, focusing or touching a tab starts its request */
  let hoverTimer;
  const intent = ev => { const b = ev.target.closest && ev.target.closest('[data-tab]'); if (!b || !host.contains(b)) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => prefetch(b.dataset.tab), ev.type === 'pointerover' ? 120 : 0); };
  host.addEventListener('pointerover', intent, { signal: controller.signal });
  host.addEventListener('touchstart', intent, { signal: controller.signal, passive: true });
  host.addEventListener('focusin', intent, { signal: controller.signal });
  document.addEventListener('pointerdown', ev => { if (!UI.pop) return; if ((ev.composedPath ? ev.composedPath() : []).indexOf(host) < 0) closePop(false); }, { signal: controller.signal });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (UI.pop) { closePop(true); return; }
    if (AP.confirm && !AP.confirm.running) { AP.confirm = null; render(); }
    else if (AP.open) { AP.open = null; render(); }
    else if (S.drawer) { S.drawer = null; render(); }
  }, { signal: controller.signal });
  host.addEventListener('change', ev => {
    const el = ev.target;
    if (el.matches('[data-apsort]')) { AP.sort = el.value; render(); }
    else if (el.matches('[data-apsel]')) { el.checked ? AP.sel.add(el.dataset.apsel) : AP.sel.delete(el.dataset.apsel); render(); }
    else if (el.matches('[data-sev]')) { S.severity = el.value; S.page = 0; render(); }
    else if (el.matches('[data-owner]')) { S.owner = el.value; S.page = 0; render(); }
    else if (el.matches('[data-fd]') && UI.fd) { UI.fd.company = el.value; render(); }
  }, { signal: controller.signal });
  host.addEventListener('input', ev => {
    if (ev.target.matches('[data-fs]')) { UI.fs = ev.target.value; render(); return; }
    if (!ev.target.matches('[data-search]')) return;
    const v = ev.target.value; clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { S.q = v.trim(); S.page = 0; if (S.tab === 'overview' && S.queueAll) loadAll(); else render(); }, 250);
  }, { signal: controller.signal });
  host.addEventListener('keydown', ev => {
    if (ev.key === 'Tab' && (S.drawer || AP.open || AP.confirm)) {
      const dialog = host.querySelector('.ap-modal') || host.querySelector('.cc-drawer');
      if (!dialog) return;
      const f = [...dialog.querySelectorAll('button:not([disabled]), a[href], textarea:not([disabled])')]; if (!f.length) return;
      const act = root.activeElement || document.activeElement, i = f.indexOf(act);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); } else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
    }
    const tab = ev.target.closest('[role="tab"][data-tab]');
    if (tab && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(ev.key)) {
      const all = [...host.querySelectorAll('.cc-tabs [role="tab"]')]; let i = all.indexOf(tab);
      const fwd = (ev.key === 'ArrowRight') !== (S.lang === 'ar');
      i = ev.key === 'Home' ? 0 : ev.key === 'End' ? all.length - 1 : (i + (fwd ? 1 : -1) + all.length) % all.length;
      ev.preventDefault(); switchTab(all[i].dataset.tab); focusFk('tab:' + all[i].dataset.tab); return;
    }
    const day = ev.target.closest('[data-day]');
    if (day && UI.cal) {
      const rtl = S.lang === 'ar', step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
      let nd = step ? addDays(day.dataset.day, step) : ev.key === 'PageUp' ? addMonths(day.dataset.day, -1) : ev.key === 'PageDown' ? addMonths(day.dataset.day, 1) : null;
      if (nd) { ev.preventDefault(); if (nd > today()) nd = today(); UI.cal.focus = nd; if (nd.slice(0, 7) !== UI.cal.view.slice(0, 7)) UI.cal.view = monthStart(nd); render(); focusFk('day:' + nd); }
    }
  }, { signal: controller.signal });
  const syncTheme = () => host.classList.toggle('cc-dark', document.documentElement.getAttribute('data-theme') === 'dark');
  syncTheme();
  const mo = new MutationObserver(syncTheme); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  controller.signal.addEventListener('abort', () => mo.disconnect());
  boot();
})();
