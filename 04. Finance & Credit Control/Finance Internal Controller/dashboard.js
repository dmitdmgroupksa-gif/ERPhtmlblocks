(function () {
'use strict';
var R = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
if (R.__fcInit) { return; }
R.__fcInit = true;
var q = function (s, e) { return (e || R).querySelector(s); };
var qa = function (s, e) { return Array.prototype.slice.call((e || R).querySelectorAll(s)); };

var SCAN_CAP = 2000, BACKDATE_DAYS = 7, PAGE = 15, ATTACH_SAMPLE = 300;
var CUR = (frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.currency) || 'SAR';

/* ---------- i18n ---------- */
var I18N = {
en: {
title:'Finance – Internal Controller Dashboard', subtitle:'DM Group KSA', refresh:'Refresh', company:'Company', period:'Period',
from:'From Date', to:'To Date', doctype:'Document Type', wfstate:'Workflow Status', apstatus:'Approval Status', search:'Search',
search_ph:'Document no., party, reference…', reset:'Reset', all:'All', any:'Any', all_companies:'All Companies',
p_today:'Today', p_week:'This Week', p_month:'This Month', p_year:'This Year', p_all:'All Time', p_custom:'Custom',
s_pending:'Pending', s_approved:'Approved', s_rejected:'Rejected', s_returned:'Returned',
t_overview:'Overview', t_approvals:'Approvals & Workflow', t_payments:'Payment Control', t_journals:'Journal Entry Control',
t_ap:'Accounts Payable', t_ar:'Accounts Receivable', t_expenses:'Expense Claims', t_bank:'Bank & Reconciliation', t_audit:'Audit & Internal Controls',
ch_status:'Approval Status Distribution', ch_trend:'Monthly Payment Trend', ch_pendtype:'Pending Documents by Type',
ch_apprej:'Approved vs Rejected Transactions', ch_payrec:'Outstanding Payables vs Receivables', attention:'Needs Immediate Attention',
wf_summary:'Workflow Summary (by document type and state)', pendingdur:'Pending Duration',
age_hint:'Pending days = today − posting date (ERPNext keeps no transition timestamp on the document; see the approval trail in details).',
ch_paytype:'Payments by Type', ch_paymode:'Payments by Mode of Payment', ch_paystate:'Payments by Approval State',
ch_jestate:'Journal Entries by Workflow State', ch_jetype:'Journal Entries by Voucher Type',
bal_note:'Balances are live as of today (outstanding converted to company currency at each invoice\'s exchange rate).',
bal_note_ar:'Balances are live as of today. Cancelled documents are excluded.', apply_range:'Apply the date range to invoice posting date',
ch_apage:'Payables Ageing (days past due)', ch_topsup:'Top Suppliers by Outstanding', ch_arage:'Receivables Ageing (days past due)',
ch_topcust:'Top Overdue Customers', v_invoices:'Invoices', v_suppliers:'Suppliers', v_customers:'Customers',
ch_ecstatus:'Claims by Approval Status', ch_ecpay:'Claims by Payment Status', ch_ecemp:'Top Employees by Claimed Amount',
ch_bankstatus:'Bank Transactions by Status', ch_bankacc:'Unreconciled Amount by Bank Account', bank_wise:'Bank-wise Summary', bank_tx:'Bank Transactions',
ex_type:'Exception Type', ex_sev:'Severity', sev_high:'High', sev_medium:'Medium', sev_low:'Low', ex_register:'Exception Register',
audit_legend:'Confirmed = proven by the stated server-side check on all matching records. Indicative = derived from a capped scan or a proxy field and must be verified in the record\'s approval trail.',
open_erp:'Open in ERP', back:'Back', close:'Close', loading:'Loading…', empty:'No records match the current filters.', na:'N/A',
err_load:'Could not load this data', prev:'Previous', next:'Next', page:'Page', of:'of', records:'records', view:'View',
/* kpis */
k_pending_total:'Total Pending Approvals', k_pay_pending:'Payments Pending Review', k_je_pending:'Journal Entries Pending Review',
k_pi_pending:'Purchase Invoices Pending Review', k_ec_pending:'Expense Claims Pending Approval', k_approved:'Total Approved Transactions',
k_rejected:'Total Rejected Transactions', k_overdue_pi:'Overdue Supplier Invoices', k_ar_out:'Outstanding Receivables', k_ap_out:'Outstanding Payables',
k_attention:'Transactions Requiring Attention', k_exceptions:'Financial Control Exceptions',
k_aged7:'Pending > 7 Days', k_returned:'Returned for Amendment',
k_pe_total:'Total Payment Entries', k_pe_pending:'Pending Payment Entries', k_pe_approved:'Approved Payments', k_pe_rejected:'Rejected Payments',
k_pe_sup:'Supplier Payments', k_pe_cust:'Customer Receipts', k_pe_unalloc:'Unallocated Payments', k_pe_exc:'Payment Exceptions',
k_je_total:'Total Journal Entries', k_je_pend:'Pending Journal Entries', k_je_appr:'Approved Journal Entries', k_je_rej:'Rejected Journal Entries',
k_je_canc:'Cancelled Entries', k_je_back:'Backdated Entries', k_je_rev:'Reversal Entries', k_je_unbal:'Unbalanced Entries',
k_ap_total:'Total Outstanding Payables', k_ap_overdue:'Overdue Payables', k_ap_unpaid:'Unpaid Invoices', k_ap_7:'Due Within 7 Days',
k_ap_30:'Due Within 30 Days', k_ap_cn:'Supplier Credit Notes', k_ap_review:'Invoices Pending Review',
k_ar_total:'Total Outstanding Receivables', k_ar_overdue:'Overdue Receivables', k_ar_credit:'Customer Credit Balances',
k_ar_count:'Outstanding Invoices', k_ar_unalloc:'Unallocated Customer Receipts',
k_ec_total:'Total Claims', k_ec_pend:'Pending Claims', k_ec_appr:'Approved Claims', k_ec_rej:'Rejected Claims', k_ec_unpaid:'Unpaid Approved Claims',
k_ec_claimed:'Total Claimed Amount', k_ec_sanct:'Total Sanctioned Amount', k_ec_reimb:'Total Reimbursed Amount',
k_bk_bal:'Bank Account Balances', k_bk_unrec:'Unreconciled Transactions', k_bk_rec:'Reconciled Transactions', k_bk_dep:'Outstanding Deposits',
k_bk_wd:'Outstanding Withdrawals', k_bk_unm:'Unmatched Bank Transactions',
k_ex_types:'Exception Types Triggered', k_ex_high:'High-Severity Records', k_ex_conf:'Confirmed Records', k_ex_ind:'Indicative Records',
/* columns */
c_doc:'Document No.', c_type:'Document Type', c_company:'Company', c_date:'Posting Date', c_by:'Requested By', c_amount:'Amount',
c_state:'Workflow State', c_role:'Current Approver / Role', c_days:'Pending Days', c_act:'Actions', c_ptype:'Payment Type', c_party:'Party Name',
c_paid:'Paid Amount', c_recv:'Received Amount', c_mode:'Payment Mode', c_ref:'Reference No.', c_status:'Status', c_vtype:'Voucher Type',
c_debit:'Total Debit', c_credit:'Total Credit', c_diff:'Difference', c_created:'Created By', c_flags:'Flags', c_supplier:'Supplier',
c_customer:'Customer', c_bill:'Supplier Inv. No.', c_due:'Due Date', c_cur:'Currency', c_inv:'Invoice Amount', c_out:'Outstanding',
c_outbase:'Outstanding (' + CUR + ')', c_overdue:'Days Overdue', c_count:'Invoices', c_employee:'Employee', c_claimed:'Claimed',
c_sanct:'Sanctioned', c_reimb:'Reimbursed', c_appr:'Approval Status', c_paystatus:'Payment Status', c_bank:'Bank Account', c_deposit:'Deposit',
c_withdraw:'Withdrawal', c_unalloc:'Unallocated', c_balance:'Balance', c_ntx:'Transactions', c_sev:'Severity', c_conf:'Confidence', c_exc:'Exception',
c_cnt:'Count', c_basis:'Check performed', c_workflow_active:'Workflow', c_docstatus:'Doc Status', c_n:'Count', c_posted:'Posted without approval',
/* misc */
conf_confirmed:'Confirmed', conf_indicative:'Indicative', wf_active:'Active', wf_inactive:'Inactive', wf_none:'No workflow',
d_draft:'Draft', d_submitted:'Submitted', d_cancelled:'Cancelled', scanned:'scanned {a} of {b}', trail:'Approval Trail', attachments:'Attachments',
none:'None', lines:'Accounts', refs:'References', expenses:'Expenses', verify_same:'Created and approved by the same user (confirmed from approval trail)',
verify_diff:'Approver differs from creator', no_trail:'No workflow changes recorded', flag_unbal:'Unbalanced', flag_hdr:'Header ≠ lines', flag_back:'Backdated',
flag_unappr:'Posted unapproved', flag_canc:'Cancelled', scope_default:'Company and date filters apply to every tab.',
scope_appr:'All filters apply to this tab (company, dates, document type, workflow status, approval status, search, pending duration).',
scope_tbl:'Company, dates, workflow status, approval status and search apply to the table; KPIs and charts follow company and dates.',
scope_bal:'Company applies to balances; dates apply only if the checkbox is ticked.', scope_bank:'Company and dates (transaction date) apply.',
scope_audit:'Company and dates apply; exception type and severity filter the register.',
no_wf:'Not available', bank_note_norec:'The “Bank Reconciliation” DocType does not exist in this ERP; reconciliation is read from Bank Transaction status. Balances come from the General Ledger and are shown as N/A when they cannot be read.',
open_report:'Open Bank Reconciliation Statement report', emp_claims:'Claims of {x}', grp_oldest:'Oldest pending approvals', grp_overdue:'Largest overdue supplier invoices', grp_exc:'Detected control exceptions',
dup_group:'Duplicate group', view_all:'View all', def_attn:'Pending approvals older than 7 days + returned documents + expense claims on hold',
def_exc:'Confirmed core checks: unbalanced journals, records posted without approval, unallocated payments, duplicate payment references, duplicate supplier invoice numbers.'
},
ar: {
title:'المالية – لوحة المراقب الداخلي', subtitle:'مجموعة دي إم – السعودية', refresh:'تحديث', company:'الشركة', period:'الفترة',
from:'من تاريخ', to:'إلى تاريخ', doctype:'نوع المستند', wfstate:'حالة سير العمل', apstatus:'حالة الاعتماد', search:'بحث',
search_ph:'رقم المستند، الطرف، المرجع…', reset:'إعادة ضبط', all:'الكل', any:'أي', all_companies:'جميع الشركات',
p_today:'اليوم', p_week:'هذا الأسبوع', p_month:'هذا الشهر', p_year:'هذه السنة', p_all:'كل الفترات', p_custom:'مخصص',
s_pending:'قيد الانتظار', s_approved:'معتمد', s_rejected:'مرفوض', s_returned:'مُعاد',
t_overview:'نظرة عامة', t_approvals:'الاعتمادات وسير العمل', t_payments:'رقابة المدفوعات', t_journals:'رقابة قيود اليومية',
t_ap:'الحسابات الدائنة', t_ar:'الحسابات المدينة', t_expenses:'مطالبات المصروفات', t_bank:'البنوك والتسوية', t_audit:'التدقيق والرقابة الداخلية',
ch_status:'توزيع حالات الاعتماد', ch_trend:'اتجاه المدفوعات الشهري', ch_pendtype:'المستندات المعلقة حسب النوع',
ch_apprej:'المعاملات المعتمدة مقابل المرفوضة', ch_payrec:'الذمم الدائنة مقابل المدينة', attention:'يتطلب اهتمامًا فوريًا',
wf_summary:'ملخص سير العمل (حسب نوع المستند والحالة)', pendingdur:'مدة الانتظار',
age_hint:'أيام الانتظار = اليوم − تاريخ الترحيل (لا يحتفظ النظام بتاريخ الانتقال في المستند؛ راجع سجل الاعتماد في التفاصيل).',
ch_paytype:'المدفوعات حسب النوع', ch_paymode:'المدفوعات حسب طريقة الدفع', ch_paystate:'المدفوعات حسب حالة الاعتماد',
ch_jestate:'القيود حسب حالة سير العمل', ch_jetype:'القيود حسب نوع السند',
bal_note:'الأرصدة حية حتى اليوم (المستحق محوّل لعملة الشركة بسعر صرف كل فاتورة).',
bal_note_ar:'الأرصدة حية حتى اليوم. المستندات الملغاة مستبعدة.', apply_range:'تطبيق نطاق التاريخ على تاريخ ترحيل الفاتورة',
ch_apage:'أعمار الذمم الدائنة (أيام التأخير)', ch_topsup:'أكبر الموردين رصيدًا', ch_arage:'أعمار الذمم المدينة (أيام التأخير)',
ch_topcust:'أكبر العملاء المتأخرين', v_invoices:'الفواتير', v_suppliers:'الموردون', v_customers:'العملاء',
ch_ecstatus:'المطالبات حسب حالة الاعتماد', ch_ecpay:'المطالبات حسب حالة الدفع', ch_ecemp:'أعلى الموظفين مطالبةً',
ch_bankstatus:'المعاملات البنكية حسب الحالة', ch_bankacc:'المبلغ غير المسوّى حسب الحساب البنكي', bank_wise:'ملخص حسب البنك', bank_tx:'المعاملات البنكية',
ex_type:'نوع الاستثناء', ex_sev:'الخطورة', sev_high:'عالية', sev_medium:'متوسطة', sev_low:'منخفضة', ex_register:'سجل الاستثناءات',
audit_legend:'مؤكد = ثبت بالفحص المذكور على جميع السجلات المطابقة. إرشادي = ناتج عن فحص محدود أو حقل بديل ويجب التحقق منه في سجل اعتماد المستند.',
open_erp:'فتح في النظام', back:'رجوع', close:'إغلاق', loading:'جارٍ التحميل…', empty:'لا توجد سجلات مطابقة للمرشحات الحالية.', na:'غير متاح',
err_load:'تعذر تحميل هذه البيانات', prev:'السابق', next:'التالي', page:'صفحة', of:'من', records:'سجل', view:'عرض',
k_pending_total:'إجمالي الاعتمادات المعلقة', k_pay_pending:'مدفوعات بانتظار المراجعة', k_je_pending:'قيود يومية بانتظار المراجعة',
k_pi_pending:'فواتير شراء بانتظار المراجعة', k_ec_pending:'مطالبات مصروفات بانتظار الاعتماد', k_approved:'إجمالي المعاملات المعتمدة',
k_rejected:'إجمالي المعاملات المرفوضة', k_overdue_pi:'فواتير موردين متأخرة', k_ar_out:'الذمم المدينة المستحقة', k_ap_out:'الذمم الدائنة المستحقة',
k_attention:'معاملات تتطلب انتباهًا', k_exceptions:'استثناءات الرقابة المالية',
k_aged7:'معلق لأكثر من 7 أيام', k_returned:'مُعاد للتعديل',
k_pe_total:'إجمالي سندات الدفع', k_pe_pending:'سندات دفع معلقة', k_pe_approved:'مدفوعات معتمدة', k_pe_rejected:'مدفوعات مرفوضة',
k_pe_sup:'مدفوعات الموردين', k_pe_cust:'مقبوضات العملاء', k_pe_unalloc:'مدفوعات غير مخصصة', k_pe_exc:'استثناءات المدفوعات',
k_je_total:'إجمالي قيود اليومية', k_je_pend:'قيود معلقة', k_je_appr:'قيود معتمدة', k_je_rej:'قيود مرفوضة',
k_je_canc:'قيود ملغاة', k_je_back:'قيود بأثر رجعي', k_je_rev:'قيود عكسية', k_je_unbal:'قيود غير متوازنة',
k_ap_total:'إجمالي الذمم الدائنة', k_ap_overdue:'ذمم دائنة متأخرة', k_ap_unpaid:'فواتير غير مدفوعة', k_ap_7:'مستحقة خلال 7 أيام',
k_ap_30:'مستحقة خلال 30 يومًا', k_ap_cn:'إشعارات دائنة للموردين', k_ap_review:'فواتير بانتظار المراجعة',
k_ar_total:'إجمالي الذمم المدينة', k_ar_overdue:'ذمم مدينة متأخرة', k_ar_credit:'أرصدة العملاء الدائنة',
k_ar_count:'فواتير مستحقة', k_ar_unalloc:'مقبوضات عملاء غير مخصصة',
k_ec_total:'إجمالي المطالبات', k_ec_pend:'مطالبات معلقة', k_ec_appr:'مطالبات معتمدة', k_ec_rej:'مطالبات مرفوضة', k_ec_unpaid:'مطالبات معتمدة غير مدفوعة',
k_ec_claimed:'إجمالي المبلغ المطالب به', k_ec_sanct:'إجمالي المبلغ المعتمد', k_ec_reimb:'إجمالي المبلغ المسدد',
k_bk_bal:'أرصدة الحسابات البنكية', k_bk_unrec:'معاملات غير مسوّاة', k_bk_rec:'معاملات مسوّاة', k_bk_dep:'إيداعات معلقة',
k_bk_wd:'سحوبات معلقة', k_bk_unm:'معاملات بنكية غير مطابقة',
k_ex_types:'أنواع الاستثناءات المكتشفة', k_ex_high:'سجلات عالية الخطورة', k_ex_conf:'سجلات مؤكدة', k_ex_ind:'سجلات إرشادية',
c_doc:'رقم المستند', c_type:'نوع المستند', c_company:'الشركة', c_date:'تاريخ الترحيل', c_by:'مقدم الطلب', c_amount:'المبلغ',
c_state:'حالة سير العمل', c_role:'المعتمد / الدور الحالي', c_days:'أيام الانتظار', c_act:'إجراءات', c_ptype:'نوع الدفع', c_party:'اسم الطرف',
c_paid:'المبلغ المدفوع', c_recv:'المبلغ المستلم', c_mode:'طريقة الدفع', c_ref:'رقم المرجع', c_status:'الحالة', c_vtype:'نوع السند',
c_debit:'إجمالي المدين', c_credit:'إجمالي الدائن', c_diff:'الفرق', c_created:'أنشأه', c_flags:'تنبيهات', c_supplier:'المورد',
c_customer:'العميل', c_bill:'رقم فاتورة المورد', c_due:'تاريخ الاستحقاق', c_cur:'العملة', c_inv:'مبلغ الفاتورة', c_out:'المستحق',
c_outbase:'المستحق (' + CUR + ')', c_overdue:'أيام التأخير', c_count:'الفواتير', c_employee:'الموظف', c_claimed:'المطالَب به',
c_sanct:'المعتمد', c_reimb:'المسدد', c_appr:'حالة الاعتماد', c_paystatus:'حالة الدفع', c_bank:'الحساب البنكي', c_deposit:'إيداع',
c_withdraw:'سحب', c_unalloc:'غير مخصص', c_balance:'الرصيد', c_ntx:'المعاملات', c_sev:'الخطورة', c_conf:'الموثوقية', c_exc:'الاستثناء',
c_cnt:'العدد', c_basis:'الفحص المنفذ', c_workflow_active:'سير العمل', c_docstatus:'حالة المستند', c_n:'العدد', c_posted:'مرحّل دون اعتماد',
conf_confirmed:'مؤكد', conf_indicative:'إرشادي', wf_active:'فعّال', wf_inactive:'غير فعّال', wf_none:'بلا سير عمل',
d_draft:'مسودة', d_submitted:'مُرحّل', d_cancelled:'ملغى', scanned:'تم فحص {a} من {b}', trail:'سجل الاعتماد', attachments:'المرفقات',
none:'لا يوجد', lines:'الحسابات', refs:'المراجع', expenses:'المصروفات', verify_same:'أنشأه واعتمده المستخدم نفسه (مؤكد من سجل الاعتماد)',
verify_diff:'المعتمد يختلف عن المنشئ', no_trail:'لا توجد تغييرات سير عمل مسجلة', flag_unbal:'غير متوازن', flag_hdr:'الرأس ≠ البنود', flag_back:'بأثر رجعي',
flag_unappr:'مرحّل دون اعتماد', flag_canc:'ملغى', scope_default:'مرشحا الشركة والتاريخ يطبقان على كل التبويبات.',
scope_appr:'جميع المرشحات تطبق على هذا التبويب (الشركة، التواريخ، نوع المستند، حالة سير العمل، حالة الاعتماد، البحث، مدة الانتظار).',
scope_tbl:'الشركة والتواريخ وحالة سير العمل وحالة الاعتماد والبحث تطبق على الجدول؛ المؤشرات والرسوم تتبع الشركة والتواريخ.',
scope_bal:'الشركة تطبق على الأرصدة؛ التواريخ تطبق فقط عند تفعيل الخيار.', scope_bank:'الشركة والتواريخ (تاريخ المعاملة) تطبق.',
scope_audit:'الشركة والتواريخ تطبق؛ نوع الاستثناء والخطورة يصفّيان السجل.',
no_wf:'غير متاح', bank_note_norec:'نوع المستند «تسوية بنكية» غير موجود في هذا النظام؛ تُقرأ التسوية من حالة المعاملة البنكية. الأرصدة من دفتر الأستاذ وتظهر «غير متاح» إن تعذرت قراءتها.',
open_report:'فتح تقرير كشف التسوية البنكية', emp_claims:'مطالبات {x}', grp_oldest:'أقدم الاعتمادات المعلقة', grp_overdue:'أكبر فواتير الموردين المتأخرة', grp_exc:'استثناءات الرقابة المكتشفة',
dup_group:'مجموعة مكررة', view_all:'عرض الكل', def_attn:'اعتمادات معلقة لأكثر من 7 أيام + مستندات مُعادة + مطالبات معلقة (Hold)',
def_exc:'فحوص أساسية مؤكدة: قيود غير متوازنة، سجلات مرحّلة دون اعتماد، مدفوعات غير مخصصة، مراجع دفع مكررة، أرقام فواتير موردين مكررة.'
}};
var STATE_AR = {'Pending':'قيد الانتظار','Pending Approval':'بانتظار الاعتماد','Pending Review':'بانتظار المراجعة','Approved':'معتمد','Rejected':'مرفوض',
 'Finally Rejected':'مرفوض نهائيًا','Review':'قيد المراجعة','submitted':'مُقدَّم','Submitted After Review':'مُقدَّم بعد المراجعة','Hold':'معلق','Paid':'مدفوع',
 'Pending Payment':'بانتظار الدفع','Submitted':'مُرحّل','Unpaid':'غير مدفوع','Draft':'مسودة','Cancelled':'ملغى','Overdue':'متأخر','Partly Paid':'مدفوع جزئيًا',
 'Return':'مرتجع','Credit Note Issued':'أُصدر إشعار دائن','Debit Note Issued':'أُصدر إشعار مدين','Unreconciled':'غير مسوّى','Reconciled':'مسوّى','Settled':'مسوّى',
 'Receive':'قبض','Pay':'دفع','Internal Transfer':'تحويل داخلي','Under Primary Ammendment':'تحت التعديل الأولي','Accounting Review And Payment':'مراجعة محاسبية ودفع'};
var DT_LABEL = {en:{'Payment Entry':'Payment Entry','Journal Entry':'Journal Entry','Expense Claim':'Expense Claim','Purchase Invoice':'Purchase Invoice','Sales Invoice':'Sales Invoice','Bank Transaction':'Bank Transaction'},
 ar:{'Payment Entry':'سند دفع','Journal Entry':'قيد يومية','Expense Claim':'مطالبة مصروفات','Purchase Invoice':'فاتورة شراء','Sales Invoice':'فاتورة مبيعات','Bank Transaction':'معاملة بنكية'}};
 /* ---------- state ---------- */
var S = { lang:'en', tab:'overview', company:'', preset:'year', from:'', to:'', doctype:'', wf:'', ap:'', search:'', age:0,
  apRange:false, arRange:false, apView:'inv', arView:'inv', exType:'', exSev:'', ver:0, loaded:{} };
var CACHE = {}, TABLES = {}, SEQ = 0, WFDEF = null, DRILL = [];
try { var sv = JSON.parse(localStorage.getItem('fc_state_v1') || '{}'); if (sv.lang) S.lang = sv.lang; if (sv.tab) S.tab = sv.tab; } catch (e) {}
function saveState() { try { localStorage.setItem('fc_state_v1', JSON.stringify({ lang:S.lang, tab:S.tab })); } catch (e) {} }

function t(k, o) { var s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k; if (o) for (var x in o) s = s.replace('{' + x + '}', o[x]); return s; }
function tState(s) { if (s == null || s === '') return '—'; return S.lang === 'ar' && STATE_AR[s] ? STATE_AR[s] : s; }
function dtl(dt) { return (DT_LABEL[S.lang] && DT_LABEL[S.lang][dt]) || dt; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function today() { return (frappe.datetime && frappe.datetime.get_today) ? frappe.datetime.get_today() : new Date().toISOString().slice(0, 10); }
function addDays(d, n) { return frappe.datetime.add_days(d, n); }
function dayDiff(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
var NF0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
var NF2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function n0(v) { return NF0.format(v || 0); }
function n2(v) { return NF2.format(v || 0); }
function slug(dt) { return dt.toLowerCase().replace(/ /g, '-'); }
function docUrl(dt, name) { return '/app/' + slug(dt) + '/' + encodeURIComponent(name); }
function userName(u) { try { var i = frappe.user_info(u); return (i && i.fullname) || u || '—'; } catch (e) { return u || '—'; } }
function sum(a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); }
function docLbl(ds) { return ds === 0 ? t('d_draft') : ds === 1 ? t('d_submitted') : t('d_cancelled'); }

/* ---------- API (cached, de-duplicated, concurrency limited) ---------- */
var active = 0, waitQ = [];
function slot(fn) { return new Promise(function (res, rej) { var run = function () { active++; fn().then(function (v) { active--; next(); res(v); }, function (e) { active--; next(); rej(e); }); }; if (active < 5) run(); else waitQ.push(run); }); }
function next() { var r = waitQ.shift(); if (r) r(); }
function errOf(x) {
  try { var m = x && x.responseJSON && x.responseJSON._server_messages; if (m) { var a = JSON.parse(m); return JSON.parse(a[0]).message.replace(/<[^>]+>/g, ''); } } catch (e) {}
  if (x && x.status === 403) return 'Not permitted (403)'; if (x && x.status) return 'HTTP ' + x.status; return (x && x.message) || 'Error';
}
function call(method, args) {
  var key = method + '|' + JSON.stringify(args);
  if (CACHE[key]) return CACHE[key];
  var p = slot(function () { return new Promise(function (res, rej) {
    frappe.call({ method: method, args: args, type: 'POST', freeze: false, no_spinner: true, silent: true,
      callback: function (r) { res(r); }, error: function (x) { rej(new Error(errOf(x))); } }); }); });
  CACHE[key] = p; p.catch(function () { delete CACHE[key]; });
  return p;
}
var COMPANY_CURRENCIES = {}, currencyReady;
function currencyMetadata(){
 if(!currencyReady) currencyReady=call('frappe.client.get_list',{doctype:'Company',fields:['name','default_currency'],limit_page_length:0}).then(function(r){(r.message||[]).forEach(function(c){COMPANY_CURRENCIES[c.name]=c.default_currency;});}).catch(function(e){currencyReady=null;throw e;});
 return currencyReady;
}
function baseBalance(r){
 var co=COMPANY_CURRENCIES[r.company],party=r.party_account_currency,amount=Number(r.o==null?r.outstanding_amount:r.o)||0;
 if(!co || co!==CUR)throw new Error('Select a company whose base currency is '+CUR);
 if(party===co)return amount;
 if(party!==r.currency || !(Number(r.conversion_rate)>0))throw new Error('Unsupported party account currency conversion');
 return amount*Number(r.conversion_rate);
}
function gl(dt, o) {
  var a = { doctype: dt, fields: o.fields, filters: o.filters || [], order_by: o.order || '', limit_start: o.start || 0, limit_page_length: o.limit == null ? 20 : o.limit };
  if (o.or && o.or.length) a.or_filters = o.or; if (o.group) a.group_by = o.group; if (o.parent) a.parent = o.parent;
  return currencyMetadata().then(function(){return call('frappe.client.get_list', a);}).then(function (r) { return r.message || []; });
}
function cnt(dt, filters, or) { return gl(dt, { fields: ['count(name) as n'], filters: filters, or: or, limit: 1 }).then(function (r) { return (r[0] && r[0].n) || 0; }); }
function sumOf(dt, field, filters) { return gl(dt, { fields: ['sum(' + field + ') as s', 'count(name) as n'], filters: filters, limit: 1 }).then(function (r) { return { s: (r[0] && r[0].s) || 0, n: (r[0] && r[0].n) || 0 }; }); }
function setErr(msg) { var e = q('#fc-global-err'); if (!msg) { e.hidden = true; return; } e.hidden = false; e.textContent = t('err_load') + ': ' + msg; }

/* ---------- filters ---------- */
var DF = { 'Bank Transaction':'date', 'Payment Request':'transaction_date' };
function dfield(dt) { return DF[dt] || 'posting_date'; }
var HASWF = { 'Payment Entry':1, 'Journal Entry':1, 'Expense Claim':1 };
function base(dt, o) {
  o = o || {}; var f = [];
  if (S.company) f.push(['company', '=', S.company]);
  if (!o.noDate) { if (S.from) f.push([dfield(dt), '>=', S.from]); if (S.to) f.push([dfield(dt), '<=', S.to]); }
  return f;
}
var SEARCHF = { 'Payment Entry':['name','party_name','party','reference_no'], 'Journal Entry':['name','user_remark','cheque_no','bill_no'],
  'Expense Claim':['name','employee','employee_name'], 'Purchase Invoice':['name','supplier','supplier_name','bill_no'],
  'Sales Invoice':['name','customer','customer_name'], 'Bank Transaction':['name','reference_number','bank_account'] };
function orSearch(dt) { if (!S.search) return null; return (SEARCHF[dt] || ['name']).map(function (f) { return [f, 'like', '%' + S.search + '%']; }); }

var WF_PEND = { 'Payment Entry':['Pending','submitted'], 'Journal Entry':['Pending','submitted','Submitted After Review'], 'Expense Claim':['Pending','Pending Approval','Pending Review'] };
var WF_RET = { 'Payment Entry':['Review'], 'Journal Entry':['Review'], 'Expense Claim':['Under Primary Ammendment'] };
var WF_REJ = { 'Payment Entry':['Finally Rejected','Rejected'], 'Journal Entry':['Finally Rejected','Rejected'], 'Expense Claim':['Rejected','Finally Rejected'] };
function stat(dt, k) {
  if (dt === 'Purchase Invoice') return k === 'pending' ? [['docstatus', '=', 0]] : null;
  if (!HASWF[dt]) return null;
  if (k === 'pending') return [['workflow_state', 'in', WF_PEND[dt]], ['docstatus', '!=', 2]];
  if (k === 'returned') return [['workflow_state', 'in', WF_RET[dt]], ['docstatus', '!=', 2]];
  if (k === 'rejected') return [['workflow_state', 'in', WF_REJ[dt]]];
  if (k === 'approved') return dt === 'Expense Claim' ? [['approval_status', '=', 'Approved'], ['docstatus', '=', 1]] : [['workflow_state', '=', 'Approved'], ['docstatus', '=', 1]];
  return null;
}
function part(dt, k, extra, noDate) { var s = stat(dt, k); if (!s) return null; return { dt: dt, filters: base(dt, { noDate: noDate }).concat(s, extra || []) }; }
function parts(k, dts, extra) { return dts.map(function (d) { return part(d, k, extra); }).filter(Boolean); }
var CORE3 = ['Payment Entry', 'Journal Entry', 'Expense Claim'];
var PEND4 = ['Payment Entry', 'Journal Entry', 'Expense Claim', 'Purchase Invoice'];
/* user-selected workflow/approval filters for table tabs */
function userFilters(dt) {
  var f = []; if (HASWF[dt] && S.wf) f.push(['workflow_state', '=', S.wf]);
  if (S.ap) { var s = stat(dt, S.ap); if (s) f = f.concat(s); }
  return f;
}

/* ---------- field sets + normalisation ---------- */
var FIELDS = {
 'Payment Entry':['name','posting_date','company','payment_type','party_type','party_name','party','paid_amount','received_amount','mode_of_payment','reference_no','workflow_state','status','docstatus','owner','creation','modified_by','unallocated_amount'],
 'Journal Entry':['name','posting_date','company','voucher_type','total_debit','total_credit','difference','workflow_state','docstatus','owner','creation','modified_by','reversal_of'],
 'Expense Claim':['name','posting_date','company','employee','employee_name','total_claimed_amount','total_sanctioned_amount','total_amount_reimbursed','approval_status','status','workflow_state','docstatus','owner'],
 'Purchase Invoice':['name','posting_date','due_date','company','supplier','supplier_name','bill_no','currency','conversion_rate','grand_total','base_grand_total','outstanding_amount','party_account_currency','status','docstatus','owner','is_return'],
 'Sales Invoice':['name','posting_date','due_date','company','customer','customer_name','currency','conversion_rate','grand_total','base_grand_total','outstanding_amount','party_account_currency','status','docstatus','owner','is_return'],
 'Bank Transaction':['name','date','company','bank_account','deposit','withdrawal','unallocated_amount','status','reference_number','currency','docstatus']
};
function norm(dt, r) {
  var o = { dt: dt, name: r.name, company: r.company, date: r.posting_date || r.date, ds: r.docstatus, by: r.owner, raw: r };
  if (dt === 'Payment Entry') { o.party = r.party_name || r.party || '—'; o.amount = r.payment_type === 'Receive' ? r.received_amount : r.paid_amount; o.state = r.workflow_state; o.status = r.status; }
  else if (dt === 'Journal Entry') { o.party = r.voucher_type; o.amount = r.total_debit; o.state = r.workflow_state; o.status = docLbl(r.docstatus); }
  else if (dt === 'Expense Claim') { o.party = r.employee_name || r.employee; o.amount = r.total_claimed_amount; o.state = r.workflow_state || r.approval_status; o.status = r.status; }
  else if (dt === 'Purchase Invoice') { o.party = r.supplier_name || r.supplier; o.amount = r.base_grand_total; o.state = null; o.status = r.status; }
  else if (dt === 'Sales Invoice') { o.party = r.customer_name || r.customer; o.amount = r.base_grand_total; o.state = null; o.status = r.status; }
  else { o.party = r.bank_account; o.amount = (r.deposit || 0) || (r.withdrawal || 0); o.state = null; o.status = r.status; }
  return o;
}

/* merged server-side pagination across several document types */
function mergedLoader(pts, page, size) {
  return Promise.all(pts.map(function (p) { return cnt(p.dt, p.filters, p.or); })).then(function (cs) {
    var total = sum(cs), start = page * size, end = start + size, off = 0, jobs = [];
    pts.forEach(function (p, i) { var a = Math.max(start, off), b = Math.min(end, off + cs[i]); if (b > a) jobs.push({ p: p, start: a - off, limit: b - a }); off += cs[i]; });
    return Promise.all(jobs.map(function (j) {
      return gl(j.p.dt, { fields: FIELDS[j.p.dt], filters: j.p.filters, or: j.p.or, order: j.p.order || (dfield(j.p.dt) + ' ' + (j.p.asc ? 'asc' : 'desc') + ', creation desc'), start: j.start, limit: j.limit })
        .then(function (rows) { return rows.map(function (r) { return norm(j.p.dt, r); }); });
    })).then(function (arr) { return { rows: [].concat.apply([], arr), total: total }; });
  });
}
function staticLoader(list) { return function (page, size) { return Promise.resolve({ rows: list.slice(page * size, page * size + size), total: list.length }); }; }

/* workflow definitions (read from Workflow doctype) */
function loadWF() {
  if (WFDEF) return Promise.resolve(WFDEF);
  return gl('Workflow', { fields: ['name', 'document_type', 'is_active'], filters: [['document_type', 'in', CORE3]], limit: 50 }).then(function (ws) {
    return Promise.all(ws.map(function (w) { return call('frappe.client.get', { doctype: 'Workflow', name: w.name }).then(function (r) { return r.message; }).catch(function () { return null; }); }));
  }).then(function (docs) {
    var d = {};
    docs.forEach(function (w) { if (!w) return; var e = d[w.document_type] || (d[w.document_type] = { active: false, roles: {} });
      if (w.is_active) { e.active = true; (w.transitions || []).forEach(function (tr) { var a = e.roles[tr.state] || (e.roles[tr.state] = []); if (a.indexOf(tr.allowed) < 0) a.push(tr.allowed); }); } });
    WFDEF = d; return d;
  }).catch(function () { WFDEF = {}; return WFDEF; });
}
function roleOf(dt, state) { var e = WFDEF && WFDEF[dt]; if (!e || !e.active || !state) return '—'; var a = e.roles[state]; return a && a.length ? a.join(', ') : '—'; }
function isPendingState(dt, s) { return (WF_PEND[dt] || []).indexOf(s) >= 0 || (WF_RET[dt] || []).indexOf(s) >= 0; }
/* ---------- UI helpers ---------- */
function badgeCls(s) {
  s = String(s || '');
  if (/^(Approved|Paid|Submitted After|Reconciled|Settled|Submitted)$/i.test(s)) return 'b-ok';
  if (/Finally Rejected|^Rejected|Cancelled|Overdue/i.test(s)) return 'b-bad';
  if (/^Review$|Return|Ammend/i.test(s)) return 'b-ret';
  if (/Pending|submitted|Unpaid|Unreconciled|Hold|Partly|Draft/i.test(s)) return 'b-warn';
  return 'b-gray';
}
function badge(s) { if (s == null || s === '') return '—'; return '<span class="fc-badge ' + badgeCls(s) + '">' + esc(tState(s)) + '</span>'; }
function loadingHTML() { return '<div class="fc-load">' + esc(t('loading')) + '</div>'; }
function emptyHTML(m) { return '<div class="fc-empty">' + esc(m || t('empty')) + '</div>'; }
function errHTML(e) { return '<div class="fc-err">' + esc(t('err_load')) + ': ' + esc(e && e.message || e) + '</div>'; }
function idCell(r) { return '<td class="id">' + esc(r.name) + '</td>'; }

/* ---------- paged table ---------- */
function PT(host, cfg) {
  var el = typeof host === 'string' ? q(host) : host; var key = cfg.id || host;
  var prev = TABLES[key]; var st = { page: prev ? prev.page : 0, total: 0, rows: [], seq: 0 };
  var size = cfg.size || PAGE;
  var self = { page: st.page, load: load, draw: draw, el: el };
  TABLES[key] = self;
  function load(reset) {
    if (reset) st.page = 0; var my = ++st.seq; el.innerHTML = loadingHTML();
    var v = S.ver;
    cfg.loader(st.page, size).then(function (res) {
      if (my !== st.seq || (!cfg.noVer && v !== S.ver)) return; st.rows = res.rows; st.total = res.total;
      var maxp = Math.max(0, Math.ceil(st.total / size) - 1); if (st.page > maxp && st.total > 0) { st.page = maxp; return load(); }
      draw();
    }).catch(function (e) { if (my === st.seq) { el.innerHTML = errHTML(e); setErr(e.message); } });
  }
  function draw() {
    self.page = st.page;
    if (!st.rows.length) { el.innerHTML = emptyHTML(cfg.empty); return; }
    var h = '<div class="fc-tablewrap"><table><thead><tr>' + cfg.cols.map(function (c) { return '<th class="' + (c.num ? 'num' : '') + '">' + esc(t(c.l)) + '</th>'; }).join('') + '</tr></thead><tbody>';
    st.rows.forEach(function (r, i) {
      h += '<tr class="' + (cfg.onRow ? 'click ' : '') + (cfg.flag && cfg.flag(r) ? 'flag' : '') + '" data-i="' + i + '">' + cfg.cols.map(function (c) { return c.h(r); }).join('') + '</tr>';
    });
    h += '</tbody></table></div>';
    var pages = Math.max(1, Math.ceil(st.total / size));
    h += '<div class="fc-pager"><span>' + n0(st.total) + ' ' + esc(t('records')) + (cfg.extraInfo ? ' · ' + esc(cfg.extraInfo()) : '') + '</span><span><button type="button" data-p="-1"' + (st.page <= 0 ? ' disabled' : '') + '>' + esc(t('prev')) + '</button> ' +
      esc(t('page')) + ' ' + (st.page + 1) + ' ' + esc(t('of')) + ' ' + pages + ' <button type="button" data-p="1"' + (st.page >= pages - 1 ? ' disabled' : '') + '>' + esc(t('next')) + '</button></span></div>';
    el.innerHTML = h;
    qa('.fc-pager button', el).forEach(function (b) { b.onclick = function () { st.page += parseInt(b.getAttribute('data-p'), 10); load(); }; });
    qa('tbody tr', el).forEach(function (tr) {
      tr.onclick = function (ev) { var r = st.rows[parseInt(tr.getAttribute('data-i'), 10)];
        var a = ev.target.closest && ev.target.closest('[data-act]');
        if (a && cfg.onAct) { ev.stopPropagation(); cfg.onAct(a.getAttribute('data-act'), a.getAttribute('data-v'), r); return; }
        if (cfg.onRow) cfg.onRow(r); };
    });
  }
  load();
  return self;
}

/* standard column sets */
function td(v, cls) { return '<td class="' + (cls || '') + '">' + v + '</td>'; }
var COL = {
  doc: { l: 'c_doc', h: idCell },
  type: { l: 'c_type', h: function (r) { return td(esc(dtl(r.dt))); } },
  company: { l: 'c_company', h: function (r) { return td(esc(r.company || '—')); } },
  date: { l: 'c_date', h: function (r) { return td(esc(r.date || '—')); } },
  by: { l: 'c_by', h: function (r) { return td(esc(userName(r.by))); } },
  party: { l: 'c_party', h: function (r) { return td(esc(r.party || '—')); } },
  amount: { l: 'c_amount', num: 1, h: function (r) { return td(n2(r.amount), 'num'); } },
  state: { l: 'c_state', h: function (r) { return td(badge(r.state)); } },
  status: { l: 'c_status', h: function (r) { return td(badge(r.status)); } },
  role: { l: 'c_role', h: function (r) { return td(esc(roleOf(r.dt, r.state))); } },
  days: { l: 'c_days', num: 1, h: function (r) { var p = isPendingState(r.dt, r.state) || (r.dt === 'Purchase Invoice' && r.ds === 0); return td(p && r.date ? n0(Math.max(0, dayDiff(r.date, today()))) : '—', 'num'); } },
  view: { l: 'c_act', h: function (r) { return td('<button type="button" class="fc-link" data-act="view">' + esc(t('view')) + '</button>'); } }
};
var GEN_COLS = [COL.doc, COL.type, COL.company, COL.date, COL.by, COL.party, COL.amount, COL.state, COL.role, COL.status, COL.days, COL.view];
function genCfg(loader, id) { return { id: id, cols: GEN_COLS, loader: loader, onRow: function (r) { openDoc(r.dt, r.name); }, onAct: function (a, v, r) { openDoc(r.dt, r.name); } }; }

/* ---------- KPI tiles ---------- */
function kpis(boxId, defs) {
  var box = q(boxId); box.innerHTML = ''; var v = S.ver;
  defs.forEach(function (d) {
    var el = document.createElement('button'); el.type = 'button'; el.className = 'fc-kpi' + (d.drill ? '' : ' static') + (d.tone ? ' ' + d.tone : '');
    el.innerHTML = '<span class="l">' + esc(t(d.label)) + '</span><span class="v"><i class="sk"></i></span><span class="s"></span>';
    box.appendChild(el);
    if (d.drill) el.onclick = function () { openDrill(t(d.label), d.drill); };
    var vv = el.querySelector('.v'), ss = el.querySelector('.s');
    Promise.resolve().then(d.load).then(function (r) {
      if (v !== S.ver) return;
      if (r.v == null) { vv.innerHTML = '<span class="nd">' + esc(t('na')) + '</span>'; ss.textContent = r.sub || ''; return; }
      vv.textContent = r.money ? n0(r.v) : n0(r.v); ss.textContent = r.sub || (r.money ? CUR : '');
      if (r.tone) el.classList.add(r.tone); else if (d.toneIf && d.toneIf(r.v)) el.classList.add(d.toneIf(r.v));
    }).catch(function (e) { if (v !== S.ver) return; vv.innerHTML = '<span class="nd">—</span>'; ss.textContent = e.message; el.title = e.message; setErr(e.message); });
  });
}
function cnts(pts) { return Promise.all(pts.map(function (p) { return cnt(p.dt, p.filters, p.or); })).then(sum); }
function cdef(label, pts, tone) { return { label: label, tone: tone, load: function () { return cnts(pts).then(function (n) { return { v: n }; }); }, drill: { parts: pts }, toneIf: tone === 'auto' ? function (n) { return n > 0 ? 'warn' : 'ok'; } : null }; }

/* ---------- charts ---------- */
var PAL = ['#0b2447', '#2f6fb5', '#1b8a5a', '#d69e2e', '#c53030', '#805ad5', '#319795', '#718096'];
function chart(id, type, labels, datasets, opts) {
  var el = q(id); if (!el) return; opts = opts || {};
  var has = datasets.some(function (d) { return d.values.some(function (x) { return x; }); });
  if (!labels.length || !has) { el.innerHTML = emptyHTML(); return; }
  el.innerHTML = '';
  try {
    new frappe.Chart(el, { type: type, height: opts.height || 240, colors: opts.colors || PAL, data: { labels: labels, datasets: datasets },
      barOptions: { spaceRatio: 0.45 }, axisOptions: { xIsSeries: 0 }, truncateLegends: 1, isNavigable: 0,
      tooltipOptions: { formatTooltipY: function (d) { return n0(d); } } });
  } catch (e) { el.innerHTML = errHTML(e); }
}
function chartLoading(ids) { ids.forEach(function (id) { var e = q(id); if (e) e.innerHTML = loadingHTML(); }); }
function chartFail(ids, e) { ids.forEach(function (id) { var el = q(id); if (el) el.innerHTML = errHTML(e); }); setErr(e.message); }

/* ---------- drill-down drawer ---------- */
function openDrill(title, spec) { DRILL.push({ title: title, spec: spec }); renderDrill(); q('#fc-drawer').hidden = false; }
function renderDrill() {
  var d = DRILL[DRILL.length - 1]; if (!d) { q('#fc-drawer').hidden = true; return; }
  q('#dr-title').textContent = d.title;
  var body = q('#dr-body'); body.innerHTML = (DRILL.length > 1 ? '<button type="button" class="fc-btn fc-btn-light" id="dr-back">← ' + esc(t('back')) + '</button>' : '') + (d.spec.header || '') + '<div class="fc-card" style="margin-top:8px"><div id="dr-table"></div></div>';
  var b = q('#dr-back'); if (b) b.onclick = function () { DRILL.pop(); renderDrill(); };
  var spec = d.spec;
  var cfg = spec.cols ? { cols: spec.cols, loader: spec.loader, onRow: spec.onRow, onAct: spec.onAct, flag: spec.flag } :
    genCfg(function (p, s) { return mergedLoader(spec.parts.map(function (x) { return Object.assign({ asc: spec.asc }, x); }), p, s); });
  cfg.id = 'drill' + DRILL.length; cfg.noVer = true; delete TABLES[cfg.id];
  PT('#dr-table', cfg);
}
function closeDrill() { DRILL = []; q('#fc-drawer').hidden = true; }

/* ---------- record detail ---------- */
var DETAIL_KEYS = {
 'Payment Entry':['payment_type','posting_date','company','party_type','party','party_name','mode_of_payment','paid_from','paid_to','paid_amount','received_amount','base_paid_amount','unallocated_amount','reference_no','reference_date','cheque_no','workflow_state','status','owner','creation','modified_by','remarks'],
 'Journal Entry':['voucher_type','posting_date','company','total_debit','total_credit','difference','workflow_state','is_opening','reversal_of','cheque_no','owner','creation','modified_by','user_remark'],
 'Expense Claim':['employee','employee_name','company','posting_date','total_claimed_amount','total_sanctioned_amount','total_amount_reimbursed','approval_status','status','workflow_state','expense_approver','mode_of_payment','owner','creation','remark'],
 'Purchase Invoice':['supplier','supplier_name','company','posting_date','due_date','bill_no','bill_date','currency','conversion_rate','grand_total','base_grand_total','outstanding_amount','party_account_currency','status','is_return','owner','creation'],
 'Sales Invoice':['customer','customer_name','company','posting_date','due_date','currency','conversion_rate','grand_total','base_grand_total','outstanding_amount','party_account_currency','status','is_return','owner','creation'],
 'Bank Transaction':['date','company','bank_account','deposit','withdrawal','unallocated_amount','allocated_amount','status','reference_number','description','currency']
};
var CHILD = { 'Journal Entry':[['accounts','lines',['account','party','debit','credit']]], 'Payment Entry':[['references','refs',['reference_doctype','reference_name','total_amount','outstanding_amount','allocated_amount']]],
  'Expense Claim':[['expenses','expenses',['expense_date','expense_type','description','amount','sanctioned_amount']]] };
function openDoc(dt, name) {
  var m = q('#fc-modal'); m.hidden = false; q('#md-title').textContent = dtl(dt) + ' · ' + name; q('#md-open').href = docUrl(dt, name);
  var body = q('#md-body'); body.innerHTML = loadingHTML();
  var vq = ['Version', { fields: ['creation', 'owner', 'data'], filters: [['ref_doctype', '=', dt], ['docname', '=', name]], order: 'creation asc', limit: 100 }];
  Promise.all([call('frappe.client.get', { doctype: dt, name: name }).then(function (r) { return r.message; }),
    gl('Version', vq[1]).catch(function () { return null; }),
    gl('File', { fields: ['file_name', 'file_url', 'is_private'], filters: [['attached_to_doctype', '=', dt], ['attached_to_name', '=', name]], limit: 50 }).catch(function () { return null; })])
  .then(function (res) {
    var d = res[0], ver = res[1], files = res[2], h = '<div class="fc-kv">';
    (DETAIL_KEYS[dt] || Object.keys(d).slice(0, 30)).forEach(function (k) {
      var v = d[k]; if (v == null || v === '') return; if (typeof v === 'number') v = /rate|_rate/.test(k) ? String(v) : n2(v);
      if (k === 'owner' || k === 'modified_by') v = userName(v) + ' (' + v + ')'; if (k === 'workflow_state' || k === 'status') v = tState(v);
      h += '<div><b>' + esc(k) + '</b><span>' + esc(String(v).replace(/<[^>]+>/g, ' ').slice(0, 400)) + '</span></div>'; });
    h += '<div><b>docstatus</b><span>' + esc(docLbl(d.docstatus)) + '</span></div></div>';
    (CHILD[dt] || []).forEach(function (c) { var rows = d[c[0]] || []; if (!rows.length) return;
      var dr = 0, cr = 0;
      h += '<div class="fc-sec">' + esc(t(c[1])) + ' (' + rows.length + ')</div><div class="fc-tablewrap"><table><thead><tr>' + c[2].map(function (f) { return '<th>' + esc(f) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.slice(0, 60).map(function (r) { if (dt === 'Journal Entry') { dr += r.debit || 0; cr += r.credit || 0; } return '<tr>' + c[2].map(function (f) { var v = r[f]; return '<td class="' + (typeof v === 'number' ? 'num' : '') + '">' + (typeof v === 'number' ? n2(v) : esc(v || '')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      if (dt === 'Journal Entry') { var df = Math.round((dr - cr) * 100) / 100; h += '<div class="fc-note">Σ debit ' + n2(dr) + ' · Σ credit ' + n2(cr) + ' · ' + esc(t('c_diff')) + ' ' + n2(df) + '</div>'; } });
    h += '<div class="fc-sec">' + esc(t('attachments')) + '</div>' + (files && files.length ? '<ul>' + files.map(function (f) { return '<li><a href="' + esc(f.file_url) + '" target="_blank" rel="noopener">' + esc(f.file_name || f.file_url) + '</a></li>'; }).join('') + '</ul>' : '<div class="fc-note">' + esc(files ? t('none') : t('na')) + '</div>');
    var tr = [], approver = null;
    (ver || []).forEach(function (v) { try { var j = JSON.parse(v.data); (j.changed || []).forEach(function (c) { if (c[0] === 'workflow_state' || c[0] === 'approval_status') { tr.push({ at: v.creation, by: v.owner, f: c[0], a: c[1], b: c[2] }); if (c[2] === 'Approved') approver = v.owner; } }); } catch (e) {} });
    h += '<div class="fc-sec">' + esc(t('trail')) + '</div><ul class="fc-trail"><li>' + esc(d.creation) + ' — ' + esc(userName(d.owner)) + ' (created)</li>' +
      tr.map(function (x) { return '<li>' + esc(x.at) + ' — ' + esc(userName(x.by)) + ': ' + esc(tState(x.a)) + ' → ' + esc(tState(x.b)) + '</li>'; }).join('') + '</ul>';
    if (!tr.length) h += '<div class="fc-note">' + esc(t('no_trail')) + '</div>';
    if (approver) h += '<div class="fc-badge ' + (approver === d.owner ? 'b-bad' : 'b-ok') + '">' + esc(approver === d.owner ? t('verify_same') : t('verify_diff')) + '</div>';
    body.innerHTML = h;
  }).catch(function (e) { body.innerHTML = errHTML(e); });
}
function closeDoc() { q('#fc-modal').hidden = true; }
/* ---------- balances helpers (AP/AR) ---------- */
function balF(dt, apply) { var f = [['docstatus', '=', 1], ['outstanding_amount', '!=', 0]]; if (S.company) f.push(['company', '=', S.company]); if (apply) { if (S.from) f.push(['posting_date', '>=', S.from]); if (S.to) f.push(['posting_date', '<=', S.to]); } return f; }
function openF(dt, apply, extra) { return balF(dt, apply).concat([['is_return', '=', 0], ['outstanding_amount', '>', 0]], extra || []); }
function agg(dt, filters) {
  return gl(dt, { fields: ['company', 'party_account_currency', 'currency', 'conversion_rate', 'count(name) as n', 'sum(outstanding_amount) as o'], filters: filters, group: 'company,party_account_currency,currency,conversion_rate', limit: 0 })
    .then(function (rows) { var n = 0, b = 0; rows.forEach(function (r) { n += r.n; b += baseBalance(r); }); return { n: n, base: b }; });
}
function dueF(from, to) { return [['due_date', 'between', [from, to]]]; }

/* ---------- OVERVIEW ---------- */
function tabOverview() {
  var T = today();
  var pendP = parts('pending', PEND4), apprP = parts('approved', CORE3), rejP = parts('rejected', CORE3);
  var overdueF = openF('Purchase Invoice', false, [['due_date', '<', T]]);
  var attnP = parts('pending', CORE3, [['posting_date', '<=', addDays(T, -BACKDATE_DAYS)]]).map(function (p) { return Object.assign(p, { filters: p.filters.filter(function (f) { return f[0] !== 'posting_date' || f[1] !== '>='; }).concat([]) }); })
    .concat(parts('returned', ['Payment Entry', 'Journal Entry']), [{ dt: 'Expense Claim', filters: base('Expense Claim').concat([['workflow_state', '=', 'Hold'], ['docstatus', '!=', 2]]) }]);
  /* attention parts: remove duplicated date-lower-bound conflict by rebuilding precisely */
  attnP = CORE3.map(function (dt) { return { dt: dt, filters: base(dt, { noDate: true }).concat(stat(dt, 'pending'), [['posting_date', '<=', addDays(T, -BACKDATE_DAYS)]]) }; })
    .concat(['Payment Entry', 'Journal Entry'].map(function (dt) { return part(dt, 'returned'); }), [{ dt: 'Expense Claim', filters: base('Expense Claim').concat([['workflow_state', '=', 'Hold'], ['docstatus', '!=', 2]]) }]);
  var apF = openF('Purchase Invoice', false), arF = openF('Sales Invoice', false);
  var defs = [
    cdef('k_pending_total', pendP, 'auto'),
    cdef('k_pay_pending', parts('pending', ['Payment Entry']), 'auto'),
    cdef('k_je_pending', parts('pending', ['Journal Entry']), 'auto'),
    cdef('k_pi_pending', parts('pending', ['Purchase Invoice']), 'auto'),
    cdef('k_ec_pending', parts('pending', ['Expense Claim']), 'auto'),
    cdef('k_approved', apprP, 'ok'), cdef('k_rejected', rejP, 'bad'),
    { label: 'k_overdue_pi', tone: 'bad', load: function () { return cnt('Purchase Invoice', overdueF).then(function (n) { return { v: n }; }); }, drill: { parts: [{ dt: 'Purchase Invoice', filters: overdueF, asc: true, order: 'due_date asc' }] } },
    { label: 'k_ar_out', load: function () { return agg('Sales Invoice', arF).then(function (a) { return { v: a.base, money: 1, sub: CUR + ' · ' + n0(a.n) }; }); }, drill: { parts: [{ dt: 'Sales Invoice', filters: arF, order: 'due_date asc' }] } },
    { label: 'k_ap_out', load: function () { return agg('Purchase Invoice', apF).then(function (a) { return { v: a.base, money: 1, sub: CUR + ' · ' + n0(a.n) }; }); }, drill: { parts: [{ dt: 'Purchase Invoice', filters: apF, order: 'due_date asc' }] } },
    { label: 'k_attention', tone: 'warn', load: function () { return cnts(attnP).then(function (n) { return { v: n, sub: t('def_attn') }; }); }, drill: { parts: attnP, asc: true } },
    { label: 'k_exceptions', tone: 'bad', load: function () { return coreExceptionCount().then(function (n) { return { v: n, sub: t('def_exc') }; }); }, drill: excDrill() }
  ];
  kpis('#k-overview', defs);

  var ids = ['#c-ov-status', '#c-ov-trend', '#c-ov-pend', '#c-ov-apprej', '#c-ov-payrec']; chartLoading(ids);
  var v = S.ver;
  Promise.all(['pending', 'approved', 'rejected', 'returned'].map(function (k) { return cnts(parts(k, CORE3)); })).then(function (c) {
    if (v !== S.ver) return;
    chart('#c-ov-status', 'donut', [t('s_pending'), t('s_approved'), t('s_rejected'), t('s_returned')], [{ values: c }], { colors: ['#d69e2e', '#1b8a5a', '#c53030', '#c05621'] });
  }).catch(function (e) { chartFail(['#c-ov-status'], e); });
  Promise.all(PEND4.map(function (d) { return cnts(parts('pending', [d])); })).then(function (c) {
    if (v !== S.ver) return; chart('#c-ov-pend', 'bar', PEND4.map(dtl), [{ values: c }], { colors: ['#d69e2e'] });
  }).catch(function (e) { chartFail(['#c-ov-pend'], e); });
  Promise.all(CORE3.map(function (d) { return Promise.all([cnts(parts('approved', [d])), cnts(parts('rejected', [d]))]); })).then(function (c) {
    if (v !== S.ver) return;
    chart('#c-ov-apprej', 'bar', CORE3.map(dtl), [{ name: t('s_approved'), values: c.map(function (x) { return x[0]; }) }, { name: t('s_rejected'), values: c.map(function (x) { return x[1]; }) }], { colors: ['#1b8a5a', '#c53030'] });
  }).catch(function (e) { chartFail(['#c-ov-apprej'], e); });
  Promise.all([agg('Purchase Invoice', apF), agg('Sales Invoice', arF), agg('Purchase Invoice', openF('Purchase Invoice', false, [['due_date', '<', T]])), agg('Sales Invoice', openF('Sales Invoice', false, [['due_date', '<', T]]))]).then(function (a) {
    if (v !== S.ver) return;
    chart('#c-ov-payrec', 'bar', [t('k_ap_out'), t('k_ar_out')], [{ name: 'Total', values: [Math.round(a[0].base), Math.round(a[1].base)] }, { name: t('c_overdue'), values: [Math.round(a[2].base), Math.round(a[3].base)] }], { colors: ['#0b2447', '#c53030'] });
  }).catch(function (e) { chartFail(['#c-ov-payrec'], e); });
  trendChart('#c-ov-trend', v);
  attention(pendP, overdueF, v);
}

function monthsInRange() {
  var end = S.to || today(), start = S.from || addDays(end, -330); var out = [];
  var d = new Date(end + 'T00:00:00'); d.setDate(1);
  for (var i = 0; i < 12; i++) { var m0 = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; var e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    var m1 = e.getFullYear() + '-' + String(e.getMonth() + 1).padStart(2, '0') + '-' + String(e.getDate()).padStart(2, '0');
    if (m1 < start) break; out.unshift({ k: m0.slice(0, 7), a: m0 < start ? start : m0, b: m1 > end ? end : m1 }); d.setMonth(d.getMonth() - 1); }
  return out;
}
function trendChart(id, v) {
  var ms = monthsInRange();
  Promise.all(ms.map(function (m) {
    var f = [['docstatus', '=', 1], ['posting_date', 'between', [m.a, m.b]]]; if (S.company) f.push(['company', '=', S.company]);
    return gl('Payment Entry', { fields: ['payment_type', 'sum(base_paid_amount) as p', 'sum(base_received_amount) as r'], filters: f, group: 'payment_type', limit: 10 });
  })).then(function (res) {
    if (v !== S.ver) return;
    var pay = [], rec = [];
    res.forEach(function (rows) { var p = 0, r = 0; rows.forEach(function (x) { if (x.payment_type === 'Pay') p += x.p || 0; if (x.payment_type === 'Receive') r += x.r || 0; }); pay.push(Math.round(p)); rec.push(Math.round(r)); });
    chart(id, 'bar', ms.map(function (m) { return m.k; }), [{ name: S.lang === 'ar' ? 'مدفوعات' : 'Payments (Pay)', values: pay }, { name: S.lang === 'ar' ? 'مقبوضات' : 'Receipts (Receive)', values: rec }], { colors: ['#c53030', '#1b8a5a'] });
  }).catch(function (e) { chartFail([id], e); });
}

function attention(pendP, overdueF, v) {
  var box = q('#ov-attention'); box.innerHTML = loadingHTML();
  Promise.all([mergedLoader(pendP.map(function (p) { return Object.assign({ asc: true }, p); }), 0, 7),
    gl('Purchase Invoice', { fields: FIELDS['Purchase Invoice'], filters: overdueF, order: 'outstanding_amount desc', limit: 6 }),
    excSummary()]).then(function (r) {
    if (v !== S.ver) return;
    var h = '<div class="grp"><h4>' + esc(t('grp_oldest')) + '<button class="fc-link" id="at-all1" type="button">' + esc(t('view_all')) + '</button></h4>' +
      (r[0].rows.length ? r[0].rows.map(function (x, i) { return '<div class="it" data-k="p' + i + '"><span>' + esc(x.name) + ' · ' + esc(dtl(x.dt)) + '</span><span class="a">' + n0(Math.max(0, dayDiff(x.date, today()))) + ' d</span></div>'; }).join('') : emptyHTML()) + '</div>';
    h += '<div class="grp"><h4>' + esc(t('grp_overdue')) + '<button class="fc-link" id="at-all2" type="button">' + esc(t('view_all')) + '</button></h4>' +
      (r[1].length ? r[1].map(function (x, i) { return '<div class="it" data-k="o' + i + '"><span>' + esc(x.name) + ' · ' + esc(x.supplier_name) + '</span><span class="a">' + n0(x.outstanding_amount) + ' ' + esc(x.party_account_currency || x.currency) + '</span></div>'; }).join('') : emptyHTML()) + '</div>';
    h += '<div class="grp"><h4>' + esc(t('grp_exc')) + '<button class="fc-link" id="at-all3" type="button">' + esc(t('view_all')) + '</button></h4>' +
      (r[2].length ? r[2].map(function (x, i) { return '<div class="it" data-k="e' + i + '"><span><span class="fc-badge ' + sevCls(x.sev) + '">' + esc(t('sev_' + x.sev)) + '</span> ' + esc(t(x.label)) + '</span><span class="a">' + n0(x.count) + '</span></div>'; }).join('') : emptyHTML()) + '</div>';
    box.innerHTML = h;
    q('#at-all1').onclick = function () { openDrill(t('grp_oldest'), { parts: pendP, asc: true }); };
    q('#at-all2').onclick = function () { openDrill(t('grp_overdue'), { parts: [{ dt: 'Purchase Invoice', filters: overdueF, order: 'due_date asc' }] }); };
    q('#at-all3').onclick = function () { openDrill(t('ex_register'), excDrill()); };
    qa('.it', box).forEach(function (it) { it.onclick = function () { var k = it.getAttribute('data-k'), i = parseInt(k.slice(1), 10);
      if (k[0] === 'p') openDoc(r[0].rows[i].dt, r[0].rows[i].name); else if (k[0] === 'o') openDoc('Purchase Invoice', r[1][i].name); else openDrill(t(r[2][i].label), r[2][i].drill); }; });
  }).catch(function (e) { box.innerHTML = errHTML(e); setErr(e.message); });
}

/* ---------- APPROVALS ---------- */
function approvalParts() {
  var dts = S.doctype ? [S.doctype] : PEND4, k = S.ap, out = [];
  dts.forEach(function (dt) {
    var f = base(dt).concat(userFilters(dt)); var kk = k;
    if (dt === 'Purchase Invoice') { if (S.wf || (k && k !== 'pending')) return; f = base(dt).concat([['docstatus', '=', 0]]); }
    else if (S.wf && !HASWF[dt]) return;
    if (k === 'pending' || k === 'returned') {
      if (S.age > 0) f.push(['posting_date', '<=', addDays(today(), -S.age)]);
    } else if (S.age > 0) { f = f.concat(stat(dt, 'pending') || [], [['posting_date', '<=', addDays(today(), -S.age)]]); }
    out.push({ dt: dt, filters: f, or: orSearch(dt), asc: (k === 'pending' || k === 'returned' || S.age > 0) });
  });
  return out;
}
function tabApprovals() {
  var T = today();
  var pk = function (k, dts) { return cnts(parts(k, dts || PEND4)); };
  kpis('#k-approvals', [
    cdef('k_pending_total', parts('pending', PEND4), 'auto'), cdef('k_aged7', CORE3.map(function (dt) { return { dt: dt, filters: base(dt, { noDate: true }).concat(stat(dt, 'pending'), [['posting_date', '<=', addDays(T, -BACKDATE_DAYS)]]) }; }), 'auto'),
    cdef('k_returned', parts('returned', CORE3)), cdef('k_approved', parts('approved', CORE3), 'ok'), cdef('k_rejected', parts('rejected', CORE3), 'bad')]);
  /* workflow summary */
  var box = q('#ap-summary'); box.innerHTML = loadingHTML(); var v = S.ver;
  loadWF().then(function () {
    return Promise.all(CORE3.map(function (dt) { return gl(dt, { fields: ['workflow_state', 'docstatus', 'count(name) as n'], filters: base(dt), group: 'workflow_state,docstatus', limit: 100 }); })
      .concat([cnt('Purchase Invoice', base('Purchase Invoice').concat([['docstatus', '=', 0]]))]));
  }).then(function (res) {
    if (v !== S.ver) return;
    var rows = [];
    CORE3.forEach(function (dt, i) { res[i].sort(function (a, b) { return b.n - a.n; }).forEach(function (r) { rows.push({ dt: dt, state: r.workflow_state, ds: r.docstatus, n: r.n }); }); });
    rows.push({ dt: 'Purchase Invoice', state: null, ds: 0, n: res[3] });
    var h = '<table><thead><tr><th>' + esc(t('c_type')) + '</th><th>' + esc(t('c_state')) + '</th><th>' + esc(t('c_docstatus')) + '</th><th class="num">' + esc(t('c_n')) + '</th><th>' + esc(t('c_role')) + '</th><th>' + esc(t('c_workflow_active')) + '</th></tr></thead><tbody>';
    rows.forEach(function (r, i) { var wf = WFDEF[r.dt];
      h += '<tr class="click" data-i="' + i + '"><td>' + esc(dtl(r.dt)) + '</td><td>' + (r.state ? badge(r.state) : '<span class="fc-badge b-gray">' + esc(t('wf_none')) + '</span>') + '</td><td>' + esc(docLbl(r.ds)) + '</td><td class="num">' + n0(r.n) + '</td><td>' + esc(roleOf(r.dt, r.state)) + '</td><td>' + esc(wf ? (wf.active ? t('wf_active') : t('wf_inactive')) : t('wf_none')) + '</td></tr>'; });
    box.innerHTML = h + '</tbody></table>';
    qa('tbody tr', box).forEach(function (tr) { tr.onclick = function () { var r = rows[parseInt(tr.getAttribute('data-i'), 10)];
      var f = base(r.dt).concat([['docstatus', '=', r.ds]]); if (r.state) f.push(['workflow_state', '=', r.state]);
      openDrill(dtl(r.dt) + ' · ' + tState(r.state) + ' · ' + docLbl(r.ds), { parts: [{ dt: r.dt, filters: f }] }); }; });
  }).catch(function (e) { box.innerHTML = errHTML(e); setErr(e.message); });
  loadWF().then(function () {
    var pts = approvalParts();
    if (!pts.length) { q('#t-approvals').innerHTML = emptyHTML(); return; }
    PT('#t-approvals', genCfg(function (p, s) { return mergedLoader(pts, p, s); }, 'approvals'));
  });
}

/* ---------- PAYMENTS ---------- */
function peTableFilters() { return base('Payment Entry').concat(userFilters('Payment Entry')); }
function tabPayments() {
  var B = base('Payment Entry'), P = function (extra) { return [{ dt: 'Payment Entry', filters: B.concat(extra) }]; };
  var defs = [
    cdef('k_pe_total', P([])), cdef('k_pe_pending', parts('pending', ['Payment Entry']), 'auto'), cdef('k_pe_approved', parts('approved', ['Payment Entry']), 'ok'), cdef('k_pe_rejected', parts('rejected', ['Payment Entry']), 'bad'),
    cdef('k_pe_sup', P([['docstatus', '=', 1], ['payment_type', '=', 'Pay'], ['party_type', '=', 'Supplier']])),
    cdef('k_pe_cust', P([['docstatus', '=', 1], ['payment_type', '=', 'Receive'], ['party_type', '=', 'Customer']])),
    { label: 'k_pe_unalloc', tone: 'warn', load: function () { return sumOf('Payment Entry', 'unallocated_amount', B.concat([['docstatus', '=', 1], ['unallocated_amount', '>', 0]])).then(function (r) { return { v: r.n, sub: n0(r.s) + ' ' + CUR }; }); }, drill: { parts: P([['docstatus', '=', 1], ['unallocated_amount', '>', 0]]) } },
    { label: 'k_pe_exc', tone: 'bad', load: function () { return cnt('Payment Entry', B.concat([['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']])).then(function (n) { return { v: n, sub: t('c_posted') }; }); }, drill: { parts: P([['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']]) } }];
  kpis('#k-payments', defs);
  chartLoading(['#c-pay-type', '#c-pay-mode', '#c-pay-state']); var v = S.ver;
  gl('Payment Entry', { fields: ['payment_type', 'count(name) as n'], filters: B.concat([['docstatus', '=', 1]]), group: 'payment_type', limit: 10 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-pay-type', 'donut', r.map(function (x) { return tState(x.payment_type); }), [{ values: r.map(function (x) { return x.n; }) }]); }).catch(function (e) { chartFail(['#c-pay-type'], e); });
  gl('Payment Entry', { fields: ['mode_of_payment', 'count(name) as n'], filters: B.concat([['docstatus', '=', 1]]), group: 'mode_of_payment', order: 'count(name) desc', limit: 8 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-pay-mode', 'bar', r.map(function (x) { return x.mode_of_payment || '—'; }), [{ values: r.map(function (x) { return x.n; }) }], { colors: ['#2f6fb5'] }); }).catch(function (e) { chartFail(['#c-pay-mode'], e); });
  gl('Payment Entry', { fields: ['workflow_state', 'count(name) as n'], filters: B, group: 'workflow_state', order: 'count(name) desc', limit: 10 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-pay-state', 'bar', r.map(function (x) { return tState(x.workflow_state); }), [{ values: r.map(function (x) { return x.n; }) }], { colors: ['#0b2447'] }); }).catch(function (e) { chartFail(['#c-pay-state'], e); });
  var cols = [COL.doc, COL.date, COL.company, { l: 'c_ptype', h: function (r) { return td(esc(tState(r.raw.payment_type))); } }, COL.party,
    { l: 'c_paid', num: 1, h: function (r) { return td(n2(r.raw.paid_amount), 'num'); } }, { l: 'c_recv', num: 1, h: function (r) { return td(n2(r.raw.received_amount), 'num'); } },
    { l: 'c_mode', h: function (r) { return td(esc(r.raw.mode_of_payment || '—')); } }, { l: 'c_ref', h: function (r) { return td(esc(r.raw.reference_no || '—')); } }, COL.state, COL.status];
  PT('#t-payments', { id: 'payments', cols: cols, onRow: function (r) { openDoc('Payment Entry', r.name); },
    loader: function (p, s) { return mergedLoader([{ dt: 'Payment Entry', filters: peTableFilters(), or: orSearch('Payment Entry') }], p, s); } });
}
/* ---------- capped scan (backdated / same-user) ---------- */
function scan(dt, extra) {
  var f = base(dt).concat([['docstatus', '=', 1]], extra || []);
  return Promise.all([gl(dt, { fields: ['name', 'posting_date', 'creation', 'owner', 'modified_by', 'workflow_state', 'company', 'docstatus', 'party_name', 'voucher_type', 'total_debit', 'paid_amount', 'received_amount', 'payment_type'], filters: f, order: 'posting_date desc', limit: SCAN_CAP }), cnt(dt, f)])
    .then(function (r) { return { rows: r[0], total: r[1], capped: r[0].length < r[1] }; });
}
function backdatedRows(dt) { return scan(dt).then(function (s) {
  s.hits = s.rows.filter(function (r) { return dayDiff(r.posting_date, String(r.creation).slice(0, 10)) > BACKDATE_DAYS; }).map(function (r) { return norm(dt, r); }); return s; }); }

/* ---------- JOURNALS ---------- */
function jeRows(page, size) {
  var pts = [{ dt: 'Journal Entry', filters: base('Journal Entry').concat(userFilters('Journal Entry')), or: orSearch('Journal Entry') }];
  return mergedLoader(pts, page, size).then(function (res) {
    var names = res.rows.map(function (r) { return r.name; }); if (!names.length) return res;
    return gl('Journal Entry Account', { parent: 'Journal Entry', fields: ['parent', 'sum(debit) as d', 'sum(credit) as c'], filters: [['parent', 'in', names]], group: 'parent', limit: names.length + 5 }).then(function (c) {
      var m = {}; c.forEach(function (x) { m[x.parent] = x; });
      res.rows.forEach(function (r) { var x = m[r.name]; r.d = x ? x.d : null; r.c = x ? x.c : null; }); return res; });
  });
}
function jeFlags(r) {
  var f = [], raw = r.raw;
  if (r.d != null && Math.abs((r.d || 0) - (r.c || 0)) > 0.005) f.push(t('flag_unbal'));
  if (r.d != null && (Math.abs(r.d - (raw.total_debit || 0)) > 0.005 || Math.abs(r.c - (raw.total_credit || 0)) > 0.005)) f.push(t('flag_hdr'));
  if (dayDiff(r.date, String(raw.creation).slice(0, 10)) > BACKDATE_DAYS) f.push(t('flag_back'));
  if (r.ds === 1 && (WF_PEND['Journal Entry'].indexOf(r.state) >= 0)) f.push(t('flag_unappr'));
  if (r.ds === 2) f.push(t('flag_canc'));
  return f;
}
function tabJournals() {
  var B = base('Journal Entry'), J = function (extra) { return [{ dt: 'Journal Entry', filters: B.concat(extra) }]; }, v = S.ver;
  var backTile = { label: 'k_je_back', tone: 'warn', load: function () { return backdatedRows('Journal Entry').then(function (s) { return { v: s.hits.length, sub: s.capped ? t('scanned', { a: n0(s.rows.length), b: n0(s.total) }) : t('conf_confirmed') }; }); },
    drill: { cols: GEN_COLS, loader: function (p, s) { return backdatedRows('Journal Entry').then(function (x) { return staticLoader(x.hits)(p, s); }); }, onRow: function (r) { openDoc(r.dt, r.name); }, onAct: function (a, v2, r) { openDoc(r.dt, r.name); } } };
  kpis('#k-journals', [cdef('k_je_total', J([])), cdef('k_je_pend', parts('pending', ['Journal Entry']), 'auto'), cdef('k_je_appr', parts('approved', ['Journal Entry']), 'ok'),
    cdef('k_je_rej', parts('rejected', ['Journal Entry']), 'bad'), cdef('k_je_canc', J([['docstatus', '=', 2]])), backTile,
    cdef('k_je_rev', J([['reversal_of', 'is', 'set']])), cdef('k_je_unbal', J([['docstatus', '!=', 2], ['difference', '!=', 0]]), 'auto')]);
  chartLoading(['#c-je-state', '#c-je-type']);
  gl('Journal Entry', { fields: ['workflow_state', 'count(name) as n'], filters: B, group: 'workflow_state', order: 'count(name) desc', limit: 10 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-je-state', 'bar', r.map(function (x) { return tState(x.workflow_state); }), [{ values: r.map(function (x) { return x.n; }) }], { colors: ['#0b2447'] }); }).catch(function (e) { chartFail(['#c-je-state'], e); });
  gl('Journal Entry', { fields: ['voucher_type', 'count(name) as n'], filters: B.concat([['docstatus', '=', 1]]), group: 'voucher_type', order: 'count(name) desc', limit: 8 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-je-type', 'donut', r.map(function (x) { return x.voucher_type; }), [{ values: r.map(function (x) { return x.n; }) }]); }).catch(function (e) { chartFail(['#c-je-type'], e); });
  q('#je-note').textContent = (S.lang === 'ar' ? 'المدين والدائن محسوبان من بنود القيد (Journal Entry Account) وليس من الرأس؛ التنبيهات: ' : 'Debit and credit are summed from the journal lines (Journal Entry Account), not the header. Flags: ') +
    t('flag_unbal') + ', ' + t('flag_hdr') + ', ' + t('flag_back') + ' (> ' + BACKDATE_DAYS + ' d), ' + t('flag_unappr') + '.';
  var cols = [COL.doc, COL.date, COL.company, { l: 'c_vtype', h: function (r) { return td(esc(r.raw.voucher_type)); } },
    { l: 'c_debit', num: 1, h: function (r) { return td(r.d == null ? t('na') : n2(r.d), 'num'); } }, { l: 'c_credit', num: 1, h: function (r) { return td(r.c == null ? t('na') : n2(r.c), 'num'); } },
    { l: 'c_diff', num: 1, h: function (r) { return td(r.d == null ? t('na') : n2((r.d || 0) - (r.c || 0)), 'num'); } }, COL.state, { l: 'c_created', h: function (r) { return td(esc(userName(r.by))); } },
    { l: 'c_flags', h: function (r) { var f = jeFlags(r); return td(f.map(function (x) { return '<span class="fc-badge b-bad">' + esc(x) + '</span>'; }).join(' ') || '—'); } }];
  PT('#t-journals', { id: 'journals', cols: cols, loader: jeRows, flag: function (r) { return jeFlags(r).length > 0; }, onRow: function (r) { openDoc('Journal Entry', r.name); } });
}

/* ---------- AP / AR (shared) ---------- */
function ageBuckets(dt, apply) {
  var T = today(), L = [{ k: 'Current', f: [['due_date', '>=', T]] }, { k: '1–30', f: dueF(addDays(T, -30), addDays(T, -1)) }, { k: '31–60', f: dueF(addDays(T, -60), addDays(T, -31)) },
    { k: '61–90', f: dueF(addDays(T, -90), addDays(T, -61)) }, { k: '90+', f: [['due_date', '<', addDays(T, -90)]] }];
  return Promise.all(L.map(function (b) { return agg(dt, openF(dt, apply, b.f)).then(function (a) { return { k: b.k, f: b.f, a: a }; }); }));
}
function partyAgg(dt, pf, nf, filters) {
  return gl(dt, { fields: [pf, nf, 'company', 'party_account_currency', 'currency', 'conversion_rate', 'count(name) as n', 'sum(outstanding_amount) as o'], filters: filters, group: pf + ',' + nf + ',company,party_account_currency,currency,conversion_rate', limit: 0 }).then(function (rows) {
    var m = {}; rows.forEach(function (r) { var k = r[pf]; var e = m[k] || (m[k] = { id: k, name: r[nf] || k, n: 0, base: 0 }); e.n += r.n; e.base += baseBalance(r); });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.base - a.base; });
  });
}
function invCols(kind) {
  var pf = kind === 'ap' ? 'supplier_name' : 'customer_name';
  var c = [COL.doc, { l: kind === 'ap' ? 'c_supplier' : 'c_customer', h: function (r) { return td(esc(r.raw[pf] || '—')); } }];
  if (kind === 'ap') c.push({ l: 'c_bill', h: function (r) { return td(esc(r.raw.bill_no || '—')); } });
  return c.concat([COL.date, { l: 'c_due', h: function (r) { return td(esc(r.raw.due_date || '—')); } }, { l: 'c_cur', h: function (r) { return td(esc(r.raw.currency+' (invoice); '+r.raw.party_account_currency+' (outstanding)')); } },
    { l: 'c_inv', num: 1, h: function (r) { return td(n2(r.raw.grand_total), 'num'); } }, { l: 'c_out', num: 1, h: function (r) { return td(n2(r.raw.outstanding_amount), 'num'); } },
    { l: 'c_outbase', num: 1, h: function (r) { return td(n2(baseBalance(r.raw)), 'num'); } },
    { l: 'c_overdue', num: 1, h: function (r) { var d = r.raw.due_date ? dayDiff(r.raw.due_date, today()) : 0; return td(d > 0 ? '<span class="fc-badge b-bad">' + n0(d) + '</span>' : '—', 'num'); } }, COL.status]);
}
function tabBalances(kind) {
  var dt = kind === 'ap' ? 'Purchase Invoice' : 'Sales Invoice', apply = kind === 'ap' ? S.apRange : S.arRange, T = today(), v = S.ver, ap = kind === 'ap';
  var O = function (extra) { return openF(dt, apply, extra); }, P = function (f, order) { return [{ dt: dt, filters: f, order: order || 'due_date asc' }]; };
  var aggDef = function (label, f, tone, money) { return { label: label, tone: tone, load: function () { return agg(dt, f).then(function (a) { return money ? { v: a.base, money: 1, sub: CUR + ' · ' + n0(a.n) } : { v: a.n, sub: n0(a.base) + ' ' + CUR }; }); }, drill: { parts: P(f) } }; };
  var defs;
  if (ap) defs = [aggDef('k_ap_total', balF(dt, apply), '', true), aggDef('k_ap_overdue', O([['due_date', '<', T]]), 'bad'), aggDef('k_ap_unpaid', O([]), ''),
    aggDef('k_ap_7', O(dueF(T, addDays(T, 7))), 'warn'), aggDef('k_ap_30', O(dueF(T, addDays(T, 30))), 'warn'),
    aggDef('k_ap_cn', balF(dt, apply).concat([['is_return', '=', 1]]), ''), cdef('k_ap_review', [{ dt: dt, filters: base(dt).concat([['docstatus', '=', 0]]) }], 'auto')];
  else defs = [aggDef('k_ar_total', balF(dt, apply), '', true), aggDef('k_ar_overdue', O([['due_date', '<', T]]), 'bad'),
    { label: 'k_ar_credit', tone: 'ok', load: function () { return agg(dt, balF(dt, apply).concat([['is_return', '=', 1], ['outstanding_amount', '<', 0]])).then(function (a) { return { v: -a.base, money: 1, sub: CUR + ' · ' + n0(a.n) }; }); }, drill: { parts: P(balF(dt, apply).concat([['is_return', '=', 1], ['outstanding_amount', '<', 0]])) } },
    aggDef('k_ar_count', O([]), ''),
    { label: 'k_ar_unalloc', tone: 'warn', load: function () { var f = base('Payment Entry', { noDate: !apply }).concat([['docstatus', '=', 1], ['payment_type', '=', 'Receive'], ['party_type', '=', 'Customer'], ['unallocated_amount', '>', 0]]); return sumOf('Payment Entry', 'unallocated_amount', f).then(function (r) { return { v: r.s, money: 1, sub: CUR + ' · ' + n0(r.n) }; }); },
      drill: { parts: [{ dt: 'Payment Entry', filters: base('Payment Entry', { noDate: !apply }).concat([['docstatus', '=', 1], ['payment_type', '=', 'Receive'], ['party_type', '=', 'Customer'], ['unallocated_amount', '>', 0]]) }] } }];
  kpis('#k-' + kind, defs);
  var ageId = '#c-' + kind + '-age', topId = '#c-' + kind + '-top'; chartLoading([ageId, topId]);
  ageBuckets(dt, apply).then(function (b) { if (v !== S.ver) return;
    chart(ageId, 'bar', b.map(function (x) { return x.k; }), [{ name: CUR, values: b.map(function (x) { return Math.round(x.a.base); }) }], { colors: ['#2f6fb5'] }); }).catch(function (e) { chartFail([ageId], e); });
  var pf = ap ? 'supplier' : 'customer', nf = ap ? 'supplier_name' : 'customer_name';
  var topF = ap ? O([]) : O([['due_date', '<', T]]);
  partyAgg(dt, pf, nf, topF).then(function (l) { if (v !== S.ver) return; var top = l.slice(0, 10);
    chart(topId, 'bar', top.map(function (x) { return String(x.name).slice(0, 18); }), [{ name: CUR, values: top.map(function (x) { return Math.round(x.base); }) }], { colors: [ap ? '#0b2447' : '#c53030'] }); }).catch(function (e) { chartFail([topId], e); });
  var view = ap ? S.apView : S.arView, host = '#t-' + kind;
  if (view === 'inv') {
    PT(host, { id: kind + 'inv', cols: invCols(kind), onRow: function (r) { openDoc(dt, r.name); },
      loader: function (p, s) { return mergedLoader([{ dt: dt, filters: balF(dt, apply).concat(orSearch(dt) ? [] : []), or: orSearch(dt), order: 'due_date asc' }], p, s); }, flag: function (r) { return r.raw.due_date < T && r.raw.outstanding_amount > 0; } });
  } else {
    var listP = partyAgg(dt, pf, nf, balF(dt, apply).concat([['is_return', 'in', [0, 1]]])).then(function (l) { var s = (S.search || '').toLowerCase(); return s ? l.filter(function (x) { return (x.id + ' ' + x.name).toLowerCase().indexOf(s) >= 0; }) : l; });
    PT(host, { id: kind + 'party', cols: [{ l: ap ? 'c_supplier' : 'c_customer', h: function (r) { return td('<button type="button" class="fc-link" data-act="p">' + esc(r.name) + '</button>'); } },
      { l: 'c_count', num: 1, h: function (r) { return td(n0(r.n), 'num'); } }, { l: 'c_outbase', num: 1, h: function (r) { return td(n2(r.base), 'num'); } }],
      loader: function (p, s) { return listP.then(function (l) { return staticLoader(l)(p, s); }); },
      onRow: function (r) { openDrill((ap ? t('c_supplier') : t('c_customer')) + ': ' + r.name, { parts: P(balF(dt, apply).concat([[pf, '=', r.id]])) }); } });
  }
}
function tabAP() { tabBalances('ap'); }
function tabAR() { tabBalances('ar'); }

/* ---------- EXPENSE CLAIMS ---------- */
function tabExpenses() {
  var B = base('Expense Claim'), E = function (extra) { return [{ dt: 'Expense Claim', filters: B.concat(extra) }]; }, v = S.ver;
  var sumDef = function (label, field) { return { label: label, load: function () { return sumOf('Expense Claim', field, B.concat([['docstatus', '=', 1]])).then(function (r) { return { v: r.s, money: 1, sub: CUR + ' · ' + n0(r.n) }; }); }, drill: { parts: E([['docstatus', '=', 1]]) } }; };
  kpis('#k-expenses', [cdef('k_ec_total', E([])), cdef('k_ec_pend', parts('pending', ['Expense Claim']), 'auto'), cdef('k_ec_appr', parts('approved', ['Expense Claim']), 'ok'), cdef('k_ec_rej', parts('rejected', ['Expense Claim']), 'bad'),
    cdef('k_ec_unpaid', E([['approval_status', '=', 'Approved'], ['docstatus', '=', 1], ['status', '=', 'Unpaid']]), 'auto'),
    sumDef('k_ec_claimed', 'total_claimed_amount'), sumDef('k_ec_sanct', 'total_sanctioned_amount'), sumDef('k_ec_reimb', 'total_amount_reimbursed')]);
  chartLoading(['#c-ec-status', '#c-ec-pay', '#c-ec-emp']);
  gl('Expense Claim', { fields: ['approval_status', 'count(name) as n'], filters: B, group: 'approval_status', order: 'count(name) desc', limit: 10 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-ec-status', 'donut', r.map(function (x) { return tState(x.approval_status); }), [{ values: r.map(function (x) { return x.n; }) }]); }).catch(function (e) { chartFail(['#c-ec-status'], e); });
  gl('Expense Claim', { fields: ['status', 'count(name) as n'], filters: B, group: 'status', order: 'count(name) desc', limit: 10 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-ec-pay', 'bar', r.map(function (x) { return tState(x.status); }), [{ values: r.map(function (x) { return x.n; }) }], { colors: ['#2f6fb5'] }); }).catch(function (e) { chartFail(['#c-ec-pay'], e); });
  var empRows = [];
  gl('Expense Claim', { fields: ['employee', 'employee_name', 'count(name) as n', 'sum(total_claimed_amount) as s'], filters: B.concat([['docstatus', '=', 1]]), group: 'employee,employee_name', order: 'sum(total_claimed_amount) desc', limit: 10 }).then(function (r) { if (v !== S.ver) return; empRows = r;
    chart('#c-ec-emp', 'bar', r.map(function (x) { return String(x.employee_name || x.employee).slice(0, 16); }), [{ name: CUR, values: r.map(function (x) { return Math.round(x.s); }) }], { colors: ['#0b2447'] }); }).catch(function (e) { chartFail(['#c-ec-emp'], e); });
  var cols = [COL.doc, { l: 'c_employee', h: function (r) { return td('<button type="button" class="fc-link" data-act="emp" data-v="' + esc(r.raw.employee) + '">' + esc(r.raw.employee_name || r.raw.employee) + '</button>'); } }, COL.company, COL.date,
    { l: 'c_claimed', num: 1, h: function (r) { return td(n2(r.raw.total_claimed_amount), 'num'); } }, { l: 'c_sanct', num: 1, h: function (r) { return td(n2(r.raw.total_sanctioned_amount), 'num'); } },
    { l: 'c_reimb', num: 1, h: function (r) { return td(n2(r.raw.total_amount_reimbursed), 'num'); } }, { l: 'c_appr', h: function (r) { return td(badge(r.raw.approval_status)); } },
    COL.state, { l: 'c_paystatus', h: function (r) { return td(badge(r.raw.status)); } }];
  PT('#t-expenses', { id: 'expenses', cols: cols, onRow: function (r) { openDoc('Expense Claim', r.name); },
    onAct: function (a, val, r) { if (a === 'emp') openDrill(t('emp_claims', { x: r.raw.employee_name || val }), { parts: E([['employee', '=', val]]) }); },
    loader: function (p, s) { return mergedLoader([{ dt: 'Expense Claim', filters: B.concat(userFilters('Expense Claim')), or: orSearch('Expense Claim') }], p, s); } });
}
/* ---------- BANK ---------- */
function btF(extra) { return base('Bank Transaction').concat(extra || []); }
var UNREC = ['Pending', 'Unreconciled'], RECD = ['Reconciled', 'Settled'];
function bankBalances() {
  var f = [['is_company_account', '=', 1]]; if (S.company) f.push(['company', '=', S.company]);
  return gl('Bank Account', { fields: ['name', 'account', 'bank', 'company'], filters: f, limit: 60 }).then(function (accs) {
    return Promise.all(accs.map(function (a) {
      if (!a.account) return Promise.resolve({ a: a, bal: null });
      return call('erpnext.accounts.utils.get_balance_on', { account: a.account, date: today(), company: a.company })
        .then(function (r) { return { a: a, bal: (typeof r.message === 'number') ? r.message : null }; }).catch(function () { return { a: a, bal: null }; });
    }));
  });
}
function tabBank() {
  var v = S.ver, B = function (extra) { return [{ dt: 'Bank Transaction', filters: btF(extra) }]; };
  q('#bank-note').innerHTML = esc(t('bank_note_norec')) + ' <button type="button" class="fc-link" id="bk-rep">' + esc(t('open_report')) + '</button>';
  q('#bk-rep').onclick = function () { window.open('/app/query-report/Bank Reconciliation Statement', '_blank', 'noopener'); };
  var wd = function () { return Promise.all([sumOf('Bank Transaction', 'withdrawal', btF([['status', 'in', UNREC], ['docstatus', '=', 1], ['withdrawal', '>', 0]])), sumOf('Bank Transaction', 'withdrawal', btF([['status', 'in', UNREC], ['docstatus', '=', 1], ['withdrawal', '<', 0]]))]).then(function (r) { return { s: r[0].s - r[1].s, n: r[0].n + r[1].n }; }); };
  kpis('#k-bank', [
    { label: 'k_bk_bal', load: function () { return bankBalances().then(function (l) { var ok = l.filter(function (x) { return x.bal != null; }); if (!ok.length) return { v: null, sub: l.length ? t('no_wf') : t('empty') }; return { v: sum(ok.map(function (x) { return x.bal; })), money: 1, sub: CUR + ' · ' + ok.length + '/' + l.length }; }); } },
    cdef('k_bk_unrec', B([['status', 'in', UNREC], ['docstatus', '=', 1]]), 'auto'), cdef('k_bk_rec', B([['status', 'in', RECD], ['docstatus', '=', 1]]), 'ok'),
    { label: 'k_bk_dep', load: function () { return sumOf('Bank Transaction', 'deposit', btF([['status', 'in', UNREC], ['docstatus', '=', 1]])).then(function (r) { return { v: r.s, money: 1, sub: CUR + ' · ' + n0(r.n) }; }); }, drill: { parts: B([['status', 'in', UNREC], ['docstatus', '=', 1], ['deposit', '>', 0]]) } },
    { label: 'k_bk_wd', load: function () { return wd().then(function (r) { return { v: r.s, money: 1, sub: CUR + ' · ' + n0(r.n) }; }); }, drill: { parts: B([['status', 'in', UNREC], ['docstatus', '=', 1], ['withdrawal', '!=', 0]]) } },
    cdef('k_bk_unm', B([['docstatus', '=', 1], ['unallocated_amount', '>', 0]]), 'auto')]);
  chartLoading(['#c-bank-status', '#c-bank-acc']); var box = q('#bank-wise'); box.innerHTML = loadingHTML();
  gl('Bank Transaction', { fields: ['status', 'count(name) as n'], filters: btF([['docstatus', '=', 1]]), group: 'status', limit: 10 }).then(function (r) { if (v !== S.ver) return;
    chart('#c-bank-status', 'donut', r.map(function (x) { return tState(x.status); }), [{ values: r.map(function (x) { return x.n; }) }]); }).catch(function (e) { chartFail(['#c-bank-status'], e); });
  Promise.all([gl('Bank Transaction', { fields: ['bank_account', 'status', 'count(name) as n', 'sum(deposit) as dep', 'sum(withdrawal) as wd', 'sum(unallocated_amount) as un'], filters: btF([['docstatus', '=', 1]]), group: 'bank_account,status', limit: 200 }), bankBalances()]).then(function (res) {
    if (v !== S.ver) return; var m = {};
    res[0].forEach(function (r) { var e = m[r.bank_account] || (m[r.bank_account] = { acc: r.bank_account, n: 0, unrec: 0, dep: 0, wd: 0, un: 0 }); e.n += r.n; e.dep += r.dep || 0; e.wd += r.wd || 0; e.un += r.un || 0; if (UNREC.indexOf(r.status) >= 0) e.unrec += r.n; });
    var bal = {}; res[1].forEach(function (x) { bal[x.a.name] = x.bal; }); var list = Object.keys(m).map(function (k) { return m[k]; });
    chart('#c-bank-acc', 'bar', list.map(function (x) { return String(x.acc).slice(0, 22); }), [{ name: CUR, values: list.map(function (x) { return Math.round(x.un); }) }], { colors: ['#d69e2e'] });
    if (!list.length) { box.innerHTML = emptyHTML(); return; }
    box.innerHTML = '<table><thead><tr><th>' + esc(t('c_bank')) + '</th><th class="num">' + esc(t('c_balance')) + '</th><th class="num">' + esc(t('c_ntx')) + '</th><th class="num">' + esc(t('k_bk_unrec')) + '</th><th class="num">' + esc(t('c_deposit')) + '</th><th class="num">' + esc(t('c_withdraw')) + '</th><th class="num">' + esc(t('c_unalloc')) + '</th></tr></thead><tbody>' +
      list.map(function (x, i) { var b = bal[x.acc]; return '<tr class="click" data-i="' + i + '"><td>' + esc(x.acc) + '</td><td class="num">' + (b == null ? esc(t('na')) : n2(b)) + '</td><td class="num">' + n0(x.n) + '</td><td class="num">' + n0(x.unrec) + '</td><td class="num">' + n2(x.dep) + '</td><td class="num">' + n2(x.wd) + '</td><td class="num">' + n2(x.un) + '</td></tr>'; }).join('') + '</tbody></table>';
    qa('tbody tr', box).forEach(function (tr) { tr.onclick = function () { var x = list[parseInt(tr.getAttribute('data-i'), 10)]; openDrill(x.acc, { parts: B([['bank_account', '=', x.acc]]) }); }; });
  }).catch(function (e) { box.innerHTML = errHTML(e); chartFail(['#c-bank-acc'], e); });
  var cols = [COL.doc, { l: 'c_date', h: function (r) { return td(esc(r.date)); } }, COL.company, { l: 'c_bank', h: function (r) { return td(esc(r.raw.bank_account)); } },
    { l: 'c_deposit', num: 1, h: function (r) { return td(n2(r.raw.deposit), 'num'); } }, { l: 'c_withdraw', num: 1, h: function (r) { return td(n2(r.raw.withdrawal), 'num'); } },
    { l: 'c_unalloc', num: 1, h: function (r) { return td(n2(r.raw.unallocated_amount), 'num'); } }, { l: 'c_ref', h: function (r) { return td(esc(r.raw.reference_number || '—')); } }, COL.status];
  PT('#t-bank', { id: 'bank', cols: cols, onRow: function (r) { openDoc('Bank Transaction', r.name); },
    loader: function (p, s) { var f = btF(); if (S.ap === 'approved') f.push(['status', 'in', RECD]); if (S.ap === 'pending') f.push(['status', 'in', UNREC]); return mergedLoader([{ dt: 'Bank Transaction', filters: f, or: orSearch('Bank Transaction') }], p, s); } });
}

/* ---------- EXCEPTIONS ---------- */
function sevCls(s) { return s === 'high' ? 'b-bad' : s === 'medium' ? 'b-warn' : 'b-gray'; }
var EXC_CACHE = {};
var EXC_DEFS = [
 { id: 'je_unbal', label: 'x_je_unbal', sev: 'high', core: 1 }, { id: 'unapproved', label: 'x_unapproved', sev: 'high', core: 1 },
 { id: 'dup_pay', label: 'x_dup_pay', sev: 'high', core: 1 }, { id: 'dup_bill', label: 'x_dup_bill', sev: 'high', core: 1 },
 { id: 'period', label: 'x_period', sev: 'high' }, { id: 'same_user', label: 'x_same_user', sev: 'high' },
 { id: 'unalloc', label: 'x_unalloc', sev: 'medium', core: 1 }, { id: 'backdated', label: 'x_backdated', sev: 'medium' },
 { id: 'attach', label: 'x_attach', sev: 'medium' }, { id: 'rejected', label: 'x_rejected', sev: 'medium' },
 { id: 'ap_over', label: 'x_ap_over', sev: 'medium' }, { id: 'ar_over', label: 'x_ar_over', sev: 'medium' }, { id: 'cancelled', label: 'x_cancelled', sev: 'low' }];
(function () { var en = { x_je_unbal:'Journal debit/credit mismatches', x_unapproved:'Posted without approved workflow state (Payment/Journal)', x_dup_pay:'Duplicate payment references (same party + reference)',
  x_dup_bill:'Duplicate supplier invoice numbers (same supplier + bill no.)', x_period:'Backdated documents in a currently closed period (review required)', x_same_user:'Created and approved by the same user', x_unalloc:'Unallocated payments',
  x_backdated:'Backdated transactions (posting date > ' + BACKDATE_DAYS + ' days before creation)', x_attach:'Missing supporting attachments (latest ' + ATTACH_SAMPLE + ' per type)', x_rejected:'Rejected workflow records',
  x_ap_over:'Overdue supplier invoices', x_ar_over:'Overdue customer invoices', x_cancelled:'Cancelled financial transactions' };
  var ar = { x_je_unbal:'عدم توازن مدين/دائن في القيود', x_unapproved:'مرحّل دون حالة اعتماد (دفع/قيود)', x_dup_pay:'مراجع دفع مكررة (نفس الطرف + المرجع)', x_dup_bill:'أرقام فواتير موردين مكررة (نفس المورد + الرقم)',
  x_period:'مستندات بأثر رجعي ضمن فترة مغلقة — تتطلب المراجعة', x_same_user:'أنشأه واعتمده المستخدم نفسه', x_unalloc:'مدفوعات غير مخصصة', x_backdated:'معاملات بأثر رجعي (تاريخ الترحيل قبل الإنشاء بأكثر من ' + BACKDATE_DAYS + ' أيام)',
  x_attach:'مرفقات داعمة مفقودة (آخر ' + ATTACH_SAMPLE + ' لكل نوع)', x_rejected:'سجلات سير عمل مرفوضة', x_ap_over:'فواتير موردين متأخرة', x_ar_over:'فواتير عملاء متأخرة', x_cancelled:'معاملات مالية ملغاة' };
  Object.assign(I18N.en, en); Object.assign(I18N.ar, ar); })();

function groupDrill(title, dt, gf, nameF, dupF) {
  return { cols: [{ l: 'dup_group', h: function (r) { return td(esc(r.k1 + ' · ' + r.k2)); } }, { l: 'c_cnt', num: 1, h: function (r) { return td(n0(r.n), 'num'); } }],
    loader: function (p, s) { return dupGroups(dt, gf).then(function (g) { return staticLoader(g)(p, s); }); },
    onRow: function (r) { openDrill(r.k1 + ' · ' + r.k2, { parts: [{ dt: dt, filters: base(dt).concat(dupF(r)) }] }); } };
}
async function dupGroups(dt, gf) {
 var f=dt==='Payment Entry'?base(dt).concat([['docstatus','=',1],['reference_no','is','set']]):base(dt).concat([['docstatus','=',1],['is_return','=',0],['bill_no','is','set']]);
 var k1=dt==='Payment Entry'?'party':'supplier',k2=dt==='Payment Entry'?'reference_no':'bill_no', rows=[],offset=0;
 while(true){var page=await gl(dt,{fields:[k1,k2,'count(name) as n'],filters:f,group:k1+','+k2,order:k1+' asc,'+k2+' asc',start:offset,limit:500});rows=rows.concat(page);if(page.length<500)break;offset+=page.length;}
 return rows.filter(function(x){return x.n>1;}).map(function(x){return {k1:x[k1],k2:x[k2],n:x.n};});
}
function missingAttach(dt) {
  var f = base(dt).concat([['docstatus', '=', 1]]);
  return Promise.all([gl(dt, { fields: FIELDS[dt], filters: f, order: dfield(dt) + ' desc', limit: ATTACH_SAMPLE }), cnt(dt, f)]).then(function (r) {
    var names = r[0].map(function (x) { return x.name; }); if (!names.length) return { rows: [], total: r[1], scanned: 0 };
    return gl('File', { fields: ['attached_to_name'], filters: [['attached_to_doctype', '=', dt], ['attached_to_name', 'in', names]], group: 'attached_to_name', limit: names.length + 5 }).then(function (fs) {
      var has = {}; fs.forEach(function (x) { has[x.attached_to_name] = 1; });
      return { rows: r[0].filter(function (x) { return !has[x.name]; }).map(function (x) { return norm(dt, x); }), total: r[1], scanned: r[0].length }; }); });
}
function periodHits() {
  var f = []; if (S.company) f.push(['company', '=', S.company]); if (S.from) f.push(['end_date', '>=', S.from]); if (S.to) f.push(['start_date', '<=', S.to]);
  return gl('Accounting Period', { fields: ['name', 'company', 'start_date', 'end_date'], filters: f, limit: 200 }).then(function (ps) {
    if (!ps.length) return { hits: [], checked: 0, total: 0 };
    return gl('Closed Document', { parent: 'Accounting Period', fields: ['parent', 'document_type'], filters: [['closed', '=', 1], ['parent', 'in', ps.map(function (p) { return p.name; })], ['document_type', 'in', ['Payment Entry', 'Journal Entry', 'Purchase Invoice', 'Sales Invoice', 'Expense Claim']]], limit: 1000 }).then(function (cd) {
      var pm = {}; ps.forEach(function (p) { pm[p.name] = p; });
      var jobs = cd.map(function (c) { return { p: pm[c.parent], dt: c.document_type }; }).filter(function (j) { return j.p; }), total = jobs.length; jobs = jobs.slice(0, 40);
      return Promise.all(jobs.map(function (j) {
        var flt = [['docstatus', '=', 1], ['company', '=', j.p.company], ['posting_date', 'between', [j.p.start_date, j.p.end_date]], ['creation', '>', j.p.end_date + ' 23:59:59']];
        return cnt(j.dt, flt).then(function (n) { return { p: j.p, dt: j.dt, n: n, filters: flt }; }); })).then(function (rs) { return { hits: rs.filter(function (x) { return x.n > 0; }), checked: jobs.length, total: total }; }); });
  });
}
function excRun(id) {
  var key = S.ver + ':' + id + ':' + S.company + S.from + S.to; if (EXC_CACHE[key]) return EXC_CACHE[key];
  var T = today(), PE = 'Payment Entry', JE = 'Journal Entry', pr, G = function (dt, extra) { return [{ dt: dt, filters: base(dt).concat(extra) }]; };
  var C = function (parts_, conf, basis) { return cnts(parts_).then(function (n) { return { count: n, conf: conf, basis: basis, drill: { parts: parts_ } }; }); };
  switch (id) {
    case 'je_unbal': pr = C(G(JE, [['docstatus', '!=', 2], ['difference', '!=', 0]]), 'confirmed', 'Journal Entry.difference ≠ 0 (all records)'); break;
    case 'unapproved': pr = C(G(PE, [['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']]).concat(G(JE, [['docstatus', '=', 1], ['workflow_state', '!=', 'Approved']])), 'confirmed', 'docstatus = 1 and workflow_state ≠ Approved (all records)'); break;
    case 'unalloc': pr = C(G(PE, [['docstatus', '=', 1], ['unallocated_amount', '>', 0]]), 'confirmed', 'Payment Entry.unallocated_amount > 0 (all records)'); break;
    case 'rejected': pr = C(parts('rejected', CORE3), 'confirmed', 'Workflow state Rejected / Finally Rejected (all records)'); break;
    case 'cancelled': pr = C(['Payment Entry', 'Journal Entry', 'Purchase Invoice', 'Sales Invoice', 'Expense Claim'].map(function (d) { return { dt: d, filters: base(d).concat([['docstatus', '=', 2]]) }; }), 'confirmed', 'docstatus = 2 (all records)'); break;
    case 'ap_over': pr = C([{ dt: 'Purchase Invoice', filters: openF('Purchase Invoice', false, [['due_date', '<', T]]) }], 'confirmed', 'due_date < today and outstanding > 0 (all records; balance view)'); break;
    case 'ar_over': pr = C([{ dt: 'Sales Invoice', filters: openF('Sales Invoice', false, [['due_date', '<', T]]) }], 'confirmed', 'due_date < today and outstanding > 0 (all records; balance view)'); break;
    case 'dup_pay': pr = dupGroups(PE).then(function (g) { return { count: g.length, conf: 'confirmed', basis: 'Same party + reference_no on ≥ 2 submitted Payment Entries (all groups, paginated)', drill: groupDrill('', PE, 0, 0, function (r) { return [['party', '=', r.k1], ['reference_no', '=', r.k2], ['docstatus', '=', 1]]; }) }; }); break;
    case 'dup_bill': pr = dupGroups('Purchase Invoice').then(function (g) { return { count: g.length, conf: 'confirmed', basis: 'Same supplier + bill_no on ≥ 2 submitted invoices (all groups, paginated)', drill: groupDrill('', 'Purchase Invoice', 0, 0, function (r) { return [['supplier', '=', r.k1], ['bill_no', '=', r.k2], ['docstatus', '=', 1], ['is_return', '=', 0]]; }) }; }); break;
    case 'backdated': pr = Promise.all([backdatedRows(JE), backdatedRows(PE)]).then(function (r) { var hits = r[0].hits.concat(r[1].hits), capped = r[0].capped || r[1].capped;
      return { count: hits.length, conf: capped ? 'indicative' : 'confirmed', basis: 'posting_date earlier than creation date by > ' + BACKDATE_DAYS + ' days; ' + t('scanned', { a: n0(r[0].rows.length + r[1].rows.length), b: n0(r[0].total + r[1].total) }), drill: { cols: GEN_COLS, loader: staticLoader(hits), onRow: function (x) { openDoc(x.dt, x.name); }, onAct: function (a, v, x) { openDoc(x.dt, x.name); } } }; }); break;
    case 'same_user': pr = Promise.all([scan(JE, [['workflow_state', '=', 'Approved']]), scan(PE, [['workflow_state', '=', 'Approved']])]).then(function (r) {
      var hits = [].concat(r[0].rows.map(function (x) { return norm(JE, x); }), r[1].rows.map(function (x) { return norm(PE, x); })).filter(function (x) { return x.raw.owner === x.raw.modified_by; });
      return { count: hits.length, conf: 'indicative', basis: 'owner = last modifier on Approved records (proxy). Open a record to verify from its approval trail. ' + t('scanned', { a: n0(r[0].rows.length + r[1].rows.length), b: n0(r[0].total + r[1].total) }), drill: { cols: GEN_COLS, loader: staticLoader(hits), onRow: function (x) { openDoc(x.dt, x.name); }, onAct: function (a, v, x) { openDoc(x.dt, x.name); } } }; }); break;
    case 'attach': pr = Promise.all([PE, JE, 'Purchase Invoice'].map(missingAttach)).then(function (r) { var rows = [].concat.apply([], r.map(function (x) { return x.rows; })); var cap = r.some(function (x) { return x.scanned < x.total; });
      return { count: rows.length, conf: cap ? 'indicative' : 'confirmed', basis: 'No File attached (File doctype) among the latest ' + ATTACH_SAMPLE + ' submitted records per type', drill: { cols: GEN_COLS, loader: staticLoader(rows), onRow: function (x) { openDoc(x.dt, x.name); }, onAct: function (a, v, x) { openDoc(x.dt, x.name); } } }; }); break;
    case 'period': pr = periodHits().then(function (r) { var rows = r.hits;
      return { count: sum(rows.map(function (x) { return x.n; })), conf: 'indicative', basis: 'Current closed period; creation is after period end, not verified closure/submission time (' + r.checked + '/' + r.total + ' period-type checks). Users with an exempted role may legitimately post.',
        drill: { cols: [{ l: 'c_exc', h: function (x) { return td(esc(x.p.name + ' · ' + dtl(x.dt))); } }, { l: 'c_cnt', num: 1, h: function (x) { return td(n0(x.n), 'num'); } }], loader: staticLoader(rows), onRow: function (x) { openDrill(x.p.name + ' · ' + dtl(x.dt), { parts: [{ dt: x.dt, filters: x.filters }] }); } } }; }); break;
  }
  EXC_CACHE[key] = pr; pr.catch(function () { delete EXC_CACHE[key]; }); return pr;
}
function excList() { return EXC_DEFS.map(function (d) { return Object.assign({}, d, { run: function () { return excRun(d.id); } }); }); }
function coreExceptionCount() { return Promise.all(EXC_DEFS.filter(function (d) { return d.core; }).map(function (d) { return excRun(d.id).then(function (r) { return r.count; }); })).then(sum); }
function excSummary() { return Promise.all(EXC_DEFS.filter(function (d) { return d.core; }).map(function (d) { return excRun(d.id).then(function (r) { return { label: d.label, sev: d.sev, count: r.count, drill: r.drill }; }); }))
  .then(function (l) { return l.filter(function (x) { return x.count > 0; }); }); }
function excRegisterCols() {
  return [{ l: 'c_exc', h: function (r) { return td(esc(t(r.d.label))); } }, { l: 'c_sev', h: function (r) { return td('<span class="fc-badge ' + sevCls(r.d.sev) + '">' + esc(t('sev_' + r.d.sev)) + '</span>'); } },
    { l: 'c_conf', h: function (r) { return td('<span class="fc-badge ' + (r.conf === 'confirmed' ? 'b-ok' : 'b-warn') + '">' + esc(t('conf_' + r.conf)) + '</span>'); } },
    { l: 'c_cnt', num: 1, h: function (r) { return td(n0(r.count), 'num'); } }, { l: 'c_basis', h: function (r) { return td('<small>' + esc(r.basis) + '</small>'); } }];
}
function excRows(filterFn) {
  return Promise.all(excList().filter(filterFn || function () { return true; }).map(function (d) { return d.run().then(function (r) { return Object.assign({ d: d }, r); }).catch(function (e) { return { d: d, count: 0, conf: 'indicative', basis: t('err_load') + ': ' + e.message, drill: null }; }); }));
}
function excDrill() { return { cols: excRegisterCols(), loader: function (p, s) { return excRows().then(function (l) { return staticLoader(l)(p, s); }); }, onRow: function (r) { if (r.drill && r.count) openDrill(t(r.d.label), r.drill); } }; }
function tabAudit() {
  var filt = function (d) { return (!S.exType || d.id === S.exType) && (!S.exSev || d.sev === S.exSev); };
  var v = S.ver;
  kpis('#k-audit', [0, 1, 2, 3].map(function (i) { return { label: ['k_ex_types', 'k_ex_high', 'k_ex_conf', 'k_ex_ind'][i], load: function () { return excRows(filt).then(function (l) {
    return { v: i === 0 ? l.filter(function (x) { return x.count > 0; }).length : i === 1 ? sum(l.filter(function (x) { return x.d.sev === 'high'; }).map(function (x) { return x.count; })) : sum(l.filter(function (x) { return x.conf === (i === 2 ? 'confirmed' : 'indicative'); }).map(function (x) { return x.count; })) }; }); } }; }));
  PT('#audit-list', { id: 'audit', cols: excRegisterCols(), flag: function (r) { return r.count > 0 && r.d.sev === 'high'; }, onRow: function (r) { if (r.drill && r.count) openDrill(t(r.d.label), r.drill); },
    loader: function (p, s) { return excRows(filt).then(function (l) { return staticLoader(l)(p, s); }); }, size: 20 });
}
/* ---------- wiring ---------- */
var LOADERS = { overview: tabOverview, approvals: tabApprovals, payments: tabPayments, journals: tabJournals, ap: tabAP, ar: tabAR, expenses: tabExpenses, bank: tabBank, audit: tabAudit };
var SCOPE = { overview: 'scope_default', approvals: 'scope_appr', payments: 'scope_tbl', journals: 'scope_tbl', ap: 'scope_bal', ar: 'scope_bal', expenses: 'scope_tbl', bank: 'scope_bank', audit: 'scope_audit' };
var COMPANIES = [], WFSTATES = [];

function applyPreset() {
  var T = today(), d = new Date(T + 'T00:00:00'), p = S.preset;
  if (p === 'today') { S.from = T; S.to = T; }
  else if (p === 'week') { var s = new Date(d); s.setDate(d.getDate() - d.getDay()); S.from = frappe.datetime.obj_to_str ? frappe.datetime.obj_to_str(s) : s.toISOString().slice(0, 10); S.to = T; }
  else if (p === 'month') { S.from = T.slice(0, 8) + '01'; S.to = T; }
  else if (p === 'year') { S.from = T.slice(0, 4) + '-01-01'; S.to = T; }
  else if (p === 'all') { S.from = ''; S.to = ''; }
  q('#f-from').value = S.from; q('#f-to').value = S.to; q('#f-preset').value = p;
}
function fillSelect(id, items, val) { var s = q(id); s.innerHTML = items.map(function (i) { return '<option value="' + esc(i[0]) + '">' + esc(i[1]) + '</option>'; }).join(''); s.value = val || ''; }
function buildDynamicSelects() {
  fillSelect('#f-company', [['', t('all_companies')]].concat(COMPANIES.map(function (c) { return [c, c]; })), S.company);
  fillSelect('#f-doctype', [['', t('all')]].concat(PEND4.map(function (d) { return [d, dtl(d)]; })), S.doctype);
  fillSelect('#f-wf', [['', t('all')]].concat(WFSTATES.map(function (s) { return [s, tState(s)]; })), S.wf);
  fillSelect('#f-extype', [['', t('all')]].concat(EXC_DEFS.map(function (d) { return [d.id, t(d.label)]; })), S.exType);
}
function applyLang() {
  var L = S.lang, root = q('#fc-root'); root.setAttribute('dir', L === 'ar' ? 'rtl' : 'ltr'); root.setAttribute('lang', L);
  qa('[data-i]').forEach(function (e) { e.textContent = t(e.getAttribute('data-i')); });
  qa('[data-ph]').forEach(function (e) { e.placeholder = t(e.getAttribute('data-ph')); });
  qa('#f-age option').forEach(function (o) { if (o.value !== '0') o.textContent = (L === 'ar' ? '> ' : '> ') + o.value + (L === 'ar' ? ' يوم' : ' d'); });
  qa('.fc-seg [data-lang]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lang') === L); });
  buildDynamicSelects();
  q('#fc-asof').textContent = (L === 'ar' ? 'حتى ' : 'As of ') + today();
  q('#fc-scope-note').textContent = t(SCOPE[S.tab]);
}
function showTab(tab, force) {
  S.tab = tab; saveState();
  qa('#fc-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
  qa('.fc-panel').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-panel') === tab); });
  q('#fc-scope-note').textContent = t(SCOPE[tab]);
  if (force || S.loaded[tab] !== S.ver) { S.loaded[tab] = S.ver; setErr(''); try { LOADERS[tab](); } catch (e) { setErr(e.message); } }
}
function bump() { TABLES = {}; S.ver++; closeDrill(); showTab(S.tab, true); }
function debounce(fn, ms) { var h; return function () { clearTimeout(h); h = setTimeout(fn, ms); }; }
function loadWfStates() {
  return Promise.all(CORE3.map(function (dt) { return gl(dt, { fields: ['workflow_state'], filters: S.company ? [['company', '=', S.company]] : [], group: 'workflow_state', limit: 50 }).catch(function () { return []; }); })).then(function (r) {
    var m = {}; r.forEach(function (rows) { rows.forEach(function (x) { if (x.workflow_state) m[x.workflow_state] = 1; }); }); WFSTATES = Object.keys(m).sort(); buildDynamicSelects(); });
}
function bind() {
  qa('#fc-tabs button').forEach(function (b) { b.onclick = function () { showTab(b.getAttribute('data-tab')); }; });
  qa('.fc-seg [data-lang]').forEach(function (b) { b.onclick = function () { S.lang = b.getAttribute('data-lang'); saveState(); applyLang(); closeDrill(); showTab(S.tab, true); }; });
  q('#f-company').onchange = function (e) { S.company = e.target.value; loadWfStates(); bump(); };
  q('#f-preset').onchange = function (e) { S.preset = e.target.value; if (S.preset !== 'custom') applyPreset(); bump(); };
  var dch = function () { S.from = q('#f-from').value; S.to = q('#f-to').value; S.preset = 'custom'; q('#f-preset').value = 'custom'; bump(); };
  q('#f-from').onchange = dch; q('#f-to').onchange = dch;
  q('#f-doctype').onchange = function (e) { S.doctype = e.target.value; bump(); };
  q('#f-wf').onchange = function (e) { S.wf = e.target.value; bump(); };
  q('#f-ap').onchange = function (e) { S.ap = e.target.value; bump(); };
  q('#f-age').onchange = function (e) { S.age = parseInt(e.target.value, 10) || 0; bump(); };
  q('#f-search').oninput = debounce(function () { S.search = q('#f-search').value.trim(); bump(); }, 450);
  q('#f-extype').onchange = function (e) { S.exType = e.target.value; bump(); };
  q('#f-exsev').onchange = function (e) { S.exSev = e.target.value; bump(); };
  q('#ap-range').onchange = function (e) { S.apRange = e.target.checked; bump(); };
  q('#ar-range').onchange = function (e) { S.arRange = e.target.checked; bump(); };
  qa('#ap-view button').forEach(function (b) { b.onclick = function () { S.apView = b.getAttribute('data-v'); qa('#ap-view button').forEach(function (x) { x.classList.toggle('on', x === b); }); bump(); }; });
  qa('#ar-view button').forEach(function (b) { b.onclick = function () { S.arView = b.getAttribute('data-v'); qa('#ar-view button').forEach(function (x) { x.classList.toggle('on', x === b); }); bump(); }; });
  q('#f-reset').onclick = function () { S.company = ''; S.doctype = ''; S.wf = ''; S.ap = ''; S.search = ''; S.age = 0; S.exType = ''; S.exSev = ''; S.preset = 'year'; applyPreset();
    q('#f-search').value = ''; q('#f-ap').value = ''; q('#f-age').value = '0'; q('#f-exsev').value = ''; buildDynamicSelects(); bump(); };
  q('#fc-refresh').onclick = function () { var b = q('#fc-refresh'); b.classList.add('busy'); CACHE = {}; EXC_CACHE = {}; WFDEF = null; TABLES = {}; S.ver++; closeDrill(); showTab(S.tab, true); loadWfStates();
    setTimeout(function () { b.classList.remove('busy'); }, 1200); };
  q('#dr-close').onclick = closeDrill; q('#fc-drawer').onclick = function (e) { if (e.target === q('#fc-drawer')) closeDrill(); };
  q('#md-close').onclick = closeDoc; q('#fc-modal').onclick = function (e) { if (e.target === q('#fc-modal')) closeDoc(); };
}

/* ---------- start ---------- */
bind(); applyPreset();
gl('Company', { fields: ['name'], filters: [], order: 'name asc', limit: 50 }).catch(function () { return []; }).then(function (c) {
  COMPANIES = c.map(function (x) { return x.name; }); applyLang(); if (!LOADERS[S.tab]) S.tab = 'overview';
  loadWfStates(); showTab(S.tab, true);
});
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
