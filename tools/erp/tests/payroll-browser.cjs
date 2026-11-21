/* Browser test + screenshot QA for "04. Finance & Credit Control/Payroll Cost Center" (on the DM kit).
   get_list / get_count / get / reportview.get are mocked over a seeded HR + payroll fixture: two SAR companies and one AED
   company, payroll entries and salary slips (October submitted, November draft, a duplicate, a slip without payroll entry,
   a slip for an employee who left), payroll accrual GL entries, holidays, check-ins and leave in every state. */
const { run, money, fmt, TODAY, add, cond, getList } = require('./dms-harness.cjs');
const CO = [['DM Contracting', 'SAR', 'DMC'], ['DM Trading', 'SAR', 'DMT'], ['DM Gulf', 'AED', 'DMG']], SAR = ['DM Contracting', 'DM Trading'];
const FROM = '2026-10-01';
function build() {
  const db = { Company: CO.map(c => ({ name: c[0], default_currency: c[1] })), 'Cost Center': [], Branch: [{ name: 'Riyadh' }, { name: 'Jeddah' }], Department: [], Employee: [], 'Payroll Entry': [], 'Salary Slip': [], 'Salary Detail': [], 'GL Entry': [], Account: [],
    'Holiday List': [{ name: 'KSA 2026', from_date: '2026-01-01', to_date: '2026-12-31', holidays: [{ holiday_date: '2026-09-23' }] }], 'Leave Type': [{ name: 'Annual Leave', include_holiday: 0, is_lwp: 0 }, { name: 'Sick Leave', include_holiday: 0, is_lwp: 0 }],
    'Leave Application': [], 'Leave Allocation': [], 'Employee Checkin': [] };
  CO.forEach(c => { db['Cost Center'].push({ name: 'Projects - ' + c[2], company: c[0], is_group: 0, disabled: 0 }, { name: 'Admin - ' + c[2], company: c[0], is_group: 0, disabled: 0 }); db.Department.push({ name: 'Operations - ' + c[2], company: c[0], is_group: 0 }); db.Account.push({ name: 'Salary - ' + c[2], root_type: 'Expense', is_group: 0 }, { name: 'Payroll Payable - ' + c[2], root_type: 'Liability', is_group: 0 }); });
  for (let i = 0; i < 26; i++) {
    const c = i < 12 ? CO[0] : i < 22 ? CO[1] : CO[2];
    db.Employee.push({ name: 'HR-EMP-' + String(i).padStart(3, '0'), employee_name: 'Employee ' + i, status: i === 5 ? 'Left' : 'Active', company: c[0], department: 'Operations - ' + c[2], branch: i % 2 ? 'Jeddah' : 'Riyadh', designation: i % 3 ? 'Technician' : 'Engineer',
      payroll_cost_center: (i % 4 ? 'Projects - ' : 'Admin - ') + c[2], custom_nationality: i % 2 ? 'India' : 'Saudi Arabia', custom_employee_nationality: i === 7 ? 'Egypt' : '', custom_job_location: i === 3 ? 'Back Office' : i === 4 ? 'Work From Home' : 'Site',
      date_of_joining: '2024-01-01', relieving_date: i === 5 ? '2026-10-20' : null, holiday_list: 'KSA 2026', gender: 'Male', employment_type: 'Full-time', reports_to: null, custom_vacation_status: null, custom_category: null });
  }
  const pe = (name, c, cc, s, e, created, submitted) => db['Payroll Entry'].push({ name, company: c, cost_center: cc, start_date: s, end_date: e, posting_date: e, docstatus: 1, status: 'Submitted', number_of_employees: created, salary_slips_created: created, salary_slips_submitted: submitted, branch: null, department: null });
  pe('PE-OCT-DMC', 'DM Contracting', 'Projects - DMC', '2026-10-01', '2026-10-31', 12, 12); pe('PE-OCT-DMT', 'DM Trading', 'Admin - DMT', '2026-10-01', '2026-10-31', 10, 10);
  pe('PE-NOV-DMC', 'DM Contracting', 'Projects - DMC', '2026-11-01', '2026-11-30', 12, 0); pe('PE-OCT-DMG', 'DM Gulf', 'Projects - DMG', '2026-10-01', '2026-10-31', 4, 4);
  const slip = (name, e, s, en, ds, peName, gross) => {
    const ded = Math.round(gross * 0.1); db['Salary Slip'].push({ name, employee: e.name, employee_name: e.employee_name, start_date: s, end_date: en, docstatus: ds, status: ds ? 'Submitted' : 'Draft', gross_pay: gross, net_pay: gross - ded, total_deduction: ded, payroll_entry: peName, department: e.department, branch: e.branch, company: e.company, designation: e.designation, posting_date: en, payment_days: 30 });
    db['Salary Detail'].push({ parent: name, parentfield: 'earnings', salary_component: 'Basic', amount: Math.round(gross * 0.6), statistical_component: 0, do_not_include_in_total: 0 }, { parent: name, parentfield: 'earnings', salary_component: 'Housing', amount: gross - Math.round(gross * 0.6), statistical_component: 0, do_not_include_in_total: 0 }, { parent: name, parentfield: 'deductions', salary_component: 'GOSI', amount: ded, statistical_component: 0, do_not_include_in_total: 0 });
  };
  db.Employee.forEach((e, i) => {
    const gross = 6000 + i * 450, c = CO.find(x => x[0] === e.company)[2];
    slip('SS-OCT-' + i, e, '2026-10-01', '2026-10-31', 1, i === 20 ? null : 'PE-OCT-' + (c === 'DMT' ? 'DMT' : c), gross);
    if (i === 2) { slip('SS-OCT-2b', e, '2026-10-01', '2026-10-31', 1, 'PE-OCT-DMC', gross); }
    if (i < 12) { slip('SS-NOV-' + i, e, '2026-11-01', '2026-11-30', 0, 'PE-NOV-DMC', gross); }
  });
  ['DMC', 'DMT', 'DMG'].forEach(c => {
    const co = CO.find(x => x[2] === c)[0], g = db['Salary Slip'].filter(s => s.company === co && s.start_date === '2026-10-01' && s.docstatus === 1).reduce((a, s) => a + s.gross_pay, 0);
    db['GL Entry'].push({ name: 'GLE-' + c + '-1', posting_date: '2026-10-31', company: co, account: 'Salary - ' + c, cost_center: 'Projects - ' + c, debit: g, credit: 0, is_cancelled: 0, remarks: 'Accrual Journal Entry for salaries from 2026-10-01 to 2026-10-31' },
      { name: 'GLE-' + c + '-2', posting_date: '2026-10-31', company: co, account: 'Payroll Payable - ' + c, cost_center: null, debit: 0, credit: g, is_cancelled: 0, remarks: 'Accrual Journal Entry for salaries from 2026-10-01 to 2026-10-31' });
  });
  const lv = (name, i, type, f, t, status, ds, posting) => { const e = db.Employee[i]; db['Leave Application'].push({ name, employee: e.name, employee_name: e.employee_name, leave_type: type, from_date: f, to_date: t, half_day: 0, half_day_date: null, total_leave_days: Math.round((Date.parse(t) - Date.parse(f)) / 864e5) + 1, status, docstatus: ds, workflow_state: status, department: e.department, posting_date: posting, company: e.company }); };
  lv('HR-LAP-001', 1, 'Annual Leave', '2026-11-10', '2026-11-12', 'Approved', 1, '2026-11-01'); lv('HR-LAP-002', 6, 'Annual Leave', '2026-11-20', '2026-11-22', 'Open', 0, '2026-11-15');
  lv('HR-LAP-003', 13, 'Sick Leave', '2026-10-05', '2026-10-06', 'Open', 0, '2026-10-01'); lv('HR-LAP-004', 8, 'Annual Leave', '2026-11-03', '2026-11-04', 'Approved', 0, '2026-11-01');
  lv('HR-LAP-005', 24, 'Annual Leave', '2026-10-12', '2026-10-13', 'Open', 0, '2026-10-10');
  db.Employee.forEach((e, i) => { if (i < 22) { db['Leave Allocation'].push({ employee: e.name, employee_name: e.employee_name, leave_type: 'Annual Leave', from_date: '2026-01-01', to_date: '2026-12-31', total_leaves_allocated: 30, new_leaves_allocated: 30, unused_leaves: 0, docstatus: 1 }); } });
  for (let d = 0; d < 20; d++) { const day = add(TODAY, -d); db.Employee.forEach((e, i) => { if (i < 22 && i % 5 !== 1 && !(d === 0 && i > 9)) { db['Employee Checkin'].push({ employee: e.name, time: day + ' 07:5' + (i % 10) + ':00', log_type: 'IN', device_id: 'GATE-1', custom_attendance_device: 'Main gate' }); } }); }
  return db;
}
const methods = {
  'frappe.client.get': (a, db) => { const x = (db[a.doctype] || []).find(r => r.name === a.name); if (!x) { throw Object.assign(new Error('not found'), { status: 417 }); } if (a.doctype === 'Salary Slip') { const d = db['Salary Detail'].filter(r => r.parent === a.name); return Object.assign({}, x, { earnings: d.filter(r => r.parentfield === 'earnings'), deductions: d.filter(r => r.parentfield === 'deductions') }); } return x; },
  'frappe.client.get_count': (a, db) => getList(db, { doctype: a.doctype, filters: a.filters, fields: ['name'], limit_page_length: 0 }).length,
  'frappe.desk.reportview.get': (a, db) => {
    const fl = a.filters || [], sf = fl.filter(f => f[0] === 'Salary Slip'), df = fl.filter(f => f[0] === 'Salary Detail');
    const slips = db['Salary Slip'].filter(s => sf.every(f => cond(s[f[1]], f[2], f[3]))), by = new Map(slips.map(s => [s.name, s]));
    const det = db['Salary Detail'].filter(d => by.has(d.parent) && df.every(f => cond(d[f[1]], f[2], f[3])));
    if (a.group_by) { const g = new Map(); det.forEach(d => { const k = [d.salary_component, d.parentfield, d.statistical_component, d.do_not_include_in_total].join('|'); const o = g.get(k) || { comp: d.salary_component, pf: d.parentfield, stat: d.statistical_component, dni: d.do_not_include_in_total, amt: 0, n: 0 }; o.amt += d.amount; o.n++; g.set(k, o); }); const keys = ['comp', 'pf', 'stat', 'dni', 'amt', 'n']; return { keys, values: [...g.values()].map(o => keys.map(k => o[k])) }; }
    const keys = ['slip', 'employee', 'ename', 'ds', 'amt']; return { keys, values: det.map(d => { const s = by.get(d.parent); return [s.name, s.employee, s.employee_name, s.docstatus, d.amount]; }) };
  }
};
const inP = s => s.start_date <= TODAY && s.end_date >= FROM, sar = s => SAR.includes(s.company), slips = db => db['Salary Slip'].filter(s => s.docstatus < 2 && inP(s) && sar(s));
function pending(db) {
  const sl = slips(db), emp = id => db.Employee.find(e => e.name === id), keys = {}; sl.forEach(s => { const k = s.employee + '|' + s.start_date; keys[k] = (keys[k] || 0) + 1; });
  const ids = new Set(db.Employee.filter(e => SAR.includes(e.company)).map(e => e.name)), lv = db['Leave Application'].filter(a => ids.has(a.employee) && a.docstatus < 2 && a.status !== 'Cancelled' && a.from_date <= TODAY && a.to_date >= FROM);
  const c = { draft: sl.filter(s => s.docstatus === 0).length, pe: db['Payroll Entry'].filter(p => SAR.includes(p.company) && p.start_date <= TODAY && p.end_date >= FROM && p.salary_slips_submitted < p.salary_slips_created).length,
    dup: sl.filter(s => keys[s.employee + '|' + s.start_date] > 1).length, lpend: lv.filter(a => a.status === 'Open').length, inact: sl.filter(s => emp(s.employee).status !== 'Active').length,
    nope: sl.filter(s => !s.payroll_entry).length, lunsub: lv.filter(a => a.status === 'Approved' && a.docstatus === 0).length };
  c.all = Object.values(c).reduce((a, b) => a + b, 0); return c;
}
run({
  slug: 'payroll', folder: '04. Finance & Credit Control/Payroll Cost Center', build, methods,
  figures: async (t, H, db) => {
    const sl = slips(db), gross = sl.reduce((a, s) => a + s.gross_pay, 0), draft = sl.filter(s => s.docstatus === 0).reduce((a, s) => a + s.gross_pay, 0);
    const gl = db['GL Entry'].filter(g => SAR.includes(g.company) && /^Salary/.test(g.account)).reduce((a, g) => a + g.debit - g.credit, 0);
    H.assert.equal(await t.kpiVal(0), money(gross) + 'SAR'); H.ok('total gross = SAR-company slips overlapping the period (' + money(gross) + '; AED company left out)');
    H.assert.equal(await t.kpiVal(1), money(gl) + 'SAR'); H.ok('posted payroll expense = accrual GL on Expense accounts (' + money(gl) + ')');
    H.assert.equal(await t.kpiVal(2), money(draft) + 'SAR'); H.ok('draft (not posted) gross shown apart (' + money(draft) + ')');
    H.assert.equal(await t.kpiVal(5), '1'); H.ok('pending leave requests in the period, AED employees excluded (1)');
    const P = pending(db); H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P.all)); H.ok('pending = ' + JSON.stringify(P));
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Not included \(other currency\): DM Gulf \(AED\)/); H.ok('AED company named in the banner');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('button.dms-split-row[data-v="pa:cc:Projects - DMC"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const nDmc = slips(db).filter(s => s.payroll_entry && s.payroll_entry.indexOf('DMC') > 0).length;
    H.assert.match(await t.$('.dms-modal').innerText(), new RegExp(fmt(nDmc) + ' rows')); H.ok('cost-center bar lists its ' + nDmc + ' salary slips');
    await t.$('.dms-modal [data-act="prow"]').first().click(); await t.idle(); await t.page.waitForTimeout(200);
    H.assert.match(await t.$('.dms-modal').innerText(), /Earnings[\s\S]*Basic[\s\S]*Deductions[\s\S]*GOSI/); H.assert.equal(await t.$('.dms-modal [data-act="ovback"]').count(), 1); H.ok('slip detail opens on top with earnings/deductions and Back');
    await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="register"]').click(); await t.idle();
    await t.$('[data-act="pseg"][data-v="reg|st|draft"]').click(); await t.idle(); await t.page.waitForTimeout(200);
    H.assert.match(await t.$('[data-ref="content"]').innerText(), new RegExp(fmt(slips(db).filter(s => s.docstatus === 0).length) + ' rows')); H.ok('register filtered to draft slips');
    await t.$('[data-act="tab"][data-v="components"]').click(); await t.idle(); await t.page.waitForTimeout(200);
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Components reconcile to slip gross/); H.ok('components reconcile to slip gross (reportview join)');
    await t.$('[data-act="tab"][data-v="employees"]').click(); await t.idle(); await t.page.waitForTimeout(200);
    await t.$('[data-act="prow"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle(); await t.page.waitForTimeout(200);
    await t.$('.dms-modal [data-act="pseg"][data-v="em|attendance"]').click(); await t.idle(); await t.page.waitForTimeout(300);
    H.assert.ok(await t.$('.dms-modal .cal .d').count() > 28); H.ok('employee dialog: attendance calendar from check-ins');
    await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="controls"]').click(); await t.idle(); await t.page.waitForTimeout(200);
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Duplicate salary slips[\s\S]*Pending leave requests/); H.ok('controls list duplicates and pending leave');
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('DM Gulf'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle(); await t.page.waitForTimeout(300);
    H.assert.match(await t.kpiVal(0), /AED$|SAR$/); H.assert.doesNotMatch(await t.$('[data-ref="banner"]').innerText(), /Not included/); H.ok('choosing the AED company scopes to it and drops the banner');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  },
  quiet: () => { const db = build(); db['Salary Slip'] = db['Salary Slip'].filter(s => s.docstatus === 1 && s.payroll_entry && s.name !== 'SS-OCT-2b' && s.employee !== 'HR-EMP-005'); db['Payroll Entry'].forEach(p => { p.salary_slips_submitted = p.salary_slips_created; }); db['Leave Application'] = db['Leave Application'].filter(a => a.status === 'Approved' && a.docstatus === 1); return db; }
});
