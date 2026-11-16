/* Folder Workspace Navigation — paste in a Frappe Custom HTML Block Script field.
 * Uses the authenticated native sidebar API, never a raw Workspace listing.
 * Optional: set data-workspace on the HTML section to pin an exact visible folder.
 */
(function () {
  'use strict';
  const scope = typeof root_element !== 'undefined' ? root_element : document;
  const root = scope.querySelector('[data-folder-directory]');
  if (!root) return;
  if (root._disposeFolderNavigation) root._disposeFolderNavigation();
  const $ = selector => root.querySelector(selector);
  const desk = window.frappe;
  const storageKey = 'dm.folderNavigation.language:' + (desk?.session?.user || 'current');
  let language = String(desk?.boot?.lang || 'en').startsWith('ar') ? 'ar' : 'en';
  try { const saved = localStorage.getItem(storageKey); if (saved === 'en' || saved === 'ar') language = saved; } catch (_) { /* Browser storage is optional. */ }
  let disposed = false, generation = 0, routeTimer, pages = [], children = [], folder = null, phase = 'loading';
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const text = (en, ar) => language === 'ar' ? ar : en;
  const glyphs = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    folder: '<path d="M3 7V5h6l2 2h10v12H3z"/>',
    sales: '<path d="M4 20V4M4 20h16M8 15l4-5 4 2 4-7"/>',
    finance: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 8h1m10 8h1"/>',
    procurement: '<path d="M3 4h2l2 11h11l3-8H6M9 20h.01M17 20h.01"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 20v-3a6 6 0 0 0-4-5"/>',
    projects: '<path d="M4 5h16v15H4zM8 3v4m8-4v4M8 11h8m-8 4h5"/>',
    truck: '<path d="M3 6h11v11H3zM14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    asset: '<rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21h8m-4-4v4"/>',
    document: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
    factory: '<path d="M3 21V10l6 3V8l6 4V3h4l2 18zM7 17h1m4 0h1m4 0h1"/>'
  };
  // Editorial text only: this catalog never creates cards or grants access.
  // Unknown/new children still appear automatically with their native title.
  const catalog = {
    'CEO Command Center': ['مركز القيادة التنفيذي', 'Pending decisions and business priorities.', 'القرارات المعلقة وأولويات الأعمال.', 'grid'],
    'CEO Agent': ['المساعد التنفيذي', 'Ask questions about permitted business information.', 'استفسر عن معلومات الأعمال المتاحة لك.', 'grid'],
    'DMCC Dashboard': ['لوحة أعمال المقاولات', 'Projects, rental operations and company finances.', 'المشاريع والتأجير والشؤون المالية للشركة.', 'projects'],
    'My Leads Dashboard': ['عملائي المحتملون', 'Assigned leads and follow-up commitments.', 'العملاء المحتملون المسندون ومواعيد المتابعة.', 'sales'],
    'Lead Management Dashboard': ['إدارة العملاء المحتملين', 'Lead intake, allocation and follow-up.', 'تسجيل العملاء المحتملين وتوزيعهم ومتابعتهم.', 'sales'],
    'DMS Sales Manager Dashboard': ['إدارة مبيعات المشاريع', 'Project opportunities and sales-team follow-up.', 'فرص المشاريع ومتابعة فريق المبيعات.', 'sales'],
    'Sales CRM & Conversion Tracker Dashboard': ['المبيعات ومتابعة التحويل', 'Opportunities, quotations and sales orders.', 'الفرص وعروض الأسعار وأوامر البيع.', 'sales'],
    'Pre-Procurement Command Center': ['مركز ما قبل الشراء', 'Material requests, open orders and delivery deadlines.', 'طلبات المواد وأوامر الشراء المفتوحة ومواعيد التسليم.', 'procurement'],
    'DN & GRN Tracker Dashboard': ['متابعة التسليم والاستلام', 'Delivery notes, goods receipts and outstanding quantities.', 'إشعارات التسليم واستلام البضائع والكميات المتبقية.', 'truck'],
    'Customs & Post-Procurement Dashboard': ['الجمارك وما بعد الشراء', 'Shipments, customs clearance and supplier documents.', 'الشحنات والتخليص الجمركي ومستندات الموردين.', 'procurement'],
    'Inventory Dashboard': ['لوحة المخزون', 'Stock balances, warehouses and item availability.', 'أرصدة المخزون والمستودعات وتوفر الأصناف.', 'grid'],
    'Accounts Payable Dashboard': ['الحسابات الدائنة', 'Supplier invoices, outstanding balances and payments.', 'فواتير الموردين والأرصدة المستحقة والمدفوعات.', 'finance'],
    'Treasury Dashboard': ['الخزينة', 'Cash position, commitments and planned payments.', 'الوضع النقدي والالتزامات والمدفوعات المخططة.', 'finance'],
    'Payroll cost center dashboard': ['تكلفة الرواتب حسب مركز التكلفة', 'Payroll costs by employee, department and cost center.', 'تكاليف الرواتب حسب الموظف والإدارة ومركز التكلفة.', 'finance'],
    'VAT & ZATCA Command Center': ['ضريبة القيمة المضافة والفوترة', 'Tax reporting and invoice-compliance checks.', 'التقارير الضريبية وفحص امتثال الفواتير.', 'document'],
    'Credit Controller Dashboard': ['مراقبة الائتمان', 'Receivables, credit limits and customer collections.', 'الذمم المدينة وحدود الائتمان وتحصيلات العملاء.', 'finance'],
    'Finance Manager dashboard': ['الإدارة المالية', 'Finance requests and pending reviews.', 'الطلبات المالية والمراجعات المعلقة.', 'finance'],
    'Finance internal  controller': ['الرقابة المالية الداخلية', 'Approval controls and financial exceptions.', 'ضوابط الموافقات والاستثناءات المالية.', 'finance'],
    'SOA Request Dashboard': ['طلبات كشف الحساب', 'Request and track customer account statements.', 'طلب كشوف حسابات العملاء ومتابعتها.', 'document'],
    'SOA Manager': ['إدارة كشوف الحساب والتحصيل', 'Review statement requests and collection lists.', 'مراجعة طلبات كشوف الحساب وقوائم التحصيل.', 'finance'],
    'SOA Collector': ['متابعة التحصيل', 'Assigned collection lists and customer follow-up.', 'قوائم التحصيل المسندة ومتابعة العملاء.', 'finance'],
    'Admin HR Dashboard': ['الموارد البشرية والإدارة', 'Employee requests, attendance and HR follow-up.', 'طلبات الموظفين والحضور ومتابعة الموارد البشرية.', 'people'],
    'Admin & HR Platforms Expiry Dashboard': ['صلاحية منصات الإدارة والموارد البشرية', 'Company, facility and employee renewal deadlines.', 'مواعيد تجديد وثائق الشركات والمرافق والموظفين.', 'document'],
    'Employee Dashboard Prototype': ['لوحة الموظف', 'Employee services, requests and assigned tasks.', 'خدمات الموظف وطلباته ومهامه المسندة.', 'people'],
    'Employee Dashboard': ['لوحة الموظف', 'Employee services, requests and assigned tasks.', 'خدمات الموظف وطلباته ومهامه المسندة.', 'people'],
    'Employee Vacation Tracker': ['متابعة إجازات الموظفين', 'Leave schedules, return dates and re-entry status.', 'جداول الإجازات ومواعيد العودة وحالة تأشيرات العودة.', 'people'],
    'Govt Relation Dashboard': ['العلاقات الحكومية', 'Company registrations, facility documents and renewals.', 'سجلات الشركات ووثائق المرافق والتجديدات.', 'document'],
    'Executive Secretary Dashboard': ['السكرتارية التنفيذية', 'Administrative requests, correspondence and appointments.', 'الطلبات الإدارية والمراسلات والمواعيد.', 'document'],
    'DM Technical Department Command Center': ['مركز الإدارة الفنية', 'Submittals, approvals and technical follow-up.', 'التقديمات والموافقات والمتابعة الفنية.', 'projects'],
    'DMS Technical Department Dashboard': ['المتابعة الفنية للمشاريع', 'Project submissions, reviews and revisions.', 'تقديمات المشاريع والمراجعات والتعديلات.', 'projects'],
    'DMS My Projects Dashboard': ['مشاريعي', 'Assigned projects, contacts and follow-up.', 'المشاريع المسندة وجهات الاتصال والمتابعة.', 'projects'],
    'DM contracting Dept. Dashboard': ['إدارة المقاولات', 'Contract projects, site activity and commitments.', 'مشاريع المقاولات ونشاط المواقع والالتزامات.', 'projects'],
    'DM IT Asset Acquisition Dashboard': ['اقتناء أصول تقنية المعلومات', 'Equipment requests, purchases and asset acquisition.', 'طلبات المعدات ومشترياتها واقتناء الأصول.', 'asset'],
    'IT Platforms Expiry Dashboard': ['صلاحية المنصات التقنية', 'Software, hosting and subscription renewals.', 'تجديد البرمجيات والاستضافة والاشتراكات.', 'asset'],
    'ERP User Access Dashboard': ['صلاحيات مستخدمي النظام', 'User accounts, roles and access reviews.', 'حسابات المستخدمين والأدوار ومراجعة الصلاحيات.', 'asset'],
    'Digital Marketing Dashboard': ['التسويق الرقمي', 'Campaign activity, marketing spend and lead attribution.', 'نشاط الحملات والإنفاق التسويقي ومصادر العملاء المحتملين.', 'sales'],
    'Fleet Dashboard': ['إدارة الأسطول', 'Vehicle availability, maintenance and fuel records.', 'توفر المركبات والصيانة وسجلات الوقود.', 'truck'],
    'FM & Inventory Dashboard': ['المرافق والمخزون', 'Facilities, assets and inventory oversight.', 'الإشراف على المرافق والأصول والمخزون.', 'grid'],
    'Logistics Dashboard': ['الخدمات اللوجستية', 'Delivery execution and purchasing follow-up.', 'تنفيذ عمليات التسليم ومتابعة الشراء.', 'truck'],
    'Operation Dashboard': ['لوحة العمليات', 'Operational commitments, stock and production activity.', 'الالتزامات التشغيلية والمخزون ونشاط الإنتاج.', 'factory'],
    'Delivery Forklift Dashboard': ['التسليم والرافعات الشوكية', 'Delivery trips and forklift operations.', 'رحلات التسليم وعمليات الرافعات الشوكية.', 'truck'],
    'Scaffolding rental - Employee Dashboard': ['تأجير السقالات', 'Rental deliveries, returns and employee assignments.', 'تسليمات التأجير والمرتجعات وتكليفات الموظفين.', 'truck'],
    'Manufacturing Dashboard': ['التصنيع', 'Factory performance, work plans and production targets.', 'أداء المصانع وخطط العمل وأهداف الإنتاج.', 'factory'],
    'Production Dashboard': ['الإنتاج', 'Work orders, output, materials and workforce activity.', 'أوامر العمل والإنتاج والمواد ونشاط العاملين.', 'factory'],
    'Plant & Furniture Asset Dashboard': ['أصول المعدات والأثاث', 'Asset movements, maintenance and recorded condition.', 'حركات الأصول وصيانتها وحالتها المسجلة.', 'asset'],
    'Taradhi/Legal Dashboard': ['القضايا القانونية وتراضي', 'Legal cases, sessions and payment commitments.', 'القضايا القانونية والجلسات والتزامات السداد.', 'document'],
    'DM Document Control Command Center': ['مراقبة المستندات', 'Document approvals, signatures and filing follow-up.', 'موافقات المستندات والتوقيعات ومتابعة الحفظ.', 'document'],
    'Durar Messenger': ['مراسلات درر', 'Team conversations and shared communication.', 'محادثات الفرق والتواصل المشترك.', 'people'],
    'Durar Sheets': ['جداول درر', 'Shared spreadsheets and team working documents.', 'جداول البيانات المشتركة ومستندات عمل الفريق.', 'document'],
    'Leadership & Corporate': ['القيادة والشؤون المؤسسية', 'Executive workspaces and company oversight.', 'مساحات العمل التنفيذية والإشراف المؤسسي.', 'folder'],
    'Sales & CRM': ['المبيعات وعلاقات العملاء', 'Sales and customer relationship workspaces.', 'مساحات عمل المبيعات وعلاقات العملاء.', 'folder'],
    'Procurement & Supply Chain': ['المشتريات وسلسلة الإمداد', 'Purchasing, receiving and shipment workspaces.', 'مساحات عمل الشراء والاستلام والشحنات.', 'folder'],
    'Finance & Credit Control': ['المالية والرقابة الائتمانية', 'Finance, credit and collection workspaces.', 'مساحات عمل المالية والائتمان والتحصيل.', 'folder'],
    'HR & Administration': ['الموارد البشرية والإدارة', 'People services and administration workspaces.', 'مساحات عمل خدمات الموظفين والشؤون الإدارية.', 'folder'],
    'Technical & Projects': ['الشؤون الفنية والمشاريع', 'Technical delivery and project workspaces.', 'مساحات عمل التنفيذ الفني والمشاريع.', 'folder'],
    'IT & Digital Systems': ['تقنية المعلومات والأنظمة الرقمية', 'IT services, equipment and digital platforms.', 'الخدمات التقنية والمعدات والمنصات الرقمية.', 'folder'],
    'Operations & Logistics': ['العمليات والخدمات اللوجستية', 'Operations, fleet and manufacturing workspaces.', 'مساحات عمل العمليات والأسطول والتصنيع.', 'folder'],
    'Legal & Documentation': ['الشؤون القانونية والمستندات', 'Legal affairs and document-control workspaces.', 'مساحات عمل الشؤون القانونية ومراقبة المستندات.', 'folder']
  };
  for (const prefix of ['CP', 'CSD', 'EP', 'MP', 'SRD', 'WP']) catalog[prefix + ' Blocked Customer'] = [prefix + ' — العملاء المحظورون', 'Blocked-customer balances and collection exposure.', 'أرصدة العملاء المحظورين ومخاطر التحصيل.', 'finance'];
  const metadata = new Map(Object.entries(catalog).map(([key, value]) => [normalize(key), value]));
  function entry(page) { return metadata.get(normalize(page.title)) || metadata.get(normalize(page.name)); }
  function title(page) { const meta = entry(page); return language === 'ar' && meta ? meta[0] : String(page.title || page.name || ''); }
  function description(page) { const meta = entry(page); return meta ? meta[language === 'ar' ? 2 : 1] : text('Open the dashboards and tools in this workspace.', 'افتح لوحات العمل والأدوات في مساحة العمل هذه.'); }
  function slug(value) { return desk?.router?.slug ? desk.router.slug(value) : String(value).toLowerCase().replace(/ /g, '-'); }
  function decode(value) { try { return decodeURIComponent(String(value || '')); } catch (_) { return String(value || ''); } }
  function identityMatches(page, value) {
    const candidate = normalize(decode(value));
    return [page.name, page.title, slug(page.name || ''), slug(page.title || '')].some(v => normalize(v) === candidate);
  }
  function currentFolder(allowed) {
    const pinned = root.dataset.workspace;
    if (pinned) { const matches = allowed.filter(p => p.name === pinned || p.title === pinned); return matches.length === 1 ? matches[0] : null; }
    const route = desk?.get_route ? desk.get_route() : [];
    let routeValue, isPrivate = false;
    if (route[0] === 'Workspaces') { isPrivate = route[1] === 'private'; routeValue = route[isPrivate ? 2 : 1]; }
    else if (route.length === 1) routeValue = route[0];
    if (routeValue) {
      const matches = allowed.filter(p => Boolean(Number(p.public)) !== isPrivate && identityMatches(p, routeValue));
      return matches.length === 1 ? matches[0] : null;
    }
    if (route.length && route[0] !== 'Workspaces') return null;
    const current = desk?.workspace?.current_page;
    const matches = current ? allowed.filter(p => Boolean(Number(p.public)) === Boolean(current.public) && identityMatches(p, current.name)) : [];
    return matches.length === 1 ? matches[0] : null;
  }
  function directChildren(allowed, parent) {
    const seen = new Set();
    return allowed.filter(page => {
      if (Number(page.is_hidden) || Boolean(Number(page.public)) !== Boolean(Number(parent.public))) return false;
      if (page.name === parent.name || (page.parent_page !== parent.name && page.parent_page !== parent.title)) return false;
      const key = String(page.name || page.title); if (!key || seen.has(key)) return false; seen.add(key); return true;
    });
  }
  function url(page) { return '/app/' + (Number(page.public) ? '' : 'private/') + encodeURIComponent(slug(page.title || page.name)); }
  function icon(name, className) {
    const span = document.createElement('span'); if (className) span.className = className;
    span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (glyphs[name] || glyphs.grid) + '</svg>'; return span;
  }
  function card(page) {
    const link = document.createElement('a'); link.className = 'fnav-card'; link.href = url(page); link.dataset.workspaceName = page.name || page.title;
    const meta = entry(page), hasChildren = pages.some(p => !Number(p.is_hidden) && p.parent_page === page.title && Number(p.public) === Number(page.public));
    link.appendChild(icon(hasChildren ? 'folder' : meta?.[3] || 'grid', 'fnav-icon'));
    const copy = document.createElement('span'); copy.className = 'fnav-copy';
    const label = document.createElement('span'); label.className = 'fnav-title'; label.textContent = title(page);
    const detail = document.createElement('span'); detail.className = 'fnav-description'; detail.textContent = description(page);
    copy.append(label, detail); link.appendChild(copy);
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); arrow.setAttribute('viewBox', '0 0 24 24'); arrow.setAttribute('aria-hidden', 'true'); arrow.classList.add('fnav-arrow');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'm9 5 7 7-7 7'); arrow.appendChild(path); link.appendChild(arrow);
    return link;
  }
  function render() {
    if (disposed) return;
    root.dir = language === 'ar' ? 'rtl' : 'ltr'; root.lang = language;
    $('[data-heading]').textContent = text('Dashboards & tools', 'لوحات العمل والأدوات');
    const count = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US').format(children.length);
    $('[data-caption]').textContent = folder ? title(folder) + ' · ' + count + text(' workspaces', ' مساحات عمل') : text('Choose a workspace to continue.', 'اختر مساحة عمل للمتابعة.');
    for (const button of root.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === language));
    $('[data-refresh]').disabled = phase === 'loading'; $('[data-refresh]').title = text('Refresh workspaces', 'تحديث مساحات العمل'); $('[data-refresh]').setAttribute('aria-label', $('[data-refresh]').title);
    $('.fnav-language').setAttribute('aria-label', text('Language', 'اللغة'));
    const input = $('[data-search]'); input.placeholder = text('Find a workspace', 'ابحث عن مساحة عمل'); $('[data-search-label]').textContent = input.placeholder;
    $('[data-search-wrap]').hidden = phase !== 'ready' || (children.length < 5 && !input.value);
    const grid = $('[data-grid]'); grid.replaceChildren(); grid.setAttribute('aria-label', text('Child workspaces', 'مساحات العمل الفرعية'));
    const query = normalize(input.value);
    const visible = children.filter(p => !query || normalize([p.title, p.name, title(p), description(p)].join(' ')).includes(query));
    const messages = {
      loading: text('Loading workspaces…', 'جار تحميل مساحات العمل…'),
      error: text('Workspaces could not be loaded. Try refreshing.', 'تعذر تحميل مساحات العمل. حاول التحديث.'),
      context: text('Open a folder workspace to see its dashboards.', 'افتح مساحة عمل مجلد لعرض لوحاتها.'),
      empty: text('No workspaces are available in this folder for your account.', 'لا تتوفر مساحات عمل في هذا المجلد لحسابك.'),
      search: text('No workspaces match your search.', 'لا توجد مساحات عمل تطابق بحثك.')
    };
    let message = phase === 'ready' ? (!children.length ? 'empty' : !visible.length ? 'search' : '') : phase;
    const status = $('[data-status]'); status.hidden = !message; status.textContent = messages[message] || ''; status.dataset.error = String(phase === 'error');
    if (phase === 'ready') for (const page of visible) grid.appendChild(card(page));
    const footnote = $('[data-footnote]'); footnote.hidden = phase !== 'ready' || !children.length;
    footnote.textContent = text('Showing workspaces available to your account.', 'تظهر مساحات العمل المتاحة لحسابك.');
  }
  async function load() {
    const token = ++generation;
    // Remove stale names before checking permissions again. Never fall back to a raw list.
    pages = []; children = []; folder = null; phase = 'loading'; render();
    try {
      if (!desk || !desk.session?.user || desk.session.user === 'Guest') throw new Error('No authenticated Desk session');
      const response = await desk.call({ method: 'frappe.desk.desktop.get_workspace_sidebar_items', args: {}, type: 'GET', freeze: false, silent: true, timeout: 30000 });
      if (disposed || token !== generation) return;
      if (response?.exc || !Array.isArray(response?.message?.pages)) throw new Error('Invalid sidebar response');
      pages = response.message.pages.filter(p => p && typeof p === 'object' && (p.name || p.title) && !Number(p.is_hidden) && (Number(p.public) || p.for_user === desk.session.user));
      folder = currentFolder(pages);
      if (!folder) { phase = 'context'; children = []; }
      else { children = directChildren(pages, folder); phase = 'ready'; }
    } catch (_) { if (disposed || token !== generation) return; pages = []; children = []; folder = null; phase = 'error'; }
    render();
  }
  function onClick(event) {
    const languageButton = event.target.closest('[data-language]');
    if (languageButton) { language = languageButton.dataset.language === 'ar' ? 'ar' : 'en'; try { localStorage.setItem(storageKey, language); } catch (_) {} render(); return; }
    if (event.target.closest('[data-refresh]')) load();
  }
  function onInput() { render(); }
  function onRoute() {
    clearTimeout(routeTimer); ++generation; pages = []; children = []; folder = null; phase = 'loading'; render();
    routeTimer = setTimeout(() => { if (!disposed && root.isConnected) { $('[data-search]').value = ''; load(); } }, 120);
  }
  root.addEventListener('click', onClick); $('[data-search]').addEventListener('input', onInput);
  if (desk?.router?.on) desk.router.on('change', onRoute);
  root._disposeFolderNavigation = function () {
    disposed = true; ++generation; clearTimeout(routeTimer); root.removeEventListener('click', onClick); $('[data-search]').removeEventListener('input', onInput);
    if (desk?.router?.off) desk.router.off('change', onRoute);
  };
  load();
})();
