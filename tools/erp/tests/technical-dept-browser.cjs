/* Browser test + screenshot QA for "06. Technical & Projects/Technical Department" (v2 on the DM kit; Technical
   Department Command Center). v1's rules are kept: one record per child row; salesperson matched to Sales Person names
   case-insensitively (otherwise unattributed); conversion = approvals ÷ submittals; achievement = approvals ÷ 5,
   averaged over reps with at least one approval ever (Metabase card 664); DMS overdue = open and past the required date.
   v2 excludes cancelled documents.
   Fixture: submittal lines SR1–SR6 (+ SR7 cancelled), approval lines AP1–AP3 (+ AP4 cancelled), PQ1–PQ2 (+ PQ3 cancelled),
   DMS DT1 (open, required 4 days ago), DT2 (Revision Required), DT3 (approved, past date, closed).
   Ahmed: 2 submittals, 1 PQ, 2 approvals (40%); Sara: 2 submittals, 1 approval (20%); Omar: 1 submittal, 1 PQ (0%).
   Average achievement = (40 + 20 + 0) / 2 reps with approvals = 30%. Conversion 3 / 6 = 50%.
   Pending = DMS overdue 1 + revision 1 + under approval > 30 days 1 (SR2) + unattributed 1 (SR4) = 4. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
function build() {
  const sr = (n, ds) => ({ name: 'SR' + n, docstatus: ds == null ? 1 : ds });
  const srt = (n, day, ref, loc, aps, o) => Object.assign({ name: 'SRT' + n, parent: 'SR' + n, parenttype: 'Submittal Request', date: d(day), submittal_date: d(day + 1), reference_srt: ref, location_srt: loc, dm_status: 'Submitted', approval_status: aps, project: 'P' + n, company_srt: 'Client ' + n, product_name: n % 2 ? 'Panel' : 'Cable', remarks: '' }, o || {});
  const apt = (n, day, ref, loc) => ({ name: 'APT' + n, parent: 'AP' + n, parenttype: 'Approvals', date: d(day), approval_date: d(day + 2), reference: ref, location_art: loc, approval_status: 'APPROVED', project: 'P' + n, company_art: 'Client ' + n, product_name: 'Panel', remarks: '' });
  return {
    'Sales Person': [{ name: 'Ahmed Ali' }, { name: 'Sara Noor' }, { name: 'Omar Fathi' }],
    'Submittal Request': [1, 2, 3, 4, 5, 6].map(n => sr(n)).concat([sr(7, 2)]),
    'Submittal Request table': [srt(1, -60, 'AHMED ALI', 'Riyadh', 'Approved'), srt(2, -45, 'Sara Noor', 'Jeddah', 'Under Approval'), srt(3, -10, 'Sara Noor', 'Riyadh', 'UNDER APPROVAL'), srt(4, -20, 'Unknown Guy', 'Riyadh', 'REJECTED'), srt(5, -5, 'Ahmed Ali', 'Dammam', 'PENDING'), srt(6, -90, 'Omar Fathi', 'Jeddah', 'NOT APPROVED'), srt(7, -3, 'Ahmed Ali', 'Riyadh', 'APPROVED')],
    Approvals: [1, 2, 3].map(n => ({ name: 'AP' + n, docstatus: 1, date_approval: d(-20), approval_type: 'Material' })).concat([{ name: 'AP4', docstatus: 2 }]),
    'Approvals child table': [apt(1, -40, 'Ahmed Ali', 'Riyadh'), apt(2, -30, 'ahmed ali', 'Riyadh'), apt(3, -15, 'Sara Noor', 'Jeddah'), apt(4, -10, 'Omar Fathi', 'Jeddah')],
    'Pre - Qualification Submittals': [{ name: 'PQ1', docstatus: 1, date: d(-25), submitted_date: d(-24), reference: 'Omar Fathi', location: 'Jeddah', project: 'P9', company: 'Client 9' }, { name: 'PQ2', docstatus: 1, date: d(-8), reference: 'Ahmed Ali', location: 'Riyadh', project: 'P8', company: 'Client 8' }, { name: 'PQ3', docstatus: 2, date: d(-2), reference: 'Ahmed Ali', location: 'Riyadh' }],
    'DMS Technical Submittal': [
      { name: 'DT1', docstatus: 0, status: 'Submitted', priority: 'High', project_name: 'Tower A', client: 'Client 1', required_date: d(-4), submitted_by: 'eng@dm.test', revision_no: 0, modified: d(-1) + ' 10:00:00' },
      { name: 'DT2', docstatus: 0, status: 'Revision Required', priority: 'Normal', project_name: 'Mall B', client: 'Client 2', required_date: d(10), submitted_by: 'eng@dm.test', revision_no: 1, modified: d(-2) + ' 10:00:00' },
      { name: 'DT3', docstatus: 1, status: 'Approved', priority: 'Normal', project_name: 'Villa C', client: 'Client 3', required_date: d(-20), submitted_by: 'eng@dm.test', revision_no: 0, modified: d(-3) + ' 10:00:00' }]
  };
}
const content = t => t.$('[data-ref="content"]').innerText();
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
async function filter(t, k, v) { await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="' + k + '"]').selectOption(v); await t.$('[data-act="fapply"]').click(); await t.idle(); }
run({
  slug: 'technical-dept', folder: '06. Technical & Projects/Technical Department', build,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => t.kpiVal(i))), ['6', '3', '2', '30%', '2', 'Ahmed Ali', '3', '2', '2']); H.ok('KPIs: 6 submittals, 3 approvals, 2 PQs (cancelled excluded); achievement 30% (Metabase rule); top performer; pending / under approval / rejected');
    H.assert.match(await content(t), /Conversion 50%/); H.ok('conversion 50%');
    const ch = t.log.find(x => x.a.doctype === 'Submittal Request table'); H.assert.equal(ch.a.parent, 'Submittal Request'); H.ok('child rows read from the child table with its parent');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '4'); H.ok('pending = 4');
    await t.$('[data-ref="content"] .dms-kpi[data-v="st:REJECTED"]').click(); await t.$('.dms-modal').waitFor(); await t.idle(); H.assert.match(await t.$('.dms-modal').innerText(), /\(2\)/); await t.page.keyboard.press('Escape'); H.ok('"Rejected / not approved" lists both statuses');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="team"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'team'), 3); H.assert.match(await content(t), /Ahmed Ali\s*2\s*1\s*2\s*5\s*40%/); H.ok('team: Ahmed 2 / 1 / 2, target 5, 40%');
    await t.$('[data-act="tab"][data-v="subs"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'sub'), 6);
    await filter(t, 'sp', 'Sara Noor'); H.assert.equal(await rowsIn(t, 'sub'), 2); H.ok('salesperson filter');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-act="tab"][data-v="dms"]').click(); await t.idle(); H.assert.deepEqual(await kpisIn(t), ['3', '2', '1', '1']); H.ok('DMS: 3 total, 2 active, 1 overdue, 1 approved');
    await t.$('[data-act="tab"][data-v="locprod"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'loc'), 3); H.ok('location table');
    t.ctl.fail = a => a.doctype === 'DMS Technical Submittal'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="dms"]').click(); await t.idle(); H.assert.match(await content(t), /Source unavailable[\s\S]*DMS Technical Submittal/);
    await t.$('[data-act="tab"][data-v="subs"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'sub'), 6); H.ok('a DMS permission failure is isolated');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
  }
});
