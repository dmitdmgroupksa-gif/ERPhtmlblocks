(function () {
var R = root_element;
var DT = 'Leads Generation List';
var LS_KEY = 'lm_dash_lang';
var ICON = {
  users: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  check: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  clock: '<svg class="lm-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  book: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>',
  alert: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  refresh: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/></svg>',
  plus: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  send: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  ext: '<svg class="lm-ico" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>'
};
var T = {
  en: {title:'Lead Management',sub:'Lead generation, allocation and sales coordination',refreshed:'Last refreshed',refresh:'Refresh',addLead:'Add Lead',allocate:'Allocate Leads',
    from:'Lead Date From',to:'Lead Date To',city:'City',source:'Source',sp:'Assigned Salesperson',alloc:'Allocation Status',all:'All',assigned:'Assigned',unassigned:'Unassigned',
    search:'Search',searchPh:'Lead ID, company, contact, email or phone',apply:'Apply',reset:'Reset',
    dateNote:'Period filters use the lead record field “Date”. Assigned = lead has at least one current allocation (status not Closed/Converted). Unassigned = never allocated; leads with only Closed/Converted allocations are counted separately (same definitions as the Detailed Report).',
    total:'Total Leads',assignedL:'Assigned Leads',unassignedL:'Unassigned Leads',catalogue:'Catalogue Sent',missing:'Missing Contact Details',
    ofTotal:'of total',noEmailPhone:'No usable email or phone',clickView:'Click to view',
    bySource:'Leads by Source',byCity:'Leads by City',top10:'Top 10 + Other',allocBreak:'Allocation Breakdown',overTime:'Leads Generated Over Time',byDay:'by day',byMonth:'by month',other:'Other',notSet:'(Not set)',
    leads:'Leads',selected:'selected',clearSel:'Clear selection',results:'results',
    cId:'Lead ID',cCompany:'Company / Customer',cDate:'Lead Date',cCity:'City',cSource:'Source',cContact:'Contact Person',cPhone:'Primary Phone',cEmail:'Email',cSp:'Assigned Salesperson',cCat:'Catalogue Sent',cOpen:'Open',
    yes:'Sent',no:'Not sent',open:'Open',more:'more',prev:'Previous',next:'Next',page:'Page',perPage:'per page',noRows:'No leads match the current filters.',
    loading:'Loading…',error:'Could not load data',allocUnavailable:'Allocation data unavailable',allocUnavailableLong:'Allocation counts cannot be shown: active allocations are only readable through the allocation API, which is not available for this session.',
    dq:'Data Quality',dqMissingCE:'Missing phone and email',dqCity:'Missing city',dqContact:'Missing contact person',dqDup:'Potential duplicates',dqDupNote:'Potential duplicates by identical email or phone (review only; nothing is merged or deleted).',groups:'groups',records:'records',
    activeFilter:'Table filter',noSelection:'Select at least one lead in the table first.',reviewTitle:'Review allocation',selLeads:'Selected leads',salesperson:'Salesperson',
    willSkip:'already have an active allocation and will be skipped (existing rule: no automatic reassignment).',confirm:'Confirm allocation',back:'Back',continue:'Continue',
    done:'Allocation completed',created:'Created',skipped:'Skipped',notAuth:'You are not authorized to allocate leads.',
    asgnDate:'Assignment Date',priority:'Priority',followUp:'Next Follow Up',restricted:'Restricted'},
  ar: {title:'إدارة العملاء المحتملين',sub:'توليد العملاء المحتملين وتوزيعهم وتنسيق المبيعات',refreshed:'آخر تحديث',refresh:'تحديث',addLead:'إضافة عميل محتمل',allocate:'توزيع العملاء',
    from:'تاريخ العميل من',to:'تاريخ العميل إلى',city:'المدينة',source:'المصدر',sp:'مندوب المبيعات المسند',alloc:'حالة التوزيع',all:'الكل',assigned:'موزع',unassigned:'غير موزع',
    search:'بحث',searchPh:'رقم العميل، الشركة، جهة الاتصال، البريد أو الهاتف',apply:'تطبيق',reset:'إعادة ضبط',
    dateNote:'تعتمد فلاتر الفترة على حقل «التاريخ» في سجل العميل. موزع = للعميل توزيع حالي واحد على الأقل. غير موزع = لم يوزع مطلقاً؛ العملاء الذين لديهم توزيعات مغلقة/محولة فقط يُحسبون منفصلين (نفس تعريفات التقرير التفصيلي).',
    total:'إجمالي العملاء',assignedL:'العملاء الموزعون',unassignedL:'العملاء غير الموزعين',catalogue:'تم إرسال الكتالوج',missing:'بيانات اتصال ناقصة',
    ofTotal:'من الإجمالي',noEmailPhone:'لا يوجد بريد أو هاتف صالح',clickView:'اضغط للعرض',
    bySource:'العملاء حسب المصدر',byCity:'العملاء حسب المدينة',top10:'أعلى 10 + أخرى',allocBreak:'توزيع الإسناد',overTime:'العملاء عبر الزمن',byDay:'يومياً',byMonth:'شهرياً',other:'أخرى',notSet:'(غير محدد)',
    leads:'العملاء المحتملون',selected:'محدد',clearSel:'إلغاء التحديد',results:'نتيجة',
    cId:'رقم العميل',cCompany:'الشركة / العميل',cDate:'تاريخ العميل',cCity:'المدينة',cSource:'المصدر',cContact:'جهة الاتصال',cPhone:'الهاتف الأساسي',cEmail:'البريد الإلكتروني',cSp:'مندوب المبيعات',cCat:'الكتالوج',cOpen:'فتح',
    yes:'مرسل',no:'غير مرسل',open:'فتح',more:'أخرى',prev:'السابق',next:'التالي',page:'صفحة',perPage:'لكل صفحة',noRows:'لا يوجد عملاء مطابقون للفلاتر الحالية.',
    loading:'جارٍ التحميل…',error:'تعذر تحميل البيانات',allocUnavailable:'بيانات التوزيع غير متاحة',allocUnavailableLong:'لا يمكن عرض أعداد التوزيع: التوزيعات النشطة متاحة فقط عبر واجهة التوزيع، وهي غير متاحة لهذه الجلسة.',
    dq:'جودة البيانات',dqMissingCE:'بدون هاتف وبريد',dqCity:'بدون مدينة',dqContact:'بدون جهة اتصال',dqDup:'تكرارات محتملة',dqDupNote:'تكرارات محتملة حسب تطابق البريد أو الهاتف (للمراجعة فقط؛ لا يتم الدمج أو الحذف).',groups:'مجموعات',records:'سجلات',
    activeFilter:'فلتر الجدول',noSelection:'حدد عميلاً واحداً على الأقل من الجدول أولاً.',reviewTitle:'مراجعة التوزيع',selLeads:'العملاء المحددون',salesperson:'مندوب المبيعات',
    willSkip:'لديهم توزيع نشط وسيتم تخطيهم (القاعدة الحالية: لا إعادة إسناد تلقائية).',confirm:'تأكيد التوزيع',back:'رجوع',continue:'متابعة',
    done:'تم التوزيع',created:'تم الإنشاء',skipped:'تم التخطي',notAuth:'غير مصرح لك بتوزيع العملاء.',
    asgnDate:'تاريخ الإسناد',priority:'الأولوية',followUp:'المتابعة القادمة',restricted:'مقيد'}
};
var lang = 'en';
try { lang = localStorage.getItem(LS_KEY) || 'en'; } catch (e) {}
function t(k) { return (T[lang] && T[lang][k]) || T.en[k] || k; }
function esc(s) { return frappe.utils.escape_html(s == null ? '' : String(s)); }
function fmtN(n) { return (n == null ? '–' : Number(n).toLocaleString('en-US')); }

var CAN_ALLOC = frappe.user.has_role('Lead Allocation Coordinator') || frappe.user.has_role('System Manager');
var CAN_ADD = frappe.model.can_create ? frappe.model.can_create(DT) : true;

// ---------- verified "missing" definitions ----------
var DIG = '0123456789٠١٢٣٤٥٦٧٨٩'.split('');
var LET = 'abcdefghijklmnopqrstuvwxyzابتثجحخدذرزسشصضطظعغفقكلمنهويةىءأإآؤئ'.split('');
function noDigits(f) { return DIG.map(function (d) { return [DT, f, 'not like', '%' + d + '%']; }); }
function noLetters(f) { return LET.map(function (d) { return [DT, f, 'not like', '%' + d + '%']; }); }
var MISSING_CONTACT = [[DT, 'customer_email', 'not like', '%@%'], [DT, 'customer_email_2', 'not like', '%@%']].concat(noDigits('phone'), noDigits('telephone'));
var MISSING_CITY = noLetters('city');
var MISSING_PERSON = noLetters('contact_person');

var S = {
  f: { from: '', to: '', city: '', source: '', sp: '', alloc: '', q: '' },
  extra: null, // {key,label,filters}
  page: 0, size: 20, sort: 'date', dir: 'desc',
  sel: {}, alloc: null, allocErr: null, sps: [], req: 0, lastRefresh: null, cities: [], sources: []
};

function q(sel) { return R.querySelector(sel); }
function qa(sel) { return Array.prototype.slice.call(R.querySelectorAll(sel)); }

// ---------- data access (permission-aware: frappe.client.get_list) ----------
function getList(args) {
  return frappe.xcall('frappe.client.get_list', Object.assign({ doctype: DT, limit_page_length: 0 }, args));
}
function allocLeads() { return S.alloc ? Object.keys(S.alloc) : []; }
function spLeads(sp) { var o = []; if (!S.alloc) return o; Object.keys(S.alloc).forEach(function (k) { if (S.alloc[k].some(function (a) { return a.sales_person === sp; })) o.push(k); }); return o; }

function baseFilters(opts) {
  opts = opts || {};
  var f = [[DT, 'docstatus', '!=', 2]];
  var F = S.f;
  if (F.from) f.push([DT, 'date', '>=', F.from]);
  if (F.to) f.push([DT, 'date', '<=', F.to]);
  if (F.city) { if (F.city === '__none__') f = f.concat(MISSING_CITY); else f.push([DT, 'city', '=', F.city]); }
  if (F.source) f.push(F.source === '__none__' ? [DT, 'source', 'is', 'not set'] : [DT, 'source', '=', F.source]);
  if (F.sp) { var l = spLeads(F.sp); f.push([DT, 'name', 'in', l.length ? l : ['__none__']]); }
  var al = opts.alloc !== undefined ? opts.alloc : F.alloc;
  if (al) {
    if (!S.alloc) throw new Error('alloc');
    var a = allocLeads();
    if (al === 'assigned') f.push([DT, 'name', 'in', a.length ? a : ['__none__']]);
    else { var un = a.concat(S.histIds || []); if (un.length) f.push([DT, 'name', 'not in', un]); }
  }
  if (opts.withExtra !== false && S.extra) f = f.concat(S.extra.filters);
  return f;
}
function orFilters() {
  var s = (S.f.q || '').trim();
  if (!s) return null;
  var like = '%' + s + '%';
  return ['name', 'customer_name', 'contact_person', 'customer_email', 'customer_email_2', 'phone', 'telephone'].map(function (x) { return [DT, x, 'like', like]; });
}
function countWith(extra, opts) {
  var f;
  try { f = baseFilters(opts).concat(extra || []); } catch (e) { return Promise.reject(e); }
  var a = { fields: ['count(name) as c'], filters: f };
  var o = orFilters(); if (o) a.or_filters = o;
  return getList(a).then(function (r) { return (r && r[0] && r[0].c) || 0; });
}
function groupBy(field, extraOpts) {
  var a = { fields: [field + ' as k', 'count(name) as c'], filters: baseFilters(extraOpts), group_by: field, order_by: 'c desc' };
  var o = orFilters(); if (o) a.or_filters = o;
  return getList(a);
}
function loadAlloc() {
  // 2026-11-04: uses the same authorized reporting backend as the Detailed Report
  // (bulk_allocate_leads: report_lead_ids + report_allocations). The old 'active_allocations' action never existed.
  function post(args) {
    return fetch('/api/method/bulk_allocate_leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Frappe-CSRF-Token': frappe.csrf_token }, body: JSON.stringify(args) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var er = new Error('http'); er.status = r.status; throw er; } return j.message; }); });
  }
  return post({ action: 'report_lead_ids' }).then(function (ids) {
    var cur = ids.current || [];
    S.histIds = ids.history_only || [];
    var chunks = []; for (var i = 0; i < cur.length; i += 500) chunks.push(cur.slice(i, i + 500));
    return Promise.all(chunks.map(function (c) { return post({ action: 'report_allocations', leads: JSON.stringify(c) }); })).then(function (parts) {
      var m = {}, sps = {};
      cur.forEach(function (l) { m[l] = []; });
      parts.forEach(function (p) { Object.keys(p || {}).forEach(function (l) { (p[l] || []).forEach(function (al) { if (!al.current) return; (m[l] = m[l] || []).push(al); sps[al.sales_person] = al.sales_person_name || al.sales_person; }); }); });
      S.alloc = m; S.allocErr = ids.truncated ? t('allocUnavailableLong') : null;
      S.sps = Object.keys(sps).map(function (k) { return { v: k, l: sps[k] }; }).sort(function (a, b) { return a.l.localeCompare(b.l); });
    });
  }).catch(function (er) { S.alloc = null; S.histIds = []; S.sps = []; S.allocErr = (er && (er.status === 403 || er.status === 417)) ? (lang === 'ar' ? 'بيانات التوزيع متاحة لمنسقي التوزيع ومديري النظام فقط.' : 'Allocation counts are available to Lead Allocation Coordinators and System Managers only.') : t('allocUnavailableLong'); });
}

// ---------- render skeleton ----------
function shell() {
  var el = q('.lm');
  el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  el.setAttribute('lang', lang);
  el.innerHTML =
    '<div class="lm-hd"><div><h2>' + t('title') + '</h2><div class="lm-sub">' + t('sub') + '</div><div class="lm-ts" data-ts></div></div>' +
    '<div class="lm-act"><div class="lm-lang"><button data-lang="en" class="' + (lang === 'en' ? 'on' : '') + '">English</button><button data-lang="ar" class="' + (lang === 'ar' ? 'on' : '') + '">العربية</button></div>' +
    '<button class="lm-btn" data-act="refresh">' + ICON.refresh + t('refresh') + '</button>' +
    (CAN_ADD ? '<button class="lm-btn" data-act="add">' + ICON.plus + t('addLead') + '</button>' : '') +
    (CAN_ALLOC ? '<button class="lm-btn" data-act="unassignsel">' + ut('btnSel') + '</button>' : '') +
    (CAN_ALLOC ? '<button class="lm-btn pri" data-act="allocate">' + ICON.send + t('allocate') + ' <span data-selc></span></button>' : '') +
    '</div></div>' +
    '<div class="lm-tabs"></div><div data-pane="overview">' +
    '<div class="lm-card lm-filters">' +
      fi('from', '<input type="date" data-f="from">') + fi('to', '<input type="date" data-f="to">') +
      fi('city', '<select data-f="city"></select>') + fi('source', '<select data-f="source"></select>') +
      fi('sp', '<select data-f="sp"></select>') +
      fi('alloc', '<select data-f="alloc"><option value="">' + t('all') + '</option><option value="assigned">' + t('assigned') + '</option><option value="unassigned">' + t('unassigned') + '</option></select>') +
      '<div class="lm-f wide"><label>' + t('search') + '</label><input type="search" data-f="q" placeholder="' + t('searchPh') + '"></div>' +
      '<div class="lm-fbtn"><button class="lm-btn pri" data-act="apply">' + t('apply') + '</button><button class="lm-btn" data-act="reset">' + t('reset') + '</button></div>' +
      '<div class="lm-note">' + t('dateNote') + '</div>' +
    '</div>' +
    '<div class="lm-kpis">' +
      kpi('total', ICON.users) + kpi('assigned', ICON.check, 'ok') + kpi('unassigned', ICON.clock, 'warn') + kpi('catalogue', ICON.book) + kpi('missing', ICON.alert, 'bad') +
    '</div>' +
    '<div class="lm-grid2">' +
      '<div class="lm-card lm-panel"><h4>' + t('bySource') + '</h4><div data-ch="source"></div></div>' +
      '<div class="lm-card lm-panel"><h4>' + t('byCity') + ' <small>' + t('top10') + '</small></h4><div data-ch="city"></div></div>' +
      '<div class="lm-card lm-panel"><h4>' + t('allocBreak') + '</h4><div data-ch="alloc"></div></div>' +
      '<div class="lm-card lm-panel"><h4>' + t('overTime') + ' <small data-tlmode></small></h4><div data-ch="time"></div></div>' +
    '</div>' +
    '<div class="lm-card lm-sec"><div class="lm-tbar"><h4>' + t('leads') + ' <span class="mut" data-rc></span></h4><div class="lm-act"><span data-xf></span><span class="mut" data-selinfo></span></div></div>' +
      '<div class="lm-tblwrap"><table><thead><tr>' +
        '<th style="width:30px"><input type="checkbox" data-selall></th>' +
        th('name', 'cId') + th('customer_name', 'cCompany') + th('date', 'cDate') + th('city', 'cCity') + th('source', 'cSource') +
        th('contact_person', 'cContact') + '<th>' + t('cPhone') + '</th><th>' + t('cEmail') + '</th><th>' + t('cSp') + '</th>' + th('catalogue_status', 'cCat') + '<th></th>' +
      '</tr></thead><tbody data-tb></tbody></table></div>' +
      '<div class="lm-pg"><div class="mut" data-pginfo></div><div class="lm-act"><select data-size class="lm-btn"><option>20</option><option>50</option><option>100</option></select><button class="lm-btn" data-act="prev">' + t('prev') + '</button><button class="lm-btn" data-act="next">' + t('next') + '</button></div></div>' +
    '</div>' +
    '<div class="lm-card lm-panel"><h4>' + t('dq') + '</h4><div class="lm-dq">' +
      dqi('missing', 'dqMissingCE') + dqi('city', 'dqCity') + dqi('person', 'dqContact') + dqi('dup', 'dqDup') +
    '</div><div class="lm-dups" data-dups></div></div>' +
    '</div><div data-pane="report"></div><div data-pane="fum"></div>';
  // restore filter values
  qa('[data-f]').forEach(function (i) { if (i.tagName !== 'SELECT') i.value = S.f[i.getAttribute('data-f')] || ''; });
  q('[data-f="alloc"]').value = S.f.alloc;
  q('[data-size]').value = String(S.size);
  fillSelects();
  bind();
  mountTabs();
}
function fi(k, inner) { return '<div class="lm-f"><label>' + t(k) + '</label>' + inner + '</div>'; }
function kpi(k, ic, tone) {
  var lab = { total: 'total', assigned: 'assignedL', unassigned: 'unassignedL', catalogue: 'catalogue', missing: 'missing' }[k];
  return '<div class="lm-card lm-kpi ' + (tone || '') + '" data-kpi="' + k + '" role="button" tabindex="0" title="' + t('clickView') + '"><div class="k-l">' + ic + t(lab) + '</div><div class="k-v"><span class="lm-sk"></span></div><div class="k-s">&nbsp;</div></div>';
}
function th(f, k) { var arr = S.sort === f ? (S.dir === 'asc' ? ' ▲' : ' ▼') : ''; return '<th class="s" data-sort="' + f + '">' + t(k) + arr + '</th>'; }
function dqi(k, lab) { return '<div class="lm-dqi" data-dq="' + k + '"><span>' + t(lab) + '</span><b><span class="lm-sk"></span></b></div>'; }
function fillSelects() {
  var c = q('[data-f="city"]'), s = q('[data-f="source"]'), p = q('[data-f="sp"]');
  c.innerHTML = '<option value="">' + t('all') + '</option><option value="__none__">' + t('notSet') + '</option>' + S.cities.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join('');
  s.innerHTML = '<option value="">' + t('all') + '</option><option value="__none__">' + t('notSet') + '</option>' + S.sources.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join('');
  p.innerHTML = '<option value="">' + t('all') + '</option>' + S.sps.map(function (x) { return '<option value="' + esc(x.v) + '">' + esc(x.l) + '</option>'; }).join('');
  p.disabled = !S.alloc;
  c.value = S.f.city; s.value = S.f.source; p.value = S.f.sp;
}

// ---------- events ----------
var deb;
function bind() {
  qa('[data-lang]').forEach(function (b) { b.onclick = function () { lang = b.getAttribute('data-lang'); try { localStorage.setItem(LS_KEY, lang); } catch (e) {} shell(); renderAll(); }; });
  R.querySelector('.lm').onclick = function (e) {
    var a = e.target.closest('[data-act]');
    if (a) {
      var act = a.getAttribute('data-act');
      if (act === 'refresh') refresh(true);
      if (act === 'apply') { readFilters(); onFilterChange(); }
      if (act === 'reset') { S.f = { from: '', to: '', city: '', source: '', sp: '', alloc: '', q: '' }; S.extra = null; S.sel = {}; S.sort = 'date'; S.dir = 'desc'; shell(); onFilterChange(); }
      if (act === 'prev' && S.page > 0) { S.page--; loadTable(); }
      if (act === 'next' && (S.page + 1) * S.size < S.total) { S.page++; loadTable(); }
      if (act === 'add') frappe.new_doc(DT);
      if (act === 'allocate') openAllocate();
      if (act === 'unassign') openUnassign([a.getAttribute('data-lead')]);
      if (act === 'unassignsel') openUnassign(Object.keys(S.sel).filter(function (l) { return S.alloc && S.alloc[l] && S.alloc[l].length; }));
      if (act === 'clearsel') { S.sel = {}; renderTable(S.rows || []); }
      if (act === 'clearx') { S.extra = null; onFilterChange(); }
      return;
    }
    var k = e.target.closest('[data-kpi]'); if (k) return kpiClick(k.getAttribute('data-kpi'));
    var d = e.target.closest('[data-dq]'); if (d) return dqClick(d.getAttribute('data-dq'));
    var s = e.target.closest('[data-sort]'); if (s) { var f = s.getAttribute('data-sort'); S.dir = S.sort === f && S.dir === 'desc' ? 'asc' : 'desc'; S.sort = f; S.page = 0; qa('[data-sort]').forEach(function (h) { var ff = h.getAttribute('data-sort'); h.innerHTML = h.innerHTML.replace(/ [▲▼]$/, '') + (ff === S.sort ? (S.dir === 'asc' ? ' ▲' : ' ▼') : ''); }); loadTable(); return; }
    var c = e.target.closest('[data-chf]'); if (c) { chartClick(c.getAttribute('data-chf'), c.getAttribute('data-chv')); return; }
    var m = e.target.closest('[data-more]'); if (m) { var x = m.nextElementSibling; x.style.display = x.style.display === 'none' ? 'block' : 'none'; return; }
    var dup = e.target.closest('[data-dupv]'); if (dup) { var fld = dup.getAttribute('data-dupf'); var v = dup.getAttribute('data-dupv'); S.extra = { key: 'dup', label: t('dqDup') + ': ' + v, filters: [[DT, fld, '=', v]] }; onFilterChange(true); return; }
  };
  R.querySelector('.lm').onchange = function (e) {
    var cb = e.target;
    if (cb.matches('[data-row]')) { var n = cb.getAttribute('data-row'); if (cb.checked) S.sel[n] = 1; else delete S.sel[n]; updSel(); }
    if (cb.matches('[data-selall]')) { (S.rows || []).forEach(function (r) { if (cb.checked) S.sel[r.name] = 1; else delete S.sel[r.name]; }); renderTable(S.rows || []); }
    if (cb.matches('[data-size]')) { S.size = parseInt(cb.value, 10); S.page = 0; loadTable(); }
  };
  var qi = q('[data-f="q"]');
  qi.oninput = function () { clearTimeout(deb); deb = setTimeout(function () { S.f.q = qi.value; onFilterChange(); }, 400); };
  qi.onkeydown = function (e) { if (e.key === 'Enter') { clearTimeout(deb); readFilters(); onFilterChange(); } };
}
function readFilters() { qa('[data-f]').forEach(function (i) { S.f[i.getAttribute('data-f')] = i.value; }); }
function onFilterChange(keepExtraBadge) { S.page = 0; S.sel = {}; renderAll(); }

function kpiClick(k) {
  qa('[data-kpi]').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-kpi') === k); });
  S.extra = null;
  if (k === 'assigned' || k === 'unassigned') { if (!S.alloc) return frappe.show_alert({ message: t('allocUnavailable'), indicator: 'orange' }); S.f.alloc = k; q('[data-f="alloc"]').value = k; }
  else if (k === 'total') { S.f.alloc = ''; q('[data-f="alloc"]').value = ''; }
  else if (k === 'catalogue') S.extra = { key: k, label: t('catalogue'), filters: [[DT, 'catalogue_status', '=', 1]] };
  else if (k === 'missing') S.extra = { key: k, label: t('missing'), filters: MISSING_CONTACT };
  onFilterChange();
  q('[data-tb]').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function dqClick(k) {
  var m = { missing: ['dqMissingCE', MISSING_CONTACT], city: ['dqCity', MISSING_CITY], person: ['dqContact', MISSING_PERSON] }[k];
  if (!m) return;
  S.extra = { key: 'dq-' + k, label: t(m[0]), filters: m[1] };
  onFilterChange();
  q('[data-tb]').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function chartClick(f, v) {
  if (f === 'source') { S.f.source = v; }
  else if (f === 'city') { if (v === '__other__') { S.extra = { key: 'cityother', label: t('city') + ': ' + t('other'), filters: (S.topCities || []).map(function (c) { return [DT, 'city', '!=', c]; }).concat([[DT, 'city', 'is', 'set']]) }; } else S.f.city = v; }
  else if (f === 'alloc') { if (!S.alloc) return; S.f.alloc = v; }
  else if (f === 'time') { var p = v.split('|'); S.f.from = p[0]; S.f.to = p[1]; }
  shell(); onFilterChange();
}

// ---------- loaders ----------
function setKpi(k, state, val, sub) {
  var el = q('[data-kpi="' + k + '"]'); if (!el) return;
  var v = el.querySelector('.k-v'), s = el.querySelector('.k-s');
  if (state === 'loading') { v.innerHTML = '<span class="lm-sk"></span>'; s.innerHTML = '&nbsp;'; }
  else if (state === 'error') { v.innerHTML = '<span class="lm-errtxt">' + esc(val || t('error')) + '</span>'; s.innerHTML = '<button class="lm-more" data-act="refresh">' + (lang === 'ar' ? 'إعادة المحاولة' : 'Retry') + '</button>'; }
  else { v.textContent = fmtN(val); s.innerHTML = sub || '&nbsp;'; }
}
function pct(a, b) { return b ? (Math.round(a * 1000 / b) / 10) + '% ' + t('ofTotal') : '0%'; }

function renderAll() {
  var id = ++S.req;
  updXf();
  ['total', 'assigned', 'unassigned', 'catalogue', 'missing'].forEach(function (k) { setKpi(k, 'loading'); });
  qa('[data-ch]').forEach(function (c) { c.innerHTML = '<div class="lm-empty">' + t('loading') + '</div>'; });
  var live = function () { return id === S.req; };
  // KPIs (cards ignore the table-only drill filter, so they reconcile)
  var o = { withExtra: false };
  var pT = countWith([], o), pC = countWith([[DT, 'catalogue_status', '=', 1]], o), pM = countWith(MISSING_CONTACT, o);
  var pA = S.alloc ? countWith([], { withExtra: false, alloc: 'assigned' }) : Promise.reject(new Error('alloc'));
  var pU = S.alloc ? countWith([], { withExtra: false, alloc: 'unassigned' }) : Promise.reject(new Error('alloc'));
  var pH = S.alloc && (S.histIds || []).length ? countWith([[DT, 'name', 'in', S.histIds]], { withExtra: false }) : Promise.resolve(0);
  pA.catch(function () {}); pU.catch(function () {}); pH.catch(function () {});
  pT.then(function (tot) {
    if (!live()) return; S.totalScope = tot; setKpi('total', 'ok', tot, tot ? '' : t('noRows'));
    pC.then(function (v) { live() && setKpi('catalogue', 'ok', v, pct(v, tot)); }, function () { live() && setKpi('catalogue', 'error'); });
    pM.then(function (v) { live() && setKpi('missing', 'ok', v, t('noEmailPhone')); }, function () { live() && setKpi('missing', 'error'); });
    Promise.all([pA, pU, pH]).then(function (r) { if (!live()) return; setKpi('assigned', 'ok', r[0], pct(r[0], tot)); setKpi('unassigned', 'ok', r[1], pct(r[1], tot) + (r[2] ? ' · ' + fmtN(r[2]) + (lang === 'ar' ? ' مغلق/محول فقط (منفصل)' : ' previously allocated, no active allocation (separate)') : '')); renderAllocChart(r[0], r[1]); },
      function (e) { if (!live()) return; var msg = e && e.message === 'alloc' ? t('allocUnavailable') : t('error'); setKpi('assigned', 'error', msg); setKpi('unassigned', 'error', msg); q('[data-ch="alloc"]').innerHTML = '<div class="lm-empty lm-errtxt">' + esc(S.allocErr || t('error')) + '</div>'; });
  }, function (e) {
    if (!live()) return;
    var msg = e && e.message === 'alloc' ? t('allocUnavailable') : t('error');
    ['total', 'assigned', 'unassigned', 'catalogue', 'missing'].forEach(function (k) { setKpi(k, 'error', msg); });
    qa('[data-ch]').forEach(function (c) { c.innerHTML = '<div class="lm-empty lm-errtxt">' + esc(msg) + '</div>'; });
  });
  // charts
  safe(function () { return groupBy('source', o); }).then(function (r) { live() && renderBars('source', r, null); }, function () { live() && chErr('source'); });
  safe(function () { return groupBy('city', o); }).then(function (r) { live() && renderCity(r); }, function () { live() && chErr('city'); });
  loadTime(live, o);
  loadDQ(live);
  loadTable();
}
function safe(fn) { try { return fn(); } catch (e) { return Promise.reject(e); } }
function chErr(k) { q('[data-ch="' + k + '"]').innerHTML = '<div class="lm-empty lm-errtxt">' + t('error') + '</div>'; }

function renderBars(field, rows, other) {
  var el = q('[data-ch="' + field + '"]');
  if (!rows.length) { el.innerHTML = '<div class="lm-empty">' + t('noRows') + '</div>'; return; }
  var max = Math.max.apply(null, rows.map(function (r) { return r.c; }));
  el.innerHTML = rows.map(function (r) {
    var v = r.k == null || r.k === '' ? '__none__' : r.k;
    var lab = v === '__none__' ? t('notSet') : (v === '__other__' ? t('other') : esc(r.k));
    var sel = (field === 'source' && S.f.source === v) || (field === 'city' && S.f.city === v);
    return '<div class="lm-bar' + (sel ? ' sel' : '') + '" data-chf="' + field + '" data-chv="' + esc(v) + '" title="' + lab + '"><span class="bl">' + lab + '</span><span class="bt"><span class="bf" style="display:block;width:' + Math.max(1, r.c * 100 / max) + '%"></span></span><span class="bn">' + fmtN(r.c) + '</span></div>';
  }).join('');
}
function renderCity(rows) {
  // DB grouping is case-insensitive; keep exact counts
  var named = rows.filter(function (r) { return r.k != null && /[^\s\-\.]/.test(r.k); });
  var none = rows.filter(function (r) { return !(r.k != null && /[^\s\-\.]/.test(r.k)); }).reduce(function (a, r) { return a + r.c; }, 0);
  var top = named.slice(0, 10);
  var rest = named.slice(10).reduce(function (a, r) { return a + r.c; }, 0);
  S.topCities = top.map(function (r) { return r.k; });
  var out = top.slice();
  if (rest) out.push({ k: '__other__', c: rest });
  if (none) out.push({ k: null, c: none });
  renderBars('city', out);
}
function renderAllocChart(a, u) {
  var el = q('[data-ch="alloc"]'), tot = a + u;
  if (!tot) { el.innerHTML = '<div class="lm-empty">' + t('noRows') + '</div>'; return; }
  el.innerHTML = '<div class="lm-stack"><div data-chf="alloc" data-chv="assigned" style="width:' + (a * 100 / tot) + '%;background:#15803d" title="' + t('assigned') + '"></div><div data-chf="alloc" data-chv="unassigned" style="width:' + (u * 100 / tot) + '%;background:#d97706" title="' + t('unassigned') + '"></div></div>' +
    '<div class="lm-legend"><span data-chf="alloc" data-chv="assigned"><i style="background:#15803d"></i>' + t('assigned') + ': <b>' + fmtN(a) + '</b> (' + pct(a, tot) + ')</span><span data-chf="alloc" data-chv="unassigned"><i style="background:#d97706"></i>' + t('unassigned') + ': <b>' + fmtN(u) + '</b> (' + pct(u, tot) + ')</span></div>';
}
function loadTime(live, o) {
  safe(function () { return groupBy('date', o); }).then(function (rows) {
    if (!live()) return;
    var el = q('[data-ch="time"]');
    rows = rows.filter(function (r) { return r.k; }).sort(function (a, b) { return a.k < b.k ? -1 : 1; });
    if (!rows.length) { el.innerHTML = '<div class="lm-empty">' + t('noRows') + '</div>'; q('[data-tlmode]').textContent = ''; return; }
    var first = rows[0].k, last = rows[rows.length - 1].k;
    var span = (new Date(last) - new Date(first)) / 864e5;
    var daily = span <= 62;
    q('[data-tlmode]').textContent = daily ? t('byDay') : t('byMonth');
    var b = {}, order = [];
    rows.forEach(function (r) { var key = daily ? r.k : r.k.slice(0, 7); if (!(key in b)) { b[key] = 0; order.push(key); } b[key] += r.c; });
    var max = Math.max.apply(null, order.map(function (k) { return b[k]; }));
    el.innerHTML = '<div class="lm-tl">' + order.map(function (k) {
      var rng = daily ? k + '|' + k : k + '-01|' + frappe.datetime.month_end(k + '-01');
      return '<div class="c" data-chf="time" data-chv="' + rng + '" title="' + k + ': ' + fmtN(b[k]) + '"><div class="v" style="height:' + Math.max(1, b[k] * 100 / max) + '%"></div></div>';
    }).join('') + '</div><div class="lm-tlx"><span>' + order[0] + '</span><span>' + order[order.length - 1] + '</span></div>';
  }, function () { live() && chErr('time'); });
}
function loadDQ(live) {
  var o = { withExtra: false };
  [['missing', MISSING_CONTACT], ['city', MISSING_CITY], ['person', MISSING_PERSON]].forEach(function (p) {
    var el = q('[data-dq="' + p[0] + '"]');
    el.querySelector('b').innerHTML = '<span class="lm-sk"></span>';
    countWith(p[1], o).then(function (v) { if (!live()) return; el.querySelector('b').textContent = fmtN(v); el.classList.toggle('zero', !v); }, function () { live() && (el.querySelector('b').innerHTML = '<span class="lm-errtxt">' + t('error') + '</span>'); });
  });
  // potential duplicates: identical email (contains @) or identical phone (contains a digit), counted with DB grouping
  var dEl = q('[data-dq="dup"]');
  var gE = safe(function () { var a = { fields: ['customer_email as k', 'count(name) as c'], filters: baseFilters(o).concat([[DT, 'customer_email', 'like', '%@%']]), group_by: 'customer_email', order_by: 'c desc' }; var x = orFilters(); if (x) a.or_filters = x; return getList(a); });
  var gP = safe(function () { var a = { fields: ['phone as k', 'count(name) as c'], filters: baseFilters(o).concat([[DT, 'phone', 'like', '%_____%']]), group_by: 'phone', order_by: 'c desc' }; var x = orFilters(); if (x) a.or_filters = x; return getList(a); });
  Promise.all([gE, gP]).then(function (r) {
    if (!live()) return;
    var e = r[0].filter(function (x) { return x.c > 1; }), p = r[1].filter(function (x) { return x.c > 1 && /\d{5}/.test(String(x.k).replace(/\D/g, '')); });
    var g = e.length + p.length, rec = e.concat(p).reduce(function (a, x) { return a + x.c; }, 0);
    dEl.querySelector('b').textContent = fmtN(g) + ' ' + t('groups');
    dEl.classList.toggle('zero', !g);
    var list = e.slice(0, 5).map(function (x) { return '<a data-dupf="customer_email" data-dupv="' + esc(x.k) + '">' + esc(x.k) + '</a> (' + x.c + ')'; })
      .concat(p.slice(0, 5).map(function (x) { return '<a data-dupf="phone" data-dupv="' + esc(x.k) + '">' + esc(x.k) + '</a> (' + x.c + ')'; }));
    q('[data-dups]').innerHTML = '<div class="mut">' + t('dqDupNote') + ' ' + fmtN(rec) + ' ' + t('records') + '.</div>' + (list.length ? '<div style="margin-top:4px">' + list.join(' · ') + '</div>' : '');
  }, function () { live() && (dEl.querySelector('b').innerHTML = '<span class="lm-errtxt">' + t('error') + '</span>'); });
}

var tblReq = 0;
function loadTable() {
  var id = ++tblReq;
  var tb = q('[data-tb]');
  tb.innerHTML = '<tr><td colspan="12" class="lm-empty">' + t('loading') + '</td></tr>';
  var f;
  try { f = baseFilters(); } catch (e) { tb.innerHTML = '<tr><td colspan="12" class="lm-empty lm-errtxt">' + esc(S.allocErr || t('error')) + '</td></tr>'; q('[data-rc]').textContent = ''; return; }
  var o = orFilters();
  var ca = { fields: ['count(name) as c'], filters: f }; if (o) ca.or_filters = o;
  var la = { fields: ['name', 'customer_name', 'date', 'city', 'source', 'contact_person', 'phone', 'telephone', 'customer_email', 'customer_email_2', 'catalogue_status'], filters: f, order_by: S.sort + ' ' + S.dir + ', name desc', limit_start: S.page * S.size, limit_page_length: S.size };
  if (o) la.or_filters = o;
  Promise.all([getList(ca), frappe.xcall('frappe.client.get_list', Object.assign({ doctype: DT }, la))]).then(function (r) {
    if (id !== tblReq) return;
    S.total = (r[0][0] && r[0][0].c) || 0;
    S.rows = r[1];
    renderTable(r[1]);
  }, function () { if (id !== tblReq) return; tb.innerHTML = '<tr><td colspan="12" class="lm-empty lm-errtxt">' + t('error') + '</td></tr>'; });
}
function usable(v, kind) { if (!v) return false; v = String(v); return kind === 'email' ? v.indexOf('@') > -1 : /[0-9٠-٩]/.test(v); }
function renderTable(rows) {
  var tb = q('[data-tb]');
  q('[data-rc]').textContent = '· ' + fmtN(S.total) + ' ' + t('results');
  var from = S.total ? S.page * S.size + 1 : 0, to = Math.min(S.total, (S.page + 1) * S.size);
  q('[data-pginfo]').textContent = from + '–' + to + ' / ' + fmtN(S.total) + ' · ' + t('page') + ' ' + (S.page + 1) + '/' + Math.max(1, Math.ceil(S.total / S.size));
  q('[data-act="prev"]').disabled = S.page === 0;
  q('[data-act="next"]').disabled = (S.page + 1) * S.size >= S.total;
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="12" class="lm-empty">' + t('noRows') + '</td></tr>'; updSel(); return; }
  tb.innerHTML = rows.map(function (r) {
    var url = '/app/' + frappe.router.slug(DT) + '/' + encodeURIComponent(r.name);
    var emails = [r.customer_email, r.customer_email_2].filter(function (e) { return usable(e, 'email'); });
    var phone = usable(r.phone, 'phone') ? r.phone : (usable(r.telephone, 'phone') ? r.telephone : '');
    var em = emails.length ? esc(emails[0]) + (emails.length > 1 ? ' <button class="lm-more" data-more>+' + (emails.length - 1) + ' ' + t('more') + '</button><div style="display:none" class="mut">' + emails.slice(1).map(esc).join('<br>') + '</div>' : '') : '<span class="lm-badge warn">—</span>';
    var al = S.alloc ? (S.alloc[r.name] ? S.alloc[r.name].map(function (a) { return esc(a.sales_person_name); }).join(', ') : ((S.histIds || []).indexOf(r.name) > -1 ? '<span class="lm-badge">' + (lang === 'ar' ? 'موزع سابقاً' : 'Previously allocated') + '</span>' : '<span class="lm-badge warn">' + t('unassigned') + '</span>')) : '<span class="mut">' + t('restricted') + '</span>';
    return '<tr><td><input type="checkbox" data-row="' + esc(r.name) + '"' + (S.sel[r.name] ? ' checked' : '') + '></td>' +
      '<td><a href="' + url + '">' + esc(r.name) + '</a></td>' +
      '<td><a href="' + url + '">' + esc(r.customer_name || '—') + '</a></td>' +
      '<td style="white-space:nowrap">' + (r.date ? frappe.datetime.str_to_user(r.date) : '<span class="mut">—</span>') + '</td>' +
      '<td>' + (usable(r.city, 'x') || /[^\s\-\.]/.test(r.city || '') ? esc(r.city) : '<span class="mut">—</span>') + '</td>' +
      '<td>' + esc(r.source || '—') + '</td>' +
      '<td>' + (/[^\s\-\.]/.test(r.contact_person || '') ? esc(r.contact_person) : '<span class="mut">—</span>') + '</td>' +
      '<td style="white-space:nowrap">' + (phone ? esc(phone) : '<span class="lm-badge warn">—</span>') + '</td>' +
      '<td>' + em + '</td><td>' + al + (CAN_ALLOC && S.alloc && S.alloc[r.name] && S.alloc[r.name].length ? '<br><button class="lm-more" data-act="unassign" data-lead="' + esc(r.name) + '">✕ ' + ut('btn') + '</button>' : '') + '</td>' +
      '<td>' + (r.catalogue_status ? '<span class="lm-badge ok">' + t('yes') + '</span>' : '<span class="lm-badge warn">' + t('no') + '</span>') + '</td>' +
      '<td><a href="' + url + '" title="' + t('open') + '">' + ICON.ext + '</a></td></tr>';
  }).join('');
  updSel();
}
function updSel() {
  var n = Object.keys(S.sel).length;
  var sc = q('[data-selc]'); if (sc) sc.textContent = n ? '(' + n + ')' : '';
  q('[data-selinfo]').innerHTML = n ? n + ' ' + t('selected') + ' <button class="lm-more" data-act="clearsel">' + t('clearSel') + '</button>' : '';
  var all = q('[data-selall]'); var rows = S.rows || [];
  all.checked = rows.length > 0 && rows.every(function (r) { return S.sel[r.name]; });
}
function updXf() {
  var x = q('[data-xf]');
  x.innerHTML = S.extra ? '<span class="lm-chip">' + t('activeFilter') + ': ' + esc(S.extra.label) + ' <button data-act="clearx" title="×">×</button></span>' : '';
}

// ---------- allocation (reuses bulk_allocate_leads + its server-side checks) ----------
function openAllocate() {
  if (!CAN_ALLOC) return frappe.msgprint(t('notAuth'));
  var names = Object.keys(S.sel);
  if (!names.length) return frappe.msgprint(t('noSelection'));
  (function () {
    var d = new frappe.ui.Dialog({
      title: t('allocate'),
      fields: [
        { fieldtype: 'HTML', fieldname: 'info', options: '<p><b>' + names.length + '</b> ' + t('selLeads') + '</p>' },
      ].concat(lmSpFields(t('salesperson')), [
        { fieldname: 'assignment_date', fieldtype: 'Date', label: t('asgnDate'), default: frappe.datetime.get_today(), reqd: 1 },
        { fieldname: 'priority', fieldtype: 'Select', label: t('priority'), options: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium', reqd: 1 },
        { fieldname: 'next_follow_up', fieldtype: 'Datetime', label: t('followUp') }
      ]),
      primary_action_label: t('continue'),
      primary_action: function (v) {
        if (!v.salesperson_user) { frappe.msgprint(__('Please select a salesperson from the suggestions.')); return; }
        var spLabel = d.sp_label || v.salesperson_user;
        var already = S.alloc ? names.filter(function (n) { return S.alloc[n]; }) : [];
        var warn = already.length ? '<div class="alert alert-warning" style="margin-top:8px">' + already.length + ' ' + t('willSkip') + '<br><small>' + already.slice(0, 10).map(function (n) { return esc(n) + ' → ' + esc(S.alloc[n].map(function (a) { return a.sales_person_name; }).join(', ')); }).join('<br>') + (already.length > 10 ? '<br>…' : '') + '</small></div>' : (S.alloc ? '' : '<div class="alert alert-warning">' + t('allocUnavailable') + '</div>');
        d.hide();
        frappe.confirm('<b>' + t('reviewTitle') + '</b><br>' + t('selLeads') + ': <b>' + names.length + '</b><br>' + t('salesperson') + ': <b>' + esc(spLabel) + '</b><br>' + t('asgnDate') + ': ' + esc(v.assignment_date) + ' · ' + t('priority') + ': ' + esc(v.priority) + warn, function () {
          frappe.call({ method: 'bulk_allocate_leads', args: { leads: JSON.stringify(names), salesperson_user: v.salesperson_user, assignment_date: v.assignment_date, priority: v.priority, next_follow_up: v.next_follow_up }, freeze: true }).then(function (res) {
            var m = res.message || {};
            frappe.msgprint({ title: t('done'), indicator: 'green', message: t('created') + ': <b>' + (m.created || 0) + '</b> · ' + t('skipped') + ': <b>' + (m.skipped || 0) + '</b>' + ((m.skipped_leads || []).length ? '<br><small>' + m.skipped_leads.map(esc).join('<br>') + '</small>' : '') });
            S.sel = {};
            refresh(true);
          });
        }, function () { d.show(); });
      }
    });
    d.show();
    lmSpBind(d);
  })();
}
// ---- Salesperson autocomplete (server search: bulk_allocate_leads action=search_salespersons) v3 ----
function lmSpFields(label) {
  return [
    { fieldname: 'sp_search', fieldtype: 'Data', label: label || __('Salesperson'), placeholder: __('Search salesperson by name or email') },
    { fieldname: 'salesperson_user', fieldtype: 'Data', hidden: 1 }
  ];
}
function lmSpBind(d) {
  var inp = d.fields_dict.sp_search.$input;
  inp.attr('placeholder', __('Search salesperson by name or email')).attr('autocomplete', 'off').attr('role', 'combobox').attr('aria-expanded', 'false');
  var wrap = inp.parent();
  wrap.css('position', 'relative');
  var dd = $('<div class="lm-sp-dd" role="listbox" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:1060;background:#fff;border:1px solid #d5dbe5;border-radius:6px;box-shadow:0 6px 16px rgba(16,24,40,.12);max-height:260px;overflow-y:auto;margin-top:2px"></div>');
  var clr = $('<button type="button" title="' + __('Clear') + '" style="display:none;position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:none;color:#6b7280;font-size:16px;line-height:1;cursor:pointer;padding:2px 6px">×</button>');
  wrap.append(clr).append(dd);
  var PAGE = 25;
  var st = { req: 0, timer: null, txt: '', start: 0, more: false, loading: false, active: -1, open: false };
  function esc(s) { return frappe.utils.escape_html(s == null ? '' : String(s)); }
  function items() { return dd.children('.lm-sp-it'); }
  function close() { st.open = false; st.req++; dd.hide().empty(); inp.attr('aria-expanded', 'false'); st.active = -1; }
  function status(text, cls) { dd.children('.lm-sp-st').remove(); if (text) dd.append('<div class="lm-sp-st small ' + (cls || 'text-muted') + '" style="padding:9px 12px">' + esc(text) + '</div>'); }
  function setActive(i) {
    var its = items(); if (!its.length) return;
    st.active = Math.max(0, Math.min(i, its.length - 1));
    its.css('background', '').attr('aria-selected', 'false');
    var el = its.eq(st.active).css('background', '#eef3fa').attr('aria-selected', 'true')[0];
    if (el) {
      var top = el.offsetTop, bot = top + el.offsetHeight;
      if (top < dd[0].scrollTop) dd[0].scrollTop = top; else if (bot > dd[0].scrollTop + dd[0].clientHeight) dd[0].scrollTop = bot - dd[0].clientHeight;
    }
    if (st.active >= its.length - 3) loadMore();
  }
  function choose(x) {
    var lab = (x.full_name || x.user) + ' — ' + x.email;
    d.set_value('salesperson_user', x.user);
    d.sp_label = lab;
    inp.val(lab);
    clr.show();
    close();
  }
  function clearSel() { d.set_value('salesperson_user', ''); d.sp_label = ''; clr.hide(); }
  function fetchPage(reset) {
    if (reset) { st.start = 0; st.more = false; st.active = -1; dd.empty(); }
    var id = ++st.req;
    st.loading = true;
    st.open = true; dd.show(); inp.attr('aria-expanded', 'true');
    status(__('Loading…'));
    frappe.call({ method: 'bulk_allocate_leads', args: { action: 'search_salespersons', txt: st.txt, start: st.start, page_len: PAGE }, error_handlers: { 403: function () {}, 417: function () {} } })
      .then(function (r) {
        if (id !== st.req) return;
        st.loading = false;
        var m = (r && r.message) || {};
        var rows = m.results || [];
        status('');
        if (reset && !rows.length) { status(__('No matching salesperson')); return; }
        rows.forEach(function (x) {
          var lab = (x.full_name || x.user) + ' — ' + x.email;
          var it = $('<div class="lm-sp-it" role="option" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f0f2f6"></div>').text(lab);
          it.on('mouseenter', function () { setActive(items().index(it)); });
          it.on('mousedown', function (e) { e.preventDefault(); choose(x); });
          dd.append(it);
        });
        st.start += rows.length;
        st.more = !!m.has_more;
        if (st.more) status(__('Scroll for more…'));
        else if (m.total != null) status(__('{0} salespersons', [m.total]));
      }, function () { if (id !== st.req) return; st.loading = false; status(__('Could not load salespersons (permission or server error)'), 'text-danger'); })
      .catch(function () { if (id !== st.req) return; st.loading = false; status(__('Could not load salespersons (permission or server error)'), 'text-danger'); });
  }
  function loadMore() { if (st.open && st.more && !st.loading) fetchPage(false); }
  function openList() { if (d.get_value('salesperson_user')) return; st.txt = (inp.val() || '').trim(); fetchPage(true); }
  dd.on('scroll', function () { if (dd[0].scrollTop + dd[0].clientHeight >= dd[0].scrollHeight - 30) loadMore(); });
  inp.on('focus click', function () { if (!st.open) openList(); });
  inp.on('input', function () {
    if (d.get_value('salesperson_user')) clearSel();
    clearTimeout(st.timer);
    st.timer = setTimeout(function () { st.txt = (inp.val() || '').trim(); fetchPage(true); }, 250);
  });
  inp.on('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!st.open) openList(); else setActive(st.active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (st.open) setActive(st.active - 1); }
    else if (e.key === 'Enter') { if (st.open && st.active >= 0) { e.preventDefault(); e.stopPropagation(); items().eq(st.active).trigger('mousedown'); } }
    else if (e.key === 'Escape') { if (st.open) { e.preventDefault(); e.stopPropagation(); close(); } }
  });
  inp.on('blur', function () {
    setTimeout(function () { if (!inp.is(':focus')) close(); }, 150);
    if (!d.get_value('salesperson_user') && inp.val()) inp.val('');
  });
  clr.on('mousedown', function (e) { e.preventDefault(); clearSel(); inp.val(''); st.txt = ''; inp.trigger('focus'); fetchPage(true); });
  clr.on('click', function (e) { e.preventDefault(); });
}
// ---- end salesperson autocomplete ----


// ---------- unassign (ends selected ACTIVE allocations; server: bulk_allocate_leads action=unassign_allocations) ----------
var UT = {
  en: { title: 'Unassign Leads', btn: 'Unassign', btnSel: 'Unassign Selected', none: 'Select at least one lead that has an active allocation.', reason: 'Unassignment reason (required)',
    expl: 'The selected allocations will END with status “Unassigned” (not Closed/Lost/Converted). They are not deleted: outcome, notes, next follow-up and all follow-up history are kept for coordinators. The former salesperson can no longer update them or see them as active work. A lead becomes available for reallocation only when it has no active allocation left.',
    multi: 'This lead has several active allocations — tick the ones to end.', noActive: 'No active allocation (skipped)', confirm: 'Unassign selected allocations', pick: 'Tick at least one allocation.',
    done: 'Unassignment results', ok: 'Unassigned', fail: 'Not changed', remaining: 'active allocation(s) remain', loading: 'Loading current allocations…', err: 'Could not load current allocations.' },
  ar: { title: 'إلغاء إسناد العملاء', btn: 'إلغاء الإسناد', btnSel: 'إلغاء إسناد المحدد', none: 'حدد عميلاً واحداً على الأقل لديه توزيع نشط.', reason: 'سبب إلغاء الإسناد (مطلوب)',
    expl: 'ستنتهي التوزيعات المحددة بالحالة "Unassigned" (وليست مغلقة/خاسرة/محولة). لا يتم حذفها: تبقى النتيجة والملاحظات والمتابعة وسجل المتابعات للمنسقين. لن يتمكن المندوب السابق من تحديثها. يصبح العميل متاحاً لإعادة التوزيع عند عدم وجود توزيع نشط.',
    multi: 'لهذا العميل عدة توزيعات نشطة — اختر ما يجب إنهاؤه.', noActive: 'لا يوجد توزيع نشط (تم التخطي)', confirm: 'إلغاء إسناد التوزيعات المحددة', pick: 'اختر توزيعاً واحداً على الأقل.',
    done: 'نتائج إلغاء الإسناد', ok: 'تم', fail: 'لم يتغير', remaining: 'توزيع نشط متبقٍ', loading: 'جارٍ تحميل التوزيعات الحالية…', err: 'تعذر تحميل التوزيعات الحالية.' }
};
function ut(k) { return (UT[lang] && UT[lang][k]) || UT.en[k]; }
function uPost(args) {
  return fetch('/api/method/bulk_allocate_leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Frappe-CSRF-Token': frappe.csrf_token }, body: JSON.stringify(args) })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error((j._server_messages && JSON.parse(JSON.parse(j._server_messages)[0]).message) || 'error'); e.status = r.status; throw e; } return j.message; }); });
}
function openUnassign(leads) {
  if (!CAN_ALLOC) return frappe.msgprint(t('notAuth'));
  leads = (leads || []).filter(function (l, i, a) { return l && a.indexOf(l) === i; });
  if (!leads.length) return frappe.msgprint(ut('none'));
  var busy = false;
  var d = new frappe.ui.Dialog({ title: ut('title'), size: 'large', fields: [
    { fieldtype: 'HTML', fieldname: 'list' },
    { fieldname: 'reason', fieldtype: 'Small Text', label: ut('reason'), reqd: 1 }
  ], primary_action_label: ut('confirm'), primary_action: function (v) {
    if (busy) return;
    var picks = Array.prototype.slice.call(d.$wrapper[0].querySelectorAll('input[data-ua]:checked')).map(function (c) { return { allocation: c.getAttribute('data-ua'), lead: c.getAttribute('data-ul') }; });
    if (!picks.length) return frappe.msgprint(ut('pick'));
    if (!(v.reason || '').trim() || v.reason.trim().length < 5) return frappe.msgprint(ut('reason'));
    busy = true; d.get_primary_btn().prop('disabled', true);
    uPost({ action: 'unassign_allocations', reason: v.reason.trim(), allocations: JSON.stringify(picks) }).then(function (m) {
      d.hide();
      frappe.msgprint({ title: ut('done'), indicator: m.failed ? 'orange' : 'green', message: '<b>' + ut('ok') + ': ' + m.ok + ' · ' + ut('fail') + ': ' + m.failed + '</b><br>' + (m.results || []).map(function (r) {
        return (r.ok ? '✔ ' : '✖ ') + esc(r.lead || '') + ' / ' + esc(r.allocation) + ' — ' + esc(r.message) + (r.ok && r.remaining_active ? ' (' + r.remaining_active + ' ' + ut('remaining') + ')' : '');
      }).join('<br>') });
      S.sel = {};
      var rp = q('[data-pane="report"]'); if (rp) rp.removeAttribute('data-built');
      var fp = q('[data-pane="fum"]'); if (fp) fp.removeAttribute('data-built');
      refresh(true).then(function () { if (typeof showTab === 'function') showTab(); });
    }, function (e) { busy = false; d.get_primary_btn().prop('disabled', false); frappe.msgprint({ title: ut('title'), indicator: 'red', message: esc(e.message) }); });
  } });
  d.fields_dict.list.$wrapper.html('<div class="text-muted">' + ut('loading') + '</div>');
  d.show();
  // fresh read of CURRENT allocations at open time (the server re-checks again at save time)
  var chunks = []; for (var i = 0; i < leads.length; i += 500) chunks.push(leads.slice(i, i + 500));
  Promise.all(chunks.map(function (c) { return uPost({ action: 'report_allocations', leads: JSON.stringify(c) }); })).then(function (parts) {
    var m = {}; parts.forEach(function (p) { Object.assign(m, p || {}); });
    var html = '<div style="margin-bottom:8px;color:#b45309">' + esc(ut('expl')) + '</div><div style="max-height:45vh;overflow:auto;border:1px solid #e3e7ee;border-radius:6px">';
    leads.forEach(function (l) {
      var cur = (m[l] || []).filter(function (a) { return a.current; });
      var multi = cur.length > 1;
      html += '<div style="padding:8px 10px;border-bottom:1px solid #f0f2f6"><b>' + esc(l) + '</b>' + (multi ? ' <span style="color:#b91c1c">— ' + esc(ut('multi')) + '</span>' : '');
      if (!cur.length) html += '<div class="text-muted small">' + esc(ut('noActive')) + '</div>';
      cur.forEach(function (a) {
        html += '<label style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 0;font-weight:400"><input type="checkbox" data-ua="' + esc(a.allocation) + '" data-ul="' + esc(l) + '"' + (multi ? '' : ' checked') + '><span>' +
          esc(a.sales_person_name || a.sales_person) + ' <span class="text-muted">(' + esc(a.sales_person_email || '') + ')</span> · ' + esc(a.allocation) + ' · ' + esc(a.status) + ' · ' + esc(fdt(a.assignment_date)) + (a.fu_count ? ' · ' + a.fu_count + ' follow-ups' : '') + '</span></label>';
      });
      html += '</div>';
    });
    d.fields_dict.list.$wrapper.html(html + '</div>');
  }, function (e) { d.fields_dict.list.$wrapper.html('<div class="text-danger">' + esc(ut('err')) + ' ' + esc(e.message || '') + '</div>'); });
}

// ---------- refresh ----------
function loadLookups() {
  var o = [[DT, 'docstatus', '!=', 2]];
  return Promise.all([
    getList({ fields: ['city as k', 'count(name) as c'], filters: o.concat([[DT, 'city', 'is', 'set']]), group_by: 'city', order_by: 'city asc' }).then(function (r) { S.cities = r.map(function (x) { return x.k; }).filter(function (x) { return /[^\s\-\.]/.test(x); }); }).catch(function () {}),
    getList({ fields: ['source as k', 'count(name) as c'], filters: o.concat([[DT, 'source', 'is', 'set']]), group_by: 'source', order_by: 'source asc' }).then(function (r) { S.sources = r.map(function (x) { return x.k; }); }).catch(function () {}),
    loadAlloc()
  ]);
}
function refresh(full) {
  setTs(null);
  return loadLookups().then(function () { fillSelects(); renderAll(); S.lastRefresh = new Date(); setTs(S.lastRefresh); });
}
function setTs(d) { var el = q('[data-ts]'); if (el) el.textContent = d ? t('refreshed') + ': ' + frappe.datetime.str_to_user(frappe.datetime.get_datetime_as_string(d)) : t('loading'); }

// ================= DETAILED REPORT TAB (2026-11-02) =================
var RT = {
  en: { tabOverview: 'Overview', tabReport: 'Detailed Report', from: 'From Date', to: 'To Date', basis: 'Date Basis', bLead: 'Lead Date', bAsg: 'Assignment Date',
    city: 'City', source: 'Source', sp: 'Assigned Salesperson', spPh: 'Search salesperson by name or email', astat: 'Allocation Status', all: 'All', assigned: 'Assigned (current)', history: 'Previously allocated (no active)', unassigned: 'Unassigned (never allocated)',
    allocBy: 'Allocated By', cat: 'Catalogue', catY: 'Sent', catN: 'Not sent', priority: 'Priority', fu: 'Follow-up Status', search: 'Search', searchPh: 'Lead ID, company, contact, phone or email',
    apply: 'Apply', reset: 'Reset', refresh: 'Refresh', columns: 'Columns', showAll: 'Show All Columns', resetCols: 'Reset Columns', exportCsv: 'Export Excel (CSV)', print: 'Print / PDF',
    matching: 'Matching Leads', assignedL: 'Assigned Leads', unassignedL: 'Unassigned Leads', histL: 'Previously allocated (no active)', catSent: 'Catalogue Sent',
    defs: 'Definitions — Assigned: lead has at least one current allocation (status not Closed/Converted). Previously allocated: lead has allocation history (Closed / Converted / Unassigned) but no current allocation (shown separately, not as Unassigned). Unassigned: lead has never been allocated. Matching = Assigned + Unassigned + Closed/Converted only. Counts are distinct leads across the complete filtered result.',
    emailNote: 'Email fields available on leads: Customer Email and Email 2. Emails 3–5 do not exist in ERP and are not shown.',
    modNote: 'Last Updated On is the record modification time, not the last customer contact (see Last Contacted).',
    loading: 'Loading…', noRows: 'No leads match the selected filters.', error: 'Could not load data (permission or server error).', denied: 'Allocation details are restricted to Lead Allocation Coordinators and System Managers. Lead fields only are shown.',
    rows: 'leads', page: 'Page', prev: 'Previous', next: 'Next', details: 'Details', allocs: 'Allocations & follow-up history', noAllocs: 'No allocation records.',
    current: 'Current', hist: 'History', reportTitle: 'Lead Management — Detailed Report', filters: 'Filters', generated: 'Generated', by: 'by', none: 'None',
    exportLimit: 'Export limit: first {0} of {1} matching leads were exported.', exporting: 'Preparing export…', truncated: 'Allocation data exceeded the reporting limit; allocation filters may be incomplete.' },
  ar: { tabOverview: 'نظرة عامة', tabReport: 'التقرير التفصيلي', from: 'من تاريخ', to: 'إلى تاريخ', basis: 'أساس التاريخ', bLead: 'تاريخ العميل', bAsg: 'تاريخ الإسناد',
    city: 'المدينة', source: 'المصدر', sp: 'مندوب المبيعات', spPh: 'ابحث عن مندوب بالاسم أو البريد', astat: 'حالة التوزيع', all: 'الكل', assigned: 'موزع (حالي)', history: 'مغلق/محول فقط', unassigned: 'لم يوزع مطلقاً',
    allocBy: 'وزّع بواسطة', cat: 'الكتالوج', catY: 'مرسل', catN: 'غير مرسل', priority: 'الأولوية', fu: 'حالة المتابعة', search: 'بحث', searchPh: 'رقم العميل، الشركة، جهة الاتصال، الهاتف أو البريد',
    apply: 'تطبيق', reset: 'إعادة ضبط', refresh: 'تحديث', columns: 'الأعمدة', showAll: 'إظهار كل الأعمدة', resetCols: 'إعادة ضبط الأعمدة', exportCsv: 'تصدير Excel (CSV)', print: 'طباعة / PDF',
    matching: 'العملاء المطابقون', assignedL: 'العملاء الموزعون', unassignedL: 'العملاء غير الموزعين', histL: 'مغلق/محول فقط', catSent: 'تم إرسال الكتالوج',
    defs: 'التعريفات — موزع: للعميل توزيع حالي واحد على الأقل (الحالة ليست مغلقة/محولة). مغلق/محول فقط: له سجل توزيع دون توزيع حالي (يُعرض منفصلاً). غير موزع: لم يوزع مطلقاً. المطابق = الموزع + غير الموزع + المغلق/المحول فقط. الأعداد للعملاء المميزين عبر كامل النتائج المفلترة.',
    emailNote: 'حقول البريد المتاحة: بريد العميل والبريد 2. حقول البريد 3–5 غير موجودة في النظام.',
    modNote: 'تاريخ آخر تحديث هو وقت تعديل السجل وليس آخر تواصل مع العميل.',
    loading: 'جارٍ التحميل…', noRows: 'لا يوجد عملاء مطابقون.', error: 'تعذر تحميل البيانات (صلاحية أو خطأ في الخادم).', denied: 'تفاصيل التوزيع متاحة لمنسقي التوزيع ومديري النظام فقط.',
    rows: 'عميل', page: 'صفحة', prev: 'السابق', next: 'التالي', details: 'التفاصيل', allocs: 'سجل التوزيع والمتابعة', noAllocs: 'لا توجد سجلات توزيع.',
    current: 'حالي', hist: 'سابق', reportTitle: 'إدارة العملاء المحتملين — تقرير تفصيلي', filters: 'الفلاتر', generated: 'تاريخ الإنشاء', by: 'بواسطة', none: 'لا يوجد',
    exportLimit: 'حد التصدير: تم تصدير أول {0} من {1}.', exporting: 'جارٍ تجهيز التصدير…', truncated: 'تجاوزت بيانات التوزيع الحد؛ قد تكون الفلاتر غير مكتملة.' }
};
function rt(k) { return (RT[lang] && RT[lang][k]) || RT.en[k] || k; }
var RCOLS = [
  // key, en, ar, kind(lead|alloc), sortField, default
  ['name', 'Lead ID', 'رقم العميل', 'lead', 'name', 1],
  ['customer_name', 'Customer / Company', 'العميل / الشركة', 'lead', 'customer_name', 1],
  ['date', 'Lead Date', 'تاريخ العميل', 'lead', 'date', 1],
  ['contact_person', 'Contact Person', 'جهة الاتصال', 'lead', 'contact_person', 1],
  ['designation', 'Designation', 'المسمى', 'lead', 'designation', 0],
  ['city', 'City', 'المدينة', 'lead', 'city', 1],
  ['phone', 'Primary Phone', 'الهاتف الأساسي', 'lead', 'phone', 1],
  ['telephone', 'Telephone', 'الهاتف', 'lead', 'telephone', 0],
  ['customer_email', 'Customer Email', 'بريد العميل', 'lead', 'customer_email', 1],
  ['customer_email_2', 'Email 2', 'البريد 2', 'lead', 'customer_email_2', 0],
  ['source', 'Lead Source', 'المصدر', 'lead', 'source', 1],
  ['action_taken', 'Action Taken', 'الإجراء المتخذ', 'lead', 'action_taken', 0],
  ['activities', 'Activities', 'الأنشطة', 'lead', '', 0],
  ['catalogue_status', 'Catalogue Sent', 'الكتالوج', 'lead', 'catalogue_status', 1],
  ['remarks', 'Remarks', 'ملاحظات', 'lead', '', 0],
  ['a_status', 'Allocation Status', 'حالة التوزيع', 'alloc', '', 1],
  ['a_sp', 'Assigned Salesperson', 'المندوب', 'alloc', '', 1],
  ['a_sp_email', 'Salesperson Email', 'بريد المندوب', 'alloc', '', 0],
  ['a_by', 'Allocated By', 'وزّع بواسطة', 'alloc', '', 1],
  ['a_date', 'Assignment Date', 'تاريخ الإسناد', 'alloc', '', 1],
  ['a_priority', 'Priority', 'الأولوية', 'alloc', '', 0],
  ['a_next', 'Next Follow-up', 'المتابعة القادمة', 'alloc', '', 1],
  ['a_fu', 'Follow-up Status', 'حالة المتابعة', 'alloc', '', 1],
  ['a_last', 'Last Contacted', 'آخر تواصل', 'alloc', '', 0],
  ['a_notes', 'Latest Follow-up Notes', 'آخر ملاحظات المتابعة', 'alloc', '', 0],
  ['f_date', 'Latest Follow-up', 'آخر متابعة', 'alloc', '', 0],
  ['f_method', 'Follow-up Method / Result', 'وسيلة/نتيجة المتابعة', 'alloc', '', 0],
  ['f_outcome', 'Follow-up Outcome', 'نتيجة المتابعة', 'alloc', '', 0],
  ['f_notes', 'Follow-up Notes', 'ملاحظات المتابعة', 'alloc', '', 0],
  ['f_next', 'Follow-up Next Action', 'الإجراء التالي', 'alloc', '', 0],
  ['f_count', 'Follow-up Entries', 'عدد المتابعات', 'alloc', '', 0],
  ['owner', 'Created By', 'أنشئ بواسطة', 'lead', 'owner', 0],
  ['creation', 'Created On', 'تاريخ الإنشاء', 'lead', 'creation', 0],
  ['modified_by', 'Last Updated By', 'آخر تحديث بواسطة', 'lead', 'modified_by', 0],
  ['modified', 'Last Updated On', 'آخر تحديث', 'lead', 'modified', 0]
];
var LEAD_FIELDS = ['name', 'date', 'customer_name', 'contact_person', 'designation', 'city', 'phone', 'telephone', 'customer_email', 'customer_email_2', 'source', 'action_taken', 'activities', 'catalogue_status', 'remarks', 'owner', 'creation', 'modified_by', 'modified'];
var PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
var FU_STATUSES = ['Assigned', 'Contacted', 'Follow Up', 'Interested', 'Quotation Required', 'No Response', 'Not Interested', 'Converted', 'Closed'];
var RCOL_KEY = 'lm_report_cols_v1';
function defaultCols() { return RCOLS.filter(function (c) { return c[5]; }).map(function (c) { return c[0]; }); }
var RS = {
  tab: 'overview', f: { from: '', to: '', basis: 'lead', city: '', source: '', spUser: '', spLabel: '', astat: '', allocBy: '', cat: '', priority: '', fu: '', q: '' },
  page: 0, size: 25, sort: 'date', dir: 'desc', cols: null, ids: null, idsErr: null, allocators: [], rows: [], alloc: {}, total: 0, req: 0, open: {}
};
try { RS.cols = JSON.parse(localStorage.getItem(RCOL_KEY) || 'null'); } catch (e) {}
if (!Array.isArray(RS.cols) || !RS.cols.length) RS.cols = defaultCols();
function saveCols() { try { localStorage.setItem(RCOL_KEY, JSON.stringify(RS.cols)); } catch (e) {} }
function colLabel(c) { return lang === 'ar' ? c[2] : c[1]; }
function rq(s) { return R.querySelector('[data-pane="report"] ' + s); }
function rqa(s) { return Array.prototype.slice.call(R.querySelectorAll('[data-pane="report"] ' + s)); }
function apiPost(args) {
  return fetch('/api/method/bulk_allocate_leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Frappe-CSRF-Token': frappe.csrf_token }, body: JSON.stringify(args) })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error('http'); e.status = r.status; throw e; } return j.message; }); });
}
function userName(u) { if (!u) return ''; try { return frappe.user.full_name(u) || u; } catch (e) { return u; } }
function fdt(v, withTime) { if (!v) return ''; try { return withTime ? frappe.datetime.str_to_user(String(v).slice(0, 19)) : frappe.datetime.str_to_user(String(v).slice(0, 10)); } catch (e) { return String(v); } }

function mountTabs() {
  var el = q('.lm');
  var tabs = el.querySelector('.lm-tabs');
  if (!tabs) return;
  tabs.innerHTML = '<button data-tab="overview" class="' + (RS.tab === 'overview' ? 'on' : '') + '">' + rt('tabOverview') + '</button><button data-tab="report" class="' + (RS.tab === 'report' ? 'on' : '') + '">' + rt('tabReport') + '</button><button data-tab="fum" class="' + (RS.tab === 'fum' ? 'on' : '') + '">' + ft('tab') + '</button>';
  tabs.onclick = function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; RS.tab = b.getAttribute('data-tab'); showTab(); };
  showTab();
}
function showTab() {
  var el = q('.lm');
  el.querySelector('[data-pane="overview"]').style.display = RS.tab === 'overview' ? '' : 'none';
  var rp = el.querySelector('[data-pane="report"]');
  rp.style.display = RS.tab === 'report' ? '' : 'none';
  qa('.lm-tabs [data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === RS.tab); });
  var fp = el.querySelector('[data-pane="fum"]'); fp.style.display = RS.tab === 'fum' ? '' : 'none';
  if (RS.tab === 'report') { if (!rp.getAttribute('data-built')) { buildReport(); rApply(); } }
  if (RS.tab === 'fum') { if (!fp.getAttribute('data-built')) { fumBuild(); fumLoad(); } }
}
function opt(v, l, sel) { return '<option value="' + esc(v) + '"' + (sel === v ? ' selected' : '') + '>' + esc(l) + '</option>'; }
function buildReport() {
  var rp = q('[data-pane="report"]');
  rp.setAttribute('data-built', '1');
  var F = RS.f;
  rp.innerHTML =
    '<div class="lm-card lm-filters">' +
      rf('from', '<input type="date" data-rf="from" value="' + esc(F.from) + '">') + rf('to', '<input type="date" data-rf="to" value="' + esc(F.to) + '">') +
      rf('basis', '<select data-rf="basis">' + opt('lead', rt('bLead'), F.basis) + opt('asg', rt('bAsg'), F.basis) + '</select>') +
      rf('city', '<select data-rf="city">' + opt('', rt('all'), F.city) + S.cities.map(function (c) { return opt(c, c, F.city); }).join('') + '</select>') +
      rf('source', '<select data-rf="source">' + opt('', rt('all'), F.source) + S.sources.map(function (c) { return opt(c, c, F.source); }).join('') + '</select>') +
      '<div class="lm-f"><label>' + rt('sp') + '</label><div style="position:relative"><input type="text" data-rsp autocomplete="off" placeholder="' + rt('spPh') + '" value="' + esc(F.spLabel) + '"><div data-rspdd class="lm-rdd" style="display:none"></div></div></div>' +
      rf('astat', '<select data-rf="astat">' + opt('', rt('all'), F.astat) + opt('assigned', rt('assigned'), F.astat) + opt('unassigned', rt('unassigned'), F.astat) + opt('history', rt('history'), F.astat) + '</select>') +
      rf('allocBy', '<select data-rf="allocBy">' + opt('', rt('all'), F.allocBy) + RS.allocators.map(function (a) { return opt(a.user, a.full_name, F.allocBy); }).join('') + '</select>') +
      rf('cat', '<select data-rf="cat">' + opt('', rt('all'), F.cat) + opt('1', rt('catY'), F.cat) + opt('0', rt('catN'), F.cat) + '</select>') +
      rf('priority', '<select data-rf="priority">' + opt('', rt('all'), F.priority) + PRIORITIES.map(function (p) { return opt(p, p, F.priority); }).join('') + '</select>') +
      rf('fu', '<select data-rf="fu">' + opt('', rt('all'), F.fu) + FU_STATUSES.map(function (p) { return opt(p, p, F.fu); }).join('') + '</select>') +
      '<div class="lm-f wide"><label>' + rt('search') + '</label><input type="search" data-rf="q" placeholder="' + rt('searchPh') + '" value="' + esc(F.q) + '"></div>' +
      '<div class="lm-fbtn"><button class="lm-btn pri" data-ract="apply">' + rt('apply') + '</button><button class="lm-btn" data-ract="reset">' + rt('reset') + '</button><button class="lm-btn" data-ract="refresh">' + ICON.refresh + rt('refresh') + '</button></div>' +
    '</div>' +
    '<div class="lm-kpis lm-rk">' + rk('matching') + rk('assignedL', 'ok') + rk('unassignedL', 'warn') + rk('histL') + rk('catSent') + '</div>' +
    '<div class="lm-note" style="margin:-4px 0 12px">' + rt('defs') + '<br>' + rt('emailNote') + ' ' + rt('modNote') + ' <span data-rwarn class="lm-errtxt"></span></div>' +
    '<div class="lm-card lm-sec"><div class="lm-tbar"><h4>' + rt('tabReport') + ' <span class="mut" data-rcount></span></h4><div class="lm-act" style="position:relative">' +
      '<button class="lm-btn" data-ract="cols">' + rt('columns') + '</button><div data-rcolp class="lm-colp" style="display:none"></div>' +
      '<button class="lm-btn" data-ract="csv">' + rt('exportCsv') + '</button><button class="lm-btn" data-ract="print">' + rt('print') + '</button></div></div>' +
      '<div class="lm-tblwrap lm-rwrap"><table class="lm-rt"><thead data-rhead></thead><tbody data-rbody></tbody></table></div>' +
      '<div class="lm-pg"><div class="mut" data-rpg></div><div class="lm-act"><select data-rsize class="lm-btn">' + [25, 50, 100].map(function (n) { return '<option' + (RS.size === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select><button class="lm-btn" data-ract="prev">' + rt('prev') + '</button><button class="lm-btn" data-ract="next">' + rt('next') + '</button></div></div>' +
    '</div>';
  bindReport();
}
function rf(k, inner) { return '<div class="lm-f"><label>' + rt(k) + '</label>' + inner + '</div>'; }
function rk(k, tone) { return '<div class="lm-card lm-kpi ' + (tone || '') + '" data-rk="' + k + '" style="cursor:default"><div class="k-l">' + rt(k) + '</div><div class="k-v"><span class="lm-sk"></span></div><div class="k-s">&nbsp;</div></div>'; }
function setRk(k, state, v) {
  var el = rq('[data-rk="' + k + '"] .k-v'); if (!el) return;
  if (state === 'loading') el.innerHTML = '<span class="lm-sk"></span>';
  else if (state === 'error') el.innerHTML = '<span class="lm-errtxt">' + esc(v || rt('error')) + '</span>';
  else el.textContent = fmtN(v);
}
function readRF() { rqa('[data-rf]').forEach(function (i) { RS.f[i.getAttribute('data-rf')] = i.value; }); }

var rDeb, spDeb, spReq = 0;
function bindReport() {
  var rp = q('[data-pane="report"]');
  rp.onclick = function (e) {
    e.stopPropagation();
    var a = e.target.closest('[data-ract]');
    if (a) {
      var act = a.getAttribute('data-ract');
      if (act === 'apply') { readRF(); RS.page = 0; rApply(); }
      if (act === 'reset') { RS.f = { from: '', to: '', basis: 'lead', city: '', source: '', spUser: '', spLabel: '', astat: '', allocBy: '', cat: '', priority: '', fu: '', q: '' }; RS.page = 0; RS.sort = 'date'; RS.dir = 'desc'; buildReport(); rApply(); }
      if (act === 'refresh') { readRF(); rApply(); }
      if (act === 'prev' && RS.page > 0) { RS.page--; rLoadPage(); }
      if (act === 'next' && (RS.page + 1) * RS.size < RS.total) { RS.page++; rLoadPage(); }
      if (act === 'cols') toggleColPanel();
      if (act === 'showall') { RS.cols = RCOLS.map(function (c) { return c[0]; }); saveCols(); renderColPanel(); rRender(); }
      if (act === 'resetcols') { RS.cols = defaultCols(); saveCols(); renderColPanel(); rRender(); }
      if (act === 'csv') rExport('csv');
      if (act === 'print') rExport('print');
      if (act === 'expand') { var n = a.getAttribute('data-lead'); RS.open[n] = !RS.open[n]; rRender(); }
      if (act === 'spclear') { RS.f.spUser = ''; RS.f.spLabel = ''; rq('[data-rsp]').value = ''; }
      return;
    }
    var s = e.target.closest('[data-rsort]');
    if (s) { var fld = s.getAttribute('data-rsort'); RS.dir = RS.sort === fld && RS.dir === 'desc' ? 'asc' : 'desc'; RS.sort = fld; RS.page = 0; rLoadPage(); return; }
    if (!e.target.closest('[data-rcolp]')) { var p = rq('[data-rcolp]'); if (p) p.style.display = 'none'; }
  };
  rp.onchange = function (e) {
    e.stopPropagation();
    var c = e.target;
    if (c.matches('[data-rcol]')) { var k = c.getAttribute('data-rcol'); if (c.checked) { if (RS.cols.indexOf(k) < 0) RS.cols.push(k); } else RS.cols = RS.cols.filter(function (x) { return x !== k; }); if (!RS.cols.length) RS.cols = ['name']; saveCols(); rRender(); }
    if (c.matches('[data-rsize]')) { RS.size = parseInt(c.value, 10); RS.page = 0; rLoadPage(); }
  };
  var qi = rq('[data-rf="q"]');
  qi.oninput = function (e) { e.stopPropagation(); clearTimeout(rDeb); rDeb = setTimeout(function () { readRF(); RS.page = 0; rApply(); }, 400); };
  qi.onkeydown = function (e) { if (e.key === 'Enter') { clearTimeout(rDeb); readRF(); RS.page = 0; rApply(); } };
  // salesperson searchable selector (same server search: Sales User OR Salesman)
  var si = rq('[data-rsp]'), dd = rq('[data-rspdd]');
  function spSearch() {
    var id = ++spReq, txt = si.value.trim();
    dd.style.display = 'block'; dd.innerHTML = '<div class="mut" style="padding:8px 10px">' + rt('loading') + '</div>';
    apiPost({ action: 'search_salespersons', txt: txt, page_len: 50 }).then(function (m) {
      if (id !== spReq) return;
      var rows = (m && m.results) || [];
      dd.innerHTML = rows.length ? rows.map(function (x) { return '<div class="lm-rdi" data-u="' + esc(x.user) + '">' + esc((x.full_name || x.user) + ' — ' + x.email) + '</div>'; }).join('') + (m.has_more ? '<div class="mut" style="padding:6px 10px">' + fmtN(m.total) + ' — ' + rt('search') + '…</div>' : '') : '<div class="mut" style="padding:8px 10px">' + rt('noRows') + '</div>';
    }, function () { if (id === spReq) dd.innerHTML = '<div class="lm-errtxt" style="padding:8px 10px">' + rt('error') + '</div>'; });
  }
  si.onfocus = function () { if (!RS.f.spUser) spSearch(); };
  si.oninput = function (e) { e.stopPropagation(); RS.f.spUser = ''; RS.f.spLabel = ''; clearTimeout(spDeb); spDeb = setTimeout(spSearch, 250); };
  si.onkeydown = function (e) { if (e.key === 'Escape') dd.style.display = 'none'; };
  si.onblur = function () { setTimeout(function () { dd.style.display = 'none'; if (!RS.f.spUser) si.value = ''; }, 150); };
  dd.onmousedown = function (e) { var it = e.target.closest('[data-u]'); if (!it) return; e.preventDefault(); RS.f.spUser = it.getAttribute('data-u'); RS.f.spLabel = it.textContent; si.value = it.textContent; dd.style.display = 'none'; };
}
function toggleColPanel() { var p = rq('[data-rcolp]'); if (p.style.display === 'none') { renderColPanel(); p.style.display = 'block'; } else p.style.display = 'none'; }
function renderColPanel() {
  var p = rq('[data-rcolp]');
  p.innerHTML = '<div style="display:flex;gap:6px;margin-bottom:6px"><button class="lm-btn" data-ract="showall">' + rt('showAll') + '</button><button class="lm-btn" data-ract="resetcols">' + rt('resetCols') + '</button></div>' +
    RCOLS.map(function (c) { return '<label style="display:flex;gap:6px;align-items:center;padding:2px 0;font-weight:400"><input type="checkbox" data-rcol="' + c[0] + '"' + (RS.cols.indexOf(c[0]) > -1 ? ' checked' : '') + '>' + esc(colLabel(c)) + '</label>'; }).join('');
}

// ---- query building (permission-aware lead queries + server-checked allocation ID sets) ----
function rBaseFilters() {
  var F = RS.f, f = [[DT, 'docstatus', '!=', 2]];
  if (F.basis === 'lead') { if (F.from) f.push([DT, 'date', '>=', F.from]); if (F.to) f.push([DT, 'date', '<=', F.to]); }
  if (F.city) f.push([DT, 'city', '=', F.city]);
  if (F.source) f.push([DT, 'source', '=', F.source]);
  if (F.cat !== '') f.push([DT, 'catalogue_status', '=', parseInt(F.cat, 10)]);
  var I = RS.ids;
  if (I && I.matched) f.push([DT, 'name', 'in', I.matched.length ? I.matched : ['__none__']]);
  return f;
}
function rOr() { var s = (RS.f.q || '').trim(); if (!s) return null; var l = '%' + s + '%'; return ['name', 'customer_name', 'contact_person', 'phone', 'telephone', 'customer_email', 'customer_email_2'].map(function (x) { return [DT, x, 'like', l]; }); }
function rStatusFilter(st) {
  var I = RS.ids, cur = I.current, his = I.history_only;
  if (st === 'assigned') return [[DT, 'name', 'in', cur.length ? cur : ['__none__']]];
  if (st === 'history') return [[DT, 'name', 'in', his.length ? his : ['__none__']]];
  if (st === 'unassigned_all') return cur.length ? [[DT, 'name', 'not in', cur]] : [];
  if (st === 'unassigned') { var u = cur.concat(his); return u.length ? [[DT, 'name', 'not in', u]] : []; }
  return [];
}
function rFilters() { return rBaseFilters().concat(rStatusFilter(RS.f.astat)); }
function rCount(extra) {
  var a = { fields: ['count(name) as c'], filters: rBaseFilters().concat(extra) }; var o = rOr(); if (o) a.or_filters = o;
  return getList(a).then(function (r) { return (r && r[0] && r[0].c) || 0; });
}
function allocArgs() {
  var F = RS.f, a = { action: 'report_lead_ids' };
  if (F.spUser) a.salesperson_user = F.spUser;
  if (F.allocBy) a.allocated_by = F.allocBy;
  if (F.priority) a.priority = F.priority;
  if (F.fu) a.fu_status = F.fu;
  if (F.basis === 'asg') { if (F.from) a.asg_from = F.from; if (F.to) a.asg_to = F.to; }
  return a;
}
function rApply() {
  var id = ++RS.req;
  ['matching', 'assignedL', 'unassignedL', 'histL', 'catSent'].forEach(function (k) { setRk(k, 'loading'); });
  rq('[data-rbody]').innerHTML = '<tr><td class="lm-empty" colspan="40">' + rt('loading') + '</td></tr>';
  apiPost(allocArgs()).then(function (m) {
    if (id !== RS.req) return;
    RS.ids = m; RS.idsErr = null;
    var hadAllocators = RS.allocators.length;
    RS.allocators = m.allocators || [];
    if (!hadAllocators && RS.allocators.length) { var sel = rq('[data-rf="allocBy"]'); if (sel) sel.innerHTML = opt('', rt('all'), RS.f.allocBy) + RS.allocators.map(function (a) { return opt(a.user, a.full_name, RS.f.allocBy); }).join(''); }
    rq('[data-rwarn]').textContent = m.truncated ? rt('truncated') : '';
    rSummary(id); rLoadPage();
  }, function (e) {
    if (id !== RS.req) return;
    RS.ids = null; RS.idsErr = (e && (e.status === 403 || e.status === 417)) ? rt('denied') : rt('error');
    ['matching', 'assignedL', 'unassignedL', 'histL', 'catSent'].forEach(function (k) { setRk(k, 'error', RS.idsErr); });
    rq('[data-rbody]').innerHTML = '<tr><td class="lm-empty lm-errtxt" colspan="40">' + esc(RS.idsErr) + '</td></tr>';
  });
}
function rSummary(id) {
  var st = rStatusFilter(RS.f.astat);
  rCount(st).then(function (v) { if (id === RS.req) setRk('matching', 'ok', v); }, function () { id === RS.req && setRk('matching', 'error'); });
  // Assigned/Unassigned/History are computed inside the same filtered scope (incl. the status filter)
  rCount(st.concat(rStatusFilter('assigned'))).then(function (v) { if (id === RS.req) setRk('assignedL', 'ok', v); }, function () { id === RS.req && setRk('assignedL', 'error'); });
  rCount(st.concat(rStatusFilter('unassigned'))).then(function (v) { if (id === RS.req) setRk('unassignedL', 'ok', v); }, function () { id === RS.req && setRk('unassignedL', 'error'); });
  rCount(st.concat(rStatusFilter('history'))).then(function (v) { if (id === RS.req) setRk('histL', 'ok', v); }, function () { id === RS.req && setRk('histL', 'error'); });
  rCount(st.concat([[DT, 'catalogue_status', '=', 1]])).then(function (v) { if (id === RS.req) setRk('catSent', 'ok', v); }, function () { id === RS.req && setRk('catSent', 'error'); });
}
var rPageReq = 0;
function rLoadPage() {
  if (!RS.ids) return;
  var id = ++rPageReq;
  rq('[data-rbody]').innerHTML = '<tr><td class="lm-empty" colspan="40">' + rt('loading') + '</td></tr>';
  var f = rFilters(), o = rOr();
  var ca = { fields: ['count(name) as c'], filters: f }; if (o) ca.or_filters = o;
  var la = { doctype: DT, fields: LEAD_FIELDS, filters: f, order_by: RS.sort + ' ' + RS.dir + ', name desc', limit_start: RS.page * RS.size, limit_page_length: RS.size }; if (o) la.or_filters = o;
  Promise.all([getList(ca), frappe.xcall('frappe.client.get_list', la)]).then(function (r) {
    if (id !== rPageReq) return;
    RS.total = (r[0][0] && r[0][0].c) || 0; RS.rows = r[1];
    var names = RS.rows.map(function (x) { return x.name; });
    if (!names.length) { RS.alloc = {}; rRender(); return; }
    apiPost({ action: 'report_allocations', leads: JSON.stringify(names) }).then(function (m) { if (id !== rPageReq) return; RS.alloc = m || {}; RS.allocErr = null; rRender(); },
      function () { if (id !== rPageReq) return; RS.alloc = {}; RS.allocErr = rt('denied'); rRender(); });
  }, function () { if (id !== rPageReq) return; rq('[data-rbody]').innerHTML = '<tr><td class="lm-empty lm-errtxt" colspan="40">' + rt('error') + '</td></tr>'; });
}

// ---- cell values (shared by table, CSV and print) ----
function allocSummary(lead) {
  var all = (RS.alloc && RS.alloc[lead]) || [];
  var cur = all.filter(function (a) { return a.current; });
  var hist = all.filter(function (a) { return !a.current; });
  var latest = all[0] || null; // server returns newest first
  return { all: all, cur: cur, hist: hist, latest: latest, show: cur.length ? cur : (latest ? [latest] : []) };
}
function cellText(key, r) {
  var A = allocSummary(r.name), sh = A.show;
  function j(fn) { return sh.map(fn).filter(function (x) { return x; }).join('; '); }
  switch (key) {
    case 'date': return fdt(r.date);
    case 'catalogue_status': return r.catalogue_status ? rt('catY') : rt('catN');
    case 'owner': return userName(r.owner);
    case 'modified_by': return userName(r.modified_by);
    case 'creation': return fdt(r.creation, 1);
    case 'modified': return fdt(r.modified, 1);
    case 'a_status': return RS.allocErr ? '' : (A.cur.length ? rt('assigned') + (A.cur.length > 1 ? ' (' + A.cur.length + ')' : '') : (A.hist.length ? rt('history') : rt('unassigned')));
    case 'a_sp': return j(function (a) { return a.sales_person_name; }) + (A.cur.length ? '' : (A.latest ? ' (' + rt('hist') + ')' : ''));
    case 'a_sp_email': return j(function (a) { return a.sales_person_email; });
    case 'a_by': return j(function (a) { return a.allocated_by; });
    case 'a_date': return j(function (a) { return fdt(a.assignment_date); });
    case 'a_priority': return j(function (a) { return a.priority; });
    case 'a_next': return j(function (a) { return fdt(a.next_follow_up, 1); });
    case 'a_fu': return j(function (a) { return [a.status, a.outcome].filter(function (x) { return x; }).join(' / '); });
    case 'a_last': return j(function (a) { return fdt(a.last_contacted, 1); });
    case 'a_notes': return A.latest ? (A.latest.remarks || '') : '';
    case 'f_date': case 'f_method': case 'f_outcome': case 'f_notes': case 'f_next': case 'f_count':
      var fl = null, fc = 0; A.all.forEach(function (a) { fc += a.fu_count || 0; if (a.fu_latest && (!fl || a.fu_latest.date > fl.date)) fl = a.fu_latest; });
      if (key === 'f_count') return String(fc);
      if (!fl) return '';
      return key === 'f_date' ? fdt(fl.date, 1) : key === 'f_method' ? (fl.method || '') + ' / ' + (fl.result || '') : key === 'f_outcome' ? (fl.outcome || '') : key === 'f_notes' ? (fl.notes || '') : (fl.next_action || '');
    default: return r[key] == null ? '' : String(r[key]);
  }
}
function rRender() {
  var cols = RCOLS.filter(function (c) { return RS.cols.indexOf(c[0]) > -1; });
  var stickL = lang === 'ar' ? 'right' : 'left';
  rq('[data-rhead]').innerHTML = '<tr><th class="lm-st0" style="' + stickL + ':0"></th>' + cols.map(function (c) {
    var st = c[0] === 'name' ? ' class="lm-st1"' : (c[0] === 'customer_name' ? ' class="lm-st2"' : '');
    var srt = c[4] ? ' data-rsort="' + c[4] + '" style="cursor:pointer"' : '';
    var arr = c[4] && RS.sort === c[4] ? (RS.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return '<th' + st + srt + '>' + esc(colLabel(c)) + arr + '</th>';
  }).join('') + '</tr>';
  var tb = rq('[data-rbody]');
  rq('[data-rcount]').textContent = '· ' + fmtN(RS.total) + ' ' + rt('rows');
  var from = RS.total ? RS.page * RS.size + 1 : 0, to = Math.min(RS.total, (RS.page + 1) * RS.size);
  rq('[data-rpg]').textContent = from + '–' + to + ' / ' + fmtN(RS.total) + ' · ' + rt('page') + ' ' + (RS.page + 1) + '/' + Math.max(1, Math.ceil(RS.total / RS.size));
  rq('[data-ract="prev"]').disabled = RS.page === 0; rq('[data-ract="next"]').disabled = (RS.page + 1) * RS.size >= RS.total;
  if (!RS.rows.length) { tb.innerHTML = '<tr><td class="lm-empty" colspan="40">' + rt('noRows') + '</td></tr>'; return; }
  var url = function (n) { return '/app/' + frappe.router.slug(DT) + '/' + encodeURIComponent(n); };
  tb.innerHTML = RS.rows.map(function (r) {
    var A = allocSummary(r.name);
    var tds = cols.map(function (c) {
      var k = c[0], v = cellText(k, r), html;
      if (k === 'name' || k === 'customer_name') html = '<a href="' + url(r.name) + '">' + esc(v || '—') + '</a>';
      else if (k === 'catalogue_status') html = '<span class="lm-badge ' + (r.catalogue_status ? 'ok' : 'warn') + '">' + esc(v) + '</span>';
      else if (k === 'a_status') html = RS.allocErr ? '<span class="mut">' + esc(rt('denied')) + '</span>' : '<span class="lm-badge ' + (A.cur.length ? 'ok' : (A.hist.length ? '' : 'warn')) + '">' + esc(v) + '</span>';
      else if (k === 'activities' || k === 'remarks' || k === 'a_notes') html = v ? '<span class="lm-clip" title="' + esc(v) + '">' + esc(v.length > 60 ? v.slice(0, 60) + '…' : v) + '</span>' : '<span class="mut">—</span>';
      else html = v ? esc(v).replace(/; /g, '<br>') : '<span class="mut">—</span>';
      var cls = k === 'name' ? ' class="lm-st1"' : (k === 'customer_name' ? ' class="lm-st2"' : '');
      return '<td' + cls + '>' + html + '</td>';
    }).join('');
    var row = '<tr><td class="lm-st0" style="' + stickL + ':0"><button class="lm-more" data-ract="expand" data-lead="' + esc(r.name) + '" title="' + rt('details') + '">' + (RS.open[r.name] ? '▾' : '▸') + '</button></td>' + tds + '</tr>';
    if (RS.open[r.name]) {
      var al = A.all.length ? '<table class="lm-sub"><tr><th></th><th>' + RT[lang === 'ar' ? 'ar' : 'en'].sp + '</th><th>' + colLabel(RCOLS[18]) + '</th><th>' + colLabel(RCOLS[19]) + '</th><th>' + colLabel(RCOLS[20]) + '</th><th>' + colLabel(RCOLS[22]) + '</th><th>' + colLabel(RCOLS[23]) + '</th><th>' + colLabel(RCOLS[21]) + '</th><th>' + colLabel(RCOLS[14]) + '</th></tr>' +
        A.all.map(function (a) { return '<tr><td><span class="lm-badge ' + (a.current ? 'ok' : '') + '">' + (a.current ? rt('current') : rt('hist')) + '</span></td><td>' + esc(a.sales_person_name) + '<br><span class="mut">' + esc(a.sales_person_email || '') + '</span></td><td>' + esc(a.allocated_by || '') + '</td><td>' + esc(fdt(a.assignment_date)) + '</td><td>' + esc(a.priority || '') + '</td><td>' + esc([a.status, a.outcome].filter(function (x) { return x; }).join(' / ')) + '</td><td>' + esc(fdt(a.last_contacted, 1)) + '</td><td>' + esc(fdt(a.next_follow_up, 1)) + '</td><td style="white-space:pre-wrap">' + esc(a.remarks || '') + '</td></tr>'; }).join('') + '</table>'
        : '<div class="mut">' + (RS.allocErr ? esc(RS.allocErr) : rt('noAllocs')) + '</div>';
      row += '<tr class="lm-exp"><td></td><td colspan="' + cols.length + '"><div class="lm-expd">' +
        '<div><b>' + colLabel(RCOLS[12]) + ':</b> <span style="white-space:pre-wrap">' + esc(r.activities || '—') + '</span></div>' +
        '<div><b>' + colLabel(RCOLS[14]) + ':</b> <span style="white-space:pre-wrap">' + esc(r.remarks || '—') + '</span></div>' +
        '<div><b>' + colLabel(RCOLS[8]) + ':</b> ' + esc(r.customer_email || '—') + ' · <b>' + colLabel(RCOLS[9]) + ':</b> ' + esc(r.customer_email_2 || '—') + '</div>' +
        '<div style="margin-top:6px"><b>' + rt('allocs') + '</b></div>' + al + '</div></td></tr>';
    }
    return row;
  }).join('');
}

// ---- export (complete filtered scope, chunked, permission-aware) ----
var EXPORT_MAX = 10000;
function csvCell(v) {
  v = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(v) && !/^-+$/.test(v.trim())) v = "'" + v; // neutralise spreadsheet formulas
  return '"' + v.replace(/"/g, '""') + '"';
}
function filterSummary() {
  var F = RS.f, p = [];
  if (F.from || F.to) p.push(rt('basis') + ': ' + (F.basis === 'asg' ? rt('bAsg') : rt('bLead')) + ' ' + (F.from || '…') + ' → ' + (F.to || '…'));
  if (F.city) p.push(rt('city') + ': ' + F.city);
  if (F.source) p.push(rt('source') + ': ' + F.source);
  if (F.spUser) p.push(rt('sp') + ': ' + F.spLabel);
  if (F.astat) p.push(rt('astat') + ': ' + rt(F.astat));
  if (F.allocBy) p.push(rt('allocBy') + ': ' + ((RS.allocators.filter(function (a) { return a.user === F.allocBy; })[0] || {}).full_name || F.allocBy));
  if (F.cat !== '') p.push(rt('cat') + ': ' + (F.cat === '1' ? rt('catY') : rt('catN')));
  if (F.priority) p.push(rt('priority') + ': ' + F.priority);
  if (F.fu) p.push(rt('fu') + ': ' + F.fu);
  if (F.q) p.push(rt('search') + ': "' + F.q + '"');
  return p.length ? p.join(' | ') : rt('none');
}
function fetchAllForExport() {
  var f = rFilters(), o = rOr(), out = [], allocs = {};
  var total = RS.total, n = Math.min(total, EXPORT_MAX), start = 0;
  function step() {
    if (start >= n) return Promise.resolve();
    var la = { doctype: DT, fields: LEAD_FIELDS, filters: f, order_by: RS.sort + ' ' + RS.dir + ', name desc', limit_start: start, limit_page_length: Math.min(500, n - start) }; if (o) la.or_filters = o;
    return frappe.xcall('frappe.client.get_list', la).then(function (rows) {
      out = out.concat(rows); start += rows.length;
      if (!rows.length) { start = n; return; }
      return apiPost({ action: 'report_allocations', leads: JSON.stringify(rows.map(function (x) { return x.name; })) }).then(function (m) { Object.assign(allocs, m || {}); }, function () {});
    }).then(step);
  }
  return step().then(function () { return { rows: out, allocs: allocs, total: total, limited: total > EXPORT_MAX }; });
}
function rExport(kind) {
  if (!RS.ids) return;
  var win = kind === 'print' ? window.open('', '_blank') : null;
  frappe.show_alert({ message: rt('exporting'), indicator: 'blue' });
  fetchAllForExport().then(function (res) {
    var keep = RS.alloc; RS.alloc = res.allocs;
    var cols = RCOLS.filter(function (c) { return RS.cols.indexOf(c[0]) > -1; });
    var now = frappe.datetime.str_to_user(frappe.datetime.now_datetime());
    var by = frappe.session.user_fullname || frappe.session.user;
    var limitMsg = res.limited ? rt('exportLimit').replace('{0}', fmtN(res.rows.length)).replace('{1}', fmtN(res.total)) : '';
    if (kind === 'csv') {
      var lines = [];
      lines.push(csvCell(rt('reportTitle')));
      lines.push(csvCell(rt('filters') + ': ' + filterSummary()));
      lines.push(csvCell(rt('generated') + ': ' + now + ' ' + rt('by') + ' ' + by));
      lines.push(csvCell(fmtN(res.rows.length) + ' / ' + fmtN(res.total) + ' ' + rt('rows') + (limitMsg ? ' — ' + limitMsg : '')));
      lines.push(csvCell(rt('emailNote')));
      lines.push('');
      lines.push(cols.map(function (c) { return csvCell(colLabel(c)); }).join(','));
      res.rows.forEach(function (r) { lines.push(cols.map(function (c) { return csvCell(cellText(c[0], r)); }).join(',')); });
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'Lead_Detailed_Report_' + frappe.datetime.now_date() + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } else if (win) {
      var dir = lang === 'ar' ? 'rtl' : 'ltr';
      var html = '<!doctype html><html dir="' + dir + '"><head><meta charset="utf-8"><title>' + esc(rt('reportTitle')) + '</title><style>' +
        'body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#1f2937;margin:18px;font-size:10.5px}h1{color:#14325c;font-size:16px;margin:0 0 4px}.m{color:#6b7280;margin:2px 0}' +
        'table{border-collapse:collapse;width:100%;margin-top:10px}th{background:#14325c;color:#fff;text-align:start;padding:4px 5px;font-weight:600}td{border-bottom:1px solid #e3e7ee;padding:4px 5px;vertical-align:top;white-space:pre-wrap}tr:nth-child(even) td{background:#f8fafc}' +
        '@page{size:A4 landscape;margin:10mm}thead{display:table-header-group}.w{color:#b45309;font-weight:600}</style></head><body>' +
        '<h1>' + esc(rt('reportTitle')) + '</h1><div class="m"><b>' + esc(rt('filters')) + ':</b> ' + esc(filterSummary()) + '</div>' +
        '<div class="m"><b>' + esc(rt('generated')) + ':</b> ' + esc(now) + ' ' + esc(rt('by')) + ' ' + esc(by) + ' · ' + fmtN(res.rows.length) + ' / ' + fmtN(res.total) + ' ' + esc(rt('rows')) + '</div>' +
        (limitMsg ? '<div class="m w">' + esc(limitMsg) + '</div>' : '') + '<div class="m">' + esc(rt('emailNote')) + '</div>' +
        '<table><thead><tr>' + cols.map(function (c) { return '<th>' + esc(colLabel(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        res.rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + esc(cellText(c[0], r)) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table><script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>';
      win.document.open(); win.document.write(html); win.document.close();
    }
    RS.alloc = keep;
  }, function () { if (win) win.close(); frappe.msgprint(rt('error')); });
}
// ================= END DETAILED REPORT TAB =================


// ================= FOLLOW-UP MONITORING TAB (2026-11-09) =================
var FT = {
  en: { tab: 'Follow-up Monitoring', active: 'Active Assigned Leads', overdue: 'Overdue Follow-ups', today: 'Due Today', upcoming: 'Upcoming', nofu: 'No Follow-up Scheduled', nolog: 'No Recorded Follow-up', activities: 'Recorded follow-up entries',
    defs: 'Lead cards count DISTINCT leads with a current allocation (status not Closed/Converted) within your filters. Overdue / Due Today / Upcoming use the allocation’s Next Follow-up in Asia/Riyadh time. “No Follow-up Scheduled” = none of the lead’s current allocations has a next follow-up. “No Recorded Follow-up” = no entry in the Lead Follow-up Log (tracking started 09-11-2026; earlier contacts are not recorded). Table rows are allocations; a lead with two current allocations is flagged.',
    sp: 'Salesperson', allocBy: 'Allocated By', status: 'Status', priority: 'Priority', due: 'Due Category', dbasis: 'Date refers to', dNext: 'Scheduled next follow-up', dAct: 'Latest recorded follow-up', from: 'From', to: 'To', search: 'Customer / Lead', all: 'All',
    apply: 'Apply', reset: 'Reset', refresh: 'Refresh', cLead: 'Lead', cSp: 'Salesperson', cAsg: 'Assigned', cStatus: 'Status / Priority', cLast: 'Latest follow-up', cNotes: 'Latest notes', cNext: 'Next action / follow-up', cOver: 'Overdue', cCnt: 'Entries', hist: 'View History',
    days: 'days', loading: 'Loading…', empty: 'No allocations match.', err: 'Could not load follow-up data.', denied: 'Follow-up monitoring is limited to Lead Allocation Coordinators and System Managers.', retry: 'Retry', prev: 'Previous', next: 'Next', results: 'allocations', dup: 'Duplicate current allocation',
    histTitle: 'Follow-up history', noHist: 'No follow-ups recorded for this lead.', recBy: 'Recorded by', resNo: 'Attempted - no response', resOK: 'Conversation held' },
  ar: { tab: 'متابعة المتابعات', active: 'العملاء الموزعون النشطون', overdue: 'متابعات متأخرة', today: 'مستحقة اليوم', upcoming: 'قادمة', nofu: 'بدون متابعة مجدولة', nolog: 'بدون متابعة مسجلة', activities: 'إدخالات المتابعة المسجلة',
    defs: 'بطاقات العملاء تعدّ العملاء المميزين الذين لديهم توزيع حالي ضمن الفلاتر. المتأخرة/اليوم/القادمة حسب المتابعة القادمة بتوقيت الرياض. "بدون متابعة مسجلة" = لا يوجد إدخال في سجل المتابعات (بدأ التتبع 09-11-2026). صفوف الجدول توزيعات.',
    sp: 'المندوب', allocBy: 'وزّع بواسطة', status: 'الحالة', priority: 'الأولوية', due: 'فئة الاستحقاق', dbasis: 'التاريخ يشير إلى', dNext: 'المتابعة القادمة المجدولة', dAct: 'آخر متابعة مسجلة', from: 'من', to: 'إلى', search: 'العميل / الرقم', all: 'الكل',
    apply: 'تطبيق', reset: 'إعادة ضبط', refresh: 'تحديث', cLead: 'العميل', cSp: 'المندوب', cAsg: 'الإسناد', cStatus: 'الحالة / الأولوية', cLast: 'آخر متابعة', cNotes: 'آخر الملاحظات', cNext: 'الإجراء / المتابعة القادمة', cOver: 'التأخير', cCnt: 'الإدخالات', hist: 'عرض السجل',
    days: 'يوم', loading: 'جارٍ التحميل…', empty: 'لا توجد توزيعات مطابقة.', err: 'تعذر تحميل بيانات المتابعة.', denied: 'متاحة لمنسقي التوزيع ومديري النظام فقط.', retry: 'إعادة المحاولة', prev: 'السابق', next: 'التالي', results: 'توزيع', dup: 'توزيع حالي مكرر',
    histTitle: 'سجل المتابعات', noHist: 'لا توجد متابعات مسجلة لهذا العميل.', recBy: 'سجّلها', resNo: 'Attempted - no response', resOK: 'Conversation held' }
};
function ft(k) { return (FT[lang] && FT[lang][k]) || FT.en[k] || k; }
var FS = { f: { sp_user: '', alloc_by: '', status: '', priority: '', due: '', dbasis: 'next', dfrom: '', dto: '', q: '' }, page: 0, size: 25, sort: 'next_follow_up', dir: 'asc', req: 0, total: 0, sps: [], allocators: [] };
function fq(s) { return R.querySelector('[data-pane="fum"] ' + s); }
var FU_ST = ['Assigned', 'Contacted', 'Follow Up', 'Interested', 'Quotation Required', 'No Response', 'Not Interested'];
function fumBuild() {
  var p = q('[data-pane="fum"]'); p.setAttribute('data-built', '1');
  var F = FS.f;
  function sel(k, opts) { return '<div class="lm-f"><label>' + ft(k === 'sp_user' ? 'sp' : (k === 'alloc_by' ? 'allocBy' : k)) + '</label><select data-ff="' + k + '">' + opts + '</select></div>'; }
  p.innerHTML = '<div class="lm-card lm-filters">' +
    sel('sp_user', opt('', ft('all'), F.sp_user) + FS.sps.map(function (x) { return opt(x.user, x.name, F.sp_user); }).join('')) +
    sel('alloc_by', opt('', ft('all'), F.alloc_by) + FS.allocators.map(function (x) { return opt(x.user, x.name, F.alloc_by); }).join('')) +
    sel('status', opt('', ft('all'), F.status) + FU_ST.map(function (x) { return opt(x, x, F.status); }).join('')) +
    sel('priority', opt('', ft('all'), F.priority) + ['Low', 'Medium', 'High', 'Urgent'].map(function (x) { return opt(x, x, F.priority); }).join('')) +
    sel('due', opt('', ft('all'), F.due) + ['overdue', 'today', 'upcoming', 'nofu', 'nolog'].map(function (x) { return opt(x, ft(x), F.due); }).join('')) +
    sel('dbasis', opt('next', ft('dNext'), F.dbasis) + opt('activity', ft('dAct'), F.dbasis)) +
    '<div class="lm-f"><label>' + ft('from') + '</label><input type="date" data-ff="dfrom" value="' + esc(F.dfrom) + '"></div><div class="lm-f"><label>' + ft('to') + '</label><input type="date" data-ff="dto" value="' + esc(F.dto) + '"></div>' +
    '<div class="lm-f wide"><label>' + ft('search') + '</label><input type="search" data-ff="q" value="' + esc(F.q) + '"></div>' +
    '<div class="lm-fbtn"><button class="lm-btn pri" data-fact="apply">' + ft('apply') + '</button><button class="lm-btn" data-fact="reset">' + ft('reset') + '</button><button class="lm-btn" data-fact="refresh">' + ICON.refresh + ft('refresh') + '</button></div></div>' +
    '<div class="lm-kpis lm-fk">' + ['active', 'overdue', 'today', 'upcoming', 'nofu', 'nolog'].map(function (k) { return '<div class="lm-card lm-kpi ' + ({ overdue: 'bad', today: 'warn', active: 'ok' }[k] || '') + '" data-fcard="' + k + '" role="button"><div class="k-l">' + ft(k) + '</div><div class="k-v"><span class="lm-sk"></span></div><div class="k-s">&nbsp;</div></div>'; }).join('') + '</div>' +
    '<div class="lm-note" style="margin:-4px 0 10px">' + ft('defs') + ' <b data-fact-count></b></div>' +
    '<div class="lm-card lm-sec"><div class="lm-tbar"><h4>' + ft('tab') + ' <span class="mut" data-fcount></span></h4></div><div class="lm-tblwrap"><table><thead><tr>' +
    [['customer_name', 'cLead'], ['salesperson', 'cSp'], ['assignment_date', 'cAsg'], ['status', 'cStatus'], ['last_fu_date', 'cLast'], ['', 'cNotes'], ['next_follow_up', 'cNext'], ['overdue_days', 'cOver'], ['fu_count', 'cCnt'], ['', '']].map(function (c) { return '<th' + (c[0] ? ' data-fsort="' + c[0] + '" style="cursor:pointer"' : '') + '>' + (c[1] ? ft(c[1]) : '') + (c[0] && FS.sort === c[0] ? (FS.dir === 'asc' ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') +
    '</tr></thead><tbody data-fbody></tbody></table></div><div class="lm-pg"><div class="mut" data-fpg></div><div class="lm-act"><button class="lm-btn" data-fact="prev">' + ft('prev') + '</button><button class="lm-btn" data-fact="next">' + ft('next') + '</button></div></div></div>';
  p.onclick = function (e) {
    e.stopPropagation();
    var a = e.target.closest('[data-fact]');
    if (a) { var k = a.getAttribute('data-fact');
      if (k === 'apply' || k === 'refresh') { fumRead(); FS.page = 0; fumLoad(); }
      if (k === 'reset') { FS.f = { sp_user: '', alloc_by: '', status: '', priority: '', due: '', dbasis: 'next', dfrom: '', dto: '', q: '' }; FS.page = 0; fumBuild(); fumLoad(); }
      if (k === 'prev' && FS.page > 0) { FS.page--; fumLoad(); }
      if (k === 'next' && (FS.page + 1) * FS.size < FS.total) { FS.page++; fumLoad(); }
      if (k === 'hist') fumHistory(a.getAttribute('data-lead'), a.getAttribute('data-name'));
      return; }
    var c = e.target.closest('[data-fcard]'); if (c) { var d = c.getAttribute('data-fcard'); fumRead(); FS.f.due = d === 'active' ? '' : d; var s = fq('[data-ff="due"]'); if (s) s.value = FS.f.due; FS.page = 0; fumLoad(); fq('[data-fbody]').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var so = e.target.closest('[data-fsort]'); if (so) { var f = so.getAttribute('data-fsort'); FS.dir = FS.sort === f && FS.dir === 'asc' ? 'desc' : 'asc'; FS.sort = f; FS.page = 0; fumBuild(); fumLoad(); }
  };
  p.onchange = function (e) { e.stopPropagation(); };
  p.oninput = function (e) { e.stopPropagation(); };
}
function fumRead() { Array.prototype.slice.call(R.querySelectorAll('[data-pane="fum"] [data-ff]')).forEach(function (i) { FS.f[i.getAttribute('data-ff')] = i.value; }); }
function fpost(args) {
  return fetch('/api/method/bulk_allocate_leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Frappe-CSRF-Token': frappe.csrf_token }, body: JSON.stringify(args) })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error('http'); e.status = r.status; throw e; } return j.message; }); });
}
function fumLoad() {
  var id = ++FS.req;
  ['active', 'overdue', 'today', 'upcoming', 'nofu', 'nolog'].forEach(function (k) { var v = fq('[data-fcard="' + k + '"] .k-v'); if (v) v.innerHTML = '<span class="lm-sk"></span>'; });
  fq('[data-fbody]').innerHTML = '<tr><td colspan="10" class="lm-empty">' + ft('loading') + '</td></tr>';
  fpost({ action: 'fu_monitor', f: JSON.stringify(FS.f), sort: FS.sort, dir: FS.dir, start: FS.page * FS.size, page_len: FS.size }).then(function (m) {
    if (id !== FS.req) return;
    var rebuild = !FS.sps.length && (m.salespersons || []).length;
    FS.sps = m.salespersons || FS.sps; FS.allocators = m.allocators || FS.allocators;
    if (rebuild) { fumBuild(); return fumLoad(); }
    Object.keys(m.cards).forEach(function (k) { var v = fq('[data-fcard="' + k + '"] .k-v'); if (v) v.textContent = fmtN(m.cards[k]); });
    fq('[data-fact-count]').textContent = ft('activities') + ': ' + fmtN(m.cards.activities) + (m.truncated ? ' ⚠' : '');
    FS.total = m.total;
    fq('[data-fcount]').textContent = '· ' + fmtN(m.total) + ' ' + ft('results');
    var a = m.total ? FS.page * FS.size + 1 : 0, b = Math.min(m.total, (FS.page + 1) * FS.size);
    fq('[data-fpg]').textContent = a + '–' + b + ' / ' + fmtN(m.total);
    fq('[data-fact="prev"]').disabled = FS.page === 0; fq('[data-fact="next"]').disabled = (FS.page + 1) * FS.size >= m.total;
    if (!m.rows.length) { fq('[data-fbody]').innerHTML = '<tr><td colspan="10" class="lm-empty">' + ft('empty') + '</td></tr>'; return; }
    var url = function (n) { return '/app/' + frappe.router.slug(DT) + '/' + encodeURIComponent(n); };
    fq('[data-fbody]').innerHTML = m.rows.map(function (r) {
      var dueB = { overdue: '<span class="lm-badge err">' + ft('overdue') + '</span>', today: '<span class="lm-badge warn">' + ft('today') + '</span>', upcoming: '<span class="lm-badge ok">' + ft('upcoming') + '</span>', nofu: '<span class="lm-badge warn">' + ft('nofu') + '</span>' }[r.due] || '';
      return '<tr><td><a href="' + url(r.lead) + '">' + esc(r.lead) + '</a><br>' + esc(r.customer_name || '') + (r.dup ? ' <span class="lm-badge err">' + ft('dup') + '</span>' : '') + '</td>' +
        '<td>' + esc(r.salesperson || '') + '<br><span class="mut">' + esc(r.allocated_by || '') + '</span></td><td>' + esc(fdt(r.assignment_date)) + '</td>' +
        '<td>' + esc(r.status) + '<br><span class="mut">' + esc(r.priority || '') + '</span></td>' +
        '<td>' + (r.last_fu_date ? esc(fdt(r.last_fu_date, 1)) + '<br><span class="mut">' + esc(r.last_fu_method) + ' · ' + esc(r.last_fu_result === 'Attempted - no response' ? ft('resNo') : ft('resOK')) + (r.last_fu_outcome ? ' · ' + esc(r.last_fu_outcome) : '') + '</span>' : '<span class="mut">—</span>') + '</td>' +
        '<td style="white-space:normal;max-width:260px">' + (r.last_notes ? esc(r.last_notes.length > 90 ? r.last_notes.slice(0, 90) + '…' : r.last_notes) : '<span class="mut">—</span>') + '</td>' +
        '<td>' + (r.next_action ? esc(r.next_action) + '<br>' : '') + (r.next_follow_up ? esc(fdt(r.next_follow_up, 1)) : '') + ' ' + dueB + '</td>' +
        '<td>' + (r.overdue_days ? '<span class="lm-errtxt">' + r.overdue_days + ' ' + ft('days') + '</span>' : '—') + '</td>' +
        '<td>' + r.fu_count + (r.lead_fu_count !== r.fu_count ? ' <span class="mut">(' + r.lead_fu_count + ')</span>' : '') + '</td>' +
        '<td><button class="lm-btn" data-fact="hist" data-lead="' + esc(r.lead) + '" data-name="' + esc(r.customer_name || r.lead) + '">' + ft('hist') + '</button></td></tr>';
    }).join('');
  }, function (e) {
    if (id !== FS.req) return;
    var msg = e && (e.status === 403 || e.status === 417) ? ft('denied') : ft('err');
    ['active', 'overdue', 'today', 'upcoming', 'nofu', 'nolog'].forEach(function (k) { var v = fq('[data-fcard="' + k + '"] .k-v'); if (v) v.innerHTML = '<span class="lm-errtxt">' + esc(msg) + '</span>'; });
    fq('[data-fbody]').innerHTML = '<tr><td colspan="10" class="lm-empty lm-errtxt">' + esc(msg) + ' <button class="lm-btn" data-fact="refresh">' + ft('retry') + '</button></td></tr>';
  });
}
function fumHistory(lead, name) {
  var d = new frappe.ui.Dialog({ title: ft('histTitle') + ' — ' + name + ' (' + lead + ')', size: 'large', fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
  d.fields_dict.h.$wrapper.html('<div class="text-muted">' + ft('loading') + '</div>'); d.show();
  fpost({ action: 'fu_history', lead: lead }).then(function (rows) {
    if (!rows.length) { d.fields_dict.h.$wrapper.html('<div class="text-muted">' + esc(ft('noHist')) + '</div>'); return; }
    d.fields_dict.h.$wrapper.html('<div dir="' + (lang === 'ar' ? 'rtl' : 'ltr') + '" style="display:grid;gap:8px">' + rows.map(function (r) {
      var okc = r.contact_result !== 'Attempted - no response';
      return '<div style="border-inline-start:3px solid ' + (okc ? '#15803d' : '#b45309') + ';padding:4px 10px"><div><b>' + esc(fdt(r.followup_datetime, 1)) + '</b> · ' + esc(r.contact_method) + ' · ' + esc(okc ? ft('resOK') : ft('resNo')) + (r.outcome ? ' · ' + esc(r.outcome) : '') + (r.contact_person ? ' · ' + esc(r.contact_person) : '') + '</div>' +
        '<div style="white-space:pre-wrap">' + esc(r.notes) + '</div>' + (r.next_action ? '<div class="text-muted">→ ' + esc(r.next_action) + '</div>' : '') +
        '<div class="text-muted small">' + esc(r.status_before || '') + ' → ' + esc(r.status_after || '') + (r.next_follow_up ? ' · ' + esc(fdt(r.next_follow_up, 1)) : '') + ' · ' + ft('recBy') + ': ' + esc(r.recorded_by) + ' · ' + esc(r.allocation) + '</div></div>';
    }).join('') + '</div>');
  }, function (e) { d.fields_dict.h.$wrapper.html('<div class="text-danger">' + esc(e && (e.status === 403 || e.status === 417) ? ft('denied') : ft('err')) + '</div>'); });
}
// ================= END FOLLOW-UP MONITORING =================


var HOST = R.querySelector('.lm-root') || R;
HOST.innerHTML = '<div class="lm"></div>';
shell();
refresh(true);
})();
