/* DM Executive Secretary & Admin dashboard v1 — Custom HTML Block > Script field. Paste exec_admin_dashboard.css into the Style field; leave HTML empty.
 * Needs the Server Script "EXEC ADMIN API" (Script Type: API, method exec_admin_api) from exec_admin_api_server_script.py.
 * Read-only: every row opens the original record (General Request Form, DM Facilities Management, DM Letters, DM Official Memo,
 * IT / Procurement renewals, Daily Visitors Record) where the normal workflow applies.
 * English / Arabic switch in the top bar (remembered in this browser, shared with the SOA dashboards). Light + dark follow the desk theme.
 */
(function () {
	'use strict';
	const ROOT = root_element;
	const LANG_KEY = 'soa_lang';
	let LANG = 'en';
	try { LANG = localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch (_) { /* ignore */ }
	const MISSING = new Set();
	const AR = {
		'Overview': 'نظرة عامة', 'Requests': 'الطلبات', 'Renewals': 'التجديدات', 'Correspondence': 'المراسلات', 'Facilities & Rent': 'المرافق والإيجارات', 'Visitors': 'الزوار',
		'Executive Office': 'مكتب السكرتارية التنفيذية', 'Administrative operations': 'العمليات الإدارية',
		'Good morning, {0}': 'صباح الخير، {0}', 'Good afternoon, {0}': 'مساء الخير، {0}', 'Good evening, {0}': 'مساء الخير، {0}',
		'Updated {0}': 'آخر تحديث {0}', 'Refresh': 'تحديث', 'Switch language': 'تغيير اللغة',
		'{0} visitors today': '{0} زوار اليوم', '1 visitor today': 'زائر واحد اليوم', 'No visitors today': 'لا يوجد زوار اليوم',
		'Open admin requests': 'طلبات إدارية مفتوحة', '{0} older than {1} days': '{0} أقدم من {1} أيام', 'All within {0} days': 'كلها خلال {0} أيام',
		'Renewals due in {0} days': 'تجديدات خلال {0} يوماً', '{0} already expired': '{0} منتهية بالفعل', 'None expired': 'لا يوجد منتهٍ',
		'Pending signatures': 'بانتظار التوقيع', 'Letters & memos': 'خطابات ومذكرات',
		'Rent due in {0} days': 'إيجارات مستحقة خلال {0} يوماً', 'Overdue follow-ups': 'متابعات متأخرة', 'Requests · renewals · rent': 'طلبات · تجديدات · إيجارات',
		'Admin action queue': 'قائمة الإجراءات الإدارية', 'Renewals & expiry': 'التجديدات وتواريخ الانتهاء', 'Correspondence register': 'سجل المراسلات',
		'Rent & facility follow-ups': 'متابعة الإيجارات والمرافق', 'Visitors this week': 'زوار هذا الأسبوع',
		'View all': 'عرض الكل', '{0} open': '{0} مفتوح', '{0} listed': '{0} مدرج', '{0} awaiting filing': '{0} بانتظار الحفظ', '{0} unpaid': '{0} غير مدفوع',
		'Request': 'الطلب', 'Requested by': 'مقدم الطلب', 'Branch': 'الفرع', 'Type': 'النوع', 'Date': 'التاريخ', 'Age': 'المدة', 'Stage': 'المرحلة', 'Amount': 'المبلغ',
		'Item': 'البند', 'Facility / agreement': 'المرفق / الاتفاقية', 'Category': 'الفئة', 'Vendor / authority': 'المورد / الجهة', 'Expiry': 'تاريخ الانتهاء', 'Status': 'الحالة', 'Responsible': 'المسؤول',
		'Reference': 'المرجع', 'Subject': 'الموضوع', 'Company / to': 'الشركة / إلى', 'By': 'بواسطة',
		'Facility': 'المرفق', 'Landlord': 'المؤجر', 'Instalment': 'القسط', 'Due': 'الاستحقاق', 'Paid by': 'طريقة الدفع',
		'Visitor': 'الزائر', 'Company': 'الشركة', 'Host': 'المستضيف', 'Department': 'القسم', 'Phone': 'الجوال',
		'{0} d': '{0} يوم', 'Today': 'اليوم', 'Tomorrow': 'غداً',
		'Expired {0} d ago': 'منتهٍ منذ {0} يوم', 'Expires today': 'ينتهي اليوم', 'Due in {0} days': 'خلال {0} يوماً', 'On track · {0} d': 'ضمن المدة · {0} يوم',
		'Overdue {0} d': 'متأخر {0} يوم', 'Due today': 'مستحق اليوم', 'Overdue': 'متأخر',
		'Awaiting approval': 'بانتظار الاعتماد', 'Awaiting signed copy': 'بانتظار النسخة الموقعة', 'Filed': 'محفوظ', 'Under review': 'قيد المراجعة',
		'Printed': 'مطبوع', 'Received': 'مستلم', 'To file': 'بانتظار الحفظ', 'Rejected': 'مرفوض', 'Draft': 'مسودة',
		'Letter': 'خطاب', 'Memo': 'مذكرة', 'Letters': 'الخطابات', 'Memos': 'المذكرات',
		'Lease': 'إيجار', 'Licence': 'ترخيص', 'Permit': 'تصريح', 'Service contract': 'عقد خدمة', 'IT subscription': 'اشتراك تقنية', 'Procurement': 'المشتريات',
		'Rent agreement': 'عقد الإيجار', 'Lease contract': 'عقد التأجير', 'Commercial Registration (CR)': 'السجل التجاري', 'Commercial licence (Baladiya)': 'رخصة البلدية',
		'Civil Defence certificate': 'شهادة الدفاع المدني', 'National Address': 'العنوان الوطني', 'Industrial licence': 'الترخيص الصناعي',
		'Construction environmental permit': 'التصريح البيئي الإنشائي', 'Operational environmental permit': 'التصريح البيئي التشغيلي',
		'Fire maintenance contract': 'عقد صيانة الحريق', 'Cleaning contract': 'عقد النظافة', 'Camera maintenance contract': 'عقد صيانة الكاميرات',
		'General Payment/Service Requests': 'طلبات الدفع والخدمات', 'Vehicle Related Requests': 'طلبات المركبات', 'General Requests': 'طلبات عامة', 'Renewal Requests': 'طلبات التجديد',
		'Search': 'بحث', 'Search request, employee or branch': 'ابحث بالطلب أو الموظف أو الفرع', 'Search item, facility or vendor': 'ابحث بالبند أو المرفق أو المورد',
		'Search subject, reference or person': 'ابحث بالموضوع أو المرجع أو الشخص', 'Search facility or landlord': 'ابحث بالمرفق أو المؤجر', 'Search visitor, company or host': 'ابحث بالزائر أو الشركة أو المستضيف',
		'All types': 'كل الأنواع', 'All branches': 'كل الفروع', 'All stages': 'كل المراحل', 'All categories': 'كل الفئات', 'All statuses': 'كل الحالات', 'Letters & memos ': 'الخطابات والمذكرات',
		'Overdue only': 'المتأخر فقط', 'Expired': 'منتهٍ', 'Next {0} days': 'خلال {0} يوماً', 'Everything listed': 'كل المدرج',
		'Nothing open': 'لا يوجد شيء مفتوح', 'No admin requests are waiting.': 'لا توجد طلبات إدارية بالانتظار.',
		'Nothing due': 'لا يوجد شيء مستحق', 'No renewals in the next {0} days.': 'لا توجد تجديدات خلال {0} يوماً.',
		'No correspondence': 'لا توجد مراسلات', 'No letters or memos in the last {0} days.': 'لا توجد خطابات أو مذكرات خلال آخر {0} يوماً.',
		'All rent paid': 'كل الإيجارات مدفوعة', 'No unpaid instalments in the next {0} days.': 'لا توجد أقساط غير مدفوعة خلال {0} يوماً.',
		'No visitors booked': 'لا يوجد زوار مسجلون', 'No visitors in the next 7 days.': 'لا يوجد زوار خلال الأيام السبعة القادمة.',
		'No matches': 'لا توجد نتائج', 'Try another search or filter.': 'جرّب بحثاً أو فلتراً آخر.',
		'Could not load the dashboard': 'تعذّر تحميل اللوحة', 'Something went wrong. Try again.': 'حدث خطأ. حاول مرة أخرى.',
		'Some sections could not load: {0}': 'تعذّر تحميل بعض الأقسام: {0}', 'Try again': 'حاول مرة أخرى',
		'Showing {0} of {1}': 'عرض {0} من {1}', 'SAR': 'ر.س', 'Open in ERPNext': 'فتح في النظام',
		'requests': 'الطلبات', 'renewals': 'التجديدات', 'register': 'المراسلات', 'rent': 'الإيجارات', 'visitors': 'الزوار',
		'Approvals': 'الاعتمادات', 'Pending approvals': 'اعتمادات معلقة', 'approvals': 'الاعتمادات', '{0} waiting over {1} days': '{0} بانتظار أكثر من {1} أيام', 'None waiting over {0} days': 'لا شيء ينتظر أكثر من {0} أيام',
		'Approvals pending': 'الاعتمادات المعلقة', 'From the Approvals Pending page · purchase-order items excluded': 'من صفحة الاعتمادات المعلقة · باستثناء أوامر الشراء', '{0} documents': '{0} مستند',
		'Document': 'المستند', 'Waiting': 'الانتظار', 'Waiting since': 'بانتظار منذ', 'Card': 'البطاقة', 'All cards': 'كل البطاقات', 'All document types': 'كل أنواع المستندات', 'Waiting over {0} days': 'بانتظار أكثر من {0} أيام',
		'Search document, person or stage': 'ابحث عن مستند أو شخص أو مرحلة', 'Copy reminder': 'نسخ التذكير', 'Reminder copied': 'تم نسخ التذكير', 'Nothing waiting': 'لا شيء بانتظار الاعتماد', 'No approvals are pending.': 'لا توجد اعتمادات معلقة.',
		'{0} d since last update': '{0} يوم منذ آخر تحديث', 'Could not load this card': 'تعذر تحميل هذه البطاقة', 'All': 'الكل', 'Pending': 'معلق',
	};
	const T = (s, ...a) => {
		let out = s;
		if (LANG === 'ar') { if (AR[s] != null) out = AR[s]; else if (s) MISSING.add(s); }
		return String(out).replace(/\{(\d+)\}/g, (_, i) => (a[i] == null ? '' : a[i]));
	};
	window.esdMissing = () => Array.from(MISSING);
	const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
	const LOC = () => (LANG === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-GB');
	const toDate = (s) => (s ? new Date(String(s).slice(0, 10) + 'T00:00:00') : null);
	const fdate = (s) => { const d = toDate(s); return d && !isNaN(d) ? d.toLocaleDateString(LOC(), { day: '2-digit', month: 'short', year: 'numeric' }) : ''; };
	const fday = (s) => { const d = toDate(s); return d && !isNaN(d) ? d.toLocaleDateString(LOC(), { weekday: 'long', day: 'numeric', month: 'long' }) : ''; };
	const money = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	const slug = (dt) => String(dt).toLowerCase().replace(/ /g, '-');
	const href = (dt, name) => '/app/' + slug(dt) + '/' + encodeURIComponent(name);
	const store = {
		get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } },
		set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } },
	};

	const ICONS = {
		home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
		clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12l2 2 4-4"/>',
		cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M12 14h2M16 14h.01M8 17h2"/>',
		pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
		alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
		mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
		bldg: '<path d="M4 21V5l8-2v18M12 7h8v14M2 21h20"/><path d="M7 8h2M7 12h2M7 16h2M15 11h2M15 15h2"/>',
		users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.6 4 2.4 4 6"/>',
		coin: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M15 9.3c0-1.3-1.3-2.3-3-2.3s-3 1-3 2.2c0 2.9 6 1.6 6 4.6 0 1.3-1.3 2.4-3 2.4s-3-1-3-2.4"/>',
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
		ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
		refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
		check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
	};
	const ico = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
	const badge = (tone, text) => `<span class="esd-b ${tone}">${esc(text)}</span>`;
	const td = (label, html, cls) => `<td class="${cls || ''}" data-l="${esc(label)}"><div>${html}</div></td>`;
	const open = (dt, name, text) => `<a class="esd-ref" href="${esc(href(dt, name))}" data-dt="${esc(dt)}" data-dn="${esc(name)}">${esc(text || name)}</a>`;
	const empty = (title, sub, ok) => `<div class="esd-empty">${ok ? `<span class="esd-empty-i">${ico('check')}</span>` : ''}<b>${esc(title)}</b>${esc(sub)}</div>`;

	// ------------------------------------------------------------ status rules
	const REG_TONE = { 'Awaiting approval': 'amber', 'Awaiting signed copy': 'amber', 'Rejected': 'red', 'Filed': 'green', 'Under review': 'blue', 'Printed': 'blue', 'Received': 'blue', 'To file': 'grey' };
	const renewalBadge = (r, due) => {
		if (r.days < 0) return badge('red', T('Expired {0} d ago', -r.days));
		if (r.days === 0) return badge('red', T('Expires today'));
		if (r.days <= due) return badge('amber', T('Due in {0} days', r.days));
		return badge('green', T('On track · {0} d', r.days));
	};
	const rentBadge = (r) => {
		if (r.days < 0) return badge('red', T('Overdue {0} d', -r.days));
		if (r.days === 0) return badge('red', T('Due today'));
		if (r.days <= 7) return badge('amber', T('Due in {0} days', r.days));
		return badge('blue', T('Due in {0} days', r.days));
	};
	const ageCell = (r) => (r.overdue ? `<span class="esd-age bad">${esc(T('{0} d', r.age))}</span>` : `<span class="esd-age">${esc(T('{0} d', r.age))}</span>`);
	const stageBadge = (r) => badge(r.overdue ? 'red' : /approv|review|pending|wait/i.test(r.state) ? 'amber' : 'blue', r.overdue ? T('Overdue') + ' · ' + T(r.state) : T(r.state));

	// ------------------------------------------------------------ backend
	const api = (action, args) => new Promise((resolve, reject) => {
		frappe.call({ method: 'exec_admin_api', args: Object.assign({ action: action }, args || {}), freeze: false,
			callback: (r) => resolve(r.message), error: (e) => reject(e) });
	});
	const errText = (e) => {
		try {
			const m = JSON.parse((e && e._server_messages) || '[]');
			if (m.length) return String(JSON.parse(m[0]).message).replace(/<[^>]*>/g, '');
		} catch (_) { /* ignore */ }
		return (e && (e.message || e.exc_type)) || T('Something went wrong. Try again.');
	};

	// ------------------------------------------------------------ state
	const S = { tab: store.get('esd_tab', 'overview'), data: null, err: '', loading: false, at: null,
		f: { rq: '', rtype: '', rbranch: '', rstage: '', nq: '', ncat: '', nwin: '', cq: '', ckind: '', cst: '', fq: '', vq: '', aq: '', acard: '', adt: '', aold: '' } };
	let $root = null, mo = null, timer = null;
	const TABS = [['overview', 'Overview', 'home'], ['approvals', 'Approvals', 'check'], ['requests', 'Requests', 'clip'], ['renewals', 'Renewals', 'cal'],
		['register', 'Correspondence', 'mail'], ['rent', 'Facilities & Rent', 'bldg'], ['visitors', 'Visitors', 'users']];

	function themeWatch(el) {
		const apply = () => el.classList.toggle('esd-dark', document.documentElement.getAttribute('data-theme') === 'dark');
		apply();
		const m = new MutationObserver(apply);
		m.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return m;
	}

	function build() {
		if (mo) mo.disconnect();
		if (timer) clearInterval(timer);
		ROOT.querySelectorAll('.esd').forEach((x) => x.remove());
		const rtl = LANG === 'ar';
		const wrap = document.createElement('div');
		wrap.className = 'esd' + (rtl ? ' esd-rtl' : '');
		wrap.dir = rtl ? 'rtl' : 'ltr';
		wrap.lang = rtl ? 'ar' : 'en';
		wrap.innerHTML = `
			<header class="esd-top">
				<div class="esd-brand"><span class="esd-mark">DM</span><div><b>${esc(T('Executive Office'))}</b><small>${esc(T('Administrative operations'))}</small></div></div>
				<nav class="esd-tabs" role="tablist">${TABS.map((t) => `<button type="button" class="esd-tab" role="tab" data-tab="${t[0]}">${ico(t[2])}<span>${esc(T(t[1]))}</span><i class="esd-cnt" data-c="${t[0]}" hidden></i></button>`).join('')}</nav>
				<div class="esd-side">
					<button type="button" class="esd-ibtn" data-a="refresh" title="${esc(T('Refresh'))}" aria-label="${esc(T('Refresh'))}">${ico('refresh')}</button>
					<button type="button" class="esd-lang" data-a="lang" title="${esc(T('Switch language'))}">${rtl ? 'English' : 'العربية'}</button>
				</div>
			</header>
			<div class="esd-hello"><div><h2 data-h="hello"></h2><p data-h="date"></p></div><div class="esd-hello-r" data-h="meta"></div></div>
			<div class="esd-warn" hidden></div>
			<section class="esd-kpis"></section>
			<main class="esd-body"></main>`;
		ROOT.appendChild(wrap);
		$root = wrap;
		mo = themeWatch(wrap);
		bind();
		paintTabs();
		if (S.data) paint(); else { skeleton(); load(); }
		timer = setInterval(() => { if (!wrap.isConnected) { clearInterval(timer); return; } if (!document.hidden) load(true); }, 5 * 60 * 1000);
	}

	function bind() {
		$root.addEventListener('click', (e) => {
			const a = e.target.closest('a.esd-ref');
			if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) { e.preventDefault(); frappe.set_route('Form', a.dataset.dt, a.dataset.dn); return; }
			if (a) return;
			const row = e.target.closest('tr[data-dt]');
			if (row && !e.target.closest('a,button')) { frappe.set_route('Form', row.dataset.dt, row.dataset.dn); return; }
			const t = e.target.closest('[data-tab],[data-a],[data-go]');
			if (!t) return;
			if (t.dataset.tab) return switchTab(t.dataset.tab);
			if (t.dataset.go) { if (t.dataset.preset) Object.assign(S.f, JSON.parse(t.dataset.preset)); return switchTab(t.dataset.go); }
			if (t.dataset.a === 'lang') { store.set(LANG_KEY, LANG === 'ar' ? 'en' : 'ar'); LANG = LANG === 'ar' ? 'en' : 'ar'; return build(); }
			if (t.dataset.a === 'refresh') return load();
			if (t.dataset.a === 'apcard') { S.f.acard = S.f.acard === t.dataset.v ? '' : t.dataset.v; return paintBody(); }
			if (t.dataset.a === 'remind') return copyReminder();
		});
		['keydown', 'keypress', 'keyup'].forEach((type) => $root.addEventListener(type, (e) => { const n = e.composedPath ? e.composedPath()[0] : e.target; if (n && (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable)) e.stopPropagation(); }));
		$root.addEventListener('input', (e) => { const k = e.target.dataset.f; if (k && e.target.tagName !== 'SELECT') { S.f[k] = e.target.value; paintBody(true); } });
		$root.addEventListener('change', (e) => { const k = e.target.dataset.f; if (k && e.target.tagName === 'SELECT') { S.f[k] = e.target.value; paintBody(true); } });
	}

	function switchTab(id) {
		S.tab = id; store.set('esd_tab', id);
		paintTabs();
		if (S.data) paintBody();
		const top = $root.querySelector('.esd-top');
		if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function paintTabs() {
		$root.querySelectorAll('.esd-tab').forEach((b) => { const on = b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
	}

	function load(quiet) {
		if (S.loading) return;
		S.loading = true;
		const btn = $root && $root.querySelector('[data-a="refresh"]');
		if (btn) btn.classList.add('spin');
		api('bootstrap').then((d) => { S.data = d || {}; S.err = ''; S.at = new Date(); })
			.catch((e) => { if (!quiet || !S.data) S.err = errText(e); })
			.finally(() => { S.loading = false; if (btn) btn.classList.remove('spin'); if ($root && $root.isConnected) paint(); });
	}

	function skeleton() {
		$root.querySelector('.esd-kpis').innerHTML = Array(5).fill('<div class="esd-kpi esd-card"><div class="esd-skel sm"></div></div>').join('');
		$root.querySelector('.esd-body').innerHTML = '<div class="esd-grid"><div class="esd-card"><div class="esd-skel"></div></div><div class="esd-card"><div class="esd-skel"></div></div></div>';
	}

	// ------------------------------------------------------------ derived numbers
	function stats() {
		const d = S.data || {};
		const c = d.cfg || { due_days: 30, overdue_days: 7, rent_days: 45, register_days: 90, horizon_days: 120 };
		const req = d.requests || [], ren = d.renewals || [], reg = d.register || [], rent = d.rent || [], vis = d.visitors || [];
		const reqOver = req.filter((r) => r.overdue).length;
		const renDue = ren.filter((r) => r.days >= 0 && r.days <= c.due_days).length;
		const renExp = ren.filter((r) => r.days < 0).length;
		const sign = reg.filter((r) => r.pending_signature).length;
		const toFile = reg.filter((r) => ['To file', 'Printed', 'Received', 'Under review'].includes(r.status)).length;
		const rentOver = rent.filter((r) => r.days < 0).length;
		const rentAmt = rent.reduce((s, r) => s + (r.amount || 0), 0);
		const visToday = vis.filter((v) => v.today).length;
		const ap = Array.isArray(d.approvals) ? { cards: [], items: [] } : (d.approvals || { cards: [], items: [] });
		const apOld = (ap.items || []).filter((r) => r.overdue).length;
		return { ap, apOld, c, req, ren, reg, rent, vis, reqOver, renDue, renExp, sign, toFile, rentOver, rentAmt, visToday, overdue: reqOver + renExp + rentOver };
	}

	function paint() {
		if (S.err && !S.data) {
			$root.querySelector('.esd-kpis').innerHTML = '';
			$root.querySelector('.esd-body').innerHTML = `<div class="esd-card esd-fail">${empty(T('Could not load the dashboard'), S.err)}<button type="button" class="esd-btn" data-a="refresh">${esc(T('Try again'))}</button></div>`;
			return;
		}
		const s = stats();
		const d = S.data;
		const h = new Date().getHours();
		const first = String(d.user || '').split(' ')[0];
		$root.querySelector('[data-h="hello"]').textContent = T(h < 12 ? 'Good morning, {0}' : h < 17 ? 'Good afternoon, {0}' : 'Good evening, {0}', first);
		$root.querySelector('[data-h="date"]').textContent = fday(d.today);
		$root.querySelector('[data-h="meta"]').innerHTML =
			`<button type="button" class="esd-chip ${s.visToday ? 'on' : ''}" data-go="visitors">${ico('users')}${esc(s.visToday === 1 ? T('1 visitor today') : s.visToday ? T('{0} visitors today', s.visToday) : T('No visitors today'))}</button>`
			+ (S.at ? `<small>${esc(T('Updated {0}', S.at.toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit' })))}</small>` : '');
		const errs = Object.keys(d.errors || {});
		const warn = $root.querySelector('.esd-warn');
		warn.hidden = !errs.length;
		warn.textContent = errs.length ? T('Some sections could not load: {0}', errs.map((k) => T(k) + ' (' + d.errors[k] + ')').join(' · ')) : '';
		const cnt = { approvals: (s.ap.items || []).length, requests: s.req.length, renewals: s.renDue + s.renExp, register: s.sign, rent: s.rent.length, visitors: s.visToday };
		$root.querySelectorAll('.esd-cnt').forEach((el) => { const n = cnt[el.dataset.c]; el.hidden = !n; el.textContent = n || ''; });
		paintKpis(s);
		paintBody();
	}

	function paintKpis(s) {
		const k = (tone, icon, label, value, sub, go, preset) => `<button type="button" class="esd-kpi esd-card ${tone}" data-go="${go}"${preset ? ` data-preset='${esc(JSON.stringify(preset))}'` : ''}>
			<span class="esd-kpi-i">${ico(icon)}</span><span class="esd-kpi-t"><span class="esd-kpi-l">${esc(label)}</span><span class="esd-kpi-s">${esc(sub)}</span></span><span class="esd-kpi-v">${esc(value)}</span></button>`;
		$root.querySelector('.esd-kpis').innerHTML = [
			k(s.apOld ? 'red' : 'violet', 'check', T('Pending approvals'), (s.ap.items || []).length, s.apOld ? T('{0} waiting over {1} days', s.apOld, s.c.approvals_overdue_days || 3) : T('None waiting over {0} days', s.c.approvals_overdue_days || 3), 'approvals', { acard: '', aold: '' }),
			k('blue', 'clip', T('Open admin requests'), s.req.length, s.reqOver ? T('{0} older than {1} days', s.reqOver, s.c.overdue_days) : T('All within {0} days', s.c.overdue_days), 'requests', { rstage: '' }),
			k('amber', 'cal', T('Renewals due in {0} days', s.c.due_days), s.renDue, s.renExp ? T('{0} already expired', s.renExp) : T('None expired'), 'renewals', { nwin: 'due' }),
			k('violet', 'pen', T('Pending signatures'), s.sign, T('Letters & memos'), 'register', { cst: 'sign' }),
			k('teal', 'coin', T('Rent due in {0} days', s.c.rent_days), s.rent.length, money(s.rentAmt) + ' ' + T('SAR'), 'rent'),
			k(s.overdue ? 'red' : 'green', 'alert', T('Overdue follow-ups'), s.overdue, T('Requests · renewals · rent'), 'requests', { rstage: 'over' }),
		].join('');
	}

	function paintBody(keepFocus) {
		const body = $root.querySelector('.esd-body');
		const active = (ROOT && ROOT.activeElement) || document.activeElement;   // inside the block's shadow root, document.activeElement is the host, not the search box
		const focusKey = keepFocus && active && body.contains(active) ? active.dataset.f : null;
		const caret = focusKey && active.selectionStart != null ? active.selectionStart : null;
		const s = stats();
		const view = { overview: viewOverview, approvals: viewApprovals, requests: viewRequests, renewals: viewRenewals, register: viewRegister, rent: viewRent, visitors: viewVisitors }[S.tab] || viewOverview;
		body.innerHTML = `<div class="esd-pane">${view(s)}</div>`;
		if (focusKey) {
			const el = body.querySelector(`[data-f="${focusKey}"]`);
			if (el) { el.focus(); if (caret != null && el.setSelectionRange) el.setSelectionRange(caret, caret); }
		}
	}

	// ------------------------------------------------------------ building blocks
	const card = (icon, title, sub, inner, go, cls) => `<section class="esd-card esd-panel ${cls || ''}">
		<header class="esd-ph"><span class="esd-ph-i">${ico(icon)}</span><div><h3>${esc(title)}</h3>${sub ? `<small>${esc(sub)}</small>` : ''}</div>
		${go ? `<button type="button" class="esd-link" data-go="${go}">${esc(T('View all'))}${ico('arrow')}</button>` : ''}</header>${inner}</section>`;
	const table = (heads, rows) => `<div class="esd-scroll"><table class="esd-t"><thead><tr>${heads.map((h) => `<th class="${h[1] || ''}">${esc(T(h[0]))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
	const opts = (values, cur, all) => `<option value="">${esc(T(all))}</option>` + values.map((v) => `<option value="${esc(v[0])}"${v[0] === cur ? ' selected' : ''}>${esc(T(v[1]))}</option>`).join('');
	const uniq = (list) => Array.from(new Set(list.filter(Boolean))).sort().map((v) => [v, v]);
	const search = (key, ph) => `<label class="esd-search">${ico('search')}<input type="search" data-f="${key}" value="${esc(S.f[key])}" placeholder="${esc(T(ph))}" aria-label="${esc(T('Search'))}"></label>`;
	const hit = (q, ...vals) => !q || vals.join(' ').toLowerCase().includes(q.trim().toLowerCase());
	const foot = (shown, total) => (total > shown ? `<div class="esd-foot">${esc(T('Showing {0} of {1}', shown, total))}</div>` : '');

	const reqRow = (r, short) => `<tr data-dt="Materials Service General Request Form" data-dn="${esc(r.name)}">
		${td(T('Request'), `<b class="esd-1">${esc(r.subject || T(r.type))}</b><small>${open('Materials Service General Request Form', r.name)}${short ? '' : ' · ' + esc(T(r.type))}</small>`)}
		${td(T('Requested by'), `${esc(r.employee)}${r.department ? `<small>${esc(r.department)}</small>` : ''}`)}
		${short ? '' : td(T('Branch'), esc(r.branch || '—'))}
		${td(T('Date'), esc(fdate(r.date)), 'nw')}
		${td(T('Age'), ageCell(r), 'nw')}
		${td(T('Stage'), stageBadge(r))}
		${short ? '' : td(T('Amount'), r.amount ? money(r.amount) : '—', 'n')}</tr>`;
	const renRow = (r, due, short) => `<tr data-dt="${esc(r.doctype)}" data-dn="${esc(r.name)}">
		${td(T('Item'), `<b class="esd-1">${esc(T(r.label))}</b><small>${esc(r.title)}</small>`)}
		${short ? '' : td(T('Category'), badge('grey', T(r.category)))}
		${short ? '' : td(T('Vendor / authority'), esc(r.vendor || '—'))}
		${td(T('Expiry'), esc(fdate(r.expiry)), 'nw')}
		${td(T('Status'), renewalBadge(r, due))}
		${short ? '' : td(T('Amount'), r.amount ? money(r.amount) : '—', 'n')}</tr>`;
	const regRow = (r, short) => `<tr data-dt="${esc(r.doctype)}" data-dn="${esc(r.name)}">
		${td(T('Reference'), `${open(r.doctype, r.name)}<small>${esc(T(r.kind))}</small>`, 'nw')}
		${td(T('Subject'), `<b class="esd-1">${esc(r.subject || '—')}</b>${short && r.party ? `<small>${esc(r.party)}</small>` : ''}`)}
		${short ? '' : td(T('Company / to'), esc(r.party || '—'))}
		${short ? '' : td(T('By'), esc(r.by || '—'))}
		${td(T('Date'), esc(fdate(r.date)), 'nw')}
		${td(T('Status'), badge(REG_TONE[r.status] || 'grey', T(r.status)) + (r.state && !short && r.state !== r.status ? `<small>${esc(r.state)}</small>` : ''))}</tr>`;
	const rentRow = (r, short) => `<tr data-dt="DM Facilities Management" data-dn="${esc(r.name)}">
		${td(T('Facility'), `<b class="esd-1">${esc(r.title)}</b><small>${esc([r.type, r.location].filter(Boolean).join(' · '))}</small>`)}
		${td(T('Landlord'), `${esc(r.landlord || '—')}${r.phone && !short ? `<small class="ltr">${esc(r.phone)}</small>` : ''}`)}
		${short ? '' : td(T('Instalment'), '#' + esc(r.installment), 'nw')}
		${td(T('Due'), esc(fdate(r.due)), 'nw')}
		${td(T('Amount'), r.amount ? money(r.amount) : '—', 'n')}
		${short ? '' : td(T('Paid by'), esc(r.mode || '—'))}
		${td(T('Status'), rentBadge(r))}</tr>`;

	// ------------------------------------------------------------ views
	function viewOverview(s) {
		const N = 6;
		const req = s.req.slice().sort((a, b) => b.age - a.age).slice(0, N);
		const ren = s.ren.slice(0, N);
		const reg = s.reg.slice().sort((a, b) => (b.pending_signature - a.pending_signature) || (a.date < b.date ? 1 : -1)).slice(0, N);
		const rent = s.rent.slice(0, N);
		const ap = (s.ap.items || []).slice(0, N);
		return `${card('check', T('Approvals pending'), T('{0} documents', (s.ap.items || []).length), ap.length ? table([['Document'], ['Requested by'], ['Waiting'], ['Stage']], ap.map((r) => apRow(r, true))) : empty(T('Nothing waiting'), T('No approvals are pending.'), true), 'approvals', 'esd-ap-ov')}
		<div class="esd-grid">
			${card('clip', T('Admin action queue'), T('{0} open', s.req.length), req.length ? table([['Request'], ['Requested by'], ['Date'], ['Age'], ['Stage']], req.map((r) => reqRow(r, true))) : empty(T('Nothing open'), T('No admin requests are waiting.'), true), 'requests')}
			${card('cal', T('Renewals & expiry'), T('{0} listed', s.ren.length), ren.length ? table([['Item'], ['Expiry'], ['Status']], ren.map((r) => renRow(r, s.c.due_days, true))) : empty(T('Nothing due'), T('No renewals in the next {0} days.', s.c.horizon_days), true), 'renewals')}
			${card('mail', T('Correspondence register'), T('{0} awaiting filing', s.toFile), reg.length ? table([['Reference'], ['Subject'], ['Date'], ['Status']], reg.map((r) => regRow(r, true))) : empty(T('No correspondence'), T('No letters or memos in the last {0} days.', s.c.register_days)), 'register')}
			${card('bldg', T('Rent & facility follow-ups'), T('{0} unpaid', s.rent.length), rent.length ? table([['Facility'], ['Landlord'], ['Due'], ['Amount', 'n'], ['Status']], rent.map((r) => rentRow(r, true))) : empty(T('All rent paid'), T('No unpaid instalments in the next {0} days.', s.c.rent_days), true), 'rent')}
		</div>`;
	}

	const apAge = (r) => `<span class="esd-age${r.overdue ? ' bad' : ''}" title="${esc(T('{0} d since last update', r.waiting))}">${esc(T('{0} d', r.waiting))}</span>`;
	const apRow = (r, short) => `<tr data-dt="${esc(r.doctype)}" data-dn="${esc(r.name)}">
		${td(T('Document'), `<b class="esd-1">${esc(r.title)}</b><small>${open(r.doctype, r.name)} · ${esc(T(r.doctype))}${r.type && !short ? ' · ' + esc(T(r.type)) : ''}</small>`)}
		${td(T('Requested by'), esc(r.by || '—'))}
		${short ? '' : td(T('Card'), (r.cards || []).map((c) => badge('grey', c)).join(' '))}
		${short ? '' : td(T('Date'), esc(fdate(r.date)), 'nw')}
		${td(T('Waiting'), apAge(r), 'nw')}
		${td(T('Stage'), badge(r.overdue ? 'red' : 'amber', T(r.state || 'Pending')))}
		${short ? '' : td(T('Amount'), r.amount ? money(r.amount) : '—', 'n')}</tr>`;
	function apRows(s) {
		const f = S.f, days = s.c.approvals_overdue_days || 3;
		return (s.ap.items || []).filter((r) => (!f.acard || (r.cards || []).includes(f.acard)) && (!f.adt || r.doctype === f.adt) && (!f.aold || r.overdue)
			&& hit(f.aq, r.name, r.title, r.by, r.state, r.type, r.doctype, (r.cards || []).join(' '))).sort((a, b) => b.waiting - a.waiting);
	}
	function reminderText(s, rows) {
		const cards = (s.ap.cards || []).filter((c) => c.count);
		const lines = [T('Pending approvals') + ' — ' + fdate(S.data.today), ''];
		cards.forEach((c) => lines.push('• ' + c.label + ': ' + c.count));
		lines.push('', T('Waiting') + ':');
		rows.slice(0, 20).forEach((r, i) => lines.push((i + 1) + '. ' + r.title + ' (' + r.name + ') — ' + (r.state || T('Pending')) + ' — ' + T('{0} d', r.waiting) + (r.by ? ' — ' + r.by : '')));
		if (rows.length > 20) lines.push('… +' + (rows.length - 20));
		return lines.join('\n');
	}
	function copyReminder() {
		const s = stats(), txt = reminderText(s, apRows(s));
		const done = () => { if (frappe.show_alert) frappe.show_alert({ message: T('Reminder copied'), indicator: 'green' }); };
		if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => { if (frappe.utils && frappe.utils.copy_to_clipboard) frappe.utils.copy_to_clipboard(txt); });
		else if (frappe.utils && frappe.utils.copy_to_clipboard) frappe.utils.copy_to_clipboard(txt);
	}
	function viewApprovals(s) {
		const f = S.f, days = s.c.approvals_overdue_days || 3, all = s.ap.items || [];
		const rows = apRows(s);
		const chips = `<div class="esd-tools esd-ap-cards">${(s.ap.cards || []).map((c) => `<button type="button" class="esd-chip ${f.acard === c.label ? 'on' : ''}${c.error ? ' err' : ''}" data-a="apcard" data-v="${esc(c.label)}" title="${esc(c.error ? T('Could not load this card') + ': ' + c.error : c.doctype)}">${esc(c.label)} <b>${c.error ? '!' : c.count}</b></button>`).join('')}</div>`;
		const tools = `<div class="esd-tools">${search('aq', 'Search document, person or stage')}
			<select class="esd-sel" data-f="acard">${opts((s.ap.cards || []).filter((c) => c.count).map((c) => [c.label, c.label]), f.acard, 'All cards')}</select>
			<select class="esd-sel" data-f="adt">${opts(uniq(all.map((r) => r.doctype)), f.adt, 'All document types')}</select>
			<select class="esd-sel" data-f="aold"><option value="">${esc(T('All'))}</option><option value="1"${f.aold ? ' selected' : ''}>${esc(T('Waiting over {0} days', days))}</option></select>
			<button type="button" class="esd-btn esd-btn-sm" data-a="remind">${esc(T('Copy reminder'))}</button></div>`;
		const inner = rows.length ? table([['Document'], ['Requested by'], ['Card'], ['Date'], ['Waiting'], ['Stage'], ['Amount', 'n']], rows.map((r) => apRow(r))) : all.length ? empty(T('No matches'), T('Try another search or filter.')) : empty(T('Nothing waiting'), T('No approvals are pending.'), true);
		return card('check', T('Approvals pending'), T('From the Approvals Pending page · purchase-order items excluded'), chips + tools + inner + foot(rows.length, all.length), '', 'full');
	}

	function viewRequests(s) {
		const f = S.f;
		const rows = s.req.filter((r) => (!f.rtype || r.type === f.rtype) && (!f.rbranch || r.branch === f.rbranch)
			&& (!f.rstage || (f.rstage === 'over' ? r.overdue : r.state === f.rstage)) && hit(f.rq, r.name, r.subject, r.employee, r.branch, r.department, r.type))
			.sort((a, b) => b.age - a.age);
		const tools = `<div class="esd-tools">${search('rq', 'Search request, employee or branch')}
			<select class="esd-sel" data-f="rtype">${opts(uniq(s.req.map((r) => r.type)), f.rtype, 'All types')}</select>
			<select class="esd-sel" data-f="rbranch">${opts(uniq(s.req.map((r) => r.branch)), f.rbranch, 'All branches')}</select>
			<select class="esd-sel" data-f="rstage">${opts([['over', 'Overdue only']].concat(uniq(s.req.map((r) => r.state))), f.rstage, 'All stages')}</select></div>`;
		const inner = rows.length ? table([['Request'], ['Requested by'], ['Branch'], ['Date'], ['Age'], ['Stage'], ['Amount', 'n']], rows.map((r) => reqRow(r))) : s.req.length ? empty(T('No matches'), T('Try another search or filter.')) : empty(T('Nothing open'), T('No admin requests are waiting.'), true);
		return card('clip', T('Admin action queue'), T('{0} open', s.req.length), tools + inner + foot(rows.length, s.req.length), '', 'full');
	}

	function viewRenewals(s) {
		const f = S.f;
		const due = s.c.due_days;
		const rows = s.ren.filter((r) => (!f.ncat || r.category === f.ncat) && hit(f.nq, r.label, T(r.label), r.title, r.vendor, r.owner, r.name)
			&& (!f.nwin || (f.nwin === 'exp' ? r.days < 0 : f.nwin === 'due' ? r.days >= 0 && r.days <= due : r.days >= 0 && r.days <= 90)));
		const tools = `<div class="esd-tools">${search('nq', 'Search item, facility or vendor')}
			<select class="esd-sel" data-f="ncat">${opts(uniq(s.ren.map((r) => r.category)).map((v) => [v[0], v[0]]), f.ncat, 'All categories')}</select>
			<select class="esd-sel" data-f="nwin"><option value="">${esc(T('Everything listed'))}</option>${[['exp', T('Expired')], ['due', T('Next {0} days', due)], ['90', T('Next {0} days', 90)]].map((o) => `<option value="${o[0]}"${f.nwin === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
		const inner = rows.length ? table([['Item'], ['Category'], ['Vendor / authority'], ['Expiry'], ['Status'], ['Amount', 'n']], rows.map((r) => renRow(r, due))) : s.ren.length ? empty(T('No matches'), T('Try another search or filter.')) : empty(T('Nothing due'), T('No renewals in the next {0} days.', s.c.horizon_days), true);
		return card('cal', T('Renewals & expiry'), T('{0} listed', s.ren.length), tools + inner + foot(rows.length, s.ren.length), '', 'full');
	}

	function viewRegister(s) {
		const f = S.f;
		const rows = s.reg.filter((r) => (!f.ckind || r.kind === f.ckind) && (!f.cst || (f.cst === 'sign' ? r.pending_signature : r.status === f.cst))
			&& hit(f.cq, r.name, r.subject, r.party, r.by, r.state));
		const sts = ['Awaiting approval', 'Awaiting signed copy', 'Under review', 'Printed', 'Received', 'To file', 'Filed', 'Rejected'].filter((x) => s.reg.some((r) => r.status === x)).map((x) => [x, x]);
		const tools = `<div class="esd-tools">${search('cq', 'Search subject, reference or person')}
			<select class="esd-sel" data-f="ckind">${opts([['Letter', 'Letters'], ['Memo', 'Memos']], f.ckind, 'Letters & memos ')}</select>
			<select class="esd-sel" data-f="cst">${opts([['sign', 'Pending signatures']].concat(sts), f.cst, 'All statuses')}</select></div>`;
		const inner = rows.length ? table([['Reference'], ['Subject'], ['Company / to'], ['By'], ['Date'], ['Status']], rows.map((r) => regRow(r))) : s.reg.length ? empty(T('No matches'), T('Try another search or filter.')) : empty(T('No correspondence'), T('No letters or memos in the last {0} days.', s.c.register_days));
		return card('mail', T('Correspondence register'), T('{0} awaiting filing', s.toFile), tools + inner + foot(rows.length, s.reg.length), '', 'full');
	}

	function viewRent(s) {
		const f = S.f;
		const rows = s.rent.filter((r) => hit(f.fq, r.title, r.landlord, r.location, r.type, r.name));
		const total = rows.reduce((a, r) => a + (r.amount || 0), 0);
		const tools = `<div class="esd-tools">${search('fq', 'Search facility or landlord')}<span class="esd-total">${esc(T('Amount'))} <b>${money(total)}</b> ${esc(T('SAR'))}</span></div>`;
		const inner = rows.length ? table([['Facility'], ['Landlord'], ['Instalment'], ['Due'], ['Amount', 'n'], ['Paid by'], ['Status']], rows.map((r) => rentRow(r))) : s.rent.length ? empty(T('No matches'), T('Try another search or filter.')) : empty(T('All rent paid'), T('No unpaid instalments in the next {0} days.', s.c.rent_days), true);
		return card('bldg', T('Rent & facility follow-ups'), T('{0} unpaid', s.rent.length), tools + inner, '', 'full');
	}

	function viewVisitors(s) {
		const f = S.f;
		const rows = s.vis.filter((v) => hit(f.vq, v.visitor, v.company, v.host, v.department, v.phone));
		const days = {};
		rows.forEach((v) => { (days[v.date] = days[v.date] || []).push(v); });
		const tomorrow = (() => { const d = toDate(S.data.today); d.setDate(d.getDate() + 1); const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
		const groups = Object.keys(days).sort().map((day) => `<div class="esd-day"><h4>${esc(day === S.data.today ? T('Today') : day === tomorrow ? T('Tomorrow') : fday(day))}<small>${esc(fdate(day))}</small></h4>
			${table([['Visitor'], ['Company'], ['Host'], ['Department'], ['Phone']], days[day].map((v) => `<tr data-dt="Daily Visitors Record" data-dn="${esc(v.name)}">
				${td(T('Visitor'), `<b>${esc(v.visitor || '—')}</b>`)}${td(T('Company'), esc(v.company || '—'))}${td(T('Host'), esc(v.host || '—'))}
				${td(T('Department'), esc(v.department || '—'))}${td(T('Phone'), `<span class="ltr">${esc(v.phone || '—')}</span>`, 'nw')}</tr>`))}</div>`).join('');
		const inner = rows.length ? groups : s.vis.length ? empty(T('No matches'), T('Try another search or filter.')) : empty(T('No visitors booked'), T('No visitors in the next 7 days.'));
		return card('users', T('Visitors this week'), T('{0} listed', s.vis.length), `<div class="esd-tools">${search('vq', 'Search visitor, company or host')}</div>` + inner, '', 'full');
	}

	build();
})();
