/* Admin & HR Dashboard (DM Group KSA) - compact dashboard v3 (2026-10-29: Arabic/RTL, royal-blue navigation). Data source: server script API admin_hr_dashboard_data (permissions enforced server-side). Read-only. */
(function () {
  var host = root_element.querySelector('#ahd');
  if (!host) return;
  var S = { d: null, tab: 'overview', busy: false, err: null, lang: 'en',
  f: {
    company: 'Durar Masagh Trading Company',
    branch: '',
    job_location: '',
    department: '',
    from_date: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
    to_date: frappe.datetime.get_today()
} };
  try { var st = localStorage.getItem('ahd_tab'); if (st) S.tab = st; } catch (e) {}
  /* lang-sync 2026-11-15: ERP User.language is the source of truth */ S.lang = (frappe.boot && frappe.boot.lang === 'ar') ? 'ar' : 'en';
  try {
    var sf = JSON.parse(sessionStorage.getItem('ahd_f') || 'null');
    if (sf && typeof sf === 'object') {
        ['company', 'branch', 'job_location', 'department', 'from_date', 'to_date']
            .forEach(function (k) {
                if (typeof sf[k] === 'string') S.f[k] = sf[k];
            });
    }
} catch (e) {}
  var TABS = [['overview', 'Overview'], ['employees', 'Employees'], ['attendance', 'Attendance'], ['leave', 'Leave'],
    ['compliance', 'Documents & Compliance'], ['requests', 'HR Requests'], ['training', 'Training'], ['analytics', 'HR Analytics']];
  var STATE = { actual: ['Actual', 'ok'], partial: ['Partial', 'warn'], missing: ['Missing data', 'muted'], unavailable: ['Unavailable', 'bad'] };
  var DR = [];
  // ---- Arabic / RTL (display only). Keys are the English UI text; digits are matched as '#'. Logic never reads translated text. ----
  var AR = {
    /* shell */
    'Admin & HR Dashboard':'لوحة الإدارة والموارد البشرية','Full HR view':'عرض الموارد البشرية الكامل','Aggregate view':'عرض إجمالي','Refresh':'تحديث','Reset':'إعادة ضبط','Loading…':'جارٍ التحميل…',
    'Company':'الشركة','Branch':'الفرع','Job location':'موقع العمل','Job Location':'موقع العمل','Department':'القسم','From Date':'من تاريخ','To Date':'إلى تاريخ','From':'من','To':'إلى','All branches':'كل الفروع','All locations':'كل المواقع','All departments':'كل الأقسام','All designations':'كل المسميات الوظيفية','All nationalities':'كل الجنسيات','All statuses':'كل الحالات','All types':'كل الأنواع','All states':'كل الحالات','All documents':'كل المستندات','All':'الكل','Any':'أي','Anyone':'أي شخص','Search':'بحث','Search…':'بحث…','Apply':'تطبيق','Clear':'مسح','Clear filters':'مسح التصفية','Page':'الصفحة','Rows':'الصفوف','Showing':'عرض','Next ›':'‹ التالي','‹ Prev':'السابق ›','Export CSV':'تصدير CSV','View all':'عرض الكل','Open':'فتح','Open ↗':'فتح ↗','List':'قائمة','View':'عرض','Enter':'إدخال','Yes':'نعم','No':'لا','None.':'لا شيء.','Other':'أخرى','Total':'الإجمالي','Count':'العدد','Date':'التاريخ','Detail':'التفاصيل','Action':'الإجراء','Check':'الفحص','Event':'الحدث','Level':'المستوى','State':'الحالة','Rule':'القاعدة','Field':'الحقل','Area':'المجال','Reason':'السبب','Record ↗':'السجل ↗','Employee ↗':'الموظف ↗','Employees ↗':'الموظفون ↗','Requests ↗':'الطلبات ↗','Allocations ↗':'المخصصات ↗','Training ↗':'التدريب ↗','Training records ↗':'سجلات التدريب ↗','Training Dashboard ↗':'لوحة التدريب ↗','Manage videos ↗':'إدارة الفيديوهات ↗','My Training ↗':'تدريبي ↗','Act ↗':'تنفيذ ↗','Open Employee record ↗':'فتح سجل الموظف ↗','Open in ERPNext ↗':'فتح في ERPNext ↗','Open in ERPNext to act ↗':'فتح في ERPNext للتنفيذ ↗','Open in ERPNext list':'فتح في قائمة ERPNext',
    'View details →':'← عرض التفاصيل','View records →':'← عرض السجلات','View requests →':'← عرض الطلبات','View applications →':'← عرض الطلبات','View assignments →':'← عرض التكليفات','Open queue →':'← فتح القائمة','View chart values':'عرض قيم الرسم البياني','× Show all applications':'× عرض كل الطلبات','× Show all assignments':'× عرض كل التكليفات','× Show all documents':'× عرض كل المستندات','× Show all requests':'× عرض كل الطلبات',
    'Overview':'نظرة عامة','Employees':'الموظفون','Attendance':'الحضور','Leave':'الإجازات','Documents & Compliance':'المستندات والالتزام','HR Requests':'طلبات الموارد البشرية','Training':'التدريب','HR Analytics':'تحليلات الموارد البشرية',
    /* states / badges */
    'Actual':'فعلي','Partial':'جزئي','Missing data':'بيانات ناقصة','Unavailable':'غير متاح','Not available':'غير متاح','No data':'لا بيانات','No data.':'لا بيانات.','No records.':'لا سجلات.','No trend data.':'لا بيانات اتجاه.','Not applicable':'لا ينطبق','Not set':'غير محدد','Missing':'مفقود','Unusual':'غير معتاد','Conflict':'تعارض','Conflicting':'متعارض',
    'Calculated from complete ERPNext records.':'محسوب من سجلات ERPNext المكتملة.','Real records, but some source data is missing/conflicting or a dependency (holiday list, auto-attendance) is incomplete.':'سجلات حقيقية لكن بعض بيانات المصدر ناقصة أو متعارضة أو ما تعتمد عليه (قائمة العطل، الحضور التلقائي) غير مكتمل.','The source DocType exists but has no records for this filter.':'نوع المستند موجود لكن لا سجلات له ضمن هذه التصفية.','Cannot be calculated reliably, or your role cannot read the source DocType.':'لا يمكن حسابه بشكل موثوق، أو أن دورك لا يملك صلاحية قراءة المصدر.','Employee-level drill-downs are returned by the server only to HR Manager / HR User.':'تفاصيل مستوى الموظف يرسلها الخادم لمدير الموارد البشرية ومستخدم الموارد البشرية فقط.','How to read this dashboard':'كيف تقرأ هذه اللوحة',
    '🔒 Details: HR Manager / HR User only':'🔒 التفاصيل: لمدير/مستخدم الموارد البشرية فقط','🔒 Details: HR Manager / HR User':'🔒 التفاصيل: لمدير/مستخدم الموارد البشرية',
    /* errors, loading */
    'Loading live ERPNext data…':'جارٍ تحميل بيانات ERPNext المباشرة…','Loading HR requests…':'جارٍ تحميل طلبات الموارد البشرية…','Loading compliance data…':'جارٍ تحميل بيانات الالتزام…','Loading compliance details…':'جارٍ تحميل تفاصيل الالتزام…','Loading documents…':'جارٍ تحميل المستندات…','Loading employee details…':'جارٍ تحميل بيانات الموظف…','Loading employees…':'جارٍ تحميل الموظفين…','Loading leave applications…':'جارٍ تحميل طلبات الإجازة…','Loading leave application…':'جارٍ تحميل طلب الإجازة…','Loading leave data…':'جارٍ تحميل بيانات الإجازات…','Loading leave, compliance, training and request summaries…':'جارٍ تحميل ملخصات الإجازات والالتزام والتدريب والطلبات…','Loading requests…':'جارٍ تحميل الطلبات…','Loading request…':'جارٍ تحميل الطلب…','Loading training assignments…':'جارٍ تحميل تكليفات التدريب…','Loading training data…':'جارٍ تحميل بيانات التدريب…','Loading training details…':'جارٍ تحميل تفاصيل التدريب…',
    'Could not load dashboard data. Check permissions and the server script.':'تعذر تحميل بيانات اللوحة. تحقق من الصلاحيات ومن سكربت الخادم.','From Date cannot be later than To Date.':'لا يمكن أن يكون تاريخ البداية بعد تاريخ النهاية.','Could not load HR requests.':'تعذر تحميل طلبات الموارد البشرية.','Could not load HR requests. You may not have permission.':'تعذر تحميل طلبات الموارد البشرية. قد لا تملك الصلاحية.','Could not load compliance data. You may not have permission.':'تعذر تحميل بيانات الالتزام. قد لا تملك الصلاحية.','Could not load leave applications.':'تعذر تحميل طلبات الإجازة.','Could not load leave data. You may not have permission.':'تعذر تحميل بيانات الإجازات. قد لا تملك الصلاحية.','Could not load the compliance directory.':'تعذر تحميل دليل الالتزام.','Could not load the employee directory. You may not have permission.':'تعذر تحميل دليل الموظفين. قد لا تملك الصلاحية.','Could not load training assignments.':'تعذر تحميل تكليفات التدريب.','Could not load training data. You may not have permission.':'تعذر تحميل بيانات التدريب. قد لا تملك الصلاحية.','Could not render this tab:':'تعذر عرض هذا القسم:','Not readable with your permissions (shown as Unavailable):':'غير مقروء بصلاحياتك (يظهر «غير متاح»):','Not readable with your permissions:':'غير مقروء بصلاحياتك:','Not readable:':'غير مقروء:','Export failed or not permitted.':'فشل التصدير أو غير مسموح.','Preparing export…':'جارٍ تجهيز التصدير…','Period start must be before the end.':'يجب أن تسبق بداية الفترة نهايتها.',
    /* overview KPIs (labels may also come from the server) */
    'Active employees in scope':'الموظفون النشطون ضمن النطاق','Active Employees':'الموظفون النشطون','Total Active Employees':'إجمالي الموظفين النشطين','Active employees':'الموظفون النشطون','Checked in today':'سجلوا الحضور اليوم','Checked-in today':'سجلوا الحضور اليوم','Checked-in Today':'سجلوا الحضور اليوم','Checked in':'سجلوا الحضور','Distinct employees with a punch today':'موظفون مختلفون لديهم بصمة اليوم','Absent today':'غائبون اليوم','Absent Today':'غائبون اليوم','Absences recorded in ERPNext today':'غيابات مسجلة في ERPNext اليوم','On approved leave today':'في إجازة معتمدة اليوم','On Approved Leave Today':'في إجازة معتمدة اليوم','On leave today':'في إجازة اليوم','On leave':'في إجازة','Late against their shift today':'متأخرون عن ورديتهم اليوم','Late check-ins today':'تأخر في الحضور اليوم','Late check-ins':'حالات التأخر','Late':'متأخر','Leave applications awaiting approval':'طلبات إجازة بانتظار الموافقة','Pending leave approvals':'موافقات إجازة معلقة','Pending Leave Approvals':'موافقات إجازة معلقة','Assignments completed':'تكليفات مكتملة','Training completion':'إتمام التدريب','Training Completion':'إتمام التدريب','Expired or due within 60 days':'منتهية أو تستحق خلال 60 يوماً','Expiring documents':'مستندات تنتهي قريباً','Expiring Documents':'مستندات تنتهي قريباً','Employees with Expiring Documents':'موظفون لديهم مستندات تنتهي قريباً','Employees with expiring documents':'موظفون لديهم مستندات تنتهي قريباً','New Joiners This Month':'المنضمون الجدد هذا الشهر','Non-Saudi Employees':'الموظفون غير السعوديين','Saudi Employees':'الموظفون السعوديون','Total Departments':'إجمالي الأقسام','Approved leave':'إجازة معتمدة','Approved leave & weekoffs excluded':'باستثناء الإجازات المعتمدة وأيام الراحة','Recorded absences':'الغيابات المسجلة','Mobile punches':'بصمات الجوال','Punches today':'بصمات اليوم','Departments':'الأقسام','Linked to a user':'مرتبطون بمستخدم',
    'Friday · weekoff':'الجمعة · راحة أسبوعية','Leave & weekoffs excluded · included above':'باستثناء الإجازات وأيام الراحة · مشمولة أعلاه',
    /* overview panels */
    'Attendance Overview':'نظرة عامة على الحضور','Attendance overview':'نظرة عامة على الحضور','Attendance data could not be read with your permissions.':'تعذرت قراءة بيانات الحضور بصلاحياتك.','Employees with a punch':'موظفون لديهم بصمة','Daily trend':'الاتجاه اليومي','Distinct employees with a punch per day':'موظفون مختلفون لديهم بصمة يومياً','No punch data for this filter.':'لا بيانات بصمات لهذه التصفية.',
    'Needs Attention':'تحتاج انتباهاً','Items that need an HR action':'بنود تحتاج إجراءً من الموارد البشرية','Submitted or in workflow, awaiting a decision':'مقدمة أو في مسار الموافقة بانتظار قرار','Expired documents':'مستندات منتهية','Iqama/ID, passport, contract, insurance':'الإقامة/الهوية، الجواز، العقد، التأمين','Training overdue':'تدريب متأخر','Assigned and past the due date':'مكلّف به وتجاوز تاريخ الاستحقاق','Open HR requests':'طلبات موارد بشرية مفتوحة','Across the request types you can read':'عبر أنواع الطلبات التي يمكنك قراءتها','Leave status mismatches':'عدم تطابق حالة الإجازة','Status and workflow state disagree':'الحالة ومرحلة الموافقة غير متطابقتين','High-severity data issues':'مشكلات بيانات عالية الخطورة','Total count across high-severity checks':'إجمالي فحوصات عالية الخطورة',
    'Leave & Approvals':'الإجازات والموافقات','Leave Application is not readable with your permissions.':'طلب الإجازة غير مقروء بصلاحياتك.','Pending approval':'بانتظار الموافقة','Starting in 30 days':'تبدأ خلال 30 يوماً','Drafts not submitted':'مسودات غير مقدمة','Leave days by type, year to date':'أيام الإجازة حسب النوع منذ بداية السنة','No approved leave days this year.':'لا أيام إجازة معتمدة هذه السنة.','days':'أيام',
    'Employee Lifecycle':'دورة حياة الموظف','New joiners':'منضمون جدد','This month':'هذا الشهر','Probation':'فترة التجربة','No reliable data':'لا بيانات موثوقة','In progress':'قيد التنفيذ','Active':'نشط','On roll':'على القوائم','Leavers':'المغادرون','Last 12 months':'آخر 12 شهراً','Probation data is not reliable.':'بيانات فترة التجربة غير موثوقة.',
    'Training & Development':'التدريب والتطوير','Training records are not readable with your permissions.':'سجلات التدريب غير مقروءة بصلاحياتك.','Completed':'مكتمل','Open, not yet due':'مفتوح، لم يحن موعده','Overdue':'متأخر','completion':'الإتمام','Assignments':'التكليفات','Employees not assigned':'موظفون بلا تكليف','Employee Training Progress':'تقدم تدريب الموظفين',
    'HR Analytics Snapshot':'لمحة تحليلات الموارد البشرية','Saudization (provisional)':'السعودة (مؤقتة)','Saudization cannot be calculated for this filter.':'لا يمكن حساب السعودة لهذه التصفية.','Gender':'الجنس','Largest departments (active headcount)':'أكبر الأقسام (عدد الموظفين النشطين)','Saudi':'سعودي',
    'Expired':'منتهية','Due in 30 days':'تستحق خلال 30 يوماً','Due in 31–60 days':'تستحق خلال 31–60 يوماً','Due ≤30d':'≤30 يوماً','Document':'المستند','≤30d':'≤30ي','31–60d':'31–60ي','Status':'الحالة','OK':'سليم','Counts only. Document numbers are never shown here.':'أعداد فقط. لا تُعرض أرقام المستندات هنا.',
    'HR Requests / Employee Relations':'طلبات الموارد البشرية / علاقات الموظفين','Open requests':'الطلبات المفتوحة','Oldest open (days)':'أقدم مفتوح (بالأيام)','Types readable':'أنواع مقروءة','Request type':'نوع الطلب','Request Type':'نوع الطلب','Oldest':'الأقدم','Clear\u200b':'خالٍ','Counts and ages only — no request contents':'أعداد وأعمار فقط — دون محتوى الطلبات',
    'HR Operations Summary':'ملخص عمليات الموارد البشرية','Top data-quality issues':'أهم مشكلات جودة البيانات','Issue':'المشكلة','No data-quality issues found.':'لم تُعثر مشكلات في جودة البيانات.','high':'عالية','medium':'متوسطة','low':'منخفضة','High':'عالية','Medium':'متوسطة','Low':'منخفضة','Severity':'الخطورة',
    'Attendance reliability:':'موثوقية الحضور:','Missing punches are therefore':'لذلك فإن البصمات المفقودة','not':'لا','counted as absences.':'تُحتسب غياباً.',
    /* employees */
    'Employee directory':'دليل الموظفين','Employee management':'إدارة الموظفين','Employee ID':'رقم الموظف','Employee Name':'اسم الموظف','Employee':'الموظف','Designation':'المسمى الوظيفي','Nationality':'الجنسية','Date of Joining':'تاريخ الانضمام','Date of joining':'تاريخ الانضمام','Employment type':'نوع التوظيف','Employment status':'حالة التوظيف','Line manager':'المدير المباشر','Reports to':'يرفع تقاريره إلى','Default shift':'الوردية الافتراضية','ERPNext user':'مستخدم ERPNext','Linked to ERPNext user':'مرتبط بمستخدم ERPNext','No ERPNext user':'بلا مستخدم ERPNext','No user':'بلا مستخدم','Employees without ERPNext user':'موظفون بلا مستخدم ERPNext','Employee ID or name…':'رقم الموظف أو الاسم…','Employee search':'بحث عن موظف','Employee details':'بيانات الموظف','Employee details are not available (not permitted or not found).':'بيانات الموظف غير متاحة (غير مسموح أو غير موجود).','Employee record not visible with your permissions.':'سجل الموظف غير ظاهر بصلاحياتك.','No employees match these filters.':'لا موظفين يطابقون هذه التصفية.','Open full employee detail panel':'فتح لوحة بيانات الموظف الكاملة','Open employee detail panel':'فتح لوحة بيانات الموظف','Copy / details':'نسخة / تفاصيل','Copy on file':'نسخة محفوظة','Inactive':'غير نشط','Suspended':'موقوف','Left':'غادر','Left / Inactive / Suspended':'غادر / غير نشط / موقوف','Disabled':'معطّل','Enabled':'مفعّل','Not active':'غير نشط','Joined':'انضم','Joined this month':'انضموا هذا الشهر','Joiners':'المنضمون','Joiners (12 months)':'المنضمون (12 شهراً)','Joiners · 12 months':'المنضمون · 12 شهراً','Leavers (12 months)':'المغادرون (12 شهراً)','Leavers · 12 months':'المغادرون · 12 شهراً','Workforce movement · 12 months':'حركة القوى العاملة · 12 شهراً','Branch-wise headcount':'عدد الموظفين حسب الفرع','Department-wise headcount':'عدد الموظفين حسب القسم','Department headcount':'عدد الموظفين بالقسم','Headcount as of':'عدد الموظفين حتى','Top designations':'أكثر المسميات الوظيفية','By employment type':'حسب نوع التوظيف','By job location':'حسب موقع العمل','Nationality distribution':'توزيع الجنسيات','Employment status distribution':'توزيع حالات التوظيف','Monthly joining trend (12 months)':'اتجاه الانضمام الشهري (12 شهراً)','Click a bar to open the filtered Employee list.':'اضغط على عمود لفتح قائمة الموظفين المصفاة.','Non-Saudi (incl. not set)':'غير سعودي (يشمل غير المحدد)','Saudi nationals':'المواطنون السعوديون','Saudi nationals: not required':'السعوديون: غير مطلوب','Saudi share':'نسبة السعوديين','Saudi workforce share':'نسبة السعوديين من القوى العاملة','Saudi employees':'الموظفون السعوديون','Non-Saudi employees':'الموظفون غير السعوديين','Saudization':'السعودة','Saudi employees / all active employees.':'الموظفون السعوديون ÷ كل الموظفين النشطين.','Turnover %':'معدل الدوران %','Separations':'حالات الانفصال','Left employees have no relieving date and are not counted.':'الموظفون المغادرون بلا تاريخ إخلاء طرف لا يُحتسبون.','Status Left and a recorded relieving date.':'الحالة «غادر» مع تاريخ إخلاء طرف مسجل.','Employees across statuses, by joining date.':'الموظفون بكل الحالات حسب تاريخ الانضمام.','Active Employee records under the selected company and filters.':'سجلات الموظفين النشطين ضمن الشركة والتصفية المحددة.','Employees with status Active in the selected filters, grouped by Employee.department. Source: Employee.':'الموظفون بحالة «نشط» ضمن التصفية، مجمّعون حسب القسم. المصدر: Employee.','Active employees by Employee.branch.':'الموظفون النشطون حسب الفرع.','Distinct departments with active employees':'أقسام مختلفة فيها موظفون نشطون','Active employees, by department. Most allocations in this system are created per leave request, so many employees have none between leaves.':'الموظفون النشطون حسب القسم. تُنشأ معظم المخصصات لكل طلب إجازة، لذا قد لا يملك كثير من الموظفين مخصصاً بين الإجازات.','Server-side search, filters, sorting and pages. Results respect your ERPNext permissions and Employee User Permissions. Click a row for the employee detail panel.':'بحث وتصفية وفرز وتقسيم صفحات من الخادم. النتائج تحترم صلاحيات ERPNext وصلاحيات المستخدم على الموظفين. اضغط على صف لعرض بيانات الموظف.',
    'A · Basic information':'أ · المعلومات الأساسية','A · Employee':'أ · الموظف','A · Leave request':'أ · طلب الإجازة','A · Request':'أ · الطلب','B · Attendance summary':'ب · ملخص الحضور','B · Documents':'ب · المستندات','B · Employee':'ب · الموظف','B · Summary':'ب · الملخص','C · Assigned training':'ج · التدريب المكلّف به','C · Leave information':'ج · معلومات الإجازة','C · Renewal requests':'ج · طلبات التجديد','C · Workflow & approval history':'ج · سجل المسار والموافقات','C · Workflow history':'ج · سجل المسار','D · Available action':'د · الإجراء المتاح','D · By status':'د · حسب الحالة','D · Documents & compliance':'د · المستندات والالتزام','D · Leave allocation & balance':'د · مخصص الإجازة والرصيد','D · Related ERPNext records':'د · سجلات ERPNext المرتبطة','E · Progress history':'هـ · سجل التقدم','E · Related HR documents':'هـ · مستندات الموارد البشرية المرتبطة','E · Related requests (same employee)':'هـ · طلبات مرتبطة (للموظف نفسه)','E · Training progress':'هـ · تقدم التدريب','F · Assessment results':'و · نتائج التقييم','F · HR requests':'و · طلبات الموارد البشرية',
    /* attendance */
    'Attendance analytics':'تحليلات الحضور','Attendance in this period':'الحضور في هذه الفترة','Attendance not readable with your permissions.':'الحضور غير مقروء بصلاحياتك.','Attendance records (30 days)':'سجلات الحضور (30 يوماً)','Attendance records (90 days)':'سجلات الحضور (90 يوماً)','Auto-attendance sync':'مزامنة الحضور التلقائي','Biometric punch activity — last 14 days':'نشاط البصمة — آخر 14 يوماً','Biometric and mobile punches, last':'بصمات الجهاز والجوال، آخر','Daily check-ins · 14 days':'تسجيلات الحضور اليومية · 14 يوماً','Check-in activity up to':'نشاط تسجيل الحضور حتى','Distinct employees with a punch per day':'موظفون مختلفون لديهم بصمة يومياً','Distinct employees with at least one punch on':'موظفون مختلفون لديهم بصمة واحدة على الأقل في','All biometric and mobile punches today.':'كل بصمات الجهاز والجوال اليوم.','All auto-attendance shifts synced recently.':'كل ورديات الحضور التلقائي تمت مزامنتها حديثاً.','Enabled shifts with no sync in the last 2 days.':'ورديات مفعّلة بلا مزامنة خلال آخر يومين.','Last check-in sync':'آخر مزامنة للحضور','Last attendance record':'آخر سجل حضور','Last failure':'آخر فشل','Last punch':'آخر بصمة','First punch':'أول بصمة','First punch after shift start plus entry grace.':'أول بصمة بعد بداية الوردية مضافاً إليها مهلة الدخول.','Shift':'الوردية','Shift type':'نوع الوردية','Shift Type not readable with your permissions.':'نوع الوردية غير مقروء بصلاحياتك.','Late (min)':'التأخير (دقيقة)','Late entries (30 days)':'حالات التأخر (30 يوماً)','Late against their shift today':'متأخرون عن ورديتهم اليوم','Inferred: no punch and no approved leave':'مستنتج: بلا بصمة وبلا إجازة معتمدة','Absent today · approved leave and weekoffs excluded':'غائبون اليوم · باستثناء الإجازات المعتمدة وأيام الراحة','Recorded absences · approved leave and weekoffs excluded':'غيابات مسجلة · باستثناء الإجازات المعتمدة وأيام الراحة','Submitted Attendance marked Absent, excluding approved leave and weekly days off. Already included in Absent today.':'سجلات حضور مقدمة بحالة غائب باستثناء الإجازات المعتمدة وأيام الراحة. محتسبة أصلاً ضمن «غائبون اليوم».','Submitted attendance today':'الحضور المقدم اليوم','No submitted Attendance records':'لا سجلات حضور مقدمة','No submitted Attendance records for this date.':'لا سجلات حضور مقدمة لهذا التاريخ.','No late check-ins.':'لا حالات تأخر.','Punches':'البصمات','Schedule':'الجدول','Runs (30 days)':'التشغيلات (30 يوماً)','Mon':'الإثنين','Tue':'الثلاثاء','Wed':'الأربعاء','Thu':'الخميس','Fri':'الجمعة','Sat':'السبت','Sun':'الأحد','Scope:':'النطاق:','Device/untagged':'جهاز/غير موسوم',
    /* leave */
    'Leave dashboard':'لوحة الإجازات','Leave analytics':'تحليلات الإجازات','Leave application':'طلب إجازة','Leave Application':'طلب إجازة','Leave applications':'طلبات الإجازة','Leave application directory':'دليل طلبات الإجازة','All leave applications':'كل طلبات الإجازة','Other leave applications':'طلبات إجازة أخرى','No other applications.':'لا طلبات أخرى.','No leave applications match these filters.':'لا طلبات إجازة تطابق هذه التصفية.','Leave summary not available with your permissions.':'ملخص الإجازات غير متاح بصلاحياتك.','Leave Applications not readable with your permissions.':'طلبات الإجازة غير مقروءة بصلاحياتك.','Leave Request Forms':'نماذج طلب الإجازة','Leave type':'نوع الإجازة','Leave Type':'نوع الإجازة','Leave types distribution':'توزيع أنواع الإجازة','Leave approver':'معتمد الإجازة','Leave balance':'رصيد الإجازة','Leave used ·':'الإجازة المستخدمة ·','Leave utilisation by department':'استخدام الإجازات حسب القسم','Leave & weekoffs excluded':'باستثناء الإجازات وأيام الراحة','Leave days by type':'أيام الإجازة حسب النوع','Leave data quality · HR review':'جودة بيانات الإجازات · مراجعة الموارد البشرية','Leave data quality · HR review queue':'جودة بيانات الإجازات · قائمة مراجعة الموارد البشرية','Monthly leave usage (12 months)':'استخدام الإجازات الشهري (12 شهراً)','Approved leave calendar':'تقويم الإجازات المعتمدة','Approved leave history':'سجل الإجازات المعتمدة','Approved leave starting in':'إجازات معتمدة تبدأ في','Approved leave starting in the next 30 days':'إجازات معتمدة تبدأ خلال 30 يوماً القادمة','Approved leave used':'الإجازة المعتمدة المستخدمة','Approved days in the selected period.':'الأيام المعتمدة في الفترة المحددة.','Approved applications by start month (days).':'الطلبات المعتمدة حسب شهر البداية (بالأيام).','Employees on approved leave per day.':'الموظفون في إجازة معتمدة يومياً.','Click a day to list them.':'اضغط على يوم لعرضهم.','Click a month to list them.':'اضغط على شهر لعرضه.','Approved':'معتمد','Approved =':'معتمد =','Pending':'معلق','Pending leave':'إجازات معلقة','Pending applications':'طلبات معلقة','Pending applications from the leave summary.':'طلبات معلقة من ملخص الإجازات.','Pending leave applications':'طلبات إجازة معلقة','Pending leave approvals':'موافقات إجازة معلقة','Pending My Approval':'بانتظار موافقتي','No pending applications.':'لا طلبات معلقة.','Rejected':'مرفوض','Cancelled':'ملغى','Draft':'مسودة','Draft leave applications':'طلبات إجازة مسودة','Submitted':'مقدم','Open':'مفتوح','Closed':'مغلق','Paid days':'الأيام المدفوعة','Paid leave days':'أيام الإجازة المدفوعة','Unpaid (LWP) days':'أيام بدون راتب (LWP)','Total leave days':'إجمالي أيام الإجازة','Allocated':'المخصص','Allocation':'المخصص','Allocation period':'فترة المخصص','No allocation':'بلا مخصص','Active employees without a current leave allocation':'موظفون نشطون بلا مخصص إجازة حالي','Employees without current allocation':'موظفون بلا مخصص حالي','No submitted Leave Allocation of any type covers today. Balances cannot be calculated for these employees.':'لا مخصص إجازة مقدم من أي نوع يغطي اليوم. لا يمكن حساب أرصدة هؤلاء الموظفين.','Balance (approved only)':'الرصيد (المعتمد فقط)','Balance (approved usage only)':'الرصيد (الاستخدام المعتمد فقط)','Deducted by pending applications (not subtracted)':'ما تحجزه الطلبات المعلقة (غير مخصوم)','Pending (not subtracted)':'معلق (غير مخصوم)','Ledger credits/adjustments':'أرصدة/تسويات دفتر الإجازات','Balance recorded on the application by ERPNext at entry:':'الرصيد المسجل على الطلب من ERPNext عند الإدخال:','Overlaps with:':'يتداخل مع:','Period from':'الفترة من','Period to':'الفترة إلى','Year to date':'منذ بداية السنة','Starting in 30 days':'تبدأ خلال 30 يوماً','This leave application is not available (not permitted or not found).':'طلب الإجازة هذا غير متاح (غير مسموح أو غير موجود).','Application':'الطلب','Application Status':'حالة الطلب','Application status':'حالة الطلب','Application, employee ID or name…':'الطلب أو رقم الموظف أو الاسم…','Applications in a Pending / On-Hold workflow state, by department on the application. Total pending:':'طلبات في مرحلة معلق / قيد الانتظار حسب القسم. إجمالي المعلق:','Approval Age':'عمر الموافقة','Approval age = days in the current pending state, or posting → final decision.':'عمر الموافقة = الأيام في الحالة المعلقة الحالية، أو من التسجيل إلى القرار النهائي.','Approver':'المعتمد','Assigned / Approver':'المكلّف / المعتمد','Assigned / approver':'المكلّف / المعتمد','Assigned to':'مسند إلى','Approved days':'الأيام المعتمدة','Days':'الأيام','Month':'الشهر','MMMM YYYY':'MMMM YYYY',
    /* compliance */
    'Compliance overview':'نظرة عامة على الالتزام','Compliance analytics':'تحليلات الالتزام','Compliance directory':'دليل الالتزام','Employee compliance':'التزام الموظف','Compliance status':'حالة الالتزام','Compliance Status':'حالة الالتزام','Compliance completion':'نسبة الالتزام','Compliance summary not available.':'ملخص الالتزام غير متاح.','Compliance summary unavailable':'ملخص الالتزام غير متاح','Compliance details are not available for this employee (not permitted or not found).':'تفاصيل الالتزام غير متاحة لهذا الموظف (غير مسموح أو غير موجود).','Compliance data quality · HR review queue':'جودة بيانات الالتزام · قائمة مراجعة الموارد البشرية','Document health':'سلامة المستندات','Document status distribution':'توزيع حالات المستندات','Document status as of':'حالة المستندات حتى','Document expiry summary':'ملخص انتهاء المستندات','Document categories':'فئات المستندات','Document type':'نوع المستند','Document counts:':'أعداد المستندات:','Documents':'المستندات','Documents current':'مستندات سارية','documents current & consistent':'مستندات سارية ومتسقة','Documents current & consistent':'مستندات سارية ومتسقة','Iqama / Saudi ID':'الإقامة / الهوية السعودية','Iqama/ID':'الإقامة/الهوية','Iqama / ID':'الإقامة / الهوية','Passport':'جواز السفر','Contract':'العقد','Employment Contract':'عقد العمل','Insurance':'التأمين','Medical Insurance':'التأمين الطبي','Contract end':'نهاية العقد','Expiry Date':'تاريخ الانتهاء','Expiry date':'تاريخ الانتهاء','Expiry from':'الانتهاء من','Expiry to':'الانتهاء إلى','Expiring ≤30 days':'تنتهي خلال ≤30 يوماً','Expiring 31–60 days':'تنتهي خلال 31–60 يوماً','Expiring 61–90 days':'تنتهي خلال 61–90 يوماً','Expiring in':'تنتهي خلال','Valid':'ساري','Valid ':'ساري','Not required':'غير مطلوب','Already expired':'منتهية بالفعل','Already expired as of':'منتهية بالفعل حتى','Expired or due within 60 days':'منتهية أو تستحق خلال 60 يوماً','Expired / expiring ≤90 days by branch':'منتهية / تنتهي خلال ≤90 يوماً حسب الفرع','Expired / expiring ≤90 days by department':'منتهية / تنتهي خلال ≤90 يوماً حسب القسم','Expiry forecast by month':'توقع الانتهاء حسب الشهر','Expiry alerts':'تنبيهات الانتهاء','Days Before':'الأيام قبل','Days Remaining':'الأيام المتبقية','Days left':'الأيام المتبقية','Due':'مستحق','Due date':'تاريخ الاستحقاق','No due date':'لا تاريخ استحقاق','Missing date':'تاريخ مفقود','Missing expiry date':'تاريخ انتهاء مفقود','Verified expiry (primary)':'الانتهاء المؤكد (الأساسي)','Secondary field':'الحقل الثانوي','Employees with compliance issues':'موظفون لديهم مشكلات التزام','Employees by number of documents with issues':'الموظفون حسب عدد المستندات التي بها مشكلات','Employees with 2+ documents affected':'موظفون تأثرت لديهم مستندان أو أكثر','Employees affected':'موظفون متأثرون','Current & consistent':'ساري ومتسق','All required documents':'كل المستندات المطلوبة','All tracked documents, including Saudi passports marked not required.':'كل المستندات المتتبَّعة بما فيها جوازات السعوديين المعلّمة «غير مطلوب».','Required documents that are current and consistent.':'المستندات المطلوبة السارية والمتسقة.','Required documents with a current, non-conflicting expiry date.':'المستندات المطلوبة ذات تاريخ انتهاء ساري وغير متعارض.','Required documents expiring per month (next 12 months).':'المستندات المطلوبة التي تنتهي شهرياً (12 شهراً قادمة).','Required documents (Iqama/ID, non-Saudi passport, contract, insurance) by primary expiry month, next 12 months. Partial because of missing dates.':'المستندات المطلوبة (الإقامة/الهوية، جواز غير السعودي، العقد، التأمين) حسب شهر الانتهاء الأساسي خلال 12 شهراً. جزئي بسبب تواريخ ناقصة.','Iqama/ID, passport, contract or insurance expired or due within 60 days. Missing dates are not counted.':'إقامة/هوية أو جواز أو عقد أو تأمين منتهٍ أو يستحق خلال 60 يوماً. التواريخ الناقصة لا تُحتسب.','Iqama/ID, passport, contract, insurance':'الإقامة/الهوية، الجواز، العقد، التأمين','Threshold preview (documents per alert window)':'معاينة الحد (المستندات لكل نافذة تنبيه)','Health insurance provider record':'سجل مزوّد التأمين الصحي','Provider:':'المزوّد:','Qiwa renewal request':'طلب تجديد قوى','No Qiwa contract renewal request for this employee.':'لا طلب تجديد عقد عبر قوى لهذا الموظف.','Qiwa contract renewal requests not readable with your permissions.':'طلبات تجديد عقود قوى غير مقروءة بصلاحياتك.','Re-entry date (exit/entry)':'تاريخ العودة (خروج/دخول)','Probation':'فترة التجربة','Counts only. Document numbers are never shown here.':'أعداد فقط. لا تُعرض أرقام المستندات هنا.','Displayed only. No Employee field is overwritten by the dashboard. Duplicate checks compare ID numbers on the server; the numbers themselves are never sent to the browser.':'للعرض فقط. لا تُعدَّل أي حقول للموظف من اللوحة. يقارن الخادم أرقام الهوية لكشف التكرار ولا تُرسل الأرقام نفسها إلى المتصفح.','Only expiry dates and status are shown. ID, Iqama and passport numbers, bank, salary and medical details are never returned by this panel.':'تُعرض تواريخ الانتهاء والحالة فقط. لا تُعاد أرقام الهوية والإقامة والجواز ولا تفاصيل البنك والراتب والتفاصيل الطبية.','One row per employee document. Saudi passports (not required) are excluded. Results respect your ERPNext and Employee User Permissions. Renewals are done in ERPNext; the dashboard never edits Employee records.':'صف لكل مستند موظف. تُستثنى جوازات السعوديين (غير مطلوبة). النتائج تحترم صلاحياتك. التجديد يتم في ERPNext ولا تعدّل اللوحة سجلات الموظفين.','See Documents & Compliance for rules and details.':'راجع «المستندات والالتزام» للقواعد والتفاصيل.','No documents match these filters.':'لا مستندات تطابق هذه التصفية.','Not included:':'غير مشمول:','No employee linked, or not visible with your permissions.':'لا موظف مرتبط أو غير ظاهر بصلاحياتك.',
    /* requests */
    'HR service desk':'مكتب خدمة الموارد البشرية','HR requests':'طلبات الموارد البشرية','HR request':'طلب موارد بشرية','HR request analytics':'تحليلات طلبات الموارد البشرية','HR request summary not available.':'ملخص طلبات الموارد البشرية غير متاح.','HR request data quality':'جودة بيانات طلبات الموارد البشرية','All HR requests':'كل طلبات الموارد البشرية','Unified request directory':'دليل الطلبات الموحد','Request':'الطلب','Request ID':'رقم الطلب','Request ID, employee or type…':'رقم الطلب أو الموظف أو النوع…','Requests by branch':'الطلبات حسب الفرع','Requests by department':'الطلبات حسب القسم','Requests by type':'الطلبات حسب النوع','Requests by priority':'الطلبات حسب الأولوية','Monthly request trend':'اتجاه الطلبات الشهري','Open requests by age':'الطلبات المفتوحة حسب العمر','Pending approvals by age':'الموافقات المعلقة حسب العمر','Oldest unresolved requests':'أقدم الطلبات غير المحسومة','Overdue Requests':'الطلبات المتأخرة','Average resolution time by type':'متوسط زمن الحل حسب النوع','average resolution':'متوسط الحل','Action queues':'قوائم الإجراءات','Pending HR Review':'بانتظار مراجعة الموارد البشرية','Awaiting Employee Information':'بانتظار معلومات من الموظف','On-Hold / clarification states':'حالات الانتظار / التوضيح','On hold':'معلق','On Hold':'معلق','In Progress':'قيد التنفيذ','Not Started':'لم يبدأ','Not started':'لم يبدأ','Recently Completed':'اكتملت مؤخراً','Closed (recorded date)':'مغلق (بتاريخ مسجل)','Closure date':'تاريخ الإغلاق','Created':'تاريخ الإنشاء','Created by':'أنشأه','Created from':'أُنشئ من','Created to':'أُنشئ إلى','Created in':'أُنشئ في','Recipients':'المستلمون','Type':'النوع','DocType':'نوع المستند','Source state':'حالة المصدر','Priority':'الأولوية','Priority set on the request.':'الأولوية المحددة في الطلب.','Priority set to High':'الأولوية مضبوطة على عالية','Workflow':'مسار الموافقة','Workflow State':'مرحلة الموافقة','Workflow state':'مرحلة الموافقة','Moved to':'انتقل إلى','Moved to state':'انتقل إلى حالة','In current state since':'في الحالة الحالية منذ','Age / Overdue':'العمر / التأخر','Days in the current state (or since creation).':'الأيام في الحالة الحالية (أو منذ الإنشاء).','Days in the current workflow state.':'الأيام في مرحلة الموافقة الحالية.','days in this state':'يوماً في هذه الحالة','No HR requests match these filters.':'لا طلبات موارد بشرية تطابق هذه التصفية.','No HR requests linked to this employee.':'لا طلبات موارد بشرية مرتبطة بهذا الموظف.','No open requests.':'لا طلبات مفتوحة.','No other requests.':'لا طلبات أخرى.','No history recorded.':'لا سجل مسجل.','No workflow history recorded for this application.':'لا سجل مسار مسجل لهذا الطلب.','No workflow history recorded for this request.':'لا سجل مسار مسجل لهذا الطلب.','No workflow action is available to your roles in this state.':'لا إجراء متاح لأدوارك في هذه الحالة.','Actions the workflow lists for your roles in this state:':'الإجراءات التي يتيحها المسار لأدوارك في هذه الحالة:','The workflow lists these actions for your roles:':'يتيح المسار هذه الإجراءات لأدوارك:','Use them in the original form; the dashboard never applies them.':'استخدمها في النموذج الأصلي؛ لا تنفذها اللوحة أبداً.','"Act ↗" opens the ERPNext form, where the existing workflow decides if your role may approve, reject or hold. The dashboard never changes applications. Approval age = days in the current pending state, or posting → final decision.':'«تنفيذ ↗» يفتح نموذج ERPNext حيث يقرر المسار القائم إن كان دورك يسمح بالموافقة أو الرفض أو التعليق. لا تغيّر اللوحة الطلبات أبداً. عمر الموافقة = الأيام في الحالة المعلقة الحالية أو من التسجيل إلى القرار النهائي.','Employee Clearance':'إخلاء الطرف','Resignation Letter':'خطاب استقالة','Attendance Request':'طلب حضور','IT Help Desk Request':'طلب دعم تقني','DM Letter Forms':'نماذج خطابات DM','Leave Request Form':'نموذج طلب إجازة','Salary slip':'قسيمة الراتب','Employee Lifecycle':'دورة حياة الموظف','This request is not available (not permitted or not found).':'هذا الطلب غير متاح (غير مسموح أو غير موجود).','Displayed only. No request is changed by the dashboard.':'للعرض فقط. لا تغيّر اللوحة أي طلب.','Counts and ages only — no request contents':'أعداد وأعمار فقط — دون محتوى الطلبات','Readable request DocTypes only':'أنواع الطلبات المقروءة فقط','Normalised across DocTypes (rules below).':'موحّدة عبر أنواع المستندات (القواعد أدناه).','How each DocType\'s status is normalised':'كيف توحَّد حالة كل نوع مستند','Sources & status rules':'المصادر وقواعد الحالة','Source DocTypes':'أنواع المستندات المصدر','One row per source record. Results respect your ERPNext DocType and User Permissions for every source.':'صف لكل سجل مصدر. النتائج تحترم صلاحيات ERPNext لكل مصدر.','Across the request types you can read':'عبر أنواع الطلبات التي يمكنك قراءتها','Leave Applications (Leave tab) and IT Help Desk tickets are not included. Overdue uses a provisional':'لا تشمل طلبات الإجازة (قسم الإجازات) وتذاكر الدعم التقني. يعتمد التأخر على مهلة مؤقتة','Priority is not recorded on any source DocType.':'الأولوية غير مسجلة في أي نوع مستند مصدر.','Stopped':'متوقف','Unclear':'غير واضح','Rejected ':'مرفوض',
    /* training */
    'Training overview':'نظرة عامة على التدريب','Training analytics':'تحليلات التدريب','Training & compliance analytics':'تحليلات التدريب والالتزام','Training directory':'دليل التدريب','Training catalogue':'كتالوج التدريب','Training videos':'فيديوهات التدريب','Training summary not available.':'ملخص التدريب غير متاح.','Training progress not readable with your permissions.':'تقدم التدريب غير مقروء بصلاحياتك.','Training API response is missing analytics or kpis. Check admin_hr_training_data.':'استجابة واجهة التدريب تفتقد التحليلات أو المؤشرات. تحقق من admin_hr_training_data.','Training data is unavailable. Check the admin_hr_training_data API.':'بيانات التدريب غير متاحة. تحقق من واجهة admin_hr_training_data.','Training data quality · HR review':'جودة بيانات التدريب · مراجعة الموارد البشرية','Training details are not available for this employee (not permitted or not found).':'تفاصيل التدريب غير متاحة لهذا الموظف (غير مسموح أو غير موجود).','Employee training':'تدريب الموظف','Employee Training Progress':'تقدم تدريب الموظفين','All training':'كل التدريب','All training assignments':'كل تكليفات التدريب','Mandatory':'إلزامي','Optional':'اختياري','Mandatory training':'التدريب الإلزامي','Mandatory training compliance':'الالتزام بالتدريب الإلزامي','Mandatory completion':'إتمام الإلزامي','Mandatory still open':'إلزامي لا يزال مفتوحاً','Mandatory assignment rule check':'فحص قاعدة التكليف الإلزامي','Incomplete mandatory training':'تدريب إلزامي غير مكتمل','Learning compliance':'الالتزام بالتعلم','Completion by department':'الإتمام حسب القسم','Completion by designation':'الإتمام حسب المسمى الوظيفي','Completion date':'تاريخ الإتمام','Completion':'الإتمام','Assigned date':'تاريخ التكليف','Assigned':'مكلّف','Assigned, not eligible':'مكلّف وغير مؤهل','Eligible':'مؤهل','Eligible, not assigned':'مؤهل وغير مكلّف','Eligible but not yet assigned:':'مؤهلون ولم يُكلَّفوا بعد:','Not assigned':'غير مكلّف','Employees not assigned':'موظفون غير مكلّفين','Assignments completed':'تكليفات مكتملة','Assignments reminded at least once':'تكليفات ذُكّرت مرة على الأقل','Open optional assignments (no reminders by design)':'تكليفات اختيارية مفتوحة (بلا تذكير بحكم التصميم)','Overdue training by department':'التدريب المتأخر حسب القسم','Most assigned videos and courses':'أكثر الفيديوهات والدورات تكليفاً','Monthly assignments and completions':'التكليفات والإتمامات الشهرية','By assigned date and completion date (12 months). Training records start in October 2026.':'حسب تاريخ التكليف والإتمام (12 شهراً). تبدأ سجلات التدريب في أكتوبر 2026.','Days to complete':'أيام الإتمام','Training Video / Course':'فيديو / دورة تدريبية','Video / course':'فيديو / دورة','Video':'فيديو','Course':'دورة','Kind':'النوع','Timing':'التوقيت','Started':'بدأ','Reminders':'التذكيرات','Reminder activity':'نشاط التذكيرات','Reminder emails recorded':'رسائل تذكير مسجلة','Reminder jobs':'مهام التذكير','Training reminders':'تذكيرات التدريب','Last reminder':'آخر تذكير','Last run':'آخر تشغيل','Escalated to managers':'صُعّدت إلى المدراء','Existing notifications (Employee)':'إشعارات موجودة (الموظف)','Notification':'الإشعار','Read-only view of ERPNext Notification settings. Nothing is enabled or changed from the dashboard.':'عرض للقراءة فقط لإعدادات إشعارات ERPNext. لا يُفعَّل أو يُغيَّر شيء من اللوحة.','Read-only. No reminder is created, changed or enabled from the dashboard.':'للقراءة فقط. لا يُنشأ أو يُغيَّر أو يُفعَّل أي تذكير من اللوحة.','Recomputes the daily job\'s rule (Active employee, has a user, holds an allowed role) and compares it with the actual assignments.':'يعيد حساب قاعدة المهمة اليومية (موظف نشط، لديه مستخدم، يحمل دوراً مسموحاً) ويقارنها بالتكليفات الفعلية.','Built from the assignment dates and reminder fields. Videos do not record a percentage watched.':'مبني من تواريخ التكليف وحقول التذكير. لا تسجل الفيديوهات نسبة المشاهدة.','Counts are labelled videos, courses, employees or assignments. One assignment = one employee × one video or course.':'الأعداد معنونة بفيديوهات أو دورات أو موظفين أو تكليفات. التكليف الواحد = موظف واحد × فيديو أو دورة.','Completed ÷ assignments.':'المكتمل ÷ التكليفات.','Completed ÷ video/course assignments, by the employee\'s department.':'المكتمل ÷ تكليفات الفيديو/الدورات حسب قسم الموظف.','Completed mandatory assignments divided by mandatory assignments.':'التكليفات الإلزامية المكتملة مقسومة على التكليفات الإلزامية.','Displayed only. Assignments and completions are never changed by the dashboard.':'للعرض فقط. لا تغيّر اللوحة التكليفات ولا الإتمامات.','One row per assignment. Results respect your ERPNext and Employee User Permissions. Due dates and assignments are managed in the Training Center; the dashboard never changes them.':'صف لكل تكليف. النتائج تحترم صلاحياتك. تُدار تواريخ الاستحقاق والتكليفات في مركز التدريب ولا تغيّرها اللوحة.','No Training Course has been created, so course metrics are 0 (not missing).':'لم تُنشأ أي دورة تدريبية، لذا مقاييس الدورات 0 (وليست ناقصة).','No active mandatory video.':'لا فيديو إلزامي نشط.','No training assigned.':'لا تدريب مكلّف به.','No training assignments match these filters.':'لا تكليفات تدريب تطابق هذه التصفية.','Videos record status only':'الفيديوهات تسجل الحالة فقط','No (cannot open My Training)':'لا (لا يستطيع فتح تدريبي)','Employee ID, name or training…':'رقم الموظف أو الاسم أو التدريب…','Overdue ·':'متأخر ·','Overdue / due soon':'متأخر / يستحق قريباً','Incomplete ·':'غير مكتمل ·','Progress':'التقدم','Progress history':'سجل التقدم','On track':'في المسار','Nothing overdue.':'لا شيء متأخر.',
    /* analytics */
    'Workforce analytics':'تحليلات القوى العاملة','Employee analytics':'تحليلات الموظفين','PEOPLE INTELLIGENCE':'ذكاء الموارد البشرية','Workforce, development and operational health in one view.':'القوى العاملة والتطوير والصحة التشغيلية في عرض واحد.','At a glance':'لمحة سريعة','HR data quality — top issues':'جودة بيانات الموارد البشرية — أهم المشكلات','HR data-quality summary':'ملخص جودة بيانات الموارد البشرية','Data quality ·':'جودة البيانات ·','Data generated: main':'تاريخ توليد البيانات: الرئيسي','Generated':'تاريخ التوليد','No issues found.':'لم تُعثر مشكلات.','Issues are displayed only. No historical record is changed by the dashboard; fix records in ERPNext after HR review.':'المشكلات للعرض فقط. لا تغيّر اللوحة أي سجل تاريخي؛ صحّح السجلات في ERPNext بعد مراجعة الموارد البشرية.','Employees with Expiring Documents':'موظفون لديهم مستندات تنتهي قريباً','Probation':'فترة التجربة','Not available':'غير متاح','Not applicable':'لا ينطبق','Open each tab for the matching review list':'افتح كل قسم لعرض قائمة المراجعة المقابلة','Full list: HR Analytics tab.':'القائمة الكاملة: قسم تحليلات الموارد البشرية.','Nothing ordered':'لا شيء','of':'من','employees':'موظف','applications':'طلب','documents':'مستند','records':'سجل','requests':'طلب','and':'و',
    '. Change company, department, branch or job location in the filter bar above.':'. غيّر الشركة أو القسم أو الفرع أو موقع العمل من شريط التصفية أعلاه.','Absent':'غائب','Present':'حاضر','Analytics':'التحليلات','Name':'الاسم','Source':'المصدر','Scope':'النطاق','Male':'ذكر','Female':'أنثى','Full-time':'دوام كامل','(Not set)':'(غير محدد)','Weekoffs excluded':'باستثناء أيام الراحة','Employee-level data required':'مطلوب بيانات على مستوى الموظف','Key performance indicators; scroll horizontally for more':'مؤشرات الأداء الرئيسية؛ مرّر أفقياً للمزيد','Analytics; scroll horizontally for more':'التحليلات؛ مرّر أفقياً للمزيد','Switch to English':'التبديل إلى English',
    'Joiners per month, last 12 months':'المنضمون شهرياً، آخر 12 شهراً','Active and former employees by date_of_joining.':'الموظفون الحاليون والسابقون حسب تاريخ الانضمام.','All time':'كل الفترات','same company and filters':'الشركة والتصفية نفسهما','Distinct employees with punches. Friday is a weekoff for all; Saturday is also a weekoff for Saudi nationals.':'موظفون مختلفون لديهم بصمات. الجمعة راحة للجميع؛ والسبت راحة أيضاً للسعوديين.','Raw submitted records; the absence KPIs apply the weekoff policy.':'سجلات مقدمة خام؛ مؤشرات الغياب تطبّق سياسة أيام الراحة.','Check-in activity up to':'نشاط تسجيل الحضور حتى','(period shown on each panel)':'(الفترة مبيّنة في كل لوحة)','All requests by creation date; age and overdue as of today':'كل الطلبات حسب تاريخ الإنشاء؛ العمر والتأخر حتى اليوم','All assignments; overdue / due soon as of today; directory date range on assignment, due or completion date':'كل التكليفات؛ المتأخر/القريب حتى اليوم؛ نطاق تاريخ الدليل على تاريخ التكليف أو الاستحقاق أو الإتمام',
    'Approved leave always takes precedence over both missing punches and recorded Absent attendance. No punch without approved leave is treated as inferred absence. Fridays are excluded for everyone; Saturdays are also excluded for Saudi nationals. Counts can change as punches or leave approvals arrive.':'الإجازة المعتمدة لها الأولوية دائماً على البصمات المفقودة وعلى حضور «غائب» المسجل. عدم وجود بصمة بلا إجازة معتمدة يُعدّ غياباً مستنتجاً. تُستثنى أيام الجمعة للجميع، وأيام السبت أيضاً للسعوديين. قد تتغير الأعداد مع وصول البصمات أو موافقات الإجازات.',
    'Complete employee-level absence and approved-leave rows (and Saturday nationality data) are required; an unavailable count is never shown as zero.':'يلزم توفر صفوف الغياب والإجازات المعتمدة على مستوى الموظف كاملة (وبيانات الجنسية ليوم السبت)؛ ولا يُعرض العدد غير المتاح كصفر أبداً.'
  };
  var MISSING = {};
  var ARL = {}; Object.keys(AR).forEach(function (k) { ARL[k.toLowerCase()] = AR[k]; });
  // numbered phrases: '#' stands for any number
  var AR2 = {
    '# mobile':'# جوال','# device/untagged':'# جهاز/غير موسوم','# without nationality':'# بلا جنسية','# inferred':'# مستنتج','# recorded':'# مسجل','# without user_id':'# بلا مستخدم',
    '# yrs service':'# سنة خدمة','# days in this state':'# يوماً في هذه الحالة','# record(s)':'# سجل','# days':'# يوماً','# day':'# يوم','# d':'# ي','of # evaluated':'من # تم تقييمهم','of # punches':'من # بصمة','#% of active':'#% من النشطين','# Saudi of # active':'# سعودي من # نشط',
    'Due in ≤# days':'يستحق خلال ≤# أيام','Pending # days':'معلق # يوماً','Open # days':'مفتوح # يوماً','Pending #':'معلق #','Open #':'مفتوح #','14-day average #':'متوسط 14 يوماً #','# of # required documents':'# من # مستند مطلوب','Showing first # of #.':'عرض أول # من #.',
    '#% billed':'#% مفوتر','# total':'# إجمالي','# of #':'# من #','#-#':'#-#','Top # by':'أعلى # حسب','Last # days':'آخر # يوماً','Next # days':'الـ # أيام القادمة'
  };
  var FRAG = [['as of','حتى'],['updated','آخر تحديث'],['Showing first','عرض أول'],['Showing','عرض'],['with a copy attached','لها نسخة مرفقة'],['required records have a current, non-conflicting date','مستند مطلوب بتاريخ ساري وغير متعارض'],['Saudi nationals: not required','سعوديون: غير مطلوب'],['required documents have no expiry date.','مستندات مطلوبة بلا تاريخ انتهاء.'],['employees have incomplete mandatory training.','موظفون لديهم تدريب إلزامي غير مكتمل.'],['employees have no nationality recorded.','موظفون بلا جنسية مسجلة.'],['employees','موظف'],['applications','طلب'],['documents','مستند'],['records','سجل'],['requests','طلب'],['days','يوماً'],['active','نشط'],['evaluated','تم تقييمهم'],['of','من'],['and','و'],['total','الإجمالي'],['latest','الأحدث'],['provisional','مؤقت'],['before','قبل'],['after','بعد'],['required','مطلوب'],['Pending','معلق'],['Open','مفتوح'],['closed','مغلق'],['punches','بصمات']];
  var FRAGRE = FRAG.map(function (p) { return [new RegExp('(^|[^A-Za-z])' + p[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])', 'g'), p[1]]; });
  var AR_RULES = [
    [/^Sort by (.+)$/, function (m, a) { return 'ترتيب حسب ' + tr(a); }],
    [/^(.+?) ([▲▼])$/, function (m, a, ar) { return tr(a) + ' ' + ar; }],
    [/^(.+) \((\d+)\)$/, function (m, a, n) { return tr(a) + ' (' + n + ')'; }],
    [/^Leave application (.+)$/, function (m, a) { return 'طلب إجازة ' + a; }],
    [/^Exported (\d+) rows( \(first 2,000\))?$/, function (m, n, f) { return 'تم تصدير ' + n + ' صفاً' + (f ? ' (أول 2,000)' : ''); }],
    [/^Department: (.+)$/, function (m, a) { return 'القسم: ' + a; }],
    [/^Branch: (.+)$/, function (m, a) { return 'الفرع: ' + a; }],
    [/^Job location: (.+)$/, function (m, a) { return 'موقع العمل: ' + a; }],
    [/^Designation: (.+)$/, function (m, a) { return 'المسمى الوظيفي: ' + a; }],
    [/^(.+) — expired or due ≤60 days$/, function (m, a) { return tr(a) + ' — منتهية أو تستحق خلال ≤60 يوماً'; }],
    [/^(.+) — open$/, function (m, a) { return a + ' — مفتوحة'; }],
    [/^(\d+) request types? (?:is|are) not readable with your permissions and not counted\.$/, function (m, n) { return n + ' من أنواع الطلبات غير مقروء بصلاحياتك وغير محتسب.'; }],
    [/^(\d+)% of (\d+) required records have a current, non-conflicting date · (\d+) with a copy attached(?: · (\d+) Saudi nationals: not required)?$/, function (m, p, r, a, s) { return p + '% من ' + r + ' سجلاً مطلوباً بتاريخ ساري وغير متعارض · ' + a + ' لها نسخة مرفقة' + (s ? ' · ' + s + ' سعوديون: غير مطلوب' : ''); }],
    [/^Active employees only · as of (.*)$/, function (m, d) { return 'الموظفون النشطون فقط · حتى ' + d; }],
    [/^Headcount as of (.*)$/, function (m, d) { return 'عدد الموظفين حتى ' + d; }],
    [/^Document status as of (.*)$/, function (m, d) { return 'حالة المستندات حتى ' + d; }],
    [/^(.+) · as of (.+) · updated (.+)$/, function (m, c, d, t) { return c + ' · حتى ' + d + ' · آخر تحديث ' + t; }],
    [/^Biometric and mobile punches, last (\d+) days$/, function (m, n) { return 'بصمات الجهاز والجوال، آخر ' + n + ' يوماً'; }],
    [/^(\d+)-day average (\d+)$/, function (m, a, b) { return 'متوسط ' + a + ' يوماً ' + b; }],
    [/^of (\d+) evaluated$/, function (m, n) { return 'من ' + n + ' تم تقييمهم'; }],
    [/^of (\d+) punches$/, function (m, n) { return 'من ' + n + ' بصمة'; }],
    [/^(\d+(?:\.\d+)?)% of active$/, function (m, n) { return n + '% من النشطين'; }],
    [/^(.+) Saudi of (.+) active$/, function (m, a, b) { return a + ' سعودي من ' + b + ' نشط'; }],
    [/^(\d+) days (before|after)$/, function (m, n, w) { return n + ' يوماً ' + (w === 'before' ? 'قبل' : 'بعد'); }],
    [/^(\d+) yrs service$/, function (m, n) { return n + ' سنة خدمة'; }],
    [/^(\d+) days in this state$/, function (m, n) { return n + ' يوماً في هذه الحالة'; }],
    [/^Due in ≤(\d+) days$/, function (m, n) { return 'يستحق خلال ≤' + n + ' أيام'; }],
    [/^(Pending|Open) (.+) days$/, function (m, w, a) { return (w === 'Pending' ? 'معلق ' : 'مفتوح ') + a + ' يوماً'; }],
    [/^Unavailable \((\d+) closed, no closure date\)$/, function (m, n) { return 'غير متاح (' + n + ' مغلق بلا تاريخ إغلاق)'; }],
    [/^open > (\d+) days$/, function (m, n) { return 'مفتوح أكثر من ' + n + ' يوماً'; }],
    [/^overdue \(> (\d+) days, provisional\)$/, function (m, n) { return 'متأخر (أكثر من ' + n + ' يوماً، مؤقت)'; }],
    [/^(.+) of (.+) required documents$/, function (m, a, b) { return a + ' من ' + b + ' مستند مطلوب'; }],
    [/^(.+) of (.+) employees$/, function (m, a, b) { return a + ' من ' + b + ' موظف'; }]
  ];
  var hasAr = function (s) { return /[؀-ۿ]/.test(s); };
  function trLookup(s) {
    var key = s.replace(/\d[\d,]*(?:\.\d+)?/g, '#'), nums = s.match(/\d[\d,]*(?:\.\d+)?/g) || [];
    var hit = AR[s]; if (hit === undefined) hit = AR[key]; if (hit === undefined) hit = AR2[key];
    if (hit === undefined) hit = ARL[s.toLowerCase()]; if (hit === undefined) hit = ARL[key.toLowerCase()];
    if (hit === undefined) return null;
    if (hit.indexOf('#') < 0 || key === s) return hit;
    var i = 0; return hit.replace(/#/g, function () { return nums[i++] !== undefined ? nums[i - 1] : '#'; });
  }
  function tr(raw) {
    if (raw === null || raw === undefined) return raw;
    raw = String(raw);
    if (!raw || hasAr(raw)) return raw;
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0], s = raw.trim();
    if (!s || !/[A-Za-z]{2}/.test(s)) return raw;
    var out = trLookup(s);
    if (out === null) for (var i = 0; i < AR_RULES.length; i++) { var m = s.match(AR_RULES[i][0]); if (m) { out = AR_RULES[i][1].apply(null, m); break; } }
    if (out === null) {
      var seps = [' · ', ': ', ', ', '; '];
      for (var si = 0; si < seps.length; si++) {
        if (s.indexOf(seps[si]) > 0) { out = s.split(seps[si]).map(tr).join({ ', ': '، ', '; ': '؛ ' }[seps[si]] || seps[si]); break; }
      }
    }
    if (out === null && /\d/.test(s)) { out = s; FRAGRE.forEach(function (f) { out = out.replace(f[0], function (m0, pre) { return pre + f[1]; }); }); if (out === s) out = null; }
    if (out === null) { out = s; if (/[A-Za-z]{3}/.test(s)) MISSING[s] = 1; }
    return lead + out + trail;
  }
  function trTree(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('option:not([value])').forEach(function (o) { o.setAttribute('value', o.textContent); });
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = w.nextNode())) { var pn = n.parentNode && n.parentNode.nodeName; if (pn !== 'STYLE' && pn !== 'SCRIPT' && /[A-Za-z]{2}/.test(n.nodeValue)) nodes.push(n); }
    nodes.forEach(function (t) { var v = tr(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; });
    root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(function (e) { ['placeholder', 'aria-label', 'title'].forEach(function (k) { var v = e.getAttribute(k); if (v && /[A-Za-z]{2}/.test(v)) { var t = tr(v); if (t !== v) e.setAttribute(k, t); } }); });
  }
  function T(s) { return S.lang === 'ar' ? tr(s) : s; }
  window.ahdMissing = function () { return Object.keys(MISSING).sort(); };
  var trPend = null;
  function applyLang() {
    var ar = S.lang === 'ar';
    host.classList.toggle('ahd-rtl', ar); host.setAttribute('dir', ar ? 'rtl' : 'ltr'); host.setAttribute('lang', ar ? 'ar' : 'en');
    if (ar) trTree(host);
  }
  var langObserver = new MutationObserver(function () {
    if (S.lang !== 'ar' || trPend) return;
    trPend = setTimeout(function () { trPend = null; trTree(host); }, 0);
  });
  langObserver.observe(host, { childList: true, subtree: true });
  function AHDDialog(o) {
    var o2 = Object.assign({}, o);
    if (S.lang === 'ar') o2.title = tr(o.title);
    var d = new frappe.ui.Dialog(o2);
    if (S.lang === 'ar') {
      var el = d.$wrapper && d.$wrapper[0];
      if (el) {
        el.setAttribute('dir', 'rtl'); var pend = null;
        new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = null; trTree(el); }, 0); }).observe(el, { childList: true, subtree: true });
      }
      var sp = d.set_primary_action; d.set_primary_action = function (l, f) { return sp.call(d, tr(l), f); };
    }
    return d;
  }

  function esc(v) { return (v === null || v === undefined) ? '' : String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---- Job location names (display only). The filter VALUE stays the stored code, so every total and drill-down is unchanged. ---- */
  var LOC = { map: {}, ready: false, started: false };
  function locName(code) { return (code !== null && code !== undefined && LOC.map[code]) || code; }
  function locList(list) { return (list || []).map(function (x) { var y = Object.assign({}, x); y.code = x.label; y.label = locName(x.label); return y; }); }
  function locPairs(list) { return (list || []).map(function (x) { return [x, locName(x)]; }); }
  function locBuild(rows, titleField) {
    var m = {}, seen = {};
    (rows || []).forEach(function (r) { var n = titleField && r[titleField] ? String(r[titleField]).trim() : ''; if (n && n !== r.name) { m[r.name] = n; seen[n] = (seen[n] || 0) + 1; } });
    Object.keys(m).forEach(function (k) { if (seen[m[k]] > 1) m[k] = m[k] + ' (' + k + ')'; });
    return m;
  }
  function locDone(m) { LOC.map = m || {}; LOC.ready = true; if (Object.keys(LOC.map).length) { try { render(); } catch (e) { console.error(e); } } }
  function locLoad() {
    if (LOC.started) return; LOC.started = true;
    try {
      frappe.model.with_doctype('Employee', function () {
        try {
          var fld = frappe.get_meta('Employee').fields.filter(function (f) { return f.fieldname === 'custom_job_location'; })[0];
          if (!fld || fld.fieldtype !== 'Link' || !fld.options) return locDone({});
          var target = fld.options;
          frappe.model.with_doctype(target, function () {
            try {
              var meta = frappe.get_meta(target), tf = meta.title_field || '';
              if (!tf) {
                var cand = ['location_name', 'job_location_name', 'location', 'title', 'description', 'name1'];
                for (var i = 0; i < cand.length && !tf; i++) if (meta.fields.some(function (f) { return f.fieldname === cand[i]; })) tf = cand[i];
              }
              if (!tf) { var df = meta.fields.filter(function (f) { return /^(Data|Small Text)$/.test(f.fieldtype) && (f.reqd || f.in_list_view); })[0]; if (df) tf = df.fieldname; }
              if (!tf) return locDone({});
              frappe.call({ method: 'frappe.client.get_list', args: { doctype: target, fields: ['name', tf], limit_page_length: 1000 }, freeze: false, silent: true,
                callback: function (r) { locDone(locBuild(r.message || [], tf)); },
                error: function () { locDone({}); } });
            } catch (e) { locDone({}); }
          });
        } catch (e) { locDone({}); }
      });
    } catch (e) { LOC.ready = true; }
  }
  function num(v) { return (v === null || v === undefined || v === '') ? null : (typeof v === 'number' ? v.toLocaleString() : esc(v)); }
  function badge(s) { var x = STATE[s] || STATE.unavailable; return '<span class="b b-' + x[1] + '">' + x[0] + '</span>'; }
  function detail() { return !!(S.d && S.d.meta.tier === 'detail'); }
  function rows(k) { return (S.d && S.d.rows && S.d.rows[k]) || []; }
  function uniq(a) { var o = {}, r = []; a.forEach(function (x) { if (x && !o[x]) { o[x] = 1; r.push(x); } }); return r; }
  function ids(rs) { return uniq(rs.map(function (r) { return r.employee; })); }
  function reg(sp) { if (!detail() || !sp || sp.locked) return null; DR.push(sp); return DR.length - 1; }
  function lockTxt() { return '<div class="ft lk">&#128274; Details: HR Manager / HR User only</div>'; }
  function baseEmp() { var o = { status: 'Active', company: S.d.meta.company }; var f = S.d.meta.filters;
    if (f.branch) o.branch = f.branch; if (f.job_location) o.custom_job_location = f.job_location; if (f.department) o.department = f.department; return o; }

  function routeFor(doctype, rs, filters) {
    var o = {};
    (filters || []).forEach(function (f) { o[f[0]] = (f[1] === '=') ? f[2] : [f[1] === 'between' ? 'Between' : f[1], f[2]]; });
    if (doctype === 'Employee' && rs.length) { o.name = ['in', ids(rs)]; }
    else if (doctype === 'Leave Application' && rs.length && rs[0].leave_application) {
      o.name = ['in', uniq(rs.map(function (r) { return r.leave_application; }))];
    }
    else if (rs.length && ['Attendance', 'Employee Checkin', 'Leave Application'].includes(doctype)) {
      o.employee = ['in', ids(rs)];
    }
    // Empty drill-downs should remain empty; never silently substitute all active staff.
    if (!rs.length && doctype === 'Employee') o.name = ['in', ['__NO_MATCH__']];
    return { doctype: doctype, options: o };
  }
  function spec(title, rs, route, cols) { return { title: title, rows: rs, route: route, cols: cols }; }
  function kspec(k) { if (!k.drill) return detail() ? null : { locked: true }; var rs = rows(k.drill.rows); return spec(k.label, rs, routeFor(k.drill.doctype, rs, k.drill.filters)); }

  function card(label, value, state, note, sub, sp, suffix) {
    var i = reg(sp), v = num(value);
    var h = '<div class="card' + (i !== null ? ' click" data-dr="' + i : '') + '"><div class="lb"><span>' + esc(label) + '</span>' + badge(state) + '</div>';
    h += v === null ? '<div class="v na">' + (state === 'unavailable' ? 'Not available' : 'No data') + '</div>' : '<div class="v">' + v + (suffix || '') + '</div>';
    if (sub) h += '<div class="sub">' + esc(sub) + '</div>';
    if (note) h += '<div class="nt" title="' + esc(note) + '">' + esc(note) + '</div>';
    if (sp) h += i !== null ? '<div class="ft">View details &rarr;</div>' : lockTxt();
    return h + '</div>';
  }
  function hbars(list, mk, max) {
    if (!list || !list.length) return '<div class="muted">No records.</div>';
    var m = 0; list.forEach(function (x) { if (x.count > m) m = x.count; });
    return '<div class="hb">' + list.slice(0, max || 50).map(function (x) {
      var i = mk ? reg(mk(x)) : null;
      return '<div class="hr' + (i !== null ? ' click" data-dr="' + i : '') + '" title="' + esc(x.label) + '"><span class="l">' + esc(x.label) + '</span><span class="t"><span class="f" style="width:' + (m ? Math.max(2, 100 * x.count / m) : 0) + '%"></span></span><span class="n">' + num(x.count) + '</span></div>';
    }).join('') + '</div>';
  }
  function empListSpec(title, extra) { return { title: title, rows: null, route: { doctype: 'Employee', options: Object.assign(baseEmp(), extra) } }; }
  function table(cols, rs, opt) {
    opt = opt || {};
    if (!rs || !rs.length) return '<div class="muted">' + (opt.empty || 'No records.') + '</div>';
    var lim = opt.limit || 500;
    var h = '<div class="tw"><table><thead><tr>' + cols.map(function (c) { return '<th' + (c[2] ? ' class="n"' : '') + '>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rs.slice(0, lim).forEach(function (r) {
      var i = opt.rowSpec ? reg(opt.rowSpec(r)) : null;
      h += '<tr' + (i !== null ? ' class="click" data-dr="' + i + '"' : '') + '>' + cols.map(function (c) { var v = typeof c[0] === 'function' ? c[0](r) : esc(r[c[0]]); return '<td' + (c[2] ? ' class="n"' : '') + '>' + (v === undefined || v === null ? '' : v) + '</td>'; }).join('') + '</tr>';
    });
    if (rs.length > lim) h += '<tr><td colspan="' + cols.length + '" class="muted">Showing first ' + lim + ' of ' + rs.length + '.</td></tr>';
    return h + '</tbody></table></div>';
  }
  function panel(title, body, hint, right) { return '<div class="panel"><h3><span>' + esc(title) + '</span>' + (right || '') + '</h3>' + (hint ? '<div class="ph">' + esc(hint) + '</div>' : '') + body + '</div>'; }
  function pctTxt(v) { return v === null || v === undefined ? '—' : v + '%'; }
  function ov(key) { return S.d.overview.filter(function (k) { return k.key === key; })[0]; }

  /* ---------------- drill-down dialog ---------------- */
  var LINK = { employee: 'employee', leave_application: 'leave-application' };
  function goList(route) { if (!route) return; frappe.route_options = route.options; frappe.set_route('List', route.doctype, 'List'); }
  function openDrill(sp) {
    if (!sp) return;
    if (!sp.rows) { goList(sp.route); return; }
    var rs = sp.rows, cols = sp.cols;
    if (!cols) { var ks = {}; rs.slice(0, 50).forEach(function (r) { Object.keys(r).forEach(function (k) { ks[k] = 1; }); }); cols = Object.keys(ks); }
    var d = new AHDDialog({ title: sp.title + ' (' + rs.length + ')', size: 'extra-large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    var $w = d.fields_dict.h.$wrapper;
    $w.html('<div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="form-control input-sm ahd-q" style="max-width:260px" placeholder="Search…"><span class="text-muted small ahd-c"></span></div><div class="ahd-t" style="max-height:60vh;overflow:auto"></div>');
    function draw(q) {
      var f = q ? rs.filter(function (r) { return JSON.stringify(r).toLowerCase().indexOf(q) > -1; }) : rs;
      $w.find('.ahd-c').text(f.length + ' record(s)');
      if (!f.length) { $w.find('.ahd-t').html('<div class="text-muted">No records.</div>'); return; }
      var h = '<table class="table table-sm table-bordered" style="font-size:12px"><thead><tr>' + cols.map(function (c) { return '<th style="position:sticky;top:0;background:var(--card-bg)">' + esc(c.replace(/_/g, ' ')) + '</th>'; }).join('') + '</tr></thead><tbody>';
      f.slice(0, 1000).forEach(function (r) {
        h += '<tr>' + cols.map(function (c) { var v = r[c]; if (v === null || v === undefined) v = '';
          if (LINK[c] && v) return '<td><a href="/app/' + LINK[c] + '/' + encodeURIComponent(v) + '" target="_blank">' + esc(v) + '</a></td>';
          if (c === 'name' && r.doctype && v) return '<td><a href="/app/' + frappe.router.slug(r.doctype) + '/' + encodeURIComponent(v) + '" target="_blank">' + esc(v) + '</a></td>';
          return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
      });
      $w.find('.ahd-t').html(h + '</tbody></table>');
    }
    draw('');
    $w.find('.ahd-q').on('input', frappe.utils.debounce(function () { draw(($w.find('.ahd-q').val() || '').toLowerCase()); }, 250));
    if (sp.route) d.set_primary_action('Open in ERPNext list', function () { d.hide(); goList(sp.route); });
    d.show();
  }

  /* ---------------- tabs ---------------- */
  function legend() {
    return '<div class="hb" style="gap:8px;font-size:12px">' +
      '<div>' + badge('actual') + ' Calculated from complete ERPNext records.</div>' +
      '<div>' + badge('partial') + ' Real records, but some source data is missing/conflicting or a dependency (holiday list, auto-attendance) is incomplete.</div>' +
      '<div>' + badge('missing') + ' The source DocType exists but has no records for this filter.</div>' +
      '<div>' + badge('unavailable') + ' Cannot be calculated reliably, or your role cannot read the source DocType.</div>' +
      '<div><span class="b b-lock">&#128274;</span> Employee-level drill-downs are returned by the server only to HR Manager / HR User.</div></div>';
  }
  function trendChart(t) {
    var m = 0; t.forEach(function (x) { if (x.count > m) m = x.count; });
    return '<div class="vb">' + t.map(function (x) { return '<div class="c" title="' + esc(x.date + ': ' + x.count) + '"><span class="y">' + x.count + '</span><div class="bar" style="height:' + (m ? Math.max(2, 82 * x.count / m) : 2) + '%"></div><span class="x">' + esc(x.label) + '</span></div>'; }).join('') + '</div>';
  }
  function dqRows(key) { return rows('dq_' + key).length ? rows('dq_' + key) : rows(key); }
  function dqTable(list) {
    return table([['label', 'Issue'], [function (r) { return '<span class="sev-' + r.severity + '">' + esc(r.severity) + '</span>'; }, 'Severity'], [function (r) { return num(r.count); }, 'Employees', 1], [function (r) { return pctTxt(r.pct); }, '% of active', 1]],
      list, { empty: 'No issues found.', rowSpec: function (r) { var rs = dqRows(r.key); return rs.length ? spec(r.label, rs, routeFor(r.key === 'leave_status_mismatch' ? 'Leave Application' : 'Employee', rs)) : null; } });
  }
  function vOverview(d) {
    var h = '';
    if (!d.attendance.absence_reliable) h += '<div class="alert w"><b>Attendance reliability:</b> ' + esc(d.system_status.holiday_lists.note) + ' ' + esc(d.system_status.auto_attendance.note) + ' Missing punches are therefore <b>not</b> counted as absences.</div>';
    h += '<div class="grid">' + d.overview.map(function (k) { if (k.key === 'absent') { var p = attendancePolicy(d); return card('Absent today', p.count, p.available ? (p.friday ? 'actual' : 'partial') : 'unavailable', p.note, 'Approved leave & weekoffs excluded', absenceSpec(p)); } return card(k.label, k.value, k.state, k.note, k.sub, kspec(k), k.key === 'training' && k.value !== null ? '%' : ''); }).join('') + '</div>';
    h += '<div class="g2">' + panel('Biometric punch activity — last 14 days', trendChart(d.attendance.trend), 'Distinct employees with ≥1 Employee Checkin per day (current filter).');
    h += panel('Document expiry summary', table([['label', 'Document'], [function (r) { return num(r.buckets.expired); }, 'Expired', 1], [function (r) { return num(r.buckets.d30); }, '≤30d', 1], [function (r) { return num(r.buckets.d60); }, '31–60d', 1], [function (r) { return num(r.buckets.missing); }, 'Missing', 1], [function (r) { return num(r.conflicts); }, 'Conflicts', 1]], d.compliance,
      { rowSpec: function (r) { var rs = rows('exp_' + r.key).filter(function (x) { return x.days_left <= 60; }); return spec(r.label + ' — expired or due ≤60 days', rs, routeFor('Employee', rs)); } }), 'See Documents & Compliance for rules and details.') + '</div>';
    var sv = { high: 0, medium: 1, low: 2 };
    var dq = d.data_quality.filter(function (x) { return x.count > 0; }).sort(function (a, b) { return (sv[a.severity] - sv[b.severity]) || (b.count - a.count); }).slice(0, 8);
    h += '<div class="g2">' + panel('HR data quality — top issues', dqTable(dq), 'Full list: HR Analytics tab.') + panel('How to read this dashboard', legend()) + '</div>';
    return h;
  }
  function empLink(r) { return '<a href="/app/employee/' + encodeURIComponent(r.employee) + '" target="_blank">' + esc(r.employee) + '</a>'; }
  /* ---------------- Employees tab: Employee Management (Phase 3) ---------------- */
  var DIR = { f: { search: '', company: '', department: '', designation: '', branch: '', job_location: '', nationality: '', status: 'Active' },
    page: 1, pl: 25, sort: 'employee_name', order: 'asc', data: null, opts: null, busy: false, err: null, seq: 0 };
  var DIR_COLS = [['employee', 'Employee ID', 'name'], ['employee_name', 'Employee Name', 'employee_name'], ['company', 'Company', 'company'],
    ['department', 'Department', 'department'], ['designation', 'Designation', 'designation'], ['branch', 'Branch', 'branch'],
    ['job_location', 'Job Location', 'job_location'], ['nationality', 'Nationality', 'nationality'],
    ['date_of_joining', 'Date of Joining', 'date_of_joining'], ['status', 'Status', 'status']];
  var STATUS_CLS = { Active: 'ok', Inactive: 'warn', Suspended: 'warn', Left: 'muted' };

  function dirLoad(withOpts) {
    if (!detail()) return;
    DIR.busy = true; DIR.err = null; dirRender();
    var seq = ++DIR.seq;
    var args = Object.assign({}, DIR.f, { company: DIR.f.company || S.d.meta.company, page: DIR.page, page_length: DIR.pl,
      sort_by: DIR.sort, sort_order: DIR.order, with_options: (withOpts || !DIR.opts) ? 1 : 0 });
    frappe.call({ method: 'admin_hr_employee_directory', args: args, freeze: false,
      callback: function (r) { if (seq !== DIR.seq) return; DIR.busy = false; DIR.data = r.message || null;
        if (DIR.data && DIR.data.options) DIR.opts = DIR.data.options; if (DIR.data) DIR.page = DIR.data.page; dirRender(); },
      error: function () { if (seq !== DIR.seq) return; DIR.busy = false; DIR.err = 'Could not load the employee directory. You may not have permission.'; dirRender(); } });
  }
  function dirSel(key, label, list, cur, all, lab) {
    return '<label>' + esc(label) + '<select data-dirf="' + key + '">' + (all ? '<option value="">' + esc(all) + '</option>' : '') +
      (list || []).map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(lab ? lab(x) : x) + '</option>'; }).join('') + '</select></label>';
  }
  function dirRender() {
    var root = host.querySelector('[data-dir-root]');
    if (!root) return;
    var active = document.activeElement, keepSearch = active && active.dataset && active.dataset.dirf === 'search', caret = keepSearch ? active.selectionStart : 0;
    var o = DIR.opts || {}, d = DIR.data, comp = DIR.f.company || (S.d && S.d.meta.company);
    var h = '<div class="dirbar"><label class="dsearch">Search<input type="search" data-dirf="search" placeholder="Employee ID or name…" value="' + esc(DIR.f.search) + '"></label>' +
      dirSel('company', 'Company', o.companies || [comp], comp) +
      dirSel('department', 'Department', o.department, DIR.f.department, 'All departments') +
      dirSel('designation', 'Designation', o.designation, DIR.f.designation, 'All designations') +
      dirSel('branch', 'Branch', o.branch, DIR.f.branch, 'All branches') +
      dirSel('job_location', 'Job Location', o.job_location, DIR.f.job_location, 'All locations', locName) +
      dirSel('nationality', 'Nationality', o.nationality, DIR.f.nationality, 'All nationalities') +
      dirSel('status', 'Status', o.statuses || ['Active', 'Inactive', 'Suspended', 'Left', 'All'], DIR.f.status) +
      '<button class="btn s" data-export="dir">Export CSV</button><button class="btn s" data-dira="reset">Clear</button></div>';
    if (DIR.err) h += '<div class="alert e">' + esc(DIR.err) + '</div>';
    if (!d && DIR.busy) h += '<div class="ld">Loading employees…</div>';
    else if (d) {
      var from = d.total ? (d.page - 1) * d.page_length + 1 : 0, to = Math.min(d.total, d.page * d.page_length);
      h += '<div class="dirmeta"><span>' + (DIR.busy ? '<span class="spin"></span> Loading… ' : '') + 'Showing <b>' + from + '–' + to + '</b> of <b>' + num(d.total) + '</b> employees</span>' +
        '<label class="pl">Rows<select data-dirpl="1">' + [25, 50, 100].map(function (n) { return '<option' + (n === DIR.pl ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
      if (!d.rows.length) h += '<div class="empty">No employees match these filters.<br><button class="btn s" data-dira="reset" style="margin-top:8px">Clear filters</button></div>';
      else {
        h += '<div class="tw dtw' + (DIR.busy ? ' dim' : '') + '"><table class="dirtable"><thead><tr>' + DIR_COLS.map(function (c) {
          var on = DIR.sort === c[2]; return '<th class="sort' + (on ? ' on' : '') + '" data-dirsort="' + c[2] + '" title="Sort by ' + esc(c[1]) + '">' + esc(c[1]) + (on ? (DIR.order === 'asc' ? ' ▲' : ' ▼') : ' <span class="muted">↕</span>') + '</th>';
        }).join('') + '<th>Action</th></tr></thead><tbody>';
        d.rows.forEach(function (r) {
          h += '<tr class="click" data-dirview="' + esc(r.employee) + '">' + DIR_COLS.map(function (c) {
            var v = r[c[0]];
            if (c[0] === 'status') return '<td><span class="b b-' + (STATUS_CLS[v] || 'muted') + '">' + esc(v) + '</span></td>';
            if (c[0] === 'employee') return '<td class="mono">' + esc(v) + '</td>';
            if (c[0] === 'job_location') return '<td>' + esc(v ? locName(v) : '—') + '</td>';
            return '<td>' + esc(v || '—') + '</td>';
          }).join('') + '<td><button class="btn s sm" data-dirview="' + esc(r.employee) + '">View</button></td></tr>';
        });
        h += '</tbody></table></div>';
        h += '<div class="pager"><button class="btn s sm" data-dirpage="first"' + (d.page <= 1 ? ' disabled' : '') + '>«</button>' +
          '<button class="btn s sm" data-dirpage="prev"' + (d.page <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
          '<span>Page <b>' + d.page + '</b> of <b>' + d.pages + '</b></span>' +
          '<button class="btn s sm" data-dirpage="next"' + (d.page >= d.pages ? ' disabled' : '') + '>Next ›</button>' +
          '<button class="btn s sm" data-dirpage="last"' + (d.page >= d.pages ? ' disabled' : '') + '>»</button></div>';
      }
    }
    root.innerHTML = h;
    if (keepSearch) { var inp = root.querySelector('[data-dirf="search"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(caret, caret); } catch (e) {} } }
  }
  function dirAfterRender() { if (!detail()) return; if (!DIR.data && !DIR.busy) dirLoad(true); else dirRender(); }

  /* ----- employee detail panel ----- */
  function pill(text, color) { return '<span class="indicator-pill ' + color + '" style="white-space:nowrap">' + esc(text) + '</span>'; }
  function kv(pairs) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 16px">' + pairs.map(function (p) { return '<div><div class="text-muted small">' + esc(p[0]) + '</div><div style="font-weight:600">' + (p[2] ? p[1] : esc(p[1] === null || p[1] === undefined || p[1] === '' ? '—' : p[1])) + '</div></div>'; }).join('') + '</div>'; }
  function sect(title, body, note) { return '<div style="border:1px solid var(--border-color);border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">' + esc(title) + '</div>' + body + (note ? '<div class="text-muted small" style="margin-top:8px">' + esc(note) + '</div>' : '') + '</div>'; }
  function tbl(cols, rows, empty) {
    if (!rows || !rows.length) return '<div class="text-muted">' + esc(empty || 'No records.') + '</div>';
    return '<div style="overflow-x:auto"><table class="table table-sm" style="font-size:12px;margin:0"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + cols.map(function (c) { var v = typeof c[0] === 'function' ? c[0](r) : esc(r[c[0]] === null || r[c[0]] === undefined || r[c[0]] === '' ? '—' : r[c[0]]); return '<td>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  var DOC_PILL = { expired: ['Expired', 'red'], due_30: ['≤ 30 days', 'orange'], due_60: ['≤ 60 days', 'yellow'], due_90: ['≤ 90 days', 'blue'], valid: ['Valid', 'green'], missing: ['Missing', 'gray'] };
  function counts(o) { var k = Object.keys(o || {}); return k.length ? k.map(function (s) { return esc(s) + ': <b>' + o[s] + '</b>'; }).join(' · ') : '<span class="text-muted">No submitted Attendance records</span>'; }
  function openEmployee(id) {
    if (!detail() || !id) return;
    var dlg = new AHDDialog({ title: 'Employee details', size: 'extra-large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    var $w = dlg.fields_dict.h.$wrapper;
    $w.html('<div class="text-muted" style="padding:30px;text-align:center">Loading employee details…</div>');
    dlg.show();
    frappe.call({ method: 'admin_hr_employee_detail', args: { employee: id }, freeze: false,
      callback: function (r) {
        var m = r.message; if (!m) { $w.html('<div class="text-muted">No data.</div>'); return; }
        var b = m.basic, a = m.attendance, l = m.leave, t = m.training, q = m.requests;
        dlg.set_title(b.employee_name + ' · ' + b.employee);
        var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' + pill(b.status, b.status === 'Active' ? 'green' : 'gray') +
          (b.service_years !== null ? pill(b.service_years + ' yrs service', 'blue') : '') +
          '<a class="btn btn-xs btn-default" href="/app/employee/' + encodeURIComponent(b.employee) + '" target="_blank">Open Employee record ↗</a></div>';
        h += sect('A · Basic information', kv([['Employee', b.employee_name + ' (' + b.employee + ')'], ['Company', b.company], ['Department', b.department], ['Designation', b.designation],
          ['Branch', b.branch], ['Job location', locName(b.job_location)], ['Nationality', b.nationality], ['Date of joining', b.date_of_joining], ['Employment status', b.status],
          ['Employment type', b.employment_type], ['Reports to', b.reports_to], ['Default shift', b.default_shift]]));
        var ah = a.available ? kv([['Attendance records (30 days)', counts(a.last_30_days), 1], ['Attendance records (90 days)', counts(a.last_90_days), 1],
          ['Late entries (30 days)', a.late_entries_30d], ['Days with biometric/mobile punches (30 days)', a.punch_days_30d === undefined ? 'Unavailable' : a.punch_days_30d],
          ['Last punch', a.last_punch || '—'], ['Last attendance record', a.last_record || '—']]) : '<div class="text-muted">Attendance not readable with your permissions.</div>';
        h += sect('B · Attendance summary', ah, a.note);
        var lh = '';
        if (!l.available) lh = '<div class="text-muted">Leave Applications not readable with your permissions.</div>';
        else {
          lh += '<div style="margin-bottom:6px"><b>Leave balance</b> ' + pill(l.balance_state === 'actual' ? 'Actual' : l.balance_state === 'partial' ? 'Partial' : 'Unavailable', l.balance_state === 'actual' ? 'green' : l.balance_state === 'partial' ? 'orange' : 'gray') + '</div>' +
            ((l.balance_state === 'actual' || l.balance_state === 'partial') ? tbl([['leave_type', 'Leave type'], ['allocated', 'Allocated'], ['balance', 'Balance (approved only)'], ['pending_deducted', 'Pending (not subtracted)'], ['period', 'Allocation period']], l.balances) : '') +
            '<div class="text-muted small" style="margin:4px 0 10px">' + esc(l.balance_note) + '' + '</div>';
          lh += '<div style="margin-bottom:6px"><b>Pending applications</b> (' + l.pending.length + ')' + (l.drafts ? ' · ' + l.drafts + ' draft(s) not yet sent' : '') + '</div>' +
            tbl([[function (x) { return '<a href="/app/leave-application/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a>'; }, 'Application'], ['leave_type', 'Type'], ['from_date', 'From'], ['to_date', 'To'], ['days', 'Days'], ['workflow_state', 'State']], l.pending, 'No pending applications.');
          lh += '<div style="margin:10px 0 6px"><b>Approved leave history</b> (' + l.approved_total + ' total, latest ' + l.approved_history.length + ')</div>' +
            tbl([[function (x) { return '<a href="/app/leave-application/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a>'; }, 'Application'], ['leave_type', 'Type'], ['from_date', 'From'], ['to_date', 'To'], ['days', 'Days']], l.approved_history, 'No approved leave.');
        }
        h += sect('C · Leave information', lh);
        h += sect('D · Documents & compliance', tbl([['document', 'Document'], ['date', 'Expiry date'], [function (x) { return x.days_left === null ? '—' : String(x.days_left); }, 'Days left'],
          [function (x) { var p = DOC_PILL[x.status] || ['—', 'gray']; return pill(p[0], p[1]); }, 'Status'], ['attachment', 'Copy on file'], [function (x) { return x.warning ? '<span style="color:var(--red-600,#b91c1c)">' + esc(x.warning) + '</span>' : ''; }, 'Check']], m.documents),
          'Only expiry dates and status are shown. ID, Iqama and passport numbers, bank, salary and medical details are never returned by this panel.');
        var th = !t.available ? '<div class="text-muted">Training progress not readable with your permissions.</div>' :
          kv([['Assigned', t.assigned], ['Completed', t.completed], ['Pending', t.pending], ['Overdue', t.overdue]]) + '<div style="margin-top:8px">' +
          tbl([['training', 'Training'], ['status', 'Status'], ['due_date', 'Due'], ['completed_on', 'Completed']], t.items, 'No training assigned.') + '</div>';
        h += sect('E · Training progress', th);
        h += sect('F · HR requests', tbl([['doctype', 'Type'], [function (x) { return '<a href="/app/' + frappe.router.slug(x.doctype) + '/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a>'; }, 'Document'],
          ['state', 'State'], [function (x) { return x.open ? pill('Open', 'orange') : pill('Closed', 'gray'); }, ''], ['created', 'Created']], q.items, 'No HR requests linked to this employee.'),
          q.unavailable.length ? 'Not readable with your permissions: ' + q.unavailable.join(', ') : 'Sources: Leave Request Form, DM Letter Forms, Attendance Request, Employee Clearance, Qiwa contract renewal request, IT Help Desk Request, Resignation Letter.');
        $w.html(h);
      },
      error: function () { $w.html('<div class="text-muted" style="padding:20px">Employee details are not available (not permitted or not found).</div>'); } });
  }

  function vEmployees(d) {
    var e = d.employees,
        mon = d.meta.date.slice(0, 7),
        since = frappe.datetime.add_months(d.meta.date, -12);

    var h = '<div class="sh">Employee management</div>';
    h += '<div class="grid kpi-row employee-kpi-grid" style="--cols:11">';

    h += card(
        'Total Active Employees',
        e.active,
        'actual',
        'Employee.status = Active (current filters)',
        '',
        spec('Active employees', rows('active'), routeFor('Employee', rows('active')))
    );

    h += card(
        'Total Departments',
        e.departments_count,
        'actual',
        'Distinct departments with active employees',
        '',
        spec('Department headcount',
            e.by_department.map(function (x) {
                return { department: x.label, active_employees: x.count };
            }),
            { doctype: 'Department', options: {} }
        )
    );

    h += card(
        'New Joiners This Month',
        e.joined_this_month,
        'actual',
        'date_of_joining in ' + mon,
        '',
        spec('Joined this month', rows('joined_month'), routeFor('Employee', rows('joined_month')))
    );

    var ol = ov('on_leave');
    h += card('On Approved Leave Today', ol.value, ol.state, ol.note, '', kspec(ol));

    h += card(
        'Saudi Employees',
        e.saudi,
        'actual',
        'custom_employee_nationality = Saudi Arabia',
        '',
        spec('Saudi employees', rows('saudi'), routeFor('Employee', rows('saudi')))
    );

    h += card(
        'Non-Saudi Employees',
        e.non_saudi,
        e.nationality_missing ? 'partial' : 'actual',
        'custom_employee_nationality set and not Saudi Arabia',
        e.nationality_missing ? e.nationality_missing + ' without nationality' : '',
        spec('Non-Saudi employees', rows('non_saudi'), routeFor('Employee', rows('non_saudi')))
    );

    h += card(
        'Employees with Expiring Documents',
        e.expiring_employees,
        'partial',
        'Iqama/ID, passport, contract or insurance expired or due within 60 days. Missing dates are not counted.',
        '',
        spec('Employees with expiring documents', rows('expiring_employees'), routeFor('Employee', rows('expiring_employees')))
    );

    h += card(
        'Joiners (12 months)',
        e.joiners_12m,
        'actual',
        'Active + left employees by date_of_joining',
        '',
        empListSpec('Joiners', {
            status: ['in', ['Active', 'Left', 'Inactive', 'Suspended']],
            date_of_joining: ['>=', since]
        })
    );

    h += card(
        'Leavers (12 months)',
        e.leavers_12m,
        'actual',
        'Status Left with relieving_date in last 12 months',
        '',
        empListSpec('Leavers', {
            status: 'Left',
            relieving_date: ['>=', since]
        })
    );

    h += card(
        'Linked to ERPNext user',
        e.with_user,
        e.with_user === e.active ? 'actual' : 'partial',
        (e.active - e.with_user) + ' without user_id',
        '',
        spec('Employees without ERPNext user', dqRows('missing_user'), routeFor('Employee', dqRows('missing_user')))
    );

    h += card(
        'Left / Inactive / Suspended',
        e.inactive_or_left_in_filter,
        'actual',
        'All time, same company and filters',
        '',
        empListSpec('Not active', {
            status: ['in', ['Left', 'Inactive', 'Suspended']]
        })
    );

    h += '</div>';
    h += '<div class="sh">Employee analytics</div><div class="g2 analytics-row employee-analytics-row" style="--cols:8">';
    function by(field) { return function (x) { var o = {}; o[field] = x.label === '(Not set)' ? ['is', 'not set'] : (x.code !== undefined ? x.code : x.label); return empListSpec(x.label, o); }; }
    h += panel('Department-wise headcount', hbars(e.by_department, by('department')), detail() ? 'Click a bar to open the filtered Employee list.' : '');
    h += panel('Branch-wise headcount', hbars(e.by_branch, by('branch')));
    h += panel('Nationality distribution', hbars(d.analytics.nationality, by('custom_employee_nationality')), 'Source: custom_employee_nationality.');
    h += panel('Monthly joining trend (12 months)', trendChart(e.joining_trend.map(function (x) { return { date: x.label, label: x.label.slice(2), count: x.count }; })), 'Active and former employees by date_of_joining.');
    h += panel('Employment status distribution', hbars(e.status_distribution, function (x) { return { title: x.label, rows: null, route: { doctype: 'Employee', options: Object.assign(baseEmp(), { status: x.label }) } }; }), 'All statuses for the selected company and filters.');
    h += panel('By job location', hbars(locList(e.by_location), by('custom_job_location')));
    h += panel('Top designations', hbars(e.by_designation, by('designation')));
    h += panel('By employment type', hbars(e.by_employment_type, by('employment_type')), 'employment_type is often blank. See Data Quality.');
    h += '</div>';
    h += '<div class="sh">Employee directory</div>';
    if (detail()) h += '<div class="panel"><div data-dir-root></div><div class="ph" style="margin:8px 0 0">Server-side search, filters, sorting and pages. Results respect your ERPNext permissions and Employee User Permissions. Click a row for the employee detail panel.</div></div>';
    else h += '<div class="alert i">&#128274; The employee directory and employee details are available to HR Manager / HR User only. Your view shows aggregate figures.</div>';
    return h;
  }
  // Business weekoff policy: Friday for all; Saturday additionally for Saudi nationals.
  // Only complete permission-filtered row sets can support distinct-person totals.
  function attendancePolicy(d) {
    var a = d.attendance || {}, rr = d.rows || {}, e = d.employees || {};
    function list(k) { return rr[k] || []; }
    function distinct(rs) {
      var seen = Object.create(null);
      return rs.filter(function (r) { if (!r.employee || seen[r.employee]) return false; seen[r.employee] = true; return true; });
    }
    function complete(rs, count) { return typeof count === 'number' && distinct(rs).length === count; }
    var date = d.meta.date, day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date + 'T12:00:00Z').getUTCDay() : NaN;
    var friday = day === 5, saturday = day === 6;
    var saudi = Object.create(null), nationals = list('saudi');
    nationals.forEach(function (r) { saudi[r.employee] = true; });
    var saudiComplete = complete(nationals, e.saudi);
    function nationality(r) {
      return String(r.custom_employee_nationality || r.nationality || r.custom_nationality || '').trim().toLowerCase();
    }
    function isSaudi(r) { return !!saudi[r.employee] || ['saudi arabia', 'saudi', 'saudi arabian', 'المملكة العربية السعودية', 'السعودية'].indexOf(nationality(r)) >= 0; }
    function knownNationality(r) { return saudiComplete || !!nationality(r) || !!saudi[r.employee]; }
    function working(r) { return !friday && !(saturday && isSaudi(r)); }
    var noPunch = distinct(list('no_punch')), recorded = distinct(list('absent_recorded'));
    var leave = Object.create(null);
    list('on_leave').forEach(function (r) { leave[r.employee] = true; });
    var leaveKpi = (d.overview || []).filter(function (k) { return k.key === 'on_leave'; })[0] || {};
    var leaveCount = typeof a.on_leave === 'number' ? a.on_leave : leaveKpi.value;
    // Never classify employees as absent when the approved-leave exclusion set is incomplete.
    var leaveComplete = typeof leaveCount === 'number' ? complete(list('on_leave'), leaveCount) : Array.isArray(rr.on_leave);
    var noPunchComplete = complete(noPunch, a.no_punch_unconfirmed);
    var recordedComplete = complete(recorded, a.absent_recorded);
    var candidates = distinct(noPunch.concat(recorded));
    var nationalityKnown = !saturday || candidates.every(knownNationality);
    var available = !!a.ok && !isNaN(day) && (friday || (noPunchComplete && recordedComplete && nationalityKnown && leaveComplete));
    var missing = noPunch.filter(function (r) { return working(r) && !leave[r.employee]; });
    var confirmed = recorded.filter(function (r) { return working(r) && !leave[r.employee]; });
    var absent = distinct(confirmed.concat(missing)).map(function (r) {
      return Object.assign({}, r, { attendance_date: date, absence_basis: confirmed.some(function (c) { return c.employee === r.employee; }) ? 'Recorded Attendance = Absent' : 'Inferred: no punch and no approved leave' });
    });
    var recordedAvailable = !isNaN(day) && (friday || (recordedComplete && leaveComplete && (!saturday || recorded.every(knownNationality))));
    var note = 'Approved leave always takes precedence over both missing punches and recorded Absent attendance. No punch without approved leave is treated as inferred absence. Fridays are excluded for everyone; Saturdays are also excluded for Saudi nationals. Counts can change as punches or leave approvals arrive.';
    if (!available && !friday) note += ' Complete employee-level absence and approved-leave rows (and Saturday nationality data) are required; an unavailable count is never shown as zero.';
    return { count: available ? absent.length : null, rows: available ? absent : [],
      recorded: recordedAvailable ? confirmed.length : null, recordedRows: recordedAvailable ? confirmed : [],
      inferred: available ? absent.filter(function (r) { return !confirmed.some(function (c) { return c.employee === r.employee; }); }).length : null,
      friday: friday, saturday: saturday, note: note, available: available };
  }
  function absenceSpec(p, recorded) {
    if (!(recorded ? p.recorded !== null : p.available)) return null;
    var rs = recorded ? p.recordedRows : p.rows;
    return spec(recorded ? 'Recorded absences · approved leave and weekoffs excluded' : 'Absent today · approved leave and weekoffs excluded', rs, routeFor('Employee', rs));
  }
  function vAttendance(d) {
    var a = d.attendance, s = d.system_status, dt = d.meta.date, p = attendancePolicy(d);
    var h = '<div class="sh">Attendance overview</div><div class="alert i attendance-policy">' + esc(p.note) + '</div>';
    h += '<div class="grid kpi-row attendance-kpi-row" style="--cols:6">';
    h += card('Checked-in today', a.ok ? a.checked_in : null, a.ok ? 'actual' : 'unavailable', 'Distinct employees with at least one punch on ' + dt, '', spec('Checked-in today', rows('checked_in'), routeFor('Employee Checkin', rows('checked_in'), [['time', 'between', [dt + ' 00:00:00', dt + ' 23:59:59']]])));
    h += card('Punches today', a.ok ? a.punches_today : null, a.ok ? 'actual' : 'unavailable', 'All biometric and mobile punches today.', (a.mobile_punches == null ? '—' : a.mobile_punches) + ' mobile · ' + (a.other_punches == null ? '—' : a.other_punches) + ' device/untagged', { title: 'Punches', rows: null, route: { doctype: 'Employee Checkin', options: { time: ['Between', [dt + ' 00:00:00', dt + ' 23:59:59']], employee: ['in', ids(rows('active'))] } } });
    h += card('Absent today', p.count, p.available ? (p.friday ? 'actual' : 'partial') : 'unavailable', p.note, p.inferred === null ? 'Employee-level data required' : p.inferred + ' inferred · ' + p.recorded + ' recorded', absenceSpec(p));
    h += card('Recorded absences', p.recorded, p.recorded === null ? 'unavailable' : 'actual', 'Submitted Attendance marked Absent, excluding approved leave and weekly days off. Already included in Absent today.', 'Weekoffs excluded', absenceSpec(p, true));
    ['on_leave', 'late'].forEach(function (key) { var k = ov(key); if (k) h += card(k.label, k.value, k.state, k.note, k.sub, kspec(k)); });
    h += '</div><div class="sh">Attendance analytics</div><div class="g2 analytics-row attendance-analytics-row" style="--cols:' + (detail() ? 4 : 3) + '">';
    h += panel('Daily check-ins · 14 days', trendChart(a.trend || []), 'Distinct employees with punches. Friday is a weekoff for all; Saturday is also a weekoff for Saudi nationals.');
    h += panel('Submitted attendance today', (a.attendance_docs_today || []).length ? hbars(a.attendance_docs_today) : '<div class="muted">No submitted Attendance records for this date.</div>', 'Raw submitted records; the absence KPIs apply the weekoff policy.');
    var ss = (s.auto_attendance && s.auto_attendance.stale_shifts) || [];
    h += panel('Auto-attendance sync', s.auto_attendance && s.auto_attendance.readable === false ? '<div class="muted">Shift Type not readable with your permissions.</div>' : table([['shift', 'Shift type'], ['last_sync', 'Last check-in sync']], ss, { empty: 'All auto-attendance shifts synced recently.' }), 'Enabled shifts with no sync in the last 2 days.');
    if (detail()) h += panel('Late check-ins', table([[empLink, 'ID'], ['employee_name', 'Name'], ['shift', 'Shift'], ['first_punch', 'First punch'], [function (r) { return num(r.late_by_min); }, 'Late (min)', 1]], rows('late'), { empty: 'No late check-ins.' }), 'First punch after shift start plus entry grace.');
    return h + '</div>';
  }
  /* ---------------- Leave & Approvals tab (Phase 4) ---------------- */
  var LV = { sum: null, busy: false, err: null, seq: 0, f: { company: '', from_date: '', to_date: '' }, cal: '',
    L: { data: null, busy: false, err: null, seq: 0, preset: '', title: 'All leave applications', extra: {},
      f: { search: '', department: '', employee: '', leave_type: '', status: '', workflow_state: '', range_from: '', range_to: '' },
      page: 1, pl: 25, sort: 'from_date', order: 'desc' } };
  var LV_COLS = [['name', 'Application', 'name'], ['employee_name', 'Employee', 'employee_name'], ['department', 'Department', 'department'],
    ['company', 'Company', 'company'], ['leave_type', 'Leave Type', 'leave_type'], ['from_date', 'From', 'from_date'], ['to_date', 'To', 'to_date'],
    ['days', 'Days', 'days'], ['workflow_state', 'Workflow State', 'workflow_state'], ['status', 'Application Status', 'status'],
    ['approver', 'Approver', 'approver'], ['age_label', 'Approval Age', 'age_days']];
  var LV_CLS = { approved: ['Approved', 'ok'], pending: ['Pending', 'warn'], rejected: ['Rejected', 'bad'], cancelled: ['Cancelled', 'muted'],
    draft: ['Draft', 'muted'], conflict: ['Conflict', 'bad'], other: ['Other', 'muted'] };
  var LV_PILL = { approved: 'green', pending: 'orange', rejected: 'red', cancelled: 'gray', draft: 'gray', conflict: 'red', other: 'gray' };
  function lvArgs(a) {
    return gfArgs(Object.assign({ from_date: LV.f.from_date, to_date: LV.f.to_date }, a || {}));
  }
  function lvLoad() {
    LV.busy = true; LV.err = null; lvRender();
    var seq = ++LV.seq;
    frappe.call({ method: 'admin_hr_leave_data', args: lvArgs({ mode: 'summary', cal_month: LV.cal }), freeze: false,
      callback: function (r) { if (seq !== LV.seq) return; LV.busy = false; LV.sum = r.message || null;
        if (LV.sum) { LV.f.company = LV.sum.meta.company; LV.f.from_date = LV.sum.meta.from_date; LV.f.to_date = LV.sum.meta.to_date; LV.cal = LV.sum.analytics.calendar.month; }
        lvRender(); if (LV.sum && LV.sum.meta.tier === 'detail' && !LV.L.data) lvList(); },
      error: function () { if (seq !== LV.seq) return; LV.busy = false; LV.err = 'Could not load leave data. You may not have permission.'; lvRender(); } });
  }
  function lvList() {
    var L = LV.L; if (!LV.sum || LV.sum.meta.tier !== 'detail') return;
    L.busy = true; L.err = null; lvRenderList();
    var seq = ++L.seq;
    frappe.call({ method: 'admin_hr_leave_data', args: lvArgs(Object.assign({ mode: 'list', preset: L.preset, page: L.page, page_length: L.pl, sort_by: L.sort, sort_order: L.order }, L.f, L.extra)), freeze: false,
      callback: function (r) { if (seq !== L.seq) return; L.busy = false; L.data = r.message || null; if (L.data) L.page = L.data.page; lvRenderList(); },
      error: function () { if (seq !== L.seq) return; L.busy = false; L.err = 'Could not load leave applications.'; lvRenderList(); } });
  }
  function lvPreset(preset, title, extra, filters) {
    var L = LV.L; L.preset = preset || ''; L.title = title || 'All leave applications'; L.extra = extra || {}; L.page = 1;
    L.f = Object.assign({ search: '', department: '', employee: '', leave_type: '', status: '', workflow_state: '', range_from: '', range_to: '' }, filters || {});
    if (preset && preset.indexOf('age') === 0 || preset === 'kpi_pending' || preset === 'kpi_pending_old' || preset.indexOf('q_') === 0) { L.sort = 'age_days'; L.order = 'desc'; }
    else { L.sort = 'from_date'; L.order = 'desc'; }
    lvList();
    var el = host.querySelector('[data-lv-dir]'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function lvSel(key, label, list, cur, all) {
    return '<label>' + esc(label) + '<select data-lvf="' + key + '">' + (all !== undefined ? '<option value="">' + esc(all) + '</option>' : '') +
      (list || []).map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></label>';
  }
  function lvCard(label, value, sub, note, attr, state) {
    var click = !!attr;
    return '<div class="card' + (click ? ' click' : '') + '"' + (attr || '') + '><div class="lb"><span>' + esc(label) + '</span>' + badge(state || (value === null || value === undefined ? 'unavailable' : 'actual')) + '</div>' +
      (value === null || value === undefined ? '<div class="v na">Not available</div>' : '<div class="v">' + num(value) + '</div>') +
      (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + (note ? '<div class="nt" title="' + esc(note) + '">' + esc(note) + '</div>' : '') +
      (click ? '<div class="ft">View applications &rarr;</div>' : (LV.sum && LV.sum.meta.tier !== 'detail' ? '<div class="ft muted">&#128274; Details: HR Manager / HR User</div>' : '')) + '</div>';
  }
  function lvBars(list, valKey, attrFn, fmt) {
    if (!list || !list.length) return '<div class="muted">No records.</div>';
    var m = 0; list.forEach(function (x) { if ((x[valKey] || 0) > m) m = x[valKey] || 0; });
    var dt = LV.sum && LV.sum.meta.tier === 'detail';
    return '<div class="lvbars">' + list.slice(0, 40).map(function (x) {
      var w = m ? Math.max(2, Math.round((x[valKey] || 0) / m * 100)) : 0;
      return '<div class="lvbr' + (dt && attrFn ? ' click' : '') + '"' + (dt && attrFn ? attrFn(x) : '') + ' title="' + esc(x.label) + '"><span class="lvbl">' + esc(x.label) + '</span><span class="lvbt"><span style="width:' + w + '%"></span></span><span class="lvbv">' + (fmt ? fmt(x) : num(x[valKey])) + '</span></div>';
    }).join('') + '</div>';
  }
  function lvAttr(o) { return Object.keys(o).map(function (k) { return ' data-' + k + '="' + esc(o[k]) + '"'; }).join(''); }
  function lvMonthChart(list) {
    var m = 0; list.forEach(function (x) { if (x.paid + x.lwp > m) m = x.paid + x.lwp; });
    var dt = LV.sum && LV.sum.meta.tier === 'detail';
    return '<div class="lvmc">' + list.map(function (x) {
      var hp = m ? Math.round(x.paid / m * 100) : 0, hl = m ? Math.round(x.lwp / m * 100) : 0;
      return '<div class="lvmcol' + (dt ? ' click' : '') + '"' + (dt ? lvAttr({ lvmonth: x.month }) : '') + ' title="' + esc(x.month + ': ' + x.paid + ' paid + ' + x.lwp + ' unpaid days, ' + x.apps + ' applications') + '">' +
        '<div class="lvmv">' + num(Math.round(x.paid + x.lwp)) + '</div><div class="lvmbar"><span class="lwp" style="height:' + hl + '%"></span><span class="paid" style="height:' + hp + '%"></span></div><div class="lvml">' + esc(x.month.slice(2)) + '</div></div>';
    }).join('') + '</div><div class="lvlegend"><span><i class="paid"></i>Paid leave days</span><span><i class="lwp"></i>Unpaid (LWP) days</span></div>';
  }
  function lvCalendar(c) {
    var days = c.days || [], m = 0; days.forEach(function (x) { if (x.count > m) m = x.count; });
    var first = new Date(c.month + '-01T00:00:00'), pad = first.getDay(), dt = LV.sum && LV.sum.meta.tier === 'detail', today = LV.sum.meta.today;
    var h = '<div class="lvcalh"><button class="btn s sm" data-lvcal="-1">‹</button><b>' + esc(window.moment ? moment(c.month + '-01').format('MMMM YYYY') : c.month) + '</b><button class="btn s sm" data-lvcal="1">›</button></div>';
    h += '<div class="lvcal">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div class="lvcd">' + d + '</div>'; }).join('');
    for (var i = 0; i < pad; i++) h += '<div></div>';
    days.forEach(function (x) {
      var a = m ? (0.12 + 0.88 * x.count / m) : 0;
      h += '<div class="lvcc' + (x.count && dt ? ' click' : '') + (x.date === today ? ' today' : '') + '"' + (x.count && dt ? lvAttr({ lvday: x.date }) : '') + ' title="' + esc(x.date + ': ' + x.count + ' employee(s) on approved leave') + '" style="' + (x.count ? 'background:rgba(37,99,235,' + a.toFixed(2) + ');color:' + (a > 0.55 ? '#fff' : 'inherit') : '') + '"><span>' + parseInt(x.date.slice(8), 10) + '</span><b>' + (x.count || '') + '</b></div>';
    });
    return h + '</div>';
  }
  function vLeave(d) {
    return '<div data-lv-root></div>';
  }
  function lvAfterRender() { if (!LV.sum && !LV.busy) lvLoad(); else lvRender(); }
  function lvRender() {
    var root = host.querySelector('[data-lv-root]'); if (!root) return;
    var s = LV.sum, h = '';
    var comps = (s && s.meta.companies) || (S.d && S.d.meta.companies) || [];
    h += scopeLine('leave') + '<div class="dirbar lvperiod">' +
      '<label>Period from<input type="date" data-lvp-from value="' + esc(LV.f.from_date) + '"></label><label>Period to<input type="date" data-lvp-to value="' + esc(LV.f.to_date) + '"></label>' +
      '<button class="btn s" data-lva="apply">Apply</button><button class="btn s" data-lva="ytd">Year to date</button><button class="btn s" data-lva="month">This month</button>' +
      (LV.busy ? '<span class="muted"><span class="spin"></span> Loading…</span>' : '') + '</div>';
    if (LV.err) h += '<div class="alert e">' + esc(LV.err) + '</div>';
    if (!s) { root.innerHTML = h + (LV.busy ? '<div class="ld">Loading leave data…</div>' : ''); return; }
    var dt = s.meta.tier === 'detail', K = {};
    s.kpis.forEach(function (k) { K[k.key] = k; });
    function kc(k) { return lvCard(k.label, k.value, k.sub, k.basis, dt && k.preset ? (k.preset === 'no_alloc_emp' ? lvAttr({ lvnoalloc: '' }) : lvAttr({ lvpre: k.preset, lvt: k.label })) : ''); }
    h += '<div class="sh">Leave dashboard <span class="muted" style="font-weight:400;text-transform:none">· period ' + esc(s.meta.from_date) + ' → ' + esc(s.meta.to_date) + ' · ' + num(s.meta.total_applications) + ' applications in scope</span></div>';
    h += '<div class="grid kpi-row leave-kpi-row" style="--cols:8">' + ['pending', 'approved', 'rejected', 'on_leave', 'upcoming', 'used', 'pending_old', 'no_alloc'].map(function (k) { return kc(K[k]); }).join('') + '</div>';
    h += '<div class="ph">Approved = ' + esc(s.definitions.approved) + '. Pending = ' + esc(s.definitions.pending) + '. Drafts and workflow-pending applications are never counted as approved.</div>';
    // analytics
    var A = s.analytics;
    h += '<div class="sh">Leave analytics</div><div class="g2 analytics-row leave-analytics-row" style="--cols:6">';
    h += panel('Monthly leave usage (12 months)', lvMonthChart(A.monthly), 'Approved applications by start month (days). ' + (dt ? 'Click a month to list them.' : ''));
    h += panel('Leave utilisation by department', lvBars(A.by_dept, 'days', function (x) { return lvAttr({ lvpre: 'kpi_used', lvt: 'Leave used · ' + x.label, lvdept: x.label }); }, function (x) { return num(x.days) + 'd' + (x.per_head !== null ? ' · ' + x.per_head + '/head' : ''); }), 'Approved days starting in the selected period; per head = days ÷ current active headcount.');
    h += panel('Leave types distribution', lvBars(A.by_type, 'count', function (x) { return lvAttr({ lvpre: 'kpi_used', lvt: 'Leave used · ' + x.label, lvtype: x.label }); }, function (x) { return num(x.count) + 'd'; }), 'Approved days in the selected period.');
    h += panel('Pending approvals by age', lvBars(A.pending_by_age, 'count', function (x) { return lvAttr({ lvpre: 'age', lvt: 'Pending ' + x.label + ' days', lvage: x.label }); }), 'Days in the current workflow state.');
    h += panel('Approved leave calendar', lvCalendar(A.calendar), 'Employees on approved leave per day. ' + (dt ? 'Click a day to list them.' : ''));
    h += panel('Employees without current allocation', lvBars(A.no_alloc_by_dept, 'count', function (x) { return lvAttr({ lvnoalloc: x.label }); }), 'Active employees, by department. Most allocations in this system are created per leave request, so many employees have none between leaves.');
    h += '</div>';
    // directory
    h += '<div class="sh" data-lv-dir>Leave application directory</div>';
    if (dt) h += '<div class="panel"><div data-lv-list></div></div>';
    else h += '<div class="alert i">&#128274; The application directory, approval queues and employee-level leave details are available to HR Manager / HR User only. Your view shows aggregate figures.</div>';
    // data quality
    h += '<div class="sh">Leave data quality · HR review</div><div class="panel"><div class="tw"><table class="dirtable"><thead><tr><th>Issue</th><th>Severity</th><th>Records</th><th>Detail</th><th></th></tr></thead><tbody>' +
      s.dq.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td><span class="lvs ' + (x.severity === 'high' ? 'bad' : x.severity === 'medium' ? 'warn' : 'muted') + '">' + esc(x.severity) + '</span></td><td><b>' + num(x.count) + '</b></td><td class="muted">' + esc(x.extra || '') + '</td><td>' +
        (dt && x.count ? '<button class="btn s sm"' + lvAttr({ lvpre: x.preset, lvt: 'Data quality · ' + x.label }) + '>Review</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><div class="ph" style="margin-top:8px">Issues are displayed only. No historical record is changed by the dashboard; fix records in ERPNext after HR review.</div></div>';
    h += '<div class="ph">Generated ' + esc(s.meta.generated) + ' · source: Leave Application, Leave Allocation, Leave Ledger Entry, Workflow "' + esc(s.meta.workflow || '') + '". ' +
      (s.meta.unreadable && s.meta.unreadable.length ? 'Not readable: ' + esc(s.meta.unreadable.join(', ')) : '') + '</div>';
    root.innerHTML = h;
    if (dt) lvRenderList();
  }
  function lvRenderList() {
    var root = host.querySelector('[data-lv-list]'); if (!root) return;
    var L = LV.L, d = L.data, o = (LV.sum && LV.sum.options) || {};
    var active = document.activeElement, keep = active && active.dataset && active.dataset.lvf === 'search', caret = keep ? active.selectionStart : 0;
    var h = '<div class="lvhead"><b>' + esc(L.title) + '</b> <button class="btn s sm" data-export="leave">Export CSV</button>' + (L.preset || Object.keys(L.extra).length ? ' <button class="btn s sm" data-lva="clearpreset">× Show all applications</button>' : '') + '</div>';
    h += '<div class="dirbar"><label class="dsearch">Search<input type="search" data-lvf="search" placeholder="Application, employee ID or name…" value="' + esc(L.f.search) + '"></label>' +
      lvSel('department', 'Department', o.departments, L.f.department, 'All departments') +
      '<label>Employee ID<input type="text" data-lvf="employee" placeholder="exact ID" value="' + esc(L.f.employee) + '"></label>' +
      lvSel('leave_type', 'Leave type', o.leave_types, L.f.leave_type, 'All types') +
      lvSel('status', 'Application status', o.statuses, L.f.status, 'All statuses') +
      lvSel('workflow_state', 'Workflow state', o.workflow_states, L.f.workflow_state, 'All states') +
      '<label>Dates from<input type="date" data-lvf="range_from" value="' + esc(L.f.range_from) + '"></label><label>Dates to<input type="date" data-lvf="range_to" value="' + esc(L.f.range_to) + '"></label>' +
      '<button class="btn s" data-lva="clearf">Clear</button></div>';
    if (L.err) h += '<div class="alert e">' + esc(L.err) + '</div>';
    if (!d && L.busy) h += '<div class="ld">Loading leave applications…</div>';
    else if (d) {
      var from = d.total ? (d.page - 1) * d.page_length + 1 : 0, to = Math.min(d.total, d.page * d.page_length);
      h += '<div class="dirmeta"><span>' + (L.busy ? '<span class="spin"></span> Loading… ' : '') + 'Showing <b>' + from + '–' + to + '</b> of <b>' + num(d.total) + '</b> applications · <b>' + num(d.days_total) + '</b> days</span>' +
        '<label class="pl">Rows<select data-lvpl="1">' + [25, 50, 100].map(function (n) { return '<option' + (n === L.pl ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
      if (!d.rows.length) h += '<div class="empty">No leave applications match these filters.<br><button class="btn s sm" data-lva="clearf" style="margin-top:8px">Clear filters</button></div>';
      else {
        h += '<div class="tw dtw' + (L.busy ? ' dim' : '') + '"><table class="dirtable"><thead><tr>' + LV_COLS.map(function (c) {
          var on = L.sort === c[2]; return '<th class="sort' + (on ? ' on' : '') + '" data-lvsort="' + c[2] + '">' + esc(c[1]) + (on ? (L.order === 'asc' ? ' ▲' : ' ▼') : ' <span class="muted">↕</span>') + '</th>';
        }).join('') + '<th>Action</th></tr></thead><tbody>';
        d.rows.forEach(function (r) {
          var c = LV_CLS[r.cls] || ['', 'muted'];
          h += '<tr class="click" data-lvview="' + esc(r.name) + '">' + LV_COLS.map(function (col) {
            var v = r[col[0]];
            if (col[0] === 'name') return '<td class="mono">' + esc(v) + (r.note ? '<div class="lvnote">' + esc(r.note) + '</div>' : '') + '</td>';
            if (col[0] === 'employee_name') return '<td>' + esc(v || '—') + '<div class="muted mono" style="font-size:11px">' + esc(r.employee) + '</div></td>';
            if (col[0] === 'workflow_state') return '<td><span class="lvs ' + c[1] + '">' + esc(v || '—') + '</span>' + (r.docstatus === 1 && r.cls === 'pending' ? '<div class="lvnote">submitted</div>' : '') + '</td>';
            if (col[0] === 'status') return '<td>' + esc(v || '—') + (r.cls === 'conflict' ? ' <span class="lvs bad">conflict</span>' : '') + '</td>';
            if (col[0] === 'days') return '<td style="text-align:right">' + num(v) + '</td>';
            if (col[0] === 'age_label') return '<td>' + (r.age_days !== null && r.age_days > 3 ? '<span class="lvs warn">' + esc(v) + '</span>' : esc(v || '—')) + '</td>';
            return '<td>' + esc(v || '—') + '</td>';
          }).join('') + '<td style="white-space:nowrap"><button class="btn s sm" data-lvview="' + esc(r.name) + '">View</button> <a class="btn s sm" href="/app/leave-application/' + encodeURIComponent(r.name) + '" target="_blank" title="Open the ERPNext form' + (r.can_act ? ' to act (the workflow checks your role)' : '') + '">' + (r.can_act ? 'Act ↗' : 'Open ↗') + '</a></td></tr>';
        });
        h += '</tbody></table></div>';
        h += '<div class="pager"><button class="btn s sm" data-lvpage="first"' + (d.page <= 1 ? ' disabled' : '') + '>«</button><button class="btn s sm" data-lvpage="prev"' + (d.page <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
          '<span>Page <b>' + d.page + '</b> of <b>' + d.pages + '</b></span><button class="btn s sm" data-lvpage="next"' + (d.page >= d.pages ? ' disabled' : '') + '>Next ›</button><button class="btn s sm" data-lvpage="last"' + (d.page >= d.pages ? ' disabled' : '') + '>»</button></div>';
      }
      h += '<div class="ph" style="margin-top:6px">"Act ↗" opens the ERPNext form, where the existing workflow decides if your role may approve, reject or hold. The dashboard never changes applications. Approval age = days in the current pending state, or posting → final decision.</div>';
    }
    root.innerHTML = h;
    if (keep) { var inp = root.querySelector('[data-lvf="search"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(caret, caret); } catch (e) {} } }
  }
  function lvNoAlloc(dept) {
    var rowsA = ((LV.sum && LV.sum.no_alloc_rows) || []).filter(function (x) { return !dept || (x.department || '(Not set)') === dept; });
    var dlg = new AHDDialog({ title: 'Active employees without a current leave allocation' + (dept ? ' · ' + dept : '') + ' (' + rowsA.length + ')', size: 'large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    dlg.fields_dict.h.$wrapper.html(tbl([[function (x) { return '<a href="/app/employee/' + encodeURIComponent(x.employee) + '" target="_blank">' + esc(x.employee) + '</a>'; }, 'Employee'], ['employee_name', 'Name'], ['department', 'Department'],
      [function (x) { return '<a href="/app/leave-allocation?employee=' + encodeURIComponent(x.employee) + '" target="_blank">Allocations ↗</a>'; }, '']], rowsA, 'None.') +
      '<div class="text-muted small" style="margin-top:8px">No submitted Leave Allocation of any type covers today. Balances cannot be calculated for these employees.</div>');
    dlg.show();
  }
  function openLeave(name) {
    if (!name) return;
    var dlg = new AHDDialog({ title: 'Leave application ' + name, size: 'extra-large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    var $w = dlg.fields_dict.h.$wrapper; $w.html('<div class="text-muted" style="padding:30px;text-align:center">Loading leave application…</div>'); dlg.show();
    frappe.call({ method: 'admin_hr_leave_data', args: lvArgs({ mode: 'detail', name: name }), freeze: false,
      callback: function (r) {
        var m = r.message; if (!m) { $w.html('<div class="text-muted">No data.</div>'); return; }
        var a = m.application, e = m.employee, b = m.balance, rel = m.related, wf = m.workflow;
        dlg.set_title(a.name + ' · ' + (e ? e.employee_name : ''));
        var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' + pill(a.workflow_state || '—', LV_PILL[a.cls] || 'gray') + pill('Status: ' + (a.status || '—'), 'gray') +
          pill(['Draft', 'Submitted', 'Cancelled'][a.docstatus || 0], a.docstatus === 1 ? 'blue' : 'gray') + (a.conflict ? pill(a.conflict, 'red') : '') +
          '<a class="btn btn-xs btn-primary" href="/app/leave-application/' + encodeURIComponent(a.name) + '" target="_blank">' + (wf.your_actions && wf.your_actions.length ? 'Open in ERPNext to act ↗' : 'Open in ERPNext ↗') + '</a></div>';
        h += sect('A · Leave request', kv([['Leave type', a.leave_type], ['From', a.from_date], ['To', a.to_date], ['Total leave days', a.days + (a.half_day ? ' (half day ' + (a.half_day_date || '') + ')' : '')],
          ['Workflow state', a.workflow_state], ['Application status', a.status], ['Leave approver', a.approver], ['Line manager', a.line_manager], ['Replacement employee', a.replacement || '—'],
          ['Destination', a.destination], ['Re-entry date (exit/entry)', a.reentry_date], ['Posting date', a.posting_date], ['Attachment', a.attachment], ['Salary slip', a.salary_slip || '—']]) +
          (a.reason ? '<div style="margin-top:8px"><div class="text-muted small">Reason</div>' + esc(a.reason) + '</div>' : ''));
        h += sect('B · Employee', e ? kv([['Employee', e.employee_name + ' (' + e.employee + ')'], ['Company', e.company], ['Department', e.department], ['Designation', e.designation],
          ['Branch', e.branch], ['Job location', locName(e.job_location)], ['Status', e.status], ['Date of joining', e.date_of_joining], ['Employment type', e.employment_type]]) : '<div class="text-muted">Employee record not visible with your permissions.</div>',
          'ID, Iqama and passport numbers, date of birth and nationality-document fields on the application are not shown.');
        var act = wf.your_actions && wf.your_actions.length ? '<div style="margin-bottom:8px">Actions the workflow lists for your roles in this state: ' + wf.your_actions.map(function (x) { return pill(x, 'blue'); }).join(' ') + '</div>' : '';
        h += sect('C · Workflow & approval history', act + tbl([['state', 'Moved to state'], ['by', 'By'], ['on', 'On']], m.history, 'No workflow history recorded for this application.'), wf.note);
        var bh = '';
        var BS = { actual: ['Actual', 'green'], partial: ['Partial', 'orange'], no_allocation: ['No allocation', 'gray'], not_applicable: ['Not applicable', 'gray'], unavailable: ['Unavailable', 'gray'] }[b.state] || ['Unavailable', 'gray'];
        bh += '<div style="margin-bottom:8px"><b>' + esc(b.leave_type || '') + '</b> ' + pill(BS[0], BS[1]) + '</div>';
        if (b.state === 'actual' || b.state === 'partial') bh += kv([['Allocation', b.allocation], ['Allocation period', b.period], ['Allocated', b.allocated], ['Ledger credits/adjustments', b.other_credits],
          ['Approved leave used', b.approved_used], ['Deducted by pending applications (not subtracted)', b.pending_deducted], ['Balance (approved usage only)', b.balance_approved_only]]);
        bh += '<div class="text-muted small" style="margin-top:6px">' + esc(b.note || '') + (b.recorded_on_application !== null && b.recorded_on_application !== undefined ? ' Balance recorded on the application by ERPNext at entry: ' + b.recorded_on_application + '.' : '') + '</div>';
        h += sect('D · Leave allocation & balance', bh);
        var rh = '';
        if (rel.overlapping && rel.overlapping.length) rh += '<div class="alert alert-warning" style="padding:6px 10px">Overlaps with: ' + rel.overlapping.map(function (x) { return esc(x.name) + ' (' + esc(x.workflow_state || '') + ')'; }).join(', ') + '</div>';
        rh += '<div style="margin-bottom:6px"><b>Attendance in this period</b>: ' + (rel.attendance_in_period === null ? 'not readable' : counts(rel.attendance_in_period)) + '</div>';
        rh += '<div style="margin:8px 0 6px"><b>Other leave applications</b> (latest 12)</div>' + tbl([[function (x) { return '<a href="/app/leave-application/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a>'; }, 'Application'],
          ['leave_type', 'Type'], ['from_date', 'From'], ['to_date', 'To'], ['days', 'Days'], [function (x) { return pill(x.workflow_state || '—', LV_PILL[x.cls] || 'gray'); }, 'State']], rel.other_applications, 'No other applications.');
        if (rel.leave_request_forms && rel.leave_request_forms.length) rh += '<div style="margin:8px 0 6px"><b>Leave Request Forms</b></div>' + tbl([[function (x) { return '<a href="/app/leave-request-form/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a>'; }, 'Document'], ['state', 'State']], rel.leave_request_forms);
        if (e) rh += '<div style="margin-top:8px"><button class="btn btn-xs btn-default" data-lvemp="' + esc(e.employee) + '">Open employee detail panel</button></div>';
        h += sect('E · Related HR documents', rh);
        $w.html(h);
        $w.find('[data-lvemp]').on('click', function () { dlg.hide(); openEmployee(this.getAttribute('data-lvemp')); });
      },
      error: function () { $w.html('<div class="text-muted" style="padding:20px">This leave application is not available (not permitted or not found).</div>'); } });
  }
  function lvMonthRange(ym) { var d = new Date(ym + '-01T00:00:00'), e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return [ym + '-01', ym + '-' + String(e.getDate()).padStart(2, '0')]; }
  /* ---------------- Documents & Compliance tab (Phase 5) ---------------- */
  var CP = { sum: null, busy: false, err: null, seq: 0, company: '',
    L: { data: null, busy: false, err: null, seq: 0, preset: '', title: 'All required documents',
      f: { search: '', department: '', branch: '', job_location: '', doc: '', status: '', range_from: '', range_to: '' }, page: 1, pl: 25, sort: 'days', order: 'asc' } };
  var CP_COLS = [['employee', 'Employee ID', 'employee'], ['employee_name', 'Employee Name', 'employee_name'], ['company', 'Company', 'company'],
    ['department', 'Department', 'department'], ['branch', 'Branch', 'branch'], ['job_location', 'Job Location', 'job_location'],
    ['document', 'Document', 'document'], ['expiry_date', 'Expiry Date', 'expiry_date'], ['days', 'Days Remaining', 'days'], ['status_label', 'Compliance Status', 'status']];
  var CP_ST = { expired: 'bad', due_30: 'bad', due_60: 'warn', due_90: 'warn', valid: 'ok', missing: 'muted', not_required: 'muted' };
  var CP_PILL = { expired: 'red', due_30: 'red', due_60: 'orange', due_90: 'yellow', valid: 'green', missing: 'gray', not_required: 'gray' };
  var CP_DOCS = [['iqama', 'Iqama / Saudi ID'], ['passport', 'Passport'], ['contract', 'Employment Contract'], ['insurance', 'Medical Insurance']];
  var CP_STATUSES = [['expired', 'Expired'], ['due_30', 'Expiring ≤30 days'], ['due_60', 'Expiring 31–60 days'], ['due_90', 'Expiring 61–90 days'], ['valid', 'Valid (>90 days)'], ['missing', 'Missing expiry date'], ['conflict', 'Conflicting information']];
  var CP_EMPTY_F = function () { return { search: '', department: '', branch: '', job_location: '', doc: '', status: '', range_from: '', range_to: '' }; };
  function cpDt() { return CP.sum && CP.sum.meta.tier === 'detail'; }
  function cpArgs(a) { return gfArgs(Object.assign({ as_of: S.f && S.f.to_date }, a || {})); }
  function cpAttr(o) { return Object.keys(o).map(function (k) { return ' data-' + k + '="' + esc(o[k]) + '"'; }).join(''); }
  function cpLoad() {
    CP.busy = true; CP.err = null; cpRender();
    var seq = ++CP.seq;
    frappe.call({ method: 'admin_hr_compliance_data', args: cpArgs({ mode: 'summary' }), freeze: false,
      callback: function (r) { if (seq !== CP.seq) return; CP.busy = false; CP.sum = r.message || null; if (CP.sum) CP.company = CP.sum.meta.company; cpRender(); if (cpDt() && !CP.L.data) cpList(); },
      error: function () { if (seq !== CP.seq) return; CP.busy = false; CP.err = 'Could not load compliance data. You may not have permission.'; cpRender(); } });
  }
  function cpList() {
    var L = CP.L; if (!cpDt()) return;
    L.busy = true; L.err = null; cpRenderList();
    var seq = ++L.seq;
    frappe.call({ method: 'admin_hr_compliance_data', args: cpArgs(Object.assign({ mode: 'list', preset: L.preset, page: L.page, page_length: L.pl, sort_by: L.sort, sort_order: L.order }, L.f)), freeze: false,
      callback: function (r) { if (seq !== L.seq) return; L.busy = false; L.data = r.message || null; if (L.data) L.page = L.data.page; cpRenderList(); },
      error: function () { if (seq !== L.seq) return; L.busy = false; L.err = 'Could not load the compliance directory.'; cpRenderList(); } });
  }
  function cpPreset(preset, title, filters) {
    var L = CP.L; L.preset = preset || ''; L.title = title || 'All required documents'; L.page = 1;
    L.f = Object.assign(CP_EMPTY_F(), filters || {}); L.sort = 'days'; L.order = 'asc';
    cpList();
    var el = host.querySelector('[data-cp-dir]'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function cpSel(key, label, list, cur, all) {
    return '<label>' + esc(label) + '<select data-cpf="' + key + '">' + (all !== undefined ? '<option value="">' + esc(all) + '</option>' : '') +
      (list || []).map(function (x) { var v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>';
  }
  function cpBars(list, valKey, attrFn, fmt) {
    if (!list || !list.length) return '<div class="muted">No records.</div>';
    var m = 0; list.forEach(function (x) { if ((x[valKey] || 0) > m) m = x[valKey] || 0; });
    var dt = cpDt();
    return '<div class="lvbars">' + list.slice(0, 40).map(function (x) {
      var w = m ? Math.max(2, Math.round((x[valKey] || 0) / m * 100)) : 0, at = dt && attrFn ? attrFn(x) : '';
      return '<div class="lvbr' + (at ? ' click' : '') + '"' + at + ' title="' + esc(x.label) + '"><span class="lvbl">' + esc(x.label) + '</span><span class="lvbt"><span style="width:' + w + '%"></span></span><span class="lvbv">' + (fmt ? fmt(x) : num(x[valKey])) + '</span></div>';
    }).join('') + '</div>';
  }
  function cpCard(k) {
    var dt = cpDt() && k.preset, unitEmp = k.unit === 'employees';
    return '<div class="card' + (dt ? ' click' : '') + '"' + (dt ? cpAttr({ cppre: k.preset, cpt: k.label }) : '') + '><div class="lb"><span>' + esc(k.label) + '</span>' + badge(k.value === null ? 'unavailable' : 'actual') + '</div>' +
      '<div class="v">' + num(k.value) + ' <span class="cpunit">' + (unitEmp ? 'employees' : 'documents') + '</span></div>' +
      (!unitEmp ? '<div class="sub"><b>' + num(k.employees) + '</b> employees affected</div>' : '') + (k.sub ? '<div class="sub">' + esc(k.sub) + '</div>' : '') +
      '<div class="nt" title="' + esc(k.basis) + '">' + esc(k.basis) + '</div>' + (dt ? '<div class="ft">View records &rarr;</div>' : (!cpDt() && k.preset !== null && k.key !== 'active' ? '<div class="ft muted">&#128274; Details: HR Manager / HR User</div>' : '')) + '</div>';
  }
  function cpCat(c, letter) {
    var dt = cpDt();
    function chip(lbl, val, st, cls) {
      var a = dt && val ? cpAttr(st === 'conflict' ? { cppre: '', cpt: c.label + ' · ' + lbl, cpdoc: c.key, cpst: 'conflict' } : { cppre: '', cpt: c.label + ' · ' + lbl, cpdoc: c.key, cpst: st }) : '';
      return '<div class="cpchip ' + cls + (a ? ' click' : '') + '"' + a + '><b>' + num(val) + '</b><span>' + esc(lbl) + '</span></div>';
    }
    return '<div class="panel"><div class="cppt">' + letter + ' · ' + esc(c.label) + ' <span class="muted" style="font-weight:400">· ' + esc(c.field) + (c.secondary ? ' (compared with ' + esc(c.secondary) + ')' : c.key === 'insurance' ? ' (compared with insurance_status)' : '') + '</span></div>' +
      '<div class="cpchips">' + chip('Valid', c.valid, 'valid', 'ok') + chip('Expired', c.expired, 'expired', 'bad') + chip('≤30 days', c.due_30, 'due_30', 'bad') + chip('31–60 days', c.due_60, 'due_60', 'warn') +
      chip('61–90 days', c.due_90, 'due_90', 'warn') + chip('Missing date', c.missing, 'missing', 'muted') + chip('Conflicting', c.conflict, 'conflict', 'bad') + '</div>' +
      '<div class="cpbar" title="Complete & current: ' + c.completion_pct + '%"><span style="width:' + c.completion_pct + '%"></span></div>' +
      '<div class="ph">' + c.completion_pct + '% of ' + c.required + ' required records have a current, non-conflicting date · ' + c.attached + ' with a copy attached' + (c.not_required ? ' · ' + c.not_required + ' Saudi nationals: not required' : '') + '</div></div>';
  }
  function cpForecast(fc, overdue) {
    var cols = [['iqama', '#2563eb'], ['passport', '#7c3aed'], ['contract', '#0891b2'], ['insurance', '#f59e0b']], m = overdue || 0;
    fc.forEach(function (x) { var t = x.iqama + x.passport + x.contract + x.insurance; if (t > m) m = t; });
    var dt = cpDt();
    var h = '<div class="lvmc"><div class="lvmcol' + (dt && overdue ? ' click' : '') + '"' + (dt && overdue ? cpAttr({ cppre: 'st_expired', cpt: 'Expired documents' }) : '') + ' title="Already expired: ' + overdue + '"><div class="lvmv">' + num(overdue) + '</div><div class="lvmbar"><span style="height:' + (m ? Math.round(overdue / m * 100) : 0) + '%;background:#dc2626;display:block"></span></div><div class="lvml">Overdue</div></div>';
    fc.forEach(function (x) {
      var t = x.iqama + x.passport + x.contract + x.insurance, mr = x.month;
      var last = new Date(parseInt(mr.slice(0, 4), 10), parseInt(mr.slice(5, 7), 10), 0).getDate();
      h += '<div class="lvmcol' + (dt && t ? ' click' : '') + '"' + (dt && t ? cpAttr({ cppre: '', cpt: 'Expiring in ' + mr, cpfrom: (CP.sum && mr === CP.sum.meta.today.slice(0, 7) ? CP.sum.meta.today : mr + '-01'), cpto: mr + '-' + String(last).padStart(2, '0') }) : '') + ' title="' + esc(mr + ': ' + cols.map(function (c) { return c[0] + ' ' + x[c[0]]; }).join(', ')) + '"><div class="lvmv">' + (t || '') + '</div><div class="lvmbar">' +
        cols.map(function (c) { return '<span style="height:' + (m ? Math.round(x[c[0]] / m * 100) : 0) + '%;background:' + c[1] + ';display:block"></span>'; }).join('') + '</div><div class="lvml">' + esc(mr.slice(2)) + '</div></div>';
    });
    return h + '</div><div class="lvlegend">' + [['Iqama/ID', '#2563eb'], ['Passport', '#7c3aed'], ['Contract', '#0891b2'], ['Insurance', '#f59e0b'], ['Already expired', '#dc2626']].map(function (c) { return '<span><i style="background:' + c[1] + '"></i>' + c[0] + '</span>'; }).join('') + '</div>';
  }
  function vCompliance(d) { return '<div data-cp-root></div>'; }
  function cpAfterRender() { if (!CP.sum && !CP.busy) cpLoad(); else cpRender(); }
  function cpRender() {
    var root = host.querySelector('[data-cp-root]'); if (!root) return;
    var s = CP.sum, h = '', comps = (s && s.meta.companies) || (S.d && S.d.meta.companies) || [];
    h += scopeLine('compliance') + '<div class="dirbar lvperiod">' +
      '<button class="btn s" data-cpa="refresh">Refresh</button>' + (CP.busy ? '<span class="muted"><span class="spin"></span> Loading…</span>' : '') +
      '<span class="muted" style="align-self:center">Active employees only · as of ' + esc(s ? s.meta.today : '') + '</span></div>';
    if (CP.err) h += '<div class="alert e">' + esc(CP.err) + '</div>';
    if (!s) { root.innerHTML = h + (CP.busy ? '<div class="ld">Loading compliance data…</div>' : ''); return; }
    var dt = cpDt(), id = s.identity;
    h += '<div class="sh">Compliance overview</div><div class="grid kpi-row compliance-kpi-row" style="--cols:' + Math.max(1, s.kpis.length) + '">' + s.kpis.map(cpCard).join('') + '</div>';
    h += '<div class="ph">Document counts: ' + num(id.documents) + ' required documents = ' + num(id.valid) + ' valid + ' + num(id.within_90) + ' expiring within 90 days + ' + num(id.expired) + ' expired + ' + num(id.missing) + ' missing ' + (id.check ? '✓' : '✗') +
      '. The 30/60/90-day cards are cumulative windows. Employee counts are distinct people; an employee with several affected documents is counted once. ' + esc(s.rules.buckets) + '.</div>';
    h += '<div class="sh">Document categories</div><div class="g2">' + s.categories.map(function (c, i) { return cpCat(c, 'ABCD'[i]); }).join('') + '</div>';
    var A = s.analytics, C = A.completion;
    h += '<div class="sh">Compliance analytics</div><div class="g2 analytics-row compliance-analytics-row" style="--cols:6">';
    h += panel('Expiry forecast by month', cpForecast(A.forecast, A.overdue_now), 'Required documents expiring per month (next 12 months). ' + (dt ? 'Click a month to list them.' : ''));
    h += panel('Expired / expiring ≤90 days by department', cpBars(A.by_department, 'count', function (x) { return cpAttr({ cppre: 'attention', cpt: 'Needs attention · ' + x.label, cpdept: x.label }); }, function (x) { return x.expired + ' exp · ' + x.due + ' due'; }));
    h += panel('Expired / expiring ≤90 days by branch', cpBars(A.by_branch, 'count', function (x) { return cpAttr({ cppre: 'attention', cpt: 'Needs attention · ' + x.label, cpbranch: x.label }); }, function (x) { return x.expired + ' exp · ' + x.due + ' due'; }));
    h += panel('Document status distribution', cpBars(A.distribution, 'count', function (x) { return x.key === 'not_required' ? '' : cpAttr({ cppre: '', cpt: x.label, cpst: x.key }); }), 'All tracked documents, including Saudi passports marked not required.');
    h += panel('Compliance completion', '<div class="cpcomp"><div><b>' + C.documents_pct + '%</b><span>documents current &amp; consistent<br>' + num(C.documents_ok) + ' of ' + num(C.documents) + '</span></div><div><b>' + C.employees_pct + '%</b><span>employees with no issue<br>' + num(C.employees_ok) + ' of ' + num(C.employees) + '</span></div></div>' +
      cpBars(s.categories.map(function (c) { return { label: c.label, pct: c.completion_pct }; }), 'pct', null, function (x) { return x.pct + '%'; }), '"Current" = has a primary date that is not expired and does not conflict with the secondary field.');
    h += panel('Employees by number of documents with issues', cpBars(A.multi_issue.map(function (x) { return { label: x.label + (x.label === '1' ? ' document' : ' documents'), count: x.count, raw: x.label }; }), 'count', function (x) { return x.raw === '0' ? '' : cpAttr({ cppre: x.raw === '1' ? 'emp_issues' : 'multi', cpt: x.raw === '1' ? 'Employees with compliance issues' : 'Employees with 2+ documents affected' }); }), 'Issue = expired, expiring ≤60 days, missing or conflicting.');
    h += '</div>';
    h += '<div class="sh" data-cp-dir>Compliance directory</div>';
    if (dt) h += '<div class="panel"><div data-cp-list></div></div>';
    else h += '<div class="alert i">&#128274; The compliance directory and employee-level details are available to HR Manager / HR User only. Your view shows aggregate figures.</div>';
    h += '<div class="sh">Compliance data quality · HR review queue</div><div class="panel"><div class="tw"><table class="dirtable"><thead><tr><th>Issue</th><th>Severity</th><th>Records</th><th></th></tr></thead><tbody>' +
      s.dq.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td><span class="lvs ' + (x.severity === 'high' ? 'bad' : x.severity === 'medium' ? 'warn' : 'muted') + '">' + esc(x.severity) + '</span></td><td><b>' + num(x.count) + '</b></td><td>' +
        (dt && x.count ? '<button class="btn s sm"' + cpAttr({ cppre: x.preset, cpt: 'Data quality · ' + x.label }) + '>Review</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><div class="ph" style="margin-top:8px">Displayed only. No Employee field is overwritten by the dashboard. Duplicate checks compare ID numbers on the server; the numbers themselves are never sent to the browser.</div></div>';
    // alerts
    var al = s.alerts;
    h += '<div class="sh">Expiry alerts</div><div class="g2">';
    h += panel('Existing notifications (Employee)', '<div class="tw"><table class="dirtable"><thead><tr><th>Notification</th><th>Field</th><th>Timing</th><th>Recipients</th><th>Status</th></tr></thead><tbody>' +
      (s.notifications || []).map(function (n) { return '<tr><td>' + esc(n.name) + '</td><td class="mono">' + esc(n.field || '') + '</td><td>' + esc((n.days || 0) + ' days ' + (n.event === 'Days Before' ? 'before' : 'after')) + '</td><td>' + esc(n.recipients || '—') + (n.has_condition ? '' : '<div class="lvnote">no condition (also Left employees)</div>') + '</td><td><span class="lvs ' + (n.enabled ? 'ok' : 'muted') + '">' + (n.enabled ? 'Enabled' : 'Disabled') + '</span></td></tr>'; }).join('') +
      '</tbody></table></div>', 'Read-only view of ERPNext Notification settings. Nothing is enabled or changed from the dashboard.');
    h += panel('Threshold preview (documents per alert window)', '<div class="tw"><table class="dirtable"><thead><tr><th>Document</th><th>Expired</th><th>0–7</th><th>8–15</th><th>16–30</th><th>31–60</th><th>61–90</th></tr></thead><tbody>' +
      al.map(function (a) { return '<tr><td>' + esc(a.label) + '</td>' + ['expired', 'd0_7', 'd8_15', 'd16_30', 'd31_60', 'd61_90'].map(function (k) { return '<td style="text-align:right">' + (a[k] ? '<b>' + a[k] + '</b>' : '<span class="muted">0</span>') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>', 'How many documents would fall into each proposed 90 / 60 / 30 / 15 / 7 / expired window today. Proposed alerts await HR approval; none are active from this dashboard.');
    h += '</div><div class="ph">Generated ' + esc(s.meta.generated) + ' · source: Employee (active), Notification, Qiwa contract renewal request.</div>';
    root.innerHTML = h;
    if (dt) cpRenderList();
  }
  function cpRenderList() {
    var root = host.querySelector('[data-cp-list]'); if (!root) return;
    var L = CP.L, d = L.data, o = (CP.sum && CP.sum.options) || {};
    var active = document.activeElement, keep = active && active.dataset && active.dataset.cpf === 'search', caret = keep ? active.selectionStart : 0;
    var h = '<div class="lvhead"><b>' + esc(L.title) + '</b> <button class="btn s sm" data-export="cp">Export CSV</button>' + (L.preset ? ' <button class="btn s sm" data-cpa="clearpreset">× Show all documents</button>' : '') + '</div>';
    h += '<div class="dirbar"><label class="dsearch">Employee search<input type="search" data-cpf="search" placeholder="Employee ID or name…" value="' + esc(L.f.search) + '"></label>' +
      cpSel('department', 'Department', o.department, L.f.department, 'All departments') + cpSel('branch', 'Branch', o.branch, L.f.branch, 'All branches') +
      cpSel('job_location', 'Job location', locPairs(o.job_location), L.f.job_location, 'All locations') + cpSel('doc', 'Document type', CP_DOCS, L.f.doc, 'All documents') +
      cpSel('status', 'Compliance status', CP_STATUSES, L.f.status, 'All statuses') +
      '<label>Expiry from<input type="date" data-cpf="range_from" value="' + esc(L.f.range_from) + '"></label><label>Expiry to<input type="date" data-cpf="range_to" value="' + esc(L.f.range_to) + '"></label>' +
      '<button class="btn s" data-cpa="clearf">Clear</button></div>';
    if (L.err) h += '<div class="alert e">' + esc(L.err) + '</div>';
    if (!d && L.busy) h += '<div class="ld">Loading documents…</div>';
    else if (d) {
      var from = d.total ? (d.page - 1) * d.page_length + 1 : 0, to = Math.min(d.total, d.page * d.page_length);
      h += '<div class="dirmeta"><span>' + (L.busy ? '<span class="spin"></span> Loading… ' : '') + 'Showing <b>' + from + '–' + to + '</b> of <b>' + num(d.total) + '</b> documents · <b>' + num(d.employees) + '</b> employees</span>' +
        '<label class="pl">Rows<select data-cppl="1">' + [25, 50, 100].map(function (n) { return '<option' + (n === L.pl ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
      if (!d.rows.length) h += '<div class="empty">No documents match these filters.<br><button class="btn s sm" data-cpa="clearf" style="margin-top:8px">Clear filters</button></div>';
      else {
        h += '<div class="tw dtw' + (L.busy ? ' dim' : '') + '"><table class="dirtable"><thead><tr>' + CP_COLS.map(function (c) {
          var on = L.sort === c[2]; return '<th class="sort' + (on ? ' on' : '') + '" data-cpsort="' + c[2] + '">' + esc(c[1]) + (on ? (L.order === 'asc' ? ' ▲' : ' ▼') : ' <span class="muted">↕</span>') + '</th>';
        }).join('') + '<th>Action</th></tr></thead><tbody>';
        d.rows.forEach(function (r) {
          h += '<tr class="click" data-cpview="' + esc(r.employee) + '" data-cpd="' + esc(r.doc) + '">' + CP_COLS.map(function (col) {
            var v = r[col[0]];
            if (col[0] === 'employee') return '<td class="mono">' + esc(v) + '</td>';
            if (col[0] === 'job_location') return '<td>' + esc(v ? locName(v) : '—') + '</td>';
            if (col[0] === 'days') return '<td style="text-align:right">' + (v === null ? '—' : num(v)) + '</td>';
            if (col[0] === 'status_label') return '<td><span class="lvs ' + (CP_ST[r.status] || 'muted') + '">' + esc(v) + '</span>' + (r.conflict ? '<div class="lvnote">⚠ ' + esc(r.conflict) + '</div>' : '') + (r.unusual ? '<div class="lvnote">⚠ ' + esc(r.unusual) + '</div>' : '') + (r.note && r.note !== r.conflict && r.note !== r.unusual ? '<div class="lvnote">' + esc(r.note) + '</div>' : '') + '</td>';
            return '<td>' + esc(v || '—') + '</td>';
          }).join('') + '<td style="white-space:nowrap"><button class="btn s sm" data-cpview="' + esc(r.employee) + '" data-cpd="' + esc(r.doc) + '">View</button> <a class="btn s sm" href="/app/employee/' + encodeURIComponent(r.employee) + '" target="_blank">Employee ↗</a></td></tr>';
        });
        h += '</tbody></table></div>';
        h += '<div class="pager"><button class="btn s sm" data-cppage="first"' + (d.page <= 1 ? ' disabled' : '') + '>«</button><button class="btn s sm" data-cppage="prev"' + (d.page <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
          '<span>Page <b>' + d.page + '</b> of <b>' + d.pages + '</b></span><button class="btn s sm" data-cppage="next"' + (d.page >= d.pages ? ' disabled' : '') + '>Next ›</button><button class="btn s sm" data-cppage="last"' + (d.page >= d.pages ? ' disabled' : '') + '>»</button></div>';
      }
      h += '<div class="ph" style="margin-top:6px">One row per employee document. Saudi passports (not required) are excluded. Results respect your ERPNext and Employee User Permissions. Renewals are done in ERPNext; the dashboard never edits Employee records.</div>';
    }
    root.innerHTML = h;
    if (keep) { var inp = root.querySelector('[data-cpf="search"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(caret, caret); } catch (e) {} } }
  }
  function openCompliance(emp, focusDoc) {
    if (!emp) return;
    var dlg = new AHDDialog({ title: 'Employee compliance', size: 'extra-large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    var $w = dlg.fields_dict.h.$wrapper; $w.html('<div class="text-muted" style="padding:30px;text-align:center">Loading compliance details…</div>'); dlg.show();
    frappe.call({ method: 'admin_hr_compliance_data', args: cpArgs({ mode: 'detail', employee: emp }), freeze: false,
      callback: function (r) {
        var m = r.message; if (!m) { $w.html('<div class="text-muted">No data.</div>'); return; }
        var b = m.basic;
        dlg.set_title(b.employee_name + ' · ' + b.employee);
        var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' + pill(b.status, b.status === 'Active' ? 'green' : 'gray') + (b.nationality ? pill(b.nationality, 'blue') : '') +
          '<a class="btn btn-xs btn-default" href="/app/employee/' + encodeURIComponent(b.employee) + '" target="_blank">Open Employee record ↗</a></div>';
        h += sect('A · Employee', kv([['Employee', b.employee_name + ' (' + b.employee + ')'], ['Company', b.company], ['Department', b.department], ['Designation', b.designation],
          ['Branch', b.branch], ['Job location', locName(b.job_location)], ['Nationality', b.nationality], ['Date of joining', b.date_of_joining], ['Employment type', b.employment_type]]));
        h += sect('B · Documents', tbl([[function (x) { return (x.doc === focusDoc ? '▶ ' : '') + esc(x.document); }, 'Document'],
          [function (x) { return '<span class="text-muted small">' + esc(x.primary_field) + '</span><br><b>' + esc(x.expiry_date || '—') + '</b>'; }, 'Verified expiry (primary)'],
          [function (x) { return x.days === null ? '—' : String(x.days); }, 'Days left'],
          [function (x) { return pill(x.status_label, CP_PILL[x.status] || 'gray'); }, 'Status'],
          [function (x) { return x.secondary_field ? '<span class="text-muted small">' + esc(x.secondary_field) + '</span><br>' + esc(x.secondary_value || '—') : '—'; }, 'Secondary field'],
          [function (x) { return (x.conflict ? '<div style="color:var(--red-600,#b91c1c)">' + esc(x.conflict) + '</div>' : '') + (x.unusual ? '<div style="color:var(--orange-600,#c2410c)">' + esc(x.unusual) + '</div>' : '') + (!x.conflict && !x.unusual ? '<span class="text-muted">—</span>' : ''); }, 'Checks'],
          [function (x) { return esc(x.attached) + (x.provider ? '<br><span class="text-muted small">Provider: ' + esc(x.provider) + (x.provided_by ? ' · by ' + esc(x.provided_by) : '') + '</span>' : '') + (x.contract_type ? '<br><span class="text-muted small">' + esc(x.contract_type) + '</span>' : ''); }, 'Copy / details']], m.documents), m.note);
        var rn = m.renewals;
        h += sect('C · Renewal requests', rn.qiwa === null ? '<div class="text-muted">Qiwa contract renewal requests not readable with your permissions.</div>' :
          tbl([[function (x) { return '<a href="/app/qiwa-contract-renewal-request/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a>'; }, 'Qiwa renewal request'], ['state', 'State'], ['contract_end_date', 'Contract end'], ['created', 'Created']], rn.qiwa, 'No Qiwa contract renewal request for this employee.'), rn.note);
        var rl = m.related, rh = '';
        rh += '<div style="margin-bottom:6px"><b>Health insurance provider record</b>: ' + (rl.health_insurance_provider ? '<a href="/app/employee-health-insurance/' + encodeURIComponent(rl.health_insurance_provider) + '" target="_blank">' + esc(rl.health_insurance_provider) + '</a>' : '—') + '</div>';
        rh += '<div style="margin-bottom:6px"><b>Employee Clearance</b>: ' + (rl.clearance === null ? 'not readable' : rl.clearance.length ? rl.clearance.map(function (x) { return '<a href="/app/employee-clearance/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a> (' + esc(x.state) + ')'; }).join(', ') : 'none') + '</div>';
        rh += '<div style="margin-bottom:6px"><b>Resignation Letter</b>: ' + (rl.resignation === null ? 'not readable' : rl.resignation.length ? rl.resignation.map(function (x) { return '<a href="/app/resignation-letter/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a> (' + esc(x.state) + ')'; }).join(', ') : 'none') + '</div>';
        rh += '<div style="margin-top:8px"><button class="btn btn-xs btn-default" data-cpemp="' + esc(b.employee) + '">Open full employee detail panel</button></div>';
        h += sect('D · Related ERPNext records', rh);
        $w.html(h);
        $w.find('[data-cpemp]').on('click', function () { dlg.hide(); openEmployee(this.getAttribute('data-cpemp')); });
      },
      error: function () { $w.html('<div class="text-muted" style="padding:20px">Compliance details are not available for this employee (not permitted or not found).</div>'); } });
  }
  /* ---------------- Training tab (Phase 6) ---------------- */
  var TR = { sum: null, busy: false, err: null, seq: 0, company: '',
    L: { data: null, busy: false, err: null, seq: 0, preset: '', title: 'All training assignments', f: null, page: 1, pl: 25, sort: 'due_date', order: 'asc' } };
  var TR_EMPTY_F = function () { return { search: '', department: '', designation: '', employee: '', item: '', mandatory: '', status: '', timing: '', date_field: 'assigned_date', range_from: '', range_to: '' }; };
  TR.L.f = TR_EMPTY_F();
  var TR_COLS = [['employee', 'Employee ID', 'employee'], ['employee_name', 'Employee Name', 'employee_name'], ['company', 'Company', 'company'],
    ['department', 'Department', 'department'], ['designation', 'Designation', 'designation'], ['title', 'Training Video / Course', 'title'],
    ['mandatory', 'Mandatory', 'mandatory'], ['assigned_date', 'Assigned', 'assigned_date'], ['due_date', 'Due', 'due_date'], ['started_on', 'Started', 'started_on'],
    ['completed_on', 'Completed', 'completed_on'], ['status', 'Status', 'status'], ['progress', 'Progress', 'progress']];
  var TR_ST = { 'Completed': 'ok', 'In Progress': 'warn', 'Not Started': 'muted', 'Not assigned': 'bad', 'No user': 'muted' };
  var TR_PILL = { 'Completed': 'green', 'In Progress': 'orange', 'Not Started': 'gray' };
  function trDt() { return TR.sum && TR.sum.meta.tier === 'detail'; }
  function trArgs(a) { return gfArgs(a); }
  function trAttr(o) { return Object.keys(o).map(function (k) { return ' data-' + k + '="' + esc(o[k]) + '"'; }).join(''); }
  function trLoad() {
    TR.busy = true; TR.err = null; trRender();
    var seq = ++TR.seq;
    frappe.call({ method: 'admin_hr_training_data', args: trArgs({ mode: 'summary' }), freeze: false,
      callback: function (r) { if (seq !== TR.seq) return; TR.busy = false; TR.sum = r.message || null; if (TR.sum) TR.company = TR.sum.meta.company; trRender(); if (trDt() && !TR.L.data) trList(); },
      error: function () { if (seq !== TR.seq) return; TR.busy = false; TR.err = 'Could not load training data. You may not have permission.'; trRender(); } });
  }
  function trList() {
    var L = TR.L; if (!trDt()) return;
    L.busy = true; L.err = null; trRenderList();
    var seq = ++L.seq;
    frappe.call({ method: 'admin_hr_training_data', args: trArgs(Object.assign({ mode: 'list', preset: L.preset, page: L.page, page_length: L.pl, sort_by: L.sort, sort_order: L.order }, L.f)), freeze: false,
      callback: function (r) { if (seq !== L.seq) return; L.busy = false; L.data = r.message || null; if (L.data) L.page = L.data.page; trRenderList(); },
      error: function () { if (seq !== L.seq) return; L.busy = false; L.err = 'Could not load training assignments.'; trRenderList(); } });
  }
  function trPreset(preset, title, filters) {
    var L = TR.L; L.preset = preset || ''; L.title = title || 'All training assignments'; L.page = 1;
    L.f = Object.assign(TR_EMPTY_F(), filters || {}); L.sort = 'due_date'; L.order = 'asc';
    trList();
    var el = host.querySelector('[data-tr-dir]'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function trSel(key, label, list, cur, all) {
    return '<label>' + esc(label) + '<select data-trf="' + key + '">' + (all !== undefined ? '<option value="">' + esc(all) + '</option>' : '') +
      (list || []).map(function (x) { var v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>';
  }
  function trBars(list, valKey, attrFn, fmt) {
    if (!list || !list.length) return '<div class="muted">No records.</div>';
    var m = 0; list.forEach(function (x) { if ((x[valKey] || 0) > m) m = x[valKey] || 0; });
    var dt = trDt();
    return '<div class="lvbars">' + list.slice(0, 40).map(function (x) {
      var w = !x.suppressed && m ? Math.max(2, Math.round((x[valKey] || 0) / m * 100)) : 0, at = dt && !x.suppressed && attrFn ? attrFn(x) : '';
      return '<div class="lvbr' + (at ? ' click' : '') + '"' + at + ' title="' + esc(x.label) + '"><span class="lvbl">' + esc(x.label) + '</span><span class="lvbt"><span style="width:' + w + '%"></span></span><span class="lvbv">' + (x.suppressed ? '&lt;3' : fmt ? fmt(x) : num(x[valKey])) + '</span></div>';
    }).join('') + '</div>';
  }
  function trPctBars(list, attrFn) {
    if (!list || !list.length) return '<div class="muted">No records.</div>';
    var dt = trDt();
    return '<div class="lvbars">' + list.slice(0, 40).map(function (x) {
      var at = dt && !x.suppressed && attrFn ? attrFn(x) : '', p = x.pct || 0;
      return '<div class="lvbr' + (at ? ' click' : '') + '"' + at + ' title="' + esc(x.label) + '"><span class="lvbl">' + esc(x.label) + '</span><span class="lvbt"><span style="width:' + (x.suppressed ? 0 : Math.max(p ? 2 : 0, p)) + '%;background:' + (p >= 80 ? '#16a34a' : p >= 50 ? '#f59e0b' : '#dc2626') + '"></span></span><span class="lvbv">' + (x.suppressed ? '&lt;3' : x.pct == null ? '—' : p + '%') + ' <span class="muted">(' + (x.suppressed ? 'hidden' : x.done + '/' + x.total) + ')</span></span></div>';
    }).join('') + '</div>';
  }
  function trCard(k) {
    var dt = trDt() && k.preset, unit = k.unit === '%' ? '' : k.unit;
    return '<div class="card' + (dt ? ' click' : '') + '"' + (dt ? trAttr({ trpre: k.preset === 'all' ? '' : k.preset, trt: k.label }) : '') + '><div class="lb"><span>' + esc(k.label) + '</span>' + badge(k.value === null ? 'unavailable' : k.state) + '</div>' +
      (k.value === null ? '<div class="v na">Not available</div>' : '<div class="v">' + num(k.value) + (k.unit === '%' ? '%' : ' <span class="cpunit">' + esc(unit) + '</span>') + '</div>') +
      (k.sub ? '<div class="sub">' + esc(k.sub) + '</div>' : '') + '<div class="nt" title="' + esc(k.basis) + '">' + esc(k.basis) + '</div>' +
      (dt ? '<div class="ft">View assignments &rarr;</div>' : (!trDt() && k.preset ? '<div class="ft muted">&#128274; Details: HR Manager / HR User</div>' : '')) + '</div>';
  }
  function trTrend(list) {
    var m = 0; list.forEach(function (x) { if (x.completed > m) m = x.completed; if (x.assigned > m) m = x.assigned; });
    var dt = trDt();
    return '<div class="lvmc">' + list.map(function (x) {
      var last = new Date(parseInt(x.month.slice(0, 4), 10), parseInt(x.month.slice(5, 7), 10), 0).getDate();
      var at = dt && x.completed ? trAttr({ trpre: 'st_Completed', trt: 'Completed in ' + x.month, trdf: 'completed_on', trfrom: x.month + '-01', trto: x.month + '-' + String(last).padStart(2, '0') }) : '';
      return '<div class="lvmcol' + (at ? ' click' : '') + '"' + at + ' title="' + esc(x.month + ': ' + x.assigned + ' assigned, ' + x.completed + ' completed') + '"><div class="lvmv">' + (x.completed || '') + '</div>' +
        '<div class="lvmbar" style="flex-direction:row;align-items:flex-end;gap:2px"><span style="width:45%;height:' + (m ? Math.round(x.assigned / m * 100) : 0) + '%;background:#94a3b8;display:block"></span><span style="width:45%;height:' + (m ? Math.round(x.completed / m * 100) : 0) + '%;background:#16a34a;display:block"></span></div><div class="lvml">' + esc(x.month.slice(5)) + '</div></div>';
    }).join('') + '</div><div class="lvlegend"><span><i style="background:#94a3b8"></i>Assigned</span><span><i style="background:#16a34a"></i>Completed</span></div>';
  }
  function vTraining(d) { return '<div data-tr-root></div>'; }
  function trAfterRender() { if (!TR.sum && !TR.busy) trLoad(); else trRender(); }
  function trRender() {
    var root = host.querySelector('[data-tr-root]'); if (!root) return;
    var s = TR.sum, h = '', comps = (s && s.meta.companies) || (S.d && S.d.meta.companies) || [];
    h += scopeLine('training') + '<div class="dirbar lvperiod">' +
      '<button class="btn s" data-tra="refresh">Refresh</button>' + (TR.busy ? '<span class="muted"><span class="spin"></span> Loading…</span>' : '') +
      '<a class="btn s" href="/app/training-dashboard" target="_blank">Training Dashboard ↗</a><a class="btn s" href="/app/my-training" target="_blank">My Training ↗</a><a class="btn s" href="/app/training-video" target="_blank">Manage videos ↗</a></div>';
    if (TR.err) h += '<div class="alert e">' + esc(TR.err) + '</div>';
    if (!s) { root.innerHTML = h + (TR.busy ? '<div class="ld">Loading training data…</div>' : '<div class="alert i">Training data is unavailable. Check the admin_hr_training_data API.</div>'); return; }
    var dt = trDt(), A = s.analytics, K = s.kpis;
    if (!A || !Array.isArray(K)) { root.innerHTML = h + '<div class="alert e">Training API response is missing analytics or kpis. Check admin_hr_training_data.</div>'; return; }
    h += '<div class="sh">Training overview</div><div class="grid kpi-row training-kpi-row" style="--cols:' + Math.max(1, K.length) + '">' + K.map(trCard).join('') + '</div>';
    h += '<div class="ph">Counts are labelled videos, courses, employees or assignments. One assignment = one employee × one video or course. ' + esc(s.notes.overdue) + ' ' + esc(s.notes.progress) + ' ' + esc(s.assessments.note) + '</div>';
    h += '<div class="sh">Training analytics</div><div class="g2 analytics-row training-analytics-row" style="--cols:6">';
    h += panel('Completion by department', trPctBars(A.by_department, function (x) { return trAttr({ trpre: '', trt: 'Department · ' + x.label, trdept: x.label }); }), 'Completed ÷ assignments.');
    h += panel('Completion by designation', trPctBars(A.by_designation, function (x) { return trAttr({ trpre: '', trt: 'Designation · ' + x.label, trdesig: x.label }); }));
    h += panel('Monthly assignments and completions', trTrend(A.trend), 'By assigned date and completion date (12 months). Training records start in October 2026.');
    h += panel('Mandatory training compliance', trPctBars(A.mandatory_items, function (x) { return trAttr({ trpre: 'mand_incomplete', trt: 'Incomplete · ' + x.label, tritem: 'video:' + x.item }); }) +
      '<div class="ph" style="margin-top:8px"><b>' + num(A.mandatory_incomplete_employees) + '</b> employees have incomplete mandatory training. ' + (dt ? '<button class="btn s sm"' + trAttr({ trpre: 'mand_incomplete', trt: 'Incomplete mandatory training' }) + '>List them</button>' : '') + '</div>');
    h += panel('Overdue training by department', A.overdue_by_department.length ? trBars(A.overdue_by_department, 'overdue', function (x) { return trAttr({ trpre: 'overdue', trt: 'Overdue · ' + x.label, trdept: x.label }); }) : '<div class="muted">Nothing overdue.</div>');
    h += panel('Most assigned videos and courses', trBars(A.most_assigned, 'count', function (x) { return trAttr({ trpre: '', trt: x.label, tritem: x.kind + ':' + x.item }); }, function (x) { return x.count + ' · ' + x.done + ' done' + (x.mandatory ? ' · mandatory' : ''); }));
    h += '</div>';
    h += '<div class="sh" data-tr-dir>Training directory</div>';
    if (dt) h += '<div class="panel"><div data-tr-list></div></div>';
    else h += '<div class="alert i">&#128274; The training directory and employee training details are available to HR Manager / HR User only. Employees see their own training in My Training. Your view shows aggregate figures.</div>';
    // catalog + eligibility
    var cat = s.catalog;
    h += '<div class="sh">Training catalogue</div><div class="g2">';
    h += panel('Training videos', '<div class="tw"><table class="dirtable"><thead><tr><th>Video</th><th>Category</th><th>Type</th><th>Days to complete</th><th>Assigned</th><th>Status</th></tr></thead><tbody>' +
      cat.videos.map(function (v) { return '<tr><td><a href="/app/training-video/' + encodeURIComponent(v.name) + '" target="_blank">' + esc(v.title || v.name) + '</a></td><td>' + esc(v.category || '—') + '</td><td><span class="lvs ' + (v.mandatory ? 'bad' : 'muted') + '">' + (v.mandatory ? 'Mandatory' : 'Optional') + '</span></td><td>' + esc(v.completion_days || '—') + '</td><td>' + num(v.assigned) + '</td><td>' + (v.active ? 'Active' : 'Inactive') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (cat.courses.length ? '' : '<div class="ph" style="margin-top:6px">No Training Course has been created, so course metrics are 0 (not missing).</div>'));
    h += panel('Mandatory assignment rule check', s.eligibility.length ? '<div class="tw"><table class="dirtable"><thead><tr><th>Video</th><th>Rule</th><th>Eligible</th><th>Assigned</th><th>Eligible, not assigned</th><th>Assigned, not eligible</th></tr></thead><tbody>' +
      s.eligibility.map(function (x) { return '<tr><td>' + esc(x.title) + '</td><td>' + esc(x.rule) + '</td><td>' + num(x.eligible) + '</td><td>' + num(x.assigned) + '</td><td>' + (x.eligible_not_assigned ? '<b>' + x.eligible_not_assigned + '</b>' : '0') + '</td><td>' + num(x.assigned_not_eligible) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<div class="muted">No active mandatory video.</div>', 'Recomputes the daily job\'s rule (Active employee, has a user, holds an allowed role) and compares it with the actual assignments.');
    h += '</div>';
    // reminders
    var R = s.reminders;
    h += '<div class="sh">Training reminders</div><div class="g2">';
    h += panel('Reminder jobs', '<div class="tw"><table class="dirtable"><thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th>Runs (30 days)</th><th>Status</th></tr></thead><tbody>' +
      R.jobs.map(function (j) { var rn = Object.keys(j.runs_30d || {}).map(function (k) { return k + ' ' + j.runs_30d[k]; }).join(', '); return '<tr><td>' + esc(j.name) + '</td><td class="mono">' + esc(j.cron || '—') + '</td><td>' + esc(j.last_run || '—') + '</td><td>' + esc(rn || '—') + (j.last_failure ? '<div class="lvnote">Last failure ' + esc(j.last_failure) + '</div>' : '') + '</td><td><span class="lvs ' + (!j.exists ? 'bad' : j.disabled || j.stopped ? 'warn' : 'ok') + '">' + (!j.exists ? 'Missing' : j.disabled ? 'Disabled' : j.stopped ? 'Stopped' : 'Active') + '</span></td></tr>'; }).join('') +
      '</tbody></table></div>', R.schedule);
    h += panel('Reminder activity', kvLite([['Reminder emails recorded', R.sent_total], ['Assignments reminded at least once', R.reminded_assignments], ['Escalated to managers', R.escalated], ['Last reminder', R.last_reminder || '—'], ['Open optional assignments (no reminders by design)', R.optional_without_reminders]]), 'Read-only. No reminder is created, changed or enabled from the dashboard.');
    h += '</div>';
    h += '<div class="sh">Training data quality · HR review</div><div class="panel"><div class="tw"><table class="dirtable"><thead><tr><th>Issue</th><th>Severity</th><th>Records</th><th></th></tr></thead><tbody>' +
      s.dq.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td><span class="lvs ' + (x.severity === 'high' ? 'bad' : x.severity === 'medium' ? 'warn' : 'muted') + '">' + esc(x.severity) + '</span></td><td><b>' + num(x.count) + '</b></td><td>' +
        (dt && x.count ? '<button class="btn s sm"' + trAttr({ trpre: x.preset, trt: 'Data quality · ' + x.label }) + '>Review</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><div class="ph" style="margin-top:8px">Displayed only. Assignments and completions are never changed by the dashboard.</div></div>';
    h += '<div class="ph">Generated ' + esc(s.meta.generated) + ' · source: Training Video, Training Course, Employee Training Progress, Employee Course Progress.' + (s.meta.unreadable.length ? ' Not readable: ' + esc(s.meta.unreadable.join(', ')) : '') + '</div>';
    root.innerHTML = h;
    if (dt) trRenderList();
  }
  function kvLite(pairs) { return '<div class="cpcomp" style="flex-wrap:wrap">' + pairs.map(function (p) { return '<div style="min-width:130px"><b>' + esc(p[1]) + '</b><span>' + esc(p[0]) + '</span></div>'; }).join('') + '</div>'; }
  function trRenderList() {
    var root = host.querySelector('[data-tr-list]'); if (!root) return;
    var L = TR.L, d = L.data, o = (TR.sum && TR.sum.options) || {};
    var active = document.activeElement, keep = active && active.dataset && active.dataset.trf === 'search', caret = keep ? active.selectionStart : 0;
    var h = '<div class="lvhead"><b>' + esc(L.title) + '</b> <button class="btn s sm" data-export="tr">Export CSV</button>' + (L.preset ? ' <button class="btn s sm" data-tra="clearpreset">× Show all assignments</button>' : '') + '</div>';
    h += '<div class="dirbar"><label class="dsearch">Search<input type="search" data-trf="search" placeholder="Employee ID, name or training…" value="' + esc(L.f.search) + '"></label>' +
      trSel('department', 'Department', o.department, L.f.department, 'All departments') + trSel('designation', 'Designation', o.designation, L.f.designation, 'All designations') +
      '<label>Employee ID<input type="text" data-trf="employee" placeholder="exact ID" value="' + esc(L.f.employee) + '"></label>' +
      trSel('item', 'Video / course', o.items, L.f.item, 'All training') + trSel('mandatory', 'Mandatory', [['1', 'Mandatory'], ['0', 'Optional']], L.f.mandatory, 'All') +
      trSel('status', 'Status', ['Completed', 'In Progress', 'Not Started'], L.f.status, 'All statuses') +
      trSel('timing', 'Overdue / due soon', [['overdue', 'Overdue'], ['due_soon', 'Due in ≤' + ((TR.sum && TR.sum.meta.due_soon_days) || 3) + ' days'], ['on_track', 'On track'], ['no_due', 'No due date']], L.f.timing, 'Any') +
      trSel('date_field', 'Date range on', [['assigned_date', 'Assigned date'], ['due_date', 'Due date'], ['completed_on', 'Completion date']], L.f.date_field) +
      '<label>From<input type="date" data-trf="range_from" value="' + esc(L.f.range_from) + '"></label><label>To<input type="date" data-trf="range_to" value="' + esc(L.f.range_to) + '"></label>' +
      '<button class="btn s" data-tra="clearf">Clear</button></div>';
    if (L.err) h += '<div class="alert e">' + esc(L.err) + '</div>';
    if (!d && L.busy) h += '<div class="ld">Loading training assignments…</div>';
    else if (d) {
      var from = d.total ? (d.page - 1) * d.page_length + 1 : 0, to = Math.min(d.total, d.page * d.page_length);
      h += '<div class="dirmeta"><span>' + (L.busy ? '<span class="spin"></span> Loading… ' : '') + 'Showing <b>' + from + '–' + to + '</b> of <b>' + num(d.total) + '</b> records · <b>' + num(d.employees) + '</b> employees</span>' +
        '<label class="pl">Rows<select data-trpl="1">' + [25, 50, 100].map(function (n) { return '<option' + (n === L.pl ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
      if (!d.rows.length) h += '<div class="empty">No training assignments match these filters.<br><button class="btn s sm" data-tra="clearf" style="margin-top:8px">Clear filters</button></div>';
      else {
        h += '<div class="tw dtw' + (L.busy ? ' dim' : '') + '"><table class="dirtable"><thead><tr>' + TR_COLS.map(function (c) {
          var on = L.sort === c[2]; return '<th class="sort' + (on ? ' on' : '') + '" data-trsort="' + c[2] + '">' + esc(c[1]) + (on ? (L.order === 'asc' ? ' ▲' : ' ▼') : ' <span class="muted">↕</span>') + '</th>';
        }).join('') + '<th>Action</th></tr></thead><tbody>';
        d.rows.forEach(function (r) {
          h += '<tr class="click" data-trview="' + esc(r.employee) + '">' + TR_COLS.map(function (col) {
            var v = r[col[0]];
            if (col[0] === 'employee') return '<td class="mono">' + esc(v) + '</td>';
            if (col[0] === 'title') return '<td>' + esc(v || '—') + (r.kind ? ' <span class="muted">(' + esc(r.kind) + ')</span>' : '') + (r.note ? '<div class="lvnote">' + esc(r.note) + '</div>' : '') + '</td>';
            if (col[0] === 'mandatory') return '<td>' + (r.status === 'No user' ? '—' : v ? '<span class="lvs bad">Mandatory</span>' : '<span class="lvs muted">Optional</span>') + '</td>';
            if (col[0] === 'due_date') return '<td>' + esc(v || '—') + (r.overdue ? '<div class="lvnote">overdue ' + (-r.days_to_due) + 'd</div>' : r.due_soon ? '<div class="lvnote">due in ' + r.days_to_due + 'd</div>' : '') + '</td>';
            if (col[0] === 'status') return '<td><span class="lvs ' + (TR_ST[v] || 'muted') + '">' + esc(v) + '</span></td>';
            if (col[0] === 'progress') return '<td style="text-align:right">' + (v === null || v === undefined ? (r.status === 'In Progress' ? '<span class="muted" title="Videos record status only">started</span>' : '—') : v + '%') + '</td>';
            return '<td>' + esc(v || '—') + '</td>';
          }).join('') + '<td style="white-space:nowrap"><button class="btn s sm" data-trview="' + esc(r.employee) + '">View</button>' + (r.name ? ' <a class="btn s sm" href="/app/' + (r.kind === 'course' ? 'employee-course-progress' : 'employee-training-progress') + '/' + encodeURIComponent(r.name) + '" target="_blank">Record ↗</a>' : '') + '</td></tr>';
        });
        h += '</tbody></table></div>';
        h += '<div class="pager"><button class="btn s sm" data-trpage="first"' + (d.page <= 1 ? ' disabled' : '') + '>«</button><button class="btn s sm" data-trpage="prev"' + (d.page <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
          '<span>Page <b>' + d.page + '</b> of <b>' + d.pages + '</b></span><button class="btn s sm" data-trpage="next"' + (d.page >= d.pages ? ' disabled' : '') + '>Next ›</button><button class="btn s sm" data-trpage="last"' + (d.page >= d.pages ? ' disabled' : '') + '>»</button></div>';
      }
      h += '<div class="ph" style="margin-top:6px">One row per assignment. Results respect your ERPNext and Employee User Permissions. Due dates and assignments are managed in the Training Center; the dashboard never changes them.</div>';
    }
    root.innerHTML = h;
    if (keep) { var inp = root.querySelector('[data-trf="search"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(caret, caret); } catch (e) {} } }
  }
  function openTraining(emp) {
    if (!emp) return;
    var dlg = new AHDDialog({ title: 'Employee training', size: 'extra-large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    var $w = dlg.fields_dict.h.$wrapper; $w.html('<div class="text-muted" style="padding:30px;text-align:center">Loading training details…</div>'); dlg.show();
    frappe.call({ method: 'admin_hr_training_data', args: trArgs({ mode: 'detail', employee: emp }), freeze: false,
      callback: function (r) {
        var m = r.message; if (!m) { $w.html('<div class="text-muted">No data.</div>'); return; }
        var b = m.basic, s = m.summary;
        dlg.set_title(b.employee_name + ' · ' + b.employee);
        var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' + pill(b.status, b.status === 'Active' ? 'green' : 'gray') + (b.has_user ? '' : pill('No ERPNext user', 'red')) +
          pill(s.completed + '/' + s.total + ' completed', s.total && s.completed === s.total ? 'green' : 'orange') + (s.overdue ? pill(s.overdue + ' overdue', 'red') : '') +
          '<a class="btn btn-xs btn-default" href="/app/employee-training-progress?employee=' + encodeURIComponent(b.employee) + '" target="_blank">Training records ↗</a>' +
          '<a class="btn btn-xs btn-default" href="/app/training-dashboard" target="_blank">Training Dashboard ↗</a></div>';
        h += sect('A · Employee', kv([['Employee', b.employee_name + ' (' + b.employee + ')'], ['Company', b.company], ['Department', b.department], ['Designation', b.designation], ['Date of joining', b.date_of_joining], ['ERPNext user', b.has_user ? 'Yes' : 'No (cannot open My Training)']]));
        h += sect('B · Summary', kv([['Assigned', s.total], ['Completed', s.completed], ['In progress', s.in_progress], ['Not started', s.not_started], ['Mandatory', s.mandatory], ['Mandatory still open', s.mandatory_open], ['Overdue', s.overdue]]) +
          (m.not_yet_assigned.length ? '<div class="alert alert-warning" style="margin-top:8px;padding:6px 10px">Eligible but not yet assigned: ' + m.not_yet_assigned.map(function (x) { return esc(x.title); }).join(', ') + '</div>' : ''));
        var cols = [[function (x) { return (x.name ? '<a href="/app/' + (x.kind === 'course' ? 'employee-course-progress' : 'employee-training-progress') + '/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.title) + '</a>' : esc(x.title)) + ' <span class="text-muted small">(' + esc(x.kind) + ')</span>'; }, 'Training'],
          [function (x) { return x.mandatory ? pill('Mandatory', 'red') : pill('Optional', 'gray'); }, 'Type'], ['assigned_date', 'Assigned'],
          [function (x) { return esc(x.due_date || '—') + (x.overdue ? ' ' + pill('overdue ' + (-x.days_to_due) + 'd', 'red') : x.due_soon ? ' ' + pill('due in ' + x.days_to_due + 'd', 'orange') : ''); }, 'Due'],
          ['started_on', 'Started'], ['completed_on', 'Completed'], [function (x) { return pill(x.status, TR_PILL[x.status] || 'gray'); }, 'Status'],
          [function (x) { return x.progress === null || x.progress === undefined ? (x.status === 'In Progress' ? 'started' : '—') : x.progress + '%'; }, 'Progress'], ['reminders_sent', 'Reminders']];
        var grp = function (f) { return m.items.filter(f); };
        h += sect('C · Assigned training', tbl(cols, m.items, 'No training assigned.'));
        h += sect('D · By status', '<div style="margin-bottom:4px"><b>Completed</b> (' + grp(function (x) { return x.status === 'Completed'; }).length + ')</div>' + tbl(cols, grp(function (x) { return x.status === 'Completed'; }), 'None.') +
          '<div style="margin:8px 0 4px"><b>In progress</b> (' + grp(function (x) { return x.status === 'In Progress'; }).length + ')</div>' + tbl(cols, grp(function (x) { return x.status === 'In Progress'; }), 'None.') +
          '<div style="margin:8px 0 4px"><b>Not started</b> (' + grp(function (x) { return x.status === 'Not Started'; }).length + ')</div>' + tbl(cols, grp(function (x) { return x.status === 'Not Started'; }), 'None.') +
          '<div style="margin:8px 0 4px"><b>Mandatory</b> (' + grp(function (x) { return x.mandatory; }).length + ') · <b>Overdue</b> (' + grp(function (x) { return x.overdue; }).length + ')</div>' + tbl(cols, grp(function (x) { return x.mandatory || x.overdue; }), 'None.'));
        h += sect('E · Progress history', tbl([['date', 'Date'], ['event', 'Event'], ['item', 'Training']], m.history, 'No history recorded.'), 'Built from the assignment dates and reminder fields. Videos do not record a percentage watched.');
        h += sect('F · Assessment results', '<div class="text-muted">' + esc(m.assessments.note) + '</div>' + (m.other_training && m.other_training.length ? '<div style="margin-top:8px"><b>Other "Training" requests</b>: ' + m.other_training.map(function (x) { return '<a href="/app/training/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a> (' + esc(x.state || '—') + ', ' + esc(x.date) + ')'; }).join(', ') + '</div>' : ''));
        $w.html(h);
      },
      error: function () { $w.html('<div class="text-muted" style="padding:20px">Training details are not available for this employee (not permitted or not found).</div>'); } });
  }
  /* ---------------- HR Requests & Service Desk tab (Phase 7) ---------------- */
  var RQ = { sum: null, busy: false, err: null, seq: 0, company: '',
    L: { data: null, busy: false, err: null, seq: 0, preset: '', title: 'All HR requests', f: null, page: 1, pl: 25, sort: 'created', order: 'desc' } };
  var RQ_EMPTY_F = function () { return { search: '', department: '', branch: '', type: '', employee: '', status: '', approver: '', range_from: '', range_to: '', age_bucket: '' }; };
  RQ.L.f = RQ_EMPTY_F();
  var RQ_COLS = [['name', 'Request ID', 'name'], ['type', 'Request Type', 'type'], ['employee_name', 'Employee', 'employee_name'], ['department', 'Department', 'department'],
    ['company', 'Company', 'company'], ['branch', 'Branch', 'branch'], ['created', 'Created', 'created'], ['approver', 'Assigned / Approver', 'approver'],
    ['priority', 'Priority', null], ['status', 'Status', 'status'], ['age_days', 'Age / Overdue', 'age_days']];
  var RQ_ST = { draft: 'muted', pending: 'warn', on_hold: 'warn', in_progress: 'warn', completed: 'ok', rejected: 'bad', cancelled: 'muted', unclear: 'bad' };
  var RQ_PILL = { draft: 'gray', pending: 'orange', on_hold: 'yellow', in_progress: 'blue', completed: 'green', rejected: 'red', cancelled: 'gray', unclear: 'red' };
  function rqDt() { return RQ.sum && RQ.sum.meta.tier === 'detail'; }
  function rqArgs(a) { return gfArgs(a); }
  function rqAttr(o) { return Object.keys(o).map(function (k) { return ' data-' + k + '="' + esc(o[k]) + '"'; }).join(''); }
  function rqLoad() {
    RQ.busy = true; RQ.err = null; rqRender();
    var seq = ++RQ.seq;
    frappe.call({ method: 'admin_hr_requests_data', args: rqArgs({ mode: 'summary' }), freeze: false,
      callback: function (r) { if (seq !== RQ.seq) return; RQ.busy = false; RQ.sum = r.message || null; if (RQ.sum) RQ.company = RQ.sum.meta.company; rqRender(); if (rqDt() && !RQ.L.data) rqList(); },
      error: function () { if (seq !== RQ.seq) return; RQ.busy = false; RQ.err = 'Could not load HR requests. You may not have permission.'; rqRender(); } });
  }
  function rqList() {
    var L = RQ.L; if (!rqDt()) return;
    L.busy = true; L.err = null; rqRenderList();
    var seq = ++L.seq;
    frappe.call({ method: 'admin_hr_requests_data', args: rqArgs(Object.assign({ mode: 'list', preset: L.preset, page: L.page, page_length: L.pl, sort_by: L.sort, sort_order: L.order }, L.f)), freeze: false,
      callback: function (r) { if (seq !== L.seq) return; L.busy = false; L.data = r.message || null; if (L.data) L.page = L.data.page; rqRenderList(); },
      error: function () { if (seq !== L.seq) return; L.busy = false; L.err = 'Could not load HR requests.'; rqRenderList(); } });
  }
  function rqPreset(preset, title, filters) {
    var L = RQ.L; L.preset = preset || ''; L.title = title || 'All HR requests'; L.page = 1;
    L.f = Object.assign(RQ_EMPTY_F(), filters || {});
    if (preset === 'overdue' || preset === 'age' || preset === 'dq_stuck' || preset.indexOf('q_') === 0 && preset !== 'q_recent') { L.sort = 'age_days'; L.order = 'desc'; } else { L.sort = 'created'; L.order = 'desc'; }
    rqList();
    var el = host.querySelector('[data-rq-dir]'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function rqSel(key, label, list, cur, all) {
    return '<label>' + esc(label) + '<select data-rqf="' + key + '">' + (all !== undefined ? '<option value="">' + esc(all) + '</option>' : '') +
      (list || []).map(function (x) { var v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>';
  }
  function rqBars(list, valKey, attrFn, fmt) {
    if (!list || !list.length) return '<div class="muted">No records.</div>';
    var m = 0; list.forEach(function (x) { if ((x[valKey] || 0) > m) m = x[valKey] || 0; });
    var dt = rqDt();
    return '<div class="lvbars">' + list.slice(0, 30).map(function (x) {
      var w = !x.suppressed && m ? Math.max(x[valKey] ? 2 : 0, Math.round((x[valKey] || 0) / m * 100)) : 0, at = dt && !x.suppressed && attrFn ? attrFn(x) : '';
      return '<div class="lvbr' + (at ? ' click' : '') + '"' + at + ' title="' + esc(x.label) + '"><span class="lvbl">' + esc(x.label) + '</span><span class="lvbt"><span style="width:' + w + '%"></span></span><span class="lvbv">' + (x.suppressed ? '&lt;3' : fmt ? fmt(x) : num(x[valKey])) + '</span></div>';
    }).join('') + '</div>';
  }
  function rqCard(k) {
    var dt = rqDt() && k.preset;
    return '<div class="card' + (dt ? ' click' : '') + '"' + (dt ? rqAttr({ rqpre: k.preset === 'all' ? '' : k.preset, rqt: k.label }) : '') + '><div class="lb"><span>' + esc(k.label) + '</span>' + badge(k.value === null ? 'unavailable' : k.state) + '</div>' +
      (k.value === null ? '<div class="v na">Unavailable</div>' : '<div class="v">' + num(k.value) + ' <span class="cpunit">' + esc(k.unit) + '</span></div>') +
      (k.sub ? '<div class="sub">' + esc(k.sub) + '</div>' : '') + '<div class="nt" title="' + esc(k.basis) + '">' + esc(k.basis) + '</div>' +
      (dt ? '<div class="ft">View requests &rarr;</div>' : (!rqDt() && k.preset ? '<div class="ft muted">&#128274; Details: HR Manager / HR User</div>' : '')) + '</div>';
  }
  function rqQueue(label, value, sub, preset) {
    var dt = rqDt();
    return '<div class="card' + (dt ? ' click' : '') + '"' + (dt ? rqAttr({ rqpre: preset, rqt: label }) : '') + '><div class="lb"><span>' + esc(label) + '</span></div><div class="v">' + num(value) + '</div><div class="sub">' + esc(sub) + '</div>' + (dt ? '<div class="ft">Open queue &rarr;</div>' : '') + '</div>';
  }
  function rqTrend(list) {
    var m = 0; list.forEach(function (x) { if (x.created > m) m = x.created; if (x.closed > m) m = x.closed; });
    var dt = rqDt();
    return '<div class="lvmc">' + list.map(function (x) {
      var last = new Date(parseInt(x.month.slice(0, 4), 10), parseInt(x.month.slice(5, 7), 10), 0).getDate();
      var at = dt && x.created ? rqAttr({ rqpre: '', rqt: 'Created in ' + x.month, rqfrom: x.month + '-01', rqto: x.month + '-' + String(last).padStart(2, '0') }) : '';
      return '<div class="lvmcol' + (at ? ' click' : '') + '"' + at + ' title="' + esc(x.month + ': ' + x.created + ' created, ' + x.closed + ' closed (with a recorded closure date)') + '"><div class="lvmv">' + (x.created || '') + '</div>' +
        '<div class="lvmbar" style="flex-direction:row;align-items:flex-end;gap:2px"><span style="width:45%;height:' + (m ? Math.round(x.created / m * 100) : 0) + '%;background:#2563eb;display:block"></span><span style="width:45%;height:' + (m ? Math.round(x.closed / m * 100) : 0) + '%;background:#16a34a;display:block"></span></div><div class="lvml">' + esc(x.month.slice(5)) + '</div></div>';
    }).join('') + '</div><div class="lvlegend"><span><i style="background:#2563eb"></i>Created</span><span><i style="background:#16a34a"></i>Closed (recorded date)</span></div>';
  }
  function vRequests(d) { return '<div data-rq-root></div>'; }
  function rqAfterRender() { if (!RQ.sum && !RQ.busy) rqLoad(); else rqRender(); }
  function rqRender() {
    var root = host.querySelector('[data-rq-root]'); if (!root) return;
    var s = RQ.sum, h = '', comps = (s && s.meta.companies) || (S.d && S.d.meta.companies) || [];
    h += scopeLine('requests') + '<div class="dirbar lvperiod">' +
      '<button class="btn s" data-rqa="refresh">Refresh</button>' + (RQ.busy ? '<span class="muted"><span class="spin"></span> Loading…</span>' : '') + '</div>';
    if (RQ.err) h += '<div class="alert e">' + esc(RQ.err) + '</div>';
    if (!s) { root.innerHTML = h + (RQ.busy ? '<div class="ld">Loading HR requests…</div>' : ''); return; }
    var dt = rqDt(), A = s.analytics, Q = s.queues;
    if (s.meta.unreadable.length) h += '<div class="alert i">Not readable with your roles, so not counted: <b>' + esc(s.meta.unreadable.join(', ')) + '</b>. Permissions are not bypassed.</div>';
    h += '<div class="sh">HR service desk</div><div class="grid kpi-row requests-kpi-row" style="--cols:' + Math.max(1, s.kpis.length) + '">' + s.kpis.map(rqCard).join('') + '</div>';
    h += '<div class="ph">Leave Applications (Leave tab) and IT Help Desk tickets are not included. Overdue uses a provisional ' + s.meta.sla_days + '-day SLA because no SLA is configured. Priority is not recorded on any source DocType.</div>';
    h += '<div class="sh">Action queues</div><div class="grid kpi-row request-queue-row" style="--cols:5">' +
      rqQueue('Pending My Approval', Q.my, 'where the workflow lets one of your roles act, or you are the named approver', 'q_my') +
      rqQueue('Pending HR Review', Q.hr_review, 'states naming HR or Review', 'q_hr_review') +
      rqQueue('Awaiting Employee Information', Q.awaiting_info, 'On-Hold / clarification states', 'q_awaiting_info') +
      rqQueue('Overdue Requests', Q.overdue, 'open > ' + s.meta.sla_days + ' days', 'overdue') +
      rqQueue('Recently Completed', Q.recent, 'closed in the last 30 days (recorded date)', 'q_recent') + '</div>';
    h += '<div class="ph">&#128274; ' + esc(Q.note) + '</div>';
    h += '<div class="sh">HR request analytics</div><div class="g2 analytics-row request-analytics-row" style="--cols:8">';
    var src = function (x) { return (s.options && s.options.types || []).filter(function (t) { return t[1] === x.label; }).map(function (t) { return t[0]; })[0]; };
    h += panel('Requests by type', rqBars(A.by_type, 'count', function (x) { var k = src(x); return k ? rqAttr({ rqpre: '', rqt: x.label, rqtype: k }) : ''; }, function (x) { return x.count + ' · ' + x.open + ' open'; }));
    h += panel('Requests by department', rqBars(A.by_department, 'count', function (x) { return rqAttr({ rqpre: '', rqt: 'Department · ' + x.label, rqdept: x.label }); }, function (x) { return x.count + ' · ' + x.open + ' open'; }));
    h += panel('Requests by branch', rqBars(A.by_branch, 'count', function (x) { return rqAttr({ rqpre: '', rqt: 'Branch · ' + x.label, rqbranch: x.label }); }, function (x) { return x.count + ' · ' + x.open + ' open'; }));
    h += panel('Monthly request trend', rqTrend(A.trend), '12 months by creation date; closed only where a workflow closure date exists.');
    h += panel('Open requests by age', rqBars(A.pending_by_age, 'count', function (x) { return rqAttr({ rqpre: 'age', rqt: 'Open ' + x.label + ' days', rqage: x.label }); }), 'Days in the current state (or since creation).');
    h += panel('Status distribution', rqBars(A.status, 'count', function (x) { return rqAttr({ rqpre: '', rqt: x.label, rqst: x.key }); }), 'Normalised across DocTypes (rules below).');
    h += panel('Average resolution time by type', rqBars(A.resolution_by_type.map(function (x) { return { label: x.label, avg: x.avg || 0, raw: x }; }), 'avg', null, function (x) { return x.raw.avg === null ? 'Unavailable (' + x.raw.closed + ' closed, no closure date)' : x.raw.avg + ' days · ' + x.raw.timed + '/' + x.raw.closed; }), 'Creation → workflow comment for the final state.');
    h += panel('Oldest unresolved requests', A.oldest_open.length ? '<div class="lvbars">' + A.oldest_open.map(function (x) { return '<div class="lvbr' + (dt && x.id ? ' click' : '') + '"' + (dt && x.id ? rqAttr({ rqview: x.id }) : '') + '><span class="lvbl">' + esc(x.label) + '</span><span></span><span class="lvbv">' + num(x.age) + ' days</span></div>'; }).join('') + '</div>' : '<div class="muted">No open requests.</div>');
    h += '</div>';
    h += '<div class="sh" data-rq-dir>Unified request directory</div>';
    if (dt) h += '<div class="panel"><div data-rq-list></div></div>';
    else h += '<div class="alert i">&#128274; The request directory and request details are available to HR Manager / HR User only. Your view shows aggregate figures.</div>';
    h += '<div class="sh">Sources & status rules</div><div class="g2">';
    h += panel('Source DocTypes', '<div class="tw"><table class="dirtable"><thead><tr><th>DocType</th><th>Shown as</th><th>Records</th><th>Open</th><th>Workflow</th></tr></thead><tbody>' +
      s.sources.map(function (x) { return '<tr><td>' + esc(x.doctype) + '</td><td>' + esc(x.label) + '</td><td>' + (x.readable ? num(x.count) : '<span class="lvs warn">not readable</span>') + '</td><td>' + (x.readable ? num(x.open) : '—') + '</td><td>' + esc(x.workflow || 'none / inactive') + '</td></tr>'; }).join('') +
      '</tbody></table></div><div class="ph" style="margin-top:6px">Not included: ' + s.excluded.map(function (x) { return esc(x.doctype) + ' (' + esc(x.reason) + ')'; }).join('; ') + '.</div>');
    h += panel('How each DocType\'s status is normalised', '<div class="tw"><table class="dirtable"><thead><tr><th>DocType</th><th>Rule</th><th>Closure date</th></tr></thead><tbody>' +
      s.status_rules.map(function (x) { return '<tr><td>' + esc(x.doctype) + '</td><td>' + esc(x.rule) + '</td><td>' + esc(x.closure_date) + '</td></tr>'; }).join('') + '</tbody></table></div>', 'The DocTypes do not share one status model; these rules are the dashboard\'s mapping.');
    h += '</div>';
    h += '<div class="sh">HR request data quality</div><div class="panel"><div class="tw"><table class="dirtable"><thead><tr><th>Issue</th><th>Severity</th><th>Records</th><th></th></tr></thead><tbody>' +
      s.dq.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td><span class="lvs ' + (x.severity === 'high' ? 'bad' : x.severity === 'medium' ? 'warn' : 'muted') + '">' + esc(x.severity) + '</span></td><td><b>' + num(x.count) + '</b></td><td>' +
        (dt && x.count ? '<button class="btn s sm"' + rqAttr({ rqpre: x.preset, rqt: 'Data quality · ' + x.label }) + '>Review</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><div class="ph" style="margin-top:8px">Displayed only. No request is changed by the dashboard.</div></div>';
    h += '<div class="ph">Generated ' + esc(s.meta.generated) + '.</div>';
    root.innerHTML = h;
    if (dt) rqRenderList();
  }
  function rqRenderList() {
    var root = host.querySelector('[data-rq-list]'); if (!root) return;
    var L = RQ.L, d = L.data, o = (RQ.sum && RQ.sum.options) || {};
    var active = document.activeElement, keep = active && active.dataset && active.dataset.rqf === 'search', caret = keep ? active.selectionStart : 0;
    var h = '<div class="lvhead"><b>' + esc(L.title) + '</b> <button class="btn s sm" data-export="rq">Export CSV</button>' + (L.preset ? ' <button class="btn s sm" data-rqa="clearpreset">× Show all requests</button>' : '') + '</div>';
    h += '<div class="dirbar"><label class="dsearch">Search<input type="search" data-rqf="search" placeholder="Request ID, employee or type…" value="' + esc(L.f.search) + '"></label>' +
      rqSel('department', 'Department', o.department, L.f.department, 'All departments') + rqSel('branch', 'Branch', o.branch, L.f.branch, 'All branches') +
      rqSel('type', 'Request type', o.types, L.f.type, 'All types') + '<label>Employee ID<input type="text" data-rqf="employee" placeholder="exact ID" value="' + esc(L.f.employee) + '"></label>' +
      rqSel('status', 'Status', o.status, L.f.status, 'All statuses') + rqSel('approver', 'Assigned to', o.approver, L.f.approver, 'Anyone') +
      '<label>Created from<input type="date" data-rqf="range_from" value="' + esc(L.f.range_from) + '"></label><label>Created to<input type="date" data-rqf="range_to" value="' + esc(L.f.range_to) + '"></label>' +
      '<button class="btn s" data-rqa="clearf">Clear</button></div>';
    if (L.err) h += '<div class="alert e">' + esc(L.err) + '</div>';
    if (!d && L.busy) h += '<div class="ld">Loading requests…</div>';
    else if (d) {
      var from = d.total ? (d.page - 1) * d.page_length + 1 : 0, to = Math.min(d.total, d.page * d.page_length);
      h += '<div class="dirmeta"><span>' + (L.busy ? '<span class="spin"></span> Loading… ' : '') + 'Showing <b>' + from + '–' + to + '</b> of <b>' + num(d.total) + '</b> requests</span>' +
        '<label class="pl">Rows<select data-rqpl="1">' + [25, 50, 100].map(function (n) { return '<option' + (n === L.pl ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
      if (!d.rows.length) h += '<div class="empty">No HR requests match these filters.<br><button class="btn s sm" data-rqa="clearf" style="margin-top:8px">Clear filters</button></div>';
      else {
        h += '<div class="tw dtw' + (L.busy ? ' dim' : '') + '"><table class="dirtable"><thead><tr>' + RQ_COLS.map(function (c) {
          if (!c[2]) return '<th>' + esc(c[1]) + '</th>';
          var on = L.sort === c[2]; return '<th class="sort' + (on ? ' on' : '') + '" data-rqsort="' + c[2] + '">' + esc(c[1]) + (on ? (L.order === 'asc' ? ' ▲' : ' ▼') : ' <span class="muted">↕</span>') + '</th>';
        }).join('') + '<th>Action</th></tr></thead><tbody>';
        d.rows.forEach(function (r) {
          h += '<tr class="click" data-rqview="' + esc(r.id) + '">' + RQ_COLS.map(function (col) {
            var v = r[col[0]];
            if (col[0] === 'name') return '<td class="mono">' + esc(v) + (r.note ? '<div class="lvnote">' + esc(r.note) + '</div>' : '') + '</td>';
            if (col[0] === 'employee_name') return '<td>' + esc(v || '—') + '<div class="muted mono" style="font-size:11px">' + esc(r.employee || 'no employee link') + '</div></td>';
            if (col[0] === 'priority') return '<td class="muted">—</td>';
            if (col[0] === 'status') return '<td><span class="lvs ' + (RQ_ST[r.cat] || 'muted') + '">' + esc(v) + '</span><div class="muted" style="font-size:11px">' + esc(r.state) + '</div></td>';
            if (col[0] === 'age_days') return '<td>' + (v === null ? '—' : v + 'd' + (r.overdue_days ? '<div class="lvnote">' + r.overdue_days + 'd overdue</div>' : '')) + '</td>';
            return '<td>' + esc(v || '—') + '</td>';
          }).join('') + '<td style="white-space:nowrap"><button class="btn s sm" data-rqview="' + esc(r.id) + '">View</button></td></tr>';
        });
        h += '</tbody></table></div>';
        h += '<div class="pager"><button class="btn s sm" data-rqpage="first"' + (d.page <= 1 ? ' disabled' : '') + '>«</button><button class="btn s sm" data-rqpage="prev"' + (d.page <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
          '<span>Page <b>' + d.page + '</b> of <b>' + d.pages + '</b></span><button class="btn s sm" data-rqpage="next"' + (d.page >= d.pages ? ' disabled' : '') + '>Next ›</button><button class="btn s sm" data-rqpage="last"' + (d.page >= d.pages ? ' disabled' : '') + '>»</button></div>';
      }
      h += '<div class="ph" style="margin-top:6px">One row per source record. Results respect your ERPNext DocType and User Permissions for every source.</div>';
    }
    root.innerHTML = h;
    if (keep) { var inp = root.querySelector('[data-rqf="search"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(caret, caret); } catch (e) {} } }
  }
  function openRequest(id) {
    if (!id) return;
    var dlg = new AHDDialog({ title: 'HR request', size: 'extra-large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    var $w = dlg.fields_dict.h.$wrapper; $w.html('<div class="text-muted" style="padding:30px;text-align:center">Loading request…</div>'); dlg.show();
    frappe.call({ method: 'admin_hr_requests_data', args: rqArgs({ mode: 'detail', id: id }), freeze: false,
      callback: function (r) {
        var m = r.message; if (!m) { $w.html('<div class="text-muted">No data.</div>'); return; }
        var q = m.request, e = m.employee;
        dlg.set_title(q.type + ' · ' + q.name);
        var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' + pill(q.status, RQ_PILL[q.cat] || 'gray') + pill(q.state, 'gray') +
          (q.days_pending !== null ? pill(q.days_pending + ' days in this state', q.days_pending > 7 ? 'red' : 'orange') : '') +
          '<a class="btn btn-xs btn-primary" href="' + esc(q.route) + '" target="_blank">' + (m.actions.length ? 'Open in ERPNext to act ↗' : 'Open in ERPNext ↗') + '</a></div>';
        h += sect('A · Request', kv([['Request ID', q.name], ['Type', q.type + ' (' + q.doctype + ')'], ['Created', q.created], ['Created by', q.created_by], ['Status', q.status + ' — ' + q.state],
          ['Assigned / approver', q.approver || '—'], ['In current state since', q.since], ['Workflow', q.workflow || 'none / inactive']].concat(q.safe_fields)));
        h += sect('B · Employee', e ? kv([['Employee', e.employee_name + ' (' + e.employee + ')'], ['Company', e.company], ['Department', e.department], ['Branch', e.branch], ['Designation', e.designation], ['Status', e.status]]) : '<div class="text-muted">No employee linked, or not visible with your permissions.</div>');
        h += sect('C · Workflow history', tbl([['state', 'Moved to'], ['by', 'By'], ['on', 'On']], m.history, 'No workflow history recorded for this request.'));
        h += sect('D · Available action', m.actions.length ? 'The workflow lists these actions for your roles: ' + m.actions.map(function (x) { return pill(x, 'blue'); }).join(' ') + '<div class="text-muted small" style="margin-top:6px">Use them in the original form; the dashboard never applies them.</div>' : '<div class="text-muted">No workflow action is available to your roles in this state.</div>');
        h += sect('E · Related requests (same employee)', tbl([['type', 'Type'], [function (x) { return '<a href="/app/' + x.doctype.toLowerCase().replace(/ /g, '-') + '/' + encodeURIComponent(x.name) + '" target="_blank">' + esc(x.name) + '</a>'; }, 'Request'], ['state', 'State'], ['created', 'Created']], m.related, 'No other requests.'), m.note);
        $w.html(h);
      },
      error: function () { $w.html('<div class="text-muted" style="padding:20px">This request is not available (not permitted or not found).</div>'); } });
  }
  function moveChart(mv) {
    var m = 0; mv.forEach(function (x) { m = Math.max(m, x.joiners, x.leavers); });
    return '<div class="vb">' + mv.map(function (x) { return '<div class="c" title="' + esc(x.month + ': +' + x.joiners + ' joiners / ' + x.leavers + ' leavers') + '"><div class="pair"><div class="bar" style="height:' + (m ? Math.max(2, 85 * x.joiners / m) : 2) + '%;max-width:12px"></div><div class="bar b2" style="height:' + (m ? Math.max(2, 85 * x.leavers / m) : 2) + '%;max-width:12px"></div></div><span class="x">' + esc(x.month.slice(2)) + '</span></div>'; }).join('') + '</div><div class="leg"><span><i style="background:var(--acc)"></i>Joiners</span><span><i style="background:var(--acc2)"></i>Leavers</span></div>';
  }
  /* ---------------- HR Analytics tab (Phase 8) ---------------- */
  var AN = { data: null, busy: false, err: null, seq: 0, key: '' };
  function gfArgs(extra) {
    var o = { company: (S.f && S.f.company) || (S.d && S.d.meta.company) || '' };
    if (S.f && S.f.department) o.g_department = S.f.department;
    if (S.f && S.f.branch) o.g_branch = S.f.branch;
    if (S.f && S.f.job_location) o.g_job_location = S.f.job_location;
    if (S.f && S.f.preview_tier) o.preview_tier = S.f.preview_tier;
    return Object.assign(o, extra || {});
  }
  function scopeLine(kind) {
    var f = S.f || {}, parts = [esc(f.company || (S.d && S.d.meta.company) || '')];
    if (f.department) parts.push('Department: ' + esc(f.department));
    if (f.branch) parts.push('Branch: ' + esc(f.branch));
    if (f.job_location) parts.push('Job location: ' + esc(locName(f.job_location)));
    var when = { overview: 'Headcount as of ' + esc(f.to_date || ''), employees: 'Headcount as of ' + esc(f.to_date || ''),
      attendance: 'Check-in activity up to ' + esc(f.to_date || '') + ' (period shown on each panel)',
      leave: 'Leave activity in the period selected below; "today" figures use today\'s date',
      compliance: 'Document status as of ' + esc(f.to_date || ''),
      training: 'All assignments; overdue / due soon as of today; directory date range on assignment, due or completion date',
      requests: 'All requests by creation date; age and overdue as of today',
      analytics: 'Headcount as of ' + esc(f.to_date || '') + ' · leave over the last 12 months · documents as of ' + esc(f.to_date || '') + ' · training and requests: all records' }[kind] || '';
    return '<div class="scope">Scope: ' + parts.join(' · ') + ' · <b>' + when + '</b>. Change company, department, branch or job location in the filter bar above.</div>';
  }
  function anState(s) { return badge(s || 'actual'); }
  function anPanel(title, state, body, def) {
    return '<div class="panel av-panel"><div class="anh"><b>' + esc(title.replace(/^\d+[a-z]?(?:[–-]\d+)? · /, '')) + '</b>' + anState(state) + '</div><div class="av-chart-body">' + body + '</div>' + (def ? '<details class="av-method"><summary>Source &amp; calculation</summary><div class="andef">' + esc(def) + '</div></details>' : '') + '</div>';
  }
  var AV_COLORS = ['#3b82f6', '#0d9488', '#8b5cf6', '#f59e0b', '#e11d48', '#06b6d4'];
  function avNumber(v) { return typeof v === 'number' && isFinite(v) && v >= 0; }
  function anBars(list, valKey, fmt, attrFn) {
    if (!list || !list.length) return '<div class="muted">No records.</div>';
    var shown = list.slice(0, 25), m = 0;
    shown.forEach(function (x) { if (!x.suppressed && avNumber(x[valKey])) m = Math.max(m, x[valKey]); });
    return '<div class="lvbars av-ranked">' + shown.map(function (x, i) {
      var v = x[valKey], hidden = !!x.suppressed, known = !hidden && avNumber(v);
      var w = known && m ? Math.max(v ? 2 : 0, v / m * 100) : 0;
      var at = !hidden && attrFn ? attrFn(x) : '';
      var display = hidden ? '&lt;3' : !known ? 'Unavailable' : fmt ? fmt(x) : num(v);
      return '<div class="lvbr' + (at ? ' click' : '') + '"' + at + ' title="' + esc(x.label) + '"><span class="lvbl"><i class="av-dot" style="background:' + AV_COLORS[i % AV_COLORS.length] + '"></i>' + esc(x.label) + '</span><span class="lvbt"><span style="width:' + w + '%;background:' + AV_COLORS[i % AV_COLORS.length] + '"></span></span><span class="lvbv">' + display + '</span></div>';
    }).join('') + '</div>';
  }
  // Native SVG charts keep zero distinct from missing or privacy-suppressed values.
  function anCols(list, series, labelKey) {
    if (!list || !list.length) return '<div class="muted">No trend data.</div>';
    var W = 420, H = 220, L = 35, R = 8, T = 12, B = 34, max = 0;
    list.forEach(function (x) { if (!x.suppressed) series.forEach(function (v) { if (avNumber(x[v[0]])) max = Math.max(max, x[v[0]]); }); });
    var top = max ? (max <= 4 ? Math.ceil(max) : Math.ceil(max / 4) * 4) : 1;
    var plot = H - T - B, group = (W - L - R) / list.length;
    var out = '<div class="av-svg-wrap"><svg class="av-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(series.map(function (v) { return v[1]; }).join(' and ') + ' by month; values are available below the chart') + '">';
    for (var tick = 0; tick <= 4; tick++) {
      var y = T + plot * tick / 4, val = top * (1 - tick / 4);
      out += '<line class="av-gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="av-axis" x="' + (L - 5) + '" y="' + (y + 3) + '" text-anchor="end">' + Math.round(val * 10) / 10 + '</text>';
    }
    list.forEach(function (x, i) {
      var label = String(x[labelKey] || ''), tip = label + ': ' + series.map(function (v) { return v[1] + ' ' + (x.suppressed ? '<3' : avNumber(x[v[0]]) ? x[v[0]] : 'Unavailable'); }).join(', ');
      out += '<g><title>' + esc(tip) + '</title>';
      var slot = group * .74 / series.length;
      series.forEach(function (v, j) {
        if (x.suppressed || !avNumber(x[v[0]])) return;
        var height = plot * x[v[0]] / top, bx = L + group * i + group * .13 + j * slot;
        out += '<rect x="' + bx.toFixed(2) + '" y="' + (T + plot - height).toFixed(2) + '" width="' + Math.max(1, slot - 2).toFixed(2) + '" height="' + height.toFixed(2) + '" rx="2" fill="' + v[2] + '"/>';
      });
      out += '<text class="av-axis" x="' + (L + group * (i + .5)).toFixed(2) + '" y="' + (H - 16) + '" text-anchor="middle">' + esc(label.slice(5) || label) + '</text></g>';
    });
    out += '</svg></div><div class="lvlegend">' + series.map(function (v) { return '<span><i style="background:' + v[2] + '"></i>' + esc(v[1]) + '</span>'; }).join('') + '</div>';
    out += '<details class="av-values"><summary>View chart values</summary><div class="tw"><table><thead><tr><th>Month</th>' + series.map(function (v) { return '<th>' + esc(v[1]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    out += list.map(function (x) { return '<tr><td>' + esc(x[labelKey]) + '</td>' + series.map(function (v) { return '<td>' + (x.suppressed ? '&lt;3' : avNumber(x[v[0]]) ? num(x[v[0]]) : 'Unavailable') + '</td>'; }).join('') + '</tr>'; }).join('');
    return out + '</tbody></table></div></details>';
  }
  function avRing(label, value, note, color) {
    var known = avNumber(value) && value <= 100, pct = known ? value : 0, circumference = 2 * Math.PI * 44;
    return '<div class="av-ring-layout"><svg class="av-ring" viewBox="0 0 112 112" role="img" aria-label="' + esc(label + ': ' + (known ? value + '%' : 'Unavailable')) + '"><circle class="av-ring-track" cx="56" cy="56" r="44"/><circle cx="56" cy="56" r="44" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="' + (pct ? 'round' : 'butt') + '" stroke-dasharray="' + (pct / 100 * circumference) + ' ' + circumference + '" transform="rotate(-90 56 56)"/><text class="av-ring-value" x="56" y="60" text-anchor="middle">' + (known ? Math.round(value * 10) / 10 + '%' : '—') + '</text></svg><div><b>' + esc(label) + '</b><p>' + esc(note || (known ? 'Current filtered scope' : 'No available percentage')) + '</p></div></div>';
  }
  function avSummary(d, A) {
    var E = d.employees || {}, AA = d.analytics || {};
    function k(area, key) { var source = A && A[area]; return source && !source.error ? (source.kpis || []).filter(function (x) { return x.key === key; })[0] || {} : {}; }
    var mandatory = k('training', 'mandatory'), pending = k('leave', 'pending');
    var compliance = A && A.compliance && !A.compliance.error ? A.compliance.analytics.completion : null;
    var saud = AA.saudization || {}, pct = avNumber(E.saudi) && avNumber(E.active) && E.active > 0 ? E.saudi / E.active * 100 : null;
    var h = '<div class="av-intro"><div><span class="av-eyebrow">PEOPLE INTELLIGENCE</span><h3>HR analytics</h3><p>Workforce, development and operational health in one view.</p></div><div class="av-shortcuts"><button class="btn s" data-tab="employees">Employees ↗</button><button class="btn s" data-tab="requests">Requests ↗</button><button class="btn s" data-tab="training">Training ↗</button></div></div>';
    h += '<div class="grid kpi-row analytics-kpi-row" style="--cols:6">';
    h += card('Active employees', E.active, 'actual', 'Active Employee records under the selected company and filters.');
    h += card('Joiners · 12 months', E.joiners_12m, 'actual', 'Employees across statuses, by joining date.');
    h += card('Leavers · 12 months', E.leavers_12m, AA.left_without_relieving_date ? 'partial' : 'actual', 'Status Left and a recorded relieving date.');
    h += card('Pending leave', pending.value, pending.state || (pending.value == null ? 'unavailable' : 'actual'), pending.basis || 'Pending applications from the leave summary.');
    h += card('Mandatory training', mandatory.value, mandatory.state || (mandatory.value == null ? 'unavailable' : 'actual'), mandatory.basis || 'Completed mandatory assignments divided by mandatory assignments.', mandatory.sub, null, mandatory.value == null ? '' : '%');
    h += card('Documents current', compliance ? compliance.documents_pct : null, compliance ? 'actual' : 'unavailable', 'Required documents that are current and consistent.', '', null, compliance && compliance.documents_pct != null ? '%' : '');
    h += '</div><div class="sh">At a glance</div><div class="g2 analytics-row av-spotlights" style="--cols:4">';
    h += panel('Saudi workforce share', avRing('Saudi nationals', pct, E.nationality_missing ? E.nationality_missing + ' employees have no nationality recorded.' : 'Saudi employees / all active employees.', '#0d9488'), saud.rule || 'Current active headcount; unknown nationality remains in the denominator.');
    h += panel('Workforce movement · 12 months', anCols(AA.movement || [], [['joiners', 'Joined', '#3b82f6'], ['leavers', 'Left', '#e11d48']], 'month'), 'Joining and relieving dates; employees across statuses.');
    h += panel('Learning compliance', avRing('Mandatory completion', mandatory.value, mandatory.sub, '#8b5cf6'), 'Assignment-based completion; not employee coverage.');
    h += panel('Document health', avRing('Current & consistent', compliance ? compliance.documents_pct : null, compliance ? compliance.documents_ok + ' of ' + compliance.documents + ' required documents' : 'Compliance summary unavailable', '#3b82f6'), 'Required documents with a current, non-conflicting expiry date.');
    return h + '</div>';
  }
  function vAnalytics(d) { return '<div data-an-root></div>'; }
  function anAfterRender() {
    var key = JSON.stringify(gfArgs({ as_of: S.f && S.f.to_date }));
    if (AN.key !== key) { AN.data = null; anLoad(key); }
    else if (!AN.data && !AN.busy) anLoad(key); else anRender();
  }
  function anLoad(key) {
    AN.busy = true; AN.err = null; AN.key = key; anRender();
    var seq = ++AN.seq, out = {}, pending = 4, t0 = Date.now();
    var td = (S.f && S.f.to_date) || frappe.datetime.get_today();
    function done(k) { return function (r) { out[k] = r && r.message ? r.message : null; if (--pending === 0 && seq === AN.seq) { AN.busy = false; AN.data = out; AN.ms = Date.now() - t0; anRender(); } }; }
    function fail(k) { return function () { out[k] = { error: true }; if (--pending === 0 && seq === AN.seq) { AN.busy = false; AN.data = out; anRender(); } }; }
    frappe.call({ method: 'admin_hr_leave_data', args: gfArgs({ mode: 'summary', from_date: frappe.datetime.add_months(td, -12), to_date: td }), freeze: false, callback: done('leave'), error: fail('leave') });
    frappe.call({ method: 'admin_hr_compliance_data', args: gfArgs({ mode: 'summary', as_of: td }), freeze: false, callback: done('compliance'), error: fail('compliance') });
    frappe.call({ method: 'admin_hr_training_data', args: gfArgs({ mode: 'summary' }), freeze: false, callback: done('training'), error: fail('training') });
    frappe.call({ method: 'admin_hr_requests_data', args: gfArgs({ mode: 'summary' }), freeze: false, callback: done('requests'), error: fail('requests') });
  }
  function anRender() {
    var root = host.querySelector('[data-an-root]'); if (!root) return;
    var d = S.d, A = AN.data, h = scopeLine('analytics');
    if (!d) { root.innerHTML = h; return; }
    if (AN.busy && !A) { root.innerHTML = h + '<div class="ld"><span class="spin"></span> Loading leave, compliance, training and request summaries…</div>'; return; }
    var E = d.employees, AA = d.analytics, dt = detail();
    var unavailable = function (k) { return !A || !A[k] || A[k].error; };
    var mk = function (title, state, body, def) { return anPanel(title, state, body, def); };
    h += avSummary(d, A);
    h += '<div class="sh">Workforce analytics</div><div class="g2 analytics-row av-detail-row" style="--cols:9">';
    h += mk('1 · Active headcount by department', 'actual', anBars(E.by_department, 'count'), 'Employees with status Active in the selected filters, grouped by Employee.department. Source: Employee.');
    h += mk('2 · Active headcount by branch', 'actual', anBars(E.by_branch, 'count'), 'Active employees by Employee.branch.');
    h += mk('3 · Active headcount by job location', 'actual', anBars(locList(E.by_location), 'count'), 'Active employees by Employee.custom_job_location.');
    h += mk('4 · Nationality distribution', E.nationality_missing ? 'partial' : 'actual', anBars(AA.nationality, 'count'), 'Active employees by custom_employee_nationality. ' + (E.nationality_missing ? E.nationality_missing + ' without nationality.' : ''));
    var sz = AA.saudization || {};
    h += mk('5 · Saudi / non-Saudi ratio', 'partial', '<div class="cpcomp"><div><b>' + num(sz.saudi) + '</b><span>Saudi</span></div><div><b>' + num((sz.total || 0) - (sz.saudi || 0)) + '</b><span>Non-Saudi (incl. not set)</span></div><div><b>' + (sz.pct === null || sz.pct === undefined ? '–' : sz.pct + '%') + '</b><span>Saudi share</span></div></div>', sz.rule || 'Saudi = custom_employee_nationality "Saudi Arabia" / active headcount.');
    h += mk('6 · Monthly new joiners', 'actual', anCols(AA.movement, [['joiners', 'Joiners', '#2563eb']], 'month'), 'Employees (any status) by date_of_joining month, last 12 months.');
    h += mk('7 · Monthly separations', AA.left_without_relieving_date ? 'partial' : 'actual', anCols(AA.movement, [['leavers', 'Separations', '#dc2626']], 'month'), 'Status Left with relieving_date in the month. ' + (AA.left_without_relieving_date ? AA.left_without_relieving_date + ' Left employees have no relieving date and are not counted.' : ''));
    var tn = AA.turnover_note || {};
    h += mk('8 · Monthly turnover rate', tn.state || 'partial', AA.turnover ? anCols(AA.turnover.map(function (x) { return { month: x.month, rate: x.rate, separations: x.separations }; }), [['rate', 'Turnover %', '#f59e0b']], 'month') +
      '<div class="ph">' + AA.turnover.slice(-3).map(function (x) { return esc(x.month) + ': ' + x.separations + ' / avg ' + ((x.headcount_start + x.headcount_end) / 2) + ' = ' + (x.rate === null ? '–' : x.rate + '%'); }).join(' · ') + '</div>' : '<div class="muted">Unavailable</div>', tn.basis || '');
    h += mk('9 · Employment type distribution', 'partial', anBars(E.by_employment_type, 'count'), 'Active employees by employment_type; many records are blank (shown as Not set).');
    h += '</div><div class="sh">Leave analytics</div><div class="g2 analytics-row av-detail-row" style="--cols:' + (unavailable('leave') ? 1 : 2) + '">';
    if (unavailable('leave')) h += mk('10–11 · Leave', 'unavailable', '<div class="muted">Leave summary not available with your permissions.</div>', '');
    else {
      var L = A.leave;
      h += mk('10 · Leave utilisation trend (12 months)', 'actual', anCols(L.analytics.monthly, [['paid', 'Paid days', '#2563eb'], ['lwp', 'Unpaid (LWP) days', '#f59e0b']], 'month'), 'Approved applications (submitted + workflow Approved) by start month; days = total_leave_days. Pending excluded.');
      h += mk('11 · Pending leave approvals by department', 'actual', anBars(L.analytics.pending_by_department, 'count'), 'Applications in a Pending / On-Hold workflow state, by department on the application. Total pending: ' + num((L.kpis.filter(function (k) { return k.key === 'pending'; })[0] || {}).value) + '.');
    }
    h += '</div><div class="sh">HR request analytics</div><div class="g2 analytics-row av-detail-row" style="--cols:' + (unavailable('requests') ? 1 : 3) + '">';
    if (unavailable('requests')) h += mk('12–13 · HR requests', 'unavailable', '<div class="muted">HR request summary not available.</div>', '');
    else {
      var R = A.requests;
      h += mk('12 · HR requests by type', R.meta.unreadable.length ? 'partial' : 'actual', anBars(R.analytics.by_type, 'count', function (x) { return x.suppressed ? '' : x.count + ' · ' + x.open + ' open'; }), 'Readable request DocTypes only' + (R.meta.unreadable.length ? '; not readable for your roles: ' + R.meta.unreadable.join(', ') : '') + '.');
      h += mk('12b · HR requests by department', R.meta.unreadable.length ? 'partial' : 'actual', anBars(R.analytics.type_by_department, 'count', function (x) { var t = x.types || {}; return x.count + ' · ' + Object.keys(t).filter(function (k) { return t[k] !== null; }).slice(0, 2).map(function (k) { return k.split(' ')[0] + ' ' + t[k]; }).join(', '); }), 'Department of the requesting employee (current Employee record).');
      var rk = {}; R.kpis.forEach(function (k) { rk[k.key] = k; });
      h += mk('13 · HR request resolution performance', rk.resolution ? rk.resolution.state : 'unavailable',
        '<div class="cpcomp"><div><b>' + (rk.resolution && rk.resolution.value !== null ? rk.resolution.value + ' d' : '–') + '</b><span>average resolution</span></div><div><b>' + num(rk.overdue ? rk.overdue.value : null) + '</b><span>overdue (> ' + R.meta.sla_days + ' days, provisional)</span></div></div>' +
        anBars(R.analytics.resolution_by_type.map(function (x) { return { label: x.label, avg: x.avg, timed: x.timed, closed: x.closed, suppressed: x.suppressed }; }), 'avg', function (x) { return x.avg === null ? 'unavailable' : x.avg + ' d (' + x.timed + '/' + x.closed + ')'; }),
        (rk.resolution ? rk.resolution.sub + '. ' : '') + 'Resolution = creation → workflow comment for the final state; only workflow-tracked types have a reliable closure date.');
    }
    h += '</div><div class="sh">Training &amp; compliance analytics</div><div class="g2 analytics-row av-detail-row" style="--cols:' + (unavailable('training') ? 2 : 3) + '">';
    if (unavailable('training')) h += mk('14–15 · Training', 'unavailable', '<div class="muted">Training summary not available.</div>', '');
    else {
      var T = A.training, tk = {}; T.kpis.forEach(function (k) { tk[k.key] = k; });
      h += mk('14 · Training completion by department', 'actual', anBars(T.analytics.by_department, 'pct', function (x) { return x.pct === null ? '–' : x.pct + '% (' + x.done + '/' + x.total + ')'; }), 'Completed ÷ video/course assignments, by the employee\'s department.');
      h += mk('15 · Mandatory training compliance', tk.mandatory ? tk.mandatory.state : 'unavailable', '<div class="cpcomp"><div><b>' + (tk.mandatory && tk.mandatory.value !== null ? tk.mandatory.value + '%' : '–') + '</b><span>' + esc(tk.mandatory ? tk.mandatory.sub : '') + '</span></div></div>' +
        anBars(T.analytics.mandatory_items, 'pct', function (x) { return x.pct === null ? '–' : x.pct + '% (' + x.done + '/' + x.total + ')'; }), 'Completed mandatory assignments ÷ mandatory assignments (flag on the assignment).');
    }
    if (unavailable('compliance')) h += mk('16 · Compliance', 'unavailable', '<div class="muted">Compliance summary not available.</div>', '');
    else {
      var C = A.compliance;
      h += mk('16 · Document expiry forecast', 'partial', anCols(C.analytics.forecast.map(function (x) { return { month: x.month, total: x.iqama + x.passport + x.contract + x.insurance, iqama: x.iqama, contract: x.contract }; }), [['total', 'All documents', '#7c3aed'], ['iqama', 'Iqama / ID', '#2563eb'], ['contract', 'Contract', '#0891b2']], 'month') +
        '<div class="ph">Already expired as of ' + esc(C.meta.as_of || C.meta.today) + ': <b>' + num(C.analytics.overdue_now) + '</b> documents. ' + num((C.kpis.filter(function (k) { return k.key === 'missing'; })[0] || {}).value) + ' required documents have no expiry date.</div>',
        'Required documents (Iqama/ID, non-Saudi passport, contract, insurance) by primary expiry month, next 12 months. Partial because of missing dates.');
    }
    h += '</div><div class="sh">HR data-quality summary</div><div class="panel"><div class="tw"><table class="dirtable"><thead><tr><th>Area</th><th>Issue</th><th>Severity</th><th>Records</th></tr></thead><tbody>';
    var rows = [];
    (d.data_quality || []).forEach(function (x) { if (x.count) rows.push(['Employees', x.label, x.severity, x.count]); });
    [['leave', 'Leave'], ['compliance', 'Documents'], ['training', 'Training'], ['requests', 'HR requests']].forEach(function (p) { if (!unavailable(p[0])) (A[p[0]].dq || []).forEach(function (x) { if (x.count) rows.push([p[1], x.label, x.severity, x.count]); }); });
    var SEV = { high: 0, medium: 1, low: 2 };
    rows.sort(function (a, b) { return (SEV[a[2]] - SEV[b[2]]) || (b[3] - a[3]); });
    h += rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td><span class="lvs ' + (r[2] === 'high' ? 'bad' : r[2] === 'medium' ? 'warn' : 'muted') + '">' + esc(r[2]) + '</span></td><td><b>' + num(r[3]) + '</b></td></tr>'; }).join('') +
      '</tbody></table></div><div class="ph" style="margin-top:6px">Open each tab for the matching review list' + (dt ? ' and drill-downs' : '') + '. Nothing is corrected automatically.</div></div>';
    h += '<div class="ph">Data generated: main ' + esc(d.meta.generated_at || '') + (A ? ' · summaries loaded in ' + (AN.ms || 0) + ' ms' : '') + '. Groups smaller than 3 are shown as "&lt;3" in the aggregate view.</div>';
    root.innerHTML = h;
  }
  function opts(list, cur, all, lab) { return (all ? '<option value="">' + all + '</option>' : '') + (list || []).map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(lab ? lab(x) : x) + '</option>'; }).join(''); }
    /* ---------------- Overview: executive redesign (Phase 10, 2026-10-27) ----------------
     Presentation only. Reads the same S.d fields as the classic vOverview (kept below, unused)
     and registers drill-downs with the same reg/spec/kspec/routeFor/empListSpec helpers,
     so counts, permissions and drill targets are unchanged. */
  var XI = {
    users: '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3.5"/><path d="M22 19v-1a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 7.6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.8"/>',
    userx: '<path d="M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="8.5" cy="7" r="3.5"/><path d="M17 8l5 5M22 8l-5 5"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1.5 3h5L16 13h5"/>',
    plus: '<circle cx="9" cy="7" r="3.5"/><path d="M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M19 8v6M16 11h6"/>',
    minus: '<circle cx="9" cy="7" r="3.5"/><path d="M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M16 11h6"/>',
    badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    finger: '<path d="M12 11v3a6 6 0 0 1-1 3.5M8.5 9a4 4 0 0 1 7 2.5V14M6 12a6 6 0 0 1 10.5-4M17.5 17a10 10 0 0 0 .5-3M9 20a9 9 0 0 0 1.5-3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 1.2 14H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 7 2.6 1.7 1.7 0 0 0 10 1.1V1a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    chev: '<path d="M9 6l6 6-6 6"/>'
  };
  function xi(name, tone) {
    return '<span class="xi t-' + tone + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (XI[name] || XI.chart) + '</svg></span>';
  }
  function xn(v, suffix) { var t = num(v); return t === null ? '<span class="xna">—</span>' : t + (suffix || ''); }
  function xpct(a, b) { return (a === null || a === undefined || !b) ? null : Math.round(1000 * a / b) / 10; }
  function xsum(list, f) { var t = 0, ok = true; list.forEach(function (x) { var v = f(x); if (v === null || v === undefined) ok = false; else t += v; }); return ok ? t : null; }
  function xtag(state) { var x = STATE[state] || STATE.unavailable; return '<span class="xtag x-' + x[1] + '">' + x[0] + '</span>'; }
  function xpill(text, tone) { return '<span class="xpill x-' + tone + '">' + esc(text) + '</span>'; }
  // Clickable wrapper: a registered drill (data-dr) or a tab jump (data-tab). Locked/aggregate -> plain.
  function xact(sp, tab) {
    var i = sp ? reg(sp) : null;
    if (i !== null) return { cls: ' click', attr: ' data-dr="' + i + '"' };
    if (tab) return { cls: ' click', attr: ' data-tab="' + tab + '"' };
    return { cls: '', attr: '' };
  }
  function xpanel(title, body, tab, sub) {
    return '<section class="xp"><div class="xph"><h4>' + esc(title) + '</h4>' +
      (tab ? '<button class="xva" data-tab="' + tab + '">View all</button>' : '') + '</div>' +
      (sub ? '<div class="xps">' + esc(sub) + '</div>' : '') + '<div class="xpb">' + body + '</div></section>';
  }
  function xun(text) { return '<div class="xun">' + xpill('Unavailable', 'bad') + '<span>' + esc(text) + '</span></div>'; }
  var XKPI = {
    active: ['users', 'blue', 'Active employees in scope'],
    checked_in: ['check', 'green', 'Distinct employees with a punch today'],
    absent: ['userx', 'red', 'Absences recorded in ERPNext today'],
    on_leave: ['cal', 'orange', 'On approved leave today'],
    late: ['clock', 'purple', 'Late against their shift today'],
    leave_pending: ['clip', 'indigo', 'Leave applications awaiting approval'],
    training: ['cap', 'teal', 'Assignments completed'],
    expiring: ['alert', 'amber', 'Expired or due within 60 days']
  };
  function xKpis(d) {
    return '<div class="xkpis">' + d.overview.map(function (k) {
      var m = XKPI[k.key] || ['chart', 'blue', ''];
      if (k.key === 'absent') { var p = attendancePolicy(d); k = Object.assign({}, k, { label: 'Absent today', value: p.count, state: p.available ? (p.friday ? 'actual' : 'partial') : 'unavailable', note: p.note, sub: 'Approved leave & weekoffs excluded' }); }
      var a = xact(k.key === 'absent' ? absenceSpec(p) : kspec(k));
      var sfx = (k.key === 'training' && k.value !== null && k.value !== undefined) ? '<small>%</small>' : '';
      return '<div class="xk' + a.cls + '"' + a.attr + ' title="' + esc(k.note || '') + '">' + xi(m[0], m[1]) +
        '<div class="xkb"><div class="xkl">' + esc(k.label) + '</div><div class="xkv">' + xn(k.value) + sfx + '</div>' +
        '<div class="xks">' + xtag(k.state) + '<span>' + esc(k.sub || m[2]) + '</span></div></div></div>';
    }).join('') + '</div>';
  }
  function xAttChart(t) {
    if (!t || !t.length) return '<div class="muted">No punch data for this filter.</div>';
    var W = 420, H = 170, L = 30, B = 22, T = 8, max = 0, tot = 0;
    t.forEach(function (x) { if (x.count > max) max = x.count; tot += x.count; });
    var step = max > 200 ? 50 : (max > 80 ? 25 : (max > 20 ? 10 : 5)), top = Math.max(step, Math.ceil(max / step) * step);
    var cw = (W - L - 6) / t.length, bw = Math.max(6, cw * 0.58), avg = tot / t.length;
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var g = '';
    for (var v = 0; v <= top; v += step) g += '<line class="xg" x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="xax" x="' + (L - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v + '</text>';
    var bars = t.map(function (x, i) {
      var cx = L + cw * i + (cw - bw) / 2, last = i === t.length - 1;
      return '<rect class="xbar' + (last ? ' xbar-l' : '') + '" x="' + cx.toFixed(1) + '" y="' + y(x.count).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (H - B - y(x.count)).toFixed(1) + '" rx="2"><title>' + esc(x.date + ': ' + x.count) + '</title></rect>' +
        (((i % 2 === 0 && i < t.length - 2) || last) ? '<text class="xax" x="' + (cx + bw / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(x.label) + '</text>' : '');
    }).join('');
    var line = '<polyline class="xln" points="' + t.map(function (x, i) { return (L + cw * i + cw / 2).toFixed(1) + ',' + y(x.count).toFixed(1); }).join(' ') + '"/>';
    var al = '<line class="xavg" x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(avg).toFixed(1) + '" y2="' + y(avg).toFixed(1) + '"/>';
    return '<div class="xleg"><span><i class="sw t-blue"></i>Employees with a punch</span><span><i class="sw ln"></i>Daily trend</span><span><i class="sw av"></i>14-day average ' + Math.round(avg) + '</span></div>' +
      '<svg class="xchart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Distinct employees with a punch per day">' + g + bars + line + al + '</svg>';
  }
  function xMini(icon, tone, label, value, sub, sp) {
    var a = xact(sp);
    return '<div class="xm' + a.cls + '"' + a.attr + '>' + xi(icon, tone) + '<div><div class="xmv">' + xn(value) + '</div><div class="xml">' + esc(label) + '</div>' + (sub ? '<div class="xmsub">' + esc(sub) + '</div>' : '') + '</div></div>';
  }
  function xRowSpec(title, key, doctype) { var rs = rows(key); return spec(title, rs, routeFor(doctype || 'Employee', rs)); }
  function xAttendance(d) {
    var a = d.attendance, p = attendancePolicy(d);
    if (!a || !a.ok) return xpanel('Attendance Overview', xun('Attendance data could not be read with your permissions.'), 'attendance');
    var act = (ov('active') || {}).value;
    var mini = '<div class="xminis">' +
      xMini('check', 'green', 'Checked in', a.checked_in, xpct(a.checked_in, act) !== null ? xpct(a.checked_in, act) + '% of active' : '', xRowSpec('Checked in today', 'checked_in')) +
      xMini('userx', 'red', 'Absent today', p.count, p.friday ? 'Friday · weekoff' : 'Approved leave & weekoffs excluded', absenceSpec(p)) +
      xMini('clock', 'orange', 'Late', a.late, a.late_evaluated !== null && a.late_evaluated !== undefined ? 'of ' + a.late_evaluated + ' evaluated' : '', xRowSpec('Late check-ins today', 'late')) +
      xMini('cal', 'purple', 'On leave', a.on_leave, 'Approved leave', xRowSpec('On approved leave today', 'on_leave')) +
      xMini('userx', 'red', 'Recorded absences', p.recorded, 'Leave & weekoffs excluded · included above', absenceSpec(p, true)) +
      xMini('finger', 'blue', 'Mobile punches', a.mobile_punches, a.punches_today !== null && a.punches_today !== undefined ? 'of ' + a.punches_today + ' punches' : '', null) +
      '</div>';
    return xpanel('Attendance Overview', xAttChart(a.trend) + mini, 'attendance', 'Biometric and mobile punches, last ' + (a.trend || []).length + ' days');
  }
  function xNeedRow(icon, tone, title, sub, count, sp, tab) {
    var a = xact(sp, tab);
    return '<div class="xn-r' + a.cls + '"' + a.attr + '>' + xi(icon, tone) + '<div class="xn-t"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></div>' +
      '<div class="xn-c t-' + tone + '">' + xn(count) + '</div>' + (a.attr ? '<svg class="xchev" viewBox="0 0 24 24">' + XI.chev + '</svg>' : '<span class="xchev"></span>') + '</div>';
  }
  function xNeeds(d) {
    var exp = [], expN = xsum(d.compliance, function (c) { return c.buckets ? c.buckets.expired : null; });
    d.compliance.forEach(function (c) { exp = exp.concat(rows('exp_' + c.key).filter(function (x) { return x.days_left !== null && x.days_left !== undefined && x.days_left < 0; })); });
    var reqOpen = xsum(d.requests.filter(function (r) { return r.state !== 'unavailable'; }), function (r) { return r.open; });
    var dqHigh = xsum(d.data_quality.filter(function (x) { return x.severity === 'high'; }), function (x) { return x.count; });
    var l = d.leave || {}, t = d.training || {}, a = d.attendance || {};
    var h = '<div class="xneed">' +
      xNeedRow('clip', 'indigo', 'Pending leave approvals', 'Submitted or in workflow, awaiting a decision', l.pending, xRowSpec('Pending leave applications', 'leave_pending', 'Leave Application'), 'leave') +
      xNeedRow('file', 'red', 'Expired documents', 'Iqama/ID, passport, contract, insurance', expN, spec('Expired documents', exp, routeFor('Employee', exp)), 'compliance') +
      xNeedRow('cap', 'orange', 'Training overdue', 'Assigned and past the due date', t.ok ? t.overdue : null, xRowSpec('Training overdue', 'training_overdue'), null) +
      xNeedRow('inbox', 'purple', 'Open HR requests', 'Across the request types you can read', reqOpen, null, 'requests') +
      xNeedRow('alert', 'amber', 'Leave status mismatches', 'Status and workflow state disagree', l.status_mismatch, xRowSpec('Leave status mismatches', 'dq_leave_status_mismatch', 'Leave Application'), 'leave') +
      xNeedRow('shield', 'blue', 'High-severity data issues', 'Total count across high-severity checks', dqHigh, null, 'analytics') +
      '</div>';
    return xpanel('Needs Attention', h, null, 'Items that need an HR action');
  }
  function xDonut(parts, center, sub) {
    var tot = 0; parts.forEach(function (p) { tot += p.v || 0; });
    var acc = 0, stops = parts.map(function (p) { var s = acc; acc += tot ? 360 * (p.v || 0) / tot : 0; return 'var(--' + p.c + ') ' + s.toFixed(1) + 'deg ' + acc.toFixed(1) + 'deg'; });
    var bg = tot ? 'conic-gradient(' + stops.join(',') + ')' : 'var(--xline)';
    return '<div class="xdn"><div class="xdr" style="background:' + bg + '"><div class="xdc"><b>' + center + '</b><span>' + esc(sub) + '</span></div></div>' +
      '<div class="xdl">' + parts.map(function (p) { return '<div><i class="sw" style="background:var(--' + p.c + ')"></i><span>' + esc(p.l) + '</span><b>' + xn(p.v) + '</b><em>' + (tot ? Math.round(100 * (p.v || 0) / tot) + '%' : '') + '</em></div>'; }).join('') + '</div></div>';
  }
  var XC = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  function xLeave(d) {
    var l = d.leave;
    if (!l || !l.ok) return xpanel('Leave & Approvals', xun('Leave Application is not readable with your permissions.'), 'leave');
    function tile(icon, tone, v, label, sp) { var a = xact(sp); return '<div class="xt' + a.cls + '"' + a.attr + '>' + xi(icon, tone) + '<b class="t-' + tone + '">' + xn(v) + '</b><span>' + esc(label) + '</span></div>'; }
    var tiles = '<div class="xtiles">' +
      tile('cal', 'blue', l.on_leave_today, 'On leave today', xRowSpec('On approved leave today', 'on_leave')) +
      tile('clip', 'indigo', l.pending, 'Pending approval', xRowSpec('Pending leave applications', 'leave_pending', 'Leave Application')) +
      tile('clock', 'orange', l.upcoming_30d, 'Starting in 30 days', xRowSpec('Approved leave starting in the next 30 days', 'leave_upcoming', 'Leave Application')) +
      tile('file', 'mut', l.drafts, 'Drafts not submitted', xRowSpec('Draft leave applications', 'leave_drafts', 'Leave Application')) + '</div>';
    var bt = (l.by_type_days_ytd || []).slice().sort(function (a, b) { return b.count - a.count; }), parts = bt.slice(0, 4).map(function (x, i) { return { l: x.label, v: Math.round(x.count * 10) / 10, c: XC[i] }; });
    if (bt.length > 4) parts.push({ l: 'Other', v: Math.round(xsum(bt.slice(4), function (x) { return x.count; }) * 10) / 10, c: 'c6' });
    var tot = xsum(bt, function (x) { return x.count; });
    var donut = bt.length ? '<div class="xsub-h">Leave days by type, year to date</div>' + xDonut(parts, num(Math.round(tot || 0)), 'days') : '<div class="muted">No approved leave days this year.</div>';
    return xpanel('Leave & Approvals', tiles + donut, 'leave');
  }
  function xLifecycle(d) {
    var e = d.employees || {}, since = frappe.datetime.add_months(d.meta.date, -12), pr = e.probation || {};
    function step(icon, tone, v, label, sub, sp) {
      var a = xact(sp);
      return '<div class="xls' + a.cls + '"' + a.attr + '>' + xi(icon, tone) + '<b>' + (v === 'U' ? xpill('Unavailable', 'bad') : xn(v)) + '</b><span>' + esc(label) + '</span><em>' + esc(sub) + '</em></div>';
    }
    var arrow = '<svg class="xarr" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var steps = '<div class="xlife">' +
      step('plus', 'blue', e.joined_this_month, 'New joiners', 'This month', xRowSpec('Joined this month', 'joined_month')) + arrow +
      step('badge', 'orange', pr.state === 'unavailable' ? 'U' : pr.count, 'Probation', pr.state === 'unavailable' ? 'No reliable data' : 'In progress', null) + arrow +
      step('users', 'green', e.active, 'Active', 'On roll', xRowSpec('Active employees', 'active')) + arrow +
      step('minus', 'red', e.leavers_12m, 'Leavers', 'Last 12 months', empListSpec('Leavers', { status: 'Left', relieving_date: ['>=', since] })) + '</div>';
    var jt = e.joining_trend || [], m = 0; jt.forEach(function (x) { if (x.count > m) m = x.count; });
    var trend = jt.length ? '<div class="xsub-h">Joiners per month, last 12 months · ' + xn(e.joiners_12m) + ' total</div><div class="xcols">' + jt.map(function (x) {
      return '<div title="' + esc(x.label + ': ' + x.count) + '"><span>' + x.count + '</span><i style="height:' + (m ? Math.max(3, 70 * x.count / m) : 3) + 'px"></i><em>' + esc(String(x.label).slice(5)) + '</em></div>';
    }).join('') + '</div>' : '';
    var note = pr.state === 'unavailable' ? '<div class="xnote">' + esc(pr.note || 'Probation data is not reliable.') + '</div>' : '';
    return xpanel('Employee Lifecycle', steps + trend + note, 'employees');
  }
  function xTraining(d) {
    var t = d.training;
    if (!t || !t.ok) return xpanel('Training & Development', xun('Training records are not readable with your permissions.'), null);
    var notDue = (t.assignments !== null && t.completed !== null && t.overdue !== null) ? Math.max(0, t.assignments - t.completed - t.overdue) : null;
    var parts = [{ l: 'Completed', v: t.completed, c: 'ok' }, { l: 'Open, not yet due', v: notDue, c: 'acc' }, { l: 'Overdue', v: t.overdue, c: 'bad' }];
    function tile(icon, tone, v, label, sp) { var a = xact(sp); return '<div class="xt' + a.cls + '"' + a.attr + '>' + xi(icon, tone) + '<b class="t-' + tone + '">' + xn(v) + '</b><span>' + esc(label) + '</span></div>'; }
    return xpanel('Training & Development', xDonut(parts, t.pct === null || t.pct === undefined ? '—' : t.pct + '%', 'completion') +
      '<div class="xtiles">' + tile('cap', 'blue', t.assignments, 'Assignments', xRowSpec('All training assignments', 'training_all')) +
      tile('check', 'green', t.completed, 'Completed', null) + tile('alert', 'red', t.overdue, 'Overdue', xRowSpec('Training overdue', 'training_overdue')) +
      tile('users', 'mut', t.employees_not_assigned, 'Employees not assigned', null) + '</div>', null, 'Employee Training Progress');
  }
  function xAnalytics(d) {
    var an = d.analytics || {}, sz = an.saudization, e = d.employees || {};
    var h = '';
    if (sz && sz.pct !== null && sz.pct !== undefined) {
      h += '<div class="xsz"><div><div class="xsub-h">Saudization (provisional)</div><b>' + sz.pct + '%</b><span>' + xn(sz.saudi) + ' Saudi of ' + xn(sz.total) + ' active</span></div>' +
        '<div class="xbarh"><i style="width:' + Math.min(100, sz.pct) + '%"></i></div></div>';
    } else h += xun('Saudization cannot be calculated for this filter.');
    var g = e.by_gender || [], gt = xsum(g, function (x) { return x.count; });
    if (g.length && gt) h += '<div class="xsub-h">Gender</div><div class="xstack">' + g.map(function (x, i) { return '<i class="' + XC[i] + '" style="width:' + (100 * x.count / gt) + '%" title="' + esc(x.label + ': ' + x.count) + '"></i>'; }).join('') + '</div>' +
      '<div class="xleg">' + g.map(function (x, i) { return '<span><i class="sw ' + XC[i] + '"></i>' + esc(x.label) + ' ' + x.count + ' (' + Math.round(100 * x.count / gt) + '%)</span>'; }).join('') + '</div>';
    var dep = (e.by_department || []).slice(0, 5), m = 0; dep.forEach(function (x) { if (x.count > m) m = x.count; });
    if (dep.length) h += '<div class="xsub-h">Largest departments (active headcount)</div><div class="xhb">' + dep.map(function (x) {
      var a = xact(empListSpec('Department: ' + x.label, { department: x.label }));
      return '<div class="xhr' + a.cls + '"' + a.attr + ' title="' + esc(x.label) + '"><span>' + esc(String(x.label).replace(/ - DMG$/, '')) + '</span><i><b style="width:' + (m ? 100 * x.count / m : 0) + '%"></b></i><em>' + x.count + '</em></div>';
    }).join('') + '</div>';
    return xpanel('HR Analytics Snapshot', h, 'analytics');
  }
  function xCompliance(d) {
    var c = d.compliance || [];
    var ex = xsum(c, function (x) { return x.buckets ? x.buckets.expired : null; }), d30 = xsum(c, function (x) { return x.buckets ? x.buckets.d30 : null; }), d60 = xsum(c, function (x) { return x.buckets ? x.buckets.d60 : null; });
    var stats = '<div class="xtiles x3">' +
      '<div class="xt">' + xi('alert', 'red') + '<b class="t-red">' + xn(ex) + '</b><span>Expired</span></div>' +
      '<div class="xt">' + xi('clock', 'orange') + '<b class="t-orange">' + xn(d30) + '</b><span>Due in 30 days</span></div>' +
      '<div class="xt">' + xi('cal', 'amber') + '<b class="t-amber">' + xn(d60) + '</b><span>Due in 31–60 days</span></div></div>';
    var tb = '<div class="xtw"><table class="xtb"><thead><tr><th>Document</th><th class="r">Expired</th><th class="r">≤30d</th><th class="r">31–60d</th><th class="r">Missing</th><th>Status</th></tr></thead><tbody>' +
      c.map(function (r) {
        var b = r.buckets || {}, rs = rows('exp_' + r.key).filter(function (x) { return x.days_left <= 60; });
        var a = xact(spec(r.label + ' — expired or due ≤60 days', rs, routeFor('Employee', rs)));
        var st = r.state === 'unavailable' ? xpill('Unavailable', 'bad') : (b.expired ? xpill('Expired', 'bad') : (b.d30 ? xpill('Due ≤30d', 'warn') : xpill('OK', 'ok')));
        return '<tr class="' + a.cls + '"' + a.attr + '><td>' + esc(r.label) + '</td><td class="r">' + xn(b.expired) + '</td><td class="r">' + xn(b.d30) + '</td><td class="r">' + xn(b.d60) + '</td><td class="r">' + xn(b.missing) + '</td><td>' + st + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return xpanel('Documents & Compliance', stats + tb, 'compliance', 'Counts only. Document numbers are never shown here.');
  }
  function xRequests(d) {
    var r = d.requests || [], rd = r.filter(function (x) { return x.state !== 'unavailable'; }), un = r.length - rd.length;
    var open = xsum(rd, function (x) { return x.open; }), oldest = null;
    rd.forEach(function (x) { if (x.open && x.oldest_days !== null && x.oldest_days !== undefined && (oldest === null || x.oldest_days > oldest)) oldest = x.oldest_days; });
    var ro = rows('requests_open');
    var stats = '<div class="xtiles x3">' +
      '<div class="xt">' + xi('inbox', 'purple') + '<b class="t-purple">' + xn(open) + '</b><span>Open requests</span></div>' +
      '<div class="xt">' + xi('clock', 'orange') + '<b class="t-orange">' + xn(oldest) + '</b><span>Oldest open (days)</span></div>' +
      '<div class="xt">' + xi('shield', 'mut') + '<b>' + xn(rd.length) + '<small>/' + r.length + '</small></b><span>Types readable</span></div></div>';
    var tb = '<div class="xtw"><table class="xtb"><thead><tr><th>Request type</th><th class="r">Open</th><th class="r">Oldest</th><th>Status</th></tr></thead><tbody>' +
      r.map(function (x) {
        if (x.state === 'unavailable') return '<tr><td>' + esc(x.doctype) + '</td><td class="r">—</td><td class="r">—</td><td>' + xpill('Unavailable', 'mut') + '</td></tr>';
        var rs = ro.filter(function (y) { return y.doctype === x.doctype; });
        var a = x.open ? xact(spec(x.doctype + ' — open', rs, { doctype: x.doctype, options: { name: ['in', uniq(rs.map(function (y) { return y.name; }))] } })) : { cls: '', attr: '' };
        var st = !x.open ? xpill('Clear\u200b', 'ok') : xpill('Open', 'warn');
        return '<tr class="' + a.cls + '"' + a.attr + '><td>' + esc(x.doctype) + '</td><td class="r">' + xn(x.open) + '</td><td class="r">' + (x.open ? xn(x.oldest_days) + 'd' : '—') + '</td><td>' + st + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return xpanel('HR Requests / Employee Relations', stats + tb + (un ? '<div class="xnote">' + un + ' request type' + (un > 1 ? 's are' : ' is') + ' not readable with your permissions and not counted.</div>' : ''), 'requests', 'Counts and ages only — no request contents');
  }
  function xOps(d) {
    var e = d.employees || {}, a = d.attendance || {}, act = e.active;
    var sv = { high: 0, medium: 1, low: 2 };
    var dq = d.data_quality.filter(function (x) { return x.count > 0; }).sort(function (p, q) { return (sv[p.severity] - sv[q.severity]) || (q.count - p.count); }).slice(0, 5);
    var stats = '<div class="xtiles x3">' +
      '<div class="xt">' + xi('users', 'blue') + '<b class="t-blue">' + xn(e.with_user) + '<small>/' + xn(act) + '</small></b><span>Linked to a user</span></div>' +
      '<div class="xt">' + xi('finger', 'green') + '<b class="t-green">' + xn(a.punches_today) + '</b><span>Punches today</span></div>' +
      '<div class="xt">' + xi('gear', 'mut') + '<b>' + xn(e.departments_count) + '</b><span>Departments</span></div></div>';
    var tb = dq.length ? '<div class="xsub-h">Top data-quality issues</div><div class="xtw"><table class="xtb"><thead><tr><th>Issue</th><th class="r">Count</th><th>Level</th></tr></thead><tbody>' + dq.map(function (x) {
      var rs = dqRows(x.key), aa = xact(rs.length ? spec(x.label, rs, routeFor(x.key === 'leave_status_mismatch' ? 'Leave Application' : 'Employee', rs)) : null);
      return '<tr class="' + aa.cls + '"' + aa.attr + '><td>' + esc(x.label) + '</td><td class="r">' + xn(x.count) + '</td><td>' + xpill(x.severity, x.severity === 'high' ? 'bad' : (x.severity === 'medium' ? 'warn' : 'mut')) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="muted">No data-quality issues found.</div>';
    return xpanel('HR Operations Summary', stats + tb, 'analytics');
  }
  function xoOverview(d) {
    var h = '';
    if (!d.attendance.absence_reliable) h += '<div class="alert w"><b>Attendance reliability:</b> ' + esc(d.system_status.holiday_lists.note) + ' ' + esc(d.system_status.auto_attendance.note) + ' Missing punches are therefore <b>not</b> counted as absences.</div>';
    h += '<div class="xo">' + xKpis(d) +
      '<div class="xrow">' + xAttendance(d) + xNeeds(d) + xLeave(d) + '</div>' +
      '<div class="xrow">' + xLifecycle(d) + xTraining(d) + xAnalytics(d) + '</div>' +
      '<div class="xrow">' + xCompliance(d) + xRequests(d) + xOps(d) + '</div>' +
      '<details class="xhelp"><summary>How to read this dashboard</summary>' + legend() + '</details></div>';
    return h;
  }
  var VIEWS = { overview: xoOverview, employees: vEmployees, attendance: vAttendance, leave: vLeave, compliance: vCompliance, requests: vRequests, analytics: vAnalytics, training: vTraining };
  function render() {
    DR = [];
    var d = S.d, h = '<div class="tabs" role="tablist">' + TABS.map(function (t) { return '<button class="tab' + (S.tab === t[0] ? ' on' : '') + '" role="tab" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') +
      '<button class="tab ahd-lang" data-a="lang" type="button" aria-label="' + (S.lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية') + '">' + (S.lang === 'ar' ? 'English' : 'العربية') + '</button></div>';
    h += '<div class="hd"><div><div class="meta">';
    if (d) h += esc(d.meta.company) + ' · as of ' + esc(d.meta.date) + ' · updated ' + esc(d.meta.generated_at.slice(11, 16)) + '<span class="tier ' + (detail() ? 'd">Full HR view' : 'a">Aggregate view') + '</span>';
    h += '</div></div></div>';
    var fo = d ? d.meta.filter_options : {};
    h += '<div class="flt"><label>Company<select data-f="company">' + opts(fo.companies || [S.f.company], S.f.company) + '</select></label>' +
      '<label>Branch<select data-f="branch">' + opts(fo.branches, S.f.branch, 'All branches') + '</select></label>' +
      '<label>Job location<select data-f="job_location">' + opts(fo.job_locations, S.f.job_location, 'All locations', locName) + '</select></label>' +
      '<label>Department<select data-f="department">' + opts(fo.departments, S.f.department, 'All departments') + '</select></label>' +
     '<label style="max-width:170px">From Date<input type="date" data-f="from_date" value="' + esc(S.f.from_date) + '" max="' + esc(S.f.to_date) + '"></label>' +
'<label style="max-width:170px">To Date<input type="date" data-f="to_date" value="' + esc(S.f.to_date) + '" min="' + esc(S.f.from_date) + '" max="' + frappe.datetime.get_today() + '"></label>' +
      '<button class="btn" data-a="refresh">' + (S.busy ? 'Loading…' : 'Refresh') + '</button><button class="btn s" data-a="reset">Reset</button></div>';
    if (S.err) h += '<div class="alert e">' + esc(S.err) + '</div>';
    if (!d) h += '<div class="ld">' + (S.busy ? 'Loading live ERPNext data…' : '') + '</div>';
    else {
      if (d.meta.errors && d.meta.errors.length) h += '<div class="alert i">Not readable with your permissions (shown as Unavailable): ' + esc(d.meta.errors.map(function (x) { return x.doctype; }).join(', ')) + '</div>';
      try { if (['overview', 'employees', 'attendance'].indexOf(S.tab) >= 0) h += scopeLine(S.tab); h += (VIEWS[S.tab] || xoOverview)(d); } catch (e) { console.error(e); h += '<div class="alert e">Could not render this tab: ' + esc(e.message) + '</div>'; }
    }
    host.innerHTML = h;
    applyLang();
    if (S.d && S.tab === 'employees') dirAfterRender();
    if (S.d && S.tab === 'leave') lvAfterRender();
    if (S.d && S.tab === 'compliance') cpAfterRender();
    if (S.d && S.tab === 'training') trAfterRender();
    if (S.d && S.tab === 'requests') rqAfterRender();
    if (S.d && S.tab === 'analytics') anAfterRender();
  }
  function enhanceDashboardControls() {
    host.querySelectorAll('.click[data-dr], .card.click, .hr.click, .lvbr.click, .lvmcol.click, .lvcc.click, .cpchip.click, .lvbr.click, .lvmcol.click').forEach(function (el) {
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    });
    host.querySelectorAll('[role="tab"]').forEach(function (el) { el.setAttribute('aria-selected', el.classList.contains('on') ? 'true' : 'false'); });
    host.querySelectorAll('.kpi-row, .analytics-row').forEach(function (el) {
      el.tabIndex = 0; el.setAttribute('role', 'region');
      el.setAttribute('aria-label', el.classList.contains('kpi-row') ? 'Key performance indicators; scroll horizontally for more' : 'Analytics; scroll horizontally for more');
    });
  }
  host.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var el = event.target;
    if (el.matches && el.matches('.click[role="button"]') && !/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(el.tagName)) {
      event.preventDefault(); el.click();
    }
  });
  var controlEnhancer = new MutationObserver(function (mutations) {
    if (mutations.some(function (m) { return m.addedNodes.length; })) enhanceDashboardControls();
  });
  controlEnhancer.observe(host, { childList: true, subtree: true });
  var dashboardRequestId = 0;
  function load() {
    if (S.f.from_date && S.f.to_date && S.f.from_date > S.f.to_date) {
        S.err = 'From Date cannot be later than To Date.';
        render();
        return;
    }

    try {
        sessionStorage.setItem('ahd_f', JSON.stringify({
            company: S.f.company,
            branch: S.f.branch,
            job_location: S.f.job_location,
            department: S.f.department,
            from_date: S.f.from_date,
            to_date: S.f.to_date
        }));
    } catch (e) {}

    var requestId = ++dashboardRequestId;
    S.busy = true;
    S.err = null;
    render();

    frappe.call({
        method: 'admin_hr_dashboard_data',
        args: Object.assign({}, S.f),
        freeze: false,
        callback: function (r) {
            if (requestId !== dashboardRequestId) return;
            S.busy = false;
            S.d = r.message || null;
            DIR.data = null;
            DIR.opts = null;
            RQ.sum = null;
            RQ.L.data = null;
            TR.sum = null;
            TR.L.data = null;
            LV.sum = null;
            LV.L.data = null;
            CP.sum = null;
            CP.L.data = null;
            AN.seq++; AN.busy = false; AN.data = null; AN.key = '';

            if (S.d) {
                S.f.company = S.d.meta.company;
            }
            render();
        },
        error: function () {
            if (requestId !== dashboardRequestId) return;
            S.busy = false;
            S.err = 'Could not load dashboard data. Check permissions and the server script.';
            render();
        }
    });
}
  /* ---- Phase 8: CSV export (HR Manager / HR User only; same permission-checked list APIs, max 2,000 rows) ---- */
  function csvCell(v) { var s = v === null || v === undefined ? '' : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }
  function exportRows(method, args, cols, fname) {
    if (!detail()) return;
    var all = [], page = 1;
    frappe.show_alert({ message: T('Preparing export…'), indicator: 'blue' });
    function next() {
      frappe.call({ method: method, args: Object.assign({}, args, { page: page, page_length: 100 }), freeze: false,
        callback: function (r) {
          var m = r.message || {}; all = all.concat(m.rows || []);
          if (page < (m.pages || 1) && page < 20) { page++; next(); return; }
          var csv = cols.map(function (c) { return csvCell(c[1]); }).join(',') + '\n' + all.map(function (row) { return cols.map(function (c) { return csvCell(c[0] === 'job_location' ? locName(row[c[0]]) : row[c[0]]); }).join(','); }).join('\n');
          var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = fname + '_' + frappe.datetime.get_today() + '.csv'; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
          frappe.show_alert({ message: T('Exported ' + all.length + ' rows' + ((m.pages || 1) > 20 ? ' (first 2,000)' : '')), indicator: 'green' });
        },
        error: function () { frappe.show_alert({ message: T('Export failed or not permitted.'), indicator: 'red' }); } });
    }
    next();
  }
  host.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-export]'); if (!t) return;
    var k = t.dataset.export;
    if (k === 'dir') exportRows('admin_hr_employee_directory', Object.assign({}, DIR.f, { company: DIR.f.company || S.d.meta.company, sort_by: DIR.sort, sort_order: DIR.order }), DIR_COLS.map(function (c) { return [c[0], c[1]]; }), 'employees');
    else if (k === 'leave') exportRows('admin_hr_leave_data', lvArgs(Object.assign({ mode: 'list', preset: LV.L.preset, sort_by: LV.L.sort, sort_order: LV.L.order }, LV.L.f, LV.L.extra)), LV_COLS.map(function (c) { return [c[0], c[1]]; }).concat([['cls', 'Classification']]), 'leave_applications');
    else if (k === 'cp') exportRows('admin_hr_compliance_data', cpArgs(Object.assign({ mode: 'list', preset: CP.L.preset, sort_by: CP.L.sort, sort_order: CP.L.order }, CP.L.f)), CP_COLS.map(function (c) { return [c[0], c[1]]; }).concat([['conflict', 'Conflict'], ['unusual', 'Unusual']]), 'compliance');
    else if (k === 'tr') exportRows('admin_hr_training_data', trArgs(Object.assign({ mode: 'list', preset: TR.L.preset, sort_by: TR.L.sort, sort_order: TR.L.order }, TR.L.f)), TR_COLS.map(function (c) { return [c[0], c[1]]; }).concat([['kind', 'Kind']]), 'training');
    else if (k === 'rq') exportRows('admin_hr_requests_data', rqArgs(Object.assign({ mode: 'list', preset: RQ.L.preset, sort_by: RQ.L.sort, sort_order: RQ.L.order }, RQ.L.f)), RQ_COLS.filter(function (c) { return c[0] !== 'priority'; }).map(function (c) { return [c[0], c[1]]; }).concat([['state', 'Source state'], ['doctype', 'DocType']]), 'hr_requests');
  });
  var rqSearchT = null;
  host.addEventListener('input', function (ev) { var ds = ev.target.dataset || {}; if (ds.rqf === 'search') { RQ.L.f.search = ev.target.value; clearTimeout(rqSearchT); rqSearchT = setTimeout(function () { RQ.L.page = 1; rqList(); }, 350); } });
  host.addEventListener('change', function (ev) {
    var ds = ev.target.dataset || {};
    if (ds.rqf === 'company') { RQ.company = ev.target.value; RQ.sum = null; RQ.L.data = null; rqLoad(); return; }
    if (ds.rqf && ds.rqf !== 'search') { RQ.L.f[ds.rqf] = ev.target.value.trim(); RQ.L.page = 1; rqList(); }
    if (ds.rqpl) { RQ.L.pl = parseInt(ev.target.value, 10) || 25; RQ.L.page = 1; rqList(); }
  });
  host.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) return;
    var t = ev.target.closest('[data-rqpre],[data-rqsort],[data-rqpage],[data-rqview],[data-rqa]'); if (!t) return;
    var ds = t.dataset, L = RQ.L;
    if (ds.rqpre !== undefined) {
      var f = {};
      if (ds.rqtype) f.type = ds.rqtype; if (ds.rqdept) f.department = ds.rqdept; if (ds.rqbranch) f.branch = ds.rqbranch; if (ds.rqst) f.status = ds.rqst;
      if (ds.rqage) f.age_bucket = ds.rqage; if (ds.rqfrom) f.range_from = ds.rqfrom; if (ds.rqto) f.range_to = ds.rqto;
      rqPreset(ds.rqpre, ds.rqt, f);
    } else if (ds.rqsort) { if (L.sort === ds.rqsort) L.order = L.order === 'asc' ? 'desc' : 'asc'; else { L.sort = ds.rqsort; L.order = 'asc'; } L.page = 1; rqList(); }
    else if (ds.rqpage) { var p = L.page, n = L.data ? L.data.pages : 1; L.page = ds.rqpage === 'first' ? 1 : ds.rqpage === 'prev' ? Math.max(1, p - 1) : ds.rqpage === 'next' ? Math.min(n, p + 1) : n; rqList(); }
    else if (ds.rqview) openRequest(ds.rqview);
    else if (ds.rqa === 'clearpreset') rqPreset('', 'All HR requests', {});
    else if (ds.rqa === 'clearf') { L.f = RQ_EMPTY_F(); L.page = 1; rqList(); }
    else if (ds.rqa === 'refresh') { RQ.sum = null; RQ.L.data = null; rqLoad(); }
  });
  var trSearchT = null;
  host.addEventListener('input', function (ev) { var ds = ev.target.dataset || {}; if (ds.trf === 'search') { TR.L.f.search = ev.target.value; clearTimeout(trSearchT); trSearchT = setTimeout(function () { TR.L.page = 1; trList(); }, 350); } });
  host.addEventListener('change', function (ev) {
    var ds = ev.target.dataset || {};
    if (ds.trf === 'company') { TR.company = ev.target.value; TR.sum = null; TR.L.data = null; trLoad(); return; }
    if (ds.trf && ds.trf !== 'search') { TR.L.f[ds.trf] = ev.target.value.trim(); TR.L.page = 1; if (ds.trf !== 'date_field' || TR.L.f.range_from || TR.L.f.range_to) trList(); }
    if (ds.trpl) { TR.L.pl = parseInt(ev.target.value, 10) || 25; TR.L.page = 1; trList(); }
  });
  host.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) return;
    var t = ev.target.closest('[data-trpre],[data-trsort],[data-trpage],[data-trview],[data-tra]'); if (!t) return;
    var ds = t.dataset, L = TR.L;
    if (ds.trpre !== undefined) {
      var f = {};
      if (ds.trdept) f.department = ds.trdept; if (ds.trdesig) f.designation = ds.trdesig; if (ds.tritem) f.item = ds.tritem;
      if (ds.trdf) f.date_field = ds.trdf; if (ds.trfrom) f.range_from = ds.trfrom; if (ds.trto) f.range_to = ds.trto;
      trPreset(ds.trpre, ds.trt, f);
    } else if (ds.trsort) { if (L.sort === ds.trsort) L.order = L.order === 'asc' ? 'desc' : 'asc'; else { L.sort = ds.trsort; L.order = 'asc'; } L.page = 1; trList(); }
    else if (ds.trpage) { var p = L.page, n = L.data ? L.data.pages : 1; L.page = ds.trpage === 'first' ? 1 : ds.trpage === 'prev' ? Math.max(1, p - 1) : ds.trpage === 'next' ? Math.min(n, p + 1) : n; trList(); }
    else if (ds.trview) openTraining(ds.trview);
    else if (ds.tra === 'clearpreset') trPreset('', 'All training assignments', {});
    else if (ds.tra === 'clearf') { L.f = TR_EMPTY_F(); L.page = 1; trList(); }
    else if (ds.tra === 'refresh') { TR.sum = null; TR.L.data = null; trLoad(); }
  });
  var cpSearchT = null;
  host.addEventListener('input', function (ev) { var ds = ev.target.dataset || {}; if (ds.cpf === 'search') { CP.L.f.search = ev.target.value; clearTimeout(cpSearchT); cpSearchT = setTimeout(function () { CP.L.page = 1; cpList(); }, 350); } });
  host.addEventListener('change', function (ev) {
    var ds = ev.target.dataset || {};
    if (ds.cpf === 'company') { CP.company = ev.target.value; CP.sum = null; CP.L.data = null; cpLoad(); return; }
    if (ds.cpf && ds.cpf !== 'search') { CP.L.f[ds.cpf] = ev.target.value; CP.L.page = 1; cpList(); }
    if (ds.cppl) { CP.L.pl = parseInt(ev.target.value, 10) || 25; CP.L.page = 1; cpList(); }
  });
  host.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) return;
    var t = ev.target.closest('[data-cppre],[data-cpsort],[data-cppage],[data-cpview],[data-cpa]'); if (!t) return;
    var ds = t.dataset, L = CP.L;
    if (ds.cppre !== undefined) {
      var f = {};
      if (ds.cpdoc) f.doc = ds.cpdoc; if (ds.cpst) f.status = ds.cpst; if (ds.cpdept) f.department = ds.cpdept; if (ds.cpbranch) f.branch = ds.cpbranch;
      if (ds.cpfrom) f.range_from = ds.cpfrom; if (ds.cpto) f.range_to = ds.cpto;
      cpPreset(ds.cppre, ds.cpt, f);
    } else if (ds.cpsort) { if (L.sort === ds.cpsort) L.order = L.order === 'asc' ? 'desc' : 'asc'; else { L.sort = ds.cpsort; L.order = 'asc'; } L.page = 1; cpList(); }
    else if (ds.cppage) { var p = L.page, n = L.data ? L.data.pages : 1; L.page = ds.cppage === 'first' ? 1 : ds.cppage === 'prev' ? Math.max(1, p - 1) : ds.cppage === 'next' ? Math.min(n, p + 1) : n; cpList(); }
    else if (ds.cpview) openCompliance(ds.cpview, ds.cpd);
    else if (ds.cpa === 'clearpreset') cpPreset('', 'All required documents', {});
    else if (ds.cpa === 'clearf') { L.f = CP_EMPTY_F(); L.page = 1; cpList(); }
    else if (ds.cpa === 'refresh') { CP.sum = null; CP.L.data = null; cpLoad(); }
  });
  var lvSearchT = null;
  host.addEventListener('input', function (ev) { var ds = ev.target.dataset || {}; if (ds.lvf === 'search') { LV.L.f.search = ev.target.value; clearTimeout(lvSearchT); lvSearchT = setTimeout(function () { LV.L.page = 1; lvList(); }, 350); } });
  host.addEventListener('change', function (ev) {
    var ds = ev.target.dataset || {};
    if (ds.lvf && ds.lvf !== 'search' && ds.lvf !== 'company') { LV.L.f[ds.lvf] = ev.target.value.trim(); LV.L.page = 1; lvList(); }
    if (ds.lvf === 'company') { LV.f.company = ev.target.value; LV.sum = null; LV.L.data = null; CP.sum = null; CP.L.data = null; lvLoad(); }
    if (ds.lvpl) { LV.L.pl = parseInt(ev.target.value, 10) || 25; LV.L.page = 1; lvList(); }
  });
  host.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) return;
    var t = ev.target.closest('[data-lvpre],[data-lvnoalloc],[data-lvmonth],[data-lvday],[data-lvcal],[data-lvsort],[data-lvpage],[data-lvview],[data-lva]'); if (!t) return;
    var ds = t.dataset, L = LV.L;
    if (ds.lvpre !== undefined) {
      var f = {}, x = {};
      if (ds.lvdept) f.department = ds.lvdept; if (ds.lvtype) f.leave_type = ds.lvtype; if (ds.lvws) f.workflow_state = ds.lvws; if (ds.lvage) x.age_bucket = ds.lvage;
      lvPreset(ds.lvpre, ds.lvt, x, f);
    } else if (ds.lvnoalloc !== undefined) lvNoAlloc(ds.lvnoalloc);
    else if (ds.lvmonth) { var mr = lvMonthRange(ds.lvmonth); lvPreset('kpi_used', 'Approved leave starting in ' + ds.lvmonth, { from_date: mr[0], to_date: mr[1] }); }
    else if (ds.lvday) lvPreset('day', 'On approved leave · ' + ds.lvday, { day: ds.lvday });
    else if (ds.lvcal) { var c = new Date(LV.cal + '-01T00:00:00'); c.setMonth(c.getMonth() + parseInt(ds.lvcal, 10)); LV.cal = c.getFullYear() + '-' + String(c.getMonth() + 1).padStart(2, '0'); lvLoad(); }
    else if (ds.lvsort) { if (L.sort === ds.lvsort) L.order = L.order === 'asc' ? 'desc' : 'asc'; else { L.sort = ds.lvsort; L.order = 'asc'; } L.page = 1; lvList(); }
    else if (ds.lvpage) { var p = L.page, n = L.data ? L.data.pages : 1; L.page = ds.lvpage === 'first' ? 1 : ds.lvpage === 'prev' ? Math.max(1, p - 1) : ds.lvpage === 'next' ? Math.min(n, p + 1) : n; lvList(); }
    else if (ds.lvview) openLeave(ds.lvview);
    else if (ds.lva === 'clearpreset') lvPreset('', 'All leave applications', {}, {});
    else if (ds.lva === 'clearf') { L.f = { search: '', department: '', employee: '', leave_type: '', status: '', workflow_state: '', range_from: '', range_to: '' }; L.page = 1; lvList(); }
    else if (ds.lva === 'apply' || ds.lva === 'ytd' || ds.lva === 'month') {
      var td = (LV.sum && LV.sum.meta.today) || frappe.datetime.get_today();
      if (ds.lva === 'apply') { var a = host.querySelector('[data-lvp-from]'), b = host.querySelector('[data-lvp-to]'); LV.f.from_date = a ? a.value : ''; LV.f.to_date = b ? b.value : ''; }
      else if (ds.lva === 'ytd') { LV.f.from_date = td.slice(0, 4) + '-01-01'; LV.f.to_date = td; }
      else { LV.f.from_date = td.slice(0, 7) + '-01'; LV.f.to_date = lvMonthRange(td.slice(0, 7))[1]; }
      if (LV.f.from_date && LV.f.to_date && LV.f.from_date > LV.f.to_date) { frappe.msgprint(T('Period start must be before the end.')); return; }
      LV.L.data = null; lvLoad();
    }
  });
  host.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) return;
    var t = ev.target.closest('[data-tab],[data-dr],[data-a]');
    if (!t) return;
    if (t.dataset.tab) { S.tab = t.dataset.tab; try { localStorage.setItem('ahd_tab', S.tab); } catch (e) {} render(); return; }
    if (t.dataset.dr !== undefined) { openDrill(DR[+t.dataset.dr]); return; }
    if (t.dataset.a === 'refresh') load();
    if (t.dataset.a === 'reset') { S.f.branch = ''; S.f.job_location = ''; S.f.department = ''; S.f.to_date = frappe.datetime.get_today(); S.f.from_date = frappe.datetime.add_months(S.f.to_date, -1); load(); }
  });
  host.addEventListener('change', function (ev) { var f = ev.target.dataset && ev.target.dataset.f; if (f) { S.f[f] = ev.target.value; load(); } });
  var dirSearchT = null;
  host.addEventListener('input', function (ev) { var ds = ev.target.dataset || {}; if (ds.dirf === 'search') { DIR.f.search = ev.target.value; clearTimeout(dirSearchT); dirSearchT = setTimeout(function () { DIR.page = 1; dirLoad(false); }, 350); } });
  host.addEventListener('change', function (ev) { var ds = ev.target.dataset || {};
    if (ds.dirf && ds.dirf !== 'search') { DIR.f[ds.dirf] = ev.target.value; DIR.page = 1; dirLoad(ds.dirf === 'company' || ds.dirf === 'status'); }
    if (ds.dirpl) { DIR.pl = parseInt(ev.target.value, 10) || 25; DIR.page = 1; dirLoad(false); } });
  host.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) return;
    var t = ev.target.closest('[data-dirsort],[data-dirpage],[data-dirview],[data-dira]'); if (!t) return;
    var ds = t.dataset;
    if (ds.dirsort) { if (DIR.sort === ds.dirsort) DIR.order = DIR.order === 'asc' ? 'desc' : 'asc'; else { DIR.sort = ds.dirsort; DIR.order = 'asc'; } DIR.page = 1; dirLoad(false); }
    else if (ds.dirpage) { var p = DIR.page, n = DIR.data ? DIR.data.pages : 1; DIR.page = ds.dirpage === 'first' ? 1 : ds.dirpage === 'prev' ? Math.max(1, p - 1) : ds.dirpage === 'next' ? Math.min(n, p + 1) : n; dirLoad(false); }
    else if (ds.dirview) { openEmployee(ds.dirview); }
    else if (ds.dira === 'reset') { DIR.f = { search: '', company: '', department: '', designation: '', branch: '', job_location: '', nationality: '', status: 'Active' }; DIR.page = 1; dirLoad(true); }
  });
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-a="lang"]'); if (!b) return;
    var nl = S.lang === 'ar' ? 'en' : 'ar'; b.disabled = true; frappe.xcall('frappe.client.set_value', {doctype: 'User', name: frappe.session.user, fieldname: 'language', value: nl}).then(function () { location.reload(); }).catch(function () { b.disabled = false; });
  });
  locLoad();
  load();
})();