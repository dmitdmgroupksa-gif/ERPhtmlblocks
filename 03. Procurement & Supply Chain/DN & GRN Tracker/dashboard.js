(function () {
'use strict';
/* DM Group KSA - DN & GRN Tracker. Client-side only, read-only (frappe.client.get_list). */
const R = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
const $ = (s, r) => (r || R).querySelector(s);
const $$ = (s, r) => Array.from((r || R).querySelectorAll(s));
const J = JSON.stringify;
if (!$('#dmgtr')) return;
if (window.__dmgtr_cleanup) { try { window.__dmgtr_cleanup(); } catch (e) {} }

/* ---------- i18n ---------- */
const I = {
en: {
title:'DN & GRN Tracker', subtitle:'Delivery & Goods Receipt Management', refresh:'Refresh', last:'Last refreshed', company:'Company', division:'Division',
wh:'Location / Warehouse', from:'Date From', to:'Date To', party:'Customer / Supplier', status:'Document Status', all:'All', reset:'Reset',
s_draft:'Draft', s_submitted:'Submitted', s_cancelled:'Cancelled', s_returned:'Returned',
tab_overview:'Overview', tab_dn:'Delivery Note Tracker', tab_grn:'Goods Receipt Tracker', tab_pend:'Pending & Delayed', tab_recon:'Order Reconciliation', tab_wh:'Warehouse Performance', tab_rep:'Reports & Analysis',
g_dn:'Delivery Notes', g_grn:'Goods Receipt Notes', g_pend:'Pending Operations',
k_dn_total:'Total Delivery Notes', k_dn_sub:'Submitted Delivery Notes', k_dn_draft:'Draft Delivery Notes', k_dn_canc:'Cancelled Delivery Notes', k_dn_ret:'Returned Delivery Notes', k_dn_qty:'Delivered Quantity (net, stock UOM)',
k_pr_total:'Total Goods Receipts', k_pr_sub:'Submitted Goods Receipts', k_pr_draft:'Draft Goods Receipts', k_pr_canc:'Cancelled Goods Receipts', k_pr_ret:'Returned Goods Receipts', k_pr_qty:'Received Quantity (net, stock UOM)',
k_so_pend:'Sales Orders Pending Delivery', k_po_pend:'Purchase Orders Pending Receipt', k_so_part:'Partially Delivered Sales Orders', k_po_part:'Partially Received Purchase Orders', k_so_over:'Overdue Delivery Commitments', k_po_over:'Overdue Purchase Receipts',
more:'more', unavailable:'Unavailable', loading:'Loading…', retry:'Retry', empty:'No records found for the selected filters.', back:'Back', search:'Search…', export:'Export CSV', exporting:'Exporting…',
rows:'rows', docs:'documents', lines:'Item lines', documents:'Documents', page:'Page', of:'of', per:'per page',
c_monthly:'Monthly DN vs GRN document counts (submitted)', c_dnst:'Delivery Note status distribution', c_prst:'Goods Receipt status distribution', c_qty:'Monthly delivered vs received quantity', c_topc:'Top 10 customers by DN count', c_tops:'Top 10 suppliers by GRN count', c_whdn:'Warehouse-wise DN activity (top 10)', c_whpr:'Warehouse-wise GRN activity (top 10)',
dn:'Delivery Notes', grn:'Goods Receipts', delivered:'Delivered', received:'Received',
h_dn:'Delivery Note No.', h_grn:'GRN / Purchase Receipt No.', h_date:'Posting Date', h_company:'Company', h_customer:'Customer', h_supplier:'Supplier', h_so:'Sales Order', h_po:'Purchase Order', h_wh:'Warehouse', h_sp:'Salesperson', h_item:'Item Code', h_iname:'Item Name',
h_ord:'Ordered Qty', h_del:'Delivered Qty', h_ret:'Returned Qty', h_pend:'Pending Qty', h_uom:'UOM', h_status:'Status', h_isret:'Return', h_by:'Created By', h_recv:'Received Qty', h_acc:'Accepted Qty', h_rej:'Rejected Qty', h_out:'Outstanding Qty', h_div:'Division',
h_odate:'Order Date', h_exp:'Expected Date', h_done:'Completed Qty', h_over:'Days Overdue', h_netdel:'Net Delivered', h_netrec:'Net Received', h_linked:'Linked Documents', h_n:'Count', h_last:'Last Date', h_rn:'Returns', h_oso:'Open Sales Orders', h_opo:'Open Purchase Orders', h_oos:'Overdue SO', h_oop:'Overdue PO', h_dnq:'Net Outgoing Qty', h_prq:'Net Incoming Qty', h_qty:'Quantity',
st_Draft:'Draft', st_Submitted:'Submitted', st_Cancelled:'Cancelled', st_Completed:'Completed', st_Closed:'Closed', 'st_To Bill':'To Bill', 'st_Return Issued':'Return Issued', 'st_Partly Billed':'Partly Billed', 'st_To Deliver and Bill':'To Deliver and Bill', 'st_To Deliver':'To Deliver', 'st_To Receive and Bill':'To Receive and Bill', 'st_To Receive':'To Receive', 'st_On Hold':'On Hold',
l_done:'Completed', l_pending:'Pending', l_partial:'Partial', l_overdue:'Overdue', l_closed:'Closed', yes:'Return', no:'',
m_all:'All pending', m_part:'Partially completed', m_over:'Overdue', m_out:'Outstanding', m_done:'Completed', m_every:'All submitted',
p_so:'Pending Deliveries (Sales Orders)', p_po:'Pending Goods Receipts (Purchase Orders)', p_outqty:'Outstanding quantities',
r_so:'Sales Order → Delivery Note', r_po:'Purchase Order → Purchase Receipt', view:'View', linked_for:'Documents linked to',
w_title:'Warehouse performance (submitted documents)', w_trend:'Monthly trend', w_open_dn:'Open DN tracker', w_open_pr:'Open GRN tracker',
rep_pick:'Report', rp_ddn:'Daily DN trend', rp_dpr:'Daily GRN trend', rp_mon:'Monthly comparison', rp_cust:'Customer-wise delivery summary', rp_sup:'Supplier-wise goods receipt summary', rp_wh:'Warehouse-wise movement summary', rp_osd:'Outstanding delivery orders', rp_osp:'Outstanding purchase receipts', rp_rd:'Returned deliveries', rp_rr:'Returned purchase receipts',
n_hint_div:'Division filter applies to Delivery Notes and Sales Orders only (not available on Purchase Receipts / Purchase Orders).',
n_complete:'All matching rows loaded.', n_top:'Showing the top groups only (limit reached).', n_link40:'Only lines with an item-level order link are reconciled; unlinked lines show "—".',
e403:'Permission denied.', wh_na:'Warehouse list is not available for your role; the Warehouse filter is disabled.', err:'Error', n_cap:'Export limited to', unl:'—',
n_stat:'KPI cards and status-distribution charts ignore the Document Status filter; tables apply it.'
},
ar: {
title:'متتبع إشعارات التسليم واستلام البضائع', subtitle:'إدارة التسليم واستلام البضائع', refresh:'تحديث', last:'آخر تحديث', company:'الشركة', division:'القسم',
wh:'الموقع / المستودع', from:'من تاريخ', to:'إلى تاريخ', party:'العميل / المورد', status:'حالة المستند', all:'الكل', reset:'إعادة ضبط',
s_draft:'مسودة', s_submitted:'مُعتمد', s_cancelled:'ملغى', s_returned:'مرتجع',
tab_overview:'نظرة عامة', tab_dn:'متتبع إشعارات التسليم', tab_grn:'متتبع استلام البضائع', tab_pend:'المعلّق والمتأخر', tab_recon:'مطابقة الطلبات', tab_wh:'أداء المستودعات', tab_rep:'التقارير والتحليل',
g_dn:'إشعارات التسليم', g_grn:'إشعارات استلام البضائع', g_pend:'العمليات المعلّقة',
k_dn_total:'إجمالي إشعارات التسليم', k_dn_sub:'إشعارات التسليم المعتمدة', k_dn_draft:'إشعارات التسليم (مسودة)', k_dn_canc:'إشعارات التسليم الملغاة', k_dn_ret:'إشعارات التسليم المرتجعة', k_dn_qty:'الكمية المسلّمة (صافي، وحدة المخزون)',
k_pr_total:'إجمالي استلامات البضائع', k_pr_sub:'استلامات معتمدة', k_pr_draft:'استلامات (مسودة)', k_pr_canc:'استلامات ملغاة', k_pr_ret:'استلامات مرتجعة', k_pr_qty:'الكمية المستلمة (صافي، وحدة المخزون)',
k_so_pend:'أوامر بيع بانتظار التسليم', k_po_pend:'أوامر شراء بانتظار الاستلام', k_so_part:'أوامر بيع مسلّمة جزئياً', k_po_part:'أوامر شراء مستلمة جزئياً', k_so_over:'التزامات تسليم متأخرة', k_po_over:'استلامات شراء متأخرة',
more:'أخرى', unavailable:'غير متاح', loading:'جارٍ التحميل…', retry:'إعادة المحاولة', empty:'لا توجد سجلات للفلاتر المحددة.', back:'رجوع', search:'بحث…', export:'تصدير CSV', exporting:'جارٍ التصدير…',
rows:'صف', docs:'مستند', lines:'بنود', documents:'مستندات', page:'صفحة', of:'من', per:'لكل صفحة',
c_monthly:'عدد مستندات التسليم مقابل الاستلام شهرياً (معتمدة)', c_dnst:'توزيع حالات إشعارات التسليم', c_prst:'توزيع حالات استلام البضائع', c_qty:'الكمية المسلّمة مقابل المستلمة شهرياً', c_topc:'أعلى 10 عملاء حسب عدد إشعارات التسليم', c_tops:'أعلى 10 موردين حسب عدد الاستلامات', c_whdn:'نشاط التسليم حسب المستودع (أعلى 10)', c_whpr:'نشاط الاستلام حسب المستودع (أعلى 10)',
dn:'إشعارات التسليم', grn:'استلامات البضائع', delivered:'المسلّم', received:'المستلم',
h_dn:'رقم إشعار التسليم', h_grn:'رقم الاستلام', h_date:'تاريخ الترحيل', h_company:'الشركة', h_customer:'العميل', h_supplier:'المورد', h_so:'أمر البيع', h_po:'أمر الشراء', h_wh:'المستودع', h_sp:'مندوب المبيعات', h_item:'رمز الصنف', h_iname:'اسم الصنف',
h_ord:'الكمية المطلوبة', h_del:'الكمية المسلّمة', h_ret:'الكمية المرتجعة', h_pend:'الكمية المعلّقة', h_uom:'الوحدة', h_status:'الحالة', h_isret:'مرتجع', h_by:'أنشئ بواسطة', h_recv:'الكمية المستلمة', h_acc:'الكمية المقبولة', h_rej:'الكمية المرفوضة', h_out:'الكمية المتبقية', h_div:'القسم',
h_odate:'تاريخ الطلب', h_exp:'التاريخ المتوقع', h_done:'الكمية المنجزة', h_over:'أيام التأخير', h_netdel:'صافي المسلّم', h_netrec:'صافي المستلم', h_linked:'المستندات المرتبطة', h_n:'العدد', h_last:'آخر تاريخ', h_rn:'المرتجعات', h_oso:'أوامر بيع مفتوحة', h_opo:'أوامر شراء مفتوحة', h_oos:'أوامر بيع متأخرة', h_oop:'أوامر شراء متأخرة', h_dnq:'صافي الكمية الصادرة', h_prq:'صافي الكمية الواردة', h_qty:'الكمية',
st_Draft:'مسودة', st_Submitted:'مُعتمد', st_Cancelled:'ملغى', st_Completed:'مكتمل', st_Closed:'مغلق', 'st_To Bill':'للفوترة', 'st_Return Issued':'تم إصدار مرتجع', 'st_Partly Billed':'مفوتر جزئياً', 'st_To Deliver and Bill':'للتسليم والفوترة', 'st_To Deliver':'للتسليم', 'st_To Receive and Bill':'للاستلام والفوترة', 'st_To Receive':'للاستلام', 'st_On Hold':'معلّق',
l_done:'مكتمل', l_pending:'معلّق', l_partial:'جزئي', l_overdue:'متأخر', l_closed:'مغلق', yes:'مرتجع', no:'',
m_all:'كل المعلّق', m_part:'مكتمل جزئياً', m_over:'متأخر', m_out:'متبقي', m_done:'مكتمل', m_every:'كل المعتمد',
p_so:'التسليمات المعلّقة (أوامر البيع)', p_po:'الاستلامات المعلّقة (أوامر الشراء)', p_outqty:'الكميات المتبقية',
r_so:'أمر البيع ← إشعار التسليم', r_po:'أمر الشراء ← استلام الشراء', view:'عرض', linked_for:'المستندات المرتبطة بـ',
w_title:'أداء المستودعات (مستندات معتمدة)', w_trend:'الاتجاه الشهري', w_open_dn:'فتح متتبع التسليم', w_open_pr:'فتح متتبع الاستلام',
rep_pick:'التقرير', rp_ddn:'اتجاه التسليم اليومي', rp_dpr:'اتجاه الاستلام اليومي', rp_mon:'المقارنة الشهرية', rp_cust:'ملخص التسليم حسب العميل', rp_sup:'ملخص الاستلام حسب المورد', rp_wh:'ملخص الحركة حسب المستودع', rp_osd:'أوامر التسليم المتبقية', rp_osp:'استلامات الشراء المتبقية', rp_rd:'التسليمات المرتجعة', rp_rr:'استلامات الشراء المرتجعة',
n_hint_div:'فلتر القسم ينطبق على إشعارات التسليم وأوامر البيع فقط (غير متوفر في استلام/أوامر الشراء).',
n_complete:'تم تحميل كل الصفوف المطابقة.', n_top:'عرض أعلى المجموعات فقط (تم بلوغ الحد).', n_link40:'تتم مطابقة البنود المرتبطة بأمر على مستوى البند فقط؛ غير المرتبطة تظهر "—".',
e403:'ليست لديك صلاحية.', wh_na:'قائمة المستودعات غير متاحة لدورك؛ مرشح المستودع معطّل.', err:'خطأ', n_cap:'حد التصدير', unl:'—',
n_stat:'بطاقات المؤشرات ورسوم توزيع الحالات تتجاهل فلتر حالة المستند؛ الجداول تطبّقه.'
}};

/* ---------- state ---------- */
const todayStr = () => { try { return frappe.datetime.get_today(); } catch (e) { return new Date().toISOString().slice(0, 10); } };
const TODAY = todayStr();
const S = { lang: 'en', tab: 'overview', drill: null, epoch: 0, cache: new Map(), lists: { wh: [], comp: [], div: [] },
  f: { company: '', division: '', warehouse: '', from: TODAY.slice(0, 4) + '-01-01', to: TODAY, party: '', status: '' }, last: null, cleaners: [] };
try { const l = localStorage.getItem('dmgtr_lang'); if (l === 'ar' || l === 'en') S.lang = l; } catch (e) {}
const t = k => (I[S.lang] && I[S.lang][k] != null) ? I[S.lang][k] : (I.en[k] != null ? I.en[k] : k);
const ts = s => { const k = 'st_' + s; return (I[S.lang] && I[S.lang][k]) || s; };
const nf = () => new Intl.NumberFormat(S.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: 2 });
const fmt = v => (v === null || v === undefined || v === '') ? '—' : nf().format(v);
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DT = {
  dn: { p: 'Delivery Note', c: 'Delivery Note Item', date: 'posting_date', party: 'customer_name', slug: 'delivery-note' },
  pr: { p: 'Purchase Receipt', c: 'Purchase Receipt Item', date: 'posting_date', party: 'supplier_name', slug: 'purchase-receipt' },
  so: { p: 'Sales Order', c: 'Sales Order Item', date: 'transaction_date', party: 'customer_name', slug: 'sales-order' },
  po: { p: 'Purchase Order', c: 'Purchase Order Item', date: 'transaction_date', party: 'supplier_name', slug: 'purchase-order' } };
const P = k => '`tab' + DT[k].p + '`.', C = k => '`tab' + DT[k].c + '`.';
const E = (k, s) => s.replace(/@p\./g, P(k)).replace(/@c\./g, C(k));
const link = (slug, name) => name ? '<a href="/app/' + slug + '/' + encodeURIComponent(name) + '" target="_blank" rel="noopener">' + esc(name) + '</a>' : '—';

/* ---------- API layer: GET only, read-only, limited concurrency, cached by args ---------- */
const queue = []; let active = 0;
function pump() {
  while (active < 4 && queue.length) {
    const j = queue.shift(); active++;
    j.run().then(j.ok, j.no).then(() => { active--; pump(); if (!active && !queue.length) markDone(); });
  }
}
function raw(method, args) {
  return new Promise((ok, no) => { queue.push({ run: () => frappe.call({ method, args, type: 'GET', silent: true }).then(r => r.message), ok, no }); pump(); });
}
function errText(e) {
  try { const r = JSON.parse((e && e.responseText) || '{}'); if (r.exception) { const m = String(r.exception).split(':').slice(1).join(':').trim(); return (e.status === 403 ? t('e403') + ' ' : '') + m.slice(0, 180); } } catch (x) {}
  return e && e.status ? 'HTTP ' + e.status : String((e && e.message) || e || 'Error');
}
function api(method, args) {
  const key = method + J(args);
  if (S.cache.has(key)) return S.cache.get(key);
  if (S.cache.size > 500) S.cache.delete(S.cache.keys().next().value);
  const p = (async () => {
    let err;
    for (let i = 0; i < 3; i++) {
      try { return await raw(method, args); } catch (e) { err = e; if (e && [400, 403, 404, 417, 401].includes(e.status)) break; await new Promise(r => setTimeout(r, 600 * (i + 1))); }
    }
    throw new Error(errText(err));
  })();
  S.cache.set(key, p); p.catch(() => S.cache.delete(key));
  return p;
}
function gl(dt, o) {
  const a = { doctype: dt, fields: J(o.fields), filters: J(o.filters || []), limit_start: o.start || 0, limit_page_length: o.len || 20 };
  if (o.parent) a.parent = o.parent; if (o.or && o.or.length) a.or_filters = J(o.or); if (o.group) a.group_by = o.group; if (o.order) a.order_by = o.order;
  return api('frappe.client.get_list', a);
}
function markDone() { S.last = new Date(); const el = $('#tr-last'); if (el) el.textContent = t('last') + ': ' + S.last.toLocaleString(S.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB'); }

/* ---------- filters ---------- */
function flt(k, o) {
  o = o || {}; const f = S.f, d = DT[k].p, i = DT[k].c, a = [];
  if (f.company) a.push([d, 'company', '=', f.company]);
  if (f.division && (k === 'dn' || k === 'so')) a.push([d, 'custom_division', '=', f.division]);
  if (f.from) a.push([d, DT[k].date, '>=', f.from]);
  if (f.to) a.push([d, DT[k].date, '<=', f.to]);
  if (f.warehouse) a.push([i, 'warehouse', '=', f.warehouse]);
  if (f.party) a.push([d, DT[k].party, 'like', '%' + f.party + '%']);
  if (!o.nostatus) {
    const s = f.status;
    if (s === 'draft') a.push([d, 'docstatus', '=', 0]); else if (s === 'submitted') a.push([d, 'docstatus', '=', 1]); else if (s === 'cancelled') a.push([d, 'docstatus', '=', 2]);
    else if (s === 'returned' && (k === 'dn' || k === 'pr')) { a.push([d, 'docstatus', '=', 1]); a.push([d, 'is_return', '=', 1]); }
  }
  return a.concat(o.extra || []);
}
const sub1 = k => [DT[k].p, 'docstatus', '=', 1];
const PSTAT = { so: ['To Deliver and Bill', 'To Deliver'], po: ['To Receive and Bill', 'To Receive'] };
function pendF(k, mode) {
  const d = DT[k].p, i = DT[k].c, a = [[d, 'docstatus', '=', 1], [d, 'status', 'in', PSTAT[k]]];
  if (mode === 'part') a.push([d, k === 'so' ? 'per_delivered' : 'per_received', '>', 0]);
  if (mode === 'over') a.push([i, k === 'so' ? 'delivery_date' : 'schedule_date', '<', TODAY]);
  return a;
}
function reconF(k, mode) {
  const d = DT[k].p, a = [[d, 'docstatus', '=', 1]];
  if (mode === 'out') a.push([d, 'status', 'in', PSTAT[k]]); else if (mode === 'done') a.push([d, 'status', 'in', ['Completed', 'To Bill']]);
  return a;
}
const cntDocs = (k, extra, nostatus) => gl(DT[k].p, { fields: ['count(distinct ' + P(k) + 'name) as n'], filters: flt(k, { extra, nostatus }) }).then(r => (r[0] && r[0].n) || 0);
function docCounts(k) {
  return gl(DT[k].p, { fields: [P(k) + 'docstatus as ds', P(k) + 'is_return as r', 'count(distinct ' + P(k) + 'name) as n'], filters: flt(k, { nostatus: true }), group: P(k) + 'docstatus,' + P(k) + 'is_return', len: 20 })
    .then(rows => { const m = { total: 0, sub: 0, draft: 0, canc: 0, ret: 0 }; rows.forEach(r => { m.total += r.n; if (r.ds == 1) m.sub += r.n; if (r.ds == 0) m.draft += r.n; if (r.ds == 2) m.canc += r.n; if (r.ds == 1 && r.r) m.ret += r.n; }); return m; });
}
function qtyByUom(k, extra) {
  return gl(DT[k].p, { fields: [C(k) + 'stock_uom as u', 'sum(' + C(k) + 'stock_qty) as q'], filters: flt(k, { nostatus: true, extra: [sub1(k)].concat(extra || []) }), group: C(k) + 'stock_uom', len: 200 })
    .then(r => r.filter(x => x.q).sort((a, b) => Math.abs(b.q) - Math.abs(a.q)));
}
function groupedCount(k, field, extra, len) { // top groups by distinct doc count
  return gl(DT[k].p, { fields: [field + ' as g', 'count(distinct ' + P(k) + 'name) as n'], filters: flt(k, { extra: extra || [sub1(k)], nostatus: true }), group: field, order: 'n desc', len: len || 10 });
}
function dailyCounts(k, extra) {
  return gl(DT[k].p, { fields: [P(k) + DT[k].date + ' as d', 'count(distinct ' + P(k) + 'name) as n'], filters: flt(k, { nostatus: true, extra: [sub1(k)].concat(extra || []) }), group: P(k) + DT[k].date, order: P(k) + DT[k].date + ' asc', len: 5000 });
}
function monthsBetween(a, b) {
  const out = []; if (!a || !b) return out; let [y, m] = a.slice(0, 7).split('-').map(Number); const [y2, m2] = b.slice(0, 7).split('-').map(Number);
  while ((y < y2 || (y === y2 && m <= m2)) && out.length < 60) { out.push(y + '-' + String(m).padStart(2, '0')); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
function bucketMonths(rows, valKey) { const m = {}; rows.forEach(r => { const k = String(r.d).slice(0, 7); m[k] = (m[k] || 0) + (r[valKey || 'n'] || 0); }); return m; }

/* ---------- small UI helpers ---------- */
const skel = n => Array.from({ length: n || 4 }, () => '<div class="sk"></div>').join('');
function errBox(msg, retry) { const d = document.createElement('div'); d.className = 'tr-err'; d.textContent = t('err') + ': ' + msg + ' '; if (retry) { const b = document.createElement('button'); b.className = 'tr-btn'; b.textContent = t('retry'); b.onclick = retry; d.appendChild(b); } return d; }
function load(body, factory, draw) { // factory: ()=>Promise ; guarded against stale epoch
  const ep = S.epoch; body.innerHTML = skel(4);
  const run = () => { body.innerHTML = skel(4); factory().then(d => { if (ep !== S.epoch || !body.isConnected) return; body.innerHTML = ''; draw(body, d); }).catch(e => { if (ep !== S.epoch || !body.isConnected) return; body.innerHTML = ''; body.appendChild(errBox(e.message, run)); }); };
  run();
}
function card(title, extra) { const c = document.createElement('div'); c.className = 'tr-card'; c.innerHTML = '<h3><span>' + esc(title) + '</span><span class="ex"></span></h3><div class="bd"></div>'; if (extra) c.querySelector('.ex').appendChild(extra); return c; }
const COL = { navy: '#0b2a4a', teal: '#0f9d9a', green: '#2f9e44', orange: '#f08c00', red: '#e03131', yellow: '#e8b100', gray: '#868e96' };
function barChart(host, labels, series) {
  const W = Math.max(320, host.clientWidth || 640), H = 250, L = 46, B = 28, T = 10, n = labels.length; if (!n) { host.innerHTML = '<div class="tr-empty">' + esc(t('empty')) + '</div>'; return; }
  const max = Math.max(1, ...series.flatMap(s => s.data)); const bw = (W - L) / n, gw = Math.min(bw * .8, 60) / series.length;
  let g = ''; for (let i = 0; i <= 4; i++) { const y = T + (H - T - B) * (1 - i / 4); g += '<line x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="#e5eaf1"/><text x="' + (L - 4) + '" y="' + (y + 3) + '" text-anchor="end">' + esc(nf().format(Math.round(max * i / 4))) + '</text>'; }
  labels.forEach((lb, i) => { const x0 = L + i * bw + (bw - gw * series.length) / 2; series.forEach((s, j) => { const h = (H - T - B) * (s.data[i] / max); g += '<rect x="' + (x0 + j * gw) + '" y="' + (H - B - h) + '" width="' + (gw - 1) + '" height="' + h + '" fill="' + s.color + '" rx="2"><title>' + esc(lb + ' – ' + s.name + ': ' + nf().format(s.data[i])) + '</title></rect>'; }); if (n <= 14 || i % Math.ceil(n / 12) === 0) g += '<text x="' + (L + i * bw + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(lb.slice(2)) + '</text>'; });
  host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g + '</svg><div class="legend">' + series.map(s => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>';
}
function lineChart(host, pts, color) {
  const W = Math.max(480, host.clientWidth || 800), H = 240, L = 46, B = 24, T = 10, n = pts.length; if (!n) { host.innerHTML = '<div class="tr-empty">' + esc(t('empty')) + '</div>'; return; }
  const max = Math.max(1, ...pts.map(p => p.v)), x = i => L + (n === 1 ? (W - L) / 2 : i * (W - L - 6) / (n - 1)), y = v => T + (H - T - B) * (1 - v / max);
  let g = ''; for (let i = 0; i <= 4; i++) { const yy = T + (H - T - B) * (1 - i / 4); g += '<line x1="' + L + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="#e5eaf1"/><text x="' + (L - 4) + '" y="' + (yy + 3) + '" text-anchor="end">' + esc(nf().format(Math.round(max * i / 4))) + '</text>'; }
  g += '<polygon points="' + x(0) + ',' + (H - B) + ' ' + pts.map((p, i) => x(i) + ',' + y(p.v)).join(' ') + ' ' + x(n - 1) + ',' + (H - B) + '" fill="' + color + '" opacity=".12"/><polyline fill="none" stroke="' + color + '" stroke-width="2" points="' + pts.map((p, i) => x(i) + ',' + y(p.v)).join(' ') + '"/>';
  pts.forEach((p, i) => { g += '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="' + (n > 150 ? 1.5 : 3) + '" fill="' + color + '"><title>' + esc(p.d + ': ' + nf().format(p.v)) + '</title></circle>'; });
  g += '<text x="' + L + '" y="' + (H - 6) + '">' + esc(pts[0].d) + '</text><text x="' + W + '" y="' + (H - 6) + '" text-anchor="end">' + esc(pts[n - 1].d) + '</text>';
  host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g + '</svg>';
}
function donut(host, items) {
  const tot = items.reduce((a, b) => a + b.v, 0); if (!tot) { host.innerHTML = '<div class="tr-empty">' + esc(t('empty')) + '</div>'; return; }
  const palette = [COL.green, COL.teal, COL.orange, COL.yellow, COL.red, COL.gray, COL.navy]; let ang = -Math.PI / 2, g = '';
  items.forEach((it, i) => { const a = it.v / tot * Math.PI * 2, r = 80, ri = 50, c = 100; const x1 = c + r * Math.cos(ang), y1 = c + r * Math.sin(ang), x2 = c + r * Math.cos(ang + a - .0001), y2 = c + r * Math.sin(ang + a - .0001), x3 = c + ri * Math.cos(ang + a - .0001), y3 = c + ri * Math.sin(ang + a - .0001), x4 = c + ri * Math.cos(ang), y4 = c + ri * Math.sin(ang);
    g += '<path d="M' + x1 + ' ' + y1 + 'A' + r + ' ' + r + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + x2 + ' ' + y2 + 'L' + x3 + ' ' + y3 + 'A' + ri + ' ' + ri + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 0 ' + x4 + ' ' + y4 + 'Z" fill="' + palette[i % 7] + '"><title>' + esc(it.l + ': ' + nf().format(it.v)) + '</title></path>'; ang += a; });
  host.innerHTML = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 200 200" style="width:170px"><text x="100" y="105" text-anchor="middle" style="font-size:16px;font-weight:700;fill:#0b2a4a">' + esc(nf().format(tot)) + '</text>' + g + '</svg><div class="legend" style="flex-direction:column;gap:4px">' + items.map((it, i) => '<span><i style="background:' + palette[i % 7] + '"></i>' + esc(it.l) + ' – ' + esc(nf().format(it.v)) + '</span>').join('') + '</div></div>';
}
function hbars(host, items, onClick) {
  if (!items.length) { host.innerHTML = '<div class="tr-empty">' + esc(t('empty')) + '</div>'; return; }
  const max = Math.max(1, ...items.map(i => i.v)); host.innerHTML = '';
  items.forEach(it => { const d = document.createElement('div'); d.className = 'hb'; d.title = it.l; d.innerHTML = '<span class="l">' + esc(it.l) + '</span><span class="bar"><i style="width:' + (it.v / max * 100) + '%"></i></span><b>' + esc(nf().format(it.v)) + '</b>'; if (onClick) d.onclick = () => onClick(it); host.appendChild(d); });
}

/* ---------- generic table (server-side paging or local) ---------- */
function csvCell(v) { let s = v === null || v === undefined ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }
function mkTable(host, cfg) {
  const st = { page: 0, size: cfg.size || 25, q: '', sort: cfg.sort || null, total: null, req: 0 };
  host.innerHTML = '<div class="tr-tb"><input type="search" class="q" placeholder="' + esc(t('search')) + '"><span class="tr-cnt"></span><span class="tr-grow"></span>' + (cfg.toggle ? '<button type="button" class="tr-btn lv"></button>' : '') + '<button type="button" class="tr-btn exp">' + esc(t('export')) + '</button></div><div class="tr-wrap"><table class="tr-t"><thead></thead><tbody></tbody></table></div><div class="tr-pg"></div><div class="tr-note"></div>';
  const thead = $('thead', host), tbody = $('tbody', host), cnt = $('.tr-cnt', host), pg = $('.tr-pg', host), note = $('.tr-note', host), q = $('.q', host), exp = $('.exp', host);
  const cols = () => cfg.cols();
  function head() {
    thead.innerHTML = '<tr>' + cols().map((c, i) => '<th class="' + (c.s ? 's' : '') + (c.n ? ' n' : '') + '" data-i="' + i + '">' + esc(t(c.l)) + (st.sort && c.s && st.sort.k === c.s ? (st.sort.d === 'asc' ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr>';
    $$('th.s', thead).forEach(th => th.onclick = () => { const c = cols()[+th.dataset.i]; st.sort = { k: c.s, d: st.sort && st.sort.k === c.s && st.sort.d === 'asc' ? 'desc' : 'asc' }; st.page = 0; head(); go(); });
    if (cfg.toggle) { const b = $('.lv', host); b.textContent = cfg.toggle.label(); b.onclick = () => { cfg.toggle.flip(); st.page = 0; st.sort = cfg.sort || null; head(); go(); }; }
  }
  function cellHtml(c, r) { return c.h ? c.h(r) : esc(c.v(r)); }
  function go() {
    const my = ++st.req, ep = S.epoch; tbody.innerHTML = '<tr><td colspan="' + cols().length + '">' + skel(5) + '</td></tr>'; note.textContent = '';
    cfg.fetch(st.page * st.size, st.size, st.q.trim(), st.sort).then(res => {
      if (my !== st.req || ep !== S.epoch || !host.isConnected) return;
      st.total = res.total; cnt.textContent = fmt(res.total) + ' ' + t(cfg.unit ? cfg.unit() : 'rows');
      if (!res.rows.length) { tbody.innerHTML = '<tr><td colspan="' + cols().length + '" class="tr-empty">' + esc(t('empty')) + '</td></tr>'; }
      else tbody.innerHTML = res.rows.map(r => '<tr>' + cols().map(c => '<td class="' + (c.n ? 'n' : '') + '" title="' + (c.n || c.h ? '' : esc(c.v(r))) + '">' + cellHtml(c, r) + '</td>').join('') + '</tr>').join('');
      $$('[data-act]', tbody).forEach(el => el.onclick = e => { e.preventDefault(); const r = res.rows[+el.closest('tr').rowIndex - 1]; if (r && cfg.act) cfg.act(el.dataset.act, r); });
      const pages = Math.max(1, Math.ceil(res.total / st.size));
      pg.innerHTML = '<button class="tr-btn pv" ' + (st.page ? '' : 'disabled') + '>‹</button><span>' + esc(t('page')) + ' ' + (st.page + 1) + ' ' + esc(t('of')) + ' ' + pages + '</span><button class="tr-btn nx" ' + (st.page + 1 < pages ? '' : 'disabled') + '>›</button><select>' + [25, 50, 100].map(n => '<option ' + (n === st.size ? 'selected' : '') + ' value="' + n + '">' + n + ' / ' + esc(t('per')) + '</option>').join('') + '</select>';
      $('.pv', pg).onclick = () => { st.page--; go(); }; $('.nx', pg).onclick = () => { st.page++; go(); }; $('select', pg).onchange = e => { st.size = +e.target.value; st.page = 0; go(); };
      note.textContent = cfg.note ? cfg.note() : '';
    }).catch(e => { if (my !== st.req || !host.isConnected) return; tbody.innerHTML = ''; const td = document.createElement('td'); td.colSpan = cols().length; td.appendChild(errBox(e.message, go)); const tr = document.createElement('tr'); tr.appendChild(td); tbody.appendChild(tr); });
  }
  let tmr; q.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { st.q = q.value; st.page = 0; go(); }, 400); };
  exp.onclick = async () => {
    const CAP = 20000, step = 200; exp.disabled = true; const old = exp.textContent; const rows = []; let total = 0, capped = false;
    try {
      for (let s = 0; ; s += step) { exp.textContent = t('exporting') + ' ' + rows.length; const res = await cfg.fetch(s, step, st.q.trim(), st.sort); total = res.total; rows.push(...res.rows); if (!res.rows.length || rows.length >= total) break; if (rows.length >= CAP) { capped = true; break; } }
      const cs = cols(); const lines = [cs.map(c => csvCell(t(c.l))).join(',')].concat(rows.map(r => cs.map(c => csvCell(c.x ? c.x(r) : c.v(r))).join(',')));
      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (cfg.name || 'export') + '_' + TODAY + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      note.textContent = capped ? t('n_cap') + ' ' + CAP + ' ' + t('rows') + ' (' + fmt(total) + ' ' + t('rows') + ')' : t('n_complete') + ' (' + fmt(rows.length) + ')';
    } catch (e) { note.textContent = ''; note.appendChild(errBox(e.message)); }
    exp.disabled = false; exp.textContent = old;
  };
  head(); go();
  return { reload: () => { head(); go(); } };
}
function localSrc(rows, search) { // in-memory fetch for aggregated tables
  return (start, len, q, sort) => {
    let r = rows; if (q) { const x = q.toLowerCase(); r = r.filter(o => search(o).toLowerCase().includes(x)); }
    if (sort) { const f = sort.k; r = r.slice().sort((a, b) => { const A = a[f], B = b[f]; const c = (typeof A === 'number' && typeof B === 'number') ? A - B : String(A == null ? '' : A).localeCompare(String(B == null ? '' : B)); return sort.d === 'asc' ? c : -c; }); }
    return Promise.resolve({ rows: r.slice(start, start + len), total: r.length });
  };
}

/* ---------- document / item-line sources ---------- */
const SRC = {
  dn: { pf: ['name', 'posting_date', 'company', 'custom_division as division', 'customer', 'customer_name', 'docstatus', 'status', 'is_return', 'owner', 'sales_order as hso'],
    cf: ['name as rid', 'item_code', 'item_name', 'qty', 'uom', 'warehouse', 'against_sales_order as so', 'so_detail', 'returned_qty'],
    ps: ['name', 'customer_name', 'customer', 'sales_order'], cs: ['against_sales_order', 'item_code', 'item_name'],
    sort: { name: '@p.name', date: '@p.posting_date', customer: '@p.customer_name', company: '@p.company', owner: '@p.owner', status: '@p.status', item: '@c.item_code', qty: '@c.qty', wh: '@c.warehouse', so: '@p.sales_order' }, ord: '@p.posting_date desc, @p.name desc' },
  pr: { pf: ['name', 'posting_date', 'company', 'supplier', 'supplier_name', 'docstatus', 'status', 'is_return', 'owner'],
    cf: ['name as rid', 'item_code', 'item_name', 'qty', 'received_qty', 'rejected_qty', 'returned_qty', 'uom', 'warehouse', 'purchase_order as po', 'purchase_order_item as poi'],
    ps: ['name', 'supplier_name', 'supplier'], cs: ['purchase_order', 'item_code', 'item_name'],
    sort: { name: '@p.name', date: '@p.posting_date', supplier: '@p.supplier_name', company: '@p.company', owner: '@p.owner', status: '@p.status', item: '@c.item_code', qty: '@c.qty', wh: '@c.warehouse', po: '@c.purchase_order' }, ord: '@p.posting_date desc, @p.name desc' },
  so: { pf: ['name', 'transaction_date as odate', 'delivery_date as hdate', 'company', 'customer_name', 'status', 'per_delivered as per', 'docstatus', 'sales_persons as sp', 'custom_division as division'],
    cf: ['name as rid', 'item_code', 'item_name', 'qty', 'delivered_qty as done', 'uom', 'warehouse', 'delivery_date as idate'],
    ps: ['name', 'customer_name'], cs: ['item_code', 'item_name'],
    sort: { name: '@p.name', odate: '@p.transaction_date', idate: '@c.delivery_date', customer: '@p.customer_name', item: '@c.item_code', qty: '@c.qty', done: '@c.delivered_qty', wh: '@c.warehouse', status: '@p.status' }, ord: '@p.transaction_date desc, @p.name desc' },
  po: { pf: ['name', 'transaction_date as odate', 'schedule_date as hdate', 'company', 'supplier_name', 'status', 'per_received as per', 'docstatus'],
    cf: ['name as rid', 'item_code', 'item_name', 'qty', 'received_qty as done', 'uom', 'warehouse', 'schedule_date as idate'],
    ps: ['name', 'supplier_name'], cs: ['item_code', 'item_name'],
    sort: { name: '@p.name', odate: '@p.transaction_date', idate: '@c.schedule_date', supplier: '@p.supplier_name', item: '@c.item_code', qty: '@c.qty', done: '@c.received_qty', wh: '@c.warehouse', status: '@p.status' }, ord: '@p.transaction_date desc, @p.name desc' }
};
const fl = (k, arr, pre) => arr.map(s => { const [n, a] = s.split(' as '); return pre + n + ' as ' + (a || n); });
function mkSource(k, o) { // o: {level:()=>'doc'|'item', filters:()=>[...]}
  const src = SRC[k];
  const base = (q, lvl) => {
    const or = []; if (q) { const like = '%' + q + '%'; src.ps.forEach(f => or.push([DT[k].p, f, 'like', like])); if (lvl === 'item') src.cs.forEach(f => or.push([DT[k].c, f, 'like', like])); }
    return { filters: o.filters(), or };
  };
  async function fetch(start, len, q, sort) {
    const lvl = o.level(); const b = base(q, lvl);
    const fields = lvl === 'doc' ? fl(k, src.pf, P(k)) : fl(k, src.pf, P(k)).concat(fl(k, src.cf, C(k)));
    const order = sort && src.sort[sort.k] ? E(k, src.sort[sort.k]) + ' ' + sort.d + (lvl === 'doc' ? ', ' + P(k) + 'name desc' : '') : E(k, src.ord) + (lvl === 'item' ? ', ' + C(k) + 'idx asc' : '');
    const cf = lvl === 'doc' ? ['count(distinct ' + P(k) + 'name) as n'] : ['count(' + C(k) + 'name) as n'];
    const [rows, tot] = await Promise.all([
      gl(DT[k].p, { fields, filters: b.filters, or: b.or, group: lvl === 'doc' ? P(k) + 'name' : undefined, order, start, len }),
      gl(DT[k].p, { fields: cf, filters: lvl === 'item' ? b.filters.concat([[DT[k].c, 'name', 'is', 'set']]) : b.filters, or: b.or }) ]);
    if (lvl === 'item') await enrich(k, rows);
    return { rows, total: (tot[0] && tot[0].n) || 0 };
  }
  return { fetch };
}
async function enrich(k, rows) { // adds order-line info for the current page only (bounded queries)
  const chunk = a => { const o = []; for (let i = 0; i < a.length; i += 100) o.push(a.slice(i, i + 100)); return o; };
  try {
    if (k === 'dn') {
      const ids = [...new Set(rows.map(r => r.so_detail).filter(Boolean))], sos = [...new Set(rows.map(r => r.so || r.hso).filter(Boolean))];
      const [a, b] = await Promise.all([
        Promise.all(chunk(ids).map(c => gl('Sales Order Item', { parent: 'Sales Order', fields: ['name', 'qty', 'delivered_qty'], filters: [['name', 'in', c]], len: c.length }))),
        Promise.all(chunk(sos).map(c => gl('Sales Order', { fields: ['name', 'sales_persons'], filters: [['name', 'in', c]], len: c.length }))) ]);
      const m = {}; a.flat().forEach(x => m[x.name] = x); const sp = {}; b.flat().forEach(x => sp[x.name] = x.sales_persons);
      rows.forEach(r => { const x = m[r.so_detail]; r.ordered = x ? x.qty : null; r.pend = x ? Math.max(x.qty - x.delivered_qty, 0) : null; r.sperson = sp[r.so || r.hso] || ''; r.sref = r.so || r.hso || ''; });
    } else if (k === 'pr') {
      const ids = [...new Set(rows.map(r => r.poi).filter(Boolean))];
      const a = await Promise.all(chunk(ids).map(c => gl('Purchase Order Item', { parent: 'Purchase Order', fields: ['name', 'qty', 'received_qty'], filters: [['name', 'in', c]], len: c.length })));
      const m = {}; a.flat().forEach(x => m[x.name] = x);
      rows.forEach(r => { const x = m[r.poi]; r.ordered = x ? x.qty : null; r.out = x ? Math.max(x.qty - x.received_qty, 0) : null; });
    }
  } catch (e) { rows.forEach(r => { r.enrichErr = true; }); }
}
function docChip(r) {
  const ds = r.docstatus == 0 ? 'Draft' : r.docstatus == 2 ? 'Cancelled' : null; const s = r.status || ds || '';
  const cl = { Completed: 'green', Draft: 'yellow', 'To Bill': 'yellow', 'Partly Billed': 'orange', 'Return Issued': 'orange', Cancelled: 'gray', Closed: 'gray', 'To Deliver': 'yellow', 'To Deliver and Bill': 'yellow', 'To Receive': 'yellow', 'To Receive and Bill': 'yellow', 'On Hold': 'gray' }[s] || 'gray';
  return '<span class="chip ' + cl + '">' + esc(ts(s)) + '</span>';
}
function lineStatus(r) {
  if (r.docstatus == 2) return { c: 'gray', k: 'st_Cancelled', over: 0 }; if (r.status === 'Closed') return { c: 'gray', k: 'l_closed', over: 0 };
  const pend = (r.qty || 0) - (r.done || 0); if (pend <= 0) return { c: 'green', k: 'l_done', over: 0 };
  if (r.idate && r.idate < TODAY) return { c: 'red', k: 'l_overdue', over: Math.round((new Date(TODAY) - new Date(r.idate)) / 864e5) };
  if ((r.done || 0) > 0) return { c: 'orange', k: 'l_partial', over: 0 }; return { c: 'yellow', k: 'l_pending', over: 0 };
}
const chipL = r => { const s = lineStatus(r); return '<span class="chip ' + s.c + '">' + esc(t(s.k)) + '</span>'; };
const U = { n: true };
function colsFor(k, lvl, recon) {
  const stc = { l: 'h_status', s: 'status', h: docChip, v: r => r.status }, by = { l: 'h_by', s: 'owner', v: r => r.owner }, dte = { l: 'h_date', s: 'date', v: r => r.posting_date };
  const ret = { l: 'h_isret', v: r => r.is_return ? t('yes') : '', h: r => r.is_return ? '<span class="chip orange">' + esc(t('yes')) + '</span>' : '' };
  if (k === 'dn') {
    const a = [{ l: 'h_dn', s: 'name', v: r => r.name, h: r => link('delivery-note', r.name) }, dte, { l: 'h_company', s: 'company', v: r => r.company }, { l: 'h_customer', s: 'customer', v: r => r.customer_name }];
    if (lvl === 'doc') return a.concat([{ l: 'h_div', v: r => r.division }, { l: 'h_so', v: r => r.hso, h: r => link('sales-order', r.hso) }, stc, ret, by]);
    return a.concat([{ l: 'h_so', s: 'so', v: r => r.sref, h: r => link('sales-order', r.sref) }, { l: 'h_wh', s: 'wh', v: r => whLabel(r.warehouse) }, { l: 'h_sp', v: r => r.sperson }, { l: 'h_item', s: 'item', v: r => r.item_code }, { l: 'h_iname', v: r => r.item_name },
      Object.assign({ l: 'h_ord', v: r => r.ordered, h: r => esc(fmt(r.ordered)) }, U), Object.assign({ l: 'h_del', s: 'qty', v: r => r.qty, h: r => esc(fmt(r.qty)) }, U), Object.assign({ l: 'h_ret', v: r => r.returned_qty, h: r => esc(fmt(r.returned_qty)) }, U), Object.assign({ l: 'h_pend', v: r => r.pend, h: r => esc(fmt(r.pend)) }, U), { l: 'h_uom', v: r => r.uom }, stc, ret, by]);
  }
  if (k === 'pr') {
    const a = [{ l: 'h_grn', s: 'name', v: r => r.name, h: r => link('purchase-receipt', r.name) }, dte, { l: 'h_company', s: 'company', v: r => r.company }, { l: 'h_supplier', s: 'supplier', v: r => r.supplier_name }];
    if (lvl === 'doc') return a.concat([stc, ret, by]);
    return a.concat([{ l: 'h_po', s: 'po', v: r => r.po, h: r => link('purchase-order', r.po) }, { l: 'h_wh', s: 'wh', v: r => whLabel(r.warehouse) }, { l: 'h_item', s: 'item', v: r => r.item_code }, { l: 'h_iname', v: r => r.item_name },
      Object.assign({ l: 'h_ord', v: r => r.ordered, h: r => esc(fmt(r.ordered)) }, U), Object.assign({ l: 'h_recv', v: r => r.received_qty, h: r => esc(fmt(r.received_qty)) }, U), Object.assign({ l: 'h_acc', s: 'qty', v: r => r.qty, h: r => esc(fmt(r.qty)) }, U), Object.assign({ l: 'h_rej', v: r => r.rejected_qty, h: r => esc(fmt(r.rejected_qty)) }, U),
      Object.assign({ l: 'h_ret', v: r => r.returned_qty, h: r => esc(fmt(r.returned_qty)) }, U), Object.assign({ l: 'h_out', v: r => r.out, h: r => esc(fmt(r.out)) }, U), { l: 'h_uom', v: r => r.uom }, stc, ret, by]);
  }
  const so = k === 'so', ord = so ? 'sales-order' : 'purchase-order', party = so ? { l: 'h_customer', s: 'customer', v: r => r.customer_name } : { l: 'h_supplier', s: 'supplier', v: r => r.supplier_name };
  const a = [{ l: so ? 'h_so' : 'h_po', s: 'name', v: r => r.name, h: r => link(ord, r.name) }, { l: 'h_odate', s: 'odate', v: r => r.odate }, { l: 'h_exp', s: 'idate', v: r => r.idate || '' }, party, { l: 'h_wh', s: 'wh', v: r => whLabel(r.warehouse) }, { l: 'h_item', s: 'item', v: r => r.item_code }, { l: 'h_iname', v: r => r.item_name },
    Object.assign({ l: 'h_ord', s: 'qty', v: r => r.qty, h: r => esc(fmt(r.qty)) }, U), Object.assign({ l: 'h_done', s: 'done', v: r => r.done, h: r => esc(fmt(r.done)) }, U), Object.assign({ l: 'h_pend', v: r => Math.max((r.qty || 0) - (r.done || 0), 0), h: r => esc(fmt(Math.max((r.qty || 0) - (r.done || 0), 0))) }, U), { l: 'h_uom', v: r => r.uom },
    Object.assign({ l: 'h_over', v: r => lineStatus(r).over || '', h: r => esc(lineStatus(r).over || '') }, U), { l: 'h_status', v: r => t(lineStatus(r).k), h: chipL }];
  if (recon) a.push({ l: 'h_linked', v: () => '', x: () => '', h: () => '<a data-act="link" class="lnk">' + esc(t('view')) + '</a>' });
  return a;
}
function docTable(host, k, o) { // o: {extra, mode, recon, level, nostatus, name}
  o = o || {}; let lvl = o.level || 'item'; const isOrder = (k === 'so' || k === 'po');
  const filters = () => isOrder ? flt(k, { nostatus: true, extra: o.recon ? reconF(k, o.mode) : pendF(k, o.mode) }) : flt(k, { nostatus: o.nostatus, extra: (o.extra || []).map(a => [DT[k].p].concat(a)) });
  const src = mkSource(k, { level: () => isOrder ? 'item' : lvl, filters });
  return mkTable(host, { name: o.name || (DT[k].slug + (isOrder ? '_lines' : '_' + lvl)), size: 25, cols: () => colsFor(k, isOrder ? 'item' : lvl, o.recon), fetch: src.fetch, unit: () => (isOrder || lvl === 'item') ? 'lines' : 'docs',
    toggle: isOrder ? null : { label: () => t(lvl === 'doc' ? 'lines' : 'documents'), flip: () => { lvl = lvl === 'doc' ? 'item' : 'doc'; } },
    act: (a, r) => { if (a === 'link') openLinked(k, r.name); },
    note: () => (k === 'dn' && lvl === 'item') ? t('n_link40') : '' });
}

/* ---------- modal ---------- */
function openModal(title, build) {
  const m = $('#tr-modal'); m.hidden = false; m.innerHTML = '<div class="tr-box"><h2><span></span><button class="tr-btn">✕</button></h2><div class="mb"></div></div>';
  $('h2 span', m).textContent = title; $('h2 button', m).onclick = closeModal; m.onclick = e => { if (e.target === m) closeModal(); }; build($('.mb', m));
}
function closeModal() { const m = $('#tr-modal'); m.hidden = true; m.innerHTML = ''; }
function openLinked(k, name) { // documents linked to a source order via verified item-level (and header) links
  const tk = k === 'so' ? 'dn' : 'pr';
  openModal(t('linked_for') + ' ' + name, body => {
    const rows = []; const d = DT[tk].p, i = DT[tk].c;
    const fields = [P(tk) + 'name as name', P(tk) + DT[tk].date + ' as date', P(tk) + 'docstatus as docstatus', P(tk) + 'status as status', P(tk) + 'is_return as is_return', C(tk) + 'name as rid', C(tk) + 'item_code as item', C(tk) + 'qty as qty', C(tk) + 'uom as uom', C(tk) + 'warehouse as wh'];
    const qs = [gl(d, { fields, filters: [[i, k === 'so' ? 'against_sales_order' : 'purchase_order', '=', name]], len: 200, order: P(tk) + DT[tk].date + ' desc' })];
    if (k === 'so') qs.push(gl(d, { fields, filters: [[d, 'sales_order', '=', name]], len: 200 }));
    body.innerHTML = skel(4);
    Promise.all(qs).then(res => { const seen = new Set(); res.flat().forEach(r => { if (!seen.has(r.rid)) { seen.add(r.rid); rows.push(r); } });
      body.innerHTML = ''; const h = document.createElement('div'); body.appendChild(h);
      mkTable(h, { name: 'linked_' + name, size: 25, cols: () => [{ l: tk === 'dn' ? 'h_dn' : 'h_grn', v: r => r.name, h: r => link(DT[tk].slug, r.name) }, { l: 'h_date', v: r => r.date }, { l: 'h_item', v: r => r.item }, Object.assign({ l: 'h_qty', v: r => r.qty, h: r => esc(fmt(r.qty)) }, U), { l: 'h_uom', v: r => r.uom }, { l: 'h_wh', v: r => r.wh }, { l: 'h_status', v: r => r.status, h: docChip }, { l: 'h_isret', v: r => r.is_return ? t('yes') : '', h: r => r.is_return ? '<span class="chip orange">' + esc(t('yes')) + '</span>' : '' }], fetch: localSrc(rows, r => r.name + r.item), unit: () => 'lines' });
    }).catch(e => { body.innerHTML = ''; body.appendChild(errBox(e.message)); });
  });
}

/* ---------- views ---------- */
const TABS = [['overview', 'tab_overview'], ['dn', 'tab_dn'], ['grn', 'tab_grn'], ['pend', 'tab_pend'], ['recon', 'tab_recon'], ['wh', 'tab_wh'], ['rep', 'tab_rep']];
const DR = {
  dn_all: { k: 'dn', t: 'k_dn_total', lv: 'doc', x: [] }, dn_sub: { k: 'dn', t: 'k_dn_sub', lv: 'doc', x: [['docstatus', '=', 1]] }, dn_draft: { k: 'dn', t: 'k_dn_draft', lv: 'doc', x: [['docstatus', '=', 0]] },
  dn_canc: { k: 'dn', t: 'k_dn_canc', lv: 'doc', x: [['docstatus', '=', 2]] }, dn_ret: { k: 'dn', t: 'k_dn_ret', lv: 'doc', x: [['docstatus', '=', 1], ['is_return', '=', 1]] },
  pr_all: { k: 'pr', t: 'k_pr_total', lv: 'doc', x: [] }, pr_sub: { k: 'pr', t: 'k_pr_sub', lv: 'doc', x: [['docstatus', '=', 1]] }, pr_draft: { k: 'pr', t: 'k_pr_draft', lv: 'doc', x: [['docstatus', '=', 0]] },
  pr_canc: { k: 'pr', t: 'k_pr_canc', lv: 'doc', x: [['docstatus', '=', 2]] }, pr_ret: { k: 'pr', t: 'k_pr_ret', lv: 'doc', x: [['docstatus', '=', 1], ['is_return', '=', 1]] },
  so_pend: { k: 'so', t: 'k_so_pend', mode: 'pend' }, so_part: { k: 'so', t: 'k_so_part', mode: 'part' }, so_over: { k: 'so', t: 'k_so_over', mode: 'over' },
  po_pend: { k: 'po', t: 'k_po_pend', mode: 'pend' }, po_part: { k: 'po', t: 'k_po_part', mode: 'part' }, po_over: { k: 'po', t: 'k_po_over', mode: 'over' },
  qty_dn: { t: 'k_dn_qty', qty: 'dn' }, qty_pr: { t: 'k_pr_qty', qty: 'pr' } };
function setHtml(el, h) { el.innerHTML = h; return el; }
function mkKpi(grid, cls, label, promise, show, drill) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'tr-kpi ' + cls; b.innerHTML = '<small>' + esc(t(label)) + '</small><b><span class="sk" style="width:60%;display:block"></span></b>';
  const val = $('b', b), ep = S.epoch; b.onclick = () => openDrill(drill); grid.appendChild(b);
  promise.then(v => { if (ep !== S.epoch || !b.isConnected) return; const r = show(v); val.textContent = r.text; if (r.sm) val.className = 'sm'; }).catch(e => { if (ep !== S.epoch || !b.isConnected) return; val.textContent = t('unavailable'); val.className = 'sm'; b.title = e.message; });
}
const uomText = rows => { if (!rows.length) return { text: '0' }; const top = rows.slice(0, 3).map(r => fmt(r.q) + ' ' + r.u).join(' · '); return { text: top + (rows.length > 3 ? ' +' + (rows.length - 3) + ' ' + t('more') : ''), sm: true }; };
function section(main, titleKey) { const s = document.createElement('section'); s.className = 'tr-sec'; s.innerHTML = '<h2>' + esc(t(titleKey)) + '</h2>'; main.appendChild(s); return s; }
function applyParty(v) { S.f.party = v; syncInputs(); refresh(false); }
/* Warehouse: the code (Warehouse.name) stays the filter value / query key; the readable warehouse_name is only what people see. */
function buildWhLabels() {
  const cnt = {}; S.lists.wh.forEach(w => { const n = (w.warehouse_name || '').trim(); if (n) cnt[n] = (cnt[n] || 0) + 1; });
  S.whLabel = {}; S.lists.wh.forEach(w => { const n = (w.warehouse_name || '').trim(); S.whLabel[w.name] = !n || n === w.name ? w.name : (cnt[n] > 1 ? n + ' (' + w.name + ')' : n); });
}
const whLabel = c => (c && S.whLabel && S.whLabel[c]) || c || '';
function applyWh(v) { if (S.lists.wh.some(w => w.name === v)) { S.f.warehouse = v; syncInputs(); refresh(false); } }

function overview(main) {
  const dnC = docCounts('dn'), prC = docCounts('pr'), dnQ = qtyByUom('dn'), prQ = qtyByUom('pr'), n = x => ({ text: fmt(x) });
  let s = section(main, 'g_dn'); let g = document.createElement('div'); g.className = 'tr-kpis'; s.appendChild(g);
  mkKpi(g, '', 'k_dn_total', dnC, c => n(c.total), 'dn_all'); mkKpi(g, 'c-green', 'k_dn_sub', dnC, c => n(c.sub), 'dn_sub'); mkKpi(g, 'c-yellow', 'k_dn_draft', dnC, c => n(c.draft), 'dn_draft');
  mkKpi(g, 'c-gray', 'k_dn_canc', dnC, c => n(c.canc), 'dn_canc'); mkKpi(g, 'c-orange', 'k_dn_ret', dnC, c => n(c.ret), 'dn_ret');
  s = section(main, 'g_grn'); g = document.createElement('div'); g.className = 'tr-kpis'; s.appendChild(g);
  mkKpi(g, '', 'k_pr_total', prC, c => n(c.total), 'pr_all'); mkKpi(g, 'c-green', 'k_pr_sub', prC, c => n(c.sub), 'pr_sub'); mkKpi(g, 'c-yellow', 'k_pr_draft', prC, c => n(c.draft), 'pr_draft');
  mkKpi(g, 'c-gray', 'k_pr_canc', prC, c => n(c.canc), 'pr_canc'); mkKpi(g, 'c-orange', 'k_pr_ret', prC, c => n(c.ret), 'pr_ret');
  s = section(main, 'g_pend'); g = document.createElement('div'); g.className = 'tr-kpis'; s.appendChild(g);
  [['so', 'pend', 'k_so_pend', 'c-yellow'], ['po', 'pend', 'k_po_pend', 'c-yellow'], ['so', 'part', 'k_so_part', 'c-orange'], ['po', 'part', 'k_po_part', 'c-orange'], ['so', 'over', 'k_so_over', 'c-red'], ['po', 'over', 'k_po_over', 'c-red']]
    .forEach(([k, m, lb, cl]) => mkKpi(g, cl, lb, cntDocs(k, pendF(k, m), true), n, k + '_' + m));
  const grid = document.createElement('div'); grid.className = 'tr-grid'; grid.style.marginTop = '14px'; main.appendChild(grid);
  const add = (title, extra) => { const c = card(title, extra); grid.appendChild(c); return $('.bd', c); };
  load(add(t('c_monthly')), () => Promise.all([dailyCounts('dn'), dailyCounts('pr')]), (b, [a, p]) => {
    const ms = monthsBetween(S.f.from || (a[0] && a[0].d) || TODAY, S.f.to || TODAY), A = bucketMonths(a), Bp = bucketMonths(p);
    barChart(b, ms, [{ name: t('dn'), color: COL.navy, data: ms.map(m => A[m] || 0) }, { name: t('grn'), color: COL.teal, data: ms.map(m => Bp[m] || 0) }]); });
  const stat = k => () => gl(DT[k].p, { fields: [P(k) + 'status as g', 'count(distinct ' + P(k) + 'name) as n'], filters: flt(k, { nostatus: true }), group: P(k) + 'status', len: 30 });
  const stDraw = (b, r) => donut(b, r.map(x => ({ l: ts(x.g), v: x.n })).sort((a, c) => c.v - a.v));
  load(add(t('c_dnst')), stat('dn'), stDraw); load(add(t('c_prst')), stat('pr'), stDraw);
  const sel = document.createElement('select'); const qb = add(t('c_qty'), sel); qb.innerHTML = skel(4);
  Promise.all([dnQ, prQ]).then(([a, b]) => {
    const us = [...new Set(a.concat(b).map(x => x.u))]; us.sort((x, y) => (a.find(z => z.u === y) ? Math.abs(a.find(z => z.u === y).q) : 0) - (a.find(z => z.u === x) ? Math.abs(a.find(z => z.u === x).q) : 0));
    sel.innerHTML = us.map(u => '<option>' + esc(u) + '</option>').join('');
    const draw = () => load(qb, () => { const x = [[C('dn'), 'stock_uom']]; return Promise.all(['dn', 'pr'].map(k => gl(DT[k].p, { fields: [P(k) + DT[k].date + ' as d', 'sum(' + C(k) + 'stock_qty) as q'], filters: flt(k, { nostatus: true, extra: [sub1(k), [DT[k].c, 'stock_uom', '=', sel.value]] }), group: P(k) + DT[k].date, order: P(k) + DT[k].date + ' asc', len: 5000 }))); },
      (b2, [a2, p2]) => { const ms = monthsBetween(S.f.from || TODAY, S.f.to || TODAY), A = bucketMonths(a2, 'q'), Bp = bucketMonths(p2, 'q'); barChart(b2, ms, [{ name: t('delivered') + ' (' + sel.value + ')', color: COL.navy, data: ms.map(m => A[m] || 0) }, { name: t('received') + ' (' + sel.value + ')', color: COL.teal, data: ms.map(m => Bp[m] || 0) }]); });
    sel.onchange = draw; if (us.length) draw(); else qb.innerHTML = '<div class="tr-empty">' + esc(t('empty')) + '</div>';
  }).catch(e => { qb.innerHTML = ''; qb.appendChild(errBox(e.message)); });
  const top = (title, k, f, cb, lab) => load(add(title), () => groupedCount(k, f), (b, r) => hbars(b, r.filter(x => x.g).map(x => ({ l: lab ? lab(x.g) : x.g, k: x.g, v: x.n })), cb));
  top(t('c_topc'), 'dn', P('dn') + 'customer_name', it => applyParty(it.l)); top(t('c_tops'), 'pr', P('pr') + 'supplier_name', it => applyParty(it.l));
  top(t('c_whdn'), 'dn', C('dn') + 'warehouse', it => applyWh(it.k), whLabel); top(t('c_whpr'), 'pr', C('pr') + 'warehouse', it => applyWh(it.k), whLabel);
}

function openDrill(id) { S.drill = id; S.epoch++; render(); }
function drillView(main) {
  const d = DR[S.drill]; const b = document.createElement('button'); b.className = 'tr-btn tr-back'; b.textContent = '← ' + t('back'); b.onclick = () => { S.drill = null; S.epoch++; render(); }; main.appendChild(b);
  const h = document.createElement('h2'); h.textContent = t(d.t); h.style.color = COL.navy; main.appendChild(h);
  const host = document.createElement('div'); main.appendChild(host);
  if (d.qty) { load(host, () => qtyByUom(d.qty), (bd, rows) => mkTable(bd, { name: 'qty_' + d.qty, cols: () => [{ l: 'h_uom', s: 'u', v: r => r.u }, Object.assign({ l: 'h_qty', s: 'q', v: r => r.q, h: r => esc(fmt(r.q)) }, U)], fetch: localSrc(rows, r => r.u), unit: () => 'rows' })); return; }
  docTable(host, d.k, { level: d.lv || 'item', extra: d.x, mode: d.mode, nostatus: true, name: S.drill });
}
function tabTable(main, k) { const h = document.createElement('div'); main.appendChild(h); docTable(h, k, { level: 'item' }); }
function seg(items, cur, cb) { const s = document.createElement('div'); s.className = 'seg'; items.forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t(l); if (v === cur) b.className = 'on'; b.onclick = () => cb(v); s.appendChild(b); }); return s; }
function orderSection(main, k, titleKey, items, recon) {
  const s = section(main, titleKey); let mode = items[0][0]; const strip = document.createElement('div'); strip.className = 'tr-strip'; const sg = document.createElement('div'), host = document.createElement('div'); s.append(strip, sg, host);
  const draw = () => {
    sg.innerHTML = ''; sg.appendChild(seg(items, mode, v => { mode = v; draw(); }));
    if (!recon) { strip.innerHTML = '<span>' + esc(t('p_outqty')) + ': …</span>'; const ep = S.epoch, dn = k === 'so';
      gl(DT[k].p, { fields: [C(k) + 'uom as u', 'sum(' + C(k) + 'qty) as q', 'sum(' + C(k) + (dn ? 'delivered_qty' : 'received_qty') + ') as d'], filters: flt(k, { nostatus: true, extra: pendF(k, mode) }), group: C(k) + 'uom', len: 100 })
        .then(r => { if (ep !== S.epoch) return; const x = r.map(a => ({ u: a.u, p: (a.q || 0) - (a.d || 0) })).filter(a => a.p > 0).sort((a, b) => b.p - a.p); strip.innerHTML = '<span>' + esc(t('p_outqty')) + (x.length ? '' : ': 0') + '</span>' + x.slice(0, 8).map(a => '<span>' + esc(fmt(a.p) + ' ' + a.u) + '</span>').join(''); })
        .catch(e => { strip.innerHTML = ''; strip.appendChild(errBox(e.message)); }); }
    else strip.innerHTML = '<span>' + esc(t('n_link40')) + '</span>';
    host.innerHTML = ''; docTable(host, k, { mode, recon, name: (recon ? 'recon_' : 'pending_') + k + '_' + mode });
  };
  draw();
}
function pendTab(main) { const m = [['pend', 'm_all'], ['part', 'm_part'], ['over', 'm_over']]; orderSection(main, 'so', 'p_so', m, false); orderSection(main, 'po', 'p_po', m, false); }
function reconTab(main) { const m = [['every', 'm_every'], ['out', 'm_out'], ['done', 'm_done']]; orderSection(main, 'so', 'r_so', m, true); orderSection(main, 'po', 'r_po', m, true); }

/* warehouse performance */
function whView(host) {
  const q1 = (k, extra) => gl(DT[k].p, { fields: [C(k) + 'warehouse as w', 'count(distinct ' + P(k) + 'name) as n'], filters: flt(k, { nostatus: true, extra }), group: C(k) + 'warehouse', len: 500 });
  const q2 = k => gl(DT[k].p, { fields: [C(k) + 'warehouse as w', C(k) + 'stock_uom as u', 'sum(' + C(k) + 'stock_qty) as q'], filters: flt(k, { nostatus: true, extra: [sub1(k)] }), group: C(k) + 'warehouse,' + C(k) + 'stock_uom', len: 2000 });
  load(host, () => Promise.all([q1('dn', [sub1('dn')]), q2('dn'), q1('pr', [sub1('pr')]), q2('pr'), q1('so', pendF('so', 'pend')), q1('so', pendF('so', 'over')), q1('po', pendF('po', 'pend')), q1('po', pendF('po', 'over'))]), (b, r) => {
    const m = {}, get = w => (m[w] = m[w] || { w, dn: 0, pr: 0, sop: 0, soo: 0, pop: 0, poo: 0, dq: [], pq: [] });
    r[0].forEach(x => x.w && (get(x.w).dn = x.n)); r[2].forEach(x => x.w && (get(x.w).pr = x.n)); r[4].forEach(x => x.w && (get(x.w).sop = x.n)); r[5].forEach(x => x.w && (get(x.w).soo = x.n)); r[6].forEach(x => x.w && (get(x.w).pop = x.n)); r[7].forEach(x => x.w && (get(x.w).poo = x.n));
    r[1].forEach(x => x.w && x.q && get(x.w).dq.push({ u: x.u, q: x.q })); r[3].forEach(x => x.w && x.q && get(x.w).pq.push({ u: x.u, q: x.q }));
    const rows = Object.values(m).sort((a, c) => (c.dn + c.pr) - (a.dn + a.pr)); const qt = a => a.sort((x, y) => Math.abs(y.q) - Math.abs(x.q)).slice(0, 3).map(z => fmt(z.q) + ' ' + z.u).join(' · ') + (a.length > 3 ? ' +' + (a.length - 3) : '');
    rows.forEach(x => { x.dqt = qt(x.dq); x.pqt = qt(x.pq); });
    mkTable(b, { name: 'warehouse_performance', cols: () => [{ l: 'h_wh', s: 'w', v: r2 => whLabel(r2.w), h: r2 => '<a data-act="wh" class="lnk" title="' + esc(r2.w) + '">' + esc(whLabel(r2.w)) + '</a>' }, Object.assign({ l: 'dn', s: 'dn', v: r2 => r2.dn, h: r2 => esc(fmt(r2.dn)) }, U), Object.assign({ l: 'grn', s: 'pr', v: r2 => r2.pr, h: r2 => esc(fmt(r2.pr)) }, U), { l: 'h_dnq', v: r2 => r2.dqt }, { l: 'h_prq', v: r2 => r2.pqt },
      Object.assign({ l: 'h_oso', s: 'sop', v: r2 => r2.sop, h: r2 => esc(fmt(r2.sop)) }, U), Object.assign({ l: 'h_opo', s: 'pop', v: r2 => r2.pop, h: r2 => esc(fmt(r2.pop)) }, U), Object.assign({ l: 'h_oos', s: 'soo', v: r2 => r2.soo, h: r2 => esc(fmt(r2.soo)) }, U), Object.assign({ l: 'h_oop', s: 'poo', v: r2 => r2.poo, h: r2 => esc(fmt(r2.poo)) }, U)],
      fetch: localSrc(rows, r2 => whLabel(r2.w) + ' ' + r2.w), unit: () => 'rows', act: (a, r2) => whModal(r2.w) });
  });
}
function whModal(w) {
  openModal(whLabel(w), body => {
    const nav = document.createElement('div'); nav.className = 'tr-tb'; body.appendChild(nav);
    [['dn', 'w_open_dn'], ['grn', 'w_open_pr']].forEach(([tab, l]) => { const b = document.createElement('button'); b.className = 'tr-btn'; b.textContent = t(l); b.onclick = () => { S.f.warehouse = w; closeModal(); syncInputs(); S.tab = tab; S.drill = null; refresh(false); }; nav.appendChild(b); });
    const c = card(t('w_trend')); body.appendChild(c);
    load($('.bd', c), () => Promise.all(['dn', 'pr'].map(k => dailyCounts(k, [[DT[k].c, 'warehouse', '=', w]]))), (b, [a, p]) => { const ms = monthsBetween(S.f.from || TODAY, S.f.to || TODAY), A = bucketMonths(a), B = bucketMonths(p); barChart(b, ms, [{ name: t('dn'), color: COL.navy, data: ms.map(x => A[x] || 0) }, { name: t('grn'), color: COL.teal, data: ms.map(x => B[x] || 0) }]); });
  });
}

/* reports */
function trendReport(host, k) {
  load(host, () => dailyCounts(k), (b, rows) => { const c = document.createElement('div'); b.appendChild(c); lineChart(c, rows.map(r => ({ d: r.d, v: r.n })), k === 'dn' ? COL.navy : COL.teal);
    const h = document.createElement('div'); h.style.marginTop = '10px'; b.appendChild(h); mkTable(h, { name: 'daily_' + k, cols: () => [{ l: 'h_date', s: 'd', v: r => r.d }, Object.assign({ l: 'h_n', s: 'n', v: r => r.n, h: r => esc(fmt(r.n)) }, U)], fetch: localSrc(rows.slice().reverse(), r => r.d), unit: () => 'rows' }); });
}
function partyReport(host, k) {
  const f = k === 'dn' ? P(k) + 'customer_name' : P(k) + 'supplier_name', q = extra => gl(DT[k].p, { fields: [f + ' as g', 'count(distinct ' + P(k) + 'name) as n'], filters: flt(k, { nostatus: true, extra }), group: f, order: 'n desc', len: 500 });
  load(host, () => Promise.all([q([sub1(k), [DT[k].p, 'is_return', '=', 0]]), q([sub1(k), [DT[k].p, 'is_return', '=', 1]])]), (b, [a, r]) => {
    const rm = {}; r.forEach(x => rm[x.g] = x.n); const rows = a.map(x => ({ g: x.g || '', n: x.n, r: rm[x.g] || 0 }));
    mkTable(b, { name: (k === 'dn' ? 'customer' : 'supplier') + '_summary', cols: () => [{ l: k === 'dn' ? 'h_customer' : 'h_supplier', s: 'g', v: x => x.g }, Object.assign({ l: 'h_n', s: 'n', v: x => x.n, h: x => esc(fmt(x.n)) }, U), Object.assign({ l: 'h_rn', s: 'r', v: x => x.r, h: x => esc(fmt(x.r)) }, U)], fetch: localSrc(rows, x => x.g), unit: () => 'rows', note: () => rows.length >= 500 ? t('n_top') : '' }); });
}
function monthlyReport(host) {
  load(host, () => Promise.all([dailyCounts('dn'), dailyCounts('pr')]), (b, [a, p]) => { const ms = monthsBetween(S.f.from || TODAY, S.f.to || TODAY), A = bucketMonths(a), B = bucketMonths(p);
    const c = document.createElement('div'); b.appendChild(c); barChart(c, ms, [{ name: t('dn'), color: COL.navy, data: ms.map(x => A[x] || 0) }, { name: t('grn'), color: COL.teal, data: ms.map(x => B[x] || 0) }]);
    const h = document.createElement('div'); h.style.marginTop = '10px'; b.appendChild(h); const rows = ms.map(x => ({ m: x, dn: A[x] || 0, pr: B[x] || 0 })).reverse();
    mkTable(h, { name: 'monthly_comparison', cols: () => [{ l: 'h_date', s: 'm', v: x => x.m }, Object.assign({ l: 'dn', s: 'dn', v: x => x.dn, h: x => esc(fmt(x.dn)) }, U), Object.assign({ l: 'grn', s: 'pr', v: x => x.pr, h: x => esc(fmt(x.pr)) }, U)], fetch: localSrc(rows, x => x.m), unit: () => 'rows' }); });
}
function repTab(main) {
  const R2 = [['rp_ddn', h => trendReport(h, 'dn')], ['rp_dpr', h => trendReport(h, 'pr')], ['rp_mon', monthlyReport], ['rp_cust', h => partyReport(h, 'dn')], ['rp_sup', h => partyReport(h, 'pr')], ['rp_wh', whView],
    ['rp_osd', h => docTable(h, 'so', { mode: 'pend', name: 'outstanding_deliveries' })], ['rp_osp', h => docTable(h, 'po', { mode: 'pend', name: 'outstanding_receipts' })],
    ['rp_rd', h => docTable(h, 'dn', { level: 'doc', extra: [['docstatus', '=', 1], ['is_return', '=', 1]], nostatus: true, name: 'returned_deliveries' })], ['rp_rr', h => docTable(h, 'pr', { level: 'doc', extra: [['docstatus', '=', 1], ['is_return', '=', 1]], nostatus: true, name: 'returned_receipts' })]];
  const bar = document.createElement('div'); bar.className = 'tr-tb'; const sel = document.createElement('select'); sel.style.height = '30px'; sel.innerHTML = R2.map((r, i) => '<option value="' + i + '">' + esc(t(r[0])) + '</option>').join('');
  const lb = document.createElement('b'); lb.textContent = t('rep_pick') + ':'; lb.style.color = COL.navy; bar.append(lb, sel); main.appendChild(bar); const host = document.createElement('div'); main.appendChild(host);
  const go = () => { S.repIdx = +sel.value; S.epoch++; host.innerHTML = ''; R2[+sel.value][1](host); }; sel.value = S.repIdx || 0; sel.onchange = go; host.innerHTML = ''; R2[+sel.value][1](host);
}

/* ---------- shell ---------- */
function render() {
  closeModal(); const main = $('#tr-main'); main.innerHTML = '';
  $$('#tr-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  $('#tr-hint').textContent = [S.f.division ? t('n_hint_div') : '', t('n_stat')].filter(Boolean).join('  •  ');
  if (S.drill) return drillView(main);
  ({ overview, dn: m => tabTable(m, 'dn'), grn: m => tabTable(m, 'pr'), pend: pendTab, recon: reconTab, wh: m => { const s = section(m, 'w_title'); const h = document.createElement('div'); s.appendChild(h); whView(h); }, rep: repTab })[S.tab](main);
}
function refresh(clear) { if (clear) S.cache.clear(); S.epoch++; S.drill = (S.drill && !clear) ? S.drill : S.drill; render(); }
function buildTabs() {
  const nav = $('#tr-tabs'); nav.innerHTML = ''; TABS.forEach(([id, l]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.tab = id; b.setAttribute('role', 'tab'); b.textContent = t(l); b.onclick = () => { S.tab = id; S.drill = null; S.epoch++; render(); }; nav.appendChild(b); });
}
function fillSelect(sel, items, cur) { sel.innerHTML = '<option value="">' + esc(t('all')) + '</option>' + items.map(x => '<option value="' + esc(x) + '">' + esc(x) + '</option>').join(''); sel.value = items.includes(cur) ? cur : ''; }
function fillWh() { const ws = S.lists.wh.filter(w => !S.f.company || w.company === S.f.company), items = ws.map(w => w.name), sel = $('#f-warehouse'); sel.innerHTML = '<option value="">' + esc(t('all')) + '</option>' + ws.slice().sort((a, b) => whLabel(a.name).localeCompare(whLabel(b.name), undefined, { numeric: true })).map(w => '<option value="' + esc(w.name) + '" title="' + esc(w.name) + '">' + esc(whLabel(w.name)) + '</option>').join(''); sel.value = items.includes(S.f.warehouse) ? S.f.warehouse : ''; sel.disabled = !!S.whErr; if (!items.includes(S.f.warehouse)) S.f.warehouse = ''; }
function syncInputs() { fillSelect($('#f-company'), S.lists.comp, S.f.company); fillSelect($('#f-division'), S.lists.div, S.f.division); fillWh(); $('#f-from').value = S.f.from; $('#f-to').value = S.f.to; $('#f-party').value = S.f.party; $('#f-status').value = S.f.status; }
function applyLang() {
  const root = $('#dmgtr'); root.dir = S.lang === 'ar' ? 'rtl' : 'ltr'; root.lang = S.lang;
  $$('[data-i]').forEach(el => { el.textContent = t(el.dataset.i); });
  $$('.tr-lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === S.lang)); buildTabs(); syncInputs(); markDone();
}
function bind() {
  const ch = (id, key, after) => $(id).addEventListener('change', e => { S.f[key] = e.target.value; if (after) after(); S.drill = S.drill; refresh(false); });
  ch('#f-company', 'company', () => { fillWh(); }); ch('#f-division', 'division'); ch('#f-warehouse', 'warehouse'); ch('#f-status', 'status');
  const dateCh = key => e => { S.f[key] = e.target.value; if (S.f.from && S.f.to && S.f.from > S.f.to) { const x = S.f.from; S.f.from = S.f.to; S.f.to = x; syncInputs(); } refresh(false); };
  $('#f-from').addEventListener('change', dateCh('from')); $('#f-to').addEventListener('change', dateCh('to'));
  let tm; const pin = $('#f-party'); pin.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { S.f.party = pin.value.trim(); refresh(false); }, 500); });
  $('#f-reset').addEventListener('click', () => { S.f = { company: '', division: '', warehouse: '', from: TODAY.slice(0, 4) + '-01-01', to: TODAY, party: '', status: '' }; syncInputs(); refresh(false); });
  $('#tr-refresh').addEventListener('click', () => refresh(true));
  $$('.tr-lang button').forEach(b => b.addEventListener('click', () => { S.lang = b.dataset.lang; try { localStorage.setItem('dmgtr_lang', S.lang); } catch (e) {} applyLang(); S.epoch++; render(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}
async function init() {
  bind(); applyLang(); render();
  try {
    const [c, d, w] = await Promise.all([gl('Company', { fields: ['name'], len: 200 }), gl('Division', { fields: ['name'], len: 200 }).catch(() => []), gl('Warehouse', { fields: ['name', 'company', 'warehouse_name'], filters: [['is_group', '=', 0]], len: 1000, order: 'name asc' }).catch(() => { S.whErr = true; return []; })]);
    S.lists.comp = c.map(x => x.name); S.lists.div = d.map(x => x.name); S.lists.wh = w; buildWhLabels(); syncInputs(); if (S.whErr) $('#tr-hint').textContent = t('wh_na');
  } catch (e) { $('#tr-hint').textContent = t('err') + ': ' + e.message; }
}
window.__dmgtr_cleanup = () => { S.epoch++; queue.length = 0; };
init();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
