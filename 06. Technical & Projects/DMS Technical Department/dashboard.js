// DMS Technical Department Dashboard  (Custom HTML Block script)
(function () {
    const root = root_element;
    const $ = (sel) => root.querySelector(sel);
    const esc = (v) => frappe.utils.escape_html(v == null ? '' : String(v));
    const fmt = (d) => d ? frappe.datetime.str_to_user(d) : '-';

    const COLORS = {
        'Requested': '#e86c13', 'In Preparation': '#2490ef', 'Submitted': '#7c4dff',
        'Under Review': '#b58a00', 'Revision Required': '#e03636', 'Approved': '#2f9d58',
        'Approved with Comments': '#23845a', 'Rejected': '#b42318', 'Cancelled': '#98a1a9',
        'Overdue': '#e03636', 'Total': '#1f272e',
        'Urgent': '#e03636', 'High': '#e86c13', 'Normal': '#6c7680'
    };
    const CARDS = [
        ['Total', 'total', ''], ['Requested', 'Requested'], ['In Preparation', 'In Preparation'],
        ['Submitted', 'Submitted'], ['Under Review', 'Under Review'], ['Revision Required', 'Revision Required'],
        ['Approved', 'Approved'], ['Approved with Comments', 'Approved with Comments'],
        ['Rejected', 'Rejected'], ['Overdue', 'overdue', 'Overdue']
    ];

    const pill = (t) => `<span class="pill" style="--c:${COLORS[t] || '#98a1a9'}">${esc(t)}</span>`;
    const due = (r) => {
        if (!r.required_date) return '-';
        let note = '';
        if (r.overdue) note = `<div class="late">${-r.days_left} day(s) overdue</div>`;
        else if (r.days_left === 0 && ['Requested', 'In Preparation', 'Revision Required'].includes(r.status))
            note = '<div class="soon">Due today</div>';
        else if (r.days_left > 0 && r.days_left <= 2 && ['Requested', 'In Preparation', 'Revision Required'].includes(r.status))
            note = `<div class="soon">in ${r.days_left} day(s)</div>`;
        return fmt(r.required_date) + note;
    };
    const project = (r) => `<div>${esc(r.project_code)}</div><div class="muted">${esc(r.project_name)}</div>`;

    const COLS = {
        ts:       ['TS No.', r => `<span class="ts">${esc(r.name)}</span>${r.revision_no && r.revision_no !== '0' ? `<div class="muted">Rev ${esc(r.revision_no)}</div>` : ''}`],
        project:  ['Project', project],
        sales:    ['Salesperson', r => esc(r.sales_person_name)],
        reqby:    ['Requested By', r => esc(r.requested_by)],
        type:     ['Type', r => esc(r.submission_type)],
        reqdate:  ['Requested', r => fmt(r.request_date)],
        required: ['Required Date', due],
        priority: ['Priority', r => pill(r.priority)],
        products: ['Products', r => r.products, 'num'],
        status:   ['Status', r => pill(r.status)],
        submitted:['Submitted', r => fmt(r.submittal_date)],
        waiting:  ['Waiting', r => r.waiting_days == null ? '-' : `${r.waiting_days} day(s)`, 'num'],
        approved: ['Decision Date', r => fmt(r.approval_date)]
    };

    const SECTIONS = {
        action:   { title: 'Action Required', hint: 'Requested, In Preparation, Revision Required and overdue — overdue and urgent first',
                    cols: ['ts', 'project', 'sales', 'required', 'priority', 'products', 'status'] },
        review:   { title: 'Under Review', hint: 'Waiting for consultant / client response — longest waiting first',
                    cols: ['ts', 'project', 'sales', 'submitted', 'waiting', 'products', 'status'] },
        approved: { title: 'Recently Approved', hint: 'Latest 25 decisions',
                    cols: ['ts', 'project', 'sales', 'approved', 'products', 'status'] },
        recent:   { title: 'Recent Requests', hint: 'Latest 25 requests',
                    cols: ['ts', 'project', 'sales', 'reqby', 'reqdate', 'required', 'priority', 'products', 'status'] }
    };

    function filters() {
        const f = {};
        root.querySelectorAll('[data-f]').forEach(el => { if (el.value) f[el.dataset.f] = el.value; });
        return f;
    }

    function fillSelect(name, opts) {
        const el = $(`[data-f="${name}"]`);
        const cur = el.value;
        el.innerHTML = '<option value="">All</option>' +
            (opts || []).map(o => `<option value="${esc(o.value)}">${esc(o.label || o.value)}</option>`).join('');
        if (cur && [...el.options].some(o => o.value === cur)) el.value = cur;
    }

    function renderCards(counts, active) {
        $('.tsd-cards').innerHTML = CARDS.map(([label, key, filterVal]) => {
            const fv = filterVal === undefined ? key : filterVal;
            const on = (active || '') === fv && fv !== '' ? ' on' : '';
            return `<button class="tsd-card${on}" data-status="${esc(fv)}" style="--c:${COLORS[label]}">
                        <div class="n">${counts[key] || 0}</div><div class="l">${esc(label)}</div></button>`;
        }).join('');
    }

    function renderSection(key, rows) {
        const s = SECTIONS[key];
        const head = `<h3>${s.title}<span class="cnt">${rows.length}</span><span class="hint">${s.hint}</span></h3>`;
        if (!rows.length) {
            root.querySelector(`[data-s="${key}"]`).innerHTML = head + '<div class="empty">Nothing here.</div>';
            return;
        }
        const th = s.cols.map(c => `<th${COLS[c][2] ? ' style="text-align:right"' : ''}>${COLS[c][0]}</th>`).join('');
        const tr = rows.map(r => `<tr class="row" data-name="${esc(r.name)}">` +
            s.cols.map(c => `<td${COLS[c][2] ? ' class="num"' : ''}>${COLS[c][1](r)}</td>`).join('') + '</tr>').join('');
        root.querySelector(`[data-s="${key}"]`).innerHTML =
            head + `<div class="tsd-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
    }

    function load() {
        const f = filters();
        frappe.call({
            method: 'dms_technical_dashboard_data',
            args: f,
            callback(r) {
                const d = r.message || {};
                const o = d.options || {};
                fillSelect('department', o.department);
                fillSelect('sales_person', o.sales_person);
                fillSelect('dms_project', o.dms_project);
                renderCards(d.counts || {}, f.status);
                Object.keys(SECTIONS).forEach(k => renderSection(k, d[k] || []));
            }
        });
    }

    root.addEventListener('click', (e) => {
        const card = e.target.closest('.tsd-card');
        if (card) {
            const sel = $('[data-f="status"]');
            sel.value = sel.value === card.dataset.status ? '' : card.dataset.status;
            load();
            return;
        }
        const row = e.target.closest('tr.row');
        if (row) { frappe.set_route('Form', 'DMS Technical Submittal', row.dataset.name); return; }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'reset') root.querySelectorAll('[data-f]').forEach(el => { el.value = ''; });
        load();
    });
    root.querySelectorAll('[data-f]').forEach(el => el.addEventListener('change', load));

    load();
})();

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
  var AR = {"Action": "الإجراء", "Action Required": "إجراء مطلوب", "All": "الكل", "Approved": "معتمد", "Approved with Comments": "معتمد مع ملاحظات", "Cancelled": "ملغى", "Custom": "مخصص", "DMS Project": "مشروع DMS", "Date": "التاريخ", "Decision Date": "تاريخ القرار", "Department": "القسم", "Due today": "مستحق اليوم", "High": "مرتفع", "In Preparation": "قيد الإعداد", "Latest": "الأحدث", "Latest 25 decisions": "آخر 25 قرارًا", "Latest 25 requests": "آخر 25 طلبًا", "Material & technical submittal requests from DMS Projects": "طلبات تقديم المواد والمستندات الفنية من مشاريع DMS", "No": "لا", "No.": "رقم", "Normal": "عادي", "Nothing here.": "لا يوجد شيء هنا.", "Open list": "فتح القائمة", "Overdue": "متأخر", "Priority": "الأولوية", "Product": "المنتج", "Products": "المنتجات", "Project": "المشروع", "Projects": "المشاريع", "Recent Requests": "الطلبات الأخيرة", "Recently Approved": "المعتمدة مؤخرًا", "Refresh": "تحديث", "Reject": "رفض", "Rejected": "مرفوض", "Request": "الطلب", "Requested": "مطلوب", "Requested By": "مقدم الطلب", "Requested from": "مطلوب من", "Requested, In Preparation, Revision Required and overdue — overdue and urgent first": "مطلوب، قيد الإعداد، يحتاج مراجعة ومتأخر — المتأخر والعاجل أولًا", "Required": "مطلوب", "Required Date": "التاريخ المطلوب", "Reset": "إعادة تعيين", "Rev": "مراجعة", "Revision Required": "يحتاج مراجعة", "Sales": "المبيعات", "Salesperson": "مندوب المبيعات", "Status": "الحالة", "Submitted": "معتمد", "TS No.": "رقم الجدول الزمني", "Technical Department": "القسم الفني", "Technical Submittal": "التقديم الفني", "To": "إلى", "Total": "الإجمالي", "Type": "النوع", "Under Review": "قيد المراجعة", "Urgent": "عاجل", "Waiting": "انتظار", "Waiting for consultant / client response — longest waiting first": "بانتظار رد الاستشاري / العميل — الأطول انتظارًا أولًا", "to": "إلى"}, SEL = ".tsd", SLOT = ".tsd-actions", KEY = 'dms-lang', ATTRS = ['placeholder', 'title', 'aria-label'];
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
