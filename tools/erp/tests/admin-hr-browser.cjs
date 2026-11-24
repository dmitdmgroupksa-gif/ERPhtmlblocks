/* Browser test + screenshot QA for "05. HR & Administration/Admin HR Dashboard" (v4 on the DM kit).
   The block calls seven unchanged Server Script APIs; the mocks return responses in the servers' shapes (see the
   server_scripts folder). The fixture is one consistent set of twelve employees on a Tuesday (a working day for all):
   - attendance: E1 and E2 have no punch and no leave (inferred absent), E3 has no punch but approved leave (not absent),
     E4 has a recorded Absent attendance, E5 is on leave and punched in; so absent today = E1, E2, E4 = 3;
   - documents: E6 Iqama expired 5 days ago, E8 passport expired yesterday, E7 Iqama due in 12 days;
   - leave: three pending applications (10, 2 and 5 days old), one status mismatch;
   - other checks: E10 holiday list does not cover today, E11 nationality fields disagree, E9 training overdue,
     two open HR requests.
   Pending = expired 2 + holiday 1 + nationality 1 + leave 3 + due ≤30 d 1 + absent 3 + mismatch 1 + training 1 + requests 2 = 15.
   A second session runs the aggregate tier (no employee-level rows): figures and counts only, no lists. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
const EMP = Array.from({ length: 12 }, (_, i) => ({ employee: 'E' + (i + 1), employee_name: ['Ali Hassan', 'Omar Saleh', 'Sara Khan', 'Raj Patel', 'Lina Aziz', 'John Cruz', 'Maha Said', 'Pedro Silva', 'Nour Adel', 'Ahmed Musa', 'Fahad Ali', 'Karim Zaki'][i], department: i % 3 ? 'Sales - DMG' : 'Admin - DMG', branch: i % 2 ? '28 Factory' : 'HO', job_location: i % 2 ? 'Site A' : 'HO', nationality: [0, 4, 10].includes(i) ? 'Saudi Arabia' : 'India', designation: i % 2 ? 'Driver' : 'Clerk', date_of_joining: i === 11 ? d(-5) : '2024-0' + (1 + (i % 9)) + '-10', status: 'Active' }));
const E = n => Object.assign({}, EMP[n - 1]);
const LA = Array.from({ length: 30 }, (_, i) => ({ name: 'HR-LAP-' + String(i + 1).padStart(4, '0'), employee: 'E' + (1 + (i % 12)), employee_name: EMP[i % 12].employee_name, department: EMP[i % 12].department, company: 'DM Trading', leave_type: i % 4 ? 'Annual Leave' : 'Sick Leave', from_date: d(-40 + i), to_date: d(-38 + i), days: 3, workflow_state: i < 3 ? 'Pending Review' : 'Approved', status: i < 3 ? 'Open' : 'Approved', docstatus: i < 3 ? 0 : 1, cls: i < 3 ? 'pending' : 'approved', approver: 'hr@dm.test', age_days: i < 3 ? [10, 2, 5][i] : null, age_label: i < 3 ? [10, 2, 5][i] + ' days' : '—' }));
const kp = (key, label, value, sub, preset, extra) => Object.assign({ key, label, value, sub, basis: label + ' basis', preset, state: 'actual' }, extra || {});
function main(a, db) {
  const det = db.__tier !== 'aggregate', rows = {
    active: EMP.map(e => Object.assign({}, e)), checked_in: EMP.slice(5).map(e => Object.assign({}, e, { first_punch: '07:5' + e.employee.length })),
    no_punch: [E(1), E(2), E(3)], absent_today: [Object.assign(E(4), { status: 'Absent' })], on_leave: [Object.assign(E(3), { leave_application: LA[5].name, leave_type: 'Annual Leave', from_date: d(-1), to_date: d(2) }), Object.assign(E(5), { leave_application: LA[6].name, leave_type: 'Sick Leave', from_date: TODAY, to_date: d(1) })],
    saudi: [E(1), E(5), E(11)].map(e => Object.assign(e, { custom_nationality: 'Saudi Arabia' })), late: [Object.assign(E(9), { shift: 'Day', first_punch: '08:25', late_by_min: 25 }), Object.assign(E(10), { shift: 'Day', first_punch: '08:12', late_by_min: 12 }), Object.assign(E(12), { shift: 'Day', first_punch: '08:07', late_by_min: 7 })],
    leave_pending: LA.slice(0, 3).map(l => ({ leave_application: l.name, employee: l.employee, employee_name: l.employee_name, leave_type: l.leave_type, from_date: l.from_date, to_date: l.to_date, days: 3, workflow_state: 'Pending Review', age_days: l.age_days })),
    exp_iqama: [Object.assign(E(6), { document: 'Iqama / Saudi ID', expiry_date: d(-5), days_left: -5 }), Object.assign(E(7), { document: 'Iqama / Saudi ID', expiry_date: d(12), days_left: 12 })], exp_passport: [Object.assign(E(8), { document: 'Passport', expiry_date: d(-1), days_left: -1 })], exp_contract: [], exp_insurance: [],
    training_overdue: [{ employee: 'E9', employee_name: EMP[8].employee_name, training: 'Fire safety', status: 'Not Started', due_date: d(-3), mandatory: 1 }],
    requests_open: [{ doctype: 'Employee Grievance', name: 'GRV-0001', state: 'Open', employee: 'E2', age_days: 40 }, { doctype: 'Travel Request', name: 'TR-0007', state: 'Pending', employee: 'E4', age_days: 3 }],
    dq_holiday_list_expired: [Object.assign(E(10), { holiday_list: 'HL 2025' })], dq_nat_conflict: [Object.assign(E(11), { custom_nationality: 'Saudi Arabia', custom_employee_nationality: 'Jordan' })],
    dq_leave_status_mismatch: [{ leave_application: LA[7].name, employee: LA[7].employee, employee_name: LA[7].employee_name, workflow_state: 'Approved', status: 'Rejected', leave_type: 'Annual Leave' }], dq_missing_user: [E(12)],
    joined_month: [E(12)], tm_appointment: [{ doc_dt: 'Appointment Letter', doc_name: 'HR-APP-LETTER-00040', employee_name: 'New Hire', detail: TODAY }], tm_onboarding: [], tm_separation: [], tm_anniversary: [Object.assign({}, E(3), { detail: '4 years on ' + TODAY })], att_period: EMP.slice(0, 6).map((e, i) => Object.assign({}, e, { present_days: 18 - i, absent_days: i, leave_days: 1, attendance_pct: Math.round(1000 * (18 - i) / 18) / 10 })), training_all: []
  };
  const trend = Array.from({ length: 14 }, (_, i) => ({ date: d(i - 13), label: d(i - 13).slice(5), count: 25 + (i % 5), present: 25 + (i % 5), absent: i % 3, on_leave: 1, not_yet: 0, holiday: 0 }));
  const groupc = (k) => { const m = {}; EMP.forEach(e => { m[e[k]] = (m[e[k]] || 0) + 1; }); return Object.keys(m).map(label => ({ label, count: m[label] })); };
  return {
    meta: { generated_at: TODAY + ' 09:30:00', date: TODAY, company: a.company || 'DM Trading', filters: {}, tier: det ? 'detail' : 'aggregate', user: 'hr@dm.test', errors: [], filter_options: { companies: ['DM Trading', 'DM Intl'], departments: ['Admin - DMG', 'Sales - DMG'], branches: ['28 Factory', 'HO'], job_locations: ['HO', 'Site A'] } },
    system_status: { holiday_lists: { ok: false, readable: true, employees_without_valid_list: 1, note: 'No holiday list covers ' + TODAY + ' for 1 of 12 employees.' }, auto_attendance: { ok: true, readable: true, stale_shifts: [], note: 'Auto-attendance is syncing.' } },
    overview: [kp('active', 'Total Active Employees', 12, ''), kp('checked_in', 'Present Today', 7, '58% of 12 expected at work'), kp('absent', 'Not Yet Checked In', 3, ''), kp('on_leave', 'On Approved Leave Today', 2, ''), kp('late', 'Late Check-ins', 3, '7 evaluated'), kp('leave_pending', 'Pending Leave Applications', 3, '+1 drafts not yet sent'), kp('training', 'Training Completion', 75, '3 of 4 assignments · 1 overdue'), kp('expiring', 'Expiring Documents (≤60 days)', 3, '2 expired · 1 due ≤60d', null, { state: 'partial' })],
    employees: { active: 12, joiners_12m: 2, leavers_12m: 1, joined_this_month: 1, this_month: { from: TODAY.slice(0, 8) + '01', to: TODAY, appointment_letters: 1, onboardings: 0, separations: 0, anniversaries: 1 }, with_user: 11, by_department: groupc('department'), by_branch: groupc('branch'), by_location: groupc('job_location'), by_designation: groupc('designation'), by_employment_type: [{ label: 'Full-time', count: 12 }], by_gender: [{ label: 'Male', count: 9 }, { label: 'Female', count: 3 }], departments_count: 2, saudi: 3, non_saudi: 9, nationality_missing: 0, expiring_employees: 3, probation: { state: 'unavailable', note: 'No reliable probation data.' }, joining_trend: [{ label: '2026-10', count: 1 }, { label: '2026-11', count: 1 }] },
    attendance: { ok: true, checked_in: 7, present_today: 7, punches_today: 15, mobile_punches: 4, other_punches: 11, no_punch_unconfirmed: 3, absent_recorded: 1, on_leave: 2, late: 3, late_evaluated: 7, trend, period: { from: a.from_date, to: a.to_date, days: 31, capped: false }, period_trend: trend, absence_reliable: false },
    leave: { ok: true, on_leave_today: 2, pending: 3, drafts: 1, upcoming_30d: 2, status_mismatch: 1, by_type_days_ytd: [{ label: 'Annual Leave', count: 42 }, { label: 'Sick Leave', count: 9.5 }], no_allocation: 2 },
    compliance: [['iqama', 'Iqama / Saudi ID', 1, 1, 0, 1], ['passport', 'Passport', 1, 0, 0, 0], ['contract', 'Employment Contract', 0, 0, 0, 2], ['insurance', 'Medical Insurance', 0, 0, 0, 0]].map(x => ({ key: x[0], label: x[1], buckets: { expired: x[2], d30: x[3], d60: x[4], missing: x[5] }, conflicts: 0, state: x[5] ? 'partial' : 'actual' })),
    training: { ok: true, assignments: 4, completed: 3, overdue: 1, pct: 75, employees_assigned: 4, employees_not_assigned: 8 },
    requests: [{ doctype: 'Employee Grievance', state: 'actual', open: 1, oldest_days: 40 }, { doctype: 'Travel Request', state: 'actual', open: 1, oldest_days: 3 }, { doctype: 'Expense Claim', state: 'unavailable', open: null }],
    analytics: { nationality: [{ label: 'India', count: 9 }, { label: 'Saudi Arabia', count: 3 }], saudization: { rule: 'Provisional: Saudi = custom_nationality.', saudi: 3, total: 12, pct: 25, conflicts: 1, by_branch: [{ label: 'HO', pct: 33.3, total: 6 }, { label: '28 Factory', pct: 16.7, total: 6 }], by_location: [] }, tenure: [{ label: '< 1 yr', count: 1 }, { label: '1-3 yrs', count: 11 }], movement: [{ month: '2026-10', joiners: 1, leavers: 0 }, { month: '2026-11', joiners: 1, leavers: 1 }], turnover: [{ month: '2026-10', rate: 0 }, { month: '2026-11', rate: 8.3 }], turnover_note: { basis: 'Separations / average headcount.' }, left_without_relieving_date: 0, attrition_12m_pct: 8.3, attrition_note: 'Approximate.' },
    data_quality: [{ key: 'holiday_list_expired', label: 'Assigned holiday list does not cover today', count: 1, severity: 'high', pct: 8.3 }, { key: 'nat_conflict', label: 'Nationality fields disagree', count: 1, severity: 'high', pct: 8.3 }, { key: 'leave_status_mismatch', label: "Leave status 'Approved' but workflow not Approved", count: 1, severity: 'medium', pct: 8.3 }, { key: 'missing_user', label: 'No ERPNext user linked', count: 1, severity: 'medium', pct: 8.3 }],
    rows: det ? rows : {}
  };
}
function page(list, a, sorter) { let r = list; if (a.search) { const q = String(a.search).toLowerCase(); r = r.filter(x => JSON.stringify(x).toLowerCase().includes(q)); } if (a.sort_by) { r = r.slice().sort((x, y) => (String(x[a.sort_by] ?? '') < String(y[a.sort_by] ?? '') ? -1 : String(x[a.sort_by] ?? '') > String(y[a.sort_by] ?? '') ? 1 : 0) * (a.sort_order === 'desc' ? -1 : 1)); } const pl = +a.page_length || 25, p = +a.page || 1; return { total: r.length, page: p, pages: Math.max(1, Math.ceil(r.length / pl)), page_length: pl, rows: r.slice((p - 1) * pl, p * pl) }; }
const meta = (a, db) => ({ tier: db.__tier === 'aggregate' ? 'detail-not' : 'detail', company: a.company || 'DM Trading', companies: ['DM Trading'], from_date: a.from_date, to_date: a.to_date, today: TODAY, generated: TODAY + ' 09:30', unreadable: [], sla_days: 14 });
const fixMeta = (m, db) => Object.assign(m, { tier: db.__tier === 'aggregate' ? 'aggregate' : 'detail' });
const methods = {
  admin_hr_dashboard_data: (a, db) => main(a, db),
  admin_hr_employee_directory: a => { const st = a.status || 'Active', all = EMP.concat([Object.assign({}, EMP[0], { employee: 'E13', employee_name: 'Gone Person', status: 'Left' })]); let r = all.filter(e => st === 'All' || e.status === st); ['department', 'designation', 'branch', 'job_location', 'nationality'].forEach(k => { if (a[k]) { r = r.filter(e => e[k] === a[k]); } }); const o = page(r, a); if (+a.with_options) { o.options = { department: ['Admin - DMG', 'Sales - DMG'], designation: ['Clerk', 'Driver'], branch: ['28 Factory', 'HO'], job_location: ['HO', 'Site A'], nationality: ['India', 'Saudi Arabia'] }; } return o; },
  admin_hr_employee_detail: a => { const e = EMP.find(x => x.employee === a.employee); return { basic: Object.assign({ company: 'DM Trading', employment_type: 'Full-time' }, e), attendance: { available: true, last_30_days: { Present: 18, Absent: 2 }, late_entries_30d: 1, punch_days_30d: 18, last_punch: d(-1) + ' 07:58', last_record: d(-1) }, leave: { available: true, balances: [{ leave_type: 'Annual Leave', allocated: 30, balance: 21, pending_deducted: 3 }], balance_note: 'Approved only.', pending: [], approved_history: [{ name: LA[5].name, leave_type: 'Annual Leave', from_date: LA[5].from_date, to_date: LA[5].to_date, days: 3 }] }, documents: [{ document: 'Iqama / Saudi ID', date: d(-5), days_left: -5, status: 'expired', status_label: 'Expired' }], training: { available: true, assigned: 1, completed: 0, pending: 1, overdue: 1 }, requests: { items: [], open: 0 } }; },
  admin_hr_leave_data: (a, db) => {
    if (a.mode === 'list') { const pre = { kpi_pending: x => x.cls === 'pending', kpi_approved: x => x.cls === 'approved', dq_overlap: x => x.name === LA[9].name }[a.preset] || (() => true); return page(LA.filter(pre).filter(x => ['workflow_state', 'status', 'leave_type', 'department'].every(k => !a[k] || x[k] === a[k])), a); }
    return { meta: fixMeta(meta(a, db), db), kpis: [kp('pending', 'Pending Leave Applications', 3, '0 already submitted', 'kpi_pending'), kp('approved', 'Approved Applications', 27, '81 days', 'kpi_approved'), kp('rejected', 'Rejected Applications', 0, 'in selected period', 'kpi_rejected'), kp('on_leave', 'Employees on Approved Leave Today', 2, 'Active employees', 'kpi_on_leave'), kp('upcoming', 'Upcoming Approved Leave', 2, 'starting in the next 30 days', 'kpi_upcoming'), kp('used', 'Leave Days Used in Period', 51.5, '2 unpaid (LWP)', 'kpi_used'), kp('pending_old', 'Pending Approvals Older Than 3 Days', 2, 'in the current workflow state', 'kpi_pending_old'), kp('no_alloc', 'Employees Without Current Leave Allocation', 2, 'of 12 active employees', 'no_alloc_emp')].map(k => db.__tier === 'aggregate' ? Object.assign(k, { preset: null }) : k),
      queues: { my: 1, hr_review: 3, awaiting: 3, note: 'Approve / reject only inside the ERPNext Leave Application form, where the workflow checks your role. The dashboard has no approval buttons.' },
      analytics: { monthly: [{ month: '2026-10', paid: 30, lwp: 2 }, { month: '2026-11', paid: 19.5, lwp: 0 }], by_type: [{ label: 'Annual Leave', count: 42 }, { label: 'Sick Leave', count: 9.5 }], by_dept: [{ label: 'Admin - DMG', days: 18 }, { label: 'Sales - DMG', days: 33.5 }], pending_by_age: [{ label: '0-3', count: 1 }, { label: '4-7', count: 1 }, { label: '8-30', count: 1 }], no_alloc_by_dept: [{ label: 'Sales - DMG', count: 2 }], pending_by_department: [] },
      dq: [{ key: 'overlap', label: 'Overlapping applications', severity: 'high', count: 1, extra: '1 overlapping pairs', preset: db.__tier === 'aggregate' ? null : 'dq_overlap' }], definitions: { approved: 'docstatus 1 + workflow Approved + status not Rejected', pending: 'workflow Pending* / On-Hold' }, options: { departments: ['Admin - DMG', 'Sales - DMG'], leave_types: ['Annual Leave', 'Sick Leave'], workflow_states: ['Approved', 'Draft', 'Pending Review'], statuses: ['Open', 'Approved', 'Rejected', 'Cancelled'] } };
  },
  admin_hr_compliance_data: (a, db) => {
    const docs = [Object.assign(E(6), { doc: 'iqama', document: 'Iqama / Saudi ID', expiry_date: d(-5), days: -5, status: 'expired', status_label: 'Expired' }), Object.assign(E(8), { doc: 'passport', document: 'Passport', expiry_date: d(-1), days: -1, status: 'expired', status_label: 'Expired' }), Object.assign(E(7), { doc: 'iqama', document: 'Iqama / Saudi ID', expiry_date: d(12), days: 12, status: 'due_30', status_label: 'Expiring ≤30 days' })];
    if (a.mode === 'list') { return page(docs.filter({ st_expired: x => x.status === 'expired' }[a.preset] || (() => true)), a); }
    return { meta: fixMeta(meta(a, db), db), kpis: [kp('active', 'Total Active Employees', 12, '45 required documents tracked', null), kp('valid', 'Valid Documents', 39, 'more than 90 days remaining', 'st_valid'), kp('expired', 'Expired Documents', 2, 'expiry date before today', 'st_expired'), kp('d30', 'Expiring Within 30 Days', 1, '0–30 days', 'st_due_30'), kp('missing', 'Missing Expiry Information', 3, 'no primary expiry date', 'st_missing')],
      analytics: { forecast: [{ month: '2026-11', iqama: 1, passport: 0, contract: 0, insurance: 0 }, { month: '2026-12', iqama: 0, passport: 1, contract: 1, insurance: 0 }], by_department: [{ label: 'Admin - DMG', count: 2 }, { label: 'Sales - DMG', count: 1 }], by_branch: [{ label: 'HO', count: 3 }], distribution: [{ key: 'valid', label: 'Valid (>90 days)', count: 39 }, { key: 'expired', label: 'Expired', count: 2 }], multi_issue: [{ label: '0', count: 9 }, { label: '1', count: 3 }], completion: { documents_pct: 86.7, documents_ok: 39, documents: 45, employees_pct: 75, employees_ok: 9, employees: 12 } }, dq: [] };
  },
  admin_hr_requests_data: (a, db) => {
    const rq = [{ id: 'grv::GRV-0001', doctype: 'Employee Grievance', name: 'GRV-0001', type: 'Grievance', employee: 'E2', employee_name: EMP[1].employee_name, department: EMP[1].department, created: d(-40) + ' 10:00', approver: 'hr@dm.test', status: 'Pending', cat: 'pending', state: 'Open', age_days: 40, overdue_days: 26 }, { id: 'tr::TR-0007', doctype: 'Travel Request', name: 'TR-0007', type: 'Travel', employee: 'E4', employee_name: EMP[3].employee_name, department: EMP[3].department, created: d(-3) + ' 10:00', approver: '', status: 'Pending', cat: 'pending', state: 'Pending', age_days: 3 }];
    if (a.mode === 'list') { return page(rq.filter({ overdue: x => x.overdue_days }[a.preset] || (() => true)), a); }
    return { meta: fixMeta(meta(a, db), db), kpis: [kp('open', 'Open Requests', 2, 'across 2 types', 'q_open'), kp('overdue', 'Overdue Requests', 1, 'open > 14 days', 'overdue')], queues: { my: 0, hr_review: 0, awaiting_info: 0, overdue: 1, recent: 0 }, analytics: { by_type: [{ label: 'Grievance', count: 1 }, { label: 'Travel', count: 1 }], by_department: [{ label: 'Sales - DMG', count: 1 }, { label: 'Admin - DMG', count: 1 }], pending_by_age: [{ label: '0-7', count: 1 }, { label: '30+', count: 1 }], status: [{ key: 'pending', label: 'Pending', count: 2 }], resolution_by_type: [{ label: 'Travel', avg: 4.5 }], trend: [{ month: '2026-10', created: 1, closed: 0 }, { month: '2026-11', created: 1, closed: 2 }] }, dq: [] };
  },
  admin_hr_training_data: (a, db) => {
    const tr = [{ name: 'ETP-1', kind: 'video', title: 'Fire safety', employee: 'E9', employee_name: EMP[8].employee_name, department: EMP[8].department, mandatory: 1, assigned_date: d(-20), due_date: d(-3), completed_on: '', status: 'Not Started', overdue: 1, days_to_due: -3 }].concat([1, 2, 3].map(i => ({ name: 'ETP-' + (i + 1), kind: 'video', title: 'Code of conduct', employee: 'E' + i, employee_name: EMP[i - 1].employee_name, department: EMP[i - 1].department, mandatory: 0, assigned_date: d(-20), due_date: d(10), completed_on: d(-2), status: 'Completed' })));
    if (a.mode === 'list') { return page(tr.filter({ overdue: x => x.overdue }[a.preset] || (() => true)), a); }
    return { meta: fixMeta(meta(a, db), db), kpis: [kp('assigned', 'Assignments', 4, '4 employees', null), kp('completion', 'Completion Rate', 75, '3 of 4', 'completed', { unit: '%' }), kp('overdue', 'Overdue', 1, 'due date before today', 'overdue')], analytics: { by_department: [{ label: 'Admin - DMG', pct: 66.7 }, { label: 'Sales - DMG', pct: 100 }], by_designation: [{ label: 'Clerk', pct: 75 }], overdue_by_department: [{ label: 'Admin - DMG', overdue: 1 }], most_assigned: [{ label: 'Code of conduct', count: 3 }, { label: 'Fire safety', count: 1 }], trend: [{ month: '2026-11', assigned: 4, completed: 3 }] }, dq: [] };
  }
};
const content = t => t.$('[data-ref="content"]').innerText();
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
const build = () => ({ __tier: 'detail' });
run({
  slug: 'admin-hr', folder: '05. HR & Administration/Admin HR Dashboard', build, methods,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map(i => t.kpiVal(i))), ['12', '7', '3', '2', '3', '3', '75%', '3']); H.ok('overview KPIs from the API; "absent today" re-derived by the v3 attendance policy (E1, E2 inferred + E4 recorded; E3 on leave excluded)');
    const m = t.log.find(x => x.method === 'admin_hr_dashboard_data'); H.assert.deepEqual([m.a.from_date, m.a.to_date], [add(TODAY, -31), TODAY]); H.ok('default period: one month back to today, as v3 (' + m.a.from_date + ' → ' + m.a.to_date + ')');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '15'); H.ok('pending = 15 from the API rows');
    const ov = await content(t); H.assert.match(ov, /Attendance reliability/); H.assert.match(ov, /Expense Claim[\s\S]*Unavailable/); H.ok('reliability warning and unreadable request types shown, not zero');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="attendance"]').click(); await t.idle();
    H.assert.deepEqual((await kpisIn(t)).slice(0, 4), ['7', '15', '3', '1']); H.assert.match(await content(t), /Omar Saleh[\s\S]*Inferred: no punch/); H.ok('attendance: checked in, punches, absent today (2 inferred + 1 recorded), recorded absences');
    await t.$('[data-act="tab"][data-v="leave"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 'tl_leave'), 30); const lv = t.log.filter(x => x.method === 'admin_hr_leave_data' && x.a.mode === 'summary').pop(); H.assert.equal(lv.a.from_date, add(TODAY, -31)); H.ok('leave summary uses the period; list shows all 30 applications');
    await t.$('[data-ref="content"] .dms-kpi[data-v^="pre:leave:kpi_pending:"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 'tl_leave'), 3); H.assert.equal(t.log.filter(x => x.method === 'admin_hr_leave_data' && x.a.mode === 'list').pop().a.preset, 'kpi_pending'); H.ok('a KPI card narrows the list through the API preset');
    await t.$('[data-act="clrpre"][data-v="leave"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'tl_leave'), 30); H.ok('"Show all" clears the preset');
    await t.$('[data-tbl="tl_leave"] [data-act="spage"][data-v="1"]').first().click(); await t.idle(); H.assert.match(await t.$('[data-tbl="tl_leave"]').innerText(), /26–30 \/ 30/); H.ok('server paging through the leave API');
    await t.$('[data-act="tab"][data-v="compliance"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 'tl_compliance'), 3); H.assert.equal(t.log.filter(x => x.method === 'admin_hr_compliance_data').pop().a.as_of, TODAY); H.ok('compliance as of the period end');
    await t.$('[data-act="tab"][data-v="employees"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_dir'), 12); await t.$('[data-tbl="t_dir"] [data-v="emp:E6"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const det = await t.$('.dms-modal').innerText(); H.assert.match(det, /John Cruz · E6/); H.assert.match(det, /Iqama \/ Saudi ID[\s\S]*-5/); H.assert.doesNotMatch(det, /Passport No|Iqama No|IBAN|Bank Account/i); H.ok('employee panel from admin_hr_employee_detail: expiry status only, no document numbers');
    await H.shot(t.page, 'state-employee-1440', { fullPage: false }); await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="requests"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'tl_requests'), 2);
    await t.$('[data-act="tab"][data-v="training"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'tl_training'), 4); H.ok('requests and training lists load from their APIs');
    /* 22 Nov 2026 fixes */
    const trn = await content(t); H.assert.doesNotMatch(trn, /N\/A/); H.assert.match(trn, /66\.7%/); H.ok('training completion by department shows the API percentage (was N/A)');
    await t.$('[data-act="tab"][data-v="analytics"]').click(); await t.idle();
    const an = await content(t); H.assert.doesNotMatch(an, /N\/A/); H.assert.match(an, /Saudization \(provisional\)\s*25%/); H.assert.match(an, /Attrition \(12 months\)\s*8\.3%/); H.assert.match(await t.$('[data-ref="content"] .ah-mini').last().innerText(), /8\.3%/);
    H.assert.match(an, /Joiners · last 12 months\s*2/); H.assert.match(an, /Leavers · last 12 months\s*1/); H.assert.match(an, /Net change · last 12 months\s*\+1/);
    H.assert.match(await t.$('[data-ref="content"] .dms-col[data-tip*="Turnover"]').last().getAttribute('data-tip'), /Turnover %: 8\.3%/); H.ok('HR analytics: Saudization, attrition, share of active and turnover show the API percentages; joiner / leaver totals shown');
    await t.$('[data-act="tab"][data-v="attendance"]').click(); await t.idle();
    const at = await t.$('[data-tbl="t_attp"]').innerText(); H.assert.doesNotMatch(at, /N\/A/); H.assert.match(at, /94\.4%/);
    await t.$('[data-tf="t_attp"][data-tfk="department"]').selectOption('Admin - DMG'); await t.idle(); H.assert.equal(await rowsIn(t, 't_attp'), 2);
    await t.$('[data-tf="t_late"][data-tfk="department"]').selectOption('Sales - DMG'); await t.idle(); H.assert.equal(await rowsIn(t, 't_late'), 2); H.ok('attendance by employee: Attendance % from the API; department filters on the attendance tables');
    await t.$('[data-act="tab"][data-v="leave"]').click(); await t.idle();
    await t.$('[data-tf="tl_leave"][data-tfk="workflow_state"]').selectOption('Pending Review'); await t.idle();
    H.assert.equal(await rowsIn(t, 'tl_leave'), 3); H.assert.equal(t.log.filter(x => x.method === 'admin_hr_leave_data' && x.a.mode === 'list').pop().a.workflow_state, 'Pending Review');
    H.assert.ok((await t.$('[data-tf="tl_leave"][data-tfk="workflow_state"] option').allInnerTexts()).includes('Draft')); await t.$('[data-tf="tl_leave"][data-tfk="workflow_state"]').selectOption(''); await t.idle(); H.assert.equal(await rowsIn(t, 'tl_leave'), 30); H.ok('leave list: workflow state (incl. Draft), status, type and department filters go to the leave API');
    await t.$('[data-act="tab"][data-v="employees"]').click(); await t.idle();
    const tops = await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi').evaluateAll(els => [...new Set(els.map(e => Math.round(e.getBoundingClientRect().top)))].length);
    H.assert.ok(tops <= 2, 'KPI rows: ' + tops); H.ok('10 employee KPI cards fit in 2 rows');
    H.assert.match(await content(t), /This month[\s\S]*Appointment letters\s*1[\s\S]*Onboardings\s*0[\s\S]*Separations\s*0[\s\S]*Work anniversaries\s*1/);
    await t.$('[data-ref="content"] [data-v="rows:tma"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerHTML(), /\/app\/appointment-letter\/HR-APP-LETTER-00040/); await t.page.keyboard.press('Escape'); await t.idle();
    H.ok('This month panel (from the old HR Dash Board cards): appointment letters, onboardings, separations, work anniversaries; drill links to the documents');
    await t.$('[data-act="tab"][data-v="links"]').click(); await t.idle();
    const lk = t.$('[data-ref="content"] a.ah-link'); H.assert.equal(await lk.count(), 18); H.assert.equal(await t.$('[data-ref="content"] .ah-link-off').count(), 3);
    const hrefs = await lk.evaluateAll(a => a.map(x => x.getAttribute('href')));
    H.assert.ok(hrefs.includes('/app/leave-request-form')); H.assert.ok(hrefs.includes('/app/query-report/Daily%20Attendance%20Report'));
    H.ok('Forms & Reports tab: the 21 shortcuts of the old HR Dash Board workspace (18 links, 3 reports disabled in ERP)');
    await t.$('[data-act="tab"][data-v="employees"]').click(); await t.idle();
    await t.$('[data-tf="t_dir"][data-tfk="status"]').selectOption('Left'); await t.idle(); H.assert.equal(await rowsIn(t, 't_dir'), 1);
    await t.$('[data-tf="t_dir"][data-tfk="status"]').selectOption(''); await t.idle(); await t.$('[data-tf="t_dir"][data-tfk="designation"]').selectOption('Driver'); await t.idle(); H.assert.equal(await rowsIn(t, 't_dir'), 6);
    H.assert.equal(t.log.filter(x => x.method === 'admin_hr_employee_directory').pop().a.designation, 'Driver'); await t.$('[data-tf="t_dir"][data-tfk="designation"]').selectOption(''); await t.idle(); H.ok('employee directory: status (default Active), department, designation, branch, location and nationality filters');
    await t.page.evaluate(() => { window.__leak = 0; document.addEventListener('keydown', () => { window.__leak++; }); });
    await t.$('[data-tq="t_dir"]').click(); await t.page.keyboard.type('Pedro'); await t.page.waitForTimeout(500); await t.idle(); H.assert.equal(await t.page.evaluate(() => window.__leak), 0); H.assert.equal(await rowsIn(t, 't_dir'), 1);
    await t.$('[data-tq="t_dir"]').fill(''); await t.page.waitForTimeout(500); await t.idle(); H.ok('keys typed in the dashboard search stay in it (never reach the ERP search bar shortcuts)');
    await t.page.evaluate(() => { const h = document.querySelector('#host'); h.style.transform = 'translateZ(0)'; h.style.paddingBottom = '3000px'; window.scrollTo(0, 900); });
    await t.$('[data-tbl="t_dir"] [data-v="emp:E6"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const box = await t.page.evaluate(() => { const m = document.querySelector('#host').shadowRoot.querySelector('.dms-modal').getBoundingClientRect(); return [m.top, m.bottom, innerHeight]; });
    H.assert.ok(box[0] >= 0 && box[1] <= box[2] + 1, 'modal ' + box.join(',')); await t.page.keyboard.press('Escape');
    await t.page.evaluate(() => { const h = document.querySelector('#host'); h.style.transform = ''; h.style.paddingBottom = ''; window.scrollTo(0, 0); }); H.ok('employee details stay on screen when an ERP ancestor is transformed and the page is scrolled');
    await t.$('[data-act="tab"][data-v="training"]').click(); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="department"]').selectOption('Admin - DMG'); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(t.log.filter(x => x.method === 'admin_hr_training_data').pop().a.g_department, 'Admin - DMG'); H.assert.equal(t.log.filter(x => x.method === 'admin_hr_dashboard_data').pop().a.department, 'Admin - DMG'); H.ok('department filter goes to every API (g_department for the module APIs)');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    t.ctl.fail = (a, m) => m === 'admin_hr_compliance_data'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="compliance"]').click(); await t.idle(); H.assert.match(await content(t), /Source unavailable|permission/i);
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle(); H.assert.equal(await t.kpiVal(0), '12'); H.ok('a compliance API failure is isolated: the overview still loads');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
    await t.$('[data-act="lang"][data-v="ar"]').click(); await t.idle(); H.assert.match(await t.$('#dms-pending').innerText(), /مستندات منتهية|اعتمادات إجازة معلقة/); await t.$('[data-act="lang"][data-v="en"]').click(); await t.idle(); H.ok('Arabic labels from the v3 dictionary');
  },
  after: async H => {
    const t = await H.open({ __tier: 'aggregate' }); await t.idle();
    H.assert.equal(await t.kpiVal(0), '12'); H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '12'); /* counts only: 2 + 1 + 1 + 3 + 1 + absent unavailable + 1 + 1 + 2 */
    H.assert.equal(await t.$('.dms-arow').count(), 0);
    await t.$('[data-act="tab"][data-v="employees"]').click(); await t.idle(); H.assert.match(await content(t), /HR Manager \/ HR User only/); H.assert.equal(await t.$('[data-tbl="t_dir"]').count(), 0);
    H.assert.equal(t.log.filter(x => x.method === 'admin_hr_employee_directory').length, 0);
    H.assert.deepEqual(t.errors, []); await H.shot(t.page, 'state-aggregate-1440', { fullPage: false }); await t.ctx.close(); H.ok('aggregate tier: counts only, no employee lists, the directory API is never called');
  }
});
