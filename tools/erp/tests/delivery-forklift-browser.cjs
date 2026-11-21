/* Browser test + screenshot QA for "08. Operations & Logistics/Delivery & Forklift" (v3 on the DM kit).
   The block reads the unchanged Server Script API dm_delivery_forklift_dashboard. The mock returns a response in the server's
   exact shape, built by hand from 8 trips and 5 forklift records (see the comments): the aggregates agree with the rows, one
   timing pair and its field are unavailable (fail-closed null), and every review flag occurs at least once. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n), API = 'dm_delivery_forklift_dashboard';
const trip = (i, o) => Object.assign({ name: 'MAT-DT-2026-0000' + i, docstatus: 1, doc_status: 'Completed', delivery_status: 'Delivered', effective_date: d(-1), date_source: 'custom_delivery_date', company: 'DM Trading', trip_type: 'Delivery Note', driver: 'DRV-1', driver_name: 'Faisal Al-Harbi', vehicle: 'V-01', origin: 'Stores - DMT', destination: null, amount: 300, warehouse_wait_min: 20, travel_min: 90, site_wait_min: null, flags: [] }, o);
const fkl = (i, o) => Object.assign({ name: 'FKL-' + i, docstatus: 1, status: 'Active', date: d(-1), warehouse: 'Stores - DMT', forklift_no: 'FL-1', forklift_group: 'FL-1', driver: 'DRV-9', driver_name: 'Hassan', loading: 0, unloading: 0, operations: 0, flags: [], loading_trailer: 0, unloading_trailer: 0, loading_dayana: 0, unloading_dayana: 0, loading_container: 0, unloading_container: 0, loading_pickup: 0, unloading_pickup: 0 }, o);
function response() {
  const rows = [
    trip(1, { flags: ['missing destination'] }),
    trip(2, { destination: 'Yard - DMT' }),
    trip(3, { delivery_status: 'Partially Delivered', driver: null, driver_name: null, warehouse_wait_min: null, flags: ['missing driver', 'missing destination', 'warehouse wait reversed'] }),
    trip(4, { effective_date: d(-3), delivery_status: 'Not Delivered', amount: 200, travel_min: 1500, flags: ['missing destination', 'delivery date differs from departure date', 'travel over 24h'] }),
    trip(5, { effective_date: d(-3), driver: null, driver_name: null, vehicle: 'V-02', trip_type: null, origin: null, amount: 200, flags: ['missing driver', 'missing trip type', 'missing origin', 'missing destination'] }),
    trip(6, { effective_date: d(-3), date_source: 'departure_time (fallback)', delivery_status: null, vehicle: 'V-02', destination: 'Yard - DMT', amount: 200 }),
    trip(7, { docstatus: 0, doc_status: 'Draft', effective_date: d(-2), amount: 100, destination: 'Yard - DMT' }),
    trip(8, { docstatus: 0, doc_status: 'Draft', effective_date: d(-2), delivery_status: 'Not Delivered', amount: 100, destination: 'Yard - DMT' })];
  const frows = [
    fkl(1, { loading_trailer: 3, unloading_trailer: 1, loading: 3, unloading: 1, operations: 4, flags: ['repeated date/forklift - review'] }),
    fkl(2, { loading_trailer: 3, unloading_trailer: 1, loading: 3, unloading: 1, operations: 4, flags: ['repeated date/forklift - review'] }),
    fkl(3, { date: d(-2), warehouse: 'Yard - DMT', forklift_no: 'FL-2', forklift_group: 'FL-2', loading_dayana: 4, unloading_container: 4, loading: 4, unloading: 4, operations: 8, flags: ['Loading Pick Up negative (-2)'] }),
    fkl(4, { date: d(-2), warehouse: 'Yard - DMT', forklift_no: '', forklift_group: '(blank)', driver: null, driver_name: null, flags: ['missing forklift no', 'missing driver', 'no loading/unloading recorded'] }),
    fkl(5, { docstatus: 0, forklift_no: 'FL-2', forklift_group: 'FL-2', loading_trailer: 2, loading: 2, operations: 2 })];
  const by_field = { loading_trailer: 6, unloading_trailer: 2, loading_dayana: 4, unloading_dayana: 0, loading_container: 0, unloading_container: 4, loading_pickup: 0, unloading_pickup: 0 };
  return { version: 2, filters: {}, access: { delivery_trip: true, forklift: true, warehouse: true }, field_access: {}, generated_at: TODAY + ' 09:30:00', timezone: 'Asia/Riyadh', limitations: [],
    delivery: { available: true, label: 'Submitted records',
      /* submitted 1–6: delivered 1, 2, 5; partial 3; not delivered 4; no status 6; amount 300 × 3 + 200 × 3; trip 6 dated from departure; trip 4 dates differ */
      submitted: { trips: 6, delivered: 3, partially_delivered: 1, not_delivered: 1, no_status: 1, amount: 1500, fallback_date: 1, date_mismatch: 1 },
      draft: { trips: 2, delivered: 1, amount: 200, fallback_date: 0 },
      by_delivery_status: { Delivered: 3, 'Partially Delivered': 1, 'Not Delivered': 1, '(blank)': 1 },
      by_docstatus_and_delivery_status: { 'Submitted | Delivered': 3, 'Submitted | Partially Delivered': 1, 'Submitted | Not Delivered': 1, 'Submitted | (blank)': 1, 'Draft | Delivered': 1, 'Draft | Not Delivered': 1 },
      by_date: [{ date: d(-3), trips: 3, delivered: 1, amount: 600 }, { date: d(-1), trips: 3, delivered: 2, amount: 900 }],
      by_driver: [{ driver: '(no driver)', driver_name: '', trips: 2, delivered: 1, amount: 500 }, { driver: 'DRV-1', driver_name: 'Faisal Al-Harbi', trips: 4, delivered: 2, amount: 1000 }],
      by_vehicle: [{ vehicle: 'V-01', trips: 4, delivered: 2, amount: 1100 }, { vehicle: 'V-02', trips: 2, delivered: 1, amount: 400 }],
      by_origin: { 'Stores - DMT': 5, '(no origin)': 1 }, by_destination: { '(no destination)': 4, 'Yard - DMT': 2 }, by_warehouse_either: { 'Stores - DMT': 5, 'Yard - DMT': 2 }, by_trip_type: { 'Delivery Note': 5, '(blank)': 1 },
      timing: { warehouse_wait: { valid_pairs: 5, total_seconds: 6000, missing: 0, reversed: 1, over_24h: 0, avg_minutes: 20 }, travel: { valid_pairs: 6, total_seconds: 41400, missing: 0, reversed: 0, over_24h: 1, avg_minutes: 325 }, site_wait: null },
      driver_timing: null, attention: { missing_driver: 2, missing_trip_type: 1, missing_origin: 1, missing_destination: 4, reversed_timestamps: 1, over_24h: 1, date_mismatch: 1, draft_marked_delivered: 1 },
      unavailable_fields: { custom_driver__out_of_site: 'no read access at permlevel 1' }, row_count: 8, rows_truncated: false, rows },
    forklift: { available: true, label: 'Submitted records',
      /* submitted 1–4: loading 3 + 3 + 4, unloading 1 + 1 + 4; record 4 has no activity; draft 5 has 2 */
      submitted: { records: 4, loading: 10, unloading: 6, operations: 16, zero_activity: 1 }, draft: { records: 1, loading: 2, unloading: 0, operations: 2 },
      by_field: Object.keys(by_field).map(f => ({ field: f, label: f, value: by_field[f] })),
      by_date: [{ date: d(-2), loading: 4, unloading: 4, operations: 8, records: 2 }, { date: d(-1), loading: 6, unloading: 2, operations: 8, records: 2 }],
      by_forklift: [{ forklift: '(blank)', loading: 0, unloading: 0, operations: 0, records: 1 }, { forklift: 'FL-1', loading: 6, unloading: 2, operations: 8, records: 2 }, { forklift: 'FL-2', loading: 4, unloading: 4, operations: 8, records: 1 }],
      by_warehouse: [{ warehouse: 'Stores - DMT', loading: 6, unloading: 2, operations: 8, records: 2 }, { warehouse: 'Yard - DMT', loading: 4, unloading: 4, operations: 8, records: 2 }],
      by_driver: [{ driver: '(no driver)', loading: 0, unloading: 0, operations: 0, records: 1 }, { driver: 'DRV-9', driver_name: 'Hassan', loading: 10, unloading: 6, operations: 16, records: 3 }],
      undated: { label: 'Undated records', submitted: 1, draft: 1 },
      attention: { invalid_values: [{ name: 'FKL-3', field: 'loading_pickup', value: '-2', problem: 'negative' }], repeated_date_forklift: [{ key: d(-1) + ' | FL-1', records: ['FKL-1', 'FKL-2'] }], missing_driver: 1, missing_forklift_no: 1, zero_activity_submitted: 1 },
      unavailable_fields: {}, row_count: 5, rows_truncated: false, rows: frows } };
}
function quiet() {
  const r = response(); r.delivery.rows = r.delivery.rows.map(x => Object.assign(x, { flags: [] })).filter(x => x.docstatus === 1);
  Object.keys(r.delivery.attention).forEach(k => { r.delivery.attention[k] = 0; }); r.delivery.draft = { trips: 0, delivered: 0, amount: 0, fallback_date: 0 };
  r.forklift.rows = r.forklift.rows.filter(x => !x.flags.length); r.forklift.attention = { invalid_values: [], repeated_date_forklift: [], missing_driver: 0, missing_forklift_no: 0, zero_activity_submitted: 0 };
  return r;
}
const OPTS = { access: {}, field_access: {}, companies: ['DM Trading', 'DM Dubai'], warehouses: [{ name: 'Stores - DMT', company: 'DM Trading' }, { name: 'Yard - DMT', company: 'DM Trading' }, { name: 'Stores - DXB', company: 'DM Dubai' }],
  drivers: [{ name: 'DRV-1', label: 'Faisal Al-Harbi' }, { name: 'DRV-9', label: 'Hassan' }], vehicles: ['V-01', 'V-02'], forklifts: ['FL-1', 'FL-2'], trip_types: ['Delivery Note', 'Internal Transfer'] };
const build = () => ({ Company: [{ name: 'DM Trading', default_currency: 'SAR' }, { name: 'DM Dubai', default_currency: 'AED' }] });
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"] .dms-tb-r').first().innerText()).match(/([\d,]+) rows?\b/)[1].replace(/,/g, ''));
run({
  slug: 'delivery-forklift', folder: '08. Operations & Logistics/Delivery & Forklift', build,
  methods: { [API]: (a, db) => (a.action === 'options' ? OPTS : db.__quiet ? quiet() : response()) },
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5].map(i => t.kpiVal(i))), ['6', '3', '2', '16', '1,500SAR', '5 h 25 min']); H.ok('overview KPIs: submitted trips, delivered, partly or not delivered, forklift operations, recorded amount, average travel');
    H.assert.match(await t.$('.dms-ov-kpis').innerText(), /Submitted · 2 drafts apart[\s\S]*50% of submitted[\s\S]*1 with no delivery status[\s\S]*Loading 10 · unloading 6/); H.ok('drafts kept apart; trips with no delivery status stated');
    /* reversed 1 + drafts Delivered 1 + invalid 1 + no driver 2 + no activity 1 + no forklift no 1 + no origin 1 + no destination 4 + no type 1 + dates differ 1 + repeated 2 */
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '16'); H.ok('pending = 16 across the eleven review flags');
    const ban = await t.$('[data-ref="banner"]').innerText();
    H.assert.match(ban, /Some figures are unavailable[\s\S]*custom_driver__out_of_site/); H.assert.match(ban, /DM Dubai \(AED\)/); H.ok('unavailable field and the other-currency company are named');
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Warehouse activity[\s\S]*Stores - DMT\s*5\s*8[\s\S]*Yard - DMT\s*2\s*8/); H.ok('warehouse comparison joins trips (origin or destination) and forklift operations');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="delivery"]').click(); await t.idle();
    H.assert.deepEqual(await kpisIn(t), ['6', '3', '1', '1', '1', '2']); H.ok('delivery status breakdown and drafts');
    const dt = await t.$('[data-ref="content"]').innerText();
    H.assert.match(dt, /Warehouse waiting\s*20 min[\s\S]*Travel\s*5 h 25 min[\s\S]*1 over 24 h[\s\S]*Site waiting\s*Unavailable/); H.ok('timing averages; the unavailable pair shows Unavailable, not zero');
    H.assert.equal(await rowsIn(t, 't_dt'), 8); await t.$('[data-act="dq"][data-v="missing destination"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_dt'), 4);
    await t.$('[data-act="dq"][data-v="fallback"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_dt'), 1); H.ok('trip detail flag filters (all 8, missing destination 4, dated from departure 1)');
    await t.$('[data-act="tab"][data-v="forklift"]').click(); await t.idle();
    H.assert.deepEqual(await kpisIn(t), ['10', '6', '16', '4', '1', '2']); const fk = await t.$('[data-ref="content"]').innerText();
    H.assert.match(fk, /Repeated date and forklift[\s\S]*FKL-1[\s\S]*FKL-2/); H.assert.match(fk, /Trailer\s*8[\s\S]*Dayana\s*4[\s\S]*Container\s*4/); H.ok('forklift totals, vehicle-type breakdown, repeated date and forklift');
    await t.$('[data-act="fq"][data-v="invalid"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_fl'), 1); H.ok('forklift flag filter: invalid counts');
    await H.shot(t.page, 'state-forklift-flag-1440');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('DM Trading'); await t.$('[data-act="fapply"]').click(); await t.idle();
    const last = t.log.filter(x => x.method === API && x.a.action === 'data').pop(); H.assert.equal(last.a.company, 'DM Trading'); H.assert.equal(last.a.from_date, TODAY.slice(0, 8) + '01');
    H.assert.doesNotMatch(await t.$('[data-ref="banner"]').innerText(), /DM Dubai/); H.ok('company filter goes to the API; the currency note disappears');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  },
  quiet: () => Object.assign(build(), { __quiet: true })
});
