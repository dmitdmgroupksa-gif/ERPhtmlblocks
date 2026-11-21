/* Browser test + screenshot QA for "02. Sales & CRM/DMS Sales Management" (on the DM kit).
   The five Server Scripts are mocked with a consistent fixture: dashboard data (summary, salespeople, follow-ups,
   regions, contractor clusters with bit-packed stages), the daily activity report, explorer sectors, contact requests
   and the share action (stateful). List navigation is captured by stubbing window.open. */
const { run, fmt, TODAY, add } = require('./dms-harness.cjs');
const SP = [['E001', 'Sara Ali'], ['E002', 'Omar Khan'], ['E003', 'Huda Saleh'], ['E004', 'Fahad Noor'], ['E005', 'Majed Saad']];
function build() {
  const proj = i => ({ project: 'DMS-PRJ-' + String(i).padStart(4, '0'), project_code: 'P-' + (1000 + i), project_name: 'Tower ' + i + ' Riyadh' });
  const people = SP.map((p, i) => ({ employee: p[0], employee_name: p[1], assigned: 12 - i, never_contacted: i % 3, contacted: 3, meetings: 2, quotations: 1 + (i % 2), negotiation: i % 2, due_today: i === 0 ? 2 : 0, overdue: [3, 1, 0, 2, 0][i], won: 1, lost: i % 2 }));
  const sumk = k => people.reduce((a, p) => a + p[k], 0);
  const allocated = sumk('assigned');
  const summary = { total_projects: 70, allocated, unallocated: 70 - allocated, never_contacted: sumk('never_contacted'), contacted: sumk('contacted'), meeting_scheduled: sumk('meetings'), quotation_submitted: sumk('quotations'), negotiation: sumk('negotiation'), won: sumk('won'), lost: sumk('lost'), due_today: sumk('due_today'), overdue: sumk('overdue'), allocation_mismatch: 2 };
  const overdue = [], upcoming = [], recent = [];
  people.forEach((p, i) => { for (let k = 0; k < p.overdue; k++) { const d = add(TODAY, -(k + 2 + i)); overdue.push(Object.assign(proj(i * 10 + k), { sales_person: p.employee, sales_person_name: p.employee_name, follow_up_status: 'Contacted', next_follow_up_date: d, days_overdue: k + 2 + i, last_follow_up_date: add(d, -7) })); } });
  people.forEach((p, i) => { for (let k = 0; k < p.due_today; k++) { upcoming.push(Object.assign(proj(60 + k), { sales_person: p.employee, sales_person_name: p.employee_name, follow_up_status: 'Meeting Scheduled', next_follow_up_date: TODAY, last_follow_up_date: add(TODAY, -5) })); } });
  upcoming.push(Object.assign(proj(65), { sales_person: 'E003', sales_person_name: 'Huda Saleh', follow_up_status: 'Negotiation', next_follow_up_date: add(TODAY, 3), last_follow_up_date: add(TODAY, -2) }));
  for (let k = 0; k < 8; k++) { const p = people[k % 5]; recent.push(Object.assign(proj(30 + k), { sales_person: p.employee, sales_person_name: p.employee_name, follow_up_status: ['Contacted', 'Quotation Submitted', 'Won'][k % 3], follow_up_date: add(TODAY, -k), next_follow_up_date: add(TODAY, 7 - k), remarks: 'Called the client, k=' + k })); }
  const ids = Array.from({ length: 70 }, (_, i) => 'DMS-PRJ-' + String(i).padStart(4, '0'));
  const region_cards = [{ region: 'Riyadh', count: 40, allocated: 30, ids: ids.slice(0, 40), mode: 'ids' }, { region: 'Eastern', count: 20, allocated: 15, ids: ids.slice(40, 60), mode: 'ids' }, { region: 'Unclassified', count: 10, allocated: 3, ids: ids.slice(60), mode: 'ids' }];
  const pidx = id => ids.indexOf(id);
  const contractor_data = { project_ids: ids, allocated_ids: ids.slice(0, 45), pinned: [],
    contractors: { exact_names: 5, normalized_names: 3, projects_covered: 30, records: 40, companies: [
      { name: 'Saudi Builders', entities: [{ name: 'Saudi Builders Co', projects: 12 }, { name: 'Saudi Builders LLC', projects: 3 }], p: ids.slice(0, 15).map(id => (pidx(id) << 3) | (pidx(id) % 3 === 0 ? 7 : 3)) },
      { name: 'Gulf Construct', entities: [{ name: 'Gulf Construct', projects: 8 }], p: ids.slice(10, 18).map(id => (pidx(id) << 3) | 1) },
      { name: 'Najd Contracting', entities: [{ name: 'Najd Contracting', projects: 6 }], p: ids.slice(42, 48).map(id => (pidx(id) << 3) | 3) }] },
    subcontractors: { exact_names: 2, normalized_names: 2, projects_covered: 10, records: 10, companies: [{ name: 'Steel Works', entities: [{ name: 'Steel Works', projects: 5 }], p: ids.slice(0, 5).map(id => pidx(id) << 3) }] } };
  const sectors = ['Residential', 'Commercial', 'Healthcare'];
  const secProjects = ids.map((id, i) => [id, i % 7 === 6 ? [] : i % 3 === 0 ? [0, 1] : [i % 3], i < 45 ? 1 : 0]);
  const kpr = [['KPR-001', 'Pending', 'E001', 2], ['KPR-002', 'Pending', 'E002', 6], ['KPR-003', 'In Progress', 'E003', 9], ['KPR-004', 'Shared', 'E001', 20], ['KPR-005', 'Shared', 'E004', 25], ['KPR-006', 'Rejected', 'E005', 30]].map((x, i) => Object.assign({ name: x[0], status: x[1], sales_person: SP.find(s => s[0] === x[2])[1], dms_project: 'DMS-PRJ-000' + i, project_code: 'P-100' + i, project_name: 'Tower ' + i, required_designation: i % 2 ? 'Procurement Manager' : 'Any', request_reason: 'Need the decision maker for the façade package', request_date: add(TODAY, -x[3]), contact_count: x[1] === 'Shared' ? 2 : 0 }));
  return { dash: { status: 'success', summary, sales_people: people, recent_followups: recent, overdue_followups: overdue, upcoming_followups: upcoming, region_cards, contractor_data, sector_cards: [], region_unmapped: 0, sector_unclassified: { count: 0, allocated: 0 } },
    sec: { projects: secProjects, sectors }, kpr, calls: [] };
}
function report(db, date, person) {
  const sp = SP.filter(s => !person || s[0] === person).map((s, i) => ({ employee: s[0], employee_name: s[1], projects: 10 - i, activities: i === 2 ? 0 : 3 - (i % 3), overdue: i % 2, late: i === 1 ? 1 : 0, inactive: i === 4 }));
  const acts = []; sp.forEach(p => { for (let k = 0; k < p.activities; k++) { acts.push({ project: 'DMS-PRJ-00' + k, project_code: 'P-10' + k, project_name: 'Tower ' + k, employee: p.employee, employee_name: p.employee_name, status: ['Contacted', 'Meeting Scheduled', 'Won'][k % 3], remarks: 'Visited site', next_follow_up_date: add(date, 5), created_on: date + ' 10:00', late: false }); } });
  const sc = {}; acts.forEach(a => { sc[a.status] = (sc[a.status] || 0) + 1; });
  const wd = new Date(date + 'T00:00:00Z').getUTCDay();
  return { date, date_label: date, weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wd], is_working_day: wd !== 5 && wd !== 6, salespeople: sp, activities: acts, status_counts: sc,
    no_activity: sp.filter(p => !p.activities && !p.inactive).map(p => ({ employee: p.employee, employee_name: p.employee_name, projects: p.projects })),
    summary: { activities: acts.length, active_salespeople: sp.filter(p => p.activities).length, total_salespeople: sp.length, projects_with_activity: 3, overdue_followups: 7, overdue_as_of_label: TODAY, late_entries: 1, inactive_salespeople: 1 }, email_subject: 'Daily DMS Sales Activity — ' + date, email_html: '<h1>Daily report ' + date + '</h1>' };
}
const methods = {
  dms_sales_dashboard_data: (a, db) => { db.calls.push(Object.assign({ m: 'dash' }, a)); return db.dash; },
  dms_manager_contact_requests: (a, db) => { const counts = {}; db.kpr.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; }); return { counts, requests: db.kpr, truncated: false }; },
  dms_daily_sales_activity_report: (a, db) => { db.calls.push(Object.assign({ m: 'da' }, a)); return report(db, a.date || TODAY, a.sales_person || ''); },
  dms_project_explorer_sectors: (a, db) => db.sec,
  dms_share_key_personnel_contact: (a, db) => { db.calls.push(Object.assign({ m: 'share' }, a)); const r = db.kpr.find(x => x.name === a.request_id); r.status = a.action; const n = a.contacts ? (typeof a.contacts === 'string' ? JSON.parse(a.contacts) : a.contacts).length : 0; if (n) { r.contact_count = n; } return { success: true, contacts_shared: n }; }
};
const opened = async t => t.page.evaluate(() => (window.__opened || []).slice(-1)[0] || '');
run({
  slug: 'dms-sales', folder: '02. Sales & CRM/DMS Sales Management', build, methods,
  figures: async (t, H, db) => {
    const s = db.dash.summary;
    H.assert.equal(await t.kpiVal(0), fmt(s.total_projects)); H.assert.equal(await t.kpiVal(1), fmt(s.never_contacted)); H.assert.equal(await t.kpiVal(2), fmt(s.overdue)); H.ok('projects / never contacted / overdue = server summary');
    H.assert.equal(await t.kpiVal(3), fmt(s.contacted + s.meeting_scheduled + s.quotation_submitted + s.negotiation)); H.ok('active pipeline = contacted + meetings + quotations + negotiation');
    H.assert.equal(await t.kpiVal(5), '3'); H.ok('open contact requests = pending + in progress (3)');
    const P = s.overdue + 3 + s.due_today + s.allocation_mismatch + s.never_contacted;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = overdue + contact requests + due today + mismatch + never contacted (' + P + ')');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /2 projects are marked allocated but have no salesperson/); H.ok('allocation mismatch named in the banner');
  },
  interactions: async (t, H, db) => {
    await t.page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
    await t.$('[data-act="tab"][data-v="team"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_team"]').innerText(), /^5 rows/); await t.$('[data-tbl="t_team"] [data-act="plist"]').first().click();
    H.assert.match(decodeURIComponent(await opened(t)), /^\/app\/dms-project\?.*sales_person=E00/); H.ok('a salesperson metric opens the DMS Project list filtered by that salesperson');
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="sp"]').selectOption('E001'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="followups"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_fu_overdue"]').innerText(), /^3 rows/); H.ok('follow-ups filtered to one salesperson (3 overdue)');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-act="tab"][data-v="explorer"]').click(); await t.idle();
    await t.$('.dms-kpi[data-v="exr:Riyadh"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Commercial[\s\S]*Residential/); H.ok('region opens its sectors');
    await t.$('.dms-kpi[data-v="exs:Residential"]').click(); await t.idle();
    await t.$('.dms-kpi[data-v^="exc:contractors:"]').first().click();
    H.assert.match(decodeURIComponent(await opened(t)), /name=\["in",\["DMS-PRJ-/); H.ok('company card opens exactly its projects');
    await t.$('[data-act="ex"][data-v="stage:awd"]').click(); await t.idle(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Saudi Builders/); H.ok('stage filter keeps awarded contractors');
    await t.$('[data-act="tab"][data-v="activity"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Activities[\s\S]*Active salespeople/);
    await t.$('[data-act="da"][data-v="prev"]').click(); await t.idle();
    const dc = db.calls.filter(c => c.m === 'da').pop(); H.assert.ok(dc.date && dc.date < TODAY && ![5, 6].includes(new Date(dc.date + 'T00:00:00Z').getUTCDay())); H.ok('previous working day skips Friday/Saturday (' + dc.date + ')');
    await t.$('[data-act="tab"][data-v="requests"]').click(); await t.idle();
    await t.$('[data-act="kpr"][data-v="KPR-001"]').click(); await t.$('.dms-modal').waitFor();
    await t.$('[data-mc-k="contact_name"]').fill('Eng. Khalid'); await t.$('[data-act="mc"][data-v="share"]').click();
    H.assert.match(await t.$('.dms-modal').innerText(), /enter a mobile number or an email address/); H.assert.equal(db.calls.filter(c => c.m === 'share').length, 0); H.ok('share blocked until a mobile or email is given (v1 validation)');
    await t.$('[data-mc-k="mobile_number"]').fill('+966500000001'); await t.$('[data-act="mc"][data-v="add"]').click();
    await t.$('[data-mc-i="1"][data-mc-k="contact_name"]').fill('Ms. Noura'); await t.$('[data-mc-i="1"][data-mc-k="email_address"]').fill('noura@client.sa');
    await t.$('[data-act="mc"][data-v="share"]').click(); await t.idle();
    const sh = db.calls.filter(c => c.m === 'share').pop(), cs = typeof sh.contacts === 'string' ? JSON.parse(sh.contacts) : sh.contacts;
    H.assert.equal(sh.request_id, 'KPR-001'); H.assert.equal(sh.action, 'Shared'); H.assert.equal(cs.length, 2); H.assert.equal(cs[1].email_address, 'noura@client.sa'); H.assert.equal(await t.$('.dms-modal').count(), 0); H.ok('two contacts shared through dms_share_key_personnel_contact');
    await t.$('[data-act="kpr"][data-v="KPR-002"]').click(); await t.$('.dms-modal').waitFor();
    await t.$('[data-act="mc"][data-v="reject"]').click(); H.assert.equal(db.calls.filter(c => c.m === 'share').length, 1); H.assert.match(await t.$('.dms-modal').innerText(), /Confirm reject/);
    await t.$('[data-act="mc"][data-v="reject"]').click(); await t.idle(); H.assert.equal(db.kpr.find(r => r.name === 'KPR-002').status, 'Rejected'); H.ok('reject needs a second confirming click');
    H.assert.match(await t.$('.dms-kpi[data-v="kprf:Pending"] .dms-kpi-n').innerText(), /^0$/); H.ok('counts refresh after the update');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
  },
  quiet: () => { const db = build(); const s = db.dash.summary; s.overdue = 0; s.due_today = 0; s.allocation_mismatch = 0; s.never_contacted = 0; db.dash.overdue_followups = []; db.dash.upcoming_followups = []; db.dash.sales_people.forEach(p => { p.overdue = 0; p.due_today = 0; p.never_contacted = 0; }); db.kpr = db.kpr.filter(r => r.status === 'Shared' || r.status === 'Rejected'); return db; }
});
