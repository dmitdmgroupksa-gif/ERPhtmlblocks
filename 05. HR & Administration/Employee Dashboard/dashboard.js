(function(){
var host=root_element.querySelector('#ess');if(!host||host.dataset.init==='1')return;host.dataset.init='1';

var EDP_AR = {
// ---- header / navigation ----

"Employee Self-Service Dashboard":"لوحة الخدمة الذاتية للموظف",
"Manage your profile, requests, compliance and services in one place":"أدر ملفك الشخصي وطلباتك والامتثال والخدمات في مكان واحد",
"Overview":"نظرة عامة","My ToDo Tasks":"قائمة المهام","My Profile":"ملفي الشخصي","Performance":"الأداء","My Requests":"طلباتي",
"Leave & Attendance":"الإجازات والحضور","Training":"التدريب","Documents":"المستندات","Help":"المساعدة",
"Loading your dashboard…":"جارٍ تحميل لوحتك…","Your dashboard could not be loaded. Please contact IT Support.":"تعذّر تحميل لوحتك. يُرجى التواصل مع الدعم الفني.",
"Dashboard unavailable.":"اللوحة غير متاحة.","No employee record is linked to your user account.":"لا يوجد سجل موظف مرتبط بحساب المستخدم الخاص بك.",
"Your employee record is not active.":"سجل الموظف الخاص بك غير نشط.","More than one employee record is linked to your account. Please contact HR.":"يوجد أكثر من سجل موظف مرتبط بحسابك. يُرجى التواصل مع الموارد البشرية.",
"Good morning":"صباح الخير","Good afternoon":"مساء الخير","Good evening":"مساء الخير",
// ---- profile facts ----
"Employee ID":"الرقم الوظيفي","Grade":"الدرجة","Reports to":"المدير المباشر","Nationality":"الجنسية","Date of joining":"تاريخ الالتحاق",
"Service to date":"مدة الخدمة","Contract":"العقد","Shift":"الوردية","Ends":"ينتهي","Expires":"ينتهي","Expires in":"ينتهي خلال",
"Not available":"غير متوفر","Not recorded":"غير مسجّل","Not configured":"غير مُعدّ","Not yet enabled":"غير مفعّل بعد","Not in ERP":"غير مسجّل في النظام",
"Full Time":"دوام كامل","Part Time":"دوام جزئي","Part-time":"دوام جزئي","Intern":"متدرب","Apprentice":"متدرب",
"Personal Profile":"الملف الشخصي","Dependents & Emergency Contact":"المعالون وجهة الاتصال للطوارئ","No dependents recorded.":"لا يوجد معالون مسجّلون.",
"Emergency contact":"جهة الاتصال للطوارئ","Emergency Contact":"جهة الاتصال للطوارئ","Profile Settings":"إعدادات الملف الشخصي","Account settings":"إعدادات الحساب",
// ---- statuses ----
"Active":"نشط","Inactive":"غير نشط","Left":"غادر","Suspended":"موقوف","Valid":"ساري","Expired":"منتهي","Renew Soon":"يُجدَّد قريبًا","Renew soon":"يُجدَّد قريبًا",
"Expiring soon":"ينتهي قريبًا","Due soon":"مستحق قريبًا","Not due":"غير مستحق","Expiry not verified":"تاريخ الانتهاء غير مؤكد","Not verified":"غير مؤكد",
"Open":"مفتوحة","Completed":"مكتملة","Overdue":"متأخرة","Pending":"قيد الانتظار","Cancelled":"ملغاة","Closed":"مغلقة","Resolved":"تمت المعالجة",
"Draft":"مسودة","Submitted":"مُقدَّم","Approved":"معتمد","Rejected":"مرفوض","Extended":"ممدَّد","Confirmed":"مؤكد","Assigned":"مُسند",
"Not submitted":"لم يُقدَّم","Draft – not submitted":"مسودة – لم تُقدَّم","In Transit":"قيد النقل","Scheduled":"مجدول","Critical":"حرج",
"High":"عالية","Medium":"متوسطة","Low":"منخفضة","● High":"● عالية","● Medium":"● متوسطة","● Low":"● منخفضة",
"Not Started":"لم تبدأ","Not started":"لم تبدأ","In Progress":"قيد التنفيذ","Blocked":"متوقفة","In review":"قيد المراجعة","Complete":"إكمال","Auto":"تلقائي",
"Present":"حاضر","Absent":"غائب","On leave":"في إجازة","On Leave":"في إجازة","Half Day":"نصف يوم","Work From Home":"عمل من المنزل",
"Below target":"أقل من المستهدف","On track":"على المسار الصحيح","Exceeding target":"يتجاوز المستهدف","Target not configured":"المستهدف غير مُعدّ",
"Yes":"نعم","No":"لا","None":"لا يوجد","None yet":"لا يوجد بعد","On":"تشغيل","Off":"إيقاف","Mandatory":"إلزامي",
"Vehicle Ready":"المركبة جاهزة","Not Ready":"غير جاهزة","Incomplete":"غير مكتمل","Pending Review":"بانتظار المراجعة","Not Required":"غير مطلوب","Not done":"لم يُنفَّذ",
"Vehicle not verified":"المركبة غير مؤكدة","Live (under 1 h)":"مباشر (أقل من ساعة)",
// ---- overview cards ----
"Company Assets & Vehicles":"أصول ومركبات الشركة","Company Assets":"أصول الشركة","No company assets or vehicles are currently assigned to you.":"لا توجد أصول أو مركبات للشركة مُسندة إليك حاليًا.",
"Needs attention":"يتطلب انتباهك","Nothing needs your attention right now.":"لا يوجد ما يتطلب انتباهك حاليًا.","View":"عرض",
"Days to Iqama Expiry":"الأيام المتبقية لانتهاء الإقامة","Annual Leave Balance":"رصيد الإجازة السنوية","No active leave allocation":"لا يوجد تخصيص إجازة ساري",
"Open Tasks":"المهام المفتوحة","Training Progress":"تقدّم التدريب","My Requests Pending":"طلباتي المعلّقة","Leave & IT requests":"طلبات الإجازة والدعم الفني",
"Quick Employee Services":"خدمات الموظف السريعة","Request Leave":"طلب إجازة","Request leave":"طلب إجازة","Attendance":"الحضور","My Training":"تدريبي",
"HR Request":"طلب موارد بشرية","IT Support":"الدعم التقني","My Documents":"مستنداتي","Mandatory training due":"تدريب إلزامي مستحق",
"Residency & Legal Compliance":"الإقامة والامتثال النظامي","Document":"المستند","Reference":"المرجع","Expiry Date":"تاريخ الانتهاء","Status":"الحالة",
"Iqama / Residence Permit":"الإقامة / تصريح الإقامة","Iqama":"الإقامة","National ID":"الهوية الوطنية","Days to National ID Expiry":"الأيام المتبقية لانتهاء الهوية الوطنية","Passport":"جواز السفر","Employment Contract":"عقد العمل","Medical Insurance":"التأمين الطبي",
"Work Permit (Qiwa)":"رخصة العمل (قوى)","Exit / Re-entry Visa":"تأشيرة خروج وعودة","GOSI Registration":"التسجيل في التأمينات الاجتماعية","Professional License":"الترخيص المهني",
"Leave Balances":"أرصدة الإجازات","My leave applications":"طلبات إجازاتي","Pending Leave Request":"طلب إجازة معلق","Awaiting approval":"بانتظار الموافقة",
"Attendance & Performance":"الحضور والأداء","Present Days":"أيام الحضور","On Leave Days":"أيام الإجازة","Late Marks":"مرات التأخير",
"Attendance not yet processed by HR":"لم تُعالج الموارد البشرية الحضور بعد","No working days yet":"لا توجد أيام عمل بعد",
"Requires a holiday list covering this period on your Employee record.":"يتطلب قائمة عطلات تغطي هذه الفترة في سجل الموظف الخاص بك.",
"Holiday list not configured for this period.":"قائمة العطلات غير مُعدّة لهذه الفترة.","Attendance information is not available.":"معلومات الحضور غير متوفرة.",
"Attendance & Leave":"الحضور والإجازات","Leave":"الإجازة","My Tasks & Daily Activity":"مهامي ونشاطي اليومي","My Tasks & ToDos":"مهامي وقائمة المهام",
"Training & Company Assets":"التدريب وأصول الشركة","Recent Training":"التدريب الأخير","No training assigned.":"لا يوجد تدريب مُسند.","No training assigned":"لا يوجد تدريب مُسند",
"Company Announcements":"إعلانات الشركة","Company announcements are not available.":"إعلانات الشركة غير متوفرة.","Memo":"مذكرة",
"Task Completion Rate":"معدل إنجاز المهام","See":"راجع","under your profile.":"ضمن ملفك الشخصي.",
// ---- requests / help ----
"Raise request":"تقديم طلب","Leave request (HR)":"طلب إجازة (الموارد البشرية)","Other HR requests":"طلبات موارد بشرية أخرى","Report vehicle issue":"الإبلاغ عن مشكلة في المركبة",
"Need help? Raise an":"تحتاج مساعدة؟ قدّم","IT Support request":"طلب دعم فني","or manage your account in":"أو أدر حسابك من","You can still manage your account in":"لا يزال بإمكانك إدارة حسابك من",
"Support":"الدعم","Help & Support":"المساعدة والدعم",
// ---- todo module ----
"My ToDos":"مهامي","My Tasks":"مهامي","Task Board":"لوحة المهام","My Performance":"أدائي","All My Tasks":"كل مهامي","Due Today":"مستحقة اليوم",
"Today":"اليوم","This Week":"هذا الأسبوع","This Month":"هذا الشهر","This Year":"هذه السنة","Last Month":"الشهر الماضي","Custom":"مخصص","Custom Range":"نطاق مخصص",
"Apply":"تطبيق","Period":"الفترة","Reporting period":"فترة التقرير","From date":"من تاريخ","To date":"إلى تاريخ","Date basis":"أساس التاريخ","Due Date":"تاريخ الاستحقاق",
"Assigned Date":"تاريخ الإسناد","Limit list to period":"قصر القائمة على الفترة","All priorities":"كل الأولويات","Priority":"الأولوية","All categories":"كل الفئات",
"Task category":"فئة المهمة","Manual Tasks":"المهام اليدوية","Other Linked Tasks":"المهام المرتبطة الأخرى","Automatic / Quotation":"تلقائي / عرض سعر",
"All progress":"كل حالات التقدم","Progress status":"حالة التقدم","Search title, description, ID or linked document":"ابحث بالعنوان أو الوصف أو الرقم أو المستند المرتبط",
"Search tasks":"البحث في المهام","Refresh":"تحديث","Could not load your tasks.":"تعذّر تحميل مهامك.","Try again":"حاول مرة أخرى","by":"حسب",
"list limited to this period":"القائمة مقتصرة على هذه الفترة","All dates":"كل التواريخ",
"Manual & other linked tasks · cancelled excluded · automatic/Quotation assignments shown separately":"المهام اليدوية والمرتبطة الأخرى · باستثناء الملغاة · إسنادات التلقائي/عروض الأسعار معروضة بشكل منفصل",
"Stages of one total":"مراحل من إجمالي واحد","Update":"تحديث","Blocker":"عائق","Loading…":"جارٍ التحميل…","No tasks match these filters.":"لا توجد مهام تطابق عوامل التصفية هذه.",
"Task":"المهمة","Assigned By":"أسندها","Assigned by":"أسندها","Due":"الاستحقاق","Linked Document":"المستند المرتبط","Linked document":"المستند المرتبط","Actions":"الإجراءات",
"‹ Prev":"السابق","Next ›":"التالي","View / Update":"عرض / تحديث","Loading board…":"جارٍ تحميل اللوحة…","No tasks":"لا توجد مهام",
"Automatic / Quotation Assignments":"إسنادات تلقائية / عروض أسعار","Open in My Tasks":"فتح في مهامي","Kept separate from the progress columns; no progress actions.":"منفصلة عن أعمدة التقدم؛ دون إجراءات تقدّم.",
"No open automatic assignments.":"لا توجد إسنادات تلقائية مفتوحة.","No open assignments":"لا توجد إسنادات مفتوحة","Load more":"تحميل المزيد","Calendar":"التقويم",
"Calendar uses the actual due date":"يعتمد التقويم على تاريخ الاستحقاق الفعلي","· tasks without a due date use their assigned date":"· المهام بلا تاريخ استحقاق تستخدم تاريخ إسنادها",
"Month":"شهر","Week":"أسبوع","Loading calendar…":"جارٍ تحميل التقويم…","· red outline = overdue · faded = completed/closed":"· الإطار الأحمر = متأخرة · الباهت = مكتملة/مغلقة",
"No Due Date":"بدون تاريخ استحقاق","Every unfinished task has a due date.":"لكل مهمة غير منجزة تاريخ استحقاق.","No data for this selection.":"لا توجد بيانات لهذا الاختيار.",
"Task performance":"أداء المهام","My Task Performance":"أداء مهامي","— personal ToDo metrics; not the sales Performance tab":"— مؤشرات المهام الشخصية؛ وليست تبويب أداء المبيعات",
"Weekly completions":"الإنجازات الأسبوعية","last 12 weeks · recorded completion date · all dates · click a week":"آخر 12 أسبوعًا · تاريخ الإنجاز المسجّل · كل التواريخ · انقر على أسبوع",
"No legacy closed tasks without timestamps.":"لا توجد مهام قديمة مغلقة بلا طوابع زمنية.","Status distribution":"توزيع الحالات","selected period":"الفترة المحددة",
"On-time vs late":"في الموعد مقابل المتأخر","completed tasks · selected period":"المهام المكتملة · الفترة المحددة",
"Filters used: period, date basis, priority, category (manual / other linked), search. Progress filter does not apply here.":"عوامل التصفية المستخدمة: الفترة، أساس التاريخ، الأولوية، الفئة (يدوية / مرتبطة أخرى)، البحث. لا ينطبق مرشح التقدّم هنا.",
"Built from task assignments, recorded task actions and closures on your own tasks. Manual & other linked tasks by default (choose category “Automatic / Quotation” to see those).":"مبني على إسنادات المهام والإجراءات المسجّلة وإغلاق مهامك. تُعرض المهام اليدوية والمرتبطة الأخرى افتراضيًا (اختر الفئة «تلقائي / عرض سعر» لعرضها).",
"Loading activity…":"جارٍ تحميل النشاط…","Activity History":"سجل النشاط","No activity recorded for these filters.":"لا يوجد نشاط مسجّل لعوامل التصفية هذه.","Load older activity":"تحميل نشاط أقدم",
"Total Assigned":"إجمالي المُسند","Overdue Backlog":"المتأخرات المتراكمة","All outstanding dates · in selected period:":"كل التواريخ المعلّقة · ضمن الفترة المحددة:",
"Due Today — Current":"مستحقة اليوم — الحالية","Unfinished, due":"غير منجزة، مستحقة","Open · avg age":"مفتوحة · متوسط العمر","View task":"عرض المهمة",
"Remove completion week filter":"إزالة مرشح أسبوع الإنجاز","In selected period":"ضمن الفترة المحددة","Completion Rate":"معدل الإنجاز","On-Time Rate":"معدل الالتزام بالموعد",
"Currently Pending":"المعلّقة حاليًا","All outstanding dates":"كل التواريخ المعلّقة","Avg. Completion Time":"متوسط وقت الإنجاز","Completed On Time":"مكتملة في الموعد",
"Completed Late":"مكتملة متأخرة","Task Assigned":"تم إسناد المهمة","Automatic assignment — no progress actions":"إسناد تلقائي — دون إجراءات تقدّم","Blocked reason":"سبب التوقف",
"Resume Task":"استئناف المهمة","Start Task":"بدء المهمة","Update Progress":"تحديث التقدّم","Report Blocker":"الإبلاغ عن عائق","Mark Completed":"تعيين كمكتملة",
"Open Task":"فتح المهمة","Task updated":"تم تحديث المهمة","Progress % (0-99)":"نسبة التقدّم % (0-99)","Remarks":"ملاحظات","Save":"حفظ",
"Enter 0-99. Use Mark Completed to finish the task.":"أدخل قيمة من 0 إلى 99. استخدم «تعيين كمكتملة» لإنهاء المهمة.","Please choose both dates.":"يُرجى اختيار التاريخين.",
"Select a valid date range.":"اختر نطاق تاريخ صالحًا.","Manager ToDo Dashboard":"لوحة مهام المدير","Open the Manager ToDo Dashboard for your team":"افتح لوحة مهام المدير لفريقك",
"Daily Task":"مهمة يومية","ToDo":"مهمة","Pending drafts":"مسودات معلّقة","Overdue tasks":"المهام المتأخرة",
// ---- sales performance ----
"Daily Reporting Compliance":"الالتزام بالتقارير اليومية","KPI":"مؤشر الأداء","Progress":"التقدّم","Achievement":"نسبة الإنجاز",
"Achievement = Achieved ÷ Target × 100, only where Target > 0. Amounts are not shown.":"نسبة الإنجاز = المُحقَّق ÷ المستهدف × 100، فقط عندما يكون المستهدف أكبر من 0. لا تُعرض المبالغ.",
"No approved KPI available.":"لا يوجد مؤشر أداء معتمد.","No approved KPI history.":"لا يوجد سجل مؤشرات أداء معتمدة.","Sales vs Monthly Target · approved KPIs":"المبيعات مقابل المستهدف الشهري · مؤشرات معتمدة",
"Reporting History":"سجل التقارير","Date":"التاريخ","Visits":"الزيارات","New cust.":"عملاء جدد","Orders":"الطلبات","Deliv. pending":"توصيل معلّق",
"No reports in this period.":"لا توجد تقارير في هذه الفترة.","Showing":"عرض","Show more":"عرض المزيد","Show less":"عرض أقل","View all →":"عرض الكل ←","View all":"عرض الكل",
"No tasks in this period.":"لا توجد مهام في هذه الفترة.","Historical:":"تاريخي:","Sales Target":"المستهدف البيعي","Total Sales (actual)":"إجمالي المبيعات (الفعلي)","Remaining Target":"المتبقي من المستهدف",
"Achievement = Total Sales ÷ Sales Target × 100 (bar capped at 100%; the percentage is not).":"نسبة الإنجاز = إجمالي المبيعات ÷ المستهدف البيعي × 100 (الشريط محدود عند 100%، والنسبة غير محدودة).",
"Sales target is zero or missing, so achievement cannot be calculated.":"المستهدف البيعي صفر أو غير موجود، لذا لا يمكن حساب نسبة الإنجاز.",
"Target Department Sales":"مبيعات القسم المستهدف","Other Department Sales":"مبيعات الأقسام الأخرى","Department-wise Sales":"المبيعات حسب القسم","Department":"القسم",
"Sales (SAR)":"المبيعات (ريال)","Share":"الحصة","No department rows.":"لا توجد بيانات أقسام.",
"Source report link is not shown because the shared TAR report is restricted to authorised finance roles.":"لا يُعرض رابط التقرير المصدر لأن تقرير TAR المشترك مقصور على أدوار المالية المخوّلة.",
"Sales targets, activity and reporting":"المستهدفات البيعية والنشاط والتقارير","Sales Person KPI":"مؤشرات أداء مندوب المبيعات","Performance data could not be loaded. Please contact IT Support.":"تعذّر تحميل بيانات الأداء. يُرجى التواصل مع الدعم الفني.",
"Sales activity could not be loaded. Please contact IT Support.":"تعذّر تحميل نشاط المبيعات. يُرجى التواصل مع الدعم الفني.","Current Performance":"الأداء الحالي",
"· Sales vs Monthly Target":"· المبيعات مقابل المستهدف الشهري","No approved Sales Person KPI covers the selected period.":"لا يوجد مؤشر أداء معتمد لمندوب المبيعات يغطي الفترة المحددة.",
"Last Approved Performance":"آخر أداء معتمد","No sales target line":"لا يوجد بند مستهدف بيعي","All KPI lines":"كل بنود المؤشرات","Reports in period":"التقارير في الفترة",
"Pending drafts (period)":"مسودات معلّقة (الفترة)","Customer visits":"زيارات العملاء","New customers":"عملاء جدد","No daily reports in this period.":"لا توجد تقارير يومية في هذه الفترة.",
"New daily report":"تقرير يومي جديد","Open Performance →":"فتح الأداء ←","Latest reports":"أحدث التقارير","Monthly sales achievement":"الإنجاز البيعي الشهري",
"Lower is better – no verified scoring rule":"الأقل أفضل – لا توجد قاعدة تقييم مؤكدة","No numeric target":"لا يوجد مستهدف رقمي","Sales Person KPI Breakdown":"تفصيل مؤشرات أداء مندوب المبيعات",
"Current":"الحالي","Last approved":"آخر معتمد","KPI ·":"مؤشر الأداء ·","Reports submitted":"التقارير المقدّمة",
"Salesperson mapping not verified. Your Employee record is not linked to exactly one Sales Person whose user email matches your login.":"ربط مندوب المبيعات غير مؤكد. سجل الموظف الخاص بك غير مرتبط بمندوب مبيعات واحد فقط يطابق بريده الإلكتروني حساب دخولك.",
"The TAR report for":"تقرير TAR لـ","Target data could not be loaded.":"تعذّر تحميل بيانات المستهدف.","No TAR vs Actual report exists for this period.":"لا يوجد تقرير المستهدف مقابل الفعلي لهذه الفترة.",
"Showing the approved KPI for":"عرض مؤشر الأداء المعتمد لـ","No approved KPI covers the selected dates.":"لا يوجد مؤشر أداء معتمد يغطي التواريخ المحددة.",
"Lower is better – not scored":"الأقل أفضل – غير مُقيَّم","Current Month — Sales vs Target":"الشهر الحالي — المبيعات مقابل المستهدف","Approved KPI ·":"مؤشر أداء معتمد ·","Approved KPI":"مؤشر أداء معتمد",
"No approved Sales Person KPI exists for":"لا يوجد مؤشر أداء معتمد لمندوب المبيعات لـ","Last Approved KPI":"آخر مؤشر أداء معتمد","Previous period ·":"الفترة السابقة ·","No earlier approved KPI.":"لا يوجد مؤشر أداء معتمد سابق.",
"Salesperson dashboard:":"لوحة مندوب المبيعات:","connected to Sales Staff Daily Task Management and Sales Person KPI. Leads, quotations and sales orders are not yet shown here.":"مرتبطة بإدارة المهام اليومية لفريق المبيعات ومؤشرات أداء مندوب المبيعات. لا تُعرض العملاء المحتملون وعروض الأسعار وأوامر البيع هنا بعد.",
"Sales Staff Daily Task Management":"إدارة المهام اليومية لفريق المبيعات","Daily Task Management":"إدارة المهام اليومية","Salesperson":"مندوب مبيعات","Driver":"سائق",
// ---- assets / vehicles / driver ----
"Item":"الصنف","Expiry":"الانتهاء","Oil change":"تغيير الزيت","Oil change readings are missing on the vehicle record.":"قراءات تغيير الزيت غير مسجّلة في سجل المركبة.",
"Asset information could not be loaded.":"تعذّر تحميل معلومات الأصول.","Assignment requires confirmation":"الإسناد يتطلب تأكيدًا","A. My Assigned Assets":"أ. الأصول المُسندة إليّ",
"No confirmed company assets are recorded for you.":"لا توجد أصول مؤكدة للشركة مسجّلة باسمك.","B. My Assigned Vehicles":"ب. المركبات المُسندة إليّ","No warnings":"لا توجد تحذيرات",
"All documents & oil change":"كل المستندات وتغيير الزيت","No vehicles are assigned to you.":"لا توجد مركبات مُسندة إليك.","Record":"السجل","Type":"النوع","Approval":"الاعتماد","Items":"الأصناف",
"Form header lists another recipient; item row assigns it to you":"رأس النموذج يذكر مستلمًا آخر؛ وبند الصنف يسنده إليك","No items":"لا توجد أصناف","C. My Received Assets":"ج. الأصول التي استلمتها","D. My Returned Assets":"د. الأصول التي أعدتها",
"Sections C and D list submitted handover forms only (drafts excluded). They are history and do not by themselves prove current possession — current custody is shown in A and B.":"يعرض القسمان ج ود نماذج التسليم المقدّمة فقط (باستثناء المسودات). وهي سجل تاريخي ولا تثبت وحدها الحيازة الحالية — العهدة الحالية معروضة في أ وب.",
"No submitted issue form assigns an item to you (item-level \"Assigned To\").":"لا يوجد نموذج صرف مقدّم يسند إليك صنفًا (حقل «مُسند إلى» على مستوى الصنف).",
"No submitted return forms for you.":"لا توجد نماذج إرجاع مقدّمة باسمك.","Computer/PC":"حاسب آلي","Assigned To":"مُسند إلى",
"Statuses come from the Delivery Trip workflow. Times between steps are not recorded.":"الحالات مأخوذة من سير عمل رحلة التوصيل. لا تُسجّل الأوقات بين الخطوات.",
"Navigate to destination":"الانتقال إلى الوجهة","Navigation unavailable – no verified destination coordinates":"الملاحة غير متاحة – لا توجد إحداثيات وجهة مؤكدة","Customer":"العميل","Address":"العنوان","Visited":"تمت الزيارة",
"No delivery stops recorded for this trip.":"لا توجد نقاط توصيل مسجّلة لهذه الرحلة.","No vehicle assigned.":"لا توجد مركبة مُسندة.","Vehicle tracking is not connected for this vehicle.":"تتبّع المركبة غير مربوط لهذه المركبة.",
"Completed today":"مكتملة اليوم","Vehicle":"المركبة","Trip progress":"تقدّم الرحلة","No active trip assigned for today.":"لا توجد رحلة نشطة مُسندة لليوم.",
"No Driver record is linked to your employee profile.":"لا يوجد سجل سائق مرتبط بملف الموظف الخاص بك.","Trip":"الرحلة","Destination":"الوجهة","Distance":"المسافة","Status timeline":"تسلسل الحالات","Delivery stops":"نقاط التوصيل",
"Delivery items and proof of delivery are not shown: no driver-authorised source exists.":"لا تُعرض أصناف التوصيل وإثبات التسليم: لا يوجد مصدر مخوّل للسائق.","Report Accident":"الإبلاغ عن حادث",
"Sends an urgent Accident report to the fleet team (Driver Vehicle Issue Request). Fleet staff record the formal Vehicle Accident.":"يرسل بلاغ حادث عاجلًا إلى فريق الأسطول (طلب مشكلة مركبة السائق). ويسجّل فريق الأسطول الحادث رسميًا.",
"Location":"الموقع","Summary":"الملخص","Recorded by fleet":"مسجّل من الأسطول","No accident records are linked to you.":"لا توجد سجلات حوادث مرتبطة بك.","Remarks:":"ملاحظات:",
"Photos, Najm/Taqdeer reports and amounts are held by the fleet team and are not shown here.":"الصور وتقارير نجم/تقدير والمبالغ يحتفظ بها فريق الأسطول ولا تُعرض هنا.",
"No document or oil-change warnings":"لا توجد تحذيرات للمستندات أو تغيير الزيت","No confirmed vehicle assignment.":"لا يوجد إسناد مركبة مؤكد.","No vehicle image":"لا توجد صورة للمركبة",
"Maintenance alerts":"تنبيهات الصيانة","Action":"الإجراء","No outstanding alerts from vehicle records.":"لا توجد تنبيهات قائمة من سجلات المركبة.","Verified current vehicle":"المركبة الحالية المؤكدة",
"Latest check":"آخر فحص","Fleet review":"مراجعة الأسطول","Start Vehicle Check":"بدء فحص المركبة","Previous inspections":"الفحوصات السابقة","Odometer":"عداد المسافة","Result":"النتيجة",
"No vehicle checks recorded yet.":"لا توجد فحوصات مركبة مسجّلة بعد.","Report Vehicle Issue":"الإبلاغ عن مشكلة في المركبة","Reported":"تاريخ البلاغ","Category":"الفئة","Severity":"الخطورة","No issues reported.":"لا توجد مشكلات مُبلَّغ عنها.",
"Document copies and renewal requests are not available here: no driver-authorised document or renewal workflow exists. Numbers are masked.":"نسخ المستندات وطلبات التجديد غير متاحة هنا: لا يوجد سير عمل مخوّل للسائق للمستندات أو التجديد. الأرقام مخفية.",
"Source: Arabitra tracking logs for your assigned vehicle. Routes and ETAs are not shown.":"المصدر: سجلات تتبّع Arabitra للمركبة المُسندة إليك. لا تُعرض المسارات وأوقات الوصول المتوقعة.",
"No verified company emergency procedure or contact numbers are recorded in ERPNext. Follow the instructions issued by your fleet supervisor.":"لا توجد إجراءات طوارئ أو أرقام اتصال مؤكدة للشركة مسجّلة في النظام. اتبع التعليمات الصادرة من مشرف الأسطول.",
"Driver Self-Service":"الخدمة الذاتية للسائق","Driver information could not be loaded. Please contact IT Support.":"تعذّر تحميل معلومات السائق. يُرجى التواصل مع الدعم الفني.",
"Vehicle Alerts":"تنبيهات المركبة","Trip number":"رقم الرحلة","Pickup":"الاستلام","Scheduled date":"التاريخ المجدول","Reporting time":"وقت الحضور","Scheduled delivery time":"وقت التوصيل المجدول",
"Delivery status":"حالة التوصيل","Vehicle Location":"موقع المركبة","Vehicle location":"موقع المركبة","Assigned Trips":"الرحلات المُسندة","All Trips (last 30 days)":"كل الرحلات (آخر 30 يومًا)",
"No trips are marked Completed. Trip completion is not currently being recorded in ERPNext.":"لا توجد رحلات بحالة مكتملة. لا يُسجّل إكمال الرحلات حاليًا في النظام.","No trips for this filter.":"لا توجد رحلات لهذا المرشح.",
"Trip Details ·":"تفاصيل الرحلة ·","Trip type":"نوع الرحلة","Total distance":"إجمالي المسافة","Oil change due in":"تغيير الزيت مستحق خلال","Accidents & Incident Reports":"الحوادث وتقارير الوقائع",
"City":"المدينة","Case no.":"رقم القضية","Fault share":"نسبة الخطأ","Vehicle Maintenance & Compliance":"صيانة المركبة والامتثال","Make / model":"الطراز / الموديل","Condition & Alerts":"الحالة والتنبيهات",
"Last recorded condition":"آخر حالة مسجّلة","Daily Vehicle Check":"الفحص اليومي للمركبة","Driver Vehicle Check":"فحص مركبة السائق","Vehicle Issues":"مشكلات المركبة",
"Driving Licence":"رخصة القيادة","Professional Driver Card":"بطاقة السائق المهني","Operation Card":"بطاقة التشغيل","Driver Documents":"مستندات السائق","Saudi Driving Licence":"رخصة القيادة السعودية",
"Vehicle Documents":"مستندات المركبة","Istimara / Registration":"الاستمارة / التسجيل","Vehicle Insurance":"تأمين المركبة","Fahas / Periodic Inspection":"الفحص الدوري","Vehicle Map":"خريطة المركبة",
"Coordinates":"الإحداثيات","Ignition":"التشغيل","Speed":"السرعة","Reported location":"الموقع المُبلَّغ عنه","My Day":"يومي","My Trips":"رحلاتي","Vehicle Check":"فحص المركبة",
"Driver Vehicle Issue Request":"طلب مشكلة مركبة السائق","Accident":"حادث","Overdue by":"متأخر بمقدار","Start":"بدء","Other Linked Task":"مهمة مرتبطة أخرى","Manual Task":"مهمة يدوية","Legacy closed":"مغلقة قديمًا","In progress":"قيد التنفيذ",
"(backlog view) · tick “Limit list to period” to restrict":"(عرض المتأخرات) · فعّل «قصر القائمة على الفترة» للتقييد",
"Manual & other linked tasks. Cards update only through task actions (validated on the server). ·":"المهام اليدوية والمرتبطة الأخرى. تتحدّث البطاقات فقط عبر إجراءات المهام (بتحقق من الخادم). ·",
"· tasks without a due date are listed separately · period selector not used here":"· المهام بلا تاريخ استحقاق مدرجة بشكل منفصل · لا يُستخدم محدد الفترة هنا",
"· tasks without a due date use their assigned date ·":"· المهام بلا تاريخ استحقاق تستخدم تاريخ إسنادها ·","(manual & other linked tasks only)":"(المهام اليدوية والمرتبطة الأخرى فقط)",
"Insufficient Historical Data":"بيانات تاريخية غير كافية","· newest first · period selector not used here":"· الأحدث أولًا · لا يُستخدم محدد الفترة هنا",
"Submitted for Review":"أُرسلت للمراجعة","Started / Resumed":"بدأت / استؤنفت","Started / resumed task.":"تم بدء المهمة / استئنافها.","Blocker Reported":"تم الإبلاغ عن عائق",
"Progress Updated":"تم تحديث التقدّم","Formally Closed":"أُغلقت رسميًا","Marked completed.":"تم تعيينها كمكتملة.","Marked completed - sent for review.":"تم تعيينها كمكتملة - أُرسلت للمراجعة.",
"Sun":"الأحد","Mon":"الاثنين","Tue":"الثلاثاء","Wed":"الأربعاء","Thu":"الخميس","Fri":"الجمعة","Sat":"السبت",
"ERPNext status":"حالة النظام",
"Due soon ":"مستحق قريبًا",
"Overdue (this period)":"متأخرة (هذه الفترة)",
"overdue":"متأخرة",
"Outstanding overdue ToDos from earlier dates":"مهام متأخرة من تواريخ سابقة",
"Counted separately from this period":"تُحسب بشكل منفصل عن هذه الفترة",
"Overdue ToDos (all dates)":"مهام متأخرة (كل التواريخ)",
"No tasks due":"لا توجد مهام مستحقة",
"Start Date":"تاريخ البداية",
"End Date":"تاريخ النهاية",
"Select a Start Date and End Date, then press Apply.":"اختر تاريخ البداية وتاريخ النهاية ثم اضغط تطبيق."
};
/* ===== EDP i18n (English / العربية) — added 2026-10-29 ===== */
var EDP_LANG_KEY='edp_dashboard_lang_v1';
var EDP_EN_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var EDP_AR_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
var EDP_DAYS={Mon:'الاثنين',Tue:'الثلاثاء',Wed:'الأربعاء',Thu:'الخميس',Fri:'الجمعة',Sat:'السبت',Sun:'الأحد'};
var EDP_UI={en:{lang_en:'English',lang_ar:'العربية',lang_label:'Language'},ar:{lang_en:'English',lang_ar:'العربية',lang_label:'اللغة'}};
var edpLang=(function(){try{var v=window.localStorage.getItem(EDP_LANG_KEY);return v==='ar'?'ar':'en';}catch(e){return 'en';}})();
function edpNorm(s){return String(s).replace(/&amp;/g,'&').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/\s+/g,' ').trim();}
var EDP_DICT={};(function(){for(var k in EDP_AR){EDP_DICT[edpNorm(k)]=EDP_AR[k];}})();
var EDP_DATE_RE=/\b(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{4})\b/g;
function edpDates(s){return s.replace(EDP_DATE_RE,function(m,d,dd,mo,y){return (d?EDP_DAYS[d]+'، ':'')+dd+' '+EDP_AR_MONTHS[EDP_EN_MONTHS.indexOf(mo)]+' '+y;});}
function edpT(s){var k=edpNorm(s);return EDP_DICT.hasOwnProperty(k)?EDP_DICT[k]:k;}
var EDP_PATTERNS=[
 [/^Needs attention \((\d+)\)$/,function(m){return 'يتطلب انتباهك ('+m[1]+')';}],
 [/^(\d+) days?$/,function(m){return edpArDays(m[1]);}],
 [/^(\d+) overdue$/,function(m){return m[1]+' متأخرة';}],
 [/^(.+) · (\d+)%$/,function(m){var k=edpNorm(m[1]);return EDP_DICT.hasOwnProperty(k)?EDP_DICT[k]+' · '+m[2]+'%':null;}],
 [/^(.+) on (\d{2}-\d{2}-\d{4})$/,function(m){return m[1]+' في '+m[2];}],
 [/^(\d+)d overdue$/,function(m){return 'متأخرة '+m[1]+' يوم';}],
 [/^(\d+) of (\d+) completed$/,function(m){return 'اكتمل '+m[1]+' من '+m[2];}],
 [/^(\d+) yrs? (\d+) mths?$/,function(m){return m[1]+' سنة و'+m[2]+' شهر';}],
 [/^Ends (.+)$/,function(m){return 'ينتهي في '+edpDates(m[1]);}],
 [/^Expires in (\d+) days?$/,function(m){return 'ينتهي خلال '+m[1]+' يوم';}],
 [/^Expires (.+)$/,function(m){return 'ينتهي في '+edpDates(m[1]);}],
 [/^Due (.+\d{4})$/,function(m){return 'الاستحقاق '+edpDates(m[1]);}],
 [/^Overdue by (\d+) days?$/,function(m){return 'متأخر بمقدار '+m[1]+' يوم';}],
 [/^Load more \((\d+)\)$/,function(m){return 'تحميل المزيد ('+m[1]+')';}],
 [/^Showing (\d+) of (\d+)$/,function(m){return 'عرض '+m[1]+' من '+m[2];}],
 [/^(.+) \((\d+) days?\)$/,function(m){return edpDates(m[1])+' ('+m[2]+' يوم)';}],
 [/^ToDo • (Low|Medium|High)$/,function(m){return 'مهمة • '+edpT(m[1]);}],
 [/^(Good morning|Good afternoon|Good evening)(,?\s.*)$/,function(m){return edpT(m[1])+m[2].replace(',','،');}],
 [/^(.+) request awaiting approval$/,function(m){return 'طلب '+m[1]+' بانتظار الموافقة';}],
 [/^Completed ÷ eligible tasks due in this period \(due today or earlier, or already completed\)\. (\d+) of (\d+) eligible\. No formal target is set, so the rate cannot exceed 100%\.$/,function(m){return 'المكتملة ÷ المهام المؤهلة المستحقة في هذه الفترة (المستحقة اليوم أو قبله، أو المكتملة مسبقًا). '+m[1]+' من '+m[2]+' مؤهلة. لا يوجد مستهدف رسمي، لذا لا يمكن أن يتجاوز المعدل 100%.';}],
 [/^Tasks due (.+)$/,function(m){return 'المهام المستحقة '+edpDates(m[1]);}],
 [/^Completed (\d{1,2} \w{3} \d{4})$/,function(m){return 'اكتملت في '+edpDates(m[1]);}],
 [/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/,function(m){return EDP_AR_MONTHS[['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(m[1])]+' '+m[2];}],
 [/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,function(m){return m[1]+' '+EDP_AR_MONTHS[EDP_EN_MONTHS.indexOf(m[2])];}],
 [/^\+(\d+) more$/,function(m){return '+'+m[1]+' أخرى';}],
 [/^(\d+) blocked$/,function(m){return m[1]+' متوقفة';}],
 [/^(\d+) tasks? · page (\d+) of (\d+)$/,function(m){return m[1]+' مهمة · صفحة '+m[2]+' من '+m[3];}],
 [/^(\d+) of (\d+) tasks$/,function(m){return m[1]+' من '+m[2]+' مهمة';}],
 [/^(\d+) task\(s\) with timestamp & deadline$/,function(m){return m[1]+' مهمة لها طابع زمني وموعد نهائي';}],
 [/^Creation → first recorded completion · (\d+) task\(s\)$/,function(m){return 'من الإنشاء ← أول إنجاز مسجّل · '+m[1]+' مهمة';}],
 [/^Insufficient = legacy closed without timestamp \((\d+)\) or no deadline \((\d+)\)\.$/,function(m){return 'غير كافية = مغلقة قديمًا بلا طابع زمني ('+m[1]+') أو بلا موعد نهائي ('+m[2]+').';}],
 [/^Progress updated to (\d+)%\.(?: Remarks: ([\s\S]*))?$/,function(m){return 'تم تحديث التقدّم إلى '+m[1]+'%.'+(m[2]!=null?' ملاحظات: '+m[2]:'');}],
 [/^Marked completed - sent for review\.(?: Remarks: ([\s\S]*))?$/,function(m){return 'تم تعيينها كمكتملة - أُرسلت للمراجعة.'+(m[1]!=null?' ملاحظات: '+m[1]:'');}],
 [/^Marked completed\.(?: Remarks: ([\s\S]*))?$/,function(m){return 'تم تعيينها كمكتملة.'+(m[1]!=null?' ملاحظات: '+m[1]:'');}],
 [/^Blocked: ([\s\S]+)$/,function(m){return 'متوقفة: '+m[1];}],
 [/^[A-Za-z][A-Za-z ]* \d+(?: · [A-Za-z][A-Za-z ]* \d+)+$/,function(m){return m[0].split(' · ').map(function(seg){var x=seg.match(/^(.+) (\d+)$/);return x?edpT(x[1])+' '+x[2]:seg;}).join(' · ');}],
 [/^(.+?)\s+(\d[\d\-\/.,%]*)$/,function(m){var k=edpNorm(m[1]);return EDP_DICT.hasOwnProperty(k)?EDP_DICT[k]+' '+m[2]:null;}]
];
function edpTranslateText(s){
  var k=edpNorm(s);if(!k||!/[A-Za-z]/.test(k))return null;
  if(EDP_DICT.hasOwnProperty(k))return EDP_DICT[k];
  for(var i=0;i<EDP_PATTERNS.length;i++){var m=k.match(EDP_PATTERNS[i][0]);if(m){var r=EDP_PATTERNS[i][1](m);if(r!=null)return r;}}
  var d=edpDates(k);if(d!==k&&/^[\d\s،,–\-()]*$/.test(k.replace(EDP_DATE_RE,'').replace(/[–\-()\s]/g,'')))return d;
  return null;
}
/* Shadow ERPNext's global __() inside this block only (dialogs, alerts). English keeps the original behaviour. */
var EDP_ORIG__=window.__;
var __=function(txt,args,ctx){
  if(edpLang!=='ar'){return EDP_ORIG__?EDP_ORIG__(txt,args,ctx):txt;}
  var t=edpTranslateText(txt);t=t==null?String(txt):t;
  if(args&&args.length){for(var i=0;i<args.length;i++){t=t.split('{'+i+'}').join(edpDates(String(args[i])));}}
  return t;
};
var EDP_ORIG=new WeakMap(),EDP_ATTRS=['placeholder','title','aria-label'],edpBusy=false;
/* Stored ERP data (task titles, names, IDs, departments, linked docs): only status/placeholder values and dates are translated there. */
var EDP_DATA_SEL='a[href]:not([href="#"]):not([data-go]),.pn,.pd,.f b,.f em,td > b,.tdx-mut,.tdx-bct,.tdx-chip2';
var EDP_ENUM={};['Active','Inactive','Left','Suspended','Valid','Expired','Renew Soon','Renew soon','Expiring soon','Due soon','Not due','Expiry not verified','Not verified','Open','Completed','Overdue','Pending','Cancelled','Closed','Resolved','Draft','Submitted','Approved','Rejected','Extended','Confirmed','Assigned','Not submitted','In Transit','Scheduled','Critical','High','Medium','Low','Not Started','Not started','In Progress','In progress','Blocked','Present','Absent','On leave','On Leave','Half Day','Work From Home','Yes','No','None','Not available','Not recorded','Not configured','Not in ERP','Full Time','Part Time','Part-time','Intern','Apprentice','Pending Review','Not done'].forEach(function(k){EDP_ENUM[k]=1;});
function edpIsData(el){var d=el&&el.closest?el.closest(EDP_DATA_SEL):null;return !!(d&&host.contains(d));}
var EDP_STATIC={};['Outstanding overdue ToDos from earlier dates','View','Request Leave','Attendance','My Training','IT Support','My Documents','My leave applications','Pending Leave Request','Awaiting approval','My ToDos','Overdue (this period)','Overdue ToDos (all dates)','No tasks due','Start Date','End Date','Apply','Select a Start Date and End Date, then press Apply.'].forEach(function(x){EDP_STATIC[edpNorm(x)]=1;});
function edpTrCtx(s,el){if(!edpIsData(el))return edpTranslateText(s);var k=edpNorm(s);if((EDP_ENUM[k]||EDP_STATIC[k])&&EDP_DICT.hasOwnProperty(k))return EDP_DICT[k];for(var i=0;i<EDP_PATTERNS.length;i++){var src=EDP_PATTERNS[i][0].source;if(/^\^(\(\.\+|\[A-Za-z\]|\(Good|Blocked)/.test(src))continue;var m=k.match(EDP_PATTERNS[i][0]);if(m){var r=EDP_PATTERNS[i][1](m);if(r!=null)return r;}}var d=edpDates(k);if(d!==k&&/^[\d\s،,–\-()]*$/.test(k.replace(EDP_DATE_RE,'').replace(/[–\-()\s]/g,'')))return d;return null;}
function edpFitNav(){var top=host.querySelector('.top'),nav=top&&top.querySelector('nav');if(!nav)return;top.classList.remove('edp-stack');if(nav.scrollWidth>nav.clientWidth+1)top.classList.add('edp-stack');}
var edpFitT=null;window.addEventListener('resize',function(){clearTimeout(edpFitT);edpFitT=setTimeout(edpFitNav,150);});
function edpSkip(el){for(var e=el;e&&e!==host.parentNode;e=e.parentElement){var tn=e.tagName;if(tn==='SCRIPT'||tn==='STYLE'||tn==='TEXTAREA'||(e.hasAttribute&&e.hasAttribute('data-i18n-skip')))return true;if(e===host)break;}return false;}
function edpArDays(n){n=parseInt(n,10);if(n===1)return 'يوم واحد';if(n===2)return 'يومان';if(n>=3&&n<=10)return n+' أيام';return n+' يومًا';}
var EDP_ISO_RE=new RegExp('\\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر) \\d{4}(?:\\s*[–-]\\s*\\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر) \\d{4})?','g');
function edpFix(s,l){if(!s)return s;if(l==='en')return s.replace(/\b(-?1) days\b/g,'$1 day');s=s.replace(/(\d+) days? ago/g,function(m,n){return 'منذ '+edpArDays(n);}).replace(/(\d+) days?\b/g,function(m,n){return edpArDays(n);});s=s.replace(/[\u2066\u2069]/g,'').replace(EDP_ISO_RE,function(m){return '\u2066'+m+'\u2069';});return s;}
function edpApplyNode(n){
  if(n.nodeType===3){
    if(!n.parentElement||edpSkip(n.parentElement))return;
    var orig=EDP_ORIG.get(n);
    if(orig===undefined||(n.nodeValue!==orig.en&&n.nodeValue!==orig.ar)){orig={en:n.nodeValue,ar:null};EDP_ORIG.set(n,orig);}
    if(edpLang==='ar'){
      if(orig.ar===null){var t=edpTrCtx(orig.en,n.parentElement);if(t==null){orig.ar=orig.en;}else{var lead=orig.en.match(/^\s*/)[0],trail=orig.en.match(/\s*$/)[0];orig.ar=lead+t+trail;}orig.ar=edpFix(orig.ar,'ar');}
      if(n.nodeValue!==orig.ar)n.nodeValue=orig.ar;
      if(orig.ar===orig.en&&/[A-Za-z0-9]/.test(orig.en)&&!/[\u0600-\u06FF]/.test(orig.en)&&n.parentElement.childNodes.length===1&&!n.parentElement.hasAttribute('data-edp-ltr')){n.parentElement.setAttribute('data-edp-ltr','');if(/^[\d\s\-\/.:%+]+$/.test(orig.en.trim()))n.parentElement.setAttribute('data-edp-num','');}
    }else{var fe=edpFix(orig.en,'en');if(n.nodeValue!==fe)n.nodeValue=fe;}
    return;
  }
  if(n.nodeType!==1||edpSkip(n))return;
  EDP_ATTRS.forEach(function(a){
    if(!n.hasAttribute(a))return;
    var key='data-i18n-'+a,cur=n.getAttribute(a),en=n.getAttribute(key);
    if(en===null||(cur!==en&&cur!==n.getAttribute(key+'-ar'))){en=cur;n.setAttribute(key,en);var t=edpTrCtx(en,n);n.setAttribute(key+'-ar',t==null?en:t);}
    var want=edpLang==='ar'?n.getAttribute(key+'-ar'):en;if(cur!==want)n.setAttribute(a,want);
  });
  var c=n.childNodes;for(var i=0;i<c.length;i++)edpApplyNode(c[i]);
}
function edpSwitcher(){
  var top=host.querySelector('.top');if(!top)return;
  var sw=top.querySelector('.edp-lang');
  if(!sw){sw=document.createElement('div');sw.className='edp-lang';sw.setAttribute('data-i18n-skip','');sw.setAttribute('role','group');
    sw.innerHTML='<button type="button" data-lang="en" lang="en">English</button><span aria-hidden="true">|</span><button type="button" data-lang="ar" lang="ar">العربية</button>';
    sw.addEventListener('click',function(e){var b=e.target.closest('[data-lang]');if(b)edpSetLang(b.getAttribute('data-lang'));});
    top.appendChild(sw);setTimeout(edpFitNav,0);}
  var lbl=EDP_UI[edpLang].lang_label;if(sw.getAttribute('aria-label')!==lbl)sw.setAttribute('aria-label',lbl);
  sw.querySelectorAll('[data-lang]').forEach(function(b){var on=b.getAttribute('data-lang')===edpLang;if(b.classList.contains('on')!==on)b.classList.toggle('on',on);var ap=on?'true':'false';if(b.getAttribute('aria-pressed')!==ap)b.setAttribute('aria-pressed',ap);});
}
function edpApplyAll(){
  edpBusy=true;
  try{host.setAttribute('dir',edpLang==='ar'?'rtl':'ltr');host.setAttribute('lang',edpLang);host.classList.toggle('edp-rtl',edpLang==='ar');edpSwitcher();edpApplyNode(host);EDP_DLGS=EDP_DLGS.filter(function(m){return m.isConnected;});EDP_DLGS.forEach(function(m){edpDlgDir(m);edpApplyNode(m);});}
  finally{edpBusy=false;}
  edpFitNav();
}
function edpSetLang(l){edpLang=l==='ar'?'ar':'en';try{window.localStorage.setItem(EDP_LANG_KEY,edpLang);}catch(e){}edpApplyAll();}
var EDP_OBS_OPTS={childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:EDP_ATTRS.concat(['dir'])};
var EDP_DLGS=[];
function edpDlgDir(m){var c=m.querySelector('.modal-content')||m;if(edpLang==='ar'){if(c.getAttribute('dir')!=='rtl')c.setAttribute('dir','rtl');}else if(c.hasAttribute('dir'))c.removeAttribute('dir');}
function edpMakeObs(root,isHost){
  var runs=0,runT=Date.now(),obs;
  obs=new MutationObserver(function(muts){
    if(edpBusy)return;
    var now=Date.now();if(now-runT>1000){runT=now;runs=0;}
    if(++runs>200){obs.disconnect();if(window.console)console.warn('EDP i18n: observer paused (mutation storm)');setTimeout(function(){runs=0;if(root.isConnected)obs.observe(root,EDP_OBS_OPTS);},3000);return;}
    edpBusy=true;
    try{
      if(isHost){if(host.getAttribute('dir')!==(edpLang==='ar'?'rtl':'ltr'))host.setAttribute('dir',edpLang==='ar'?'rtl':'ltr');edpSwitcher();}
      else edpDlgDir(root);
      for(var i=0;i<muts.length;i++){var m=muts[i];
        if(m.type==='childList'){for(var j=0;j<m.addedNodes.length;j++)edpApplyNode(m.addedNodes[j]);}
        else if(m.type==='characterData'){edpApplyNode(m.target);}
        else if(m.type==='attributes'&&m.target.nodeType===1){edpApplyNode(m.target);}
      }
    }finally{edpBusy=false;}
  });
  obs.observe(root,EDP_OBS_OPTS);return obs;
}
var edpObs=edpMakeObs(host,true);
/* Pop-ups: Frappe dialogs opened by an action inside this dashboard (within 2 s of a click/key in it) are translated too. */
var edpLastAct=0;
['click','keydown','change'].forEach(function(ev){host.addEventListener(ev,function(){edpLastAct=Date.now();},true);});
function edpClaimDlg(m){
  if(!m||m.nodeType!==1||!m.classList||!m.classList.contains('modal')||m.__edp)return;
  m.__edp=1;EDP_DLGS.push(m);edpMakeObs(m,false);
  edpBusy=true;try{edpDlgDir(m);edpApplyNode(m);}finally{edpBusy=false;}
}
var edpBodyObs=new MutationObserver(function(muts){
  if(Date.now()-edpLastAct>2000)return;
  for(var i=0;i<muts.length;i++){for(var j=0;j<muts[i].addedNodes.length;j++)edpClaimDlg(muts[i].addedNodes[j]);}
  var shown=document.querySelectorAll('body > .modal.show, body > .modal[style*="display: block"]');for(var k=0;k<shown.length;k++)edpClaimDlg(shown[k]);
});
edpBodyObs.observe(document.body,{childList:true});
/* also catch re-used dialogs that become visible after a dashboard action */
document.addEventListener('shown.bs.modal',function(ev){if(Date.now()-edpLastAct<=2000)edpClaimDlg(ev.target);},true);
if(window.jQuery){window.jQuery(document).on('shown.bs.modal.edp',function(ev){if(Date.now()-edpLastAct<=2000)edpClaimDlg(ev.target);});}
setTimeout(edpApplyAll,0);
/* ===== end EDP i18n ===== */
function th(){host.dataset.theme=document.documentElement.getAttribute('data-theme')||'light'}th();
new MutationObserver(th).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
var P={cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',id:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',flag:'<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',doc:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',grade:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',plane:'<path d="M2 16l20-6-20-6 4 6z"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',cap:'<path d="M22 10L12 5 2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 5h14l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',finger:'<path d="M12 11v4M8 9a4 4 0 0 1 8 0v6M5 12a7 7 0 0 1 14 0v3"/>',head:'<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="14" width="5" height="6" rx="1"/><rect x="17" y="14" width="5" height="6" rx="1"/>',folder:'<path d="M3 6h7l2 2h9v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',form:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 13h6M9 17h4"/>',people:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1 6 4"/>',mega:'<path d="M3 11v2l13 5V6zM16 9a3 3 0 0 1 0 6M6 13l1 6h3l-1-5"/>',laptop:'<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 19h20"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',ot:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',star:'<path d="M12 3l3 6 6 1-4.5 4 1 6L12 17l-5.5 3 1-6L3 10l6-1z"/>'};
function ic(n,c){return '<svg class="ic" style="'+(c?'color:'+c:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+P[n]+'</svg>'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var NA='<span class="mut">Not available</span>';
function d(v){if(!v)return null;var x=frappe.datetime.str_to_obj(v);return x.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
function dv(v){return v?esc(d(v)):NA}
function st(days){if(days==null)return '<span class="pill n">Not recorded</span>';if(days<0)return '<span class="pill r">Expired</span>';if(days<=60)return '<span class="pill a">Renew Soon</span>';return '<span class="pill g">Valid</span>'}
function svc(days){if(days==null)return null;var y=Math.floor(days/365),m=Math.floor((days%365)/30.4);return y+' yrs '+m+' mths'}
function card(id,icon,title,link,body){return '<div class="card" id="'+id+'"><h3>'+ic(icon)+esc(title)+(link?'<span class="x">'+link+'</span>':'')+'</h3>'+body+'</div>'}
var NAV=[['ov','Overview'],['todo','My ToDo Tasks'],['prof','My Profile'],['perf','Performance'],['req','My Requests'],['lv','Leave & Attendance'],['trn','Training'],['docs','Documents'],['help','Help']];
function shell(inner){var today=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
host.innerHTML='<div class="top"><div class="lg">DM GROUP KSA</div><nav>'+NAV.filter(function(n){return n[0]!='perf'||host.dataset.sales=='1'}).map(function(n,i){var on=host.dataset.view?n[0]==host.dataset.view:!i;return '<a href="#" data-go="'+n[0]+'" class="'+(on?'on':'')+'">'+n[1]+'</a>'}).join('')+'</nav></div><div class="wrap" id="ov"><div class="ttl"><div><h1>Employee Self-Service Dashboard</h1><p>Manage your profile, requests, compliance and services in one place</p></div><div class="dt">'+esc(today)+'</div></div>'+inner+'</div>';
host.querySelectorAll('[data-go]').forEach(function(a){a.addEventListener('click',function(ev){ev.preventDefault();host.querySelectorAll('[data-go]').forEach(function(x){x.classList.toggle('on',x===a)});if(a.dataset.go=='todo'){host.dataset.view='todo';if(host.__todoShow)host.__todoShow();host.scrollIntoView({behavior:'smooth',block:'start'});return}if(a.dataset.go=='perf'){host.dataset.view='perf';host.scrollIntoView({behavior:'smooth',block:'start'});return}var wasPerf=host.dataset.view=='perf';host.dataset.view='';var t=host.querySelector('#'+a.dataset.go);if(t)setTimeout(function(){t.scrollIntoView({behavior:wasPerf?'auto':'smooth',block:'start'})},wasPerf?30:0)})})}
shell('<div class="card state">Loading your dashboard…</div>');
var PER={k:'month',from:null,to:null};
function perfClass(p){if(p==null)return {c:'na',l:'Not available',col:'var(--m)'};if(p<=80)return {c:'red',l:'Below target',col:'#DC3545'};if(p<=100)return {c:'yel',l:'On track',col:'#E6A11A'};return {c:'grn',l:'Exceeding target',col:'#219653'}}
host.__perfClass=perfClass;host.__render=function(x){render(x)};
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function range(k){var t=new Date();if(k=='today')return [iso(t),iso(t)];if(k=='week'){var s=new Date(t);s.setDate(t.getDate()-t.getDay());var e=new Date(s);e.setDate(s.getDate()+6);return [iso(s),iso(e)]}if(k=='last')return [iso(new Date(t.getFullYear(),t.getMonth()-1,1)),iso(new Date(t.getFullYear(),t.getMonth(),0))];if(k=='month')return [iso(new Date(t.getFullYear(),t.getMonth(),1)),iso(new Date(t.getFullYear(),t.getMonth()+1,0))];return [PER.from,PER.to]}
function load(){var r=range(PER.k);var y=window.scrollY;frappe.call({method:'ess_get_my_dashboard',args:{from_date:r[0],to_date:r[1]},callback:function(x){render(x.message||{});if(PER.k!=='month'||PER.touched)window.scrollTo(0,y)},error:function(){shell('<div class="card state">Your dashboard could not be loaded. Please contact IT Support.</div>')}})}
load();
function perfView(D){if(D.variant!='sales')return '';var S=D.sales||{};if(S.error)return '<div id="perfv"><div class="card"><h3>'+ic('star')+'My Performance</h3><div class="empty">Performance data could not be loaded. Please contact IT Support.</div></div></div>';
var TP=D.task_period||{items:[]};var K=S.kpi,L=S.last_kpi,R=S.reports||[];
function pc(p){return perfClass(p)}
function box(title,kp,isLast){if(!kp)return '<div class="card pv-box'+(isLast?' pv-last':'')+'"><small class="mut">'+title+'</small><div class="pv-big" style="color:var(--m);font-size:20px">'+(isLast?'No earlier approved KPI':'Target not configured')+'</div>'+(isLast?'':'<small class="mut">No approved Sales Person KPI covers '+d(TP.from)+' – '+d(TP.to)+'.</small>')+'</div>';var h=kp.headline,x=pc(h?h.pct:null);return '<div class="card pv-box'+(isLast?' pv-last':'')+'"><small class="mut">'+title+'</small><div class="pv-big" style="color:'+x.col+'">'+(h?h.pct+'%':'No sales target line')+'</div>'+(h?'<div class="pbar"><i style="width:'+Math.min(100,h.pct)+'%;background:'+x.col+'"></i></div><span class="pill" style="background:'+x.col+'1f;color:'+x.col+'">'+x.l+'</span>':'')+'<div style="margin-top:8px"><a href="/app/sales-person-kpi/'+encodeURIComponent(kp.name)+'">Approved KPI · '+d(kp.from)+' – '+d(kp.to)+'</a></div></div>'}
var C=S.compliance||{},cc=pc(C.status=='ok'?C.pct:null);
var comp='<div class="card pv-box"><small class="mut">Daily Reporting Compliance</small>'+(C.status=='ok'?'<div class="pv-big" style="color:'+cc.col+'">'+C.pct+'%</div><div class="pbar"><i style="width:'+Math.min(100,C.pct)+'%;background:'+cc.col+'"></i></div><small class="mut">'+C.submitted+' of '+C.expected+' working days reported ('+d(C.from)+' – '+d(C.to)+')</small>':'<div class="pv-big" style="color:var(--m);font-size:20px">Not configured</div><small class="mut">'+esc(C.reason||'')+'</small>')+'</div>';
var bk=K||L;var brows=bk?(bk.rows||[]).map(function(r){var x=pc(r.pct);return '<tr><td>'+esc(r.kpi)+'</td><td>'+(r.pct==null?'—':'<div class="pbar" style="margin:0;min-width:80px"><i style="width:'+Math.min(100,r.pct)+'%;background:'+x.col+'"></i></div>')+'</td><td>'+(r.pct==null?'<span class="pill n">'+(r.lower_is_better?'Lower is better – no verified scoring rule':'No numeric target')+'</span>':'<span class="pill" style="background:'+x.col+'1f;color:'+x.col+'">'+r.pct+'%</span>')+'</td></tr>'}).join(''):'';
var brk='<div class="card"><h3>'+ic('list')+'Sales Person KPI Breakdown'+(bk?'<span class="x mut">'+(K?'Current':'Last approved')+' KPI · '+d(bk.from)+' – '+d(bk.to)+'</span>':'')+'</h3>'+(bk?'<div class="tw"><table><thead><tr><th>KPI</th><th>Progress</th><th>Achievement</th></tr></thead><tbody>'+brows+'</tbody></table></div><small class="mut">Achievement = Achieved ÷ Target × 100, only where Target &gt; 0. Amounts are not shown.</small>':'<div class="empty">No approved KPI available.</div>')+'</div>';
var T=(S.trend||[]);var chart;if(!T.length)chart='<div class="empty">No approved KPI history.</div>';else{var W=Math.max(320,T.length*90),H=200,mx=Math.max(120,Math.max.apply(null,T.map(function(t){return t.pct||0}))*1.1),bw=40,gap=(W-40)/T.length,y=function(v){return 20+(H-50)*(1-v/mx)};
chart='<div class="tw"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:300px;height:auto" role="img" aria-label="Monthly sales achievement">'+'<line x1="30" x2="'+(W-5)+'" y1="'+y(100)+'" y2="'+y(100)+'" stroke="#219653" stroke-dasharray="4 4"/><text x="'+(W-8)+'" y="'+(y(100)-4)+'" text-anchor="end" font-size="10" fill="#219653">100%</text><line x1="30" x2="'+(W-5)+'" y1="'+y(80)+'" y2="'+y(80)+'" stroke="#DC3545" stroke-dasharray="2 4"/><text x="'+(W-8)+'" y="'+(y(80)-4)+'" text-anchor="end" font-size="10" fill="#DC3545">80%</text>'+
T.map(function(t,i){var x0=40+i*gap+(gap-bw)/2,p=t.pct,col=pc(p).col;var lbl=frappe.datetime.str_to_obj(t.from).toLocaleDateString('en-GB',{month:'short',year:'2-digit'});return (p==null?'<text x="'+(x0+bw/2)+'" y="'+(H-40)+'" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">n/a</text>':'<rect x="'+x0+'" y="'+y(p)+'" width="'+bw+'" height="'+(H-30-y(p))+'" rx="4" fill="'+col+'"/><text x="'+(x0+bw/2)+'" y="'+(y(p)-5)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+col+'">'+p+'%</text>')+'<text x="'+(x0+bw/2)+'" y="'+(H-12)+'" text-anchor="middle" font-size="11" fill="currentColor">'+lbl+'</text>'}).join('')+'<line x1="30" x2="'+(W-5)+'" y1="'+(H-30)+'" y2="'+(H-30)+'" stroke="currentColor" opacity=".25"/></svg></div>'}
var trend='<div class="card"><h3>'+ic('star')+'Monthly Performance Trend<span class="x mut">Sales vs Monthly Target · approved KPIs</span></h3>'+chart+'</div>';
var SL={Submit:'Submitted',Approved:'Approved',Rejected:'Rejected',Extended:'Extended',Cancelled:'Cancelled'};var tdy=S.today;
var tdyH=!tdy?'<span class="pill r">Not submitted</span>':tdy.docstatus==0?'<span class="pill a">Draft</span>':'<span class="pill g">'+esc(SL[tdy.visit_status]||tdy.visit_status)+'</span>';
var sub=R.filter(function(r){return r.docstatus==1}).length,v=0,nc=0,o=0,dp=0;R.forEach(function(r){v+=r.visits||0;nc+=r.new_customers||0;o+=r.order_received||0;dp+=r.delivery_pending||0});
function st(l,val,col){return '<div><small>'+l+'</small><b'+(col?' style="color:'+col+'"':'')+'>'+val+'</b></div>'}
var act='<div class="card"><h3>'+ic('cal')+'Sales Daily Activity<span class="x mut">'+d(TP.from)+' – '+d(TP.to)+'</span></h3><div class="sst" style="grid-template-columns:repeat(7,1fr)"><div><small>Today\'s report</small><div>'+tdyH+'</div></div>'+st('Reports submitted',sub)+st('Pending drafts',S.pending_drafts||0,S.pending_drafts?'var(--a)':'')+st('Customer visits',v)+st('New customers',nc)+st('Orders received',o)+st('Deliveries pending',dp)+'</div>'+
'<h4 class="sh">Reporting History</h4><div class="tw"><table><thead><tr><th>Date</th><th>Visits</th><th>New cust.</th><th>Orders</th><th>Deliv. pending</th><th>Status</th></tr></thead><tbody>'+(R.slice(0,30).map(function(r,ri){return '<tr'+(ri>=5?' class="hmore"':'')+'><td><a href="/app/sales-staff-daily-task-management/'+encodeURIComponent(r.name)+'">'+d(r.date)+'</a></td><td>'+(r.visits||0)+'</td><td>'+(r.new_customers||0)+'</td><td>'+(r.order_received||0)+'</td><td>'+(r.delivery_pending||0)+'</td><td><span class="pill '+(r.docstatus==1?(/Rejected|Cancelled/.test(r.visit_status)?'r':'g'):'a')+'">'+(r.docstatus==1?esc(SL[r.visit_status]||r.visit_status):'Draft')+'</span></td></tr>'}).join('')||'<tr><td colspan="6" class="mut">No reports in this period.</td></tr>')+'</tbody></table></div>'+(R.length?'<div class="moreb"><span class="mut">Showing <span class="hcnt">'+Math.min(5,R.length)+'</span> of '+R.length+'</span><span>'+(R.length>5?'<button data-hmore="1">Show more</button> ':'')+'<a href="/app/sales-staff-daily-task-management?employee_name='+encodeURIComponent(D.profile.employee)+'">View all →</a></span></div>':'')+'</div>';
var it=TP.items||[],op=it.filter(function(t){return !t.done}).length,cp=it.length-op;
var tl=it.slice(0,60).map(function(t){var h=t.doctype?'/app/'+frappe.router.slug(t.doctype)+'/'+encodeURIComponent(t.name):null;return '<div class="tk"><div class="c'+(t.done?' done':'')+'"></div><span>'+(h?'<a href="'+h+'">'+esc(t.title)+'</a>':esc(t.title))+'<small class="mut" style="display:block">'+esc(t.source)+(t.priority?' • '+esc(t.priority):'')+'</small></span><small>'+(t.due?'Due '+d(t.due):'No due date')+'</small><span class="pill '+(t.done?'g':t.overdue?'r':'a')+'" style="flex:none">'+(t.done?'Completed':t.overdue?'Overdue':esc(t.status||'Open'))+'</span></div>'}).join('')||'<div class="empty">No tasks in this period.</div>';
var tasks='<div class="card"><h3>'+ic('list')+'My Tasks & ToDos<span class="x"><a href="/app/todo?allocated_to='+encodeURIComponent(frappe.session.user)+'">My ToDos</a></span></h3><div class="sst" style="grid-template-columns:repeat(3,1fr)">'+st('Open',op)+st('Completed',cp,'var(--g)')+st('Overdue',TP.overdue||0,'var(--r)')+'</div><div class="tl">'+tl+'</div></div>';
var fb='<div class="tf">'+[['today','Today'],['week','This Week'],['month','This Month'],['last','Last Month'],['custom','Custom']].map(function(x){return '<button data-per="'+x[0]+'" class="'+(PER.k==x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'<span class="cr" style="display:'+(PER.k=='custom'?'inline-flex':'none')+'"><small>Start Date</small><input type="date" data-f="from" aria-label="Start Date" value="'+(PER.from||'')+'"><small>End Date</small><input type="date" data-f="to" aria-label="End Date" value="'+(PER.to||'')+'"><button data-apply="1">Apply</button></span></div>';
var TR=S.tar||{};function sar(v){return v==null?'Not available':'SAR '+Number(v).toLocaleString('en-US',{maximumFractionDigits:0})}
var tarH;if(TR.status=='ok'){var tc=pc(TR.pct);var mx=Math.max.apply(null,(TR.departments||[]).map(function(x){return x.amount}).concat([1]));
tarH='<div class="card tarc"><h3>'+ic('star')+'Sales Target vs Actual<span class="x mut">TAR vs Actual Report · '+d(TR.from)+' – '+d(TR.to)+'</span></h3>'+(TR.historical?'<div class="vn" style="margin:0 0 16px"><b>Historical:</b> no TAR report exists for the selected period ('+d(TP.from)+' – '+d(TP.to)+'). Showing the latest single-month report.</div>':'')+
'<div class="targ"><div class="tk2"><small>Sales Target</small><b>'+sar(TR.target||null)+'</b></div><div class="tk2"><small>Total Sales (actual)</small><b>'+sar(TR.total_sales)+'</b></div><div class="tk2"><small>Achievement</small><b style="color:'+tc.col+'">'+(TR.pct==null?'Not available':TR.pct+'%')+'</b><span class="pill" style="background:'+tc.col+'1f;color:'+tc.col+';align-self:flex-start">'+tc.l+'</span></div><div class="tk2"><small>Remaining Target</small><b>'+(TR.remaining==null?'Not available':TR.remaining<=0?'Target met':sar(TR.remaining))+'</b>'+(TR.remaining!=null&&TR.remaining<0?'<em>Exceeded by '+sar(-TR.remaining)+'</em>':'')+'</div></div>'+
(TR.pct!=null?'<div class="pbar" style="height:12px;margin:18px 0 6px"><i style="width:'+Math.min(100,TR.pct)+'%;background:'+tc.col+'"></i></div><small class="mut">Achievement = Total Sales ÷ Sales Target × 100 (bar capped at 100%; the percentage is not).</small>':'<div class="empty">Sales target is zero or missing, so achievement cannot be calculated.</div>')+
'<div class="targ2"><div class="tk2"><small>Target Department Sales</small><b>'+sar(TR.target_dept_sales)+'</b>'+(TR.target_dept_pct!=null?'<em>'+TR.target_dept_pct+'% of target</em>':'')+'</div><div class="tk2"><small>Other Department Sales</small><b>'+sar(TR.other_dept_sales)+'</b></div></div>'+
'<h4 class="sh">Department-wise Sales</h4>'+((TR.departments||[]).length?'<div class="tw"><table><thead><tr><th>Department</th><th>Sales (SAR)</th><th style="width:40%">Share</th></tr></thead><tbody>'+TR.departments.map(function(x){return '<tr><td>'+esc(x.name)+'</td><td>'+Number(x.amount).toLocaleString('en-US',{maximumFractionDigits:0})+'</td><td><div class="pbar" style="margin:0"><i style="width:'+(x.amount*100/mx)+'%;background:var(--bl)"></i></div></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">No department rows.</div>')+'<small class="mut" style="display:block;margin-top:8px">Source report link is not shown because the shared TAR report is restricted to authorised finance roles.</small></div>'}
else{var why={mapping_not_verified:'Salesperson mapping not verified. Your Employee record is not linked to exactly one Sales Person whose user email matches your login.',no_rows:'The TAR report for '+(TR.from?d(TR.from)+' – '+d(TR.to):'this period')+' contains no rows for you.',error:'Target data could not be loaded.'}[TR.status]||'No TAR vs Actual report exists for this period.';tarH='<div class="card tarc"><h3>'+ic('star')+'Sales Target vs Actual</h3><div class="pv-box" style="min-height:0"><div class="pv-big" style="color:var(--m);font-size:22px">Not available</div><small class="mut">'+why+'</small></div></div>'}
var kpiNote=(PER.k=='today'||PER.k=='week')?'<div class="vn" style="margin:0 0 12px">Sales KPIs are monthly. '+(K?'Showing the approved KPI for '+d(K.from)+' – '+d(K.to)+', which covers the selected dates.':'No approved KPI covers the selected dates.')+'</div>':'';
return '<div id="perfv"><div class="card"><h3 style="margin-bottom:4px">'+ic('star')+'My Performance<span class="x mut">'+esc(D.profile.designation||'')+'</span></h3><p class="mut" style="margin:0 0 18px">Sales targets, activity and reporting</p>'+fb+kpiNote+'<div class="pv3">'+box('Current Monthly Performance · Sales vs Monthly Target',K,false)+box('Last Approved KPI Performance (previous period)',L,true)+comp+'</div></div>'+tarH+'<h3 class="grp">Sales Person KPI</h3><div class="pv2">'+brk+trend+'</div>'+act+tasks+'</div>'}
function vcStatusPill(s){var c={'Expired':'r','Overdue':'r','Expiring soon':'a','Due soon':'a','Valid':'g','Not due':'g'}[s]||'n';return '<span class="pill '+c+'">'+esc(s||'Not recorded')+'</span>'}
function vcAlerts(v){if(!v||!v.compliance)return [];var a=[];v.compliance.forEach(function(c){if(c.status=='Expired'||c.status=='Expiring soon')a.push({lvl:c.status=='Expired'?'r':'a',t:c.doc+' '+(c.status=='Expired'?'expired':'expires')+' '+d(c.expiry)+(c.days!=null?' ('+(c.days<0?-c.days+' days ago':c.days+' days')+')':''),v:v.plate||v.name})});var o=v.oil||{};if(o.status=='Overdue')a.push({lvl:'r',t:'Oil change overdue by '+Math.round(-o.km_left).toLocaleString()+' km',v:v.plate||v.name});if(o.status=='Due soon')a.push({lvl:'a',t:'Oil change due in '+Math.round(o.km_left).toLocaleString()+' km',v:v.plate||v.name});return a}
function vcBlock(v){if(!v||!v.compliance)return '';var o=v.oil||{};return '<div class="tw" style="margin-top:8px"><table><thead><tr><th>Item</th><th>Expiry</th><th>Status</th></tr></thead><tbody>'+v.compliance.map(function(c){return '<tr><td>'+esc(c.doc)+(c.note?'<br><small class="mut">'+esc(c.note)+'</small>':'')+'</td><td>'+(c.expiry?d(c.expiry):'—')+'</td><td>'+vcStatusPill(c.status)+'</td></tr>'}).join('')+'</tbody></table></div><div class="oilb"><b>Oil change</b> '+vcStatusPill(o.status)+(o.status&&o.status!='Unknown'?'<span>'+(o.km_left<0?'Overdue by '+Math.round(-o.km_left).toLocaleString():Math.round(o.km_left).toLocaleString()+' km left')+'</span><small class="mut">Odometer '+Math.round(o.current_odometer).toLocaleString()+' · last change at '+Math.round(o.last_oil_change_km).toLocaleString()+' · interval '+Math.round(o.interval).toLocaleString()+' · next at '+Math.round(o.next_oil_change_km).toLocaleString()+' km · last service '+(o.last_service_date?d(o.last_service_date):'not recorded')+' · next service date: Not scheduled</small>':'<small class="mut">Oil change readings are missing on the vehicle record.</small>')+'</div>'}
function assetsCard(D,nogps){var AV=D.assigned_vehicles,AA=D.assigned_assets,AH=D.acquisition_history;var h='<div class="card" id="assets"><h3>'+ic('laptop')+'Company Assets & Vehicles</h3>';
if(AV===null||AA===null)return h+'<div class="empty">Asset information could not be loaded.</div></div>';AV=AV||[];AA=AA||[];AH=AH&&!Array.isArray(AH)?AH:{received:[],returned:[]};var AR=AH.received||[],AT=AH.returned||[];
if(!AV.length&&!AA.length&&!AR.length&&!AT.length)return h+'<div class="empty">No company assets or vehicles are currently assigned to you.</div></div>';
function stx(days){if(days==null)return '<span class="pill n">Not recorded</span>';if(days<0)return '<span class="pill r">Expired</span>';if(days<=60)return '<span class="pill a">Renew soon</span>';return '<span class="pill g">Valid</span>'}
function asg(a){return a.assignment=='Confirmed'?'<span class="pill g">Assigned</span>':'<span class="pill a" title="'+esc(a.reason||'')+'">Assignment requires confirmation</span>'}
var ICN={Laptop:'laptop',Mobile:'head','Computer/PC':'laptop',Monitor:'laptop'};
h+='<h4 class="sh">A. My Assigned Assets</h4>'+(AA.length?'<div class="agrid">'+AA.map(function(a){return '<div class="acard"><div class="aimg aph sm">'+ic(ICN[a.category]||'grade')+'</div><div class="abody"><div class="atitle">'+esc(a.name||a.id)+'</div><div class="mut">'+esc([a.brand,a.category].filter(Boolean).join(' · '))+(a.serial?' · S/N '+esc(a.serial):'')+'</div><div style="margin:6px 0">'+asg(a)+'</div><small class="mut">'+esc(a.source)+' · '+esc(a.id)+(a.since?' · since '+d(a.since):'')+(a.location?' · '+esc(a.location):'')+(a.reason&&a.assignment!='Confirmed'?'<br>'+esc(a.reason):'')+'</small></div></div>'}).join('')+'</div>':'<div class="empty">No confirmed company assets are recorded for you.</div>');
h+='<h4 class="sh">B. My Assigned Vehicles</h4>'+(AV.length?'<div class="vgrid '+(AV.length==1?'one':'multi')+'">'+AV.map(function(v){var conf=v.assignment=='Confirmed',al=conf&&v.compliance?vcAlerts(v):[];
var left='<div class="vsum">'+(v.image?'<img class="vimg" src="'+esc(v.image)+'" alt="">':'<div class="vimg vph">'+ic('laptop')+'</div>')+'<div class="vtxt"><div class="atitle">'+esc([v.make,v.model].filter(Boolean).join(' ')||v.name)+'</div><div class="mut">'+esc(v.plate||v.name)+(v.odometer?' · '+Number(v.odometer).toLocaleString()+' km':'')+'</div><div class="vbadges">'+asg(v)+(conf&&v.compliance?(al.length?'<span class="pill '+(al.some(function(x){return x.lvl=='r'})?'r':'a')+'">'+al.length+' warning'+(al.length>1?'s':'')+'</span>':'<span class="pill g">No warnings</span>'):'')+'</div></div></div>'+(conf?(al.length?'<div class="valerts">'+al.map(function(x){return '<div class="valert '+x.lvl+'">'+esc(x.t)+'</div>'}).join('')+'</div>':''):'<small class="mut">'+esc(v.reason||'')+'. Please contact the fleet team.</small>');
var right=conf?(v.compliance?'<details class="vdet"'+(AV.length==1?' open':'')+'><summary>All documents & oil change</summary>'+vcBlock(v)+'</details>':'<div class="adocs">'+v.docs.map(function(x){return '<span><small>'+x.doc+'</small> '+stx(x.days)+'</span>'}).join('')+'</div>'):'';
return '<div class="vcard"><div class="vleft">'+left+'</div>'+(right?'<div class="vright">'+right+'</div>':'')+'</div>'}).join('')+'</div>':'<div class="empty">No vehicles are assigned to you.</div>');
function htab(L,empty){return L.length?'<div class="tw"><table><thead><tr><th>Record</th><th>Date</th><th>Type</th><th>Approval</th><th>Items</th></tr></thead><tbody>'+L.map(function(r){return '<tr><td><b>'+esc(r.ref)+'</b>'+(r.header_differs?'<br><small class="mut">Form header lists another recipient; item row assigns it to you</small>':'')+'</td><td>'+(r.date?d(r.date):'—')+'</td><td>'+esc(r.type||'—')+'</td><td><span class="pill '+(r.approval=='Approved'?'g':r.approval=='Rejected'?'r':'a')+'">'+esc(r.approval||'Not set')+'</span></td><td>'+(r.items.length?r.items.map(function(i){return esc(i.asset_no||i.asset||'')+(i.desc?' <small class="mut">'+esc(i.desc)+'</small>':'')+(i.qty&&i.qty!='1'?' <small class="mut">×'+esc(i.qty)+'</small>':'')}).join('<br>'):'<span class="mut">No items</span>')+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">'+empty+'</div>'}
h+='<h4 class="sh">C. My Received Assets</h4>'+htab(AR,'No submitted issue form assigns an item to you (item-level "Assigned To").');
h+='<h4 class="sh">D. My Returned Assets</h4>'+htab(AT,'No submitted return forms for you.');
h+='<small class="mut" style="display:block;margin-top:8px">Sections C and D list submitted handover forms only (drafts excluded). They are history and do not by themselves prove current possession — current custody is shown in A and B.</small>';
return h+'</div>'}
function driverView(D){var p=D.profile,V=D.driver||{},veh=V.vehicles||[],pv=veh.filter(function(v){return v.name==V.verified_vehicle})[0],G=V.gps,T=V.trips||[];var DS=host.__ds||(host.__ds={tab:'day',tf:'week',sel:null});var CV=(D.assigned_vehicles||[]).filter(function(v){return v.name==V.verified_vehicle})[0];var VAL=vcAlerts(CV);
function st(days){if(days==null)return '<span class="pill n">Not recorded</span>';if(days<0)return '<span class="pill r">Expired</span>';if(days<=60)return '<span class="pill a">Renew soon</span>';return '<span class="pill g">Valid</span>'}
function card(t,icn,body,x){return '<div class="card"><h3>'+ic(icn)+t+(x?'<span class="x">'+x+'</span>':'')+'</h3>'+body+'</div>'}
function kv(arr){return '<div class="dkv">'+arr.map(function(x){return '<div><small>'+x[0]+'</small><b>'+(x[1]!=null&&x[1]!==''?esc(x[1]):'<span class="mut">Not available</span>')+'</b></div>'}).join('')+'</div>'}
var todayS=frappe.datetime.get_today();function tdate(t){return t.departure_time?String(t.departure_time).slice(0,10):null}
var SC={'Completed':'g','Cancelled':'r','In Transit':'b','Scheduled':'a','Draft':'n'};
function stops(t){return t.stops||[]}function dest(t){var s=stops(t);var l=s[s.length-1];return l?(l.customer||'')+(l.customer_address?' — '+l.customer_address.split('\n')[0]:''):null}
function timeline(t){var steps=['Draft','Scheduled','In Transit','Completed'];if(t.status=='Cancelled')return '<div class="tlx"><span class="pill r">Cancelled</span></div>';var k=steps.indexOf(t.status);return '<div class="tl3">'+steps.map(function(s,i){return '<div class="'+(i<k?'done':i==k?'cur':'')+'"><i></i><span>'+s+'</span></div>'}).join('')+'</div><small class="mut">Statuses come from the Delivery Trip workflow. Times between steps are not recorded.</small>'}
function nav(t){var s=stops(t).filter(function(x){return x.lat&&x.lng&&Math.abs(x.lat)>0.1});var l=s[s.length-1];return l?'<a class="dbtn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination='+l.lat+','+l.lng+'">Navigate to destination</a>':'<span class="pill n">Navigation unavailable – no verified destination coordinates</span>'}
function stopTable(t){var s=stops(t);return s.length?'<div class="tw"><table><thead><tr><th>#</th><th>Customer</th><th>Address</th><th>Visited</th></tr></thead><tbody>'+s.map(function(x){return '<tr><td>'+x.idx+'</td><td>'+esc(x.customer||'—')+'</td><td>'+esc(x.customer_address||'—')+'</td><td>'+(x.visited?'<span class="pill g">Yes</span>':'<span class="pill n">No</span>')+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">No delivery stops recorded for this trip.</div>'}
function trow(t){return '<tr data-trip="'+esc(t.name)+'" class="'+(DS.sel==t.name?'sel':'')+'"><td><b>'+esc(t.custom_trip_code||t.name)+'</b></td><td>'+(tdate(t)?d(tdate(t)):'—')+'</td><td>'+esc(dest(t)||'Not recorded')+'</td><td>'+esc(t.vehicle||'—')+'</td><td><span class="pill '+(SC[t.status]||'n')+'">'+esc(t.status)+'</span></td><td>'+(t.total_distance?t.total_distance+' km':'—')+'</td><td><button class="dlink" data-trip="'+esc(t.name)+'">View</button></td></tr>'}
var age=G&&G.time?(Date.now()-frappe.datetime.str_to_obj(G.time).getTime())/3600000:null;var gok=G&&!isNaN(parseFloat(G.lat))&&!isNaN(parseFloat(G.lng));var la=gok?parseFloat(G.lat):0,ln=gok?parseFloat(G.lng):0;
var fresh=age==null?'':age<=1?'<span class="pill g">Live (under 1 h)</span>':age<=24?'<span class="pill a">'+Math.round(age)+' h old</span>':'<span class="pill r">Stale – '+Math.round(age/24)+' day(s) old</span>';
function mapHtml(h){return !pv?'<div class="empty">No vehicle assigned.</div>':!gok?'<div class="empty">Vehicle tracking is not connected for this vehicle.</div>':'<div class="dmapw"><iframe class="dmap" style="height:'+h+'px" loading="lazy" title="Vehicle location" src="https://www.openstreetmap.org/export/embed.html?bbox='+(ln-0.02)+','+(la-0.012)+','+(ln+0.02)+','+(la+0.012)+'&layer=mapnik&marker='+la+','+ln+'"></iframe></div><div class="dmeta"><span>'+fresh+'</span><span class="mut">Last update '+frappe.datetime.str_to_user(G.time)+'</span></div>'}
var photo=p.image?'<img class="dph" src="'+esc(p.image)+'" alt="">':'<div class="dph">'+esc((p.name||'?').split(' ').map(function(w){return w[0]}).slice(0,2).join(''))+'</div>';
var hr=new Date().getHours(),greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
var todays=T.filter(function(t){return tdate(t)==todayS&&t.status!='Cancelled'});var act=todays.filter(function(t){return t.status=='In Transit'})[0]||todays.filter(function(t){return t.status=='Scheduled'})[0]||todays[0];
var views={};
views.day='<div class="dhero card">'+photo+'<div><div class="dgreet">'+greet+', '+esc((p.name||'').split(' ')[0])+'</div><div class="mut">'+esc(p.designation||'')+' · '+esc(p.branch||'')+'</div></div><span class="pill g">'+esc(p.status)+'</span><div class="dstat"><div><small>Today\'s trips</small><b>'+todays.length+'</b></div><div><small>Completed today</small><b>'+todays.filter(function(t){return t.status=='Completed'}).length+'</b></div><div><small>Vehicle</small><b>'+esc(pv?(pv.plate||pv.name):'None')+'</b></div></div></div>'+
(V.trip_vehicle_mismatch||VAL.length?card('Vehicle Alerts','alert',(V.trip_vehicle_mismatch?'<div class="valert a">'+esc(V.trip_vehicle_mismatch)+'</div>':'')+VAL.map(function(x){return '<div class="valert '+x.lvl+'">'+esc(x.t)+' <small>· '+esc(x.v)+'</small></div>'}).join('')):'')+'<div class="d2">'+card('Today\'s Active Job','plane',act?kv([['Trip number',act.custom_trip_code||act.name],['Status',act.status],['Pickup','Not recorded'],['Destination',dest(act)],['Scheduled date',d(tdate(act))],['Reporting time',act.custom_driver_reporting_time?String(act.custom_driver_reporting_time).slice(0,5):null],['Scheduled delivery time',null],['Delivery status',act.delivery_status]])+'<h4 class="sh">Trip progress</h4>'+timeline(act)+'<div style="margin-top:14px">'+nav(act)+'</div>':'<div class="empty">No active trip assigned for today.</div>')+card('Vehicle Location','flag',mapHtml(260),pv?esc(pv.plate||pv.name):'')+'</div>';
var flt=T.filter(function(t){var dd=tdate(t);if(DS.tf=='today')return dd==todayS;if(DS.tf=='week'){var w=frappe.datetime.add_days(todayS,-6);return dd&&dd>=w&&dd<=frappe.datetime.add_days(todayS,7)}if(DS.tf=='active')return ['Draft','Scheduled','In Transit'].indexOf(t.status)>=0;if(DS.tf=='done')return t.status=='Completed';return true});
var selT=T.filter(function(t){return t.name==DS.sel})[0]||flt[0];
views.trips=card('Assigned Trips','plane','<div class="tf">'+[['today','Today'],['week','This Week'],['active','Active'],['done','Completed'],['all','All Trips (last 30 days)']].map(function(x){return '<button data-tf="'+x[0]+'" class="'+(DS.tf==x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'</div>'+(!V.has_driver_record?'<div class="empty">No Driver record is linked to your employee profile.</div>':'<div class="tw"><table class="dtt"><thead><tr><th>Trip</th><th>Date</th><th>Destination</th><th>Vehicle</th><th>Status</th><th>Distance</th><th></th></tr></thead><tbody>'+(flt.map(trow).join('')||'<tr><td colspan="7" class="mut">'+(DS.tf=='done'?'No trips are marked Completed. Trip completion is not currently being recorded in ERPNext.':'No trips for this filter.')+'</td></tr>')+'</tbody></table></div>'))+
(selT?card('Trip Details · '+esc(selT.custom_trip_code||selT.name),'list',kv([['Status',selT.status],['Delivery status',selT.delivery_status],['Date',d(tdate(selT))],['Trip type',selT.custom_trip_type_],['Vehicle',selT.vehicle],['Total distance',selT.total_distance?selT.total_distance+' km':null],['Pickup','Not recorded'],['Destination',dest(selT)]])+'<h4 class="sh">Status timeline</h4>'+timeline(selT)+'<h4 class="sh">Delivery stops</h4>'+stopTable(selT)+'<small class="mut" style="display:block;margin-top:8px">Delivery items and proof of delivery are not shown: no driver-authorised source exists.</small>'):'');
var C=V.condition;var km=pv&&parseFloat(pv.km_to_oil_change);
var alerts=[];if(pv){pv.docs.forEach(function(x){if(x.days!=null&&x.days<=30)alerts.push(x.doc+(x.days<0?' expired':' expires in '+x.days+' days'))});if(!isNaN(km)&&km<=500)alerts.push('Oil change due in '+km+' km')}
var AC=V.accidents||[],asel=AC.filter(function(a){return a.ref==DS.acc})[0];
var accC=card('Accidents & Incident Reports','alert','<div class="dact"><button class="dbtn" data-accrep="1">Report Accident</button><small class="mut">Sends an urgent Accident report to the fleet team (Driver Vehicle Issue Request). Fleet staff record the formal Vehicle Accident.</small></div>'+(AC.length?'<div class="tw"><table><thead><tr><th>Date</th><th>Vehicle</th><th>Location</th><th>Status</th><th>Summary</th><th>Reference</th><th></th></tr></thead><tbody>'+AC.map(function(a){return '<tr class="'+(DS.acc==a.ref?'sel':'')+'"><td>'+d(a.date)+'</td><td>'+esc(a.vehicle||'—')+'</td><td>'+esc(a.location||'—')+'</td><td><span class="pill b">Recorded by fleet</span></td><td>'+esc((a.summary||'—').slice(0,60))+'</td><td>'+esc(a.ref)+'</td><td><button class="dlink" data-acc="'+esc(a.ref)+'">View</button></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">No accident records are linked to you.</div>')+(asel?'<div class="accd"><h4 class="sh">Accident '+esc(asel.ref)+'</h4>'+kv([['Date',d(asel.date)],['Vehicle',asel.vehicle],['City',asel.location],['Case no.',asel.case_no],['Fault share',asel.fault_pct!=null&&asel.fault_pct!==''?asel.fault_pct+'%':null],['Liability',asel.liability],['Taqdeer assessment',asel.taqdeer],['Insurance claim / investigation',asel.insurance_claim]])+'<small class="mut" style="display:block;margin-top:8px"><b>Remarks:</b> '+esc(asel.summary||'None')+'</small><small class="mut" style="display:block;margin-top:6px">Photos, Najm/Taqdeer reports and amounts are held by the fleet team and are not shown here.</small></div>':''));
views.vcheck=card('Vehicle Maintenance & Compliance','list',CV?'<div class="mut" style="margin-bottom:6px">'+esc(CV.plate||CV.name)+' · '+esc([CV.make,CV.model].filter(Boolean).join(' '))+'</div>'+(VAL.length?VAL.map(function(x){return '<div class="valert '+x.lvl+'">'+esc(x.t)+'</div>'}).join(''):'<div class="valert g">No document or oil-change warnings</div>')+vcBlock(CV):'<div class="empty">No confirmed vehicle assignment.</div>')+'<div class="d2">'+card('Assigned Vehicle','laptop',pv?'<div class="dveh2">'+(pv.image?'<img src="'+esc(pv.image)+'" alt="">':'<div class="dvimg mut">No vehicle image</div>')+kv([['Vehicle',pv.name],['Make / model',[pv.make,pv.model].filter(Boolean).join(' ')],['Plate',pv.plate],['Registration no.',pv.registration_no],['Odometer',pv.odometer?Number(pv.odometer).toLocaleString()+' km':null],['Status',pv.status]])+'</div>':'<div class="empty">No vehicle assigned.</div>')+
card('Condition & Alerts','alert',kv([['Last recorded condition',C?C.condition+' ('+d(C.date)+')':null],['Fahas inspection',pv&&pv.docs[2].expiry?d(pv.docs[2].expiry):null]])+(pv?'<div style="margin:8px 0">'+st(pv.docs[2].days)+'</div>':'')+'<h4 class="sh">Maintenance alerts</h4>'+(alerts.length?alerts.map(function(a){return '<div class="li"><span>'+esc(a)+'</span><span class="pill a">Action</span></div>'}).join(''):'<div class="empty">No outstanding alerts from vehicle records.</div>'))+'</div>'+
card('Daily Vehicle Check','list',(function(){var CK=V.checks||[],vv=V.verified_vehicle,last=CK[0];var tday=CK.filter(function(c){return String(c.check_datetime).slice(0,10)==todayS&&c.vehicle==vv})[0];
var RC={'Vehicle Ready':'g','Not Ready':'r','Incomplete':'a'},FC={'Approved':'g','Rejected':'r','Pending Review':'a','Not Required':'n'};
var h='<div class="dkv">'+'<div><small>Verified current vehicle</small><b>'+(vv?esc(vv):'<span class="mut">Not verified</span>')+'</b></div><div><small>Today\'s check</small><b>'+(tday?'<span class="pill '+(RC[tday.result]||'n')+'">'+esc(tday.result)+'</span>':'<span class="pill a">Not done</span>')+'</b></div><div><small>Latest check</small><b>'+(last?d(String(last.check_datetime).slice(0,10))+' · '+esc(last.result):'<span class="mut">None yet</span>')+'</b></div><div><small>Fleet review</small><b>'+(last?'<span class="pill '+(FC[last.fleet_review_status]||'n')+'">'+esc(last.fleet_review_status||'—')+'</span>':'—')+'</b></div></div>';
h+='<div class="dact">'+(vv?(tday?'<a class="dbtn" href="/app/driver-vehicle-check/'+encodeURIComponent(tday.name)+'">View today\'s check</a>':'<button class="dbtn" data-newdoc="Driver Vehicle Check">Start Vehicle Check</button>'):'<span class="pill n">'+esc(V.vehicle_reason||'Vehicle not verified')+'</span>')+'</div>';
h+='<small class="mut">Checklist: tyres, brakes, lights, engine oil, coolant, windshield & wipers, first-aid kit, fire extinguisher, load safety. Any Fail = Not Ready; any Not Checked = Incomplete. Only "Vehicle Ready" means all items passed. Failed or incomplete checks go to the fleet team for review.</small>';
h+='<h4 class="sh">Previous inspections</h4>'+(CK.length?'<div class="tw"><table><thead><tr><th>Date</th><th>Vehicle</th><th>Odometer</th><th>Result</th><th>Fleet review</th></tr></thead><tbody>'+CK.map(function(c){return '<tr><td><a href="/app/driver-vehicle-check/'+encodeURIComponent(c.name)+'">'+frappe.datetime.str_to_user(c.check_datetime)+'</a></td><td>'+esc(c.vehicle)+'</td><td>'+(c.odometer?Number(c.odometer).toLocaleString():'—')+'</td><td><span class="pill '+(RC[c.result]||'n')+'">'+esc(c.result||'—')+'</span></td><td><span class="pill '+(FC[c.fleet_review_status]||'n')+'">'+esc(c.fleet_review_status||'—')+'</span></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">No vehicle checks recorded yet.</div>');return h})())+
card('Vehicle Issues','alert',(function(){var IS=V.issues||[],vv=V.verified_vehicle||(veh.length==1?veh[0].name:null);var SV={'Critical':'r','High':'r','Medium':'a','Low':'n'},STC={'Open':'a','In Progress':'b','Resolved':'g','Closed':'n'};var open=IS.filter(function(i){return i.status=='Open'||i.status=='In Progress'});
return '<div class="dact"><button class="dbtn" data-newdoc="Driver Vehicle Issue Request">Report Vehicle Issue</button><span class="mut">'+open.length+' outstanding</span></div>'+(IS.length?'<div class="tw"><table><thead><tr><th>Reported</th><th>Vehicle</th><th>Category</th><th>Severity</th><th>Status</th></tr></thead><tbody>'+IS.map(function(i){return '<tr><td><a href="/app/driver-vehicle-issue-request/'+encodeURIComponent(i.name)+'">'+frappe.datetime.str_to_user(i.report_datetime)+'</a></td><td>'+esc(i.vehicle)+'</td><td>'+esc(i.issue_category)+'</td><td><span class="pill '+(SV[i.severity]||'n')+'">'+esc(i.severity)+'</span></td><td><span class="pill '+(STC[i.status]||'n')+'">'+esc(i.status)+'</span></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">No issues reported.</div>')})());
var ed=D.documents||[],dd2=pv?pv.driver_docs:[];function dr(n,ref,exp,days){return '<tr><td>'+n+'</td><td>'+(ref?esc(ref):'—')+'</td><td>'+(exp?d(exp):'Not recorded')+'</td><td>'+st(days)+'</td></tr>'}
var dl=dd2.filter(function(x){return x.doc=='Driving Licence'})[0]||{},pc2=dd2.filter(function(x){return x.doc=='Professional Driver Card'})[0]||{},oc=dd2.filter(function(x){return x.doc=='Operation Card'})[0]||{};
views.vcheck+=accC;views.docs='<div class="d2">'+card('Driver Documents','id','<div class="tw"><table><thead><tr><th>Document</th><th>Reference</th><th>Expiry</th><th>Status</th></tr></thead><tbody>'+dr((ed[0]&&ed[0].doc==='National ID')?'National ID':'Iqama',ed[0]&&ed[0].ref,ed[0]&&ed[0].expiry,ed[0]&&ed[0].days)+dr('Passport',ed[1]&&ed[1].ref,ed[1]&&ed[1].expiry,ed[1]&&ed[1].days)+dr('Saudi Driving Licence',dl.ref,dl.expiry,dl.days)+dr('Professional Driver Card',pc2.ref,pc2.expiry,pc2.days)+'</tbody></table></div>')+
card('Vehicle Documents','doc',pv?'<div class="tw"><table><thead><tr><th>Document</th><th>Reference</th><th>Expiry</th><th>Status</th></tr></thead><tbody>'+dr('Istimara / Registration',pv.registration_no,pv.docs[0].expiry,pv.docs[0].days)+dr('Vehicle Insurance',null,pv.docs[1].expiry,pv.docs[1].days)+dr('Operation Card',oc.ref,oc.expiry,oc.days)+dr('Fahas / Periodic Inspection',null,pv.docs[2].expiry,pv.docs[2].days)+'</tbody></table></div>':'<div class="empty">No vehicle assigned.</div>',pv?esc(pv.plate||pv.name):'')+'</div><small class="mut">Document copies and renewal requests are not available here: no driver-authorised document or renewal workflow exists. Numbers are masked.</small>';
views.map=card('Vehicle Map','flag',mapHtml(420)+(gok?kv([['Vehicle',pv.plate||pv.name],['Coordinates',la.toFixed(5)+', '+ln.toFixed(5)],['Ignition',G.ignition?'On':'Off'],['Speed',G.speed!=null?G.speed+' km/h':null],['Reported location',G.location]])+'<small class="mut">Source: Arabitra tracking logs for your assigned vehicle. Routes and ETAs are not shown.</small>':''),pv?esc(pv.plate||pv.name):'');
var at=D.attendance||{},lv=D.leaves||[],tr=D.training||[],em=p.emergency;
views.profile=assetsCard(D)+'<div class="d2">'+card('Personal Profile','user','<div class="dhero2">'+photo+'<div><div class="dgreet">'+esc(p.name)+'</div><div class="mut">'+esc(p.designation||'')+'</div></div></div>'+kv([['Employee ID',p.employee],['Branch',p.branch],['Department',p.department],['Reporting manager',p.manager&&p.manager.name],['Shift',p.shift],['Nationality',p.nationality],['Joined',d(p.date_of_joining)],['Status',p.status]]))+
card('Attendance & Leave','cal',(at.records?kv([['Present',(at.by_status||{})['Present']||0],['Absent',(at.by_status||{})['Absent']||0],['On leave',(at.by_status||{})['On Leave']||0]]):'<div class="empty">Attendance not yet processed for this period'+(at.checkin_days?' ('+at.checkin_days+' day(s) with check-ins)':'')+'.</div>')+'<h4 class="sh">Leave</h4>'+(lv.length?lv.map(function(l){return '<div class="li"><span>'+esc(l.type)+'</span><b>'+l.balance+' of '+l.allocated+'</b></div>'}).join(''):'<div class="empty">No active leave allocation</div>')+'<a class="dbtn" href="/app/leave-application/new">Request leave</a>')+'</div><div class="d2">'+
card('Training','cap',tr.length?tr.map(function(t){return '<div class="li"><span>'+esc(t.training_title||'Training')+(t.mandatory?' <span class="pill r">Mandatory</span>':'')+'</span><span class="pill '+(t.status=='Completed'?'g':'a')+'">'+esc(t.status)+'</span></div>'}).join(''):'<div class="empty">No training assigned.</div>')+
card('Dependents & Emergency Contact','people',((D.dependents||[]).map(function(x){return '<div class="li"><span>'+esc(x.dependent_name)+'</span><small class="mut">'+esc(x.relation||'')+'</small></div>'}).join('')||'<div class="empty">No dependents recorded.</div>')+'<h4 class="sh">Emergency contact</h4>'+(em?'<div class="li"><span>'+esc(em.name||'')+' <small class="mut">'+esc(em.relation||'')+'</small></span><span>'+esc(em.phone||'')+'</span></div>':'<div class="empty">Not available</div>'))+'</div>';
views.help='<div class="d2">'+card('Support','head','<div class="li"><span>IT Support</span><a class="dbtn" href="/app/it-help-desk-request/new">Raise request</a></div><div class="li"><span>Leave request (HR)</span><a class="dbtn" href="/app/leave-application/new">Apply</a></div><div class="li"><span>Other HR requests</span><span class="pill n">Not yet enabled</span></div><div class="li"><span>Report vehicle issue</span><span class="pill n">Not yet enabled</span></div><div class="li"><span>Account settings</span><a href="/app/user-profile">Profile Settings</a></div>')+card('Emergency Assistance','alert','<div class="empty">No verified company emergency procedure or contact numbers are recorded in ERPNext. Follow the instructions issued by your fleet supervisor.</div>')+'</div>';
var TABS=[['day','My Day'],['trips','My Trips'],['vcheck','Vehicle Check'],['docs','Documents'],['map','Vehicle Map'],['profile','My Profile'],['help','Help & Support']];
host.classList.remove('drv');host.classList.add('drv2');
host.innerHTML='<div class="top"><div class="lg">DM GROUP KSA<small class="dsub">Driver Self-Service</small></div><nav>'+TABS.map(function(t){return '<a href="#" data-dt="'+t[0]+'" class="'+(DS.tab==t[0]?'on':'')+'">'+t[1]+'</a>'}).join('')+'</nav></div><div class="wrap"><div class="ttl"><div><h1>'+TABS.filter(function(t){return t[0]==DS.tab})[0][1]+'</h1><p>'+esc(new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}))+'</p></div></div>'+(V.error?'<div class="card"><div class="empty">Driver information could not be loaded. Please contact IT Support.</div></div>':'')+'<div class="dview">'+views[DS.tab]+'</div></div>';
host.querySelectorAll('[data-dt]').forEach(function(a){a.addEventListener('click',function(ev){ev.preventDefault();DS.tab=a.dataset.dt;driverView(D)})});
host.querySelectorAll('[data-newdoc]').forEach(function(bt){bt.addEventListener('click',function(){var dt=bt.dataset.newdoc;var v=V.verified_vehicle||(dt=='Driver Vehicle Issue Request'&&veh.length==1?veh[0].name:null);var o={};if(v)o.vehicle=v;frappe.new_doc(dt,o)})});
host.querySelectorAll('[data-acc]').forEach(function(bt){bt.addEventListener('click',function(){DS.acc=DS.acc==bt.dataset.acc?null:bt.dataset.acc;driverView(D)})});
host.querySelectorAll('[data-accrep]').forEach(function(bt){bt.addEventListener('click',function(){var v=V.verified_vehicle||(veh.length==1?veh[0].name:null);var o={issue_category:'Accident',severity:'High'};if(v)o.vehicle=v;frappe.new_doc('Driver Vehicle Issue Request',o)})});
host.querySelectorAll('[data-tf]').forEach(function(a){a.addEventListener('click',function(){DS.tf=a.dataset.tf;DS.sel=null;driverView(D)})});
host.querySelectorAll('tr[data-trip],button[data-trip]').forEach(function(a){a.addEventListener('click',function(ev){ev.stopPropagation();DS.sel=a.dataset.trip;driverView(D);var c=host.querySelectorAll('.dview .card')[1];if(c)c.scrollIntoView({behavior:'smooth',block:'start'})})});
}
function render(D){host.dataset.sales=D.variant=='sales'?'1':'';if(D.ok&&D.variant=='driver'){driverView(D);return}host.classList.remove('drv');host.classList.remove('drv2');if(D.variant!='sales'&&host.dataset.view=='perf')host.dataset.view='';
if(!D.ok){var msg={no_employee:'No employee record is linked to your user account.',inactive:'Your employee record is not active.',multiple_employees:'More than one employee record is linked to your account. Please contact HR.'}[D.reason]||'Dashboard unavailable.';
shell('<div class="card state"><b>'+esc(msg)+'</b><p>You can still manage your account in <a href="/app/user-profile">Profile Settings</a>.</p></div>');return}
var p=D.profile,today=D.today;
var photo=p.image?'<img class="ph" src="'+esc(p.image)+'" alt="">':'<div class="ph">'+esc((p.name||'?').split(' ').map(function(w){return w[0]}).slice(0,2).join(''))+'</div>';
function F(icn,l,v,sub){return '<div class="f">'+ic(icn)+'<div><small>'+l+'</small><b>'+(v?esc(v):NA)+'</b>'+(sub?'<em>'+esc(sub)+'</em>':'')+'</div></div>'}
var prof='<div class="card" id="prof"><div class="prof">'+photo+'<div><div class="pn">'+esc(p.name)+'</div><div class="pd">'+esc(p.designation||'')+'</div><div class="pd">'+esc(p.department||'')+(p.branch?' • '+esc(p.branch):'')+'</div><div style="margin-top:10px"><span class="pill g">'+esc(p.status)+'</span></div></div><div class="facts">'+
F('id','Employee ID',p.employee)+F('grade','Grade',p.grade)+F('user','Reports to',p.manager&&p.manager.name,p.manager&&p.manager.designation)+F('flag','Nationality',p.nationality)+
F('cal','Date of joining',d(p.date_of_joining))+F('clock','Service to date',svc(p.service_days))+F('doc','Contract',p.contract_type,p.contract_end?'Ends '+d(p.contract_end):null)+F('cal','Shift',p.shift,p.company)+'</div></div></div>';
var docs=D.documents||[],iq=docs[0];
var al=[];docs.forEach(function(x){if(!x.alert||x.days==null)return;var lim=x.doc=='Passport'?180:60;if(x.days<=lim)al.push(['doc',x.days<0?'r':'a',x.doc+(x.days<0?' expired':' renewal approaching'),(x.days<0?'Expired ':'Expires in '+x.days+' days ')+'('+d(x.expiry)+')',x.days<0?'Renew':'Renew Soon','#docs'])});
(D.pending_leave||[]).forEach(function(l){al.push(['clock','a',esc(l.leave_type)+' request awaiting approval',d(l.from_date)+' – '+d(l.to_date)+' ('+l.total_leave_days+' days)','View','/app/leave-application/'+encodeURIComponent(l.name)])});
(D.training||[]).forEach(function(t){if(t.mandatory&&t.status!='Completed')al.push(['cap','b','Mandatory training due',(t.training_title||'Training')+(t.due_date?' – due '+d(t.due_date):''),'Open','#trn'])});
var od=(D.tasks||[]).filter(function(t){return t.overdue}).length;if(od)al.push(['list','r',od+' overdue task'+(od>1?'s':''),'Past due date','View','#tasks']);
var colors={r:['var(--rs)','var(--r)'],a:['var(--as)','var(--a)'],b:['var(--bls)','var(--bl)'],g:['var(--gs)','var(--g)']};
var alHtml=al.length?al.slice(0,5).map(function(a){var c=colors[a[1]];return '<div class="al"><div class="ai" style="background:'+c[0]+';color:'+c[1]+'">'+ic(a[0],c[1])+'</div><div><b>'+a[2]+'</b><span>'+esc(a[3])+'</span></div><a class="pill '+(a[1]=='r'?'r':a[1]=='a'?'a':'b')+'" href="'+a[5]+'" '+(a[5][0]=='#'?'data-anchor="1"':'')+'>'+a[4]+'</a></div>'}).join(''):'<div class="empty">Nothing needs your attention right now.</div>';
var need='<div class="card"><h3>'+ic('alert','var(--r)')+'Needs attention ('+al.length+')</h3>'+alHtml+'</div>';
var annual=(D.leaves||[]).filter(function(l){return /annual/i.test(l.type)})[0];
var att=D.attendance||{},bs=att.by_status||{},present=(bs['Present']||0)+(bs['Work From Home']||0)+(bs['Half Day']||0);var attAny=Object.keys(bs).length>0;
var trn=D.training||[],done=trn.filter(function(t){return t.status=='Completed'}).length;
var openT=(D.tasks||[]).length,pendReq=(D.pending_leave||[]).length+(D.it_requests||[]).length;
function K(icn,c1,c2,l,v,s){return '<div class="card kpi"><div class="ki" style="background:'+c1+';color:'+c2+'">'+ic(icn,c2)+'</div><div class="l">'+l+'</div>'+(v=='NOALLOC'?'<div class="v na">No active leave allocation</div>':v==null?'<div class="v na">Not available</div>':'<div class="v">'+esc(v)+'</div>')+'<div class="s">'+(s||'&nbsp;')+'</div></div>'}
var kpis='<div class="kpis">'+K('cal','var(--tes)','var(--te)',(iq&&iq.doc==='National ID'?'Days to National ID Expiry':'Days to Iqama Expiry'),iq&&iq.days!=null?iq.days+' days':null,iq&&iq.expiry?'Expires '+d(iq.expiry):'')+
K('plane','var(--bls)','var(--bl)','Annual Leave Balance',annual?annual.balance+' days':'NOALLOC',annual?annual.allocated+' allocated':'')+
K('list','var(--pus)','var(--pu)','Open Tasks',openT,'<span data-obk>'+od+'</span> overdue')+
K('cap','var(--tes)','var(--te)','Training Progress',trn.length?Math.round(done*100/trn.length)+'%':null,trn.length?done+' of '+trn.length+' completed':'No training assigned')+
K('clock','var(--ors)','var(--or)','My Requests Pending',pendReq,'Leave & IT requests')+'</div>';
function Q(icn,c1,c2,l,href){return href?'<a class="q" style="background:'+c1+'" href="'+href+'" '+(href[0]=='#'?'data-anchor="1"':'')+'>'+ic(icn,c2)+l+'</a>':'<div class="q off" style="background:'+c1+'" title="Not yet enabled">'+ic(icn,c2)+l+'<br><small>Not yet enabled</small></div>'}
var qs='<div class="card" id="req"><h3>'+ic('inbox')+'Quick Employee Services</h3><div class="qs">'+Q('cal','var(--gs)','var(--g)','Request Leave','/app/leave-application/new')+Q('finger','var(--bls)','var(--bl)','Attendance','#lv')+Q('cap','var(--pus)','var(--pu)','My Training','#trn')+(D.variant==='standard'?'':Q('form','var(--ors)','var(--or)','HR Request',null))+Q('head','var(--tes)','var(--te)','IT Support','/app/it-help-desk-request/new')+Q('folder','var(--pus)','var(--pu)','My Documents','#docs')+'</div></div>';
var vnote=D.variant=='sales'?'<div class="vn"><b>Salesperson dashboard:</b> connected to Sales Staff Daily Task Management and Sales Person KPI. Leads, quotations and sales orders are not yet shown here.</div>':D.variant=='standard'?'':'<div class="vn"><b>'+(D.variant=='driver'?'Driver':'Salesperson')+' dashboard:</b> specialized '+(D.variant=='driver'?'vehicle, trip and safety':'sales, leads and targets')+' modules are not yet enabled. Your common employee services are shown below.</div>';
var dt='<div class="tw"><table><thead><tr><th>Document</th><th>Reference</th><th>Expiry Date</th><th>Status</th></tr></thead><tbody>'+docs.map(function(x){return '<tr><td>'+esc(x.doc)+'</td><td>'+(x.ref?esc(x.ref):'—')+'</td><td>'+(x.expiry?esc(d(x.expiry)):'—')+'</td><td>'+(x.note?'<span class="pill n">'+esc(x.note)+'</span>':st(x.days))+'</td></tr>'}).join('')+
['Work Permit (Qiwa)','Exit / Re-entry Visa','GOSI Registration','Professional License'].map(function(n){return '<tr><td>'+n+'</td><td>—</td><td>—</td><td><span class="pill n">Not in ERP</span></td></tr>'}).join('')+'</tbody></table></div>';
var comp=card('docs','doc','Residency & Legal Compliance','',dt);
var lvs=(D.leaves||[]).map(function(l){var pc=l.allocated?Math.max(0,Math.min(100,l.balance*100/l.allocated)):0;return '<div class="lv"><span>'+esc(l.type)+'</span><b>'+l.balance+' of '+l.allocated+' days</b><div class="bar"><i style="width:'+pc+'%"></i></div></div>'}).join('')||'<div class="empty">No active leave allocation</div>';
var pl=(D.pending_leave||[])[0];if(pl)lvs+='<a class="pend" href="/app/leave-application/'+encodeURIComponent(pl.name)+'">'+ic('clock','var(--a)')+'<div><b>Pending Leave Request</b>'+d(pl.from_date)+' – '+d(pl.to_date)+' ('+pl.total_leave_days+' days)</div><span class="pill a" style="margin-left:auto">Awaiting approval</span></a>';
var leave=card('lv','plane','Leave Balances','<a href="/app/leave-application">My leave applications</a>',lvs);
function A(icn,c,l,v){return '<div class="ar">'+ic(icn,c)+'<span>'+l+'</span><b>'+(v==null?NA:esc(v))+'</b></div>'}
var M=att.mtd||null;function AC(icn,c,l,v,sub){return '<div class="ac">'+ic(icn,c)+'<small>'+l+'</small><b>'+v+'</b>'+(sub?'<span class="mut">'+sub+'</span>':'')+'</div>'}
var UN='<span class="mut" style="font-size:13px;font-weight:600">Not available</span>';
var perf=card('att','people','Attendance & Performance','<span class="mut">'+d(att.from)+' – '+d(att.to)+'</span>',(M?'<div class="att3">'+AC('cal','var(--g)','Present Days',M.processed?esc(M.present_days):UN,M.processed?'':'Attendance not yet processed by HR')+AC('plane','var(--bl)','On Leave Days',esc(M.leave_days))+AC('clock','var(--a)','Late Marks',M.processed?esc(M.late_days):UN,M.processed?'':'Attendance not yet processed by HR')+'</div>':'<div class="empty">Attendance information is not available.</div>'));
var TP=D.task_period||{items:[]};var pc=perfClass(TP.rate);
var fb='<div class="tf">'+[['today','Today'],['week','This Week'],['month','This Month'],['custom','Custom']].map(function(x){return '<button data-per="'+x[0]+'" class="'+(PER.k==x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'<span class="cr" style="display:'+(PER.k=='custom'?'inline-flex':'none')+'"><small>Start Date</small><input type="date" data-f="from" aria-label="Start Date" value="'+(PER.from||'')+'"><small>End Date</small><input type="date" data-f="to" aria-label="End Date" value="'+(PER.to||'')+'"><button data-apply="1">Apply</button></span></div>';
var perf2='<div class="pf pf-'+pc.c+'"><div class="pfh"><span>Task Completion Rate</span><b style="color:'+pc.col+'">'+(TP.rate==null?'No tasks due':TP.rate+'%')+'</b></div><div class="pbar"><i style="width:'+(TP.rate==null?0:Math.min(100,TP.rate))+'%;background:'+pc.col+'"></i></div><div class="pfl"><span class="pill" style="background:'+pc.col+'1f;color:'+pc.col+'">'+pc.l+'</span><small>'+d(TP.from)+' – '+d(TP.to)+'</small></div><div class="pfs"><div><b>'+(TP.completed||0)+'</b><small>Completed</small></div><div><b>'+(TP.open||0)+'</b><small>Open</small></div><div><b style="color:var(--r)">'+(TP.overdue||0)+'</b><small>Overdue (this period)</small></div><div><b data-obl style="color:var(--r)">…</b><small>Overdue ToDos (all dates)</small></div></div><small class="mut">Completed ÷ eligible tasks due in this period (due today or earlier, or already completed). '+(TP.eligible?TP.eligible_completed+' of '+TP.eligible+' eligible.':'')+' No formal target is set, so the rate cannot exceed 100%.</small></div>';
var href=function(t){return t.doctype?'/app/'+frappe.router.slug(t.doctype)+'/'+encodeURIComponent(t.name):null};
var rows=(TP.items||[]).map(function(t){var cls=t.done?'g':t.overdue?'r':'a';var h=href(t);return '<div class="tk"><div class="c'+(t.done?' done':'')+'"></div><span>'+(h?'<a href="'+h+'">'+esc(t.title)+'</a>':esc(t.title))+'<small class="mut" style="display:block">'+esc(t.source)+(t.priority?' • '+esc(t.priority):'')+''+'</small></span><small>'+(t.due?'Due '+d(t.due):'No due date')+'</small><span class="pill '+cls+'" style="flex:none">'+(t.done?'Completed':t.overdue?'Overdue':esc(t.status||'Open'))+'</span></div>'}).join('')||'<div class="empty">No tasks in this period.</div>';
var taskC='<div class="card" id="tasks"><h3>'+ic('list')+'My Tasks & Daily Activity<span class="x"><a href="/app/todo?allocated_to='+encodeURIComponent(frappe.session.user)+'">My ToDos</a></span></h3>'+fb+'<div class="cpend">Select a Start Date and End Date, then press Apply.</div>'+perf2+'<div class="tl">'+rows+'</div></div>';
var tr=trn.slice(0,5).map(function(t){var c=t.status=='Completed'?'g':t.status=='In Progress'?'b':'n';return '<div class="li"><div>'+esc(t.training_title||'Training')+(t.mandatory?' <span class="pill r" style="padding:1px 6px">Mandatory</span>':'')+'<small>'+(t.completed_on?'Completed '+d(t.completed_on):t.due_date?'Due '+d(t.due_date):'')+'</small></div><span class="pill '+c+'">'+esc(t.status)+'</span></div>'}).join('')||'<div class="empty">No training assigned.</div>';
var as='<div class="empty">See <b>Company Assets & Vehicles</b> under your profile.</div>';
if(D.variant=='sales'){var S=D.sales||{};if(S.error){taskC='<div class="card" id="tasks"><h3>'+ic('list')+'Sales Daily Activity & Performance</h3>'+fb+'<div class="empty">Sales activity could not be loaded. Please contact IT Support.</div><div class="tl">'+rows+'</div></div>'}else{
var R=S.reports||[],tdy=S.today,K=S.kpi,H=K&&K.headline,hp=H?H.pct:null,kc=perfClass(hp);
var SL={Submit:'Submitted',Approved:'Approved',Rejected:'Rejected',Extended:'Extended',Cancelled:'Cancelled'};var tdyHtml=!tdy?'<span class="pill r">Not submitted</span>':tdy.docstatus==0?'<a class="pill a" href="/app/sales-staff-daily-task-management/'+encodeURIComponent(tdy.name)+'">Draft – not submitted</a>':'<a class="pill g" href="/app/sales-staff-daily-task-management/'+encodeURIComponent(tdy.name)+'">'+esc(SL[tdy.visit_status]||tdy.visit_status||'Submitted')+'</a>';
var vis=0,nc=0;R.forEach(function(r){vis+=r.visits||0;nc+=r.new_customers||0});
var L=S.last_kpi,LH=L&&L.headline,lc=perfClass(LH?LH.pct:null);
var kHead='<div class="pfh"><span>Current Performance <small class="mut" style="font-weight:400">· Sales vs Monthly Target</small></span>'+(H?'<b style="color:'+kc.col+'">'+hp+'%</b>':'<b style="color:var(--m);font-size:18px">Target not configured</b>')+'</div>'+(H?'<div class="pbar"><i style="width:'+Math.min(100,hp)+'%;background:'+kc.col+'"></i></div><div class="pfl"><span class="pill" style="background:'+kc.col+'1f;color:'+kc.col+'">'+kc.l+'</span><small><a href="/app/sales-person-kpi/'+encodeURIComponent(K.name)+'">KPI '+d(K.from)+' – '+d(K.to)+'</a></small></div>':'<small class="mut">No approved Sales Person KPI covers the selected period.</small>')+
'<div class="lk"><span>Last Approved Performance</span>'+(L?'<a href="/app/sales-person-kpi/'+encodeURIComponent(L.name)+'">'+d(L.from)+' – '+d(L.to)+'</a> '+(LH?'<span class="pill" style="background:'+lc.col+'1f;color:'+lc.col+'">'+LH.pct+'% · '+lc.l+'</span>':'<span class="pill n">No sales target line</span>'):'<span class="pill n">None</span>')+'</div>';
var _i=kHead.indexOf('<div class="lk">');var kLast=_i>0?kHead.slice(_i):'';if(_i>0)kHead=kHead.slice(0,_i);var C=S.compliance||{},cc=perfClass(C.status=='ok'?C.pct:null);
var compCard='<div class="pf"><div class="pfh"><span>Daily Reporting Compliance</span>'+(C.status=='ok'?'<b style="color:'+cc.col+'">'+C.pct+'%</b>':'<b style="color:var(--m);font-size:18px">'+(C.status=='no_working_days'?'No working days yet':'Not configured')+'</b>')+'</div>'+(C.status=='ok'?'<div class="pbar"><i style="width:'+Math.min(100,C.pct)+'%;background:'+cc.col+'"></i></div><small class="mut">'+C.submitted+' of '+C.expected+' expected working days have a submitted report ('+d(C.from)+' – '+d(C.to)+'). Excludes holidays and weekly offs in your holiday list'+(C.leave_days?' and '+C.leave_days+' approved leave day(s)':'')+'. Separate from sales KPI.</small>':'<small class="mut">'+esc(C.reason||'Requires a holiday list covering this period on your Employee record.')+' HR must configure this before compliance can be calculated.</small>')+'</div>';
var kRows=K?(K.rows||[]).map(function(r){var x=perfClass(r.pct);return '<div class="li"><span>'+esc(r.kpi)+'</span>'+(r.pct==null?'<span class="pill n">'+(r.lower_is_better?'Lower is better – not scored':'No numeric target')+'</span>':'<span class="pill" style="background:'+x.col+'1f;color:'+x.col+'">'+r.pct+'%</span>')+'</div>'}).join(''):'';
var kpiCard='<div class="pf">'+kHead+(kRows?'<details style="margin-top:8px"><summary class="mut" style="cursor:pointer;font-size:12px">All KPI lines</summary>'+kRows+'</details>':'')+'</div>';kpiCard+='<div class="pf pfl2">'+kLast.replace('class="lk"','class="lk" style="margin:0;padding:0;border:0"')+'</div>';
var stats='<div class="sst"><div><small>Today\'s report</small><div>'+tdyHtml+'</div></div><div><small>Reports in period</small><b>'+R.length+'</b></div><div><small>Pending drafts (period)</small><b style="color:'+(S.pending_drafts?'var(--a)':'inherit')+'">'+(S.pending_drafts||0)+'</b></div><div><small>Customer visits</small><b>'+vis+'</b></div><div><small>New customers</small><b>'+nc+'</b></div><div><small>Overdue tasks</small><b style="color:var(--r)">'+(TP.overdue||0)+'</b></div></div>';
var hist=R.slice(0,5).map(function(r){return '<div class="tk"><div class="c'+(r.docstatus==1?' done':'')+'"></div><span><a href="/app/sales-staff-daily-task-management/'+encodeURIComponent(r.name)+'">Daily report – '+d(r.date)+'</a><small class="mut" style="display:block">'+(r.visits||0)+' visits • '+(r.new_customers||0)+' new customers • '+(r.order_received||0)+' orders received • '+(r.delivery_pending||0)+' deliveries pending</small></span><span class="pill '+(r.docstatus==1?(r.visit_status=='Rejected'||r.visit_status=='Cancelled'?'r':'g'):'a')+'" style="flex:none">'+(r.docstatus==1?esc(SL[r.visit_status]||r.visit_status||'Submitted'):'Draft')+'</span></div>'}).join('')||'<div class="empty">No daily reports in this period.</div>';if(R.length>5)hist+='<div class="li"><span class="mut">Showing 5 of '+R.length+'</span><a href="/app/sales-staff-daily-task-management?employee_name='+encodeURIComponent(p.employee)+'">View all</a></div>';
taskC='<div class="card" id="tasks"><h3>'+ic('list')+'Sales Daily Activity & Performance<span class="x"><a href="/app/sales-staff-daily-task-management/new">New daily report</a> · <a href="/app/todo?allocated_to='+encodeURIComponent(frappe.session.user)+'">My ToDos</a></span></h3>'+fb+stats+'<div class="sgrid"><div>'+kpiCard+compCard+'<h4 class="sh">My Tasks & ToDos</h4><div class="tl">'+rows+'</div></div><div><h4 class="sh">Reporting History</h4><div class="tl">'+hist+'</div></div></div></div>'}}
if(D.variant=='sales'&&D.sales&&!D.sales.error){var S2=D.sales,R2=S2.reports||[],K2=S2.kpi,L2=S2.last_kpi,C2=S2.compliance||{};
var SL2={Submit:'Submitted',Approved:'Approved',Rejected:'Rejected',Extended:'Extended',Cancelled:'Cancelled'};var t2=S2.today;
var t2h=!t2?'<span class="pill r">Not submitted</span>':t2.docstatus==0?'<span class="pill a">Draft</span>':'<span class="pill g">'+esc(SL2[t2.visit_status]||t2.visit_status)+'</span>';
var v2=0,n2=0;R2.forEach(function(r){v2+=r.visits||0;n2+=r.new_customers||0});
function chip(head,p,desc,na){var x=perfClass(p);return '<div class="chipc"><div class="ch-h">'+head+'</div>'+(p==null?'<div class="ch-v ch-na">'+esc(na)+'</div>':'<div class="ch-v" style="color:'+x.col+'">'+p+'%</div><div class="ch-p"><span class="pill" style="background:'+x.col+'1f;color:'+x.col+'">'+x.l+'</span></div>')+(desc?'<div class="ch-d">'+desc+'</div>':'')+'</div>'}
function perLabel(){var f=frappe.datetime.str_to_obj(TP.from),t=frappe.datetime.str_to_obj(TP.to);var m=function(x){return x.toLocaleDateString('en-GB',{month:'long',year:'numeric'})};return (f.getMonth()==t.getMonth()&&f.getFullYear()==t.getFullYear())?m(f):d(TP.from)+' – '+d(TP.to)}
var KH=K2&&K2.headline,LH2=L2&&L2.headline;
taskC='<div class="card" id="tasks"><h3>'+ic('star')+'Sales Activity Summary<span class="x"><a href="#" data-goperf="1">Open Performance →</a></span></h3>'+fb+
'<div class="sst"><div><small>Today\'s report</small><div>'+t2h+'</div></div><div><small>Reports in period</small><b>'+R2.length+'</b></div><div><small>Pending drafts</small><b style="color:'+(S2.pending_drafts?'var(--a)':'inherit')+'">'+(S2.pending_drafts||0)+'</b></div><div><small>Customer visits</small><b>'+v2+'</b></div><div><small>New customers</small><b>'+n2+'</b></div><div><small>Overdue tasks</small><b style="color:var(--r)">'+(TP.overdue||0)+'</b></div></div>'+
'<div class="chips">'+chip('Current Month — Sales vs Target',KH?KH.pct:null,K2?(KH?'Approved KPI · '+d(K2.from)+' – '+d(K2.to):'Approved KPI '+d(K2.from)+' – '+d(K2.to)+' has no Sales vs Monthly Target line.'):'No approved Sales Person KPI exists for '+perLabel()+'.',K2?'No sales target line':'Target not configured')+chip('Last Approved KPI',LH2?LH2.pct:null,L2?'Previous period · '+d(L2.from)+' – '+d(L2.to):'No earlier approved KPI.',L2?'No sales target line':'None')+chip('Daily Reporting Compliance',C2.status=='ok'?C2.pct:null,C2.status=='ok'?C2.submitted+' of '+C2.expected+' expected working days reported.':esc(C2.reason||'Holiday list not configured for this period.'),C2.status=='no_working_days'?'No working days yet':'Not configured')+'</div>'+
'<h4 class="sh">Latest reports</h4>'+(R2.slice(0,3).map(function(r){return '<div class="tk"><div class="c'+(r.docstatus==1?' done':'')+'"></div><span><a href="/app/sales-staff-daily-task-management/'+encodeURIComponent(r.name)+'">'+d(r.date)+'</a><small class="mut" style="display:block">'+(r.visits||0)+' visits · '+(r.new_customers||0)+' new customers</small></span><span class="pill '+(r.docstatus==1?(/Rejected|Cancelled/.test(r.visit_status)?'r':'g'):'a')+'" style="flex:none">'+(r.docstatus==1?esc(SL2[r.visit_status]||r.visit_status):'Draft')+'</span></div>'}).join('')||'<div class="empty">No reports in this period.</div>')+'</div>'}
var trnC='<div class="card" id="trn"><h3>'+ic('cap')+'Training & Company Assets</h3><div class="sub2"><div><h4>Recent Training</h4>'+tr+'</div><div><h4>Company Assets</h4>'+as+'</div></div></div>';
var dp=(D.dependents||[]).map(function(x){return '<div class="li"><div>'+esc(x.dependent_name)+'<small>'+esc(x.relation||'')+'</small></div></div>'}).join('')||'<div class="empty">No dependents recorded.</div>';
var em=p.emergency;dp+='<h4 style="margin:12px 0 4px;font-size:12px">Emergency Contact</h4>'+(em?'<div class="li"><div>'+esc(em.name||'Not available')+'<small>'+esc(em.relation||'')+'</small></div><span>'+esc(em.phone||'')+'</span></div>':'<div class="empty">Not available</div>');var depC=card('dep','people','Dependents & Emergency Contact',' ',dp);
var mm=(D.memos?D.memos:[]).map(function(m){return '<div class="li"><div><b style="font-weight:600">'+esc(m.memo_subject||'Memo')+'</b><small>'+esc(m.memo_type||'')+'</small></div><small>'+dv(m.memo_date)+'</small></div>'}).join('')||'<div class="empty">Company announcements are not available.</div>';
var memoC=card('help','mega','Company Announcements','',mm+'<div class="li"><span class="mut">Need help? Raise an <a href="/app/it-help-desk-request/new">IT Support request</a> or manage your account in <a href="/app/user-profile">Profile Settings</a>.</span></div>');
shell((D.variant==='standard'?prof+kpis+need+qs+assetsCard(D)+vnote:prof+assetsCard(D)+vnote+'<div class="row2">'+need+'<div style="display:grid;gap:16px">'+kpis+qs+'</div></div>')+'<div class="row3">'+comp+leave+perf+'</div>'+taskC+'<div class="row4" style="grid-template-columns:1.3fr 1fr">'+trnC+'<div style="display:grid;gap:16px;align-content:start">'+depC+memoC+'</div></div>'+perfView(D));
(function(){var ob=host.querySelector('[data-obl]'),ok=host.querySelector('[data-obk]');if(!ob&&!ok)return;frappe.call({method:'emp_todo_dashboard',args:{},callback:function(r){var k=r&&r.message&&r.message.kpi;var n=(k&&k.overdue_backlog!=null)?k.overdue_backlog:null;if(ob)ob.textContent=n==null?'—':String(n);if(ok&&n!=null)ok.textContent=String(n);var tl=host.querySelector('#tasks .tl');if(tl&&n&&PER.k!=='month'){var dv=document.createElement('div');dv.className='tk obn';dv.innerHTML='<div class="c" style="background:var(--r)"></div><span><a href="/app/todo?status=Open&allocated_to='+encodeURIComponent(frappe.session.user)+'">Outstanding overdue ToDos from earlier dates</a><small class="mut" style="display:block">Counted separately from this period</small></span><small><b style="color:var(--r)">'+n+'</b></small>';tl.insertBefore(dv,tl.firstChild);}},error:function(){if(ob)ob.textContent='—';}});})();
host.querySelectorAll('[data-per]').forEach(function(bt){bt.addEventListener('click',function(){PER.touched=1;PER.k=bt.dataset.per;if(PER.k=='custom'){host.querySelectorAll('[data-per]').forEach(function(x){x.classList.toggle('on',x===bt)});host.querySelectorAll('.cr').forEach(function(x){x.style.display='inline-flex'});host.setAttribute('data-custom','pending');return}host.removeAttribute('data-custom');load()})});
host.querySelectorAll('[data-apply]').forEach(function(ap){ap.addEventListener('click',function(){var cr=ap.parentNode;var f=cr.querySelector('[data-f=from]').value,t=cr.querySelector('[data-f=to]').value;if(!f||!t||t<f){frappe.msgprint(__('Select a valid date range.'));return}if(ap.disabled)return;ap.disabled=true;host.removeAttribute('data-custom');PER.from=f;PER.to=t;PER.k='custom';PER.touched=1;load()})});
host.querySelectorAll('[data-hmore]').forEach(function(bt){bt.addEventListener('click',function(){var c=bt.closest('.card');var on=c.classList.toggle('hshow');bt.textContent=on?'Show less':'Show more';var t=c.querySelectorAll('tbody tr').length;c.querySelector('.hcnt').textContent=on?Math.min(30,t):Math.min(5,t)})});
host.querySelectorAll('[data-goperf]').forEach(function(a){a.addEventListener('click',function(ev){ev.preventDefault();var t=host.querySelector('[data-go=perf]');if(t)t.click()})});
host.querySelectorAll('[data-anchor]').forEach(function(a){a.addEventListener('click',function(ev){ev.preventDefault();var t=host.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'})})});
}})();

/* ==== DM My ToDo Tasks tab (Phase 8, Stages 8.2-8.4) ====
   Data: API "emp_todo_dashboard" only (single source of KPI/filter logic; always the logged-in user).
   Writes: frappe.client.set_value on ToDo -> validated by "DM ToDo Progress Guard". No drag-and-drop. */
(function () {
	var host = root_element.querySelector("#ess");
	if (!host || host.__todoInit) return;
	host.__todoInit = true;
	var S = { period: "month", basis: "due", from_date: "", to_date: "", sub: "ov", qf: "all", use_period: 0, search: "",
		priority: "", category: "", progress: "", page: 1, calView: "month", calAnchor: frappe.datetime.get_today() };
	var CACHE = {};
	function esc(v) { return frappe.utils.escape_html(v == null ? "" : String(v)); }
	function dec(v) { var t = document.createElement("textarea"); t.innerHTML = v == null ? "" : String(v); return t.value; }
	function fd(d) { if (!d) return "—"; var x = frappe.datetime.str_to_obj(d); return (x && !isNaN(x)) ? x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : String(d); }
	function box() { return host.querySelector("#todov"); }
	function q(s) { var b = box(); return b ? b.querySelector(s) : null; }
	var SUBS = [["ov", "Overview"], ["tasks", "My Tasks"], ["board", "Task Board"], ["cal", "Calendar"], ["perf", "My Performance"], ["act", "Activity History"]];
	var QFL = [["all", "All My Tasks"], ["pending", "Pending"], ["in_progress", "In Progress"], ["blocked", "Blocked"], ["completed", "Completed"],
		["overdue", "Overdue"], ["due_today", "Due Today"], ["auto", "Automatic / Quotation"]];
	var BADGE = { High: "red", Medium: "orange", Low: "green", "Not Started": "gray", "In Progress": "blue", Blocked: "orange", Completed: "green",
		Open: "gray", Closed: "green", Cancelled: "gray", "Pending Review": "orange", Approved: "green" };
	function pill(t) { return '<span class="tdx-pill ' + (BADGE[t] || "gray") + '">' + esc(t) + "</span>"; }

	function ensure() {
		var ov = host.querySelector("#ov");
		if (!ov) return null;
		var b = box();
		if (!b) {
			b = document.createElement("div");
			b.id = "todov";
			b.innerHTML =
				'<div class="tdx-sub" role="tablist">' + SUBS.map(function (x) { return '<button role="tab" data-sub="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" +
				'<div class="tdx-bar tdx-per"><label>Period <select data-k="period" aria-label="Reporting period"><option value="today">Today</option><option value="week">This Week</option>' +
				'<option value="month">This Month</option><option value="year">This Year</option><option value="custom">Custom Range</option></select></label>' +
				'<span class="tdx-cust" hidden><input type="date" data-k="from" aria-label="From date"> – <input type="date" data-k="to" aria-label="To date"> <button class="tdx-btn" data-act="apply">Apply</button></span>' +
				'<label>Date basis <select data-k="basis" aria-label="Date basis"><option value="due">Due Date</option><option value="assigned">Assigned Date</option></select></label>' +
				'<label class="tdx-lim"><input type="checkbox" data-k="use_period"> Limit list to period</label>' +
				'<button class="tdx-btn ghost" data-act="refresh" title="Refresh" aria-label="Refresh">&#8635;</button></div>' +
				'<div class="tdx-bar tdx-flt"><select data-k="priority" aria-label="Priority"><option value="">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>' +
				'<select data-k="category" aria-label="Task category"><option value="">All categories</option><option value="manual">Manual Tasks</option><option value="other">Other Linked Tasks</option><option value="auto">Automatic / Quotation</option></select>' +
				'<select data-k="progress" aria-label="Progress status"><option value="">All progress</option><option>Not Started</option><option>In Progress</option><option>Blocked</option><option>Completed</option></select>' +
				'<input type="search" class="tdx-search" data-k="search" placeholder="Search title, description, ID or linked document" aria-label="Search tasks"></div>' +
				'<div class="tdx-scope"></div><div class="tdx-body"></div>';
			ov.appendChild(b);
			wire(b);
			b.__loaded = false;
		}
		syncControls();
		return b;
	}
	function syncControls() {
		var b = box(); if (!b) return;
		b.querySelectorAll("[data-sub]").forEach(function (x) { x.classList.toggle("on", x.dataset.sub === S.sub); x.setAttribute("aria-selected", x.dataset.sub === S.sub); });
		["period", "basis", "priority", "category", "progress", "search"].forEach(function (k) { var e = b.querySelector('[data-k="' + k + '"]'); if (e && e.value !== S[k]) e.value = S[k]; });
		b.querySelector('[data-k="use_period"]').checked = !!S.use_period;
		b.querySelector(".tdx-cust").hidden = S.period !== "custom";
		b.querySelector(".tdx-per").hidden = S.sub === "cal" || S.sub === "act";
		b.querySelector(".tdx-lim").hidden = S.sub === "ov" || S.sub === "perf";
		b.querySelector(".tdx-flt").hidden = S.sub === "ov";
		b.querySelector('[data-k="progress"]').hidden = S.sub === "perf" || S.sub === "act";
	}
	new MutationObserver(function () { if (host.dataset.view === "todo" && !box()) show(); }).observe(host, { childList: true });
	host.__todoShow = show;
	function show() { var b = ensure(); if (b && !b.__loaded) { b.__loaded = true; load(); } }

	function call(args) {
		return frappe.call({ method: "emp_todo_dashboard", type: "GET", args: Object.assign({ period: S.period, basis: S.basis, from_date: S.from_date, to_date: S.to_date,
			priority: S.priority, category: S.category, progress: S.progress, search: S.search, use_period: S.use_period }, args) })
			.then(function (r) { return r.message; });
	}
	function load() { syncControls(); return { ov: loadOv, tasks: loadTasks, board: loadBoard, cal: loadCal, perf: loadPerf, act: function () { return loadAct(1); } }[S.sub](); }
	function spin() { q(".tdx-body").innerHTML = '<div class="tdx-grid">' + new Array(7).join('<div class="tdx-card tdx-sk"></div>') + "</div>"; }
	function fail(where) { var t = where || q(".tdx-body"); if (t) t.innerHTML = '<div class="tdx-err">Could not load your tasks. <button class="tdx-btn" data-act="refresh">Try again</button></div>'; }
	function scopeLine(m, extra) {
		q(".tdx-scope").innerHTML = "<b>" + esc(fd(m.from)) + (m.from !== m.to ? " – " + esc(fd(m.to)) : "") + "</b> by <b>" + (m.basis === "due" ? "Due Date" : "Assigned Date") + "</b>" +
			(m.basis === "due" ? " · tasks without a due date use their assigned date" : "") + (extra || "");
	}
	function listScope(m) {
		if (S.use_period) scopeLine(m, " · <b>list limited to this period</b>");
		else q(".tdx-scope").innerHTML = "<b>All dates</b> (backlog view) · tick “Limit list to period” to restrict";
	}

	/* ---------- Overview ---------- */
	function card(cls, title, val, sub, go) {
		return '<div class="tdx-card ' + cls + (go ? ' tdx-go" data-go="' + esc(JSON.stringify(go)) + '" role="button" tabindex="0"' : '"') + '><div class="tdx-ct">' + title + '</div><div class="tdx-cv">' + val + '</div>' + (sub ? '<div class="tdx-cs">' + sub + "</div>" : "") + "</div>";
	}
	function loadOv() {
		spin();
		call({}).then(function (m) {
			scopeLine(m);
			var k = m.kpi, a = m.auto;
			q(".tdx-body").innerHTML = '<div class="tdx-note">Manual &amp; other linked tasks · cancelled excluded · automatic/Quotation assignments shown separately</div><div class="tdx-grid">' +
				card("c1", "Total Assigned", k.total, "Pending " + k.pending + " · Active " + (k.in_progress + k.blocked) + " · Completed " + k.completed, { qf: "scope", p: 1 }) +
				card("c2", "Pending", k.pending, "Not started", { qf: "pending", p: 1 }) +
				card("c3", "In Progress", k.in_progress, k.blocked + " blocked", { qf: "in_progress", p: 1 }) +
				card("c4", "Completed", k.completed, "Submitted " + k.submitted_open + " · Approved " + k.approved_open + " · Closed " + k.closed +
					(k.closed_legacy ? " (" + k.closed_legacy + " legacy, no timestamp)" : "") + "<br><i>Stages of one total</i>", { qf: "completed", p: 1 }) +
				card("c5", "Overdue Backlog", k.overdue_backlog, "All outstanding dates · in selected period: " + k.overdue_period, { qf: "overdue", p: 0 }) +
				card("c6", "Due Today — Current", k.due_today, "Unfinished, due " + esc(fd(m.today)), { qf: "due_today", p: 0 }) +
				card("c7", "Automatic / Quotation", a.open, a.open ? "Open · avg age " + a.avg_age + "d · oldest " + a.oldest_age + "d" : "No open assignments", a.open ? { qf: "auto", p: 0 } : null) +
				"</div>";
		}).catch(function () { fail(); });
	}

	/* ---------- shared task helpers ---------- */
	function remember(rows) { rows.forEach(function (r) { CACHE[r.name] = r; }); }
	function stage(r) {
		if (r.status === "Closed") return "Closed";
		if (r.review === "Approved") return "Approved";
		if (r.progress === "Completed") return r.review === "Pending Review" ? "Pending Review" : "Completed";
		return null;
	}
	function actButtons(r) {
		var a = '<button data-v="' + esc(r.name) + '" aria-label="View task">View</button>';
		if (r.can_act) {
			if (r.progress !== "In Progress") a += '<button data-a="start" data-n="' + esc(r.name) + '">' + (r.progress === "Blocked" ? "Resume" : "Start") + "</button>";
			a += '<button data-a="update" data-n="' + esc(r.name) + '">Update</button>';
			if (r.progress !== "Blocked") a += '<button data-a="block" data-n="' + esc(r.name) + '">Blocker</button>';
			a += '<button data-a="done" data-n="' + esc(r.name) + '">Complete</button>';
		} else if (r.auto) a += '<span class="tdx-mut">Auto</span>';
		else if (r.review === "Pending Review") a += '<span class="tdx-mut">In review</span>';
		return a;
	}

	/* ---------- My Tasks ---------- */
	function loadTasks() {
		var body = q(".tdx-body");
		body.innerHTML = '<div class="tdx-tools"><div class="tdx-qf">' + QFL.map(function (x) { return '<button data-qf="' + x[0] + '" class="' + (S.qf === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") +
			'</div></div>' + (S.comp ? '<div class="tdx-chip">Completed ' + esc(fd(S.comp[0])) + ' – ' + esc(fd(S.comp[1])) + ' <button data-act="nocomp" aria-label="Remove completion week filter">✕</button></div>' : '') + '<div class="tdx-list"><div class="tdx-empty">Loading…</div></div>';
		call(Object.assign({ section: "tasks", qf: S.qf, page: S.page }, S.comp ? { comp_from: S.comp[0], comp_to: S.comp[1] } : {})).then(function (m) {
			listScope(m); remember(m.rows);
			var L = q(".tdx-list");
			if (!m.rows.length) { L.innerHTML = '<div class="tdx-empty">No tasks match these filters.</div>'; return; }
			var pages = Math.max(1, Math.ceil(m.total / m.page_size));
			L.innerHTML = '<table class="tdx-t"><thead><tr><th>Task</th><th>Category</th><th>Priority</th><th>Assigned By</th><th>Assigned</th><th>Due</th><th>Progress</th><th>%</th><th>Status</th><th>Linked Document</th><th>Actions</th></tr></thead><tbody>' +
				m.rows.map(function (r) {
					var due = fd(r.due) + (r.overdue_days ? '<div class="tdx-od">' + r.overdue_days + "d overdue</div>" : "") + (r.auto && r.status === "Open" ? '<div class="tdx-mut">Age ' + r.age + "d</div>" : "");
					return '<tr class="' + (r.overdue_days ? "od" : "") + '" data-row="' + esc(r.name) + '">' +
						'<td data-l="Task"><b>' + esc(dec(r.title)) + '</b><div class="tdx-mut">' + (r.progress === "Blocked" && r.blocked_reason ? "Blocked: " + esc(r.blocked_reason) : "") + "</div></td>" +
						'<td data-l="Category">' + esc(r.category) + '</td><td data-l="Priority">' + pill(r.priority || "Medium") + "</td>" +
						'<td data-l="Assigned By">' + esc(r.assigned_by) + '</td><td data-l="Assigned">' + esc(fd(r.assigned_on)) + "</td>" +
						'<td data-l="Due">' + due + '</td><td data-l="Progress">' + (r.auto ? '<span class="tdx-mut">—</span>' : pill(r.progress) + (r.review ? '<div class="tdx-mut">' + esc(r.review) + "</div>" : "")) + "</td>" +
						'<td data-l="%">' + (r.auto ? "" : '<div class="tdx-bar2"><i style="width:' + Math.min(100, r.pct) + '%"></i></div><span class="tdx-mut">' + Math.round(r.pct) + "%</span>") + "</td>" +
						'<td data-l="Status">' + pill(r.status) + "</td>" +
						'<td data-l="Linked">' + (r.ref_type ? esc(r.ref_type) + (r.ref_name ? '<br><a href="#" data-rt="' + esc(r.ref_type) + '" data-rn="' + esc(r.ref_name) + '">' + esc(r.ref_name) + "</a>" : "") : '<span class="tdx-mut">—</span>') + "</td>" +
						'<td data-l="Actions" class="tdx-acts">' + actButtons(r) + "</td></tr>";
				}).join("") + "</tbody></table>" +
				'<div class="tdx-pg"><span>' + m.total + " task" + (m.total === 1 ? "" : "s") + " · page " + m.page + " of " + pages + '</span><span><button data-pg="' + (m.page - 1) + '"' + (m.page <= 1 ? " disabled" : "") + '>‹ Prev</button><button data-pg="' + (m.page + 1) + '"' + (m.page >= pages ? " disabled" : "") + ">Next ›</button></span></div>";
		}).catch(function () { fail(q(".tdx-list")); });
	}

	/* ---------- Task Board (no drag-and-drop) ---------- */
	var COLS = [["ns", "Not Started"], ["ip", "In Progress"], ["bl", "Blocked"], ["cp", "Completed"]];
	function bcard(r) {
		var st = stage(r);
		return '<div class="tdx-bc' + (r.overdue_days ? " od" : "") + '" data-v="' + esc(r.name) + '" role="button" tabindex="0" aria-label="' + esc(dec(r.title)) + '">' +
			'<div class="tdx-bct">' + esc(dec(r.title)) + "</div>" +
			'<div class="tdx-bcm">' + pill(r.priority || "Medium") + (st ? " " + pill(st) : "") + "</div>" +
			'<div class="tdx-mut">' + esc(r.category) + " · by " + esc(r.assigned_by) + "</div>" +
			'<div class="tdx-mut">Due ' + esc(fd(r.due)) + (r.overdue_days ? ' <span class="tdx-od">' + r.overdue_days + "d overdue</span>" : "") + (r.auto ? " · Age " + r.age + "d" : "") + "</div>" +
			(r.auto ? "" : '<div class="tdx-bar2 w"><i style="width:' + Math.min(100, r.pct) + '%"></i></div>') +
			(r.can_act ? '<div class="tdx-acts"><button data-v="' + esc(r.name) + '">View / Update</button></div>' : "") + "</div>";
	}
	function loadBoard() {
		q(".tdx-body").innerHTML = '<div class="tdx-empty">Loading board…</div>';
		call({ section: "board" }).then(function (m) {
			listScope(m);
			var c = m.counts;
			Object.keys(m.cards).forEach(function (k) { remember(m.cards[k]); });
			var html = '<div class="tdx-note">Manual &amp; other linked tasks. Cards update only through task actions (validated on the server).' + (c.overdue ? ' · <span class="tdx-od">' + c.overdue + " overdue</span>" : "") + '</div><div class="tdx-board">' +
				COLS.map(function (col) {
					var cards = m.cards[col[0]] || [];
					return '<section class="tdx-col c-' + col[0] + '" aria-label="' + col[1] + '"><header><b>' + col[1] + '</b><span class="tdx-cnt">' + c[col[0]] + "</span></header>" +
						(col[0] === "cp" ? '<div class="tdx-mut tdx-stg">Pending Review ' + c.submitted + " · Approved " + c.approved + " · Closed " + c.closed + "</div>" : "") +
						'<div class="tdx-cards" data-col="' + col[0] + '">' + (cards.length ? cards.map(bcard).join("") : '<div class="tdx-empty">No tasks</div>') + "</div>" +
						(c[col[0]] > cards.length ? '<button class="tdx-more" data-more="' + col[0] + '" data-page="2">Load more (' + (c[col[0]] - cards.length) + ")</button>" : "") + "</section>";
				}).join("") + "</div>" +
				'<section class="tdx-auto"><header><b>Automatic / Quotation Assignments</b><span class="tdx-cnt">' + c.auto + "</span>" +
				(c.auto ? '<a href="#" class="tdx-lnk" data-go=\'{"qf":"auto","p":0}\'>Open in My Tasks</a>' : "") + '</header><div class="tdx-mut">Kept separate from the progress columns; no progress actions.</div>' +
				'<div class="tdx-cards h" data-col="auto">' + ((m.cards.auto || []).length ? m.cards.auto.map(bcard).join("") : '<div class="tdx-empty">No open automatic assignments.</div>') + "</div>" +
				(c.auto > (m.cards.auto || []).length ? '<button class="tdx-more" data-more="auto" data-page="2">Load more</button>' : "") + "</section>";
			q(".tdx-body").innerHTML = html;
		}).catch(function () { fail(); });
	}
	function moreBoard(btn) {
		var col = btn.dataset.more, page = cint(btn.dataset.page);
		btn.disabled = true; btn.textContent = "Loading…";
		call({ section: "board", col: col, page: page }).then(function (m) {
			var rows = m.cards[col] || []; remember(rows);
			q('.tdx-cards[data-col="' + col + '"]').insertAdjacentHTML("beforeend", rows.map(bcard).join(""));
			var shown = q('.tdx-cards[data-col="' + col + '"]').querySelectorAll(".tdx-bc").length, total = m.counts[col];
			if (shown >= total || !rows.length) btn.remove();
			else { btn.disabled = false; btn.dataset.page = page + 1; btn.textContent = "Load more (" + (total - shown) + ")"; }
		}).catch(function () { btn.disabled = false; btn.textContent = "Retry"; });
	}

	/* ---------- Calendar (actual due date, visible range only) ---------- */
	function iso(d) { return moment(d).format("YYYY-MM-DD"); }
	function calRange() {
		var a = moment(S.calAnchor);
		if (S.calView === "week") { var s = a.clone().subtract(a.day(), "days"); return [s, s.clone().add(6, "days")]; }
		var f = a.clone().startOf("month"), st = f.clone().subtract(f.day(), "days");
		return [st, st.clone().add(41, "days")];
	}
	function loadCal() {
		var R = calRange(), a = moment(S.calAnchor), today = frappe.datetime.get_today();
		var label = S.calView === "week" ? R[0].format("D MMM") + " – " + R[1].format("D MMM YYYY") : a.format("MMMM YYYY");
		q(".tdx-scope").innerHTML = "<b>Calendar uses the actual due date</b> · tasks without a due date are listed separately · period selector not used here";
		q(".tdx-body").innerHTML = '<div class="tdx-calbar"><button class="tdx-btn ghost" data-cal="prev" aria-label="Previous">‹</button><button class="tdx-btn ghost" data-cal="today">Today</button>' +
			'<button class="tdx-btn ghost" data-cal="next" aria-label="Next">›</button><b class="tdx-calt">' + esc(label) + '</b><span class="tdx-sp"></span>' +
			'<button class="tdx-seg' + (S.calView === "month" ? " on" : "") + '" data-calv="month">Month</button><button class="tdx-seg' + (S.calView === "week" ? " on" : "") + '" data-calv="week">Week</button></div>' +
			'<div class="tdx-cal"><div class="tdx-empty">Loading calendar…</div></div><div class="tdx-nodue"></div>';
		call({ section: "calendar", cal_from: iso(R[0]), cal_to: iso(R[1]) }).then(function (m) {
			remember(m.items); remember(m.no_due);
			var by = {}; m.items.forEach(function (r) { (by[r.due] = by[r.due] || []).push(r); });
			var days = [], d = R[0].clone();
			while (d.isSameOrBefore(R[1], "day")) { days.push(d.clone()); d.add(1, "day"); }
			var cap = S.calView === "week" ? 8 : 3;
			var html = '<div class="tdx-cgrid' + (S.calView === "week" ? " wk" : "") + '">' + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (n) { return '<div class="tdx-cdh">' + n + "</div>"; }).join("") +
				days.map(function (x) {
					var k = iso(x), list = by[k] || [], out = S.calView === "month" && x.month() !== a.month();
					var od = list.some(function (r) { return r.overdue_days; });
					return '<div class="tdx-cday' + (out ? " out" : "") + (k === today ? " today" : "") + (od ? " hasod" : "") + '" aria-label="' + x.format("D MMMM") + ", " + list.length + ' tasks">' +
						'<div class="tdx-cdn"><span>' + x.date() + "</span>" + (list.length ? '<span class="tdx-cnt">' + list.length + "</span>" : "") + "</div>" +
						list.slice(0, cap).map(function (r) {
							return '<button class="tdx-chip2 p-' + esc((r.priority || "Medium").toLowerCase()) + (r.overdue_days ? " od" : "") + (r.status !== "Open" || r.progress === "Completed" ? " done" : "") + '" data-v="' + esc(r.name) + '" title="' + esc(dec(r.title)) + '">' + esc(dec(r.title)) + "</button>";
						}).join("") + (list.length > cap ? '<button class="tdx-moreday" data-day="' + k + '">+' + (list.length - cap) + " more</button>" : "") + "</div>";
				}).join("") + "</div>" +
				(m.truncated ? '<div class="tdx-note">Showing the first ' + m.items.length + " of " + m.total + " tasks in this range — narrow the filters to see all.</div>" : "") +
				(m.auto_in_range ? '<div class="tdx-note">' + m.auto_in_range + " open automatic/Quotation assignment(s) fall in this range and are not shown — choose category “Automatic / Quotation” to view them.</div>" : "") +
				'<div class="tdx-note">● High <span class="tdx-k red"></span> ● Medium <span class="tdx-k orange"></span> ● Low <span class="tdx-k green"></span> · red outline = overdue · faded = completed/closed</div>';
			q(".tdx-cal").innerHTML = html;
			q(".tdx-cal").__byDay = by;
			q(".tdx-nodue").innerHTML = '<h4>No Due Date <span class="tdx-cnt">' + m.no_due_total + "</span></h4>" +
				(m.no_due.length ? '<div class="tdx-cards h">' + m.no_due.map(bcard).join("") + "</div>" + (m.no_due_total > m.no_due.length ? '<div class="tdx-mut">Showing latest ' + m.no_due.length + ' — use My Tasks to see all.</div>' : "")
					: '<div class="tdx-empty">Every unfinished task has a due date.</div>');
		}).catch(function () { fail(q(".tdx-cal")); });
	}
	function dayList(k) {
		var list = (q(".tdx-cal").__byDay || {})[k] || [];
		var d = new frappe.ui.Dialog({ title: __("Tasks due {0}", [fd(k)]), fields: [{ fieldtype: "HTML", fieldname: "h" }] });
		d.fields_dict.h.$wrapper.html(list.map(function (r) {
			return '<div style="padding:6px 0;border-bottom:1px solid var(--border-color)"><a href="#" data-n="' + esc(r.name) + '">' + esc(dec(r.title)) + "</a> " + esc(r.priority || "") + (r.overdue_days ? ' <b style="color:#e24c4c">' + r.overdue_days + "d overdue</b>" : "") + "</div>";
		}).join(""));
		d.fields_dict.h.$wrapper.on("click", "a[data-n]", function (e) { e.preventDefault(); d.hide(); detail(this.dataset.n); });
		d.show();
	}

	/* ---------- My Performance (task performance; separate from the salesperson Performance tab) ---------- */
	function pct(v) { return v == null ? "—" : v + "%"; }
	function hbar(parts) {
		var tot = parts.reduce(function (a, p) { return a + p[1]; }, 0);
		if (!tot) return '<div class="tdx-empty">No data for this selection.</div>';
		return '<div class="tdx-hbar" role="img" aria-label="' + esc(parts.map(function (p) { return p[0] + " " + p[1]; }).join(", ")) + '">' +
			parts.filter(function (p) { return p[1]; }).map(function (p) { return '<i class="' + p[2] + '" style="width:' + (100 * p[1] / tot) + '%" title="' + esc(p[0] + ": " + p[1]) + '"></i>'; }).join("") + "</div>" +
			'<div class="tdx-leg">' + parts.map(function (p) { return '<span><b class="' + p[2] + '"></b>' + esc(p[0]) + " <strong>" + p[1] + "</strong> (" + Math.round(100 * p[1] / tot) + "%)</span>"; }).join("") + "</div>";
	}
	function loadPerf() {
		if (S.category === "auto") { S.category = ""; syncControls(); }
		spin();
		call({ section: "performance", use_period: 1 }).then(function (m) {
			scopeLine(m, " · <b>Task performance</b> (manual &amp; other linked tasks only)");
			var k = m.kpi, max = Math.max.apply(null, m.weeks.map(function (w) { return w.count; }).concat([1]));
			q(".tdx-body").innerHTML =
				'<div class="tdx-perfh">My Task Performance <span class="tdx-mut">— personal ToDo metrics; not the sales Performance tab</span></div>' +
				'<div class="tdx-grid">' +
				card("c1", "Total Assigned", k.total, "In selected period") +
				card("c4", "Completed", k.completed, "Pending Review " + k.submitted + " · Approved " + k.approved + " · Closed " + k.closed_ts + " · Legacy closed " + k.closed_legacy + "<br><i>Stages of one total</i>") +
				card("c3", "Completion Rate", pct(k.completion_rate), k.completed + " of " + k.total + " tasks") +
				card("c6", "On-Time Rate", pct(k.on_time_rate), (k.on_time + k.late) + " task(s) with timestamp &amp; deadline" + (k.due_changed ? " · " + k.due_changed + " used original due date" : "")) +
				card("c2", "Currently Pending", k.pending, "Not started " + k.not_started + " · In progress " + k.in_progress + " · Blocked " + k.blocked) +
				card("c5", "Overdue Backlog", k.overdue_backlog, "All outstanding dates") +
				card("c7", "Avg. Completion Time", k.avg_days == null ? "—" : k.avg_days + " d", k.with_timestamp ? "Creation → first recorded completion · " + k.with_timestamp + " task(s)" : "No tasks with recorded completion yet") +
				"</div>" +
				'<div class="tdx-charts">' +
				'<section class="tdx-chart wide"><h4>Weekly completions <span class="tdx-mut">last 12 weeks · recorded completion date · all dates · click a week</span></h4>' +
				'<div class="tdx-bars">' + m.weeks.map(function (w) {
					return '<button class="tdx-wk" data-week="' + w.from + "|" + w.to + '"' + (w.count ? "" : " disabled") + ' title="' + esc(fd(w.from) + " – " + fd(w.to) + ": " + w.count) + '" aria-label="Week of ' + esc(fd(w.from)) + ", " + w.count + ' completed">' +
						'<span class="v">' + (w.count || "") + '</span><i style="height:' + Math.round(100 * w.count / max) + '%"></i><span class="l">' + moment(w.from).format("D MMM") + "</span></button>";
				}).join("") + "</div>" +
				(m.legacy_all_dates ? '<div class="tdx-mut">' + m.legacy_all_dates + " legacy closed task(s) have no completion timestamp and are not plotted.</div>" : '<div class="tdx-mut">No legacy closed tasks without timestamps.</div>') + "</section>" +
				'<section class="tdx-chart"><h4>Status distribution <span class="tdx-mut">selected period</span></h4>' +
				hbar([["Not Started", k.not_started, "g"], ["In Progress", k.in_progress, "b"], ["Blocked", k.blocked, "o"], ["Completed", k.completed, "gr"]]) + "</section>" +
				'<section class="tdx-chart"><h4>On-time vs late <span class="tdx-mut">completed tasks · selected period</span></h4>' +
				hbar([["Completed On Time", k.on_time, "gr"], ["Completed Late", k.late, "r"], ["Insufficient Historical Data", k.insufficient, "g"]]) +
				'<div class="tdx-mut">Insufficient = legacy closed without timestamp (' + k.closed_legacy + ") or no deadline (" + k.no_deadline + ").</div></section></div>" +
				'<div class="tdx-note">Filters used: period, date basis, priority, category (manual / other linked), search. Progress filter does not apply here.</div>';
		}).catch(function (e) { fail(); });
	}

	/* ---------- Activity History (existing records only) ---------- */
	var EVC = { "Task Assigned": "g", "Started / Resumed": "b", "Progress Updated": "b", "Blocker Reported": "o", "Submitted for Review": "gr", Completed: "gr",
		Approved: "gr", Returned: "o", "Formally Closed": "gr", "Reset to Not Started": "g", Activity: "g" };
	function actRows(rows) {
		return rows.map(function (r) {
			return '<li class="tdx-ev"><b class="dot ' + (EVC[r.event] || "g") + '"></b><div><div><strong>' + esc(r.event) + '</strong> · <a href="#" data-v="' + esc(r.todo) + '">' + esc(dec(r.title)) + "</a></div>" +
				'<div class="tdx-mut">' + esc(moment(r.ts).format("DD-MM-YYYY HH:mm")) + " · by " + esc(r.actor || "—") + (r.is_me ? " (you)" : "") + "</div>" +
				(r.remarks ? '<div class="tdx-rm">' + esc(r.remarks) + "</div>" : "") + "</div></li>";
		}).join("");
	}
	function loadAct(page) {
		page = page || 1;
		if (page === 1) q(".tdx-body").innerHTML = '<div class="tdx-note">Built from task assignments, recorded task actions and closures on your own tasks. Manual &amp; other linked tasks by default (choose category “Automatic / Quotation” to see those).</div><ul class="tdx-tl"><li class="tdx-empty">Loading activity…</li></ul>';
		q(".tdx-scope").innerHTML = "<b>Activity History</b> · newest first · period selector not used here";
		call({ section: "activity", page: page }).then(function (m) {
			var ul = q(".tdx-tl"); if (page === 1) ul.innerHTML = "";
			var mb = q(".tdx-actmore"); if (mb) mb.remove();
			ul.insertAdjacentHTML("beforeend", m.rows.length ? actRows(m.rows) : (page === 1 ? '<li class="tdx-empty">No activity recorded for these filters.</li>' : ""));
			if (m.more) ul.insertAdjacentHTML("afterend", '<button class="tdx-more tdx-actmore" data-actpage="' + (page + 1) + '">Load older activity</button>');
		}).catch(function () { fail(q(".tdx-tl")); });
	}

	/* ---------- task detail + actions ---------- */
	function detail(name) {
		var r = CACHE[name];
		if (!r) return frappe.set_route("Form", "ToDo", name);
		var st = stage(r);
		var d = new frappe.ui.Dialog({ title: dec(r.title).slice(0, 80), fields: [{ fieldtype: "HTML", fieldname: "h" }] });
		var row = function (l, v) { return '<tr><td style="color:var(--text-muted);padding:3px 12px 3px 0;white-space:nowrap">' + l + '</td><td style="padding:3px 0">' + v + "</td></tr>"; };
		d.fields_dict.h.$wrapper.html('<table style="width:100%;font-size:13px">' +
			row("Task", esc(dec(r.title)) + ' <span style="color:var(--text-muted)">(' + esc(r.name) + ")</span>") + row("Category", esc(r.category)) + row("Priority", esc(r.priority)) +
			row("Assigned by", esc(r.assigned_by) + " on " + esc(fd(r.assigned_on))) +
			row("Due", esc(fd(r.due)) + (r.overdue_days ? ' <b style="color:#e24c4c">' + r.overdue_days + "d overdue</b>" : "") + (r.auto ? " · age " + r.age + "d" : "")) +
			(r.auto ? row("Progress", "Automatic assignment — no progress actions") : row("Progress", esc(r.progress) + " · " + Math.round(r.pct) + "%" + (st ? " · " + esc(st) : ""))) +
			(r.blocked_reason ? row("Blocked reason", esc(r.blocked_reason)) : "") + row("ERPNext status", esc(r.status)) +
			(r.ref_type ? row("Linked document", esc(r.ref_type) + (r.ref_name ? ' · <a href="#" data-rt="' + esc(r.ref_type) + '" data-rn="' + esc(r.ref_name) + '">' + esc(r.ref_name) + "</a>" : "")) : "") +
			'</table><div class="tdx-dlgacts" style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px"></div>');
		var A = d.fields_dict.h.$wrapper.find(".tdx-dlgacts");
		function btn(label, fn, primary) { $('<button class="btn btn-sm ' + (primary ? "btn-primary" : "btn-default") + '">').text(label).on("click", function () { d.hide(); fn(); }).appendTo(A); }
		if (r.can_act) {
			if (r.progress !== "In Progress") btn(r.progress === "Blocked" ? "Resume Task" : "Start Task", function () { act("start", name); }, true);
			btn("Update Progress", function () { act("update", name); });
			if (r.progress !== "Blocked") btn("Report Blocker", function () { act("block", name); });
			btn("Mark Completed", function () { act("done", name); });
		}
		btn("Open Task", function () { frappe.set_route("Form", "ToDo", name); });
		d.fields_dict.h.$wrapper.on("click", "a[data-rt]", function (e) { e.preventDefault(); d.hide(); frappe.set_route("Form", this.dataset.rt, this.dataset.rn); });
		d.show();
	}
	function save(name, values) {
		return frappe.call({ method: "frappe.client.set_value", args: { doctype: "ToDo", name: name, fieldname: values }, freeze: true })
			.then(function () { frappe.show_alert({ message: __("Task updated"), indicator: "green" }); load(); });
	}
	function act(a, name) {
		var r = CACHE[name] || {};
		if (a === "start") return save(name, { custom_progress_status: "In Progress" });
		if (a === "update") {
			var d = new frappe.ui.Dialog({ title: __("Update Progress"), fields: [
				{ fieldname: "pct", fieldtype: "Int", label: __("Progress % (0-99)"), reqd: 1, default: cint(r.pct) || 1 },
				{ fieldname: "remarks", fieldtype: "Small Text", label: __("Remarks") }],
				primary_action_label: __("Save"), primary_action: function (v) {
					if (v.pct < 0 || v.pct > 99) return frappe.msgprint(__("Enter 0-99. Use Mark Completed to finish the task."));
					d.hide(); var o = { custom_progress_percent: v.pct, custom_progress_status: "In Progress" };
					if (v.remarks) o.custom_completion_remarks = v.remarks; save(name, o);
				} });
			return d.show();
		}
		if (a === "block") return frappe.prompt({ fieldname: "r", fieldtype: "Small Text", label: __("Blocked Reason"), reqd: 1 },
			function (v) { save(name, { custom_progress_status: "Blocked", custom_blocked_reason: v.r }); }, __("Report Blocker"), __("Submit"));
		if (a === "done") return frappe.prompt({ fieldname: "r", fieldtype: "Small Text", label: __("Completion Remarks") },
			function (v) { var o = { custom_progress_status: "Completed" }; if (v.r) o.custom_completion_remarks = v.r; save(name, o); }, __("Mark Completed"), __("Submit"));
	}

	/* ---------- events ---------- */
	var searchT;
	function wire(b) {
		b.addEventListener("click", function (e) {
			var t = e.target.closest("button,a,[data-go],[data-v]");
			if (!t || !b.contains(t)) return;
			if (t.dataset.week) { S.comp = t.dataset.week.split("|"); S.sub = "tasks"; S.qf = "completed"; S.use_period = 0; S.page = 1; return load(); }
			if (t.dataset.actpage) return loadAct(cint(t.dataset.actpage));
			if (t.dataset.act === "nocomp") { S.comp = null; S.page = 1; return loadTasks(); }
			if (t.dataset.sub) { S.sub = t.dataset.sub; S.comp = null; S.page = 1; return load(); }
			if (t.dataset.go) { e.preventDefault(); var g = JSON.parse(t.dataset.go); S.sub = "tasks"; S.qf = g.qf; S.use_period = g.p; S.page = 1; return load(); }
			if (t.dataset.qf) { S.qf = t.dataset.qf; S.comp = null; S.page = 1; return loadTasks(); }
			if (t.dataset.pg) { S.page = cint(t.dataset.pg); return loadTasks(); }
			if (t.dataset.more) return moreBoard(t);
			if (t.dataset.cal) { var m = moment(S.calAnchor), u = S.calView === "week" ? "weeks" : "months";
				S.calAnchor = t.dataset.cal === "today" ? frappe.datetime.get_today() : iso(t.dataset.cal === "prev" ? m.subtract(1, u) : m.add(1, u)); return loadCal(); }
			if (t.dataset.calv) { S.calView = t.dataset.calv; return loadCal(); }
			if (t.dataset.day) return dayList(t.dataset.day);
			if (t.dataset.v) { e.preventDefault(); return detail(t.dataset.v); }
			if (t.dataset.rt) { e.preventDefault(); return frappe.set_route("Form", t.dataset.rt, t.dataset.rn); }
			if (t.dataset.a) return act(t.dataset.a, t.dataset.n);
			if (t.dataset.act === "refresh") return load();
			if (t.dataset.act === "apply") {
				S.from_date = b.querySelector('[data-k="from"]').value; S.to_date = b.querySelector('[data-k="to"]').value;
				if (!S.from_date || !S.to_date) return frappe.msgprint(__("Please choose both dates."));
				S.page = 1; return load();
			}
		});
		b.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-go],.tdx-bc")) { e.preventDefault(); e.target.click(); } });
		b.addEventListener("change", function (e) {
			var k = e.target.dataset.k; if (!k || k === "search" || k === "from" || k === "to") return;
			if (k === "use_period") S.use_period = e.target.checked ? 1 : 0; else S[k] = e.target.value;
			if (k === "period" && S.period === "custom") { syncControls(); return; }
			S.page = 1; load();
		});
		b.addEventListener("input", function (e) {
			if (e.target.dataset.k !== "search") return;
			clearTimeout(searchT); var v = e.target.value;
			searchT = setTimeout(function () { S.search = v.trim(); S.page = 1; load(); }, 400);
		});
	}
})();


/* ==== DM Manager ToDo Dashboard button (Phase 9.2 navigation) ====
   Shown only when the server confirms the logged-in employee has >=1 active direct report (Employee.reports_to).
   Visibility only - all manager data access is still enforced by API "mgr_todo_dashboard". */
(function () {
	var host = root_element.querySelector("#ess");
	if (!host || host.__mgrBtnInit) return;
	host.__mgrBtnInit = true;
	var eligible = false;
	function place() {
		if (!eligible) return;
		// Lives inside the My ToDo Tasks container (#todov), which is hidden on every other Employee Dashboard tab.
		var ttl = host.querySelector("#todov .tdx-sub");
		if (!ttl || ttl.querySelector(".mgr-btn")) return;
		var a = document.createElement("a");
		a.href = "/app/manager-todo-dashboard";
		a.className = "mgr-btn";
		a.textContent = "Manager ToDo Dashboard";
		a.setAttribute("aria-label", "Open the Manager ToDo Dashboard for your team");
		a.addEventListener("click", function (e) { e.preventDefault(); frappe.set_route("manager-todo-dashboard"); });
		ttl.appendChild(a);
	}
	new MutationObserver(place).observe(host, { childList: true, subtree: true });
	frappe.call({ method: "mgr_todo_dashboard", args: { section: "check" }, type: "GET" })
		.then(function (r) { eligible = !!(r.message && r.message.eligible); place(); })
		.catch(function () { eligible = false; });
})();
