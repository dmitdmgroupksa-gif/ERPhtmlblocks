/* DM SOA Manager dashboard v5 — Azrah: review every request, request and file logs, and the Collections page (assign, approve daily lists, see results).
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
		"Files emailed to salespeople": "الملفات المرسلة للمندوبين بالبريد",
		"Max customers a day": "الحد الأقصى للعملاء يوميًا",
		"No limit": "بدون حد",
		"max {0} a day": "بحد أقصى {0} يوميًا",
		"+{0} over the daily max": "+{0} فوق الحد اليومي"
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

	// ------------------------------------------------------------ Azrah: SOA Manager dashboard
	const M = { tab: store.get('soa_m_tab', 'queue'), reqs: null, files: null, st: '', sp: '', q: '', fq: '', busy: {}, notes: {}, today: '',
		coll: { admin: null, data: null, date: '', assign: false, busy: {}, err: '', sel: {} } };
	let $root = null, mo = null, timer = null;

	function build() {
		if (mo) mo.disconnect();
		if (timer) clearInterval(timer);
		ROOT.querySelectorAll('.soa').forEach((x) => x.remove());
		const rtl = LANG === 'ar';
		const wrap = document.createElement('div');
		wrap.className = 'soa' + (rtl ? ' soa-rtl' : '');
		wrap.dir = rtl ? 'rtl' : 'ltr';
		wrap.lang = rtl ? 'ar' : 'en';
		wrap.innerHTML = `
			<div class="soa-top">
				<div class="soa-tabs" role="tablist">
					<button type="button" class="soa-tab" data-tab="queue" role="tab">${esc(T('Review queue'))} <span class="soa-cnt" data-c="queue">0</span></button>
					<button type="button" class="soa-tab" data-tab="all" role="tab">${esc(T('All requests'))}</button>
					<button type="button" class="soa-tab" data-tab="files" role="tab">${esc(T('Files emailed'))}</button>
					<button type="button" class="soa-tab" data-tab="coll" role="tab">${esc(T('Collections'))} <span class="soa-cnt" data-c="coll">0</span></button>
				</div>
				<div class="soa-side"><span class="soa-me"><i></i><span></span></span>
					<button type="button" class="soa-ibtn" data-a="refresh" title="${esc(T('Refresh'))}">↻</button>
					<button type="button" class="soa-lang" data-a="lang" title="${esc(T('Switch language'))}">${rtl ? 'English' : 'العربية'}</button></div>
			</div>
			<div class="soa-warnbar" hidden></div>
			<div class="soa-kpis"></div>
			<div class="soa-pane" data-pane="queue"><div class="soa-queue"><div class="soa-card"><div class="soa-skel"></div></div></div></div>
			<div class="soa-pane" data-pane="all"><section class="soa-card">
				<div class="soa-card-h"><h3 class="soa-card-t">${esc(T('Request log'))}</h3><span class="soa-card-s" data-c="all"></span></div>
				<div class="soa-tools"><input class="soa-in" type="search" data-f="q" placeholder="${esc(T('Search customer, request or salesperson'))}">
					<select class="soa-sel" data-f="st"></select><select class="soa-sel" data-f="sp"></select></div>
				<div class="soa-all"><div class="soa-skel"></div></div></section></div>
			<div class="soa-pane" data-pane="files"><section class="soa-card">
				<div class="soa-card-h"><h3 class="soa-card-t">${esc(T('Files emailed to salespeople'))}</h3><span class="soa-card-s" data-c="files"></span></div>
				<div class="soa-tools"><input class="soa-in" type="search" data-f="fq" placeholder="${esc(T('Search customer, file or salesperson'))}"></div>
				<div class="soa-flog"><div class="soa-skel"></div></div></section></div>
			<div class="soa-pane" data-pane="coll"><div class="soa-coll"><div class="soa-card"><div class="soa-skel"></div></div></div></div>`;
		ROOT.appendChild(wrap);
		$root = wrap;
		mo = themeWatch(wrap);
		bind();
		switchTab(M.tab);
		if (M.reqs) paint(); else load();
		if (M.coll.data) renderColl(); else loadColl();
		timer = setInterval(() => { if (!wrap.isConnected) { clearInterval(timer); return; } if (!document.hidden) { load(true); loadColl(true); } }, 2 * 60 * 1000);
	}

	function bind() {
		$root.addEventListener('click', (e) => {
			const t = e.target.closest('[data-tab],[data-a],[data-op],[data-day]');
			if (!t) return;
			if (t.dataset.tab) return switchTab(t.dataset.tab);
			if (t.dataset.op) return act(t.dataset.name, t.dataset.op);
			if (t.dataset.day) { M.coll.date = t.dataset.day; return loadColl(); }
			const a = t.dataset.a;
			if (a === 'lang') return setLang(LANG === 'ar' ? 'en' : 'ar', build);
			if (a === 'refresh') { loadColl(); return load(); }
			if (a === 'cassign') { M.coll.assign = !M.coll.assign; return renderColl(); }
			if (a === 'csave') return saveAssign(t.dataset.col);
			if (a === 'caddcol') return M.coll.emp && collectorOp(M.coll.emp, 'add');
			if (a === 'crmcol') { if (M.coll.rm === t.dataset.emp) return collectorOp(t.dataset.emp, 'remove'); M.coll.rm = t.dataset.emp; return renderColl(); }
			if (a === 'cbuild') return collCall('coll_build', {}, T('Today’s lists rebuilt'));
			if (a === 'capprove') return collCall('coll_approve', { lists: JSON.stringify([t.dataset.list]) }, T('List approved — the collector was notified'));
			if (a === 'capprove-all') {
				const drafts = ((M.coll.data || {}).lists || []).filter((l) => l.status === 'Draft').map((l) => l.name);
				if (!drafts.length) return toast(T('No lists waiting for approval'));
				return collCall('coll_approve', { lists: JSON.stringify(drafts) }, T('{0} lists approved — collectors were notified', drafts.length));
			}
			if (a === 'cremove') return collCall('coll_item', { list: t.dataset.list, item: t.dataset.item, removed: t.dataset.removed }, '');
		});
		$root.addEventListener('input', (e) => {
			const f = e.target.dataset.f;
			if (f === 'q') { M.q = e.target.value; renderAll(); }
			if (f === 'fq') { M.fq = e.target.value; renderFiles(); }
			if (f === 'note') M.notes[e.target.dataset.name] = e.target.value;
		});
		$root.addEventListener('change', (e) => {
			const f = e.target.dataset.f;
			if (f === 'st' || f === 'sp') { M[f] = e.target.value; renderAll(); }
			if (f === 'cdate') { M.coll.date = e.target.value; loadColl(); }
			if (f === 'cemp') { M.coll.emp = e.target.value; renderColl(); }
			if (f === 'cmax') { M.coll.max = M.coll.max || {}; M.coll.max[e.target.dataset.col] = e.target.value.replace(/[^0-9]/g, ''); }
			if (f === 'csp') { const col = e.target.dataset.col; M.coll.sel[col] = M.coll.sel[col] || {}; M.coll.sel[col][e.target.value] = e.target.checked; }
		});
	}
	function switchTab(id) {
		M.tab = id; store.set('soa_m_tab', id);
		$root.querySelectorAll('.soa-tab').forEach((b) => { b.classList.toggle('on', b.dataset.tab === id); b.setAttribute('aria-selected', b.dataset.tab === id); });
		$root.querySelectorAll('.soa-pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === id));
	}

	function load(quiet) {
		// each call on its own: one failing call no longer leaves the other tabs loading forever
		const safe = (p) => p.then((v) => ({ ok: true, v: v }), (e) => ({ ok: false, e: e }));
		return Promise.all([safe(api('bootstrap')), safe(api('list', { scope: 'all', limit: 800 })), safe(api('files'))]).then((r) => {
			M.errs = {};
			if (r[0].ok) { M.today = r[0].v.today; M.me = r[0].v; } else { M.today = M.today || iso(new Date()); M.me = M.me || {}; M.errs.boot = errText(r[0].e); }
			if (r[1].ok) M.reqs = r[1].v.requests || []; else { if (quiet && M.reqs) { /* keep the old list */ } else M.reqs = []; M.errs.reqs = errText(r[1].e); }
			if (r[2].ok) M.files = r[2].v.files || []; else { if (quiet && M.files) { /* keep the old list */ } else M.files = []; M.errs.files = errText(r[2].e); }
			paint();
		});
	}
	const errBox = (title, msg) => `<div class="soa-empty"><b>${esc(T(title))}</b>${esc(msg)}</div>`;

	function paint() {
		const b = M.me || {};
		$root.querySelector('.soa-me i').textContent = initials(b.full_name);
		$root.querySelector('.soa-me span').textContent = b.full_name || b.user || '';
		const w = $root.querySelector('.soa-warnbar');
		const msgs = [];
		if (b.is_manager === false) msgs.push(T('You need the SOA Manager role to review requests.'));
		if (b.no_manager) msgs.push(T('Azrah’s login is not set in the dashboard settings (manager_user), so requests that need review stay with the salesperson.'));
		if (b.missing_letterheads && b.missing_letterheads.length) msgs.push(T(LH_HINT, b.missing_letterheads.join(', ')));
		w.hidden = !msgs.length; w.textContent = msgs.join(' ');
		// each part on its own: a problem in one real record can no longer leave the other tabs on "loading"
		const run = (fn, sel) => {
			try { fn(); } catch (e) {
				console.error(e);
				const el = $root.querySelector(sel);
				if (el) el.innerHTML = `<div class="soa-card" style="grid-column:1/-1"><div class="soa-empty"><b>${esc(T('Could not show this list'))}</b>${esc(e && e.message ? e.message : e)}</div></div>`;
			}
		};
		run(renderKpis, '.soa-kpis'); run(renderQueue, '.soa-queue'); run(renderAll, '.soa-all'); run(renderFiles, '.soa-flog');
	}

	function renderKpis() {
		const r = M.reqs || [];
		const month = M.today.slice(0, 7);
		const mreq = r.filter((x) => String(x.creation).slice(0, 7) === month && x.status !== 'Processing');
		const auto = mreq.filter((x) => x.matched === true).length;
		const waiting = r.filter((x) => x.status === 'Needs Review' || x.status === 'Failed');
		const oldest = waiting.length ? waiting.map((x) => x.creation).sort()[0] : '';
		const sentToday = r.filter((x) => String(x.sent_on).slice(0, 10) === M.today).length;
		$root.querySelector('[data-c="queue"]').textContent = waiting.length;
		$root.querySelector('[data-c="queue"]').classList.toggle('hot', waiting.length > 0);
		$root.querySelector('.soa-kpis').innerHTML = [
			['amber', 'clock', T('Waiting for you'), waiting.length, oldest ? T('oldest {0}', ago(oldest)) : T('queue is clear')],
			['green', 'send', T('Approved today'), sentToday, T('sent to salespeople')],
			['', 'ok', T('Matched this month'), mreq.length ? Math.round((auto / mreq.length) * 100) + '%' : '—', T('{0} of {1} requests', auto, mreq.length)],
			['red', 'x', T('Rejected this month'), mreq.filter((x) => x.status === 'Rejected').length, T('returned to salespeople')],
		].map((k) => `<div class="soa-card soa-kpi ${k[0]}"><div class="soa-kpi-i">${ico(k[1])}</div><div class="soa-kpi-l">${esc(k[2])}</div><div class="soa-kpi-v">${k[3]}</div><div class="soa-kpi-s">${esc(k[4])}</div></div>`).join('');
	}

	// ------------------------------------------------------------ queue
	function renderQueue() {
		const el = $root.querySelector('.soa-queue');
		if (M.errs && M.errs.reqs) { el.innerHTML = `<div class="soa-card" style="grid-column:1/-1">${errBox('Could not load the requests', M.errs.reqs)}</div>`; return; }
		const q = (M.reqs || []).filter((x) => x.status === 'Needs Review' || x.status === 'Failed').sort((a, b) => String(a.creation).localeCompare(String(b.creation)));
		if (!q.length) {
			el.innerHTML = `<div class="soa-card" style="grid-column:1/-1"><div class="soa-empty" style="padding:50px 20px">${ico('ok').replace('<svg', '<svg style="width:34px;height:34px;color:#1f8a5b;margin-bottom:8px"')}<b>${esc(T('Nothing to review'))}</b>${esc(T('New requests from salespeople show here.'))}</div></div>`;
			return;
		}
		el.innerHTML = q.map(card).join('');
	}
	function card(r) {
		const busy = M.busy[r.name];
		const dis = busy ? 'disabled' : '';
		const details = (r.details || []);
		const why = details.length
			? `<div class="soa-why"><div class="soa-why-h">${esc(T('Why it does not match'))}</div><ul>${details.map((d) => `<li><span>${esc(T(d.kind))} · <a class="soa-vno" href="/app/${slug(d.voucher_type)}/${encodeURIComponent(d.voucher)}" target="_blank" rel="noopener">${esc(d.voucher)}</a></span><b class="n">${money(d.amount)}</b><small>${esc(T(d.voucher_type))} · ${esc(fdate(d.date))}</small></li>`).join('')}</ul></div>`
			: (r.status === 'Needs Review' && Math.abs(r.difference) > 1 ? `<div class="soa-note">${esc(T('No unallocated payment or loose journal entry found. Compare the statement rows with the Accounts Receivable report for this customer.'))}</div>`
				: (r.matched === true && !(r.gl && r.gl.matched === false) ? `<div class="soa-check ok soa-q-ok">${ico('ok')}<span>${esc(T('Matches Accounts Receivable — ready to approve.'))}</span></div>` : ''));
		const isOut = r.document_type === 'Customer Outstanding';
		const edge = r.status === 'Failed' ? 'bad' : (r.matched === true && !(r.gl && r.gl.matched === false) ? 'ok' : 'warn');
		return `<article class="soa-card soa-qc ${edge}">
			<div class="soa-q-h"><div><h3>${esc(r.customer_name)}</h3><div class="soa-c-m"><a href="/app/customer/${encodeURIComponent(r.customer)}" target="_blank" rel="noopener">${esc(r.customer)}</a> · <span class="soa-vno">${esc(r.name)}</span>${r.cts ? ` · <a class="soa-vno" href="/app/customer-transaction-summary/${encodeURIComponent(r.cts)}" target="_blank" rel="noopener">${esc(r.cts)}</a>` : ''}</div></div>
				<div class="soa-q-st">${badge(r.status)}<div class="soa-card-s">${esc(ago(r.creation))}</div></div></div>
			<div class="soa-q-meta"><span>${esc(T('By'))} <b>${esc(r.requested_by_name || r.requested_by)}</b></span><span>${esc(T((DOC_INFO[r.document_type] || {}).label || r.document_type))}</span><span>${esc(period(r))}</span>${r.letterheads ? `<span>${r.letterheads.split(', ').map((x) => brandChip(x)).join(' ')}</span>` : ''}</div>
			${r.error ? `<div class="soa-err">${esc(r.error)}</div>` : ''}${r.status === 'Failed' ? '' : `
			<div class="soa-trio"><div><small>${esc(T(isOut ? 'General Ledger balance' : 'Statement balance'))}</small><b>${money(r.ledger_balance)}</b></div><div><small>${esc(T('Accounts Receivable'))}</small><b>${money(r.invoice_outstanding)}</b></div><div class="${Math.abs(r.difference) > 1 ? 'bad' : ''}"><small>${esc(T('Difference'))}</small><b>${money(r.difference)}</b></div></div>`}
			${isOut && r.ageing ? `<div class="soa-q-ag"><div class="soa-why-h">${esc(T('Outstanding as of {0} — what the salesperson will see', fdate(r.to_date)))}</div>${agHtml(r.ageing)}</div>` : ''}
			${why}
			${glBlock(r)}
			${(r.files || []).length ? `<div class="soa-q-files">${esc(T('Preview'))}: ${fileLinks(r.files)}</div>` : ''}
			<div class="soa-q-act">
				<textarea class="soa-ta" data-f="note" data-name="${esc(r.name)}" rows="1" maxlength="500" placeholder="${esc(T('Note to salesperson (needed to reject)'))}">${esc(M.notes[r.name] || '')}</textarea>
				<div class="soa-q-btns">
					<button type="button" class="soa-btn sm bad" data-op="reject" data-name="${esc(r.name)}" ${dis}>${esc(T('Reject'))}</button>
					<button type="button" class="soa-btn sm" data-op="recheck" data-name="${esc(r.name)}" ${dis} title="${esc(T('Run the check again after fixing allocations in ERPNext'))}">${esc(T('Re-check'))}</button>
					<button type="button" class="soa-btn sm ok" data-op="approve" data-name="${esc(r.name)}" ${dis}>${busy ? '<span class="soa-spin"></span>' : ico('send').replace('<svg', '<svg style="width:14px;height:14px"')} ${esc(T('Approve & email'))}</button>
				</div></div></article>`;
	}
	const GL_LINES = { opening: 'Opening balance', debit: 'Debit total', credit: 'Credit total', closing: 'Closing balance' };
	function vlink(d) {
		return d.voucher_type ? `<a class="soa-vno" href="/app/${slug(d.voucher_type)}/${encodeURIComponent(d.voucher)}" target="_blank" rel="noopener">${esc(d.voucher)}</a>` : `<span class="soa-vno">${esc(d.voucher || '—')}</span>`;
	}
	function glBlock(r) {
		const g = r.gl;
		if (!g || !g.lines) return '';
		const glUrl = `/app/query-report/General Ledger?party_type=Customer&party=${encodeURIComponent(r.customer)}&from_date=${encodeURIComponent(r.from_date)}&to_date=${encodeURIComponent(r.to_date)}`;
		const rows = g.lines.map((l) => `<tr class="${Math.abs(l.difference) > 0.005 ? 'bad' : ''}"><th>${esc(T(GL_LINES[l.key] || l.key))}</th><td>${money(l.statement)}</td><td>${money(l.gl)}</td><td>${money(l.difference)}</td></tr>`).join('');
		const v = (g.vouchers || []).length
			? `<ul>${g.vouchers.map((d) => `<li><span>${esc(T(d.kind))} · ${vlink(d)}</span><b class="n">${money(d.difference)}</b><small>${esc(T('Statement {0} / {1} · General Ledger {2} / {3}', money(d.st_debit), money(d.st_credit), money(d.gl_debit), money(d.gl_credit)))}</small></li>`).join('')}</ul>`
			: '';
		return `<div class="soa-why"><div class="soa-why-h soa-glh"><span>${esc(T(g.matched ? 'Agrees with the General Ledger' : 'Customer ledger vs General Ledger'))}</span><a href="${glUrl}" target="_blank" rel="noopener">${esc(T('Open General Ledger'))}</a></div>
			<div class="soa-mini-w"><table class="soa-mini"><thead><tr><th></th><th>${esc(T('Statement'))}</th><th>${esc(T('General Ledger'))}</th><th>${esc(T('Difference'))}</th></tr></thead><tbody>${rows}</tbody></table></div>${v}</div>`;
	}
	function act(name, op) {
		const note = (M.notes[name] || '').trim();
		if (op === 'reject' && !note) { toast(T('Write a reason so the salesperson knows what to fix.'), 'bad'); const t = $root.querySelector(`textarea[data-name="${CSS.escape(name)}"]`); if (t) t.focus(); return; }
		M.busy[name] = true; renderQueue();
		api('review', { name: name, op: op, note: note }).then((r) => {
			delete M.busy[name]; delete M.notes[name];
			const i = M.reqs.findIndex((x) => x.name === name);
			if (i >= 0) M.reqs[i] = r;
			const msg = r.status === 'Approved' ? T('Approved and emailed to {0}', r.requested_by_name || r.requested_by)
				: r.status === 'Rejected' ? T('Rejected — the salesperson was notified')
					: r.status === 'Needs Review' ? (r.matched ? T('Checked again — it matches now') : T('Still different by {0} SAR', money(r.difference))) : T('Status: {0}', T((STATUS[r.status] || [0, r.status])[1]));
			toast(msg, r.status === 'Approved' ? 'ok' : r.status === 'Failed' ? 'bad' : '');
			if (r.status === 'Approved') api('files').then((f) => { M.files = f.files || []; renderFiles(); });
			renderKpis(); renderQueue(); renderAll();
		}).catch((e) => { delete M.busy[name]; renderQueue(); toast(errText(e), 'bad'); });
	}

	// ------------------------------------------------------------ all requests
	function renderAll() {
		const reqs = M.reqs || [];
		const stSel = $root.querySelector('[data-f="st"]'), spSel = $root.querySelector('[data-f="sp"]');
		stSel.innerHTML = `<option value="">${esc(T('All statuses'))}</option>` + Object.keys(STATUS).map((s) => `<option value="${esc(s)}" ${M.st === s ? 'selected' : ''}>${esc(T(STATUS[s][1]))}</option>`).join('');
		const sps = {};
		reqs.forEach((r) => { sps[r.requested_by] = r.requested_by_name || r.requested_by; });
		spSel.innerHTML = `<option value="">${esc(T('All salespeople'))}</option>` + Object.keys(sps).sort((a, b) => sps[a].localeCompare(sps[b])).map((u) => `<option value="${esc(u)}" ${M.sp === u ? 'selected' : ''}>${esc(sps[u])}</option>`).join('');
		const q = M.q.trim().toLowerCase();
		const rows = reqs.filter((r) => (!M.st || r.status === M.st) && (!M.sp || r.requested_by === M.sp)
			&& (!q || (r.customer_name + ' ' + r.customer + ' ' + r.name + ' ' + (r.requested_by_name || '')).toLowerCase().includes(q)));
		$root.querySelector('[data-c="all"]').textContent = T('{0} of {1}', rows.length, reqs.length);
		const el = $root.querySelector('.soa-all');
		if (M.errs && M.errs.reqs) { el.innerHTML = errBox('Could not load the requests', M.errs.reqs); return; }
		if (!rows.length) { el.innerHTML = `<div class="soa-empty">${esc(T(reqs.length ? 'Nothing matches these filters' : 'No requests yet'))}</div>`; return; }
		el.innerHTML = `<div class="soa-scroll"><table class="soa-t soa-stack"><thead><tr><th>${esc(T('Customer'))}</th><th>${esc(T('Requested'))}</th><th>${esc(T('Salesperson'))}</th><th>${esc(T('Document'))}</th><th>${esc(T('Period'))}</th><th>${esc(T('Status'))}</th><th class="n">${esc(T('Difference'))}</th><th class="c-opt">${esc(T('Reviewed'))}</th><th>${esc(T('Files'))}</th></tr></thead><tbody>${rows.map((r) => `
			<tr>${td(T('Customer'), `<b>${esc(r.customer_name)}</b><br><small>${esc(r.customer)}</small>`, 'lead')}
				${td(T('Requested'), `${esc(fdate(r.creation))} <small>${esc(ftime(r.creation))}</small><br><small class="soa-vno"><a href="${DOC_ROUTE}${encodeURIComponent(r.name)}" target="_blank" rel="noopener">${esc(r.name)}</a></small>`, 'nw')}
				${td(T('Salesperson'), esc(r.requested_by_name || r.requested_by))}
				${td(T('Document'), `${esc(T((DOC_INFO[r.document_type] || {}).label || r.document_type))}${r.letterheads ? '<br><small>' + esc(r.letterheads) + '</small>' : ''}`)}
				${td(T('Period'), esc(period(r)), 'nw')}
				${td(T('Status'), badge(r.status))}
				${td(T('Difference'), money(r.difference), 'n' + (Math.abs(r.difference) > 1 ? ' soa-neg' : ''))}
				${td(T('Reviewed'), `${r.reviewed_by ? esc(r.reviewed_by.split('@')[0]) + '<br><small>' + esc(fdate(r.reviewed_on)) + '</small>' : '<small>' + esc(r.status === 'Sent' ? T('auto') : '—') + '</small>'}${r.review_note ? '<br><small>' + esc(r.review_note) + '</small>' : ''}`, 'c-opt')}
				${td(T('Files'), r.document_type === 'Customer Outstanding' ? (r.status === 'Approved' ? `<b>${money(r.invoice_outstanding)}</b>` : '<small>—</small>') : `<div class="soa-files">${fileLinks(r.files) || '<small>—</small>'}</div>`)}</tr>`).join('')}</tbody></table></div>`;
	}

	// ------------------------------------------------------------ files sent
	function renderFiles() {
		const files = M.files || [];
		const q = M.fq.trim().toLowerCase();
		const rows = files.filter((f) => !q || (f.customer_name + ' ' + f.customer + ' ' + f.file_name + ' ' + f.requested_by + ' ' + f.request).toLowerCase().includes(q));
		$root.querySelector('[data-c="files"]').textContent = T('{0} files', rows.length);
		const el = $root.querySelector('.soa-flog');
		if (M.errs && M.errs.files) { el.innerHTML = errBox('Could not load the files', M.errs.files); return; }
		if (!M.files) return;
		if (!rows.length) { el.innerHTML = `<div class="soa-empty">${esc(T(files.length ? 'Nothing matches this search' : 'No files sent yet'))}</div>`; return; }
		el.innerHTML = `<div class="soa-scroll"><table class="soa-t soa-stack"><thead><tr><th>${esc(T('Customer'))}</th><th>${esc(T('Sent'))}</th><th>${esc(T('File'))}</th><th class="c-opt">${esc(T('Letterhead'))}</th><th>${esc(T('Document'))}</th><th>${esc(T('Period'))}</th><th>${esc(T('Sent to'))}</th><th class="n">${esc(T('Amount'))}</th><th class="c-opt">${esc(T('How'))}</th></tr></thead><tbody>${rows.map((f) => `
			<tr>${td(T('Customer'), `<b>${esc(f.customer_name)}</b><br><small>${esc(f.customer)}</small>`, 'lead')}
				${td(T('Sent'), `${esc(fdate(f.sent_on))} <small>${esc(ftime(f.sent_on))}</small>`, 'nw')}
				${td(T('File'), `<a class="soa-file" href="${esc(f.file_url)}" target="_blank" rel="noopener">${ico('dl')}${esc(f.file_name)}</a>`)}
				${td(T('Letterhead'), `${brandChip(f.brand)}<br><small>${esc(f.letter_head)}</small>`, 'c-opt')}
				${td(T('Document'), esc(T((DOC_INFO[f.document_type] || {}).label || f.document_type)))}
				${td(T('Period'), esc(period(f)), 'nw')}
				${td(T('Sent to'), esc(f.requested_by))}
				${td(T('Amount'), money(f.amount), 'n')}
				${td(T('How'), f.status === 'Sent' ? `<span class="soa-b green">${esc(T('auto-matched'))}</span>` : `<span class="soa-b blue">${esc(T('approved'))}</span>`, 'c-opt')}</tr>`).join('')}</tbody></table></div>`;
	}


	// ------------------------------------------------------------ collections
	const RESULT = { 'Collected': 'green', 'Part collected': 'blue', 'Promised': 'amber', 'Not reachable': 'grey', 'Refused': 'red' };
	const resBadge = (r) => (r ? `<span class="soa-b ${RESULT[r] || 'grey'}">${esc(T(r))}</span>` : '');
	function loadColl(quiet) {
		const C = M.coll;
		const args = C.date ? { date: C.date } : {};
		return Promise.all([C.admin && quiet ? Promise.resolve(C.admin) : api('coll_admin'), api('coll_lists', args)]).then((r) => {
			C.admin = r[0]; C.data = r[1]; C.err = '';
			if (!C.date) C.date = C.data.date;
			renderColl();
		}).catch((e) => { C.err = errText(e); if (!quiet || !C.data) renderColl(); });
	}
	function collCall(method, args, msg) {
		const C = M.coll;
		C.busy.all = true; renderColl();
		return api(method, args).then(() => { C.busy = {}; if (msg) toast(msg, 'ok'); return loadColl(); })
			.catch((e) => { C.busy = {}; renderColl(); toast(errText(e), 'bad'); });
	}
	function saveAssign(col) {
		const C = M.coll;
		const sel = {};
		((C.admin.assignments || {})[col] || []).forEach((sp) => { sel[sp] = true; });
		Object.assign(sel, C.sel[col] || {});
		const sps = Object.keys(sel).filter((k) => sel[k]);
		C.busy['a:' + col] = true; renderColl();
		const mx = (C.max || {})[col];
		const args = { collector: col, sales_persons: JSON.stringify(sps) };
		if (mx != null) args.max_customers = mx === '' ? 0 : mx;
		api('coll_assign', args).then((r) => {
			C.busy = {}; C.admin.assignments = r.assignments; C.sel[col] = {};
			if (r.collectors) C.admin.collectors = r.collectors;
			if (C.max) delete C.max[col];
			toast(T('Saved. Tomorrow’s list uses these salespeople; rebuild today’s lists to apply it now.'), 'ok');
			renderColl();
		}).catch((e) => { C.busy = {}; renderColl(); toast(errText(e), 'bad'); });
	}
	function renderColl() {
		const el = $root.querySelector('.soa-coll');
		const C = M.coll;
		if (C.err && !C.data) { el.innerHTML = `<div class="soa-card">${errBox('Could not load collections', C.err)}</div>`; return; }
		if (!C.data || !C.admin) return;
		const d = C.data, ad = C.admin;
		const lists = d.lists || [];
		const drafts = lists.filter((l) => l.status === 'Draft');
		const cnt = $root.querySelector('[data-c="coll"]');
		cnt.textContent = drafts.length; cnt.classList.toggle('hot', drafts.length > 0);
		const sum = (k) => lists.reduce((a, l) => a + (l[k] || 0), 0);
		const isToday = d.date === d.today;
		const busy = C.busy.all ? 'disabled' : '';
		const bar = `<section class="soa-card soa-cbar">
			<label class="soa-cdate">${esc(T('Day'))}<input class="soa-in" type="date" data-f="cdate" value="${esc(d.date)}" max="${esc(d.today)}"></label>
			<div class="soa-cdays">${(d.history || []).slice(0, 7).map((h) => `<button type="button" class="soa-chipbtn ${h.date === d.date ? 'on' : ''}" data-day="${esc(h.date)}">${esc(fdate(h.date))}</button>`).join('')}</div>
			<div class="soa-cbtns">
				<button type="button" class="soa-btn sm" data-a="cassign" aria-expanded="${C.assign}">${ico('users').replace('<svg', '<svg style="width:14px;height:14px"')} ${esc(T(C.assign ? 'Hide assignments' : 'Assign salespeople'))}</button>
				${isToday ? `<button type="button" class="soa-btn sm" data-a="cbuild" ${busy} title="${esc(T('Rebuild the lists that are not approved yet, from today’s Accounts Receivable'))}">↻ ${esc(T('Rebuild today’s lists'))}</button>` : ''}
				${drafts.length ? `<button type="button" class="soa-btn sm ok" data-a="capprove-all" ${busy}>${C.busy.all ? '<span class="soa-spin"></span>' : ico('ok').replace('<svg', '<svg style="width:14px;height:14px"')} ${esc(T('Approve all ({0})', drafts.length))}</button>` : ''}
			</div></section>`;
		const stats = `<div class="soa-cstats">
			<div class="soa-card"><small>${esc(T('Waiting for approval'))}</small><b class="${drafts.length ? 'amber' : ''}">${drafts.length}</b><span>${esc(T('{0} lists', lists.length))}</span></div>
			<div class="soa-card"><small>${esc(T('To collect ({0}+ days)', ad.collect_after_days))}</small><b>${money0(sum('total_due'))}</b><span>${esc(T('{0} customers', sum('customers')))}</span></div>
			<div class="soa-card"><small>${esc(T('Collected'))}</small><b class="green">${money0(sum('total_collected'))}</b><span>${esc(T('logged by collectors'))}</span></div>
			<div class="soa-card"><small>${esc(T('Customers visited'))}</small><b>${lists.reduce((a, l) => a + (l.done || 0), 0)}</b><span>${esc(T('with a result logged'))}</span></div></div>`;
		let body;
		if (!(ad.collectors || []).length) { C.assign = true; body = ''; }
		if (body === '') { /* the assignment panel above explains what to do */ } else if (!lists.length) body = `<div class="soa-card">${errBox(isToday ? 'No lists for today' : 'No lists for this day', T(Object.keys(ad.assignments || {}).length ? 'No assigned customer has a balance older than {0} days.' : 'Assign salespeople to the collectors first.', ad.collect_after_days))}</div>`;
		else body = lists.map(listCard).join('');
		el.innerHTML = bar + (C.assign ? assignHtml() : '') + stats + body;
	}
	function listCard(l) {
		const C = M.coll;
		const draft = l.status === 'Draft';
		const busy = C.busy.all ? 'disabled' : '';
		const rows = (l.items || []).map((it) => {
			const inv = (it.invoices || []).slice(0, 6).map((v) => `${esc(v.voucher)} · ${money0(v.amount)} · ${esc(T('{0} d', v.days))}`).join('<br>');
			const res = it.result
				? `${resBadge(it.result)}${it.collected_amount ? ' <b>' + money(it.collected_amount) + '</b>' : ''}${it.promise_date ? '<br><small>' + esc(T('promised {0}', fdate(it.promise_date))) + '</small>' : ''}${it.payment_mode ? '<br><small>' + esc(T(it.payment_mode)) + '</small>' : ''}${it.note ? '<br><small>' + esc(it.note) + '</small>' : ''}`
				: '<small>—</small>';
			return `<tr class="${it.removed ? 'soa-off' : ''}">${td(T('Customer'), `<b>${esc(it.customer_name)}</b><br><small><a href="/app/customer/${encodeURIComponent(it.customer)}" target="_blank" rel="noopener">${esc(it.customer)}</a> · ${esc(it.sales_person)}</small>${it.removed ? '<br><small class="soa-neg">' + esc(T('removed from this list')) + '</small>' : ''}`, 'lead')}
				${td(T('To collect'), `<b>${money(it.due_amount)}</b><br><small>${esc(T('since {0}', fdate(it.oldest_date)))}</small>`, 'n')}
				${td(T('Total outstanding'), money(it.total_outstanding), 'n c-opt')}
				${td(T('Invoices'), `<small>${inv}${(it.invoices || []).length > 6 ? '<br>' + esc(T('+{0} more', it.invoices.length - 6)) : ''}</small>`, 'c-opt')}
				${td(T('Last update'), it.last_update ? `<small>${esc(it.last_update)}</small>` : '<small>—</small>')}
				${td(T('Result'), res)}
				${draft ? td('', `<button type="button" class="soa-btn sm ${it.removed ? '' : 'bad'}" data-a="cremove" data-list="${esc(l.name)}" data-item="${esc(it.name)}" data-removed="${it.removed ? 0 : 1}" ${busy}>${esc(T(it.removed ? 'Put back' : 'Remove'))}</button>`) : ''}</tr>`;
		}).join('');
		return `<details class="soa-card soa-cl" ${draft ? 'open' : ''}>
			<summary class="soa-cl-h"><span class="soa-cl-who"><i>${esc(initials(l.collector_name))}</i><span><b>${esc(l.collector_name)}</b><small>${esc(T('{0} customers', l.customers))} · ${esc(T('{0} visited', l.done || 0))}${l.skipped ? ` · <span class="soa-skip">${esc(T('+{0} over the daily max', l.skipped))}</span>` : ''}</small></span></span>
				<span class="soa-cl-n"><small>${esc(T('To collect'))}</small><b>${money0(l.total_due)}</b></span>
				<span class="soa-cl-n"><small>${esc(T('Collected'))}</small><b class="green">${money0(l.total_collected)}</b></span>
				<span class="soa-cl-st">${draft ? `<span class="soa-b amber">${esc(T('Waiting for approval'))}</span>` : `<span class="soa-b green">${esc(T('Approved'))}</span><small>${esc(T('by {0}', String(l.approved_by || '').split('@')[0]))}</small>`}</span>
				${draft ? `<button type="button" class="soa-btn sm ok" data-a="capprove" data-list="${esc(l.name)}" ${busy}>${esc(T('Approve list'))}</button>` : ''}</summary>
			${(l.items || []).length ? `<div class="soa-scroll"><table class="soa-t soa-stack"><thead><tr><th>${esc(T('Customer'))}</th><th class="n">${esc(T('To collect'))}</th><th class="n c-opt">${esc(T('Total outstanding'))}</th><th class="c-opt">${esc(T('Invoices'))}</th><th>${esc(T('Last update'))}</th><th>${esc(T('Result'))}</th>${draft ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>` : errBox('Nothing to collect', '')}
		</details>`;
	}
	function assignHtml() {
		const C = M.coll, ad = C.admin;
		const nameOf = {};
		(ad.collectors || []).forEach((x) => { nameOf[x.user] = x.full_name; });
		const owner = {};
		Object.keys(ad.assignments || {}).forEach((col) => (ad.assignments[col] || []).forEach((sp) => { (owner[sp] = owner[sp] || []).push(nameOf[col] || col); }));
		const taken = {};
		(ad.collectors || []).forEach((x) => { taken[x.employee] = 1; taken[x.user] = 1; });
		const emps = (ad.employees || []).filter((e) => !taken[e.employee] && !(e.user && taken[e.user]));
		return `<section class="soa-card soa-assign">
			<div class="soa-card-h"><h3 class="soa-card-t">${esc(T('Collectors and their salespeople'))}</h3>
				<span class="soa-card-s">${esc(ad.customer_field ? T('Customers follow the “{0}” field on the Customer form.', ad.customer_field) : T('No sales person field found on Customer, so the sales person on invoices is used.'))}</span></div>
			<div class="soa-addcol">
				<select class="soa-sel" data-f="cemp"><option value="">${esc(T('Add a collector from employees…'))}</option>${emps.map((e) => `<option value="${esc(e.employee)}" ${e.user ? '' : 'disabled'} ${C.emp === e.employee ? 'selected' : ''}>${esc(e.name)}${e.designation ? ' · ' + esc(e.designation) : ''}${e.user ? '' : ' · ' + esc(T('no login'))}</option>`).join('')}</select>
				<button type="button" class="soa-btn sm pri" data-a="caddcol" ${C.emp && !C.busy.all ? '' : 'disabled'}>${esc(T('Add collector'))}</button>
			</div>
			${(ad.collectors || []).length ? '' : `<div class="soa-empty">${esc(T('No collectors yet. Pick the employees who collect; they need a User ID on their Employee form to log in.'))}</div>`}
			<div class="soa-assign-g">${(ad.collectors || []).map((x) => {
				const mine = (ad.assignments || {})[x.user] || [];
				const sel = C.sel[x.user] || {};
				const rm = C.rm === x.employee;
				return `<div class="soa-assign-c"><div class="soa-assign-top"><span><b>${esc(x.full_name)}</b><small>${esc(x.user)} · ${esc(T('{0} salespeople', mine.length))}${x.max_customers ? ' · ' + esc(T('max {0} a day', x.max_customers)) : ''}</small></span>
						<button type="button" class="soa-btn sm bad" data-a="crmcol" data-emp="${esc(x.employee)}">${esc(T(rm ? 'Confirm remove' : 'Remove'))}</button></div>
					<div class="soa-assign-l">${(ad.sales_persons || []).map((sp) => {
						const on = sel[sp] != null ? sel[sp] : mine.indexOf(sp) >= 0;
						const other = mine.indexOf(sp) < 0 && owner[sp] ? owner[sp].join(', ') : '';
						return `<label class="soa-chk-row"><input type="checkbox" data-f="csp" data-col="${esc(x.user)}" value="${esc(sp)}" ${on ? 'checked' : ''}><span>${esc(sp)}${other ? `<small> · ${esc(other)}</small>` : ''}</span></label>`;
					}).join('')}</div>
					<div class="soa-assign-f"><label>${esc(T('Max customers a day'))}<input class="soa-in" type="number" min="0" step="1" inputmode="numeric" data-f="cmax" data-col="${esc(x.user)}" value="${esc((C.max || {})[x.user] != null ? C.max[x.user] : (x.max_customers || ''))}" placeholder="${esc(T('No limit'))}"></label>
					<button type="button" class="soa-btn sm pri" data-a="csave" data-col="${esc(x.user)}" ${C.busy['a:' + x.user] ? 'disabled' : ''}>${esc(T('Save'))}</button></div></div>`;
			}).join('')}</div></section>`;
	}
	function collectorOp(emp, op) {
		const C = M.coll;
		C.busy.all = true; renderColl();
		api('coll_collectors', { employee: emp, op: op }).then((r) => {
			C.busy = {}; C.emp = ''; C.rm = '';
			C.admin.collectors = r.collectors; C.admin.assignments = r.assignments;
			toast(T(op === 'remove' ? 'Collector removed' : 'Collector added. Now tick their salespeople and save.'), 'ok');
			renderColl();
		}).catch((e) => { C.busy = {}; renderColl(); toast(errText(e), 'bad'); });
	}

	build();
})();
