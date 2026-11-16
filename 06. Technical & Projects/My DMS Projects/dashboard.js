(function () {
    var root = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    var host = root.querySelector('#dms-my-projects');
    if (!host) { return; }

    var current_employee = '';

    function n(v) { return Number(v || 0); }
    function esc(v) {
        return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
    function format_date(v) {
        if (!v) { return '&mdash;'; }
        try { return esc(frappe.datetime.str_to_user(v)); } catch (e) { return esc(v); }
    }

    function card(label, value, metric, css) {
        return '<div class="dms-my-card ' + (css || '') + '" data-metric="' + metric + '" role="button" tabindex="0">' +
            '<div class="dms-my-card-label">' + esc(label) + '</div>' +
            '<div class="dms-my-card-value">' + n(value) + '</div></div>';
    }

    function project_link(row) {
        return '<a href="#" class="dms-my-project-link" data-project="' + esc(row.project) + '">' +
            esc(row.project_code || row.project) + '</a>';
    }

    function status_badge(status) {
        var value = status || 'Not Contacted';
        var cls = 'status-gray';
        if (value === 'Contacted') { cls = 'status-blue'; }
        else if (value === 'Meeting Scheduled' || value === 'Quotation Submitted') { cls = 'status-purple'; }
        else if (value === 'Negotiation') { cls = 'status-orange'; }
        else if (value === 'Won') { cls = 'status-green'; }
        else if (value === 'Lost') { cls = 'status-red'; }
        return '<span class="dms-my-status ' + cls + '">' + esc(value) + '</span>';
    }

    function table_rows(rows, type, empty_text) {
        if (!rows.length) {
            return '<tr><td colspan="' + (type === 'overdue' ? 5 : 4) + '" class="dms-my-empty">' + esc(empty_text) + '</td></tr>';
        }
        return rows.map(function (row) {
            var extra = '';
            if (type === 'overdue') {
                extra = '<td class="dms-my-danger">' + n(row.days_overdue) + ' day' + (n(row.days_overdue) === 1 ? '' : 's') + '</td>';
            }
            return '<tr>' +
                '<td>' + project_link(row) + '<div class="dms-my-project-name">' + esc(row.project_name) + '</div></td>' +
                '<td>' + status_badge(row.follow_up_status) + '</td>' +
                '<td>' + format_date(row.next_follow_up_date) + '</td>' +
                extra +
                '<td><button type="button" class="dms-my-btn dms-my-btn-primary dms-update-followup" data-project="' +
                esc(row.project) + '" data-status="' + esc(row.follow_up_status || '') + '">Update Follow-Up</button></td></tr>';
        }).join('');
    }

    function table_section(title, headers, rows_html) {
        return '<div class="dms-my-section-title">' + title + '</div>' +
            '<div class="dms-my-table-wrap"><table class="dms-my-table"><thead><tr>' +
            headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
            '</tr></thead><tbody>' + rows_html + '</tbody></table></div>';
    }

        // ---------- Technical Submittals (all projects currently allocated to this salesperson) ----------
    var TS_ORDER = [
        ['requested', 'Requested'], ['in_preparation', 'In Preparation'], ['submitted', 'Submitted'],
        ['under_review', 'Under Review'], ['approved', 'Approved'], ['approved_with_comments', 'Approved with Comments'],
        ['revision_required', 'Revision Required'], ['rejected', 'Rejected']
    ];
    var TS_STATUS_CLASS = {
        'Requested': 'status-orange', 'In Preparation': 'status-blue', 'Submitted': 'status-purple',
        'Under Review': 'status-blue', 'Approved': 'status-green', 'Approved with Comments': 'status-green',
        'Revision Required': 'status-red', 'Rejected': 'status-red'
    };
    // Revision Required / Rejected = action required, Approved with Comments = attention,
    // Under Review = waiting for consultant, Approved = completed
    var TS_ATTN = {
        'Revision Required': ['red', 'Action Required'], 'Rejected': ['red', 'Action Required'],
        'Approved with Comments': ['amber', 'Attention'], 'Under Review': ['blue', 'Waiting'], 'Approved': ['green', 'Completed']
    };
    function ts_card(label, value, css) {
        return '<div class="dms-my-card dms-ts-card ' + (css || '') + '">' +
            '<div class="dms-my-card-label">' + esc(label) + '</div>' +
            '<div class="dms-my-card-value">' + n(value) + '</div></div>';
    }
    function ts_first(products, key, fallback) {
        var vals = (products || []).map(function (p) { return p[key] || (fallback ? p[fallback] : ''); }).filter(Boolean);
        if (!vals.length) return '<span class="dms-ts-muted">—</span>';
        return esc(vals[0]) + (vals.length > 1 ? ' <span class="dms-ts-muted">+' + (vals.length - 1) + ' more</span>' : '');
    }
    function ts_section(t) {
        t = t || {};
        var rows = t.rows || [];
        var cards = ts_card('Action Required', t.action_required, n(t.action_required) ? 'dms-ts-card-red' : '') +
            ts_card('Total', t.total, '') +
            TS_ORDER.map(function (x) { return ts_card(x[1], t[x[0]], ''); }).join('');
        var body;
        if (!rows.length) {
            body = '<tr><td colspan="9" class="dms-my-empty">No Technical Submittals on your projects yet.</td></tr>';
        } else {
            body = rows.map(function (r) {
                var a = TS_ATTN[r.status];
                var req = r.can_open
                    ? '<a href="/app/dms-technical-submittal/' + encodeURIComponent(r.name) + '">' + esc(r.name) + '</a>'
                    : '<span title="Created under the previous salesperson of this project">' + esc(r.name) + '</span>';
                return '<tr class="' + (a ? 'dms-ts-' + a[0] : '') + '">' +
                    '<td>' + project_link(r) + '</td>' +
                    '<td>' + req + '</td>' +
                    '<td>' + ts_first(r.products, 'submittal_product', 'item_code') + '</td>' +
                    '<td>' + ts_first(r.products, 'brand') + '</td>' +
                    '<td>' + format_date(r.required_date) + '</td>' +
                    '<td>' + format_date(r.submittal_date) + '</td>' +
                    '<td>' + n(r.revision_no) + '</td>' +
                    '<td><span class="dms-my-status ' + (TS_STATUS_CLASS[r.status] || 'status-gray') + '">' + esc(r.status) + '</span>' +
                        (a ? '<span class="dms-ts-tag dms-ts-tag-' + a[0] + '">' + a[1] + '</span>' : '') + '</td>' +
                    '<td>' + ts_first(r.products, 'approval_product') + '</td>' +
                    '</tr>';
            }).join('');
        }
        var banner = n(t.action_required)
            ? '<div class="dms-ts-banner">' + n(t.action_required) + ' Technical Submittal' + (n(t.action_required) > 1 ? 's need' : ' needs') + ' your action (Revision Required / Rejected).</div>'
            : '';
        return '<div class="dms-my-section-title">Technical Submittals</div>' +
            '<div class="dms-my-grid">' + cards + '</div>' + banner +
            '<div class="dms-my-table-wrap"><table class="dms-my-table"><thead><tr>' +
            ['Project', 'Request', 'Product', 'Brand', 'Required', 'Submitted', 'Rev', 'Status', 'Approval']
                .map(function (h) { return '<th>' + h + '</th>'; }).join('') +
            '</tr></thead><tbody>' + body + '</tbody></table></div>';
    }

    function render(data) {
        var s = data.summary || {};
        var employee = data.employee || {};
        var due = data.due_today_projects || [];
        var overdue = data.overdue_projects || [];
        var upcoming = data.upcoming_projects || [];
        current_employee = employee.name || '';

        host.innerHTML =
            '<div class="dms-my-header"><div>' +
            '<div class="dms-my-title">My DMS Projects</div>' +
            '<div class="dms-my-welcome">Welcome, ' + esc(clean(employee.employee_name)) + '</div>' +
            '<div class="dms-my-subtitle">Your allocated projects and sales follow-ups</div></div>' +
            '<button type="button" class="dms-my-btn" data-action="refresh">Refresh</button></div>' +

            '<div class="dms-my-section-title">My Projects</div>' +
            '<div class="dms-my-grid">' +
            card('My Projects', s.total_projects, 'total', 'blue') +
            card('Never Contacted', s.never_contacted, 'never_contacted', 'gray') +
            card('Due Today', s.due_today, 'due_today', 'orange') +
            card('Overdue', s.overdue, 'overdue', n(s.overdue) > 0 ? 'red' : 'green') +
            card('Upcoming', s.upcoming, 'upcoming', 'purple') +
            card('Contacted', s.contacted, 'contacted', 'blue') +
            card('Meetings', s.meeting_scheduled, 'meeting', 'purple') +
            card('Quotations', s.quotation_submitted, 'quotation', 'purple') +
            card('Negotiation', s.negotiation, 'negotiation', 'orange') +
            card('Won', s.won, 'won', 'green') +
            card('Lost', s.lost, 'lost', 'red') +
            '</div>' +

            table_section('Follow-Ups Due Today', ['Project', 'Status', 'Due Date', 'Action'],
                table_rows(due, 'due', 'Nothing due today.')) +
            table_section('Overdue Follow-Ups', ['Project', 'Status', 'Due Date', 'Overdue', 'Action'],
                table_rows(overdue, 'overdue', 'No overdue follow-ups.')) +
            table_section('Upcoming Follow-Ups', ['Project', 'Status', 'Due Date', 'Action'],
                table_rows(upcoming, 'upcoming', 'No upcoming follow-ups in the next 7 days.')) +
            ts_section(data.technical);
    }

    // Card drill-down: ALWAYS scoped to this employee, so the list matches the card
    // (even for a manager who can see every project).
    function drill(metric) {
        var today = frappe.datetime.get_today();
        var f = {};
        if (current_employee) { f.sales_person = current_employee; }
        var open_only = ['not in', ['Won', 'Lost']];

        if (metric === 'never_contacted') { f.follow_up_status = ['is', 'not set']; }
        else if (metric === 'due_today') { f.next_follow_up_date = today; f.follow_up_status = open_only; }
        else if (metric === 'overdue') {
            f.next_follow_up_date = ['between', ['2000-01-01', frappe.datetime.add_days(today, -1)]];
            f.follow_up_status = open_only;
        }
        else if (metric === 'upcoming') {
            f.next_follow_up_date = ['between', [frappe.datetime.add_days(today, 1), frappe.datetime.add_days(today, 7)]];
            f.follow_up_status = open_only;
        }
        else if (metric === 'contacted') { f.follow_up_status = 'Contacted'; }
        else if (metric === 'meeting') { f.follow_up_status = 'Meeting Scheduled'; }
        else if (metric === 'quotation') { f.follow_up_status = 'Quotation Submitted'; }
        else if (metric === 'negotiation') { f.follow_up_status = 'Negotiation'; }
        else if (metric === 'won') { f.follow_up_status = 'Won'; }
        else if (metric === 'lost') { f.follow_up_status = 'Lost'; }

        frappe.route_options = f;
        frappe.set_route('List', 'DMS Project');
    }

    // ------------------------------------------------------------------
    // My Contact Requests (Key Personnel Contact Requests)
    // List: dms_my_key_personnel_requests (own requests only).
    // Contact details are fetched ONLY on demand through
    // dms_get_shared_key_personnel_contact (requester + status Shared).
    // ------------------------------------------------------------------
    var kcr = { rows: [], counts: {}, filter: 'all', truncated: false, updated: '' };

    function kcr_badge(status) {
        var cls = 'status-gray';
        if (status === 'Pending') { cls = 'status-orange'; }
        else if (status === 'In Progress') { cls = 'status-blue'; }
        else if (status === 'Shared') { cls = 'status-green'; }
        else if (status === 'Rejected') { cls = 'status-red'; }
        return '<span class="dms-my-status ' + cls + '">' + esc(status) + '</span>';
    }

    function kcr_visible() {
        return kcr.rows.filter(function (r) {
            if (kcr.filter === 'all') { return true; }
            if (kcr.filter === 'pending') { return r.status === 'Pending' || r.status === 'In Progress'; }
            return r.status === kcr.filter;
        });
    }

    function kcr_rows_html() {
        var rows = kcr_visible();
        if (!rows.length) {
            return '<tr><td colspan="11" class="dms-my-empty">' +
                (kcr.rows.length ? 'No requests in this view.' :
                    'No contact requests yet. Open one of your projects and click Request Key Personnel Contact.') +
                '</td></tr>';
        }
        return rows.map(function (r) {
            var note = '<span class="dms-kcr-muted">&mdash;</span>';
            var action = '<span class="dms-kcr-muted">Waiting for manager</span>';
            if (r.status === 'Shared') {
                action = '<button type="button" class="dms-my-btn dms-my-btn-primary dms-kcr-view" data-request="' +
                    esc(r.name) + '">View Contact</button>';
            } else if (r.status === 'Rejected') {
                action = '<span class="dms-kcr-muted">Not available</span>';
                if (r.manager_remarks) { note = esc(r.manager_remarks); }
            }
            var main_row = '<tr>' +
                '<td>' + esc(r.name) + '</td>' +
                '<td>' + project_link({ project: r.dms_project, project_code: r.project_code }) +
                '<div class="dms-my-project-name">' + esc(r.project_name) + '</div></td>' +
                '<td>' + esc(r.required_designation) + '</td>' +
                kcr_contact_cells(r) +
                '<td>' + format_date(r.request_date) + '</td>' +
                kcr_shared_date_cell(r) +
                '<td>' + kcr_badge(r.status) + '</td>' +
                '<td>' + note + '</td>' +
                '<td>' + action + '</td></tr>';
            return main_row + kcr_extra_row(r);
        }).join('');
    }

    function kcr_section() {
        var sec = host.querySelector('#dms-kcr-section');
        if (!sec) {
            sec = document.createElement('div');
            sec.id = 'dms-kcr-section';
            host.appendChild(sec);
        }
        return sec;
    }

    function kcr_remove() {
        var sec = host.querySelector('#dms-kcr-section');
        if (sec) { sec.parentNode.removeChild(sec); }
    }

    function kcr_card(label, value, key, css) {
        var active = kcr.filter === key ? ' dms-kcr-active' : '';
        return '<div class="dms-my-card ' + css + active + '" data-kcr-filter="' + key + '" role="button" tabindex="0">' +
            '<div class="dms-my-card-label">' + esc(label) + '</div>' +
            '<div class="dms-my-card-value">' + n(value) + '</div></div>';
    }

    function kcr_render() {
        var sec = kcr_section();
        var c = kcr.counts || {};
        sec.innerHTML =
            '<div class="dms-kcr-head"><div class="dms-my-section-title">My Contact Requests</div>' +
            '<div><span class="dms-kcr-muted">Updated ' + esc(kcr.updated) + '</span> ' +
            '<button type="button" class="dms-my-btn" data-kcr-refresh="1">Refresh</button></div></div>' +
            '<div class="dms-my-grid">' +
            kcr_card('My Requests', c.total, 'all', 'blue') +
            kcr_card('Pending', n(c.Pending) + n(c['In Progress']), 'pending', 'orange') +
            kcr_card('Shared', c.Shared, 'Shared', 'green') +
            kcr_card('Rejected', c.Rejected, 'Rejected', 'gray') +
            '</div>' +
            '<div class="dms-my-table-wrap" style="margin-top:12px"><table class="dms-my-table"><thead><tr>' +
            '<th>Request</th><th>Project</th><th>Designation Requested</th><th>Contact Name</th><th>Mobile</th><th>Email</th><th>Request Date</th><th>Shared Date</th><th>Status</th>' +
            '<th>Manager Remarks</th><th>Action</th></tr></thead><tbody>' + kcr_rows_html() + '</tbody></table></div>' +
            (kcr.truncated ? '<div class="dms-kcr-muted">Showing your latest ' + kcr.rows.length + ' requests.</div>' : '');
    }

    function kcr_load() {
        frappe.call({
            method: 'dms_my_key_personnel_requests',
            silent: true,
            callback: function (r) {
                if (!r.message || !r.message.counts) { kcr_remove(); return; }
                kcr.counts = r.message.counts;
                kcr.rows = r.message.requests || [];
                kcr.truncated = !!r.message.truncated;
                kcr.updated = new Date().toLocaleTimeString();
                kcr_load_contacts();
            },
            error: function () { kcr_remove(); }
        });
    }

        function kcr_contact_for(r) {
        if (!r || r.status !== 'Shared') { return null; }
        var c = (kcr.contacts || {})[r.name];
        return c || null;
    }

    function kcr_dash() { return '<span class="dms-kcr-muted">&mdash;</span>'; }

    function kcr_contact_cells(r) {
        var q = kcr_contact_for(r);
        if (!q || !q.contact) { return '<td>' + kcr_dash() + '</td><td>' + kcr_dash() + '</td><td>' + kcr_dash() + '</td>'; }
        var c = q.contact;
        var tel = String(c.mobile_number || '').replace(/[^0-9+]/g, '');
        var mail = String(c.email_address || '').trim();
        var mailOk = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(mail);
        var mobile = c.mobile_number ? (tel ? '<a href="tel:' + esc(tel) + '">' + esc(c.mobile_number) + '</a>' : esc(c.mobile_number)) : kcr_dash();
        var email = mail ? (mailOk ? '<a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a>' : esc(mail)) : kcr_dash();
        var extra = (q.contacts || []).length - 1;
        var more = extra > 0 ? '<div><button type="button" class="dms-kcr-morebtn" data-kcr-more="' + esc(r.name) + '">' + ((kcr.open || {})[r.name] ? 'Hide other contacts' : '+' + extra + ' more contact' + (extra > 1 ? 's' : '')) + '</button></div>' : '';
        return '<td><strong>' + (c.contact_name ? esc(c.contact_name) : kcr_dash()) + '</strong>' + more + '</td><td>' + mobile + '</td><td>' + email + '</td>';
    }

    function kcr_contact_link(kind, v) {
        var raw = String(v || '').trim();
        if (!raw) { return kcr_dash(); }
        if (kind === 'tel') {
            var t = raw.replace(/[^0-9+]/g, '');
            return t ? '<a href="tel:' + esc(t) + '">' + esc(raw) + '</a>' : esc(raw);
        }
        return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(raw) ? '<a href="mailto:' + esc(raw) + '">' + esc(raw) + '</a>' : esc(raw);
    }

    function kcr_extra_row(r) {
        var q = kcr_contact_for(r);
        var list = (q && q.contacts) || [];
        if (list.length < 2) { return ''; }
        var open = !!(kcr.open || {})[r.name];
        var rows = list.slice(1).map(function (c, i) {
            return '<tr><td>' + (i + 2) + '</td><td><strong>' + esc(c.contact_name || '') + '</strong></td><td>' + (esc(c.designation || '') || kcr_dash()) + '</td><td>' + (esc(c.company || '') || kcr_dash()) + '</td><td>' + kcr_contact_link('tel', c.mobile_number) + '</td><td>' + kcr_contact_link('mail', c.email_address) + '</td></tr>';
        }).join('');
        return '<tr class="dms-kcr-extra"' + (open ? '' : ' hidden') + '><td colspan="11"><div class="dms-kcr-extra-title">Other contacts shared for ' + esc(r.name) + '</div>' +
            '<table class="dms-kcr-extra-table"><thead><tr><th>#</th><th>Contact</th><th>Designation</th><th>Company</th><th>Mobile</th><th>Email</th></tr></thead><tbody>' + rows + '</tbody></table></td></tr>';
    }

    function kcr_shared_date_cell(r) {
        var q = kcr_contact_for(r);
        return '<td>' + ((q && q.shared_date) ? format_date(String(q.shared_date).slice(0, 10)) : kcr_dash()) + '</td>';
    }

    function kcr_load_contacts() {
        frappe.call({
            method: 'dms_project_shared_contacts',
            silent: true,
            callback: function (r) {
                var map = {};
                var list = (r && r.message && r.message.requests) || [];
                list.forEach(function (q) {
                    if (q && q.status === 'Shared' && q.contact && q.is_mine !== false) { map[q.name] = q; }
                });
                kcr.contacts = map;
                kcr_render();
            },
            error: function () { kcr.contacts = {}; kcr_render(); }
        });
    }

    function kcr_view_contact(request_id) {
        frappe.call({
            method: 'dms_get_shared_key_personnel_contact',
            args: { request_id: request_id },
            freeze: true,
            freeze_message: __('Loading contact...'),
            callback: function (r) {
                var m = r.message;
                var list = (m && m.contacts && m.contacts.length) ? m.contacts : (m && m.contact ? [m.contact] : []);
                if (!list.length) { return; }
                function row(label, value_html) {
                    return '<tr><td style="padding:4px 14px 4px 0;color:#64748b;white-space:nowrap">' + label +
                        '</td><td style="padding:4px 0;font-weight:600">' + value_html + '</td></tr>';
                }
                var html = '<div style="margin-bottom:10px;color:#64748b">' + esc(m.project_code || '') + ' &middot; ' +
                    esc(m.project_name || '') + '<br>Requested: ' + esc(m.requested_designation || '') + '</div>';
                list.forEach(function (c, i) {
                    var tel = String(c.mobile_number || '').replace(/[^0-9+]/g, '');
                    var mobile = c.mobile_number ? (tel ? '<a href="tel:' + esc(tel) + '">' + esc(c.mobile_number) + '</a>' : esc(c.mobile_number)) : '&mdash;';
                    var email = c.email_address ? '<a href="mailto:' + esc(c.email_address) + '">' + esc(c.email_address) + '</a>' : '&mdash;';
                    html += (list.length > 1 ? '<div style="font-weight:700;color:#17365d;margin:10px 0 2px">Contact ' + (i + 1) + ' of ' + list.length + '</div>' : '') +
                        '<table>' +
                        row('Contact', esc(c.contact_name || '')) +
                        row('Designation', esc(c.designation || '') || '&mdash;') +
                        row('Company', esc(c.company || '') || '&mdash;') +
                        row('Mobile', mobile) +
                        row('Email', email) + '</table>';
                });
                if (m.manager_remarks) { html += '<table>' + row('Manager remarks', esc(m.manager_remarks)) + '</table>'; }
                var d = new frappe.ui.Dialog({
                    title: (list.length > 1 ? 'Contacts Shared - ' : 'Contact Details - ') + m.request_id,
                    fields: [{ fieldtype: 'HTML', fieldname: 'contact_html', options: html }],
                    primary_action_label: 'Close',
                    primary_action: function () { d.hide(); }
                });
                d.show();
            }
        });
    }

    function kcr_handle_click(e, t) {
        var more = t.closest('[data-kcr-more]');
        if (more) {
            e.preventDefault();
            var rid = more.getAttribute('data-kcr-more');
            kcr.open = kcr.open || {};
            kcr.open[rid] = !kcr.open[rid];
            kcr_render();
            return true;
        }
        var view = t.closest('.dms-kcr-view');
        if (view) { e.preventDefault(); kcr_view_contact(view.getAttribute('data-request')); return true; }
        var f = t.closest('[data-kcr-filter]');
        if (f) {
            e.preventDefault();
            var key = f.getAttribute('data-kcr-filter');
            kcr.filter = (kcr.filter === key && key !== 'all') ? 'all' : key;
            kcr_render();
            return true;
        }
        if (t.closest('[data-kcr-refresh]')) { e.preventDefault(); kcr_load(); return true; }
        return false;
    }

    // Refresh when the user returns to this tab, so a manager's update appears
    // without navigating away. (The workspace also reloads this block on every visit.)
    if (window.__dms_kcr_visibility) {
        document.removeEventListener('visibilitychange', window.__dms_kcr_visibility);
    }
    window.__dms_kcr_visibility = function () {
        if (document.visibilityState === 'visible' && host.isConnected) { kcr_load(); }
    };
    document.addEventListener('visibilitychange', window.__dms_kcr_visibility);

    function load() {
        host.innerHTML = '<div class="dms-my-loading">Loading your DMS projects...</div>';
        frappe.call({
            method: 'dms_my_projects_dashboard_data',
            callback: function (r) {
                if (!r.message || r.message.status !== 'success') {
                    host.innerHTML = '<div class="dms-my-error">Unable to load your DMS projects.</div>';
                    return;
                }
                render(r.message);
                kcr_load();
            },
            error: function () {
                host.innerHTML = '<div class="dms-my-error">Unable to load your DMS projects. ' +
                    'Your user may not be linked to an Employee record.</div>';
            }
        });
    }

    // ------------------------------------------------------------------
    // Update Follow-Up dialog - reuses the tested server method
    // dms_add_follow_up (authorization, date rules, field update and
    // Follow-Up History row all happen there).
    // ------------------------------------------------------------------
    var FOLLOWUP_STATUSES = ['Contacted', 'Meeting Scheduled', 'Quotation Submitted', 'Negotiation', 'Won', 'Lost'];
    var CLOSED_STATUSES = ['Won', 'Lost'];

    function open_followup_dialog(project, current_status) {
        var dialog = null;
        var tomorrow = frappe.datetime.add_days(frappe.datetime.get_today(), 1);

        // Won / Lost need no further follow-up date; every active status does.
        function sync_next_date() {
            if (!dialog) { return; }
            var closed = CLOSED_STATUSES.indexOf(dialog.get_value('follow_up_status')) >= 0;
            dialog.set_df_property('next_follow_up_date', 'reqd', closed ? 0 : 1);
            if (closed) { dialog.set_value('next_follow_up_date', null); }
            else if (!dialog.get_value('next_follow_up_date')) { dialog.set_value('next_follow_up_date', tomorrow); }
        }

        dialog = new frappe.ui.Dialog({
            title: __('Update Follow-Up'),
            fields: [
                {
                    fieldname: 'follow_up_status',
                    fieldtype: 'Select',
                    label: __('Follow-Up Status'),
                    options: FOLLOWUP_STATUSES.join('\n'),
                    reqd: 1,
                    default: FOLLOWUP_STATUSES.indexOf(current_status) >= 0 ? current_status : 'Contacted',
                    change: function () { sync_next_date(); }
                },
                {
                    fieldname: 'next_follow_up_date',
                    fieldtype: 'Date',
                    label: __('Next Follow-Up Date'),
                    reqd: 1,
                    default: tomorrow
                },
                {
                    fieldname: 'remarks',
                    fieldtype: 'Small Text',
                    label: __('Remarks'),
                    reqd: 1
                }
            ],
            primary_action_label: __('Save'),
            primary_action: function (values) {
                var closed = CLOSED_STATUSES.indexOf(values.follow_up_status) >= 0;
                if (!values.follow_up_status) { frappe.msgprint(__('Please select Follow-Up Status.')); return; }
                if (!values.remarks || !String(values.remarks).trim()) { frappe.msgprint(__('Please enter Remarks.')); return; }
                if (!closed && !values.next_follow_up_date) { frappe.msgprint(__('Next Follow-Up Date is required.')); return; }
                if (values.next_follow_up_date && values.next_follow_up_date < frappe.datetime.get_today()) {
                    frappe.msgprint(__('Next Follow-Up Date cannot be in the past.'));
                    return;
                }

                dialog.get_primary_btn().prop('disabled', true);

                frappe.call({
                    method: 'dms_add_follow_up',
                    args: {
                        project: project,
                        follow_up_status: values.follow_up_status,
                        next_follow_up_date: values.next_follow_up_date || '',
                        remarks: values.remarks
                    },
                    freeze: true,
                    freeze_message: __('Saving follow-up...'),
                    callback: function (r) {
                        dialog.get_primary_btn().prop('disabled', false);
                        if (r.message && r.message.ok) {
                            dialog.hide();
                            frappe.show_alert({ message: __('Follow-up updated successfully.'), indicator: 'green' });
                            load();   // refresh cards and tables in place
                        }
                    },
                    error: function () { dialog.get_primary_btn().prop('disabled', false); }
                });
            }
        });

        dialog.show();
        sync_next_date();
    }

    // One delegated handler (works inside or outside a shadow root)
    function on_activate(e) {
        var t = e.target;
        if (!t || !t.closest) { return; }
        if (kcr_handle_click(e, t)) { return; }

        var update = t.closest('.dms-update-followup');
        if (update) {
            e.preventDefault();
            var p1 = update.getAttribute('data-project');
            if (!p1) { frappe.msgprint('Project could not be identified.'); return; }
            open_followup_dialog(p1, update.getAttribute('data-status'));
            return;
        }
        var plink = t.closest('.dms-my-project-link');
        if (plink) {
            e.preventDefault();
            var p2 = plink.getAttribute('data-project');
            if (p2) { frappe.set_route('Form', 'DMS Project', p2); }
            return;
        }
        var tile = t.closest('[data-metric]');
        if (tile) { e.preventDefault(); drill(tile.getAttribute('data-metric')); return; }
        if (t.closest('[data-action="refresh"]')) { e.preventDefault(); load(); }
    }
    host.addEventListener('click', on_activate);
    host.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('[data-metric], [data-kcr-filter]')) { on_activate(e); }
    });

    load();
})();