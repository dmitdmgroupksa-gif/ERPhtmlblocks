/* DM Group KSA | IT Asset Acquisition Dashboard | ERPNext v14 Custom HTML Block (read-only)
   Uses only frappe.client.get_list. Root is located through root_element (shadow DOM). */
(function () {
  'use strict';
  const DOC = 'Asset Acquisition Records', CHILD = 'Asset Acquisition Table', ROOT_ID = 'dm-aar-dashboard', PAGE = 200;
  const root = (typeof root_element !== 'undefined' && root_element && root_element.querySelector && root_element.querySelector('#' + ROOT_ID)) || document.getElementById(ROOT_ID);
  if (!root || root.dataset.init === '1') return;
  root.dataset.init = '1';
  const NA = { en: 'Not Available', ar: 'غير متوفر' };
  const D = {
    en: { title: 'IT Asset Acquisition & Control', sub: 'DM Group KSA · Live data from Asset Acquisition Records', overview: 'Executive Overview', register: 'Acquisition Register', employees: 'Employee & Location', categories: 'Asset Categories', finance: 'Cost & Procurement', audit: 'Audit & Compliance', reports: 'Reports & Export', from: 'Start Date', to: 'End Date', rtype: 'Request Type', status: 'Doc Status', approval: 'Approval', emp: 'Employee', branch: 'Branch', cat: 'Asset Category', search: 'Search', searchPh: 'Record, employee, item…', refresh: 'Refresh', reset: 'Reset Filters', all: 'All', loading: 'Loading live data from ERP…', err: 'Unable to load ERP data. Check permissions for Asset Acquisition Records.', retry: 'Retry', noData: 'No matching records', total: 'Total Records', it: 'IT Related', nonit: 'Non-IT', submitted: 'Submitted', draft: 'Draft', cancelled: 'Cancelled', approved: 'Approved', pending: 'Pending Approval', rejected: 'Rejected', noappr: 'No Approval Set', issue: 'Issue New', ret: 'Return', items: 'Item Lines', qty: 'Total Quantity', emps: 'Employees', active: 'Active Employees', left: 'Left Employees', locs: 'Job Locations', branches: 'Branches', depts: 'Divisions', byStatus: 'Document Status', byAppr: 'Approval Status', byType: 'Request Type', byMonth: 'Monthly Acquisitions (last 12)', byBranch: 'By Branch', byLoc: 'By Job Location', byEmp: 'Top Employees', byDept: 'By Division', byCat: 'By Asset Category', byItem: 'Top Items', byCond: 'Item Condition', byAction: 'Issue / Return', id: 'Record ID', date: 'Date', location: 'Job Location', type: 'Type', appr: 'Approval', st: 'Status', act: 'Action', itemsCol: 'Items', open: 'Open in ERP', openList: 'Open ERP List', close: 'Close', showing: 'Showing records', clickHint: 'Click a record ID to open the original ERP document.', cost: 'Acquisition Cost', supplier: 'Supplier', purchase: 'Purchase Reference', costNote: 'Asset Acquisition Records and its child table contain no cost, supplier or purchase fields. These metrics are shown as Not Available instead of estimated values.', fieldsTitle: 'Field Completeness', field: 'Field', present: 'Present', missing: 'Missing', checks: 'Compliance Checks', draftOld: 'Drafts older than 30 days', pendAppr: 'Submitted without “Approved” status', leftIssue: 'Left employees with open “Issue New” records', noSigned: 'Without signed form attachment', noItems: 'Records without item lines', export: 'Export filtered CSV', exportItems: 'Export item lines CSV', loaded: 'Records loaded', filtered: 'Filtered', updated: 'Last refreshed', ro: 'Read-only · no ERP records are modified', scope: 'Scope', allScope: 'All Records', itScope: 'IT Related only', nonitScope: 'Non-IT only', note: 'Acquisition requests are not proof of current asset custody.', page: 'Page', of: 'of', prev: 'Prev', next: 'Next', rows: 'records', uncategorised: 'Uncategorised', none: '(blank)' },
    ar: { title: 'اقتناء أصول تقنية المعلومات والرقابة', sub: 'مجموعة درر مساغ · بيانات مباشرة من سجلات اقتناء الأصول', overview: 'النظرة التنفيذية', register: 'سجل الاقتناء', employees: 'الموظفون والمواقع', categories: 'فئات الأصول', finance: 'التكاليف والمشتريات', audit: 'التدقيق والامتثال', reports: 'التقارير والتصدير', from: 'تاريخ البداية', to: 'تاريخ النهاية', rtype: 'نوع الطلب', status: 'حالة المستند', approval: 'الاعتماد', emp: 'الموظف', branch: 'الفرع', cat: 'فئة الأصل', search: 'بحث', searchPh: 'سجل، موظف، صنف…', refresh: 'تحديث', reset: 'إعادة التعيين', all: 'الكل', loading: 'جاري تحميل البيانات من النظام…', err: 'تعذر تحميل البيانات. تحقق من الصلاحيات.', retry: 'إعادة المحاولة', noData: 'لا توجد سجلات مطابقة', total: 'إجمالي السجلات', it: 'تقنية المعلومات', nonit: 'غير تقنية', submitted: 'معتمد', draft: 'مسودة', cancelled: 'ملغى', approved: 'موافق عليه', pending: 'بانتظار الموافقة', rejected: 'مرفوض', noappr: 'بدون حالة اعتماد', issue: 'صرف جديد', ret: 'إرجاع', items: 'بنود الأصناف', qty: 'إجمالي الكمية', emps: 'الموظفون', active: 'موظفون نشطون', left: 'موظفون غادروا', locs: 'مواقع العمل', branches: 'الفروع', depts: 'الأقسام', byStatus: 'حالة المستند', byAppr: 'حالة الاعتماد', byType: 'نوع الطلب', byMonth: 'الاقتناء الشهري (آخر 12)', byBranch: 'حسب الفرع', byLoc: 'حسب موقع العمل', byEmp: 'أكثر الموظفين', byDept: 'حسب القسم', byCat: 'حسب فئة الأصل', byItem: 'أكثر الأصناف', byCond: 'حالة الصنف', byAction: 'صرف / إرجاع', id: 'رقم السجل', date: 'التاريخ', location: 'موقع العمل', type: 'النوع', appr: 'الاعتماد', st: 'الحالة', act: 'الإجراء', itemsCol: 'الأصناف', open: 'فتح في النظام', openList: 'فتح قائمة النظام', close: 'إغلاق', showing: 'السجلات المعروضة', clickHint: 'اضغط على رقم السجل لفتح المستند الأصلي.', cost: 'تكلفة الاقتناء', supplier: 'المورد', purchase: 'مرجع الشراء', costNote: 'لا تحتوي سجلات الاقتناء أو جدولها الفرعي على حقول للتكلفة أو المورد أو الشراء، لذلك تُعرض هذه المؤشرات كغير متوفرة بدلاً من قيم تقديرية.', fieldsTitle: 'اكتمال الحقول', field: 'الحقل', present: 'موجود', missing: 'ناقص', checks: 'فحوصات الامتثال', draftOld: 'مسودات أقدم من 30 يوماً', pendAppr: 'مستندات معتمدة بدون حالة "موافق عليه"', leftIssue: 'موظفون غادروا لديهم سجلات صرف مفتوحة', noSigned: 'بدون نموذج موقع مرفق', noItems: 'سجلات بدون بنود', export: 'تصدير CSV المفلتر', exportItems: 'تصدير بنود الأصناف CSV', loaded: 'السجلات المحملة', filtered: 'المفلترة', updated: 'آخر تحديث', ro: 'للقراءة فقط · لا يتم تعديل أي سجلات', scope: 'النطاق', allScope: 'جميع السجلات', itScope: 'تقنية المعلومات فقط', nonitScope: 'غير تقنية فقط', note: 'طلبات الاقتناء ليست إثباتاً للحيازة الحالية للأصل.', page: 'صفحة', of: 'من', prev: 'السابق', next: 'التالي', rows: 'سجل', uncategorised: 'غير مصنف', none: '(فارغ)' }
  };
  const S = { lang: 'en', tab: 'overview', f: { from: '', to: '', scope: 'it', status: '', approval: '', emp: '', branch: '', cat: '', q: '' }, rows: [], loading: false, error: '', loaded: false, updated: null, drill: null, page: 0 };
  const t = k => D[S.lang][k] || k;
  const na = () => NA[S.lang];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const str = v => String(v == null ? '' : v).trim();
  const nf = n => new Intl.NumberFormat(S.lang === 'ar' ? 'ar-SA' : 'en-US').format(n);
  const href = n => '/app/asset-acquisition-records/' + encodeURIComponent(n);
  const docst = r => r.docstatus === 1 ? 'Submitted' : r.docstatus === 2 ? 'Cancelled' : 'Draft';
  const isIT = r => r.request_type === 'IT Related';

  function call(method, args) {
    return new Promise((res, rej) => frappe.call({ method, args, freeze: false, callback: r => res(r ? r.message : null), error: e => rej(new Error((e && e.statusText) || 'ERP request failed')) }));
  }
  async function pageAll(doctype, fields, filters) {
    let out = [];
    for (let p = 0; p < 500; p++) {
      const part = await call('frappe.client.get_list', { doctype, fields, filters: filters || [], limit_start: p * PAGE, limit_page_length: PAGE, order_by: '`tab' + doctype + '`.name asc' });
      if (!Array.isArray(part)) throw new Error('Unexpected list response');
      out = out.concat(part);
      if (part.length < PAGE) break;
    }
    return out;
  }
  async function load() {
    if (S.loading) return;
    S.loading = true; S.error = ''; render();
    try {
      const parents = await pageAll(DOC, ['name', 'docstatus', 'date', 'creation', 'employee', 'employee_division', 'branch', 'custom_job_location', 'approval_status', 'emp_status', 'workflow_state', 'request_type', 'satus', 'recieved_by', 'attach_singed']);
      let lines = [];
      try {
        lines = await pageAll(DOC, ['name', '`tab' + CHILD + '`.item_name as item', '`tab' + CHILD + '`.brand_name as brand', '`tab' + CHILD + '`.quanity as qty', '`tab' + CHILD + '`.condition_item as cond', '`tab' + CHILD + '`.dmasset_no as assetno', '`tab' + CHILD + '`.idx as idx']);
      } catch (e) { lines = []; }
      const items = new Set(lines.map(l => l.item).filter(Boolean));
      let catMap = {};
      try { (await pageAll('IT Asset', ['name', 'category'])).forEach(a => { catMap[a.name] = a.category; }); } catch (e) { catMap = {}; }
      const empIds = [...new Set(parents.map(r => r.employee).filter(Boolean))];
      let empMap = {};
      for (let i = 0; i < empIds.length; i += 100) {
        try { (await call('frappe.client.get_list', { doctype: 'Employee', fields: ['name', 'employee_name'], filters: [['name', 'in', empIds.slice(i, i + 100)]], limit_page_length: 0 }) || []).forEach(e => { empMap[e.name] = e.employee_name; }); } catch (e) { }
      }
      const byName = {};
      parents.forEach(r => { r.items = []; r.empName = empMap[r.employee] || ''; r.d = str(r.date || r.creation).slice(0, 10); byName[r.name] = r; });
      lines.filter(l => l.item || l.qty).forEach(l => { const r = byName[l.name]; if (r) r.items.push({ item: l.item || '', brand: l.brand || '', qty: l.qty, cond: l.cond || '', assetno: l.assetno || '', cat: (l.item && catMap[l.item]) || '' }); });
      parents.sort((a, b) => (b.d || '').localeCompare(a.d || '') || b.name.localeCompare(a.name));
      S.rows = parents; S.loaded = true; S.updated = new Date(); S.hasCat = Object.keys(catMap).length > 0; S.items = items.size;
    } catch (e) { S.error = e.message || String(e); }
    S.loading = false; render();
  }
  const qnum = v => { const s = str(v).replace(/,/g, ''); return /^\d+(\.\d+)?$/.test(s) ? +s : null; };
  const cats = r => [...new Set(r.items.map(i => i.cat || t('uncategorised')))];
  function filtered(extra) {
    const f = S.f, q = f.q.toLowerCase();
    return S.rows.filter(r => (f.scope === 'all' || (f.scope === 'it' ? isIT(r) : !isIT(r)))
      && (!f.from || r.d >= f.from) && (!f.to || r.d <= f.to)
      && (!f.status || docst(r) === f.status) && (!f.approval || str(r.approval_status) === f.approval)
      && (!f.emp || r.employee === f.emp) && (!f.branch || str(r.branch) === f.branch)
      && (!f.cat || cats(r).includes(f.cat))
      && (!q || [r.name, r.employee, r.empName, r.branch, r.custom_job_location, r.request_type, r.employee_division, ...r.items.map(i => i.item + ' ' + i.brand + ' ' + i.assetno)].some(v => str(v).toLowerCase().includes(q)))
      && (!extra || extra(r)));
  }
  const group = (rows, fn) => { const o = {}; rows.forEach(r => { const ks = fn(r); (Array.isArray(ks) ? ks : [ks]).forEach(k => { k = str(k) || t('none'); o[k] = (o[k] || 0) + 1; }); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  let preds = [];
  const reg = (label, fn) => { preds.push({ label, fn }); return preds.length - 1; };
  const card = (label, value, fn, tone) => `<div class="aar-card ${tone || ''}" role="button" tabindex="0" ${fn ? `data-drill="${reg(label, fn)}"` : ''}><label>${esc(label)}</label><div class="aar-value">${esc(value)}</div></div>`;
  const naCard = label => `<div class="aar-card na"><label>${esc(label)}</label><div class="aar-value aar-na">${na()}</div></div>`;
  const panel = (title, body, cls) => `<section class="aar-panel ${cls || ''}"><h2>${esc(title)}</h2>${body}</section>`;
  const COLORS = ['#0b8895', '#d8a451', '#294e7b', '#6aa84f', '#b54747', '#8e6bbf', '#3d9bd6', '#9aa9b9'];
  function bars(title, data, keyFn, limit) {
    const top = data.slice(0, limit || 10), max = Math.max(1, ...top.map(x => x[1]));
    return `<div class="aar-bars">${top.length ? top.map(([n, v], i) => `<div class="aar-barrow" role="button" tabindex="0" data-drill="${reg(title + ': ' + n, r => keyFn(r, n))}"><span title="${esc(n)}">${esc(n)}</span><div class="aar-barbg"><div class="aar-bar" style="width:${v / max * 100}%;background:${COLORS[i % COLORS.length]}"></div></div><strong>${nf(v)}</strong></div>`).join('') : `<div class="aar-empty">${t('noData')}</div>`}</div>`;
  }
  function donut(title, data, keyFn) {
    const tot = data.reduce((a, b) => a + b[1], 0); if (!tot) return `<div class="aar-empty">${t('noData')}</div>`;
    let acc = 0; const R = 54, C = 2 * Math.PI * R;
    const segs = data.map(([n, v], i) => { const len = v / tot * C, s = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="22" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" data-drill="${reg(title + ': ' + n, r => keyFn(r, n))}" style="cursor:pointer"><title>${esc(n)}: ${v}</title></circle>`; acc += len; return s; }).join('');
    const legend = data.map(([n, v], i) => `<div class="aar-leg" role="button" tabindex="0" data-drill="${reg(title + ': ' + n, r => keyFn(r, n))}"><i style="background:${COLORS[i % COLORS.length]}"></i><span>${esc(n)}</span><b>${nf(v)}</b><em>${Math.round(v / tot * 100)}%</em></div>`).join('');
    return `<div class="aar-donut"><svg viewBox="0 0 140 140" width="140" height="140"><g transform="rotate(-90 70 70)">${segs}</g><text x="70" y="76" text-anchor="middle" class="aar-dtot">${nf(tot)}</text></svg><div class="aar-legend">${legend}</div></div>`;
  }
  const pill = (v, k) => { const s = str(v); const c = /submit|approv|active/i.test(s) ? 'ok' : /draft|pend/i.test(s) ? 'warn' : /cancel|reject|left/i.test(s) ? 'bad' : ''; return `<span class="aar-pill ${c}">${esc(s || '—')}</span>`; };
  function table(rows, limit) {
    if (!rows.length) return `<div class="aar-empty">${t('noData')}</div>`;
    const per = limit || 25, pages = Math.ceil(rows.length / per), pg = Math.min(S.page, pages - 1), slice = rows.slice(pg * per, pg * per + per);
    return `<div class="aar-tablewrap"><table><thead><tr>${[t('id'), t('date'), t('emp'), t('branch'), t('location'), t('type'), t('itemsCol'), t('act'), t('appr'), t('st')].map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${slice.map(r => `<tr><td><a href="${href(r.name)}" target="_blank" rel="noopener">${esc(r.name)}</a></td><td>${esc(r.d)}</td><td>${esc(r.empName || r.employee || '—')}<div class="aar-sm">${esc(r.employee || '')} ${r.emp_status ? pill(r.emp_status) : ''}</div></td><td>${esc(r.branch || '—')}</td><td>${esc(r.custom_job_location || '—')}</td><td>${esc(r.request_type || '—')}</td><td class="aar-items">${esc(r.items.map(i => i.item + (qnum(i.qty) > 1 ? ' ×' + i.qty : '')).join(', ') || '—')}</td><td>${esc(r.satus || '—')}</td><td>${pill(r.approval_status)}</td><td>${pill(docst(r))}</td></tr>`).join('')}</tbody></table></div>${pages > 1 ? `<div class="aar-pager"><button class="aar-mini" data-page="${pg - 1}" ${pg ? '' : 'disabled'}>${t('prev')}</button><span>${t('page')} ${pg + 1} ${t('of')} ${pages} · ${nf(rows.length)} ${t('rows')}</span><button class="aar-mini" data-page="${pg + 1}" ${pg < pages - 1 ? '' : 'disabled'}>${t('next')}</button></div>` : ''}`;
  }
  const kStatus = (r, n) => docst(r) === n, kAppr = (r, n) => (str(r.approval_status) || t('none')) === n;
  const kField = f => (r, n) => (str(r[f]) || t('none')) === n;
  const lineCount = rows => rows.reduce((a, r) => a + r.items.length, 0);
  const qtySum = rows => rows.reduce((a, r) => a + r.items.reduce((b, i) => b + (qnum(i.qty) || 0), 0), 0);
  function audits(rows) {
    const today = new Date(); const old = new Date(today - 30 * 864e5).toISOString().slice(0, 10);
    return [
      [t('draftOld'), r => r.docstatus === 0 && r.d < old],
      [t('pendAppr'), r => r.docstatus === 1 && str(r.approval_status) !== 'Approved'],
      [t('leftIssue'), r => r.emp_status === 'Left' && r.satus === 'Issue New' && r.docstatus !== 2],
      [t('noSigned'), r => r.docstatus !== 2 && !r.attach_singed],
      [t('noItems'), r => !r.items.length]
    ].map(([l, fn]) => [l, rows.filter(fn).length, fn]);
  }
  function content(rows) {
    const tab = S.tab, sub = rows.filter(r => r.docstatus === 1).length, dr = rows.filter(r => r.docstatus === 0).length, ca = rows.filter(r => r.docstatus === 2).length;
    if (tab === 'overview') {
      const months = group(rows, r => r.d.slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
      const all = S.rows.length, it = S.rows.filter(isIT).length;
      return `<div class="aar-cards">${card(t('total'), nf(rows.length), () => true, 'navy')}${card(t('submitted'), nf(sub), r => r.docstatus === 1, 'ok')}${card(t('draft'), nf(dr), r => r.docstatus === 0, 'warn')}${card(t('cancelled'), nf(ca), r => r.docstatus === 2, 'bad')}${card(t('approved'), nf(rows.filter(r => r.approval_status === 'Approved').length), r => r.approval_status === 'Approved')}${card(t('pending'), nf(rows.filter(r => r.approval_status === 'Pending').length), r => r.approval_status === 'Pending')}${card(t('items'), nf(lineCount(rows)), r => r.items.length > 0)}${card(t('emps'), nf(new Set(rows.map(r => r.employee).filter(Boolean)).size), r => !!r.employee)}</div>
      <div class="aar-scopebar"><span>ERP: <b>${nf(all)}</b> ${t('total')}</span><span>· <b>${nf(it)}</b> ${t('it')}</span><span>· <b>${nf(all - it)}</b> ${t('nonit')}</span></div>
      <div class="aar-grid">${panel(t('byStatus'), donut(t('byStatus'), group(rows, docst), kStatus))}${panel(t('byAppr'), donut(t('byAppr'), group(rows, r => r.approval_status), kAppr))}</div>
      <div class="aar-grid">${panel(t('byMonth'), `<div class="aar-cols">${(() => { const m = Math.max(1, ...months.map(x => x[1])); return months.map(([n, v]) => `<div class="aar-col" role="button" tabindex="0" data-drill="${reg(t('byMonth') + ': ' + n, r => r.d.slice(0, 7) === n)}"><b>${v}</b><div style="height:${v / m * 120}px"></div><span>${n.slice(2)}</span></div>`).join('') || `<div class="aar-empty">${t('noData')}</div>`; })()}</div>`)}${panel(t('byType'), bars(t('byType'), group(rows, r => r.request_type), kField('request_type')))}</div>
      ${panel(t('register'), table(rows.slice(0, 10), 10))}<div class="aar-alert">${t('note')}</div>`;
    }
    if (tab === 'register') return panel(`${t('register')} · ${nf(rows.length)}`, `<div class="aar-panel-head"><span class="aar-muted">${t('clickHint')}</span><button class="aar-mini" data-action="export">${t('export')}</button></div>${table(rows)}`);
    if (tab === 'employees') {
      return `<div class="aar-cards">${card(t('emps'), nf(new Set(rows.map(r => r.employee).filter(Boolean)).size), r => !!r.employee)}${card(t('active'), nf(new Set(rows.filter(r => r.emp_status === 'Active').map(r => r.employee)).size), r => r.emp_status === 'Active', 'ok')}${card(t('left'), nf(new Set(rows.filter(r => r.emp_status === 'Left').map(r => r.employee)).size), r => r.emp_status === 'Left', 'bad')}${card(t('branches'), nf(new Set(rows.map(r => r.branch).filter(Boolean)).size), r => !!r.branch)}</div>
      <div class="aar-grid">${panel(t('byEmp'), bars(t('byEmp'), group(rows, r => r.empName ? r.empName + ' (' + r.employee + ')' : r.employee), (r, n) => (r.empName ? r.empName + ' (' + r.employee + ')' : str(r.employee) || t('none')) === n, 12))}${panel(t('byBranch'), bars(t('byBranch'), group(rows, r => r.branch), kField('branch'), 15))}</div>
      <div class="aar-grid">${panel(t('byLoc'), bars(t('byLoc'), group(rows, r => r.custom_job_location), kField('custom_job_location'), 15))}${panel(t('byDept'), bars(t('byDept'), group(rows, r => r.employee_division), kField('employee_division'), 15))}</div>
      ${panel(t('emp') + ' — ' + t('st'), donut(t('emp'), group(rows, r => r.emp_status), kField('emp_status')))}`;
    }
    if (tab === 'categories') {
      const lines = rows.flatMap(r => r.items);
      return `<div class="aar-cards">${card(t('items'), nf(lines.length), r => r.items.length > 0)}${card(t('qty'), nf(qtySum(rows)), r => r.items.some(i => qnum(i.qty) !== null))}${card(t('issue'), nf(rows.filter(r => r.satus === 'Issue New').length), r => r.satus === 'Issue New')}${card(t('ret'), nf(rows.filter(r => r.satus === 'Return').length), r => r.satus === 'Return')}</div>
      <div class="aar-grid">${panel(t('byCat'), S.hasCat ? bars(t('byCat'), group(rows, cats), (r, n) => cats(r).includes(n), 15) : `<div class="aar-empty">${na()}</div>`)}${panel(t('byItem'), bars(t('byItem'), group(rows, r => [...new Set(r.items.map(i => i.item))]), (r, n) => r.items.some(i => (i.item || t('none')) === n), 15))}</div>
      <div class="aar-grid">${panel(t('byCond'), donut(t('byCond'), group(rows, r => [...new Set(r.items.map(i => i.cond))]), (r, n) => r.items.some(i => (i.cond || t('none')) === n)))}${panel(t('byAction'), donut(t('byAction'), group(rows, r => r.satus), kField('satus')))}</div>
      <div class="aar-alert">Category = IT Asset master “category” for each item line; quantity = sum of numeric values in the Data field “quanity” (non-numeric/blank excluded). Counts in breakdowns are records.</div>`;
    }
    if (tab === 'finance') return `<div class="aar-cards">${naCard(t('cost'))}${naCard(t('supplier'))}${naCard(t('purchase'))}${card(t('qty'), nf(qtySum(rows)), r => r.items.length > 0)}</div><div class="aar-alert">${t('costNote')}</div>${panel(t('byItem'), bars(t('byItem'), group(rows, r => [...new Set(r.items.map(i => i.item))]), (r, n) => r.items.some(i => (i.item || t('none')) === n), 10))}`;
    if (tab === 'audit') {
      const fl = [['employee', t('emp')], ['date', t('date')], ['branch', t('branch')], ['custom_job_location', t('location')], ['employee_division', t('depts')], ['approval_status', t('approval')], ['emp_status', 'Employee Status'], ['satus', t('act')], ['recieved_by', 'Received By'], ['attach_singed', 'Signed Form']];
      return `<div class="aar-cards">${audits(rows).map(([l, n, fn]) => card(l, nf(n), fn, n ? 'warn' : 'ok')).join('')}</div>
      ${panel(t('fieldsTitle'), `<div class="aar-tablewrap"><table class="aar-narrow"><thead><tr><th>${t('field')}</th><th>${t('present')}</th><th>${t('missing')}</th><th>%</th></tr></thead><tbody>${fl.map(([k, l]) => { const p = rows.filter(r => str(r[k])).length; return `<tr><td>${esc(l)}</td><td>${nf(p)}</td><td><a href="#" data-drill="${reg(l + ' — ' + t('missing'), r => !str(r[k]))}">${nf(rows.length - p)}</a></td><td>${rows.length ? Math.round(p / rows.length * 100) : 0}%</td></tr>`; }).join('')}</tbody></table></div>`)}`;
    }
    return `${panel(t('reports'), `<p class="aar-muted">${nf(rows.length)} ${t('filtered')} · ${t('ro')}</p><div class="aar-btns"><button class="aar-btn" data-action="export">${t('export')}</button><button class="aar-btn" data-action="exportItems">${t('exportItems')}</button><button class="aar-btn sec" data-action="erp">${t('openList')}</button></div>`)}
    <div class="aar-grid">${panel(t('byBranch'), bars(t('byBranch'), group(rows, r => r.branch), kField('branch'), 8))}${panel(t('byStatus'), bars(t('byStatus'), group(rows, docst), kStatus))}</div>`;
  }
  function drillView() {
    const d = S.drill, rows = filtered(d.fn);
    return `<section class="aar-panel aar-drill"><div class="aar-panel-head"><h2>${esc(d.label)} · ${nf(rows.length)}</h2><div class="aar-btns"><button class="aar-mini" data-action="drillErp">${t('openList')}</button><button class="aar-mini" data-action="export">${t('export')}</button><button class="aar-mini" data-action="closeDrill">✕ ${t('close')}</button></div></div><p class="aar-muted">${t('clickHint')}</p>${table(rows)}</section>`;
  }
  const opts = (arr, sel) => `<option value="">${t('all')}</option>` + arr.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  function render() {
    preds = [];
    const ae = root.querySelector('[data-f]:focus'), focusKey = ae && ae.dataset.f, caret = ae && ae.selectionStart;
    root.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr'); root.setAttribute('lang', S.lang);
    const rows = S.loaded ? filtered() : [], f = S.f;
    const uniq = fn => [...new Set(S.rows.map(fn).filter(Boolean))].sort();
    const emps = [...new Map(S.rows.filter(r => r.employee).map(r => [r.employee, (r.empName || r.employee) + ' · ' + r.employee])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const tabs = ['overview', 'register', 'employees', 'categories', 'finance', 'audit', 'reports'];
    root.innerHTML = `<header class="aar-hero"><div class="aar-brand"><div class="aar-logo">DM</div><div><small>DM GROUP KSA · INFORMATION TECHNOLOGY</small><h1>${t('title')}</h1><p>${t('sub')}</p></div></div><div class="aar-btns"><button data-action="lang">${S.lang === 'en' ? 'العربية' : 'English'}</button><button data-action="refresh" ${S.loading ? 'disabled' : ''}>↻ ${t('refresh')}</button></div></header>
    <div class="aar-toolbar">
      <div class="aar-field"><label>${t('scope')}</label><select data-f="scope">${[['it', t('itScope')], ['nonit', t('nonitScope')], ['all', t('allScope')]].map(([v, l]) => `<option value="${v}" ${f.scope === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="aar-field"><label>${t('from')}</label><input type="date" data-f="from" value="${esc(f.from)}"></div>
      <div class="aar-field"><label>${t('to')}</label><input type="date" data-f="to" value="${esc(f.to)}"></div>
      <div class="aar-field"><label>${t('emp')}</label><select data-f="emp">${opts(emps, f.emp)}</select></div>
      <div class="aar-field"><label>${t('branch')}</label><select data-f="branch">${opts(uniq(r => r.branch).map(x => [x, x]), f.branch)}</select></div>
      <div class="aar-field"><label>${t('cat')}</label><select data-f="cat">${opts([...new Set(S.rows.flatMap(cats))].sort().map(x => [x, x]), f.cat)}</select></div>
      <div class="aar-field"><label>${t('status')}</label><select data-f="status">${opts([['Draft', t('draft')], ['Submitted', t('submitted')], ['Cancelled', t('cancelled')]], f.status)}</select></div>
      <div class="aar-field"><label>${t('approval')}</label><select data-f="approval">${opts(uniq(r => r.approval_status).map(x => [x, x]), f.approval)}</select></div>
      <div class="aar-field wide"><label>${t('search')}</label><input type="search" data-f="q" value="${esc(f.q)}" placeholder="${t('searchPh')}"></div>
      <button class="aar-btn sec" data-action="reset">${t('reset')}</button>
    </div>
    <nav class="aar-tabs">${tabs.map(k => `<button data-tab="${k}" class="aar-tab ${k === S.tab && !S.drill ? 'active' : ''}">${t(k)}</button>`).join('')}</nav>
    ${S.loading ? `<div class="aar-loading"><div class="aar-spin"></div>${t('loading')}</div>` : ''}
    ${S.error ? `<div class="aar-error">${t('err')}<div class="aar-sm">${esc(S.error)}</div><button class="aar-mini" data-action="refresh">${t('retry')}</button></div>` : ''}
    ${S.loaded ? (S.drill ? drillView() : content(rows)) : ''}
    <footer class="aar-footer"><span>${t('loaded')}: ${nf(S.rows.length)} · ${t('filtered')}: ${nf(rows.length)}</span><span>${t('ro')}${S.updated ? ' · ' + t('updated') + ': ' + esc(S.updated.toLocaleString(S.lang === 'ar' ? 'ar-SA' : 'en-GB')) : ''}</span></footer>`;
    if (focusKey) { const el = root.querySelector(`[data-f="${focusKey}"]`); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) { } } }
  }
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
  function csv(name, head, data) {   /* now a PDF on the DM letterhead (name kept so the callers stay unchanged) */
    dmPdfExport(name, name.replace(/_/g, ' ').replace(/^DMG /, 'DM Group · '), head, data, { rtl: S.lang === 'ar', sub: t('title') });
  }
  const current = () => S.drill ? filtered(S.drill.fn) : filtered();
  const exportRecords = () => csv('DMG_IT_Asset_Acquisition', ['Record ID', 'Date', 'Employee ID', 'Employee Name', 'Employee Status', 'Division', 'Branch', 'Job Location', 'Request Type', 'Action', 'Approval', 'Doc Status', 'Items', 'ERP URL'], current().map(r => [r.name, r.d, r.employee, r.empName, r.emp_status, r.employee_division, r.branch, r.custom_job_location, r.request_type, r.satus, r.approval_status, docst(r), r.items.map(i => i.item).join('; '), location.origin + href(r.name)]));
  const exportItems = () => csv('DMG_IT_Asset_Acquisition_Items', ['Record ID', 'Date', 'Employee ID', 'Employee Name', 'Item', 'Category', 'Brand', 'Qty', 'Condition', 'DM Asset No', 'Doc Status'], current().flatMap(r => r.items.map(i => [r.name, r.d, r.employee, r.empName, i.item, i.cat, i.brand, i.qty, i.cond, i.assetno, docst(r)])));
  function drillErp() {
    const ids = current().map(r => r.name);
    if (!ids.length) return;
    if (ids.length <= 150 && frappe.route_options !== undefined) { frappe.route_options = { name: ['in', ids] }; frappe.set_route('List', DOC); }
    else window.open('/app/asset-acquisition-records/view/list', '_blank', 'noopener');
  }
  root.addEventListener('click', e => {
    const tg = e.target;
    const tab = tg.closest('[data-tab]'); if (tab) { S.tab = tab.dataset.tab; S.drill = null; S.page = 0; render(); return; }
    const pg = tg.closest('[data-page]'); if (pg) { S.page = +pg.dataset.page; render(); return; }
    const dr = tg.closest('[data-drill]'); if (dr) { e.preventDefault(); const p = preds[+dr.dataset.drill]; if (p) { S.drill = p; S.page = 0; render(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    const b = tg.closest('[data-action]'); if (!b) return;
    const a = b.dataset.action;
    if (a === 'lang') { S.lang = S.lang === 'en' ? 'ar' : 'en'; render(); }
    else if (a === 'refresh') load();
    else if (a === 'reset') { S.f = { from: '', to: '', scope: 'it', status: '', approval: '', emp: '', branch: '', cat: '', q: '' }; S.drill = null; S.page = 0; render(); }
    else if (a === 'export') exportRecords();
    else if (a === 'exportItems') exportItems();
    else if (a === 'erp') window.open('/app/asset-acquisition-records/view/list', '_blank', 'noopener');
    else if (a === 'drillErp') drillErp();
    else if (a === 'closeDrill') { S.drill = null; S.page = 0; render(); }
  });
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-drill],[role=button]')) { e.preventDefault(); e.target.click(); } });
  root.addEventListener('change', e => { const el = e.target.closest('[data-f]'); if (!el || el.dataset.f === 'q') return; S.f[el.dataset.f] = el.value; S.page = 0; render(); });
  let tmr; root.addEventListener('input', e => { const el = e.target.closest('[data-f="q"]'); if (!el) return; S.f.q = el.value; clearTimeout(tmr); tmr = setTimeout(() => { S.page = 0; render(); }, 250); });
  render(); load();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
