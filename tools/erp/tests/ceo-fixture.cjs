/* Synthetic CEO Command Centre API payloads (no live ERP records), shared by the browser test and the speed bench.
   Rows are generated once; overview / department / actions are derived from them the same way the API's
   summarize() and dispatcher do, so totals in the UI can be checked against figures computed here. */
const TODAY = '2026-11-17', HORIZON = '2026-11-24';
const DEPTS = [['sales', 'Sales'], ['procurement', 'Procurement'], ['finance', 'Finance'], ['people', 'People & Admin'], ['projects', 'Projects'], ['operations', 'Operations'],
  ['manufacturing', 'Manufacturing'], ['it', 'IT & Assets'], ['legal', 'Legal & Compliance'], ['dmcc', 'DMCC']];
const GROUPS = ['decision', 'escalation', 'followup', 'verification'], SEV_RANK = { critical: 0, overdue: 1, due_soon: 2, pending: 3, verify: 4 }, GROUP_RANK = { decision: 0, escalation: 1, followup: 2, verification: 3 };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const r = rng(11), pick = a => a[Math.floor(r() * a.length)];
const PEOPLE = ['Ahmed Saleh', 'Sara Qahtani', 'Omar Haddad', 'Lina Farouk', 'Khalid Nasser', 'Rana Aziz', 'Faisal Otaibi'];
const COS = [['Alpha Contracting', 'SAR'], ['Alpha Trading', 'SAR'], ['Alpha Gulf FZE', 'AED']];
const SRC = {
  sales: [['Sales Order', 'Planned delivery date passed; 40% delivered.', 'delivery_overdue'], ['Quotation', 'Quotation validity ends soon with no decision.', 'validity'], ['Lead Allocation', 'Lead follow-up date has passed.', 'followup_overdue']],
  procurement: [['Purchase Order', 'Expected receipt date passed; 20% received.', 'receipt_overdue'], ['Material Request', 'Required-by date passed; 0% ordered.', 'order_overdue']],
  finance: [['Sales Invoice', 'Invoice overdue beyond the collection follow-up threshold.', 'ar_overdue'], ['Customer', 'Outstanding balance above the approved credit limit.', 'credit_breach'], ['Purchase Invoice', 'Supplier invoice past due and not on hold.', 'ap_overdue']],
  people: [['Employee Vacation Record', 'Expected rejoin date passed without a return record.', 'rejoin_overdue'], ['DM Facilities Management', 'Facility rent instalment due.', 'rent_due']],
  projects: [['DMS Technical Submittal', 'Submittal required date passed.', 'submittal_overdue'], ['Task', 'Task expected end date passed.', 'task_overdue']],
  operations: [['Driver Vehicle Issue Request', 'High-severity vehicle issue still open.', 'vehicle_issue'], ['Vehicle', 'Istimara expires within 30 days.', 'doc_expiry']],
  manufacturing: [['Work Order', 'Expected delivery date passed.', 'wo_overdue'], ['Factory Job Order', 'Job order end date passed while open.', 'jo_overdue']],
  it: [['IT Help Desk Request', 'High-priority ticket past its due date.', 'ticket_overdue'], ['IT Renewals Subscription', 'Subscription renewal due.', 'renewal_due']],
  legal: [['Taradhi Cases', 'Next Taradhi session scheduled.', 'session'], ['DM Companies Management', 'Commercial registration expires soon.', 'cr_expiry']],
  dmcc: []
};
const ROWS = [];
let n = 0;
DEPTS.forEach(([dk]) => {
  const count = { finance: 70, sales: 60, procurement: 45, people: 30, operations: 25, projects: 18, manufacturing: 14, it: 12, legal: 8, dmcc: 0 }[dk];
  for (let i = 0; i < count; i++) {
    const [dt, reason, type] = pick(SRC[dk]), x = r(), co = pick(COS);
    const group = x < 0.08 ? 'decision' : x < 0.3 ? 'escalation' : x < 0.93 ? 'followup' : 'verification';
    const sev = group === 'verification' ? 'verify' : r() < 0.12 ? 'critical' : r() < 0.6 ? 'overdue' : r() < 0.7 ? 'due_soon' : 'pending';
    const od = sev === 'overdue' || sev === 'critical' ? 1 + Math.floor(Math.pow(r(), 2) * 220) : null;
    const due = od ? add(TODAY, -od) : sev === 'due_soon' ? add(TODAY, 1 + Math.floor(r() * 6)) : r() < 0.4 ? add(TODAY, 10 + Math.floor(r() * 30)) : '';
    const owned = r() < 0.7, bundle = group === 'followup' && r() < 0.05 ? 26 + Math.floor(r() * 300) : 0, nm = dt.slice(0, 3).toUpperCase() + '-' + String(++n).padStart(5, '0');
    ROWS.push({ key: dt + '::' + nm + '::' + type, source: type, doctype: dt, name: bundle ? '' : nm, type, dept: dk, group, severity: sev,
      title: bundle ? dt + ' backlog (' + bundle + ' records)' : pick(['Gulf Build Co.', 'Najd Logistics', 'Red Sea Marine', 'Eastern Steel', 'Oasis Hotels', 'Asir Hospitals', 'Harbor Works', 'Qassim Foods']) + ' · ' + nm,
      reason, owner: owned ? pick(PEOPLE) : '', owner_basis: owned ? pick(['Assigned in ERP', dt + '.owner field', 'Your workflow role']) : 'unassigned', unowned: owned ? 0 : 1,
      due, due_basis: due ? dt + '.due_date' : '', overdue_days: od, age_days: Math.floor(r() * 90), amount: r() < 0.6 ? Math.round(5000 + Math.pow(r(), 2) * 900000) : null, currency: co[1],
      amount_basis: 'Base grand total', company: co[0], status: pick(['Open', 'To Deliver', 'Overdue', 'Pending']), list: bundle ? { doctype: dt, filters: [['status', '=', 'Open']] } : null, bundle,
      extra: group === 'decision' ? { actions: ['Approve', 'Reject'] } : group === 'verification' ? { count: 3 + Math.floor(r() * 40) } : {} });
  }
});
ROWS.sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group] || SEV_RANK[a.severity] - SEV_RANK[b.severity] || (b.overdue_days || 0) - (a.overdue_days || 0) || (a.due || '9999').localeCompare(b.due || '9999'));
const SOURCES = [];
DEPTS.forEach(([dk, label]) => (SRC[dk] || []).forEach(([dt], i) => SOURCES.push({ key: dk + i, dept: dk, label: label + ' · ' + dt, doctypes: [dt], state: dk === 'it' && i === 1 ? 'restricted' : dk === 'manufacturing' && i === 1 ? 'partial' : 'complete', message: dk === 'it' && i === 1 ? 'Your ERP role cannot read this source.' : dk === 'manufacturing' && i === 1 ? 'Only the first 2,000 rows were read.' : '', scope: 'all', rows: 10 })));
SOURCES.push({ key: 'dmcc', dept: 'dmcc', label: 'DMCC external connector', doctypes: ['DMCC Integration Settings'], state: 'not_configured', message: 'DMCC Integration Settings is not installed.', scope: 'external', rows: 0 });
const UPCOMING = [];
for (let i = 0; i < 46; i++) { const dk = pick(DEPTS.slice(0, 9))[0]; UPCOMING.push({ dept: dk, doctype: 'Purchase Invoice', name: 'PINV-' + (900 + i), date: add(TODAY, Math.floor(i / 6)), kind: pick(['Supplier payment due', 'Leave starts', 'Rent instalment', 'Licence renewal', 'Court session']), title: pick(['Supplier One', 'Al Noor Facilities', 'Riyadh office lease', 'Employee leave', 'Court case 118']), amount: r() < 0.5 ? Math.round(2000 + r() * 90000) : null, currency: 'SAR', owner: r() < 0.5 ? pick(PEOPLE) : '', list: null }); }
UPCOMING.sort((a, b) => a.date.localeCompare(b.date));

function blank() { return { decision: 0, escalation: 0, followup: 0, verification: 0, critical: 0, overdue: 0, due_soon: 0, unowned: 0, oldest_due: '', items: 0 }; }
function summarize(rows) {
  const matrix = {}, total = blank(); DEPTS.concat([['overview']]).forEach(([d]) => { matrix[d] = blank(); });
  rows.forEach(a => {
    [matrix[a.dept], total].forEach(m => {
      m[a.group]++; m.items += a.bundle && a.group !== 'verification' ? a.bundle : 1;
      if (a.severity === 'critical') m.critical++;
      if (a.overdue_days) { m.overdue++; if (a.due && (!m.oldest_due || a.due < m.oldest_due)) m.oldest_due = a.due; }
      if (a.due && TODAY <= a.due && a.due <= HORIZON) m.due_soon++;
      if (a.unowned && (a.group === 'escalation' || a.group === 'followup')) m.unowned++;
    });
  });
  return { total, matrix };
}
const meta = q => ({ api_version: 'test', policy: { version: 'test', stale_days: 14, ar_followup_days: 60 }, retrieved: TODAY + ' 09:30:00', today: TODAY, window: Number(q.get('window') || 7), horizon: HORIZON,
  company: q.get('company') || '', currency: null, period: [q.get('from_date') || '2026-11-01', q.get('to_date') || TODAY], user: 'ceo@example.com', user_name: 'CEO' });
const scoped = q => ROWS.filter(a => !q.get('company') || !a.company || a.company === q.get('company'));
const PERF = {
  sales: { by_company: { period: ['2026-11-01', TODAY], rows: COS.map(([c, cur], i) => ({ company: c, currency: cur, invoiced: 4200000 - i * 1100000, booked: 5100000 - i * 900000, target: i === 2 ? null : 6000000 - i * 1500000, target_basis: 'CEO Sales Target', attainment: i === 2 ? null : (70 - i * 9) })), basis: 'Submitted Sales Invoices (base net total) in the period.', target_state: 'available' },
    quotation_conversion: { submitted: 182, ordered: 61, rate: 33.5, basis: 'Submitted quotations in the period.' } },
  finance: { cash: { rows: COS.map(([c, cur], i) => ({ company: c, currency: cur, amount: 8200000 - i * 2900000 })), basis: 'GL balance of Cash and Bank accounts, today.' },
    receivables: { rows: COS.map(([c, cur], i) => ({ company: c, currency: cur, outstanding: 14200000 - i * 4100000, overdue: 6100000 - i * 2000000 })), basis: 'Sales Invoice outstanding amounts, today.' },
    collections: { rows: COS.map(([c, cur], i) => ({ company: c, currency: cur, amount: 2600000 - i * 800000, count: 140 - i * 40 })), basis: 'Payment Entries (Receive) in the period.' } },
  people: { workforce: { rows: COS.map(([c], i) => ({ company: c, count: 420 - i * 150 })), basis: 'Active employees.' }, payroll: { rows: [], basis: 'Payroll Entry covering this month.' } },
  procurement: { open_commitments: { rows: COS.map(([c, cur], i) => ({ company: c, currency: cur, count: 64 - i * 20, amount: 3100000 - i * 900000 })), basis: 'Submitted POs to receive.' } },
  projects: { submittal_status: { rows: [{ label: 'Approved', count: 44 }, { label: 'Under review', count: 21 }, { label: 'Rejected', count: 6 }], basis: 'DMS Technical Submittal by status.' } },
  operations: { trips: { rows: [{ label: 'Completed', count: 210 }, { label: 'In transit', count: 12 }, { label: 'Scheduled', count: 31 }], basis: 'Delivery trips in the period.' } }
};
/* Executive performance payload in the API's shape: counts per status, values per company currency, monthly series. */
const MONEY = { sales: ['Quotation pipeline', 'Quoted value', 'Sales orders booked', 'Order value'], procurement: ['Purchase orders placed', 'PO value', 'Goods received', 'Received value'], finance: ['Customer invoices', 'Invoiced value', 'Supplier invoices', 'Supplier billing'] };
DEPTS.filter(([key]) => key !== 'dmcc').forEach(([key, label]) => {
  const money = MONEY[key];
  const sections = [0, 1].map(i => {
    const st = [{ label: 'Completed', count: 20, values: money ? { SAR: 2000000, AED: 400000 } : {} }, { label: 'Open', count: 10, values: money ? { SAR: 1000000, AED: 100000 } : {} }];
    const sec = { title: money ? money[i * 2] : label + (i ? ' status' : ' activity'), source: label + ' dashboard', doctype: key + ' records', date_field: i && !money ? '' : 'posting_date', value_label: money ? money[i * 2 + 1] : '',
      scope: key === 'it' ? 'unscoped' : 'all', state: key === 'it' && i ? 'restricted' : 'complete', message: key === 'it' && i ? 'Permission restricted' : '', total: 30, statuses: st,
      values: money ? { SAR: 3000000, AED: 500000 } : {}, currencies: money ? ['AED', 'SAR'].sort() : [],
      trend: i && !money ? [] : [{ label: '2026-10', count: 12, values: money ? { SAR: 1200000, AED: 200000 } : {} }, { label: '2026-11', count: 18, values: money ? { SAR: 1800000, AED: 300000 } : {} }] };
    if (sec.state !== 'complete') { delete sec.total; delete sec.statuses; }
    return sec;
  });
  PERF[key] = Object.assign({}, PERF[key], { executive: { sections, period: ['2026-10-01', TODAY] } });
});
const INDICATORS = { finance: [{ label: 'Overdue customers', value: 41, basis: 'Customers with overdue invoices', tone: 'bad' }, { label: 'Credit-limit breaches', value: 9, basis: 'Outstanding above limit', tone: 'warn' }, { label: 'Supplier invoices due', value: 23, basis: 'Due within the window' }],
  sales: [{ label: 'Open DMS projects', value: 312, basis: 'Follow-up not Won/Lost' }, { label: 'Unallocated leads', value: 57, basis: 'No active allocation', tone: 'warn' }] };
function approvals() {
  const types = [['Credit Note Request - Sales Return', 'Credit note request', 'money'], ['Leave Application', 'Leave', 'people'], ['Quotation', 'Quotation', 'sales'], ['Travel Request', 'Travel request', 'people'], ['Materials Service General Request Form', 'General request', 'admin'], ['Loan Application', 'Loan application', 'money']];
  const rr = rng(5), out = [];
  for (let i = 0; i < 18; i++) {
    const [dt, lbl, cat] = types[i % types.length], amount = cat === 'money' || dt === 'Quotation' ? Math.round(300 + Math.pow(rr(), 2) * 120000) : null, wait = 1 + Math.floor(rr() * 40), dl = rr() < 0.6 ? Math.floor(rr() * 25) - 4 : null;
    const pr = dl != null && dl < 0 ? 'stale' : (dl != null && dl <= 3) || (amount || 0) >= 50000 ? 'urgent' : (dl != null && dl <= 14) || (amount || 0) >= 10000 ? 'high' : 'normal';
    const routine = amount != null && amount < 1000 ? 1 : 0;
    out.push({ key: dt + '::' + 'D' + i, doctype: dt, name: dt.slice(0, 3).toUpperCase() + '-' + (2300 + i), type_label: lbl, category: cat, title: pick(['Gulf Build Co.', 'Sara Qahtani', 'Omar Haddad', 'Najd Logistics', 'Office supplies', 'Lina Farouk']), requester: pick(PEOPLE),
      state: 'Pending CEO Approval', actions: ['Approve', 'Reject', 'Hold'], approve_action: 'Approve', conditional: i % 7 === 0 ? 1 : 0, amount, amount_label: 'Amount', currency: amount != null ? 'SAR' : null, amount_basis: 'Grand total',
      facts: [['Reason', pick(['Material rejected', 'Invoicing error', 'Annual leave', 'Site visit'])], ['Days', String(1 + i % 9)]], tags: i % 3 ? [] : ['Material rejected'], note: i % 4 ? '' : '<p>Customer returned two pallets after inspection.</p>',
      date: add(TODAY, -wait), deadline: dl != null ? add(TODAY, dl) : '', deadline_label: dl != null ? pick(['Leave starts', 'Delivery due', 'Event date']) : '', days_to_deadline: dl, waiting_days: wait, priority: pr,
      why: pr === 'urgent' ? [(amount || 0) >= 50000 ? 'High value' : 'Deadline in ' + dl + ' days'] : pr === 'high' ? ['Deadline within 14 days'] : pr === 'stale' ? ['Dates already passed'] : [],
      routine, bulk: (amount == null || amount < 10000) && pr !== 'urgent' ? 1 : 0, company: COS[i % 3][0], modified: add(TODAY, -wait) + ' 10:00:00' });
  }
  return out;
}
const APPROVALS = approvals();
function respond(action, q) {
  const m = meta(q), rows = scoped(q);
  if (action === 'bootstrap') return Object.assign(m, { companies: COS.map(([name, currency]) => ({ name, currency, abbr: name.slice(0, 3) })), departments: DEPTS.map(([key, label]) => ({ key, label, dashboards: [{ label: label + ' dashboard', route: '/app/' + key + '-dashboard' }] })), groups: GROUPS, roles: ['CEO'] });
  if (action === 'approvals') return Object.assign(m, { items: APPROVALS.filter(a => !q.get('company') || a.company === q.get('company')), summary: {}, categories: { money: 'Money & credit', sales: 'Sales & pricing', people: 'People & HR', admin: 'Requests & admin' }, problems: [], user_roles: ['CEO'] });
  if (action === 'approval_detail') return { doctype: q.get('doctype'), name: q.get('name'), fields: [{ label: 'Employee', type: 'Data', value: 'Sara Qahtani' }, { label: 'Reason', type: 'Small Text', value: 'Annual leave' }], tables: [{ label: 'Items', columns: [{ label: 'Item', field: 'item', type: 'Data' }, { label: 'Qty', field: 'qty', type: 'Float' }], rows: [{ item: 'Pallet', qty: 2 }] }], comments: [{ by: 'Omar Haddad', when: '2026-11-15 10:00', content: 'Checked with the customer.' }], created_by: 'Sara Qahtani', created: '2026-11-10', modified: '2026-11-15', modified_by: 'Omar Haddad' };
  if (action === 'drilldown') return { doctype: q.get('doctype'), name: q.get('name'), fields: { creation: '2026-10-01 10:00:00', modified: '2026-11-10 12:00:00' }, assigned: [{ user: 'u', name: 'Omar Haddad' }], todos: [], related: [{ label: 'Customer', value: 'Gulf Build Co.', doctype: 'Customer' }], created_by: 'Sara Qahtani', modified_by: 'Omar Haddad' };
  const s = summarize(rows), base = Object.assign(m, { totals: s.total, matrix: s.matrix, upcoming: UPCOMING, upcoming_total: UPCOMING.length, sources: SOURCES, indicators: INDICATORS, performance: PERF, workflow: {} });
  if (action === 'overview') { const top = {}; GROUPS.forEach(g => { top[g] = rows.filter(a => a.group === g).slice(0, 12); }); return Object.assign(base, { top, counts_by_group: Object.fromEntries(GROUPS.map(g => [g, rows.filter(a => a.group === g).length])) }); }
  if (action === 'department') { const d = q.get('department'), dr = rows.filter(a => a.dept === d); return Object.assign(base, { rows: dr, row_total: dr.length, department: d, sources: SOURCES.filter(x => x.dept === d), dashboards: [{ label: d + ' dashboard', route: '/app/' + d }],
    performance: Object.assign({}, PERF, { dmcc: { connection: { state: 'not_configured', message: 'DMCC Integration Settings is not installed.' } } }) }); }
  if (action === 'actions') {
    const grp = q.get('group') || '', sev = q.get('severity') || '', qq = (q.get('q') || '').toLowerCase(), size = Math.min(Math.max(+q.get('page_size') || 25, 5), 100), page = Math.max(+q.get('page') || 0, 0);
    let sel = rows.filter(a => (!grp || a.group === grp) && (!sev || a.severity === sev || (sev === 'unowned' && a.unowned)));
    if (qq) sel = sel.filter(a => (a.title + ' ' + a.owner + ' ' + a.name + ' ' + a.doctype + ' ' + a.reason).toLowerCase().includes(qq));
    return Object.assign(m, { total: sel.length, page, page_size: size, rows: sel.slice(page * size, page * size + size) });
  }
  return m;
}
module.exports = { respond, ROWS, APPROVALS, UPCOMING, DEPTS, summarize, TODAY };
