/* ===== DM Group KSA — Admin & HR Dashboard — SCRIPT field · v4 =====
   Moves v3 onto the DM dashboard standard. Read-only. The seven Server Script APIs are called unchanged:
   admin_hr_dashboard_data (overview, employees, attendance, analytics, actions), admin_hr_employee_directory and
   admin_hr_employee_detail (directory and employee panel, HR Manager / HR User only), and admin_hr_leave_data,
   admin_hr_compliance_data, admin_hr_training_data, admin_hr_requests_data (summary + paged list each).
   Kept from v3: permissions and the detail / aggregate tiers stay on the server; the attendance policy (approved leave
   first, Friday off for everyone, Saturday off for Saudi nationals, an incomplete basis is shown as unavailable, never
   zero); every definition, preset and data-quality check comes from the APIs; the English labels and the v3 Arabic
   dictionary (reused as is). The shared runtime between the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js. */
(function () {
  'use strict';
  /* ---- v3 Arabic dictionary (display only; English UI text is the key) ---- */
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
    'Forms & Reports':'النماذج والتقارير','HR forms':'نماذج الموارد البشرية','Attendance & leave reports':'تقارير الحضور والإجازات','Employee reports':'تقارير الموظفين','This month':'هذا الشهر',
    'Appointment letters':'خطابات التعيين','Onboardings':'التوظيف (الإلحاق)','Separations':'إنهاء الخدمة','Work anniversaries':'ذكرى التعيين السنوية',
    'Appointment letters this month':'خطابات التعيين هذا الشهر','Onboardings this month':'التوظيف هذا الشهر','Separations this month':'إنهاء الخدمة هذا الشهر','Work anniversaries this month':'ذكرى التعيين هذا الشهر',
    'Disabled in ERP':'معطّل في النظام','Open the ERP forms and reports from the former HR Dash Board workspace.':'افتح نماذج وتقارير النظام التي كانت في مساحة عمل لوحة الموارد البشرية السابقة.',
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
    [/^Sort by (.+)$/, function (m, a) { return 'ترتيب حسب ' + arT(a); }],
    [/^(.+?) ([▲▼])$/, function (m, a, ar) { return arT(a) + ' ' + ar; }],
    [/^(.+) \((\d+)\)$/, function (m, a, n) { return arT(a) + ' (' + n + ')'; }],
    [/^Leave application (.+)$/, function (m, a) { return 'طلب إجازة ' + a; }],
    [/^Exported (\d+) rows( \(first 2,000\))?$/, function (m, n, f) { return 'تم تصدير ' + n + ' صفاً' + (f ? ' (أول 2,000)' : ''); }],
    [/^Department: (.+)$/, function (m, a) { return 'القسم: ' + a; }],
    [/^Branch: (.+)$/, function (m, a) { return 'الفرع: ' + a; }],
    [/^Job location: (.+)$/, function (m, a) { return 'موقع العمل: ' + a; }],
    [/^Designation: (.+)$/, function (m, a) { return 'المسمى الوظيفي: ' + a; }],
    [/^(.+) — expired or due ≤60 days$/, function (m, a) { return arT(a) + ' — منتهية أو تستحق خلال ≤60 يوماً'; }],
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
  function arT(raw) {
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
        if (s.indexOf(seps[si]) > 0) { out = s.split(seps[si]).map(arT).join({ ', ': '، ', '; ': '؛ ' }[seps[si]] || seps[si]); break; }
      }
    }
    if (out === null && /\d/.test(s)) { out = s; FRAGRE.forEach(function (f) { out = out.replace(f[0], function (m0, pre) { return pre + f[1]; }); }); if (out === s) out = null; }
    if (out === null) { out = s; if (/[A-Za-z]{3}/.test(s)) MISSING[s] = 1; }
    return lead + out + trail;
  }
  /* ---- v4 additions to the v3 dictionary (labels new in v4) ---- */
  Object.assign(AR, {
    'Permission-checked ERP data · read-only': 'بيانات النظام وفق الصلاحيات · قراءة فقط', 'Employee-level detail': 'تفاصيل على مستوى الموظف', 'Aggregate figures only': 'أرقام إجمالية فقط',
    'Not readable with your permissions': 'غير مقروء بصلاحياتك', '(fewer than 3)': '(أقل من 3)', '(Not set)': '(غير محدد)',
    'Employee-level lists are available to HR Manager / HR User only. Your view shows aggregate figures.': 'القوائم على مستوى الموظف متاحة لمدير ومستخدم الموارد البشرية فقط. يعرض عرضك أرقاماً إجمالية.',
    'd overdue': 'يوم تأخير', 'Approval queues': 'قوائم الاعتماد', 'Request queues': 'قوائم الطلبات', 'of documents current': 'من المستندات سارية', 'of employees without issues': 'من الموظفين بلا ملاحظات',
    'Data quality · HR review': 'جودة البيانات · مراجعة الموارد البشرية', 'Issues are displayed only; fix records in ERPNext after HR review.': 'تُعرض الملاحظات فقط؛ صحّح السجلات في ERPNext بعد مراجعة الموارد البشرية.',
    'Show all': 'عرض الكل', 'click a card or a data-quality count to narrow the list': 'انقر بطاقة أو عدداً في جودة البيانات لتضييق القائمة', 'days ago': 'يوماً مضت', 'Holiday list': 'قائمة العطلات', 'in': 'خلال',
    'Attendance reliability': 'موثوقية الحضور', 'of active': 'من النشطين', 'd': 'ي', 'Employee.status = Active (current filters)': 'حالة الموظف = نشط (حسب المرشحات)',
    'Headcount by department': 'عدد الموظفين حسب القسم', 'Headcount by branch': 'عدد الموظفين حسب الفرع', 'Headcount by job location': 'عدد الموظفين حسب موقع العمل', 'Headcount by designation': 'عدد الموظفين حسب المسمى الوظيفي',
    'Employee ID or name': 'رقم الموظف أو اسمه', 'Distinct employees with at least one punch': 'موظفون مختلفون لديهم بصمة واحدة على الأقل', 'mobile': 'جوال', 'device/untagged': 'جهاز/غير موسوم', 'inferred': 'مستنتج', 'recorded': 'مسجل',
    'Friday is a weekoff for all; Saturday is also a weekoff for Saudi nationals.': 'الجمعة عطلة للجميع؛ والسبت عطلة أيضاً للمواطنين السعوديين.', 'Attendance in the selected period': 'الحضور في الفترة المحددة', 'capped': 'بحد أقصى',
    'Attendance by employee in the period': 'الحضور حسب الموظف في الفترة', 'Attrition (12 months)': 'معدل الدوران (12 شهراً)', 'Approximate': 'تقريبي', 'Nationality conflicts': 'تعارض الجنسية', 'Nationality fields disagree': 'حقلا الجنسية غير متطابقين',
    'Left without relieving date': 'غادروا بلا تاريخ إخلاء طرف', 'Tenure': 'مدة الخدمة', 'Saudization by branch': 'السعودة حسب الفرع', 'Saudization by job location': 'السعودة حسب موقع العمل', 'Joiners and leavers by month': 'المنضمون والمغادرون شهرياً',
    'Monthly turnover rate': 'معدل الدوران الشهري', 'Turnover %': 'الدوران %', 'Data quality': 'جودة البيانات',
    'Action lists are as of today and follow the company, department, branch and job location filters.': 'قوائم الإجراءات حتى اليوم وتتبع مرشحات الشركة والقسم والفرع وموقع العمل.',
    'Record': 'السجل', 'Detail': 'التفاصيل', 'Age / due': 'العمر / الاستحقاق', 'Not permitted': 'غير مسموح', 'Could not load employee details.': 'تعذر تحميل تفاصيل الموظف.', 'Employee details': 'تفاصيل الموظف',
    'Default company': 'الشركة الافتراضية', 'All job locations': 'كل مواقع العمل', 'Status distribution': 'توزيع الحالات', 'Awaiting approval': 'بانتظار الاعتماد', 'Employees without a valid list': 'موظفون بلا قائمة صالحة',
    'Basis': 'الأساس', 'Share of active': 'النسبة من النشطين', 'Paid': 'مدفوعة', 'Unpaid (LWP)': 'غير مدفوعة (LWP)', 'Attendance %': 'نسبة الحضور', 'Check': 'تحقق', 'records': 'سجل',
    'Expired documents': 'مستندات منتهية', 'Iqama/ID, passport, contract or insurance already expired': 'إقامة/هوية أو جواز أو عقد أو تأمين منتهٍ بالفعل', 'Assigned holiday list does not cover today': 'قائمة العطلات المسندة لا تغطي اليوم',
    'Absence cannot be judged until a holiday list covers today': 'لا يمكن الحكم على الغياب حتى تغطي قائمة عطلات اليوم', 'Saudization and weekoff rules depend on nationality': 'قواعد السعودة والعطلة الأسبوعية تعتمد على الجنسية',
    'Pending leave approvals': 'اعتمادات إجازة معلقة', 'Workflow state Pending* or On-Hold; oldest first': 'حالة سير العمل معلق أو قيد الانتظار؛ الأقدم أولاً', 'Documents due within 30 days': 'مستندات تستحق خلال 30 يوماً',
    'Start renewal before the expiry date': 'ابدأ التجديد قبل تاريخ الانتهاء', 'Absent today': 'غائب اليوم', 'Approved leave and weekoffs excluded': 'باستثناء الإجازات المعتمدة والعطل الأسبوعية', 'Leave status mismatches': 'عدم تطابق حالة الإجازة',
    'Status and workflow state disagree': 'الحالة وحالة سير العمل غير متطابقتين', 'Training overdue': 'تدريب متأخر', 'Assigned and past the due date': 'مسند وتجاوز تاريخ الاستحقاق', 'Open HR requests': 'طلبات موارد بشرية مفتوحة',
    'Across the request types you can read; oldest first': 'عبر أنواع الطلبات التي يمكنك قراءتها؛ الأقدم أولاً', 'expired': 'منتهٍ', 'due': 'الاستحقاق', 'days': 'يوماً',
    'Leave leave and attendance': 'الإجازات والحضور', 'Employee directory': 'دليل الموظفين', 'Employment type': 'نوع التوظيف', 'Gender': 'الجنس', 'Present': 'حاضر', 'Absent': 'غائب', 'On leave': 'في إجازة',
    'Valid (>90 days)': 'سارٍ (أكثر من 90 يوماً)', 'Dates disagree': 'التواريخ غير متطابقة', 'Due soon': 'يستحق قريباً', 'as of': 'حتى',
    'Active employees unless the status filter says otherwise': 'الموظفون النشطون ما لم يحدد مرشح الحالة غير ذلك', '# to date': '# حتى تاريخه',
    'last 12 months': 'آخر 12 شهراً', 'Net change': 'صافي التغير', 'Approved / completed': 'معتمد / مكتمل'
  });
  function L(s) { return LANG === 'ar' ? arT(s) : s; }
  var APP = {
    key: '__dmsAdminHR',
    period: 'custom',
    tabs: [['overview', 'Overview'], ['employees', 'Employees'], ['attendance', 'Attendance'], ['leave', 'Leave'], ['compliance', 'Documents & Compliance'], ['requests', 'HR Requests'], ['training', 'Training'], ['analytics', 'HR Analytics'], ['links', 'Forms & Reports']].map(function (x) { return { id: x[0], en: x[1], ar: arT(x[1]) }; }).concat([{ id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }]),
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', none: ['Default company', 'الشركة الافتراضية'], options: function () { return FO.companies || []; } },
      { k: 'department', en: 'Department', ar: 'القسم', none: ['All departments', 'كل الأقسام'], options: function () { return FO.departments || []; } },
      { k: 'branch', en: 'Branch', ar: 'الفرع', none: ['All branches', 'كل الفروع'], options: function () { return FO.branches || []; } },
      { k: 'job_location', en: 'Job location', ar: 'موقع العمل', none: ['All job locations', 'كل مواقع العمل'], options: function () { return FO.job_locations || []; } }
    ],
    sources: ['ov'],
    dtLabels: { 'Employee': ['Employee', 'موظف'], 'Leave Application': ['Leave application', 'طلب إجازة'] },
    title: function () { return L('Admin & HR Dashboard'); },
    stamp: function () { return D.ov ? D.ov.meta.company + ' · ' + L(D.ov.meta.tier === 'detail' ? 'Employee-level detail' : 'Aggregate figures only') : L('Permission-checked ERP data · read-only'); },
    periodNote: function () { return tr('Leave and attendance activity use this period; headcount and documents are as of its last day.', 'تستخدم الإجازات والحضور هذه الفترة؛ وعدد الموظفين والمستندات حتى آخر يوم فيها.'); },
    boot: function () { F.period = 'custom'; F.from = shiftMonths(TODAY, -1); F.to = TODAY; return Promise.resolve(); },
    load: function () { MOD_KEYS.forEach(function (k) { LST[k] = { preset: '', title: '' }; }); EMP = null; DIRO = null; run('ov', function (chk) { return callP('admin_hr_dashboard_data', mainArgs()).then(function (d) { if (d && d.meta) { FO = d.meta.filter_options || {}; } return d; }); }); loadTab(tab); },
    onTab: function (id) { loadTab(id); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { var d = D.ov; return d && d.meta.errors && d.meta.errors.length ? alertBox('warn', esc(L('Not readable with your permissions') + ': ' + d.meta.errors.map(function (e) { return e.doctype || e; }).join(', '))) : ''; },
    content: function (x, AM) { return ({ overview: vOverview, employees: vEmployees, attendance: vAttendance, leave: vMod, compliance: vMod, requests: vMod, training: vMod, analytics: vAnalytics, links: vLinks, actions: vActions })[x](AM, x); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v) { return onAct(a, v); }
  };
  var FO = {}, EMP = null, LST = {}, DIRO = null;

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

  /* ============================================================ arguments (as v3) */
  function mainArgs() { return { company: F.company, department: F.department, branch: F.branch, job_location: F.job_location, from_date: PERIOD[0], to_date: PERIOD[1] }; }
  function gf(extra) { var o = { company: F.company || (D.ov && D.ov.meta.company) || '' }; if (F.department) { o.g_department = F.department; } if (F.branch) { o.g_branch = F.branch; } if (F.job_location) { o.g_job_location = F.job_location; } return Object.assign(o, extra || {}); }
  function isDetail() { return !!(D.ov && D.ov.meta.tier === 'detail'); }
  function R(k) { return (D.ov && D.ov.rows && D.ov.rows[k]) || []; }
  function nn(v) { return v === null || v === undefined || v === '' ? null : Number(v); }
  function nv(v, sfx) { var x = nn(v); return x === null || isNaN(x) ? '—' : num(x) + (sfx || ''); }
  /* The APIs send percentages already computed (e.g. 24.8). The kit's pct(n, d) divides a count by a total and shows
     N/A without one, so already-computed values are formatted here. */
  function pc(v) { var x = nn(v); return x === null || isNaN(x) ? '—' : String(Math.round(x * 10) / 10) + '%'; }
  /* Column filters for a table (kit facets). opts: list of values or [value, label] pairs; omit to use the row values. */
  function fc(k, h, opts, all) { return { k: k, h: L(h), opts: opts, all: all }; }
  function fcRows(rows, defs) { return defs.filter(function (d) { return (rows || []).some(function (r) { return r[d[0]] != null && r[d[0]] !== ''; }); }).map(function (d) { return fc(d[0], d[1]); }); }
  function fvArgs(fv) { var o = {}; Object.keys(fv || {}).forEach(function (k) { if (fv[k]) { o[k] = fv[k]; } }); return o; }
  function sumOf(list, f) { var t = 0, ok = false; (list || []).forEach(function (x) { var v = nn(f(x)); if (v !== null && !isNaN(v)) { t += v; ok = true; } }); return ok ? t : null; }
  function pctOf(a, b) { return a === null || a === undefined || !b ? null : Math.round(1000 * a / b) / 10; }
  var ST = { actual: ['Actual', 'ok'], partial: ['Partial', 'warn'], missing: ['Missing data', 'n'], unavailable: ['Unavailable', 'bad'] };
  function stTag(s) { var x = ST[s] || ST.unavailable; return stat(x[1], L(x[0])); }
  function sevTag(s) { return stat(s === 'high' ? 'bad' : s === 'medium' ? 'warn' : 'n', L(s === 'high' ? 'High' : s === 'medium' ? 'Medium' : 'Low')); }
  function two(a, b) { return '<div class="dms-cols-2 dms-grid">' + a + b + '</div>'; }
  function three(a, b, c) { return '<div class="dms-grid ah-cols-3">' + a + b + c + '</div>'; }
  function need(key, what, f) { if (D[key + 'Err']) { return srcErr(D[key + 'Err'], what); } if (D[key] == null) { return '<div class="dms-grid dms-kpis" aria-busy="true">' + skel(4, 'dms-skel-kpi') + '</div><div class="dms-skel dms-skel-panel"></div>'; } return f(D[key]); }
  function lbl(x) { return x.suppressed ? L('(fewer than 3)') : (x.label == null || x.label === '' ? L('(Not set)') : x.label); }
  function bars(list, key, fmt, max) { var it = (list || []).filter(function (x) { return nn(x[key]) !== null || x.suppressed; }).map(function (x) { return { label: lbl(x), value: x.suppressed ? 0 : nn(x[key]) }; }); return it.length ? hbars(it.slice(0, max || 12), fmt || num) : empty(L('No records.')); }
  function facts(rows) { return '<div class="dms-facts ah-facts">' + rows.map(function (r) { return '<div' + (r[3] ? ' class="ah-fact-act"' : '') + '><span class="dms-sm">' + esc(L(r[0])) + '</span><b class="dms-num">' + (r[3] ? '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="' + esc(r[3]) + '">' + r[1] + '</button>' : r[1]) + '</b>' + (r[2] ? '<span class="dms-sm">' + esc(L(r[2])) + '</span>' : '') + '</div>'; }).join('') + '</div>'; }
  function mini(cols, rows, emptyTxt) { return rows.length ? '<div class="dms-tablewrap"><table class="dms-table dms-table-sm ah-mini"><thead><tr>' + cols.map(function (c) { return '<th scope="col"' + (c[2] ? ' class="dms-num"' : '') + '>' + esc(L(c[0])) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td' + (c[2] ? ' class="dms-num"' : '') + '>' + c[1](r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : empty(L(emptyTxt || 'No records.')); }
  function empBtn(r) { return isDetail() && r.employee ? '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="emp:' + esc(r.employee) + '">' + bdi(r.employee_name || r.employee) + '</button>' : bdi(r.employee_name || r.employee || '—'); }
  function lockNote() { return alertBox('info', esc(L('Employee-level lists are available to HR Manager / HR User only. Your view shows aggregate figures.'))); }
  function rowsDrill(id, title, rows, dt, cols) { DRL[id] = { title: title, rows: rows, dt: dt || 'Employee', cols: cols }; return 'rows:' + id; }
  var DRL = {};

  /* ============================================================ attendance policy (v3, unchanged rule) */
  function attendancePolicy(d) {
    var a = d.attendance || {}, rr = d.rows || {}, e = d.employees || {};
    function list(k) { return rr[k] || []; }
    function distinct(rs) { var seen = Object.create(null); return rs.filter(function (r) { if (!r.employee || seen[r.employee]) { return false; } seen[r.employee] = true; return true; }); }
    function complete(rs, count) { return typeof count === 'number' && distinct(rs).length === count; }
    var date = d.meta.date, day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date + 'T12:00:00Z').getUTCDay() : NaN, friday = day === 5, saturday = day === 6;
    var saudi = Object.create(null), nationals = list('saudi'); nationals.forEach(function (r) { saudi[r.employee] = true; });
    var saudiComplete = complete(nationals, e.saudi);
    function nationality(r) { return String(r.custom_employee_nationality || r.nationality || r.custom_nationality || '').trim().toLowerCase(); }
    function isSaudi(r) { return !!saudi[r.employee] || ['saudi arabia', 'saudi', 'saudi arabian', 'المملكة العربية السعودية', 'السعودية'].indexOf(nationality(r)) >= 0; }
    function knownNationality(r) { return saudiComplete || !!nationality(r) || !!saudi[r.employee]; }
    function working(r) { return !friday && !(saturday && isSaudi(r)); }
    /* v3 read rows "absent_recorded", which the API never sends; the API's list of recorded absences is "absent_today" */
    var noPunch = distinct(list('no_punch')), recorded = distinct(list('absent_recorded').length ? list('absent_recorded') : list('absent_today'));
    var leave = Object.create(null); list('on_leave').forEach(function (r) { leave[r.employee] = true; });
    var leaveKpi = (d.overview || []).filter(function (k) { return k.key === 'on_leave'; })[0] || {}, leaveCount = typeof a.on_leave === 'number' ? a.on_leave : leaveKpi.value;
    var leaveComplete = typeof leaveCount === 'number' ? complete(list('on_leave'), leaveCount) : Array.isArray(rr.on_leave);
    var noPunchComplete = complete(noPunch, a.no_punch_unconfirmed), recordedComplete = complete(recorded, a.absent_recorded);
    var candidates = distinct(noPunch.concat(recorded)), nationalityKnown = !saturday || candidates.every(knownNationality);
    var available = !!a.ok && !isNaN(day) && (friday || (noPunchComplete && recordedComplete && nationalityKnown && leaveComplete));
    var missing = noPunch.filter(function (r) { return working(r) && !leave[r.employee]; }), confirmed = recorded.filter(function (r) { return working(r) && !leave[r.employee]; });
    var absent = distinct(confirmed.concat(missing)).map(function (r) { return Object.assign({}, r, { attendance_date: date, absence_basis: confirmed.some(function (c) { return c.employee === r.employee; }) ? 'Recorded Attendance = Absent' : 'Inferred: no punch and no approved leave' }); });
    var recordedAvailable = !isNaN(day) && (friday || (recordedComplete && leaveComplete && (!saturday || recorded.every(knownNationality))));
    var note = 'Approved leave always takes precedence over both missing punches and recorded Absent attendance. No punch without approved leave is treated as inferred absence. Fridays are excluded for everyone; Saturdays are also excluded for Saudi nationals. Counts can change as punches or leave approvals arrive.';
    if (!available && !friday) { note += ' Complete employee-level absence and approved-leave rows (and Saturday nationality data) are required; an unavailable count is never shown as zero.'; }
    return { count: available ? absent.length : null, rows: available ? absent : [], recorded: recordedAvailable ? confirmed.length : null, recordedRows: recordedAvailable ? confirmed : [], inferred: available ? absent.filter(function (r) { return !confirmed.some(function (c) { return c.employee === r.employee; }); }).length : null, friday: friday, saturday: saturday, note: note, available: available };
  }

  /* ============================================================ modules (leave, compliance, requests, training): summary + paged list */
  var MOD = {
    leave: { api: 'admin_hr_leave_data', key: 'lv', title: 'Leave', listTitle: 'All leave applications', args: function () { return { from_date: PERIOD[0], to_date: PERIOD[1] }; }, sort: 'from_date desc',
      order: ['pending', 'approved', 'rejected', 'on_leave', 'upcoming', 'used', 'pending_old', 'no_alloc'],
      panels: [['Leave types distribution', 'by_type', 'count', 'Approved days in the selected period.'], ['Leave utilisation by department', 'by_dept', 'days', 'Approved days starting in the selected period.'], ['Pending approvals by age', 'pending_by_age', 'count', 'Days in the current workflow state.'], ['Employees without current allocation', 'no_alloc_by_dept', 'count', 'Active employees, by department.']],
      month: ['Monthly leave usage (12 months)', 'monthly', [['paid', 'Paid', 'var(--dms-royal)'], ['lwp', 'Unpaid (LWP)', 'var(--dms-age3)']]],
      cols: [['name', 'Application', 'name', function (r) { return docLink('Leave Application', r.name); }], ['employee_name', 'Employee', 'employee_name', empBtn], ['department', 'Department', 'department'], ['leave_type', 'Leave Type', 'leave_type'], ['from_date', 'From', 'from_date', function (r) { return dtc(r.from_date); }], ['to_date', 'To', 'to_date', function (r) { return dtc(r.to_date); }], ['days', 'Days', 'days', null, 1], ['workflow_state', 'Workflow State', 'workflow_state', function (r) { return stat({ approved: 'ok', pending: 'warn', rejected: 'bad', conflict: 'bad' }[r.cls] || 'n', r.workflow_state || '—') + (r.docstatus === 1 && r.cls === 'pending' ? ' <span class="dms-sm">' + esc(L('submitted')) + '</span>' : ''); }], ['approver', 'Approver', 'approver'], ['age_label', 'Approval Age', 'age_days', function (r) { return r.age_days !== null && r.age_days > 3 ? stat('warn', r.age_label) : esc(r.age_label || '—'); }]],
      facets: function (o) { return [fc('workflow_state', 'Workflow State', o.workflow_states || []), fc('status', 'Status', o.statuses || []), fc('leave_type', 'Leave Type', o.leave_types || []), fc('department', 'Department', o.departments || [])]; },
      foot: 'Approve or reject only inside the ERPNext Leave Application form, where the workflow checks your role. The dashboard never changes applications.' },
    compliance: { api: 'admin_hr_compliance_data', key: 'cp', title: 'Documents & Compliance', listTitle: 'All required documents', args: function () { return { as_of: PERIOD[1] }; }, sort: 'days asc',
      order: ['active', 'valid', 'expired', 'd30', 'd60', 'd90', 'missing', 'issues'],
      panels: [['Expired / expiring ≤90 days by department', 'by_department', 'count'], ['Expired / expiring ≤90 days by branch', 'by_branch', 'count'], ['Document status distribution', 'distribution', 'count'], ['Employees by number of documents with issues', 'multi_issue', 'count']],
      month: ['Expiry forecast by month', 'forecast', [['iqama', 'Iqama / Saudi ID', 'var(--dms-royal)'], ['passport', 'Passport', '#7c3aed'], ['contract', 'Employment Contract', '#0891b2'], ['insurance', 'Medical Insurance', 'var(--dms-age3)']]],
      cols: [['employee_name', 'Employee Name', 'employee_name', empBtn], ['department', 'Department', 'department'], ['branch', 'Branch', 'branch'], ['document', 'Document', 'document'], ['expiry_date', 'Expiry Date', 'expiry_date', function (r) { return r.expiry_date ? dtc(r.expiry_date) : '<span class="dms-sm">—</span>'; }], ['days', 'Days Remaining', 'days', null, 1], ['status_label', 'Compliance Status', 'status', function (r) { return stat({ expired: 'bad', due_30: 'bad', due_60: 'warn', due_90: 'warn', valid: 'ok' }[r.status] || 'n', r.status_label) + (r.conflict ? '<div class="dms-sm">⚠ ' + esc(r.conflict) + '</div>' : '') + (r.unusual ? '<div class="dms-sm">⚠ ' + esc(r.unusual) + '</div>' : ''); }]],
      facets: function (o) { return [fc('doc', 'Document', [['iqama', L('Iqama / Saudi ID')], ['passport', L('Passport')], ['contract', L('Employment Contract')], ['insurance', L('Medical Insurance')]]), fc('status', 'Compliance Status', [['expired', L('Expired')], ['due_30', L('Expiring ≤30 days')], ['due_60', L('Expiring 31–60 days')], ['due_90', L('Expiring 61–90 days')], ['valid', L('Valid (>90 days)')], ['missing', L('Missing expiry date')], ['conflict', L('Dates disagree')]]), fc('department', 'Department', o.department || []), fc('branch', 'Branch', o.branch || []), fc('job_location', 'Job Location', o.job_location || [])]; },
      foot: 'One row per employee document. Saudi passports (not required) are excluded. Only expiry dates and status are shown; document numbers never are. Renewals are done in ERPNext.' },
    requests: { api: 'admin_hr_requests_data', key: 'rq', title: 'HR Requests', listTitle: 'All HR requests', args: function () { return {}; }, sort: 'created desc', order: null,
      panels: [['Requests by type', 'by_type', 'count'], ['Requests by department', 'by_department', 'count'], ['Open requests by age', 'pending_by_age', 'count'], ['Status distribution', 'status', 'count'], ['Average resolution time by type', 'resolution_by_type', 'avg', null, function (v) { return num(v) + ' d'; }]],
      month: ['Monthly request trend', 'trend', [['created', 'Created', 'var(--dms-royal)'], ['closed', 'Closed', 'var(--dms-ok)']]],
      cols: [['name', 'Request ID', 'name', function (r) { return r.doctype && r.name ? docLink(r.doctype, r.name) : esc(r.name || '—'); }], ['type', 'Request Type', 'type'], ['employee_name', 'Employee', 'employee_name', empBtn], ['department', 'Department', 'department'], ['created', 'Created', 'created', function (r) { return dtc(String(r.created || '').slice(0, 10)); }], ['approver', 'Assigned / Approver', 'approver'], ['status', 'Status', 'status', function (r) { return stat({ pending: 'warn', on_hold: 'warn', in_progress: 'warn', completed: 'ok', rejected: 'bad', unclear: 'bad' }[r.cat] || 'n', r.status) + (r.state ? '<div class="dms-sm">' + esc(r.state) + '</div>' : ''); }], ['age_days', 'Age / Overdue', 'age_days', function (r) { return r.age_days === null || r.age_days === undefined ? '—' : '<span class="dms-num">' + num(r.age_days) + ' d</span>' + (r.overdue_days ? '<div class="dms-sm">' + esc(num(r.overdue_days) + ' ' + L('d overdue')) + '</div>' : ''); }]],
      facets: function (o) { return [fc('type', 'Request Type', o.types || []), fc('status', 'Status', (o.status || []).map(function (x) { return [x[0], L(x[1])]; })), fc('department', 'Department', o.department || []), fc('branch', 'Branch', o.branch || []), fc('approver', 'Assigned / Approver', o.approver || [])]; },
      foot: 'One row per source record. Results respect your ERPNext DocType and User Permissions for every source.' },
    training: { api: 'admin_hr_training_data', key: 'tr', title: 'Training', listTitle: 'All training assignments', args: function () { return {}; }, sort: 'due_date asc', order: null,
      panels: [['Completion by department', 'by_department', 'pct', null, pc], ['Completion by designation', 'by_designation', 'pct', null, pc], ['Overdue training by department', 'overdue_by_department', 'overdue'], ['Most assigned videos and courses', 'most_assigned', 'count']],
      month: ['Monthly assignments and completions', 'trend', [['assigned', 'Assigned', 'var(--dms-royal)'], ['completed', 'Completed', 'var(--dms-ok)']]],
      cols: [['employee_name', 'Employee Name', 'employee_name', empBtn], ['department', 'Department', 'department'], ['title', 'Training Video / Course', 'title', function (r) { return bdi(r.title || '—') + (r.kind ? ' <span class="dms-sm">(' + esc(r.kind) + ')</span>' : ''); }], ['mandatory', 'Mandatory', 'mandatory', function (r) { return r.mandatory ? stat('warn', L('Mandatory')) : '<span class="dms-sm">—</span>'; }], ['assigned_date', 'Assigned', 'assigned_date', function (r) { return dtc(r.assigned_date); }], ['due_date', 'Due', 'due_date', function (r) { return dtc(r.due_date) + (r.overdue ? '<div class="dms-sm">' + esc(L('overdue') + ' ' + num(-r.days_to_due) + ' d') + '</div>' : ''); }], ['completed_on', 'Completed', 'completed_on', function (r) { return dtc(r.completed_on); }], ['status', 'Status', 'status', function (r) { return stat({ Completed: 'ok', 'In Progress': 'warn' }[r.status] || 'n', r.status || '—'); }]],
      facets: function (o) { return [fc('status', 'Status', ['Completed', 'In Progress', 'Not Started', 'Not assigned', 'No user'].map(function (x) { return [x, L(x)]; })), fc('timing', 'Due', [['overdue', L('Overdue')], ['due_soon', L('Due soon')], ['on_track', L('On track')], ['no_due', L('No due date')]]), fc('mandatory', 'Mandatory', [['1', L('Mandatory')], ['0', L('Optional')]]), fc('item', 'Training Video / Course', o.items || []), fc('department', 'Department', o.department || []), fc('designation', 'Designation', o.designation || [])]; },
      foot: 'Completion is the employee marking the video complete in My Training. No quiz, assessment or certificate records exist.' }
  };
  var MOD_KEYS = Object.keys(MOD);
  function loadTab(id) {
    var m = MOD[id];
    if (m && !((m.key + 'Tok') in D)) { run(m.key, function () { return callP(m.api, gf(Object.assign({ mode: 'summary' }, m.args()))); }); }
    if (id === 'employees' && isDetail() && !EMP) { EMP = true; }
  }
  function modKpis(m, s, id) {
    var K = {}; (s.kpis || []).forEach(function (k) { K[k.key] = k; }); var order = m.order ? m.order.filter(function (k) { return K[k]; }) : (s.kpis || []).map(function (k) { return k.key; });
    return kpis(order.map(function (k) { var x = K[k], v = x.value, u = x.unit === '%' || x.unit === 'pct' ? '%' : ''; return kpi({ label: L(x.label), val: v === null || v === undefined ? '—' : num(v) + (u ? '<small>%</small>' : ''), sub: esc(L(x.sub || '')), tip: L(x.basis || ''), dot: x.state && x.state !== 'actual' ? (x.state === 'unavailable' ? 'var(--dms-bad)' : 'var(--dms-age3)') : null, act: x.preset && s.meta.tier === 'detail' ? 'pre:' + id + ':' + x.preset + ':' + x.label : null }); }));
  }
  function monthPanel(def, list) {
    if (!list || !list.length) { return panel(L(def[0]), empty(L('No records.'))); }
    var by = {}; list.forEach(function (x) { by[String(x.month).slice(0, 7)] = x; }); var keys = Object.keys(by).sort();
    return panel(L(def[0]), barChart(keys, 'month', def[2].map(function (s) { return { label: L(s[1]), color: s[2], val: function (k) { return nn((by[k] || {})[s[0]]) || 0; } }; }), num));
  }
  function vMod(AM, id) {
    var m = MOD[id];
    return need(m.key, m.api, function (s) {
      var dt = s.meta.tier === 'detail', A = s.analytics || {}, h = '';
      if (s.meta.unreadable && s.meta.unreadable.length) { h += alertBox('warn', esc(L('Not readable with your permissions') + ': ' + s.meta.unreadable.join(', '))); }
      h += modKpis(m, s, id);
      if (s.definitions) { h += note(esc(L('Approved') + ' = ' + s.definitions.approved + '. ' + L('Pending') + ' = ' + s.definitions.pending + '.')); }
      if (s.queues && id === 'leave') { h += panel(L('Approval queues'), facts([['Pending My Approval', nv(s.queues.my), '', dt && s.queues.my ? 'pre:leave:q_my:Pending My Approval' : null], ['Pending HR Review', nv(s.queues.hr_review), '', dt && s.queues.hr_review ? 'pre:leave:q_hr:Pending HR Review' : null], ['Awaiting approval', nv(s.queues.awaiting)]]) + note(esc(L(s.queues.note || '')))); }
      if (s.queues && id === 'requests') { var Q = s.queues; h += panel(L('Request queues'), facts([['Pending My Approval', nv(Q.my), '', dt && Q.my ? 'pre:requests:q_my:Pending My Approval' : null], ['Pending HR Review', nv(Q.hr_review), '', dt && Q.hr_review ? 'pre:requests:q_hr_review:Pending HR Review' : null], ['Awaiting Employee Information', nv(Q.awaiting_info), '', dt && Q.awaiting_info ? 'pre:requests:q_awaiting_info:Awaiting Employee Information' : null], ['Overdue Requests', nv(Q.overdue), 'open > ' + s.meta.sla_days + ' days', dt && Q.overdue ? 'pre:requests:overdue:Overdue Requests' : null], ['Recently Completed', nv(Q.recent), '', dt && Q.recent ? 'pre:requests:q_recent:Recently Completed' : null]])); }
      if (s.analytics && s.analytics.completion && id === 'compliance') { var C = A.completion; h += note(esc(L('Compliance completion') + ': ' + C.documents_pct + '% ' + L('of documents current') + ' (' + num(C.documents_ok) + ' / ' + num(C.documents) + ') · ' + C.employees_pct + '% ' + L('of employees without issues') + ' (' + num(C.employees_ok) + ' / ' + num(C.employees) + ')')); }
      var ps = m.panels.filter(function (p) { return A[p[1]] && A[p[1]].length; }).map(function (p) { return panel(L(p[0]), bars(A[p[1]], p[2], p[4]), '', p[3] ? esc(L(p[3])) : ''); });
      ps.unshift(monthPanel(m.month, A[m.month[1]]));
      for (var i = 0; i < ps.length; i += 2) { h += ps[i + 1] ? two(ps[i], ps[i + 1]) : ps[i]; }
      if (dt) { h += modList(id, m, s); } else { h += lockNote(); }
      var dq = s.dq || [];
      if (dq.length) { h += panel(L('Data quality · HR review'), mini([['Issue', function (x) { return esc(L(x.label)) + (x.extra ? '<div class="dms-sm">' + esc(x.extra) + '</div>' : ''); }], ['Severity', function (x) { return sevTag(x.severity); }], ['Records', function (x) { return dt && x.count && x.preset ? '<button type="button" class="dms-linkbtn dms-num" data-act="kpi" data-v="' + esc('pre:' + id + ':' + x.preset + ':' + x.label) + '">' + num(x.count) + '</button>' : '<span class="dms-num">' + nv(x.count) + '</span>'; }, 1]], dq), '', esc(L('Issues are displayed only; fix records in ERPNext after HR review.'))); }
      return h + note(esc(L('Generated') + ' ' + (s.meta.generated || '') + '. ' + L(m.foot)));
    });
  }
  function modList(id, m, s) {
    var st = LST[id] || (LST[id] = { preset: '', title: '' }), args = gf(m.args());
    var chips = '<div class="ah-preset">' + (st.preset ? '<span class="dms-sm">' + esc(L('Showing')) + ':</span> <b>' + esc(L(st.title)) + '</b> <button type="button" class="dms-btn dms-btn-sm" data-act="clrpre" data-v="' + id + '">' + esc(L('Show all')) + '</button>' : '<span class="dms-sm">' + esc(L(m.listTitle)) + ' · ' + esc(L('click a card or a data-quality count to narrow the list')) + '</span>') + '</div>';
    var sk = m.sort.split(' ');
    return '<div id="ah-list-' + id + '">' + panel(L(m.listTitle), chips + regTable({ id: 'tl_' + id, server: true, period: true, dt: 'x', fields: [], filters: [st.preset, args], pageSize: 25, file: id + '_list', order: m.sort, searchHint: L('Search'), facets: m.facets ? m.facets(s.options || {}) : null,
      loader: function (p, size, q, order, fv) { var o = String(order || m.sort).split(' '); return callP(m.api, Object.assign({}, args, fvArgs(fv), { mode: 'list', preset: st.preset, page: p + 1, page_length: Math.min(size, 100), sort_by: o[0], sort_order: o[1] || 'asc', search: q || '' })).then(function (r) { return { total: r ? r.total : 0, rows: (r && r.rows) || [] }; }); },
      cols: m.cols.map(function (c) { return { k: c[0], h: L(c[1]), sf: c[2] || undefined, num: c[4], r: c[3] || (c[4] ? function (r) { return '<span class="dms-num">' + nv(r[c[0]]) + '</span>'; } : function (r) { return r[c[0]] === null || r[c[0]] === undefined || r[c[0]] === '' ? '<span class="dms-sm">—</span>' : bdi(r[c[0]]); }), c: function (r) { return r[c[0]]; } }; }) }), '', '') + '</div>';
  }

  /* ============================================================ actions pending (from the main API rows; counts only for the aggregate tier) */
  var ACT = [
    ['a_expired', 'high', 'Expired documents', 'Iqama/ID, passport, contract or insurance already expired', 'Employee'],
    ['a_holiday', 'high', 'Assigned holiday list does not cover today', 'Absence cannot be judged until a holiday list covers today', 'Employee'],
    ['a_natconf', 'high', 'Nationality fields disagree', 'Saudization and weekoff rules depend on nationality', 'Employee'],
    ['a_leave', 'med', 'Pending leave approvals', 'Workflow state Pending* or On-Hold; oldest first', 'Leave Application'],
    ['a_due30', 'med', 'Documents due within 30 days', 'Start renewal before the expiry date', 'Employee'],
    ['a_absent', 'med', 'Absent today', 'Approved leave and weekoffs excluded', 'Employee'],
    ['a_mismatch', 'med', 'Leave status mismatches', 'Status and workflow state disagree', 'Leave Application'],
    ['a_training', 'low', 'Training overdue', 'Assigned and past the due date', 'Employee'],
    ['a_requests', 'low', 'Open HR requests', 'Across the request types you can read; oldest first', null]
  ];
  function actSpecs() { return ACT.map(function (a) { return { id: a[0], client: true, short: L(a[2]), title: L(a[2]), why: L(a[3]) }; }); }
  function expRows(f) { var out = []; ((D.ov && D.ov.compliance) || []).forEach(function (c) { R('exp_' + c.key).forEach(function (x) { if (f(x.days_left)) { out.push(x); } }); }); return out.sort(function (a, b) { return a.days_left - b.days_left; }); }
  function actClient() {
    if (D.ovErr) { return 'ERR:' + D.ovErr; } if (!D.ov) { return null; }
    var d = D.ov, det = isDetail(), comp = d.compliance || [], p = attendancePolicy(d), dqc = function (k) { var x = (d.data_quality || []).filter(function (y) { return y.key === k; })[0]; return x ? x.count : 0; };
    var E = function (x, pr, desc, due, tone) { return { p: pr, score: score(pr, 0, 0), dt: 'Employee', name: x.employee, title: x.employee_name || x.employee, desc: desc, who: x.department || '', due: due || '', tone: tone || (pr === 'high' ? 'bad' : 'warn') }; };
    var o = {};
    o.a_expired = det ? { rows: expRows(function (v) { return v !== null && v !== undefined && v < 0; }), item: function (x) { return E(x, 'high', x.document + ' · ' + x.expiry_date, (x.days_left === -1 ? tr('expired yesterday', 'انتهى أمس') : L('expired') + ' ' + num(-x.days_left) + ' ' + L('days ago')), 'bad'); } } : { count: sumOf(comp, function (c) { return c.buckets && c.buckets.expired; }) || 0, rows: [], item: null };
    o.a_holiday = det ? { rows: R('dq_holiday_list_expired'), item: function (x) { return E(x, 'high', L('Holiday list') + ': ' + (x.holiday_list || '—'), ''); } } : { count: dqc('holiday_list_expired'), rows: [], item: null };
    o.a_natconf = det ? { rows: R('dq_nat_conflict'), item: function (x) { return E(x, 'high', (x.custom_nationality || '—') + ' ≠ ' + (x.custom_employee_nationality || '—'), ''); } } : { count: dqc('nat_conflict'), rows: [], item: null };
    o.a_leave = det ? { rows: R('leave_pending'), item: function (x) { var pr = (x.age_days || 0) > 3 ? 'med' : 'low'; return { p: pr, score: score(pr, 0, x.age_days), dt: 'Leave Application', name: x.leave_application, title: x.employee_name || x.employee, desc: (x.leave_type || '') + ' · ' + x.from_date + ' → ' + x.to_date + ' · ' + (x.workflow_state || ''), who: x.workflow_state || '', due: x.age_days === 1 ? tr('1 day', 'يوم واحد') : num(x.age_days || 0) + ' ' + L('days'), tone: pr === 'med' ? 'warn' : 'n' }; } } : { count: (d.leave && d.leave.pending) || 0, rows: [], item: null };
    o.a_due30 = det ? { rows: expRows(function (v) { return v !== null && v !== undefined && v >= 0 && v <= 30; }), item: function (x) { return E(x, 'med', x.document + ' · ' + x.expiry_date, (x.days_left === 0 ? tr('expires today', 'ينتهي اليوم') : x.days_left === 1 ? tr('expires tomorrow', 'ينتهي غداً') : L('in') + ' ' + num(x.days_left) + ' ' + L('days'))); } } : { count: sumOf(comp, function (c) { return c.buckets && c.buckets.d30; }) || 0, rows: [], item: null };
    o.a_absent = p.available ? { rows: p.rows, item: function (x) { return E(x, 'med', L(x.absence_basis), d.meta.date); } } : 'ERR:tech';
    o.a_mismatch = det ? { rows: R('dq_leave_status_mismatch'), item: function (x) { return { p: 'med', score: score('med', 0, 0), dt: 'Leave Application', name: x.leave_application, title: x.employee_name || x.employee, desc: (x.workflow_state || '—') + ' · ' + (x.status || '—'), who: x.leave_type || '', due: '', tone: 'warn' }; } } : { count: (d.leave && d.leave.status_mismatch) || 0, rows: [], item: null };
    o.a_training = det ? { rows: R('training_overdue'), item: function (x) { return E(x, 'low', x.training || '', L('due') + ' ' + (x.due_date || ''), 'n'); } } : { count: (d.training && d.training.overdue) || 0, rows: [], item: null };
    o.a_requests = det ? { rows: R('requests_open'), item: function (x) { var pr = x.age_days > 30 ? 'med' : 'low'; return { p: pr, score: score(pr, 0, x.age_days), dt: x.doctype, name: x.name, title: x.name, desc: x.doctype + ' · ' + (x.state || ''), who: x.employee || '', due: x.age_days === 1 ? tr('1 day', 'يوم واحد') : num(x.age_days) + ' ' + L('days'), tone: pr === 'med' ? 'warn' : 'n' }; } } : { count: sumOf((d.requests || []).filter(function (r) { return r.state !== 'unavailable'; }), function (r) { return r.open; }) || 0, rows: [], item: null };
    if (!det) { Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object' && !o[k].item) { o[k].item = function () { return null; }; } }); }
    return o;
  }

  /* ============================================================ overview */
  var KPIDOT = { checked_in: 'var(--dms-ok)', absent: 'var(--dms-bad)', on_leave: 'var(--dms-age3)', late: '#7c3aed', leave_pending: 'var(--dms-royal)', expiring: 'var(--dms-age3)' };
  var TABOF = { active: 'employees', checked_in: 'attendance', absent: 'attendance', on_leave: 'leave', late: 'attendance', leave_pending: 'leave', training: 'training', expiring: 'compliance' };
  function vOverview(AM) {
    if (D.ovErr) { return srcErr(D.ovErr, 'admin_hr_dashboard_data') + actionsPanel(AM); }
    if (!D.ov) { return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(8, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>'; }
    var d = D.ov, p = attendancePolicy(d), a = d.attendance || {}, l = d.leave || {}, t = d.training || {}, e = d.employees || {}, h = '';
    if (!a.absence_reliable && d.system_status) { h += alertBox('warn', '<b>' + esc(L('Attendance reliability')) + ':</b> ' + esc(L(d.system_status.holiday_lists.note) + ' ' + L(d.system_status.auto_attendance.note))); }
    h += kpis(d.overview.map(function (k) {
      if (k.key === 'absent') { k = Object.assign({}, k, { label: 'Absent today', value: p.count, state: p.available ? (p.friday ? 'actual' : 'partial') : 'unavailable', note: p.note, sub: 'Approved leave & weekoffs excluded' }); }
      var v = k.value === null || k.value === undefined ? '—' : num(k.value) + (k.key === 'training' ? '<small>%</small>' : '');
      return kpi({ label: L(k.label), dot: k.state === 'unavailable' ? 'var(--dms-bad)' : KPIDOT[k.key] || null, val: v, sub: esc(L(k.sub || '')) || stTag(k.state), tip: L(k.note || ''), act: 'goto:' + (TABOF[k.key] || 'overview') });
    }), true);
    var att = !a.ok ? alertBox('warn', esc(L('Attendance data could not be read with your permissions.'))) : barChart((a.trend || []).map(function (x) { return x.date; }), 'day', [{ label: L('Employees with a punch'), color: 'var(--dms-royal)', val: function (k) { var x = (a.trend || []).filter(function (y) { return y.date === k; })[0]; return x ? x.count : 0; } }], num) +
      facts([['Checked in', nv(a.checked_in), pctOf(a.checked_in, e.active) !== null ? pctOf(a.checked_in, e.active) + '% ' + L('of active') : '', isDetail() ? rowsDrill('ci', 'Checked in today', R('checked_in')) : null], ['Absent today', nv(p.count), p.friday ? 'Friday · weekoff' : 'Approved leave & weekoffs excluded', p.available && isDetail() ? rowsDrill('ab', 'Absent today', p.rows) : null], ['Late', nv(a.late), a.late_evaluated != null ? 'of ' + a.late_evaluated + ' evaluated' : '', isDetail() ? rowsDrill('late', 'Late check-ins today', R('late')) : null], ['Mobile punches', nv(a.mobile_punches), a.punches_today != null ? 'of ' + a.punches_today + ' punches' : '']]);
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(L('Attendance Overview'), att, '', esc(L('Biometric and mobile punches, last ' + (a.trend || []).length + ' days'))) + '</div></div>';
    var bt = (l.by_type_days_ytd || []).slice().sort(function (x, y) { return y.count - x.count; });
    var leaveP = !l.ok ? alertBox('warn', esc(L('Leave Application is not readable with your permissions.'))) : facts([['On leave today', nv(l.on_leave_today), '', 'goto:leave'], ['Pending approval', nv(l.pending), '', 'goto:leave'], ['Starting in 30 days', nv(l.upcoming_30d)], ['Drafts not submitted', nv(l.drafts)]]) + (bt.length ? '<h4 class="ah-h">' + esc(L('Leave days by type, year to date')) + '</h4>' + bars(bt, 'count', function (v) { return num(v) + ' ' + tr('d', 'ي'); }, 6) : empty(L('No approved leave days this year.')));
    var notDue = t.assignments != null && t.completed != null && t.overdue != null ? Math.max(0, t.assignments - t.completed - t.overdue) : null;
    var trainP = !t.ok ? alertBox('warn', esc(L('Training records are not readable with your permissions.'))) : (t.assignments ? mixBar([{ label: L('Completed'), value: t.completed || 0, color: 'var(--dms-ok)' }, { label: L('Open, not yet due'), value: notDue || 0, color: 'var(--dms-royal)' }, { label: L('Overdue'), value: t.overdue || 0, color: 'var(--dms-bad)' }]) : '') + facts([['Assignments', nv(t.assignments)], ['Completed', nv(t.completed), t.pct != null ? t.pct + '%' : ''], ['Overdue', nv(t.overdue)], ['Employees not assigned', nv(t.employees_not_assigned)]]);
    h += two(panel(L('Leave & Approvals'), leaveP), panel(L('Training & Development'), trainP, '', esc('Employee Training Progress')));
    var comp = d.compliance || [];
    var compP = mini([['Document', function (r) { return esc(L(r.label)); }], ['Expired', function (r) { return nv(r.buckets && r.buckets.expired); }, 1], ['≤30d', function (r) { return nv(r.buckets && r.buckets.d30); }, 1], ['31–60d', function (r) { return nv(r.buckets && r.buckets.d60); }, 1], ['Missing', function (r) { return nv(r.buckets && r.buckets.missing); }, 1], ['Status', function (r) { var b = r.buckets || {}; return r.state === 'unavailable' ? stat('bad', L('Unavailable')) : b.expired ? stat('bad', L('Expired')) : b.d30 ? stat('warn', L('Due ≤30d')) : stat('ok', L('OK')); }]], comp);
    var rq = d.requests || [], rd = rq.filter(function (x) { return x.state !== 'unavailable'; });
    var reqP = mini([['Request type', function (x) { return esc(x.doctype); }], ['Open', function (x) { return nv(x.open); }, 1], ['Oldest', function (x) { return x.open ? nv(x.oldest_days, ' d') : '—'; }, 1], ['Status', function (x) { return x.state === 'unavailable' ? stat('n', L('Unavailable')) : x.open ? stat('warn', L('Open')) : stat('ok', L('Clear')); }]], rq) + (rq.length > rd.length ? note(esc(L((rq.length - rd.length) + ' request type' + (rq.length - rd.length > 1 ? 's are' : ' is') + ' not readable with your permissions and not counted.'))) : '');
    h += two(panel(L('Documents & Compliance'), compP, '', esc(L('Counts only. Document numbers are never shown here.'))), panel(L('HR Requests / Employee Relations'), reqP, '', esc(L('Counts and ages only — no request contents'))));
    var pr = e.probation || {}, jt = e.joining_trend || [];
    var life = facts([['New joiners', nv(e.joined_this_month), 'This month', isDetail() ? rowsDrill('jm', 'Joined this month', R('joined_month')) : null], ['Probation', pr.state === 'unavailable' ? stat('bad', L('Unavailable')) : nv(pr.count), pr.state === 'unavailable' ? 'No reliable data' : 'In progress'], ['Active', nv(e.active), 'On roll'], ['Leavers', nv(e.leavers_12m), 'Last 12 months']]) +
      (jt.length ? '<h4 class="ah-h">' + esc(L('Joiners per month, last 12 months')) + '</h4>' + barChart(jt.map(function (x) { return String(x.label).slice(0, 7); }), 'month', [{ label: L('Joiners'), color: 'var(--dms-royal)', val: function (k) { var x = jt.filter(function (y) { return String(y.label).slice(0, 7) === k; })[0]; return x ? x.count : 0; } }], num) : '') + (pr.state === 'unavailable' ? note(esc(L(pr.note || 'Probation data is not reliable.'))) : '');
    var sv0 = { high: 0, medium: 1, low: 2 }, dq = (d.data_quality || []).filter(function (x) { return x.count > 0; }).sort(function (x, y) { return (sv0[x.severity] - sv0[y.severity]) || (y.count - x.count); }).slice(0, 6);
    var ops = facts([['Linked to a user', nv(e.with_user) + ' / ' + nv(e.active)], ['Punches today', nv(a.punches_today)], ['Departments', nv(e.departments_count)]]) + (dq.length ? '<h4 class="ah-h">' + esc(L('Top data-quality issues')) + '</h4>' + mini([['Issue', function (x) { return esc(L(x.label)); }], ['Count', function (x) { return R('dq_' + x.key).length ? '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="' + rowsDrill('dq_' + x.key, x.label, R('dq_' + x.key), x.key === 'leave_status_mismatch' ? 'Leave Application' : 'Employee') + '">' + num(x.count) + '</button>' : num(x.count); }, 1], ['Level', function (x) { return sevTag(x.severity); }]], dq) : empty(L('No data-quality issues found.')));
    return h + two(panel(L('Employee Lifecycle'), life), panel(L('HR Operations Summary'), ops));
  }

  /* ============================================================ employees */
  function vEmployees() {
    if (D.ovErr) { return srcErr(D.ovErr, 'admin_hr_dashboard_data'); } if (!D.ov) { return skel(1, 'dms-skel-panel'); }
    var d = D.ov, e = d.employees || {}, det = isDetail(), ol = (d.overview || []).filter(function (k) { return k.key === 'on_leave'; })[0] || {};
    var dr = function (id, title, key) { return det ? rowsDrill(id, title, R(key)) : null; };
    var h = kpis([
      kpi({ label: L('Total Active Employees'), dot: 'var(--dms-royal)', val: nv(e.active), sub: esc(L('Employee.status = Active (current filters)')), act: dr('act', 'Active employees', 'active') }),
      kpi({ label: L('Total Departments'), val: nv(e.departments_count), sub: esc(L('Distinct departments with active employees')) }),
      kpi({ label: L('New Joiners This Month'), val: nv(e.joined_this_month), act: dr('jm', 'Joined this month', 'joined_month') }),
      kpi({ label: L('On Approved Leave Today'), val: nv(ol.value), act: dr('ol', 'On approved leave today', 'on_leave') }),
      kpi({ label: L('Saudi Employees'), val: nv(e.saudi), act: dr('sa', 'Saudi employees', 'saudi') }),
      kpi({ label: L('Non-Saudi Employees'), val: nv(e.non_saudi), sub: e.nationality_missing ? esc(L(e.nationality_missing + ' without nationality')) : '', act: dr('ns', 'Non-Saudi employees', 'non_saudi') }),
      kpi({ label: L('Employees with Expiring Documents'), dot: e.expiring_employees ? 'var(--dms-age3)' : null, val: nv(e.expiring_employees), sub: esc(L('Expired or due within 60 days')), act: dr('ex', 'Employees with expiring documents', 'expiring_employees') }),
      kpi({ label: L('Joiners (12 months)'), val: nv(e.joiners_12m) }),
      kpi({ label: L('Leavers (12 months)'), val: nv(e.leavers_12m) }),
      kpi({ label: L('Linked to ERPNext user'), val: nv(e.with_user), sub: e.active != null && e.with_user != null ? esc(L((e.active - e.with_user) + ' without user_id')) : '', act: dr('nu', 'Employees without ERPNext user', 'dq_missing_user') })
    ]);
    var tm = e.this_month;
    if (tm) { h += panel(L('This month'), facts([['Appointment letters', nv(tm.appointment_letters), '', det && tm.appointment_letters ? rowsDrill('tma', 'Appointment letters this month', R('tm_appointment'), 'Appointment Letter') : null], ['Onboardings', nv(tm.onboardings), '', det && tm.onboardings ? rowsDrill('tmo', 'Onboardings this month', R('tm_onboarding'), 'Employee Onboarding') : null], ['Separations', nv(tm.separations), '', det && tm.separations ? rowsDrill('tms', 'Separations this month', R('tm_separation'), 'Employee Separation') : null], ['Work anniversaries', nv(tm.anniversaries), '', det && tm.anniversaries ? rowsDrill('tmy', 'Work anniversaries this month', R('tm_anniversary')) : null]]), '', tm.from + ' → ' + tm.to); }
    h += two(panel(L('Headcount by department'), bars(e.by_department, 'count')), panel(L('Headcount by branch'), bars(e.by_branch, 'count')));
    h += two(panel(L('Headcount by job location'), bars(e.by_location, 'count')), panel(L('Headcount by designation'), bars(e.by_designation, 'count')));
    h += two(panel(L('Employment type'), bars(e.by_employment_type, 'count')), panel(L('Gender'), bars(e.by_gender, 'count')));
    if (!det) { return h + lockNote(); }
    var SORT = { employee: 'name', employee_name: 'employee_name', department: 'department', designation: 'designation', branch: 'branch', job_location: 'job_location', nationality: 'nationality', date_of_joining: 'date_of_joining', status: 'status' };
    var DO = DIRO || {}, dirF = [fc('status', 'Status', [['All', L('All statuses')], ['Inactive', L('Inactive')], ['Suspended', L('Suspended')], ['Left', L('Left')]], L('Status') + ': ' + L('Active'))].concat([['department', 'Department'], ['designation', 'Designation'], ['branch', 'Branch'], ['job_location', 'Job Location'], ['nationality', 'Nationality']].map(function (x) { return fc(x[0], x[1], DO[x[0]] || []); }));
    return h + panel(L('Employee directory'), regTable({ id: 't_dir', server: true, dt: 'Employee', fields: [], filters: [F.company, F.department, F.branch, F.job_location], pageSize: 25, file: 'employee_directory', order: 'employee_name asc', searchHint: L('Employee ID or name'), facets: dirF,
      loader: function (p, size, q, order, fv) { var o = String(order || 'employee_name asc').split(' '); return callP('admin_hr_employee_directory', Object.assign({ company: F.company || d.meta.company, department: F.department, branch: F.branch, job_location: F.job_location, status: 'Active' }, fvArgs(fv), { with_options: DIRO ? 0 : 1, page: p + 1, page_length: Math.min(size, 100), sort_by: o[0], sort_order: o[1] || 'asc', search: q || '' })).then(function (r) { if (r && r.options && !DIRO) { DIRO = r.options; later(renderSoft, 0); } return { total: r ? r.total : 0, rows: (r && r.rows) || [] }; }); },
      cols: [{ k: 'employee', h: L('Employee ID'), sf: SORT.employee, r: function (r) { return docLink('Employee', r.employee); }, c: function (r) { return r.employee; } }, { k: 'employee_name', h: L('Employee Name'), sf: SORT.employee_name, r: empBtn, c: function (r) { return r.employee_name; } }].concat(['department', 'designation', 'branch', 'job_location', 'nationality'].map(function (k) { return { k: k, h: L({ department: 'Department', designation: 'Designation', branch: 'Branch', job_location: 'Job Location', nationality: 'Nationality' }[k]), sf: SORT[k], r: function (r) { return r[k] ? bdi(r[k]) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r[k]; } }; })).concat([{ k: 'doj', h: L('Date of Joining'), sf: 'date_of_joining', r: function (r) { return dtc(r.date_of_joining); }, c: function (r) { return r.date_of_joining; } }, { k: 'status', h: L('Status'), sf: 'status', r: function (r) { return stat(r.status === 'Active' ? 'ok' : r.status === 'Left' ? 'bad' : 'warn', L(r.status || '—')); }, c: function (r) { return r.status; } }]) }), '', esc(L('Active employees unless the status filter says otherwise') + ' · ' + L('as of') + ' ' + d.meta.date));
  }

  /* ============================================================ attendance */
  function vAttendance() {
    if (D.ovErr) { return srcErr(D.ovErr, 'admin_hr_dashboard_data'); } if (!D.ov) { return skel(1, 'dms-skel-panel'); }
    var d = D.ov, a = d.attendance || {}, s = d.system_status || {}, p = attendancePolicy(d), ov = function (k) { return (d.overview || []).filter(function (x) { return x.key === k; })[0] || {}; }, det = isDetail();
    var h = alertBox('info', esc(L(p.note)));
    h += kpis([
      kpi({ label: L('Checked-in today'), dot: 'var(--dms-ok)', val: a.ok ? nv(a.checked_in) : '—', sub: esc(L('Distinct employees with at least one punch')), act: det ? rowsDrill('ci', 'Checked in today', R('checked_in')) : null }),
      kpi({ label: L('Punches today'), val: a.ok ? nv(a.punches_today) : '—', sub: esc((a.mobile_punches == null ? '—' : a.mobile_punches) + ' ' + L('mobile') + ' · ' + (a.other_punches == null ? '—' : a.other_punches) + ' ' + L('device/untagged')) }),
      kpi({ label: L('Absent today'), dot: p.count ? 'var(--dms-bad)' : null, val: nv(p.count), sub: p.inferred === null ? esc(L('Employee-level data required')) : esc(p.inferred + ' ' + L('inferred') + ' · ' + p.recorded + ' ' + L('recorded')), act: p.available && det ? rowsDrill('ab', 'Absent today', p.rows) : null }),
      kpi({ label: L('Recorded absences'), val: nv(p.recorded), sub: esc(L('Weekoffs excluded')), act: p.recorded !== null && det ? rowsDrill('rab', 'Recorded absences', p.recordedRows) : null }),
      kpi({ label: L(ov('on_leave').label || 'On Approved Leave Today'), val: nv(ov('on_leave').value), act: det ? rowsDrill('ol', 'On approved leave today', R('on_leave'), 'Leave Application') : null }),
      kpi({ label: L(ov('late').label || 'Late Check-ins'), dot: ov('late').value ? '#7c3aed' : null, val: nv(ov('late').value), sub: esc(L(ov('late').sub || '')), act: det ? rowsDrill('late', 'Late check-ins today', R('late')) : null })
    ]);
    if (!a.ok) { return h + alertBox('warn', esc(L('Attendance data could not be read with your permissions.'))); }
    var pt = a.period_trend || [];
    h += two(panel(L('Daily check-ins · 14 days'), barChart((a.trend || []).map(function (x) { return x.date; }), 'day', [{ label: L('Present'), color: 'var(--dms-ok)', val: function (k) { var x = (a.trend || []).filter(function (y) { return y.date === k; })[0]; return x ? x.present : 0; } }, { label: L('Absent'), color: 'var(--dms-bad)', val: function (k) { var x = (a.trend || []).filter(function (y) { return y.date === k; })[0]; return x ? x.absent : 0; } }], num), '', esc(L('Friday is a weekoff for all; Saturday is also a weekoff for Saudi nationals.'))),
      panel(L('Auto-attendance sync'), s.auto_attendance && s.auto_attendance.readable === false ? empty(L('Shift Type not readable with your permissions.')) : mini([['Shift type', function (x) { return bdi(x.shift); }], ['Last check-in sync', function (x) { return esc(x.last_sync); }]], (s.auto_attendance && s.auto_attendance.stale_shifts) || [], 'All auto-attendance shifts synced recently.') + facts([['Holiday lists', s.holiday_lists && s.holiday_lists.ok ? stat('ok', L('OK')) : stat('warn', L('Check'))], ['Employees without a valid list', nv(s.holiday_lists && s.holiday_lists.employees_without_valid_list)]]), '', esc(L('Enabled shifts with no sync in the last 2 days.'))));
    if (pt.length) { h += panel(L('Attendance in the selected period'), barChart(pt.map(function (x) { return x.date; }), pt.length > 45 ? 'week' : 'day', [{ label: L('Present'), color: 'var(--dms-ok)', val: function (k) { var x = pt.filter(function (y) { return y.date === k; })[0]; return x ? x.present : 0; } }, { label: L('Absent'), color: 'var(--dms-bad)', val: function (k) { var x = pt.filter(function (y) { return y.date === k; })[0]; return x ? x.absent : 0; } }, { label: L('On leave'), color: 'var(--dms-age3)', val: function (k) { var x = pt.filter(function (y) { return y.date === k; })[0]; return x ? x.on_leave : 0; } }], num), '', esc(a.period ? a.period.from + ' → ' + a.period.to + (a.period.capped ? ' · ' + L('capped') : '') : '')); }
    if (det) {
      h += two(panel(L('Late check-ins'), tblRows('t_late', R('late'), [['employee_name', 'Employee', empBtn], ['department', 'Department'], ['shift', 'Shift'], ['first_punch', 'First punch'], ['late_by_min', 'Late (min)', null, 1]], 'late_checkins'), '', esc(L('First punch after shift start plus entry grace.'))),
        panel(L('Absent today'), p.available ? tblRows('t_abs', p.rows, [['employee_name', 'Employee', empBtn], ['department', 'Department'], ['absence_basis', 'Basis', function (r) { return '<span class="dms-sm">' + esc(L(r.absence_basis)) + '</span>'; }]], 'absent_today') : alertBox('warn', esc(L('Employee-level data required'))), '', esc(L('Approved leave & weekoffs excluded'))));
      if (R('att_period').length) { h += panel(L('Attendance by employee in the period'), tblRows('t_attp', R('att_period'), [['employee_name', 'Employee', empBtn], ['department', 'Department'], ['present_days', 'Present', null, 1], ['absent_days', 'Absent', null, 1], ['leave_days', 'Leave', null, 1], ['attendance_pct', 'Attendance %', function (r) { return r.attendance_pct == null ? '—' : '<span class="dms-num">' + pc(r.attendance_pct) + '</span>'; }, 1]], 'attendance_period')); }
    }
    return h;
  }
  var ROWF = [['department', 'Department'], ['branch', 'Branch'], ['job_location', 'Job Location'], ['nationality', 'Nationality'], ['designation', 'Designation'], ['leave_type', 'Leave Type'], ['workflow_state', 'Workflow State'], ['shift', 'Shift'], ['document', 'Document'], ['status', 'Status']];
  function tblRows(id, rows, cols, file) {
    return regTable({ id: id, rows: rows, pageSize: 15, file: file, facets: fcRows(rows, ROWF), text: function (r) { return cols.map(function (c) { return r[c[0]]; }).join(' '); }, empty: L('No records.'),
      cols: cols.map(function (c) { return { k: c[0], h: L(c[1]), num: c[3], s: function (r) { return c[3] ? +r[c[0]] || 0 : r[c[0]]; }, r: c[2] || (c[3] ? function (r) { return '<span class="dms-num">' + nv(r[c[0]]) + '</span>'; } : function (r) { return r[c[0]] ? bdi(r[c[0]]) : '<span class="dms-sm">—</span>'; }), c: function (r) { return r[c[0]]; } }; }) });
  }

  /* ============================================================ analytics (main API) */
  /* ============================================================ forms & reports (the shortcuts of the retired "HR Dash Board" workspace) */
  var LINKS = [
    ['HR forms', [['d', 'Employee Checkin', 'Employee Checkin', 'تسجيل حضور الموظف'], ['d', 'Leave Request Form', 'Leave Request Form', 'نموذج طلب إجازة'], ['d', 'Employee Feedback Records', 'Employee Feedback', 'ملاحظات على الموظف'],
      ['d', 'Employee Evaluation', 'Employee Evaluation', 'تقييم الموظف'], ['d', 'NDA Form', 'NDA Form', 'اتفاقية السرية'], ['d', 'Code Of Conduct And Ethics Form', 'Code of Conduct', 'مدونة السلوك والأخلاقيات'],
      ['d', 'Resignation Letter', 'Resignation Letter', 'خطاب الاستقالة'], ['d', 'Attendance Register', 'Attendance Register', 'سجل الحضور'], ['d', 'Qiwa Establishment Monthly', 'Qiwa Establishment Monthly', 'قوى - المنشأة الشهري']]],
    ['Attendance & leave reports', [['r', 'Daily Attendance Report', 'Daily Attendance Report', 'تقرير الحضور اليومي'], ['r', 'Monthly Attendance Card', 'Monthly Attendance Card', 'تقرير الحضور الشهري'],
      ['r', 'Monthly Attendance Deduction  Report', 'Monthly Attendance Deduction Report', 'خصم الحضور الشهري'], ['r', 'Leaves Report', 'Leaves Report', 'تقرير الإجازات'],
      ['r', 'Employee Leave balance Report', 'Employee Leave Balance Report', 'تقرير رصيد إجازات الموظف'], ['r', 'Employees Vacation History Report', 'Employees Vacation History', 'سجل إجازات الموظفين']]],
    ['Employee reports', [['r', 'Employee Under Probation Period', 'Employees Under Probation', 'الموظفون تحت فترة التجربة'], ['r', 'Employee Aniversary Report', 'Employee Anniversary Report', 'تقرير الذكرى السنوية للموظف'],
      ['r', 'Job Offer to Employee Mapping Report', 'Job Offer to Employee Mapping', 'ربط عرض العمل بالموظف'], ['x', 'Employee Without Contracts', 'Employees Without Contracts', 'موظف بدون عقد'],
      ['x', 'Active Employees with No Job Offer Report', 'Active Employees with No Job Offer', 'موظف نشط بدون عرض عمل'], ['x', 'DM Employee List', 'DM Employee List', 'قائمة موظفي DM']]]];
  function linkUrl(k, n) { var s = G.frappe && frappe.router && frappe.router.slug ? frappe.router.slug(n) : n.toLowerCase().replace(/ /g, '-'); return k === 'd' ? '/app/' + s : '/app/query-report/' + encodeURIComponent(n); }
  function vLinks() {
    return alertBox('info', esc(L('Open the ERP forms and reports from the former HR Dash Board workspace.'))) + LINKS.map(function (g) {
      return panel(L(g[0]), '<div class="ah-links">' + g[1].map(function (x) {
        var lbl = LANG === 'ar' ? x[3] : x[2], sub = LANG === 'ar' ? x[2] : x[3];
        if (x[0] === 'x') { return '<div class="ah-link ah-link-off" title="' + esc(x[1]) + '"><b>' + bdi(lbl) + '</b><span class="dms-sm">' + esc(L('Disabled in ERP')) + '</span></div>'; }
        return '<a class="ah-link" href="' + esc(linkUrl(x[0], x[1])) + '" title="' + esc(x[1]) + '"><b>' + bdi(lbl) + '</b><span class="dms-sm" dir="auto">' + esc(sub) + '</span></a>';
      }).join('') + '</div>');
    }).join('');
  }
  function vAnalytics() {
    if (D.ovErr) { return srcErr(D.ovErr, 'admin_hr_dashboard_data'); } if (!D.ov) { return skel(1, 'dms-skel-panel'); }
    var d = D.ov, an = d.analytics || {}, sz = an.saudization || {}, mv = an.movement || [], to = an.turnover || [];
    var h = kpis([
      kpi({ label: L('Saudization (provisional)'), dot: 'var(--dms-ok)', val: sz.pct == null ? '—' : pc(sz.pct), sub: esc(L(nv(sz.saudi) + ' Saudi of ' + nv(sz.total) + ' active')), tip: L(sz.rule || '') }),
      kpi({ label: L('Attrition (12 months)'), val: an.attrition_12m_pct == null ? '—' : pc(an.attrition_12m_pct), sub: esc(L('Approximate')), tip: L(an.attrition_note || '') }),
      kpi({ label: L('Nationality conflicts'), dot: sz.conflicts ? 'var(--dms-bad)' : null, val: nv(sz.conflicts), sub: esc(L('Nationality fields disagree')) }),
      kpi({ label: L('Left without relieving date'), dot: an.left_without_relieving_date ? 'var(--dms-age3)' : null, val: nv(an.left_without_relieving_date) })
    ]);
    h += note(esc(L(sz.rule || '')));
    h += two(panel(L('Nationality'), bars(an.nationality, 'count', null, 10)), panel(L('Tenure'), bars(an.tenure, 'count')));
    h += two(panel(L('Saudization by branch'), bars(sz.by_branch, 'pct', pc)), panel(L('Saudization by job location'), bars(sz.by_location, 'pct', pc)));
    /* Totals for the chart: the 12 months shown, and the calendar year to date when those months reach back to January. */
    var yr = String(d.meta.date || TODAY).slice(0, 4), ytd = mv.filter(function (x) { return String(x.month).slice(0, 4) === yr; }), fullYtd = mv.some(function (x) { return String(x.month) <= yr + '-01'; });
    var tJ = sumOf(mv, function (x) { return x.joiners; }), tL = sumOf(mv, function (x) { return x.leavers; }), yJ = sumOf(ytd, function (x) { return x.joiners; }), yL = sumOf(ytd, function (x) { return x.leavers; });
    var mvTot = mv.length ? facts([['Joiners · ' + yr + ' to date', fullYtd ? nv(yJ) : '—'], ['Leavers · ' + yr + ' to date', fullYtd ? nv(yL) : '—'], ['Joiners · last 12 months', nv(tJ)], ['Leavers · last 12 months', nv(tL)], ['Net change · last 12 months', tJ === null || tL === null ? '—' : (tJ - tL > 0 ? '+' : tJ - tL < 0 ? '−' : '') + num(Math.abs(tJ - tL))]]) : '';
    h += two(panel(L('Joiners and leavers by month'), mvTot + (mv.length ? barChart(mv.map(function (x) { return x.month; }), 'month', [{ label: L('Joiners'), color: 'var(--dms-royal)', val: function (k) { return (mv.filter(function (x) { return x.month === k; })[0] || {}).joiners || 0; } }, { label: L('Leavers'), color: 'var(--dms-bad)', val: function (k) { return (mv.filter(function (x) { return x.month === k; })[0] || {}).leavers || 0; } }], num) : empty(L('No records.')))),
      panel(L('Monthly turnover rate'), to.length ? barChart(to.map(function (x) { return x.month; }), 'month', [{ label: L('Turnover %'), color: 'var(--dms-age3)', val: function (k) { return (to.filter(function (x) { return x.month === k; })[0] || {}).rate || 0; } }], function (v) { return pc(v); }) : empty(L('No records.')), '', esc(an.turnover_note ? L(an.turnover_note.basis || '') : '')));
    var dq = d.data_quality || [];
    return h + panel(L('Data quality'), mini([['Issue', function (x) { return esc(L(x.label)); }], ['Severity', function (x) { return sevTag(x.severity); }], ['Count', function (x) { return R('dq_' + x.key).length ? '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="' + rowsDrill('dq_' + x.key, x.label, R('dq_' + x.key), x.key === 'leave_status_mismatch' ? 'Leave Application' : 'Employee') + '">' + num(x.count) + '</button>' : nv(x.count); }, 1], ['Share of active', function (x) { return x.pct == null ? '—' : pc(x.pct); }, 1]], dq.slice().sort(function (x, y) { return ({ high: 0, medium: 1, low: 2 }[x.severity] - { high: 0, medium: 1, low: 2 }[y.severity]) || y.count - x.count; })), '', esc(L('Issues are displayed only; fix records in ERPNext after HR review.')));
  }
  function vActions(AM) { return actionsTab(AM, L('Action lists are as of today and follow the company, department, branch and job location filters.')); }

  /* ============================================================ employee panel (admin_hr_employee_detail) and drills */
  var EDET = null;
  function kvl(rows) { return '<div class="dms-facts ah-facts">' + rows.map(function (r) { return '<div><span class="dms-sm">' + esc(L(r[0])) + '</span><b>' + (r[2] ? r[1] : r[1] === '' || r[1] == null ? '<span class="dms-sm">—</span>' : esc(r[1])) + '</b></div>'; }).join('') + '</div>'; }
  function cnts(o) { var k = Object.keys(o || {}); return k.length ? k.map(function (s) { return esc(L(s)) + ' ' + num(o[s]); }).join(' · ') : '—'; }
  function empBody() {
    if (!EDET) { return ''; } if (EDET.err) { return alertBox('err', esc(EDET.err)); } var m = EDET.m; if (!m) { return skel(1, 'dms-skel-panel'); }
    var b = m.basic || {}, a = m.attendance || {}, l = m.leave || {}, t = m.training || {}, q = m.requests || {}, h = '';
    h += '<h4 class="ah-h">' + esc(L('A · Basic information')) + '</h4>' + kvl([['Company', b.company], ['Department', b.department], ['Designation', b.designation], ['Branch', b.branch], ['Job location', b.job_location], ['Nationality', b.nationality], ['Date of joining', b.date_of_joining], ['Employment status', b.status], ['Employment type', b.employment_type], ['Reports to', b.reports_to], ['Default shift', b.default_shift]]);
    h += '<h4 class="ah-h">' + esc(L('B · Attendance summary')) + '</h4>' + (a.available ? kvl([['Attendance records (30 days)', cnts(a.last_30_days), 1], ['Late entries (30 days)', a.late_entries_30d], ['Days with biometric/mobile punches (30 days)', a.punch_days_30d], ['Last punch', a.last_punch], ['Last attendance record', a.last_record]]) : empty(L('Attendance not readable with your permissions.')));
    h += '<h4 class="ah-h">' + esc(L('C · Leave information')) + '</h4>' + (!l.available ? empty(L('Leave Applications not readable with your permissions.')) : mini([['Leave type', function (x) { return bdi(x.leave_type); }], ['Allocated', function (x) { return nv(x.allocated); }, 1], ['Balance (approved only)', function (x) { return nv(x.balance); }, 1], ['Pending (not subtracted)', function (x) { return nv(x.pending_deducted); }, 1]], l.balances || [], 'No allocation') + note(esc(L(l.balance_note || ''))) + mini([['Application', function (x) { return docLink('Leave Application', x.name); }], ['Type', function (x) { return bdi(x.leave_type); }], ['From', function (x) { return esc(x.from_date); }], ['To', function (x) { return esc(x.to_date); }], ['Days', function (x) { return nv(x.days); }, 1]], (l.pending || []).concat(l.approved_history || []).slice(0, 12), 'No applications'));
    h += '<h4 class="ah-h">' + esc(L('D · Documents & compliance')) + '</h4>' + mini([['Document', function (x) { return esc(L(x.document)); }], ['Expiry date', function (x) { return esc(x.date || '—'); }], ['Days left', function (x) { return x.days_left == null ? '—' : num(x.days_left); }, 1], ['Status', function (x) { return stat({ expired: 'bad', due_30: 'bad', due_60: 'warn', due_90: 'warn', valid: 'ok' }[x.status] || 'n', L(x.status_label || x.status || '—')) + (x.warning ? '<div class="dms-sm">' + esc(x.warning) + '</div>' : ''); }]], m.documents || []) + note(esc(L('Only expiry dates and status are shown. ID, Iqama and passport numbers, bank, salary and medical details are never returned by this panel.')));
    h += '<h4 class="ah-h">' + esc(L('E · Training progress')) + '</h4>' + (!t.available ? empty(L('Training progress not readable with your permissions.')) : kvl([['Assigned', t.assigned], ['Completed', t.completed], ['Pending', t.pending], ['Overdue', t.overdue]]));
    h += '<h4 class="ah-h">' + esc(L('F · HR requests')) + '</h4>' + mini([['Request', function (x) { return x.doctype && x.name ? docLink(x.doctype, x.name) : esc(x.name || ''); }], ['Type', function (x) { return esc(x.type || ''); }], ['Status', function (x) { return esc(x.status || ''); }], ['Created', function (x) { return esc(String(x.created || '').slice(0, 10)); }]], q.items || [], 'No requests');
    return h;
  }
  function drill(id) {
    if (id.indexOf('emp:') === 0 && EDET) { return { title: EDET.m && EDET.m.basic ? EDET.m.basic.employee_name + ' · ' + EDET.id : EDET.id, sub: L('Employee details'), link: ['Employee', EDET.id, EDET.id], body: empBody(), ah: 'emp' }; }
    if (id.indexOf('rows:') === 0) {
      var x = DRL[id.slice(5)]; if (!x) { return null; }
      return { title: L(x.title), sub: num(x.rows.length) + ' ' + L('records'), spec: { rows: x.rows, file: id.slice(5), facets: fcRows(x.rows, ROWF), text: function (r) { return [r.employee, r.employee_name, r.department].join(' '); }, cols: [{ h: L('Employee'), r: function (r) { if (r.doc_dt && r.doc_name) { return docLink(r.doc_dt, r.doc_name, r.employee_name || r.doc_name); } var n = r.leave_application || r.employee; return n ? docLink(r.leave_application ? 'Leave Application' : 'Employee', n, r.employee_name || n) : '—'; }, c: function (r) { return r.employee; } }, { h: L('Department'), r: function (r) { return bdi(r.department || '—'); }, c: function (r) { return r.department; } }, { h: L('Detail'), r: function (r) { return '<span class="dms-sm">' + esc([r.status, r.first_punch, r.late_by_min != null ? r.late_by_min + ' min' : '', r.documents, r.leave_type, r.from_date && r.to_date ? r.from_date + ' → ' + r.to_date : '', r.missing, r.absence_basis ? L(r.absence_basis) : '', r.nationality, r.detail].filter(Boolean).join(' · ')) + '</span>'; }, c: function (r) { return r.status || ''; } }] } };
    }
    if (id.indexOf('cli:') === 0) {
      var k = id.slice(4), cc = actClient(), y = cc && typeof cc === 'object' && cc[k], s = actSpecs().filter(function (z) { return z.id === k; })[0]; if (!y || !s || !y.rows) { return null; }
      return { title: s.title, sub: s.why, spec: { rows: y.rows.map(y.item).filter(Boolean), file: k, text: function (it) { return [it.title, it.desc].join(' '); }, cols: [{ h: L('Record'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.name; } }, { h: L('Detail'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc) + '</span>'; }, c: function (it) { return it.desc; } }, { h: L('Age / due'), r: function (it) { return esc(it.due || ''); }, c: function (it) { return it.due; } }] } };
    }
    return null;
  }
  function onAct(a, v) {
    if (a === 'kpi' && v.indexOf('goto:') === 0) { goTab(v.slice(5), false, true); return true; }
    if (a === 'kpi' && v.indexOf('rows:') === 0) { openDrill(v); return true; }
    if (a === 'kpi' && v.indexOf('emp:') === 0) { var id = v.slice(4); EDET = { id: id, m: null }; openDrill(v); callP('admin_hr_employee_detail', { employee: id }).then(function (m) { if (EDET && EDET.id === id) { EDET.m = m || {}; if (OVL && OVL.ah === 'emp') { OVL.title = m && m.basic ? m.basic.employee_name + ' · ' + id : id; OVL.body = empBody(); renderOverlay(); } } }, function (e) { if (EDET && EDET.id === id) { EDET.err = errKind(e) === 'perm' ? L('Not permitted') : L('Could not load employee details.'); if (OVL && OVL.ah === 'emp') { OVL.body = empBody(); renderOverlay(); } } }); return true; }
    if (a === 'kpi' && v.indexOf('pre:') === 0) { var p = v.split(':'), mod = p[1]; LST[mod] = { preset: p[2], title: p.slice(3).join(':') }; resetList(mod); renderSoft(); later(function () { var el = HOST.querySelector('#ah-list-' + mod); if (el && el.scrollIntoView) { el.scrollIntoView({ block: 'start' }); } }); return true; }
    if (a === 'clrpre') { LST[v] = { preset: '', title: '' }; resetList(v); renderSoft(); return true; }
    return false;
  }
  function resetList(mod) { var x = SS['tl_' + mod]; if (x) { x.dirty = true; x.page = 1; } }

  start();
})();

/* ==== DM theme sync (same as tools/erp/shell/dark_theme.py output; maintained here since this block is built on the standard) ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
