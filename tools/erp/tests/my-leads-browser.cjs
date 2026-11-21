/* Browser test + screenshot QA for "02. Sales & CRM/My Leads" (on the DM kit).
   Server Script "bulk_allocate_leads" my_* actions are mocked statefully after the real source
   (server_scripts/bulk_allocate_leads_*.json): identity is the session user only; visibility hides a closed allocation
   whose lead is now active with someone else; my_add_followup applies the same checks and the client_token de-duplication;
   my_update accepts only the five allowed fields. The follow-up and update payloads are checked. */
const { run, fmt, TODAY, add } = require('./dms-harness.cjs');
const ME = 'me@dm.sa', OTHER = 'omar@dm.sa';
const CLOSED = ['Converted', 'Closed', 'Unassigned'];
const ST = ['Assigned', 'Contacted', 'Follow Up', 'Interested', 'Quotation Required', 'No Response', 'Not Interested', 'Converted', 'Closed'];
const OUT = ['Pending', 'Follow Up Required', 'Meeting Required', 'Quotation Required', 'Customer Interested', 'Customer Not Interested', 'No Response', 'Converted', 'Lost'];
const NEED = ['Follow Up Required', 'Meeting Required', 'Quotation Required', 'No Response', 'Pending'];
const NOW = TODAY + ' 09:30:00';
const lid = i => 'LGL-' + String(i + 1).padStart(4, '0');
function build(quiet) {
  const LA = [], FUL = [], LEADS = {};
  let n = 0;
  const al = (i, user, status, nf, extra) => { n++; const a = Object.assign({ name: 'LA-' + String(n).padStart(4, '0'), lead: lid(i), customer_name: 'Company ' + (i + 1), contact_person: i % 6 === 5 ? '-' : 'Contact ' + (i + 1), customer_phone_1: i % 7 === 6 ? '' : '05' + String(51000000 + i * 3571).slice(0, 8), customer_phone_2: '', customer_email: i % 7 === 6 ? 'n/a' : 'c' + i + '@client.sa',
    source: ['Exhibition', 'Website', 'Referral'][i % 3], action_taken: '', original_activities: 'Met at the Big 5 booth; asked for scaffolding prices', assigned_user: user, assigned_by: 'coord@dm.sa', assignment_date: add(TODAY, -(i % 25) - 1), priority: ['Low', 'Medium', 'High', 'Urgent'][i % 4], status, outcome: '', last_contacted: null, next_follow_up: nf, remarks: i % 3 ? '' : 'Prefers WhatsApp', creation: add(TODAY, -(i % 25) - 1) + ' 08:00:' + String(n % 60).padStart(2, '0'), modified: NOW }, extra || {}); LA.push(a); return a; };
  for (let i = 0; i < 30; i++) { LEADS[lid(i)] = { city: ['Riyadh', 'Jeddah', 'Dammam', '', 'Khobar'][i % 5], designation: 'Procurement Manager', catalogue_status: i % 2, customer_email_2: '' }; }
  const nf = i => quiet ? add(TODAY, 2 + (i % 5)) + ' 10:00:00' : [add(TODAY, -(i % 3) - 1) + ' 11:00:00', TODAY + ' 14:00:00', add(TODAY, 3) + ' 10:00:00', null, add(TODAY, 8) + ' 09:00:00'][i % 5];
  for (let i = 0; i < 22; i++) { al(i, ME, ['Assigned', 'Contacted', 'Follow Up', 'Interested', 'Quotation Required', 'No Response'][i % 6], nf(i)); }
  if (!quiet) { al(4, ME, 'Contacted', add(TODAY, 5) + ' 10:00:00'); }
  for (let i = 22; i < 26; i++) { al(i, ME, 'Converted', null, { outcome: 'Converted', last_contacted: add(TODAY, -5) + ' 12:00:00' }); }
  for (let i = 26; i < 29; i++) { al(i, ME, 'Closed', null, { outcome: 'Lost' }); }
  al(29, ME, 'Closed', null); al(29, OTHER, 'Assigned', add(TODAY, 2) + ' 10:00:00'); /* reassigned: my closed one is hidden */
  LA.filter(a => a.assigned_user === ME).forEach((a, k) => { if (k % 3 === 0) { FUL.push({ name: 'LFL-' + k, lead: a.lead, allocation: a.name, followup_datetime: add(TODAY, -3) + ' 10:15:00', contact_method: 'Call', contact_result: k % 2 ? 'Attempted - no response' : 'Conversation held', contact_person: 'Contact', outcome: k % 2 ? 'No Response' : 'Customer Interested', notes: 'Discussed the scaffolding quotation', next_action: 'Send revised prices', next_follow_up: a.next_follow_up, status_before: 'Assigned', status_after: a.status, recorded_by: ME, client_token: 'seed-' + k }); } });
  return { LA, FUL, LEADS, calls: [], deny: false };
}
function ctx(db) {
  const mine = db.LA.filter(a => a.assigned_user === ME).sort((x, y) => (x.creation < y.creation ? 1 : -1));
  const leads = new Set(mine.map(a => a.lead)), other = new Set(db.LA.filter(a => leads.has(a.lead) && a.assigned_user !== ME && !CLOSED.includes(a.status)).map(a => a.lead));
  const myActive = new Set(mine.filter(a => !CLOSED.includes(a.status)).map(a => a.lead));
  const visible = mine.filter(a => !(CLOSED.includes(a.status) && other.has(a.lead) && !myActive.has(a.lead)));
  const act = {}; visible.forEach(a => { if (!CLOSED.includes(a.status)) { act[a.lead] = (act[a.lead] || 0) + 1; } });
  const grp = a => { if (CLOSED.includes(a.status)) { return 'closed_grp'; } const v = a.next_follow_up || ''; return !v ? 'nofu' : v < TODAY + ' 00:00:00' ? 'overdue' : v <= TODAY + ' 23:59:59' ? 'today' : 'upcoming'; };
  const logs = name => db.FUL.filter(l => l.allocation === name).sort((x, y) => (x.followup_datetime < y.followup_datetime ? 1 : -1));
  const row = a => { const d = db.LEADS[a.lead] || {}, ls = logs(a.name), l = ls[0]; return Object.assign({}, a, { customer_email_2: d.customer_email_2, city: d.city, designation: d.designation, catalogue_status: d.catalogue_status, assigned_by_name: 'Nora Coordinator', fu_group: grp(a), dup: !CLOSED.includes(a.status) && act[a.lead] > 1, fu_count: ls.length, last_fu: l ? { date: l.followup_datetime, method: l.contact_method, result: l.contact_result, outcome: l.outcome, notes: l.notes, next_action: l.next_action } : null }); };
  return { visible, act, grp, row };
}
function summary(db) {
  const { visible, act, grp, row } = ctx(db), active = visible.filter(a => !CLOSED.includes(a.status));
  const cards = { active: active.length, today: active.filter(a => grp(a) === 'today').length, overdue: active.filter(a => grp(a) === 'overdue').length, nofu: active.filter(a => grp(a) === 'nofu').length, converted: visible.filter(a => a.status === 'Converted').length, closed: visible.filter(a => a.status === 'Closed').length };
  const bs = {}; visible.forEach(a => { bs[a.status] = (bs[a.status] || 0) + 1; });
  const dups = {}; Object.keys(act).forEach(k => { if (act[k] > 1) { dups[k] = act[k]; } });
  return { cards, dups, attention: [], by_status: Object.keys(bs).map(k => ({ k, c: bs[k] })).sort((x, y) => y.c - x.c), recent: visible.slice().sort((x, y) => (x.assignment_date < y.assignment_date ? 1 : -1)).slice(0, 8).map(row), cities: [...new Set(visible.map(a => (db.LEADS[a.lead] || {}).city).filter(c => c && c.trim()))].sort(), today: TODAY };
}
const fail = m => { const e = new Error(m); e.status = 417; throw e; };
function bal(a, db) {
  if (db.deny) { fail('You are not permitted to use My Leads.'); }
  db.calls.push(Object.assign({ m: a.action }, a));
  const { visible, row } = ctx(db), own = nm => visible.find(x => x.name === nm) || fail('This allocation is not assigned to you.');
  switch (a.action) {
    case 'my_summary': return summary(db);
    case 'my_list': {
      const f = a.f || {}; let rows = visible.map(row);
      rows = a.pane === 'hist' ? rows.filter(r => CLOSED.includes(r.status)) : rows.filter(r => !CLOSED.includes(r.status));
      ['status', 'priority'].forEach(k => { if (f[k]) { rows = rows.filter(r => r[k] === f[k]); } });
      if (f.from) { rows = rows.filter(r => r.assignment_date >= f.from); } if (f.to) { rows = rows.filter(r => r.assignment_date <= f.to); }
      if (f.fu) { rows = rows.filter(r => r.fu_group === f.fu); } if (f.city) { rows = rows.filter(r => (r.city || '') === f.city); } if (f.outcome) { rows = rows.filter(r => (r.outcome || '') === f.outcome); }
      if (f.method) { rows = rows.filter(r => (r.last_fu || {}).method === f.method); }
      if (f.q) { const q = String(f.q).toLowerCase(); rows = rows.filter(r => ['lead', 'customer_name', 'contact_person', 'customer_phone_1', 'customer_phone_2', 'customer_email'].map(k => r[k] || '').join(' ').toLowerCase().includes(q)); }
      const sort = ['lead', 'customer_name', 'assignment_date', 'priority', 'status', 'last_contacted', 'next_follow_up', 'city'].includes(a.sort) ? a.sort : 'assignment_date', rev = (a.dir || 'desc') === 'desc';
      const filled = rows.filter(r => r[sort]).sort((x, y) => { const p = String(x[sort]).toLowerCase() < String(y[sort]).toLowerCase() ? -1 : 1; return rev ? -p : p; });
      rows = filled.concat(rows.filter(r => !r[sort]));
      const s = +a.start || 0, l = Math.min(Math.max(+a.page_len || 20, 1), 100); return { rows: rows.slice(s, s + l), total: rows.length };
    }
    case 'my_get': return row(own(a.name));
    case 'my_followups': { const h = own(a.name), mineForLead = visible.filter(x => x.lead === h.lead).map(x => x.name); return db.FUL.filter(l => mineForLead.includes(l.allocation)).sort((x, y) => (x.followup_datetime < y.followup_datetime ? 1 : -1)).map(l => Object.assign({}, l, { recorded_by: 'Me Salesperson' })); }
    case 'my_update': {
      const h = own(a.name); if (CLOSED.includes(h.status)) { fail('This allocation is already ' + h.status + ' and cannot be updated here.'); }
      const v = a.values || {}, bad = Object.keys(v).filter(k => !['status', 'outcome', 'last_contacted', 'next_follow_up', 'remarks'].includes(k)); if (bad.length) { fail('Field(s) not allowed: ' + bad.join(', ')); }
      const d = Object.assign({}, h, v); if (d.status === 'Follow Up' && !d.next_follow_up) { fail('Next Follow-up is required when status is Follow Up.'); }
      Object.keys(v).forEach(k => { h[k] = v[k] || null; }); return { ok: true, name: h.name };
    }
    case 'my_add_followup': {
      const v = a.values || {}, h = own(v.allocation); if (v.lead && v.lead !== h.lead) { fail('The allocation does not belong to the selected lead.'); }
      if (CLOSED.includes(h.status)) { fail('This allocation is already ' + h.status + '; follow-ups cannot reopen it.'); }
      if (!v.client_token) { fail('Missing request token.'); }
      const prev = db.FUL.find(l => l.client_token === v.client_token); if (prev) { return { ok: true, name: prev.name, duplicate: true }; }
      const fd = v.followup_datetime || NOW; if (fd > NOW.slice(0, 11) + '09:40:00') { fail('Follow-up date/time cannot be in the future.'); }
      if (!['Call', 'WhatsApp', 'Email', 'Visit', 'Meeting', 'Other'].includes(v.contact_method)) { fail('Select a valid contact method.'); }
      if (!['Conversation held', 'Attempted - no response'].includes(v.contact_result)) { fail('Select whether a conversation was held or the attempt got no response.'); }
      if (!String(v.notes || '').trim()) { fail('Discussion notes are required.'); }
      const att = v.contact_result === 'Attempted - no response'; let oc = v.outcome || '';
      if (oc && !OUT.includes(oc)) { fail('Invalid outcome.'); } if (att && !['', 'No Response'].includes(oc)) { fail("An attempt with no response can only have the outcome 'No Response'."); } if (att) { oc = 'No Response'; }
      if (!att && oc === 'No Response') { fail("Outcome 'No Response' conflicts with 'Conversation held'."); }
      const ns = v.status || h.status; if (!ST.includes(ns)) { fail('Invalid status.'); } if (att && ['Contacted', 'Interested', 'Converted'].includes(ns)) { fail('An unanswered attempt cannot set status ' + ns + '.'); }
      let nx = v.next_follow_up || ''; if (nx && nx <= fd) { fail('Next follow-up must be after the follow-up date/time.'); }
      const closing = CLOSED.includes(ns); if (!closing && (['Follow Up', 'No Response'].includes(ns) || att || NEED.includes(oc)) && !nx) { fail('A next follow-up date/time is required for this status/outcome.'); } if (closing) { nx = ''; }
      const before = h.status; h.status = ns; if (oc) { h.outcome = oc; } h.next_follow_up = nx || null; if (!att && (!h.last_contacted || h.last_contacted < fd)) { h.last_contacted = fd; }
      const lg = { name: 'LFL-N' + db.FUL.length, lead: h.lead, allocation: h.name, followup_datetime: fd, contact_method: v.contact_method, contact_result: v.contact_result, contact_person: v.contact_person, outcome: oc || null, notes: v.notes, next_action: v.next_action, next_follow_up: nx || null, status_before: before, status_after: ns, recorded_by: ME, client_token: v.client_token };
      db.FUL.push(lg); return { ok: true, name: lg.name, status: ns };
    }
    default: fail('Unknown action.');
  }
}
const methods = { bulk_allocate_leads: bal };
const last = (db, m) => db.calls.filter(c => c.m === m).pop();
run({
  slug: 'my-leads', folder: '02. Sales & CRM/My Leads', build: () => build(false), methods, frappe: { session: { user: ME, user_fullname: 'Me Salesperson' } },
  figures: async (t, H, db) => {
    const s = summary(db), c = s.cards;
    for (const [i, k] of ['active', 'overdue', 'today', 'nofu', 'converted', 'closed'].entries()) { H.assert.equal(await t.kpiVal(i), fmt(c[k]), k); }
    H.ok('six cards = my_summary (active ' + c.active + ', overdue ' + c.overdue + ', today ' + c.today + ', no follow-up ' + c.nofu + ', converted ' + c.converted + ', closed ' + c.closed + ')');
    H.assert.equal(c.closed, 3); H.ok('a closed allocation whose lead is now active with someone else is hidden');
    const P = c.overdue + c.today + Object.keys(s.dups).length + c.nofu;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = overdue + due today + duplicates + no follow-up (' + P + ')');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /1 lead has more than one active allocation for you/); H.ok('duplicate active allocation named in the banner');
    H.assert.ok(db.calls.every(x => !x.user && !x.salesperson_user)); H.ok('no user id is sent from the browser');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    const c0 = summary(db).cards;
    await t.$('.dms-ov-kpis .dms-kpi[data-v="fu:overdue"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_leads"]').innerText(), new RegExp('\\b' + c0.overdue + ' records')); H.assert.equal(last(db, 'my_list').f.fu, 'overdue'); H.ok('overdue card opens My leads filtered to overdue (' + c0.overdue + ')');
    /* record a follow-up with the server's own rules */
    const target = await t.$('[data-tbl="t_leads"] [data-act="addfu"]').first().getAttribute('data-v');
    await t.$('[data-tbl="t_leads"] [data-act="addfu"]').first().click(); await t.$('.dms-modal [data-ff="notes"]').waitFor();
    H.assert.equal(await t.$('[data-ff="followup_datetime"]').inputValue(), TODAY + 'T09:30');
    await t.$('[data-act="ffsave"]').click(); H.assert.match(await t.$('.dms-modal').innerText(), /Discussion notes are required/);
    await t.$('[data-ff="contact_result"]').selectOption('Attempted - no response'); await t.idle();
    H.assert.equal(await t.$('[data-ff="outcome"]').isDisabled(), true); H.assert.equal(await t.$('[data-ff="outcome"]').inputValue(), 'No Response');
    await t.$('[data-ff="status"]').selectOption('Contacted'); await t.$('[data-ff="notes"]').fill('Called twice, no answer');
    await t.$('[data-act="ffsave"]').click(); H.assert.match(await t.$('.dms-modal').innerText(), /unanswered attempt cannot set status Contacted/);
    await t.$('[data-ff="status"]').selectOption('No Response'); await t.$('[data-act="ffsave"]').click();
    H.assert.match(await t.$('.dms-modal').innerText(), /next follow-up date\/time is required/); H.assert.equal(db.calls.filter(x => x.m === 'my_add_followup').length, 0); H.ok('follow-up form applies the server rules before sending (notes, unanswered attempt, next follow-up)');
    await t.$('[data-ff="next_follow_up"]').fill(add(TODAY, 2) + 'T10:00'); await t.$('[data-act="ffsave"]').click(); await t.idle();
    const fc = last(db, 'my_add_followup'), v = fc.values;
    H.assert.equal(v.allocation, target); H.assert.equal(v.contact_result, 'Attempted - no response'); H.assert.equal(v.outcome, 'No Response'); H.assert.equal(v.status, 'No Response');
    H.assert.equal(v.followup_datetime, NOW); H.assert.equal(v.next_follow_up, add(TODAY, 2) + ' 10:00:00'); H.assert.match(v.client_token, /^fu-LA-/); H.assert.equal(v.notes, 'Called twice, no answer');
    H.assert.match(await t.$('.dms-modal').innerText(), /Follow-up saved/); H.ok('my_add_followup gets the allocation, result, outcome, status, Riyadh times and a request token');
    H.assert.equal(db.LA.find(a => a.name === target).last_contacted, null); H.ok('an unanswered attempt does not change Last contacted');
    await t.$('.dms-btn[data-act="closeov"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_leads"]').innerText(), new RegExp('\\b' + (c0.overdue - 1) + ' records')); H.ok('the list refreshes (' + (c0.overdue - 1) + ' overdue left)');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    /* lead detail, timeline and status update */
    const withLog = db.FUL[0].allocation;
    await t.page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
    await t.$('[data-tbl="t_leads"] [data-tq]').fill(db.LA.find(a => a.name === withLog).lead); await t.page.waitForTimeout(500); await t.idle();
    await t.$('[data-tbl="t_leads"] [data-act="det"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const dt = await t.$('.dms-modal').innerText();
    H.assert.match(dt, /Discussed the scaffolding quotation[\s\S]*Recorded by Me Salesperson/); H.assert.match(dt, /Met at the Big 5 booth/); H.assert.ok(await t.$('.dms-modal a[href^="tel:"]').count() && await t.$('.dms-modal a[href^="https://wa.me/9665"]').count()); H.ok('lead detail: contact links (WhatsApp in 966 format), activities and follow-up history');
    await t.$('.dms-modal [data-act="upd"]').click(); await t.$('[data-up="status"]').waitFor();
    await t.$('[data-up="status"]').selectOption('Follow Up'); await t.$('[data-up="next_follow_up"]').fill(''); await t.$('[data-act="upsave"]').click();
    H.assert.match(await t.$('.dms-modal').innerText(), /Next follow-up is required for status “Follow Up”/);
    await t.$('[data-up="next_follow_up"]').fill(add(TODAY, 4) + 'T11:00'); await t.$('[data-act="upsave"]').click(); await t.idle();
    const uc = last(db, 'my_update'); H.assert.equal(uc.name, withLog); H.assert.deepEqual(Object.keys(uc.values).sort(), ['next_follow_up', 'status']); H.assert.equal(uc.values.next_follow_up, add(TODAY, 4) + ' 11:00:00');
    H.assert.equal(uc.values.status, 'Follow Up'); H.assert.ok(Object.keys(uc.values).every(k => ['status', 'outcome', 'last_contacted', 'next_follow_up', 'remarks'].includes(k)) && !('remarks' in uc.values)); H.ok('my_update sends only the changed, allowed fields');
    await t.page.keyboard.press('Escape'); await t.idle();
    /* follow-ups and history */
    await t.$('[data-act="tab"][data-v="followups"]').click(); await t.idle();
    await t.$('[data-mf="method"]').selectOption('Call'); await t.idle(); H.assert.equal(last(db, 'my_list').f.method, 'Call'); H.assert.equal(last(db, 'my_list').pane, 'fu'); H.ok('follow-up filters go to my_list (pane fu)');
    await t.$('[data-act="tab"][data-v="history"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_hist"]').innerText(), /\b7 records/); H.ok('history: 4 converted + 3 closed (the reassigned one hidden)');
  },
  quiet: () => build(true),
  after: async H => {
    const db2 = build(false); db2.deny = true;
    const t2 = await H.open(db2, { frappe: { session: { user: 'viewer@dm.sa' } } }); await t2.idle();
    H.assert.match(await t2.$('[data-ref="content"]').innerText(), /My Leads is available to Sales Users/); H.assert.equal(await t2.$('.dms-ov-kpis').count(), 0);
    await H.shot(t2.page, 'state-restricted-1440', { fullPage: false }); H.assert.deepEqual(t2.errors, []); await t2.ctx.close();
    H.ok('without a sales role: an access message, no figures');
  }
});
