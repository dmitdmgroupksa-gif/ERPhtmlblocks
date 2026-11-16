(function () {
  var root = root_element;
  function q(id) { return root.querySelector('[data-id="' + id + '"]'); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(v, d) { if (v == null || isNaN(v)) return '—'; return Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function sar(v) { return v == null ? '—' : 'SAR ' + nf(v, 2); }
  function link(dt, name, label) { if (!name) return esc(label || ''); return '<a href="/app/' + dt + '/' + encodeURIComponent(name) + '" target="_blank" rel="noopener">' + esc(label || name) + '</a>'; }
  function riyadh(offsetDays) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    var d = new Date(p + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + (offsetDays || 0)); return d.toISOString().slice(0, 10);
  }
  function fmtDate(s) { if (!s) return '—'; var d = new Date(s + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
  function canCreateTarget() { try { return (frappe.boot.user.can_create || []).indexOf('Manufacturing Production Target') >= 0; } catch (e) { return false; } }

  var st = { period: 'Daily', from: riyadh(0), to: riyadh(0), company: '', factory: '', ttab: 'Achieved', pmode: 'tomorrow', pstart: riyadh(1), pend: riyadh(1), ptab: 'scheduled', uom: null, perf: null, plan: null, age: 'All' };
  var seqP = 0, seqL = 0;
  q('from').value = st.from; q('to').value = st.to; q('pstart').value = st.pstart; q('pend').value = st.pend;

  function call(method, args) {
    return new Promise(function (resolve, reject) {
      frappe.call({ method: method, args: args, type: 'POST', freeze: false,
        callback: function (r) { resolve(r.message); },
        error: function (e) { reject(e); } });
    });
  }
  function errText(e) {
    try { var m = e && e.responseJSON && e.responseJSON._server_messages; if (m) { return JSON.parse(JSON.parse(m)[0]).message; } } catch (x) {}
    return 'Could not load data. Check your access or try Refresh.';
  }

  function barChart(el, labels, series, opts) {
    if (!labels.length) { el.innerHTML = '<div class="mfd-empty">No data for this range</div>'; return; }
    var W = 560, H = 210, pl = 54, pr = 8, pt = 10, pb = 34;
    var max = 0;
    labels.forEach(function (_, i) { var s = 0; series.forEach(function (se) { s = Math.max(s, se.values[i] || 0); }); max = Math.max(max, s); });
    if (max <= 0) max = 1;
    var step = Math.pow(10, Math.floor(Math.log10(max))); var nice = Math.ceil(max / step) * step; if (nice / step > 6) { step *= 2; nice = Math.ceil(max / step) * step; }
    var cw = (W - pl - pr) / labels.length; var groups = series.length; var bw = Math.max(1.5, Math.min(28, cw * 0.7 / groups));
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / nice); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">';
    for (var t = 0; t <= nice + 1e-9; t += step) { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="#e5e7eb"/><text x="' + (pl - 6) + '" y="' + (y(t) + 4) + '" font-size="10" text-anchor="end" fill="#6b7280">' + esc(nf(t)) + '</text>'; }
    var every = Math.ceil(labels.length / 10);
    labels.forEach(function (lb, i) {
      var cx = pl + cw * i + cw / 2;
      series.forEach(function (se, j) {
        var v = se.values[i] || 0; if (!v) return;
        var x = cx - (bw * groups) / 2 + bw * j;
        s += '<rect x="' + x + '" y="' + y(v) + '" width="' + bw + '" height="' + Math.max(0.5, y(0) - y(v)) + '" fill="' + se.color + '" rx="1.5"><title>' + esc(lb + ' · ' + se.name + ': ' + nf(v, opts.dec || 0)) + '</title></rect>';
      });
      if (i % every === 0) s += '<text x="' + cx + '" y="' + (H - pb + 14) + '" font-size="10" text-anchor="middle" fill="#6b7280">' + esc(lb.slice(5)) + '</text>';
    });
    s += '</svg><div class="mfd-leg">' + series.map(function (se) { return '<span><i style="background:' + se.color + '"></i>' + esc(se.name) + '</span>'; }).join('') + '</div>';
    el.innerHTML = s;
  }
  function catChart(el, cats, note) {
    var W = 560, H = 230, pl = 64, pr = 8, pt = 22, pb = 46;
    var max = 0; cats.forEach(function (c) { if (c.v != null) max = Math.max(max, c.v); }); if (max <= 0) max = 1;
    var step = Math.pow(10, Math.floor(Math.log10(max))); var nice = Math.ceil(max / step) * step; if (nice / step > 6) { step *= 2; nice = Math.ceil(max / step) * step; }
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / nice); };
    var cw = (W - pl - pr) / cats.length, bw = Math.min(64, cw * 0.55);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Production cost by category">';
    for (var t = 0; t <= nice + 1e-9; t += step) { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="#e5e7eb"/><text x="' + (pl - 6) + '" y="' + (y(t) + 4) + '" font-size="10" text-anchor="end" fill="#6b7280">' + esc(nf(t)) + '</text>'; }
    s += '<text x="12" y="' + (pt + (H - pt - pb) / 2) + '" font-size="10" fill="#6b7280" transform="rotate(-90 12 ' + (pt + (H - pt - pb) / 2) + ')" text-anchor="middle">SAR</text>';
    cats.forEach(function (c, i) {
      var cx = pl + cw * i + cw / 2;
      if (c.v == null) { s += '<text x="' + cx + '" y="' + (y(0) - 8) + '" font-size="10" text-anchor="middle" fill="#b45309">' + esc(c.na) + '<title>' + esc(c.name + ': ' + c.na + '. ' + c.tip) + '</title></text>'; }
      else { var h = Math.max(c.v > 0 ? 1 : 0, y(0) - y(c.v)); s += '<rect x="' + (cx - bw / 2) + '" y="' + (y(0) - h) + '" width="' + bw + '" height="' + h + '" fill="' + c.color + '" rx="2"><title>' + esc(c.name + ': SAR ' + nf(c.v, 2) + '. ' + c.tip) + '</title></rect><text x="' + cx + '" y="' + (y(0) - h - 5) + '" font-size="10" font-weight="600" text-anchor="middle" fill="#1f2937">' + esc(nf(c.v, 2)) + '</text>'; }
      var words = c.name.split(' — '); s += '<text x="' + cx + '" y="' + (H - pb + 14) + '" font-size="10" text-anchor="middle" fill="#374151">' + esc(words[0]) + '</text>' + (words[1] ? '<text x="' + cx + '" y="' + (H - pb + 27) + '" font-size="10" text-anchor="middle" fill="' + c.color + '">' + esc(words[1]) + '</text>' : '');
    });
    s += '</svg><div class="mfd-hint" style="margin-top:4px">' + esc(note) + '</div>';
    el.innerHTML = s;
  }
  function daysBetween(a, b) { var out = [], d = new Date(a + 'T00:00:00Z'), e = new Date(b + 'T00:00:00Z'); while (d <= e) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); } return out; }
  function card(title, body, status) { return '<div class="mfd-k"><div class="mfd-kl">' + esc(title) + '</div>' + body + (status ? '<div class="mfd-ks">' + status + '</div>' : '') + '</div>'; }
  function val(v, unit) { return '<div class="mfd-kv">' + v + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</div>'; }
  function badge(t, c) { return '<span class="mfd-badge ' + (c || '') + '">' + esc(t) + '</span>'; }

  // Target production cost line on the Production Cost card (Manufacturing Production Target.target_cost).
  function targetCostLine(tg, o) {
    var c = tg && tg.cost;
    if (!tg || tg.access !== 'ok' || !c) return '<div class="mfd-ks">Target cost: ' + badge('Unavailable', 'r') + '</div>';
    if (!c.records) {
      return '<div class="mfd-ks">Target cost: ' + badge('Target not set') +
        (canCreateTarget() ? ' <a href="/app/manufacturing-production-target/new" target="_blank" rel="noopener">Set target</a>' : '') + '</div>';
    }
    var actual = (o && o.access === 'ok') ? (o.value_difference || 0) : null;
    var html = '<div class="mfd-ks">Target cost: <b>' + nf(c.basis, 2) + '</b> SAR <span class="mfd-hint">(' + esc(c.basis_label) + ')</span>';
    if (c.produced_without_cost_target_count || c.records_without_cost) {
      html += ' ' + badge('Partial target coverage', 'w') + '<div class="mfd-hint">' +
        c.produced_without_cost_target_count + ' produced item(s) have no cost target' +
        (c.records_without_cost ? '; ' + c.records_without_cost + ' target record(s) have no Target Cost' : '') +
        '. Variance is not comparable.</div>';
    } else if (actual !== null && c.basis > 0) {
      var v = actual - c.basis;
      html += ' ' + badge((v > 0 ? 'Over target by ' : 'Under target by ') + nf(Math.abs(v), 2) + ' SAR (' +
        nf(Math.abs(v) / c.basis * 100, 1) + '%)', v > 0 ? 'r' : 'g');
    }
    return html + '</div>';
  }

  // Labour earnings, hours and overtime per employee.
  function renderLabour(r) {
    var el = q('labour-body'); if (!el) return;
    var lab = (r && r.labour) || {};
    if (lab.access !== 'ok') { el.innerHTML = '<div class="mfd-empty">Factory Daily Production is not accessible for your account.</div>'; return; }
    var list = lab.employees || [];
    if (!list.length) { el.innerHTML = '<div class="mfd-empty">No Factory Daily Production rows for this period and factory.</div>'; return; }
    var hoursOk = lab.hours_access === 'ok';
    var t = { earn: 0, appr: 0, unap: 0, ach: 0, ot: 0, short: 0, hrs: 0, oth: 0, days: 0, inc: 0, fdpHrs: 0 };
    var body = list.map(function (x) {
      t.earn += x.earnings; t.appr += x.earn_approved; t.unap += x.earn_unapproved; t.ach += x.achieved;
      t.ot += x.ot_amount; t.short += x.shortfall; t.fdpHrs += x.duty_hours || 0;
      var flags = [];
      if (hoursOk) {
        t.hrs += x.ck_hours || 0; t.oth += x.ck_ot_hours || 0; t.days += x.ck_days || 0; t.inc += x.ck_incomplete_days || 0;
        if (x.ck_incomplete_days) flags.push(badge(x.ck_incomplete_days + ' incomplete day' + (x.ck_incomplete_days === 1 ? '' : 's'), 'w'));
        if (x.ck_long_days) flags.push(badge(x.ck_long_days + ' day' + (x.ck_long_days === 1 ? '' : 's') + ' over 13 h', 'w'));
        if (x.ck_no_shift_days) flags.push(badge(x.ck_no_shift_days + ' day(s) without shift: OT not calculated', 'w'));
      }
      return '<tr><td>' + (x.employee === '(No employee)' ? esc(x.employee) : link('employee', x.employee, x.employee)) + '</td>' +
        '<td class="n"><b>' + nf(x.earnings, 2) + '</b><div class="mfd-hint">Appr. ' + nf(x.earn_approved, 2) +
        ' · Unappr. ' + nf(x.earn_unapproved, 2) + '</div></td>' +
        (hoursOk
          ? '<td class="n">' + nf(x.ck_hours || 0, 1) + '</td><td class="n">' + nf(x.ck_ot_hours || 0, 1) + '</td><td class="n">' + nf(x.ck_days || 0) + '</td>'
          : '<td class="n">—</td><td class="n">—</td><td class="n">—</td>') +
        '<td class="n">' + nf(x.achieved, 2) + '</td>' +
        '<td class="n">' + nf(x.ot_amount, 2) + '</td>' +
        '<td class="n">' + (x.shortfall ? nf(x.shortfall, 2) : '—') + '</td>' +
        '<td>' + (flags.join(' ') || '') + '</td></tr>';
    }).join('');
    var cardTotal = (lab.approved || 0) + (lab.unapproved || 0);
    el.innerHTML =
      '<div class="mfd-tw"><table><thead><tr><th>Employee</th>' +
      '<th class="n">Total earned (SAR)</th><th class="n">Hours worked</th><th class="n">Overtime hours</th>' +
      '<th class="n">Days counted</th><th class="n">Achieved amount (SAR)</th><th class="n">OT / incentive (SAR)</th>' +
      '<th class="n">Shortfall (SAR, not deducted)</th><th>Check</th></tr></thead><tbody>' + body +
      '</tbody><tfoot><tr><th>Total (' + list.length + ' employees)</th><th class="n">' + nf(t.earn, 2) + '<div class="mfd-hint">Appr. ' + nf(t.appr, 2) + ' · Unappr. ' + nf(t.unap, 2) +
      '</div></th>' +
      (hoursOk ? '<th class="n">' + nf(t.hrs, 1) + '</th><th class="n">' + nf(t.oth, 1) + '</th><th class="n">' + nf(t.days) + '</th>' : '<th></th><th></th><th></th>') +
      '<th class="n">' + nf(t.ach, 2) + '</th><th class="n">' + nf(t.ot, 2) + '</th><th class="n">' + nf(t.short, 2) + '</th>' +
      '<th>' + (t.inc ? badge(nf(t.inc) + ' incomplete days', 'w') : '') + '</th></tr></tfoot></table></div>' +
      '<div class="mfd-hint" style="margin-top:8px">' +
      'Achieved amount = Actual Qty × Rate per Factory Daily Production row (the "Total Achieved Amount" of the management print format). ' +
      'Total earned = achieved amount + positive OT / incentive amounts; negative OT amounts are a shortfall, shown separately and not deducted. ' +
      'Same records, factories and approval states as the Labour / Process Cost card' +
      (Math.abs(t.ach - cardTotal) < 0.01 ? ' (achieved total reconciles with that card: ' + nf(cardTotal, 2) + ' SAR)' : ' (achieved total ' + nf(t.ach, 2) + ' vs card ' + nf(cardTotal, 2) + ')') + '. ' +
      (hoursOk
        ? 'Hours and overtime come from biometric Employee Checkin: first to last punch each day; overtime = hours beyond the employee\'s shift length. Days with a single punch or a span over 16 h are incomplete and not counted; days over 13 h are flagged for review. '
        : 'Hours and overtime are unavailable: ' + esc(lab.hours_access || 'Employee Checkin not accessible') + '. ') +
      (t.fdpHrs ? '' : 'Factory Daily Production has no Duty Hours or OT hours recorded for this period.') +
      '</div>';
  }

  function renderPerf() {
    var r = st.perf; if (!r) return;
    q('from').value = r.start; q('to').value = r.end; st.from = r.start; st.to = r.end;
    root.querySelectorAll('[data-id="period"] button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-v') === r.period); });
    var days = daysBetween(r.start, r.end).length;
    var rng = fmtDate(r.start) + (r.start !== r.end ? ' – ' + fmtDate(r.end) : '') + ' (' + days + (days === 1 ? ' day' : ' days') + ') · ' + esc(r.scope_label || '');
    if (r.partial) rng += ' · ' + badge('In progress — data to ' + fmtDate(r.to_date_end));
    if (r.future) rng += ' · ' + badge('Future range', 'w');
    q('range').innerHTML = rng;
    var msgs = [];
    if (r.access) msgs.push(r.access);
    ['output', 'labour'].forEach(function (k) { if (r[k] && r[k].access && r[k].access !== 'ok') msgs.push(r[k].access); });
    (r.notes || []).forEach(function (n) { msgs.push(n); });
    if (r.output && r.output.truncated) msgs.push('Output list truncated at 5,000 rows — narrow the range.');
    q('perfmsg').innerHTML = msgs.map(esc).join('<br>');
    var o = r.output || {}, lab = r.labour || {}, tg = r.targets || {};
    var NA = badge('Access unavailable', 'r');
    var k = [];
    if (o.access !== 'ok') k.push(card('Production Cost', val('—'), NA));
    else if (!o.entries) k.push(card('Production Cost', val('—'), badge('No entries')));
    else k.push(card('Production Cost', val(nf(o.value_difference || 0, 2), 'SAR'), (o.negative_value_difference_entries || []).length ? badge(nf(o.negative_value_difference_entries.length) + ' negative ' + (o.negative_value_difference_entries.length === 1 ? 'entry' : 'entries'), 'w') : ''));
    k[k.length - 1] = k[k.length - 1].replace(/<\/div>$/, targetCostLine(tg, o) + '</div>');
    if (o.access !== 'ok') k.push(card('Production Output', val('—'), NA));
    else if (!(o.by_uom || []).length) k.push(card('Production Output', val('0'), badge('No data')));
    else k.push(card('Production Output', o.by_uom.map(function (u) { return val(nf(u.qty), u.uom); }).join(''), ''));
    if (o.access !== 'ok') k.push(card('Material Cost', val('—'), NA));
    else k.push(card('Material Cost', val(nf(o.material_cost, 2), 'SAR'), ''));
    if (lab.access !== 'ok') k.push(card('Labour / Process Cost', val('—'), NA));
    else if (!lab.records) k.push(card('Labour / Process Cost', val('—'), lab.combined_not_attributable ? badge('Combined 28/34 only — view All Factories', 'w') : badge('No records')));
    else k.push(card('Labour / Process Cost',
      '<div class="mfd-kv2"><span>' + nf(lab.approved, 2) + '<small>SAR</small></span>' + badge('Approved', 'g') + '</div>' +
      '<div class="mfd-kv2"><span>' + nf(lab.unapproved, 2) + '<small>SAR</small></span>' + badge('Unapproved', 'w') + '</div>', ''));
    k = k.concat(jobCards());
    q('kpis').innerHTML = k.join('');
    renderLabour(r);

    var det = [];
    det.push('<b>Categories</b>: finished-item Item Group saved on Stock Entry Detail. Output sums finished-row stock quantities, separately by UOM. Cost counts each Stock Entry value difference once; differing finished-item groups use Multiple categories, missing groups use Unclassified. Multiple-category entries: ' + nf(o.multiple_category_count || 0) + '; unclassified entries: ' + nf(o.unclassified_count || 0) + '.');
    det.push('<b>Output</b>: finished-goods quantity from submitted Manufacture stock entries, dated by stock-entry posting date, confirmed factory warehouses only' + (o.entries != null ? ' (' + nf(o.entries) + ' entries)' : '') + '.');
    det.push('<b>Production Cost</b>: incoming inventory value minus outgoing inventory value, as defined by management — the sum of “Total Value Difference (Incoming - Outgoing)” (value_difference) on submitted Manufacture stock entries in confirmed factory warehouses, by posting date: ' + sar(o.value_difference) + ' from ' + nf(o.entries || 0) + ' entries (incoming ' + sar(o.fg_valuation) + ' − outgoing ' + sar(o.material_cost) + '). Negative differences are kept as they are' + ((o.negative_value_difference_entries || []).length ? ' — for review: ' + o.negative_value_difference_entries.map(function (x) { return link('stock-entry', x.se, x.se) + ' (' + fmtDate(x.date) + ') ' + sar(x.value_difference); }).join('; ') : ' (none in this range)') + '. Materials, additional costs and labour are not added to this figure.');
    det.push('<b>Additional costs</b> (operating cost per Work Order / BOM): ' + ((o.additional_cost_entries || []).length ? (o.additional_cost_entries || []).map(function (x) { return link('stock-entry', x.se, x.se) + ' ' + sar(x.amount); }).join('; ') + ((o.additional_cost_entries || []).length >= 25 ? '; …' : '') : 'none in this range') + '.');
    det.push('<b>Material Cost</b>: value of materials consumed on those entries. Additional costs on the same entries: ' + sar(o.additional_costs) + '. Finished-goods valuation (not a cost): ' + sar(o.fg_valuation) + '.');
    det.push('<b>Labour / Process Cost</b>: Factory Daily Production “Total Achieved Amount” — for each daily report, the sum of Actual Qty × Rate over all rows, the same total as the “Factory Output and Overtime - Management” print format; dated by the report date, each report counted once. Approved = submitted with workflow state Approved (' + nf(lab.approved_records || 0) + ' reports); Unapproved = Draft or Pending Review (' + nf(lab.unapproved_records || 0) + ' reports); cancelled, Rejected and other states excluded' + (lab.excluded_records ? ' (' + nf(lab.excluded_records) + ' excluded)' : '') + '. Reports filed under the combined 28/34 branch are shown under All Factories only' + (lab.combined_not_attributable ? ' (' + nf(lab.combined_not_attributable) + ' not attributable to the selected factory)' : '') + (lab.invalid_text_dates ? '; ' + nf(lab.invalid_text_dates) + ' reports with text dates excluded' : '') + '. Not added to Production Cost.');
    det.push('<b>Factories</b>: ' + (r.mapping || []).map(function (m) { return esc(m.factory) + ' = ' + esc(m.warehouse); }).join('; ') + '. Week starts ' + esc(r.week_start) + '; dates in Asia/Riyadh.');
    if (r.is_admin && r.diagnostics) {
      var dg = r.diagnostics;
      var eo = (dg.excluded_output || []).map(function (x) { return esc(x.wh) + ': ' + nf(x.qty) + ' ' + esc(x.uom) + ' (' + nf(x.n) + ' entries, material ' + sar(x.mat) + ')'; });
      var el = (dg.excluded_labour || []).map(function (x) { return esc(x.branch || '(blank)') + ': ' + nf(x.n) + ' records, ' + sar(x.amount); });
      var ej = ((st.plan && st.plan.diagnostics && st.plan.diagnostics.excluded_job_orders) || []).map(function (x) { return esc(x.branch || '(blank)') + ' · docstatus ' + x.docstatus + ' · ' + esc(x.jo_status || 'no status') + ': ' + nf(x.n); });
      det.push('<b>Administrator diagnostics</b> (System Manager only; excluded from all figures): output — ' + (eo.length ? eo.join('; ') : 'none') + '; labour — ' + (el.length ? el.join('; ') : 'none') + '; job orders — ' + (ej.length ? ej.join('; ') : 'none') + '.');
    }
    var dEl = q('details'); var wasOpen = dEl.open;
    dEl.innerHTML = '<summary>Details &amp; definitions</summary><ul>' + det.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; dEl.open = wasOpen;

    var cdays = r.future ? [] : daysBetween(r.start, r.to_date_end || r.start);
    var uoms = (o.by_uom || []).map(function (u) { return u.uom; });
    if (!st.uom || uoms.indexOf(st.uom) < 0) { var best = (o.by_uom || []).slice().sort(function (a, b) { return b.qty - a.qty; })[0]; st.uom = best ? best.uom : null; }
    q('uomsel').innerHTML = uoms.length > 1 ? '<select>' + uoms.map(function (u) { return '<option' + (u === st.uom ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') + '</select>' : (st.uom ? '<span class="mfd-hint">' + esc(st.uom) + '</span>' : '');
    var sel = q('uomsel').querySelector('select'); if (sel) sel.onchange = function () { st.uom = sel.value; renderPerf(); };
    if(o.access !== 'ok') {q('chart-out').innerHTML='<div class="mfd-empty">Access unavailable</div>';q('chart-cost').innerHTML='<div class="mfd-empty">Access unavailable</div>';}
    else {
      var oc=(o.output_categories||[]).filter(function(x){return x.uom===st.uom;}).map(function(x){return {category:x.category,value:x.qty};}).sort(function(a,b){return b.value-a.value;});
      var ut=(o.by_uom||[]).filter(function(x){return x.uom===st.uom;})[0];
      categoryBars(q('chart-out'),oc,st.uom||'',false,ut?ut.qty:0);
      var rvO=o.output_review_entries||[],unO=(o.output_unclassified_rows||[]).filter(function(x){return x.uom===st.uom;}),seL=function(n){return '<a href="/app/stock-entry/'+encodeURIComponent(n)+'" target="_blank">'+esc(n)+'</a>';};
      if(rvO.length||unO.length){q('chart-out').insertAdjacentHTML('beforeend','<div class="mfd-msg">Review needed'+(rvO.length?' · '+rvO.length+' entr'+(rvO.length>1?'ies':'y')+' with finished items in different categories (each row counted once under its own Item Group): '+rvO.slice(0,10).map(function(x){return seL(x.se)+' ('+esc((x.groups||[]).join(', '))+')';}).join(', '):'')+(unO.length?' · '+unO.length+' finished row(s) without Item Group shown as Unclassified: '+unO.slice(0,10).map(function(x){return seL(x.se)+' '+esc(x.item||'');}).join(', '):'')+'</div>');}
      categoryBars(q('chart-cost'),(o.categories||[]).map(function(x){return {category:x.category,value:x.value_difference};}),'SAR',true,o.value_difference);
    }



  }


  var seqJ = 0;
  st.jtab = 'active'; st.jfollow = true; st.jobs = null;
  function jobCards() {
    var j = st.jobs, s = j && j.summary;
    return ['active','pending'].map(function(t) {
      return card(t === 'active' ? 'Active Jobs' : 'Pending Jobs', val(!j ? '…' : j.access ? '—' : nf((s||{})[t]||0)), j && j.access ? badge('Access unavailable','r') : badge('Jobs date range'));
    });
  }
  function renderJobs() {
    var j = st.jobs; if(!j) return;
    q('jmsg').textContent = j.access || ((j.truncated ? 'Results truncated; narrow the scope. ' : '') + 'Active: Assigned / Inprogress. Pending: Open. Counts are orders overlapping the jobs dates. Carryover uses current status.');
    if(j.access) { q('jtabs').innerHTML='';q('jtable').innerHTML='<div class="mfd-empty">Access unavailable</div>';return; }
    var ts=[['active','Active Jobs'],['pending','Pending Jobs'],['carryover','Carryover'],['schedule_review','Schedule Needs Review']];
    q('jtabs').innerHTML=ts.map(function(t){return '<button data-j="'+t[0]+'" class="'+(st.jtab===t[0]?'on':'')+'">'+t[1]+' ('+(j[t[0]]||[]).length+')</button>';}).join('');
    q('jtabs').querySelectorAll('button').forEach(function(b){b.onclick=function(){st.jtab=b.getAttribute('data-j');renderJobs();};});
    var list=j[st.jtab]||[];
    q('jtable').innerHTML=list.length ? '<table><thead><tr><th>Factory Job Order</th><th>Factory</th><th>Start Date</th><th>End Date</th><th>Status</th><th class="n">Activity rows</th><th class="n">Employees</th><th>Note</th></tr></thead><tbody>'+list.map(function(x){return '<tr><td>'+link('factory-job-order',x.jo)+'</td><td>'+esc(x.factory)+'</td><td>'+fmtDate(x.start_date)+'</td><td>'+fmtDate(x.end_date)+'</td><td>'+esc(x.status)+'</td><td class="n">'+nf(x.rows)+'</td><td class="n">'+nf(x.employees)+'</td><td>'+esc(x.issue || (st.jtab==='carryover' ? (x.days_overdue ? nf(x.days_overdue)+' days overdue today' : 'Potential carryover') : ''))+'</td></tr>';}).join('')+'</tbody></table>' : '<div class="mfd-empty">No orders in this group.</div>';
  }
  function loadJobs() {
    var p=st.perf;if(!p)return;
    if(st.jfollow){q('jstart').value=p.start;q('jend').value=p.end;}
    var a=q('jstart').value,b=q('jend').value;
    if(!a||!b||a>b){q('jmsg').textContent='Start Date must be on or before End Date.';return;}
    if(daysBetween(a,b).length>367){q('jmsg').textContent='Date range cannot exceed 367 days.';return;}
    var seq=++seqJ;st.jobs=null;q('jtable').innerHTML='<div class="mfd-empty">Loading…</div>';renderPerf();
    return call('mfg_dashboard_jobs',{company:st.company,factory:st.factory,from_date:a,to_date:b}).then(function(j){if(seq!==seqJ)return;st.jobs=j;renderJobs();renderPerf();}).catch(function(e){if(seq!==seqJ)return;st.jobs={access:errText(e)};renderJobs();renderPerf();});
  }
  function categoryBars(el,rows,unit,isCost,total) {
    if(!rows.length){el.innerHTML='<div class="mfd-empty">No entries for this range</div>';return;}
    var W=680, left=230,right=100,rh=38,H=rows.length*rh+30;
    var vals=rows.map(function(x){return Number(x.value)||0;}),lo=Math.min.apply(null,[0].concat(vals)),hi=Math.max.apply(null,[0].concat(vals));if(lo===hi)hi=lo+1;
    var scale=function(v){return left+(W-left-right)*(v-lo)/(hi-lo);},zero=scale(0),sum=0;
    var h='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(isCost?'Production Cost':'Production Output')+' by Category"><line x1="'+zero+'" x2="'+zero+'" y1="0" y2="'+(H-20)+'" stroke="#9ca3af"/>';
    rows.forEach(function(x,i){var v=Number(x.value)||0;sum+=v;var y=i*rh+8,px=scale(v),name=x.category;
      h+='<text x="'+(left-10)+'" y="'+(y+17)+'" text-anchor="end" font-size="12" fill="#374151">'+esc(name.length>31?name.slice(0,29)+'…':name)+'<title>'+esc(name)+'</title></text><rect x="'+Math.min(zero,px)+'" y="'+y+'" width="'+Math.max(v?1:0,Math.abs(px-zero))+'" height="24" rx="3" fill="'+(v<0?'#b45309':'#1f4e8c')+'"><title>'+esc(name+': '+nf(v,isCost?2:2)+' '+unit)+'</title></rect><text x="'+(W-4)+'" y="'+(y+17)+'" text-anchor="end" font-size="12" fill="#1f2937">'+esc(nf(v,isCost?2:2))+'</text>';});
    h+='</svg><div class="mfd-hint">Category: finished-item Item Group · '+esc(unit)+'</div><div class="mfd-tw"><table><thead><tr><th>Category</th><th class="n">'+(isCost?'Production Cost (SAR)':'Produced Quantity')+'</th>'+(!isCost?'<th>UOM</th>':'')+'</tr></thead><tbody>'+rows.map(function(x){return '<tr><td>'+esc(x.category)+'</td><td class="n">'+nf(x.value,2)+'</td>'+(!isCost?'<td>'+esc(unit)+'</td>':'')+'</tr>';}).join('')+'<tr><th>Total</th><th class="n">'+nf(sum,2)+'</th>'+(!isCost?'<td>'+esc(unit)+'</td>':'')+'</tr></tbody></table></div>';
    if(total!=null&&Math.abs(sum-total)>0.005)h+='<div class="mfd-msg err">Category total does not match the card. Review source classification.</div>';
    el.innerHTML=h;
  }

  function loadPerf() {
    var my = ++seqP; q('kpis').classList.add('mfd-loading');
    q('refresh').disabled = true;
    var a = { company: st.company, factory: st.factory, period: st.period };
    if (st.period === 'Custom') { a.from_date = st.from; a.to_date = st.to; } else { a.ref_date = st.to || riyadh(0); }
    return call('mfg_dashboard_performance', a).then(function (r) {
      if (my !== seqP) return; st.perf = r; fillFilters(r); setFactories(r.factory_options || []); q('perfmsg').className = 'mfd-msg'; renderPerf(); loadJobs();
      q('stamp').textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' });
    }).catch(function (e) {
      if (my !== seqP) return; q('perfmsg').className = 'mfd-msg err'; q('perfmsg').innerHTML = esc(errText(e));
    }).then(function () { if (my === seqP) { q('kpis').classList.remove('mfd-loading'); q('refresh').disabled = false; } });
  }

  var filtersFilled = false;
  function fillFilters(r) {
    if (filtersFilled) return; filtersFilled = true;
    st.company = r.company;
    frappe.db.get_list('Manufacturing Factory', { fields: ['company'], limit: 200 }).then(function (cs) {
      var names = []; cs.forEach(function (c) { if (names.indexOf(c.company) < 0) names.push(c.company); }); if (names.indexOf(r.company) < 0) names.unshift(r.company);
      q('company').innerHTML = names.map(function (n) { return '<option' + (n === r.company ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
    }).catch(function () { q('company').innerHTML = '<option>' + esc(r.company) + '</option>'; });
  }
  function setFactories(list) {
    var labels = list.map(function (f) { return f.label; });
    q('factory').innerHTML = '<option value="">All Factories' + (labels.length ? ' (' + labels.length + ')' : '') + '</option>' + list.map(function (f) { return '<option value="' + esc(f.name) + '"' + (f.name === st.factory ? ' selected' : '') + '>' + esc(f.label) + '</option>'; }).join('');
  }

  function renderPlan() {
    var r = st.plan; if (!r) return;
    var prng = fmtDate(r.plan_start) + (r.plan_end !== r.plan_start ? ' – ' + fmtDate(r.plan_end) : ''); q('pdlabel').textContent = 'Plan range: ' + prng + ' (' + r.plan_days + (r.plan_days === 1 ? ' day' : ' days') + ')' + (r.plan_start === r.plan_end ? (r.plan_start === r.today ? ' · Today' : (r.plan_start === riyadh(1) ? ' · Tomorrow' : '')) : '');
    var msgs = []; if (r.access) msgs.push(r.access); (r.notes || []).forEach(function (n) { msgs.push(n); }); if (r.truncated) msgs.push('Plan list truncated — narrow the filter.');
    q('planmsg').innerHTML = msgs.map(esc).join('<br>');
    var s = r.summary || { job_orders: 0, activity_rows: 0, unique_employees: 0, activities: [] };
    q('psum').innerHTML = '<span class="mfd-pill">Factory Job Orders <b>' + nf(s.job_orders) + '</b></span><span class="mfd-pill">Activity rows <b>' + nf(s.activity_rows) + '</b></span><span class="mfd-pill">Unique employees <b>' + nf(s.unique_employees) + '</b></span>' +
      (s.activities || []).map(function (a) { return '<span class="mfd-pill">' + esc(a.activity) + ' <b>' + nf(a.rows) + '</b></span>'; }).join('') +
      (function () { var all = (r.scheduled || []).concat(r.draft_rows || []); var ft = all.filter(function (x) { return !x.item_code; }).length; return ft ? '<span class="mfd-pill mfd-hint">Data quality: ' + nf(ft) + ' of ' + nf(all.length) + ' rows use free-text items (no item code)</span>' : ''; })() +
      '<span class="mfd-pill mfd-hint" title="' + esc((r.uom_note || '') + ' Quantities are not totalled across activities. Submitted job orders only.') + '">No UOM recorded · not totalled</span>';
    var sched = r.scheduled || [], drafts = r.draft_rows || [], carry = r.carryover || [], rev = r.schedule_review || [];
    var tabs = [['scheduled', 'Scheduled', nf(s.job_orders) + ' orders · ' + nf(sched.length) + ' rows'], ['carry', r.plan_is_future ? 'Carryover (incl. potential)' : 'Carryover', nf(carry.length) + ' orders'], ['review', 'Schedule needs review', nf(rev.length) + ' orders'], ['drafts', 'Draft Plans', nf(s.draft_job_orders || 0) + ' orders · ' + nf(drafts.length) + ' rows']];
    q('ptabs').innerHTML = tabs.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (st.ptab === t[0] ? 'on' : '') + '">' + t[1] + ' <span class="mfd-tc">' + t[2] + '</span></button>'; }).join('');
    q('ptabs').querySelectorAll('button').forEach(function (b) { b.onclick = function () { st.ptab = b.getAttribute('data-t'); renderPlan(); }; });
    if (r.access) { q('ptable').innerHTML = '<div class="mfd-empty">Access unavailable</div>'; return; }
    function rowsTable(list, emptyMsg) {
      if (!list.length) return '<div class="mfd-empty">' + emptyMsg + '</div>';
      return '<table><thead><tr><th>Factory Job Order</th><th>Employee</th><th>Item</th><th>Size</th><th>Activity</th><th class="n">Order-period quantity</th><th>Start Date</th><th>End Date</th><th>JO Status</th></tr></thead><tbody>' +
        list.map(function (x) {
          var qty = x.qty_numeric ? nf(x.qty_req, 2) : (x.qty_req_text ? esc(x.qty_req_text) + ' ' + badge('not numeric', 'w') : '—');
          return '<tr><td>' + link('factory-job-order', x.jo, x.jo) + '<div class="mfd-hint">' + esc(x.factory) + '</div></td><td>' + esc(x.employee) + '<div class="mfd-hint">' + esc(x.designation) + '</div></td><td>' + (x.item_code ? link('item', x.item_code, x.item) : esc(x.item)) + '</td><td>' + esc(x.size) + '</td><td>' + esc(x.activity) + '</td><td class="n">' + qty + ('<div class="mfd-hint">' + esc(x.qty_basis) + '</div>') + '</td><td>' + fmtDate(x.start_date) + '</td><td>' + fmtDate(x.end_date) + '</td><td>' + esc(x.jo_status) + (x.docstatus === 0 ? ' ' + badge('draft', 'w') : '') + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    function joTable(list, showAge) {
      return '<table><thead><tr><th>Factory Job Order</th><th>Factory</th><th>Start Date</th><th>End Date</th>' + (showAge ? '<th>Classification</th><th class="n">Days overdue</th><th>Ageing</th>' : '<th>Issue</th>') + '<th>JO Status</th><th class="n">Activity rows</th><th class="n">Unique employees</th><th>Activities</th></tr></thead><tbody>' +
        list.map(function (c) { return '<tr><td>' + link('factory-job-order', c.jo, c.jo) + '</td><td>' + esc(c.factory) + '</td><td>' + fmtDate(c.start_date) + '</td><td>' + fmtDate(c.end_date) + '</td>' +
          (showAge ? '<td>' + (c.kind === 'Overdue' ? badge('Overdue', 'r') : badge(c.kind)) + '</td><td class="n">' + (c.kind === 'Overdue' ? nf(c.days_overdue) : '—') + '</td><td>' + esc(c.ageing) + '</td>' : '<td>' + badge(c.reason, 'w') + '</td>') +
          '<td>' + esc(c.jo_status) + '</td><td class="n">' + nf(c.activity_rows) + '</td><td class="n">' + nf(c.unique_employees) + '</td><td>' + esc((c.activities || []).join(', ')) + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    if (st.ptab === 'scheduled') q('ptable').innerHTML = rowsTable(sched, 'No submitted, active Factory Job Order overlaps ' + prng + '.');
    else if (st.ptab === 'drafts') q('ptable').innerHTML = '<div class="mfd-hint" style="margin-bottom:6px">Not submitted — excluded from Scheduled and Carryover. ' + nf(s.draft_job_orders || 0) + ' job orders · ' + nf(s.draft_activity_rows || 0) + ' activity rows · ' + nf(s.draft_unique_employees || 0) + ' unique employees.</div>' + rowsTable(drafts, 'No draft job orders for this date.');
    else if (st.ptab === 'review') q('ptable').innerHTML = (rev.length ? joTable(rev, false) : '<div class="mfd-empty">Nothing needs schedule review.</div>');
    else {
      var buckets = ['All', '1-7 days', '8-30 days', '31-90 days', 'Over 90 days', 'Not yet overdue'];
      var cnt = {}; carry.forEach(function (c) { cnt[c.ageing] = (cnt[c.ageing] || 0) + 1; });
      var f = st.age || 'All';
      var list = carry.filter(function (c) { return f === 'All' || c.ageing === f; });
      q('ptable').innerHTML = '<div class="mfd-hint" style="margin-bottom:6px">Submitted, not Completed, ending before ' + fmtDate(r.plan_start) + '. Overdue is measured against today (' + fmtDate(r.today) + ').' + (r.plan_is_future ? ' For a future range, carryover is based on each order’s current status and may change before then.' : '') + ' Records are never changed automatically.</div>' +
        '<div class="mfd-filters" style="margin-bottom:8px"><label>Ageing <select data-id="agesel">' + buckets.map(function (b) { return '<option value="' + esc(b) + '"' + (b === f ? ' selected' : '') + '>' + esc(b) + ' (' + (b === 'All' ? carry.length : (cnt[b] || 0)) + ')</option>'; }).join('') + '</select></label></div>' +
        (list.length ? joTable(list, true) : '<div class="mfd-empty">Nothing to review.</div>');
      var a = q('agesel'); if (a) a.onchange = function () { st.age = a.value; renderPlan(); };
    }
  }
  function loadPlan() {
    var my = ++seqL; var ps = st.pmode === 'today' ? riyadh(0) : (st.pmode === 'tomorrow' ? riyadh(1) : st.pstart); var pe = st.pmode === 'today' ? riyadh(0) : (st.pmode === 'tomorrow' ? riyadh(1) : st.pend);
    q('plancard').classList.add('mfd-loading');
    return call('mfg_dashboard_plan', { company: st.company, factory: st.factory, plan_start: ps, plan_end: pe }).then(function (r) {
      if (my !== seqL) return; st.plan = r; q('planmsg').className = 'mfd-msg'; renderPlan(); renderPerf();
    }).catch(function (e) { if (my !== seqL) return; q('planmsg').className = 'mfd-msg err'; q('planmsg').innerHTML = esc(errText(e)); q('ptable').innerHTML = ''; })
      .then(function () { if (my === seqL) q('plancard').classList.remove('mfd-loading'); });
  }

  function setPreset(p) { st.period = p; root.querySelectorAll('[data-id="period"] button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-v') === p); }); }
  root.querySelectorAll('[data-id="period"] button').forEach(function (b) {
    b.onclick = function () {
      var p = b.getAttribute('data-v');
      if (p === 'Custom') { setPreset('Custom'); q('from').focus(); return; }
      setPreset(p); loadPerf();
    };
  });
  function onDate() {
    var f = q('from').value, t = q('to').value;
    setPreset('Custom');
    if (!f || !t) return;
    if (f > t) { q('perfmsg').className = 'mfd-msg err'; q('perfmsg').textContent = 'From Date must be on or before To Date.'; return; }
    st.from = f; st.to = t; loadPerf();
  }
  q('from').onchange = onDate; q('to').onchange = onDate;
  q('company').onchange = function () { st.company = q('company').value; st.factory = ''; setFactories([]); loadPerf(); loadPlan(); };
  q('factory').onchange = function () { st.factory = q('factory').value; loadPerf(); loadPlan(); };
  root.querySelectorAll('[data-id="pmode"] button').forEach(function (b) { b.onclick = function () { st.pmode = b.getAttribute('data-v'); root.querySelectorAll('[data-id="pmode"] button').forEach(function (x) { x.classList.toggle('on', x === b); }); var dd = st.pmode === 'today' ? riyadh(0) : riyadh(1); q('pstart').value = dd; q('pend').value = dd; st.pstart = dd; st.pend = dd; loadPlan(); }; });
  function onPlanDate() { var a = q('pstart').value, b = q('pend').value; st.pmode = 'date'; root.querySelectorAll('[data-id="pmode"] button').forEach(function (x) { x.classList.remove('on'); }); if (!a || !b) return; if (a > b) { q('planmsg').className = 'mfd-msg err'; q('planmsg').textContent = 'Start Date must be on or before End Date.'; return; } var days = Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); if (days > 366) { q('planmsg').className = 'mfd-msg err'; q('planmsg').textContent = 'Date range cannot exceed 367 days.'; return; } st.pstart = a; st.pend = b; loadPlan(); }
  q('pstart').onchange = onPlanDate; q('pend').onchange = onPlanDate;
  q('jstart').onchange=q('jend').onchange=function(){st.jfollow=false;loadJobs();};
  q('jsync').onclick=function(){st.jfollow=true;loadJobs();};
  q('main-tabs').querySelectorAll('button').forEach(function(b){b.onclick=function(){var v=b.getAttribute('data-view');q('main-tabs').querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b);});root.querySelectorAll('[data-view-panel]').forEach(function(p){p.style.display=p.getAttribute('data-view-panel')===v?'':'none';});};});
  q('refresh').onclick = function () { loadPerf(); loadPlan(); };
  loadPerf().then(function () { loadPlan(); });
})();