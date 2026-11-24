/* Durar Fleet Command Center · v4 — Frappe Custom HTML Block (Script field).
   Paste dashboard.html / dashboard.css / dashboard.js into the matching fields.
   Read-only. Uses permission-checked native list, document and report APIs. No server script. */
(function () {
  'use strict';
  const root = typeof root_element !== 'undefined' ? root_element : document;
  const host = root.querySelector('#dm-fleet');
  if (!host) return;
  if (host._fleetDispose) host._fleetDispose();
  let disposed = false, generation = 0, searchTimer, renderTimer;
  const controller = new AbortController();
  host._fleetDispose = () => { disposed = true; generation++; clearTimeout(searchTimer); clearTimeout(renderTimer); controller.abort(); const t = host.querySelector('.df-tip'); if (t) t.remove(); };
  const today = () => frappe.datetime.get_today();

  /* ───────────── State ───────────── */
  const S = {
    lang: (() => { try { return localStorage.getItem('df-lang') === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } })(), tab: 'overview', selected: '', documentMode: 'all', oil: { state: 'idle', rows: [] }, pending: {}, vd: {}, pg: {},
    ald: { state: 'idle' }, sellSel: '', sellOnly: false, assetDocs: {}, fuelRange: 'dates', fuelLatest: '', maintApproved: false, gps: {}, profile: {}, parts: {}, busy: true, data: {}, notices: [], updated: '', page: 1, accMonth: '', limMonth: '', accPair: '',
    view: 'cards', sort: 'attention', mix: 'branch', queueAll: false, csv: {},
    f: { branch: '', driver: '', service: '', status: '', search: '', ready: '', dq: '', from: frappe.datetime.add_days(today(), -29), to: today() }
  };
  const LIMIT = 10000, PAGE = 500;
  /* Aldrees fuel portal: put the whitelisted server method that proxies the Aldrees API here (see README). While it is empty the Fuel page shows "API not connected". */
  const ALDREES_API_METHOD = '';
  const plateKey = x => String(x || '').toUpperCase().replace(/[^A-Z0-9\u0600-\u06FF]/g, '');
  const ALDREES_LOGO_WHITE = 'data:image/png;base64,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';
  const DURAR_LOGO = 'data:image/png;base64,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';
  const PER_PAGE = 24;

  const NAV = [['overview', 'Overview', 'home'], ['vehicles', 'Vehicles', 'truck'], ['details', 'Vehicle details', 'plate'], ['usage', 'Trips & usage', 'chart'],
    ['maintenance', 'Maintenance', 'tool'], ['fuel', 'Fuel & expenses', 'fuel'], ['accidents', 'Accidents', 'alert'],
    ['selling', 'Vehicle selling', 'tag'], ['documents', 'Documents', 'file']];

  const ICONS = {
    home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-8h6v8"/>',
    truck: '<path d="M2 5h13v12H2zM15 10h4l3 4v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    plate: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12M10 12h8"/>',
    chart: '<path d="M4 3v17h17M8 16v-5M13 16V6M18 16V9"/>',
    tool: '<path d="m14 6 4 4 3-3a6 6 0 0 1-8 8l-7 7-4-4 7-7a6 6 0 0 1 8-8z"/>',
    fuel: '<path d="M3 21V4h11v17M1 21h15M5 7h7v5H5zM14 8h3l4 4v7a2 2 0 0 1-4 0v-5h-3"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6"/>',
    alert: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
    file: '<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>',
    grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
    pin: '<path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    cards: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6.5M12 14.5V21M3 12h6.5M14.5 12H21"/>',
    brake: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.8.7 1.3 1.6 1.3 2.4h5c0-.8.5-1.7 1.3-2.4A6 6 0 0 0 12 3z"/>',
    drop: '<path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11z"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 9v7"/>',
    wiper: '<path d="M3 18a9.5 9.5 0 0 1 18 0M12 18l6-9"/>',
    firstaid: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M12 10.5v6M9 13.5h6"/>',
    extinguisher: '<path d="M8 9h8v12H8zM10 9V5.5h4V9M14 6h4l2 2M5 14h3"/>',
    box: '<path d="m3 8 9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
  };
  const icon = k => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[k] || ICONS.truck) + '</svg>';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = v => { if (v == null || (typeof v === 'string' && !v.trim())) return null; const n = Number(typeof v === 'string' ? v.replace(/,/g, '').trim() : v); return Number.isFinite(n) ? n : null; };
  const fmt = (v, digits = 0) => number(v) == null ? '—' : number(v).toLocaleString(undefined, { maximumFractionDigits: digits });
  const field = (r, k) => esc(r[k] == null || r[k] === '' ? '—' : r[k]);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pill = (text, tone = 'muted') => '<span class="df-pill ' + tone + '">' + esc(text || 'Unknown') + '</span>';
  const docLink = (dt, name, label) => '<button class="df-link" data-doc="' + esc(dt) + '" data-name="' + esc(name) + '">' + esc(label || name) + '</button>';
  const vehicleById = id => (S.data.vehicles?.rows || []).find(v => v.name === id);
  const plateOf = id => { const v = vehicleById(id); return v?.license_plate || id; };
  const vehicleLink = id => '<button class="df-link" data-vehicle="' + esc(id) + '">' + esc(plateOf(id)) + '</button>';
  const tip = text => ' data-tip="' + esc(text) + '"';

  /* ───────────── Sources (verified field names) ───────────── */
  const SOURCES = {
    vehicles: { dt: 'Vehicle', fields: ['license_plate', 'custom_vehicle_status', 'make', 'model', 'vehicle_model', 'employee', 'custom_driver_name_', 'custom_driver', 'branch', 'vehicle_service_type', 'fuel_type', 'custom_attach_image', 'front_side', 'rear_side', 'left_side', 'right_side', 'custom_attach', 'current_odometer', 'custom_odometer_value', 'plate_no', 'custom_price', 'vehicle_value', 'custom_purchase_date', 'acquisition_date', 'csf_tz_year', 'fuel_capacity', 'custom_monthly_limit', 'custom_asset', 'custom_for_sale', 'custom_estimated_selling_price', 'battery_image', 'current_location', 'ignition', 'custom_capacitytons', 'custom_nos_of_accident_occured', 'insurance_company', 'battery_date', 'battery_warranty_date', 'carbon_check_date', 'standard_oild_changing', 'last_oil_change_km', 'km_to_oil_change', 'next_oil_change_km', 'registration_expiry', 'mvpi_date', 'end_date', 'expiry_date', 'license_expiry_date', 'op_card_expiry_date', 'driver_card_expiry_date'] },
    daily: { dt: 'Vehicle Daily Report', vehicle: 'vehicle', date: 'report_date', fields: ['vehicle', 'report_date', 'distance_km', 'distance_6am_6pm', 'distance_6pm_6am', 'idle_time', 'driver_name'] },
    maintenance: { dt: 'Vehicle Maintenance Schedule', vehicle: 'vehicle', fields: ['vehicle', 'date', 'status', 'custom_maintenance_status', 'supplier', 'total_amount'] },
    checks: { dt: 'Driver Vehicle Check', vehicle: 'vehicle', date: 'check_datetime', fields: ['vehicle', 'driver_name', 'check_datetime', 'result', 'fleet_review_status', 'odometer', 'tyres', 'brakes', 'lights', 'engine_oil', 'coolant', 'windshield_wipers', 'first_aid_kit', 'fire_extinguisher', 'load_safety'] },
    issues: { dt: 'Driver Vehicle Issue Request', vehicle: 'vehicle', fields: ['vehicle', 'report_datetime', 'severity', 'issue_category', 'status', 'description', 'photo'] },
    fuel: { dt: 'Aldrees Fuel Usage', vehicle: 'plate_no', date: 'date', fields: ['plate_no', 'date', 'driver_name', 'product', 'quantity', 'amount', 'vat', 'after_vat', 'monthly_limit'] },
    log: { dt: 'Vehicle Log', vehicle: 'license_plate', date: 'date', fields: ['license_plate', 'date', 'odometer', 'last_odometer', 'fuel_qty', 'price'] },
    idle: { dt: 'Vehicle Idle Log', vehicle: 'vehicle', date: 'date', fields: ['vehicle', 'date', 'idle_start', 'idle_end', 'idle_duration_minutes', 'start_location', 'end_location'] },
    history: { dt: 'Vehicle Maintenance History', vehicle: 'plate_no', fields: ['plate_no', 'date', 'total_distance_run', 'total_petrol', 'total_value', 'next_oilchange', 'last_battery', 'last_tire'] },
    accidents: { dt: 'Vehicle Accident', vehicle: 'vehicle_name', fields: ['vehicle_name', 'date', 'employee', 'department', 'location', 'mistake_', 'liability', 'liability_percentage', 'amount_status', 'repair_cost', 'remarks', 'accident_case_no', 'taqdeer', 'najm_report', 'insurance_claim__investigation', 'insurance_amount_received', 'insurance_money_received', 'insurance_amount', 'image_1', 'image_2', 'image_3', 'image_4', 'image_5'] },
    /* Child tables of "Vehicle Condition" (read through the parent so parent permissions apply). */
    condition: { dt: 'Vehicle Condition Table', parent: 'Vehicle Condition', vehicle: 'vehicle_no', fields: ['parent', 'vehicle_no', 'condition', 'remarks', 'milage', 'location', 'driver_name'] }
  };

  /* Deliberately separate: no fallback between document dates. group is only used to colour the horizon chart. */
  const DOCS = [
    ['registration_expiry', 'Istimara / RC', 'Istimara'], ['end_date', 'Insurance', 'Insurance'],
    ['mvpi_date', 'Inspection · MVPI / Fahas', 'MVPI'], ['expiry_date', 'Driving licence · expiry_date', 'Driver'], ['license_expiry_date', 'Driving licence · license_expiry_date', 'Driver'],
    ['op_card_expiry_date', 'Operation card', 'Driver'], ['driver_card_expiry_date', 'Driver card', 'Driver']
  ];
  const DOC_GROUPS = [['Istimara', 'Istimara / RC'], ['Insurance', 'Insurance'], ['MVPI', 'Inspection (MVPI / Fahas)'], ['Driver', 'Licence & cards']];
  const CHECKS = ['tyres', 'brakes', 'lights', 'engine_oil', 'coolant', 'windshield_wipers', 'first_aid_kit', 'fire_extinguisher', 'load_safety'];
  const PART_TABLES = [['engine_and_service', 'Engine & service'], ['transmission_and_drivetrain', 'Transmission'], ['suspension_and_steering', 'Suspension & steering'], ['cooling_and_ac', 'Cooling & AC'], ['electrical', 'Electrical'], ['exhaust_and_emission', 'Exhaust & emission'], ['tyres_and_wheels', 'Tyres & wheels'], ['body', 'Body'], ['trailer', 'Trailer']];
  const OPEN_ISSUE = ['Open', 'In Progress'];
  const STATE_ORDER = ['critical', 'watch', 'almost', 'ready', 'nodata', 'off'];
  const OIL_WATCH = 2000;   // km remaining at which oil service turns Watch (one value for cards, queue, readiness and maintenance)
  const CHECK_DAYS = 30;    // a vehicle check counts for this many days (monthly check)
  const STATE = {
    critical: { label: 'Action needed', glyph: '▲', tone: 'bad' }, watch: { label: 'Watch', glyph: '◆', tone: 'warn' }, almost: { label: 'Almost ready', glyph: '◐', tone: 'info' },
    ready: { label: 'Ready', glyph: '●', tone: 'good' }, off: { label: 'Off-road', glyph: '■', tone: 'muted' }, nodata: { label: 'No data', glyph: '○', tone: 'muted' }
  };

  /* ───────────── Date + value helpers ───────────── */
  function days(date, base = today()) { const a = Date.parse(String(date || '').slice(0, 10) + 'T00:00:00Z'), b = Date.parse(base + 'T00:00:00Z'); return Number.isFinite(a) && Number.isFinite(b) ? Math.round((a - b) / 86400000) : null; }
  function weekStart(date) { const t = Date.parse(String(date).slice(0, 10) + 'T00:00:00Z'); if (!Number.isFinite(t)) return null; const d = new Date(t), dow = (d.getUTCDay() + 6) % 7; return new Date(t - dow * 86400000).toISOString().slice(0, 10); }
  const shortDate = s => { const t = Date.parse(String(s || '').slice(0, 10) + 'T00:00:00Z'); return Number.isFinite(t) ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—'; };
  function safeImage(value) { try { if (!value || /[\\\x00-\x1f\x7f]/.test(value)) return ''; const u = new URL(value, window.location.origin); return u.origin === window.location.origin && /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } }
  const driver = v => v.custom_driver || v.custom_driver_name_ || v.employee || '';
  /* Vehicle photo = the Front Side image (front_side) only. */
  const vehicleImage = v => safeImage(v.front_side);
  const modelName = v => v.vehicle_model || oilRow(v)?.vehicle_model || 'Model not recorded';
  const complete = k => S.data[k]?.state === 'complete';

  /* ───────────── Oil service ───────────── */
  /* The “Vehicles Oil Change Report” (company SQL report) is authoritative: one row per Vehicle.plate_no,
     Current Odometer = Odometer Value + yesterday's Arabitra distance, Next = Last Oil Change KM + Standard Oil Change,
     KM Left = Next − Current. Its KM Left cell is wrapped in an HTML span when < 1000, so it is stripped before parsing. */
  function oilRow(v) { const r = S.oil; if (r?.state !== 'complete') return null; const keys = new Set([v.name, v.plate_no, v.license_plate].map(x => String(x || '').trim()).filter(Boolean)); const found = r.rows.filter(x => keys.has(String(x.vehicle_number || '').trim())); return found.length === 1 ? found[0] : null; }
  function odometer(v) { return number(v.custom_odometer_value); }
  /* basis: report (the company report) | master (same formula from the Vehicle record, without yesterday's distance) | none */
  function oilInfo(v) {
    const row = oilRow(v), rep = row ? number(String(row.km_left_to_change_oil == null ? '' : row.km_left_to_change_oil).replace(/<[^>]*>/g, '')) : null;
    if (rep != null) return { km: rep, basis: 'report' };
    const cur = odometer(v), last = number(v.last_oil_change_km), interval = number(v.standard_oild_changing);
    if (!(cur > 0) || last == null || !(interval > 0)) return { km: null, basis: 'none' };
    return { km: last + interval - cur, basis: 'master' };
  }
  const oil = v => oilInfo(v).km;
  const oilBasis = v => ({ report: 'Vehicles Oil Change Report', master: 'Vehicle: last oil change km + standard interval − Odometer Value', none: 'No baseline recorded' }[oilInfo(v).basis]);

  /* The condition register is a manual snapshot: its age is recomputed from document dates, never from the stored aging field. */
  const regDate = () => { let m = ''; ['condition'].forEach(k => (S.data[k]?.rows || []).forEach(r => { if ((r._pdate || '') > m) m = r._pdate; })); return m; };
  const regStale = () => { const d = regDate(); return !d || -days(d) > 45; };

  /* ───────────── Derived: reasons → readiness ───────────── */
  const RC = new Map();
  function expiryRows(vs) { return vs.flatMap(v => DOCS.map(([key, label, group]) => ({ vehicle: v.name, label, key, group, date: v[key], days: days(v[key]) }))); }
  function computeReasons(v) {
    const out = [];
    DOCS.forEach(([key, label]) => {
      const d = days(v[key]); if (d == null) return;
      if (d < 0) out.push({ sev: 3, kind: 'doc', text: label + ' expired', when: fmt(-d) + ' d overdue', order: d, tab: 'documents', field: key });
      else if (d <= 30) out.push({ sev: 2, kind: 'doc', text: label + ' expires', when: d === 0 ? 'today' : 'in ' + fmt(d) + ' d', order: d, tab: 'documents', field: key });
    });
    const km = oil(v);
    if (km != null) { if (km <= 0) out.push({ sev: 3, kind: 'oil', text: 'Oil service overdue', when: fmt(-km) + ' km over', order: km / 100, tab: 'maintenance' }); else if (km <= OIL_WATCH) out.push({ sev: 2, kind: 'oil', text: 'Oil service due soon', when: 'in ' + fmt(km) + ' km', order: km / 100, tab: 'maintenance' }); }
    if (complete('issues')) (indexBy('issues').get(v.name) || []).filter(r => OPEN_ISSUE.includes(r.status)).forEach(r => out.push({ sev: ['Critical', 'High'].includes(r.severity) ? 3 : 2, kind: 'issue', text: (r.severity || 'Open') + ' issue · ' + (r.issue_category || 'uncategorised'), when: shortDate(r.report_datetime), order: -(days(r.report_datetime) ?? 0), tab: 'vehicles', doc: ['Driver Vehicle Issue Request', r.name] }));
    /* Gaps: nothing is wrong, but readiness cannot be confirmed from the records, so the vehicle is Almost ready, not Ready. */
    if (!v.custom_vehicle_status || v.custom_vehicle_status === 'Active') {
      if (!(odometer(v) > 0)) out.push({ sev: 1, kind: 'gap', text: 'Odometer Value is missing or zero', when: 'not verified', order: 0, tab: 'vehicles' });
      if (oilInfo(v).basis === 'none') out.push({ sev: 1, kind: 'gap', text: 'No oil-service baseline', when: 'not verified', order: 0, tab: 'maintenance' });
    }
    return out.sort((a, b) => b.sev - a.sev || a.order - b.order);
  }
  const getReasons = v => { if (!RC.has(v.name)) RC.set(v.name, computeReasons(v)); return RC.get(v.name); };
  function readiness(v) {
    if (v.custom_vehicle_status && v.custom_vehicle_status !== 'Active') return 'off';
    const m = Math.max(0, ...getReasons(v).map(x => x.sev));
    if (m >= 3) return 'critical'; if (m === 2) return 'watch';
    if (!(DOCS.some(([k]) => v[k]) || oil(v) != null)) return 'nodata';
    return m === 1 ? 'almost' : 'ready';
  }
  const stateOf = v => readiness(v);
  const readyPill = v => { const s = readiness(v), m = STATE[s]; return '<span class="df-pill ' + m.tone + '"><i aria-hidden="true">' + m.glyph + '</i>' + esc(s === 'off' ? (v.custom_vehicle_status || m.label) : m.label) + '</span>'; };
  const nearestDoc = v => expiryRows([v]).filter(x => x.days != null).sort((a, b) => a.days - b.days)[0] || null;

  /* ───────────── Data-quality checks (Vehicle master) ───────────── */
  const DQ = [
    ['no_driver', 'No driver recorded', 'Active vehicles without custom_driver / driver name', v => v.custom_vehicle_status === 'Active' && !driver(v)],
    ['no_image', 'No vehicle photo', 'Front Side (front_side) has no same-origin image', v => !vehicleImage(v)],
    ['no_odo', 'Odometer missing or zero', 'custom_odometer_value (Odometer Value) is empty or 0', v => !(odometer(v) > 0)],
    ['oil_none', 'No oil-service baseline', 'Needs Last Oil Change KM, Standard Oil Change and Odometer Value', v => oilInfo(v).basis === 'none'],
    ['no_istimara', 'Istimara date missing', 'registration_expiry is empty', v => !v.registration_expiry],
    ['no_insurance', 'Insurance date missing', 'end_date is empty', v => !v.end_date],
    ['no_branch', 'No branch', 'branch is empty', v => !v.branch]
  ];

  /* ───────────── Filtering + row selection ───────────── */
  function vehicles() {
    const dq = DQ.find(d => d[0] === S.f.dq);
    return (S.data.vehicles?.rows || []).filter(v => (!S.f.branch || v.branch === S.f.branch) && (!S.f.driver || driver(v) === S.f.driver) && (!S.f.service || v.vehicle_service_type === S.f.service) && (!S.f.status || v.custom_vehicle_status === S.f.status)
      && (!S.f.search || [v.license_plate, v.name, v.make, v.vehicle_model, driver(v), v.current_location].join(' ').toLowerCase().includes(S.f.search.toLowerCase()))
      && (!dq || dq[3](v)) && (!S.f.ready || readiness(v) === S.f.ready));
  }
  /* Same as vehicles() but ignoring the readiness / data-quality chips, so the strip and counts stay stable. */
  function baseVehicles() {
    return (S.data.vehicles?.rows || []).filter(v => (!S.f.branch || v.branch === S.f.branch) && (!S.f.driver || driver(v) === S.f.driver) && (!S.f.service || v.vehicle_service_type === S.f.service) && (!S.f.status || v.custom_vehicle_status === S.f.status)
      && (!S.f.search || [v.license_plate, v.name, v.make, v.vehicle_model, driver(v), v.current_location].join(' ').toLowerCase().includes(S.f.search.toLowerCase())));
  }
  function rows(k, ignoreChips) { const ids = new Set((ignoreChips ? baseVehicles() : vehicles()).map(v => v.name)), def = SOURCES[k]; return (S.data[k]?.rows || []).filter(r => ids.has(r[def.vehicle])); }
  function total(k, key) { if (!complete(k) || !complete('vehicles')) return null; const rs = rows(k); if (rs.some(r => number(r[key]) == null)) return null; return rs.reduce((n, r) => n + number(r[key]), 0); }
  function period(r, key) { return r[key] && r[key].slice(0, 10) >= S.f.from && r[key].slice(0, 10) <= S.f.to; }
  function latestAll(k, key) { const cacheKey = '_latest_' + k; if (S[cacheKey] && S[cacheKey].src === S.data[k]) return S[cacheKey].map; const m = new Map(); (S.data[k]?.rows || []).forEach(r => { const id = r[SOURCES[k].vehicle]; const prev = m.get(id); if (!prev || String(r[key] || r.modified) > String(prev[key] || prev.modified) || ((r[key] || r.modified) === (prev[key] || prev.modified) && r.name > prev.name)) m.set(id, r); }); S[cacheKey] = { src: S.data[k], map: m }; return m; }
  function indexBy(k) { const ck = '_idx_' + k; if (S[ck] && S[ck].src === S.data[k]) return S[ck].map; const m = new Map(); (S.data[k]?.rows || []).forEach(r => { const id = r[SOURCES[k].vehicle]; if (!m.has(id)) m.set(id, []); m.get(id).push(r); }); S[ck] = { src: S.data[k], map: m }; return m; }
  function latest(k, key) { const ids = new Set(vehicles().map(v => v.name)); return [...latestAll(k, key)].filter(([id]) => ids.has(id)).map(([, r]) => r); }
  /* Vehicle workspace: use the fleet-wide source when it is already complete, otherwise its own small per-vehicle fetch. */
  const detailState = k => complete(k) ? 'complete' : (S.vd[S.selected]?.[k]?.state || 'loading');
  const detailRows = k => complete(k) ? (indexBy(k).get(S.selected) || []) : (S.vd[S.selected]?.[k]?.rows || []);
  const selectedVehicle = () => vehicles().find(v => v.name === S.selected) || (S.data.vehicles?.rows || []).find(v => v.name === S.selected);

  /* ───────────── Loading: render after the Vehicle list, then stream sources by priority ───────────── */
  /* Only vehicles whose Vehicle Status is Active belong to the fleet. Sold, Change Number Plate and old records with no status (legacy imports) are left out. */
  const PRIORITY = ['issues', 'daily'];  // needed by the Overview readiness + queue
  const TAB_SOURCES = { usage: ['daily', 'idle'], maintenance: ['maintenance', 'history', 'condition'], fuel: ['fuel', 'maintenance', 'daily', 'accidents'], accidents: ['accidents', 'issues'], details: PRIORITY };
  const BACKGROUND = ['maintenance', 'fuel', 'history', 'condition', 'idle', 'accidents'];
  let pool = { running: 0, Q: [] };
  const CONCURRENCY = 4;
  const pendingNames = () => Object.keys(S.pending).map(k => SOURCES[k]?.dt || k);

  async function fetchPages(def, filters, token) {
    let offset = 0, out = [], seen = new Set();
    if (!def.parent) filters = [...filters, ['docstatus', '!=', 2]];   // never show cancelled documents
    while (offset < LIMIT) {
      if (disposed || token !== generation) throw new Error('superseded');
      const args = { doctype: def.dt, fields: ['name', 'modified', ...def.fields], filters, order_by: 'name asc', limit_start: offset, limit_page_length: PAGE };
      if (def.parent) args.parent = def.parent;
      const result = await frappe.call({ method: 'frappe.client.get_list', args, freeze: false });
      if (result.exc || !Array.isArray(result.message)) throw new Error('Source unavailable');
      const batch = result.message;
      for (const r of batch) { if (seen.has(r.name)) throw new Error('Records changed during paging; refresh'); seen.add(r.name); out.push(r); }
      if (batch.length < PAGE) return { rows: out, state: 'complete' };
      offset += batch.length;
    }
    return { rows: out, state: 'partial' };
  }
  const FUEL_RANGES = [['dates', 'Selected dates'], ['3m', 'Last 3 months'], ['6m', 'Last 6 months'], ['12m', 'Last 12 months'], ['all', 'All time']];
  const periodFilter = (def, key) => { if (key === 'fuel' && S.fuelRange !== 'dates') { if (S.fuelRange === 'all') return null; const n = { '3m': 91, '6m': 182, '12m': 365 }[S.fuelRange]; return [def.date, 'between', [frappe.datetime.add_days(today(), -n), today()]]; } const from = key === 'checks' ? frappe.datetime.add_days(today(), -(CHECK_DAYS - 1)) : S.f.from, to = key === 'checks' ? today() : S.f.to; return [def.date, 'between', def.date.endsWith('datetime') ? [from + ' 00:00:00', to + ' 23:59:59'] : [from, to]]; };
  /* Vehicle Condition documents carry the real date; their child rows only have their own save time. */
  async function parentDates(token) {
    if (S.pdates) return S.pdates;
    const m = {}; try { (await fetchPages({ dt: 'Vehicle Condition', fields: ['date'] }, [], token)).rows.forEach(r => { m[r.name] = r.date; }); } catch (e) { if (e.message === 'superseded') throw e; }
    return (S.pdates = m);
  }
  async function loadSource(key, ids, token) {
    const def = SOURCES[key]; let out = [];
    try {
      if (!ids.length) return { rows: [], state: 'complete' };
      for (let start = 0; start < ids.length; start += 150) {
        const filters = [[def.vehicle, 'in', ids.slice(start, start + 150)]];
        const pf = def.date && periodFilter(def, key); if (pf) filters.push(pf);
        // Open issues, maintenance and condition are lifetime queues; not limited by the activity period.
        const r = await fetchPages(def, filters, token); if (def.parent) { const pd = await parentDates(token); r.rows.forEach(x => { x._pdate = pd[x.parent] || ''; }); } out.push(...r.rows); if (r.state !== 'complete') return { rows: out, state: 'partial' };
        if (out.length >= LIMIT) return { rows: out, state: 'partial' };
      }
      return { rows: out, state: 'complete' };
    } catch (e) { if (e.message === 'superseded') throw e; return { rows: [], state: 'unavailable' }; }
  }
  /* Accident register: lifetime, every vehicle (an accident stays on record after a vehicle is sold). Employees and any vehicle not in the fleet list are fetched for the reports. */
  async function loadAccidents(token) {
    try {
      const r = await fetchPages(SOURCES.accidents, [], token);
      if (r.state !== 'complete') return { ...r, emp: {}, veh: {} };
      const emp = {}, veh = {}, chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
      try { for (const ids of chunk([...new Set(r.rows.map(x => x.employee).filter(Boolean))], 100)) (await fetchPages({ dt: 'Employee', fields: ['employee_name', 'image', 'department', 'employee_number'] }, [['name', 'in', ids]], token)).rows.forEach(x => { emp[x.name] = x; }); } catch (e) { if (e.message === 'superseded') throw e; }
      const have = new Set((S.data.vehicles?.rows || []).map(v => v.name));
      try { for (const ids of chunk([...new Set(r.rows.map(x => x.vehicle_name).filter(x => x && !have.has(x)))], 100)) (await fetchPages({ dt: 'Vehicle', fields: ['license_plate', 'vehicle_model', 'make', 'model', 'front_side', 'rear_side', 'left_side', 'right_side', 'custom_attach_image', 'branch'] }, [['name', 'in', ids]], token)).rows.forEach(x => { veh[x.name] = x; }); } catch (e) { if (e.message === 'superseded') throw e; }
      return { rows: r.rows, state: 'complete', emp, veh };
    } catch (e) { if (e.message === 'superseded') throw e; return { rows: [], state: 'unavailable', emp: {}, veh: {} }; }
  }
  function enqueue(keys, front) {
    keys = keys.filter(k => !S.data[k]);
    const fresh = keys.filter(k => !S.pending[k]);
    // a source the current tab needs jumps ahead of anything still queued
    if (front) keys.filter(k => S.pending[k] === 'queued').forEach(k => { const i = pool.Q.indexOf(k); if (i > -1) { pool.Q.splice(i, 1); pool.Q.unshift(k); } });
    (front ? fresh.slice().reverse() : fresh).forEach(k => { S.pending[k] = 'queued'; front ? pool.Q.unshift(k) : pool.Q.push(k); });
    pump();
  }
  function pump() {
    const token = generation, mine = pool;
    while (mine.running < CONCURRENCY && mine.Q.length) {
      const k = mine.Q.shift(); S.pending[k] = 'loading'; mine.running++;
      runSource(k, token).catch(() => {}).finally(() => { mine.running--; if (mine === pool && token === generation) pump(); });
    }
  }
  async function runSource(k, token) {
    let v;
    try { v = k === 'accidents' ? await loadAccidents(token) : await loadSource(k, S.data.vehicles.rows.map(x => x.name), token); }
    catch (e) { if (e.message === 'superseded') return; v = { rows: [], state: 'unavailable' }; }
    if (token !== generation || disposed) return;
    if (k === 'daily') { const unique = new Map(); v.rows.forEach(r => { const key = r.vehicle + '|' + r.report_date, old = unique.get(key); if (!old || String(r.modified) > String(old.modified) || (r.modified === old.modified && r.name > old.name)) unique.set(key, r); }); if (unique.size !== v.rows.length) S.notices.push('Repeated daily-report snapshots were found. Distance and idle charts use the latest modified record per vehicle and report date.'); v.rows = [...unique.values()]; }
    delete S.pending[k]; S.data[k] = v; RC.clear(); scheduleRender();
  }
  /* Re-render when a source lands, but never while the user is typing in a field or has a dropdown open. */
  function scheduleRender() {
    if (disposed || S.busy) return; clearTimeout(renderTimer);
    renderTimer = setTimeout(() => { if (disposed) return; const a = root.activeElement || document.activeElement; if (a && host.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) { scheduleRender(); return; } render(); }, 90);
  }
  /* Vehicle workspace: small per-vehicle reads for sources the fleet-wide queue has not delivered yet. */
  async function loadVehicleSource(id, key, g) {
    S.vd[id] = S.vd[id] || {}; if (S.vd[id][key]) return; S.vd[id][key] = { state: 'loading', rows: [] };
    const def = SOURCES[key], filters = [[def.vehicle, '=', id]]; const pf = def.date && periodFilter(def, key); if (pf) filters.push(pf);
    try { const r = await fetchPages(def, filters, g); if (g !== generation || disposed) return; S.vd[id][key] = r; }
    catch (e) { if (g !== generation || disposed) return; S.vd[id][key] = { rows: [], state: 'unavailable' }; }
  }

  const REPORT_OIL = 'Vehicles Oil Change Report';
  const plain = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '');
  function normalizeReport(message) {
    if (!message || message.prepared_report || !Array.isArray(message.result) || !Array.isArray(message.columns)) throw Error('Report is not ready');
    const columns = message.columns.map(c => { if (typeof c === 'string') { const a = c.split(':'); return { label: a[0], fieldname: a[0].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), fieldtype: a[1] || 'Data' }; } return { ...c, label: plain(c.label || c.fieldname) }; });
    const records = message.result.map(r => Array.isArray(r) ? Object.fromEntries(columns.map((c, i) => [c.fieldname, r[i]])) : (r || {}));
    return { columns, rows: records.slice(0, 10000), state: records.length > 10000 ? 'partial' : 'complete', rowCount: records.length };
  }
  /* The native Oil Change report refines oil-service figures. It loads in the background and never blocks the page. */
  const ASSET_FIELDS = ['asset_name', 'purchase_date', 'total_asset_cost', 'gross_purchase_amount', 'value_after_depreciation', 'opening_accumulated_depreciation', 'status', 'available_for_use_date', 'depreciation_method', 'total_number_of_depreciations', 'frequency_of_depreciation', 'next_depreciation_date', 'calculate_depreciation'];
  /* Assets are linked from the Vehicle record (custom_asset). Only the linked assets are read, through the permission-checked list API. */
  async function loadAssets(token) {
    if (S.assets && S.assets.state !== 'idle') return;
    const ids = [...new Set((S.data.vehicles?.rows || []).map(v => v.custom_asset).filter(Boolean))];
    S.assets = { state: 'loading', map: new Map(), n: ids.length };
    try {
      for (let i = 0; i < ids.length; i += 100) {
        const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Asset', fields: ['name', ...ASSET_FIELDS], filters: [['name', 'in', ids.slice(i, i + 100)]], limit_page_length: 0 }, freeze: false, silent: true });
        if (disposed || token !== generation) return;
        if (r.exc || !Array.isArray(r.message)) throw Error('Asset list failed');
        r.message.forEach(a => S.assets.map.set(a.name, a));
      }
      S.assets.state = 'complete';
    } catch (e) { if (disposed || token !== generation) return; S.assets = { state: 'unavailable', map: new Map(), n: 0 }; }
    RC.clear(); scheduleRender();
  }
  /* The Asset linked in the Vehicle's custom_asset field (null when not linked, not readable, or still loading). */
  const assetFor = v => { const A = S.assets; return A && A.state === 'complete' && v.custom_asset ? (A.map.get(v.custom_asset) || null) : null; };
  const purchasePrice = v => { const a = assetFor(v); return number(a?.total_asset_cost) || number(v.custom_price) || null; };
  const purchaseDate = v => assetFor(v)?.purchase_date || v.custom_purchase_date || v.acquisition_date;
  async function loadOil(token) {
    S.oil = { state: 'loading', rows: [] };
    try {
      const r = await frappe.call({ method: 'frappe.desk.query_report.run', args: { report_name: REPORT_OIL, filters: {}, ignore_prepared_report: 1 }, freeze: false });
      if (disposed || token !== generation) return; if (r.exc) throw Error('Report failed'); S.oil = normalizeReport(r.message);
    } catch (e) { if (disposed || token !== generation) return; S.oil = { state: 'unavailable', rows: [] }; }
    RC.clear(); scheduleRender();
  }

  /* Aldrees portal API (optional). Expected reply: { summary:{balance,credit_limit,spend,quantity,transactions}, transactions:[{date,plate,product,quantity,amount,station}], invoices:[{number,date,amount,status}] } */
  async function loadFuelLatest(token) {
    if (S.fuelLatest) return;
    try { const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Aldrees Fuel Usage', fields: ['date'], filters: [['docstatus', '!=', 2]], order_by: 'date desc', limit_page_length: 1 }, freeze: false }); if (disposed || token !== generation) return; S.fuelLatest = (r.message && r.message[0] && r.message[0].date) || 'none'; scheduleRender(); } catch (e) { /* optional hint */ }
  }
  async function loadAldrees(token) {
    if (!ALDREES_API_METHOD) { S.ald = { state: 'off' }; return; }
    if (['loading', 'complete'].includes(S.ald.state)) return;
    S.ald = { state: 'loading' };
    try {
      const r = await frappe.call({ method: ALDREES_API_METHOD, args: { from_date: S.f.from, to_date: S.f.to }, freeze: false, silent: true });
      if (disposed || token !== generation) return; if (r.exc || !r.message || typeof r.message !== 'object') throw Error('Bad reply'); S.ald = { state: 'complete', data: r.message };
    } catch (e) { if (disposed || token !== generation) return; S.ald = { state: 'error' }; }
    scheduleRender();
  }

  async function load() {
    if (!S.f.from || !S.f.to || S.f.from > S.f.to || S.f.to > today() || days(S.f.to, S.f.from) > 92) { frappe.msgprint('Choose a date range of up to 93 days, ending today or earlier.'); return; }
    const token = ++generation; pool = { running: 0, Q: [] };
    S.busy = true; S.data = {}; S.pending = {}; S.oil = { state: 'idle', rows: [] }; S.ald = { state: 'idle' }; S.fuelLatest = ''; S.gps = {}; S.profile = {}; S.parts = {}; S.assets = null; S.assetDocs = {}; S.vd = {}; S.pg = {}; S.pdates = null; S.notices = []; RC.clear(); render();
    try {
      const master = await fetchPages(SOURCES.vehicles, [['custom_vehicle_status', '=', 'Active']], token);
      if (token !== generation || disposed) return;
      master.rows = master.rows.filter(v => v.custom_vehicle_status === 'Active');   // belt and braces
      S.data.vehicles = master; S.updated = frappe.datetime.now_datetime();
      if (!complete('vehicles')) S.notices.push('Vehicle list reached the safety limit. Fleet-wide totals are unavailable. Narrow access scope or use a server aggregate.');
      S.busy = false; host.classList.add('df-intro'); setTimeout(() => host.classList.remove('df-intro'), 1400);
      render();                                   // the page is usable now; everything below streams in
      loadOil(token); loadFuelLatest(token); loadAssets(token); if (S.tab === 'fuel') loadAldrees(token);
      enqueue(TAB_SOURCES[S.tab] || []); enqueue(PRIORITY); enqueue(BACKGROUND);
      if (TAB_SOURCES[S.tab]) enqueue(TAB_SOURCES[S.tab], true);
      if (S.tab === 'details' && S.selected) openVehicle(S.selected);
    } catch (e) { if (token !== generation || disposed) return; S.busy = false; S.data.vehicles = { rows: [], state: 'unavailable' }; S.notices.push('Could not load Vehicle. Check your read permissions and refresh.'); render(); }
  }
  /* ═════════════ Arabic (RTL) ═════════════
     Switch with the language button in the header. UI text is translated from this table after each render; data from ERP
     (names, plates, remarks) is shown as stored. A "#" stands for a number or date. Add missing phrases here as "English": "العربية". */
  const AR = {
"# vehicles · loaded #": "# مركبة · آخر تحميل #",
"Loading vehicles…": "جارٍ تحميل المركبات…",
"Not loaded": "لم يتم التحميل",
"Refresh data": "تحديث البيانات",
"Overview": "نظرة عامة",
"Vehicles": "المركبات",
"Vehicle details": "تفاصيل المركبة",
"Trips & usage": "الرحلات والاستخدام",
"Maintenance": "الصيانة",
"Fuel & expenses": "الوقود والمصروفات",
"Vehicle check": "فحص المركبة",
"Accidents": "الحوادث",
"Documents": "المستندات",
"Branches": "الفروع",
"All branches": "كل الفروع",
"Drivers": "السائقون",
"All drivers": "كل السائقين",
"Service types": "أنواع الخدمة",
"All service types": "كل أنواع الخدمة",
"Activity from": "النشاط من",
"To": "إلى",
"Apply dates": "تطبيق التواريخ",
"Find vehicle": "بحث عن مركبة",
"Shared fleet": "الأسطول المشترك",
"Current user permissions · # matching vehicles · active vehicles only": "صلاحيات المستخدم الحالي · # مركبة مطابقة · المركبات النشطة فقط",
"Plate, driver or location": "اللوحة أو السائق أو الموقع",
"Fleet dashboard sections": "أقسام لوحة الأسطول",
"Fleet readiness today": "جاهزية الأسطول اليوم",
"of # vehicles ready ·": "من # مركبة جاهزة ·",
"# almost ready": "# شبه جاهزة",
"# need action": "# تحتاج إجراء",
"Open fleet →": "فتح الأسطول ←",
"Action needed": "يحتاج إجراء",
"Watch": "مراقبة",
"Almost ready": "شبه جاهزة",
"Ready": "جاهزة",
"No data": "لا بيانات",
"Off-road": "خارج الخدمة",
"Action": "إجراء",
"▲ Action": "▲ إجراء",
": expired document, overdue oil service, critical/high open issue, or a not-ready monthly check.": ": مستند منتهٍ، أو تأخر صيانة الزيت، أو بلاغ مفتوح حرج/عالٍ، أو فحص شهري غير جاهز.",
": document within # days, oil within # km, or other open issue.": ": مستند خلال # يوماً، أو زيت خلال # كم، أو بلاغ مفتوح آخر.",
": no problem found, but something cannot be verified — no vehicle check in the last # days, no Odometer Value or no oil baseline.": ": لا توجد مشكلة، لكن يتعذر التحقق من أمر ما — لا فحص للمركبة خلال آخر # يوماً، أو لا قيمة عداد، أو لا أساس لصيانة الزيت.",
"means checked and clear.": "تعني تم الفحص وكل شيء سليم.",
": Vehicle status other than Active.": ": حالة المركبة غير نشطة.",
": no document dates and no oil baseline.": ": لا تواريخ مستندات ولا أساس لصيانة الزيت.",
"Fleet": "الأسطول",
"permitted vehicles": "مركبات مصرّح بها",
"Ready today": "جاهزة اليوم",
"checked, no open flags": "تم الفحص، بلا تنبيهات مفتوحة",
"expired, overdue or not ready": "منتهية أو متأخرة أو غير جاهزة",
"Documents ≤ # days": "مستندات ≤ # يوماً",
"expired + due; documents, not vehicles": "منتهية + مستحقة؛ مستندات وليست مركبات",
"Oil service due": "صيانة الزيت المستحقة",
"overdue or within # km": "متأخرة أو خلال # كم",
"Distance · km": "المسافة · كم",
"recorded daily reports · period": "من التقارير اليومية · الفترة",
"Action queue": "قائمة الإجراءات",
"# open flags across the fleet · most urgent first": "# تنبيه مفتوح في الأسطول · الأكثر إلحاحاً أولاً",
"Previous": "السابق",
"Next": "التالي",
"Page # of #": "صفحة # من #",
"Download this table as a PDF on the company letterhead": "تنزيل الجدول PDF على ترويسة الشركة",
"Inspection · MVPI / Fahas": "الفحص · MVPI / فحص",
"Istimara / RC": "الاستمارة / RC",
"Insurance": "التأمين",
"Operation card": "بطاقة التشغيل",
"Driver card": "بطاقة السائق",
"Driving licence · expiry_date": "رخصة القيادة · expiry_date",
"Driving licence · license_expiry_date": "رخصة القيادة · license_expiry_date",
"Driving licence": "رخصة القيادة",
"Driving licence (both exact fields)": "رخصة القيادة (الحقلان)",
"Oil service overdue": "تأخر صيانة الزيت",
"Oil service due soon": "صيانة الزيت قريبة",
"Oil service": "صيانة الزيت",
"# d overdue": "متأخر # يوماً",
"# days overdue": "متأخر # يوماً",
"# days remaining": "متبقي # يوماً",
"# km over": "تجاوز # كم",
"# km left": "متبقي # كم",
"in # d": "خلال # يوماً",
"in # km": "خلال # كم",
"today": "اليوم",
"not verified": "لم يتم التحقق",
"Latest monthly check: not ready": "آخر فحص شهري: غير جاهز",
"No vehicle check in the last # days": "لا فحص للمركبة خلال آخر # يوماً",
"Odometer Value is missing or zero": "قيمة العداد مفقودة أو صفر",
"No oil-service baseline": "لا أساس لصيانة الزيت",
"Vehicle record gaps": "نواقص سجل المركبة",
"Missing fields on the Vehicle record · select a row to list the vehicles": "حقول ناقصة في سجل المركبة · اختر صفاً لعرض المركبات",
"No driver recorded": "لا سائق مسجل",
"Active vehicles without custom_driver / driver name": "مركبات نشطة بلا custom_driver / اسم السائق",
"No vehicle photo": "لا صورة للمركبة",
"Front Side (front_side) has no same-origin image": "الجهة الأمامية (front_side) لا تحتوي صورة صالحة",
"Odometer missing or zero": "العداد مفقود أو صفر",
"custom_odometer_value (Odometer Value) is empty or #": "custom_odometer_value (قيمة العداد) فارغ أو #",
"Needs Last Oil Change KM, Standard Oil Change and Odometer Value": "يحتاج آخر تغيير زيت (كم) والفاصل القياسي وقيمة العداد",
"Istimara date missing": "تاريخ الاستمارة مفقود",
"registration_expiry is empty": "registration_expiry فارغ",
"Insurance date missing": "تاريخ التأمين مفقود",
"end_date is empty": "end_date فارغ",
"No branch": "لا فرع",
"branch is empty": "الفرع فارغ",
"Record health": "سلامة السجلات",
"Unfinished, stale or unverifiable records across maintenance, checks, usage, fuel and accidents · select a row to open the tab": "سجلات غير منتهية أو قديمة أو غير قابلة للتحقق في الصيانة والفحوص والاستخدام والوقود والحوادث · اختر صفاً لفتح القسم",
"These vehicles cannot be called Ready.": "لا يمكن اعتبار هذه المركبات جاهزة.",
"#% of active vehicles": "#% من المركبات النشطة",
"Recent accidents without a Najm report": "حوادث حديثة بلا تقرير نجم",
"Accidents in the last # months with no Najm attachment.": "حوادث آخر # أشهر بلا مرفق نجم.",
"No daily report in the selected dates": "لا تقرير يومي في التواريخ المحددة",
"No report is unknown, not zero activity.": "غياب التقرير يعني غير معروف وليس نشاطاً صفرياً.",
"Claims with incomplete fields": "مطالبات بحقول ناقصة",
"Claim is not Yes, or Amount Status is not set, on an open claim.": "حقل المطالبة ليس «Yes» أو حالة المبلغ غير محددة في مطالبة مفتوحة.",
"Open work orders older than # days": "أوامر عمل مفتوحة أقدم من # يوماً",
"Scheduled or In Maintenance, never completed or cancelled.": "مجدولة أو قيد الصيانة ولم تكتمل أو تُلغَ.",
"oldest # days": "الأقدم # يوماً",
"Not in the Oil Change Report": "غير موجودة في تقرير تغيير الزيت",
"Matched on Vehicle.plate_no. These use the Vehicle-record formula, without yesterday’s distance.": "تمت المطابقة عبر Vehicle.plate_no. تستخدم معادلة سجل المركبة دون مسافة الأمس.",
"Unclassified distance": "مسافة غير مصنفة",
"Total distance not placed in the #–# or #–# window.": "مسافة إجمالية لم تُسجَّل في فترة #–# أو #–#.",
"# km · #% of total · # km beyond rounding": "# كم · #% من الإجمالي · # كم خارج التقريب",
"Clear: Finished without an amount · Issues open for more than # days · Aldrees fuel records are out of date · Open claims older than # days": "سليم: أعمال منتهية بلا مبلغ · بلاغات مفتوحة أكثر من # يوماً · سجلات وقود الدريس قديمة · مطالبات مفتوحة أقدم من # يوماً",
"Distance & activity": "المسافة والنشاط",
"Selected period · recorded report days": "الفترة المحددة · أيام التقارير المسجلة",
"Explore usage →": "استعراض الاستخدام ←",
"Unclassified": "غير مصنفة",
"Unreported dates are gaps, not zero activity.": "التواريخ غير المبلغ عنها فجوات وليست نشاطاً صفرياً.",
"Fleet mix": "تركيبة الأسطول",
"Vehicles by branch · filtered fleet": "المركبات حسب الفرع · الأسطول المفلتر",
"Branch": "الفرع",
"Service type": "نوع الخدمة",
"Make": "الصنع",
"Fuel": "الوقود",
"Model year": "سنة الصنع",
"Odometer": "العداد",
"Insurer": "شركة التأمين",
"Document horizon": "أفق المستندات",
"Next # days by week · counts documents, not vehicles": "الأيام الـ # القادمة أسبوعياً · عدد المستندات وليس المركبات",
"Document register →": "سجل المستندات ←",
"Overdue": "متأخرة",
"Inspection (MVPI / Fahas)": "الفحص (MVPI / فحص)",
"Licence & cards": "الرخص والبطاقات",
"Licence & cards groups driving licence (both exact fields), operation card and driver card. MVPI / Fahas is the recorded mvpi_date.": "الرخص والبطاقات تضم رخصة القيادة (الحقلين) وبطاقة التشغيل وبطاقة السائق. فحص MVPI هو التاريخ المسجل في mvpi_date.",
"Monthly inspection": "الفحص الشهري",
"Latest check per vehicle · last # days": "آخر فحص لكل مركبة · آخر # يوماً",
"Checks →": "الفحوص ←",
"covered": "مغطاة",
"ready": "جاهزة",
"# of # vehicles inspected · # of # ready": "# من # مركبة تم فحصها · # من # جاهزة",
"Look at these first": "ابدأ بهذه",
"Sorted by readiness, then most urgent flag": "مرتبة حسب الجاهزية ثم الأكثر إلحاحاً",
"View all # →": "عرض الكل # ←",
"Vehicle and expiry values are current snapshots. Monthly checks use the last # days; other activity uses the selected dates. Open issues, maintenance and repairs span all dates. Read-only dashboard.": "قيم المركبات والانتهاء لقطات حالية. الفحوص الشهرية تستخدم آخر # يوماً؛ بقية النشاط يستخدم التواريخ المحددة. البلاغات المفتوحة والصيانة والإصلاحات تشمل كل التواريخ. لوحة للقراءة فقط.",
"Fleet readiness split": "توزيع جاهزية الأسطول",
"Action needed · # of # vehicles": "يحتاج إجراء · # من # مركبة",
"Watch · # of # vehicles": "مراقبة · # من # مركبة",
"Almost ready · # of # vehicles": "شبه جاهزة · # من # مركبة",
"Ready · # of # vehicles": "جاهزة · # من # مركبة",
"# km #–#": "# كم #–#",
"# km unclassified": "# كم غير مصنفة",
"Already expired · # documents": "منتهية بالفعل · # مستند",
"Week of # · # documents": "أسبوع # · # مستند",
"Week of #": "أسبوع #",
"# after VAT": "# بعد الضريبة",
"Recorded distance by date: daytime, overnight and unclassified kilometres": "المسافة المسجلة حسب التاريخ: نهاراً وليلاً وكيلومترات غير مصنفة",
"Group fleet by": "تجميع الأسطول حسب",
"Documents expiring by week, next # days": "المستندات المنتهية أسبوعياً خلال # يوماً القادمة",
"06:00–18:00": "06:00–18:00",
"Fleet directory": "دليل الأسطول",
"# matching vehicles · open one for its workspace": "# مركبة مطابقة · افتح مركبة لعرض مساحة عملها",
"Sort": "ترتيب",
"Needs attention first": "الأكثر احتياجاً للانتباه أولاً",
"Plate": "اللوحة",
"Odometer (high → low)": "العداد (الأعلى ← الأقل)",
"Oil service (soonest)": "صيانة الزيت (الأقرب)",
"Not recorded": "غير مسجل",
"Filter by readiness": "تصفية حسب الجاهزية",
"View": "العرض",
"Cards": "بطاقات",
"Table": "جدول",
"Vehicle": "المركبة",
"Ignition Off · stored": "الإشعال مطفأ · مخزّن",
"Ignition On · stored": "الإشعال يعمل · مخزّن",
"Driver: ": "السائق: ",
"No driver": "لا سائق",
"idle": "خمول",
"Driver:": "السائق:",
"idle # h": "خمول # س",
"idle —": "خمول —",
"ERP record ↗": "السجل في ERP ↗",
"+ Report issue": "+ الإبلاغ عن مشكلة",
"Oil service · Vehicles Oil Change Report": "صيانة الزيت · تقرير تغيير زيت المركبات",
"What needs attention": "ما يحتاج إلى انتباه",
"Computed from the exact fields and sources below": "محسوب من الحقول والمصادر الموضحة أدناه",
"▲ Inspection · MVPI / Fahas expired": "▲ الفحص · MVPI / فحص منتهٍ",
"Monthly vehicle checklist": "قائمة الفحص الشهري للمركبة",
"Recorded #": "سُجّل #",
"Vehicle Ready": "المركبة جاهزة",
"Not Ready": "غير جاهزة",
"# / # recorded checks passed": "# / # من الفحوص المسجلة ناجحة",
"Tyres": "الإطارات",
"✓ Pass": "✓ ناجح",
"Brakes": "الفرامل",
"Lights": "الإضاءة",
"Engine oil": "زيت المحرك",
"Coolant": "سائل التبريد",
"Not checked": "لم يُفحص",
"Wipers": "مساحات الزجاج",
"First aid kit": "حقيبة الإسعافات",
"Fire extinguisher": "طفاية الحريق",
"Load safety": "سلامة الحمولة",
"✕ Fail": "✕ راسب",
"Open new vehicle check": "فتح فحص مركبة جديد",
"Vehicle location": "موقع المركبة",
"Latest available GPS record · no live tracking claim": "آخر سجل GPS متاح · ليس تتبعاً مباشراً",
"GPS record: # · stored, not live · # km/h": "سجل GPS: # · مخزّن وليس مباشراً · # كم/س",
"Open map ↗": "فتح الخريطة ↗",
"Vehicle profile": "ملف المركبة",
"From the Vehicle record": "من سجل المركبة",
"Loading full Vehicle record…": "جارٍ تحميل سجل المركبة الكامل…",
"Full record unavailable — showing fields from the fleet list": "السجل الكامل غير متاح — تُعرض الحقول من قائمة الأسطول",
"Edit in ERP ↗": "تعديل في ERP ↗",
"Purchase date (Asset)": "تاريخ الشراء (الأصل)",
"Loading purchase date from the Asset list…": "جارٍ تحميل تاريخ الشراء من قائمة الأصول…",
"Asset list unavailable — purchase date not shown.": "قائمة الأصول غير متاحة — لا يظهر تاريخ الشراء.",
"No Asset matches this vehicle by plate or by make, model and colour (# assets loaded).": "لا يوجد أصل مطابق لهذه المركبة حسب اللوحة أو الصنع والطراز واللون (# أصل تم تحميله).",
"MVPI / Fahas date not recorded, so no progress bar.": "تاريخ MVPI / الفحص غير مسجل، لذا لا يوجد شريط تقدم.",
"Model": "الطراز",
"Colour": "اللون",
"Fuel capacity": "سعة الوقود",
"Capacity (t)": "السعة (طن)",
"Wheels": "العجلات",
"Tyre details": "تفاصيل الإطارات",
"Chassis no.": "رقم الهيكل",
"Engine no.": "رقم المحرك",
"Registration no.": "رقم التسجيل",
"Owner": "المالك",
"Policy no.": "رقم الوثيقة",
"Battery fitted": "تركيب البطارية",
"Battery warranty to": "ضمان البطارية حتى",
"Last carbon check": "آخر فحص انبعاثات",
"Accidents recorded": "الحوادث المسجلة",
"Remarks": "ملاحظات",
"Tyre changes": "تغييرات الإطارات",
"Position": "الموضع",
"Last changed": "آخر تغيير",
"At odometer": "عند قراءة العداد",
"Since change": "منذ التغيير",
"Parts wear tracker": "متابعة تآكل القطع",
"Vehicle Part Maintenance": "صيانة قطع المركبة",
"+ Create record": "+ إنشاء سجل",
"No part-maintenance record exists for this vehicle.": "لا يوجد سجل صيانة قطع لهذه المركبة.",
"Document control center": "مركز متابعة المستندات",
"As of # · exact ERP fields · counts represent documents.": "حتى # · حقول ERP الدقيقة · الأعداد تمثل مستندات.",
"Due ≤# days": "مستحقة ≤# يوماً",
"Missing dates": "تواريخ مفقودة",
"Beyond # days": "بعد # يوماً",
"Show documents": "عرض المستندات",
"All documents": "كل المستندات",
"Due within # days": "مستحقة خلال # يوماً",
"Review ↗": "مراجعة ↗",
"Missing date": "تاريخ مفقود",
"Date not recorded": "التاريخ غير مسجل",
"No expiry dates are substituted. Vehicle inspection is the MVPI / Fahas date (mvpi_date); the old inspection_expiry_date field is no longer used. Both driving licence fields remain independent.": "لا يتم استبدال أي تاريخ انتهاء. فحص المركبة هو تاريخ MVPI / فحص (mvpi_date)؛ ولم يعد حقل inspection_expiry_date القديم مستخدماً. حقلا رخصة القيادة مستقلان.",
"Reported issues": "المشكلات المبلّغ عنها",
"Open / In Progress · all dates": "مفتوحة / قيد المعالجة · كل التواريخ",
"No open issues recorded.": "لا مشكلات مفتوحة.",
"Daily report records for this vehicle · selected period": "سجلات التقرير اليومي لهذه المركبة · الفترة المحددة",
"Date": "التاريخ",
"Distance km": "المسافة كم",
"Idle hours": "ساعات الخمول",
"Fuel activity": "نشاط الوقود",
"Aldrees purchases · selected period": "مشتريات الدريس · الفترة المحددة",
"Quantity": "الكمية",
"After VAT · source amount": "بعد الضريبة · المبلغ المصدري",
"Activity timeline": "الجدول الزمني للنشاط",
"Maintenance and history: all dates · issues: all dates · checks: last # days · accidents: all dates": "الصيانة والتاريخ: كل التواريخ · المشكلات: كل التواريخ · الفحوص: آخر # يوماً · الحوادث: كل التواريخ",
"Monthly check · Vehicle Ready": "فحص شهري · المركبة جاهزة",
"Maintenance history entry": "سجل في تاريخ الصيانة",
"# · # recorded": "# · # مسجل",
"Maintenance history": "تاريخ الصيانة",
"Vehicle Maintenance History · all available dates; recorded source amounts, not converted currency.": "تاريخ صيانة المركبة · كل التواريخ المتاحة؛ مبالغ المصدر دون تحويل عملة.",
"Maintenance amount": "مبلغ الصيانة",
"Fuel amount": "مبلغ الوقود",
"Next oil km": "كم تغيير الزيت القادم",
"Maintenance schedule timeline": "الجدول الزمني لجدولة الصيانة",
"Completed, canceled and open schedules; click a row for the actual record.": "جداول مكتملة وملغاة ومفتوحة؛ اضغط صفاً لفتح السجل.",
"No matching records in the available source.": "لا سجلات مطابقة في المصدر المتاح.",
"Vehicle gallery": "معرض صور المركبة",
"# images · vehicle record, accidents and issue reports · select a photo to open it in full size": "# صورة · سجل المركبة والحوادث وبلاغات المشكلات · اختر صورة لفتحها بالحجم الكامل",
"No images are stored for this vehicle.": "لا توجد صور مخزنة لهذه المركبة.",
"Switch vehicle": "تبديل المركبة",
"Previous vehicle": "المركبة السابقة",
"Next vehicle": "المركبة التالية",
"Recorded vehicle location": "موقع المركبة المسجل",
"Usage & idle intelligence": "تحليلات الاستخدام والخمول",
"Reporting windows describe recorded activity, not trip purpose.": "فترات التقرير تصف النشاط المسجل وليس غرض الرحلة.",
"Total recorded km": "إجمالي الكيلومترات المسجلة",
"06:00–18:00 km": "كم 06:00–18:00",
"18:00–06:00 km": "كم 18:00–06:00",
"Unclassified km": "كم غير مصنفة",
"Unallocated (excl. rounding)": "غير موزعة (دون التقريب)",
"Vehicles with reports": "مركبات لها تقارير",
"Total recorded km is #; the two windows add up to #. The remaining # km (#%) is shown as Unclassified.": "إجمالي الكيلومترات المسجلة #؛ وتبلغ الفترتان معاً #. المتبقي # كم (#%) يظهر كغير مصنف.",
"is rounding (days with a gap of # km or less, because the three fields are rounded separately).": "تقريب (أيام فجوتها # كم أو أقل لأن الحقول الثلاثة تُقرَّب كلٌّ على حدة).",
"is unallocated: days where the report puts that distance in neither window. It is most likely driving that crosses #:# or #:# but the report holds no trip data, so this is not confirmed.": "غير موزعة: أيام لا يضع فيها التقرير هذه المسافة في أي من الفترتين. الأرجح أنها قيادة تعبر الساعة #:# أو #:# لكن التقرير لا يحتوي بيانات رحلات، لذا لم يتأكد ذلك.",
"Largest:": "الأكبر:",
"Daily distance": "المسافة اليومية",
"Day and overnight windows are reporting windows, not a judgment about trip purpose.": "فترتا النهار والليل فترتا تقرير وليستا حكماً على غرض الرحلة.",
"Distance by vehicle": "المسافة حسب المركبة",
"Kilometres · selected period · known readings only": "كيلومترات · الفترة المحددة · القراءات المعروفة فقط",
"Idle time by vehicle": "وقت الخمول حسب المركبة",
"Hours · known readings, converted from seconds": "ساعات · قراءات معروفة محوّلة من ثوانٍ",
"Parked or silent vehicles": "مركبات متوقفة أو صامتة",
"Active vehicles · selected period": "مركبات نشطة · الفترة المحددة",
"Reported, zero distance": "مسجلة بمسافة صفر",
"None.": "لا شيء.",
"No daily report at all": "لا تقرير يومي إطلاقاً",
"Zero distance is a recorded value; no report is unknown — it is not treated as parked.": "المسافة صفر قيمة مسجلة؛ أما غياب التقرير فمجهول ولا يُعد توقفاً.",
"Idle-time intelligence": "تحليل وقت الخمول",
"Vehicle Idle Log · selected period; open events may have incomplete durations.": "سجل خمول المركبة · الفترة المحددة؛ قد تكون مدد الأحداث المفتوحة غير مكتملة.",
"Recorded idle duration": "مدة الخمول المسجلة",
"Recorded events": "الأحداث المسجلة",
"Started": "البداية",
"Ended": "النهاية",
"Minutes": "الدقائق",
"Location": "الموقع",
"Daily report directory": "دليل التقارير اليومية",
"No route or live-GPS claim is inferred from these records.": "لا يُستنتج مسار أو تتبع مباشر من هذه السجلات.",
"Total km": "إجمالي كم",
"Service planning": "تخطيط الصيانة",
"Overdue and upcoming oil changes within # km · select a row to open its ERP record.": "تغييرات زيت متأخرة وقادمة خلال # كم · اختر صفاً لفتح سجله في ERP.",
"Oil service countdown": "العد التنازلي لصيانة الزيت",
"Vehicles Oil Change Report when available; otherwise last oil change km + standard interval − Odometer Value.": "من تقرير تغيير زيت المركبات عند توفره؛ وإلا: آخر تغيير زيت (كم) + الفاصل القياسي − قيمة العداد.",
"Service": "الخدمة",
"KM remaining": "الكيلومترات المتبقية",
"Source": "المصدر",
"Vehicles Oil Change Report": "تقرير تغيير زيت المركبات",
"Vehicle: last oil change km + standard interval − Odometer Value": "المركبة: آخر تغيير زيت + الفاصل القياسي − قيمة العداد",
"Upcoming": "قادمة",
"Open maintenance": "الصيانة المفتوحة",
"Scheduled and In Maintenance. Approved orders count as finished work and are left out; use the button to review them. # Approved in the records.": "مجدولة وقيد الصيانة. الأوامر المعتمدة تُعد أعمالاً منتهية وتُستبعد؛ استخدم الزر لمراجعتها. # معتمد في السجلات.",
"Include Approved (#)": "تضمين المعتمدة (#)",
"Status": "الحالة",
"Supplier": "المورد",
"In Maintenance": "قيد الصيانة",
"Scheduled": "مجدولة",
"# d · stale": "# يوماً · قديم",
"No oil service baseline": "لا أساس لصيانة الزيت",
"Vehicles where oil service cannot be calculated · fix the missing field on the Vehicle record · select a row to open it": "مركبات يتعذر حساب صيانة الزيت لها · أصلح الحقل المفقود في سجل المركبة · اختر صفاً لفتحه",
"Odometer Value": "قيمة العداد",
"Last oil change km": "آخر تغيير زيت (كم)",
"Standard interval km": "الفاصل القياسي (كم)",
"Missing": "مفقود",
"Vehicle condition": "حالة المركبة",
"Latest recorded entry per vehicle · Vehicle Condition": "آخر إدخال لكل مركبة · حالة المركبة",
"Vehicle Condition register last updated # (# days ago).": "سجل حالة المركبة حُدّث آخر مرة # (قبل # يوماً).",
"Good": "جيدة",
"Average": "متوسطة",
"Poor": "سيئة",
"Rated poor": "مصنفة سيئة",
"Amount": "المبلغ",
"Approved": "معتمد",
"Completed": "مكتمل",
"Record": "السجل",
"Schedule date": "تاريخ الجدولة",
"Recorded amount": "المبلغ المسجل",
"API not connected": "واجهة البرمجة غير متصلة",
"Aldrees WAIE fleet account · balance, transactions and statements": "حساب أسطول الدريس (WAIE) · الرصيد والعمليات والكشوف",
"Account balance": "رصيد الحساب",
"Credit limit": "الحد الائتماني",
"Spend · selected period": "الإنفاق · الفترة المحددة",
"Fuel quantity · period": "كمية الوقود · الفترة",
"Portal transactions": "عمليات البوابة",
"Aldrees API · selected period": "واجهة الدريس · الفترة المحددة",
"Connect the Aldrees API in the backend to show transactions.": "اربط واجهة الدريس في الخلفية لعرض العمليات.",
"Invoices & statements": "الفواتير والكشوف",
"Aldrees API": "واجهة الدريس",
"Connect the Aldrees API in the backend to show invoices and statements.": "اربط واجهة الدريس في الخلفية لعرض الفواتير والكشوف.",
"From ERP records": "من سجلات ERP",
"Aldrees Fuel Usage and maintenance already in ERPNext · latest Aldrees record in ERP: #": "استهلاك وقود الدريس والصيانة الموجودة في ERPNext · آخر سجل دريس في ERP: #",
"Fuel period": "فترة الوقود",
"Selected dates": "التواريخ المحددة",
"Last # months": "آخر # أشهر",
"All time": "كل الفترات",
"Weekly fuel purchases": "مشتريات الوقود الأسبوعية",
"After-VAT amount · weeks starting Monday · source currency is not recorded.": "المبلغ بعد الضريبة · أسابيع تبدأ الاثنين · عملة المصدر غير مسجلة.",
"Period totals": "إجماليات الفترة",
"Aldrees Fuel Usage only. Vehicle Log is not added, avoiding duplicate fuel purchases.": "استهلاك وقود الدريس فقط. لا يُضاف سجل المركبة لتجنب تكرار المشتريات.",
"Recorded after VAT": "المسجل بعد الضريبة",
"Recorded quantity": "الكمية المسجلة",
"Fuel purchases by vehicle": "مشتريات الوقود حسب المركبة",
"After-VAT amount · missing amounts are excluded.": "المبلغ بعد الضريبة · المبالغ الناقصة مستبعدة.",
"Fuel by product": "الوقود حسب المنتج",
"Quantity · Aldrees product field": "الكمية · حقل المنتج في الدريس",
"Petrol #": "بنزين #",
"Diesel": "ديزل",
"Completed and approved maintenance amounts": "مبالغ الصيانة المكتملة والمعتمدة",
"Selected period by schedule date · recorded total_amount, not a general-ledger balance.": "الفترة المحددة حسب تاريخ الجدولة · total_amount المسجل وليس رصيد دفتر الأستاذ.",
"Fuel transaction directory": "دليل عمليات الوقود",
"Selected period": "الفترة المحددة",
"Product": "المنتج",
"After VAT": "بعد الضريبة",
"Fuel analysis": "تحليل الوقود",
"Limits, mileage, running cost, ownership cost and unusual purchases · uses the Aldrees API when connected, otherwise Aldrees Fuel Usage in ERP": "الحدود والمسافة وتكلفة التشغيل وتكلفة الملكية والمشتريات غير المعتادة · يستخدم واجهة الدريس عند الاتصال وإلا استهلاك وقود الدريس في ERP",
"Fuel limits": "حدود الوقود",
"Spend after VAT against the monthly limit on the vehicle or Aldrees card. Confirm the limit is in the same currency as the spend.": "الإنفاق بعد الضريبة مقابل الحد الشهري على المركبة أو بطاقة الدريس. تأكد أن الحد بنفس عملة الإنفاق.",
"Month": "الشهر",
"Over limit": "تجاوز الحد",
"At #% or more": "عند #% أو أكثر",
"Spend, no limit set": "إنفاق بلا حد محدد",
"Fleet spend · Oct #": "إنفاق الأسطول · أكتوبر #",
"Limit": "الحد",
"Spent": "المنفق",
"Used": "المستخدم",
"Within limit": "ضمن الحد",
"Mileage report": "تقرير المسافة",
"Distance from Vehicle Daily Report and fuel from the purchases above, both for the selected dates (# to #). Efficiency needs both.": "المسافة من التقرير اليومي للمركبة والوقود من المشتريات أعلاه، لنفس التواريخ المحددة (# إلى #). الكفاءة تحتاج الاثنين.",
"Fleet km per litre": "كم لكل لتر للأسطول",
"Distance with fuel data · km": "المسافة مع بيانات الوقود · كم",
"Fuel · litres": "الوقود · لتر",
"Fuel litres": "لترات الوقود",
"km per litre": "كم لكل لتر",
"Fuel cost": "تكلفة الوقود",
"Cost per km": "التكلفة لكل كم",
"Fuel plus completed and approved maintenance divided by distance driven, selected dates. Highest first — these are the vehicles to review for sale or replacement.": "الوقود مع الصيانة المكتملة والمعتمدة مقسومة على المسافة المقطوعة للتواريخ المحددة. الأعلى أولاً — هذه المركبات المرشحة لمراجعة البيع أو الاستبدال.",
"Fleet cost per km": "تكلفة الأسطول لكل كم",
"Median vehicle": "المركبة الوسيطة",
"Above #× median": "أعلى من #× الوسيط",
"Total": "الإجمالي",
"Review": "مراجعة",
"Short date ranges are noisy: a single workshop bill on a low-distance week inflates the figure. Use # to # days for decisions.": "الفترات القصيرة غير دقيقة: فاتورة ورشة واحدة في أسبوع قليل المسافة ترفع الرقم. استخدم من # إلى # يوماً لاتخاذ القرار.",
"Total cost of ownership": "التكلفة الإجمالية للملكية",
"Purchase price (Vehicle price) + all maintenance + accident repair costs, against age and odometer. Review flag: #+ years or #+ km.": "سعر الشراء + كل الصيانة + تكاليف إصلاح الحوادث، مقابل العمر والعداد. تنبيه المراجعة: #+ سنوات أو #+ كم.",
"Price": "السعر",
"Accident repairs": "إصلاحات الحوادث",
"Per year": "في السنة",
"Flag": "تنبيه",
"Fuel anomaly alerts": "تنبيهات شذوذ الوقود",
"Checks every loaded purchase. The zero-distance check only applies to days inside the selected dates that have a daily report.": "يفحص كل عملية شراء محمّلة. فحص المسافة الصفرية يطبق فقط على أيام داخل التواريخ المحددة لها تقرير يومي.",
"Bigger than tank": "أكبر من الخزان",
"Two fills in a day": "تعبئتان في يوم",
"Fuel with # km": "وقود مع # كم",
"Alert": "تنبيه",
"Detail": "التفاصيل",
"Fill-up bigger than tank": "تعبئة أكبر من الخزان",
"# L bought, tank holds # L": "# لتر مشتراة، سعة الخزان # لتر",
"Two fills in one day": "تعبئتان في يوم واحد",
"# purchases · # L · #": "# عمليات شراء · # لتر · #",
"Connection details for the administrator": "تفاصيل الاتصال للمسؤول",
"Weekly fuel purchases after VAT": "مشتريات الوقود الأسبوعية بعد الضريبة",
"Active vehicles checked in the last # days": "مركبات نشطة تم فحصها خلال آخر # يوماً",
"Not ready": "غير جاهزة",
"No check this month": "لا فحص هذا الشهر",
"Not checked this month": "لم تُفحص هذا الشهر",
"Active vehicles with no Driver Vehicle Check in the last # days": "مركبات نشطة بلا فحص سائق خلال آخر # يوماً",
"Open driver issues": "مشكلات السائقين المفتوحة",
"All dates · review and resolve through the native workflow": "كل التواريخ · راجع وعالج عبر سير العمل الأصلي",
"Issue": "المشكلة",
"Severity": "الخطورة",
"Medium": "متوسطة",
"Open": "مفتوحة",
"In Progress": "قيد المعالجة",
"High": "عالية",
"Low": "منخفضة",
"Critical": "حرجة",
"Latest vehicle check": "آخر فحص للمركبة",
"Monthly checks · latest in the last # days; not a fleet health score.": "الفحوص الشهرية · الأحدث خلال آخر # يوماً؛ وليست درجة صحة الأسطول.",
"Check": "الفحص",
"Result": "النتيجة",
"Failed items": "البنود الراسبة",
"Pending": "قيد الانتظار",
"None recorded": "لا شيء مسجل",
"Safety & accident register": "سجل السلامة والحوادث",
"Selected period · actual ERP images and source records.": "الفترة المحددة · صور وسجلات ERP الفعلية.",
"Accidents in period": "حوادث الفترة",
"Recorded repair amounts (# of # have one)": "مبالغ الإصلاح المسجلة (# من # لها مبلغ)",
"Vehicles involved": "المركبات المتورطة",
"Lifetime accident count": "عدد الحوادث الكلي",
"Vehicle master · custom_nos_of_accident_occured · highest first": "بيانات المركبة · custom_nos_of_accident_occured · الأعلى أولاً",
"No remarks recorded": "لا ملاحظات مسجلة",
"Recorded repair amount": "مبلغ الإصلاح المسجل",
"Our Mistake": "خطؤنا",
"Our mistake": "خطؤنا",
"Liability recorded": "المسؤولية المسجلة",
"Open accident record ↗": "فتح سجل الحادث ↗",
"Accident analysis": "تحليل الحوادث",
"Drivers, trends and insurance claims · all accident records": "السائقون والاتجاهات ومطالبات التأمين · كل سجلات الحوادث",
"Driver scorecard": "بطاقة أداء السائق",
"Accidents come from Vehicle Accident (all dates); issues come from the vehicles each driver is assigned. Repeat = # or more accidents in the last # months.": "الحوادث من سجل حوادث المركبات (كل التواريخ)؛ والمشكلات والفحوص الشهرية من المركبات المسندة لكل سائق. التكرار = # حوادث أو أكثر خلال آخر # أشهر.",
"Driver": "السائق",
"Last # m": "آخر # أشهر",
"Avg mistake": "متوسط الخطأ",
"Our fault": "خطؤنا",
"Open issues": "مشكلات مفتوحة",
"Checked this month": "فُحصت هذا الشهر",
"Repeat": "متكرر",
"Accident trends": "اتجاهات الحوادث",
"Last # months · # accidents": "آخر # أشهر · # حادث",
"By month": "حسب الشهر",
"Others / other": "الآخرون / أخرى",
"By location": "حسب الموقع",
"By driver · red = repeat": "حسب السائق · الأحمر = متكرر",
"By mistake %": "حسب نسبة الخطأ",
"#% mistake": "#% خطأ",
"Accidents by month": "الحوادث حسب الشهر",
"Our mistake: #": "خطؤنا: #",
"Others / other: #": "الآخرون / أخرى: #",
"Insurance claim tracker": "متابعة مطالبات التأمين",
"Open claims: Claim = Yes or Amount Status = Pending, and not yet Received or Backcharged (both count as completed). Oldest first. “Expected” is the Insurance Amount still due.": "المطالبات المفتوحة: المطالبة = Yes أو حالة المبلغ = Pending، ولم تُستلم أو تُحمَّل بعد (كلاهما يُعد مكتملاً). الأقدم أولاً. «المتوقع» هو مبلغ التأمين المستحق.",
"Open claims": "مطالبات مفتوحة",
"Expected, not received": "متوقعة غير مستلمة",
"#–# days": "#–# يوماً",
"Over # days": "أكثر من # يوماً",
"Received to date · # claims": "المستلم حتى الآن · # مطالبة",
"# open claims are marked “Check record”: the Claim field is not Yes, or the Amount Status is not set. Open the record to complete it.": "# مطالبات مفتوحة موسومة «راجع السجل»: حقل المطالبة ليس Yes أو حالة المبلغ غير محددة. افتح السجل لإكماله.",
"Accident date": "تاريخ الحادث",
"Liability": "المسؤولية",
"Taqdeer": "التقدير",
"Najm report": "تقرير نجم",
"Claim": "المطالبة",
"Expected": "المتوقع",
"Others Mistake": "خطأ الآخرين",
"Check record": "راجع السجل",
"Age": "العمر",
"Backcharge list": "قائمة التحميل على الغير",
"Accidents with Amount Status = Backcharged. These are completed, so they are not counted as open insurance claims.": "حوادث حالة المبلغ فيها = Backcharged. هذه مكتملة ولا تُحتسب كمطالبات تأمين مفتوحة.",
"Backcharged accidents": "حوادث محمّلة على الغير",
"Other liability": "مسؤولية أخرى",
"Repair cost recorded": "تكلفة الإصلاح المسجلة",
"Mistake": "الخطأ",
"Repair cost": "تكلفة الإصلاح",
"Backcharged": "محمّلة على الغير",
"Accidents without a Najm report": "حوادث بلا تقرير نجم",
"Last # months · select a row to open the accident and attach the report": "آخر # أشهر · اختر صفاً لفتح الحادث وإرفاق التقرير",
"Without Najm report": "بلا تقرير نجم",
"With a pending claim": "مع مطالبة معلقة",
"City": "المدينة",
"Case no": "رقم القضية",
"Received": "مستلمة",
"Accident reports": "تقارير الحوادث",
"Screenshot-ready · every accident on record, including vehicles that have since left the fleet": "جاهزة للقطة الشاشة · كل حادث مسجل بما فيها مركبات خرجت من الأسطول",
"Employee vehicle accident report": "تقرير حوادث مركبة الموظف",
"Pick a driver and vehicle. The card is sized for a screenshot.": "اختر السائق والمركبة. البطاقة مصممة للقطة الشاشة.",
"Driver and vehicle": "السائق والمركبة",
"Driver Profile": "ملف السائق",
"Sales": "المبيعات",
"Vehicle Received (BEFORE)": "المركبة عند الاستلام (قبل)",
"Front": "أمام",
"Rear": "خلف",
"Left": "يسار",
"Right": "يمين",
"After Accident": "بعد الحادث",
"Accident Count": "عدد الحوادث",
"Month-wise accident report": "تقرير الحوادث الشهري",
"Every accident recorded in the chosen month. The card is sized for a screenshot.": "كل حادث مسجل في الشهر المختار. البطاقة مصممة للقطة الشاشة.",
"Accident Date": "تاريخ الحادث",
"Plate Number": "رقم اللوحة",
"Department": "القسم",
"Total accidents this month:": "إجمالي حوادث هذا الشهر:",
"Accident register": "سجل الحوادث",
"All recorded accidents · select a row to open the ERP record. The reports above include accidents of vehicles no longer in the fleet.": "كل الحوادث المسجلة · اختر صفاً لفتح سجل ERP. التقارير أعلاه تشمل حوادث مركبات لم تعد في الأسطول.",
"Accident of Company Vehicles as on #": "حوادث مركبات الشركة كما في #",
"Date coverage": "تغطية التواريخ",
"Vehicles with a recorded date, per exact field": "مركبات لها تاريخ مسجل، لكل حقل",
"Istimara / RC · registration_expiry": "الاستمارة / RC · registration_expiry",
"Insurance · end_date": "التأمين · end_date",
"Inspection · MVPI / Fahas · mvpi_date": "الفحص · MVPI / فحص · mvpi_date",
"Driving licence · expiry_date · expiry_date": "رخصة القيادة · expiry_date · expiry_date",
"Driving licence · license_expiry_date · license_expiry_date": "رخصة القيادة · license_expiry_date · license_expiry_date",
"Operation card · op_card_expiry_date": "بطاقة التشغيل · op_card_expiry_date",
"Driver card · driver_card_expiry_date": "بطاقة السائق · driver_card_expiry_date",
"Out of # vehicles in view. Sold vehicles and changed number plates are excluded.": "من # مركبة معروضة. المركبات المباعة واللوحات المتغيرة مستبعدة.",
"Document register": "سجل المستندات",
"Complete matching directory; use Vehicle for source edits.": "دليل كامل مطابق؛ استخدم سجل المركبة للتعديل.",
"Document": "المستند",
"Exact field": "الحقل الدقيق",
"Image unavailable": "الصورة غير متاحة",
"Yes": "نعم",
"No": "لا",
"None": "لا شيء",
"Cancelled": "ملغاة",
"Canceled": "ملغاة",
"Closed": "مغلقة",
"Resolved": "تم الحل",
"Rejected": "مرفوضة",
"Sold": "مباعة",
"Active": "نشطة",
"Inactive": "غير نشطة",
"Close": "إغلاق",
"Cancel": "إلغاء",
"Search": "بحث",
"Notes": "ملاحظات",
"sources restricted, incomplete or unavailable": "مصادر مقيّدة أو غير مكتملة أو غير متاحة",
"Vehicle data is unavailable. Check permissions and try Refresh data.": "بيانات المركبات غير متاحة. تحقق من الصلاحيات ثم حدّث البيانات.",
"Dashboard": "لوحة التحكم",
"Clear": "مسح",
"Filtered by": "مفلتر حسب",
"Clear filters": "مسح المرشحات",
"Show all": "عرض الكل",
"Vehicles with a recorded date": "مركبات لها تاريخ مسجل",
"#–# of #":"#–# من #","No vehicle check in # days":"لا فحص للمركبة خلال # يوماً","Showing only": "عرض فقط",
"Loading…": "جارٍ التحميل…",
"Vehicles for sale": "مركبات للبيع",
"For sale": "للبيع",
"Vehicles marked For sale on the Vehicle record · select a vehicle to open its details.": "مركبات محددة للبيع في سجل المركبة · اختر مركبة لفتح تفاصيلها.",
"# vehicles · highest estimated price first": "# مركبة · الأعلى سعراً مقدراً أولاً",
"With an estimated price": "لها سعر مقدر",
"Price not entered": "السعر غير مُدخل",
"Not entered": "غير مُدخل",
"Vehicle selling": "بيع المركبات",
"Vehicle value after depreciation against the estimated selling price · select a vehicle for its purchase price and depreciation schedule.": "قيمة المركبة بعد الإهلاك مقابل سعر البيع المقدر · اختر مركبة لعرض سعر الشراء وجدول الإهلاك.",
"Vehicles for sale review": "مراجعة المركبات للبيع",
"# vehicles · highest vehicle value first": "# مركبة · الأعلى قيمة أولاً",
"Only with estimated price (#)": "فقط ذات السعر المقدر (#)",
"Vehicle value": "قيمة المركبة",
"Estimated selling price": "سعر البيع المقدر",
"Gain / loss vs value": "الربح / الخسارة مقابل القيمة",
"Gain / loss vs vehicle value": "الربح / الخسارة مقابل قيمة المركبة",
"Gain / loss vs value · # vehicles": "الربح / الخسارة مقابل القيمة · # مركبة",
"Asset": "الأصل",
"Not linked": "غير مرتبط",
"Not set": "غير محدد",
"No Asset linked": "لا أصل مرتبط",
"Total vehicle value (after depreciation)": "إجمالي قيمة المركبات (بعد الإهلاك)",
"Total estimated selling price": "إجمالي سعر البيع المقدر",
"Vehicles with an estimated price": "مركبات لها سعر مقدر",
"Vehicle value (after depreciation)": "قيمة المركبة (بعد الإهلاك)",
"Purchase price": "سعر الشراء",
"Purchase price (Asset)": "سعر الشراء (الأصل)",
"Purchase price (Vehicle price)": "سعر الشراء (سعر المركبة)",
"Purchase date": "تاريخ الشراء",
"Depreciated to date": "الإهلاك حتى الآن",
"‹ Back to list": "‹ العودة للقائمة",
"Vehicle record ↗": "سجل المركبة ↗",
"Asset record ↗": "سجل الأصل ↗",
"Asset details": "تفاصيل الأصل",
"From the linked Asset": "من الأصل المرتبط",
"Depreciation schedule": "جدول الإهلاك",
"Schedule date": "تاريخ الجدولة",
"Depreciation amount": "مبلغ الإهلاك",
"Accumulated depreciation": "الإهلاك المتراكم",
"Book value after": "القيمة الدفترية بعد",
"Journal entry": "قيد اليومية",
"Booked": "مسجل",
"Upcoming": "قادمة",
"Linked Asset": "الأصل المرتبط"
};
  const NUM_RE = /\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}(?::\d{2})?)?|\d{2}\/\d{2}\/\d{4}|-?\d[\d,]*(?:\.\d+)?/g;
  function trCore(s) {
    const caps = [], key = s.replace(/\s+/g, ' ').replace(NUM_RE, x => { caps.push(x); return '#'; });
    const hit = AR[key]; if (hit != null) { let i = 0; return hit.replace(/#/g, () => caps[i++] ?? '#'); }
    let m;
    if ((m = s.match(/^(.+) expired$/))) { const a = trCore(m[1]); if (a !== m[1]) return a + ' منتهٍ'; }
    if ((m = s.match(/^(.+) expires$/))) { const a = trCore(m[1]); if (a !== m[1]) return a + ' ينتهي قريباً'; }
    if ((m = s.match(/^(.+) issue$/))) { const a = trCore(m[1]); if (a !== m[1]) return 'مشكلة ' + a; }
    if (s.includes(' · ')) { const p = s.split(' · '), o = p.map(trCore); return o.some((x, i) => x !== p[i]) ? o.join(' · ') : s; }
    const c = s.indexOf(': '); if (c > 0) { const a = trCore(s.slice(0, c + 1)), b = trCore(s.slice(c + 2)); if (a !== s.slice(0, c + 1) || b !== s.slice(c + 2)) return a + ' ' + b; }
    return s;
  }
  function trAr(text) { const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/); if (!m[2]) return text; const out = m[2].includes('\n') && !AR[m[2].replace(/\s+/g, ' ')] ? m[2].split('\n').map(l => l.trim() ? trCore(l.trim()) : l).join('\n') : trCore(m[2]); return out === m[2] ? text : m[1] + out + m[3]; }
  const AR_ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'data-tip'];
  function applyLang() {
    const ar = S.lang === 'ar';
    host.setAttribute('dir', ar ? 'rtl' : 'ltr'); host.setAttribute('lang', ar ? 'ar' : 'en'); host.classList.toggle('df-rtl', ar);
    if (!ar) return;
    const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), nodes = []; let n;
    while ((n = w.nextNode())) { const p = n.parentElement; if (!p || /^(STYLE|SCRIPT|TEXTAREA|CODE|PRE)$/.test(p.tagName) || p.closest('.df-plate, .df-odo, .df-drum')) continue; nodes.push(n); }
    nodes.forEach(t => { const v = trAr(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; });
    host.querySelectorAll('[placeholder],[aria-label],[title],[alt],[data-tip]').forEach(e => AR_ATTRS.forEach(a => { const v = e.getAttribute(a); if (v) { const t = trAr(v); if (t !== v) e.setAttribute(a, t); } }));
  }

  /* ═════════════ Shared builders ═════════════ */
  const section = (title, sub, body, action = '', cls = '') => '<section class="df-panel ' + cls + '"><header><div><h3>' + esc(title) + '</h3>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' + action + '</header>' + body + '</section>';
  const unavailable = k => { const s = S.data[k]?.state; if (s === 'complete') return ''; if (!s) return '<div class="df-note loading"><i class="df-spin" aria-hidden="true"></i>Loading ' + esc(SOURCES[k].dt) + '…</div>'; return '<div class="df-note warn">' + esc(SOURCES[k].dt) + ': ' + (s === 'partial' ? 'partial records; totals withheld.' : 'not available with the current permissions or configuration.') + '</div>'; };
  /* Vehicle-workspace equivalent: reads the per-vehicle fetch when the fleet-wide source is not ready. */
  const dnote = k => { const s = detailState(k); return s === 'complete' ? '' : s === 'loading' ? '<div class="df-note loading"><i class="df-spin" aria-hidden="true"></i>Loading ' + esc(SOURCES[k].dt) + '…</div>' : '<div class="df-note warn">' + esc(SOURCES[k].dt) + ': ' + (s === 'partial' ? 'partial records.' : 'not available with the current permissions.') + '</div>'; };
  /* Pagination: every long list takes a page key; S.pg[key] holds the page (reset on filter, date or vehicle change). */
  const PER = 10;
  const pageOf = (key, total, per) => clamp(S.pg[key] || 1, 1, Math.max(1, Math.ceil(total / per)));
  const pager = (key, total, per) => { if (total <= per) return ''; const page = pageOf(key, total, per); return '<div class="df-pager"><span>' + ((page - 1) * per + 1) + '–' + Math.min(total, page * per) + ' of ' + total + '</span><div><button class="df-btn" data-pg="' + esc(key) + '" data-dir="-1" ' + (page <= 1 ? 'disabled' : '') + '>Previous</button><button class="df-btn" data-pg="' + esc(key) + '" data-dir="1" ' + (page * per >= total ? 'disabled' : '') + '>Next</button></div></div>'; };
  const slicePage = (key, rs, per) => rs.slice((pageOf(key, rs.length, per) - 1) * per, pageOf(key, rs.length, per) * per);
  const banner = (tone, ic, title, text) => '<div class="df-banner ' + tone + '">' + icon(ic) + '<div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div></div>';
  const strip = items => '<div class="df-strip">' + items.map(([v, l]) => '<div><strong>' + v + '</strong><span>' + esc(l) + '</span></div>').join('') + '</div>';
  const uniq = a => [...new Set(a.map(x => String(x || '').trim()).filter(Boolean))];

  /* ==== DM PDF export v1 · same as the DMS kit exportPdf, for dashboards not built on the kit (tools/erp/kit/dm-pdf-standalone.js) ====
     Tables print as a PDF on the DM Letter Head: the HTML is rendered by ERPNext (frappe.utils.print_format.report_to_pdf,
     the route Desk reports use) and the browser saves the file. Replaces the CSV exports. */
  function dmPdfExport(name, title, head, rows, o) {
    o = o || {};
    var W = window, F = W.frappe, LH = { name: '2026 DMG - NEW', img: '/files/WhatsApp Image 2026-08-20 at 3.32.18 PM.jpeg', foot: '/files/erp footer.jpeg' };
    var e = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var abs = function (h) { return String(h || '').replace(/(src|href)=(["'])\/(?!\/)/g, '$1=$2' + W.location.origin + '/'); };
    var lh = F && F.boot && F.boot.letter_heads && F.boot.letter_heads[o.letterHead || LH.name];
    var top = abs(lh && lh.header ? lh.header : '<div style="text-align:center"><img src="' + encodeURI(LH.img) + '" style="max-width:100%"></div>');
    var bottom = abs(String(lh && lh.footer ? lh.footer : '<div style="text-align:center"><img src="' + encodeURI(LH.foot) + '" style="max-width:100%"></div>').replace(/position\s*:\s*fixed;?/gi, ''));
    var rtl = !!o.rtl, al = rtl ? 'right' : 'left', today = new Date().toISOString().slice(0, 10), max = 2000, cut = rows.slice(0, max);
    var isNum = head.map(function (_, i) { var vals = cut.map(function (r) { return r[i]; }).filter(function (v) { return v !== '' && v != null; }); return vals.length > 0 && vals.every(function (v) { return typeof v === 'number' || /^-?[\d,]+(\.\d+)?$/.test(String(v)); }); });
    var cell = function (v, n) { if (v == null) { return ''; } if (n && !isNaN(String(v).replace(/,/g, ''))) { return Number(String(v).replace(/,/g, '')).toLocaleString('en-US', { maximumFractionDigits: 2 }); } return String(v).replace(/\s+/g, ' ').trim(); };
    var sub = [o.sub, cut.length + (rows.length > cut.length ? ' of ' + rows.length : '') + ' rows', 'Printed ' + today].filter(Boolean).join(' · ');
    var html = '<!DOCTYPE html><html dir="' + (rtl ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><style>body{font-family:Arial,"DejaVu Sans","Noto Naskh Arabic",sans-serif;font-size:10px;color:#1b2430;margin:0}' +
      '.t{font-size:15px;font-weight:bold;margin:12px 0 2px;color:#0f2147}.s{color:#5b6678;margin:0 0 10px;font-size:9.5px}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid}' +
      'th{background:#0f2147;color:#fff;text-align:' + al + ';padding:5px 6px;font-size:9.5px}td{padding:4px 6px;border-bottom:1px solid #dde2ea;vertical-align:top;text-align:' + al + '}tbody tr:nth-child(even) td{background:#f4f6fa}.n{text-align:right;white-space:nowrap}.f{margin-top:16px}</style></head><body>' +
      top + '<div class="t">' + e(title) + '</div><div class="s">' + e(sub) + '</div><table><thead><tr>' + head.map(function (h, i) { return '<th' + (isNum[i] ? ' class="n"' : '') + '>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cut.map(function (r) { return '<tr>' + head.map(function (_, i) { return '<td' + (isNum[i] ? ' class="n"' : '') + '>' + e(cell(r[i], isNum[i])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      (o.note ? '<div class="s" style="margin-top:8px">' + e(o.note) + '</div>' : '') + (rows.length > cut.length ? '<div class="s">Only the first ' + max + ' rows are included. Narrow the filters to print the rest.</div>' : '') + '<div class="f">' + bottom + '</div></body></html>';
    var done = function (msg, bad) { if (F && F.show_alert) { F.show_alert({ message: msg, indicator: bad ? 'red' : 'blue' }); } };
    done(rtl ? 'جارٍ تجهيز ملف PDF…' : 'Preparing PDF…');
    return fetch('/api/method/frappe.utils.print_format.report_to_pdf', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Frappe-CSRF-Token': (F && F.csrf_token) || '', 'Accept': 'application/pdf' },
      body: 'html=' + encodeURIComponent(html) + '&orientation=' + (head.length > 6 ? 'Landscape' : 'Portrait') })
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.blob(); })
      .then(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b.type === 'application/pdf' ? b : new Blob([b], { type: 'application/pdf' }));
        a.download = String(name || 'export').replace(/[^\w-]+/g, '_') + '_' + today + '.pdf'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }, function () { done(rtl ? 'تعذر تصدير PDF.' : 'PDF export failed. Try again or narrow the list.', true); });
  }
  /* ==== end DM PDF export ==== */
  /* PDF export on the DM letterhead (of what is on screen). */
  function csvBtn(key, head, data) {
    S.csv[key] = { head, data };
    return '<button class="df-btn ghost" data-csv="' + esc(key) + '" title="Download this table as a PDF on the company letterhead">' + icon('download') + 'PDF</button>';
  }
  function downloadCsv(key) {
    const c = S.csv[key]; if (!c) return;
    const title = 'Fleet · ' + key.replace(/-/g, ' ').replace(/^./, s => s.toUpperCase());
    dmPdfExport('durar-fleet-' + key, title, c.head, c.data, { rtl: document.documentElement.dir === 'rtl', sub: 'Durar Fleet Dashboard' });
  }

  function table(columns, rs, limit = 150, pg = '', per = PER) {
    if (!rs.length) return '<div class="df-empty">No matching records.</div>';
    const shown = pg ? slicePage(pg, rs, per) : rs.slice(0, limit);
    return '<div class="df-table-wrap"><table><thead><tr>' + columns.map(c => '<th scope="col">' + esc(c[0]) + '</th>').join('') + '</tr></thead><tbody>' + shown.map(r => '<tr>' + columns.map(c => '<td>' + c[1](r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + (pg ? pager(pg, rs.length, per) : (rs.length > limit ? '<p class="df-note">Showing ' + limit + ' of ' + rs.length + ' matching records. Open the source list for full details.</p>' : ''));
  }
  function erpTable(dt, cols, rs, nameOf = r => r.name, pg = '', per = PER) {
    if (!rs.length) return '<div class="df-empty">No matching records in the available source.</div>';
    const shown = pg ? slicePage(pg, rs, per) : rs.slice(0, 150);
    return '<div class="df-table-wrap"><table><thead><tr>' + cols.map(c => '<th scope="col">' + esc(c[0]) + '</th>').join('') + '</tr></thead><tbody>' + shown.map(r => '<tr tabindex="0" role="link" aria-label="' + esc('Open ' + dt + ' ' + nameOf(r)) + '" data-erp-row="' + esc(dt) + '" data-name="' + esc(nameOf(r)) + '">' + cols.map(c => '<td>' + c[1](r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + (pg ? pager(pg, rs.length, per) : (rs.length > 150 ? '<p class="df-note">Showing first 150 of ' + rs.length + ' records.</p>' : ''));
  }
  function group(rs, key, value) { const m = new Map(); rs.forEach(r => { if (value && number(r[value]) == null) return; const label = r[key] || 'Not recorded'; m.set(label, (m.get(label) || 0) + (value ? number(r[value]) : 1)); }); return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }
  function bars(items, opt = {}) {
    const max = Math.max(1, ...items.map(x => x.value || 0));
    return items.length ? '<div class="df-bars">' + items.map(x => { const a = opt.attr ? opt.attr(x) : ''; const tag = a ? 'button' : 'div'; return '<' + tag + ' class="df-bar ' + (x.tone || '') + '" ' + a + '><span class="df-bar-label" title="' + esc(x.label) + '">' + esc(x.label) + '</span><span class="df-bar-track"><i style="width:' + clamp(100 * (x.value || 0) / max, 0, 100) + '%"></i></span><b>' + fmt(x.value, opt.digits ?? 1) + '</b></' + tag + '>'; }).join('') + '</div>' : '<div class="df-empty">No recorded activity.</div>';
  }
  /* HTML column chart (real text, scales with the Workspace width). cats: [{key,label,tip,missing}] · vals: Map key → [n per series] */
  function cols({ cats, series, vals, height = 168, every = 1, unit = '', label = 'Column chart' }) {
    const sum = a => (a || []).reduce((x, y) => x + (y || 0), 0);
    const max = Math.max(1, ...cats.map(c => sum(vals.get(c.key))));
    return '<div class="df-cols" role="img" aria-label="' + esc(label) + '"><span class="df-axis-max">' + fmt(max) + esc(unit) + '</span><div class="df-cols-grid" style="--h:' + height + 'px">' + cats.map((c, i) => {
      const v = vals.get(c.key) || [];
      return '<div class="df-col' + (c.missing ? ' missing' : '') + '"' + tip(c.tip || c.label) + '><div class="df-stack">' + series.map((s, j) => v[j] > 0 ? '<i class="df-seg ' + s.cls + '" style="height:' + (100 * v[j] / max) + '%"></i>' : '').join('') + '</div><span class="df-col-label">' + (i % every === 0 ? esc(c.label) : '') + '</span></div>';
    }).join('') + '</div></div>';
  }
  const legend = items => '<div class="df-legend">' + items.map(([cls, text]) => '<span><i class="' + cls + '"></i>' + esc(text) + '</span>').join('') + '</div>';

  /* Saudi-style plate chip + odometer drum — the dashboard's two signature marks */
  const plate = v => '<span class="df-plate" title="' + esc(v.license_plate || v.name) + '"><b>' + esc(String(v.license_plate || v.name).trim()) + '</b></span>';
  const plateId = id => { const v = vehicleById(id); return v ? plate(v) : '<span class="df-plate"><b>' + esc(id) + '</b></span>'; };
  function drum(n, size = '') {
    const num = number(n); if (num == null) return '<span class="df-drum off ' + size + '">Not recorded</span>';
    const s = String(Math.max(0, Math.round(num))).padStart(6, '0'), lead = s.length - String(Math.max(0, Math.round(num))).length;
    return '<span class="df-drum ' + size + '" role="img" aria-label="' + fmt(num) + ' kilometres">' + s.split('').map((d, i) => '<i aria-hidden="true"' + (i < lead ? ' class="pad"' : '') + '>' + d + '</i>').join('') + '<em aria-hidden="true">km</em></span>';
  }
  function oilGauge(v) {
    const info = oilInfo(v);
    if (info.km == null) return '<span class="df-oil none">' + 'Not recorded' + '</span>';
    const interval = number(v.standard_oild_changing), tone = info.km <= 0 ? 'bad' : info.km <= 2000 ? 'warn' : 'good';
    return '<span class="df-oil ' + tone + '"><b>' + (info.km <= 0 ? fmt(-info.km) + ' km over' : fmt(info.km) + ' km left') + '</b>' + (interval > 0 ? '<i><em style="width:' + clamp(info.km / interval * 100, 0, 100) + '%"></em></i>' : '') + '</span>';
  }
  function vehicleIdle(v) { const rs = (indexBy('daily').get(v.name) || []); return complete('daily') && rs.length && !rs.some(r => number(r.idle_time) == null) ? fmt(rs.reduce((n, r) => n + number(r.idle_time), 0) / 3600, 1) + ' h' : '—'; }
  /* Vehicle Model + Make, then the Model Year. The year is never shown on its own as if it were the model. */
  const modelLine = v => { const name = uniq([v.vehicle_model, v.make]).join(' · '), yr = String(v.model || v.csf_tz_year || '').trim(); return (name || 'Model not recorded') + (yr ? ' · ' + yr : ''); };

  /* ═════════════ Overview ═════════════ */
  function ledger() {
    const vs = baseVehicles(), ok = complete('vehicles'), c = { critical: 0, watch: 0, ready: 0, almost: 0, off: 0, nodata: 0 };
    if (ok) vs.forEach(v => c[readiness(v)]++);
    const ex = expiryRows(vs).filter(x => x.days != null && x.days <= 30);
    const item = (label, value, sub, tone, attr, digits) => '<button class="df-led ' + tone + '" ' + attr + '><span>' + esc(label) + '</span><strong>' + fmt(value, digits || 0) + '</strong><small>' + esc(sub) + '</small></button>';
    return '<div class="df-ledger">' + item('Fleet', ok ? vs.length : null, 'permitted vehicles', 'info', 'data-tab="vehicles"')
      + item('Ready today', ok ? c.ready : null, 'checked, no open flags', 'good', 'data-tab="vehicles" data-ready="ready"')
      + item('Action needed', ok ? c.critical : null, 'expired, overdue or not ready', 'bad', 'data-tab="vehicles" data-ready="critical"')
      + item('Documents ≤ 30 days', ok ? ex.length : null, 'expired + due; documents, not vehicles', 'warn', 'data-tab="documents"')
      + item('Oil service due', ok ? vs.filter(x => oil(x) != null && oil(x) <= 2000).length : null, 'overdue or within ' + fmt(OIL_WATCH) + ' km', 'warn', 'data-tab="maintenance"')
      + item('Distance · km', total('daily', 'distance_km'), 'recorded daily reports · period', 'info', 'data-tab="usage"', 0) + '</div>';
  }
  function readinessStrip() {
    if (!complete('vehicles')) return section('Fleet readiness', '', '<div class="df-empty">Vehicle list is not complete, so readiness is withheld.</div>', '', 'df-hero-panel');
    const vs = baseVehicles(), c = { critical: 0, watch: 0, ready: 0, almost: 0, off: 0, nodata: 0 }; vs.forEach(v => c[readiness(v)]++);
    const n = vs.length, waiting = ['issues'].filter(k => !S.data[k]).map(k => SOURCES[k].dt), missing = ['issues'].filter(k => S.data[k] && !complete(k)).map(k => SOURCES[k].dt);
    const segs = STATE_ORDER.filter(k => c[k]).map(k => '<button class="df-rseg ' + k + (S.f.ready === k ? ' on' : '') + '" style="flex:' + c[k] + '" data-tab="vehicles" data-ready="' + k + '"' + tip(STATE[k].label + ' · ' + c[k] + ' of ' + n + ' vehicles') + '><b>' + c[k] + '</b></button>').join('');
    const leg = STATE_ORDER.map(k => '<button class="df-rkey ' + k + '" data-tab="vehicles" data-ready="' + k + '"><i aria-hidden="true">' + STATE[k].glyph + '</i><span>' + esc(STATE[k].label) + '</span><b>' + c[k] + '</b></button>').join('');
    return '<section class="df-panel df-hero-panel"><header><div><h3>Fleet readiness today</h3><p><b class="df-big">' + c.ready + '</b> of ' + n + ' vehicles ready' + (c.almost ? ' · <span>' + c.almost + ' almost ready</span>' : '') + (c.critical ? ' · <span class="bad-text">' + c.critical + ' need action</span>' : '') + '</p></div><button class="df-link" data-tab="vehicles">Open fleet →</button></header>'
      + (n ? '<div class="df-rstrip" role="group" aria-label="Fleet readiness split">' + segs + '</div>' : '<div class="df-empty">No vehicles match the filters.</div>') + '<div class="df-rkeys">' + leg + '</div>'
      + '<p class="df-rule"><b>Action</b>: expired document, overdue oil service or critical/high open issue. <b>Watch</b>: document within 30 days, oil within ' + fmt(OIL_WATCH) + ' km, or other open issue. <b>Almost ready</b>: no problem found, but something cannot be verified — no Odometer Value or no oil baseline. <b>Ready</b> means checked and clear. <b>Off-road</b>: Vehicle status other than Active. <b>No data</b>: no document dates and no oil baseline.'
      + (waiting.length ? ' <span class="warn-text">Still loading: ' + esc(waiting.join(', ')) + ' — readiness will update.</span>' : '') + (missing.length ? ' <span class="warn-text">Not counted (unavailable): ' + esc(missing.join(', ')) + '.</span>' : '') + '</p></section>';
  }
  function queueItems() { return baseVehicles().filter(v => readiness(v) !== 'off').flatMap(v => getReasons(v).filter(r => r.sev >= 2).map(r => ({ v, r }))).sort((a, b) => b.r.sev - a.r.sev || a.r.order - b.r.order); }
  function actionQueue() {
    if (!complete('vehicles')) return section('Action queue', '', '<div class="df-empty">Unavailable until the vehicle list is complete.</div>');
    const all = queueItems(), shown = slicePage('queue', all, 10), still = ['issues'].some(k => !S.data[k]);
    const csv = csvBtn('action-queue', ['Plate', 'Item', 'When', 'Severity'], all.map(({ v, r }) => [v.license_plate || v.name, r.text, r.when, r.sev >= 3 ? 'Action' : 'Watch']));
    const list = shown.length ? '<ul class="df-queue">' + shown.map(({ v, r }) => '<li class="' + (r.sev >= 3 ? 'bad' : 'warn') + '"><button class="df-qmain" data-vehicle="' + esc(v.name) + '">' + plate(v) + '<span class="df-qtext"><b>' + esc(r.text) + '</b><small>' + esc(modelLine(v)) + '</small></span><span class="df-qwhen">' + esc(r.when) + '</span><span class="df-qsev">' + (r.sev >= 3 ? '▲ Action' : '◆ Watch') + '</span></button>' + (r.doc ? '<button class="df-qopen" data-doc="' + esc(r.doc[0]) + '" data-name="' + esc(r.doc[1]) + '" aria-label="Open record">↗</button>' : '<button class="df-qopen" data-tab="' + r.tab + '" aria-label="Open ' + r.tab + ' tab">' + icon('arrow') + '</button>') + '</li>').join('') + '</ul>' : '<div class="df-empty good">' + icon('check') + 'Nothing needs action in the available records.</div>';
    return section('Action queue', all.length + ' open flags across the fleet · most urgent first', list + pager('queue', all.length, 10) + (still ? '<p class="df-note loading"><i class="df-spin" aria-hidden="true"></i>Issues, checks and repairs are still loading; the queue will grow.</p>' : ''), csv);
  }
  function horizon() {
    if (!complete('vehicles')) return section('Document horizon', '', '<div class="df-empty">Unavailable until the vehicle list is complete.</div>');
    const vs = baseVehicles(), docs = expiryRows(vs).filter(x => x.days != null && x.days <= 90);
    const cats = [{ key: 'od', label: 'Overdue' }], vals = new Map(); for (let w = 0; w < 13; w++) cats.push({ key: 'w' + w, label: shortDate(frappe.datetime.add_days(today(), w * 7)) });
    const gi = g => DOC_GROUPS.findIndex(x => x[0] === g);
    docs.forEach(d => { const key = d.days < 0 ? 'od' : 'w' + Math.floor(d.days / 7); if (!vals.has(key)) vals.set(key, DOC_GROUPS.map(() => 0)); vals.get(key)[gi(d.group)]++; });
    cats.forEach((c, i) => { const v = vals.get(c.key) || [], t = v.reduce((a, b) => a + b, 0); c.tip = (i === 0 ? 'Already expired' : 'Week of ' + c.label) + ' · ' + t + ' documents' + DOC_GROUPS.map((g, j) => v[j] ? '\n' + g[1] + ': ' + v[j] : '').join(''); });
    const chart = cols({ cats, series: DOC_GROUPS.map((g, i) => ({ name: g[1], cls: 'c' + i })), vals, every: 2, label: 'Documents expiring by week, next 90 days' });
    return section('Document horizon', 'Next 90 days by week · counts documents, not vehicles', chart + legend(DOC_GROUPS.map((g, i) => ['c' + i, g[1]])) + '<p class="df-note">Licence & cards groups driving licence (both exact fields), operation card and driver card. MVPI / Fahas is the recorded mvpi_date.</p>', '<button class="df-link" data-tab="documents">Document register →</button>');
  }

  const odoBand = v => { const n = odometer(v); return n == null ? 'Not recorded' : n < 50000 ? '0–50k km' : n < 100000 ? '50–100k km' : n < 150000 ? '100–150k km' : n < 200000 ? '150–200k km' : '200k+ km'; };
  const ODO_ORDER = ['0–50k km', '50–100k km', '100–150k km', '150–200k km', '200k+ km', 'Not recorded'];
  const MIX = [['branch', 'Branch', v => v.branch || 'Not set'], ['service', 'Service type', v => v.vehicle_service_type || 'Not set'], ['make', 'Make', v => String(v.make || '').trim().split(/\s+/)[0]?.toUpperCase() || 'Not set'], ['fuel', 'Fuel', v => v.fuel_type || 'Not set'], ['year', 'Model year', v => String(v.model || '').trim() || 'Not set'], ['odo', 'Odometer', odoBand], ['insurer', 'Insurer', v => String(v.insurance_company || '').trim() || 'Not set']];
  function mixPanel() {
    const def = MIX.find(m => m[0] === S.mix) || MIX[0], vs = baseVehicles();
    const m = new Map(); vs.forEach(v => { const k = def[2](v); m.set(k, (m.get(k) || 0) + 1); });
    let items = [...m].map(([label, value]) => ({ label, value }));
    if (S.mix === 'odo') items.sort((a, b) => ODO_ORDER.indexOf(a.label) - ODO_ORDER.indexOf(b.label)); else if (S.mix === 'year') items.sort((a, b) => b.label.localeCompare(a.label)); else items.sort((a, b) => b.value - a.value);
    if (items.length > 12) { const rest = items.slice(11).reduce((n, x) => n + x.value, 0); items = items.slice(0, 11).concat([{ label: 'Other', value: rest }]); }
    const tabs = '<div class="df-seg-control" role="group" aria-label="Group fleet by">' + MIX.map(x => '<button data-mix="' + x[0] + '" aria-pressed="' + (x[0] === S.mix) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
    return section('Fleet mix', 'Vehicles by ' + def[1].toLowerCase() + ' · filtered fleet', tabs + bars(items, { digits: 0 }));
  }
  function dataHealth() {
    if (!complete('vehicles')) return section('Data health', '', '<div class="df-empty">Unavailable until the vehicle list is complete.</div>');
    const vs = baseVehicles(), n = vs.length || 1;
    const rowsHtml = DQ.map(([key, label, hint, test]) => { const c = vs.filter(test).length; const body = '<span class="df-dq-label"><b>' + esc(label) + '</b><small>' + esc(hint) + '</small></span><span class="df-dq-track"><i style="width:' + (100 * c / n) + '%"></i></span><strong>' + c + '</strong>'; return c ? '<button class="df-dq warn" data-dq="' + key + '"' + (S.f.dq === key ? ' aria-pressed="true"' : '') + '>' + body + '</button>' : '<div class="df-dq ok">' + body + '</div>'; }).join('');
    return section('Vehicle record gaps', 'Missing fields on the Vehicle record · select a row to list the vehicles', '<div class="df-dqs">' + rowsHtml + '</div>');
  }
  function ring(value, tot, label, cls) {
    const known = number(value) != null && number(tot) != null && tot > 0, percent = known ? clamp(value / tot * 100, 0, 100) : 0;
    return '<div class="df-ring ' + cls + '" style="--progress:' + percent + '%" role="img" aria-label="' + esc(label + ': ' + (known ? value + ' of ' + tot : 'No available denominator')) + '"><span><b>' + (known ? fmt(percent) + '%' : '—') + '</b><small>' + esc(label) + '</small></span></div>';
  }
  function trend() {
    if (!complete('daily') || !complete('vehicles')) return unavailable('daily');
    const rs = rows('daily'), dates = new Map(); rs.forEach(r => { if (!dates.has(r.report_date)) dates.set(r.report_date, { day: 0, night: 0, known: true }); const v = dates.get(r.report_date); if (number(r.distance_6am_6pm) == null || number(r.distance_6pm_6am) == null) v.known = false; v.day += number(r.distance_6am_6pm) || 0; v.night += number(r.distance_6pm_6am) || 0; v.un = (v.un || 0) + Math.max(0, (number(r.distance_km) || 0) - (number(r.distance_6am_6pm) || 0) - (number(r.distance_6pm_6am) || 0)); });
    const list = [...dates].sort((a, b) => a[0].localeCompare(b[0])); if (!list.length) return '<div class="df-empty">No daily reports in this period.</div>';
    const vals = new Map(), cats = list.map(([date, v]) => { vals.set(date, v.known ? [v.day, v.night, v.un || 0] : [0, 0, 0]); return { key: date, label: date.slice(5), missing: !v.known, tip: date + (v.known ? '\n' + fmt(v.day, 1) + ' km 06–18\n' + fmt(v.night, 1) + ' km 18–06' + (v.un > 0.05 ? '\n' + fmt(v.un, 1) + ' km unclassified' : '') : '\ndistance missing') }; });
    return cols({ cats, series: [{ cls: 'c0' }, { cls: 'c1' }, { cls: 'cu' }], vals, every: Math.max(1, Math.ceil(list.length / 8)), unit: ' km', label: 'Recorded distance by date: daytime, overnight and unclassified kilometres' }) + legend([['c0', '06:00–18:00'], ['c1', '18:00–06:00'], ['cu', 'Unclassified']]) + '<p class="df-note">Unreported dates are gaps, not zero activity.</p>';
  }
  function gallery(vs) { return vs.length ? '<div class="df-vgrid">' + vs.map(vehicleCard).join('') + '</div>' : '<div class="df-empty">No matching vehicles.</div>'; }
  const stateRank = v => STATE_ORDER.indexOf(readiness(v));
  function overview() {
    const vs = sortVehicles(baseVehicles()).slice(0, 8);
    return readinessStrip() + ledger()
      + '<div class="df-grid wide-left">' + actionQueue() + dataHealth() + '</div>'
      + recordHealth()
      + '<div class="df-grid">' + section('Distance & activity', 'Selected period · recorded report days', trend(), '<button class="df-link" data-tab="usage">Explore usage →</button>') + mixPanel() + '</div>'
      + horizon()
      + section('Look at these first', 'Sorted by readiness, then most urgent flag', gallery(vs), '<button class="df-link" data-tab="vehicles">View all ' + baseVehicles().length + ' →</button>');
  }

  /* ═════════════ Vehicles directory ═════════════ */
  function sortVehicles(vs) {
    const plateCmp = (a, b) => String(a.license_plate || a.name).localeCompare(String(b.license_plate || b.name), undefined, { numeric: true });
    const by = { attention: (a, b) => stateRank(a) - stateRank(b) || (getReasons(a)[0]?.order ?? 1e9) - (getReasons(b)[0]?.order ?? 1e9) || plateCmp(a, b), plate: plateCmp, odometer: (a, b) => (odometer(b) ?? -1) - (odometer(a) ?? -1) || plateCmp(a, b), oil: (a, b) => (oil(a) ?? 1e12) - (oil(b) ?? 1e12) || plateCmp(a, b), branch: (a, b) => String(a.branch || '~').localeCompare(String(b.branch || '~')) || plateCmp(a, b) };
    return vs.slice().sort(by[S.sort] || by.attention);
  }
  function vehicleCard(v) {
    const image = vehicleImage(v), s = readiness(v);
    return '<button class="df-vcard ' + s + '" data-vehicle="' + esc(v.name) + '"><span class="df-vthumb">' + (image ? '<img loading="lazy" src="' + esc(image) + '" alt="">' : icon('truck')) + '</span><span class="df-vhead">' + plate(v) + '<small>' + esc(modelLine(v)) + '</small></span><span class="df-vstate">' + readyPill(v) + '</span>'
      + '<span class="df-voil"><small>Oil service</small>' + oilGauge(v) + '</span><span class="df-vodo"><small>Odometer</small>' + drum(odometer(v)) + '</span>'
      + '<span class="df-vfoot">' + esc(v.branch || 'No branch') + ' · ' + esc(driver(v) || 'No driver') + ' · idle ' + vehicleIdle(v) + '</span></button>';
  }
  function vehicleTable(vs) {
    if (!vs.length) return '<div class="df-empty">No matching vehicles.</div>';
    return '<div class="df-table-wrap"><table class="df-vtable"><thead><tr>' + ['Vehicle', 'Model', 'Branch', 'Driver', 'Odometer', 'Oil service', 'Nearest document', 'Readiness'].map(h => '<th scope="col">' + h + '</th>').join('') + '</tr></thead><tbody>' + vs.map(v => { const nd = nearestDoc(v); return '<tr tabindex="0" role="link" aria-label="Open ' + esc(v.license_plate || v.name) + '" data-vrow="' + esc(v.name) + '"><td>' + plate(v) + '</td><td>' + esc(modelLine(v)) + '</td><td>' + esc(v.branch || '—') + '</td><td>' + esc(driver(v) || '—') + '</td><td class="num">' + fmt(odometer(v)) + '</td><td>' + oilGauge(v) + '</td><td>' + (nd ? '<span class="' + (nd.days < 0 ? 'bad-text' : nd.days <= 30 ? 'warn-text' : '') + '">' + esc(nd.label) + ' · ' + (nd.days < 0 ? fmt(-nd.days) + ' d overdue' : fmt(nd.days) + ' d') + '</span>' : '—') + '</td><td>' + readyPill(v) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function vehiclesView() {
    const vs = sortVehicles(vehicles()), per = S.view === 'table' ? 50 : PER_PAGE, pages = Math.max(1, Math.ceil(vs.length / per));
    if (S.page > pages) S.page = 1;
    const c = { critical: 0, watch: 0, ready: 0, almost: 0, off: 0, nodata: 0 }; baseVehicles().forEach(v => c[readiness(v)]++);
    const chips = '<div class="df-chips" role="group" aria-label="Filter by readiness"><button data-ready="" aria-pressed="' + !S.f.ready + '">All <b>' + baseVehicles().length + '</b></button>' + STATE_ORDER.map(k => '<button class="' + k + '" data-ready="' + k + '" aria-pressed="' + (S.f.ready === k) + '"><i aria-hidden="true">' + STATE[k].glyph + '</i>' + esc(STATE[k].label) + ' <b>' + c[k] + '</b></button>').join('') + '</div>';
    const tools = '<div class="df-toolbar">' + chips + '<label class="df-inline">Sort<select data-sort>' + [['attention', 'Needs attention first'], ['plate', 'Plate'], ['odometer', 'Odometer (high → low)'], ['oil', 'Oil service (soonest)'], ['branch', 'Branch']].map(([k, l]) => '<option value="' + k + '"' + (S.sort === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label><div class="df-view-toggle" role="group" aria-label="View"><button data-view="cards" aria-pressed="' + (S.view === 'cards') + '" title="Cards">' + icon('cards') + '</button><button data-view="table" aria-pressed="' + (S.view === 'table') + '" title="Table">' + icon('list') + '</button></div></div>';
    const pageRows = vs.slice((S.page - 1) * per, S.page * per);
    const csv = csvBtn('vehicles', ['Plate', 'Model', 'Make', 'Branch', 'Driver', 'Status', 'Readiness', 'Odometer km', 'Oil km remaining'], vs.map(v => [v.license_plate || v.name, v.vehicle_model, v.make, v.branch, driver(v), v.custom_vehicle_status, STATE[readiness(v)].label, odometer(v) ?? '', oil(v) ?? '']));
    return section('Fleet directory', vs.length + ' matching vehicles · open one for its workspace', tools + (S.view === 'table' ? vehicleTable(pageRows) : gallery(pageRows)) + '<div class="df-pagination"><button class="df-btn" data-page="-1" ' + (S.page <= 1 ? 'disabled' : '') + '>Previous</button><span>Page ' + S.page + ' of ' + pages + '</span><button class="df-btn" data-page="1" ' + (S.page >= pages ? 'disabled' : '') + '>Next</button></div>', csv);
  }

  /* ═════════════ Usage ═════════════ */
  function idlePanel(v) {
    const logs = v ? detailRows('idle') : rows('idle'), known = logs.filter(r => number(r.idle_duration_minutes) != null), hours = complete('idle') && complete('vehicles') && known.length === logs.length ? known.reduce((a, r) => a + number(r.idle_duration_minutes), 0) / 60 : null;
    return section('Idle-time intelligence', 'Vehicle Idle Log · selected period; open events may have incomplete durations.', strip([[fmt(hours, 1) + ' h', 'Recorded idle duration'], [complete('idle') ? fmt(logs.length) : '—', 'Recorded events']]) + unavailable('idle') + bars(group(logs, 'vehicle', 'idle_duration_minutes').slice(0, 8).map(x => ({ ...x, value: x.value / 60 }))) + erpTable('Vehicle Idle Log', [['Vehicle', r => field(r, 'vehicle')], ['Started', r => field(r, 'idle_start')], ['Ended', r => field(r, 'idle_end')], ['Minutes', r => fmt(r.idle_duration_minutes, 1)], ['Location', r => field(r, 'start_location')]], logs, undefined, 'idle'));
  }
  function movementPanel() {
    if (!complete('daily') || !complete('vehicles')) return section('Parked or silent vehicles', '', unavailable('daily'));
    const act = vehicles().filter(v => v.custom_vehicle_status === 'Active'), still = [], silent = [];
    act.forEach(v => { const rs = indexBy('daily').get(v.name) || []; if (!rs.length) silent.push(v); else if (rs.every(r => number(r.distance_km) === 0)) still.push(v); });
    const list = a => a.length ? '<div class="df-chipcloud">' + a.slice(0, 40).map(v => '<button data-vehicle="' + esc(v.name) + '">' + plate(v) + '</button>').join('') + (a.length > 40 ? '<span class="df-note">+' + (a.length - 40) + ' more</span>' : '') + '</div>' : '<div class="df-empty good">' + icon('check') + 'None.</div>';
    return section('Parked or silent vehicles', 'Active vehicles · selected period', '<div class="df-two-col"><div><h4>Reported, zero distance <b>' + still.length + '</b></h4>' + list(still) + '</div><div><h4>No daily report at all <b>' + silent.length + '</b></h4>' + list(silent) + '</div></div><p class="df-note">Zero distance is a recorded value; no report is unknown — it is not treated as parked.</p>');
  }
  /* Total distance minus the two reporting windows: movement the daily report does not place in either window. */
  const unclassified = () => { if (!complete('daily') || !complete('vehicles')) return null; return rows('daily').reduce((n, r) => (number(r.distance_km) == null || number(r.distance_6am_6pm) == null || number(r.distance_6pm_6am) == null) ? n : n + Math.max(0, number(r.distance_km) - number(r.distance_6am_6pm) - number(r.distance_6pm_6am)), 0); };
  const unclassifiedKm = () => { const u = unclassified(); return u == null ? '—' : fmt(u, 1); };
  const GAP_ROUND = 3;
  const unclassifiedSplit = () => { if (!complete('daily') || !complete('vehicles')) return null; const o = { round: 0, between: 0, top: new Map() }; rows('daily').forEach(r => { const t = number(r.distance_km), d = number(r.distance_6am_6pm), n = number(r.distance_6pm_6am); if (t == null || d == null || n == null) return; const g = t - d - n; if (g <= 0) return; if (g <= GAP_ROUND) o.round += g; else { o.between += g; o.top.set(r.vehicle, (o.top.get(r.vehicle) || 0) + g); } }); o.top = [...o.top].sort((x, y) => y[1] - x[1]).slice(0, 3); return o; };
  const unclassifiedNote = () => { const u = unclassified(), t = total('daily', 'distance_km'), sp = unclassifiedSplit(); if (!(u != null && u > 0.5 && t)) return ''; return '<p class="df-note">Total recorded km is ' + fmt(t, 1) + '; the two windows add up to ' + fmt(t - u, 1) + '. The remaining ' + fmt(u, 1) + ' km (' + fmt(100 * u / t, 1) + '%) is shown as Unclassified. <b>' + fmt(sp.round, 1) + ' km</b> is rounding (days with a gap of ' + GAP_ROUND + ' km or less, because the three fields are rounded separately). <b>' + fmt(sp.between, 1) + ' km</b> is unallocated: days where the report puts that distance in neither window. It is most likely driving that crosses 06:00 or 18:00, but the report holds no trip data, so this is not confirmed.' + (sp.top.length ? ' Largest: ' + sp.top.map(x => esc(x[0]) + ' ' + fmt(x[1], 0) + ' km').join(', ') + '.' : '') + '</p>'; };
  function usage() {
    const rs = rows('daily'), reported = new Set(rs.map(r => r.vehicle)).size;
    return banner('blue', 'chart', 'Usage & idle intelligence', 'Reporting windows describe recorded activity, not trip purpose.')
      + strip([[fmt(total('daily', 'distance_km'), 1), 'Total recorded km'], [fmt(total('daily', 'distance_6am_6pm'), 1), '06:00–18:00 km'], [fmt(total('daily', 'distance_6pm_6am'), 1), '18:00–06:00 km'], [unclassifiedKm(), 'Unclassified km'], [(() => { const sp = unclassifiedSplit(); return sp ? fmt(sp.between, 1) : '—'; })(), 'Unallocated (excl. rounding)'], [complete('daily') ? reported : '—', 'Vehicles with reports']]) + unclassifiedNote()
      + section('Daily distance', 'Day and overnight windows are reporting windows, not a judgment about trip purpose.', trend())
      + '<div class="df-grid">' + section('Distance by vehicle', 'Kilometres · selected period · known readings only', unavailable('daily') + bars(group(rs, 'vehicle', 'distance_km').slice(0, 10), { attr: x => 'data-vehicle="' + esc(x.label) + '"' })) + section('Idle time by vehicle', 'Hours · known readings, converted from seconds', unavailable('daily') + bars(group(rs, 'vehicle', 'idle_time').slice(0, 10).map(x => ({ ...x, value: x.value / 3600 })), { attr: x => 'data-vehicle="' + esc(x.label) + '"' })) + '</div>'
      + movementPanel() + idlePanel()
      + section('Daily report directory', 'No route or live-GPS claim is inferred from these records.', unavailable('daily') + table([['Date', r => docLink('Vehicle Daily Report', r.name, r.report_date)], ['Vehicle', r => vehicleLink(r.vehicle)], ['Total km', r => fmt(r.distance_km, 1)], ['06–18 km', r => fmt(r.distance_6am_6pm, 1)], ['18–06 km', r => fmt(r.distance_6pm_6am, 1)], ['Unclassified km', r => (number(r.distance_km) == null || number(r.distance_6am_6pm) == null || number(r.distance_6pm_6am) == null) ? '—' : fmt(Math.max(0, number(r.distance_km) - number(r.distance_6am_6pm) - number(r.distance_6pm_6am)), 1)], ['Idle hours', r => number(r.idle_time) == null ? '—' : fmt(r.idle_time / 3600, 1)]], rs.slice().sort((a, b) => b.report_date.localeCompare(a.report_date)), 150, 'usage-daily'));
  }

  /* ═════════════ Maintenance ═════════════ */
  function maintenanceHistory(v) {
    const hist = (v ? detailRows('history') : rows('history')).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))), schedules = (v ? detailRows('maintenance') : rows('maintenance')).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return section('Maintenance history', 'Vehicle Maintenance History · all available dates; recorded source amounts, not converted currency.', (v ? dnote : unavailable)('history') + erpTable('Vehicle Maintenance History', [['Vehicle', r => field(r, 'plate_no')], ['Date', r => field(r, 'date')], ['Maintenance amount', r => fmt(r.total_value, 2)], ['Fuel amount', r => fmt(r.total_petrol, 2)], ['Distance km', r => fmt(r.total_distance_run, 1)], ['Next oil km', r => fmt(r.next_oilchange)]], hist, undefined, (v ? 'd-' : '') + 'hist'))
      + section('Maintenance schedule timeline', 'Completed, canceled and open schedules; click a row for the actual record.', (v ? dnote : unavailable)('maintenance') + erpTable('Vehicle Maintenance Schedule', [['Vehicle', r => field(r, 'vehicle')], ['Date', r => field(r, 'date')], ['Status', r => pill(r.status, r.status === 'Completed' ? 'good' : 'muted')], ['Amount', r => fmt(r.total_amount, 2)]], schedules, undefined, (v ? 'd-' : '') + 'sched'));
  }
  const regNote = () => { const d = regDate(); return d ? '<div class="df-note' + (regStale() ? ' warn' : '') + '">Vehicle Condition register last updated ' + esc(d) + ' (' + fmt(-days(d)) + ' days ago).' + (regStale() ? ' It is more than 45 days old, so it is not used for readiness flags.' : '') + '</div>' : '<div class="df-note warn">No dated Vehicle Condition register was found.</div>'; };
  function conditionPanel() {
    if (!complete('condition')) return section('Vehicle condition', 'Vehicle Condition → condition table', unavailable('condition'));
    const ids = new Set(vehicles().map(v => v.name)), last = [...latestAll('condition', '_pdate')].filter(([id]) => ids.has(id)).map(([, r]) => r);
    const items = ['Good', 'Average', 'Poor'].map(k => ({ label: k, value: last.filter(r => r.condition === k).length, tone: k === 'Poor' ? 'bad' : k === 'Average' ? 'warn' : 'good' })); const unset = last.filter(r => !['Good', 'Average', 'Poor'].includes(r.condition)).length; if (unset) items.push({ label: 'Not set', value: unset });
    const poor = last.filter(r => r.condition === 'Poor');
    return section('Vehicle condition', 'Latest recorded entry per vehicle · Vehicle Condition', regNote() + bars(items, { digits: 0 }) + (poor.length ? '<h4 class="df-sub">Rated poor</h4>' + erpTable('Vehicle Condition', [['Vehicle', r => esc(plateOf(r.vehicle_no))], ['Remarks', r => field(r, 'remarks')], ['Location', r => field(r, 'location')]], poor, r => r.parent, 'poor', 6) : ''));
  }
  const OPEN_MAINT = ['Scheduled', 'In Maintenance'];
  /* Active vehicles whose oil service cannot be calculated: the table says which field is missing so it can be fixed on the Vehicle record. */
  function oilBaselinePanel() {
    if (!complete('vehicles')) return '';
    const list = vehicles().filter(v => oilInfo(v).basis === 'none').map(v => ({ v, missing: [number(v.last_oil_change_km) == null ? 'Last Oil Change KM' : '', !(number(v.standard_oild_changing) > 0) ? 'Standard Oil Change' : '', !(odometer(v) > 0) ? 'Odometer Value' : ''].filter(Boolean) }));
    return section('No oil service baseline', 'Vehicles where oil service cannot be calculated · fix the missing field on the Vehicle record · select a row to open it', list.length ? erpTable('Vehicle', [['Vehicle', r => plate(r.v)], ['Model', r => esc(modelName(r.v))], ['Odometer Value', r => fmt(odometer(r.v))], ['Last oil change km', r => fmt(r.v.last_oil_change_km)], ['Standard interval km', r => fmt(r.v.standard_oild_changing)], ['Missing', r => r.missing.map(m => pill(m, 'warn')).join(' ')]], list, r => r.v.name, 'oilbase', 10) : '<div class="df-empty good">' + icon('check') + 'Every vehicle has an oil service baseline.</div>', list.length ? csvBtn('oil-baseline', ['Plate', 'Odometer Value', 'Last oil change km', 'Standard interval km', 'Missing'], list.map(r => [r.v.license_plate || r.v.name, odometer(r.v) ?? '', r.v.last_oil_change_km ?? '', r.v.standard_oild_changing ?? '', r.missing.join(' / ')])) : '');
  }
  function maintenance() {
    const due = vehicles().filter(v => oil(v) != null && oil(v) <= OIL_WATCH).sort((a, b) => oil(a) - oil(b)), all = rows('maintenance'), approved = all.filter(r => r.status === 'Approved');
    const open = all.filter(r => OPEN_MAINT.includes(r.status) || (S.maintApproved && r.status === 'Approved')).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const age = r => { const d = days(String(r.date).slice(0, 10)); return d == null ? null : -d; };
    const toggle = '<button class="df-btn ghost" data-action="toggle-approved">' + (S.maintApproved ? 'Hide' : 'Include') + ' Approved (' + approved.length + ')</button>';
    return banner('amber', 'tool', 'Service planning', 'Overdue and upcoming oil changes within 2,000 km · select a row to open its ERP record.')
      + '<div class="df-grid">' + section('Oil service countdown', 'Vehicles Oil Change Report when available; otherwise last oil change km + standard interval − Odometer Value.', erpTable('Vehicle', [['Vehicle', v => plate(v)], ['Model', v => esc(modelName(v))], ['Service', v => pill(oil(v) <= 0 ? 'Overdue' : 'Upcoming', oil(v) <= 0 ? 'bad' : 'warn')], ['KM remaining', v => fmt(oil(v))], ['Source', v => esc(oilBasis(v))]], due, v => v.name, 'oil', 10), csvBtn('oil-service', ['Plate', 'Km remaining', 'Source'], due.map(v => [v.license_plate || v.name, oil(v), oilBasis(v)])))
      + section('Open maintenance', 'Scheduled and In Maintenance. Approved orders count as finished work and are left out; use the button to review them.' + (approved.length ? ' ' + fmt(approved.length) + ' Approved in the records.' : ''), unavailable('maintenance') + erpTable('Vehicle Maintenance Schedule', [['Vehicle', r => esc(plateOf(r.vehicle))], ['Date', r => esc(String(r.date || '').slice(0, 10))], ['Status', r => pill(r.status, r.status === 'Approved' ? 'info' : 'warn')], ['Age', r => age(r) == null ? '—' : (age(r) > 60 ? '<span class="warn-text">' + fmt(age(r)) + ' d · stale</span>' : fmt(age(r)) + ' d')], ['Supplier', r => field(r, 'supplier')]], open, undefined, 'open', 10), toggle) + '</div>'
      + oilBaselinePanel()
      + '<div class="df-grid">' + conditionPanel() + '</div>' + maintenanceHistory();
  }
  /* ═════════════ Fuel ═════════════ */
  /* ═════════════ Fuel & expenses — Aldrees portal theme ═════════════ */
  const aldState = () => !ALDREES_API_METHOD ? 'off' : (S.ald || {}).state || 'idle';
  const aldData = () => aldState() === 'complete' ? S.ald.data : null;
  /* Shown in every Aldrees-sourced section until the backend API is connected. */
  function apiOff(what) {
    const s = aldState();
    if (s === 'loading' || s === 'idle') return '<div class="df-apioff loading"><i class="df-spin" aria-hidden="true"></i><b>Connecting to Aldrees…</b></div>';
    return '<div class="df-apioff">' + icon('plug') + '<b>' + (s === 'error' ? 'API error' : 'API not connected') + '</b><small>' + esc(s === 'error' ? 'The Aldrees API did not return usable data for ' + what + '.' : 'Connect the Aldrees API in the backend to show ' + what + '.') + '</small>' + (s === 'error' ? '<button class="df-btn" data-action="ald-retry">Retry</button>' : '') + '</div>';
  }
  function fuel() {
    const rs = rows('fuel'), completed = rows('maintenance').filter(r => ['Completed', 'Approved'].includes(r.status) && period(r, 'date')), A = aldData(), sm = A?.summary || {}, st = aldState();
    const weekly = new Map(); rs.forEach(r => { const w = weekStart(r.date); if (w && number(r.after_vat) != null) weekly.set(w, (weekly.get(w) || 0) + number(r.after_vat)); });
    const wk = [...weekly.keys()].sort(), vals = new Map(wk.map(k => [k, [weekly.get(k)]]));
    const spend = wk.length ? cols({ cats: wk.map(k => ({ key: k, label: shortDate(k), tip: 'Week of ' + k + '\n' + fmt(weekly.get(k), 2) + ' after VAT' })), series: [{ cls: 'c0' }], vals, every: Math.max(1, Math.ceil(wk.length / 8)), label: 'Weekly fuel purchases after VAT' }) : '<div class="df-empty">No fuel purchases with amounts in this period' + (S.fuelLatest && S.fuelLatest !== 'none' && S.fuelRange === 'dates' ? '. The latest Aldrees record in ERP is dated ' + esc(S.fuelLatest) + ' — widen the fuel period above.' : '.') + '</div>';
    const tile = (label, v, digits, unit) => '<div class="df-ald-tile"><span>' + esc(label) + '</span>' + (A && number(v) != null ? '<strong>' + fmt(v, digits) + (unit ? '<small>' + unit + '</small>' : '') + '</strong>' : '<strong class="off">' + (st === 'loading' || st === 'idle' ? 'Loading…' : st === 'error' ? 'API error' : 'API not connected') + '</strong>') + '</div>';
    const badge = st === 'complete' ? '<span class="df-ald-state on">API connected</span>' : st === 'loading' || st === 'idle' ? '<span class="df-ald-state">Connecting…</span>' : '<span class="df-ald-state off">' + (st === 'error' ? 'API error' : 'API not connected') + '</span>';
    const head = '<div class="df-ald-top"><img class="df-ald-logo" src="' + ALDREES_LOGO_WHITE + '" alt="Aldrees">' + badge + '</div><div class="df-ald-title"><h3>Fuel &amp; expenses</h3><p>Aldrees WAIE fleet account · balance, transactions and statements</p></div>';
    const tx = (A?.transactions || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))), inv = (A?.invoices || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const conn = '<details class="df-ald-conn"><summary>Connection details for the administrator</summary><p>Set <code>ALDREES_API_METHOD</code> at the top of <code>dashboard.js</code> to a whitelisted server method that signs in to the Aldrees WAIE account and returns the shape below. The dashboard calls it with <code>from_date</code> and <code>to_date</code> (YYYY-MM-DD). A server template is in <code>aldrees_waie_connector.py</code>.</p><pre>{ "summary": { "balance": 0, "credit_limit": 0, "spend": 0, "quantity": 0 },\n  "transactions": [ { "date": "", "plate": "", "product": "", "quantity": 0, "amount": 0, "station": "" } ],\n  "invoices": [ { "number": "", "date": "", "amount": 0, "status": "" } ] }</pre></details>';
    return '<div class="df-ald">' + head
      + '<div class="df-ald-tiles">' + tile('Account balance', sm.balance, 2) + tile('Credit limit', sm.credit_limit, 2) + tile('Spend · selected period', sm.spend, 2) + tile('Fuel quantity · period', sm.quantity, 1, 'L') + '</div>'
      + '<div class="df-grid">'
      + section('Portal transactions', 'Aldrees API · selected period', A ? table([['Date', r => esc(r.date || '—')], ['Vehicle', r => esc(r.plate || '—')], ['Product', r => esc(r.product || '—')], ['Quantity', r => fmt(r.quantity, 1)], ['Amount', r => fmt(r.amount, 2)], ['Station', r => esc(r.station || '—')]], tx, 0, 'ald-tx', 8) : apiOff('transactions'))
      + section('Invoices & statements', 'Aldrees API', A ? table([['Number', r => esc(r.number || '—')], ['Date', r => esc(r.date || '—')], ['Amount', r => fmt(r.amount, 2)], ['Status', r => pill(r.status || 'Unknown', /paid/i.test(r.status || '') ? 'good' : 'muted')]], inv, 0, 'ald-inv', 8) : apiOff('invoices and statements')) + '</div>'
      + '<div class="df-ald-sephead"><h3 class="df-ald-sep">From ERP records<small>Aldrees Fuel Usage and maintenance already in ERPNext' + (S.fuelLatest ? ' · latest Aldrees record in ERP: ' + esc(S.fuelLatest === 'none' ? 'none' : S.fuelLatest) : '') + '</small></h3><label class="df-inline">Fuel period<select data-fuel-range>' + FUEL_RANGES.map(([k, l]) => '<option value="' + k + '"' + (S.fuelRange === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label></div>'
      + '<div class="df-grid">' + section('Weekly fuel purchases', 'After-VAT amount · weeks starting Monday · source currency is not recorded.', unavailable('fuel') + spend)
      + section('Period totals', 'Aldrees Fuel Usage only. Vehicle Log is not added, avoiding duplicate fuel purchases.', strip([[fmt(total('fuel', 'after_vat'), 2), 'Recorded after VAT'], [fmt(total('fuel', 'quantity'), 1), 'Recorded quantity']]) + unavailable('fuel')) + '</div>'
      + '<div class="df-grid">' + section('Fuel purchases by vehicle', 'After-VAT amount · missing amounts are excluded.', bars(group(rs.filter(r => number(r.after_vat) != null), 'plate_no', 'after_vat').slice(0, 12), { digits: 2, attr: x => 'data-vehicle="' + esc(x.label) + '"' })) + section('Fuel by product', 'Quantity · Aldrees product field', bars(group(rs.filter(r => number(r.quantity) != null), 'product', 'quantity').slice(0, 8), { digits: 1 })) + '</div>'
      + section('Completed and approved maintenance amounts', 'Selected period by schedule date · recorded total_amount, not a general-ledger balance.', unavailable('maintenance') + table([['Record', r => docLink('Vehicle Maintenance Schedule', r.name)], ['Vehicle', r => vehicleLink(r.vehicle)], ['Schedule date', r => field(r, 'date')], ['Recorded amount', r => fmt(r.total_amount, 2)]], completed, 0, 'fuelmaint'))
      + section('Fuel transaction directory', 'Selected period', table([['Date', r => docLink('Aldrees Fuel Usage', r.name, r.date)], ['Vehicle', r => vehicleLink(r.plate_no)], ['Product', r => field(r, 'product')], ['Quantity', r => fmt(r.quantity, 1)], ['After VAT', r => fmt(r.after_vat, 2)]], rs, 0, 'fueldir'), csvBtn('fuel', ['Date', 'Vehicle', 'Product', 'Quantity', 'After VAT'], rs.map(r => [r.date, r.plate_no, r.product, r.quantity, r.after_vat])))
      + '<div class="df-ald-sephead"><h3 class="df-ald-sep">Fuel analysis<small>Limits, mileage, running cost, ownership cost and unusual purchases · uses the Aldrees API when connected, otherwise Aldrees Fuel Usage in ERP</small></h3></div>'
      + fuelLimits() + mileageReport() + costPerKm() + ownershipCost() + fuelAnomalies()
      + conn + '</div>';
  }
  /* ═════════════ Accidents ═════════════ */
  /* ═════════════ Accident reports (two screenshot-ready cards) ═════════════ */
  const fmtDMY = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : '—'; };
  const accVeh = id => vehicleById(id) || S.data.accidents?.veh?.[id] || {};
  const accEmp = id => S.data.accidents?.emp?.[id] || {};
  const accPlate = id => accVeh(id).license_plate || id || '—';
  const accModel = id => { const v = accVeh(id); return v.vehicle_model || v.make ? modelLine(v) : '—'; };
  const accDriver = r => accEmp(r.employee).employee_name || r.employee || '—';
  const accDept = r => String(r.department || accEmp(r.employee).department || '').replace(/\s+-\s+[A-Z]{1,6}$/, '') || '—';
  const accMistake = r => { const n = number(r.mistake_); return n == null ? (r.mistake_ ? String(r.mistake_) : '—') : fmt(n) + '%'; };
  const accStatus = r => ({ Ours: 'Our Mistake', Others: 'Others Mistake', 'Any Other': 'Other' })[r.liability] || r.liability || '—';
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const logoImg = '<img class="rp-logo" src="' + DURAR_LOGO + '" alt="Durar Masagh">';
  const photo = (url, label) => url ? '<figure><img loading="lazy" src="' + esc(url) + '" alt="' + esc(label) + '"><figcaption>' + esc(label) + '</figcaption></figure>' : '<figure class="none"><span>' + icon('truck') + '</span><figcaption>' + esc(label) + '</figcaption></figure>';
  function employeeReport(all) {
    const pairs = new Map(); all.forEach(r => { const k = (r.employee || '') + '|' + (r.vehicle_name || ''); if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(r); });
    const list = [...pairs].sort((a, b) => b[1].length - a[1].length || accDriver(a[1][0]).localeCompare(accDriver(b[1][0])));
    const key = pairs.has(S.accPair) ? S.accPair : list[0][0], recs = pairs.get(key).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))), r0 = recs[0], emp = accEmp(r0.employee), veh = accVeh(r0.vehicle_name), name = accDriver(r0), img = safeImage(emp.image);
    const select = '<label class="df-inline">Driver and vehicle<select data-acc-pair>' + list.map(([k, rs]) => '<option value="' + esc(k) + '"' + (k === key ? ' selected' : '') + '>' + esc(accDriver(rs[0]) + ' · ' + accPlate(rs[0].vehicle_name) + ' (' + rs.length + ')') + '</option>').join('') + '</select></label>';
    const before = [['front_side', 'Front'], ['rear_side', 'Rear'], ['left_side', 'Left'], ['right_side', 'Right']].map(([k, l]) => photo(safeImage(veh[k]), l)).join('');
    const after = recs.map(r => { const imgs = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'].map(k => safeImage(r[k])).filter(Boolean); return '<div class="rp-acc"><b>' + esc(fmtDMY(r.date)) + '</b><div class="rp-thumbs">' + (imgs.length ? imgs.map((u, i) => '<figure><img loading="lazy" src="' + esc(u) + '" alt="Accident ' + esc(fmtDMY(r.date)) + ' photo ' + (i + 1) + '"></figure>').join('') : '<span class="rp-none">No photographs uploaded</span>') + '</div></div>'; }).join('');
    const card = '<article class="df-rep emp" aria-label="Employee vehicle accident report"><div class="rp-cols">'
      + '<div class="rp-col rp-profile"><h4>Driver Profile</h4><div class="rp-avatar">' + (img ? '<img src="' + esc(img) + '" alt="' + esc(name) + '">' : '<span>' + esc(initials(name)) + '</span>') + '</div><b class="rp-name">' + esc(name) + '</b><span class="rp-sub">' + esc(emp.employee_number || r0.employee || '') + '</span><span class="rp-sub">' + esc(accDept(r0)) + '</span><span class="df-plate"><b>' + esc(accPlate(r0.vehicle_name)) + '</b></span><span class="rp-sub">' + esc(accModel(r0.vehicle_name)) + '</span></div>'
      + '<div class="rp-col rp-before"><h4>Vehicle Received (BEFORE)</h4><div class="rp-4">' + before + '</div></div>'
      + '<div class="rp-col rp-after"><h4>After Accident</h4>' + after + '</div>'
      + '<div class="rp-col rp-count"><h4>Accident Count</h4><strong>' + recs.length + '</strong><span class="rp-sub">' + (recs.length === 1 ? 'accident' : 'accidents') + ' · ' + esc(accPlate(r0.vehicle_name)) + '</span>' + logoImg + '</div></div></article>';
    return section('Employee vehicle accident report', 'Pick a driver and vehicle. The card is sized for a screenshot.', '<div class="df-repwrap">' + card + '</div>', select);
  }
  function monthReport(all) {
    const months = [...new Set(all.map(r => String(r.date || '').slice(0, 7)).filter(m => /^\d{4}-\d{2}$/.test(m)))].sort().reverse();
    if (!months.length) return section('Month-wise accident report', '', '<div class="df-empty">No dated accident records.</div>');
    const month = months.includes(S.accMonth) ? S.accMonth : months[0], [y, m] = month.split('-').map(Number);
    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }).toUpperCase() + ' ' + y;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(), asOn = month === today().slice(0, 7) ? today() : month + '-' + String(lastDay).padStart(2, '0');
    const recs = all.filter(r => String(r.date || '').startsWith(month)).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.name).localeCompare(String(b.name))), per = 12, page = pageOf('accmonth', recs.length, per), shown = recs.slice((page - 1) * per, page * per);
    const select = '<label class="df-inline">Month<select data-acc-month>' + months.map(k => { const [yy, mm] = k.split('-').map(Number); return '<option value="' + k + '"' + (k === month ? ' selected' : '') + '>' + new Date(Date.UTC(yy, mm - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) + '</option>'; }).join('') + '</select></label>';
    const card = '<article class="df-rep month" aria-label="Month-wise accident report"><div class="rm-head"><div><span>ACCIDENT REPORT</span><b>' + esc(label) + '</b></div>' + logoImg + '</div><h4>Accident of Company Vehicles as on ' + fmtDMY(asOn) + '</h4>'
      + '<table><thead><tr><th>No</th><th>Accident Date</th><th>Plate Number</th><th>Vehicle</th><th>Department</th><th>City</th><th>Driver</th><th>Mistake</th><th>Status</th></tr></thead><tbody>'
      + (shown.length ? shown.map((r, i) => '<tr><td>' + ((page - 1) * per + i + 1) + '</td><td>' + esc(fmtDMY(r.date)) + '</td><td><b>' + esc(accPlate(r.vehicle_name)) + '</b></td><td>' + esc(accModel(r.vehicle_name)) + '</td><td>' + esc(accDept(r)) + '</td><td>' + esc(r.location || '—') + '</td><td>' + esc(accDriver(r)) + '</td><td>' + esc(accMistake(r)) + '</td><td>' + esc(accStatus(r)) + '</td></tr>').join('') : '<tr><td colspan="9" class="rm-empty">No accidents recorded this month.</td></tr>')
      + '</tbody></table><p class="rm-foot">Total accidents this month: <b>' + recs.length + '</b></p></article>';
    return section('Month-wise accident report', 'Every accident recorded in the chosen month. The card is sized for a screenshot.', '<div class="df-repwrap">' + card + '</div>' + pager('accmonth', recs.length, per), select);
  }
  function accidentOverview() {
    const rs = rows('accidents').filter(r => period(r, 'date')).sort((a, b) => String(b.date).localeCompare(String(a.date))), repair = rs.filter(r => number(r.repair_cost) != null);
    const repeat = vehicles().map(v => ({ v, n: number(v.custom_nos_of_accident_occured) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 8);
    return banner('rose', 'alert', 'Safety & accident register', 'Selected period · actual ERP images and source records.')
      + strip([[complete('accidents') ? rs.length : '—', 'Accidents in period'], [complete('accidents') ? fmt(repair.reduce((n, r) => n + number(r.repair_cost), 0), 2) : '—', 'Recorded repair amounts (' + repair.length + ' of ' + rs.length + ' have one)'], [complete('accidents') ? new Set(rs.map(r => r.vehicle_name)).size : '—', 'Vehicles involved']])
      + section('Lifetime accident count', 'Vehicle master · custom_nos_of_accident_occured · highest first', repeat.length ? bars(repeat.map(x => ({ label: x.v.license_plate || x.v.name, value: x.n })), { digits: 0, attr: x => 'data-vehicle="' + esc(vehicles().find(v => (v.license_plate || v.name) === x.label)?.name || '') + '"' }) : '<div class="df-empty">No accident counts recorded on vehicles.</div>')
      + unavailable('accidents') + '<div class="df-accident-grid">' + rs.map(r => { const images = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'].map(k => safeImage(r[k])).filter(Boolean); return '<article class="df-accident-card"><header>' + icon('alert') + '<div><h3>' + esc(plateOf(r.vehicle_name)) + '</h3><p>' + esc(r.date) + ' · ' + esc(r.location || 'City not recorded') + ' · ' + esc(accModel(r.vehicle_name)) + '</p></div>' + pill(r.amount_status || 'No amount status') + '</header><div class="df-accident-photos">' + (images.length ? images.map((url, i) => '<a href="' + esc(url) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(url) + '" alt="Accident ' + esc(r.name) + ' evidence ' + (i + 1) + '"></a>').join('') : '<div class="df-photo-empty">' + icon('truck') + 'No uploaded photographs</div>') + '</div><p>' + esc(r.remarks || 'No remarks recorded') + '</p>' + strip([[fmt(r.repair_cost, 2), 'Recorded repair amount'], [esc(r.liability || 'Unknown'), 'Liability recorded']]) + '<button class="df-btn primary" data-doc="Vehicle Accident" data-name="' + esc(r.name) + '">Open accident record ↗</button></article>'; }).join('') + '</div>'
      + (rs.length ? '' : '<div class="df-empty">' + (complete('accidents') ? 'No accidents recorded in this period.' : 'Accident records unavailable.') + '</div>');
  }
  function accidentReports() {
    const A = S.data.accidents;
    if (!A || A.state !== 'complete') return '';
    const all = A.rows.filter(r => r.vehicle_name || r.employee).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!all.length) return '';
    return employeeReport(all) + monthReport(all)
      + section('Accident register', 'All recorded accidents · select a row to open the ERP record. The reports above include accidents of vehicles no longer in the fleet.', erpTable('Vehicle Accident', [['Date', r => esc(fmtDMY(r.date))], ['Vehicle', r => esc(accPlate(r.vehicle_name))], ['Driver', r => esc(accDriver(r))], ['Department', r => esc(accDept(r))], ['City', r => esc(r.location || '—')], ['Mistake', r => esc(accMistake(r))], ['Status', r => esc(accStatus(r))], ['Repair cost', r => fmt(r.repair_cost, 2)]], all, r => r.name, 'accreg', 10), csvBtn('accidents', ['Date', 'Plate', 'Driver', 'Location', 'Mistake', 'Status', 'Repair cost'], all.map(r => [r.date, accPlate(r.vehicle_name), accDriver(r), accDept(r), accMistake(r), accStatus(r), r.repair_cost ?? ''])));
  }
  function accidents() {
    const all0 = complete('accidents') ? S.data.accidents.rows.filter(r => r.vehicle_name || r.employee) : null;
    return accidentOverview() + (all0 && all0.length ? '<h3 class="df-rep-sep">Accident analysis<small>Drivers, trends and insurance claims · all accident records</small></h3>' + driverScorecard(all0) + accidentTrends(all0) + claimTracker(all0) + backchargeList(all0) + najmMissing(all0) : '') + '<h3 class="df-rep-sep">Accident reports<small>Screenshot-ready · every accident on record, including vehicles that have since left the fleet</small></h3>' + accidentReports();
  }
  /* ═════════════ Documents ═════════════ */
  function documents(vs = vehicles(), full = true) {
    const all = expiryRows(vs), stats = { expired: all.filter(x => x.days != null && x.days < 0).length, soon: all.filter(x => x.days != null && x.days >= 0 && x.days <= 30).length, missing: all.filter(x => x.days == null).length, current: all.filter(x => x.days > 30).length };
    const filtered = all.filter(x => S.documentMode === 'all' || S.documentMode === 'expired' && x.days != null && x.days < 0 || S.documentMode === 'soon' && x.days != null && x.days >= 0 && x.days <= 30 || S.documentMode === 'missing' && x.days == null || S.documentMode === 'current' && x.days > 30).sort((a, b) => (a.days == null ? Infinity : a.days) - (b.days == null ? Infinity : b.days));
    const coverage = full ? section('Date coverage', 'Vehicles with a recorded date, per exact field', bars(DOCS.map(([k, l]) => ({ label: l + ' · ' + k, value: vs.filter(v => v[k]).length, tone: '' })), { digits: 0 }) + '<p class="df-note">Out of ' + vs.length + ' vehicles in view. Sold vehicles and changed number plates are excluded.</p>') : '';
    const pgc = full ? 'doccards' : 'd-doccards', per = full ? 12 : 8;
    return '<div class="df-document-control">' + banner('teal', 'file', 'Document control center', 'As of ' + today() + ' · exact ERP fields · counts represent documents.')
      + strip([['expired', 'Overdue'], ['soon', 'Due ≤30 days'], ['missing', 'Missing dates'], ['current', 'Beyond 30 days']].map(([k, l]) => [complete('vehicles') ? stats[k] : '—', l]))
      + (full ? '<div class="df-grid">' + horizon() + coverage + '</div>' : '')
      + '<label class="df-document-filter">Show documents<select data-document-mode>' + [['all', 'All documents'], ['expired', 'Overdue'], ['soon', 'Due within 30 days'], ['missing', 'Missing dates'], ['current', 'Beyond 30 days']].map(([k, l]) => '<option value="' + k + '"' + (S.documentMode === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>'
      + '<div class="df-document-grid">' + slicePage(pgc, filtered, per).map(x => { const tone = x.days == null ? 'muted' : x.days < 0 ? 'bad' : x.days <= 30 ? 'warn' : 'good', status = x.days == null ? 'Date not recorded' : x.days < 0 ? fmt(-x.days) + ' days overdue' : x.days === 0 ? 'Due today' : fmt(x.days) + ' days remaining'; return '<article class="df-document-card ' + tone + '"><div><h3>' + esc(x.label) + '</h3>' + (full ? plateId(x.vehicle) : '') + '<p>' + esc(x.date || 'Missing date') + '</p>' + pill(status, tone) + '<code>' + esc(x.key) + '</code></div><button class="df-btn" data-doc="Vehicle" data-name="' + esc(x.vehicle) + '">Review ↗</button></article>'; }).join('') + '</div>'
      + pager(pgc, filtered.length, per)
      + '<p class="df-note">No expiry dates are substituted. Vehicle inspection is the MVPI / Fahas date (mvpi_date); the old inspection_expiry_date field is no longer used. Both driving licence fields remain independent.</p>'
      + (full ? section('Document register', 'Complete matching directory; use Vehicle for source edits.', table([['Vehicle', r => vehicleLink(r.vehicle)], ['Document', r => esc(r.label)], ['Exact field', r => esc(r.key)], ['Date', r => esc(r.date || 'Missing')]], filtered, 0, 'docreg', 15), csvBtn('documents', ['Plate', 'Document', 'Field', 'Date', 'Days'], filtered.map(r => [plateOf(r.vehicle), r.label, r.key, r.date || '', r.days ?? '']))) : '')
      + '</div>';
  }
  /* ═════════════ Bookings ═════════════ */
  const skeleton = n => '<div class="df-skel" role="status" aria-label="Loading">' + Array.from({ length: n }, () => '<i></i>').join('') + '</div>';
  /* ═════════════ v8: fuel analytics (Aldrees tab) ═════════════ */
  const normPlate = s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const vehByPlate = () => { const m = new Map(); (S.data.vehicles?.rows || []).forEach(v => { m.set(normPlate(v.license_plate), v); m.set(normPlate(v.name), v); }); return m; };
  const REPLACE_AGE = 8, REPLACE_KM = 300000;            // review thresholds (edit to taste)
  const inWindow = d => { const s = String(d || '').slice(0, 10); return s >= S.f.from && s <= S.f.to; };
  const monthOf = d => String(d || '').slice(0, 7);
  const monthLabel = k => { const [y, m] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  /* One list of fuel purchases: the Aldrees API when connected, otherwise Aldrees Fuel Usage in ERP. Only fleet vehicles are kept. */
  function fuelRows() {
    const map = vehByPlate(), A = aldData();
    if (A && Array.isArray(A.transactions)) return A.transactions.map(t => ({ v: map.get(normPlate(t.plate)), date: String(t.date || '').slice(0, 10), qty: number(t.quantity), amount: number(t.amount), src: 'api' })).filter(r => r.v);
    const ids = new Set(vehicles().map(v => v.name));
    return (S.data.fuel?.rows || []).filter(r => ids.has(r.plate_no)).map(r => ({ v: vehicleById(r.plate_no), date: r.date, qty: number(r.quantity), amount: number(r.after_vat), limit: number(r.monthly_limit), src: 'erp' })).filter(r => r.v);
  }
  const fuelReady = () => aldData() || complete('fuel');
  const noFuelNote = () => '<div class="df-empty">No fuel purchases are loaded' + (S.fuelLatest && S.fuelLatest !== 'none' && !aldData() ? '. The latest Aldrees record in ERP is dated ' + esc(S.fuelLatest) + ' — widen the fuel period above, or connect the Aldrees API.' : '.') + '</div>';
  const distanceByVehicle = () => { const m = new Map(); rows('daily').forEach(r => { if (number(r.distance_km) != null) m.set(r.vehicle, (m.get(r.vehicle) || 0) + number(r.distance_km)); }); return m; };
  const maintCostByVehicle = (all) => { const m = new Map(); (S.data.maintenance?.rows || []).filter(r => ['Completed', 'Approved'].includes(r.status) && number(r.total_amount) != null && (all || inWindow(r.date))).forEach(r => m.set(r.vehicle, (m.get(r.vehicle) || 0) + number(r.total_amount))); return m; };

  function fuelLimits() {
    const fr = fuelRows(), A = aldData(), apiLimits = new Map(((A && A.limits) || []).map(l => [normPlate(l.plate), number(l.limit)]));
    if (!fuelReady()) return section('Fuel limits', 'Monthly spend against each vehicle’s limit', unavailable('fuel'));
    const months = [...new Set(fr.map(r => monthOf(r.date)).filter(Boolean))].sort().reverse();
    if (!months.length) return section('Fuel limits', 'Monthly spend against each vehicle’s limit', noFuelNote());
    const month = months.includes(S.limMonth) ? S.limMonth : months[0], inM = fr.filter(r => monthOf(r.date) === month), by = new Map();
    vehicles().forEach(v => by.set(v.name, { v, spent: 0, qty: 0, limit: apiLimits.get(normPlate(v.license_plate)) ?? number(v.custom_monthly_limit) }));
    inM.forEach(r => { const o = by.get(r.v.name); if (!o) return; o.spent += r.amount || 0; o.qty += r.qty || 0; if (o.limit == null && r.limit != null && r.limit > 0) o.limit = r.limit; });
    const list = [...by.values()].filter(o => o.spent > 0 || o.limit > 0).map(o => ({ ...o, pct: o.limit > 0 ? o.spent / o.limit * 100 : null })).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.spent - a.spent);
    const over = list.filter(o => o.pct != null && o.pct > 100).length, near = list.filter(o => o.pct != null && o.pct >= 90 && o.pct <= 100).length, none = list.filter(o => o.pct == null && o.spent > 0).length;
    const sel = '<label class="df-inline">Month<select data-lim-month>' + months.map(k => '<option value="' + k + '"' + (k === month ? ' selected' : '') + '>' + monthLabel(k) + '</option>').join('') + '</select></label>';
    return section('Fuel limits', 'Spend after VAT against the monthly limit on the vehicle or Aldrees card. Confirm the limit is in the same currency as the spend.', strip([[over, 'Over limit'], [near, 'At 90% or more'], [none, 'Spend, no limit set'], [fmt(inM.reduce((n, r) => n + (r.amount || 0), 0), 2), 'Fleet spend · ' + monthLabel(month)]])
      + table([['Vehicle', o => vehicleLink(o.v.name)], ['Limit', o => o.limit > 0 ? fmt(o.limit, 2) : '—'], ['Spent', o => fmt(o.spent, 2)], ['Used', o => o.pct == null ? '—' : '<span class="df-meter ' + (o.pct > 100 ? 'bad' : o.pct >= 90 ? 'warn' : 'good') + '"><i style="width:' + clamp(o.pct, 0, 100) + '%"></i></span> ' + fmt(o.pct) + '%'], ['Status', o => o.pct == null ? pill(o.spent > 0 ? 'No limit set' : 'No spend', 'muted') : pill(o.pct > 100 ? 'Over limit' : o.pct >= 90 ? 'Near limit' : 'Within limit', o.pct > 100 ? 'bad' : o.pct >= 90 ? 'warn' : 'good')]], list, 0, 'limits', 10), sel);
  }

  function mileageReport() {
    if (!complete('daily')) return section('Mileage report', 'Distance driven against fuel bought', unavailable('daily'));
    if (!fuelReady()) return section('Mileage report', 'Distance driven against fuel bought', unavailable('fuel'));
    const dist = distanceByVehicle(), fuelBy = new Map(); fuelRows().filter(r => inWindow(r.date)).forEach(r => { const o = fuelBy.get(r.v.name) || { qty: 0, amount: 0 }; o.qty += r.qty || 0; o.amount += r.amount || 0; fuelBy.set(r.v.name, o); });
    const list = vehicles().map(v => { const km = dist.get(v.name) ?? null, f = fuelBy.get(v.name); return { v, km, qty: f?.qty ?? null, amount: f?.amount ?? null, kpl: km > 0 && f?.qty > 0 ? km / f.qty : null, odo: odometer(v) }; }).filter(r => r.km != null || r.qty != null).sort((a, b) => (a.kpl ?? Infinity) - (b.kpl ?? Infinity) || (b.km ?? 0) - (a.km ?? 0));
    const km = list.reduce((n, r) => n + (r.kpl != null ? r.km : 0), 0), q = list.reduce((n, r) => n + (r.kpl != null ? r.qty : 0), 0);
    return section('Mileage report', 'Distance from Vehicle Daily Report and fuel from the purchases above, both for the selected dates (' + S.f.from + ' to ' + S.f.to + '). Efficiency needs both.', (fuelBy.size ? strip([[q ? fmt(km / q, 2) : '—', 'Fleet km per litre'], [fmt(km), 'Distance with fuel data · km'], [fmt(q, 1), 'Fuel · litres']]) : '<div class="df-note warn">No fuel purchases fall inside the selected dates, so efficiency cannot be calculated. Distance is still shown.</div>')
      + table([['Vehicle', r => vehicleLink(r.v.name)], ['Distance km', r => fmt(r.km, 1)], ['Fuel litres', r => fmt(r.qty, 1)], ['km per litre', r => r.kpl == null ? '—' : '<b>' + fmt(r.kpl, 2) + '</b>'], ['Fuel cost', r => fmt(r.amount, 2)], ['Odometer', r => fmt(r.odo)]], list, 0, 'mileage', 10), csvBtn('mileage', ['Plate', 'Distance km', 'Fuel litres', 'km per litre', 'Fuel cost', 'Odometer'], list.map(r => [r.v.license_plate || r.v.name, r.km ?? '', r.qty ?? '', r.kpl ?? '', r.amount ?? '', r.odo ?? ''])));
  }

  function costPerKm() {
    if (!complete('daily') || !complete('maintenance')) return section('Cost per km', 'Running cost ranked by vehicle', unavailable(!complete('daily') ? 'daily' : 'maintenance'));
    if (!fuelReady()) return section('Cost per km', 'Running cost ranked by vehicle', unavailable('fuel'));
    const dist = distanceByVehicle(), maint = maintCostByVehicle(false), fuelBy = new Map(); fuelRows().filter(r => inWindow(r.date)).forEach(r => fuelBy.set(r.v.name, (fuelBy.get(r.v.name) || 0) + (r.amount || 0)));
    const list = vehicles().map(v => { const km = dist.get(v.name) || 0, f = fuelBy.get(v.name) || 0, m = maint.get(v.name) || 0; return { v, km, f, m, total: f + m, cpk: km > 0 && f + m > 0 ? (f + m) / km : null }; }).filter(r => r.cpk != null).sort((a, b) => b.cpk - a.cpk);
    const sorted = list.map(r => r.cpk).sort((a, b) => a - b), median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null, totalKm = list.reduce((n, r) => n + r.km, 0), totalCost = list.reduce((n, r) => n + r.total, 0);
    return section('Cost per km', 'Fuel plus completed and approved maintenance divided by distance driven, selected dates. Highest first — these are the vehicles to review for sale or replacement.', (list.length ? strip([[totalKm ? fmt(totalCost / totalKm, 2) : '—', 'Fleet cost per km'], [fmt(median, 2), 'Median vehicle'], [fmt(list.filter(r => r.cpk > median * 1.5).length), 'Above 1.5× median']]) : '') + (fuelBy.size ? '' : '<div class="df-note warn">No fuel purchases fall inside the selected dates, so these costs are maintenance only.</div>')
      + table([['#', r => fmt(list.indexOf(r) + 1)], ['Vehicle', r => vehicleLink(r.v.name)], ['Distance km', r => fmt(r.km, 1)], ['Fuel', r => fmt(r.f, 2)], ['Maintenance', r => fmt(r.m, 2)], ['Total', r => fmt(r.total, 2)], ['Cost per km', r => '<b>' + fmt(r.cpk, 2) + '</b>'], ['Review', r => r.cpk > median * 1.5 ? pill('Review', 'bad') : '']], list, 0, 'cpk', 10) + '<p class="df-note">Short date ranges are noisy: a single workshop bill on a low-distance week inflates the figure. Use 60 to 90 days for decisions.</p>', csvBtn('cost-per-km', ['Plate', 'Distance km', 'Fuel', 'Maintenance', 'Total', 'Cost per km'], list.map(r => [r.v.license_plate || r.v.name, r.km, r.f, r.m, r.total, r.cpk])));
  }

  function ownershipCost() {
    if (!complete('maintenance') || !complete('accidents')) return section('Total cost of ownership', 'Purchase price + maintenance + accident repairs', unavailable(!complete('maintenance') ? 'maintenance' : 'accidents'));
    const maint = maintCostByVehicle(true), acc = new Map(); S.data.accidents.rows.forEach(r => { if (number(r.repair_cost) != null) acc.set(r.vehicle_name, (acc.get(r.vehicle_name) || 0) + number(r.repair_cost)); });
    const list = vehicles().map(v => { const price = purchasePrice(v), bought = purchaseDate(v), age = bought ? Math.max(0, -days(bought) / 365.25) : null, m = maint.get(v.name) || 0, a = acc.get(v.name) || 0, odo = odometer(v), tco = (price || 0) + m + a;
      return { v, price, age, m, a, odo, tco, perKm: price && odo > 0 ? tco / odo : null, perYear: price && age > 0.25 ? tco / age : null, flag: (age != null && age >= REPLACE_AGE) || odo >= REPLACE_KM }; }).sort((a, b) => (b.perKm ?? -1) - (a.perKm ?? -1) || b.tco - a.tco);
    const noPrice = list.filter(r => !r.price).length;
    return section('Total cost of ownership', 'Purchase price (linked Asset, else Vehicle price) + all maintenance + accident repair costs, against age and odometer. Review flag: ' + REPLACE_AGE + '+ years or ' + fmt(REPLACE_KM) + '+ km.', (noPrice ? '<div class="df-note warn">' + noPrice + ' vehicles have no purchase price on the Vehicle record, so their cost per km is not calculated.</div>' : '')
      + table([['Vehicle', r => vehicleLink(r.v.name)], ['Age', r => r.age == null ? '—' : fmt(r.age, 1) + ' y'], ['Odometer', r => fmt(r.odo)], ['Price', r => fmt(r.price)], ['Maintenance', r => fmt(r.m, 2)], ['Accident repairs', r => fmt(r.a, 2)], ['Total', r => '<b>' + fmt(r.tco, 2) + '</b>'], ['Per km', r => r.perKm == null ? '—' : fmt(r.perKm, 2)], ['Per year', r => r.perYear == null ? '—' : fmt(r.perYear)], ['Flag', r => r.flag ? pill('Review', 'warn') : '']], list, 0, 'tco', 10), csvBtn('tco', ['Plate', 'Age years', 'Odometer', 'Price', 'Maintenance', 'Accident repairs', 'Total', 'Per km'], list.map(r => [r.v.license_plate || r.v.name, r.age ?? '', r.odo ?? '', r.price ?? '', r.m, r.a, r.tco, r.perKm ?? ''])));
  }

  function fuelAnomalies() {
    if (!fuelReady()) return section('Fuel anomaly alerts', 'Unusual fuel purchases', unavailable('fuel'));
    const fr = fuelRows(); if (!fr.length) return section('Fuel anomaly alerts', 'Unusual fuel purchases', noFuelNote());
    const alerts = [], dayKey = r => r.v.name + '|' + r.date, groups = new Map(); fr.forEach(r => { const k = dayKey(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    const dailyBy = new Map(); rows('daily').forEach(r => dailyBy.set(r.vehicle + '|' + r.report_date, r));
    fr.forEach(r => { const cap = number(r.v.fuel_capacity); if (cap > 0 && r.qty > cap) alerts.push({ date: r.date, v: r.v, type: 'Fill-up bigger than tank', tone: 'bad', detail: fmt(r.qty, 1) + ' L bought, tank holds ' + fmt(cap) + ' L' }); });
    groups.forEach(g => { if (g.length > 1) alerts.push({ date: g[0].date, v: g[0].v, type: 'Two fills in one day', tone: 'warn', detail: g.length + ' purchases · ' + fmt(g.reduce((n, r) => n + (r.qty || 0), 0), 1) + ' L · ' + fmt(g.reduce((n, r) => n + (r.amount || 0), 0), 2) }); });
    groups.forEach(g => { const d = dailyBy.get(dayKey(g[0])); if (d && number(d.distance_km) === 0) alerts.push({ date: g[0].date, v: g[0].v, type: 'Fuel bought, vehicle shows 0 km', tone: 'warn', detail: fmt(g.reduce((n, r) => n + (r.qty || 0), 0), 1) + ' L on a day with no recorded distance' }); });
    alerts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const count = t => alerts.filter(a => a.type === t).length;
    return section('Fuel anomaly alerts', 'Checks every loaded purchase. The zero-distance check only applies to days inside the selected dates that have a daily report.', strip([[count('Fill-up bigger than tank'), 'Bigger than tank'], [count('Two fills in one day'), 'Two fills in a day'], [count('Fuel bought, vehicle shows 0 km'), 'Fuel with 0 km']])
      + table([['Date', a => esc(a.date)], ['Vehicle', a => vehicleLink(a.v.name)], ['Alert', a => pill(a.type, a.tone)], ['Detail', a => esc(a.detail)]], alerts, 0, 'anom', 10), csvBtn('fuel-alerts', ['Date', 'Plate', 'Alert', 'Detail'], alerts.map(a => [a.date, a.v.license_plate || a.v.name, a.type, a.detail])));
  }

  /* ═════════════ v8: accident analytics ═════════════ */
  const nameKey = s => String(s || '').replace(/^\s*\d+\s*-\s*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  function driverScorecard(all) {
    const map = new Map(), get = (name) => { const k = nameKey(name); if (!k) return null; if (!map.has(k)) map.set(k, { name: String(name).replace(/^\s*\d+\s*-\s*/, ''), vehicles: [], acc: [] }); return map.get(k); };
    (S.data.vehicles?.rows || []).forEach(v => { const o = get(driver(v)); if (o) o.vehicles.push(v); });
    all.forEach(r => { const o = get(accDriver(r)); if (o) o.acc.push(r); });
    const since = frappe.datetime.add_days(today(), -365), issues = indexBy('issues');
    const list = [...map.values()].map(o => { const mp = o.acc.map(r => number(r.mistake_)).filter(n => n != null), recent = o.acc.filter(r => String(r.date) >= since).length, openIssues = complete('issues') ? o.vehicles.reduce((n, v) => n + (issues.get(v.name) || []).filter(r => OPEN_ISSUE.includes(r.status)).length, 0) : null;
      return { ...o, total: o.acc.length, recent, avg: mp.length ? mp.reduce((a, b) => a + b, 0) / mp.length : null, ours: o.acc.filter(r => r.liability === 'Ours').length, openIssues }; }).filter(o => o.total || o.vehicles.length).sort((a, b) => b.recent - a.recent || b.total - a.total || (b.avg ?? -1) - (a.avg ?? -1));
    return section('Driver scorecard', 'Accidents come from Vehicle Accident (all dates); issues come from the vehicles each driver is assigned. Repeat = 2 or more accidents in the last 12 months.', table([['Driver', o => esc(o.name) + (o.recent >= 2 ? ' ' + pill('Repeat', 'bad') : '')], ['Vehicles', o => o.vehicles.length ? o.vehicles.map(v => esc(v.license_plate || v.name)).join(', ') : '—'], ['Accidents', o => fmt(o.total)], ['Last 12 m', o => fmt(o.recent)], ['Avg mistake', o => o.avg == null ? '—' : fmt(o.avg) + '%'], ['Our fault', o => fmt(o.ours)], ['Open issues', o => o.openIssues == null ? '…' : fmt(o.openIssues)]], list, 0, 'drivers', 10), csvBtn('drivers', ['Driver', 'Vehicles', 'Accidents', 'Last 12 months', 'Avg mistake %', 'Our fault', 'Open issues'], list.map(o => [o.name, o.vehicles.map(v => v.license_plate || v.name).join(' / '), o.total, o.recent, o.avg ?? '', o.ours, o.openIssues ?? ''])));
  }
  function accidentTrends(all) {
    const t = today(), months = []; for (let i = 11; i >= 0; i--) { const d = new Date(Date.parse(t.slice(0, 7) + '-01T00:00:00Z')); d.setUTCMonth(d.getUTCMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    const vals = new Map(months.map(k => [k, [0, 0]])); all.forEach(r => { const a = vals.get(monthOf(r.date)); if (a) a[r.liability === 'Ours' ? 0 : 1]++; });
    const since = frappe.datetime.add_days(t, -365), recent = all.filter(r => String(r.date) >= since), byDriver = new Map(); recent.forEach(r => { const n = accDriver(r); byDriver.set(n, (byDriver.get(n) || 0) + 1); });
    const drivers = [...byDriver].map(([label, value]) => ({ label, value, tone: value >= 2 ? 'bad' : '' })).sort((a, b) => b.value - a.value).slice(0, 8);
    const mistake = ['0', '25', '50', '75', '100'].map(k => ({ label: k + '% mistake', value: recent.filter(r => String(r.mistake_) === k).length, tone: k === '0' ? 'good' : k === '100' ? 'bad' : 'warn' }));
    return section('Accident trends', 'Last 12 months · ' + recent.length + ' accidents', '<div class="df-grid"><div><h4 class="df-sub">By month</h4>' + cols({ cats: months.map(k => ({ key: k, label: monthLabel(k).slice(0, 3), tip: monthLabel(k) + '\nOur mistake: ' + vals.get(k)[0] + '\nOthers / other: ' + vals.get(k)[1] })), series: [{ cls: 'c1' }, { cls: 'c0' }], vals, label: 'Accidents by month' }) + legend([['c1', 'Our mistake'], ['c0', 'Others / other']]) + '</div><div><h4 class="df-sub">By location</h4>' + bars(group(recent, 'location').slice(0, 8), { digits: 0 }) + '</div></div>'
      + '<div class="df-grid"><div><h4 class="df-sub">By driver · red = repeat</h4>' + bars(drivers, { digits: 0 }) + '</div><div><h4 class="df-sub">By mistake %</h4>' + bars(mistake, { digits: 0 }) + '</div></div>');
  }
  function claimTracker(all) {
    /* Real data notes: insurance_amount is the amount still expected on an open claim (it is 0 once received, and the money then sits in insurance_amount_received);
       older records have no claim or status set, so only Claim = Yes or Amount Status = Pending count as open claims. */
    const isOpen = r => (r.insurance_claim__investigation === 'Yes' || r.amount_status === 'Pending') && !['Received', 'Backcharged'].includes(r.amount_status) && !number(r.insurance_money_received);
    const pending = all.filter(isOpen).map(r => { const d = days(String(r.date || '').slice(0, 10)); return { r, age: d == null ? null : Math.max(0, -d), check: r.insurance_claim__investigation !== 'Yes' || !r.amount_status }; }).sort((a, b) => (b.age ?? -1) - (a.age ?? -1));
    const bucket = (a, b) => pending.filter(x => x.age != null && x.age >= a && x.age <= b).length;
    const received = all.filter(r => number(r.insurance_amount_received) > 0), receivedSum = received.reduce((n, r) => n + number(r.insurance_amount_received), 0);
    const najm = r => { const u = safeImage(r.najm_report); return u ? '<a class="df-link" href="' + esc(u) + '" target="_blank" rel="noopener">View</a>' : pill('Missing', 'warn'); };
    return section('Insurance claim tracker', 'Open claims: Claim = Yes or Amount Status = Pending, and not yet Received or Backcharged (both count as completed). Oldest first. “Expected” is the Insurance Amount still due.', strip([[pending.length, 'Open claims'], [fmt(pending.reduce((n, x) => n + (number(x.r.insurance_amount) || 0), 0), 2), 'Expected, not received'], [bucket(0, 30), '0–30 days'], [bucket(31, 90), '31–90 days'], [bucket(91, 180), '91–180 days'], [bucket(181, 1e6), 'Over 180 days'], [fmt(receivedSum, 2), 'Received to date · ' + received.length + ' claims']])
      + (pending.some(x => x.check) ? '<div class="df-note">' + pending.filter(x => x.check).length + ' open claims are marked “Check record”: the Claim field is not Yes, or the Amount Status is not set. Open the record to complete it.</div>' : '')
      + erpTable('Vehicle Accident', [['Accident date', r => esc(fmtDMY(r.r.date))], ['Vehicle', r => esc(accPlate(r.r.vehicle_name))], ['Driver', r => esc(accDriver(r.r))], ['Liability', r => esc(accStatus(r.r))], ['Taqdeer', r => esc(r.r.taqdeer || '—')], ['Najm report', r => najm(r.r)], ['Claim', r => esc(r.r.insurance_claim__investigation || '—')], ['Expected', r => fmt(r.r.insurance_amount, 2)], ['Status', r => r.check ? pill(r.r.amount_status || 'Not set', r.r.amount_status ? 'warn' : 'muted') + ' ' + pill('Check record', 'bad') : pill(r.r.amount_status, 'warn')], ['Age', r => r.age == null ? '—' : '<span class="' + (r.age > 180 ? 'bad-text' : r.age > 90 ? 'warn-text' : '') + '">' + fmt(r.age) + ' d</span>']], pending, x => x.r.name, 'claims', 10),
      csvBtn('claims', ['Accident date', 'Plate', 'Driver', 'Liability', 'Taqdeer', 'Najm report', 'Claim', 'Expected', 'Status', 'Age days'], pending.map(x => [x.r.date, accPlate(x.r.vehicle_name), accDriver(x.r), accStatus(x.r), x.r.taqdeer || '', x.r.najm_report ? 'Yes' : 'No', x.r.insurance_claim__investigation || '', x.r.insurance_amount ?? '', x.r.amount_status || '', x.age ?? ''])));
  }

  /* ═════════════ v9.4: record health ═════════════
     Checks on the records themselves (stale, unfinished, unverifiable) rather than on fields of the Vehicle record. */
  function recordHealth() {
    if (!complete('vehicles')) return '';
    const items = [], ageOf = d => { const x = days(String(d || '').slice(0, 10)); return x == null ? null : Math.max(0, -x); }, oldest = a => a.length ? Math.max(...a) : null;
    const add = (o) => items.push(o), wait = (label, k) => add({ label, state: S.data[k]?.state && S.data[k].state !== 'complete' ? 'unavailable' : 'loading' });
    const base = vehicles().filter(v => !v.custom_vehicle_status || v.custom_vehicle_status === 'Active');
    /* maintenance */
    if (complete('maintenance')) {
      const m = rows('maintenance', true), stale = m.filter(r => OPEN_MAINT.includes(r.status) && (ageOf(r.date) ?? 0) > 60), noAmt = m.filter(r => ['Completed', 'Approved'].includes(r.status) && !(number(r.total_amount) > 0));
      add({ label: 'Open work orders older than 60 days', hint: 'Scheduled or In Maintenance, never completed or cancelled.', n: stale.length, detail: stale.length ? 'oldest ' + fmt(oldest(stale.map(r => ageOf(r.date)))) + ' days' : '', tone: 'warn', tab: 'maintenance' });
      add({ label: 'Finished without an amount', hint: 'Cost totals and cost per km understate these.', n: noAmt.length, detail: '', tone: 'warn', tab: 'maintenance' });
    } else wait('Maintenance work orders', 'maintenance');
    /* repair register */
    /* issues + checks */
    if (complete('issues')) {
      const o = rows('issues', true).filter(r => OPEN_ISSUE.includes(r.status) && (ageOf(r.report_datetime) ?? 0) > 30);
      add({ label: 'Issues open for more than 30 days', hint: 'Open or In Progress driver-reported issues with no resolution.', n: o.length, detail: o.length ? 'oldest ' + fmt(oldest(o.map(r => ageOf(r.report_datetime)))) + ' days' : '', tone: 'warn', tab: 'vehicles' });
    } else wait('Driver issues', 'issues');
    /* usage */
    if (complete('daily')) {
      const rep = new Set(rows('daily', true).map(r => r.vehicle)), silent = base.filter(v => !rep.has(v.name)), un = unclassified(), tt = total('daily', 'distance_km');
      add({ label: 'No daily report in the selected dates', hint: 'No report is unknown, not zero activity.', n: silent.length, detail: '', tone: 'warn', tab: 'usage' });
      if (un != null && tt) add({ label: 'Unclassified distance', hint: 'Total distance not placed in the 06–18 or 18–06 window.', n: un > 0.5 ? 1 : 0, detail: fmt(un, 1) + ' km · ' + fmt(100 * un / tt, 1) + '% of total · ' + fmt(unclassifiedSplit().between, 1) + ' km beyond rounding', tone: un / tt > 0.02 ? 'warn' : 'info', tab: 'usage', flag: true });
    } else wait('Daily reports', 'daily');
    /* fuel freshness */
    if (S.fuelLatest) { const a = S.fuelLatest === 'none' ? null : ageOf(S.fuelLatest); add({ label: 'Aldrees fuel records are out of date', hint: 'Fuel limits, mileage and cost per km depend on fresh fuel data. Connect the Aldrees API or import more often.', n: a == null || a > 14 ? 1 : 0, detail: S.fuelLatest === 'none' ? 'no records' : 'latest ' + S.fuelLatest + ' · ' + fmt(a) + ' days ago', tone: a == null || a > 60 ? 'bad' : 'warn', tab: 'fuel', flag: true }); }
    /* oil report coverage */
    if (S.oil?.state === 'complete') { const miss = base.filter(v => !oilRow(v)); add({ label: 'Not in the Oil Change Report', hint: 'Matched on Vehicle.plate_no. These use the Vehicle-record formula, without yesterday’s distance.', n: miss.length, detail: '', tone: 'info', tab: 'maintenance' }); }
    else if (S.oil?.state === 'unavailable') add({ label: 'Oil Change Report unavailable', hint: 'Oil figures use the Vehicle-record formula instead.', n: 1, detail: 'report did not load', tone: 'warn', tab: 'maintenance', flag: true });
    /* accidents + claims */
    if (complete('accidents')) {
      const all = S.data.accidents.rows, since = frappe.datetime.add_days(today(), -365), noNajm = all.filter(r => String(r.date) >= since && !r.najm_report), chk = all.filter(r => (r.insurance_claim__investigation === 'Yes' || r.amount_status === 'Pending') && !['Received', 'Backcharged'].includes(r.amount_status) && !number(r.insurance_money_received) && (r.insurance_claim__investigation !== 'Yes' || !r.amount_status)), old = all.filter(r => (r.insurance_claim__investigation === 'Yes' || r.amount_status === 'Pending') && !['Received', 'Backcharged'].includes(r.amount_status) && !number(r.insurance_money_received) && (ageOf(r.date) ?? 0) > 180);
      add({ label: 'Open claims older than 180 days', hint: 'Claim Yes or Amount Status Pending, still not received.', n: old.length, detail: old.length ? 'oldest ' + fmt(oldest(old.map(r => ageOf(r.date)).filter(a => a != null))) + ' days' : '', tone: 'bad', tab: 'accidents' });
      add({ label: 'Claims with incomplete fields', hint: 'Claim is not Yes, or Amount Status is not set, on an open claim.', n: chk.length, detail: '', tone: 'warn', tab: 'accidents' });
      add({ label: 'Recent accidents without a Najm report', hint: 'Accidents in the last 12 months with no Najm attachment.', n: noNajm.length, detail: '', tone: 'warn', tab: 'accidents' });
    } else wait('Accident records', 'accidents');
    const live = items.filter(i => i.n > 0).sort((a, b) => ({ bad: 0, warn: 1, info: 2 }[a.tone] - { bad: 0, warn: 1, info: 2 }[b.tone]) || b.n - a.n), clear = items.filter(i => i.n === 0), pend = items.filter(i => i.state);
    const row = i => '<button class="df-dq ' + i.tone + ' rec" data-tab="' + i.tab + '"' + (i.approved ? ' data-approved="1"' : '') + '><span class="df-dq-label"><b>' + esc(i.label) + '</b><small>' + esc(i.hint || '') + '</small></span><span class="df-dq-detail">' + esc(i.detail || '') + '</span><strong>' + (i.flag ? '!' : fmt(i.n)) + '</strong></button>';
    return section('Record health', 'Unfinished, stale or unverifiable records across maintenance, checks, usage, fuel and accidents · select a row to open the tab', (live.length ? '<div class="df-dqs two">' + live.map(row).join('') + '</div>' : '<div class="df-empty good">' + icon('check') + 'No stale or unfinished records found in the loaded data.</div>')
      + (pend.length ? '<p class="df-note">' + (pend.some(i => i.state === 'loading') ? '<i class="df-spin" aria-hidden="true"></i>' : '') + 'Not yet checked: ' + esc(pend.map(i => i.label + (i.state === 'unavailable' ? ' (unavailable)' : '')).join(', ')) + '</p>' : '')
      + (clear.length ? '<p class="df-note">Clear: ' + esc(clear.map(i => i.label).join(' · ')) + '</p>' : ''));
  }

  /* Backcharged accidents: Amount Status = Backcharged. Treated as completed, so they are not open claims. */
  function backchargeList(all) {
    const list = all.filter(r => r.amount_status === 'Backcharged').map(r => ({ r, age: (() => { const d = days(String(r.date || '').slice(0, 10)); return d == null ? null : Math.max(0, -d); })() })).sort((a, b) => String(b.r.date).localeCompare(String(a.r.date)));
    const ours = list.filter(x => x.r.liability === 'Ours').length, repair = list.reduce((n, x) => n + (number(x.r.repair_cost) || 0), 0), drivers = new Set(list.map(x => accDriver(x.r))).size;
    const najm = r => { const u = safeImage(r.najm_report); return u ? '<a class="df-link" href="' + esc(u) + '" target="_blank" rel="noopener">View</a>' : pill('Missing', 'warn'); };
    return section('Backcharge list', 'Accidents with Amount Status = Backcharged. These are completed, so they are not counted as open insurance claims.', strip([[list.length, 'Backcharged accidents'], [ours, 'Our fault'], [list.length - ours, 'Other liability'], [fmt(repair, 2), 'Repair cost recorded'], [drivers, 'Drivers']])
      + erpTable('Vehicle Accident', [['Accident date', r => esc(fmtDMY(r.r.date))], ['Vehicle', r => esc(accPlate(r.r.vehicle_name))], ['Driver', r => esc(accDriver(r.r))], ['Liability', r => esc(accStatus(r.r))], ['Mistake', r => esc(accMistake(r.r))], ['Taqdeer', r => esc(r.r.taqdeer || '—')], ['Najm report', r => najm(r.r)], ['Repair cost', r => fmt(r.r.repair_cost, 2)], ['Status', r => pill('Backcharged', 'info')], ['Age', r => r.age == null ? '—' : fmt(r.age) + ' d']], list, x => x.r.name, 'backcharge', 10),
      csvBtn('backcharge', ['Accident date', 'Plate', 'Driver', 'Liability', 'Mistake %', 'Taqdeer', 'Najm report', 'Repair cost', 'Age days'], list.map(x => [x.r.date, accPlate(x.r.vehicle_name), accDriver(x.r), accStatus(x.r), x.r.mistake_ ?? '', x.r.taqdeer || '', x.r.najm_report ? 'Yes' : 'No', x.r.repair_cost ?? '', x.age ?? ''])));
  }
  /* Accidents with no Najm attachment, last 12 months; a row opens the accident record. */
  function najmMissing(all) {
    const since = frappe.datetime.add_days(today(), -365), list = all.filter(r => String(r.date) >= since && !r.najm_report).sort((a, b) => String(b.date).localeCompare(String(a.date))), older = all.filter(r => String(r.date) < since && !r.najm_report).length;
    return section('Accidents without a Najm report', 'Last 12 months · select a row to open the accident and attach the report' + (older ? ' · ' + older + ' older accidents also have none' : ''), strip([[list.length, 'Without Najm report'], [list.filter(r => r.liability === 'Ours').length, 'Our fault'], [list.filter(r => r.amount_status === 'Pending').length, 'With a pending claim']])
      + erpTable('Vehicle Accident', [['Accident date', r => esc(fmtDMY(r.date))], ['Vehicle', r => esc(accPlate(r.vehicle_name))], ['Driver', r => esc(accDriver(r))], ['City', r => esc(r.location || '—')], ['Liability', r => esc(accStatus(r))], ['Case no', r => esc(r.accident_case_no || '—')], ['Claim', r => esc(r.insurance_claim__investigation || '—')], ['Status', r => pill(r.amount_status || 'Not set', r.amount_status === 'Pending' ? 'warn' : 'muted')]], list, r => r.name, 'nonajm', 10),
      csvBtn('no-najm', ['Accident date', 'Plate', 'Driver', 'City', 'Liability', 'Case no', 'Claim', 'Status'], list.map(r => [r.date, accPlate(r.vehicle_name), accDriver(r), r.location || '', accStatus(r), r.accident_case_no || '', r.insurance_claim__investigation || '', r.amount_status || ''])));
  }

  /* ═════════════ Vehicle workspace ═════════════ */
  function issueCards(v) {
    const issues = detailRows('issues').filter(r => OPEN_ISSUE.includes(r.status));
    return section('Reported issues', 'Open / In Progress · all dates', dnote('issues') + (issues.length ? '<div class="df-issue-cards">' + issues.map(r => { const img = safeImage(r.photo); return '<button data-doc="Driver Vehicle Issue Request" data-name="' + esc(r.name) + '">' + (img ? '<img loading="lazy" src="' + esc(img) + '" alt="Issue photo">' : '<span class="df-issue-placeholder">' + icon('tool') + '</span>') + '<span><b>' + esc(r.issue_category) + '</b>' + pill(r.severity, ['Critical', 'High'].includes(r.severity) ? 'bad' : 'warn') + '<small>' + esc(r.status) + ' · ' + esc(r.report_datetime) + '</small><p>' + esc(r.description || 'No description recorded') + '</p></span></button>'; }).join('') + '</div>' : '<div class="df-empty">' + (detailState('issues') === 'complete' ? 'No open issues recorded.' : 'Issue records not available yet.') + '</div>'), '<button class="df-btn" data-new="Driver Vehicle Issue Request">+ Report issue</button>');
  }
  async function openVehicle(id) {
    if (!(S.data.vehicles?.rows || []).some(v => v.name === id)) return;
    if (S.selected !== id) Object.keys(S.pg).forEach(k => { if (k.startsWith('d-')) delete S.pg[k]; });
    S.selected = id; S.tab = 'details'; render(); window.scrollTo?.({ top: Math.max(0, host.getBoundingClientRect().top + window.scrollY - 80), behavior: 'auto' });
    const g = generation, again = () => { if (!disposed && g === generation && S.tab === 'details' && S.selected === id) render(); };
    const jobs = ['issues', 'maintenance', 'history', 'daily', 'fuel', 'accidents'].filter(k => !complete(k)).map(k => loadVehicleSource(id, k, g));   // small reads, in priority order, only for what the fleet queue has not delivered
    if (!S.gps[id]) { S.gps[id] = { state: 'loading' }; jobs.push((async () => {
      try { const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Vehicle Arabitra Logs', fields: ['name', 'vehicle', 'latitude', 'longitude', 'track_date_time', 'location', 'speed', 'ignition'], filters: { vehicle: id }, order_by: 'track_date_time desc, name desc', limit_page_length: 1 }, freeze: false }); if (g !== generation || disposed) return; if (r.exc || !Array.isArray(r.message)) throw Error('Unavailable'); S.gps[id] = { state: 'complete', row: r.message[0] || null }; } catch (e) { if (g !== generation || disposed) return; S.gps[id] = { state: 'unavailable' }; }
    })()); }
    if (!S.profile[id]) { S.profile[id] = { state: 'loading' }; jobs.push((async () => {
      try { const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'Vehicle', name: id }, freeze: false, silent: true }); if (g !== generation || disposed) return; if (r.exc || !r.message) throw Error('Unavailable'); S.profile[id] = { state: 'complete', doc: r.message }; } catch (e) { if (g !== generation || disposed) return; S.profile[id] = { state: 'unavailable' }; }
    })()); }
    if (!S.parts[id]) { S.parts[id] = { state: 'loading' }; jobs.push((async () => {
      try {
        const l = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Vehicle Part Maintenance', fields: ['name'], filters: { vehicle: id }, order_by: 'is_active desc, modified desc', limit_page_length: 1 }, freeze: false }); if (g !== generation || disposed) return;
        if (l.exc || !Array.isArray(l.message)) throw Error('Unavailable'); if (!l.message.length) { S.parts[id] = { state: 'none' }; return; }
        const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'Vehicle Part Maintenance', name: l.message[0].name }, freeze: false, silent: true }); if (g !== generation || disposed) return;
        if (r.exc || !r.message) throw Error('Unavailable'); S.parts[id] = { state: 'complete', doc: r.message };
      } catch (e) { if (g !== generation || disposed) return; S.parts[id] = { state: 'unavailable' }; }
    })()); }
    jobs.forEach(j => j.then(again));
  }
  function locationPanel(v) {
    const gps = S.gps[v.name], row = gps?.row, lat = number(row?.latitude), lon = number(row?.longitude), valid = lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    let body = '<div class="df-location-label">' + icon('pin') + '<div><b>' + esc(row?.location || v.current_location || 'Location not recorded') + '</b><small>' + (row ? 'GPS record: ' + esc(row.track_date_time) + ' · stored, not live' + (number(row.speed) != null ? ' · ' + fmt(row.speed) + ' km/h' : '') : gps?.state === 'loading' ? 'Loading latest permitted GPS record…' : gps?.state === 'unavailable' ? 'GPS source unavailable' : 'No GPS record available') + '</small></div></div>';
    if (valid) {
      const bbox = [Math.max(-180, lon - .015), Math.max(-90, lat - .01), Math.min(180, lon + .015), Math.min(90, lat + .01)].join(','); const map = 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) + '&layer=mapnik&marker=' + encodeURIComponent(lat + ',' + lon);
      body += '<iframe class="df-map" title="Recorded vehicle location" loading="eager" referrerpolicy="no-referrer" src="' + esc(map) + '"></iframe><a class="df-link" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=15/' + lat + '/' + lon + '">Open map ↗</a>';
    } else body += '<div class="df-map-empty">' + icon('pin') + '<b>Map unavailable</b><small>No valid coordinates in the latest permitted GPS record.</small></div>';
    return section('Vehicle location', 'Latest available GPS record · no live tracking claim', body);
  }
  const PROFILE = [['make', 'Make'], ['vehicle_model', 'Model'], ['model', 'Model year'], ['major_color', 'Colour'], ['fuel_type', 'Fuel'], ['fuel_capacity', 'Fuel capacity'], ['custom_capacitytons', 'Capacity (t)'], ['wheels', 'Wheels'], ['tyre_details', 'Tyre details'], ['chassis_no', 'Chassis no.'], ['csf_tz_engine_number', 'Engine no.'], ['registration_no', 'Registration no.'], ['owner_name', 'Owner'], ['insurance_company', 'Insurer'], ['policy_no', 'Policy no.'], ['battery_date', 'Battery fitted'], ['battery_warranty_date', 'Battery warranty to'], ['carbon_check_date', 'Last carbon check'], ['last_vehicle_passing', 'Last vehicle passing'], ['custom_nos_of_accident_occured', 'Accidents recorded'], ['custom_vehicle_remarks', 'Remarks']];
  function purchaseBlock(v, merged) {
    const A = S.assets, id = merged.custom_asset;
    if (!id) return '<div class="df-purchase"><span class="df-muted">No Asset is linked in the custom_asset field of the Vehicle record, so the purchase date is not shown.</span></div>';
    if (!A || A.state === 'loading' || A.state === 'idle') return '<div class="df-purchase"><span class="df-muted">Loading purchase date from the linked Asset…</span></div>';
    if (A.state === 'unavailable') return '<div class="df-purchase"><span class="df-muted">Asset list unavailable — purchase date not shown.</span></div>';
    const a = assetFor(merged);
    if (!a) return '<div class="df-purchase"><span class="df-muted">The linked Asset ' + esc(id) + ' was not found or is not readable with the current permissions.</span></div>';
    if (!a.purchase_date) return '<div class="df-purchase"><span class="df-muted">The linked Asset ' + esc(id) + ' has no purchase date.</span></div>';
    const bought = String(a.purchase_date).slice(0, 10), exp = merged.mvpi_date ? String(merged.mvpi_date).slice(0, 10) : '', total = exp ? days(exp, bought) : null, used = days(today(), bought), left = exp ? days(exp) : null;
    let bar = '<div class="df-pbar-note df-muted">MVPI / Fahas date not recorded, so no progress bar.</div>';
    if (total != null && total > 0 && used != null) { const pct = Math.max(0, Math.min(100, Math.round(100 * used / total))), tone = left < 0 ? 'bad' : left <= 30 ? 'warn' : 'ok';
      bar = '<div class="df-pbar ' + tone + '" role="img" aria-label="MVPI period used ' + pct + ' percent"><div class="df-pbar-track"><i style="width:' + pct + '%"></i></div><div class="df-pbar-meta"><span>Purchased ' + esc(bought) + '</span><b>' + (left < 0 ? 'MVPI expired ' + Math.abs(left) + ' d ago' : left + ' d to MVPI') + ' · ' + pct + '%</b><span>MVPI ' + esc(exp) + '</span></div></div>'; }
    return '<div class="df-purchase"><dl class="df-dl"><div><dt>Purchase date (Asset)</dt><dd>' + esc(bought) + '</dd></div><div><dt>Linked Asset</dt><dd>' + esc(id) + '</dd></div></dl>' + bar + '</div>';
  }
  function profilePanel(v) {
    const p = S.profile[v.name], merged = { ...v, ...(p?.doc || {}) }, shown = PROFILE.filter(([k]) => merged[k] != null && merged[k] !== '' && merged[k] !== 0);
    const tyres = (p?.doc?.tyre || []).filter(t => t.tyre_position || t.last_changed_date || t.odo_meter), cur = odometer(v);
    return section('Vehicle profile', p?.state === 'loading' ? 'Loading full Vehicle record…' : p?.state === 'unavailable' ? 'Full record unavailable — showing fields from the fleet list' : 'From the Vehicle record', purchaseBlock(v, merged) + '<dl class="df-dl">' + shown.map(([k, l]) => '<div><dt>' + esc(l) + '</dt><dd>' + esc(merged[k]) + '</dd></div>').join('') + '</dl>' + (shown.length ? '' : '<div class="df-empty">No profile fields recorded.</div>')
      + (tyres.length ? '<h4 class="df-sub">Tyre changes</h4>' + table([['Position', r => esc(r.tyre_position || '—')], ['Last changed', r => esc(r.last_changed_date || '—')], ['At odometer', r => fmt(r.odo_meter)], ['Since change', r => number(r.odo_meter) != null && cur != null && cur >= r.odo_meter ? fmt(cur - r.odo_meter) + ' km' : '—']], tyres) : ''), '<button class="df-btn ghost" data-doc="Vehicle" data-name="' + esc(v.name) + '">Edit in ERP ↗</button>');
  }
  function partsPanel(v) {
    const p = S.parts[v.name], cur = odometer(v);
    if (!p || p.state === 'loading') return section('Parts wear tracker', 'Vehicle Part Maintenance', skeleton(3));
    if (p.state !== 'complete') return section('Parts wear tracker', 'Vehicle Part Maintenance', '<div class="df-empty">' + (p.state === 'none' ? 'No part-maintenance record exists for this vehicle.' : 'Part-maintenance record unavailable with the current permissions.') + '</div>', '<button class="df-btn ghost" data-new="Vehicle Part Maintenance">+ Create record</button>');
    const systems = PART_TABLES.map(([f, label]) => { const m = new Map(); (p.doc[f] || []).forEach(r => { if (!r.part_name) return; const old = m.get(r.part_name); if (!old || String(r.date || '') > String(old.date || '') || (r.date === old.date && number(r.odometer_reading) > number(old.odometer_reading))) m.set(r.part_name, r); }); return { label, items: [...m.values()].map(r => ({ name: r.part_name, date: r.date, odo: number(r.odometer_reading), since: number(r.odometer_reading) != null && cur != null && cur >= r.odometer_reading ? cur - r.odometer_reading : null })).sort((a, b) => (b.since ?? -1) - (a.since ?? -1)) }; }).filter(s => s.items.length);
    const max = Math.max(1, ...systems.flatMap(s => s.items.map(i => i.since || 0)));
    return section('Parts wear tracker', 'Most recent replacement per part · km since = current odometer − odometer at replacement', systems.length ? '<div class="df-parts">' + systems.map(s => '<div class="df-part-system"><h4>' + esc(s.label) + '</h4><ul>' + s.items.map(i => '<li' + tip(i.name + '\nLast: ' + (i.date || 'date not set') + (i.odo != null ? '\nAt ' + fmt(i.odo) + ' km' : '')) + '><span>' + esc(i.name) + '</span><span class="df-bar-track"><i style="width:' + clamp(100 * (i.since || 0) / max, 0, 100) + '%"></i></span><b>' + (i.since == null ? '—' : fmt(i.since) + ' km') + '</b></li>').join('') + '</ul></div>').join('') + '</div>' : '<div class="df-empty">The record has no parts logged yet.</div>', '<button class="df-btn ghost" data-doc="Vehicle Part Maintenance" data-name="' + esc(p.doc.name) + '">Open record ↗</button>');
  }
  function timeline(v) {
    const ev = [];
    detailRows('maintenance').forEach(r => ev.push({ d: r.date, tone: ['Completed', 'Approved'].includes(r.status) ? 'good' : 'info', ic: 'tool', t: 'Maintenance · ' + (r.status || 'Scheduled'), s: [r.supplier, r.total_amount ? fmt(r.total_amount, 2) : ''].filter(Boolean).join(' · '), dt: 'Vehicle Maintenance Schedule', n: r.name }));
    detailRows('accidents').forEach(r => ev.push({ d: r.date, tone: 'bad', ic: 'alert', t: 'Accident', s: r.location || '', dt: 'Vehicle Accident', n: r.name }));
    detailRows('issues').forEach(r => ev.push({ d: r.report_datetime, tone: OPEN_ISSUE.includes(r.status) ? 'warn' : 'muted', ic: 'alert', t: 'Issue · ' + (r.issue_category || '') + ' (' + (r.status || '') + ')', s: r.severity || '', dt: 'Driver Vehicle Issue Request', n: r.name }));
    detailRows('history').forEach(r => ev.push({ d: r.date, tone: 'info', ic: 'file', t: 'Maintenance history entry', s: r.total_value ? fmt(r.total_value, 2) + ' recorded' : '', dt: 'Vehicle Maintenance History', n: r.name }));
    ev.sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')));
    return section('Activity timeline', 'Maintenance and history: all dates · issues: all dates · accidents: all dates', ev.length ? '<ol class="df-timeline">' + ev.slice(0, 14).map(e => '<li class="' + e.tone + '"><button data-doc="' + esc(e.dt) + '" data-name="' + esc(e.n) + '"><span class="df-tl-dot">' + icon(e.ic) + '</span><span><b>' + esc(e.t) + '</b><small>' + esc(String(e.d || '').slice(0, 16)) + (e.s ? ' · ' + esc(e.s) : '') + '</small></span></button></li>').join('') + '</ol>' : '<div class="df-empty">No events in the available records.</div>');
  }
  /* Every image on the Vehicle record, plus accident and issue photos for this vehicle. */
  function vehicleGallery(v) {
    const items = [], seen = new Set(), add = (url, label, group) => { const u = safeImage(url); if (u && !seen.has(u)) { seen.add(u); items.push({ u, label, group }); } };
    [['custom_attach_image', 'Main photo'], ['custom_attach', 'Attached photo'], ['front_side', 'Front'], ['rear_side', 'Rear'], ['left_side', 'Left'], ['right_side', 'Right'], ['battery_image', 'Battery']].forEach(([k, l]) => add(v[k], l, 'Vehicle'));
    (S.data.accidents?.rows || []).filter(r => r.vehicle_name === v.name).sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach(r => ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'].forEach((k, i) => add(r[k], 'Accident ' + fmtDMY(r.date) + ' · ' + (i + 1), 'Accidents')));
    detailRows('issues').forEach(r => add(r.photo, 'Issue ' + String(r.report_datetime || '').slice(0, 10) + ' · ' + (r.issue_category || ''), 'Issues'));
    const groups = ['Vehicle', 'Accidents', 'Issues'].map(g => [g, items.filter(i => i.group === g)]).filter(([, a]) => a.length);
    const pending = !complete('accidents') ? '<div class="df-note loading"><i class="df-spin" aria-hidden="true"></i>Accident photographs are still loading…</div>' : '';
    return section('Vehicle gallery', items.length + ' image' + (items.length === 1 ? '' : 's') + ' · vehicle record, accidents and issue reports · select a photo to open it in full size', pending + (groups.length ? groups.map(([g, a]) => '<h4 class="df-sub">' + esc(g) + ' · ' + a.length + '</h4><div class="df-gallery">' + a.map(i => '<a class="df-gal-item" href="' + esc(i.u) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(i.u) + '" alt="' + esc(i.label) + '"><span>' + esc(i.label) + '</span></a>').join('') + '</div>').join('') : '<div class="df-empty">No images are stored for this vehicle.</div>'));
  }
  function vehicleDetails() {
    const v = selectedVehicle(); if (!v) return '<div class="df-empty">Select a vehicle from Overview or Vehicles.</div>';
    const image = vehicleImage(v), dr = detailRows('daily'), fuelRows = detailRows('fuel'), rs = getReasons(v), ign = v.ignition ? 'On' : 'Off';
    const reasons = rs.length ? '<ul class="df-reasons">' + rs.filter(r => r.sev >= 1).map(r => '<li class="' + (r.sev >= 3 ? 'bad' : r.sev === 2 ? 'warn' : 'info') + '"><b>' + (r.sev >= 3 ? '▲' : r.sev === 2 ? '◆' : '•') + ' ' + esc(r.text) + '</b><span>' + esc(r.when) + '</span>' + (r.doc ? '<button class="df-link" data-doc="' + esc(r.doc[0]) + '" data-name="' + esc(r.doc[1]) + '">Open ↗</button>' : '') + '</li>').join('') + '</ul>' : '<div class="df-empty good">' + icon('check') + 'No open flags in the available records.</div>';
    const list = (S.data.vehicles.rows).slice().sort((a, b) => String(a.license_plate || a.name).localeCompare(String(b.license_plate || b.name), undefined, { numeric: true })), at = list.findIndex(x => x.name === v.name);
    const switcher = '<div class="df-switch" role="group" aria-label="Switch vehicle"><button class="df-btn ghost" data-vstep="-1" aria-label="Previous vehicle" ' + (at <= 0 ? 'disabled' : '') + '>‹</button><label>Vehicle<select data-vehicle-switch>' + list.map(x => '<option value="' + esc(x.name) + '"' + (x.name === v.name ? ' selected' : '') + '>' + esc((x.license_plate || x.name) + ' · ' + modelName(x)) + '</option>').join('') + '</select></label><button class="df-btn ghost" data-vstep="1" aria-label="Next vehicle" ' + (at >= list.length - 1 ? 'disabled' : '') + '>›</button><span>' + (at + 1) + ' of ' + list.length + '</span></div>';
    return switcher
      + '<div class="df-detail-hero ' + readiness(v) + '"><div class="df-hero-media">' + (image ? '<img src="' + esc(image) + '" alt="' + esc(v.license_plate) + '">' : '<span>' + icon('truck') + '</span>') + '</div><div class="df-hero-id"><div class="df-hero-plate">' + plate(v) + '</div><p>' + esc(modelLine(v)) + '</p><div class="df-hero-pills">' + readyPill(v) + pill('Ignition ' + ign + ' · stored', v.ignition ? 'info' : 'muted') + (forSale(v) ? pill('For sale', 'warn') : '') + (v.branch ? pill(v.branch, 'muted') : '') + '</div><small>' + esc(driver(v) ? 'Driver: ' + driver(v) : 'No driver assigned') + '</small><div class="df-hero-actions"><button class="df-btn" data-doc="Vehicle" data-name="' + esc(v.name) + '">ERP record ↗</button><button class="df-btn ghost" data-new="Driver Vehicle Issue Request">+ Report issue</button></div></div>'
      + '<div class="df-hero-gauges"><div><small>Odometer</small>' + drum(odometer(v), 'lg') + '</div><div><small>Oil service · ' + esc(oilBasis(v)) + '</small>' + oilGauge(v) + '</div></div></div>'
      + section('What needs attention', 'Computed from the exact fields and sources below', reasons)
      + '<div class="df-grid">' + locationPanel(v) + profilePanel(v) + '</div>'
      + partsPanel(v)
      + documents([v], false)
      + issueCards(v)
      + '<div class="df-grid">' + section('Trips & usage', 'Daily report records for this vehicle · selected period', dnote('daily') + table([['Date', r => docLink('Vehicle Daily Report', r.name, r.report_date)], ['Distance km', r => fmt(r.distance_km, 1)], ['Idle hours', r => number(r.idle_time) == null ? '—' : fmt(r.idle_time / 3600, 1)]], dr.slice().sort((a, b) => b.report_date.localeCompare(a.report_date)), 0, 'd-daily', 8)) + section('Fuel activity', 'Aldrees purchases · selected period', dnote('fuel') + table([['Date', r => docLink('Aldrees Fuel Usage', r.name, r.date)], ['Quantity', r => fmt(r.quantity, 1)], ['After VAT · source amount', r => fmt(r.after_vat, 2)]], fuelRows, 0, 'd-fuel', 8)) + '</div>'
      + timeline(v) + maintenanceHistory(v) + vehicleGallery(v);
  }

  /* ═════════════ Vehicle selling ═════════════
     Lists the Vehicle records ticked "For sale" (custom_for_sale). Estimated selling price = Vehicle.custom_estimated_selling_price (entered by hand).
     A row opens the normal vehicle workspace. No value or depreciation figures are shown here. */
  const forSale = v => v.custom_for_sale === true || Number(v.custom_for_sale) === 1;
  const sellEst = v => number(v.custom_estimated_selling_price);
  function selling() {
    const plateCmp = (a, b) => String(a.license_plate || a.name).localeCompare(String(b.license_plate || b.name), undefined, { numeric: true });
    const list = vehicles().filter(forSale).sort((a, b) => (sellEst(b) ?? -1) - (sellEst(a) ?? -1) || plateCmp(a, b)), priced = list.filter(v => sellEst(v) != null);
    const head = ['Vehicle', 'Model', 'Odometer', 'Branch', 'Driver', 'Readiness', 'Estimated selling price'], shown = slicePage('sell', list, 15);
    const tbl = list.length ? '<div class="df-table-wrap"><table><thead><tr>' + head.map((h, i) => '<th scope="col"' + (i === 2 || i === 6 ? ' class="num"' : '') + '>' + h + '</th>').join('') + '</tr></thead><tbody>' + shown.map(v => '<tr tabindex="0" role="link" aria-label="Open ' + esc(v.license_plate || v.name) + '" data-vrow="' + esc(v.name) + '"><td>' + plate(v) + '</td><td>' + esc(modelLine(v)) + '</td><td class="num">' + fmt(odometer(v)) + '</td><td>' + esc(v.branch || '—') + '</td><td>' + esc(driver(v) || '—') + '</td><td>' + readyPill(v) + '</td><td class="num sell-est">' + (sellEst(v) == null ? '<span class="df-muted">Not entered</span>' : '<b>' + fmt(sellEst(v)) + '</b>') + '</td></tr>').join('') + '</tbody></table></div>' + pager('sell', list.length, 15) : '<div class="df-empty">No vehicle is marked For sale. Tick the For sale checkbox on a Vehicle record and it will appear here.</div>';
    const csv = csvBtn('selling', ['Plate', 'Model', 'Odometer km', 'Branch', 'Driver', 'Estimated selling price'], list.map(v => [v.license_plate || v.name, modelLine(v), odometer(v) ?? '', v.branch || '', driver(v) || '', sellEst(v) ?? '']));
    return banner('amber', 'tag', 'Vehicle selling', 'Vehicles marked For sale on the Vehicle record · select a vehicle to open its details.')
      + strip([[list.length, 'Vehicles for sale'], [priced.length + ' / ' + list.length, 'With an estimated price'], [fmt(priced.reduce((n, v) => n + sellEst(v), 0)), 'Total estimated selling price'], [list.length - priced.length, 'Price not entered']])
      + section('Vehicles for sale', list.length + ' vehicles · highest estimated price first', tbl, csv);
  }

  /* ═════════════ Render ═════════════ */
  function activeFilterBar() {
    const parts = []; if (S.f.ready) parts.push('Readiness: ' + STATE[S.f.ready].label); const dq = DQ.find(d => d[0] === S.f.dq); if (dq) parts.push('Data gap: ' + dq[1]);
    return parts.length ? '<div class="df-activefilter"><span>Showing only · ' + esc(parts.join(' · ')) + '</span><button class="df-link" data-action="clear-chips">Clear</button></div>' : '';
  }
  function select(key, label, values) { return '<label>' + esc(label) + '<select data-filter="' + key + '"><option value="">All ' + esc(label.toLowerCase()) + '</option>' + [...new Set(values.filter(Boolean))].sort().map(v => '<option value="' + esc(v) + '"' + (S.f[key] === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></label>'; }
  function render() {
    if (disposed) return; RC.clear();
    const masters = S.data.vehicles?.rows || [], title = NAV.find(n => n[0] === S.tab)?.[1] || 'Overview', vs = vehicles(), waiting = Object.keys(S.pending).length + (S.oil.state === 'loading' ? 1 : 0);
    let h = '<div class="df-workspace">' + '<header class="df-header"><div><p>' + (S.busy ? 'Loading vehicles…' : (S.updated ? masters.length + ' vehicles · loaded ' + esc(S.updated) + (waiting ? ' · loading ' + waiting + ' more source' + (waiting === 1 ? '' : 's') + ' in the background' : '') : 'Not loaded')) + '</p></div><div class="df-hdr-btns"><button class="df-btn" data-action="lang" aria-label="Language">' + (S.lang === 'ar' ? 'English' : 'العربية') + '</button><button class="df-btn primary" data-action="refresh" ' + (S.busy ? 'disabled' : '') + '>' + icon('refresh') + (S.busy ? 'Loading…' : 'Refresh data') + '</button></div></header>';
    h += '<nav class="df-tabs" role="tablist" aria-label="Fleet dashboard sections">' + NAV.map(([id, label, ic]) => '<button role="tab" aria-selected="' + (id === S.tab) + '" data-tab="' + id + '" ' + (id === S.tab ? 'class="active"' : '') + ' ' + (id === 'details' && !S.selected ? 'disabled' : '') + '>' + icon(ic) + '<span>' + label + '</span></button>').join('') + '</nav>';
    h += '<div class="df-filters">' + select('branch', 'Branches', masters.map(v => v.branch)) + select('driver', 'Drivers', masters.map(driver)) + select('service', 'Service types', masters.map(v => v.vehicle_service_type)) + '<label>Activity from<input type="date" data-date="from" value="' + esc(S.f.from) + '" max="' + today() + '"></label><label>To<input type="date" data-date="to" value="' + esc(S.f.to) + '" max="' + today() + '"></label><button class="df-btn" data-action="apply" ' + (S.busy ? 'disabled' : '') + '>Apply dates</button><label class="df-search">Find vehicle<input type="search" data-search placeholder="Plate, driver or location" value="' + esc(S.f.search) + '"></label></div>';
    h += '<div class="df-scope"><span>' + pill('Shared fleet') + ' Current user permissions · ' + vs.length + ' matching vehicles · active vehicles only</span></div>' + activeFilterBar();
    if (S.busy) h += skeleton(6);
    else {
      h += S.notices.map(n => '<div class="df-note warn">' + esc(n) + '</div>').join('');
      const bad = Object.keys(SOURCES).filter(k => S.data[k] && S.data[k].state !== 'complete');
      if (bad.length) h += '<details class="df-source-status"><summary>' + bad.length + ' sources restricted, incomplete or unavailable</summary>' + bad.map(unavailable).join('') + '</details>';
      if (!S.data.vehicles || S.data.vehicles.state === 'unavailable') h += '<div class="df-empty">Vehicle data is unavailable. Check permissions and try Refresh data.</div>';
      else { const views = { overview, details: vehicleDetails, vehicles: vehiclesView, usage, maintenance, fuel, accidents, selling, documents: () => documents() }; h += '<main class="df-view" aria-label="' + esc(title) + '">' + (views[S.tab] || overview)() + '</main>'; }
    }
    h += '<footer class="df-footnote">Vehicle and expiry values are current snapshots. Activity uses the selected dates. Open issues, maintenance and repairs span all dates. Read-only dashboard.</footer></div><div class="df-tip" role="tooltip" hidden></div>';
    const keep = { y: window.scrollY }; host.innerHTML = h; void keep;
    host.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('span'), { className: 'df-image-error', textContent: 'Image unavailable' })); }, { once: true }));
    applyLang();
  }

  /* ═════════════ Events ═════════════ */
  const tipEl = () => host.querySelector('.df-tip');
  function showTip(ev) {
    const t = ev.target.closest?.('[data-tip]'), el = tipEl(); if (!el) return;
    if (!t || !host.contains(t)) { el.hidden = true; return; }
    el.innerHTML = esc(t.dataset.tip).replace(/\n/g, '<br>'); el.hidden = false;
    const hr = host.getBoundingClientRect(), x = ev.clientX - hr.left, y = ev.clientY - hr.top, w = el.offsetWidth;
    el.style.left = clamp(x + 14, 4, Math.max(4, hr.width - w - 4)) + 'px'; el.style.top = (y + 18) + 'px';
  }
  host.addEventListener('mousemove', showTip, { signal: controller.signal });
  host.addEventListener('mouseleave', () => { const el = tipEl(); if (el) el.hidden = true; }, { signal: controller.signal });
  host.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) { if (ev.target.closest('a')) return; const vr = ev.target.closest('[data-vrow]'); if (vr) { openVehicle(vr.dataset.vrow); return; } const row = ev.target.closest('[data-erp-row]'); if (row) frappe.set_route('Form', row.dataset.erpRow, row.dataset.name); return; }
    if (!host.contains(b)) return;
    const d = b.dataset;
    if (d.csv) { downloadCsv(d.csv); return; }
    if (d.vstep) { const l = (S.data.vehicles.rows).slice().sort((a, b) => String(a.license_plate || a.name).localeCompare(String(b.license_plate || b.name), undefined, { numeric: true })), n = l[l.findIndex(x => x.name === S.selected) + Number(d.vstep)]; if (n) openVehicle(n.name); return; }
    if (d.mix) { S.mix = d.mix; render(); return; }
    if (d.view) { S.view = d.view; S.page = 1; render(); return; }
    if (d.dq !== undefined) { S.f.dq = S.f.dq === d.dq ? '' : d.dq; S.f.ready = ''; S.tab = 'vehicles'; S.page = 1; render(); return; }
    if (d.ready !== undefined) { S.f.ready = (S.f.ready === d.ready && !d.tab) ? '' : d.ready; S.f.dq = ''; S.tab = 'vehicles'; S.page = 1; render(); return; }
    if (d.approved) S.maintApproved = true;
    if (d.tab) { S.tab = d.tab; S.page = 1; S.pg = {}; render(); if (!S.busy && S.data.vehicles) { enqueue(TAB_SOURCES[S.tab] || [], true); if (S.tab === 'fuel') { loadAldrees(generation); loadFuelLatest(generation); } } }
    else if (d.pg) { const y = window.scrollY; S.pg[d.pg] = Math.max(1, (S.pg[d.pg] || 1) + Number(d.dir)); render(); window.scrollTo?.(0, y); }
    else if (d.new) { const v = selectedVehicle(); if (v) frappe.new_doc(d.new, { vehicle: v.name }); }
    else if (d.vehicle) openVehicle(d.vehicle);
    else if (d.doc) frappe.set_route('Form', d.doc, d.name);
    else if (d.page) { S.page += Number(d.page); render(); }
    else if (d.action === 'queue-all') { S.queueAll = !S.queueAll; render(); }
    else if (d.action === 'clear-chips') { S.f.ready = ''; S.f.dq = ''; S.page = 1; render(); }
    else if (d.action === 'apply') { const from = host.querySelector('[data-date="from"]').value, to = host.querySelector('[data-date="to"]').value; if (!from || !to || from > to || to > today() || days(to, from) > 92) { frappe.msgprint('Choose a date range of up to 93 days, ending today or earlier.'); return; } S.f.from = from; S.f.to = to; load(); }
    else if (d.action === 'toggle-approved') { S.maintApproved = !S.maintApproved; S.pg.open = 1; render(); }
    else if (d.action === 'ald-retry') { S.ald = { state: 'idle' }; loadAldrees(generation); render(); }
    else if (d.action === 'refresh') load();
    else if (d.action === 'lang') { S.lang = S.lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('df-lang', S.lang); } catch (e) { /* optional */ } render(); }
  }, { signal: controller.signal });
  host.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('[data-vehicle-switch]')) { openVehicle(t.value); return; }
    if (t.matches('[data-lim-month]')) { S.limMonth = t.value; delete S.pg.limits; render(); return; }
    if (t.matches('[data-fuel-range]')) { S.fuelRange = t.value; delete S.data.fuel; delete S.pending.fuel; Object.values(S.vd).forEach(o => { delete o.fuel; }); S.pg = {}; RC.clear(); render(); enqueue(['fuel'], true); return; }
    if (t.matches('[data-acc-pair]')) { S.accPair = t.value; render(); return; }
    if (t.matches('[data-acc-month]')) { S.accMonth = t.value; S.pg.accmonth = 1; render(); return; }
    if (t.matches('[data-document-mode]')) { S.documentMode = t.value; ['doccards', 'd-doccards', 'docreg'].forEach(k => delete S.pg[k]); render(); return; }
    if (t.matches('[data-sort]')) { S.sort = t.value; S.page = 1; render(); return; }
    if (t.dataset.filter) { S.f[t.dataset.filter] = t.value; S.page = 1; S.pg = {}; render(); }
  }, { signal: controller.signal });
  host.addEventListener('input', ev => { if (!ev.target.matches('[data-search]')) return; const value = ev.target.value, caret = ev.target.selectionStart; clearTimeout(searchTimer); searchTimer = setTimeout(() => { S.f.search = value; S.page = 1; S.pg = {}; render(); const input = host.querySelector('[data-search]'); input?.focus(); if (input?.type === 'search') input.setSelectionRange(caret, caret); }, 250); }, { signal: controller.signal });
  host.addEventListener('keydown', ev => {
    if (!['Enter', ' '].includes(ev.key)) return;
    const vr = ev.target.closest('[data-vrow]'); if (vr && ev.target === vr) { ev.preventDefault(); openVehicle(vr.dataset.vrow); return; }
    const row = ev.target.closest('[data-erp-row]'); if (row && ev.target === row) { ev.preventDefault(); frappe.set_route('Form', row.dataset.erpRow, row.dataset.name); }
  }, { signal: controller.signal });
  const syncTheme = () => host.classList.toggle('df-dark', document.documentElement.getAttribute('data-theme') === 'dark');
  syncTheme();
  const themeObserver = new MutationObserver(syncTheme); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  controller.signal.addEventListener('abort', () => themeObserver.disconnect());
  load();
})();