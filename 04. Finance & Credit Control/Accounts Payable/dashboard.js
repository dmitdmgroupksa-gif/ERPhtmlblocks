(function(){
'use strict';
var root=(typeof root_element!=='undefined'&&root_element)||document;
var host=root.querySelector('#dm-ap');
if(!host){return;}
if(window.__dmApCleanup){try{window.__dmApCleanup();}catch(e){}}
var gl=[];var alive=true;
window.__dmApCleanup=function(){alive=false;gl.splice(0).forEach(function(f){try{f();}catch(e){}});};
function gon(t,ev,fn){t.addEventListener(ev,fn);gl.push(function(){t.removeEventListener(ev,fn);});}
var C={navy:'#0f2a4a',blue:'#1d5fd1',green:'#13805a',amber:'#d98e04',red:'#c2312d',grey:'#8a94a6',orange:'#e0701a'};
var BC=['#13805a','#e5b92f','#e0901a','#e0701a','#d14b2f','#c2312d'];
var lang='en';try{lang=window.localStorage.getItem('dm_ap_lang')==='ar'?'ar':'en';}catch(e){}
var L={
noaccess:['No access to','لا توجد صلاحية للوصول إلى'],timeout:['Request timed out','انتهت مهلة الطلب'],note_sup:['Supplier list is not accessible for this user; supplier group and Local/Foreign filters are unavailable.','قائمة الموردين غير متاحة لهذا المستخدم؛ مرشحات مجموعة الموردين ومحلي/أجنبي غير متاحة.'],
title:['Accounts Payable Dashboard','لوحة الذمم الدائنة'],
subtitle:['DM Group KSA - live data from ERPNext reports, read-only','مجموعة دي إم السعودية - بيانات حية من تقارير النظام، للقراءة فقط'],
asofL:['AP as of','الذمم كما في'],
t_overview:['Overview','نظرة عامة'],t_supplier:['Supplier Analysis','تحليل الموردين'],t_ageing:['Ageing Analysis','تحليل الأعمار'],t_invoices:['Purchase Invoices','فواتير الشراء'],t_payments:['Payment Management','إدارة المدفوعات'],t_exceptions:['Exceptions & Reconciliation','الاستثناءات والمطابقة'],
f_company:['Company','الشركة'],f_all_co:['All permitted companies','كل الشركات المصرح بها'],f_date:['Date range','الفترة'],p_today:['Today','اليوم'],p_week:['This Week','هذا الأسبوع'],p_month:['This Month','هذا الشهر'],p_quarter:['This Quarter','هذا الربع'],p_year:['This Year','هذه السنة'],p_custom:['Custom','مخصص'],
f_from:['From Date','من تاريخ'],f_to:['To Date (AP report date)','إلى تاريخ (تاريخ تقرير الذمم)'],f_supplier:['Supplier','المورد'],f_supplier_ph:['All suppliers (type to search)','كل الموردين (اكتب للبحث)'],f_group:['Supplier Group','مجموعة الموردين'],f_all_grp:['All groups','كل المجموعات'],f_loc:['Local / Foreign','محلي / أجنبي'],f_all:['All','الكل'],loc_local:['Local','محلي'],loc_foreign:['Foreign','أجنبي'],loc_unc:['Unclassified','غير مصنف'],f_search:['Search','بحث'],f_search_ph:['Supplier, invoice, bill no.','مورد، فاتورة، رقم المورد'],refresh:['Refresh','تحديث'],reset:['Reset Filters','إعادة ضبط'],
k_total:['Total Accounts Payable Outstanding','إجمالي الذمم الدائنة القائمة'],k_over:['Total Overdue Payables','إجمالي الذمم المتأخرة'],k_nd:['Not Yet Due Payables','ذمم لم يحن موعدها'],k_adv:['Supplier Advances / Credit Balances','دفعات مقدمة / أرصدة دائنة للموردين'],k_pi:['Purchase Invoices Posted (Period)','فواتير الشراء المرحلة (الفترة)'],k_pay:['Supplier Payments (Period)','مدفوعات الموردين (الفترة)'],k_active:['Active Suppliers with Balances','موردون نشطون بأرصدة قائمة'],k_due7:['Due Within Next 7 Days','مستحقة خلال 7 أيام'],
s_net:['Net, as of report date','الصافي كما في تاريخ التقرير'],s_over:['Positive balances past due date','أرصدة موجبة تجاوزت الاستحقاق'],s_nd:['Positive balances not past due','أرصدة موجبة لم يحن استحقاقها'],s_adv:['Negative (credit) balances, shown separately','أرصدة سالبة (دائنة) تظهر منفصلة'],s_inter:['of which intercompany','منها بين شركات المجموعة'],s_docs:['documents','مستند'],s_sup:['suppliers','مورد'],
src_ap:['Source: Accounts Payable report (Due Date ageing)','المصدر: تقرير الذمم الدائنة (حسب تاريخ الاستحقاق)'],src_pi:['Source: Purchase Invoice (submitted, excl. returns)','المصدر: فواتير الشراء (معتمدة، بدون المرتجعات)'],src_pe:['Source: Payment Entry (submitted, Pay / Supplier)','المصدر: قيود الدفع (معتمدة، دفع / مورد)'],src_sum:['Source: Accounts Payable Summary report','المصدر: تقرير ملخص الذمم الدائنة'],basis_asof:['Basis: balance as of','الأساس: الرصيد كما في'],basis_per:['Basis: activity during','الأساس: نشاط خلال'],basis_live:['Basis: live ERP status today','الأساس: حالة النظام الحالية'],
ch_co:['Accounts Payable by Company','الذمم الدائنة حسب الشركة'],ch_age:['Payables Ageing Distribution','توزيع أعمار الذمم'],ch_age_d:['Not-yet-due shown separately; credits shown below the axis','غير المستحق يظهر منفصلا؛ والأرصدة الدائنة أسفل المحور'],ch_month:['Monthly Purchase Invoices vs Payments','فواتير الشراء مقابل المدفوعات شهريا'],ch_month_d:['Activity totals per month (not outstanding balances). Window: 12 months to To Date','إجماليات النشاط الشهري (وليست أرصدة قائمة). النافذة: 12 شهرا حتى تاريخ النهاية'],ch_top:['Top 10 Suppliers by Outstanding','أعلى 10 موردين بالرصيد القائم'],
bk0:['Not yet due','لم يحن'],bk1:['1-30 days','1-30 يوم'],bk2:['31-60 days','31-60 يوم'],bk3:['61-90 days','61-90 يوم'],bk4:['91-120 days','91-120 يوم'],bk5:['Above 120 days','أكثر من 120 يوم'],
leg_inv:['Invoices posted','فواتير مرحلة'],leg_pay:['Payments made','مدفوعات'],leg_cr:['Credits','أرصدة دائنة'],
att:['Payment Attention','متطلبات الانتباه للدفع'],att_over:['Largest overdue supplier balances','أكبر الأرصدة المتأخرة'],att_due:['Due in next 7 days','مستحق خلال 7 أيام'],att_long:['Long overdue (over 120 days)','متأخر طويلا (أكثر من 120 يوما)'],att_adv:['Suppliers with advance / credit balances','موردون بأرصدة دائنة'],att_rec:['Reconciliation exceptions','استثناءات المطابقة'],view_all:['View all','عرض الكل'],none:['None','لا يوجد'],
loading:['Loading data...','جار تحميل البيانات...'],empty:['No records match the current filters.','لا توجد سجلات مطابقة للمرشحات.'],error:['Data unavailable','البيانات غير متاحة'],retry:['Retry','إعادة المحاولة'],close:['Close','إغلاق'],open_erp:['Open in ERP','فتح في النظام'],view:['View','عرض'],details:['View Details','عرض التفاصيل'],prev:['Previous','السابق'],next:['Next','التالي'],showing:['Showing','عرض'],of:['of','من'],
c_sup:['Supplier','المورد'],c_grp:['Supplier Group','مجموعة الموردين'],c_co:['Company','الشركة'],c_loc:['Local / Foreign','محلي / أجنبي'],c_total:['Total Outstanding','إجمالي القائم'],c_over:['Overdue Amount','المبلغ المتأخر'],c_nd:['Not Yet Due','غير مستحق'],c_adv:['Advance / Credit','دفعة مقدمة / دائن'],c_oldest:['Oldest Unpaid Invoice','أقدم فاتورة غير مسددة'],c_maxover:['Max Overdue Days','أقصى أيام تأخير'],c_doc:['Document','المستند'],c_bill:['Supplier Bill No.','رقم فاتورة المورد'],c_post:['Posting Date','تاريخ الترحيل'],c_due:['Due Date','تاريخ الاستحقاق'],c_out:['Outstanding','القائم'],c_age:['Days Overdue','أيام التأخير'],c_pct:['% of Total','% من الإجمالي'],c_vt:['Type','النوع'],
c_pi:['Purchase Invoice','فاتورة الشراء'],c_inv:['Invoice Amount','قيمة الفاتورة'],c_status:['Payment Status','حالة السداد'],c_pe:['Payment Entry','قيد الدفع'],c_amt:['Payment Amount','مبلغ الدفع'],c_mode:['Payment Mode','طريقة الدفع'],c_ref:['Reference','المرجع'],c_dstat:['Document Status','حالة المستند'],c_type:['Exception Type','نوع الاستثناء'],c_docref:['Document Reference','مرجع المستند'],c_amount:['Amount','المبلغ'],c_days:['Days Outstanding','أيام القائم'],c_sev:['Severity','الخطورة'],c_det:['Details','التفاصيل'],c_paid:['Paid','المسدد'],c_invoiced:['Invoiced','المفوتر'],
due_in:['due in','يستحق بعد'],days:['days','يوم'],
sev_crit:['Critical','حرج'],sev_warn:['Warning','تحذير'],sev_info:['Informational','معلومة'],
st_Paid:['Paid','مسددة'],st_Unpaid:['Unpaid','غير مسددة'],'st_Partly Paid':['Partly Paid','مسددة جزئيا'],st_Overdue:['Overdue','متأخرة'],st_Return:['Return','مرتجع'],'st_Debit Note Issued':['Debit Note Issued','إشعار مدين صادر'],st_Draft:['Draft','مسودة'],st_Submitted:['Submitted','معتمد'],st_Cancelled:['Cancelled','ملغى'],

sup_title:['Supplier-wise financial position','المركز المالي لكل مورد'],sup_panel:['Supplier Details','تفاصيل المورد'],open_docs:['Open documents (invoices, payments, credits)','المستندات المفتوحة (فواتير، دفعات، أرصدة دائنة)'],pay_hist:['Payment history (latest 10)','سجل الدفعات (آخر 10)'],ageing_br:['Ageing breakdown','توزيع الأعمار'],info:['Supplier information','بيانات المورد'],intercompany:['Intercompany supplier','مورد بين شركات المجموعة'],yes:['Yes','نعم'],no:['No','لا'],country:['Country','الدولة'],cur:['Currency','العملة'],open_sup:['Open Supplier in ERP','فتح المورد في النظام'],
ag_co:['Ageing by Company','الأعمار حسب الشركة'],ag_sup:['Supplier-wise Overdue (top 15)','المتأخرات حسب المورد (أعلى 15)'],ag_grp:['Overdue % by Supplier Group','نسبة التأخر حسب مجموعة الموردين'],ag_tbl:['Ageing by Supplier (expand for documents)','الأعمار حسب المورد (وسّع لعرض المستندات)'],ag_rec:['Ageing reconciliation','مطابقة الأعمار'],ag_rec_ok:['Aged total equals reported outstanding.','إجمالي الأعمار يساوي الرصيد القائم المعلن.'],ag_rec_bad:['Reconciliation warning: ageing total differs from reported outstanding by','تحذير مطابقة: إجمالي الأعمار يختلف عن الرصيد القائم بمقدار'],ag_native:['Ageing buckets above 30 days match native Accounts Payable report buckets.','شرائح ما بعد 30 يوما تطابق شرائح التقرير الأصلي.'],ag_native_bad:['Differs from native report buckets (31+ days) by','يختلف عن شرائح التقرير الأصلي (31+ يوم) بمقدار'],gross:['Gross payables','إجمالي الذمم الموجبة'],credits:['Credits','أرصدة دائنة'],net:['Net','الصافي'],pct_over:['Overdue %','% التأخر'],
pi_k_sub:['Submitted (posted in period)','معتمدة (مرحلة في الفترة)'],pi_k_unpaid:['Unpaid Invoices','فواتير غير مسددة'],pi_k_part:['Partially Paid','مسددة جزئيا'],pi_k_over:['Overdue Invoices','فواتير متأخرة'],pi_k_soon:['Invoices Due Soon (7 days)','فواتير تستحق قريبا (7 أيام)'],
pi_note:['Outstanding amounts and statuses on this tab are current ERP values (today), not as-of To Date. Cancelled and draft invoices are excluded.','المبالغ القائمة والحالات في هذه الصفحة هي القيم الحالية في النظام (اليوم) وليست كما في تاريخ النهاية. الفواتير الملغاة والمسودات مستبعدة.'],f_status:['Payment status','حالة السداد'],f_due_from:['Due from','الاستحقاق من'],f_due_to:['Due to','الاستحقاق إلى'],f_sort:['Sort by','ترتيب حسب'],so_out:['Highest outstanding','الأعلى رصيدا'],so_old:['Oldest overdue','الأقدم تأخرا'],so_new:['Newest posting','الأحدث ترحيلا'],st_open:['Open (outstanding)','مفتوحة (قائمة)'],f_period:['Within selected period','ضمن الفترة المحددة'],f_allt:['All dates','كل التواريخ'],
pm_k_period:['Supplier Payments Made (Period)','مدفوعات الموردين (الفترة)'],pm_k_month:['Payments in Month of To Date','مدفوعات شهر تاريخ النهاية'],pm_k_adv:['Supplier Advances Paid (unallocated)','دفعات مقدمة للموردين (غير مخصصة)'],pm_k_wf:['Payment Entries Awaiting Approval','قيود دفع بانتظار الاعتماد'],pm_k_up:['Upcoming Payments (next 30 days by due date)','مدفوعات قادمة (30 يوما حسب الاستحقاق)'],
pm_c_month:['Monthly Supplier Payments','المدفوعات الشهرية للموردين'],pm_c_co:['Payments by Company','المدفوعات حسب الشركة'],pm_c_sup:['Payments by Supplier (top 10)','المدفوعات حسب المورد (أعلى 10)'],pm_c_iv:['Invoice Amount vs Amount Paid (by company, period)','قيمة الفواتير مقابل المدفوع (حسب الشركة، الفترة)'],pm_tbl:['Payment History','سجل المدفوعات'],pm_note:['Read-only view. Approval statuses come from the ERP Payment Entry workflow.','عرض للقراءة فقط. حالات الاعتماد من مسار عمل قيد الدفع في النظام.'],pm_wf_none:['No draft payment entries are awaiting approval.','لا توجد قيود دفع مسودة بانتظار الاعتماد.'],f_pstatus:['Document status','حالة المستند'],ds_sub:['Submitted','معتمد'],ds_draft:['Draft / in workflow','مسودة / قيد المسار'],ds_all:['All','الكل'],
ex_sum:['Exceptions by severity','الاستثناءات حسب الخطورة'],ex_rules:['Rule parameters (applied to all exception checks)','معايير القواعد (تنطبق على كل الفحوصات)'],ex_tbl:['Exception register','سجل الاستثناءات'],ex_all:['All types','كل الأنواع'],ex_allsev:['All severities','كل مستويات الخطورة'],
r_warn:['Overdue warning (days)','تحذير التأخر (أيام)'],r_crit:['Overdue critical (days)','حرج التأخر (أيام)'],r_old:['Unusually old item (days)','عنصر قديم جدا (أيام)'],r_large:['Large supplier (% of company outstanding)','مورد كبير (% من رصيد الشركة)'],r_unalloc:['Unallocated payment aged (days)','دفعة غير مخصصة متقادمة (أيام)'],r_term:['Questionable credit term (days)','مدة ائتمان مشكوك بها (أيام)'],r_tol:['Reconciliation tolerance (SAR)','هامش المطابقة'],
x_over90:['Overdue over 90 days','متأخر أكثر من 90 يوما'],x_large:['Large outstanding supplier','مورد برصيد كبير'],x_adv:['Supplier advance / credit','دفعة مقدمة / رصيد دائن'],x_neg:['Negative net balance','رصيد صافي سالب'],x_unalloc:['Unallocated payment','دفعة غير مخصصة'],x_recon:['Reconciliation difference','فرق مطابقة'],x_due:['Missing / questionable due date','تاريخ استحقاق مفقود / مشكوك'],x_inter:['Intercompany supplier balance','رصيد مورد بين شركات المجموعة'],x_old:['Unusually old unresolved item','عنصر قديم غير مسوى'],
rule_over90:['Supplier overdue over warning days: Warning; over critical days: Critical.','تأخر المورد أكثر من حد التحذير: تحذير؛ أكثر من الحد الحرج: حرج.'],rule_large:['Supplier net outstanding at or above the share of its company total: Warning.','رصيد المورد الصافي يساوي أو يفوق النسبة من إجمالي شركته: تحذير.'],rule_adv:['Credit / advance documents on a supplier account: Informational.','مستندات دائنة / دفعات مقدمة على حساب المورد: معلومة.'],rule_neg:['Supplier whose net balance is negative: Warning.','مورد رصيده الصافي سالب: تحذير.'],rule_unalloc:['Submitted payment with unallocated amount: Warning if older than parameter, else Informational.','دفعة معتمدة بمبلغ غير مخصص: تحذير إن تجاوزت المدة وإلا معلومة.'],rule_recon:['Report totals differ beyond tolerance: Critical (Summary vs detail) / Warning (ageing buckets).','اختلاف إجماليات التقارير: حرج (الملخص مقابل التفصيل) / تحذير (شرائح الأعمار).'],rule_due:['Invoice with missing due date, due before posting, or term beyond parameter: Warning.','فاتورة بلا تاريخ استحقاق أو قبل الترحيل أو مدة تتجاوز الحد: تحذير.'],rule_inter:['Balances with suppliers flagged as internal (intercompany): Informational.','أرصدة موردين مصنفين كشركات داخلية: معلومة.'],rule_old:['Open item older than the parameter: Critical.','بند مفتوح أقدم من الحد: حرج.'],
d_over:['Overdue balance','رصيد متأخر'],d_large:['of company outstanding','من رصيد الشركة'],d_adv:['credit documents','مستندات دائنة'],d_neg:['Net balance is negative','الرصيد الصافي سالب'],d_unalloc:['Unallocated amount on payment','مبلغ غير مخصص في الدفعة'],d_sumdet:['Summary report total vs detail report total','إجمالي الملخص مقابل إجمالي التفصيل'],d_bkt:['Ageing 31+ days: ours vs native buckets','أعمار 31+ يوم: حسابنا مقابل التقرير الأصلي'],d_supdiff:['Supplier balance: summary vs detail','رصيد المورد: الملخص مقابل التفصيل'],d_due_missing:['Due date missing','تاريخ الاستحقاق مفقود'],d_due_before:['Due date is before posting date','الاستحقاق قبل تاريخ الترحيل'],d_due_long:['Credit term days','مدة الائتمان بالأيام'],d_inter:['Intercompany balance','رصيد بين الشركات'],d_old:['Open item age (days)','عمر البند المفتوح (أيام)'],
note_cap:['AP report date is capped at today; future dates have no ledger balances.','تاريخ تقرير الذمم مقيد باليوم الحالي؛ لا توجد أرصدة لتواريخ مستقبلية.'],note_loc:['Local/Foreign classification field is unavailable for this user.','حقل تصنيف محلي/أجنبي غير متاح لهذا المستخدم.'],note_cur:['Companies use different currencies; totals are shown in each company currency without conversion.','الشركات تستخدم عملات مختلفة؛ تُعرض الإجماليات بعملة كل شركة دون تحويل.'],note_loadco:['Loaded companies','الشركات المحملة'],note_fail:['Data unavailable for','البيانات غير متاحة لـ'],note_badrange:['From Date cannot be after To Date.','تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.'],
foot_src:['Data sources: Accounts Payable report, Accounts Payable Summary report, Purchase Invoice, Payment Entry, Supplier (standard ERPNext, read with your permissions). Figures are not hardcoded.','مصادر البيانات: تقرير الذمم الدائنة وملخصه، فواتير الشراء، قيود الدفع، الموردون (قياسية في النظام وبصلاحياتك). الأرقام غير مثبتة.'],updated:['Last refreshed','آخر تحديث'],
sr_title:['Reconciliation status','حالة المطابقة'],sum_wait:['Loading Summary report for reconciliation...','جار تحميل تقرير الملخص للمطابقة...']
};
function t(k){var v=L[k];return v?v[lang==='ar'?1:0]:k;}
function fmt(n){if(n==null||isNaN(n))return '—';return Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function pad(n){return (n<10?'0':'')+n;}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function parse(s){var p=String(s).slice(0,10).split('-');return new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));}
function fromUtc(d){return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());}
function diff(a,b){return Math.round((parse(b)-parse(a))/86400000);}
function addD(s,n){var d=parse(s);d.setUTCDate(d.getUTCDate()+n);return fromUtc(d);}
var TODAY=(window.frappe&&frappe.datetime&&frappe.datetime.get_today)?frappe.datetime.get_today():ymd(new Date());
function presetRange(p){var d=parse(TODAY),y=d.getUTCFullYear(),m=d.getUTCMonth();
if(p==='today')return [TODAY,TODAY];
if(p==='week')return [addD(TODAY,-d.getUTCDay()),TODAY];
if(p==='month')return [y+'-'+pad(m+1)+'-01',TODAY];
if(p==='quarter')return [y+'-'+pad(Math.floor(m/3)*3+1)+'-01',TODAY];
if(p==='year')return [y+'-01-01',TODAY];return null;}
function defFilters(){var r=presetRange('month');return {company:'',preset:'month',from:r[0],to:r[1],supplier:'',group:'',loc:'',search:''};}
var S={tab:'overview',f:defFilters(),rules:{warn:90,crit:120,old:365,large:10,unalloc:30,term:365,tol:0.01},tok:0,loading:false,errs:[],ver:0,shown:{},exp:{},ts:{},pi:{page:0,status:'',dfrom:'',dto:'',sort:'post',data:null,total:0,kpi:null,loading:false,err:null,key:''},pe:{page:0,status:'sub',data:null,total:0,loading:false,err:null,key:'',wf:null},exFilter:{type:'',sev:''},prog:0,progN:0,updated:null};
var D={cache:{},ap:{},sum:{},per:{},companies:null,sup:null,supM:{},groups:null,locMissing:false,data:null};
var REQ_TIMEOUT=90000;
function permMsg(method,args){var w=(args&&(args.report_name||args.doctype))||method;return t('noaccess')+' '+w;}
function call(method,args){var key=method+'|'+JSON.stringify(args);if(D.cache[key])return D.cache[key];
var p=new Promise(function(res,rej){var done=false,ctl=(typeof AbortController!=='undefined')?new AbortController():null;
var timer=setTimeout(function(){if(done)return;done=true;if(ctl){try{ctl.abort();}catch(x){}}rej(new Error(t('timeout')));},REQ_TIMEOUT);
var body=new URLSearchParams();Object.keys(args||{}).forEach(function(k){var v=args[k];body.append(k,(v!==null&&typeof v==='object')?JSON.stringify(v):String(v));});
fetch('/api/method/'+method,{method:'POST',credentials:'same-origin',headers:{'X-Frappe-CSRF-Token':(window.frappe&&frappe.csrf_token)||'','Accept':'application/json','Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:body.toString(),signal:ctl?ctl.signal:undefined})
.then(function(r){return r.text().then(function(txt){return {r:r,txt:txt};});})
.then(function(o){if(done)return;done=true;clearTimeout(timer);var j=null;try{j=JSON.parse(o.txt);}catch(x){}
if(o.r.ok&&j&&!j.exc){res(j.message);return;}
var ex=String((j&&(j.exception||j.exc_type))||'');
if(o.r.status===401||o.r.status===403||/permission/i.test(ex)){var e=new Error(permMsg(method,args));e.perm=true;rej(e);return;}
var m=ex.split(':').slice(-1)[0].trim();rej(new Error(m||('HTTP '+o.r.status)));})
.catch(function(err){if(done)return;done=true;clearTimeout(timer);rej(new Error((err&&err.message)||'Network error'));});});
D.cache[key]=p;p.catch(function(){delete D.cache[key];});return p;}
function getList(dt,fields,filters,o){o=o||{};var a={doctype:dt,fields:JSON.stringify(fields),filters:JSON.stringify(filters||[]),limit_start:o.start||0,limit_page_length:o.limit==null?20:o.limit};
if(o.order)a.order_by=o.order;if(o.or_filters)a.or_filters=JSON.stringify(o.or_filters);if(o.group)a.group_by=o.group;return call('frappe.client.get_list',a);}
var q=[],act=0;
function limited(fn){return new Promise(function(res,rej){q.push({fn:fn,res:res,rej:rej});pump();});}
function pump(){while(act<2&&q.length){var j=q.shift();act++;(function(j){j.fn().then(j.res,j.rej).then(function(){act--;pump();},function(){act--;pump();});})(j);}}

function loadCompanies(){return D.companies?Promise.resolve(D.companies):getList('Company',['name','default_currency'],[],{limit:0,order:'name asc'}).catch(function(){var dc='',cur='SAR';try{var sd=(window.frappe&&frappe.boot&&frappe.boot.sysdefaults)||{};dc=(frappe.defaults&&frappe.defaults.get_user_default('Company'))||sd.company||'';cur=sd.currency||'SAR';}catch(x){}if(!dc)throw new Error(t('noaccess')+' Company');return [{name:dc,default_currency:cur}];}).then(function(r){D.companies=r;return r;});}
function loadGroups(){return D.groups?Promise.resolve(D.groups):getList('Supplier Group',['name'],[],{limit:0,order:'name asc'}).then(function(r){D.groups=r.map(function(x){return x.name;});return D.groups;}).catch(function(){D.groups=[];return D.groups;});}
function loadSuppliers(){if(D.sup)return D.sup;var base=['name','supplier_name','supplier_group','is_internal_supplier','country','disabled','default_currency'];
D.sup=getList('Supplier',base.concat(['custom_type_of_supplier_']),[],{limit:0}).catch(function(){D.locMissing=true;return getList('Supplier',base,[],{limit:0});}).catch(function(){D.supFail=true;D.locMissing=true;return [];}).then(function(list){var m={};list.forEach(function(s){m[s.name]=s;});D.supM=m;return m;});return D.sup;}
function loadAP(co,asof){var key=co+'|'+asof;if(D.ap[key])return D.ap[key];
D.ap[key]=limited(function(){return call('frappe.desk.query_report.run',{report_name:'Accounts Payable',ignore_prepared_report:true,filters:{company:co,report_date:asof,ageing_based_on:'Due Date',range1:30,range2:60,range3:90,range4:120,group_by_party:0}});}).then(function(m){
if(!m||!m.result){throw new Error('Report returned no data (prepared report)');}
var rows=m.result.filter(function(r){return r&&r.party;}).map(function(r){var ref=r.due_date||r.posting_date;return {co:co,sup:r.party,name:r.supplier_name||r.party,grp:r.supplier_group||'',vt:r.voucher_type,vn:r.voucher_no,post:r.posting_date,due:r.due_date||null,bill:r.bill_no||'',inv:+r.invoiced||0,paid:+r.paid||0,cn:+r.credit_note||0,out:+r.outstanding||0,age:ref?diff(ref,asof):0,nat:[+r.range1||0,+r.range2||0,+r.range3||0,+r.range4||0,+r.range5||0]};});
return {co:co,asof:asof,rows:rows};},function(e){delete D.ap[key];throw e;});return D.ap[key];}
function loadSummary(co,asof){var key=co+'|'+asof;if(D.sum[key])return D.sum[key];
D.sum[key]=limited(function(){return call('frappe.desk.query_report.run',{report_name:'Accounts Payable Summary',ignore_prepared_report:true,filters:{company:co,report_date:asof,ageing_based_on:'Due Date',range1:30,range2:60,range3:90,range4:120}});}).then(function(m){
if(!m||!m.result){throw new Error('Summary returned no data');}var map={},tot=0;m.result.forEach(function(r){if(!r.party)return;map[r.party]={out:+r.outstanding||0,adv:+r.advance||0};tot+=+r.outstanding||0;});return {co:co,map:map,total:tot};},function(e){delete D.sum[key];throw e;});return D.sum[key];}
function winStart(from,to){var d=parse(to);var m0=fromUtc(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-11,1)));return from<m0?from:m0;}
function loadPeriod(start,end){var key=start+'|'+end;if(D.per[key])return D.per[key];
D.per[key]=Promise.all([
getList('Purchase Invoice',['name','supplier','supplier_name','company','posting_date','base_grand_total','is_return'],[['docstatus','=',1],['posting_date','>=',start],['posting_date','<=',end]],{limit:0}),
getList('Payment Entry',['name','party','party_name','company','posting_date','base_paid_amount','unallocated_amount','mode_of_payment','reference_no','workflow_state'],[['docstatus','=',1],['payment_type','=','Pay'],['party_type','=','Supplier'],['posting_date','>=',start],['posting_date','<=',end]],{limit:0})
]).then(function(a){return {pi:a[0],pe:a[1]};},function(e){delete D.per[key];throw e;});return D.per[key];}
function asOf(){return S.f.to>TODAY?TODAY:S.f.to;}
function bk(age){return age<=0?0:age<=30?1:age<=60?2:age<=90?3:age<=120?4:5;}
function supMeta(id){return D.supM[id]||null;}
function locOf(id){if(D.locMissing)return 'na';var m=supMeta(id);var v=m&&m.custom_type_of_supplier_;return v==='Local'?'local':v==='Foreign'?'foreign':'unc';}
function isInter(id){var m=supMeta(id);return !!(m&&m.is_internal_supplier);}
function supMatch(id,nm,f){if(f.supplier&&id!==f.supplier&&nm!==f.supplier)return false;
if(f.group){var m=supMeta(id);if(!m||m.supplier_group!==f.group)return false;}
if(f.loc&&locOf(id)!==f.loc)return false;return true;}
function textMatch(s,f){if(!f.search)return true;var q=f.search.toLowerCase();return s.some(function(x){return x&&String(x).toLowerCase().indexOf(q)>=0;});}
function apRows(skipCo){var out=[];if(!D.data)return out;D.data.list.forEach(function(r){if(!skipCo&&S.f.company&&r.co!==S.f.company)return;if(!supMatch(r.sup,r.name,S.f))return;if(!textMatch([r.name,r.sup,r.vn,r.bill],S.f))return;out.push(r);});return out;}
function agg(rows){var a={net:0,over:0,nd:0,cr:0,gross:0,b:[0,0,0,0,0,0],bp:[0,0,0,0,0,0],bn:[0,0,0,0,0,0]};rows.forEach(function(r){a.net+=r.out;var i=bk(r.age);a.b[i]+=r.out;if(r.out>0){a.gross+=r.out;a.bp[i]+=r.out;if(r.age>0)a.over+=r.out;else a.nd+=r.out;}else if(r.out<0){a.cr+=r.out;a.bn[i]+=r.out;}});return a;}
function bySup(rows){var m={};rows.forEach(function(r){var k=r.co+'|'+r.sup;var s=m[k]||(m[k]={key:k,co:r.co,sup:r.sup,name:r.name,grp:r.grp,rows:[],net:0,over:0,nd:0,cr:0,oldest:null,maxOver:0,b:[0,0,0,0,0,0],bp:[0,0,0,0,0,0]});s.rows.push(r);s.net+=r.out;s.b[bk(r.age)]+=r.out;if(r.out>0){s.bp[bk(r.age)]+=r.out;if(r.age>0){s.over+=r.out;if(r.age>s.maxOver)s.maxOver=r.age;}else s.nd+=r.out;if(!s.oldest||r.post<s.oldest)s.oldest=r.post;}else if(r.out<0)s.cr+=r.out;});return Object.keys(m).map(function(k){return m[k];});}
function perRows(kind){var out=[];if(!D.data||!D.data.per)return out;var f=S.f;(D.data.per[kind]||[]).forEach(function(r){var sid=kind==='pi'?r.supplier:r.party,nm=kind==='pi'?r.supplier_name:r.party_name;if(f.company&&r.company!==f.company)return;if(!supMatch(sid,nm,f))return;if(!textMatch([sid,nm,r.name,r.reference_no],f))return;out.push(r);});return out;}
function inRange(d){return d>=S.f.from&&d<=S.f.to;}
function invoiceBalance(r){
 var target=curOf(r.company), party=r.party_account_currency;
 if(!party)throw new Error('Missing party account currency');
 if(party===target)return Number(r.outstanding_amount)||0;
 if(party!==r.currency || !(Number(r.conversion_rate)>0))throw new Error('Unsupported party currency conversion: '+party);
 return (Number(r.outstanding_amount)||0)*Number(r.conversion_rate);
}
function curOf(co){var c=(D.companies||[]).filter(function(x){return x.name===co;})[0];return c?c.default_currency:'SAR';}
function scopeCur(){var cs={};(D.companies||[]).forEach(function(c){if(!S.f.company||c.name===S.f.company)cs[c.default_currency]=1;});var k=Object.keys(cs);return k.length===1?k[0]:'SAR';}
function mixedCur(){var cs={};(D.companies||[]).forEach(function(c){cs[c.default_currency]=1;});return Object.keys(cs).length>1;}
function slug(dt){return dt.toLowerCase().replace(/ /g,'-');}
function url(dt,name){return '/app/'+slug(dt)+'/'+encodeURIComponent(name);}
function apUrl(){var q='report_date='+encodeURIComponent(asOf());if(S.f.company)q='company='+encodeURIComponent(S.f.company)+'&'+q;return '/app/query-report/Accounts%20Payable?'+q;}
function el(tag,p,kids){var n=document.createElement(tag);if(p){for(var k in p){var v=p[k];if(v==null||v===false)continue;if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k.slice(0,2)==='on')n.addEventListener(k.slice(2),v);else if(k==='value')n.value=v;else n.setAttribute(k,v===true?'':v);}}
(kids===undefined?[]:Array.isArray(kids)?kids:[kids]).forEach(function(c){if(c==null||c===false)return;n.appendChild(typeof c==='object'?c:document.createTextNode(String(c)));});return n;}
var NS='http://www.w3.org/2000/svg';
function sv(tag,p,kids){var n=document.createElementNS(NS,tag);if(p)for(var k in p){if(p[k]!=null)n.setAttribute(k,p[k]);}(kids||[]).forEach(function(c){n.appendChild(typeof c==='object'?c:document.createTextNode(String(c)));});return n;}
function a(dt,name,text){return el('a',{href:url(dt,name),target:'_blank',rel:'noopener',text:text||name});}
function lnk(href,text,cls){return el('a',{href:href,target:'_blank',rel:'noopener',class:cls||'',text:text});}
function badge(txt,tone){return el('span',{class:'badge b-'+tone,text:txt});}
function amt(n,cur){return el('span',{class:n<0?'neg':'pos',text:fmt(n)+(cur?' '+cur:'')});}
function srcline(x){return el('div',{class:'src',text:x});}
function sevBadge(s){return badge(t('sev_'+(s==='crit'?'crit':s==='warn'?'warn':'info')),s==='crit'?'red':s==='warn'?'amber':'blue');}
function loadBox(){return el('div',{class:'load',role:'status'},[el('span',{class:'spin'}),t('loading')]);}
function emptyBox(m){return el('div',{class:'empty',text:m||t('empty')});}
function errBox(m,retry){return el('div',{class:'errb',role:'alert'},[el('div',{text:t('error')+(m?': '+m:'')}),retry?el('button',{class:'btn sm',style:'margin-top:8px',onclick:retry,text:t('retry')}):null]);}
function kpi(o){var b=el('button',{class:'kpi '+(o.tone||''),type:'button',onclick:o.onClick,'aria-label':o.label},[el('div',{class:'l',text:o.label}),el('div',{class:'v'},[o.value,o.cur?el('small',{text:' '+o.cur}):null]),o.sub?el('div',{class:'s',text:o.sub}):null,o.src?el('div',{class:'src',text:o.src}):null]);return b;}
function kpiGrid(list){var n=list.length;var cols=n<=6?n:Math.ceil(n/2);if(cols<1)cols=1;return el('div',{class:'kpis',style:'--n:'+cols},list);}
function card(title,desc,body,src){return el('section',{class:'card'},[el('h2',{text:title}),desc?el('div',{class:'desc',text:desc}):null].concat(body).concat([src?srcline(src):null]));}
function age2txt(r){return r.age>0?String(r.age):(r.out>0?t('due_in')+' '+(-r.age)+' '+t('days'):'—');}

var ap=null;var ovStack=[];
function cmp(A,B){if(A==null&&B==null)return 0;if(A==null)return 1;if(B==null)return -1;if(typeof A==='number'&&typeof B==='number')return A-B;return String(A).localeCompare(String(B),lang==='ar'?'ar':'en',{numeric:true});}
function table(o){var wrap=el('div',{class:'tw'});var st=o.st||(o.st={page:0,key:null,dir:1});var size=o.size||15;
function draw(){var rows=o.rows||[];var total=o.server?o.server.total:rows.length;
if(!total){wrap.replaceChildren(emptyBox());return;}
var view=rows;
if(!o.server){if(st.key){var c=o.cols.filter(function(x){return x.k===st.key;})[0];if(c){var gv=c.v||function(r){return r[c.k];};view=rows.slice().sort(function(x,y){return st.dir*cmp(gv(x),gv(y));});}}
var pages=Math.max(1,Math.ceil(total/size));if(st.page>=pages)st.page=pages-1;view=view.slice(st.page*size,st.page*size+size);}
var cur=o.server?o.server.page:st.page;var psz=o.server?o.server.size:size;
var trh=el('tr');o.cols.forEach(function(c){var th=el('th',{class:(c.num?'num ':'')+(o.server||c.nosort?'':'sortable'),scope:'col','aria-sort':st.key===c.k?(st.dir>0?'ascending':'descending'):null,text:c.l+(st.key===c.k&&!o.server?(st.dir>0?' ▲':' ▼'):'')});
if(!o.server&&!c.nosort){th.addEventListener('click',function(){if(st.key===c.k)st.dir=-st.dir;else{st.key=c.k;st.dir=c.num?-1:1;}st.page=0;draw();});}trh.appendChild(th);});
var tb=el('tbody');view.forEach(function(r){var tr=el('tr');o.cols.forEach(function(c){var v=c.r?c.r(r):r[c.k];var td=el('td',{class:c.num?'num':''});if(v==null||v==='')td.textContent='—';else if(typeof v==='object')td.appendChild(v);else td.textContent=String(v);tr.appendChild(td);});tb.appendChild(tr);
if(o.extra&&o.exp&&o.exp[r.key]){var ex=el('tr',{class:'sub'});ex.appendChild(el('td',{colspan:o.cols.length},[o.extra(r)]));tb.appendChild(ex);}});
var tbl=el('table',null,[el('thead',null,[trh]),tb]);
var from=cur*psz+1,to=Math.min(total,cur*psz+view.length);var last=cur*psz+psz>=total;
function go(p){if(o.server){o.server.go(p);}else{st.page=p;draw();}}
var pg=el('div',{class:'pg'},[el('span',{text:t('showing')+' '+from+'-'+to+' '+t('of')+' '+total}),el('span',null,[el('button',{class:'btn sm',type:'button',disabled:cur<=0,onclick:function(){go(cur-1);},text:t('prev')}),' ',el('button',{class:'btn sm',type:'button',disabled:last,onclick:function(){go(cur+1);},text:t('next')})])]);
wrap.replaceChildren(el('div',{class:'tscroll'},[tbl]),pg);}
o.redraw=draw;draw();return wrap;}
function openOverlay(title,sub,center){var ov=el('div',{class:'ov'+(center?' center':'')});var pnl=el('div',{class:'pnl',role:'dialog','aria-modal':'true','aria-label':title});var body=el('div');
function close(){if(ov.parentNode)ov.parentNode.removeChild(ov);ovStack=ovStack.filter(function(x){return x!==close;});}
pnl.appendChild(el('div',{class:'top'},[el('div',null,[el('h2',{text:title}),sub?el('div',{class:'desc',text:sub}):null]),el('button',{class:'btn sm',type:'button',onclick:close,text:t('close')})]));pnl.appendChild(body);ov.appendChild(pnl);
ov.addEventListener('mousedown',function(e){if(e.target===ov)close();});ap.appendChild(ov);ovStack.push(close);return {body:body,close:close};}
function supLink(r){return el('button',{class:'lk',type:'button',onclick:function(){supplierPanel(r.sup,r.name);},text:r.name});}
function docCols(){return [{k:'name',l:t('c_sup'),r:supLink},{k:'co',l:t('c_co')},{k:'vn',l:t('c_doc'),r:function(r){return a(r.vt,r.vn);}},{k:'bill',l:t('c_bill')},{k:'post',l:t('c_post')},{k:'due',l:t('c_due')},{k:'out',l:t('c_out'),num:1,r:function(r){return amt(r.out);}},{k:'age',l:t('c_age'),num:1,r:age2txt}];}
function drill(o){var h=openOverlay(o.title,o.sub,true);var tb=el('div',{class:'toolbar'},[o.erp?lnk(o.erp.href,o.erp.label||t('open_erp'),'btn pri sm'):null]);h.body.appendChild(tb);
var holder=el('div');h.body.appendChild(holder);
function show(rows){holder.replaceChildren(o.rows===undefined&&!rows?emptyBox():table({cols:o.cols,rows:rows,size:12,st:{page:0,key:null,dir:1}}));}
if(o.load){holder.appendChild(loadBox());o.load().then(show,function(e){holder.replaceChildren(errBox(e.message));});}else show(o.rows);return h;}
function supplierPanel(id,name){var rows=D.data.list.filter(function(r){return r.sup===id&&(!S.f.company||r.co===S.f.company);});var g=agg(rows);var m=supMeta(id)||{};
var h=openOverlay(name,id,false);var b=h.body;
var cos=[];rows.forEach(function(r){if(cos.indexOf(r.co)<0)cos.push(r.co);});
b.appendChild(el('div',{class:'info'},[el('div',null,[el('b',{text:t('c_grp')}),m.supplier_group||'—']),el('div',null,[el('b',{text:t('c_loc')}),D.locMissing?t('error'):t('loc_'+(locOf(id)==='local'?'local':locOf(id)==='foreign'?'foreign':'unc'))]),el('div',null,[el('b',{text:t('country')}),m.country||'—']),el('div',null,[el('b',{text:t('cur')}),m.default_currency||'—']),el('div',null,[el('b',{text:t('intercompany')}),isInter(id)?t('yes'):t('no')]),el('div',null,[el('b',{text:t('c_co')}),cos.join(', ')||'—'])]));
b.appendChild(kpiGrid([
el('div',{class:'card'},[el('div',{class:'l',text:t('c_total')}),el('h2',{text:fmt(g.net)})]),
el('div',{class:'card'},[el('div',{class:'l',text:t('c_over')}),el('h2',{text:fmt(g.over)})]),
el('div',{class:'card'},[el('div',{class:'l',text:t('c_nd')}),el('h2',{text:fmt(g.nd)})]),
el('div',{class:'card'},[el('div',{class:'l',text:t('c_adv')}),el('h2',{text:fmt(g.cr)})])]));
b.appendChild(card(t('ageing_br'),null,[hbars([0,1,2,3,4,5].map(function(i){return {label:t('bk'+i),value:g.b[i],color:BC[i]};}))],t('src_ap')+' | '+t('basis_asof')+' '+asOf()));
b.appendChild(el('div',{style:'height:12px'}));
b.appendChild(card(t('open_docs'),null,[rows.length?table({cols:docCols().filter(function(c){return c.k!=='name';}),rows:rows,size:10,st:{page:0,key:'age',dir:-1}}):emptyBox()],t('src_ap')));
var ph=el('div',null,[loadBox()]);b.appendChild(el('div',{style:'height:12px'}));b.appendChild(card(t('pay_hist'),null,[ph],t('src_pe')));
var pf=[['party','=',id],['docstatus','=',1],['payment_type','=','Pay']];if(S.f.company)pf.push(['company','=',S.f.company]);
getList('Payment Entry',['name','company','posting_date','base_paid_amount','mode_of_payment','reference_no'],pf,{limit:10,order:'posting_date desc'}).then(function(l){ph.replaceChildren(table({cols:[{k:'name',l:t('c_pe'),r:function(r){return a('Payment Entry',r.name);}},{k:'company',l:t('c_co')},{k:'posting_date',l:t('c_post')},{k:'base_paid_amount',l:t('c_amt'),num:1,r:function(r){return fmt(r.base_paid_amount);}},{k:'mode_of_payment',l:t('c_mode')},{k:'reference_no',l:t('c_ref')}],rows:l,size:10,st:{page:0,key:null,dir:1}}));},function(e){ph.replaceChildren(errBox(e.message));});
b.appendChild(el('div',{class:'toolbar',style:'margin-top:12px'},[supMeta(id)?lnk(url('Supplier',id),t('open_sup'),'btn sm'):null]));}
function hbars(items,o){o=o||{};var mx=0;items.forEach(function(i){var v=Math.abs(i.value);if(v>mx)mx=v;});if(!items.length)return emptyBox();
return el('div',{class:'hb'},items.map(function(i){var w=mx?Math.abs(i.value)/mx*100:0;var vt=i.text||fmt(i.value);
var kids=[el('span',{class:'nm',title:i.label,text:i.label}),el('span',{class:'tr'},[el('span',{class:'bar',style:'width:'+w.toFixed(1)+'%;background:'+(i.value<0?C.red:(i.color||C.blue))})]),el('span',{class:'vl',text:vt})];
return i.onClick?el('button',{class:'hbr'+(i.sel?' sel':''),type:'button',title:i.label+': '+vt,onclick:i.onClick},kids):el('div',{class:'hbr'},kids);}));}
function fmtK(v){var x=Math.abs(v);var s=x>=1e6?(x/1e6).toFixed(1)+'M':x>=1e3?(x/1e3).toFixed(0)+'K':x.toFixed(0);return (v<0?'-':'')+s;}
function columns(o){var W=640,H=250,rtl=lang==='ar',ml=rtl?10:46,mr=rtl?46:10,mt=10,mb=34;var n=o.cats.length,ser=o.series;var mx=0,mn=0;
ser.forEach(function(s){s.vals.forEach(function(v){if(v>mx)mx=v;});(s.neg||[]).forEach(function(v){if(v<mn)mn=v;});});if(mx===0&&mn===0)mx=1;
var iw=W-ml-mr,ih=H-mt-mb,rng=mx-mn;function y(v){return mt+(mx-v)/rng*ih;}
var svg=sv('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':o.title,width:'100%',direction:'ltr',style:'direction:ltr'});
for(var i=0;i<=4;i++){var val=mn+rng*i/4;svg.appendChild(sv('line',{x1:ml,x2:W-mr,y1:y(val),y2:y(val),stroke:'#e3e8f0','stroke-width':1}));svg.appendChild(sv('text',{x:rtl?W-4:ml-4,y:y(val)+4,'text-anchor':rtl?'end':'end','font-size':10,fill:'#5d6b82'},[fmtK(val)]));}
if(mn<0)svg.appendChild(sv('line',{x1:ml,x2:W-mr,y1:y(0),y2:y(0),stroke:'#8a94a6','stroke-width':1.2}));
var gw=iw/n,bw=Math.min(34,gw*0.72/ser.length);
o.cats.forEach(function(cat,ci){var pos=rtl?n-1-ci:ci;var gx=ml+pos*gw+(gw-bw*ser.length)/2;
ser.forEach(function(s,si){var x=gx+si*bw;var col=(s.colors&&s.colors[ci])||s.color;var v=s.vals[ci]||0;
if(v>0){var r=sv('rect',{x:x,y:y(v),width:Math.max(bw-2,2),height:Math.max(y(0)-y(v),1),fill:col,rx:2,style:o.onBar?'cursor:pointer':''},[sv('title',null,[cat.label+' - '+s.name+': '+fmt(v)])]);if(o.onBar)r.addEventListener('click',function(){o.onBar(si,ci,1);});svg.appendChild(r);}
var nv=s.neg?s.neg[ci]:0;if(nv<0){var r2=sv('rect',{x:x,y:y(0),width:Math.max(bw-2,2),height:Math.max(y(nv)-y(0),1),fill:C.grey,'fill-opacity':.75,rx:2,style:o.onBar?'cursor:pointer':''},[sv('title',null,[cat.label+' - '+t('leg_cr')+': '+fmt(nv)])]);if(o.onBar)r2.addEventListener('click',function(){o.onBar(si,ci,-1);});svg.appendChild(r2);}});
svg.appendChild(sv('text',{x:ml+pos*gw+gw/2,y:H-14,'text-anchor':'middle','font-size':10,fill:'#5d6b82'},[cat.label]));});
var leg=el('div',{class:'leg'},ser.filter(function(s){return !o.hideLegend;}).map(function(s){return el('span',null,[el('i',{style:'background:'+s.color}),s.name]);}).concat(mn<0?[el('span',null,[el('i',{style:'background:'+C.grey}),t('leg_cr')])]:[]));
return el('div',{class:'chartwrap'},[svg,leg]);}

function sumK(arr,k){var s=0;arr.forEach(function(r){s+=+r[k]||0;});return s;}
function asofTxt(){return t('basis_asof')+' '+asOf();}
function perTxt(){return t('basis_per')+' '+S.f.from+' - '+S.f.to;}
function periodStats(){var pi=perRows('pi').filter(function(r){return !r.is_return&&inRange(r.posting_date);});var pe=perRows('pe').filter(function(r){return inRange(r.posting_date);});return {pi:pi,pe:pe,piSum:sumK(pi,'base_grand_total'),peSum:sumK(pe,'base_paid_amount')};}
function setCompany(co){S.f.company=S.f.company===co?'':co;syncControls();render();}
function bucketRows(rows,i,sign){return rows.filter(function(r){return bk(r.age)===i&&(!sign||(sign>0?r.out>0:r.out<0));});}
function drillBucket(i,sign,rows){drill({title:t('bk'+i)+(sign<0?' ('+t('leg_cr')+')':''),sub:t('src_ap')+' | '+asofTxt(),cols:docCols(),rows:bucketRows(rows||apRows(),i,sign),erp:{href:apUrl()}});}
function supAggCols(){return [{k:'name',l:t('c_sup'),r:supLink},{k:'co',l:t('c_co')},{k:'over',l:t('c_over'),num:1,r:function(r){return amt(r.over);}},{k:'nd',l:t('c_nd'),num:1,r:function(r){return amt(r.nd);}},{k:'cr',l:t('c_adv'),num:1,r:function(r){return amt(r.cr);}},{k:'net',l:t('c_total'),num:1,r:function(r){return amt(r.net);}}];}
function supDrill(title,list,sub){drill({title:title,sub:sub||t('src_ap')+' | '+asofTxt(),cols:supAggCols(),rows:list,erp:{href:apUrl()}});}
function attSec(title,key,cols,rows,sortKey,dir){return el('div',{style:'margin-bottom:16px'},[el('h3',{text:title}),rows.length?table({cols:cols,rows:rows,size:10,st:S.ts[key]||(S.ts[key]={page:0,key:sortKey,dir:dir})}):el('div',{class:'desc',text:t('none')})]);}
function monthList(){var d=parse(S.f.to),out=[];for(var i=11;i>=0;i--){var x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-i,1));out.push(x.getUTCFullYear()+'-'+pad(x.getUTCMonth()+1));}return out;}
function monthly(){var ms=monthList(),inv={},pay={};ms.forEach(function(m){inv[m]=0;pay[m]=0;});perRows('pi').forEach(function(r){if(r.is_return)return;var m=r.posting_date.slice(0,7);if(m in inv)inv[m]+=r.base_grand_total||0;});perRows('pe').forEach(function(r){var m=r.posting_date.slice(0,7);if(m in pay)pay[m]+=r.base_paid_amount||0;});return {ms:ms,inv:ms.map(function(m){return inv[m];}),pay:ms.map(function(m){return pay[m];})};}
function piCols(){return [{k:'name',l:t('c_pi'),r:function(r){return a('Purchase Invoice',r.name);}},{k:'supplier_name',l:t('c_sup')},{k:'company',l:t('c_co')},{k:'posting_date',l:t('c_post')},{k:'base_grand_total',l:t('c_amount'),num:1,r:function(r){return fmt(r.base_grand_total);}}];}
function peCols(){return [{k:'name',l:t('c_pe'),r:function(r){return a('Payment Entry',r.name);}},{k:'party_name',l:t('c_sup')},{k:'company',l:t('c_co')},{k:'posting_date',l:t('c_post')},{k:'base_paid_amount',l:t('c_amt'),num:1,r:function(r){return fmt(r.base_paid_amount);}},{k:'mode_of_payment',l:t('c_mode')},{k:'reference_no',l:t('c_ref')}];}
function perUnavail(){return D.data.perErr?errBox(D.data.perErr):null;}
function renderOverview(c){
var rows=apRows(),g=agg(rows),cur=scopeCur(),ps=periodStats(),av=asofTxt(),pt=perTxt();
var gi=agg(rows.filter(function(r){return isInter(r.sup);}));
var net={};rows.forEach(function(r){net[r.sup]=(net[r.sup]||0)+r.out;});
var activeIds=Object.keys(net).filter(function(k){return net[k]>0.005;});
var due7=rows.filter(function(r){return r.out>0&&r.age<=0&&r.age>=-7;});var d7=sumK(due7,'out');
var perErr=D.data.perErr;
c.appendChild(kpiGrid([
kpi({label:t('k_total'),value:fmt(g.net),cur:cur,sub:t('s_net')+(gi.net?' | '+t('s_inter')+' '+fmt(gi.net):''),src:t('src_ap')+' | '+av,onClick:function(){drill({title:t('k_total'),sub:av,cols:docCols(),rows:rows,erp:{href:apUrl()}});}}),
kpi({label:t('k_over'),value:fmt(g.over),cur:cur,tone:'red',sub:t('s_over'),src:t('src_ap')+' | '+av,onClick:function(){drill({title:t('k_over'),sub:av,cols:docCols(),rows:rows.filter(function(r){return r.out>0&&r.age>0;}),erp:{href:apUrl()}});}}),
kpi({label:t('k_nd'),value:fmt(g.nd),cur:cur,tone:'green',sub:t('s_nd'),src:t('src_ap')+' | '+av,onClick:function(){drill({title:t('k_nd'),sub:av,cols:docCols(),rows:rows.filter(function(r){return r.out>0&&r.age<=0;}),erp:{href:apUrl()}});}}),
kpi({label:t('k_adv'),value:fmt(g.cr),cur:cur,tone:'grey',sub:t('s_adv'),src:t('src_ap')+' | '+av,onClick:function(){drill({title:t('k_adv'),sub:av,cols:docCols(),rows:rows.filter(function(r){return r.out<0;}),erp:{href:apUrl()}});}}),
kpi({label:t('k_pi'),value:perErr?t('error'):fmt(ps.piSum),cur:perErr?'':cur,sub:perErr?'':ps.pi.length+' '+t('s_docs'),src:t('src_pi')+' | '+pt,onClick:function(){drill({title:t('k_pi'),sub:pt,cols:piCols(),rows:ps.pi,erp:{href:'/app/purchase-invoice?docstatus=1'}});}}),
kpi({label:t('k_pay'),value:perErr?t('error'):fmt(ps.peSum),cur:perErr?'':cur,tone:'green',sub:perErr?'':ps.pe.length+' '+t('s_docs'),src:t('src_pe')+' | '+pt,onClick:function(){drill({title:t('k_pay'),sub:pt,cols:peCols(),rows:ps.pe,erp:{href:'/app/payment-entry?docstatus=1&payment_type=Pay&party_type=Supplier'}});}}),
kpi({label:t('k_active'),value:String(activeIds.length),sub:t('s_sup'),src:t('src_ap')+' | '+av,onClick:function(){supDrill(t('k_active'),bySup(rows).filter(function(s){return net[s.sup]>0.005;}));}}),
kpi({label:t('k_due7'),value:fmt(d7),cur:cur,tone:'amber',sub:due7.length+' '+t('s_docs'),src:t('src_ap')+' | '+av,onClick:function(){drill({title:t('k_due7'),sub:av,cols:docCols(),rows:due7,erp:{href:apUrl()}});}})]));
var all=apRows(true),byCo={};all.forEach(function(r){(byCo[r.co]=byCo[r.co]||[]).push(r);});
var coItems=Object.keys(byCo).map(function(k){return {label:k,value:agg(byCo[k]).net,sel:S.f.company===k,onClick:function(){setCompany(k);}};}).sort(function(x,y){return y.value-x.value;});
var emptyCos=(D.companies||[]).filter(function(x){return !byCo[x.name];}).map(function(x){return x.name;});
var ageChart=columns({title:t('ch_age'),cats:[0,1,2,3,4,5].map(function(i){return {label:t('bk'+i)};}),series:[{name:t('gross'),color:C.blue,colors:BC,vals:g.bp,neg:g.bn}],hideLegend:true,onBar:function(si,ci,sg){drillBucket(ci,sg,rows);}});
var mm=monthly();var monthChart=perErr?errBox(perErr):columns({title:t('ch_month'),cats:mm.ms.map(function(m){return {label:m.slice(2)};}),series:[{name:t('leg_inv'),color:C.blue,vals:mm.inv},{name:t('leg_pay'),color:C.green,vals:mm.pay}],onBar:function(si,ci){var m=mm.ms[ci];if(si===0)drill({title:t('leg_inv')+' '+m,sub:t('src_pi'),cols:piCols(),rows:perRows('pi').filter(function(r){return !r.is_return&&r.posting_date.slice(0,7)===m;})});else drill({title:t('leg_pay')+' '+m,sub:t('src_pe'),cols:peCols(),rows:perRows('pe').filter(function(r){return r.posting_date.slice(0,7)===m;})});}});
c.appendChild(el('div',{class:'grid2'},[
card(t('ch_co'),S.f.company?S.f.company:null,[hbars(coItems),emptyCos.length?el('div',{class:'desc',style:'margin-top:8px',text:t('none')+': '+emptyCos.join(', ')}):null],t('src_ap')+' | '+av),
card(t('ch_age'),t('ch_age_d'),[ageChart],t('src_ap')+' | '+av)]));
var sn={};rows.forEach(function(r){var s=sn[r.sup]||(sn[r.sup]={key:r.sup,sup:r.sup,name:r.name,net:0});s.net+=r.out;});
var top=Object.keys(sn).map(function(k){return sn[k];}).filter(function(s){return s.net>0;}).sort(function(x,y){return y.net-x.net;}).slice(0,10);
c.appendChild(el('div',{class:'grid2'},[
card(t('ch_month'),t('ch_month_d'),[monthChart],t('src_pi')+' + '+t('src_pe')),
card(t('ch_top'),null,[top.length?table({cols:[{k:'name',l:t('c_sup'),r:supLink},{k:'net',l:t('c_out'),num:1,r:function(r){return fmt(r.net);}},{k:'pct',l:t('c_pct'),num:1,v:function(r){return g.net>0?r.net/g.net:0;},r:function(r){return g.net>0?(r.net/g.net*100).toFixed(1)+'%':'—';}}],rows:top,size:10,st:S.ts.top||(S.ts.top={page:0,key:null,dir:1})}):emptyBox()],t('src_ap')+' | '+av)]));
var sl=bySup(rows);
var over5=sl.filter(function(s){return s.over>0;});
var longR=rows.filter(function(r){return r.out>0&&r.age>120;});
var crL=sl.filter(function(s){return s.cr<0;});
var rec=buildExceptions().filter(function(x){return x.type==='recon';});
var recCols=[{k:'co',l:t('c_co')},{k:'name',l:t('c_sup'),r:function(r){return r.sup?el('button',{class:'lk',type:'button',onclick:function(){supplierPanel(r.sup,r.name);},text:r.name}):'—';}},{k:'detail',l:t('c_det')},{k:'amt',l:t('c_amount'),num:1,r:function(r){return amt(r.amt);}},{k:'sev',l:t('c_sev'),v:function(r){return SEVO[r.sev];},r:function(r){return sevBadge(r.sev);}}];
var recSec=D.data.sumPending?el('div',{style:'margin-bottom:16px'},[el('h3',{text:t('att_rec')}),el('div',{class:'desc',text:t('sum_wait')})]):attSec(t('att_rec'),'att5',recCols,rec,'sev',1);
c.appendChild(card(t('att'),null,[
attSec(t('att_over'),'att1',supAggCols().concat([{k:'maxOver',l:t('c_maxover'),num:1,r:function(r){return r.maxOver||'—';}}]),over5,'over',-1),
attSec(t('att_due'),'att2',docCols(),due7,'out',-1),
attSec(t('att_long'),'att3',docCols(),longR,'out',-1),
attSec(t('att_adv'),'att4',supAggCols(),crL,'cr',1),
recSec],t('src_ap')+' | '+av));}
function renderSupplier(c){var rows=apRows(),list=bySup(rows);var av=asofTxt();
var locT=function(id){var l=locOf(id);return l==='na'?'—':t('loc_'+(l==='local'?'local':l==='foreign'?'foreign':'unc'));};
c.appendChild(card(t('sup_title'),list.length+' '+t('s_sup'),[table({cols:[{k:'name',l:t('c_sup'),r:supLink},{k:'grp',l:t('c_grp'),r:function(r){var m=supMeta(r.sup);return r.grp||(m&&m.supplier_group)||'';}},{k:'co',l:t('c_co')},{k:'loc',l:t('c_loc'),v:function(r){return locT(r.sup);},r:function(r){return locT(r.sup);}},{k:'net',l:t('c_total'),num:1,r:function(r){return amt(r.net);}},{k:'over',l:t('c_over'),num:1,r:function(r){return amt(r.over);}},{k:'nd',l:t('c_nd'),num:1,r:function(r){return amt(r.nd);}},{k:'cr',l:t('c_adv'),num:1,r:function(r){return amt(r.cr);}},{k:'oldest',l:t('c_oldest')},{k:'maxOver',l:t('c_maxover'),num:1,r:function(r){return r.maxOver||'—';}},{k:'view',l:t('c_view')||'',nosort:true,r:function(r){return el('button',{class:'btn sm',type:'button',onclick:function(){supplierPanel(r.sup,r.name);},text:t('details')});}}],rows:list,size:15,st:S.ts.sup||(S.ts.sup={page:0,key:'net',dir:-1})})],t('src_ap')+' | '+av));}
function renderAgeing(c){var rows=apRows(),g=agg(rows),av=asofTxt(),cur=scopeCur();
var tot=0;g.b.forEach(function(v){tot+=v;});var d1=Math.abs(tot-g.net);
var natHigh=0,mine=g.b[2]+g.b[3]+g.b[4]+g.b[5];rows.forEach(function(r){natHigh+=r.nat[1]+r.nat[2]+r.nat[3]+r.nat[4];});var d2=Math.abs(mine-natHigh);
var banners=[];banners.push(el('div',{class:'banner '+(d1<=S.rules.tol?'ok':'err')},[d1<=S.rules.tol?t('ag_rec_ok'):t('ag_rec_bad')+' '+fmt(d1)]));
banners.push(el('div',{class:'banner '+(d2<=S.rules.tol?'ok':'warn')},[d2<=S.rules.tol?t('ag_native'):t('ag_native_bad')+' '+fmt(d2)]));
c.appendChild(el('div',null,banners));
c.appendChild(kpiGrid([0,1,2,3,4,5].map(function(i){return kpi({label:i===0?t('bk0'):t('bk'+i),value:fmt(g.b[i]),cur:cur,tone:i===0?'green':i<3?'amber':'red',sub:t('gross')+' '+fmt(g.bp[i])+' | '+t('credits')+' '+fmt(g.bn[i]),src:t('src_ap')+' | '+av,onClick:function(){drillBucket(i,0,rows);}});})));
var all=apRows(true),byCo={};all.forEach(function(r){(byCo[r.co]=byCo[r.co]||[]).push(r);});
var cos=Object.keys(byCo).map(function(k){return {co:k,g:agg(byCo[k]),rows:byCo[k]};}).sort(function(x,y){return y.g.gross-x.g.gross;});var mx=cos.length?cos[0].g.gross:0;
var stk=el('div',{class:'hb'},cos.map(function(x){return el('div',{class:'hbr'},[el('span',{class:'nm',title:x.co,text:x.co}),el('div',{class:'stk',style:'width:'+(mx?Math.max(x.g.gross/mx*100,1):0).toFixed(1)+'%'},x.g.bp.map(function(v,i){return v>0?el('button',{type:'button',title:t('bk'+i)+': '+fmt(v),style:'background:'+BC[i]+';width:'+(x.g.gross?v/x.g.gross*100:0).toFixed(2)+'%',onclick:function(){drillBucket(i,1,x.rows);}}):null;})),el('span',{class:'vl',text:fmt(x.g.gross)})]);}));
var leg=el('div',{class:'leg'},[0,1,2,3,4,5].map(function(i){return el('span',null,[el('i',{style:'background:'+BC[i]}),t('bk'+i)]);}));
var sl=bySup(rows);var ov=sl.filter(function(s){return s.over>0;}).sort(function(x,y){return y.over-x.over;}).slice(0,15);
var gm={};rows.forEach(function(r){var m=supMeta(r.sup);var gname=r.grp||(m&&m.supplier_group)||t('nogrp');var x=gm[gname]||(gm[gname]={gross:0,over:0});if(r.out>0){x.gross+=r.out;if(r.age>0)x.over+=r.out;}});
var gItems=Object.keys(gm).filter(function(k){return gm[k].gross>0;}).map(function(k){return {label:k,pct:gm[k].over/gm[k].gross*100,x:gm[k]};}).sort(function(x,y){return y.pct-x.pct;}).slice(0,12);
c.appendChild(el('div',{class:'grid2'},[
card(t('ag_co'),null,[stk,leg],t('src_ap')+' | '+av),
card(t('ag_sup'),null,[hbars(ov.map(function(s){return {label:s.name,value:s.over,color:C.red,onClick:function(){supplierPanel(s.sup,s.name);}};}))],t('src_ap')+' | '+av),
card(t('ag_grp'),t('pct_over')+' = '+t('k_over')+' / '+t('gross'),[hbars(gItems.map(function(i){return {label:i.label,value:i.pct,color:C.orange,text:i.pct.toFixed(1)+'% ('+fmtK(i.x.over)+' / '+fmtK(i.x.gross)+')',onClick:function(){drill({title:i.label,sub:t('src_ap')+' | '+av,cols:docCols(),rows:rows.filter(function(r){var m=supMeta(r.sup);return (r.grp||(m&&m.supplier_group)||t('nogrp'))===i.label&&r.out>0&&r.age>0;}),erp:{href:apUrl()}});}};}))],t('src_ap')+' | '+av)]));
var o={cols:[{k:'name',l:t('c_sup'),r:function(r){return el('span',null,[el('button',{class:'chev',type:'button','aria-expanded':S.exp[r.key]?'true':'false',onclick:function(){S.exp[r.key]=!S.exp[r.key];o.redraw();},text:S.exp[r.key]?'▾':(lang==='ar'?'◂':'▸')}),supLink(r)]);}},{k:'co',l:t('c_co')}].concat([0,1,2,3,4,5].map(function(i){return {k:'b'+i,l:t('bk'+i),num:1,v:function(r){return r.b[i];},r:function(r){return amt(r.b[i]);}};})).concat([{k:'net',l:t('c_total'),num:1,r:function(r){return amt(r.net);}}]),rows:sl,size:12,st:S.ts.age||(S.ts.age={page:0,key:'net',dir:-1}),exp:S.exp,extra:function(r){return table({cols:docCols().filter(function(c2){return c2.k!=='name';}),rows:r.rows,size:8,st:{page:0,key:'age',dir:-1}});}};
c.appendChild(el('div',{style:'height:2px'}));
c.appendChild(card(t('ag_tbl'),null,[table(o)],t('src_ap')+' | '+av));}

function resolveSup(v){if(!v)return '';if(D.supM[v])return v;var h=Object.keys(D.supM).filter(function(id){return D.supM[id].supplier_name===v;})[0];return h||v;}
function listFilters(co,sup){var f=S.f,flt=[];if(f.company)flt.push(['company','=',f.company]);if(f.supplier)flt.push([sup,'=',resolveSup(f.supplier)]);
if(f.group||f.loc){var ids=Object.keys(D.supM).filter(function(id){return supMatch(id,'',{supplier:'',group:f.group,loc:f.loc});});if(!ids.length)return null;flt.push([sup,'in',ids]);}return flt;}
function statusBadge(s){var m={Paid:'green',Unpaid:'blue','Partly Paid':'amber',Overdue:'red',Return:'grey','Debit Note Issued':'grey',Draft:'grey',Cancelled:'grey'};return badge(t('st_'+s)===('st_'+s)?s:t('st_'+s),m[s]||'grey');}
function selectEl(opts,val,onch){var s=el('select',{onchange:function(){onch(s.value);}},opts.map(function(o){return el('option',{value:o[0],text:o[1]});}));s.value=val;return s;}
function fld(label,ctrl){return el('div',{class:'fld'},[el('label',{text:label}),ctrl]);}
function fetchPI(force){var s=S.pi,base=listFilters('company','supplier');var q=S.f.search;
var key=JSON.stringify([base,q,s.status,s.dfrom,s.dto,s.sort,s.page,s.period,S.f.from,S.f.to]);if(!force&&key===s.key&&(s.data||s.loading))return;s.key=key;s.loading=true;s.err=null;s.data=null;paintTab('invoices');
if(!base){s.total=0;s.data=[];s.kpi={sub:0,unpaid:0,part:0,over:0,soon:0};s.loading=false;paintTab('invoices');return;}
var of=q?[['name','like','%'+q+'%'],['supplier_name','like','%'+q+'%'],['bill_no','like','%'+q+'%']]:undefined;
var b=[['docstatus','=',1]].concat(base);var flt=b.slice();
if(s.status==='open')flt.push(['outstanding_amount','>',0]);else if(s.status)flt.push(['status','=',s.status]);
if(s.dfrom)flt.push(['due_date','>=',s.dfrom]);if(s.dto)flt.push(['due_date','<=',s.dto]);
if(s.period==='1'){flt.push(['posting_date','>=',S.f.from]);flt.push(['posting_date','<=',S.f.to]);}
var order='posting_date desc, name desc';if(s.sort==='out'){order='outstanding_amount desc';flt.push(['outstanding_amount','>',0]);}if(s.sort==='old'){order='due_date asc';flt.push(['outstanding_amount','>',0]);flt.push(['due_date','<',TODAY]);}
var cnt=function(f2){return getList('Purchase Invoice',['count(name) as c'],f2,{limit:1,or_filters:of}).then(function(r){return (r&&r[0]&&r[0].c)||0;});};
Promise.all([getList('Purchase Invoice',['name','supplier','supplier_name','company','posting_date','due_date','grand_total','base_grand_total','outstanding_amount','party_account_currency','conversion_rate','currency','status','is_return','bill_no'],flt,{limit:15,start:s.page*15,order:order,or_filters:of}),cnt(flt),
cnt(b.concat([['is_return','=',0],['posting_date','>=',S.f.from],['posting_date','<=',S.f.to]])),cnt(b.concat([['status','=','Unpaid']])),cnt(b.concat([['status','=','Partly Paid']])),cnt(b.concat([['status','=','Overdue']])),cnt(b.concat([['is_return','=',0],['outstanding_amount','>',0],['due_date','>=',TODAY],['due_date','<=',addD(TODAY,7)]]))]).then(function(r){
if(key!==s.key)return;s.data=r[0];s.total=r[1];s.kpi={sub:r[2],unpaid:r[3],part:r[4],over:r[5],soon:r[6]};s.loading=false;paintTab('invoices');},function(e){if(key!==s.key)return;s.err=e.message;s.loading=false;paintTab('invoices');});}
function piApply(o){var s=S.pi;s.status=o.status||'';s.dfrom=o.dfrom||'';s.dto=o.dto||'';s.period=o.period||'';s.sort=o.sort||'post';s.page=0;fetchPI(true);}
function renderInvoices(c){var s=S.pi;fetchPI();
c.appendChild(el('div',{class:'banner info',text:t('pi_note')}));
var k=s.kpi;var kk=function(label,v,tone,fn,src){return kpi({label:label,value:s.loading||!k?'...':String(v),tone:tone,src:src||t('src_pi')+' | '+t('basis_live'),onClick:fn});};
c.appendChild(kpiGrid([
kk(t('pi_k_sub'),k&&k.sub,'',function(){piApply({period:'1'});},t('src_pi')+' | '+perTxt()),
kk(t('pi_k_unpaid'),k&&k.unpaid,'',function(){piApply({status:'Unpaid'});}),
kk(t('pi_k_part'),k&&k.part,'amber',function(){piApply({status:'Partly Paid'});}),
kk(t('pi_k_over'),k&&k.over,'red',function(){piApply({status:'Overdue',sort:'old'});}),
kk(t('pi_k_soon'),k&&k.soon,'amber',function(){piApply({status:'open',dfrom:TODAY,dto:addD(TODAY,7)});})]));
var ch=function(fn){return function(v){fn(v);s.page=0;fetchPI();};};
c.appendChild(el('div',{class:'toolbar'},[
fld(t('f_status'),selectEl([['',t('f_all')],['open',t('st_open')],['Unpaid',t('st_Unpaid')],['Partly Paid',t('st_Partly Paid')],['Overdue',t('st_Overdue')],['Paid',t('st_Paid')],['Return',t('st_Return')],['Debit Note Issued',t('st_Debit Note Issued')]],s.status,ch(function(v){s.status=v;}))),
fld(t('f_due_from'),el('input',{type:'date',value:s.dfrom,onchange:function(e){ch(function(v){s.dfrom=v;})(e.target.value);}})),
fld(t('f_due_to'),el('input',{type:'date',value:s.dto,onchange:function(e){ch(function(v){s.dto=v;})(e.target.value);}})),
fld(t('f_date'),selectEl([['',t('f_allt')],['1',t('f_period')]],s.period,ch(function(v){s.period=v;}))),
fld(t('f_sort'),selectEl([['post',t('so_new')],['out',t('so_out')],['old',t('so_old')]],s.sort,ch(function(v){s.sort=v;})))]));
var body;if(s.err)body=errBox(s.err,function(){fetchPI(true);});else if(s.loading||!s.data)body=loadBox();else body=table({cols:[
{k:'name',l:t('c_pi'),r:function(r){return a('Purchase Invoice',r.name);}},{k:'supplier_name',l:t('c_sup'),r:function(r){return el('button',{class:'lk',type:'button',onclick:function(){supplierPanel(r.supplier,r.supplier_name||r.supplier);},text:r.supplier_name||r.supplier});}},{k:'company',l:t('c_co')},{k:'posting_date',l:t('c_post')},{k:'due_date',l:t('c_due')},
{k:'base_grand_total',l:t('c_inv'),num:1,r:function(r){return el('span',null,[fmt(r.base_grand_total),r.currency!==curOf(r.company)?el('div',{class:'src',text:r.currency+' '+fmt(r.grand_total)}):null]);}},
{k:'outstanding_amount',l:t('c_out'),num:1,r:function(r){return amt(invoiceBalance(r));}},
{k:'status',l:t('c_status'),r:function(r){return statusBadge(r.status);}},
{k:'od',l:t('c_age'),num:1,r:function(r){return r.outstanding_amount>0&&r.due_date&&r.due_date<TODAY?String(diff(r.due_date,TODAY)):'—';}},
{k:'v',l:t('c_view'),r:function(r){return a('Purchase Invoice',r.name,t('view'));}}],rows:s.data,size:15,server:{total:s.total,page:s.page,size:15,go:function(p){s.page=p;fetchPI();}},st:{page:0}});
c.appendChild(card(t('t_invoices'),s.total+' '+t('s_docs'),[body],t('src_pi')+' | '+t('basis_live')));}
function fetchPE(force){var s=S.pe,base=listFilters('company','party');var q=S.f.search;
var key=JSON.stringify([base,q,s.status,s.page,S.f.from,S.f.to]);if(!force&&key===s.key&&(s.data||s.loading))return;s.key=key;s.loading=true;s.err=null;s.data=null;paintTab('payments');
if(!base){s.total=0;s.data=[];s.loading=false;paintTab('payments');return;}
var of=q?[['name','like','%'+q+'%'],['party_name','like','%'+q+'%'],['reference_no','like','%'+q+'%']]:undefined;
var flt=[['payment_type','=','Pay'],['party_type','=','Supplier'],['posting_date','>=',S.f.from],['posting_date','<=',S.f.to]].concat(base);
if(s.status==='sub')flt.push(['docstatus','=',1]);else if(s.status==='draft')flt.push(['docstatus','=',0]);else flt.push(['docstatus','in',[0,1]]);
Promise.all([getList('Payment Entry',['name','party','party_name','company','posting_date','base_paid_amount','mode_of_payment','reference_no','docstatus','workflow_state'],flt,{limit:15,start:s.page*15,order:'posting_date desc, name desc',or_filters:of}),getList('Payment Entry',['count(name) as c'],flt,{limit:1,or_filters:of})]).then(function(r){if(key!==s.key)return;s.data=r[0];s.total=(r[1][0]&&r[1][0].c)||0;s.loading=false;paintTab('payments');},function(e){if(key!==s.key)return;s.err=e.message;s.loading=false;paintTab('payments');});}
function fetchWF(){var f=[['docstatus','=',0],['payment_type','=','Pay'],['party_type','=','Supplier']];if(S.f.company)f.push(['company','=',S.f.company]);var key=JSON.stringify(f);if(S.pe.wfKey===key)return;S.pe.wfKey=key;S.pe.wf=null;
getList('Payment Entry',['workflow_state','count(name) as c','sum(base_paid_amount) as amt'],f,{limit:0,group:'workflow_state'}).then(function(r){if(S.pe.wfKey!==key)return;S.pe.wf=r;paintTab('payments');},function(e){if(S.pe.wfKey!==key)return;S.pe.wf={err:e.message};paintTab('payments');});}
function renderPayments(c){var s=S.pe;fetchPE();fetchWF();var ps=periodStats(),cur=scopeCur(),pt=perTxt(),av=asofTxt();var perErr=D.data.perErr;
var mo=S.f.to.slice(0,7);var pm=perRows('pe').filter(function(r){return r.posting_date.slice(0,7)===mo&&r.posting_date<=S.f.to;});
var advR=ps.pe.filter(function(r){return (r.unallocated_amount||0)>S.rules.tol;});var rows=apRows();
var up=rows.filter(function(r){return r.out>0&&r.age<=0&&r.age>=-30;});
var wf=s.wf,wfN=0,wfTxt='',wfErr=null;if(wf&&wf.err)wfErr=wf.err;else if(wf){wf.forEach(function(x){wfN+=x.c;});wfTxt=wf.map(function(x){return (x.workflow_state||'-')+': '+x.c;}).join(' | ');}
c.appendChild(el('div',{class:'banner info',text:t('pm_note')}));
c.appendChild(kpiGrid([
kpi({label:t('pm_k_period'),value:perErr?t('error'):fmt(ps.peSum),cur:perErr?'':cur,tone:'green',sub:ps.pe.length+' '+t('s_docs'),src:t('src_pe')+' | '+pt,onClick:function(){drill({title:t('pm_k_period'),sub:pt,cols:peCols(),rows:ps.pe,erp:{href:'/app/payment-entry?docstatus=1&payment_type=Pay&party_type=Supplier'}});}}),
kpi({label:t('pm_k_month')+' ('+mo+')',value:perErr?t('error'):fmt(sumK(pm,'base_paid_amount')),cur:perErr?'':cur,sub:pm.length+' '+t('s_docs'),src:t('src_pe')+' | '+mo,onClick:function(){drill({title:t('pm_k_month'),sub:mo,cols:peCols(),rows:pm});}}),
kpi({label:t('pm_k_adv'),value:perErr?t('error'):fmt(sumK(advR,'unallocated_amount')),cur:perErr?'':cur,tone:'amber',sub:advR.length+' '+t('s_docs'),src:t('src_pe')+' | '+pt,onClick:function(){drill({title:t('pm_k_adv'),sub:pt,cols:peCols().concat([{k:'unallocated_amount',l:t('d_unalloc'),num:1,r:function(r){return fmt(r.unallocated_amount);}}]),rows:advR});}}),
kpi({label:t('pm_k_wf'),value:wfErr?t('error'):(wf?String(wfN):'...'),tone:'amber',sub:wfErr?wfErr:(wfN?wfTxt:(wf?t('pm_wf_none'):'')),src:t('src_pe')+' (docstatus 0) | '+t('basis_live'),onClick:function(){drill({title:t('pm_k_wf'),sub:wfTxt,cols:peCols().concat([{k:'workflow_state',l:t('c_dstat')}]),load:function(){var f=[['docstatus','=',0],['payment_type','=','Pay'],['party_type','=','Supplier']];if(S.f.company)f.push(['company','=',S.f.company]);return getList('Payment Entry',['name','party','party_name','company','posting_date','base_paid_amount','mode_of_payment','reference_no','workflow_state'],f,{limit:200,order:'posting_date desc'});},erp:{href:'/app/payment-entry?docstatus=0&payment_type=Pay&party_type=Supplier'}});}}),
kpi({label:t('pm_k_up'),value:fmt(sumK(up,'out')),cur:cur,sub:up.length+' '+t('s_docs'),src:t('src_ap')+' | '+av,onClick:function(){drill({title:t('pm_k_up'),sub:av,cols:docCols(),rows:up,erp:{href:apUrl()}});}})]));
var mm=monthly();var mchart=perErr?errBox(perErr):columns({title:t('pm_c_month'),cats:mm.ms.map(function(m){return {label:m.slice(2)};}),series:[{name:t('leg_pay'),color:C.green,vals:mm.pay}],hideLegend:true,onBar:function(si,ci){var m=mm.ms[ci];drill({title:t('leg_pay')+' '+m,sub:t('src_pe'),cols:peCols(),rows:perRows('pe').filter(function(r){return r.posting_date.slice(0,7)===m;})});}});
var byC={},byS={},invC={};ps.pe.forEach(function(r){byC[r.company]=(byC[r.company]||0)+r.base_paid_amount;var k=r.party;(byS[k]=byS[k]||{id:k,name:r.party_name||k,v:0}).v+=r.base_paid_amount;});ps.pi.forEach(function(r){invC[r.company]=(invC[r.company]||0)+r.base_grand_total;});
var coKeys=Object.keys(byC).sort(function(x,y){return byC[y]-byC[x];});
var topS=Object.keys(byS).map(function(k){return byS[k];}).sort(function(x,y){return y.v-x.v}).slice(0,10);
var ivItems=[];Object.keys(Object.assign({},byC,invC)).forEach(function(co){ivItems.push({label:co+' - '+t('leg_inv'),value:invC[co]||0,color:C.blue});ivItems.push({label:co+' - '+t('leg_pay'),value:byC[co]||0,color:C.green});});
c.appendChild(el('div',{class:'grid2'},[
card(t('pm_c_month'),t('ch_month_d'),[mchart],t('src_pe')),
card(t('pm_c_co'),null,[perErr?errBox(perErr):hbars(coKeys.map(function(k){return {label:k,value:byC[k],color:C.green,sel:S.f.company===k,onClick:function(){setCompany(k);}};}))],t('src_pe')+' | '+pt),
card(t('pm_c_sup'),null,[perErr?errBox(perErr):hbars(topS.map(function(x){return {label:x.name,value:x.v,color:C.green,onClick:function(){supplierPanel(x.id,x.name);}};}))],t('src_pe')+' | '+pt),
card(t('pm_c_iv'),null,[perErr?errBox(perErr):hbars(ivItems)],t('src_pi')+' + '+t('src_pe')+' | '+pt)]));
var body;if(s.err)body=errBox(s.err,function(){fetchPE(true);});else if(s.loading||!s.data)body=loadBox();else body=table({cols:[
{k:'name',l:t('c_pe'),r:function(r){return a('Payment Entry',r.name);}},{k:'party_name',l:t('c_sup'),r:function(r){return el('button',{class:'lk',type:'button',onclick:function(){supplierPanel(r.party,r.party_name||r.party);},text:r.party_name||r.party});}},{k:'company',l:t('c_co')},{k:'posting_date',l:t('c_post')},{k:'base_paid_amount',l:t('c_amt'),num:1,r:function(r){return fmt(r.base_paid_amount);}},{k:'mode_of_payment',l:t('c_mode')},{k:'reference_no',l:t('c_ref')},
{k:'ds',l:t('c_dstat'),r:function(r){var st=r.workflow_state||['Draft','Submitted','Cancelled'][r.docstatus];return badge(st,r.docstatus===1?'green':'amber');}},{k:'v',l:t('c_view'),r:function(r){return a('Payment Entry',r.name,t('view'));}}],rows:s.data,size:15,server:{total:s.total,page:s.page,size:15,go:function(p){s.page=p;fetchPE();}},st:{page:0}});
c.appendChild(card(t('pm_tbl'),null,[el('div',{class:'toolbar'},[fld(t('f_pstatus'),selectEl([['sub',t('ds_sub')],['draft',t('ds_draft')],['all',t('ds_all')]],s.status,function(v){s.status=v;s.page=0;fetchPE();}))]),body],t('src_pe')+' | '+pt));}

function buildExceptions(){var R=S.rules,out=[];if(!D.data)return out;var rows=apRows(),asof=asOf();var sl=bySup(rows);
var coNet={};D.data.list.forEach(function(r){coNet[r.co]=(coNet[r.co]||0)+r.out;});
sl.forEach(function(s){var ov=0,mx=0;s.rows.forEach(function(r){if(r.out>0&&r.age>R.warn){ov+=r.out;if(r.age>mx)mx=r.age;}});
if(ov>0)out.push({type:'over90',co:s.co,sup:s.sup,name:s.name,ref:null,amt:ov,days:mx,sev:mx>R.crit?'crit':'warn',detail:t('d_over')+' > '+R.warn+' '+t('days')});
var tn=coNet[s.co]||0;if(s.net>0&&tn>0&&s.net/tn*100>=R.large)out.push({type:'large',co:s.co,sup:s.sup,name:s.name,ref:null,amt:s.net,days:s.maxOver,sev:'warn',detail:(s.net/tn*100).toFixed(1)+'% '+t('d_large')});
if(s.cr<0)out.push({type:'adv',co:s.co,sup:s.sup,name:s.name,ref:null,amt:s.cr,days:null,sev:'info',detail:s.rows.filter(function(r){return r.out<0;}).length+' '+t('d_adv')});
if(s.net<0)out.push({type:'neg',co:s.co,sup:s.sup,name:s.name,ref:null,amt:s.net,days:null,sev:'warn',detail:t('d_neg')});
if(isInter(s.sup)&&Math.abs(s.net)>R.tol)out.push({type:'inter',co:s.co,sup:s.sup,name:s.name,ref:null,amt:s.net,days:s.maxOver||null,sev:'info',detail:t('d_inter')});});
rows.forEach(function(r){if(r.out>0&&r.age>R.old)out.push({type:'old',co:r.co,sup:r.sup,name:r.name,ref:{dt:r.vt,name:r.vn},amt:r.out,days:r.age,sev:'crit',detail:t('d_old')+': '+r.age});
if(r.vt==='Purchase Invoice'){var dd=null;if(!r.due)dd=t('d_due_missing');else if(r.due<r.post)dd=t('d_due_before')+' ('+r.post+' / '+r.due+')';else if(diff(r.post,r.due)>R.term)dd=t('d_due_long')+': '+diff(r.post,r.due);
if(dd)out.push({type:'due',co:r.co,sup:r.sup,name:r.name,ref:{dt:r.vt,name:r.vn},amt:r.out,days:r.age,sev:'warn',detail:dd});}});
perRows('pe').forEach(function(r){var u=r.unallocated_amount||0;if(u>R.tol){var d=diff(r.posting_date,asof);out.push({type:'unalloc',co:r.company,sup:r.party,name:r.party_name||r.party,ref:{dt:'Payment Entry',name:r.name},amt:u,days:d,sev:d>R.unalloc?'warn':'info',detail:t('d_unalloc')});}});
var cos={};D.data.list.forEach(function(r){if(S.f.company&&r.co!==S.f.company)return;(cos[r.co]=cos[r.co]||[]).push(r);});
Object.keys(D.data.sums||{}).forEach(function(co){if(S.f.company&&co!==S.f.company)return;var sm=D.data.sums[co],rs=cos[co]||[],det=sumK(rs,'out');
if(Math.abs(det-sm.total)>R.tol)out.push({type:'recon',co:co,sup:'',name:'',ref:null,amt:det-sm.total,days:null,sev:'crit',detail:t('d_sumdet')+': '+fmt(sm.total)+' / '+fmt(det)});
var g2=agg(rs),nh=0;rs.forEach(function(r){nh+=r.nat[1]+r.nat[2]+r.nat[3]+r.nat[4];});var mine=g2.b[2]+g2.b[3]+g2.b[4]+g2.b[5];if(Math.abs(mine-nh)>R.tol)out.push({type:'recon',co:co,sup:'',name:'',ref:null,amt:mine-nh,days:null,sev:'warn',detail:t('d_bkt')+': '+fmt(mine)+' / '+fmt(nh)});
var dm={};rs.forEach(function(r){dm[r.sup]=(dm[r.sup]||0)+r.out;});var ids={};Object.keys(dm).forEach(function(k){ids[k]=1;});Object.keys(sm.map).forEach(function(k){ids[k]=1;});
Object.keys(ids).forEach(function(k){var dv=dm[k]||0,sv2=sm.map[k]?sm.map[k].out:0;if(Math.abs(dv-sv2)>R.tol){var m=supMeta(k);if(!supMatch(k,m?m.supplier_name:'',S.f))return;out.push({type:'recon',co:co,sup:k,name:m?m.supplier_name:k,ref:null,amt:dv-sv2,days:null,sev:'warn',detail:t('d_supdiff')+': '+fmt(sv2)+' / '+fmt(dv)});}});});
return out;}
var SEVO={crit:0,warn:1,info:2};
function renderExceptions(c){var R=S.rules;
if(D.data.sumPending)c.appendChild(el('div',{class:'banner info'},[el('span',{class:'spin'}),t('sum_wait')]));
if(D.data.sumErr&&D.data.sumErr.length)c.appendChild(el('div',{class:'banner warn',text:t('note_fail')+' '+t('src_sum')+': '+D.data.sumErr.join('; ')}));
var all=buildExceptions();var cnt={crit:0,warn:0,info:0};all.forEach(function(x){cnt[x.sev]++;});
c.appendChild(kpiGrid(['crit','warn','info'].map(function(sv3){return kpi({label:t('sev_'+sv3),value:String(cnt[sv3]),tone:sv3==='crit'?'red':sv3==='warn'?'amber':'',sub:t('ex_sum'),onClick:function(){S.exFilter.sev=S.exFilter.sev===sv3?'':sv3;S.ts.ex=null;render();}});})));
var types=['over90','large','adv','neg','unalloc','recon','due','inter','old'];
var rp=function(key,label){var inp=el('input',{type:'number',min:'0',step:key==='tol'?'0.01':'1',value:R[key],onchange:function(){var v=parseFloat(inp.value);if(!isNaN(v)&&v>=0){R[key]=v;S.ts.ex=null;render();}}});return fld(label,inp);};
var fl=all.filter(function(x){return (!S.exFilter.type||x.type===S.exFilter.type)&&(!S.exFilter.sev||x.sev===S.exFilter.sev);});
var tb=el('div',{class:'toolbar'},[fld(t('c_type'),selectEl([['',t('ex_all')]].concat(types.map(function(k){return [k,t('x_'+k)];})),S.exFilter.type,function(v){S.exFilter.type=v;S.ts.ex=null;render();})),fld(t('c_sev'),selectEl([['',t('ex_allsev')],['crit',t('sev_crit')],['warn',t('sev_warn')],['info',t('sev_info')]],S.exFilter.sev,function(v){S.exFilter.sev=v;S.ts.ex=null;render();}))]);
fl.forEach(function(x,i){x.key='x'+i;});
c.appendChild(card(t('ex_tbl'),fl.length+' / '+all.length,[tb,table({cols:[{k:'type',l:t('c_type'),r:function(r){return t('x_'+r.type);}},{k:'co',l:t('c_co')},{k:'name',l:t('c_sup'),r:function(r){return r.sup?el('button',{class:'lk',type:'button',onclick:function(){supplierPanel(r.sup,r.name);},text:r.name}):'—';}},{k:'ref',l:t('c_docref'),nosort:true,r:function(r){return r.ref?a(r.ref.dt,r.ref.name):null;}},{k:'amt',l:t('c_amount'),num:1,r:function(r){return amt(r.amt);}},{k:'days',l:t('c_days'),num:1,r:function(r){return r.days==null?null:String(r.days);}},{k:'sev',l:t('c_sev'),v:function(r){return SEVO[r.sev];},r:function(r){return sevBadge(r.sev);}},{k:'detail',l:t('c_det')}],rows:fl,size:15,st:S.ts.ex||(S.ts.ex={page:0,key:'sev',dir:1})})],t('src_ap')+' | '+asofTxt()));
c.appendChild(el('div',{style:'height:14px'}));
c.appendChild(card(t('ex_rules'),null,[el('div',{class:'toolbar'},[rp('warn',t('r_warn')),rp('crit',t('r_crit')),rp('old',t('r_old')),rp('large',t('r_large')),rp('unalloc',t('r_unalloc')),rp('term',t('r_term')),rp('tol',t('r_tol'))]),
el('ul',{class:'mini'},types.map(function(k){return el('li',null,[el('span',null,[el('b',{text:t('x_'+k)+': '}),t('rule_'+k)==='rule_'+k?'':t('rule_'+k)])]);}))],t('src_ap')+' | '+t('src_sum')+' | '+t('src_pe')));}

L.c_view=['View','عرض'];L.nogrp=['(no group)','(بدون مجموعة)'];L.d_supdiff=['Supplier balance: summary vs detail','رصيد المورد: الملخص مقابل التفصيل'];
var TABS=['overview','supplier','ageing','invoices','payments','exceptions'];
var RENDER={overview:renderOverview,supplier:renderSupplier,ageing:renderAgeing,invoices:renderInvoices,payments:renderPayments,exceptions:renderExceptions};
var els={c:{}};var deb=null;
function goTab(name){S.tab=name;if(els.tabs){Array.prototype.forEach.call(els.tabs.children,function(b){var on=b.getAttribute('data-t')===name;b.className=on?'on':'';b.setAttribute('aria-selected',on?'true':'false');});}paintTab(name);}
function paintTab(name){if(!alive||name!==S.tab||!els.panel)return;
if(!D.data){els.panel.replaceChildren(S.fatal?errBox(S.fatal,function(){load(true);}):loadBox());return;}
var c=el('div',{role:'tabpanel'});try{RENDER[name](c);}catch(e){c=errBox(e.message,function(){render();});if(window.console)console.error('[AP dashboard]',e);}
els.panel.replaceChildren(c);}
function resetPages(){S.pi.page=0;S.pe.page=0;Object.keys(S.ts).forEach(function(k){if(S.ts[k])S.ts[k].page=0;});}
function render(){if(!alive)return;S.ver++;header();paintTab(S.tab);}
function header(){if(!els.asof)return;els.asof.textContent=t('asofL')+' '+(D.data?D.data.asof:asOf())+(S.updated?' | '+t('updated')+' '+S.updated.toLocaleTimeString('en-GB'):'');}
function banners(){if(!els.ban)return;var b=[];
if(S.loading)b.push(el('div',{class:'banner info',role:'status'},[el('span',{class:'spin'}),t('loading')+(S.progN?' '+S.prog+'/'+S.progN:'')]));
S.errs.forEach(function(m){b.push(el('div',{class:'banner err',role:'alert'},[t('note_fail')+' '+m]));});
if(S.f.to>TODAY)b.push(el('div',{class:'banner warn',text:t('note_cap')}));
if(S.badRange)b.push(el('div',{class:'banner warn',text:t('note_badrange')}));
if(D.supFail)b.push(el('div',{class:'banner warn',text:t('note_sup')}));
if(D.locMissing&&!D.supFail)b.push(el('div',{class:'banner warn',text:t('note_loc')}));
if(D.companies&&mixedCur())b.push(el('div',{class:'banner warn',text:t('note_cur')}));
els.ban.replaceChildren.apply(els.ban,b);}
function fillLists(){var c=els.c;if(!c.company)return;var cv=S.f.company;c.company.replaceChildren(el('option',{value:'',text:t('f_all_co')}));(D.companies||[]).forEach(function(x){c.company.appendChild(el('option',{value:x.name,text:x.name}));});c.company.value=cv;
c.group.replaceChildren(el('option',{value:'',text:t('f_all_grp')}));(D.groups||[]).forEach(function(g){c.group.appendChild(el('option',{value:g,text:g}));});c.group.value=S.f.group;
c.dl.replaceChildren();var seen={};((D.data&&D.data.list)||[]).forEach(function(r){if(!seen[r.name]){seen[r.name]=1;c.dl.appendChild(el('option',{value:r.name}));}});}
function syncControls(){var c=els.c,f=S.f;if(!c.company)return;c.company.value=f.company;c.preset.value=f.preset;c.from.value=f.from;c.to.value=f.to;c.supplier.value=f.supplier;c.group.value=f.group;c.loc.value=f.loc;c.search.value=f.search;}
function onFilter(reload){resetPages();if(reload)load();else{render();}}
function buildFilters(){var c=els.c,f=S.f;
c.company=el('select',{'aria-label':t('f_company'),onchange:function(){f.company=c.company.value;onFilter(false);}});
c.preset=selectEl([['today',t('p_today')],['week',t('p_week')],['month',t('p_month')],['quarter',t('p_quarter')],['year',t('p_year')],['custom',t('p_custom')]],f.preset,function(v){f.preset=v;var r=presetRange(v);if(r){f.from=r[0];f.to=r[1];S.badRange=false;syncControls();onFilter(true);}});
var dchg=function(){var nf=c.from.value||f.from,nt=c.to.value||f.to;if(nf>nt){S.badRange=true;c.from.value=f.from;c.to.value=f.to;banners();return;}S.badRange=false;f.from=nf;f.to=nt;f.preset='custom';c.preset.value='custom';onFilter(true);};
c.from=el('input',{type:'date',value:f.from,'aria-label':t('f_from'),onchange:dchg});c.to=el('input',{type:'date',value:f.to,'aria-label':t('f_to'),onchange:dchg});
c.dl=el('datalist',{id:'dm-ap-sups'});
c.supplier=el('input',{type:'text',list:'dm-ap-sups',placeholder:t('f_supplier_ph'),value:f.supplier,'aria-label':t('f_supplier'),onchange:function(){f.supplier=c.supplier.value.trim();onFilter(false);}});
c.group=el('select',{'aria-label':t('f_group'),onchange:function(){f.group=c.group.value;onFilter(false);}});
c.loc=selectEl([['',t('f_all')],['local',t('loc_local')],['foreign',t('loc_foreign')],['unc',t('loc_unc')]],f.loc,function(v){f.loc=v;onFilter(false);});if(D.locMissing)c.loc.disabled=true;
c.search=el('input',{type:'search',placeholder:t('f_search_ph'),value:f.search,'aria-label':t('f_search'),oninput:function(){clearTimeout(deb);deb=setTimeout(function(){f.search=c.search.value.trim();onFilter(false);},250);}});
var box=el('div',{class:'filters',role:'search'},[fld(t('f_company'),c.company),fld(t('f_date'),c.preset),fld(t('f_from'),c.from),fld(t('f_to'),c.to),fld(t('f_supplier'),el('div',null,[c.supplier,c.dl])),fld(t('f_group'),c.group),fld(t('f_loc'),c.loc),fld(t('f_search'),c.search),
el('div',{class:'fbtns'},[el('button',{class:'btn pri',type:'button',onclick:function(){load(true);},text:t('refresh')}),el('button',{class:'btn',type:'button',onclick:function(){S.f=defFilters();S.pi.status='';S.pi.dfrom='';S.pi.dto='';S.pi.period='';S.pi.sort='post';S.pe.status='sub';S.exFilter={type:'',sev:''};S.badRange=false;f=S.f;syncControls();onFilter(true);},text:t('reset')})])]);
return box;}
function build(){host.replaceChildren();els={c:{}};ap=el('div',{class:'ap',dir:lang==='ar'?'rtl':'ltr',lang:lang});host.appendChild(ap);ovStack=[];
els.asof=el('div',{class:'sub'});
var lg=el('div',{class:'lang',role:'group','aria-label':'Language'},[el('button',{type:'button',class:lang==='en'?'on':'',onclick:function(){setLang('en');},text:'English'}),el('button',{type:'button',class:lang==='ar'?'on':'',onclick:function(){setLang('ar');},text:'العربية'})]);
ap.appendChild(el('div',{class:'hdr'},[el('div',null,[el('h1',{text:t('title')}),el('div',{class:'sub',text:t('subtitle')}),els.asof]),lg]));
ap.appendChild(buildFilters());
els.ban=el('div');ap.appendChild(els.ban);
els.tabs=el('div',{class:'tabs',role:'tablist'},TABS.map(function(k){return el('button',{type:'button',role:'tab','data-t':k,class:S.tab===k?'on':'','aria-selected':S.tab===k?'true':'false',onclick:function(){goTab(k);},text:t('t_'+k)});}));
ap.appendChild(els.tabs);els.panel=el('div');ap.appendChild(els.panel);
els.foot=el('div',{class:'foot',text:t('foot_src')});ap.appendChild(els.foot);
fillLists();banners();header();paintTab(S.tab);}
function setLang(l){lang=l;try{window.localStorage.setItem('dm_ap_lang',l);}catch(e){}build();}
function loadSums(tok,asof){var d=D.data;d.sumPending=true;d.sumErr=[];
Promise.all(d.cos.map(function(co){return loadSummary(co,asof).then(function(s){d.sums[co]=s;},function(e){d.sumErr.push(co+': '+e.message);});})).then(function(){if(tok!==S.tok||d!==D.data)return;d.sumPending=false;if(S.tab==='overview'||S.tab==='exceptions')paintTab(S.tab);});}
function load(force){var tok=++S.tok;if(force){D.cache={};D.ap={};D.sum={};D.per={};D.sup=null;D.companies=null;D.groups=null;D.locMissing=false;D.supFail=false;}
S.loading=true;S.errs=[];S.prog=0;S.fatal=null;banners();var asof=asOf();var win=winStart(S.f.from,asof>S.f.to?asof:S.f.to);
return Promise.all([loadCompanies(),loadSuppliers(),loadGroups()]).then(function(){if(tok!==S.tok)return;var cos=D.companies;S.progN=cos.length;
var perP=loadPeriod(win,asof).then(function(v){return {v:v};},function(e){return {e:e.message};});
return Promise.all(cos.map(function(c){return loadAP(c.name,asof).then(function(r){S.prog++;if(tok===S.tok)banners();return r;},function(e){S.errs.push(c.name+': '+e.message);return null;});})).then(function(res){return perP.then(function(pr){if(tok!==S.tok)return;
var list=[],ok=[];res.forEach(function(r){if(r){list=list.concat(r.rows);ok.push(r.co);}});
D.data={asof:asof,list:list,per:pr.v||null,perErr:pr.e||null,sums:{},sumPending:false,sumErr:[],cos:ok};
S.loading=false;S.updated=new Date();S.pi.key='';S.pe.key='';S.pe.wfKey='';resetPages();fillLists();banners();render();loadSums(tok,asof);});});
},function(e){if(tok!==S.tok)return;S.loading=false;S.fatal=e.message;banners();paintTab(S.tab);});}
gon(document,'keydown',function(e){if(e.key==='Escape'&&ovStack.length){ovStack[ovStack.length-1]();}});
build();load();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
