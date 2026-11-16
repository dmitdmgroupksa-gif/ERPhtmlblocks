(function () {
    var root = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    var host = root.querySelector('#dfd-dashboard');
    if (!host) { return; }

    var API = 'dm_delivery_forklift_dashboard';
    var PAGE = 50;
    var C = { trips: '#1e78d6', delivered: '#0a3d7a', load: '#0f8b8d', unload: '#7fcfcf', ops: '#0f8b8d' };
    var st = {
        tab: 'overview', preset: 'monthly',
        f: { from_date: '', to_date: '', company: '', warehouse: '', driver: '', vehicle: '', trip_type: '', forklift: '' },
        opts: null, optsError: null, data: null, error: null, loading: false, seq: 0, lastOk: null,
        dt: { page: 0, q: '', flag: '' }, fl: { page: 0, q: '', flag: '' }, showAll: {}
    };

    // ---------------- helpers ----------------
    function esc(v) {
        return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function today() { return frappe.datetime.now_date(); }
    function addDays(d, n) { return frappe.datetime.add_days(d, n); }
    function monthStart(d) { return d.slice(0, 8) + '01'; }
    var NA = '<span class="na" title="Unavailable: you do not have verified read access to the field(s) this figure needs">Unavailable</span>';
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function n(v, dec) {
        if (!isNum(v)) { return NA; }
        return esc(v.toLocaleString('en-US', { maximumFractionDigits: dec === undefined ? 0 : dec, minimumFractionDigits: dec || 0 }));
    }
    var CUR = (frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.currency) || '';
    function amt(v) { return isNum(v) ? esc(CUR ? CUR + ' ' : '') + n(v, 2) : NA; }
    function dur(min) {
        if (!isNum(min)) { return NA; }
        var h = Math.floor(min / 60), m = Math.round(min - h * 60);
        if (m === 60) { h += 1; m = 0; }
        return esc((h ? h + 'h ' : '') + m + 'm');
    }
    function fdate(d) {
        if (!d) { return '&mdash;'; }
        try { return esc(frappe.datetime.str_to_user(d)); } catch (e) { return esc(d); }
    }
    function slug(dt) { return dt.toLowerCase().replace(/ /g, '-'); }
    function rec(dt, name) {
        if (!name) { return '&mdash;'; }
        return '<a class="rec" href="/app/' + slug(dt) + '/' + encodeURIComponent(name) + '" data-dt="' + esc(dt) + '" data-name="' + esc(name) + '">' + esc(name) + '</a>';
    }
    function cmpDesc(k) { return function (a, b) { return (b[k] || 0) - (a[k] || 0); }; }
    function objToList(o, key) {
        if (!o) { return null; }
        return Object.keys(o).map(function (k) { var r = { value: o[k] }; r[key] = k; return r; });
    }
    function sel(q) { return host.querySelector(q); }
    function selAll(q) { return host.querySelectorAll(q); }

    // ---------------- skeleton ----------------
    host.innerHTML =
        '<div class="dfd">' +
        '<div class="dfd-head"><div><h1>Delivery &amp; Forklift Dashboard</h1>' +
        '<div class="sub">DM Group &middot; Delivery Trips and ForkLift activity from live ERP records &middot; Asia/Riyadh</div></div>' +
        '<div class="meta"><button class="dfd-btn ghost" data-act="refresh">&#8635; Refresh</button>' +
        '<div class="dfd-last" style="margin-top:6px">Not loaded yet</div></div></div>' +
        '<div class="dfd-filters"></div>' +
        '<div class="dfd-main" style="position:relative">' +
        '<div class="dfd-state"></div>' +
        '<div class="dfd-cards"></div>' +
        '<div class="dfd-tabs">' +
        '<button class="dfd-tab on" data-tab="overview">Overview</button>' +
        '<button class="dfd-tab" data-tab="delivery">Delivery Trips</button>' +
        '<button class="dfd-tab" data-tab="forklift">Forklift Activity</button></div>' +
        '<div class="dfd-body"></div>' +
        '<div class="dfd-loading" style="display:none"><span><span class="dfd-spin"></span>Loading live ERP data&hellip;</span></div>' +
        '</div></div>';

    // ---------------- filters ----------------
    function setPreset(p) {
        st.preset = p;
        var t = today();
        if (p === 'daily') { st.f.from_date = t; st.f.to_date = t; }
        else if (p === 'weekly') { st.f.from_date = addDays(t, -6); st.f.to_date = t; }
        else if (p === 'monthly') { st.f.from_date = monthStart(t); st.f.to_date = t; }
    }

    function optionList(items, cur, allLabel) {
        var h = '<option value="">' + esc(allLabel) + '</option>';
        (items || []).forEach(function (it) {
            var v = typeof it === 'string' ? it : it.value, l = typeof it === 'string' ? it : it.label;
            h += '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
        });
        return h;
    }

    function renderFilters() {
        var o = st.opts || {};
        var whs = (o.warehouses || []).filter(function (w) { return !st.f.company || w.company === st.f.company; })
            .map(function (w) { return w.name; }).sort();
        if (st.f.warehouse && whs.indexOf(st.f.warehouse) < 0) { st.f.warehouse = ''; }
        var drivers = (o.drivers || []).map(function (d) { return { value: d.name, label: d.label + (d.label !== d.name ? ' (' + d.name + ')' : '') }; });
        var presets = [['daily', 'Daily (today)'], ['weekly', 'Weekly (last 7 days)'], ['monthly', 'Monthly (month to date)'], ['custom', 'Custom']];
        var h = '<div class="dfd-presets">' + presets.map(function (p) {
            return '<button class="dfd-chip' + (st.preset === p[0] ? ' on' : '') + '" data-preset="' + p[0] + '">' + esc(p[1]) + '</button>';
        }).join('') + '<span class="dfd-note" style="margin-left:6px">Trip date = Delivery Date, or the Departure date when Delivery Date is blank. ForkLift uses its Date field.</span></div>';
        h += '<div class="dfd-fgroup" style="border-top:none;margin-top:0;padding-top:0"><div class="gt">Applies to both<span>Delivery Trips + ForkLift</span></div><div class="dfd-fgrid">' +
            '<label class="f">From Date<input type="date" data-f="from_date" value="' + esc(st.f.from_date) + '"></label>' +
            '<label class="f">To Date<input type="date" data-f="to_date" value="' + esc(st.f.to_date) + '"></label>' +
            '<label class="f">Company<select data-f="company">' + optionList(o.companies, st.f.company, 'All companies') + '</select></label>' +
            '<label class="f">Warehouse &mdash; origin or destination<select data-f="warehouse">' + optionList(whs, st.f.warehouse, 'All warehouses') + '</select></label>' +
            '<label class="f">Driver<select data-f="driver">' + optionList(drivers, st.f.driver, 'All drivers') + '</select></label>' +
            '</div></div>';
        h += '<div class="dfd-fgrid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">';
        h += '<div class="dfd-fgroup"><div class="gt">Delivery Trips only<span>no effect on forklift figures</span></div><div class="dfd-fgrid">' +
            '<label class="f">Vehicle<select data-f="vehicle">' + optionList(o.vehicles, st.f.vehicle, 'All vehicles') + '</select></label>' +
            '<label class="f">Trip type<select data-f="trip_type">' + optionList(o.trip_types, st.f.trip_type, 'All trip types') + '</select></label></div></div>';
        h += '<div class="dfd-fgroup"><div class="gt">ForkLift only<span>no effect on delivery figures</span></div><div class="dfd-fgrid">' +
            '<label class="f">Forklift number<select data-f="forklift">' + optionList(o.forklifts, st.f.forklift, 'All forklifts') + '</select></label></div></div>';
        h += '</div>';
        h += '<div class="dfd-factions"><span class="dfd-note">Company filter: Delivery Trip by its Company; ForkLift through its warehouse&#39;s company.</span>' +
            '<button class="dfd-btn" data-act="reset">Reset filters</button></div>';
        if (st.optsError) { h += '<div class="dfd-banner warn" style="margin:10px 0 0">Filter choices could not be loaded (' + esc(st.optsError) + '). Date filters still work.</div>'; }
        sel('.dfd-filters').innerHTML = h;
    }

    // ---------------- data loading ----------------
    var tmr = null;
    function scheduleLoad(delay) {
        if (tmr) { clearTimeout(tmr); }
        tmr = setTimeout(load, delay || 0);
    }

    function load() {
        tmr = null;
        if (!st.f.from_date || !st.f.to_date || st.f.from_date > st.f.to_date) {
            st.data = null; st.error = 'Choose a valid date range (From Date must be on or before To Date).';
            st.loading = false; renderAll(); return;
        }
        var my = ++st.seq;
        st.loading = true; st.error = null; showLoading();
        var args = {};
        Object.keys(st.f).forEach(function (k) { if (st.f[k]) { args[k] = st.f[k]; } });
        frappe.call({ method: API, args: args, freeze: false, silent: true, type: 'GET' })
            .then(function (r) {
                if (my !== st.seq) { return; } // stale response - a newer request is in flight
                st.loading = false;
                if (!r || !r.message) { st.data = null; st.error = 'Empty response from the dashboard API.'; }
                else { st.data = r.message; st.lastOk = r.message.generated_at; st.dt.page = 0; st.fl.page = 0; }
                renderAll();
            }, function (e) {
                if (my !== st.seq) { return; }
                st.loading = false; st.data = null;
                st.error = errText(e);
                renderAll();
            });
    }
    function errText(e) {
        try {
            if (e && e.responseJSON) {
                var j = e.responseJSON;
                if (j._server_messages) { var m = JSON.parse(j._server_messages); if (m && m.length) { return JSON.parse(m[0]).message || String(m[0]); } }
                if (j.exc_type) { return j.exc_type === 'PermissionError' ? 'Access unavailable: you do not have permission to use this dashboard API.' : j.exc_type; }
            }
            if (e && e.status === 403) { return 'Access unavailable (HTTP 403).'; }
            if (e && e.status) { return 'Request failed (HTTP ' + e.status + ').'; }
        } catch (x) { /* ignore */ }
        return 'Request failed. Check your connection and try Refresh.';
    }
    function loadOptions() {
        frappe.call({ method: API, args: { action: 'options' }, freeze: false, silent: true, type: 'GET' }).then(function (r) {
            st.opts = (r && r.message) || {}; st.optsError = null; renderFilters();
        }, function (e) { st.opts = {}; st.optsError = errText(e); renderFilters(); });
    }
    function showLoading() {
        sel('.dfd-loading').style.display = st.loading ? 'flex' : 'none';
        var b = sel('[data-act="refresh"]'); if (b) { b.disabled = !!st.loading; }
    }

    // ---------------- charts ----------------
    function dateSeq(from, to) {
        var out = [], d = from, guard = 0;
        while (d <= to && guard < 400) { out.push(d); d = addDays(d, 1); guard++; }
        return guard >= 400 ? null : out;
    }
    function trend(list, keys, colors, labels, emptyMsg) {
        if (!list) { return '<div class="dfd-empty">' + NA + '</div>'; }
        var map = {}; list.forEach(function (r) { map[r.date] = r; });
        var dates = dateSeq(st.data.filters.from_date, st.data.filters.to_date) || list.map(function (r) { return r.date; });
        var any = list.some(function (r) { return keys.some(function (k) { return (r[k] || 0) > 0; }); });
        if (!any) { return '<div class="dfd-empty">' + esc(emptyMsg) + '</div>'; }
        var W = 640, H = 190, L = 34, B = 26, T = 8, R = 6, iw = W - L - R, ih = H - T - B;
        var max = 0;
        dates.forEach(function (d) { var r = map[d] || {}; var s = 0; keys.forEach(function (k) { s += (r[k] || 0); }); if (s > max) { max = s; } });
        max = max || 1;
        var raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), nrm = raw / mag;
        var step = (nrm <= 1 ? 1 : (nrm <= 2 ? 2 : (nrm <= 5 ? 5 : 10))) * mag; if (step < 1) { step = 1; }
        var top = step * 4;
        var bw = iw / dates.length, g = '';
        for (var i = 0; i <= 4; i++) {
            var y = T + ih - ih * i / 4;
            g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#e6ecf4"/>' +
                '<text x="' + (L - 4) + '" y="' + (y + 3) + '" text-anchor="end">' + Math.round(top * i / 4) + '</text>';
        }
        var every = Math.max(1, Math.ceil(dates.length / 10));
        dates.forEach(function (d, i) {
            var r = map[d] || {}, y0 = T + ih, x = L + i * bw + bw * 0.12, w = Math.max(1, bw * 0.76), tip = fdateTxt(d);
            keys.forEach(function (k, j) {
                var v = r[k] || 0, h = ih * v / top;
                tip += '\n' + labels[j] + ': ' + v.toLocaleString('en-US');
                if (h > 0) { g += '<rect x="' + x.toFixed(1) + '" y="' + (y0 - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + colors[j] + '" rx="1.5"><title>__TIP__</title></rect>'; }
                y0 -= h;
            });
            g = g.split('__TIP__').join(esc(tip));
            g += '<rect x="' + (L + i * bw).toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + ih + '" fill="transparent"><title>' + esc(tip) + '</title></rect>';
            if (i % every === 0) { g += '<text x="' + (L + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.slice(5)) + '</text>'; }
        });
        var leg = '<div class="dfd-legend">' + keys.map(function (k, j) { return '<span><i style="background:' + colors[j] + '"></i>' + esc(labels[j]) + '</span>'; }).join('') + '</div>';
        return leg + '<svg class="dfd-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g + '</svg>';
    }
    function fdateTxt(d) { try { return frappe.datetime.str_to_user(d); } catch (e) { return d; } }

    function bars(list, nameKey, segs, opts) {
        opts = opts || {};
        if (!list) { return '<div class="dfd-empty">' + NA + '</div>'; }
        if (!list.length) { return '<div class="dfd-empty">No records for the selected filters.</div>'; }
        var totalKey = opts.total || segs[0].k;
        var rows = list.slice().sort(cmpDesc(totalKey));
        var id = opts.id || '';
        var lim = st.showAll[id] ? rows.length : (opts.limit || 12);
        var max = 0; rows.forEach(function (r) { var v = r[totalKey] || 0; if (v > max) { max = v; } }); max = max || 1;
        var h = '<div class="dfd-bars">';
        rows.slice(0, lim).forEach(function (r) {
            var label = opts.label ? opts.label(r) : r[nameKey];
            var tip = label + ' - ' + segs.map(function (s) { return s.l + ': ' + (isNum(r[s.k]) ? r[s.k].toLocaleString('en-US') : 'n/a'); }).join(', ');
            h += '<div class="r" title="' + esc(tip) + '"><div class="n">' + esc(label) + '</div><div class="t">' +
                segs.map(function (s) { return '<b style="width:' + (100 * (r[s.k] || 0) / max).toFixed(2) + '%;background:' + s.c + '"></b>'; }).join('') +
                '</div><div class="v">' + (opts.fmt ? opts.fmt(r[totalKey]) : n(r[totalKey])) + '</div></div>';
        });
        h += '</div>';
        if (rows.length > (opts.limit || 12) && id) {
            h += '<div style="margin-top:6px"><button class="dfd-btn" data-showall="' + esc(id) + '">' + (st.showAll[id] ? 'Show top ' + (opts.limit || 12) : 'Show all ' + rows.length) + '</button></div>';
        }
        return h;
    }
    function legend(segs) { return '<div class="dfd-legend">' + segs.map(function (s) { return '<span><i style="background:' + s.c + '"></i>' + esc(s.l) + '</span>'; }).join('') + '</div>'; }
    function panel(title, sub, body, extra) {
        return '<div class="dfd-panel"' + (extra || '') + '><h3>' + esc(title) + '</h3>' + (sub ? '<div class="ps">' + sub + '</div>' : '<div class="ps"></div>') + body + '</div>';
    }
    function kv(items) {
        return '<div class="dfd-kv">' + items.map(function (it) {
            return '<div class="k"><div class="l">' + esc(it[0]) + '</div><div class="v">' + it[1] + '</div>' + (it[2] ? '<div class="s">' + it[2] + '</div>' : '') + '</div>';
        }).join('') + '</div>';
    }

    // ---------------- cards ----------------
    function sectionState(sec, label) {
        // returns null if usable, else banner html
        var d = st.data;
        if (!d) { return null; }
        var s = d[sec];
        if (!s) { return '<div class="dfd-banner lock">' + esc(label) + ': access unavailable.</div>'; }
        if (s.available === false) { return '<div class="dfd-banner lock"><b>' + esc(label) + ' &mdash; access unavailable.</b> ' + esc(s.reason || '') + '</div>'; }
        return null;
    }
    function renderCards() {
        var d = st.data, D = d && d.delivery && d.delivery.available ? d.delivery : null, F = d && d.forklift && d.forklift.available ? d.forklift : null;
        function v(x, f) { if (!d) { return '<span class="na">&mdash;</span>'; } return x === undefined ? NA : f(x); }
        var noAccD = d && !D, noAccF = d && !F;
        var h = '';
        h += '<div class="dfd-card"><div class="lbl">Delivery trips <span class="tag">Submitted records</span></div><div class="val">' +
            (noAccD ? NA : v(D && D.submitted.trips, n)) + '</div><div class="sm">' +
            (D ? 'Drafts (separate): ' + n(D.draft.trips) + ' &middot; ' + n(D.submitted.fallback_date) + ' dated from departure' : '&nbsp;') + '</div></div>';
        h += '<div class="dfd-card"><div class="lbl">Delivered trips <span class="tag">Submitted records</span></div><div class="val">' +
            (noAccD ? NA : v(D && D.submitted.delivered, n)) + '</div><div class="sm">' +
            (D ? 'Delivery Status = Delivered &middot; drafts marked Delivered: ' + n(D.draft.delivered) : '&nbsp;') + '</div></div>';
        h += '<div class="dfd-card teal"><div class="lbl">Forklift operations <span class="tag">Submitted records</span></div><div class="val">' +
            (noAccF ? NA : v(F && F.submitted.operations, n)) + '</div><div class="sm">' +
            (F ? 'Loading ' + n(F.submitted.loading) + ' &middot; Unloading ' + n(F.submitted.unloading) + ' &middot; Drafts: ' + n(F.draft.operations) : '&nbsp;') + '</div></div>';
        h += '<div class="dfd-card"><div class="lbl">Recorded amount earned <span class="tag">Submitted records</span></div><div class="val" style="font-size:22px">' +
            (noAccD ? NA : v(D && D.submitted.amount, amt)) + '</div><div class="sm">' +
            (D ? 'Draft amount (separate): ' + amt(D.draft.amount) + ' &middot; business meaning not yet confirmed' : '&nbsp;') + '</div></div>';
        sel('.dfd-cards').innerHTML = h;
    }

    // ---------------- top state ----------------
    function renderState() {
        var h = '';
        if (st.error) { h += '<div class="dfd-banner err"><b>Could not load data.</b> ' + esc(st.error) + '</div>'; }
        var d = st.data;
        if (d) {
            if (d.limitations && d.limitations.length) {
                h += '<div class="dfd-banner info">' + d.limitations.map(esc).join('<br>') + '</div>';
            }
            var un = [];
            ['delivery', 'forklift'].forEach(function (k) {
                var s = d[k]; if (s && s.available && s.unavailable_fields && Object.keys(s.unavailable_fields).length) {
                    un.push((k === 'delivery' ? 'Delivery Trip' : 'ForkLift') + ': ' + Object.keys(s.unavailable_fields).join(', '));
                }
            });
            if (un.length) { h += '<div class="dfd-banner lock"><b>Some figures are unavailable</b> because read access to these fields could not be verified for your account: ' + esc(un.join(' | ')) + '. They are shown as &ldquo;Unavailable&rdquo;, not as zero.</div>'; }
        }
        sel('.dfd-state').innerHTML = h;
        sel('.dfd-last').innerHTML = st.lastOk ? 'Last successful refresh: ' + esc(fdateTxtTime(st.lastOk)) : 'Not loaded yet';
    }
    function fdateTxtTime(s) { try { return frappe.datetime.str_to_user(s.slice(0, 19)); } catch (e) { return s; } }

    // ---------------- overview ----------------
    function renderOverview() {
        var d = st.data, D = d.delivery && d.delivery.available ? d.delivery : null, F = d.forklift && d.forklift.available ? d.forklift : null;
        var h = '';
        if (D && F && D.submitted.trips === 0 && D.draft.trips === 0 && F.submitted.records === 0 && F.draft.records === 0) {
            h += '<div class="dfd-panel"><div class="dfd-empty"><b>No records</b> match the selected filters and date range.</div></div>';
        }
        h += '<div class="dfd-grid2">';
        h += panel('Daily delivery trips', 'Submitted trips per effective trip date (bars include Delivered trips)',
            sectionState('delivery', 'Delivery Trips') || trend(D.by_date, ['trips'], [C.trips], ['Submitted trips'], 'No submitted delivery trips in this range.'));
        h += panel('Daily forklift operations', 'Submitted ForkLift records per Date &middot; loading + unloading counts',
            sectionState('forklift', 'Forklift Activity') || trend(F.by_date, ['loading', 'unloading'], [C.load, C.unload], ['Loading', 'Unloading'], 'No submitted forklift operations in this range.'));
        h += '</div>';

        // warehouse comparison
        var whBody;
        if (!D && !F) { whBody = '<div class="dfd-empty">' + NA + '</div>'; }
        else {
            var m = {};
            var dw = D ? D.by_warehouse_either : undefined;
            var fw = F ? F.by_warehouse : undefined;
            if (dw) { Object.keys(dw).forEach(function (k) { m[k] = m[k] || { warehouse: k }; m[k].trips = dw[k]; }); }
            if (fw) { fw.forEach(function (r) { m[r.warehouse] = m[r.warehouse] || { warehouse: r.warehouse }; m[r.warehouse].ops = r.operations; }); }
            var rows = Object.keys(m).map(function (k) { return m[k]; });
            var mt = 1, mo = 1; rows.forEach(function (r) { mt = Math.max(mt, r.trips || 0); mo = Math.max(mo, r.ops || 0); });
            rows.sort(function (a, b) { return ((b.trips || 0) / mt + (b.ops || 0) / mo) - ((a.trips || 0) / mt + (a.ops || 0) / mo); });
            if (!rows.length) { whBody = '<div class="dfd-empty">No warehouse activity for the selected filters.</div>'; }
            else {
                whBody = legend([{ l: 'Delivery trips (origin or destination)', c: C.trips }, { l: 'Forklift operations', c: C.ops }]) +
                    '<div class="dfd-tbl-wrap"><table><thead><tr><th>Warehouse</th><th class="num">Trips</th><th style="min-width:110px"></th><th class="num">Forklift ops</th><th style="min-width:110px"></th></tr></thead><tbody>' +
                    rows.map(function (r) {
                        return '<tr><td>' + esc(r.warehouse) + '</td><td class="num">' + (dw ? n(r.trips || 0) : NA) + '</td><td><div class="dfd-bars"><div class="t"><b style="width:' + (100 * (r.trips || 0) / mt).toFixed(1) + '%;background:' + C.trips + '"></b></div></div></td>' +
                            '<td class="num">' + (fw ? n(r.ops || 0) : NA) + '</td><td><div class="dfd-bars"><div class="t"><b style="width:' + (100 * (r.ops || 0) / mo).toFixed(1) + '%;background:' + C.ops + '"></b></div></div></td></tr>';
                    }).join('') + '</tbody></table></div>';
            }
        }
        h += panel('Warehouse activity comparison', 'Submitted records. A trip whose origin and destination are different warehouses is counted under each of them, so this column does not add up to the trip total.', whBody);

        h += '<div class="dfd-grid2">';
        h += panel('Trips by origin warehouse', 'Submitted trips &middot; From Warehouse',
            sectionState('delivery', 'Delivery Trips') || bars(objToList(D.by_origin, 'warehouse'), 'warehouse', [{ k: 'value', l: 'Trips', c: C.trips }], { id: 'org' }));
        h += panel('Trips by destination warehouse', 'Submitted trips &middot; To Warehouse',
            sectionState('delivery', 'Delivery Trips') || bars(objToList(D.by_destination, 'warehouse'), 'warehouse', [{ k: 'value', l: 'Trips', c: C.delivered }], { id: 'dst' }));
        h += '</div>';

        h += panel('Records needing attention', 'Review items for the selected filters. They are flags for checking, not confirmed errors. &ldquo;Review&rdquo; opens the matching rows in the detail table.', quality(D, F));
        return h;
    }
    function qli(label, val, link, note) {
        return '<li><span>' + esc(label) + (note ? ' <span class="dfd-note">' + note + '</span>' : '') + '</span><span><span class="c">' + (isNum(val) ? n(val) : NA) + '</span>' +
            (link && isNum(val) && val > 0 ? ' &nbsp;<a class="rec" ' + link + '>Review</a>' : '') + '</span></li>';
    }
    function quality(D, F) {
        var h = '<div class="dfd-grid2"><div><b style="color:#0a3d7a">Delivery Trips</b>';
        if (D) {
            var a = D.attention;
            h += '<ul class="dfd-q">' +
                qli('Reversed timestamps (excluded from timing)', a.reversed_timestamps, 'data-goto="delivery" data-flag="reversed"') +
                qli('Valid durations over 24 hours', a.over_24h, 'data-goto="delivery" data-flag="over24"', '(kept in averages)') +
                qli('Delivery Date differs from Departure date', a.date_mismatch, 'data-goto="delivery" data-flag="mismatch"') +
                qli('Missing origin warehouse', a.missing_origin, 'data-goto="delivery" data-flag="missing origin"') +
                qli('Missing destination warehouse', a.missing_destination, 'data-goto="delivery" data-flag="missing destination"') +
                qli('Missing trip type', a.missing_trip_type, 'data-goto="delivery" data-flag="missing trip type"') +
                qli('Missing driver', a.missing_driver, 'data-goto="delivery" data-flag="missing driver"') +
                qli('Draft trips already marked Delivered', a.draft_marked_delivered, 'data-goto="delivery" data-flag="draftdelivered"', '(drafts)') +
                qli('Trip date taken from Departure (no Delivery Date)', D.submitted.fallback_date, 'data-goto="delivery" data-flag="fallback"', '(info)') +
                '</ul>';
        } else { h += sectionState('delivery', 'Delivery Trips'); }
        h += '</div><div><b style="color:#0b6668">Forklift Activity</b>';
        if (F) {
            var b = F.attention;
            h += '<ul class="dfd-q">' +
                qli('Submitted records with zero loading/unloading', b.zero_activity_submitted, 'data-goto="forklift" data-flag="zero"') +
                qli('Repeated date / forklift combinations', b.repeated_date_forklift ? b.repeated_date_forklift.length : null, 'data-goto="forklift" data-flag="repeat"', '(may be legitimate)') +
                qli('Missing driver', b.missing_driver, 'data-goto="forklift" data-flag="missing driver"') +
                qli('Missing forklift number', b.missing_forklift_no, 'data-goto="forklift" data-flag="missing forklift no"') +
                qli('Non-numeric or negative counts', b.invalid_values ? b.invalid_values.length : null, 'data-goto="forklift" data-flag="invalid"') +
                qli('Undated records', F.undated.submitted + F.undated.draft, 'data-undated="1"', '(outside selected date range)') +
                '</ul>';
        } else { h += sectionState('forklift', 'Forklift Activity'); }
        return h + '</div></div>';
    }

    // ---------------- delivery tab ----------------
    var DT_FLAGS = [
        ['', 'All rows'], ['reversed', 'Reversed timestamps'], ['over24', 'Duration over 24h'], ['mismatch', 'Delivery vs departure date differ'],
        ['missing origin', 'Missing origin'], ['missing destination', 'Missing destination'], ['missing trip type', 'Missing trip type'],
        ['missing driver', 'Missing driver'], ['fallback', 'Date from departure'], ['draft', 'Draft records'], ['draftdelivered', 'Drafts marked Delivered']];
    function dtMatch(r, f) {
        if (!f) { return true; }
        var fl = r.flags || [];
        if (f === 'reversed') { return fl.some(function (x) { return / reversed$/.test(x); }); }
        if (f === 'over24') { return fl.some(function (x) { return / over 24h$/.test(x); }); }
        if (f === 'mismatch') { return fl.indexOf('delivery date differs from departure date') >= 0; }
        if (f === 'fallback') { return r.date_source !== 'custom_delivery_date'; }
        if (f === 'draft') { return r.docstatus === 0; }
        if (f === 'draftdelivered') { return r.docstatus === 0 && r.delivery_status === 'Delivered'; }
        return fl.indexOf(f) >= 0;
    }
    function dsBadge(s) {
        if (s === null || s === undefined) { return '<span class="na">&mdash;</span>'; }
        var c = s === 'Delivered' ? 'del' : (s === 'Not Delivered' ? 'nd' : 'pd');
        return '<span class="bdg ' + c + '">' + esc(s) + '</span>';
    }
    function renderDelivery() {
        var blk = sectionState('delivery', 'Delivery Trips');
        if (blk) { return blk; }
        var D = st.data.delivery, S = D.submitted, h = '';
        if (S.trips === 0 && D.draft.trips === 0) { return '<div class="dfd-panel"><div class="dfd-empty"><b>No delivery trips</b> match the selected filters and date range.</div></div>'; }
        h += panel('Delivery status — submitted records', 'Delivery Status is separate from Document Status (a submitted trip shows Document Status &ldquo;Scheduled&rdquo;).', kv([
            ['Submitted trips', n(S.trips)], ['Delivered', n(S.delivered)], ['Partially Delivered', n(S.partially_delivered)],
            ['Not Delivered', n(S.not_delivered)], ['No delivery status', n(S.no_status)],
            ['Draft trips', n(D.draft.trips), 'separate, not in totals'], ['Drafts marked Delivered', n(D.draft.delivered)],
            ['Draft amount', amt(D.draft.amount), 'Recorded amount earned']]));
        var cross = D.by_docstatus_and_delivery_status;
        h += '<div class="dfd-grid2">';
        h += panel('Delivery Status (submitted)', '', bars(objToList(D.by_delivery_status, 'status'), 'status', [{ k: 'value', l: 'Trips', c: C.trips }], { id: 'dst2' }));
        h += panel('Document status × Delivery status', 'All non-cancelled records (cancelled are excluded)', cross ?
            '<div class="dfd-tbl-wrap"><table><thead><tr><th>Document</th><th>Delivery Status</th><th class="num">Trips</th></tr></thead><tbody>' +
            Object.keys(cross).sort().map(function (k) { var p = k.split(' | '); return '<tr><td>' + (p[0] === 'Draft' ? '<span class="bdg dr">Draft</span>' : '<span class="bdg sub">Submitted</span>') + '</td><td>' + dsBadge(p[1]) + '</td><td class="num">' + n(cross[k]) + '</td></tr>'; }).join('') +
            '</tbody></table></div>' : '<div class="dfd-empty">' + NA + '</div>');
        h += '</div>';
        h += '<div class="dfd-grid2">';
        var drvLabel = function (r) { return (r.driver_name ? r.driver_name : r.driver); };
        h += panel('Trips by driver', 'Submitted trips (dark = Delivered portion)', legend([{ l: 'Delivered', c: C.delivered }, { l: 'Other submitted', c: C.trips }]) +
            bars(D.by_driver ? D.by_driver.map(function (r) { return { driver: r.driver, driver_name: r.driver_name, trips: r.trips, delivered: r.delivered, rest: isNum(r.delivered) ? r.trips - r.delivered : r.trips }; }) : null, 'driver',
                [{ k: 'delivered', l: 'Delivered', c: C.delivered }, { k: 'rest', l: 'Other', c: C.trips }], { id: 'drv', total: 'trips', label: drvLabel }));
        h += panel('Recorded amount earned by driver', 'Submitted trips &middot; meaning of this amount not yet confirmed',
            bars(D.by_driver, 'driver', [{ k: 'amount', l: 'Recorded amount earned', c: '#3b6fb6' }], { id: 'drvamt', total: 'amount', label: drvLabel, fmt: amt }));
        h += panel('Trips by vehicle', 'Submitted trips', bars(D.by_vehicle, 'vehicle', [{ k: 'trips', l: 'Trips', c: C.trips }], { id: 'veh', total: 'trips' }));
        h += panel('Trips by trip type', 'Submitted trips', bars(objToList(D.by_trip_type, 'type'), 'type', [{ k: 'value', l: 'Trips', c: C.trips }], { id: 'typ' }));
        h += '</div>';
        // timing
        var T = D.timing, tl = [['warehouse_wait', 'Warehouse waiting', 'Reporting at warehouse &rarr; Departure'], ['travel', 'Travel', 'Departure &rarr; Delivered at site'], ['site_wait', 'Site waiting', 'Delivered at site &rarr; Out of site']];
        h += panel('Timing averages — submitted trips', 'Only pairs where both times exist and are in order. Missing or reversed pairs are excluded. Valid durations over 24 hours are <b>kept</b> in the averages and only flagged.',
            '<div class="dfd-grid3">' + tl.map(function (t) {
                var x = T[t[0]];
                if (!x) { return '<div class="dfd-kv"><div class="k"><div class="l">' + esc(t[1]) + '</div><div class="v">' + NA + '</div><div class="s">' + t[2] + '</div></div></div>'; }
                return '<div class="dfd-kv" style="grid-template-columns:1fr"><div class="k"><div class="l">' + esc(t[1]) + ' &middot; average</div><div class="v">' + (x.valid_pairs ? dur(x.avg_minutes) : '<span class="na">No valid pairs</span>') + '</div>' +
                    '<div class="s">' + t[2] + '<br>Valid pairs: <b>' + n(x.valid_pairs) + '</b> &middot; over 24h: <b>' + n(x.over_24h) + '</b><br>Excluded: ' + n(x.reversed) + ' reversed, ' + n(x.missing) + ' missing</div></div></div>';
            }).join('') + '</div>');
        h += panel('Trip details', '', dtTable(D));
        return h;
    }
    function truncBanner(sec, label) {
        if (!sec.rows_truncated) { return ''; }
        return '<div class="dfd-banner warn"><b>Detail limit reached:</b> this table lists the latest ' + n(sec.rows.length) + ' of ' + n(sec.row_count) + ' matching ' + esc(label) +
            '. Summary cards, charts and totals still include <b>all ' + n(sec.row_count) + '</b> records. Narrow the filters to see every row.</div>';
    }
    function pager(key, total) {
        var p = st[key].page, pages = Math.max(1, Math.ceil(total / PAGE));
        if (p >= pages) { p = st[key].page = pages - 1; }
        return '<div class="dfd-pager"><span class="dfd-note">' + n(total) + ' rows &middot; page ' + (p + 1) + ' of ' + pages + '</span><span>' +
            '<button class="dfd-btn" data-page="' + key + '" data-dir="-1"' + (p <= 0 ? ' disabled' : '') + '>&lsaquo; Prev</button> ' +
            '<button class="dfd-btn" data-page="' + key + '" data-dir="1"' + (p >= pages - 1 ? ' disabled' : '') + '>Next &rsaquo;</button></span></div>';
    }
    function txtMatch(r, q, keys) {
        if (!q) { return true; }
        q = q.toLowerCase();
        return keys.some(function (k) { return String(r[k] || '').toLowerCase().indexOf(q) >= 0; });
    }
    function dtTable(D) {
        var rows = D.rows.filter(function (r) { return dtMatch(r, st.dt.flag) && txtMatch(r, st.dt.q, ['name', 'driver', 'driver_name', 'vehicle', 'origin', 'destination', 'trip_type']); });
        var p = st.dt.page;
        var h = truncBanner(D, 'trips (submitted and draft)');
        h += '<div class="dfd-tools"><input class="srch" data-q="dt" placeholder="Search trip, driver, vehicle, warehouse&hellip;" value="' + esc(st.dt.q) + '">' +
            '<select class="sm" data-flagsel="dt">' + DT_FLAGS.map(function (f) { return '<option value="' + esc(f[0]) + '"' + (st.dt.flag === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</select></div>';
        h += '<div class="dfd-note" style="margin-bottom:6px"><span class="bdg fb">dep.</span> = effective trip date taken from Departure Time (Delivery Date blank). Draft rows are shaded and are not in the totals.</div>';
        var pg = pager('dt', rows.length);
        h += '<div class="dfd-tbl-wrap"><table><thead><tr><th>Effective trip date</th><th>Trip</th><th>Driver</th><th>Vehicle</th><th>Trip type</th><th>Origin</th><th>Destination</th><th>Delivery Status</th><th>Document Status</th><th class="num">Recorded amount earned</th><th class="num">Wh. wait</th><th class="num">Travel</th><th class="num">Site wait</th><th>Review flags</th></tr></thead><tbody>';
        if (!rows.length) { h += '<tr><td colspan="14"><div class="dfd-empty">No rows match.</div></td></tr>'; }
        rows.slice(st.dt.page * PAGE, st.dt.page * PAGE + PAGE).forEach(function (r) {
            h += '<tr class="' + (r.docstatus === 0 ? 'draft' : '') + '"><td>' + fdate(r.effective_date) + (r.date_source !== 'custom_delivery_date' ? ' <span class="bdg fb" title="Derived from Departure Time">dep.</span>' : '') + '</td>' +
                '<td>' + rec('Delivery Trip', r.name) + '</td><td>' + esc(r.driver_name || r.driver || '') + (r.driver_name && r.driver ? '<div class="dfd-note">' + esc(r.driver) + '</div>' : '') + '</td>' +
                '<td>' + esc(r.vehicle || '') + '</td><td>' + esc(r.trip_type || '') + '</td><td>' + esc(r.origin || '') + '</td><td>' + esc(r.destination || '') + '</td>' +
                '<td>' + dsBadge(r.delivery_status) + '</td><td>' + (r.docstatus === 0 ? '<span class="bdg dr">Draft</span>' : '<span class="bdg sub">Submitted</span>') + (r.doc_status ? ' <span class="dfd-note">' + esc(r.doc_status) + '</span>' : '') + '</td>' +
                '<td class="num">' + amt(r.amount) + '</td><td class="num">' + (r.warehouse_wait_min === null ? '&ndash;' : dur(r.warehouse_wait_min)) + '</td><td class="num">' + (r.travel_min === null ? '&ndash;' : dur(r.travel_min)) + '</td><td class="num">' + (r.site_wait_min === null ? '&ndash;' : dur(r.site_wait_min)) + '</td>' +
                '<td>' + (r.flags || []).map(function (f) { return '<span class="flag">' + esc(f) + '</span>'; }).join('') + '</td></tr>';
        });
        h += '</tbody></table></div>' + pg;
        return h;
    }

    // ---------------- forklift tab ----------------
    var FL_FLAGS = [['', 'All rows'], ['zero', 'Zero loading/unloading'], ['repeat', 'Repeated date/forklift'], ['missing driver', 'Missing driver'],
        ['missing forklift no', 'Missing forklift number'], ['invalid', 'Non-numeric/negative values'], ['draft', 'Draft records']];
    var FLF = [['loading_trailer', 'Load Trailer'], ['unloading_trailer', 'Unload Trailer'], ['loading_dayana', 'Load Dayana'], ['unloading_dayana', 'Unload Dayana'],
        ['loading_container', 'Load Container'], ['unloading_container', 'Unload Container'], ['loading_pickup', 'Load Pick Up'], ['unloading_pickup', 'Unload Pick Up']];
    function flMatch(r, f) {
        if (!f) { return true; }
        var fl = r.flags || [];
        if (f === 'zero') { return fl.indexOf('no loading/unloading recorded') >= 0; }
        if (f === 'repeat') { return fl.indexOf('repeated date/forklift - review') >= 0; }
        if (f === 'invalid') { return fl.some(function (x) { return / (nonnumeric|negative) \(/.test(x); }); }
        if (f === 'draft') { return r.docstatus === 0; }
        return fl.indexOf(f) >= 0;
    }
    function renderForklift() {
        var blk = sectionState('forklift', 'Forklift Activity');
        if (blk) { return blk; }
        var F = st.data.forklift, S = F.submitted, h = '';
        var und = F.undated;
        h += panel('Forklift operations — submitted records', 'Operations = sum of the 8 loading/unloading counts. Expense and Washing fields are excluded.', kv([
            ['Loading', n(S.loading)], ['Unloading', n(S.unloading)], ['Total operations', n(S.operations)], ['Submitted records', n(S.records)],
            ['Zero-activity records', n(S.zero_activity), 'review item'], ['Draft records', n(F.draft.records), n(F.draft.operations) + ' ops, not in totals'],
            ['Outside selected date range', n(und.submitted + und.draft), 'Undated records: ' + n(und.submitted) + ' submitted, ' + n(und.draft) + ' draft &middot; <a class="rec" data-undated="1">open list</a>']]));
        if (S.records === 0 && F.draft.records === 0) {
            h += '<div class="dfd-panel"><div class="dfd-empty"><b>No dated forklift records</b> match the selected filters and date range.</div></div>';
            return h;
        }
        var bf = F.by_field || [];
        var types = [['trailer', 'Trailer'], ['dayana', 'Dayana'], ['container', 'Container'], ['pickup', 'Pick Up']].map(function (t) {
            var l = 0, u = 0; bf.forEach(function (x) { if (x.field === 'loading_' + t[0]) { l = x.value; } if (x.field === 'unloading_' + t[0]) { u = x.value; } });
            return { type: t[1], loading: l, unloading: u, total: l + u };
        });
        var segs = [{ k: 'loading', l: 'Loading', c: C.load }, { k: 'unloading', l: 'Unloading', c: C.unload }];
        h += '<div class="dfd-grid2">';
        h += panel('Breakdown by loading/unloading category', '8 verified count fields (submitted records)', legend(segs) + bars(types, 'type', segs, { total: 'total' }) +
            '<div class="dfd-tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Field</th><th class="num">Count</th></tr></thead><tbody>' +
            bf.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td class="num">' + n(x.value) + '</td></tr>'; }).join('') + '</tbody></table></div>');
        h += panel('Operations by forklift', 'Grouped by trimmed, uppercased number. Different identifiers are not merged.', legend(segs) + bars(F.by_forklift, 'forklift', segs, { id: 'fk', total: 'operations' }));
        h += panel('Operations by warehouse', 'Submitted records', legend(segs) + bars(F.by_warehouse, 'warehouse', segs, { id: 'fwh', total: 'operations' }));
        h += panel('Operations by driver', 'Submitted records', legend(segs) + bars(F.by_driver, 'driver', segs, { id: 'fdr', total: 'operations', label: function (r) { return r.driver_name || r.driver; } }));
        h += '</div>';
        // review items
        var rep = F.attention.repeated_date_forklift, inv = F.attention.invalid_values || [];
        var rb = '<ul class="dfd-q">' +
            qli('Zero loading/unloading (submitted)', S.zero_activity, 'data-goto="forklift" data-flag="zero"') +
            qli('Repeated date / forklift combinations', rep ? rep.length : null, 'data-goto="forklift" data-flag="repeat"', '(may be separate legitimate shifts)') +
            qli('Non-numeric or negative counts', inv.length, 'data-goto="forklift" data-flag="invalid"') + '</ul>';
        if (rep && rep.length) {
            rb += '<div class="dfd-tbl-wrap" style="margin-top:8px;max-height:220px;overflow:auto"><table><thead><tr><th>Date | Forklift</th><th>Records</th></tr></thead><tbody>' +
                rep.slice(0, 200).map(function (x) { return '<tr><td>' + esc(x.key) + '</td><td>' + x.records.map(function (nm) { return rec('ForkLift', nm); }).join(', ') + '</td></tr>'; }).join('') +
                '</tbody></table></div>' + (rep.length > 200 ? '<div class="dfd-note">First 200 of ' + n(rep.length) + ' shown.</div>' : '');
        }
        h += panel('Review items', 'Highlighted for checking only &mdash; not confirmed errors.', rb);
        h += panel('Forklift records', '', flTable(F));
        return h;
    }
    function flTable(F) {
        var rows = F.rows.filter(function (r) { return flMatch(r, st.fl.flag) && txtMatch(r, st.fl.q, ['name', 'forklift_no', 'warehouse', 'driver', 'driver_name']); });
        var h = truncBanner(F, 'forklift records (submitted and draft)');
        h += '<div class="dfd-tools"><input class="srch" data-q="fl" placeholder="Search record, forklift, warehouse, driver&hellip;" value="' + esc(st.fl.q) + '">' +
            '<select class="sm" data-flagsel="fl">' + FL_FLAGS.map(function (f) { return '<option value="' + esc(f[0]) + '"' + (st.fl.flag === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</select></div>';
        var pg = pager('fl', rows.length);
        h += '<div class="dfd-tbl-wrap"><table><thead><tr><th>Date</th><th>Record</th><th>Forklift no.</th><th>Warehouse</th><th>Driver</th><th>Doc</th>' +
            FLF.map(function (x) { return '<th class="num">' + esc(x[1]) + '</th>'; }).join('') + '<th class="num">Loading</th><th class="num">Unloading</th><th class="num">Total</th><th>Review flags</th></tr></thead><tbody>';
        if (!rows.length) { h += '<tr><td colspan="18"><div class="dfd-empty">No rows match.</div></td></tr>'; }
        rows.slice(st.fl.page * PAGE, st.fl.page * PAGE + PAGE).forEach(function (r) {
            h += '<tr class="' + (r.docstatus === 0 ? 'draft' : '') + '"><td>' + fdate(r.date) + '</td><td>' + rec('ForkLift', r.name) + '</td><td>' + esc(r.forklift_no || '') + '</td><td>' + esc(r.warehouse || '') + '</td>' +
                '<td>' + esc(r.driver_name || r.driver || '') + '</td><td>' + (r.docstatus === 0 ? '<span class="bdg dr">Draft</span>' : '<span class="bdg sub">Submitted</span>') + '</td>' +
                FLF.map(function (x) { return '<td class="num">' + n(r[x[0]]) + '</td>'; }).join('') +
                '<td class="num">' + n(r.loading) + '</td><td class="num">' + n(r.unloading) + '</td><td class="num"><b>' + n(r.operations) + '</b></td>' +
                '<td>' + (r.flags || []).map(function (f) { return '<span class="flag">' + esc(f) + '</span>'; }).join('') + '</td></tr>';
        });
        h += '</tbody></table></div>' + pg;
        return h;
    }

    // ---------------- render ----------------
    function renderBody() {
        var b = sel('.dfd-body');
        if (!st.data) {
            b.innerHTML = st.error ? '<div class="dfd-panel"><div class="dfd-empty">No data to display. ' + esc(st.error) + '</div></div>' :
                '<div class="dfd-panel"><div class="dfd-empty">Loading&hellip;</div></div>';
            return;
        }
        try {
            b.innerHTML = st.tab === 'delivery' ? renderDelivery() : (st.tab === 'forklift' ? renderForklift() : renderOverview());
        } catch (e) {
            b.innerHTML = '<div class="dfd-banner err">Display error: ' + esc(e && e.message) + '</div>';
        }
    }
    function renderAll() { showLoading(); renderState(); renderCards(); renderBody(); }

    // ---------------- events ----------------
    host.addEventListener('click', function (ev) {
        var t = ev.target.closest ? ev.target : null; if (!t) { return; }
        var a = t.closest('a.rec[data-name]');
        if (a) {
            if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button === 1) { return; }
            ev.preventDefault(); frappe.set_route('Form', a.getAttribute('data-dt'), a.getAttribute('data-name')); return;
        }
        var u = t.closest('[data-undated]');
        if (u) {
            ev.preventDefault();
            frappe.route_options = { date: ['is', 'not set'], docstatus: ['!=', 2] };
            frappe.set_route('List', 'ForkLift'); return;
        }
        var g = t.closest('[data-goto]');
        if (g) {
            ev.preventDefault();
            var tab = g.getAttribute('data-goto'), key = tab === 'delivery' ? 'dt' : 'fl';
            st[key].flag = g.getAttribute('data-flag') || ''; st[key].page = 0; st[key].q = '';
            switchTab(tab);
            setTimeout(function () { var tb = sel('.dfd-body .dfd-tools'); if (tb && tb.scrollIntoView) { tb.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 30);
            return;
        }
        var tb = t.closest('.dfd-tab'); if (tb) { switchTab(tb.getAttribute('data-tab')); return; }
        var p = t.closest('[data-preset]');
        if (p) {
            var pr = p.getAttribute('data-preset');
            if (pr === 'custom') { st.preset = 'custom'; renderFilters(); return; }
            setPreset(pr); renderFilters(); scheduleLoad(0); return;
        }
        var act = t.closest('[data-act]');
        if (act) {
            var an = act.getAttribute('data-act');
            if (an === 'refresh') { scheduleLoad(0); loadOptions(); }
            if (an === 'reset') { Object.keys(st.f).forEach(function (k) { st.f[k] = ''; }); setPreset('monthly'); renderFilters(); scheduleLoad(0); }
            return;
        }
        var pgb = t.closest('[data-page]');
        if (pgb && !pgb.disabled) { var k = pgb.getAttribute('data-page'); st[k].page += parseInt(pgb.getAttribute('data-dir'), 10); renderBody(); return; }
        var sa = t.closest('[data-showall]');
        if (sa) { var id = sa.getAttribute('data-showall'); st.showAll[id] = !st.showAll[id]; renderBody(); return; }
    });
    host.addEventListener('change', function (ev) {
        var t = ev.target;
        var fk = t.getAttribute && t.getAttribute('data-f');
        if (fk) {
            st.f[fk] = t.value || '';
            if (fk === 'from_date' || fk === 'to_date') { st.preset = 'custom'; }
            if (fk === 'company') { renderFilters(); } else if (fk === 'from_date' || fk === 'to_date') {
                selAll('[data-preset]').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-preset') === 'custom'); });
            }
            scheduleLoad(fk === 'from_date' || fk === 'to_date' ? 350 : 0); return;
        }
        var fs = t.getAttribute && t.getAttribute('data-flagsel');
        if (fs) { st[fs].flag = t.value; st[fs].page = 0; renderBody(); }
    });
    var qt = null;
    host.addEventListener('input', function (ev) {
        var t = ev.target, q = t.getAttribute && t.getAttribute('data-q');
        if (!q) { return; }
        st[q].q = t.value; st[q].page = 0;
        if (qt) { clearTimeout(qt); }
        qt = setTimeout(function () {
            var pos = t.selectionStart; renderBody();
            var ni = sel('[data-q="' + q + '"]'); if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
        }, 250);
    });
    function switchTab(tab) {
        st.tab = tab;
        selAll('.dfd-tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
        renderBody();
    }

    // ---------------- init ----------------
    setPreset('monthly');
    renderFilters();
    renderAll();
    loadOptions();
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
  var AR = {"Access unavailable": "الوصول غير متاح", "Access unavailable (HTTP 403).": "الوصول غير متاح (HTTP 403).", "Access unavailable: you do not have permission to use this dashboard API.": "الوصول غير متاح: ليست لديك صلاحية استخدام واجهة هذه اللوحة.", "Activity": "النشاط", "All": "الكل", "All companies": "كل الشركات", "All drivers": "كل السائقين", "All forklifts": "كل الرافعات الشوكية", "All non-cancelled records (cancelled are excluded)": "كل السجلات غير الملغاة (الملغاة مستبعدة)", "All rows": "كل الصفوف", "All trip types": "كل أنواع الرحلات", "All vehicles": "كل المركبات", "All warehouses": "كل المستودعات", "Applies to both": "ينطبق على الاثنين", "Asia/Riyadh": "توقيت الرياض", "Breakdown by loading/unloading category": "التوزيع حسب فئة التحميل والتنزيل", "Choose a valid date range (From Date must be on or before To Date).": "اختر نطاق تاريخ صالحًا (يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساويًا له).", "Company": "الشركة", "Company filter: Delivery Trip by its Company; ForkLift through its warehouse's company.": "تصفية الشركة: رحلة التوصيل حسب شركتها؛ والرافعة الشوكية عبر شركة مستودعها.", "Container": "حاوية", "Could not load data.": "تعذر تحميل البيانات.", "Count": "العدد", "Custom": "مخصص", "DM Group · Delivery Trips and ForkLift activity from live ERP records · Asia/Riyadh": "مجموعة درر · نشاط رحلات التوصيل والرافعات الشوكية من سجلات النظام المباشرة · توقيت الرياض", "Daily": "يومي", "Daily (today)": "يومي (اليوم)", "Daily delivery trips": "رحلات التوصيل اليومية", "Daily forklift operations": "عمليات الرافعات الشوكية اليومية", "Date": "التاريخ", "Date from": "التاريخ من", "Date from departure": "التاريخ من المغادرة", "Dayana": "دينا", "Days": "الأيام", "Delivered": "تم التسليم", "Delivered trips": "الرحلات المسلَّمة", "Delivery & Forklift Dashboard": "لوحة التوصيل والرافعات الشوكية", "Delivery Date differs from Departure date": "تاريخ التسليم يختلف عن تاريخ المغادرة", "Delivery Status": "حالة التسليم", "Delivery Status (submitted)": "حالة التسليم (المعتمدة)", "Delivery Trip": "رحلة التوصيل", "Delivery Trips": "رحلات التوصيل", "Delivery Trips + ForkLift": "رحلات التوصيل + الرافعات", "Delivery Trips only": "رحلات التوصيل فقط", "Delivery status — submitted records": "حالة التسليم — السجلات المعتمدة", "Delivery trips": "رحلات التوصيل", "Delivery trips (origin or destination)": "رحلات التوصيل (المصدر أو الوجهة)", "Delivery vs departure date differ": "اختلاف تاريخ التسليم عن المغادرة", "Derived from Departure Time": "مشتق من وقت المغادرة", "Destination": "الوجهة", "Detail limit reached:": "تم بلوغ حد التفاصيل:", "Display error:": "خطأ في العرض:", "Doc": "المستند", "Document": "المستند", "Document Status": "حالة المستند", "Document status × Delivery status": "حالة المستند × حالة التسليم", "Draft": "مسودة", "Draft amount": "مبلغ المسودات", "Draft amount (separate):": "مبلغ المسودات (منفصل):", "Draft records": "سجلات مسودة", "Draft trips": "رحلات مسودة", "Draft trips already marked Delivered": "رحلات مسودة مؤشر عليها «تم التسليم»", "Drafts (separate):": "المسودات (منفصلة):", "Drafts marked Delivered": "مسودات مؤشر عليها «تم التسليم»", "Driver": "السائق", "Duration over 24h": "مدة تتجاوز 24 ساعة", "Effective trip date": "تاريخ الرحلة الفعلي", "Empty response from the dashboard API.": "استجابة فارغة من واجهة اللوحة.", "Excluded:": "مستبعد:", "Field": "الحقل", "Filter choices could not be loaded (": "تعذر تحميل خيارات التصفية (", "First 200 of": "أول 200 من", "ForkLift only": "الرافعات فقط", "Forklift Activity": "نشاط الرافعات الشوكية", "Forklift no.": "رقم الرافعة", "Forklift number": "رقم الرافعة الشوكية", "Forklift operations": "عمليات الرافعات الشوكية", "Forklift operations — submitted records": "عمليات الرافعات الشوكية — السجلات المعتمدة", "Forklift ops": "عمليات الرافعات", "Forklift records": "سجلات الرافعات", "From": "من", "From Date": "من تاريخ", "Grouped by trimmed, uppercased number. Different identifiers are not merged.": "مجمّع حسب الرقم بعد إزالة المسافات وتحويله لأحرف كبيرة. المعرّفات المختلفة لا تُدمج.", "High": "مرتفع", "Last successful refresh:": "آخر تحديث ناجح:", "Load Container": "تحميل حاوية", "Load Dayana": "تحميل دينا", "Load Pick Up": "تحميل بيك أب", "Load Trailer": "تحميل مقطورة", "Loading": "تحميل", "Missing destination": "الوجهة غير مسجلة", "Missing destination warehouse": "مستودع الوجهة غير مسجل", "Missing driver": "السائق غير مسجل", "Missing forklift number": "رقم الرافعة غير مسجل", "Missing origin": "المصدر غير مسجل", "Missing origin warehouse": "مستودع المصدر غير مسجل", "Missing trip type": "نوع الرحلة غير مسجل", "Monthly": "شهري", "Monthly (month to date)": "شهري (من بداية الشهر)", "No": "لا", "No data": "لا توجد بيانات", "No data to display.": "لا توجد بيانات للعرض.", "No dated forklift records": "لا توجد سجلات رافعات مؤرخة", "No delivery status": "بلا حالة تسليم", "No delivery trips": "لا توجد رحلات توصيل", "No records": "لا توجد سجلات", "No records for the selected filters.": "لا توجد سجلات للتصفية المحددة.", "No rows match.": "لا توجد صفوف مطابقة.", "No submitted delivery trips in this range.": "لا توجد رحلات توصيل معتمدة في هذا النطاق.", "No submitted forklift operations in this range.": "لا توجد عمليات رافعات معتمدة في هذا النطاق.", "No valid pairs": "لا توجد أزواج صالحة", "No warehouse activity for the selected filters.": "لا يوجد نشاط مستودعات للتصفية المحددة.", "Non-numeric or negative counts": "أعداد غير رقمية أو سالبة", "Non-numeric/negative values": "قيم غير رقمية / سالبة", "Not Delivered": "لم يُسلَّم", "Not loaded yet": "لم يتم التحميل بعد", "Operations by driver": "العمليات حسب السائق", "Operations by forklift": "العمليات حسب الرافعة", "Operations by warehouse": "العمليات حسب المستودع", "Origin": "المصدر", "Other": "أخرى", "Other submitted": "معتمد آخر", "Out": "خارج", "Outside selected date range": "خارج نطاق التاريخ المحدد", "Overview": "نظرة عامة", "Partially Delivered": "سُلِّم جزئيًا", "Pick Up": "بيك أب", "Record": "السجل", "Recorded amount earned": "المبلغ المكتسب المسجل", "Recorded amount earned by driver": "المبلغ المكتسب المسجل حسب السائق", "Records": "السجلات", "Records needing attention": "سجلات تحتاج انتباهًا", "Refresh": "تحديث", "Repeated date / forklift combinations": "تكرار تركيبات التاريخ / الرافعة", "Repeated date/forklift": "تكرار التاريخ/الرافعة", "Request": "الطلب", "Request failed (HTTP": "فشل الطلب (HTTP", "Request failed. Check your connection and try Refresh.": "فشل الطلب. تحقق من الاتصال واضغط تحديث.", "Reset": "إعادة تعيين", "Reset filters": "إعادة تعيين التصفية", "Rev": "مراجعة", "Reversed timestamps": "طوابع زمنية معكوسة", "Reversed timestamps (excluded from timing)": "طوابع زمنية معكوسة (مستبعدة من التوقيت)", "Review flags": "مؤشرات المراجعة", "Review items": "بنود المراجعة", "Riyadh": "الرياض", "Scheduled": "مجدول", "Show all": "عرض الكل", "Show top": "عرض الأعلى", "Site wait": "انتظار الموقع", "Site waiting": "الانتظار في الموقع", "Some figures are unavailable": "بعض الأرقام غير متاحة", "Status": "الحالة", "Submitted": "معتمد", "Submitted records": "السجلات المعتمدة", "Submitted records with zero loading/unloading": "سجلات معتمدة بلا تحميل أو تنزيل", "Submitted trips": "الرحلات المعتمدة", "Submitted trips per effective trip date (bars include Delivered trips)": "الرحلات المعتمدة حسب تاريخ الرحلة الفعلي (تشمل الأعمدة الرحلات المسلَّمة)", "Summary": "الملخص", "Timing averages — submitted trips": "متوسطات التوقيت — الرحلات المعتمدة", "To": "إلى", "To Date": "إلى تاريخ", "Total": "الإجمالي", "Total operations": "إجمالي العمليات", "Trailer": "مقطورة", "Travel": "التنقل", "Trip": "الرحلة", "Trip date = Delivery Date, or the Departure date when Delivery Date is blank. ForkLift uses its Date field.": "تاريخ الرحلة = تاريخ التسليم، أو تاريخ المغادرة عند عدم وجود تاريخ تسليم. الرافعة الشوكية تستخدم حقل التاريخ الخاص بها.", "Trip date taken from Departure (no Delivery Date)": "تاريخ الرحلة مأخوذ من المغادرة (لا يوجد تاريخ تسليم)", "Trip details": "تفاصيل الرحلة", "Trip type": "نوع الرحلة", "Trips": "الرحلات", "Trips by destination warehouse": "الرحلات حسب مستودع الوجهة", "Trips by driver": "الرحلات حسب السائق", "Trips by origin warehouse": "الرحلات حسب مستودع المصدر", "Trips by trip type": "الرحلات حسب نوع الرحلة", "Trips by vehicle": "الرحلات حسب المركبة", "Unavailable": "غير متاح", "Unavailable: you do not have verified read access to the field(s) this figure needs": "غير متاح: ليست لديك صلاحية قراءة مؤكدة للحقول التي يحتاجها هذا الرقم", "Undated records": "سجلات بلا تاريخ", "Undated records:": "سجلات بلا تاريخ:", "Unload Container": "تنزيل حاوية", "Unload Dayana": "تنزيل دينا", "Unload Pick Up": "تنزيل بيك أب", "Unload Trailer": "تنزيل مقطورة", "Unloading": "التنزيل", "Valid durations over 24 hours": "مدد صالحة تتجاوز 24 ساعة", "Valid pairs:": "الأزواج الصالحة:", "Vehicle": "المركبة", "Warehouse": "المستودع", "Warehouse activity comparison": "مقارنة نشاط المستودعات", "Warehouse waiting": "انتظار المستودع", "Warehouse — origin or destination": "المستودع — المصدر أو الوجهة", "Weekly": "أسبوعي", "Weekly (last 7 days)": "أسبوعي (آخر 7 أيام)", "Wh. wait": "انتظار المستودع", "Zero loading/unloading": "بلا تحميل أو تنزيل", "Zero loading/unloading (submitted)": "بلا تحميل أو تنزيل (معتمد)", "Zero-activity records": "سجلات بلا نشاط", "no effect on delivery figures": "لا يؤثر على أرقام التوصيل", "no effect on forklift figures": "لا يؤثر على أرقام الرافعات", "to": "إلى"}, SEL = "#dfd-dashboard", SLOT = ".dfd-head .meta", KEY = 'dms-lang', ATTRS = ['placeholder', 'title', 'aria-label'];
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
