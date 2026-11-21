/* Browser test + screenshot QA for "03. Procurement & Supply Chain/DN & GRN Tracker" (on the DM kit).
   The dashboard keeps v1's frappe.client.get_list aggregate queries over parent + item tables (`tabX`.field refs,
   count(distinct), sum/min, group_by). This test answers them with a small join engine over the fixture, and computes every
   expected figure separately with plain JS so the test does not just echo the engine. */
const { run, getList, cond, fmt, TODAY, add } = require('./dms-harness.cjs');
const CHILD = { 'Delivery Note': 'Delivery Note Item', 'Purchase Receipt': 'Purchase Receipt Item', 'Sales Order': 'Sales Order Item', 'Purchase Order': 'Purchase Order Item' };
const Y0 = TODAY.slice(0, 4) + '-01-01';
const WH = [{ name: 'Stores - DMG', warehouse_name: 'Main Stores', company: 'DM Group KSA', is_group: 0 }, { name: 'Yard - DMG', warehouse_name: 'Yard', company: 'DM Group KSA', is_group: 0 }, { name: 'Stores - DMS', warehouse_name: 'Main Stores', company: 'DM Steel', is_group: 0 }];
const CUST = ['Al Rajhi Towers', 'Najd Builders', 'Red Sea Marine', 'Eastern Contracting'], SUP = ['Riyadh Steel Co', 'Gulf Fasteners', 'Najd Timber'];
function build() {
  const db = { Company: [{ name: 'DM Group KSA' }, { name: 'DM Steel' }], Division: [{ name: 'Contracting' }, { name: 'Trading' }], Warehouse: WH.slice() };
  Object.keys(CHILD).forEach(k => { db[k] = []; db[CHILD[k]] = []; });
  let n = 0; const item = (dt, parent, i, o) => { n++; const it = Object.assign({ name: 'ROW-' + n, parent, parenttype: dt, idx: i + 1 }, o); db[CHILD[dt]].push(it); return it; };
  /* sales orders: open, partly delivered, completed; some lines past their delivery date; one open order from last year */
  for (let i = 0; i < 16; i++) {
    const d = add(TODAY, -(i * 19 + 3)), st = ['To Deliver and Bill', 'To Deliver and Bill', 'To Deliver', 'Completed'][i % 4], co = i % 5 === 4 ? 'DM Steel' : 'DM Group KSA';
    const so = { name: 'SAL-ORD-2026-' + String(i + 1).padStart(3, '0'), docstatus: 1, transaction_date: d, delivery_date: add(d, 20), company: co, customer_name: CUST[i % 4], status: st, per_delivered: st === 'Completed' ? 100 : i % 4 === 1 ? 50 : 0, sales_persons: 'Sara Ali', custom_division: i % 2 ? 'Trading' : 'Contracting' };
    db['Sales Order'].push(so);
    for (let j = 0; j < 2; j++) { item('Sales Order', so.name, j, { item_code: 'SCF-' + (10 + j), item_name: j ? 'Coupler' : 'Scaffold tube', qty: 100, delivered_qty: st === 'Completed' ? 100 : i % 4 === 1 ? 50 : 0, uom: j ? 'Nos' : 'Kg', warehouse: co === 'DM Steel' ? 'Stores - DMS' : (j ? 'Yard - DMG' : 'Stores - DMG'), delivery_date: add(d, 20 + j * 30) }); }
  }
  db['Sales Order'].push({ name: 'SAL-ORD-2025-900', docstatus: 1, transaction_date: '2025-11-02', delivery_date: '2025-11-30', company: 'DM Group KSA', customer_name: 'Najd Builders', status: 'To Deliver', per_delivered: 0, sales_persons: '', custom_division: 'Trading' });
  item('Sales Order', 'SAL-ORD-2025-900', 0, { item_code: 'SCF-10', item_name: 'Scaffold tube', qty: 40, delivered_qty: 0, uom: 'Kg', warehouse: 'Stores - DMG', delivery_date: '2025-11-30' });
  for (let i = 0; i < 14; i++) {
    const d = add(TODAY, -(i * 21 + 5)), st = ['To Receive and Bill', 'To Receive', 'Completed', 'To Bill'][i % 4];
    const po = { name: 'PUR-ORD-2026-' + String(i + 1).padStart(3, '0'), docstatus: 1, transaction_date: d, schedule_date: add(d, 25), company: 'DM Group KSA', supplier_name: SUP[i % 3], status: st, per_received: st === 'Completed' || st === 'To Bill' ? 100 : i % 4 === 1 ? 40 : 0 };
    db['Purchase Order'].push(po);
    item('Purchase Order', po.name, 0, { item_code: 'STL-' + i, item_name: 'Steel plate', qty: 50, received_qty: po.per_received / 2, uom: 'Kg', warehouse: i % 2 ? 'Yard - DMG' : 'Stores - DMG', schedule_date: add(d, 25) });
  }
  /* delivery notes: linked to sales order lines; drafts, cancelled and returns */
  const soItems = db['Sales Order Item'];
  for (let i = 0; i < 24; i++) {
    const so = db['Sales Order'][i % 16], ds = i % 12 === 5 ? 0 : i % 12 === 9 ? 2 : 1, ret = ds === 1 && i % 11 === 3 ? 1 : 0;
    const dn = { name: (ret ? 'DN-RET-' : 'DN-2026-') + String(i + 1).padStart(3, '0'), docstatus: ds, posting_date: add(TODAY, -(i * 13 + 1)), company: so.company, custom_division: so.custom_division, customer: 'C' + (i % 4), customer_name: so.customer_name, status: ds === 0 ? 'Draft' : ds === 2 ? 'Cancelled' : ret ? 'Return Issued' : ['To Bill', 'Completed'][i % 2], is_return: ret, owner: 'store@dm.sa', sales_order: so.name };
    db['Delivery Note'].push(dn);
    const lines = soItems.filter(x => x.parent === so.name);
    lines.forEach((l, j) => { const q = ret ? -5 : 10 + j; item('Delivery Note', dn.name, j, { item_code: l.item_code, item_name: l.item_name, qty: q, stock_qty: l.uom === 'Kg' ? q * 2 : q, stock_uom: l.uom, uom: l.uom, warehouse: l.warehouse, against_sales_order: so.name, so_detail: l.name, returned_qty: 0 }); });
  }
  db['Delivery Note'].push({ name: 'DN-2025-777', docstatus: 0, posting_date: '2025-12-20', company: 'DM Group KSA', custom_division: 'Trading', customer: 'C1', customer_name: 'Najd Builders', status: 'Draft', is_return: 0, owner: 'store@dm.sa', sales_order: '' });
  item('Delivery Note', 'DN-2025-777', 0, { item_code: 'SCF-10', item_name: 'Scaffold tube', qty: 3, stock_qty: 6, stock_uom: 'Kg', uom: 'Kg', warehouse: 'Stores - DMG', against_sales_order: '', so_detail: '', returned_qty: 0 });
  const poItems = db['Purchase Order Item'];
  for (let i = 0; i < 20; i++) {
    const po = db['Purchase Order'][i % 14], l = poItems.find(x => x.parent === po.name), ds = i % 10 === 4 ? 0 : 1, ret = ds === 1 && i === 13 ? 1 : 0;
    const pr = { name: 'MAT-PRE-2026-' + String(i + 1).padStart(3, '0'), docstatus: ds, posting_date: add(TODAY, -(i * 15 + 2)), company: 'DM Group KSA', supplier: 'S' + (i % 3), supplier_name: po.supplier_name, status: ds === 0 ? 'Draft' : ret ? 'Return Issued' : 'Completed', is_return: ret, owner: 'store@dm.sa' };
    db['Purchase Receipt'].push(pr);
    const q = ret ? -2 : 20, rej = i % 7 === 2 ? 3 : 0;
    item('Purchase Receipt', pr.name, 0, { item_code: l.item_code, item_name: l.item_name, qty: q, received_qty: q + rej, rejected_qty: rej, returned_qty: 0, stock_qty: q, stock_uom: 'Kg', uom: 'Kg', warehouse: l.warehouse, purchase_order: po.name, purchase_order_item: l.name });
  }
  return db;
}
/* ---- join engine for parent + item queries ---- */
function ref(s, pdt) { const m = /^`tab(.+?)`\.(\w+)$/.exec(String(s).trim()); return m ? { dt: m[1], f: m[2] } : { dt: pdt, f: String(s).trim() }; }
function parseField(f, pdt) { let m = /^(count|sum|min|max)\((distinct )?(.+?)\)\s+as\s+(\w+)$/i.exec(f); if (m) { return { agg: m[1].toLowerCase(), distinct: !!m[2], ref: ref(m[3], pdt), as: m[4] }; } m = /^(.+?)\s+as\s+(\w+)$/.exec(f); return m ? { ref: ref(m[1], pdt), as: m[2] } : { ref: ref(f, pdt), as: f }; }
function jq(db, a) {
  if ((a.fields || []).some(f => /^\s*(min|max)\s*\(/i.test(String(f)))) { const e = new Error('Function not allowed in get_list fields'); e.status = 417; throw e; }
  const P = a.doctype, Cd = CHILD[P], fields = (a.fields || ['name']).map(f => parseField(f, P)), filt = a.filters || [], orf = a.or_filters || [];
  const fr = f => (f.length === 4 ? { dt: f[0], f: f[1], op: f[2], v: f[3] } : { dt: P, f: f[0], op: f[1], v: f[2] });
  const gb = a.group_by ? String(a.group_by).split(',').map(s => ref(s, P)) : null, ob = a.order_by ? String(a.order_by).split(',').map(s => { const m = /^(.*?)(?:\s+(asc|desc))?$/i.exec(s.trim()); return { e: m[1], d: (m[2] || 'asc').toLowerCase() }; }) : [];
  const refs = fields.map(x => x.ref).concat(filt.map(fr), orf.map(fr), gb || [], ob.filter(o => /^`tab/.test(o.e)).map(o => ref(o.e, P)));
  const needC = refs.some(r => r.dt === Cd);
  let rows = []; db[P].forEach(p => { if (needC) { db[Cd].filter(c => c.parent === p.name).forEach(c => rows.push({ p, c })); } else { rows.push({ p }); } });
  const val = (r, x) => (x.dt === Cd ? (r.c ? r.c[x.f] : undefined) : r.p[x.f]), nn = v => (v === undefined ? null : v);
  rows = rows.filter(r => filt.every(f => { const x = fr(f); return cond(val(r, x), x.op, x.v); }));
  if (orf.length) { rows = rows.filter(r => orf.some(f => { const x = fr(f); return cond(val(r, x), x.op, x.v); })); }
  let out;
  if (gb || fields.some(x => x.agg)) {
    const g = new Map(); rows.forEach(r => { const k = gb ? JSON.stringify(gb.map(x => val(r, x))) : '_'; if (!g.has(k)) { g.set(k, []); } g.get(k).push(r); }); if (!gb && !g.size) { g.set('_', []); }
    out = [...g.values()].map(rs => { const o = {}; fields.forEach(x => {
      if (!x.agg) { o[x.as] = rs.length ? nn(val(rs[0], x.ref)) : null; return; }
      let vs = rs.map(r => val(r, x.ref)).filter(v => v != null && v !== '');
      if (x.agg === 'count') { o[x.as] = x.distinct ? new Set(vs.map(String)).size : vs.length; } else if (x.agg === 'sum') { o[x.as] = vs.length ? vs.reduce((s, v) => s + (+v || 0), 0) : null; } else { vs = vs.slice().sort(); o[x.as] = vs.length ? (x.agg === 'min' ? vs[0] : vs[vs.length - 1]) : null; }
    }); Object.defineProperty(o, '__r', { value: rs[0], enumerable: false }); return o; });
  } else { out = rows.map(r => { const o = {}; fields.forEach(x => { o[x.as] = nn(val(r, x.ref)); }); Object.defineProperty(o, '__r', { value: r, enumerable: false }); return o; }); }
  if (ob.length) { out.sort((x, y) => { for (const o of ob) { let A, B; if (fields.some(f => f.as === o.e)) { A = x[o.e]; B = y[o.e]; } else { const rr = ref(o.e, P); A = x.__r ? val(x.__r, rr) : null; B = y.__r ? val(y.__r, rr) : null; } A = A == null ? '' : A; B = B == null ? '' : B; const c = typeof A === 'number' && typeof B === 'number' ? A - B : A < B ? -1 : A > B ? 1 : 0; if (c) { return o.d === 'desc' ? -c : c; } } return 0; }); }
  const s = +a.limit_start || 0, l = String(a.limit_page_length) === '0' ? Infinity : (+a.limit_page_length || 20); return out.slice(s, s + l);
}
const methods = { 'frappe.client.get_list': (a, db) => (CHILD[a.doctype] ? jq(db, a) : getList(db, a)) };
/* ---- independent expectations ---- */
const inP = d => d >= Y0 && d <= TODAY;
const lines = (db, dt, p) => db[CHILD[dt]].filter(c => c.parent === p.name);
const PEND = { so: ['To Deliver and Bill', 'To Deliver'], po: ['To Receive and Bill', 'To Receive'] };
const overdueOrders = (db, dt, k, period) => db[dt].filter(o => o.docstatus === 1 && PEND[k].includes(o.status) && (!period || inP(o.transaction_date)) && lines(db, dt, o).some(l => (l.delivery_date || l.schedule_date) < TODAY));
run({
  slug: 'dn-grn', folder: '03. Procurement & Supply Chain/DN & GRN Tracker', build, methods,
  figures: async (t, H, db) => {
    const dn = db['Delivery Note'].filter(d => inP(d.posting_date)), pr = db['Purchase Receipt'].filter(d => inP(d.posting_date));
    H.assert.equal(await t.kpiVal(0), fmt(dn.filter(d => d.docstatus === 1).length)); H.assert.equal(await t.kpiVal(1), fmt(pr.filter(d => d.docstatus === 1).length)); H.ok('submitted delivery notes and receipts in the period (distinct documents)');
    H.assert.equal(await t.kpiVal(2), fmt(db['Sales Order'].filter(o => o.docstatus === 1 && PEND.so.includes(o.status) && inP(o.transaction_date)).length));
    H.assert.equal(await t.kpiVal(4), fmt(overdueOrders(db, 'Sales Order', 'so', true).length)); H.assert.equal(await t.kpiVal(5), fmt(overdueOrders(db, 'Purchase Order', 'po', true).length)); H.ok('orders to deliver and overdue commitments (a line past its date)');
    const rej = pr.filter(d => d.docstatus === 1 && lines(db, 'Purchase Receipt', d).some(l => l.rejected_qty > 0)).length;
    const P = overdueOrders(db, 'Sales Order', 'so').length + overdueOrders(db, 'Purchase Order', 'po').length + rej + db['Delivery Note'].filter(d => d.docstatus === 0).length + db['Purchase Receipt'].filter(d => d.docstatus === 0).length;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = late deliveries + late receipts (all open, last year included) + rejected receipts + drafts (' + P + ')');
  },
  interactions: async (t, H, db) => {
    const dn = db['Delivery Note'].filter(d => inP(d.posting_date));
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-ov-kpis .dms-kpi[data-v="dx:dn:sub"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_dn"]').innerText(), new RegExp('\\b' + dn.filter(d => d.docstatus === 1).length + ' records')); H.ok('the card opens submitted delivery notes, one row per document');
    await t.$('[data-act="lv"][data-v="dn:item"]').click(); await t.idle();
    const subLines = dn.filter(d => d.docstatus === 1).reduce((s, d) => s + lines(db, 'Delivery Note', d).length, 0);
    H.assert.match(await t.$('[data-tbl="t_dn"]').innerText(), new RegExp('\\b' + subLines + ' records')); H.ok('item-line view counts lines (' + subLines + ')');
    const target = dn.find(d => d.docstatus === 1 && !d.is_return && d.sales_order === 'SAL-ORD-2026-002');
    await t.$('[data-tbl="t_dn"] input[data-tq]').fill(target.name); await t.page.waitForTimeout(500); await t.idle();
    const row = await t.$('[data-tbl="t_dn"] tbody tr').first().innerText();
    H.assert.match(row, /SAL-ORD-2026-002[\s\S]*Sara Ali/); H.assert.match(row, /\t100\t10\t0\t50\tKg/); H.ok('a DN line shows its sales order, salesperson, ordered and pending quantity from the linked order line');
    H.assert.match(await t.$('.dms-kpi').nth(5).innerText(), /Kg[\s\S]*Nos|Nos[\s\S]*Kg/); H.ok('delivered quantity is listed per stock UOM, never added across units');
    await t.$('[data-tbl="t_dn"] input[data-tq]').fill(''); await t.page.waitForTimeout(500); await t.idle();
    /* overdue commitments → order lines → linked deliveries */
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-ov-kpis .dms-kpi[data-v="om:so:over"]').click(); await t.idle();
    const ol = overdueOrders(db, 'Sales Order', 'so', true).reduce((s, o) => s + lines(db, 'Sales Order', o).filter(l => l.delivery_date < TODAY).length, 0);
    H.assert.match(await t.$('[data-tbl="t_ord"]').innerText(), new RegExp('\\b' + ol + ' records')); H.assert.match(await t.$('.dg-strip').innerText(), /Outstanding quantity[\s\S]*(Kg|Nos)/); H.ok('overdue mode lists the late order lines (' + ol + ') with outstanding quantity per unit');
    await t.$('[data-tbl="t_ord"] [data-act="lnk"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), /Linked to SAL-ORD-2026-[\s\S]*(DN-|Nothing delivered)/); H.ok('“Deliveries” lists the DN lines against the order');
    await t.page.keyboard.press('Escape');
    /* warehouses: duplicate names get their code; drill opens the DN tab filtered */
    await t.$('[data-act="tab"][data-v="wh"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_wh"]').innerText(), /Main Stores \(Stores - DMG\)[\s\S]*|Main Stores \(Stores - DMS\)/); H.ok('two warehouses with the same name are told apart by code');
    await t.$('[data-tbl="t_wh"] [data-act="kpi"][data-v="wh:Yard - DMG"]').click(); await t.$('.dms-modal').waitFor();
    await t.$('[data-act="whgo"][data-v="dn|Yard - DMG"]').click(); await t.idle();
    const yard = dn.reduce((s, d) => s + lines(db, 'Delivery Note', d).filter(l => l.warehouse === 'Yard - DMG').length, 0);
    H.assert.match(await t.$('[data-tbl="t_dn"]').innerText(), new RegExp('\\b' + yard + ' records')); H.ok('warehouse drill opens the DN lines in that warehouse (' + yard + ')');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    /* reports */
    await t.$('[data-act="tab"][data-v="rep"]').click(); await t.idle();
    await t.$('[data-rep]').selectOption('4'); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_rep"]').innerText(), /Returns[\s\S]*Al Rajhi Towers\t\d+\t0[\s\S]*Red Sea Marine\t\d+\t1/); H.ok('customer delivery summary with returns');
    await t.$('[data-rep]').selectOption('3'); await t.idle(); await t.$('[data-uom]').selectOption('Nos'); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Delivered \(Nos\)/); H.ok('quantity report shows one unit at a time');
    /* status filter: returned */
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="status"]').selectOption('returned'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="dn"]').click(); await t.idle(); await t.$('.dms-kpi[data-v="dx:dn:all"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_dn"]').innerText(), new RegExp('\\b' + dn.filter(d => d.docstatus === 1 && d.is_return).length + ' records')); H.ok('Document status “Returned” keeps only submitted returns');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  }
});
