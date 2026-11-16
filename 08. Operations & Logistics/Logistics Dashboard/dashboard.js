/* DM Logistics Dashboard v6 (fleet + procurement). Paste into a Workspace Custom HTML Block's Script,
 * or use as the JS controller for Desk Page logistics-dashboard (see README).
 * Uses the logged-in user's native permissions. No automatic record writes. */
(() => {
  'use strict';
  const F = {
    date: 'custom_delivery_date', type: 'custom_trip_type_', from: 'custom_source_warehouse',
    to: 'custom_delivery_to_warehouse', report: 'custom_driver_reporting_time__at_warehouse',
    depart: 'departure_time', arrive: 'custom_delivered_time', exit: 'custom_driver__out_of_site',
    evidence: 'custom_signed_delivery_note'
  };
  const TYPES = ['Delivery Note', 'Internal Transfer', 'Materials Collection from Supplier', 'Petrol', 'Workshop'];
  const TABS = ['Overview', 'Live map', 'Awaiting submission', 'Vehicles & drivers', 'Delivery follow-up', 'Performance'];
  const RANGES = [['0', 'Today'], ['1', 'Tomorrow'], ['7', 'Next 7 days'], ['-30', 'Last 30 days'], ['all', 'All dates']];
  const RECEIPT = [['custom_receiver_name', 'Receiver name'], ['custom_receiver_mob', 'Receiver mobile'], ['custom_receiver_sign', 'Signature'], ['custom_stamp', 'Stamp']];
  const STEPS = [['Reported', F.report], ['Departed', F.depart], ['Arrived', F.arrive], ['Left site', F.exit]];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fields = [...new Set(['name', 'docstatus', 'status', 'company', 'driver', 'driver_name', 'vehicle',
    'delivery_status', 'modified', 'custom_receiver_name', 'custom_receiver_mob', 'custom_receiver_sign', 'custom_stamp', ...Object.values(F)])];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = v => String(v || '').slice(0, 10);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
  // Compare site wall-clock values without applying the browser's timezone or DST.
  const stamp = v => {
    const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    return m ? Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]) : NaN;
  };
  const shift = (d, n) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + n)).toISOString().slice(0, 10);
  const delta = (a, b) => Number.isFinite(stamp(a)) && stamp(b) >= stamp(a) ? (stamp(b)-stamp(a))/60000 : null;
  const active = r => r.docstatus !== 2 && !['Cancelled','Canceled'].includes(r.status);
  // Every submitted trip keeps status "Scheduled" in this ERP; closure shows in delivery_status and the recorded times.
  const departed = r => Number.isFinite(stamp(r[F.depart])) && stamp(r[F.depart]) <= stamp(frappe.datetime.now_datetime());
  const done = r => active(r) && r.docstatus === 1 && (r.status === 'Completed' || r.delivery_status === 'Delivered');
  const executed = r => active(r) && r.docstatus === 1 && (done(r) || r.status === 'In Transit' || r.delivery_status === 'Partially Delivered' || departed(r));
  const delivery = r => r[F.type] === 'Delivery Note';
  // Proof of receipt: the signed-note attachment is never filled in here, and teams tick one or two of receiver name, mobile, signature and stamp. Any one counts.
  const evidenceMissing = r => delivery(r) && RECEIPT.every(([f]) => r[f] !== 'Yes');
  const follow = r => executed(r) && delivery(r) && (r.delivery_status !== 'Delivered' || evidenceMissing(r));
  const stage = r => {
    if (!active(r)) return 'Cancelled';
    if (r.docstatus === 0 || r.status === 'Draft') return 'Awaiting submission';
    if (done(r)) return 'Completed';
    if (!executed(r)) return 'Scheduled';
    const now = stamp(frappe.datetime.now_datetime());
    if (stamp(r[F.exit]) <= now) return 'Site exit recorded';
    if (stamp(r[F.arrive]) <= now) return 'At site (inferred)';
    return 'In transit';
  };
  const issues = r => {
    const a = [];
    if (!active(r)) return a;
    if (!r.driver) a.push('Assign driver');
    if (!r.vehicle) a.push('Assign vehicle');
    if (!r[F.date]) a.push('Delivery date missing');
    if (executed(r)) {
      if (!r[F.report] || !r[F.depart] || !r[F.arrive]) a.push('Trip timestamps incomplete');
      if (done(r) && !r[F.exit]) a.push('Site exit missing');
    }
    if (executed(r) || (r.docstatus === 0 && r[F.depart])) {
      const sequence = [r[F.report], r[F.depart], r[F.arrive], r[F.exit]].filter(Boolean);
      if (sequence.some((t,i) => !Number.isFinite(stamp(t)) || (i && stamp(t) < stamp(sequence[i-1])))) a.push('Review timestamp order');
    }
    if (follow(r)) {
      if (r.delivery_status !== 'Delivered') a.push(r.delivery_status || 'Delivery status unknown');
      if (evidenceMissing(r)) a.push('No proof of receipt');
    }
    return a;
  };

  // ---- presentation helpers (no business rules below this line) ----
  const urgent = i => /^Assign |order|Delivery date missing/.test(i);
  const lane = r => {
    if (!active(r)) return 'none';
    const list = issues(r);
    if (list.some(urgent)) return 'bad';
    if (list.length) return 'warn';
    if (executed(r) && !done(r)) return 'info';
    if (done(r)) return 'good';
    return 'none';
  };
  const byDeparture = (a, b) => String(a[F.depart] || '9').localeCompare(String(b[F.depart] || '9')) || a.name.localeCompare(b.name);
  const bySeverity = (a, b) => issues(b).filter(urgent).length - issues(a).filter(urgent).length || issues(b).length - issues(a).length || byDeparture(a, b);
  const link = (doctype, name, text) => name ? `<a href="/app/${doctype}/${encodeURIComponent(name)}">${esc(text || name)}</a>` : '';
  const badge = (text, tone) => `<span class="fo-badge fo-${tone || 'neutral'}"><i aria-hidden="true"></i>${esc(text || 'Unknown')}</span>`;
  const tripState = r => !active(r) ? 'Cancelled' : r.docstatus === 0 ? 'Draft' : done(r) ? 'Delivered' : 'Submitted';
  const statusBadge = r => badge(tripState(r), {Delivered:'good',Submitted:'info'}[tripState(r)] || 'neutral');
  const deliveryBadge = r => executed(r) && delivery(r) && !done(r)
    ? badge(r.delivery_status || 'Not recorded', r.delivery_status === 'Delivered' ? 'good' : r.delivery_status === 'Partially Delivered' ? 'warn' : r.status === 'Completed' ? 'bad' : 'neutral') : '';
  const dayLabel = d => {
    const today = frappe.datetime.get_today();
    if (d === today) return 'Today';
    if (d === shift(today, 1)) return 'Tomorrow';
    if (d === shift(today, -1)) return 'Yesterday';
    return `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}${d.slice(0, 4) === today.slice(0, 4) ? '' : ' ' + d.slice(0, 4)}`;
  };
  const when = v => {
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(v || ''))) return '';
    return `${dayLabel(day(v))}${v.length > 10 ? ', ' + String(v).slice(11, 16) : ''}`;
  };
  const recorded = v => Number.isFinite(stamp(v)) && stamp(v) <= stamp(frappe.datetime.now_datetime());
  const journey = r => {
    const on = STEPS.filter(([, f]) => recorded(r[f])).map(([l]) => l), off = STEPS.filter(([, f]) => !recorded(r[f])).map(([l]) => l);
    return `<span class="fo-journey" role="img" aria-label="${esc(`Recorded: ${on.join(', ') || 'none'}. Not recorded: ${off.join(', ') || 'none'}.`)}">${STEPS.map(([, f]) => `<i class="${recorded(r[f]) ? 'on' : ''}"></i>`).join('')}</span>`;
  };
  const icons = {
    search: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    filter: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    truck: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M2 5.5h9v7H2zM11 8h3.6l2.4 2.6v1.9H11z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="14" r="1.6" fill="currentColor"/><circle cx="14" cy="14" r="1.6" fill="currentColor"/></svg>',
    box: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5zM3 6.5l7 3.5 7-3.5M10 10v7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    fit: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>'
  };

  // ---- summary helpers (pure) ----
  const pct = (n, t) => t ? Math.round(100 * n / t) : 0;
  const diffDays = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5);
  const isPlanned = r => active(r) && r.docstatus === 0; // drafts: trips logged but not yet submitted
  const tally = (list, keyOf) => { const m = new Map(); list.forEach(r => { const k = keyOf(r); if (k != null) m.set(k, (m.get(k) || 0) + 1); }); return m; };
  const clashes = planned => {
    const pairs = [], assigned = new Map(), seen = new Set();
    for (const b of planned) {
      if (!b[F.depart]) continue;
      for (const kind of ['vehicle', 'driver']) {
        if (!b[kind]) continue;
        const key = JSON.stringify([kind, b[kind], b[F.depart]]), a = assigned.get(key);
        if (a && pairs.length < 100) {
          const pairKey = JSON.stringify([a.name, b.name].sort());
          if (!seen.has(pairKey)) { pairs.push([a, b, kind, b[kind]]); seen.add(pairKey); }
        }
        if (!a) assigned.set(key, b);
      }
    }
    return pairs;
  };
  // Time buckets: daily up to 31 days, weekly beyond that (latest 16 weeks).
  const buckets = (rows, today) => {
    const dated = rows.filter(r => /^\d{4}-\d{2}-\d{2}/.test(r[F.date] || ''));
    if (!dated.length) return { list: [], weekly: false };
    const days = dated.map(r => day(r[F.date])).sort(), lo = days[0], hi = days[days.length - 1];
    const weekly = diffDays(lo, hi) > 30, start = d => weekly ? shift(d, -((new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7)) : d;
    const map = new Map();
    for (let d = start(lo); d <= start(hi); d = shift(d, weekly ? 7 : 1)) map.set(d, { key: d, good: 0, info: 0, neutral: 0 });
    dated.forEach(r => { const b = map.get(start(day(r[F.date]))); if (b) b[done(r) ? 'good' : 'neutral']++; });
    const list = [...map.values()].slice(weekly ? -16 : -31).map(b => ({ ...b, total: b.good + b.info + b.neutral, today: weekly ? start(today) === b.key : b.key === today }));
    return { list, weekly };
  };
  const stackHTML = (parts, label) => {
    const total = parts.reduce((s, p) => s + p.n, 0);
    return `<div class="fo-stack" role="img" aria-label="${esc(label + ': ' + parts.map(p => `${p.label} ${p.n}`).join(', '))}">${total ? parts.filter(p => p.n).map(p => `<i data-tone="${p.tone}" style="flex:${p.n}"></i>`).join('') : '<i data-tone="empty" style="flex:1"></i>'}</div>
      <ul class="fo-legend">${parts.map(p => `<li><i data-tone="${p.tone}" aria-hidden="true"></i><span>${esc(p.label)}</span><strong>${p.n}</strong><em>${pct(p.n, total)}%</em></li>`).join('')}</ul>`;
  };
  const meterHTML = (label, n, total, goodWhenFull = true) => {
    const p = pct(n, total), tone = total === 0 ? 'empty' : p === 100 && goodWhenFull ? 'good' : p >= 90 ? 'warn' : 'bad';
    return `<div class="fo-meter"><div><span>${esc(label)}</span><strong>${n} of ${total}</strong></div><span class="fo-track" data-tone="${tone}" role="img" aria-label="${esc(`${label}: ${n} of ${total}`)}"><i style="width:${p}%"></i></span></div>`;
  };
  const ringHTML = (n, total, caption) => {
    const C = 2 * Math.PI * 46, p = pct(n, total);
    return `<div class="fo-ring" role="img" aria-label="${esc(total ? `${caption}: ${n} of ${total}, ${p}%` : 'No executed delivery trips')}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="46" class="fo-ring-bg"/><circle cx="60" cy="60" r="46" class="fo-ring-fg" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/></svg><div><strong>${total ? p + '%' : '–'}</strong><span>${total ? 'complete' : 'no data'}</span></div></div>`;
  };
  const colsHTML = (b, label) => {
    if (!b.list.length) return `<div class="fo-empty">${esc(b.empty || 'No dated trips in this range.')}</div>`;
    const top = Math.max(1, ...b.list.map(x => x.total));
    return `<div class="fo-cols" role="img" aria-label="${esc(label + ': ' + b.list.map(x => `${b.weekly ? 'week of ' : ''}${dayLabel(x.key)} ${x.total}`).join(', '))}">${b.list.map(x => {
      const seg = t => x[t] ? `<i data-tone="${t}" style="height:${(100 * x[t] / top).toFixed(1)}%"></i>` : '';
      return `<div class="fo-col${x.today ? ' is-today' : ''}" title="${esc(`${dayLabel(x.key)}: ${x.total}`)}"><span class="fo-col-n">${x.total || ''}</span><div class="fo-col-bar">${seg('good')}${seg('info')}${seg('neutral')}</div><span class="fo-col-l">${+x.key.slice(8, 10)}</span><small>${b.weekly || +x.key.slice(8, 10) === 1 || x === b.list[0] ? MONTHS[+x.key.slice(5, 7) - 1] : '&nbsp;'}</small></div>`;
    }).join('')}</div><p class="fo-legend-line"><i data-tone="good"></i>${b.legend || `Delivered <i data-tone="neutral"></i>Draft or not delivered${b.weekly ? ' · weekly totals' : ''}`}</p>`;
  };
  const barsHTML = (entries, total, none = 'No data in this range.', max = 5) => {
    if (!entries.length) return `<div class="fo-empty">${esc(none)}</div>`;
    const top = Math.max(1, ...entries.map(e => e[1])), shown = entries.slice(0, max), rest = entries.slice(max).reduce((s, e) => s + e[1], 0);
    if (rest) shown.push([`${entries.length - max} ${entries.length - max === 1 ? 'other' : 'others'}`, rest]);
    return `<ul class="fo-bars">${shown.map(([k, n, tone]) => `<li><span title="${esc(k)}">${esc(k)}</span><span class="fo-track" ${tone ? `data-tone="${tone}"` : ''} role="img" aria-label="${n} of ${total}"><i style="width:${(100 * n / top).toFixed(1)}%"></i></span><strong>${n}</strong></li>`).join('')}</ul>`;
  };


  // ---- live map and vehicle documents (pure helpers) ----
  // Where a vehicle is believed to be on a trip. Trips here are logged after the move with times pre-filled, so "ongoing" means
  // departed within the last 24 hours and not yet recorded as leaving the site; the GPS fix shows whether the vehicle is really moving.
  const DAY_MS = 864e5;
  const tripPhase = (r, today, now) => {
    if (!active(r) || !r.vehicle) return null;
    const dep = stamp(r[F.depart]), ex = stamp(r[F.exit]), arr = stamp(r[F.arrive]), d = day(r[F.date] || r[F.depart]);
    if (!done(r) && Number.isFinite(dep) && dep <= now && now - dep <= DAY_MS && !(Number.isFinite(ex) && ex <= now)) return Number.isFinite(arr) && arr <= now ? 'At destination' : 'On the road';
    if (!done(r) && (Number.isFinite(dep) ? dep > now : !!d && d >= today)) return 'Upcoming';
    // Trips here are usually logged after the move, so a trip dated today whose times are all in the past is shown as finished rather than dropped.
    return d === today ? 'Finished today' : null;
  };
  const isOngoing = ph => ph === 'On the road' || ph === 'At destination';
  // One trip per vehicle: an ongoing trip wins, otherwise the one leaving soonest.
  const mapTrips = (rows, today, now) => {
    const best = new Map();
    rows.forEach(r => {
      const ph = tripPhase(r, today, now); if (!ph) return;
      const cur = best.get(r.vehicle), rank = isOngoing(ph) ? 0 : ph === 'Upcoming' ? 1 : 2;
      if (!cur || rank < cur.rank || (rank === cur.rank && String(r[F.depart] || '9') < String(cur.trip[F.depart] || '9'))) best.set(r.vehicle, { vehicle: r.vehicle, trip: r, phase: ph, rank });
    });
    return [...best.values()].sort((a, b) => a.rank - b.rank || String(a.trip[F.depart] || '9').localeCompare(String(b.trip[F.depart] || '9')) || a.vehicle.localeCompare(b.vehicle));
  };
  const toFix = log => {
    const lat = parseFloat(log.latitude), lng = parseFloat(log.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
    return { lat, lng, at: log.track_date_time || '', speed: num(log.speed), ignition: /^(1|true|on|yes)$/i.test(String(log.ignition == null ? '' : log.ignition)), place: log.location || '', distance: log.distance };
  };
  const minutesSince = (v, now) => Number.isFinite(stamp(v)) ? Math.max(0, Math.round((now - stamp(v)) / 60000)) : null;
  const agoText = m => m === null ? 'No fix' : m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min ago` : `${Math.floor(m / 1440)} d ago`;
  const FRESH_MIN = 15; // a fix older than this no longer shows where the vehicle is
  // Web Mercator, 256 px tiles.
  const mercX = (lng, z) => (lng + 180) / 360 * Math.pow(2, z) * 256;
  const mercY = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z) * 256; };
  const unMercX = (x, z) => x / (Math.pow(2, z) * 256) * 360 - 180;
  const unMercY = (y, z) => { const n = Math.PI - 2 * Math.PI * y / (Math.pow(2, z) * 256); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };
  const fitView = (pts, w, h) => {
    if (!pts.length) return { lat: 24.7, lng: 46.7, z: 5 };
    const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng), la0 = Math.min(...lats), la1 = Math.max(...lats), ln0 = Math.min(...lngs), ln1 = Math.max(...lngs);
    let z = 15;
    for (; z > 3; z--) if (mercX(ln1, z) - mercX(ln0, z) <= w - 120 && mercY(la0, z) - mercY(la1, z) <= h - 120) break;
    return { lat: (la0 + la1) / 2, lng: (ln0 + ln1) / 2, z };
  };
  const VEH_FIELDS = { core: ['name', 'license_plate'], optional: ['custom_vehicle_status', 'vehicle_service_type'] };
  // Utilisation: goods-carriage vehicles plus anything that made a trip in the loaded window.
  const utilisation = (vehicles, trips, today, from, to) => {
    const inWin = trips.filter(r => active(r) && r.vehicle), usedIn = new Set(inWin.filter(r => { const d = day(r[F.date]); return d >= from && d <= to; }).map(r => r.vehicle)), everUsed = new Set(inWin.map(r => r.vehicle));
    const scope = vehicles.filter(v => v.vehicle_service_type === 'Goods Carriage Vehicle' || everUsed.has(v.name));
    const last = new Map(); inWin.forEach(r => { const d = day(r[F.date]); if (d && (!last.has(r.vehicle) || d > last.get(r.vehicle))) last.set(r.vehicle, d); });
    const idle = scope.filter(v => !usedIn.has(v.name)).map(v => ({ vehicle: v.name, plate: v.license_plate || v.name, last: last.get(v.name) || '' })).sort((a, b) => String(a.last || '0').localeCompare(String(b.last || '0')) || a.vehicle.localeCompare(b.vehicle));
    return { scope: scope.length, used: scope.length - idle.length, idle, fleet: vehicles.length };
  };
  // Request-to-order delay from the Procurement Tracker report (one row per item; a request counts as ordered at its first order date).
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const DELAY_BUCKETS = [['Same day', d => d === 0, ''], ['1 to 3 days', d => d >= 1 && d <= 3, ''], ['4 to 7 days', d => d >= 4 && d <= 7, ''], ['8 to 14 days', d => d >= 8 && d <= 14, 'warn'], ['Over 14 days', d => d > 14, 'bad']];
  const delayStats = (rows, today) => {
    const by = new Map();
    rows.forEach(r => {
      const no = r.material_request_no; if (!no) return;
      const m = by.get(no) || { no, date: r.material_request_date, status: r.status, cc: r.cost_center || 'Not set', po: '' };
      const pd = /^\d{4}-\d{2}-\d{2}/.test(r.purchase_order_date || '') ? day(r.purchase_order_date) : '';
      if (pd && (!m.po || pd < m.po)) m.po = pd;
      by.set(no, m);
    });
    const reqs = [...by.values()].filter(m => /^\d{4}-\d{2}-\d{2}/.test(m.date || '') && !['Cancelled', 'Stopped', 'Rejected'].includes(m.status));
    const ordered = reqs.filter(m => m.po).map(m => ({ ...m, days: diffDays(day(m.date), m.po) })).filter(m => m.days >= 0);
    const waiting = reqs.filter(m => !m.po).map(m => ({ ...m, age: diffDays(day(m.date), today) }));
    const days = ordered.map(m => m.days), cc = new Map();
    ordered.forEach(m => { const c = cc.get(m.cc) || []; c.push(m.days); cc.set(m.cc, c); });
    return {
      requests: reqs.length, ordered: ordered.length, waiting: waiting.length, waitingOld: waiting.filter(m => m.age > 7).length,
      median: median(days), within3: days.length ? pct(days.filter(d => d <= 3).length, days.length) : null,
      buckets: DELAY_BUCKETS.map(([k, f, tone]) => [k, days.filter(f).length, tone]).filter(b => b[1]),
      slow: [...cc].filter(([, v]) => v.length >= 2).map(([k, v]) => [k, Math.round(10 * v.reduce((s, x) => s + x, 0) / v.length) / 10, v.length]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    };
  };
  const rowsOf = (res) => { // report rows may be dicts or arrays
    const m = (res && res.message) || {}, cols = m.columns || [], out = m.result || [];
    return out.filter(r => r && !(Array.isArray(r) && r.length === 0)).map(r => Array.isArray(r) ? Object.fromEntries(cols.map((c, i) => [c.fieldname || c.fieldName, r[i]])) : r);
  };
  // Needs-attention counts shown on the Fleet / Procurement switch.
  const fleetAttention = rows => rows.filter(r => active(r) && (follow(r) || !r.driver || !r.vehicle || issues(r).some(i => /timestamp/i.test(i))));

  // ---- procurement logistics (read-only). Every field name below was checked against the ERP schema. ----
  const PTABS = ['Overview', 'Orders & suppliers', 'Receiving & billing', 'Purchase requests'];
  const PO = {
    stage: 'custom_shipment_status', eta: 'custom_estimated_arrival_time', kind: 'custom_supplier_type', buyer: 'custom_purchaser_name',
    docs: 'custom_clearing_document_status', customs: 'custom_customs_status', charges: 'custom_customs_charges', paid: 'custom_customs_charges_paid',
    transit: 'custom_goods_in_transit_', toLoad: 'custom_to_be_loaded', bl: 'custom_original_bl_status', saber: 'custom_saber_status',
    agent: 'custom_agent_soft_copy_status', material: 'custom_material_status', place: 'custom_delivery_location'
  };
  const CHECKS = [['Price', 'custom_price_verification'], ['HS code', 'custom_hs_code_verification'], ['BL invoice', 'custom_bl_invoice_verification'], ['BL weight', 'custom_bl_weight_varification'], ['Original BL', PO.bl]];
  const STAGES = ['Order Received', 'Order Processing', 'Awaiting Pickup', 'Shipped Partial Qty', 'Shipped Full Qty', 'In Transit', 'In Customs', 'Out for Delivery', 'Delivered', 'Shipment Delayed', 'Not updated'];
  const MOVING = ['Shipped Partial Qty', 'Shipped Full Qty', 'In Transit', 'In Customs', 'Out for Delivery'];
  const PO_OPEN_STATUS = ['To Receive and Bill', 'To Receive', 'On Hold'];
  // Core fields are filled in on live records and are read by every user who can read the doctype.
  // Optional fields are custom fields that may be restricted for some roles; if the server refuses any of them, the dashboard retries with core fields only.
  const PO_CORE = ['name', 'docstatus', 'status', 'company', 'supplier', 'supplier_name', 'transaction_date', 'schedule_date', 'per_received', 'per_billed', 'base_grand_total', 'currency', 'modified'];
  const PO_FIELDS = { core: PO_CORE, optional: [PO.buyer, PO.kind, PO.place, ...new Set([PO.stage, PO.eta, PO.docs, PO.customs, PO.charges, PO.paid, PO.transit, PO.toLoad, ...CHECKS.map(c => c[1])])] };
  const MR_FIELDS = { core: ['name', 'docstatus', 'status', 'company', 'material_request_type', 'transaction_date', 'schedule_date', 'per_ordered', 'per_received', 'modified'], optional: ['custom_priority', 'custom_purchase_type', 'custom_purpose_of_purchase'] };
  const PR_FIELDS = { core: ['name', 'docstatus', 'status', 'company', 'supplier', 'supplier_name', 'posting_date', 'posting_time', 'per_billed', 'is_return', 'base_grand_total', 'modified'], optional: ['custom_purchaser_name'] };
  // Native reports and lists the dashboard links to. Names were confirmed in the ERP; a Report Builder report also needs its DocType.
  const LINKS = {
    fleet: [['report', 'Daily Delivery Trips'], ['report', 'Delivery Trip Time Tracker'], ['report', 'Delivery Status Report'], ['report', 'Vehicle Daily Report'], ['report', 'Vehicle Idle summary Report'],
      ['list', 'Delivery Trip'], ['list', 'Delivery Note'], ['list', 'Vehicle'], ['list', 'Driver']],
    procurement: [['report', 'Procurement Tracker'], ['report', 'Critical PO'], ['report', 'Pending PO Analysis'], ['report', 'PO analysis - transit Report'],
      ['report', 'PO Analysis Report - SYSS'], ['report', 'Procurement Consolidated Report'], ['report', 'Procurement and Logistic Expiry'], ['report', 'Procurement Daily Report'],
      ['list', 'Purchase Order'], ['list', 'Material Request'], ['list', 'Purchase Receipt'], ['list', 'Landed Cost Voucher'],
      ['list', 'Purchase Price Comparison'], ['list', 'Procurement and Logistics Renewals'], ['list', 'Procurement Daily Reports'], ['list', 'Agent Clearance']]
  };
  const LIST_FALLBACK = {
    'Delivery Trip': self => ({ [F.date]: ['between', [self.value('from'), self.value('to')]] }),
    'Purchase Order': () => ({ docstatus: 1, status: ['in', PO_OPEN_STATUS] }),
    'Material Request': () => ({ material_request_type: 'Purchase', status: ['in', ['Pending', 'Partially Ordered']] }),
    'Purchase Receipt': (self, today) => ({ posting_date: ['>=', shift(today, -29)] })
  };
  const num = v => Number(v) || 0;
  const compact = n => { const a = Math.abs(n); return a >= 1e6 ? `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M` : a >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)); };
  const sumOf = (list, f) => list.reduce((s, r) => s + num(r[f]), 0);
  const poDraft = r => r.docstatus === 0;
  const poOpen = r => r.docstatus === 1 && PO_OPEN_STATUS.includes(r.status) && num(r.per_received) < 100;
  const poForeign = r => r[PO.kind] === 'Foreign';
  const poStage = r => r[PO.stage] || 'Not updated';
  const poMoving = r => MOVING.includes(r[PO.stage]);
  const poDue = r => r[PO.eta] || r.schedule_date || '';
  const poLate = (r, today) => { const d = poDue(r); return !!d && d < today; };
  const etaMissing = r => poMoving(r) && !r[PO.eta];
  const inCustoms = r => r[PO.stage] === 'In Customs' || r[PO.customs] === 'Under Inspection';
  const chargesDue = r => num(r[PO.charges]) > 0 && !num(r[PO.paid]);
  const docMismatch = r => CHECKS.some(([, f]) => r[f] === 'Not Matching');
  const docsPending = r => poForeign(r) && poMoving(r) && (!r[PO.docs] || r[PO.docs] === 'Documents in courier');
  const arrivedUnposted = r => (r[PO.stage] === 'Delivered' || r[PO.material] === 'Landed') && num(r.per_received) < 100;
  const foreignShipment = r => poForeign(r) && (poMoving(r) || inCustoms(r) || r[PO.stage] === 'Shipment Delayed');
  // Pipeline groups come from fields that are filled in on every order: required date and receiving progress.
  const poBuyer = r => r[PO.buyer] || '';
  // Most open orders in this ERP are long past their required date, so lateness is split: recent (act now) and stale (probably needs closing).
  const STALE_DAYS = 30;
  const lateDays = (r, today) => { const d = poDue(r); return d && d < today ? diffDays(day(d), today) : 0; };
  const poStale = (r, today) => lateDays(r, today) > STALE_DAYS;
  const poGroup = (r, today) => !today ? 'Awaiting delivery' : poStale(r, today) ? 'Stale' : poLate(r, today) ? 'Late' : num(r.per_received) > 0 ? 'Partly received' : 'Awaiting delivery';
  const billedAhead = r => num(r.per_billed) > num(r.per_received) + 0.5;
  const stageTone = s => ({ 'Shipment Delayed': 'bad', 'In Customs': 'warn', 'Out for Delivery': 'good', Delivered: 'good', 'In Transit': 'info', 'Shipped Full Qty': 'info', 'Shipped Partial Qty': 'info' }[s] || 'neutral');
  const poIssues = (r, today) => {
    if (poDraft(r)) return ['Awaiting approval'];
    if (!poOpen(r)) return [];
    const a = [];
    if (r.status === 'On Hold') a.push('On hold');
    if (poStale(r, today)) a.push('Stale, over 30 days late'); else if (poLate(r, today)) a.push(num(r.per_received) > 0 ? 'Past due, partly received' : 'Past due, nothing received'); else if (!poDue(r)) a.push('No required date');
    if (billedAhead(r)) a.push('Billed ahead of receipt');
    if (r[PO.stage] === 'Shipment Delayed') a.push('Shipment delayed');
    if (arrivedUnposted(r)) a.push('Arrived, receipt not posted');
    if (etaMissing(r)) a.push('ETA missing on shipped order');
    if (docsPending(r)) a.push('Documents not received');
    if (docMismatch(r)) a.push('Document mismatch');
    if (r[PO.customs] === 'Under Inspection') a.push('Under customs inspection');
    if (chargesDue(r)) a.push('Customs charges unpaid');
    return a;
  };
  const urgentP = i => /^Past due|delayed|mismatch|^Arrived/.test(i);
  const poLane = (r, today) => { const l = poIssues(r, today); return l.some(urgentP) ? 'bad' : l.length ? 'warn' : poMoving(r) ? 'info' : 'none'; };
  const byDue = (a, b) => String(poDue(a) || '9').localeCompare(String(poDue(b) || '9')) || a.name.localeCompare(b.name);
  const bySeverityP = today => (a, b) => poIssues(b, today).filter(urgentP).length - poIssues(a, today).filter(urgentP).length || poIssues(b, today).length - poIssues(a, today).length || byDue(a, b);
  const mrOpen = r => r.docstatus === 1 && r.material_request_type === 'Purchase' && ['Pending', 'Partially Ordered'].includes(r.status);
  const mrNoPO = r => num(r.per_ordered) === 0;
  const mrAge = (r, today) => /^\d{4}-\d{2}-\d{2}/.test(r.transaction_date || '') ? diffDays(day(r.transaction_date), today) : null;
  const mrIssues = (r, today) => {
    const a = [], age = mrAge(r, today);
    if (r.schedule_date && r.schedule_date < today) a.push('Past required date');
    if (r.custom_priority === 'High' && mrNoPO(r)) a.push('High priority, no PO yet'); else if (mrNoPO(r) && age !== null && age > 7) a.push('No PO after 7 days');
    return a;
  };
  const urgentM = i => /^Past|^High/.test(i);
  const mrLane = (r, today) => { const l = mrIssues(r, today); return l.some(urgentM) ? 'bad' : l.length ? 'warn' : 'none'; };
  const bySeverityM = today => (a, b) => mrIssues(b, today).filter(urgentM).length - mrIssues(a, today).filter(urgentM).length || mrIssues(b, today).length - mrIssues(a, today).length || String(a.transaction_date || '9').localeCompare(String(b.transaction_date || '9')) || a.name.localeCompare(b.name);
  const dueNote = (d, today) => { if (!d) return 'No date set'; const n = diffDays(today, d); return n === 0 ? 'Due today' : n > 0 ? `In ${plural(n, 'day')}` : `${plural(-n, 'day')} late`; };
  // Arrivals over the next N days (by ETA, else required date). Past-due orders are counted separately.
  const dueBuckets = (rows, today, span = 14) => {
    const list = Array.from({ length: span }, (_, i) => ({ key: shift(today, i), good: 0, info: 0, neutral: 0, total: 0, today: i === 0 })), map = new Map(list.map(b => [b.key, b]));
    rows.forEach(r => { const b = map.get(day(poDue(r))); if (b) { b[poMoving(r) ? 'info' : num(r.per_received) > 0 ? 'good' : 'neutral']++; b.total++; } });
    return { list, weekly: false, legend: 'Partly received <i data-tone="info"></i>Shipped <i data-tone="neutral"></i>Nothing received yet', empty: 'Nothing is due in this window.' };
  };
  const receiptBuckets = (rows, today, span = 14) => {
    const list = Array.from({ length: span }, (_, i) => ({ key: shift(today, i - span + 1), good: 0, info: 0, neutral: 0, total: 0, today: i === span - 1 })), map = new Map(list.map(b => [b.key, b]));
    rows.forEach(r => { const b = map.get(day(r.posting_date)); if (b) { b[r.is_return ? 'neutral' : 'good']++; b.total++; } });
    return { list, weekly: false, legend: 'Receipts <i data-tone="neutral"></i>Returns', empty: 'No receipts in this window.' };
  };
  const issueChips = (list, urgent) => list.length ? `<div class="fo-issues">${list.map(i => `<span class="${urgent(i) ? 'fo-bad' : 'fo-warn'}">${esc(i)}</span>`).join('')}</div>` : '<span class="fo-muted">On track</span>';
  const dueCell = (d, today, label) => d ? `<time datetime="${esc(d)}"><strong>${esc(dayLabel(d))}</strong><span>${esc(label ? label + ', ' : '')}${esc(dueNote(d, today).toLowerCase())}</span></time>` : '<span class="fo-muted">No date set</span>';
  // One entry per capped table: its DocType, head, row cells and lane colour. Cells use the same data-slot names as the fleet table so the mobile card layout is shared.
  const PSPEC = {
    po: { doctype: 'Purchase Order', slug: 'purchase-order', noun: 'orders', label: 'Orders', head: ['Order', 'Supplier', 'Buyer', 'Due', 'Receiving', 'Needs action'], lane: poLane,
      cells: (r, today) => `<td data-slot="trip">${link('purchase-order', r.name)}<small>${esc(r[PO.kind] || 'Supplier type not set')}${poDraft(r) ? ' (draft)' : ''}</small></td>
        <td data-slot="route"><span>${esc(r.supplier_name || r.supplier)}</span><small>${esc(r.company)}</small></td>
        <td data-slot="who" data-label="Buyer"><div class="fo-who"><span>${esc(poBuyer(r) || 'Not set')}</span><small>${esc(r[PO.place] || '')}</small></div></td>
        <td data-slot="when" data-label="Due">${dueCell(poDue(r), today, r[PO.eta] ? 'ETA' : 'Required')}</td>
        <td data-slot="status">${poDraft(r) ? badge('Awaiting approval', 'neutral') : r.status === 'On Hold' ? badge('On hold', 'warn') : poMoving(r) ? badge(poStage(r), stageTone(r[PO.stage])) : badge(Math.round(num(r.per_received)) + '% received', num(r.per_received) > 0 ? 'info' : 'neutral')}<small>${Math.round(num(r.per_billed))}% billed${r.base_grand_total ? ', ' + compact(num(r.base_grand_total)) : ''}</small></td>
        <td data-slot="next" data-label="Needs action">${issueChips(poIssues(r, today), urgentP)}</td>` },
    mr: { doctype: 'Material Request', slug: 'material-request', noun: 'requests', label: 'Purchase requests', head: ['Request', 'Type', 'Priority', 'Required', 'Status', 'Needs action'], lane: mrLane,
      cells: (r, today) => `<td data-slot="trip">${link('material-request', r.name)}<small>${esc(r.custom_purpose_of_purchase || 'Purpose not set')}</small></td>
        <td data-slot="route"><span>${esc(r.custom_purchase_type || 'Type not set')}</span><small>${esc(r.company)}</small></td>
        <td data-slot="who" data-label="Priority"><div class="fo-who"><span>${esc(r.custom_priority || 'Not set')}</span><small>${Math.round(num(r.per_ordered))}% ordered</small></div></td>
        <td data-slot="when" data-label="Required">${dueCell(r.schedule_date, today)}</td>
        <td data-slot="status">${badge(r.status, r.status === 'Partially Ordered' ? 'info' : 'neutral')}</td>
        <td data-slot="next" data-label="Needs action">${issueChips(mrIssues(r, today), urgentM)}</td>` },
    pr: { doctype: 'Purchase Receipt', slug: 'purchase-receipt', noun: 'receipts', label: 'Purchase receipts', head: ['Receipt', 'Supplier', 'Buyer', 'Received', 'Status', 'Billing'], lane: r => r.is_return ? 'warn' : r.status === 'Completed' ? 'good' : 'none',
      cells: r => `<td data-slot="trip">${link('purchase-receipt', r.name)}<small>${r.is_return ? 'Return' : 'Receipt'}</small></td>
        <td data-slot="route"><span>${esc(r.supplier_name || r.supplier)}</span><small>${esc(r.company)}</small></td>
        <td data-slot="who" data-label="Buyer"><div class="fo-who"><span>${esc(r.custom_purchaser_name || 'Not set')}</span></div></td>
        <td data-slot="when" data-label="Received"><time datetime="${esc(r.posting_date)}"><strong>${esc(String(r.posting_time || '').slice(0, 5) || '–')}</strong><span>${esc(dayLabel(day(r.posting_date)))}</span></time></td>
        <td data-slot="status">${badge(r.is_return ? 'Return' : r.status, r.is_return ? 'warn' : r.status === 'Completed' ? 'good' : ['To Bill', 'Partly Billed'].includes(r.status) ? 'info' : 'neutral')}</td>
        <td data-slot="next" data-label="Billing"><div class="fo-prog"><span class="fo-stage">${Math.round(num(r.per_billed))}% billed</span></div></td>` }
  };

  // ---- Arabic / RTL: a display-only translation pass. Business logic keeps its English keys; text is translated after each render. ----
  const AR = {
    '#':'#','+':'+','−':'−','©':'©','and':'و','complete':'مكتمل','contributors':'مساهمون','executed delivery trips':'رحلات توصيل منفذة',
    'Logistics Dashboard':'لوحة اللوجستيات','Fleet':'الأسطول','Procurement':'المشتريات','Export CSV':'تصدير CSV','Refresh':'تحديث','Reset':'إعادة ضبط','New trip':'رحلة جديدة','New purchase order':'أمر شراء جديد',
    'Dashboard section':'قسم اللوحة','Dashboard views':'أقسام اللوحة','Date range':'الفترة الزمنية','Today':'اليوم','Tomorrow':'غداً','Yesterday':'أمس','Next # days':'الـ # أيام القادمة','Last # days':'آخر # يوماً','All dates':'كل التواريخ','Includes undated backlog':'يشمل الرحلات بلا تاريخ',
    'From':'من','To':'إلى','Find trip, driver or vehicle':'ابحث عن رحلة أو سائق أو مركبة','Find order, supplier or request':'ابحث عن أمر أو مورد أو طلب','Filters':'تصفية','Date basis':'أساس التاريخ','Delivery date':'تاريخ التسليم','Departure time':'وقت المغادرة','All dates (including undated)':'كل التواريخ (بما فيها بلا تاريخ)',
    'Company':'الشركة','All permitted companies':'كل الشركات المسموحة','Trip type':'نوع الرحلة','All movements':'كل الحركات','Source warehouse':'مستودع المصدر','All sources':'كل المصادر','Trip status':'حالة الرحلة','All statuses':'كل الحالات','Delivery status':'حالة التسليم','All delivery statuses':'كل حالات التسليم',
    'Supplier type':'نوع المورد','Local and foreign':'محلي وأجنبي','Local':'محلي','Foreign':'أجنبي','Buyer':'المشتري','All buyers':'كل المشترين',
    'Overview':'نظرة عامة','Live map':'الخريطة المباشرة','Awaiting submission':'بانتظار الاعتماد','Vehicles & drivers':'المركبات والسائقون','Delivery follow-up':'متابعة التسليم','Performance':'الأداء','Orders & suppliers':'الطلبات والموردون','Receiving & billing':'الاستلام والفوترة','Purchase requests':'طلبات الشراء',
    'Trips':'الرحلات','Deliveries':'التوصيلات','Follow-up':'المتابعة','Time errors':'أخطاء الأوقات','Missing assignment':'نقص التعيين',
    'Customer delivery trips':'رحلات توصيل العملاء','Customer delivery trips, # oct to # nov':'رحلات توصيل العملاء، # أكتوبر إلى # نوفمبر','Draft trips to review and submit':'رحلات مسودة للمراجعة والاعتماد',
    'Not delivered or no proof of receipt, # oct to # nov':'لم تُسلَّم أو بلا إثبات استلام، # أكتوبر إلى # نوفمبر','Timestamps out of order, # oct to # nov':'أوقات غير مرتبة، # أكتوبر إلى # نوفمبر','Driver or vehicle not set, # oct to # nov':'السائق أو المركبة غير محددة، # أكتوبر إلى # نوفمبر',
    '# Oct to # Nov, # submitted':'# أكتوبر إلى # نوفمبر، # معتمدة','Trips in range':'الرحلات في الفترة','Trips in range: Draft #, Submitted #, Delivered #':'الرحلات في الفترة: مسودة #، معتمدة #، مُسلَّمة #','Draft':'مسودة','Submitted':'معتمدة','Delivered':'مُسلَّمة','# trips, # deliveries.':'# رحلات، # توصيلات.',
    'Fleet assignment':'تعيين الأسطول','Trips with a vehicle':'رحلات بمركبة','Trips with a driver':'رحلات بسائق','Trips with a vehicle: # of #':'رحلات بمركبة: # من #','Trips with a driver: # of #':'رحلات بسائق: # من #','# of #':'# من #','Vehicles used':'مركبات مستخدمة','Drivers used':'سائقون مستخدمون','Possible duplicates':'احتمال تكرار',
    'Delivery closure':'إغلاق التسليم','Not Delivered':'لم تُسلَّم','Partially Delivered':'سُلِّمت جزئياً','No proof of receipt':'بلا إثبات استلام','Delivered with proof of receipt: # of #, #%':'مُسلَّمة مع إثبات استلام: # من #، #%',
    'Trips per day':'الرحلات حسب اليوم','Trips per day: # Oct #, # Oct #, # Oct #, # Oct #, # Oct #, # Oct #, Yesterday #, Today #, Tomorrow #, # Oct #, # Nov #, # Nov #, # Nov #, # Nov #, # Nov #':'الرحلات حسب اليوم','Draft or not delivered':'مسودة أو غير مُسلَّمة','Needs attention':'تحتاج انتباهاً','Select a group to list its trips.':'اختر مجموعة لعرض رحلاتها.',
    'Assign driver':'تعيين سائق','Assign vehicle':'تعيين مركبة','Delivery date missing':'تاريخ التسليم مفقود','Trip timestamps incomplete':'أوقات الرحلة غير مكتملة','Site exit missing':'وقت الخروج من الموقع مفقود','Review timestamp order':'راجع ترتيب الأوقات','Delivery status unknown':'حالة التسليم غير معروفة',
    'Most urgent trips':'الرحلات الأكثر إلحاحاً','The most urgent trips first. Use the native list for everything else.':'الأكثر إلحاحاً أولاً. استخدم القائمة الأصلية لبقية الرحلات.','Trip':'الرحلة','Route':'المسار','Vehicle and driver':'المركبة والسائق','Departure':'المغادرة','Status':'الحالة','Needs action':'يتطلب إجراء',
    'No vehicle':'بلا مركبة','No driver':'بلا سائق','Previous':'السابق','Next':'التالي','Previous page':'الصفحة السابقة','Next page':'الصفحة التالية','Open in Delivery Trip list':'فتح في قائمة رحلات التوصيل','Open in Material Request list':'فتح في قائمة طلبات المواد','Open in Purchase Order list':'فتح في قائمة أوامر الشراء','Open in Purchase Receipt list':'فتح في قائمة استلامات الشراء','Open in Vehicle list':'فتح في قائمة المركبات','Open list':'فتح القائمة',
    'Delivery notes, # Oct to # Nov':'إشعارات التسليم، # أكتوبر إلى # نوفمبر','# submitted in range. # drafts, # waiting to be billed. Only DM vehicle notes need a trip.':'# معتمدة ضمن الفترة. # مسودات، # بانتظار الفوترة. إشعارات مركبات DM فقط تحتاج رحلة.','DM vehicle':'مركبة DM','Customer pickup':'استلام العميل','Rented vehicle':'مركبة مستأجرة',
    '# vehicles on an ongoing or upcoming trip, # vehicles used today.':'# مركبات في رحلة جارية أو قادمة، # مركبات استُخدمت اليوم.','Active':'نشط','Goods carriage':'نقل بضائع','Used today':'استُخدمت اليوم','Vehicles':'المركبات','Drivers':'السائقون','# drivers on file, active and inactive.':'# سائقاً مسجلاً، نشطين وغير نشطين.','On trips today':'في رحلات اليوم','No employee linked':'بلا موظف مرتبط',
    'Reports':'التقارير','Reports and lists':'التقارير والقوائم','Opens the native report in Desk, using your own permissions.':'يفتح التقرير الأصلي في سطح المكتب بصلاحياتك.','Opens the native report or list in Desk, using your own permissions.':'يفتح التقرير أو القائمة الأصلية في سطح المكتب بصلاحياتك.','Report':'تقرير','List':'قائمة',
    'Daily Delivery Trips':'رحلات التوصيل اليومية','Delivery Trip Time Tracker':'متتبع أوقات رحلات التوصيل','Delivery Status Report':'تقرير حالة التسليم','Vehicle Daily Report':'التقرير اليومي للمركبات','Vehicle Idle summary Report':'ملخص توقف المركبات','Delivery Trip':'رحلة توصيل','Delivery Note':'إشعار تسليم','Vehicle':'المركبة','Driver':'السائق',
    'Procurement Tracker':'متتبع المشتريات','Critical PO':'أوامر شراء حرجة','Pending PO Analysis':'تحليل أوامر الشراء المعلقة','PO analysis - transit Report':'تحليل أوامر الشراء - الشحن','PO Analysis Report - SYSS':'تقرير تحليل أوامر الشراء - SYSS','Procurement Consolidated Report':'التقرير الموحد للمشتريات','Procurement and Logistic Expiry':'انتهاء المشتريات واللوجستيات','Procurement Daily Report':'التقرير اليومي للمشتريات','Purchase Order':'أمر شراء','Material Request':'طلب مواد','Purchase Receipt':'استلام مشتريات','Landed Cost Voucher':'قسيمة تكلفة الاستيراد','Purchase Price Comparison':'مقارنة أسعار الشراء','Procurement and Logistics Renewals':'تجديدات المشتريات واللوجستيات','Procurement Daily Reports':'التقارير اليومية للمشتريات','Agent Clearance':'تخليص المندوب',
    '# of # loaded trips match your filters. Progress is inferred from recorded timestamps, not live location. Cancelled trips are left out of operational counts. Full records live in the Delivery Trip list.':'# من # رحلة محمّلة تطابق التصفية. يُستنتج التقدم من الأوقات المسجلة وليس من الموقع المباشر. الرحلات الملغاة مستبعدة من الأعداد التشغيلية. السجلات الكاملة في قائمة رحلات التوصيل.',
    '# trips loaded. Updated #:# site time.':'تم تحميل # رحلة. آخر تحديث #:# بتوقيت الموقع.','Updated #:# site time':'آخر تحديث #:# بتوقيت الموقع','# open orders and # purchase requests loaded. Updated #:# site time.':'تم تحميل # أمر مفتوح و# طلب شراء. آخر تحديث #:# بتوقيت الموقع.',
    'Positions come from the Vehicle Arabitra Logs tracker feed. Ongoing means a trip has departed in the last # hours and has no recorded site exit, so a vehicle can be listed here while parked. Map tiles from OpenStreetMap.':'المواقع من سجلات تتبع Arabitra للمركبات. «جارية» تعني أن الرحلة غادرت خلال آخر # ساعة بلا خروج مسجل من الموقع، لذا قد تظهر مركبة متوقفة هنا. خرائط OpenStreetMap.',
    '# orders, # requests and # receipts match your filters. Open orders are submitted Purchase Orders that are not fully received; drafts appear only under Needs attention. The supplier-type filter does not apply to receipts and the buyer filter does not apply to requests.':'# أمر و# طلب و# استلام تطابق التصفية. الأوامر المفتوحة هي أوامر شراء معتمدة لم تُستلم بالكامل؛ المسودات تظهر فقط ضمن «تحتاج انتباهاً». تصفية نوع المورد لا تنطبق على الاستلامات وتصفية المشتري لا تنطبق على الطلبات.',
    'Where vehicles are now':'أين المركبات الآن','Vehicles tracked':'مركبات متتبَّعة','Fit all vehicles':'عرض كل المركبات','Update positions':'تحديث المواقع','Show vehicles':'عرض المركبات','All':'الكل','Zoom in':'تكبير','Zoom out':'تصغير','Map of vehicles':'خريطة المركبات','OpenStreetMap':'OpenStreetMap',
    'On the road':'على الطريق','Upcoming':'قادمة','Parked':'متوقفة','Idle':'خاملة','No trip':'بلا رحلة','No signal':'بلا إشارة','No recent signal':'لا إشارة حديثة','Signal old':'إشارة قديمة','Last fix':'آخر تحديد موقع','Last known place':'آخر موقع معروف','# min ago':'قبل # دقيقة','# km/h':'# كم/س','# min':'# دقيقة',
    'Selected vehicle':'المركبة المحددة','Select a vehicle on the map or in the list to see its trip.':'اختر مركبة على الخريطة أو في القائمة لعرض رحلتها.','Select a row to centre the map on that vehicle.':'اختر صفاً لتوسيط الخريطة على المركبة.','Last fix over # minutes old, or none':'آخر تحديد موقع أقدم من # دقيقة أو لا يوجد',
    'Departed':'غادرت','Reported':'حضر','Arrived':'وصلت','Left site':'غادرت الموقع','Not recorded':'غير مسجل','Not yet departed':'لم تغادر بعد','Departed, no site exit recorded':'غادرت، بلا خروج مسجل','Site exit recorded':'تم تسجيل الخروج من الموقع','Finished today':'انتهت اليوم','Ongoing':'جارية','Ongoing trip':'رحلة جارية',
    'Draft trips':'رحلات المسودة','Drafts by day':'المسودات حسب اليوم','Oldest drafts':'أقدم المسودات','Oldest first. Submit each trip once its times and delivery status are confirmed.':'الأقدم أولاً. اعتمد كل رحلة بعد تأكيد أوقاتها وحالة تسليمها.','Of draft trips':'من رحلات المسودة',
    'Vehicle utilisation':'استخدام المركبات','Goods vehicles with a trip in range':'مركبات البضائع ذات رحلة في الفترة','Goods vehicles with a trip in range: # of #':'مركبات البضائع ذات رحلة في الفترة: # من #','Counts active goods-carriage vehicles, plus any vehicle that made a trip. # active vehicles in the fleet list.':'يشمل مركبات نقل البضائع النشطة وأي مركبة نفذت رحلة. # مركبة نشطة في قائمة الأسطول.','Every goods vehicle ran a trip in this range.':'كل مركبات البضائع نفذت رحلة في هذه الفترة.','Active fleet':'الأسطول النشط','Of # active vehicles':'من # مركبة نشطة','Drivers active':'سائقون نشطون','Ran trips':'نفذوا رحلات',
    'Trips per driver':'الرحلات لكل سائق','Trips per vehicle':'الرحلات لكل مركبة','Top # drivers.':'أعلى # سائقين.','Top # vehicles.':'أعلى # مركبات.','Latest trips':'أحدث الرحلات','Most recent departure first.':'أحدث مغادرة أولاً.','Review trip':'مراجعة الرحلة',
    'Open closures':'إغلاقات مفتوحة','# trips need follow-up':'# رحلات تحتاج متابعة','Why they are open':'سبب بقائها مفتوحة','A trip can appear under more than one reason.':'قد تظهر الرحلة تحت أكثر من سبب.','How long they have been open':'مدة بقائها مفتوحة','Days since delivery date.':'الأيام منذ تاريخ التسليم.','Oldest open closures':'أقدم الإغلاقات المفتوحة','No open closures.':'لا إغلاقات مفتوحة.','No deliveries need follow-up.':'لا توصيلات تحتاج متابعة.',
    'Proof of receipt means at least one of receiver name, mobile, signature or stamp is Yes. The signed delivery note attachment is not required.':'إثبات الاستلام يعني أن أحد الحقول: اسم المستلم أو جواله أو التوقيع أو الختم «نعم». مرفق إشعار التسليم الموقع غير مطلوب.','No receiver name, mobile, signature or stamp':'بلا اسم مستلم أو جوال أو توقيع أو ختم',
    'Execution measures':'مقاييس التنفيذ','Completed':'مكتملة','Completed trips':'الرحلات المكتملة','In this range':'في هذه الفترة','Warehouse wait':'الانتظار في المستودع','Travel':'السفر','Time on site':'الوقت في الموقع','Partial deliveries':'التسليمات الجزئية','Evidence complete':'الأدلة مكتملة','No data':'لا بيانات','No valid completed-trip samples':'لا عينات صالحة للرحلات المكتملة','No executed delivery trips':'لا رحلات توصيل منفذة','# of # executed delivery trips':'# من # رحلة توصيل منفذة','# samples':'# عينات','# sample':'# عينة',
    'Intervals are differences between recorded timestamps on submitted Completed trips, not verified durations. Missing or negative pairs are excluded.':'الفترات هي الفروق بين الأوقات المسجلة في الرحلات المكتملة المعتمدة وليست مدداً مؤكدة. الأزواج المفقودة أو السالبة مستبعدة.','Completed per day':'المكتملة حسب اليوم','Completed trips per day':'الرحلات المكتملة حسب اليوم','Busiest drivers':'أكثر السائقين نشاطاً','Busiest vehicles':'أكثر المركبات نشاطاً','Top # by completed trips.':'أعلى # حسب الرحلات المكتملة.','By movement':'حسب نوع الحركة','By source warehouse':'حسب مستودع المصدر','No completed trips in this range.':'لا رحلات مكتملة في هذه الفترة.','Unknown':'غير معروف',
    'Internal Transfer':'تحويل داخلي','Materials Collection from Supplier':'استلام مواد من المورد','Petrol':'وقود','Workshop':'ورشة','Between warehouses':'بين المستودعات','Internal transfers':'التحويلات الداخلية','Supplier collection trips':'رحلات استلام من الموردين','Supplier collection trips: Draft #, Submitted #, Delivered #':'رحلات الاستلام من الموردين: مسودة #، معتمدة #، مُسلَّمة #','Workshop, petrol and the rest':'الورشة والوقود وغيرها','Other':'أخرى','# others':'# أخرى','# more flags not shown.':'# تنبيهات أخرى غير معروضة.',
    '# Oct to # Nov. Delivery Trips of type Materials Collection from Supplier; customer deliveries are on the Fleet side.':'# أكتوبر إلى # نوفمبر. رحلات من نوع استلام مواد من المورد؛ توصيلات العملاء في قسم الأسطول.',
    'Scheduled':'مجدولة','Cancelled':'ملغاة','In transit':'في الطريق','At site (inferred)':'في الموقع (مستنتج)','Not delivered':'لم تُسلَّم','Partially delivered':'سُلِّمت جزئياً',
    'Recorded journey':'الرحلة المسجلة','Recorded fields can be prefilled, so this timeline does not confirm actual movement.':'قد تكون الحقول المسجلة معبأة مسبقاً، لذا لا يؤكد هذا الجدول الحركة الفعلية.','Recorded: Reported, Departed, Arrived, Left site. Not recorded: none.':'مسجل: حضر، غادر، وصل، غادر الموقع. غير مسجل: لا يوجد.','Delivery stops':'محطات التسليم','No delivery stops recorded.':'لا محطات تسليم مسجلة.','Delivery evidence':'أدلة التسليم','Receiver name':'اسم المستلم','Receiver mobile':'جوال المستلم','Signature':'التوقيع','Stamp':'الختم','Signed delivery note':'إشعار التسليم الموقع','Open attachment':'فتح المرفق','Review in trip':'راجع في الرحلة','Missing':'مفقود','Not set':'غير محدد','Not assigned':'غير معيّن','Source unknown':'المصدر غير معروف','Customer unknown':'عميل غير معروف','Address unknown':'عنوان غير معروف','No Delivery Note linked':'لا إشعار تسليم مرتبط','Movement':'الحركة','To review':'للمراجعة','Open Delivery Trip':'فتح رحلة التوصيل','Unable to open this trip. Check record permission.':'تعذر فتح هذه الرحلة. تحقق من صلاحية السجل.','No matching trips to export.':'لا رحلات مطابقة للتصدير.','No matching purchase orders to export.':'لا أوامر شراء مطابقة للتصدير.','Trip times all recorded':'كل أوقات الرحلة مسجلة','Delivery or evidence incomplete':'التسليم أو الأدلة غير مكتمل',
    'Open orders':'الأوامر المفتوحة','Open order value':'قيمة الأوامر المفتوحة','Open value':'القيمة المفتوحة','Past due':'متأخرة','Past due value':'قيمة المتأخرة','Past required date':'تجاوزت التاريخ المطلوب','Required date has passed':'تجاوزت التاريخ المطلوب','Draft orders':'أوامر المسودة','Pending requests':'الطلبات المعلقة','Value in motion':'قيمة قيد الشحن','Receipts posted':'الاستلامات المرحلة','Requests':'الطلبات','Receipts':'الاستلامات','Orders':'الأوامر','Order':'الأمر','Request':'الطلب','Receipt':'الاستلام',
    'Counts for the filtered orders and requests':'أعداد للأوامر والطلبات المصفاة','Counts for the selected range':'أعداد للفترة المحددة','Order totals in company currency.':'إجماليات الأوامر بعملة الشركة.','Company currency':'عملة الشركة','Order pipeline':'مراحل الأوامر','Order pipeline: Awaiting delivery #, Partly received #, Late #, Stale #':'مراحل الأوامر: بانتظار التوريد #، مستلمة جزئياً #، متأخرة #، راكدة #','Awaiting delivery':'بانتظار التوريد','Partly received':'مستلمة جزئياً','Late':'متأخرة','Stale':'راكدة','Stale value':'قيمة الراكدة','On track':'في الموعد','Nothing received yet':'لم يُستلم شيء بعد','Nothing ordered so far':'لم يُطلب شيء بعد',
    'Most urgent orders':'أوامر الشراء الأكثر إلحاحاً','The most urgent orders first. Use the native list for everything else.':'الأكثر إلحاحاً أولاً. استخدم القائمة الأصلية لبقية الأوامر.','Orders due per day':'الأوامر المستحقة حسب اليوم','Orders due, next # days':'الأوامر المستحقة، الـ # أيام القادمة','By required date, or ETA when set':'حسب التاريخ المطلوب أو الوصول المتوقع','Earliest first. The required date is used when no ETA is set.':'الأقرب أولاً. يُستخدم التاريخ المطلوب عند غياب الوصول المتوقع.','Due':'الاستحقاق','Next due':'الاستحقاق التالي','Due in # days':'مستحق خلال # أيام','Required':'المطلوب','Required, due today':'مطلوب، مستحق اليوم','Required, # days late':'مطلوب، متأخر # أيام','ETA, # days late':'الوصول المتوقع، متأخر # أيام','ETA, # day late':'الوصول المتوقع، متأخر # يوم','ETA, in # days':'الوصول المتوقع، خلال # أيام','# days late':'متأخر # أيام','# day late':'متأخر # يوم','in # days':'خلال # أيام','in # day':'خلال # يوم','Over # days late':'متأخر أكثر من # أيام','Over # days late, review or close':'متأخر أكثر من # أيام، راجع أو أغلق','Up to # days past required date':'حتى # أيام بعد التاريخ المطلوب','Stale, over # days late':'راكد، متأخر أكثر من # أيام','Past due, nothing received':'متأخر، لم يُستلم شيء','Past due, partly received':'متأخر، مستلم جزئياً','# past-due orders not shown here.':'# أوامر متأخرة غير معروضة هنا.','# orders past due, # purchase requests late or high priority':'# أوامر متأخرة، # طلبات شراء متأخرة أو عالية الأولوية',
    'Open orders by buyer':'الأوامر المفتوحة حسب المشتري','Top # by open orders.':'أعلى # حسب الأوامر المفتوحة.','Purchaser, else PO in charge.':'المشتري، وإلا المسؤول عن الأمر.','Suppliers with most open orders':'الموردون الأكثر أوامر مفتوحة','Supplier':'المورد','Waiting to bill':'بانتظار الفوترة','Waiting to bill, by supplier':'بانتظار الفوترة حسب المورد','Where open orders are to be received.':'أماكن استلام الأوامر المفتوحة.','Delivery location':'موقع التسليم',
    'Shipment tracking':'تتبع الشحنات','Orders with a shipment status, ETA or customs entry.':'أوامر لها حالة شحن أو وصول متوقع أو بيان جمركي.','Shipment delayed':'الشحنة متأخرة','Shipped':'تم الشحن','In Customs':'في الجمارك','In Transit':'في الطريق','Order Received':'تم استلام الطلب','Order Processing':'قيد المعالجة','Awaiting Pickup':'بانتظار الاستلام','Shipped Partial Qty':'شُحنت كمية جزئية','Shipped Full Qty':'شُحنت كمية كاملة','Out for Delivery':'خرجت للتسليم','Shipment Delayed':'الشحنة متأخرة','Not updated':'غير محدّث','Documents not received':'المستندات لم تصل','Awaiting approval':'بانتظار الموافقة','Needs a closing decision':'تحتاج قرار إغلاق','Stopped by the buyer':'أوقفها المشتري','Some items on a PO':'بعض بنود أمر الشراء',
    'Receiving':'الاستلام','Billing':'الفوترة','Receiving and billing':'الاستلام والفوترة','Received':'مستلم','Billed':'مفوتر','To Bill':'للفوترة','To bill':'للفوترة','Partly Billed':'مفوتر جزئياً','Fully billed':'مفوتر بالكامل','Billed early':'فُوتر مبكراً','Billed ahead of receipt':'فُوتر قبل الاستلام','Billed more than received':'فُوتر أكثر من المستلم','Invoice progress is higher than receiving progress.':'تقدم الفوترة أعلى من تقدم الاستلام.','Waiting over # days':'بانتظار أكثر من # أيام','Receipts in the last # days':'الاستلامات خلال آخر # يوماً','Receipts of the last # days.':'استلامات آخر # يوماً.','Receipts per day':'الاستلامات حسب اليوم','Receipts fully billed':'استلامات مفوترة بالكامل','Receipts fully billed: # of #':'استلامات مفوترة بالكامل: # من #','Latest receipts':'أحدث الاستلامات','Newest first.':'الأحدث أولاً.','Returns':'المرتجعات','Return':'مرتجع','Received, # days':'مستلم، # أيام','Open orders with goods received':'أوامر مفتوحة مستلم جزء منها','Open orders with goods received: # of #':'أوامر مفتوحة مستلم جزء منها: # من #','#% billed':'#% مفوتر','#% billed, #K':'#% مفوتر، #K','#% ordered':'#% مطلوب','#% received':'#% مستلم','#K in value':'#K بالقيمة','Status To Bill or Partly Billed':'الحالة: للفوترة أو مفوتر جزئياً',
    'Requests by priority':'الطلبات حسب الأولوية','Priority':'الأولوية','Priority set on the request.':'الأولوية المحددة في الطلب.','Priority set to High':'الأولوية عالية','High priority':'أولوية عالية','High priority, no PO yet':'أولوية عالية، بلا أمر شراء','High':'عالية','Medium':'متوسطة','Low':'منخفضة','Import':'استيراد','Import requests':'طلبات الاستيراد','Purchase type Import':'نوع الشراء: استيراد','Stock':'مخزون','Maintenance':'صيانة','Project':'مشروع','Pending':'معلق','Partially Ordered':'مطلوب جزئياً','Partly ordered':'مطلوب جزئياً','Not fully ordered':'غير مطلوب بالكامل','Purchase requests not fully ordered':'طلبات شراء غير مطلوبة بالكامل','No PO yet':'بلا أمر شراء','No PO after # days':'بلا أمر شراء بعد # أيام','Ordered in # days':'طُلب خلال # أيام','Time from request to first order':'الزمن من الطلب إلى أول أمر','How long requests have waited':'مدة انتظار الطلبات','Average':'المتوسط','Median days':'الوسيط بالأيام','Slowest cost centres':'أبطأ مراكز التكلفة','Average days to first order. Cost centres with at least # ordered requests; request count in brackets.':'متوسط الأيام إلى أول أمر. مراكز تكلفة لديها # طلبات مطلوبة على الأقل؛ عدد الطلبات بين قوسين.','Days since the request date.':'الأيام منذ تاريخ الطلب.','Urgent requests first, then the oldest.':'الطلبات العاجلة أولاً ثم الأقدم.','Oldest pending requests':'أقدم الطلبات المعلقة','No pending purchase requests.':'لا طلبات شراء معلقة.','Purchase requests, scrollable':'طلبات الشراء (قابلة للتمرير)','Orders, scrollable':'الأوامر (قابلة للتمرير)','Purchase receipts, scrollable':'استلامات المشتريات (قابلة للتمرير)','Trips, scrollable':'الرحلات (قابلة للتمرير)','Vehicles, scrollable':'المركبات (قابلة للتمرير)','Clear selection':'إلغاء التحديد','Reset filters':'إعادة ضبط التصفية',
    'Yes':'نعم','No':'لا','On hold':'معلق','To Receive':'للاستلام','To Receive and Bill':'للاستلام والفوترة','Completed ':'مكتمل','Order Received ':'تم استلام الطلب',
    '#–# of # trips':'عرض \u2066#–#\u2069 من # رحلة','#–# of # orders':'عرض \u2066#–#\u2069 من # أمر','#–# of # requests':'عرض \u2066#–#\u2069 من # طلب','#–# of # receipts':'عرض \u2066#–#\u2069 من # استلام','#–# of # vehicles':'عرض \u2066#–#\u2069 من # مركبة','Missing driver':'بلا سائق','Missing vehicle':'بلا مركبة','On a trip':'في رحلة','Progress':'التقدم','Type':'النوع','Timestamps out of order':'أوقات غير مرتبة','Over # days':'أكثر من # أيام','By delivery date.':'حسب تاريخ التسليم.','Last # days.':'آخر # يوماً.','Top # by receipts.':'أعلى # حسب الاستلامات.','# of # requests ordered. # still have no order. Requests from the last # days.':'# من # طلب تم طلبها. # بلا أمر شراء بعد. طلبات آخر # يوماً.','Trips with the same departure time and a shared vehicle or driver. Several delivery notes on one run can cause this legitimately.':'رحلات بنفس وقت المغادرة وتشترك في مركبة أو سائق. قد يحدث ذلك فعلاً عند وجود عدة إشعارات تسليم في جولة واحدة.','Riyadh':'الرياض','Jeddah':'جدة','Dammam':'الدمام','Submitted, not fully received':'معتمدة، لم تُستلم بالكامل','Assigned':'التعيين','Departs':'المغادرة','Needs action':'يتطلب إجراء','Due in # days':'مستحق خلال # أيام','Loading trips…':'جارٍ تحميل الرحلات…','Loading procurement data…':'جارٍ تحميل بيانات المشتريات…','Language':'اللغة','Jan':'يناير','Feb':'فبراير','Mar':'مارس','Apr':'أبريل','May':'مايو','Jun':'يونيو','Jul':'يوليو','Aug':'أغسطس','Sep':'سبتمبر','Oct':'أكتوبر','Nov':'نوفمبر','Dec':'ديسمبر',
    'Could not load trips. Check Delivery Trip read permission and custom field access, then select Refresh.':'تعذر تحميل الرحلات. تحقق من صلاحية قراءة رحلات التوصيل والحقول المخصصة ثم اضغط تحديث.','Choose a valid date range: the start date must be on or before the end date.':'اختر فترة صحيحة: يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساوياً له.','Loading permitted Delivery Trips…':'جارٍ تحميل رحلات التوصيل المسموحة…','Loading purchase orders, requests and receipts…':'جارٍ تحميل أوامر الشراء والطلبات والاستلامات…','Partial results: the 10,000-trip limit was reached, so counts cover loaded trips only. Narrow the date range.':'نتائج جزئية: تم بلوغ حد 10,000 رحلة، لذا تشمل الأعداد الرحلات المحمّلة فقط. ضيّق الفترة.','Partial data: narrow the date range.':'بيانات جزئية: ضيّق الفترة.','Could not load procurement data. Select Refresh to try again.':'تعذر تحميل بيانات المشتريات. اضغط تحديث للمحاولة مجدداً.','Partial results: the 5,000-record limit was reached for one list, so counts cover loaded records only. Use the native lists for the rest.':'نتائج جزئية: تم بلوغ حد 5,000 سجل لإحدى القوائم، لذا تشمل الأعداد السجلات المحمّلة فقط. استخدم القوائم الأصلية لبقية السجلات.'
  };
  const AR_RULES = [
    [/^Exported (\d+) (trips?|purchase orders?)(.*)$/s, (m, a, b, c) => `تم تصدير ${a} ${/trip/.test(b) ? 'رحلة' : 'أمر شراء'}${/partial/.test(c) ? ' (بيانات جزئية)' : ''}.`],
    [/^Could not read (.+)\. Check read permission and custom field access\. Figures that depend on it show a dash\.$/, (m, a) => `تعذرت قراءة ${a}. تحقق من صلاحية القراءة والحقول المخصصة. الأرقام المعتمدة عليه تظهر بشرطة.`],
    [/^Could not load procurement data\..*$/, () => AR['Could not load procurement data. Select Refresh to try again.']],
    [/^Some custom fields on (.+) are not readable for your role.*$/, (m, a) => `بعض الحقول المخصصة في ${a} غير مقروءة لدورك، لذا قد يظهر المشتري أو الموقع أو الأولوية «غير محدد».`],
    [/^\s*leave at (\d+:\d+) on (.+) and share (driver|vehicle) (.+)\.$/, (m, t, d, k, n) => `تغادر عند ${t} يوم ${tr(d.charAt(0).toUpperCase() + d.slice(1))} وتشترك في ${k === 'driver' ? 'السائق' : 'المركبة'} ${n}.`],
    [/^(.+) leave at (\d+:\d+) on (.+) and share (driver|vehicle) (.+)\.$/, (m, a, t, d, k, n) => `${a} تغادر عند ${t} يوم ${tr(d)} وتشترك في ${k === 'driver' ? 'السائق' : 'المركبة'} ${n}.`]
  ];
  const AR_PLURAL = [[/^(\d+) (loaded trips?|trips?)$/, (n, w) => `${n} رحلة`], [/^(\d+) (orders?)$/, n => `${n} أمر`], [/^(\d+) (requests?)$/, n => `${n} طلب`], [/^(\d+) (receipts?)$/, n => `${n} استلام`], [/^(\d+) (vehicles?)$/, n => `${n} مركبة`], [/^(\d+) (drivers?)$/, n => `${n} سائق`]];
  const hasAr = s => /[؀-ۿ]/.test(s);
  function trKey(s) {
    const nums = s.match(/\d+(?:[.,]\d+)?/g) || [], key = s.replace(/\d+(?:[.,]\d+)?/g, '#');
    const hit = AR[key] ?? AR[s];
    if (hit === undefined) return null;
    let i = 0; return hit.replace(/#/g, () => nums[i++] ?? '#');
  }
  function tr(raw) {
    if (!raw || hasAr(raw)) return raw;
    const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0], s = raw.trim();
    if (!s || /^[\d\s.,:%#+\-–−/()]+$/.test(s)) return raw;
    let out = trKey(s);
    if (out === null) { const m = s.match(/^(.+) \(draft\)$/); if (m) out = `${tr(m[1])} (مسودة)`; }
    if (out === null) for (const [re, fn] of AR_RULES) { const m = s.match(re); if (m) { out = fn(...m); break; } }
    if (out === null) for (const [re, fn] of AR_PLURAL) { const m = s.match(re); if (m) { out = fn(m[1]); break; } }
    if (out === null) {
      const parts = s.split(/( · |: |, | to |، )/);
      if (parts.length > 1) out = parts.map((p, i) => i % 2 ? ({ ' to ': ' إلى ', ', ': '، ' }[p] || p) : tr(p)).join('');
      else {
        const m = s.match(/^(\d+) (\w+)$/); // "5 Oct" style dates and "N noun" fallbacks
        const w = m && (AR[m[2]] || AR[m[2].charAt(0).toUpperCase() + m[2].slice(1)]);
        out = w ? `${m[1]} ${w}` : s;
      }
    }
    return lead + out + trail;
  }
  const trTree = root => {
    if (!root) return;
    root.querySelectorAll('option:not([value])').forEach(o => o.setAttribute('value', o.textContent));
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let n; while ((n = w.nextNode())) { if (!['STYLE', 'SCRIPT'].includes(n.parentNode.nodeName)) nodes.push(n); }
    nodes.forEach(t => { const v = tr(t.nodeValue); if (v !== t.nodeValue) { if (t.__en === undefined) t.__en = t.nodeValue; t.nodeValue = v; } });
    root.querySelectorAll('[placeholder],[aria-label],[title],[data-label]').forEach(e => ['placeholder', 'aria-label', 'title', 'data-label'].forEach(k => { const v = e.getAttribute(k); if (v) { const t = tr(v); if (t !== v) { (e.__en = e.__en || {})[k] = v; e.setAttribute(k, t); } } }));
  };
  const trRestore = root => {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (n.__en !== undefined) { n.nodeValue = n.__en; n.__en = undefined; }
    root.querySelectorAll('*').forEach(e => { if (e.__en) { Object.entries(e.__en).forEach(([k, v]) => e.setAttribute(k, v)); e.__en = null; } });
  };

  class LogisticsDashboard {
    constructor(host) {
      if (host.__logisticsDashboard) { host.__logisticsDashboard.refresh(); return; }
      host.__logisticsDashboard = this;
      this.host = host; this.lang = (() => { try { return localStorage.getItem('fo-lang') === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } })(); this.tab = TABS[0]; this.rows = []; this.version = 0; this.loading = true;
      this.pages = {}; this.queue = null; this.issue = null; this.lists = {}; this.tableIndex = 0; this.filtersOpen = false;
      this.section = 'fleet'; this.ptab = PTABS[0]; this.pq = null; this.pissue = null; this.msgs = {}; this.tabsFor = null;
      this.proc = { po: [], mr: [], pr: [], loaded: false, loading: false, denied: new Set(), capped: false, at: '' };
      this.delay = { rows: [], loaded: false, loading: false, error: '', at: '' };
      this.veh = { rows: [], loaded: false, loading: false, denied: false, reduced: false };
      this.recs = { dn: null, drv: null, loading: false, loaded: false };
      this.live = { pos: new Map(), loading: false, filter: 'all', tick: 0, tried: new Set(), at: '', error: '', view: null, refit: true, sel: '', token: 0 };
      this.draw(); this.refresh();
      // Refresh vehicle positions every minute while the map is the visible view.
      if (typeof setInterval === 'function') this.timer = setInterval(() => {
        if (!this.host.isConnected) { clearInterval(this.timer); return; }
        if (this.section === 'fleet' && this.tab === 'Live map' && !this.loading && !(typeof document !== 'undefined' && document.hidden)) this.loadLive(true, ++this.live.tick % 5 ? 'trips' : 'all');
      }, 60000);
    }
    draw() {
      // A Custom HTML Block host may already hold the block's <style>; keep it when the markup is replaced.
      this.styles = [...(this.host.children || [])].filter(n => n.tagName === 'STYLE');
      this.host.innerHTML = `<section class="fo" aria-label="Logistics dashboard">
        <header class="fo-header"><div class="fo-title"><h2>Logistics Dashboard</h2><p class="fo-state" role="status" aria-live="polite"></p></div>
          <nav class="fo-switch" aria-label="Dashboard section"><button type="button" data-section="fleet" aria-pressed="true">${icons.truck}<span>Fleet</span><b class="fo-count" hidden></b></button><button type="button" data-section="procurement" aria-pressed="false">${icons.box}<span>Procurement</span><b class="fo-count" hidden></b></button></nav>
          <div class="fo-actions"><button type="button" class="fo-lang" data-action="lang" aria-label="Language">العربية</button><button type="button" data-action="export">Export CSV</button><button type="button" data-action="refresh">Refresh</button><button type="button" class="fo-primary" data-action="new">${icons.plus}<span>New trip</span></button></div></header>
        <div class="fo-alert" role="alert" hidden></div>
        <div class="fo-bar fo-bar-fleet">
          <div class="fo-range" role="group" aria-label="Date range">${RANGES.map(([v, l]) => `<button type="button" data-period="${v}" aria-pressed="false"${v === 'all' ? ' title="Includes undated backlog"' : ''}>${l}</button>`).join('')}</div>
          <div class="fo-dates"><label><span>From</span><input type="date" data-filter="from"></label><label><span>To</span><input type="date" data-filter="to"></label></div>
          <label class="fo-search"><span class="fo-sr">Find trip, driver or vehicle</span>${icons.search}<input type="search" data-filter="search" placeholder="Find trip, driver or vehicle" autocomplete="off"></label>
          <div class="fo-bar-end"><button type="button" class="fo-toggle" data-action="filters" aria-expanded="false" aria-controls="fo-more">${icons.filter}<span>Filters</span><b class="fo-count" hidden></b></button><button type="button" class="fo-quiet" data-action="reset">Reset</button></div>
        </div>
        <div class="fo-bar fo-bar-proc" hidden>
          <label class="fo-search"><span class="fo-sr">Find order, supplier or request</span>${icons.search}<input type="search" data-pfilter="search" placeholder="Find order, supplier or request" autocomplete="off"></label>
          <label class="fo-sel"><span class="fo-sr">Company</span><select data-pfilter="company"><option value="">All permitted companies</option></select></label>
          <label class="fo-sel"><span class="fo-sr">Supplier type</span><select data-pfilter="kind"><option value="">Local and foreign</option><option>Local</option><option>Foreign</option></select></label>
          <label class="fo-sel"><span class="fo-sr">Buyer</span><select data-pfilter="buyer"><option value="">All buyers</option></select></label>
          <div class="fo-bar-end"><button type="button" class="fo-quiet" data-action="preset">Reset</button></div>
        </div>
        <div class="fo-more" id="fo-more" hidden>
          <label>Date basis<select data-filter="basis"><option value="${F.date}">Delivery date</option><option value="${F.depart}">Departure time</option><option value="all">All dates (including undated)</option></select></label>
          <label>Company<select data-filter="company"><option value="">All permitted companies</option></select></label>
          <label>Trip type<select data-filter="type"><option value="">All movements</option>${TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select></label>
          <label>Source warehouse<select data-filter="warehouse"><option value="">All sources</option></select></label>
          <label>Trip status<select data-filter="status"><option value="">All statuses</option>${['Draft','Submitted','Delivered','Cancelled'].map(s => `<option>${s}</option>`).join('')}</select></label>
          <label>Delivery status<select data-filter="delivery"><option value="">All delivery statuses</option>${['Not Delivered','Partially Delivered','Delivered'].map(s => `<option>${s}</option>`).join('')}</select></label>
        </div>
        <nav class="fo-tabs" aria-label="Dashboard views"></nav>
        <div class="fo-body"></div>
        <footer class="fo-footer"></footer></section>`;
      this.styles.forEach(n => this.host.prepend(n));
      this.el = this.host.querySelector('.fo');
      this.syncTheme();
      this.defaultRange();
      this.el.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) {
          const row = e.target.closest('tr[data-row]'), doc = e.target.closest('tr[data-doc]'), foc = e.target.closest('tr[data-focus]');
          if (foc && !e.target.closest('a') && !String(window.getSelection?.() || '')) this.selectVehicle(foc.dataset.focus, true);
          if (row && !e.target.closest('a') && !String(window.getSelection?.() || '')) this.detail(row.dataset.row);
          if (doc && !e.target.closest('a') && !String(window.getSelection?.() || '')) frappe.set_route('Form', doc.dataset.doc, doc.dataset.name);
          return;
        }
        if (b.dataset.section) this.setSection(b.dataset.section);
        if (b.dataset.select !== undefined) this.selectVehicle(b.dataset.select, false);
        if (b.dataset.chip) { this.live.filter = b.dataset.chip; this.live.refit = true; this.pages = {}; this.render(); }
        if (b.dataset.map) this.mapAction(b.dataset.map);
        if (b.dataset.report) this.openReport(b.dataset.report);
        if (b.dataset.list) frappe.set_route('List', b.dataset.list, 'List');
        if (b.dataset.action === 'preset') { ['company', 'kind', 'buyer', 'search'].forEach(f => { const el = this.el.querySelector(`[data-pfilter="${f}"]`); if (el) el.value = ''; }); this.pages = {}; this.pq = null; this.pissue = null; this.render(); }
        if (b.dataset.pqueue !== undefined) { this.pq = this.pq === +b.dataset.pqueue ? null : +b.dataset.pqueue; this.pissue = null; this.pages = {}; this.render(); this.el.querySelector('.fo-queue-title')?.focus(); }
        if (b.dataset.pissue !== undefined) { this.pissue = this.pissue === b.dataset.pissue ? null : b.dataset.pissue; this.pq = null; this.pages = {}; this.render(); this.el.querySelector('.fo-queue-title')?.focus(); }
        if (b.dataset.action === 'refresh') {
          if (this.section === 'procurement') { this.delay.loaded = false; this.refreshProcurement(); } else { this.veh.loaded = false; this.recs.loaded = false; this.refresh(); }
        }
        if (b.dataset.action === 'lang') this.setLang(this.lang === 'ar' ? 'en' : 'ar');
        if (b.dataset.action === 'new') frappe.new_doc(this.section === 'procurement' ? 'Purchase Order' : 'Delivery Trip');
        if (b.dataset.action === 'export') this.exportCSV();
        if (b.dataset.action === 'reset') this.reset();
        if (b.dataset.action === 'filters') { this.filtersOpen = !this.filtersOpen; this.render(); }
        if (b.dataset.period !== undefined) this.period(b.dataset.period);
        if (b.dataset.pageKey) {
          const key = b.dataset.pageKey, target = +b.dataset.page;
          this.pages[key] = target; this.render();
          this.el.querySelector(`[data-page-key="${key}"]:not(:disabled)`)?.focus();
        }
        if (b.dataset.queue !== undefined) { this.queue = this.queue === +b.dataset.queue ? null : +b.dataset.queue; this.issue = null; this.pages = {}; this.render(); this.el.querySelector('.fo-queue-title')?.focus(); }
        if (b.dataset.issue !== undefined) { this.issue = this.issue === b.dataset.issue ? null : b.dataset.issue; this.queue = null; this.pages = {}; this.render(); this.el.querySelector('.fo-queue-title')?.focus(); }
        if (b.dataset.openList) this.openList(b.dataset.openList);
        if (b.dataset.action === 'clear-queue') { this.queue = null; this.issue = null; this.pq = null; this.pissue = null; this.pages = {}; this.render(); this.el.querySelector('[data-queue],[data-pqueue]')?.focus(); }
        if (b.dataset.trip) this.detail(b.dataset.trip);
        if (b.dataset.tab !== undefined) { if (this.section === 'procurement') this.ptab = PTABS[+b.dataset.tab]; else this.tab = TABS[+b.dataset.tab]; this.queue = null; this.issue = null; this.pq = null; this.pissue = null; this.pages = {}; this.render();
          if (this.section === 'fleet' && this.tab === 'Live map') this.loadLive();
          if (this.section === 'procurement' && this.ptab === 'Purchase requests') this.loadDelay(); }
      });
      this.el.addEventListener('change', e => {
        if (e.target.dataset.pfilter) { if (e.target.dataset.pfilter !== 'search') { this.pages = {}; this.pq = null; this.pissue = null; this.render(); } return; }
        const f = e.target.dataset.filter;
        if (f === 'search') return;
        this.pages = {}; this.queue = null; this.issue = null;
        if (['from','to','basis'].includes(f)) this.applyRange(); else if (f) this.render();
      });
      this.el.querySelectorAll('input[type=date]').forEach(i => i.addEventListener('click', () => { try { if (!i.disabled && i.showPicker) i.showPicker(); } catch (e) { /* already open or not allowed */ } }));
      this.get('search').addEventListener('input', () => { this.pages = {}; this.queue = null; this.issue = null; this.render(); });
      this.el.querySelector('[data-pfilter="search"]').addEventListener('input', () => { this.pages = {}; this.pq = null; this.pissue = null; this.render(); });
      this.el.addEventListener('pointerdown', e => {
        const layer = e.target.closest('.fo-map-layer'); if (!layer || e.target.closest('.fo-pin') || !this.live.view) return;
        this.drag = { x: e.clientX, y: e.clientY, layer, moved: false };
        const move = ev => { const d = this.drag; if (!d) return; const dx = ev.clientX - d.x, dy = ev.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true; d.layer.style.transform = `translate(${dx}px,${dy}px)`; d.dx = dx; d.dy = dy; };
        const up = () => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
          const d = this.drag; this.drag = null; if (!d || !d.moved) return;
          const v = this.live.view; v.lng = unMercX(mercX(v.lng, v.z) - d.dx, v.z); v.lat = unMercY(mercY(v.lat, v.z) - d.dy, v.z); this.drawMap();
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      });
      if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (this.host.isConnected && this.tab === 'Live map' && this.section === 'fleet') this.drawMap(); }).observe(this.el);
    }
    syncTheme() {
      // Selectors outside a shadow root cannot see Desk's theme attribute, so mirror it onto the dashboard.
      if (typeof document === 'undefined') return;
      const root = document.documentElement, apply = () => { if (this.el) this.el.dataset.foTheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; };
      apply();
      if (typeof MutationObserver === 'undefined') return;
      const watcher = new MutationObserver(() => { if (this.host.isConnected) apply(); else watcher.disconnect(); });
      watcher.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }
    get(f) { return this.el.querySelector(`[data-filter="${f}"]`); }
    value(f) { return this.get(f).value; }
    state(text, tone, section = this.section) {
      if (!this.msgs) this.msgs = {};
      this.msgs[section] = [text, tone];
      if (section !== this.section) return;
      const alert = tone === 'warn' || tone === 'error', box = this.el.querySelector('.fo-alert');
      this.el.querySelector('.fo-state').textContent = alert ? '' : text;
      box.hidden = !alert; box.textContent = alert ? text : ''; box.dataset.tone = tone || '';
      this.applyLang(box.parentNode.querySelector('.fo-state'), box);
    }
    // ---- language ----
    T(s) { return this.lang === 'ar' ? tr(s) : s; }
    trHTML(html) { if (this.lang !== 'ar') return html; const d = document.createElement('div'); d.innerHTML = html; d.querySelectorAll('option:not([value])').forEach(o => o.setAttribute('value', o.textContent)); trTree(d); return d.innerHTML; }
    applyLang(...nodes) {
      if (!this.el) return;
      const ar = this.lang === 'ar';
      this.el.classList.toggle('fo-rtl', ar); this.el.setAttribute('dir', ar ? 'rtl' : 'ltr'); this.el.setAttribute('lang', ar ? 'ar' : 'en');
      const btn = this.el.querySelector('[data-action="lang"]'); if (btn) { btn.textContent = ar ? 'English' : 'العربية'; btn.setAttribute('aria-label', ar ? 'Switch to English' : 'التبديل إلى العربية'); }
      if (ar) (nodes.length ? nodes : [this.el]).forEach(n => n && trTree(n));
    }
    setLang(lang) {
      this.lang = lang;
      try { localStorage.setItem('fo-lang', lang); } catch (e) { /* storage unavailable */ }
      if (lang !== 'ar') trRestore(this.el);
      this.tabsFor = null; this.paintState(); this.render();
      if (lang === 'ar') this.applyLang();
    }
    defaultRange() {
      const today = frappe.datetime.get_today();
      this.get('basis').value = F.date;
      this.get('from').value = frappe.datetime.add_days(today, -7);
      this.get('to').value = frappe.datetime.add_days(today, 7);
    }
    reset() {
      ['company','type','warehouse','search','status','delivery'].forEach(f => this.get(f).value = '');
      this.defaultRange(); this.pages = {}; this.queue = null; this.issue = null; this.applyRange();
    }
    period(value) {
      const today = frappe.datetime.get_today(), n = +value;
      this.get('basis').value = value === 'all' ? 'all' : F.date;
      if (value !== 'all') {
        this.get('from').value = frappe.datetime.add_days(today, n === 1 ? 1 : n < 0 ? n+1 : 0);
        this.get('to').value = frappe.datetime.add_days(today, n === 1 ? 1 : n > 1 ? n-1 : 0);
      }
      this.pages = {}; this.queue = null; this.issue = null; this.applyRange();
    }
    // The trips loaded always cover the picked range plus a live window around today, so the headline counts never depend on the picker.
    liveWindow() { const t = frappe.datetime.get_today(); return [shift(t, -30), shift(t, 14)]; }
    inRange(r) {
      const basis = this.value('basis'), from = this.value('from'), to = this.value('to');
      if (!basis || basis === 'all') return true;
      const d = day(r[basis]);
      return !!d && d >= from && d <= to;
    }
    needsFetch() {
      const L = this.loaded, basis = this.value('basis'), from = this.value('from'), to = this.value('to');
      if (!L || this.capped) return true;
      if (L.basis === 'all') return false;
      if (basis === 'all' || basis !== L.basis) return true;
      return !from || !to || from > to || from < L.from || to > L.to;
    }
    applyRange() {
      this.pages = {}; this.queue = null; this.issue = null;
      this.get('from').disabled = this.get('to').disabled = this.value('basis') === 'all';
      this.loadRecords();
      if (this.needsFetch()) this.refresh(); else { this.state(`${plural(this.rows.length, 'trip')} loaded. Updated ${String(frappe.datetime.now_datetime()).slice(11, 16)} site time.`, '', 'fleet'); this.render(); }
    }
    activeRange() {
      const basis = this.value('basis');
      if (basis === 'all') return 'all';
      if (basis !== F.date) return null;
      const t = frappe.datetime.get_today(), from = this.value('from'), to = this.value('to');
      const presets = { '0': [t, t], '1': [shift(t, 1), shift(t, 1)], '7': [t, shift(t, 6)], '-30': [shift(t, -29), t] };
      return Object.keys(presets).find(k => presets[k][0] === from && presets[k][1] === to) ?? null;
    }
    rangeLabel() {
      const k = this.activeRange(), names = { '0': 'Today', '1': 'Tomorrow', '7': 'Next 7 days', '-30': 'Last 30 days', all: 'All dates' };
      if (k !== null && names[k]) return names[k];
      const b = this.value('basis'), f = this.value('from'), t = this.value('to');
      if (b !== F.date || !f || !t) return 'Selected range';
      return f === t ? dayLabel(f) : `${dayLabel(f)} to ${dayLabel(t)}`;
    }
    queueRows(rows, index) {
      const working = rows.filter(active), today = frappe.datetime.get_today(), inR = working.filter(r => this.inRange(r));
      const timeErr = r => issues(r).some(i => /timestamp/i.test(i));
      return [()=>inR,
        ()=>working.filter(isPlanned),
        ()=>inR.filter(delivery),
        ()=>inR.filter(follow),
        ()=>working.filter(timeErr),
        ()=>working.filter(r=>!r.driver||!r.vehicle)][index]();
    }
    exportCSV() {
      if (this.section === 'procurement') { this.exportProcurement(); return; }
      const rows = this.filtered().filter(r => this.inRange(r));
      if (!rows.length) { frappe.msgprint(this.T('No matching trips to export.')); return; }
      const columns = ['name','company',F.date,F.type,F.from,F.to,'vehicle','driver','status','delivery_status',F.report,F.depart,F.arrive,F.exit];
      // Prevent spreadsheet programs from executing formula-like record values.
      const cell = v => '"' + (/^[\s]*[=+@\-\t\r]/.test(String(v||'')) ? "'" : '') + String(v??'').replace(/"/g,'""') + '"';
      const csv = '﻿' + [columns,...rows.map(r=>columns.map(c=>r[c]))].map(row=>row.map(cell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})), a = document.createElement('a');
      a.href = url; a.download = `logistics-fleet-${frappe.datetime.get_today()}${this.capped?'-partial':''}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      frappe.show_alert({message:this.T(`Exported ${plural(rows.length,'trip')}${this.capped?' (partial data)':''}. The file includes every status that matches the filters, whatever tab is open.`),indicator:'blue'});
    }
    async refresh() {
      const token = ++this.version;
      const from = this.value('from'), to = this.value('to'), basis = this.value('basis');
      this.rows = []; this.loaded = null; this.capped = false; this.pages = {}; this.loading = true; this.render();
      this.el.removeAttribute('aria-busy');
      this.get('from').disabled = this.get('to').disabled = basis === 'all';
      if (basis !== 'all' && (!from || !to || from > to)) { this.loading = false; this.render(); this.state('Choose a valid date range: the start date must be on or before the end date.', 'error', 'fleet'); return; }
      this.el.setAttribute('aria-busy', 'true'); this.state('Loading permitted Delivery Trips…', '', 'fleet');
      const [lf, lt] = this.liveWindow(), wf = from < lf ? from : lf, wt = to > lt ? to : lt;
      const filters = basis === 'all' ? [] : [[basis, '>=', basis === F.depart ? `${wf} 00:00:00` : wf], [basis, '<=', basis === F.depart ? `${wt} 23:59:59` : wt]];
      const rows = []; let capped = false;
      try {
        for (let start=0; start<10000; start+=500) {
          const page = await frappe.db.get_list('Delivery Trip', { fields, filters, order_by:'name asc', limit_start:start, limit_page_length:500, limit:500 });
          if (token !== this.version || !this.host.isConnected) return;
          rows.push(...page);
          if (page.length < 500) break;
          if (start === 9500) capped = true;
        }
        this.rows = rows; this.capped = capped; this.loaded = { basis, from: wf, to: wt };
        for (const [filter,field] of [['company','company'],['warehouse',F.from]]) {
          const select = this.get(filter), prior = select.value;
          select.innerHTML = `<option value="">${filter === 'company' ? 'All permitted companies' : 'All sources'}</option>` + [...new Set(rows.map(r=>r[field]).filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
          select.value = prior; if (select.selectedIndex < 0) select.selectedIndex = 0;
        }
        this.loading = false; this.render();
        if (capped) this.state('Partial results: the 10,000-trip limit was reached, so counts cover loaded trips only. Narrow the date range.', 'warn', 'fleet');
        else this.state(`${plural(rows.length, 'trip')} loaded. Updated ${String(frappe.datetime.now_datetime()).slice(11, 16)} site time.`, '', 'fleet');
        // Background work after the trips are on screen: vehicles, procurement (for the switch count) and the map positions.
        if (!this.veh.loaded) this.loadVehicles();
        if (!this.recs.loaded) this.loadRecords();
        if (!this.proc.loaded && !this.proc.loading) this.refreshProcurement();
        if (this.tab === 'Live map') this.loadLive();
      } catch (error) {
        if (token !== this.version) return;
        this.rows = []; this.loading = false; this.render();
        this.state('Could not load trips. Check Delivery Trip read permission and custom field access, then select Refresh.', 'error', 'fleet');
        console.error('Logistics Dashboard fleet load failed', error);
      } finally { if (token === this.version) this.el.removeAttribute('aria-busy'); }
    }
    filtered() {
      const q = this.value('search').trim().toLowerCase();
      return this.rows.filter(r => (!this.value('company') || r.company === this.value('company')) &&
        (!this.value('warehouse') || r[F.from] === this.value('warehouse')) &&
        (!this.value('type') || r[F.type] === this.value('type')) &&
        (!this.value('status') || tripState(r) === this.value('status')) &&
        (!this.value('delivery') || r.delivery_status === this.value('delivery')) &&
        (!q || [r.name,r.driver,r.driver_name,r.vehicle,r[F.from],r[F.to]].some(v=>String(v||'').toLowerCase().includes(q))));
    }
    table(rows, mode='normal', empty='No trips match these filters.', size=25) {
      const key = `table-${this.tableIndex++}`;
      (this.lists || (this.lists = {}))[key] = { dt: 'Delivery Trip', names: rows.map(r => r.name) };
      if (!rows.length) return `<div class="fo-empty">${esc(empty)}${this.filterCount ? ' <button type="button" class="fo-link" data-action="reset">Reset filters</button>' : ''}</div>`;
      const page = Math.min(this.pages[key]||0,Math.max(0,Math.ceil(rows.length/size)-1));
      const start = page*size;
      const cells = r => {
        const list = issues(r), to = r[F.to];
        const dep = r[F.depart] ? `<time datetime="${esc(r[F.depart])}"><strong>${esc(String(r[F.depart]).slice(11, 16) || '–')}</strong><span>${esc(dayLabel(day(r[F.depart])))}</span></time>` : '<span class="fo-muted">Not set</span>';
        const progress = mode === 'issues'
          ? `<div class="fo-issues">${list.map(i => `<span class="${urgent(i) ? 'fo-bad' : 'fo-warn'}">${esc(i)}</span>`).join('') || '<span class="fo-warn">Review trip</span>'}</div>`
          : `<div class="fo-prog">${executed(r) ? journey(r) : ''}<span class="fo-stage">${esc(stage(r))}</span></div>`;
        return `<tr data-row="${esc(r.name)}" data-lane="${lane(r)}">
          <td data-slot="trip"><button type="button" class="fo-link" data-trip="${esc(r.name)}">${esc(r.name)}</button><small>${esc(r[F.type]||'Type unknown')}${r.docstatus===0?' (draft)':''}</small></td>
          <td data-slot="route"><span>${esc(r[F.from]||'Source unknown')}</span>${to ? `<span class="fo-to">${esc(to)}</span>` : r[F.type] === 'Internal Transfer' ? '<span class="fo-to"><em>Destination not set</em></span>' : ''}<small>${esc(r.company)}</small></td>
          <td data-slot="who" data-label="Assigned"><div class="fo-who">${r.vehicle ? link('vehicle',r.vehicle) : '<span class="fo-bad-text">No vehicle</span>'}<small>${r.driver ? link('driver',r.driver,r.driver_name) : '<span class="fo-bad-text">No driver</span>'}</small></div></td>
          <td data-slot="when" data-label="Departs">${dep}</td>
          <td data-slot="status">${statusBadge(r)}${deliveryBadge(r)}</td>
          <td data-slot="next" data-label="${mode==='issues' ? 'Needs action' : 'Progress'}">${progress}</td></tr>`;
      };
      return `<div class="fo-table-wrap" tabindex="0" role="region" aria-label="Trips, scrollable"><table><thead><tr><th>Trip</th><th>Route</th><th>Vehicle and driver</th><th>Departure</th><th>Status</th><th>${mode==='issues' ? 'Needs action' : 'Progress'}</th></tr></thead><tbody>${rows.slice(start,start+size).map(cells).join('')}</tbody></table></div>${this.pager(key, rows.length, start, size, page, 'trips', 'Delivery Trip')}`;
    }
    openList(key) {
      const l = (this.lists || {})[key];
      if (!l || !l.names.length) return;
      frappe.route_options = l.names.length <= 200 ? { name: ['in', l.names] } : (LIST_FALLBACK[l.dt] ? LIST_FALLBACK[l.dt](this, frappe.datetime.get_today()) : {});
      frappe.set_route('List', l.dt, 'List');
    }
    panel(title, content, note='', count=null, extra='', cls='') {
      return `<section class="fo-panel ${cls}"><div class="fo-panel-head"><h3>${esc(title)}${count === null ? '' : `<b class="fo-count">${count}</b>`}</h3>${extra}</div>${note?`<p class="fo-note">${esc(note)}</p>`:''}<div class="fo-panel-body">${content}</div></section>`;
    }
    tiles(items, clickable = false, attr = 'queue') {
      const cur = attr === 'queue' ? this.queue : this.pq;
      return `<div class="fo-strip n${items.length}" ${clickable ? `role="group" aria-label="${attr === 'queue' ? 'Counts for the selected range' : 'Counts for the filtered orders and requests'}"` : ''}>${items.map(([label, n, note, tone], i) => {
        const inner = `<span class="fo-kpi-label"><i aria-hidden="true"></i>${esc(label)}</span><strong>${esc(n)}</strong><small>${esc(note)}</small>`;
        return clickable ? `<button type="button" class="fo-kpi" data-tone="${tone || ''}" data-${attr}="${i}" aria-pressed="${cur===i}">${inner}</button>` : `<div class="fo-kpi" data-tone="${tone || ''}">${inner}</div>`;
      }).join('')}</div>`;
    }
    skeleton() {
      const strip = `<div class="fo-strip n6" aria-hidden="true">${'<div class="fo-kpi"><i class="fo-skel" style="width:55%"></i><i class="fo-skel big"></i><i class="fo-skel" style="width:80%"></i></div>'.repeat(6)}</div>`;
      const card = '<section class="fo-panel" aria-hidden="true"><div class="fo-panel-head"><i class="fo-skel" style="width:140px;height:16px"></i></div><div class="fo-panel-body"><i class="fo-skel" style="height:14px"></i><i class="fo-skel" style="height:14px;width:80%"></i><i class="fo-skel" style="height:14px;width:60%"></i><i class="fo-skel" style="height:80px"></i></div></section>';
      return `${strip}<div class="fo-grid g3">${card.repeat(3)}</div><div class="fo-grid g2">${card.repeat(2)}</div>`;
    }
    issueGroups(working) {
      const m = tally(working.flatMap(r => issues(r).map(i => ({ i }))), x => x.i);
      return [...m].sort((a, b) => urgent(b[0]) - urgent(a[0]) || b[1] - a[1] || a[0].localeCompare(b[0]));
    }
    render() { this.renderMain(); this.applyLang(); }
    renderMain() {
      if (!this.el) return;
      this.tableIndex = 0; this.lists = {};
      this.syncSection();
      if (this.section === 'procurement') { this.renderProcurement(); return; }
      // `all` is every loaded trip that matches the filters (live window); `rows` is the part inside the picked date range.
      const all = this.filtered(), rows = all.filter(r => this.inRange(r)), working = rows.filter(active), live = all.filter(active), today = frappe.datetime.get_today();
      const planned = live.filter(isPlanned), followUp = rows.filter(follow);
      const clash = clashes(working);
      // Controls reflect state.
      this.filterCount = ['company','type','warehouse','status','delivery'].filter(f => this.value(f)).length + (this.value('basis') === F.depart ? 1 : 0);
      const range = this.activeRange();
      this.el.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === range)));
      const toggle = this.el.querySelector('[data-action="filters"]'), count = toggle.querySelector('.fo-count');
      toggle.setAttribute('aria-expanded', String(this.filtersOpen)); this.el.querySelector('.fo-more').hidden = !this.filtersOpen;
      count.hidden = !this.filterCount; count.textContent = this.filterCount;
      const now = stamp(frappe.datetime.now_datetime()), trips = mapTrips(all, today, now);
      const tabCounts = [null, trips.length, planned.length, null, followUp.length, null];
      this.el.querySelectorAll('[data-tab]').forEach(b => {
        const i = +b.dataset.tab, c = b.querySelector('.fo-count'), n = this.loading ? null : tabCounts[i];
        if (TABS[i] === this.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        c.hidden = n === null; c.textContent = n ?? '';
      });
      this.el.querySelector('[data-action="export"]').disabled = this.loading || !rows.length;
      if (this.loading) {
        this.el.querySelector('.fo-body').innerHTML = this.skeleton();
        this.el.querySelector('.fo-footer').textContent = 'Loading trips…';
        return;
      }
      const open = key => `<button type="button" data-open-list="${key}">Open in Delivery Trip list</button>`;
      let content = '';
      if (this.tab === 'Overview') {
        const label = this.rangeLabel(), todayRows = working, dnToday = todayRows.filter(delivery);
        const timeErr = working.filter(r => issues(r).some(i => /timestamp/i.test(i))), noAssign = working.filter(r => !r.driver || !r.vehicle);
        const kpis = [
          ['Trips',todayRows.length,`${label}, ${todayRows.filter(r=>r.docstatus===1).length} submitted`,''],
          ['Awaiting submission',planned.length,'Draft trips to review and submit',planned.length ? 'warn' : ''],
          ['Deliveries',dnToday.length,`Customer delivery trips, ${label.toLowerCase()}`,''],
          ['Follow-up',followUp.length,`Not delivered or no proof of receipt, ${label.toLowerCase()}`,followUp.length ? 'warn' : ''],
          ['Time errors',timeErr.length,`Timestamps out of order, ${label.toLowerCase()}`,timeErr.length ? 'bad' : ''],
          ['Missing assignment',noAssign.length,`Driver or vehicle not set, ${label.toLowerCase()}`,noAssign.length ? 'bad' : '']
        ];
        content = this.tiles(kpis, true);
        // Row of three: today, assignment, closure.
        const tDone = todayRows.filter(done).length, tDraft = todayRows.filter(r => r.docstatus === 0).length, tSub = todayRows.length - tDone - tDraft;
        const nextHTML = `<p class="fo-foot">${todayRows.length ? `${plural(todayRows.length, 'trip')}, ${plural(dnToday.length, 'delivery', 'deliveries')}.` : 'No trips are dated in this range.'}</p>`;
        const m1 = this.panel('Trips in range', stackHTML([{label:'Draft',n:tDraft,tone:'neutral'},{label:'Submitted',n:tSub,tone:'info'},{label:'Delivered',n:tDone,tone:'good'}], 'Trips in range') + nextHTML, label);
        const todayV = new Set(todayRows.map(r => r.vehicle).filter(Boolean)).size, todayD = new Set(todayRows.map(r => r.driver).filter(Boolean)).size, rangeMissing = working.filter(r=>!r.driver);
        const m2 = this.panel('Fleet assignment', meterHTML('Trips with a vehicle', working.filter(r=>r.vehicle).length, working.length) + meterHTML('Trips with a driver', working.length - rangeMissing.length, working.length) +
          `<dl class="fo-trio"><div><dt>Vehicles used</dt><dd>${todayV}</dd></div><div><dt>Drivers used</dt><dd>${todayD}</dd></div><div><dt>Possible duplicates</dt><dd class="${clash.length ? 'fo-bad-text' : ''}">${clash.length}</dd></div></dl>`);
        const exec = rows.filter(r => executed(r) && delivery(r)), okN = exec.filter(r => !follow(r)).length;
        const reasons = this.issueGroups(exec.filter(follow)).filter(([k]) => /Deliver|proof|Partial/.test(k)).slice(0, 3);
        const m3 = this.panel('Delivery closure', ringHTML(okN, exec.length, 'Delivered with proof of receipt') + `<ul class="fo-reasons">${reasons.length ? reasons.map(([k, n]) => `<li><span>${esc(k)}</span><strong>${n}</strong></li>`).join('') : `<li class="fo-muted">${exec.length ? 'Every submitted delivery is closed.' : 'No submitted customer deliveries in range.'}</li>`}</ul>`);
        content += `<div class="fo-grid g3">${m1}${m2}${m3}</div>`;
        // Row of two: volume by day, attention groups.
        const groups = this.issueGroups(working), shown = groups.slice(0, 6), restN = groups.slice(6).reduce((s, g) => s + g[1], 0);
        const g1 = this.panel('Trips per day', colsHTML(buckets(working, today), 'Trips per day'));
        const g2 = this.panel('Needs attention', groups.length ? `<ul class="fo-issue-list">${shown.map(([k, n]) => `<li><button type="button" data-issue="${esc(k)}" aria-pressed="${this.issue === k}"><i data-tone="${urgent(k) ? 'bad' : 'warn'}" aria-hidden="true"></i><span>${esc(k)}</span><strong>${n}</strong></button></li>`).join('')}${restN ? `<li class="fo-muted fo-more-line">${restN} more in smaller groups</li>` : ''}</ul>` : '<div class="fo-empty fo-ok">Nothing needs attention in this range.</div>', 'Select a group to list its trips.', groups.length ? working.filter(r => issues(r).length).length : null);
        content += `<div class="fo-grid g2">${g1}${g2}</div>`;
        // Capped detail list.
        const queueNames = [`Trips, ${label}`,'Awaiting submission',`Deliveries, ${label}`,'Delivery follow-up','Time errors','Missing assignment'];
        let title = 'Most urgent trips', list = working.filter(r=>issues(r).length), extra = '', note = 'The most urgent trips first. Use the native list for everything else.';
        if (this.queue !== null) { title = queueNames[this.queue]; list = this.queueRows(all, this.queue); note = ''; }
        else if (this.issue !== null) { title = this.issue; list = working.filter(r => issues(r).includes(this.issue)); note = ''; }
        if (this.queue !== null || this.issue !== null) extra = '<button type="button" data-action="clear-queue">Clear selection</button>';
        list = list.slice().sort(bySeverity);
        content += this.panel(title, this.table(list,'issues','Nothing in this selection.',6), note, list.length, extra, 'fo-detail').replace('<h3>','<h3 class="fo-queue-title" tabindex="-1">');
        content += this.recordsPanel(all, today, now);
      } else if (this.tab === 'Live map') {
        content = this.renderLive(trips, today, now);
      } else if (this.tab === 'Awaiting submission') {
        const noV = planned.filter(r=>!r.vehicle).length, noD = planned.filter(r=>!r.driver).length, terr = planned.filter(r=>issues(r).some(i=>/timestamp/i.test(i))).length;
        content = this.tiles([['Awaiting submission',planned.length,'Draft trips',planned.length ? 'warn' : ''],['Missing driver',noD,'Of draft trips',noD ? 'bad' : ''],['Missing vehicle',noV,'Of draft trips',noV ? 'bad' : ''],['Time errors',terr,'Timestamps out of order',terr ? 'bad' : '']]);
        const left = this.panel('Drafts by day', colsHTML(buckets(planned, today), 'Draft trips per day'), 'By delivery date.');
        const right = this.panel('Possible duplicates', clash.length ? `<ul class="fo-clashes">${clash.slice(0, 5).map(([a,b,kind,who])=>`<li>${link('delivery-trip',a.name)} and ${link('delivery-trip',b.name)} leave at ${esc(String(a[F.depart]).slice(11, 16))} on ${esc(dayLabel(day(a[F.depart])).toLowerCase())} and share ${kind} ${esc(who)}.</li>`).join('')}</ul>${clash.length > 5 ? `<p class="fo-foot">${clash.length - 5} more pairs not shown.</p>` : ''}` : '<div class="fo-empty fo-ok">No trips share a departure time with the same vehicle or driver.</div>', 'Trips with the same departure time and a shared vehicle or driver. Several delivery notes on one run can cause this legitimately.');
        content += `<div class="fo-grid g2">${left}${right}</div>`;
        content += this.panel('Oldest drafts', this.table(planned.slice().sort(byDeparture),'issues','No drafts are waiting to be submitted.',6), 'Oldest first. Submit each trip once its times and delivery status are confirmed.', planned.length);
      } else if (this.tab === 'Vehicles & drivers') {
        const rank = (list, key, label = k => k) => [...tally(list.filter(r => key(r)), key)].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).map(([k, n]) => [label(k), n]);
        const names = new Map(working.filter(r => r.driver_name).map(r => [r.driver, r.driver_name]));
        const byV = rank(working, r => r.vehicle), byD = rank(working, r => r.driver, k => names.get(k) || k);
        const dn = working.filter(delivery).length, it = working.filter(r => r[F.type] === 'Internal Transfer').length;
        content = this.tiles([['Vehicles used',byV.length,'In this range',''],['Drivers active',byD.length,'In this range',''],['Trips per vehicle',byV.length ? (working.filter(r => r.vehicle).length / byV.length).toFixed(1) : '0','Average',''],['Deliveries',dn,'Customer delivery trips',''],['Internal transfers',it,'Between warehouses',''],['Other',working.length - dn - it,'Workshop, petrol and the rest','']], false);
        content += `<div class="fo-grid g2">${this.panel('Trips per vehicle', barsHTML(byV, working.length, 'No trips in this range.', 8), 'Top 8 vehicles.')}${this.panel('Trips per driver', barsHTML(byD, working.length, 'No trips in this range.', 8), 'Top 8 drivers.')}</div>`;
        content += this.vehiclePanels(all, today);
        content += `<div class="fo-grid g2">${this.panel('By movement', barsHTML(rank(working, r => r[F.type] || 'Not set'), working.length, 'No trips in this range.', 6))}${this.panel('By source warehouse', barsHTML(rank(working, r => r[F.from] || 'Not set'), working.length, 'No trips in this range.', 6))}</div>`;
        content += this.panel('Latest trips', this.table(working.slice().sort((a, b) => byDeparture(b, a)),'normal','No trips in this range.',6), 'Most recent departure first.', working.length);
      } else if (this.tab === 'Delivery follow-up') {
        const by = f => followUp.filter(f).length;
        content = this.tiles([['Open closures',followUp.length,'Delivery or evidence incomplete',followUp.length ? 'warn' : ''],['Not delivered',by(r=>r.delivery_status!=='Delivered'&&r.delivery_status!=='Partially Delivered'),'Submitted, status not Delivered',''],['Partially delivered',by(r=>r.delivery_status==='Partially Delivered'),'Needs a closing decision',''],['No proof of receipt',by(r=>evidenceMissing(r)),'No receiver name, mobile, signature or stamp','']]);
        const ageOf = r => /^\d{4}/.test(r[F.date] || '') ? diffDays(day(r[F.date]), today) : null;
        const ages = [['Today',a=>a===0],['1 to 2 days',a=>a>=1&&a<=2],['3 to 7 days',a=>a>=3&&a<=7],['Over 7 days',a=>a>7]].map(([k, f]) => [k, followUp.filter(r => { const a = ageOf(r); return a !== null && f(a); }).length, k === 'Over 7 days' ? 'bad' : k === '3 to 7 days' ? 'warn' : '']);
        const undated = followUp.filter(r => ageOf(r) === null).length; if (undated) ages.push(['No delivery date', undated, '']);
        const why = [...tally(followUp.flatMap(r => issues(r).filter(i => /Deliver|proof|Partial/.test(i)).map(i => ({ i }))), x => x.i)].sort((a, b) => b[1] - a[1]);
        content += `<div class="fo-grid g2">${this.panel('Why they are open', barsHTML(why, followUp.length, 'No open closures.', 6), 'A trip can appear under more than one reason.')}${this.panel('How long they have been open', barsHTML(ages.filter(a => a[1]), followUp.length, 'No open closures.', 6), 'Days since delivery date.')}</div>`;
        content += this.panel('Oldest open closures', this.table(followUp.slice().sort((a, b) => String(a[F.date] || '9').localeCompare(String(b[F.date] || '9')) || byDeparture(a, b)),'issues','No deliveries need follow-up.',6), 'Proof of receipt means at least one of receiver name, mobile, signature or stamp is Yes. The signed delivery note attachment is not required.', followUp.length);
      } else content = this.performance(rows);
      this.el.querySelector('.fo-body').innerHTML = content;
      if (this.tab === 'Live map') { this.drawMap(); this.ensureFixes(trips); }
      this.el.querySelector('.fo-footer').textContent = this.tab === 'Live map' ? 'Positions come from the Vehicle Arabitra Logs tracker feed. Ongoing means a trip has departed in the last 24 hours and has no recorded site exit, so a vehicle can be listed here while parked. Map tiles from OpenStreetMap.' : `${rows.length} of ${plural(this.rows.length,'loaded trip')} match your filters.${this.capped?' Partial data: narrow the date range.':''} Progress is inferred from recorded timestamps, not live location. Cancelled trips are left out of operational counts. Full records live in the Delivery Trip list.`;
    }
    performance(rows) {
      const completed = rows.filter(done), trips = rows.filter(r=>executed(r)&&delivery(r)), today = frappe.datetime.get_today();
      const avg = (a,b) => {
        const values = completed.map(r=>delta(r[a],r[b])).filter(v=>v!==null);
        return values.length ? [`${(values.reduce((s,v)=>s+v,0)/values.length).toFixed(1)} min`, plural(values.length,'sample')] : ['No data','No valid completed-trip samples'];
      };
      const partial = trips.filter(r=>r.delivery_status==='Partially Delivered').length, complete = trips.filter(r=>!evidenceMissing(r)).length;
      const none = 'No executed delivery trips';
      const metrics = [['Completed trips',String(completed.length),'In this range'],['Warehouse wait',...avg(F.report,F.depart)],['Travel',...avg(F.depart,F.arrive)],['Time on site',...avg(F.arrive,F.exit)],
        ['Partial deliveries',trips.length ? `${(100*partial/trips.length).toFixed(1)}%` : 'No data',trips.length ? `${partial} of ${plural(trips.length,'executed delivery trip')}` : none],
        ['Evidence complete',trips.length ? `${complete} of ${trips.length}` : 'No data',trips.length ? 'executed delivery trips' : none]];
      let html = `<div class="fo-strip n6 fo-metrics" role="group" aria-label="Execution measures">${metrics.map(([l,v,s])=>`<div class="fo-kpi"><span class="fo-kpi-label">${esc(l)}</span><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`).join('')}</div><p class="fo-hint">Intervals are differences between recorded timestamps on submitted Completed trips, not verified durations. Missing or negative pairs are excluded.</p>`;
      const names = new Map(completed.filter(r => r.driver_name).map(r => [r.driver, r.driver_name]));
      const top = (field, label = k => k) => barsHTML([...tally(completed, r => r[field] || 'Unknown')].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).map(([k, n]) => [label(k), n]), completed.length, 'No completed trips in this range.');
      html += this.panel('Completed per day', colsHTML(buckets(completed, today), 'Completed trips per day'));
      html += `<div class="fo-grid g2">${this.panel('Busiest drivers', top('driver', k => names.get(k) || k), 'Top 5 by completed trips.')}${this.panel('Busiest vehicles', top('vehicle'), 'Top 5 by completed trips.')}</div>`;
      html += `<div class="fo-grid g2">${this.panel('By movement', top(F.type))}${this.panel('By source warehouse', top(F.from))}</div>`;
      return html;
    }
    // ---- section switch (Fleet / Procurement) ----
    setSection(section) {
      if (section === this.section) return;
      this.section = section; this.pages = {}; this.queue = null; this.issue = null; this.pq = null; this.pissue = null;
      this.paintState();
      if (section === 'procurement' && !this.proc.loaded && !this.proc.loading) this.refreshProcurement(); else this.render();
    }
    paintState() { const m = (this.msgs || {})[this.section] || ['', '']; this.state(m[0], m[1]); }
    syncSection() {
      const p = this.section === 'procurement';
      this.el.dataset.foSection = this.section;
      this.el.querySelectorAll('[data-section]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.section === this.section)));
      this.el.querySelector('.fo-bar-fleet').hidden = p; this.el.querySelector('.fo-bar-proc').hidden = !p;
      if (p) this.el.querySelector('.fo-more').hidden = true;
      if (this.tabsFor !== this.section) {
        this.el.querySelector('.fo-tabs').innerHTML = (p ? PTABS : TABS).map((t, i) => `<button type="button" data-tab="${i}"><span>${t}</span><b class="fo-count" hidden></b></button>`).join('');
        this.tabsFor = this.section;
      }
      this.el.querySelector('[data-action="new"] span').textContent = p ? 'New purchase order' : 'New trip';
      this.updateSwitch();
    }
    // Attention counts on the section switch, so the other section's problems are visible without opening it.
    updateSwitch() {
      const today = frappe.datetime.get_today(), [lf, lt] = this.liveWindow(), P = this.proc, V = this.veh;
      const set = (sec, n, title) => { const b = this.el.querySelector(`[data-section="${sec}"] .fo-count`), btn = this.el.querySelector(`[data-section="${sec}"]`); if (!b) return; b.hidden = !n; b.textContent = n || ''; if (n) btn.title = title; else btn.removeAttribute('title'); };
      let fleet = 0, ft = '';
      if (!this.loading && this.loaded) {
        const trips = fleetAttention(this.rows.filter(r => { const d = day(r[F.date]); return !d || (d >= lf && d <= lt); })).length;
        fleet = trips; ft = `${plural(trips, 'trip')} need follow-up`;
      }
      let proc = 0, pt = '';
      if (P.loaded && !P.loading) {
        const po = P.po.filter(r => poOpen(r) && poIssues(r, today).some(urgentP)).length, mr = P.mr.filter(r => mrIssues(r, today).some(urgentM)).length;
        proc = po + mr; pt = `${plural(po, 'order')} past due, ${plural(mr, 'purchase request')} late or high priority`;
      }
      set('fleet', fleet, ft); set('procurement', proc, pt);
    }
    pv(f) { const el = this.el && this.el.querySelector(`[data-pfilter="${f}"]`); return el ? el.value : ''; }
    openReport(name) { frappe.set_route('query-report', name); }
    linksPanel(kind) {
      const items = LINKS[kind];
      return this.panel('Reports and lists', `<div class="fo-links c${kind === 'fleet' ? 3 : 4}">${items.map(([type, name]) => `<button type="button" ${type === 'report' ? 'data-report' : 'data-list'}="${esc(name)}"><span>${esc(name)}</span><small>${type === 'report' ? 'Report' : 'List'}</small></button>`).join('')}</div>`,
        'Opens the native report or list in Desk, using your own permissions.');
    }

    // ---- vehicles: documents and utilisation ----
    async loadVehicles() {
      const V = this.veh; if (V.loading) return;
      V.loading = true; V.denied = false; V.reduced = false;
      const all = [...VEH_FIELDS.core, ...VEH_FIELDS.optional], args = { order_by: 'name asc', limit_page_length: 500, limit: 500 };
      try {
        let rows;
        try { rows = await frappe.db.get_list('Vehicle', { ...args, fields: all, filters: [['custom_vehicle_status', '=', 'Active']] }); }
        catch (e1) {
          V.reduced = true; console.warn('Logistics Dashboard: reading Vehicle with fewer fields', e1);
          try { rows = await frappe.db.get_list('Vehicle', { ...args, fields: VEH_FIELDS.core }); }
          catch (e2) { V.denied = true; rows = []; console.error('Logistics Dashboard: could not read Vehicle', e2); }
        }
        V.rows = rows; V.loaded = true;
      } finally { V.loading = false; }
      if (this.host.isConnected && this.section === 'fleet') this.render();
    }
    vehiclePanels(all, today) {
      const V = this.veh;
      if (V.loading || !V.loaded) return this.panel('Vehicle utilisation', '<div class="fo-empty">Loading vehicles…</div>');
      if (V.denied) return this.panel('Vehicle utilisation', '<div class="fo-empty">No read access to Vehicle.</div>');
      const basis = this.value('basis'), [lf, lt] = this.liveWindow(), from = basis === 'all' ? lf : this.value('from'), to = basis === 'all' ? lt : this.value('to');
      const U = utilisation(V.rows, all, today, from, to);
      const idleList = U.idle.slice(0, 6).map(i => `<li><span>${link('vehicle', i.vehicle, i.plate)}</span><strong>${i.last ? 'Last trip ' + esc(dayLabel(i.last).toLowerCase()) : 'No trip in the loaded window'}</strong></li>`).join('');
      const util = this.panel('Vehicle utilisation', U.scope ? meterHTML('Goods vehicles with a trip in range', U.used, U.scope) + `<dl class="fo-trio"><div><dt>Active fleet</dt><dd>${U.fleet}</dd></div><div><dt>Ran trips</dt><dd>${U.used}</dd></div><div><dt>Idle</dt><dd class="${U.idle.length ? 'fo-warn-text' : ''}">${U.idle.length}</dd></div></dl>` + (U.idle.length ? `<ul class="fo-reasons fo-first">${idleList}</ul>${U.idle.length > 6 ? `<p class="fo-foot">${U.idle.length - 6} more idle vehicles. Open the Vehicle list for the full fleet.</p>` : ''}` : '<p class="fo-foot">Every goods vehicle ran a trip in this range.</p>') : '<div class="fo-empty">No goods-carriage vehicles found.</div>',
        `Counts active goods-carriage vehicles, plus any vehicle that made a trip. ${V.rows.length} active vehicles in the fleet list.`, U.idle.length || null);
      return util;
    }

    // ---- fleet records summary: counts from Delivery Note, Driver and Vehicle (permission-checked counts, no row lists) ----
    recKey() { const b = this.value('basis'); return b === 'all' ? 'all' : `${this.value('from')}|${this.value('to')}`; }
    async loadRecords() {
      const R = this.recs, key = this.recKey(); if (R.loading) { R.queued = true; return; }
      R.loading = true; R.queued = false;
      const today = frappe.datetime.get_today(), count = async (doctype, filters) => { try { const r = await frappe.call({ method: 'frappe.client.get_count', args: { doctype, filters } }); return Number(r && r.message) || 0; } catch (e) { console.warn('Logistics Dashboard: count failed for', doctype, e); return null; } };
      // Delivery Note: delivery_mode is always "DM Vehicle" and driver / vehicle_no are empty on live notes, so the split uses custom_delivery_by.
      const dates = key === 'all' ? [] : [['posting_date', 'between', [this.value('from'), this.value('to')]]], sub = [['docstatus', '=', 1], ...dates];
      try {
        const [dTotal, dDm, dPick, dRent, dDraft, dBill, drvAll, drvActive, drvNoEmp] = await Promise.all([
          count('Delivery Note', sub), count('Delivery Note', [...sub, ['custom_delivery_by', '=', 'DM Vehicle']]), count('Delivery Note', [...sub, ['custom_delivery_by', '=', 'Customer Pickup']]), count('Delivery Note', [...sub, ['custom_delivery_by', '=', 'Rented Vehicle']]),
          count('Delivery Note', [['docstatus', '=', 0]]), count('Delivery Note', [['docstatus', '=', 1], ['status', '=', 'To Bill']]),
          count('Driver', []), count('Driver', [['status', '=', 'Active']]), count('Driver', [['status', '=', 'Active'], ['employee', 'is', 'not set']])]);
        R.dn = { total: dTotal, dm: dDm, pickup: dPick, rented: dRent, draft: dDraft, toBill: dBill }; R.drv = { all: drvAll, active: drvActive, noEmployee: drvNoEmp }; R.loaded = true; R.key = key;
      } finally { R.loading = false; }
      if (R.queued || key !== this.recKey()) { this.loadRecords(); return; }
      if (this.host.isConnected && this.section === 'fleet') this.render();
    }
    recordsPanel(all, today, now) {
      const R = this.recs, V = this.veh, show = n => n === null || n === undefined ? '–' : n.toLocaleString ? n.toLocaleString('en-US') : n;
      const card = (title, list, rows, note) => this.panel(title, `<dl class="fo-trio">${rows.map(([l, n, tone]) => `<div><dt>${esc(l)}</dt><dd class="${tone || ''}">${esc(show(n))}</dd></div>`).join('')}</dl>`, note, null, `<button type="button" data-list="${esc(list)}">Open list</button>`);
      const dn = R.dn || {}, dr = R.drv || {}, wait = !R.loaded, dnWait = wait || R.key !== this.recKey();
      const trips = mapTrips(all, today, now), working = all.filter(x => active(x) && x.vehicle && day(x[F.date]) === today);
      const active30 = V.loaded ? V.rows.length : null, goods = V.loaded ? V.rows.filter(v => v.vehicle_service_type === 'Goods Carriage Vehicle').length : null;
      const usedToday = new Set(working.map(x => x.vehicle)).size;
      const driversToday = new Set(all.filter(x => active(x) && x.driver && day(x[F.date]) === today).map(x => x.driver)).size;
      const g = [
        card(`Delivery notes, ${this.rangeLabel()}`, 'Delivery Note', [['DM vehicle', dnWait ? null : dn.dm], ['Customer pickup', dnWait ? null : dn.pickup], ['Rented vehicle', dnWait ? null : dn.rented]], dnWait ? 'Counting…' : `${show(dn.total)} submitted in range. ${show(dn.draft)} drafts, ${show(dn.toBill)} waiting to be billed. Only DM vehicle notes need a trip.`),
        card('Vehicles', 'Vehicle', [['Active', active30], ['Goods carriage', goods], ['Used today', usedToday]], `${plural(trips.filter(t => t.phase !== 'Finished today').length, 'vehicle')} on an ongoing or upcoming trip, ${plural(new Set(working.map(x => x.vehicle)).size, 'vehicle')} used today.`),
        card('Drivers', 'Driver', [['Active', wait ? null : dr.active], ['On trips today', driversToday], ['No employee linked', wait ? null : dr.noEmployee, dr.noEmployee ? 'fo-warn-text' : '']], wait ? 'Counting…' : `${show(dr.all)} drivers on file, active and inactive.`)];
      const reports = LINKS.fleet.filter(l => l[0] === 'report');
      return `<div class="fo-grid g3">${g.join('')}</div>` + this.panel('Reports', `<div class="fo-links c3">${reports.map(([, name]) => `<button type="button" data-report="${esc(name)}"><span>${esc(name)}</span><small>Report</small></button>`).join('')}</div>`, 'Opens the native report in Desk, using your own permissions.');
    }
    // ---- live map ----
    // Every active vehicle is on the map at its last known position. Vehicles on a trip are green; the rest are grey.
    mapEntries() {
      const L = this.live, today = frappe.datetime.get_today(), now = stamp(frappe.datetime.now_datetime());
      const trips = mapTrips(this.filtered(), today, now), by = new Map(trips.map(t => [t.vehicle, t])), names = new Map();
      this.veh.rows.forEach(v => names.set(v.name, v.license_plate || v.name));
      trips.forEach(t => { if (!names.has(t.vehicle)) names.set(t.vehicle, t.vehicle); });
      return [...names].map(([vehicle, plate]) => { const t = by.get(vehicle); return { vehicle, plate, trip: t ? t.trip : null, phase: t ? t.phase : 'No trip', rank: t ? t.rank : 3, fix: L.pos.get(vehicle) || null }; })
        .sort((a, b) => a.rank - b.rank || a.plate.localeCompare(b.plate));
    }
    pinPhase(e) { return isOngoing(e.phase) ? 'on' : e.phase === 'Upcoming' ? 'up' : e.phase === 'Finished today' ? 'fin' : 'none'; }
    liveEntries() {
      const L = this.live, now = stamp(frappe.datetime.now_datetime()), stale = e => !e.fix || minutesSince(e.fix.at, now) > FRESH_MIN;
      const keep = { all: () => true, trip: e => !!e.trip, parked: e => !e.trip, nosignal: stale }[L.filter || 'all'];
      return this.mapEntries().filter(keep);
    }
    tripCard(e, now, today) {
      if (!e) return '<div class="fo-empty">Select a vehicle on the map or in the list to see its trip.</div>';
      const f = e.fix, m = f ? minutesSince(f.at, now) : null, stale = !f || m > FRESH_MIN, t = e.trip, hm = v => (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v || '') ? String(v).slice(11, 16) : '');
      const tone = isOngoing(e.phase) ? 'good' : e.phase === 'Upcoming' ? 'info' : 'neutral';
      const pos = f ? `<dl class="fo-facts"><div><dt>Last known place</dt><dd>${esc(f.place || 'Place not reported')}</dd></div><div><dt>Last fix</dt><dd>${esc(agoText(m))}${stale ? ' (signal old)' : ''}</dd></div><div><dt>Movement</dt><dd>${stale ? 'Unknown' : f.speed > 3 ? Math.round(f.speed) + ' km/h' : f.ignition ? 'Engine on, stopped' : 'Parked'}</dd></div></dl>` : '<p class="fo-muted">This vehicle has no tracker position.</p>';
      let body = '';
      if (t) {
        const next = STEPS.findIndex(([, k]) => !recorded(t[k]));
        const steps = `<ol class="fo-steps">${STEPS.map(([l, k], i) => `<li class="${recorded(t[k]) ? 'on' : ''}${i === next ? ' cur' : ''}"><i aria-hidden="true"></i><strong>${l}</strong><span>${recorded(t[k]) ? esc(hm(t[k])) : t[k] ? 'Due ' + esc(hm(t[k])) : 'Pending'}</span></li>`).join('')}</ol>`;
        const route = `<div class="fo-route"><div><i aria-hidden="true"></i><strong>${esc(t[F.from] || 'Source unknown')}</strong><small>${hm(t[F.depart]) ? 'Departs ' + esc(hm(t[F.depart])) : 'Departure not set'}</small></div><div class="fo-route-end"><i aria-hidden="true"></i><strong>${esc(t[F.to] || (delivery(t) ? 'Customer delivery' : 'Destination not set'))}</strong><small>${hm(t[F.arrive]) ? 'Arrives ' + esc(hm(t[F.arrive])) : 'Arrival not set'}</small></div></div>`;
        body = `<div class="fo-tc-trip"><div><button type="button" class="fo-link" data-trip="${esc(t.name)}">${esc(t.name)}</button><small>${esc(t[F.type] || 'Type unknown')}${t.docstatus === 0 ? ' (draft)' : ''}</small></div>${badge(e.phase, tone)}</div>${route}${steps}
          <dl class="fo-facts"><div><dt>Driver</dt><dd>${t.driver ? link('driver', t.driver, t.driver_name) : '<span class="fo-bad-text">Not assigned</span>'}</dd></div><div><dt>Recorded window</dt><dd>${esc(hm(t[F.depart]) || '–')} to ${esc(hm(t[F.exit]) || hm(t[F.arrive]) || '–')}</dd></div></dl>`;
      } else {
        const last = this.rows.filter(r => active(r) && r.vehicle === e.vehicle).sort((a, b) => String(b[F.depart] || b[F.date] || '').localeCompare(String(a[F.depart] || a[F.date] || '')))[0];
        body = `<div class="fo-tc-trip"><div><strong>No trip today</strong><small>${last ? `Last trip ${esc(dayLabel(day(last[F.date] || last[F.depart])).toLowerCase())}` : 'No trip in the loaded window'}</small></div>${badge('Parked', 'neutral')}</div>${last ? `<p class="fo-foot"><button type="button" class="fo-link" data-trip="${esc(last.name)}">${esc(last.name)}</button>, ${esc(last[F.from] || 'source unknown')}${last[F.to] ? ' to ' + esc(last[F.to]) : ''}</p>` : ''}`;
      }
      const actions = `<div class="fo-tc-actions">${t ? `<button type="button" class="fo-primary" data-trip="${esc(t.name)}">Trip details</button>` : ''}<a class="fo-btn" href="/app/vehicle/${encodeURIComponent(e.vehicle)}">Open vehicle</a>${t ? `<a class="fo-btn" href="/app/delivery-trip/${encodeURIComponent(t.name)}">Open trip form</a>` : ''}</div>`;
      return `<div class="fo-tc-head"><h4>${esc(e.plate || e.vehicle)}</h4>${f && !stale ? '<span class="fo-live"><i aria-hidden="true"></i>Live</span>' : ''}</div>${body}${pos}${actions}`;
    }
    renderLive(trips, today, now) {
      const L = this.live, all = this.mapEntries(), stale = e => !e.fix || minutesSince(e.fix.at, now) > FRESH_MIN;
      const on = all.filter(e => isOngoing(e.phase)), up = all.filter(e => e.phase === 'Upcoming'), fin = all.filter(e => e.phase === 'Finished today'), quiet = all.filter(stale), waiting = L.loading && !L.pos.size;
      const kpis = [['Vehicles tracked', waiting ? '–' : all.filter(e => e.fix).length, `Of ${plural(all.length, 'active vehicle')}`, ''], ['On the road', on.length, 'Departed, no site exit recorded', ''], ['Upcoming', up.length, 'Not yet departed', ''],
        ['Finished today', fin.length, 'Trip times all recorded', ''], ['No recent signal', waiting ? '–' : quiet.length, `Last fix over ${FRESH_MIN} minutes old, or none`, quiet.length ? 'warn' : '']];
      let html = this.tiles(kpis, false);
      const chips = [['all', 'All', all.length], ['trip', 'On a trip', all.filter(e => e.trip).length], ['parked', 'No trip', all.filter(e => !e.trip).length], ['nosignal', 'No signal', quiet.length]];
      const flt = L.filter || 'all', entries = this.liveEntries(), sel = entries.find(e => e.vehicle === L.sel) || all.find(e => e.vehicle === L.sel) || null;
      const bar = `<div class="fo-map-bar"><div class="fo-chips" role="group" aria-label="Show vehicles">${chips.map(([k, l, n]) => `<button type="button" data-chip="${k}" aria-pressed="${flt === k}">${l}<b>${n}</b></button>`).join('')}</div>
        <div class="fo-map-status"><span class="fo-muted">${L.loading ? 'Locating vehicles…' : L.error ? esc(L.error) : L.at ? `Updated ${esc(L.at)} site time` : ''}</span><button type="button" data-map="refresh">Update positions</button></div></div>`;
      const located = entries.filter(e => e.fix);
      const legend = '<p class="fo-legend-line fo-map-legend"><i class="fo-ldot" data-phase="on"></i>On the road <i class="fo-ldot" data-phase="up"></i>Upcoming <i class="fo-ldot" data-phase="fin"></i>Finished today <i class="fo-ldot" data-phase="none"></i>No trip <i class="fo-ldot" data-phase="none" data-stale="true"></i>Signal old</p>';
      const map = all.length ? `${bar}<div class="fo-map" data-map-box role="region" aria-label="Map of vehicles"><div class="fo-map-layer"></div><div class="fo-map-tools"><button type="button" data-map="in" aria-label="Zoom in">+</button><button type="button" data-map="out" aria-label="Zoom out">−</button><button type="button" data-map="fit" aria-label="Fit all vehicles">${icons.fit}</button></div>${located.length || L.loading ? '' : '<div class="fo-map-empty fo-empty">No tracker positions found for these vehicles.</div>'}<p class="fo-map-credit">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors</p></div>${legend}`
        : `<div class="fo-empty">No active vehicles found. Check read access to Vehicle.</div>`;
      html += `<div class="fo-mapgrid">${this.panel('Where vehicles are now', map, '', entries.length || null, '', 'fo-mappanel')}${this.panel('Selected vehicle', `<div class="fo-tc" aria-live="polite">${this.tripCard(sel, now, today)}</div>`, '', null, '', 'fo-tcpanel')}</div>`;
      const key = `live-${flt}`, size = 8, page = Math.min(this.pages[key] || 0, Math.max(0, Math.ceil(entries.length / size) - 1)), start = page * size;
      (this.lists || (this.lists = {}))[key] = { dt: 'Vehicle', names: entries.map(e => e.vehicle) };
      const rowHTML = e => {
        const f = e.fix, m = f ? minutesSince(f.at, now) : null, old = !f || m > FRESH_MIN, t = e.trip, moving = f && !old && f.speed > 3;
        return `<tr data-focus="${esc(e.vehicle)}" data-lane="${t && isOngoing(e.phase) ? 'good' : !f ? 'none' : old ? 'warn' : 'none'}"${L.sel === e.vehicle ? ' aria-selected="true"' : ''}>
          <td data-slot="trip"><strong>${esc(e.plate || e.vehicle)}</strong><small>${t ? esc(t.name) : 'No trip'}</small></td>
          <td data-slot="route"><span>${f ? esc(f.place || 'Place not reported') : '<em>No tracker position</em>'}</span><small>${t ? esc((t[F.from] || 'Source unknown') + (t[F.to] ? ' to ' + t[F.to] : '')) : ''}</small></td>
          <td data-slot="who" data-label="Driver"><div class="fo-who">${t && t.driver ? esc(t.driver_name || t.driver) : '<span class="fo-muted">–</span>'}</div></td>
          <td data-slot="when" data-label="Last fix"><time><strong>${esc(f ? String(f.at).slice(11, 16) : '–')}</strong><span>${esc(agoText(m))}</span></time></td>
          <td data-slot="status">${badge(e.phase, isOngoing(e.phase) ? 'good' : e.phase === 'Upcoming' ? 'info' : 'neutral')}</td>
          <td data-slot="next" data-label="Movement">${!f ? '<span class="fo-muted">–</span>' : old ? '<span class="fo-warn">Signal old</span>' : `<span class="fo-stage">${moving ? Math.round(f.speed) + ' km/h' : f.ignition ? 'Engine on, stopped' : 'Parked'}</span>`}</td></tr>`;
      };
      html += this.panel('Vehicles', entries.length ? `<div class="fo-table-wrap" tabindex="0" role="region" aria-label="Vehicles, scrollable"><table><thead><tr><th>Vehicle</th><th>Last known place</th><th>Driver</th><th>Last fix</th><th>Trip</th><th>Movement</th></tr></thead><tbody>${entries.slice(start, start + size).map(rowHTML).join('')}</tbody></table></div>${this.pager(key, entries.length, start, size, page, 'vehicles', 'Vehicle')}` : '<div class="fo-empty">No vehicles match this filter.</div>', 'Select a row to centre the map on that vehicle.', entries.length);
      return html;
    }
    async loadLive(silent, scope = 'all') {
      const L = this.live; if (L.loading) return;
      const all = this.mapEntries(), pick = { all: () => true, trips: e => !!e.trip || e.vehicle === L.sel, missing: e => !L.tried.has(e.vehicle) }[scope];
      const names = [...new Set(all.filter(pick).map(e => e.vehicle))].slice(0, 120);
      if (!names.length) { if (scope === 'all') L.at = String(frappe.datetime.now_datetime()).slice(11, 16); return; }
      L.loading = true; L.error = ''; ++L.token;
      if (!silent) this.render();
      const FIELDS = ['vehicle', 'latitude', 'longitude', 'track_date_time', 'speed', 'ignition', 'location', 'distance'];
      try {
        for (let i = 0; i < names.length; i += 6) {
          await Promise.all(names.slice(i, i + 6).map(async v => {
            const logs = await frappe.db.get_list('Vehicle Arabitra Logs', { fields: FIELDS, filters: [['vehicle', '=', v]], order_by: 'track_date_time desc', limit_page_length: 8, limit: 8 });
            const fixes = logs.map(toFix).filter(Boolean); L.tried.add(v);
            L.pos.set(v, fixes.length ? { ...fixes[0], trail: fixes.slice().reverse().map(x => ({ lat: x.lat, lng: x.lng })) } : null);
          }));
          if (!this.host.isConnected) return;
        }
        L.at = String(frappe.datetime.now_datetime()).slice(11, 16);
      } catch (error) {
        L.error = 'Could not read vehicle tracking. Check read permission on Vehicle Arabitra Logs.';
        console.error('Logistics Dashboard live map failed', error);
      } finally { L.loading = false; }
      if (this.host.isConnected && this.section === 'fleet' && this.tab === 'Live map') this.render();
    }
    ensureFixes() { // vehicles that appeared after the last read (vehicle list loaded, filters changed) get a position lookup
      const L = this.live; if (L.loading || L.error) return;
      if (this.mapEntries().some(e => !L.tried.has(e.vehicle))) this.loadLive(true, 'missing');
    }
    mapAction(a) {
      const L = this.live;
      if (a === 'refresh') { this.loadLive(false, 'all'); return; }
      if (!L.view) return;
      if (a === 'in') L.view.z = Math.min(18, L.view.z + 1);
      if (a === 'out') L.view.z = Math.max(3, L.view.z - 1);
      if (a === 'fit') L.refit = true;
      this.drawMap();
    }
    selectVehicle(v, centre) {
      const L = this.live, f = L.pos.get(v); L.sel = v;
      if (centre && f) L.view = { lat: f.lat, lng: f.lng, z: Math.max(L.view ? L.view.z : 0, 14) };
      this.render();
      if (centre) this.el.querySelector('[data-map-box]')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
    drawMap() { this.drawMapCore(); if (this.lang === 'ar') trTree(this.el.querySelector('.fo-map')); }
    drawMapCore() {
      const box = this.el.querySelector('[data-map-box]'); if (!box) return;
      const layer = box.querySelector('.fo-map-layer'), L = this.live, W = box.clientWidth || 640, H = box.clientHeight || 420, now = stamp(frappe.datetime.now_datetime());
      const entries = this.liveEntries(), located = entries.filter(e => e.fix);
      if (!L.view || L.refit) { L.view = fitView(located.map(e => e.fix), W, H); L.refit = false; }
      const { lat, lng, z } = L.view, cx = mercX(lng, z), cy = mercY(lat, z), n = Math.pow(2, z), ox = cx - W / 2, oy = cy - H / 2;
      let tiles = '';
      for (let ty = Math.floor(oy / 256) - 1; ty <= Math.floor((oy + H) / 256) + 1; ty++) {
        if (ty < 0 || ty >= n) continue;
        for (let tx = Math.floor(ox / 256) - 1; tx <= Math.floor((ox + W) / 256) + 1; tx++) {
          tiles += `<img class="fo-tile" alt="" draggable="false" src="https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png" style="left:${Math.round(tx * 256 - ox)}px;top:${Math.round(ty * 256 - oy)}px">`;
        }
      }
      const px = p => [mercX(p.lng, z) - ox, mercY(p.lat, z) - oy];
      const trails = located.filter(e => e.fix.trail && e.fix.trail.length > 1).map(e => `<polyline points="${e.fix.trail.map(p => px(p).map(v => v.toFixed(1)).join(',')).join(' ')}" data-phase="${isOngoing(e.phase) ? 'on' : 'off'}"/>`).join('');
      // Vehicles parked in the same yard share a position; nudge overlapping pins apart so each one can be clicked.
      const placed = [], spot = e => {
        let [x, y] = px(e.fix);
        for (let k = 0, r = 20; k < 36 && placed.some(q => Math.hypot(q[0] - x, q[1] - y) < 19); k++) { const [bx, by] = px(e.fix), ang = (k % 6) * Math.PI / 3 + (k / 6 | 0) * 0.5; r = 20 + 14 * (k / 6 | 0); x = bx + r * Math.cos(ang); y = by + r * Math.sin(ang); }
        placed.push([x, y]); return [x, y];
      };
      const pins = located.map(e => {
        const [x, y] = spot(e); if (x < -30 || y < -30 || x > W + 30 || y > H + 30) return '';
        const m = minutesSince(e.fix.at, now), stale = m === null || m > FRESH_MIN, label = e.plate || e.vehicle;
        return `<button type="button" class="fo-pin${L.sel === e.vehicle ? ' is-sel' : ''}${e.trip ? '' : ' is-quiet'}" data-select="${esc(e.vehicle)}" data-phase="${this.pinPhase(e)}" data-stale="${stale}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px" aria-label="${esc(`${label}, ${e.phase}, ${agoText(m)}`)}" title="${esc(`${label} · ${e.phase} · ${agoText(m)}${e.fix.place ? ' · ' + e.fix.place : ''}`)}"><i></i><span>${esc(label)}</span></button>`;
      }).join('');
      layer.style.transform = '';
      layer.innerHTML = `${tiles}<svg class="fo-trails" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${trails}</svg>${pins}`;
      layer.querySelectorAll('.fo-tile').forEach(i => i.addEventListener('error', () => { i.style.visibility = 'hidden'; }));
    }
    // ---- request-to-order delay (Procurement Tracker report) ----
    async loadDelay() {
      const D = this.delay; if (D.loading || D.loaded) return;
      D.loading = true; D.error = ''; this.render();
      const today = frappe.datetime.get_today();
      try {
        const res = await frappe.call({ method: 'frappe.desk.query_report.run', args: { report_name: 'Procurement Tracker', filters: { from_date: shift(today, -90), to_date: today } } });
        D.rows = rowsOf(res); D.loaded = true; D.at = String(frappe.datetime.now_datetime()).slice(11, 16);
      } catch (error) {
        D.error = 'Could not run the Procurement Tracker report. Check that your role can open it, then select Refresh.';
        console.error('Logistics Dashboard delay report failed', error);
      } finally { D.loading = false; }
      if (this.host.isConnected && this.section === 'procurement') this.render();
    }
    delayPanel(today) {
      const D = this.delay;
      if (D.loading) return this.panel('Request to order time', '<div class="fo-empty">Running the Procurement Tracker report…</div>');
      if (D.error) return this.panel('Request to order time', `<div class="fo-empty">${esc(D.error)} <button type="button" class="fo-link" data-report="Procurement Tracker">Open report</button></div>`);
      if (!D.loaded) return '';
      const X = delayStats(D.rows, today);
      if (!X.requests) return this.panel('Request to order time', '<div class="fo-empty">No purchase requests in the last 90 days.</div>');
      const dl = `<dl class="fo-trio"><div><dt>Median days</dt><dd>${X.median === null ? '–' : X.median}</dd></div><div><dt>Ordered in 3 days</dt><dd>${X.within3 === null ? '–' : X.within3 + '%'}</dd></div><div><dt>Waiting over 7 days</dt><dd class="${X.waitingOld ? 'fo-bad-text' : ''}">${X.waitingOld}</dd></div></dl>`;
      const left = this.panel('Time from request to first order', dl + barsHTML(X.buckets, X.ordered, 'No request has been ordered yet.', 6), `${X.ordered} of ${plural(X.requests, 'request')} ordered. ${X.waiting} still have no order. Requests from the last 90 days.`);
      const slow = X.slow.slice(0, 5).map(([k, avg, n]) => [`${k} (${n})`, avg, avg > 7 ? 'bad' : avg > 3 ? 'warn' : '']);
      const right = this.panel('Slowest cost centres', barsHTML(slow, Math.max(1, ...slow.map(x => x[1])), 'Not enough ordered requests to compare.', 5), 'Average days to first order. Cost centres with at least 2 ordered requests; request count in brackets.');
      return `<div class="fo-grid g2">${left}${right}</div>`;
    }
    // ---- procurement data ----
    async pagesOf(doctype, args, alive) {
      const rows = []; let capped = false;
      let fields = args.fields;
      if (!Array.isArray(fields)) { // { core, optional }: try everything, fall back to the core fields if a custom field is refused
        const all = [...fields.core, ...fields.optional];
        try { await frappe.db.get_list(doctype, { ...args, fields: all, limit_start: 0, limit_page_length: 1, limit: 1 }); fields = all; }
        catch (e) { console.warn('Logistics Dashboard: using core fields only for', doctype, e); fields = fields.core; this.proc.reduced = this.proc.reduced || new Set(); this.proc.reduced.add(doctype); }
      }
      for (let start = 0; start < 5000; start += 500) {
        const page = await frappe.db.get_list(doctype, { ...args, fields, limit_start: start, limit_page_length: 500, limit: 500 });
        if (!alive()) return null;
        rows.push(...page);
        if (page.length < 500) break;
        if (start === 4500) capped = true;
      }
      return { rows, capped };
    }
    async refreshProcurement() {
      const token = this.pversion = (this.pversion || 0) + 1, alive = () => token === this.pversion && this.host.isConnected, today = frappe.datetime.get_today(), P = this.proc;
      P.loading = true; P.denied = new Set(); P.capped = false; P.reduced = new Set();
      this.el.setAttribute('aria-busy', 'true'); this.render();
      this.state('Loading purchase orders, requests and receipts…', '', 'procurement');
      const jobs = [
        ['Purchase Order', { fields: PO_FIELDS, filters: [['docstatus', 'in', [0, 1]], ['status', 'in', ['Draft', ...PO_OPEN_STATUS]]], order_by: 'name asc' }],
        ['Material Request', { fields: MR_FIELDS, filters: [['docstatus', '=', 1], ['material_request_type', '=', 'Purchase'], ['status', 'in', ['Pending', 'Partially Ordered']]], order_by: 'name asc' }],
        ['Purchase Receipt', { fields: PR_FIELDS, filters: [['docstatus', '=', 1], ['posting_date', '>=', shift(today, -29)]], order_by: 'name asc' }]];
      try {
        const out = await Promise.allSettled(jobs.map(([dt, a]) => this.pagesOf(dt, a, alive)));
        if (!alive()) return;
        const keys = ['po', 'mr', 'pr'];
        out.forEach((o, i) => {
          if (o.status === 'fulfilled' && o.value) { P[keys[i]] = o.value.rows; P.capped = P.capped || o.value.capped; }
          else { P[keys[i]] = []; P.denied.add(jobs[i][0]); console.error('Logistics Dashboard: could not load', jobs[i][0], o.reason); }
        });
        P.loaded = true; P.loading = false; P.at = String(frappe.datetime.now_datetime()).slice(11, 16);
        const fill = (field, rows, first) => {
          const select = this.el.querySelector(`[data-pfilter="${field.name}"]`), prior = select.value;
          select.innerHTML = `<option value="">${first}</option>` + [...new Set(rows.map(r => r[field.key]).filter(Boolean))].sort().map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
          select.value = prior; if (select.selectedIndex < 0) select.selectedIndex = 0;
        };
        fill({ name: 'company', key: 'company' }, [...P.po, ...P.mr, ...P.pr], 'All permitted companies');
        fill({ name: 'buyer', key: 'buyer' }, [...P.po.map(r => ({ buyer: poBuyer(r) })), ...P.pr.map(r => ({ buyer: r.custom_purchaser_name }))], 'All buyers');
        this.render();
        if (P.denied.size === 3) this.state('Could not load procurement data. Check read permission on Purchase Order, Material Request and Purchase Receipt, and access to their custom fields, then select Refresh.', 'error', 'procurement');
        else if (P.denied.size) this.state(`Could not read ${[...P.denied].join(' and ')}. Check read permission and custom field access. Figures that depend on it show a dash.`, 'warn', 'procurement');
        else if (P.reduced && P.reduced.size) this.state(`Some custom fields on ${[...P.reduced].join(' and ')} are not readable for your role, so buyer, location or priority may show as not set.`, 'warn', 'procurement');
        else if (P.capped) this.state('Partial results: the 5,000-record limit was reached for one list, so counts cover loaded records only. Use the native lists for the rest.', 'warn', 'procurement');
        else this.state(`${plural(P.po.filter(poOpen).length, 'open order')} and ${plural(P.mr.length, 'purchase request')} loaded. Updated ${P.at} site time.`, '', 'procurement');
      } catch (error) {
        if (!alive()) return;
        P.loading = false; this.render();
        this.state('Could not load procurement data. Select Refresh to try again.', 'error', 'procurement');
        console.error('Logistics Dashboard procurement load failed', error);
      } finally { if (token === this.pversion) this.el.removeAttribute('aria-busy'); }
    }
    pFiltered() {
      const company = this.pv('company'), kind = this.pv('kind'), buyer = this.pv('buyer'), q = this.pv('search').trim().toLowerCase(), P = this.proc;
      const hit = (...vals) => !q || vals.some(x => String(x || '').toLowerCase().includes(q));
      return {
        po: P.po.filter(r => (!company || r.company === company) && (!kind || r[PO.kind] === kind) && (!buyer || poBuyer(r) === buyer) && hit(r.name, r.supplier, r.supplier_name, r[PO.stage], r[PO.place])),
        mr: P.mr.filter(r => (!company || r.company === company) && (!kind || r.custom_purchase_type === (kind === 'Foreign' ? 'Import' : 'Local')) && hit(r.name, r.custom_purpose_of_purchase)),
        pr: P.pr.filter(r => (!company || r.company === company) && (!buyer || r.custom_purchaser_name === buyer) && hit(r.name, r.supplier, r.supplier_name))
      };
    }
    pSets() {
      const f = this.pFiltered(), today = frappe.datetime.get_today(), open = f.po.filter(poOpen), drafts = f.po.filter(poDraft);
      return { today, open, drafts, working: [...open, ...drafts], mr: f.mr, pr: f.pr, totalPO: f.po.length,
        moving: open.filter(poMoving), late: open.filter(r => poLate(r, today) && !poStale(r, today)), stale: open.filter(r => poStale(r, today)),
        due7: open.filter(r => { const d = poDue(r); return d && d >= today && d <= shift(today, 6); }),
        customs: open.filter(inCustoms), foreign: open.filter(foreignShipment),
        partial: open.filter(r => num(r.per_received) > 0), toBill: f.pr.filter(r => !r.is_return && ['To Bill', 'Partly Billed'].includes(r.status)), ahead: open.filter(billedAhead),
        tracked: open.filter(r => poMoving(r) || inCustoms(r) || r[PO.eta]) };
    }
    exportProcurement() {
      const S = this.pSets(), rows = S.working;
      if (!rows.length) { frappe.msgprint(this.T('No matching purchase orders to export.')); return; }
      const columns = ['name', 'status', 'company', 'supplier_name', PO.kind, PO.buyer, PO.place, 'transaction_date', 'schedule_date', 'per_received', 'per_billed', 'base_grand_total', PO.eta, PO.stage];
      this.download(columns, rows, `logistics-procurement-${S.today}${this.proc.capped ? '-partial' : ''}.csv`);
      frappe.show_alert({ message: this.T(`Exported ${plural(rows.length, 'purchase order')}${this.proc.capped ? ' (partial data)' : ''}. Open and draft orders that match the filters are included.`), indicator: 'blue' });
    }
    download(columns, rows, filename) {
      // Prevent spreadsheet programs from executing formula-like record values.
      const cell = v => '"' + (/^[\s]*[=+@\-\t\r]/.test(String(v || '')) ? "'" : '') + String(v ?? '').replace(/"/g, '""') + '"';
      const csv = '﻿' + [columns, ...rows.map(r => columns.map(c => r[c]))].map(row => row.map(cell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })), a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    pager(key, total, start, size, page, noun, doctype) {
      return `<div class="fo-pagination"><span>${start + 1}–${Math.min(start + size, total)} of ${total} ${noun}</span><div>${total > size ? `<button type="button" data-page-key="${key}" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''} aria-label="Previous page">Previous</button><button type="button" data-page-key="${key}" data-page="${page + 1}" ${start + size >= total ? 'disabled' : ''} aria-label="Next page">Next</button>` : ''}<button type="button" data-open-list="${key}">Open in ${esc(doctype)} list</button></div></div>`;
    }
    dtable(kind, rows, size = 6, empty = 'Nothing in this selection.') {
      const S = PSPEC[kind], key = `table-${this.tableIndex++}`, today = frappe.datetime.get_today();
      this.lists[key] = { dt: S.doctype, names: rows.map(r => r.name) };
      if (!rows.length) return `<div class="fo-empty">${esc(empty)}</div>`;
      const page = Math.min(this.pages[key] || 0, Math.max(0, Math.ceil(rows.length / size) - 1)), start = page * size;
      const body = rows.slice(start, start + size).map(r => `<tr data-doc="${esc(S.doctype)}" data-name="${esc(r.name)}" data-lane="${S.lane(r, today)}">${S.cells(r, today)}</tr>`).join('');
      return `<div class="fo-table-wrap" tabindex="0" role="region" aria-label="${esc(S.label)}, scrollable"><table><thead><tr>${S.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>${this.pager(key, rows.length, start, size, page, S.noun, S.doctype)}`;
    }
    pQueue(index, S) {
      const today = S.today;
      return [['po', S.open], ['po', S.due7], ['po', S.late], ['po', S.stale], ['pr', S.toBill], ['mr', S.mr]][index];
    }
    // Delivery Trips of type "Materials Collection from Supplier": the vehicle side of procurement, from the same loaded trips as Fleet.
    supplierTrips(today) {
      const all = this.rows.filter(r => active(r) && r[F.type] === 'Materials Collection from Supplier');
      const [lf, lt] = this.liveWindow(), basis = this.value('basis');
      const inW = basis === 'all' ? all : all.filter(r => { const d = day(r[F.date]); return d && d >= (this.value('from') < lf ? this.value('from') : lf) && d <= (this.value('to') > lt ? this.value('to') : lt); });
      const rs = inW.filter(r => this.inRange(r)).filter(r => !this.value('company') || r.company === this.value('company'));
      const d = rs.filter(r => r.docstatus === 0).length, sub = rs.filter(r => r.docstatus === 1 && !done(r)).length, dn = rs.filter(r => r.docstatus === 1 && done(r)).length;
      const body = stackHTML([{label:'Draft',n:d,tone:'neutral'},{label:'Submitted',n:sub,tone:'info'},{label:'Delivered',n:dn,tone:'good'}], 'Supplier collection trips')
        + this.table(rs.slice().sort((a, b) => byDeparture(b, a)), 'normal', 'No supplier collection trips in this range.', 6);
      return this.panel('Supplier collection trips', body, `${this.rangeLabel()}. Delivery Trips of type Materials Collection from Supplier; customer deliveries are on the Fleet side.`, rs.length);
    }
    renderProcurement() {
      const P = this.proc, S = this.pSets(), today = S.today, no = dt => P.denied.has(dt);
      const dash = (dt, n) => no(dt) ? '–' : n, guard = (dt, html) => no(dt) ? `<div class="fo-empty">No read access to ${esc(dt)}.</div>` : html;
      const tabCounts = [null, S.open.length, S.toBill.length, S.mr.length];
      this.el.querySelectorAll('[data-tab]').forEach(b => {
        const i = +b.dataset.tab, c = b.querySelector('.fo-count'), n = P.loading ? null : tabCounts[i];
        if (PTABS[i] === this.ptab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        c.hidden = n === null; c.textContent = n ?? '';
      });
      this.el.querySelector('[data-action="export"]').disabled = P.loading || !S.working.length;
      if (P.loading || !P.loaded) { this.el.querySelector('.fo-body').innerHTML = this.skeleton(); this.el.querySelector('.fo-footer').textContent = 'Loading procurement data…'; return; }
      const sev = bySeverityP(today), sevM = bySeverityM(today), newest = (a, b) => String(b.posting_date + (b.posting_time || '')).localeCompare(String(a.posting_date + (a.posting_time || '')));
      const openValue = sumOf(S.open, 'base_grand_total'), lateValue = sumOf(S.late, 'base_grand_total'), staleValue = sumOf(S.stale, 'base_grand_total');
      let content = '';
      if (this.ptab === 'Overview') {
        const kpis = [
          ['Open orders', dash('Purchase Order', S.open.length), 'Submitted, not fully received', ''],
          ['Due in 7 days', dash('Purchase Order', S.due7.length), 'By required date, or ETA when set', ''],
          ['Past due', dash('Purchase Order', S.late.length), 'Up to 30 days past required date', S.late.length ? 'bad' : ''],
          ['Stale', dash('Purchase Order', S.stale.length), 'Over 30 days late, review or close', S.stale.length ? 'warn' : ''],
          ['Waiting to bill', dash('Purchase Receipt', S.toBill.length), 'Receipts in the last 30 days', S.toBill.length ? 'warn' : ''],
          ['Requests', dash('Material Request', S.mr.length), 'Purchase requests not fully ordered', '']
        ];
        content = this.tiles(kpis, true, 'pqueue');
        const groups = [['Awaiting delivery', 'neutral'], ['Partly received', 'info'], ['Late', 'bad'], ['Stale', 'warn']], gt = tally(S.open, r => poGroup(r, today));
        const next = S.open.filter(r => poDue(r) >= today && poDue(r)).sort(byDue)[0];
        const m1 = this.panel('Order pipeline', guard('Purchase Order', stackHTML(groups.map(([label, tone]) => ({ label, tone, n: gt.get(label) || 0 })), 'Order pipeline') +
          (next ? `<p class="fo-foot">Next due <strong>${esc(dayLabel(poDue(next)))}</strong> ${link('purchase-order', next.name)}</p>` : `<p class="fo-foot">${S.open.length ? 'No dated orders ahead.' : 'No open orders.'}</p>`)));
        const rc = S.pr.filter(r => !r.is_return), billed = rc.filter(r => num(r.per_billed) >= 100).length;
        const m2 = this.panel('Receiving and billing', guard('Purchase Receipt', meterHTML('Receipts fully billed', billed, rc.length) + meterHTML('Open orders with goods received', S.partial.length, S.open.length) +
          `<dl class="fo-trio"><div><dt>To bill</dt><dd>${S.toBill.length}</dd></div><div><dt>Returns</dt><dd>${S.pr.filter(r => r.is_return).length}</dd></div><div><dt>Billed early</dt><dd class="${S.ahead.length ? 'fo-bad-text' : ''}">${S.ahead.length}</dd></div></dl>`), 'Receipts of the last 30 days.');
        const m3 = this.panel('Value in motion', guard('Purchase Order', `<ul class="fo-money"><li><span>Open order value</span><strong>${compact(openValue)}</strong></li><li><span>Past due value</span><strong>${compact(lateValue)}</strong></li><li><span>Stale value</span><strong>${compact(staleValue)}</strong></li></ul>`), 'Order totals in company currency.');
        content += `<div class="fo-grid g3">${m1}${m2}${m3}</div>`;
        const tl = tally(S.working.flatMap(r => poIssues(r, today).map(i => ({ i }))), x => x.i), ig = [...tl].sort((a, b) => urgentP(b[0]) - urgentP(a[0]) || b[1] - a[1] || a[0].localeCompare(b[0]));
        const shown = ig.slice(0, 6), restN = ig.slice(6).reduce((s, g) => s + g[1], 0);
        const g1 = this.panel('Orders due, next 14 days', guard('Purchase Order', colsHTML(dueBuckets(S.open, today), 'Orders due per day')), S.late.length ? `${plural(S.late.length, 'past-due order')} not shown here.` : 'By required date, or ETA when set.');
        const g2 = this.panel('Needs attention', guard('Purchase Order', ig.length ? `<ul class="fo-issue-list">${shown.map(([k, n]) => `<li><button type="button" data-pissue="${esc(k)}" aria-pressed="${this.pissue === k}"><i data-tone="${urgentP(k) ? 'bad' : 'warn'}" aria-hidden="true"></i><span>${esc(k)}</span><strong>${n}</strong></button></li>`).join('')}</ul>${restN ? `<p class="fo-foot">${plural(restN, 'more flag')} not shown.</p>` : ''}` : '<div class="fo-empty fo-ok">Nothing needs action.</div>'));
        content += `<div class="fo-grid g2">${g1}${g2}</div>`;
        content += this.supplierTrips(today);
        const queueNames = ['Open orders', 'Due in 7 days', 'Past due', 'Stale orders', 'Receipts waiting to bill', 'Purchase requests'];
        let title = 'Most urgent orders', kind = 'po', list = S.working.filter(r => poIssues(r, today).length), note = 'The most urgent orders first. Use the native list for everything else.', extra = '';
        if (this.pq !== null) { title = queueNames[this.pq]; [kind, list] = this.pQueue(this.pq, S); note = ''; }
        else if (this.pissue !== null) { title = this.pissue; list = S.working.filter(r => poIssues(r, today).includes(this.pissue)); note = ''; }
        if (this.pq !== null || this.pissue !== null) extra = '<button type="button" data-action="clear-queue">Clear selection</button>';
        list = list.slice().sort(kind === 'mr' ? sevM : kind === 'pr' ? newest : sev);
        content += this.panel(title, guard(kind === 'mr' ? 'Material Request' : kind === 'pr' ? 'Purchase Receipt' : 'Purchase Order', this.dtable(kind, list, 6, 'Nothing in this selection.')), note, list.length, extra, 'fo-detail').replace('<h3>', '<h3 class="fo-queue-title" tabindex="-1">');
        content += this.linksPanel('procurement');
      } else if (this.ptab === 'Orders & suppliers') {
        const sup = [...tally(S.open, r => r.supplier_name || r.supplier)].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
        const buy = [...tally(S.open, r => poBuyer(r) || 'Not set')].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
        const loc = [...tally(S.open, r => r[PO.place] || 'Not set')].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
        content = this.tiles([['Open orders', dash('Purchase Order', S.open.length), 'Submitted, not fully received', ''], ['Open value', dash('Purchase Order', compact(openValue)), 'Company currency', ''], ['Past due', dash('Purchase Order', S.late.length), `${compact(lateValue)} in value`, S.late.length ? 'bad' : ''], ['Stale', dash('Purchase Order', S.stale.length), 'Over 30 days late', S.stale.length ? 'warn' : ''], ['On hold', dash('Purchase Order', S.open.filter(r => r.status === 'On Hold').length), 'Stopped by the buyer', ''], ['Awaiting approval', dash('Purchase Order', S.drafts.length), 'Draft orders', '']], false);
        const left = this.panel('Suppliers with most open orders', guard('Purchase Order', barsHTML(sup, S.open.length, 'No open orders.', 5)), 'Top 5 by open orders.');
        const mid = this.panel('Open orders by buyer', guard('Purchase Order', barsHTML(buy, S.open.length, 'No open orders.', 5)), 'Purchaser, else PO in charge.');
        const right = this.panel('Delivery location', guard('Purchase Order', barsHTML(loc, S.open.length, 'No open orders.', 5)), 'Where open orders are to be received.');
        content += `<div class="fo-grid g3">${left}${mid}${right}</div>`;
        if (S.tracked.length) content += this.panel('Shipment tracking', guard('Purchase Order', this.dtable('po', S.tracked.slice().sort(byDue), 6, 'No tracked shipments.')), 'Orders with a shipment status, ETA or customs entry.', S.tracked.length);
        content += this.panel('Next due', guard('Purchase Order', this.dtable('po', S.open.slice().sort(byDue), 6, 'No open orders.')), 'Earliest first. The required date is used when no ETA is set.', S.open.length);
        if (!S.tracked.length && !P.denied.has('Purchase Order')) content += '<p class="fo-foot fo-center">Shipment status, ETA and customs fields are not filled in on any open order, so shipment tracking is hidden until they are.</p>';
      } else if (this.ptab === 'Receiving & billing') {
        const rc = S.pr.filter(r => !r.is_return), recent = rc.filter(r => day(r.posting_date) >= shift(today, -6)).length, ret = S.pr.filter(r => r.is_return).length;
        const sup = [...tally(S.toBill, r => r.supplier_name || r.supplier)].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
        content = this.tiles([['Received, 7 days', dash('Purchase Receipt', recent), 'Receipts posted', ''], ['Waiting to bill', dash('Purchase Receipt', S.toBill.length), 'Status To Bill or Partly Billed', S.toBill.length ? 'warn' : ''], ['Billed', dash('Purchase Receipt', rc.filter(r => num(r.per_billed) >= 100).length), 'Fully billed', 'good'], ['Returns', dash('Purchase Receipt', ret), 'Last 30 days', ret ? 'warn' : ''], ['Billed early', dash('Purchase Order', S.ahead.length), 'Billed more than received', S.ahead.length ? 'bad' : ''], ['Partly received', dash('Purchase Order', S.partial.length), 'Open orders', 'info']], false);
        const left = this.panel('Receipts per day', guard('Purchase Receipt', colsHTML(receiptBuckets(S.pr, today), 'Receipts per day')), 'Last 14 days.');
        const right = this.panel('Waiting to bill, by supplier', guard('Purchase Receipt', barsHTML(sup, S.toBill.length, 'Every receipt is billed.', 5)), 'Top 5 by receipts.');
        content += `<div class="fo-grid g2">${left}${right}</div>`;
        content += this.panel('Waiting to bill', guard('Purchase Receipt', this.dtable('pr', S.toBill.slice().sort(newest), 6, 'Every receipt is billed.')), 'Newest first.', S.toBill.length);
        if (S.ahead.length) content += this.panel('Billed ahead of receipt', guard('Purchase Order', this.dtable('po', S.ahead.slice().sort(sev), 6, 'None.')), 'Invoice progress is higher than receiving progress.', S.ahead.length);
        content += this.panel('Latest receipts', guard('Purchase Receipt', this.dtable('pr', S.pr.slice().sort(newest), 6, 'No receipts in the last 30 days.')), 'Last 30 days.', S.pr.length);
      } else {
        const mr = S.mr, high = mr.filter(r => r.custom_priority === 'High').length, noPO = mr.filter(mrNoPO).length, late = mr.filter(r => r.schedule_date && r.schedule_date < today).length;
        content = this.tiles([['Pending requests', dash('Material Request', mr.length), 'Not fully ordered', ''], ['High priority', dash('Material Request', high), 'Priority set to High', high ? 'bad' : ''], ['No PO yet', dash('Material Request', noPO), 'Nothing ordered so far', noPO ? 'warn' : ''], ['Past required date', dash('Material Request', late), 'Required date has passed', late ? 'bad' : ''], ['Partly ordered', dash('Material Request', mr.filter(r => num(r.per_ordered) > 0).length), 'Some items on a PO', 'info'], ['Import requests', dash('Material Request', mr.filter(r => r.custom_purchase_type === 'Import').length), 'Purchase type Import', '']], false);
        const ages = [['0 to 2 days', a => a <= 2, ''], ['3 to 7 days', a => a >= 3 && a <= 7, ''], ['8 to 14 days', a => a >= 8 && a <= 14, 'warn'], ['Over 14 days', a => a > 14, 'bad']].map(([k, f, tone]) => [k, mr.filter(r => { const a = mrAge(r, today); return a !== null && f(a); }).length, tone]).filter(a => a[1]);
        const pri = [...tally(mr, r => r.custom_priority || 'Not set')].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n, k === 'High' ? 'bad' : '']);
        const left = this.panel('How long requests have waited', guard('Material Request', barsHTML(ages, mr.length, 'No pending requests.', 6)), 'Days since the request date.');
        const right = this.panel('Requests by priority', guard('Material Request', barsHTML(pri, mr.length, 'No pending requests.', 6)), 'Priority set on the request.');
        content += `<div class="fo-grid g2">${left}${right}</div>`;
        content += this.delayPanel(today);
        content += this.panel('Oldest pending requests', guard('Material Request', this.dtable('mr', mr.slice().sort(sevM), 6, 'No pending purchase requests.')), 'Urgent requests first, then the oldest.', mr.length);
      }
      this.el.querySelector('.fo-body').innerHTML = content;
      this.el.querySelector('.fo-footer').textContent = `${plural(S.totalPO, 'order')}, ${plural(S.mr.length, 'request')} and ${plural(S.pr.length, 'receipt')} match your filters. Open orders are submitted Purchase Orders that are not fully received; drafts appear only under Needs attention. The supplier-type filter does not apply to receipts and the buyer filter does not apply to requests.${P.capped ? ' Partial data: use the native lists.' : ''}`;
    }
    async detail(name) {
      try {
        const doc = await frappe.db.get_doc('Delivery Trip',name);
        const stops = doc.delivery_stops || [], list = issues(doc);
        const evidenceURL = (()=>{
          try {
            const url = new URL(doc[F.evidence],window.location.origin);
            return doc[F.evidence] && url.origin === window.location.origin && /^\/(private\/)?files\//.test(url.pathname) ? url.href : null;
          } catch { return null; }
        })();
        const d = new frappe.ui.Dialog({title:name,size:'large',fields:[{fieldtype:'HTML',fieldname:'trip'}],primary_action_label:this.T('Open Delivery Trip'),primary_action:()=>{d.hide();frappe.set_route('Form','Delivery Trip',name);}});
        const check = (ok, label, text) => `<li class="${ok ? 'fo-yes' : 'fo-no'}"><b aria-hidden="true">${ok ? '✓' : '✕'}</b><span>${esc(label)}</span><em>${esc(text)}</em></li>`;
        const css = this.styles.map(n => n.textContent).join('');
        d.fields_dict.trip.$wrapper.html(this.trHTML(`${css ? `<style>${css}</style>` : ''}<div class="fo fo-dialog${this.lang === 'ar' ? ' fo-rtl' : ''}" dir="${this.lang === 'ar' ? 'rtl' : 'ltr'}">
          <div class="fo-d-head">${statusBadge(doc)}${deliveryBadge(doc)}<span class="fo-muted">${esc(doc.company)}</span></div>
          <dl class="fo-facts"><div><dt>Movement</dt><dd>${esc(doc[F.type]||'Unknown')}</dd></div><div><dt>Vehicle</dt><dd>${link('vehicle',doc.vehicle) || '<span class="fo-bad-text">Not assigned</span>'}</dd></div><div><dt>Driver</dt><dd>${link('driver',doc.driver,doc.driver_name) || '<span class="fo-bad-text">Not assigned</span>'}</dd></div><div><dt>Route</dt><dd>${esc(doc[F.from]||'Source unknown')}${doc[F.to] ? `<span class="fo-to">${esc(doc[F.to])}</span>` : ''}</dd></div></dl>
          ${list.length ? `<div class="fo-d-actions"><h3>To review</h3><ul>${list.map(i=>`<li class="${urgent(i) ? 'fo-bad' : 'fo-warn'}">${esc(i)}</li>`).join('')}</ul></div>` : ''}
          <h3>Recorded journey</h3><ol class="fo-timeline">${STEPS.map(([l,f])=>`<li class="${recorded(doc[f])?'fo-recorded':''}"><strong>${l}</strong><span>${doc[f] ? esc(when(doc[f])) : 'Not recorded'}${stamp(doc[f])>stamp(frappe.datetime.now_datetime())?' (future)':''}</span></li>`).join('')}</ol>
          <p class="fo-note">Recorded fields can be prefilled, so this timeline does not confirm actual movement.</p>
          ${delivery(doc) ? `<h3>Delivery evidence</h3><ul class="fo-evidence">${RECEIPT.map(([f,l])=>check(doc[f]==='Yes',l,doc[f]||'Not set')).join('')}<li class="${doc[F.evidence] ? 'fo-yes' : 'fo-no'}"><b aria-hidden="true">${doc[F.evidence] ? '✓' : '✕'}</b><span>Signed delivery note</span><em>${evidenceURL?`<a href="${esc(evidenceURL)}" target="_blank" rel="noopener noreferrer">Open attachment</a>`:doc[F.evidence]?'Review in trip':'Missing'}</em></li></ul>` : ''}
          <h3>Delivery stops</h3>${stops.length?`<ul class="fo-stops">${stops.map(s=>`<li><strong>${esc(s.customer||'Customer unknown')}</strong><span>${esc(s.address||'Address unknown')}</span><span>${s.delivery_note?link('delivery-note',s.delivery_note):'<em>No Delivery Note linked</em>'}</span></li>`).join('')}</ul>`:'<p class="fo-muted">No delivery stops recorded.</p>'}</div>`));
        d.show();
      } catch(error) { frappe.msgprint(this.T('Unable to open this trip. Check record permission.')); }
    }
  }
  window.DMLogisticsDashboard = { mount: host => new LogisticsDashboard(host) };
  window.DMFleetOperations = window.DMLogisticsDashboard; // kept so existing embeds keep working
  if (typeof root_element !== 'undefined' && root_element) {
    new LogisticsDashboard(root_element.jquery ? root_element[0] : root_element);
  } else {
    frappe.pages['logistics-dashboard'] = frappe.pages['logistics-dashboard'] || {};
    frappe.pages['logistics-dashboard'].on_page_load = wrapper => {
      const page = frappe.ui.make_app_page({parent:wrapper,title:'Logistics Dashboard',single_column:true});
      const host = document.createElement('div'); page.main.append(host); new LogisticsDashboard(host);
    };
  }
})();