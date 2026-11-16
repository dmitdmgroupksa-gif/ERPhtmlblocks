(function () {
var R = root_element;
var DT = 'Lead Allocation';
var CLOSED = ['Converted', 'Closed', 'Unassigned'];
var STATUSES = ['Assigned', 'Contacted', 'Follow Up', 'Interested', 'Quotation Required', 'No Response', 'Not Interested', 'Converted', 'Closed'];
var OUTCOMES = ['Pending', 'Follow Up Required', 'Meeting Required', 'Quotation Required', 'Customer Interested', 'Customer Not Interested', 'No Response', 'Converted', 'Lost'];
var PRIOS = ['Low', 'Medium', 'High', 'Urgent'];
var METHODS = ['Call', 'WhatsApp', 'Email', 'Visit', 'Meeting', 'Other'];
var FIELDS = ['name', 'lead', 'customer_name', 'contact_person', 'customer_phone_1', 'customer_phone_2', 'customer_email', 'source', 'action_taken', 'original_activities',
  'sales_person', 'assigned_user', 'assigned_by', 'assignment_date', 'priority', 'status', 'outcome', 'last_contacted', 'next_follow_up', 'remarks', 'converted', 'conversion_date', 'modified'];
var LS = 'ml_dash_lang';
var lang = 'en'; try { lang = localStorage.getItem(LS) || 'en'; } catch (e) {}
var T = {
  en: { title: 'My Leads', refreshed: 'Last refreshed', refresh: 'Refresh', tOverview: 'Overview', tLeads: 'My Assigned Leads', tFU: 'Follow-ups', tHist: 'History',
    active: 'Active Assigned Leads', today: 'Follow-ups Due Today', overdue: 'Overdue Follow-ups', nofu: 'No Follow-up Scheduled', converted: 'Converted', closed: 'Closed',
    defs: 'Current work = your allocations whose status is not Converted or Closed. Due Today / Overdue use Next Follow-up in Asia/Riyadh time and count current work only. Converted / Closed are your completed allocations (History). Counts cover all your allocations, not just the visible page.',
    attention: 'Needs Attention', attnSub: 'Overdue first, then due today', byStatus: 'My Allocations by Status', recent: 'Recent Assignments',
    search: 'Search', searchPh: 'Company, lead ID, contact, phone or email', status: 'Status', priority: 'Priority', city: 'City', cityNA: 'City is not stored on allocations and lead records are not readable for your role.',
    from: 'Assigned From', to: 'Assigned To', fu: 'Follow-up', all: 'All', fOver: 'Overdue', fToday: 'Today', fUp: 'Upcoming', fNone: 'Not Scheduled', apply: 'Apply', reset: 'Reset',
    cLead: 'Lead ID', cCompany: 'Customer / Company', cContact: 'Contact Person', cCity: 'City', cPhone: 'Phone', cEmail: 'Email', cAsg: 'Assignment Date', cPrio: 'Priority', cStatus: 'Status',
    cLast: 'Last Contacted', cNext: 'Next Follow-up', cRem: 'Latest Remarks', cAct: 'Actions', view: 'View', results: 'results', prev: 'Previous', next: 'Next', page: 'Page',
    loading: 'Loading…', empty: 'No allocations match.', emptyAll: 'You have no allocations in this view.', permErr: 'You do not have permission to view lead allocations.', srvErr: 'Could not load data (server error).',
    dup: 'Duplicate active allocation', dupNote: 'This lead has more than one active allocation for you. Ask your coordinator to close the duplicate.',
    detail: 'Lead Details', company: 'Company & Contact', phones: 'Phone numbers', emails: 'Email', srcCat: 'Source', allocCtx: 'My Allocation', fuCtx: 'Follow-up',
    assignedBy: 'Assigned By', outcome: 'Outcome', notesLead: 'Lead activities (from lead record at allocation)', notesAlloc: 'Allocation remarks', actionTaken: 'Action taken (lead)',
    openLead: 'Open Lead', openAlloc: 'Open Allocation', call: 'Call', wa: 'WhatsApp', mail: 'Compose Email', update: 'Update Follow-up / Status', noPhone: 'No valid phone', noMail: 'No valid email',
    save: 'Save Update', cancel: 'Cancel', lastContacted: 'Last Contacted', nextFU: 'Next Follow-up', remarks: 'Remarks', needNext: 'Next Follow-up is required for status "Follow Up".',
    saved: 'Update saved', histNote: 'Completed (Converted/Closed) allocations assigned to you. There is no separate follow-up activity log; the saved allocation details are shown as recorded.',
    noLog: 'No follow-up activity log exists; current saved details are shown.', catNA: '', designation: 'Designation', catalogue: 'Catalogue', catY: 'Sent', catN: 'Not sent', na: '—',
    addFU: 'Add Follow-up', fuTitle: 'Record Follow-up', fuWhen: 'Follow-up date & time (Riyadh)', fuMethod: 'Contact method', fuResult: 'Contact result', resOK: 'Conversation held', resNo: 'Attempted - no response',
    fuPerson: 'Contact person (optional)', fuOutcome: 'Outcome', fuNotes: 'Discussion notes / customer requirements', fuNextAct: 'Next action', fuNext: 'Next follow-up (Riyadh)', fuStatus: 'Updated allocation status',
    fuHint: 'Only “Conversation held” updates Last Contacted. An unanswered attempt is recorded as No Response.', fuSaved: 'Follow-up saved', timeline: 'Follow-up history', noTimeline: 'No follow-ups recorded yet. (Entries recorded before tracking began are not available.)',
    recBy: 'Recorded by', method: 'Method', statusChg: 'Status', nextAct: 'Next action', lastFU: 'Last follow-up', dbasis: 'Date refers to', dAct: 'Recorded activity', dNext: 'Scheduled next follow-up', dfrom: 'From', dto: 'To', needNotes: 'Notes are required.' },
  ar: { title: 'عملائي المحتملون', refreshed: 'آخر تحديث', refresh: 'تحديث', tOverview: 'نظرة عامة', tLeads: 'العملاء المسندون', tFU: 'المتابعات', tHist: 'السجل',
    active: 'العملاء المسندون النشطون', today: 'متابعات اليوم', overdue: 'متابعات متأخرة', nofu: 'بدون متابعة مجدولة', converted: 'محول', closed: 'مغلق',
    defs: 'العمل الحالي = توزيعاتك التي حالتها ليست محولة أو مغلقة. متابعات اليوم/المتأخرة تعتمد على تاريخ المتابعة القادمة بتوقيت الرياض وللعمل الحالي فقط. المحول/المغلق هي توزيعاتك المكتملة (السجل). الأعداد لكل توزيعاتك وليس الصفحة المعروضة فقط.',
    attention: 'تحتاج اهتماماً', attnSub: 'المتأخرة أولاً ثم متابعات اليوم', byStatus: 'توزيعاتي حسب الحالة', recent: 'أحدث الإسنادات',
    search: 'بحث', searchPh: 'الشركة، رقم العميل، جهة الاتصال، الهاتف أو البريد', status: 'الحالة', priority: 'الأولوية', city: 'المدينة', cityNA: 'المدينة غير مخزنة في التوزيع وسجلات العملاء غير متاحة لدورك.',
    from: 'أسند من', to: 'أسند إلى', fu: 'المتابعة', all: 'الكل', fOver: 'متأخرة', fToday: 'اليوم', fUp: 'قادمة', fNone: 'غير مجدولة', apply: 'تطبيق', reset: 'إعادة ضبط',
    cLead: 'رقم العميل', cCompany: 'العميل / الشركة', cContact: 'جهة الاتصال', cCity: 'المدينة', cPhone: 'الهاتف', cEmail: 'البريد', cAsg: 'تاريخ الإسناد', cPrio: 'الأولوية', cStatus: 'الحالة',
    cLast: 'آخر تواصل', cNext: 'المتابعة القادمة', cRem: 'آخر الملاحظات', cAct: 'إجراءات', view: 'عرض', results: 'نتيجة', prev: 'السابق', next: 'التالي', page: 'صفحة',
    loading: 'جارٍ التحميل…', empty: 'لا توجد توزيعات مطابقة.', emptyAll: 'لا توجد لديك توزيعات في هذا العرض.', permErr: 'ليست لديك صلاحية عرض التوزيعات.', srvErr: 'تعذر تحميل البيانات (خطأ في الخادم).',
    dup: 'توزيع نشط مكرر', dupNote: 'لهذا العميل أكثر من توزيع نشط باسمك. اطلب من المنسق إغلاق المكرر.',
    detail: 'تفاصيل العميل', company: 'الشركة وجهة الاتصال', phones: 'أرقام الهاتف', emails: 'البريد', srcCat: 'المصدر', allocCtx: 'توزيعي', fuCtx: 'المتابعة',
    assignedBy: 'أسند بواسطة', outcome: 'النتيجة', notesLead: 'أنشطة العميل (من سجل العميل عند الإسناد)', notesAlloc: 'ملاحظات التوزيع', actionTaken: 'الإجراء المتخذ',
    openLead: 'فتح العميل', openAlloc: 'فتح التوزيع', call: 'اتصال', wa: 'واتساب', mail: 'إنشاء بريد', update: 'تحديث المتابعة / الحالة', noPhone: 'لا يوجد هاتف صالح', noMail: 'لا يوجد بريد صالح',
    save: 'حفظ التحديث', cancel: 'إلغاء', lastContacted: 'آخر تواصل', nextFU: 'المتابعة القادمة', remarks: 'ملاحظات', needNext: 'تاريخ المتابعة القادمة مطلوب لحالة "Follow Up".',
    saved: 'تم حفظ التحديث', histNote: 'التوزيعات المكتملة (محولة/مغلقة) المسندة إليك. لا يوجد سجل نشاط منفصل؛ تُعرض التفاصيل المحفوظة كما هي.',
    noLog: 'لا يوجد سجل نشاط للمتابعة؛ تُعرض التفاصيل المحفوظة الحالية.', catNA: '', designation: 'المسمى', catalogue: 'الكتالوج', catY: 'مرسل', catN: 'غير مرسل', na: '—',
    addFU: 'إضافة متابعة', fuTitle: 'تسجيل متابعة', fuWhen: 'تاريخ ووقت المتابعة (الرياض)', fuMethod: 'وسيلة التواصل', fuResult: 'نتيجة التواصل', resOK: 'Conversation held', resNo: 'Attempted - no response',
    fuPerson: 'جهة الاتصال (اختياري)', fuOutcome: 'النتيجة', fuNotes: 'ملاحظات النقاش / متطلبات العميل', fuNextAct: 'الإجراء التالي', fuNext: 'المتابعة القادمة (الرياض)', fuStatus: 'حالة التوزيع المحدثة',
    fuHint: 'فقط "Conversation held" يحدّث آخر تواصل. المحاولة دون رد تسجل كـ No Response.', fuSaved: 'تم حفظ المتابعة', timeline: 'سجل المتابعات', noTimeline: 'لا توجد متابعات مسجلة بعد. (ما قبل بدء التتبع غير متاح).',
    recBy: 'سجّلها', method: 'الوسيلة', statusChg: 'الحالة', nextAct: 'الإجراء التالي', lastFU: 'آخر متابعة', dbasis: 'التاريخ يشير إلى', dAct: 'النشاط المسجل', dNext: 'المتابعة القادمة المجدولة', dfrom: 'من', dto: 'إلى', needNotes: 'الملاحظات مطلوبة.' }
};
function t(k) { return (T[lang] && T[lang][k]) || T.en[k] || k; }
function esc(s) { return frappe.utils.escape_html(s == null ? '' : String(s)); }
function fmtN(n) { return n == null ? '–' : Number(n).toLocaleString('en-US'); }
function fd(v, tm) { if (!v) return ''; try { return frappe.datetime.str_to_user(String(v).slice(0, tm ? 19 : 10)); } catch (e) { return String(v); } }
function uname(u) { if (!u) return ''; try { return frappe.user.full_name(u) || u; } catch (e) { return u; } }
var CAN_LGL = frappe.model.can_read('Leads Generation List');
// ---- Asia/Riyadh day boundaries (system time zone verified as Asia/Riyadh) ----
function riyadhToday() {
  var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return p; // YYYY-MM-DD
}
function dayStart() { return riyadhToday() + ' 00:00:00'; }
function dayEnd() { return riyadhToday() + ' 23:59:59'; }
var ACTIVE = [DT, 'status', 'not in', CLOSED];
var G = {
  active: [ACTIVE], today: [ACTIVE, [DT, 'next_follow_up', 'between', [null, null]]], overdue: [], nofu: [ACTIVE, [DT, 'next_follow_up', 'is', 'not set']],
  converted: [[DT, 'status', '=', 'Converted']], closed: [[DT, 'status', '=', 'Closed']]
};
function groupFilters(k) {
  if (k === 'today') return [ACTIVE, [DT, 'next_follow_up', '>=', dayStart()], [DT, 'next_follow_up', '<=', dayEnd()]];
  if (k === 'overdue') return [ACTIVE, [DT, 'next_follow_up', '<', dayStart()]];
  if (k === 'upcoming') return [ACTIVE, [DT, 'next_follow_up', '>', dayEnd()]];
  return G[k] || [];
}
// ---- data access: frappe.client.get_list on Lead Allocation. The server applies the
// "Lead Allocation Permission Query" (assigned_user = session user) — no user id is sent from the browser.
function gl(args) { return frappe.xcall('frappe.client.get_list', Object.assign({ doctype: DT, limit_page_length: 0 }, args)); }
function cnt(filters, orf) { var a = { fields: ['count(name) as c'], filters: filters }; if (orf) a.or_filters = orf; return gl(a).then(function (r) { return (r[0] && r[0].c) || 0; }); }
function api(args) {
  return fetch('/api/method/bulk_allocate_leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Frappe-CSRF-Token': frappe.csrf_token }, body: JSON.stringify(args) })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error((j._server_messages && JSON.parse(JSON.parse(j._server_messages)[0]).message) || 'error'); e.status = r.status; throw e; } return j.message; }); });
}
function errKind(e) { var s = e && (e.httpStatus || e.status || (e.xhr && e.xhr.status)); return (s === 403 || s === 417) ? t('permErr') : t('srvErr'); }

var S = { tab: 'overview', dups: {}, list: { f: { q: '', status: '', priority: '', city: '', from: '', to: '', fu: '' }, page: 0, size: 20, sort: 'assignment_date', dir: 'desc', rows: [], total: 0, req: 0, mode: 'active' },
  fu: { f: { q: '', fu: '', status: '', outcome: '', method: '', dbasis: 'next', dfrom: '', dto: '' }, page: 0, size: 20, sort: 'next_follow_up', dir: 'asc', rows: [], total: 0, req: 0 }, hist: { f: { q: '' }, page: 0, size: 20, sort: 'assignment_date', dir: 'desc', rows: [], total: 0, req: 0 }, ovReq: 0, open: null };
function q(s) { return R.querySelector(s); }
function qa(s) { return Array.prototype.slice.call(R.querySelectorAll(s)); }

function shell() {
  var el = q('.ml');
  el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  el.innerHTML =
    '<div class="ml-hd"><div><h2>' + t('title') + '</h2><div class="ml-sub">' + esc(frappe.session.user_fullname || frappe.session.user) + ' · <span data-ts></span></div></div>' +
    '<div class="ml-act"><div class="ml-lang"><button data-lang="en" class="' + (lang === 'en' ? 'on' : '') + '">English</button><button data-lang="ar" class="' + (lang === 'ar' ? 'on' : '') + '">العربية</button></div>' +
    '<button class="ml-btn" data-act="refresh">↻ ' + t('refresh') + '</button></div></div>' +
    '<div class="ml-tabs">' + ['overview:tOverview', 'leads:tLeads', 'fu:tFU', 'hist:tHist'].map(function (x) { var p = x.split(':'); return '<button data-tab="' + p[0] + '" class="' + (S.tab === p[0] ? 'on' : '') + '">' + t(p[1]) + '</button>'; }).join('') + '</div>' +
    '<div data-pane="overview"></div><div data-pane="leads"></div><div data-pane="fu"></div><div data-pane="hist"></div>' +
    '<dialog class="ml-drawer" data-drawer aria-label="Lead details"></dialog>';
  bind();
  showTab();
}
function showTab() {
  ['overview', 'leads', 'fu', 'hist'].forEach(function (p) { q('[data-pane="' + p + '"]').style.display = S.tab === p ? '' : 'none'; });
  qa('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === S.tab); });
  if (S.tab === 'overview') renderOverview();
  if (S.tab === 'leads') renderListPane('leads');
  if (S.tab === 'fu') renderListPane('fu');
  if (S.tab === 'hist') renderListPane('hist');
}
function setTs() { var e = q('[data-ts]'); if (e) e.textContent = t('refreshed') + ': ' + frappe.datetime.str_to_user(frappe.datetime.now_datetime()); }

// ---------------- OVERVIEW ----------------
var CARDS = [['active', 'ok'], ['today', 'warn'], ['overdue', 'bad'], ['nofu', 'warn'], ['converted', 'ok'], ['closed', '']];
function renderOverview() {
  var p = q('[data-pane="overview"]');
  p.innerHTML = '<div class="ml-kpis">' + CARDS.map(function (c) { return '<div class="ml-card ml-kpi ' + c[1] + '" data-card="' + c[0] + '" role="button" tabindex="0"><div class="k-l">' + t(c[0]) + '</div><div class="k-v"><span class="ml-sk"></span></div></div>'; }).join('') + '</div>' +
    '<div class="ml-note">' + t('defs') + '</div><div class="ml-dupwarn" data-dupwarn></div>' +
    '<div class="ml-grid"><div class="ml-card ml-panel"><h4>' + t('attention') + ' <small>' + t('attnSub') + '</small></h4><div data-attn></div></div>' +
    '<div class="ml-card ml-panel"><h4>' + t('byStatus') + '</h4><div data-chart></div></div></div>' +
    '<div class="ml-card ml-panel"><h4>' + t('recent') + '</h4><div data-recent></div></div>';
  var id = ++S.ovReq; var live = function () { return id === S.ovReq; };
  api({ action: 'my_summary' }).then(function (m) {
    if (!live()) return;
    S.cities = m.cities || []; S.dups = m.dups || {};
    CARDS.forEach(function (c) { q('[data-card="' + c[0] + '"] .k-v').textContent = fmtN(m.cards[c[0]]); });
    var n = Object.keys(S.dups).length; q('[data-dupwarn]').innerHTML = n ? '<span class="ml-badge bad">⚠ ' + t('dup') + ': ' + n + '</span> ' + esc(t('dupNote')) : '';
    var rows = m.attention || [];
    q('[data-attn]').innerHTML = rows.length ? '<div class="ml-list">' + rows.map(function (x) {
      return '<div class="ml-li" data-open="' + esc(x.name) + '"><span class="ml-badge ' + (x.fu_group === 'overdue' ? 'bad' : 'warn') + '">' + t(x.fu_group === 'overdue' ? 'fOver' : 'fToday') + '</span> <b>' + esc(x.customer_name || x.lead) + '</b><span class="ml-mut"> · ' + esc(fd(x.next_follow_up, 1)) + ' · ' + esc(x.status) + '</span></div>';
    }).join('') + '</div>' : '<div class="ml-empty">' + t('emptyAll') + '</div>';
    var bs = m.by_status || [];
    if (!bs.length) q('[data-chart]').innerHTML = '<div class="ml-empty">' + t('emptyAll') + '</div>';
    else { var max = Math.max.apply(null, bs.map(function (x) { return x.c; })); q('[data-chart]').innerHTML = bs.map(function (x) { return '<div class="ml-bar" data-status="' + esc(x.k) + '"><span>' + esc(x.k || t('na')) + '</span><span class="bt"><i style="width:' + Math.max(2, x.c * 100 / max) + '%"></i></span><b>' + fmtN(x.c) + '</b></div>'; }).join(''); }
    var r = m.recent || [];
    q('[data-recent]').innerHTML = r.length ? '<div class="ml-list">' + r.map(function (x) { return '<div class="ml-li" data-open="' + esc(x.name) + '"><b>' + esc(x.customer_name || x.lead) + '</b><span class="ml-mut"> · ' + esc(fd(x.assignment_date)) + ' · ' + esc(x.priority || '') + ' · ' + esc(x.status) + '</span></div>'; }).join('') + '</div>' : '<div class="ml-empty">' + t('emptyAll') + '</div>';
  }, function (e) {
    if (!live()) return; var msg = errKind(e);
    CARDS.forEach(function (c) { q('[data-card="' + c[0] + '"] .k-v').innerHTML = '<span class="ml-err">' + esc(msg) + '</span>'; });
    ['[data-attn]', '[data-chart]', '[data-recent]'].forEach(function (s) { q(s).innerHTML = '<div class="ml-empty ml-err">' + esc(msg) + '</div>'; });
  });
  setTs();
}

// ---------------- LIST PANES (My Assigned Leads / Follow-ups / History) ----------------
function paneState(k) { return k === 'leads' ? S.list : (k === 'fu' ? S.fu : S.hist); }
function opt(v, l, s) { return '<option value="' + esc(v) + '"' + (s === v ? ' selected' : '') + '>' + esc(l) + '</option>'; }
function renderListPane(k) {
  var st = paneState(k), p = q('[data-pane="' + k + '"]'), F = st.f;
  var filt = '<div class="ml-card ml-filters">' + fi('search', '<input type="search" data-f="q" placeholder="' + t('searchPh') + '" value="' + esc(F.q) + '">', 'wide');
  if (k === 'leads') {
    filt += fi('status', '<select data-f="status">' + opt('', t('all'), F.status) + STATUSES.filter(function (s) { return CLOSED.indexOf(s) < 0; }).map(function (s) { return opt(s, s, F.status); }).join('') + '</select>') +
      fi('priority', '<select data-f="priority">' + opt('', t('all'), F.priority) + PRIOS.map(function (s) { return opt(s, s, F.priority); }).join('') + '</select>') +
      fi('city', '<select data-f="city">' + opt('', t('all'), F.city) + (S.cities || []).map(function (c) { return opt(c, c, F.city); }).join('') + '</select>') +
      fi('from', '<input type="date" data-f="from" value="' + esc(F.from) + '">') + fi('to', '<input type="date" data-f="to" value="' + esc(F.to) + '">') +
      fi('fu', '<select data-f="fu">' + opt('', t('all'), F.fu) + opt('overdue', t('fOver'), F.fu) + opt('today', t('fToday'), F.fu) + opt('upcoming', t('fUp'), F.fu) + opt('nofu', t('fNone'), F.fu) + '</select>');
  } else if (k === 'fu') {
    filt += fi('fu', '<select data-f="fu">' + opt('', t('all'), F.fu) + opt('overdue', t('fOver'), F.fu) + opt('today', t('fToday'), F.fu) + opt('upcoming', t('fUp'), F.fu) + opt('nofu', t('fNone'), F.fu) + '</select>') +
      fi('status', '<select data-f="status">' + opt('', t('all'), F.status) + STATUSES.filter(function (s) { return CLOSED.indexOf(s) < 0; }).map(function (s) { return opt(s, s, F.status); }).join('') + '</select>') +
      fi('outcome', '<select data-f="outcome">' + opt('', t('all'), F.outcome) + OUTCOMES.map(function (s) { return opt(s, s, F.outcome); }).join('') + '</select>') +
      fi('method', '<select data-f="method">' + opt('', t('all'), F.method) + METHODS.map(function (s) { return opt(s, s, F.method); }).join('') + '</select>') +
      fi('dbasis', '<select data-f="dbasis">' + opt('next', t('dNext'), F.dbasis) + opt('activity', t('dAct'), F.dbasis) + '</select>') +
      fi('dfrom', '<input type="date" data-f="dfrom" value="' + esc(F.dfrom || '') + '">') + fi('dto', '<input type="date" data-f="dto" value="' + esc(F.dto || '') + '">');
  }
  filt += '<div class="ml-fbtn"><button class="ml-btn pri" data-act="apply">' + t('apply') + '</button><button class="ml-btn" data-act="reset">' + t('reset') + '</button></div>' +
    (k === 'hist' ? '<div class="ml-note" style="grid-column:1/-1">' + esc(t('histNote')) + '</div>' : '') + '</div>';
  p.innerHTML = filt + '<div class="ml-card"><div class="ml-tbar"><b>' + t(k === 'leads' ? 'tLeads' : (k === 'fu' ? 'tFU' : 'tHist')) + '</b> <span class="ml-mut" data-rc></span></div>' +
    '<div class="ml-tw"><table><thead><tr>' + cols(k).map(function (c) { return '<th' + (c[2] ? ' data-sort="' + c[2] + '" class="s"' : '') + '>' + t(c[1]) + (c[2] && st.sort === c[2] ? (st.dir === 'asc' ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') + '</tr></thead><tbody data-tb></tbody></table></div>' +
    '<div class="ml-pg"><span class="ml-mut" data-pg></span><span><button class="ml-btn" data-act="prev">' + t('prev') + '</button> <button class="ml-btn" data-act="next">' + t('next') + '</button></span></div></div>';
  loadList(k);
}
function fi(k, inner, cls) { return '<div class="ml-f ' + (cls || '') + '"><label>' + t(k) + '</label>' + inner + '</div>'; }
function cols(k) {
  var c = [['lead', 'cLead', 'lead'], ['customer_name', 'cCompany', 'customer_name'], ['contact_person', 'cContact', ''], ['city', 'cCity', ''], ['phone', 'cPhone', ''], ['email', 'cEmail', ''],
    ['assignment_date', 'cAsg', 'assignment_date'], ['priority', 'cPrio', 'priority'], ['status', 'cStatus', 'status'], ['last_contacted', 'cLast', 'last_contacted'], ['next_follow_up', 'cNext', 'next_follow_up'], ['remarks', 'cRem', ''], ['act', 'cAct', '']];
  if (k === 'leads') return c;
  if (k === 'fu') { c = c.filter(function (x) { return ['city', 'email', 'remarks'].indexOf(x[0]) < 0; }); c.splice(c.length - 1, 0, ['last_fu', 'lastFU', '']); return c; }
  return c.filter(function (x) { return x[0] !== 'city'; });
}
function listFilters(k) {
  var st = paneState(k), F = st.f, f = [];
  if (k === 'hist') f.push([DT, 'status', 'in', CLOSED]);
  else f.push(ACTIVE);
  if (k === 'fu') f.push([DT, 'next_follow_up', 'is', 'set']);
  if (F.status) f.push([DT, 'status', '=', F.status]);
  if (F.priority) f.push([DT, 'priority', '=', F.priority]);
  if (F.from) f.push([DT, 'assignment_date', '>=', F.from]);
  if (F.to) f.push([DT, 'assignment_date', '<=', F.to]);
  if (F.fu) f = f.concat(groupFilters(F.fu).filter(function (x) { return x !== ACTIVE; }));
  var orf = null, s = (F.q || '').trim();
  if (s) { var l = '%' + s + '%'; orf = ['lead', 'customer_name', 'contact_person', 'customer_phone_1', 'customer_phone_2', 'customer_email'].map(function (x) { return [DT, x, 'like', l]; }); }
  return { f: f, orf: orf };
}
function loadList(k) {
  var st = paneState(k), id = ++st.req, tb = q('[data-pane="' + k + '"] [data-tb]');
  var n = cols(k).length;
  tb.innerHTML = '<tr><td colspan="' + n + '" class="ml-empty">' + t('loading') + '</td></tr>';
  var args = { action: 'my_list', pane: k, f: JSON.stringify(st.f), sort: st.sort, dir: st.dir, start: st.page * st.size, page_len: st.size };
  if (k === 'leads' && !S.cities) api({ action: 'my_summary' }).then(function (m) { S.cities = m.cities || []; S.dups = m.dups || {}; if (S.tab === 'leads') { var cs = q('[data-pane="leads"] [data-f="city"]'); if (cs && cs.options.length <= 1) cs.innerHTML = opt('', t('all'), st.f.city) + S.cities.map(function (c) { return opt(c, c, st.f.city); }).join(''); } }, function () {});
  api(args).then(function (m) {
    if (id !== st.req) return;
    st.total = m.total; st.rows = m.rows;
    q('[data-pane="' + k + '"] [data-rc]').textContent = '· ' + fmtN(st.total) + ' ' + t('results');
    var a = st.total ? st.page * st.size + 1 : 0, b = Math.min(st.total, (st.page + 1) * st.size);
    q('[data-pane="' + k + '"] [data-pg]').textContent = a + '–' + b + ' / ' + fmtN(st.total) + ' · ' + t('page') + ' ' + (st.page + 1) + '/' + Math.max(1, Math.ceil(st.total / st.size));
    q('[data-pane="' + k + '"] [data-act="prev"]').disabled = st.page === 0;
    q('[data-pane="' + k + '"] [data-act="next"]').disabled = (st.page + 1) * st.size >= st.total;
    if (!st.rows.length) { tb.innerHTML = '<tr><td colspan="' + n + '" class="ml-empty">' + t('empty') + '</td></tr>'; return; }
    tb.innerHTML = st.rows.map(function (x) { return rowHtml(k, x); }).join('');
  }, function (e) { if (id !== st.req) return; tb.innerHTML = '<tr><td colspan="' + n + '" class="ml-empty ml-err">' + esc(errKind(e)) + '</td></tr>'; });
}
function validPhone(p) { var d = String(p || '').replace(/[^\d+]/g, ''); return d.replace(/\D/g, '').length >= 7 ? d : ''; }
function validMail(m) { m = String(m || '').trim().replace(/^"+|"+$/g, ''); var mm = m.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/); return mm ? mm[0] : ''; }
function fuBadge(x) {
  if (CLOSED.indexOf(x.status) > -1 || !x.next_follow_up) return '';
  if (x.fu_group === 'overdue') return ' <span class="ml-badge bad">' + t('fOver') + '</span>';
  if (x.fu_group === 'today') return ' <span class="ml-badge warn">' + t('fToday') + '</span>';
  return '';
}
function rowHtml(k, x) {
  var ph = validPhone(x.customer_phone_1) || validPhone(x.customer_phone_2), em = validMail(x.customer_email);
  var dup = x.dup ? ' <span class="ml-badge bad" title="' + esc(t('dupNote')) + '">' + t('dup') + '</span>' : '';
  var cells = { lead: '<a data-open="' + esc(x.name) + '">' + esc(x.lead || '') + '</a>' + dup, customer_name: '<a data-open="' + esc(x.name) + '">' + esc(x.customer_name || t('na')) + '</a>',
    contact_person: esc(x.contact_person || t('na')), city: x.city && /[^\s\-.]/.test(x.city) ? esc(x.city) : '<span class="ml-mut">' + t('na') + '</span>', phone: ph ? esc(x.customer_phone_1 || x.customer_phone_2) : '<span class="ml-mut">' + t('na') + '</span>',
    email: em ? esc(em) : '<span class="ml-mut">' + t('na') + '</span>', assignment_date: esc(fd(x.assignment_date)), priority: esc(x.priority || ''),
    status: '<span class="ml-badge ' + (x.status === 'Converted' ? 'ok' : (x.status === 'Closed' ? '' : 'info')) + '">' + esc(x.status) + '</span>', last_contacted: esc(fd(x.last_contacted, 1)) || '<span class="ml-mut">' + t('na') + '</span>',
    next_follow_up: (esc(fd(x.next_follow_up, 1)) || '<span class="ml-mut">' + t('na') + '</span>') + fuBadge(x), remarks: x.remarks ? '<span class="ml-clip" title="' + esc(x.remarks) + '">' + esc(x.remarks.length > 50 ? x.remarks.slice(0, 50) + '…' : x.remarks) + '</span>' : '<span class="ml-mut">' + t('na') + '</span>',
    last_fu: x.last_fu ? esc(fd(x.last_fu.date, 1)) + '<br><span class="ml-mut">' + esc(x.last_fu.method || '') + ' · ' + esc(x.last_fu.result === 'Attempted - no response' ? t('resNo') : t('resOK')) + (x.fu_count > 1 ? ' · ' + x.fu_count : '') + '</span>' : '<span class="ml-mut">' + t('na') + '</span>',
    act: '<button class="ml-btn sm" data-open="' + esc(x.name) + '">' + t('view') + '</button>' + (CLOSED.indexOf(x.status) < 0 ? ' <button class="ml-btn sm pri" data-addfu="' + esc(x.name) + '">+ ' + t('addFU') + '</button>' : '') };
  return '<tr>' + cols(k).map(function (c) { return '<td>' + cells[c[0]] + '</td>'; }).join('') + '</tr>';
}

// ---------------- DETAIL PANEL ----------------
function openDetail(name) {
  var d = q('[data-drawer]');
  drawerOpen(d);
  d.innerHTML = '<div class="ml-dw"><div class="ml-dh"><b>' + t('detail') + '</b><button class="ml-btn sm" data-act="close">✕</button></div><div class="ml-empty">' + t('loading') + '</div></div>';
  // get_list (not get) so the Permission Query scope applies: other users' allocations return nothing
  api({ action: 'my_get', name: name }).then(function (x) {
    if (!x) { d.querySelector('.ml-empty').innerHTML = '<span class="ml-err">' + t('permErr') + '</span>'; return; }
    S.open = x;
    var ph = [x.customer_phone_1, x.customer_phone_2].map(function (p) { return { raw: p, v: validPhone(p) }; });
    var ems = [x.customer_email, x.customer_email_2].map(validMail).filter(function (m, i, a) { return m && a.indexOf(m) === i; });
    var closed = CLOSED.indexOf(x.status) > -1;
    var leadLink = CAN_LGL ? '<a class="ml-btn" href="/app/leads-generation-list/' + encodeURIComponent(x.lead) + '" target="_blank">' + t('openLead') + '</a>' : '';
    function kv(l, v) { return '<div class="ml-kv"><span>' + l + '</span><div>' + (v || '<span class="ml-mut">' + t('na') + '</span>') + '</div></div>'; }
    d.innerHTML = '<div class="ml-dw"><div class="ml-dh"><div><b>' + esc(x.customer_name || x.lead) + '</b><div class="ml-mut">' + esc(x.lead) + ' · ' + esc(x.name) + '</div></div><button class="ml-btn sm" data-act="close">✕</button></div>' +
      (S.dups[x.lead] && !closed ? '<div class="ml-dupwarn"><span class="ml-badge bad">⚠ ' + t('dup') + '</span> ' + esc(t('dupNote')) + '</div>' : '') +
      '<div class="ml-acts">' + leadLink + '<a class="ml-btn" href="/app/lead-allocation/' + encodeURIComponent(x.name) + '" target="_blank">' + t('openAlloc') + '</a>' +
        ph.filter(function (p) { return p.v; }).map(function (p) { var wa = p.v.replace(/\D/g, ''); if (/^0\d{9}$/.test(wa)) wa = '966' + wa.slice(1); return '<a class="ml-btn" href="tel:' + esc(p.v) + '">📞 ' + t('call') + ' ' + esc(p.raw) + '</a><a class="ml-btn" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">' + t('wa') + '</a>'; }).join('') +
        ems.map(function (m) { return '<a class="ml-btn" href="mailto:' + esc(m) + '">✉ ' + t('mail') + ': ' + esc(m) + '</a>'; }).join('') +
        (!closed ? '<button class="ml-btn pri" data-addfu="' + esc(x.name) + '">+ ' + t('addFU') + '</button><button class="ml-btn" data-act="update">' + t('update') + '</button>' : '') + '</div>' +
      '<div class="ml-sec"><h5>' + t('company') + '</h5>' + kv(t('cCompany'), esc(x.customer_name)) + kv(t('cContact'), esc(x.contact_person)) + kv(t('designation'), esc(x.designation)) + kv(t('cCity'), esc(x.city)) + '</div>' +
      '<div class="ml-sec"><h5>' + t('phones') + ' / ' + t('emails') + '</h5>' + kv('1', esc(x.customer_phone_1)) + kv('2', esc(x.customer_phone_2)) + kv(t('emails'), esc(x.customer_email)) + kv(t('emails') + ' 2', esc(x.customer_email_2)) + '</div>' +
      '<div class="ml-sec"><h5>' + t('srcCat') + '</h5>' + kv(t('srcCat'), esc(x.source)) + kv(t('actionTaken'), esc(x.action_taken)) + kv(t('catalogue'), x.catalogue_status == null ? '' : esc(x.catalogue_status ? t('catY') : t('catN'))) + '</div>' +
      '<div class="ml-sec"><h5>' + t('allocCtx') + '</h5>' + kv(t('assignedBy'), esc(x.assigned_by_name || x.assigned_by)) + kv(t('cAsg'), esc(fd(x.assignment_date))) + kv(t('cPrio'), esc(x.priority)) + '</div>' +
      '<div class="ml-sec"><h5>' + t('fuCtx') + '</h5>' + kv(t('cStatus'), esc(x.status)) + kv(t('outcome'), esc(x.outcome)) + kv(t('lastContacted'), esc(fd(x.last_contacted, 1))) + kv(t('nextFU'), esc(fd(x.next_follow_up, 1)) + fuBadge(x)) + '<div class="ml-mut" style="font-size:11.5px">' + esc(t('timeline')) + '</div></div>' +
      '<div class="ml-sec"><h5>' + t('notesLead') + '</h5><div class="ml-pre">' + (esc(x.original_activities) || '<span class="ml-mut">' + t('na') + '</span>') + '</div></div>' +
      '<div class="ml-sec"><h5>' + t('timeline') + '</h5><div data-timeline><div class="ml-empty">' + t('loading') + '</div></div></div>' +
      '<div class="ml-sec"><h5>' + t('notesAlloc') + '</h5><div class="ml-pre">' + (esc(x.remarks) || '<span class="ml-mut">' + t('na') + '</span>') + '</div></div></div>';
    var hd = d.querySelector('.ml-dh'), ac = d.querySelector('.ml-acts'); if (hd && ac) hd.appendChild(ac);
    loadTimeline(x.name);
  }, function (e) { var m = d.querySelector('.ml-empty'); if (m) m.innerHTML = '<span class="ml-err">' + esc(errKind(e)) + '</span>'; });
}
function openUpdate() {
  var x = S.open; if (!x) return;
  var dlg = new frappe.ui.Dialog({
    title: t('update') + ' — ' + (x.customer_name || x.lead),
    fields: [
      { fieldname: 'status', fieldtype: 'Select', label: t('cStatus'), options: STATUSES, default: x.status, reqd: 1 },
      { fieldname: 'outcome', fieldtype: 'Select', label: t('outcome'), options: [''].concat(OUTCOMES), default: x.outcome || '' },
      { fieldname: 'last_contacted', fieldtype: 'Datetime', label: t('lastContacted'), default: x.last_contacted || '' },
      { fieldname: 'next_follow_up', fieldtype: 'Datetime', label: t('nextFU'), default: x.next_follow_up || '' },
      { fieldname: 'remarks', fieldtype: 'Small Text', label: t('remarks'), default: x.remarks || '' }
    ],
    primary_action_label: t('save'),
    primary_action: function (v) {
      if (v.status === 'Follow Up' && !v.next_follow_up) { frappe.msgprint(t('needNext')); return; }
      var upd = {};
      ['status', 'outcome', 'last_contacted', 'next_follow_up', 'remarks'].forEach(function (f) { if ((v[f] || '') !== (x[f] || '')) upd[f] = v[f] || null; });
      if (!Object.keys(upd).length) { dlg.hide(); return; }
      // standard permission-checked save; server "Lead Allocation Automation" (Before Save) enforces ownership and protected fields
      frappe.dom.freeze();
      api({ action: 'my_update', name: x.name, values: JSON.stringify(upd) }).then(function () {
        frappe.dom.unfreeze(); dlg.hide(); frappe.show_alert({ message: t('saved'), indicator: 'green' });
        S.cities = null; openDetail(x.name); refreshAll(false);
      }, function (e) { frappe.dom.unfreeze(); frappe.msgprint(esc(e.message || t('srvErr'))); });
    }
  });
  suspendDrawer(dlg);
  dlg.show();
}

// ---------------- DRAWER (native <dialog> in the top layer) ----------------
// 2026-11-09: the panel used position:fixed inside the workspace editor (.codex-editor has z-index:1),
// so it was trapped in that stacking context under the sticky navbar (z-index 1020).
// showModal() renders in the browser top layer, independent of ancestor stacking contexts.
var scrollLock = null;
function lockScroll() { if (scrollLock) return; var w = document.querySelector('.layout-main-section-wrapper'); scrollLock = { html: document.documentElement.style.overflow, body: document.body.style.overflow, w: w, wo: w ? w.style.overflow : '' }; document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; if (w) w.style.overflow = 'hidden'; }
function unlockScroll() { if (!scrollLock) return; document.documentElement.style.overflow = scrollLock.html; document.body.style.overflow = scrollLock.body; if (scrollLock.w) scrollLock.w.style.overflow = scrollLock.wo; scrollLock = null; }
function drawerOpen(d) {
  d.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  if (!d.__bound) {
    d.__bound = true;
    d.addEventListener('cancel', function (e) { e.preventDefault(); drawerClose(); });
    d.addEventListener('close', function () { if (!d.__susp) { S.open = null; unlockScroll(); } });
    d.addEventListener('mousedown', function (e) { if (e.target === d) drawerClose(); });
  }
  if (!d.open) { try { d.showModal(); } catch (er) { d.setAttribute('open', ''); } }
  lockScroll();
  var sc = d.querySelector('.ml-dw'); if (sc) sc.scrollTop = 0;
}
function drawerClose() { var d = q('[data-drawer]'); if (d && d.open) { d.__susp = false; d.close(); } S.open = null; unlockScroll(); }
function suspendDrawer(dlg) {
  // a frappe dialog opened from the panel must be on top: step the panel out of the top layer while it is open
  var d = q('[data-drawer]'); if (!d || !d.open) return;
  d.__susp = true; d.close();
  var prev = dlg.onhide;
  dlg.onhide = function () { if (prev) prev.apply(this, arguments); if (S.open && !d.open) { try { d.showModal(); } catch (er) { d.setAttribute('open', ''); } } d.__susp = false; if (!S.open) unlockScroll(); };
}

// ---------------- FOLLOW-UP LOG ----------------
function loadTimeline(name) {
  var box = q('[data-drawer] [data-timeline]'); if (!box) return;
  api({ action: 'my_followups', name: name }).then(function (rows) {
    box = q('[data-drawer] [data-timeline]'); if (!box || !S.open || S.open.name !== name) return;
    if (!rows.length) { box.innerHTML = '<div class="ml-mut" style="font-size:12px">' + esc(t('noTimeline')) + '</div>'; return; }
    box.innerHTML = '<div class="ml-tl">' + rows.map(function (r) {
      var okc = r.contact_result !== 'Attempted - no response';
      return '<div class="ml-tli"><div class="ml-tld">' + esc(fd(r.followup_datetime, 1)) + '</div><div class="ml-tlb">' +
        '<div><span class="ml-badge ' + (okc ? 'ok' : 'warn') + '">' + esc(okc ? t('resOK') : t('resNo')) + '</span> <b>' + esc(r.contact_method) + '</b>' + (r.outcome ? ' · ' + esc(r.outcome) : '') + (r.contact_person ? ' · ' + esc(r.contact_person) : '') + '</div>' +
        '<div class="ml-pre">' + esc(r.notes) + '</div>' +
        (r.next_action ? '<div><span class="ml-mut">' + t('nextAct') + ':</span> ' + esc(r.next_action) + '</div>' : '') +
        '<div class="ml-mut" style="font-size:11.5px">' + t('statusChg') + ': ' + esc(r.status_before || '') + ' → ' + esc(r.status_after || '') + (r.next_follow_up ? ' · ' + t('nextFU') + ': ' + esc(fd(r.next_follow_up, 1)) : '') + ' · ' + t('recBy') + ': ' + esc(r.recorded_by) + '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  }, function (e) { box.innerHTML = '<div class="ml-err">' + esc(errKind(e)) + '</div>'; });
}
function riyadhNow() {
  var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date());
  var g = function (k) { return (p.filter(function (x) { return x.type === k; })[0] || {}).value; };
  return g('year') + '-' + g('month') + '-' + g('day') + ' ' + (g('hour') === '24' ? '00' : g('hour')) + ':' + g('minute') + ':' + g('second');
}
function openAddFU(name) {
  var start = (S.open && S.open.name === name) ? Promise.resolve(S.open) : api({ action: 'my_get', name: name });
  start.then(function (x) {
    if (CLOSED.indexOf(x.status) > -1) { frappe.msgprint(esc(x.status)); return; }
    var token = 'fu-' + name + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    var busy = false;
    var dlg = new frappe.ui.Dialog({
      title: t('fuTitle') + ' — ' + (x.customer_name || x.lead),
      size: 'large',
      fields: [
        { fieldtype: 'HTML', fieldname: 'hint', options: '<div class="text-muted small" style="margin-bottom:6px">' + esc(x.lead) + ' · ' + esc(x.name) + '<br>' + esc(t('fuHint')) + '</div>' },
        { fieldname: 'followup_datetime', fieldtype: 'Datetime', label: t('fuWhen'), default: riyadhNow(), reqd: 1 },
        { fieldname: 'contact_method', fieldtype: 'Select', label: t('fuMethod'), options: METHODS, default: 'Call', reqd: 1 },
        { fieldname: 'contact_result', fieldtype: 'Select', label: t('fuResult'), options: ['Conversation held', 'Attempted - no response'], default: 'Conversation held', reqd: 1, onchange: function () { if (dlg && dlg.get_value('contact_result') === 'Attempted - no response') dlg.set_value('outcome', 'No Response'); } },
        { fieldname: 'contact_person', fieldtype: 'Data', label: t('fuPerson'), default: x.contact_person && /[^\s\-.]/.test(x.contact_person) ? x.contact_person : '' },
        { fieldtype: 'Column Break' },
        { fieldname: 'outcome', fieldtype: 'Select', label: t('fuOutcome'), options: [''].concat(OUTCOMES), default: '' },
        { fieldname: 'status', fieldtype: 'Select', label: t('fuStatus'), options: STATUSES, default: x.status, reqd: 1 },
        { fieldname: 'next_follow_up', fieldtype: 'Datetime', label: t('fuNext') },
        { fieldname: 'next_action', fieldtype: 'Data', label: t('fuNextAct') },
        { fieldtype: 'Section Break' },
        { fieldname: 'notes', fieldtype: 'Small Text', label: t('fuNotes'), reqd: 1 }
      ],
      primary_action_label: t('save'),
      primary_action: function (v) {
        if (busy) return;
        if (!(v.notes || '').trim()) { frappe.msgprint(t('needNotes')); return; }
        if (v.contact_result === 'Attempted - no response' && v.outcome && v.outcome !== 'No Response') { frappe.msgprint('Attempted - no response → Outcome must be "No Response".'); return; }
        busy = true; dlg.get_primary_btn().prop('disabled', true);
        var vals = { allocation: x.name, lead: x.lead, client_token: token, followup_datetime: v.followup_datetime, contact_method: v.contact_method, contact_result: v.contact_result,
          contact_person: v.contact_person || '', outcome: v.outcome || '', status: v.status, next_follow_up: v.next_follow_up || '', next_action: v.next_action || '', notes: v.notes };
        api({ action: 'my_add_followup', values: JSON.stringify(vals) }).then(function () {
          dlg.hide(); frappe.show_alert({ message: t('fuSaved'), indicator: 'green' });
          S.cities = null;
          if (S.open && S.open.name === x.name) openDetail(x.name);
          refreshAll(false);
        }, function (e) { busy = false; dlg.get_primary_btn().prop('disabled', false); frappe.msgprint({ title: t('fuTitle'), indicator: 'red', message: esc(e.message || t('srvErr')) }); });
      }
    });
    dlg.fields_dict.contact_result.$input.on('change', function () { if (dlg.get_value('contact_result') === 'Attempted - no response') dlg.set_value('outcome', 'No Response'); });
    suspendDrawer(dlg);
    dlg.show();
  }, function (e) { frappe.msgprint(esc(errKind(e))); });
}

// ---------------- events ----------------
var deb;
function bind() {
  var el = q('.ml');
  el.onclick = function (e) {
    var tb = e.target.closest('[data-tab]'); if (tb) { S.tab = tb.getAttribute('data-tab'); showTab(); return; }
    var lg = e.target.closest('[data-lang]'); if (lg) { lang = lg.getAttribute('data-lang'); try { localStorage.setItem(LS, lang); } catch (x) {} shell(); return; }
    var af = e.target.closest('[data-addfu]'); if (af) { openAddFU(af.getAttribute('data-addfu')); return; }
    var op = e.target.closest('[data-open]'); if (op) { openDetail(op.getAttribute('data-open')); return; }
    var cd = e.target.closest('[data-card]'); if (cd) { cardClick(cd.getAttribute('data-card')); return; }
    var bs = e.target.closest('[data-status]'); if (bs) { var s = bs.getAttribute('data-status'); if (CLOSED.indexOf(s) > -1) { S.hist.f.q = ''; S.tab = 'hist'; } else { S.list.f = { q: '', status: s, priority: '', city: '', from: '', to: '', fu: '' }; S.list.page = 0; S.tab = 'leads'; } showTab(); return; }
    var so = e.target.closest('[data-sort]'); if (so) { var pn = so.closest('[data-pane]').getAttribute('data-pane'), st = paneState(pn), f = so.getAttribute('data-sort'); st.dir = st.sort === f && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = f; st.page = 0; st.sortSet = 1; renderListPane(pn); return; }
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.getAttribute('data-act'), pane = a.closest('[data-pane]'), pk = pane && pane.getAttribute('data-pane'), ps = pk && paneState(pk);
    if (act === 'refresh') refreshAll(true);
    if (act === 'close') { drawerClose(); }
    if (act === 'update') openUpdate();
    if (act === 'apply' && ps) { readF(pk); ps.page = 0; loadList(pk); }
    if (act === 'reset' && ps) { Object.keys(ps.f).forEach(function (k) { ps.f[k] = ''; }); ps.page = 0; renderListPane(pk); }
    if (act === 'prev' && ps && ps.page > 0) { ps.page--; loadList(pk); }
    if (act === 'next' && ps && (ps.page + 1) * ps.size < ps.total) { ps.page++; loadList(pk); }
  };
  el.oninput = function (e) {
    var i = e.target; if (!i.matches('[data-f="q"]')) return;
    var pk = i.closest('[data-pane]').getAttribute('data-pane');
    clearTimeout(deb); deb = setTimeout(function () { readF(pk); paneState(pk).page = 0; loadList(pk); }, 400);
  };
}
function readF(pk) { var ps = paneState(pk); qa('[data-pane="' + pk + '"] [data-f]').forEach(function (i) { ps.f[i.getAttribute('data-f')] = i.value; }); }
function cardClick(k) {
  if (k === 'converted' || k === 'closed') { S.hist.f.q = ''; S.tab = 'hist'; showTab(); return; }
  S.list.f = { q: '', status: '', priority: '', city: '', from: '', to: '', fu: k === 'active' ? '' : k }; S.list.page = 0; S.tab = 'leads'; showTab();
}
function refreshAll(full) { S.cities = null; if (S.tab === 'overview') renderOverview(); else { loadList(S.tab); } if (!full) { /* keep tab */ } setTs(); }

var HOST = R.querySelector('.ml-root') || R;
HOST.innerHTML = '<div class="ml"></div>';
shell();
})();
