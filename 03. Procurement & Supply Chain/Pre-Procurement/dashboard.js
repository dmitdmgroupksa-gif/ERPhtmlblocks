(function () {
  const R = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
  const $ = (s) => R.querySelector(s);
  const $$ = (s) => Array.from(R.querySelectorAll(s));
  const root = $('#pcc');
  if (!root) return;

  /* ---------- i18n ---------- */
  const I18N = {
    en: {
      title: 'Pre-Procurement Command Center', updated: 'Last updated', refresh: 'Refresh', company: 'Company', from: 'From', to: 'To',
      status: 'Status', search: 'Search', search_ph: 'Search records...', reset: 'Reset', loading: 'Loading live data…',
      open_list: 'Open in ERPNext', export: 'Export CSV', open_form: 'Open form', all: 'All',
      pg_prev: 'Previous', pg_next: 'Next', pg_page: 'Page', pg_of: 'of',
      tab_overview: 'Overview', tab_mr: 'Material Requests', tab_po: 'Purchase Orders', tab_sup: 'Suppliers & Delays',
      records: 'records', none: 'No records match the current filters.', clear_kpi: 'Clear card filter ✕',
      doc: 'Document', type: 'Type', date: 'Date', required_by: 'Required By', due: 'Due', days_late: 'Days Late', age: 'Age (days)', owner: 'Owner',
      ordered: 'Ordered %', received: 'Received %', billed: 'Billed %', supplier: 'Supplier', total: 'Total', group: 'Group',
      orders: 'Orders', po_value: 'PO Value', overdue_pos: 'Overdue POs', avg_recv: 'Avg Received %',
      item: 'Item', item_name: 'Item Name', rate: 'Rate', qty: 'Qty', amount: 'Amount', uom: 'UOM', items: 'Items', grand_total: 'Grand Total',
      k_mr_total: 'All Purchase MRs', k_mr_draft: 'Draft', k_mr_open: 'Open / Pending', k_mr_overdue: 'Overdue', k_mr_ordered: 'Fully Ordered', k_mr_stopped: 'Stopped',
      k_po_total: 'All POs', k_po_open: 'Awaiting Receipt', k_po_overdue: 'Overdue Delivery', k_po_done: 'Fully Received', k_po_draft: 'Draft', k_po_value: 'Total Value',
      k_sup_active: 'Active Suppliers', k_sup_engaged: 'Engaged (with PO)', k_sup_late: 'With Overdue POs',
      k_ov_mr_open: 'Open MRs', k_ov_mr_over: 'Overdue MRs', k_ov_po_open: 'POs Awaiting Receipt', k_ov_po_over: 'Overdue POs', k_ov_val: 'PO Value',
      c_status: 'By Status', c_month: 'By Month', c_month_val: 'Value by Month', c_aging: 'Open MR Aging (days)', c_top_sup: 'Top Suppliers by Value', c_funnel: 'Procurement Funnel',
      attention: 'Needs Attention (overdue)', t_orders: 'Purchase Orders',
      partial: 'showing the most recent records only (row ceiling reached) – narrow the date range', err_load: 'Could not load', err_perm: 'Check your read permission on this DocType.', no_ds: 'Not available',
      no_access: 'No access to', timeout: 'Request timed out', sub_mr_open: 'Submitted · Pending / Partially Ordered', sub_mr_over: 'Open and Required By before today', sub_po_open: 'Submitted · To Receive', sub_po_over: 'Awaiting receipt and past Required By'
    },
    ar: {
      title: 'مركز قيادة ما قبل المشتريات', updated: 'آخر تحديث', refresh: 'تحديث', company: 'الشركة', from: 'من', to: 'إلى',
      status: 'الحالة', search: 'بحث', search_ph: 'ابحث في السجلات...', reset: 'إعادة ضبط', loading: 'جارٍ تحميل البيانات المباشرة…',
      open_list: 'فتح في ERPNext', export: 'تصدير CSV', open_form: 'فتح النموذج', all: 'الكل',
      pg_prev: 'السابق', pg_next: 'التالي', pg_page: 'صفحة', pg_of: 'من',
      tab_overview: 'نظرة عامة', tab_mr: 'طلبات المواد', tab_po: 'أوامر الشراء', tab_sup: 'الموردون والتأخيرات',
      records: 'سجل', none: 'لا توجد سجلات مطابقة للفلاتر الحالية.', clear_kpi: 'إلغاء فلتر البطاقة ✕',
      doc: 'المستند', type: 'النوع', date: 'التاريخ', required_by: 'مطلوب بتاريخ', due: 'الاستحقاق', days_late: 'أيام التأخير', age: 'العمر (يوم)', owner: 'المالك',
      ordered: '% الطلب', received: '% الاستلام', billed: '% الفوترة', supplier: 'المورد', total: 'الإجمالي', group: 'المجموعة',
      orders: 'الأوامر', po_value: 'قيمة الأوامر', overdue_pos: 'أوامر متأخرة', avg_recv: 'متوسط % الاستلام',
      item: 'الصنف', item_name: 'اسم الصنف', rate: 'السعر', qty: 'الكمية', amount: 'المبلغ', uom: 'الوحدة', items: 'الأصناف', grand_total: 'الإجمالي الكلي',
      k_mr_total: 'كل طلبات الشراء', k_mr_draft: 'مسودة', k_mr_open: 'مفتوحة / معلقة', k_mr_overdue: 'متأخرة', k_mr_ordered: 'مكتملة الطلب', k_mr_stopped: 'موقوفة',
      k_po_total: 'كل الأوامر', k_po_open: 'بانتظار الاستلام', k_po_overdue: 'تأخر التسليم', k_po_done: 'مستلمة بالكامل', k_po_draft: 'مسودة', k_po_value: 'إجمالي القيمة',
      k_sup_active: 'موردون نشطون', k_sup_engaged: 'متفاعلون (لديهم أمر)', k_sup_late: 'لديهم أوامر متأخرة',
      k_ov_mr_open: 'طلبات مفتوحة', k_ov_mr_over: 'طلبات متأخرة', k_ov_po_open: 'أوامر بانتظار الاستلام', k_ov_po_over: 'أوامر متأخرة', k_ov_val: 'قيمة الأوامر',
      c_status: 'حسب الحالة', c_month: 'حسب الشهر', c_month_val: 'القيمة حسب الشهر', c_aging: 'أعمار الطلبات المفتوحة (يوم)', c_top_sup: 'أعلى الموردين قيمة', c_funnel: 'مسار المشتريات',
      attention: 'يحتاج انتباه (متأخر)', t_orders: 'أوامر الشراء',
      partial: 'عرض أحدث السجلات فقط (بلغ الحد الأقصى) – ضيّق نطاق التاريخ', err_load: 'تعذر تحميل', err_perm: 'تحقق من صلاحية القراءة لهذا المستند.', no_ds: 'غير متاح',
      no_access: 'لا توجد صلاحية للوصول إلى', timeout: 'انتهت مهلة الطلب', sub_mr_open: 'معتمدة · معلقة / مطلوبة جزئيًا', sub_mr_over: 'مفتوحة وتاريخ المطلوب قبل اليوم', sub_po_open: 'معتمدة · بانتظار الاستلام', sub_po_over: 'بانتظار الاستلام وتجاوزت تاريخ المطلوب'
    }
  };
  const DT_NAMES = { 'Material Request': ['Material Request', 'طلب مواد'], 'Purchase Order': ['Purchase Order', 'أمر شراء'], 'Supplier': ['Supplier', 'مورد'] };

  const S = { lang: 'en', tab: 'overview', company: '', from: '', to: '', status: '', q: '', kpi: '', sort: null, page: 1, ps: 25, cache: {}, errors: {}, partial: {} };
  try { S.lang = localStorage.getItem('pcc_lang') || (frappe.boot && frappe.boot.lang === 'ar' ? 'ar' : 'en'); } catch (e) {}
  const t = (k) => (I18N[S.lang][k] != null ? I18N[S.lang][k] : (I18N.en[k] || k));
  const dtn = (d) => (DT_NAMES[d] ? DT_NAMES[d][S.lang === 'ar' ? 1 : 0] : d);

  /* ---------- helpers ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n, d) => new Intl.NumberFormat(S.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: d == null ? 0 : d }).format(n || 0);
  const sum = (rows, f) => rows.reduce((a, r) => a + (parseFloat(r[f]) || 0), 0);
  const route = (...a) => { try { frappe.set_route(...a); } catch (e) { window.open('/app/' + a.map((x) => String(x).toLowerCase().replace(/ /g, '-')).join('/'), '_blank'); } };
  /* open an ERPNext list view with filters (object of field -> value | [operator, value]) in a new tab */
  const openErp = (dt, f) => {
    const qs = Object.keys(f || {}).map((k) => {
      const v = f[k];
      return encodeURIComponent(k) + '=' + encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : String(v));
    }).join('&');
    window.open('/app/' + String(dt).toLowerCase().replace(/ /g, '-') + (qs ? '?' + qs : ''), '_blank');
  };
  /* Direct, silent API call: no Frappe popups, always settles (timeout), 403 -> error with .perm */
  const call = (method, args) => new Promise((resolve, reject) => {
    let done = false; const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(() => { if (done) return; done = true; if (ctl) { try { ctl.abort(); } catch (x) {} } reject(new Error(t('timeout'))); }, 90000);
    const body = new URLSearchParams();
    Object.keys(args || {}).forEach((k) => { const v = args[k]; if (v === undefined || v === null) return; body.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v)); });
    fetch('/api/method/' + method, { method: 'POST', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined,
      headers: { 'X-Frappe-CSRF-Token': (window.frappe && frappe.csrf_token) || '', Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() })
      .then((r) => r.text().then((txt) => ({ r, txt })))
      .then(({ r, txt }) => {
        if (done) return; done = true; clearTimeout(timer);
        let j = null; try { j = JSON.parse(txt); } catch (x) {}
        if (r.ok && j && !j.exc) { resolve(j.message); return; }
        const ex = String((j && (j.exception || j.exc_type)) || '');
        const perm = r.status === 401 || r.status === 403 || /permission/i.test(ex);
        const e = new Error(perm ? t('no_access') : (ex.split(':').slice(-1)[0].trim() || ('HTTP ' + r.status))); e.perm = perm; reject(e);
      })
      .catch((err) => { if (done) return; done = true; clearTimeout(timer); reject(err || new Error('request failed')); });
  });
  const PAGE = 2000, CEIL = 20000;
  const getList = async (doctype, fields, filters, extra) => {
    let out = [], start = 0;
    for (;;) {
      const page = (await call('frappe.client.get_list', Object.assign({ doctype, fields, filters, limit_page_length: PAGE, limit_start: start, order_by: 'creation desc' }, extra || {}))) || [];
      out = out.concat(page);
      if (page.length < PAGE) break;
      start += PAGE;
      if (out.length >= CEIL) { S.partial[doctype] = true; break; }
    }
    return out;
  };
  const badgeCls = (s) => {
    s = String(s || '').toLowerCase();
    if (/(ordered|received|completed|closed|submitted|to bill|accepted)/.test(s) && !/(partially|to receive)/.test(s)) return 'ok';
    if (/(draft|pending|partially|to receive|open)/.test(s)) return 'warn';
    if (/(cancel|stop|expired|lost|reject|overdue)/.test(s)) return 'bad';
    return 'info';
  };

  /* ---------- dataset definitions ----------
     base = filters for the data load, erp = equivalent filters for the ERPNext list view.
     Material Requests in workflow state "Closed" are excluded everywhere. */
  const DS = {
    mr: { dt: 'Material Request', date: 'transaction_date', company: true,
      base: [['material_request_type', '=', 'Purchase'], ['docstatus', '<', 2], ['workflow_state', '!=', 'Closed']],
      erp: { material_request_type: 'Purchase', docstatus: ['!=', 2], workflow_state: ['!=', 'Closed'] },
      fields: ['name', 'status', 'workflow_state', 'transaction_date', 'schedule_date', 'company', 'per_ordered', 'per_received', 'docstatus', 'owner'] },
    po: { dt: 'Purchase Order', date: 'transaction_date', company: true, base: [['docstatus', '<', 2]],
      erp: { docstatus: ['!=', 2] },
      fields: ['name', 'supplier', 'supplier_name', 'status', 'transaction_date', 'schedule_date', 'grand_total', 'base_grand_total', 'currency', 'per_received', 'per_billed', 'company', 'docstatus'] },
    sup: { dt: 'Supplier', date: null, company: false, base: [], erp: {}, fields: ['name', 'supplier_name', 'supplier_group', 'disabled'] }
  };
  const enrich = (k, r) => {
    r._dt = DS[k].dt;
    if (r.transaction_date) r._age = Math.max(0, days(r.transaction_date, TODAY));
    if (r.schedule_date) r._late = Math.max(0, days(r.schedule_date, TODAY));
    return r;
  };
  async function load(k) {
    if (S.cache[k]) return S.cache[k];
    const d = DS[k], f = d.base.slice();
    if (d.company && S.company) f.push(['company', '=', S.company]);
    if (d.date && S.from) f.push([d.date, '>=', S.from]);
    if (d.date && S.to) f.push([d.date, '<=', S.to]);
    try {
      const rows = (await getList(d.dt, d.fields, f)) || [];
      delete S.errors[k];
      return (S.cache[k] = rows.map((r) => enrich(k, r)));
    } catch (e) {
      S.errors[k] = { dt: d.dt, perm: !!(e && e.perm), msg: (e && e.message) || '' }; return (S.cache[k] = []);
    }
  }

  /* ---------- predicates ---------- */
  const PO_OPEN_STATUS = ['To Receive and Bill', 'To Receive'];
  const MR_OPEN_STATUS = ['Pending', 'Partially Ordered'];
  const P = {
    mrOpen: (r) => r.docstatus === 1 && MR_OPEN_STATUS.includes(r.status),
    mrOver: (r) => P.mrOpen(r) && r.schedule_date && r.schedule_date < TODAY,
    poOpen: (r) => r.docstatus === 1 && PO_OPEN_STATUS.includes(r.status),
    poOver: (r) => P.poOpen(r) && r.schedule_date && r.schedule_date < TODAY && (r.per_received || 0) < 100
  };

  /* ---------- tab configs (table columns + KPI cards) ----------
     kpi.f = filters used by "Open in ERPNext" when that card is selected */
  const C = {
    mr: { ds: 'mr', title: 'tab_mr',
      cols: [{ k: 'name', lk: 'doc', type: 'link' }, { k: 'transaction_date', lk: 'date', type: 'date' }, { k: 'schedule_date', lk: 'required_by', type: 'date' }, { k: 'status', lk: 'status', type: 'status' },
        { k: 'per_ordered', lk: 'ordered', type: 'pct' }, { k: 'per_received', lk: 'received', type: 'pct' }, { k: '_age', lk: 'age', type: 'num' }, { k: 'owner', lk: 'owner', type: 'text' }],
      kpis: [{ id: 'all', lk: 'k_mr_total', test: () => true, f: {} },
        { id: 'draft', lk: 'k_mr_draft', test: (r) => r.docstatus === 0, cls: 'warn', f: { docstatus: 0 } },
        { id: 'open', lk: 'k_mr_open', test: P.mrOpen, cls: 'warn', f: { docstatus: 1, status: ['in', MR_OPEN_STATUS] } },
        { id: 'over', lk: 'k_mr_overdue', test: P.mrOver, cls: 'bad', f: { docstatus: 1, status: ['in', MR_OPEN_STATUS], schedule_date: ['<', TODAY] } },
        { id: 'ordered', lk: 'k_mr_ordered', test: (r) => r.status === 'Ordered', cls: 'ok', f: { status: 'Ordered' } },
        { id: 'stopped', lk: 'k_mr_stopped', test: (r) => r.status === 'Stopped', cls: 'bad', f: { status: 'Stopped' } }],
      charts: ['status', 'month', 'aging'] },
    po: { ds: 'po', title: 'tab_po', valueField: 'base_grand_total',
      cols: [{ k: 'name', lk: 'doc', type: 'link' }, { k: 'supplier_name', lk: 'supplier', type: 'text' }, { k: 'transaction_date', lk: 'date', type: 'date' }, { k: 'schedule_date', lk: 'required_by', type: 'date' },
        { k: 'status', lk: 'status', type: 'status' }, { k: 'per_received', lk: 'received', type: 'pct' }, { k: 'per_billed', lk: 'billed', type: 'pct' }, { k: 'grand_total', lk: 'grand_total', type: 'money' }],
      kpis: [{ id: 'all', lk: 'k_po_total', test: () => true, f: {} },
        { id: 'draft', lk: 'k_po_draft', test: (r) => r.docstatus === 0, cls: 'warn', f: { docstatus: 0 } },
        { id: 'open', lk: 'k_po_open', test: P.poOpen, cls: 'warn', f: { docstatus: 1, status: ['in', PO_OPEN_STATUS] } },
        { id: 'over', lk: 'k_po_overdue', test: P.poOver, cls: 'bad', f: { docstatus: 1, status: ['in', PO_OPEN_STATUS], schedule_date: ['<', TODAY], per_received: ['<', 100] } },
        { id: 'done', lk: 'k_po_done', test: (r) => (r.per_received || 0) >= 100, cls: 'ok', f: { per_received: ['>=', 100] } },
        { id: 'val', lk: 'k_po_value', test: () => true, sum: 'base_grand_total', f: {} }],
      charts: ['status', 'monthVal', 'topSup'] }
  };

  /* filters for "Open in ERPNext" of a generic tab (company, period, selected card, status) */
  function erpFilters(tab) {
    const cfg = C[tab], d = DS[cfg.ds], f = Object.assign({}, d.erp);
    if (d.company && S.company) f.company = S.company;
    if (d.date) {
      if (S.from && S.to) f[d.date] = ['Between', [S.from, S.to]];
      else if (S.from) f[d.date] = ['>=', S.from];
      else if (S.to) f[d.date] = ['<=', S.to];
    }
    const kp = cfg.kpis.find((k) => k.id === S.kpi);
    if (kp && kp.f) Object.assign(f, kp.f);
    if (S.status) f.status = S.status;
    return f;
  }

  /* ---------- charts (pure SVG/CSS, no dependencies) ---------- */
  const PAL = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#475569'];
  function donut(title, data, onClickAttr) {
    const total = data.reduce((a, d) => a + d.v, 0);
    if (!total) return `<div class="card"><h3>${esc(title)}</h3><div class="empty">${t('none')}</div></div>`;
    const Rr = 52, Cc = 2 * Math.PI * Rr; let off = 0;
    const arcs = data.map((d, i) => {
      const len = d.v / total * Cc;
      const s = `<circle cx="75" cy="75" r="${Rr}" fill="none" stroke="${PAL[i % PAL.length]}" stroke-width="22" stroke-dasharray="${len} ${Cc - len}" stroke-dashoffset="${-off}" transform="rotate(-90 75 75)" ${onClickAttr}="${esc(d.l)}"><title>${esc(d.l)}: ${nf(d.v)}</title></circle>`;
      off += len; return s;
    }).join('');
    const leg = data.map((d, i) => `<span ${onClickAttr}="${esc(d.l)}"><i style="background:${PAL[i % PAL.length]}"></i>${esc(d.l)} (${nf(d.v)})</span>`).join('');
    return `<div class="card"><h3>${esc(title)}</h3><div class="donut-wrap"><svg viewBox="0 0 150 150">${arcs}<text x="75" y="80" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">${nf(total)}</text></svg><div class="legend">${leg}</div></div></div>`;
  }
  function hbars(title, data, fmt) {
    if (!data.length) return `<div class="card"><h3>${esc(title)}</h3><div class="empty">${t('none')}</div></div>`;
    const mx = Math.max(...data.map((d) => d.v), 1);
    return `<div class="card"><h3>${esc(title)}</h3><div class="hbars">${data.map((d) =>
      `<div class="hb" ${d.attr || ''}><span class="t" title="${esc(d.l)}">${esc(d.l)}</span><span class="tr"><i style="width:${d.v / mx * 100}%"></i></span><span class="n">${fmt ? fmt(d.v) : nf(d.v)}</span></div>`).join('')}</div></div>`;
  }
  function vbars(title, data) {
    if (!data.length) return `<div class="card"><h3>${esc(title)}</h3><div class="empty">${t('none')}</div></div>`;
    const mx = Math.max(...data.map((d) => d.v), 1);
    return `<div class="card"><h3>${esc(title)}</h3><div class="vbars">${data.map((d) =>
      `<div class="vb"><b>${nf(d.v)}</b><i style="height:${Math.max(2, d.v / mx * 100)}px" title="${esc(d.l)}: ${nf(d.v)}"></i><span>${esc(d.l)}</span></div>`).join('')}</div></div>`;
  }
  const countBy = (rows, f) => { const m = {}; rows.forEach((r) => { const k = r[f] || '—'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v); };
  const byMonth = (rows, dateF, valF) => { const m = {}; rows.forEach((r) => { const k = (r[dateF] || '').slice(0, 7); if (k) m[k] = (m[k] || 0) + (valF ? parseFloat(r[valF]) || 0 : 1); }); return Object.keys(m).sort().slice(-12).map((k) => ({ l: k, v: m[k] })); };
  function chartHtml(id, rows, cfg) {
    if (id === 'status') return donut(t('c_status'), countBy(rows, 'status'), 'data-status');
    if (id === 'month') return vbars(t('c_month'), byMonth(rows, 'transaction_date'));
    if (id === 'monthVal') return vbars(t('c_month_val'), byMonth(rows, 'transaction_date', cfg.valueField));
    if (id === 'aging') {
      const o = rows.filter(P.mrOpen), b = [['0-7', 0, 7], ['8-30', 8, 30], ['31-60', 31, 60], ['60+', 61, 1e9]];
      return hbars(t('c_aging'), b.map(([l, a, z]) => ({ l, v: o.filter((r) => r._age >= a && r._age <= z).length })));
    }
    if (id === 'topSup') {
      const m = {}; rows.forEach((r) => { const k = r.supplier_name || r.supplier || '—'; m[k] = (m[k] || 0) + (parseFloat(r[cfg.valueField]) || 0); });
      return hbars(t('c_top_sup'), Object.entries(m).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v).slice(0, 8).map((d) => ({ ...d, attr: `data-q="${esc(d.l)}"` })));
    }
    return '';
  }

  /* ---------- view builders: each returns {kpis, charts, table, erp} ---------- */
  function applyFilters(rows, cols, ignoreSearch) {
    let out = rows;
    if (S.status) out = out.filter((r) => r.status === S.status);
    if (S.q && !ignoreSearch) { const q = S.q.toLowerCase(); out = out.filter((r) => cols.some((c) => String(r[c.k] == null ? '' : r[c.k]).toLowerCase().includes(q))); }
    return out;
  }
  const errOf = (ds) => S.errors[ds];
  const naText = (ds) => `${t('no_access')} ${dtn(DS[ds].dt)}`;
  async function viewGeneric(tab) {
    const cfg = C[tab], base = await load(cfg.ds);
    const scoped = base.filter((r) => !S.q || cfg.cols.some((c) => String(r[c.k] == null ? '' : r[c.k]).toLowerCase().includes(S.q.toLowerCase())));
    const kpis = cfg.kpis.map((k) => {
      if (errOf(cfg.ds)) return { id: k.id, label: t(k.lk), cls: k.cls, value: '—', sub: errOf(cfg.ds).perm ? naText(cfg.ds) : t('err_load') + ' ' + dtn(DS[cfg.ds].dt), na: true };
      const m = scoped.filter(k.test); return { id: k.id, label: t(k.lk), cls: k.cls, value: k.sum ? nf(sum(m, k.sum)) : nf(m.length) };
    });
    const kp = cfg.kpis.find((k) => k.id === S.kpi);
    let rows = applyFilters(base, cfg.cols);
    if (kp) rows = rows.filter(kp.test);
    const chartRows = applyFilters(base, cfg.cols);
    return { kpis, charts: cfg.charts.map((c) => chartHtml(c, chartRows, cfg)).join(''),
      table: { title: t(cfg.title), cols: cfg.cols.filter((c) => !c.hide), rows, dt: DS[cfg.ds].dt, statusRows: base }, statusSrc: base,
      erp: () => ({ dt: DS[cfg.ds].dt, f: erpFilters(tab) }) };
  }

  async function viewOverview() {
    const [mr, po] = await Promise.all([load('mr'), load('po')]);
    const mrOpen = mr.filter(P.mrOpen), mrOver = mr.filter(P.mrOver), poOpen = po.filter(P.poOpen), poOver = po.filter(P.poOver);
    const k = (id, lk, v, cls, go, sub, ds) => (errOf(ds) ? { id, label: t(lk), value: '—', cls, go, sub: errOf(ds).perm ? naText(ds) : t('err_load') + ' ' + dtn(DS[ds].dt), na: true } : { id, label: t(lk), value: v, cls, go, sub: sub ? t(sub) : '' });
    const kpis = [k('mo', 'k_ov_mr_open', nf(mrOpen.length), 'warn', ['mr', 'open'], 'sub_mr_open', 'mr'), k('mv', 'k_ov_mr_over', nf(mrOver.length), 'bad', ['mr', 'over'], 'sub_mr_over', 'mr'),
      k('po', 'k_ov_po_open', nf(poOpen.length), 'warn', ['po', 'open'], 'sub_po_open', 'po'), k('pv', 'k_ov_po_over', nf(poOver.length), 'bad', ['po', 'over'], 'sub_po_over', 'po'), k('pval', 'k_ov_val', nf(sum(po, 'base_grand_total')), 'ok', ['po', 'val'], '', 'po')];
    const aging = chartHtml('aging', mr, {});
    const funnel = hbars(t('c_funnel'), [{ l: t('tab_mr'), v: mr.length }, { l: t('tab_po'), v: po.length }]);
    const att = [].concat(mrOver.map((r) => ({ name: r.name, _dt: r._dt, due: r.schedule_date, late: r._late, status: r.status })),
      poOver.map((r) => ({ name: r.name, _dt: r._dt, due: r.schedule_date, late: r._late, status: r.status, supplier_name: r.supplier_name }))).sort((a, b) => b.late - a.late);
    return { kpis, charts: funnel + aging + donut(t('c_status') + ' – ' + t('tab_po'), countBy(po, 'status'), 'data-nav-po'),
      table: { title: t('attention'), dt: null, rows: att, cols: [{ k: 'name', lk: 'doc', type: 'link' }, { k: '_dt', lk: 'type', type: 'dt' }, { k: 'supplier_name', lk: 'supplier', type: 'text' }, { k: 'due', lk: 'due', type: 'date' }, { k: 'late', lk: 'days_late', type: 'num' }, { k: 'status', lk: 'status', type: 'status' }] }, noStatus: true };
  }

  async function viewSup() {
    const [sup, po] = await Promise.all([load('sup'), load('po')]);
    const m = {};
    const blank = (name, sname, grp, dis) => ({ name, supplier_name: sname, supplier_group: grp, disabled: dis, orders: 0, pv: 0, over: 0, recv: [], _dt: 'Supplier' });
    sup.forEach((s) => (m[s.name] = blank(s.name, s.supplier_name || s.name, s.supplier_group, s.disabled)));
    const ensure = (r) => m[r.supplier] || (m[r.supplier] = blank(r.supplier, r.supplier_name || r.supplier, '', 0));
    po.forEach((r) => { const o = ensure(r); o.orders++; o.pv += parseFloat(r.base_grand_total) || 0; if (P.poOver(r)) o.over++; if (r.docstatus === 1) o.recv.push(r.per_received || 0); });
    const rows = Object.values(m).map((o) => { o.avg_recv = o.recv.length ? o.recv.reduce((a, b) => a + b, 0) / o.recv.length : 0; return o; });
    const scoped = rows.filter((r) => !S.q || (r.supplier_name + ' ' + r.name + ' ' + (r.supplier_group || '')).toLowerCase().includes(S.q.toLowerCase()));
    const T = { active: (r) => !r.disabled, engaged: (r) => r.orders > 0, late: (r) => r.over > 0 };
    const na = (ds) => (errOf(ds) ? { value: '—', sub: errOf(ds).perm ? naText(ds) : t('err_load') + ' ' + dtn(DS[ds].dt), na: true } : null);
    const kpis = [Object.assign({ id: 'active', label: t('k_sup_active'), value: nf(scoped.filter(T.active).length), cls: 'ok' }, na('sup') || {}), Object.assign({ id: 'engaged', label: t('k_sup_engaged'), value: nf(scoped.filter(T.engaged).length) }, na('po') || {}),
      Object.assign({ id: 'late', label: t('k_sup_late'), value: nf(scoped.filter(T.late).length), cls: 'bad' }, na('po') || {})];
    let shown = scoped.filter(T.engaged); if (S.kpi && T[S.kpi]) shown = scoped.filter(T[S.kpi]);
    const topVal = scoped.slice().sort((a, b) => b.pv - a.pv).slice(0, 8).filter((r) => r.pv > 0).map((r) => ({ l: r.supplier_name, v: r.pv, attr: `data-q="${esc(r.supplier_name)}"` }));
    const lateTop = scoped.filter(T.late).sort((a, b) => b.over - a.over).slice(0, 8).map((r) => ({ l: r.supplier_name, v: r.over, attr: `data-q="${esc(r.supplier_name)}"` }));
    const erp = () => {
      if (S.kpi === 'active') return { dt: 'Supplier', f: { disabled: 0 } };
      if (S.kpi === 'late') return { dt: 'Purchase Order', f: Object.assign(erpFilters('po'), C.po.kpis.find((x) => x.id === 'over').f) };
      if (S.kpi === 'engaged') return { dt: 'Purchase Order', f: erpFilters('po') };
      const names = shown.map((r) => r.name);
      if (names.length && names.length <= 150) return { dt: 'Supplier', f: { name: ['in', names] } };
      return { dt: 'Purchase Order', f: erpFilters('po') };
    };
    return { kpis, charts: hbars(t('c_top_sup'), topVal) + hbars(t('k_sup_late'), lateTop),
      table: { title: t('tab_sup'), dt: 'Supplier', rows: shown, cols: [{ k: 'name', lk: 'supplier', type: 'link' }, { k: 'supplier_name', lk: 'item_name', type: 'text', hide: true }, { k: 'supplier_group', lk: 'group', type: 'text' },
        { k: 'orders', lk: 'orders', type: 'num' }, { k: 'pv', lk: 'po_value', type: 'money' }, { k: 'over', lk: 'overdue_pos', type: 'num' }, { k: 'avg_recv', lk: 'avg_recv', type: 'pct' }] }, noStatus: true, erp };
  }

  /* ---------- rendering ---------- */
  let VIEW = null;
  function cell(c, r) {
    const v = r[c.k];
    switch (c.type) {
      case 'link': return `<a class="lnk">${esc(r.supplier_name && c.k === 'name' && r._dt === 'Supplier' ? r.supplier_name : v)}</a>`;
      case 'status': return `<span class="badge ${badgeCls(v)}">${esc(v)}</span>`;
      case 'pct': return `<div class="bar" title="${nf(v, 0)}%"><i style="width:${Math.min(100, v || 0)}%"></i></div>`;
      case 'pct1': return nf(v, 1) + '%';
      case 'money': return nf(v);
      case 'money2': return nf(v, 2);
      case 'num': return nf(v);
      case 'dt': return esc(dtn(v));
      default: return esc(v == null ? '' : v);
    }
  }
  function renderTable() {
    const v = VIEW.table; let rows = v.rows.slice();
    if (S.sort) { const { k, dir } = S.sort; rows.sort((a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * dir || String(a[k]).localeCompare(String(b[k])) * dir); }
    $('#pcc-table-title').textContent = v.title;
    $('#pcc-count').textContent = `${nf(rows.length)} ${t('records')}`;
    const chip = $('#pcc-kpi-chip'); chip.hidden = !S.kpi; chip.textContent = t('clear_kpi');
    $('#pcc-list').hidden = !v.dt;
    const pages = Math.max(1, Math.ceil(rows.length / S.ps));
    if (S.page > pages) S.page = pages;
    if (S.page < 1) S.page = 1;
    const start = (S.page - 1) * S.ps;
    const head = '<thead><tr>' + v.cols.map((c) => `<th data-sort="${c.k}" class="${['num', 'money', 'money2', 'pct1'].includes(c.type) ? 'num' : ''}">${esc(t(c.lk))}${S.sort && S.sort.k === c.k ? (S.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('') + '</tr></thead>';
    const body = rows.slice(start, start + S.ps).map((r, i) => `<tr data-i="${start + i}">` + v.cols.map((c) => `<td class="${['num', 'money', 'money2', 'pct1'].includes(c.type) ? 'num' : ''}">${cell(c, r)}</td>`).join('') + '</tr>').join('');
    $('#pcc-table').innerHTML = rows.length ? head + '<tbody>' + body + '</tbody>' : `<tbody><tr><td class="empty">${t('none')}</td></tr></tbody>`;
    $('#pcc-pager').innerHTML = pages > 1
      ? `<button type="button" class="btn sm" data-pg="-1" ${S.page <= 1 ? 'disabled' : ''}>${t('pg_prev')}</button><span class="muted">${t('pg_page')} ${nf(S.page)} ${t('pg_of')} ${nf(pages)}</span><button type="button" class="btn sm" data-pg="1" ${S.page >= pages ? 'disabled' : ''}>${t('pg_next')}</button>`
      : '';
    VIEW._rows = rows;
  }
  function renderStatusFilter() {
    const sel = $('#f-status'); const wrap = $('#wrap-status');
    wrap.hidden = !!VIEW.noStatus;
    if (VIEW.noStatus) return;
    const list = [...new Set((VIEW.statusSrc || []).map((r) => r.status).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">${t('all')}</option>` + list.map((s) => `<option ${s === S.status ? 'selected' : ''}>${esc(s)}</option>`).join('');
  }
  function overdueBacklogSummary(kind,records){
    const isMR=kind==='mr',open=records.filter(isMR?P.mrOpen:P.poOpen),overdue=open.filter(isMR?P.mrOver:P.poOver);
    const dates=overdue.map(r=>r.schedule_date).filter(Boolean).sort();
    return {open:open.length,overdue:overdue.length,oldest:dates[0]||null,missing:open.filter(r=>!r.schedule_date).length,priorYears:open.filter(r=>r.transaction_date&&r.transaction_date<TODAY.slice(0,4)+'-01-01').length};
  }
  function showOverdueBasis(){
    let box=$('#pcc-overdue-basis');if(!box){box=document.createElement('div');box.id='pcc-overdue-basis';box.className='card';$('#pcc-kpis').after(box);}
    const parts=[];
    for(const [kind,label]of [['mr',S.lang==='ar'?'طلبات المواد':'Material requests'],['po',S.lang==='ar'?'أوامر الشراء':'Purchase orders']]){
      if(!S.cache[kind]||S.errors[kind])continue;
      const info=overdueBacklogSummary(kind,S.cache[kind]);
      parts.push(label+': '+info.overdue+' / '+info.open+' '+(S.lang==='ar'?'مفتوحة متأخرة؛ أقدم استحقاق: ':'open are overdue; oldest due: ')+(info.oldest||'—')+'; '+info.priorYears+' '+(S.lang==='ar'?'صادرة في سنوات سابقة؛ استحقاق مفقود: ':'issued in earlier years; missing due date: ')+info.missing);
    }
    const rule=S.lang==='ar'?'التأخير يعني أن تاريخ الاحتياج/التسليم المسجل مضى والمستند ما زال مفتوحاً. مرشح الفترة يتعلق بتاريخ الإصدار وليس موعد التسليم. راجع السجلات القديمة مع المشتريات قبل إغلاقها.':'Overdue means the recorded required/delivery date has passed while the document is still open. Period filters use issue date, not delivery date. Older open records need Procurement review; dates and statuses have not been changed.';
    box.textContent=rule+(parts.length?' '+parts.join(' | '):'');
  }
  function render() {
    $('#pcc-kpis').innerHTML = VIEW.kpis.map((k) => `<button type="button" class="kpi ${k.cls || ''} ${S.kpi === k.id && !k.go ? 'on' : ''}" data-kpi="${k.id}" ${k.go ? `data-go="${k.go.join('|')}"` : ''}><div class="v">${k.value}</div><div class="l">${esc(k.label)}</div>${k.sub ? `<div class="l"${k.na ? ' style="color:var(--bad);font-weight:600"' : ''}>${esc(k.sub)}</div>` : ''}</button>`).join('');
    $('#pcc-charts').innerHTML = VIEW.charts;
    showOverdueBasis();
    renderStatusFilter(); renderTable();
    const errs = Object.values(S.errors).map((x) => (x.perm ? `${t('no_access')} ${dtn(x.dt)}` : `${t('err_load')}: ${dtn(x.dt)}${x.msg ? ' — ' + x.msg : ''}`));
    const eb = $('#pcc-error'); eb.hidden = !errs.length;
    const parts = Object.keys(S.partial).map((d) => `${d}: ${t('partial')}`);
    eb.hidden = !errs.length && !parts.length;
    eb.textContent = parts.concat(errs).join('\n');
  }
  async function refreshView(force) {
    if (force) { S.cache = {}; S.partial = {}; S.page = 1; }
    $('#pcc-loading').hidden = false;
    try {
      VIEW = S.tab === 'overview' ? await viewOverview() : S.tab === 'sup' ? await viewSup() : await viewGeneric(S.tab);
      render();
      $('#pcc-updated').textContent = new Date().toLocaleString(S.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB');
    } catch (e) {
      console.error(e); const eb = $('#pcc-error'); eb.hidden = false; eb.textContent = String(e && e.message || e);
    }
    $('#pcc-loading').hidden = true;
  }
  const rerender = () => { if (VIEW) { S.page = 1; return refreshView(false); } return Promise.resolve(); };
  const scrollToTable = () => { const h = $('#pcc-table-title'); if (h && h.scrollIntoView) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  /* ---------- language ---------- */
  function applyLang() {
    root.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr');
    $$('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    $('#pcc-lang').textContent = S.lang === 'ar' ? 'English' : 'العربية';
    try { localStorage.setItem('pcc_lang', S.lang); } catch (e) {}
  }

  /* ---------- drawer / drill-downs ---------- */
  /* keep the drawer inside the visible screen even when the page is scrolled
     or an ancestor changes the meaning of position:fixed */
  const placeDrawer = () => {
    const d = $('#pcc-drawer'), o = $('#pcc-overlay');
    if (!d || d.hidden) return;
    [d, o].forEach((el) => { el.style.top = '0px'; el.style.bottom = 'auto'; el.style.height = window.innerHeight + 'px'; });
    const top = d.getBoundingClientRect().top;
    if (top) [d, o].forEach((el) => { el.style.top = (-top) + 'px'; });
  };
  const open = (title, html, doc) => {
    $('#pcc-drawer-title').textContent = title; $('#pcc-drawer-body').innerHTML = html;
    const ob = $('#pcc-drawer-open'); ob.hidden = !doc; ob._doc = doc || null;
    $('#pcc-drawer').hidden = false; $('#pcc-overlay').hidden = false;
    placeDrawer();
    const b = $('#pcc-drawer-body'); if (b) b.scrollTop = 0;
  };
  const closeDrawer = () => { $('#pcc-drawer').hidden = true; $('#pcc-overlay').hidden = true; };
  const miniTable = (cols, rows, rowAttr) => rows.length ? `<table><thead><tr>${cols.map((c) => `<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map((r) =>
    `<tr ${rowAttr ? rowAttr(r) : ''}>${cols.map((c) => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : `<div class="empty">${t('none')}</div>`;

  async function openDoc(dt, name) {
    open(`${dtn(dt)} · ${name}`, `<div class="empty"><span class="spin"></span></div>`, [dt, name]);
    try {
      const d = await call('frappe.client.get', { doctype: dt, name });
      const skip = new Set(['doctype', 'owner', 'creation', 'modified', 'modified_by', 'idx', 'docstatus', 'naming_series', 'amended_from']);
      const kv = Object.entries(d).filter(([k, v]) => v !== null && v !== '' && typeof v !== 'object' && !skip.has(k) && !k.startsWith('_')).slice(0, 24)
        .map(([k, v]) => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${esc(v)}</dd>`).join('');
      const items = d.items || [];
      const it = items.length ? `<h4>${t('items')} (${items.length})</h4>` + miniTable([[t('item'), (r) => esc(r.item_code)], [t('item_name'), (r) => esc(r.item_name)], [t('qty'), (r) => nf(r.qty, 2)], [t('uom'), (r) => esc(r.uom)], [t('rate'), (r) => nf(r.rate, 2)], [t('amount'), (r) => nf(r.amount)]], items) : '';
      $('#pcc-drawer-body').innerHTML = `<dl class="kv">${kv}</dl>${it}`;
      placeDrawer();
    } catch (e) { $('#pcc-drawer-body').innerHTML = `<div class="pcc-error">${esc(e && e.message || e)}</div>`; }
  }
  async function openSupplier(name) {
    const po = await load('po');
    const b = po.filter((r) => r.supplier === name);
    const attr = (r) => `data-dt="${esc(r._dt)}" data-name="${esc(r.name)}"`;
    open(`${dtn('Supplier')} · ${name}`,
      `<h4>${t('t_orders')} (${b.length})</h4>` + miniTable([[t('doc'), (r) => `<a class="lnk">${esc(r.name)}</a>`], [t('status'), (r) => `<span class="badge ${badgeCls(r.status)}">${esc(r.status)}</span>`], [t('required_by'), (r) => esc(r.schedule_date)], [t('received'), (r) => nf(r.per_received) + '%'], [t('total'), (r) => nf(r.base_grand_total)]], b, attr),
      ['Supplier', name]);
  }

  /* ---------- events ---------- */
  function switchTab(tab, kpi) {
    S.tab = tab; S.kpi = kpi || ''; S.status = ''; S.sort = null; S.page = 1;
    $$('#pcc-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    return refreshView(false);
  }
  root.addEventListener('click', (e) => {
    const el = e.target.closest('#pcc-kpi-chip,button,th,tr,span[data-status],circle[data-status],.hb,[data-nav-po],[data-q],[data-dt]');
    if (!el) return;
    if (el.matches('#pcc-tabs button')) return switchTab(el.dataset.tab);
    if (el.id === 'pcc-refresh') return refreshView(true);
    if (el.id === 'pcc-lang') { S.lang = S.lang === 'ar' ? 'en' : 'ar'; applyLang(); return rerender(); }
    if (el.id === 'f-reset') { S.company = S.q = S.status = S.kpi = ''; S.from = S.to = ''; initDates(); $('#f-company').value = ''; $('#f-q').value = ''; return refreshView(true); }
    if (el.dataset.pg) { S.page += parseInt(el.dataset.pg, 10); return renderTable(); }
    if (el.id === 'pcc-kpi-chip') { S.kpi = ''; return rerender(); }
    if (el.id === 'pcc-list') { const x = VIEW && VIEW.erp ? VIEW.erp() : null; if (x) openErp(x.dt, x.f); return; }
    if (el.id === 'pcc-csv') return exportCsv();
    if (el.id === 'pcc-drawer-close') return closeDrawer();
    if (el.id === 'pcc-drawer-open') { const d = el._doc; closeDrawer(); if (d) route('Form', d[0], d[1]); return; }
    if (el.classList.contains('kpi')) {
      if (el.dataset.go) { const [tb, k] = el.dataset.go.split('|'); return switchTab(tb, k).then(scrollToTable); }
      S.kpi = S.kpi === el.dataset.kpi ? '' : el.dataset.kpi; return rerender().then(scrollToTable);
    }
    if (el.dataset.status) { S.status = S.status === el.dataset.status ? '' : el.dataset.status; S.kpi = ''; return rerender(); }
    if (el.hasAttribute('data-nav-po')) return switchTab('po', '');
    if (el.dataset.q) { S.q = el.dataset.q; $('#f-q').value = S.q; return rerender(); }
    if (el.tagName === 'TH' && el.dataset.sort) { const k = el.dataset.sort; S.sort = S.sort && S.sort.k === k ? { k, dir: -S.sort.dir } : { k, dir: 1 }; S.page = 1; return renderTable(); }
    if (el.dataset.dt && el.dataset.name) return openDoc(el.dataset.dt, el.dataset.name);
    if (el.tagName === 'TR' && el.dataset.i != null && el.closest('#pcc-table')) {
      const r = VIEW._rows[+el.dataset.i]; if (!r) return;
      if (r._dt === 'Supplier') return openSupplier(r.name);
      return openDoc(r._dt, r.name);
    }
  });
  $('#pcc-overlay').addEventListener('click', closeDrawer);
  window.addEventListener('scroll', placeDrawer, true);
  window.addEventListener('resize', placeDrawer);
  $('#f-company').addEventListener('change', (e) => { S.company = e.target.value; refreshView(true); });
  $('#f-from').addEventListener('change', (e) => { S.from = e.target.value; refreshView(true); });
  $('#f-to').addEventListener('change', (e) => { S.to = e.target.value; refreshView(true); });
  $('#f-status').addEventListener('change', (e) => { S.status = e.target.value; rerender(); });
  let tm; $('#f-q').addEventListener('input', (e) => { clearTimeout(tm); tm = setTimeout(() => { S.q = ($('#f-q').value || '').trim(); rerender(); }, 250); });

  function exportCsv() {
    const v = VIEW.table, rows = VIEW._rows || [];
    const q = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
    const csv = '﻿' + [v.cols.map((c) => q(t(c.lk))).join(',')].concat(rows.map((r) => v.cols.map((c) => q(r[c.k])).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `pre-procurement-${S.tab}-${TODAY}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function initDates() { S.from = `${now.getFullYear()}-01-01`; S.to = TODAY; $('#f-from').value = S.from; $('#f-to').value = S.to; }

  /* ---------- boot ---------- */
  (async function init() {
    applyLang(); initDates();
    try {
      const cs = await getList('Company', ['name'], [], { order_by: 'name asc' });
      $('#f-company').innerHTML = `<option value="">${t('all')}</option>` + cs.map((c) => `<option>${esc(c.name)}</option>`).join('');
    } catch (e) {}
    refreshView(true);
  })();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
