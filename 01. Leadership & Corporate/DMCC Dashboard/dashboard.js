/* global root_element */
// Frappe Custom HTML Block. External credentials are held by dmcc_dashboard_proxy.
const API = '/api/method/dmcc_dashboard_proxy';

const $ = (s) => root_element.querySelector(s);
const NAMES = ['Invoice', 'Project', 'Quotation', 'RFQ', 'PurchaseOrder', 'DeliveryNote', 'ReturnNote',
  'ManpowerTimesheet', 'Manpower', 'PurchasePO', 'PurchaseInvoice', 'Equipment', 'Customer', 'Salesperson', 'RentalAdjustment'];
const MASTER = ['Project', 'Manpower', 'Equipment', 'Customer', 'Salesperson'];
const TABS = ['Overview', 'Rental Monitoring', 'Sales', 'Finance', 'Projects', 'Manpower', 'Purchases', 'Equipment'];
const PAL = ['#eab308', '#111827', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#f97316', '#64748b'];
let RAW = {};
let F = {};
let tab = 'Overview';

async function fetchAll(entity) {
  let skip = 0;
  let all = [];
  while (true) {
    const r = await fetch(`${API}?entity=${entity}&limit=500&skip=${skip}`, { credentials:'same-origin', headers:{Accept:'application/json'} });
    const payload=await r.json();
    if(!r.ok||payload.exc)throw new Error('DMCC server connection unavailable');
    const j=payload.message;
    if (!j.data) throw new Error(j.error || 'API error');
    all = all.concat(j.data);
    skip += j.data.length;
    if (!j.data.length || skip >= j.total) break;
    if(skip>100000)throw new Error('DMCC source is too large; complete totals unavailable');
  }
  return all;
}

const num = (v) => Number(v) || 0;
const money = (v) => num(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
const sum = (a, f) => a.reduce((s, x) => s + num(f(x)), 0);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateOf = (x) => (x.invoice_date || x.delivery_date || x.return_date || x.date || x.created_date || '').slice(0, 10);
const month = (x) => dateOf(x).slice(0, 7);
const group = (a, k, f) => {
  const m = {};
  a.forEach((x) => { const key = k(x) || '-'; m[key] = (m[key] || 0) + (f ? num(f(x)) : 1); });
  return Object.entries(m).sort((x, y) => y[1] - x[1]);
};
const byMonth = (a, f) => group(a, month, f).filter((e) => e[0] !== '-').sort((x, y) => x[0].localeCompare(y[0])).slice(-12);

const kpi = (l, v, s = '') => `<div class="erp-kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
const card = (t, body) => `<div class="erp-card"><h4>${t}</h4>${body}</div>`;
const bars = (entries, isMoney = false, max = 10) => {
  const e = entries.slice(0, max);
  if (!e.length) return '<div class="erp-empty">No data</div>';
  const top = Math.max(...e.map((x) => x[1])) || 1;
  return e.map(([n, v]) => `<div class="erp-row"><div class="n" title="${esc(n)}">${esc(n)}</div><div class="erp-track"><div class="erp-fill" style="width:${(v / top) * 100}%"></div></div><div>${isMoney ? money(v) : v}</div></div>`).join('');
};
const donut = (entries, colors = PAL, max = 8) => {
  const e = entries.filter((x) => x[1] > 0).slice(0, max);
  const t = e.reduce((s, x) => s + x[1], 0);
  if (!t) return '<div class="erp-empty">No data</div>';
  let acc = 0;
  const stops = e.map(([, v], i) => { const a = (acc / t) * 100; acc += v; return `${colors[i % colors.length]} ${a}% ${(acc / t) * 100}%`; }).join(',');
  const legend = e.map(([n, v], i) => `<div><i style="background:${colors[i % colors.length]}"></i>${esc(n)} <b>${money(v)}</b></div>`).join('');
  return `<div class="erp-donut-wrap"><div class="erp-donut" style="background:conic-gradient(${stops})"><div class="hole"><b>${money(t)}</b><span>total</span></div></div><div class="erp-legend">${legend}</div></div>`;
};
const cols = (entries, isMoney = false) => {
  if (!entries.length) return '<div class="erp-empty">No data</div>';
  const top = Math.max(...entries.map((x) => x[1])) || 1;
  return `<div class="erp-cols">${entries.map(([n, v]) => `<div class="erp-col"><span class="cv">${isMoney ? money(v) : v}</span><div class="cw"><div class="cb" style="height:${(v / top) * 100}%"></div></div><span class="cl">${esc(String(n).length === 7 ? String(n).slice(2) : n)}</span></div>`).join('')}</div>`;
};
const pbar = (pct, color = '#eab308') => `<div class="erp-track"><div class="erp-fill" style="width:${Math.min(100, Math.max(0, pct))}%;background:${color}"></div></div>`;
const table = (head, rows) => rows.length
  ? `<table class="erp-table"><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`
  : '<div class="erp-empty">No data</div>';

// Status breakdown table: always lists the given statuses (even at 0) plus an "Other" row.
const statTable = (a, statuses) => {
  const t = a.length || 1;
  const rows = statuses.map((s) => {
    const r = a.filter((x) => String(x.status).toLowerCase() === s);
    return [`<span style="text-transform:capitalize">${s}</span>`, `<b>${r.length}</b>`, money(sum(r, (x) => x.total_amount)), Math.round((r.length / t) * 100) + '%'];
  });
  const other = a.filter((x) => !statuses.includes(String(x.status).toLowerCase()));
  rows.push(['Other', `<b>${other.length}</b>`, money(sum(other, (x) => x.total_amount)), Math.round((other.length / t) * 100) + '%']);
  return `<div style="margin-top:12px">${table(['Status', 'Count', 'Value (SAR)', 'Share'], rows)}</div>`;
};
const QSTATUS = ['sent', 'converted', 'draft', 'accepted'];

const today = () => new Date().toISOString().slice(0, 10);
const openInvoices = () => F.Invoice.filter((i) => !['draft', 'cancelled', 'paid'].includes(i.status) && num(i.balance_due) > 0);
const billed = () => F.Invoice.filter((i) => !['draft', 'cancelled'].includes(i.status));
const isOverdue = (i) => i.due_date && i.due_date < today();

function applyFilter() {
  const from = $('#f-from').value;
  const to = $('#f-to').value;
  F = {};
  NAMES.forEach((n) => {
    F[n] = MASTER.includes(n) ? RAW[n] : RAW[n].filter((x) => {
      const d = dateOf(x);
      return (!from || d >= from) && (!to || d <= to);
    });
  });
}

const views = {
  Overview() {
    const inv = billed();
    const rentalStates = ['confirmed', 'partially_delivered', 'delivered', 'in_rental', 'partially_returned'];
    return `<div class="erp-kpis">
      ${kpi('Revenue billed (SAR)', money(sum(inv, (i) => i.total_amount)), `${inv.length} invoices`)}
      ${kpi('Collected (SAR)', money(sum(inv, (i) => i.amount_paid)))}
      ${kpi('Outstanding (SAR)', money(sum(openInvoices(), (i) => i.balance_due)), `${openInvoices().length} open invoices`)}
      ${kpi('Overdue invoices', openInvoices().filter(isOverdue).length)}
      ${kpi('Active projects', RAW.Project.filter((p) => p.status === 'active').length, `${RAW.Project.length} total`)}
      ${kpi('Active sales orders', F.PurchaseOrder.filter((p) => rentalStates.includes(p.status)).length)}
      ${kpi('Open quotations', F.Quotation.filter((q) => ['draft', 'pending_approval', 'approved', 'sent'].includes(q.status)).length)}
      ${kpi('Customers', RAW.Customer.length)}
    </div><div class="erp-grid">
      ${card('Revenue by month (SAR)', cols(byMonth(inv, (i) => i.total_amount), true))}
      ${card('Top customers by revenue', bars(group(inv, (i) => i.customer_name, (i) => i.total_amount), true))}
      ${card('Invoice status mix', donut(group(F.Invoice, (i) => i.status)))}
      ${card('Quotation status mix', donut(group(F.Quotation, (q) => q.status)) + statTable(F.Quotation, QSTATUS))}
    </div>`;
  },
  'Rental Monitoring'() {
    const live = ['confirmed', 'delivered', 'in_rental', 'partially_delivered', 'partially_returned'];
    const rets = RAW.ReturnNote.filter((r) => r.status === 'confirmed');
    const now = Date.now();
    const rows = RAW.PurchaseOrder.filter((p) => live.includes(p.status)).map((p) => {
      const end = p.rental_end_date ? new Date(p.rental_end_date).getTime() : null;
      const start = p.rental_start_date ? new Date(p.rental_start_date).getTime() : null;
      const left = end === null ? null : Math.trunc((end - now) / 864e5);
      const total = start && end ? Math.trunc((end - start) / 864e5) : 0;
      const elapsed = start ? Math.trunc((now - start) / 864e5) : 0;
      const ordered = sum(p.items || [], (i) => i.quantity_ordered);
      const delivered = sum(p.items || [], (i) => i.quantity_delivered);
      const returned = sum(rets.filter((r) => r.po_id === p.id), (r) => sum(r.items || [], (i) => i.quantity_returned));
      const urgency = end !== null && end < now ? 'Overdue' : left !== null && left <= 7 ? 'Due soon' : 'On track';
      return { p, left, total, elapsed, ordered, delivered, returned, onRent: delivered - returned, urgency };
    }).sort((a, b) => (a.left ?? 9e9) - (b.left ?? 9e9));
    const cnt = (u) => rows.filter((r) => r.urgency === u).length;
    const UC = { 'Overdue': '#ef4444', 'Due soon': '#f59e0b', 'On track': '#10b981' };
    const BC = { 'Overdue': 'red', 'Due soon': 'amber', 'On track': 'green' };
    const adj = RAW.RentalAdjustment;
    const endMonths = group(rows.filter((r) => r.p.rental_end_date), (r) => r.p.rental_end_date.slice(0, 7))
      .sort((x, y) => x[0].localeCompare(y[0])).slice(0, 12);
    const totDel = sum(rows, (r) => r.delivered);
    const totRet = sum(rows, (r) => r.returned);
    const trs = rows.map((r) => {
      const timePct = r.total > 0 ? (r.elapsed / r.total) * 100 : 0;
      const retPct = r.delivered > 0 ? (r.returned / r.delivered) * 100 : 0;
      const label = r.left === null ? 'No end date' : r.left < 0 ? `Overdue ${Math.abs(r.left)}d` : `${r.left}d left`;
      return [esc(r.p.po_number), `${esc(r.p.customer_name)}<div class="erp-empty">${esc(r.p.project_name)}</div>`, esc(r.p.status),
        `${esc(r.p.rental_start_date || '-')} to ${esc(r.p.rental_end_date || '-')}`,
        `<span class="erp-badge ${BC[r.urgency]}">${label}</span>`,
        pbar(timePct, UC[r.urgency]), r.ordered, `<b>${r.onRent}</b>`, r.returned, pbar(retPct, '#10b981')];
    });
    return `<div class="erp-kpis">
      <div class="erp-kpi"><div class="l">Total active</div><div class="v">${rows.length}</div></div>
      <div class="erp-kpi red"><div class="l">Overdue</div><div class="v">${cnt('Overdue')}</div></div>
      <div class="erp-kpi amber"><div class="l">Due soon (7 days)</div><div class="v">${cnt('Due soon')}</div></div>
      <div class="erp-kpi green"><div class="l">On track</div><div class="v">${cnt('On track')}</div></div>
      ${kpi('Units on rent', money(sum(rows, (r) => r.onRent)), `${money(totRet)} returned of ${money(totDel)} delivered`)}
      ${kpi('Pending adjustments', adj.filter((a) => a.status === 'pending').length, `${adj.length} total`)}
    </div><div class="erp-grid">
      ${card('Rentals by urgency', donut(['Overdue', 'Due soon', 'On track'].map((u) => [u, cnt(u)]), ['#ef4444', '#f59e0b', '#10b981']))}
      ${card('Rentals ending by month', cols(endMonths))}
      ${card('Units on rent by customer', bars(group(rows, (r) => r.p.customer_name, (r) => r.onRent)))}
      ${card('Rentals by order status', donut(group(rows, (r) => r.p.status)))}
      ${card('Fleet return progress', pbar(totDel ? (totRet / totDel) * 100 : 0, '#10b981') + `<div class="erp-empty" style="margin-top:6px">${totDel ? Math.round((totRet / totDel) * 100) : 0}% of delivered units returned</div>`)}
      ${card('Adjustments by type', donut(group(adj, (a) => a.adjustment_type)))}
    </div><div class="erp-card" style="margin-top:14px"><h4>Active rentals (most urgent first)</h4>
      ${table(['PO', 'Customer', 'Status', 'Period', 'Urgency', 'Time used', 'Ordered', 'On rent', 'Returned', 'Return %'], trs)}</div>`;
  },
  Sales() {
    const q = F.Quotation;
    return `<div class="erp-kpis">
      ${kpi('RFQs', F.RFQ.length)}
      ${kpi('Quotations', q.length, `${money(sum(q, (x) => x.total_amount))} SAR`)}
      ${kpi('Sales orders', F.PurchaseOrder.length, `${money(sum(F.PurchaseOrder, (x) => x.total_amount))} SAR`)}
      ${kpi('Quote to order', q.length ? Math.round((F.PurchaseOrder.length / q.length) * 100) + '%' : '-')}
    </div><div class="erp-grid">
      ${card('Pipeline funnel', bars([['RFQs', F.RFQ.length], ['Quotations', q.length], ['Sales orders', F.PurchaseOrder.length]]))}
      ${card('Quotations by status', donut(group(q, (x) => x.status)) + statTable(q, QSTATUS))}
      ${card('Quotation value by salesperson (SAR)', bars(group(q, (x) => x.salesperson_name, (x) => x.total_amount), true))}
      ${card('Quotations by month', cols(byMonth(q)))}
      ${card('RFQs by status', donut(group(F.RFQ, (x) => x.status)))}
      ${card('Delivery and return notes', bars([['Delivery notes', F.DeliveryNote.length], ['Return notes', F.ReturnNote.length]]))}
    </div>`;
  },
  Finance() {
    const open = openInvoices();
    const buckets = { 'Not yet due': 0, '1-30 days': 0, '31-60 days': 0, '61-90 days': 0, '90+ days': 0 };
    open.forEach((i) => {
      const d = i.due_date ? Math.floor((Date.now() - new Date(i.due_date)) / 864e5) : 0;
      const k = d <= 0 ? 'Not yet due' : d <= 30 ? '1-30 days' : d <= 60 ? '31-60 days' : d <= 90 ? '61-90 days' : '90+ days';
      buckets[k] += num(i.balance_due);
    });
    return `<div class="erp-kpis">
      ${kpi('Billed (SAR)', money(sum(billed(), (i) => i.total_amount)))}
      ${kpi('Collected (SAR)', money(sum(billed(), (i) => i.amount_paid)))}
      ${kpi('Outstanding (SAR)', money(sum(open, (i) => i.balance_due)))}
      ${kpi('VAT billed (SAR)', money(sum(billed(), (i) => i.tax_amount)))}
    </div><div class="erp-grid">
      ${card('Receivables aging (SAR)', cols(Object.entries(buckets), true))}
      ${card('Invoices by status', donut(group(F.Invoice, (i) => i.status)))}
      ${card('Outstanding by customer (SAR)', bars(group(open, (i) => i.customer_name, (i) => i.balance_due), true))}
      ${card('Collected by month (SAR)', cols(byMonth(billed(), (i) => i.amount_paid), true))}
    </div>`;
  },
  Projects() {
    const rows = RAW.Project.map((p) => {
      const profit = num(p.invoiced_amount) - num(p.expenses_amount);
      return [esc(p.project_number), esc(p.project_name), esc(p.customer_name), esc(p.status),
        money(p.budget), money(p.invoiced_amount), money(p.expenses_amount), money(p.balance_amount),
        `<span class="${profit < 0 ? 'erp-neg' : 'erp-pos'}">${money(profit)}</span>`];
    });
    return `<div class="erp-kpis">
      ${kpi('Projects', RAW.Project.length)}
      ${kpi('Active', RAW.Project.filter((p) => p.status === 'active').length)}
      ${kpi('Total budget (SAR)', money(sum(RAW.Project, (p) => p.budget)))}
      ${kpi('Invoiced (SAR)', money(sum(RAW.Project, (p) => p.invoiced_amount)))}
      ${kpi('Expenses (SAR)', money(sum(RAW.Project, (p) => p.expenses_amount)))}
    </div><div class="erp-grid">
      ${card('Projects by status', donut(group(RAW.Project, (p) => p.status)))}
      ${card('Top projects by invoiced (SAR)', bars(group(RAW.Project, (p) => p.project_name, (p) => p.invoiced_amount), true))}
    </div><div class="erp-card" style="margin-top:14px"><h4>All projects</h4>
      ${table(['No.', 'Project', 'Customer', 'Status', 'Budget', 'Invoiced', 'Expenses', 'Balance', 'Profit'], rows)}</div>`;
  },
  Manpower() {
    const ts = F.ManpowerTimesheet;
    const people = [];
    ts.forEach((t) => (t.entries || []).forEach((e) => people.push(e)));
    const active = RAW.Manpower.filter((m) => m.status === 'active');
    return `<div class="erp-kpis">
      ${kpi('Active manpower', active.length, `${RAW.Manpower.length} total`)}
      ${kpi('Timesheets', ts.length)}
      ${kpi('Total hours', money(sum(ts, (t) => t.total_hours)))}
      ${kpi('Pending approval', ts.filter((t) => t.status !== 'approved').length)}
    </div><div class="erp-grid">
      ${card('Hours by project', bars(group(ts, (t) => t.project_name, (t) => t.total_hours), false))}
      ${card('Hours by person', bars(group(people, (e) => e.manpower_name, (e) => e.working_hours)))}
      ${card('Hours by month', cols(byMonth(ts, (t) => t.total_hours)))}
      ${card('Headcount by trade', donut(group(active, (m) => m.trade || m.designation)))}
      ${card('Timesheets by status', donut(group(ts, (t) => t.status)))}
    </div>`;
  },
  Purchases() {
    const po = F.PurchasePO;
    const unpaid = F.PurchaseInvoice.filter((i) => !['paid', 'cancelled', 'draft'].includes(i.status));
    return `<div class="erp-kpis">
      ${kpi('Vendor POs', po.length, `${money(sum(po, (p) => p.total_amount))} SAR`)}
      ${kpi('Vendor invoices', F.PurchaseInvoice.length, `${money(sum(F.PurchaseInvoice, (i) => i.total_amount))} SAR`)}
      ${kpi('Unpaid vendor invoices', unpaid.length, `${money(sum(unpaid, (i) => i.balance_due ?? i.total_amount))} SAR`)}
      ${kpi('Vendor DNs', F.PurchaseDN?.length ?? '-')}
    </div><div class="erp-grid">
      ${card('Spend by vendor (SAR)', bars(group(po, (p) => p.vendor_name, (p) => p.total_amount), true))}
      ${card('Vendor POs by status', donut(group(po, (p) => p.status)))}
      ${card('Vendor spend by month (SAR)', cols(byMonth(po, (p) => p.total_amount), true))}
      ${card('Vendor invoices by status', donut(group(F.PurchaseInvoice, (i) => i.status)))}
    </div>`;
  },
  Equipment() {
    const eq = RAW.Equipment;
    const rows = eq.map((e) => {
      const low = num(e.available_quantity) <= 0;
      return [esc(e.code), esc(e.name), esc(e.category), esc(e.status),
        `<span class="${low ? 'erp-neg' : ''}">${num(e.available_quantity)}</span>`, num(e.total_quantity),
        num(e.total_quantity) - num(e.available_quantity)];
    });
    return `<div class="erp-kpis">
      ${kpi('Equipment items', eq.length)}
      ${kpi('Total units', money(sum(eq, (e) => e.total_quantity)))}
      ${kpi('Available units', money(sum(eq, (e) => e.available_quantity)))}
      ${kpi('Out on rental', money(sum(eq, (e) => num(e.total_quantity) - num(e.available_quantity))))}
      ${kpi('Out of stock items', eq.filter((e) => num(e.available_quantity) <= 0).length)}
    </div><div class="erp-grid">
      ${card('Units by category', donut(group(eq, (e) => e.category, (e) => e.total_quantity)))}
      ${card('Availability', donut([['Available', sum(eq, (e) => e.available_quantity)], ['Out on rental', sum(eq, (e) => num(e.total_quantity) - num(e.available_quantity))]], ['#10b981', '#eab308']))}
      ${card('Most rented (units out)', bars(group(eq, (e) => e.name, (e) => num(e.total_quantity) - num(e.available_quantity))))}
    </div><div class="erp-card" style="margin-top:14px"><h4>Stock</h4>
      ${table(['Code', 'Name', 'Category', 'Status', 'Available', 'Total', 'Out'], rows)}</div>`;
  },
};

function render() {
  $('#tabs').innerHTML = TABS.map((t) => `<div class="erp-tab ${t === tab ? 'on' : ''}" data-tab="${t}">${t}</div>`).join('');
  $('#view').innerHTML = views[tab]();
}

async function load() {
  $('#view').innerHTML = 'Loading data...';
  try {
    const res = await Promise.all(NAMES.map(fetchAll));
    NAMES.forEach((n, i) => { RAW[n] = res[i]; });
    applyFilter();
    render();
  } catch (e) {
    $('#view').innerHTML = `<div class="erp-neg">Could not load data: ${esc(e.message)}</div>`;
  }
}

$('#tabs').addEventListener('click', (e) => {
  const t = e.target.getAttribute('data-tab');
  if (t) { tab = t; render(); }
});
$('#f-apply').addEventListener('click', () => { applyFilter(); render(); });
$('#f-reload').addEventListener('click', load);
load();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */

/* ==== DM language v1 · generated by tools/erp/shell/i18n.py ==== */
;(function () {
  var root = typeof root_element !== 'undefined' ? root_element : document;
  var AR = {"API error": "خطأ في واجهة البرمجة", "Active": "نشط", "Active manpower": "القوى العاملة النشطة", "Active projects": "المشاريع النشطة", "Active rentals (most urgent first)": "الإيجارات النشطة (الأكثر إلحاحًا أولًا)", "Active sales orders": "أوامر البيع النشطة", "Adjustments by type": "التسويات حسب النوع", "All": "الكل", "All projects": "كل المشاريع", "Apply": "تطبيق", "Availability": "التوفر", "Available": "متاح", "Available units": "الوحدات المتاحة", "Balance": "الرصيد", "Billed (SAR)": "المفوتر (ريال)", "Budget": "الميزانية", "Category": "الفئة", "Code": "الرمز", "Collected (SAR)": "المحصّل (ريال)", "Collected by month (SAR)": "المحصّل حسب الشهر (ريال)", "Could not load data:": "تعذر تحميل البيانات:", "Count": "العدد", "Custom": "مخصص", "Customer": "العميل", "Customers": "العملاء", "DMCC server connection unavailable": "الاتصال بخادم DMCC غير متاح", "Date": "التاريخ", "Delivery and return notes": "إشعارات التسليم والإرجاع", "Delivery notes": "إشعارات التسليم", "Due soon": "يستحق قريبًا", "Due soon (7 days)": "يستحق قريبًا (7 أيام)", "Equipment": "المعدات", "Equipment items": "بنود المعدات", "Expenses": "المصروفات", "Expenses (SAR)": "المصروفات (ريال)", "Finance": "المالية", "Fleet return progress": "تقدم إرجاع الأسطول", "From": "من", "Headcount by trade": "عدد العمالة حسب المهنة", "Hours": "الساعات", "Hours by month": "الساعات حسب الشهر", "Hours by person": "الساعات حسب الشخص", "Hours by project": "الساعات حسب المشروع", "Invoice": "الفاتورة", "Invoice status mix": "توزيع حالات الفواتير", "Invoiced": "المفوتر", "Invoiced (SAR)": "المفوتر (ريال)", "Invoices by status": "الفواتير حسب الحالة", "Loading": "تحميل", "Loading data...": "جارٍ تحميل البيانات...", "Loading...": "جارٍ التحميل...", "Manpower": "القوى العاملة", "Most rented (units out)": "الأكثر تأجيرًا (الوحدات المؤجرة)", "Name": "الاسم", "No": "لا", "No data": "لا توجد بيانات", "No end date": "بلا تاريخ نهاية", "No.": "رقم", "Not yet due": "لم يستحق بعد", "Note": "ملاحظة", "On rent": "مؤجر", "On track": "على المسار", "Open quotations": "عروض الأسعار المفتوحة", "Ordered": "تم الطلب", "Other": "أخرى", "Out": "خارج", "Out of stock items": "أصناف نفدت من المخزون", "Out on rental": "مؤجر حاليًا", "Outstanding (SAR)": "المستحق (ريال)", "Outstanding by customer (SAR)": "المستحق حسب العميل (ريال)", "Overdue": "متأخر", "Overdue invoices": "فواتير متأخرة", "Overview": "نظرة عامة", "Pending": "معلق", "Pending adjustments": "تسويات معلقة", "Pending approval": "بانتظار الاعتماد", "Period": "الفترة", "Pipeline funnel": "قمع خط المبيعات", "Profit": "الربح", "Project": "المشروع", "Projects": "المشاريع", "Projects by status": "المشاريع حسب الحالة", "Purchases": "المشتريات", "Quotation": "عرض السعر", "Quotation status mix": "توزيع حالات عروض الأسعار", "Quotation value by salesperson (SAR)": "قيمة عروض الأسعار حسب المندوب (ريال)", "Quotations": "عروض الأسعار", "Quotations by month": "عروض الأسعار حسب الشهر", "Quotations by status": "عروض الأسعار حسب الحالة", "Quote to order": "من عرض سعر إلى أمر", "RFQs": "طلبات عروض الأسعار", "RFQs by status": "طلبات عروض الأسعار حسب الحالة", "Receivables aging (SAR)": "أعمار الذمم المدينة (ريال)", "Reload data": "إعادة تحميل البيانات", "Rental Monitoring": "مراقبة الإيجارات", "Rentals by order status": "الإيجارات حسب حالة الأمر", "Rentals by urgency": "الإيجارات حسب الإلحاح", "Rentals ending by month": "الإيجارات المنتهية حسب الشهر", "Return %": "نسبة الإرجاع", "Return notes": "إشعارات الإرجاع", "Returned": "مُرجع", "Rev": "مراجعة", "Revenue billed (SAR)": "الإيرادات المفوترة (ريال)", "Revenue by month (SAR)": "الإيرادات حسب الشهر (ريال)", "Sales": "المبيعات", "Sales orders": "أوامر البيع", "Salesperson": "مندوب المبيعات", "Share": "مشاركة", "Spend by vendor (SAR)": "الإنفاق حسب المورد (ريال)", "Status": "الحالة", "Stock": "المخزون", "Time used": "الوقت المستغرق", "Timesheets": "جداول الوقت", "Timesheets by status": "جداول الوقت حسب الحالة", "To": "إلى", "Top customers by revenue": "أعلى العملاء حسب الإيرادات", "Top projects by invoiced (SAR)": "أعلى المشاريع حسب المفوتر (ريال)", "Total": "الإجمالي", "Total active": "إجمالي النشط", "Total budget (SAR)": "إجمالي الميزانية (ريال)", "Total hours": "إجمالي الساعات", "Total units": "إجمالي الوحدات", "Units by category": "الوحدات حسب الفئة", "Units on rent": "الوحدات المؤجرة", "Units on rent by customer": "الوحدات المؤجرة حسب العميل", "Unpaid vendor invoices": "فواتير موردين غير مدفوعة", "Urgency": "الإلحاح", "VAT billed (SAR)": "ضريبة القيمة المضافة المفوترة (ريال)", "Value (SAR)": "القيمة (ريال)", "Vendor DNs": "إشعارات تسليم الموردين", "Vendor POs": "أوامر شراء الموردين", "Vendor POs by status": "أوامر شراء الموردين حسب الحالة", "Vendor invoices": "فواتير الموردين", "Vendor invoices by status": "فواتير الموردين حسب الحالة", "Vendor spend by month (SAR)": "الإنفاق على الموردين حسب الشهر (ريال)", "to": "إلى"}, SEL = ".erp", SLOT = ".erp-bar", KEY = 'dms-lang', ATTRS = ['placeholder', 'title', 'aria-label'];
  var lang = 'en'; try { lang = localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { /* storage blocked */ }
  var orig = new WeakMap(), busy = false, timer = 0;
  function host() { return root.querySelector(SEL); }
  function has(k) { return !!k && Object.prototype.hasOwnProperty.call(AR, k); }
  function text(h) {
    var w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var p = n.parentElement; if (!p || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(p.tagName) || p.closest('.dms-lang-btn')) continue;
      if (lang === 'ar') { var t = n.nodeValue.trim(), m = t.match(/^([^A-Za-z0-9(]*)(.*?)([\s:.…·-]*)$/), k = has(t) ? t : (m && has(m[2]) ? m[2] : '');
        if (k) { if (!orig.has(n)) orig.set(n, n.nodeValue); n.nodeValue = n.nodeValue.replace(k, AR[k]); } }
      else if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); }
    }
    h.querySelectorAll('[placeholder],[title],[aria-label]').forEach(function (e) {
      ATTRS.forEach(function (a) {
        var v = e.getAttribute(a), k = 'data-dms-' + a; if (v == null) return;
        if (lang === 'ar') { var t = v.trim(); if (Object.prototype.hasOwnProperty.call(AR, t)) { if (!e.hasAttribute(k)) e.setAttribute(k, v); e.setAttribute(a, AR[t]); } }
        else if (e.hasAttribute(k)) { e.setAttribute(a, e.getAttribute(k)); e.removeAttribute(k); }
      });
    });
  }
  function button(h) {
    var slot = SLOT === '&' ? h : h.querySelector(SLOT); if (!slot) return;
    var b = slot.querySelector('.dms-lang-btn');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'dms-lang-btn';
      b.addEventListener('click', function () { lang = lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem(KEY, lang); } catch (e) { /* optional */ } apply(); });
      var first = slot.querySelector(':scope > button, :scope > a, :scope > div > button'); first ? first.parentNode.insertBefore(b, first) : slot.appendChild(b);
    }
    b.textContent = lang === 'ar' ? 'English' : 'العربية'; b.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'); b.lang = lang === 'ar' ? 'en' : 'ar';
  }
  function apply() {
    var h = host(); if (!h) return;
    busy = true;
    try { button(h); text(h); h.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr'); h.setAttribute('lang', lang); } finally { mo.takeRecords(); busy = false; }
  }
  var mo = new MutationObserver(function () { if (busy) return; clearTimeout(timer); timer = setTimeout(apply, 25); });
  mo.observe(root === document ? (document.body || document.documentElement) : root, { childList: true, subtree: true, characterData: false });
  apply();
})();
/* ==== end DM language v1 ==== */
