/* ===== DM Group KSA — Plant & Furniture Asset Dashboard — SCRIPT field · v2 =====
   Moves v1 onto the DM dashboard standard. Read-only; permission-checked get_list / get only. Kept from v1 unchanged: the scope
   (Asset categories "Plant and Machinery Direct" and "Fixtures & Fittings-Indirect", DM Assets chairs and tables, never merged),
   the status rule (active = submitted, not sold / scrapped / decapitalized), the transparent valuation proof (verified only when
   cost − opening − journal-posted depreciation equals the ERP value field ±1, one finance book per asset, first 150 assets),
   amounts in each company's currency, the maintenance overdue rule, the exception and audit checks, and every label and
   translation (the v1 dictionary is reused as is). The shared runtime between the "DMS kit" markers is generated from
   tools/erp/kit/dms-kit.js (edit the kit, not the copy). */
(function () {
  'use strict';
  var I = { en: {}, ar: {} };
  I.en = {
title: 'Plant & Furniture Asset Dashboard', subtitle: 'DM Group KSA · live ERP data (read-only)', asof: 'as of', refresh: 'Refresh', loading: 'Loading from ERP…', retry: 'Retry', close: 'Close',
tab_overview: 'Overview', tab_register: 'Asset Register', tab_plant: 'Plant & Machinery', tab_furniture: 'Furniture & Fixtures', tab_valuation: 'Valuation & Depreciation', tab_maintenance: 'Maintenance', tab_inspection: 'Inspection', tab_assign: 'Employee Assignments', tab_movement: 'Transfers & Movement', tab_audit: 'Exceptions & Audit',
all: 'All', f_company: 'Company', f_category: 'Asset category', f_location: 'Location / branch', f_dept: 'Department', f_custodian: 'Custodian / employee', f_status: 'Asset status', f_from: 'Date from', f_to: 'Date to', f_search: 'Search', f_search_ph: 'Asset name or ID', reset: 'Reset filters',
st_active: 'Active (submitted, not disposed)', st_noncancelled: 'All except cancelled', st_all: 'All incl. cancelled', st_cancelled: 'Cancelled only', st_draft: 'Draft only', none_set: '(not set)',
records: 'records', empty: 'No data', drill_hint: 'Click to drill down', showing: 'Showing {0}–{1} of {2}', export_csv: 'CSV', view: 'View', open_erp: 'Open in ERP', history: 'History', yes: 'Yes', no: 'No',
no_access: 'No access', unavailable: 'Unavailable', unsupported: 'Not supported', not_configured: 'Not configured', not_recorded: 'Not recorded', not_applicable: 'Not applicable', missing: 'Missing', readable: 'Readable', partial: 'partial', partial_src: 'Partial data', none_found: 'None found', err_load: 'Could not load data:', err_generic: 'Request failed', cat_missing: 'Asset Category not found in ERP: {0}',
measures_note: 'Measures are kept separate: record counts, quantities (Asset Quantity), historical cost (Total Asset Cost) and verified book value. Cancelled records are excluded from active totals.',
k_plant: 'Plant & machinery assets', k_furn: 'Furniture assets', k_cost: 'Recorded asset cost', k_nbv: 'Verified net book value', k_fd: 'Fully depreciated assets', k_im: 'Assets under maintenance', k_od: 'Overdue maintenance tasks', k_insp: 'Scheduled inspections', k_nocust: 'Assets missing custodians', k_nofin: 'Missing financial / location info', k_plans: 'Maintenance plans',
s_qty: 'Quantity {0} · records {1}', s_furn: '{0} Asset records · {1} DM Assets records (not merged)', s_hist: 'historical cost', s_nbv: '{0} of {1} assets verified', s_status: 'by ERP status', s_od: 'due date before today, not completed', s_noplans: 'no maintenance plans exist', s_calib: 'calibration plans: {0}', s_of: 'of {0} records', s_nofin: 'no location or cost ≤ 0', s_of_all: 'of {0} total', s_distinct: 'distinct employees', s_excl_cancel: 'excl. cancelled', s_verified_only: '{0} verified assets only', s_unver_cost: 'cost {0}', s_disp: 'sold / scrapped / cancelled', s_tasks: '{0} tasks', s_repcost: 'repair cost (not added to asset cost)', s_needs: 'maintenance_required flag', s_nodisp: '{0} disposed', s_active_def: 'submitted, not sold/scrapped', s_records_only: 'records (no quantity field)', s_other: 'Asset category {0}', s_assigned_note: 'employee is mandatory in DM Assets', s_nodesc: 'missing description', s_cal_src: 'Asset Maintenance (Calibration)',
recon_ok: 'Reconciled: ERP count {0} = records used for KPIs and charts {1}.', recon_bad: 'ERP count {0}; records loaded {1} (list capped or changed). Narrow the filters.',
empty_scope: 'No plant or furniture assets match the current filters', empty_scope_s: 'Try resetting the filters or choosing another status.', empty_filter: 'No records match the filters', empty_filter_s: 'Adjust or reset the filters.', dm_furn_lbl: 'Furniture (DM Assets register)',
c_cat: 'Asset distribution by category', c_loc: 'Asset distribution by location', c_costcat: 'Acquisition cost by asset category', ch_status: 'Asset status distribution', c_trend: 'Asset acquisition trend (monthly)', c_mstatus: 'Maintenance status', c_istatus: 'Inspection status',
h_records: 'record counts — click to drill down', h_hist: 'historical cost, active records', h_trend: 'by purchase date; label shows records · cost', h_mstatus: 'plan tasks (left) · maintenance logs (right)', h_register: 'Server-side pagination; click an ID for details', h_depyear: 'from depreciation schedules: posted vs scheduled', h_age: 'by available-for-use / purchase date', h_calendar: 'due dates, completions, failures', h_alerts: 'overdue and due within 30 days', h_plans: 'maintenance plans', h_costasset: 'repair cost, excl. cancelled', h_tech: 'tasks by assignee', h_overdue_rule: 'Overdue is computed: next due date < today, status not Cancelled/Completed.',
n_nodate: '{0} without date', no_maint_plans: 'No maintenance plans configured', no_maint_plans_s: 'No Asset Maintenance records exist for these assets.', insp_none_short: 'No inspection records exist in ERP.',
t_register: 'Asset master register', c_id: 'Asset ID', c_name: 'Asset Name', c_category: 'Asset Category', c_company: 'Company', c_location: 'Location', c_custodian: 'Custodian', c_pdate: 'Purchase Date', c_cost: 'Original Cost', c_nbv: 'Verified Book Value', c_status: 'Status', c_lastm: 'Last Maintenance', c_nextm: 'Next Maintenance', c_actions: 'Actions', c_dept: 'Department', c_count: 'Count',
reg_foot: '{0} records match · total cost on this page: {1}', unverified: 'Unverified', verified: 'Verified', disposed: 'Disposed', excluded: 'excluded', nbv_rule: 'Cost minus opening and posted (journal-linked) depreciation, equal to the ERP value field.',
r_not_submitted: 'Not a submitted record', r_disposed: 'Sold / scrapped / decapitalized', r_no_cost: 'No cost recorded', r_no_dep_calc: 'No depreciation configured', r_zero_unproven: 'Book value field is 0 but posted depreciation does not support it', r_mismatch: 'Book value field differs from cost minus posted depreciation', r_load_failed: 'Asset document could not be read',
note_nostatus: 'The Status filter is not applied on this tab; the cards break records down by ERP status.',
p_total: 'Total registered equipment', p_active: 'Active equipment', p_ooo: 'Out of order', p_cost: 'Recorded acquisition cost', s_active_def2: '',
empty_plant: 'No plant & machinery assets match the filters', t_inventory: 'Machinery inventory', c_mreq: 'Maintenance required', has_plan: 'has plan', t_custodian: 'Custodian / responsible person', t_mreq: 'Maintenance requirements', mreq_flag: 'Assets flagged "maintenance required"', mreq_noplan: 'Flagged but without a maintenance plan', t_mhist: 'Maintenance history', t_repairs: 'Breakdown & repair history', c_avail: 'Operational availability',
unsupported_avail: '', avail_msg: 'Availability/uptime cannot be derived from accounting status. Recorded repair downtime text: {0}', no_downtime: 'none recorded', no_logs: 'No maintenance logs for these assets', no_repairs: 'No repair records for these assets', no_repairs_s: 'Asset Repair has no matching entries.', repairs_other: '{0} repair record(s) exist for assets outside plant & furniture scope and are excluded.',
c_task: 'Maintenance Task', c_mtype: 'Maintenance Type', c_due: 'Due Date', c_completed: 'Completion Date', c_ref: 'Document', c_failure: 'Failure Date', c_repcost: 'Repair Cost', c_downtime: 'Downtime', c_desc: 'Description', capitalized: 'capitalized',
note_dm: 'Furniture records come from DM Assets (Chair, Table) and Asset category Fixtures & Fittings. Company, department and status filters do not apply to DM Assets (no such fields). DM Assets has no quantity, cost or condition fields: counts are records; nothing is estimated.',
f_chairs: 'Total chairs', f_tables: 'Total tables', f_other: 'Other furniture (Asset records)', f_assigned: 'Assigned to an employee', f_unassigned: 'Unassigned', f_incomplete: 'Incomplete records', f_byloc: 'Furniture by location', f_byemp: 'Furniture by employee', t_furn_reg: 'Furniture register (DM Assets)', c_employee: 'Employee', c_recdate: 'Recorded Date', c_condition: 'Condition', t_fx: 'Fixtures & Fittings assets (Asset DocType)', empty_furn: 'No furniture records match', empty_fx: 'No Fixtures & Fittings assets', empty_fx_s: 'No Asset records exist in category {0}. Furniture value is therefore not available.',
val_rule: 'Book value is "verified" only when cost − opening depreciation − journal-posted schedule depreciation equals the ERP value field (±1). A 0 value without supporting postings is shown as unverified. One finance book per asset is used (default, else first) to avoid double counting. Repair cost is never added to asset cost. Amounts are in each company’s currency.',
val_partial: 'Valuation checked for the first 150 of {0} assets.', v_cost: 'Total acquisition cost', v_acc: 'Accumulated depreciation (verified)', v_unver: 'Unverified valuations', v_disp: 'Disposed / cancelled', v_costcat: 'Cost by asset category', v_depyear: 'Depreciation by year', v_age: 'Asset age distribution', yrs: 'yrs', posted: 'posted', scheduled: 'scheduled', no_sched: 'No depreciation schedules',
t_valuation: 'Valuation detail & financial exceptions', v_open: 'Opening accum. dep.', v_posted: 'Posted depreciation', v_derived: 'Cost − posted', v_field: 'ERP value field', v_fb: 'Finance book', v_result: 'Result', multi_fb: 'multiple books', t_disposed: 'Sold, scrapped and cancelled assets', c_disposal: 'Disposal Date', no_disposed: 'No sold, scrapped or cancelled assets in scope',
note_mnt: 'Source: Asset Maintenance (plans & tasks), Asset Maintenance Log and Asset Repair. Restricted to the assets selected by the filters; the date range filters due/failure dates. Nothing is inferred.',
partial_denied: 'No access to {0}; related figures are incomplete.', m_planned: 'Planned maintenance', m_done: 'Completed maintenance logs', m_pend: 'Pending repairs', m_comp: 'Completed repairs', m_repcost: 'Total repair cost', m_needs: 'Assets requiring maintenance',
t_schedule: 'Maintenance schedule', c_freq: 'Frequency', c_last: 'Last Completion', c_next: 'Next Due', c_tech: 'Assigned Technician', overdue_c: 'overdue', due_soon: 'due soon', t_calendar: 'Maintenance calendar', t_alerts: 'Next-service & overdue alerts', no_alerts: 'No alerts', weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
m_bycat: 'Maintenance by asset category', m_costasset: 'Repair cost by asset', m_tech: 'Technician assignment', t_prev: 'Preventive-maintenance schedule', prev_count: '{0} preventive task(s) shown in the schedule above.', no_prev: 'No preventive maintenance tasks', t_comp_hist: 'Maintenance completion history', c_actions_done: 'Actions performed', c_cert: 'Certificate', view_cert: 'View certificate', no_cert: 'none attached', t_corrective: 'Corrective maintenance, breakdown & repair history', t_spares: 'Spare parts consumed (Asset Repair)', c_item: 'Item', c_qty: 'Quantity', c_value: 'Value', no_spares: 'No spare parts consumed', no_spares_s: 'No Asset Repair consumed items recorded.',
ts_planned: 'Planned', ts_overdue: 'Overdue (computed)', ts_cancelled: 'Cancelled', ts_ended: 'Ended',
insp_audit: 'Audit result: ERP has no dedicated plant/furniture inspection DocType (no pass/fail, checklist, photo or corrective-action fields). Vehicle Inspection and Quality Inspection exist but do not relate to these assets. Only Calibration tasks in Asset Maintenance are real, partial inspection-like data. Creating inspections is not configured, and nothing was created.',
i_sched: 'Inspections scheduled', i_done: 'Inspections completed', i_pass: 'Passed inspections', i_fail: 'Failed inspections', i_over: 'Overdue inspections', i_corr: 'Requiring corrective action', insp_no_src: 'No ERP source', insp_real: 'Real data available: calibration (Asset Maintenance)', cal_sched: 'Calibration plans', cal_done: 'Calibrations completed (logs)', cal_over: 'Calibrations overdue',
insp_plant: 'Plant & machinery inspection', insp_elec: 'Electrical inspection', insp_mech: 'Mechanical inspection', insp_safety: 'Safety inspection', insp_furn: 'Furniture condition inspection', insp_cal: 'Calibration inspection', cal_hint: 'Calibration tasks and logs from Asset Maintenance.',
insp_check: 'Proposed checklist', insp_check_h: 'Display only — no ERP storage exists', create_insp: 'Create inspection', ck1: 'Physical condition', ck2: 'Mechanical condition', ck3: 'Electrical safety', ck4: 'Operational condition', ck5: 'Visible damage', ck6: 'Safety equipment', ck7: 'Calibration or certification', ck8: 'Inspector observations', ck9: 'Inspection photographs', ck10: 'Corrective actions required',
insp_sources: 'Sources checked', insp_sources_h: 'Existing ERP DocTypes reviewed', src_cal: 'Calibration tasks/logs only; no pass/fail result.', src_vehicle: 'Vehicles only, no asset link.', src_qi: 'Stock/item quality, not fixed assets.', src_none: 'Asset Inspection DocType does not exist.',
t_insp: 'Inspection table (calibration records)', c_itype: 'Inspection Type', c_idate: 'Last Inspection', c_inspector: 'Inspector', c_result: 'Result', c_remarks: 'Remarks', cert_required: 'required', no_insp_rows: 'No calibration inspection records', no_insp_rows_s: 'No Calibration tasks exist for these assets.',
note_assign: 'Three separate sources are shown and never merged: Asset custodian, DM Assets, and Asset Acquisition Records. Dates and return status are shown only when a source records them.',
as_asset: 'Assets with a custodian', as_dm: 'DM Assets records', as_acq: 'Acquisition record items', as_emps: 'Employees', link_check: 'Identifier check: {0} of {1} acquisition items with a DM asset number match a DM Assets ID. Records are not combined, so nothing is counted twice.',
as_t1: 'Asset custodians (Asset DocType)', as_t2: 'DM Assets register', as_t3: 'Asset Acquisition Records (issue / return)', furn_only: 'Furniture only', all_cats: 'All categories', all_items: 'All items', c_assigned: 'Assigned Date', c_return: 'Return Status', c_comploc: 'Company / Location', via_mv: 'via Asset Movement', empty_cust: 'No assets with a custodian', empty_dm: 'No DM Assets records', empty_acq: 'No acquisition records', c_dmno: 'DM Asset No', c_wstate: 'State', returned: 'Returned', issued: 'Issued',
note_move: 'Source: Asset Movement and its asset lines. Date range filters the transaction date; Location matches source or destination.',
mv_lines: 'Movement lines', mv_docs: 'Movement documents', mv_in: 'Plant/furniture assets', mv_out: 'Other categories', mv_can: 'Cancelled', scope_only: 'Plant & furniture only', c_mdate: 'Movement Date', c_mtype2: 'Movement Type', c_src: 'Source Location', c_dst: 'Destination', c_from: 'From Employee', c_to: 'Assigned To', c_doc: 'Movement Doc', c_refdoc: 'Reference', submitted: 'Submitted', outside_scope: 'outside scope', empty_mv: 'No movements match', empty_mv_s: 'No Asset Movement lines exist for plant or furniture assets. Switch to all categories to see the rest.',
note_audit: 'Read-only findings. Nothing is changed automatically; each row links to the ERP record to correct. Status and date filters are not applied here.',
x_total: 'Total findings', sev_high: 'High', sev_medium: 'Medium', sev_low: 'Low', sev_info: 'Info', c_severity: 'Severity', c_asset: 'Asset', c_issue: 'Issue', c_source: 'Source', c_fix: 'Suggested correction', c_view: 'View record', no_exceptions: 'No exceptions found', no_exceptions_s: 'All checks passed for the current filters.',
x_cancelled: 'Cancelled asset record', f_cancelled: 'Informational: excluded from active totals. Keep for audit trail.', x_draft: 'Asset is still a draft', f_draft: 'Submit or delete the draft.', x_noloc: 'Missing location', f_noloc: 'Set the Location on the asset.', x_nocust: 'Missing custodian', f_nocust: 'Assign a custodian (employee).', x_nodate: 'Missing purchase date', f_nodate: 'Enter the purchase date.', x_nocost: 'Missing or zero cost', f_nocost: 'Review the asset cost with finance.',
x_fdflag: 'Status is Fully Depreciated but the is-fully-depreciated flag is unchecked', f_fdflag: 'Review the flag with finance; do not edit without checking depreciation entries.', x_nomplan: 'Maintenance required but no maintenance plan', f_nomplan: 'Create an Asset Maintenance plan.', x_disposed: 'Asset is {0}', f_disposed: 'Excluded from active totals.', x_dup: 'Possible duplicate of {0} (same name, company, date and cost)', f_dup: 'Confirm whether this is a true duplicate; cancel the extra record.',
x_unver: 'Book value unverifiable', f_unver: 'Check depreciation schedule and journal entries with finance.', x_overdue: 'Overdue maintenance "{0}" (due {1})', f_overdue: 'Complete the task or update its schedule.', x_nocert: 'Completed "{0}" without a required certificate', f_nocert: 'Attach the certificate to the log.', x_noid: 'Missing asset identifier', f_noid: 'Set the Asset ID.', x_dmdup: 'Duplicate Asset ID in DM Assets', x_furn_inc: 'Incomplete furniture record: {0} missing', f_furn_inc: 'Complete the missing field.',
t_sources: 'Verified ERP data sources & access', c_access: 'Access',
d_title: 'Asset details', d_identity: 'Identity', d_operational: 'Operational information', d_financial: 'Financial information', d_history: 'History', d_avail: 'Available for use', d_qty: 'Asset quantity', d_insend: 'Insurance end', d_disposal: 'Disposal date', d_hist: 'Historical cost (Total Asset Cost)', d_gross: 'Gross purchase amount', d_addl: 'Additional asset cost', d_field: 'ERP value after depreciation', d_calc: 'Calculate depreciation', d_fbooks: 'Finance books', d_date: 'Schedule date', d_amount: 'Amount', d_posted: 'Journal entry', d_mv: 'Movements', d_mnt: 'Maintenance logs', d_acqlink: 'Acquisition records with a matching DM asset number', d_cost: 'Acquisition cost', dm_nofin: 'DM Assets has no verified cost, depreciation or condition fields; none are shown or estimated.'
};
I.ar = {
title: 'لوحة أصول المصانع والأثاث', subtitle: 'مجموعة DM السعودية · بيانات حية من النظام (قراءة فقط)', asof: 'حتى', refresh: 'تحديث', loading: 'جارٍ التحميل من النظام…', retry: 'إعادة المحاولة', close: 'إغلاق',
tab_overview: 'نظرة عامة', tab_register: 'سجل الأصول', tab_plant: 'المصانع والآلات', tab_furniture: 'الأثاث والتجهيزات', tab_valuation: 'التقييم والإهلاك', tab_maintenance: 'الصيانة', tab_inspection: 'الفحص', tab_assign: 'عهد الموظفين', tab_movement: 'التحويلات والحركة', tab_audit: 'الاستثناءات والتدقيق',
all: 'الكل', f_company: 'الشركة', f_category: 'فئة الأصل', f_location: 'الموقع / الفرع', f_dept: 'القسم', f_custodian: 'المسؤول / الموظف', f_status: 'حالة الأصل', f_from: 'من تاريخ', f_to: 'إلى تاريخ', f_search: 'بحث', f_search_ph: 'اسم الأصل أو رقمه', reset: 'إعادة ضبط المرشحات',
st_active: 'نشط (معتمد وغير مستبعد)', st_noncancelled: 'الكل عدا الملغي', st_all: 'الكل بما فيه الملغي', st_cancelled: 'الملغي فقط', st_draft: 'المسودات فقط', none_set: '(غير محدد)',
records: 'سجل', empty: 'لا توجد بيانات', drill_hint: 'انقر للتفاصيل', showing: 'عرض {0}–{1} من {2}', export_csv: 'CSV', view: 'عرض', open_erp: 'فتح في النظام', history: 'السجل', yes: 'نعم', no: 'لا',
no_access: 'لا توجد صلاحية', unavailable: 'غير متاح', unsupported: 'غير مدعوم', not_configured: 'غير مُهيّأ', not_recorded: 'غير مسجل', not_applicable: 'لا ينطبق', missing: 'غير موجود', readable: 'متاح للقراءة', partial: 'جزئي', partial_src: 'بيانات جزئية', none_found: 'لا يوجد', err_load: 'تعذر تحميل البيانات:', err_generic: 'فشل الطلب', cat_missing: 'فئة الأصل غير موجودة في النظام: {0}',
measures_note: 'تُعرض المقاييس منفصلة: عدد السجلات، والكميات (كمية الأصل)، والتكلفة التاريخية (إجمالي تكلفة الأصل)، والقيمة الدفترية الموثقة. تُستبعد السجلات الملغاة من الإجماليات النشطة.',
k_plant: 'أصول المصانع والآلات', k_furn: 'أصول الأثاث', k_cost: 'تكلفة الأصول المسجلة', k_nbv: 'صافي القيمة الدفترية الموثقة', k_fd: 'أصول مهلكة بالكامل', k_im: 'أصول تحت الصيانة', k_od: 'مهام صيانة متأخرة', k_insp: 'عمليات الفحص المجدولة', k_nocust: 'أصول بدون مسؤول', k_nofin: 'نقص بيانات مالية / موقع', k_plans: 'خطط الصيانة',
s_qty: 'الكمية {0} · السجلات {1}', s_furn: '{0} سجل أصول · {1} سجل في DM Assets (دون دمج)', s_hist: 'تكلفة تاريخية', s_nbv: 'تم التحقق من {0} من {1} أصل', s_status: 'حسب حالة النظام', s_od: 'تاريخ الاستحقاق قبل اليوم وغير مكتملة', s_noplans: 'لا توجد خطط صيانة', s_calib: 'خطط المعايرة: {0}', s_of: 'من {0} سجل', s_nofin: 'بدون موقع أو التكلفة ≤ 0', s_of_all: 'من {0} إجمالاً', s_distinct: 'موظفون مختلفون', s_excl_cancel: 'دون الملغي', s_verified_only: '{0} أصل موثق فقط', s_unver_cost: 'التكلفة {0}', s_disp: 'مباع / مخردة / ملغي', s_tasks: '{0} مهمة', s_repcost: 'تكلفة الإصلاح (لا تُضاف لتكلفة الأصل)', s_needs: 'حقل الصيانة المطلوبة', s_nodisp: '{0} مستبعد', s_active_def: 'معتمد وغير مباع أو مخردة', s_records_only: 'سجلات (لا يوجد حقل كمية)', s_other: 'فئة الأصل {0}', s_assigned_note: 'الموظف إلزامي في DM Assets', s_nodesc: 'بدون وصف', s_cal_src: 'صيانة الأصول (معايرة)',
recon_ok: 'مطابقة: عدد النظام {0} = السجلات المستخدمة في المؤشرات والرسوم {1}.', recon_bad: 'عدد النظام {0}؛ السجلات المحملة {1} (القائمة محدودة أو تغيرت). ضيّق المرشحات.',
empty_scope: 'لا توجد أصول مصانع أو أثاث مطابقة للمرشحات الحالية', empty_scope_s: 'جرّب إعادة ضبط المرشحات أو اختيار حالة أخرى.', empty_filter: 'لا توجد سجلات مطابقة للمرشحات', empty_filter_s: 'عدّل المرشحات أو أعد ضبطها.', dm_furn_lbl: 'الأثاث (سجل DM Assets)',
c_cat: 'توزيع الأصول حسب الفئة', c_loc: 'توزيع الأصول حسب الموقع', c_costcat: 'تكلفة الاقتناء حسب فئة الأصل', ch_status: 'توزيع حالات الأصول', c_trend: 'اتجاه اقتناء الأصول (شهري)', c_mstatus: 'حالة الصيانة', c_istatus: 'حالة الفحص',
h_records: 'عدد السجلات — انقر للتفاصيل', h_hist: 'تكلفة تاريخية للسجلات النشطة', h_trend: 'حسب تاريخ الشراء؛ التسمية: السجلات · التكلفة', h_mstatus: 'مهام الخطط (يسار) · سجلات الصيانة (يمين)', h_register: 'ترقيم الصفحات من الخادم؛ انقر على الرقم للتفاصيل', h_depyear: 'من جداول الإهلاك: المرحّل مقابل المجدول', h_age: 'حسب تاريخ الاستخدام / الشراء', h_calendar: 'الاستحقاقات والإنجازات والأعطال', h_alerts: 'متأخرة ومستحقة خلال 30 يوماً', h_plans: 'خطط الصيانة', h_costasset: 'تكلفة الإصلاح دون الملغي', h_tech: 'المهام حسب المسؤول', h_overdue_rule: 'التأخر محسوب: تاريخ الاستحقاق القادم قبل اليوم والحالة ليست ملغاة/مكتملة.',
n_nodate: '{0} بدون تاريخ', no_maint_plans: 'لا توجد خطط صيانة مُهيّأة', no_maint_plans_s: 'لا توجد سجلات صيانة أصول لهذه الأصول.', insp_none_short: 'لا توجد سجلات فحص في النظام.',
t_register: 'السجل الرئيسي للأصول', c_id: 'رقم الأصل', c_name: 'اسم الأصل', c_category: 'فئة الأصل', c_company: 'الشركة', c_location: 'الموقع', c_custodian: 'المسؤول', c_pdate: 'تاريخ الشراء', c_cost: 'التكلفة الأصلية', c_nbv: 'القيمة الدفترية الموثقة', c_status: 'الحالة', c_lastm: 'آخر صيانة', c_nextm: 'الصيانة القادمة', c_actions: 'إجراءات', c_dept: 'القسم', c_count: 'العدد',
reg_foot: '{0} سجل مطابق · إجمالي تكلفة هذه الصفحة: {1}', unverified: 'غير موثق', verified: 'موثق', disposed: 'مستبعد', excluded: 'مستبعد', nbv_rule: 'التكلفة ناقص الإهلاك الافتتاحي والمرحّل (المرتبط بقيد يومية)، ويساوي حقل القيمة في النظام.',
r_not_submitted: 'سجل غير معتمد', r_disposed: 'مباع / مخردة / مستبعد رسمياً', r_no_cost: 'لا توجد تكلفة مسجلة', r_no_dep_calc: 'لا يوجد إهلاك مهيأ', r_zero_unproven: 'حقل القيمة الدفترية = 0 لكن الإهلاك المرحّل لا يدعمه', r_mismatch: 'حقل القيمة الدفترية يختلف عن التكلفة ناقص الإهلاك المرحّل', r_load_failed: 'تعذرت قراءة مستند الأصل',
note_nostatus: 'مرشح الحالة غير مطبق في هذه الصفحة؛ تقسّم البطاقات السجلات حسب حالة النظام.',
p_total: 'إجمالي المعدات المسجلة', p_active: 'المعدات النشطة', p_ooo: 'خارج الخدمة', p_cost: 'تكلفة الاقتناء المسجلة',
empty_plant: 'لا توجد أصول مصانع وآلات مطابقة للمرشحات', t_inventory: 'جرد الآلات', c_mreq: 'صيانة مطلوبة', has_plan: 'لها خطة', t_custodian: 'المسؤول / الشخص المسؤول', t_mreq: 'متطلبات الصيانة', mreq_flag: 'أصول معلّمة «صيانة مطلوبة»', mreq_noplan: 'معلّمة لكن بدون خطة صيانة', t_mhist: 'سجل الصيانة', t_repairs: 'سجل الأعطال والإصلاحات', c_avail: 'الجاهزية التشغيلية',
avail_msg: 'لا يمكن استنتاج الجاهزية أو وقت التشغيل من الحالة المحاسبية. نص التوقف المسجل في الإصلاحات: {0}', no_downtime: 'لا يوجد', no_logs: 'لا توجد سجلات صيانة لهذه الأصول', no_repairs: 'لا توجد سجلات إصلاح لهذه الأصول', no_repairs_s: 'لا توجد مدخلات مطابقة في إصلاح الأصول.', repairs_other: 'يوجد {0} سجل إصلاح لأصول خارج نطاق المصانع والأثاث وهي مستبعدة.',
c_task: 'مهمة الصيانة', c_mtype: 'نوع الصيانة', c_due: 'تاريخ الاستحقاق', c_completed: 'تاريخ الإنجاز', c_ref: 'المستند', c_failure: 'تاريخ العطل', c_repcost: 'تكلفة الإصلاح', c_downtime: 'مدة التوقف', c_desc: 'الوصف', capitalized: 'مرسملة',
note_dm: 'سجلات الأثاث من DM Assets (كرسي، طاولة) وفئة الأصل Fixtures & Fittings. مرشحات الشركة والقسم والحالة لا تنطبق على DM Assets (لا توجد حقول مقابلة). لا يحتوي DM Assets على كمية أو تكلفة أو حالة: الأعداد سجلات وليست تقديرات.',
f_chairs: 'إجمالي الكراسي', f_tables: 'إجمالي الطاولات', f_other: 'أثاث آخر (سجلات الأصول)', f_assigned: 'مسندة لموظف', f_unassigned: 'غير مسندة', f_incomplete: 'سجلات ناقصة', f_byloc: 'الأثاث حسب الموقع', f_byemp: 'الأثاث حسب الموظف', t_furn_reg: 'سجل الأثاث (DM Assets)', c_employee: 'الموظف', c_recdate: 'تاريخ التسجيل', c_condition: 'الحالة الفنية', t_fx: 'أصول الأثاث والتجهيزات (نوع Asset)', empty_furn: 'لا توجد سجلات أثاث مطابقة', empty_fx: 'لا توجد أصول أثاث وتجهيزات', empty_fx_s: 'لا توجد سجلات أصول في الفئة {0}، لذلك قيمة الأثاث غير متاحة.',
val_rule: 'تُعد القيمة الدفترية «موثقة» فقط عندما تساوي (التكلفة − الإهلاك الافتتاحي − إهلاك الجدول المرحّل بقيد يومية) حقل القيمة في النظام (±1). القيمة صفر بلا ترحيلات داعمة تظهر غير موثقة. يُستخدم دفتر مالي واحد لكل أصل (الافتراضي وإلا الأول) لمنع التكرار. لا تُضاف تكلفة الإصلاح إلى تكلفة الأصل. المبالغ بعملة كل شركة.',
val_partial: 'تم فحص التقييم لأول 150 أصلاً من {0}.', v_cost: 'إجمالي تكلفة الاقتناء', v_acc: 'مجمع الإهلاك (موثق)', v_unver: 'تقييمات غير موثقة', v_disp: 'مستبعد / ملغي', v_costcat: 'التكلفة حسب فئة الأصل', v_depyear: 'الإهلاك حسب السنة', v_age: 'توزيع أعمار الأصول', yrs: 'سنة', posted: 'مرحّل', scheduled: 'مجدول', no_sched: 'لا توجد جداول إهلاك',
t_valuation: 'تفاصيل التقييم والاستثناءات المالية', v_open: 'مجمع إهلاك افتتاحي', v_posted: 'الإهلاك المرحّل', v_derived: 'التكلفة − المرحّل', v_field: 'حقل القيمة في النظام', v_fb: 'الدفتر المالي', v_result: 'النتيجة', multi_fb: 'عدة دفاتر', t_disposed: 'الأصول المباعة والمخردة والملغاة', c_disposal: 'تاريخ الاستبعاد', no_disposed: 'لا توجد أصول مباعة أو مخردة أو ملغاة ضمن النطاق',
note_mnt: 'المصدر: صيانة الأصول (الخطط والمهام) وسجل الصيانة وإصلاح الأصول، للأصول المحددة بالمرشحات؛ ويطبق نطاق التاريخ على تواريخ الاستحقاق/العطل. لا يتم استنتاج أي شيء.',
partial_denied: 'لا توجد صلاحية على {0}؛ الأرقام المرتبطة غير مكتملة.', m_planned: 'صيانة مخططة', m_done: 'سجلات صيانة مكتملة', m_pend: 'إصلاحات معلقة', m_comp: 'إصلاحات مكتملة', m_repcost: 'إجمالي تكلفة الإصلاح', m_needs: 'أصول تحتاج صيانة',
t_schedule: 'جدول الصيانة', c_freq: 'التكرار', c_last: 'آخر إنجاز', c_next: 'الاستحقاق القادم', c_tech: 'الفني المسؤول', overdue_c: 'متأخرة', due_soon: 'قريباً', t_calendar: 'تقويم الصيانة', t_alerts: 'تنبيهات الخدمة القادمة والمتأخرة', no_alerts: 'لا توجد تنبيهات', weekdays: 'أحد,اثنين,ثلاثاء,أربعاء,خميس,جمعة,سبت',
m_bycat: 'الصيانة حسب فئة الأصل', m_costasset: 'تكلفة الإصلاح حسب الأصل', m_tech: 'إسناد الفنيين', t_prev: 'جدول الصيانة الوقائية', prev_count: 'يظهر {0} مهمة وقائية في الجدول أعلاه.', no_prev: 'لا توجد مهام صيانة وقائية', t_comp_hist: 'سجل إنجاز الصيانة', c_actions_done: 'الإجراءات المنفذة', c_cert: 'الشهادة', view_cert: 'عرض الشهادة', no_cert: 'لا توجد شهادة', t_corrective: 'الصيانة التصحيحية وسجل الأعطال والإصلاح', t_spares: 'قطع الغيار المستهلكة (إصلاح الأصول)', c_item: 'الصنف', c_qty: 'الكمية', c_value: 'القيمة', no_spares: 'لا توجد قطع غيار مستهلكة', no_spares_s: 'لا توجد أصناف مستهلكة مسجلة في إصلاح الأصول.',
ts_planned: 'مخططة', ts_overdue: 'متأخرة (محسوبة)', ts_cancelled: 'ملغاة', ts_ended: 'منتهية',
insp_audit: 'نتيجة التدقيق: لا يوجد في النظام نوع مستند مخصص لفحص المصانع/الأثاث (لا نجاح/رسوب ولا قائمة تحقق ولا صور ولا إجراءات تصحيحية). يوجد فحص المركبات وفحص الجودة لكنهما لا يرتبطان بهذه الأصول. المتاح فعلياً جزئياً هو مهام المعايرة في صيانة الأصول فقط. إنشاء الفحوصات غير مُهيّأ ولم يتم إنشاء أي شيء.',
i_sched: 'فحوصات مجدولة', i_done: 'فحوصات مكتملة', i_pass: 'فحوصات ناجحة', i_fail: 'فحوصات راسبة', i_over: 'فحوصات متأخرة', i_corr: 'تتطلب إجراءً تصحيحياً', insp_no_src: 'لا يوجد مصدر في النظام', insp_real: 'بيانات فعلية متاحة: المعايرة (صيانة الأصول)', cal_sched: 'خطط المعايرة', cal_done: 'معايرات مكتملة (السجلات)', cal_over: 'معايرات متأخرة',
insp_plant: 'فحص المصانع والآلات', insp_elec: 'الفحص الكهربائي', insp_mech: 'الفحص الميكانيكي', insp_safety: 'فحص السلامة', insp_furn: 'فحص حالة الأثاث', insp_cal: 'فحص المعايرة', cal_hint: 'مهام وسجلات المعايرة من صيانة الأصول.',
insp_check: 'قائمة التحقق المقترحة', insp_check_h: 'للعرض فقط — لا يوجد تخزين في النظام', create_insp: 'إنشاء فحص', ck1: 'الحالة المادية', ck2: 'الحالة الميكانيكية', ck3: 'السلامة الكهربائية', ck4: 'الحالة التشغيلية', ck5: 'الأضرار الظاهرة', ck6: 'معدات السلامة', ck7: 'المعايرة أو الاعتماد', ck8: 'ملاحظات الفاحص', ck9: 'صور الفحص', ck10: 'الإجراءات التصحيحية المطلوبة',
insp_sources: 'المصادر التي تم فحصها', insp_sources_h: 'أنواع المستندات الموجودة في النظام', src_cal: 'مهام/سجلات المعايرة فقط، دون نتيجة نجاح/رسوب.', src_vehicle: 'للمركبات فقط، دون ربط بالأصول.', src_qi: 'جودة المخزون/الأصناف وليست أصولاً ثابتة.', src_none: 'نوع مستند فحص الأصول غير موجود.',
t_insp: 'جدول الفحص (سجلات المعايرة)', c_itype: 'نوع الفحص', c_idate: 'آخر فحص', c_inspector: 'الفاحص', c_result: 'النتيجة', c_remarks: 'ملاحظات', cert_required: 'مطلوبة', no_insp_rows: 'لا توجد سجلات معايرة', no_insp_rows_s: 'لا توجد مهام معايرة لهذه الأصول.',
note_assign: 'تُعرض ثلاثة مصادر منفصلة دون دمج: مسؤول الأصل، وDM Assets، وسجلات اقتناء الأصول. التواريخ وحالة الإرجاع تظهر فقط عندما يسجلها المصدر.',
as_asset: 'أصول لها مسؤول', as_dm: 'سجلات DM Assets', as_acq: 'بنود سجلات الاقتناء', as_emps: 'الموظفون', link_check: 'فحص المعرّفات: {0} من {1} بند اقتناء له رقم أصل DM يطابق معرّفاً في DM Assets. لا تُدمج السجلات لذا لا يوجد عدّ مزدوج.',
as_t1: 'مسؤولو الأصول (نوع Asset)', as_t2: 'سجل DM Assets', as_t3: 'سجلات اقتناء الأصول (صرف / إرجاع)', furn_only: 'الأثاث فقط', all_cats: 'كل الفئات', all_items: 'كل البنود', c_assigned: 'تاريخ الإسناد', c_return: 'حالة الإرجاع', c_comploc: 'الشركة / الموقع', via_mv: 'عبر حركة الأصل', empty_cust: 'لا توجد أصول لها مسؤول', empty_dm: 'لا توجد سجلات DM Assets', empty_acq: 'لا توجد سجلات اقتناء', c_dmno: 'رقم أصل DM', c_wstate: 'الوضع', returned: 'مرتجع', issued: 'مصروف',
note_move: 'المصدر: حركة الأصول وبنودها. نطاق التاريخ يطبق على تاريخ المعاملة؛ والموقع يطابق المصدر أو الوجهة.',
mv_lines: 'بنود الحركة', mv_docs: 'مستندات الحركة', mv_in: 'أصول المصانع/الأثاث', mv_out: 'فئات أخرى', mv_can: 'ملغاة', scope_only: 'المصانع والأثاث فقط', c_mdate: 'تاريخ الحركة', c_mtype2: 'نوع الحركة', c_src: 'الموقع المصدر', c_dst: 'الوجهة', c_from: 'من موظف', c_to: 'مسندة إلى', c_doc: 'مستند الحركة', c_refdoc: 'المرجع', submitted: 'معتمد', outside_scope: 'خارج النطاق', empty_mv: 'لا توجد حركات مطابقة', empty_mv_s: 'لا توجد بنود حركة لأصول المصانع أو الأثاث. اختر كل الفئات لعرض الباقي.',
note_audit: 'نتائج للقراءة فقط. لا يتم تغيير أي شيء تلقائياً؛ كل صف يرتبط بسجل النظام لتصحيحه. مرشحا الحالة والتاريخ غير مطبقين هنا.',
x_total: 'إجمالي الملاحظات', sev_high: 'عالية', sev_medium: 'متوسطة', sev_low: 'منخفضة', sev_info: 'معلومة', c_severity: 'الخطورة', c_asset: 'الأصل', c_issue: 'المشكلة', c_source: 'المصدر', c_fix: 'التصحيح المقترح', c_view: 'عرض السجل', no_exceptions: 'لا توجد استثناءات', no_exceptions_s: 'اجتازت جميع الفحوصات للمرشحات الحالية.',
x_cancelled: 'سجل أصل ملغي', f_cancelled: 'للعلم: مستبعد من الإجماليات النشطة. يُحفظ لأغراض التدقيق.', x_draft: 'الأصل ما زال مسودة', f_draft: 'اعتمد المسودة أو احذفها.', x_noloc: 'الموقع غير محدد', f_noloc: 'حدد موقع الأصل.', x_nocust: 'لا يوجد مسؤول', f_nocust: 'أسند مسؤولاً (موظفاً).', x_nodate: 'تاريخ الشراء غير محدد', f_nodate: 'أدخل تاريخ الشراء.', x_nocost: 'التكلفة غير مسجلة أو صفر', f_nocost: 'راجع تكلفة الأصل مع المالية.',
x_fdflag: 'الحالة مهلك بالكامل لكن علامة «مهلك بالكامل» غير مفعّلة', f_fdflag: 'راجع العلامة مع المالية؛ لا تعدّلها قبل فحص قيود الإهلاك.', x_nomplan: 'صيانة مطلوبة بدون خطة صيانة', f_nomplan: 'أنشئ خطة صيانة أصول.', x_disposed: 'الأصل {0}', f_disposed: 'مستبعد من الإجماليات النشطة.', x_dup: 'احتمال تكرار مع {0} (نفس الاسم والشركة والتاريخ والتكلفة)', f_dup: 'تأكد إن كان تكراراً فعلياً وألغِ السجل الزائد.',
x_unver: 'تعذر التحقق من القيمة الدفترية', f_unver: 'راجع جدول الإهلاك وقيود اليومية مع المالية.', x_overdue: 'صيانة متأخرة «{0}» (الاستحقاق {1})', f_overdue: 'أكمل المهمة أو حدّث جدولها.', x_nocert: 'أُنجزت «{0}» بدون الشهادة المطلوبة', f_nocert: 'أرفق الشهادة بالسجل.', x_noid: 'معرّف الأصل غير موجود', f_noid: 'حدد رقم الأصل.', x_dmdup: 'رقم أصل مكرر في DM Assets', x_furn_inc: 'سجل أثاث ناقص: {0} غير موجود', f_furn_inc: 'أكمل الحقل الناقص.',
t_sources: 'مصادر بيانات النظام الموثقة والصلاحيات', c_access: 'الصلاحية',
d_title: 'تفاصيل الأصل', d_identity: 'التعريف', d_operational: 'المعلومات التشغيلية', d_financial: 'المعلومات المالية', d_history: 'السجل', d_avail: 'تاريخ الجاهزية للاستخدام', d_qty: 'كمية الأصل', d_insend: 'انتهاء التأمين', d_disposal: 'تاريخ الاستبعاد', d_hist: 'التكلفة التاريخية (إجمالي تكلفة الأصل)', d_gross: 'إجمالي مبلغ الشراء', d_addl: 'تكلفة إضافية للأصل', d_field: 'القيمة بعد الإهلاك في النظام', d_calc: 'احتساب الإهلاك', d_fbooks: 'الدفاتر المالية', d_date: 'تاريخ الجدول', d_amount: 'المبلغ', d_posted: 'قيد اليومية', d_mv: 'الحركات', d_mnt: 'سجلات الصيانة', d_acqlink: 'سجلات اقتناء بنفس رقم أصل DM', d_cost: 'تكلفة الاقتناء', dm_nofin: 'لا يحتوي DM Assets على تكلفة أو إهلاك أو حالة موثقة؛ لذلك لا تُعرض ولا تُقدّر.'
};
  var APP = {
    key: '__dmsPlantFurniture',
    period: false,
    tabs: [['overview', 'tab_overview'], ['register', 'tab_register'], ['plant', 'tab_plant'], ['furniture', 'tab_furniture'], ['valuation', 'tab_valuation'], ['assign', 'tab_assign'], ['movement', 'tab_movement'], ['audit', 'tab_audit']].map(function (x) { return { id: x[0], en: I.en[x[1]], ar: I.ar[x[1]] }; }).concat([{ id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }]),
    filters: [
      { k: 'company', en: I.en.f_company, ar: I.ar.f_company, options: function () { return META ? META.companies.map(function (c) { return c.name; }) : []; } },
      { k: 'category', en: I.en.f_category, ar: I.ar.f_category, options: function () { return SCOPE_CATS; } },
      { k: 'location', en: I.en.f_location, ar: I.ar.f_location, options: function () { return optsOf('location', META ? META.dmLoc : []); } },
      { k: 'department', en: I.en.f_dept, ar: I.ar.f_dept, options: function () { return optsOf('department', []); } },
      { k: 'custodian', en: I.en.f_custodian, ar: I.ar.f_custodian, options: function () { return optsOf('custodian', META ? META.dmEmp : []); } },
      { k: 'status', en: I.en.f_status, ar: I.ar.f_status, none: [I.en.st_active, I.ar.st_active], options: function () { return [['noncancelled', 'st_noncancelled'], ['all', 'st_all'], ['cancelled', 'st_cancelled'], ['draft', 'st_draft']].map(function (x) { return { v: x[0], l: t(x[1]) }; }).concat(STATUS_OPTS.map(function (s) { return { v: 'st:' + s, l: s }; })); } },
      { k: 'from', en: I.en.f_from, ar: I.ar.f_from, type: 'date' },
      { k: 'to', en: I.en.f_to, ar: I.ar.f_to, type: 'date' },
      { k: 'q', en: I.en.f_search, ar: I.ar.f_search, type: 'text', ph: [I.en.f_search_ph, I.ar.f_search_ph] }
    ],
    sources: ['ov'],
    dtLabels: { 'Asset': ['Asset', 'أصل'], 'DM Assets': ['DM asset', 'أصل DM'], 'Asset Maintenance': ['Maintenance plan', 'خطة صيانة'], 'Asset Maintenance Log': ['Maintenance log', 'سجل صيانة'] },
    title: function () { return t('title'); },
    stamp: function () { return t('subtitle'); },
    filterNote: function () { return t('note_dm'); },
    boot: function () { return loadMeta(); },
    load: function () { MEMO = {}; run('ov', loadOverview); run('audit', loadAudit); loadTab(tab); },
    onTab: function (id) { loadTab(id); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return META && META.missingCat.length ? alertBox('warn', esc(t('cat_missing', META.missingCat.join(', ')))) : ''; },
    content: function (x, AM) { return ({ overview: vOverview, register: vRegister, plant: vPlant, furniture: vFurniture, valuation: vValuation, assign: vAssign, movement: vMovement, audit: vAudit, actions: vActions })[x](AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v) { return onAct(a, v); }
  };
  /* ==== DMS kit v1 · generated from tools/erp/kit/dms-kit.js by build_kit.py — edit the kit, not this copy ==== */
  /* Shared runtime for DM dashboards on the standard (toolbar, period, filters, tabs, tables, drill-downs, charts,
     actions pending). Copied into each dashboard.js by tools/erp/kit/build_kit.py; the dashboard defines `APP` before
     this block. Read-only helpers: frappe.client.get_list / frappe.desk.query_report.run under the viewer's permissions. */
  var G = window;
  var ROOT = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
  var HOST = ROOT.querySelector('[data-dms-root]');
  if (!HOST) { return; }
  if (G[APP.key] && typeof G[APP.key].destroy === 'function') { try { G[APP.key].destroy(); } catch (e) { /* ignore */ } }
  var abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var SIG = abort ? { signal: abort.signal } : false;
  var timers = [], destroyed = false, GEN = 0, BOOTED = false, LOADED = '';
  G[APP.key] = { destroy: function () { destroyed = true; GEN++; if (abort) { abort.abort(); } timers.forEach(clearTimeout); timers = []; } };
  var CFG = Object.assign({ conc: 6, pageSize: 25, modalPage: 15, weekStart: 0 }, APP.cfg || {});
  var CUR = 'SAR';
  try { CUR = (frappe.boot.sysdefaults && frappe.boot.sysdefaults.currency) || 'SAR'; } catch (e) { /* default */ }
  var LANG = 'en';
  try { var sv = G.localStorage.getItem('dms_lang'); if (sv === 'ar' || sv === 'en') { LANG = sv; } } catch (e) { /* storage unavailable */ }
  function tr(en, ar) { return LANG === 'ar' ? ar : en; }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function plain(s, n) { return clean(String(s || '').replace(/<[^>]*>/g, ' ')).slice(0, n || 90); }
  function $(sel) { return HOST.querySelector(sel); }
  function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) { fn(); } }, ms); timers.push(id); return id; }
  function bdi(s) { return '<bdi>' + esc(s) + '</bdi>'; }
  function num(n) { return (n == null || isNaN(n)) ? '—' : Math.round(n).toLocaleString('en-US'); }
  function money(v) {
    if (v == null || isNaN(v)) { return '—'; }
    var a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e9) { return s + (a / 1e9).toFixed(2) + 'B'; }
    if (a >= 1e6) { return s + (a / 1e6).toFixed(2) + 'M'; }
    if (a >= 1e4) { return s + (a / 1e3).toFixed(1) + 'K'; }
    return s + Math.round(a).toLocaleString('en-US');
  }
  function amt(v) { return (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function moneyS(v, cur) { return (cur || CUR) + ' ' + money(v); }
  function moneyB(v, cur) { return '<bdi>' + esc(moneyS(v, cur)) + '</bdi>'; }
  function moneyFull(v, cur) { return (v == null || isNaN(v)) ? '' : (cur || CUR) + ' ' + amt(v); }
  function cur$(v, cur) { return '<bdi>' + esc(money(v)) + '<small>' + esc(cur || CUR) + '</small></bdi>'; }
  function pct(n, d, dp) { return (d > 0 && n != null) ? (n / d * 100).toFixed(dp == null ? 1 : dp) + '%' : tr('N/A', 'غير متاح'); }
  function sum(arr, f) { var t = 0; for (var i = 0; i < arr.length; i++) { t += (f ? f(arr[i]) : arr[i]) || 0; } return t; }
  function vals(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
  function uniq(a) { var m = {}; a.forEach(function (x) { if (x) { m[x] = 1; } }); return Object.keys(m).sort(function (x, y) { return x.localeCompare(y); }); }
  function rep(s, n) { var o = ''; for (var i = 0; i < n; i++) { o += s; } return o; }
  function one(r) { return (r && r[0]) || {}; }
  function groupBy(rows, f) { var m = {}; rows.forEach(function (r) { var k = f(r); (m[k] || (m[k] = [])).push(r); }); return m; }
  var NAtxt = function () { return tr('Not assigned', 'غير مُعيَّن'); };

  /* ---------- dates (ERP site time zone, calendar arithmetic) ---------- */
  function siteTz() {
    try {
      if (G.frappe && frappe.boot) {
        if (frappe.boot.time_zone && frappe.boot.time_zone.system) { return frappe.boot.time_zone.system; }
        if (frappe.boot.sysdefaults && frappe.boot.sysdefaults.time_zone) { return frappe.boot.sysdefaults.time_zone; }
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function siteParts() {
    var tz = siteTz(), o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }, p;
    if (tz) { o.timeZone = tz; }
    try { p = new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()); } catch (e) { delete o.timeZone; p = new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()); }
    var m = {}; p.forEach(function (x) { m[x.type] = x.value; }); if (m.hour === '24') { m.hour = '00'; } return m;
  }
  function parseISO(s) {
    if (!s || typeof s !== 'string') { return null; }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3], ms = Date.UTC(y, mo - 1, d), dt = new Date(ms);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) { return null; }
    return ms;
  }
  function isoOf(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function addDays(iso, n) { return isoOf(parseISO(iso) + n * 86400000); }
  function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  var TODAY = '', STAMP = '';
  function setToday() { var p = siteParts(); TODAY = p.year + '-' + p.month + '-' + p.day; STAMP = p.hour + ':' + p.minute; }
  function monthStart(iso) { return iso.slice(0, 8) + '01'; }
  function monthEnd(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return isoOf(Date.UTC(y, m, 0)); }
  function addMonths(iso, n) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n; return isoOf(Date.UTC(y, m, 1)); }
  function weekStartOf(iso) { var dow = new Date(parseISO(iso)).getUTCDay(); return addDays(iso, -((dow - CFG.weekStart + 7) % 7)); }
  function quarterStart(iso) { var m = +iso.slice(5, 7); return iso.slice(0, 5) + ('0' + (Math.floor((m - 1) / 3) * 3 + 1)).slice(-2) + '-01'; }
  function shiftMonths(iso, n) {
    var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n, d = +iso.slice(8, 10), last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return isoOf(Date.UTC(y, m, Math.min(d, last)));
  }
  function periodRange(key, cf, ct) {
    var t = TODAY, y = t.slice(0, 4), ws = weekStartOf(t), qs = quarterStart(t), lm = addMonths(monthStart(t), -1);
    switch (key) {
      case 'today': return [t, t];
      case 'yesterday': return [addDays(t, -1), addDays(t, -1)];
      case 'week': return [ws, addDays(ws, 6)];
      case 'lastWeek': return [addDays(ws, -7), addDays(ws, -1)];
      case 'month': return [monthStart(t), monthEnd(t)];
      case 'lastMonth': return [lm, monthEnd(lm)];
      case 'quarter': return [qs, monthEnd(addMonths(qs, 2))];
      case 'year': return [y + '-01-01', y + '-12-31'];
      case 'prevYear': return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
      case 'custom': return [cf, ct];
      default: return [y + '-01-01', t];   // ytd
    }
  }
  /* Comparison window: the same span one preset unit earlier; custom ranges compare with the equally long range before. */
  function prevRange(key, from, to) {
    switch (key) {
      case 'today': case 'yesterday': return [addDays(from, -1), addDays(to, -1)];
      case 'week': case 'lastWeek': return [addDays(from, -7), addDays(to, -7)];
      case 'month': case 'lastMonth': return [shiftMonths(from, -1), shiftMonths(to, -1)];
      case 'quarter': return [shiftMonths(from, -3), shiftMonths(to, -3)];
      case 'ytd': case 'year': case 'prevYear': return [shiftMonths(from, -12), shiftMonths(to, -12)];
      default: var n = diffDays(from, to) + 1; return [addDays(from, -n), addDays(from, -1)];
    }
  }
  /* In-progress periods stop at today, so this month to date compares with the same days of last month. */
  function clip(r) { return [r[0], r[1] > TODAY && r[0] <= TODAY ? TODAY : r[1]]; }
  function cmpRanges() { var c = clip(PERIOD); return { cur: c, prev: prevRange(F.period, c[0], c[1]) }; }
  function monthList(from, to) { var out = [], cur = monthStart(from); for (var i = 0; i < 72 && cur <= to; i++) { out.push(cur.slice(0, 7)); cur = addMonths(cur, 1); } return out; }
  function locale() { return LANG === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB'; }
  function fmtDate(iso, yr) {
    try { var o = { day: 'numeric', month: 'short', timeZone: 'UTC' }; if (yr) { o.year = 'numeric'; } return new Intl.DateTimeFormat(locale(), o).format(new Date(parseISO(String(iso).slice(0, 10)))); } catch (e) { return iso; }
  }
  function rangeLabel(r) {
    if (!r || !r[0] || !r[1]) { return ''; }
    return r[0] === r[1] ? fmtDate(r[0], true) : fmtDate(r[0], r[0].slice(0, 4) !== r[1].slice(0, 4)) + ' – ' + fmtDate(r[1], true);
  }
  var PLR = null;
  function daysTxt(n) {
    if (LANG !== 'ar') { return num(n) + (n === 1 ? ' day' : ' days'); }
    var c = 'other'; try { c = (PLR || (PLR = new Intl.PluralRules('ar'))).select(n); } catch (e) { /* generic form */ }
    return c === 'one' ? 'يوم واحد' : c === 'two' ? 'يومان' : c === 'few' ? n + ' أيام' : c === 'many' ? n + ' يومًا' : n + ' يوم';
  }
  function ageOf(iso) { var d = iso ? diffDays(String(iso).slice(0, 10), TODAY) : 0; return isNaN(d) ? 0 : Math.max(0, d); }
  function lateTxt(iso) {
    var d = diffDays(String(iso).slice(0, 10), TODAY); if (isNaN(d)) { return ''; }
    return d > 0 ? tr(daysTxt(d) + ' overdue', 'متأخر ' + daysTxt(d)) : d === 0 ? tr('Due today', 'مستحق اليوم') : tr('Due in ' + daysTxt(-d), 'مستحق خلال ' + daysTxt(-d));
  }
  function agoTxt(iso, en, ar) { var a = ageOf(iso); return a ? tr((en || 'Waiting') + ' ' + daysTxt(a), (ar || 'منذ') + ' ' + daysTxt(a)) : tr('Today', 'اليوم'); }

  /* ---------- ERP read-only API layer (bounded concurrency, one retry, cancellation) ---------- */
  var REQ_TIMEOUT = 90000;
  function callP(method, args) {
    return new Promise(function (resolve, reject) {
      var done = false, ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { if (done) { return; } done = true; if (ctl) { try { ctl.abort(); } catch (x) { /* ignore */ } } var te = new Error('Request timed out'); te.timeout = true; reject(te); }, REQ_TIMEOUT);
      var body = new URLSearchParams();
      Object.keys(args || {}).forEach(function (k) { var v = args[k]; if (v === undefined || v === null) { return; } body.append(k, (typeof v === 'object') ? JSON.stringify(v) : String(v)); });
      fetch('/api/method/' + method, { method: 'POST', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined,
        headers: { 'X-Frappe-CSRF-Token': (G.frappe && frappe.csrf_token) || '', 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() })
        .then(function (r) { return r.text().then(function (txt) { return { r: r, txt: txt }; }); })
        .then(function (o) {
          if (done) { return; } done = true; clearTimeout(timer);
          var j = null; try { j = JSON.parse(o.txt); } catch (x) { /* ignore */ }
          if (o.r.ok && j && !j.exc) { resolve(j.message === undefined ? null : j.message); return; }
          var ex = String((j && (j.exception || j.exc_type)) || '');
          var perm = o.r.status === 401 || o.r.status === 403 || /permission/i.test(ex);
          var e = new Error((perm ? 'No access to ' + ((args && (args.doctype || args.report_name)) || method) : (ex.split(':').slice(-1)[0].trim() || ('HTTP ' + o.r.status))));
          e.status = perm ? 403 : o.r.status; reject(e);
        })
        .catch(function (err) { if (done) { return; } done = true; clearTimeout(timer); reject(err || new Error('request failed')); });
    });
  }
  var active = 0, queue = [];
  function pump() {
    while (active < CFG.conc && queue.length) {
      var j = queue.shift(); active++;
      j.fn().then(j.res, j.rej).then(function () { active--; pump(); });
    }
  }
  function limited(fn) { return new Promise(function (res, rej) { queue.push({ fn: fn, res: res, rej: rej }); pump(); }); }
  function guarded(chk, method, args) {
    return limited(function () {
      if (destroyed || (chk && !chk())) { return Promise.resolve(null); }
      return callP(method, args).catch(function (e) { if (e && (e.status === 403 || e.timeout || e.status === 417)) { throw e; } return new Promise(function (r) { setTimeout(r, 400); }).then(function () { return callP(method, args); }); });
    });
  }
  function errKind(e) {
    var txt = ''; try { txt = (e && (e.responseText || e.statusText || e.message)) || ''; } catch (x) { /* ignore */ }
    return (/PermissionError|not permitted|No access|403/i.test(String(txt)) || (e && e.status === 403)) ? 'perm' : 'tech';
  }
  function getList(args, chk) { return guarded(chk, 'frappe.client.get_list', args); }
  function getCount(dt, filters, chk) { return getList({ doctype: dt, fields: ['count(name) as n'], filters: filters || [], limit_page_length: 1 }, chk).then(function (r) { return +one(r).n || 0; }); }
  /* All rows of a bounded list (paged); rejects with e.tooLarge when the source exceeds `cap`. */
  function fetchAll(args, chk, cap) {
    cap = cap || 20000;
    return getCount(args.doctype, args.filters, chk).then(function (n) {
      if (n > cap) { var e = new Error('too large'); e.tooLarge = n; throw e; }
      var jobs = []; for (var i = 0; i < Math.ceil(n / 500); i++) { jobs.push(getList(Object.assign({}, args, { order_by: args.order_by || 'name asc', limit_start: i * 500, limit_page_length: 500 }), chk)); }
      return Promise.all(jobs).then(function (res) { var out = []; res.forEach(function (r) { if (r) { out = out.concat(r); } }); return out; });
    });
  }
  function docUrl(dt, name) {
    try { if (G.frappe && frappe.utils && frappe.utils.get_form_link) { return frappe.utils.get_form_link(dt, name); } } catch (e) { /* fall through */ }
    return '/app/' + dt.toLowerCase().replace(/ /g, '-') + '/' + encodeURIComponent(name);
  }
  function docLink(dt, name, label) { return '<a class="dms-link" href="' + esc(docUrl(dt, name)) + '" target="_blank" rel="noopener noreferrer"><bdi>' + esc(label || name) + '</bdi> ↗</a>'; }

  /* ---------- data store: each source loads and renders independently; stale generations are dropped ---------- */
  var D = {};
  var softT = null;
  function soon() { if (softT) { return; } softT = later(function () { softT = null; renderSoft(); }, 40); }
  function run(key, fn) {
    var g = GEN, chk = function () { return g === GEN && !destroyed; }, tok = {};
    D[key] = null; D[key + 'Err'] = null; D[key + 'Tok'] = tok;
    var mine = function () { return chk() && D[key + 'Tok'] === tok; };
    fn(mine).then(function (v) { if (!mine()) { return; } D[key] = v; if (APP.afterLoad) { APP.afterLoad(key); } soon(); },
      function (e) { if (!mine()) { return; } D[key + 'Err'] = e && e.tooLarge ? 'large:' + e.tooLarge : errKind(e); if (G.console && e && !e.status && !e.tooLarge) { console.error(APP.key, key, e); } soon(); });
  }
  function busy() { return !BOOTED || (APP.sources || []).some(function (k) { return D[k] == null && D[k + 'Err'] == null; }); }
  function errText(kind) { return /^large:/.test(String(kind)) ? tr('too many records (' + num(+String(kind).slice(6)) + ') — narrow the filters or period', 'عدد كبير من السجلات (' + num(+String(kind).slice(6)) + ') — ضيّق المرشحات أو الفترة') : kind === 'perm' ? tr('permission denied for your user', 'لا تملك صلاحية القراءة') : tr('technical error while reading', 'خطأ تقني أثناء القراءة'); }

  /* ---------- UI primitives ---------- */
  var ICO = {
    refresh: '<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>', filter: '<path d="M4 5h16l-6.2 7.6V19l-3.6 1.6v-8z"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>', down: '<path d="m6 9 6 6 6-6"/>',
    prev: '<path d="m15 6-6 6 6 6"/>', next: '<path d="m9 6 6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    up: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>', dn: '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>', dl: '<path d="M12 4v11M7 10.5 12 15.5l5-5M5 20h14"/>'
  };
  function ico(n, cls) { return '<svg class="dms-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICO[n] + '</svg>'; }
  function kpi(o) {
    var inner = '<span class="dms-kpi-h"><span class="dms-kpi-l">' + (o.dot ? '<i class="dms-dot" style="--dms-c:' + o.dot + '"></i>' : '') + esc(o.label) + '</span>' + (o.top || '') + '</span>' +
      '<span class="dms-kpi-n">' + o.val + '</span>' + (o.sub ? '<span class="dms-kpi-s">' + o.sub + '</span>' : '') + (o.foot != null ? '<span class="dms-kpi-f">' + o.foot + '</span>' : '');
    var t = o.tip ? ' title="' + esc(o.tip) + '"' : '';
    return o.act ? '<button type="button" class="dms-kpi" data-act="kpi" data-v="' + esc(o.act) + '"' + t + '>' + inner + '</button>' : '<div class="dms-kpi"' + t + '>' + inner + '</div>';
  }
  function kpis(list, ov) { return '<div class="dms-grid dms-kpis' + (ov ? ' dms-ov-kpis' : '') + '">' + list.join('') + '</div>'; }
  function tagc(txt) { return '<span class="dms-tag">' + txt + '</span>'; }
  function stat(k, txt) { return '<span class="dms-stat dms-stat-' + k + '">' + esc(txt) + '</span>'; }
  function ctx(html) { return '<span class="dms-kpi-ctx">' + html + '</span>'; }
  function badge(txt, color) { return '<span class="dms-badge" style="--dms-c:' + color + '">' + esc(txt) + '</span>'; }
  function wait() { return '<span class="dms-sm">' + esc(tr('Calculating…', 'جارٍ الحساب…')) + '</span>'; }
  function asOf() { return tagc(esc(tr('As of today', 'حتى اليوم'))); }
  /* Value of a source-backed KPI: '…' while loading, '—' when the source failed (never a false zero). */
  function kv(key, f) { return D[key + 'Err'] ? '—' : D[key] == null ? '…' : f(D[key]); }
  function ks(key, f) { return D[key + 'Err'] ? esc(tr('Unavailable', 'غير متاح')) : D[key] == null ? wait() : f(D[key]); }
  function spark(vs) {
    var n = vs.length, real = vs.filter(function (v) { return v != null; }), pts = [];
    if (n < 3 || real.length < 3 || !real.some(function (v) { return v > 0; })) { return ''; }
    var max = Math.max.apply(null, real), min = Math.min(0, Math.min.apply(null, real)), rng = (max - min) || 1;
    vs.forEach(function (v, i) { if (v != null) { pts.push([(i / (n - 1) * 100).toFixed(2), (26 - (v - min) / rng * 23).toFixed(2)]); } });
    var line = pts.map(function (p) { return p.join(','); }).join(' L');
    return '<svg class="dms-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="dms-spark-a" d="M' + pts[0][0] + ',28 L' + line + ' L' + pts[pts.length - 1][0] + ',28 Z"/><path class="dms-spark-l" d="M' + line + '"/></svg>';
  }
  /* Change vs the comparison window. fmt formats values; small count bases show "was N" instead of a percentage. */
  function deltaChip(cur, prev, R, fmt, isCount, lowerIsBetter) {
    if (cur == null || prev == null || !R) { return ''; }
    fmt = fmt || moneyS;
    var tip = tr('This period', 'هذه الفترة') + ' (' + rangeLabel(R[0]) + '): ' + fmt(cur) + '\n' + tr('Previous', 'السابقة') + ' (' + rangeLabel(R[1]) + '): ' + fmt(prev);
    var sr = '<span class="dms-sr"> ' + esc(tr('vs previous period', 'مقارنة بالفترة السابقة')) + '</span>';
    if (prev === 0 || (isCount && prev < 5)) { return '<span class="dms-delta dms-flat" data-tip="' + esc(tip) + '">' + esc(tr('was', 'كان')) + ' <bdi>' + esc(fmt(prev)) + '</bdi>' + sr + '</span>'; }
    var p = (cur - prev) / prev * 100, a = Math.abs(p), k = a < 0.05 ? 'flat' : p > 0 ? 'up' : 'down', tone = k === 'flat' ? 'flat' : ((k === 'up') !== !!lowerIsBetter ? 'up' : 'down');
    var txt = a > 999 ? '10×+' : (a < 10 ? a.toFixed(1) : Math.round(a)) + '%';
    return '<span class="dms-delta dms-' + tone + '" data-tip="' + esc(tip) + '">' + (k === 'flat' ? '' : ico(k === 'up' ? 'up' : 'dn')) + '<bdi>' + (k === 'down' ? '−' : '') + txt + '</bdi>' + sr + '</span>';
  }
  function panel(title, body, extra, meta) {
    return '<section class="dms-panelbox ' + (extra || '') + '"><div class="dms-ph"><h3 class="dms-h3">' + esc(title) + '</h3>' + (meta ? '<span class="dms-ph-meta">' + meta + '</span>' : '') + '</div>' + body + '</section>';
  }
  function note(txt) { return '<p class="dms-note">' + txt + '</p>'; }
  function alertBox(kind, html) { return '<div class="dms-alert dms-alert-' + kind + '" role="' + (kind === 'err' ? 'alert' : 'status') + '">' + html + '</div>'; }
  function empty(txt) { return '<div class="dms-empty">' + esc(txt || tr('No data for the current filters.', 'لا توجد بيانات للمرشحات الحالية.')) + '</div>'; }
  function srcErr(kind, what) { return alertBox('err', '<b>' + esc(tr('Source unavailable', 'المصدر غير متاح')) + ':</b> ' + esc(what) + ' — ' + esc(errText(kind))); }
  function skel(n, cls) { return rep('<div class="dms-skel ' + (cls || '') + '"></div>', n); }
  /* Body for a panel backed by source `key`: skeleton while loading, named error on failure, else f(data). */
  function src(key, what, f) { return D[key + 'Err'] ? srcErr(D[key + 'Err'], what) : D[key] == null ? skel(1, 'dms-skel-panel') : f(D[key]); }

  /* ---------- charts (HTML/CSS; hover details via the shared tooltip, data-tip) ---------- */
  function niceMax(v) { if (!(v > 0)) { return 1; } var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function axisFmt(v) { var a = Math.abs(v); return a >= 1e9 ? +(v / 1e9).toFixed(1) + 'B' : a >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? +(v / 1e3).toFixed(1) + 'K' : String(a < 10 ? +v.toFixed(2) : Math.round(v)); }
  function bucketLabel(k, g, short) {
    if (g === 'cat') { return String(k); }
    if (g === 'week' && !short) { return tr('Week of ', 'أسبوع ') + fmtDate(k, true); }
    if (g !== 'month') { return fmtDate(k, !short); }
    try { return new Intl.DateTimeFormat(locale(), { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(parseISO(k + '-01'))); } catch (e) { return k; }
  }
  /* Count charts get whole-number ticks (top is a multiple of 4), so small counts never show 0, 1, 1, 2, 2. */
  function countTop(max, fmt) { var t = niceMax(max); return fmt === num ? Math.max(4, Math.ceil(t / 4) * 4) : t; }
  function granName(g) { return g === 'day' ? tr('by day', 'يوميًا') : g === 'week' ? tr('by week', 'أسبوعيًا') : tr('by month', 'شهريًا'); }
  /* Time buckets for a range: daily up to 45 days, weekly up to 120 days, monthly beyond; stops at today. */
  function buckets(range) {
    var from = range[0], to = clip(range)[1], span = diffDays(from, to) + 1, g = span <= 45 ? 'day' : span <= 120 ? 'week' : 'month', keys = [], cur, i;
    function keyOf(iso) { iso = String(iso).slice(0, 10); return g === 'day' ? iso : g === 'week' ? weekStartOf(iso) : iso.slice(0, 7); }
    if (to < from) { return { keys: [], gran: g, keyOf: keyOf }; }
    if (g === 'month') { keys = monthList(from, to); } else { cur = keyOf(from); for (i = 0; i < 200 && cur <= to; i++) { keys.push(cur); cur = addDays(cur, g === 'day' ? 1 : 7); } }
    return { keys: keys, gran: g, keyOf: keyOf };
  }
  /* Grouped rows (one per date) folded into buckets: rows[dateField], rows[valField]. */
  function series(range, rows, dateF, valF) {
    var B = buckets(range), d = {}; B.keys.forEach(function (k) { d[k] = { v: 0, n: 0 }; });
    (rows || []).forEach(function (r) { var k = B.keyOf(r[dateF]); if (d[k]) { d[k].v += valF ? (+r[valF] || 0) : 1; d[k].n += +r.n || (valF ? 0 : 1); } });
    B.d = d; return B;
  }
  function legend(series) { return '<div class="dms-legend">' + series.map(function (s) { return '<span><i style="--dms-c:' + s.color + '"></i>' + esc(s.label) + '</span>'; }).join('') + '</div>'; }
  /* Column chart. ser = [{label, color, val: function (key) {}}]; fmt formats values (default money). */
  function barChart(keys, gran, ser, fmt, extraTip, emptyTxt) {
    if (!Array.isArray(ser)) { ser = [ser]; }
    fmt = fmt || moneyFull; var max = 0;
    keys.forEach(function (k) { ser.forEach(function (s) { max = Math.max(max, s.val(k) || 0); }); });
    if (!keys.length || !max) { return empty(emptyTxt || tr('Nothing in this range.', 'لا شيء في هذا النطاق.')); }
    var top = countTop(max, fmt), ticks = [0, 0.25, 0.5, 0.75, 1];
    var cols = keys.map(function (k) {
      var tip = bucketLabel(k, gran) + ser.map(function (s) { return '\n' + s.label + ': ' + fmt(s.val(k) || 0); }).join('') + (extraTip ? extraTip(k) : '');
      return '<div class="dms-col" data-tip="' + esc(tip) + '">' + ser.map(function (s) { var v = s.val(k) || 0; return '<i class="dms-bar' + (v ? '' : ' dms-bar-0') + '" style="height:' + (v / top * 100).toFixed(2) + '%;--dms-c:' + s.color + '"></i>'; }).join('') + '</div>';
    }).join('');
    var aria = ser.map(function (s) { return s.label + ': ' + keys.map(function (k) { return bucketLabel(k, gran, true) + ' ' + fmt(s.val(k) || 0); }).join(', '); }).join('; ');
    return '<div class="dms-chart" role="img" aria-label="' + esc(aria) + '"><div class="dms-yaxis" aria-hidden="true">' + ticks.map(function (t) { return '<span style="bottom:' + t * 100 + '%">' + axisFmt(top * t) + '</span>'; }).join('') + '</div>' +
      '<div class="dms-plot">' + ticks.map(function (t) { return '<i class="dms-gl" style="bottom:' + t * 100 + '%"></i>'; }).join('') + '<div class="dms-cols">' + cols + '</div></div><span></span>' +
      '<div class="dms-xaxis" aria-hidden="true">' + keys.map(function (k) { return '<span>' + esc(bucketLabel(k, gran, true)) + '</span>'; }).join('') + '</div></div>' + (ser.length > 1 ? legend(ser) : '');
  }
  /* Line chart for balances (may go negative). ser = [{label, color, val(key), dash?}]; the first series is the main line. */
  function lineChart(keys, gran, ser, fmt) {
    fmt = fmt || moneyFull; var all = [];
    keys.forEach(function (k) { ser.forEach(function (s) { var v = s.val(k); if (v != null) { all.push(v); } }); });
    if (!keys.length || !all.length) { return empty(); }
    var mx = Math.max.apply(null, all), mn = Math.min.apply(null, all), hi = mx > 0 ? niceMax(mx) : 0, lo = mn < 0 ? -niceMax(-mn) : 0;
    if (hi === lo) { hi = lo + 1; }
    var y = function (v) { return (100 - (v - lo) / (hi - lo) * 100).toFixed(2); }, x = function (i) { return (keys.length < 2 ? 50 : i / (keys.length - 1) * 100).toFixed(2); };
    var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (t) { return lo + (hi - lo) * t; });
    var paths = ser.map(function (s) { var pts = keys.map(function (k, i) { var v = s.val(k); return v == null ? null : x(i) + ',' + y(v); }).filter(Boolean); return '<polyline class="dms-line' + (s.dash ? ' dms-line-ref' : '') + '" style="--dms-c:' + s.color + '" points="' + pts.join(' ') + '"/>'; }).join('');
    var zero = lo < 0 ? '<i class="dms-gl dms-gl-0" style="bottom:' + ((0 - lo) / (hi - lo) * 100).toFixed(2) + '%"></i>' : '';
    var hits = keys.map(function (k) { return '<div class="dms-col dms-col-hit" data-tip="' + esc(bucketLabel(k, gran) + ser.map(function (s) { return '\n' + s.label + ': ' + fmt(s.val(k)); }).join('')) + '"></div>'; }).join('');
    var aria = ser[0].label + ': ' + keys.map(function (k) { return bucketLabel(k, gran, true) + ' ' + fmt(ser[0].val(k)); }).join(', ');
    return '<div class="dms-chart" role="img" aria-label="' + esc(aria) + '"><div class="dms-yaxis" aria-hidden="true">' + ticks.map(function (v, i) { return '<span style="bottom:' + i * 25 + '%">' + axisFmt(v) + '</span>'; }).join('') + '</div>' +
      '<div class="dms-plot">' + [0, 25, 50, 75, 100].map(function (b) { return '<i class="dms-gl" style="bottom:' + b + '%"></i>'; }).join('') + zero + '<svg class="dms-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + paths + '</svg><div class="dms-cols">' + hits + '</div></div><span></span>' +
      '<div class="dms-xaxis" aria-hidden="true">' + keys.map(function (k) { return '<span>' + esc(bucketLabel(k, gran, true)) + '</span>'; }).join('') + '</div></div>' + (ser.length > 1 ? legend(ser) : '');
  }
  /* Stacked columns (one bar per key, segments per series). */
  function stackChart(keys, gran, ser, fmt) {
    fmt = fmt || num; var tot = {}, max = 0;
    keys.forEach(function (k) { tot[k] = sum(ser, function (s) { return s.val(k) || 0; }); max = Math.max(max, tot[k]); });
    if (!keys.length || !max) { return empty(); }
    var top = countTop(max, fmt), ticks = [0, 0.25, 0.5, 0.75, 1];
    var cols = keys.map(function (k) {
      var tip = bucketLabel(k, gran) + ser.filter(function (s) { return s.val(k); }).map(function (s) { return '\n' + s.label + ': ' + fmt(s.val(k)); }).join('');
      return '<div class="dms-col" data-tip="' + esc(tip) + '"><span class="dms-stackbar" style="height:' + (tot[k] / top * 100).toFixed(2) + '%">' + ser.map(function (s) { var v = s.val(k) || 0; return v ? '<i style="flex:' + v + ' 0 0;background:' + s.color + '"></i>' : ''; }).join('') + '</span></div>';
    }).join('');
    return '<div class="dms-chart" role="img" aria-label="' + esc(ser.map(function (s) { return s.label; }).join(', ')) + '"><div class="dms-yaxis" aria-hidden="true">' + ticks.map(function (t) { return '<span style="bottom:' + t * 100 + '%">' + axisFmt(top * t) + '</span>'; }).join('') + '</div>' +
      '<div class="dms-plot">' + ticks.map(function (t) { return '<i class="dms-gl" style="bottom:' + t * 100 + '%"></i>'; }).join('') + '<div class="dms-cols">' + cols + '</div></div><span></span>' +
      '<div class="dms-xaxis" aria-hidden="true">' + keys.map(function (k) { return '<span>' + esc(bucketLabel(k, gran, true)) + '</span>'; }).join('') + '</div></div>' + legend(ser);
  }
  function fitChartLabels() {
    HOST.querySelectorAll('.dms-xaxis').forEach(function (axis) {
      var labels = axis.querySelectorAll('span'), widest = 0;
      labels.forEach(function (label) { var range = document.createRange(); range.selectNodeContents(label); widest = Math.max(widest, range.getBoundingClientRect().width); });
      var slots = Math.max(1, Math.min(8, Math.floor(axis.clientWidth / (widest + 16)))), step = Math.max(1, Math.ceil(labels.length / slots));
      labels.forEach(function (label, i) { label.style.visibility = i % step ? 'hidden' : 'visible'; });
    });
  }
  /* Share rows: label · bar · value · %. items = [{label, value, color, act?, tip?}]; ordered=true keeps the given order. */
  function shareList(items, head, fmt, ordered) {
    fmt = fmt || num; var tot = sum(items, function (s) { return s.value; }), rows = items.filter(function (s) { return s.value; });
    if (!ordered) { rows = rows.slice().sort(function (a, b) { return b.value - a.value; }); }
    if (!tot) { return empty(); }
    return (head ? '<div class="dms-share-t">' + head + '</div>' : '') + rows.map(function (s) {
      var tip = s.tip || (s.label + ': ' + fmt(s.value) + ' (' + pct(s.value, tot) + ')');
      var inner = '<span class="dms-share-l"><i class="dms-dot" style="--dms-c:' + s.color + '"></i>' + bdi(s.label) + '</span><span class="dms-share-b"><i style="width:' + (s.value / tot * 100).toFixed(2) + '%;--dms-c:' + s.color + '"></i></span>' +
        '<span class="dms-num">' + esc(fmt(s.value)) + '</span><span class="dms-share-p dms-num">' + pct(s.value, tot, 0) + '</span>';
      return s.act ? '<button type="button" class="dms-share dms-share-btn" data-act="kpi" data-v="' + esc(s.act) + '" data-tip="' + esc(tip) + '">' + inner + '</button>' : '<div class="dms-share" data-tip="' + esc(tip) + '">' + inner + '</div>';
    }).join('');
  }
  /* Ranked horizontal bars: items = [{label, value, color?, act?}]. */
  function hbars(items, fmt, color) {
    if (!items.length) { return empty(); }
    var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); }).concat([1])); fmt = fmt || num;
    return items.map(function (i) {
      var inner = '<span class="dms-split-l">' + bdi(i.label) + '</span><span class="dms-split"><i style="width:' + (Math.abs(i.value) / max * 100).toFixed(2) + '%;background:' + (i.color || color || 'var(--dms-royal)') + '"></i></span><span class="dms-num dms-split-v">' + esc(fmt(i.value)) + '</span>';
      var tip = ' data-tip="' + esc(i.label + ': ' + fmt(i.value)) + '"';
      return i.act ? '<button type="button" class="dms-stack-row dms-split-row" data-act="kpi" data-v="' + esc(i.act) + '"' + tip + '>' + inner + '</button>' : '<div class="dms-stack-row dms-split-row"' + tip + '>' + inner + '</div>';
    }).join('');
  }
  /* Two-part bars ranked by total: items = [{label, total, part, act?}]; parts = [{label, color}] for part and remainder. */
  function splitBars(items, parts, fmt) {
    if (!items.length) { return empty(); }
    fmt = fmt || money; var max = Math.max.apply(null, items.map(function (i) { return i.total; }).concat([1]));
    return items.map(function (i) {
      var tip = i.label + '\n' + parts[0].label + ': ' + fmt(i.part) + '\n' + parts[1].label + ': ' + fmt(i.total - i.part);
      var bar = '<span class="dms-split"><i style="width:' + (i.part / max * 100).toFixed(2) + '%;background:' + parts[0].color + '"></i><i style="width:' + (Math.max(0, i.total - i.part) / max * 100).toFixed(2) + '%;background:' + parts[1].color + '"></i></span>';
      var inner = '<span class="dms-split-l">' + bdi(i.label) + '</span>' + bar + '<span class="dms-num dms-split-v">' + esc(fmt(i.total)) + '</span>';
      return i.act ? '<button type="button" class="dms-stack-row dms-split-row" data-act="kpi" data-v="' + esc(i.act) + '" data-tip="' + esc(tip) + '">' + inner + '</button>' : '<div class="dms-stack-row dms-split-row" data-tip="' + esc(tip) + '">' + inner + '</div>';
    }).join('') + legend(parts);
  }
  function mixBar(segs) {
    var tot = sum(segs, function (s) { return s.value; }); if (!tot) { return ''; }
    return '<span class="dms-mix"><span class="dms-mix-b">' + segs.map(function (s) { return s.value ? '<i style="width:' + (s.value / tot * 100).toFixed(2) + '%;background:' + s.color + '" data-tip="' + esc(s.label + ': ' + (s.fmt || num)(s.value)) + '"></i>' : ''; }).join('') + '</span></span>';
  }
  var PAL = ['var(--dms-royal)', '#6b8be0', '#1f8a5b', '#d97a1e', '#8a97a8', '#a3b4ef', '#c2412d', '#d6a419', '#4b5a6e', '#b6bfca'];

  /* ---------- tables: client-side (search / sort / pagination / CSV) and server-side (paginated, sortable, CSV) ---------- */
  var TBL = {}, TS = {}, SS = {}, focusId = null;
  function regTable(spec) { TBL[spec.id] = spec; return '<div class="dms-tbl" data-tbl="' + esc(spec.id) + '"></div>'; }
  function fillTables(scope) { var els = (scope || HOST).querySelectorAll('[data-tbl]'); for (var i = 0; i < els.length; i++) { fillTable(els[i].getAttribute('data-tbl'), els[i]); } }
  function clientRows(sp, st) {
    var rows = sp.rows, q = st.q.trim().toLowerCase();
    if (q) { rows = rows.filter(function (r) { return sp.text(r).toLowerCase().indexOf(q) >= 0; }); }
    if (st.sk) { var col = sp.cols.filter(function (c) { return c.k === st.sk; })[0]; if (col && col.s) { rows = rows.slice().sort(function (a, b) { var x = col.s(a), y = col.s(b); return (x < y ? -1 : x > y ? 1 : 0) * st.dir; }); } }
    return rows;
  }
  function thead(sp, sk, dir, act, id) {
    return '<thead><tr>' + sp.cols.map(function (c) {
      var key = act === 'ssort' ? c.sf : c.k, can = act === 'ssort' ? !!c.sf : !!c.s, on = can && sk === key;
      return '<th class="' + (can ? 'dms-th-s' : '') + (c.num ? ' dms-th-n' : '') + '"' + (can ? ' data-act="' + act + '" data-id="' + esc(id) + '" data-v="' + esc(key) + '" tabindex="0" aria-sort="' + (on ? (dir > 0 ? 'ascending' : 'descending') : 'none') + '"' : '') + '>' + esc(c.h) + (on ? (dir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
    }).join('') + '</tr></thead>';
  }
  function tcells(sp, r) { return '<tr>' + sp.cols.map(function (c) { return '<td' + (c.num ? ' class="dms-td-n"' : '') + '>' + c.r(r) + '</td>'; }).join('') + '</tr>'; }
  function fillTable(id, el) {
    var sp = TBL[id]; el = el || HOST.querySelector('[data-tbl="' + id + '"]'); if (!sp || !el) { return; }
    if (sp.server) { return fillServer(id, el); }
    var st = TS[id] || (TS[id] = { q: '', page: 1, sk: sp.sk || '', dir: sp.dir || 1 }), rows = clientRows(sp, st);
    var ps = sp.pageSize || CFG.pageSize, pages = Math.max(1, Math.ceil(rows.length / ps)); if (st.page > pages) { st.page = pages; }
    var slice = rows.slice((st.page - 1) * ps, st.page * ps);
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(tr('Search this table…', 'ابحث في الجدول…')) + '" value="' + esc(st.q) + '" aria-label="' + esc(tr('Search this table', 'ابحث في الجدول')) + '"><span class="dms-tb-r"><span class="dms-sm">' + num(rows.length) + ' ' + esc(rows.length === 1 ? tr('row', 'سجل') : tr('rows', 'سجل')) + (st.q ? ' / ' + num(sp.rows.length) : '') + '</span>' +
      (rows.length ? '<button type="button" class="dms-btn dms-btn-sm" data-act="csv" data-id="' + esc(id) + '">' + ico('dl') + '<span>' + esc(tr('Export CSV', 'تصدير CSV')) + '</span></button>' : '') + '</span></div>';
    if (sp.notice) { h += sp.notice; }
    if (!rows.length) { el.innerHTML = h + '<div class="dms-tablewrap">' + empty(sp.empty) + '</div>'; return restoreFocus(el, id); }
    h += '<div class="dms-tablewrap"><table class="dms-table' + (sp.cols.length <= 3 ? ' dms-table-sm' : '') + '">' + thead(sp, st.sk, st.dir, 'tsort', id) + '<tbody>' + slice.map(function (r) { return tcells(sp, r); }).join('') + '</tbody>' + (sp.foot ? '<tfoot>' + sp.foot(rows) + '</tfoot>' : '') + '</table></div>';
    h += pager(id, 'tpage', st.page, pages, rows.length, ps);
    el.innerHTML = h; restoreFocus(el, id);
  }
  function pager(id, act, pg, pages, total, ps) {
    if (total <= ps) { return ''; }
    return '<div class="dms-pager"><span>' + esc(tr('Showing', 'عرض')) + ' ' + num((pg - 1) * ps + 1) + '–' + num(Math.min(pg * ps, total)) + ' / ' + num(total) + '</span><span><button type="button" class="dms-btn" data-act="' + act + '" data-id="' + esc(id) + '" data-v="-1"' + (pg <= 1 ? ' disabled' : '') + '>‹ ' + esc(tr('Previous', 'السابق')) + '</button> ' +
      esc(tr('Page', 'صفحة')) + ' ' + pg + ' ' + esc(tr('of', 'من')) + ' ' + pages + ' <button type="button" class="dms-btn" data-act="' + act + '" data-id="' + esc(id) + '" data-v="1"' + (pg >= pages ? ' disabled' : '') + '>' + esc(tr('Next', 'التالي')) + ' ›</button></span></div>';
  }
  function restoreFocus(el, id) { if (focusId === id) { var i = el.querySelector('[data-tq]'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { /* ignore */ } } } }
  function srvArgs(sp, st) {
    var q = st.q.trim(), base = { doctype: sp.dt, filters: sp.filters };
    if (sp.parent) { base.parent = sp.parent; }
    if (q && sp.search) { base.or_filters = sp.search.map(function (f) { return [sp.dt, f, 'like', '%' + q + '%']; }); }
    return base;
  }
  function srvOrder(sp, st) { return st.sk ? st.sk + (st.dir > 0 ? ' asc' : ' desc') : sp.order; }
  function fillServer(id, el) {
    var sp = TBL[id], st = SS[id] || (SS[id] = { q: '', page: 1, total: null, rows: null, loading: false, err: null, req: 0, sk: '', dir: 1 });
    if (!st.dirty && st.rows && st.key === JSON.stringify(sp.filters)) { return paintServer(id, el); }
    st.dirty = false; st.key = JSON.stringify(sp.filters);
    var req = ++st.req; st.loading = true; st.err = null;
    var ps = sp.pageSize || CFG.modalPage, base = srvArgs(sp, st);
    paintServer(id, el);
    var chk = function () { return !destroyed && SS[id] && SS[id].req === req; };
    if (sp.loader) { sp.loader(st.page - 1, ps, st.q.trim(), srvOrder(sp, st)).then(function (res) { if (!chk()) { return; } st.total = res.total; st.rows = res.rows || []; st.loading = false; paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); }, function (e) { if (chk()) { st.loading = false; st.err = errKind(e); paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); } }); return; }
    var cnt = getList(Object.assign({}, base, { fields: ['count(name) as n'], limit_page_length: 1 }), chk).then(function (r) { return r ? +one(r).n || 0 : null; });
    var rows = getList(Object.assign({}, base, { fields: sp.fields, order_by: srvOrder(sp, st), limit_start: (st.page - 1) * ps, limit_page_length: ps }), chk);
    Promise.all([cnt, rows]).then(function (res) {
      if (!chk()) { return; } st.total = res[0]; st.rows = res[1] || []; st.loading = false; paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]'));
    }).catch(function (e) { if (chk()) { st.loading = false; st.err = errKind(e); paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); } });
  }
  function paintServer(id, el) {
    if (!el) { return; } var sp = TBL[id], st = SS[id], ps = sp.pageSize || CFG.modalPage;
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(sp.searchHint || tr('Search…', 'بحث…')) + '" value="' + esc(st.q) + '" aria-label="' + esc(tr('Search', 'بحث')) + '"><span class="dms-tb-r"><span class="dms-sm">' + (st.total == null ? '' : num(st.total) + ' ' + esc(st.total === 1 ? tr('record', 'سجل') : tr('records', 'سجل'))) + '</span>' +
      (st.total ? '<button type="button" class="dms-btn dms-btn-sm" data-act="csvall" data-id="' + esc(id) + '" title="' + esc(tr('Export up to 5,000 rows', 'تصدير حتى 5,000 سجل')) + '">' + ico('dl') + '<span>' + esc(tr('Export CSV', 'تصدير CSV')) + '</span></button>' : '') + '</span></div>';
    if (st.err) { el.innerHTML = h + alertBox('err', esc(st.err === 'perm' ? tr('Permission denied for your user.', 'لا تملك صلاحية القراءة.') : tr('Technical error while reading this list.', 'خطأ تقني أثناء قراءة القائمة.')) + ' <button type="button" class="dms-linkbtn" data-act="sretry" data-id="' + esc(id) + '">' + esc(tr('Retry', 'إعادة المحاولة')) + '</button>'); return restoreFocus(el, id); }
    if (st.loading && !st.rows) { el.innerHTML = h + '<div class="dms-skel"></div>'; return restoreFocus(el, id); }
    if (!st.rows || !st.rows.length) { el.innerHTML = h + '<div class="dms-tablewrap">' + empty(sp.empty) + '</div>'; return restoreFocus(el, id); }
    var pages = Math.max(1, Math.ceil((st.total || 0) / ps));
    h += '<div class="dms-tablewrap" style="opacity:' + (st.loading ? .55 : 1) + '"' + (st.loading ? ' aria-busy="true"' : '') + '><table class="dms-table' + (sp.cols.length <= 3 ? ' dms-table-sm' : '') + '">' + thead(sp, st.sk, st.dir, 'ssort', id) + '<tbody>' + st.rows.map(function (r) { return tcells(sp, r); }).join('') + '</tbody></table></div>' + pager(id, 'spage', st.page, pages, st.total || 0, ps);
    el.innerHTML = h; restoreFocus(el, id);
  }
  function csvCell(v) { v = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(v) && !/^-?[\d.,]+$/.test(v)) { v = "'" + v; } return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, sp, rows) {
    var cols = sp.cols.filter(function (c) { return c.c; }), lines = [cols.map(function (c) { return csvCell(c.h); }).join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return csvCell(c.c(r)); }).join(','); }));
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = String(name).replace(/[^\w-]+/g, '_') + '_' + TODAY + '.csv'; HOST.appendChild(a); a.click(); later(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportServer(id) {
    var sp = TBL[id], st = SS[id], out = [], step = 500, base = srvArgs(sp, st), g = GEN;
    if (sp.loader) { toast(tr('Preparing export…', 'جارٍ تجهيز التصدير…')); var acc = [], pg = function (p) { return sp.loader(p, 500, st.q.trim(), srvOrder(sp, st)).then(function (res) { acc = acc.concat(res.rows || []); return (res.rows || []).length === 500 && acc.length < 5000 ? pg(p + 1) : acc; }); }; pg(0).then(function (rows) { download(sp.file || id, sp, rows.slice(0, 5000)); }, function () { toast(tr('Export failed.', 'تعذر التصدير.'), true); }); return; }
    function next(s) {
      return getList(Object.assign({}, base, { fields: sp.fields, order_by: srvOrder(sp, st), limit_start: s, limit_page_length: step }), function () { return g === GEN; }).then(function (r) {
        out = out.concat(r || []); return (r && r.length === step && out.length < 5000) ? next(s + step) : out;
      });
    }
    toast(tr('Preparing export…', 'جارٍ تجهيز التصدير…'));
    next(0).then(function (rows) { download(sp.file || id, sp, rows.slice(0, 5000)); }, function () { toast(tr('Export failed.', 'تعذر التصدير.'), true); });
  }
  function toast(msg, bad) { var e = document.createElement('div'); e.className = 'dms-toast' + (bad ? ' dms-toast-err' : ''); e.setAttribute('role', 'status'); e.textContent = msg; HOST.appendChild(e); later(function () { e.remove(); }, 3500); }
  /* common cells */
  function dtc(v) { return v ? '<span class="dms-num">' + esc(String(v).slice(0, 10)) + '</span>' : '<span class="dms-sm">—</span>'; }
  function who(v) { return v ? bdi(v) : '<span class="dms-sm">' + esc(NAtxt()) + '</span>'; }
  function txt(v) { return v ? bdi(v) : '<span class="dms-sm">—</span>'; }
  function amc(v) { return v == null || v === '' ? '<span class="dms-sm">—</span>' : '<span class="dms-num">' + esc(amt(v)) + '</span>'; }
  function overdueTag(due) { var d = diffDays(String(due || TODAY).slice(0, 10), TODAY); return d > 0 ? '<span class="dms-days ' + (d > 90 ? 'dms-days-bad' : 'dms-days-warn') + '">' + num(d) + '</span>' : '<span class="dms-sm">—</span>'; }
  function col(h, f, o) { o = o || {}; return Object.assign({ h: h, sf: o.sort === false ? undefined : f, r: function (x) { return o.fmt ? o.fmt(x[f], x) : txt(x[f]); }, c: function (x) { return x[f]; } }, o); }
  function linkCol(h, dt, f, labelF) { return { h: h, sf: f, r: function (x) { return docLink(typeof dt === 'function' ? dt(x) : dt, x[f], labelF ? x[labelF] || x[f] : x[f]); }, c: function (x) { return x[f]; } }; }

  /* ---------- actions pending ---------- */
  var PRIO = { high: ['High', 'عالية'], med: ['Medium', 'متوسطة'], low: ['Low', 'منخفضة'] };
  function score(p, amount, age) { return { high: 300, med: 200, low: 100 }[p] + Math.min(40, Math.log(1 + Math.abs(amount || 0)) / Math.LN10 * 6) + Math.min(20, (age || 0) / 10); }
  /* Server specs ({id, server:true, dt, filters, fields, order, it(row) → item}) load count + 6 most urgent rows each. */
  function loadActions(specs, key) {
    run(key || 'act', function (chk) {
      return Promise.all(specs.filter(function (s) { return s.server; }).map(function (s) {
        var c = getList({ doctype: s.dt, fields: ['count(name) as n'], filters: s.filters, limit_page_length: 1 }, chk).then(function (r) { return +one(r).n || 0; }, function (e) { return 'ERR:' + errKind(e); });
        var l = (s.rank ? fetchAll({ doctype: s.dt, fields: s.fields, filters: s.filters, order_by: s.order }, chk, 2000) : getList({ doctype: s.dt, fields: s.fields, filters: s.filters, order_by: s.order, limit_page_length: 6 }, chk)).then(function (r) { return r || []; }, function (e) { return 'ERR:' + errKind(e); });
        return Promise.all([c, l]).then(function (x) { return { id: s.id, count: typeof x[1] === 'string' ? x[1] : x[0], rows: Array.isArray(x[1]) ? x[1] : [] }; });
      })).then(function (res) { var o = {}; res.forEach(function (x) { o[x.id] = x; }); return o; });
    });
  }
  /* client: {id: {rows, item}} for client specs, null while their sources load, or 'ERR:kind'. */
  function actModel(specs, key, client) {
    var counts = {}, items = [], A = D[key || 'act'], AE = D[(key || 'act') + 'Err'];
    specs.forEach(function (s) {
      if (s.client) {
        var c = client == null ? null : typeof client === 'string' ? client : client[s.id];
        if (typeof c === 'string') { counts[s.id] = c; }
        else if (c) { counts[s.id] = c.count != null ? c.count : c.rows.length; c.rows.slice(0, 6).forEach(function (r) { items.push(c.item(r)); }); }
        return;
      }
      if (AE) { counts[s.id] = 'ERR:' + AE; return; }
      var x = A && A[s.id]; if (!x) { return; }
      counts[s.id] = x.count;
      x.rows.forEach(function (r) { var it = s.it(r); it.dt = it.dt || s.dt; it.name = it.name || r.name; items.push(it); });
    });
    items.sort(function (a, b) { return b.score - a.score; });
    var seen = {}; items = items.filter(function (it) { var k = it.dt + '|' + it.name; if (seen[k]) { return false; } seen[k] = 1; return true; });   /* one row per record, under its most urgent category */
    return { specs: specs, counts: counts, items: items, ready: specs.every(function (s) { return counts[s.id] !== undefined; }) };
  }
  function pendingTotal(AM) {
    if (!AM) { return null; }
    var t = 0, any = false; Object.keys(AM.counts).forEach(function (k) { var c = AM.counts[k]; if (typeof c === 'number') { t += c; any = true; } });
    return any ? t : null;
  }
  function dtLabel(dt) { var L = APP.dtLabels && APP.dtLabels[dt]; return L ? tr(L[0], L[1]) : dt; }
  function arow(it) {
    return '<a class="dms-arow" href="' + esc(it.href || docUrl(it.dt, it.name)) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="dms-prio dms-prio-' + it.p + '">' + esc(tr(PRIO[it.p][0], PRIO[it.p][1])) + '</span>' +
      '<span class="dms-arow-main"><span class="dms-arow-t"><bdi>' + esc(it.title || it.name) + '</bdi><span class="dms-arow-dt">' + esc(dtLabel(it.dt)) + '</span></span><span class="dms-arow-d">' + bdi(it.desc || '') + '</span></span>' +
      '<span class="dms-arow-who">' + (it.who ? bdi(it.who) : '<span class="dms-sm">' + esc(NAtxt()) + '</span>') + '</span>' +
      '<span class="dms-arow-due dms-tone-' + (it.tone || 'n') + '">' + esc(it.due || '') + '</span><span class="dms-sr"> (' + esc(tr('opens in a new tab', 'يفتح في علامة تبويب جديدة')) + ')</span></a>';
  }
  function drillId(s) { return s.drill || ((s.client ? 'cli:' : 'srv:') + s.id); }
  function catBtn(s, c) {
    var err = typeof c === 'string', inner = '<span class="dms-acat-t">' + esc(s.short) + '</span><b class="dms-num">' + (err || c == null ? '—' : num(c)) + '</b>';
    return (!err && c) ? '<button type="button" class="dms-acat" data-act="kpi" data-v="' + esc(drillId(s)) + '" title="' + esc(s.title + ' — ' + tr('view all', 'عرض الكل')) + '">' + inner + '</button>'
      : '<div class="dms-acat dms-acat-off" title="' + esc(err ? (c === 'ERR:perm' ? tr('Permission denied', 'لا صلاحية') : tr('Unavailable', 'غير متاح')) : s.title) + '">' + inner + '</div>';
  }
  function actionsPanel(AM) {
    var tot = pendingTotal(AM);
    var h = '<section class="dms-panelbox dms-actpanel" id="dms-pending" tabindex="-1" aria-labelledby="dms-pending-h"><div class="dms-ph"><h3 class="dms-h3" id="dms-pending-h">' + esc(tr('Actions pending', 'الإجراءات المعلقة')) +
      (tot != null ? ' <span class="dms-h3-n dms-num">' + num(tot) + '</span>' : '') + '</h3><span class="dms-ph-meta">' + esc(tr('As of today · most urgent first', 'حتى اليوم · الأكثر إلحاحًا أولًا')) + '</span>' +
      (tab !== 'actions' && APP.tabs.some(function (x) { return x.id === 'actions'; }) ? '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="goto:actions">' + esc(tr('View all', 'عرض الكل')) + '</button>' : '') + '</div>';
    if (!AM) { return h + '<div class="dms-arows" aria-busy="true">' + skel(6, 'dms-skel-row') + '</div></section>'; }
    var known = AM.specs.filter(function (s) { return AM.counts[s.id] !== undefined; });
    if (!known.length) { return h + '<div class="dms-arows" aria-busy="true">' + skel(6, 'dms-skel-row') + '</div></section>'; }
    var errs = known.filter(function (s) { return typeof AM.counts[s.id] === 'string'; });
    if (AM.ready && errs.length === AM.specs.length) { return h + alertBox('err', esc(tr('Pending actions could not be loaded.', 'تعذر تحميل الإجراءات المعلقة.')) + ' <button type="button" class="dms-linkbtn" data-act="refresh">' + esc(tr('Retry', 'إعادة المحاولة')) + '</button>') + '</section>'; }
    var items = AM.items.slice(0, CFG.actRows || 7);
    h += items.length ? '<div class="dms-arows">' + items.map(arow).join('') + '</div>' : (AM.ready ? '<div class="dms-empty dms-empty-sm">' + esc(tr('Nothing pending for this selection.', 'لا توجد إجراءات معلقة لهذا الاختيار.')) + '</div>' : '<div class="dms-arows" aria-busy="true">' + skel(4, 'dms-skel-row') + '</div>');
    h += '<div class="dms-acats">' + AM.specs.map(function (s) { return catBtn(s, AM.counts[s.id]); }).join('') + '</div>';
    if (errs.length) { h += note(esc(tr('Could not load: ', 'تعذر التحميل: ') + errs.map(function (s) { return s.short; }).join(', '))); }
    return h + '</section>';
  }
  function actionsTab(AM, info) {
    var h = alertBox('info', esc(info || tr('Action lists are as of today and not filtered by the period. They follow the filters where the source supports them.', 'قوائم الإجراءات حتى اليوم وغير مرتبطة بالفترة، وتتبع المرشحات حيثما يدعمها المصدر.')));
    h += kpis((AM ? AM.specs : []).map(function (s) {
      var c = AM.counts[s.id], err = typeof c === 'string';
      return kpi({ label: s.title, val: c === undefined ? '…' : err ? '—' : num(c), sub: esc(err ? (c === 'ERR:perm' ? tr('Permission denied', 'لا صلاحية') : tr('Unavailable', 'غير متاح')) : s.why), act: (!err && c) ? drillId(s) : null });
    }));
    return h + actionsPanel(AM);
  }

  /* ---------- drill-downs (overlay) ---------- */
  var OVL = null;
  function openDrill(id) {
    if (id.indexOf('goto:') === 0) { goTab(id.slice(5)); return; }
    var r = null;
    if (id.indexOf('srv:') === 0 && APP.actSpecs) {
      var s = APP.actSpecs().filter(function (x) { return x.id === id.slice(4); })[0];
      if (s && s.table) { delete SS.drill; r = { title: s.title, sub: s.why, spec: Object.assign({ id: 'drill', server: true, dt: s.dt, filters: s.filters, order: s.order, file: s.id }, s.table()) }; }
    }
    if (!r && APP.drill) { r = APP.drill(id); }
    if (!r || (!r.spec && r.body == null)) { return; }
    if (r.spec) { r.spec.id = 'drill'; if (!r.spec.server && !r.spec.pageSize) { r.spec.pageSize = CFG.modalPage; } }
    delete SS.drill; delete TS.drill;
    var opener = OVL ? OVL.opener : activeEl();
    OVL = Object.assign(r, { id: id, prev: OVL && r.stack !== false ? OVL : null, opener: opener, openerKey: OVL ? OVL.openerKey : opener && opener.getAttribute && opener.getAttribute('data-v') }); renderOverlay();
  }
  function overlayHTML() {
    if (!OVL) { return ''; }
    var link = OVL.link ? ' ' + docLink(OVL.link[0], OVL.link[1], OVL.link[2]) : '';
    return '<div class="dms-overlay" data-act="ovbg"><div class="dms-modal" role="dialog" aria-modal="true" aria-labelledby="dms-dialog-title"><div class="dms-dhead"><div>' + (OVL.prev ? '<button type="button" class="dms-linkbtn" data-act="ovback">‹ ' + esc(tr('Back', 'رجوع')) + '</button>' : '') + '<h3 id="dms-dialog-title">' + esc(OVL.title) + '</h3>' + (OVL.sub || link ? '<p class="dms-sm">' + esc(OVL.sub || '') + link + '</p>' : '') + '</div><button type="button" class="dms-x" data-act="closeov" aria-label="' + esc(tr('Close', 'إغلاق')) + '">×</button></div>' + (OVL.body || '') + (OVL.spec ? regTable(OVL.spec) : '') + '</div></div>';
  }
  function renderOverlay() { var el = $('[data-ref="overlay"]'); if (!el) { return; } var app = $('.dms-app'); if (app) { app.inert = !!OVL; } if (!OVL) { Object.keys(TBL).forEach(function (k) { if (k.indexOf('drill') === 0) { delete TBL[k]; } }); } else { delete TBL.drill; } el.innerHTML = overlayHTML(); fillTables(el); var x = el.querySelector('.dms-x'); if (x) { x.focus(); } }
  function closeOverlay() {
    var previous = OVL; OVL = null; renderOverlay(); delete SS.drill; delete TS.drill;
    if (!previous) { return; }
    var opener = previous.opener;
    if (!opener || !opener.isConnected) { opener = Array.prototype.find.call(HOST.querySelectorAll('[data-act="kpi"]'), function (el) { return el.getAttribute('data-v') === previous.openerKey; }); }
    if (opener) { opener.focus({ preventScroll: true }); }
  }

  /* ---------- filters, period, toolbar, tabs ---------- */
  var F = { period: APP.period || 'month', from: '', to: '' }, PERIOD = [];
  (APP.filters || []).forEach(function (f) { F[f.k] = ''; });
  var tab = APP.tabs[0].id, POP = null, FD = null, FS = {}, CAL = null, ANIM = false, built = false, AMC = null;
  var PERIODS = [['today', 'Today', 'اليوم'], ['yesterday', 'Yesterday', 'أمس'], ['week', 'This week', 'هذا الأسبوع'], ['lastWeek', 'Last week', 'الأسبوع الماضي'],
    ['month', 'This month', 'هذا الشهر'], ['lastMonth', 'Last month', 'الشهر الماضي'], ['quarter', 'This quarter', 'هذا الربع'], ['ytd', 'Year to date', 'السنة حتى اليوم'],
    ['year', 'This year', 'هذه السنة'], ['prevYear', 'Previous year', 'السنة الماضية'], ['custom', 'Custom range', 'نطاق مخصص']];
  var PGROUPS = [['today', 'yesterday'], ['week', 'lastWeek'], ['month', 'lastMonth'], ['quarter', 'ytd', 'year', 'prevYear'], ['custom']];
  function curPeriod() { return periodRange(F.period, F.from, F.to); }
  function periodName(k) { var p = PERIODS.filter(function (x) { return x[0] === k; })[0]; return p ? tr(p[1], p[2]) : k; }
  function filterCount() { return (APP.filters || []).filter(function (f) { return F[f.k]; }).length; }
  function optList(f, draft) { var l = f.options ? f.options(draft || F) : []; return (l || []).map(function (x) { return typeof x === 'string' ? { v: x, l: x } : x; }); }
  function optLabel(f, v) { var o = optList(f).filter(function (x) { return x.v === v; })[0]; return o ? o.l : (f.label ? f.label(v) : v); }
  function pendingBtnHTML() {
    var n = pendingTotal(AMC), lbl = n == null ? (AMC && AMC.ready ? '—' : '…') : num(n);
    return '<button type="button" class="dms-pend' + (n ? ' dms-pend-on' : '') + '" data-act="pending" data-fk="pending" title="' + esc(tr('Pending actions as of today — show the list', 'الإجراءات المعلقة حتى اليوم — عرض القائمة')) + '">' +
      '<i class="dms-pend-dot" aria-hidden="true"></i><b class="dms-num">' + lbl + '</b><span class="dms-pend-l">' + esc(tr('pending', 'معلّقة')) + '</span></button>';
  }
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function ffield(f) {
    if (f.type === 'text' || f.type === 'date') { return '<div class="dms-ff"><label for="dms-fd-' + f.k + '">' + esc(tr(f.en, f.ar)) + '</label><input type="' + (f.type === 'date' ? 'date' : 'search') + '" id="dms-fd-' + f.k + '" class="dms-input" data-fd="' + f.k + '" data-fk="fd:' + f.k + '" value="' + esc(FD[f.k] || '') + '" placeholder="' + esc(f.ph ? tr(f.ph[0], f.ph[1]) : '') + '" autocomplete="off"></div>'; }
    var list = optList(f, FD), label = tr(f.en, f.ar), k = f.k;
    var q = clean(FS[k]).toLowerCase(), cur = FD[k], shown = list.filter(function (x) { return !q || String(x.l).toLowerCase().indexOf(q) >= 0 || String(x.v).toLowerCase().indexOf(q) >= 0; }), more = shown.length > 200;
    shown = shown.slice(0, 200);
    if (cur && !shown.some(function (x) { return x.v === cur; })) { shown.unshift({ v: cur, l: optLabel(f, cur) }); }
    var h = '<div class="dms-ff"><label for="dms-fd-' + k + '">' + esc(label) + '</label>';
    if (list.length > 8) { h += '<input type="search" class="dms-input" data-fs="' + k + '" data-fk="fs:' + k + '" value="' + esc(FS[k] || '') + '" placeholder="' + esc(tr('Search ' + num(list.length) + ' options', 'ابحث في ' + num(list.length) + ' خيار')) + '" aria-label="' + esc(tr('Search', 'بحث') + ' — ' + label) + '" autocomplete="off">'; }
    h += '<select id="dms-fd-' + k + '" class="dms-input" data-fd="' + k + '" data-fk="fd:' + k + '">' + opt('', f.none ? tr(f.none[0], f.none[1]) : tr('All', 'الكل'), cur) + shown.map(function (x) { return opt(x.v, x.l, cur); }).join('') + '</select>';
    if (q && !shown.length) { h += '<span class="dms-ff-hint">' + esc(tr('No matches', 'لا نتائج')) + '</span>'; }
    else if (more) { h += '<span class="dms-ff-hint">' + esc(tr('First 200 matches — type to narrow', 'أول 200 نتيجة — اكتب للتضييق')) + '</span>'; }
    return h + '</div>';
  }
  function filtersPopHTML() {
    var n = APP.filterNote ? APP.filterNote() : '';
    return '<div class="dms-pop dms-pop-filters" role="dialog" aria-label="' + esc(tr('Filters', 'المرشحات')) + '"><div class="dms-pop-b">' + APP.filters.map(ffield).join('') + '</div>' +
      (n ? '<p class="dms-pop-note">' + esc(n) + '</p>' : '') +
      '<div class="dms-pop-f"><button type="button" class="dms-btn" data-act="fclear" data-fk="fclear">' + esc(tr('Clear all', 'مسح الكل')) + '</button><button type="button" class="dms-btn dms-btn-primary" data-act="fapply" data-fk="fapply">' + esc(tr('Apply', 'تطبيق')) + '</button></div></div>';
  }
  function calendarHTML() {
    var v = CAL.view, first = weekStartOf(v), mon = v.slice(0, 7), fdy = CAL.focus && CAL.focus.slice(0, 7) === mon ? CAL.focus : (CAL.from && CAL.from.slice(0, 7) === mon ? CAL.from : v), wd = '', rows = '', r, c, d;
    for (c = 0; c < 7; c++) { try { wd += '<span role="columnheader">' + esc(new Intl.DateTimeFormat(locale(), { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(parseISO(addDays(first, c))))) + '</span>'; } catch (e) { wd += '<span></span>'; } }
    for (r = 0; r < 6; r++) {
      rows += '<div role="row" class="dms-cal-row">';
      for (c = 0; c < 7; c++) {
        d = addDays(first, r * 7 + c);
        var end = d === CAL.from || d === CAL.to, inR = CAL.from && CAL.to && d > CAL.from && d < CAL.to;
        rows += '<button type="button" role="gridcell" class="dms-day' + (d.slice(0, 7) !== mon ? ' dms-out' : '') + (d === TODAY ? ' dms-today' : '') + (inR ? ' dms-in' : '') + (end ? ' dms-end' : '') +
          (CAL.from && CAL.to && d === CAL.from && d !== CAL.to ? ' dms-s' : '') + (CAL.from && CAL.to && d === CAL.to && d !== CAL.from ? ' dms-e' : '') + '" data-act="calday" data-v="' + d + '" data-fk="day:' + d + '" tabindex="' + (d === fdy ? 0 : -1) +
          '" aria-pressed="' + end + '" aria-label="' + esc(fmtDate(d, true)) + '"><bdi>' + (+d.slice(8, 10)) + '</bdi></button>';
      }
      rows += '</div>';
    }
    var ok = CAL.from && CAL.to, msg = ok ? '<bdi>' + esc(rangeLabel([CAL.from, CAL.to])) + '</bdi> · ' + esc(daysTxt(diffDays(CAL.from, CAL.to) + 1)) : esc(CAL.from ? tr('Select an end date', 'اختر تاريخ النهاية') : tr('Select a start date', 'اختر تاريخ البداية'));
    var title = v; try { title = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(parseISO(v))); } catch (e) { /* ISO fallback */ }
    return '<div class="dms-cal"><div class="dms-cal-h"><button type="button" class="dms-btn dms-icobtn" data-act="calnav" data-v="-1" data-fk="calprev" aria-label="' + esc(tr('Previous month', 'الشهر السابق')) + '">' + ico('prev', 'dms-flip') + '</button>' +
      '<b aria-live="polite">' + esc(title) + '</b><button type="button" class="dms-btn dms-icobtn" data-act="calnav" data-v="1" data-fk="calnext" aria-label="' + esc(tr('Next month', 'الشهر التالي')) + '">' + ico('next', 'dms-flip') + '</button></div>' +
      '<div class="dms-cal-g" role="grid" aria-label="' + esc(title) + '"><div class="dms-cal-wd" role="row">' + wd + '</div>' + rows + '</div>' +
      '<div class="dms-cal-f"><span class="dms-cal-msg" aria-live="polite">' + msg + '</span><span class="dms-cal-btns"><button type="button" class="dms-btn" data-act="popclose" data-fk="calcancel">' + esc(tr('Cancel', 'إلغاء')) + '</button>' +
      '<button type="button" class="dms-btn dms-btn-primary" data-act="calapply" data-fk="calapply"' + (ok ? '' : ' disabled') + '>' + esc(tr('Apply', 'تطبيق')) + '</button></span></div></div>';
  }
  function periodPopHTML() {
    var n = APP.periodNote ? APP.periodNote() : '';
    return '<div class="dms-pop dms-pop-period' + (CAL ? ' dms-has-cal' : '') + '" role="dialog" aria-label="' + esc(tr('Select period', 'اختر الفترة')) + '"><div class="dms-presets">' +
      PGROUPS.map(function (g) {
        return '<div class="dms-pgroup">' + g.map(function (k) {
          var on = CAL ? k === 'custom' : F.period === k;
          return '<button type="button" class="dms-preset' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="preset" data-v="' + k + '" data-fk="preset:' + k + '"><span>' + esc(periodName(k)) + '</span>' +
            (k !== 'custom' ? '<small><bdi>' + esc(rangeLabel(periodRange(k))) + '</bdi></small>' : '') + '</button>';
        }).join('') + '</div>';
      }).join('') + '</div>' + (CAL ? calendarHTML() : '') + (n ? '<p class="dms-pop-note dms-pop-note-p">' + esc(n) + '</p>' : '') + '</div>';
  }
  function toolbarHTML() {
    var ac = filterCount(), R = PERIOD, hasF = APP.filters && APP.filters.length;
    return '<div class="dms-topbar"><div class="dms-tb-title"><h2 class="dms-title">' + esc(APP.title()) + '</h2><p class="dms-sub" data-ref="stamp"></p></div>' +
      '<div class="dms-tb-ctrls"><div class="dms-pendwrap" data-ref="pendwrap">' + pendingBtnHTML() + '</div>' +
      (APP.period === false ? '' : '<div class="dms-anchor"><button type="button" class="dms-btn dms-period" data-act="pop" data-v="period" data-fk="pop:period" aria-haspopup="dialog" aria-expanded="' + (POP === 'period') + '" aria-label="' + esc(tr('Period', 'الفترة') + ': ' + periodName(F.period) + ' ' + rangeLabel(R)) + '">' + ico('cal') +
        '<span class="dms-period-t"><b>' + esc(periodName(F.period)) + '</b><span class="dms-period-r"><bdi>' + esc(rangeLabel(R)) + '</bdi></span></span>' + ico('down', 'dms-chev') + '</button>' + (POP === 'period' ? periodPopHTML() : '') + '</div>') +
      (hasF ? '<div class="dms-anchor"><button type="button" class="dms-btn' + (ac ? ' dms-btn-on' : '') + '" data-act="pop" data-v="filters" data-fk="pop:filters" aria-haspopup="dialog" aria-expanded="' + (POP === 'filters') + '">' + ico('filter') +
        '<span class="dms-btn-t">' + esc(tr('Filters', 'المرشحات')) + '</span>' + (ac ? '<span class="dms-count" aria-label="' + esc(ac + ' ' + tr('active', 'نشط')) + '">' + ac + '</span>' : '') + '</button>' + (POP === 'filters' ? filtersPopHTML() : '') + '</div>' : '') +
      '<button type="button" class="dms-btn dms-icobtn" data-act="refresh" data-ref="refresh" data-fk="refresh" aria-label="' + esc(tr('Refresh data', 'تحديث البيانات')) + '" title="' + esc(tr('Refresh data (keeps filters)', 'تحديث البيانات (مع الإبقاء على المرشحات)')) + '">' + ico('refresh') + '</button></div>' +
      '<div class="dms-lang" role="group" aria-label="Language / اللغة"><button type="button" data-act="lang" data-v="en" data-fk="lang:en" lang="en" aria-pressed="' + (LANG === 'en') + '"' + (LANG === 'en' ? ' class="dms-on"' : '') + '>English</button>' +
        '<button type="button" data-act="lang" data-v="ar" data-fk="lang:ar" lang="ar" aria-pressed="' + (LANG === 'ar') + '"' + (LANG === 'ar' ? ' class="dms-on"' : '') + '>العربية</button></div></div>';
  }
  function chipsHTML() {
    var a = (APP.filters || []).filter(function (f) { return F[f.k]; }); if (!a.length) { return ''; }
    return '<div class="dms-chips">' + a.map(function (f) {
      var v = optLabel(f, F[f.k]), lab = tr(f.en, f.ar);
      return '<span class="dms-chip"><span class="dms-chip-k">' + esc(lab) + '</span><bdi>' + esc(v) + '</bdi><button type="button" class="dms-chip-x" data-act="rmf" data-v="' + f.k + '" data-fk="rmf:' + f.k + '" aria-label="' + esc(tr('Remove filter', 'إزالة المرشح') + ' ' + lab + ': ' + v) + '">' + ico('x') + '</button></span>';
    }).join('') + (a.length > 1 ? '<button type="button" class="dms-linkbtn" data-act="fclear">' + esc(tr('Clear all', 'مسح الكل')) + '</button>' : '') + '</div>';
  }
  function tabsHTML() {
    var pend = pendingTotal(AMC);
    return '<div class="dms-tabs" role="tablist" aria-label="' + esc(tr('Sections', 'الأقسام')) + '">' + APP.tabs.map(function (x) {
      var on = x.id === tab, lbl = tr(x.en, x.ar), b = x.id === 'actions' && pend ? '<span class="dms-tab-n dms-num" title="' + esc(tr('Pending actions as of today', 'الإجراءات المعلقة حتى اليوم')) + '">' + num(pend) + '</span>' : '';
      return '<button class="dms-tab' + (on ? ' dms-on' : '') + '" role="tab" id="dms-tab-' + x.id + '" aria-selected="' + on + '" aria-controls="dms-panel" tabindex="' + (on ? 0 : -1) + '" data-act="tab" data-v="' + x.id + '" data-fk="tab:' + x.id + '" title="' + esc(lbl) + '" type="button"><span>' + esc(lbl) + '</span>' + b + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- rendering: a fixed skeleton whose regions repaint independently (focus kept via data-fk) ---------- */
  function activeEl() { try { return ROOT.activeElement || null; } catch (e) { return null; } }
  function paint(el, html) {
    if (!el) { return; }
    var a = activeEl(), fk = a && el.contains(a) && a.getAttribute ? a.getAttribute('data-fk') : null, ss = null;
    if (fk && typeof a.selectionStart === 'number') { try { ss = [a.selectionStart, a.selectionEnd]; } catch (e) { /* not a text input */ } }
    el.innerHTML = html;
    if (fk) { focusFk(fk); if (ss) { var n = activeEl(); try { n.setSelectionRange(ss[0], ss[1]); } catch (e) { /* ignore */ } } }
  }
  function focusFk(k) { var n = HOST.querySelector('[data-fk="' + k + '"]'); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } }
  function skeleton() {
    HOST.innerHTML = '<div class="dms-app"><div data-ref="tb"></div><div data-ref="chips"></div><div data-ref="tabs"></div><div class="dms-sheet" role="tabpanel" id="dms-panel" data-ref="sheet"><div data-ref="banner"></div><div class="dms-content" data-ref="content"></div></div>' +
      '<div class="dms-tip" data-ref="tip" role="tooltip" hidden></div></div><div data-ref="overlay"></div>';
    built = true;
  }
  function renderHeaderState() {
    var b = $('[data-ref="refresh"]'), s = $('[data-ref="stamp"]'), bz = busy();
    if (b) { b.classList.toggle('dms-busy', bz); b.setAttribute('aria-busy', String(bz)); }
    if (s) { s.textContent = (APP.stamp ? APP.stamp() : tr('Read-only', 'للقراءة فقط')) + (LOADED ? ' · ' + tr('Updated ', 'آخر تحديث ') + LOADED : '') + (bz ? ' · ' + tr('loading…', 'جارٍ التحميل…') : ''); }
    paint($('[data-ref="pendwrap"]'), pendingBtnHTML());
    paint($('[data-ref="tabs"]'), tabsHTML());
  }
  function renderToolbar() { paint($('[data-ref="tb"]'), toolbarHTML()); paint($('[data-ref="chips"]'), chipsHTML()); renderHeaderState(); }
  function contentHTML() {
    if (!BOOTED) {
      return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(CFG.kpiCount || 6, 'dms-skel-kpi') + '</div><div class="dms-main2"><div class="dms-skel dms-skel-panel"></div><div class="dms-skel dms-skel-panel"></div></div>' +
        note(esc(tr('Loading from ERPNext…', 'جارٍ التحميل من ERPNext…')));
    }
    if (APP.period !== false && (!PERIOD[0] || PERIOD[0] > PERIOD[1])) { return alertBox('err', esc(tr('Choose a valid date range.', 'اختر نطاق تاريخ صحيحًا.'))); }
    return APP.content(tab, AMC);
  }
  function renderSoft() {
    PERIOD = curPeriod(); AMC = APP.actions ? APP.actions() : null;
    var keep = {}; Object.keys(TBL).forEach(function (k) { if (k.indexOf('drill') === 0) { keep[k] = TBL[k]; } }); TBL = keep;
    var b = $('[data-ref="banner"]'), c = $('[data-ref="content"]'), sh = $('[data-ref="sheet"]');
    if (b) { b.innerHTML = BOOTED && APP.banner ? APP.banner() : ''; }
    if (c) { paint(c, contentHTML()); c.classList.remove('dms-enter'); if (ANIM) { void c.offsetWidth; c.classList.add('dms-enter'); } ANIM = false; fillTables(c); fitChartLabels(); if (APP.afterRender) { APP.afterRender(c); } }
    if (sh) { sh.setAttribute('aria-labelledby', 'dms-tab-' + tab); }
    renderHeaderState();
  }
  function renderAll() {
    HOST.setAttribute('dir', LANG === 'ar' ? 'rtl' : 'ltr'); HOST.setAttribute('lang', LANG);
    if (!built) { skeleton(); }
    PERIOD = curPeriod(); renderToolbar(); renderSoft();
  }
  /* Full reload (filters, refresh): new generation, empty store, tables back to page 1. */
  function reload() {
    setToday(); PERIOD = curPeriod(); GEN++; D = {}; LOADED = STAMP;
    Object.keys(SS).forEach(function (k) { SS[k].dirty = true; SS[k].page = 1; }); Object.keys(TS).forEach(function (k) { TS[k].page = 1; });
    APP.load(); ANIM = true; renderAll();
  }

  /* ---------- navigation and popovers ---------- */
  function goTab(id, focusTab, force) {
    if (tab !== id || force) { tab = id; ANIM = true; if (APP.onTab) { APP.onTab(id); } renderAll(); }
    var t = $('#dms-tab-' + id); if (!t) { return; }
    try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ }
    if (focusTab) { t.focus(); }
  }
  function openPop(w) {
    POP = w; CAL = null;
    if (w === 'filters') { FD = {}; APP.filters.forEach(function (f) { FD[f.k] = F[f.k]; }); FS = {}; }
    else if (F.period === 'custom' && F.from && F.to) { CAL = { from: F.from, to: F.to, view: monthStart(F.from), focus: F.from }; }
    renderToolbar(); focusFk(w === 'filters' ? 'fd:' + APP.filters[0].k : CAL ? 'day:' + CAL.focus : 'preset:' + F.period);
  }
  function closePop(restore) { var w = POP; if (!w) { return; } POP = null; CAL = null; renderToolbar(); if (restore) { focusFk('pop:' + w); } }
  function applyFilters(next) {
    var prev = {}; APP.filters.forEach(function (f) { prev[f.k] = F[f.k]; F[f.k] = (next && next[f.k]) || ''; }); POP = null;
    if (APP.onFilters) { APP.onFilters(prev); }
    reload();
  }
  function applyPeriod(key, from, to) {
    F.period = key; if (key === 'custom') { F.from = from; F.to = to; }
    POP = null; CAL = null; setToday(); PERIOD = curPeriod();
    Object.keys(SS).forEach(function (k) { if (TBL[k] && TBL[k].period) { SS[k].dirty = true; SS[k].page = 1; } });
    if (APP.onPeriod) { APP.onPeriod(); } else { reload(); return; }
    ANIM = true; renderAll(); focusFk('pop:period');
  }
  function calPick(d) {
    if (!CAL.from || CAL.to) { CAL.from = d; CAL.to = null; } else if (d < CAL.from) { CAL.to = CAL.from; CAL.from = d; } else { CAL.to = d; }
    CAL.focus = d;
  }
  function calMove(d) { CAL.focus = d; if (d.slice(0, 7) !== CAL.view.slice(0, 7)) { CAL.view = monthStart(d); } renderToolbar(); focusFk('day:' + d); }

  /* ---------- tooltip (one shared element; positioned against the dashboard, clamped to its width) ---------- */
  function showTip(n) {
    var tip = $('[data-ref="tip"]'), app = $('.dms-app'); if (!tip || !app) { return; }
    tip.textContent = n.getAttribute('data-tip'); tip.hidden = false;
    var a = app.getBoundingClientRect(), r = n.getBoundingClientRect(), w = tip.offsetWidth, hgt = tip.offsetHeight;
    var x = Math.max(4, Math.min(r.left - a.left + r.width / 2 - w / 2, a.width - w - 4)), y = r.top - a.top - hgt - 8;
    if (y < 0) { y = r.bottom - a.top + 8; }
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { var tip = $('[data-ref="tip"]'); if (tip) { tip.hidden = true; } }
  function onOver(ev) { var n = ev.target.closest ? ev.target.closest('[data-tip]') : null; if (n && HOST.contains(n)) { showTip(n); } else { hideTip(); } }

  /* ---------- events (single delegated set, removed on destroy) ---------- */
  function onClick(ev) {
    var n = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (POP && !(ev.target.closest && ev.target.closest('.dms-anchor'))) { closePop(false); }
    if (!n || !HOST.contains(n)) { return; }
    var a = n.getAttribute('data-act'), v = n.getAttribute('data-v'), id = n.getAttribute('data-id');
    if (APP.onAct && APP.onAct(a, v, n, id) === true) { return; }
    if (a === 'ovbg') { if (ev.target === n) { closeOverlay(); } return; }
    if (a === 'closeov') { closeOverlay(); return; }
    if (a === 'ovback' && OVL && OVL.prev) { var pv = OVL.prev; delete SS.drill; delete TS.drill; OVL = pv; if (OVL.spec) { regTable(OVL.spec); } renderOverlay(); return; }
    if (a === 'tab') { goTab(v); return; }
    if (a === 'lang') { if (LANG !== v) { LANG = v; try { G.localStorage.setItem('dms_lang', LANG); } catch (e) { /* ignore */ } POP = null; CAL = null; renderAll(); if (OVL) { var o = OVL; OVL = null; renderOverlay(); openDrill(o.id); } focusFk('lang:' + v); } return; }
    if (a === 'refresh') { if (APP.onRefresh) { APP.onRefresh(); } reload(); return; }
    if (a === 'pop') { if (POP === v) { closePop(true); } else { openPop(v); } return; }
    if (a === 'popclose') { closePop(true); return; }
    if (a === 'preset') {
      if (v !== 'custom') { applyPeriod(v); return; }
      var r0 = PERIOD[0] || TODAY, r1 = PERIOD[1] || TODAY; CAL = { from: r0, to: r1, view: monthStart(r1 > TODAY ? TODAY : r1), focus: r1 > TODAY ? TODAY : r1 };
      renderToolbar(); focusFk('day:' + CAL.focus); return;
    }
    if (a === 'calnav' && CAL) { CAL.view = addMonths(CAL.view, +v); CAL.focus = CAL.view; renderToolbar(); return; }
    if (a === 'calday' && CAL) { calPick(v); renderToolbar(); focusFk('day:' + v); return; }
    if (a === 'calapply' && CAL && CAL.from && CAL.to) { applyPeriod('custom', CAL.from, CAL.to); return; }
    if (a === 'fapply') { applyFilters(FD); focusFk('pop:filters'); return; }
    if (a === 'fclear') { applyFilters(null); focusFk('pop:filters'); return; }
    if (a === 'rmf') { var nf = {}; APP.filters.forEach(function (f) { nf[f.k] = F[f.k]; }); nf[v] = ''; applyFilters(nf); focusFk('pop:filters'); return; }
    if (a === 'pending') {
      goTab(APP.tabs[0].id); var p = $('#dms-pending');
      if (p) { var still = G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches; try { p.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' }); } catch (e) { p.scrollIntoView(); } p.focus({ preventScroll: true }); }
      return;
    }
    if (a === 'kpi') { openDrill(v); return; }
    if (a === 'tpage') { TS[id].page = Math.max(1, TS[id].page + (+v)); fillTable(id); return; }
    if (a === 'tsort') { var st = TS[id]; if (st.sk === v) { st.dir = -st.dir; } else { st.sk = v; st.dir = 1; } st.page = 1; fillTable(id); focusHead(id, v); return; }
    if (a === 'spage') { var ss = SS[id]; ss.page = Math.max(1, ss.page + (+v)); ss.dirty = true; fillTable(id); return; }
    if (a === 'ssort') { var s2 = SS[id]; if (s2.sk === v) { s2.dir = -s2.dir; } else { s2.sk = v; s2.dir = 1; } s2.page = 1; s2.dirty = true; fillTable(id); focusHead(id, v); return; }
    if (a === 'sretry') { SS[id].dirty = true; fillTable(id); return; }
    if (a === 'csv') { var sp = TBL[id]; download(sp.file || id, sp, clientRows(sp, TS[id])); return; }
    if (a === 'csvall') { exportServer(id); return; }
  }
  function focusHead(id, v) { var th = HOST.querySelector('[data-tbl="' + id + '"] th[data-v="' + v + '"]'); if (th) { th.focus(); } }
  function onInput(ev) {
    var n = ev.target; if (!n || !n.getAttribute || !HOST.contains(n)) { return; }
    var fs = n.getAttribute('data-fs'), fd = n.getAttribute('data-fd'), tq = n.getAttribute('data-tq');
    if (APP.onInput && APP.onInput(n, ev) === true) { return; }
    if (fs) { if (FS[fs] === n.value) { return; } FS[fs] = n.value; renderToolbar(); return; }
    if (fd) { if (!FD || FD[fd] === n.value) { return; } FD[fd] = n.value; if (n.type === 'search') { return; } if (APP.filters.some(function (f) { return f.dependsOn === fd; })) { APP.filters.forEach(function (f) { if (f.dependsOn === fd && FD[f.k] && !optList(f, FD).some(function (x) { return x.v === FD[f.k]; })) { FD[f.k] = ''; } }); renderToolbar(); } return; }
    if (tq) {
      focusId = tq; var spx = TBL[tq]; if (!spx) { return; }
      if (spx.server) { var s2 = SS[tq]; if (s2.q === n.value) { return; } s2.q = n.value; s2.page = 1; clearTimeout(onInput.t); onInput.t = later(function () { s2.dirty = true; fillTable(tq); }, 350); }
      else { var s1 = TS[tq] || (TS[tq] = { q: '', page: 1, sk: spx.sk || '', dir: spx.dir || 1 }); if (s1.q === n.value) { return; } s1.q = n.value; s1.page = 1; fillTable(tq); }
    }
  }
  function onKey(ev) {
    var t = ev.target, act = t && t.getAttribute ? t.getAttribute('data-act') : null, rtl = LANG === 'ar', k = ev.key;
    if (k === 'Escape') {
      if (POP) { ev.preventDefault(); closePop(true); return; }
      if (OVL) { closeOverlay(); }
      return;
    }
    if ((k === 'Enter' || k === ' ') && (act === 'tsort' || act === 'ssort')) { ev.preventDefault(); t.click(); return; }
    if (k === 'Tab' && OVL) {
      var modal = $('.dms-modal'), controls = Array.prototype.filter.call(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'), function (el) { return el.getClientRects().length; });
      var first = controls[0], last = controls[controls.length - 1];
      if (ev.shiftKey && t === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && t === last) { ev.preventDefault(); first.focus(); }
    }
    if (act === 'tab' && /^(ArrowLeft|ArrowRight|Home|End)$/.test(k)) {
      var ids = APP.tabs.map(function (x) { return x.id; }), i = ids.indexOf(t.getAttribute('data-v')), L = ids.length;
      var d = k === 'Home' ? -i : k === 'End' ? L - 1 - i : ((k === 'ArrowRight') !== rtl ? 1 : -1);
      ev.preventDefault(); goTab(ids[(i + d + L) % L], true); return;
    }
    if (act === 'calday' && CAL) {
      var cur = t.getAttribute('data-v'), step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -7, ArrowDown: 7 }[k];
      if (step) { ev.preventDefault(); calMove(addDays(cur, step)); return; }
      if (k === 'PageUp' || k === 'PageDown') { ev.preventDefault(); calMove(shiftMonths(cur, k === 'PageUp' ? -1 : 1)); return; }
      if (k === 'Home' || k === 'End') { ev.preventDefault(); calMove(k === 'Home' ? weekStartOf(cur) : addDays(weekStartOf(cur), 6)); }
    }
  }
  /* Start: wire events, render the skeleton, run APP.boot (reference lists), then the first load. */
  function start() {
    HOST.addEventListener('click', onClick, SIG);
    HOST.addEventListener('input', onInput, SIG);
    HOST.addEventListener('change', onInput, SIG);
    HOST.addEventListener('keydown', onKey, SIG);
    HOST.addEventListener('pointerover', onOver, SIG);
    HOST.addEventListener('pointerleave', hideTip, SIG);
    HOST.addEventListener('focusin', function (ev) { var n = ev.target.closest && ev.target.closest('[data-tip]'); if (n) { showTip(n); } }, SIG);
    HOST.addEventListener('focusout', hideTip, SIG);
    document.addEventListener('pointerdown', function (ev) {
      if (!POP) { return; } var p = ev.composedPath ? ev.composedPath() : [];
      for (var i = 0; i < p.length; i++) { if (p[i] === HOST) { return; } }
      closePop(false);
    }, SIG);
    if (!G.frappe || !frappe.call) { HOST.innerHTML = '<div class="dms-empty">Frappe client API not available.</div>'; return; }
    setToday(); PERIOD = curPeriod();
    var chartResize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitChartLabels) : null;
    if (chartResize) { chartResize.observe(HOST); if (abort) { abort.signal.addEventListener('abort', function () { chartResize.disconnect(); }); } }
    if (document.fonts) { document.fonts.ready.then(function () { if (!destroyed) { fitChartLabels(); } }); }
    renderAll();
    var g = GEN, chk = function () { return g === GEN && !destroyed; };
    Promise.resolve(APP.boot ? APP.boot(chk) : null).catch(function (e) { if (G.console) { console.error(APP.key, 'boot', e); } }).then(function () { if (destroyed) { return; } BOOTED = true; reload(); });
  }
  /* ==== end DMS kit ==== */

  /* ============================================================ v1 constants and helpers (unchanged rules) */
  var SC = { plant: 'Plant and Machinery Direct', furn: 'Fixtures & Fittings-Indirect' }, SCOPE_CATS = [SC.plant, SC.furn], DM_FURN = ['Chair', 'Table'], DISPOSED = ['Sold', 'Scrapped', 'Decapitalized'], CAP = 5000;
  var STATUS_OPTS = ['Submitted', 'Partially Depreciated', 'Fully Depreciated', 'Sold', 'Scrapped', 'In Maintenance', 'Out of Order', 'Issue', 'Receipt', 'Capitalized', 'Decapitalized'];
  var ASSET_F = ['name', 'asset_name', 'asset_category', 'company', 'location', 'custodian', 'department', 'status', 'docstatus', 'purchase_date', 'available_for_use_date', 'total_asset_cost', 'gross_purchase_amount', 'additional_asset_cost', 'value_after_depreciation', 'opening_accumulated_depreciation', 'is_fully_depreciated', 'calculate_depreciation', 'maintenance_required', 'asset_quantity', 'disposal_date', 'insurance_end_date', 'default_finance_book'];
  var TL = null;
  function lx(o) { return o && typeof o === 'object' ? (o[LANG] || o.en) : o; }
  function t(k) { var a = Array.prototype.slice.call(arguments, 1), d = I[TL || LANG] || I.en, s = d[k] != null ? d[k] : (I.en[k] != null ? I.en[k] : k); return a.length ? s.replace(/[{]([0-9]+)[}]/g, function (m, i) { return a[+i]; }) : s; }
  function isN(v) { return v !== null && v !== undefined && v !== '' && !isNaN(Number(v)); }
  function n0(v) { return isN(v) ? Number(v) : 0; }
  function d10(v) { return v ? String(v).slice(0, 10) : ''; }
  function u(a) { var m = {}, o = []; a.forEach(function (x) { if (x !== null && x !== undefined && x !== '' && !m[x]) { m[x] = 1; o.push(x); } }); return o; }
  function sumBy(a, f) { return a.reduce(function (s, x) { return s + n0(f(x)); }, 0); }
  function cnt(rows, f) { var o = {}; rows.forEach(function (r) { var k = f(r); o[k] = (o[k] || 0) + 1; }); return o; }
  function dayDiff(a, b) { return Math.round((new Date(a) - new Date(b)) / 864e5); }
  function canRead(dt) { try { return frappe.model.can_read(dt); } catch (e) { return true; } }
  function NONE() { return t('none_set'); }
  var MEMO = {};
  function memo(key, fn) { if (!MEMO[key]) { var p = Promise.resolve().then(fn); MEMO[key] = p; p.catch(function () { delete MEMO[key]; }); } return MEMO[key]; }
  function pool(items, n, fn) { var i = 0, out = new Array(items.length); var w = function () { if (i >= items.length) { return Promise.resolve(); } var k = i++; return Promise.resolve(fn(items[k], k)).then(function (r) { out[k] = r; }, function (e) { out[k] = { __err: e }; }).then(w); }; var ws = []; for (var j = 0; j < Math.min(n, items.length); j++) { ws.push(w()); } return Promise.all(ws).then(function () { return out; }); }
  function list(dt, o) { o = o || {}; var a = { doctype: dt, fields: o.fields || ['name'], filters: o.filters || [], limit_start: o.start || 0, limit_page_length: o.limit || 500 }; if (o.or) { a.or_filters = o.or; } if (o.order) { a.order_by = o.order; } if (o.parent) { a.parent = o.parent; } return getList(a, null).then(function (r) { return r || []; }); }
  function fAll(dt, o, cap) { cap = cap || CAP; var out = []; var step = function (start) { return list(dt, Object.assign({}, o, { start: start, limit: 500 })).then(function (page) { out = out.concat(page); if (page.length < 500 || out.length >= cap) { return { rows: out.slice(0, cap), capped: out.length >= cap }; } return step(start + 500); }); }; return step(0); }
  function countOf(dt, o) { return list(dt, { fields: ['count(name) as n'], filters: o.filters, or: o.or, limit: 1 }).then(function (r) { return r && r[0] ? n0(r[0].n) : 0; }); }
  var DOCS = {};
  function getDoc(dt, name) { var k = dt + '|' + name; if (!DOCS[k]) { DOCS[k] = callP('frappe.client.get', { doctype: dt, name: name }); DOCS[k].catch(function () { delete DOCS[k]; }); } return DOCS[k]; }

  /* filters (v1 rules) */
  function aFilters(o) {
    o = o || {}; var Fx = [];
    Fx.push(['asset_category', 'in', F.category ? [F.category] : SCOPE_CATS]); if (F.company) { Fx.push(['company', '=', F.company]); }
    var nz = function (fld, v) { Fx.push(v === '__none__' ? [fld, 'is', 'not set'] : [fld, '=', v]); };
    if (F.location) { nz('location', F.location); } if (F.department) { nz('department', F.department); } if (F.custodian) { nz('custodian', F.custodian); }
    var st = o.status || F.status || 'active';
    if (st === 'active') { Fx.push(['docstatus', '=', 1]); Fx.push(['status', 'not in', DISPOSED]); } else if (st === 'cancelled') { Fx.push(['docstatus', '=', 2]); } else if (st === 'draft') { Fx.push(['docstatus', '=', 0]); } else if (st === 'noncancelled') { Fx.push(['docstatus', '<', 2]); } else if (st.indexOf('st:') === 0) { Fx.push(['docstatus', '=', 1]); Fx.push(['status', '=', st.slice(3)]); }
    if (!o.noDate) { if (F.from) { Fx.push(['purchase_date', '>=', F.from]); } if (F.to) { Fx.push(['purchase_date', '<=', F.to]); } }
    return Fx;
  }
  function aOr() { return F.q ? [['name', 'like', '%' + F.q + '%'], ['asset_name', 'like', '%' + F.q + '%']] : null; }
  function dmFilters(all) { var Fx = [['docstatus', '<', 2]]; if (!all) { Fx.push(['category', 'in', DM_FURN]); } if (F.location) { Fx.push(F.location === '__none__' ? ['location', 'is', 'not set'] : ['location', '=', F.location]); } if (F.custodian) { Fx.push(F.custodian === '__none__' ? ['employee', 'is', 'not set'] : ['employee', '=', F.custodian]); } if (F.from) { Fx.push(['date', '>=', F.from]); } if (F.to) { Fx.push(['date', '<=', F.to]); } if (F.category === SC.plant) { Fx.push(['name', '=', '__none__']); } return Fx; }
  function dmOr() { return F.q ? [['name', 'like', '%' + F.q + '%'], ['asset_id', 'like', '%' + F.q + '%'], ['description', 'like', '%' + F.q + '%']] : null; }
  function optsOf(f, extra) { var vals = u(((SCOPE || {}).rows || []).map(function (r) { return r[f]; }).concat(extra || [])).sort(); return [{ v: '__none__', l: NONE() }].concat(vals); }

  /* ============================================================ loaders (v1, adapted to the kit transport) */
  var META = null, SCOPE = null, OPT = { dmAll: false, acqAll: false, mvAll: false }, SEV = '';
  function loadMeta() {
    return Promise.all([list('Company', { fields: ['name', 'default_currency'], limit: 200 }).catch(function () { return []; }), list('Asset Category', { fields: ['name'], limit: 200 }).catch(function () { return []; })]).then(function (r) {
      var cur = {}; r[0].forEach(function (c) { cur[c.name] = c.default_currency; }); var cats = r[1].map(function (c) { return c.name; });
      var perms = {}; ['Asset', 'DM Assets', 'Asset Maintenance', 'Asset Maintenance Log', 'Asset Repair', 'Asset Movement', 'Asset Acquisition Records'].forEach(function (d) { perms[d] = canRead(d); });
      return Promise.all([perms['DM Assets'] ? fAll('DM Assets', { fields: ['location', 'employee'], filters: [['docstatus', '<', 2]] }).then(function (x) { return x.rows; }, function () { return []; }) : Promise.resolve([]), fAll('Asset', { fields: ASSET_F, filters: [['asset_category', 'in', SCOPE_CATS]], order: 'modified desc' }).catch(function () { return { rows: [], capped: false }; })]).then(function (x) {
        META = { companies: r[0], cur: cur, catNames: cats, perms: perms, dmLoc: u(x[0].map(function (y) { return y.location; })), dmEmp: u(x[0].map(function (y) { return y.employee; })), missingCat: cats.length ? SCOPE_CATS.filter(function (c) { return cats.indexOf(c) < 0; }) : [] };
        var map = {}; x[1].rows.forEach(function (a) { map[a.name] = a; }); SCOPE = { rows: x[1].rows, map: map, capped: x[1].capped };
      });
    });
  }
  function Lassets(o) { return memo('assets|' + JSON.stringify(o || {}), function () { return fAll('Asset', { fields: ASSET_F, filters: aFilters(o), or: aOr(), order: 'purchase_date desc, modified desc' }); }); }
  function Lmnt() {
    return memo('mnt', function () {
      var sc = SCOPE.map, out = { denied: {}, plans: [], tasks: [], logs: [], repairs: [], consumed: [] };
      var ld = function (key, dt, fn) { if (!canRead(dt)) { out.denied[key] = true; return Promise.resolve(); } return fn().catch(function () { out.denied[key] = true; }); };
      return Promise.all([
        ld('plans', 'Asset Maintenance', function () { return fAll('Asset Maintenance', { fields: ['name', 'asset_name', 'asset_category', 'company', 'maintenance_team', 'maintenance_manager', 'maintenance_manager_name'] }).then(function (p) { out.plans = p.rows.filter(function (x) { return sc[x.asset_name]; }); var names = {}; out.plans.forEach(function (x) { names[x.name] = 1; }); return fAll('Asset Maintenance Task', { parent: 'Asset Maintenance', fields: ['name', 'parent', 'maintenance_task', 'maintenance_type', 'maintenance_status', 'start_date', 'end_date', 'periodicity', 'next_due_date', 'last_completion_date', 'certificate_required', 'assign_to', 'assign_to_name', 'description'] }).then(function (tk) { out.tasks = tk.rows.filter(function (x) { return names[x.parent]; }); }); }); }),
        ld('logs', 'Asset Maintenance Log', function () { return fAll('Asset Maintenance Log', { fields: ['name', 'asset_maintenance', 'asset_name', 'task', 'task_name', 'maintenance_type', 'maintenance_status', 'due_date', 'completion_date', 'actions_performed', 'has_certificate', 'certificate_attachement', 'assign_to_name', 'docstatus'] }).then(function (l) { out.logs = l.rows.filter(function (x) { return sc[x.asset_name]; }); }); }),
        ld('repairs', 'Asset Repair', function () { return fAll('Asset Repair', { fields: ['name', 'asset', 'company', 'repair_status', 'failure_date', 'completion_date', 'repair_cost', 'total_repair_cost', 'capitalize_repair_cost', 'downtime', 'description', 'docstatus'] }).then(function (rp) { out.repairs = rp.rows.filter(function (x) { return sc[x.asset]; }); }); })
      ]).then(function () { return out; });
    });
  }
  function Ldm(all) { return memo('dm|' + !!all, function () { if (!canRead('DM Assets')) { return { denied: true, rows: [] }; } return fAll('DM Assets', { fields: ['name', 'asset_id', 'date', 'employee', 'location', 'category', 'description', 'docstatus'], filters: dmFilters(all), or: dmOr(), order: 'date desc' }); }); }
  function LdmRaw() { return memo('dmRaw', function () { return canRead('DM Assets') ? fAll('DM Assets', { fields: ['name', 'asset_id', 'category', 'description', 'employee', 'location', 'docstatus'], filters: [['docstatus', '<', 2]] }).then(function (x) { return x.rows; }) : []; }); }
  function Lmv() { return memo('mv', function () { if (!canRead('Asset Movement')) { return { denied: true, rows: [] }; } return fAll('Asset Movement', { fields: ['name', 'company', 'purpose', 'transaction_date', 'reference_doctype', 'reference_name', 'docstatus'] }).then(function (p) { var pm = {}; p.rows.forEach(function (x) { pm[x.name] = x; }); return fAll('Asset Movement Item', { parent: 'Asset Movement', fields: ['name', 'parent', 'asset', 'asset_name', 'source_location', 'target_location', 'from_employee', 'to_employee', 'company'] }).then(function (it) { return { rows: it.rows.filter(function (x) { return pm[x.parent]; }).map(function (x) { return Object.assign({}, x, { _p: pm[x.parent] }); }), parents: p.rows }; }); }); }); }
  function Lacq() { return memo('acq', function () { if (!canRead('Asset Acquisition Records')) { return { denied: true, rows: [] }; } return fAll('Asset Acquisition Records', { fields: ['name', 'date', 'employee', 'branch', 'custom_job_location', 'workflow_state', 'satus', 'docstatus'] }).then(function (p) { var pm = {}; p.rows.forEach(function (x) { pm[x.name] = x; }); return fAll('Asset Acquisition Table', { parent: 'Asset Acquisition Records', fields: ['name', 'parent', 'item_name', 'dmasset_no', 'quanity', 'life_cercle_end', 'ids'] }).then(function (it) { return { rows: it.rows.filter(function (x) { return pm[x.parent]; }).map(function (x) { return Object.assign({}, x, { _p: pm[x.parent] }); }), parents: p.rows }; }); }); }); }

  /* valuation (v1, unchanged) */
  function valuate(d) {
    var r = { name: d.name, status: d.status, cost: n0(d.total_asset_cost), company: d.company, verified: false, nbv: null, acc: null, reason: '', disposed: false, multiFB: false, sched: [], fb: null, posted: 0 };
    if (d.docstatus !== 1) { r.reason = 'not_submitted'; return r; } if (DISPOSED.indexOf(d.status) >= 0) { r.disposed = true; r.reason = 'disposed'; return r; }
    var fbs = d.finance_books || []; r.multiFB = fbs.length > 1;
    var fb = fbs.filter(function (x) { return x.finance_book && x.finance_book === d.default_finance_book; })[0] || fbs[0] || null; r.fb = fb ? (fb.finance_book || '(default)') : null;
    var sched = d.schedules || []; if (fbs.length > 1 && fb) { sched = sched.filter(function (s) { return (s.finance_book || null) === (fb.finance_book || null); }); } r.sched = sched;
    r.posted = sumBy(sched.filter(function (s) { return s.journal_entry; }), function (s) { return s.depreciation_amount; }); r.acc = n0(d.opening_accumulated_depreciation) + r.posted;
    var field = fb && isN(fb.value_after_depreciation) ? n0(fb.value_after_depreciation) : n0(d.value_after_depreciation), derived = r.cost - r.acc; r.field = field; r.derived = derived;
    if (!(r.cost > 0)) { r.reason = 'no_cost'; return r; } if (!d.calculate_depreciation && !n0(d.opening_accumulated_depreciation) && !sched.length) { r.reason = 'no_dep_calc'; return r; }
    if (Math.abs(field - derived) <= 1) { r.verified = true; r.nbv = Math.max(0, derived); return r; }
    r.reason = field <= 0.5 ? 'zero_unproven' : 'mismatch'; return r;
  }
  function Lval() { return memo('val', function () { return Lassets().then(function (A) { var a = A.rows.filter(function (x) { return x.docstatus === 1; }), sel = a.slice(0, 150); return pool(sel, 5, function (x) { return getDoc('Asset', x.name); }).then(function (docs) { var vals = docs.map(function (d, i) { return d && !d.__err ? valuate(d) : { name: sel[i].name, verified: false, reason: 'load_failed', cost: n0(sel[i].total_asset_cost), company: sel[i].company, status: sel[i].status, sched: [] }; }); return { vals: vals, partial: a.length > sel.length, total: a.length, docs: docs.filter(function (d) { return d && !d.__err; }) }; }); }); }); }
  function curOf(co) { return (META && META.cur[co]) || ''; }
  function byCur(rows, f) { var o = {}; rows.forEach(function (r) { var c = curOf(r.company) || '—'; o[c] = (o[c] || 0) + n0(f(r)); }); return o; }
  /* one line per currency (never summed across currencies); several currencies stack in a smaller size so none is cut off */
  function moneyMap(o) { var k = Object.keys(o); if (!k.length) { return '0'; } var h = k.map(function (c) { return '<bdi class="pf-mm-i">' + esc(money(o[c])) + (c === '—' ? '' : '<small>' + esc(c) + '</small>') + '</bdi>'; }); return k.length > 1 ? '<span class="pf-mm">' + h.join('') + '</span>' : h[0]; }
  function moneyTxt(o) { return Object.keys(o).map(function (c) { return money(o[c]) + (c === '—' ? '' : ' ' + c); }).join(' · ') || '0'; }
  function m2(n, co) { return (curOf(co) ? curOf(co) + ' ' : '') + amt(n); }
  function taskState(x) { if (x.maintenance_status === 'Cancelled') { return 'cancelled'; } if (x.end_date && x.end_date < TODAY) { return 'ended'; } if (x.next_due_date && x.next_due_date < TODAY) { return 'overdue'; } if (x.maintenance_status === 'Overdue') { return 'overdue'; } return 'planned'; }
  function inRange(d) { if (!d) { return !(F.from || F.to); } var x = d10(d); return (!F.from || x >= F.from) && (!F.to || x <= F.to); }
  function mScope() {
    return Promise.all([Lmnt(), Lassets({ noDate: true })]).then(function (r) {
      var M = r[0], A = r[1], set = {}; A.rows.forEach(function (a) { set[a.name] = 1; });
      var plans = M.plans.filter(function (p) { return set[p.asset_name]; }), pmap = {}; plans.forEach(function (p) { pmap[p.name] = p; }); var dr = !!(F.from || F.to);
      var tasks = M.tasks.filter(function (x) { return pmap[x.parent] && (!dr || inRange(x.next_due_date)); }).map(function (x) { return Object.assign({}, x, { _asset: pmap[x.parent].asset_name, _state: taskState(x) }); });
      var logs = M.logs.filter(function (l) { return set[l.asset_name] && l.docstatus !== 2 && (!dr || inRange(l.due_date || l.completion_date)); }), repairs = M.repairs.filter(function (x) { return set[x.asset] && x.docstatus !== 2 && (!dr || inRange(x.failure_date)); });
      var od = {}; logs.forEach(function (l) { if (['Planned', 'Overdue'].indexOf(l.maintenance_status) >= 0 && l.due_date && d10(l.due_date) < TODAY) { od[l.task || l.name] = { asset: l.asset_name, task: l.task_name, due: d10(l.due_date), dt: 'Asset Maintenance Log', ref: l.name }; } });
      tasks.forEach(function (x) { if (x._state === 'overdue' && !od[x.name]) { od[x.name] = { asset: x._asset, task: x.maintenance_task, due: d10(x.next_due_date), dt: 'Asset Maintenance', ref: x.parent }; } });
      return { M: M, A: A, plans: plans, tasks: tasks, logs: logs, repairs: repairs, overdue: vals(od), denied: M.denied };
    });
  }
  function repCost(r) { return n0(r.total_repair_cost) || n0(r.repair_cost); }

  /* ============================================================ per-tab data (memoised per filter set; kit reload clears it) */
  function loadOverview() { return Promise.all([Lassets(), mScope(), Lval(), Ldm(false), countOf('Asset', { filters: aFilters(), or: aOr() })]).then(function (r) { return { A: r[0], MS: r[1], V: r[2], dm: r[3], total: r[4] }; }); }
  function ensure(key, fn) { if (!((key + 'Tok') in D)) { run(key, fn); } }
  function loadTab(id) {
    if (id === 'plant') { ensure('plant', function () { return Promise.all([Lassets({ status: 'noncancelled' }), mScope()]).then(function (r) { return { A: r[0], MS: r[1] }; }); }); }
    if (id === 'furniture') { ensure('furn', function () { return Promise.all([Ldm(false), Lassets({ status: 'noncancelled' })]).then(function (r) { return { dm: r[0], A: r[1] }; }); }); }
    if (id === 'valuation') { ensure('val', function () { return Promise.all([Lassets(), Lval(), Lassets({ status: 'all' })]).then(function (r) { return { A: r[0], V: r[1], all: r[2] }; }); }); }
    if (id === 'assign') { ensure('assign', function () { return Promise.all([Lassets(), Lmv(), Ldm(OPT.dmAll), Lacq(), LdmRaw()]).then(function (r) { return { A: r[0], mv: r[1], dm: r[2], acq: r[3], raw: r[4] }; }); }); }
    if (id === 'movement') { ensure('mv', function () { return Lmv(); }); }
  }
  function loadAudit() {
    return Promise.all([Lassets({ status: 'all', noDate: true }), Lmnt(), Lval(), LdmRaw()]).then(function (r) {
      var A = r[0], M = r[1], V = r[2], dmRaw = r[3]; var rules = function () { var X = [], add = function (sev, ref, issue, source, fix, dt, name, k) { X.push({ sev: sev, ref: ref, issue: issue, source: source, fix: fix, dt: dt, name: name, k: k }); };
      var live = A.rows.filter(function (a) { return a.docstatus < 2; }), dup = {}; live.forEach(function (a) { var k = [a.asset_name, a.company, d10(a.purchase_date), n0(a.total_asset_cost)].join('|'); (dup[k] = dup[k] || []).push(a); });
      var planAssets = {}; M.plans.forEach(function (p) { planAssets[p.asset_name] = 1; });
      A.rows.forEach(function (a) {
        if (a.docstatus === 2) { add('info', a.name, t('x_cancelled'), 'Asset', t('f_cancelled'), 'Asset', a.name, 'cancelled'); return; }
        if (a.docstatus === 0) { add('medium', a.name, t('x_draft'), 'Asset', t('f_draft'), 'Asset', a.name, 'draft'); }
        if (!a.location) { add('high', a.name, t('x_noloc'), 'Asset', t('f_noloc'), 'Asset', a.name, 'noloc'); }
        if (!a.custodian) { add('medium', a.name, t('x_nocust'), 'Asset', t('f_nocust'), 'Asset', a.name, 'nocust'); }
        if (!a.purchase_date) { add('medium', a.name, t('x_nodate'), 'Asset', t('f_nodate'), 'Asset', a.name, 'nodate'); }
        if (!(n0(a.total_asset_cost) > 0)) { add('high', a.name, t('x_nocost'), 'Asset', t('f_nocost'), 'Asset', a.name, 'nocost'); }
        if (a.status === 'Fully Depreciated' && !a.is_fully_depreciated) { add('low', a.name, t('x_fdflag'), 'Asset', t('f_fdflag'), 'Asset', a.name, 'fdflag'); }
        if (a.maintenance_required && !planAssets[a.name] && !M.denied.plans) { add('medium', a.name, t('x_nomplan'), 'Asset / Asset Maintenance', t('f_nomplan'), 'Asset', a.name, 'nomplan'); }
        if (DISPOSED.indexOf(a.status) >= 0) { add('info', a.name, t('x_disposed', a.status), 'Asset', t('f_disposed'), 'Asset', a.name, 'disposed'); }
      });
      Object.keys(dup).forEach(function (k) { if (dup[k].length > 1) { dup[k].forEach(function (a) { add('high', a.name, t('x_dup', dup[k].map(function (x) { return x.name; }).filter(function (n) { return n !== a.name; }).join(', ')), 'Asset', t('f_dup'), 'Asset', a.name, 'dup'); }); } });
      V.vals.forEach(function (v) { if (!v.verified && !v.disposed && v.reason) { add(v.reason === 'mismatch' || v.reason === 'zero_unproven' ? 'high' : 'medium', v.name, t('x_unver') + ': ' + t('r_' + v.reason), 'Asset (finance books / schedules)', t('f_unver'), 'Asset', v.name, 'unver'); } });
      var mset = {}, oset = {}; A.rows.forEach(function (a) { mset[a.name] = 1; });
      M.logs.forEach(function (l) { if (mset[l.asset_name] && ['Planned', 'Overdue'].indexOf(l.maintenance_status) >= 0 && l.due_date && d10(l.due_date) < TODAY && l.docstatus !== 2) { oset[l.task || l.name] = [l.asset_name, l.task_name, d10(l.due_date), 'Asset Maintenance Log', l.name]; } });
      var pm = {}; M.plans.forEach(function (p) { pm[p.name] = p; });
      M.tasks.forEach(function (x) { var p = pm[x.parent]; if (p && mset[p.asset_name] && taskState(x) === 'overdue' && !oset[x.name]) { oset[x.name] = [p.asset_name, x.maintenance_task, d10(x.next_due_date), 'Asset Maintenance', x.parent]; } });
      vals(oset).forEach(function (o) { add('high', o[0], t('x_overdue', o[1], o[2]), o[3], t('f_overdue'), o[3], o[4], 'overdue'); });
      var tmap = {}; M.tasks.forEach(function (x) { tmap[x.name] = x; });
      M.logs.forEach(function (l) { if (mset[l.asset_name] && l.maintenance_status === 'Completed' && tmap[l.task] && tmap[l.task].certificate_required && !l.certificate_attachement) { add('medium', l.asset_name, t('x_nocert', l.task_name), 'Asset Maintenance Log', t('f_nocert'), 'Asset Maintenance Log', l.name, 'nocert'); } });
      var idCount = {}; dmRaw.forEach(function (x) { if (x.asset_id) { idCount[x.asset_id] = (idCount[x.asset_id] || 0) + 1; } });
      dmRaw.filter(function (x) { return DM_FURN.indexOf(x.category) >= 0; }).forEach(function (x) {
        if (!x.asset_id) { add('high', x.name, t('x_noid'), 'DM Assets', t('f_noid'), 'DM Assets', x.name, 'noid'); }
        if (x.asset_id && idCount[x.asset_id] > 1) { add('high', x.asset_id, t('x_dmdup'), 'DM Assets', t('f_dup'), 'DM Assets', x.name, 'dmdup'); }
        if (!String(x.description || '').trim()) { add('low', x.asset_id || x.name, t('x_furn_inc', t('c_desc')), 'DM Assets', t('f_furn_inc'), 'DM Assets', x.name, 'furninc'); }
        if (!x.employee) { add('medium', x.asset_id || x.name, t('x_furn_inc', t('c_employee')), 'DM Assets', t('f_furn_inc'), 'DM Assets', x.name, 'furninc'); }
        if (!x.location) { add('medium', x.asset_id || x.name, t('x_furn_inc', t('c_location')), 'DM Assets', t('f_furn_inc'), 'DM Assets', x.name, 'furninc'); }
      });
      return X; };
      /* findings are built once per language so switching language never shows stale text */
      var X, XA; try { TL = 'en'; X = rules(); TL = 'ar'; XA = rules(); } finally { TL = null; }
      X.forEach(function (x, i) { x.issue = { en: x.issue, ar: XA[i].issue }; x.fix = { en: x.fix, ar: XA[i].fix }; });
      var rank = { high: 0, medium: 1, low: 2, info: 3 }; X.sort(function (a, b) { return rank[a.sev] - rank[b.sev] || String(a.ref).localeCompare(String(b.ref)); });
      return { X: X, counts: { Asset: SCOPE.rows.length, 'DM Assets': dmRaw.length, 'Asset Maintenance': M.plans.length, 'Asset Maintenance Log': M.logs.length, 'Asset Repair': M.repairs.length } };
    });
  }

  /* ============================================================ actions pending (v1 exception checks, high and medium) */
  var ACT = [['a_noloc', 'high', ['noloc'], 'x_noloc', 'f_noloc'], ['a_nocost', 'high', ['nocost'], 'x_nocost', 'f_nocost'], ['a_dup', 'high', ['dup', 'dmdup'], 'x_dup_s', 'f_dup'], ['a_overdue', 'high', ['overdue'], 'k_od', 'f_overdue'], ['a_unver', 'high', ['unver'], 'x_unver', 'f_unver'], ['a_noid', 'high', ['noid'], 'x_noid', 'f_noid'],
    ['a_nocust', 'med', ['nocust'], 'x_nocust', 'f_nocust'], ['a_draft', 'med', ['draft'], 'x_draft', 'f_draft'], ['a_nomplan', 'med', ['nomplan'], 'x_nomplan', 'f_nomplan'], ['a_nocert', 'med', ['nocert'], 'x_nocert_s', 'f_nocert'], ['a_nodate', 'med', ['nodate'], 'x_nodate', 'f_nodate'], ['a_furninc', 'low', ['furninc'], 'f_incomplete', 'f_furn_inc'], ['a_fdflag', 'low', ['fdflag'], 'x_fdflag', 'f_fdflag']];
  I.en.x_dup_s = 'Possible duplicate records'; I.ar.x_dup_s = 'سجلات مكررة محتملة'; I.en.x_nocert_s = 'Completed maintenance without a required certificate'; I.ar.x_nocert_s = 'صيانة مكتملة بدون الشهادة المطلوبة';
  function actSpecs() { return ACT.map(function (a) { return { id: a[0], client: true, short: t(a[3]), title: t(a[3]), why: t(a[4]) }; }); }
  function actClient() {
    if (D.auditErr) { return 'ERR:' + D.auditErr; } if (!D.audit) { return null; }
    var o = {}; ACT.forEach(function (a) { var rows = D.audit.X.filter(function (x) { return a[2].indexOf(x.k) > -1; }); o[a[0]] = { rows: rows, item: function (x) { return { p: a[1], score: score(a[1], 0, 0), dt: x.dt, name: x.name, title: x.ref, desc: lx(x.issue), who: x.source, due: '', fix: lx(x.fix), tone: a[1] === 'high' ? 'bad' : a[1] === 'med' ? 'warn' : 'n' }; } }; });
    return o;
  }

  /* ============================================================ shared view pieces */
  function two(a, b) { return '<div class="dms-cols-2 dms-grid">' + a + b + '</div>'; }
  function need(key, what, f) { if (D[key + 'Err']) { return srcErr(D[key + 'Err'], what); } if (D[key] == null) { return '<div class="dms-grid dms-kpis" aria-busy="true">' + skel(4, 'dms-skel-kpi') + '</div><div class="dms-skel dms-skel-panel"></div>'; } return f(D[key]); }
  function stChip(s, ds) { if (ds === 2 || s === 'Cancelled') { return stat('bad', s || 'Cancelled'); } var m = { 'Fully Depreciated': 'warn', 'In Maintenance': 'n', 'Out of Order': 'bad', Submitted: 'ok', 'Partially Depreciated': 'ok', Draft: 'warn', Completed: 'ok', Planned: 'n', Overdue: 'bad', Pending: 'warn' }; return stat(m[s] || 'n', s || '—'); }
  function aLink(name) { return '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="asset:' + esc(name) + '">' + esc(name) + '</button>'; }
  function dLink(name, label) { return '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="dm:' + esc(name) + '">' + esc(label || name) + '</button>'; }
  function mut(x) { return '<span class="dms-sm">' + esc(x) + '</span>'; }
  function hb(o, lab, n) { var it = Object.keys(o).map(function (k) { return { label: lab ? lab(k) : k, value: o[k] }; }).sort(function (a, b) { return b.value - a.value; }); return it.length ? hbars(it.slice(0, n || 12), num) : empty(t('empty')); }
  function noneLbl(k) { return k === '__none__' ? NONE() : k; }
  function col2(k, h, get, o) { o = o || {}; return { k: k, h: h, num: o.num, s: o.s || get, r: o.r || function (r) { var v = get(r); return o.num ? '<span class="dms-num">' + esc(num(v)) + '</span>' : v === '' || v == null ? mut('—') : bdi(v); }, c: o.c || get }; }
  function tbl(id, rows, cols, o) { o = o || {}; return regTable(Object.assign({ id: id, rows: rows, cols: cols, pageSize: o.pageSize || 15, file: o.file || id, text: function (r) { return cols.map(function (c) { return c.c ? c.c(r) : ''; }).join(' '); }, empty: o.empty || t('empty') }, o.x || {})); }
  function costCell(r) { return '<span class="dms-num">' + esc(m2(r.total_asset_cost, r.company)) + '</span>'; }
  function repairTable(id, rep) {
    return rep.length ? tbl(id, rep, [col2('n', t('c_ref'), function (r) { return r.name; }, { r: function (r) { return docLink('Asset Repair', r.name); } }), col2('a', t('c_id'), function (r) { return r.asset; }, { r: function (r) { return aLink(r.asset); } }), col2('s', t('c_status'), function (r) { return r.repair_status; }, { r: function (r) { return stChip(r.repair_status); } }), col2('f', t('c_failure'), function (r) { return d10(r.failure_date); }), col2('d', t('c_completed'), function (r) { return d10(r.completion_date); }), col2('c', t('c_repcost'), function (r) { return repCost(r); }, { num: 1, r: function (r) { return '<span class="dms-num">' + esc(m2(repCost(r), r.company)) + '</span>' + (r.capitalize_repair_cost ? ' ' + stat('n', t('capitalized')) : ''); } }), col2('dt', t('c_downtime'), function (r) { return r.downtime || ''; })], { file: 'asset_repairs', x: { sk: 'f', dir: -1 } }) : empty(t('no_repairs') + '. ' + t('no_repairs_s'));
  }

  /* ============================================================ views */
  function vOverview(AM) {
    if (D.ovErr) { return srcErr(D.ovErr, 'Asset') + actionsPanel(AM); }
    if (!D.ov) { return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>'; }
    var O = D.ov, rows = O.A.rows, plant = rows.filter(function (r) { return r.asset_category === SC.plant; }), furn = rows.filter(function (r) { return r.asset_category === SC.furn; });
    var cost = byCur(rows.filter(function (r) { return r.docstatus === 1; }), function (r) { return r.total_asset_cost; }), ver = O.V.vals.filter(function (v) { return v.verified; }), nbv = byCur(ver, function (v) { return v.nbv; });
    var nocust = rows.filter(function (r) { return !r.custodian; }), nofin = rows.filter(function (r) { return !r.location || !(n0(r.total_asset_cost) > 0); }), recOk = O.total === rows.length && !O.A.capped;
    var h = kpis([
      kpi({ label: t('k_plant'), dot: 'var(--dms-royal)', val: num(plant.length), sub: esc(t('s_qty', num(sumBy(plant, function (r) { return r.asset_quantity; })), num(plant.length))), act: 'goto:plant' }),
      kpi({ label: t('k_furn'), dot: 'var(--dms-royal)', val: num(furn.length + O.dm.rows.length), sub: esc(t('s_furn', num(furn.length), num(O.dm.rows.length))), act: 'goto:furniture' }),
      kpi({ label: t('k_cost'), val: moneyMap(cost), sub: esc(t('s_hist')), act: 'goto:valuation' }),
      kpi({ label: t('k_nbv'), dot: 'var(--dms-ok)', val: ver.length ? moneyMap(nbv) : '—', sub: esc(t('s_nbv', num(ver.length), num(O.V.vals.length)) + (O.V.partial ? ' · ' + t('partial') : '')), act: 'goto:valuation' }),
      kpi({ label: t('k_nocust'), dot: nocust.length ? 'var(--dms-age3)' : null, val: num(nocust.length), sub: esc(t('s_of', num(rows.length))), act: 'goto:audit' }),
      kpi({ label: t('k_od'), dot: O.MS.overdue.length ? 'var(--dms-bad)' : null, val: num(O.MS.overdue.length), sub: esc(t('s_od')) })
    ], true);
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(t('ch_status'), hb(cnt(rows, function (r) { return r.docstatus === 2 ? 'Cancelled' : r.status || '—'; }))) +
      panel(t('c_cat'), hbars([{ label: SC.plant, value: plant.length }, { label: SC.furn, value: furn.length }, { label: t('dm_furn_lbl'), value: O.dm.rows.length }].filter(function (x) { return x.value; }), num) || empty(t('empty')), '', esc(t('h_records'))) + '</div></div>';
    h += alertBox(recOk ? 'info' : 'warn', esc(recOk ? t('recon_ok', num(O.total), num(rows.length)) : t('recon_bad', num(O.total), num(rows.length)))) + note(esc(t('measures_note')));
    var mo = {}, nodate = 0; rows.forEach(function (r) { if (!r.purchase_date) { nodate++; return; } var k = d10(r.purchase_date).slice(0, 7); mo[k] = (mo[k] || 0) + 1; }); var mk = Object.keys(mo).sort();
    h += two(panel(t('c_loc'), hb(cnt(rows, function (r) { return r.location || '__none__'; }), noneLbl, 12), '', esc(t('h_records'))), panel(t('c_trend'), mk.length ? barChart(monthList(mk[0], mk[mk.length - 1]), 'month', [{ label: t('records'), color: 'var(--dms-royal)', val: function (k) { return mo[k] || 0; } }], num) : empty(t('empty')), '', esc(nodate ? t('n_nodate', num(nodate)) : t('h_trend').split(';')[0])));
    var ms = cnt(O.MS.tasks, function (x) { return t('ts_' + x._state); });
    return h + two(panel(t('c_costcat'), hb((function () { var o = {}; rows.filter(function (r) { return r.docstatus === 1; }).forEach(function (r) { var k = r.asset_category + (Object.keys(cost).length > 1 ? ' (' + (curOf(r.company) || '—') + ')' : ''); o[k] = (o[k] || 0) + n0(r.total_asset_cost); }); return o; })()), '', esc(t('h_hist'))), panel(t('c_mstatus'), O.MS.denied.plans ? alertBox('warn', esc(t('no_access') + ': Asset Maintenance')) : hb(ms)));
  }
  function vRegister() {
    var Fx = aFilters(), OR = aOr(), SORT = { id: 'name', an: 'asset_name', cat: 'asset_category', co: 'company', loc: 'location', cus: 'custodian', pd: 'purchase_date', cost: 'total_asset_cost', st: 'status' };
    return panel(t('t_register'), regTable({ id: 't_reg', server: true, dt: 'Asset', fields: ASSET_F, filters: Fx, pageSize: 25, file: 'asset_register', order: 'purchase_date desc', searchHint: t('f_search_ph'),
      loader: function (p, size, q, order) { var orf = q ? [['name', 'like', '%' + q + '%'], ['asset_name', 'like', '%' + q + '%']] : OR; return Promise.all([countOf('Asset', { filters: Fx, or: orf }), list('Asset', { fields: ASSET_F, filters: Fx, or: orf, order: (order || 'purchase_date desc') + ', name asc', start: p * size, limit: size })]).then(function (r) { return pool(r[1].filter(function (x) { return x.docstatus === 1; }), 5, function (x) { return getDoc('Asset', x.name); }).then(function (docs) { var vm = {}; docs.forEach(function (d) { if (d && !d.__err) { vm[d.name] = valuate(d); } }); return { total: r[0], rows: r[1].map(function (x) { return Object.assign({}, x, { _v: vm[x.name] }); }) }; }); }); },
      cols: [{ k: 'id', h: t('c_id'), sf: SORT.id, r: function (r) { return aLink(r.name); }, c: function (r) { return r.name; } }, { k: 'an', h: t('c_name'), sf: SORT.an, r: function (r) { return bdi(r.asset_name || ''); }, c: function (r) { return r.asset_name; } }, { k: 'cat', h: t('c_category'), sf: SORT.cat, r: function (r) { return bdi(r.asset_category || ''); }, c: function (r) { return r.asset_category; } }, { k: 'loc', h: t('c_location'), sf: SORT.loc, r: function (r) { return r.location ? bdi(r.location) : mut(NONE()); }, c: function (r) { return r.location; } }, { k: 'cus', h: t('c_custodian'), sf: SORT.cus, r: function (r) { return r.custodian ? bdi(r.custodian) : mut(NONE()); }, c: function (r) { return r.custodian; } }, { k: 'pd', h: t('c_pdate'), sf: SORT.pd, r: function (r) { return dtc(r.purchase_date); }, c: function (r) { return d10(r.purchase_date); } }, { k: 'cost', h: t('c_cost'), sf: SORT.cost, num: 1, r: costCell, c: function (r) { return n0(r.total_asset_cost); } },
        { k: 'nbv', h: t('c_nbv'), num: 1, r: function (r) { var v = r._v; return r.docstatus !== 1 || !v ? mut('—') : v.disposed ? stat('n', t('disposed')) : v.verified ? '<span class="dms-num" title="' + esc(t('nbv_rule')) + '">' + esc(m2(v.nbv, v.company)) + '</span>' : '<span title="' + esc(t('r_' + v.reason)) + '">' + stat('warn', t('unverified')) + '</span>'; }, c: function (r) { return r._v && r._v.verified ? r._v.nbv : ''; } }, { k: 'st', h: t('c_status'), sf: SORT.st, r: function (r) { return stChip(r.docstatus === 2 ? 'Cancelled' : r.status, r.docstatus); }, c: function (r) { return r.status; } }] }), '', esc(t('h_register')));
  }
  function vPlant() {
    return need('plant', 'Asset', function (P) {
      var rows = P.A.rows.filter(function (r) { return r.asset_category === SC.plant; }), act = rows.filter(function (r) { return r.docstatus === 1 && DISPOSED.indexOf(r.status) < 0; }), set = {}; rows.forEach(function (r) { set[r.name] = 1; });
      var M = P.MS, logs = M.logs.filter(function (l) { return set[l.asset_name]; }), rep = M.repairs.filter(function (r) { return set[r.asset]; }), sc = function (s) { return rows.filter(function (r) { return r.status === s; }).length; }, hasPlan = function (n) { return M.plans.some(function (p) { return p.asset_name === n; }); };
      var h = note(esc(t('note_nostatus'))) + kpis([kpi({ label: t('p_total'), val: num(rows.length), sub: esc(t('s_nodisp', num(rows.length - act.length))) }), kpi({ label: t('p_active'), dot: 'var(--dms-ok)', val: num(act.length), sub: esc(t('s_active_def')) }), kpi({ label: t('k_im'), val: num(sc('In Maintenance')) }), kpi({ label: t('p_ooo'), dot: sc('Out of Order') ? 'var(--dms-bad)' : null, val: num(sc('Out of Order')) }), kpi({ label: t('k_fd'), val: num(sc('Fully Depreciated')) }), kpi({ label: t('p_cost'), val: moneyMap(byCur(act, function (r) { return r.total_asset_cost; })), sub: esc(t('s_hist')) })]);
      if (!rows.length) { return h + empty(t('empty_plant')); }
      h += two(panel(t('c_loc'), hb(cnt(rows, function (r) { return r.location || '__none__'; }), noneLbl)), panel(t('ch_status'), hb(cnt(rows, function (r) { return r.docstatus === 1 ? r.status : 'Cancelled'; }))));
      h += panel(t('t_inventory'), tbl('t_pinv', rows, [col2('id', t('c_id'), function (r) { return r.name; }, { r: function (r) { return aLink(r.name); } }), col2('an', t('c_name'), function (r) { return r.asset_name; }), col2('loc', t('c_location'), function (r) { return r.location || ''; }), col2('cus', t('c_custodian'), function (r) { return r.custodian || ''; }, { r: function (r) { return r.custodian ? bdi(r.custodian) : mut(NONE()); } }), col2('st', t('c_status'), function (r) { return r.status; }, { r: function (r) { return stChip(r.status, r.docstatus); } }), col2('pd', t('c_pdate'), function (r) { return d10(r.purchase_date); }), col2('c', t('c_cost'), function (r) { return n0(r.total_asset_cost); }, { num: 1, r: costCell }), col2('m', t('c_mreq'), function (r) { return r.maintenance_required ? 1 : 0; }, { r: function (r) { return (r.maintenance_required ? stat('warn', t('yes')) : stat('n', t('no'))) + (hasPlan(r.name) ? ' ' + stat('ok', t('has_plan')) : ''); } })], { file: 'plant_inventory', x: { sk: 'pd', dir: -1 } }));
      h += two(panel(t('t_mreq'), M.denied.plans ? alertBox('warn', esc(t('no_access') + ': Asset Maintenance')) : '<div class="dms-facts"><div><span class="dms-sm">' + esc(t('mreq_flag')) + '</span><b class="dms-num">' + num(rows.filter(function (r) { return r.maintenance_required; }).length) + '</b></div><div><span class="dms-sm">' + esc(t('k_plans')) + '</span><b class="dms-num">' + num(M.plans.filter(function (p) { return set[p.asset_name]; }).length) + '</b></div><div><span class="dms-sm">' + esc(t('mreq_noplan')) + '</span><b class="dms-num">' + num(rows.filter(function (r) { return r.maintenance_required && !hasPlan(r.name); }).length) + '</b></div></div>'),
        panel(t('c_avail'), note(esc(t('avail_msg', rep.filter(function (r) { return r.downtime; }).length ? rep.filter(function (r) { return r.downtime; }).map(function (r) { return r.asset + ': ' + r.downtime; }).join('; ') : t('no_downtime'))))));
      h += panel(t('t_mhist'), logs.length ? tbl('t_plogs', logs, [col2('a', t('c_id'), function (r) { return r.asset_name; }), col2('tk', t('c_task'), function (r) { return r.task_name || ''; }), col2('ty', t('c_mtype'), function (r) { return r.maintenance_type || ''; }), col2('st', t('c_status'), function (r) { return r.maintenance_status; }, { r: function (r) { return stChip(r.maintenance_status); } }), col2('du', t('c_due'), function (r) { return d10(r.due_date); }), col2('co', t('c_completed'), function (r) { return d10(r.completion_date); })], { file: 'plant_maintenance_history' }) : empty(t('no_logs')));
      return h + panel(t('t_repairs'), repairTable('t_prep', rep));
    });
  }
  function vFurniture() {
    return need('furn', 'DM Assets', function (P) {
      var h = note(esc(t('note_dm'))); if (P.dm.denied) { return h + alertBox('warn', esc(t('no_access') + ': DM Assets')); }
      var R = P.dm.rows, fx = P.A.rows.filter(function (r) { return r.asset_category === SC.furn; }), assigned = R.filter(function (r) { return r.employee; }).length, nodesc = R.filter(function (r) { return !String(r.description || '').trim(); }).length;
      h += kpis([kpi({ label: t('f_chairs'), dot: 'var(--dms-royal)', val: num(R.filter(function (r) { return r.category === 'Chair'; }).length), sub: esc(t('s_records_only')) }), kpi({ label: t('f_tables'), dot: 'var(--dms-royal)', val: num(R.filter(function (r) { return r.category === 'Table'; }).length), sub: esc(t('s_records_only')) }), kpi({ label: t('f_other'), val: num(fx.length), sub: esc(t('s_other', SC.furn)) }), kpi({ label: t('f_assigned'), val: num(assigned) }), kpi({ label: t('f_unassigned'), dot: R.length - assigned ? 'var(--dms-age3)' : null, val: num(R.length - assigned) }), kpi({ label: t('f_incomplete'), dot: nodesc ? 'var(--dms-age3)' : null, val: num(nodesc), sub: esc(t('s_nodesc')) })]);
      h += two(panel(t('f_byloc'), hb(cnt(R, function (r) { return r.location || '__none__'; }), noneLbl)), panel(t('f_byemp'), hb(cnt(R, function (r) { return r.employee || '__none__'; }), noneLbl)));
      h += panel(t('t_furn_reg'), tbl('t_furn', R, [col2('id', t('c_id'), function (r) { return r.asset_id || r.name; }, { r: function (r) { return dLink(r.name, r.asset_id || r.name); } }), col2('ca', t('c_category'), function (r) { return r.category; }), col2('de', t('c_desc'), function (r) { return String(r.description || '').slice(0, 120); }), col2('em', t('c_employee'), function (r) { return r.employee || ''; }), col2('lo', t('c_location'), function (r) { return r.location || ''; }), col2('d', t('c_recdate'), function (r) { return d10(r.date); })], { file: 'furniture_register', empty: t('empty_furn'), x: { sk: 'd', dir: -1 } }));
      return h + panel(t('t_fx'), fx.length ? tbl('t_fx', fx, [col2('id', t('c_id'), function (r) { return r.name; }, { r: function (r) { return aLink(r.name); } }), col2('an', t('c_name'), function (r) { return r.asset_name; }), col2('lo', t('c_location'), function (r) { return r.location || ''; }), col2('cu', t('c_custodian'), function (r) { return r.custodian || ''; }), col2('st', t('c_status'), function (r) { return r.status; }, { r: function (r) { return stChip(r.status, r.docstatus); } }), col2('c', t('c_cost'), function (r) { return n0(r.total_asset_cost); }, { num: 1, r: costCell })], { file: 'fixtures_assets' }) : empty(t('empty_fx_s', SC.furn)));
    });
  }
  var AGE = [['<1', 0, 1], ['1-3', 1, 3], ['3-5', 3, 5], ['5-10', 5, 10], ['10+', 10, 1e9]];
  function vValuation() {
    return need('val', 'Asset', function (P) {
      var rows = P.A.rows.filter(function (r) { return r.docstatus === 1; }), V = P.V, ver = V.vals.filter(function (v) { return v.verified; }), unv = V.vals.filter(function (v) { return !v.verified && !v.disposed; }), disp = P.all.rows.filter(function (r) { return DISPOSED.indexOf(r.status) >= 0 || r.docstatus === 2; });
      var h = note(esc(t('val_rule'))) + (V.partial ? alertBox('warn', esc(t('val_partial', num(V.total)))) : '');
      h += kpis([kpi({ label: t('v_cost'), val: moneyMap(byCur(rows, function (r) { return r.total_asset_cost; })), sub: esc(t('s_hist') + ' · ' + t('s_excl_cancel')) }), kpi({ label: t('v_acc'), val: ver.length ? moneyMap(byCur(ver, function (v) { return v.acc; })) : '—', sub: esc(t('s_verified_only', num(ver.length))) }), kpi({ label: t('k_nbv'), dot: 'var(--dms-ok)', val: ver.length ? moneyMap(byCur(ver, function (v) { return v.nbv; })) : '—', sub: esc(t('s_nbv', num(ver.length), num(V.vals.length))) }), kpi({ label: t('v_unver'), dot: unv.length ? 'var(--dms-age3)' : null, val: num(unv.length), sub: esc(t('s_unver_cost', moneyTxt(byCur(unv, function (v) { return v.cost; })))), act: 'goto:audit' }), kpi({ label: t('k_fd'), val: num(P.A.rows.filter(function (r) { return r.status === 'Fully Depreciated'; }).length) }), kpi({ label: t('v_disp'), val: num(disp.length), sub: esc(t('s_disp')) })]);
      if (!rows.length) { return h + empty(t('empty_scope')); }
      var yr = {}; V.vals.forEach(function (v) { (v.sched || []).forEach(function (s) { var y = String(s.schedule_date || '').slice(0, 4); if (!y) { return; } var o = yr[y] || (yr[y] = { p: 0, s: 0 }); if (s.journal_entry) { o.p += n0(s.depreciation_amount); } else { o.s += n0(s.depreciation_amount); } }); });
      var ages = AGE.map(function (a) { return { label: a[0] + ' ' + t('yrs'), value: 0 }; }), noAge = 0; rows.forEach(function (r) { var d = r.available_for_use_date || r.purchase_date; if (!d) { noAge++; return; } var y = dayDiff(TODAY, d10(d)) / 365.25, i = -1; AGE.forEach(function (a, j) { if (y >= a[1] && y < a[2]) { i = j; } }); if (i >= 0) { ages[i].value++; } });
      var ys = Object.keys(yr).sort();
      h += two(panel(t('v_depyear'), ys.length ? splitBars(ys.map(function (y) { return { label: y, part: yr[y].p, total: yr[y].p + yr[y].s }; }), [{ label: t('posted'), color: 'var(--dms-royal)' }, { label: t('scheduled'), color: '#a3b4ef' }], function (v) { return money(v); }) : empty(t('no_sched')), '', esc(t('h_depyear'))), panel(t('v_age'), hbars(ages, num), '', esc(noAge ? t('n_nodate', num(noAge)) : t('h_age'))));
      var dm = {}; V.docs.forEach(function (d) { dm[d.name] = d; });
      h += panel(t('t_valuation'), tbl('t_val', V.vals.map(function (v) { return Object.assign({}, v, { open: n0((dm[v.name] || {}).opening_accumulated_depreciation) }); }), [col2('id', t('c_id'), function (r) { return r.name; }, { r: function (r) { return aLink(r.name); } }), col2('c', t('c_cost'), function (r) { return r.cost; }, { num: 1, r: function (r) { return '<span class="dms-num">' + esc(m2(r.cost, r.company)) + '</span>'; } }), col2('o', t('v_open'), function (r) { return r.open; }, { num: 1, r: function (r) { return '<span class="dms-num">' + esc(amt(r.open)) + '</span>'; } }), col2('p', t('v_posted'), function (r) { return r.posted; }, { num: 1, r: function (r) { return '<span class="dms-num">' + esc(amt(r.posted)) + '</span>'; } }), col2('de', t('v_derived'), function (r) { return r.derived; }, { num: 1, r: function (r) { return r.derived == null ? '—' : '<span class="dms-num">' + esc(amt(r.derived)) + '</span>'; } }), col2('fi', t('v_field'), function (r) { return r.field; }, { num: 1, r: function (r) { return r.field == null ? '—' : '<span class="dms-num">' + esc(amt(r.field)) + '</span>'; } }), col2('fb', t('v_fb'), function (r) { return r.fb || ''; }, { r: function (r) { return bdi(r.fb || '—') + (r.multiFB ? ' ' + stat('n', t('multi_fb')) : ''); } }), col2('re', t('v_result'), function (r) { return r.verified ? 1 : 0; }, { r: function (r) { return r.verified ? stat('ok', t('verified')) : stat(r.disposed ? 'n' : 'warn', t('unverified')) + ' ' + mut(r.reason ? t('r_' + r.reason) : ''); }, c: function (r) { return r.verified ? 'Verified' : 'Unverified: ' + (r.reason ? t('r_' + r.reason) : ''); } })], { file: 'valuation' }));
      return h + panel(t('t_disposed'), disp.length ? tbl('t_disp', disp, [col2('id', t('c_id'), function (r) { return r.name; }, { r: function (r) { return aLink(r.name); } }), col2('an', t('c_name'), function (r) { return r.asset_name; }), col2('st', t('c_status'), function (r) { return r.status; }, { r: function (r) { return stChip(r.docstatus === 2 ? 'Cancelled' : r.status, r.docstatus); } }), col2('dd', t('c_disposal'), function (r) { return d10(r.disposal_date); }), col2('c', t('c_cost'), function (r) { return n0(r.total_asset_cost); }, { num: 1, r: function (r) { return costCell(r) + ' ' + stat('n', t('excluded')); } })], { file: 'disposed_cancelled' }) : empty(t('no_disposed')));
    });
  }
  function seg(key, a, b) { return '<span class="pf-seg" role="group"><button type="button" class="dms-btn dms-btn-sm' + (!OPT[key] ? ' dms-btn-primary' : '') + '" data-act="opt" data-v="' + key + ':0" aria-pressed="' + !OPT[key] + '">' + esc(a) + '</button><button type="button" class="dms-btn dms-btn-sm' + (OPT[key] ? ' dms-btn-primary' : '') + '" data-act="opt" data-v="' + key + ':1" aria-pressed="' + !!OPT[key] + '">' + esc(b) + '</button></span>'; }
  function vAssign() {
    return need('assign', 'Asset', function (P) {
      var cust = P.A.rows.filter(function (r) { return r.custodian && r.docstatus === 1; }), last = {}; (P.mv.rows || []).forEach(function (m) { if (m._p.docstatus === 1 && m.asset && m.to_employee) { var k = m.asset + '|' + m.to_employee, d = d10(m._p.transaction_date); if (!last[k] || d > last[k]) { last[k] = d; } } });
      var q = String(F.q || '').toLowerCase(), ar = (P.acq.rows || []).filter(function (r) { return r._p.docstatus < 2; });
      if (!OPT.acqAll) { ar = ar.filter(function (r) { return ['chair', 'table'].indexOf(String(r.item_name || '').toLowerCase()) >= 0; }); }
      if (F.custodian) { ar = ar.filter(function (r) { return F.custodian === '__none__' ? !(r.life_cercle_end || r._p.employee) : (r.life_cercle_end === F.custodian || r._p.employee === F.custodian); }); }
      if (F.from) { ar = ar.filter(function (r) { return d10(r._p.date) >= F.from; }); } if (F.to) { ar = ar.filter(function (r) { return d10(r._p.date) <= F.to; }); }
      if (F.location) { ar = ar.filter(function (r) { return (r.ids || r._p.custom_job_location || '') === F.location; }); } if (q) { ar = ar.filter(function (r) { return [r.item_name, r.dmasset_no, r._p.name, r._p.employee, r.life_cercle_end].join(' ').toLowerCase().indexOf(q) >= 0; }); }
      var ids = {}; P.raw.forEach(function (r) { ids[r.asset_id] = 1; }); var withNo = (P.acq.rows || []).filter(function (r) { return r.dmasset_no; }), linked = withNo.filter(function (r) { return ids[r.dmasset_no]; }).length;
      var emps = u([].concat(cust.map(function (r) { return r.custodian; }), (P.dm.rows || []).map(function (r) { return r.employee; }), ar.map(function (r) { return r.life_cercle_end || r._p.employee; })));
      var h = note(esc(t('note_assign'))) + kpis([kpi({ label: t('as_asset'), val: num(cust.length), sub: 'Asset' }), kpi({ label: t('as_dm'), val: num((P.dm.rows || []).length), sub: 'DM Assets' }), kpi({ label: t('as_acq'), val: num(ar.length), sub: 'Asset Acquisition Records' }), kpi({ label: t('as_emps'), val: num(emps.length), sub: esc(t('s_distinct')) })]) + alertBox(linked ? 'warn' : 'info', esc(t('link_check', num(linked), num(withNo.length))));
      var ret = function () { return mut(t('not_recorded')); };
      h += panel(t('as_t1'), tbl('t_as1', cust, [col2('cu', t('c_employee'), function (r) { return r.custodian; }), col2('id', t('c_id'), function (r) { return r.name; }, { r: function (r) { return aLink(r.name); } }), col2('ca', t('c_category'), function (r) { return r.asset_category; }), col2('cl', t('c_comploc'), function (r) { return r.company + ' / ' + (r.location || '—'); }), col2('ad', t('c_assigned'), function (r) { return last[r.name + '|' + r.custodian] || ''; }, { r: function (r) { var d = last[r.name + '|' + r.custodian]; return d ? dtc(d) + ' ' + mut('(' + t('via_mv') + ')') : mut(t('not_recorded')); } }), { k: 'rt', h: t('c_return'), r: ret, c: function () { return ''; } }], { file: 'asset_custodians', empty: t('empty_cust') }));
      h += panel(t('as_t2'), tbl('t_as2', P.dm.rows || [], [col2('em', t('c_employee'), function (r) { return r.employee || ''; }), col2('id', t('c_id'), function (r) { return r.asset_id || r.name; }, { r: function (r) { return dLink(r.name, r.asset_id || r.name); } }), col2('ca', t('c_category'), function (r) { return r.category; }), col2('lo', t('c_location'), function (r) { return r.location || ''; }), col2('d', t('c_assigned'), function (r) { return d10(r.date); }), { k: 'rt', h: t('c_return'), r: ret, c: function () { return ''; } }], { file: 'dm_assets_assignments', empty: t('empty_dm') }), '', seg('dmAll', t('furn_only'), t('all_cats')));
      return h + panel(t('as_t3'), tbl('t_as3', ar, [col2('em', t('c_employee'), function (r) { return r.life_cercle_end || r._p.employee || ''; }), col2('it', t('c_item'), function (r) { return r.item_name || ''; }), col2('no', t('c_dmno'), function (r) { return r.dmasset_no || ''; }), col2('rf', t('c_ref'), function (r) { return r.parent; }, { r: function (r) { return docLink('Asset Acquisition Records', r.parent); } }), col2('d', t('c_assigned'), function (r) { return d10(r._p.date); }), col2('ws', t('c_wstate'), function (r) { return r._p.workflow_state || ''; }, { r: function (r) { return stat(r._p.workflow_state === 'Assigned' ? 'ok' : 'n', r._p.workflow_state || '—'); } }), col2('rt', t('c_return'), function (r) { return r._p.satus || ''; }, { r: function (r) { return r._p.satus === 'Return' ? stat('warn', t('returned')) : r._p.satus === 'Issue New' ? stat('ok', t('issued')) : mut(t('not_recorded')); } })], { file: 'acquisition_assignments', empty: t('empty_acq'), x: { sk: 'd', dir: -1 } }), '', seg('acqAll', t('furn_only'), t('all_items')));
    });
  }
  function vMovement() {
    return need('mv', 'Asset Movement', function (mv) {
      if (mv.denied) { return alertBox('warn', esc(t('no_access') + ': Asset Movement')); }
      var q = String(F.q || '').toLowerCase(), rows = mv.rows.map(function (m) { return Object.assign({}, m, { _cat: (SCOPE.map[m.asset] || {}).asset_category || '' }); }), total = rows.length;
      if (!OPT.mvAll) { rows = rows.filter(function (m) { return m._cat; }); } if (F.company) { rows = rows.filter(function (m) { return (m.company || m._p.company) === F.company; }); } if (F.category) { rows = rows.filter(function (m) { return m._cat === F.category; }); }
      if (F.location) { rows = rows.filter(function (m) { return F.location === '__none__' ? !(m.source_location || m.target_location) : (m.source_location === F.location || m.target_location === F.location); }); }
      if (F.from) { rows = rows.filter(function (m) { return d10(m._p.transaction_date) >= F.from; }); } if (F.to) { rows = rows.filter(function (m) { return d10(m._p.transaction_date) <= F.to; }); } if (q) { rows = rows.filter(function (m) { return [m.asset, m.asset_name, m.parent, m._p.reference_name].join(' ').toLowerCase().indexOf(q) >= 0; }); }
      var can = rows.filter(function (m) { return m._p.docstatus === 2; }).length, inS = rows.filter(function (m) { return m._cat; }).length;
      return note(esc(t('note_move'))) + kpis([kpi({ label: t('mv_lines'), val: num(rows.length), sub: esc(t('s_of_all', num(total))) }), kpi({ label: t('mv_docs'), val: num(u(rows.map(function (m) { return m.parent; })).length) }), kpi({ label: t('mv_in'), val: num(inS) }), kpi({ label: t('mv_out'), val: num(rows.length - inS) }), kpi({ label: t('mv_can'), dot: can ? 'var(--dms-age3)' : null, val: num(can) })]) +
        panel(t('tab_movement'), tbl('t_mv', rows, [col2('d', t('c_mdate'), function (m) { return d10(m._p.transaction_date); }), col2('a', t('c_id'), function (m) { return m.asset; }, { r: function (m) { return m._cat ? aLink(m.asset) : docLink('Asset', m.asset); } }), col2('an', t('c_name'), function (m) { return m.asset_name || ''; }), col2('ca', t('c_category'), function (m) { return m._cat; }, { r: function (m) { return m._cat ? bdi(m._cat) : mut(t('outside_scope')); } }), col2('pu', t('c_mtype2'), function (m) { return m._p.purpose || ''; }), col2('fr', t('c_src') + ' → ' + t('c_dst'), function (m) { return (m.source_location || '—') + ' → ' + (m.target_location || '—'); }), col2('to', t('c_to'), function (m) { return m.to_employee || ''; }), col2('doc', t('c_doc'), function (m) { return m.parent; }, { r: function (m) { return docLink('Asset Movement', m.parent); } }), col2('st', t('c_status'), function (m) { return m._p.docstatus; }, { r: function (m) { return m._p.docstatus === 1 ? stat('ok', t('submitted')) : m._p.docstatus === 2 ? stat('bad', 'Cancelled') : stat('warn', 'Draft'); }, c: function (m) { return ['Draft', 'Submitted', 'Cancelled'][m._p.docstatus]; } })], { file: 'asset_movements', empty: OPT.mvAll ? t('empty_mv') : t('empty_mv_s'), x: { sk: 'd', dir: -1 } }), '', seg('mvAll', t('scope_only'), t('all_cats')));
    });
  }
  function vAudit() {
    return need('audit', 'Asset', function (A) {
      var X = A.X, c = function (k) { return X.filter(function (x) { return x.sev === k; }).length; }, shown = SEV ? X.filter(function (x) { return x.sev === SEV; }) : X, rank = { high: 0, medium: 1, low: 2, info: 3 };
      var h = note(esc(t('note_audit'))) + kpis([kpi({ label: t('x_total'), val: num(X.length) })].concat(['high', 'medium', 'low', 'info'].map(function (k) { return kpi({ label: t('sev_' + k), dot: k === 'high' && c(k) ? 'var(--dms-bad)' : k === 'medium' && c(k) ? 'var(--dms-age3)' : null, val: num(c(k)), act: 'sev:' + k }); })));
      h += '<div class="pf-qf" role="group">' + [['', t('all')], ['high', t('sev_high')], ['medium', t('sev_medium')], ['low', t('sev_low')], ['info', t('sev_info')]].map(function (s) { return '<button type="button" class="dms-btn dms-btn-sm' + (SEV === s[0] ? ' dms-btn-primary' : '') + '" data-act="sev" data-v="' + s[0] + '" aria-pressed="' + (SEV === s[0]) + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>';
      h += panel(t('tab_audit'), tbl('t_exc', shown, [col2('sev', t('c_severity'), function (x) { return rank[x.sev]; }, { r: function (x) { return stat(x.sev === 'high' ? 'bad' : x.sev === 'medium' ? 'warn' : 'n', t('sev_' + x.sev)); }, c: function (x) { return x.sev; } }), col2('ref', t('c_asset'), function (x) { return x.ref; }, { r: function (x) { return x.dt === 'Asset' ? aLink(x.name) : docLink(x.dt, x.name, x.ref); } }), col2('is', t('c_issue'), function (x) { return lx(x.issue); }), col2('so', t('c_source'), function (x) { return x.source; }), col2('fx', t('c_fix'), function (x) { return lx(x.fix); }, { r: function (x) { return '<span class="dms-sm">' + esc(lx(x.fix)) + '</span>'; } })], { file: 'exceptions', empty: t('no_exceptions') + '. ' + t('no_exceptions_s'), pageSize: 25 }));
      var srcs = Object.keys(A.counts);
      return h + panel(t('t_sources'), '<div class="dms-tablewrap"><table class="dms-table dms-table-sm"><thead><tr><th scope="col">' + esc(t('c_source')) + '</th><th scope="col">' + esc(t('c_access')) + '</th><th scope="col" class="dms-num">' + esc(t('c_count')) + '</th></tr></thead><tbody>' + srcs.map(function (s) { return '<tr><td>' + esc(s) + '</td><td>' + (canRead(s) ? stat('ok', t('readable')) : stat('bad', t('no_access'))) + '</td><td class="dms-num">' + num(A.counts[s]) + '</td></tr>'; }).join('') + '</tbody></table></div>');
    });
  }
  function vActions(AM) { return actionsTab(AM, t('note_audit')); }

  /* ============================================================ details and events */
  var DET = null;
  function kvTbl(rows) { return '<div class="dms-facts pf-facts">' + rows.map(function (r) { return '<div><span class="dms-sm">' + esc(r[0]) + '</span><b>' + (r[2] ? r[1] : (r[1] === '' || r[1] == null ? '<span class="dms-sm">' + esc(t('not_recorded')) + '</span>' : esc(r[1]))) + '</b></div>'; }).join('') + '</div>'; }
  function detailBody() {
    if (!DET) { return ''; } if (DET.err) { return alertBox('err', esc(DET.err)); } var d = DET.doc; if (!d) { return skel(1, 'dms-skel-panel'); }
    if (DET.dt === 'DM Assets') { return kvTbl([[t('c_id'), d.asset_id], [t('c_category'), d.category], [t('c_desc'), d.description], [t('c_employee'), d.employee], [t('c_location'), d.location], [t('c_recdate'), d10(d.date)]]) + note(esc(t('dm_nofin'))); }
    var v = valuate(d), m = function (n) { return m2(n, d.company); };
    return '<div class="dms-actions-row">' + stChip(d.docstatus === 2 ? 'Cancelled' : d.status, d.docstatus) + '</div><h4 class="pf-h">' + esc(t('d_identity')) + '</h4>' + kvTbl([[t('c_category'), d.asset_category], [t('c_company'), d.company], ['Item', d.item_name || d.item_code], [t('c_pdate'), d10(d.purchase_date)], [t('d_avail'), d10(d.available_for_use_date)], [t('d_qty'), d.asset_quantity]]) +
      '<h4 class="pf-h">' + esc(t('d_operational')) + '</h4>' + kvTbl([[t('c_location'), d.location], [t('c_custodian'), d.custodian], [t('c_dept'), d.department], [t('c_mreq'), d.maintenance_required ? t('yes') : t('no')], [t('d_insend'), d10(d.insurance_end_date)], [t('d_disposal'), d10(d.disposal_date)]]) +
      '<h4 class="pf-h">' + esc(t('d_financial')) + '</h4>' + kvTbl([[t('d_hist'), m(d.total_asset_cost)], [t('v_open'), m(d.opening_accumulated_depreciation)], [t('v_posted'), m(v.posted)], [t('d_field'), d.value_after_depreciation != null ? m(d.value_after_depreciation) : ''], [t('v_derived'), v.derived != null ? m(v.derived) : ''], [t('c_nbv'), v.verified ? esc(m(v.nbv)) + ' ' + stat('ok', t('verified')) : v.disposed ? stat('n', t('disposed')) : stat('warn', t('unverified')) + ' ' + mut(t('r_' + v.reason)), 1]]) +
      (d.docstatus === 1 && v.sched.length ? '<div class="dms-tablewrap"><table class="dms-table dms-table-sm"><thead><tr><th scope="col">' + esc(t('d_date')) + '</th><th scope="col" class="dms-num">' + esc(t('d_amount')) + '</th><th scope="col">' + esc(t('d_posted')) + '</th></tr></thead><tbody>' + v.sched.slice(0, 40).map(function (s) { return '<tr><td>' + esc(d10(s.schedule_date)) + '</td><td class="dms-num">' + esc(amt(s.depreciation_amount)) + '</td><td>' + (s.journal_entry ? docLink('Journal Entry', s.journal_entry) : mut('—')) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '');
  }
  function drill(id) {
    var m = id.match(/^(asset|dm):(.+)$/); if (m && DET) { return { title: DET.name, sub: DET.dt === 'Asset' ? t('d_title') : 'DM Assets', link: [DET.dt, DET.name, DET.name], body: detailBody(), pf: 'det' }; }
    if (id.indexOf('cli:') === 0) {
      var k = id.slice(4), cc = actClient(), x = cc && typeof cc === 'object' && cc[k], s = actSpecs().filter(function (y) { return y.id === k; })[0]; if (!x || !s) { return null; }
      return { title: s.title, sub: s.why, spec: { rows: x.rows.map(x.item), file: k, text: function (it) { return [it.title, it.desc].join(' '); }, cols: [{ h: t('c_asset'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.name; } }, { h: t('c_issue'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc) + '</span>'; }, c: function (it) { return it.desc; } }, { h: t('c_source'), r: function (it) { return bdi(it.who); }, c: function (it) { return it.who; } }, { h: t('c_fix'), r: function (it) { return '<span class="dms-sm">' + esc(it.fix) + '</span>'; }, c: function (it) { return it.fix; } }] } };
    }
    return null;
  }
  function onAct(a, v) {
    if (a === 'kpi' && v.indexOf('goto:') === 0) { goTab(v.slice(5), false, true); return true; }
    if (a === 'kpi' && /^(asset|dm):/.test(v)) { var dt = v.indexOf('asset:') === 0 ? 'Asset' : 'DM Assets', nm = v.replace(/^(asset|dm):/, ''); DET = { dt: dt, name: nm, doc: null }; openDrill(v); getDoc(dt, nm).then(function (d) { if (DET && DET.name === nm) { DET.doc = d; if (OVL && OVL.pf === 'det') { OVL.body = detailBody(); renderOverlay(); } } }, function (e) { if (DET && DET.name === nm) { DET.err = errKind(e) === 'perm' ? t('no_access') : t('err_generic'); if (OVL && OVL.pf === 'det') { OVL.body = detailBody(); renderOverlay(); } } }); return true; }
    if (a === 'kpi' && v.indexOf('sev:') === 0) { SEV = v.slice(4); renderSoft(); return true; }
    if (a === 'sev') { SEV = v; renderSoft(); return true; }
    if (a === 'opt') { var p = v.split(':'); OPT[p[0]] = p[1] === '1'; delete D.assign; delete D.assignTok; delete D.assignErr; delete D.mv; delete D.mvTok; delete D.mvErr; delete MEMO['dm|true']; delete MEMO['dm|false']; loadTab(tab); renderSoft(); return true; }
    return false;
  }

  start();
})();

/* ==== DM theme sync (same as tools/erp/shell/dark_theme.py output; maintained here since this block is built on the standard) ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
