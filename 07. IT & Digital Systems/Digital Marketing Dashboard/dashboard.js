/* DM Digital Marketing Dashboard v3 — Operations UI + Arabic — Custom HTML Block (Script field). Uses `root_element` (shadow root) provided by Frappe.
 * Tabs: Overview | Leads | Follow-up | Pipeline | Spend & Channels | Content & Web | Setup
 * Works with the doctypes you already have (Leads Generation List, Lead Allocation, Lead, Opportunity, Campaign) and
 * lights up the spend / content / web tabs as soon as the new doctypes from the Setup tab exist.
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
		'% ordered': '% المطلوب', '(no brand)': '(بدون علامة تجارية)', '(none)': '(لا يوجد)', '30D': '30 يوم', '7D': '7 أيام',
		'Active': 'نشط', 'Active days': 'أيام النشاط', 'Active drivers': 'السائقون النشطون', 'Active forklifts': 'الرافعات الشوكية النشطة',
		'Actual': 'الفعلي', 'Actual qty': 'الكمية الفعلية', 'Age (h)': 'العمر (ساعة)', 'All clear': 'لا شيء معلّق',
		'Nothing needs attention': 'لا يوجد ما يتطلب الانتباه', 'Amount': 'المبلغ',
		'Assigned driver': 'السائق المكلّف', 'Attendance split': 'توزيع الحضور', 'Attention needed': 'يتطلب انتباهاً', 'Auto': 'تلقائي',
		'Avg %': 'المتوسط %', 'Avg idle per trip (min)': 'متوسط الخمول لكل رحلة (دقيقة)', 'Avg/Trip': 'المتوسط/رحلة', 'Avg/day': 'المتوسط/يوم',
		'Billed': 'مفوتر', 'Branch': 'الفرع', 'Brand': 'العلامة التجارية', 'By priority': 'حسب الأولوية', 'By sales person': 'حسب مندوب المبيعات',
		'By workflow state': 'حسب حالة سير العمل', 'Click to open the list': 'اضغط لفتح القائمة', 'Company': 'الشركة', 'Completed': 'مكتمل',
		'Completed qty by operation': 'الكمية المنجزة حسب العملية', 'Completion rate': 'نسبة الإنجاز', 'Container': 'الحاوية',
		'Could not load this panel': 'تعذّر تحميل هذه اللوحة', 'Could not load this tab': 'تعذّر تحميل هذا التبويب', 'Customer': 'العميل',
		'DN': 'إشعار تسليم', 'DN status': 'حالة إشعارات التسليم', 'DN value today': 'قيمة إشعارات التسليم اليوم', 'DNs to bill': 'إشعارات تسليم للفوترة',
		'DNs by hour of day': 'إشعارات التسليم حسب ساعات اليوم', 'DNs by location': 'إشعارات التسليم حسب الموقع', 'DNs no trip >24h': 'إشعارات بلا رحلة > 24 ساعة',
		'Daily movements': 'الحركات اليومية', 'Daily output by factory': 'الإنتاج اليومي حسب المصنع',
		'Daily targets (saved in this browser)': 'الأهداف اليومية (تُحفظ في هذا المتصفح)', 'Date': 'التاريخ', 'Days': 'أيام', 'Days used': 'أيام الاستخدام',
		'Delivered rate': 'نسبة التسليم', 'Delivered?': 'تم التسليم؟', 'Delivery & fleet': 'التوصيل والأسطول', 'Delivery mode': 'طريقة التسليم',
		'Delivery note': 'إشعار تسليم', 'Delivery notes': 'إشعارات التسليم', 'Delivery notes today': 'إشعارات التسليم اليوم',
		'Delivery notes per day': 'إشعارات التسليم في اليوم', 'Delivery notes per day': 'إشعارات التسليم في اليوم', 'Delivery status': 'حالة التسليم',
		'Delivery value per day': 'قيمة التسليم في اليوم', 'Delivery vehicle': 'مركبة التوصيل', 'Departures by hour': 'المغادرات حسب الساعة',
		'Done / qty': 'المنجز / الكمية', 'Draft DNs': 'إشعارات تسليم مسودة', 'Driver': 'السائق', 'Driver scoreboard': 'لوحة أداء السائقين', 'Drivers': 'السائقون',
		'Due': 'الاستحقاق', 'Duty hrs': 'ساعات العمل', 'Earned': 'المكتسب', 'Employee': 'الموظف', 'Entry': 'القيد',
		'Every vehicle delivery has a trip — nothing waiting': 'كل عملية توصيل بمركبة لها رحلة — لا شيء بالانتظار', 'Expense': 'المصروف',
		'Expenses by vehicle type': 'المصروفات حسب نوع المركبة', 'Expenses per day': 'المصروفات في اليوم', 'Factory': 'المصنع', 'Forklift': 'الرافعة الشوكية',
		'Forklift expenses': 'مصروفات الرافعات الشوكية', 'Forklift registry': 'سجل الرافعات الشوكية', 'Forklift status': 'حالة الرافعات الشوكية',
		'Forklift utilisation': 'استخدام الرافعات الشوكية', 'Forklifts': 'الرافعات الشوكية', 'From': 'من', 'From → to': 'من ← إلى',
		'Handled by vehicle type': 'المناولة حسب نوع المركبة', 'Handled by vehicle type per day': 'المناولة حسب نوع المركبة يومياً', 'Idle': 'خامل',
		'Idle forklifts': 'الرافعات الخاملة', 'In process': 'قيد التنفيذ', 'In workshop': 'في الورشة', 'Item': 'الصنف', 'Items': 'الأصناف',
		'Items in shortage': 'أصناف في عجز', 'Job card': 'بطاقة العمل', 'Job card status': 'حالة بطاقات العمل', 'Job card time by operation': 'وقت بطاقات العمل حسب العملية',
		'Job cards': 'بطاقات العمل', 'Job cards by workstation': 'بطاقات العمل حسب محطة العمل', 'Last seen': 'آخر ظهور', 'Last status': 'آخر حالة',
		'Latest delivery notes': 'أحدث إشعارات التسليم', 'Latest material requests': 'أحدث طلبات المواد', 'Load': 'تحميل', 'Loading': 'التحميل',
		'Loading vs unloading by warehouse': 'التحميل مقابل التفريغ حسب المستودع', 'Loading vs unloading per day': 'التحميل مقابل التفريغ يومياً', 'Location': 'الموقع',
		'MR': 'طلب مواد', 'MRs': 'طلبات المواد', 'MRs created today': 'طلبات المواد المنشأة اليوم', 'MTD': 'منذ بداية الشهر', 'Maker / model': 'الصانع / الطراز',
		'Material requests': 'طلبات المواد', 'Minutes': 'دقائق', 'Mode': 'الطريقة', 'Movements': 'الحركات', 'Name': 'الاسم', 'Net wt (kg)': 'الوزن الصافي (كجم)',
		'New delivery trip': 'رحلة توصيل جديدة', 'No data for this selection': 'لا توجد بيانات لهذا الاختيار', 'No item is short': 'لا يوجد صنف ناقص',
		'No open job cards': 'لا توجد بطاقات عمل مفتوحة', 'No overdue material requests': 'لا توجد طلبات مواد متأخرة',
		'No production targets set for this range': 'لم تُحدَّد أهداف إنتاج لهذه الفترة', 'No stale work orders': 'لا توجد أوامر عمل متأخرة',
		'No trips in range': 'لا توجد رحلات في الفترة', 'No work orders in process': 'لا توجد أوامر عمل قيد التنفيذ', 'Nothing pending': 'لا شيء معلّق',
		'Nothing to show': 'لا شيء للعرض', 'OT amount per day': 'مبلغ العمل الإضافي في اليوم', 'OT SAR': 'العمل الإضافي (ر.س)', 'OT hours': 'ساعات العمل الإضافي',
		'OT hrs': 'ساعات إضافية', 'On hand': 'المتوفر', 'On Hand vs Reserved — Top Items': 'المتوفر مقابل المحجوز — أعلى الأصناف', 'On hand': 'المتوفر',
		'Open job cards': 'بطاقات العمل المفتوحة', 'Open MR ageing': 'أعمار طلبات المواد المفتوحة', 'Open MRs by purpose': 'طلبات المواد المفتوحة حسب الغرض',
		'Open mat. requests': 'طلبات المواد المفتوحة', 'Operating cost': 'تكلفة التشغيل', 'Operating cost by item': 'تكلفة التشغيل حسب الصنف', 'Operation': 'العملية',
		'Operator': 'المشغّل', 'Operator productivity': 'إنتاجية المشغّلين', 'Operators': 'المشغّلون', 'Ordered': 'مطلوب', 'Output': 'المخرجات',
		'Output vs target': 'المخرجات مقابل الهدف', 'Overdue MRs': 'طلبات مواد متأخرة', 'Overdue material requests': 'طلبات المواد المتأخرة', 'Overtime hours': 'ساعات العمل الإضافي',
		'Overview': 'نظرة عامة', 'Pending': 'معلّق', 'Pending item lines': 'بنود الأصناف المعلّقة', 'Pending qty by brand': 'الكمية المعلّقة حسب العلامة التجارية',
		'Pending qty by item group': 'الكمية المعلّقة حسب مجموعة الأصناف', 'Pending qty by warehouse': 'الكمية المعلّقة حسب المستودع', 'Pick up': 'استلام',
		'Plan attainment': 'تحقيق الخطة', 'Planned': 'المخطط', 'Planned vs produced by item': 'المخطط مقابل المنتج حسب الصنف', 'Priority': 'الأولوية',
		'Process loss': 'فاقد التصنيع', 'Process loss by item': 'فاقد التصنيع حسب الصنف', 'Produced': 'المنتج', 'Produced qty': 'الكمية المنتجة', 'Production': 'الإنتاج',
		'Productivity %': 'الإنتاجية %', 'Productivity by activity': 'الإنتاجية حسب النشاط', 'Progress': 'التقدم', 'Projected': 'المتوقع',
		'Purchase receipts per day': 'إيصالات الشراء في اليوم', 'Purpose': 'الغرض', 'Qty': 'الكمية', 'Receipt': 'الإيصال', 'Receipt status': 'حالة الإيصالات',
		'Receipts': 'الإيصالات', 'Receipts today': 'إيصالات اليوم', 'Receipts in range': 'الإيصالات في الفترة', 'Recent daily production updates': 'أحدث تحديثات الإنتاج اليومي',
		'Recent purchase receipts': 'أحدث إيصالات الشراء', 'Recent stock entries': 'أحدث قيود المخزون', 'Refresh': 'تحديث', 'Refresh every 5 minutes': 'تحديث كل 5 دقائق',
		'Reserved': 'محجوز', 'Reserved qty by warehouse': 'الكمية المحجوزة حسب المستودع', 'Route': 'المسار', 'SAR': 'ر.س', 'SAR · all bins': 'ر.س · كل المواقع',
		'SAR · range': 'ر.س · الفترة', 'SAR · total': 'ر.س · الإجمالي', 'Sales person': 'مندوب المبيعات', 'Save': 'حفظ', 'Set daily targets': 'تحديد الأهداف اليومية',
		'Setting': 'الإعداد', 'Shortage items': 'أصناف العجز', 'Shortage lines by warehouse': 'بنود العجز حسب المستودع', 'Site idle': 'خمول الموقع',
		'Stale WOs': 'أوامر عمل متأخرة', 'Stale work orders': 'أوامر العمل المتأخرة', 'State': 'الحالة', 'Status': 'الحالة', 'Stock entries': 'قيود المخزون',
		'Stock entries today': 'قيود المخزون اليوم', 'Stock entries per day': 'قيود المخزون في اليوم', 'Stock entry types': 'أنواع قيود المخزون', 'Stock value': 'قيمة المخزون',
		'Stock value share': 'حصة قيمة المخزون', 'Stock value by warehouse': 'قيمة المخزون حسب المستودع', 'Supplier': 'المورد', 'Supply & stock': 'التوريد والمخزون',
		'Target': 'الهدف', 'Target vs actual by activity': 'الهدف مقابل الفعلي حسب النشاط', 'Targets': 'الأهداف', 'To': 'إلى', 'Today': 'اليوم',
		'Tonnage delivered': 'الأطنان المسلّمة', 'Tonnage delivered per day': 'الأطنان المسلّمة يومياً', 'Tonnage today': 'أطنان اليوم', 'Tonnage by location': 'الأطنان حسب الموقع',
		'Tonnes': 'أطنان', 'Tonnes per day': 'أطنان في اليوم', 'Top customers by tonnage': 'أعلى العملاء حسب الأطنان', 'Top customers by value': 'أعلى العملاء حسب القيمة',
		'Top employees by productivity': 'أعلى الموظفين إنتاجية', 'Top items by planned qty': 'أعلى الأصناف حسب الكمية المخططة', 'Top items by stock value': 'أعلى الأصناف حسب قيمة المخزون',
		'Top operators by volume': 'أعلى المشغّلين حسب الحجم', 'Top pending items': 'أعلى الأصناف المعلّقة', 'Top routes': 'أبرز المسارات', 'Top sales persons': 'أفضل مندوبي المبيعات',
		'Top suppliers by value': 'أعلى الموردين حسب القيمة', 'Total': 'الإجمالي', 'Total loaded': 'إجمالي المحمّل', 'Total unloaded': 'إجمالي المفرّغ', 'Trailer': 'المقطورة',
		'Trip': 'الرحلة', 'Trip earnings': 'أرباح الرحلات', 'Trip earnings today': 'أرباح رحلات اليوم', 'Trip earnings per day': 'أرباح الرحلات في اليوم', 'Trip log': 'سجل الرحلات',
		'Trip status': 'حالة الرحلات', 'Trip types': 'أنواع الرحلات', 'Trip earnings per day (SAR)': 'أرباح الرحلات في اليوم (ر.س)', 'Trips': 'الرحلات', 'Trips today': 'رحلات اليوم',
		'Trips by destination': 'الرحلات حسب الوجهة', 'Trips by source warehouse': 'الرحلات حسب مستودع المصدر', 'Trips in range': 'الرحلات في الفترة',
		'Trips per driver per day': 'الرحلات لكل سائق في اليوم', 'Trips per day': 'الرحلات في اليوم', 'Type': 'النوع', 'Unassigned DNs': 'إشعارات تسليم بلا رحلة',
		'Unassigned deliveries queue': 'قائمة التسليمات غير المسندة', 'Unload': 'تفريغ', 'Unloading': 'التفريغ', 'Update': 'التحديث', 'Updated {0}': 'آخر تحديث {0}',
		'Utilisation': 'الاستخدام', 'Value': 'القيمة', 'Vehicle': 'المركبة', 'Vehicle scoreboard': 'لوحة أداء المركبات', 'Vehicle utilisation (trips per day)': 'استخدام المركبات (رحلات في اليوم)',
		'Vehicles used': 'المركبات المستخدمة', 'Vehicles handled': 'المركبات المناولة', 'WOs in process': 'أوامر عمل قيد التنفيذ', 'Warehouse': 'المستودع',
		'Warehouse & forklift': 'المستودع والرافعات', 'Warehouse summary': 'ملخص المستودع', 'Warehouse idle': 'خمول المستودع', 'Warehouses': 'المستودعات', 'Washes': 'الغسلات',
		'Washings': 'الغسيل', 'Washings by vehicle type': 'الغسيل حسب نوع المركبة', 'Work order': 'أمر العمل', 'Work order pipeline': 'مراحل أوامر العمل', 'Work orders': 'أوامر العمل',
		'Work orders in process': 'أوامر العمل قيد التنفيذ', 'Work orders by warehouse': 'أوامر العمل حسب المستودع', 'Workplace summary': 'ملخص مكان العمل', 'Workshop': 'الورشة',
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
		'English': 'English', 'العربية': 'العربية', 'Switch language': 'تبديل اللغة', 'Delivery trip': 'رحلة توصيل',
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

	Object.assign(AR, {
  "Spend & channels": "الإنفاق والقنوات",
  "Content & web": "المحتوى والويب",
  "Setup": "الإعداد",
  "90D": "90 يوم",
  "Campaign": "الحملة",
  "Spend": "الإنفاق",
  "Spent": "المنفق",
  "Marketing spend": "الإنفاق التسويقي",
  "Budget": "الميزانية",
  "Budget burn": "استهلاك الميزانية",
  "Budget vs actual": "الميزانية مقابل الفعلي",
  "CPC": "تكلفة النقرة",
  "CPL": "تكلفة العميل المحتمل",
  "CTR": "نسبة النقر إلى الظهور",
  "CTR %": "نسبة النقر %",
  "ROAS": "العائد على الإنفاق الإعلاني",
  "Channel": "القناة",
  "Channel scoreboard": "لوحة أداء القنوات",
  "Campaign scoreboard": "لوحة أداء الحملات",
  "Clicks": "النقرات",
  "Impressions": "مرات الظهور",
  "Impr.": "الظهور",
  "Reach": "الوصول",
  "Conversions": "التحويلات",
  "Conv. %": "نسبة التحويل %",
  "Conversion rate": "معدل التحويل",
  "Cost per click": "تكلفة النقرة",
  "Cost per conversion": "تكلفة التحويل",
  "Cost per lead": "تكلفة العميل المحتمل",
  "Cost per lead by channel": "تكلفة العميل المحتمل حسب القناة",
  "CTR by channel": "نسبة النقر حسب القناة",
  "Spend per day": "الإنفاق اليومي",
  "Spend per day (SAR)": "الإنفاق اليومي (ر.س)",
  "Spend per day by channel": "الإنفاق اليومي حسب القناة",
  "Spend by channel type": "الإنفاق حسب نوع القناة",
  "Spend share": "حصة الإنفاق",
  "Leads": "العملاء المحتملون",
  "Lead": "عميل محتمل",
  "Leads vs platform-reported": "العملاء المحتملون مقابل بيانات المنصة",
  "Leads per day": "العملاء المحتملون يومياً",
  "Leads per day": "العملاء المحتملون يومياً",
  "Conversions per day": "التحويلات يومياً",
  "Conversions per day": "التحويلات يومياً",
  "Max cost per lead (SAR)": "أقصى تكلفة للعميل المحتمل (ر.س)",
  "Revenue": "الإيرادات",
  "Revenue (converted)": "إيرادات التحويلات",
  "SAR / lead": "ر.س / عميل محتمل",
  "SAR per click": "ر.س لكل نقرة",
  "SAR per lead": "ر.س لكل عميل محتمل",
  "SAR per won deal": "ر.س لكل صفقة رابحة",
  "SAR per won lead": "ر.س لكل عميل مكتسب",
  "SAR from won leads": "ر.س من العملاء المكتسبين",
  "Content": "المحتوى",
  "Content reach": "وصول المحتوى",
  "Content status": "حالة المحتوى",
  "Content by channel": "المحتوى حسب القناة",
  "Content by type": "المحتوى حسب النوع",
  "Engagement by content type": "التفاعل حسب نوع المحتوى",
  "Engagement rate": "معدل التفاعل",
  "Engagements": "التفاعلات",
  "Eng.": "التفاعل",
  "Eng. %": "التفاعل %",
  "Reach by channel": "الوصول حسب القناة",
  "Posts": "المنشورات",
  "Post": "المنشور",
  "Posts published": "المنشورات المنشورة",
  "Posts per week": "المنشورات الأسبوعية",
  "Top posts": "أفضل المنشورات",
  "Publish date": "تاريخ النشر",
  "Upcoming & in-progress content": "المحتوى القادم وقيد التنفيذ",
  "Web sessions": "جلسات الموقع",
  "Web conversions": "تحويلات الموقع",
  "Web conversions by source": "تحويلات الموقع حسب المصدر",
  "Sessions per day by source": "جلسات الموقع اليومية حسب المصدر",
  "Search clicks per day": "نقرات البحث اليومية",
  "Avg search position": "متوسط ترتيب البحث",
  "Avg session duration (s)": "متوسط مدة الجلسة (ثانية)",
  "Bounce rate": "معدل الارتداد",
  "Bounce %": "الارتداد %",
  "Engaged sessions": "الجلسات المتفاعلة",
  "Traffic sources": "مصادر الزيارات",
  "Position": "الترتيب",
  "Seconds": "ثوانٍ",
  "Video views": "مشاهدات الفيديو",
  "Messaging performance": "أداء الرسائل",
  "Sent": "مرسل",
  "Replies": "الردود",
  "Reply rate": "معدل الرد",
  "WhatsApp share": "حصة واتساب",
  "Source": "المصدر",
  "Owner": "المسؤول",
  "Title": "العنوان",
  "Ready": "جاهز",
  "Records": "السجلات",
  "Doctype": "نوع المستند",
  "What to create": "ما يلزم إنشاؤه",
  "Doctypes to create": "أنواع المستندات المطلوب إنشاؤها",
  "Fields to add": "الحقول المطلوب إضافتها",
  "Missing fields": "الحقول الناقصة",
  "Fields missing": "حقول ناقصة",
  "Not created": "لم يُنشأ",
  "Found": "موجود",
  "Missing": "غير موجود",
  "Data sources live": "مصادر البيانات المتاحة",
  "Already in use": "مستخدم حالياً",
  "How data gets in": "كيفية إدخال البيانات",
  "Action": "الإجراء",
  "Why": "السبب",
  "Create new doctype": "إنشاء نوع مستند جديد",
  "Add custom fields": "إضافة حقول مخصصة",
  "See the setup tab": "راجع تبويب الإعداد",
  "Setup needed": "الإعداد مطلوب",
  "setup needed": "الإعداد مطلوب",
  "Spend & reach": "الإنفاق والوصول",
  "Web traffic": "زيارات الموقع",
  "Lead attribution": "إسناد العملاء المحتملين",
  "Daily or weekly rows in Marketing Daily Metrics. Download the report from Google Ads / Meta / LinkedIn and use Data Import — no typing.": "أضف سجلات يومية أو أسبوعية في Marketing Daily Metrics. نزّل التقرير من Google Ads أو Meta أو LinkedIn واستخدم استيراد البيانات.",
  "Export Google Analytics + Search Console by day and source, import into Web Analytics Daily.": "صدّر بيانات Google Analytics وSearch Console حسب اليوم والمصدر، ثم استوردها إلى Web Analytics Daily.",
  "One Marketing Content record per post. Fill reach and engagement a few days after publishing.": "أنشئ سجل Marketing Content لكل منشور، وأدخل بيانات الوصول والتفاعل بعد النشر بأيام.",
  "Make the Marketing Channel (and Campaign) field mandatory on Leads Generation List so every lead is attributed.": "اجعل حقلي Marketing Channel وCampaign إلزاميين في Leads Generation List لإسناد كل عميل محتمل إلى مصدره.",
  "When a Lead Allocation is Converted, fill Deal Value — this powers ROAS and revenue per channel.": "عند تحويل Lead Allocation إلى Converted، أدخل Deal Value لحساب العائد على الإنفاق والإيرادات حسب القناة.",
  "(no campaign)": "(بدون حملة)",
  "all channels": "كل القنوات",
  "ads + organic": "إعلانات + وصول عضوي",
  "by channel": "حسب القناة",
  "by engagement": "حسب التفاعل",
  "by value": "حسب القيمة",
  "clicks / impressions": "النقرات / مرات الظهور",
  "engagements / reach": "التفاعلات / الوصول",
  "likes + comments + shares + saves": "الإعجابات + التعليقات + المشاركات + الحفظ",
  "lower is better": "الأقل أفضل",
  "needs spend and leads": "يتطلب بيانات الإنفاق والعملاء المحتملين",
  "needs spend and wins": "يتطلب بيانات الإنفاق والصفقات الرابحة",
  "no clicks": "لا توجد نقرات",
  "no impressions": "لا توجد مرات ظهور",
  "no reach data": "لا توجد بيانات وصول",
  "no spend": "لا يوجد إنفاق",
  "no won deals": "لا توجد صفقات رابحة",
  "No budgets for this period": "لا توجد ميزانيات لهذه الفترة",
  "No spend recorded in this range": "لا يوجد إنفاق مسجل لهذه الفترة",
  "No published posts in range": "لا توجد منشورات منشورة خلال الفترة",
  "No messaging activity recorded": "لا يوجد نشاط رسائل مسجل",
  "Nothing scheduled or in progress": "لا يوجد محتوى مجدول أو قيد التنفيذ",
  "of": "من",
  "of budget": "من الميزانية",
  "of leads": "من العملاء المحتملين",
  "of new leads": "من العملاء المحتملين الجدد",
  "of sessions": "من الجلسات",
  "of 5 existing doctypes": "من 5 أنواع مستندات موجودة",
  "new doctypes": "أنواع مستندات جديدة",
  "on existing doctypes": "على أنواع المستندات الموجودة",
  "existing doctypes the dashboard reads": "أنواع المستندات الحالية التي تقرأها اللوحة",
  "items": "عناصر",
  "leads": "عملاء محتملون",
  "users": "مستخدمون",
  "day": "يوم",
  "days": "أيام",
  "revenue": "الإيرادات",
  "value": "القيمة",
  "won": "رابحة",
  "lost": "خاسرة",
  "open": "مفتوحة",
  "published posts": "المنشورات المنشورة",
  "content calendar": "تقويم المحتوى",
  "email / WhatsApp": "البريد الإلكتروني / واتساب",
  "via WhatsApp": "عبر واتساب",
  "spend → leads → wins": "الإنفاق ← العملاء المحتملون ← الصفقات الرابحة",
  "spent vs budget": "الإنفاق مقابل الميزانية",
  "setup items missing": "عناصر إعداد ناقصة",
  "total in range": "الإجمالي خلال الفترة",
  "vs prev": "مقابل الفترة السابقة",
  "after creating items, reload the page so ERP picks them up": "بعد الإنشاء، أعد تحميل الصفحة لتحديث بيانات النظام",
  "{0} is not set up yet": "لم يتم إعداد {0} بعد",
  "{0} scheduled": "{0} مجدول",
  "Clicks per day": "النقرات اليومية",
  "Conversions by source": "التحويلات حسب المصدر",
  "ERP leads per channel": "عملاء النظام المحتملون حسب القناة",
  "Wins": "الصفقات الرابحة",
  "Won": "رابحة",
  "Won value": "قيمة الصفقات الرابحة",
  "Won value": "قيمة الصفقات الرابحة",
  "Win rate": "معدل الفوز",
  "Used": "المستخدم",
  "Hours": "ساعات",
  "Average per day": "المتوسط اليومي",
  "Allocated": "مسند",
  "Allocation": "الإسناد",
  "Allocation status": "حالة الإسناد",
  "Allocations": "الإسنادات",
  "Assigned": "مسند",
  "Assignments per day": "الإسنادات اليومية",
  "Avg deal size": "متوسط قيمة الصفقة",
  "Avg response": "متوسط الاستجابة",
  "Avg resp (h)": "متوسط الاستجابة (ساعة)",
  "CRM lead status": "حالة العملاء المحتملين في النظام",
  "CRM leads by campaign": "عملاء النظام المحتملون حسب الحملة",
  "CRM leads by location": "عملاء النظام المحتملون حسب الموقع",
  "CRM leads by sales person": "عملاء النظام المحتملون حسب مندوب المبيعات",
  "CRM leads by source": "عملاء النظام المحتملون حسب المصدر",
  "CRM leads by type": "عملاء النظام المحتملون حسب النوع",
  "Captured": "مسجل",
  "Catalogue sent": "تم إرسال الكتالوج",
  "Catalogue status": "حالة الكتالوج",
  "Cities reached": "المدن المستهدفة",
  "City": "المدينة",
  "Contacted": "تم التواصل",
  "Converted": "تم التحويل",
  "Customer / lead": "العميل / العميل المحتمل",
  "Days late": "أيام التأخير",
  "Deal value": "قيمة الصفقة",
  "Entered by": "أُدخل بواسطة",
  "Entered by": "أُدخل بواسطة",
  "Every lead has been allocated": "تم إسناد جميع العملاء المحتملين",
  "Expected closing — next 8 weeks": "الإغلاق المتوقع — الأسابيع الثمانية القادمة",
  "Expected close": "الإغلاق المتوقع",
  "Follow-ups due — next 7 days": "المتابعات المستحقة — الأيام السبعة القادمة",
  "High / urgent open": "مفتوحة بأولوية عالية / عاجلة",
  "Interested": "مهتم",
  "Latest leads": "أحدث العملاء المحتملين",
  "Lead funnel": "مسار العملاء المحتملين",
  "Leads captured": "العملاء المحتملون المسجلون",
  "Leads today": "عملاء اليوم المحتملون",
  "Leads by campaign": "العملاء المحتملون حسب الحملة",
  "Leads by channel": "العملاء المحتملون حسب القناة",
  "Leads by hour": "العملاء المحتملون حسب الساعة",
  "Leads by source": "العملاء المحتملون حسب المصدر",
  "Leads by weekday": "العملاء المحتملون حسب يوم الأسبوع",
  "Leads in ERP": "العملاء المحتملون في النظام",
  "Leads per day by source": "العملاء المحتملون يومياً حسب المصدر",
  "Lost": "خاسرة",
  "Lost reasons": "أسباب الخسارة",
  "New CRM leads": "عملاء محتملون جدد في النظام",
  "New CRM leads per day": "عملاء النظام المحتملون الجدد يومياً",
  "No response": "لا توجد استجابة",
  "No follow-ups scheduled this week": "لا توجد متابعات مجدولة هذا الأسبوع",
  "No leads in range": "لا يوجد عملاء محتملون خلال الفترة",
  "No open opportunities": "لا توجد فرص مفتوحة",
  "No overdue follow-ups": "لا توجد متابعات متأخرة",
  "Not sent": "لم يُرسل",
  "Open CRM leads": "عملاء النظام المحتملون المفتوحون",
  "Open leads ageing": "أعمار العملاء المحتملين المفتوحين",
  "Open pipeline": "مسار الفرص المفتوحة",
  "Open allocations": "الإسنادات المفتوحة",
  "Opportunities": "الفرص",
  "Opportunities by campaign": "الفرص حسب الحملة",
  "Opportunities by source": "الفرص حسب المصدر",
  "Opportunities per owner": "الفرص حسب المسؤول",
  "Opportunity": "فرصة",
  "Opportunity status": "حالة الفرصة",
  "Opps": "الفرص",
  "Outcomes": "النتائج",
  "Overdue follow-ups": "المتابعات المتأخرة",
  "Overdue follow-up": "متابعة متأخرة",
  "Pipeline by stage": "المسار حسب المرحلة",
  "Priority mix": "توزيع الأولويات",
  "Prob.": "الاحتمال",
  "Qualified": "مؤهل",
  "Recent leads": "أحدث العملاء المحتملين",
  "Response time by sales person": "وقت الاستجابة حسب مندوب المبيعات",
  "Sales person scoreboard": "لوحة أداء مندوبي المبيعات",
  "Sales person": "مندوب المبيعات",
  "Source × action": "المصدر × الإجراء",
  "Stage": "المرحلة",
  "Top cities": "أبرز المدن",
  "Top open opportunities": "أهم الفرص المفتوحة",
  "Top source": "أفضل مصدر",
  "Unallocated": "غير مسند",
  "Unallocated leads": "عملاء محتملون غير مسندين",
  "Urgent, not contacted": "عاجل، لم يتم التواصل",
  "Was due": "كان مستحقاً",
  "When": "الموعد",
  "allocated leads won": "عملاء مسندون تم اكتسابهم",
  "allocations in range": "الإسنادات خلال الفترة",
  "assigned → last contact": "الإسناد ← آخر تواصل",
  "avg hours": "متوسط الساعات",
  "captured → converted": "التسجيل ← التحويل",
  "contacted": "تم التواصل",
  "created in range": "أُنشئ خلال الفترة",
  "days since assigned": "أيام منذ الإسناد",
  "last 12": "آخر 12",
  "latest 40": "أحدث 40",
  "lead / open / replied / interested": "عميل محتمل / مفتوح / تم الرد / مهتم",
  "lead counts": "أعداد العملاء المحتملين",
  "leads unallocated >24h": "عملاء غير مسندين لأكثر من 24 ساعة",
  "no contact times yet": "لا توجد أوقات تواصل بعد",
  "no response": "لا توجد استجابة",
  "no sales person yet": "لم يُحدد مندوب مبيعات بعد",
  "older than 24h": "أقدم من 24 ساعة",
  "oldest first": "الأقدم أولاً",
  "open opportunities": "فرص مفتوحة",
  "open value": "قيمة الفرص المفتوحة",
  "open value by week": "قيمة الفرص المفتوحة حسب الأسبوع",
  "open, no reply": "مفتوح، دون رد",
  "overdue follow-ups": "متابعات متأخرة",
  "past due": "متأخر عن الاستحقاق",
  "past next follow-up": "تجاوز موعد المتابعة التالية",
  "still being worked": "قيد المتابعة",
  "urgent not contacted": "عاجل دون تواصل",
  "won / allocated": "المكتسبون / المسندون",
  "won in range": "الصفقات الرابحة خلال الفترة",
  "{0} waiting for a sales person": "{0} بانتظار مندوب مبيعات",
  "Action taken": "الإجراء المتخذ"
});
	Object.assign(AR, {"Master list of channels (Google Ads, Meta, LinkedIn, TikTok, Email, WhatsApp, SEO, Offline…)": "قائمة القنوات الرئيسية (Google Ads، Meta، LinkedIn، TikTok، البريد الإلكتروني، واتساب، تحسين البحث، وغيرها)", "Spend, impressions, clicks, reach and messaging numbers per channel per day": "الإنفاق والظهور والنقرات والوصول والرسائل لكل قناة يومياً", "Budget and targets per channel / campaign / period": "الميزانية والأهداف حسب القناة والحملة والفترة", "Content calendar + post performance (posts, reels, emails, blogs)": "تقويم المحتوى وأداء المنشورات والمقاطع والبريد والمدونات", "Website sessions, engagement, conversions and search performance per day and source": "جلسات الموقع والتفاعل والتحويلات وأداء البحث يومياً حسب المصدر", "Attribute every lead to a channel and campaign": "إسناد كل عميل محتمل إلى قناة وحملة", "Carry attribution through to the win and record revenue": "تتبع مصدر العميل حتى إتمام الصفقة وتسجيل الإيرادات", "Optional: channel on standard CRM leads": "اختياري: القناة على العملاء المحتملين في النظام"});
	Object.assign(AR_VAL, {"Published": "منشور", "Planned": "مخطط", "In Progress": "قيد التنفيذ", "Assigned": "مسند", "Contacted": "تم التواصل", "Converted": "تم التحويل", "Not Interested": "غير مهتم", "Interested": "مهتم", "Qualified": "مؤهل", "Won": "رابحة", "Lost": "خاسرة", "Replied": "تم الرد", "Quotation": "عرض سعر", "Lead": "عميل محتمل", "Opportunity": "فرصة", "No Response": "لا توجد استجابة", "Sent": "مرسل", "Not Sent": "لم يُرسل", "Paid": "مدفوع", "Organic": "عضوي", "Post": "منشور", "Reel": "مقطع قصير", "Video": "فيديو", "Email": "بريد إلكتروني", "Blog": "مدونة", "Social Media": "التواصل الاجتماعي", "Search": "البحث", "Direct": "مباشر", "Referral": "إحالة"});
	Object.keys(AR_VAL).forEach((key) => { if (AR[key] == null) AR[key] = AR_VAL[key]; });
	const fillArgs = (t, a) => (a && a.length ? String(t).replace(/\{(\d+)\}/g, (m, i) => (a[i] != null ? a[i] : m)) : t);
	// shadows Frappe's __ for this dashboard: Arabic first, then whatever Frappe returns
	const __ = (s, a) => {
		if (LANG === 'ar') {
			if (AR[s] != null) return fillArgs(AR[s], a);
			MISSING.add(s);
		}
		return LANG === 'en' ? fillArgs(s, a) : (typeof _fr === 'function' ? _fr(s, a) : fillArgs(s, a));
	};
	const tv = (v) => (LANG === 'ar' && v != null && AR_VAL[v] != null ? AR_VAL[v] : v); // data values (statuses, modes)
	const UNIT = { h: 'س', d: 'ي' };
	const unit = (u) => (LANG === 'ar' ? UNIT[u] || u : u);
	window.dmmMissing = () => Array.from(MISSING); // run in the console: strings still shown in English


	// one accent leads, the rest are neutral steps; the set follows the theme so every series stays readable
	const PALETTE_LIGHT = ['#2b4fc1', '#6f778a', '#8f97a8', '#aab1bf', '#c0c6d0', '#d1d5dd', '#dde0e6', '#e8eaee'];
	const PALETTE_DARK = ['#6c8cf0', '#8a91a1', '#737a8b', '#5f6676', '#4e5463', '#404554', '#343846', '#2b2f3b'];
	const MEM_TTL = 90 * 1000;
	const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const ICONS = {
		alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		flame: '<path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4 1-6 1-9z"/>',
		chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/>',
		tool: '<path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
		check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
		refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
	};
	const ico = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.check}</svg>`;

	// What the dashboard needs. Shown (live status) on the Setup tab.
	const SPEC = [
		{ dt: 'Marketing Channel', kind: 'new', why: 'Master list of channels (Google Ads, Meta, LinkedIn, TikTok, Email, WhatsApp, SEO, Offline…)', fields: ['channel_name', 'channel_type', 'platform', 'is_paid', 'channel_owner', 'enabled'] },
		{ dt: 'Marketing Daily Metrics', kind: 'new', why: 'Spend, impressions, clicks, reach and messaging numbers per channel per day', fields: ['date', 'channel', 'campaign', 'spend', 'impressions', 'reach', 'clicks', 'engagements', 'video_views', 'platform_leads', 'messages_sent', 'messages_delivered', 'replies'] },
		{ dt: 'Marketing Budget', kind: 'new', why: 'Budget and targets per channel / campaign / period', fields: ['from_date', 'to_date', 'channel', 'campaign', 'budget_amount', 'leads_target', 'conversions_target', 'revenue_target'] },
		{ dt: 'Marketing Content', kind: 'new', why: 'Content calendar + post performance (posts, reels, emails, blogs)', fields: ['title', 'channel', 'campaign', 'content_type', 'status', 'publish_date', 'content_owner', 'post_link', 'impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'video_views'] },
		{ dt: 'Web Analytics Daily', kind: 'new', why: 'Website sessions, engagement, conversions and search performance per day and source', fields: ['date', 'channel_group', 'sessions', 'users', 'new_users', 'engaged_sessions', 'bounce_rate', 'average_session_duration', 'conversions', 'search_impressions', 'search_clicks', 'average_position'] },
		{ dt: 'Leads Generation List', kind: 'fields', why: 'Attribute every lead to a channel and campaign', fields: ['marketing_channel', 'campaign'] },
		{ dt: 'Lead Allocation', kind: 'fields', why: 'Carry attribution through to the win and record revenue', fields: ['marketing_channel', 'campaign', 'deal_value', 'converted_customer', 'lost_reason'] },
		{ dt: 'Lead', kind: 'fields', why: 'Optional: channel on standard CRM leads', fields: ['marketing_channel'] },
	];

	// ---------------------------------------------------------------- helpers
	const esc = (s) => frappe.utils.escape_html(s == null ? '' : String(s));
	const strip = (h) => String(h == null ? '' : h).replace(/<[^>]*>/g, '').trim();
	const fmt = (n, d) => format_number(n || 0, null, d == null ? 0 : d);
	const link = (dt, name) => frappe.utils.get_form_link(dt, name, true);
	const blank = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : esc(tv(v)));

	function tone(status) {
		const s = String(status || '').toLowerCase();
		if (['converted', 'published', 'interested', 'completed', 'active', 'qualified', 'delivered'].includes(s)) return 'green';
		if (['follow up', 'scheduled', 'contacted', 'assigned', 'replied', 'quotation', 'ready', 'customer interested'].includes(s)) return 'blue';
		if (['lost', 'lost quotation', 'closed', 'cancelled', 'not interested', 'no response', 'error', 'do not contact', 'deleted'].includes(s)) return 'red';
		if (['open', 'pending', 'idea', 'in progress', 'quotation required', 'lead', 'opportunity', 'unqualified'].includes(s)) return 'orange';
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
		return `<div class="dmo-prog"><i><b style="width:${p}%"></b></i><span>${p}%</span></div>`;
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

	// ---------------------------------------------------------------- dashboard
  /* ==== DM PDF export v1 · same as the DMS kit exportPdf, for dashboards not built on the kit (tools/erp/kit/dm-pdf-standalone.js) ====
     Tables print as a PDF on the DM Letter Head: the HTML is rendered by ERPNext (frappe.utils.print_format.report_to_pdf,
     the route Desk reports use) and the browser saves the file. Replaces the CSV exports. */
  function dmPdfExport(name, title, head, rows, o) {
    o = o || {};
    var W = window, F = W.frappe, LH = { name: '2026 DMG - NEW', img: '/files/WhatsApp Image 2026-08-20 at 3.32.18 PM.jpeg', foot: '/files/erp footer.jpeg' };
    var e = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var abs = function (h) { return String(h || '').replace(/(src|href)=(["'])\/(?!\/)/g, '$1=$2' + W.location.origin + '/'); };
    var lh = F && F.boot && F.boot.letter_heads && F.boot.letter_heads[o.letterHead || LH.name];
    var top = abs(lh && lh.header ? lh.header : '<div style="text-align:center"><img src="' + encodeURI(LH.img) + '" style="max-width:100%"></div>');
    var bottom = abs(String(lh && lh.footer ? lh.footer : '<div style="text-align:center"><img src="' + encodeURI(LH.foot) + '" style="max-width:100%"></div>').replace(/position\s*:\s*fixed;?/gi, ''));
    var rtl = !!o.rtl, al = rtl ? 'right' : 'left', today = new Date().toISOString().slice(0, 10), max = 2000, cut = rows.slice(0, max);
    var isNum = head.map(function (_, i) { var vals = cut.map(function (r) { return r[i]; }).filter(function (v) { return v !== '' && v != null; }); return vals.length > 0 && vals.every(function (v) { return typeof v === 'number' || /^-?[\d,]+(\.\d+)?$/.test(String(v)); }); });
    var cell = function (v, n) { if (v == null) { return ''; } if (n && !isNaN(String(v).replace(/,/g, ''))) { return Number(String(v).replace(/,/g, '')).toLocaleString('en-US', { maximumFractionDigits: 2 }); } return String(v).replace(/\s+/g, ' ').trim(); };
    var sub = [o.sub, cut.length + (rows.length > cut.length ? ' of ' + rows.length : '') + ' rows', 'Printed ' + today].filter(Boolean).join(' · ');
    var html = '<!DOCTYPE html><html dir="' + (rtl ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><style>body{font-family:Arial,"DejaVu Sans","Noto Naskh Arabic",sans-serif;font-size:10px;color:#1b2430;margin:0}' +
      '.t{font-size:15px;font-weight:bold;margin:12px 0 2px;color:#0f2147}.s{color:#5b6678;margin:0 0 10px;font-size:9.5px}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid}' +
      'th{background:#0f2147;color:#fff;text-align:' + al + ';padding:5px 6px;font-size:9.5px}td{padding:4px 6px;border-bottom:1px solid #dde2ea;vertical-align:top;text-align:' + al + '}tbody tr:nth-child(even) td{background:#f4f6fa}.n{text-align:right;white-space:nowrap}.f{margin-top:16px}</style></head><body>' +
      top + '<div class="t">' + e(title) + '</div><div class="s">' + e(sub) + '</div><table><thead><tr>' + head.map(function (h, i) { return '<th' + (isNum[i] ? ' class="n"' : '') + '>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cut.map(function (r) { return '<tr>' + head.map(function (_, i) { return '<td' + (isNum[i] ? ' class="n"' : '') + '>' + e(cell(r[i], isNum[i])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      (o.note ? '<div class="s" style="margin-top:8px">' + e(o.note) + '</div>' : '') + (rows.length > cut.length ? '<div class="s">Only the first ' + max + ' rows are included. Narrow the filters to print the rest.</div>' : '') + '<div class="f">' + bottom + '</div></body></html>';
    var done = function (msg, bad) { if (F && F.show_alert) { F.show_alert({ message: msg, indicator: bad ? 'red' : 'blue' }); } };
    done(rtl ? 'جارٍ تجهيز ملف PDF…' : 'Preparing PDF…');
    return fetch('/api/method/frappe.utils.print_format.report_to_pdf', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Frappe-CSRF-Token': (F && F.csrf_token) || '', 'Accept': 'application/pdf' },
      body: 'html=' + encodeURIComponent(html) + '&orientation=' + (head.length > 6 ? 'Landscape' : 'Portrait') })
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.blob(); })
      .then(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b.type === 'application/pdf' ? b : new Blob([b], { type: 'application/pdf' }));
        a.download = String(name || 'export').replace(/[^\w-]+/g, '_') + '_' + today + '.pdf'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }, function () { done(rtl ? 'تعذر تصدير PDF.' : 'PDF export failed. Try again or narrow the list.', true); });
  }
  /* ==== end DM PDF export ==== */
	class DMMarketingDashboard {

		constructor($host) {
			this.$host = $host;
			this.loaded = {};
			this.cache = {};
			this.mem = new Map();
			this.scs = {};
			this.observers = [];
			this.active = 'spend';
			this.ready = false;
			this.last_load = null;
			this.tabs = [
				{ id: 'spend', label: __('Spend & channels') },
				{ id: 'content', label: __('Content & web') },
				{ id: 'setup', label: __('Setup') },
			];
			this.auto = true;
			try { this.auto = localStorage.getItem('dmm_auto') !== '0'; } catch (_) { /* ignore */ }
			this.on_filter = frappe.utils.debounce(() => {
				if (this.ready) { this.saveState(); this.refresh(false); }
			}, 500);
			this.make_layout();
			this.make_filters();
			this.ready = true;
			this.switch_tab(this.pending_tab || 'spend');
			this.timer = setInterval(() => {
				if (!this.$root[0].isConnected) { clearInterval(this.timer); return; }
				if (this.auto && !document.hidden && window.scrollY < 150) this.refresh(true);
			}, 5 * 60 * 1000);
		}

		// ---------- remembered filters / targets
		loadState() { try { return JSON.parse(localStorage.getItem('dmm_state') || '{}'); } catch (_) { return {}; } }
		saveState() {
			try {
				const f = this.get_f();
				localStorage.setItem('dmm_state', JSON.stringify({ campaign: f.campaign, from: f.from, to: f.to, on: f.today, tab: this.active }));
			} catch (_) { /* ignore */ }
		}
		targets() {
			const d = { leads_day: 0, conv_day: 0, spend_day: 0, cpl_max: 0 };
			try { return Object.assign(d, JSON.parse(localStorage.getItem('dmm_targets') || '{}')); } catch (_) { return d; }
		}
		edit_targets() {
			const t = this.targets();
			frappe.prompt([
				{ fieldname: 'leads_day', label: __('Leads per day'), fieldtype: 'Float', default: t.leads_day },
				{ fieldname: 'conv_day', label: __('Conversions per day'), fieldtype: 'Float', default: t.conv_day },
				{ fieldname: 'spend_day', label: __('Spend per day (SAR)'), fieldtype: 'Float', default: t.spend_day },
				{ fieldname: 'cpl_max', label: __('Max cost per lead (SAR)'), fieldtype: 'Float', default: t.cpl_max },
			], (v) => {
				try { localStorage.setItem('dmm_targets', JSON.stringify(v)); } catch (_) { /* ignore */ }
				this.refresh(false);
			}, __('Daily targets (saved in this browser)'), __('Save'));
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
			[
				{ fieldname: 'from_date', label: __('From'), fieldtype: 'Date', default: (same && st.from) || frappe.datetime.add_days(today, -29) },
				{ fieldname: 'to_date', label: __('To'), fieldtype: 'Date', default: (same && st.to) || today },
				{ fieldname: 'campaign', label: __('Campaign'), fieldtype: 'Link', options: 'Campaign', default: st.campaign || '' },
			].forEach((df) => {
				const $w = $('<div class="dmo-fc"></div>').appendTo($bar);
				df.change = () => this.on_filter();
				const c = frappe.ui.form.make_control({ df: df, parent: $w, render_input: true });
				if (df.default) c.set_value(df.default);
				this.f[df.fieldname] = c;
			});
			const $pre = $('<div class="dmo-pre"></div>').appendTo($bar);
			[[__('Today'), 0], [__('7D'), 6], [__('30D'), 29], [__('MTD'), 'm'], [__('90D'), 89]].forEach((x) => {
				$(`<button type="button">${x[0]}</button>`).appendTo($pre).on('click', () => {
					this.f.from_date.set_value(x[1] === 'm' ? today.slice(0, 8) + '01' : frappe.datetime.add_days(today, -x[1]));
					this.f.to_date.set_value(today);
				});
			});
			$(`<button type="button" class="dmo-tgt" title="${__('Set daily targets')}">${__('Targets')}</button>`).appendTo($pre).on('click', () => this.edit_targets());
		}

		make_layout() {
			const root = this.$host[0];
			// shadow DOM does not inherit Frappe's stylesheets: clone them in so charts + controls are styled
			if (window.ShadowRoot && root instanceof ShadowRoot) {
				document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
                    if (!Array.from(root.querySelectorAll('link[rel="stylesheet"]')).some((x) => x.href === l.href)) root.appendChild(l.cloneNode());
                });
			}
			const rtl = LANG === 'ar';
			const tabs = this.tabs.map((t) => `<button type="button" class="dmo-tab" data-tab="${t.id}">${t.label}</button>`).join('');
			const panes = this.tabs.map((t) => `<div class="dmo-pane" data-pane="${t.id}"></div>`).join('');
			this.$root = $(`<div class="dmo${rtl ? ' dmo-rtl' : ''}" dir="${rtl ? 'rtl' : 'ltr'}" lang="${LANG}">
				<div class="dmo-top"><div class="dmo-tabs">${tabs}</div><div class="dmo-meta"><i class="dmo-live"></i><span></span><label class="dmo-auto" title="${__('Refresh every 5 minutes')}"><input type="checkbox" ${this.auto ? 'checked' : ''}> ${__('Auto')}</label><button type="button" class="dmo-refresh" aria-label="${__('Refresh')}" title="${__('Refresh')}">${ico('refresh')}</button><button type="button" class="dmo-lang" aria-label="${__('Switch language')}" title="${__('Switch language')}">${rtl ? 'English' : 'العربية'}</button></div></div>
				<div class="dmo-filters"></div>
				<div class="dmo-alerts"></div>
				${panes}</div>`);
			this.$host.append(this.$root);
			this.$root.on('click', '.dmo-tab', (e) => this.switch_tab($(e.currentTarget).data('tab')));
			this.$root.on('click', '.dmo-lang', () => this.set_lang(LANG === 'ar' ? 'en' : 'ar'));
			this.$root.on('click', '.dmo-refresh', () => this.refresh(true));
			this.$root.on('change', '.dmo-auto input', (e) => {
				this.auto = e.target.checked;
				try { localStorage.setItem('dmm_auto', this.auto ? '1' : '0'); } catch (_) { /* ignore */ }
			});
			this.apply_theme();
			this.themeObs = new MutationObserver(() => this.apply_theme());
			this.themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
			this.fix_sticky();
			setTimeout(() => this.fix_sticky(), 400);
			$(window).off('resize.dmm').on('resize.dmm', frappe.utils.debounce(() => this.fix_sticky(), 200));
		}

		set_lang(l) {
            this.saveState();
            LANG = l;
            try { localStorage.setItem(LANG_KEY, l); } catch (_) {}
            clearInterval(this.timer);
            this.observers.forEach((o) => o.disconnect());
            if (this.themeObs) this.themeObs.disconnect();
            $(window).off('resize.dmm');
            this.$root.remove();
            new DMMarketingDashboard(this.$host);
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
			if (force) { this.mem.clear(); this.scs = {}; }
			this.load_active();
		}

		switch_tab(id) {
			this.active = id;
			this.$root.find('.dmo-tab').removeClass('active').filter(`[data-tab="${id}"]`).addClass('active');
			this.$root.find('.dmo-pane').removeClass('active').filter(`[data-pane="${id}"]`).addClass('active');
			if (this.ready) this.saveState();
			this.load_active();
		}

		async load_active() {
			const id = this.active;
			if (this.loaded[id]) return;
			this.loaded[id] = true;
			const $p = this.$root.find(`[data-pane="${id}"]`).empty();
			const f = this.get_f();
			try {
				await this['tab_' + id]($p, f);
				this.alerts(f);
				this.last_load = Date.now();
				this.$root.find('.dmo-meta span').text(__('Updated {0}', [moment().format('HH:mm:ss')]));
				this.prefetch(f);
			} catch (e) {
				console.error('[dm-mkt]', e);
				this.loaded[id] = false;
				$p.html(`<div class="dmo-err">${__('Could not load this tab')}<br><small>${esc(this.errmsg(e))}</small></div>`);
			}
		}

		// warm the shared datasets while the browser is idle so other tabs open instantly

		// warm the shared datasets while the browser is idle so other tabs open instantly
		prefetch(f) {
			if (this._pf) return;
			this._pf = true;
			const run = () => [this.lgl(f), this.alloc(f), this.unalloc(f), this.leads(f), this.opps(f)].forEach((p) => p.catch(() => {}));
			if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 4000 });
			else setTimeout(run, 1500);
		}

		get_f() {
			const v = (k) => this.f[k].get_value();
			const today = frappe.datetime.get_today();
			return this.cur = {
				from: v('from_date') || frappe.datetime.add_days(today, -29),
				to: v('to_date') || today,
				campaign: v('campaign') || '',
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
				if (e && e.setup) {
					$b.html(`<div class="dmo-empty">${__('Setup needed')}: <b>${esc(e.setup)}</b><br><a href="#" class="dmo-setup-link">${__('See the setup tab')}</a></div>`);
					$b.find('.dmo-setup-link').on('click', (ev) => { ev.preventDefault(); this.switch_tab('setup'); });
					return;
				}
				console.error('[dm-mkt]', e);
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
			const $k = $(`<div class="dmo-kpi" style="--i:${i}"><div class="dmo-kpi-body"><div class="dmo-kpi-l" title="${label}">${label}</div><div class="dmo-kpi-v">…</div><div class="dmo-kpi-s">&nbsp;</div></div></div>`).appendTo($row);
			if (o.go) $k.addClass('click').attr({title: __('Click to open the list'), role: 'button', tabindex: 0}).on('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); $k.trigger('click'); } }).on('click', () => (typeof o.go === 'function' ? o.go() : this.goto(o.go[0], o.go[1])));
			return fn().then((r) => {
				const $v = $k.find('.dmo-kpi-v');
				if (r.num != null) this.count_up($v, r.num, r.dec || 0, r.suffix || '');
				else $v.text(r.value);
				$k.find('.dmo-kpi-s').html(r.sub || '&nbsp;');
				if (r.tone) $k.addClass('tone-' + r.tone);
			}).catch((e) => {
				if (!(e && e.setup)) console.error('[dm-mkt]', e);
				$k.find('.dmo-kpi-v').text('—');
				$k.find('.dmo-kpi-s').text(e && e.setup ? __('setup needed') : __('unavailable'));
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
			const sign = d > 0 ? '+' : d < 0 ? '−' : '';
			return `<span class="${cls}">${sign}${fmt(Math.abs(d), Number.isInteger(d) ? 0 : 1)}</span> ${label || __('vs yday')}`;
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
			if (cfg.type === 'percentage') c2.barOptions = { height: 28 };
			const axis = cfg.type === 'bar' || cfg.type === 'line';
			if (sel && axis) c2.isNavigable = 1;
			new frappe.Chart(holder[0], Object.assign({
				height: 190, colors: this.$root.hasClass('dmo-dark') ? PALETTE_DARK : PALETTE_LIGHT, animate: 0, truncateLegends: 1, maxSlices: 8,
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
		gl(doctype, fields, filters, o) {
			o = o || {};
			const args = { doctype: doctype, fields: fields, filters: filters || [], limit_page_length: o.limit == null ? 3000 : o.limit };
			if (o.order_by) args.order_by = o.order_by;
			if (o.group_by) args.group_by = o.group_by;
			if (o.parent) args.parent = o.parent;
			return this.req('gl|' + JSON.stringify(args), () => frappe.xcall('frappe.client.get_list', args));
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


		// ---------- schema detection: the dashboard works with whatever doctypes/fields already exist
		async schema(dt) {
			if (this.scs[dt] !== undefined) return this.scs[dt];
			const can = (frappe.boot && frappe.boot.user && frappe.boot.user.can_read) || null;
			if (can && !can.includes(dt)) { this.scs[dt] = null; return null; }
			try {
				await new Promise((res, rej) => { try { frappe.model.with_doctype(dt, res); } catch (e) { rej(e); } });
				const meta = frappe.get_meta(dt);
				if (!meta) { this.scs[dt] = null; return null; }
				const s = new Set(['name', 'creation', 'modified', 'owner', 'docstatus']);
				(meta.fields || []).forEach((x) => s.add(x.fieldname));
				this.scs[dt] = s;
			} catch (_) { this.scs[dt] = null; }
			return this.scs[dt];
		}
		hasf(dt, field) { const s = this.scs[dt]; return !!(s && s.has(field)); }
		missing(what) { const e = new Error(__('{0} is not set up yet', [what])); e.setup = what; return e; }
		// generic dataset: only requests columns that really exist, so a missing custom field can never break a query
		dsq(key, dt, wanted, o) {
			o = o || {};
			return this.cached(key, async () => {
				const f = this.cur, sc = await this.schema(dt);
				if (!sc) throw this.missing(dt);
				const fields = ['name'].concat(wanted.filter((w) => w !== 'name' && sc.has(w)));
				const fl = [];
				if (o.date) {
					if (!sc.has(o.date)) throw this.missing(dt + '.' + o.date);
					fl.push([o.date, '>=', f.from + (o.datetime ? ' 00:00:00' : '')], [o.date, '<=', f.to + (o.datetime ? ' 23:59:59' : '')]);
				}
				if(f.campaign && o.campaign && !sc.has(o.campaign))throw this.missing(dt+'.'+o.campaign);
				if (f.campaign && o.campaign) fl.push([o.campaign, '=', f.campaign]);
				(o.extra || []).forEach((x) => { if (sc.has(x[0])) fl.push(x); });
				const rows=await this.gl(dt, fields, fl, { order_by: o.order, limit: o.limit || 10000 });
				if(['Marketing Channel','Marketing Daily Metrics','Marketing Budget','Marketing Content','Web Analytics Daily'].includes(dt)&&!rows.length)throw this.missing(dt+' has no source records in this scope');
				return rows;
			});
		}
		lgl(f) {
			return this.dsq('lgl', 'Leads Generation List', ['date', 'customer_name', 'city', 'action_taken', 'source', 'catalogue_status', 'creation', 'owner', 'marketing_channel', 'campaign'],
				{ date: 'date', campaign: 'campaign', order: 'date desc, creation desc', limit: 20000 });
		}
		alloc(f) {
			return this.dsq('alloc', 'Lead Allocation', ['lead', 'customer_name', 'sales_person', 'assignment_date', 'priority', 'status', 'outcome', 'last_contacted', 'next_follow_up', 'converted', 'conversion_date', 'source', 'action_taken', 'creation', 'marketing_channel', 'campaign', 'deal_value', 'converted_customer', 'lost_reason'],
				{ date: 'assignment_date', campaign: 'campaign', order: 'assignment_date desc, creation desc', limit: 20000 });
		}
		allocOpen(f) { // still being worked, any date
			return this.dsq('allocopen', 'Lead Allocation', ['lead', 'customer_name', 'sales_person', 'assignment_date', 'priority', 'status', 'outcome', 'last_contacted', 'next_follow_up', 'campaign'],
				{ campaign: 'campaign', extra: [['status', 'not in', ['Converted', 'Closed', 'Not Interested']]], order: 'next_follow_up asc', limit: 5000 });
		}
		// leads captured in the range that have no Lead Allocation yet
		unalloc(f) {
			return this.cached('unalloc', async () => {
				const rows = await this.lgl(f);
				if (!rows.length) return [];
				const names = rows.map((r) => r.name);
				const used = new Set();
				const parts = [];
				for (let i = 0; i < names.length; i += 500) parts.push(names.slice(i, i + 500));
				const res = await Promise.all(parts.map((c) => this.gl('Lead Allocation', ['lead'], [['lead', 'in', c]], { limit: 0 })));
				res.forEach((x) => x.forEach((r) => used.add(r.lead)));
				return rows.filter((r) => !used.has(r.name)).map((r) => Object.assign({}, r, {
					age_h: moment().diff(moment(r.creation || r.date), 'hours'),
				}));
			});
		}
		leads(f) { // standard ERPNext Lead
			return this.dsq('leads', 'Lead', ['lead_name', 'company_name', 'source', 'status', 'campaign_name', 'custom_location', 'custom_sales_person_', 'custom_allocation_status', 'qualification_status', 'type', 'request_type', 'annual_revenue', 'creation', 'territory', 'marketing_channel'],
				{ date: 'creation', datetime: true, campaign: 'campaign_name', order: 'creation desc', limit: 10000 });
		}
		opps(f) {
			return this.dsq('opps', 'Opportunity', ['party_name', 'customer_name', 'status', 'source', 'campaign', 'sales_stage', 'base_opportunity_amount', 'opportunity_amount', 'probability', 'expected_closing', 'transaction_date', 'opportunity_owner', 'opportunity_type', 'company'],
				{ date: 'transaction_date', campaign: 'campaign', order: 'transaction_date desc', limit: 5000 });
		}
		openOpps(f) { // open pipeline regardless of date
			return this.dsq('openopps', 'Opportunity', ['party_name', 'customer_name', 'status', 'source', 'campaign', 'sales_stage', 'base_opportunity_amount', 'opportunity_amount', 'probability', 'expected_closing', 'transaction_date', 'opportunity_owner'],
				{ campaign: 'campaign', extra: [['status', 'in', ['Open', 'Replied', 'Quotation']]], order: 'expected_closing asc', limit: 5000 });
		}
		channels() {
			return this.dsq('channels', 'Marketing Channel', ['channel_type', 'platform', 'is_paid', 'enabled'], { limit: 500 });
		}
		metrics(f) {
			return this.dsq('metrics', 'Marketing Daily Metrics', ['date', 'channel', 'campaign', 'spend', 'impressions', 'reach', 'clicks', 'engagements', 'video_views', 'platform_leads', 'messages_sent', 'messages_delivered', 'replies'],
				{ date: 'date', campaign: 'campaign', order: 'date asc', limit: 20000 });
		}
		budgets(f) {
			return this.cached('budgets', async () => {
				const sc = await this.schema('Marketing Budget');
				if (!sc) throw this.missing('Marketing Budget');
				const fl = [['from_date', '<=', f.to], ['to_date', '>=', f.from]];
				if(f.campaign&&!sc.has('campaign'))throw this.missing('Marketing Budget.campaign');
				if (f.campaign) fl.push(['campaign', '=', f.campaign]);
				const fields = ['name', 'from_date', 'to_date', 'channel', 'campaign', 'budget_amount', 'leads_target', 'conversions_target', 'revenue_target'].filter((x) => sc.has(x));
				return this.gl('Marketing Budget', fields, fl, { limit: 2000 });
			});
		}
		content(f) {
			return this.dsq('content', 'Marketing Content', ['title', 'channel', 'campaign', 'content_type', 'status', 'publish_date', 'content_owner', 'post_link', 'impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'video_views'],
				{ date: 'publish_date', campaign: 'campaign', order: 'publish_date desc', limit: 5000 });
		}
		web(f) {
			return this.dsq('web', 'Web Analytics Daily', ['date', 'channel_group', 'sessions', 'users', 'new_users', 'engaged_sessions', 'bounce_rate', 'average_session_duration', 'conversions', 'search_impressions', 'search_clicks', 'average_position'],
				{ date: 'date', order: 'date asc', limit: 20000 });
		}
		async empNames(ids) {
			const need = Array.from(new Set(ids.filter(Boolean)));
			if (!need.length) return {};
			const parts = [];
			for (let i = 0; i < need.length; i += 400) parts.push(need.slice(i, i + 400));
			const res = await Promise.all(parts.map((c) => this.gl('Employee', ['name', 'employee_name'], [['name', 'in', c]], { limit: 0 })));
			const m = {};
			res.forEach((x) => x.forEach((r) => { m[r.name] = r.employee_name || r.name; }));
			return m;
		}
		chanOf(r) { return r.marketing_channel || r.source || '—'; }
		engagement(r) { return flt(r.likes) + flt(r.comments) + flt(r.shares) + flt(r.saves); }
		pct(a, b) { return b ? (a / b) * 100 : 0; }
		isContacted(r) { return !!r.last_contacted || (r.status && r.status !== 'Assigned'); }


		// ---------- click-through maps
		kgo() {
			const f = this.cur, t = f.today, O = Object.assign;
			const rng = (k) => ({ [k]: ['between', [f.from, f.to]] });
			const lgl = (x) => ['Leads Generation List', O({}, rng('date'), f.campaign && this.hasf('Leads Generation List', 'campaign') ? { campaign: f.campaign } : {}, x)];
			const al = (x) => ['Lead Allocation', O({}, rng('assignment_date'), x)];
			const opp = (x) => ['Opportunity', O({}, f.campaign ? { campaign: f.campaign } : {}, x)];
			const open = { status: ['not in', ['Converted', 'Closed', 'Not Interested']] };
			return {
				[__('Leads captured')]: lgl({}),
				[__('Leads today')]: ['Leads Generation List', { date: t }],
				[__('Unallocated leads')]: () => this.goto('Leads Generation List', { date: ['between', [this.cur.from, this.cur.to]] }),
				[__('Allocated')]: al({}),
				[__('Conversions')]: al({ converted: 1 }),
				[__('Overdue follow-ups')]: ['Lead Allocation', O({ next_follow_up: ['<', moment().format('YYYY-MM-DD HH:mm:ss')] }, open)],
				[__('Opportunities')]: opp(rng('transaction_date')),
				[__('Open pipeline')]: opp({ status: ['in', ['Open', 'Replied', 'Quotation']] }),
				[__('Marketing spend')]: ['Marketing Daily Metrics', rng('date')],
				[__('Posts published')]: ['Marketing Content', O({ status: 'Published' }, rng('publish_date'))],
				[__('New CRM leads')]: ['Lead', { creation: ['between', [f.from, f.to]] }],
				[__('Won value')]: opp(O({ status: 'Converted' }, rng('transaction_date'))),
				[__('Assigned')]: al({}),
				[__('High / urgent open')]: al({ priority: ['in', ['High', 'Urgent']], status: ['in', ['Assigned', 'Follow Up', 'Contacted']] }),
				[__('No response')]: al({ status: 'No Response' }),
			};
		}
		gomap() {
			const f = this.cur, O = Object.assign;
			const rng = (k) => ({ [k]: ['between', [f.from, f.to]] });
			const camp = (dt, fld) => (f.campaign && this.hasf(dt, fld) ? { [fld]: f.campaign } : {});
			const lgl = (x) => ['Leads Generation List', O({}, rng('date'), camp('Leads Generation List', 'campaign'), x)];
			const al = (x) => ['Lead Allocation', O({}, rng('assignment_date'), x)];
			const ld = (x) => ['Lead', O({ creation: ['between', [f.from, f.to]] }, camp('Lead', 'campaign_name'), x)];
			const op = (x) => ['Opportunity', O({}, rng('transaction_date'), camp('Opportunity', 'campaign'), x)];
			const mc = (x) => ['Marketing Content', O({}, rng('publish_date'), x)];
			const by = (fn, field) => (k) => fn({ [field]: k });
			const chan = (k) => lgl(this.hasf('Leads Generation List', 'marketing_channel') ? { marketing_channel: k } : { source: k });
			return {
				[__('Leads by channel')]: chan,
				[__('Leads by source')]: by(lgl, 'source'),
				[__('Action taken')]: by(lgl, 'action_taken'),
				[__('Top cities')]: by(lgl, 'city'),
				[__('Leads by campaign')]: by(lgl, 'campaign'),
				[__('Allocation status')]: by(al, 'status'),
				[__('Outcomes')]: by(al, 'outcome'),
				[__('Priority mix')]: by(al, 'priority'),
				[__('Conversions by source')]: (k) => al({ converted: 1, source: k }),
				[__('CRM lead status')]: by(ld, 'status'),
				[__('CRM leads by source')]: by(ld, 'source'),
				[__('CRM leads by location')]: by(ld, 'custom_location'),
				[__('CRM leads by type')]: by(ld, 'type'),
				[__('CRM leads by campaign')]: by(ld, 'campaign_name'),
				[__('Opportunity status')]: by(op, 'status'),
				[__('Pipeline by stage')]: by(op, 'sales_stage'),
				[__('Opportunities by source')]: by(op, 'source'),
				[__('Opportunities by campaign')]: by(op, 'campaign'),
				[__('Content by type')]: by(mc, 'content_type'),
				[__('Content status')]: by(mc, 'status'),
				[__('Content by channel')]: by(mc, 'channel'),
			};
		}

		// ---------- alerts strip
		async alerts(f) {
			const $a = this.$root.find('.dmo-alerts');
			const nowS = moment().format('YYYY-MM-DD HH:mm:ss');
			const defs = [
				[() => this.unalloc(f).then((u) => u.filter((d) => d.age_h >= 24).length), __('leads unallocated >24h'), 'alert', () => this.goto('Leads Generation List', { date: ['between', [this.cur.from, this.cur.to]] })],
				[() => this.allocOpen(f).then((a) => a.filter((r) => r.next_follow_up && r.next_follow_up < nowS).length), __('overdue follow-ups'), 'clock',
					() => this.goto('Lead Allocation', { next_follow_up: ['<', nowS], status: ['not in', ['Converted', 'Closed', 'Not Interested']] })],
				[() => this.allocOpen(f).then((a) => a.filter((r) => ['High', 'Urgent'].includes(r.priority) && r.status === 'Assigned').length), __('urgent not contacted'), 'flame',
					() => this.goto('Lead Allocation', { priority: ['in', ['High', 'Urgent']], status: 'Assigned' })],
				[() => this.allocOpen(f).then((a) => a.filter((r) => r.status === 'No Response').length), __('no response'), 'chat', () => this.goto('Lead Allocation', { status: 'No Response' })],
				[() => this.setupGaps().then((n) => n), __('setup items missing'), 'tool', () => this.switch_tab('setup')],
			];
			const res = await Promise.all(defs.map((d) => d[0]().catch(() => null)));
			const hot = defs.map((d, i) => ({ n: res[i], label: d[1], icon: d[2], go: d[3] })).filter((x) => x.n);
			$a.empty();
			if (!hot.length) { $a.html(`<span class="dmo-al ok">${ico('check')} ${__('Nothing needs attention')}</span>`); return; }
			hot.forEach((x) => $(`<button type="button" class="dmo-al">${ico(x.icon)}<b>${fmt(x.n)}</b> ${x.label}</button>`).appendTo($a).on('click', x.go));
		}

		// ---------- setup checklist (what still has to be created in ERP)
		async setupStatus() {
			return this.cached('setupstatus', async () => {
				const out = [];
				for (const s of SPEC) {
					const sc = await this.schema(s.dt);
					out.push({ s: s, exists: !!sc, missingFields: sc ? s.fields.filter((x) => !sc.has(x)) : s.fields.slice() });
				}
				return out;
			});
		}
		async setupGaps() {
			const st = await this.setupStatus();
			return st.filter((x) => !x.exists || x.missingFields.length).length;
		}

		// ---------- PDF export (DM letterhead) for any table card
		add_export($b) {
			const $c = $b.closest('.dmo-card');
			if (!$b.find('table.dmo-t').length || $c.find('.dmo-exp').length) return;
			$('<button type="button" class="dmo-exp" title="PDF on the company letterhead">PDF</button>').appendTo($c.find('.dmo-card-h')).on('click', () => {
				const cells = (tr) => $(tr).children('th,td').map((__i, c) => String(c.textContent).replace(/\s+/g, ' ').trim()).get();
				const trs = $b.find('table.dmo-t tr').get(), title = strip($c.find('.dmo-card-t').text()) || 'Export';
				if (!trs.length) return;
				dmPdfExport(title, title, cells(trs[0]), trs.slice(1).map(cells), { rtl: document.documentElement.dir === 'rtl' || $c.closest('[dir="rtl"]').length > 0, sub: 'Digital Marketing Dashboard' });
			});
		}

		async sumq(doctype, field, filters) {
			const r = await this.gl(doctype, [`sum(${field}) as s`], filters, { limit: 0 });
			return flt((r[0] || {}).s);
		}
		K($row, specs) { // specs: [label, fn]
			const map = this.kgo();
			return specs.map((s) => this.kpi($row, s[0], s[1], { go: map[s[0]] || null }));
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
				const cfg = { type: type, data: { labels: ds.map((d, i) => (ds.length <= 16 ? d.slice(5) : type === 'bar' ? (i % 2 ? '' : d.slice(8)) : (i % 4 ? '' : d.slice(5)))), datasets: sets } };
				cfg.height = span >= 6 ? 240 : 190;
					if (type === 'line') cfg.lineOptions = { regionFill: 0, dotSize: 3 };
				if (o.marker > 0) cfg.yMarkers = [{ label: __('Target') + ' ' + fmt(o.marker, 1), value: o.marker, options: { labelPos: 'left' } }];
				if (o.stacked) cfg.barOptions = { stacked: 1 };
				this.chart($b, cfg);
			});
		}
		perDay(rows, dateKey, valFn) {
			return (ds) => ds.map((d) => rows.filter((r) => String(r[dateKey]).slice(0, 10) === d).reduce((a, r) => a + (valFn ? valFn(r) : 1), 0));
		}


		// small ordered bar chart (keeps label order, unlike chart_map which sorts by value)
		ord($g, title, span, f, labelsFn, valuesFn, o) {
			o = o || {};
			return this.panel($g, title, { span: span, sub: o.sub }, async ($b) => {
				const rows = await o.rows();
				const labels = labelsFn(rows), values = valuesFn(rows, labels);
				this.chart($b, { type: o.type || 'bar', data: { labels: labels, datasets: [{ name: o.name || '', values: values }] } });
			});
		}
		leadsByDay(rows) { return this.perDay(rows, 'date'); }
		allocStats(rows, names) {
			const per = {};
			rows.forEach((r) => {
				const k = r.sales_person || '—';
				per[k] = per[k] || { id: k, n: 0, contacted: 0, conv: 0, overdue: 0, resp: 0, respN: 0, deal: 0 };
				const p = per[k];
				p.n++;
				if (this.isContacted(r)) p.contacted++;
				if (flt(r.converted)) { p.conv++; p.deal += flt(r.deal_value); }
				if (r.last_contacted && r.creation) {
					const h = moment(r.last_contacted).diff(moment(r.creation), 'hours', true);
					if (h >= 0 && h <= 720) { p.resp += h; p.respN++; }
				}
			});
			Object.values(per).forEach((p) => { p.name = names[p.id] || p.id; });
			return per;
		}

		// ====================================================== TAB 1: OVERVIEW
		async tab_overview($p, f) {
			const tg = this.targets();
			const days = daysBetween(f.from, f.to) + 1;
			const nowS = moment().format('YYYY-MM-DD HH:mm:ss');
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const jobs = this.K($k, [
				[__('Leads captured'), async () => {
					const r = await this.lgl(f), pf = this.prevF(f);
					const p = f.campaign ? null : await this.cnt('Leads Generation List', [['date', '>=', pf.from], ['date', '<=', pf.to]]);
					return { num: r.length, sub: `${fmt(r.length / days, 1)}/${__('day')}` + this.tpct(r.length / days, tg.leads_day) + (p == null ? '' : ' · ' + this.delta(r.length, p, __('vs prev'))) };
				}],
				[__('Unallocated leads'), async () => {
					const u = await this.unalloc(f), old = u.filter((x) => x.age_h >= 24).length;
					return { num: u.length, sub: `${fmt(old)} ${__('older than 24h')}`, tone: u.length ? 'orange' : 'green' };
				}],
				[__('Allocated'), async () => {
					const [a, l] = await Promise.all([this.alloc(f), this.lgl(f)]);
					return { num: a.length, sub: `${fmt(this.pct(a.length, l.length))}% ${__('of leads')}` };
				}],
				[__('Contacted'), async () => {
					const a = await this.alloc(f), c = a.filter((r) => this.isContacted(r)).length;
					return { num: this.pct(c, a.length), suffix: '%', sub: `${fmt(c)} ${__('contacted')}` };
				}],
				[__('Conversions'), async () => {
					const a = await this.alloc(f), c = a.filter((r) => flt(r.converted));
					return { num: c.length, sub: this.hasf('Lead Allocation', 'deal_value') ? `${fmt(c.reduce((s, r) => s + flt(r.deal_value), 0))} SAR` : __('allocated leads won') };
				}],
				[__('Conversion rate'), async () => {
					const a = await this.alloc(f), c = a.filter((r) => flt(r.converted)).length;
					return { num: this.pct(c, a.length), dec: 1, suffix: '%', sub: __('won / allocated') };
				}],
				[__('Opportunities'), async () => {
					const o = await this.opps(f);
					return { num: o.length, sub: __('created in range') };
				}],
				[__('Open pipeline'), async () => {
					const o = await this.openOpps(f);
					return { num: o.reduce((s, r) => s + flt(r.base_opportunity_amount || r.opportunity_amount), 0), sub: `${fmt(o.length)} ${__('open opportunities')}` };
				}],
				[__('Marketing spend'), async () => {
					const m = await this.metrics(f), s = m.reduce((a, r) => a + flt(r.spend), 0);
					return { num: s, sub: __('SAR') + this.tpct(s / days, tg.spend_day) };
				}],
				[__('Cost per lead'), async () => {
					const [m, l] = await Promise.all([this.metrics(f), this.lgl(f)]);
					const s = m.reduce((a, r) => a + flt(r.spend), 0);
					if (!s || !l.length) return { value: '—', sub: __('needs spend and leads') };
					const c = s / l.length;
					return { num: c, dec: 1, sub: __('SAR per lead'), tone: tg.cpl_max > 0 ? (c > tg.cpl_max ? 'red' : 'green') : '' };
				}],
				[__('Revenue (converted)'), async () => {
					const a = await this.alloc(f);
					if (!this.hasf('Lead Allocation', 'deal_value')) throw this.missing('Lead Allocation.deal_value');
					return { num: a.filter((r) => flt(r.converted)).reduce((s, r) => s + flt(r.deal_value), 0), sub: __('SAR from won leads') };
				}],
				[__('Overdue follow-ups'), async () => {
					const a = (await this.allocOpen(f)).filter((r) => r.next_follow_up && r.next_follow_up < nowS);
					return { num: a.length, sub: __('past next follow-up'), tone: a.length ? 'red' : 'green' };
				}],
			]);

			this.ts($g, __('Leads per day'), 6, f, 'line', async (ds) => [{ name: __('Leads'), values: this.leadsByDay(await this.lgl(f))(ds) }], { marker: tg.leads_day });
			this.cp($g, __('Lead funnel'), 6, 'bar', async () => {
				const [l, a] = await Promise.all([this.lgl(f), this.alloc(f)]);
				return new Map([
					[__('Captured'), l.length], [__('Allocated'), a.length],
					[__('Contacted'), a.filter((r) => this.isContacted(r)).length],
					[__('Interested'), a.filter((r) => ['Interested', 'Quotation Required', 'Converted'].includes(r.status)).length],
					[__('Converted'), a.filter((r) => flt(r.converted)).length],
				]);
			}, { name: __('Leads'), n: 6, sub: __('captured → converted') });

			this.cp($g, __('Leads by channel'), 4, 'percentage', async () => tally(await this.lgl(f), (r) => this.chanOf(r)), { n: 7 });
			this.cp($g, __('Action taken'), 4, 'percentage', async () => tally(await this.lgl(f), (r) => r.action_taken || '—'));
			this.cp($g, __('Top cities'), 4, 'bar', async () => tally(await this.lgl(f), (r) => r.city || '—'), { name: __('Leads'), n: 8 });

			this.ts($g, __('Spend per day'), 6, f, 'bar', async (ds) => [{ name: __('SAR'), values: this.perDay(await this.metrics(f), 'date', (r) => flt(r.spend))(ds).map(Math.round) }], { marker: tg.spend_day });
			this.cp($g, __('Cost per lead by channel'), 6, 'bar', async () => {
				const [m, l] = await Promise.all([this.metrics(f), this.lgl(f)]);
				if (!this.hasf('Leads Generation List', 'marketing_channel')) throw this.missing('Leads Generation List.marketing_channel');
				const sp = tally(m, (r) => r.channel || '—', (r) => flt(r.spend)), ld = tally(l, (r) => r.marketing_channel || '—');
				return new Map(Array.from(sp.entries()).filter(([k, v]) => v > 0 && ld.get(k)).map(([k, v]) => [k, Math.round(v / ld.get(k))]));
			}, { name: __('SAR / lead'), n: 8 });

			this.panel($g, __('Attention needed'), { span: 6, sub: __('top 5 each') }, async ($b) => {
				const [un, op] = await Promise.all([this.unalloc(f), this.allocOpen(f)]);
				const names = await this.empNames(op.map((r) => r.sales_person));
				const li = (a, b, c) => `<li><span>${a}<br><span class="m">${b}</span></span><span class="m">${c}</span></li>`;
				const col = (t, items) => `<div><h6>${t}</h6><ul class="dmo-list">${items || `<li><span class="m">${__('All clear')}</span></li>`}</ul></div>`;
				const A = un.sort((a, b) => b.age_h - a.age_h).slice(0, 5).map((r) => li(link('Leads Generation List', r.name), esc(r.customer_name), r.age_h + 'h')).join('');
				const B = op.filter((r) => r.next_follow_up && r.next_follow_up < nowS).slice(0, 5)
					.map((r) => li(link('Lead Allocation', r.name), esc(names[r.sales_person] || r.sales_person), Math.max(1, daysBetween(r.next_follow_up)) + 'd')).join('');
				const C = op.filter((r) => ['High', 'Urgent'].includes(r.priority) && r.status === 'Assigned').slice(0, 5)
					.map((r) => li(link('Lead Allocation', r.name), esc(names[r.sales_person] || r.sales_person), esc(r.priority))).join('');
				$b.html(`<div class="dmo-att">${col(__('Unallocated'), A)}${col(__('Overdue follow-up'), B)}${col(__('Urgent, not contacted'), C)}</div>`);
			});
			this.panel($g, __('Latest leads'), { span: 6, sub: __('last 12') }, async ($b) => {
				$b.html(table([
					{ l: __('Lead'), v: (r) => link('Leads Generation List', r.name) },
					{ l: __('Customer'), v: (r) => blank(r.customer_name) },
					{ l: __('Date'), v: (r) => blank(r.date) },
					{ l: __('City'), v: (r) => blank(r.city) },
					{ l: __('Channel'), v: (r) => blank(this.chanOf(r)) },
					{ l: __('Action'), v: (r) => blank(r.action_taken) },
				], (await this.lgl(f)).slice(0, 12)));
			});
			await Promise.all(jobs);
		}

		// ====================================================== TAB 2: LEADS (Leads Generation List)
		async tab_leads($p, f) {
			const tg = this.targets();
			const days = daysBetween(f.from, f.to) + 1;
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const sent = (r) => flt(r.catalogue_status) === 1 || String(r.catalogue_status).toLowerCase() === 'send';
			const jobs = this.K($k, [
				[__('Leads captured'), async () => ({ num: (await this.lgl(f)).length, sub: __('in range') })],
				[__('Leads today'), async () => {
					const [a, b] = await Promise.all([this.cnt('Leads Generation List', [['date', '=', f.today]]), this.cnt('Leads Generation List', [['date', '=', frappe.datetime.add_days(f.today, -1)]])]);
					return { num: a, sub: this.delta(a, b) + this.tpct(a, tg.leads_day) };
				}],
				[__('Average per day'), async () => ({ num: (await this.lgl(f)).length / days, dec: 1, sub: `${days} ${__('days')}` })],
				[__('Unallocated leads'), async () => {
					const u = await this.unalloc(f);
					return { num: u.length, sub: __('no sales person yet'), tone: u.length ? 'orange' : 'green' };
				}],
				[__('Catalogue sent'), async () => {
					const l = await this.lgl(f);
					return { num: this.pct(l.filter(sent).length, l.length), suffix: '%', sub: `${fmt(l.filter(sent).length)} ${__('leads')}` };
				}],
				[__('WhatsApp share'), async () => {
					const l = await this.lgl(f), w = l.filter((r) => r.action_taken === 'Whatsapp').length;
					return { num: this.pct(w, l.length), suffix: '%', sub: `${fmt(w)} ${__('via WhatsApp')}` };
				}],
				[__('Cities reached'), async () => ({ num: new Set((await this.lgl(f)).map((r) => (r.city || '').trim().toLowerCase()).filter(Boolean)).size, sub: __('distinct') })],
				[__('Top source'), async () => {
					const e = sortedEntries(tally(await this.lgl(f), (r) => r.source || '—'), 1)[0];
					return e ? { value: e[0], sub: `${fmt(e[1])} ${__('leads')}` } : { value: '—', sub: '' };
				}],
			]);

			this.ts($g, __('Leads per day by source'), 6, f, 'bar', async (ds) => {
				const l = await this.lgl(f);
				const src = sortedEntries(tally(l, (r) => r.source || '—'), 6).map((x) => x[0]);
				return src.map((s) => ({ name: s, values: this.leadsByDay(l.filter((r) => (r.source || '—') === s))(ds) }));
			}, { stacked: true });
			this.cp($g, __('Leads by source'), 3, 'percentage', async () => tally(await this.lgl(f), (r) => r.source || '—'));
			this.cp($g, __('Action taken'), 3, 'percentage', async () => tally(await this.lgl(f), (r) => r.action_taken || '—'));

			this.ord($g, __('Leads by weekday'), 4, f, () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
				(rows, labels) => labels.map((d) => rows.filter((r) => moment(r.date).format('ddd') === d).length), { rows: () => this.lgl(f), name: __('Leads') });
			this.ord($g, __('Leads by hour'), 4, f, () => Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, '0')),
				(rows, labels) => labels.map((h) => rows.filter((r) => r.creation && moment(r.creation).format('HH') === h).length), { rows: () => this.lgl(f), name: __('Leads') });
			this.cp($g, __('Catalogue status'), 4, 'percentage', async () => tally(await this.lgl(f), (r) => (sent(r) ? __('Sent') : __('Not sent'))));

			this.cp($g, __('Top cities'), 6, 'bar', async () => tally(await this.lgl(f), (r) => (r.city || '—').trim()), { name: __('Leads'), n: 12 });
			this.cp($g, __('Leads by campaign'), 3, 'bar', async () => {
				if (!this.hasf('Leads Generation List', 'campaign')) throw this.missing('Leads Generation List.campaign');
				return tally((await this.lgl(f)).filter((r) => r.campaign), (r) => r.campaign);
			}, { name: __('Leads'), n: 6 });
			this.cp($g, __('Entered by'), 3, 'bar', async () => tally(await this.lgl(f), (r) => r.owner || '—'), { name: __('Leads'), n: 8 });

			this.panel($g, __('Source × action'), { span: 6, sub: __('lead counts') }, async ($b) => {
				const l = await this.lgl(f);
				const src = sortedEntries(tally(l, (r) => r.source || '—'), 8).map((x) => x[0]);
				const act = sortedEntries(tally(l, (r) => r.action_taken || '—'), 5).map((x) => x[0]);
				const max = Math.max(1, ...src.map((s) => Math.max(...act.map((a) => l.filter((r) => (r.source || '—') === s && (r.action_taken || '—') === a).length))));
				const head = `<th>${__('Source')}</th>` + act.map((a) => `<th class="num">${esc(a)}</th>`).join('');
				const body = src.map((s) => `<tr><td>${esc(s)}</td>${act.map((a) => { const n = l.filter((r) => (r.source || '—') === s && (r.action_taken || '—') === a).length; return `<td class="h" style="${n ? `background:color-mix(in srgb, var(--royal) ${Math.round(12 + 75 * n / max)}%, transparent);color:${n / max > 0.55 ? 'var(--heat-ink)' : 'inherit'}` : ''}">${n || ''}</td>`; }).join('')}</tr>`).join('');
				$b.html(src.length ? `<div class="dmo-scroll"><table class="dmo-t dmo-heat"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` : `<div class="dmo-empty">${__('No leads in range')}</div>`);
			});
			this.cp($g, __('Leads by channel'), 6, 'bar', async () => tally(await this.lgl(f), (r) => this.chanOf(r)), { name: __('Leads'), n: 10 });

			this.panel($g, __('Unallocated leads'), { span: 12, sub: __('oldest first') }, async ($b) => {
				const u = (await this.unalloc(f)).sort((a, b) => b.age_h - a.age_h);
				this.sub($b, __('{0} waiting for a sales person', [u.length]));
				$b.html(table([
					{ l: __('Lead'), v: (r) => link('Leads Generation List', r.name) },
					{ l: __('Customer'), v: (r) => blank(r.customer_name) },
					{ l: __('Date'), v: (r) => blank(r.date) },
					{ l: __('Age (h)'), cls: 'num', v: (r) => `<span class="dmo-b ${r.age_h >= 24 ? 'red' : 'orange'}">${fmt(r.age_h)}</span>` },
					{ l: __('City'), v: (r) => blank(r.city) },
					{ l: __('Source'), v: (r) => blank(r.source) },
					{ l: __('Action'), v: (r) => blank(r.action_taken) },
				], u.slice(0, 50), { empty: __('Every lead has been allocated') }));
			});
			this.panel($g, __('Recent leads'), { span: 12, sub: __('latest 40') }, async ($b) => {
				$b.html(table([
					{ l: __('Lead'), v: (r) => link('Leads Generation List', r.name) },
					{ l: __('Customer'), v: (r) => blank(r.customer_name) },
					{ l: __('Date'), v: (r) => blank(r.date) },
					{ l: __('City'), v: (r) => blank(r.city) },
					{ l: __('Source'), v: (r) => blank(r.source) },
					{ l: __('Channel'), v: (r) => blank(r.marketing_channel) },
					{ l: __('Action'), v: (r) => blank(r.action_taken) },
					{ l: __('Entered by'), v: (r) => blank(r.owner) },
				], (await this.lgl(f)).slice(0, 40)));
			});
			await Promise.all(jobs);
		}

		// ====================================================== TAB 3: FOLLOW-UP (Lead Allocation)
		async tab_followup($p, f) {
			const tg = this.targets();
			const nowS = moment().format('YYYY-MM-DD HH:mm:ss');
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const resp = (rows) => {
				const v = rows.filter((r) => r.last_contacted && r.creation).map((r) => moment(r.last_contacted).diff(moment(r.creation), 'hours', true)).filter((h) => h >= 0 && h <= 720);
				return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
			};
			const jobs = this.K($k, [
				[__('Assigned'), async () => ({ num: (await this.alloc(f)).length, sub: __('allocations in range') })],
				[__('Contacted'), async () => { const a = await this.alloc(f), c = a.filter((r) => this.isContacted(r)).length; return { num: this.pct(c, a.length), suffix: '%', sub: `${fmt(c)} ${__('contacted')}` }; }],
				[__('Avg response'), async () => { const h = resp(await this.alloc(f)); return h == null ? { value: '—', sub: __('no contact times yet') } : { num: h, dec: 1, suffix: ' h', sub: __('assigned → last contact') }; }],
				[__('Conversions'), async () => { const c = (await this.alloc(f)).filter((r) => flt(r.converted)); return { num: c.length, sub: __('won in range') }; }],
				[__('Conversion rate'), async () => { const a = await this.alloc(f); return { num: this.pct(a.filter((r) => flt(r.converted)).length, a.length), dec: 1, suffix: '%', sub: __('won / allocated') }; }],
				[__('Overdue follow-ups'), async () => { const n = (await this.allocOpen(f)).filter((r) => r.next_follow_up && r.next_follow_up < nowS).length; return { num: n, sub: __('past due'), tone: n ? 'red' : 'green' }; }],
				[__('High / urgent open'), async () => { const n = (await this.allocOpen(f)).filter((r) => ['High', 'Urgent'].includes(r.priority)).length; return { num: n, sub: __('still being worked'), tone: n ? 'orange' : 'green' }; }],
				[__('No response'), async () => { const n = (await this.allocOpen(f)).filter((r) => r.status === 'No Response').length; return { num: n, sub: __('open, no reply') }; }],
			]);

			this.cp($g, __('Allocation status'), 4, 'percentage', async () => tally(await this.alloc(f), (r) => r.status || '—'));
			this.cp($g, __('Outcomes'), 4, 'bar', async () => tally(await this.alloc(f), (r) => r.outcome || '—'), { name: __('Allocations'), n: 9 });
			this.cp($g, __('Priority mix'), 4, 'percentage', async () => tally(await this.alloc(f), (r) => r.priority || '—'));

			this.ts($g, __('Assignments per day'), 6, f, 'line', async (ds) => [{ name: __('Assigned'), values: this.perDay(await this.alloc(f), 'assignment_date')(ds) }]);
			this.ts($g, __('Conversions per day'), 6, f, 'bar', async (ds) => [{ name: __('Conversions'), values: this.perDay((await this.alloc(f)).filter((r) => flt(r.converted)), 'conversion_date')(ds) }], { marker: tg.conv_day });

			this.panel($g, __('Sales person scoreboard'), { span: 12, sub: __('range') }, async ($b) => {
				const [a, open] = await Promise.all([this.alloc(f), this.allocOpen(f)]);
				const names = await this.empNames(a.concat(open).map((r) => r.sales_person));
				const per = this.allocStats(a, names);
				open.filter((r) => r.next_follow_up && r.next_follow_up < nowS).forEach((r) => {
					const k = r.sales_person || '—';
					per[k] = per[k] || { id: k, name: names[k] || k, n: 0, contacted: 0, conv: 0, overdue: 0, resp: 0, respN: 0, deal: 0 };
					per[k].overdue++;
				});
				const hasDeal = this.hasf('Lead Allocation', 'deal_value');
				const cols = [
					{ l: __('Sales person'), v: (r) => blank(r.name) },
					{ l: __('Assigned'), cls: 'num', v: (r) => fmt(r.n) },
					{ l: __('Contacted'), v: (r) => progress(this.pct(r.contacted, r.n)) },
					{ l: __('Converted'), cls: 'num', v: (r) => fmt(r.conv) },
					{ l: __('Conv. %'), cls: 'num', v: (r) => fmt(this.pct(r.conv, r.n), 1) + '%' },
					{ l: __('Overdue'), cls: 'num', v: (r) => (r.overdue ? `<span class="dmo-b red">${r.overdue}</span>` : '0') },
					{ l: __('Avg resp (h)'), cls: 'num', v: (r) => (r.respN ? fmt(r.resp / r.respN, 1) : '—') },
				];
				if (hasDeal) cols.push({ l: __('Deal value'), cls: 'num', v: (r) => fmt(r.deal) });
				$b.html(table(cols, Object.values(per).sort((x, y) => y.n - x.n)));
			});

			this.panel($g, __('Response time by sales person'), { span: 6, sub: __('avg hours') }, async ($b) => {
				const a = await this.alloc(f), names = await this.empNames(a.map((r) => r.sales_person));
				const per = Object.values(this.allocStats(a, names)).filter((p) => p.respN);
				this.chart($b, { type: 'bar', data: { labels: per.map((p) => p.name), datasets: [{ name: __('Hours'), values: per.map((p) => Math.round((p.resp / p.respN) * 10) / 10) }] } });
			});
			this.cp($g, __('Conversions by source'), 6, 'bar', async () => tally((await this.alloc(f)).filter((r) => flt(r.converted)), (r) => this.chanOf(r)), { name: __('Conversions'), n: 8 });

			this.panel($g, __('Follow-ups due — next 7 days'), { span: 6 }, async ($b) => {
				const op = await this.allocOpen(f), names = await this.empNames(op.map((r) => r.sales_person));
				const end = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');
				const rows = op.filter((r) => r.next_follow_up && r.next_follow_up >= nowS && r.next_follow_up <= end).sort((a, b) => (a.next_follow_up > b.next_follow_up ? 1 : -1));
				this.sub($b, __('{0} scheduled', [rows.length]));
				$b.html(table([
					{ l: __('Allocation'), v: (r) => link('Lead Allocation', r.name) },
					{ l: __('Customer'), v: (r) => blank(r.customer_name) },
					{ l: __('Sales person'), v: (r) => blank(names[r.sales_person] || r.sales_person) },
					{ l: __('When'), v: (r) => blank(String(r.next_follow_up).slice(0, 16)) },
					{ l: __('Priority'), v: (r) => blank(r.priority) },
				], rows.slice(0, 40), { empty: __('No follow-ups scheduled this week') }));
			});
			this.panel($g, __('Overdue follow-ups'), { span: 6 }, async ($b) => {
				const op = await this.allocOpen(f), names = await this.empNames(op.map((r) => r.sales_person));
				const rows = op.filter((r) => r.next_follow_up && r.next_follow_up < nowS);
				this.sub($b, __('{0} overdue', [rows.length]));
				$b.html(table([
					{ l: __('Allocation'), v: (r) => link('Lead Allocation', r.name) },
					{ l: __('Customer'), v: (r) => blank(r.customer_name) },
					{ l: __('Sales person'), v: (r) => blank(names[r.sales_person] || r.sales_person) },
					{ l: __('Was due'), v: (r) => blank(String(r.next_follow_up).slice(0, 16)) },
					{ l: __('Days late'), cls: 'num', v: (r) => `<span class="dmo-b red">${Math.max(1, daysBetween(r.next_follow_up))}</span>` },
				], rows.slice(0, 40), { empty: __('No overdue follow-ups') }));
			});

			this.cp($g, __('Open leads ageing'), 6, 'bar', async () => {
				const b = { '0–2 d': 0, '3–7 d': 0, '8–14 d': 0, '15+ d': 0 };
				(await this.allocOpen(f)).forEach((r) => { const d = daysBetween(r.assignment_date); b[d <= 2 ? '0–2 d' : d <= 7 ? '3–7 d' : d <= 14 ? '8–14 d' : '15+ d']++; });
				return new Map(Object.entries(b));
			}, { name: __('Open allocations'), n: 4, sub: __('days since assigned') });
			this.cp($g, __('Lost reasons'), 6, 'bar', async () => {
				const a = await this.alloc(f);
				if (!this.hasf('Lead Allocation', 'lost_reason')) throw this.missing('Lead Allocation.lost_reason');
				return tally(a.filter((r) => r.lost_reason), (r) => r.lost_reason);
			}, { name: __('Allocations'), n: 8 });
			await Promise.all(jobs);
		}

		// ====================================================== TAB 4: PIPELINE (Lead + Opportunity)
		async tab_pipeline($p, f) {
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const amt = (o) => flt(o.base_opportunity_amount || o.opportunity_amount);
			const jobs = this.K($k, [
				[__('New CRM leads'), async () => ({ num: (await this.leads(f)).length, sub: __('created in range') })],
				[__('Open CRM leads'), async () => ({ num: (await this.leads(f)).filter((r) => ['Lead', 'Open', 'Replied', 'Interested'].includes(r.status)).length, sub: __('lead / open / replied / interested') })],
				[__('Qualified'), async () => { const l = await this.leads(f), q = l.filter((r) => r.qualification_status === 'Qualified').length; return { num: q, sub: `${fmt(this.pct(q, l.length))}% ${__('of new leads')}` }; }],
				[__('Opportunities'), async () => ({ num: (await this.opps(f)).length, sub: __('created in range') })],
				[__('Open pipeline'), async () => { const o = await this.openOpps(f); return { num: o.reduce((s, r) => s + amt(r), 0), sub: `${fmt(o.length)} ${__('open')}` }; }],
				[__('Won value'), async () => { const o = (await this.opps(f)).filter((r) => r.status === 'Converted'); return { num: o.reduce((s, r) => s + amt(r), 0), sub: `${fmt(o.length)} ${__('won')}` }; }],
				[__('Win rate'), async () => {
					const o = await this.opps(f), w = o.filter((r) => r.status === 'Converted').length, l = o.filter((r) => r.status === 'Lost').length;
					return { num: this.pct(w, w + l), suffix: '%', sub: `${w} ${__('won')} · ${l} ${__('lost')}` };
				}],
				[__('Avg deal size'), async () => { const o = (await this.opps(f)).filter((r) => r.status === 'Converted'); return o.length ? { num: o.reduce((s, r) => s + amt(r), 0) / o.length, sub: __('SAR per won deal') } : { value: '—', sub: __('no won deals') }; }],
			]);

			this.cp($g, __('CRM lead status'), 4, 'percentage', async () => tally(await this.leads(f), (r) => r.status || '—'));
			this.cp($g, __('CRM leads by source'), 4, 'bar', async () => tally(await this.leads(f), (r) => r.source || '—'), { name: __('Leads'), n: 8 });
			this.cp($g, __('CRM leads by location'), 4, 'bar', async () => tally(await this.leads(f), (r) => r.custom_location || '—'), { name: __('Leads'), n: 8 });

			this.ts($g, __('New CRM leads per day'), 6, f, 'line', async (ds) => [{ name: __('Leads'), values: this.perDay(await this.leads(f), 'creation')(ds) }]);
			this.cp($g, __('CRM leads by type'), 3, 'percentage', async () => tally(await this.leads(f), (r) => r.type || '—'));
			this.cp($g, __('CRM leads by campaign'), 3, 'bar', async () => tally((await this.leads(f)).filter((r) => r.campaign_name), (r) => r.campaign_name), { name: __('Leads'), n: 6 });

			this.cp($g, __('Opportunity status'), 4, 'percentage', async () => tally(await this.opps(f), (r) => r.status || '—'));
			this.cp($g, __('Pipeline by stage'), 4, 'bar', async () => tally(await this.openOpps(f), (r) => r.sales_stage || '—', (r) => Math.round(amt(r))), { name: __('SAR'), n: 8, sub: __('open value') });
			this.cp($g, __('Opportunities by source'), 4, 'bar', async () => tally(await this.opps(f), (r) => r.source || '—', (r) => Math.round(amt(r))), { name: __('SAR'), n: 8, sub: __('value') });

			this.cp($g, __('Opportunities by campaign'), 6, 'bar', async () => tally((await this.opps(f)).filter((r) => r.campaign), (r) => r.campaign, (r) => Math.round(amt(r))), { name: __('SAR'), n: 8, sub: __('value') });
			this.ord($g, __('Expected closing — next 8 weeks'), 6, f,
				() => Array.from({ length: 8 }, (_, i) => moment().startOf('isoWeek').add(i, 'weeks').format('DD MMM')),
				(rows, labels) => labels.map((_, i) => {
					const a = moment().startOf('isoWeek').add(i, 'weeks'), b = a.clone().add(7, 'days');
					return Math.round(rows.filter((r) => r.expected_closing && moment(r.expected_closing).isSameOrAfter(a) && moment(r.expected_closing).isBefore(b)).reduce((s, r) => s + amt(r), 0));
				}), { rows: () => this.openOpps(f), name: __('SAR'), sub: __('open value by week') });

			this.panel($g, __('Top open opportunities'), { span: 12, sub: __('by value') }, async ($b) => {
				const o = (await this.openOpps(f)).sort((a, b) => amt(b) - amt(a)).slice(0, 25);
				$b.html(table([
					{ l: __('Opportunity'), v: (r) => link('Opportunity', r.name) },
					{ l: __('Customer / lead'), v: (r) => blank(r.customer_name || r.party_name) },
					{ l: __('Stage'), v: (r) => blank(r.sales_stage) },
					{ l: __('Status'), v: (r) => badge(r.status) },
					{ l: __('Source'), v: (r) => blank(r.source) },
					{ l: __('Campaign'), v: (r) => blank(r.campaign) },
					{ l: __('Expected close'), v: (r) => blank(r.expected_closing) },
					{ l: __('Prob.'), cls: 'num', v: (r) => fmt(r.probability) + '%' },
					{ l: __('Value'), cls: 'num', v: (r) => `<b>${fmt(amt(r))}</b>` },
				], o, { empty: __('No open opportunities') }));
			});
			this.panel($g, __('Opportunities per owner'), { span: 6 }, async ($b) => {
				const per = {};
				(await this.opps(f)).forEach((r) => {
					const k = r.opportunity_owner || '—';
					per[k] = per[k] || { o: k, n: 0, won: 0, lost: 0, v: 0, wv: 0 };
					per[k].n++; per[k].v += amt(r);
					if (r.status === 'Converted') { per[k].won++; per[k].wv += amt(r); }
					if (r.status === 'Lost') per[k].lost++;
				});
				$b.html(table([
					{ l: __('Owner'), v: (r) => blank(r.o) },
					{ l: __('Opps'), cls: 'num', v: (r) => fmt(r.n) },
					{ l: __('Won'), cls: 'num', v: (r) => fmt(r.won) },
					{ l: __('Lost'), cls: 'num', v: (r) => fmt(r.lost) },
					{ l: __('Won value'), cls: 'num', v: (r) => fmt(r.wv) },
				], Object.values(per).sort((a, b) => b.v - a.v)));
			});
			this.cp($g, __('CRM leads by sales person'), 6, 'bar', async () => tally(await this.leads(f), (r) => r.custom_sales_person_ || '—'), { name: __('Leads'), n: 10 });
			await Promise.all(jobs);
		}

		// ====================================================== TAB 5: SPEND & CHANNELS (new doctypes)
		async tab_spend($p, f) {
			const tg = this.targets();
			const days = daysBetween(f.from, f.to) + 1;
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const sum = (rows, k) => rows.reduce((a, r) => a + flt(r[k]), 0);
			const jobs = this.K($k, [
				[__('Marketing spend'), async () => {
					const m = await this.metrics(f), s = sum(m, 'spend');
					let sub = __('SAR') + this.tpct(s / days, tg.spend_day);
					try { const b = sum(await this.budgets(f), 'budget_amount'); if (b) sub = `${fmt(this.pct(s, b))}% ${__('of budget')}`; } catch (_) { /* no budgets yet */ }
					return { num: s, sub: sub };
				}],
				[__('Impressions'), async () => ({ num: sum(await this.metrics(f), 'impressions'), sub: __('ads + organic') })],
				[__('Clicks'), async () => ({ num: sum(await this.metrics(f), 'clicks'), sub: __('all channels') })],
				[__('CTR'), async () => { const m = await this.metrics(f), i = sum(m, 'impressions'); return i ? { num: this.pct(sum(m, 'clicks'), i), dec: 2, suffix: '%', sub: __('clicks / impressions') } : { value: '—', sub: __('no impressions') }; }],
				[__('Cost per click'), async () => { const m = await this.metrics(f), c = sum(m, 'clicks'); return c ? { num: sum(m, 'spend') / c, dec: 2, sub: __('SAR per click') } : { value: '—', sub: __('no clicks') }; }],
				[__('Cost per lead'), async () => {
					const [m, l] = await Promise.all([this.metrics(f), this.lgl(f)]);
					const s = sum(m, 'spend');
					if (!s || !l.length) return { value: '—', sub: __('needs spend and leads') };
					const c = s / l.length;
					return { num: c, dec: 1, sub: __('SAR per lead'), tone: tg.cpl_max > 0 ? (c > tg.cpl_max ? 'red' : 'green') : '' };
				}],
				[__('Cost per conversion'), async () => {
					const [m, a] = await Promise.all([this.metrics(f), this.alloc(f)]);
					const s = sum(m, 'spend'), c = a.filter((r) => flt(r.converted)).length;
					return s && c ? { num: s / c, dec: 0, sub: __('SAR per won lead') } : { value: '—', sub: __('needs spend and wins') };
				}],
				[__('ROAS'), async () => {
					const [m, a] = await Promise.all([this.metrics(f), this.alloc(f)]);
					if (!this.hasf('Lead Allocation', 'deal_value')) throw this.missing('Lead Allocation.deal_value');
					const s = sum(m, 'spend'), rev = a.filter((r) => flt(r.converted)).reduce((x, r) => x + flt(r.deal_value), 0);
					return s ? { num: rev / s, dec: 1, suffix: '×', sub: `${fmt(rev)} SAR ${__('revenue')}` } : { value: '—', sub: __('no spend') };
				}],
			]);

			this.ts($g, __('Spend per day by channel'), 6, f, 'bar', async (ds) => {
				const m = await this.metrics(f);
				const ch = sortedEntries(tally(m, (r) => r.channel || '—', (r) => flt(r.spend)), 6).map((x) => x[0]);
				return ch.map((c) => ({ name: c, values: this.perDay(m.filter((r) => (r.channel || '—') === c), 'date', (r) => flt(r.spend))(ds).map(Math.round) }));
			}, { stacked: true, marker: tg.spend_day });
			this.cp($g, __('Spend share'), 3, 'percentage', async () => tally(await this.metrics(f), (r) => r.channel || '—', (r) => Math.round(flt(r.spend))), { n: 7 });
			this.cp($g, __('Spend by channel type'), 3, 'percentage', async () => {
				const [m, ch] = await Promise.all([this.metrics(f), this.channels().catch(() => [])]);
				const t = {}; ch.forEach((c) => { t[c.name] = c.channel_type || '—'; });
				return tally(m, (r) => t[r.channel] || '—', (r) => Math.round(flt(r.spend)));
			});

			this.panel($g, __('Channel scoreboard'), { span: 12, sub: __('spend → leads → wins') }, async ($b) => {
				const [m, l, a] = await Promise.all([this.metrics(f), this.lgl(f), this.alloc(f)]);
				const hasCh = this.hasf('Leads Generation List', 'marketing_channel');
				const per = {};
				m.forEach((r) => {
					const k = r.channel || '—';
					per[k] = per[k] || { c: k, spend: 0, imp: 0, clk: 0 };
					per[k].spend += flt(r.spend); per[k].imp += flt(r.impressions); per[k].clk += flt(r.clicks);
				});
				const leads = tally(l, (r) => r.marketing_channel || '—'), wins = tally(a.filter((r) => flt(r.converted)), (r) => r.marketing_channel || '—');
				const rev = tally(a.filter((r) => flt(r.converted)), (r) => r.marketing_channel || '—', (r) => flt(r.deal_value));
				const rows = Object.values(per).sort((x, y) => y.spend - x.spend);
				$b.html(table([
					{ l: __('Channel'), v: (r) => blank(r.c) },
					{ l: __('Spend'), cls: 'num', v: (r) => fmt(r.spend) },
					{ l: __('Impr.'), cls: 'num', v: (r) => fmt(r.imp) },
					{ l: __('Clicks'), cls: 'num', v: (r) => fmt(r.clk) },
					{ l: __('CTR'), cls: 'num', v: (r) => (r.imp ? fmt(this.pct(r.clk, r.imp), 2) + '%' : '—') },
					{ l: __('CPC'), cls: 'num', v: (r) => (r.clk ? fmt(r.spend / r.clk, 2) : '—') },
					{ l: __('Leads'), cls: 'num', v: (r) => (hasCh ? fmt(leads.get(r.c) || 0) : '—') },
					{ l: __('CPL'), cls: 'num', v: (r) => (hasCh && leads.get(r.c) ? fmt(r.spend / leads.get(r.c), 1) : '—') },
					{ l: __('Wins'), cls: 'num', v: (r) => (hasCh ? fmt(wins.get(r.c) || 0) : '—') },
					{ l: __('Revenue'), cls: 'num', v: (r) => (hasCh ? fmt(rev.get(r.c) || 0) : '—') },
					{ l: __('ROAS'), cls: 'num', v: (r) => (hasCh && r.spend ? fmt((rev.get(r.c) || 0) / r.spend, 1) + '×' : '—') },
				], rows, { empty: __('No spend recorded in this range') }));
			});

			this.panel($g, __('Budget vs actual'), { span: 6, sub: __('by channel') }, async ($b) => {
				const [b, m] = await Promise.all([this.budgets(f), this.metrics(f)]);
				const B = tally(b, (r) => r.channel || '—', (r) => flt(r.budget_amount)), S = tally(m, (r) => r.channel || '—', (r) => flt(r.spend));
				const names = Array.from(new Set(Array.from(B.keys()).concat(Array.from(S.keys())))).slice(0, 10);
				this.chart($b, { type: 'bar', data: { labels: names, datasets: [{ name: __('Budget'), values: names.map((n) => Math.round(B.get(n) || 0)) }, { name: __('Spent'), values: names.map((n) => Math.round(S.get(n) || 0)) }] } });
			});
			this.panel($g, __('Budget burn'), { span: 6, sub: __('spent vs budget') }, async ($b) => {
				const [b, m] = await Promise.all([this.budgets(f), this.metrics(f)]);
				const B = tally(b, (r) => r.channel || '—', (r) => flt(r.budget_amount)), S = tally(m, (r) => r.channel || '—', (r) => flt(r.spend));
				$b.html(table([
					{ l: __('Channel'), v: (r) => blank(r[0]) },
					{ l: __('Budget'), cls: 'num', v: (r) => fmt(r[1]) },
					{ l: __('Spent'), cls: 'num', v: (r) => fmt(S.get(r[0]) || 0) },
					{ l: __('Used'), v: (r) => progress(this.pct(S.get(r[0]) || 0, r[1])) },
				], sortedEntries(B, 12), { empty: __('No budgets for this period') }));
			});

			this.ts($g, __('Clicks per day'), 6, f, 'line', async (ds) => [{ name: __('Clicks'), values: this.perDay(await this.metrics(f), 'date', (r) => flt(r.clicks))(ds) }]);
			this.cp($g, __('CTR by channel'), 6, 'bar', async () => {
				const m = await this.metrics(f);
				const c = tally(m, (r) => r.channel || '—', (r) => flt(r.clicks)), i = tally(m, (r) => r.channel || '—', (r) => flt(r.impressions));
				return new Map(Array.from(i.entries()).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.round(this.pct(c.get(k) || 0, v) * 100) / 100]));
			}, { name: __('CTR %'), n: 8 });

			this.cp($g, __('Leads vs platform-reported'), 6, 'bar', async () => {
				const [m, l] = await Promise.all([this.metrics(f), this.lgl(f)]);
				if (!this.hasf('Leads Generation List', 'marketing_channel')) throw this.missing('Leads Generation List.marketing_channel');
				const P = tally(m, (r) => r.channel || '—', (r) => flt(r.platform_leads)), E = tally(l, (r) => r.marketing_channel || '—');
				return new Map(Array.from(new Set(Array.from(P.keys()).concat(Array.from(E.keys())))).map((k) => [k, E.get(k) || 0]));
			}, { name: __('Leads in ERP'), n: 8, sub: __('ERP leads per channel') });
			this.panel($g, __('Messaging performance'), { span: 6, sub: __('email / WhatsApp') }, async ($b) => {
				const per = {};
				(await this.metrics(f)).filter((r) => flt(r.messages_sent) > 0).forEach((r) => {
					const k = r.channel || '—';
					per[k] = per[k] || { c: k, s: 0, d: 0, rp: 0 };
					per[k].s += flt(r.messages_sent); per[k].d += flt(r.messages_delivered); per[k].rp += flt(r.replies);
				});
				$b.html(table([
					{ l: __('Channel'), v: (r) => blank(r.c) },
					{ l: __('Sent'), cls: 'num', v: (r) => fmt(r.s) },
					{ l: __('Delivered'), v: (r) => progress(this.pct(r.d, r.s)) },
					{ l: __('Replies'), cls: 'num', v: (r) => fmt(r.rp) },
					{ l: __('Reply rate'), cls: 'num', v: (r) => fmt(this.pct(r.rp, r.d || r.s), 1) + '%' },
				], Object.values(per).sort((a, b) => b.s - a.s), { empty: __('No messaging activity recorded') }));
			});

			this.panel($g, __('Campaign scoreboard'), { span: 12 }, async ($b) => {
				const [m, l, a] = await Promise.all([this.metrics(f), this.lgl(f), this.alloc(f)]);
				const per = {};
				m.forEach((r) => {
					const k = r.campaign || __('(no campaign)');
					per[k] = per[k] || { c: k, spend: 0, imp: 0, clk: 0 };
					per[k].spend += flt(r.spend); per[k].imp += flt(r.impressions); per[k].clk += flt(r.clicks);
				});
				const leads = tally(l.filter((r) => r.campaign), (r) => r.campaign), wins = tally(a.filter((r) => flt(r.converted) && r.campaign), (r) => r.campaign);
				const hasC = this.hasf('Leads Generation List', 'campaign');
				$b.html(table([
					{ l: __('Campaign'), v: (r) => blank(r.c) },
					{ l: __('Spend'), cls: 'num', v: (r) => fmt(r.spend) },
					{ l: __('Impr.'), cls: 'num', v: (r) => fmt(r.imp) },
					{ l: __('Clicks'), cls: 'num', v: (r) => fmt(r.clk) },
					{ l: __('Leads'), cls: 'num', v: (r) => (hasC ? fmt(leads.get(r.c) || 0) : '—') },
					{ l: __('CPL'), cls: 'num', v: (r) => (hasC && leads.get(r.c) ? fmt(r.spend / leads.get(r.c), 1) : '—') },
					{ l: __('Wins'), cls: 'num', v: (r) => (hasC ? fmt(wins.get(r.c) || 0) : '—') },
				], Object.values(per).sort((x, y) => y.spend - x.spend), { empty: __('No spend recorded in this range') }));
			});
			await Promise.all(jobs);
		}

		// ====================================================== TAB 6: CONTENT & WEB (new doctypes)
		async tab_content($p, f) {
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const sum = (rows, k) => rows.reduce((a, r) => a + flt(r[k]), 0);
			const published = async () => (await this.content(f)).filter((r) => r.status === 'Published');
			const jobs = this.K($k, [
				[__('Posts published'), async () => { const c = await this.content(f); return { num: c.filter((r) => r.status === 'Published').length, sub: `${fmt(c.length)} ${__('total in range')}` }; }],
				[__('Content reach'), async () => ({ num: sum(await published(), 'reach'), sub: __('published posts') })],
				[__('Engagements'), async () => ({ num: (await published()).reduce((a, r) => a + this.engagement(r), 0), sub: __('likes + comments + shares + saves') })],
				[__('Engagement rate'), async () => { const p = await published(), r = sum(p, 'reach'); return r ? { num: this.pct(p.reduce((a, x) => a + this.engagement(x), 0), r), dec: 1, suffix: '%', sub: __('engagements / reach') } : { value: '—', sub: __('no reach data') }; }],
				[__('Video views'), async () => ({ num: sum(await published(), 'video_views'), sub: __('published posts') })],
				[__('Web sessions'), async () => { const w = await this.web(f); return { num: sum(w, 'sessions'), sub: `${fmt(sum(w, 'users'))} ${__('users')}` }; }],
				[__('Engaged sessions'), async () => { const w = await this.web(f), s = sum(w, 'sessions'); return { num: this.pct(sum(w, 'engaged_sessions'), s), suffix: '%', sub: __('of sessions') }; }],
				[__('Web conversions'), async () => { const w = await this.web(f); return { num: sum(w, 'conversions'), sub: `${fmt(this.pct(sum(w, 'conversions'), sum(w, 'sessions')), 1)}% ${__('of sessions')}` }; }],
			]);

			this.cp($g, __('Content by type'), 4, 'percentage', async () => tally(await this.content(f), (r) => r.content_type || '—'));
			this.cp($g, __('Content status'), 4, 'percentage', async () => tally(await this.content(f), (r) => r.status || '—'));
			this.cp($g, __('Content by channel'), 4, 'bar', async () => tally(await this.content(f), (r) => r.channel || '—'), { name: __('Items'), n: 8 });

			this.ord($g, __('Posts per week'), 6, f,
				() => { const out = []; for (let m = moment(f.from).startOf('isoWeek'); m.isSameOrBefore(moment(f.to)) && out.length < 16; m.add(1, 'week')) out.push(m.format('DD MMM')); return out; },
				(rows, labels) => labels.map((l) => rows.filter((r) => r.status === 'Published' && r.publish_date && moment(r.publish_date).startOf('isoWeek').format('DD MMM') === l).length),
				{ rows: () => this.content(f), name: __('Posts') });
			this.cp($g, __('Reach by channel'), 6, 'bar', async () => tally(await published(), (r) => r.channel || '—', (r) => flt(r.reach)), { name: __('Reach'), n: 8 });

			this.cp($g, __('Engagement by content type'), 6, 'bar', async () => tally(await published(), (r) => r.content_type || '—', (r) => this.engagement(r)), { name: __('Engagements'), n: 8 });
			this.panel($g, __('Top posts'), { span: 6, sub: __('by engagement') }, async ($b) => {
				const p = (await published()).map((r) => Object.assign({ eng: this.engagement(r) }, r)).sort((a, b) => b.eng - a.eng).slice(0, 15);
				$b.html(table([
					{ l: __('Post'), v: (r) => (r.post_link ? `<a href="${esc(r.post_link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : link('Marketing Content', r.name)) },
					{ l: __('Channel'), v: (r) => blank(r.channel) },
					{ l: __('Type'), v: (r) => blank(r.content_type) },
					{ l: __('Reach'), cls: 'num', v: (r) => fmt(r.reach) },
					{ l: __('Eng.'), cls: 'num', v: (r) => `<b>${fmt(r.eng)}</b>` },
					{ l: __('Eng. %'), cls: 'num', v: (r) => (flt(r.reach) ? fmt(this.pct(r.eng, flt(r.reach)), 1) + '%' : '—') },
				], p, { empty: __('No published posts in range') }));
			});

			this.panel($g, __('Upcoming & in-progress content'), { span: 12, sub: __('content calendar') }, async ($b) => {
				const sc = await this.schema('Marketing Content');
				if (!sc) throw this.missing('Marketing Content');
				const fields = ['name', 'title', 'channel', 'campaign', 'content_type', 'status', 'publish_date', 'content_owner'].filter((x) => sc.has(x));
				const rows = await this.gl('Marketing Content', fields, [['status', 'in', ['Idea', 'In Progress', 'Ready', 'Scheduled']]], { order_by: 'publish_date asc', limit: 60 });
				$b.html(table([
					{ l: __('Content'), v: (r) => link('Marketing Content', r.name) },
					{ l: __('Title'), v: (r) => blank(r.title) },
					{ l: __('Channel'), v: (r) => blank(r.channel) },
					{ l: __('Type'), v: (r) => blank(r.content_type) },
					{ l: __('Status'), v: (r) => badge(r.status) },
					{ l: __('Publish date'), v: (r) => blank(r.publish_date) },
					{ l: __('Owner'), v: (r) => blank(r.content_owner) },
				], rows, { empty: __('Nothing scheduled or in progress') }));
			});

			this.ts($g, __('Sessions per day by source'), 6, f, 'bar', async (ds) => {
				const w = await this.web(f);
				const g = sortedEntries(tally(w, (r) => r.channel_group || '—', (r) => flt(r.sessions)), 6).map((x) => x[0]);
				return g.map((c) => ({ name: c, values: this.perDay(w.filter((r) => (r.channel_group || '—') === c), 'date', (r) => flt(r.sessions))(ds) }));
			}, { stacked: true });
			this.cp($g, __('Traffic sources'), 3, 'percentage', async () => tally(await this.web(f), (r) => r.channel_group || '—', (r) => flt(r.sessions)));
			this.cp($g, __('Web conversions by source'), 3, 'bar', async () => tally(await this.web(f), (r) => r.channel_group || '—', (r) => flt(r.conversions)), { name: __('Conversions'), n: 6 });

			this.ts($g, __('Bounce rate'), 6, f, 'line', async (ds) => {
				const w = await this.web(f);
				return [{ name: __('Bounce %'), values: ds.map((d) => { const r = w.filter((x) => String(x.date).slice(0, 10) === d && flt(x.sessions) > 0); const s = r.reduce((a, x) => a + flt(x.sessions), 0); return s ? Math.round(r.reduce((a, x) => a + flt(x.bounce_rate) * flt(x.sessions), 0) / s) : 0; }) }];
			});
			this.ts($g, __('Avg session duration (s)'), 6, f, 'line', async (ds) => {
				const w = await this.web(f);
				return [{ name: __('Seconds'), values: ds.map((d) => { const r = w.filter((x) => String(x.date).slice(0, 10) === d && flt(x.sessions) > 0); const s = r.reduce((a, x) => a + flt(x.sessions), 0); return s ? Math.round(r.reduce((a, x) => a + flt(x.average_session_duration) * flt(x.sessions), 0) / s) : 0; }) }];
			});
			this.ts($g, __('Search clicks per day'), 6, f, 'line', async (ds) => [{ name: __('Clicks'), values: this.perDay(await this.web(f), 'date', (r) => flt(r.search_clicks))(ds) }]);
			this.ts($g, __('Avg search position'), 6, f, 'line', async (ds) => {
				const w = await this.web(f);
				return [{ name: __('Position'), values: ds.map((d) => { const r = w.filter((x) => String(x.date).slice(0, 10) === d && flt(x.average_position) > 0); return r.length ? Math.round((r.reduce((a, x) => a + flt(x.average_position), 0) / r.length) * 10) / 10 : 0; }) }];
			}, { sub: __('lower is better') });
			await Promise.all(jobs);
		}

		// ====================================================== TAB 7: SETUP
		async tab_setup($p, f) {
			const $k = this.kpi_row($p);
			const $g = this.grid($p);
			const jobs = this.K($k, [
				[__('Ready'), async () => {
					const st = await this.setupStatus(), ok = st.filter((x) => x.exists && !x.missingFields.length).length;
					return { num: ok, sub: `${__('of')} ${st.length} ${__('items')}`, tone: ok === st.length ? 'green' : 'orange' };
				}],
				[__('Doctypes to create'), async () => { const n = (await this.setupStatus()).filter((x) => !x.exists && x.s.kind === 'new').length; return { num: n, sub: __('new doctypes'), tone: n ? 'orange' : 'green' }; }],
				[__('Fields to add'), async () => { const n = (await this.setupStatus()).filter((x) => x.s.kind !== 'new').reduce((a, x) => a + x.missingFields.length, 0); return { num: n, sub: __('on existing doctypes'), tone: n ? 'orange' : 'green' }; }],
				[__('Data sources live'), async () => {
					const live = await Promise.all(['Leads Generation List', 'Lead Allocation', 'Lead', 'Opportunity', 'Campaign'].map((d) => this.schema(d)));
					return { num: live.filter(Boolean).length, sub: __('of 5 existing doctypes') };
				}],
			]);
			this.panel($g, __('What to create'), { span: 12, sub: __('after creating items, reload the page so ERP picks them up') }, async ($b) => {
				const st = await this.setupStatus();
				$b.html(table([
					{ l: __('Doctype'), v: (r) => `<b>${esc(r.s.dt)}</b>` },
					{ l: __('Action'), v: (r) => blank(r.s.kind === 'new' ? __('Create new doctype') : __('Add custom fields')) },
					{ l: __('Why'), v: (r) => esc(__(r.s.why)) },
					{ l: __('Status'), v: (r) => (r.exists && !r.missingFields.length ? `<span class="dmo-b green">${esc(__('Ready'))}</span>` : r.exists ? `<span class="dmo-b orange">${esc(__('Fields missing'))}</span>` : `<span class="dmo-b red">${esc(__('Not created'))}</span>`) },
					{ l: __('Missing fields'), v: (r) => (r.missingFields.length ? `<span class="m">${esc(r.missingFields.join(', '))}</span>` : '—') },
				], st));
			});
			this.panel($g, __('Already in use'), { span: 6, sub: __('existing doctypes the dashboard reads') }, async ($b) => {
				const dts = ['Leads Generation List', 'Lead Allocation', 'Lead', 'Opportunity', 'Campaign', 'Lead Source'];
				const rows = await Promise.all(dts.map(async (d) => ({ d: d, ok: !!(await this.schema(d)), n: await this.cnt(d, []).catch(() => null) })));
				$b.html(table([
					{ l: __('Doctype'), v: (r) => esc(r.d) },
					{ l: __('Status'), v: (r) => (r.ok ? `<span class="dmo-b green">${esc(__('Found'))}</span>` : `<span class="dmo-b red">${esc(__('Missing'))}</span>`) },
					{ l: __('Records'), cls: 'num', v: (r) => (r.n == null ? '—' : fmt(r.n)) },
				], rows));
			});
			this.panel($g, __('How data gets in'), { span: 6 }, async ($b) => {
				$b.html(`<ul class="dmo-list">
					<li><span><b>${__('Spend & reach')}</b><br><span class="m">${__('Daily or weekly rows in Marketing Daily Metrics. Download the report from Google Ads / Meta / LinkedIn and use Data Import — no typing.')}</span></span></li>
					<li><span><b>${__('Web traffic')}</b><br><span class="m">${__('Export Google Analytics + Search Console by day and source, import into Web Analytics Daily.')}</span></span></li>
					<li><span><b>${__('Content')}</b><br><span class="m">${__('One Marketing Content record per post. Fill reach and engagement a few days after publishing.')}</span></span></li>
					<li><span><b>${__('Lead attribution')}</b><br><span class="m">${__('Make the Marketing Channel (and Campaign) field mandatory on Leads Generation List so every lead is attributed.')}</span></span></li>
					<li><span><b>${__('Revenue')}</b><br><span class="m">${__('When a Lead Allocation is Converted, fill Deal Value — this powers ROAS and revenue per channel.')}</span></span></li>
				</ul>`);
			});
			await Promise.all(jobs);
		}
	}

	new DMMarketingDashboard($(root_element));
})();