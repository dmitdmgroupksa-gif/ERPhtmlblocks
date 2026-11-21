/* Browser test + screenshot QA for "08. Operations & Logistics/Operation Dashboard" (v5, adapting v4 to the DM kit).
   Fixture: three companies (the v4 default company and DM Steel in SAR, DM Dubai in AED) with delivery notes (one on a trip
   stop, returns and drafts), trips, forklift logs, open / stopped material requests and their items, work orders, job cards,
   production updates and daily production rows, targets, bins, stock entries and receipts. The view opens on the v4 default
   company, as v4 did. Expected figures are worked out from the fixture by hand (see the comments). */
const { run, TODAY, add } = require('./dms-harness.cjs');
const DMT = 'Durar Masagh Trading Company', at = (n, hm) => add(TODAY, n) + ' ' + hm + ':00';
function build() {
  const db = { Company: [{ name: DMT, default_currency: 'SAR' }, { name: 'DM Steel', default_currency: 'SAR' }, { name: 'DM Dubai', default_currency: 'AED' }],
    Warehouse: [{ name: 'Stores - DMT', company: DMT, is_group: 0 }, { name: 'Yard - DMT', company: DMT, is_group: 0 }, { name: 'All - DMT', company: DMT, is_group: 1 }, { name: 'Stores - DMS', company: 'DM Steel', is_group: 0 }, { name: 'Stores - DXB', company: 'DM Dubai', is_group: 0 }],
    'Delivery Note': [], 'Delivery Stop': [], 'Delivery Trip': [], ForkLift: [], 'Forklift list': [], 'Material Request': [], 'Material Request Item': [], 'Work Order': [], 'Job Card': [],
    'Daily Production Update': [], 'Daily Production Table': [], 'Manufacturing Production Target': [], Bin: [], 'Stock Entry': [], 'Purchase Receipt': [] };
  const dn = (i, d, o) => db['Delivery Note'].push(Object.assign({ name: 'MAT-DN-2026-000' + String(i).padStart(2, '0'), docstatus: 1, is_return: 0, company: DMT, posting_date: add(TODAY, d), posting_time: '09:00:00', customer: 'CUST-' + (i % 3), customer_name: ['Najd Builders', 'Al Rajhi Towers', 'Red Sea Marine'][i % 3], custom_delivery_by: 'DM Vehicle', delivery_mode: 'Truck', total_net_weight: 1000, location: ['Riyadh', 'Jeddah'][i % 2], custom_sales_person: ['Ali', 'Sara'][i % 2], base_grand_total: 1000, status: 'Completed', set_warehouse: 'Stores - DMT' }, o));
  dn(1, 0, { posting_time: '08:15:00', total_net_weight: 5000, base_grand_total: 10000, status: 'To Bill' });            // no trip, 1 h old
  dn(2, 0, { posting_time: '07:30:00', custom_delivery_by: 'Customer Pickup', total_net_weight: 2000, base_grand_total: 4000 }); // pickup never needs a trip
  dn(3, -1, { posting_time: '14:00:00', custom_delivery_by: 'Rented Vehicle', total_net_weight: 3000, base_grand_total: 6000, status: 'To Bill' }); // no trip, 19 h old
  dn(4, -3, { total_net_weight: 4000, base_grand_total: 8000 });                                                       // on trip T3's stop
  dn(5, -10, { base_grand_total: 2000 });                                                                              // no trip, over 24 h
  dn(6, -20, { total_net_weight: 6000 });                                                                              // previous period
  dn(7, 0, { is_return: 1 });                                                                                          // return: ignored
  dn(8, -2, { company: 'DM Steel', total_net_weight: 2500, base_grand_total: 5000, set_warehouse: 'Stores - DMS' });
  dn(9, -2, { company: 'DM Dubai', total_net_weight: 3000, base_grand_total: 9000, set_warehouse: 'Stores - DXB' });
  dn(10, -5, { docstatus: 0, status: 'Draft' }); dn(11, 0, { docstatus: 0, status: 'Draft' });                       // drafts (10 is from a past day)
  db['Delivery Stop'].push({ name: 'DS-1', parent: 'MAT-DT-2026-00003', parenttype: 'Delivery Trip', delivery_note: 'MAT-DN-2026-00004' });
  const tp = (i, d, o) => db['Delivery Trip'].push(Object.assign({ name: 'MAT-DT-2026-0000' + i, docstatus: 1, company: DMT, custom_trip_type_: 'Delivery Note', custom_delivery_date: add(TODAY, d), driver_name: 'Faisal Al-Harbi', vehicle: 'V-01', status: 'Completed', delivery_status: 'Delivered', custom_source_warehouse: 'Stores - DMT', custom_delivery_to_warehouse: '', custom_total_amount_earned: 0 }, o));
  tp(1, 0, { custom_total_amount_earned: 300, custom_driver_reporting_time__at_warehouse: at(0, '06:00'), departure_time: at(0, '06:30'), custom_delivered_time: at(0, '07:30'), custom_driver__out_of_site: at(0, '08:00') });
  tp(2, 0, { custom_trip_type_: 'Internal Transfer', status: 'In Transit', delivery_status: 'Not Delivered', driver_name: 'Omar Siddiqui', vehicle: 'V-02', custom_total_amount_earned: 100, custom_delivery_to_warehouse: 'Yard - DMT' });
  tp(3, -3, { custom_total_amount_earned: 200, custom_driver_reporting_time__at_warehouse: at(-3, '07:00'), departure_time: at(-3, '07:20'), custom_delivered_time: at(-3, '09:00'), custom_driver__out_of_site: at(-3, '09:40') });
  tp(4, -5, { status: 'Scheduled', delivery_status: 'Not Delivered', driver_name: 'Omar Siddiqui', vehicle: 'V-02' });   // never completed
  tp(5, -6, { docstatus: 0, status: 'Draft', delivery_status: 'Not Delivered', driver_name: 'Imran Baig', vehicle: 'V-03' }); // old draft
  tp(6, -1, { driver_name: 'Omar Siddiqui', vehicle: 'V-02', custom_total_amount_earned: 150 });
  tp(7, -20, { custom_total_amount_earned: 500 });                                                                    // previous period
  tp(8, -2, { company: 'DM Steel', custom_total_amount_earned: 400, custom_source_warehouse: 'Stores - DMS' });
  tp(9, 0, { docstatus: 2, status: 'Cancelled' });
  const fk = (i, d, o) => db.ForkLift.push(Object.assign({ name: 'FKL-' + i, docstatus: 1, date: add(TODAY, d), warehouse: 'Stores - DMT', forklift_no: 'FL-1', driver_name: 'Hassan', status: 'Active', setting: '' }, o));
  fk(1, -3, { loading_trailer: 3, unloading_pickup: 2, trailer_expense: 100, trailer_cleaning: 1, setting: 'Inside Store Setting' });
  fk(2, -1, { status: 'Workshop', loading_container: 1 });                                                              // FL-1 latest: Workshop
  fk(3, 0, { forklift_no: 'FL-2', warehouse: 'Yard - DMT', driver_name: 'Karim', loading_dayana: 4, unloading_trailer: 2, dayana_expense: 50 });
  fk(4, -2, { forklift_no: 'FL-3', warehouse: 'Stores - DMS', driver_name: 'Nabil', status: 'Idle' });
  ['FL-1', 'FL-2', 'FL-3'].forEach((f, i) => db['Forklift list'].push({ name: f, forklift_no: f, driver_name: ['Hassan', 'Karim', 'Nabil'][i], vehicle_maker: 'Toyota', vehicle_model: '8FG25' }));
  const mr = (i, o) => db['Material Request'].push(Object.assign({ name: 'MAT-MR-2026-0000' + i, docstatus: 1, company: DMT, material_request_type: 'Purchase', status: 'Pending', workflow_state: 'Approved', custom_priority: 'Medium', transaction_date: add(TODAY, -3), schedule_date: add(TODAY, 5), per_ordered: 0, set_warehouse: 'Stores - DMT' }, o));
  mr(1, { transaction_date: add(TODAY, -100), schedule_date: add(TODAY, -50) });                     // open over 90 days
  mr(2, { status: 'Partially Ordered', transaction_date: add(TODAY, -10), schedule_date: add(TODAY, -2), per_ordered: 50, custom_priority: 'High' }); // overdue
  mr(3, { material_request_type: 'Material Transfer', transaction_date: TODAY });                     // created today
  mr(4, { status: 'Stopped' }); mr(5, { company: 'DM Steel', schedule_date: add(TODAY, -4) });
  const mi = (p, item, qty, rec) => db['Material Request Item'].push({ name: 'MRI-' + db['Material Request Item'].length, parent: p, parenttype: 'Material Request', item_code: item, item_name: item + ' name', brand: 'Acme', item_group: 'Steel', qty, received_qty: rec, warehouse: 'Stores - DMT' });
  mi('MAT-MR-2026-00001', 'ITM-1', 10, 0); mi('MAT-MR-2026-00002', 'ITM-2', 20, 5); mi('MAT-MR-2026-00002', 'ITM-1', 5, 5); mi('MAT-MR-2026-00003', 'ITM-3', 8, 0);
  const wo = (i, o) => db['Work Order'].push(Object.assign({ name: 'MFG-WO-2026-0000' + i, docstatus: 1, company: DMT, production_item: 'FG-' + i, item_name: 'Scaffold frame ' + i, qty: 100, produced_qty: 0, status: 'Not Started', fg_warehouse: 'Stores - DMT', planned_start_date: at(-10, '08:00'), planned_end_date: at(5, '17:00'), planned_operating_cost: 0, actual_operating_cost: 0, total_operating_cost: 0, process_loss_qty: 0 }, o));
  wo(1, {});                                                                                          // stale (not started, start passed), in the period
  wo(2, { status: 'In Process', planned_start_date: at(-70, '08:00') });                              // stuck over 60 days
  wo(3, { status: 'In Process', planned_start_date: at(-3, '08:00'), qty: 50, produced_qty: 20, planned_operating_cost: 1000, actual_operating_cost: 1200, total_operating_cost: 1200, process_loss_qty: 2 });
  wo(4, { status: 'Completed', planned_start_date: at(-5, '08:00'), qty: 40, produced_qty: 40, total_operating_cost: 800 });
  wo(5, { company: 'DM Steel' });
  const jc = (i, d, o) => db['Job Card'].push(Object.assign({ name: 'PO-JOB-0000' + i, docstatus: 0, company: DMT, posting_date: add(TODAY, d), workstation: 'WS-1', operation: 'Cutting', status: 'Open', for_quantity: 10, total_completed_qty: 4, process_loss_qty: 0, total_time_in_mins: 120 }, o));
  jc(1, -2, {}); jc(2, -4, { docstatus: 1, status: 'Completed', operation: 'Welding', workstation: 'WS-2', total_completed_qty: 10, total_time_in_mins: 60 }); jc(3, -1, { status: 'Work In Progress', total_time_in_mins: 30 });
  [[-2, 'Factory A', 100, 2], [-1, 'Factory B', 80, 1.5], [-1, 'Factory A', 120, 0]].forEach((x, i) => db['Daily Production Update'].push({ name: 'DPU-' + i, docstatus: 1, date: add(TODAY, x[0]), factory: x[1], completed_qty: x[2], ot_hours: x[3] }));
  [[-1, 'HR-EMP-1', 'Riyadh', 'Cutting', 90, 50, 60, 'Duty', 40], [-1, 'HR-EMP-2', 'Riyadh', 'Welding', 70, 30, 40, 'Overtime', 60], [-2, 'HR-EMP-1', 'Jeddah', 'Cutting', 100, 60, 60, 'Duty', 0]]
    .forEach((x, i) => db['Daily Production Table'].push({ name: 'FDP-' + i, parent: 'FDP-DOC-' + i, parenttype: 'Factory Daily Production', date: add(TODAY, x[0]), employee: x[1], branch: x[2], activity: x[3], productivity: x[4], actual_qty: x[5], daily_target_qty: x[6], target_qty: x[6], type: x[7], ot_amount: x[8], duty_hours: 8, ot_hrs: x[8] ? 2 : 0, worked_item: 'Frame' }));
  db['Manufacturing Production Target'].push({ name: 'MPT-1', docstatus: 1, company: DMT, target_date: add(TODAY, -1), target_qty: 220 }, { name: 'MPT-2', docstatus: 1, company: DMT, target_date: add(TODAY, -2), target_qty: 100 });
  [['ITM-1', 'Stores - DMT', 5, -3, 8, 500], ['ITM-2', 'Stores - DMT', 100, 100, 10, 2000], ['ITM-3', 'Yard - DMT', 20, -1, 0, 300], ['ITM-1', 'Stores - DXB', 50, -5, 0, 1000], ['ITM-2', 'Stores - DMS', 10, 10, 0, 700]]
    .forEach((x, i) => db.Bin.push({ name: 'BIN-' + i, item_code: x[0], warehouse: x[1], actual_qty: x[2], projected_qty: x[3], reserved_qty: x[4], ordered_qty: 0, stock_value: x[5] }));
  [[-1, 'Material Transfer', 1000], [0, 'Material Receipt', 500], [-3, 'Material Transfer', 300]].forEach((x, i) => db['Stock Entry'].push({ name: 'MAT-STE-000' + i, docstatus: 1, company: DMT, posting_date: add(TODAY, x[0]), stock_entry_type: x[1], purpose: x[1], total_amount: x[2] }));
  db['Purchase Receipt'].push({ name: 'MAT-PRE-0001', docstatus: 1, company: DMT, posting_date: TODAY, supplier: 'SUP-1', supplier_name: 'Gulf Fasteners', status: 'To Bill', base_grand_total: 5000, per_billed: 0 }, { name: 'MAT-PRE-0002', docstatus: 1, company: DMT, posting_date: add(TODAY, -4), supplier: 'SUP-2', supplier_name: 'Riyadh Steel Co', status: 'Completed', base_grand_total: 3000, per_billed: 100 });
  return db;
}
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"] .dms-tb-r').first().innerText()).match(/([\d,]+) rows?\b/)[1].replace(/,/g, ''));
run({
  slug: 'operations', folder: '08. Operations & Logistics/Operation Dashboard', build,
  figures: async (t, H) => {
    /* default company only. Period today−13 … today. DNs 1–5 (7 is a return, 6 is the previous period); tonnage 15 t; trips 1–6;
       without a trip: 1, 3, 5 (4 is on a stop, 2 is a pickup); open requests 1–3; stale work order 1 */
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5].map(i => t.kpiVal(i))), ['5', '15.0 t', '6', '3', '3', '1']); H.ok('overview KPIs: delivery notes, tonnage, trips, without a trip, open requests, stale work orders');
    H.assert.match(await t.$('.dms-ov-kpis').innerText(), /▲ 4 vs previous period/); H.ok('delivery notes compared with the previous period (1 → 5)');
    /* trips never completed 1 + without a trip over 24 h 1 (DN 5) + requests over 90 days 1 + not started 1 + stuck 1 + old draft trip 1
       + overdue requests 1 + old draft delivery notes 1 + negative projected 2 + stopped 1 + forklift in workshop 1 */
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '12'); H.ok('pending = 12 across the eleven v4 checks');
    const today = await t.$('[data-ref="content"]').innerText();
    H.assert.match(today, /Delivery notes\s*2\s*▲ 1 vs yesterday[\s\S]*Trips\s*2\s*1 done · ▲ 1 vs yesterday[\s\S]*Tonnage\s*7\.0 t[\s\S]*Delivery value\s*14\.0KSAR[\s\S]*Trip earnings\s*400SAR/);
    H.assert.match(today, /Draft delivery notes\s*2[\s\S]*Delivery notes to bill\s*2[\s\S]*Open job cards\s*2[\s\S]*Work orders in process\s*2/); H.ok('today panel: counts, tonnage, value and earnings against yesterday');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="delivery"]').click(); await t.idle();
    /* trips 1–6: completed 1, 3, 6 → 50%; delivered 1, 3, 6 → 50%; earned 300 + 100 + 200 + 150 = 750; drivers Faisal, Omar, Imran; vehicles V-01–V-03 */
    const dk = await kpisIn(t); H.assert.deepEqual([dk[0], dk[1], dk[2], dk[4], dk[5]], ['6', '50%', '50%', '3', '3']); H.assert.match(dk[3], /^750 ?SAR$/); H.ok('delivery KPIs: trips, completion, delivered, earnings, drivers, vehicles');
    H.assert.equal(await rowsIn(t, 't_unas'), 3); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Average idle per trip[\s\S]*Faisal Al-Harbi/); H.ok('3 delivery notes without a trip; idle time per driver');
    await t.$('[data-act="tab"][data-v="forklift"]').click(); await t.idle();
    /* latest per forklift: FL-1 Workshop, FL-2 Active, FL-3 Idle; loaded 3 + 1 + 4; unloaded 2 + 2; expenses 100 + 50 */
    const fk = await kpisIn(t); H.assert.deepEqual(fk.slice(0, 5), ['1', '1', '1', '8', '4']); H.assert.match(fk[5], /^150 ?SAR$/); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Registered\s*3/); H.ok('forklift KPIs from the latest log per forklift; registry count');
    await t.$('[data-act="tab"][data-v="production"]').click(); await t.idle();
    /* work orders planned in the period: 1, 3, 4; produced 60 of 190 → 32%; loss 2; open job cards 1 and 3 */
    H.assert.deepEqual(await kpisIn(t), ['3', '1', '1', '32%', '2', '2']); const pc = await t.$('[data-ref="content"]').innerText();
    H.assert.match(pc, /Work order pipeline[\s\S]*In Process\s*2/); H.assert.match(pc, /Stale work orders[\s\S]*MFG-WO-2026-00001/); H.ok('production KPIs, pipeline (in process: all dates) and stale work orders');
    await H.shot(t.page, 'state-production-1440');
    await t.$('[data-act="tab"][data-v="supply"]').click(); await t.idle();
    /* open requests 1–3; past required: 1, 2; pending lines 3 (one line fully received); short bins 1, 3; stock value 500 + 2,000 + 300; receipts 2 */
    H.assert.deepEqual(await kpisIn(t), ['3', '2', '3', '2', '2,800SAR', '2']); H.ok('supply KPIs: requests, overdue, pending lines, shortage, stock value, receipts');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('[data-act="kpi"][data-v="targets"]').click(); await t.$('.dms-modal').waitFor();
    await t.$('[data-tg="dns_day"]').fill('4'); await t.$('[data-act="tsave"]').click(); await t.idle();
    H.assert.equal(await t.$('.dms-modal').count(), 0); H.assert.match(await t.$('[data-ref="content"]').innerText(), /50% of target/); H.ok('daily targets saved in this browser and shown in the Today panel');
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption(''); await t.$('[data-act="fapply"]').click(); await t.idle();
    /* all companies: + DN 8 (DM Steel) and DN 9 (DM Dubai) → 7; tonnage 20.5 t; the AED company is named */
    H.assert.equal(await t.kpiVal(0), '7'); H.assert.equal(await t.kpiVal(1), '20.5 t'); H.assert.match(await t.$('[data-ref="banner"]').innerText(), /DM Dubai \(AED\)/); H.ok('all companies: counts include every company, values leave out the AED company');
  },
  quiet: () => { const db = build(); Object.keys(db).forEach(k => { if (!['Company', 'Warehouse'].includes(k)) { db[k] = []; } }); return db; }
});
