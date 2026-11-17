/* CEO Command Centre · v2 — Frappe Custom HTML Block (Script field).
   Decision & escalation centre: what needs the CEO, who owns it, and what happens next.
   Data: one read-only Server Script API, `ceo_command_center_api` (bootstrap / overview / department / actions / drilldown).
   Read-only: decisions are taken in the original ERP form with its native workflow and permissions.
   Previous version: legacy/dashboard.v1.js (kept for comparison testing until retirement is approved). */
(function () {
  'use strict';
  const root = typeof root_element !== 'undefined' ? root_element : document;
  const host = root.querySelector('#ceo-command-center');
  if (!host) return;
  if (host._ccDispose) host._ccDispose();
  const controller = new AbortController();
  let disposed = false, gen = 0, searchTimer;
  host._ccDispose = () => { disposed = true; gen++; clearTimeout(searchTimer); controller.abort(); };

  const API = 'ceo_command_center_api';
  const STORE = 'cc-v2-state';
  const DEPT_TEXT = {
    sales: 'Leads, DMS projects, quotations and sales orders that need follow-up. Performance uses invoiced and booked sales in the selected period.',
    procurement: 'Purchase requests, purchase orders, shipments and customs clearance. Old backlog is bundled separately from newly overdue demand.',
    finance: 'Receivables, credit-limit breaches, supplier payables, SOA and collection-list exceptions. Amounts stay in their own currency.',
    people: 'HR and admin approvals, leave returns, re-entry visas, facility rent and facility licences.',
    projects: 'Technical submittals, DMS contact requests and project tasks with a verified due date.',
    operations: 'Vehicle issues, maintenance, vehicle documents and delivery trips. Fleet rules match the Fleet dashboard.',
    manufacturing: 'Work orders, factory job orders, daily production reporting and monthly targets.',
    it: 'IT help-desk requests, subscription renewals, asset requests and repairs.',
    legal: 'Taradhi sessions and payments, legal cases, company registrations and document control.',
    dmcc: 'External DMCC business. Shown separately and never added to native ERP totals.'
  };
  const GROUPS = [['decision', 'My decisions'], ['escalation', 'Escalations'], ['followup', 'Department follow-up'], ['verification', 'Data verification']];
  const SEV = { critical: 'Critical', overdue: 'Overdue', due_soon: 'Due soon', pending: 'Pending', verify: 'Needs verification' };
  const STATE_TEXT = {
    complete: 'Complete', partial: 'Data incomplete', restricted: 'Permission restricted', not_configured: 'Not configured', unavailable: 'Source unavailable', configured: 'Configured', external: 'External'
  };
  const ICONS = {
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', open: '<path d="M14 4h6v6M20 4l-9 9M19 14v5H5V5h5"/>', left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    check: '<path d="m5 12 5 5L20 7"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  };
  const icon = k => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[k] || '') + '</svg>';

  /* ───────── Arabic UI text (ERP data is shown as recorded) ───────── */
  const AR = {
    'CEO Command Centre': 'مركز قيادة الرئيس التنفيذي', 'DM Group · Executive desk': 'مجموعة درر · المكتب التنفيذي', 'Refresh': 'تحديث', 'Loading…': 'جارٍ التحميل…',
    'Overview': 'نظرة عامة', 'Sales': 'المبيعات', 'Procurement': 'المشتريات', 'Finance': 'المالية', 'People & Admin': 'الموارد البشرية والإدارة', 'Projects': 'المشاريع',
    'Operations': 'العمليات', 'Manufacturing': 'التصنيع', 'IT & Assets': 'تقنية المعلومات والأصول', 'Legal & Compliance': 'الشؤون القانونية والامتثال', 'DMCC': 'DMCC',
    'Company': 'الشركة', 'All permitted companies': 'كل الشركات المسموح بها', 'Performance from': 'الأداء من', 'Performance to': 'الأداء إلى', 'Action due window': 'نافذة الاستحقاق',
    'Next 7 days': 'الأيام السبعة القادمة', 'Next 14 days': 'الأيام الأربعة عشر القادمة', 'Next 30 days': 'الأيام الثلاثون القادمة', 'Apply': 'تطبيق', 'Search actions': 'بحث في الإجراءات',
    'Title, owner, record or reason': 'العنوان أو المسؤول أو السجل أو السبب', 'My decisions': 'قراراتي', 'Escalations': 'التصعيدات', 'Department follow-up': 'متابعة الإدارات',
    'Data verification': 'التحقق من البيانات', 'Critical issues': 'مشكلات حرجة', 'Overdue': 'متأخر', 'Due within': 'مستحق خلال', 'days': 'أيام', 'Priority': 'الأولوية', 'Action': 'الإجراء',
    'Owner': 'المسؤول', 'Due date': 'تاريخ الاستحقاق', 'Impact': 'الأثر', 'Open': 'فتح', 'Unassigned': 'غير مسند', 'Primary action queue': 'قائمة الإجراءات الرئيسية',
    'Department action matrix': 'مصفوفة إجراءات الإدارات', 'Department': 'الإدارة', 'Decisions': 'قرارات', 'Critical': 'حرج', 'Follow-up': 'متابعة', 'Unowned': 'بلا مسؤول',
    'Oldest due': 'أقدم استحقاق', 'Upcoming commitments': 'الالتزامات القادمة', 'Company pulse': 'نبض الشركة', 'Source health': 'سلامة المصادر', 'Actions': 'الإجراءات',
    'Performance': 'الأداء', 'Upcoming': 'القادم', 'Data checks': 'فحوصات البيانات', 'View all': 'عرض الكل', 'Previous': 'السابق', 'Next': 'التالي', 'Open record': 'فتح السجل',
    'Open filtered list': 'فتح القائمة المصفاة', 'Open department dashboard': 'فتح لوحة الإدارة', 'Close': 'إغلاق', 'Reason': 'السبب', 'Status': 'الحالة', 'Due': 'الاستحقاق',
    'Amount': 'المبلغ', 'Source': 'المصدر', 'Record': 'السجل', 'Assigned in ERP': 'مسند في النظام', 'Open ToDos': 'مهام مفتوحة', 'Created by': 'أنشأه', 'Last change': 'آخر تعديل',
    'Related records': 'سجلات مرتبطة', 'No matching actions': 'لا توجد إجراءات مطابقة', 'Read-only': 'للقراءة فقط', 'Severity': 'الخطورة', 'All severities': 'كل الدرجات',
    'Owner filter': 'تصفية المسؤول', 'Anyone': 'الكل', 'Unowned only': 'بلا مسؤول فقط', 'Pending': 'قيد الانتظار', 'Due soon': 'قريب الاستحقاق', 'Needs verification': 'يحتاج تحقق',
    'Complete': 'مكتمل', 'Data incomplete': 'بيانات غير مكتملة', 'Permission restricted': 'صلاحية مقيدة', 'Not configured': 'غير مهيأ', 'Source unavailable': 'المصدر غير متاح',
    'currency not recorded': 'العملة غير مسجلة', 'items': 'عناصر', 'overdue': 'متأخر', 'Language': 'اللغة', 'English': 'English', 'العربية': 'العربية', 'Basis': 'الأساس',
    'Retry': 'إعادة المحاولة', 'Decision': 'قرار', 'old': 'عمر السجل', 'Actions: all open work, any date': 'الإجراءات: كل العمل المفتوح بأي تاريخ', 'Performance:': 'الأداء:',
    'Balances: as of today': 'الأرصدة: حتى اليوم', 'Due window:': 'نافذة الاستحقاق:', 'Permitted workflow actions for you': 'إجراءات سير عمل مسموحة لك', 'Safety, compliance or exposure flags': 'مؤشرات سلامة أو امتثال أو تعرض',
    'Actions past a recorded due date': 'إجراءات تجاوزت تاريخ استحقاق مسجل', 'Due actions + dated commitments': 'إجراءات مستحقة + التزامات مؤرخة',
    'These views can overlap and should not be added together. Bundled items count once in the queue; their record count is shown on the row.': 'قد تتداخل هذه العروض ولا يجب جمعها. العناصر المجمعة تُحسب مرة واحدة ويظهر عدد سجلاتها في الصف.',
    'Ordered by priority, then overdue days and due date. Click a row for evidence and the original record.': 'مرتبة حسب الأولوية ثم أيام التأخير وتاريخ الاستحقاق. انقر الصف لعرض الأدلة والسجل الأصلي.',
    'Counts of distinct actions per department. Click a department to open its tab with the same filters.': 'عدد الإجراءات المميزة لكل إدارة. انقر الإدارة لفتح تبويبها بنفس عوامل التصفية.',
    'A few verified signals. Each company is shown in its own currency; nothing is converted or summed across currencies.': 'مؤشرات موثقة قليلة. تظهر كل شركة بعملتها دون تحويل أو جمع بين العملات.',
    'Nothing in this view needs attention for the selected scope.': 'لا شيء في هذا العرض يحتاج انتباهًا ضمن النطاق المحدد.', 'Showing': 'عرض', 'of': 'من', 'Has owner': 'له مسؤول', 'All': 'الكل', 'Not loaded': 'لم يتم التحميل', 'sources': 'مصادر', 'need attention': 'تحتاج انتباه', 'Loaded': 'تم التحميل',
    'Approvals': 'الموافقات', 'Waiting for your decision': 'بانتظار قرارك', 'documents': 'مستندات', 'document': 'مستند', 'Value awaiting': 'القيمة المعلقة', 'Oldest waiting': 'أقدم انتظار',
    'Urgent': 'عاجل', 'High priority': 'أولوية عالية', 'Routine': 'روتيني', 'Stale': 'متقادم', 'Normal': 'عادي', 'High': 'عالي',
    'Deadline within 3 days, in progress or high value': 'موعد خلال 3 أيام أو قيد التنفيذ أو قيمة عالية', 'Deadline within 14 days or significant value': 'موعد خلال 14 يومًا أو قيمة كبيرة',
    'Small requests — safe to approve in bulk': 'طلبات صغيرة — يمكن اعتمادها دفعة واحدة', 'Dates already passed — tidy up': 'تواريخ انقضت — للتنظيف',
    'Urgent — decide today': 'عاجل — قرر اليوم', 'Stale — overtaken by events': 'متقادم — تجاوزته الأحداث', 'Sort': 'الترتيب', 'Priority': 'الأولوية', 'Nearest deadline': 'أقرب موعد',
    'Longest waiting': 'الأطول انتظارًا', 'Highest value': 'الأعلى قيمة', 'Document type': 'نوع المستند', 'Filtered view': 'عرض مصفّى', 'Show everything': 'عرض الكل',
    'Some approval sources could not be read:': 'تعذرت قراءة بعض مصادر الموافقات:', 'Nothing is waiting for your decision': 'لا يوجد ما ينتظر قرارك', 'No matching approvals': 'لا توجد موافقات مطابقة',
    'Select routine in this group': 'تحديد الروتيني في هذه المجموعة', 'selected': 'محدد', 'Approve selected': 'اعتماد المحدد', 'Select for bulk approval': 'تحديد للاعتماد الجماعي',
    'Waiting': 'الانتظار', 'Approve': 'اعتماد', 'Reject': 'رفض', 'Hold': 'تعليق', 'Resume': 'استئناف', 'Final APPROVAL': 'الاعتماد النهائي', 'Details': 'التفاصيل',
    'A rule in the ERP decides the final check.': 'قاعدة في النظام تحدد التحقق النهائي.', 'Open attachment': 'فتح المرفق', 'Recent comments': 'آخر التعليقات', 'Open full form': 'فتح النموذج كاملًا',
    'and': 'و', 'more': 'أخرى', 'completed': 'مكتمل', 'failed': 'فشل', 'Reason for rejection (required, added as a comment)': 'سبب الرفض (مطلوب، يُضاف كتعليق)',
    'Comment (optional, added to the document)': 'تعليق (اختياري، يُضاف إلى المستند)', 'Working…': 'جارٍ التنفيذ…', 'Done': 'تم', 'Cancel': 'إلغاء',
    'Applied through the ERP workflow with your own permissions, exactly like the button on the form. It is recorded in each document\'s history.': 'يُطبَّق عبر سير العمل في النظام بصلاحياتك، تمامًا مثل الزر في النموذج، ويُسجَّل في سجل كل مستند.',
    'Please give a reason for rejecting.': 'يرجى ذكر سبب الرفض.', 'decision applied': 'قرار طُبق', 'Decision applied, but the comment could not be saved:': 'طُبق القرار لكن تعذر حفظ التعليق:', 'Search approvals': 'بحث في الموافقات', 'Name, customer, employee or document number': 'الاسم أو العميل أو الموظف أو رقم المستند',
    'Decisions apply through the ERP workflow': 'القرارات تُطبق عبر سير العمل في النظام', 'Only documents at a step your role can act on': 'فقط المستندات في خطوة يمكن لدورك اتخاذ إجراء فيها', 'decisions applied': 'قرارات طُبقت',
    'Credit note request': 'طلب إشعار دائن', 'Loan application': 'طلب قرض', 'Quotation': 'عرض سعر', 'Sales order': 'أمر بيع', 'Leave': 'إجازة', 'Travel request': 'طلب سفر', 'Resignation': 'استقالة',
    'Contract renewal (Qiwa)': 'تجديد عقد (قوى)', 'Training': 'تدريب', 'General request': 'طلب عام', 'Letter': 'خطاب', 'Official memo': 'مذكرة رسمية', 'Event': 'فعالية',
    'Money & credit': 'المال والائتمان', 'Sales & pricing': 'المبيعات والتسعير', 'People & HR': 'الموظفون والموارد البشرية', 'Requests & admin': 'الطلبات والإدارة', 'Other approvals': 'موافقات أخرى',
    'Material rejected': 'رفض المواد', 'Invoicing error': 'خطأ في الفوترة', 'Discount error': 'خطأ في الخصم', 'Other reason': 'سبب آخر', 'Salesman error': 'خطأ المندوب',
    'Leave starts': 'تبدأ الإجازة', 'Last working day': 'آخر يوم عمل', 'Contract ends': 'ينتهي العقد', 'Training date': 'تاريخ التدريب', 'Event date': 'تاريخ الفعالية', 'Delivery due': 'موعد التسليم',
    'Decisions are applied through the ERP workflow with your own permissions, exactly like the button on each form, and are recorded in the document history. Priority rules: urgent = deadline within 3 days, in progress or value ≥ 50,000; high = deadline within 14 days or value ≥ 10,000; routine = requests under 1,000; stale = dates already passed.': 'تُطبَّق القرارات عبر سير العمل في النظام بصلاحياتك، مثل زر كل نموذج، وتُسجَّل في سجل المستند. قواعد الأولوية: عاجل = موعد خلال 3 أيام أو قيد التنفيذ أو قيمة ≥ 50,000؛ عالي = موعد خلال 14 يومًا أو قيمة ≥ 10,000؛ روتيني = طلبات أقل من 1,000؛ متقادم = تواريخ انقضت.'
  };
  const S = {
    lang: 'en', tab: 'overview', sub: 'actions', company: '', window: 7, from: '', to: '', q: '', group: '', severity: '', owner: '', page: 0, queueAll: false,
    boot: null, overview: null, dept: {}, busy: false, error: '', notices: [], drawer: null, drill: {}, allRows: null
  };
  const t = s => (S.lang === 'ar' && AR[s]) || s;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const today = () => frappe.datetime.get_today();
  const firstOfMonth = d => d.slice(0, 8) + '01';
  const loc = () => (S.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB');
  const n0 = v => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString(loc(), { maximumFractionDigits: 0 }));
  const pct = v => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%');
  function money(v, cur) {
    if (v == null || v === '' || isNaN(v)) return '<span class="muted">—</span>';
    const abs = Math.abs(Number(v)), dig = abs >= 1000 ? 0 : 2;
    const s = Number(v).toLocaleString(loc(), { minimumFractionDigits: dig, maximumFractionDigits: dig });
    return cur ? '<bdi class="ltr">' + esc(cur) + ' ' + s + '</bdi>' : '<bdi class="ltr">' + s + '</bdi> <small class="muted">· ' + t('currency not recorded') + '</small>';
  }
  const fmtDate = d => (d ? '<bdi class="ltr">' + esc(String(d).slice(0, 10)) + '</bdi>' : '<span class="muted">—</span>');
  const pill = (txt, cls) => '<span class="cc-pill ' + (cls || '') + '"><i></i>' + esc(t(txt)) + '</span>';
  const deptLabel = k => { if (k === 'overview') return t('Overview'); const d = (S.boot?.departments || []).find(x => x.key === k); return t(d ? d.label : k); };

  /* ───────── Persistence (per viewer convenience only) ───────── */
  function restore() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (v.lang === 'ar') S.lang = 'ar';
      ['tab', 'sub', 'company', 'window'].forEach(k => { if (v[k] != null) S[k] = v[k]; });
    } catch (e) { /* storage unavailable: defaults */ }
  }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify({ lang: S.lang, tab: S.tab, sub: S.sub, company: S.company, window: S.window })); } catch (e) { /* optional */ } }

  /* ───────── API (fetch, so server messages never pop up as dialogs) ───────── */
  async function call(action, args) {
    const body = new URLSearchParams(Object.assign({ action, company: S.company || '', window: String(S.window), from_date: S.from, to_date: S.to }, args || {}));
    const res = await fetch('/api/method/' + API, { method: 'POST', body, credentials: 'same-origin', signal: controller.signal,
      headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token, Accept: 'application/json' } });
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || !data || !data.message) {
      let msg = 'HTTP ' + res.status;
      try { const sm = JSON.parse(data._server_messages || '[]'); if (sm.length) msg = JSON.parse(sm[0]).message || msg; } catch (e) { /* keep status */ }
      if (data && data.exc_type) msg = data.exc_type + ': ' + msg;
      const err = new Error(String(msg).replace(/<[^>]+>/g, '')); err.status = res.status; throw err;
    }
    return data.message;
  }
  const key = () => [S.company, S.window, S.from, S.to].join('|');

  async function boot() {
    restore();
    S.to = today(); S.from = firstOfMonth(S.to);
    S.busy = true; render();
    try {
      S.boot = await call('bootstrap');
      const valid = ['overview', 'approvals'].concat(S.boot.departments.map(d => d.key));
      if (!valid.includes(S.tab)) { S.notices.push('Your remembered tab is no longer available, so Overview is shown.'); S.tab = 'overview'; }
      if (S.company && !S.boot.companies.some(c => c.name === S.company)) { S.notices.push('Your remembered company is not accessible any more; showing all permitted companies.'); S.company = ''; }
      if (![7, 14, 30].includes(Number(S.window))) S.window = 7;
      await load();
    } catch (e) { if (!disposed) { S.busy = false; S.error = e.message || String(e); render(); } }
  }
  async function load(force) {
    const my = ++gen; S.busy = true; S.error = ''; render();
    try {
      if (S.tab === 'overview') { if (force || !S.overview || S.overview._key !== key()) { const d = await call('overview'); d._key = key(); if (my !== gen) return; S.overview = d; } }
      else if (S.tab === 'approvals') { if (force || !S.appr || S.appr._key !== key()) { const d = await call('approvals'); d._key = key(); d.sources = []; if (my !== gen) return; S.appr = d; AP.sel.clear(); AP.detail = {}; } }
      else if (force || !S.dept[S.tab] || S.dept[S.tab]._key !== key()) { const d = await call('department', { department: S.tab }); d._key = key(); if (my !== gen) return; S.dept[S.tab] = d; }
    } catch (e) { if (my !== gen || disposed) return; S.error = e.message || String(e); }
    if (my !== gen || disposed) return;
    S.busy = false; render();
  }
  async function loadAll() {
    const my = gen; S.allRows = { busy: true, rows: [], total: 0 }; render();
    try {
      const d = await call('actions', { group: S.group || '', severity: S.severity || '', q: S.q || '', page: String(S.page), page_size: '25' });
      if (my !== gen) return; S.allRows = { busy: false, rows: d.rows, total: d.total };
    } catch (e) { S.allRows = { busy: false, rows: [], total: 0, error: e.message }; }
    render();
  }

  /* ───────── Building blocks ───────── */
  function stateBox(state, title, detail) {
    return '<div class="cc-state ' + esc(state || '') + '" role="status"><strong>' + esc(t(title)) + '</strong>' + (detail ? '<span>' + esc(detail) + '</span>' : '') + '</div>';
  }
  function ownerCell(a) {
    if (!a.owner) return '<span class="cc-unowned">' + t('Unassigned') + '</span>';
    return '<span class="cc-owner">' + esc(a.owner) + (a.owner_basis && a.owner_basis !== 'unassigned' ? '<small>' + esc(a.owner_basis) + '</small>' : '') + '</span>';
  }
  function dueCell(a) {
    if (!a.due) return '<span class="cc-due muted">—' + (a.age_days != null ? '<small>' + esc(a.age_days) + ' ' + t('days') + ' · ' + t('old') + '</small>' : '') + '</span>';
    const od = a.overdue_days;
    return '<span class="cc-due' + (od ? ' bad-text' : '') + '">' + fmtDate(a.due) + (od ? '<small class="bad-text">' + esc(od) + ' ' + t('days') + ' ' + t('overdue') + '</small>' : '') + (a.due_basis ? '<small>' + esc(a.due_basis) + '</small>' : '') + '</span>';
  }
  function queueTable(rows, opts) {
    opts = opts || {};
    if (!rows.length) return stateBox('', 'No matching actions', opts.empty || t('Nothing in this view needs attention for the selected scope.'));
    return '<div class="cc-table-wrap"><table><thead><tr><th class="cc-col-pri">' + t('Priority') + '</th><th>' + t('Action') + '</th><th class="cc-col-owner">' + t('Owner') + '</th><th class="cc-col-due">' + t('Due date') + '</th><th class="num cc-col-amt">' + t('Impact') + '</th><th class="cc-col-open"><span class="sr-only">' + t('Open') + '</span></th></tr></thead><tbody>'
      + rows.map(a => {
        const id = remember(a);
        return '<tr tabindex="0" data-key="' + esc(id) + '"><td>' + (a.group === 'decision' ? pill('Decision', 'decision') + '<br>' : '') + pill(SEV[a.severity] || a.severity, a.severity) + '</td>'
          + '<td><span class="cc-q-title">' + esc(a.title) + (a.bundle ? ' <span class="cc-pill muted">' + n0(a.bundle) + ' ' + t('items') + '</span>' : '') + '</span><span class="cc-q-reason">' + esc(a.reason) + '</span>'
          + '<span class="cc-q-meta">' + (opts.dept ? '' : '<span>' + esc(deptLabel(a.dept)) + '</span>') + '<bdi>' + esc(a.doctype) + (a.name && !a.bundle ? ' · ' + esc(a.name) : '') + '</bdi>' + (a.company ? '<span>' + esc(a.company) + '</span>' : '') + (a.status ? '<span>' + esc(a.status) + '</span>' : '') + '</span></td>'
          + '<td class="cc-col-owner">' + ownerCell(a) + '</td><td class="cc-col-due">' + dueCell(a) + '</td><td class="num cc-col-amt">' + (a.amount != null ? money(a.amount, a.currency) : '<span class="muted">—</span>') + '</td>'
          + '<td class="cc-col-open"><button class="cc-btn sm ghost" data-open="' + esc(id) + '" aria-label="' + esc(t('Open record')) + '">' + icon('open') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  const ROWS = new Map();
  function remember(a) { ROWS.set(a.key, a); return a.key; }

  function header() {
    const d = S.tab === 'overview' ? S.overview : S.tab === 'approvals' ? S.appr : S.dept[S.tab];
    const bad = d ? d.sources.filter(s => !['complete', 'configured'].includes(s.state) && s.scope !== 'external').length : 0;
    const status = S.busy ? t('Loading…') : d ? t('Loaded') + ' ' + esc(String(d.retrieved).slice(11, 16)) + ' · ' + d.sources.length + ' ' + t('sources') + (bad ? ' · <b>' + bad + ' ' + t('need attention') + '</b>' : '') : t('Not loaded');
    return '<header class="cc-header"><div><div class="cc-eyebrow">' + t('DM Group · Executive desk') + '</div><h2>' + t('CEO Command Centre') + '</h2><p role="status">' + status + '</p></div>'
      + '<div class="cc-hdr-btns"><button class="cc-btn" data-action="lang" aria-label="' + t('Language') + '">' + icon('globe') + (S.lang === 'ar' ? 'English' : 'العربية') + '</button>'
      + '<button class="cc-btn primary" data-action="refresh" ' + (S.busy ? 'disabled' : '') + '>' + icon('refresh') + (S.busy ? t('Loading…') : t('Refresh')) + '</button></div></header>';
  }
  function tabs() {
    const m = S.overview?.matrix || {};
    const items = [['overview', t('Overview')], ['approvals', t('Approvals')]].concat((S.boot?.departments || []).map(d => [d.key, t(d.label)]));
    return '<div class="cc-tabbar"><button class="cc-tab-arrow" data-scroll="-1" aria-label="' + t('Previous') + '">' + icon('left') + '</button><nav class="cc-tabs" role="tablist" aria-label="Departments">'
      + items.map(([k, l]) => {
        const c = m[k]; const hot = c ? (c.critical || 0) + (c.overdue || 0) : 0;
        const badge = k === 'approvals' ? ((S.appr || S.overview) ? '<span class="cc-badge' + (S.appr && apSummary(apItems()).tiers.urgent ? ' bad' : '') + '" title="' + esc(t('Waiting for your decision')) + '">' + n0(S.appr ? apItems().length : S.overview.counts_by_group.decision) + '</span>' : '') : k === 'overview' ? (S.overview ? '<span class="cc-badge" title="' + esc(t('My decisions')) + '">' + n0(S.overview.counts_by_group.decision) + '</span>' : '') : (c && hot ? '<span class="cc-badge bad" title="Critical + overdue actions">' + n0(hot) + '</span>' : '');
        return '<button role="tab" data-tab="' + k + '" aria-selected="' + (S.tab === k) + '" tabindex="' + (S.tab === k ? 0 : -1) + '">' + esc(l) + badge + '</button>';
      }).join('') + '</nav><button class="cc-tab-arrow" data-scroll="1" aria-label="' + t('Next') + '">' + icon('right') + '</button></div>';
  }
  function filters() {
    const cos = S.boot?.companies || [];
    if (S.tab === 'approvals') return '<form class="cc-filters ap-filters" data-form="filters" aria-label="Filters">'
      + '<label>' + t('Company') + '<select data-f="company"><option value="">' + t('All permitted companies') + '</option>' + cos.map(c => '<option value="' + esc(c.name) + '"' + (S.company === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>'
      + '<input type="hidden" data-f="from" value="' + esc(S.from) + '"><input type="hidden" data-f="to" value="' + esc(S.to) + '"><input type="hidden" data-f="window" value="' + esc(S.window) + '">'
      + '<button class="cc-btn primary" type="submit" ' + (S.busy ? 'disabled' : '') + '>' + t('Apply') + '</button>'
      + '<label class="cc-search">' + t('Search approvals') + '<input type="search" data-search placeholder="' + esc(t('Name, customer, employee or document number')) + '" value="' + esc(S.q) + '"></label></form>';
    return '<form class="cc-filters" data-form="filters" aria-label="Filters">'
      + '<label>' + t('Company') + '<select data-f="company"><option value="">' + t('All permitted companies') + '</option>' + cos.map(c => '<option value="' + esc(c.name) + '"' + (S.company === c.name ? ' selected' : '') + '>' + esc(c.name) + ' (' + esc(c.currency) + ')</option>').join('') + '</select></label>'
      + '<label>' + t('Performance from') + '<input type="date" data-f="from" value="' + esc(S.from) + '" max="' + esc(S.to || today()) + '"></label>'
      + '<label>' + t('Performance to') + '<input type="date" data-f="to" value="' + esc(S.to) + '" max="' + today() + '"></label>'
      + '<label>' + t('Action due window') + '<select data-f="window">' + [7, 14, 30].map(w => '<option value="' + w + '"' + (Number(S.window) === w ? ' selected' : '') + '>' + t('Next ' + w + ' days') + '</option>').join('') + '</select></label>'
      + '<button class="cc-btn primary" type="submit" ' + (S.busy ? 'disabled' : '') + '>' + t('Apply') + '</button>'
      + '<label class="cc-search">' + t('Search actions') + '<input type="search" data-search placeholder="' + esc(t('Title, owner, record or reason')) + '" value="' + esc(S.q) + '"></label></form>';
  }
  function scope() {
    if (S.tab === 'approvals') return '<div class="cc-scope">' + pill('Decisions apply through the ERP workflow', 'decision') + '<span>' + esc(S.company || t('All permitted companies')) + '</span><span class="sep">|</span><span>' + t('Only documents at a step your role can act on') + '</span></div>';
    const d = S.tab === 'overview' ? S.overview : S.dept[S.tab];
    const co = S.company ? S.company + (d?.currency ? ' · ' + d.currency : '') : t('All permitted companies');
    return '<div class="cc-scope">' + pill('Read-only', 'muted') + '<span>' + esc(co) + '</span><span class="sep">|</span><span>' + t('Actions: all open work, any date') + '</span><span class="sep">|</span><span>' + t('Performance:') + ' <bdi class="ltr">' + esc(S.from) + ' → ' + esc(S.to) + '</bdi></span><span class="sep">|</span><span>' + t('Balances: as of today') + '</span><span class="sep">|</span><span>' + t('Due window:') + ' ' + esc(S.window) + ' ' + t('days') + '</span></div>';
  }
  function healthBlock(sources, deptKey) {
    const list = (sources || []).filter(s => !deptKey || s.dept === deptKey || (deptKey && s.dept === 'all'));
    const bad = list.filter(s => !['complete', 'configured'].includes(s.state));
    return '<details class="cc-health"' + (bad.some(s => ['restricted', 'unavailable'].includes(s.state)) ? ' open' : '') + '><summary>' + t('Source health') + ' · ' + (bad.length ? bad.length + ' of ' + list.length + ' ' + t('need attention') : list.length + ' ' + t('sources') + ' · ' + t('Complete')) + '</summary>'
      + '<div class="cc-table-wrap"><table><thead><tr><th>' + t('Source') + '</th><th>' + t('Department') + '</th><th>' + t('Status') + '</th><th>DocTypes</th><th>Detail</th></tr></thead><tbody>'
      + list.map(s => '<tr><td>' + esc(s.label) + '</td><td>' + esc(s.dept === 'all' ? '—' : deptLabel(s.dept)) + '</td><td>' + pill(STATE_TEXT[s.state] || s.state, s.state === 'complete' || s.state === 'configured' ? 'good' : s.state === 'partial' || s.state === 'not_configured' ? 'warn' : 'bad') + (s.scope === 'unscoped' ? ' ' + pill('No company link', 'muted') : '') + '</td><td><bdi>' + esc((s.doctypes || []).join(', ')) + '</bdi></td><td>' + esc(s.message || '') + '</td></tr>').join('')
      + '</tbody></table></div></details>';
  }

  /* ───────── Overview ───────── */
  function overview() {
    const d = S.overview; if (!d) return '';
    const tot = d.totals, cg = d.counts_by_group;
    const att = [['decision', t('My decisions'), cg.decision, 'Permitted workflow actions for you'], ['critical', t('Critical issues'), tot.critical, 'Safety, compliance or exposure flags'],
      ['overdue', t('Overdue'), tot.overdue, 'Actions past a recorded due date'], ['due_soon', t('Due within') + ' ' + d.window + ' ' + t('days'), tot.due_soon + (d.upcoming_total || 0), 'Due actions + dated commitments']];
    let h = '<div class="cc-attention" role="group" aria-label="Attention">' + att.map(([k, l, v, s]) => '<button class="cc-att ' + k + '" data-att="' + k + '" aria-pressed="' + (S.severity === k || (k === 'decision' && S.group === 'decision' && !S.severity)) + '"><span>' + esc(l) + '</span><strong>' + n0(v) + '</strong><small>' + esc(t(s)) + '</small></button>').join('') + '</div>'
      + '<p class="cc-legend">' + t('These views can overlap and should not be added together. Bundled items count once in the queue; their record count is shown on the row.') + '</p>';
    // queue
    const grp = S.group || (cg.decision ? 'decision' : 'escalation');
    let rows;
    if (S.queueAll && S.allRows) rows = S.allRows.rows;
    else rows = (d.top[grp] || []).filter(a => matchSev(a) && matchQ(a));
    h += '<section class="cc-panel"><header><div><h3>' + t('Primary action queue') + '</h3><p>' + t('Ordered by priority, then overdue days and due date. Click a row for evidence and the original record.') + '</p></div>'
      + '<div class="cc-chips" role="group" aria-label="Queue groups">' + GROUPS.map(([k, l]) => '<button data-group="' + k + '" aria-pressed="' + (grp === k) + '">' + t(l) + ' <b>' + n0(cg[k]) + '</b></button>').join('') + '</div></header>'
      + (S.severity ? '<div class="cc-note">Filtered: ' + esc(t(SEV[S.severity] || S.severity)) + ' <button class="cc-link" data-action="clear-sev">Clear</button></div><br>' : '')
      + (S.queueAll && S.allRows?.busy ? stateBox('', 'Loading…') : queueTable(rows))
      + (S.queueAll ? pager(S.allRows?.total || 0, 25) : (cg[grp] > (d.top[grp] || []).length ? '<div class="cc-pager"><span>' + t('Showing') + ' ' + (d.top[grp] || []).length + ' ' + t('of') + ' ' + n0(cg[grp]) + '</span><button class="cc-btn sm" data-action="view-all">' + t('View all') + '</button></div>' : ''))
      + '</section>';
    // matrix
    const depts = (S.boot?.departments || []);
    h += '<section class="cc-panel"><header><div><h3>' + t('Department action matrix') + '</h3><p>' + t('Counts of distinct actions per department. Click a department to open its tab with the same filters.') + '</p></div></header><div class="cc-table-wrap"><table class="cc-matrix"><thead><tr><th>' + t('Department') + '</th><th class="num">' + t('Decisions') + '</th><th class="num">' + t('Critical') + '</th><th class="num">' + t('Overdue') + '</th><th class="num">' + t('Escalations') + '</th><th class="num">' + t('Follow-up') + '</th><th class="num">' + t('Unowned') + '</th><th>' + t('Oldest due') + '</th><th class="num">' + t('Data checks') + '</th></tr></thead><tbody>'
      + depts.map(x => { const m = d.matrix[x.key] || {}; const c = (v, bad) => '<td class="num' + (v ? '' : ' zero') + '">' + (v ? (bad ? '<b class="bad-text">' + n0(v) + '</b>' : '<b>' + n0(v) + '</b>') : '0') + '</td>';
        const unavailable = d.sources.filter(s => s.dept === x.key && ['restricted', 'unavailable'].includes(s.state)).length;
        return '<tr tabindex="0" data-dept="' + x.key + '"><td><b>' + esc(t(x.label)) + '</b>' + (unavailable ? ' ' + pill(unavailable + ' source' + (unavailable > 1 ? 's' : '') + ' unavailable', 'bad') : '') + '</td>' + c(m.decision) + c(m.critical, 1) + c(m.overdue, 1) + c(m.escalation) + c(m.followup) + c(m.unowned) + '<td>' + fmtDate(m.oldest_due) + '</td>' + c(m.verification) + '</tr>'; }).join('')
      + '</tbody></table></div></section>';
    h += '<div class="cc-grid2">' + upcomingPanel(d.upcoming, d.upcoming_total) + pulsePanel(d.performance) + '</div>';
    h += healthBlock(d.sources);
    return h;
  }
  const matchSev = a => !S.severity || (S.severity === 'decision' ? a.group === 'decision' : S.severity === 'due_soon' ? (a.severity === 'due_soon' || (a.due && a.due >= today() && !a.overdue_days)) : S.severity === 'overdue' ? !!a.overdue_days : a.severity === S.severity);
  const matchQ = a => !S.q || (a.title + ' ' + a.owner + ' ' + a.name + ' ' + a.doctype + ' ' + a.reason + ' ' + (a.company || '')).toLowerCase().includes(S.q.toLowerCase());
  function pager(total, size) {
    const pages = Math.max(1, Math.ceil(total / size));
    return '<div class="cc-pager"><span>' + n0(total) + ' ' + t('items') + ' · page ' + (S.page + 1) + ' / ' + pages + '</span><span><button class="cc-btn sm" data-page="-1" ' + (S.page <= 0 ? 'disabled' : '') + '>' + t('Previous') + '</button> <button class="cc-btn sm" data-page="1" ' + (S.page + 1 >= pages ? 'disabled' : '') + '>' + t('Next') + '</button> <button class="cc-btn sm ghost" data-action="view-top">Top items</button></span></div>';
  }
  function upcomingPanel(list, total) {
    list = (list || []).filter(u => !S.q || (u.title + ' ' + u.kind).toLowerCase().includes(S.q.toLowerCase()));
    return '<section class="cc-panel"><header><div><h3>' + t('Upcoming commitments') + '</h3><p>Dated commitments from today to ' + esc(S.overview?.horizon || '') + '. Overdue items stay in the queue regardless of this window.</p></div></header>'
      + (list.length ? '<ul class="cc-upcoming">' + list.slice(0, 40).map((u, i) => '<li><time>' + fmtDate(u.date) + '</time><div><button data-up="' + i + '">' + esc(u.title) + '</button><small>' + esc(u.kind) + ' · ' + esc(deptLabel(u.dept)) + (u.owner ? ' · ' + esc(u.owner) : '') + '</small></div><div class="num">' + (u.amount != null ? money(u.amount, u.currency) : '') + '</div></li>').join('') + '</ul>' + (total > 40 ? '<p class="cc-basis">' + (total - 40) + ' more in department tabs.</p>' : '')
        : stateBox('', 'No dated commitments in this window', 'Sources without dates cannot appear here.')) + '</section>';
  }
  function coTable(rows, cols) {
    if (!rows || !rows.length) return '<p class="muted">No records in this scope.</p>';
    return '<div class="cc-table-wrap"><table><thead><tr>' + cols.map(c => '<th' + (c[2] ? ' class="num"' : '') + '>' + esc(c[0]) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + cols.map(c => '<td' + (c[2] ? ' class="num"' : '') + '>' + c[1](r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function pulsePanel(p) {
    p = p || {};
    const s = p.sales?.by_company, fin = p.finance || {};
    let h = '<section class="cc-panel"><header><div><h3>' + t('Company pulse') + '</h3><p>' + t('A few verified signals. Each company is shown in its own currency; nothing is converted or summed across currencies.') + '</p></div></header><div class="cc-pulse">';
    if (s) h += '<div><h4>Sales · <bdi class="ltr">' + esc(s.period[0]) + ' → ' + esc(s.period[1]) + '</bdi></h4>' + coTable(s.rows, [['Company', r => esc(r.company)], ['Invoiced', r => money(r.invoiced, r.currency), 1], ['Target', r => r.target ? money(r.target, r.currency) : '<span class="muted">Not set</span>', 1], ['Attainment', r => r.attainment != null ? pct(r.attainment) : '—', 1]])
      + '<p class="cc-basis">' + esc(s.basis) + (s.target_state !== 'available' ? ' Targets: CEO Sales Target has no Overall records for this period.' : '') + '</p></div>';
    if (fin.cash) h += '<div><h4>Cash & bank (GL, today)</h4>' + coTable(fin.cash.rows, [['Company', r => esc(r.company)], ['Balance', r => money(r.amount, r.currency), 1]]) + '<p class="cc-basis">' + esc(fin.cash.basis) + '</p></div>';
    if (fin.receivables) h += '<div><h4>Receivables (invoice-based, today)</h4>' + coTable(fin.receivables.rows, [['Company', r => esc(r.company)], ['Outstanding', r => money(r.outstanding, r.currency), 1], ['Overdue', r => money(r.overdue, r.currency), 1]]) + '<p class="cc-basis">' + esc(fin.receivables.basis) + '</p></div>';
    if (fin.collections) h += '<div><h4>Customer receipts in period</h4>' + coTable(fin.collections.rows, [['Company', r => esc(r.company)], ['Received', r => money(r.amount, r.currency), 1], ['Entries', r => n0(r.count), 1]]) + '<p class="cc-basis">' + esc(fin.collections.basis) + '</p></div>';
    Object.keys(p).forEach(k => { if (p[k]?.error) h += '<div>' + stateBox(p[k].error.state, deptLabel(k) + ' · ' + (STATE_TEXT[p[k].error.state] || 'Unavailable'), p[k].error.message) + '</div>'; });
    return h + '</div></section>';
  }

  /* ───────── Department tab ───────── */
  function department() {
    const d = S.dept[S.tab]; if (!d) return '';
    const dash = d.dashboards || [];
    let h = '<div class="cc-dept-head"><div><h3>' + esc(deptLabel(S.tab)) + '</h3><p>' + esc(DEPT_TEXT[S.tab] || '') + '</p></div><div class="cc-dept-links">' + dash.map(x => '<a class="cc-btn sm" href="' + esc(x.route) + '">' + esc(x.label) + ' ' + icon('open') + '</a>').join('') + '</div></div>';
    const inds = (d.indicators || {})[S.tab] || [];
    if (inds.length) h += '<div class="cc-ind">' + inds.slice(0, 6).map(i => '<div class="' + esc(i.tone || '') + '"><span>' + esc(i.label) + '</span><strong>' + n0(i.value) + '</strong><small>' + esc(i.basis) + '</small></div>').join('') + '</div>';
    const subs = [['actions', 'Actions'], ['performance', 'Performance'], ['upcoming', 'Upcoming'], ['checks', 'Data checks']];
    h += '<div class="cc-seg" role="tablist" aria-label="Section">' + subs.map(([k, l]) => '<button role="tab" data-sub="' + k + '" aria-selected="' + (S.sub === k) + '">' + t(l) + (k === 'checks' ? ' · ' + n0((d.rows || []).filter(a => a.group === 'verification').length) : k === 'actions' ? ' · ' + n0((d.rows || []).filter(a => a.group !== 'verification').length) : '') + '</button>').join('') + '</div>';
    if (S.tab === 'dmcc') return h + dmcc(d);
    if (S.sub === 'performance') h += performance(d);
    else if (S.sub === 'upcoming') h += '<section class="cc-panel">' + upcomingInner(d) + '</section>';
    else if (S.sub === 'checks') h += checks(d);
    else h += deptActions(d);
    return h;
  }
  function deptActions(d) {
    let rows = (d.rows || []).filter(a => a.group !== 'verification');
    rows = rows.filter(a => (!S.group || a.group === S.group) && matchSev(a) && matchQ(a) && (!S.owner || (S.owner === 'unowned' ? a.unowned : !a.unowned)));
    const size = 25, pages = Math.max(1, Math.ceil(rows.length / size)); if (S.page >= pages) S.page = 0;
    const counts = {}; (d.rows || []).forEach(a => { counts[a.group] = (counts[a.group] || 0) + 1; });
    return '<section class="cc-panel"><div class="cc-toolbar"><div class="cc-chips" role="group" aria-label="Queue groups"><button data-group="" aria-pressed="' + !S.group + '">' + t('All') + ' <b>' + n0((d.rows || []).filter(a => a.group !== 'verification').length) + '</b></button>' + GROUPS.filter(g => g[0] !== 'verification').map(([k, l]) => '<button data-group="' + k + '" aria-pressed="' + (S.group === k) + '">' + t(l) + ' <b>' + n0(counts[k] || 0) + '</b></button>').join('') + '</div>'
      + '<div><label>' + t('Severity') + ' <select data-sev><option value="">' + t('All severities') + '</option>' + ['critical', 'overdue', 'due_soon', 'pending'].map(k => '<option value="' + k + '"' + (S.severity === k ? ' selected' : '') + '>' + t(SEV[k]) + '</option>').join('') + '</select></label> '
      + '<label>' + t('Owner filter') + ' <select data-owner><option value="">' + t('Anyone') + '</option><option value="unowned"' + (S.owner === 'unowned' ? ' selected' : '') + '>' + t('Unowned only') + '</option><option value="owned"' + (S.owner === 'owned' ? ' selected' : '') + '>' + t('Has owner') + '</option></select></label></div></div>'
      + sourceNotes(d) + queueTable(rows.slice(S.page * size, (S.page + 1) * size), { dept: 1 })
      + (rows.length > size ? '<div class="cc-pager"><span>' + n0(rows.length) + ' ' + t('items') + ' · page ' + (S.page + 1) + ' / ' + pages + '</span><span><button class="cc-btn sm" data-page="-1" ' + (S.page <= 0 ? 'disabled' : '') + '>' + t('Previous') + '</button> <button class="cc-btn sm" data-page="1" ' + (S.page + 1 >= pages ? 'disabled' : '') + '>' + t('Next') + '</button></span></div>' : '')
      + (d.row_total > (d.rows || []).length ? '<p class="cc-basis">Showing the first ' + n0(d.rows.length) + ' of ' + n0(d.row_total) + ' actions. Use the department dashboard for the full list.</p>' : '') + '</section>';
  }
  function sourceNotes(d) {
    const bad = (d.sources || []).filter(s => !['complete', 'configured'].includes(s.state));
    return bad.map(s => '<div class="cc-note ' + (s.state === 'partial' || s.state === 'not_configured' ? 'warn' : 'bad') + '"><b>' + esc(s.label) + ' — ' + esc(t(STATE_TEXT[s.state] || s.state)) + '.</b> ' + esc(s.message || '') + ' Its actions are not counted, so totals here are incomplete.</div>').join('') + (bad.length ? '<br>' : '')
      + ((d.sources || []).some(s => s.scope === 'unscoped') && S.company ? '<div class="cc-note">Some sources have no verified Company link and are not filtered by company. They are labelled “No company link” in Source health.</div><br>' : '');
  }
  function upcomingInner(d) {
    const list = (d.upcoming || []).filter(u => u.dept === S.tab);
    return '<header><div><h3>' + t('Upcoming commitments') + '</h3><p>Today to ' + esc(d.horizon) + '.</p></div></header>' + (list.length ? '<ul class="cc-upcoming">' + list.map(u => { return '<li><time>' + fmtDate(u.date) + '</time><div><button data-up-dept="' + (d.upcoming || []).indexOf(u) + '">' + esc(u.title) + '</button><small>' + esc(u.kind) + (u.owner ? ' · ' + esc(u.owner) : '') + '</small></div><div class="num">' + (u.amount != null ? money(u.amount, u.currency) : '') + '</div></li>'; }).join('') + '</ul>' : stateBox('', 'No dated commitments in this window', 'Only sources with a recorded date can appear here.'));
  }
  function checks(d) {
    const rows = (d.rows || []).filter(a => a.group === 'verification');
    return '<section class="cc-panel"><header><div><h3>' + t('Data checks') + '</h3><p>Source failures, missing mappings, contradictory statuses and incomplete targets. These are not counted as business actions.</p></div></header>'
      + (rows.length ? '<div class="cc-table-wrap"><table><thead><tr><th>Check</th><th>Detail</th><th class="num">Records</th><th></th></tr></thead><tbody>' + rows.map(a => { const id = remember(a); return '<tr tabindex="0" data-key="' + esc(id) + '"><td><b>' + esc(a.title) + '</b></td><td>' + esc(a.reason) + '</td><td class="num">' + (a.extra?.count != null ? n0(a.extra.count) : '—') + '</td><td>' + (a.list ? '<button class="cc-btn sm" data-list="' + esc(id) + '">' + t('Open filtered list') + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : stateBox('', 'No data checks raised', 'All sources for this department returned complete data.'))
      + '<br>' + healthBlock(d.sources, S.tab) + '</section>';
  }
  function performance(d) {
    const p = (d.performance || {})[S.tab];
    if (!p) return stateBox('not_configured', 'Not configured', 'No reconciled performance measure is defined for this department yet. Use the department dashboard.');
    let h = '';
    const blk = (title, body, basis) => { h += '<section class="cc-panel"><header><div><h3>' + esc(title) + '</h3>' + (basis ? '<p>' + esc(basis) + '</p>' : '') + '</div></header>' + body + '</section>'; };
    if (p.error) blk('Performance', stateBox(p.error.state, STATE_TEXT[p.error.state] || 'Unavailable', p.error.message));
    if (S.tab === 'sales') {
      if (p.by_company) blk('Sales by company', coTable(p.by_company.rows, [['Company', r => esc(r.company)], ['Invoiced', r => money(r.invoiced, r.currency), 1], ['Booked orders', r => money(r.booked, r.currency), 1], ['Target', r => r.target ? money(r.target, r.currency) + '<br><small class="muted">' + esc(r.target_basis) + '</small>' : '<span class="muted">Not set</span>', 1], ['Attainment', r => r.attainment != null ? pct(r.attainment) : '—', 1]]), p.by_company.basis);
      if (p.quotation_conversion) blk('Quotation conversion', '<div class="cc-ind"><div><span>Submitted quotations</span><strong>' + n0(p.quotation_conversion.submitted) + '</strong></div><div><span>Ordered / partly ordered</span><strong>' + n0(p.quotation_conversion.ordered) + '</strong></div><div><span>Conversion</span><strong>' + pct(p.quotation_conversion.rate) + '</strong></div></div>', p.quotation_conversion.basis);
    } else if (S.tab === 'procurement') {
      if (p.open_commitments) blk('Open purchase commitments', coTable(p.open_commitments.rows, [['Company', r => esc(r.company)], ['Open POs', r => n0(r.count), 1], ['PO value', r => money(r.amount, r.currency), 1]]), p.open_commitments.basis);
      if (p.receipts) blk('Receipts in period', coTable(p.receipts.rows, [['Company', r => esc(r.company)], ['Receipts', r => n0(r.count), 1], ['Net value', r => money(r.amount, r.currency), 1]]), p.receipts.basis);
    } else if (S.tab === 'finance') {
      if (p.cash) blk('Cash & bank', coTable(p.cash.rows, [['Company', r => esc(r.company)], ['GL balance', r => money(r.amount, r.currency), 1]]), p.cash.basis);
      if (p.receivables) blk('Receivables', coTable(p.receivables.rows, [['Company', r => esc(r.company)], ['Currency', r => esc(r.currency)], ['Outstanding', r => money(r.outstanding, r.currency), 1], ['Overdue', r => money(r.overdue, r.currency), 1], ['Overdue share', r => r.outstanding ? pct(100 * r.overdue / r.outstanding) : '—', 1]]), p.receivables.basis);
      if (p.collections) blk('Customer receipts in period', coTable(p.collections.rows, [['Company', r => esc(r.company)], ['Received', r => money(r.amount, r.currency), 1], ['Entries', r => n0(r.count), 1]]), p.collections.basis);
    } else if (S.tab === 'people') {
      if (p.workforce) blk('Workforce', coTable(p.workforce.rows, [['Company', r => esc(r.company)], ['Active employees', r => n0(r.count), 1]]), p.workforce.basis);
      if (p.payroll) blk('Payroll processing (current month)', p.payroll.rows.length ? coTable(p.payroll.rows, [['Payroll Entry', r => '<bdi>' + esc(r.name) + '</bdi>'], ['Company', r => esc(r.company)], ['Period', r => esc(r.period)], ['Status', r => pill(r.status || (r.docstatus ? 'Submitted' : 'Draft'), r.docstatus == 1 ? 'good' : 'warn')]]) : stateBox('', 'Payroll not run yet', 'No Payroll Entry covers this month. This is not a zero salary cost.'), p.payroll.basis);
    } else if (S.tab === 'projects') {
      if (p.submittal_status) blk('Submittals by status', bars(p.submittal_status.rows), p.submittal_status.basis);
      if (p.approvals) blk('Approvals in period', '<div class="cc-ind"><div><span>Approved submittals</span><strong>' + n0(p.approvals.count) + '</strong></div></div>', p.approvals.basis);
    } else if (S.tab === 'operations') {
      if (p.trips) blk('Delivery trips in period', bars(p.trips.rows), p.trips.basis);
      if (p.fleet) blk('Fleet master', bars(p.fleet.rows), p.fleet.basis);
    } else if (S.tab === 'manufacturing') {
      if (p.reporting) blk('Daily production reporting (30 days)', coTable(p.reporting.rows, [['Branch', r => esc(r.label)], ['Reports', r => n0(r.count), 1], ['Last report', r => fmtDate(r.last)]]), p.reporting.basis);
      if (p.targets) blk('Targets this month', p.targets.rows.length ? bars(p.targets.rows) : stateBox('not_configured', 'Not configured', 'No Manufacturing Production Target dated this month.'), p.targets.basis);
    }
    return h || stateBox('not_configured', 'Not configured', 'No reconciled performance measure for this department yet.');
  }
  function bars(rows) {
    if (!rows || !rows.length) return '<p class="muted">No records.</p>';
    const max = Math.max(1, ...rows.map(r => r.count || 0));
    return '<div class="cc-table-wrap"><table><tbody>' + rows.map(r => '<tr><td>' + esc(r.label || 'Not set') + '<div class="cc-bar"><i style="width:' + Math.round(100 * (r.count || 0) / max) + '%"></i></div></td><td class="num">' + n0(r.count) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function dmcc(d) {
    const c = (d.performance || {}).dmcc?.connection || { state: 'not_configured', message: '' };
    return '<section class="cc-panel"><header><div><h3>External DMCC connection</h3><p>DMCC data comes from an external system through its own server-side proxy. It is never added to ERP totals, and a failed connection is never shown as zero pending actions.</p></div></header>'
      + stateBox(c.state, STATE_TEXT[c.state] || c.state, c.message) + '<p class="cc-basis">Exception counts are enabled only after DMCC entity, status, ownership, currency and date mappings are verified. Use the DMCC dashboard for the live external view.</p></section>';
  }

  /* ───────── Drawer ───────── */
  function drawer() {
    const a = S.drawer; if (!a) return '';
    const dr = S.drill[a.key];
    const dash = (S.boot?.departments || []).find(x => x.key === a.dept)?.dashboards?.[0];
    const row = (k, v, small) => '<dt>' + esc(t(k)) + '</dt><dd>' + v + (small ? '<small>' + esc(small) + '</small>' : '') + '</dd>';
    let body = '<p>' + esc(a.reason) + '</p><dl>'
      + row('Priority', (a.group === 'decision' ? pill('Decision', 'decision') + ' ' : '') + pill(SEV[a.severity] || a.severity, a.severity) + ' ' + pill(GROUPS.find(g => g[0] === a.group)?.[1] || a.group, 'muted'))
      + row('Owner', a.owner ? esc(a.owner) : '<span class="cc-unowned">' + t('Unassigned') + '</span>', a.owner_basis !== 'unassigned' ? a.owner_basis : 'No responsible person recorded. The record creator is not treated as the owner.')
      + row('Due', a.due ? fmtDate(a.due) + (a.overdue_days ? ' · <span class="bad-text">' + a.overdue_days + ' ' + t('days') + ' ' + t('overdue') + '</span>' : '') : '—', a.due_basis || (a.age_days != null ? a.age_days + ' days since last change' : ''))
      + row('Amount', a.amount != null ? money(a.amount, a.currency) : 'Not available', a.amount_basis || 'No verified amount for this action.')
      + row('Status', esc(a.status || '—')) + row('Department', esc(deptLabel(a.dept))) + (a.company ? row('Company', esc(a.company)) : '')
      + row('Record', '<bdi>' + esc(a.doctype) + (a.name && !a.bundle ? ' · ' + esc(a.name) : '') + '</bdi>', a.bundle ? n0(a.bundle) + ' records in this bundle' : '')
      + (a.extra?.actions ? row('Your permitted actions', esc(a.extra.actions.join(', '))) : '') + '</dl>';
    if (!a.bundle && a.name && a.doctype && a.type !== 'source_state' && a.type !== 'data_check') {
      if (!dr) body += stateBox('', 'Loading…');
      else if (dr.error) body += stateBox('restricted', 'Record details unavailable', dr.error);
      else body += '<dl>' + row('Assigned in ERP', dr.assigned.length ? esc(dr.assigned.map(x => x.name).join(', ')) : '—')
        + row('Open ToDos', dr.todos.length ? dr.todos.map(x => esc(x.user) + ' · ' + fmtDate(x.date)).join('<br>') : '—')
        + row('Created by', esc(dr.created_by) + ' · ' + fmtDate(dr.fields.creation)) + row('Last change', esc(dr.modified_by) + ' · ' + esc(String(dr.fields.modified || '').slice(0, 16)))
        + (dr.related.length ? row('Related records', dr.related.map(r => r.doctype ? '<button class="cc-link" data-related="' + esc(r.doctype) + '|' + esc(r.value) + '">' + esc(r.label) + ': ' + esc(r.value) + '</button>' : esc(r.label) + ': ' + esc(r.value)).join('<br>')) : '') + '</dl>';
    }
    body += '<p class="cc-basis">Retrieved ' + esc((S.tab === 'overview' ? S.overview : S.dept[S.tab])?.retrieved || '') + '. Act in the original form; this centre does not approve, submit or reassign.</p>';
    return '<div class="cc-backdrop" data-action="close"></div><aside class="cc-drawer" role="dialog" aria-modal="true" aria-labelledby="cc-drawer-title"><header><div><h3 id="cc-drawer-title">' + esc(a.title) + '</h3><p class="muted"><bdi>' + esc(a.doctype) + '</bdi></p></div><button class="cc-close" data-action="close" aria-label="' + t('Close') + '">×</button></header>'
      + '<div class="cc-drawer-body">' + body + '</div><footer>'
      + (a.name && !a.bundle && a.doctype && a.type !== 'data_check' && a.type !== 'source_state' ? '<button class="cc-btn primary" data-route-form="1">' + icon('open') + t('Open record') + '</button>' : '')
      + (a.list ? '<button class="cc-btn' + (a.bundle ? ' primary' : '') + '" data-route-list="1">' + t('Open filtered list') + '</button>' : '')
      + (dash ? '<a class="cc-btn" href="' + esc(dash.route) + '">' + t('Open department dashboard') + '</a>' : '') + '</footer></aside>';
  }
  async function openDrawer(a) {
    S.drawer = a; S.returnFocus = a.key; render();
    if (a.bundle || !a.name || ['source_state', 'data_check'].includes(a.type) || S.drill[a.key]) return;
    try { S.drill[a.key] = await call('drilldown', { doctype: a.doctype, name: a.name }); }
    catch (e) { S.drill[a.key] = { error: e.message }; }
    if (S.drawer === a) render();
  }
  function openList(spec) {
    if (!spec) return;
    const opts = {};
    (spec.filters || []).forEach(f => { opts[f[0]] = f[1] === '=' ? f[2] : [f[1], f[2]]; });
    frappe.route_options = opts; frappe.set_route('List', spec.doctype);
  }

  /* ───────── Approvals inbox ─────────
     Everything waiting for the viewer's workflow decision, auto-categorised and prioritised by the API (explicit rules, shown
     as reasons on each card). Decisions go through Frappe's native frappe.model.workflow.apply_workflow — the same call as the
     form's action button — so roles, transition conditions and self-approval rules are enforced by the ERP itself. */
  const AP = { cat: '', tier: '', sort: 'priority', sel: new Set(), open: null, detail: {}, confirm: null, toast: '' };
  const TIERS = [['urgent', 'Urgent — decide today'], ['high', 'High priority'], ['normal', 'Normal'], ['stale', 'Stale — overtaken by events']];
  const TIER_SHORT = { urgent: 'Urgent', high: 'High', normal: 'Normal', stale: 'Stale' };
  async function post(method, params) {
    const res = await fetch('/api/method/' + method, { method: 'POST', body: new URLSearchParams(params), credentials: 'same-origin', signal: controller.signal,
      headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token, Accept: 'application/json' } });
    let data = null; try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || (data && data.exc)) {
      let msg = 'HTTP ' + res.status;
      try { const sm = JSON.parse((data && data._server_messages) || '[]'); if (sm.length) msg = JSON.parse(sm[sm.length - 1]).message || msg; } catch (e) { /* keep */ }
      throw new Error(String(msg).replace(/<[^>]+>/g, ''));
    }
    return data ? data.message : null;
  }
  const apItems = () => (S.appr?.items || []);
  function apVisible() {
    let xs = apItems().filter(a => (!AP.cat || a.category === AP.cat) && (!AP.tier || (AP.tier === 'routine' ? a.routine : a.priority === AP.tier))
      && (!S.q || (a.title + ' ' + a.requester + ' ' + a.name + ' ' + a.type_label + ' ' + (a.note || '') + ' ' + a.tags.join(' ')).toLowerCase().includes(S.q.toLowerCase())));
    const by = { oldest: (a, b) => b.waiting_days - a.waiting_days, value: (a, b) => (b.amount || 0) - (a.amount || 0),
      deadline: (a, b) => (a.days_to_deadline ?? 9e9) - (b.days_to_deadline ?? 9e9), type: (a, b) => a.type_label.localeCompare(b.type_label) || b.waiting_days - a.waiting_days };
    if (by[AP.sort]) xs = xs.slice().sort(by[AP.sort]);
    return xs;
  }
  function apSummary(items) {
    const s = { total: items.length, tiers: { urgent: 0, high: 0, normal: 0, stale: 0 }, categories: {}, value: {}, oldest: 0, routine: 0 };
    items.forEach(a => { s.tiers[a.priority]++; s.categories[a.category] = (s.categories[a.category] || 0) + 1; if (a.amount && a.currency) s.value[a.currency] = (s.value[a.currency] || 0) + a.amount; s.oldest = Math.max(s.oldest, a.waiting_days || 0); s.routine += a.routine ? 1 : 0; });
    return s;
  }
  function approvals() {
    const d = S.appr; if (!d) return '';
    const s = apSummary(apItems()), cats = d.categories || {};
    const tile = (k, label, v, sub, on) => '<button class="cc-att ' + k + '" data-aptier="' + k + '" aria-pressed="' + !!on + '"><span>' + esc(t(label)) + '</span><strong>' + n0(v) + '</strong><small>' + esc(t(sub)) + '</small></button>';
    const value = Object.keys(s.value).map(c => money(s.value[c], c)).join(' · ') || '—';
    let h = '<div class="ap-hero"><div><h3>' + t('Waiting for your decision') + '</h3><p>' + n0(s.total) + ' ' + t('documents') + ' · ' + t('Value awaiting') + ' ' + value + ' · ' + t('Oldest waiting') + ' ' + n0(s.oldest) + ' ' + t('days') + '</p></div>'
      + '<div class="ap-roles">' + (d.user_roles || []).map(r => pill(r, 'decision')).join(' ') + '</div></div>';
    h += '<div class="cc-attention ap-tiles">' + tile('urgent', 'Urgent', s.tiers.urgent, 'Deadline within 3 days, in progress or high value', AP.tier === 'urgent')
      + tile('high', 'High priority', s.tiers.high, 'Deadline within 14 days or significant value', AP.tier === 'high')
      + tile('routine', 'Routine', s.routine, 'Small requests — safe to approve in bulk', AP.tier === 'routine')
      + tile('stale', 'Stale', s.tiers.stale, 'Dates already passed — tidy up', AP.tier === 'stale') + '</div>';
    h += '<div class="ap-toolbar"><div class="cc-chips" role="group" aria-label="Categories"><button data-apcat="" aria-pressed="' + !AP.cat + '">' + t('All') + ' <b>' + n0(s.total) + '</b></button>'
      + Object.keys(cats).filter(k => s.categories[k]).map(k => '<button data-apcat="' + k + '" aria-pressed="' + (AP.cat === k) + '">' + esc(t(cats[k])) + ' <b>' + n0(s.categories[k]) + '</b></button>').join('') + '</div>'
      + '<label>' + t('Sort') + ' <select data-apsort>' + [['priority', 'Priority'], ['deadline', 'Nearest deadline'], ['oldest', 'Longest waiting'], ['value', 'Highest value'], ['type', 'Document type']].map(([k, l]) => '<option value="' + k + '"' + (AP.sort === k ? ' selected' : '') + '>' + t(l) + '</option>').join('') + '</select></label></div>';
    if (AP.tier || AP.cat || S.q) h += '<div class="cc-note">' + t('Filtered view') + ' <button class="cc-link" data-apclear="1">' + t('Show everything') + '</button></div>';
    if (d.problems && d.problems.length) h += '<div class="cc-note warn">' + t('Some approval sources could not be read:') + ' ' + esc(d.problems.join(', ')) + '</div>';
    const xs = apVisible();
    if (!apItems().length) return h + stateBox('', 'Nothing is waiting for your decision', 'New requests appear here as soon as they reach a step your role approves.');
    if (!xs.length) return h + stateBox('', 'No matching approvals', 'Change the filters or search.');
    if (AP.sort === 'priority') TIERS.forEach(([k, l]) => { const g = xs.filter(a => a.priority === k); if (g.length) h += '<section class="ap-group ' + k + '"><header><h4>' + esc(t(l)) + '</h4><span>' + n0(g.length) + '</span>' + (g.some(a => a.bulk) ? '<button class="cc-link" data-apselall="' + k + '">' + t('Select routine in this group') + '</button>' : '') + '</header>' + g.map(apCard).join('') + '</section>'; });
    else h += '<section class="ap-group">' + xs.map(apCard).join('') + '</section>';
    const sel = apItems().filter(a => AP.sel.has(a.key));
    if (sel.length) { const v = apSummary(sel).value; h += '<div class="ap-bulkbar" role="region" aria-label="Bulk approval"><span><b>' + n0(sel.length) + '</b> ' + t('selected') + (Object.keys(v).length ? ' · ' + Object.keys(v).map(c => money(v[c], c)).join(' · ') : '') + '</span><span><button class="cc-btn" data-apclearsel="1">' + t('Clear') + '</button> <button class="cc-btn ap-approve" data-apbulk="1">' + icon('check') + t('Approve selected') + ' (' + n0(sel.length) + ')</button></span></div>'; }
    return h;
  }
  function apCard(a) {
    const deadline = a.deadline ? '<span class="ap-meta-i">' + esc(t(a.deadline_label)) + ' ' + fmtDate(a.deadline) + '</span>' : '';
    const acts = a.actions.map(x => { const k = x.toLowerCase(); const cls = /approv|accept/.test(k) ? 'ap-approve' : /reject/.test(k) ? 'ap-reject' : /hold/.test(k) ? 'ap-hold' : ''; return '<button class="cc-btn sm ' + cls + '" data-apact="' + esc(a.key) + '" data-apaction="' + esc(x) + '">' + esc(t(x)) + '</button>'; }).join('');
    return '<article class="ap-card ' + a.priority + (AP.sel.has(a.key) ? ' selected' : '') + '" data-apkey="' + esc(a.key) + '">'
      + '<div class="ap-check">' + (a.bulk ? '<input type="checkbox" data-apsel="' + esc(a.key) + '" aria-label="' + esc(t('Select for bulk approval')) + '"' + (AP.sel.has(a.key) ? ' checked' : '') + '>' : '') + '</div>'
      + '<div class="ap-main"><div class="ap-top">' + pill(TIER_SHORT[a.priority], a.priority === 'urgent' ? 'critical' : a.priority === 'high' ? 'due_soon' : a.priority === 'stale' ? 'muted' : 'pending') + ' <span class="ap-type">' + esc(t(a.type_label)) + '</span>' + (a.routine ? ' ' + pill('Routine', 'good') : '') + ' <span class="ap-state">' + esc(a.state) + '</span></div>'
      + '<h4 class="ap-title">' + esc(a.title) + '</h4>'
      + '<div class="ap-meta">' + (a.requester && a.requester !== a.title ? '<span class="ap-meta-i">' + esc(a.requester) + '</span>' : '') + '<span class="ap-meta-i">' + fmtDate(a.date) + '</span><span class="ap-meta-i' + (a.waiting_days >= 30 ? ' warn-text' : '') + '">' + t('Waiting') + ' ' + n0(a.waiting_days) + ' ' + t('days') + '</span>' + deadline + (a.company ? '<span class="ap-meta-i">' + esc(a.company) + '</span>' : '') + '<bdi class="ap-meta-i muted">' + esc(a.name) + '</bdi></div>'
      + (a.why.length ? '<div class="ap-why">' + a.why.map(w => '<span class="ap-reason ' + a.priority + '">' + esc(w) + '</span>').join('') + '</div>' : '')
      + (a.tags.length ? '<div class="ap-tags">' + a.tags.map(x => '<span>' + esc(t(x)) + '</span>').join('') + '</div>' : '')
      + (a.facts.length ? '<dl class="ap-facts">' + a.facts.slice(0, 5).map(f => '<div><dt>' + esc(t(f[0])) + '</dt><dd>' + (typeof f[1] === 'number' ? money(f[1], a.currency) : esc(f[1])) + '</dd></div>').join('') + '</dl>' : '')
      + (a.note ? '<p class="ap-note">' + esc(String(a.note).replace(/<[^>]+>/g, ' ')) + '</p>' : '') + '</div>'
      + '<div class="ap-side">' + (a.amount != null ? '<div class="ap-amount"><small>' + esc(t(a.amount_label)) + '</small><strong>' + money(a.amount, a.currency) + '</strong>' + (a.amount_basis && a.currency ? '<small class="muted">' + esc(a.amount_basis) + '</small>' : '') + '</div>' : '')
      + '<div class="ap-actions">' + acts + '<button class="cc-btn sm ghost" data-apopen="' + esc(a.key) + '">' + t('Details') + '</button></div>' + (a.conditional ? '<small class="muted">' + t('A rule in the ERP decides the final check.') + '</small>' : '') + '</div></article>';
  }
  function apDrawer() {
    const a = AP.open && apItems().find(x => x.key === AP.open); if (!a) return '';
    const dd = AP.detail[a.key];
    const txt = v => { try { return new DOMParser().parseFromString(String(v), 'text/html').body.textContent || ''; } catch (e) { return String(v); } };
    let body = '<div class="ap-why">' + a.why.map(w => '<span class="ap-reason ' + a.priority + '">' + esc(w) + '</span>').join('') + '</div>';
    if (a.amount != null) body += '<div class="ap-amount big"><small>' + esc(t(a.amount_label)) + '</small><strong>' + money(a.amount, a.currency) + '</strong></div>';
    if (!dd) body += stateBox('', 'Loading…');
    else if (dd.error) body += stateBox('restricted', 'Details unavailable', dd.error);
    else {
      body += '<dl>' + dd.fields.filter(f => !/^(Workflow State|Amended From)$/.test(f.label)).map(f => '<dt>' + esc(f.label) + '</dt><dd>' + (/Attach/.test(f.type) ? '<a href="' + esc(f.value) + '" target="_blank" rel="noopener">' + t('Open attachment') + '</a>' : f.type === 'Check' ? '✓' : esc(txt(f.value)).slice(0, 1500)) + '</dd>').join('') + '</dl>';
      dd.tables.forEach(tb => { body += '<h4 class="ap-sub">' + esc(tb.label) + ' · ' + tb.rows.length + '</h4><div class="cc-table-wrap"><table><thead><tr>' + tb.columns.map(c => '<th>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>' + tb.rows.map(r => '<tr>' + tb.columns.map(c => '<td' + (/Currency|Float|Int/.test(c.type) ? ' class="num"' : '') + '>' + esc(r[c.field]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'; });
      if (dd.comments.length) body += '<h4 class="ap-sub">' + t('Recent comments') + '</h4><ul class="ap-comments">' + dd.comments.map(c => '<li><b>' + esc(c.by) + '</b> <small>' + esc(c.when) + '</small><p>' + esc(txt(c.content)) + '</p></li>').join('') + '</ul>';
      body += '<p class="cc-basis">' + t('Created by') + ' ' + esc(dd.created_by) + ' · ' + esc(dd.created) + ' · ' + t('Last change') + ' ' + esc(dd.modified_by) + ' · ' + esc(dd.modified) + '</p>';
    }
    const acts = a.actions.map(x => { const k = x.toLowerCase(); const cls = /approv|accept/.test(k) ? 'ap-approve' : /reject/.test(k) ? 'ap-reject' : /hold/.test(k) ? 'ap-hold' : ''; return '<button class="cc-btn ' + cls + '" data-apact="' + esc(a.key) + '" data-apaction="' + esc(x) + '">' + esc(t(x)) + '</button>'; }).join('');
    return '<div class="cc-backdrop" data-apclose="1"></div><aside class="cc-drawer ap-drawer" role="dialog" aria-modal="true" aria-labelledby="ap-dt"><header><div><p class="muted">' + esc(t(a.type_label)) + ' · <bdi>' + esc(a.name) + '</bdi></p><h3 id="ap-dt">' + esc(a.title) + '</h3><p class="muted">' + esc(a.requester) + ' · ' + esc(a.state) + '</p></div><button class="cc-close" data-apclose="1" aria-label="' + t('Close') + '">×</button></header>'
      + '<div class="cc-drawer-body">' + body + '</div><footer>' + acts + '<button class="cc-btn ghost" data-apform="' + esc(a.key) + '">' + icon('open') + t('Open full form') + '</button></footer></aside>';
  }
  function apModal() {
    const c = AP.confirm; if (!c) return '';
    const n = c.items.length, reject = /reject/i.test(c.action), done = c.done.length + c.failed.length;
    const list = c.items.slice(0, 8).map(a => '<li><b>' + esc(a.title) + '</b> <small class="muted">' + esc(t(a.type_label)) + ' · <bdi>' + esc(a.name) + '</bdi></small>' + (a.amount != null ? ' <span class="num">' + money(a.amount, a.currency) + '</span>' : '') + '</li>').join('') + (n > 8 ? '<li class="muted">… ' + t('and') + ' ' + n0(n - 8) + ' ' + t('more') + '</li>' : '');
    let body;
    if (c.finished) body = '<p><b>' + n0(c.done.length) + '</b> ' + t('completed') + (c.failed.length ? ', <b class="bad-text">' + n0(c.failed.length) + '</b> ' + t('failed') : '') + '.</p>' + (c.failed.length ? '<ul class="ap-fail">' + c.failed.map(f => '<li><b>' + esc(f.item.name) + '</b>: ' + esc(f.error) + '</li>').join('') + '</ul>' : '');
    else body = '<ul class="ap-confirm-list">' + list + '</ul><label class="ap-reason-box">' + (reject ? t('Reason for rejection (required, added as a comment)') : t('Comment (optional, added to the document)')) + '<textarea data-apcomment rows="3"' + (c.running ? ' disabled' : '') + '>' + esc(c.comment || '') + '</textarea></label>'
      + (c.running ? '<p role="status">' + t('Working…') + ' ' + n0(done) + ' / ' + n0(n) + '</p><div class="cc-bar"><i style="width:' + Math.round(100 * done / n) + '%"></i></div>' : '')
      + '<p class="cc-basis">' + t('Applied through the ERP workflow with your own permissions, exactly like the button on the form. It is recorded in each document\'s history.') + '</p>';
    const btn = c.finished ? '<button class="cc-btn primary" data-apdone="1">' + t('Done') + '</button>'
      : '<button class="cc-btn" data-apcancel="1"' + (c.running ? ' disabled' : '') + '>' + t('Cancel') + '</button><button class="cc-btn ' + (reject ? 'ap-reject solid' : /hold/i.test(c.action) ? 'ap-hold solid' : 'ap-approve') + '" data-apgo="1"' + (c.running ? ' disabled' : '') + '>' + esc(t(c.action)) + (n > 1 ? ' ' + n0(n) : '') + '</button>';
    return '<div class="cc-backdrop ap-modal-bg"></div><div class="ap-modal" role="alertdialog" aria-modal="true" aria-labelledby="ap-mt"><h3 id="ap-mt">' + esc(t(c.action)) + ' · ' + n0(n) + ' ' + (n === 1 ? t('document') : t('documents')) + '</h3>' + body + '<footer>' + btn + '</footer></div>';
  }
  async function apRun() {
    const c = AP.confirm; if (!c || c.running) return;
    c.comment = (host.querySelector('[data-apcomment]')?.value || '').trim();
    if (/reject/i.test(c.action) && !c.comment) { frappe.show_alert ? frappe.show_alert({ message: t('Please give a reason for rejecting.'), indicator: 'red' }) : alert(t('Please give a reason for rejecting.')); host.querySelector('[data-apcomment]')?.focus(); return; }
    c.running = true; render();
    for (const a of c.items) {
      const action = c.bulk ? a.approve_action : c.action;
      const who = (frappe.session && frappe.session.user) || '', whoName = (frappe.session && (frappe.session.user_fullname || frappe.session.user)) || '';
      const comment = () => post('frappe.desk.form.utils.add_comment', { reference_doctype: a.doctype, reference_name: a.name, content: esc(action + ' — CEO Command Centre: ' + c.comment), comment_email: who, comment_by: whoName });
      try {
        // A rejection reason is saved first: if it cannot be recorded, the rejection is not applied.
        if (c.comment && /reject/i.test(action)) await comment();
        await post('frappe.model.workflow.apply_workflow', { doc: JSON.stringify({ doctype: a.doctype, name: a.name }), action });
        if (c.comment && !/reject/i.test(action)) { try { await comment(); } catch (e) { c.failed.push({ item: a, error: t('Decision applied, but the comment could not be saved:') + ' ' + (e.message || e) }); } }
        c.done.push(a);
      } catch (e) { c.failed.push({ item: a, error: e.message || String(e) }); }
      if (disposed) return;
      render();
    }
    const doneKeys = new Set(c.done.map(a => a.key));
    S.appr.items = S.appr.items.filter(a => !doneKeys.has(a.key)); doneKeys.forEach(k => AP.sel.delete(k));
    if (AP.open && doneKeys.has(AP.open)) AP.open = null;
    S.overview = null; S.dept = {};
    c.running = false; c.finished = true; render();
  }
  function apStart(items, action, bulk) { AP.confirm = { items, action, bulk: !!bulk, done: [], failed: [], comment: '' }; render(); setTimeout(() => host.querySelector('.ap-modal textarea, .ap-modal [data-apgo]')?.focus(), 0); }
  async function apOpen(key) {
    AP.open = key; render(); host.querySelector('.ap-drawer .cc-close')?.focus();
    const a = apItems().find(x => x.key === key); if (!a || AP.detail[key]) return;
    try { AP.detail[key] = await call('approval_detail', { doctype: a.doctype, name: a.name }); } catch (e) { AP.detail[key] = { error: e.message }; }
    if (AP.open === key) render();
  }
  function apClick(el, d) {
    if (d.apcat !== undefined) { AP.cat = d.apcat; render(); return true; }
    if (d.aptier) { AP.tier = AP.tier === d.aptier ? '' : d.aptier; render(); return true; }
    if (d.apclear) { AP.cat = ''; AP.tier = ''; S.q = ''; render(); return true; }
    if (d.apselall) { apItems().filter(a => a.priority === d.apselall && a.bulk).forEach(a => AP.sel.add(a.key)); render(); return true; }
    if (d.apclearsel) { AP.sel.clear(); render(); return true; }
    if (d.apbulk) { const xs = apItems().filter(a => AP.sel.has(a.key) && a.bulk); if (xs.length) apStart(xs, 'Approve', true); return true; }
    if (d.apact) { const a = apItems().find(x => x.key === d.apact); if (a) apStart([a], d.apaction, false); return true; }
    if (d.apopen) { apOpen(d.apopen); return true; }
    if (d.apclose) { AP.open = null; render(); return true; }
    if (d.apform) { const a = apItems().find(x => x.key === d.apform); if (a) frappe.set_route('Form', a.doctype, a.name); return true; }
    if (d.apcancel) { AP.confirm = null; render(); return true; }
    if (d.apgo) { apRun(); return true; }
    if (d.apdone) { const c = AP.confirm; AP.confirm = null; AP.toast = c ? n0(c.done.length) + ' ' + t(c.done.length === 1 ? 'decision applied' : 'decisions applied') + (c.failed.length ? ' · ' + n0(c.failed.length) + ' ' + t('failed') : '') : ''; render(); setTimeout(() => { AP.toast = ''; if (!disposed) render(); }, 4000); return true; }
    return false;
  }

  /* ───────── Render ───────── */
  function render() {
    if (disposed) return;
    ROWS.clear();
    const keepFocus = host.querySelector(':focus')?.matches?.('[data-search]');
    let h = header() + tabs() + '<div class="cc-workspace">' + filters() + scope();
    h += S.notices.map(n => '<div class="cc-note warn">' + esc(n) + ' <button class="cc-link" data-action="dismiss">OK</button></div><br>').join('');
    const d = S.tab === 'overview' ? S.overview : S.tab === 'approvals' ? S.appr : S.dept[S.tab];
    if (S.error) h += stateBox(/permission|access/i.test(S.error) ? 'restricted' : 'error', /permission|access/i.test(S.error) ? 'Permission restricted' : 'Source unavailable', S.error) + '<p style="text-align:center;margin-top:10px"><button class="cc-btn" data-action="refresh">' + t('Retry') + '</button></p>';
    else if (S.busy && !d) h += '<div class="cc-skel" role="status" aria-label="' + t('Loading…') + '"><i></i><i></i><i></i></div>';
    else if (d) h += '<main class="cc-view" aria-busy="' + S.busy + '">' + (S.tab === 'overview' ? overview() : S.tab === 'approvals' ? approvals() : department()) + '</main>';
    h += S.tab === 'approvals' ? '<p class="cc-footnote">' + t('Decisions are applied through the ERP workflow with your own permissions, exactly like the button on each form, and are recorded in the document history. Priority rules: urgent = deadline within 3 days, in progress or value ≥ 50,000; high = deadline within 14 days or value ≥ 10,000; routine = requests under 1,000; stale = dates already passed.') + '</p></div>' + apDrawer() + apModal() + (AP.toast ? '<div class="ap-toast" role="status">' + esc(AP.toast) + '</div>' : '') : '';
    if (S.tab !== 'approvals') h += '<p class="cc-footnote">Read-only. Actions include all open work regardless of the performance period. Unavailable, restricted or unconfigured sources are labelled, never shown as zero. Policy ' + esc(S.boot?.policy?.version || '') + ': stalled = ' + esc(S.boot?.policy?.stale_days || 14) + ' days without change; receivables follow-up after ' + esc(S.boot?.policy?.ar_followup_days || 60) + ' days overdue.</p></div>' + drawer();
    host.innerHTML = h;
    host.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr'); host.setAttribute('lang', S.lang); host.classList.toggle('cc-rtl', S.lang === 'ar');
    const bar = host.querySelector('.cc-tabs'); if (bar) { bar.parentElement.classList.toggle('overflow', bar.scrollWidth > bar.clientWidth + 4); bar.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
    if (keepFocus) { const i = host.querySelector('[data-search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    if (S.drawer) host.querySelector('.cc-close')?.focus({ preventScroll: true });
    else if (S.returnFocus) { host.querySelector('[data-key="' + CSS.escape(S.returnFocus) + '"]')?.focus({ preventScroll: true }); S.returnFocus = null; }
  }

  /* ───────── Events ───────── */
  function switchTab(k) { if (k === S.tab) return; S.tab = k; S.page = 0; S.queueAll = false; S.allRows = null; if (k !== 'overview' && !['actions', 'performance', 'upcoming', 'checks'].includes(S.sub)) S.sub = 'actions'; persist(); load(); }
  host.addEventListener('click', ev => {
    if (ev.target.matches('[data-apsel]')) return;
    if (!ev.target.closest('button, a, input, select, textarea, label')) { const card = ev.target.closest('.ap-card'); if (card && host.contains(card)) { apOpen(card.dataset.apkey); return; } }
    const el = ev.target.closest('button, a, tr[data-key], tr[data-dept]'); if (!el || !host.contains(el)) return;
    const d = el.dataset;
    if (el.tagName === 'A') return;
    if (apClick(el, d)) return;
    if (d.tab) return switchTab(d.tab);
    if (d.scroll) { host.querySelector('.cc-tabs').scrollBy({ left: Number(d.scroll) * 240 * (S.lang === 'ar' ? -1 : 1), behavior: 'smooth' }); return; }
    if (d.dept && el.tagName === 'TR') return switchTab(d.dept);
    if (d.open) { ev.stopPropagation(); const a = ROWS.get(d.open); if (a) { if (a.bundle || !a.name || a.type === 'data_check' || a.type === 'source_state') openDrawer(a); else frappe.set_route('Form', a.doctype, a.name); } return; }
    if (d.list) { ev.stopPropagation(); openList(ROWS.get(d.list)?.list); return; }
    if (d.key && el.tagName === 'TR') { const a = ROWS.get(d.key); if (a) openDrawer(a); return; }
    if (d.att) { const k = d.att; if (k === 'decision') { switchTab('approvals'); return; } else { S.severity = S.severity === k ? '' : k; S.group = k === 'critical' ? 'escalation' : (k === 'overdue' ? S.group || 'escalation' : S.group || 'followup'); } S.queueAll = false; S.page = 0; render(); return; }
    if (d.group !== undefined) { S.group = d.group; S.page = 0; if (S.queueAll) loadAll(); else render(); return; }
    if (d.sub) { S.sub = d.sub; S.page = 0; persist(); render(); return; }
    if (d.page) { S.page = Math.max(0, S.page + Number(d.page)); if (S.tab === 'overview' && S.queueAll) loadAll(); else render(); return; }
    if (d.up !== undefined) { const u = S.overview.upcoming[Number(d.up)]; if (u) u.list ? openList(u.list) : frappe.set_route('Form', u.doctype, u.name); return; }
    if (d.upDept !== undefined) { const u = (S.dept[S.tab].upcoming || [])[Number(d.upDept)]; if (u) u.list ? openList(u.list) : frappe.set_route('Form', u.doctype, u.name); return; }
    if (d.routeForm) { frappe.set_route('Form', S.drawer.doctype, S.drawer.name); return; }
    if (d.routeList) { openList(S.drawer.list); return; }
    if (d.related) { const [dt, nm] = d.related.split('|'); frappe.set_route('Form', dt, nm); return; }
    switch (d.action) {
      case 'refresh': S.dept = {}; S.overview = S.tab === 'overview' ? S.overview : null; if (S.tab !== 'approvals') S.appr = null; S.drill = {}; load(true); break;
      case 'lang': S.lang = S.lang === 'ar' ? 'en' : 'ar'; persist(); render(); break;
      case 'close': S.drawer = null; render(); break;
      case 'view-all': S.queueAll = true; S.page = 0; if (!S.group) S.group = S.overview.counts_by_group.decision ? 'decision' : 'escalation'; loadAll(); break;
      case 'view-top': S.queueAll = false; S.page = 0; render(); break;
      case 'clear-sev': S.severity = ''; render(); break;
      case 'dismiss': S.notices = []; render(); break;
    }
  }, { signal: controller.signal });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (AP.confirm && !AP.confirm.running) { AP.confirm = null; render(); }
    else if (AP.open) { AP.open = null; render(); }
    else if (S.drawer) { S.drawer = null; render(); }
  }, { signal: controller.signal });
  host.addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target, from = f.querySelector('[data-f="from"]').value, to = f.querySelector('[data-f="to"]').value;
    if (!from || !to || from > to) { frappe.msgprint(__('Choose a performance period whose start is on or before its end.')); return; }
    if (frappe.datetime.get_day_diff(to, from) > 400) { frappe.msgprint(__('The performance period is limited to 400 days.')); return; }
    S.company = f.querySelector('[data-f="company"]').value; S.window = Number(f.querySelector('[data-f="window"]').value) || 7; S.from = from; S.to = to;
    S.page = 0; S.queueAll = false; S.allRows = null; persist(); load();
  }, { signal: controller.signal });
  host.addEventListener('change', ev => {
    const el = ev.target;
    if (el.matches('[data-apsort]')) { AP.sort = el.value; render(); }
    else if (el.matches('[data-apsel]')) { el.checked ? AP.sel.add(el.dataset.apsel) : AP.sel.delete(el.dataset.apsel); render(); }
    else if (el.matches('[data-sev]')) { S.severity = el.value; S.page = 0; render(); }
    else if (el.matches('[data-owner]')) { S.owner = el.value; S.page = 0; render(); }
  }, { signal: controller.signal });
  host.addEventListener('input', ev => {
    if (!ev.target.matches('[data-search]')) return;
    const v = ev.target.value; clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { S.q = v.trim(); S.page = 0; if (S.tab === 'overview' && S.queueAll) loadAll(); else render(); }, 250);
  }, { signal: controller.signal });
  host.addEventListener('keydown', ev => {
    if (ev.key === 'Tab' && S.drawer) {
      const f = [...host.querySelectorAll('.cc-drawer button, .cc-drawer a[href]')]; if (!f.length) return;
      const act = root.activeElement || document.activeElement, i = f.indexOf(act);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); } else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
    }
    const tab = ev.target.closest('[role="tab"][data-tab]');
    if (tab && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(ev.key)) {
      const all = [...host.querySelectorAll('[role="tab"][data-tab]')]; let i = all.indexOf(tab);
      const fwd = (ev.key === 'ArrowRight') !== (S.lang === 'ar');
      i = ev.key === 'Home' ? 0 : ev.key === 'End' ? all.length - 1 : (i + (fwd ? 1 : -1) + all.length) % all.length;
      ev.preventDefault(); all[i].focus(); return;
    }
    if (['Enter', ' '].includes(ev.key)) {
      const tr = ev.target.closest('tr[data-key], tr[data-dept]');
      if (tr && ev.target === tr) { ev.preventDefault(); tr.click(); }
    }
  }, { signal: controller.signal });
  const syncTheme = () => host.classList.toggle('cc-dark', document.documentElement.getAttribute('data-theme') === 'dark');
  syncTheme();
  const mo = new MutationObserver(syncTheme); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  controller.signal.addEventListener('abort', () => mo.disconnect());
  boot();
})();
