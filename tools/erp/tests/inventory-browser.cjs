/* Browser test + screenshot QA for "03. Procurement & Supply Chain/Inventory Dashboard" (on the DM kit).
   Fixture: SAR and AED companies, warehouses (incl. a group and a disabled one that must be left out), items, Bins with
   negative and projected-short balances, Item Reorder levels, Stock Ledger Entries (one cancelled entry that must not count as
   movement) and draft Stock Entries. Expected figures are computed in plain JS from the fixture. */
const { run, fmt, money, TODAY, add } = require('./dms-harness.cjs');
const WH = [['Stores - DMG', 'Main Stores', 'DM Group KSA'], ['Yard - DMG', 'Yard', 'DM Group KSA'], ['Site A - DMG', 'Site A', 'DM Group KSA'], ['Stores - DMS', 'Main Stores', 'DM Steel'], ['Stores - DXB', 'Dubai Stores', 'DM Dubai']];
const GROUPS = ['Scaffolding', 'Formwork', 'Consumables'];
function build() {
  const db = { Company: [{ name: 'DM Group KSA', default_currency: 'SAR' }, { name: 'DM Steel', default_currency: 'SAR' }, { name: 'DM Dubai', default_currency: 'AED' }],
    Warehouse: WH.map(w => ({ name: w[0], warehouse_name: w[1], company: w[2], is_group: 0, disabled: 0 })).concat([{ name: 'All Warehouses - DMG', warehouse_name: 'All Warehouses', company: 'DM Group KSA', is_group: 1, disabled: 0 }, { name: 'Old Store - DMG', warehouse_name: 'Old Store', company: 'DM Group KSA', is_group: 0, disabled: 1 }]),
    Item: [], Bin: [], 'Item Reorder': [], 'Stock Ledger Entry': [], 'Stock Entry': [] };
  for (let i = 0; i < 20; i++) { db.Item.push({ name: 'ITM-' + String(i + 1).padStart(3, '0'), item_name: ['Scaffold tube', 'Coupler', 'Base plate', 'Plywood sheet', 'Tie rod', 'Gloves'][i % 6] + ' ' + (i + 1), item_group: GROUPS[i % 3], stock_uom: ['Nos', 'Kg', 'Nos', 'Sheet', 'Nos', 'Pair'][i % 6], disabled: 0 }); }
  let n = 0;
  db.Item.forEach((it, i) => {
    WH.forEach((w, j) => {
      if ((i + j) % 3 === 2) { return; }
      const act = i === 4 && j === 0 ? -6 : i % 7 === 0 && j === 1 ? 0 : 10 + ((i * 7 + j * 3) % 40), res = i % 5 === 1 ? 15 : 0, ord = i % 4 === 0 ? 20 : 0, proj = act + ord - res - (i === 9 && j === 1 ? 80 : 0), rate = 5 + (i % 9) * 3;
      db.Bin.push({ name: 'BIN-' + (++n), item_code: it.name, warehouse: w[0], stock_uom: it.stock_uom, actual_qty: act, projected_qty: proj, reserved_qty: res, ordered_qty: ord, indented_qty: i % 6 === 0 ? 5 : 0, stock_value: act * rate, valuation_rate: rate });
      if (i % 3 === 0) { db['Item Reorder'].push({ name: 'IR-' + n, parent: it.name, parenttype: 'Item', warehouse: w[0], warehouse_reorder_level: 30, warehouse_reorder_qty: 50, material_request_type: 'Purchase' }); }
      const days = [5, 45, 120, 200, 400, null][(i + j) % 6];
      if (days != null) { db['Stock Ledger Entry'].push({ name: 'SLE-' + n, item_code: it.name, warehouse: w[0], posting_date: add(TODAY, -days), actual_qty: 5, is_cancelled: 0 }); db['Stock Ledger Entry'].push({ name: 'SLE-o' + n, item_code: it.name, warehouse: w[0], posting_date: add(TODAY, -days - 30), actual_qty: 5, is_cancelled: 0 }); }
      if (days == null && i % 2) { db['Stock Ledger Entry'].push({ name: 'SLE-c' + n, item_code: it.name, warehouse: w[0], posting_date: add(TODAY, -2), actual_qty: 5, is_cancelled: 1 }); }
    });
  });
  ['Material Transfer', 'Material Issue', 'Material Receipt'].forEach((t, i) => db['Stock Entry'].push({ name: 'MAT-STE-' + (i + 1), docstatus: 0, stock_entry_type: t, purpose: t, posting_date: add(TODAY, -(i * 9 + 2)), company: i === 2 ? 'DM Dubai' : 'DM Group KSA', from_warehouse: 'Stores - DMG', to_warehouse: 'Yard - DMG', owner: 'store@dm.sa' }));
  db['Stock Entry'].push({ name: 'MAT-STE-9', docstatus: 1, stock_entry_type: 'Material Transfer', purpose: 'Material Transfer', posting_date: add(TODAY, -1), company: 'DM Group KSA', from_warehouse: 'Stores - DMG', to_warehouse: 'Site A - DMG', owner: 'store@dm.sa' });
  return db;
}
const SARW = WH.filter(w => w[2] !== 'DM Dubai').map(w => w[0]);
function expected(db, whs) {
  const rl = {}; db['Item Reorder'].forEach(r => { rl[r.parent + '|' + r.warehouse] = r.warehouse_reorder_level; });
  const last = {}; db['Stock Ledger Entry'].filter(s => !s.is_cancelled).forEach(s => { const k = s.item_code + '|' + s.warehouse; if (!last[k] || s.posting_date > last[k]) { last[k] = s.posting_date; } });
  const bins = db.Bin.filter(b => (whs || SARW).includes(b.warehouse)).map(b => { const k = b.item_code + '|' + b.warehouse, l = last[k]; return Object.assign({}, b, { rl: rl[k], idle: l ? Math.round((Date.parse(TODAY) - Date.parse(l)) / 864e5) : null }); });
  const below = bins.filter(b => b.rl > 0 && b.projected_qty <= b.rl), slow = d => bins.filter(b => b.actual_qty > 0 && (b.idle == null || b.idle > d));
  return { bins, val: bins.reduce((a, b) => a + b.stock_value, 0), neg: bins.filter(b => b.actual_qty < 0).length, short: bins.filter(b => b.projected_qty < 0).length, below: below.length, slow90: slow(90), slow180: slow(180) };
}
run({
  slug: 'inventory', folder: '03. Procurement & Supply Chain/Inventory Dashboard', build,
  figures: async (t, H, db) => {
    const e = expected(db);
    H.assert.equal((await t.kpiVal(0)).replace(/\s/g, ''), money(e.val) + 'SAR'); H.ok('stock value = Bin stock value in SAR companies, group and disabled warehouses left out (' + money(e.val) + ')');
    H.assert.equal(await t.kpiVal(2), fmt(e.below)); H.assert.equal(await t.kpiVal(3), fmt(e.short)); H.assert.equal(await t.kpiVal(4), fmt(e.neg)); H.ok('reorder (projected ≤ level), projected shortage and negative stock counts');
    H.assert.equal((await t.kpiVal(5)).replace(/\s/g, ''), money(e.slow90.reduce((a, b) => a + b.stock_value, 0)) + 'SAR'); H.ok('slow-moving value: idle 90+ days; a cancelled ledger entry is not a movement');
    const drafts = db['Stock Entry'].filter(s => s.docstatus === 0 && s.company !== 'DM Dubai').length, P = e.neg + e.short + e.below + drafts + e.slow180.length;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = negative + shortage + reorder + drafts + idle 180+ (' + P + ')');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /not included: DM Dubai \(AED\)/); H.ok('the AED company is named, not added');
  },
  interactions: async (t, H, db) => {
    const e = expected(db);
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-ov-kpis .dms-kpi[data-v="go:reorder:below"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_reorder"]').innerText(), new RegExp('\\b' + e.below + ' rows')); H.ok('reorder card opens the reorder table (' + e.below + ')');
    await t.$('[data-act="tab"][data-v="aging"]').click(); await t.idle();
    await t.$('.dms-kpi[data-v="vq2:aging:365+"]').click(); await t.idle();
    const old = e.bins.filter(b => b.actual_qty > 0 && b.idle != null && b.idle > 365).length;
    H.assert.match(await t.$('[data-tbl="t_aging"]').innerText(), new RegExp('\\b' + old + ' rows')); H.ok('365+ days bucket lists ' + old + ' balances');
    await t.$('[data-act="tab"][data-v="wh"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_wh"]').innerText(), /Main Stores \(Stores - DMG\)[\s\S]*|Main Stores \(Stores - DMS\)/); H.assert.doesNotMatch(await t.$('[data-tbl="t_wh"]').innerText(), /Old Store|All Warehouses|Dubai Stores/); H.ok('warehouses: same-name stores told apart; group, disabled and AED warehouses left out');
    await t.$('[data-tbl="t_wh"] [data-act="kpi"][data-v="wh:Yard - DMG"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_stock"]').innerText(), new RegExp('\\b' + db.Bin.filter(b => b.warehouse === 'Yard - DMG').length + ' rows')); H.ok('a warehouse filters the stock table to its balances');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('DM Dubai'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    H.assert.equal((await t.kpiVal(0)).replace(/\s/g, ''), money(expected(db, ['Stores - DXB']).val) + 'AED'); H.ok('one AED company: value in AED');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  }
});
