/* Browser test + screenshot QA for "08. Operations & Logistics/Logistics Dashboard" (v7, adapting v6 to the DM kit).
   Fixture: 19 Delivery Trips covering every v6 rule (completed with and without proof, partial, in transit with missing
   times, out-of-order times, drafts with and without driver or vehicle, a duplicate departure, a cancelled trip, one trip
   outside the loaded window), vehicles and drivers, Delivery Note counts, Vehicle Arabitra Logs fixes (fresh, old, none),
   purchase orders / requests / receipts in SAR and AED companies, and the Procurement Tracker report. OpenStreetMap tiles
   are served locally. Expected figures are worked out from the fixture by hand (see the comments), not by re-running
   the dashboard's rules. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const at = (n, hm) => add(TODAY, n) + ' ' + hm + ':00';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN89+7dfwAJOgPYiLLSzQAAAABJRU5ErkJggg==', 'base64');
let tileHits = 0;
const YES = { custom_receiver_name: 'Yes', custom_receiver_mob: 'Yes', custom_receiver_sign: 'Yes', custom_stamp: 'Yes' }, NOPROOF = { custom_receiver_name: 'No', custom_receiver_mob: '', custom_receiver_sign: 'No', custom_stamp: '' };
const DRV = { 'DRV-1': 'Faisal Al-Harbi', 'DRV-2': 'Omar Siddiqui', 'DRV-3': 'Rakesh Kumar', 'DRV-4': 'Imran Baig', 'DRV-5': 'Sami Haddad' };
function trip(i, o) {
  const name = 'MAT-DT-2026-' + String(i).padStart(5, '0'), d = o.d;
  const full = o.times === 'full' ? { custom_driver_reporting_time__at_warehouse: at(d, '06:00'), departure_time: at(d, '06:30'), custom_delivered_time: at(d, '08:00'), custom_driver__out_of_site: at(d, '08:40') } : {};
  const r = Object.assign({ name, docstatus: 1, status: 'Completed', company: 'DM Group KSA', driver: 'DRV-1', vehicle: 'V-01', delivery_status: 'Delivered', modified: TODAY, custom_trip_type_: 'Delivery Note', custom_delivery_date: add(TODAY, d), custom_source_warehouse: 'Stores - DMG', custom_delivery_to_warehouse: '', custom_signed_delivery_note: '' }, YES, full, o.x || {});
  r.driver_name = r.driver ? DRV[r.driver] : ''; return r;
}
function build() {
  const db = { Company: [{ name: 'DM Group KSA', default_currency: 'SAR' }, { name: 'DM Steel', default_currency: 'SAR' }, { name: 'DM Dubai', default_currency: 'AED' }],
    'Delivery Trip': [], 'Delivery Stop': [], Vehicle: [], Driver: [], 'Delivery Note': [], 'Vehicle Arabitra Logs': [], 'Purchase Order': [], 'Material Request': [], 'Purchase Receipt': [] };
  const T = db['Delivery Trip'];
  T.push(trip(1, { d: -2, times: 'full' }));                                                                   // done, proof
  T.push(trip(2, { d: -1, times: 'full', x: NOPROOF }));                                                       // done, no proof → follow-up
  T.push(trip(3, { d: -3, x: { status: 'In Transit', delivery_status: 'Partially Delivered', vehicle: 'V-03', driver: 'DRV-2', custom_driver_reporting_time__at_warehouse: at(-3, '06:00'), departure_time: at(-3, '06:30'), custom_delivered_time: at(-3, '08:00') } })); // partial → follow-up
  T.push(trip(4, { d: 0, x: Object.assign({ status: 'In Transit', delivery_status: 'Not Delivered', vehicle: 'V-02', driver: 'DRV-3', custom_driver_reporting_time__at_warehouse: at(0, '07:30'), departure_time: at(0, '08:00') }, NOPROOF) })); // on the road, no arrival → time error + follow-up
  T.push(trip(5, { d: 1, x: Object.assign({ docstatus: 0, status: 'Draft', delivery_status: 'Not Delivered', vehicle: 'V-03', driver: 'DRV-2', departure_time: at(1, '08:00') }, NOPROOF) })); // draft, upcoming
  T.push(trip(6, { d: 2, x: Object.assign({ docstatus: 0, status: 'Draft', delivery_status: 'Not Delivered', vehicle: 'V-06', driver: '' }, NOPROOF) })); // draft, no driver
  T.push(trip(7, { d: 3, x: Object.assign({ docstatus: 0, status: 'Draft', delivery_status: 'Not Delivered', vehicle: '', driver: 'DRV-4' }, NOPROOF) })); // draft, no vehicle
  T.push(trip(8, { d: -4, x: { custom_trip_type_: 'Internal Transfer', delivery_status: '', vehicle: 'V-03', driver: 'DRV-2', custom_delivery_to_warehouse: 'Yard - DMG', custom_driver_reporting_time__at_warehouse: at(-4, '06:00'), departure_time: at(-4, '07:00'), custom_delivered_time: at(-4, '06:30'), custom_driver__out_of_site: at(-4, '08:00') } })); // arrival before departure → time error
  T.push(trip(9, { d: 0, times: 'full', x: { docstatus: 2, status: 'Cancelled' } }));                         // cancelled: ignored
  T.push(trip(10, { d: -20, times: 'full' }));                                                                 // outside the range, inside the live window
  T.push(trip(11, { d: -25, x: Object.assign({ status: 'In Transit', delivery_status: 'Not Delivered', vehicle: 'V-07', custom_driver_reporting_time__at_warehouse: at(-25, '06:00'), departure_time: at(-25, '06:30'), custom_delivered_time: at(-25, '08:00') }, NOPROOF) })); // follow-up, actions only
  T.push(trip(12, { d: -60, x: { docstatus: 0, status: 'Draft' } }));                                         // outside the loaded window
  T.push(trip(13, { d: 1, x: Object.assign({ docstatus: 0, status: 'Draft', delivery_status: 'Not Delivered', vehicle: 'V-04', driver: 'DRV-4', departure_time: at(1, '09:00') }, NOPROOF) })); // duplicate departure …
  T.push(trip(14, { d: 1, x: Object.assign({ docstatus: 0, status: 'Draft', delivery_status: 'Not Delivered', vehicle: 'V-04', driver: 'DRV-5', departure_time: at(1, '09:00') }, NOPROOF) })); // … same vehicle and time
  T.push(trip(15, { d: -1, times: 'full', x: Object.assign({ company: 'DM Steel', custom_trip_type_: 'Materials Collection from Supplier', delivery_status: '', vehicle: 'V-02', driver: 'DRV-3', custom_source_warehouse: 'Stores - DMS' }, NOPROOF) }));
  T.push(trip(16, { d: 5, x: Object.assign({ status: 'Scheduled', delivery_status: 'Not Delivered', vehicle: 'V-07', driver: 'DRV-5', departure_time: at(5, '08:00') }, NOPROOF) })); // scheduled, not executed
  T.push(trip(17, { d: -2, times: 'full', x: { company: 'DM Dubai', vehicle: 'V-06', driver: 'DRV-4' } }));
  T.push(trip(18, { d: -1, times: 'full', x: { vehicle: 'V-05', driver: 'DRV-5', custom_driver__out_of_site: null } }));       // site exit missing (not a time error)
  T.push(trip(19, { d: 0, x: { vehicle: 'V-05', custom_driver_reporting_time__at_warehouse: at(0, '06:00'), departure_time: at(0, '06:20'), custom_delivered_time: at(0, '07:30'), custom_driver__out_of_site: at(0, '08:30') } })); // finished today
  db['Delivery Stop'].push({ name: 'DS-1', parent: T[3].name, parenttype: 'Delivery Trip', customer: 'Najd Builders', address: 'Exit 18, Riyadh', delivery_note: 'MAT-DN-2026-00041' });
  for (let i = 1; i <= 9; i++) { db.Vehicle.push({ name: 'V-0' + i, license_plate: 'DMG ' + (1000 + i), custom_vehicle_status: i === 8 ? 'Sold' : 'Active', vehicle_service_type: i === 6 ? 'Administration' : 'Goods Carriage Vehicle' }); }
  Object.keys(DRV).forEach((k, i) => db.Driver.push({ name: k, full_name: DRV[k], status: 'Active', employee: i === 4 ? '' : 'HR-EMP-' + i }));
  db.Driver.push({ name: 'DRV-6', full_name: 'Left driver', status: 'Left', employee: 'HR-EMP-9' });
  [['DM Vehicle', 0, 1, 'To Bill'], ['DM Vehicle', -2, 1, 'Completed'], ['DM Vehicle', -5, 1, 'To Bill'], ['Customer Pickup', -1, 1, 'Completed'], ['Rented Vehicle', 3, 1, 'Completed'], ['DM Vehicle', -40, 1, 'Completed'], ['DM Vehicle', 0, 0, 'Draft'], ['', 1, 0, 'Draft']]
    .forEach((x, i) => db['Delivery Note'].push({ name: 'MAT-DN-2026-000' + (40 + i), custom_delivery_by: x[0], posting_date: add(TODAY, x[1]), docstatus: x[2], status: x[3] }));
  const L = db['Vehicle Arabitra Logs'], log = (v, t, lat, lng, speed, ign, place) => L.push({ name: 'VAL-' + (L.length + 1), vehicle: v, track_date_time: t, latitude: lat, longitude: lng, speed, ignition: ign, location: place, distance: 0 });
  log('V-02', at(0, '09:25'), 24.7136, 46.6753, 62, 1, 'King Fahd Rd, Riyadh'); log('V-02', at(0, '09:20'), 24.7010, 46.6810, 55, 1, 'Olaya St, Riyadh'); log('V-02', at(0, '09:15'), 24.6900, 46.6900, 40, 1, 'Olaya St, Riyadh');
  log('V-03', at(0, '09:28'), 24.6500, 46.7100, 0, 0, 'Stores yard, Riyadh'); log('V-05', at(0, '08:40'), 24.8000, 46.6200, 0, 0, 'North depot, Riyadh'); log('V-06', at(-1, '17:00'), 21.5400, 39.1700, 0, 0, 'Jeddah office');
  log('V-01', at(0, '09:20'), 0, 0, 0, 0, 'invalid fix'); // 0,0 is rejected: V-01 counts as having no fix
  const PO = db['Purchase Order'], po = (i, o) => PO.push(Object.assign({ name: 'PUR-ORD-2026-000' + String(i).padStart(2, '0'), docstatus: 1, status: 'To Receive and Bill', company: 'DM Group KSA', supplier: 'SUP-' + (i % 3), supplier_name: ['Riyadh Steel Co', 'Gulf Fasteners', 'Hamburg Machines GmbH'][i % 3], transaction_date: add(TODAY, -40), schedule_date: add(TODAY, 10), per_received: 0, per_billed: 0, base_grand_total: 10000, currency: 'SAR', custom_purchaser_name: ['Ahmed', 'Noura'][i % 2], custom_supplier_type: 'Local', custom_delivery_location: 'Stores - DMG' }, o));
  po(1, { schedule_date: add(TODAY, -10), base_grand_total: 100000 });                       // past due, nothing received (urgent)
  po(2, { schedule_date: add(TODAY, -45), base_grand_total: 50000 });                        // stale
  po(3, { schedule_date: add(TODAY, 3), base_grand_total: 30000 });                          // due in 7 days
  po(4, { schedule_date: add(TODAY, 20), custom_estimated_arrival_time: add(TODAY, 18), custom_shipment_status: 'Shipment Delayed', custom_supplier_type: 'Foreign', base_grand_total: 80000 }); // delayed (urgent)
  po(5, { status: 'To Receive', custom_shipment_status: 'In Transit', custom_supplier_type: 'Foreign', base_grand_total: 120000 }); // ETA missing, documents not received
  po(6, { schedule_date: add(TODAY, 5), per_received: 20, per_billed: 60, base_grand_total: 40000 }); // billed ahead, due in 7 days
  po(7, { schedule_date: add(TODAY, 30), custom_price_verification: 'Not Matching', base_grand_total: 25000 }); // mismatch (urgent)
  po(8, { docstatus: 0, status: 'Draft', base_grand_total: 9000 });                           // awaiting approval
  po(9, { company: 'DM Dubai', currency: 'AED', schedule_date: add(TODAY, -5), base_grand_total: 70000 }); // past due (urgent), AED
  po(10, { status: 'Completed', per_received: 100 });                                         // not loaded
  po(11, { status: 'On Hold', schedule_date: add(TODAY, 15), base_grand_total: 15000 });
  po(12, { schedule_date: add(TODAY, 2), custom_shipment_status: 'Delivered', base_grand_total: 60000 }); // arrived, receipt not posted (urgent), due in 7 days
  const MR = db['Material Request'], mr = (i, o) => MR.push(Object.assign({ name: 'MAT-MR-2026-000' + i, docstatus: 1, status: 'Pending', company: 'DM Group KSA', material_request_type: 'Purchase', transaction_date: add(TODAY, -2), schedule_date: add(TODAY, 10), per_ordered: 0, per_received: 0, custom_priority: 'Medium', custom_purchase_type: 'Local', custom_purpose_of_purchase: 'Site consumables ' + i }, o));
  mr(1, { transaction_date: add(TODAY, -10), schedule_date: add(TODAY, -3) });                // past required date (urgent)
  mr(2, { transaction_date: add(TODAY, -1), custom_priority: 'High' });                        // high, no PO (urgent)
  mr(3, { transaction_date: add(TODAY, -12), schedule_date: add(TODAY, 20), custom_priority: 'Low' }); // no PO after 7 days
  mr(4, { status: 'Partially Ordered', per_ordered: 50, custom_purchase_type: 'Import' });
  mr(5, { status: 'Ordered', per_ordered: 100 }); mr(6, { material_request_type: 'Material Transfer' }); // not loaded
  const PR = db['Purchase Receipt'], pr = (i, o) => PR.push(Object.assign({ name: 'MAT-PRE-2026-000' + i, docstatus: 1, status: 'To Bill', company: 'DM Group KSA', supplier: 'SUP-1', supplier_name: 'Gulf Fasteners', posting_date: add(TODAY, -2), posting_time: '10:15:00', per_billed: 0, is_return: 0, base_grand_total: 12000, custom_purchaser_name: 'Noura' }, o));
  pr(1, {}); pr(2, { status: 'Completed', per_billed: 100, posting_date: add(TODAY, -5) }); pr(3, { status: 'Partly Billed', per_billed: 40, posting_date: add(TODAY, -10) }); pr(4, { status: 'Return Issued', is_return: 1, posting_date: add(TODAY, -3) }); pr(5, { posting_date: add(TODAY, -40) });
  return db;
}
/* Procurement Tracker report (array rows + columns, as query_report.run returns them).
   Ordered: A 2 days (first PO of two), B 0, C 10, D 1 → median 1.5, 3 of 4 within 3 days; E waiting 10 days; F cancelled. */
const REPORT = { columns: ['material_request_no', 'material_request_date', 'status', 'cost_center', 'purchase_order_date'].map(f => ({ fieldname: f })), result: [
  ['MR-A', add(TODAY, -20), 'Ordered', 'Main - DMG', add(TODAY, -17)], ['MR-A', add(TODAY, -20), 'Ordered', 'Main - DMG', add(TODAY, -18)], ['MR-B', add(TODAY, -15), 'Ordered', 'Main - DMG', add(TODAY, -15)],
  ['MR-C', add(TODAY, -30), 'Ordered', 'Projects - DMG', add(TODAY, -20)], ['MR-D', add(TODAY, -25), 'Ordered', 'Projects - DMG', add(TODAY, -24)], ['MR-E', add(TODAY, -10), 'Pending', 'Main - DMG', ''], ['MR-F', add(TODAY, -9), 'Cancelled', 'Main - DMG', ''], []] };
const methods = {
  'frappe.desk.query_report.run': () => REPORT,
  'frappe.client.get': (a, db) => { const r = db[a.doctype].find(x => x.name === a.name); return Object.assign({}, r, { delivery_stops: db['Delivery Stop'].filter(s => s.parent === a.name) }); }
};
const routes = [['https://tile.openstreetmap.org/**', r => { tileHits++; return r.fulfill({ contentType: 'image/png', body: PNG }); }]];
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"] .dms-tb-r').first().innerText()).match(/([\d,]+) rows?\b/)[1].replace(/,/g, ''));
run({
  slug: 'logistics', folder: '08. Operations & Logistics/Logistics Dashboard', build, methods, routes,
  figures: async (t, H) => {
    /* range = today−7 … today+7 by delivery date. In range and not cancelled: trips 1–8, 13–19 = 15 (10 submitted).
       Drafts in the loaded window: 5, 6, 7, 13, 14. Follow-up in range: 2 (no proof), 3 (partial), 4 (not delivered).
       Time errors: 4 (no arrival), 8 (arrival before departure). Missing driver or vehicle: 6, 7. Open POs: 1–7, 9, 11, 12. */
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5].map(i => t.kpiVal(i))), ['15', '5', '3', '2', '2', '10']); H.ok('overview KPIs: trips, drafts, follow-up, time errors, missing assignment, open POs');
    /* actions: assign 2 + time 2 + follow-up 4 (adds trip 11, 25 days back) + drafts 5 + urgent POs 5 (1, 4, 7, 9, 12) + requests 2 (MR 1, 2) + stale 1 (PO 2) */
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '21'); H.ok('pending = 21 across the seven categories');
    const ov = await t.$('[data-ref="content"]').innerText();
    H.assert.match(ov, /Possible duplicates\s*1/); H.assert.match(ov, /Delivery notes · DM vehicle\s*3[\s\S]*Customer pickup\s*1[\s\S]*Rented vehicle\s*1[\s\S]*DN drafts\s*2/); H.assert.match(ov, /Active drivers\s*5[\s\S]*Drivers with no employee\s*1/);
    H.ok('duplicate departure found; Delivery Note and Driver counts (the −40-day note and the left driver are excluded)');
  },
  interactions: async (t, H) => {
    await t.$('.dms-kpi[data-v="tq:time"]').click(); await t.idle();
    H.assert.equal(await t.$('#dms-tab-trips').getAttribute('aria-selected'), 'true'); H.assert.equal(await rowsIn(t, 't_trips'), 2); H.ok('time-errors card opens the Trips queue (2 rows)');
    await t.$('[data-tbl="t_trips"] [data-act="kpi"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const m = await t.$('.dms-modal').innerText();
    H.assert.match(m, /MAT-DT-2026-00008/); H.assert.match(m, /To review[\s\S]*Review timestamp order[\s\S]*Recorded journey[\s\S]*Delivery stops/); H.ok('trip detail (frappe.client.get): out-of-order trip first, with review list and journey');
    await H.shot(t.page, 'state-trip-1440', { fullPage: false }); await t.page.keyboard.press('Escape');
    await t.$('[data-act="tq"][data-v="planned"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_trips'), 5); H.assert.match(await t.$('[data-ref="content"]').innerText(), /MAT-DT-2026-00013 ↗ & MAT-DT-2026-00014 ↗ · [\d-]+ 09:00 · Vehicle DMG 1004/); H.ok('awaiting-submission queue lists 5 drafts and the duplicate pair');

    await t.$('[data-act="tab"][data-v="map"]').click(); await t.idle(); await t.page.waitForTimeout(200);
    /* active vehicles 1–7 and 9 (8 is sold). Fixes: 2, 3, 5, 6 (1 has a 0,0 fix, rejected). On the road: 2 (trip 4).
       Upcoming: 3 (trip 5), 4 (13/14), 6 (trip 6), 7 (trip 16). Finished today: 5 (trip 19). No recent signal: 1, 4, 5 (50 min), 6, 7, 9. */
    H.assert.deepEqual(await kpisIn(t), ['4', '1', '4', '1', '6']); H.ok('live map KPIs: tracked, on the road, upcoming, finished today, no recent signal');
    H.assert.equal(await t.$('.lg-pin').count(), 4); H.assert.ok(tileHits > 0 && await t.$('.lg-tile').count() > 0); H.ok('4 pins on the tile map (tiles served locally)');
    const z0 = +(await t.$('.lg-tile').first().getAttribute('src')).split('/')[3];
    await t.$('[data-act="map"][data-v="in"]').click(); H.assert.equal(+(await t.$('.lg-tile').first().getAttribute('src')).split('/')[3], z0 + 1); H.ok('zoom in redraws tiles one level closer');
    await t.$('[data-tbl="t_live"] [data-act="pin"][data-v="V-02|1"]').click(); await t.idle();
    const card = await t.$('[data-ref="content"]').innerText(); H.assert.match(card, /Selected vehicle[\s\S]*DMG 1002[\s\S]*MAT-DT-2026-00004[\s\S]*King Fahd Rd, Riyadh[\s\S]*62 km\/h/); H.ok('selecting a vehicle shows its trip, place and speed');
    await H.shot(t.page, 'state-map-selected-1440');
    await t.$('[data-act="chip"][data-v="nosignal"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_live'), 6); H.ok('no-signal chip filters the vehicle list (6)');
    await t.$('[data-act="chip"][data-v="all"]').click(); await t.idle();

    await t.$('[data-act="tab"][data-v="fleet"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Idle\s*1[\s\S]*DMG 1009/); H.ok('utilisation lists the one idle goods vehicle');

    await t.$('[data-act="tab"][data-v="proc"]').click(); await t.idle();
    /* open 10; due in 7 days: 3, 6, 12; past due ≤30 days: 1, 9; stale: 2; receipts to bill: 1, 3; requests: MR 1–4 */
    H.assert.deepEqual(await kpisIn(t), ['10', '3', '2', '1', '2', '4']); H.ok('procurement KPIs: open, due in 7 days, past due, stale, waiting to bill, requests');
    const pc = await t.$('[data-ref="content"]').innerText();
    /* SAR open value = 100+50+30+80+120+40+25+15+60 K (PO 9 is AED); past due SAR = PO 1 */
    H.assert.match(pc, /Open order value\s*520\.0K SAR[\s\S]*Past due value\s*100\.0K SAR/); H.assert.match(await t.$('[data-ref="banner"]').innerText(), /DM Dubai \(AED\)/); H.ok('order values in SAR only; the AED company is named in the banner');
    await t.$('[data-act="psub"][data-v="requests"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Median days\s*1\.5[\s\S]*Ordered in 3 days\s*75%[\s\S]*Waiting over 7 days\s*1/); H.ok('request-to-order time from the Procurement Tracker report (median 1.5, 75% in 3 days)');
    await H.shot(t.page, 'state-proc-requests-1440');
    await t.$('[data-act="psub"][data-v="overview"]').click(); await t.idle();

    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('DM Steel'); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(await t.kpiVal(0), '1'); H.assert.equal(await t.kpiVal(5), '0'); H.ok('company filter: DM Steel has one trip and no open orders');
    await t.$('.dms-chip-x').first().click(); await t.idle(); H.assert.equal(await t.kpiVal(0), '15');
  },
  quiet: () => {
    const db = build();
    db['Delivery Trip'] = db['Delivery Trip'].filter(r => [1, 10, 17].includes(+r.name.slice(-5)));
    db['Purchase Order'] = []; db['Material Request'] = []; db['Purchase Receipt'] = [];
    return db;
  }
});
