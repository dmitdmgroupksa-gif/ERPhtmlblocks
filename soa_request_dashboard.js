/* DM SOA Request dashboard v5 — sales team: Outstanding SOA, Customer Ledger or Customer Outstanding. Every request is approved by Azrah.
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

	// ------------------------------------------------------------ Sales: SOA Request dashboard
	const S = {
		tab: store.get('soa_s_tab', 'new'), boot: null, q: '', sort: 'out', sel: null,
		dt: store.get('soa_s_dt', 'Outstanding SOA'), from: '', to: '',
		preview: null, pvBusy: false, pvErr: '', pvSeq: 0, busy: false, result: null,
		reqs: null, filter: 'all', lq: '',
	};
	let $root = null, mo = null, timer = null;

	const isSoa = () => S.dt === 'Outstanding SOA';
	const isOut = () => S.dt === 'Customer Outstanding';
	const asOf = () => isSoa() || isOut();
	function defaultDates() {
		const t = pd(S.boot ? S.boot.today : iso(new Date()));
		if (!S.to) S.to = iso(t);
		if (!S.from) S.from = iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 2, 1, 12)));
	}

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
					<button type="button" class="soa-tab" data-tab="new" role="tab">${esc(T('New request'))}</button>
					<button type="button" class="soa-tab" data-tab="log" role="tab">${esc(T('My requests'))} <span class="soa-cnt" data-c="log">0</span></button>
				</div>
				<div class="soa-side"><span class="soa-me"><i></i><span></span></span>
					<button type="button" class="soa-ibtn" data-a="refresh" title="${esc(T('Refresh'))}">↻</button>
					<button type="button" class="soa-lang" data-a="lang" title="${esc(T('Switch language'))}">${rtl ? 'English' : 'العربية'}</button></div>
			</div>
			<div class="soa-warnbar" hidden></div>
			<div class="soa-pane" data-pane="new">
				<div class="soa-split">
					<section class="soa-card">
						<div class="soa-card-h"><h3 class="soa-card-t">${esc(T('Your customers'))}</h3><span class="soa-card-s" data-c="cust"></span></div>
						<div class="soa-search"><input class="soa-in" type="search" data-f="q" placeholder="${esc(T('Search name or code'))}" aria-label="${esc(T('Search name or code'))}">
							<select class="soa-sel" data-f="sort" aria-label="${esc(T('Sort'))}">
								<option value="out">${esc(T('Highest balance'))}</option><option value="name">${esc(T('Name A–Z'))}</option><option value="recent">${esc(T('Latest invoice'))}</option></select></div>
						<div class="soa-clist"><div class="soa-skel"></div></div>
					</section>
					<section class="soa-card soa-form"></section>
				</div>
			</div>
			<div class="soa-pane" data-pane="log">
				<div class="soa-kpis"></div>
				<section class="soa-card">
					<div class="soa-card-h"><h3 class="soa-card-t">${esc(T('Request log'))}</h3><span class="soa-card-s">${esc(T('Approved statements are emailed to you, with finance in copy'))}</span></div>
					<div class="soa-tools"><div class="soa-pres" data-f="filter"></div><input class="soa-in" type="search" data-f="lq" placeholder="${esc(T('Search customer or request'))}"></div>
					<div class="soa-log"><div class="soa-skel"></div></div>
				</section>
			</div>`;
		ROOT.appendChild(wrap);
		$root = wrap;
		mo = themeWatch(wrap);
		bind();
		switchTab(S.tab);
		if (S.boot) { paintBoot(); renderCustomers(); renderForm(); } else loadBoot();
		if (S.reqs) renderLog(); else loadLog();
		timer = setInterval(() => {
			if (!wrap.isConnected) { clearInterval(timer); return; }
			if (!document.hidden && S.reqs && S.reqs.some((r) => r.status === 'Needs Review' || r.status === 'Processing')) loadLog();
		}, 90 * 1000);
	}

	function bind() {
		$root.addEventListener('click', (e) => {
			const t = e.target.closest('[data-tab],[data-a],[data-c-id],[data-dt],[data-flt]');
			if (!t) return;
			if (t.dataset.tab) return switchTab(t.dataset.tab);
			if (t.dataset.cId != null) return pick(t.dataset.cId);
			if (t.dataset.dt) { S.dt = t.dataset.dt; store.set('soa_s_dt', S.dt); S.result = null; renderForm(); return loadPreview(); }
			if (t.dataset.flt) { S.filter = t.dataset.flt; return renderLog(); }
			const a = t.dataset.a;
			if (a === 'lang') return setLang(LANG === 'ar' ? 'en' : 'ar', build);
			if (a === 'refresh') { loadBoot(); return loadLog(); }
			if (a === 'submit') return submit();
			if (a === 'again') { S.result = null; return renderForm(); }
			if (a === 'golog') return switchTab('log');
		});
		$root.addEventListener('input', (e) => {
			const f = e.target.dataset.f;
			if (f === 'q') { S.q = e.target.value; renderCustomers(); }
			if (f === 'lq') { S.lq = e.target.value; renderLog(); }
		});
		$root.addEventListener('change', (e) => {
			const f = e.target.dataset.f;
			if (f === 'sort') { S.sort = e.target.value; renderCustomers(); }
			if (f === 'from' || f === 'to') { S[f] = e.target.value; S.result = null; renderForm(); loadPreview(); }
		});
	}

	function switchTab(id) {
		S.tab = id; store.set('soa_s_tab', id);
		$root.querySelectorAll('.soa-tab').forEach((b) => { b.classList.toggle('on', b.dataset.tab === id); b.setAttribute('aria-selected', b.dataset.tab === id); });
		$root.querySelectorAll('.soa-pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === id));
	}

	// ------------------------------------------------------------ data
	function loadBoot() {
		return api('bootstrap').then((b) => {
			S.boot = b;
			if (!DOC_INFO[S.dt]) S.dt = 'Outstanding SOA';
			defaultDates();
			if (S.sel && !b.customers.some((c) => c.customer === S.sel)) S.sel = null;
			paintBoot(); renderCustomers(); renderForm();
		}).catch((e) => {
			$root.querySelector('.soa-clist').innerHTML = `<div class="soa-empty"><b>${esc(T('Could not load your customers'))}</b>${esc(errText(e))}</div>`;
		});
	}
	function loadLog() {
		return api('list', { scope: 'mine', limit: 300 }).then((r) => { S.reqs = r.requests || []; renderLog(); }).catch((e) => {
			$root.querySelector('.soa-log').innerHTML = `<div class="soa-empty"><b>${esc(T('Could not load your requests'))}</b>${esc(errText(e))}</div>`;
		});
	}
	function loadPreview() {
		if (isOut()) { S.preview = null; S.pvBusy = false; S.pvErr = ''; renderPreview(); return; }   // amount only after Azrah approves
		if (!S.sel || !S.to || (!isSoa() && (!S.from || S.from > S.to))) return;
		const seq = ++S.pvSeq;
		S.pvBusy = true; S.pvErr = ''; renderPreview();
		api('preview', reqArgs()).then((p) => {
			if (seq !== S.pvSeq) return;
			S.preview = p; S.pvBusy = false; renderPreview();
		}).catch((e) => { if (seq !== S.pvSeq) return; S.pvBusy = false; S.preview = null; S.pvErr = errText(e); renderPreview(); });
	}

	function reqArgs() {
		const a = { customer: S.sel, document_type: S.dt, to_date: S.to };
		if (!asOf()) a.from_date = S.from;
		return a;
	}

	function paintBoot() {
		const b = S.boot;
		$root.querySelector('.soa-me i').textContent = initials(b.full_name);
		$root.querySelector('.soa-me span').textContent = b.full_name || b.user;
		const w = $root.querySelector('.soa-warnbar');
		const msgs = [];
		if (b.warning) msgs.push(T('No Sales Person is linked to your user. Ask the admin to link your Employee to your Sales Person.'));
		if (b.no_manager) msgs.push(T('Azrah’s login is not set in the dashboard settings (manager_user), so requests that need review stay with you.'));
		w.hidden = !msgs.length;
		w.textContent = msgs.join(' ');
		$root.querySelector('[data-c="cust"]').textContent = T('{0} customers', b.customers.length);
	}

	// ------------------------------------------------------------ customers
	function renderCustomers() {
		if (!S.boot) return;
		const q = S.q.trim().toLowerCase();
		let list = S.boot.customers.filter((c) => !q || (c.customer_name + ' ' + c.customer).toLowerCase().includes(q));
		if (S.sort === 'name') list = list.slice().sort((a, b) => a.customer_name.localeCompare(b.customer_name));
		if (S.sort === 'recent') list = list.slice().sort((a, b) => String(b.last_invoice).localeCompare(String(a.last_invoice)));
		const el = $root.querySelector('.soa-clist');
		if (!S.boot.customers.length) { el.innerHTML = `<div class="soa-empty"><b>${esc(T('No customers yet'))}</b>${esc(T('Customers appear here once a sales invoice carries your name as sales person.'))}</div>`; return; }
		if (!list.length) { el.innerHTML = `<div class="soa-empty">${esc(T('No customer matches “{0}”', S.q))}</div>`; return; }
		el.innerHTML = list.slice(0, 400).map((c) => `
			<button type="button" class="soa-c ${c.customer === S.sel ? 'on' : ''}" data-c-id="${esc(c.customer)}">
				<span class="soa-c-n">${esc(c.customer_name)}</span><span class="soa-c-a">${money(c.outstanding)}</span>
				<span class="soa-c-m">${esc(c.customer)} · ${esc(T('{0} invoices', c.invoices))}${c.last_invoice ? ' · ' + esc(fdate(c.last_invoice)) : ''}</span>
			</button>`).join('');
	}
	function pick(id) {
		S.sel = id; S.preview = null; S.result = null;
		renderCustomers(); renderForm(); loadPreview();
		const f = $root.querySelector('.soa-form');
		if (f && f.getBoundingClientRect().top > window.innerHeight) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// ------------------------------------------------------------ request form
	function renderForm() {
		const el = $root.querySelector('.soa-form');
		if (!S.boot) { el.innerHTML = '<div class="soa-skel"></div>'; return; }
		const c = S.sel && S.boot.customers.find((x) => x.customer === S.sel);
		if (!c) {
			el.innerHTML = `<div class="soa-empty" style="padding:70px 20px">${ico('users').replace('<svg', '<svg style="width:34px;height:34px;color:var(--royal);margin-bottom:8px"')}<b>${esc(T('Pick a customer to start'))}</b>${esc(T('Choose from your customers on the left, then the document and the period.'))}</div>`;
			return;
		}
		if (S.result) { el.innerHTML = head(c) + resultHtml(S.result); return; }
		const opts = Object.keys(DOC_INFO).map((k) => {
			const d = DOC_INFO[k];
			return `<button type="button" class="soa-opt ${S.dt === k ? 'on' : ''}" data-dt="${esc(k)}" aria-pressed="${S.dt === k}">${ico(d.icon)}<b>${esc(T(d.label))}</b><span>${esc(T(d.desc))}</span></button>`;
		}).join('');
		const soa = asOf();
		const bad = !soa && S.from > S.to;
		const dates = soa
			? `<label>${esc(T('As of'))}<input class="soa-in" type="date" data-f="to" value="${esc(S.to)}" max="${esc(S.boot.today)}"></label>`
			: `<label>${esc(T('From'))}<input class="soa-in" type="date" data-f="from" value="${esc(S.from)}" max="${esc(S.boot.today)}"></label>
				<label>${esc(T('To'))}<input class="soa-in" type="date" data-f="to" value="${esc(S.to)}" max="${esc(S.boot.today)}"></label>`;
		el.innerHTML = head(c) + `
			<div class="soa-step"><p class="soa-step-t">${esc(T('Document'))}</p><div class="soa-opts">${opts}</div></div>
			<div class="soa-step"><p class="soa-step-t">${esc(T(soa ? 'Statement date' : 'Period'))}</p>
				<div class="soa-dates">${dates}</div>
				${isSoa() ? `<p class="soa-hint">${esc(T('Shows every open invoice up to this date.'))}</p>` : ''}
				${isOut() ? `<p class="soa-hint">${esc(T('Azrah checks the amount and approves it; it then shows in My requests with the ageing.'))}</p>` : ''}
				${bad ? `<div class="soa-res bad" style="margin:10px 0 0">${esc(T('The start date is after the end date.'))}</div>` : ''}</div>
			<div class="soa-chk"></div>
			<div class="soa-act">${limitHtml()}<button type="button" class="soa-btn pri" data-a="submit" ${S.busy || bad || left() === 0 ? 'disabled' : ''}>${S.busy ? '<span class="soa-spin"></span> ' + esc(T('Preparing…')) : ico('send').replace('<svg', '<svg style="width:15px;height:15px"') + ' ' + esc(T('Request {0}', T(DOC_INFO[S.dt].label)))}</button></div>`;
		renderPreview();
	}
	// requests left today (salespeople get CFG daily_limit a day; 0 = no limit)
	const left = () => (S.boot && S.boot.daily_limit ? Math.max(0, S.boot.daily_limit - (S.boot.used_today || 0)) : null);
	function limitHtml() {
		const l = left();
		if (l === null) return '';
		return `<span class="soa-left ${l === 0 ? 'none' : ''}">${esc(l === 0 ? T('You have used your {0} requests for today', S.boot.daily_limit) : T('{0} of {1} requests left today', l, S.boot.daily_limit))}</span>`;
	}
	function head(c) {
		return `<div class="soa-sel-h"><div><h3>${esc(c.customer_name)}</h3><div class="soa-c-m">${esc(c.customer)} · ${esc(T('{0} invoices', c.invoices))}</div></div>
			<div class="soa-bal"><small class="soa-card-s">${esc(T('Open balance (SAR)'))}</small><b>${money(c.outstanding)}</b></div></div>`;
	}
	function renderPreview() {
		const ck = $root.querySelector('.soa-chk');
		if (!ck) return;
		if (S.pvBusy) { ck.innerHTML = `<div class="soa-check"><span class="soa-spin"></span><span>${esc(T('Checking the balance…'))}</span></div>`; return; }
		if (S.pvErr) { ck.innerHTML = `<div class="soa-res bad">${esc(S.pvErr)}</div>`; return; }
		const hint = $root.querySelector('.soa-hint');
		if (hint && S.preview && S.preview.from_date && isSoa()) hint.textContent = T('Starts from {0}, the year of the oldest open invoice.', fdate(S.preview.from_date));
		const k = S.preview && S.preview.check;
		if (!k || isOut()) { ck.innerHTML = ''; return; }
		const gl = isSoa() ? '' : ' ' + T('Debit, credit and closing balance are also checked against the General Ledger.');
		ck.innerHTML = k.matched
			? `<div class="soa-check ok">${ico('ok')}<span>${esc(T('The balance agrees with Accounts Receivable ({0}).', money(k.invoice_outstanding)) + gl)}</span></div>`
			: `<div class="soa-check warn">${ico('warn')}<span>${esc(T('Expected balance ({0}) and Accounts Receivable ({1}) differ by {2} SAR. Azrah checks it before it is sent to you.', money(k.ledger_balance), money(k.invoice_outstanding), money(Math.abs(k.difference))))}</span></div>`;
	}
	function submit() {
		if (S.busy) return;
		S.busy = true; renderForm();
		api('create', reqArgs()).then((r) => {
			S.busy = false; S.result = r;
			if (S.boot && r.status !== 'Failed') S.boot.used_today = (S.boot.used_today || 0) + 1;
			renderForm();
			if (S.reqs) { S.reqs.unshift(r); renderLog(); }
			toast(r.status === 'Sent' ? T('Statement ready') : r.status === 'Needs Review' ? T('Sent to Azrah for review') : T('Request failed'), r.status === 'Sent' ? 'ok' : r.status === 'Failed' ? 'bad' : '');
		}).catch((e) => { S.busy = false; renderForm(); toast(errText(e), 'bad'); });
	}
	function resultHtml(r) {
		let box;
		if (r.status === 'Sent') {
			box = `<div class="soa-res ok"><b>${esc(T('Ready'))}</b>${esc(T('Download below. It is also kept in My requests.'))}<div class="soa-files" style="margin-top:8px">${fileLinks(r.files, T('Download PDF'))}</div></div>`;
		} else if (r.status === 'Needs Review') {
			box = `<div class="soa-res warn"><b>${esc(T('Sent to Azrah for review'))}</b>${esc(T('Azrah checks every request. Once she approves it, it is emailed to you with finance in copy.'))}</div>`;
		} else {
			box = `<div class="soa-res bad"><b>${esc(T('The statement could not be made'))}</b>${esc(r.error || '')}</div>`;
		}
		return `<div style="padding-top:10px">${box}</div><div class="soa-act"><button type="button" class="soa-btn" data-a="golog">${esc(T('Open My requests'))}</button><button type="button" class="soa-btn pri" data-a="again">${esc(T('New request for this customer'))}</button></div>`;
	}

	// ------------------------------------------------------------ log
	const FILTERS = [['all', 'All'], ['ready', 'Emailed'], ['review', 'With Azrah'], ['rejected', 'Rejected / failed']];
	const inFilter = (r, f) => f === 'all' || (f === 'ready' && (r.status === 'Sent' || r.status === 'Approved')) || (f === 'review' && (r.status === 'Needs Review' || r.status === 'Processing')) || (f === 'rejected' && (r.status === 'Rejected' || r.status === 'Failed'));
	function renderLog() {
		const reqs = S.reqs || [];
		const month = (S.boot ? S.boot.today : iso(new Date())).slice(0, 7);
		const n = (f) => reqs.filter((r) => inFilter(r, f)).length;
		$root.querySelector('[data-c="log"]').textContent = reqs.length;
		const cnt = $root.querySelector('[data-c="log"]');
		cnt.classList.toggle('hot', n('review') > 0);
		cnt.textContent = n('review') > 0 ? n('review') : reqs.length;
		$root.querySelector('.soa-kpis').innerHTML = [
			['', 'stack', T('Requests this month'), reqs.filter((r) => String(r.creation).slice(0, 7) === month).length, T('{0} all time', reqs.length)],
			['green', 'ok', T('Emailed to you'), n('ready'), T('approved by Azrah')],
			['amber', 'clock', T('With Azrah'), n('review'), T('waiting for her approval')],
			['red', 'x', T('Rejected / failed'), n('rejected'), T('see the note in the log')],
		].map((k) => `<div class="soa-card soa-kpi ${k[0]}"><div class="soa-kpi-i">${ico(k[1])}</div><div class="soa-kpi-l">${esc(k[2])}</div><div class="soa-kpi-v">${k[3]}</div><div class="soa-kpi-s">${esc(k[4])}</div></div>`).join('');
		$root.querySelector('[data-f="filter"]').innerHTML = FILTERS.map((f) => `<button type="button" class="soa-chipbtn ${S.filter === f[0] ? 'on' : ''}" data-flt="${f[0]}">${esc(T(f[1]))} · ${n(f[0])}</button>`).join('');
		const q = S.lq.trim().toLowerCase();
		const rows = reqs.filter((r) => inFilter(r, S.filter) && (!q || (r.customer_name + ' ' + r.customer + ' ' + r.name).toLowerCase().includes(q)));
		const el = $root.querySelector('.soa-log');
		if (!S.reqs) return;
		if (!rows.length) { el.innerHTML = `<div class="soa-empty"><b>${esc(T(reqs.length ? 'Nothing matches this filter' : 'No requests yet'))}</b>${reqs.length ? '' : esc(T('Your requests and their files will be listed here.'))}</div>`; return; }
		el.innerHTML = `<div class="soa-scroll"><table class="soa-t soa-stack"><thead><tr><th>${esc(T('Customer'))}</th><th>${esc(T('Requested'))}</th><th>${esc(T('Document'))}</th><th>${esc(T('Period'))}</th><th>${esc(T('Status'))}</th><th>${esc(T('Result'))}</th></tr></thead><tbody>${rows.map((r) => `
			<tr>${td(T('Customer'), `<b>${esc(r.customer_name)}</b><br><small>${esc(r.customer)}</small>`, 'lead')}
				${td(T('Requested'), `${esc(fdate(r.creation))} <small>${esc(ftime(r.creation))}</small><br><small class="soa-vno">${esc(r.name)}</small>`, 'nw')}
				${td(T('Document'), esc(T((DOC_INFO[r.document_type] || {}).label || r.document_type)))}
				${td(T('Period'), esc(period(r)), 'nw')}
				${td(T('Status'), `${badge(r.status)}${r.review_note ? '<br><small>' + esc(r.review_note) + '</small>' : ''}${r.status === 'Failed' && r.error ? '<br><small>' + esc(r.error) + '</small>' : ''}`)}
				${td(T('Result'), `${r.document_type === 'Customer Outstanding' ? ((r.status === 'Approved' || r.status === 'Sent') && agLine(r.ageing) || '<small>—</small>') : ((r.status === 'Approved' || r.status === 'Sent') ? `<span class="soa-mailed">${ico('send')}${esc(T('Emailed'))}</span>` : '<small>—</small>')}${r.sent_on && (r.status === 'Approved' || r.status === 'Sent') ? '<br><small>' + esc(T('approved {0}', ago(r.sent_on))) + '</small>' : ''}`)}</tr>`).join('')}</tbody></table></div>`;
	}

	build();
})();
