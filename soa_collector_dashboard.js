/* DM Collections dashboard v1 — collectors: today's approved list, call the customer, log what was collected or promised.
 * Custom HTML Block > Script field. Paste the matching .css into the Style field; leave HTML empty.
 * Needs the backend from SOA_SETUP.md: DocType "SOA Request" and Server Script "SOA API" (method soa_api).
 * English / Arabic switch in the blue bar (remembered in this browser). Run soaMissing() in the console to list untranslated text.
 */
(function () {
	'use strict';
	// ------------------------------------------------------------ shared: language, helpers, icons, API
	const ROOT = root_element;
	const LANG_KEY = 'soa_lang';
	let LANG = 'en';
	try { LANG = localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch (_) { /* ignore */ }
	const MISSING = new Set();
	const AR = {
		"1 PDF": "ملف PDF واحد",
		"All": "الكل",
		"All requests": "كل الطلبات",
		"All salespeople": "كل المندوبين",
		"All statuses": "كل الحالات",
		"All time": "كل الفترات",
		"Amount": "المبلغ",
		"Approve & send": "اعتماد وإرسال",
		"Approved": "معتمد",
		"Approved and sent to {0}": "تم الاعتماد والإرسال إلى {0}",
		"Auto-matched this month": "مطابق تلقائياً هذا الشهر",
		"By": "من",
		"Checking invoices…": "جارٍ فحص الفواتير…",
		"Choose from your customers on the left, then the document and the period.": "اختر أحد عملائك من القائمة، ثم نوع المستند والفترة.",
		"Could not load the requests": "تعذّر تحميل الطلبات",
		"Could not load your customers": "تعذّر تحميل عملائك",
		"Could not load your requests": "تعذّر تحميل طلباتك",
		"Customer": "العميل",
		"Customers appear here once a sales invoice carries your name as sales person.": "يظهر العملاء هنا عندما تحمل فاتورة مبيعات اسمك كمندوب مبيعات.",
		"Difference": "الفرق",
		"Document": "المستند",
		"Download the files Azrah or the system sent you": "حمّل الملفات التي أرسلتها لك عزرا أو النظام",
		"Every request matched and went straight to the salesperson.": "كل الطلبات متطابقة وأُرسلت مباشرة إلى المندوب.",
		"Every transaction with running balance": "كل الحركات مع الرصيد التراكمي",
		"Failed": "فشل",
		"File": "الملف",
		"Files": "الملفات",
		"Files sent": "الملفات المرسلة",
		"Files sent to salespeople": "الملفات المرسلة إلى المندوبين",
		"From": "من",
		"Highest balance": "الأعلى رصيداً",
		"How": "الطريقة",
		"Invoices, payments and ageing for the period": "الفواتير والمدفوعات وأعمار الديون للفترة",
		"Journal Entry": "قيد يومية",
		"Journal entry not linked to an invoice": "قيد يومية غير مرتبط بفاتورة",
		"Last 3 months": "آخر 3 أشهر",
		"Last month": "الشهر الماضي",
		"Last year": "السنة الماضية",
		"Latest invoice": "أحدث فاتورة",
		"Ledger": "كشف حساب تفصيلي",
		"Ledger ({0}) and open invoices ({1}) differ by {2} SAR. Azrah checks it before it is sent to you.": "يختلف رصيد الحساب ({0}) عن الفواتير المفتوحة ({1}) بمقدار {2} ر.س. ستراجعه عزرا قبل إرساله إليك.",
		"Ledger and invoices agree. The statement comes back to you straight away.": "رصيد الحساب مطابق للفواتير. سيصلك الكشف مباشرة.",
		"Ledger balance": "رصيد الحساب",
		"Letterhead": "الترويسة",
		"Letterheads (picked from the invoice numbers)": "الترويسات (تُحدَّد من أرقام الفواتير)",
		"My requests": "طلباتي",
		"Name A–Z": "الاسم أ–ي",
		"New request": "طلب جديد",
		"New request for this customer": "طلب جديد لهذا العميل",
		"No Sales Person is linked to your user. Ask the admin to link your Employee to your Sales Person.": "لا يوجد مندوب مبيعات مرتبط بمستخدمك. اطلب من المسؤول ربط ملف الموظف بمندوب المبيعات.",
		"No customer matches “{0}”": "لا يوجد عميل يطابق «{0}»",
		"No customers yet": "لا يوجد عملاء بعد",
		"No unallocated payment or journal entry found. Check credit notes and opening entries for this customer.": "لا توجد دفعة أو قيد غير مخصص. راجع إشعارات الدائن والأرصدة الافتتاحية لهذا العميل.",
		"Note for Azrah (optional)": "ملاحظة لعزرا (اختياري)",
		"Note to the salesperson (needed to reject)": "ملاحظة للمندوب (مطلوبة عند الرفض)",
		"Nothing in this period for this document. Try a wider period.": "لا يوجد شيء في هذه الفترة لهذا المستند. جرّب فترة أطول.",
		"Nothing to review": "لا شيء للمراجعة",
		"Open My requests": "فتح طلباتي",
		"Open balance (SAR)": "الرصيد المفتوح (ر.س)",
		"Open invoices": "الفواتير المفتوحة",
		"Open invoices with days overdue": "الفواتير المفتوحة مع أيام التأخير",
		"Outstanding Invoices": "الفواتير المستحقة",
		"Payment Entry": "سند قبض",
		"Period": "الفترة",
		"Pick a customer to start": "اختر عميلاً للبدء",
		"Preparing…": "جارٍ التجهيز…",
		"Preview": "معاينة",
		"Processing": "قيد المعالجة",
		"Re-check": "إعادة الفحص",
		"Ready": "جاهز",
		"Ready to download": "جاهز للتحميل",
		"Ready — {0} file(s)": "جاهز — {0} ملف",
		"Refresh": "تحديث",
		"Reject": "رفض",
		"Rejected": "مرفوض",
		"Rejected / failed": "مرفوض / فشل",
		"Rejected this month": "المرفوض هذا الشهر",
		"Rejected — the salesperson was notified": "تم الرفض — أُبلغ المندوب",
		"Request failed": "فشل الطلب",
		"Request log": "سجل الطلبات",
		"Request {0}": "طلب {0}",
		"Requested": "تاريخ الطلب",
		"Requests this month": "طلبات هذا الشهر",
		"Review queue": "قائمة المراجعة",
		"Reviewed": "المراجعة",
		"Run the check again after fixing allocations in ERPNext": "أعد الفحص بعد تصحيح التخصيص في ERPNext",
		"Salesperson": "المندوب",
		"Salesperson note": "ملاحظة المندوب",
		"Search customer or request": "ابحث عن عميل أو طلب",
		"Search customer, file or salesperson": "ابحث عن عميل أو ملف أو مندوب",
		"Search customer, request or salesperson": "ابحث عن عميل أو طلب أو مندوب",
		"Search name or code": "ابحث بالاسم أو الرمز",
		"Sent": "تاريخ الإرسال",
		"Sent to": "أُرسل إلى",
		"Sent to Azrah for review": "أُرسل إلى عزرا للمراجعة",
		"Sent today": "المرسل اليوم",
		"Something went wrong. Try again.": "حدث خطأ. حاول مرة أخرى.",
		"Sort": "الترتيب",
		"Statement of Account": "كشف حساب",
		"Statement ready": "الكشف جاهز",
		"Status": "الحالة",
		"Status: {0}": "الحالة: {0}",
		"Still different by {0} SAR": "لا يزال الفرق {0} ر.س",
		"Switch language": "تبديل اللغة",
		"The files could not be made.": "تعذّر إنشاء الملفات.",
		"The start date is after the end date.": "تاريخ البداية بعد تاريخ النهاية.",
		"The statement could not be made": "تعذّر إنشاء الكشف",
		"This month": "هذا الشهر",
		"This year": "هذه السنة",
		"To": "إلى",
		"Unallocated payment": "دفعة غير مخصصة",
		"Waiting for you": "بانتظارك",
		"Why it does not match": "سبب عدم التطابق",
		"With Azrah": "لدى عزرا",
		"Write a reason so the salesperson knows what to fix.": "اكتب السبب ليعرف المندوب ما يجب تصحيحه.",
		"You need the SOA Manager role to review requests.": "تحتاج صلاحية SOA Manager لمراجعة الطلبات.",
		"Your customers": "عملاؤك",
		"Your requests and their files will be listed here.": "ستظهر طلباتك وملفاتها هنا.",
		"approved": "معتمد",
		"auto": "تلقائي",
		"auto + approved": "تلقائي + معتمد",
		"auto-matched": "مطابق تلقائياً",
		"difference {0}": "الفرق {0}",
		"e.g. customer asked for it before Thursday’s meeting": "مثال: طلبه العميل قبل اجتماع الخميس",
		"entries": "قيود",
		"invoices": "فواتير",
		"just now": "الآن",
		"ledger and invoices differ": "الرصيد والفواتير غير متطابقين",
		"oldest {0}": "الأقدم {0}",
		"queue is clear": "لا توجد طلبات معلّقة",
		"returned to salespeople": "أُعيدت للمندوبين",
		"see the note in the log": "راجع الملاحظة في السجل",
		"sent or approved": "مرسلة أو معتمدة",
		"sent {0}": "أُرسل {0}",
		"{0} all time": "{0} إجمالاً",
		"{0} customers": "{0} عميل",
		"{0} d ago": "قبل {0} يوم",
		"{0} files": "{0} ملف",
		"{0} h ago": "قبل {0} ساعة",
		"{0} invoices": "{0} فاتورة",
		"{0} min ago": "قبل {0} دقيقة",
		"{0} of {1}": "{0} من {1}",
		"{0} of {1} requests": "{0} من {1} طلب",
		"Nothing matches this filter": "لا يوجد ما يطابق هذا الفلتر",
		"No requests yet": "لا توجد طلبات بعد",
		"Nothing matches these filters": "لا يوجد ما يطابق هذه الفلاتر",
		"Nothing matches this search": "لا يوجد ما يطابق البحث",
		"No files sent yet": "لم تُرسل ملفات بعد",
		"Letter Head not found: {0}. Fix the names in the dashboard settings (letterheads).": "لم يُعثر على الترويسة: {0}. صحّح الأسماء في إعدادات اللوحة (letterheads).",
		"Download below. They are also kept in My requests.": "حمّل الملفات أدناه. تُحفظ أيضاً في «طلباتي».",
		"The ledger and the open invoices differ by {0} SAR, so Azrah checks it first. It will show here as Ready once she approves.": "يختلف رصيد الحساب عن الفواتير المفتوحة بمقدار {0} ر.س، لذا ستراجعه عزرا أولاً. سيظهر هنا «جاهز» بعد اعتمادها.",
		"Your user cannot read the customer ledger, so Azrah will prepare this statement.": "لا يملك مستخدمك صلاحية قراءة دفتر العميل، لذا ستجهّز عزرا هذا الكشف.",
		"Azrah’s login is not set in the dashboard settings (manager_user), so requests that need review stay with you.": "لم يُحدَّد حساب عزرا في إعدادات اللوحة (manager_user)، لذا تبقى الطلبات التي تحتاج مراجعة لديك.",
		"Azrah’s login is not set in the dashboard settings (manager_user), so requests that need review stay with the salesperson.": "لم يُحدَّد حساب عزرا في إعدادات اللوحة (manager_user)، لذا تبقى الطلبات التي تحتاج مراجعة لدى المندوب.",
		"Choose a document type.": "اختر نوع المستند.",
		"Letter Head not found: {0}. Fix the names in the SOA API server script.": "لم يُعثر على الترويسة: {0}. صحّح الأسماء في سكربت SOA API.",
		"Outstanding SOA": "كشف الحساب المستحق",
		"Customer Ledger": "كشف حساب العميل التفصيلي",
		"Letterhead (main brand of the invoices in the period)": "الترويسة (العلامة الرئيسية لفواتير الفترة)",
		"Expected balance": "الرصيد المتوقع",
		"The balance agrees with Accounts Receivable ({0}). The statement comes back to you straight away.": "الرصيد مطابق للذمم المدينة ({0}). سيصلك الكشف مباشرة.",
		"Expected balance ({0}) and Accounts Receivable ({1}) differ by {2} SAR. Azrah checks it before it is sent to you.": "يختلف الرصيد المتوقع ({0}) عن الذمم المدينة ({1}) بمقدار {2} ر.س. ستراجعه عزرا قبل إرساله إليك.",
		"The statement and Accounts Receivable differ by {0} SAR, so Azrah checks it first. It will show here as Ready once she approves.": "يختلف الكشف عن الذمم المدينة بمقدار {0} ر.س، لذا ستراجعه عزرا أولاً. سيظهر هنا «جاهز» بعد اعتمادها.",
		"statement differs from Accounts Receivable": "الكشف يختلف عن الذمم المدينة",
		"Statement balance": "رصيد الكشف",
		"Accounts Receivable": "الذمم المدينة",
		"No unallocated payment or loose journal entry found. Compare the statement rows with the Accounts Receivable report for this customer.": "لا توجد دفعة غير مخصصة أو قيد غير مرتبط. قارن بنود الكشف مع تقرير الذمم المدينة لهذا العميل.",
		"Print format not found: {0}. Fix print_formats in the SOA API server script.": "لم يُعثر على تنسيق الطباعة: {0}. صحّح print_formats في سكربت SOA API.",
		"as of {0}": "حتى {0}",
		"As of": "حتى تاريخ",
		"PDF": "PDF",
		"Download PDF": "تنزيل PDF",
		"Open invoices as of a date, with days overdue": "الفواتير المفتوحة حتى تاريخ محدد مع أيام التأخير",
		"Statement date": "تاريخ الكشف",
		"Shows every open invoice up to this date.": "يعرض كل فاتورة مفتوحة حتى هذا التاريخ.",
		"Checking the balance…": "جارٍ التحقق من الرصيد…",
		"The balance agrees with Accounts Receivable ({0}).": "الرصيد مطابق للذمم المدينة ({0}).",
		"Debit, credit and closing balance are also checked against the General Ledger.": "كما تتم مطابقة المدين والدائن والرصيد الختامي مع دفتر الأستاذ العام.",
		"Download below. It is also kept in My requests.": "نزّله من الأسفل. ويُحفظ أيضًا في طلباتي.",
		"The figures did not match the accounts, so Azrah checks it first. It will show here as Ready once she approves.": "الأرقام لم تتطابق مع الحسابات، لذلك تراجعه عزرا أولًا. سيظهر هنا كجاهز بعد موافقتها.",
		"figures did not match the accounts": "الأرقام لم تتطابق مع الحسابات",
		"Opening balance": "الرصيد الافتتاحي",
		"Debit total": "إجمالي المدين",
		"Credit total": "إجمالي الدائن",
		"Closing balance": "الرصيد الختامي",
		"Amount differs": "المبلغ مختلف",
		"Missing in statement": "غير موجود في الكشف",
		"Not in General Ledger": "غير موجود في دفتر الأستاذ العام",
		"Statement {0} / {1} · General Ledger {2} / {3}": "الكشف {0} / {1} · دفتر الأستاذ {2} / {3}",
		"Customer ledger vs General Ledger": "كشف حساب العميل مقابل دفتر الأستاذ العام",
		"Agrees with the General Ledger": "مطابق لدفتر الأستاذ العام",
		"Open General Ledger": "فتح دفتر الأستاذ العام",
		"Statement": "الكشف",
		"General Ledger": "دفتر الأستاذ العام",
		"Statement row differs from Accounts Receivable": "سطر الكشف يختلف عن الذمم المدينة",
		"Receivable missing from the statement rows": "مستحق في الذمم المدينة وغير موجود في سطور الكشف",
		"Starts from {0}, the year of the oldest open invoice.": "يبدأ من {0}، أول السنة التي بها أقدم فاتورة مفتوحة.",
		"Could not load the files": "تعذّر تحميل الملفات",
		"Could not show this list": "تعذّر عرض هذه القائمة",
		"+{0} more": "+{0} أخرى",
		"Amount collected (SAR)": "المبلغ المحصّل (ريال)",
		"Amount owed on a date, with ageing (no PDF)": "المبلغ المستحق في تاريخ محدد مع أعمار الديون (بدون PDF)",
		"Approve": "اعتماد",
		"Approve all ({0})": "اعتماد الكل ({0})",
		"Approve list": "اعتماد القائمة",
		"Approved today": "اعتُمد اليوم",
		"Assign salespeople": "توزيع المندوبين",
		"Assign salespeople to the collectors first.": "وزّع المندوبين على المحصّلين أولًا.",
		"Azrah checks every request before it reaches you. It will show in My requests as Ready once she approves.": "تراجع عزرا كل طلب قبل أن يصلك. سيظهر في طلباتي كجاهز بعد اعتمادها.",
		"Azrah checks the amount and approves it; it then shows in My requests with the ageing.": "تراجع عزرا المبلغ وتعتمده، ثم يظهر في طلباتي مع أعمار الديون.",
		"Bank transfer": "تحويل بنكي",
		"Call": "اتصال",
		"Cancel": "إلغاء",
		"Cash": "نقدًا",
		"Change result": "تغيير النتيجة",
		"Checked again — it matches now": "أُعيد الفحص — مطابق الآن",
		"Cheque": "شيك",
		"Collected": "تم التحصيل",
		"Collections": "التحصيل",
		"Could not load collections": "تعذّر تحميل التحصيل",
		"Could not load your list": "تعذّر تحميل قائمتك",
		"Customer Outstanding": "مستحقات العميل",
		"Customers follow the “{0}” field on the Customer form.": "يتبع العملاء حقل “{0}” في نموذج العميل.",
		"Customers visited": "العملاء الذين تمت زيارتهم",
		"Day": "اليوم",
		"Done": "تمت",
		"Download what Azrah approved for you": "حمّل ما اعتمدته لك عزرا",
		"Enter the amount collected.": "أدخل المبلغ المحصّل.",
		"Enter the date the customer promised to pay.": "أدخل التاريخ الذي وعد العميل بالدفع فيه.",
		"Everyone on your list has a result": "كل العملاء في قائمتك لهم نتيجة",
		"General Ledger balance": "رصيد دفتر الأستاذ العام",
		"Give the collectors the “{0}” role in ERPNext (User > Roles), then assign their salespeople here.": "امنح المحصّلين دور “{0}” في ERPNext (المستخدم > الأدوار)، ثم وزّع مندوبيهم هنا.",
		"Hide assignments": "إخفاء التوزيع",
		"Invoices": "الفواتير",
		"It appears here as soon as she approves it. Pull to refresh or tap ↻.": "ستظهر هنا فور اعتمادها. اسحب للتحديث أو اضغط ↻.",
		"Last update": "آخر تحديث",
		"Last: {0}": "آخر تحديث: {0}",
		"Left to visit": "المتبقي للزيارة",
		"List approved — the collector was notified": "اعتُمدت القائمة — تم إشعار المحصّل",
		"Log visit": "تسجيل الزيارة",
		"Matched this month": "المطابق هذا الشهر",
		"Matches Accounts Receivable — ready to approve.": "مطابق للذمم المدينة — جاهز للاعتماد.",
		"My collections": "تحصيلاتي",
		"New requests from salespeople show here.": "تظهر هنا الطلبات الجديدة من المندوبين.",
		"No assigned customer has a balance older than {0} days.": "لا يوجد عميل موزّع لديه رصيد أقدم من {0} يومًا.",
		"No collectors yet": "لا يوجد محصّلون بعد",
		"No list for this day": "لا توجد قائمة لهذا اليوم",
		"No list for today": "لا توجد قائمة اليوم",
		"No lists for this day": "لا توجد قوائم لهذا اليوم",
		"No lists for today": "لا توجد قوائم اليوم",
		"No lists waiting for approval": "لا توجد قوائم بانتظار الاعتماد",
		"No sales person field found on Customer, so the sales person on invoices is used.": "لا يوجد حقل مندوب في نموذج العميل، لذلك يُستخدم المندوب المسجل في الفواتير.",
		"Not reachable": "لم يتم الوصول",
		"Note": "ملاحظة",
		"Nothing has been assigned to you for this day.": "لم يُسند إليك شيء لهذا اليوم.",
		"Nothing here": "لا شيء هنا",
		"Nothing to collect": "لا يوجد ما يُحصّل",
		"Outstanding as of {0} — what the salesperson will see": "المستحق حتى {0} — ما سيراه المندوب",
		"Paid by": "طريقة الدفع",
		"Part collected": "تحصيل جزئي",
		"Promised": "وعد بالدفع",
		"Promised to pay on": "وعد بالدفع في",
		"Put back": "إرجاع",
		"Rebuild the lists that are not approved yet, from today’s Accounts Receivable": "إعادة بناء القوائم غير المعتمدة من الذمم المدينة لليوم",
		"Rebuild today’s lists": "إعادة بناء قوائم اليوم",
		"Refused": "رفض الدفع",
		"Remove": "إزالة",
		"Result": "النتيجة",
		"Save": "حفظ",
		"Save result": "حفظ النتيجة",
		"Saved. Tomorrow’s list uses these salespeople; rebuild today’s lists to apply it now.": "تم الحفظ. قائمة الغد تستخدم هؤلاء المندوبين؛ أعد بناء قوائم اليوم لتطبيقه الآن.",
		"Saved: {0}": "تم الحفظ: {0}",
		"Search customer": "ابحث عن عميل",
		"This is the list for {0}. You can still update it for 3 days.": "هذه قائمة {0}. يمكنك تحديثها خلال 3 أيام.",
		"To collect": "للتحصيل",
		"To collect ({0}+ days)": "للتحصيل (أكثر من {0} يومًا)",
		"To visit": "للزيارة",
		"Today": "اليوم",
		"Today’s lists rebuilt": "أُعيد بناء قوائم اليوم",
		"Total outstanding": "إجمالي المستحق",
		"Waiting for approval": "بانتظار الاعتماد",
		"Who collects for which salespeople": "من يحصّل لأي مندوبين",
		"Who you met, cheque number, next step…": "من قابلت، رقم الشيك، الخطوة التالية…",
		"Your list is waiting for Azrah’s approval": "قائمتك بانتظار اعتماد عزرا",
		"approved {0}": "اعتُمد {0}",
		"by {0}": "بواسطة {0}",
		"logged by collectors": "سجّلها المحصّلون",
		"of {0}": "من {0}",
		"older than {0} days · since {1}": "أقدم من {0} يومًا · منذ {1}",
		"promised {0}": "وعد بتاريخ {0}",
		"removed from this list": "أُزيل من هذه القائمة",
		"sent to salespeople": "أُرسلت للمندوبين",
		"since {0}": "منذ {0}",
		"waiting for her approval": "بانتظار اعتمادها",
		"with a result logged": "لهم نتيجة مسجلة",
		"{0} d": "{0} يوم",
		"{0} days": "{0} يوم",
		"{0} lists": "{0} قوائم",
		"{0} lists approved — collectors were notified": "اعتُمدت {0} قوائم — تم إشعار المحصّلين",
		"{0} visited": "تمت زيارة {0}",
		"Note to salesperson (needed to reject)": "ملاحظة للمندوب (مطلوبة للرفض)",
		"Collectors and their salespeople": "المحصّلون ومندوبوهم",
		"Add a collector from employees…": "أضف محصّلًا من الموظفين…",
		"no login": "بدون حساب دخول",
		"Add collector": "إضافة محصّل",
		"No collectors yet. Pick the employees who collect; they need a User ID on their Employee form to log in.": "لا يوجد محصّلون بعد. اختر الموظفين المحصّلين؛ يجب أن يكون لهم معرّف مستخدم في نموذج الموظف للدخول.",
		"{0} salespeople": "{0} مندوبين",
		"Confirm remove": "تأكيد الإزالة",
		"Collector removed": "تمت إزالة المحصّل",
		"Collector added. Now tick their salespeople and save.": "تمت إضافة المحصّل. اختر مندوبيه ثم احفظ.",
		"Approved statements are emailed to you, with finance in copy": "الكشوف المعتمدة تُرسل إليك بالبريد مع نسخة للمالية",
		"You have used your {0} requests for today": "استخدمت طلباتك الـ{0} لهذا اليوم",
		"{0} of {1} requests left today": "متبقٍ {0} من {1} طلبات اليوم",
		"Azrah checks every request. Once she approves it, it is emailed to you with finance in copy.": "تراجع عزرا كل طلب. بعد اعتماده يُرسل إليك بالبريد مع نسخة للمالية.",
		"Emailed to you": "أُرسل إليك بالبريد",
		"approved by Azrah": "اعتمدته عزرا",
		"Emailed": "أُرسل بالبريد",
		"Approve & email": "اعتماد وإرسال بالبريد",
		"Approved and emailed to {0}": "اعتُمد وأُرسل بالبريد إلى {0}",
		"Files emailed": "الملفات المرسلة",
		"Files emailed to salespeople": "الملفات المرسلة للمندوبين بالبريد"
	};
	function T(s) {
		const a = Array.prototype.slice.call(arguments, 1);
		let t = s;
		if (LANG === 'ar') { if (AR[s] != null) t = AR[s]; else MISSING.add(s); }
		return String(t).replace(/\{(\d+)\}/g, (m, i) => (a[i] != null ? a[i] : m));
	}
	window.soaMissing = () => Array.from(MISSING);

	const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
	const money = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const money0 = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
	const iso = (d) => d.toISOString().slice(0, 10);
	const pd = (s) => new Date(String(s).slice(0, 10) + 'T12:00:00Z');
	const fdate = (s) => {
		if (!s) return '';
		const d = String(s).slice(0, 10);
		try { return frappe.datetime.str_to_user(d); } catch (_) { return d; }
	};
	const ftime = (s) => (s ? String(s).slice(11, 16) : '');
	const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
	const slug = (dt) => String(dt || '').toLowerCase().replace(/ /g, '-');
	function ago(ts) {
		if (!ts) return '';
		const ms = Date.now() - new Date(String(ts).replace(' ', 'T')).getTime();
		const m = Math.round(ms / 60000);
		if (!isFinite(m)) return '';
		if (m < 1) return T('just now');
		if (m < 60) return T('{0} min ago', m);
		const h = Math.round(m / 60);
		if (h < 24) return T('{0} h ago', h);
		return T('{0} d ago', Math.round(h / 24));
	}
	const BRAND_CLS = { Najd: 'najd', DMCC: 'dmcc' };
	const brandChip = (b, extra) => `<span class="soa-brand ${BRAND_CLS[b] || ''}">${esc(b)}${extra ? ' · ' + esc(extra) : ''}</span>`;

	const ICONS = {
		ledger: '<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M8 9h7M8 13h7M8 17h4"/>',
		open: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h3M8 17h6"/><circle cx="17" cy="15.5" r="1.5"/>',
		soa: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
		dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
		ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
		warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		x: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
		stack: '<path d="M12 3 2 8l10 5 10-5zM2 13l10 5 10-5"/>',
		send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
		coin: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M15 9.3c0-1.3-1.3-2.3-3-2.3s-3 1-3 2.2c0 2.9 6 1.6 6 4.6 0 1.3-1.3 2.4-3 2.4s-3-1-3-2.4"/>',
		phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
		route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
		users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.6 4 2.4 4 6"/>',
	};
	const ico = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.soa}</svg>`;

	const DOC_INFO = {
		'Outstanding SOA': { icon: 'open', label: 'Outstanding SOA', desc: 'Open invoices as of a date, with days overdue' },
		'Customer Ledger': { icon: 'ledger', label: 'Customer Ledger', desc: 'Every transaction with running balance' },
		'Customer Outstanding': { icon: 'coin', label: 'Customer Outstanding', desc: 'Amount owed on a date, with ageing (no PDF)' },
	};
	const STATUS = {
		'Sent': ['green', 'Emailed'], 'Approved': ['green', 'Emailed'], 'Needs Review': ['amber', 'With Azrah'],
		'Rejected': ['red', 'Rejected'], 'Failed': ['red', 'Failed'], 'Processing': ['blue', 'Processing'],
	};
	const badge = (s) => { const x = STATUS[s] || ['grey', s]; return `<span class="soa-b ${x[0]}">${esc(T(x[1]))}</span>`; };
	const fileLinks = (files, label) => (files || []).map((f) => `<a class="soa-file" href="${esc(f.file_url)}" target="_blank" rel="noopener" title="${esc(f.file_name)}">${ico('dl')}${esc(label || f.brand)}</a>`).join('');
	// table cell that becomes a "label  value" row on phones
	const td = (label, html, cls) => `<td class="${cls || ''}" data-l="${esc(label)}"><div>${html}</div></td>`;
	const period = (r) => (r.document_type === 'Customer Ledger' ? fdate(r.from_date) + ' – ' + fdate(r.to_date) : T('as of {0}', fdate(r.to_date)));
	// outstanding total + ageing buckets
	// compact version for table cells: one line per bucket that has an amount
	const agLine = (ag) => (!ag ? '' : `<div class="soa-agl"><div><b>${money(ag.total)}</b> <small>SAR</small></div>${(ag.buckets || []).filter((b) => b.amount > 0.005).map((b) => `<span><small>${esc(T('{0} days', b.label))}</small><b>${money0(b.amount)}</b></span>`).join('')}</div>`);
	const agHtml = (ag) => (!ag ? '' : `<div class="soa-ag"><div class="soa-ag-t"><b>${money(ag.total)}</b> <small>SAR</small></div><div class="soa-ag-b">${(ag.buckets || []).map((b) => `<span class="${b.amount > 0.005 ? '' : 'z'}"><small>${esc(T('{0} days', b.label))}</small><b>${money0(b.amount)}</b></span>`).join('')}</div></div>`);

	const errText = (e) => {
		try {
			const m = JSON.parse((e && e._server_messages) || '[]');
			if (m.length) return String(JSON.parse(m[0]).message).replace(/<[^>]*>/g, '');
		} catch (_) { /* ignore */ }
		return (e && (e.message || e.exc_type)) || T('Something went wrong. Try again.');
	};

	function toast(msg, kind) {
		const el = document.createElement('div');
		el.className = 'soa-toast ' + (kind || '');
		el.textContent = msg;
		(ROOT.querySelector('.soa') || ROOT).appendChild(el);
		setTimeout(() => el.remove(), 3800);
	}
	function themeWatch(el) {
		const apply = () => el.classList.toggle('soa-dark', document.documentElement.getAttribute('data-theme') === 'dark');
		apply();
		const mo = new MutationObserver(apply);
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return mo;
	}
	function setLang(l, rebuild) {
		try { localStorage.setItem(LANG_KEY, l); } catch (_) { /* ignore */ }
		LANG = l;
		rebuild();
	}
	const store = {
		get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } },
		set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } },
	};

	// ------------------------------------------------------------ backend: Server Script "SOA API" (method soa_api) + DocType "SOA Request"
	const DOC_ROUTE = '/app/soa-request/';
	const LH_HINT = 'Print format not found: {0}. Fix print_formats in the SOA API server script.';
	const api = (action, args) => new Promise((resolve, reject) => {
		frappe.call({
			method: 'soa_api', args: Object.assign({ action: action }, args || {}), freeze: false,
			callback: (r) => resolve(r.message),
			error: (e) => reject(e),
		});
	});

	// ------------------------------------------------------------ Collector: my collection list
	const C = { data: null, date: '', filter: store.get('soa_c_flt', 'todo'), q: '', open: '', form: {}, busy: false, err: '' };
	let $root = null, mo = null, timer = null;
	const RESULTS = [['Collected', 'green'], ['Part collected', 'blue'], ['Promised', 'amber'], ['Not reachable', 'grey'], ['Refused', 'red']];
	const RES_CLS = {};
	RESULTS.forEach((r) => { RES_CLS[r[0]] = r[1]; });
	const MODES = ['Cash', 'Cheque', 'Bank transfer'];

	function build() {
		if (mo) mo.disconnect();
		if (timer) clearInterval(timer);
		ROOT.querySelectorAll('.soa').forEach((x) => x.remove());
		const rtl = LANG === 'ar';
		const wrap = document.createElement('div');
		wrap.className = 'soa soa-col' + (rtl ? ' soa-rtl' : '');
		wrap.dir = rtl ? 'rtl' : 'ltr';
		wrap.lang = rtl ? 'ar' : 'en';
		wrap.innerHTML = `
			<div class="soa-top">
				<div class="soa-tabs"><span class="soa-tab on">${ico('route').replace('<svg', '<svg style="width:16px;height:16px"')} ${esc(T('My collections'))}</span></div>
				<div class="soa-side"><span class="soa-me"><i></i><span></span></span>
					<button type="button" class="soa-ibtn" data-a="refresh" title="${esc(T('Refresh'))}">↻</button>
					<button type="button" class="soa-lang" data-a="lang" title="${esc(T('Switch language'))}">${rtl ? 'English' : 'العربية'}</button></div>
			</div>
			<div class="soa-cbody"><div class="soa-card"><div class="soa-skel"></div></div></div>`;
		ROOT.appendChild(wrap);
		$root = wrap;
		mo = themeWatch(wrap);
		bind();
		if (C.data) render(); else load();
		timer = setInterval(() => { if (!wrap.isConnected) { clearInterval(timer); return; } if (!document.hidden && !C.open) load(true); }, 5 * 60 * 1000);
	}

	function bind() {
		$root.addEventListener('click', (e) => {
			const t = e.target.closest('[data-a],[data-flt],[data-day],[data-res]');
			if (!t) return;
			if (t.dataset.flt) { C.filter = t.dataset.flt; store.set('soa_c_flt', C.filter); return render(); }
			if (t.dataset.day) { C.date = t.dataset.day; C.open = ''; return load(); }
			if (t.dataset.res) { C.form.result = t.dataset.res; return renderOpen(); }
			const a = t.dataset.a;
			if (a === 'lang') return setLang(LANG === 'ar' ? 'en' : 'ar', build);
			if (a === 'refresh') return load();
			if (a === 'open') {
				const it = item(t.dataset.item);
				C.open = C.open === t.dataset.item ? '' : t.dataset.item;
				C.form = it ? { result: it.result || '', amount: it.collected_amount || '', mode: it.payment_mode || 'Cash', promise: it.promise_date || '', note: it.note || '' } : {};
				return render();
			}
			if (a === 'cancel') { C.open = ''; return render(); }
			if (a === 'save') return save();
		});
		$root.addEventListener('input', (e) => {
			const f = e.target.dataset.f;
			if (f === 'q') { C.q = e.target.value; renderList(); }
			if (f === 'amount' || f === 'note' || f === 'promise' || f === 'mode') C.form[f] = e.target.value;
		});
		$root.addEventListener('change', (e) => {
			const f = e.target.dataset.f;
			if (f === 'promise' || f === 'mode') C.form[f] = e.target.value;
		});
	}

	function load(quiet) {
		return api('coll_my', C.date ? { date: C.date } : {}).then((r) => {
			C.data = r; C.err = '';
			if (!C.date) C.date = r.date;
			render();
		}).catch((e) => { C.err = errText(e); if (!quiet || !C.data) render(); });
	}
	const item = (name) => (((C.data || {}).list || {}).items || []).find((x) => x.name === name);
	const active = () => (((C.data || {}).list || {}).items || []).filter((x) => !x.removed);
	const inFilter = (it) => C.filter === 'all' || (C.filter === 'todo' ? !it.result : !!it.result);

	function render() {
		const d = C.data;
		$root.querySelector('.soa-me i').textContent = initials(d && d.full_name);
		$root.querySelector('.soa-me span').textContent = (d && d.full_name) || '';
		const el = $root.querySelector('.soa-cbody');
		if (C.err && !d) { el.innerHTML = `<div class="soa-card"><div class="soa-empty"><b>${esc(T('Could not load your list'))}</b>${esc(C.err)}</div></div>`; return; }
		if (!d) return;
		const isToday = d.date === d.today;
		const days = `<div class="soa-cdays soa-card soa-cpad"><span class="soa-card-s">${esc(T('Day'))}</span>${[d.today].concat((d.recent || []).map((r) => r.date)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 7)
			.map((x) => `<button type="button" class="soa-chipbtn ${x === d.date ? 'on' : ''}" data-day="${esc(x)}">${esc(x === d.today ? T('Today') : fdate(x))}</button>`).join('')}</div>`;
		if (!d.list) {
			el.innerHTML = days + `<div class="soa-card"><div class="soa-empty" style="padding:46px 18px">${ico(d.pending ? 'clock' : 'ok').replace('<svg', '<svg style="width:34px;height:34px;color:var(--royal);margin-bottom:8px"')}
				<b>${esc(T(d.pending ? 'Your list is waiting for Azrah’s approval' : (isToday ? 'No list for today' : 'No list for this day')))}</b>${esc(T(d.pending ? 'It appears here as soon as she approves it. Pull to refresh or tap ↻.' : 'Nothing has been assigned to you for this day.'))}</div></div>`;
			return;
		}
		const items = active();
		const due = items.reduce((a, x) => a + x.due_amount, 0);
		const got = items.reduce((a, x) => a + (x.collected_amount || 0), 0);
		const left = items.filter((x) => !x.result).length;
		const n = (f) => items.filter((x) => f === 'all' || (f === 'todo' ? !x.result : !!x.result)).length;
		el.innerHTML = days + `
			<div class="soa-csum">
				<div class="soa-card"><small>${esc(T('To collect'))}</small><b>${money0(due)}</b><span>${esc(T('{0} customers', items.length))}</span></div>
				<div class="soa-card"><small>${esc(T('Collected'))}</small><b class="green">${money0(got)}</b><span>${due ? Math.round((got / due) * 100) + '%' : '—'}</span></div>
				<div class="soa-card"><small>${esc(T('Left to visit'))}</small><b class="${left ? 'amber' : 'green'}">${left}</b><span>${esc(T('of {0}', items.length))}</span></div>
			</div>
			${isToday ? '' : `<div class="soa-warnbar">${esc(T('This is the list for {0}. You can still update it for 3 days.', fdate(d.date)))}</div>`}
			<div class="soa-card soa-cpad soa-ctools">
				<div class="soa-cflt">${[['todo', 'To visit'], ['done', 'Done'], ['all', 'All']].map((f) => `<button type="button" class="soa-chipbtn ${C.filter === f[0] ? 'on' : ''}" data-flt="${f[0]}">${esc(T(f[1]))} · ${n(f[0])}</button>`).join('')}</div>
				<input class="soa-in" type="search" data-f="q" value="${esc(C.q)}" placeholder="${esc(T('Search customer'))}">
			</div>
			<div class="soa-clist2"></div>`;
		renderList();
	}

	function renderList() {
		const el = $root.querySelector('.soa-clist2');
		if (!el) return;
		const q = C.q.trim().toLowerCase();
		const rows = active().filter((it) => inFilter(it) && (!q || (it.customer_name + ' ' + it.customer).toLowerCase().includes(q)));
		if (!rows.length) { el.innerHTML = `<div class="soa-card"><div class="soa-empty"><b>${esc(T(C.filter === 'todo' ? 'Everyone on your list has a result' : 'Nothing here'))}</b></div></div>`; return; }
		el.innerHTML = rows.map(cardHtml).join('');
	}

	function cardHtml(it) {
		const open = C.open === it.name;
		const inv = it.invoices || [];
		return `<article class="soa-card soa-cc ${it.result ? 'done' : ''} ${open ? 'open' : ''}" data-card="${esc(it.name)}">
			<div class="soa-cc-h">
				<div class="soa-cc-n"><b>${esc(it.customer_name)}</b><small>${esc(it.customer)} · ${esc(it.sales_person)}</small></div>
				${it.phone ? `<a class="soa-cc-call" href="tel:${esc(it.phone)}" title="${esc(T('Call'))}">${ico('phone')}<span>${esc(it.phone)}</span></a>` : ''}
			</div>
			<div class="soa-cc-amt">
				<div><small>${esc(T('To collect'))}</small><b>${money(it.due_amount)}</b><span>${esc(T('older than {0} days · since {1}', C.data.collect_after_days || 60, fdate(it.oldest_date)))}</span></div>
				<div><small>${esc(T('Total outstanding'))}</small><b class="soft">${money(it.total_outstanding)}</b></div>
			</div>
			${it.last_update ? `<div class="soa-cc-last">${ico('clock')}<span>${esc(T('Last: {0}', it.last_update))}</span></div>` : ''}
			${inv.length ? `<details class="soa-cc-inv"><summary>${esc(T('{0} invoices', inv.length))}</summary><ul>${inv.map((v) => `<li><span>${esc(v.voucher)}<small>${esc(fdate(v.date))} · ${esc(T('{0} d', v.days))}</small></span><b>${money(v.amount)}</b></li>`).join('')}</ul></details>` : ''}
			${it.result && !open ? `<div class="soa-cc-res"><span class="soa-b ${RES_CLS[it.result] || 'grey'}">${esc(T(it.result))}</span>${it.collected_amount ? `<b>${money(it.collected_amount)}</b><small>${esc(T(it.payment_mode || ''))}</small>` : ''}${it.promise_date ? `<small>${esc(T('promised {0}', fdate(it.promise_date)))}</small>` : ''}${it.note ? `<small class="soa-cc-note">${esc(it.note)}</small>` : ''}</div>` : ''}
			<div class="soa-cc-form">${open ? formHtml(it) : `<button type="button" class="soa-btn ${it.result ? '' : 'pri'}" data-a="open" data-item="${esc(it.name)}">${esc(T(it.result ? 'Change result' : 'Log visit'))}</button>`}</div>
		</article>`;
	}

	function formHtml(it) {
		const f = C.form;
		const money_ = f.result === 'Collected' || f.result === 'Part collected';
		return `<div class="soa-cf">
			<div class="soa-cf-res" role="radiogroup" aria-label="${esc(T('Result'))}">${RESULTS.map((r) => `<button type="button" role="radio" aria-checked="${f.result === r[0]}" class="soa-cf-chip ${r[1]} ${f.result === r[0] ? 'on' : ''}" data-res="${esc(r[0])}">${esc(T(r[0]))}</button>`).join('')}</div>
			${money_ ? `<div class="soa-cf-row"><label>${esc(T('Amount collected (SAR)'))}<input class="soa-in" type="number" inputmode="decimal" min="0" step="0.01" data-f="amount" value="${esc(f.amount)}" placeholder="${esc(f.result === 'Collected' ? String(it.due_amount) : '')}"></label>
				<label>${esc(T('Paid by'))}<select class="soa-sel" data-f="mode">${MODES.map((m) => `<option value="${esc(m)}" ${f.mode === m ? 'selected' : ''}>${esc(T(m))}</option>`).join('')}</select></label></div>` : ''}
			${f.result === 'Promised' ? `<div class="soa-cf-row"><label>${esc(T('Promised to pay on'))}<input class="soa-in" type="date" data-f="promise" value="${esc(f.promise)}" min="${esc(C.data.today)}"></label></div>` : ''}
			<label class="soa-cf-note">${esc(T('Note'))}<textarea class="soa-ta" data-f="note" rows="2" maxlength="500" placeholder="${esc(T('Who you met, cheque number, next step…'))}">${esc(f.note)}</textarea></label>
			<div class="soa-cf-btns"><button type="button" class="soa-btn" data-a="cancel">${esc(T('Cancel'))}</button>
				<button type="button" class="soa-btn pri" data-a="save" ${C.busy || !f.result ? 'disabled' : ''}>${C.busy ? '<span class="soa-spin"></span>' : ''} ${esc(T('Save result'))}</button></div>
		</div>`;
	}
	function renderOpen() {
		const card = $root.querySelector(`[data-card="${CSS.escape(C.open)}"] .soa-cc-form`);
		const it = item(C.open);
		if (card && it) card.innerHTML = formHtml(it);
	}

	function save() {
		const it = item(C.open);
		const f = C.form;
		if (!it || !f.result) return;
		if ((f.result === 'Collected' || f.result === 'Part collected') && !(Number(f.amount) > 0)) {
			if (f.result === 'Collected' && !f.amount) f.amount = it.due_amount;
			else { toast(T('Enter the amount collected.'), 'bad'); return; }
		}
		if (f.result === 'Promised' && !f.promise) { toast(T('Enter the date the customer promised to pay.'), 'bad'); return; }
		C.busy = true; renderOpen();
		api('coll_log', { list: C.data.list.name, item: it.name, result: f.result, collected_amount: f.amount || 0, payment_mode: f.mode || '', promise_date: f.promise || '', note: f.note || '' })
			.then((l) => {
				C.busy = false; C.data.list = l; C.open = '';
				toast(T('Saved: {0}', T(f.result)), 'ok');
				render();
			}).catch((e) => { C.busy = false; renderOpen(); toast(errText(e), 'bad'); });
	}

	build();
})();
