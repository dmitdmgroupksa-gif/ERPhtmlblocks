/* DM Operations Dashboard v4 — Custom HTML Block (Script field). Uses `root_element` (shadow root) provided by Frappe.
 * Tabs: Overview | Delivery & Fleet | Warehouse & Forklift | Production | Supply & Stock
 * v4: royal-blue top bar, English / Arabic (RTL) switch (button in the bar, remembered in this browser).
 * Speed: request cache + de-dupe, lazy (viewport) panel rendering, idle prefetch, trimmed fields, no chart animation.
 */
(function () {
	'use strict';

	// ---------------------------------------------------------------- language (English / Arabic)
	const LANG_KEY = 'dmo_lang';
	let LANG = 'en';
	try { LANG = localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch (_) { /* ignore */ }
	const _fr = window.__; // Frappe's own translator (English or the site language)
	const MISSING = new Set();

	// ---------------------------------------------------------------- Arabic (display only; data and field names are untouched)
	const AR = {
		'% Ordered': '% المطلوب', '(no brand)': '(بدون علامة تجارية)', '(none)': '(لا يوجد)', '30D': '30 يوم', '7D': '7 أيام',
		'Active': 'نشط', 'Active Days': 'أيام النشاط', 'Active Drivers': 'السائقون النشطون', 'Active Forklifts': 'الرافعات الشوكية النشطة',
		'Actual': 'الفعلي', 'Actual Qty': 'الكمية الفعلية', 'Age (h)': 'العمر (ساعة)', 'All clear': 'لا شيء معلّق',
		'All clear — nothing needs attention': 'كل شيء على ما يرام — لا يوجد ما يتطلب الانتباه', 'Amount': 'المبلغ',
		'Assigned Driver': 'السائق المكلّف', 'Attendance Split': 'توزيع الحضور', 'Attention Needed': 'يتطلب انتباهاً', 'Auto': 'تلقائي',
		'Avg %': 'المتوسط %', 'Avg Idle per Trip (min)': 'متوسط الخمول لكل رحلة (دقيقة)', 'Avg/Trip': 'المتوسط/رحلة', 'Avg/day': 'المتوسط/يوم',
		'Billed': 'مفوتر', 'Branch': 'الفرع', 'Brand': 'العلامة التجارية', 'By Priority': 'حسب الأولوية', 'By Sales Person': 'حسب مندوب المبيعات',
		'By Workflow State': 'حسب حالة سير العمل', 'Click to open the list': 'اضغط لفتح القائمة', 'Company': 'الشركة', 'Completed': 'مكتمل',
		'Completed Qty by Operation': 'الكمية المنجزة حسب العملية', 'Completion Rate': 'نسبة الإنجاز', 'Container': 'الحاوية',
		'Could not load this panel': 'تعذّر تحميل هذه اللوحة', 'Could not load this tab': 'تعذّر تحميل هذا التبويب', 'Customer': 'العميل',
		'DN': 'إشعار تسليم', 'DN Status': 'حالة إشعارات التسليم', 'DN Value Today': 'قيمة إشعارات التسليم اليوم', 'DNs To Bill': 'إشعارات تسليم للفوترة',
		'DNs by Hour of Day': 'إشعارات التسليم حسب ساعات اليوم', 'DNs by Location': 'إشعارات التسليم حسب الموقع', 'DNs no trip >24h': 'إشعارات بلا رحلة > 24 ساعة',
		'Daily Movements': 'الحركات اليومية', 'Daily Output by Factory': 'الإنتاج اليومي حسب المصنع',
		'Daily Targets (saved in this browser)': 'الأهداف اليومية (تُحفظ في هذا المتصفح)', 'Date': 'التاريخ', 'Days': 'أيام', 'Days Used': 'أيام الاستخدام',
		'Delivered Rate': 'نسبة التسليم', 'Delivered?': 'تم التسليم؟', 'Delivery & Fleet': 'التوصيل والأسطول', 'Delivery Mode': 'طريقة التسليم',
		'Delivery Note': 'إشعار تسليم', 'Delivery Notes': 'إشعارات التسليم', 'Delivery Notes Today': 'إشعارات التسليم اليوم',
		'Delivery Notes per Day': 'إشعارات التسليم في اليوم', 'Delivery Notes per day': 'إشعارات التسليم في اليوم', 'Delivery Status': 'حالة التسليم',
		'Delivery Value per Day': 'قيمة التسليم في اليوم', 'Delivery Vehicle': 'مركبة التوصيل', 'Departures by Hour': 'المغادرات حسب الساعة',
		'Done / Qty': 'المنجز / الكمية', 'Draft DNs': 'إشعارات تسليم مسودة', 'Driver': 'السائق', 'Driver Scoreboard': 'لوحة أداء السائقين', 'Drivers': 'السائقون',
		'Due': 'الاستحقاق', 'Duty hrs': 'ساعات العمل', 'Earned': 'المكتسب', 'Employee': 'الموظف', 'Entry': 'القيد',
		'Every vehicle delivery has a trip — nothing waiting': 'كل عملية توصيل بمركبة لها رحلة — لا شيء بالانتظار', 'Expense': 'المصروف',
		'Expenses by Vehicle Type': 'المصروفات حسب نوع المركبة', 'Expenses per Day': 'المصروفات في اليوم', 'Factory': 'المصنع', 'Forklift': 'الرافعة الشوكية',
		'Forklift Expenses': 'مصروفات الرافعات الشوكية', 'Forklift Registry': 'سجل الرافعات الشوكية', 'Forklift Status': 'حالة الرافعات الشوكية',
		'Forklift Utilisation': 'استخدام الرافعات الشوكية', 'Forklifts': 'الرافعات الشوكية', 'From': 'من', 'From → To': 'من ← إلى',
		'Handled by Vehicle Type': 'المناولة حسب نوع المركبة', 'Handled by Vehicle Type per Day': 'المناولة حسب نوع المركبة يومياً', 'Idle': 'خامل',
		'Idle Forklifts': 'الرافعات الخاملة', 'In Process': 'قيد التنفيذ', 'In Workshop': 'في الورشة', 'Item': 'الصنف', 'Items': 'الأصناف',
		'Items in Shortage': 'أصناف في عجز', 'Job Card': 'بطاقة العمل', 'Job Card Status': 'حالة بطاقات العمل', 'Job Card Time by Operation': 'وقت بطاقات العمل حسب العملية',
		'Job Cards': 'بطاقات العمل', 'Job Cards by Workstation': 'بطاقات العمل حسب محطة العمل', 'Last Seen': 'آخر ظهور', 'Last Status': 'آخر حالة',
		'Latest Delivery Notes': 'أحدث إشعارات التسليم', 'Latest Material Requests': 'أحدث طلبات المواد', 'Load': 'تحميل', 'Loading': 'التحميل',
		'Loading vs Unloading by Warehouse': 'التحميل مقابل التفريغ حسب المستودع', 'Loading vs Unloading per Day': 'التحميل مقابل التفريغ يومياً', 'Location': 'الموقع',
		'MR': 'طلب مواد', 'MRs': 'طلبات المواد', 'MRs Created Today': 'طلبات المواد المنشأة اليوم', 'MTD': 'منذ بداية الشهر', 'Maker / Model': 'الصانع / الطراز',
		'Material Requests': 'طلبات المواد', 'Minutes': 'دقائق', 'Mode': 'الطريقة', 'Movements': 'الحركات', 'Name': 'الاسم', 'Net Wt (kg)': 'الوزن الصافي (كجم)',
		'New Delivery Trip': 'رحلة توصيل جديدة', 'No data for this selection': 'لا توجد بيانات لهذا الاختيار', 'No item is short': 'لا يوجد صنف ناقص',
		'No open job cards': 'لا توجد بطاقات عمل مفتوحة', 'No overdue material requests': 'لا توجد طلبات مواد متأخرة',
		'No production targets set for this range': 'لم تُحدَّد أهداف إنتاج لهذه الفترة', 'No stale work orders': 'لا توجد أوامر عمل متأخرة',
		'No trips in range': 'لا توجد رحلات في الفترة', 'No work orders in process': 'لا توجد أوامر عمل قيد التنفيذ', 'Nothing pending': 'لا شيء معلّق',
		'Nothing to show': 'لا شيء للعرض', 'OT Amount per Day': 'مبلغ العمل الإضافي في اليوم', 'OT SAR': 'العمل الإضافي (ر.س)', 'OT hours': 'ساعات العمل الإضافي',
		'OT hrs': 'ساعات إضافية', 'On Hand': 'المتوفر', 'On Hand vs Reserved — Top Items': 'المتوفر مقابل المحجوز — أعلى الأصناف', 'On hand': 'المتوفر',
		'Open Job Cards': 'بطاقات العمل المفتوحة', 'Open MR Ageing': 'أعمار طلبات المواد المفتوحة', 'Open MRs by Purpose': 'طلبات المواد المفتوحة حسب الغرض',
		'Open Mat. Requests': 'طلبات المواد المفتوحة', 'Operating Cost': 'تكلفة التشغيل', 'Operating Cost by Item': 'تكلفة التشغيل حسب الصنف', 'Operation': 'العملية',
		'Operator': 'المشغّل', 'Operator Productivity': 'إنتاجية المشغّلين', 'Operators': 'المشغّلون', 'Ordered': 'مطلوب', 'Output': 'المخرجات',
		'Output vs Target': 'المخرجات مقابل الهدف', 'Overdue MRs': 'طلبات مواد متأخرة', 'Overdue Material Requests': 'طلبات المواد المتأخرة', 'Overtime Hours': 'ساعات العمل الإضافي',
		'Overview': 'نظرة عامة', 'Pending': 'معلّق', 'Pending Item Lines': 'بنود الأصناف المعلّقة', 'Pending Qty by Brand': 'الكمية المعلّقة حسب العلامة التجارية',
		'Pending Qty by Item Group': 'الكمية المعلّقة حسب مجموعة الأصناف', 'Pending Qty by Warehouse': 'الكمية المعلّقة حسب المستودع', 'Pick Up': 'استلام',
		'Plan Attainment': 'تحقيق الخطة', 'Planned': 'المخطط', 'Planned vs Produced by Item': 'المخطط مقابل المنتج حسب الصنف', 'Priority': 'الأولوية',
		'Process Loss': 'فاقد التصنيع', 'Process Loss by Item': 'فاقد التصنيع حسب الصنف', 'Produced': 'المنتج', 'Produced Qty': 'الكمية المنتجة', 'Production': 'الإنتاج',
		'Productivity %': 'الإنتاجية %', 'Productivity by Activity': 'الإنتاجية حسب النشاط', 'Progress': 'التقدم', 'Projected': 'المتوقع',
		'Purchase Receipts per Day': 'إيصالات الشراء في اليوم', 'Purpose': 'الغرض', 'Qty': 'الكمية', 'Receipt': 'الإيصال', 'Receipt Status': 'حالة الإيصالات',
		'Receipts': 'الإيصالات', 'Receipts Today': 'إيصالات اليوم', 'Receipts in Range': 'الإيصالات في الفترة', 'Recent Daily Production Updates': 'أحدث تحديثات الإنتاج اليومي',
		'Recent Purchase Receipts': 'أحدث إيصالات الشراء', 'Recent Stock Entries': 'أحدث قيود المخزون', 'Refresh': 'تحديث', 'Refresh every 5 minutes': 'تحديث كل 5 دقائق',
		'Reserved': 'محجوز', 'Reserved Qty by Warehouse': 'الكمية المحجوزة حسب المستودع', 'Route': 'المسار', 'SAR': 'ر.س', 'SAR · all bins': 'ر.س · كل المواقع',
		'SAR · range': 'ر.س · الفترة', 'SAR · total': 'ر.س · الإجمالي', 'Sales Person': 'مندوب المبيعات', 'Save': 'حفظ', 'Set daily targets': 'تحديد الأهداف اليومية',
		'Setting': 'الإعداد', 'Shortage Items': 'أصناف العجز', 'Shortage Lines by Warehouse': 'بنود العجز حسب المستودع', 'Site idle': 'خمول الموقع',
		'Stale WOs': 'أوامر عمل متأخرة', 'Stale Work Orders': 'أوامر العمل المتأخرة', 'State': 'الحالة', 'Status': 'الحالة', 'Stock Entries': 'قيود المخزون',
		'Stock Entries Today': 'قيود المخزون اليوم', 'Stock Entries per Day': 'قيود المخزون في اليوم', 'Stock Entry Types': 'أنواع قيود المخزون', 'Stock Value': 'قيمة المخزون',
		'Stock Value Share': 'حصة قيمة المخزون', 'Stock Value by Warehouse': 'قيمة المخزون حسب المستودع', 'Supplier': 'المورد', 'Supply & Stock': 'التوريد والمخزون',
		'Target': 'الهدف', 'Target vs Actual by Activity': 'الهدف مقابل الفعلي حسب النشاط', 'Targets': 'الأهداف', 'To': 'إلى', 'Today': 'اليوم',
		'Tonnage Delivered': 'الأطنان المسلّمة', 'Tonnage Delivered per Day': 'الأطنان المسلّمة يومياً', 'Tonnage Today': 'أطنان اليوم', 'Tonnage by Location': 'الأطنان حسب الموقع',
		'Tonnes': 'أطنان', 'Tonnes per day': 'أطنان في اليوم', 'Top Customers by Tonnage': 'أعلى العملاء حسب الأطنان', 'Top Customers by Value': 'أعلى العملاء حسب القيمة',
		'Top Employees by Productivity': 'أعلى الموظفين إنتاجية', 'Top Items by Planned Qty': 'أعلى الأصناف حسب الكمية المخططة', 'Top Items by Stock Value': 'أعلى الأصناف حسب قيمة المخزون',
		'Top Operators by Volume': 'أعلى المشغّلين حسب الحجم', 'Top Pending Items': 'أعلى الأصناف المعلّقة', 'Top Routes': 'أبرز المسارات', 'Top Sales Persons': 'أفضل مندوبي المبيعات',
		'Top Suppliers by Value': 'أعلى الموردين حسب القيمة', 'Total': 'الإجمالي', 'Total Loaded': 'إجمالي المحمّل', 'Total Unloaded': 'إجمالي المفرّغ', 'Trailer': 'المقطورة',
		'Trip': 'الرحلة', 'Trip Earnings': 'أرباح الرحلات', 'Trip Earnings Today': 'أرباح رحلات اليوم', 'Trip Earnings per Day': 'أرباح الرحلات في اليوم', 'Trip Log': 'سجل الرحلات',
		'Trip Status': 'حالة الرحلات', 'Trip Types': 'أنواع الرحلات', 'Trip earnings per day (SAR)': 'أرباح الرحلات في اليوم (ر.س)', 'Trips': 'الرحلات', 'Trips Today': 'رحلات اليوم',
		'Trips by Destination': 'الرحلات حسب الوجهة', 'Trips by Source Warehouse': 'الرحلات حسب مستودع المصدر', 'Trips in Range': 'الرحلات في الفترة',
		'Trips per Driver per Day': 'الرحلات لكل سائق في اليوم', 'Trips per day': 'الرحلات في اليوم', 'Type': 'النوع', 'Unassigned DNs': 'إشعارات تسليم بلا رحلة',
		'Unassigned Deliveries Queue': 'قائمة التسليمات غير المسندة', 'Unload': 'تفريغ', 'Unloading': 'التفريغ', 'Update': 'التحديث', 'Updated {0}': 'آخر تحديث {0}',
		'Utilisation': 'الاستخدام', 'Value': 'القيمة', 'Vehicle': 'المركبة', 'Vehicle Scoreboard': 'لوحة أداء المركبات', 'Vehicle Utilisation (trips per day)': 'استخدام المركبات (رحلات في اليوم)',
		'Vehicles Used': 'المركبات المستخدمة', 'Vehicles handled': 'المركبات المناولة', 'WOs In Process': 'أوامر عمل قيد التنفيذ', 'Warehouse': 'المستودع',
		'Warehouse & Forklift': 'المستودع والرافعات', 'Warehouse Summary': 'ملخص المستودع', 'Warehouse idle': 'خمول المستودع', 'Warehouses': 'المستودعات', 'Washes': 'الغسلات',
		'Washings': 'الغسيل', 'Washings by Vehicle Type': 'الغسيل حسب نوع المركبة', 'Work Order': 'أمر العمل', 'Work Order Pipeline': 'مراحل أوامر العمل', 'Work Orders': 'أوامر العمل',
		'Work Orders In Process': 'أوامر العمل قيد التنفيذ', 'Work Orders by Warehouse': 'أوامر العمل حسب المستودع', 'Workplace Summary': 'ملخص مكان العمل', 'Workshop': 'الورشة',
		'Workstation': 'محطة العمل', 'across WOs': 'عبر أوامر العمل', 'all purposes': 'كل الأغراض', 'avg %, worked days': 'متوسط %، أيام العمل', 'by branch': 'حسب الفرع',
		'completed': 'مكتمل', 'completed qty': 'الكمية المنجزة', 'days since request': 'أيام منذ الطلب', 'days with records': 'أيام بها سجلات', 'delivered': 'مسلّم',
		'delivery value': 'قيمة التسليم', 'distinct': 'مميّز', 'done': 'منجز', 'from → to': 'من ← إلى', 'in range': 'في الفترة', 'in workshop': 'في الورشة',
		'last 15': 'آخر 15', 'last {0} days in range': 'آخر {0} يوماً في الفترة', 'latest 15': 'أحدث 15', 'latest 50': 'أحدث 50', 'latest status': 'آخر حالة',
		'leaf warehouses': 'المستودعات الفرعية', 'minutes': 'دقائق', 'need a trip': 'تحتاج رحلة', 'not started, overdue': 'لم تبدأ، متأخرة', 'not submitted': 'غير مرحّلة',
		'of target': 'من الهدف', 'old open trips': 'رحلات مفتوحة قديمة', 'on the floor': 'على أرض المصنع', 'open / WIP / hold': 'مفتوحة / قيد العمل / معلّقة',
		'open, by due date': 'مفتوحة، حسب تاريخ الاستحقاق', 'open: all-time · rest: in range': 'المفتوحة: الكل · الباقي: في الفترة', 'overdue MRs': 'طلبات مواد متأخرة',
		'past due date': 'تجاوزت تاريخ الاستحقاق', 'pending / partial': 'معلّقة / جزئية', 'planned in range': 'مخطط في الفترة', 'planned vs actual · top 6': 'المخطط مقابل الفعلي · أعلى 6',
		'produced / planned': 'المنتج / المخطط', 'projected qty < 0': 'الكمية المتوقعة < 0', 'purchase receipts': 'إيصالات الشراء', 'qty lost': 'الكمية المفقودة',
		'qty still to receive': 'الكمية المتبقية للاستلام', 'range': 'الفترة', 'short items': 'أصناف ناقصة', 'stale WOs': 'أوامر عمل متأخرة', 'still to receive': 'متبقٍ للاستلام',
		'submitted': 'مرحّلة', 'submitted in range': 'مرحّلة في الفترة', 'tonnes': 'أطنان', 'top 5 each': 'أعلى 5 لكل قسم', 'top 8': 'أعلى 8', 'top 8 by qty': 'أعلى 8 حسب الكمية',
		'unavailable': 'غير متاح', 'vehicles loaded': 'مركبات محمّلة', 'vehicles unloaded': 'مركبات مفرّغة', 'vehicles washed': 'مركبات مغسولة', 'vs prev period': 'مقابل الفترة السابقة',
		'vs yday': 'مقابل الأمس', 'with records': 'بها سجلات', 'with trips': 'لها رحلات', '{0} not started, start date passed': '{0} لم تبدأ وتجاوزت تاريخ البدء',
		'{0} open': '{0} مفتوح', '{0} overdue': '{0} متأخر', '{0} registered': '{0} مسجّل', '{0} trips skipped (bad times)': '{0} رحلة مستبعدة (أوقات غير صحيحة)',
		'{0} vehicle DNs with no trip': '{0} إشعار تسليم بمركبة بلا رحلة',
		// UI added in this version
		'Actions — Data to Fix': 'إجراءات — بيانات تحتاج إلى تصحيح', 'click a row to open the records and fix them': 'اضغط على السطر لفتح السجلات وتصحيحها', 'Trips submitted but never completed': 'رحلات مرحّلة ولم تُكمل', 'Set trip status to In Transit / Completed so delivery KPIs are real': 'حدّث حالة الرحلة إلى في الطريق / مكتمل لتصبح مؤشرات التسليم صحيحة', 'Draft trips from past days': 'رحلات مسودة من أيام سابقة', 'Submit or delete them': 'قم بترحيلها أو حذفها', 'Delivery Notes with no trip for over 24h': 'إشعارات تسليم بلا رحلة لأكثر من 24 ساعة', 'Create or link a Delivery Trip': 'أنشئ رحلة توصيل أو اربطها', 'Open requests older than 90 days': 'طلبات مواد مفتوحة أقدم من 90 يوماً', 'Order, receive or close them — stale requests hide real demand': 'اطلب أو استلم أو أغلق — الطلبات القديمة تخفي الطلب الحقيقي', 'Overdue requests (last 90 days)': 'طلبات متأخرة (آخر 90 يوماً)', 'Follow up with purchasing / the requester': 'تابع مع المشتريات / مقدّم الطلب', 'Stopped material requests': 'طلبات مواد متوقفة', 'Cancel them, or re-open if still needed': 'ألغِها أو أعد فتحها إن كانت مطلوبة', 'Work orders not started and overdue': 'أوامر عمل لم تبدأ ومتأخرة', 'Start, re-plan or cancel': 'ابدأ أو أعد التخطيط أو ألغِ', 'Work orders stuck In Process over 60 days': 'أوامر عمل عالقة قيد التنفيذ أكثر من 60 يوماً', 'Complete, update progress or close them': 'أكمل أو حدّث التقدم أو أغلق', 'Draft delivery notes from past days': 'إشعارات تسليم مسودة من أيام سابقة', 'Submit or delete': 'قم بالترحيل أو الحذف', 'Items with negative projected stock': 'أصناف بمخزون متوقع سالب', 'Raise a purchase / transfer or correct stock': 'أنشئ طلب شراء / نقل أو صحّح المخزون', '{0} records to fix': '{0} سجل يحتاج تصحيحاً', 'trip status not updated in ERP': 'حالة الرحلة لم تُحدَّث في النظام', 'Showing the first rows only for:': 'عرض الصفوف الأولى فقط لـ:', 'narrow the date range for complete numbers': 'ضيّق الفترة للحصول على أرقام كاملة', 'no entries recorded in range': 'لا توجد قيود مسجلة في الفترة', 'Delivery trips only': 'رحلات التسليم فقط', 'Scope': 'النطاق', 'other companies are not included': 'الشركات الأخرى غير مشمولة', 'all companies': 'كل الشركات', 'All companies': 'كل الشركات', 'All warehouses': 'كل المستودعات', 'English': 'English', 'العربية': 'العربية', 'Switch language': 'تبديل اللغة', 'Delivery Trip': 'رحلة توصيل',
	};
	// data values shown as status badges / chart labels (only these are translated; names, items and customers stay as stored)
	const AR_VAL = {
		'Draft': 'مسودة', 'Scheduled': 'مجدول', 'In Transit': 'في الطريق', 'Completed': 'مكتمل', 'Delivered': 'مسلّم', 'Active': 'نشط', 'Received': 'مستلم',
		'Transferred': 'محوّل', 'Issued': 'مصروف', 'Approved': 'معتمد', 'Submitted': 'مرحّل', 'Ordered': 'مطلوب', 'Cancelled': 'ملغى', 'Stopped': 'متوقف', 'Workshop': 'الورشة',
		'On Hold': 'معلّق', 'Closed': 'مغلق', 'Pending': 'معلّق', 'Not Started': 'لم يبدأ', 'Open': 'مفتوح', 'Partially Ordered': 'مطلوب جزئياً', 'Partially Received': 'مستلم جزئياً',
		'Partially Delivered': 'مسلّم جزئياً', 'Not Delivered': 'غير مسلّم', 'Idle': 'خامل', 'In Process': 'قيد التنفيذ', 'Work In Progress': 'قيد العمل', 'Material Transferred': 'تم تحويل المواد',
		'To Bill': 'للفوترة', 'To Deliver and Bill': 'للتسليم والفوترة', 'To Deliver': 'للتسليم', 'To Receive and Bill': 'للاستلام والفوترة', 'To Receive': 'للاستلام', 'Fully Billed': 'مفوتر بالكامل',
		'Overdue': 'متأخر', 'Paused': 'متوقف مؤقتاً', 'Unassigned': 'غير مسند', 'Purchase': 'شراء', 'Material Transfer': 'نقل مواد', 'Material Issue': 'صرف مواد',
		'Material Receipt': 'استلام مواد', 'Manufacture': 'تصنيع', 'Material Consumption for Manufacture': 'استهلاك مواد للتصنيع', 'Send to Subcontractor': 'إرسال لمقاول من الباطن',
		'Material Transfer for Manufacture': 'نقل مواد للتصنيع', 'Repack': 'إعادة تعبئة', 'DM Vehicle': 'مركبة الشركة', 'Rented Vehicle': 'مركبة مستأجرة', 'Customer Pickup': 'استلام العميل',
		'Low': 'منخفضة', 'Medium': 'متوسطة', 'High': 'عالية', 'Urgent': 'عاجلة', 'Loading': 'التحميل', 'Unloading': 'التفريغ', 'Washing': 'الغسيل', 'Others': 'أخرى', 'Other': 'أخرى',
	};

	const fillArgs = (t, a) => (a && a.length ? String(t).replace(/\{(\d+)\}/g, (m, i) => (a[i] != null ? a[i] : m)) : t);
	// shadows Frappe's __ for this dashboard: Arabic first, then whatever Frappe returns
	const __ = (s, a) => {
		if (LANG === 'ar') {
			if (AR[s] != null) return fillArgs(AR[s], a);
			MISSING.add(s);
		}
		return typeof _fr === 'function' ? _fr(s, a) : fillArgs(s, a);
	};
	const tv = (v) => (LANG === 'ar' && v != null && AR_VAL[v] != null ? AR_VAL[v] : v); // data values (statuses, modes)
	const UNIT = { h: 'س', d: 'ي' };
	const unit = (u) => (LANG === 'ar' ? UNIT[u] || u : u);
	window.dmoMissing = () => Array.from(MISSING); // run in the console: strings still shown in English

	const PALETTE = ['#4169e1', '#1e3a8a', '#7b97ee', '#2a4fc4', '#a9bdf6', '#0f2a6b', '#64748b', '#c7d6fb', '#3b5bdb', '#94a3b8'];
	const OPEN_MR = ['Pending', 'Partially Ordered', 'Partially Received'];
	const OPEN_WO = ['Not Started', 'In Process'];
	const DEFAULT_COMPANY = 'Durar Masagh Trading Company';
	const TRIP_NEEDED_VIA = ['DM Vehicle', 'Rented Vehicle']; // Customer Pickup never needs a trip
	const MEM_TTL = 90 * 1000;
	const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const ICONS = {
		file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
		alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/>',
		route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
		box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
		clip: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
		cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		flame: '<path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4 1-6 1-9z"/>',
		truck: '<path d="M1 6h13v10H1zM14 10h4l4 3v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
		users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.6 4 2.4 4 6"/>',
		cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
		scale: '<path d="M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
		warehouse: '<path d="M3 21V9l9-6 9 6v12M3 21h18M8 21v-7h8v7"/>',
		tool: '<path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
		layers: '<path d="M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5"/>',
		check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
		cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
		cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H6"/>',
		trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
		tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
		drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',
		stack: '<rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="11" width="18" height="6" rx="1"/><path d="M3 21h18"/>',
	};
	const ico = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.file}</svg>`;

	// ---------------------------------------------------------------- helpers
	const esc = (s) => frappe.utils.escape_html(s == null ? '' : String(s));
	const strip = (h) => String(h == null ? '' : h).replace(/<[^>]*>/g, '').trim();
	const fmt = (n, d) => format_number(n || 0, null, d == null ? 0 : d);
	const link = (dt, name) => frappe.utils.get_form_link(dt, name, true);
	const blank = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : esc(tv(v)));

	function tone(status) {
		const s = String(status || '').toLowerCase();
		if (['completed', 'delivered', 'active', 'received', 'transferred', 'issued', 'approved'].includes(s)) return 'green';
		if (['in transit', 'in process', 'work in progress', 'scheduled', 'material transferred', 'submitted', 'ordered'].includes(s)) return 'blue';
		if (['cancelled', 'stopped', 'workshop', 'on hold', 'closed'].includes(s)) return 'red';
		if (['pending', 'not started', 'open', 'partially ordered', 'partially received', 'partially delivered', 'not delivered', 'idle'].includes(s)) return 'orange';
		return 'grey';
	}
	const badge = (text) => (text ? `<span class="dmo-b ${tone(text)}">${esc(tv(text))}</span>` : '—');

	function table(cols, rows, opts) {
		opts = opts || {};
		if (!rows.length) return `<div class="dmo-empty">${opts.empty || __('Nothing to show')}</div>`;
		const head = cols.map((c) => `<th class="${c.cls || ''}">${c.l}</th>`).join('');
		const body = rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.cls || ''}">${c.v(r)}</td>`).join('')}</tr>`).join('');
		return `<div class="dmo-scroll"><table class="dmo-t ${opts.cls || ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
	}

	const progress = (pct) => {
		const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
		return `<div class="dmo-prog"><div style="width:${p}%"></div><span>${p}%</span></div>`;
	};

	function tally(rows, keyFn, valFn) {
		const m = new Map();
		rows.forEach((r) => {
			const k = keyFn(r);
			m.set(k, (m.get(k) || 0) + (valFn ? valFn(r) : 1));
		});
		return m;
	}
	const sortedEntries = (m, n) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n || 999);

	function dates(from, to, cap) {
		const out = [];
		let d = from, guard = 0;
		while (d <= to && guard++ < 400) {
			out.push(d);
			d = frappe.datetime.add_days(d, 1);
		}
		return out.slice(-(cap || 31));
	}
	const daysBetween = (dateStr, ref) => moment(ref || frappe.datetime.get_today()).diff(moment(dateStr).startOf('day'), 'days');

	// ---------------------------------------------------------------- dashboard
	class DMOpsDashboard {
		constructor($host) {
			this.$host = $host;
			this.loaded = {};
			this.cache = {};
			this.mem = DMOpsDashboard.mem || (DMOpsDashboard.mem = new Map()); // survives a language switch
			this.observers = [];
			this.active = 'overview';
			this.ready = false;
			this.last_load = null;
			this.tabs = [
				{ id: 'overview', label: __('Overview') },
				{ id: 'delivery', label: __('Delivery & Fleet') },
				{ id: 'forklift', label: __('Warehouse & Forklift') },
				{ id: 'production', label: __('Production') },
				{ id: 'supply', label: __('Supply & Stock') },
			];
			this.auto = true;
			try { this.auto = localStorage.getItem('dmo_auto') !== '0'; } catch (_) { /* ignore */ }
			this.on_filter = frappe.utils.debounce(() => {
				if (this.ready) { this.saveState(); this.refresh(false); }
			}, 500);
			this.make_layout();
			this.make_filters();
			this.ready = true;
			this.switch_tab(this.pending_tab || 'overview');
			this.timer = setInterval(() => {
				if (!this.$root[0].isConnected) { clearInterval(this.timer); return; }
				if (this.auto && !document.hidden && window.scrollY < 150) this.refresh(true);
			}, 5 * 60 * 1000);
		}

		// ---------- remembered filters / targets
		loadState() { try { return JSON.parse(localStorage.getItem('dmo_state') || '{}'); } catch (_) { return {}; } }
		saveState() {
			try {
				const f = this.get_f();
				localStorage.setItem('dmo_state', JSON.stringify({ company: f.company, warehouse: f.warehouse, from: f.from, to: f.to, on: f.today, tab: this.active }));
			} catch (_) { /* ignore */ }
		}
		targets() {
			const d = { dns_day: 0, trips_day: 0, tons_day: 0, earn_day: 0 };
			try { return Object.assign(d, JSON.parse(localStorage.getItem('dmo_targets') || '{}')); } catch (_) { return d; }
		}
		edit_targets() {
			const t = this.targets();
			const dlg = frappe.prompt([
				{ fieldname: 'dns_day', label: __('Delivery Notes per day'), fieldtype: 'Float', default: t.dns_day },
				{ fieldname: 'trips_day', label: __('Trips per day'), fieldtype: 'Float', default: t.trips_day },
				{ fieldname: 'tons_day', label: __('Tonnes per day'), fieldtype: 'Float', default: t.tons_day },
				{ fieldname: 'earn_day', label: __('Trip earnings per day (SAR)'), fieldtype: 'Float', default: t.earn_day },
			], (v) => {
				try { localStorage.setItem('dmo_targets', JSON.stringify(v)); } catch (_) { /* ignore */ }
				this.refresh(false);
			}, __('Daily Targets (saved in this browser)'), __('Save'));
			try { if (LANG === 'ar' && dlg && dlg.$wrapper) dlg.$wrapper.attr('dir', 'rtl'); } catch (_) { /* ignore */ }
		}
		tpct(cur, target) { return target > 0 ? ` · ${Math.round((cur / target) * 100)}% ${__('of target')}` : ''; }
		prevF(f) {
			const len = daysBetween(f.from, f.to) + 1;
			return Object.assign({}, f, { from: frappe.datetime.add_days(f.from, -len), to: frappe.datetime.add_days(f.from, -1) });
		}
		goto(dt, filters) {
			const o = {};
			Object.keys(filters || {}).forEach((k) => { if (filters[k] !== '—' && filters[k] !== '(none)') o[k] = filters[k]; });
			frappe.route_options = o;
			frappe.set_route('List', dt);
		}

		// ---------- chrome
		make_filters() {
			const today = frappe.datetime.get_today();
			const $bar = this.$root.find('.dmo-filters');
			const st = this.loadState(), same = st.on === today;
			this.pending_tab = this.tabs.some((t) => t.id === st.tab) ? st.tab : null;
			this.f = {};
			// Company + Warehouse are native <select>s: Frappe Link controls misbehave inside this shadow root (dropdown / selection), selects always work.
			this.f.company = this.make_select(__('Company'), {
				all: __('All companies'), init: st.company != null ? st.company : DEFAULT_COMPANY,
				onchange: () => { this.f.warehouse.set_value(''); this.load_warehouses(''); this.on_filter(); },
			});
			[
				{ fieldname: 'from_date', label: __('From'), fieldtype: 'Date', default: (same && st.from) || frappe.datetime.add_days(today, -13) },
				{ fieldname: 'to_date', label: __('To'), fieldtype: 'Date', default: (same && st.to) || today },
			].forEach((df) => {
				const $w = $('<div class="dmo-fc"></div>').appendTo($bar);
				df.change = () => this.on_filter();
				const c = frappe.ui.form.make_control({ df: df, parent: $w, render_input: true });
				if (df.default) c.set_value(df.default);
				this.f[df.fieldname] = c;
			});
			this.f.warehouse = this.make_select(__('Warehouse'), { all: __('All warehouses'), init: st.warehouse || '', onchange: () => this.on_filter() });
			frappe.xcall('frappe.client.get_list', { doctype: 'Company', fields: ['name'], limit_page_length: 0, order_by: 'name asc' })
				.then((r) => this.f.company.fill(r.map((x) => x.name))).catch(() => { /* keep the default option */ });
			this.load_warehouses(st.warehouse || '');
			const $pre = $('<div class="dmo-pre"></div>').appendTo($bar);
			[[__('Today'), 0], [__('7D'), 6], [__('30D'), 29], [__('MTD'), 'm']].forEach((x) => {
				$(`<button type="button">${x[0]}</button>`).appendTo($pre).on('click', () => {
					this.f.from_date.set_value(x[1] === 'm' ? today.slice(0, 8) + '01' : frappe.datetime.add_days(today, -x[1]));
					this.f.to_date.set_value(today);
				});
			});
			$(`<button type="button" class="dmo-tgt" title="${__('Set daily targets')}">◎ ${__('Targets')}</button>`).appendTo($pre).on('click', () => this.edit_targets());
		}

		make_select(label, o) {
			const $w = $('<div class="dmo-fc"></div>').appendTo(this.$root.find('.dmo-filters'));
			$('<label class="control-label"></label>').text(label).appendTo($w);
			const $s = $('<select class="dmo-sel"></select>').appendTo($w);
			const ctl = {
				get_value: () => $s.val() || '',
				set_value: (v) => {
					if (v && !$s.find('option').filter((_, x) => x.value === v).length) $s.append($('<option></option>').val(v).text(v));
					$s.val(v || '');
				},
				fill: (names, keep) => {
					const cur = keep == null ? $s.val() || '' : keep;
					$s.empty().append($('<option></option>').val('').text(o.all));
					names.forEach((n) => $s.append($('<option></option>').val(n).text(n)));
					ctl.set_value(cur);
				},
			};
			$s.on('change', () => { if (o.onchange) o.onchange(); });
			ctl.fill([], o.init || '');
			return ctl;
		}
		load_warehouses(keep) {
			const co = this.f.company.get_value();
			const fl = [['is_group', '=', 0]];
			if (co) fl.push(['company', '=', co]);
			return frappe.xcall('frappe.client.get_list', { doctype: 'Warehouse', fields: ['name'], filters: fl, limit_page_length: 0, order_by: 'name asc' })
				.then((r) => this.f.warehouse.fill(r.map((x) => x.name), keep == null ? '' : keep)).catch(() => {});
		}

		make_layout() {
			const root = this.$host[0];
			// shadow DOM does not inherit Frappe's stylesheets: clone them in so charts + controls are styled
			if (window.ShadowRoot && root instanceof ShadowRoot && !root.querySelector('link[data-dmo]')) {
				document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => { const c = l.cloneNode(); c.setAttribute('data-dmo', '1'); root.appendChild(c); });
			}
			const tabs = this.tabs.map((t) => `<button type="button" class="dmo-tab" data-tab="${t.id}">${t.label}</button>`).join('');
			const panes = this.tabs.map((t) => `<div class="dmo-pane" data-pane="${t.id}"></div>`).join('');
			const rtl = LANG === 'ar';
			this.$root = $(`<div class="dmo${rtl ? ' dmo-rtl' : ''}" dir="${rtl ? 'rtl' : 'ltr'}" lang="${rtl ? 'ar' : 'en'}">
				<div class="dmo-top"><div class="dmo-tabs">${tabs}</div><div class="dmo-meta"><i class="dmo-live"></i><span></span><label class="dmo-auto" title="${__('Refresh every 5 minutes')}"><input type="checkbox" ${this.auto ? 'checked' : ''}> ${__('Auto')}</label><button type="button" class="dmo-refresh" title="${__('Refresh')}">↻</button><button type="button" class="dmo-lang" title="${__('Switch language')}">${rtl ? 'English' : 'العربية'}</button></div></div>
				<div class="dmo-filters"></div>
				<div class="dmo-alerts"></div>
				${panes}</div>`);
			this.$host.append(this.$root);
			this.$root.on('click', '.dmo-tab', (e) => this.switch_tab($(e.currentTarget).data('tab')));
			this.$root.on('click', '.dmo-refresh', () => this.refresh(true));
			this.$root.on('click', '.dmo-lang', () => this.set_lang(LANG === 'ar' ? 'en' : 'ar'));
			this.$root.on('change', '.dmo-auto input', (e) => {
				this.auto = e.target.checked;
				try { localStorage.setItem('dmo_auto', this.auto ? '1' : '0'); } catch (_) { /* ignore */ }
			});
			this.apply_theme();
			this.themeObs = new MutationObserver(() => this.apply_theme());
			this.themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
			this.fix_sticky();
			setTimeout(() => this.fix_sticky(), 400);
			$(window).off('resize.dmo').on('resize.dmo', frappe.utils.debounce(() => this.fix_sticky(), 200));
		}

		set_lang(l) {
			try { localStorage.setItem(LANG_KEY, l); } catch (_) { /* ignore */ }
			this.saveState(); // filters + current tab are re-read when the dashboard is rebuilt
			LANG = l;
			this.destroy();
			boot(this.$host);
		}
		destroy() {
			clearInterval(this.timer);
			this.observers.forEach((o) => o.disconnect());
			if (this.themeObs) this.themeObs.disconnect();
			$(window).off('resize.dmo');
			this.$root.remove();
		}

		apply_theme() {
			this.$root.toggleClass('dmo-dark', document.documentElement.getAttribute('data-theme') === 'dark');
		}

		// keep the tab bar just under Frappe's navbar + page header
		fix_sticky() {
			const nav = $('.navbar').first().outerHeight() || 48;
			const head = $('.page-head:visible').first().outerHeight() || 0;
			this.$root[0].style.setProperty('--dmo-top', (nav + head + 6) + 'px');
		}

		on_show() {
			this.fix_sticky();
			if (this.last_load && Date.now() - this.last_load > 5 * 60 * 1000) this.refresh(false);
		}

		refresh(force) {
			this.observers.forEach((o) => o.disconnect());
			this.observers = [];
			this.loaded = {};
			this.cache = {};
			this._pf = false;
			if (force) this.mem.clear();
			this.load_active();
		}

		switch_tab(id) {
			this.active = id;
			this.$root.find('.dmo-tab').removeClass('active').filter(`[data-tab="${id}"]`).addClass('active');
			this.$root.find('.dmo-pane').removeClass('active').filter(`[data-pane="${id}"]`).addClass('active');
			if (this.ready) this.saveState();
			this.$root.find('.dmo-alerts').toggle(id === 'overview'); this.load_active();
		}

		async load_active() {
			const id = this.active;
			if (this.loaded[id]) return;
			this.loaded[id] = true;
			const $p = this.$root.find(`[data-pane="${id}"]`).empty();
			const f = this.get_f();
			try {
				await this['tab_' + id]($p, f);
				this.alerts(f); this.scope_note(f);
				this.last_load = Date.now();
				this.$root.find('.dmo-meta span').text(__('Updated {0}', [moment().format('HH:mm:ss')]));
				this.prefetch(f);
			} catch (e) {
				console.error('[dm-ops]', e);
				this.loaded[id] = false;
				$p.html(`<div class="dmo-err">${__('Could not load this tab')}<br><small>${esc(this.errmsg(e))}</small></div>`);
			}
		}

		// warm the shared datasets while the browser is idle so other tabs open instantly
		prefetch(f) {
			if (this._pf) return;
			this._pf = true;
			const run = () => [this.trips(f), this.dns(f), this.openMRs(f), this.forklifts(f)].forEach((p) => p.catch(() => {}));
			if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 4000 });
			else setTimeout(run, 1500);
		}

		get_f() {
			const v = (k) => this.f[k].get_value();
			const today = frappe.datetime.get_today();
			return this.cur = {
				company: v('company') || '',
				from: v('from_date') || frappe.datetime.add_days(today, -13),
				to: v('to_date') || today,
				warehouse: v('warehouse') || '',
				today: today,
			};
		}

		errmsg(e) {
			if (!e) return '';
			if (e.message) return e.message;
			try {
				const m = JSON.parse(e._server_messages || '[]');
				if (m.length) return strip(JSON.parse(m[0]).message);
			} catch (_) { /* ignore */ }
			return e.exc_type || String(e).slice(0, 200);
		}

		// ---------- layout builders
		grid($p) {
			return $('<div class="dmo-grid"></div>').appendTo($p);
		}
		kpi_row($p) {
			return $('<div class="dmo-kpis"></div>').appendTo($p);
		}
		card($g, title, o) {
			o = o || {};
			const i = Math.min($g.children().length, 10);
			const $c = $(`<div class="dmo-card dmo-span-${o.span || 6}" style="--i:${i}"><div class="dmo-card-h"><span class="dmo-card-t">${title}</span><small class="dmo-card-s">${o.sub || ''}</small></div><div class="dmo-card-b"><div class="dmo-skel"></div></div></div>`).appendTo($g);
			return $c.find('.dmo-card-b');
		}
		sub($b, text) {
			$b.closest('.dmo-card').find('.dmo-card-s').text(text).attr('title', text);
		}
		async fill($b, fn) {
			try {
				await fn($b);
				this.add_export($b);
			} catch (e) {
				console.error('[dm-ops]', e);
				$b.html(`<div class="dmo-err">${__('Could not load this panel')}<br><small>${esc(this.errmsg(e))}</small></div>`);
			}
		}
		// Panels load lazily: the query only fires when the card nears the viewport.
		panel($g, title, o, fn) {
			const $b = this.card($g, title, o);
			const run = () => this.fill($b, fn);
			if (!('IntersectionObserver' in window)) { run(); return Promise.resolve(); }
			const io = new IntersectionObserver((entries) => {
				if (entries.some((x) => x.isIntersecting)) { io.disconnect(); run(); }
			}, { rootMargin: '350px' });
			io.observe($b.closest('.dmo-card')[0]);
			this.observers.push(io);
			return Promise.resolve();
		}
		kpi($row, label, fn, o) {
			o = o || {};
			const i = $row.children().length;
			const $k = $(`<div class="dmo-kpi" style="--i:${i}"><div class="dmo-kpi-ico">${ico(o.icon)}</div><div class="dmo-kpi-body"><div class="dmo-kpi-l" title="${label}">${label}</div><div class="dmo-kpi-v">…</div><div class="dmo-kpi-s">&nbsp;</div></div></div>`).appendTo($row);
			if (o.go) $k.addClass('click').attr('title', __('Click to open the list')).on('click', () => (typeof o.go === 'function' ? o.go() : this.goto(o.go[0], o.go[1])));
			return fn().then((r) => {
				const $v = $k.find('.dmo-kpi-v');
				if (r.num != null) this.count_up($v, r.num, r.dec || 0, r.suffix || '');
				else $v.text(r.value);
				$k.find('.dmo-kpi-s').html(r.sub || '&nbsp;');
				if (r.tone) $k.addClass('tone-' + r.tone);
			}).catch((e) => {
				console.error('[dm-ops]', e);
				$k.find('.dmo-kpi-v').text('—');
				$k.find('.dmo-kpi-s').text(__('unavailable'));
			});
		}
		count_up($el, num, dec, suffix) {
			if (REDUCE_MOTION || !num) { $el.text(fmt(num, dec) + suffix); return; }
			const t0 = performance.now(), dur = 650;
			const step = (t) => {
				const p = Math.min(1, (t - t0) / dur);
				$el.text(fmt(num * (1 - Math.pow(1 - p, 3)), dec) + suffix);
				if (p < 1) requestAnimationFrame(step);
			};
			requestAnimationFrame(step);
		}
		delta(cur, prev, label) {
			const d = cur - prev;
			const cls = d > 0 ? 'dmo-d-up' : d < 0 ? 'dmo-d-down' : 'dmo-d-flat';
			const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '■';
			return `<span class="${cls}">${arrow} ${fmt(Math.abs(d), Number.isInteger(d) ? 0 : 1)}</span> ${label || __('vs yday')}`;
		}

		// ---------- chart helper (no chart animation: CSS handles motion, keeps first paint fast)
		chart($b, cfg) {
			const has = cfg.data.labels.length && cfg.data.datasets.some((d) => d.values.some((v) => v));
			if (!has) {
				$b.html(`<div class="dmo-empty">${__('No data for this selection')}</div>`);
				return;
			}
			const holder = $('<div class="dmo-chart"></div>').appendTo($b.empty());
			const sel = cfg.onSelect, c2 = Object.assign({}, cfg);
			delete c2.onSelect;
			const axis = cfg.type === 'bar' || cfg.type === 'line';
			if (sel && axis) c2.isNavigable = 1;
			new frappe.Chart(holder[0], Object.assign({
				height: 190, colors: PALETTE, animate: 0, truncateLegends: 1,
				axisOptions: { xIsSeries: cfg.type === 'line' ? 1 : 0 },
			}, c2));
			if (sel && axis) { // only react to real user clicks / keys, never to the chart's own start-up selection
				let armed = false;
				holder.on('pointerdown keydown', () => { armed = true; setTimeout(() => { armed = false; }, 1500); });
				holder[0].addEventListener('data-select', (e) => { if (armed) { try { sel(e.index); } catch (_) { /* ignore */ } } });
			}
		}
		chart_map($b, type, map, name, n, go) {
			const e = sortedEntries(map, n || 10);
			this.chart($b, { type: type, onSelect: go ? (i) => e[i] && go(e[i][0]) : null, data: { labels: e.map((x) => tv(x[0])), datasets: [{ name: name || '', values: e.map((x) => x[1]) }] } });
			if (go && !['bar', 'line'].includes(type) && e.length) { // pies have no click events: clickable chips instead
				const chips = e.slice(0, 6).map((x, i) => `<button type="button" class="dmo-chip" data-i="${i}">${esc(tv(x[0]))} <b>${fmt(x[1])}</b></button>`).join('');
				$(`<div class="dmo-chips">${chips}</div>`).appendTo($b).on('click', '.dmo-chip', (ev) => go(e[$(ev.currentTarget).data('i')][0]));
			}
		}

		// ---------- data layer: request cache (90s) + in-flight de-dupe
		req(key, fn) {
			const hit = this.mem.get(key);
			if (hit && Date.now() - hit.t < MEM_TTL) return hit.p;
			const p = Promise.resolve(fn());
			this.mem.set(key, { t: Date.now(), p: p });
			p.catch(() => this.mem.delete(key));
			return p;
		}
		note_cap(doctype, lim, r) {
			try {
				if (lim && r && r.length >= lim) {
					this.capped = this.capped || {}; this.capped[doctype] = lim;
					let $w = this.$root.find('.dmo-cap');
					if (!$w.length) $w = $('<div class="dmo-cap"></div>').insertAfter(this.$root.find('.dmo-alerts'));
					$w.text('⚠ ' + __('Showing the first rows only for:') + ' ' + Object.entries(this.capped).map(([k, v]) => k + ' (' + fmt(v) + ')').join(', ') + ' — ' + __('narrow the date range for complete numbers'));
				}
			} catch (e) { /* ignore */ }
			return r;
		}
		gl(doctype, fields, filters, o) {
			o = o || {};
			const args = { doctype: doctype, fields: fields, filters: filters || [], limit_page_length: o.limit == null ? 3000 : o.limit };
			if (o.order_by) args.order_by = o.order_by;
			if (o.group_by) args.group_by = o.group_by;
			if (o.parent) args.parent = o.parent;
			return this.req('gl|' + JSON.stringify(args), () => frappe.xcall('frappe.client.get_list', args).then((r) => this.note_cap(doctype, args.limit_page_length, r)));
		}
		cnt(doctype, filters) {
			return this.req('cnt|' + doctype + JSON.stringify(filters), () => frappe.xcall('frappe.client.get_count', { doctype: doctype, filters: filters }));
		}
		rep(name, filters) {
			return this.req('rep|' + name + JSON.stringify(filters || {}), () => Promise.resolve(frappe.call({
				method: 'frappe.desk.query_report.run',
				args: { report_name: name, filters: JSON.stringify(filters || {}), ignore_prepared_report: true },
			})).then((r) => r.message || {}));
		}
		cached(key, fn) {
			if (!this.cache[key]) {
				const p = Promise.resolve(fn());
				this.cache[key] = p;
				p.catch(() => { delete this.cache[key]; });
			}
			return this.cache[key];
		}
		// o: {co: 'company', date: 'posting_date', dt: true (datetime field), wh: 'warehouse field', extra: [...]}
		bf(f, o) {
			const a = [];
			if (o.co && f.company) a.push([o.co, '=', f.company]);
			if (o.date) {
				a.push([o.date, '>=', f.from + (o.dt ? ' 00:00:00' : '')]);
				a.push([o.date, '<=', f.to + (o.dt ? ' 23:59:59' : '')]);
			}
			if (o.wh && f.warehouse) a.push([o.wh, '=', f.warehouse]);
			(o.extra || []).forEach((x) => a.push(x));
			return a;
		}

		dns(f) {
			return this.cached('dns', () => this.gl('Delivery Note',
				['name', 'posting_date', 'posting_time', 'customer', 'custom_delivery_by', 'delivery_mode', 'total_net_weight', 'location', 'custom_sales_person', 'grand_total', 'total_qty', 'status'],
				this.bf(f, { co: 'company', date: 'posting_date', wh: 'set_warehouse', extra: [['docstatus', '=', 1], ['is_return', '=', 0]] }),
				{ order_by: 'posting_date desc, posting_time desc' }));
		}
		trips(f) {
			return this.cached('trips', () => this.gl('Delivery Trip',
				['name', 'custom_trip_type_', 'custom_delivery_date', 'driver_name', 'vehicle', 'status', 'delivery_status',
					'custom_source_warehouse', 'custom_delivery_to_warehouse', 'custom_total_amount_earned',
					'custom_driver_reporting_time__at_warehouse', 'departure_time', 'custom_delivered_time', 'custom_driver__out_of_site', 'custom_amount'],
				this.bf(f, { co: 'company', date: 'custom_delivery_date', wh: 'custom_source_warehouse', extra: [['docstatus', '<', 2]] }),
				{ order_by: 'custom_delivery_date desc, name desc' }));
		}
		// Delivery Notes that need a vehicle (DM / rented) but are not on any Delivery Trip stop
		unassigned(f) {
			return this.cached('unassigned', async () => {
				const dns = (await this.dns(f)).filter((d) => TRIP_NEEDED_VIA.includes(d.custom_delivery_by));
				if (!dns.length) return [];
				const names = dns.map((d) => d.name);
				const used = new Set();
				const chunks = [];
				for (let i = 0; i < names.length; i += 500) chunks.push(names.slice(i, i + 500));
				const results = await Promise.all(chunks.map((c) => this.gl('Delivery Stop', ['delivery_note'], [['delivery_note', 'in', c]], { parent: 'Delivery Trip' })));
				results.forEach((rows) => rows.forEach((r) => used.add(r.delivery_note)));
				return dns.filter((d) => !used.has(d.name)).map((d) => Object.assign({}, d, {
					age_h: moment().diff(moment(d.posting_date + ' ' + (d.posting_time || '00:00:00')), 'hours'),
				})).sort((a, b) => b.age_h - a.age_h);
			});
		}
		forklifts(f) {
			return this.cached('forklifts', () => this.gl('ForkLift',
				['name', 'date', 'warehouse', 'forklift_no', 'driver_name', 'status',
					'loading_trailer', 'loading_dayana', 'loading_pickup', 'loading_container',
					'unloading_trailer', 'unloading_dayana', 'unloading_pickup', 'unloading_container',
					'trailer_expense', 'dayana_expense', 'container_expense', 'pickup_expense',
					'trailer_cleaning', 'dayana_cleaning', 'container_cleaning', 'pickup_cleaning', 'setting'],
				this.bf(f, { date: 'date', wh: 'warehouse', extra: [['docstatus', '<', 2]] }), { order_by: 'date asc' }));
		}
		openMRs(f) {
			return this.cached('openmrs', () => this.gl('Material Request',
				['name', 'material_request_type', 'status', 'workflow_state', 'custom_priority', 'transaction_date', 'schedule_date', 'per_ordered'],
				this.bf(f, { co: 'company', wh: 'set_warehouse', extra: [['status', 'in', OPEN_MR], ['docstatus', '<', 2]] }),
				{ order_by: 'schedule_date asc' }));
		}
		staleWOs(f) {
			return this.cached('stalewos', () => this.gl('Work Order',
				['name', 'production_item', 'item_name', 'qty', 'planned_start_date', 'fg_warehouse'],
				this.bf(f, { co: 'company', wh: 'fg_warehouse', extra: [['status', '=', 'Not Started'], ['planned_start_date', '<', f.today + ' 00:00:00'], ['docstatus', '=', 1]] }),
				{ order_by: 'planned_start_date asc', limit: 1500 }));
		}


		// ---------- click-through maps
		kgo() {
			const f = this.cur, t = f.today, co = f.company ? { company: f.company } : {};
			const rng = (k) => ({ [k]: ['between', [f.from, f.to]] });
			const O = Object.assign;
			const dn = (x) => ['Delivery Note', O({ docstatus: 1, is_return: 0 }, co, x)];
			const trip = (x) => ['Delivery Trip', O({ docstatus: ['<', 2] }, co, x)];
			const mr = (x) => ['Material Request', O({ status: ['in', OPEN_MR], docstatus: ['<', 2] }, co, x)];
			const wo = (x) => ['Work Order', O({}, co, x)];
			const jc = (x) => ['Job Card', O({ docstatus: ['<', 2] }, co, x)];
			const fk = (x) => ['ForkLift', O({ docstatus: ['<', 2] }, rng('date'), x)];
			const openJc = { status: ['in', ['Open', 'Work In Progress', 'On Hold']] };
			const short = ['Bin', { projected_qty: ['<', 0] }];
			return {
				[__('Delivery Notes Today')]: dn({ posting_date: t }),
				[__('Unassigned DNs')]: () => this.switch_tab('delivery'),
				[__('Trips Today')]: trip({ custom_delivery_date: t }),
				[__('Tonnage Today')]: dn({ posting_date: t }),
				[__('Open Mat. Requests')]: mr({}),
				[__('WOs In Process')]: wo({ status: 'In Process' }),
				[__('Stale Work Orders')]: wo({ status: 'Not Started', docstatus: 1, planned_start_date: ['<', t + ' 00:00:00'] }),
				[__('Items in Shortage')]: short,
				[__('DN Value Today')]: dn({ posting_date: t }),
				[__('Trip Earnings Today')]: trip({ custom_delivery_date: t }),
				[__('Draft DNs')]: ['Delivery Note', O({ docstatus: 0 }, co)],
				[__('DNs To Bill')]: dn(O({ status: 'To Bill' }, rng('posting_date'))),
				[__('MRs Created Today')]: ['Material Request', O({ transaction_date: t, docstatus: ['<', 2] }, co)],
				[__('Open Job Cards')]: jc(openJc),
				[__('Receipts Today')]: ['Purchase Receipt', O({ posting_date: t, docstatus: 1 }, co)],
				[__('Stock Entries Today')]: ['Stock Entry', O({ posting_date: t, docstatus: 1 }, co)],
				[__('Trips in Range')]: trip(rng('custom_delivery_date')),
				[__('Completion Rate')]: trip(O({ status: 'Completed' }, rng('custom_delivery_date'))),
				[__('Delivered Rate')]: trip(O({ delivery_status: 'Delivered' }, rng('custom_delivery_date'))),
				[__('Trip Earnings')]: trip(rng('custom_delivery_date')),
				[__('Tonnage Delivered')]: dn(rng('posting_date')),
				[__('Active Forklifts')]: fk({ status: 'Active' }),
				[__('Idle Forklifts')]: fk({ status: 'Idle' }),
				[__('In Workshop')]: fk({ status: 'Workshop' }),
				[__('Total Loaded')]: fk({}),
				[__('Total Unloaded')]: fk({}),
				[__('Forklift Expenses')]: fk({}),
				[__('Washings')]: fk({}),
				[__('Operators')]: fk({}),
				[__('Work Orders')]: wo(rng('planned_start_date')),
				[__('In Process')]: wo(O({ status: 'In Process' }, rng('planned_start_date'))),
				[__('Completed')]: wo(O({ status: 'Completed' }, rng('planned_start_date'))),
				[__('Operating Cost')]: wo(rng('planned_start_date')),
				[__('Process Loss')]: wo(rng('planned_start_date')),
				[__('Overdue MRs')]: mr({ schedule_date: ['<', t] }),
				[__('Stock Value')]: ['Bin', {}],
				[__('Warehouses')]: ['Warehouse', O({ is_group: 0 }, co)],
				[__('Receipts in Range')]: ['Purchase Receipt', O({ docstatus: 1 }, co, rng('posting_date'))],
				[__('Stock Entries')]: ['Stock Entry', O({ docstatus: 1 }, co, rng('posting_date'))],
			};
		}
		gomap() {
			const f = this.cur, co = f.company ? { company: f.company } : {};
			const rng = (k) => ({ [k]: ['between', [f.from, f.to]] });
			const O = Object.assign;
			const dn = (x) => ['Delivery Note', O({ docstatus: 1, is_return: 0 }, co, rng('posting_date'), x)];
			const trip = (x) => ['Delivery Trip', O({ docstatus: ['<', 2] }, co, rng('custom_delivery_date'), x)];
			const mr = (x) => ['Material Request', O({ status: ['in', OPEN_MR], docstatus: ['<', 2] }, co, x)];
			const wo = (x) => ['Work Order', O({}, co, rng('planned_start_date'), x)];
			const jc = (x) => ['Job Card', O({ docstatus: ['<', 2] }, co, rng('posting_date'), x)];
			const fk = (x) => ['ForkLift', O({ docstatus: ['<', 2] }, rng('date'), x)];
			const by = (fn, field) => (k) => fn({ [field]: k });
			return {
				[__('Top Customers by Tonnage')]: by(dn, 'customer'),
				[__('Top Customers by Value')]: by(dn, 'customer'),
				[__('Top Sales Persons')]: by(dn, 'custom_sales_person'),
				[__('By Sales Person')]: by(dn, 'custom_sales_person'),
				[__('DN Status')]: by(dn, 'status'),
				[__('DNs by Location')]: by(dn, 'location'),
				[__('Tonnage by Location')]: by(dn, 'location'),
				[__('Delivery Mode')]: by(dn, 'delivery_mode'),
				[__('Delivery Vehicle')]: by(dn, 'custom_delivery_by'),
				[__('Trip Types')]: by(trip, 'custom_trip_type_'),
				[__('Trip Status')]: by(trip, 'status'),
				[__('Delivery Status')]: by(trip, 'delivery_status'),
				[__('Trips by Source Warehouse')]: by(trip, 'custom_source_warehouse'),
				[__('Trips by Destination')]: by(trip, 'custom_delivery_to_warehouse'),
				[__('Open MRs by Purpose')]: by(mr, 'material_request_type'),
				[__('By Workflow State')]: by(mr, 'workflow_state'),
				[__('By Priority')]: by(mr, 'custom_priority'),
				[__('Work Order Pipeline')]: by(wo, 'status'),
				[__('Work Orders by Warehouse')]: by(wo, 'fg_warehouse'),
				[__('Job Card Status')]: by(jc, 'status'),
				[__('Job Cards by Workstation')]: by(jc, 'workstation'),
				[__('Job Card Time by Operation')]: by(jc, 'operation'),
				[__('Completed Qty by Operation')]: by(jc, 'operation'),
				[__('Top Operators by Volume')]: by(fk, 'driver_name'),
				[__('Setting')]: by(fk, 'setting'),
				[__('Loading vs Unloading by Warehouse')]: by(fk, 'warehouse'),
				[__('Stock Entry Types')]: (k) => ['Stock Entry', O({ docstatus: 1, stock_entry_type: k }, co, rng('posting_date'))],
				[__('Receipt Status')]: (k) => ['Purchase Receipt', O({ docstatus: 1, status: k }, co, rng('posting_date'))],
				[__('Top Suppliers by Value')]: (k) => ['Purchase Receipt', O({ docstatus: 1, supplier: k }, co, rng('posting_date'))],
				[__('Stock Value by Warehouse')]: (k) => ['Bin', { warehouse: k }],
				[__('Stock Value Share')]: (k) => ['Bin', { warehouse: k }],
				[__('Reserved Qty by Warehouse')]: (k) => ['Bin', { warehouse: k }],
				[__('Shortage Lines by Warehouse')]: (k) => ['Bin', { warehouse: k, projected_qty: ['<', 0] }],
			};
		}

		// ---------- alerts strip
		scope_note(f) {
			let $n = this.$root.find('.dmo-scope');
			if (!$n.length) $n = $('<div class="dmo-scope"></div>').insertAfter(this.$root.find('.dmo-filters'));
			$n.text(f.company ? __('Scope') + ': ' + f.company + ' — ' + __('other companies are not included') : __('Scope') + ': ' + __('all companies'));
		}
		async alerts(f) {
			const $a = this.$root.find('.dmo-alerts');
			const co = f.company ? { company: f.company } : {};
			const goMr = () => this.goto('Material Request', Object.assign({ status: ['in', OPEN_MR], docstatus: ['<', 2], schedule_date: ['<', f.today] }, co));
			const defs = [
				[() => this.unassigned(f).then((u) => u.filter((d) => d.age_h >= 24).length), __('DNs no trip >24h'), 'alert', () => this.switch_tab('delivery')],
				[() => this.trips(f).then((t) => t.filter((r) => ['Draft', 'Scheduled', 'In Transit'].includes(r.status) && r.custom_delivery_date < f.today).length), __('old open trips'), 'route',
					() => this.goto('Delivery Trip', Object.assign({ status: ['in', ['Draft', 'Scheduled', 'In Transit']], custom_delivery_date: ['<', f.today], docstatus: ['<', 2] }, co))],
				[() => this.openMRs(f).then((m) => m.filter((x) => x.schedule_date && x.schedule_date < f.today).length), __('overdue MRs'), 'clip', goMr],
				[() => this.staleWOs(f).then((w) => w.length), __('stale WOs'), 'clock', () => this.goto('Work Order', Object.assign({ status: 'Not Started', docstatus: 1, planned_start_date: ['<', f.today + ' 00:00:00'] }, co))],
				[() => this.forklifts(f).then((rows) => { const l = {}; rows.forEach((r) => { l[r.forklift_no || r.name] = r; }); return Object.values(l).filter((r) => r.status === 'Workshop').length; }), __('in workshop'), 'tool', () => this.switch_tab('forklift')],
				[() => this.shortBins(f).then((b) => b.length), __('short items'), 'flame', () => this.goto('Bin', { projected_qty: ['<', 0] })],
			];
			const res = await Promise.all(defs.map((d) => d[0]().catch(() => null)));
			const hot = defs.map((d, i) => ({ n: res[i], label: d[1], icon: d[2], go: d[3] })).filter((x) => x.n);
			$a.empty();
			if (!hot.length) { $a.html(`<span class="dmo-al ok">${ico('check')} ${__('All clear — nothing needs attention')}</span>`); return; }
			hot.forEach((x) => $(`<button type="button" class="dmo-al">${ico(x.icon)}<b>${fmt(x.n)}</b> ${x.label}</button>`).appendTo($a).on('click', x.go));
		}

		// ---------- CSV export for any table card
		add_export($b) {
			const $c = $b.closest('.dmo-card');
			if (!$b.find('table.dmo-t').length || $c.find('.dmo-exp').length) return;
			$('<button type="button" class="dmo-exp" title="CSV">⤓ CSV</button>').appendTo($c.find('.dmo-card-h')).on('click', () => {
				const q = (v) => '"' + String(v).replace(/"/g, '""').replace(/\s+/g, ' ').trim() + '"';
				const rows = [];
				$b.find('table.dmo-t tr').each((_, tr) => rows.push($(tr).children('th,td').map((__i, c) => q(c.textContent)).get().join(',')));
				const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
				const a = document.createElement('a');
				a.href = URL.createObjectURL(blob);
				a.download = (strip($c.find('.dmo-card-t').text()) || 'export').replace(/[^\w؀-ۿ-]+/g, '_') + '.csv';
				document.body.appendChild(a); a.click(); a.remove();
				setTimeout(() => URL.revokeObjectURL(a.href), 2000);
			});
		}

		// ---------- extra datasets
		whs(f) { // leaf warehouses of the company (Bin has no company field)
			return this.cached('whs', async () => {
				if (f.warehouse) return [f.warehouse];
				if (!f.company) return null;
				const r = await this.gl('Warehouse', ['name'], [['company', '=', f.company], ['is_group', '=', 0]], { limit: 0 });
				return r.map((x) => x.name);
			});
		}
		async binF(f, extra) {
			const w = await this.whs(f);
			return (w ? [['warehouse', 'in', w]] : []).concat(extra || []);
		}
		async binAgg(f, groupBy, extra) {
			const flt_ = await this.binF(f, extra);
			return this.gl('Bin', [groupBy, 'sum(actual_qty) as q', 'sum(stock_value) as v', 'sum(reserved_qty) as r', 'sum(projected_qty) as p'], flt_, { group_by: groupBy, limit: 0 });
		}
		shortBins(f) {
			return this.cached('shortbins', async () => this.gl('Bin', ['item_code', 'warehouse', 'actual_qty', 'projected_qty', 'reserved_qty', 'ordered_qty'],
				await this.binF(f, [['projected_qty', '<', 0]]), { order_by: 'projected_qty asc', limit: 1000 }));
		}
		mrItems(f) {
			return this.cached('mritems', async () => {
				const mrs = await this.openMRs(f);
				if (!mrs.length) return [];
				const names = mrs.map((m) => m.name);
				const parts = [];
				for (let i = 0; i < names.length; i += 400) parts.push(names.slice(i, i + 400));
				const res = await Promise.all(parts.map((c) => this.gl('Material Request Item', ['parent', 'item_code', 'item_name', 'brand', 'item_group', 'qty', 'received_qty', 'warehouse'], [['parent', 'in', c]], { parent: 'Material Request', limit: 8000 })));
				return [].concat(...res).map((r) => Object.assign(r, { pend: Math.max(0, flt(r.qty) - flt(r.received_qty)) })).filter((r) => r.pend > 0);
			});
		}
		woRange(f) {
			return this.cached('worange', () => this.gl('Work Order',
				['name', 'production_item', 'item_name', 'qty', 'produced_qty', 'status', 'fg_warehouse', 'planned_start_date', 'planned_end_date',
					'planned_operating_cost', 'actual_operating_cost', 'total_operating_cost', 'process_loss_qty'],
				this.bf(f, { co: 'company', wh: 'fg_warehouse', date: 'planned_start_date', dt: true, extra: [['docstatus', '=', 1]] }), { order_by: 'planned_start_date desc', limit: 3000 }));
		}
		jobCards(f) {
			return this.cached('jobcards', () => this.gl('Job Card',
				['name', 'workstation', 'operation', 'status', 'for_quantity', 'total_completed_qty', 'process_loss_qty', 'total_time_in_mins', 'posting_date'],
				this.bf(f, { co: 'company', date: 'posting_date', extra: [['docstatus', '<', 2]] }), { order_by: 'posting_date desc', limit: 5000 }));
		}
		dpu(f) {
			return this.cached('dpu', () => this.gl('Daily Production Update', ['name', 'date', 'factory', 'completed_qty', 'ot_hours'],
				this.bf(f, { date: 'date', extra: [['docstatus', '<', 2]] }), { order_by: 'date asc' }));
		}
		fdp(f) {
			return this.cached('fdp', () => this.gl('Daily Production Table',
				['date', 'employee', 'branch', 'worked_item', 'target_qty', 'daily_target_qty', 'actual_qty', 'productivity', 'duty_hours', 'ot_hrs', 'ot_amount', 'activity', 'type'],
				[['date', '>=', f.from], ['date', '<=', f.to]], { parent: 'Factory Daily Production', limit: 15000 }));
		}
		stockEntries(f) {
			return this.cached('se', () => this.gl('Stock Entry', ['name', 'posting_date', 'stock_entry_type', 'purpose', 'total_amount'],
				this.bf(f, { co: 'company', date: 'posting_date', extra: [['docstatus', '=', 1]] }), { order_by: 'posting_date desc', limit: 5000 }));
		}
		receipts(f) {
			return this.cached('pr', () => this.gl('Purchase Receipt', ['name', 'posting_date', 'supplier', 'status', 'grand_total', 'per_billed'],
				this.bf(f, { co: 'company', date: 'posting_date', extra: [['docstatus', '=', 1]] }), { order_by: 'posting_date desc', limit: 5000 }));
		}
		async sumq(doctype, field, filters) {
			const r = await this.gl(doctype, [`sum(${field}) as s`], filters, { limit: 0 });
			return flt((r[0] || {}).s);
		}
		K($row, specs) { // specs: [label, icon, fn, legacy-route]
			const map = this.kgo();
			return specs.map((s) => this.kpi($row, s[0], s[2], { icon: s[1], go: map[s[0]] || (s[3] ? [s[3][1], {}] : null) }));
		}
		// chart panel from an async () => Map
		cp($g, title, span, type, mapFn, o) {
			o = o || {};
			const g = this.gomap()[title];
			return this.panel($g, title, { span: span, sub: o.sub }, async ($b) => {
				this.chart_map($b, type, await mapFn(), o.name || '', o.n || 10, g ? (k) => { const r = g(k); if (r) this.goto(r[0], r[1]); } : null);
			});
		}
		// time-series panel; seriesFn(ds) => [{name, values}]
		ts($g, title, span, f, type, seriesFn, o) {
			o = o || {};
			return this.panel($g, title, { span: span, sub: o.sub }, async ($b) => {
				const ds = dates(f.from, f.to, 31);
				const sets = await seriesFn(ds);
				const cfg = { type: type, data: { labels: ds.map((d) => d.slice(5)), datasets: sets } };
				if (type === 'line') cfg.lineOptions = { regionFill: sets.length === 1 ? 1 : 0 };
				if (o.marker > 0) cfg.yMarkers = [{ label: __('Target') + ' ' + fmt(o.marker, 1), value: o.marker, options: { labelPos: 'left' } }];
				if (o.stacked) cfg.barOptions = { stacked: 1 };
				this.chart($b, cfg);
			});
		}
		perDay(rows, dateKey, valFn) {
			return (ds) => ds.map((d) => rows.filter((r) => String(r[dateKey]).slice(0, 10) === d).reduce((a, r) => a + (valFn ? valFn(r) : 1), 0));
		}

		// ====================================================== TAB 1: OVERVIEW
		async tab_overview($p, f) {
			const today = f.today, yday = frappe.datetime.add_days(today, -1);
			const dnF = (d, x) => this.bf(f, { co: 'company', wh: 'set_warehouse', extra: [['posting_date', '=', d], ['docstatus', '=', 1], ['is_return', '=', 0]].concat(x || []) });
			const tripF = (d, x) => this.bf(f, { co: 'company', wh: 'custom_source_warehouse', extra: [['custom_delivery_date', '=', d], ['docstatus', '<', 2]].concat(x || []) });
			const tg = this.targets();
			const $k = this.kpi_row($p);
			const $k2 = this.kpi_row($p);
			const $g = this.grid($p);
			const jobs = [];
			this.panel($g, __('Actions — Data to Fix'), { span: 12, sub: __('click a row to open the records and fix them') }, async ($b) => {
				const co = f.company ? { company: f.company } : {};
				const O = Object.assign, T = f.today, ago = (n) => frappe.datetime.add_days(T, -n);
				const arr = (fl) => Object.keys(fl).map((k) => (Array.isArray(fl[k]) ? [k, fl[k][0], fl[k][1]] : [k, '=', fl[k]]));
				const lst = (dt, fl, order) => Promise.all([
					this.cnt(dt, arr(fl)),
					frappe.xcall('frappe.client.get_list', { doctype: dt, fields: ['name'], filters: arr(fl), order_by: order, limit_page_length: 4 }),
				]).then((x) => ({ n: x[0], rows: x[1].map((r) => [dt, r.name]) }));
				const A = [
					{ ico: 'route', sev: 'bad', dt: 'Delivery Trip', order: 'custom_delivery_date asc', fl: O({ status: 'Scheduled', docstatus: 1, custom_delivery_date: ['<', ago(1)] }, co), title: __('Trips submitted but never completed'), why: __('Set trip status to In Transit / Completed so delivery KPIs are real') },
					{ ico: 'route', sev: 'warn', dt: 'Delivery Trip', order: 'custom_delivery_date asc', fl: O({ status: 'Draft', docstatus: 0, custom_delivery_date: ['<', T] }, co), title: __('Draft trips from past days'), why: __('Submit or delete them') },
					{ ico: 'alert', sev: 'bad', title: __('Delivery Notes with no trip for over 24h'), why: __('Create or link a Delivery Trip'), go: () => this.switch_tab('delivery'),
						load: async () => { const u = (await this.unassigned(f)).filter((d) => d.age_h >= 24); return { n: u.length, rows: u.slice(0, 4).map((d) => ['Delivery Note', d.name]) }; } },
					{ ico: 'clip', sev: 'bad', dt: 'Material Request', order: 'transaction_date asc', fl: O({ status: ['in', OPEN_MR], docstatus: ['<', 2], transaction_date: ['<', ago(90)] }, co), title: __('Open requests older than 90 days'), why: __('Order, receive or close them — stale requests hide real demand') },
					{ ico: 'clip', sev: 'warn', dt: 'Material Request', order: 'schedule_date asc', fl: O({ status: ['in', OPEN_MR], docstatus: ['<', 2], schedule_date: ['<', T], transaction_date: ['>=', ago(90)] }, co), title: __('Overdue requests (last 90 days)'), why: __('Follow up with purchasing / the requester') },
					{ ico: 'clip', sev: 'warn', dt: 'Material Request', order: 'transaction_date asc', fl: O({ status: 'Stopped', docstatus: 1 }, co), title: __('Stopped material requests'), why: __('Cancel them, or re-open if still needed') },
					{ ico: 'clock', sev: 'bad', dt: 'Work Order', order: 'planned_start_date asc', fl: O({ status: 'Not Started', docstatus: 1, planned_start_date: ['<', T + ' 00:00:00'] }, co), title: __('Work orders not started and overdue'), why: __('Start, re-plan or cancel') },
					{ ico: 'cog', sev: 'bad', dt: 'Work Order', order: 'planned_start_date asc', fl: O({ status: 'In Process', docstatus: 1, planned_start_date: ['<', ago(60) + ' 00:00:00'] }, co), title: __('Work orders stuck In Process over 60 days'), why: __('Complete, update progress or close them') },
					{ ico: 'file', sev: 'warn', dt: 'Delivery Note', order: 'posting_date asc', fl: O({ docstatus: 0, posting_date: ['<', T] }, co), title: __('Draft delivery notes from past days'), why: __('Submit or delete') },
					{ ico: 'flame', sev: 'warn', dt: 'Bin', order: 'projected_qty asc', fl: { projected_qty: ['<', 0] }, title: __('Items with negative projected stock'), why: __('Raise a purchase / transfer or correct stock') },
				];
				const res = await Promise.all(A.map((a) => (a.load ? a.load() : lst(a.dt, a.fl, a.order)).catch(() => null)));
				const hot = A.map((a, i) => ({ a: a, r: res[i] })).filter((x) => x.r && x.r.n)
					.sort((p, q) => (p.a.sev === 'bad' ? 0 : 1) - (q.a.sev === 'bad' ? 0 : 1) || q.r.n - p.r.n);
				if (!hot.length) { $b.html('<span class="dmo-al ok">' + ico('check') + ' ' + __('All clear — nothing needs attention') + '</span>'); return; }
				this.sub($b, __('{0} records to fix', [fmt(hot.reduce((t, x) => t + x.r.n, 0))]));
				$b.html(hot.map((x, i) => '<div class="dmo-act"><div class="dmo-act-m"><a class="dmo-act-go" data-i="' + i + '">' + ico(x.a.ico) + ' ' + esc(x.a.title) + ' →</a><div class="m">' + esc(x.a.why) + '</div><div class="dmo-act-ex">' + x.r.rows.map((r) => link(r[0], r[1])).join('') + '</div></div><span class="dmo-act-n ' + x.a.sev + '">' + fmt(x.r.n) + '</span></div>').join(''));
				$b.off('click.act').on('click.act', '.dmo-act-go', (ev) => { const x = hot[$(ev.currentTarget).data('i')]; if (x.a.go) x.a.go(); else this.goto(x.a.dt, x.a.fl); });
			});

			

			jobs.push(...this.K($k, [
				[__('Delivery Notes Today'), 'file', async () => {
					const [a, b] = await Promise.all([this.cnt('Delivery Note', dnF(today)), this.cnt('Delivery Note', dnF(yday))]);
					return { num: a, sub: this.delta(a, b) + this.tpct(a, tg.dns_day) };
				}, ['List', 'Delivery Note']],
				[__('Unassigned DNs'), 'alert', async () => {
					const u = await this.unassigned(f);
					return { num: u.length, sub: __('need a trip'), tone: u.length ? 'orange' : 'green' };
				}],
				[__('Trips Today'), 'route', async () => {
					const [a, done, b] = await Promise.all([this.cnt('Delivery Trip', tripF(today)), this.cnt('Delivery Trip', tripF(today, [['status', '=', 'Completed']])), this.cnt('Delivery Trip', tripF(yday))]);
					return { num: a, sub: `${fmt(done)} ${__('done')} · ` + this.delta(a, b, '') + this.tpct(a, tg.trips_day) };
				}, ['List', 'Delivery Trip']],
				[__('Tonnage Today'), 'scale', async () => {
					const sum = (d) => this.sumq('Delivery Note', 'total_net_weight', dnF(d)).then((v) => v / 1000);
					const [a, b] = await Promise.all([sum(today), sum(yday)]);
					return { num: a, dec: 1, suffix: ' t', sub: this.delta(a, b) + this.tpct(a, tg.tons_day) };
				}],
				[__('Open Mat. Requests'), 'clip', async () => {
					const n = await this.cnt('Material Request', this.bf(f, { co: 'company', wh: 'set_warehouse', extra: [['status', 'in', OPEN_MR], ['docstatus', '<', 2]] }));
					return { num: n, sub: __('pending / partial'), tone: n ? 'orange' : 'green' };
				}, ['List', 'Material Request']],
				[__('WOs In Process'), 'cog', async () => {
					const n = await this.cnt('Work Order', this.bf(f, { co: 'company', wh: 'fg_warehouse', extra: [['status', '=', 'In Process']] }));
					return { num: n, sub: __('on the floor') };
				}, ['List', 'Work Order']],
				[__('Stale Work Orders'), 'clock', async () => {
					const n = (await this.staleWOs(f)).length;
					return { num: n, sub: __('not started, overdue'), tone: n ? 'red' : 'green' };
				}],
				[__('Items in Shortage'), 'flame', async () => {
					const n = (await this.shortBins(f)).length;
					return { num: n, sub: __('projected qty < 0'), tone: n ? 'red' : 'green' };
				}],
			]));

			jobs.push(...this.K($k2, [
				[__('DN Value Today'), 'cash', async () => {
					const [a, b] = await Promise.all([this.sumq('Delivery Note', 'grand_total', dnF(today)), this.sumq('Delivery Note', 'grand_total', dnF(yday))]);
					return { num: a, sub: this.delta(a, b), suffix: '' };
				}],
				[__('Trip Earnings Today'), 'truck', async () => {
					const a = await this.sumq('Delivery Trip', 'custom_total_amount_earned', tripF(today));
					return { num: a, sub: __('SAR') + this.tpct(a, tg.earn_day) };
				}],
				[__('Draft DNs'), 'file', async () => {
					const n = await this.cnt('Delivery Note', this.bf(f, { co: 'company', wh: 'set_warehouse', extra: [['docstatus', '=', 0]] }));
					return { num: n, sub: __('not submitted'), tone: n ? 'orange' : 'green' };
				}],
				[__('DNs To Bill'), 'tag', async () => {
					const n = await this.cnt('Delivery Note', this.bf(f, { co: 'company', wh: 'set_warehouse', date: 'posting_date', extra: [['docstatus', '=', 1], ['status', '=', 'To Bill'], ['is_return', '=', 0]] }));
					return { num: n, sub: __('in range') };
				}],
				[__('MRs Created Today'), 'cart', async () => {
					const n = await this.cnt('Material Request', this.bf(f, { co: 'company', extra: [['transaction_date', '=', today], ['docstatus', '<', 2]] }));
					return { num: n, sub: __('all purposes') };
				}],
				[__('Open Job Cards'), 'tool', async () => {
					const n = await this.cnt('Job Card', this.bf(f, { co: 'company', extra: [['status', 'in', ['Open', 'Work In Progress', 'On Hold']], ['docstatus', '<', 2]] }));
					return { num: n, sub: __('open / WIP / hold') };
				}],
				[__('Receipts Today'), 'box', async () => {
					const n = await this.cnt('Purchase Receipt', this.bf(f, { co: 'company', extra: [['posting_date', '=', today], ['docstatus', '=', 1]] }));
					return { num: n, sub: __('purchase receipts') };
				}],
				[__('Stock Entries Today'), 'layers', async () => {
					const n = await this.cnt('Stock Entry', this.bf(f, { co: 'company', extra: [['posting_date', '=', today], ['docstatus', '=', 1]] }));
					return { num: n, sub: __('submitted') };
				}],
			]));

			this.ts($g, __('Delivery Notes per Day'), 6, f, 'line', async (ds) => {
				const rows = await this.gl('Delivery Note', ['posting_date', 'count(name) as c'], this.bf(f, { co: 'company', date: 'posting_date', wh: 'set_warehouse', extra: [['docstatus', '=', 1], ['is_return', '=', 0]] }), { group_by: 'posting_date', limit: 0 });
				const m = {}; rows.forEach((r) => { m[r.posting_date] = r.c; });
				return [{ name: __('Delivery Notes'), values: ds.map((d) => m[d] || 0) }];
			}, { marker: tg.dns_day });

			this.panel($g, __('Attention Needed'), { span: 6, sub: __('top 5 each') }, async ($b) => {
				const [un, mr, wo] = await Promise.all([this.unassigned(f), this.openMRs(f), this.staleWOs(f)]);
				const col = (title, items) => `<div><h6>${title}</h6><ul class="dmo-list">${items || `<li><span class="m">${__('All clear')}</span></li>`}</ul></div>`;
				const a = un.slice(0, 5).map((d) => `<li><span>${link('Delivery Note', d.name)}<br><span class="m">${esc(d.customer)}</span></span><span class="m">${d.age_h}${unit('h')}</span></li>`).join('');
				const b = mr.filter((m) => m.schedule_date && m.schedule_date < f.today).slice(0, 5)
					.map((m) => `<li><span>${link('Material Request', m.name)}<br><span class="m">${esc(m.material_request_type)}</span></span><span class="m">${daysBetween(m.schedule_date)}${unit('d')}</span></li>`).join('');
				const c = wo.slice(0, 5).map((w) => `<li><span>${link('Work Order', w.name)}<br><span class="m">${esc(w.item_name || w.production_item)}</span></span><span class="m">${daysBetween(w.planned_start_date)}${unit('d')}</span></li>`).join('');
				$b.html(`<div class="dmo-att">${col(__('Unassigned DNs'), a)}${col(__('Overdue MRs'), b)}${col(__('Stale WOs'), c)}</div>`);
			});

			this.ts($g, __('Delivery Value per Day'), 6, f, 'bar', async (ds) => {
				const d = await this.dns(f);
				return [{ name: __('SAR'), values: this.perDay(d, 'posting_date', (r) => flt(r.grand_total))(ds).map((v) => Math.round(v)) }];
			});
			this.ts($g, __('Tonnage Delivered per Day'), 6, f, 'line', async (ds) => {
				const d = await this.dns(f);
				return [{ name: __('Tonnes'), values: this.perDay(d, 'posting_date', (r) => flt(r.total_net_weight) / 1000)(ds).map((v) => Math.round(v * 10) / 10) }];
			}, { marker: tg.tons_day });

			this.cp($g, __('DN Status'), 3, 'donut', async () => tally(await this.dns(f), (r) => r.status || '—'));
			this.cp($g, __('DNs by Location'), 3, 'donut', async () => tally(await this.dns(f), (r) => r.location || '—'), { n: 6 });
			this.cp($g, __('DNs by Hour of Day'), 6, 'bar', async () => {
				const m = new Map();
				for (let h = 6; h <= 22; h++) m.set(String(h).padStart(2, '0'), 0);
				(await this.dns(f)).forEach((r) => { const h = String(r.posting_time || '').slice(0, 2); if (m.has(h)) m.set(h, m.get(h) + 1); });
				return m;
			}, { name: __('Delivery Notes'), n: 20 });

			this.cp($g, __('Top Customers by Tonnage'), 6, 'bar', async () => tally(await this.dns(f), (r) => r.customer || '—', (r) => Math.round(flt(r.total_net_weight) / 100) / 10), { name: __('Tonnes'), n: 8, sub: __('tonnes') });
			this.cp($g, __('Top Sales Persons'), 6, 'bar', async () => tally(await this.dns(f), (r) => r.custom_sales_person || '—', (r) => flt(r.grand_total)), { name: __('SAR'), n: 8, sub: __('delivery value') });

			this.panel($g, __('Latest Delivery Notes'), { span: 6, sub: __('last 15') }, async ($b) => {
				$b.html(table([
					{ l: __('DN'), v: (r) => link('Delivery Note', r.name) },
					{ l: __('Customer'), v: (r) => blank(r.customer) },
					{ l: __('Date'), v: (r) => blank(r.posting_date) },
					{ l: __('Net Wt (kg)'), cls: 'num', v: (r) => fmt(r.total_net_weight) },
					{ l: __('Value'), cls: 'num', v: (r) => fmt(r.grand_total) },
					{ l: __('Status'), v: (r) => badge(r.status) },
				], (await this.dns(f)).slice(0, 15)));
			});
			this.panel($g, __('Latest Material Requests'), { span: 6, sub: __('open, by due date') }, async ($b) => {
				$b.html(table([
					{ l: __('MR'), v: (r) => link('Material Request', r.name) },
					{ l: __('Purpose'), v: (r) => blank(r.material_request_type) },
					{ l: __('Due'), v: (r) => blank(r.schedule_date) },
					{ l: __('State'), v: (r) => badge(r.workflow_state || r.status) },
					{ l: __('% Ordered'), v: (r) => progress(flt(r.per_ordered)) },
				], (await this.openMRs(f)).slice(0, 15)));
			});

			await Promise.all(jobs);
		}

		// ====================================================== TAB 2: DELIVERY & FLEET
		async tab_delivery($p, f) {
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const jobs = this.K($k, [
				[__('Trips in Range'), 'route', async () => {
					const pf = this.prevF(f);
					const [t, p] = await Promise.all([this.trips(f), this.cnt('Delivery Trip', this.bf(pf, { co: 'company', date: 'custom_delivery_date', wh: 'custom_source_warehouse', extra: [['docstatus', '<', 2]] }))]);
					return { num: t.length, sub: this.delta(t.length, p, __('vs prev period')) };
				}, ['List', 'Delivery Trip']],
				[__('Completion Rate'), 'check', async () => {
					const t = await this.trips(f);
					const d = t.filter((r) => r.status === 'Completed').length;
					return { num: t.length ? (d / t.length) * 100 : 0, dec: 0, suffix: '%', sub: `${fmt(d)} ${__('completed')}${d === 0 && t.length ? ' · ' + __('trip status not updated in ERP') : ''}` };
				}],
				[__('Delivered Rate'), 'truck', async () => {
					const t = await this.trips(f);
					const d = t.filter((r) => r.delivery_status === 'Delivered').length;
					return { num: t.length ? (d / t.length) * 100 : 0, suffix: '%', sub: `${fmt(d)} ${__('delivered')}` };
				}],
				[__('Trip Earnings'), 'cash', async () => {
					const pf = this.prevF(f);
					const [t, p] = await Promise.all([this.trips(f), this.sumq('Delivery Trip', 'custom_total_amount_earned', this.bf(pf, { co: 'company', date: 'custom_delivery_date', wh: 'custom_source_warehouse', extra: [['docstatus', '<', 2]] }))]);
					const n = t.reduce((a, r) => a + flt(r.custom_total_amount_earned), 0);
					const dnE = t.filter((r) => r.custom_trip_type_ === 'Delivery Note').reduce((a, r) => a + flt(r.custom_total_amount_earned), 0); return { num: n, sub: this.delta(n, p, __('vs prev period')) + ' · ' + __('Delivery trips only') + ' ' + fmt(dnE) };
				}],
				[__('Active Drivers'), 'users', async () => ({ num: new Set((await this.trips(f)).map((r) => r.driver_name).filter(Boolean)).size, sub: __('with trips') })],
				[__('Vehicles Used'), 'truck', async () => ({ num: new Set((await this.trips(f)).map((r) => r.vehicle).filter(Boolean)).size, sub: __('distinct') })],
				[__('Tonnage Delivered'), 'scale', async () => {
					const pf = this.prevF(f);
					const [d, p] = await Promise.all([this.dns(f), this.sumq('Delivery Note', 'total_net_weight', this.bf(pf, { co: 'company', date: 'posting_date', wh: 'set_warehouse', extra: [['docstatus', '=', 1], ['is_return', '=', 0]] }))]);
					const n = d.reduce((a, r) => a + flt(r.total_net_weight), 0) / 1000;
					return { num: n, dec: 1, suffix: ' t', sub: this.delta(n, p / 1000, __('vs prev period')) };
				}],
				[__('Unassigned DNs'), 'alert', async () => {
					const u = await this.unassigned(f);
					return { num: u.length, sub: __('need a trip'), tone: u.length ? 'orange' : 'green' };
				}],
			]);

			this.panel($g, __('Unassigned Deliveries Queue'), { span: 12 }, async ($b) => {
				const u = await this.unassigned(f);
				this.sub($b, __('{0} vehicle DNs with no trip', [u.length]));
				$b.html(table([
					{ l: __('Delivery Note'), v: (r) => link('Delivery Note', r.name) },
					{ l: __('Customer'), v: (r) => blank(r.customer) },
					{ l: __('Date'), v: (r) => blank(r.posting_date) },
					{ l: __('Age (h)'), cls: 'num', v: (r) => fmt(r.age_h) },
					{ l: __('Net Wt (kg)'), cls: 'num', v: (r) => fmt(r.total_net_weight, 1) },
					{ l: __('Value'), cls: 'num', v: (r) => fmt(r.grand_total) },
					{ l: __('Mode'), v: (r) => blank(r.delivery_mode) },
					{ l: __('Location'), v: (r) => blank(r.location) },
					{ l: __('Sales Person'), v: (r) => blank(r.custom_sales_person) },
				], u.slice(0, 50), { empty: __('Every vehicle delivery has a trip — nothing waiting') }));
				$(`<div class="dmo-more"><a href="#" class="dmo-newtrip">+ ${__('New Delivery Trip')}</a></div>`).appendTo($b).on('click', 'a', (ev) => {
					ev.preventDefault();
					frappe.new_doc('Delivery Trip', f.company ? { company: f.company } : {});
				});
			});

			this.panel($g, __('Trips per Driver per Day'), { span: 6 }, async ($b) => {
				const t = await this.trips(f);
				const ds = dates(f.from, f.to, 31);
				const top = sortedEntries(tally(t, (r) => r.driver_name || '—'), 8).map((x) => x[0]);
				this.chart($b, { type: 'bar', data: { labels: ds.map((d) => d.slice(5)), datasets: top.map((d) => ({ name: d, values: ds.map((day) => t.filter((r) => (r.driver_name || '—') === d && r.custom_delivery_date === day).length) })) }, barOptions: { stacked: 1 } });
			});
			this.cp($g, __('Trip Types'), 3, 'donut', async () => tally(await this.trips(f), (r) => r.custom_trip_type_ || '—'));
			this.cp($g, __('Trip Status'), 3, 'donut', async () => tally(await this.trips(f), (r) => r.status || '—'));

			this.cp($g, __('Delivery Status'), 3, 'percentage', async () => tally(await this.trips(f), (r) => r.delivery_status || '—'));
			this.cp($g, __('Delivery Vehicle'), 3, 'donut', async () => tally(await this.dns(f), (r) => r.custom_delivery_by || '—'));
			this.panel($g, __('Avg Idle per Trip (min)'), { span: 6 }, async ($b) => {
				const t = await this.trips(f);
				const mins = (a, b) => (a && b ? moment(b).diff(moment(a), 'minutes') : null);
				const per = {}; let skipped = 0;
				t.forEach((r) => {
					const w = mins(r.custom_driver_reporting_time__at_warehouse, r.departure_time);
					const s = mins(r.custom_delivered_time, r.custom_driver__out_of_site);
					if (w === null || s === null || w < 0 || s < 0 || w > 720 || s > 720) { skipped++; return; }
					const k = r.driver_name || '—';
					per[k] = per[k] || { w: 0, s: 0, n: 0 };
					per[k].w += w; per[k].s += s; per[k].n++;
				});
				const names = Object.keys(per).sort((a, b) => (per[b].w + per[b].s) / per[b].n - (per[a].w + per[a].s) / per[a].n).slice(0, 10);
				this.sub($b, skipped ? __('{0} trips skipped (bad times)', [skipped]) : '');
				this.chart($b, { type: 'bar', barOptions: { stacked: 1 }, data: { labels: names, datasets: [
					{ name: __('Warehouse idle'), values: names.map((n) => Math.round(per[n].w / per[n].n)) },
					{ name: __('Site idle'), values: names.map((n) => Math.round(per[n].s / per[n].n)) },
				] } });
			});

			this.panel($g, __('Driver Scoreboard'), { span: 6, sub: __('range') }, async ($b) => {
				const per = {};
				(await this.trips(f)).forEach((r) => {
					const k = r.driver_name || '—';
					per[k] = per[k] || { d: k, n: 0, done: 0, amt: 0, days: new Set() };
					per[k].n++; if (r.status === 'Completed') per[k].done++;
					per[k].amt += flt(r.custom_total_amount_earned); per[k].days.add(r.custom_delivery_date);
				});
				$b.html(table([
					{ l: __('Driver'), v: (r) => blank(r.d) },
					{ l: __('Trips'), cls: 'num', v: (r) => fmt(r.n) },
					{ l: __('Days'), cls: 'num', v: (r) => r.days.size },
					{ l: __('Completed'), v: (r) => progress((r.done / r.n) * 100) },
					{ l: __('Earned'), cls: 'num', v: (r) => fmt(r.amt) },
					{ l: __('Avg/Trip'), cls: 'num', v: (r) => fmt(r.amt / r.n) },
				], Object.values(per).sort((a, b) => b.n - a.n)));
			});
			this.panel($g, __('Vehicle Scoreboard'), { span: 6, sub: __('range') }, async ($b) => {
				const per = {};
				(await this.trips(f)).forEach((r) => {
					const k = r.vehicle || '—';
					per[k] = per[k] || { v: k, n: 0, amt: 0, days: new Set(), drivers: new Set() };
					per[k].n++; per[k].amt += flt(r.custom_total_amount_earned); per[k].days.add(r.custom_delivery_date); if (r.driver_name) per[k].drivers.add(r.driver_name);
				});
				$b.html(table([
					{ l: __('Vehicle'), v: (r) => blank(r.v) },
					{ l: __('Trips'), cls: 'num', v: (r) => fmt(r.n) },
					{ l: __('Days Used'), cls: 'num', v: (r) => r.days.size },
					{ l: __('Drivers'), cls: 'num', v: (r) => r.drivers.size },
					{ l: __('Earned'), cls: 'num', v: (r) => fmt(r.amt) },
				], Object.values(per).sort((a, b) => b.n - a.n)));
			});

			this.ts($g, __('Trip Earnings per Day'), 6, f, 'bar', async (ds) => [{ name: __('SAR'), values: this.perDay(await this.trips(f), 'custom_delivery_date', (r) => flt(r.custom_total_amount_earned))(ds).map(Math.round) }], { marker: this.targets().earn_day });
			this.cp($g, __('Trips by Source Warehouse'), 3, 'donut', async () => tally(await this.trips(f), (r) => r.custom_source_warehouse || '—'), { n: 6 });
			this.cp($g, __('Trips by Destination'), 3, 'donut', async () => tally(await this.trips(f), (r) => r.custom_delivery_to_warehouse || '—'), { n: 6 });

			this.panel($g, __('Top Routes'), { span: 6, sub: __('from → to') }, async ($b) => {
				const per = tally(await this.trips(f), (r) => `${r.custom_source_warehouse || '—'} → ${r.custom_delivery_to_warehouse || '—'}`);
				$b.html(table([
					{ l: __('Route'), v: (r) => blank(r[0]) },
					{ l: __('Trips'), cls: 'num', v: (r) => fmt(r[1]) },
				], sortedEntries(per, 12)));
			});
			this.cp($g, __('Departures by Hour'), 6, 'bar', async () => {
				const m = new Map();
				for (let h = 5; h <= 22; h++) m.set(String(h).padStart(2, '0'), 0);
				(await this.trips(f)).forEach((r) => { const h = r.departure_time ? moment(r.departure_time).format('HH') : ''; if (m.has(h)) m.set(h, m.get(h) + 1); });
				return m;
			}, { name: __('Trips'), n: 20 });

			this.cp($g, __('Delivery Mode'), 3, 'bar', async () => tally(await this.dns(f), (r) => r.delivery_mode || '—'), { name: __('Delivery Notes'), n: 8 });
			this.cp($g, __('Tonnage by Location'), 3, 'bar', async () => tally(await this.dns(f), (r) => r.location || '—', (r) => Math.round(flt(r.total_net_weight) / 100) / 10), { name: __('Tonnes'), n: 8 });
			this.cp($g, __('Top Customers by Value'), 3, 'bar', async () => tally(await this.dns(f), (r) => r.customer || '—', (r) => Math.round(flt(r.grand_total))), { name: __('SAR'), n: 8 });
			this.cp($g, __('By Sales Person'), 3, 'donut', async () => tally(await this.dns(f), (r) => r.custom_sales_person || '—'), { n: 6 });

			this.panel($g, __('Vehicle Utilisation (trips per day)'), { span: 12 }, async ($b) => {
				const t = await this.trips(f);
				const days = dates(f.from, f.to, 14);
				const rows = sortedEntries(tally(t, (r) => r.vehicle || '—'), 12).map((x) => {
					const cells = days.map((d) => t.filter((r) => (r.vehicle || '—') === x[0] && r.custom_delivery_date === d).length);
					return { v: x[0], cells: cells, tot: cells.reduce((a, b) => a + b, 0) };
				});
				this.sub($b, __('last {0} days in range', [days.length]));
				const head = `<th>${__('Vehicle')}</th>` + days.map((d) => `<th class="num">${d.slice(8)}</th>`).join('') + `<th class="num">${__('Total')}</th>`;
				const body = rows.map((r) => `<tr><td>${esc(r.v)}</td>${r.cells.map((n) => `<td class="h" style="${n ? `background:rgba(65,105,225,${Math.min(0.18 + 0.14 * n, 0.9)});color:${n > 3 ? '#fff' : 'inherit'}` : ''}">${n || ''}</td>`).join('')}<td class="num"><b>${r.tot}</b></td></tr>`).join('');
				$b.html(rows.length ? `<div class="dmo-scroll"><table class="dmo-t dmo-heat"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` : `<div class="dmo-empty">${__('No trips in range')}</div>`);
			});

			this.panel($g, __('Trip Log'), { span: 12, sub: __('latest 50') }, async ($b) => {
				$b.html(table([
					{ l: __('Trip'), v: (r) => link('Delivery Trip', r.name) },
					{ l: __('Date'), v: (r) => blank(r.custom_delivery_date) },
					{ l: __('Type'), v: (r) => blank(r.custom_trip_type_) },
					{ l: __('Driver'), v: (r) => blank(r.driver_name) },
					{ l: __('Vehicle'), v: (r) => blank(r.vehicle) },
					{ l: __('From → To'), v: (r) => `${blank(r.custom_source_warehouse)} → ${blank(r.custom_delivery_to_warehouse)}` },
					{ l: __('Status'), v: (r) => badge(r.status) },
					{ l: __('Delivered?'), v: (r) => badge(r.delivery_status) },
					{ l: __('Amount'), cls: 'num', v: (r) => fmt(flt(r.custom_total_amount_earned)) },
				], (await this.trips(f)).slice(0, 50)));
			});
			await Promise.all(jobs);
		}

		// ====================================================== TAB 3: WAREHOUSE & FORKLIFT
		async tab_forklift($p, f) {
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const load = (r) => flt(r.loading_trailer) + flt(r.loading_dayana) + flt(r.loading_pickup) + flt(r.loading_container);
			const unload = (r) => flt(r.unloading_trailer) + flt(r.unloading_dayana) + flt(r.unloading_pickup) + flt(r.unloading_container);
			const expense = (r) => flt(r.trailer_expense) + flt(r.dayana_expense) + flt(r.pickup_expense) + flt(r.container_expense);
			const wash = (r) => flt(r.trailer_cleaning) + flt(r.dayana_cleaning) + flt(r.pickup_cleaning) + flt(r.container_cleaning);
			const latestMap = (rows) => { const l = {}; rows.forEach((r) => { l[r.forklift_no || r.name] = r; }); return l; };
			const statusCount = async (s) => Object.values(latestMap(await this.forklifts(f))).filter((r) => r.status === s).length;

			const jobs = this.K($k, [
				[__('Active Forklifts'), 'check', async () => ({ num: await statusCount('Active'), sub: __('latest status') })],
				[__('Idle Forklifts'), 'clock', async () => ({ num: await statusCount('Idle'), sub: __('latest status') })],
				[__('In Workshop'), 'tool', async () => { const n = await statusCount('Workshop'); return { num: n, sub: __('latest status'), tone: n ? 'red' : 'green' }; }],
				[__('Total Loaded'), 'box', async () => ({ num: (await this.forklifts(f)).reduce((a, r) => a + load(r), 0), sub: __('vehicles loaded') })],
				[__('Total Unloaded'), 'stack', async () => ({ num: (await this.forklifts(f)).reduce((a, r) => a + unload(r), 0), sub: __('vehicles unloaded') })],
				[__('Forklift Expenses'), 'cash', async () => { const n = (await this.forklifts(f)).reduce((a, r) => a + expense(r), 0); return { num: n, sub: n ? __('SAR · range') : __('no entries recorded in range') }; }],
				[__('Washings'), 'drop', async () => { const n = (await this.forklifts(f)).reduce((a, r) => a + wash(r), 0); return { num: n, sub: n ? __('vehicles washed') : __('no entries recorded in range') }; }],
				[__('Operators'), 'users', async () => ({ num: new Set((await this.forklifts(f)).map((r) => r.driver_name).filter(Boolean)).size, sub: __('with records') })],
			]);

			this.panel($g, __('Forklift Status'), { span: 3 }, async ($b) => {
				const l = latestMap(await this.forklifts(f));
				const c = { Active: 0, Idle: 0, Workshop: 0 };
				Object.values(l).forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
				const total = await this.cnt('Forklift list', {});
				this.sub($b, __('{0} registered', [total]));
				$b.html(`<div class="dmo-trio"><div class="g"><b>${c.Active}</b><span>${__('Active')}</span></div><div class="o"><b>${c.Idle}</b><span>${__('Idle')}</span></div><div class="r"><b>${c.Workshop}</b><span>${__('Workshop')}</span></div></div>`);
			});
			this.ts($g, __('Daily Movements'), 3, f, 'line', async (ds) => [{ name: __('Movements'), values: this.perDay(await this.forklifts(f), 'date', (r) => load(r) + unload(r))(ds) }]);
			this.panel($g, __('Loading vs Unloading by Warehouse'), { span: 6 }, async ($b) => {
				const rows = await this.forklifts(f);
				const L = tally(rows, (r) => r.warehouse || '—', load), U = tally(rows, (r) => r.warehouse || '—', unload);
				const names = sortedEntries(L, 10).map((x) => x[0]);
				this.chart($b, { type: 'bar', data: { labels: names, datasets: [{ name: __('Loading'), values: names.map((n) => L.get(n) || 0) }, { name: __('Unloading'), values: names.map((n) => U.get(n) || 0) }] } });
			});

			this.ts($g, __('Handled by Vehicle Type per Day'), 6, f, 'bar', async (ds) => {
				const rows = await this.forklifts(f);
				const s = (a, b) => this.perDay(rows, 'date', (r) => flt(r[a]) + flt(r[b]))(ds);
				return [{ name: __('Trailer'), values: s('loading_trailer', 'unloading_trailer') }, { name: __('Dayana'), values: s('loading_dayana', 'unloading_dayana') }, { name: __('Pick Up'), values: s('loading_pickup', 'unloading_pickup') }, { name: __('Container'), values: s('loading_container', 'unloading_container') }];
			}, { stacked: true });
			this.panel($g, __('Operator Productivity'), { span: 6 }, async ($b) => {
				const per = {};
				(await this.forklifts(f)).forEach((r) => {
					const k = (r.driver_name || '—') + '|' + (r.forklift_no || '—');
					per[k] = per[k] || { driver: r.driver_name, fk: r.forklift_no, wh: r.warehouse, l: 0, u: 0, days: new Set() };
					per[k].l += load(r); per[k].u += unload(r); per[k].days.add(r.date);
				});
				$b.html(table([
					{ l: __('Operator'), v: (r) => blank(r.driver) },
					{ l: __('Forklift'), v: (r) => blank(r.fk) },
					{ l: __('Warehouse'), v: (r) => blank(r.wh) },
					{ l: __('Load'), cls: 'num', v: (r) => fmt(r.l) },
					{ l: __('Unload'), cls: 'num', v: (r) => fmt(r.u) },
					{ l: __('Total'), cls: 'num', v: (r) => `<b>${fmt(r.l + r.u)}</b>` },
					{ l: __('Days'), cls: 'num', v: (r) => r.days.size },
					{ l: __('Avg/day'), cls: 'num', v: (r) => fmt((r.l + r.u) / (r.days.size || 1), 1) },
				], Object.values(per).sort((a, b) => b.l + b.u - (a.l + a.u))));
			});

			const byType = (fn) => new Map([[__('Trailer'), fn('trailer')], [__('Dayana'), fn('dayana')], [__('Pick Up'), fn('pickup')], [__('Container'), fn('container')]]);
			this.cp($g, __('Expenses by Vehicle Type'), 3, 'donut', async () => { const r = await this.forklifts(f); return byType((k) => r.reduce((a, x) => a + flt(x[k + '_expense']), 0)); });
			this.cp($g, __('Washings by Vehicle Type'), 3, 'donut', async () => { const r = await this.forklifts(f); return byType((k) => r.reduce((a, x) => a + flt(x[k + '_cleaning']), 0)); });
			this.cp($g, __('Handled by Vehicle Type'), 3, 'donut', async () => { const r = await this.forklifts(f); return byType((k) => r.reduce((a, x) => a + flt(x['loading_' + k]) + flt(x['unloading_' + k]), 0)); });
			this.cp($g, __('Setting'), 3, 'donut', async () => tally((await this.forklifts(f)).filter((r) => r.setting), (r) => r.setting));

			this.ts($g, __('Expenses per Day'), 6, f, 'bar', async (ds) => [{ name: __('SAR'), values: this.perDay(await this.forklifts(f), 'date', expense)(ds) }]);
			this.cp($g, __('Top Operators by Volume'), 6, 'bar', async () => tally(await this.forklifts(f), (r) => r.driver_name || '—', (r) => load(r) + unload(r)), { name: __('Vehicles handled'), n: 10 });

			this.ts($g, __('Loading vs Unloading per Day'), 6, f, 'line', async (ds) => {
				const rows = await this.forklifts(f);
				return [{ name: __('Loading'), values: this.perDay(rows, 'date', load)(ds) }, { name: __('Unloading'), values: this.perDay(rows, 'date', unload)(ds) }];
			});
			this.panel($g, __('Warehouse Summary'), { span: 6 }, async ($b) => {
				const per = {};
				(await this.forklifts(f)).forEach((r) => {
					const k = r.warehouse || '—';
					per[k] = per[k] || { w: k, l: 0, u: 0, e: 0, ws: 0, fk: new Set() };
					per[k].l += load(r); per[k].u += unload(r); per[k].e += expense(r); per[k].ws += wash(r); if (r.forklift_no) per[k].fk.add(r.forklift_no);
				});
				$b.html(table([
					{ l: __('Warehouse'), v: (r) => blank(r.w) },
					{ l: __('Forklifts'), cls: 'num', v: (r) => r.fk.size },
					{ l: __('Load'), cls: 'num', v: (r) => fmt(r.l) },
					{ l: __('Unload'), cls: 'num', v: (r) => fmt(r.u) },
					{ l: __('Expense'), cls: 'num', v: (r) => fmt(r.e) },
					{ l: __('Washes'), cls: 'num', v: (r) => fmt(r.ws) },
				], Object.values(per).sort((a, b) => b.l + b.u - (a.l + a.u))));
			});

			this.panel($g, __('Forklift Registry'), { span: 6 }, async ($b) => {
				const [reg, rows] = await Promise.all([this.gl('Forklift list', ['name', 'forklift_no', 'driver_name', 'vehicle_maker', 'vehicle_model'], [], { limit: 200 }), this.forklifts(f)]);
				const l = latestMap(rows);
				$b.html(table([
					{ l: __('Forklift'), v: (r) => blank(r.forklift_no || r.name) },
					{ l: __('Maker / Model'), v: (r) => blank([r.vehicle_maker, r.vehicle_model].filter(Boolean).join(' ')) },
					{ l: __('Assigned Driver'), v: (r) => blank(r.driver_name) },
					{ l: __('Last Status'), v: (r) => badge((l[r.forklift_no] || {}).status) },
					{ l: __('Last Seen'), v: (r) => blank((l[r.forklift_no] || {}).date) },
				], reg));
			});
			this.panel($g, __('Forklift Utilisation'), { span: 6, sub: __('days with records') }, async ($b) => {
				const per = {};
				(await this.forklifts(f)).forEach((r) => {
					const k = r.forklift_no || '—';
					per[k] = per[k] || { k: k, days: new Set(), active: new Set(), mv: 0 };
					per[k].days.add(r.date); if (r.status === 'Active') per[k].active.add(r.date); per[k].mv += load(r) + unload(r);
				});
				const span = Math.max(1, daysBetween(f.from, f.to) + 1);
				$b.html(table([
					{ l: __('Forklift'), v: (r) => blank(r.k) },
					{ l: __('Active Days'), cls: 'num', v: (r) => r.active.size },
					{ l: __('Movements'), cls: 'num', v: (r) => fmt(r.mv) },
					{ l: __('Utilisation'), v: (r) => progress((r.active.size / span) * 100) },
				], Object.values(per).sort((a, b) => b.active.size - a.active.size)));
			});
			await Promise.all(jobs);
		}

		// ====================================================== TAB 4: PRODUCTION
		async tab_production($p, f) {
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const jobs = this.K($k, [
				[__('Work Orders'), 'cog', async () => ({ num: (await this.woRange(f)).length, sub: __('planned in range') }), ['List', 'Work Order']],
				[__('In Process'), 'tool', async () => ({ num: (await this.woRange(f)).filter((w) => w.status === 'In Process').length, sub: __('in range') })],
				[__('Completed'), 'check', async () => ({ num: (await this.woRange(f)).filter((w) => w.status === 'Completed').length, sub: __('in range') })],
				[__('Produced Qty'), 'box', async () => ({ num: (await this.woRange(f)).reduce((a, w) => a + flt(w.produced_qty), 0), sub: __('across WOs') })],
				[__('Plan Attainment'), 'trend', async () => {
					const w = await this.woRange(f);
					const q = w.reduce((a, x) => a + flt(x.qty), 0), p = w.reduce((a, x) => a + flt(x.produced_qty), 0);
					return { num: q ? (p / q) * 100 : 0, suffix: '%', sub: __('produced / planned') };
				}],
				[__('Process Loss'), 'alert', async () => { const n = (await this.woRange(f)).reduce((a, w) => a + flt(w.process_loss_qty), 0); return { num: n, sub: n ? __('qty lost') : __('no entries recorded in range') }; }],
				[__('Open Job Cards'), 'clip', async () => ({ num: (await this.jobCards(f)).filter((j) => ['Open', 'Work In Progress', 'On Hold'].includes(j.status)).length, sub: __('in range') })],
				[__('Operating Cost'), 'cash', async () => ({ num: (await this.woRange(f)).reduce((a, w) => a + flt(w.total_operating_cost), 0), sub: __('SAR · total') })],
			]);

			this.panel($g, __('Work Order Pipeline'), { span: 6, sub: __('open: all-time · rest: in range') }, async ($b) => {
				const [inRange, open] = await Promise.all([
					this.gl('Work Order', ['status', 'count(name) as c'], this.bf(f, { co: 'company', wh: 'fg_warehouse', date: 'planned_start_date', dt: true }), { group_by: 'status', limit: 0 }),
					this.gl('Work Order', ['status', 'count(name) as c'], this.bf(f, { co: 'company', wh: 'fg_warehouse', extra: [['status', 'in', OPEN_WO]] }), { group_by: 'status', limit: 0 }),
				]);
				const m = new Map();
				inRange.forEach((r) => m.set(r.status, r.c)); open.forEach((r) => m.set(r.status, r.c));
				this.chart_map($b, 'bar', m, __('Work Orders'), 8);
			});
			this.cp($g, __('Job Card Status'), 3, 'donut', async () => tally(await this.jobCards(f), (r) => r.status || '—'));
			this.cp($g, __('Attendance Split'), 3, 'percentage', async () => tally((await this.fdp(f)).filter((r) => r.type), (r) => r.type));

			this.panel($g, __('Work Orders In Process'), { span: 6 }, async ($b) => {
				const w = await this.gl('Work Order', ['name', 'production_item', 'item_name', 'qty', 'produced_qty', 'planned_end_date'],
					this.bf(f, { co: 'company', wh: 'fg_warehouse', extra: [['status', '=', 'In Process']] }), { order_by: 'planned_end_date asc', limit: 50 });
				$b.html(table([
					{ l: __('Work Order'), v: (r) => link('Work Order', r.name) },
					{ l: __('Item'), v: (r) => blank(r.item_name || r.production_item) },
					{ l: __('Done / Qty'), cls: 'num', v: (r) => `${fmt(r.produced_qty)} / ${fmt(r.qty)}` },
					{ l: __('Progress'), v: (r) => progress(flt(r.qty) ? (flt(r.produced_qty) / flt(r.qty)) * 100 : 0) },
					{ l: __('Due'), v: (r) => blank(String(r.planned_end_date || '').slice(0, 10)) },
				], w, { empty: __('No work orders in process') }));
			});
			this.cp($g, __('Job Card Time by Operation'), 6, 'bar', async () => tally(await this.jobCards(f), (r) => r.operation || '—', (r) => Math.round(flt(r.total_time_in_mins))), { name: __('Minutes'), n: 10, sub: __('minutes') });

			this.panel($g, __('Stale Work Orders'), { span: 6 }, async ($b) => {
				const w = await this.staleWOs(f);
				this.sub($b, __('{0} not started, start date passed', [w.length]));
				$b.html(table([
					{ l: __('Work Order'), v: (r) => link('Work Order', r.name) },
					{ l: __('Item'), v: (r) => blank(r.item_name || r.production_item) },
					{ l: __('Qty'), cls: 'num', v: (r) => fmt(r.qty) },
					{ l: __('Planned'), v: (r) => blank(String(r.planned_start_date || '').slice(0, 10)) },
					{ l: __('Days'), cls: 'num', v: (r) => `<span class="dmo-b red">${daysBetween(r.planned_start_date)}</span>` },
				], w.slice(0, 50), { empty: __('No stale work orders') }));
			});
			this.panel($g, __('Productivity by Activity'), { span: 6, sub: __('avg %, worked days') }, async ($b) => {
				const rows = (await this.fdp(f)).filter((r) => r.activity && flt(r.productivity) > 0);
				const sum = tally(rows, (r) => r.activity, (r) => flt(r.productivity)), n = tally(rows, (r) => r.activity);
				this.chart_map($b, 'bar', new Map(Array.from(sum.entries()).map(([k, v]) => [k, Math.round(v / n.get(k))])), __('Productivity %'), 12);
			});

			this.panel($g, __('Daily Output by Factory'), { span: 6, sub: __('completed qty') }, async ($b) => {
				const rows = await this.dpu(f); const ds = dates(f.from, f.to, 31);
				const fa = Array.from(new Set(rows.map((r) => r.factory || '—')));
				this.chart($b, { type: 'line', data: { labels: ds.map((d) => d.slice(5)), datasets: fa.map((x) => ({ name: x, values: ds.map((d) => rows.filter((r) => r.date === d && (r.factory || '—') === x).reduce((a, r) => a + flt(r.completed_qty), 0)) })) } });
			});
			this.ts($g, __('Overtime Hours'), 6, f, 'line', async (ds) => [{ name: __('OT hours'), values: this.perDay(await this.dpu(f), 'date', (r) => flt(r.ot_hours))(ds) }]);

			this.panel($g, __('Output vs Target'), { span: 12 }, async ($b) => {
				const [rows, tg] = await Promise.all([this.dpu(f), this.gl('Manufacturing Production Target', ['target_date', 'target_qty'], this.bf(f, { co: 'company', date: 'target_date', extra: [['docstatus', '<', 2]] }), { limit: 3000 })]);
				if (!tg.length) { $b.html(`<div class="dmo-empty">${__('No production targets set for this range')}</div>`); return; }
				const ds = dates(f.from, f.to, 31);
				this.chart($b, { type: 'line', data: { labels: ds.map((d) => d.slice(5)), datasets: [
					{ name: __('Output'), values: this.perDay(rows, 'date', (r) => flt(r.completed_qty))(ds) },
					{ name: __('Target'), values: this.perDay(tg, 'target_date', (r) => flt(r.target_qty))(ds) },
				] } });
			});

			this.cp($g, __('Top Items by Planned Qty'), 6, 'bar', async () => tally(await this.woRange(f), (r) => r.item_name || r.production_item || '—', (r) => flt(r.qty)), { name: __('Qty'), n: 8 });
			this.panel($g, __('Planned vs Produced by Item'), { span: 6, sub: __('top 8') }, async ($b) => {
				const w = await this.woRange(f);
				const P = tally(w, (r) => r.item_name || r.production_item || '—', (r) => flt(r.qty)), D = tally(w, (r) => r.item_name || r.production_item || '—', (r) => flt(r.produced_qty));
				const names = sortedEntries(P, 8).map((x) => x[0]);
				this.chart($b, { type: 'bar', data: { labels: names, datasets: [{ name: __('Planned'), values: names.map((n) => P.get(n)) }, { name: __('Produced'), values: names.map((n) => D.get(n) || 0) }] } });
			});

			this.cp($g, __('Work Orders by Warehouse'), 4, 'donut', async () => tally(await this.woRange(f), (r) => r.fg_warehouse || '—'), { n: 6 });
			this.cp($g, __('Process Loss by Item'), 4, 'bar', async () => tally((await this.woRange(f)).filter((r) => flt(r.process_loss_qty) > 0), (r) => r.item_name || r.production_item || '—', (r) => flt(r.process_loss_qty)), { name: __('Qty'), n: 6 });
			this.cp($g, __('Job Cards by Workstation'), 4, 'bar', async () => tally(await this.jobCards(f), (r) => r.workstation || '—'), { name: __('Job Cards'), n: 8 });

			this.panel($g, __('Operating Cost by Item'), { span: 6, sub: __('planned vs actual · top 6') }, async ($b) => {
				const w = await this.woRange(f); const k = (r) => r.item_name || r.production_item || '—';
				const P = tally(w, k, (r) => flt(r.planned_operating_cost)), A = tally(w, k, (r) => flt(r.actual_operating_cost));
				const names = sortedEntries(tally(w, k, (r) => flt(r.total_operating_cost)), 6).map((x) => x[0]);
				this.chart($b, { type: 'bar', data: { labels: names, datasets: [{ name: __('Planned'), values: names.map((n) => Math.round(P.get(n) || 0)) }, { name: __('Actual'), values: names.map((n) => Math.round(A.get(n) || 0)) }] } });
			});
			this.cp($g, __('Completed Qty by Operation'), 6, 'bar', async () => tally(await this.jobCards(f), (r) => r.operation || '—', (r) => flt(r.total_completed_qty)), { name: __('Qty'), n: 10 });

			this.panel($g, __('Open Job Cards'), { span: 6 }, async ($b) => {
				const j = (await this.jobCards(f)).filter((x) => ['Open', 'Work In Progress', 'On Hold'].includes(x.status));
				this.sub($b, __('{0} open', [j.length]));
				$b.html(table([
					{ l: __('Job Card'), v: (r) => link('Job Card', r.name) },
					{ l: __('Operation'), v: (r) => blank(r.operation) },
					{ l: __('Workstation'), v: (r) => blank(r.workstation) },
					{ l: __('Done / Qty'), cls: 'num', v: (r) => `${fmt(r.total_completed_qty)} / ${fmt(r.for_quantity)}` },
					{ l: __('Status'), v: (r) => badge(r.status) },
				], j.slice(0, 40), { empty: __('No open job cards') }));
			});
			this.panel($g, __('Recent Daily Production Updates'), { span: 6, sub: __('latest 15') }, async ($b) => {
				const r = (await this.dpu(f)).slice().reverse().slice(0, 15);
				$b.html(table([
					{ l: __('Update'), v: (x) => link('Daily Production Update', x.name) },
					{ l: __('Date'), v: (x) => blank(x.date) },
					{ l: __('Factory'), v: (x) => blank(x.factory) },
					{ l: __('Completed'), cls: 'num', v: (x) => fmt(x.completed_qty) },
					{ l: __('OT hrs'), cls: 'num', v: (x) => fmt(x.ot_hours, 1) },
				], r));
			});

			this.ts($g, __('OT Amount per Day'), 6, f, 'bar', async (ds) => [{ name: __('SAR'), values: this.perDay(await this.fdp(f), 'date', (r) => flt(r.ot_amount))(ds).map(Math.round) }]);
			this.panel($g, __('Target vs Actual by Activity'), { span: 6 }, async ($b) => {
				const rows = (await this.fdp(f)).filter((r) => r.activity);
				const T = tally(rows, (r) => r.activity, (r) => flt(r.daily_target_qty || r.target_qty)), A = tally(rows, (r) => r.activity, (r) => flt(r.actual_qty));
				const names = sortedEntries(A, 8).map((x) => x[0]);
				this.chart($b, { type: 'bar', data: { labels: names, datasets: [{ name: __('Target'), values: names.map((n) => Math.round(T.get(n) || 0)) }, { name: __('Actual'), values: names.map((n) => Math.round(A.get(n) || 0)) }] } });
			});

			this.panel($g, __('Top Employees by Productivity'), { span: 6, sub: __('avg %, worked days') }, async ($b) => {
				const per = {};
				(await this.fdp(f)).filter((r) => r.employee && flt(r.productivity) > 0).forEach((r) => {
					per[r.employee] = per[r.employee] || { e: r.employee, n: 0, p: 0, q: 0, ot: 0 };
					per[r.employee].n++; per[r.employee].p += flt(r.productivity); per[r.employee].q += flt(r.actual_qty); per[r.employee].ot += flt(r.ot_hrs);
				});
				$b.html(table([
					{ l: __('Employee'), v: (r) => link('Employee', r.e) },
					{ l: __('Days'), cls: 'num', v: (r) => r.n },
					{ l: __('Qty'), cls: 'num', v: (r) => fmt(r.q) },
					{ l: __('OT hrs'), cls: 'num', v: (r) => fmt(r.ot, 1) },
					{ l: __('Avg %'), v: (r) => progress(r.p / r.n) },
				], Object.values(per).sort((a, b) => b.p / b.n - a.p / a.n).slice(0, 25)));
			});
			this.panel($g, __('Workplace Summary'), { span: 6, sub: __('by branch') }, async ($b) => {
				const per = {};
				(await this.fdp(f)).forEach((r) => {
					const k = r.branch || '—';
					per[k] = per[k] || { b: k, q: 0, duty: 0, ot: 0, amt: 0 };
					per[k].q += flt(r.actual_qty); per[k].duty += flt(r.duty_hours); per[k].ot += flt(r.ot_hrs); per[k].amt += flt(r.ot_amount);
				});
				$b.html(table([
					{ l: __('Branch'), v: (r) => blank(r.b) },
					{ l: __('Actual Qty'), cls: 'num', v: (r) => fmt(r.q) },
					{ l: __('Duty hrs'), cls: 'num', v: (r) => fmt(r.duty) },
					{ l: __('OT hrs'), cls: 'num', v: (r) => fmt(r.ot, 1) },
					{ l: __('OT SAR'), cls: 'num', v: (r) => fmt(r.amt) },
				], Object.values(per).sort((a, b) => b.q - a.q)));
			});
			await Promise.all(jobs);
		}

		// ====================================================== TAB 5: SUPPLY & STOCK
		async tab_supply($p, f) {
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const jobs = this.K($k, [
				[__('Open Mat. Requests'), 'clip', async () => ({ num: (await this.openMRs(f)).length, sub: __('pending / partial') }), ['List', 'Material Request']],
				[__('Overdue MRs'), 'clock', async () => { const n = (await this.openMRs(f)).filter((m) => m.schedule_date && m.schedule_date < f.today).length; return { num: n, sub: __('past due date'), tone: n ? 'red' : 'green' }; }],
				[__('Pending Item Lines'), 'layers', async () => ({ num: (await this.mrItems(f)).length, sub: __('still to receive') })],
				[__('Items in Shortage'), 'flame', async () => { const n = (await this.shortBins(f)).length; return { num: n, sub: __('projected qty < 0'), tone: n ? 'red' : 'green' }; }],
				[__('Stock Value'), 'cash', async () => ({ num: (await this.binAgg(f, 'warehouse')).reduce((a, r) => a + flt(r.v), 0), sub: __('SAR · all bins') })],
				[__('Warehouses'), 'warehouse', async () => ({ num: ((await this.whs(f)) || []).length, sub: __('leaf warehouses') })],
				[__('Receipts in Range'), 'box', async () => ({ num: (await this.receipts(f)).length, sub: __('purchase receipts') })],
				[__('Stock Entries'), 'stack', async () => ({ num: (await this.stockEntries(f)).length, sub: __('submitted in range') })],
			]);

			this.cp($g, __('Open MRs by Purpose'), 4, 'donut', async () => tally(await this.openMRs(f), (r) => r.material_request_type || '—'));
			this.cp($g, __('By Workflow State'), 4, 'bar', async () => tally(await this.openMRs(f), (r) => r.workflow_state || '—'), { name: __('Material Requests'), n: 8 });
			this.cp($g, __('By Priority'), 4, 'bar', async () => tally(await this.openMRs(f), (r) => r.custom_priority || __('(none)')), { name: __('Material Requests'), n: 4 });

			this.cp($g, __('Open MR Ageing'), 6, 'bar', async () => {
				const b = { '0–7': 0, '8–30': 0, '31–90': 0, '90+': 0 };
				(await this.openMRs(f)).forEach((r) => { const d = daysBetween(r.transaction_date || f.today); b[d <= 7 ? '0–7' : d <= 30 ? '8–30' : d <= 90 ? '31–90' : '90+']++; });
				return new Map(Object.entries(b));
			}, { name: __('Material Requests'), n: 4, sub: __('days since request') });
			this.panel($g, __('Overdue Material Requests'), { span: 6 }, async ($b) => {
				const rows = (await this.openMRs(f)).filter((r) => r.schedule_date && r.schedule_date < f.today);
				this.sub($b, __('{0} overdue', [rows.length]));
				$b.html(table([
					{ l: __('MR'), v: (r) => link('Material Request', r.name) },
					{ l: __('Purpose'), v: (r) => blank(r.material_request_type) },
					{ l: __('Priority'), v: (r) => blank(r.custom_priority) },
					{ l: __('State'), v: (r) => badge(r.workflow_state || r.status) },
					{ l: __('Days'), cls: 'num', v: (r) => `<span class="dmo-b red">${daysBetween(r.schedule_date)}</span>` },
					{ l: __('% Ordered'), v: (r) => progress(flt(r.per_ordered)) },
				], rows.slice(0, 50), { empty: __('No overdue material requests') }));
			});

			this.panel($g, __('Top Pending Items'), { span: 6, sub: __('qty still to receive') }, async ($b) => {
				const per = {};
				(await this.mrItems(f)).forEach((r) => {
					per[r.item_code] = per[r.item_code] || { c: r.item_code, n: r.item_name, b: r.brand, q: 0, mrs: new Set() };
					per[r.item_code].q += r.pend; per[r.item_code].mrs.add(r.parent);
				});
				$b.html(table([
					{ l: __('Item'), v: (r) => blank(r.c) },
					{ l: __('Name'), v: (r) => blank(r.n) },
					{ l: __('Brand'), v: (r) => blank(r.b) },
					{ l: __('Pending'), cls: 'num', v: (r) => `<b>${fmt(r.q)}</b>` },
					{ l: __('MRs'), cls: 'num', v: (r) => r.mrs.size },
				], Object.values(per).sort((a, b) => b.q - a.q).slice(0, 25), { empty: __('Nothing pending') }));
			});
			this.cp($g, __('Pending Qty by Brand'), 6, 'bar', async () => tally(await this.mrItems(f), (r) => r.brand || __('(no brand)'), (r) => r.pend), { name: __('Qty'), n: 10 });

			this.cp($g, __('Pending Qty by Item Group'), 6, 'bar', async () => tally(await this.mrItems(f), (r) => r.item_group || '—', (r) => r.pend), { name: __('Qty'), n: 10 });
			this.cp($g, __('Pending Qty by Warehouse'), 6, 'bar', async () => tally(await this.mrItems(f), (r) => r.warehouse || '—', (r) => r.pend), { name: __('Qty'), n: 10 });

			this.panel($g, __('Shortage Items'), { span: 6, sub: __('projected qty < 0') }, async ($b) => {
				const s = await this.shortBins(f);
				$b.html(table([
					{ l: __('Item'), v: (r) => blank(r.item_code) },
					{ l: __('Warehouse'), v: (r) => blank(r.warehouse) },
					{ l: __('Actual'), cls: 'num', v: (r) => fmt(r.actual_qty) },
					{ l: __('Reserved'), cls: 'num', v: (r) => fmt(r.reserved_qty) },
					{ l: __('Ordered'), cls: 'num', v: (r) => fmt(r.ordered_qty) },
					{ l: __('Projected'), cls: 'num', v: (r) => `<span class="dmo-b red">${fmt(r.projected_qty)}</span>` },
				], s.slice(0, 40), { empty: __('No item is short') }));
			});
			this.cp($g, __('Shortage Lines by Warehouse'), 6, 'bar', async () => tally(await this.shortBins(f), (r) => r.warehouse || '—'), { name: __('Items'), n: 10 });

			this.cp($g, __('Stock Value by Warehouse'), 6, 'bar', async () => new Map((await this.binAgg(f, 'warehouse')).map((r) => [r.warehouse, Math.round(flt(r.v))])), { name: __('SAR'), n: 10 });
			this.cp($g, __('Stock Value Share'), 3, 'donut', async () => new Map((await this.binAgg(f, 'warehouse')).filter((r) => flt(r.v) > 0).map((r) => [r.warehouse, Math.round(flt(r.v))])), { n: 6 });
			this.cp($g, __('Reserved Qty by Warehouse'), 3, 'donut', async () => new Map((await this.binAgg(f, 'warehouse')).filter((r) => flt(r.r) > 0).map((r) => [r.warehouse, Math.round(flt(r.r))])), { n: 6 });

			this.panel($g, __('Top Items by Stock Value'), { span: 6 }, async ($b) => {
				const rows = (await this.binAgg(f, 'item_code')).sort((a, b) => flt(b.v) - flt(a.v)).slice(0, 25);
				$b.html(table([
					{ l: __('Item'), v: (r) => blank(r.item_code) },
					{ l: __('On Hand'), cls: 'num', v: (r) => fmt(r.q) },
					{ l: __('Reserved'), cls: 'num', v: (r) => fmt(r.r) },
					{ l: __('Value'), cls: 'num', v: (r) => `<b>${fmt(r.v)}</b>` },
				], rows));
			});
			this.panel($g, __('On Hand vs Reserved — Top Items'), { span: 6, sub: __('top 8 by qty') }, async ($b) => {
				const rows = (await this.binAgg(f, 'item_code')).sort((a, b) => flt(b.q) - flt(a.q)).slice(0, 8);
				this.chart($b, { type: 'bar', data: { labels: rows.map((r) => r.item_code), datasets: [{ name: __('On hand'), values: rows.map((r) => Math.round(flt(r.q))) }, { name: __('Reserved'), values: rows.map((r) => Math.round(flt(r.r))) }] } });
			});

			this.ts($g, __('Stock Entries per Day'), 6, f, 'bar', async (ds) => {
				const se = await this.stockEntries(f);
				const types = sortedEntries(tally(se, (r) => r.stock_entry_type || r.purpose || '—'), 5).map((x) => x[0]);
				return types.map((t) => ({ name: t, values: this.perDay(se.filter((r) => (r.stock_entry_type || r.purpose || '—') === t), 'posting_date')(ds) }));
			}, { stacked: true });
			this.cp($g, __('Stock Entry Types'), 3, 'donut', async () => tally(await this.stockEntries(f), (r) => r.stock_entry_type || r.purpose || '—'), { n: 6 });
			this.cp($g, __('Receipt Status'), 3, 'donut', async () => tally(await this.receipts(f), (r) => r.status || '—'));

			this.ts($g, __('Purchase Receipts per Day'), 6, f, 'line', async (ds) => [{ name: __('Receipts'), values: this.perDay(await this.receipts(f), 'posting_date')(ds) }]);
			this.cp($g, __('Top Suppliers by Value'), 6, 'bar', async () => tally(await this.receipts(f), (r) => r.supplier || '—', (r) => Math.round(flt(r.grand_total))), { name: __('SAR'), n: 8 });

			this.panel($g, __('Recent Purchase Receipts'), { span: 6, sub: __('latest 15') }, async ($b) => {
				$b.html(table([
					{ l: __('Receipt'), v: (r) => link('Purchase Receipt', r.name) },
					{ l: __('Supplier'), v: (r) => blank(r.supplier) },
					{ l: __('Date'), v: (r) => blank(r.posting_date) },
					{ l: __('Value'), cls: 'num', v: (r) => fmt(r.grand_total) },
					{ l: __('Billed'), v: (r) => progress(flt(r.per_billed)) },
				], (await this.receipts(f)).slice(0, 15)));
			});
			this.panel($g, __('Recent Stock Entries'), { span: 6, sub: __('latest 15') }, async ($b) => {
				$b.html(table([
					{ l: __('Entry'), v: (r) => link('Stock Entry', r.name) },
					{ l: __('Type'), v: (r) => blank(r.stock_entry_type) },
					{ l: __('Date'), v: (r) => blank(r.posting_date) },
					{ l: __('Value'), cls: 'num', v: (r) => fmt(r.total_amount) },
				], (await this.stockEntries(f)).slice(0, 15)));
			});
			await Promise.all(jobs);
		}
	}

	function boot($h) { return new DMOpsDashboard($h); }
	boot($(root_element));
})();