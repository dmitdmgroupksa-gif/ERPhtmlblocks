// =====================================================================
// CUSTOM HTML BLOCK  ->  field "Script"
// Shows the full Treasury dashboard inside a Workspace page.
// Uses the same API Server Script: treasury_dashboard_data
// `root_element` is provided by Frappe (shadow root of the block).
//
// UAT fixes included:
//  1. Overview overdue-AP alert has a "View overdue suppliers" button
//  2. AP supplier list has a total row (ties to the KPI card)
//  3. Click handler for the drill-down
//  4. EN / AR toggle (labels + RTL layout), choice remembered per browser
//  5. Month heading, week labels and chart series follow the language
// =====================================================================

// ---- safe localStorage helpers (storage can be blocked) ----
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

const S = root_element.__S || (root_element.__S = {
    company: '', from: '', to: '', incl: 0, tab: 'overview', view: 'planned', apBucket: 'all',
    data: null, fc: null, months: null, fcLoading: 0, lang: ''
});
if (!S.lang) S.lang = lsGet('td_lang', 'en') === 'ar' ? 'ar' : 'en';
if (!S.from) S.from = frappe.datetime.add_days(frappe.datetime.get_today(), -30);
if (!S.to) S.to = frappe.datetime.add_days(frappe.datetime.get_today(), 30);

// ---------------------------------------------------------------------
// Translations (EN / AR). Add a key to both languages to translate more.
// Text that comes from the Server Script (alert titles/text, scheduled
// payment labels, account names) is shown as the server sends it.
// ---------------------------------------------------------------------
const T = {
    en: {
        title: 'TREASURY', sub: 'GROUP CASH MANAGEMENT', live: 'LIVE',
        consolidated: 'Consolidated bank & cash balances', available: 'Available liquidity',
        buffer: 'Minimum cash buffer', edit: '✎ Edit', edit_title: 'Change minimum cash buffer',
        restricted: 'Restricted / blocked', group: 'Group consolidated', from: 'From', to: 'To',
        incl: 'Count overdue receipts as collectible now', refresh: '↻ Refresh', settings: '⚙ Settings',
        tab_overview: '▦ Overview', tab_banks: '🏛 Bank accounts', tab_cash: '📈 Cash flow', tab_ap: '🧾 AP & payments', tab_forecast: '📅 Monthly forecast',
        excluded: 'Excluded companies', none: 'none',
        footnote: 'Balances from GL entries on Bank/Cash accounts; planned items from Sales/Purchase Invoice due dates, Salary Slips, Expense Claims and Treasury Planned Payments.',
        loading: 'Loading treasury data...', load_error: 'Could not load treasury data. Check the role and the Server Script.',
        ack: 'Acknowledge alert', view_overdue: 'View overdue suppliers',
        k_receipts7: '↙ Expected receipts · 7 days', k_payments7: '↗ Expected payments · 7 days',
        k_open_ap: 'Open AP', k_on_hold: '{x} on hold', k_payroll: 'Month-end payroll', estimate: '(estimate)',
        daily_cf: 'Daily cash flow', actual_past: 'Actual (past)', planned_to: 'Planned (to {x})',
        banks_h: 'Bank & cash accounts', search_bank: 'Search bank / account',
        account: 'Account', bank: 'Bank', company: 'Company', type: 'Type', ccy: 'Ccy',
        bal_ac: 'Balance (acct ccy)', bal_cur: 'Balance ({x})', avail_col: 'Available', last_txn: 'Last txn', total: 'Total',
        banks_note: 'Accounts with zero balance are hidden. Click a row to open its General Ledger.',
        cash_actual_h: 'Actual daily receipts & payments ({a} - {b})', cash_planned_h: 'Planned daily cash flow ({a} - {b})',
        date: 'Date', receipts: 'Receipts', payments: 'Payments', net: 'Net', closing_bal: 'Closing balance',
        total_days: 'Total ({n} days)', ap_due: 'AP due', payroll: 'Payroll', other: 'Other', proj_closing: 'Projected closing',
        planned_note: "Rows shaded red fall below the minimum cash buffer. Overdue AP is shown on today's date.",
        b_all: 'All open AP', b_overdue: 'Overdue', b_0_7: 'Due in 0-7 days', b_8_14: '8-14 days', b_15_30: '15-30 days', b_31_60: '31-60 days', b_61_90: '61-90 days',
        ap_h: 'Suppliers by oldest due invoice', search_sup: 'Search supplier', oldest_due: 'Oldest due date', supplier: 'Supplier',
        days: 'Days', outstanding: 'Outstanding', status: 'Status', st_hold: 'On hold', st_overdue: 'Overdue', st_sched: 'Scheduled', late: 'late',
        no_ap: 'No outstanding supplier balances', total_suppliers: 'Total ({n} suppliers)',
        ap_note: 'Click a supplier to see all its outstanding invoices. The total covers the selected bucket (ignores the search box).',
        pay_h: 'Payroll & other planned outflows', add_planned: '+ Planned payment', ref: 'Ref', desc: 'Description', amount: 'Amount',
        nothing: 'Nothing scheduled', overdue_p: '(overdue)', est_payroll: '(estimate from last payroll)',
        dlg_title: '{x} - outstanding invoices', due_date: 'Due date', invoice: 'Invoice', bill_no: 'Bill no', total_invoices: 'Total ({n} invoices)',
        fc_loading: 'Loading monthly forecast...', fc_error: 'Could not load the monthly forecast.', fc_h: '{m} - weekly forecast', export_csv: 'Export CSV',
        week: 'Week', period: 'Period', basis: 'Basis', opening: 'Opening', closing: 'Closing', buffer_col: 'Buffer', below: '⚠ Below', ok: 'OK',
        k_actual: 'Actual', k_planned: 'Planned', k_both: 'Actual + planned', month_total: 'Month total',
        fc_note: 'Weeks are 1-7, 8-14, 15-21, 22-28 and 29-month end. Days before today are actual; today onward is planned. Red rows dip below the minimum cash buffer.',
        c_receipts: 'Receipts', c_payments: 'Payments', c_closing_bal: 'Closing balance', c_pay_full: 'Payments (AP+payroll+other)',
        c_proj: 'Projected closing', c_buffer: 'Minimum buffer', c_balance: 'Balance', c_outflows: 'Outflows', c_closing: 'Closing', c_buf: 'Buffer',
        prompt_title: 'Minimum cash buffer', prompt_save: 'Save', buf_saved: 'Minimum cash buffer saved'
    },
    ar: {
        title: 'الخزينة', sub: 'إدارة النقد للمجموعة', live: 'مباشر',
        consolidated: 'أرصدة البنوك والنقد الموحدة', available: 'السيولة المتاحة',
        buffer: 'الحد الأدنى للنقد', edit: '✎ تعديل', edit_title: 'تغيير الحد الأدنى للنقد',
        restricted: 'مقيّد / محجوز', group: 'المجموعة الموحدة', from: 'من', to: 'إلى',
        incl: 'احتساب المقبوضات المتأخرة كقابلة للتحصيل الآن', refresh: '↻ تحديث', settings: '⚙ الإعدادات',
        tab_overview: '▦ نظرة عامة', tab_banks: '🏛 الحسابات البنكية', tab_cash: '📈 التدفق النقدي', tab_ap: '🧾 الذمم الدائنة والمدفوعات', tab_forecast: '📅 التوقع الشهري',
        excluded: 'الشركات المستثناة', none: 'لا يوجد',
        footnote: 'الأرصدة من قيود الأستاذ العام لحسابات البنك والنقد؛ والبنود المخططة من تواريخ استحقاق فواتير البيع والشراء وقسائم الرواتب ومطالبات المصروفات والمدفوعات المخططة للخزينة.',
        loading: 'جارٍ تحميل بيانات الخزينة...', load_error: 'تعذر تحميل بيانات الخزينة. تحقق من الصلاحيات والسكربت.',
        ack: 'تأكيد الاطلاع', view_overdue: 'عرض الموردين المتأخرين',
        k_receipts7: '↙ المقبوضات المتوقعة · 7 أيام', k_payments7: '↗ المدفوعات المتوقعة · 7 أيام',
        k_open_ap: 'الذمم الدائنة المفتوحة', k_on_hold: '{x} معلّقة', k_payroll: 'رواتب نهاية الشهر', estimate: '(تقديري)',
        daily_cf: 'التدفق النقدي اليومي', actual_past: 'الفعلي (السابق)', planned_to: 'المخطط (حتى {x})',
        banks_h: 'الحسابات البنكية والنقدية', search_bank: 'بحث عن بنك / حساب',
        account: 'الحساب', bank: 'البنك', company: 'الشركة', type: 'النوع', ccy: 'العملة',
        bal_ac: 'الرصيد (عملة الحساب)', bal_cur: 'الرصيد ({x})', avail_col: 'المتاح', last_txn: 'آخر حركة', total: 'الإجمالي',
        banks_note: 'الحسابات ذات الرصيد صفر مخفية. اضغط على صف لفتح دفتر الأستاذ العام.',
        cash_actual_h: 'المقبوضات والمدفوعات اليومية الفعلية ({a} - {b})', cash_planned_h: 'التدفق النقدي اليومي المخطط ({a} - {b})',
        date: 'التاريخ', receipts: 'المقبوضات', payments: 'المدفوعات', net: 'الصافي', closing_bal: 'الرصيد الختامي',
        total_days: 'الإجمالي ({n} يوم)', ap_due: 'مستحقات الموردين', payroll: 'الرواتب', other: 'أخرى', proj_closing: 'الرصيد الختامي المتوقع',
        planned_note: 'الصفوف المظللة بالأحمر أقل من الحد الأدنى للنقد. الذمم المتأخرة تظهر في تاريخ اليوم.',
        b_all: 'كل الذمم المفتوحة', b_overdue: 'متأخرة', b_0_7: 'مستحقة خلال 0-7 أيام', b_8_14: '8-14 يوم', b_15_30: '15-30 يوم', b_31_60: '31-60 يوم', b_61_90: '61-90 يوم',
        ap_h: 'الموردون حسب أقدم فاتورة مستحقة', search_sup: 'بحث عن مورد', oldest_due: 'أقدم تاريخ استحقاق', supplier: 'المورد',
        days: 'الأيام', outstanding: 'المستحق', status: 'الحالة', st_hold: 'معلّقة', st_overdue: 'متأخرة', st_sched: 'مجدولة', late: 'تأخير',
        no_ap: 'لا توجد أرصدة مستحقة للموردين', total_suppliers: 'الإجمالي ({n} مورد)',
        ap_note: 'اضغط على المورد لعرض كل فواتيره المستحقة. الإجمالي يخص الفئة المحددة (ولا يتأثر بالبحث).',
        pay_h: 'الرواتب والمدفوعات المخططة الأخرى', add_planned: '+ دفعة مخططة', ref: 'المرجع', desc: 'الوصف', amount: 'المبلغ',
        nothing: 'لا توجد بنود مجدولة', overdue_p: '(متأخرة)', est_payroll: '(تقدير من آخر رواتب)',
        dlg_title: '{x} - الفواتير المستحقة', due_date: 'تاريخ الاستحقاق', invoice: 'الفاتورة', bill_no: 'رقم فاتورة المورد', total_invoices: 'الإجمالي ({n} فاتورة)',
        fc_loading: 'جارٍ تحميل التوقع الشهري...', fc_error: 'تعذر تحميل التوقع الشهري.', fc_h: '{m} - التوقع الأسبوعي', export_csv: 'تصدير CSV',
        week: 'الأسبوع', period: 'الفترة', basis: 'الأساس', opening: 'الافتتاحي', closing: 'الختامي', buffer_col: 'الحد الأدنى', below: '⚠ أقل', ok: 'سليم',
        k_actual: 'فعلي', k_planned: 'مخطط', k_both: 'فعلي + مخطط', month_total: 'إجمالي الشهر',
        fc_note: 'الأسابيع: 1-7 و8-14 و15-21 و22-28 و29-نهاية الشهر. الأيام قبل اليوم فعلية ومن اليوم فصاعدًا مخططة. الصفوف الحمراء أقل من الحد الأدنى للنقد.',
        c_receipts: 'المقبوضات', c_payments: 'المدفوعات', c_closing_bal: 'الرصيد الختامي', c_pay_full: 'المدفوعات (ذمم+رواتب+أخرى)',
        c_proj: 'الرصيد الختامي المتوقع', c_buffer: 'الحد الأدنى', c_balance: 'الرصيد', c_outflows: 'المدفوعات الخارجة', c_closing: 'الختامي', c_buf: 'الحد الأدنى',
        prompt_title: 'الحد الأدنى للنقد', prompt_save: 'حفظ', buf_saved: 'تم حفظ الحد الأدنى للنقد'
    }
};
const tx = (k, p) => {
    let s = (T[S.lang] && T[S.lang][k]) || T.en[k] || k;
    if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
    return s;
};
const isAr = () => S.lang === 'ar';
const monthName = () => {
    try { return new Date().toLocaleDateString(isAr() ? 'ar-u-ca-gregory-nu-latn' : 'en-US', { month: 'long', year: 'numeric' }); }
    catch (e) { return moment().format('MMMM YYYY'); }
};

// The server script works with "days back / days ahead", so the date filter is converted to that.
function horizonDays() { return Math.max(1, frappe.datetime.get_diff(S.to, frappe.datetime.get_today())); }
function lookbackDays() { return Math.max(1, frappe.datetime.get_diff(frappe.datetime.get_today(), S.from)); }

const esc = (s) => frappe.utils.escape_html(s == null ? '' : String(s));
const money = (v, c) => format_currency(v || 0, c, 0);
const compact = (v) => {
    const a = Math.abs(v || 0), s = v < 0 ? '-' : '';
    if (a >= 1e6) return s + (a / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return s + Math.round(a / 1e3) + 'K';
    return s + Math.round(a);
};
const nice = (d) => frappe.datetime.str_to_user(d);
const link = (dt, dn) => `<a href="/app/${frappe.router.slug(dt)}/${encodeURIComponent(dn)}" target="_blank">${esc(dn)}</a>`;
const getDismissed = () => { try { return JSON.parse(lsGet('td_dismissed', '[]')); } catch (e) { return []; } };

const CSS = `<style>
.td-root{--g:#143c37;--g2:#d9ece5;--bd:var(--border-color,#e3e3e3);font-size:13px;color:var(--text-color,#222)}
.td-root a{color:inherit;text-decoration:underline}
.td-hero{background:var(--g);color:#fff;border-radius:14px;padding:18px 20px;margin-bottom:14px}
.td-hero small{opacity:.75;display:block}.td-top{display:flex;justify-content:space-between;align-items:center}
.td-title{font-size:20px;font-weight:700}.td-big{font-size:34px;font-weight:700;margin:2px 0 4px}
.td-badge{background:rgba(255,255,255,.14);padding:2px 8px;border-radius:10px;font-size:11px}
.td-two{display:flex;gap:40px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.2);margin-top:12px;padding-top:12px}
.td-two b{display:block;font-size:20px}
.td-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.td-bar select,.td-bar input[type=text],.td-bar input[type=date]{border-radius:18px;padding:6px 12px;border:1px solid var(--bd);background:var(--card-bg,#fff);color:inherit;font-size:13px}
.td-bar .td-dl{color:var(--text-muted,#777);font-size:12px}
.td-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px}
.td-tab{padding:10px;border-radius:8px;background:var(--control-bg,#f3f3f3);text-align:center;cursor:pointer;font-weight:500}
.td-tab.on{background:var(--g2);color:#0d2f2a}
.td-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:12px}
.td-card{border:1px solid var(--bd);border-radius:10px;padding:12px 14px;background:var(--card-bg,#fff)}
.td-card .l{color:var(--text-muted,#777);font-size:12px}.td-card .v{font-size:22px;font-weight:700;margin-top:4px}
.td-card.click{cursor:pointer}.td-card.sel{outline:2px solid var(--g)}
.td-alert{border:1px solid #c9a227;border-radius:10px;padding:10px 14px;margin-bottom:10px;background:var(--card-bg,#fff)}
.td-alert.danger{border-color:#c0392b}.td-alert b{display:block}
.td-btn{border:1px solid var(--bd);background:var(--control-bg,#f3f3f3);color:inherit;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:12px;margin-top:6px}
.td-tbl{width:100%;border-collapse:collapse}.td-tbl th,.td-tbl td{padding:7px 9px;border-bottom:1px solid var(--bd);text-align:start}
.td-tbl th{background:var(--control-bg,#f6f6f6);position:sticky;top:0}.td-tbl .n{text-align:end;white-space:nowrap}
.td-tbl tr.clk{cursor:pointer}.td-tbl tfoot td{font-weight:700}
.td-sup{cursor:pointer;text-decoration:underline;font-weight:500}
.td-neg{color:#c0392b}.td-pos{color:#1a7f4b}.td-warn{background:#fdecea}
.td-h{font-size:16px;font-weight:600;margin:16px 0 8px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.td-scroll{max-height:460px;overflow:auto;border:1px solid var(--bd);border-radius:8px}
.td-pill{border:1px solid var(--bd);border-radius:14px;padding:3px 10px;cursor:pointer;margin-inline-start:4px;font-size:12px}.td-pill.on{background:var(--g2);color:#0d2f2a}
.td-edit{cursor:pointer;margin-inline-start:6px;padding:1px 7px;border:1px solid rgba(255,255,255,.5);border-radius:10px;font-size:11px;opacity:1}
.td-chart{direction:ltr}
.td-chart .chart-legend{display:none}
.td-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:6px;font-size:12px}
.td-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-inline-end:5px}
.td-note{color:var(--text-muted,#777);font-size:12px;margin-top:6px}
/* ==== DM shell standard v1 · generated by tools/erp/shell/apply_shell.py · do not edit by hand ==== */
.td-root.td-root { --dms-navy: #0f2147; --dms-navy2: #1a3263; --dms-royal: #2b4fc1; --dms-royal-ink: #1d3a9f; --dms-line: #d8dee7; --dms-paper: #fff; --dms-paper2: #f6f8fb; --dms-ink: #16202e; --dms-ink2: #47556a; }
.td-root.td-root .td-tabs { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; overflow-x: auto; scrollbar-width: thin; background: var(--dms-royal); border: 0; border-radius: 12px; padding: 5px; margin: 0 0 12px; box-shadow: 0 10px 24px -14px rgb(20 40 130 / 70%); min-height: 0; }
.td-root.td-root .td-tabs .td-tab { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; background: transparent; color: rgb(255 255 255 / 90%); border: 0; border-radius: 8px; padding: 8px 14px; min-height: 36px; margin: 0; font-weight: 500; font-size: 13px; box-shadow: none; text-decoration: none; cursor: pointer; }
.td-root.td-root .td-tabs .td-tab:hover { background: rgb(255 255 255 / 16%); color: #fff; }
.td-root.td-root .td-tabs .td-tab.on { background: #fff; color: var(--dms-royal-ink); font-weight: 600; box-shadow: 0 4px 12px -6px rgb(10 25 90 / 60%); border: 0; }
.td-root.td-root .td-bar { background: var(--dms-paper); color: var(--dms-ink); border: 1px solid var(--dms-line); border-radius: 12px; padding: 12px 14px; margin: 0 0 12px; box-shadow: 0 1px 2px rgb(16 24 40 / 6%), 0 4px 14px -6px rgb(16 24 40 / 12%); }
.td-root.td-root .td-bar label { display: grid; gap: 4px; align-content: end; min-width: 0; margin: 0; color: var(--dms-ink2); font-size: 12px; font-weight: 500; letter-spacing: 0; text-transform: none; max-width: none; }
.td-root.td-root .td-bar label > span { color: inherit; font-size: inherit; }
.td-root.td-root .td-bar select, .td-root.td-root .td-bar input:not([type=checkbox]):not([type=radio]) { width: 100%; height: 38px; min-height: 38px; padding: 0 10px; border: 1px solid var(--dms-line); border-radius: 8px; background: var(--dms-paper2); color: var(--dms-ink); font-size: 13px; box-sizing: border-box; box-shadow: none; }
.td-root.td-root .td-bar .td-btn { min-height: 38px; border-radius: 8px; align-self: end; }
@media (max-width: 760px) { .td-root.td-root .td-tabs { flex-wrap: nowrap; } }
.td-root.td-root .td-tabs { display: flex; }
.td-root.td-root .td-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.td-root.td-root .td-bar :is(select, input:not([type=checkbox]):not([type=radio])) { width: auto; min-width: 150px; }
.td-root.td-root .td-hero { background: linear-gradient(120deg, #0f2147, #1a3263); color: #fff; border-radius: 14px; }
/* ==== end DM shell standard v1 ==== */
/* ==== DM dark theme v1 · generated by tools/erp/shell/dark_theme.py · do not edit by hand ==== */
:host([data-dms-theme="dark"]) .td-root { color-scheme: dark; }
html[data-theme="dark"] .td-root { color-scheme: dark; }
:host([data-dms-theme="dark"]) .td-root, html[data-theme="dark"] .td-root { color: var(--text-color,#d3d3d3); }
:host([data-dms-theme="dark"]) .td-badge, html[data-theme="dark"] .td-badge { background: rgb(255 255 255 / 4%); }
:host([data-dms-theme="dark"]) .td-two, html[data-theme="dark"] .td-two { border-top: 1px solid rgb(56 56 56 / 20%); }
:host([data-dms-theme="dark"]) .td-bar select, html[data-theme="dark"] .td-bar select, :host([data-dms-theme="dark"]) .td-bar input[type=text], html[data-theme="dark"] .td-bar input[type=text], :host([data-dms-theme="dark"]) .td-bar input[type=date], html[data-theme="dark"] .td-bar input[type=date] { background: var(--card-bg,#1a1a1a); }
:host([data-dms-theme="dark"]) .td-bar .td-dl, html[data-theme="dark"] .td-bar .td-dl { color: var(--text-muted,#a4a4a4); }
:host([data-dms-theme="dark"]) .td-tab, html[data-theme="dark"] .td-tab { background: var(--control-bg,#232323); }
:host([data-dms-theme="dark"]) .td-tab.on, html[data-theme="dark"] .td-tab.on { background: #273933; color: #cff3ee; }
:host([data-dms-theme="dark"]) .td-card, html[data-theme="dark"] .td-card { background: var(--card-bg,#1a1a1a); }
:host([data-dms-theme="dark"]) .td-card .l, html[data-theme="dark"] .td-card .l { color: var(--text-muted,#a4a4a4); }
:host([data-dms-theme="dark"]) .td-alert, html[data-theme="dark"] .td-alert { background: var(--card-bg,#1a1a1a); }
:host([data-dms-theme="dark"]) .td-btn, html[data-theme="dark"] .td-btn { background: var(--control-bg,#232323); }
:host([data-dms-theme="dark"]) .td-tbl th, html[data-theme="dark"] .td-tbl th { background: var(--control-bg,#212121); }
:host([data-dms-theme="dark"]) .td-neg, html[data-theme="dark"] .td-neg { color: #e48177; }
:host([data-dms-theme="dark"]) .td-pos, html[data-theme="dark"] .td-pos { color: #7de8b1; }
:host([data-dms-theme="dark"]) .td-warn, html[data-theme="dark"] .td-warn { background: #321613; }
:host([data-dms-theme="dark"]) .td-pill.on, html[data-theme="dark"] .td-pill.on { background: #273933; color: #cff3ee; }
:host([data-dms-theme="dark"]) .td-edit, html[data-theme="dark"] .td-edit { border: 1px solid rgb(56 56 56 / 50%); }
:host([data-dms-theme="dark"]) .td-note, html[data-theme="dark"] .td-note { color: var(--text-muted,#a4a4a4); }
:host([data-dms-theme="dark"]) .td-root.td-root .td-tabs, html[data-theme="dark"] .td-root.td-root .td-tabs { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; overflow-x: auto; scrollbar-width: thin; background: var(--dms-royal); border: 0; border-radius: 12px; padding: 5px; margin: 0 0 12px; box-shadow: 0 10px 24px -14px rgb(20 40 130 / 70%); min-height: 0; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-tabs .td-tab, html[data-theme="dark"] .td-root.td-root .td-tabs .td-tab { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; background: transparent; color: rgb(255 255 255 / 90%); border: 0; border-radius: 8px; padding: 8px 14px; min-height: 36px; margin: 0; font-weight: 500; font-size: 13px; box-shadow: none; text-decoration: none; cursor: pointer; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-tabs .td-tab:hover, html[data-theme="dark"] .td-root.td-root .td-tabs .td-tab:hover { background: rgb(255 255 255 / 16%); color: #fff; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-tabs .td-tab.on, html[data-theme="dark"] .td-root.td-root .td-tabs .td-tab.on { background: #fff; color: var(--dms-royal-ink); font-weight: 600; box-shadow: 0 4px 12px -6px rgb(10 25 90 / 60%); border: 0; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-bar label > span, html[data-theme="dark"] .td-root.td-root .td-bar label > span { color: inherit; font-size: inherit; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-bar .td-btn, html[data-theme="dark"] .td-root.td-root .td-bar .td-btn { min-height: 38px; border-radius: 8px; align-self: end; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-tabs, html[data-theme="dark"] .td-root.td-root .td-tabs { display: flex; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-bar, html[data-theme="dark"] .td-root.td-root .td-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-bar :is(select, html[data-theme="dark"] .td-root.td-root .td-bar :is(select, :host([data-dms-theme="dark"]) input:not([type=checkbox]):not([type=radio])), html[data-theme="dark"] input:not([type=checkbox]):not([type=radio])) { width: auto; min-width: 150px; }
:host([data-dms-theme="dark"]) .td-root.td-root .td-hero, html[data-theme="dark"] .td-root.td-root .td-hero { background: linear-gradient(120deg, #0f2147, #1a3263); color: #fff; border-radius: 14px; }
:host([data-dms-theme="dark"]) .td-root .td-bar { background: #18202b !important; color: #e7ecf3; border-color: #2e3a49 !important; }
:host([data-dms-theme="dark"]) .td-root .td-bar :is(select, input:not([type=checkbox]):not([type=radio])) { background: #1e2834 !important; color: #e7ecf3 !important; border-color: #2e3a49 !important; }
:host([data-dms-theme="dark"]) .td-root .td-bar :is(label, label > :is(label, span)) { color: #b3bfce !important; }
html[data-theme="dark"] .td-root .td-bar { background: #18202b !important; color: #e7ecf3; border-color: #2e3a49 !important; }
html[data-theme="dark"] .td-root .td-bar :is(select, input:not([type=checkbox]):not([type=radio])) { background: #1e2834 !important; color: #e7ecf3 !important; border-color: #2e3a49 !important; }
html[data-theme="dark"] .td-root .td-bar :is(label, label > :is(label, span)) { color: #b3bfce !important; }
/* ==== end DM dark theme v1 ==== */
</style>`;

// small self-contained SVG chart (bars + lines), no external library needed
function svgChart(labels, series) {
    const W = 900, H = 240, L = 60, R = 10, T0 = 10, B = 28, iw = W - L - R, ih = H - T0 - B;
    const all = [].concat(...series.map(s => s.values));
    let mx = Math.max(0, ...all), mn = Math.min(0, ...all);
    if (mx === mn) mx = mn + 1;
    const y = (v) => T0 + ih - (v - mn) / (mx - mn) * ih;
    const n = labels.length, step = iw / Math.max(n, 1);
    const bars = series.filter(s => s.type === 'bar'), lines = series.filter(s => s.type === 'line');
    let g = '';
    for (let i = 0; i <= 4; i++) {
        const v = mn + (mx - mn) * i / 4;
        g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".12"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="currentColor">${compact(v)}</text>`;
    }
    bars.forEach((s, bi) => {
        const bw = step * 0.7 / bars.length;
        s.values.forEach((v, i) => {
            const x = L + i * step + step * 0.15 + bi * bw, y0 = y(0), y1 = y(v);
            g += `<rect x="${x}" y="${Math.min(y0, y1)}" width="${Math.max(bw - 1, 1)}" height="${Math.abs(y0 - y1)}" fill="${s.color}"><title>${esc(labels[i])} · ${esc(s.name)}: ${compact(v)}</title></rect>`;
        });
    });
    lines.forEach(s => {
        const pts = s.values.map((v, i) => `${L + i * step + step / 2},${y(v)}`).join(' ');
        g += `<polyline fill="none" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="5 4"' : ''} points="${pts}"/>`;
    });
    const every = Math.ceil(n / 12);
    labels.forEach((l, i) => { if (i % every === 0) g += `<text x="${L + i * step + step / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="currentColor">${esc(l)}</text>`; });
    const legend = series.map(s => `<span style="margin-inline-end:12px"><i style="display:inline-block;width:10px;height:10px;background:${s.color};margin-inline-end:4px"></i>${esc(s.name)}</span>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${g}</svg><div class="td-note">${legend}</div>`;
}
const lab = (arr) => arr.map(r => nice(r.date).slice(0, 5));

// Same frappe.Chart look as the form version. The block lives in a shadow DOM,
// so the chart stylesheet rules are copied into the block.
const CHART_CSS = (function () {
    let css = '';
    const keys = ['chart-container', 'graph-svg-tip', 'chart-legend'];
    for (const sh of Array.from(document.styleSheets)) {
        try {
            for (const r of Array.from(sh.cssRules)) {
                const t = r.cssText || '';
                if (keys.some(k => t.indexOf(k) > -1)) css += t + '\n';
            }
        } catch (e) { /* cross-origin sheet, skip */ }
    }
    return '<style>' + css + '</style>';
})();

// bank accounts with a zero balance are hidden everywhere
const liveAccounts = (d) => d.accounts.filter(a => Math.abs(a.balance || 0) >= 0.5 || Math.abs(a.balance_ac || 0) >= 0.5);

// ---- this month's weekly forecast: actual days before today + planned days from today ----
function monthsFrom(fc) {
    const today = frappe.datetime.get_today(), buf = fc.summary.buffer;
    const mStart = moment().startOf('month').format('YYYY-MM-DD'), mEnd = moment().endOf('month').format('YYYY-MM-DD');
    const days = {};
    (fc.actual_daily || []).forEach(r => {
        if (r.date < today && r.date >= mStart) days[r.date] = { receipts: r.receipts || 0, payments: r.payments || 0, closing: r.closing, actual: 1 };
    });
    (fc.planned_daily || []).forEach(r => {
        if (r.date >= today && r.date <= mEnd) days[r.date] = { receipts: r.receipts || 0,
            payments: r.payments != null ? r.payments : (r.ap || 0) + (r.payroll || 0) + (r.other || 0), closing: r.closing, actual: 0 };
    });
    const map = {}, out = [];
    Object.keys(days).sort().forEach(dt => {
        const r = days[dt], wk = Math.ceil(parseInt(dt.slice(8, 10), 10) / 7);
        let m = map[wk];
        if (!m) {
            m = map[wk] = { wk: wk, from: dt, to: dt, receipts: 0, payments: 0, closing: 0, min: r.closing, nA: 0, nP: 0,
                opening: r.closing - (r.receipts - r.payments) };
            out.push(m);
        }
        m.to = dt; m.receipts += r.receipts; m.payments += r.payments; m.closing = r.closing;
        m.min = Math.min(m.min, r.closing); r.actual ? m.nA++ : m.nP++;
    });
    out.forEach(m => {
        m.net = m.receipts - m.payments;
        m.below_buffer = m.min < buf;
        m.kind = m.nA && m.nP ? 'k_both' : m.nA ? 'k_actual' : 'k_planned';
    });
    return out;
}
const weekLabel = (m) => tx('week') + ' ' + m.wk;

function chartCfgs(d) {
    const accts = liveAccounts(d).slice(0, 12);
    const cfg = {
        actual: { type: 'axis-mixed', colors: ['#1a7f4b', '#c0392b', '#143c37'], data: { labels: lab(d.actual_daily), datasets: [
            { name: tx('c_receipts'), chartType: 'bar', values: d.actual_daily.map(r => r.receipts) },
            { name: tx('c_payments'), chartType: 'bar', values: d.actual_daily.map(r => r.payments) },
            { name: tx('c_closing_bal'), chartType: 'line', values: d.actual_daily.map(r => r.closing) }] } },
        planned: { type: 'axis-mixed', colors: ['#1a7f4b', '#c0392b', '#143c37', '#e0a800'], data: { labels: lab(d.planned_daily), datasets: [
            { name: tx('c_receipts'), chartType: 'bar', values: d.planned_daily.map(r => r.receipts) },
            { name: tx('c_pay_full'), chartType: 'bar', values: d.planned_daily.map(r => r.payments) },
            { name: tx('c_proj'), chartType: 'line', values: d.planned_daily.map(r => r.closing) },
            { name: tx('c_buffer'), chartType: 'line', values: d.planned_daily.map(() => d.summary.buffer) }] },
            lineOptions: { regionFill: 0, hideDots: 1 } },
        banks: { type: 'bar', height: 220, colors: ['#143c37'], data: { labels: accts.map(a => a.account.split(' - ')[0].slice(0, 18)),
            datasets: [{ name: tx('c_balance'), values: accts.map(a => a.balance) }] } }
    };
    if (S.months && S.months.length) {
        cfg.months = { type: 'axis-mixed', colors: ['#1a7f4b', '#c0392b', '#143c37', '#e0a800'], data: { labels: S.months.map(weekLabel), datasets: [
            { name: tx('c_receipts'), chartType: 'bar', values: S.months.map(m => m.receipts) },
            { name: tx('c_outflows'), chartType: 'bar', values: S.months.map(m => m.payments) },
            { name: tx('c_closing'), chartType: 'line', values: S.months.map(m => m.closing) },
            { name: tx('c_buf'), chartType: 'line', values: S.months.map(() => d.summary.buffer) }] },
            lineOptions: { hideDots: 1 } };
    }
    return cfg;
}
const actualChart = () => '<div class="td-chart" data-kind="actual"></div>';
const plannedChart = () => '<div class="td-chart" data-kind="planned"></div>';
const monthsChart = () => '<div class="td-chart" data-kind="months"></div>';

function svgFallback(c) {
    return svgChart(c.data.labels, c.data.datasets.map((ds, i) => ({ name: ds.name, type: ds.chartType, color: c.colors[i], values: ds.values })));
}
function drawCharts() {
    const cfg = chartCfgs(S.data);
    root_element.querySelectorAll('.td-chart').forEach(el => {
        const c = cfg[el.dataset.kind];
        if (!c) return;
        try {
            new frappe.Chart(el, Object.assign({ height: 260, axisOptions: { xIsSeries: 1 }, showLegend: 0 }, c));
            // own legend so the full series names are shown (the built-in one cuts long names)
            if (c.data.datasets.length > 1) {
                el.insertAdjacentHTML('beforeend', '<div class="td-legend" dir="' + (isAr() ? 'rtl' : 'ltr') + '">' + c.data.datasets.map((ds, i) =>
                    `<span><i style="background:${c.colors[i]}"></i>${esc(ds.name)}</span>`).join('') + '</div>');
            }
        } catch (e) { el.innerHTML = svgFallback(c); }
    });
}

function actualTable(d, cur, limit) {
    const rows = d.actual_daily.slice().reverse().slice(0, limit || 999);
    const trc = rows.reduce((a, r) => a + r.receipts, 0), tpy = rows.reduce((a, r) => a + r.payments, 0);
    return `<div class="td-scroll"><table class="td-tbl"><thead><tr><th>${tx('date')}</th><th class="n">${tx('receipts')}</th><th class="n">${tx('payments')}</th><th class="n">${tx('net')}</th><th class="n">${tx('closing_bal')}</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(nice(r.date))}</td><td class="n">${money(r.receipts, cur)}</td><td class="n">${money(r.payments, cur)}</td><td class="n ${r.net < 0 ? 'td-neg' : 'td-pos'}">${money(r.net, cur)}</td><td class="n">${money(r.closing, cur)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td>${tx('total_days', { n: rows.length })}</td><td class="n">${money(trc, cur)}</td><td class="n">${money(tpy, cur)}</td><td class="n">${money(trc - tpy, cur)}</td><td></td></tr></tfoot></table></div>`;
}
function plannedTable(d, cur, limit) {
    const rows = d.planned_daily.slice(0, limit || 999);
    return `<div class="td-scroll"><table class="td-tbl"><thead><tr><th>${tx('date')}</th><th class="n">${tx('receipts')}</th><th class="n">${tx('ap_due')}</th><th class="n">${tx('payroll')}</th><th class="n">${tx('other')}</th><th class="n">${tx('proj_closing')}</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="${r.closing < d.summary.buffer ? 'td-warn' : ''}"><td>${esc(nice(r.date))}</td><td class="n">${money(r.receipts, cur)}</td><td class="n">${money(r.ap, cur)}</td><td class="n">${money(r.payroll, cur)}</td><td class="n">${money(r.other, cur)}</td><td class="n">${money(r.closing, cur)}</td></tr>`).join('')}
    </tbody></table></div><div class="td-note">${tx('planned_note')}</div>`;
}

function tabOverview(d, cur) {
    const sm = d.summary, dismissed = getDismissed();
    let h = '';
    d.alerts.filter(a => !dismissed.includes(a.key)).forEach(a => {
        // overdue supplier payment alerts get a shortcut to the overdue supplier list
        const k = ((a.key || '') + ' ' + (a.title || '')).toLowerCase();
        const toAP = /overdue/.test(k) && /supplier|payable|payment|\bap\b/.test(k) && !/receipt/.test(k);
        h += `<div class="td-alert ${a.level}"><b>⚠ ${esc(a.title)}</b>${esc(a.text)}<div>${toAP ? `<button class="td-btn" data-apdrill="overdue" style="margin-inline-end:6px">${tx('view_overdue')}</button>` : ''}<button class="td-btn" data-ack="${esc(a.key)}">${tx('ack')}</button></div></div>`;
    });
    h += `<div class="td-kpis">
        <div class="td-card"><div class="l">${tx('k_receipts7')}</div><div class="v">${cur} ${compact(sm.receipts_7d)}</div></div>
        <div class="td-card"><div class="l">${tx('k_payments7')}</div><div class="v">${cur} ${compact(sm.payments_7d)}</div></div>
        <div class="td-card click" data-tab="ap"><div class="l">${tx('k_open_ap')}${sm.ap_held ? ' (' + tx('k_on_hold', { x: compact(sm.ap_held) }) + ')' : ''}</div><div class="v">${cur} ${compact(sm.open_ap)}</div></div>
        <div class="td-card"><div class="l">${tx('k_payroll')} ${sm.payroll_date ? '· ' + esc(nice(sm.payroll_date)) : ''} ${sm.payroll_est ? tx('estimate') : ''}</div><div class="v">${cur} ${compact(sm.payroll_amount)}</div></div></div>
        <div class="td-h"><span>${tx('daily_cf')}</span><span>
        <span class="td-pill ${S.view === 'actual' ? 'on' : ''}" data-view="actual">${tx('actual_past')}</span>
        <span class="td-pill ${S.view === 'planned' ? 'on' : ''}" data-view="planned">${tx('planned_to', { x: esc(nice(S.to)) })}</span></span></div>
        ${S.view === 'actual' ? actualChart(d) : plannedChart(d)}`;
    return h;
}
function tabBanks(d, cur) {
    const a = liveAccounts(d), tot = (k) => a.reduce((x, r) => x + r[k], 0);
    return `<div class="td-h"><span>${tx('banks_h')}</span><input type="text" placeholder="${esc(tx('search_bank'))}" data-search="banks"></div>
    <div class="td-chart" data-kind="banks"></div>
    <div class="td-scroll"><table class="td-tbl" id="td-banks"><thead><tr><th>${tx('account')}</th><th>${tx('bank')}</th><th>${tx('company')}</th><th>${tx('type')}</th><th>${tx('ccy')}</th><th class="n">${tx('bal_ac')}</th><th class="n">${tx('bal_cur', { x: cur })}</th><th class="n">${tx('avail_col')}</th><th>${tx('last_txn')}</th></tr></thead><tbody>
    ${a.map(r => `<tr class="clk" data-gl="${esc(r.account)}" data-co="${esc(r.company)}" data-s="${esc((r.account + r.bank + r.company + r.acc_no).toLowerCase())}"><td>${esc(r.account)}</td><td>${esc(r.bank)}</td><td>${esc(r.company)}</td><td>${esc(r.type)}</td><td>${esc(r.currency)}</td>
        <td class="n">${format_currency(r.balance_ac, r.currency, 2)}</td><td class="n">${money(r.balance, cur)}</td><td class="n">${money(r.available, cur)}</td><td>${r.last_txn ? esc(nice(r.last_txn)) : ''}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="6">${tx('total')}</td><td class="n">${money(tot('balance'), cur)}</td><td class="n">${money(tot('available'), cur)}</td><td></td></tr></tfoot></table></div>
    <div class="td-note">${tx('banks_note')}</div>`;
}
function tabCash(d, cur) {
    return `<div class="td-h"><span>${tx('cash_actual_h', { a: esc(nice(S.from)), b: esc(nice(frappe.datetime.get_today())) })}</span></div>${actualChart(d)}${actualTable(d, cur)}
    <div class="td-h"><span>${tx('cash_planned_h', { a: esc(nice(frappe.datetime.get_today())), b: esc(nice(S.to)) })}</span></div>${plannedChart(d)}${plannedTable(d, cur)}`;
}

// ---- AP: one row per supplier (oldest open invoice), click for the full list ----
const apBucket = (x) => x < 0 ? 'overdue' : x <= 7 ? 'd0_7' : x <= 14 ? 'd8_14' : x <= 30 ? 'd15_30' : x <= 60 ? 'd31_60' : 'd61_90';
function apInvoices(d) { return d.ap_list.filter(r => Math.round(r.amount || 0) !== 0); }
function apBySupplier(list) {
    const map = {};
    list.forEach(r => {
        const g = map[r.supplier] || (map[r.supplier] = { supplier: r.supplier, invoices: [], amount: 0, companies: [], hold: true, overdue: false, oldest: null });
        g.invoices.push(r); g.amount += r.amount || 0;
        if (g.companies.indexOf(r.company) < 0) g.companies.push(r.company);
        if (!r.on_hold) g.hold = false;
        if (r.days < 0) g.overdue = true;
        if (!g.oldest || r.due_date < g.oldest.due_date) g.oldest = r;
    });
    return Object.values(map).filter(g => Math.round(g.amount) !== 0)
        .sort((a, b) => a.oldest.due_date < b.oldest.due_date ? -1 : a.oldest.due_date > b.oldest.due_date ? 1 : 0);
}
function tabAP(d, cur) {
    const g = d.ap_aging;
    const cards = [['all', tx('b_all'), Object.values(g).reduce((x, y) => x + y, 0)], ['overdue', tx('b_overdue'), g.overdue], ['d0_7', tx('b_0_7'), g.d0_7], ['d8_14', tx('b_8_14'), g.d8_14], ['d15_30', tx('b_15_30'), g.d15_30], ['d31_60', tx('b_31_60'), g.d31_60], ['d61_90', tx('b_61_90'), g.d61_90]];
    const shown = apInvoices(d).filter(r => S.apBucket === 'all' || (r.on_hold ? 'hold' : apBucket(r.days)) === S.apBucket);
    const groups = apBySupplier(shown);
    const grand = groups.reduce((x, y) => x + y.amount, 0);
    return `<div class="td-kpis">${cards.map(c => `<div class="td-card click ${S.apBucket === c[0] ? 'sel' : ''}" data-bucket="${c[0]}"><div class="l">${c[1]}</div><div class="v">${cur} ${compact(c[2])}</div></div>`).join('')}</div>
    <div class="td-h"><span>${tx('ap_h')}</span><input type="text" placeholder="${esc(tx('search_sup'))}" data-search="ap"></div>
    <div class="td-scroll"><table class="td-tbl" id="td-ap"><thead><tr><th>${tx('oldest_due')}</th><th>${tx('supplier')}</th><th class="n">${tx('days')}</th><th class="n">${tx('outstanding')}</th><th>${tx('status')}</th><th>${tx('company')}</th></tr></thead><tbody>
    ${groups.map(x => { const r = x.oldest; return `<tr data-s="${esc(x.supplier.toLowerCase())}"><td>${esc(nice(r.due_date))}</td><td><span class="td-sup" data-sup="${esc(x.supplier)}">${esc(x.supplier)}</span></td>
        <td class="n ${r.days < 0 ? 'td-neg' : ''}">${r.days < 0 ? Math.abs(r.days) + ' ' + tx('late') : r.days}</td><td class="n">${money(x.amount, cur)}</td><td>${x.hold ? tx('st_hold') : x.overdue ? tx('st_overdue') : tx('st_sched')}</td><td>${esc(x.companies.join(', '))}</td></tr>`; }).join('') || `<tr><td colspan="6">${tx('no_ap')}</td></tr>`}
    </tbody><tfoot><tr><td colspan="3">${tx('total_suppliers', { n: groups.length })}</td><td class="n">${money(grand, cur)}</td><td colspan="2"></td></tr></tfoot></table></div>
    <div class="td-note">${tx('ap_note')}</div>
    <div class="td-h"><span>${tx('pay_h')}</span><a href="/app/treasury-planned-payment/new" target="_blank">${tx('add_planned')}</a></div>
    <div class="td-scroll"><table class="td-tbl"><thead><tr><th>${tx('date')}</th><th>${tx('type')}</th><th>${tx('desc')}</th><th>${tx('company')}</th><th class="n">${tx('amount')}</th><th>${tx('ref')}</th></tr></thead><tbody>
    ${d.scheduled.map(r => `<tr><td>${esc(nice(r.date))}${r.overdue ? ' <span class="td-neg">' + tx('overdue_p') + '</span>' : ''}</td><td>${esc(r.cat)}</td><td>${esc(r.label)}${r.est ? ' <i>' + tx('est_payroll') + '</i>' : ''}</td><td>${esc(r.company)}</td><td class="n">${money(r.amount, cur)}</td><td>${r.dn ? link(r.dt, r.dn) : ''}</td></tr>`).join('') || `<tr><td colspan="6">${tx('nothing')}</td></tr>`}
    </tbody></table></div>`;
}
function showSupplier(name) {
    const d = S.data, cur = d.currency, dir = isAr() ? 'rtl' : 'ltr', al = isAr() ? 'left' : 'right';
    const inv = apInvoices(d).filter(r => r.supplier === name).sort((a, b) => a.due_date < b.due_date ? -1 : 1);
    const total = inv.reduce((x, r) => x + (r.amount || 0), 0);
    const dlg = new frappe.ui.Dialog({ title: tx('dlg_title', { x: name }), size: 'extra-large',
        fields: [{ fieldtype: 'HTML', fieldname: 'h' }] });
    dlg.fields_dict.h.$wrapper.attr('dir', dir).html(`<div style="max-height:60vh;overflow:auto"><table class="table table-bordered" style="font-size:13px"><thead><tr><th>${tx('due_date')}</th><th>${tx('invoice')}</th><th>${tx('bill_no')}</th><th>${tx('company')}</th><th style="text-align:${al}">${tx('days')}</th><th style="text-align:${al}">${tx('outstanding')}</th><th>${tx('status')}</th></tr></thead><tbody>
    ${inv.map(r => `<tr><td>${esc(nice(r.due_date))}</td><td>${link('Purchase Invoice', r.name)}</td><td>${esc(r.bill_no)}</td><td>${esc(r.company)}</td>
        <td style="text-align:${al};${r.days < 0 ? 'color:#c0392b' : ''}">${r.days < 0 ? Math.abs(r.days) + ' ' + tx('late') : r.days}</td><td style="text-align:${al}">${money(r.amount, cur)}</td><td>${r.on_hold ? tx('st_hold') : r.days < 0 ? tx('st_overdue') : tx('st_sched')}</td></tr>`).join('')}
    </tbody><tfoot><tr><th colspan="5">${tx('total_invoices', { n: inv.length })}</th><th style="text-align:${al}">${money(total, cur)}</th><th></th></tr></tfoot></table></div>`);
    dlg.show();
}

// ---- Monthly forecast = this month, week by week ----
function tabForecast(d, cur) {
    if (!S.months) {
        if (!S.fcLoading) { S.fcLoading = 1; loadForecast(); }
        return `<div style="padding:30px;color:#777">${tx('fc_loading')}</div>`;
    }
    if (!S.months.length) return `<div style="padding:30px;color:#c0392b">${tx('fc_error')}</div>`;
    const trc = S.months.reduce((x, m) => x + m.receipts, 0), tpy = S.months.reduce((x, m) => x + m.payments, 0);
    return `<div class="td-h"><span>${tx('fc_h', { m: esc(monthName()) })}</span><button class="td-btn" data-export="months">${tx('export_csv')}</button></div>
    ${monthsChart()}
    <div class="td-scroll"><table class="td-tbl"><thead><tr><th>${tx('week')}</th><th>${tx('period')}</th><th>${tx('basis')}</th><th class="n">${tx('opening')}</th><th class="n">${tx('receipts')}</th><th class="n">${tx('payments')}</th><th class="n">${tx('net')}</th><th class="n">${tx('closing')}</th><th>${tx('buffer_col')}</th></tr></thead><tbody>
    ${S.months.map(m => `<tr class="${m.below_buffer ? 'td-warn' : ''}"><td>${esc(weekLabel(m))}</td><td>${esc(nice(m.from))} - ${esc(nice(m.to))}</td><td>${tx(m.kind)}</td><td class="n">${money(m.opening, cur)}</td><td class="n">${money(m.receipts, cur)}</td><td class="n">${money(m.payments, cur)}</td><td class="n ${m.net < 0 ? 'td-neg' : 'td-pos'}">${money(m.net, cur)}</td><td class="n">${money(m.closing, cur)}</td><td>${m.below_buffer ? tx('below') : tx('ok')}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">${tx('month_total')}</td><td class="n">${money(trc, cur)}</td><td class="n">${money(tpy, cur)}</td><td class="n">${money(trc - tpy, cur)}</td><td></td><td></td></tr></tfoot></table></div>
    <div class="td-note">${tx('fc_note')}</div>`;
}
function loadForecast() {
    frappe.call({
        method: 'treasury_dashboard_data',
        args: { company: S.company, horizon: Math.max(1, frappe.datetime.get_diff(moment().endOf('month').format('YYYY-MM-DD'), frappe.datetime.get_today())),
                lookback: frappe.datetime.get_diff(frappe.datetime.get_today(), moment().startOf('month').format('YYYY-MM-DD')) + 2, include_overdue_receipts: S.incl },
        callback: (r) => { S.fc = r.message; S.months = monthsFrom(S.fc); S.fcLoading = 0; if (S.tab === 'forecast') render(); },
        error: () => { S.months = []; S.fcLoading = 0; if (S.tab === 'forecast') render(); }
    });
}

function render() {
    const d = S.data, cur = d.currency, sm = d.summary;
    const opt = (arr, v) => arr.map(a => `<option value="${esc(a[0])}" ${String(a[0]) === String(v) ? 'selected' : ''}>${esc(a[1])}</option>`).join('');
    const tabs = [['overview', tx('tab_overview')], ['banks', tx('tab_banks')], ['cash', tx('tab_cash')], ['ap', tx('tab_ap')], ['forecast', tx('tab_forecast')]];
    const body = ({ overview: tabOverview, banks: tabBanks, cash: tabCash, ap: tabAP, forecast: tabForecast })[S.tab](d, cur);
    root_element.innerHTML = CHART_CSS + CSS + `<div class="td-root" dir="${isAr() ? 'rtl' : 'ltr'}">
    <div class="td-hero"><div class="td-top"><div><div class="td-title">🏛 ${tx('title')}</div><small>${tx('sub')}</small></div><span class="td-badge">${tx('live')} · ${esc(nice(d.as_of))}</span></div>
        <div style="margin-top:12px;opacity:.85">${tx('consolidated')}</div><div class="td-big">${money(sm.total_balance, cur)}</div>
        <div class="td-two"><div><small>${tx('available')}</small><b>${money(sm.available, cur)}</b></div><div><small>${tx('buffer')} <span class="td-edit" data-edit-buffer="1" title="${esc(tx('edit_title'))}">${tx('edit')}</span></small><b>${money(sm.buffer, cur)}</b></div><div><small>${tx('restricted')}</small><b>${money(sm.restricted, cur)}</b></div></div></div>
    <div class="td-bar">
        <select data-f="company">${opt([['', tx('group')]].concat(d.companies.map(c => [c, c])), S.company)}</select>
        <span class="td-dl">${tx('from')}</span><input type="date" data-f="from" value="${esc(S.from)}" max="${esc(frappe.datetime.get_today())}">
        <span class="td-dl">${tx('to')}</span><input type="date" data-f="to" value="${esc(S.to)}" min="${esc(frappe.datetime.get_today())}">
        <label><input type="checkbox" data-f="incl" ${S.incl ? 'checked' : ''}> ${tx('incl')}</label>
        <button class="td-btn" data-refresh="1" style="margin:0">${tx('refresh')}</button><button class="td-btn" data-settings="1" style="margin:0">${tx('settings')}</button>
        <span style="margin-inline-start:auto"><span class="td-pill ${S.lang === 'en' ? 'on' : ''}" data-lang="en">EN</span><span class="td-pill ${S.lang === 'ar' ? 'on' : ''}" data-lang="ar">عربي</span></span></div>
    <div class="td-tabs">${tabs.map(t => `<div class="td-tab ${S.tab === t[0] ? 'on' : ''}" data-tab="${t[0]}">${t[1]}</div>`).join('')}</div>
    ${body}
    <div class="td-note">${tx('excluded')}: ${esc((d.excluded || []).join(', ') || tx('none'))} · ${tx('footnote')}</div></div>`;
    drawCharts();
}

function load() {
    if (!S.data) root_element.innerHTML = `<div style="padding:30px;color:#777">${tx('loading')}</div>`;
    S.fc = null; S.months = null; S.fcLoading = 0;
    frappe.call({
        method: 'treasury_dashboard_data',
        args: { company: S.company, horizon: horizonDays(), lookback: lookbackDays(), include_overdue_receipts: S.incl },
        callback: (r) => { S.data = r.message; render(); },
        error: () => { root_element.innerHTML = `<div style="padding:30px;color:#c0392b">${tx('load_error')}</div>`; }
    });
}

if (!root_element.__bound) {
    root_element.__bound = true;
    root_element.addEventListener('change', (e) => {
        const f = e.target.dataset && e.target.dataset.f;
        if (!f) return;
        if (f === 'from' || f === 'to') {
            if (!e.target.value) return;
            S[f] = e.target.value;
            const today = frappe.datetime.get_today();
            if (S.from > today) S.from = today;
            if (S.to < today) S.to = today;
        } else {
            S[f] = f === 'incl' ? (e.target.checked ? 1 : 0) : e.target.value;
        }
        load();
    });
    root_element.addEventListener('input', (e) => {
        const k = e.target.dataset && e.target.dataset.search;
        if (!k) return;
        const q = e.target.value.toLowerCase();
        root_element.querySelectorAll((k === 'banks' ? '#td-banks' : '#td-ap') + ' tbody tr').forEach(tr => {
            tr.style.display = (tr.dataset.s || '').includes(q) ? '' : 'none';
        });
    });
    root_element.addEventListener('click', (e) => {
        const el = e.target.closest('[data-tab],[data-view],[data-ack],[data-bucket],[data-gl],[data-export],[data-refresh],[data-edit-buffer],[data-settings],[data-sup],[data-apdrill],[data-lang]');
        if (!el) return;
        if (el.dataset.lang) {
            S.lang = el.dataset.lang === 'ar' ? 'ar' : 'en';
            lsSet('td_lang', S.lang);
            if (S.data) render();
        }
        else if (el.dataset.apdrill) { S.tab = 'ap'; S.apBucket = el.dataset.apdrill; render(); }
        else if (el.dataset.sup) { showSupplier(el.dataset.sup); }
        else if (el.dataset.tab) { S.tab = el.dataset.tab; render(); }
        else if (el.dataset.view) { S.view = el.dataset.view; render(); }
        else if (el.dataset.ack) {
            const k = getDismissed(); k.push(el.dataset.ack);
            lsSet('td_dismissed', JSON.stringify(k)); render();
        } else if (el.dataset.bucket) { S.apBucket = el.dataset.bucket; render(); }
        else if (el.dataset.gl) {
            frappe.set_route('query-report', 'General Ledger', { company: el.dataset.co, account: [el.dataset.gl],
                from_date: frappe.datetime.add_months(frappe.datetime.get_today(), -1), to_date: frappe.datetime.get_today() });
        } else if (el.dataset.export) {
            const head = ['Week', 'From', 'To', 'Basis', 'Opening', 'Receipts', 'Payments', 'Net', 'Closing'];
            const basisEn = { k_actual: 'Actual', k_planned: 'Planned', k_both: 'Actual + planned' };
            const lines = [head.join(',')].concat((S.months || []).map(m => ['Week ' + m.wk, m.from, m.to, basisEn[m.kind], m.opening, m.receipts, m.payments, m.net, m.closing].join(',')));
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
            a.download = 'treasury_month_weekly_forecast.csv'; a.click();
        } else if (el.dataset.refresh) { load(); }
        else if (el.dataset.editBuffer) {
            frappe.prompt([{ fieldname: 'v', label: tx('prompt_title'), fieldtype: 'Currency', reqd: 1, default: S.data.summary.buffer }],
                (vals) => {
                    frappe.db.set_single_value('Treasury Dashboard', 'min_cash_buffer', vals.v).then(() => {
                        frappe.show_alert({ message: tx('buf_saved'), indicator: 'green' });
                        load();
                    });
                }, tx('prompt_title'), tx('prompt_save'));
        } else if (el.dataset.settings) { frappe.set_route('Form', 'Treasury Dashboard'); }
    });
}
load();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
