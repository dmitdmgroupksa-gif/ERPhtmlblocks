/* =====================================================================
   FM · Inventory · Finance Dashboard — Frappe Custom HTML Block (JS field)
   `root_element` is provided by Frappe (the block's shadow root).

   Sources (exact doctypes / fieldnames verified on your ERPNext):
   FM         : DM Facilities Management (facility_detail, facility_name, facility_type,
                facility_contract_status, agreement_type, date_frm, rentdate_to, lease_start,
                lease_end, rent_amount, amount_intallments, installment_1..4_dues_on, paid1..4_not,
                com_lic_exp, cr_date_to, cd_date_to, national_adress_expiry, fire_expiry,
                cleanig_exp_date, camera_expiry, industrial_expiry, …) · Asset · Asset Repair
   Inventory  : Bin · Warehouse · Item · Stock Ledger Entry (last movement)
   Finance    : Sales Invoice · Purchase Invoice · Account · GL Entry · Payment Entry
   ===================================================================== */
(function () {
  'use strict';

  var root = root_element;
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     1. SETTINGS  (safe to edit)
     ------------------------------------------------------------------ */
  var THEME_MODE = 'light';          // 'light' = always white UI · 'auto' = follow ERPNext desk theme
  var CURRENCY = (window.frappe && frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.currency) || 'SAR';
  var EXPIRY_SOON_DAYS = 90;         // contracts ending within this many days are "expiring"
  var DOC_SOON_DAYS = 60;            // licences / permits expiring within this many days are flagged
  var RENT_DUE_DAYS = 30;            // upcoming rent instalments window
  var DEAD_STOCK_DAYS = 180;         // no stock movement for this long = dead stock
  var PAYABLE_SOON_DAYS = 7;         // payables due within this many days are "due soon"

  var DOC_DEFS = [                   // licence / compliance expiry fields on DM Facilities Management
    ['com_lic_exp', 'Commercial licence'],
    ['cr_date_to', 'Commercial registration (CR)'],
    ['cd_date_to', 'Civil defence (CD)'],
    ['national_adress_expiry', 'National address'],
    ['fire_expiry', 'Fire maintenance contract'],
    ['cleanig_exp_date', 'Cleaning contract'],
    ['camera_expiry', 'Camera maintenance contract'],
    ['industrial_expiry', 'Industrial licence'],
    ['construction_environmental_permit_expiry', 'Construction environmental permit'],
    ['operational_environmental_permit_expiry', 'Operational environmental permit']
  ];

  var FM_FIELDS = ['name', 'docstatus', 'modified', 'company', 'facility_detail', 'facility_name', 'facility_catogory', 'facility_contract_status',
    'facility_type', 'location', 'area_in_sqm', 'agreement_type', 'contract_number', 'auto_renewal', 'date_frm', 'rentdate_to', 'lease_start', 'lease_end',
    'rent_amount', 'rental_amount', 'rent_installments', 'amount_intallments', 'rent_mode', 'owner_name', 'owner_number', 'additional_notes',
    'installment_1_dues_on', 'installment_2_dues_on', 'installment_3_dues_on', 'installment_4_dues_on', 'paid1_not', 'paid2_not', 'paid3_not', 'paid4_not',
    'com_lic_exp', 'cr_date_to', 'cd_date_to', 'national_adress_expiry', 'fire_expiry', 'cleanig_exp_date', 'camera_expiry', 'industrial_expiry',
    'construction_environmental_permit_expiry', 'operational_environmental_permit_expiry',
    'fire_contractor', 'cleaning_cont', 'camera_contractor', 'fire_layout', 'sign_board', 'medical_kit'];
  var ASSET_FIELDS = ['name', 'asset_name', 'company', 'asset_category', 'location', 'status', 'gross_purchase_amount', 'value_after_depreciation', 'insurance_end_date', 'maintenance_required'];
  var BIN_FIELDS = ['name', 'item_code', 'warehouse', 'actual_qty', 'projected_qty', 'reserved_qty', 'ordered_qty', 'stock_value', 'stock_uom'];
  var WH_FIELDS = ['name', 'warehouse_name', 'company', 'is_group', 'disabled', 'warehouse_type'];
  var ITEM_FIELDS = ['name', 'item_name', 'item_group', 'stock_uom', 'custom_reorder_level_qty', 'safety_stock'];
  var SI_FIELDS = ['name', 'customer', 'customer_name', 'company', 'posting_date', 'due_date', 'base_grand_total', 'outstanding_amount', 'conversion_rate', 'status'];
  var PI_FIELDS = ['name', 'supplier', 'supplier_name', 'company', 'posting_date', 'due_date', 'base_grand_total', 'outstanding_amount', 'conversion_rate', 'status', 'bill_no'];

  var BUCKETS = [
    { k: 'current', label: 'Not yet due', color: 'var(--c-ok)' },
    { k: 'd30',     label: '1–30 days',   color: 'var(--c-lime)' },
    { k: 'd60',     label: '31–60 days',  color: 'var(--c-warn)' },
    { k: 'd90',     label: '61–90 days',  color: 'var(--c-orange)' },
    { k: 'd180',    label: '91–180 days', color: 'var(--c-bad)' },
    { k: 'd180p',   label: '> 180 days',  color: 'var(--c-deep)' }
  ];
  var TAB_LABELS = { overview: ['grid', 'Overview'], fm: ['building', 'Facilities'], inventory: ['box', 'Inventory'], finance: ['wallet', 'Finance'] };
  var RAIL_LINKS = {
    overview: [['list', 'DM Facilities Management', 'Facilities list'], ['report', 'Warehouse Wise Stock Balance', 'Stock balance'], ['report', 'Accounts Receivable', 'Receivable'], ['report', 'Profit and Loss Statement', 'P&L']],
    fm: [['list', 'DM Facilities Management', 'Facilities list'], ['list', 'Asset', 'Assets list'], ['list', 'Asset Repair', 'Repairs']],
    inventory: [['report', 'Warehouse Wise Stock Balance', 'Stock balance'], ['report', 'Stock Ageing', 'Stock ageing'], ['report', 'Stock Projected Qty', 'Projected qty']],
    finance: [['report', 'Accounts Receivable', 'Receivable'], ['report', 'Accounts Payable', 'Payable'], ['report', 'Profit and Loss Statement', 'P&L'], ['report', 'Balance Sheet', 'Balance sheet'], ['report', 'Cash Flow', 'Cash flow']]
  };

  /* ------------------------------------------------------------------
     2. HELPERS
     ------------------------------------------------------------------ */
  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M21 9h-5a2 2 0 0 0 0 4h5z"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.01"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 5a3.5 3.5 0 0 1 0 7M22 20c0-2.5-1.5-4.5-4-5.5"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'
  };
  function icon(n, small) {
    return '<svg class="ico' + (small ? ' ico-sm' : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) {
    if (v == null || v === '') return 0;
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function money(n) { return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function money2(n) { return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function compact(n) {
    n = Number(n) || 0;
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
    return money(n);
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return ds(new Date()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ds(d); }
  function parseDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
    return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  }
  function fmtDate(s) { var d = parseDate(s); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '—'; }
  function daysBetween(a, b) {
    var A = parseDate(a), B = parseDate(b);
    return (A && B) ? Math.round((B - A) / 86400000) : null;
  }
  function fmtTime(t) { return t ? String(t).slice(0, 5) : ''; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function docLabel(d) { return d === 1 ? 'Submitted' : d === 2 ? 'Cancelled' : 'Draft'; }
  function docCls(d) { return d === 1 ? 'b-ok' : d === 2 ? 'b-bad' : 'b-slate'; }
  function badge(text, map) {
    var m = (map && map[text]) || { cls: 'b-slate' };
    return '<span class="badge ' + m.cls + '">' + esc(text) + '</span>';
  }
  function sum(arr, key) { return arr.reduce(function (s, r) { return s + (r[key] || 0); }, 0); }
  function emptyState(title, text) { return '<div class="empty"><b>' + esc(title) + '</b>' + esc(text || '') + '</div>'; }
  function locTag(loc) { return '<span class="loc-tag">' + icon('pin') + esc(loc || 'Unassigned') + '</span>'; }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }


  ICONS.building = '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>';
  ICONS.box = '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>';
  ICONS.shield = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>';
  ICONS.truck = '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>';

  var TODAY = todayStr();
  var DEFAULT_FILTERS = { q: '', company: 'all', period: 'year' };
  var state = {
    tab: 'overview', loaded: {}, loading: {}, errors: {},
    raw: { fm: [], assets: [], repairs: [], bins: [], whs: [], items: [], lastMove: {}, lastApprox: {}, ageFrom: '', noAgeWhy: '', noAgeDetail: '', plFail: null, noAge: false, si: [], pi: [], cash: [], pl: {}, glMonths: {}, pe: [] },
    view: {}, filters: Object.assign({}, DEFAULT_FILTERS), tables: {}, alertTab: { fm: 'contracts', inv: 'low', fin: 'ar' },
    companies: {}
  };
  var C = function (v) { return v == null ? '' : v; };

  /* ------------------------------------------------------------------
     2. DATA ACCESS
     ------------------------------------------------------------------ */
  var REQ_TIMEOUT = 90000;
  /* Direct, silent API call: no Frappe popups, always settles (timeout). Errors carry .status, .perm and .detail
     so the dashboard can say WHY a query failed (permission vs. HTTP 417 "Field not permitted in query" vs. timeout). */
  function fetchList(doctype, fields, filters, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var args = { doctype: doctype, fields: fields, filters: filters || [], limit_page_length: opts.limit || 100000 };
      if (opts.order) args.order_by = opts.order;
      if (opts.group) args.group_by = opts.group;
      if (opts.start) args.limit_start = opts.start;
      var done = false, ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { if (done) return; done = true; if (ctl) { try { ctl.abort(); } catch (x) { /* ignore */ } } var te = new Error('Request timed out'); te.detail = 'timed out'; reject(te); }, REQ_TIMEOUT);
      var body = new URLSearchParams();
      Object.keys(args).forEach(function (k) { var v = args[k]; if (v === undefined || v === null) return; body.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v)); });
      fetch('/api/method/frappe.client.get_list', { method: 'POST', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined,
        headers: { 'X-Frappe-CSRF-Token': (window.frappe && frappe.csrf_token) || '', 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() })
        .then(function (r) { return r.text().then(function (txt) { return { r: r, txt: txt }; }); })
        .then(function (o) {
          if (done) return; done = true; clearTimeout(timer);
          var j = null; try { j = JSON.parse(o.txt); } catch (x) { /* ignore */ }
          if (o.r.ok && j && !j.exc) { resolve(j.message || []); return; }
          var ex = String((j && (j.exception || j.exc_type)) || ''), msg = ex.split(':').slice(1).join(':').trim() || ex;
          var e = new Error(msg || ('HTTP ' + o.r.status));
          e.status = o.r.status; e.perm = o.r.status === 401 || o.r.status === 403 || /PermissionError/i.test(ex);
          e.detail = e.perm ? 'no access' : ('HTTP ' + o.r.status + (msg ? ': ' + msg.slice(0, 120) : ''));
          reject(e);
        })
        .catch(function (err) { if (done) return; done = true; clearTimeout(timer); if (!err.detail) err.detail = (err && err.message) || 'network error'; reject(err); });
    });
  }
  /* label for the banner: "Stock Ledger Entry — HTTP 417: Field not permitted in query ..." */
  function why(label, e) { return e && e.perm ? 'No access to ' + label : label + (e && e.detail ? ' — ' + e.detail : ''); }
  function safe(tab, label, p, fallback) {
    return p.catch(function (e) { state.errors[tab] = (state.errors[tab] || []).concat(why(label, e)); return fallback; });
  }
  function monthKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function last12() {
    var now = new Date(), out = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: monthKey(d), label: MONTHS[d.getMonth()], yr: d.getFullYear(), from: ds(d), to: ds(new Date(d.getFullYear(), d.getMonth() + 1, 0)) });
    }
    return out;
  }
  function noteCompany(c) { if (c) state.companies[c] = 1; }
  function fillCompanyOptions() {
    var sel = $('#fCompany'), cur = state.filters.company;
    var list = Object.keys(state.companies).sort();
    sel.innerHTML = '<option value="all">All companies</option>' + list.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
    if (cur !== 'all' && list.indexOf(cur) === -1) { cur = 'all'; state.filters.company = 'all'; }
    sel.value = cur;
  }
  function inCo(r) { return state.filters.company === 'all' || r._company === state.filters.company; }
  function matchQ(parts) {
    var q = state.filters.q;
    return !q || parts.join(' ').toLowerCase().indexOf(q.toLowerCase()) > -1;
  }
  function shortWh(n) { return String(n || '').replace(/\s+-\s+[A-Z0-9]{2,8}$/, ''); }

  /* ---------------- Facilities ---------------- */
  function enrichFM(r) {
    r._company = r.company || 'Unassigned';
    var lease = r.agreement_type === 'Lease Agreement' && r.lease_start;
    r._start = (lease ? r.lease_start : r.date_frm) || r.date_frm || r.lease_start || '';
    r._end = (lease && r.lease_end) ? r.lease_end : (r.rentdate_to || r.lease_end || '');
    r._active = r.facility_contract_status !== 'Closed';
    r._days = r._end ? daysBetween(TODAY, r._end) : null;
    r._exp = r._days == null ? 'none' : r._days < 0 ? 'expired' : r._days <= 30 ? 'd30' : r._days <= 60 ? 'd60' : r._days <= 90 ? 'd90' : 'ok';
    r._total = num(r.rent_amount) || num(r.rental_amount);
    var yrs = (r._start && r._end) ? daysBetween(r._start, r._end) / 365.25 : 0;
    r._annual = yrs > 1.05 ? r._total / yrs : r._total;
    r._area = parseFloat(String(r.area_in_sqm || '').replace(/[^0-9.]/g, '')) || 0;
    r._psqm = r._area ? r._annual / r._area : 0;
    r._type = r.facility_detail || '—';
    r._loc = String(r.location || '').trim() || 'Unspecified';
    r._name = String(r.facility_name || '').trim() || r.name;
    var n = parseInt(r.rent_installments, 10) || 0, inst = [], k;
    for (k = 1; k <= 4; k++) {
      if (n && k > n) break;
      var due = r['installment_' + k + '_dues_on'];
      if (!due) continue;
      inst.push({ k: k, due: due, paid: !!r['paid' + k + '_not'], amt: num(r.amount_intallments) || (n ? r._total / n : r._total) });
    }
    r._inst = inst;
    r._instOver = r._active ? inst.filter(function (i) { return !i.paid && i.due < TODAY && (!r._start || i.due >= r._start); }) : [];
    r._instSoon = r._active ? inst.filter(function (i) { return !i.paid && i.due >= TODAY && i.due <= addDays(RENT_DUE_DAYS); }) : [];
    r._docs = DOC_DEFS.map(function (d) { var dt = r[d[0]]; return dt ? { key: d[0], label: d[1], date: dt, days: daysBetween(TODAY, dt) } : null; }).filter(Boolean);
    r._docBad = r._active ? r._docs.filter(function (d) { return d.days <= DOC_SOON_DAYS; }) : [];
    r._nbad = r._docBad.length;
    r._attn = r._active && ((r._days != null && r._days <= EXPIRY_SOON_DAYS) || r._docBad.length > 0 || r._instOver.length > 0);
    return r;
  }
  function enrichAsset(r) { r._company = r.company || 'Unassigned'; r._gross = num(r.gross_purchase_amount); r._nbv = num(r.value_after_depreciation); return r; }

  function loadFM() {
    var F = [['docstatus', '<', 2]];
    return Promise.all([
      safe('fm', 'DM Facilities Management', fetchList('DM Facilities Management', FM_FIELDS, F, { order: 'modified desc' }), []),
      safe('fm', 'Asset', fetchList('Asset', ASSET_FIELDS, [['docstatus', '=', 1], ['status', 'not in', ['Sold', 'Scrapped']]]), []),
      safe('fm', 'Asset Repair', fetchList('Asset Repair', ['name', 'asset', 'company', 'repair_status', 'failure_date', 'total_repair_cost'], [['docstatus', '<', 2], ['repair_status', '=', 'Pending']]), [])
    ]).then(function (res) {
      state.raw.fm = res[0].map(enrichFM);
      state.raw.assets = res[1].map(enrichAsset);
      state.raw.repairs = res[2].map(function (r) { r._company = r.company || 'Unassigned'; return r; });
      state.raw.fm.concat(state.raw.assets).forEach(function (r) { noteCompany(r._company); });
    });
  }

  /* ---------------- Inventory ---------------- */
  function loadInv() {
    return Promise.all([
      safe('inv', 'Bin', fetchList('Bin', BIN_FIELDS, [['actual_qty', '!=', 0]]), []),
      safe('inv', 'Bin (shortages)', fetchList('Bin', BIN_FIELDS, [['actual_qty', '=', 0], ['projected_qty', '<', 0]]), []),
      safe('inv', 'Warehouse', fetchList('Warehouse', WH_FIELDS, []), []),
      safe('inv', 'Item', fetchList('Item', ITEM_FIELDS, [['is_stock_item', '=', 1], ['disabled', '=', 0]]), [])
    ]).then(function (res) {
      var whMap = {};
      res[2].forEach(function (w) { whMap[w.name] = w; });
      state.raw.whs = res[2];
      var seen = {}, bins = [];
      res[0].concat(res[1]).forEach(function (b) { if (!seen[b.name]) { seen[b.name] = 1; bins.push(b); } });
      bins.forEach(function (b) {
        var w = whMap[b.warehouse];
        b._company = (w && w.company) || 'Unassigned';
        b._wh = shortWh(b.warehouse);
        b._qty = num(b.actual_qty); b._val = num(b.stock_value);
        b._res = num(b.reserved_qty); b._proj = num(b.projected_qty); b._ord = num(b.ordered_qty);
        noteCompany(b._company);
      });
      state.raw.bins = bins;
      var im = {};
      res[3].forEach(function (i) { im[i.name] = i; });
      state.raw.items = im;
      return loadLastMovement(bins).then(function (r) {
        state.raw.noAge = false; state.raw.noAgeWhy = ''; state.raw.lastMove = r.lm; state.raw.lastApprox = r.approx; state.raw.ageFrom = r.boundary;
      }, function (e) {
        state.raw.noAge = true; state.raw.noAgeWhy = e && e.perm ? 'perm' : 'tech'; state.raw.noAgeDetail = (e && e.detail) || '';
        state.errors.inv = (state.errors.inv || []).concat(why('Stock Ledger Entry', e));
      });
    });
  }

  /* Last movement date per item WITHOUT an aggregate query (max(posting_date) is rejected by this site: HTTP 417
     "Field not permitted in query"). Reads plain Stock Ledger Entry rows newest-first and stops as soon as every
     stocked item has been seen. Bounded: AGE_PAGES x AGE_PAGE rows. Items not seen inside the window are given the
     window's oldest date, flagged as "before <date>" (their real last movement is at least that old). */
  var AGE_PAGE = 5000, AGE_PAGES = 16, AGE_PAR = 4;
  function loadLastMovement(bins) {
    var need = {}, left = 0;
    bins.forEach(function (b) { if (b.item_code && !need[b.item_code]) { need[b.item_code] = 1; left++; } });
    var lm = {}, approx = {}, boundary = '', page = 0, exhausted = false;
    function pageReq(p) {
      return fetchList('Stock Ledger Entry', ['item_code', 'posting_date'], [['is_cancelled', '=', 0]], { order: 'posting_date desc, creation desc', limit: AGE_PAGE, start: p * AGE_PAGE });
    }
    function step() {
      if (left <= 0 || exhausted || page >= AGE_PAGES) return Promise.resolve();
      var batch = [], from = page;
      var n = from === 0 ? 1 : AGE_PAR; /* first page alone: most sites finish in one request */
      for (var k = 0; k < n && from + k < AGE_PAGES; k++) batch.push(pageReq(from + k));
      page += batch.length;
      return Promise.all(batch).then(function (res) {
        res.forEach(function (rows) {
          rows.forEach(function (r) {
            if (need[r.item_code] === 1) { need[r.item_code] = 2; lm[r.item_code] = String(r.posting_date).slice(0, 10); left--; }
          });
          if (rows.length) boundary = String(rows[rows.length - 1].posting_date).slice(0, 10);
          if (rows.length < AGE_PAGE) exhausted = true;
        });
        return step();
      });
    }
    return step().then(function () {
      if (!exhausted && left > 0 && boundary) { Object.keys(need).forEach(function (k) { if (need[k] === 1) { lm[k] = boundary; approx[k] = true; } }); }
      return { lm: lm, approx: approx, boundary: (!exhausted && left > 0) ? boundary : '' };
    });
  }

  /* ---------------- Finance ---------------- */
  function enrichInv(r, kind) {
    r._kind = kind;
    r._party = (kind === 'AR' ? (r.customer_name || r.customer) : (r.supplier_name || r.supplier)) || '—';
    r._company = r.company || 'Unassigned';
    r._out = num(r.outstanding_amount) * (num(r.conversion_rate) || 1);
    r._total = num(r.base_grand_total);
    r._due = r.due_date || r.posting_date;
    r._overdue = !!(r._due && r._due < TODAY);
    r._days = r._overdue ? daysBetween(r._due, TODAY) : 0;
    r._bucket = !r._overdue ? 'current' : r._days <= 30 ? 'd30' : r._days <= 60 ? 'd60' : r._days <= 90 ? 'd90' : r._days <= 180 ? 'd180' : 'd180p';
    r._label = kind === 'AR' ? 'Receivable' : 'Payable';
    return r;
  }
  function loadFin() {
    var months = last12(), start = months[0].from;
    var glP = months.map(function (m) {
      return fetchList('GL Entry', ['account', 'sum(debit) as debit', 'sum(credit) as credit'],
        [['posting_date', 'between', [m.from, m.to]], ['is_cancelled', '=', 0], ['voucher_type', '!=', 'Period Closing Voucher']], { group: 'account' })
        .catch(function (e) { state.raw.plFail = state.raw.plFail || { n: 0, months: [], why: '' }; state.raw.plFail.n++; state.raw.plFail.months.push(m.key); state.raw.plFail.why = (e && e.perm) ? 'No access to GL Entry' : ((e && e.detail) || 'request failed'); return null; });
    });
    state.raw.plFail = null;
    return Promise.all([
      safe('fin', 'Sales Invoice', fetchList('Sales Invoice', SI_FIELDS, [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]), []),
      safe('fin', 'Purchase Invoice', fetchList('Purchase Invoice', PI_FIELDS, [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]), []),
      safe('fin', 'Account (bank / cash)', fetchList('Account', ['name', 'account_name', 'company', 'account_type'], [['account_type', 'in', ['Bank', 'Cash']], ['is_group', '=', 0], ['disabled', '=', 0]]), []),
      safe('fin', 'Account (profit & loss)', fetchList('Account', ['name', 'company', 'root_type'], [['report_type', '=', 'Profit and Loss'], ['is_group', '=', 0]]), []),
      safe('fin', 'Payment Entry', fetchList('Payment Entry', ['posting_date', 'payment_type', 'company', 'base_paid_amount', 'base_received_amount'],
        [['docstatus', '=', 1], ['posting_date', '>=', start], ['payment_type', 'in', ['Receive', 'Pay']]]), []),
      Promise.all(glP)
    ]).then(function (res) {
      state.raw.si = res[0].map(function (r) { return enrichInv(r, 'AR'); });
      state.raw.pi = res[1].map(function (r) { return enrichInv(r, 'AP'); });
      var cash = res[2];
      state.raw.cash = cash.map(function (a) { a._company = a.company || 'Unassigned'; a._bal = 0; return a; });
      state.raw.pe = res[4].map(function (p) { p._company = p.company || 'Unassigned'; p._m = String(p.posting_date).slice(0, 7); return p; });
      var accMap = {};
      res[3].forEach(function (a) { accMap[a.name] = a; });
      // monthly P&L by company
      var pl = {};
      months.forEach(function (m, i) {
        pl[m.key] = {};
        (res[5][i] || []).forEach(function (row) {
          var a = accMap[row.account];
          if (!a) return;
          var co = a.company || 'Unassigned';
          var cell = pl[m.key][co] || (pl[m.key][co] = { rev: 0, exp: 0 });
          if (a.root_type === 'Income') cell.rev += num(row.credit) - num(row.debit);
          else if (a.root_type === 'Expense') cell.exp += num(row.debit) - num(row.credit);
        });
      });
      state.raw.pl = pl;
      state.raw.fin12 = months;
      if (state.raw.plFail) { state.errors.fin = (state.errors.fin || []).concat('GL Entry — ' + state.raw.plFail.n + ' of 12 months failed (' + state.raw.plFail.why + ')'); }
      if (!accMap || !Object.keys(accMap).length) { state.raw.plFail = state.raw.plFail || { n: 12, months: [], why: 'no income / expense accounts could be read' }; }
      [].concat(state.raw.si, state.raw.pi, state.raw.cash, state.raw.pe).forEach(function (r) { noteCompany(r._company); });
      Object.keys(pl).forEach(function (k) { Object.keys(pl[k]).forEach(noteCompany); });
      // bank / cash balances (second round trip: needs account names)
      if (!cash.length) return;
      return fetchList('GL Entry', ['account', 'sum(debit) as debit', 'sum(credit) as credit'],
        [['account', 'in', cash.map(function (a) { return a.name; })], ['is_cancelled', '=', 0]], { group: 'account' })
        .then(function (rows) {
          var bm = {};
          rows.forEach(function (r) { bm[r.account] = num(r.debit) - num(r.credit); });
          state.raw.cash.forEach(function (a) { a._bal = bm[a.name] || 0; });
        })
        .catch(function () { state.errors.fin = (state.errors.fin || []).concat('GL Entry (cash balances)'); });
    });
  }

  function loadAll() {
    return Promise.all(['fm', 'inventory', 'finance'].filter(function (t) { return !state.loaded[t]; }).map(function (t) {
      return LOADERS[t]().then(function () { state.loaded[t] = true; });
    }));
  }
  var LOADERS = { fm: loadFM, inventory: loadInv, finance: loadFin, overview: loadAll };
  var ERRKEY = { overview: 'ov', fm: 'fm', inventory: 'inv', finance: 'fin' };

  function loadTab(tab, force) {
    if (state.loading[tab]) return;
    if (state.loaded[tab] && !force) return;
    state.loading[tab] = true;
    state.errors[ERRKEY[tab]] = [];
    if (tab === 'overview') { state.errors.fm = []; state.errors.inv = []; state.errors.fin = []; }
    setLoading(true);
    LOADERS[tab]().then(function () { state.loaded[tab] = true; if (tab === 'overview') state.loaded.overview = true; }).catch(function (e) {
      state.errors[ERRKEY[tab]] = (state.errors[ERRKEY[tab]] || []).concat('unexpected error');
      if (window.console) console.error(e);
    }).then(function () {
      state.loading[tab] = false;
      setLoading(false);
      fillCompanyOptions();
      showBanner();
      applyFilters();
      $('#lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
  }
  function showBanner() {
    var errs = state.tab === 'overview' ? [].concat(state.errors.fm || [], state.errors.inv || [], state.errors.fin || []) : (state.errors[ERRKEY[state.tab]] || []), b = $('#banner');
    if (errs.length) { b.hidden = false; b.innerHTML = '<b>Some data could not be loaded:</b> ' + esc(errs.join(' · ')) + (errs.some(function (x) { return /^No access/.test(x); }) ? '. You may not have read permission for these DocTypes.' : '.'); }
    else b.hidden = true;
  }
  function setLoading(on) {
    var b = $('#btnRefresh');
    b.classList.toggle('spin', on);
    b.disabled = on;
  }

  /* ------------------------------------------------------------------
     3. FILTERS
     ------------------------------------------------------------------ */
  function activeFilterCount() {
    var f = state.filters;
    return (f.q ? 1 : 0) + (f.company !== 'all' ? 1 : 0) + ((state.tab === 'finance' || state.tab === 'overview') && f.period !== 'year' ? 1 : 0);
  }
  function updateFilterUI() {
    var f = state.filters;
    $('#fCompany').value = f.company; $('#fPeriod').value = f.period;
    $('#fPeriodWrap').hidden = state.tab !== 'finance' && state.tab !== 'overview';
    var n = activeFilterCount(), rb = $('#btnReset');
    rb.hidden = n === 0;
    rb.innerHTML = icon('reset', true) + '<span>Reset</span><span class="n">' + n + '</span>';
  }
  function applyFilters() {
    updateFilterUI();
    if (state.loaded.fm) renderFM();
    if (state.loaded.inventory) renderInv();
    if (state.loaded.finance) renderFin();
    if (state.loaded.overview) renderOverview();
  }

  /* ------------------------------------------------------------------
     4. CHART PRIMITIVES
     ------------------------------------------------------------------ */
  function plotHtml(cols, labels, max, h) {
    var gl = [0, 0.25, 0.5, 0.75, 1].map(function (t) {
      return '<i class="gl' + (t === 0 ? ' zero' : '') + '" style="bottom:' + (t * 100) + '%"></i><span class="yl" style="bottom:' + (t * 100) + '%">' + (t === 0 ? '0' : compact(max * t)) + '</span>';
    }).join('');
    var tpl = 'grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))';
    return '<div class="plot" style="height:' + h + 'px"><div class="pa">' + gl + '<div class="bars" style="' + tpl + '">' + cols.join('') + '</div></div>' +
      '<div class="xl" style="' + tpl + '">' + labels.join('') + '</div></div>';
  }
  function hbars(items, opts) {
    opts = opts || {};
    if (!items.length) return emptyState('No data', opts.empty || 'Nothing to show for the current filters.');
    var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); })) || 1;
    return '<div class="hbars">' + items.map(function (i) {
      var w = Math.max((Math.abs(i.value) / max) * 100, 2);
      var cls = i.cls || opts.cls || 'p-bad';
      return '<div class="hbar-row"><div class="top"><span class="nm" title="' + esc(i.label) + '">' + esc(i.label) + '</span>' +
        '<span class="vl">' + money(i.value) + (i.note ? ' <small>' + esc(i.note) + '</small>' : '') + '</span></div>' +
        '<div class="progress thin"><i class="' + cls + '" style="width:' + w + '%"></i></div></div>';
    }).join('') + '</div>';
  }
  function groupSum(arr, keyFn, valFn) {
    var m = {};
    arr.forEach(function (r) {
      var k = keyFn(r) || '—';
      var g = m[k] || (m[k] = { key: k, v: 0, n: 0 });
      g.v += valFn(r); g.n++;
    });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.v - a.v; });
  }
  function dualPlot(months, a, b, h) {   // grouped columns: a (blue) vs b (amber)
    var mx = 0;
    a.concat(b).forEach(function (v) { if (v > mx) mx = v; });
    if (!mx) return null;
    var max = niceMax(mx);
    var cols = months.map(function (m, i) {
      var ha = Math.max(a[i], 0) / max * 100, hb = Math.max(b[i], 0) / max * 100;
      return '<div class="bcol dual" title="' + esc(m.title) + '"><div class="bar s-a" style="height:' + ha + '%"></div><div class="bar s-b" style="height:' + hb + '%"></div></div>';
    });
    var labels = months.map(function (m) { return '<span' + (m.now ? ' class="now"' : '') + '>' + esc(m.label) + '</span>'; });
    return plotHtml(cols, labels, max, h);
  }
  function stackRow(label, parts, text) {
    var tot = parts.reduce(function (t, p) { return t + p.n; }, 0) || 1;
    return '<div class="stack-row"><span class="nm" title="' + esc(label) + '">' + esc(label) + '</span><div class="stack">' +
      parts.filter(function (p) { return p.n; }).map(function (p) { return '<i style="flex:' + p.n + ';background:' + p.color + '" title="' + esc(p.name) + ': ' + p.n + '"></i>'; }).join('') +
      '</div><span class="ct">' + text + '</span></div>';
  }
  function metricBtn(x) {
    var at = x.extra ? ' data-extra="' + x.extra + '"' : (x.goto ? ' data-goto="' + x.goto + '"' : '');
    return '<button class="metric"' + at + ' style="--mc:' + x.color + '"><div class="ml">' + icon(x.icon) + esc(x.label) + '</div><div class="mv">' + x.value + (x.unit ? '<small>' + x.unit + '</small>' : '') + '</div><div class="ms">' + esc(x.sub || '') + '</div></button>';
  }
  function renderBand(sel, groups) {
    $(sel).style.setProperty('--bcols', groups.map(function (g) { return 'minmax(0,' + (g.items.length + 0.15) + 'fr)'; }).join(' '));
    $(sel).innerHTML = groups.map(function (g) {
      return '<div class="band-grp"><div class="band-title">' + esc(g.title) + '</div><div class="metrics" style="--n:' + g.items.length + '">' + g.items.map(metricBtn).join('') + '</div></div>';
    }).join('');
  }
  function renderIns(sel, list) {
    if (!list.length) list = [{ lvl: 'ok', icon: 'check', title: 'Everything looks on track', text: 'Nothing needs attention for the current filters.' }];
    $(sel).innerHTML = list.slice(0, 4).map(function (i) {
      var at = i.extra ? ' data-extra="' + i.extra + '"' : i.goto ? ' data-goto="' + i.goto + '"' : '';
      return '<button class="ins ' + i.lvl + '"' + at + '><span class="ii">' + icon(i.icon) + '</span><span><span class="it">' + esc(i.title) + '</span><span class="id">' + esc(i.text || '') + '</span></span></button>';
    }).join('');
  }
  function renderSeg(sel, key, defs) {
    $(sel).innerHTML = defs.map(function (d) {
      return '<button role="tab" data-alert="' + key + '|' + d.k + '" class="' + (state.alertTab[key] === d.k ? 'active' : '') + '">' + d.label +
        '<span class="n' + (d.hot && d.n ? ' hot' : '') + '">' + d.n + '</span></button>';
    }).join('');
  }
  function alertItem(open, name, title, sub, amt, pillHtml) {
    return '<button class="alert-item" data-open="' + open + '" data-name="' + esc(name) + '"><div class="l"><div class="t">' + esc(title) + '</div><div class="s">' + sub + '</div></div>' +
      '<div class="r">' + (amt ? '<div class="amt">' + amt + '</div>' : '') + (pillHtml || '') + '</div></button>';
  }
  function dayPill(days) {
    if (days < 0) return '<span class="pill bad">' + plural(-days, 'day') + ' ago</span>';
    if (days === 0) return '<span class="pill bad">Today</span>';
    return '<span class="pill ' + (days <= 30 ? 'warn' : 'info') + '">in ' + plural(days, 'day') + '</span>';
  }

  /* ------------------------------------------------------------------
     5. FACILITIES TAB
     ------------------------------------------------------------------ */
  var EXTRA = {
    fm_exp90:    { tab: 'fm', table: 'fm', label: 'Ending within ' + EXPIRY_SOON_DAYS + ' days', fn: function (r) { return r._active && r._days != null && r._days >= 0 && r._days <= EXPIRY_SOON_DAYS; } },
    fm_expired:  { tab: 'fm', table: 'fm', label: 'Past contract end (still active)', fn: function (r) { return r._active && r._days != null && r._days < 0; } },
    fm_inst:     { tab: 'fm', table: 'fm', label: 'Unpaid instalments past due', fn: function (r) { return r._instOver.length > 0; } },
    fm_docs:     { tab: 'fm', table: 'fm', label: 'Licence / permit expired or expiring', fn: function (r) { return r._docBad.length > 0; } },
    fm_nodate:   { tab: 'fm', table: 'fm', label: 'No contract end date', fn: function (r) { return r._active && r._days == null; } },
    inv_low:     { tab: 'inventory', table: 'inventory', label: 'Low stock', fn: function (r) { return r.health === 'low'; } },
    inv_short:   { tab: 'inventory', table: 'inventory', label: 'Shortage', fn: function (r) { return r.health === 'short'; } },
    inv_neg:     { tab: 'inventory', table: 'inventory', label: 'Negative stock', fn: function (r) { return r.health === 'neg'; } },
    inv_dead:    { tab: 'inventory', table: 'inventory', label: 'Dead stock (> ' + DEAD_STOCK_DAYS + ' days)', fn: function (r) { return r.health === 'dead'; } },
    fin_ar:      { tab: 'finance', table: 'finance', label: 'Receivables', fn: function (r) { return r._kind === 'AR'; } },
    fin_ap:      { tab: 'finance', table: 'finance', label: 'Payables', fn: function (r) { return r._kind === 'AP'; } },
    fin_arover:  { tab: 'finance', table: 'finance', label: 'Overdue receivables', fn: function (r) { return r._kind === 'AR' && r._overdue; } },
    fin_apover:  { tab: 'finance', table: 'finance', label: 'Overdue payables', fn: function (r) { return r._kind === 'AP' && r._overdue; } },
    fin_ar90:    { tab: 'finance', table: 'finance', label: 'Receivables overdue > 90 days', fn: function (r) { return r._kind === 'AR' && r._days > 90; } },
    fin_apsoon:  { tab: 'finance', table: 'finance', label: 'Payables due in ' + PAYABLE_SOON_DAYS + ' days', fn: function (r) { return r._kind === 'AP' && r._due >= TODAY && r._due <= addDays(PAYABLE_SOON_DAYS); } }
  };

  function fmRows() {
    return state.raw.fm.filter(function (r) { return inCo(r) && matchQ([r._name, r.name, r._loc, r.owner_name, r._company, r._type, r.contract_number]); });
  }
  function fmStats(F) {
    var A = F.filter(function (r) { return r._active; });
    var s = { F: F, A: A };
    s.annual = sum(A, '_annual'); s.area = sum(A, '_area');
    var areaWithRent = A.filter(function (r) { return r._area > 0 && r._annual > 0; });
    s.psqm = sum(areaWithRent, '_area') ? sum(areaWithRent, '_annual') / sum(areaWithRent, '_area') : 0;
    s.exp90 = A.filter(EXTRA.fm_exp90.fn); s.expired = A.filter(EXTRA.fm_expired.fn);
    s.nodate = A.filter(EXTRA.fm_nodate.fn);
    s.instOver = []; s.instSoon = [];
    A.forEach(function (r) {
      r._instOver.forEach(function (i) { s.instOver.push({ r: r, i: i }); });
      r._instSoon.forEach(function (i) { s.instSoon.push({ r: r, i: i }); });
    });
    s.instOverAmt = s.instOver.reduce(function (t, x) { return t + x.i.amt; }, 0);
    s.instSoonAmt = s.instSoon.reduce(function (t, x) { return t + x.i.amt; }, 0);
    s.docs = [];
    A.forEach(function (r) { r._docBad.forEach(function (d) { s.docs.push({ r: r, d: d }); }); });
    s.docsExpired = s.docs.filter(function (x) { return x.d.days < 0; }).length;
    s.docsSoon = s.docs.length - s.docsExpired;
    return s;
  }

  function renderFM() {
    var F = fmRows(), s = fmStats(F);
    state.view.fm = F; state.fmStats = s;

    renderBand('#fmBand', [
      { title: 'Facilities · Portfolio', items: [
        { goto: 'fm', icon: 'building', color: 'var(--c-info)', label: 'Active facilities', value: s.A.length, sub: (F.length - s.A.length) + ' closed · ' + compact(s.area) + ' sqm' },
        { goto: 'fm', icon: 'wallet', color: 'var(--c-warn)', label: 'Annualised rent', value: compact(s.annual), unit: CURRENCY, sub: 'Active contracts' },
        { goto: 'fm', icon: 'percent', color: 'var(--c-slate)', label: 'Avg rent / sqm', value: money(s.psqm), unit: CURRENCY, sub: 'Per year' },
        { extra: 'fm_exp90', icon: 'calendar', color: 'var(--c-orange)', label: 'Ending in ' + EXPIRY_SOON_DAYS + ' days', value: s.exp90.length, sub: compact(sum(s.exp90, '_annual')) + ' ' + CURRENCY + ' annual rent' }
      ] },
      { title: 'Compliance & rent', items: [
        { extra: 'fm_expired', icon: 'alert', color: 'var(--c-bad)', label: 'Past contract end', value: s.expired.length, sub: 'Still marked active' },
        { extra: 'fm_inst', icon: 'clock', color: 'var(--c-bad)', label: 'Instalments overdue', value: compact(s.instOverAmt), unit: CURRENCY, sub: plural(s.instOver.length, 'instalment') + ' unpaid' },
        { extra: 'fm_docs', icon: 'shield', color: 'var(--c-orange)', label: 'Licences / permits', value: s.docsExpired + ' / ' + s.docsSoon, sub: 'expired / expiring ≤ ' + DOC_SOON_DAYS + 'd' }
      ] }
    ]);

    var ins = [];
    if (s.expired.length) ins.push({ lvl: 'bad', icon: 'alert', extra: 'fm_expired', title: plural(s.expired.length, 'contract') + ' past the end date but still active', text: 'Renew the agreement or mark the facility Closed' });
    var noRenew = s.A.filter(function (r) { return r._days != null && r._days >= 0 && r._days <= 30 && r.auto_renewal !== 'Yes'; });
    if (noRenew.length) ins.push({ lvl: 'warn', icon: 'calendar', extra: 'fm_exp90', title: plural(noRenew.length, 'contract') + ' end within 30 days without auto-renewal', text: noRenew.slice(0, 2).map(function (r) { return r._name; }).join(' · ') });
    if (s.docsExpired) ins.push({ lvl: 'bad', icon: 'shield', extra: 'fm_docs', title: plural(s.docsExpired, 'licence / permit') + ' expired', text: 'Commercial licence, CR, civil defence, contracts … see Needs attention' });
    if (s.instOver.length) ins.push({ lvl: 'warn', icon: 'clock', extra: 'fm_inst', title: compact(s.instOverAmt) + ' ' + CURRENCY + ' of rent instalments not marked paid', text: 'Based on the Paid tick-boxes on each facility' });
    if (s.instSoon.length) ins.push({ lvl: 'info', icon: 'wallet', extra: 'fm_inst', title: compact(s.instSoonAmt) + ' ' + CURRENCY + ' rent falls due in the next ' + RENT_DUE_DAYS + ' days', text: plural(s.instSoon.length, 'instalment') });
    if (s.nodate.length) ins.push({ lvl: 'warn', icon: 'clock', extra: 'fm_nodate', title: plural(s.nodate.length, 'active facility', 'active facilities') + ' without a contract end date', text: 'Aging cannot be tracked for these' });
    renderIns('#fmInsights', ins);

    renderFmTimeline(s); renderFmAlerts(s);
    var A = s.A;
    $('#fmByType').innerHTML = hbars(groupSum(A, function (r) { return r._type; }, function (r) { return r._annual; }).map(function (g) { return { label: g.key, value: g.v, note: plural(g.n, 'facility', 'facilities') }; }), { empty: 'No active contracts.', cls: 'p-bad' });
    $('#fmByLocation').innerHTML = hbars(groupSum(A, function (r) { return r._loc; }, function (r) { return r._annual; }).slice(0, 7).map(function (g) { return { label: g.key, value: g.v, note: plural(g.n, 'facility', 'facilities') }; }), { empty: 'No active contracts.' });
    $('#fmByCompany').innerHTML = hbars(groupSum(A, function (r) { return r._company; }, function (r) { return r._annual; }).map(function (g) { return { label: g.key, value: g.v, note: plural(g.n, 'facility', 'facilities') }; }), { empty: 'No active contracts.', cls: 'p-ok' });
    renderFmDocs(A); renderFmAssets();
    state.tables.fm.setRows(F);
    $$('.tab').forEach(function (t) { if (t.dataset.tab === 'fm') $('.count', t).textContent = s.A.length; });
    $('#fmFoot').innerHTML = '<span>Showing ' + F.length + ' of ' + state.raw.fm.length + ' facility records · annualised rent = total rent ÷ contract years</span><span>Confidential · ' + esc(CURRENCY) + ' · as of ' + fmtDate(TODAY) + '</span>';
  }

  function renderFmTimeline(s) {
    var now = new Date(), keys = [{ k: 'expired', label: 'Expired' }];
    for (var i = 0; i < 12; i++) { var d = new Date(now.getFullYear(), now.getMonth() + i, 1); keys.push({ k: monthKey(d), label: MONTHS[d.getMonth()] + (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''), now: i === 0 }); }
    var agg = {}; keys.forEach(function (x) { agg[x.k] = { v: 0, n: 0 }; });
    s.A.forEach(function (r) {
      if (r._days == null) return;
      var k = r._days < 0 ? 'expired' : String(r._end).slice(0, 7);
      if (agg[k]) { agg[k].v += r._annual; agg[k].n++; }
    });
    var mx = Math.max.apply(null, keys.map(function (x) { return agg[x.k].v; })) || 0;
    if (!mx) { $('#fmTimeline').innerHTML = emptyState('No contract end dates', 'No active contract ends in the next 12 months.'); return; }
    var max = niceMax(mx);
    var cols = keys.map(function (x) {
      var a = agg[x.k], h = a.v / max * 100;
      return '<button class="bcol" data-fmend="' + x.k + '" style="--bc:' + (x.k === 'expired' ? 'var(--c-bad)' : 'var(--c-info)') + '" title="' + esc(x.label) + ' — ' + plural(a.n, 'contract') + ' · ' + money(a.v) + ' ' + CURRENCY + '">' +
        (a.v ? '<span class="bv" style="bottom:calc(' + h + '% + 4px)">' + compact(a.v) + '</span>' : '') + '<div class="bar" style="height:' + h + '%"></div></button>';
    });
    var labels = keys.map(function (x) { return '<span' + (x.now ? ' class="now"' : '') + '>' + esc(x.label) + '<small>' + plural(agg[x.k].n, 'contract') + '</small></span>'; });
    $('#fmTimeline').innerHTML = plotHtml(cols, labels, max, 290);
  }

  function renderFmAlerts(s) {
    var contracts = s.A.filter(function (r) { return r._days != null && r._days <= EXPIRY_SOON_DAYS; }).sort(function (a, b) { return a._days - b._days; });
    var docs = s.docs.slice().sort(function (a, b) { return a.d.days - b.d.days; });
    var rent = s.instOver.map(function (x) { return { r: x.r, i: x.i, over: true }; }).concat(s.instSoon.map(function (x) { return { r: x.r, i: x.i, over: false }; }));
    rent.sort(function (a, b) { return a.i.due < b.i.due ? -1 : 1; });
    var checks = [];
    state.view.fm.forEach(function (r) {
      if (!r._active) return;
      if (!r._total) checks.push({ r: r, msg: 'No rent amount recorded' });
      else if (!r._end) checks.push({ r: r, msg: 'No contract end date' });
      else if (!r._area) checks.push({ r: r, msg: 'Area (sqm) missing — rent per sqm not available' });
      else if (!r.company) checks.push({ r: r, msg: 'Company not set' });
    });
    state.fmAlerts = { contracts: contracts, docs: docs, rent: rent, checks: checks };
    renderSeg('#fmAlertSeg', 'fm', [
      { k: 'contracts', label: 'Contracts', n: contracts.length, hot: contracts.some(function (r) { return r._days < 0; }) },
      { k: 'docs', label: 'Licences', n: docs.length, hot: s.docsExpired > 0 },
      { k: 'rent', label: 'Rent', n: rent.length, hot: s.instOver.length > 0 },
      { k: 'checks', label: 'Data checks', n: checks.length }
    ]);
    var tab = state.alertTab.fm, html = '';
    if (tab === 'contracts') html = contracts.slice(0, 30).map(function (r) { return alertItem('fm', r.name, r._name, esc(r._type) + ' · ' + esc(r._loc) + ' · ends ' + fmtDate(r._end), compact(r._annual), dayPill(r._days)); }).join('') || emptyState('All clear', 'No contract ends within ' + EXPIRY_SOON_DAYS + ' days.');
    else if (tab === 'docs') html = docs.slice(0, 40).map(function (x) { return alertItem('fm', x.r.name, x.r._name, esc(x.d.label) + ' · ' + fmtDate(x.d.date), '', dayPill(x.d.days)); }).join('') || emptyState('All clear', 'No licence or permit is expired or expiring.');
    else if (tab === 'rent') html = rent.slice(0, 40).map(function (x) { return alertItem('fm', x.r.name, x.r._name, 'Instalment ' + x.i.k + ' · due ' + fmtDate(x.i.due), money(x.i.amt), x.over ? '<span class="pill bad">Not paid</span>' : dayPill(daysBetween(TODAY, x.i.due))); }).join('') || emptyState('Nothing due', 'No unpaid instalments past due or due in the next ' + RENT_DUE_DAYS + ' days.');
    else html = checks.slice(0, 40).map(function (c) { return alertItem('fm', c.r.name, c.r._name, esc(c.msg), '', ''); }).join('') || emptyState('Looks clean', 'No data gaps found.');
    $('#fmAlertList').innerHTML = html;
  }

  function renderFmDocs(A) {
    var rows = DOC_DEFS.map(function (d) {
      var list = A.filter(function (r) { return r[d[0]]; });
      if (!list.length) return '';
      var ex = 0, so = 0, ok = 0;
      list.forEach(function (r) { var dy = daysBetween(TODAY, r[d[0]]); if (dy < 0) ex++; else if (dy <= DOC_SOON_DAYS) so++; else ok++; });
      return stackRow(d[1], [{ name: 'Valid', n: ok, color: 'var(--c-ok)' }, { name: 'Expiring', n: so, color: 'var(--c-warn)' }, { name: 'Expired', n: ex, color: 'var(--c-bad)' }],
        ok + ' valid · ' + so + ' soon · ' + '<b style="color:' + (ex ? 'var(--bad)' : 'inherit') + '">' + ex + ' expired</b>');
    }).join('');
    $('#fmDocs').innerHTML = rows || emptyState('No expiry dates', 'No licence or permit expiry is recorded on the active facilities.');
  }

  function renderFmAssets() {
    var A = state.raw.assets.filter(function (r) { return inCo(r); });
    if (!A.length) { $('#fmAssets').innerHTML = emptyState('No assets', 'No submitted assets for the selected company.'); return; }
    var ins = A.filter(function (r) { return r.insurance_end_date && r.insurance_end_date <= addDays(DOC_SOON_DAYS); }).length;
    var rep = state.raw.repairs.filter(inCo).length;
    var cats = groupSum(A, function (r) { return r.asset_category; }, function (r) { return r._gross; }).slice(0, 5);
    $('#fmAssets').innerHTML = '<div class="mini-kpis" style="padding:0 18px">' +
      '<div class="mini"><div class="l">Assets</div><div class="v">' + A.length + '</div></div>' +
      '<div class="mini"><div class="l">Gross cost</div><div class="v">' + compact(sum(A, '_gross')) + '<small>' + CURRENCY + '</small></div></div>' +
      '<div class="mini"><div class="l">Net book value</div><div class="v">' + compact(sum(A, '_nbv')) + '<small>' + CURRENCY + '</small></div></div>' +
      '<div class="mini"><div class="l">Repairs pending</div><div class="v" style="color:' + (rep ? 'var(--warn)' : 'inherit') + '">' + rep + '</div></div></div>' +
      '<div class="card-body-pad">' + hbars(cats.map(function (g) { return { label: g.key, value: g.v, note: plural(g.n, 'asset') }; }), { cls: 'p-bad' }) +
      (ins ? '<p class="card-sub" style="padding:10px 0 0">' + plural(ins, 'asset') + ' with insurance expired or expiring in ' + DOC_SOON_DAYS + ' days.</p>' : '') + '</div>';
  }

  /* ------------------------------------------------------------------
     6. INVENTORY TAB
     ------------------------------------------------------------------ */
  var HEALTH = {
    neg:   { label: 'Negative stock', cls: 'b-bad',   color: 'var(--c-deep)' },
    short: { label: 'Shortage',       cls: 'b-bad',   color: 'var(--c-bad)' },
    low:   { label: 'Low stock',      cls: 'b-warn',  color: 'var(--c-warn)' },
    dead:  { label: 'Dead stock',     cls: 'b-slate', color: 'var(--c-slate)' },
    ok:    { label: 'Healthy',        cls: 'b-ok',    color: 'var(--c-ok)' }
  };
  var AGE_B = [
    { k: 'a30',   label: '0–30 days',    color: 'var(--c-ok)',     test: function (d) { return d <= 30; } },
    { k: 'a90',   label: '31–90 days',   color: 'var(--c-lime)',   test: function (d) { return d > 30 && d <= 90; } },
    { k: 'a180',  label: '91–180 days',  color: 'var(--c-warn)',   test: function (d) { return d > 90 && d <= 180; } },
    { k: 'a365',  label: '181–365 days', color: 'var(--c-orange)', test: function (d) { return d > 180 && d <= 365; } },
    { k: 'a365p', label: '> 1 year',     color: 'var(--c-deep)',   test: function (d) { return d > 365; } }
  ];

  function buildInvItems() {
    var bins = state.raw.bins.filter(inCo), im = state.raw.items, lm = state.raw.lastMove, m = {};
    bins.forEach(function (b) {
      var it = im[b.item_code] || {};
      var g = m[b.item_code] || (m[b.item_code] = {
        name: b.item_code, _title: it.item_name || b.item_code, group: it.item_group || '—', uom: b.stock_uom || it.stock_uom || '',
        qty: 0, value: 0, reserved: 0, ordered: 0, projected: 0, reorder: num(it.custom_reorder_level_qty) || num(it.safety_stock) || 0, whs: []
      });
      g.qty += b._qty; g.value += b._val; g.reserved += b._res; g.ordered += b._ord; g.projected += b._proj; g.whs.push(b);
    });
    var out = Object.keys(m).map(function (k) {
      var g = m[k];
      g.last = lm[k] || ''; g.days = g.last ? daysBetween(g.last, TODAY) : null; g.approx = !!(state.raw.lastApprox && state.raw.lastApprox[k]);
      g.nwh = g.whs.length;
      var neg = g.whs.some(function (b) { return b._qty < 0; });
      g.health = neg ? 'neg' : g.projected < 0 ? 'short' : (g.reorder > 0 && g.qty <= g.reorder) ? 'low' :
        (!state.raw.noAge && g.qty > 0 && g.value > 0 && g.days != null && g.days > DEAD_STOCK_DAYS) ? 'dead' : 'ok';
      g._age = (g.qty > 0 && g.value > 0) ? (g.days == null ? 'unk' : (AGE_B.filter(function (b) { return b.test(g.days); })[0] || {}).k || 'unk') : '';
      g._company = state.filters.company === 'all' ? (g.whs.length === 1 ? g.whs[0]._company : 'Multiple') : state.filters.company;
      return g;
    });
    return out.filter(function (g) { return matchQ([g.name, g._title, g.group, g.whs.map(function (b) { return b._wh; }).join(' ')]); });
  }
  function invStats(I) {
    var s = { I: I };
    var pos = I.filter(function (g) { return g.qty > 0; });
    s.value = sum(I, 'value');
    s.itemsInStock = pos.length;
    var whs = {}; state.raw.bins.filter(inCo).forEach(function (b) { if (b._qty > 0) whs[b.warehouse] = 1; });
    s.whCount = Object.keys(whs).length;
    var sorted = pos.slice().sort(function (a, b) { return b.value - a.value; });
    s.top10 = sorted.slice(0, 10); s.top10Val = sum(s.top10, 'value');
    ['low', 'short', 'neg', 'dead'].forEach(function (h) { s[h] = I.filter(function (g) { return g.health === h; }); s[h + 'Val'] = sum(s[h], 'value'); });
    return s;
  }

  function renderInv() {
    var I = buildInvItems(), s = invStats(I);
    state.view.inv = I; state.invStats = s;
    var topPct = s.value > 0 ? Math.round(s.top10Val / s.value * 100) : 0;
    renderBand('#invBand', [
      { title: 'Inventory · Stock position', items: [
        { goto: 'inventory', icon: 'box', color: 'var(--c-info)', label: 'Stock value', value: compact(s.value), unit: CURRENCY, sub: plural(s.itemsInStock, 'item') + ' in stock' },
        { goto: 'inventory', icon: 'building', color: 'var(--c-slate)', label: 'Warehouses with stock', value: s.whCount, sub: 'Active, non-empty' },
        { goto: 'inventory', icon: 'percent', color: 'var(--c-warn)', label: 'Top-10 concentration', value: topPct + '%', sub: 'of total stock value' },
        { extra: 'inv_dead', icon: 'clock', color: 'var(--c-deep)', label: 'Dead stock', value: state.raw.noAge ? 'n/a' : compact(s.deadVal), unit: state.raw.noAge ? '' : CURRENCY, sub: state.raw.noAge ? 'Movement data unavailable' : plural(s.dead.length, 'item') + ' idle > ' + DEAD_STOCK_DAYS + 'd' }
      ] },
      { title: 'Stock risks', items: [
        { extra: 'inv_low', icon: 'alert', color: 'var(--c-warn)', label: 'Low stock', value: s.low.length, sub: 'At / below reorder level' },
        { extra: 'inv_short', icon: 'alert', color: 'var(--c-bad)', label: 'Shortage', value: s.short.length, sub: 'Projected qty below zero' },
        { extra: 'inv_neg', icon: 'alert', color: 'var(--c-deep)', label: 'Negative stock', value: s.neg.length, sub: 'Needs a stock correction' }
      ] }
    ]);

    var ins = [];
    if (s.neg.length) ins.push({ lvl: 'bad', icon: 'alert', extra: 'inv_neg', title: plural(s.neg.length, 'item') + ' with negative stock in a warehouse', text: 'Post the missing receipt or correct with a stock reconciliation' });
    if (s.short.length) ins.push({ lvl: 'bad', icon: 'alert', extra: 'inv_short', title: plural(s.short.length, 'item') + ' will run short (projected qty < 0)', text: 'Reserved / demanded quantity exceeds stock + incoming orders' });
    if (s.low.length) ins.push({ lvl: 'warn', icon: 'box', extra: 'inv_low', title: plural(s.low.length, 'item') + ' at or below reorder level', text: 'Raise purchase requests' });
    if (!state.raw.noAge && s.dead.length) ins.push({ lvl: 'warn', icon: 'clock', extra: 'inv_dead', title: compact(s.deadVal) + ' ' + CURRENCY + ' tied up in dead stock', text: plural(s.dead.length, 'item') + ' without movement for over ' + DEAD_STOCK_DAYS + ' days' });
    if (topPct >= 50) ins.push({ lvl: 'info', icon: 'percent', goto: 'inventory', title: 'Top 10 items hold ' + topPct + '% of stock value', text: 'Largest: ' + (s.top10[0] ? s.top10[0]._title : '') });
    renderIns('#invInsights', ins);

    renderInvByWh(); renderInvHealth(I); renderInvAge(I); renderInvAlerts(s);
    var pos = I.filter(function (g) { return g.qty > 0 && g.value > 0; });
    $('#invByGroup').innerHTML = hbars(groupSum(pos, function (g) { return g.group; }, function (g) { return g.value; }).slice(0, 7).map(function (x) { return { label: x.key, value: x.v, note: plural(x.n, 'item') }; }), { empty: 'No stock.' });
    $('#invTopItems').innerHTML = hbars(s.top10.slice(0, 7).map(function (g) { return { label: g._title, value: g.value, note: (s.value ? Math.round(g.value / s.value * 100) : 0) + '%' }; }), { empty: 'No stock.', cls: 'p-ok' });
    var byCo = {};
    state.raw.bins.filter(inCo).forEach(function (b) { byCo[b._company] = (byCo[b._company] || 0) + b._val; });
    $('#invByCompany').innerHTML = hbars(Object.keys(byCo).map(function (k) { return { label: k, value: byCo[k] }; }).sort(function (a, b) { return b.value - a.value; }), { empty: 'No stock.' });
    state.tables.inventory.setRows(I);
    $$('.tab').forEach(function (t) { if (t.dataset.tab === 'inventory') $('.count', t).textContent = s.itemsInStock; });
    $('#invFoot').innerHTML = '<span>Showing ' + I.length + ' stock items · value from Bin.stock_value · movement dates from Stock Ledger Entry' + (state.raw.noAge ? ' (unavailable — dead-stock analysis hidden)' : (state.raw.ageFrom ? ' (scanned back to ' + fmtDate(state.raw.ageFrom) + '; older items show "Before" that date)' : '')) + '</span><span>Confidential · ' + esc(CURRENCY) + ' · as of ' + fmtDate(TODAY) + '</span>';
  }

  function renderInvByWh() {
    var m = {};
    state.raw.bins.filter(inCo).forEach(function (b) {
      if (!matchQ([b.item_code, b._wh])) return;
      var g = m[b.warehouse] || (m[b.warehouse] = { wh: b.warehouse, name: b._wh, v: 0, n: 0 });
      g.v += b._val; g.n++;
    });
    var list = Object.keys(m).map(function (k) { return m[k]; }).filter(function (g) { return g.v > 0; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
    if (!list.length) { $('#invByWh').innerHTML = emptyState('No stock', 'No stock value for the current filters.'); return; }
    var max = niceMax(list[0].v);
    var cols = list.map(function (g) {
      var h = g.v / max * 100;
      return '<button class="bcol" data-wh="' + esc(g.wh) + '" style="--bc:var(--c-info)" title="' + esc(g.name) + ' — ' + money(g.v) + ' ' + CURRENCY + ' · ' + plural(g.n, 'line') + '"><span class="bv" style="bottom:calc(' + h + '% + 4px)">' + compact(g.v) + '</span><div class="bar" style="height:' + h + '%"></div></button>';
    });
    var labels = list.map(function (g) { return '<span title="' + esc(g.name) + '">' + esc(g.name.length > 15 ? g.name.slice(0, 14) + '…' : g.name) + '<small>' + plural(g.n, 'line') + '</small></span>'; });
    $('#invByWh').innerHTML = plotHtml(cols, labels, max, 290);
  }

  function renderInvHealth(I) {
    if (!I.length) { $('#invHealth').innerHTML = emptyState('No stock', 'Nothing matches the current filters.'); return; }
    var order = ['neg', 'short', 'low', 'dead', 'ok'];
    var rows = order.map(function (k) { var l = I.filter(function (g) { return g.health === k; }); return { k: k, n: l.length, v: sum(l, 'value') }; });
    $('#invHealth').innerHTML = '<div class="stack">' + rows.filter(function (r) { return r.n; }).map(function (r) { return '<i style="flex:' + r.n + ';background:' + HEALTH[r.k].color + '" title="' + HEALTH[r.k].label + ': ' + r.n + '"></i>'; }).join('') + '</div>' +
      '<div class="stack-legend">' + rows.map(function (r) { return '<div class="sl-row"><span class="nm"><i style="background:' + HEALTH[r.k].color + '"></i>' + HEALTH[r.k].label + '</span><span class="n">' + r.n + '</span><span class="a">' + (r.v ? compact(r.v) : '—') + '</span></div>'; }).join('') + '</div>';
  }

  function renderInvAge(I) {
    if (state.raw.noAge) { $('#invAge').innerHTML = state.raw.noAgeWhy === 'perm' ? emptyState('Movement dates unavailable', 'Your role cannot read Stock Ledger Entry, so stock age cannot be calculated.') : emptyState('Movement dates could not be loaded', 'Stock Ledger Entry query failed' + (state.raw.noAgeDetail ? ' (' + state.raw.noAgeDetail + ')' : '') + '. Use Refresh to retry.'); return; }
    var agg = {};
    AGE_B.concat([{ k: 'unk', label: 'No movement', color: 'var(--c-muted)' }]).forEach(function (b) { agg[b.k] = { v: 0, n: 0 }; });
    I.forEach(function (g) { if (g._age) { agg[g._age].v += g.value; agg[g._age].n++; } });
    var list = AGE_B.concat(agg.unk.n ? [{ k: 'unk', label: 'No movement', color: 'var(--c-muted)' }] : []);
    var mx = Math.max.apply(null, list.map(function (b) { return agg[b.k].v; })) || 0;
    if (!mx) { $('#invAge').innerHTML = emptyState('No stock', 'Nothing to age for the current filters.'); return; }
    var max = niceMax(mx);
    var cols = list.map(function (b) {
      var h = agg[b.k].v / max * 100;
      return '<button class="bcol" data-age="' + b.k + '" style="--bc:' + b.color + '" title="' + b.label + ' — ' + money(agg[b.k].v) + ' ' + CURRENCY + ' · ' + plural(agg[b.k].n, 'item') + '"><span class="bv" style="bottom:calc(' + h + '% + 4px)">' + (agg[b.k].v ? compact(agg[b.k].v) : '') + '</span><div class="bar" style="height:' + h + '%"></div></button>';
    });
    var labels = list.map(function (b) { return '<span>' + b.label + '<small>' + plural(agg[b.k].n, 'item') + '</small></span>'; });
    $('#invAge').innerHTML = plotHtml(cols, labels, max, 290);
  }

  function renderInvAlerts(s) {
    var lows = s.low.slice().sort(function (a, b) { return (a.qty / (a.reorder || 1)) - (b.qty / (b.reorder || 1)); });
    var shorts = s.short.slice().sort(function (a, b) { return a.projected - b.projected; });
    var negs = s.neg.slice().sort(function (a, b) { return a.qty - b.qty; });
    var deads = s.dead.slice().sort(function (a, b) { return b.value - a.value; });
    renderSeg('#invAlertSeg', 'inv', [
      { k: 'low', label: 'Low', n: lows.length }, { k: 'short', label: 'Shortage', n: shorts.length, hot: true },
      { k: 'neg', label: 'Negative', n: negs.length, hot: true }, { k: 'dead', label: 'Dead', n: deads.length }
    ]);
    var t = state.alertTab.inv, list = t === 'low' ? lows : t === 'short' ? shorts : t === 'neg' ? negs : deads, html;
    html = list.slice(0, 30).map(function (g) {
      var sub = t === 'low' ? 'Qty ' + money(g.qty) + ' · reorder level ' + money(g.reorder) : t === 'short' ? 'On hand ' + money(g.qty) + ' · reserved ' + money(g.reserved) + ' · incoming ' + money(g.ordered) : t === 'neg' ? 'Qty ' + money(g.qty) + ' · ' + plural(g.nwh, 'warehouse') : 'Last moved ' + (g.last ? fmtDate(g.last) : '—') + ' · qty ' + money(g.qty);
      var pill = t === 'dead' ? '<span class="pill slate">' + plural(g.days, 'day') + ' idle</span>' : t === 'low' ? '<span class="pill warn">Low</span>' : '<span class="pill bad">' + (t === 'short' ? 'Short ' + money(-g.projected) : 'Negative') + '</span>';
      return alertItem('inventory', g.name, g._title, esc(sub), t === 'dead' ? money(g.value) : '', pill);
    }).join('') || emptyState('All clear', 'No items in this category.');
    $('#invAlertList').innerHTML = html;
  }

  /* ------------------------------------------------------------------
     7. FINANCE TAB
     ------------------------------------------------------------------ */
  var PERIODS = { year: 'This year', quarter: 'This quarter', month: 'This month', lastmonth: 'Last month', l12: 'Last 12 months' };

  function periodKeys() {
    var m = state.raw.fin12 || [];
    if (!m.length) return [];
    var cur = m[m.length - 1].key, p = state.filters.period;
    if (p === 'l12') return m.map(function (x) { return x.key; });
    if (p === 'month') return [cur];
    if (p === 'lastmonth') return [m[m.length - 2].key];
    var y = cur.slice(0, 4), mo = parseInt(cur.slice(5), 10) - 1, q = Math.floor(mo / 3);
    return m.map(function (x) { return x.key; }).filter(function (k) {
      if (k.slice(0, 4) !== y) return false;
      return p === 'year' ? true : Math.floor((parseInt(k.slice(5), 10) - 1) / 3) === q;
    });
  }
  function plSum(keys) {
    var out = { rev: 0, exp: 0, byCo: {} };
    keys.forEach(function (k) {
      var cell = state.raw.pl[k] || {};
      Object.keys(cell).forEach(function (co) {
        if (state.filters.company !== 'all' && co !== state.filters.company) return;
        out.rev += cell[co].rev; out.exp += cell[co].exp;
        var g = out.byCo[co] || (out.byCo[co] = { rev: 0, exp: 0 });
        g.rev += cell[co].rev; g.exp += cell[co].exp;
      });
    });
    return out;
  }
  function finRows() {
    var f = function (r) { return inCo(r) && matchQ([r._party, r.name, r.bill_no || '', r._company]); };
    return { AR: state.raw.si.filter(f), AP: state.raw.pi.filter(f) };
  }

  function renderFin() {
    var R = finRows(), AR = R.AR, AP = R.AP, all = AR.concat(AP);
    var cash = state.raw.cash.filter(inCo);
    var keys = periodKeys(), pl = plSum(keys), net = pl.rev - pl.exp;
    var cashTot = sum(cash, '_bal'), arTot = sum(AR, '_out'), apTot = sum(AP, '_out');
    var arOver = AR.filter(function (r) { return r._overdue; }), apOver = AP.filter(function (r) { return r._overdue; });
    var arOverAmt = sum(arOver, '_out'), apOverAmt = sum(apOver, '_out');
    state.view.fin = all;
    state.finStats = { cashTot: cashTot, arTot: arTot, apTot: apTot, arOverAmt: arOverAmt, apOverAmt: apOverAmt, pl: pl, net: net, AR: AR, AP: AP };

    renderBand('#finBand', [
      { title: 'Finance · Position today', items: [
        { goto: 'finance', icon: 'bank', color: 'var(--c-info)', label: 'Cash & bank', value: compact(cashTot), unit: CURRENCY, sub: plural(cash.length, 'active account') },
        { extra: 'fin_ar', icon: 'wallet', color: 'var(--c-ok)', label: 'Receivable', value: compact(arTot), unit: CURRENCY, sub: plural(AR.length, 'open invoice') },
        { extra: 'fin_arover', icon: 'alert', color: 'var(--c-bad)', label: 'Overdue receivable', value: compact(arOverAmt), unit: CURRENCY, sub: (arTot ? Math.round(arOverAmt / arTot * 100) : 0) + '% of receivable' },
        { extra: 'fin_ap', icon: 'wallet', color: 'var(--c-warn)', label: 'Payable', value: compact(apTot), unit: CURRENCY, sub: plural(AP.length, 'open bill') },
        { extra: 'fin_apover', icon: 'alert', color: 'var(--c-orange)', label: 'Overdue payable', value: compact(apOverAmt), unit: CURRENCY, sub: (apTot ? Math.round(apOverAmt / apTot * 100) : 0) + '% of payable' }
      ] },
      { title: 'Performance · ' + PERIODS[state.filters.period], items: [
        { goto: 'finance', icon: 'trend', color: 'var(--c-ok)', label: 'Revenue', value: compact(pl.rev), unit: CURRENCY, sub: 'Income accounts' },
        { goto: 'finance', icon: 'wallet', color: 'var(--c-warn)', label: 'Expenses', value: compact(pl.exp), unit: CURRENCY, sub: 'Expense accounts' },
        { goto: 'finance', icon: 'percent', color: net >= 0 ? 'var(--c-ok)' : 'var(--c-bad)', label: 'Net profit', value: (net < 0 ? '−' : '') + compact(Math.abs(net)), unit: CURRENCY, sub: (pl.rev ? Math.round(net / pl.rev * 100) : 0) + '% margin' }
      ] }
    ]);

    var ins = [];
    var ar90 = AR.filter(function (r) { return r._days > 90; });
    if (ar90.length) ins.push({ lvl: 'bad', icon: 'alert', extra: 'fin_ar90', title: compact(sum(ar90, '_out')) + ' ' + CURRENCY + ' receivable is over 90 days late', text: plural(ar90.length, 'invoice') + ' · chase or escalate' });
    var soon = AP.filter(EXTRA.fin_apsoon.fn), soonAmt = sum(soon, '_out'), dueNow = sum(AP.filter(function (r) { return r._overdue; }), '_out');
    if (soon.length || dueNow) ins.push({ lvl: (cashTot < soonAmt + dueNow) ? 'bad' : 'info', icon: 'calendar', extra: 'fin_apsoon', title: compact(soonAmt) + ' ' + CURRENCY + ' payable due in ' + PAYABLE_SOON_DAYS + ' days (+ ' + compact(dueNow) + ' already overdue)', text: cashTot >= soonAmt + dueNow ? 'Cash & bank balance covers it' : 'Cash & bank is short by ' + compact(soonAmt + dueNow - cashTot) + ' ' + CURRENCY });
    if (pl.rev || pl.exp) ins.push({ lvl: net < 0 ? 'bad' : 'ok', icon: 'trend', goto: 'finance', title: net < 0 ? 'Expenses exceed revenue by ' + compact(-net) + ' ' + CURRENCY : 'Net profit ' + compact(net) + ' ' + CURRENCY + ' (' + (pl.rev ? Math.round(net / pl.rev * 100) : 0) + '% margin)', text: PERIODS[state.filters.period] + ' · from GL income & expense accounts' });
    var top = groupSum(AR, function (r) { return r._party; }, function (r) { return r._out; });
    if (arTot > 0 && top.length > 1) { var t5 = top.slice(0, 5).reduce(function (t, g) { return t + g.v; }, 0); ins.push({ lvl: t5 / arTot >= 0.6 ? 'warn' : 'info', icon: 'users', goto: 'finance', title: Math.round(t5 / arTot * 100) + '% of receivables sit with 5 customers', text: 'Largest: ' + top[0].key + ' · ' + compact(top[0].v) + ' ' + CURRENCY }); }
    var neg = cash.filter(function (a) { return a._bal < 0; });
    if (neg.length) ins.push({ lvl: 'warn', icon: 'bank', goto: 'finance', title: plural(neg.length, 'bank / cash account') + ' with a negative balance', text: 'See Needs attention → Cash' });
    renderIns('#finInsights', ins);

    renderFinAging(AR, AP); renderFinNet(cashTot, arTot, apTot);
    renderFinPL(); renderFinCashflow(); renderFinCash(cash);
    renderFinAlerts(AR, AP, cash);
    $('#finTopCust').innerHTML = hbars(top.slice(0, 7).map(function (g) { return { label: g.key, value: g.v, note: arTot ? Math.round(g.v / arTot * 100) + '%' : '' }; }), { empty: 'No open receivables.', cls: 'p-ok' });
    var topS = groupSum(AP, function (r) { return r._party; }, function (r) { return r._out; });
    $('#finTopSupp').innerHTML = hbars(topS.slice(0, 7).map(function (g) { return { label: g.key, value: g.v, note: apTot ? Math.round(g.v / apTot * 100) + '%' : '' }; }), { empty: 'No open payables.' });
    $('#finByCoSub').textContent = PERIODS[state.filters.period];
    $('#finByCompany').innerHTML = hbars(Object.keys(pl.byCo).map(function (k) { var v = pl.byCo[k].rev - pl.byCo[k].exp; return { label: k, value: v, cls: v < 0 ? 'p-bad' : 'p-ok' }; }).sort(function (a, b) { return b.value - a.value; }), { empty: 'No profit & loss postings in this period.' });
    state.tables.finance.setRows(all);
    $$('.tab').forEach(function (t) { if (t.dataset.tab === 'finance') $('.count', t).textContent = all.length; });
    $('#finFoot').innerHTML = '<span>Open invoices: submitted documents with outstanding amount &gt; 0 (credit notes excluded) · revenue / expense from GL Entry (period closing vouchers excluded)</span><span>Confidential · ' + esc(CURRENCY) + ' · as of ' + fmtDate(TODAY) + '</span>';
  }

  function renderFinAging(AR, AP) {
    var a = {}, p = {}, an = {}, pn = {};
    BUCKETS.forEach(function (b) { a[b.k] = 0; p[b.k] = 0; an[b.k] = 0; pn[b.k] = 0; });
    AR.forEach(function (r) { a[r._bucket] += r._out; an[r._bucket]++; });
    AP.forEach(function (r) { p[r._bucket] += r._out; pn[r._bucket]++; });
    var mx = 0; BUCKETS.forEach(function (b) { mx = Math.max(mx, a[b.k], p[b.k]); });
    if (!mx) { $('#finAging').innerHTML = emptyState('Nothing outstanding', 'No open receivables or payables.'); return; }
    var max = niceMax(mx);
    var cols = BUCKETS.map(function (b) {
      return '<button class="bcol dual" data-finb="' + b.k + '" title="' + b.label + ' — receivable ' + money(a[b.k]) + ' (' + an[b.k] + ') · payable ' + money(p[b.k]) + ' (' + pn[b.k] + ')">' +
        '<div class="bar s-a" style="height:' + a[b.k] / max * 100 + '%"></div><div class="bar s-b" style="height:' + p[b.k] / max * 100 + '%"></div></button>';
    });
    var labels = BUCKETS.map(function (b) { return '<span>' + b.label + '<small>' + compact(a[b.k]) + ' / ' + compact(p[b.k]) + '</small></span>'; });
    $('#finAging').innerHTML = plotHtml(cols, labels, max, 290);
  }

  function renderFinNet(cash, ar, ap) {
    var net = cash + ar - ap;
    $('#finNet').innerHTML = '<div class="net-list">' +
      '<div class="net-row"><span>Cash &amp; bank</span><b>' + money(cash) + '</b></div>' +
      '<div class="net-row"><span>+ Receivable</span><b class="pos">' + money(ar) + '</b></div>' +
      '<div class="net-row"><span>− Payable</span><b class="neg">' + money(ap) + '</b></div>' +
      '<div class="net-row tot"><span>Net position</span><b class="' + (net >= 0 ? 'pos' : 'neg') + '">' + money(net) + ' <small style="font-weight:600;color:var(--muted)">' + CURRENCY + '</small></b></div></div>' +
      '<p class="card-sub" style="padding:12px 0 0">Liquid funds plus what customers owe, less what is owed to suppliers.</p>';
  }

  function monthsForChart() {
    var m = state.raw.fin12 || [];
    return m.map(function (x, i) { return { key: x.key, label: x.label, now: i === m.length - 1, title: x.label + ' ' + x.yr }; });
  }
  function renderFinPL() {
    var ms = monthsForChart(), rev = [], exp = [];
    ms.forEach(function (m) { var s = plSum([m.key]); rev.push(s.rev); exp.push(s.exp); m.title += ' — revenue ' + money(s.rev) + ' · expenses ' + money(s.exp) + ' · net ' + money(s.rev - s.exp); });
    var F = state.raw.plFail, allFailed = !!(F && F.n >= 12), h = allFailed ? '' : dualPlot(ms, rev, exp, 290);
    var plHtml = allFailed ? emptyState('Revenue vs expenses could not be loaded', F.why + '. Use Refresh to retry.') : (h || emptyState('No postings', 'No income or expense postings in the last 12 months.'));
    if (F && !allFailed && h) plHtml += '<p class="card-sub" style="padding:8px 0 0;color:var(--bad)">' + esc(F.n + ' of 12 months could not be loaded (' + F.months.join(', ') + '): ' + F.why + '. Those months show as 0.') + '</p>';
    $('#finPL').innerHTML = plHtml; $('#ovPL').innerHTML = plHtml;
  }
  function renderFinCashflow() {
    var ms = monthsForChart(), inn = {}, out = {};
    state.raw.pe.filter(inCo).forEach(function (p) {
      if (p.payment_type === 'Receive') inn[p._m] = (inn[p._m] || 0) + num(p.base_received_amount);
      else out[p._m] = (out[p._m] || 0) + num(p.base_paid_amount);
    });
    var a = ms.map(function (m) { return inn[m.key] || 0; }), b = ms.map(function (m) { return out[m.key] || 0; });
    ms.forEach(function (m, i) { m.title += ' — received ' + money(a[i]) + ' · paid ' + money(b[i]) + ' · net ' + money(a[i] - b[i]); });
    $('#finCashflow').innerHTML = dualPlot(ms, a, b, 290) || emptyState('No payments', 'No payment entries in the last 12 months.');
  }
  function renderFinCash(cash) {
    var list = cash.slice().sort(function (a, b) { return Math.abs(b._bal) - Math.abs(a._bal); }).filter(function (a) { return Math.abs(a._bal) >= 0.5; }).slice(0, 8);
    $('#finCash').innerHTML = hbars(list.map(function (a) { return { label: String(a.account_name || a.name).replace(/^\d+\s*-\s*/, ''), value: a._bal, note: a.account_type, cls: a._bal < 0 ? 'p-bad' : 'p-ok' }; }), { empty: 'No bank / cash balances found.' });
  }

  function renderFinAlerts(AR, AP, cash) {
    var arO = AR.filter(function (r) { return r._overdue; }).sort(function (a, b) { return b._out - a._out; });
    var apO = AP.filter(function (r) { return r._overdue; }).sort(function (a, b) { return b._out - a._out; });
    var apS = AP.filter(EXTRA.fin_apsoon.fn).sort(function (a, b) { return a._due < b._due ? -1 : 1; });
    var negs = cash.filter(function (a) { return a._bal < 0; }).sort(function (a, b) { return a._bal - b._bal; });
    renderSeg('#finAlertSeg', 'fin', [
      { k: 'ar', label: 'Late receivables', n: arO.length, hot: true }, { k: 'ap', label: 'Late payables', n: apO.length },
      { k: 'apsoon', label: 'Due soon', n: apS.length }, { k: 'cash', label: 'Cash', n: negs.length }
    ]);
    var t = state.alertTab.fin, html;
    var inv = function (r) { return alertItem('finance', r.name, r._party, esc(r.name) + ' · due ' + fmtDate(r._due) + ' · ' + esc(r._company), money(r._out), r._overdue ? '<span class="pill bad">' + plural(r._days, 'day') + ' late</span>' : dayPill(daysBetween(TODAY, r._due))); };
    if (t === 'ar') html = arO.slice(0, 30).map(inv).join('') || emptyState('All clear', 'No overdue receivables.');
    else if (t === 'ap') html = apO.slice(0, 30).map(inv).join('') || emptyState('All clear', 'No overdue payables.');
    else if (t === 'apsoon') html = apS.slice(0, 30).map(inv).join('') || emptyState('Nothing due', 'No payables fall due in the next ' + PAYABLE_SOON_DAYS + ' days.');
    else html = negs.slice(0, 30).map(function (a) { return '<button class="alert-item" data-route-btn="Account|' + esc(a.name) + '"><div class="l"><div class="t">' + esc(a.account_name || a.name) + '</div><div class="s">' + esc(a._company) + ' · ' + esc(a.account_type) + '</div></div><div class="r"><div class="amt" style="color:var(--bad)">' + money(a._bal) + '</div><span class="pill bad">Negative</span></div></button>'; }).join('') || emptyState('Looks fine', 'No bank or cash account is overdrawn.');
    $('#finAlertList').innerHTML = html;
  }


  /* ------------------------------------------------------------------
     7b. OVERVIEW TAB
     ------------------------------------------------------------------ */
  function ovRows(rows) {
    return '<div class="net-list">' + rows.map(function (r) {
      return '<div class="net-row"><span>' + r[0] + '</span><b' + (r[2] ? ' style="color:' + r[2] + '"' : '') + '>' + r[1] + '</b></div>';
    }).join('') + '</div>';
  }
  function renderOverview() {
    var f = state.fmStats, v = state.invStats, n = state.finStats;
    if (!f || !v || !n) return;
    var BAD = 'var(--bad)', WARN = 'var(--warn)', OK = 'var(--ok)';
    var danger = function (x, c) { return x > 0 ? c : ''; };

    renderBand('#ovBand', [
      { title: 'Facilities', items: [
        { goto: 'fm', icon: 'building', color: 'var(--c-info)', label: 'Active facilities', value: f.A.length, sub: compact(f.area) + ' sqm' },
        { goto: 'fm', icon: 'wallet', color: 'var(--c-warn)', label: 'Annualised rent', value: compact(f.annual), unit: CURRENCY, sub: 'Active contracts' },
        { extra: 'fm_exp90', icon: 'calendar', color: 'var(--c-orange)', label: 'Ending in ' + EXPIRY_SOON_DAYS + ' days', value: f.exp90.length, sub: f.expired.length + ' already past end date' }
      ] },
      { title: 'Inventory', items: [
        { goto: 'inventory', icon: 'box', color: 'var(--c-info)', label: 'Stock value', value: compact(v.value), unit: CURRENCY, sub: plural(v.itemsInStock, 'item') + ' in stock' },
        { extra: 'inv_short', icon: 'alert', color: 'var(--c-bad)', label: 'Shortage / negative', value: v.short.length + ' / ' + v.neg.length, sub: v.low.length + ' more at low stock' }
      ] },
      { title: 'Finance', items: [
        { goto: 'finance', icon: 'bank', color: 'var(--c-info)', label: 'Cash & bank', value: compact(n.cashTot), unit: CURRENCY, sub: 'GL balance' },
        { extra: 'fin_arover', icon: 'alert', color: 'var(--c-bad)', label: 'Overdue receivable', value: compact(n.arOverAmt), unit: CURRENCY, sub: 'of ' + compact(n.arTot) + ' receivable' },
        { extra: 'fin_apover', icon: 'alert', color: 'var(--c-orange)', label: 'Overdue payable', value: compact(n.apOverAmt), unit: CURRENCY, sub: 'of ' + compact(n.apTot) + ' payable' },
        { goto: 'finance', icon: 'trend', color: n.net >= 0 ? 'var(--c-ok)' : 'var(--c-bad)', label: 'Net profit', value: (n.net < 0 ? '−' : '') + compact(Math.abs(n.net)), unit: CURRENCY, sub: PERIODS[state.filters.period] }
      ] }
    ]);

    var cand = [];
    var soonAmt = sum(n.AP.filter(EXTRA.fin_apsoon.fn), '_out') + sum(n.AP.filter(function (r) { return r._overdue; }), '_out');
    if (soonAmt > n.cashTot) cand.push({ lvl: 'bad', icon: 'bank', extra: 'fin_apsoon', title: 'Cash is short by ' + compact(soonAmt - n.cashTot) + ' ' + CURRENCY + ' against overdue + near-term payables', text: 'Cash & bank ' + compact(n.cashTot) + ' vs payable ' + compact(soonAmt) });
    var ar90 = n.AR.filter(function (r) { return r._days > 90; });
    if (ar90.length) cand.push({ lvl: 'bad', icon: 'alert', extra: 'fin_ar90', title: compact(sum(ar90, '_out')) + ' ' + CURRENCY + ' receivable is over 90 days late', text: plural(ar90.length, 'invoice') });
    if (n.net < 0) cand.push({ lvl: 'bad', icon: 'trend', goto: 'finance', title: 'Expenses exceed revenue by ' + compact(-n.net) + ' ' + CURRENCY, text: PERIODS[state.filters.period] });
    if (f.expired.length) cand.push({ lvl: 'bad', icon: 'building', extra: 'fm_expired', title: plural(f.expired.length, 'facility contract') + ' past the end date but still active', text: 'Renew or close them' });
    if (f.docsExpired) cand.push({ lvl: 'bad', icon: 'shield', extra: 'fm_docs', title: plural(f.docsExpired, 'licence / permit') + ' expired', text: 'Commercial licence, CR, civil defence, contracts' });
    if (v.short.length + v.neg.length) cand.push({ lvl: 'bad', icon: 'box', extra: v.short.length ? 'inv_short' : 'inv_neg', title: plural(v.short.length + v.neg.length, 'item') + ' short or negative in stock', text: v.short.length + ' shortage · ' + v.neg.length + ' negative' });
    if (f.exp90.length) cand.push({ lvl: 'warn', icon: 'calendar', extra: 'fm_exp90', title: plural(f.exp90.length, 'facility contract') + ' end within ' + EXPIRY_SOON_DAYS + ' days', text: compact(sum(f.exp90, '_annual')) + ' ' + CURRENCY + ' annual rent' });
    if (!state.raw.noAge && v.dead.length) cand.push({ lvl: 'warn', icon: 'clock', extra: 'inv_dead', title: compact(v.deadVal) + ' ' + CURRENCY + ' tied up in dead stock', text: plural(v.dead.length, 'item') });
    if (f.instOver.length) cand.push({ lvl: 'warn', icon: 'wallet', extra: 'fm_inst', title: compact(f.instOverAmt) + ' ' + CURRENCY + ' rent instalments not marked paid', text: plural(f.instOver.length, 'instalment') });
    var rank = { bad: 0, warn: 1, info: 2, ok: 3 };
    cand.sort(function (a, b) { return rank[a.lvl] - rank[b.lvl]; });
    renderIns('#ovInsights', cand);

    // top priorities across areas
    var items = [];
    (state.fmAlerts ? state.fmAlerts.contracts.slice(0, 3) : []).forEach(function (r) { items.push(alertItem('fm', r.name, r._name, 'Facilities · contract ends ' + fmtDate(r._end), compact(r._annual), dayPill(r._days))); });
    (state.fmAlerts ? state.fmAlerts.docs.slice(0, 2) : []).forEach(function (x) { items.push(alertItem('fm', x.r.name, x.r._name, 'Facilities · ' + esc(x.d.label), '', dayPill(x.d.days))); });
    v.short.slice().sort(function (a, b) { return a.projected - b.projected; }).slice(0, 2).forEach(function (g) { items.push(alertItem('inventory', g.name, g._title, 'Inventory · short by ' + money(-g.projected) + ' ' + esc(g.uom), '', '<span class="pill bad">Shortage</span>')); });
    n.AR.filter(function (r) { return r._overdue; }).sort(function (a, b) { return b._out - a._out; }).slice(0, 3).forEach(function (r) { items.push(alertItem('finance', r.name, r._party, 'Finance · receivable due ' + fmtDate(r._due), money(r._out), '<span class="pill bad">' + plural(r._days, 'day') + ' late</span>')); });
    n.AP.filter(EXTRA.fin_apsoon.fn).sort(function (a, b) { return b._out - a._out; }).slice(0, 2).forEach(function (r) { items.push(alertItem('finance', r.name, r._party, 'Finance · payable due ' + fmtDate(r._due), money(r._out), dayPill(daysBetween(TODAY, r._due)))); });
    $('#ovPriorities').innerHTML = items.join('') || emptyState('All clear', 'Nothing urgent across the three areas.');

    $('#ovFm').innerHTML = ovRows([
      ['Active facilities', f.A.length], ['Annualised rent', money(f.annual) + ' ' + CURRENCY],
      ['Ending within ' + EXPIRY_SOON_DAYS + ' days', f.exp90.length, danger(f.exp90.length, WARN)], ['Past end date (still active)', f.expired.length, danger(f.expired.length, BAD)],
      ['Licences / permits expired', f.docsExpired, danger(f.docsExpired, BAD)], ['Rent instalments overdue', money(f.instOverAmt) + ' ' + CURRENCY, danger(f.instOverAmt, WARN)]
    ]);
    $('#ovInv').innerHTML = ovRows([
      ['Stock value', money(v.value) + ' ' + CURRENCY], ['Items in stock', v.itemsInStock],
      ['Low stock', v.low.length, danger(v.low.length, WARN)], ['Shortage', v.short.length, danger(v.short.length, BAD)],
      ['Negative stock', v.neg.length, danger(v.neg.length, BAD)], ['Dead stock value', state.raw.noAge ? 'n/a' : money(v.deadVal) + ' ' + CURRENCY, danger(v.deadVal, WARN)]
    ]);
    $('#ovFin').innerHTML = ovRows([
      ['Cash & bank', money(n.cashTot) + ' ' + CURRENCY], ['Receivable', money(n.arTot), ''], ['  of which overdue', money(n.arOverAmt), danger(n.arOverAmt, BAD)],
      ['Payable', money(n.apTot)], ['Revenue · ' + PERIODS[state.filters.period], money(n.pl.rev)],
      ['Net profit', money(n.net), n.net < 0 ? BAD : OK]
    ]);
    $('#ovFoot').innerHTML = '<span>Group overview across all companies' + (state.filters.company !== 'all' ? ' · filtered to ' + esc(state.filters.company) : '') + '</span><span>Confidential · ' + esc(CURRENCY) + ' · as of ' + fmtDate(TODAY) + '</span>';
  }

  /* ------------------------------------------------------------------
     8. TABLES
     ------------------------------------------------------------------ 
   */

  function DataTable(host, cfg) {
    var st = { filter: 'all', toggle: false, extra: null, extraLabel: '', sortKey: cfg.sort && cfg.sort.key, dir: (cfg.sort && cfg.sort.dir) || 'desc', page: 1 };
    var size = cfg.pageSize || 10;
    var rows = [];

    var filterHtml = cfg.filter ? '<select data-f="filter" aria-label="Filter"><option value="all">' + esc(cfg.filter.label) + '</option>' +
      cfg.filter.options.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') + '</select>' : '';
    var toggleHtml = cfg.toggle ? '<label class="toggle"><input type="checkbox" data-f="toggle"> ' + esc(cfg.toggle.label) + '</label>' : '';

    host.innerHTML =
      '<div class="tbl-tools">' + filterHtml + toggleHtml + '<button class="chip" data-f="clearExtra" hidden></button><span class="tbl-count"></span></div>' +
      '<div class="tbl-wrap"><table><thead><tr></tr></thead><tbody></tbody></table></div>' +
      '<div class="pager"><span class="info"></span><div class="btns"></div></div>';

    var thead = $('thead tr', host), tbody = $('tbody', host);
    thead.innerHTML = cfg.columns.map(function (c, i) {
      return '<th class="' + (c.num ? 'num ' : '') + (c.sort === false ? '' : 'sortable') + '" data-col="' + i + '">' + esc(c.label) + (c.sort === false ? '' : '<span class="arr">↕</span>') + '</th>';
    }).join('');

    function filtered() {
      var out = rows.filter(function (r) {
        if (st.filter !== 'all' && cfg.filter.get(r) !== st.filter) return false;
        if (st.toggle && !cfg.toggle.test(r)) return false;
        if (st.extra && !st.extra(r)) return false;
        return true;
      });
      var col = cfg.columns.filter(function (c) { return c.key === st.sortKey; })[0];
      if (col) {
        out.sort(function (a, b) {
          var x = a[col.key], y = b[col.key];
          var xn = x == null || x === '', yn = y == null || y === '';
          if (xn && yn) return 0; if (xn) return 1; if (yn) return -1;
          var res = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
          return st.dir === 'asc' ? res : -res;
        });
      }
      return out;
    }

    function draw() {
      var list = filtered();
      var pages = Math.max(Math.ceil(list.length / size), 1);
      if (st.page > pages) st.page = pages;
      var slice = list.slice((st.page - 1) * size, st.page * size);

      $$('th', thead).forEach(function (th) {
        var c = cfg.columns[+th.dataset.col], on = c.key === st.sortKey;
        th.classList.toggle('sorted', on);
        var a = $('.arr', th);
        if (a) a.textContent = on ? (st.dir === 'asc' ? '↑' : '↓') : '↕';
      });

      tbody.innerHTML = slice.length ? slice.map(function (r) {
        return '<tr class="row-click" tabindex="0" data-name="' + esc(r.name) + '">' + cfg.columns.map(function (c) {
          return '<td class="' + (c.num ? 'num' : '') + '">' + c.render(r) + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + cfg.columns.length + '">' + emptyState('No records found', rows.length ? 'Try changing the filters.' : 'No records match the current dashboard filters.') + '</td></tr>';

      var chip = $('[data-f="clearExtra"]', host);
      chip.hidden = !st.extra;
      chip.innerHTML = st.extra ? esc(st.extraLabel) + ' ' + icon('close', true) : '';
      $('.tbl-count', host).textContent = plural(list.length, 'record') + (list.length !== rows.length ? ' of ' + rows.length : '');
      $('.info', host).textContent = list.length ? 'Showing ' + ((st.page - 1) * size + 1) + '–' + Math.min(st.page * size, list.length) + ' of ' + list.length : '';
      var btns = '<button data-p="prev" ' + (st.page <= 1 ? 'disabled' : '') + '>‹</button>';
      var to = Math.min(pages, Math.max(1, st.page - 2) + 4), from = Math.max(1, to - 4);
      for (var p = from; p <= to; p++) btns += '<button data-p="' + p + '" class="' + (p === st.page ? 'cur' : '') + '">' + p + '</button>';
      btns += '<button data-p="next" ' + (st.page >= pages ? 'disabled' : '') + '>›</button>';
      $('.btns', host).innerHTML = pages > 1 ? btns : '';
      api.filteredRows = list;
    }

    host.addEventListener('change', function (e) {
      var f = e.target.dataset && e.target.dataset.f;
      if (f === 'filter') { st.filter = e.target.value; st.page = 1; draw(); }
      if (f === 'toggle') { st.toggle = !!e.target.checked; st.page = 1; draw(); }
    });
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-f="clearExtra"]')) { st.extra = null; st.page = 1; draw(); return; }
      var th = e.target.closest('th.sortable');
      if (th) {
        var c = cfg.columns[+th.dataset.col];
        if (st.sortKey === c.key) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sortKey = c.key; st.dir = c.num ? 'desc' : 'asc'; }
        draw(); return;
      }
      var pb = e.target.closest('.pager button');
      if (pb && !pb.disabled) {
        var p = pb.dataset.p;
        st.page = p === 'prev' ? st.page - 1 : p === 'next' ? st.page + 1 : +p; draw(); return;
      }
      var tr = e.target.closest('tr.row-click');
      if (tr && !e.target.closest('a')) openDrawer(cfg.key, tr.dataset.name);
    });
    host.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr.row-click')) { e.preventDefault(); openDrawer(cfg.key, e.target.dataset.name); }
    });

    var api = {
      setRows: function (r) { rows = r; draw(); },
      setToggle: function (v) { st.toggle = !!v; var cb = $('[data-f="toggle"]', host); if (cb) cb.checked = !!v; st.page = 1; draw(); },
      setExtra: function (fn, label) { st.extra = fn; st.extraLabel = label; st.page = 1; draw(); },
      reset: function () { st.filter = 'all'; st.toggle = false; st.extra = null; st.page = 1; var s = $('[data-f="filter"]', host); if (s) s.value = 'all'; var cb = $('[data-f="toggle"]', host); if (cb) cb.checked = false; },
      filteredRows: []
    };
    return api;
  }


  /* ------------------------------------------------------------------
     (tables, drawer, actions)
     ------------------------------------------------------------------ */

  function fmStatusBadge(r) {
    if (!r._active) return '<span class="badge b-slate">Closed</span>';
    if (r._days == null) return '<span class="badge b-slate">No end date</span>';
    if (r._days < 0) return '<span class="badge b-bad">Expired ' + plural(-r._days, 'day') + ' ago</span>';
    if (r._days <= 30) return '<span class="badge b-bad">Ends in ' + plural(r._days, 'day') + '</span>';
    if (r._days <= EXPIRY_SOON_DAYS) return '<span class="badge b-warn">Ends in ' + plural(r._days, 'day') + '</span>';
    return '<span class="badge b-ok">Active</span>';
  }
  function t2(main, sub) { return '<div class="main-t">' + esc(main || '—') + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : ''); }
  var DASH = '<span style="color:var(--muted)">—</span>';

  function initTables() {
    state.tables.fm = DataTable($('#fmTable'), {
      key: 'fm',
      filter: { label: 'All facility types', options: ['Warehouse', 'Showroom', 'Office', 'Land', 'Accomadation'], get: function (r) { return r._type; } },
      toggle: { label: 'Needs attention', test: function (r) { return r._attn; } },
      sort: { key: '_annual', dir: 'desc' },
      columns: [
        { key: '_name', label: 'Facility', render: function (r) { return t2(r._name, '<span class="mono">' + esc(r.name) + '</span>'); } },
        { key: '_type', label: 'Type', render: function (r) { return esc(r._type) + '<div class="sub">' + esc(r.facility_type || '') + '</div>'; } },
        { key: '_company', label: 'Company', render: function (r) { return esc(r._company); } },
        { key: '_loc', label: 'Location', render: function (r) { return locTag(r._loc); } },
        { key: '_area', label: 'Area sqm', num: true, render: function (r) { return r._area ? money(r._area) : DASH; } },
        { key: '_end', label: 'Contract end', render: function (r) { return r._end ? fmtDate(r._end) : DASH; } },
        { key: '_annual', label: 'Annual rent', num: true, render: function (r) { return r._annual ? '<b>' + money(r._annual) + '</b>' : DASH; } },
        { key: '_psqm', label: 'Rent / sqm', num: true, render: function (r) { return r._psqm ? money(r._psqm) : DASH; } },
        { key: '_nbad', label: 'Licence flags', num: true, render: function (r) { return r._nbad ? '<span class="pill ' + (r._docBad.some(function (d) { return d.days < 0; }) ? 'bad' : 'warn') + '">' + r._nbad + '</span>' : DASH; } },
        { key: '_days', label: 'Status', render: fmStatusBadge }
      ]
    });

    state.tables.inventory = DataTable($('#invTable'), {
      key: 'inventory',
      filter: { label: 'All stock conditions', options: ['Negative stock', 'Shortage', 'Low stock', 'Dead stock', 'Healthy'], get: function (r) { return HEALTH[r.health].label; } },
      toggle: { label: 'Needs action', test: function (r) { return r.health !== 'ok'; } },
      sort: { key: 'value', dir: 'desc' },
      columns: [
        { key: '_title', label: 'Item', render: function (r) { return t2(r._title, '<span class="mono">' + esc(r.name) + '</span>'); } },
        { key: 'group', label: 'Item group', render: function (r) { return esc(r.group); } },
        { key: 'nwh', label: 'Whs', num: true, render: function (r) { return r.nwh; } },
        { key: 'qty', label: 'Qty', num: true, render: function (r) { return money(r.qty) + '<div class="sub">' + esc(r.uom) + '</div>'; } },
        { key: 'value', label: 'Stock value', num: true, render: function (r) { return '<b>' + money(r.value) + '</b>'; } },
        { key: 'reserved', label: 'Reserved', num: true, render: function (r) { return r.reserved ? money(r.reserved) : DASH; } },
        { key: 'projected', label: 'Projected', num: true, render: function (r) { return '<span style="color:' + (r.projected < 0 ? 'var(--bad)' : 'inherit') + '">' + money(r.projected) + '</span>'; } },
        { key: 'reorder', label: 'Reorder lvl', num: true, render: function (r) { return r.reorder ? money(r.reorder) : DASH; } },
        { key: 'days', label: 'Last moved', render: function (r) { return r.last ? fmtDate(r.last) + '<div class="sub">' + plural(r.days, 'day') + ' ago</div>' : DASH; } },
        { key: 'health', label: 'Condition', render: function (r) { return '<span class="badge ' + HEALTH[r.health].cls + '">' + HEALTH[r.health].label + '</span>'; } }
      ]
    });

    state.tables.finance = DataTable($('#finTable'), {
      key: 'finance',
      filter: { label: 'Receivable & payable', options: ['Receivable', 'Payable'], get: function (r) { return r._label; } },
      toggle: { label: 'Overdue only', test: function (r) { return r._overdue; } },
      sort: { key: '_out', dir: 'desc' },
      columns: [
        { key: '_label', label: 'Type', render: function (r) { return '<span class="badge ' + (r._kind === 'AR' ? 'b-info' : 'b-warn') + '">' + r._label + '</span>'; } },
        { key: '_party', label: 'Party', render: function (r) { return t2(r._party, '<span class="mono">' + esc(r.name) + '</span>'); } },
        { key: '_company', label: 'Company', render: function (r) { return esc(r._company); } },
        { key: '_due', label: 'Due date', render: function (r) { return fmtDate(r._due) + (r._overdue ? '<div class="sub" style="color:var(--bad)">' + plural(r._days, 'day') + ' overdue</div>' : ''); } },
        { key: '_total', label: 'Invoice total', num: true, render: function (r) { return money(r._total); } },
        { key: '_out', label: 'Outstanding', num: true, render: function (r) { return '<b>' + money(r._out) + '</b>'; } },
        { key: 'status', label: 'Status', render: function (r) { return '<span class="badge ' + (r._overdue ? 'b-bad' : 'b-slate') + '">' + esc(r.status || (r._overdue ? 'Overdue' : 'Unpaid')) + '</span>'; } }
      ]
    });
  }

  /* ------------------------------------------------------------------
     9. DETAIL DRAWER
     ------------------------------------------------------------------ */
  function kv(k, v, full) { return '<div class="' + (full ? 'full' : '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + (v == null || v === '' ? '—' : v) + '</div></div>'; }
  function link(dt, name) { return name ? '<a data-route="' + esc(dt) + '|' + esc(name) + '">' + esc(name) + '</a>' : '—'; }
  function yesNo(v) { return v ? '<span class="pill ok">Yes</span>' : '<span class="pill slate">No</span>'; }
  function navOffset() {
    var off = 0;
    try {
      var nb = document.querySelector('header.navbar') || document.querySelector('.navbar');
      if (nb) { var r = nb.getBoundingClientRect(); if (r.height && r.bottom > 0) off = Math.min(Math.ceil(r.bottom), 140); }
    } catch (e) { /* ignore */ }
    return off;
  }
  function kpi(l, v, color) { return '<div class="mini"><div class="l">' + esc(l) + '</div><div class="v"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div></div>'; }

  function openDrawer(key, name) {
    var h = '', title, sub, statusHtml = '', actions = '', r;

    if (key === 'fm') {
      r = state.raw.fm.filter(function (x) { return x.name === name; })[0];
      if (!r) return;
      title = r._name; sub = r._type + ' · ' + r._loc + ' · ' + r.name; statusHtml = fmStatusBadge(r);
      h += '<div class="dr-kpis">' + kpi('Annual rent', money(r._annual)) + kpi('Contract value', money(r._total)) + kpi('Area sqm', r._area ? money(r._area) : '—') + '</div>';
      h += '<div class="dr-section"><h4>Agreement</h4><div class="kv">' +
        kv('Company', esc(r._company)) + kv('Facility type', esc(r.facility_type)) +
        kv('Category', esc(r.facility_catogory)) + kv('Contract status', esc(r.facility_contract_status)) +
        kv('Agreement', esc(r.agreement_type)) + kv('Contract no', esc(r.contract_number)) +
        kv('Start', fmtDate(r._start)) + kv('End', r._end ? fmtDate(r._end) + (r._days != null ? ' · ' + (r._days < 0 ? plural(-r._days, 'day') + ' ago' : 'in ' + plural(r._days, 'day')) : '') : '') +
        kv('Auto renewal', esc(r.auto_renewal)) + kv('Rent per sqm / year', r._psqm ? money(r._psqm) + ' ' + CURRENCY : '') +
        kv('Landlord', esc(r.owner_name)) + kv('Landlord phone', r.owner_number ? '<a href="tel:' + esc(r.owner_number) + '">' + esc(r.owner_number) + '</a>' : '') +
        kv('Payment mode', esc(r.rent_mode)) + kv('Instalments', esc(r.rent_installments)) + '</div></div>';
      if (r._inst.length) {
        h += '<div class="dr-section"><h4>Rent instalments</h4><table class="mini-tbl"><thead><tr><th>#</th><th>Due</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>' +
          r._inst.map(function (i) { return '<tr><td>' + i.k + '</td><td>' + fmtDate(i.due) + '</td><td class="num">' + money(i.amt) + '</td><td>' + (i.paid ? '<span class="pill ok">Paid</span>' : i.due < TODAY ? '<span class="pill bad">Not paid</span>' : '<span class="pill slate">Upcoming</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      if (r._docs.length) {
        h += '<div class="dr-section"><h4>Licences &amp; compliance</h4><table class="mini-tbl"><thead><tr><th>Document</th><th>Expiry</th><th>Status</th></tr></thead><tbody>' +
          r._docs.slice().sort(function (a, b) { return a.days - b.days; }).map(function (d) { return '<tr><td>' + esc(d.label) + '</td><td>' + fmtDate(d.date) + '</td><td>' + (d.days < 0 ? '<span class="pill bad">Expired</span>' : d.days <= DOC_SOON_DAYS ? '<span class="pill warn">' + plural(d.days, 'day') + ' left</span>' : '<span class="pill ok">Valid</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      var svc = [['Fire maintenance', r.fire_contractor], ['Cleaning', r.cleaning_cont], ['Camera maintenance', r.camera_contractor]].filter(function (x) { return x[1]; });
      h += '<div class="dr-section"><h4>Safety &amp; services</h4><div class="kv">' + kv('Fire layout', yesNo(r.fire_layout)) + kv('Sign board', yesNo(r.sign_board)) + kv('Medical kit', yesNo(r.medical_kit)) +
        svc.map(function (x) { return kv(x[0] + ' contractor', esc(x[1])); }).join('') + '</div></div>';
      if (r.additional_notes) h += '<div class="dr-section"><h4>Notes</h4><div>' + esc(r.additional_notes) + '</div></div>';
      actions += '<button class="btn btn-primary" data-route-btn="DM Facilities Management|' + esc(r.name) + '">' + icon('external', true) + ' Open in ERPNext</button>';
    }

    if (key === 'inventory') {
      r = state.view.inv.filter(function (x) { return x.name === name; })[0];
      if (!r) return;
      title = r._title; sub = r.name + ' · ' + r.group; statusHtml = '<span class="badge ' + HEALTH[r.health].cls + '">' + HEALTH[r.health].label + '</span>';
      h += '<div class="dr-kpis">' + kpi('On hand', money(r.qty) + ' <small>' + esc(r.uom) + '</small>') + kpi('Stock value', money(r.value)) + kpi('Projected', money(r.projected), r.projected < 0 ? 'var(--bad)' : '') + '</div>';
      h += '<div class="dr-section"><h4>Item</h4><div class="kv">' + kv('Item group', esc(r.group)) + kv('UOM', esc(r.uom)) +
        kv('Reorder level', r.reorder ? money(r.reorder) : '') + kv('Reserved', money(r.reserved)) + kv('Incoming (ordered)', money(r.ordered)) +
        kv('Last movement', r.last ? (r.approx ? 'Before ' : '') + fmtDate(r.last) + ' · ' + plural(r.days, 'day') + (r.approx ? '+' : '') + ' ago' : (state.raw.noAge ? 'Not available' : 'No movement recorded')) + '</div></div>';
      h += '<div class="dr-section"><h4>By warehouse</h4><table class="mini-tbl"><thead><tr><th>Warehouse</th><th class="num">Qty</th><th class="num">Reserved</th><th class="num">Value</th></tr></thead><tbody>' +
        r.whs.slice().sort(function (a, b) { return b._val - a._val; }).map(function (b) { return '<tr><td>' + esc(b._wh) + '</td><td class="num" style="color:' + (b._qty < 0 ? 'var(--bad)' : 'inherit') + '">' + money(b._qty) + '</td><td class="num">' + (b._res ? money(b._res) : '—') + '</td><td class="num">' + money(b._val) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      actions += '<button class="btn btn-primary" data-route-btn="Item|' + esc(r.name) + '">' + icon('external', true) + ' Open item</button>';
    }

    if (key === 'finance') {
      r = state.raw.si.concat(state.raw.pi).filter(function (x) { return x.name === name; })[0];
      if (!r) return;
      title = r._party; sub = r._label + ' · ' + r.name; statusHtml = '<span class="badge ' + (r._overdue ? 'b-bad' : 'b-slate') + '">' + esc(r.status || (r._overdue ? 'Overdue' : 'Unpaid')) + '</span>';
      var paidPct = r._total ? Math.min(Math.max((r._total - r._out) / r._total, 0), 1) * 100 : 0;
      h += '<div class="dr-kpis">' + kpi('Invoice total', money(r._total)) + kpi('Outstanding', money(r._out), r._overdue ? 'var(--bad)' : 'var(--warn)') + kpi('Days overdue', r._overdue ? String(r._days) : '0') + '</div>';
      h += '<div class="dr-section"><div class="progress"><i class="p-ok" style="width:' + paidPct + '%"></i></div><div class="card-sub" style="margin-top:8px;padding:0">' + Math.round(paidPct) + '% settled</div></div>';
      h += '<div class="dr-section"><h4>Invoice</h4><div class="kv">' + kv('Party', esc(r._party)) + kv('Company', esc(r._company)) +
        kv('Posting date', fmtDate(r.posting_date)) + kv('Due date', fmtDate(r._due)) + kv('Document', '<span class="mono">' + esc(r.name) + '</span>') +
        (r.bill_no ? kv('Supplier bill no', esc(r.bill_no)) : '') + '</div></div>';
      actions += '<button class="btn btn-primary" data-route-btn="' + (r._kind === 'AR' ? 'Sales Invoice' : 'Purchase Invoice') + '|' + esc(r.name) + '">' + icon('external', true) + ' Open in ERPNext</button>';
    }

    if (!title) return;
    actions += '<button class="btn btn-soft" data-close>Close</button>';
    $('#drawerBody').innerHTML =
      '<div class="dr-head"><div><h2>' + esc(title) + '</h2><div class="sub">' + esc(sub) + '</div><div style="margin-top:8px">' + statusHtml + '</div></div>' +
      '<button class="icon-btn" data-close aria-label="Close">' + icon('close') + '</button></div>' + h + '<div class="dr-actions">' + actions + '</div>';
    var sc = $('#scrim'), dr = $('#drawer'), off = navOffset();
    sc.style.top = off + 'px'; dr.style.top = off + 'px';
    sc.hidden = false;
    requestAnimationFrame(function () { sc.classList.add('show'); dr.classList.add('open'); });
    dr.setAttribute('aria-hidden', 'false');
    dr.scrollTop = 0;
  }
  function closeDrawer() {
    var sc = $('#scrim'), dr = $('#drawer');
    sc.classList.remove('show'); dr.classList.remove('open');
    dr.setAttribute('aria-hidden', 'true');
    setTimeout(function () { if (!dr.classList.contains('open')) sc.hidden = true; }, 220);
  }

  /* ------------------------------------------------------------------
     10. ACTIONS
     ------------------------------------------------------------------ */
  var EXPORTS = {
    fm: [['id', function (r) { return r.name; }], ['facility', function (r) { return r._name; }], ['type', function (r) { return r._type; }], ['ownership', function (r) { return r.facility_type; }],
      ['company', function (r) { return r._company; }], ['location', function (r) { return r._loc; }], ['area_sqm', function (r) { return r._area; }], ['contract_start', function (r) { return r._start; }],
      ['contract_end', function (r) { return r._end; }], ['days_to_end', function (r) { return r._days; }], ['annual_rent', function (r) { return Math.round(r._annual); }], ['contract_value', function (r) { return r._total; }],
      ['contract_status', function (r) { return r.facility_contract_status; }], ['auto_renewal', function (r) { return r.auto_renewal; }], ['landlord', function (r) { return r.owner_name; }], ['contract_no', function (r) { return r.contract_number; }]],
    inventory: [['item_code', function (r) { return r.name; }], ['item_name', function (r) { return r._title; }], ['item_group', function (r) { return r.group; }], ['uom', function (r) { return r.uom; }],
      ['qty', function (r) { return r.qty; }], ['stock_value', function (r) { return r.value; }], ['reserved', function (r) { return r.reserved; }], ['ordered', function (r) { return r.ordered; }],
      ['projected', function (r) { return r.projected; }], ['reorder_level', function (r) { return r.reorder; }], ['last_movement', function (r) { return r.last; }], ['condition', function (r) { return HEALTH[r.health].label; }],
      ['warehouses', function (r) { return r.whs.map(function (b) { return b._wh; }).join('; '); }]],
    finance: [['type', function (r) { return r._label; }], ['document', function (r) { return r.name; }], ['party', function (r) { return r._party; }], ['company', function (r) { return r._company; }],
      ['posting_date', function (r) { return r.posting_date; }], ['due_date', function (r) { return r._due; }], ['days_overdue', function (r) { return r._days; }], ['invoice_total', function (r) { return r._total; }],
      ['outstanding', function (r) { return r._out; }], ['status', function (r) { return r.status; }]]
  };
  function exportCsv(key) {
    var rows = (state.tables[key] && state.tables[key].filteredRows) || [], defs = EXPORTS[key];
    var q = function (v) { v = v == null ? '' : String(v); return '"' + v.replace(/"/g, '""') + '"'; };
    var csv = '﻿' + defs.map(function (d) { return q(d[0]); }).join(',') + '\n' + rows.map(function (r) { return defs.map(function (d) { return q(d[1](r)); }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = { fm: 'facilities', inventory: 'stock_items', finance: 'open_invoices' }[key] + '_' + TODAY + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copyText(text, msg) {
        text = tr(text); msg = tr(msg || 'Copied');
    var done = function () { if (window.frappe && frappe.show_alert) frappe.show_alert({ message: msg || 'Copied', indicator: 'green' }, 3); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done); return; } } catch (e) { /* fall through */ }
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e2) { /* ignore */ }
    ta.remove();
  }
  function filterNote() {
    var f = state.filters, p = [];
    if (f.q) p.push('“' + f.q + '”');
    if (f.company !== 'all') p.push(f.company);
    return p.length ? '(filtered: ' + p.join(', ') + ')' : '';
  }
  function buildSummary() {
    var L = [];
    if (state.tab === 'overview' && state.fmStats && state.invStats && state.finStats) {
      var o1 = state.fmStats, o2 = state.invStats, o3 = state.finStats;
      L.push('Group overview — ' + fmtDate(TODAY), filterNote(), '');
      L.push('Facilities: ' + o1.A.length + ' active · annualised rent ' + CURRENCY + ' ' + money(o1.annual) + ' · ' + o1.exp90.length + ' contracts ending ≤ ' + EXPIRY_SOON_DAYS + 'd · ' + o1.docsExpired + ' licences expired');
      L.push('Inventory: stock value ' + CURRENCY + ' ' + money(o2.value) + ' · low ' + o2.low.length + ' · shortage ' + o2.short.length + ' · negative ' + o2.neg.length);
      L.push('Finance: cash ' + CURRENCY + ' ' + money(o3.cashTot) + ' · receivable ' + money(o3.arTot) + ' (overdue ' + money(o3.arOverAmt) + ') · payable ' + money(o3.apTot) + ' (overdue ' + money(o3.apOverAmt) + ') · net profit ' + money(o3.net) + ' (' + PERIODS[state.filters.period] + ')');
    } else if (state.tab === 'fm' && state.fmStats) {
      var s = state.fmStats;
      L.push('Facilities summary — ' + fmtDate(TODAY), filterNote(), '');
      L.push('Active facilities: ' + s.A.length + ' · ' + compact(s.area) + ' sqm');
      L.push('Annualised rent: ' + CURRENCY + ' ' + money(s.annual));
      L.push('Contracts ending within ' + EXPIRY_SOON_DAYS + ' days: ' + s.exp90.length + ' · past end date but active: ' + s.expired.length);
      L.push('Rent instalments not marked paid: ' + CURRENCY + ' ' + money(s.instOverAmt) + ' (' + s.instOver.length + ')');
      L.push('Licences / permits expired: ' + s.docsExpired + ' · expiring ≤ ' + DOC_SOON_DAYS + ' days: ' + s.docsSoon);
    } else if (state.tab === 'inventory' && state.invStats) {
      var v = state.invStats;
      L.push('Inventory summary — ' + fmtDate(TODAY), filterNote(), '');
      L.push('Stock value: ' + CURRENCY + ' ' + money(v.value) + ' across ' + v.itemsInStock + ' items / ' + v.whCount + ' warehouses');
      L.push('Low stock: ' + v.low.length + ' · Shortage: ' + v.short.length + ' · Negative: ' + v.neg.length);
      if (!state.raw.noAge) L.push('Dead stock (> ' + DEAD_STOCK_DAYS + ' days): ' + CURRENCY + ' ' + money(v.deadVal) + ' (' + v.dead.length + ' items)');
    } else if (state.tab === 'finance' && state.finStats) {
      var f = state.finStats;
      L.push('Finance summary — ' + fmtDate(TODAY) + ' · ' + PERIODS[state.filters.period], filterNote(), '');
      L.push('Cash & bank: ' + CURRENCY + ' ' + money(f.cashTot));
      L.push('Receivable: ' + CURRENCY + ' ' + money(f.arTot) + ' (overdue ' + money(f.arOverAmt) + ')');
      L.push('Payable: ' + CURRENCY + ' ' + money(f.apTot) + ' (overdue ' + money(f.apOverAmt) + ')');
      L.push('Revenue: ' + money(f.pl.rev) + ' · Expenses: ' + money(f.pl.exp) + ' · Net profit: ' + money(f.net));
    } else L.push('Nothing loaded yet.');
    return L.filter(function (x, i) { return x !== '' || i > 0; }).join('\n');
  }
  function goRoute(dt, name) { if (window.frappe && frappe.set_route) frappe.set_route('Form', dt, name); }
  function scrollTo(sel) { try { var el = $(sel); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ } }

  function renderRailLinks(tab) {
    $('#railLinks').innerHTML = (RAIL_LINKS[tab] || []).map(function (l) {
      return '<button class="rlink" data-' + (l[0] === 'report' ? 'report' : 'list') + '="' + esc(l[1]) + '" title="' + esc(l[1]) + '">' + icon(l[0] === 'report' ? 'file' : 'list', true) + '<span class="lbl">' + esc(l[2]) + '</span></button>';
    }).join('');
  }
  function setTab(name) {
    state.tab = name;
    $$('.tab').forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle('active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    });
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    try { localStorage.setItem('fif-tab', name); } catch (e) { /* ignore */ }
    renderRailLinks(name);
    updateFilterUI();
    closeDrawer();
    showBanner();
    loadTab(name);
  }

  /* ------------------------------------------------------------------
     11. THEME & RESPONSIVE WIDTH
     ------------------------------------------------------------------ */
  function erpTheme() {
    var el = document.documentElement, t = el.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    var m = el.getAttribute('data-theme-mode');
    if (m === 'dark' || m === 'light') return m;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function syncTheme() { $('#tld').setAttribute('data-theme', THEME_MODE === 'auto' ? erpTheme() : 'light'); }
  function setWidthClass() {
    var el = $('#tld'), w = 0;
    try { w = el.getBoundingClientRect().width; } catch (e) { /* ignore */ }
    if (!w) w = el.offsetWidth || 1200;
    el.setAttribute('data-w', w >= 1320 ? 'xl' : w >= 1040 ? 'l' : w >= 740 ? 'm' : 's');
  }

  /* ------------------------------------------------------------------
     12. EVENTS & BOOT
     ------------------------------------------------------------------ */
  function drillTable(tableKey, fn, label, scrollSel) {
    var t = state.tables[tableKey];
    t.reset(); t.setExtra(fn, label);
    scrollTo(scrollSel);
  }

  function initStatic() {
    $$('[data-ico]').forEach(function (el) { el.innerHTML = icon(el.dataset.ico, true); });
    $$('.tab').forEach(function (t) {
      var l = TAB_LABELS[t.dataset.tab];
      t.innerHTML = icon(l[0]) + '<span class="lbl">' + l[1] + '</span>' + (t.dataset.tab === 'overview' ? '' : '<span class="count">0</span>');
      t.setAttribute('aria-selected', t.classList.contains('active')); t.title = l[1];
    });
    $('#btnRefresh').innerHTML = icon('refresh', true) + '<span>Refresh</span>';
    $('#btnCopy').innerHTML = icon('copy', true) + '<span>Copy summary</span>';
    $('#btnCopy').title = 'Copy management summary';
    $$('[data-action="export"]').forEach(function (b) { b.innerHTML = icon('download', true) + ' Export CSV'; });
    $$('[data-action="list"]').forEach(function (b) { b.innerHTML = icon('list', true) + ' Open list'; });
    $$('[data-action="new"]').forEach(function (b) { b.innerHTML = icon('plus', true) + ' New'; });

    root.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('#btnReset')) { state.filters = Object.assign({}, DEFAULT_FILTERS); $('#fSearch').value = ''; return applyFilters(); }
      if (e.target.closest('#btnCopy')) return copyText(buildSummary(), 'Summary copied');
      if ((t = e.target.closest('.tab'))) return setTab(t.dataset.tab);

      if ((t = e.target.closest('[data-fmend]'))) {
        var k = t.dataset.fmend;
        return drillTable('fm', function (r) { return r._active && r._days != null && (k === 'expired' ? r._days < 0 : (r._days >= 0 && String(r._end).slice(0, 7) === k)); }, k === 'expired' ? 'Contracts already past end date' : 'Contracts ending ' + k, '#fmTable');
      }
      if ((t = e.target.closest('[data-wh]'))) {
        var wh = t.dataset.wh;
        return drillTable('inventory', function (r) { return r.whs.some(function (b) { return b.warehouse === wh; }); }, 'Warehouse: ' + shortWh(wh), '#invTable');
      }
      if ((t = e.target.closest('[data-age]'))) {
        var ak = t.dataset.age, lab = (AGE_B.filter(function (b) { return b.k === ak; })[0] || { label: 'No movement' }).label;
        return drillTable('inventory', function (r) { return r._age === ak; }, 'Last moved: ' + lab, '#invTable');
      }
      if ((t = e.target.closest('[data-finb]'))) {
        var fb = t.dataset.finb, bl = BUCKETS.filter(function (b) { return b.k === fb; })[0].label;
        return drillTable('finance', function (r) { return r._bucket === fb; }, 'Aging: ' + bl, '#finTable');
      }
      if ((t = e.target.closest('[data-extra]'))) {
        var ex = EXTRA[t.dataset.extra];
        if (!ex) return;
        if (state.tab !== ex.tab) setTab(ex.tab);
        return drillTable(ex.table, ex.fn, ex.label, '#' + { fm: 'fmTable', inventory: 'invTable', finance: 'finTable' }[ex.table]);
      }
      if ((t = e.target.closest('[data-goto]'))) { var g = t.dataset.goto; if (g !== state.tab) setTab(g); return scrollTo({ fm: '#fmTable', inventory: '#invTable', finance: '#finTable' }[g]); }
      if ((t = e.target.closest('[data-alert]'))) { var pr = t.dataset.alert.split('|'); state.alertTab[pr[0]] = pr[1]; return applyFilters(); }
      if ((t = e.target.closest('[data-open]'))) return openDrawer(t.dataset.open, t.dataset.name);
      if (e.target.closest('[data-close]') || e.target.closest('#scrim')) return closeDrawer();
      if ((t = e.target.closest('[data-route]'))) { var a = t.dataset.route.split('|'); return goRoute(a[0], a[1]); }
      if ((t = e.target.closest('[data-route-btn]'))) { var b = t.dataset.routeBtn.split('|'); return goRoute(b[0], b[1]); }
      if ((t = e.target.closest('[data-report]'))) return frappe.set_route('query-report', t.dataset.report);
      if ((t = e.target.closest('[data-list]'))) return frappe.set_route('List', t.dataset.list);
      if ((t = e.target.closest('[data-action]'))) {
        var ac = t.dataset.action;
        if (ac === 'export') return exportCsv(t.dataset.target);
        if (ac === 'list') return frappe.set_route('List', t.dataset.doctype);
        if (ac === 'new') return frappe.new_doc(t.dataset.doctype);
      }
      if (e.target.closest('#btnLang')) return setLang(LANG === 'ar' ? 'en' : 'ar', true);
      if (e.target.closest('#btnRefresh')) {
        if (state.tab === 'overview') { state.loaded.fm = state.loaded.inventory = state.loaded.finance = false; }
        state.loaded[state.tab] = false; return loadTab(state.tab, true);
      }
    });
    root.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'fCompany') { state.filters.company = e.target.value; applyFilters(); }
      if (id === 'fPeriod') { state.filters.period = e.target.value; applyFilters(); }
    });
    var timer = null;
    root.addEventListener('input', function (e) {
      if (e.target.id !== 'fSearch') return;
      var v = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(function () { state.filters.q = v.trim(); applyFilters(); }, 180);
    });
    root.addEventListener('keydown', function (e) {
      var tr = e.target.closest && e.target.closest('tr[data-open]');
      if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(tr.dataset.open, tr.dataset.name); }
    });
    $('.tabs').addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft') return;
      var tabs = $$('.tab'), i = tabs.findIndex(function (t) { return t.dataset.tab === state.tab; });
      i = (i + (k === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      e.preventDefault(); setTab(tabs[i].dataset.tab); tabs[i].focus();
    });
    document.addEventListener('keydown', function onKey(ev) {
      if (!root.host || !root.host.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (ev.key === 'Escape') closeDrawer();
    });
  }

  /* ------------------------------------------------------------------
     LANGUAGE  (English / العربية) — translates the rendered DOM using the
     dictionary below. Add or fix a phrase by editing AR_DICT.
     ------------------------------------------------------------------ */
  var AR_DICT = {
    // chrome
    'FM, Inventory & Finance': 'المرافق والمخزون والمالية',
    'Facilities, stock and financial position in one place.': 'المرافق والمخزون والمركز المالي في مكان واحد.',
    'Overview': 'نظرة عامة', 'Facilities': 'المرافق', 'Inventory': 'المخزون', 'Finance': 'المالية',
    'Loading…': 'جارٍ التحميل…', 'Updated ': 'آخر تحديث ', 'Refresh': 'تحديث', 'Reset': 'إعادة ضبط', 'Reset filters': 'إعادة ضبط الفلاتر',
    'Search': 'بحث', 'Facility, item, warehouse, party, invoice…': 'منشأة، صنف، مستودع، طرف، فاتورة…',
    'Company': 'الشركة', 'All companies': 'كل الشركات', 'Period (profit & loss)': 'الفترة (الأرباح والخسائر)',
    'This year': 'هذه السنة', 'This quarter': 'هذا الربع', 'This month': 'هذا الشهر', 'Last month': 'الشهر الماضي', 'Last 12 months': 'آخر 12 شهرًا',
    'Copy management summary': 'نسخ ملخص الإدارة', 'Summary copied': 'تم نسخ الملخص', 'Copied': 'تم النسخ', 'Language': 'اللغة',
    'Open': 'فتح', 'Open list': 'فتح القائمة', 'Open item': 'فتح الصنف', ' Open in ERPNext': ' فتح في ERPNext', 'Open in ERPNext': 'فتح في ERPNext',
    ' Export CSV': ' تصدير CSV', 'Export CSV': 'تصدير CSV', 'New': 'جديد', 'Close': 'إغلاق',
    'Facilities list': 'قائمة المرافق', 'Stock balance': 'رصيد المخزون', 'Receivable': 'المدينون', 'P&L': 'الأرباح والخسائر', 'Assets list': 'قائمة الأصول',
    'Warehouse Wise Stock Balance': 'رصيد المخزون حسب المستودع', 'Accounts Receivable': 'الذمم المدينة', 'Accounts Payable': 'الذمم الدائنة',
    'Profit and Loss Statement': 'قائمة الأرباح والخسائر', 'Balance Sheet': 'الميزانية العمومية', 'Cash Flow': 'التدفق النقدي',
    // overview + cards
    'Revenue vs expenses': 'الإيرادات مقابل المصروفات', 'Profit & loss accounts · last 12 months': 'حسابات الأرباح والخسائر · آخر 12 شهرًا',
    'Top priorities': 'أهم الأولويات', 'Most urgent items across facilities, stock and finance': 'أكثر البنود إلحاحًا في المرافق والمخزون والمالية',
    'Leases, rent and licences': 'العقود والإيجارات والتراخيص', 'Stock value and risks': 'قيمة المخزون والمخاطر', 'Cash, receivables and profit': 'النقد والمدينون والأرباح',
    'Revenue': 'الإيرادات', 'Expenses': 'المصروفات', 'Expense': 'المصروف', 'Income': 'الدخل',
    'Group overview — ': 'نظرة عامة على المجموعة — ', 'Group overview across all companies': 'نظرة عامة على المجموعة لكل الشركات',
    ' · filtered to ': ' · مصفّاة على ', 'Confidential · ': 'سري · ', ' · as of ': ' · حتى ',
    'Active facilities': 'المرافق النشطة', 'Annualised rent': 'الإيجار السنوي', 'Active contracts': 'العقود النشطة', 'Ending in ': 'تنتهي خلال ',
    'Stock value': 'قيمة المخزون', 'Shortage / negative': 'عجز / سالب', 'Cash & bank': 'النقد والبنك', 'GL balance': 'رصيد دفتر الأستاذ',
    'Overdue receivable': 'مدينون متأخرون', 'Overdue payable': 'دائنون متأخرون', 'Net profit': 'صافي الربح', 'Net profit ': 'صافي الربح ',
    ' sqm': ' م²', 'sqm': 'م²', 'Area sqm': 'المساحة م²',
    ' already past end date': ' تجاوزت تاريخ الانتهاء', 'already past end date': 'تجاوزت تاريخ الانتهاء',
    ' in stock': ' في المخزون', ' more at low stock': ' أخرى بمخزون منخفض', ' more at low stock': ' أخرى بمخزون منخفض', ' of ': ' من ',
    ' receivable': ' مدينون', ' payable': ' دائنون',
    // insights/alerts
    ' receivable is over 90 days late': ' مدينون متأخرون أكثر من 90 يومًا', ' payables due ': ' دائنون مستحقون ',
    ' facility contract': ' عقد منشأة', ' facility contracts': ' عقود منشآت', ' past the end date but still active': ' تجاوزت تاريخ الانتهاء وما زالت نشطة',
    'Renew or close them': 'جدّدها أو أغلقها', 'Renew the agreement or mark the facility Closed': 'جدّد الاتفاقية أو اجعل المنشأة مغلقة',
    ' licence / permit expired': ' ترخيص / تصريح منتهٍ', ' licence / permits expired': ' تراخيص / تصاريح منتهية', ' licence / permits': ' تراخيص / تصاريح', ' licence / permit': ' ترخيص / تصريح',
    'Commercial licence, CR, civil defence, contracts': 'الرخصة التجارية، السجل التجاري، الدفاع المدني، العقود',
    'Commercial licence, CR, civil defence, contracts … see Needs attention': 'الرخصة التجارية، السجل التجاري، الدفاع المدني، العقود … راجع "يحتاج انتباه"',
    ' short or negative in stock': ' عجز أو سالب في المخزون', ' end within ': ' تنتهي خلال ', ' annual rent': ' إيجار سنوي',
    ' tied up in dead stock': ' محتجزة في مخزون راكد', ' rent instalments not marked paid': ' أقساط إيجار غير مسددة',
    'Cash is short by ': 'عجز في النقد بمقدار ', 'Cash & bank is short by ': 'عجز في النقد والبنك بمقدار ', ' against overdue + near-term payables': ' مقابل الدائنين المتأخرين وقريبي الاستحقاق',
    'Cash & bank balance covers it': 'رصيد النقد والبنك يغطيها', 'Expenses exceed revenue by ': 'المصروفات تتجاوز الإيرادات بمقدار ',
    'Everything looks on track': 'كل شيء على المسار الصحيح', 'Looks clean': 'سليم', 'Looks fine': 'لا مشكلة', 'All clear': 'لا شيء عاجل',
    'Nothing urgent across the three areas.': 'لا شيء عاجل في المجالات الثلاثة.',
    'Needs attention': 'يحتاج انتباه', 'Needs action': 'يحتاج إجراء', 'Contracts, licences and rent to action': 'العقود والتراخيص والإيجارات المطلوب متابعتها',
    // facilities
    'Contract expiry timeline': 'الجدول الزمني لانتهاء العقود', 'Annualised rent of contracts ending each month · click a bar to filter the table': 'الإيجار السنوي للعقود المنتهية كل شهر · اضغط على عمود لتصفية الجدول',
    'Rent by facility type': 'الإيجار حسب نوع المنشأة', 'Annualised rent · active contracts': 'الإيجار السنوي · العقود النشطة', 'Rent by location': 'الإيجار حسب الموقع', 'Top locations': 'أعلى المواقع',
    'Rent by company': 'الإيجار حسب الشركة', 'Annualised rent': 'الإيجار السنوي', 'Licences & compliance validity': 'صلاحية التراخيص والامتثال',
    'Active facilities · only documents that have an expiry date recorded': 'المرافق النشطة · المستندات التي لها تاريخ انتهاء مسجل فقط',
    'Fixed assets': 'الأصول الثابتة', 'Asset register · submitted, not sold or scrapped': 'سجل الأصول · المعتمدة وغير المباعة أو المخردة',
    'Leases, rent agreements and licences · click a row for the full file': 'العقود واتفاقيات الإيجار والتراخيص · اضغط على صف لعرض الملف كاملًا',
    'Past contract end': 'تجاوز نهاية العقد', 'Past contract end (still active)': 'تجاوز نهاية العقد (ما زال نشطًا)', 'Past end date (still active)': 'تجاوز تاريخ الانتهاء (ما زال نشطًا)',
    'Contracts already past end date': 'عقود تجاوزت تاريخ الانتهاء', 'Contracts ending ': 'عقود تنتهي خلال ', 'Contracts ending within ': 'عقود تنتهي خلال ', 'Contracts': 'العقود',
    ' contracts ending ≤ ': ' عقود تنتهي ≤ ', 'No contract ends within ': 'لا عقود تنتهي خلال ', 'No active contract ends in the next 12 months.': 'لا عقد نشط ينتهي خلال 12 شهرًا القادمة.',
    'No active contracts.': 'لا عقود نشطة.', 'No contract end date': 'بلا تاريخ انتهاء', 'No contract end dates': 'لا تواريخ انتهاء للعقود', 'No rent amount recorded': 'لا مبلغ إيجار مسجل',
    'Licence / permit expired or expiring': 'ترخيص / تصريح منتهٍ أو قارب على الانتهاء', 'Licence flags': 'تنبيهات التراخيص', 'Licences': 'التراخيص', 'Licences / permits': 'التراخيص / التصاريح',
    'Licences / permits expired': 'تراخيص / تصاريح منتهية', 'Licences / permits expired: ': 'تراخيص / تصاريح منتهية: ', 'No licence or permit is expired or expiring.': 'لا ترخيص أو تصريح منتهٍ أو قارب على الانتهاء.',
    'No licence or permit expiry is recorded on the active facilities.': 'لا تواريخ انتهاء تراخيص مسجلة على المرافق النشطة.', ' expired / expiring ≤ ': ' منتهٍ / ينتهي ≤ ', 'expired / expiring ≤ ': 'منتهٍ / ينتهي ≤ ',
    'Rent instalments overdue': 'أقساط الإيجار المتأخرة', 'Rent instalments not marked paid: ': 'أقساط إيجار غير مسددة: ', 'Instalments': 'الأقساط', 'Instalment ': 'القسط ', 'Instalments overdue': 'أقساط متأخرة',
    'Unpaid instalments past due': 'أقساط غير مسددة متأخرة', 'No unpaid instalments past due or due in the next ': 'لا أقساط غير مسددة متأخرة أو مستحقة خلال ', 'Based on the Paid tick-boxes on each facility': 'بناءً على خانات "مدفوع" في كل منشأة',
    'Compliance & rent': 'الامتثال والإيجار', 'Facilities · Portfolio': 'المرافق · المحفظة', 'Facilities summary — ': 'ملخص المرافق — ', 'Facilities · ': 'المرافق · ', 'Facilities: ': 'المرافق: ',
    'Facilities · contract ends ': 'المرافق · ينتهي العقد ', 'Active facilities: ': 'المرافق النشطة: ', ' active · annualised rent ': ' نشطة · الإيجار السنوي ', ' closed · ': ' مغلقة · ', 'Annualised rent: ': 'الإيجار السنوي: ',
    ' facility records · annualised rent = total rent ÷ contract years': ' سجل منشأة · الإيجار السنوي = إجمالي الإيجار ÷ سنوات العقد',
    'Avg rent / sqm': 'متوسط الإيجار / م²', 'Rent / sqm': 'الإيجار / م²', 'Rent per sqm / year': 'الإيجار لكل م² / سنة', 'Area (sqm) missing — rent per sqm not available': 'المساحة غير مسجلة — الإيجار لكل م² غير متاح',
    'Facility': 'المنشأة', 'Facility type': 'نوع المنشأة', 'All facility types': 'كل أنواع المنشآت', 'Location': 'الموقع', 'Landlord': 'المالك', 'Landlord phone': 'هاتف المالك', 'Contract no': 'رقم العقد', 'Contract end': 'نهاية العقد',
    'Contract status': 'حالة العقد', 'Contract value': 'قيمة العقد', 'Agreement': 'الاتفاقية', 'Lease Agreement': 'عقد إيجار', 'Auto renewal': 'تجديد تلقائي', 'Per year': 'سنويًا', 'Annual rent': 'الإيجار السنوي', 'Rent': 'الإيجار',
    'Warehouse': 'المستودع', 'Showroom': 'صالة عرض', 'Office': 'مكتب', 'Land': 'أرض', 'Accomadation': 'سكن', 'Owned': 'مملوك', 'Rented': 'مستأجر', 'Leased': 'مؤجَّر', 'Active': 'نشط', 'Closed': 'مغلق',
    'Commercial licence': 'الرخصة التجارية', 'Commercial registration (CR)': 'السجل التجاري', 'Civil defence (CD)': 'الدفاع المدني', 'National address': 'العنوان الوطني', 'Industrial licence': 'الرخصة الصناعية',
    'Construction environmental permit': 'تصريح البيئة للإنشاء', 'Operational environmental permit': 'تصريح البيئة للتشغيل', 'Fire maintenance': 'صيانة الحريق', 'Fire maintenance contract': 'عقد صيانة الحريق',
    'Camera maintenance': 'صيانة الكاميرات', 'Camera maintenance contract': 'عقد صيانة الكاميرات', 'Cleaning': 'النظافة', 'Cleaning contract': 'عقد النظافة', 'Fire layout': 'مخطط الحريق', 'Sign board': 'اللوحة الإعلانية', 'Medical kit': 'حقيبة إسعاف',
    'Asset': 'الأصل', 'Asset Repair': 'إصلاح الأصول', 'Repairs': 'الإصلاحات', 'No assets': 'لا أصول', 'No submitted assets for the selected company.': 'لا أصول معتمدة للشركة المحددة.', 'Sold': 'مباع', 'Scrapped': 'مخرَّد', 'Submitted': 'معتمد', 'Draft': 'مسودة', 'Cancelled': 'ملغى',
    'Category': 'الفئة', 'Status': 'الحالة', 'Document': 'المستند', 'Expired': 'منتهٍ', 'Expiring': 'قارب على الانتهاء', 'Valid': 'ساري', ' valid · ': ' ساري · ', ' soon · ': ' قريبًا · ', 'No expiry dates': 'لا تواريخ انتهاء',
    'Start': 'البداية', 'End': 'النهاية', 'Pending': 'معلق', 'Paid': 'مدفوع', 'Unpaid': 'غير مدفوع', 'Pay': 'دفع', 'Receive': 'استلام', 'Multiple': 'متعدد', 'Unassigned': 'غير محدد', 'Unspecified': 'غير محدد', 'Company not set': 'الشركة غير محددة',
    ' · ends ': ' · ينتهي ', ' · due ': ' · الاستحقاق ', ' · paid ': ' · مدفوع ', ' · past end date but active: ': ' · تجاوز النهاية وما زال نشطًا: ', ' · expiring ≤ ': ' · ينتهي ≤ ',
    // inventory
    'Stock value by warehouse': 'قيمة المخزون حسب المستودع', 'Top warehouses · click a bar to filter the table': 'أعلى المستودعات · اضغط على عمود لتصفية الجدول', 'Stock health': 'سلامة المخزون', 'Items by condition': 'الأصناف حسب الحالة',
    'Stock ageing': 'أعمار المخزون', 'Stock Ageing': 'أعمار المخزون', 'Stock risks': 'مخاطر المخزون', 'Items in stock': 'أصناف في المخزون', 'Warehouses with stock': 'مستودعات بها مخزون', 'Top-10 concentration': 'تركّز أعلى 10',
    'Top 10 items hold ': 'أعلى 10 أصناف تمثل ', '% of stock value': '% من قيمة المخزون', 'Dead stock': 'مخزون راكد', 'Dead stock value': 'قيمة المخزون الراكد', 'Dead stock (> ': 'مخزون راكد (> ', ' idle > ': ' خامل > ',
    'Low stock': 'مخزون منخفض', 'Low stock: ': 'مخزون منخفض: ', 'Low': 'منخفض', 'Healthy': 'سليم', 'Dead': 'راكد', 'Negative': 'سالب', 'Negative stock': 'مخزون سالب', 'Shortage': 'عجز', 'No stock': 'لا مخزون', 'No stock.': 'لا مخزون.',
    'All stock conditions': 'كل حالات المخزون', 'Condition': 'الحالة', 'Item': 'الصنف', 'Item group': 'مجموعة الصنف', 'On hand': 'المتوفر', 'On hand ': 'المتوفر ', 'Qty': 'الكمية', 'Qty ': 'الكمية ', 'Reserved': 'محجوز', 'Projected': 'المتوقع', 'Projected qty': 'الكمية المتوقعة',
    'Incoming (ordered)': 'وارد (مطلوب)', 'Reorder level': 'حد إعادة الطلب', 'Reorder lvl': 'حد الطلب', 'Last moved': 'آخر حركة', 'Last moved ': 'آخر حركة ', 'Last moved: ': 'آخر حركة: ', 'Last movement': 'آخر حركة', 'No movement': 'بلا حركة', 'No movement recorded': 'لا حركة مسجلة',
    'Movement data unavailable': 'بيانات الحركة غير متاحة', 'Movement dates unavailable': 'تواريخ الحركة غير متاحة', 'Whs': 'مستودع', 'Val': 'القيمة', 'Bin': 'الرصيد', 'Stock Projected Qty': 'الكمية المتوقعة للمخزون', 'Stock Ledger Entry': 'قيد دفتر المخزون',
    'At / below reorder level': 'عند / تحت حد إعادة الطلب', 'Projected qty below zero': 'الكمية المتوقعة أقل من صفر', 'Needs a stock correction': 'يحتاج تصحيح مخزون', 'Post the missing receipt or correct with a stock reconciliation': 'سجّل الاستلام المفقود أو صحّح بتسوية مخزون',
    'Reserved / demanded quantity exceeds stock + incoming orders': 'الكمية المحجوزة/المطلوبة تتجاوز المخزون + الطلبات الواردة', 'Raise purchase requests': 'أنشئ طلبات شراء', ' will run short (projected qty < 0)': ' سينفد (الكمية المتوقعة < 0)',
    'Inventory · Stock position': 'المخزون · وضع المخزون', 'Inventory summary — ': 'ملخص المخزون — ', 'Inventory: stock value ': 'المخزون: قيمة المخزون ', 'Stock value: ': 'قيمة المخزون: ', 'Warehouse: ': 'المستودع: ', 'Inventory · short by ': 'المخزون · عجز بمقدار ',
    ' · low ': ' · منخفض ', ' · negative ': ' · سالب ', ' · shortage ': ' · عجز ', ' · Negative: ': ' · سالب: ', ' · Shortage: ': ' · عجز: ', ' shortage · ': ' عجز · ', ' negative': ' سالب', ' · qty ': ' · الكمية ', ' · reserved ': ' · محجوز ', ' · incoming ': ' · وارد ', ' · reorder level ': ' · حد الطلب ',
    ' stock items · value from Bin.stock_value · movement dates from Stock Ledger Entry': ' صنف مخزني · القيمة من Bin.stock_value · تواريخ الحركة من Stock Ledger Entry', ' (unavailable — dead-stock analysis hidden)': ' (غير متاح — تحليل المخزون الراكد مخفي)',
    'Revenue vs expenses could not be loaded': 'تعذر تحميل الإيرادات مقابل المصروفات', 'Movement dates could not be loaded': 'تعذر تحميل تواريخ الحركة', 'Use Refresh to retry.': 'استخدم «تحديث» لإعادة المحاولة.', 'Before ': 'قبل ', 'Some data could not be loaded:': 'تعذر تحميل بعض البيانات:',
    'Your role cannot read Stock Ledger Entry, so stock age cannot be calculated.': 'صلاحيتك لا تسمح بقراءة Stock Ledger Entry، لذا لا يمكن حساب عمر المخزون.', 'Aging cannot be tracked for these': 'لا يمكن تتبع العمر لهذه الأصناف',
    'No items in this category.': 'لا أصناف في هذه الفئة.', 'No stock value for the current filters.': 'لا قيمة مخزون للفلاتر الحالية.', 'Items': 'الأصناف', ' items / ': ' صنف / ', 'Bin (shortages)': 'الرصيد (العجز)', 'Short ': 'عجز ',
    // finance
    'Receivable & payable': 'المدينون والدائنون', 'Payable': 'الدائنون', 'Payable: ': 'الدائنون: ', 'Receivable: ': 'المدينون: ', 'Payables': 'الدائنون', 'Receivables': 'المدينون', 'Overdue payables': 'دائنون متأخرون', 'Overdue receivables': 'مدينون متأخرون',
    'Late payables': 'دائنون متأخرون', 'Late receivables': 'مدينون متأخرون', 'Receivables overdue > 90 days': 'مدينون متأخرون > 90 يومًا', 'Payables due in ': 'دائنون مستحقون خلال ', 'Due soon': 'مستحق قريبًا', 'Not yet due': 'لم يستحق بعد', 'Overdue': 'متأخر', 'Overdue only': 'المتأخر فقط',
    'Outstanding': 'المتبقي', 'Invoice total': 'إجمالي الفاتورة', 'Due date': 'تاريخ الاستحقاق', 'Posting date': 'تاريخ الترحيل', 'Days overdue': 'أيام التأخير', 'Party': 'الطرف', 'Supplier bill no': 'رقم فاتورة المورد', 'Type': 'النوع', 'Account': 'الحساب',
    'Sales Invoice': 'فاتورة مبيعات', 'Purchase Invoice': 'فاتورة مشتريات', 'Payment Entry': 'قيد دفع', 'GL Entry': 'قيد دفتر الأستاذ', 'GL Entry (cash balances)': 'قيد دفتر الأستاذ (أرصدة النقد)', 'Period Closing Voucher': 'قسيمة إقفال الفترة',
    'Account (bank / cash)': 'حساب (بنك / نقد)', 'Account (profit & loss)': 'حساب (أرباح وخسائر)', 'Bank': 'بنك', 'Cash': 'نقد', 'Cash & bank: ': 'النقد والبنك: ', 'Cash & bank ': 'النقد والبنك ', 'bank / cash account': 'حساب بنك / نقد', 'Cash flow': 'التدفق النقدي', 'Balance sheet': 'الميزانية',
    'Profit and Loss': 'الأرباح والخسائر', 'Income accounts': 'حسابات الدخل', 'Expense accounts': 'حسابات المصروفات', 'Performance · ': 'الأداء · ', 'Finance · Position today': 'المالية · الوضع اليوم', 'Finance summary — ': 'ملخص المالية — ', 'Finance · payable due ': 'المالية · دائنون مستحقون ',
    'Finance · receivable due ': 'المالية · مدينون مستحقون ', 'Finance: cash ': 'المالية: النقد ', 'Revenue · ': 'الإيرادات · ', 'Revenue: ': 'الإيرادات: ', ' · Expenses: ': ' · المصروفات: ', ' · Net profit: ': ' · صافي الربح: ', ' · expenses ': ' · المصروفات ', ' · net ': ' · الصافي ',
    ' — receivable ': ' — مدينون ', ' — received ': ' — مستلم ', ' — revenue ': ' — إيرادات ', ' · receivable ': ' · مدينون ', ') · net profit ': ') · صافي الربح ', ') · payable ': ') · دائنون ', ' (overdue ': ' (متأخر ', ' · chase or escalate': ' · تابع أو صعّد',
    '% margin': '% هامش', '% margin)': '% هامش)', '% of payable': '% من الدائنين', '% of receivable': '% من المدينين', '% settled': '% مسدد', '% of receivables sit with 5 customers': '% من المدينين لدى 5 عملاء', 'Largest: ': 'الأكبر: ',
    'Aging: ': 'العمر: ', '0–30 days': '0–30 يومًا', '1–30 days': '1–30 يومًا', '31–60 days': '31–60 يومًا', '61–90 days': '61–90 يومًا', '31–90 days': '31–90 يومًا', '91–180 days': '91–180 يومًا', '181–365 days': '181–365 يومًا', '> 180 days': '> 180 يومًا', '> 1 year': '> سنة',
    'No open receivables.': 'لا مدينين مفتوحين.', 'No open payables.': 'لا دائنين مفتوحين.', 'No open receivables or payables.': 'لا مدينين أو دائنين مفتوحين.', 'No overdue receivables.': 'لا مدينين متأخرين.', 'No overdue payables.': 'لا دائنين متأخرين.', 'No payables fall due in the next ': 'لا دائنين تستحق خلال ',
    'Nothing due': 'لا مستحقات', 'Nothing outstanding': 'لا متبقيات', 'Nothing to age for the current filters.': 'لا شيء لتحليل أعماره للفلاتر الحالية.', 'No bank / cash balances found.': 'لا أرصدة بنك / نقد.', 'No bank or cash account is overdrawn.': 'لا حساب بنك أو نقد مكشوف.', 'See Needs attention → Cash': 'راجع "يحتاج انتباه" ← النقد',
    'No income or expense postings in the last 12 months.': 'لا قيود دخل أو مصروفات في آخر 12 شهرًا.', 'No postings': 'لا قيود', 'No profit & loss postings in this period.': 'لا قيود أرباح وخسائر في هذه الفترة.', 'No payment entries in the last 12 months.': 'لا قيود دفع في آخر 12 شهرًا.', 'No payments': 'لا مدفوعات', 'Payment mode': 'طريقة الدفع',
    ' · from GL income & expense accounts': ' · من حسابات الدخل والمصروفات', 'Top customers': 'أعلى العملاء', 'Top suppliers': 'أعلى الموردين', 'Customer': 'العميل', 'Supplier': 'المورد',
    // general
    'Data checks': 'فحوصات البيانات', 'No data gaps found.': 'لا فجوات في البيانات.', 'No data': 'لا بيانات', 'Not available': 'غير متاح', 'Yes': 'نعم', 'No': 'لا', 'List': 'القائمة', 'Form': 'النموذج', 'Active, non-empty': 'نشط وغير فارغ', 'Still marked active': 'ما زال نشطًا',
    'No records found': 'لا سجلات', 'No records match the current dashboard filters.': 'لا سجلات تطابق فلاتر اللوحة الحالية.', 'Nothing loaded yet.': 'لم يتم تحميل شيء بعد.', 'Nothing matches the current filters.': 'لا نتائج للفلاتر الحالية.', 'Nothing needs attention for the current filters.': 'لا شيء يحتاج انتباه للفلاتر الحالية.',
    'Nothing to show for the current filters.': 'لا شيء لعرضه للفلاتر الحالية.', 'Try changing the filters.': 'جرّب تغيير الفلاتر.', 'Showing ': 'عرض ', 'Prev': 'السابق', 'Next': 'التالي', 'rows': 'صفوف', 'row': 'صف',
    'Some data could not be loaded': 'تعذر تحميل بعض البيانات', '. You may not have read permission for these DocTypes.': '. قد لا تملك صلاحية القراءة لهذه الأنواع.', 'Some data could not be loaded:': 'تعذر تحميل بعض البيانات:',
    ' days (+ ': ' يوم (+ ', 'Months': 'الأشهر',
    'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس', 'Apr': 'أبريل', 'May': 'مايو', 'Jun': 'يونيو', 'Jul': 'يوليو', 'Aug': 'أغسطس', 'Sep': 'سبتمبر', 'Oct': 'أكتوبر', 'Nov': 'نوفمبر', 'Dec': 'ديسمبر',
    'Confidential': 'سري', 'SAR': 'ر.س',
    // plurals / units (kept last — short words)
    ' days': ' يوم', ' day': ' يوم', ' late': ' تأخير', ' ago': ' مضت', ' invoices': ' فاتورة', ' invoice': ' فاتورة', ' instalments': ' أقساط', ' instalment': ' قسط', ' items': ' صنف', ' item': ' صنف',
    ' customers': ' عملاء', ' suppliers': ' موردين', ' accounts': ' حسابات', ' account': ' حساب', ' warehouses': ' مستودعات', ' warehouse': ' مستودع', ' facilities': ' منشآت', ' facility': ' منشأة', ' contracts': ' عقود', ' contract': ' عقد', ' assets': ' أصول', ' repairs': ' إصلاحات',
    ' SAR': ' ر.س', 'Active bank and cash accounts · GL balance': 'حسابات البنك والنقد النشطة · رصيد دفتر الأستاذ', ' active accounts': ' حسابات نشطة',
    ' open invoices': ' فاتورة مفتوحة', ' open bills': ' فاتورة مورد مفتوحة', ' records': ' سجل', ' lines': ' سطر', 'Open invoices': 'الفواتير المفتوحة', 'Open receivables': 'المدينون المفتوحون', 'Open payables': 'الدائنون المفتوحون',
    'Open invoices by days past due date · click a bar to drill in': 'الفواتير المفتوحة حسب أيام التأخر عن الاستحقاق · اضغط على عمود للتفصيل', 'Receivables and payables aging': 'أعمار المدينين والدائنين',
    'Net position': 'صافي المركز', 'Cash + receivable − payable': 'النقد + المدينون − الدائنون', 'Liquid funds plus what customers owe, less what is owed to suppliers.': 'السيولة مضافًا إليها مستحقات العملاء ومخصومًا منها المستحق للموردين.',
    'Collections, payments and cash': 'التحصيلات والمدفوعات والنقد', 'Payment entries · received vs paid · last 12 months': 'قيود الدفع · المستلم مقابل المدفوع · آخر 12 شهرًا',
    'Received': 'المستلم', 'Due': 'المستحق', 'Amount': 'المبلغ', 'Upcoming': 'القادم', 'Expiry': 'الانتهاء', 'Invoice': 'الفاتورة', 'Assets': 'الأصول', 'Gross cost': 'التكلفة الإجمالية', 'Net book value': 'صافي القيمة الدفترية',
    'Items that should be actioned': 'أصناف تحتاج إجراء', 'Licences & compliance': 'التراخيص والامتثال', 'Safety & services': 'السلامة والخدمات', 'Stock age (last movement)': 'عمر المخزون (آخر حركة)',
    'Stock value by days since the item last moved · click a bar to drill in': 'قيمة المخزون حسب الأيام منذ آخر حركة للصنف · اضغط على عمود للتفصيل', 'Top groups': 'أعلى المجموعات', 'Value by company': 'القيمة حسب الشركة', 'Value by item group': 'القيمة حسب مجموعة الصنف',
    'Via warehouse company': 'عبر شركة المستودع', 'Top items by value': 'أعلى الأصناف قيمة', 'Share of total stock value': 'النسبة من إجمالي قيمة المخزون', ' of total stock value': ' من إجمالي قيمة المخزون', 'Stock items': 'أصناف المخزون',
    'One row per item across warehouses · click a row for warehouse breakdown': 'صف لكل صنف عبر المستودعات · اضغط على صف لعرض التفصيل حسب المستودع', 'Top customers owing': 'أعلى العملاء مديونية', 'Top suppliers owed': 'أعلى الموردين استحقاقًا',
    'Cash & bank balances': 'أرصدة النقد والبنك', 'Net profit by company': 'صافي الربح حسب الشركة', 'Receivables and payables with an outstanding balance · click a row for details': 'المدينون والدائنون برصيد مستحق · اضغط على صف للتفاصيل',
    'Open invoices: submitted documents with outstanding amount > 0 (credit notes excluded) · revenue / expense from GL Entry (period closing vouchers excluded)': 'الفواتير المفتوحة: مستندات معتمدة بمبلغ مستحق > 0 (باستثناء إشعارات الدائن) · الإيرادات / المصروفات من قيود دفتر الأستاذ (باستثناء قسائم إقفال الفترة)',
    ' rent falls due in the next ': ' إيجار يستحق خلال الـ ', ' of rent instalments not marked paid': ' من أقساط الإيجار غير المسددة', ' instalments unpaid': ' أقساط غير مسددة', ' instalment unpaid': ' قسط غير مسدد', ' payable due within ': ' دائنون مستحقون خلال ',
    ' already overdue)': ' متأخر بالفعل)', ' due in ': ' مستحق خلال ', 'of which overdue': 'منها متأخر', ' at or below reorder level': ' عند حد إعادة الطلب أو أقل', ' with negative stock in a warehouse': ' برصيد سالب في مستودع', ' without movement for over ': ' بلا حركة لأكثر من ',
    ' with insurance expired or expiring ': ' بتأمين منتهٍ أو ينتهي ', ' asset': ' أصل', ' left': ' متبقٍ', 'Top items': 'أعلى الأصناف', 'Stock by': 'المخزون حسب', 'Part of': 'جزء من',
    'Ending ': 'تنتهي ', 'Ending within ': 'تنتهي خلال ', ' expired': ' منتهٍ', ' payable due ': ' دائنون مستحقون ', 'of total stock value': 'من إجمالي قيمة المخزون', 'Receivable & payable aging': 'أعمار المدينين والدائنين',
    '+ Receivable': '+ المدينون', '− Payable': '− الدائنون', 'Payable · ': 'دائنون · ', 'Receivable · ': 'مدينون · ', ' of which overdue': ' منها متأخر', '\u00a0SAR': ' ر.س', 'SAR ': 'ر.س ',
    'as of ': 'حتى ', 'Nos': 'وحدة', 'Pending repairs': 'إصلاحات معلقة', ' pending': ' معلق', 'Repairs pending': 'إصلاحات معلقة', 'Rent instalments': 'أقساط الإيجار',
    'Today': 'اليوم', 'today': 'اليوم', 'Yesterday': 'أمس', 'Tomorrow': 'غدًا', 'Due today': 'مستحق اليوم'
  };
  var LANG = 'en';
  var I18N = { re: null, map: null, exact: {}, txt: new WeakMap(), attr: new WeakMap(), obs: null, pending: false };
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function buildI18n() {
    // single plain words are translated only when they are the whole text (so item / account / customer names are never touched)
    I18N.exact = {}; I18N.map = {};
    Object.keys(AR_DICT).forEach(function (k) {
      if (/^[A-Za-z&]+$/.test(k)) I18N.exact[k] = AR_DICT[k]; else I18N.map[k] = AR_DICT[k];
    });
    var keys = Object.keys(I18N.map).sort(function (a, b) { return b.length - a.length; });
    I18N.re = new RegExp(keys.map(function (k) {
      var s = escRe(k);
      if (/^[A-Za-z]/.test(k)) s = '(?<![A-Za-z])' + s;
      if (/[A-Za-z]$/.test(k)) s += '(?![A-Za-z])';
      return s;
    }).join('|'), 'g');
  }
  function tr(s) {
    if (LANG !== 'ar' || !s) return s;
    if (!I18N.re) buildI18n();
    s = String(s);
    var t = s.trim();
    if (I18N.exact[t] != null) return s.replace(t, I18N.exact[t]);
    var MON = { Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل', May: 'مايو', Jun: 'يونيو', Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر' };
    s = s.replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g, function (m, d, mo, y) { return d + ' ' + MON[mo] + ' ' + y; })
      .replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{2})$/, function (m, mo, y) { return MON[mo] + ' ' + y; })
      .replace(/(^|\s)of (\d)/g, '$1من $2').replace(/\bin (\d+) days?\b/g, 'خلال $1 يومًا').replace(/\b(\d+) days? ago\b/g, 'منذ $1 يومًا');
    return s.replace(I18N.re, function (m) { return I18N.map[m]; });
  }
  function i18nNode(n) {
    var rec = I18N.txt.get(n);
    if (rec && n.data === rec.tr) { if (LANG !== 'ar') { n.data = rec.orig; I18N.txt.delete(n); } return; }
    if (LANG !== 'ar') return;
    var orig = n.data, t = tr(orig);
    I18N.txt.set(n, { orig: orig, tr: t });
    if (t !== orig) n.data = t;
  }
  var I18N_ATTRS = ['title', 'placeholder', 'aria-label'];
  function i18nEl(el) {
    I18N_ATTRS.forEach(function (a) {
      var v = el.getAttribute(a); if (v == null) return;
      var m = I18N.attr.get(el) || {}, rec = m[a];
      if (rec && v === rec.tr) { if (LANG !== 'ar') { el.setAttribute(a, rec.orig); delete m[a]; } return; }
      if (LANG !== 'ar') return;
      var t = tr(v); m[a] = { orig: v, tr: t }; I18N.attr.set(el, m);
      if (t !== v) el.setAttribute(a, t);
    });
  }
  function i18nWalk() {
    I18N.pending = false;
    if (I18N.obs) I18N.obs.disconnect();
    var w = document.createTreeWalker(root, 4 | 1, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) {
        var p = n.parentNode;
        if (p && (p.nodeName === 'STYLE' || p.nodeName === 'SCRIPT' || (p.closest && p.closest('[data-noi18n]')))) continue;
        i18nNode(n);
      } else if (!(n.closest && n.closest('[data-noi18n]'))) i18nEl(n);
    }
    if (I18N.obs) I18N.obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
  }
  function i18nSchedule() { if (!I18N.pending) { I18N.pending = true; setTimeout(i18nWalk, 0); } }
  function setLang(l, save) {
    LANG = l === 'ar' ? 'ar' : 'en';
    var el = $('#tld');
    el.setAttribute('dir', LANG === 'ar' ? 'rtl' : 'ltr');
    el.setAttribute('lang', LANG);
    el.dataset.lang = LANG;
    var b = $('#btnLang'); if (b) { b.textContent = LANG === 'ar' ? 'English' : 'العربية'; }
    if (save) { try { localStorage.setItem('fif-lang', LANG); } catch (e) { /* ignore */ } }
    if (!I18N.obs && typeof MutationObserver !== 'undefined') I18N.obs = new MutationObserver(i18nSchedule);
    i18nWalk();
  }

  initStatic();
  initTables();
  syncTheme();
  if (THEME_MODE === 'auto' && typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function () { if (root.host && !root.host.isConnected) { mo.disconnect(); return; } syncTheme(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] });
  }
  setWidthClass();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(setWidthClass).observe($('#tld'));
  else window.addEventListener('resize', setWidthClass);

  var savedTab = null;
  try { savedTab = localStorage.getItem('fif-tab'); } catch (e) { /* ignore */ }
  setTab(savedTab && TAB_LABELS[savedTab] ? savedTab : 'overview');
  var savedLang = null;
  try { savedLang = localStorage.getItem('fif-lang'); } catch (e) { /* ignore */ }
  if (!savedLang && window.frappe && frappe.boot && /^ar/.test(frappe.boot.lang || '')) savedLang = 'ar';
  setLang(savedLang === 'ar' ? 'ar' : 'en', false);
})();