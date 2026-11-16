(function(){
"use strict";

const R=root_element;
const $=s=>R.querySelector(s), $$=s=>Array.from(R.querySelectorAll(s));
const TD=new Date(); const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const TODAY=iso(TD);
const EN={title:'Customs & Post-Procurement Dashboard',subtitle:'DM Group KSA | Import, Customs & Procurement Control Center',refresh:'Refresh',lastref:'Last refreshed',company:'Company',from:'From Date',to:'To Date',supplier:'Supplier',status:'Shipment Status',all:'All',reset:'Reset',notset:'(Not set)',
t_overview:'Executive Overview',t_ship:'Shipment Tracking',t_customs:'Customs Clearance',t_grn:'GRN & Receiving',t_landed:'Landed Cost Analysis',t_pay:'Supplier & Customs Payments',t_docs:'Document Compliance',
k_po:'Total Purchase Orders',k_ship:'Total Shipments',k_transit:'Shipments In Transit',k_pend:'Customs Clearance Pending',k_hold:'Customs Holds / Delays',k_clear:'Shipments Cleared',k_recv:'Goods Received',k_pgr:'Pending Goods Receipts',k_val:'Total Shipment Value',k_cc:'Customs Charges',k_lc:'Total Landed Cost',k_out:'Supplier Outstanding',
k_c_pend:'Pending Clearance',k_c_insp:'Under Inspection',k_c_hold:'Customs Hold',k_c_clear:'Cleared',k_c_delay:'Delayed Clearance',k_c_chg:'Total Customs Charges (PO field)',
k_g_full:'Fully Received',k_g_part:'Partially Received',k_g_pend:'Pending Receipt',k_g_over:'Overdue Receipt',k_g_var:'Quantity Variance',
k_l_cnt:'Landed Cost Vouchers',k_l_goods:'Goods Cost',k_l_chg:'Total Charges',k_l_cust:'Customs / Clearing Account',k_l_total:'Total Landed Cost',
k_p_inv:'Total Supplier Invoices',k_p_out:'Supplier Outstanding',k_p_paid:'Paid Invoices',k_p_unpaid:'Unpaid Invoices',k_p_over:'Overdue Invoices',k_p_pay:'Supplier Payments (Payment Entry)',k_p_cflag:'Customs Charges Marked Paid (PO)',
c_status:'Shipment Status Distribution',c_month:'Monthly Import Value Trend (SAR)',c_customs:'Customs Clearance Status',c_country:'Shipments by Country of Origin (Supplier Country)',c_supplier:'Supplier-wise Shipment Value (SAR)',c_grc:'Goods Receipt Completion',
c_delay:'Delay Buckets (vs. ETA)',c_cchg:'Customs Charges by Supplier (PO field, SAR)',c_break:'Landed Cost Breakdown',c_lmonth:'Monthly Landed Cost Trend (SAR)',c_lsup:'Supplier Cost Comparison (SAR)',c_lcust:'Customs Cost Comparison by Supplier (SAR)',c_ptrend:'Monthly Supplier Payment Trend (SAR)',c_pstat:'Invoice Payment Status',c_gstat:'Receiving Status by Line',c_gwh:'Pending Quantity by Warehouse',
h_doc:'Document',h_date:'Date',h_supplier:'Supplier',h_company:'Company',h_amt:'Amount / Qty',h_status:'Status',h_open:'Open',h_po:'Purchase Order',h_ref:'Shipment Ref (PO)',h_country:'Supplier Country',h_method:'Shipping Method',h_cont:'Container No.',h_bl:'BL / AWB',h_sdate:'Loading Date',h_eta:'Est. Arrival',h_act:'First Receipt Date',h_val:'Value (SAR)',h_delay:'Delay (days)',h_cstat:'Clearance Status',h_insp:'Inspection Status',h_duty:'Customs Charges (PO)',h_paid:'Charges Paid',h_docst:'Clearing Docs',h_item:'Item',h_ord:'Ordered Qty',h_rec:'Received Qty',h_pen:'Pending Qty',h_wh:'Warehouse',h_pr:'Purchase Receipt',h_pdate:'Posting Date',h_sched:'Required By',h_lcv:'Landed Cost Voucher',h_sup_lc:'Supplier(s)',h_goods:'Goods Cost',h_cust:'Customs / Clearing',h_oth:'Other Charges',h_tchg:'Total Charges',h_tl:'Total Landed Cost',h_upl:'Charges % of Goods',h_inv:'Purchase Invoice',h_iamt:'Invoice Amount',h_pamt:'Paid Amount',h_oamt:'Outstanding',h_due:'Due Date',h_lpo:'Linked PO',h_comp:'Compliance Summary',h_att:'Attachments',h_pe:'Payment Entry',h_party:'Supplier',h_unal:'Unallocated',h_var:'Variance Qty',
d_ci:'Commercial Invoice',d_pl:'Packing List',d_bl:'BL / AWB',d_co:'Certificate of Origin',d_cd:'Customs Declaration',d_saber:'SABER / SASO',d_cp:'Customs Payment Receipt',d_grn:'Goods Receipt Note',
s_ok:'Recorded',s_nr:'Not Recorded',s_nv:'Not Verified',s_sub:'Submitted',s_rcv:'Received',s_paid:'Paid',
q:'Search…',rows:'rows',page:'Page',prev:'Prev',next:'Next',of:'of',noRec:'No records match the current filters.',loading:'Loading data…',denied:'Permission denied for this data source.',unavail:'Data source unavailable.',failed:'Failed to fetch data.',incomplete:'Incomplete result: record limit reached — totals may be partial.',na:'Not available',close:'Close',records:'records',drillhint:'Click to view records',
qf_all:'All',qf_delayed:'Delayed',qf_notcleared:'Not Cleared',qf_cleared:'Cleared',qf_dry:'Not Yet Shipped',
sar:'SAR',
note_scope:'Scope: submitted Purchase Orders only (drafts and cancelled excluded). A "shipment" is derived from a Purchase Order that has a Foreign supplier type, a shipping-phase Shipment Status, or customs/loading/ETA data — no separate shipment record exists in ERP.',
note_dates:'Date basis — Purchase Orders: transaction date; Landed Cost Vouchers, Purchase Invoices, Payment Entries: posting date. Amounts in company currency (SAR).',
note_unavail:'Not captured in ERP (no field or record): Shipping Method, Port of Entry, Customs Agent, Customs Declaration No., Bill of Entry, Declaration Date, Customs Release Date, Freight / Insurance / Clearing classification, Cost Variance baseline.',
note_stat_na:'Shipment Status filter does not apply to Customs Charges, Landed Cost, Supplier Outstanding or the Payments tab (invoices, payments and landed cost are not linked to shipment status).',
note_lcv_excl:'Manufacturing operating-cost vouchers excluded:',
note_cust_def:'Cleared = PO "Customs Status" is Cleared. Under Inspection = "Customs Status" Under Inspection. Hold = any verification field (BL/Invoice, BL weight, HS code, price, Original BL) marked Not Matching. Delayed = estimated arrival passed, not cleared, not fully received, or status "Shipment Delayed". Nothing is treated as cleared unless ERP says so.',
note_grn_def:'Quantities use the Purchase Order Item "received qty" maintained by ERPNext (cancelled receipts excluded, no double counting across multiple receipts). Closed Purchase Orders are not counted as pending.',
note_pay_def:'Paid = invoice total minus outstanding. Advances/unallocated payments are shown separately and never added to invoice paid amounts. Customs payments are shown only where an ERP flag or account supports it.',
note_land_def:'Landed cost = receipt value + charges on submitted Landed Cost Vouchers. Charges to account "Customs Or Expense Clearing" are shown as Customs / Clearing; other charges are shown as Other. Freight, insurance and duty types are not classified in ERP, so they are not split. Each receipt is counted once in the KPI total.',
note_docs_def:'Attachments are not classified by document type in ERP. Categories are checked only through structured fields on the Purchase Order / Receipt; unclassifiable ones show Not Verified. "Not Recorded" means the ERP field is empty — not proof that the document is missing.',
lang:'العربية',reset_f:'Reset filters'};
const AR={title:'لوحة الجمارك وما بعد الشراء',subtitle:'مجموعة دي إم السعودية | مركز التحكم في الاستيراد والجمارك والمشتريات',refresh:'تحديث',lastref:'آخر تحديث',company:'الشركة',from:'من تاريخ',to:'إلى تاريخ',supplier:'المورد',status:'حالة الشحنة',all:'الكل',reset:'إعادة ضبط',notset:'(غير محدد)',
t_overview:'نظرة عامة تنفيذية',t_ship:'تتبع الشحنات',t_customs:'التخليص الجمركي',t_grn:'الاستلام وإشعارات الاستلام',t_landed:'تحليل التكلفة النهائية',t_pay:'مدفوعات الموردين والجمارك',t_docs:'امتثال المستندات',
k_po:'إجمالي أوامر الشراء',k_ship:'إجمالي الشحنات',k_transit:'شحنات في الطريق',k_pend:'تخليص جمركي معلق',k_hold:'احتجاز / تأخير جمركي',k_clear:'شحنات تم تخليصها',k_recv:'بضائع مستلمة',k_pgr:'استلامات معلقة',k_val:'إجمالي قيمة الشحنات',k_cc:'الرسوم الجمركية',k_lc:'إجمالي التكلفة النهائية',k_out:'مستحقات الموردين',
k_c_pend:'تخليص معلق',k_c_insp:'قيد الفحص',k_c_hold:'احتجاز جمركي',k_c_clear:'تم التخليص',k_c_delay:'تأخر التخليص',k_c_chg:'إجمالي الرسوم الجمركية (حقل أمر الشراء)',
k_g_full:'مستلمة بالكامل',k_g_part:'مستلمة جزئياً',k_g_pend:'بانتظار الاستلام',k_g_over:'استلام متأخر',k_g_var:'فرق الكمية',
k_l_cnt:'قسائم التكلفة النهائية',k_l_goods:'تكلفة البضائع',k_l_chg:'إجمالي الرسوم',k_l_cust:'حساب الجمارك / التخليص',k_l_total:'إجمالي التكلفة النهائية',
k_p_inv:'إجمالي فواتير الموردين',k_p_out:'مستحقات الموردين',k_p_paid:'فواتير مدفوعة',k_p_unpaid:'فواتير غير مدفوعة',k_p_over:'فواتير متأخرة',k_p_pay:'مدفوعات الموردين (قيد دفع)',k_p_cflag:'رسوم جمركية مسددة (أمر الشراء)',
c_status:'توزيع حالات الشحنات',c_month:'اتجاه قيمة الاستيراد الشهري (ريال)',c_customs:'حالة التخليص الجمركي',c_country:'الشحنات حسب بلد المنشأ (بلد المورد)',c_supplier:'قيمة الشحنات حسب المورد (ريال)',c_grc:'اكتمال استلام البضائع',
c_delay:'فئات التأخير (مقابل الوصول المقدر)',c_cchg:'الرسوم الجمركية حسب المورد (حقل أمر الشراء، ريال)',c_break:'تفصيل التكلفة النهائية',c_lmonth:'اتجاه التكلفة النهائية الشهري (ريال)',c_lsup:'مقارنة التكلفة حسب المورد (ريال)',c_lcust:'مقارنة التكاليف الجمركية حسب المورد (ريال)',c_ptrend:'اتجاه مدفوعات الموردين الشهري (ريال)',c_pstat:'حالة سداد الفواتير',c_gstat:'حالة الاستلام حسب البند',c_gwh:'الكمية المعلقة حسب المستودع',
h_doc:'المستند',h_date:'التاريخ',h_supplier:'المورد',h_company:'الشركة',h_amt:'المبلغ / الكمية',h_status:'الحالة',h_open:'فتح',h_po:'أمر الشراء',h_ref:'مرجع الشحنة (أمر الشراء)',h_country:'بلد المورد',h_method:'طريقة الشحن',h_cont:'رقم الحاوية',h_bl:'بوليصة الشحن / AWB',h_sdate:'تاريخ التحميل',h_eta:'الوصول المقدر',h_act:'تاريخ أول استلام',h_val:'القيمة (ريال)',h_delay:'التأخير (أيام)',h_cstat:'حالة التخليص',h_insp:'حالة الفحص',h_duty:'الرسوم الجمركية (أمر الشراء)',h_paid:'الرسوم مسددة',h_docst:'مستندات التخليص',h_item:'الصنف',h_ord:'الكمية المطلوبة',h_rec:'الكمية المستلمة',h_pen:'الكمية المعلقة',h_wh:'المستودع',h_pr:'إيصال الشراء',h_pdate:'تاريخ الترحيل',h_sched:'مطلوب بتاريخ',h_lcv:'قسيمة التكلفة النهائية',h_sup_lc:'المورد/الموردون',h_goods:'تكلفة البضائع',h_cust:'جمارك / تخليص',h_oth:'رسوم أخرى',h_tchg:'إجمالي الرسوم',h_tl:'إجمالي التكلفة النهائية',h_upl:'الرسوم % من البضائع',h_inv:'فاتورة الشراء',h_iamt:'مبلغ الفاتورة',h_pamt:'المبلغ المدفوع',h_oamt:'المستحق',h_due:'تاريخ الاستحقاق',h_lpo:'أمر الشراء المرتبط',h_comp:'ملخص الامتثال',h_att:'المرفقات',h_pe:'قيد الدفع',h_party:'المورد',h_unal:'غير مخصص',h_var:'فرق الكمية',
d_ci:'الفاتورة التجارية',d_pl:'قائمة التعبئة',d_bl:'بوليصة الشحن / AWB',d_co:'شهادة المنشأ',d_cd:'البيان الجمركي',d_saber:'سابر / ساسو',d_cp:'إيصال سداد الجمارك',d_grn:'إشعار استلام البضائع',
s_ok:'مسجل',s_nr:'غير مسجل',s_nv:'غير موثق',s_sub:'مقدّم',s_rcv:'مستلم',s_paid:'مسدد',
q:'بحث…',rows:'صفوف',page:'صفحة',prev:'السابق',next:'التالي',of:'من',noRec:'لا توجد سجلات مطابقة للمرشحات الحالية.',loading:'جارٍ تحميل البيانات…',denied:'تم رفض الإذن لمصدر البيانات هذا.',unavail:'مصدر البيانات غير متاح.',failed:'تعذر جلب البيانات.',incomplete:'نتيجة غير مكتملة: تم بلوغ حد السجلات — قد تكون الإجماليات جزئية.',na:'غير متوفر',close:'إغلاق',records:'سجلات',drillhint:'انقر لعرض السجلات',
qf_all:'الكل',qf_delayed:'متأخرة',qf_notcleared:'غير مخلّصة',qf_cleared:'مخلّصة',qf_dry:'لم تُشحن بعد',
sar:'ريال',
note_scope:'النطاق: أوامر الشراء المعتمدة فقط (دون المسودات والملغاة). تُشتق «الشحنة» من أمر شراء لمورد أجنبي أو بحالة شحن أو ببيانات جمركية/تحميل/وصول — لا يوجد سجل شحنة مستقل في النظام.',
note_dates:'أساس التاريخ — أوامر الشراء: تاريخ المعاملة؛ قسائم التكلفة النهائية وفواتير الشراء وقيود الدفع: تاريخ الترحيل. المبالغ بعملة الشركة (ريال).',
note_unavail:'غير مسجل في النظام (لا حقل ولا سجل): طريقة الشحن، ميناء الدخول، المخلّص الجمركي، رقم البيان الجمركي، بيان الدخول، تاريخ البيان، تاريخ الإفراج الجمركي، تصنيف الشحن/التأمين/التخليص، أساس فرق التكلفة.',
note_stat_na:'مرشّح حالة الشحنة لا ينطبق على الرسوم الجمركية والتكلفة النهائية ومستحقات الموردين ولسان المدفوعات (غير مرتبطة بحالة الشحنة).',
note_lcv_excl:'تم استبعاد قسائم تكلفة التشغيل التصنيعية:',
note_cust_def:'مخلّص = حالة الجمارك في أمر الشراء «Cleared». قيد الفحص = «Under Inspection». احتجاز = أي حقل تحقق (بوليصة/فاتورة، وزن، رمز HS، سعر، البوليصة الأصلية) بقيمة «Not Matching». متأخر = تجاوز الوصول المقدر دون تخليص أو استلام كامل أو حالة «Shipment Delayed». لا يُعتبر شيء مخلّصاً ما لم يثبت النظام ذلك.',
note_grn_def:'تعتمد الكميات على «الكمية المستلمة» في بند أمر الشراء التي يحتسبها ERPNext (باستبعاد الإيصالات الملغاة ودون تكرار). أوامر الشراء المغلقة لا تُحتسب معلّقة.',
note_pay_def:'المدفوع = إجمالي الفاتورة − المستحق. الدفعات المقدمة/غير المخصصة تظهر منفصلة ولا تُضاف إلى مدفوعات الفواتير. تظهر المدفوعات الجمركية فقط عند وجود علامة أو حساب يدعمها.',
note_land_def:'التكلفة النهائية = قيمة الإيصال + رسوم قسائم التكلفة النهائية المعتمدة. الرسوم على حساب «Customs Or Expense Clearing» تُعرض كجمارك/تخليص وغيرها كرسوم أخرى. لا يصنّف النظام الشحن أو التأمين أو الرسوم، لذا لا يتم تقسيمها. يُحتسب كل إيصال مرة واحدة في الإجمالي.',
note_docs_def:'لا تُصنَّف المرفقات حسب نوع المستند في النظام. يتم التحقق عبر الحقول المنظمة في أمر الشراء/الإيصال فقط، وما لا يمكن تصنيفه يظهر «غير موثق». «غير مسجل» تعني أن الحقل فارغ وليس دليلاً على غياب المستند.',
lang:'English',reset_f:'إعادة ضبط المرشحات'};
const ST_AR={'Order Received':'تم استلام الطلب','Order Processing':'قيد المعالجة','Shipped Full Qty':'شُحنت كاملة','Shipped Partial Qty':'شُحنت جزئياً','In Transit':'في الطريق','In Customs':'في الجمارك','Out for Delivery':'خارج للتسليم','Delivered':'تم التسليم','Awaiting Pickup':'بانتظار الاستلام','Shipment Delayed':'الشحنة متأخرة','Cleared':'مخلّصة','Under Inspection':'قيد الفحص','Not Recorded':'غير مسجل','Not Verified':'غير موثق','Paid':'مدفوعة','Unpaid':'غير مدفوعة','Partly Paid':'مدفوعة جزئياً','Overdue':'متأخرة','Fully Received':'مستلمة بالكامل','Partially Received':'مستلمة جزئياً','Pending Receipt':'بانتظار الاستلام','Closed Short':'أُغلق ناقصاً','Closed - Not Received':'أُغلق دون استلام','Waiting For Inspection':'بانتظار الفحص','Inspected':'تم الفحص','Not Yet Shipped':'لم تُشحن بعد','Submitted':'مقدّم','To Receive':'للاستلام','To Receive and Bill':'للاستلام والفوترة','To Bill':'للفوترة','Completed':'مكتمل','Closed':'مغلق','Draft':'مسودة','Return':'مرتجع','Unpaid ':'غير مدفوعة','Documents in courier':'مستندات مع الناقل','Documents Received':'مستندات مستلمة','Submitted to Customs':'قُدمت للجمارك','Received':'مستلم','Verified':'تم التحقق','Not Matching':'غير مطابق','Not Inspected':'لم يُفحص','Foreign':'أجنبي','Local':'محلي','Other':'أخرى','Unknown':'غير معروف','Fully Received PO':'أوامر مستلمة بالكامل','Partial':'جزئي','Not Received':'لم تُستلم','Goods Cost':'تكلفة البضائع','Customs / Clearing':'جمارك / تخليص','Other Charges':'رسوم أخرى','Not Delayed':'غير متأخرة','1-7 days':'١-٧ أيام','8-30 days':'٨-٣٠ يوماً','30+ days':'أكثر من ٣٠ يوماً','Due Not Yet':'لم يحن موعدها'};
const S={lang:'en',tab:'overview',f:{company:'',from:TD.getFullYear()+'-01-01',to:TODAY,supplier:'',status:''},ds:{},tbl:{},cache:{},stamp:null,loading:0,drill:null,D:{}};
try{const l=localStorage.getItem('cpd_lang'); if(l==='ar'||l==='en') S.lang=l;}catch(e){}
const t=k=>(S.lang==='ar'&&AR[k]!==undefined)?AR[k]:(EN[k]!==undefined?EN[k]:k);
const L=s=>(S.lang==='ar'&&ST_AR[s])?ST_AR[s]:(s===''||s==null?t('notset'):s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(n,d)=>(n==null||isNaN(n))?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const cmp=n=>{if(n==null||isNaN(n))return '—';const a=Math.abs(n);return a>=1e6?(n/1e6).toFixed(2)+'M':a>=1e3?(n/1e3).toFixed(1)+'K':num(n,0)};
const dlink=(dt,n)=>'/app/'+dt.toLowerCase().replace(/ /g,'-')+'/'+encodeURIComponent(n);
const alink=(dt,n,txt)=>'<a href="'+dlink(dt,n)+'" target="_blank" rel="noopener">'+esc(txt==null?n:txt)+'</a>';
const dnum=s=>s?Math.floor((new Date(TODAY)-new Date(s))/864e5):null;
const mon=s=>s?String(s).slice(0,7):'';
const sum=(a,f)=>a.reduce((x,y)=>x+(Number(f(y))||0),0);
const groupBy=(a,f)=>{const m=new Map();a.forEach(x=>{const k=f(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return m};


const SHIPPED=['Shipped Full Qty','Shipped Partial Qty','In Transit','In Customs','Out for Delivery','Delivered','Awaiting Pickup','Shipment Delayed'];
const TRANSIT=['In Transit','Shipped Full Qty','Shipped Partial Qty'];
const callApi=args=>new Promise(res=>{
 let done=false;const ctl=(typeof AbortController!=='undefined')?new AbortController():null;
 const timer=setTimeout(()=>{if(done)return;done=true;if(ctl){try{ctl.abort();}catch(e){}}res({ok:false,code:0});},90000);
 const body=new URLSearchParams();Object.keys(args||{}).forEach(k=>{const v=args[k];if(v===undefined||v===null)return;body.append(k,typeof v==='object'?JSON.stringify(v):String(v));});
 /* direct silent call: no Frappe popups; always settles; 403 reported as code 403 */
 fetch('/api/method/frappe.client.get_list',{method:'POST',credentials:'same-origin',signal:ctl?ctl.signal:undefined,headers:{'X-Frappe-CSRF-Token':(window.frappe&&frappe.csrf_token)||'',Accept:'application/json','Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:body.toString()})
 .then(r=>r.text().then(txt=>({r,txt}))).then(o=>{if(done)return;done=true;clearTimeout(timer);let j=null;try{j=JSON.parse(o.txt);}catch(e){}
  if(o.r.ok&&j&&!j.exc){res({ok:true,rows:j.message||[]});return;}
  const ex=String((j&&(j.exception||j.exc_type))||'');res({ok:false,code:(o.r.status===401||o.r.status===403||/permission/i.test(ex))?403:(o.r.status||0)});})
 .catch(()=>{if(done)return;done=true;clearTimeout(timer);res({ok:false,code:0});});});
async function fetchAll(base){const out=[];let start=0;const PS=1000;for(let p=0;p<30;p++){const r=await callApi(Object.assign({},base,{limit_start:start,limit_page_length:PS}));if(!r.ok)return{ok:false,code:r.code,rows:out};out.push(...r.rows);if(r.rows.length<PS)return{ok:true,rows:out};start+=PS;}return{ok:true,rows:out,incomplete:true};}
async function fetchIn(base,field,vals,size){size=size||150;vals=Array.from(new Set(vals.filter(Boolean)));const ch=[];for(let i=0;i<vals.length;i+=size)ch.push(vals.slice(i,i+size));const res=[];let ok=true,code=0,inc=false;let idx=0;
 async function worker(){while(idx<ch.length){const c=ch[idx++];const r=await fetchAll(Object.assign({},base,{filters:(base.filters||[]).concat([[field,'in',c]])}));if(!r.ok){ok=false;code=r.code;}if(r.incomplete)inc=true;res.push(...r.rows);}}
 await Promise.all([worker(),worker(),worker(),worker()]);return{ok:ok,code:code,rows:res,incomplete:inc};}
const setDs=(k,r)=>{S.dsAll=S.dsAll||{};const sk=scopeKey();const m=S.dsAll[sk]||(S.dsAll[sk]={});m[k]={ok:r.ok,code:r.code,incomplete:!!r.incomplete};S.ds=m;};
const scopeKey=()=>JSON.stringify([S.f.company,S.f.from,S.f.to,S.f.supplier]);
function memo(name,fn){const k=name+scopeKey();if(!S.cache[k])S.cache[k]=fn();return S.cache[k];}
const baseF=(dateField)=>{const f=[['docstatus','=',1]];if(S.f.company)f.push(['company','=',S.f.company]);if(S.f.from)f.push([dateField,'>=',S.f.from]);if(S.f.to)f.push([dateField,'<=',S.f.to]);if(S.f.supplier)f.push(['supplier','=',S.f.supplier]);return f;};
const PO_FIELDS=['name','supplier','supplier_name','company','transaction_date','schedule_date','currency','grand_total','base_grand_total','status','per_received','per_billed','custom_supplier_type','custom_shipment_status','custom_customs_status','custom_estimated_arrival_time','custom_loading_date','custom_customs_charges','custom_customs_charges_paid','custom_inspection_status','custom_pre_inspection_status','custom_material_status','custom_clearing_document_status','custom_saber_status','custom_original_bl_status','custom_agent_soft_copy_status','custom_invoice_number','custom_bl_invoice_verification','custom_bl_weight_varification','custom_hs_code_verification','custom_price_verification','custom_shipment_terms'];
function getPOs(){return memo('po',async()=>{const r=await fetchAll({doctype:'Purchase Order',fields:PO_FIELDS,filters:baseF('transaction_date'),order_by:'transaction_date desc'});setDs('po',r);return r.rows;});}
function getExtras(ship){return memo('ex'+ship.map(s=>s.name).join(',').length,async()=>{
 const sup=await fetchIn({doctype:'Supplier',fields:['name','country']},'name',ship.map(s=>s.supplier));setDs('supplier',sup);
 const sd=await fetchIn({doctype:'Shipping Documents',parent:'Purchase Order',fields:['parent','container_no','bl_no']},'parent',ship.map(s=>s.name));setDs('shipdocs',sd);
 const pr=await getPR(ship.map(s=>s.name));
 return{country:new Map(sup.rows.map(x=>[x.name,x.country||''])),docs:groupBy(sd.rows,x=>x.parent),pr:pr};});}
function getPR(poNames){return memo('pr'+poNames.length+poNames.slice(0,3).join(),async()=>{
 const it=await fetchIn({doctype:'Purchase Receipt Item',parent:'Purchase Receipt',fields:['parent','purchase_order','purchase_order_item'],filters:[['docstatus','=',1]]},'purchase_order',poNames);setDs('pri',it);
 const names=Array.from(new Set(it.rows.map(x=>x.parent)));
 const hd=await fetchIn({doctype:'Purchase Receipt',fields:['name','posting_date','status','is_return','supplier','custom_container_no'],filters:[['docstatus','=',1]]},'name',names);setDs('pr',hd);
 const hm=new Map(hd.rows.map(h=>[h.name,h]));const byPO=new Map(),byItem=new Map();
 it.rows.forEach(x=>{const h=hm.get(x.parent);if(!h||h.is_return)return;const rec={pr:x.parent,date:h.posting_date,cont:h.custom_container_no};
  if(!byPO.has(x.purchase_order))byPO.set(x.purchase_order,[]);if(!byPO.get(x.purchase_order).some(r=>r.pr===rec.pr))byPO.get(x.purchase_order).push(rec);
  if(x.purchase_order_item){const cur=byItem.get(x.purchase_order_item);if(!cur||cur.date<rec.date)byItem.set(x.purchase_order_item,rec);}});
 byPO.forEach(v=>v.sort((a,b)=>a.date<b.date?-1:1));
 return{byPO:byPO,byItem:byItem};});}
function getItems(pos){return memo('items'+S.f.status+pos.length,async()=>{const r=await fetchIn({doctype:'Purchase Order Item',parent:'Purchase Order',fields:['name','parent','item_code','item_name','qty','received_qty','warehouse','schedule_date','uom']},'parent',pos.map(p=>p.name),120);setDs('poi',r);return r.rows;});}
const CUSTOMS_ACC='Customs Or Expense Clearing';const MFG='Operating Cost as per Work Order / BOM';
function getLCV(){return memo('lcv',async()=>{
 const hf=baseF('posting_date').filter(f=>f[0]!=='supplier');
 const h=await fetchAll({doctype:'Landed Cost Voucher',fields:['name','company','posting_date','total_taxes_and_charges','custom_po_number'],filters:hf});setDs('lcv',h);
 const names=h.rows.map(x=>x.name);
 const ch=await fetchIn({doctype:'Landed Cost Taxes and Charges',parent:'Landed Cost Voucher',fields:['parent','description','expense_account','base_amount']},'parent',names,200);setDs('lcvc',ch);
 const rc=await fetchIn({doctype:'Landed Cost Purchase Receipt',parent:'Landed Cost Voucher',fields:['parent','receipt_document','supplier','grand_total']},'parent',names,200);setDs('lcvr',rc);
 const cm=groupBy(ch.rows,x=>x.parent),rm=groupBy(rc.rows,x=>x.parent);const rows=[];let excluded=0;
 h.rows.forEach(v=>{const c=(cm.get(v.name)||[]),r=(rm.get(v.name)||[]);const proc=c.filter(x=>x.description!==MFG);
  if(c.length>0&&proc.length===0){excluded++;return;}
  const cust=sum(proc.filter(x=>(x.expense_account||'').indexOf(CUSTOMS_ACC)>=0),x=>x.base_amount);const tot=sum(proc,x=>x.base_amount);
  const sups=Array.from(new Set(r.map(x=>x.supplier).filter(Boolean)));
  if(S.f.supplier&&sups.indexOf(S.f.supplier)<0)return;
  rows.push({name:v.name,date:v.posting_date,company:v.company,po:v.custom_po_number||'',recs:r,sups:sups,goods:sum(r,x=>x.grand_total),cust:cust,oth:tot-cust,chg:tot});});
 return{rows:rows,excluded:excluded};});}
function getPI(){return memo('pi',async()=>{const r=await fetchAll({doctype:'Purchase Invoice',fields:['name','supplier','supplier_name','company','posting_date','due_date','currency','conversion_rate','grand_total','base_grand_total','outstanding_amount','is_return','status','bill_no'],filters:baseF('posting_date'),order_by:'posting_date desc'});setDs('pi',r);
 r.rows.forEach(x=>{const cr=Number(x.conversion_rate)||1;x.out=(Number(x.outstanding_amount)||0)*cr;x.tot=Number(x.base_grand_total)||0;x.paid=x.tot-x.out;
  x.pst=x.is_return?'Return':(Math.abs(x.out)<0.005?'Paid':(x.due_date&&x.due_date<TODAY?'Overdue':(x.out<x.tot-0.005?'Partly Paid':'Unpaid')));});
 return r.rows;});}
function getPE(){return memo('pe',async()=>{const f=baseF('posting_date').filter(x=>x[0]!=='supplier');f.push(['payment_type','=','Pay'],['party_type','=','Supplier']);if(S.f.supplier)f.push(['party','=',S.f.supplier]);
 const r=await fetchAll({doctype:'Payment Entry',fields:['name','posting_date','company','party','party_name','base_paid_amount','paid_amount','unallocated_amount','status'],filters:f,order_by:'posting_date desc'});setDs('pe',r);return r.rows;});}
function getFiles(names){return memo('files'+names.length,async()=>{const r=await fetchIn({doctype:'File',fields:['name','file_name','attached_to_doctype','attached_to_name','is_private']},'attached_to_name',names,150);setDs('files',r);return r.rows.filter(x=>['Purchase Order','Purchase Receipt'].indexOf(x.attached_to_doctype)>=0);});}
function derive(po,ex){
 po.eta=po.custom_estimated_arrival_time||'';po.sst=po.custom_shipment_status||'';po.cst=po.custom_customs_status||'';
 const ds=ex&&ex.docs.get(po.name)||[];po.docs=ds;
 po.isShip=po.custom_supplier_type==='Foreign'||SHIPPED.indexOf(po.sst)>=0||!!po.cst||!!po.custom_loading_date||!!po.eta;
 po.shipped=SHIPPED.indexOf(po.sst)>=0||!!po.cst;po.val=Number(po.base_grand_total)||0;po.rec=Number(po.per_received)||0;
 po.cleared=po.cst==='Cleared';po.insp=po.cst==='Under Inspection';
 po.hold=['custom_bl_invoice_verification','custom_bl_weight_varification','custom_hs_code_verification','custom_price_verification','custom_original_bl_status'].some(k=>po[k]==='Not Matching');
 po.open=po.rec<100&&po.status!=='Closed'&&po.status!=='Completed';
 po.late=po.eta&&po.eta<TODAY&&!po.cleared&&po.rec<100&&po.shipped&&po.sst!=='Delivered'?dnum(po.eta):(po.sst==='Shipment Delayed'&&!po.cleared?0.5:0);
 po.delayed=po.late>0;
 po.pend=po.shipped&&!po.cleared&&po.rec<100&&po.sst!=='Delivered';
 po.transit=TRANSIT.indexOf(po.sst)>=0&&po.rec<100;
 po.cstate=po.cleared?'Cleared':(po.insp?'Under Inspection':'Not Recorded');
 po.country=ex?(ex.country.get(po.supplier)||''):'';
 const prs=ex&&ex.pr.byPO.get(po.name)||[];po.prs=prs;po.arr=prs.length?prs[0].date:'';
 po.stg=po.sst||'';
 return po;}


const COL=['#0B2545','#13A89E','#3B6FB6','#64748B','#E0A526','#C2410C','#7C9CBF','#8FD3CC'];
const GOOD=['Cleared','Fully Received','Paid','Delivered','Recorded','Received','Verified','Submitted','Completed','Inspected'];
const BAD=['Overdue','Shipment Delayed','Not Matching','Delayed','Closed Short','Closed - Not Received'];
const WARN=['Under Inspection','In Customs','Partly Paid','Partially Received','Pending Receipt','Not Recorded','In Transit','Unpaid','Waiting For Inspection','Shipped Partial Qty','Not Yet Shipped','To Receive','To Receive and Bill'];
const tone=s=>GOOD.indexOf(s)>=0?'g':BAD.indexOf(s)>=0?'b':WARN.indexOf(s)>=0?'w':'n';
const chip=(s,tn)=>'<span class="chip '+(tn||tone(s))+'">'+esc(L(s))+'</span>';
const TB={};
function regTable(id,cols,rows,opt){TB[id]={cols:cols,rows:rows,opt:opt||{}};if(!S.tbl[id])S.tbl[id]={q:'',s:null,d:1,p:0,n:10,qf:''};}
const cellVal=(c,r)=>{const v=c.sv?c.sv(r):r[c.k];return v==null?'':v;};
function cell(c,r){const v=r[c.k];
 if(c.type==='link'){const dt=c.dt||r[c.dtk];return v?alink(dt,v):'—';}
 if(c.type==='open'){return r.doc?'<a class="op" href="'+dlink(r.dt,r.doc)+'" target="_blank" rel="noopener" title="Open">↗</a>':'—';}
 if(c.type==='num'){return v==null||v===''?'—':num(v,c.d!=null?c.d:(r.dec||0));}
 if(c.type==='chip'){return v===''||v==null?'—':chip(v);}
 if(c.type==='raw'){return v==null||v===''?'—':v;}
 if(c.type==='delay'){return v>0?'<b class="bad">'+Math.floor(v)+'</b>':(v===0?'0':'—');}
 return v==null||v===''?'—':esc(v);}
function drawTable(id){const T0=TB[id],st=S.tbl[id],el=$('#tb_'+id);if(!T0||!el)return;
 let rows=T0.rows.slice();const qfs=T0.opt.qfs;
 if(qfs&&st.qf){const q=qfs.find(x=>x.v===st.qf);if(q)rows=rows.filter(q.fn);}
 if(st.q){const q=st.q.toLowerCase();rows=rows.filter(r=>T0.cols.some(c=>String(cellVal(c,r)).toLowerCase().indexOf(q)>=0||(c.type==='chip'&&L(r[c.k]).toLowerCase().indexOf(q)>=0)));}
 if(st.s){const c=T0.cols.find(x=>x.k===st.s);if(c){rows.sort((a,b)=>{let x=cellVal(c,a),y=cellVal(c,b);const nx=typeof x==='number'||(c.type==='num'||c.type==='delay'),r2=nx?((Number(x)||0)-(Number(y)||0)):String(x).localeCompare(String(y));return r2*st.d;});}}
 const tot=rows.length,pages=Math.max(1,Math.ceil(tot/st.n));if(st.p>=pages)st.p=pages-1;const pg=rows.slice(st.p*st.n,st.p*st.n+st.n);
 let h='<div class="tbar"><input class="srch" data-act="tq" data-id="'+id+'" placeholder="'+esc(t('q'))+'" value="'+esc(st.q)+'">';
 if(qfs)h+='<select class="sel" data-act="tqf" data-id="'+id+'">'+qfs.map(q=>'<option value="'+q.v+'"'+(q.v===st.qf?' selected':'')+'>'+esc(t(q.l))+'</option>').join('')+'</select>';
 h+='<select class="sel sm" data-act="tn" data-id="'+id+'">'+[10,25,50,100].map(n=>'<option'+(n===st.n?' selected':'')+'>'+n+'</option>').join('')+'</select><span class="cnt">'+num(tot)+' '+t('records')+'</span></div>';
 if(!tot){h+='<div class="empty">'+esc(T0.rows.length?t('noRec'):t('noRec'))+'</div>';el.innerHTML=h;return;}
 h+='<div class="tsc"><table><thead><tr>'+T0.cols.map(c=>'<th class="'+(c.type==='num'||c.type==='delay'?'r ':'')+'" data-act="ts" data-id="'+id+'" data-k="'+c.k+'">'+esc(t(c.l))+(st.s===c.k?(st.d>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>';
 pg.forEach(r=>{h+='<tr class="'+(r._bad?'rowbad':'')+'">'+T0.cols.map(c=>'<td class="'+(c.type==='num'||c.type==='delay'?'r':'')+'">'+cell(c,r)+'</td>').join('')+'</tr>';});
 h+='</tbody></table></div><div class="pgn"><button class="btn sm" data-act="tp" data-id="'+id+'" data-d="-1"'+(st.p<=0?' disabled':'')+'>'+esc(t('prev'))+'</button><span>'+t('page')+' '+(st.p+1)+' '+t('of')+' '+pages+'</span><button class="btn sm" data-act="tp" data-id="'+id+'" data-d="1"'+(st.p>=pages-1?' disabled':'')+'>'+esc(t('next'))+'</button></div>';
 el.innerHTML=h;}
const tableBox=id=>'<div class="tbw" id="tb_'+id+'"></div>';
function health(names){let st='ok';for(const n of names){const d=S.ds[n];if(!d){if(S.loading)return'loading';st='unavail';continue;}if(!d.ok){return d.code===403?'denied':'failed';}if(d.incomplete&&st==='ok')st='incomplete';}return st;}
const HMSG={loading:'loading',denied:'denied',failed:'failed',unavail:'unavail',incomplete:'incomplete'};
function kpi(key,label,val,sub,names,opt){opt=opt||{};const h=health(names);const bad=h!=='ok'&&h!=='incomplete';
 const v=bad?'—':val;
 return '<button class="kpi'+(opt.tone?' '+opt.tone:'')+(bad?' dis':'')+'" data-act="drill" data-k="'+key+'" '+(bad?'disabled':'')+' title="'+esc(bad||h==='incomplete'?t(HMSG[h]):t('drillhint'))+'"><span class="kl">'+esc(t(label))+'</span><span class="kv">'+(h==='loading'?'<i class="sk"></i>':esc(v))+'</span><span class="ks">'+(bad?esc(t(HMSG[h])):(h==='incomplete'?'⚠ '+esc(t('incomplete')):esc(sub||'')))+'</span></button>';}
function card(title,body,cls){return '<section class="cd '+(cls||'')+'"><h3>'+esc(t(title))+'</h3>'+body+'</section>';}
function unavailBox(names){const h=health(names);if(h==='ok'||h==='incomplete')return '';return '<div class="empty '+(h==='loading'?'ld':'er')+'">'+esc(t(HMSG[h]))+'</div>';}
function donut(items,labelFn){items=items.filter(i=>i.v>0);const tot=sum(items,i=>i.v);if(!tot)return '<div class="empty">'+esc(t('noRec'))+'</div>';
 let off=0;const r=44,C=2*Math.PI*r;let arcs='';items.forEach((i,ix)=>{const len=i.v/tot*C;arcs+='<circle r="'+r+'" cx="60" cy="60" fill="none" stroke="'+COL[ix%COL.length]+'" stroke-width="18" stroke-dasharray="'+len+' '+(C-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 60 60)"></circle>';off+=len;});
 return '<div class="dn"><svg viewBox="0 0 120 120" class="dsv" role="img">'+arcs+'<text x="60" y="64" text-anchor="middle" class="dtx">'+num(tot)+'</text></svg><ul class="lg">'+items.map((i,ix)=>'<li><i style="background:'+COL[ix%COL.length]+'"></i><span>'+esc(i.l)+'</span><b>'+(labelFn?labelFn(i.v):num(i.v))+'</b></li>').join('')+'</ul></div>';}
function hbar(items,fmt,max){items=items.filter(i=>i.v!==0&&i.v!=null);if(!items.length)return '<div class="empty">'+esc(t('noRec'))+'</div>';items=items.sort((a,b)=>b.v-a.v).slice(0,max||8);const mx=Math.max.apply(null,items.map(i=>Math.abs(i.v)))||1;
 return '<div class="hb">'+items.map(i=>'<div class="hr"><span class="hl" title="'+esc(i.l)+'">'+esc(i.l)+'</span><span class="ht"><i style="width:'+Math.max(2,Math.abs(i.v)/mx*100)+'%"></i></span><b>'+(fmt?fmt(i.v):num(i.v))+'</b></div>').join('')+'</div>';}
function cols(items,fmt){if(!items.length||!items.some(i=>i.v))return '<div class="empty">'+esc(t('noRec'))+'</div>';const mx=Math.max.apply(null,items.map(i=>i.v))||1;
 return '<div class="cl">'+items.map(i=>'<div class="cc" title="'+esc(i.l)+': '+(fmt?fmt(i.v):num(i.v))+'"><b>'+(fmt?fmt(i.v):num(i.v))+'</b><span class="cb"><i style="height:'+Math.max(2,i.v/mx*100)+'%"></i></span><em>'+esc(i.l)+'</em></div>').join('')+'</div>';}
const cnt=(a,f)=>{const m=new Map();a.forEach(x=>{const k=f(x);m.set(k,(m.get(k)||0)+1)});return Array.from(m,([l,v])=>({l:l,v:v}));};
const agg=(a,kf,vf)=>{const m=new Map();a.forEach(x=>{const k=kf(x);m.set(k,(m.get(k)||0)+(Number(vf(x))||0))});return Array.from(m,([l,v])=>({l:l,v:v}));};
const monthly=(a,df,vf)=>agg(a.filter(x=>df(x)),x=>mon(df(x)),vf).sort((x,y)=>x.l<y.l?-1:1);
const stdCols=[{k:'doc',l:'h_doc',type:'link',dtk:'dt'},{k:'date',l:'h_date'},{k:'supplier',l:'h_supplier'},{k:'company',l:'h_company'},{k:'amt',l:'h_amt',type:'num'},{k:'status',l:'h_status',type:'chip'},{k:'open',l:'h_open',type:'open'}];
const poRow=(p,amt,dec)=>({dt:'Purchase Order',doc:p.name,date:p.transaction_date,supplier:p.supplier_name||p.supplier,company:p.company,amt:amt==null?p.val:amt,dec:dec||0,status:p.sst||p.status,_bad:p.delayed});


EN.h_nr='Not Recorded in ERP';AR.h_nr='غير مسجل في النظام';EN.d_noatt='No attachments';AR.d_noatt='لا مرفقات';
EN.k_s_next='Arriving ≤ 7 Days';AR.k_s_next='وصول خلال ٧ أيام';EN.k_s_over='Past ETA (Not Cleared/Received)';AR.k_s_over='تجاوزت الوصول المقدر';EN.k_s_noeta='No ETA Recorded';AR.k_s_noeta='بلا وصول مقدر';
EN.k_nostat='No Shipment Status';AR.k_nostat='بدون حالة شحن';EN.k_nocust='Customs Status Not Recorded';AR.k_nocust='حالة الجمارك غير مسجلة';EN.nostat_b='No status';AR.nostat_b='بدون حالة';EN.stg_ok='Stage buckets (including “No status”) add up to';AR.stg_ok='مجموع فئات المراحل (بما فيها «بدون حالة») يساوي';EN.ship_u='shipments';AR.ship_u='شحنة';EN.po_scope='Submitted POs';AR.po_scope='أوامر شراء معتمدة';
EN.k_d_all='Shipments Assessed';AR.k_d_all='الشحنات المقيّمة';EN.k_d_att='With Attachments';AR.k_d_att='لها مرفقات';EN.k_d_full='All Verifiable Recorded';AR.k_d_full='كل المستندات القابلة للتحقق مسجلة';EN.k_d_bl='BL Recorded';AR.k_d_bl='بوليصة مسجلة';EN.k_d_saber='SABER Recorded';AR.k_d_saber='سابر مسجل';
EN.h_ccount='Receipts';AR.h_ccount='الإيصالات';EN.h_n='Docs';AR.h_n='مستندات';
const FL=()=>S.f;
const stMatch=p=>!S.f.status||(S.f.status==='__none'?!p.sst:p.sst===S.f.status);
const STAT_LIST=['Order Received','Order Processing','Shipped Full Qty','Shipped Partial Qty','In Transit','In Customs','Out for Delivery','Delivered','Awaiting Pickup','Shipment Delayed'];
const D=S.D;
const PR_OPEN=['To Receive','To Receive and Bill'];
const PRED={nostat:p=>!p.sst,nocust:p=>!p.cst,transit:p=>p.transit,pend:p=>p.pend,hold:p=>p.shipped&&!p.cleared&&p.rec<100&&(p.hold||p.delayed),clear:p=>p.cleared,insp:p=>p.insp,chold:p=>p.hold&&!p.cleared,delay:p=>p.delayed};
function lcvTot(){const L0=(D.lcv&&D.lcv.rows)||[];const m=new Map();L0.forEach(v=>v.recs.forEach(r=>m.set(r.receipt_document,Number(r.grand_total)||0)));const goods=Array.from(m.values()).reduce((a,b)=>a+b,0);return{goods:goods,chg:sum(L0,v=>v.chg),cust:sum(L0,v=>v.cust),oth:sum(L0,v=>v.oth),n:L0.length};}
function lines(){const pm=new Map(D.pos.map(p=>[p.name,p]));const byItem=(D.prx&&D.prx.byItem)||new Map();return (D.items||[]).filter(i=>pm.has(i.parent)).map(i=>{const p=pm.get(i.parent);const q=Number(i.qty)||0,r=Number(i.received_qty)||0;const closed=p.status==='Closed';const pen=closed?0:Math.max(q-r,0);
 const st=r>=q?'Fully Received':(closed?(r>0?'Closed Short':'Closed - Not Received'):(r>0?'Partially Received':'Pending Receipt'));const pr=byItem.get(i.name);
 const over=!closed&&p.status!=='Completed'&&pen>0&&i.schedule_date&&i.schedule_date<TODAY;const vr=(closed||p.status==='Completed')&&Math.abs(r-q)>0.0001;
 return{dt:'Purchase Order',doc:p.name,date:p.transaction_date,supplier:p.supplier_name||p.supplier,company:p.company,item:i.item_code+(i.item_name?' — '+i.item_name:''),ord:q,rec:r,pen:pen,wh:i.warehouse||'',pr:pr?pr.pr:'',pdate:pr?pr.date:'',sched:i.schedule_date||'',status:st,amt:pen,dec:2,over:over,variance:vr,vq:r-q,_bad:over};});}
const lineCols=[{k:'doc',l:'h_po',type:'link',dt:'Purchase Order'},{k:'supplier',l:'h_supplier'},{k:'company',l:'h_company'},{k:'item',l:'h_item'},{k:'ord',l:'h_ord',type:'num',d:2},{k:'rec',l:'h_rec',type:'num',d:2},{k:'pen',l:'h_pen',type:'num',d:2},{k:'wh',l:'h_wh'},{k:'pr',l:'h_pr',type:'link',dt:'Purchase Receipt'},{k:'pdate',l:'h_pdate'},{k:'sched',l:'h_sched'},{k:'status',l:'h_status',type:'chip'},{k:'open',l:'h_open',type:'open'}];
function lcvRow(v,amt){return{dt:'Landed Cost Voucher',doc:v.name,date:v.date,supplier:v.sups.join(', '),company:v.company,amt:amt,dec:2,status:'Submitted'};}
function piRow(x,amt){return{dt:'Purchase Invoice',doc:x.name,date:x.posting_date,supplier:x.supplier_name||x.supplier,company:x.company,amt:amt,dec:2,status:x.pst,_bad:x.pst==='Overdue'};}
function drillFor(k){const P=D.pos,Sh=D.ship,Lc=(D.lcv&&D.lcv.rows)||[];const pr=(a,f)=>a.map(p=>poRow(p,f?f(p):null));
 switch(k){
 case 'po':return{rows:pr(P)};case 'ship':return{rows:pr(Sh)};case 'transit':return{rows:pr(Sh.filter(PRED.transit))};case 'pend':return{rows:pr(Sh.filter(PRED.pend))};
 case 'nostat':return{rows:pr(Sh.filter(PRED.nostat))};case 'nocust':return{rows:pr(Sh.filter(PRED.nocust))};
 case 'hold':return{rows:pr(Sh.filter(PRED.hold))};case 'clear':return{rows:pr(Sh.filter(PRED.clear))};case 'recv':return{rows:pr(P.filter(p=>p.rec>=100))};
 case 'pgr':return{rows:pr(P.filter(p=>PR_OPEN.indexOf(p.status)>=0))};case 'val':return{rows:pr(Sh)};
 case 'cc':case 'l_cust':return{rows:Lc.filter(v=>v.cust).map(v=>lcvRow(v,v.cust))};case 'lc':case 'l_total':return{rows:Lc.map(v=>lcvRow(v,v.goods+v.chg))};
 case 'l_cnt':return{rows:Lc.map(v=>lcvRow(v,v.chg))};case 'l_goods':return{rows:Lc.map(v=>lcvRow(v,v.goods))};case 'l_chg':return{rows:Lc.map(v=>lcvRow(v,v.chg))};
 case 'out':case 'p_out':return{rows:D.pi.filter(x=>Math.abs(x.out)>0.005).map(x=>piRow(x,x.out))};case 'p_inv':return{rows:D.pi.map(x=>piRow(x,x.tot))};
 case 'p_paid':return{rows:D.pi.filter(x=>x.pst==='Paid').map(x=>piRow(x,x.tot))};case 'p_unpaid':return{rows:D.pi.filter(x=>x.pst==='Unpaid'||x.pst==='Partly Paid'||x.pst==='Overdue').map(x=>piRow(x,x.out))};
 case 'p_over':return{rows:D.pi.filter(x=>x.pst==='Overdue').map(x=>piRow(x,x.out))};
 case 'p_pay':return{rows:D.pe.map(x=>({dt:'Payment Entry',doc:x.name,date:x.posting_date,supplier:x.party_name||x.party,company:x.company,amt:Number(x.base_paid_amount)||0,dec:2,status:'Paid'}))};
 case 'p_cflag':return{rows:P.filter(p=>p.custom_customs_charges_paid).map(p=>poRow(p,Number(p.custom_customs_charges)||0,2))};
 case 'c_pend':return{rows:pr(Sh.filter(PRED.pend))};case 'c_insp':return{rows:pr(Sh.filter(PRED.insp))};case 'c_hold':return{rows:pr(Sh.filter(PRED.chold))};case 'c_clear':return{rows:pr(Sh.filter(PRED.clear))};case 'c_delay':return{rows:pr(Sh.filter(PRED.delay))};
 case 'c_chg':return{rows:pr(Sh.filter(p=>Number(p.custom_customs_charges)),p=>Number(p.custom_customs_charges)||0)};
 case 's_next7':return{rows:pr(Sh.filter(p=>p.eta&&p.eta>=TODAY&&p.eta<=iso(new Date(TD.getTime()+7*864e5))&&p.rec<100))};
 case 's_overdue':return{rows:pr(Sh.filter(p=>p.eta&&p.eta<TODAY&&!p.cleared&&p.rec<100&&p.shipped))};case 's_noeta':return{rows:pr(Sh.filter(p=>!p.eta&&p.shipped&&p.rec<100))};
 }
 if(k[0]==='g'){const ln=lines();const f={g_full:x=>x.status==='Fully Received',g_part:x=>x.status==='Partially Received',g_pend:x=>x.status==='Pending Receipt',g_over:x=>x.over,g_var:x=>x.variance}[k];return{rows:ln.filter(f),lines:true};}
 return{rows:[]};}
const KPIT={nostat:'k_nostat',nocust:'k_nocust',po:'k_po',ship:'k_ship',transit:'k_transit',pend:'k_pend',hold:'k_hold',clear:'k_clear',recv:'k_recv',pgr:'k_pgr',val:'k_val',cc:'k_cc',lc:'k_lc',out:'k_out'};
function openDrill(k){const d=drillFor(k);const title=KPIT[k]||('k_'+k);S.drill={k:k,title:title,lines:d.lines};
 regTable('dr',d.lines?lineCols:stdCols.map(c=>c.k==='amt'?Object.assign({},c,{l:(['val','cc','lc','out','l_cust','l_total','l_goods','l_chg','l_cnt','p_out','p_inv','p_paid','p_unpaid','p_over','p_pay','p_cflag','c_chg'].indexOf(k)>=0?'h_amt':'h_amt')}):c),d.rows);
 S.tbl.dr={q:'',s:null,d:1,p:0,n:10,qf:''};drawModal();}
function drawModal(){const m=$('#mdl');if(!S.drill){m.innerHTML='';return;}m.innerHTML='<div class="mo" data-act="close"><div class="md" role="dialog"><div class="mh"><h2>'+esc(t(S.drill.title))+'</h2><button class="btn sm" data-act="close">'+esc(t('close'))+' ✕</button></div><div class="mb">'+tableBox('dr')+'</div></div></div>';drawTable('dr');}
const note=k=>'<p class="nt">'+esc(t(k))+'</p>';
const pctS=(a,b)=>b?(a/b*100).toFixed(0)+'%':'—';
function vOverview(){const P=D.pos||[],Sh=D.ship||[];const lt=lcvTot();const pn=['po'],ln=['lcv','lcvc','lcvr'];
 const g=(key,lbl,val,sub,names,tn)=>kpi(key,lbl,val,sub,names,{tone:tn});
 let h='<div class="kg">'+
 g('po','k_po',num(P.length),t('po_scope')+' · '+(S.f.from||'…')+' → '+(S.f.to||'…')+(S.f.company?' · '+S.f.company:'')+(S.f.supplier?' · '+S.f.supplier:''),pn)+g('ship','k_ship',num(Sh.length),'',pn)+g('transit','k_transit',num(Sh.filter(PRED.transit).length),'',pn)+g('pend','k_pend',num(Sh.filter(PRED.pend).length),'',pn,'w')+
 g('hold','k_hold',num(Sh.filter(PRED.hold).length),'',pn,'b')+g('clear','k_clear',num(Sh.filter(PRED.clear).length),'',pn,'g')+g('nostat','k_nostat',num(Sh.filter(PRED.nostat).length),pctS(Sh.filter(PRED.nostat).length,Sh.length)+' '+t('k_ship'),pn,'w')+g('nocust','k_nocust',num(Sh.filter(PRED.nocust).length),pctS(Sh.filter(PRED.nocust).length,Sh.length)+' '+t('k_ship'),pn,'w')+g('recv','k_recv',num(P.filter(p=>p.rec>=100).length),pctS(P.filter(p=>p.rec>=100).length,P.length)+' '+t('k_po'),pn,'g')+g('pgr','k_pgr',num(P.filter(p=>PR_OPEN.indexOf(p.status)>=0).length),'',pn,'w')+
 g('val','k_val',cmp(sum(Sh,p=>p.val)),t('sar')+' '+num(sum(Sh,p=>p.val)),pn)+g('cc','k_cc',cmp(lt.cust),t('sar')+' '+num(lt.cust)+' · LCV',ln)+g('lc','k_lc',cmp(lt.goods+lt.chg),t('sar')+' '+num(lt.goods+lt.chg),ln)+g('out','k_out',cmp(sum(D.pi||[],x=>x.out)),t('sar')+' '+num(sum(D.pi||[],x=>x.out)),['pi'],'w')+'</div>';
 const sd=cnt(Sh,p=>p.sst||'');const sup=agg(Sh,p=>p.supplier_name||p.supplier,p=>p.val);const ctry=agg(Sh,p=>p.country||'?',p=>p.val);
 h+='<div class="gr">'+card('c_status',donut(sd.map(x=>({l:x.l===''?t('nostat_b'):L(x.l),v:x.v}))))+card('c_month',cols(monthly(Sh,p=>p.transaction_date,p=>p.val).map(x=>({l:x.l,v:x.v})),cmp))+card('c_customs',donut(cnt(Sh,p=>p.cstate).map(x=>({l:L(x.l),v:x.v}))))+
 card('c_country',hbar(ctry.map(x=>({l:x.l==='?'?L('Unknown'):x.l,v:x.v})),cmp))+card('c_supplier',hbar(sup,cmp))+card('c_grc',donut([{l:L('Fully Received PO'),v:P.filter(p=>p.rec>=100).length},{l:L('Partial'),v:P.filter(p=>p.rec>0&&p.rec<100).length},{l:L('Not Received'),v:P.filter(p=>p.rec<=0).length}]))+'</div>';
 h+='<p class="nt">'+esc(t('stg_ok'))+' <b>'+num(sd.reduce((a,x)=>a+x.v,0))+'</b> '+esc(t('ship_u'))+(sd.reduce((a,x)=>a+x.v,0)===Sh.length?' ✓':' ⚠ ('+num(Sh.length)+')')+'</p>';
 return h;}
function shipRows(){return (D.ship||[]).map(p=>({dt:'Purchase Order',doc:p.name,supplier:p.supplier_name||p.supplier,company:p.company,country:p.country,method:'',cont:p.docs.map(d=>d.container_no).filter(Boolean).concat(p.prs.map(r=>r.cont).filter(Boolean)).filter((v,i,a)=>a.indexOf(v)===i).join(', '),bl:p.docs.map(d=>d.bl_no).filter(Boolean).join(', '),sdate:p.custom_loading_date||'',eta:p.eta,arr:p.arr,val:p.val,status:p.sst||'Order Received',late:p.delayed?Math.floor(p.late):(p.eta?0:null),_bad:p.delayed,_p:p}));}
function vShip(){const Sh=D.ship||[];const rows=shipRows();const nx=iso(new Date(TD.getTime()+7*864e5));
 let h='<div class="kg k4">'+kpi('ship','k_ship',num(Sh.length),'',['po'])+kpi('s_next7','k_s_next',num(Sh.filter(p=>p.eta&&p.eta>=TODAY&&p.eta<=nx&&p.rec<100).length),'',['po'])+kpi('s_overdue','k_s_over',num(Sh.filter(p=>p.eta&&p.eta<TODAY&&!p.cleared&&p.rec<100&&p.shipped).length),'',['po'],{tone:'b'})+kpi('s_noeta','k_s_noeta',num(Sh.filter(p=>!p.eta&&p.shipped&&p.rec<100).length),'',['po'],{tone:'w'})+'</div>';
 const cols0=[{k:'doc',l:'h_ref',type:'link',dt:'Purchase Order'},{k:'supplier',l:'h_supplier'},{k:'company',l:'h_company'},{k:'country',l:'h_country'},{k:'method',l:'h_method'},{k:'cont',l:'h_cont'},{k:'bl',l:'h_bl'},{k:'sdate',l:'h_sdate'},{k:'eta',l:'h_eta'},{k:'arr',l:'h_act'},{k:'val',l:'h_val',type:'num'},{k:'status',l:'h_status',type:'chip'},{k:'late',l:'h_delay',type:'delay'}];
 regTable('ship',cols0,rows,{qfs:[{v:'',l:'qf_all',fn:()=>true},{v:'d',l:'qf_delayed',fn:r=>r._p.delayed},{v:'n',l:'qf_notcleared',fn:r=>!r._p.cleared},{v:'c',l:'qf_cleared',fn:r=>r._p.cleared},{v:'y',l:'qf_dry',fn:r=>!r._p.shipped}]});
 return h+card('t_ship',unavailBox(['po'])+tableBox('ship'),'wide');}
function vCustoms(){const Sh=D.ship||[];const n=f=>num(Sh.filter(f).length);const pn=['po'];
 let h='<div class="kg k6">'+kpi('c_pend','k_c_pend',n(PRED.pend),'',pn,{tone:'w'})+kpi('c_insp','k_c_insp',n(PRED.insp),'',pn,{tone:'w'})+kpi('c_hold','k_c_hold',n(PRED.chold),'',pn,{tone:'b'})+kpi('c_clear','k_c_clear',n(PRED.clear),'',pn,{tone:'g'})+kpi('c_delay','k_c_delay',n(PRED.delay),'',pn,{tone:'b'})+kpi('c_chg','k_c_chg',cmp(sum(Sh,p=>p.custom_customs_charges)),t('sar')+' '+num(sum(Sh,p=>p.custom_customs_charges),2),pn)+'</div>';
 const bk=Sh.filter(p=>p.pend).map(p=>p.late>=1?(p.late<=7?'1-7 days':p.late<=30?'8-30 days':'30+ days'):'Not Delayed');
 h+='<div class="gr">'+card('c_customs',donut(cnt(Sh,p=>p.cstate).map(x=>({l:L(x.l),v:x.v}))))+card('c_delay',hbar(cnt(bk.map(b=>({b:b})),x=>x.b).map(x=>({l:L(x.l),v:x.v}))))+card('c_cchg',hbar(agg(Sh,p=>p.supplier_name||p.supplier,p=>p.custom_customs_charges),cmp))+'</div>';
 const rows=Sh.map(p=>({dt:'Purchase Order',doc:p.name,supplier:p.supplier_name||p.supplier,cstat:p.cstate,insp:p.custom_inspection_status||'',docst:p.custom_clearing_document_status||'',duty:Number(p.custom_customs_charges)||0,paid:p.custom_customs_charges_paid?'Paid':'Not Recorded',late:p.delayed?Math.floor(p.late):(p.eta?0:null),eta:p.eta,_bad:p.delayed||p.hold,_p:p}));
 regTable('cust',[{k:'doc',l:'h_ref',type:'link',dt:'Purchase Order'},{k:'supplier',l:'h_supplier'},{k:'cstat',l:'h_cstat',type:'chip'},{k:'insp',l:'h_insp',type:'chip'},{k:'docst',l:'h_docst',type:'chip'},{k:'eta',l:'h_eta'},{k:'duty',l:'h_duty',type:'num',d:2},{k:'paid',l:'h_paid',type:'chip'},{k:'late',l:'h_delay',type:'delay'}],rows,{qfs:[{v:'',l:'qf_all',fn:()=>true},{v:'d',l:'qf_delayed',fn:r=>r._p.delayed},{v:'n',l:'qf_notcleared',fn:r=>!r._p.cleared},{v:'c',l:'qf_cleared',fn:r=>r._p.cleared}]});
 return h+note('note_cust_def')+card('t_customs',unavailBox(pn)+tableBox('cust'),'wide');}
function vGrn(){const nm=['po','poi'];const ln=lines();const c=f=>ln.filter(f).length;
 let h='<div class="kg k5">'+kpi('g_full','k_g_full',num(c(x=>x.status==='Fully Received')),'',nm,{tone:'g'})+kpi('g_part','k_g_part',num(c(x=>x.status==='Partially Received')),'',nm,{tone:'w'})+kpi('g_pend','k_g_pend',num(c(x=>x.status==='Pending Receipt')),'',nm,{tone:'w'})+kpi('g_over','k_g_over',num(c(x=>x.over)),'',nm,{tone:'b'})+kpi('g_var','k_g_var',num(c(x=>x.variance)),'Σ '+num(sum(ln.filter(x=>x.variance),x=>x.vq),2),nm)+'</div>';
 h+='<div class="gr g2">'+card('c_gstat',donut(cnt(ln,x=>x.status).map(x=>({l:L(x.l),v:x.v}))))+card('c_gwh',hbar(agg(ln,x=>x.wh||'?',x=>x.pen).map(x=>({l:x.l,v:x.v})),v=>num(v)))+'</div>';
 regTable('grn',lineCols,ln,{qfs:[{v:'',l:'qf_all',fn:()=>true},{v:'p',l:'k_g_pend',fn:r=>r.status==='Pending Receipt'},{v:'a',l:'k_g_part',fn:r=>r.status==='Partially Received'},{v:'o',l:'k_g_over',fn:r=>r.over},{v:'v',l:'k_g_var',fn:r=>r.variance}]});
 return h+note('note_grn_def')+card('t_grn',unavailBox(nm)+tableBox('grn'),'wide');}
function vLanded(){const nm=['lcv','lcvc','lcvr'];const Lc=(D.lcv&&D.lcv.rows)||[];const lt=lcvTot();
 let h='<div class="kg k5">'+kpi('l_cnt','k_l_cnt',num(lt.n),'',nm)+kpi('l_goods','k_l_goods',cmp(lt.goods),t('sar')+' '+num(lt.goods),nm)+kpi('l_chg','k_l_chg',cmp(lt.chg),t('sar')+' '+num(lt.chg),nm)+kpi('l_cust','k_l_cust',cmp(lt.cust),t('sar')+' '+num(lt.cust),nm,{tone:'w'})+kpi('l_total','k_l_total',cmp(lt.goods+lt.chg),t('sar')+' '+num(lt.goods+lt.chg),nm,{tone:'g'})+'</div>';
 const supAmt=(f)=>{const m=new Map();Lc.forEach(v=>{const g=v.goods;v.recs.forEach(r=>{const sh=g?(Number(r.grand_total)||0)/g:1/Math.max(v.recs.length,1);const k=r.supplier||'?';m.set(k,(m.get(k)||0)+f(v,r,sh));});});return Array.from(m,([l,v])=>({l:l==='?'?L('Unknown'):l,v:v}));};
 h+='<div class="gr">'+card('c_break',donut([{l:L('Goods Cost'),v:lt.goods},{l:L('Customs / Clearing'),v:lt.cust},{l:L('Other Charges'),v:lt.oth}],cmp))+card('c_lmonth',cols(monthly(Lc,v=>v.date,v=>v.goods+v.chg),cmp))+card('c_lsup',hbar(supAmt((v,r,sh)=>(Number(r.grand_total)||0)+v.chg*sh),cmp))+card('c_lcust',hbar(supAmt((v,r,sh)=>v.cust*sh),cmp))+'</div>';
 const rows=Lc.map(v=>({dt:'Landed Cost Voucher',doc:v.name,date:v.date,po:v.po,rcp:v.recs.map(r=>r.receipt_document).join(', '),supplier:v.sups.join(', '),company:v.company,goods:v.goods,cust:v.cust,oth:v.oth,chg:v.chg,tl:v.goods+v.chg,upl:v.goods?v.chg/v.goods*100:null}));
 regTable('lcv',[{k:'doc',l:'h_lcv',type:'link',dt:'Landed Cost Voucher'},{k:'date',l:'h_date'},{k:'po',l:'h_po',type:'link',dt:'Purchase Order'},{k:'rcp',l:'h_pr'},{k:'supplier',l:'h_sup_lc'},{k:'goods',l:'h_goods',type:'num'},{k:'cust',l:'h_cust',type:'num'},{k:'oth',l:'h_oth',type:'num'},{k:'chg',l:'h_tchg',type:'num'},{k:'tl',l:'h_tl',type:'num'},{k:'upl',l:'h_upl',type:'num',d:1}],rows);
 return h+note('note_land_def')+(D.lcv&&D.lcv.excluded?'<p class="nt">'+esc(t('note_lcv_excl'))+' '+num(D.lcv.excluded)+'</p>':'')+card('t_landed',unavailBox(nm)+tableBox('lcv'),'wide');}
function vPay(){const nm=['pi'];const pi=D.pi||[],pe=D.pe||[];const c=f=>pi.filter(f).length;const pos=D.pos||[];
 let h='<div class="kg k4">'+kpi('p_inv','k_p_inv',num(pi.length),t('sar')+' '+cmp(sum(pi,x=>x.tot)),nm)+kpi('p_out','k_p_out',cmp(sum(pi,x=>x.out)),t('sar')+' '+num(sum(pi,x=>x.out)),nm,{tone:'w'})+kpi('p_paid','k_p_paid',num(c(x=>x.pst==='Paid')),'',nm,{tone:'g'})+kpi('p_unpaid','k_p_unpaid',num(c(x=>x.pst==='Unpaid'||x.pst==='Partly Paid'||x.pst==='Overdue')),'',nm,{tone:'w'})+kpi('p_over','k_p_over',num(c(x=>x.pst==='Overdue')),t('sar')+' '+cmp(sum(pi.filter(x=>x.pst==='Overdue'),x=>x.out)),nm,{tone:'b'})+kpi('p_pay','k_p_pay',cmp(sum(pe,x=>x.base_paid_amount)),num(pe.length)+' '+t('records'),['pe'])+kpi('p_cflag','k_p_cflag',num(pos.filter(p=>p.custom_customs_charges_paid).length),t('sar')+' '+num(sum(pos.filter(p=>p.custom_customs_charges_paid),p=>p.custom_customs_charges),2),['po'])+'</div>';
 h+='<div class="gr g3">'+card('c_ptrend',cols(monthly(pe,x=>x.posting_date,x=>x.base_paid_amount),cmp))+card('c_pstat',donut(cnt(pi,x=>x.pst).map(x=>({l:L(x.l),v:x.v}))))+card('t_pay',hbar(agg(pi.filter(x=>x.out>0),x=>x.supplier_name||x.supplier,x=>x.out),cmp))+'</div>';
 const lk=D.pil||new Map();
 regTable('pi',[{k:'doc',l:'h_inv',type:'link',dt:'Purchase Invoice'},{k:'supplier',l:'h_supplier'},{k:'company',l:'h_company'},{k:'date',l:'h_date'},{k:'tot',l:'h_iamt',type:'num',d:2},{k:'paid',l:'h_pamt',type:'num',d:2},{k:'out',l:'h_oamt',type:'num',d:2},{k:'due',l:'h_due'},{k:'status',l:'h_status',type:'chip'},{k:'po',l:'h_lpo',type:'link',dt:'Purchase Order'}],pi.map(x=>({dt:'Purchase Invoice',doc:x.name,supplier:x.supplier_name||x.supplier,company:x.company,date:x.posting_date,tot:x.tot,paid:x.paid,out:x.out,due:x.due_date||'',status:x.pst,po:lk.get(x.name)||'',_bad:x.pst==='Overdue'})),{qfs:[{v:'',l:'qf_all',fn:()=>true},{v:'o',l:'k_p_over',fn:r=>r.status==='Overdue'},{v:'u',l:'k_p_unpaid',fn:r=>['Unpaid','Partly Paid','Overdue'].indexOf(r.status)>=0},{v:'p',l:'k_p_paid',fn:r=>r.status==='Paid'}]});
 regTable('pe',[{k:'doc',l:'h_pe',type:'link',dt:'Payment Entry'},{k:'date',l:'h_date'},{k:'supplier',l:'h_party'},{k:'company',l:'h_company'},{k:'amt',l:'h_pamt',type:'num',d:2},{k:'unal',l:'h_unal',type:'num',d:2}],pe.map(x=>({dt:'Payment Entry',doc:x.name,date:x.posting_date,supplier:x.party_name||x.party,company:x.company,amt:Number(x.base_paid_amount)||0,unal:Number(x.unallocated_amount)||0})));
 return h+note('note_pay_def')+card('t_pay',unavailBox(nm)+tableBox('pi'),'wide')+card('k_p_pay',unavailBox(['pe'])+tableBox('pe'),'wide');}
function docRows(){const files=D.files||[];const fm=groupBy(files,f=>f.attached_to_name);return (D.ship||[]).map(p=>{const bl=p.docs.map(d=>d.bl_no).filter(Boolean);const pf=fm.get(p.name)||[];const rf=[];p.prs.forEach(r=>(fm.get(r.pr)||[]).forEach(f=>rf.push(f)));const all=pf.concat(rf);
 const c={d_ci:p.custom_invoice_number?'Recorded':'Not Recorded',d_pl:'Not Verified',d_bl:(bl.length||['Received','Verified','Submitted'].indexOf(p.custom_original_bl_status)>=0)?'Recorded':'Not Recorded',d_co:'Not Verified',d_cd:p.custom_clearing_document_status==='Submitted to Customs'?'Submitted':(p.custom_clearing_document_status==='Documents Received'?'Received':'Not Recorded'),d_saber:p.custom_saber_status==='Submitted'?'Submitted':(p.custom_saber_status==='Received'?'Received':'Not Recorded'),d_cp:p.custom_customs_charges_paid?'Recorded':'Not Recorded',d_grn:p.prs.length?'Received':'Not Recorded'};
 const ver=['d_ci','d_bl','d_cd','d_saber','d_cp','d_grn'];const okc=ver.filter(k=>c[k]!=='Not Recorded');const nr=ver.filter(k=>c[k]==='Not Recorded').map(k=>t(k));
 return Object.assign({dt:'Purchase Order',doc:p.name,supplier:p.supplier_name||p.supplier,att:all.length,ref:all.slice(0,2).map(f=>f.file_name).join(' | ')+(all.length>2?' …':''),nr:nr.join(', '),sum:okc.length+'/'+ver.length,okn:okc.length,_bad:false},c);});}
function vDocs(){const rows=docRows();const nm=['po'];const full=rows.filter(r=>r.okn===6).length;
 let h='<div class="kg k5"><div class="kpi nd"><span class="kl">'+esc(t('k_d_all'))+'</span><span class="kv">'+num(rows.length)+'</span></div><div class="kpi nd"><span class="kl">'+esc(t('k_d_att'))+'</span><span class="kv">'+num(rows.filter(r=>r.att>0).length)+'</span></div><div class="kpi nd g"><span class="kl">'+esc(t('k_d_full'))+'</span><span class="kv">'+num(full)+'</span></div><div class="kpi nd"><span class="kl">'+esc(t('k_d_bl'))+'</span><span class="kv">'+num(rows.filter(r=>r.d_bl==='Recorded').length)+'</span></div><div class="kpi nd"><span class="kl">'+esc(t('k_d_saber'))+'</span><span class="kv">'+num(rows.filter(r=>r.d_saber!=='Not Recorded').length)+'</span></div></div>';
 const cc=['d_ci','d_pl','d_bl','d_co','d_cd','d_saber','d_cp','d_grn'].map(k=>({k:k,l:k,type:'chip'}));
 regTable('docs',[{k:'doc',l:'h_ref',type:'link',dt:'Purchase Order'},{k:'supplier',l:'h_supplier'}].concat(cc,[{k:'att',l:'h_att',type:'num'},{k:'ref',l:'h_n'},{k:'nr',l:'h_nr'},{k:'sum',l:'h_comp'}]),rows);
 return h+note('note_docs_def')+card('t_docs',unavailBox(nm.concat(['files']))+tableBox('docs'),'wide');}
const VIEWS={overview:vOverview,ship:vShip,customs:vCustoms,grn:vGrn,landed:vLanded,pay:vPay,docs:vDocs};
const TABS=['overview','ship','customs','grn','landed','pay','docs'];
function renderHeader(){const f=S.f;$('#hdr').innerHTML='<div class="hd"><div class="hdt"><div><h1>'+esc(t('title'))+'</h1><p>'+esc(t('subtitle'))+'</p></div><div class="hda"><button class="btn" data-act="lang">'+esc(t('lang'))+'</button><button class="btn pri" data-act="refresh" id="rfb">⟳ '+esc(t('refresh'))+'</button><span class="stamp" id="stamp"></span></div></div><div class="flt">'+
 '<label>'+esc(t('company'))+'<select id="f_company" data-act="f"><option value="">'+esc(t('all'))+'</option>'+(S.companies||[]).map(c=>'<option'+(c===f.company?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label>'+
 '<label>'+esc(t('from'))+'<input type="date" id="f_from" data-act="f" value="'+esc(f.from)+'"></label><label>'+esc(t('to'))+'<input type="date" id="f_to" data-act="f" value="'+esc(f.to)+'"></label>'+
 '<label>'+esc(t('supplier'))+'<input id="f_supplier" data-act="fs" list="dl_sup" placeholder="'+esc(t('all'))+'" value="'+esc(f.supplier)+'"><datalist id="dl_sup"></datalist></label>'+
 '<label>'+esc(t('status'))+'<select id="f_status" data-act="f"><option value="">'+esc(t('all'))+'</option>'+STAT_LIST.map(s=>'<option value="'+s+'"'+(s===f.status?' selected':'')+'>'+esc(L(s))+'</option>').join('')+'<option value="__none"'+(f.status==='__none'?' selected':'')+'>'+esc(t('notset'))+'</option></select></label>'+
 '<button class="btn sm" data-act="resetf">'+esc(t('reset_f'))+'</button></div></div>';setStamp();}
function setStamp(){const e=$('#stamp');if(e)e.textContent=S.stamp?t('lastref')+': '+S.stamp:'';const b=$('#rfb');if(b)b.disabled=!!S.loading;}
function renderTabs(){$('#tabs').innerHTML=TABS.map(k=>'<button class="tab'+(k===S.tab?' on':'')+'" data-act="tab" data-k="'+k+'">'+esc(t('t_'+k))+'</button>').join('');}
function renderNotices(){let h='';const bad=Object.keys(S.ds).filter(k=>!S.ds[k].ok);const inc=Object.keys(S.ds).filter(k=>S.ds[k].ok&&S.ds[k].incomplete);
 bad.forEach(k=>{h+='<div class="al er">⚠ '+esc(k)+': '+esc(S.ds[k].code===403?t('denied'):t('failed'))+'</div>';});inc.forEach(k=>{h+='<div class="al w">⚠ '+esc(k)+': '+esc(t('incomplete'))+'</div>';});
 if(S.f.status&&['overview','landed','pay'].indexOf(S.tab)>=0)h+='<div class="al i">ℹ '+esc(t('note_stat_na'))+'</div>';
 h+='<details class="al i"><summary>ℹ '+esc(S.lang==='ar'?'ملاحظات البيانات والنطاق':'Data scope & notes')+'</summary><p>'+esc(t('note_scope'))+'</p><p>'+esc(t('note_dates'))+'</p><p>'+esc(t('note_unavail'))+'</p></details>';$('#nts').innerHTML=h;}
function renderView(){Object.keys(TB).forEach(k=>{if(k!=='dr')delete TB[k];});const v=$('#view');const sy=window.scrollY;v.innerHTML=VIEWS[S.tab]();Object.keys(TB).forEach(k=>{if(k!=='dr')drawTable(k);});renderNotices();renderTabs();if(S.drill)drawModal();}
function renderAll(){$('#cpd').setAttribute('dir',S.lang==='ar'?'rtl':'ltr');$('#cpd').classList.toggle('ar',S.lang==='ar');renderHeader();renderView();}


D.pos=[];D.ship=[];D.pi=[];D.pe=[];D.items=null;D.files=null;D.lcv=null;D.prx=null;D.pil=new Map();
function getPIL(){return memo('pil',async()=>{const r=await fetchIn({doctype:'Purchase Invoice Item',parent:'Purchase Invoice',fields:['parent','purchase_order'],filters:[['purchase_order','!=','']]},'parent',(D.pi||[]).map(x=>x.name),150);setDs('pil',r);const m=new Map();r.rows.forEach(x=>{if(!m.has(x.parent))m.set(x.parent,x.purchase_order);});return m;});}
async function ensureTab(tok){
 try{
 if(S.tab==='grn'&&D.pos.length&&!D.items){const names=D.pos.map(p=>p.name);const [it,px]=await Promise.all([getItems(D.pos),getPR(names)]);if(tok!==S.tok)return;D.items=it;D.prx=px;renderView();}
 if(S.tab==='pay'&&D.pi&&D.pi.length&&!D.pilLoaded){const m=await getPIL();if(tok!==S.tok)return;D.pil=m;D.pilLoaded=true;renderView();}
 if(S.tab==='docs'&&D.ship.length&&!D.files){const names=D.ship.map(p=>p.name).concat([].concat.apply([],D.ship.map(p=>p.prs.map(r=>r.pr))));const f=await getFiles(names);if(tok!==S.tok)return;D.files=f;renderView();}
 }catch(e){console.error(e);}}
let lastScope='';
async function loadAll(force){const tok=++S.tok;const sk=scopeKey();
 if(force){S.cache={};}
 if(force)S.dsAll={};S.dsAll=S.dsAll||{};S.ds=S.dsAll[sk]||(S.dsAll[sk]={});if(force||sk!==lastScope){D.pos=[];D.ship=[];D.pi=[];D.pe=[];D.lcv=null;D.items=null;D.files=null;D.prx=null;D.pilLoaded=false;D.pil=new Map();lastScope=sk;}
 else{D.items=null;D.files=null;}
 S.loading++;setStamp();renderView();
 try{
  const raw=await getPOs();if(tok!==S.tok)return;
  let pos=raw.map(p=>derive(p,null));const ex=await getExtras(pos.filter(p=>p.isShip));if(tok!==S.tok)return;
  pos=raw.map(p=>derive(p,ex)).filter(stMatch);D.pos=pos;D.ship=pos.filter(p=>p.isShip);D.ex=ex;renderView();
  await Promise.all([getLCV().then(v=>{if(tok===S.tok){D.lcv=v;renderView();}}),getPI().then(v=>{if(tok===S.tok){D.pi=v;renderView();}}),getPE().then(v=>{if(tok===S.tok){D.pe=v;renderView();}})]);
  if(tok!==S.tok)return;
 }catch(e){console.error(e);S.ds.po=S.ds.po||{ok:false,code:0};}
 finally{if(tok===S.tok){S.loading=Math.max(0,S.loading-1);S.stamp=new Date().toLocaleString('en-GB');setStamp();renderView();}else{S.loading=Math.max(0,S.loading-1);}}
 await ensureTab(tok);}
S.tok=0;
let supT=null;
R.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a==='tab'){S.tab=el.dataset.k;S.drill=null;renderView();ensureTab(S.tok);}
 else if(a==='drill'){if(!el.disabled)openDrill(el.dataset.k);}
 else if(a==='close'){if(el.classList.contains('mo')&&e.target!==el)return;S.drill=null;drawModal();}
 else if(a==='lang'){S.lang=S.lang==='ar'?'en':'ar';try{localStorage.setItem('cpd_lang',S.lang);}catch(x){}renderAll();}
 else if(a==='refresh'){if(!S.loading)loadAll(true);}
 else if(a==='resetf'){S.f={company:'',from:TD.getFullYear()+'-01-01',to:TODAY,supplier:'',status:''};renderHeader();loadAll(false);}
 else if(a==='ts'){const st=S.tbl[el.dataset.id];if(st.s===el.dataset.k)st.d=-st.d;else{st.s=el.dataset.k;st.d=1;}drawTable(el.dataset.id);}
 else if(a==='tp'){const st=S.tbl[el.dataset.id];st.p=Math.max(0,st.p+Number(el.dataset.d));drawTable(el.dataset.id);}});
R.addEventListener('input',e=>{const el=e.target;const a=el.dataset&&el.dataset.act;
 if(a==='tq'){const id=el.dataset.id;S.tbl[id].q=el.value;S.tbl[id].p=0;drawTable(id);const n=$('#tb_'+id+' .srch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}}
 else if(a==='fs'){clearTimeout(supT);supT=setTimeout(()=>{try{frappe.call({method:'frappe.desk.search.search_link',args:{doctype:'Supplier',txt:el.value,page_length:15},silent:true,callback:r=>{const dl=$('#dl_sup');if(dl)dl.innerHTML=((r&&r.message)||[]).map(o=>'<option value="'+esc(o.value)+'">'+esc(o.description||'')+'</option>').join('');}});}catch(x){}},250);}});
R.addEventListener('change',e=>{const el=e.target;const a=el.dataset&&el.dataset.act;
 if(a==='tqf'){const id=el.dataset.id;S.tbl[id].qf=el.value;S.tbl[id].p=0;drawTable(id);}
 else if(a==='tn'){const id=el.dataset.id;S.tbl[id].n=Number(el.value);S.tbl[id].p=0;drawTable(id);}
 else if(a==='f'||a==='fs'){S.f.company=$('#f_company').value;S.f.from=$('#f_from').value;S.f.to=$('#f_to').value;S.f.status=$('#f_status').value;S.f.supplier=($('#f_supplier').value||'').trim();loadAll(false);}});
(async function init(){S.companies=[];renderAll();
 const c=await callApi({doctype:'Company',fields:['name'],limit_page_length:100});if(c.ok)S.companies=c.rows.map(x=>x.name);
 renderHeader();loadAll(true);})();

})();