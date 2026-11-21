/* Browser test + screenshot QA for "02. Sales & CRM/Lead Management" (on the DM kit).
   Leads Generation List rows come from the generic get_list mock; Server Script "bulk_allocate_leads" is mocked
   statefully after its real source (server_scripts/bulk_allocate_leads_*.json): report_lead_ids, report_allocations,
   search_salespersons, unassign_allocations, fu_monitor, fu_history and the plain allocate call. The allocate and
   unassign payloads are checked, and a second session without the coordinator role checks the restricted state. */
const { run, fmt, TODAY, add } = require('./dms-harness.cjs');
const SPS = [{ user: 'sara@dm.sa', emp: 'HR-EMP-0001', name: 'Sara Ali' }, { user: 'omar@dm.sa', emp: 'HR-EMP-0002', name: 'Omar Khan' }, { user: 'huda@dm.sa', emp: 'HR-EMP-0003', name: 'Huda Saleh' }];
const COORD = { user: 'coord@dm.sa', name: 'Nora Coordinator' };
const CLOSED = ['Closed', 'Converted', 'Unassigned'];
const ST = ['Assigned', 'Contacted', 'Follow Up', 'Interested', 'Quotation Required', 'No Response'];
const lid = i => 'LGL-' + String(i + 1).padStart(4, '0');
function build(quiet) {
  const leads = [], LA = [], FUL = [];
  for (let i = 0; i < 60; i++) {
    const miss = !quiet && i % 7 === 3;
    leads.push({ name: lid(i), docstatus: 0, date: add(TODAY, -i * 2), customer_name: 'Company ' + (i + 1), contact_person: i % 9 === 4 ? '' : 'Contact ' + (i + 1), designation: 'Procurement',
      city: ['Riyadh', 'Jeddah', 'Dammam', 'Riyadh', 'Khobar', '', '-'][i % 7], phone: miss ? '' : '05' + String(50000000 + i * 7919).slice(0, 8), telephone: '', customer_email: miss ? 'n/a' : (i === 12 || i === 13 ? 'dup@client.sa' : 'c' + i + '@client.sa'), customer_email_2: '',
      source: ['Exhibition', 'Website', 'Referral', 'Cold Call', null][i % 5], action_taken: '', activities: 'Visited booth', catalogue_status: i % 3 === 0 ? 1 : 0, remarks: '', owner: COORD.user, creation: add(TODAY, -i * 2) + ' 09:00:00', modified_by: COORD.user, modified: add(TODAY, -i) + ' 09:00:00' });
  }
  let n = 0;
  const alloc = (i, sp, status, nf) => { n++; LA.push({ name: 'LA-' + String(n).padStart(4, '0'), lead: lid(i), customer_name: 'Company ' + (i + 1), sales_person: sp.emp, assigned_user: sp.user, assigned_by: COORD.user, assignment_date: add(TODAY, -(i % 20) - 1), priority: ['Low', 'Medium', 'High', 'Urgent'][i % 4], status, outcome: '', next_follow_up: nf, last_contacted: null, remarks: 'Allocated from the exhibition list', creation: add(TODAY, -(i % 20) - 1) + ' 08:00:00' }); };
  const nfOf = i => quiet ? add(TODAY, 3 + (i % 5)) + ' 10:00:00' : [add(TODAY, -(i % 4) - 1) + ' 10:00:00', TODAY + ' 15:00:00', add(TODAY, 4) + ' 11:00:00', null, add(TODAY, 9) + ' 09:00:00'][i % 5];
  const cur = quiet ? 60 : 30;
  for (let i = 0; i < cur; i++) { alloc(i, SPS[i % 3], ST[i % ST.length], nfOf(i)); }
  if (!quiet) { alloc(5, SPS[1], 'Contacted', add(TODAY, 6) + ' 10:00:00'); for (let i = 30; i < 35; i++) { alloc(i, SPS[i % 3], 'Unassigned', null); } }
  LA.forEach((a, k) => { if (k % 2 === 0) { FUL.push({ name: 'LFL-' + k, allocation: a.name, lead: a.lead, followup_datetime: add(TODAY, -2) + ' 11:00:00', contact_method: 'Phone', contact_result: k % 4 ? 'Conversation held' : 'Attempted - no response', contact_person: 'Contact', outcome: k % 4 ? 'Interested' : 'No Response', notes: 'Discussed the catalogue and site visit', next_action: 'Send quotation', next_follow_up: a.next_follow_up, status_before: 'Assigned', status_after: a.status, recorded_by: a.assigned_user }); } });
  return { 'Leads Generation List': leads, LA, FUL, calls: [] };
}
const isCur = a => !CLOSED.includes(a.status);
const spOf = u => SPS.find(s => s.user === u) || { name: u, user: u };
const now = TODAY + ' 09:30:00', ds = TODAY + ' 00:00:00', de = TODAY + ' 23:59:59';
const due = a => !a.next_follow_up ? 'nofu' : a.next_follow_up < ds ? 'overdue' : a.next_follow_up <= de ? 'today' : 'upcoming';
function fuMonitor(db, a) {
  const f = a.f || {}; let al = db.LA.filter(isCur);
  const spAll = [...new Set(al.map(x => x.assigned_user))];
  if (f.sp_user) { al = al.filter(x => x.assigned_user === f.sp_user); } if (f.alloc_by) { al = al.filter(x => x.assigned_by === f.alloc_by); }
  if (f.status) { al = al.filter(x => x.status === f.status); } if (f.priority) { al = al.filter(x => x.priority === f.priority); }
  if (f.q) { const q = String(f.q).toLowerCase(); al = al.filter(x => (x.lead + ' ' + x.customer_name).toLowerCase().includes(q)); }
  const last = {}, cnt = {}, leadLogs = {};
  db.FUL.forEach(l => { cnt[l.allocation] = (cnt[l.allocation] || 0) + 1; if (!last[l.allocation]) { last[l.allocation] = l; } leadLogs[l.lead] = (leadLogs[l.lead] || 0) + 1; });
  const by = {}; al.forEach(x => { (by[x.lead] = by[x.lead] || []).push(x); });
  const has = c => Object.values(by).filter(l => l.some(x => due(x) === c)).length;
  const cards = { active: Object.keys(by).length, overdue: has('overdue'), today: has('today'), upcoming: has('upcoming'), nofu: Object.values(by).filter(l => l.every(x => due(x) === 'nofu')).length, nolog: Object.keys(by).filter(l => !leadLogs[l]).length, activities: Object.keys(by).reduce((s, l) => s + (leadLogs[l] || 0), 0) };
  if (f.due === 'nolog') { al = al.filter(x => !leadLogs[x.lead]); } else if (f.due === 'nofu') { al = al.filter(x => by[x.lead].every(y => due(y) === 'nofu')); } else if (f.due) { al = al.filter(x => due(x) === f.due); }
  const dup = {}; al.forEach(x => { dup[x.lead] = (dup[x.lead] || 0) + 1; });
  let rows = al.map(x => { const lg = last[x.name], nf = x.next_follow_up || ''; return { allocation: x.name, lead: x.lead, customer_name: x.customer_name, salesperson: spOf(x.assigned_user).name, salesperson_user: x.assigned_user, allocated_by: COORD.name, assignment_date: x.assignment_date, status: x.status, priority: x.priority,
    last_fu_date: lg ? lg.followup_datetime : '', last_fu_method: lg ? lg.contact_method : '', last_fu_result: lg ? lg.contact_result : '', last_fu_outcome: lg ? lg.outcome : '', last_notes: lg ? lg.notes : '', next_action: lg ? lg.next_action : '',
    next_follow_up: nf, overdue_days: nf && nf < now ? Math.round((Date.parse(TODAY) - Date.parse(nf.slice(0, 10))) / 864e5) : 0, due: due(x), fu_count: cnt[x.name] || 0, lead_fu_count: leadLogs[x.lead] || 0, dup: dup[x.lead] > 1 }; });
  const sort = a.sort || 'next_follow_up', rev = a.dir === 'desc', num = ['overdue_days', 'fu_count'].includes(sort);
  const filled = rows.filter(r => r[sort] !== '' && r[sort] != null).sort((x, y) => { const p = num ? x[sort] - y[sort] : String(x[sort]).toLowerCase() < String(y[sort]).toLowerCase() ? -1 : 1; return rev ? -p : p; });
  rows = filled.concat(rows.filter(r => r[sort] === '' || r[sort] == null));
  const start = +a.start || 0, plen = Math.min(Math.max(+a.page_len || 25, 1), 100);
  return { cards, rows: rows.slice(start, start + plen), total: rows.length, truncated: false, today: TODAY, salespersons: spAll.map(u => ({ user: u, name: spOf(u).name })).sort((x, y) => x.name.localeCompare(y.name)), allocators: [{ user: COORD.user, name: COORD.name }] };
}
function allocOut(db, leads) {
  const res = {};
  db.LA.filter(a => leads.includes(a.lead)).sort((x, y) => (x.creation < y.creation ? 1 : -1)).forEach(a => {
    const ls = db.FUL.filter(l => l.allocation === a.name), lg = ls[0];
    (res[a.lead] = res[a.lead] || []).push({ allocation: a.name, current: isCur(a), sales_person: a.sales_person, sales_person_name: spOf(a.assigned_user).name, sales_person_email: a.assigned_user, allocated_by: COORD.name, allocated_by_user: a.assigned_by, assignment_date: a.assignment_date, priority: a.priority, status: a.status, outcome: a.outcome, last_contacted: a.last_contacted, next_follow_up: a.next_follow_up, remarks: a.remarks, created: a.creation, fu_count: ls.length,
      fu_latest: lg ? { date: lg.followup_datetime, method: lg.contact_method, result: lg.contact_result, outcome: lg.outcome, notes: lg.notes, next_action: lg.next_action } : null });
  });
  return res;
}
function bal(a, db) {
  if (db.deny) { const e = new Error('You are not authorized to allocate leads.'); e.status = 417; throw e; }
  db.calls.push(Object.assign({ m: a.action || 'allocate' }, a));
  switch (a.action) {
    case 'report_lead_ids': {
      const cur = new Set(), any = new Set(); db.LA.forEach(x => { any.add(x.lead); if (isCur(x)) { cur.add(x.lead); } });
      const af = x => (!a.salesperson_user || x.assigned_user === a.salesperson_user) && (!a.allocated_by || x.assigned_by === a.allocated_by) && (!a.priority || x.priority === a.priority) && (!a.fu_status || x.status === a.fu_status) && (!a.asg_from || x.assignment_date >= a.asg_from) && (!a.asg_to || x.assignment_date <= a.asg_to);
      const filt = a.salesperson_user || a.allocated_by || a.priority || a.fu_status || a.asg_from || a.asg_to;
      return { allocators: [{ user: COORD.user, full_name: COORD.name }], current: [...cur], history_only: [...any].filter(l => !cur.has(l)), matched: filt ? [...new Set(db.LA.filter(af).map(x => x.lead))] : null, truncated: false };
    }
    case 'report_allocations': return allocOut(db, a.leads || []);
    case 'search_salespersons': { const q = String(a.txt || '').toLowerCase(), r = SPS.filter(s => !q || (s.name + ' ' + s.user).toLowerCase().includes(q)); return { results: r.map(s => ({ user: s.user, full_name: s.name, email: s.user })), has_more: false, total: r.length }; }
    case 'unassign_allocations': {
      if (String(a.reason || '').trim().length < 5) { const e = new Error('Please enter an unassignment reason (at least 5 characters).'); e.status = 417; throw e; }
      const results = (a.allocations || []).map(it => { const x = db.LA.find(y => y.name === it.allocation); if (!x) { return { allocation: it.allocation, lead: it.lead, ok: false, message: 'Allocation not found.' }; } if (!isCur(x)) { return { allocation: x.name, lead: x.lead, ok: false, message: 'Already ended (' + x.status + '); nothing changed.' }; } x.status = 'Unassigned'; return { allocation: x.name, lead: x.lead, ok: true, message: 'Unassigned.', remaining_active: db.LA.filter(y => y.lead === x.lead && isCur(y)).length }; });
      return { results, ok: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length };
    }
    case 'fu_monitor': return fuMonitor(db, a);
    case 'fu_history': return db.FUL.filter(l => l.lead === a.lead).map(l => Object.assign({}, l, { recorded_by: spOf(l.recorded_by).name }));
    default: {
      const sp = spOf(a.salesperson_user), skipped = [];
      let created = 0; (a.leads || []).forEach(l => { if (db.LA.some(x => x.lead === l && isCur(x))) { skipped.push(l); return; } created++; db.LA.push({ name: 'LA-N' + created, lead: l, customer_name: l, sales_person: sp.emp, assigned_user: sp.user, assigned_by: COORD.user, assignment_date: a.assignment_date, priority: a.priority, status: 'Assigned', outcome: '', next_follow_up: a.next_follow_up || null, last_contacted: null, remarks: '', creation: TODAY + ' 09:30:00' }); });
      return { created, skipped: skipped.length, skipped_leads: skipped };
    }
  }
}
const methods = { bulk_allocate_leads: bal };
const leadsWhere = (db, fn) => db['Leads Generation List'].filter(fn).length;
run({
  slug: 'lead-mgmt', folder: '02. Sales & CRM/Lead Management', build: () => build(false), methods, frappe: { user_roles: ['Lead Allocation Coordinator', 'Sales User'] },
  figures: async (t, H, db) => {
    const cur = new Set(db.LA.filter(isCur).map(a => a.lead)), any = new Set(db.LA.map(a => a.lead)), fu = fuMonitor(db, { f: {} }).cards;
    const un = 60 - any.size, miss = leadsWhere(db, r => !/@/.test(r.customer_email) && !/\d/.test(r.phone));
    H.assert.equal(await t.kpiVal(0), '60'); H.assert.equal(await t.kpiVal(1), fmt(cur.size)); H.assert.equal(await t.kpiVal(2), fmt(un)); H.ok('total / assigned (current allocation) / never allocated = 60 / ' + cur.size + ' / ' + un);
    H.assert.match(await t.$('.dms-ov-kpis .dms-kpi').nth(2).innerText(), /Not incl. 5 previously allocated/); H.ok('previously allocated leads are counted apart, not as unassigned');
    H.assert.equal(await t.kpiVal(3), fmt(leadsWhere(db, r => r.catalogue_status))); H.assert.equal(await t.kpiVal(4), fmt(miss)); H.assert.equal(await t.kpiVal(5), fmt(fu.overdue)); H.ok('catalogue sent / missing contact / overdue follow-ups match the fixture');
    const P = fu.overdue + fu.today + un + fu.nofu + miss;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = overdue + due today + never allocated + no follow-up + missing contact (' + P + ')');
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Potential duplicates\s*1 group\b/); H.ok('duplicate email group detected');
  },
  interactions: async (t, H, db) => {
    /* never-allocated leads → select two → allocate through the v1 flow */
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-ov-kpis .dms-kpi[data-v="xl:unassigned"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_leads"]').innerText(), /\b25 rows|\/ 25\b|25 /); H.ok('unassigned KPI opens the Leads tab filtered to the 25 never-allocated leads');
    const boxes = t.$('[data-tbl="t_leads"] [data-sel]'); const n1 = await boxes.nth(0).getAttribute('data-sel'), n2 = await boxes.nth(1).getAttribute('data-sel');
    await boxes.nth(0).check(); await t.$('[data-tbl="t_leads"] [data-sel="' + n2 + '"]').check();
    H.assert.match(await t.$('.lm-tools').innerText(), /2 selected/); await t.$('[data-act="alloc"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), /Sara Ali[\s\S]*Omar Khan/); await t.$('[data-act="al"][data-v="review"]').click();
    H.assert.match(await t.$('.dms-modal').innerText(), /Select a salesperson from the suggestions/); H.ok('allocation needs a salesperson picked from the suggestions');
    await t.$('[data-alq]').fill('omar'); await t.page.waitForTimeout(300); await t.idle();
    H.assert.doesNotMatch(await t.$('.lm-dd').innerText(), /Sara/); await t.$('.lm-dd-i').first().click();
    await t.$('[data-al="prio"]').selectOption('High'); await t.$('[data-al="next"]').fill(add(TODAY, 2) + 'T10:30');
    await t.$('[data-act="al"][data-v="review"]').click(); H.assert.match(await t.$('.dms-modal').innerText(), /Selected leads\s*2[\s\S]*Omar Khan/);
    H.assert.equal(db.calls.filter(c => c.m === 'allocate').length, 0); await t.$('[data-act="al"][data-v="confirm"]').click(); await t.idle();
    const ac = db.calls.filter(c => c.m === 'allocate').pop();
    H.assert.deepEqual(ac.leads, [n1, n2]); H.assert.equal(ac.salesperson_user, 'omar@dm.sa'); H.assert.equal(ac.assignment_date, TODAY); H.assert.equal(ac.priority, 'High'); H.assert.equal(ac.next_follow_up, add(TODAY, 2) + ' 10:30:00');
    H.assert.match(await t.$('.dms-modal').innerText(), /Created: 2 · Skipped: 0/); H.ok('allocate sends the selected leads, salesperson, date, priority and next follow-up to bulk_allocate_leads');
    await t.$('.dms-btn[data-act="closeov"]').click(); await t.idle(); H.assert.equal(await t.$('.dms-modal').count(), 0);
    H.assert.match(await t.$('[data-tbl="t_leads"]').innerText(), /\b23\b/); H.ok('the list refreshes: 23 never-allocated leads remain');
    /* unassign: a lead with two active allocations needs explicit ticks and a reason */
    await t.$('.dms-chip-x').first().click(); await t.idle();
    const dupLead = lid(5); await t.$('[data-act="ua1"][data-v="' + dupLead + '"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), /several active allocations/); H.assert.equal(await t.$('.dms-modal [data-ua]:checked').count(), 0);
    await t.$('[data-act="ua"][data-v="go"]').click(); H.assert.match(await t.$('.dms-modal').innerText(), /Tick at least one allocation/);
    await t.$('.dms-modal [data-ua]').first().check(); await t.$('[data-uareason]').fill('abc'); await t.$('[data-act="ua"][data-v="go"]').click();
    H.assert.match(await t.$('.dms-modal').innerText(), /at least 5 characters/); H.assert.equal(db.calls.filter(c => c.m === 'unassign_allocations').length, 0); H.ok('unassign blocked until an allocation is ticked and a reason of 5+ characters is given');
    await t.$('[data-uareason]').fill('Customer asked for another representative'); await t.$('[data-act="ua"][data-v="go"]').click(); await t.idle();
    const uc = db.calls.filter(c => c.m === 'unassign_allocations').pop();
    H.assert.equal(uc.allocations.length, 1); H.assert.equal(uc.allocations[0].lead, dupLead); H.assert.equal(uc.reason, 'Customer asked for another representative');
    H.assert.match(await t.$('.dms-modal').innerText(), /Unassigned: 1 · Not changed: 0[\s\S]*1 active remain/); H.ok('unassign ends one of the two allocations; one stays active');
    await t.page.keyboard.press('Escape');
    /* detailed report */
    await t.$('[data-act="tab"][data-v="report"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Matching leads\s*60/); await t.$('[data-rf="astat"]').selectOption('history'); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_rep"]').innerText(), /\b5 rows|\/ 5\b|LGL-0031/); H.ok('report filters to the 5 previously allocated leads');
    await t.$('[data-act="rlead"]').first().click(); await t.$('.dms-modal').waitFor(); H.assert.match(await t.$('.dms-modal').innerText(), /History[\s\S]*Allocated from the exhibition list/); H.ok('lead details show the allocation history');
    await t.page.keyboard.press('Escape');
    await t.$('.lm-cols summary').click(); await t.$('[data-rcol="a_by"]').uncheck(); await t.idle();
    H.assert.doesNotMatch(await t.$('[data-tbl="t_rep"] thead').innerText(), /Allocated by/); H.assert.ok(!JSON.parse(await t.page.evaluate(() => localStorage.getItem('lm_report_cols_v1'))).includes('a_by')); H.ok('column chooser hides a column and remembers it');
    /* follow-up monitoring */
    await t.$('[data-act="tab"][data-v="followups"]').click(); await t.idle();
    await t.$('.dms-kpi[data-v="fdue:overdue"]').click(); await t.idle();
    const fc = db.calls.filter(c => c.m === 'fu_monitor').pop(); H.assert.equal(fc.f.due, 'overdue');
    H.assert.ok(!/Upcoming|Due today/.test(await t.$('[data-tbl="t_fu"] tbody').innerText())); H.ok('overdue card filters the monitor to overdue allocations');
    await t.$('[data-act="fuh"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), /Discussed the catalogue|No follow-ups recorded/); H.ok('follow-up history opens from fu_history');
    await t.page.keyboard.press('Escape');
    /* source bar applies the global filter */
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('[data-act="kpi"][data-v="xf:source:Website"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_leads"]').innerText(), /\b12\b/); H.ok('a source bar filters the leads (12 from Website)');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  },
  quiet: () => build(true),
  after: async H => {
    /* a user without the coordinator role */
    const db2 = build(false); db2.deny = true;
    const t2 = await H.open(db2, { frappe: { user_roles: ['Sales User'] } }); await t2.idle();
    H.assert.equal(await t2.kpiVal(0), '60'); H.assert.equal(await t2.kpiVal(1), '—'); H.assert.match(await t2.$('[data-ref="banner"]').innerText(), /limited to Lead Allocation Coordinators/);
    await t2.$('[data-act="tab"][data-v="leads"]').click(); await t2.idle(); H.assert.equal(await t2.$('[data-act="alloc"]').count(), 0); H.assert.equal(await t2.$('[data-sel]').count(), 0);
    await H.shot(t2.page, 'state-restricted-1440', { fullPage: false }); H.assert.deepEqual(t2.errors, []); await t2.ctx.close();
    H.ok('without the coordinator role: counts shown, allocation figures "—", no allocate button');
  }
});
