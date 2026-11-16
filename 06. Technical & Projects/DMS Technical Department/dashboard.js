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
