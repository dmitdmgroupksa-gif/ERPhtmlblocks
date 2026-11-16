(function () {
    var root = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    var host = root.querySelector('#dms-sales-dashboard');
    if (!host) { return; }

    function num(v) { return v || 0; }
    function esc(v) {
        return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function clean_name(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }

    function format_date(v) {
        if (!v) { return '&mdash;'; }
        try { return esc(frappe.datetime.str_to_user(v)); } catch (e) { return esc(v); }
    }

    function status_badge(status) {
        var value = status || 'Not Contacted';
        var css = 'dms-badge-gray';
        if (value === 'Contacted') { css = 'dms-badge-blue'; }
        else if (value === 'Meeting Scheduled' || value === 'Quotation Submitted') { css = 'dms-badge-purple'; }
        else if (value === 'Negotiation') { css = 'dms-badge-orange'; }
        else if (value === 'Won') { css = 'dms-badge-green'; }
        else if (value === 'Lost') { css = 'dms-badge-red'; }
        return '<span class="dms-status-badge ' + css + '">' + esc(value) + '</span>';
    }

    function project_link(row) {
        var code = esc(row.project_code || row.project || 'Open Project');
        var docname = esc(row.project || '');
        return '<a href="#" class="dms-project-link" data-project="' + docname + '">' + code + '</a>' +
            '<div class="dms-project-name">' + esc(row.project_name || '') + '</div>';
    }

    function metric_cell(p, key, extra_class) {
        return '<td><span class="dms-person-metric ' + extra_class + '" data-employee="' + esc(p.employee) +
            '" data-metric="' + key + '" role="button" tabindex="0">' + num(p[key]) + '</span></td>';
    }

    function person_name(row) { return esc(clean_name(row.sales_person_name || row.sales_person)); }

    function table_section(title, subtitle, count_text, headers, rows_html) {
        return '<div class="dms-section-heading-row"><div>' +
            '<div class="dms-section-title">' + title + '</div>' +
            '<div class="dms-section-subtitle">' + subtitle + '</div></div>' +
            '<div class="dms-table-count">' + count_text + '</div></div>' +
            '<div class="dms-table-card"><div class="dms-table-wrap"><table class="dms-sales-table"><thead><tr>' +
            headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
            '</tr></thead><tbody>' + rows_html + '</tbody></table></div></div>';
    }

    function card(label, value, css, drill_type) {
        return '<div class="dms-stat-card ' + css + '" data-drill="' + drill_type + '" role="button" tabindex="0">' +
            '<div class="dms-stat-label">' + label + '</div>' +
            '<div class="dms-stat-value">' + num(value) + '</div></div>';
    }

    function action_card(title, description, value, css, drill_type) {
        return '<div class="dms-action-card ' + css + '" data-drill="' + drill_type + '" role="button" tabindex="0">' +
            '<div><div class="dms-action-title">' + title + '</div>' +
            '<div class="dms-action-description">' + description + '</div></div>' +
            '<div class="dms-action-number">' + num(value) + '</div></div>';
    }

    // ---------------------------------------------------------
    // Drill-down: open the DMS Project list with matching filters
    // ---------------------------------------------------------
    function drill(type, employee) {
        var today = frappe.datetime.get_today();
        var yesterday = frappe.datetime.add_days(today, -1);
        var open_only = ['not in', ['Won', 'Lost']];
        var f = {};

        if (type === 'allocated') { f.sales_person = ['is', 'set']; }
        else if (type === 'unallocated') { f.sales_person = ['is', 'not set']; }
        else if (type === 'mismatch') {
            f.sales_person = ['is', 'not set'];
            f.allocation_status = ['in', ['Allocated', 'Reallocated']];
        }
        else if (type === 'never_contacted') {
            f.sales_person = ['is', 'set'];
            f.follow_up_status = ['is', 'not set'];
        }
        else if (type === 'contacted') { f.follow_up_status = 'Contacted'; }
        else if (type === 'meeting') { f.follow_up_status = 'Meeting Scheduled'; }
        else if (type === 'quotation') { f.follow_up_status = 'Quotation Submitted'; }
        else if (type === 'negotiation') { f.follow_up_status = 'Negotiation'; }
        else if (type === 'won') { f.follow_up_status = 'Won'; }
        else if (type === 'lost') { f.follow_up_status = 'Lost'; }
        else if (type === 'due_today') {
            f.next_follow_up_date = today;
            f.follow_up_status = open_only;
        }
        else if (type === 'overdue') {
            // explicit range so projects with NO next date are never counted as overdue
            f.next_follow_up_date = ['between', ['1900-01-01', yesterday]];
            f.follow_up_status = open_only;
        }
        else if (type === 'salesperson') { f.sales_person = employee; }
        else if (type === 'assigned') { /* the sales person filter below is enough */ }

        // per-person metric: combine the metric filter with that salesperson
        if (employee) { f.sales_person = employee; }

        frappe.route_options = f;
        frappe.set_route('List', 'DMS Project');

        if (!Object.keys(f).length) {
            setTimeout(function () {
                if (window.cur_list && cur_list.doctype === 'DMS Project') { cur_list.filter_area.clear(); }
            }, 700);
        }
    }

    // ---------------------------------------------------------
    // Render
    // ---------------------------------------------------------
        // -----------------------------------------------------
    // PROJECTS BY SECTOR (read-only cards, open filtered project list)
    // -----------------------------------------------------
    function sector_card(label, count, allocated, key, css) {
        return '<div class="dms-stat-card ' + css + '" data-sector-filter="' + esc(key) + '" role="button" tabindex="0">' +
            '<div class="dms-stat-label">' + esc(label) + '</div>' +
            '<div class="dms-stat-value">' + num(count) + '</div>' +
            '<div class="dms-stat-sub">' + num(allocated) + ' allocated</div></div>';
    }

    function sector_section(data) {
        var cards = data.sector_cards || [];
        if (!cards.length) { return ''; }
        var un = data.sector_unclassified || { count: 0, allocated: 0 };
        sector_labels = cards.map(function (c) { return c.sector; });
        var html = '<div class="dms-section-title">Projects by Sector</div>' +
            '<div class="dms-sector-note">A project can have several sectors, so counts overlap. Click a card to open its projects.</div>' +
            '<div class="dms-card-grid dms-sector-grid">';
        cards.forEach(function (c) {
            html += sector_card(c.sector, c.count, c.allocated, c.sector, c.count ? 'dms-blue' : 'dms-gray');
        });
        html += sector_card('Not Classified', un.count, un.allocated, '__none__', 'dms-gray');
        return html + '</div>';
    }

    var sector_labels = [];

    // A tag that is contained in another tag (for example Chemicals inside
    // Petrochemicals) cannot be matched with a text search, so the exact
    // project IDs are looked up and passed to the list instead.
    function sector_is_ambiguous(sector) {
        var low = sector.toLowerCase();
        return sector_labels.some(function (other) {
            return other !== sector && other.toLowerCase().indexOf(low) !== -1;
        });
    }

    function sector_open_list(f) {
        frappe.route_options = f;
        frappe.set_route('List', 'DMS Project');
    }

    function sector_drill(sector) {
        if (sector === '__none__') { sector_open_list({ sector: ['is', 'not set'] }); return; }
        if (!sector_is_ambiguous(sector)) { sector_open_list({ sector: ['like', '%' + sector + '%'] }); return; }
        frappe.call({
            method: 'frappe.client.get_list',
            args: { doctype: 'DMS Project', fields: ['name', 'sector'], filters: [['sector', 'like', '%' + sector + '%']], limit_page_length: 0 },
            freeze: true,
            freeze_message: __('Loading projects...'),
            callback: function (r) {
                var wanted = sector.toLowerCase();
                var names = (r.message || []).filter(function (row) {
                    return String(row.sector || '').split(',').some(function (t) { return t.trim().toLowerCase() === wanted; });
                }).map(function (row) { return row.name; });
                sector_open_list({ name: ['in', names.length ? names : ['-']] });
            }
        });
    }

        // -----------------------------------------------------
    // PROJECTS BY REGION (read-only cards, open list of exact project IDs)
    // -----------------------------------------------------
    var region_ids = {};

    function region_card(c) {
        var sub = '';
        if (c.region === 'Unclassified') { sub = '<div class="dms-stat-sub">Requires location verification</div>'; }
        else if (c.review) { sub = '<div class="dms-stat-sub">' + num(c.review) + ' to verify</div>'; }
        var css = { Riyadh: 'dms-blue', Eastern: 'dms-green', Western: 'dms-purple', Other: 'dms-gray', Unclassified: 'dms-orange' }[c.region] || 'dms-gray';
        return '<div class="dms-stat-card ' + css + '" data-region-filter="' + esc(c.region) + '" role="button" tabindex="0">' +
            '<div class="dms-stat-label">' + esc(c.region) + (c.region === 'Unclassified' ? '' : (c.region === 'Other' ? ' Regions' : ' Region')) + '</div>' +
            '<div class="dms-stat-value">' + num(c.count) + '</div>' +
            '<div class="dms-stat-sub">' + num(c.allocated) + ' allocated</div>' + sub + '</div>';
    }

    function region_section(data) {
        var cards = data.region_cards || [];
        if (!cards.length) { return ''; }
        region_ids = {};
        cards.forEach(function (c) { region_ids[c.region] = c; });
        var html = '<div class="dms-section-title">Projects by Region</div>' +
            '<div class="dms-sector-note">Based on each project\'s City field. Every project is in exactly one region. Click a card to open its projects.</div>' +
            '<div class="dms-card-grid dms-region-grid">';
        cards.forEach(function (c) { html += region_card(c); });
        return html + '</div>';
    }

    function region_drill(region) {
        var c = region_ids[region] || {};
        var ids = c.ids || [];
        // exact city list when the server says it matches cleanly, otherwise exact project IDs
        frappe.route_options = (c.mode === 'cities' && (c.cities || []).length)
            ? { city: ['in', c.cities] }
            : { name: ['in', ids.length ? ids : ['-']] };
        frappe.set_route('List', 'DMS Project');
    }


    // -----------------------------------------------------
    // PROJECTS BY CONTRACTING COMPANY (read-only)
    // Display aliases only; original DMS company names are never changed.
    // -----------------------------------------------------
    var cc = { tab: 'contractors', stage: 'all', search: '', data: null, alloc: {} };
    var CC_BITS = { all: 0, pq: 1, bid: 2, awd: 4 };
    var CC_STAGES = [['all', 'All Contractors'], ['pq', 'Pre-Qualified'], ['bid', 'Bidding'], ['awd', 'Awarded']];

    function cc_prepare(data) {
        cc.data = data.contractor_data || null;
        cc.alloc = {};
        if (cc.data) { (cc.data.allocated_ids || []).forEach(function (id) { cc.alloc[id] = 1; }); }
        // Subcontractors have no stage of their own: use the stages of the contractors on the same project.
        cc.pflags = {};
        if (cc.data) {
            (cc.data.contractors.companies || []).forEach(function (c) {
                (c.p || []).forEach(function (v) { var k = v >> 3; cc.pflags[k] = (cc.pflags[k] || 0) | (v & 7); });
            });
        }
    }

    function cc_group() {
        if (!cc.data) { return null; }
        return cc.tab === 'subcontractors' ? cc.data.subcontractors : cc.data.contractors;
    }

    function cc_stats(c) {
        var bit = CC_BITS[cc.stage];
        var ids = [];
        var al = 0;
        (c.p || []).forEach(function (v) {
            var fl = cc.tab === 'contractors' ? (v & 7) : (cc.pflags[v >> 3] || 0);
            if (bit && !(fl & bit)) { return; }
            var id = cc.data.project_ids[v >> 3];
            ids.push(id);
            if (cc.alloc[id]) { al = al + 1; }
        });
        return { count: ids.length, allocated: al, ids: ids };
    }

    function cc_matches(c, q) {
        if (String(c.name || '').toLowerCase().indexOf(q) >= 0) { return true; }
        return (c.entities || []).some(function (e) { return String(e.name || '').toLowerCase().indexOf(q) >= 0; });
    }

    function cc_visible() {
        var g = cc_group();
        if (!g) { return { rows: [], total: 0, mode: 'top' }; }
        var rows = [];
        g.companies.forEach(function (c, idx) {
            var st = cc_stats(c);
            if (st.count > 0) { rows.push({ c: c, idx: idx, st: st }); }
        });
        rows.sort(function (a, b) { return (b.st.count - a.st.count) || String(a.c.name).localeCompare(String(b.c.name)); });
        if (cc.search) {
            var m = rows.filter(function (r) { return cc_matches(r.c, cc.search); });
            return { rows: m.slice(0, 24), total: m.length, mode: 'search' };
        }
        var top = rows.slice(0, 12);
        if (cc.tab === 'contractors') {
            (cc.data.pinned || []).forEach(function (name) {
                var present = top.some(function (r) { return r.c.name === name; });
                if (present) { return; }
                var f = rows.filter(function (r) { return r.c.name === name; })[0];
                if (f) { f.pinned = true; top.push(f); }
            });
        }
        return { rows: top, total: rows.length, mode: 'top' };
    }

    function cc_card(r) {
        var c = r.c;
        var st = r.st;
        var ents = (c.entities || []).slice().sort(function (a, b) { return b.projects - a.projects; });
        var tip = c.name + ' - ' + st.count + ' projects (' + st.allocated + ' allocated, ' + (st.count - st.allocated) + ' unallocated)';
        var ent = '';
        if (cc.tab === 'contractors') {
            var pq = 0, bid = 0, awd = 0;
            (c.p || []).forEach(function (v) { var fl = cc.tab === 'contractors' ? (v & 7) : (cc.pflags[v >> 3] || 0); if (fl & 1) { pq = pq + 1; } if (fl & 2) { bid = bid + 1; } if (fl & 4) { awd = awd + 1; } });
            tip += '\nPre-Qualified ' + pq + ', Bidding ' + bid + ', Awarded ' + awd + ' (all stages)';
        }
        if (ents.length > 1) {
            ent = '<div class="dms-cc-entities">' + ents.length + ' entities</div>';
            tip += '\nEntities: ' + ents.map(function (e) { return e.name + ' (' + e.projects + ')'; }).join(', ');
        } else if (ents.length === 1 && ents[0].name !== c.name) {
            tip += '\nStored as: ' + ents[0].name;
        }
        return '<div class="dms-stat-card dms-blue dms-cc-card" data-cc-company="' + r.idx + '" role="button" tabindex="0" title="' + esc(tip) + '">' +
            '<div class="dms-stat-label dms-cc-name">' + esc(c.name) + '</div>' +
            '<div class="dms-stat-value dms-cc-value">' + num(st.count) + '</div>' +
            '<div class="dms-stat-sub dms-cc-sub">' + num(st.allocated) + ' allocated</div>' + ent + '</div>';
    }

    function cc_controls_html() {
        var html = '<div class="dms-cc-controls">' +
            '<button class="dms-btn dms-cc-btn' + (cc.tab === 'contractors' ? ' dms-cc-on' : '') + '" data-cc-tab="contractors">Contractors</button>' +
            '<button class="dms-btn dms-cc-btn' + (cc.tab === 'subcontractors' ? ' dms-cc-on' : '') + '" data-cc-tab="subcontractors">Subcontractors</button>';
        html += '<span class="dms-cc-gap"></span>';
        CC_STAGES.forEach(function (s) {
            var lbl = (s[0] === 'all' && cc.tab === 'subcontractors') ? 'All Subcontractors' : s[1];
            html += '<button class="dms-btn dms-cc-btn' + (cc.stage === s[0] ? ' dms-cc-on' : '') + '" data-cc-stage="' + s[0] + '">' + lbl + '</button>';
        });
        return html + '</div>';
    }

    function cc_body_html() {
        var g = cc_group();
        if (!g) { return ''; }
        var tile = function (label, value) {
            return '<div class="dms-cc-tile"><div class="dms-cc-tile-value">' + num(value) + '</div><div class="dms-cc-tile-label">' + label + '</div></div>';
        };
        var html = '<div class="dms-cc-tiles">' +
            tile('Exact Names', g.exact_names) +
            tile('Display Names (after aliases)', g.normalized_names) +
            tile('Projects Covered', g.projects_covered) +
            tile(cc.tab === 'contractors' ? 'Contractor Records' : 'Subcontractor Records', g.records) + '</div>';
        var v = cc_visible();
        var note;
        if (v.mode === 'search') {
            note = v.total + ' matching ' + (cc.tab === 'contractors' ? 'contractor' : 'subcontractor') + ' name' + (v.total === 1 ? '' : 's') + (v.total > v.rows.length ? ' (showing the top ' + v.rows.length + ')' : '');
        } else {
            note = 'Top 12 ' + (cc.tab === 'contractors' ? 'contractors' : 'subcontractors') + ' by project count' + (cc.tab === 'contractors' ? ', plus pinned companies. Each project is counted once per company.' : '. Each project is counted once per company.') + ' ' + num(v.total) + ' companies in this view.';
        }
        if (cc.tab === 'subcontractors') { note += ' Stage filters use the stages of the contractors on the same project, because subcontractors have no stage of their own.'; }
        html += '<div class="dms-sector-note">' + esc(note) + '</div>';
        if (!v.rows.length) {
            return html + '<div class="dms-sector-note">No companies match.</div>';
        }
        html += '<div class="dms-card-grid dms-cc-grid">';
        v.rows.forEach(function (r) { html += cc_card(r); });
        return html + '</div>';
    }

    function cc_section(data) {
        cc_prepare(data);
        if (!cc.data) { return ''; }
        return '<div class="dms-section-heading-row"><div>' +
            '<div class="dms-section-title">Projects by Contracting Company</div>' +
            '<div class="dms-section-subtitle">Company names are grouped by display aliases only; original DMS names are unchanged. Click a card to open its projects.</div></div>' +
            '<div class="dms-kpr-tools"><input id="dms-cc-search" class="dms-kpr-search" type="search" placeholder="Search contractor names..." value="' + esc(cc.search) + '"></div></div>' +
            '<div id="dms-cc-controls">' + cc_controls_html() + '</div>' +
            '<div id="dms-cc-body">' + cc_body_html() + '</div>';
    }

    function cc_refresh() {
        var c1 = host.querySelector('#dms-cc-controls');
        if (c1) { c1.innerHTML = cc_controls_html(); }
        var b = host.querySelector('#dms-cc-body');
        if (b) { b.innerHTML = cc_body_html(); }
    }

    function cc_on_input(e) {
        if (e.target && e.target.id === 'dms-cc-search') {
            cc.search = String(e.target.value || '').toLowerCase().trim();
            var b = host.querySelector('#dms-cc-body');
            if (b) { b.innerHTML = cc_body_html(); }
        }
    }

    function cc_drill(idx) {
        var g = cc_group();
        var c = g && g.companies[idx];
        if (!c) { return; }
        var ids = cc_stats(c).ids;
        frappe.route_options = { name: ['in', ids.length ? ids : ['-']] };
        frappe.set_route('List', 'DMS Project');
    }


    // -----------------------------------------------------
    // SALES TEAM PERFORMANCE (compact summary, expandable pipeline)
    // Uses the existing sales_people API data; no allocation logic is changed.
    // -----------------------------------------------------
    var sp = { search: '', overdue: false, never: false, full: false, people: [], summary: {} };

    function sp_code(p) {
        var m = String(p.employee || '').match(/^\d+/);
        return m ? 'ID ' + m[0] : String(p.employee || '');
    }

    function sp_name(p) { return clean_name(p.employee_name || p.employee); }

    function sp_sorted() {
        var list = (sp.people || []).slice();
        list.sort(function (a, b) {
            return (Number(b.assigned || 0) - Number(a.assigned || 0)) || String(sp_name(a)).localeCompare(String(sp_name(b)));
        });
        return list;
    }

    function sp_filtered() {
        return sp_sorted().filter(function (p) {
            var hay = (sp_name(p) + ' ' + p.employee).toLowerCase();
            if (sp.search && hay.indexOf(sp.search) < 0) { return false; }
            if (sp.overdue && !(Number(p.overdue || 0) > 0)) { return false; }
            if (sp.never && !(Number(p.never_contacted || 0) > 0)) { return false; }
            if (flt_get('sp', 'sales') && p.employee !== flt_get('sp', 'sales')) { return false; }
            var sm = SP_STATUS_KEYS[flt_get('sp', 'status')];
            if (sm && !(Number(p[sm] || 0) > 0)) { return false; }
            return true;
        });
    }

    function sp_cell(p, key, extra_class, extra_td) {
        return metric_cell(p, key, extra_class).replace('<td>', '<td class="dms-st-num' + (extra_td ? ' ' + extra_td : '') + '">');
    }

    function sp_row(p) {
        var emp = esc(p.employee);
        return '<tr>' +
            '<td class="dms-st-name"><a href="#" class="dms-salesperson-link" data-employee="' + emp + '">' +
            esc(sp_name(p)) + '</a><div class="dms-employee-code">' + esc(sp_code(p)) + '</div></td>' +
            sp_cell(p, 'assigned', '') +
            sp_cell(p, 'never_contacted', '') +
            sp_cell(p, 'due_today', Number(p.due_today || 0) > 0 ? 'dms-metric-warn' : '') +
            sp_cell(p, 'overdue', Number(p.overdue || 0) > 0 ? 'dms-metric-danger' : '') +
            sp_cell(p, 'contacted', '', 'dms-st-extra') +
            sp_cell(p, 'meetings', '', 'dms-st-extra') +
            sp_cell(p, 'quotations', '', 'dms-st-extra') +
            sp_cell(p, 'negotiation', '', 'dms-st-extra') +
            sp_cell(p, 'won', '', 'dms-st-extra') +
            sp_cell(p, 'lost', '', 'dms-st-extra') +
            '<td class="dms-st-num"><button class="dms-btn dms-st-view" data-employee="' + emp + '" data-metric="assigned">View Projects</button></td>' +
            '</tr>';
    }

    function sp_sum(list, key) {
        return list.reduce(function (t, p) { return t + Number(p[key] || 0); }, 0);
    }

    function sp_total_cell(rows, key, extra) {
        return '<td class="dms-st-num' + (extra ? ' dms-st-extra' : '') + '"><strong>' + num(sp_sum(rows, key)) + '</strong></td>';
    }

    function sp_body_html() {
        var all = sp.people || [];
        var rows = sp_filtered();
        var total_all = sp_sum(all, 'assigned');
        var allocated = Number((sp.summary || {}).allocated || 0);
        var ok = total_all === allocated;
        var note = 'Total assigned across ' + all.length + ' salespeople: ' + num(total_all) + ' of ' + num(allocated) + ' allocated projects' + (ok ? '.' : ' - MISMATCH, please review.');
        var html = '<div class="dms-sector-note"' + (ok ? '' : ' style="color:#dc2626"') + '>' + esc(note) + '</div>';
        if (!rows.length) {
            return html + '<div class="dms-table-card"><div class="dms-empty" style="padding:16px">No salespeople match the current filters.</div></div>';
        }
        html += '<div class="dms-table-card"><div class="dms-table-wrap"><table class="dms-sales-table dms-st-table' + (sp.full ? ' dms-st-full' : '') + '">' +
            '<thead><tr><th>Salesperson</th><th class="dms-st-num">Projects</th><th class="dms-st-num">Never Contacted</th>' +
            '<th class="dms-st-num">Due Today</th><th class="dms-st-num">Overdue</th>' +
            '<th class="dms-st-num dms-st-extra">Contacted</th><th class="dms-st-num dms-st-extra">Meetings</th><th class="dms-st-num dms-st-extra">Quotations</th>' +
            '<th class="dms-st-num dms-st-extra">Negotiation</th><th class="dms-st-num dms-st-extra">Won</th><th class="dms-st-num dms-st-extra">Lost</th>' +
            '<th class="dms-st-num">Action</th></tr></thead><tbody>';
        rows.forEach(function (p) { html += sp_row(p); });
        html += '<tr class="dms-st-total"><td class="dms-st-name"><strong>Total (' + rows.length + ')</strong></td>' +
            sp_total_cell(rows, 'assigned', false) + sp_total_cell(rows, 'never_contacted', false) +
            sp_total_cell(rows, 'due_today', false) + sp_total_cell(rows, 'overdue', false) +
            sp_total_cell(rows, 'contacted', true) + sp_total_cell(rows, 'meetings', true) + sp_total_cell(rows, 'quotations', true) +
            sp_total_cell(rows, 'negotiation', true) + sp_total_cell(rows, 'won', true) + sp_total_cell(rows, 'lost', true) +
            '<td></td></tr>';
        return html + '</tbody></table></div></div>';
    }

    function sp_controls_html() {
        var chip = function (key, label) {
            return '<button class="dms-btn dms-cc-btn' + (sp[key] ? ' dms-cc-on' : '') + '" data-sp-toggle="' + key + '">' + label + '</button>';
        };
        return chip('overdue', 'Overdue only') + chip('never', 'Never contacted') + chip('full', sp.full ? 'Hide pipeline details' : 'Show pipeline details');
    }

    function sp_top_html() {
        var list = sp_sorted().slice(0, 5);
        if (!list.length) { return ''; }
        return '<div class="dms-st-top"><span class="dms-st-top-label">Top allocations:</span>' + list.map(function (p) {
            return '<span class="dms-st-chip">' + esc(sp_name(p)) + ' <strong>' + num(p.assigned) + '</strong></span>';
        }).join('') + '</div>';
    }

    function sp_section(data) {
        sp.people = data.sales_people || [];
        sp.summary = data.summary || {};
        if (kpr && kpr.rows && host && host.querySelector('#dms-kpr-section')) { try { kpr_render(); } catch (e) {} }
        return '<div class="dms-section-heading-row"><div>' +
            '<div class="dms-section-title">Sales Team Performance</div>' +
            '<div class="dms-section-subtitle">Click a number or View Projects to open that salesperson\'s projects.</div></div>' +
            '<div class="dms-kpr-tools"><input id="dms-sp-search" class="dms-kpr-search" type="search" placeholder="Search salesperson..." value="' + esc(sp.search) + '">' +
            '<span id="dms-sp-controls">' + sp_controls_html() + '</span></div></div>' +
            '<div id="dms-sp-flt">' + sp_bar_html() + '</div>' + sp_top_html() +
            '<div id="dms-sp-body">' + sp_body_html() + '</div>';
    }

    function sp_refresh() {
        var fb = host.querySelector('#dms-sp-flt'); if (fb) { fb.innerHTML = sp_bar_html(); }
        var c1 = host.querySelector('#dms-sp-controls');
        if (c1) { c1.innerHTML = sp_controls_html(); }
        var b = host.querySelector('#dms-sp-body');
        if (b) { b.innerHTML = sp_body_html(); }
    }

    function sp_on_input(e) {
        if (e.target && e.target.id === 'dms-sp-search') {
            sp.search = String(e.target.value || '').toLowerCase().trim();
            var b = host.querySelector('#dms-sp-body');
            if (b) { b.innerHTML = sp_body_html(); }
        }
    }

    
    // -----------------------------------------------------
    // DAILY DMS SALES ACTIVITY REPORT (read-only; email preview only, nothing is sent)
    // -----------------------------------------------------
    // DAILY SALES ACTIVITY (read-only report; email preview and export only, nothing is sent)
    // Data: dms_daily_sales_activity_report (follow-up date entered by the salesperson).
    // -----------------------------------------------------
    var da = { date: '', person: '', data: null, people: [], err: '', email: false, seq: 0, tab: 'people', sort: { key: 'activities', dir: -1 }, open: {} };
    var DA_STATUSES = ['Contacted', 'Meeting Scheduled', 'Quotation Submitted', 'Negotiation', 'Won', 'Lost'];

    function da_prev_working(d) {
        var p = String(d || '').split('-');
        if (p.length !== 3) { return d; }
        var dt = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
        for (var i = 0; i < 7; i++) {
            dt = new Date(dt.getTime() - 86400000);
            var wd = dt.getUTCDay();
            if (wd !== 5 && wd !== 6) { break; }
        }
        return dt.toISOString().slice(0, 10);
    }

    function da_load() {
        da.seq = da.seq + 1;
        var my = da.seq;
        frappe.call({
            method: 'dms_daily_sales_activity_report',
            args: { date: da.date, sales_person: da.person },
            silent: true,
            callback: function (r) {
                if (my !== da.seq) { return; }
                da.err = '';
                da.data = r.message || null;
                if (da.data) {
                    da.date = da.data.date;
                    if (!da.person) { da.people = da.data.salespeople || []; }
                }
                da_paint();
            },
            error: function () {
                if (my !== da.seq) { return; }
                da.err = 'The report could not be loaded for your account.';
                da_paint();
            }
        });
    }

    function da_tools_html() {
        var list = (da.people || []).slice().sort(function (a, b) { return String(a.employee_name).localeCompare(String(b.employee_name)); });
        var opts = '<option value="">All Salespeople</option>' + list.map(function (p) {
            return '<option value="' + esc(p.employee) + '"' + (p.employee === da.person ? ' selected' : '') + '>' + esc(p.employee_name) + (p.inactive ? ' (inactive)' : '') + '</option>';
        }).join('');
        return '<label class="dms-da-lbl">Report Date<input type="date" id="dms-da-date" class="dms-kpr-search" value="' + esc(da.date) + '"></label>' +
            '<label class="dms-da-lbl">Salesperson<select id="dms-da-person" class="dms-kpr-search">' + opts + '</select></label>' +
            flt_select('da', 'status', 'Status', da_status_opts(), 'All', undefined, 'dms-da-lbl', 'dms-kpr-search') + flt_select('da', 'project', 'Project', da_project_opts(), 'All', undefined, 'dms-da-lbl', 'dms-kpr-search') + (da_flt_on() ? flt_reset_btn('da') : '') + '<button class="dms-btn" data-da-action="prev">Previous working day</button>' +
            '<button class="dms-btn" data-da-action="today">Today</button>' +
            '<button class="dms-btn dms-cc-btn' + (da.email ? ' dms-cc-on' : '') + '" data-da-action="email">' + (da.email ? 'Hide Email Preview' : 'Preview Email') + '</button>' +
            '<button class="dms-btn" data-da-action="export">Export Report</button>';
    }

    function da_sub_text() {
        if (!da.data) { return 'DMS Sales Management \u00b7 Management reporting'; }
        return 'DMS Sales Management \u00b7 ' + da.data.date_label + ' (' + da.data.weekday + ')' + (da.data.is_working_day ? '' : ' \u00b7 non-working day');
    }

    function da_kpi(label, value, sub, css) {
        return '<div class="dms-da-kpi ' + (css || '') + '"><div class="dms-da-kpi-label">' + esc(label) + '</div>' +
            '<div class="dms-da-kpi-value">' + value + '</div><div class="dms-da-kpi-sub">' + (sub || '&nbsp;') + '</div></div>';
    }

    function da_kpis_html(d) {
        var s = d.summary || {};
        var late = Number(s.late_entries) > 0 ? num(s.late_entries) + ' late ' + (Number(s.late_entries) === 1 ? 'entry' : 'entries') : 'No late entries';
        var inact = Number(s.inactive_salespeople) > 0 ? num(s.inactive_salespeople) + ' inactive flagged separately' : 'Active employees only';
        return '<div class="dms-da-kpis">' +
            da_kpi('Total Activities', num(s.activities), late) +
            da_kpi('Active Salespeople', num(s.active_salespeople) + ' / ' + num(s.total_salespeople), inact) +
            da_kpi('Projects with Activity', num(s.projects_with_activity), 'Unique projects') +
            da_kpi('Overdue Follow-ups', num(s.overdue_followups), 'As of ' + esc(s.overdue_as_of_label || ''), Number(s.overdue_followups) > 0 ? 'dms-da-kpi-red' : '') +
            '</div>';
    }

    function da_status_strip(d) {
        var sc = d.status_counts || {};
        return '<div class="dms-da-strip">' + DA_STATUSES.map(function (k) {
            return '<span class="dms-da-chip' + (Number(sc[k]) > 0 ? ' dms-da-chip-on' : '') + '">' + esc(k) + ' <b>' + num(sc[k]) + '</b></span>';
        }).join('') + '<span class="dms-da-strip-note">Recorded pipeline statuses entered by salespeople; Won does not confirm an ERPNext Sales Order.</span></div>';
    }

    function da_tabs_html(d) {
        var people = (d.salespeople || []).length;
        var acts = (d.activities || []).length;
        var none = d.is_working_day ? (d.no_activity || []).length : 0;
        function t(key, label, n) {
            return '<button type="button" class="dms-fu-tab' + (da.tab === key ? ' dms-fu-on' : '') + '" role="tab" data-da-action="tab" data-v="' + key + '">' + label +
                ' <span class="dms-fu-badge' + (key === 'none' && none > 0 ? ' dms-fu-badge-red' : '') + '">' + n + '</span></button>';
        }
        return '<div class="dms-fu-tabs" role="tablist">' + t('people', 'Salespeople', people) + t('activities', 'Project Activities', acts) + t('none', 'No Activity', none) + '</div>';
    }

    function da_sorted_people(d) {
        var rows = (d.salespeople || []).slice();
        var k = da.sort.key, dir = da.sort.dir;
        rows.sort(function (a, b) {
            var x = a[k], y = b[k];
            var c;
            if (k === 'employee_name') { c = String(x).localeCompare(String(y)); }
            else { c = (Number(x) || 0) - (Number(y) || 0); }
            if (c === 0) { c = (Number(b.overdue) || 0) - (Number(a.overdue) || 0); }
            if (c === 0) { c = String(a.employee_name).localeCompare(String(b.employee_name)); }
            return c * dir;
        });
        return rows;
    }

    function da_th(key, label, cls) {
        var arrow = da.sort.key === key ? (da.sort.dir > 0 ? ' \u25b2' : ' \u25bc') : '';
        return '<th class="dms-da-sortable ' + (cls || '') + '" data-da-action="sort" data-v="' + key + '">' + label + arrow + '</th>';
    }

    function da_people_html(d) {
        var rows = da_sorted_people(d);
        if (!rows.length) { return '<div class="dms-table-card"><div class="dms-empty" style="padding:14px">No salespeople found for this selection.</div></div>'; }
        var html = '<div class="dms-table-card"><div class="dms-table-wrap"><table class="dms-sales-table dms-st-table"><thead><tr>' +
            da_th('employee_name', 'Salesperson') + da_th('projects', 'Projects', 'dms-st-num') + da_th('activities', 'Activities', 'dms-st-num') +
            da_th('overdue', 'Overdue', 'dms-st-num') + da_th('late', 'Late entries', 'dms-st-num') + '<th>Status</th></tr></thead><tbody>';
        rows.forEach(function (p) {
            var st;
            if (p.inactive) { st = '<span class="dms-da-badge dms-da-badge-gray">Inactive employee</span>'; }
            else if (Number(p.activities) > 0) { st = '<span class="dms-da-badge dms-da-badge-green">Active</span>'; }
            else if (d.is_working_day) { st = '<span class="dms-da-none">No Activity Recorded</span>'; }
            else { st = '<span class="dms-employee-code">Non-working day</span>'; }
            html += '<tr' + (p.inactive ? ' class="dms-da-inactive"' : '') + '><td class="dms-st-name">' + esc(p.employee_name) + '<div class="dms-employee-code">' + esc(p.employee) + '</div></td>' +
                '<td class="dms-st-num">' + num(p.projects) + '</td><td class="dms-st-num">' + num(p.activities) + '</td>' +
                '<td class="dms-st-num' + (Number(p.overdue) > 0 ? ' dms-metric-danger' : '') + '">' + num(p.overdue) + '</td>' +
                '<td class="dms-st-num">' + num(p.late) + '</td><td>' + st + '</td></tr>';
        });
        return html + '</tbody></table></div></div><div class="dms-sector-note">Overdue is the live count as of ' + esc((d.summary || {}).overdue_as_of_label || '') + ', not the selected report date. Click a column heading to sort.</div>';
    }

    function da_act_key(a, i) { return a.project + '|' + a.employee + '|' + a.status + '|' + i; }

    function da_acts_html(d) {
        var acts = da_filter_acts(d.activities || []);
        if (!acts.length) { return '<div class="dms-table-card"><div class="dms-empty" style="padding:14px">' + (da_flt_on() ? 'No activities match the selected filters.' : 'No project activity was recorded for this date.') + '</div></div>'; }
        var html = '<div class="dms-table-card"><div class="dms-table-wrap"><table class="dms-sales-table dms-st-table"><thead><tr>' +
            '<th>Project</th><th>Salesperson</th><th>Activity</th><th>Next follow-up</th><th>Entry</th><th></th></tr></thead><tbody>';
        acts.forEach(function (a, i) {
            var key = da_act_key(a, i);
            var open = !!da.open[key];
            html += '<tr><td class="dms-st-name"><a href="#" class="dms-salesperson-link" data-project="' + esc(a.project) + '">' + esc(a.project_code) + '</a>' +
                '<div class="dms-employee-code">' + esc(a.project_name) + '</div></td>' +
                '<td class="dms-st-name">' + esc(a.employee_name) + '</td><td>' + esc(a.status) + '</td>' +
                '<td class="dms-st-name">' + esc(a.next_follow_up_date || '-') + '</td>' +
                '<td class="dms-st-name">' + (a.late ? '<span class="dms-da-late">Late entry ' + esc(a.created_on) + '</span>' : '<span class="dms-employee-code">On time</span>') + '</td>' +
                '<td><button type="button" class="dms-da-more" data-da-action="toggle" data-v="' + esc(key) + '">' + (open ? 'Hide details' : 'Details') + '</button></td></tr>';
            if (open) {
                html += '<tr class="dms-da-detail"><td colspan="6"><div class="dms-da-detail-box"><div class="dms-da-detail-label">Remarks</div>' +
                    '<div class="dms-da-remarks">' + (esc(a.remarks) || '<span class="dms-employee-code">No remarks recorded.</span>') + '</div>' +
                    '<div class="dms-employee-code" style="margin-top:6px">Entered ' + esc(a.created_on || '-') + ' \u00b7 Next follow-up ' + esc(a.next_follow_up_date || 'not set') + '</div></div></td></tr>';
            }
        });
        return html + '</tbody></table></div></div>';
    }

    function da_none_html(d) {
        if (!d.is_working_day) {
            return '<div class="dms-sector-note">' + esc(d.weekday) + ' is outside the Sunday to Thursday working week, so no inactivity is reported for this date.</div>';
        }
        var none = d.no_activity || [];
        var byId = {};
        (d.salespeople || []).forEach(function (p) { byId[p.employee] = p; });
        var html = '';
        if (!none.length) {
            html += '<div class="dms-table-card"><div class="dms-empty" style="padding:14px">Every active salesperson recorded at least one DMS activity.</div></div>';
        } else {
            html += '<div class="dms-table-card"><div class="dms-table-wrap"><table class="dms-sales-table dms-st-table"><thead><tr><th>Salesperson</th><th class="dms-st-num">Projects</th><th class="dms-st-num">Overdue</th><th>Status</th></tr></thead><tbody>';
            none.forEach(function (n) {
                var p = byId[n.employee] || {};
                html += '<tr><td class="dms-st-name">' + esc(n.employee_name) + '<div class="dms-employee-code">' + esc(n.employee) + '</div></td><td class="dms-st-num">' + num(n.projects) + '</td>' +
                    '<td class="dms-st-num' + (Number(p.overdue) > 0 ? ' dms-metric-danger' : '') + '">' + num(p.overdue) + '</td><td><span class="dms-da-none">No Activity Recorded</span></td></tr>';
            });
            html += '</tbody></table></div></div>';
        }
        var inactive = (d.salespeople || []).filter(function (p) { return p.inactive; });
        if (inactive.length) {
            html += '<div class="dms-sector-note"><b>Inactive employees holding projects (not counted above):</b> ' + inactive.map(function (p) { return esc(p.employee_name) + ' (' + num(p.projects) + ' projects)'; }).join(', ') + '. Reallocation may be needed.</div>';
        }
        return html + '<div class="dms-sector-note">This report tracks DMS activity only, not other daily sales responsibilities. "No Activity Recorded" means no DMS follow-up was entered for the date.</div>';
    }

    function da_body_html() {
        if (da.err) { return '<div class="dms-sector-note" style="color:#dc2626">' + esc(da.err) + '</div>'; }
        var d = da.data;
        if (!d) { return '<div class="dms-sector-note">Loading the report...</div>'; }
        var html = da_kpis_html(d) + da_status_strip(d) + da_tabs_html(d);
        if (da.tab === 'activities') { html += da_acts_html(d); }
        else if (da.tab === 'none') { html += da_none_html(d); }
        else { html += da_people_html(d); }
        if (da.email) {
            html += '<div class="dms-da-email"><div class="dms-da-email-head"><strong>Subject:</strong> ' + esc(d.email_subject) +
                '<br><strong>To:</strong> not configured yet &middot; <strong>Status:</strong> preview only - email sending is not enabled.</div>' +
                '<iframe id="dms-da-frame" class="dms-da-frame" sandbox=""></iframe></div>';
        }
        return html;
    }

    function da_paint() {
        var t = host.querySelector('#dms-da-tools');
        if (t) { t.innerHTML = da_tools_html(); }
        var sub = host.querySelector('#dms-da-sub');
        if (sub) { sub.textContent = da_sub_text(); }
        var b = host.querySelector('#dms-da-body');
        if (b) {
            b.innerHTML = da_body_html();
            var fr = host.querySelector('#dms-da-frame');
            if (fr && da.data) { fr.srcdoc = da.data.email_html; }
        }
    }

    function da_section(data) {
        setTimeout(da_load, 0);
        return '<div class="dms-section-heading-row"><div>' +
            '<div class="dms-section-title">Daily DMS Sales Activity Report</div>' +
            '<div class="dms-section-subtitle" id="dms-da-sub">' + esc(da_sub_text()) + '</div></div>' +
            '<div class="dms-kpr-tools" id="dms-da-tools">' + da_tools_html() + '</div></div>' +
            '<div id="dms-da-body">' + da_body_html() + '</div>';
    }

    function da_csv_cell(v) {
        var t = String(v === null || v === undefined ? '' : v);
        return '"' + t.replace(/"/g, '""') + '"';
    }

    function da_export_csv() {
        var d = da.data;
        if (!d) { return; }
        var NL = String.fromCharCode(13) + String.fromCharCode(10);
        var s = d.summary || {};
        var out = [];
        function line(arr) { out.push(arr.map(da_csv_cell).join(',')); }
        line(['Daily DMS Sales Activity Report']); line(['Report date', d.date_label + ' (' + d.weekday + ')']);
        line(['Source', 'DMS Follow Up History (follow-up date entered by the salesperson)']);
        line(['Note', 'Recorded pipeline statuses only; Won does not confirm an ERPNext Sales Order.']); out.push('');
        line(['Summary']); line(['Total activities', s.activities]); line(['Active salespeople', s.active_salespeople + ' / ' + s.total_salespeople]);
        line(['Projects with activity (unique)', s.projects_with_activity]); line(['Overdue follow-ups as of ' + s.overdue_as_of_label, s.overdue_followups]); line(['Late entries', s.late_entries]); out.push('');
        line(['Salespeople']); line(['Salesperson', 'Employee', 'Projects', 'Activities', 'Overdue', 'Late entries', 'Status']);
        (d.salespeople || []).forEach(function (p) {
            line([p.employee_name, p.employee, p.projects, p.activities, p.overdue, p.late, p.inactive ? 'Inactive employee' : (Number(p.activities) > 0 ? 'Active' : (d.is_working_day ? 'No Activity Recorded' : 'Non-working day'))]);
        });
        out.push(''); line(['Project Activities']); line(['Project', 'Project name', 'Salesperson', 'Activity', 'Remarks', 'Next follow-up', 'Entered', 'Late entry']);
        (d.activities || []).forEach(function (a) { line([a.project_code, a.project_name, a.employee_name, a.status, a.remarks, a.next_follow_up_date, a.created_on, a.late ? 'Yes' : 'No']); });
        if (d.is_working_day) {
            out.push(''); line(['No Activity Recorded']); line(['Salesperson', 'Employee', 'Projects']);
            (d.no_activity || []).forEach(function (n) { line([n.employee_name, n.employee, n.projects]); });
        }
        var blob = new Blob(['\ufeff' + out.join(NL)], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Daily_DMS_Sales_Activity_' + d.date + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }

    function da_print_view() {
        var d = da.data;
        if (!d) { return; }
        var w = window.open('', '_blank');
        if (!w) { frappe.msgprint('Your browser blocked the print window. Allow pop-ups for this site and try again.'); return; }
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Daily DMS Sales Activity Report - ' + esc(d.date_label) + '</title></head><body style="margin:24px">' + d.email_html + '</body></html>');
        w.document.close();
        w.focus();
        setTimeout(function () { w.print(); }, 500);
    }

    function da_export_dialog() {
        if (!da.data) { return; }
        var dlg = new frappe.ui.Dialog({
            title: 'Export Report - ' + da.data.date_label,
            fields: [{ fieldtype: 'HTML', fieldname: 'info', options: '<p style="line-height:1.6">Export the report for <b>' + esc(da.data.date_label) + '</b>' + (da.person ? ' (selected salesperson only)' : '') +
                '.</p><p class="text-muted small">The Excel-compatible file opens in Excel with the summary, salespeople, project activities and no-activity tables. The printable view can be saved as PDF from the print dialog.</p>' }],
            primary_action_label: 'Download Excel-compatible CSV',
            primary_action: function () { da_export_csv(); dlg.hide(); }
        });
        if (dlg.add_custom_action) {
            dlg.add_custom_action('Open printable PDF view', function () { dlg.hide(); da_print_view(); });
        }
        dlg.show();
    }

    function da_do(act, v) {
        if (act === 'prev') { da.date = da_prev_working(da.date || (da.data && da.data.date)); da_load(); }
        else if (act === 'today') {
            var dn = new Date();
            da.date = dn.getFullYear() + '-' + ('0' + (dn.getMonth() + 1)).slice(-2) + '-' + ('0' + dn.getDate()).slice(-2);
            da_load();
        }
        else if (act === 'email') { da.email = !da.email; da_paint(); }
        else if (act === 'tab') { da.tab = v; da_paint(); }
        else if (act === 'sort') {
            if (da.sort.key === v) { da.sort.dir = -da.sort.dir; } else { da.sort = { key: v, dir: v === 'employee_name' ? 1 : -1 }; }
            da_paint();
        }
        else if (act === 'toggle') { da.open[v] = !da.open[v]; da_paint(); }
        else if (act === 'export') { da_export_dialog(); }
    }

    function da_on_change(e) {
        if (!e.target) { return; }
        if (e.target.id === 'dms-da-date') {
            if (e.target.value) { da.date = e.target.value; da_load(); }
        } else if (e.target.id === 'dms-da-person') {
            da.person = e.target.value;
            da_load();
        }
    }



    // -----------------------------------------------------
    // DMS PROJECT EXPLORER (read-only): Region > Sector > Company > Projects
    // Combines region project ids, sector tags (dms_project_explorer_sectors)
    // and the contractor / subcontractor project lists. Nothing is written.
    // -----------------------------------------------------
    var ex = { region: '', sector: null, tab: 'contractors', stage: 'all', search: '', all: false, sec: null, secMap: {}, loading: false, err: '', regionMap: {}, hasContr: {} };
    var EX_NONE = '__none__';

    function ex_info(id) { return ex.secMap[id] || [id, [], 0]; }

    function ex_prepare(data) {
        ex.regionMap = {};
        (data.region_cards || []).forEach(function (c) { ex.regionMap[c.region] = c; });
        cc_prepare(data);
        ex.hasContr = {};
        if (cc.data) {
            (cc.data.contractors.companies || []).forEach(function (c) {
                (c.p || []).forEach(function (v) { ex.hasContr[cc.data.project_ids[v >> 3]] = 1; });
            });
        }
        if (!ex.sec && !ex.loading) { ex_load(); }
    }

    function ex_load() {
        ex.loading = true;
        frappe.call({
            method: 'dms_project_explorer_sectors',
            silent: true,
            callback: function (r) {
                ex.loading = false;
                var m = r.message;
                if (!m || !m.projects) { ex.err = 'The sector data could not be loaded.'; ex_paint(); return; }
                ex.sec = m;
                ex.secMap = {};
                m.projects.forEach(function (p) { ex.secMap[p[0]] = p; });
                ex.err = '';
                ex_paint();
            },
            error: function () { ex.loading = false; ex.err = 'The sector data could not be loaded for your account.'; ex_paint(); }
        });
    }

    function ex_region_ids() {
        var c = ex.regionMap[ex.region];
        return c && c.ids ? c.ids : [];
    }

    function ex_sector_cards() {
        var counts = {}, alloc = {}, none = { count: 0, allocated: 0 };
        ex_region_ids().forEach(function (id) {
            var p = ex_info(id);
            if (!p[1].length) { none.count = none.count + 1; none.allocated = none.allocated + p[2]; }
            p[1].forEach(function (i) {
                var n = ex.sec.sectors[i];
                counts[n] = (counts[n] || 0) + 1;
                alloc[n] = (alloc[n] || 0) + p[2];
            });
        });
        var list = Object.keys(counts).map(function (n) { return { sector: n, count: counts[n], allocated: alloc[n] }; });
        list.sort(function (a, b) { return (b.count - a.count) || String(a.sector).localeCompare(String(b.sector)); });
        return { list: list, none: none };
    }

    function ex_matching_ids() {
        var ids = ex_region_ids();
        if (ex.sector === null) { return ids; }
        if (ex.sector === EX_NONE) { return ids.filter(function (id) { return !ex_info(id)[1].length; }); }
        var si = ex.sec.sectors.indexOf(ex.sector);
        return ids.filter(function (id) { return ex_info(id)[1].indexOf(si) >= 0; });
    }

    function ex_alloc_count(ids) {
        var n = 0;
        ids.forEach(function (id) { n = n + ex_info(id)[2]; });
        return n;
    }

    // Stages are stored cumulatively (Awarded also carries Pre-Qualified and Bidding),
    // so a stage filter matches the highest stage reached: 1 Pre-Qualified, 2 Bidding, 4 Awarded.
    function ex_top(fl) { return (fl & 4) ? 4 : ((fl & 2) ? 2 : (fl & 1)); }

    function ex_company_rows(tab, stage, inS) {
        var g = tab === 'subcontractors' ? cc.data.subcontractors : cc.data.contractors;
        var bit = CC_BITS[stage];
        var rows = [];
        (g.companies || []).forEach(function (c, idx) {
            var seen = {}, ids = [];
            (c.p || []).forEach(function (v) {
                var id = cc.data.project_ids[v >> 3];
                if (!inS[id] || seen[id]) { return; }
                var fl = tab === 'contractors' ? (v & 7) : (cc.pflags[v >> 3] || 0);
                if (bit && ex_top(fl) !== bit) { return; }
                seen[id] = 1;
                ids.push(id);
            });
            if (ids.length) { rows.push({ c: c, idx: idx, ids: ids, al: ex_alloc_count(ids) }); }
        });
        rows.sort(function (a, b) { return (b.ids.length - a.ids.length) || String(a.c.name).localeCompare(String(b.c.name)); });
        return rows;
    }

    function ex_set(ids) {
        var s = {};
        ids.forEach(function (id) { s[id] = 1; });
        return s;
    }

    function ex_open(ids) {
        frappe.route_options = { name: ['in', ids.length ? ids : ['-']] };
        frappe.set_route('List', 'DMS Project');
    }

    function ex_card(label, count, allocated, act, val, css, sub) {
        return '<div class="dms-stat-card ' + css + '" data-ex="' + act + '" data-v="' + esc(val) + '" role="button" tabindex="0">' +
            '<div class="dms-stat-label">' + esc(label) + '</div>' +
            '<div class="dms-stat-value">' + num(count) + '</div>' +
            '<div class="dms-stat-sub">' + (sub || (num(allocated) + ' allocated')) + '</div></div>';
    }

    function ex_nav_html() {
        var parts = [];
        if (!ex.region) {
            parts.push('<span class="dms-ex-current">All Regions</span>');
        } else {
            parts.push('<button class="dms-ex-crumb" data-ex="reset">All Regions</button>');
            if (ex.sector === null) {
                parts.push('<span class="dms-ex-current">' + esc(ex.region) + '</span>');
            } else {
                parts.push('<button class="dms-ex-crumb" data-ex="crumb" data-v="region">' + esc(ex.region) + '</button>');
                parts.push('<span class="dms-ex-current">' + esc(ex.sector === EX_NONE ? 'Not Classified' : ex.sector) + '</span>');
                var tl = ex.tab === 'subcontractors' ? 'Subcontractors' : (ex.tab === 'nocontractor' ? 'No Contractor Information' : 'Contractors');
                parts.push('<span class="dms-ex-current">' + tl + '</span>');
            }
        }
        var btns = '';
        if (ex.region) {
            btns = '<button class="dms-btn" data-ex="back">Back</button><button class="dms-btn" data-ex="reset">Reset</button>';
        }
        return '<div class="dms-ex-crumbs">' + parts.join(' <span class="dms-ex-sep">&rsaquo;</span> ') + '</div><div class="dms-ex-btns">' + btns + '</div>';
    }

    function ex_regions_html() {
        var html = '<div class="dms-sector-note">Based on each project City field. Every project is in exactly one region. Select a region to see its sectors.</div><div class="dms-card-grid dms-region-grid">';
        ['Riyadh', 'Eastern', 'Western', 'Other', 'Unclassified'].forEach(function (name) {
            var c = ex.regionMap[name];
            if (!c) { return; }
            var sub = name === 'Unclassified' ? 'Requires location verification' : '';
            html += ex_card(name, c.count, c.allocated, 'region', name, name === 'Unclassified' ? 'dms-gray' : 'dms-blue', sub || (num(c.allocated) + ' allocated'));
        });
        return html + '</div>';
    }

    function ex_sectors_html() {
        var c = ex.regionMap[ex.region];
        var ids = ex_region_ids();
        if (!c || !ids.length) { return '<div class="dms-sector-note">No project list is available for this region.</div>'; }
        var sc = ex_sector_cards();
        var html = '<div class="dms-ex-summary"><span><strong>' + esc(ex.region) + '</strong>: ' + num(ids.length) + ' projects, ' + num(c.allocated) + ' allocated.</span>' +
            '<button class="dms-btn" data-ex="openall">Open all ' + num(ids.length) + ' projects</button></div>' +
            '<div class="dms-sector-note">Sectors found in this region. A project can have several sectors, so counts overlap. Select a sector to see its contractors and subcontractors.</div>' +
            '<div class="dms-card-grid dms-ex-sector-grid">';
        sc.list.forEach(function (s) { html += ex_card(s.sector, s.count, s.allocated, 'sector', s.sector, 'dms-blue'); });
        html += ex_card('Not Classified', sc.none.count, sc.none.allocated, 'sector', EX_NONE, 'dms-gray');
        return html + '</div>';
    }

    function ex_ctl_html(counts) {
        var html = '<div class="dms-cc-controls">' +
            '<button class="dms-btn dms-cc-btn' + (ex.tab === 'contractors' ? ' dms-cc-on' : '') + '" data-ex="tab" data-v="contractors">Contractors (' + counts.contractors + ')</button>' +
            '<button class="dms-btn dms-cc-btn' + (ex.tab === 'subcontractors' ? ' dms-cc-on' : '') + '" data-ex="tab" data-v="subcontractors">Subcontractors (' + counts.subcontractors + ')</button>' +
            '<button class="dms-btn dms-cc-btn' + (ex.tab === 'nocontractor' ? ' dms-cc-on' : '') + '" data-ex="tab" data-v="nocontractor">No Contractor Information (' + counts.nocontractor + ')</button>';
        if (ex.tab !== 'nocontractor') {
            html += '<span class="dms-cc-gap"></span>';
            CC_STAGES.forEach(function (s) {
                var lbl = (s[0] === 'all' && ex.tab === 'subcontractors') ? 'All Subcontractors' : s[1];
                html += '<button class="dms-btn dms-cc-btn' + (ex.stage === s[0] ? ' dms-cc-on' : '') + '" data-ex="stage" data-v="' + s[0] + '">' + lbl + '</button>';
            });
            html += '<input id="dms-ex-search" class="dms-kpr-search" type="search" placeholder="Search company names..." value="' + esc(ex.search) + '">';
        }
        return html + '</div>';
    }

    function ex_company_card(r) {
        var n = r.ids.length;
        var tip = r.c.name + ' - ' + n + ' projects (' + r.al + ' allocated, ' + (n - r.al) + ' unallocated) in this region and sector';
        var ents = (r.c.entities || []).slice().sort(function (a, b) { return b.projects - a.projects; });
        var ent = '';
        if (ents.length > 1) {
            ent = '<div class="dms-cc-entities">' + ents.length + ' entities</div>';
            tip += '\nEntities: ' + ents.map(function (e) { return e.name; }).join(', ');
        }
        return '<div class="dms-stat-card dms-blue dms-cc-card" data-ex="company" data-v="' + esc(ex.tab + ':' + r.idx) + '" role="button" tabindex="0" title="' + esc(tip) + '">' +
            '<div class="dms-stat-label dms-cc-name">' + esc(r.c.name) + '</div>' +
            '<div class="dms-stat-value dms-cc-value">' + num(n) + '</div>' +
            '<div class="dms-stat-sub dms-cc-sub">' + num(r.al) + ' allocated</div>' + ent + '</div>';
    }

    function ex_list_html() {
        var ids = ex_matching_ids();
        var inS = ex_set(ids);
        if (ex.tab === 'nocontractor') {
            var miss = ids.filter(function (id) { return !ex.hasContr[id]; });
            if (!miss.length) { return '<div class="dms-sector-note">Every matching project has at least one contractor record.</div>'; }
            return '<div class="dms-ex-summary"><span><strong>' + num(miss.length) + '</strong> matching projects have no contractor record (' + num(ex_alloc_count(miss)) + ' allocated). Some of them may still list subcontractors.</span>' +
                '<button class="dms-btn" data-ex="opennone">Open these ' + num(miss.length) + ' projects</button></div>';
        }
        var rows = ex_company_rows(ex.tab, ex.stage, inS);
        var q = String(ex.search || '').trim().toLowerCase();
        if (q) {
            rows = rows.filter(function (r) {
                if (String(r.c.name || '').toLowerCase().indexOf(q) >= 0) { return true; }
                return (r.c.entities || []).some(function (e) { return String(e.name || '').toLowerCase().indexOf(q) >= 0; });
            });
        }
        if (!rows.length) { return '<div class="dms-sector-note">No companies match the selected region, sector and filters.</div>'; }
        var limit = ex.all ? rows.length : 14;
        var shown = rows.slice(0, limit);
        var html = '<div class="dms-sector-note">' + rows.length + ' ' + (ex.tab === 'contractors' ? 'contractor' : 'subcontractor') + (rows.length === 1 ? '' : 's') +
            ' in this region and sector' + (q ? ' matching the search' : '') + '. Counts show unique projects. Select a card to open only those projects.' +
            ' Stage filters show the highest stage reached: Pre-Qualified (not yet bidding), Bidding (not yet awarded) or Awarded.' + (ex.tab === 'subcontractors' ? ' Subcontractors take the highest stage among the contractors on the same project.' : '') + '</div>' +
            '<div class="dms-card-grid dms-cc-grid">' + shown.map(ex_company_card).join('') + '</div>';
        if (rows.length > shown.length) {
            html += '<div class="dms-ex-more"><button class="dms-btn" data-ex="more">Show all ' + rows.length + ' companies</button></div>';
        }
        return html;
    }

    function ex_level2_html() {
        var ids = ex_matching_ids();
        var inS = ex_set(ids);
        var counts = {
            contractors: ex_company_rows('contractors', ex.stage, inS).length,
            subcontractors: ex_company_rows('subcontractors', ex.stage, inS).length,
            nocontractor: ids.filter(function (id) { return !ex.hasContr[id]; }).length
        };
        var label = ex.sector === EX_NONE ? 'Not Classified' : ex.sector;
        return '<div class="dms-ex-summary"><span><strong>' + esc(ex.region) + ' &rsaquo; ' + esc(label) + '</strong>: ' + num(ids.length) + ' projects, ' + num(ex_alloc_count(ids)) + ' allocated.</span>' +
            '<button class="dms-btn" data-ex="openall">Open all ' + num(ids.length) + ' projects</button></div>' +
            ex_ctl_html(counts) + '<div id="dms-ex-list">' + ex_list_html() + '</div>';
    }

    function ex_body_html() {
        if (ex.err) { return '<div class="dms-sector-note" style="color:#dc2626">' + esc(ex.err) + '</div>'; }
        if (!ex.region) { return ex_regions_html(); }
        if (!ex.sec) { return '<div class="dms-sector-note">Loading sector data...</div>'; }
        if (ex.sector === null) { return ex_sectors_html(); }
        if (!cc.data) { return '<div class="dms-sector-note">Company data is not available.</div>'; }
        return ex_level2_html();
    }

    function ex_paint() {
        var n = host.querySelector('#dms-ex-nav');
        if (n) { n.innerHTML = ex_nav_html(); }
        var b = host.querySelector('#dms-ex-body');
        if (b) { b.innerHTML = ex_body_html(); }
    }

    function ex_section(data) {
        ex_prepare(data);
        setTimeout(ex_paint, 0);
        return '<div class="dms-section-heading-row"><div>' +
            '<div class="dms-section-title">DMS Project Explorer</div>' +
            '<div class="dms-section-subtitle">Region, then sector, then contractors and subcontractors, then the matching DMS Projects. Read-only; company names use display aliases only.</div></div></div>' +
            '<div class="dms-ex-nav" id="dms-ex-nav">' + ex_nav_html() + '</div>' +
            '<div id="dms-ex-body">' + ex_body_html() + '</div>';
    }

    function ex_reset_filters() { ex.tab = 'contractors'; ex.stage = 'all'; ex.search = ''; ex.all = false; }

    function ex_act(act, v) {
        if (act === 'region') { ex.region = v; ex.sector = null; ex_reset_filters(); ex_paint(); }
        else if (act === 'sector') { ex.sector = v; ex_reset_filters(); ex_paint(); }
        else if (act === 'tab') { ex.tab = v; ex.search = ''; ex.all = false; ex_paint(); }
        else if (act === 'stage') { ex.stage = v; ex.all = false; ex_paint(); }
        else if (act === 'more') { ex.all = true; var l = host.querySelector('#dms-ex-list'); if (l) { l.innerHTML = ex_list_html(); } }
        else if (act === 'back') {
            if (ex.sector !== null) { ex.sector = null; ex_reset_filters(); }
            else { ex.region = ''; }
            ex_paint();
        }
        else if (act === 'reset') { ex.region = ''; ex.sector = null; ex_reset_filters(); ex_paint(); }
        else if (act === 'crumb') { ex.sector = null; ex_reset_filters(); ex_paint(); }
        else if (act === 'openall') { ex_open(ex_matching_ids()); }
        else if (act === 'opennone') { ex_open(ex_matching_ids().filter(function (id) { return !ex.hasContr[id]; })); }
        else if (act === 'company') {
            var parts = String(v).split(':');
            var inS = ex_set(ex_matching_ids());
            var rows = ex_company_rows(parts[0], ex.stage, inS);
            var hit = null;
            rows.forEach(function (r) { if (String(r.idx) === parts[1]) { hit = r; } });
            if (hit) { ex_open(hit.ids); }
        }
    }

    function ex_on_input(e) {
        if (!e.target || e.target.id !== 'dms-ex-search') { return; }
        ex.search = e.target.value;
        ex.all = false;
        var l = host.querySelector('#dms-ex-list');
        if (l) { l.innerHTML = ex_list_html(); }
    }

    function ex_on_key(e) {
        if (e.key !== 'Enter' && e.key !== ' ') { return; }
        var t = e.target;
        if (!t || !t.closest || t.tagName === 'INPUT' || t.tagName === 'BUTTON') { return; }
        var el = t.closest('[data-ex]');
        if (el) { e.preventDefault(); ex_act(el.getAttribute('data-ex'), el.getAttribute('data-v') || ''); }
    }

    // -----------------------------------------------------
    // FOLLOW-UP MANAGEMENT (tabs): Recent Activity / Upcoming / Overdue
    // Presentation only. Rows, counts and links come from the same data as before.
    // -----------------------------------------------------
    var fu_tab = 'recent';

    function fu_panel(key, subtitle, count_text, headers, rows_html) {
        return '<div class="dms-fu-panel" data-fu-panel="' + key + '"' + (fu_tab === key ? '' : ' hidden') + '>' +
            '<div class="dms-fu-head"><div class="dms-section-subtitle">' + subtitle + '</div><div class="dms-table-count">' + count_text + '</div></div>' +
            '<div class="dms-table-card"><div class="dms-table-wrap"><table class="dms-sales-table"><thead><tr>' +
            headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
            '</tr></thead><tbody>' + rows_html + '</tbody></table></div></div></div>';
    }

    function fu_tab_btn(key, label, badge) {
        return '<button type="button" class="dms-fu-tab' + (fu_tab === key ? ' dms-fu-on' : '') + '" role="tab" aria-selected="' + (fu_tab === key ? 'true' : 'false') + '" data-fu-tab="' + key + '">' + label + (badge || '') + '</button>';
    }

    function fu_section(recent_n, recent_rows, overdue_n, overdue_total, overdue_rows, upcoming_n, upcoming_rows) {
        var badge = '<span class="dms-fu-badge' + (num(overdue_total) > 0 ? ' dms-fu-badge-red' : '') + '">' + overdue_total + '</span>';
        return '<div class="dms-section-heading-row"><div>' +
            '<div class="dms-section-title">Follow-Up Management</div>' +
            '<div class="dms-section-subtitle">Sales activities, scheduled follow-ups and overdue actions</div></div></div>' +
            fu_bar_html() + '<div class="dms-fu-tabs" role="tablist">' +
            fu_tab_btn('recent', 'Recent Activity') + fu_tab_btn('upcoming', 'Upcoming Follow-Ups') + fu_tab_btn('overdue', 'Overdue', badge) + '</div>' +
            fu_panel('recent', 'Latest sales activities recorded against DMS projects', 'Latest ' + recent_n + ' (up to 20)',
                ['Date', 'Project', 'Sales Person', 'Status', 'Next Follow-Up', 'Remarks'], recent_rows) +
            fu_panel('upcoming', 'Scheduled today and during the next 7 days', upcoming_n + ' scheduled',
                ['Project', 'Sales Person', 'Status', 'Next Follow-Up', 'Last Follow-Up'], upcoming_rows) +
            fu_panel('overdue', 'Follow-ups that have passed their scheduled date', 'Showing ' + overdue_n + ' of ' + num(overdue_total),
                ['Project', 'Sales Person', 'Status', 'Due Date', 'Days Overdue', 'Last Follow-Up'], overdue_rows);
    }

    function fu_set(key) {
        fu_tab = key;
        Array.prototype.forEach.call(host.querySelectorAll('[data-fu-tab]'), function (b) {
            var on = b.getAttribute('data-fu-tab') === key;
            b.classList.toggle('dms-fu-on', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        Array.prototype.forEach.call(host.querySelectorAll('[data-fu-panel]'), function (p) {
            if (p.getAttribute('data-fu-panel') === key) { p.removeAttribute('hidden'); } else { p.setAttribute('hidden', ''); }
        });
    }

    function fu_build(data) {
        var s = data.summary || {};
        var recent_followups = flt_fu_rows('recent', data.recent_followups || []);
        var overdue_followups = flt_fu_rows('overdue', data.overdue_followups || []);
        var upcoming_followups = flt_fu_rows('upcoming', data.upcoming_followups || []);
        var recent_rows = '';
        if (!recent_followups.length) {
            recent_rows = '<tr><td colspan="6" class="dms-empty">No follow-up activity found.</td></tr>';
        } else {
            recent_followups.forEach(function (row) {
                recent_rows += '<tr>' +
                    '<td>' + format_date(row.follow_up_date) + '</td>' +
                    '<td>' + project_link(row) + '</td>' +
                    '<td>' + person_name(row) + '</td>' +
                    '<td>' + status_badge(row.follow_up_status) + '</td>' +
                    '<td>' + format_date(row.next_follow_up_date) + '</td>' +
                    '<td class="dms-remarks-cell">' + esc(row.remarks || '—') + '</td></tr>';
            });
        }

        var overdue_rows = '';
        if (!overdue_followups.length) {
            overdue_rows = '<tr><td colspan="6" class="dms-empty">No overdue follow-ups.</td></tr>';
        } else {
            overdue_followups.forEach(function (row) {
                overdue_rows += '<tr>' +
                    '<td>' + project_link(row) + '</td>' +
                    '<td>' + person_name(row) + '</td>' +
                    '<td>' + status_badge(row.follow_up_status) + '</td>' +
                    '<td>' + format_date(row.next_follow_up_date) + '</td>' +
                    '<td class="dms-danger-text">' + num(row.days_overdue) + '</td>' +
                    '<td>' + format_date(row.last_follow_up_date) + '</td></tr>';
            });
        }

        var upcoming_rows = '';
        if (!upcoming_followups.length) {
            upcoming_rows = '<tr><td colspan="5" class="dms-empty">No follow-ups scheduled for the next 7 days.</td></tr>';
        } else {
            upcoming_followups.forEach(function (row) {
                upcoming_rows += '<tr>' +
                    '<td>' + project_link(row) + '</td>' +
                    '<td>' + person_name(row) + '</td>' +
                    '<td>' + status_badge(row.follow_up_status) + '</td>' +
                    '<td>' + format_date(row.next_follow_up_date) + '</td>' +
                    '<td>' + format_date(row.last_follow_up_date) + '</td></tr>';
            });
        }

        var tables_html = '<div id="dms-fu-wrap">' + fu_section(
            recent_followups.length, recent_rows,
            overdue_followups.length, (flt_active('fu') ? overdue_followups.length : num(s.overdue)), overdue_rows,
            upcoming_followups.length, upcoming_rows) + '</div>';
        return tables_html;
    }

    function render(data) {
        fu_data = data;
        var s = data.summary || {};
        var people = data.sales_people || [];
        var recent_followups = data.recent_followups || [];
        var overdue_followups = data.overdue_followups || [];
        var upcoming_followups = data.upcoming_followups || [];
        var rows = '';

        if (!people.length) {
            rows = '<tr><td colspan="11" class="dms-empty">No allocated projects found.</td></tr>';
        } else {
            people.forEach(function (p) {
                rows += '<tr>' +
                    '<td><a href="#" class="dms-salesperson-link" data-employee="' + esc(p.employee) + '">' +
                    esc(clean_name(p.employee_name || p.employee)) + '</a>' +
                    '<div class="dms-employee-code">' + esc(p.employee) + '</div></td>' +
                    metric_cell(p, 'assigned', '') +
                    metric_cell(p, 'never_contacted', '') +
                    metric_cell(p, 'contacted', '') +
                    metric_cell(p, 'meetings', '') +
                    metric_cell(p, 'quotations', '') +
                    metric_cell(p, 'negotiation', '') +
                    metric_cell(p, 'due_today', '') +
                    metric_cell(p, 'overdue', num(p.overdue) > 0 ? 'dms-metric-danger' : '') +
                    metric_cell(p, 'won', '') +
                    metric_cell(p, 'lost', '') +
                    '</tr>';
            });
        }

        var tables_html = fu_build(data);

        var mismatch = num(s.allocation_mismatch) > 0;

        host.innerHTML =
            '<div class="dms-dashboard-header"><div>' +
            '<div class="dms-dashboard-title">DMS Sales Management</div>' +
            '<div class="dms-dashboard-subtitle">Project allocation, sales follow-up and performance overview' +
            ' &middot; updated ' + esc(new Date().toLocaleTimeString()) + '</div></div>' +
            '<button class="dms-btn" data-refresh="1">Refresh</button></div>' +

            '<div class="dms-section-title">Project Allocation</div>' +
            '<div class="dms-card-grid">' +
            card('Total Projects', s.total_projects, 'dms-blue', 'total') +
            card('Allocated', s.allocated, 'dms-green', 'allocated') +
            card('Unallocated', s.unallocated, 'dms-orange', 'unallocated') +
            card('Allocation Mismatch', s.allocation_mismatch, mismatch ? 'dms-red' : 'dms-gray', 'mismatch') +
            '</div>' +

            ex_section(data) +

            '<div class="dms-section-title">Sales Pipeline</div>' +
            '<div class="dms-card-grid">' +
            card('Never Contacted', s.never_contacted, 'dms-gray', 'never_contacted') +
            card('Contacted', s.contacted, 'dms-blue', 'contacted') +
            card('Meetings', s.meeting_scheduled, 'dms-purple', 'meeting') +
            card('Quotations', s.quotation_submitted, 'dms-purple', 'quotation') +
            card('Negotiation', s.negotiation, 'dms-orange', 'negotiation') +
            card('Won', s.won, 'dms-green', 'won') +
            card('Lost', s.lost, 'dms-red', 'lost') +
            '</div>' +

            '<div class="dms-section-title">Follow-Up Monitoring</div>' +
            '<div class="dms-followup-grid">' +
            card('Due Today', s.due_today, 'dms-orange', 'due_today') +
            card('Overdue', s.overdue, num(s.overdue) > 0 ? 'dms-red' : 'dms-green', 'overdue') +
            '</div>' +

            sp_section(data) +
            da_section(data) +

            '<div class="dms-section-title">Action Required</div>' +
            '<div class="dms-action-grid">' +
            action_card('Overdue Follow-Ups', 'Projects requiring immediate follow-up', s.overdue,
                num(s.overdue) > 0 ? 'dms-action-red' : 'dms-action-green', 'overdue') +
            action_card('Due Today', 'Follow-ups scheduled for today', s.due_today, 'dms-action-orange', 'due_today') +
            action_card('Never Contacted', 'Allocated projects with no sales activity', s.never_contacted,
                'dms-action-blue', 'never_contacted') +
            action_card('Allocation Data Mismatch', 'Allocation status without a salesperson', s.allocation_mismatch,
                mismatch ? 'dms-action-red' : 'dms-action-green', 'mismatch') +
            '</div>' +
            tables_html;
    }

    // ---------------------------------------------------------
    // Key Personnel Contact Requests: manager review & share
    // List: dms_manager_contact_requests. Actions: dms_share_key_personnel_contact.
    // The section hides itself if the user is not authorised for these APIs.
    // ---------------------------------------------------------
    
    // ---------------------------------------------------------
    // Section filter bars: Status / Salesperson / Project / date range / Reset
    // Client-side filtering of the rows each section already loads. No data is changed.
    // ---------------------------------------------------------
    var flt = { kpr: {}, fu: {}, sp: {}, da: {} };
    function flt_get(k, f) { return (flt[k] && flt[k][f]) || ''; }
    function flt_active(k) {
        var o = flt[k] || {}, any = false;
        Object.keys(o).forEach(function (f) { if (o[f]) { any = true; } });
        return any;
    }
    function flt_select(k, f, label, opts, all_label, cur, lc, sc) {
        var c = (cur === undefined) ? flt_get(k, f) : cur;
        var h = '<label' + (lc ? ' class="' + lc + '"' : '') + '>' + esc(label) + '<select' + (sc ? ' class="' + sc + '"' : '') + ' data-flt="' + k + '" data-f="' + f + '"><option value="">' + esc(all_label || 'All') + '</option>';
        opts.forEach(function (o) {
            var v = (o && typeof o === 'object') ? o.v : o;
            var l = (o && typeof o === 'object') ? o.l : o;
            h += '<option value="' + esc(v) + '"' + (String(v) === String(c) ? ' selected' : '') + '>' + esc(l) + '</option>';
        });
        return h + '</select></label>';
    }
    function flt_date(k, f, label) {
        return '<label>' + esc(label) + '<input type="date" data-flt="' + k + '" data-f="' + f + '" value="' + esc(flt_get(k, f)) + '"></label>';
    }
    function flt_reset_btn(k) { return '<button type="button" class="dms-btn" data-flt-reset="' + k + '">Reset</button>'; }
    function flt_uniq(rows, vfn, lfn) {
        var seen = {}, out = [];
        rows.forEach(function (r) { var v = vfn(r); if (v && !seen[v]) { seen[v] = 1; out.push({ v: v, l: lfn(r) }); } });
        out.sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); });
        return out;
    }
    function flt_in_range(d, from, to) {
        if (!from && !to) { return true; }
        if (!d) { return false; }
        d = String(d).slice(0, 10);
        if (from && d < from) { return false; }
        if (to && d > to) { return false; }
        return true;
    }
    function flt_proj_label(r) {
        return (r.project_code || r.project || r.dms_project) + (r.project_name ? ' - ' + String(r.project_name).slice(0, 40) : '');
    }
    function flt_apply(k) {
        if (k === 'kpr') { kpr_render(); }
        else if (k === 'fu') { fu_repaint(); }
        else if (k === 'sp') { sp_refresh(); }
        else if (k === 'da') { da_paint(); }
    }
    function flt_on_change(e) {
        var el = e.target;
        if (!el || !el.getAttribute) { return; }
        var k = el.getAttribute('data-flt');
        if (!k) { return; }
        var f = el.getAttribute('data-f');
        if (!flt[k]) { flt[k] = {}; }
        if (k === 'kpr' && f === 'status') { kpr.filter = el.value === '' ? 'all' : el.value; }
        else { flt[k][f] = el.value || ''; }
        flt_apply(k);
    }
    function flt_on_click(e) {
        var b = (e.target && e.target.closest) ? e.target.closest('[data-flt-reset]') : null;
        if (!b) { return; }
        e.preventDefault();
        var k = b.getAttribute('data-flt-reset');
        flt[k] = {};
        if (k === 'kpr') { kpr.filter = 'open'; }
        flt_apply(k);
    }

    // ---- Key Personnel Contact Requests ----
    function kpr_match_extra(r) {
        var f = flt.kpr || {};
        if (f.sales && r.sales_person !== f.sales) { return false; }
        if (f.project && r.dms_project !== f.project) { return false; }
        if ((f.from || f.to) && !flt_in_range(r.request_date, f.from, f.to)) { return false; }
        return true;
    }
    function kpr_counts() {
        var f = flt.kpr || {};
        if (!f.sales && !f.project && !f.from && !f.to) { return kpr.counts || {}; }
        var c = { 'Pending': 0, 'In Progress': 0, 'Shared': 0, 'Rejected': 0, total: 0 };
        (kpr.rows || []).forEach(function (r) {
            if (!kpr_match_extra(r)) { return; }
            c.total = c.total + 1;
            if (c[r.status] !== undefined) { c[r.status] = c[r.status] + 1; }
        });
        return c;
    }
    function kpr_bar_html() {
        var rows = kpr.rows || [];
        var sps = flt_uniq([].concat((sp.people || []).map(function (p) { return { sales_person: p.employee, _sp_label: sp_name(p) }; }), rows), function (r) { return r.sales_person; }, function (r) { return r._sp_label || clean_name(r.sales_person); });
        var prj = flt_uniq(rows, function (r) { return r.dms_project; }, function (r) { return flt_proj_label(r); });
        var statuses = [{ v: 'open', l: 'Open (Pending + In Progress)' }, { v: 'Pending', l: 'Pending' }, { v: 'In Progress', l: 'In Progress' }, { v: 'Shared', l: 'Shared' }, { v: 'Rejected', l: 'Rejected' }];
        return '<div class="dms-flt">' +
            flt_select('kpr', 'status', 'Status', statuses, 'All statuses', kpr.filter === 'all' ? '' : kpr.filter) +
            flt_select('kpr', 'sales', 'Salesperson', sps, 'All') +
            flt_select('kpr', 'project', 'Project', prj, 'All') +
            flt_date('kpr', 'from', 'Requested from') + flt_date('kpr', 'to', 'to') +
            flt_reset_btn('kpr') + '</div>';
    }

    // ---- Follow-Up Management ----
    var fu_data = null;
    function fu_bar_html() {
        var d = fu_data || {};
        var rows = [].concat(d.recent_followups || [], d.overdue_followups || [], d.upcoming_followups || []);
        var statuses = ['Not Contacted', 'Contacted', 'Meeting Scheduled', 'Quotation Submitted', 'Negotiation', 'Won', 'Lost'];
        var sps = flt_uniq(rows, function (r) { return r.sales_person; }, function (r) { return clean_name(r.sales_person_name || r.sales_person); });
        var prj = flt_uniq(rows, function (r) { return r.project; }, function (r) { return flt_proj_label(r); });
        return '<div class="dms-flt">' +
            flt_select('fu', 'status', 'Status', statuses, 'All') +
            flt_select('fu', 'sales', 'Salesperson', sps, 'All') +
            flt_select('fu', 'project', 'Project', prj, 'All') +
            flt_date('fu', 'from', 'Date from') + flt_date('fu', 'to', 'to') +
            flt_reset_btn('fu') +
            '<span class="dms-flt-note">Date filters the activity date on Recent Activity and the next follow-up date on Upcoming / Overdue.</span></div>';
    }
    function flt_fu_rows(kind, rows) {
        var f = flt.fu || {};
        if (!f.status && !f.sales && !f.project && !f.from && !f.to) { return rows; }
        return rows.filter(function (r) {
            if (f.status && (r.follow_up_status || 'Not Contacted') !== f.status) { return false; }
            if (f.sales && r.sales_person !== f.sales) { return false; }
            if (f.project && r.project !== f.project) { return false; }
            if (f.from || f.to) {
                var d = (kind === 'recent') ? r.follow_up_date : r.next_follow_up_date;
                if (!flt_in_range(d, f.from, f.to)) { return false; }
            }
            return true;
        });
    }
    function fu_repaint() {
        var w = host.querySelector('#dms-fu-wrap');
        if (w && fu_data) { w.outerHTML = fu_build(fu_data); }
    }

    // ---- Sales Team Performance ----
    var SP_STATUS_KEYS = { 'Not Contacted': 'never_contacted', 'Contacted': 'contacted', 'Meeting Scheduled': 'meetings', 'Quotation Submitted': 'quotations', 'Negotiation': 'negotiation', 'Won': 'won', 'Lost': 'lost', 'Due today': 'due_today', 'Overdue': 'overdue' };
    function sp_bar_html() {
        var sps = (sp.people || []).map(function (p) { return { v: p.employee, l: sp_name(p) }; });
        sps.sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); });
        return '<div class="dms-flt">' +
            flt_select('sp', 'status', 'Status', Object.keys(SP_STATUS_KEYS), 'All') +
            flt_select('sp', 'sales', 'Salesperson', sps, 'All') +
            flt_reset_btn('sp') +
            '<span class="dms-flt-note">Status shows only salespeople with at least one project in that status.</span></div>';
    }

    // ---- Daily Sales Activity (date and salesperson controls already exist above) ----
    var DA_STATUSES = ['Contacted', 'Meeting Scheduled', 'Quotation Submitted', 'Negotiation', 'Won', 'Lost'];
    function da_status_opts() {
        var seen = {}, out = DA_STATUSES.slice();
        out.forEach(function (x) { seen[x] = 1; });
        ((da.data && da.data.activities) || []).forEach(function (a) { if (a.status && !seen[a.status]) { seen[a.status] = 1; out.push(a.status); } });
        return out;
    }
    function da_project_opts() {
        return flt_uniq((da.data && da.data.activities) || [], function (a) { return a.project; }, function (a) { return flt_proj_label(a); });
    }
    function da_flt_on() { var f = flt.da || {}; return !!(f.status || f.project); }
    function da_filter_acts(acts) {
        var f = flt.da || {};
        if (!f.status && !f.project) { return acts; }
        return acts.filter(function (a) {
            if (f.status && a.status !== f.status) { return false; }
            if (f.project && a.project !== f.project) { return false; }
            return true;
        });
    }

    
    var kpr = { rows: [], counts: {}, filter: 'open', search: '', truncated: false };

    function kpr_badge(status) {
        var css = 'dms-badge-gray';
        if (status === 'Pending') { css = 'dms-badge-orange'; }
        else if (status === 'In Progress') { css = 'dms-badge-blue'; }
        else if (status === 'Shared') { css = 'dms-badge-green'; }
        else if (status === 'Rejected') { css = 'dms-badge-red'; }
        return '<span class="dms-status-badge ' + css + '">' + esc(status) + '</span>';
    }

    function kpr_visible() {
        var q = kpr.search;
        return kpr.rows.filter(function (r) {
            var ok = kpr.filter === 'open'
                ? (r.status === 'Pending' || r.status === 'In Progress')
                : (kpr.filter === 'all' ? true : r.status === kpr.filter);
            if (!ok) { return false; }
            if (!kpr_match_extra(r)) { return false; }
            if (!q) { return true; }
            var hay = [r.name, r.project_code, r.project_name, r.sales_person, r.required_designation, r.request_reason]
                .join(' ').toLowerCase();
            return hay.indexOf(q) !== -1;
        });
    }

    function kpr_rows_html() {
        var rows = kpr_visible();
        if (!rows.length) {
            return '<tr><td colspan="8" class="dms-empty">No requests in this view.</td></tr>';
        }
        return rows.map(function (r) {
            var reason = String(r.request_reason || '');
            var short_reason = reason.length > 110 ? reason.slice(0, 110) + '...' : reason;
            var action = (r.status === 'Pending' || r.status === 'In Progress')
                ? '<button class="dms-btn dms-kpr-btn" data-kpr-review="' + esc(r.name) + '">' +
                  (r.status === 'Pending' ? 'Review / Share' : 'Share Contact') + '</button>'
                : '<button class="dms-btn dms-kpr-btn" data-kpr-open="' + esc(r.name) + '">Open' + (r.status === 'Shared' && r.contact_count > 1 ? ' (' + r.contact_count + ' contacts)' : '') + '</button>';
            return '<tr>' +
                '<td>' + esc(r.name) + '</td>' +
                '<td>' + project_link({ project: r.dms_project, project_code: r.project_code, project_name: r.project_name }) + '</td>' +
                '<td>' + esc(clean_name(r.sales_person)) + '</td>' +
                '<td>' + esc(r.required_designation) + '</td>' +
                '<td class="dms-remarks-cell" title="' + esc(reason) + '">' + esc(short_reason) + '</td>' +
                '<td>' + format_date(r.request_date) + '</td>' +
                '<td>' + kpr_badge(r.status) + '</td>' +
                '<td>' + action + '</td></tr>';
        }).join('');
    }

    function kpr_count_text() {
        var n = kpr_visible().length;
        return n + ' shown' + (kpr.truncated ? ' (latest ' + kpr.rows.length + ' requests loaded)' : '');
    }

    function kpr_section() {
        var sec = host.querySelector('#dms-kpr-section');
        if (!sec) {
            sec = document.createElement('div');
            sec.id = 'dms-kpr-section';
            if (host.children.length > 1) { host.insertBefore(sec, host.children[1]); }
            else { host.appendChild(sec); }
        }
        return sec;
    }

    function kpr_remove() {
        var sec = host.querySelector('#dms-kpr-section');
        if (sec) { sec.parentNode.removeChild(sec); }
    }

    function kpr_render() {
        var sec = kpr_section();
        var c = kpr_counts();
        function stat(label, key, css) {
            var active = kpr.filter === key ? ' dms-kpr-active' : '';
            return '<div class="dms-stat-card ' + css + active + '" data-kpr-filter="' + key + '" role="button" tabindex="0">' +
                '<div class="dms-stat-label">' + label + '</div>' +
                '<div class="dms-stat-value">' + num(c[key]) + '</div></div>';
        }
        sec.innerHTML =
            '<div class="dms-section-heading-row"><div>' +
            '<div class="dms-section-title">Key Personnel Contact Requests</div>' +
            '<div class="dms-section-subtitle">Salesperson requests for client contacts. Review, then share the details.</div></div>' +
            '<div class="dms-kpr-tools"><input id="dms-kpr-search" class="dms-kpr-search" type="search" ' +
            'placeholder="Search requests..." value="' + esc(kpr.search) + '">' +
            '<button class="dms-btn" data-kpr-refresh="1">Refresh</button></div></div>' +
            kpr_bar_html() +
            '<div class="dms-card-grid">' +
            stat('Pending', 'Pending', 'dms-orange') +
            stat('In Progress', 'In Progress', 'dms-blue') +
            stat('Shared Contacts', 'Shared', 'dms-green') +
            stat('Rejected', 'Rejected', 'dms-gray') +
            '</div>' +
            '<div class="dms-table-count" id="dms-kpr-count" style="margin-top:10px">' + esc(kpr_count_text()) +
            (kpr.filter === 'open' ? ' &middot; showing Pending and In Progress' : (kpr.filter === 'all' ? ' &middot; all statuses' : ' &middot; filtered: ' + esc(kpr.filter))) + '</div>' +
            '<div class="dms-table-card"><div class="dms-table-wrap"><table class="dms-sales-table"><thead><tr>' +
            '<th>Request</th><th>Project</th><th>Sales Person</th><th>Designation Needed</th><th>Reason</th>' +
            '<th>Date</th><th>Status</th><th>Action</th></tr></thead>' +
            '<tbody id="dms-kpr-body">' + kpr_rows_html() + '</tbody></table></div></div>';
    }

    function kpr_load() {
        frappe.call({
            method: 'dms_manager_contact_requests',
            silent: true,
            callback: function (r) {
                if (!r.message || !r.message.counts) { kpr_remove(); return; }
                kpr.counts = r.message.counts;
                kpr.rows = r.message.requests || [];
                kpr.truncated = !!r.message.truncated;
                kpr_render();
            },
            error: function () { kpr_remove(); }
        });
    }

    function kpr_find(name) {
        for (var i = 0; i < kpr.rows.length; i++) { if (kpr.rows[i].name === name) { return kpr.rows[i]; } }
        return null;
    }

    function kpr_process(row, action, values, dialog) {
        var args = { request_id: row.name, action: action };
        if (action === 'Shared') {
            args.contacts = JSON.stringify(values.contacts || []);
        }
        frappe.call({
            method: 'dms_share_key_personnel_contact',
            args: args,
            freeze: true,
            freeze_message: __('Updating request...'),
            callback: function (r) {
                if (r.message && r.message.success) {
                    dialog.hide();
                    var n = r.message.contacts_shared;
                    var msg = row.name + ': ' + action + (action === 'Shared' && n ? ' (' + n + (n === 1 ? ' contact' : ' contacts') + ')' : '');
                    frappe.show_alert({ message: msg, indicator: 'green' }, 5);
                    kpr_load();
                }
            }
        });
    }

    // Multi-contact sharing popup: one request can carry several contacts.
    var MC_MAX = 10;

    function mc_blank(row) {
        var d = String(row.required_designation || '').trim();
        return { contact_name: '', mobile_number: '', designation: (d && d.toLowerCase() !== 'any') ? d : '', email_address: '', company: '' };
    }

    function mc_field(i, key, label, value, required, type) {
        return '<div class="dms-mc-field"><label>' + label + (required ? ' <span class="dms-mc-req">*</span>' : '') + '</label>' +
            '<input type="' + (type || 'text') + '" class="form-control input-sm" data-mc-i="' + i + '" data-mc-key="' + key + '" value="' + esc(value) + '" maxlength="140"></div>';
    }

    function mc_render(wrap, list) {
        var html = '<style>.dms-mc-card{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:10px;background:#f8fafc}' +
            '.dms-mc-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:600;color:#17365d}' +
            '.dms-mc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}' +
            '.dms-mc-field label{font-size:11px;color:#64748b;margin-bottom:2px;display:block}' +
            '.dms-mc-req{color:#dc2626}.dms-mc-remove{color:#dc2626;cursor:pointer;font-size:12px;font-weight:400}' +
            '@media (max-width:600px){.dms-mc-grid{grid-template-columns:1fr}}</style>';
        list.forEach(function (c, i) {
            html += '<div class="dms-mc-card"><div class="dms-mc-head"><span>Contact ' + (i + 1) + '</span>' +
                (list.length > 1 ? '<a class="dms-mc-remove" data-mc-remove="' + i + '">Remove</a>' : '') + '</div><div class="dms-mc-grid">' +
                mc_field(i, 'contact_name', 'Contact Name', c.contact_name, true) +
                mc_field(i, 'mobile_number', 'Mobile Number', c.mobile_number, false, 'tel') +
                mc_field(i, 'designation', 'Designation', c.designation, false) +
                mc_field(i, 'email_address', 'Email Address', c.email_address, false, 'email') +
                mc_field(i, 'company', 'Company', c.company, false) + '</div></div>';
        });
        html += '<button type="button" class="btn btn-default btn-sm" data-mc-add="1"' + (list.length >= MC_MAX ? ' disabled' : '') + '>+ Add Another Contact</button>' +
            (list.length >= MC_MAX ? ' <span class="text-muted small">Maximum ' + MC_MAX + ' contacts per request.</span>' : '');
        wrap.innerHTML = html;
    }

    function mc_validate(list) {
        var seen = [];
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            var lab = 'Contact ' + (i + 1) + ': ';
            var name = String(c.contact_name || '').trim();
            var mobile = String(c.mobile_number || '').trim();
            var email = String(c.email_address || '').trim();
            if (!name) { return lab + 'Contact Name is required.'; }
            if (!mobile && !email) { return lab + 'enter a mobile number or an email address.'; }
            if (email && (email.indexOf('@') < 1 || email.split('@').pop().indexOf('.') < 0 || /\s/.test(email))) { return lab + 'the email address is not valid.'; }
            var key = name.toLowerCase() + '|' + mobile + '|' + email.toLowerCase();
            if (seen.indexOf(key) >= 0) { return lab + 'this contact is a duplicate of an earlier one.'; }
            seen.push(key);
        }
        return '';
    }

    function kpr_open_dialog(row) {
        var summary = '<div style="line-height:1.7">' +
            '<b>Project:</b> ' + esc(row.project_code) + ' - ' + esc(row.project_name) + '<br>' +
            '<b>Requested by:</b> ' + esc(clean_name(row.sales_person)) + '<br>' +
            '<b>Designation needed:</b> ' + esc(row.required_designation) + '<br>' +
            '<b>Reason:</b> ' + esc(row.request_reason) + '<br>' +
            '<b>Status:</b> ' + esc(row.status) + '</div>';
        var list = [mc_blank(row)];
        var d = new frappe.ui.Dialog({
            title: 'Contact Request ' + row.name,
            size: 'large',
            fields: [
                { fieldtype: 'HTML', fieldname: 'summary', options: summary },
                { fieldtype: 'Section Break', label: 'Contact details to share' },
                { fieldtype: 'HTML', fieldname: 'contacts_area', options: '<div class="dms-mc-wrap"></div>' }
            ],
            primary_action_label: 'Share Contact',
            primary_action: function () {
                mc_sync();
                var err = mc_validate(list);
                if (err) { frappe.msgprint(err); return; }
                kpr_process(row, 'Shared', { contacts: list }, d);
            }
        });
        var wrap = null;
        function mc_sync() {
            if (!wrap) { return; }
            Array.prototype.forEach.call(wrap.querySelectorAll('[data-mc-key]'), function (inp) {
                var i = parseInt(inp.getAttribute('data-mc-i'), 10);
                if (list[i]) { list[i][inp.getAttribute('data-mc-key')] = inp.value; }
            });
        }
        function mc_label() {
            d.set_primary_action(list.length > 1 ? 'Share ' + list.length + ' Contacts' : 'Share Contact', d.primary_action);
        }
        function mc_redraw() {
            mc_render(wrap, list);
            mc_label();
        }
        wrap = d.fields_dict.contacts_area.$wrapper.find('.dms-mc-wrap')[0];
        mc_redraw();
        wrap.addEventListener('click', function (e) {
            var rm = e.target.closest ? e.target.closest('[data-mc-remove]') : null;
            if (rm) { mc_sync(); list.splice(parseInt(rm.getAttribute('data-mc-remove'), 10), 1); mc_redraw(); return; }
            var add = e.target.closest ? e.target.closest('[data-mc-add]') : null;
            if (add && list.length < MC_MAX) { mc_sync(); list.push(mc_blank(row)); mc_redraw(); }
        });
        if (d.add_custom_action) {
            if (row.status === 'Pending') {
                d.add_custom_action('Mark In Progress', function () {
                    kpr_process(row, 'In Progress', {}, d);
                });
            }
            d.add_custom_action('Reject', function () {
                frappe.confirm('Reject request ' + row.name + '? This cannot be undone.', function () {
                    kpr_process(row, 'Rejected', {}, d);
                });
            }, 'btn-danger');
        }
        d.show();
    }

    function kpr_handle_click(e, t) {
        var review = t.closest('[data-kpr-review]');
        if (review) {
            e.preventDefault();
            var row = kpr_find(review.getAttribute('data-kpr-review'));
            if (row) { kpr_open_dialog(row); }
            return true;
        }
        var opener = t.closest('[data-kpr-open]');
        if (opener) {
            e.preventDefault();
            frappe.set_route('Form', 'DMS Key Personnel Request', opener.getAttribute('data-kpr-open'));
            return true;
        }
        var f = t.closest('[data-kpr-filter]');
        if (f) {
            e.preventDefault();
            var key = f.getAttribute('data-kpr-filter');
            kpr.filter = (kpr.filter === key) ? 'open' : key;
            kpr_render();
            return true;
        }
        if (t.closest('[data-kpr-refresh]')) { e.preventDefault(); kpr_load(); return true; }
        return false;
    }

    function kpr_on_input(e) {
        if (e.target && e.target.id === 'dms-kpr-search') {
            kpr.search = String(e.target.value || '').toLowerCase().trim();
            var body = host.querySelector('#dms-kpr-body');
            if (body) { body.innerHTML = kpr_rows_html(); }
            var cnt = host.querySelector('#dms-kpr-count');
            if (cnt) { cnt.textContent = kpr_count_text(); }
        }
    }

    function load() {
        host.innerHTML = '<div class="dms-loading">Loading DMS Sales Dashboard...</div>';
        frappe.call({
            method: 'dms_sales_dashboard_data',
            callback: function (r) {
                if (!r.message || r.message.status !== 'success') {
                    host.innerHTML = '<div class="dms-error">Unable to load DMS Sales Dashboard.</div>';
                    return;
                }
                render(r.message);
                kpr_load();
            },
            error: function () {
                host.innerHTML = '<div class="dms-error">Unable to load DMS Sales Dashboard. ' +
                    'You may not have permission to view it.</div>';
            }
        });
    }

    // One delegated handler (works whether or not the block is in a shadow root)
    function on_activate(e) {
        var t = e.target;
        if (!t || !t.closest) { return; }
        if (kpr_handle_click(e, t)) { return; }
        var refresh = t.closest('[data-refresh]');
        if (refresh) { e.preventDefault(); load(); return; }
        var metric_el = t.closest('[data-metric]');
        if (metric_el) {
            e.preventDefault();
            var metric_map = { assigned: 'assigned', never_contacted: 'never_contacted', contacted: 'contacted',
                meetings: 'meeting', quotations: 'quotation', negotiation: 'negotiation',
                due_today: 'due_today', overdue: 'overdue', won: 'won', lost: 'lost' };
            var metric_type = metric_map[metric_el.getAttribute('data-metric')];
            if (metric_type) { drill(metric_type, metric_el.getAttribute('data-employee')); }
            return;
        }
        var plink = t.closest('[data-project]');
        if (plink) {
            e.preventDefault();
            var pname = plink.getAttribute('data-project');
            if (pname) { frappe.set_route('Form', 'DMS Project', pname); }
            return;
        }
        var person = t.closest('[data-employee]');
        if (person) { e.preventDefault(); drill('salesperson', person.getAttribute('data-employee')); return; }
        var sp_tog = t.closest('[data-sp-toggle]');
        if (sp_tog) { e.preventDefault(); var sp_key = sp_tog.getAttribute('data-sp-toggle'); sp[sp_key] = !sp[sp_key]; sp_refresh(); return; }
        var fu_el = t.closest('[data-fu-tab]');
        if (fu_el) { e.preventDefault(); fu_set(fu_el.getAttribute('data-fu-tab')); return; }
        var ex_el = t.closest('[data-ex]');
        if (ex_el) { e.preventDefault(); ex_act(ex_el.getAttribute('data-ex'), ex_el.getAttribute('data-v') || ''); return; }
        var da_el = t.closest('[data-da-action]');
        if (da_el) { e.preventDefault(); da_do(da_el.getAttribute('data-da-action'), da_el.getAttribute('data-v') || ''); return; }
        var cc_tab_el = t.closest('[data-cc-tab]');
        if (cc_tab_el) { e.preventDefault(); cc.tab = cc_tab_el.getAttribute('data-cc-tab'); cc_refresh(); return; }
        var cc_stage_el = t.closest('[data-cc-stage]');
        if (cc_stage_el) { e.preventDefault(); cc.stage = cc_stage_el.getAttribute('data-cc-stage'); cc_refresh(); return; }
        var cc_card_el = t.closest('[data-cc-company]');
        if (cc_card_el) { e.preventDefault(); cc_drill(parseInt(cc_card_el.getAttribute('data-cc-company'), 10)); return; }
        var reg_card = t.closest('[data-region-filter]');
        if (reg_card) { e.preventDefault(); region_drill(reg_card.getAttribute('data-region-filter')); return; }
        var sec_card = t.closest('[data-sector-filter]');
        if (sec_card) { e.preventDefault(); sector_drill(sec_card.getAttribute('data-sector-filter')); return; }
        var tile = t.closest('[data-drill]');
        if (tile) { e.preventDefault(); drill(tile.getAttribute('data-drill')); }
    }
    host.addEventListener('click', on_activate);
    host.addEventListener('input', kpr_on_input);
    host.addEventListener('input', cc_on_input);
    host.addEventListener('input', sp_on_input);
    host.addEventListener('input', ex_on_input);
    host.addEventListener('keydown', ex_on_key);
    host.addEventListener('change', da_on_change); host.addEventListener('change', flt_on_change); host.addEventListener('click', flt_on_click);
    // Keep typing inside the search boxes: stop Frappe's page-level shortcuts from stealing focus.
    ['keydown', 'keypress', 'keyup'].forEach(function (evt) {
        host.addEventListener(evt, function (e) {
            var tg = e.target;
            if (tg && tg.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) { e.stopPropagation(); }
        });
    });
    host.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            if (e.target && e.target.closest && e.target.closest('[data-drill], [data-metric], [data-kpr-filter], [data-sector-filter], [data-region-filter], [data-cc-company], [data-cc-tab], [data-cc-stage], [data-sp-toggle]')) { on_activate(e); }
        }
    });

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
  var AR = {"A project can have several sectors, so counts overlap. Click a card to open its projects.": "قد يكون للمشروع أكثر من قطاع، لذا تتداخل الأعداد. انقر على البطاقة لفتح مشاريعها.", "Action": "الإجراء", "Action Required": "إجراء مطلوب", "Active": "نشط", "Active Salespeople": "مندوبو المبيعات النشطون", "Active employees only": "الموظفون النشطون فقط", "Active salespeople": "مندوبو المبيعات النشطون", "Activities": "الأنشطة", "Activity": "النشاط", "All": "الكل", "All Contractors": "كل المقاولين", "All Regions": "كل المناطق", "All Salespeople": "كل مندوبي المبيعات", "All Subcontractors": "كل مقاولي الباطن", "All statuses": "كل الحالات", "Allocated": "مخصص", "Allocated projects with no sales activity": "مشاريع مخصصة بلا نشاط مبيعات", "Allocation Data Mismatch": "عدم تطابق بيانات التخصيص", "Allocation Mismatch": "عدم تطابق التخصيص", "Allocation status without a salesperson": "حالة تخصيص بلا مندوب مبيعات", "As of": "حتى تاريخ", "Awarded": "تمت الترسية", "Back": "رجوع", "Based on each project City field. Every project is in exactly one region. Select a region to see its sectors.": "حسب حقل المدينة في كل مشروع. كل مشروع في منطقة واحدة فقط. اختر منطقة لعرض قطاعاتها.", "Bidding": "مرحلة العطاءات", "Code": "الرمز", "Company": "الشركة", "Company data is not available.": "بيانات الشركة غير متاحة.", "Contact": "جهة الاتصال", "Contact Name": "اسم جهة الاتصال", "Contact Name is required.": "اسم جهة الاتصال مطلوب.", "Contact Request": "طلب جهة اتصال", "Contact details to share": "بيانات الاتصال المراد مشاركتها", "Contacted": "تم التواصل", "Contacts": "جهات الاتصال", "Contractor Records": "سجلات المقاولين", "Contractors": "المقاولون", "Count": "العدد", "DMS Follow Up History (follow-up date entered by the salesperson)": "سجل متابعات DMS (تاريخ المتابعة الذي أدخله المندوب)", "DMS Project": "مشروع DMS", "DMS Project Explorer": "مستكشف مشاريع DMS", "DMS Sales Management": "إدارة مبيعات DMS", "Daily": "يومي", "Daily DMS Sales Activity Report": "تقرير نشاط مبيعات DMS اليومي", "Daily DMS Sales Activity Report -": "تقرير نشاط مبيعات DMS اليومي -", "Date": "التاريخ", "Date filters the activity date on Recent Activity and the next follow-up date on Upcoming / Overdue.": "يصفّي التاريخ تاريخ النشاط في «النشاط الأخير» وتاريخ المتابعة التالية في «القادم / المتأخر».", "Date from": "التاريخ من", "Days": "الأيام", "Days Overdue": "أيام التأخير", "Designation": "المسمى الوظيفي", "Designation Needed": "المسمى المطلوب", "Designation needed:": "المسمى المطلوب:", "Details": "التفاصيل", "Display Names (after aliases)": "أسماء العرض (بعد الأسماء البديلة)", "Download Excel-compatible CSV": "تنزيل ملف CSV متوافق مع Excel", "Due Date": "تاريخ الاستحقاق", "Due Today": "مستحق اليوم", "Due today": "مستحق اليوم", "Eastern": "الشرقية", "Email": "البريد الإلكتروني", "Email Address": "عنوان البريد الإلكتروني", "Employee": "الموظف", "Enter": "أدخل", "Entered": "مُدخل", "Entities:": "الجهات:", "Entry": "القيد", "Every active salesperson recorded at least one DMS activity.": "سجّل كل مندوب نشط نشاطًا واحدًا على الأقل في DMS.", "Every matching project has at least one contractor record.": "لكل مشروع مطابق سجل مقاول واحد على الأقل.", "Exact Names": "الأسماء الدقيقة", "Export Report": "تصدير التقرير", "Export Report -": "تصدير التقرير -", "Export the report for": "تصدير التقرير لـ", "Follow-Up Management": "إدارة المتابعات", "Follow-Up Monitoring": "مراقبة المتابعات", "Follow-ups scheduled for today": "متابعات مجدولة لليوم", "Follow-ups that have passed their scheduled date": "متابعات تجاوزت موعدها المجدول", "Hide Email Preview": "إخفاء معاينة البريد", "Hide details": "إخفاء التفاصيل", "Hide pipeline details": "إخفاء تفاصيل خط المبيعات", "In Progress": "قيد التنفيذ", "Inactive employee": "موظف غير نشط", "Inactive employees holding projects (not counted above):": "موظفون غير نشطين لديهم مشاريع (غير محتسبين أعلاه):", "Key Personnel Contact Requests": "طلبات جهات الاتصال الرئيسية", "Last Follow-Up": "آخر متابعة", "Late entries": "إدخالات متأخرة", "Late entry": "إدخال متأخر", "Latest": "الأحدث", "Latest sales activities recorded against DMS projects": "آخر أنشطة المبيعات المسجلة على مشاريع DMS", "Loading": "تحميل", "Loading DMS Sales Dashboard...": "جارٍ تحميل لوحة مبيعات DMS...", "Loading projects...": "جارٍ تحميل المشاريع...", "Loading sector data...": "جارٍ تحميل بيانات القطاعات...", "Loading the report...": "جارٍ تحميل التقرير...", "Lost": "خسارة", "Mark In Progress": "تعيين «قيد التنفيذ»", "Maximum": "الحد الأقصى", "Meeting Scheduled": "تم تحديد اجتماع", "Meetings": "الاجتماعات", "Mobile": "الجوال", "Mobile Number": "رقم الجوال", "Name": "الاسم", "Negotiation": "التفاوض", "Never Contacted": "لم يتم التواصل", "Never contacted": "لم يتم التواصل", "Next Follow-Up": "المتابعة التالية", "Next follow-up": "المتابعة التالية", "No": "لا", "No Activity": "لا يوجد نشاط", "No Activity Recorded": "لم يُسجل نشاط", "No Contractor Information": "لا توجد بيانات مقاولين", "No activities match the selected filters.": "لا توجد أنشطة مطابقة للتصفية المحددة.", "No allocated projects found.": "لم يتم العثور على مشاريع مخصصة.", "No companies match the selected region, sector and filters.": "لا توجد شركات مطابقة للمنطقة والقطاع والتصفية المحددة.", "No companies match.": "لا توجد شركات مطابقة.", "No data": "لا توجد بيانات", "No follow-up activity found.": "لم يتم العثور على نشاط متابعة.", "No follow-ups scheduled for the next 7 days.": "لا توجد متابعات مجدولة للأيام السبعة القادمة.", "No late entries": "لا توجد إدخالات متأخرة", "No overdue follow-ups.": "لا توجد متابعات متأخرة.", "No project activity was recorded for this date.": "لم يُسجل نشاط مشاريع لهذا التاريخ.", "No project list is available for this region.": "لا توجد قائمة مشاريع لهذه المنطقة.", "No remarks recorded.": "لا توجد ملاحظات مسجلة.", "No requests in this view.": "لا توجد طلبات في هذا العرض.", "No salespeople found for this selection.": "لم يتم العثور على مندوبين لهذا الاختيار.", "No salespeople match the current filters.": "لا يوجد مندوبون مطابقون للتصفية الحالية.", "Non-working day": "يوم عطلة", "Not Classified": "غير مصنف", "Not Contacted": "لم يتم التواصل", "Note": "ملاحظة", "On time": "في الموعد", "Open (Pending + In Progress)": "مفتوح (معلق + قيد التنفيذ)", "Open Project": "فتح المشروع", "Open all": "فتح الكل", "Open printable PDF view": "فتح عرض PDF للطباعة", "Open these": "فتح هذه", "Other": "أخرى", "Overdue": "متأخر", "Overdue Follow-Ups": "متابعات متأخرة", "Overdue Follow-ups": "متابعات متأخرة", "Overdue follow-ups as of": "المتابعات المتأخرة حتى", "Overdue is the live count as of": "المتأخر هو العدد الفعلي حتى", "Overdue only": "المتأخر فقط", "Pending": "معلق", "Pre-Qualified": "مؤهل مسبقًا", "Preview Email": "معاينة البريد", "Previous working day": "يوم العمل السابق", "Project": "المشروع", "Project Activities": "أنشطة المشروع", "Project Allocation": "تخصيص المشاريع", "Project allocation, sales follow-up and performance overview": "تخصيص المشاريع ومتابعة المبيعات ونظرة عامة على الأداء", "Project name": "اسم المشروع", "Project:": "المشروع:", "Projects": "المشاريع", "Projects Covered": "المشاريع المغطاة", "Projects by Contracting Company": "المشاريع حسب شركة المقاولات", "Projects by Region": "المشاريع حسب المنطقة", "Projects by Sector": "المشاريع حسب القطاع", "Projects requiring immediate follow-up": "مشاريع تتطلب متابعة فورية", "Projects with Activity": "مشاريع بها نشاط", "Projects with activity (unique)": "مشاريع بها نشاط (فريدة)", "Quotation": "عرض السعر", "Quotation Submitted": "تم تقديم عرض السعر", "Quotations": "عروض الأسعار", "Reallocated": "أعيد تخصيصه", "Reason": "السبب", "Reason:": "السبب:", "Recent Activity": "النشاط الأخير", "Record": "السجل", "Records": "السجلات", "Refresh": "تحديث", "Region": "المنطقة", "Regions": "المناطق", "Reject": "رفض", "Reject request": "رفض الطلب", "Rejected": "مرفوض", "Remarks": "الملاحظات", "Report date": "تاريخ التقرير", "Request": "الطلب", "Requested": "مطلوب", "Requested by:": "مقدم الطلب:", "Requested from": "مطلوب من", "Required": "مطلوب", "Requires location verification": "يتطلب التحقق من الموقع", "Reset": "إعادة تعيين", "Rev": "مراجعة", "Review / Share": "مراجعة / مشاركة", "Riyadh": "الرياض", "Sales": "المبيعات", "Sales Person": "مندوب المبيعات", "Sales Pipeline": "خط المبيعات", "Sales Team Performance": "أداء فريق المبيعات", "Sales activities, scheduled follow-ups and overdue actions": "أنشطة المبيعات والمتابعات المجدولة والإجراءات المتأخرة", "Salespeople": "مندوبو المبيعات", "Salesperson": "مندوب المبيعات", "Salesperson requests for client contacts. Review, then share the details.": "طلبات المندوبين لجهات اتصال العملاء. راجعها ثم شارك البيانات.", "Scheduled": "مجدول", "Scheduled today and during the next 7 days": "مجدول اليوم وخلال الأيام السبعة القادمة", "Search company names...": "ابحث في أسماء الشركات...", "Search contractor names...": "ابحث في أسماء المقاولين...", "Search salesperson...": "ابحث عن مندوب...", "Share": "مشاركة", "Share Contact": "مشاركة جهة الاتصال", "Shared": "تمت المشاركة", "Shared Contacts": "جهات الاتصال المشاركة", "Show all": "عرض الكل", "Show pipeline details": "عرض تفاصيل خط المبيعات", "Showing": "عرض", "Source": "المصدر", "Stage filters show the highest stage reached: Pre-Qualified (not yet bidding), Bidding (not yet awarded) or Awarded.": "تعرض تصفية المرحلة أعلى مرحلة تم بلوغها: مؤهل مسبقًا (لم يدخل العطاءات بعد)، عطاءات (لم تتم الترسية بعد) أو تمت الترسية.", "Stage filters use the stages of the contractors on the same project, because subcontractors have no stage of their own.": "تستخدم تصفية المرحلة مراحل المقاولين في نفس المشروع، لأن مقاولي الباطن ليس لهم مرحلة خاصة.", "Status": "الحالة", "Status shows only salespeople with at least one project in that status.": "تعرض الحالة فقط المندوبين الذين لديهم مشروع واحد على الأقل بتلك الحالة.", "Status:": "الحالة:", "Stored as:": "مخزن باسم:", "Subcontractor Records": "سجلات مقاولي الباطن", "Subcontractors": "مقاولو الباطن", "Subcontractors take the highest stage among the contractors on the same project.": "يأخذ مقاولو الباطن أعلى مرحلة بين المقاولين في نفس المشروع.", "Subject:": "الموضوع:", "Submitted": "معتمد", "Summary": "الملخص", "The report could not be loaded for your account.": "تعذر تحميل التقرير لحسابك.", "The sector data could not be loaded for your account.": "تعذر تحميل بيانات القطاعات لحسابك.", "The sector data could not be loaded.": "تعذر تحميل بيانات القطاعات.", "To": "إلى", "To:": "إلى:", "Today": "اليوم", "Top 12": "أعلى 12", "Top allocations:": "أعلى التخصيصات:", "Total": "الإجمالي", "Total (": "الإجمالي (", "Total Activities": "إجمالي الأنشطة", "Total Projects": "إجمالي المشاريع", "Total activities": "إجمالي الأنشطة", "Total assigned across": "إجمالي المُسند عبر", "Unable to load DMS Sales Dashboard.": "تعذر تحميل لوحة مبيعات DMS.", "Unallocated": "غير مخصص", "Unclassified": "غير مصنف", "Unique projects": "مشاريع فريدة", "Upcoming": "القادم", "Upcoming Follow-Ups": "المتابعات القادمة", "Updating request...": "جارٍ تحديث الطلب...", "View Projects": "عرض المشاريع", "Western": "الغربية", "Won": "فوز", "Yes": "نعم", "You may not have permission to view it.": "قد لا تكون لديك صلاحية لعرضه.", "Your browser blocked the print window. Allow pop-ups for this site and try again.": "منع المتصفح نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع وحاول مجددًا.", "to": "إلى"}, SEL = "#dms-sales-dashboard", SLOT = ".dms-dashboard-header", KEY = 'dms-lang', ATTRS = ['placeholder', 'title', 'aria-label'];
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
