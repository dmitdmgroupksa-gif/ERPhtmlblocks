/* VAT & ZATCA Command Center - JavaScript (Custom HTML Block "script" field).
   Data comes only from the secured Server Script API `vat_zatca_dashboard` (read-only).
   No localStorage use for data, no external libraries (charts are inline SVG). */
(function () {
  'use strict';

  var root = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
  var V = root.querySelector('#vz');
  if (!V || V.__vzInit) { return; }
  V.__vzInit = true;

  var $ = function (s) { return root.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };

  /* ------------------------------------------------------------------ i18n */
  var I18N = {
    en: {
      err_truncated: 'The result reached the safe row limit, so the figure is not shown (it would be incomplete)',
      restricted: 'Access to this dashboard is limited to the roles: System Manager, CEO, Internal Controller, Accounts Manager and Dashboard Manager.',
      x_run: 'Run check', x_scanning: 'Scanning invoices...', x_rate_not_run: 'Run the check first (it scans the period in bounded pages).',
      x_rate_cap: 'Not calculated: the period has more invoices than the 3,000-invoice scan limit. Narrow the period or company.', x_rate_done: 'Scanned',
      x_unavail: 'Unavailable', arch_note: 'All figures are read live with your own ERPNext permissions; no backend scripts are used.',
      cov_note: 'DM KSA VAT Report coverage: results are checked against Sales and Purchase Invoices for each company. Each company is cross-checked against its Sales and Purchase Invoices; only companies that reconcile are included in the totals. Unverified companies are listed separately and never added to consolidated figures.',
      eyebrow: 'DM GROUP / FINANCE & COMPLIANCE', title: 'VAT & ZATCA Command Center',
      subtitle: 'Live VAT return figures and e-invoicing compliance across your companies',
      f_company: 'Company', f_group: 'VAT registration group', all_companies: 'All companies', all_groups: 'All groups',
      p_today: 'Today', p_week: 'This Week', p_month: 'This Month', p_lastmonth: 'Last Month', p_quarter: 'This Quarter', p_year: 'This Year', p_custom: 'Custom Period',
      f_from: 'Start date', f_to: 'End date', refresh: 'Refresh', refreshing: 'Refreshing...',
      last_refresh: 'Last successful refresh', never: 'Not refreshed yet', partial_fail: 'section(s) failed on the last attempt',
      c_owner: 'Owner', c_reason: 'Reason', noaccess: 'No access to', timeout: 'Request timed out', tab_overview: 'Overview', tab_vat: 'VAT Returns', tab_zatca: 'ZATCA Status', tab_register: 'Invoice Register', tab_compliance: 'Compliance & Exceptions',
      scope: 'Scope', period: 'Period', basis: 'Posting-date basis', all_permitted: 'All permitted companies', companies_n: 'companies', vat_group_scope: 'VAT group',
      loading: 'Loading...', retry: 'Retry', close: 'Close', details: 'Details', open_erp: 'Open in ERPNext', open_report: 'Open native report',
      sar: 'SAR', unavailable: 'Unavailable', unverified: 'Unverified', verified: 'Verified', partial: 'Partial',
      err_empty: 'The server returned an empty response.', err_section: 'This section could not be loaded', no_data: 'No records for the selected scope and period.',
      /* KPI */
      k_taxable: 'Taxable Sales', k_taxable_sub: 'Net of credit notes, DM KSA VAT Report', k_output: 'Output VAT', k_output_sub: 'Sales VAT, DM KSA VAT Report',
      k_input: 'Input VAT', k_input_sub: 'Purchases + expenses VAT, DM KSA VAT Report', k_net_pay: 'Net VAT Payable', k_net_ref: 'Net VAT Refundable', k_net: 'Net VAT Payable / Refundable',
      k_net_sub: 'Output VAT minus Input VAT', k_verified_of: 'companies verified', k_not_verified: 'Not verified - see VAT Returns tab',
      k_total: 'Total ZATCA Invoices', k_total_sub: 'Submitted invoices with a ZATCA status', k_cleared: 'Cleared', k_cleared_w: 'Cleared with Warnings',
      k_cleared_w_sub: 'Accepted, but warnings need review', k_pending: 'Pending Invoices', k_pending_sub: 'All-dates open backlog', k_rejected: 'Rejected / Failed',
      k_rejected_sub: 'Rejected + Overdue (no "Failed" status exists)', k_reported: 'Reported', k_reported_w: 'Reported with Warnings', k_overdue: 'Overdue', k_failed: 'Failed',
      k_failed_sub: 'Not a status of the installed integration', k_draft: 'Draft (submitted invoices)', k_draft_sub: 'Submitted but never transmitted', k_other: 'Other / Unknown Status',
      k_other_sub: 'Status value not in the integration list', k_nostatus: 'No ZATCA status', k_nostatus_sub: 'Typically invoices before e-invoicing', k_cancelled: 'Cancelled (excluded)',
      k_draft_unsub: 'Unsubmitted drafts (excluded)', invoices: 'invoices',
      /* sections */
      s_vat_kpis: 'VAT position', s_zatca_kpis: 'ZATCA e-invoicing', s_alerts: 'VAT and ZATCA compliance alerts', s_attention: 'Needs attention',
      s_out_in: 'Output vs Input VAT', s_out_in_sub: 'Per company, DM KSA VAT Report (verified companies only)', s_trend: 'Monthly VAT trend', s_trend_sub: 'Document-based (Sales / Purchase Invoices); the VAT return itself comes from the DM KSA VAT Report',
      s_status_dist: 'ZATCA status distribution', s_compare: 'Company comparison', s_groups: 'VAT registration groups', s_breakdown: 'Complete VAT report breakdown', s_recon: 'Reconciliation: report vs documents',
      s_unavail: 'Not attributable by company', s_status_cards: 'Status counts', s_monthly_status: 'Status by month', s_ageing: 'Pending invoice ageing', s_by_company: 'Status by company',
      s_timestamps: 'Reporting / clearance timestamps', s_warnings: 'Warning details', s_rejected_list: 'Rejected & overdue invoices', s_pending_list: 'Oldest pending invoices', s_meanings: 'What the statuses mean',
      s_exceptions: 'Exceptions', s_filing: 'VAT filing and payment verification', s_tax_recon: 'Tax reconciliation issues', s_register: 'Sales invoices',
      /* alerts */
      al_none: 'No active alerts for this scope.', al_unrecon: 'VAT report not reconciled for', al_unrecon_sub: 'The KSA VAT report does not agree with the documents, so these figures are excluded from the totals.',
      al_backlog: 'Pending ZATCA invoices older than 7 days', al_backlog_sub: 'Open backlog across all dates. Oldest posting date:', al_rejected: 'Rejected or overdue ZATCA invoices',
      al_warn_pct: 'Cleared with warnings is', al_warn_pct_sub: 'of ZATCA invoices in this period - "cleared with warnings" is accepted by ZATCA but is not error-free compliance.',
      al_filing: 'VAT filing and payment are not verified', al_filing_sub: 'No reliable ERP record proves a VAT return was filed or paid for this period.',
      al_report_bug: 'Native report "Sales Invoices and Zatca" ignores its company filter', al_report_bug_sub: 'This dashboard reads Sales Invoices directly by company; do not use that report for company-level counts.',
      al_missing: 'ZATCA invoices missing UUID / hash / QR data', al_cn: 'Credit notes with problems',
      /* VAT tab */
      v_scope_total: 'Sum of verified companies', v_compare_prev: 'Compare with previous period', v_prev: 'Previous period', v_delta: 'Change',
      v_taxable_base: 'Taxable base', v_adjust: 'Adjustments (returns)', v_vat: 'VAT', v_section: 'Section', v_line: 'Line', v_company: 'Company', v_net: 'Net VAT', v_status: 'Status',
      v_sales_vat: 'Output VAT (report)', v_si_vat: 'Sales Invoice VAT', v_diff: 'Difference', v_purch_vat: 'Input VAT, std purchases (report)', v_pi_vat: 'Purchase Invoice VAT',
      v_group_tax: 'VAT number', v_group_members: 'Companies', v_group_note: 'Group totals are an internal aggregation of per-company ledger figures. They are NOT an officially filed group VAT return. Companies sharing a VAT number are summed once each - no company is counted twice. Inter-company invoices are not eliminated.',
      v_view_companies: 'By company', v_view_groups: 'By VAT group', v_base_note: 'DM KSA VAT Report: the sales Amount is already net of credit notes; adjustments are shown separately for reference and are not deducted again.',
      v_native_report: 'Open DM KSA VAT Report', v_unavail_foreign: 'Foreign purchases (prepared report "VAT Report - Purchase Foreign")', v_unavail_expense: 'Expense VAT (prepared report "VAT Report - Expense")',
      v_unavail_why: 'These prepared reports have no company field, so they cannot be attributed to a company. The company-attributed lines from the KSA VAT report (reverse-charge imports, customs charges, expenses with VAT) are shown in the breakdown above.',
      v_intercompany: 'Inter-company invoices', v_no_verified: 'No company is reconciled for this scope, so no consolidated figure is shown.',
      v_sales_ok: 'Output VAT agrees with Sales Invoices', v_status_reconciled: 'Reconciled', v_status_mismatch: 'Mismatch', v_status_not_covered: 'Not covered by report', v_status_error: 'Report error', v_status_unverified: 'Unverified',
      v_tol: 'Tolerance', v_loading_company: 'Loading company...', v_net_unverified: 'Net VAT cannot be confirmed',
      /* ZATCA tab */
      z_total_inv: 'Total invoices', z_by_status: 'By status', z_all_dates: 'All dates', z_oldest: 'Oldest', z_ageing_note: 'Ageing covers all pending and stuck-draft invoices regardless of the selected period.',
      z_last_clear: 'Latest clearing time', z_last_report: 'Latest reporting time', z_cleared_nots: 'Cleared without clearing timestamp', z_reported_nots: 'Reported without reporting timestamp',
      z_load_warn: 'Load warning details', z_warn_none: 'No warnings in this scope and period.', z_warn_count: 'Invoices', z_status_note: 'Statuses are read from Sales Invoice "zatca_status" written by the installed ZATCA app.',
      m_cleared: 'Cleared: accepted by ZATCA clearance without warnings.', m_cleared_w: 'Cleared with warnings: accepted, but ZATCA returned warnings (for example buyer data issues). Review them - this is not error-free compliance.',
      m_reported: 'Reported: simplified invoice reported to ZATCA.', m_reported_w: 'Reported with warnings: reported, with warnings to review.', m_pending: 'Pending: submitted in ERP but not yet cleared/reported.',
      m_rejected: 'Rejected: ZATCA refused the invoice; it must be corrected and re-sent.', m_overdue: 'Overdue: the transmission deadline has passed without acceptance.', m_draft: 'Draft: set on a submitted invoice means it was never transmitted.',
      m_cancelled: 'Cancelled: invoice cancelled in ERP.', m_failed: 'Failed: the installed integration has no such status; failures appear as Rejected, Overdue or remain Pending.',
      st_Draft: 'Draft', st_Pending: 'Pending', st_Reported: 'Reported', st_Cleared: 'Cleared', 'st_Reported with warnings': 'Reported with warnings', 'st_Cleared with warnings': 'Cleared with warnings',
      st_Rejected: 'Rejected', st_Overdue: 'Overdue', st_Cancelled: 'Cancelled', st___none__: 'No ZATCA status', st_other: 'Other / Unknown',
      /* Register */
      r_search: 'Search invoice or customer', r_status: 'ZATCA status', r_all_status: 'All statuses', r_page_size: 'Rows per page', r_showing: 'Showing', r_of: 'of', r_page: 'Page', r_prev: 'Previous', r_next: 'Next',
      c_invoice: 'Invoice Number', c_customer: 'Customer', c_company: 'Company', c_date: 'Posting Date', c_type: 'Invoice Type', c_taxable: 'Taxable Amount', c_vat: 'VAT Amount', c_total: 'Grand Total',
      c_status: 'ZATCA Status', c_time: 'Reporting / Clearing Time', c_action: 'Action', c_warning: 'Warning', c_clearing: 'clearing', c_reporting: 'reporting', t_invoice: 'Tax Invoice', t_credit: 'Credit Note',
      /* Compliance */
      ex_pending_all: 'Pending ZATCA invoices', exd_pending_all: 'Submitted but not cleared or reported (all dates)', ex_stuck_draft: 'Submitted invoices still in Draft ZATCA status', exd_stuck_draft: 'Never transmitted (all dates)',
      ex_rejected_all: 'Rejected or overdue transmissions', exd_rejected_all: 'ZATCA refused or deadline missed (all dates)', ex_warnings: 'Cleared / reported with warnings', exd_warnings: 'Accepted but warnings need review',
      ex_missing_uuid: 'Missing ZATCA details (UUID)', exd_missing_uuid: 'Has a ZATCA status but no UUID/hash was recorded', ex_missing_buyer_vat: 'Missing buyer VAT number', exd_missing_buyer_vat: 'Customer VAT ID empty on the invoice',
      ex_cn_no_return: 'Credit notes without original invoice', exd_cn_no_return: 'Return invoice with no "Return Against"', ex_cn_unresolved: 'Credit notes not cleared / reported', exd_cn_unresolved: 'Pending, Draft, Rejected or Overdue (all dates)',
      ex_zero_vat: 'Taxable invoices with zero VAT', exd_zero_vat: 'Net amount but no VAT - verify zero-rating / exemption', ex_rate_mismatch: 'VAT not equal to 15% of net', exd_rate_mismatch: 'Possible wrong rate, discount or mixed-rate lines',
      ex_no_status: 'Submitted invoices with no ZATCA status', exd_no_status: 'Typically before e-invoicing; confirm none belong to the e-invoicing period',
      f_status: 'Filing status', f_payment: 'Payment status', f_not_verified: 'NOT VERIFIED', f_forms: 'VAT Summary Forms overlapping this period', f_form_name: 'Form', f_form_period: 'Period', f_form_state: 'State',
      f_none: 'No VAT Summary Form overlaps this period.', f_note: 'A VAT Summary Form in ERP does not prove that a return was filed with ZATCA, and no ERP record links a payment to a filing. This dashboard therefore never shows a filing or payment as completed.',
      x_category: 'Exception', x_count: 'Count', x_amount: 'Amount', x_view: 'View documents', x_all_dates_tag: 'all dates', x_ok: 'None found', x_failed: 'Check failed',
      tx_none: 'All in-scope companies reconcile to their documents.', tx_reason: 'Reason',
      /* modal */
      d_title_vat: 'VAT detail', d_records: 'documents', d_all_dates: 'All dates (open backlog)', d_period: 'Selected period', d_company_drill: 'Click a company to drill into its records',
      d_view_invoices: 'View all sales invoices in scope', d_open_pi: 'Purchase Invoices in ERPNext'
    },
    ar: {
      err_truncated: 'وصلت النتيجة إلى الحد الآمن للصفوف، لذلك لا يُعرض الرقم (لأنه سيكون ناقصاً)',
      restricted: 'الوصول إلى هذه اللوحة مقصور على الأدوار: System Manager وCEO وInternal Controller وAccounts Manager وDashboard Manager.',
      x_run: 'تشغيل الفحص', x_scanning: 'جارٍ فحص الفواتير...', x_rate_not_run: 'شغّل الفحص أولاً (يفحص الفترة على دفعات محدودة).',
      x_rate_cap: 'لم يُحسب: عدد فواتير الفترة يتجاوز حد الفحص (3,000 فاتورة). ضيّق الفترة أو الشركة.', x_rate_done: 'تم فحص',
      x_unavail: 'غير متاح', arch_note: 'تُقرأ كل الأرقام مباشرة بصلاحياتك في ERPNext؛ ولا تُستخدم أي سكربتات خلفية.',
      cov_note: 'تغطية تقرير DM KSA VAT Report: تتم مطابقة النتائج مع فواتير البيع والشراء لكل شركة. تتم مطابقة كل شركة مع فواتير البيع والشراء، ولا تدخل في الإجماليات إلا الشركات المطابقة. الشركات غير الموثّقة تُعرض منفصلة ولا تُضاف أبداً إلى الأرقام المجمّعة.',
      eyebrow: 'مجموعة دي إم / المالية والامتثال', title: 'مركز قيادة ضريبة القيمة المضافة وزاتكا',
      subtitle: 'أرقام الإقرار الضريبي المباشرة والامتثال للفوترة الإلكترونية عبر شركاتك',
      f_company: 'الشركة', f_group: 'مجموعة التسجيل الضريبي', all_companies: 'كل الشركات', all_groups: 'كل المجموعات',
      p_today: 'اليوم', p_week: 'هذا الأسبوع', p_month: 'هذا الشهر', p_lastmonth: 'الشهر الماضي', p_quarter: 'هذا الربع', p_year: 'هذه السنة', p_custom: 'فترة مخصصة',
      f_from: 'تاريخ البداية', f_to: 'تاريخ النهاية', refresh: 'تحديث', refreshing: 'جارٍ التحديث...',
      last_refresh: 'آخر تحديث ناجح', never: 'لم يتم التحديث بعد', partial_fail: 'قسم/أقسام فشلت في آخر محاولة',
      c_owner: 'المالك', c_reason: 'السبب', noaccess: 'لا توجد صلاحية للوصول إلى', timeout: 'انتهت مهلة الطلب', tab_overview: 'نظرة عامة', tab_vat: 'الإقرارات الضريبية', tab_zatca: 'حالة زاتكا', tab_register: 'سجل الفواتير', tab_compliance: 'الامتثال والاستثناءات',
      scope: 'النطاق', period: 'الفترة', basis: 'الأساس: تاريخ الترحيل', all_permitted: 'كل الشركات المسموح بها', companies_n: 'شركات', vat_group_scope: 'مجموعة ضريبية',
      loading: 'جارٍ التحميل...', retry: 'إعادة المحاولة', close: 'إغلاق', details: 'التفاصيل', open_erp: 'فتح في ERPNext', open_report: 'فتح التقرير الأصلي',
      sar: 'ر.س', unavailable: 'غير متاح', unverified: 'غير موثّق', verified: 'موثّق', partial: 'جزئي',
      err_empty: 'أعاد الخادم استجابة فارغة.', err_section: 'تعذر تحميل هذا القسم', no_data: 'لا توجد سجلات للنطاق والفترة المحددين.',
      k_taxable: 'المبيعات الخاضعة للضريبة', k_taxable_sub: 'بعد خصم إشعارات الدائن، تقرير ضريبة المملكة', k_output: 'ضريبة المخرجات', k_output_sub: 'ضريبة المبيعات، تقرير ضريبة المملكة',
      k_input: 'ضريبة المدخلات', k_input_sub: 'ضريبة المشتريات والمصروفات، تقرير ضريبة المملكة', k_net_pay: 'صافي الضريبة المستحقة', k_net_ref: 'صافي الضريبة المستردة', k_net: 'صافي الضريبة المستحقة / المستردة',
      k_net_sub: 'ضريبة المخرجات ناقص ضريبة المدخلات', k_verified_of: 'شركات موثّقة', k_not_verified: 'غير موثّق - راجع تبويب الإقرارات الضريبية',
      k_total: 'إجمالي فواتير زاتكا', k_total_sub: 'فواتير مرحّلة لها حالة زاتكا', k_cleared: 'تم التخليص', k_cleared_w: 'تم التخليص مع تحذيرات',
      k_cleared_w_sub: 'مقبولة لكن التحذيرات تحتاج مراجعة', k_pending: 'الفواتير المعلّقة', k_pending_sub: 'المتراكم المفتوح لكل التواريخ', k_rejected: 'مرفوضة / فاشلة',
      k_rejected_sub: 'مرفوضة + متأخرة (لا توجد حالة "فاشلة")', k_reported: 'تم الإبلاغ', k_reported_w: 'تم الإبلاغ مع تحذيرات', k_overdue: 'متأخرة', k_failed: 'فاشلة',
      k_failed_sub: 'ليست حالة في نظام الربط المثبّت', k_draft: 'مسودة (فواتير مرحّلة)', k_draft_sub: 'مرحّلة ولم تُرسل أبداً', k_other: 'حالة أخرى / غير معروفة',
      k_other_sub: 'قيمة غير موجودة في قائمة النظام', k_nostatus: 'بدون حالة زاتكا', k_nostatus_sub: 'غالباً فواتير قبل الفوترة الإلكترونية', k_cancelled: 'ملغاة (مستبعدة)',
      k_draft_unsub: 'مسودات غير مرحّلة (مستبعدة)', invoices: 'فاتورة',
      s_vat_kpis: 'الموقف الضريبي', s_zatca_kpis: 'الفوترة الإلكترونية - زاتكا', s_alerts: 'تنبيهات الامتثال للضريبة وزاتكا', s_attention: 'يحتاج إلى اهتمام',
      s_out_in: 'ضريبة المخرجات مقابل المدخلات', s_out_in_sub: 'لكل شركة، تقرير ضريبة المملكة (الشركات الموثّقة فقط)', s_trend: 'اتجاه الضريبة الشهري', s_trend_sub: 'مبني على المستندات (فواتير البيع والشراء)؛ الإقرار نفسه من تقرير ضريبة المملكة',
      s_status_dist: 'توزيع حالات زاتكا', s_compare: 'مقارنة الشركات', s_groups: 'مجموعات التسجيل الضريبي', s_breakdown: 'التفصيل الكامل لتقرير الضريبة', s_recon: 'المطابقة: التقرير مقابل المستندات',
      s_unavail: 'غير قابلة للتوزيع على الشركات', s_status_cards: 'أعداد الحالات', s_monthly_status: 'الحالات حسب الشهر', s_ageing: 'أعمار الفواتير المعلّقة', s_by_company: 'الحالات حسب الشركة',
      s_timestamps: 'أوقات الإبلاغ / التخليص', s_warnings: 'تفاصيل التحذيرات', s_rejected_list: 'الفواتير المرفوضة والمتأخرة', s_pending_list: 'أقدم الفواتير المعلّقة', s_meanings: 'معاني الحالات',
      s_exceptions: 'الاستثناءات', s_filing: 'التحقق من تقديم الإقرار وسداد الضريبة', s_tax_recon: 'مشكلات مطابقة الضريبة', s_register: 'فواتير المبيعات',
      al_none: 'لا توجد تنبيهات نشطة لهذا النطاق.', al_unrecon: 'تقرير الضريبة غير مطابق لـ', al_unrecon_sub: 'تقرير ضريبة المملكة لا يتفق مع المستندات، لذلك استُبعدت هذه الأرقام من الإجماليات.',
      al_backlog: 'فواتير زاتكا معلّقة منذ أكثر من 7 أيام', al_backlog_sub: 'متراكم مفتوح لكل التواريخ. أقدم تاريخ ترحيل:', al_rejected: 'فواتير زاتكا مرفوضة أو متأخرة',
      al_warn_pct: 'نسبة التخليص مع تحذيرات', al_warn_pct_sub: 'من فواتير زاتكا في هذه الفترة - "تم التخليص مع تحذيرات" مقبولة لدى زاتكا لكنها ليست امتثالاً خالياً من الأخطاء.',
      al_filing: 'تقديم الإقرار والسداد غير موثّقين', al_filing_sub: 'لا يوجد سجل موثوق في النظام يثبت تقديم الإقرار أو سداده لهذه الفترة.',
      al_report_bug: 'تقرير "Sales Invoices and Zatca" يتجاهل فلتر الشركة', al_report_bug_sub: 'هذه اللوحة تقرأ فواتير المبيعات مباشرة حسب الشركة؛ لا تستخدم ذلك التقرير لأعداد الشركات.',
      al_missing: 'فواتير زاتكا ينقصها UUID / التجزئة / رمز QR', al_cn: 'إشعارات دائن بها مشكلات',
      v_scope_total: 'مجموع الشركات الموثّقة', v_compare_prev: 'مقارنة بالفترة السابقة', v_prev: 'الفترة السابقة', v_delta: 'التغيّر',
      v_taxable_base: 'الوعاء الخاضع', v_adjust: 'التسويات (المرتجعات)', v_vat: 'الضريبة', v_section: 'القسم', v_line: 'البند', v_company: 'الشركة', v_net: 'صافي الضريبة', v_status: 'الحالة',
      v_sales_vat: 'ضريبة المخرجات (التقرير)', v_si_vat: 'ضريبة فواتير المبيعات', v_diff: 'الفرق', v_purch_vat: 'ضريبة المدخلات - مشتريات قياسية (التقرير)', v_pi_vat: 'ضريبة فواتير الشراء',
      v_group_tax: 'الرقم الضريبي', v_group_members: 'الشركات', v_group_note: 'إجماليات المجموعة تجميع داخلي لأرقام دفاتر كل شركة وليست إقراراً ضريبياً مجمّعاً مقدّماً رسمياً. الشركات التي تشترك في رقم ضريبي تُجمع مرة واحدة لكل شركة دون ازدواج. فواتير ما بين الشركات لا تُستبعد.',
      v_view_companies: 'حسب الشركة', v_view_groups: 'حسب المجموعة الضريبية', v_base_note: 'تقرير DM KSA VAT Report: مبلغ المبيعات صافٍ بالفعل من المرتجعات، والتسويات للعرض فقط ولا تخصم مرة أخرى.',
      v_native_report: 'فتح تقرير DM KSA VAT Report', v_unavail_foreign: 'المشتريات الأجنبية (التقرير المُعدّ "VAT Report - Purchase Foreign")', v_unavail_expense: 'ضريبة المصروفات (التقرير المُعدّ "VAT Report - Expense")',
      v_unavail_why: 'هذه التقارير المُعدّة مسبقاً لا تحتوي على حقل الشركة، فلا يمكن نسبتها إلى شركة. بنود تقرير ضريبة المملكة المنسوبة للشركة (الاستيراد بالاحتساب العكسي، رسوم الجمارك، المصروفات بالضريبة) ظاهرة في التفصيل أعلاه.',
      v_intercompany: 'فواتير ما بين الشركات', v_no_verified: 'لا توجد شركة مطابقة في هذا النطاق، لذلك لا يُعرض رقم مجمّع.',
      v_sales_ok: 'ضريبة المخرجات تتفق مع فواتير المبيعات', v_status_reconciled: 'مطابق', v_status_mismatch: 'غير مطابق', v_status_not_covered: 'غير مشمول بالتقرير', v_status_error: 'خطأ في التقرير', v_status_unverified: 'غير موثّق',
      v_tol: 'هامش السماح', v_loading_company: 'جارٍ تحميل الشركة...', v_net_unverified: 'لا يمكن تأكيد صافي الضريبة',
      z_total_inv: 'إجمالي الفواتير', z_by_status: 'حسب الحالة', z_all_dates: 'كل التواريخ', z_oldest: 'الأقدم', z_ageing_note: 'تشمل الأعمار كل الفواتير المعلّقة والمسودات العالقة بغض النظر عن الفترة المحددة.',
      z_last_clear: 'آخر وقت تخليص', z_last_report: 'آخر وقت إبلاغ', z_cleared_nots: 'تم تخليصها بدون ختم وقت التخليص', z_reported_nots: 'تم الإبلاغ عنها بدون ختم وقت الإبلاغ',
      z_load_warn: 'تحميل تفاصيل التحذيرات', z_warn_none: 'لا توجد تحذيرات في هذا النطاق والفترة.', z_warn_count: 'الفواتير', z_status_note: 'تُقرأ الحالات من الحقل "zatca_status" في فاتورة المبيعات الذي يكتبه تطبيق زاتكا المثبّت.',
      m_cleared: 'تم التخليص: قبلتها زاتكا عبر التخليص دون تحذيرات.', m_cleared_w: 'تم التخليص مع تحذيرات: مقبولة لكن زاتكا أعادت تحذيرات (مثل بيانات المشتري). يجب مراجعتها - هذا ليس امتثالاً خالياً من الأخطاء.',
      m_reported: 'تم الإبلاغ: فاتورة مبسّطة أُبلغ عنها لزاتكا.', m_reported_w: 'تم الإبلاغ مع تحذيرات: أُبلغ عنها مع تحذيرات للمراجعة.', m_pending: 'معلّقة: مرحّلة في النظام ولم تُخلّص أو يُبلغ عنها بعد.',
      m_rejected: 'مرفوضة: رفضتها زاتكا ويجب تصحيحها وإعادة إرسالها.', m_overdue: 'متأخرة: انتهت مهلة الإرسال دون قبول.', m_draft: 'مسودة: عند ظهورها على فاتورة مرحّلة فهذا يعني أنها لم تُرسل أبداً.',
      m_cancelled: 'ملغاة: أُلغيت في النظام.', m_failed: 'فاشلة: لا توجد هذه الحالة في الربط المثبّت؛ الإخفاقات تظهر كمرفوضة أو متأخرة أو تبقى معلّقة.',
      st_Draft: 'مسودة', st_Pending: 'معلّقة', st_Reported: 'تم الإبلاغ', st_Cleared: 'تم التخليص', 'st_Reported with warnings': 'تم الإبلاغ مع تحذيرات', 'st_Cleared with warnings': 'تم التخليص مع تحذيرات',
      st_Rejected: 'مرفوضة', st_Overdue: 'متأخرة', st_Cancelled: 'ملغاة', st___none__: 'بدون حالة زاتكا', st_other: 'أخرى / غير معروفة',
      r_search: 'ابحث برقم الفاتورة أو العميل', r_status: 'حالة زاتكا', r_all_status: 'كل الحالات', r_page_size: 'الصفوف في الصفحة', r_showing: 'عرض', r_of: 'من', r_page: 'صفحة', r_prev: 'السابق', r_next: 'التالي',
      c_invoice: 'رقم الفاتورة', c_customer: 'العميل', c_company: 'الشركة', c_date: 'تاريخ الترحيل', c_type: 'نوع الفاتورة', c_taxable: 'المبلغ الخاضع', c_vat: 'مبلغ الضريبة', c_total: 'الإجمالي',
      c_status: 'حالة زاتكا', c_time: 'وقت الإبلاغ / التخليص', c_action: 'إجراء', c_warning: 'تحذير', c_clearing: 'تخليص', c_reporting: 'إبلاغ', t_invoice: 'فاتورة ضريبية', t_credit: 'إشعار دائن',
      ex_pending_all: 'فواتير زاتكا المعلّقة', exd_pending_all: 'مرحّلة ولم تُخلّص أو يُبلغ عنها (كل التواريخ)', ex_stuck_draft: 'فواتير مرحّلة بحالة زاتكا مسودة', exd_stuck_draft: 'لم تُرسل أبداً (كل التواريخ)',
      ex_rejected_all: 'عمليات إرسال مرفوضة أو متأخرة', exd_rejected_all: 'رفضتها زاتكا أو فاتت المهلة (كل التواريخ)', ex_warnings: 'مخلّصة / مبلّغ عنها مع تحذيرات', exd_warnings: 'مقبولة لكن التحذيرات تحتاج مراجعة',
      ex_missing_uuid: 'بيانات زاتكا ناقصة (UUID)', exd_missing_uuid: 'لها حالة زاتكا ولكن لم يُسجّل UUID/التجزئة', ex_missing_buyer_vat: 'الرقم الضريبي للمشتري ناقص', exd_missing_buyer_vat: 'الرقم الضريبي للعميل فارغ في الفاتورة',
      ex_cn_no_return: 'إشعارات دائن بدون فاتورة أصلية', exd_cn_no_return: 'فاتورة مرتجع بلا "مرتجع مقابل"', ex_cn_unresolved: 'إشعارات دائن لم تُخلّص / يُبلغ عنها', exd_cn_unresolved: 'معلّقة أو مسودة أو مرفوضة أو متأخرة (كل التواريخ)',
      ex_zero_vat: 'فواتير خاضعة بضريبة صفرية', exd_zero_vat: 'مبلغ صافٍ بدون ضريبة - تحقق من النسبة الصفرية / الإعفاء', ex_rate_mismatch: 'الضريبة لا تساوي 15% من الصافي', exd_rate_mismatch: 'احتمال نسبة خاطئة أو خصم أو بنود بنسب مختلطة',
      ex_no_status: 'فواتير مرحّلة بدون حالة زاتكا', exd_no_status: 'غالباً قبل الفوترة الإلكترونية؛ تأكد أنها لا تخص فترة الفوترة الإلكترونية',
      f_status: 'حالة تقديم الإقرار', f_payment: 'حالة السداد', f_not_verified: 'غير موثّق', f_forms: 'نماذج ملخص الضريبة المتداخلة مع هذه الفترة', f_form_name: 'النموذج', f_form_period: 'الفترة', f_form_state: 'الحالة',
      f_none: 'لا يوجد نموذج ملخص ضريبة متداخل مع هذه الفترة.', f_note: 'وجود نموذج ملخص ضريبة في النظام لا يثبت تقديم الإقرار لدى زاتكا، ولا يوجد سجل يربط السداد بالإقرار. لذلك لا تعرض هذه اللوحة أي إقرار أو سداد على أنه مكتمل.',
      x_category: 'الاستثناء', x_count: 'العدد', x_amount: 'المبلغ', x_view: 'عرض المستندات', x_all_dates_tag: 'كل التواريخ', x_ok: 'لا يوجد', x_failed: 'فشل الفحص',
      tx_none: 'كل الشركات ضمن النطاق مطابقة لمستنداتها.', tx_reason: 'السبب',
      d_title_vat: 'تفاصيل الضريبة', d_records: 'مستند', d_all_dates: 'كل التواريخ (متراكم مفتوح)', d_period: 'الفترة المحددة', d_company_drill: 'اضغط على شركة لعرض سجلاتها',
      d_view_invoices: 'عرض كل فواتير المبيعات ضمن النطاق', d_open_pi: 'فواتير الشراء في ERPNext'
    }
  };

  /* ------------------------------------------------------------------ state */
  var S = {
    lang: 'en', tab: 'overview', run: 0, busy: false, meta: null,
    f: { company: '', group: '', preset: 'month', from: '', to: '' },
    sec: {}, vat: {}, vatPrev: {}, compare: false, vatView: 'companies',
    zatca: null, trend: null, filing: null, exc: null, warn: null, rejList: null, pendList: null, pendPage: 1, pendId: 0,
    lastOk: null, lastAttempt: null, failed: 0,
    rate: null, reg: { search: '', status: '', page: 1, ps: 25, sort: 'posting_date', dir: 'desc', data: null, st: 'idle', err: '' },
    M: null, regId: 0, modalId: 0
  };
  try { var sv = window.localStorage.getItem('vz_lang'); if (sv === 'ar' || sv === 'en') { S.lang = sv; } } catch (e) { /* storage unavailable */ }

  function t(k) { var d = I18N[S.lang]; return (d && d[k] !== undefined) ? d[k] : ((I18N.en[k] !== undefined) ? I18N.en[k] : k); }

  /* ------------------------------------------------------------------ utils */
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var NF = {};
  function fmt(n, d) {
    d = (d === undefined) ? 2 : d;
    if (n === null || n === undefined || isNaN(n)) { return '-'; }
    if (!NF[d]) { NF[d] = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
    return NF[d].format(n);
  }
  function num(n, d) { return '<span class="num">' + esc(fmt(n, d)) + '</span>'; }
  function money(n) { return '<span class="num">' + esc(fmt(n, 2)) + '</span>'; }
  function compact(n) {
    var a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e6) { return s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M'; }
    if (a >= 1e3) { return s + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K'; }
    return s + Math.round(a);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
  function periodRange(p) {
    var n = new Date(), y = n.getFullYear(), m = n.getMonth(), d = n.getDate(), a, b;
    if (p === 'today') { a = b = new Date(y, m, d); }
    else if (p === 'week') { a = addDays(new Date(y, m, d), -n.getDay()); b = addDays(a, 6); }
    else if (p === 'month') { a = new Date(y, m, 1); b = new Date(y, m + 1, 0); }
    else if (p === 'lastmonth') { a = new Date(y, m - 1, 1); b = new Date(y, m, 0); }
    else if (p === 'quarter') { var q = Math.floor(m / 3) * 3; a = new Date(y, q, 1); b = new Date(y, q + 3, 0); }
    else if (p === 'year') { a = new Date(y, 0, 1); b = new Date(y, 11, 31); }
    else { return null; }
    return { from: ymd(a), to: ymd(b) };
  }
  function prevRange(from, to) {
    var len = daysBetween(from, to) + 1;
    var pt = addDays(parseYmd(from), -1), pf = addDays(pt, -(len - 1));
    return { from: ymd(pf), to: ymd(pt) };
  }
  function htmlToText(h) {
    if (!h) { return ''; }
    var s = String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n');
    var doc = new DOMParser().parseFromString(s, 'text/html');
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }
  function fmtTime(s) { return s ? String(s).slice(0, 19).replace('T', ' ') : ''; }

  var STATUS_ORDER = ['Cleared', 'Cleared with warnings', 'Reported', 'Reported with warnings', 'Pending', 'Rejected', 'Overdue', 'Draft', 'Cancelled'];
  var STATUS_COLOR = { 'Cleared': '#15803d', 'Cleared with warnings': '#d9a400', 'Reported': '#2563eb', 'Reported with warnings': '#7aa7f0', 'Pending': '#f08c00',
    'Rejected': '#b42318', 'Overdue': '#7c1d12', 'Draft': '#6b7686', 'Cancelled': '#a9b2bf', '__none__': '#cbd2dc', 'other': '#6d4bd0' };
  var STATUS_TONE = { 'Cleared': 'green', 'Cleared with warnings': 'amber', 'Reported': 'blue', 'Reported with warnings': 'amber', 'Pending': 'amber', 'Rejected': 'red',
    'Overdue': 'red', 'Draft': 'grey', 'Cancelled': 'grey', '': 'grey' };
  function stLabel(s) { var k = 'st_' + (s === '' || s === null || s === undefined ? '__none__' : s); return (I18N.en[k] !== undefined) ? t(k) : (s || t('st___none__')); }
  function stBadge(s) {
    var tone = STATUS_TONE[s || ''] || 'violet';
    return '<span class="vz-badge b-' + tone + '">' + esc(stLabel(s || '')) + '</span>';
  }
  function invLink(name) { return '/app/sales-invoice/' + encodeURIComponent(name); }

  /* ------------------------------------------------------------------ API */
  function errText(x) {
    try {
      var j = x && (x.responseJSON || (x.responseText && JSON.parse(x.responseText)));
      if (j && j._server_messages) {
        var arr = JSON.parse(j._server_messages), out = [];
        arr.forEach(function (m) { try { out.push(htmlToText(JSON.parse(m).message)); } catch (e) { out.push(String(m)); } });
        if (out.length) { return out.join(' ').slice(0, 400); }
      }
      if (j && j.exception) { return String(j.exception).split('\n').pop().slice(0, 300); }
      if (x && x.status) { return 'HTTP ' + x.status; }
    } catch (e) { /* ignore */ }
    return (x && x.message) ? x.message : 'Request failed';
  }
  function scopeArgs() { return { company: S.f.company, vat_group: S.f.group, from_date: S.f.from, to_date: S.f.to }; }
  function scopeCompanies() {
    if (!S.meta) { return []; }
    var all = S.meta.companies.map(function (c) { return c.name; });
    if (S.f.company) { return all.indexOf(S.f.company) >= 0 ? [S.f.company] : []; }
    if (S.f.group) {
      var g = S.meta.vat_groups.filter(function (x) { return x.tax_id === S.f.group; })[0];
      return g ? g.companies.slice() : [];
    }
    return all.sort();
  }
  function pool(items, limit, worker) {
    var i = 0, running = 0;
    return new Promise(function (resolve) {
      if (!items.length) { resolve(); return; }
      function next() {
        while (running < limit && i < items.length) {
          (function (it) { running++; worker(it).then(done, done); })(items[i++]);
        }
        if (running === 0 && i >= items.length) { resolve(); }
      }
      function done() { running--; next(); }
      next();
    });
  }

  /* ================================================================== DATA LAYER
     Standard Frappe client endpoints only, always as the logged-in user:
       frappe.client.get_list            (permission enforced: role perms + User Permissions)
       frappe.desk.query_report.run      (native report; report role check enforced)
     No Server Script, no custom API, no raw SQL. Group queries are strict: if a result
     reaches the safe row cap it is rejected instead of being shown as a complete total. */
  var KSA_REPORT = 'DM KSA VAT Report', VAT_RATE = 15, TOL = 5, MAX_DAYS = 400, GROUP_CAP = 5000, SCAN_CAP = 3000, SCAN_PAGE = 500, PAGE_MAX = 100;
  var STATUSES = ['Draft', 'Pending', 'Reported', 'Cleared', 'Reported with warnings', 'Cleared with warnings', 'Rejected', 'Overdue', 'Cancelled'];
  var ALL_DATES_PRESETS = ['pending_all', 'stuck_draft', 'rejected_all', 'cn_unresolved'];
  var EXC_PRESETS = ['pending_all', 'stuck_draft', 'rejected_all', 'warnings', 'missing_uuid', 'missing_buyer_vat', 'cn_no_return', 'cn_unresolved', 'zero_vat', 'no_status'];
  var REG_FIELDS = ['name', 'customer', 'customer_name', 'company', 'posting_date', 'is_return', 'base_net_total', 'base_total_taxes_and_charges', 'base_grand_total',
    'zatca_status', 'custom_clearing_to_zatka_time', 'custom_reporting_to_zatka_time', 'return_against', 'owner'];

  var REQ_TIMEOUT = 90000;
  function permMsg(method, args) { return t('noaccess') + ' ' + ((args && (args.report_name || args.doctype)) || method); }
  /* Direct, silent API call: never raises a Frappe popup, always settles (timeout), and turns
     permission failures into an inline "No access to <X>" message shown by the section. */
  function callMethod(method, args) {
    return new Promise(function (resolve, reject) {
      var done = false, ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { if (done) { return; } done = true; if (ctl) { try { ctl.abort(); } catch (x) { /* ignore */ } } reject(new Error(t('timeout'))); }, REQ_TIMEOUT);
      var body = new URLSearchParams();
      Object.keys(args || {}).forEach(function (k) { var v = args[k]; body.append(k, (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v)); });
      fetch('/api/method/' + method, { method: 'POST', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined,
        headers: { 'X-Frappe-CSRF-Token': (window.frappe && frappe.csrf_token) || '', 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() })
        .then(function (r) { return r.text().then(function (txt) { return { r: r, txt: txt }; }); })
        .then(function (o) {
          if (done) { return; } done = true; clearTimeout(timer);
          var j = null; try { j = JSON.parse(o.txt); } catch (x) { /* ignore */ }
          if (o.r.ok && j && !j.exc) {
            if (j.message !== undefined && j.message !== null) { resolve(j.message); } else { reject(new Error(t('err_empty'))); }
            return;
          }
          var ex = String((j && (j.exception || j.exc_type)) || '');
          if (o.r.status === 401 || o.r.status === 403 || /permission/i.test(ex)) { var e = new Error(permMsg(method, args)); e.perm = true; reject(e); return; }
          reject(new Error(errText({ status: o.r.status, responseJSON: j })));
        })
        .catch(function (err) { if (done) { return; } done = true; clearTimeout(timer); reject(new Error((err && err.message) || 'Network error')); });
    });
  }
  /* o: {limit,start,group_by,order_by,or_filters,strict} */
  function gl(doctype, fields, filters, o) {
    o = o || {};
    var lim = o.limit || GROUP_CAP, a = { doctype: doctype, fields: fields, filters: filters, limit_page_length: lim };
    if (o.group_by) { a.group_by = o.group_by; }
    if (o.order_by) { a.order_by = o.order_by; }
    if (o.or_filters && o.or_filters.length) { a.or_filters = o.or_filters; }
    if (o.start) { a.limit_start = o.start; }
    return callMethod('frappe.client.get_list', a).then(function (rows) {
      if (o.strict && rows.length >= lim) { throw new Error(t('err_truncated') + ' (' + lim + ')'); }
      return rows;
    });
  }
  function r2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
  function f0(x) { return Number(x) || 0; }
  function mapRow(r) {
    var w = r.custom_zatca_warnings, ct = r.custom_clearing_to_zatka_time, rt = r.custom_reporting_to_zatka_time;
    return { name: r.name, customer: r.customer, customer_name: r.customer_name, company: r.company, posting_date: String(r.posting_date),
      invoice_type: r.is_return ? 'Credit Note' : 'Tax Invoice', taxable: r2(r.base_net_total), vat: r2(r.base_total_taxes_and_charges), grand_total: r2(r.base_grand_total),
      zatca_status: r.zatca_status || '', zatca_time: ct || rt || '', time_kind: ct ? 'clearing' : (rt ? 'reporting' : ''), return_against: r.return_against || '', owner: r.owner || '', warnings: w ? String(w).slice(0, 600) : '' };
  }
  function checkDates(a) {
    if (!a.from_date || !a.to_date) { throw new Error('from_date and to_date are required.'); }
    if (a.from_date > a.to_date) { throw new Error('Start date must be on or before end date.'); }
    if (daysBetween(a.from_date, a.to_date) > MAX_DAYS) { throw new Error('Select a period of ' + MAX_DAYS + ' days or less.'); }
  }
  function siBase(a, withDates) {
    var f = [['company', 'in', a.scope], ['docstatus', '=', 1]];
    if (withDates) { f.push(['posting_date', 'between', [a.from_date, a.to_date]]); }
    return f;
  }

  /* ---- meta */
  function engMeta() {
    return gl('Company', ['name', 'tax_id', 'default_currency', 'abbr'], [], { limit: 501, strict: true }).then(function (rows) {
      var comps = rows.map(function (c) { return { name: c.name, tax_id: c.tax_id || '', currency: c.default_currency || 'SAR', abbr: c.abbr || '' }; })
        .sort(function (x, y) { return x.name < y.name ? -1 : 1; });
      var groups = {};
      comps.forEach(function (c) { (groups[c.tax_id] = groups[c.tax_id] || []).push(c.name); });
      return { user: frappe.session.user, companies: comps, vat_groups: Object.keys(groups).sort().map(function (k) { return { tax_id: k, companies: groups[k] }; }), can_run_ksa_vat_report: true, vat_rate: VAT_RATE };
    });
  }

  /* ---- VAT per company: native report + independent document cross-check */
  function parseKsa(rep) {
    var ksa = { ok: false, error: null, rows: [] };
    if (rep && rep.result) {
      ksa.ok = true; var section = 'sales';
      rep.result.forEach(function (r) {
        if (r.title === 'VAT on Purchases') { section = 'purchases'; }
        ksa.rows.push({ section: section, title: r.title || '', amount: r2(r.amount), adjustment: r2(r.adjustment !== undefined ? r.adjustment : r.adjustment_amount), vat: r2(r.vat_amount),
          header: ((r.amount === null || r.amount === undefined || r.amount === '') && (r.vat_amount === null || r.vat_amount === undefined || r.vat_amount === '')) });
      });
    } else { ksa.error = 'Report returned no result (it may be running as a prepared report).'; }
    return ksa;
  }
  function engVat(a) {
    checkDates(a);
    var comp = a.company, from = a.from_date, to = a.to_date;
    var base = [['company', '=', comp], ['docstatus', '=', 1], ['posting_date', 'between', [from, to]]];
    var ksaP = callMethod('frappe.desk.query_report.run', { report_name: KSA_REPORT, filters: { company: comp, from_date: from, to_date: to } }).then(parseKsa,
      function (e) { return { ok: false, error: 'DM KSA VAT Report failed: ' + e.message, rows: [] }; });
    var siP = gl('Sales Invoice', ['is_return', 'count(name) as n', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax'], base, { group_by: 'is_return', limit: 10, strict: true })
      .then(function (g) {
        var si = { invoices: 0, credit_notes: 0, net_invoices: 0, vat_invoices: 0, net_credit_notes: 0, vat_credit_notes: 0 };
        g.forEach(function (x) {
          if (x.is_return) { si.credit_notes = x.n; si.net_credit_notes = f0(x.net); si.vat_credit_notes = f0(x.tax); } else { si.invoices = x.n; si.net_invoices = f0(x.net); si.vat_invoices = f0(x.tax); }
        });
        si.net_total = r2(si.net_invoices + si.net_credit_notes); si.vat_total = r2(si.vat_invoices + si.vat_credit_notes);
        ['net_invoices', 'vat_invoices', 'net_credit_notes', 'vat_credit_notes'].forEach(function (k) { si[k] = r2(si[k]); });
        return gl('Sales Invoice', ['count(name) as n', 'sum(base_total_taxes_and_charges) as tax'], base.concat([['is_internal_customer', '=', 1]]), { limit: 1 }).then(function (ig) {
          si.intercompany_invoices = ig.length ? ig[0].n : 0; si.intercompany_vat = ig.length ? r2(ig[0].tax) : 0; return si;
        });
      }).then(null, function (e) { return { error: e.message }; });
    var piP = gl('Purchase Invoice', ['is_return', 'count(name) as n', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax'], base, { group_by: 'is_return', limit: 10, strict: true })
      .then(function (g) {
        var pi = { invoices: 0, debit_notes: 0, net_total: 0, vat_total: 0 };
        g.forEach(function (x) { if (x.is_return) { pi.debit_notes = x.n; } else { pi.invoices = x.n; } pi.net_total += f0(x.net); pi.vat_total += f0(x.tax); });
        pi.net_total = r2(pi.net_total); pi.vat_total = r2(pi.vat_total); return pi;
      }).then(null, function (e) { return { error: e.message }; });
    return Promise.all([ksaP, siP, piP]).then(function (x) {
      var ksa = x[0], si = x[1], pi = x[2];
      var res = { company: comp, from_date: from, to_date: to, ksa: ksa };
      var k = { sales_base: 0, sales_adj: 0, output_vat: 0, customs: 0, import_rc: 0, purch_base: 0, purch_vat: 0, exp_base: 0, exp_vat: 0, input_total_base: 0, input_vat: 0, difference: 0 }, foundDiff = false;
      ksa.rows.forEach(function (r) {
        var tt = r.title;
        if (r.section === 'sales' && tt.indexOf('Standard rated sales') === 0) { k.sales_base = r.amount; k.sales_adj = r.adjustment; k.output_vat = r.vat; }
        else if (tt.indexOf('Custom and Clearing') === 0) { k.customs = r.amount; }
        else if (tt.indexOf('Import subject to VAT') === 0) { k.import_rc = r.amount; }
        else if (tt.indexOf('Standard rated purchases') === 0) { k.purch_base = r.amount; k.purch_vat = r.vat; }
        else if (tt.indexOf('Expenses with VAT') === 0) { k.exp_base = r.amount; k.exp_vat = r.vat; }
        else if (r.section === 'purchases' && tt.indexOf('Grand Total') === 0) { k.input_total_base = r.amount; k.input_vat = r.vat; }
        else if (tt.indexOf('Difference') === 0) { k.difference = r.vat; foundDiff = true; }
      });
      // DM KSA VAT Report's Amount is already net of returns; adjustment is for display only.
       k.taxable_sales_net_of_returns = r2(k.sales_base);
      res.ksa_summary = k;
      var siOk = si && !si.error, piOk = pi && !pi.error;
      res.documents = { sales_invoice: siOk ? si : null, purchase_invoice: piOk ? pi : null, sales_invoice_error: siOk ? null : (si && si.error), purchase_invoice_error: piOk ? null : (pi && pi.error) };
      var v = { status: 'unverified', sales_check: null, purchase_check: null, reasons: [] };
      if (!ksa.ok) { v.status = 'error'; v.reasons.push(ksa.error); }
      else {
        var salesOk = null, purchOk = null;
        if (!siOk) { v.reasons.push('Sales Invoices could not be read (' + (si && si.error) + ') - output VAT could not be cross-checked.'); }
        else {
          var d = r2(k.output_vat - si.vat_total); salesOk = Math.abs(d) <= TOL; v.sales_check = { report: k.output_vat, documents: si.vat_total, difference: d, ok: salesOk };
          if (!salesOk) {
            v.reasons.push(k.output_vat === 0 && si.vat_total !== 0 ? 'DM KSA VAT Report shows no output VAT for this company, but Sales Invoices carry VAT of ' + si.vat_total + '. The report does not appear to cover this company.' : 'Output VAT differs from Sales Invoice VAT by ' + d + '.');
          }
        }
        if (!piOk) { v.reasons.push('Purchase Invoices could not be read (' + (pi && pi.error) + ') - input VAT could not be cross-checked.'); }
        else {
          var d2 = r2(k.purch_vat - pi.vat_total); purchOk = Math.abs(d2) <= TOL; v.purchase_check = { report: k.purch_vat, documents: pi.vat_total, difference: d2, ok: purchOk };
          if (!purchOk) {
            v.reasons.push(k.purch_vat === 0 && pi.vat_total !== 0 ? 'DM KSA VAT Report shows no purchase VAT for this company, but Purchase Invoices carry VAT of ' + pi.vat_total + '.' : 'Standard-rated purchase VAT differs from Purchase Invoice VAT by ' + d2 + '.');
          }
        }
        if (salesOk === true && purchOk === true) { v.status = 'reconciled'; }
        else if (salesOk === false || purchOk === false) { v.status = (k.output_vat === 0 && k.purch_vat === 0) ? 'not_covered' : 'mismatch'; }
        var calc = r2(k.output_vat - k.input_vat);
        if (foundDiff && Math.abs(calc - k.difference) > 0.05) { v.reasons.push('Report difference (' + k.difference + ') is not output minus input (' + calc + ').'); if (v.status === 'reconciled') { v.status = 'mismatch'; } }
      }
      res.verdict = v;
      res.net_vat = { value: r2(k.output_vat - k.input_vat), verified: v.status === 'reconciled', label: (k.output_vat - k.input_vat) >= 0 ? 'Payable' : 'Refundable' };
      return res;
    });
  }

  /* ---- monthly document-based trend */
  function engTrend(a) {
    checkDates(a);
    var base = siBase(a, true), months = {};
    function mrow(m) { return months[m] || (months[m] = { month: m, sales_net: 0, output_vat: 0, invoices: 0, purchase_net: 0, input_vat: 0 }); }
    var res = { basis: 'documents', months: [] };
    var sP = gl('Sales Invoice', ['posting_date', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax', 'count(name) as n'], base, { group_by: 'posting_date', strict: true })
      .then(function (g) { g.forEach(function (x) { var r = mrow(String(x.posting_date).slice(0, 7)); r.sales_net += f0(x.net); r.output_vat += f0(x.tax); r.invoices += x.n; }); }, function (e) { res.sales_error = e.message; });
    var pP = gl('Purchase Invoice', ['posting_date', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax'], [['company', 'in', a.scope], ['docstatus', '=', 1], ['posting_date', 'between', [a.from_date, a.to_date]]], { group_by: 'posting_date', strict: true })
      .then(function (g) { g.forEach(function (x) { var r = mrow(String(x.posting_date).slice(0, 7)); r.purchase_net += f0(x.net); r.input_vat += f0(x.tax); }); }, function (e) { res.purchase_error = e.message; });
    return Promise.all([sP, pP]).then(function () {
      if (res.sales_error && res.purchase_error) { throw new Error(res.sales_error); }
      Object.keys(months).sort().forEach(function (m) { var r = months[m]; ['sales_net', 'output_vat', 'purchase_net', 'input_vat'].forEach(function (k) { r[k] = r2(r[k]); }); r.net_vat = r2(r.output_vat - r.input_vat); res.months.push(r); });
      return res;
    });
  }

  /* ---- ZATCA summary (Sales Invoice, actual company field) */
  function bucketFilters(today, i) {
    var d = function (n) { return ymd(addDays(parseYmd(today), -n)); };
    if (i === 0) { return [['posting_date', '>=', d(1)]]; }
    if (i === 1) { return [['posting_date', 'between', [d(3), d(2)]]]; }
    if (i === 2) { return [['posting_date', 'between', [d(7), d(4)]]]; }
    if (i === 3) { return [['posting_date', 'between', [d(30), d(8)]]]; }
    if (i === 4) { return [['posting_date', 'between', [d(90), d(31)]]]; }
    return [['posting_date', '<', d(90)]];
  }
  function engZatca(a) {
    checkDates(a);
    var today = ymd(new Date()), base = [['company', 'in', a.scope], ['posting_date', 'between', [a.from_date, a.to_date]]];
    var res = { from_date: a.from_date, to_date: a.to_date, status_note: 'x' };
    var main = gl('Sales Invoice', ['company', 'zatca_status', 'count(name) as n', 'sum(base_grand_total) as gt', 'sum(base_total_taxes_and_charges) as tax'], base.concat([['docstatus', '=', 1]]), { group_by: 'company, zatca_status', strict: true })
      .then(function (g) {
        var bs = {}, bc = {}, other = 0, total = 0;
        g.forEach(function (x) {
          var st = x.zatca_status || '__none__'; bs[st] = bs[st] || { count: 0, grand_total: 0, vat: 0 };
          bs[st].count += x.n; bs[st].grand_total += f0(x.gt); bs[st].vat += f0(x.tax);
          (bc[x.company] = bc[x.company] || {})[st] = x.n;
        });
        Object.keys(bs).forEach(function (st) {
          bs[st].grand_total = r2(bs[st].grand_total); bs[st].vat = r2(bs[st].vat);
          if (st !== '__none__') { total += bs[st].count; if (STATUSES.indexOf(st) < 0) { other += bs[st].count; } }
        });
        res.by_status = bs; res.by_company = bc; res.total_with_status = total; res.unknown_status_count = other; res.no_status_count = bs.__none__ ? bs.__none__.count : 0;
      });
    var excl = gl('Sales Invoice', ['docstatus', 'count(name) as n'], base.concat([['docstatus', 'in', [0, 2]]]), { group_by: 'docstatus', limit: 5, strict: true })
      .then(function (g) { res.excluded = { draft_unsubmitted: 0, cancelled: 0 }; g.forEach(function (x) { if (x.docstatus === 0) { res.excluded.draft_unsubmitted = x.n; } if (x.docstatus === 2) { res.excluded.cancelled = x.n; } }); });
    var b1 = base.concat([['docstatus', '=', 1]]);
    var lc = gl('Sales Invoice', ['custom_clearing_to_zatka_time'], b1.concat([['custom_clearing_to_zatka_time', 'is', 'set']]), { order_by: 'custom_clearing_to_zatka_time desc', limit: 1 })
      .then(function (g) { res.last_clearing_time = g.length ? String(g[0].custom_clearing_to_zatka_time) : null; });
    var lr = gl('Sales Invoice', ['custom_reporting_to_zatka_time'], b1.concat([['custom_reporting_to_zatka_time', 'is', 'set']]), { order_by: 'custom_reporting_to_zatka_time desc', limit: 1 })
      .then(function (g) { res.last_reporting_time = g.length ? String(g[0].custom_reporting_to_zatka_time) : null; });
    var cn = gl('Sales Invoice', ['count(name) as n'], b1.concat([['zatca_status', 'in', ['Cleared', 'Cleared with warnings']], ['custom_clearing_to_zatka_time', 'is', 'not set']]), { limit: 1 })
      .then(function (g) { res.cleared_without_timestamp = g[0].n; });
    var rn = gl('Sales Invoice', ['count(name) as n'], b1.concat([['zatca_status', 'in', ['Reported', 'Reported with warnings']], ['custom_reporting_to_zatka_time', 'is', 'not set']]), { limit: 1 })
      .then(function (g) { res.reported_without_timestamp = g[0].n; });
    var mon = gl('Sales Invoice', ['posting_date', 'zatca_status', 'count(name) as n'], b1, { group_by: 'posting_date, zatca_status', strict: true })
      .then(function (g) {
        var mt = {}; g.forEach(function (x) { var m = String(x.posting_date).slice(0, 7), st = x.zatca_status || '__none__'; mt[m] = mt[m] || {}; mt[m][st] = (mt[m][st] || 0) + x.n; });
        res.monthly_status = Object.keys(mt).sort().map(function (m) { return { month: m, counts: mt[m] }; });
      });
    /* open backlog ageing, ALL dates: exact counts per bucket (no row cap involved) */
    var ageing = { labels: ['0-1 days', '2-3 days', '4-7 days', '8-30 days', '31-90 days', 'Over 90 days'], pending: [0, 0, 0, 0, 0, 0], stuck_draft: [0, 0, 0, 0, 0, 0], all_dates: true, oldest_posting_date: null, as_of: today };
    var ageJobs = [];
    [['Pending', 'pending'], ['Draft', 'stuck_draft']].forEach(function (st) {
      for (var i = 0; i < 6; i++) {
        (function (i) {
          ageJobs.push(gl('Sales Invoice', ['count(name) as n'], siBase(a, false).concat([['zatca_status', '=', st[0]]], bucketFilters(today, i)), { limit: 1 }).then(function (g) { ageing[st[1]][i] = g[0].n; }));
        })(i);
      }
    });
    ageJobs.push(gl('Sales Invoice', ['posting_date'], siBase(a, false).concat([['zatca_status', 'in', ['Pending', 'Draft']]]), { order_by: 'posting_date asc', limit: 1 })
      .then(function (g) { ageing.oldest_posting_date = g.length ? String(g[0].posting_date) : null; }));
    res.ageing = ageing;
    var bl = gl('Sales Invoice', ['company', 'zatca_status', 'count(name) as n'], siBase(a, false).concat([['zatca_status', 'in', ['Pending', 'Draft', 'Rejected', 'Overdue']]]), { group_by: 'company, zatca_status', strict: true })
      .then(function (g) { var o = {}; g.forEach(function (x) { (o[x.company] = o[x.company] || {})[x.zatca_status] = x.n; }); res.backlog_by_company = o; });
    return Promise.all([main, excl, lc, lr, cn, rn, mon, bl].concat(ageJobs)).then(function () { return res; });
  }

  /* ---- warning groups (top 25 distinct warning texts) */
  function engWarnings(a) {
    checkDates(a);
    var LIM = 25;
    return gl('Sales Invoice', ['custom_zatca_warnings', 'count(name) as n'], siBase(a, true).concat([['zatca_status', 'in', ['Cleared with warnings', 'Reported with warnings']]]),
      { group_by: 'custom_zatca_warnings', order_by: 'n desc', limit: LIM }).then(function (g) {
      return { groups: g.map(function (x) { return { html: String(x.custom_zatca_warnings || '').slice(0, 4000), count: x.n }; }),
        note: 'Counts are grouped by the exact warning text stored on the invoice. Top ' + LIM + ' groups by invoice count' + (g.length >= LIM ? ' (more distinct texts exist and are not shown).' : '.') };
    });
  }

  /* ---- VAT filing evidence */
  function engFiling(a) {
    checkDates(a);
    return gl('VAT Summary Form', ['name', 'from_date', 'to_date', 'docstatus', 'modified'], [['from_date', '<=', a.to_date], ['to_date', '>=', a.from_date]], { order_by: 'modified desc', limit: 20 }).then(function (fl) {
      var forms = fl.map(function (f) { return { name: f.name, from_date: String(f.from_date), to_date: String(f.to_date), docstatus: f.docstatus, state: f.docstatus === 1 ? 'Submitted' : (f.docstatus === 2 ? 'Cancelled' : 'Draft') }; });
      return { verified_filing: false, verified_payment: false, available: true, forms: forms, submitted_forms: forms.filter(function (f) { return f.docstatus === 1; }).length, draft_forms: forms.filter(function (f) { return f.docstatus === 0; }).length };
    }, function (e) { return { verified_filing: false, verified_payment: false, available: false, forms: [], error: e.message }; });
  }

  /* ---- presets -> filters (shared by exception counts, drill-downs and the register) */
  function presetFilters(p, a, statusReq) {
    var docstat = 1;
    if (p === '' && statusReq.indexOf('Cancelled') >= 0) { docstat = 2; }
    var f = [['company', 'in', a.scope], ['docstatus', '=', docstat]];
    if (ALL_DATES_PRESETS.indexOf(p) < 0) { f.push(['posting_date', 'between', [a.from_date, a.to_date]]); }
    if (p === 'pending' || p === 'pending_all') { f.push(['zatca_status', '=', 'Pending']); }
    else if (p === 'with_status') { f.push(['zatca_status', 'is', 'set']); }
    else if (p === 'stuck_draft') { f.push(['zatca_status', '=', 'Draft']); }
    else if (p === 'rejected_all') { f.push(['zatca_status', 'in', ['Rejected', 'Overdue']]); }
    else if (p === 'warnings') { f.push(['zatca_status', 'in', ['Cleared with warnings', 'Reported with warnings']]); }
    else if (p === 'missing_uuid') { f.push(['zatca_status', 'is', 'set']); f.push(['uuid', 'is', 'not set']); }
    else if (p === 'missing_buyer_vat') { f.push(['zatca_status', 'is', 'set']); f.push(['customer_vat_id', 'is', 'not set']); }
    else if (p === 'cn_no_return') { f.push(['is_return', '=', 1]); f.push(['return_against', 'is', 'not set']); }
    else if (p === 'cn_unresolved') { f.push(['is_return', '=', 1]); f.push(['zatca_status', 'in', ['Pending', 'Draft', 'Rejected', 'Overdue']]); }
    else if (p === 'zero_vat') { f.push(['is_return', '=', 0]); f.push(['base_net_total', '>', 0]); f.push(['base_total_taxes_and_charges', '=', 0]); }
    else if (p === 'no_status') { f.push(['zatca_status', 'is', 'not set']); }
    else if (p === '') {
      var real = statusReq.filter(function (s) { return s !== 'Cancelled'; });
      if (real.length) { f.push(real.indexOf('__none__') >= 0 ? ['zatca_status', 'is', 'not set'] : ['zatca_status', 'in', real]); }
      if (docstat === 2) { f.push(['zatca_status', '=', 'Cancelled']); }
    }
    return f;
  }
  function engCount(p, a) {
    return gl('Sales Invoice', ['count(name) as n', 'sum(base_grand_total) as gt'], presetFilters(p, a, []), { limit: 1 }).then(function (g) { return { preset: p, total: g.length ? g[0].n : 0, grand_total: g.length ? r2(g[0].gt) : 0 }; });
  }
  function engExceptions(a) {
    checkDates(a);
    var out = {};
    return pool(EXC_PRESETS, 4, function (p) {
      return engCount(p, a).then(function (x) { out[p] = x; }, function (e) { out[p] = { preset: p, total: 0, grand_total: 0, error: e.message }; });
    }).then(function () { out.rate_mismatch = { preset: 'rate_mismatch', total: 0, grand_total: 0, unavailable: true }; return { counts: out }; });
  }

  /* ---- register / drill-down pages (bounded server-side pages + exact count) */
  function engRegister(a) {
    var p = a.preset || '';
    if (p !== '' && p !== 'rate_mismatch' && p !== 'pending' && p !== 'with_status' && EXC_PRESETS.indexOf(p) < 0) { return Promise.reject(new Error('Invalid preset.')); }
    checkDates(a);
    var page = Math.max(1, parseInt(a.page, 10) || 1), ps = Math.min(PAGE_MAX, Math.max(1, parseInt(a.page_size, 10) || 25));
    var sortBy = ['posting_date', 'name', 'base_grand_total', 'customer_name', 'zatca_status', 'company', 'creation'].indexOf(a.sort_by) >= 0 ? a.sort_by : 'posting_date';
    var dir = a.sort_dir === 'asc' ? 'asc' : 'desc', q = String(a.search || '').trim().slice(0, 60);
    var statusReq = String(a.status || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s && (STATUSES.indexOf(s) >= 0 || s === '__none__'); });
    if (p === 'rate_mismatch') {
      var R = S.rate;
      if (!R || R.st !== 'ok') { return Promise.resolve({ preset: p, total: 0, grand_total: 0, rows: [], page: 1, page_size: ps, pages: 0, error: t('x_rate_not_run') }); }
      var gt = 0; R.rows.forEach(function (r) { gt += r.grand_total; });
      return Promise.resolve({ preset: p, total: R.rows.length, grand_total: r2(gt), rows: R.rows.slice((page - 1) * ps, page * ps), page: page, page_size: ps, pages: Math.ceil(R.rows.length / ps) });
    }
    var f = presetFilters(p, a, statusReq), orf = q ? [['name', 'like', '%' + q + '%'], ['customer_name', 'like', '%' + q + '%'], ['customer', 'like', '%' + q + '%']] : [];
    var fields = REG_FIELDS.slice(); if (p === 'warnings') { fields.push('custom_zatca_warnings'); }
    return gl('Sales Invoice', ['count(name) as n', 'sum(base_grand_total) as gt'], f, { limit: 1, or_filters: orf }).then(function (c) {
      var total = c.length ? c[0].n : 0, out = { preset: p, total: total, grand_total: c.length ? r2(c[0].gt) : 0, page: page, page_size: ps, pages: total ? Math.ceil(total / ps) : 0, rows: [] };
      if (!total) { return out; }
      return gl('Sales Invoice', fields, f, { limit: ps, start: (page - 1) * ps, order_by: sortBy + ' ' + dir + ', name desc', or_filters: orf }).then(function (rows) { out.rows = rows.map(mapRow); return out; });
    });
  }

  /* ---- bounded on-demand scan: VAT not equal to 15% of net (needs a field comparison that the
         standard filters cannot express). Calculated only when the whole period fits the cap. */
  function engRateScan(a, onProgress) {
    checkDates(a);
    var f = [['company', 'in', a.scope], ['docstatus', '=', 1], ['posting_date', 'between', [a.from_date, a.to_date]], ['is_return', '=', 0], ['base_net_total', '>', 0], ['base_total_taxes_and_charges', '>', 0]];
    return gl('Sales Invoice', ['count(name) as n'], f, { limit: 1 }).then(function (c) {
      var total = c.length ? c[0].n : 0;
      if (total > SCAN_CAP) { return { st: 'unavailable', total: total }; }
      var rows = [], start = 0;
      function next() {
        return gl('Sales Invoice', REG_FIELDS, f, { limit: SCAN_PAGE, start: start, order_by: 'posting_date desc, name desc' }).then(function (g) {
          rows = rows.concat(g); start += SCAN_PAGE; if (onProgress) { onProgress(Math.min(start, total), total); }
          return (g.length === SCAN_PAGE && start < total) ? next() : null;
        });
      }
      return next().then(function () {
        var bad = rows.filter(function (r) { var n = f0(r.base_net_total), tx = f0(r.base_total_taxes_and_charges); return Math.abs(tx - (VAT_RATE / 100) * n) > (1 + 0.001 * n); }).map(mapRow);
        return { st: 'ok', rows: bad, scanned: rows.length, total: total };
      });
    });
  }

  /* ---- dispatcher: same call shape the UI uses everywhere */
  function api(action, args) {
    var a = {}; Object.keys(args || {}).forEach(function (k) { a[k] = args[k]; });
    var all = S.meta ? S.meta.companies.map(function (c) { return c.name; }) : [];
    if (a.company) { a.scope = [a.company]; }
    else if (a.vat_group !== undefined && a.vat_group !== '' && S.meta) { a.scope = (S.meta.vat_groups.filter(function (g) { return g.tax_id === a.vat_group; })[0] || { companies: [] }).companies; }
    else { a.scope = all; }
    try {
      if (action === 'meta') { return engMeta(); }
      if (!a.scope.length) { return Promise.reject(new Error('No accessible company in this scope.')); }
      if (action === 'vat_company') { return engVat(a); }
      if (action === 'trend') { return engTrend(a); }
      if (action === 'zatca') { return engZatca(a); }
      if (action === 'warnings') { return engWarnings(a); }
      if (action === 'filing') { return engFiling(a); }
      if (action === 'exceptions') { return engExceptions(a); }
      if (action === 'register') { return engRegister(a); }
    } catch (e) { return Promise.reject(e); }
    return Promise.reject(new Error('Unknown action'));
  }

  /* ------------------------------------------------------------------ SVG charts */
  function niceMax(v) {
    if (v <= 0) { return 1; }
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }
  /* opts: cats[], series[{name,color,vals[]}], stacked, line{name,color,vals[]}, height */
  function barChart(o) {
    var W = 640, H = o.height || 240, L = 54, R = 12, T = 12, B = 44, cats = o.cats, ns = o.series.length;
    var hi = 0, lo = 0, i, j;
    for (i = 0; i < cats.length; i++) {
      var pos = 0, neg = 0;
      for (j = 0; j < ns; j++) {
        var v = o.series[j].vals[i] || 0;
        if (o.stacked) { if (v >= 0) { pos += v; } else { neg += v; } } else { hi = Math.max(hi, v); lo = Math.min(lo, v); }
      }
      if (o.stacked) { hi = Math.max(hi, pos); lo = Math.min(lo, neg); }
      if (o.line) { var lv = o.line.vals[i] || 0; hi = Math.max(hi, lv); lo = Math.min(lo, lv); }
    }
    var top = niceMax(hi), bot = lo < 0 ? -niceMax(-lo) : 0, span = top - bot || 1;
    var ph = H - T - B, pw = W - L - R;
    function y(v) { return T + (top - v) / span * ph; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '">';
    for (i = 0; i <= 4; i++) {
      var tv = bot + span * i / 4, ty = y(tv);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + ty + '" y2="' + ty + '" stroke="#e6ecf4"/>';
      s += '<text x="' + (L - 6) + '" y="' + (ty + 4) + '" text-anchor="end">' + esc(compact(tv)) + '</text>';
    }
    var gw = pw / Math.max(cats.length, 1), bw = o.stacked ? Math.min(46, gw * 0.62) : Math.min(34, gw * 0.7 / ns), y0 = y(0);
    for (i = 0; i < cats.length; i++) {
      var gx = L + gw * i + gw / 2, accP = 0, accN = 0;
      for (j = 0; j < ns; j++) {
        var val = o.series[j].vals[i] || 0, x, yy, hh;
        if (o.stacked) {
          x = gx - bw / 2;
          if (val >= 0) { yy = y(accP + val); hh = y(accP) - yy; accP += val; } else { yy = y(accN); hh = y(accN + val) - yy; accN += val; }
        } else {
          x = gx - (bw * ns) / 2 + j * bw; yy = val >= 0 ? y(val) : y0; hh = Math.abs(y(val) - y0);
        }
        if (hh > 0.2) {
          s += '<rect x="' + x + '" y="' + yy + '" width="' + (bw - (o.stacked ? 0 : 3)) + '" height="' + hh + '" rx="3" fill="' + o.series[j].color + '"><title>' + esc(cats[i] + ' - ' + o.series[j].name + ': ' + fmt(val, 2)) + '</title></rect>';
        }
      }
      var lbl = String(cats[i]); if (lbl.length > 16) { lbl = lbl.slice(0, 15) + '…'; }
      s += '<text x="' + gx + '" y="' + (H - B + 16) + '" text-anchor="middle">' + esc(lbl) + '</text>';
    }
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y0 + '" y2="' + y0 + '" stroke="#9fb0c8"/>';
    if (o.line) {
      var pts = [];
      for (i = 0; i < cats.length; i++) { pts.push((L + gw * i + gw / 2) + ',' + y(o.line.vals[i] || 0)); }
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + o.line.color + '" stroke-width="2.2"/>';
      for (i = 0; i < cats.length; i++) {
        s += '<circle cx="' + (L + gw * i + gw / 2) + '" cy="' + y(o.line.vals[i] || 0) + '" r="3.2" fill="' + o.line.color + '"><title>' + esc(cats[i] + ' - ' + o.line.name + ': ' + fmt(o.line.vals[i] || 0, 2)) + '</title></circle>';
      }
    }
    return s + '</svg>';
  }
  function legend(items) {
    return '<div class="vz-legend">' + items.map(function (it) {
      var inner = '<i style="background:' + it.color + '"></i>' + esc(it.label) + (it.value !== undefined ? ' <span class="num muted">' + esc(fmt(it.value, 0)) + '</span>' : '');
      return it.attrs ? '<button type="button" ' + it.attrs + '>' + inner + '</button>' : '<span>' + inner + '</span>';
    }).join('') + '</div>';
  }
  function donut(items, centerLabel) {
    var tot = 0; items.forEach(function (i) { tot += i.value; });
    var R = 80, r = 52, cx = 100, cy = 100;
    var s = '<svg viewBox="0 0 200 200" role="img" aria-label="' + esc(centerLabel) + '" style="max-width:260px;margin:0 auto">';
    if (!tot) { return s + '<circle cx="100" cy="100" r="66" fill="none" stroke="#e6ecf4" stroke-width="28"/><text x="100" y="104" text-anchor="middle" style="font-size:12px">0</text></svg>'; }
    var a0 = -Math.PI / 2;
    items.forEach(function (it) {
      if (!it.value) { return; }
      var frac = it.value / tot, a1 = a0 + frac * Math.PI * 2;
      if (frac > 0.9999) {
        s += '<circle cx="100" cy="100" r="66" fill="none" stroke="' + it.color + '" stroke-width="28"><title>' + esc(it.label + ': ' + fmt(it.value, 0)) + '</title></circle>';
      } else {
        var large = frac > 0.5 ? 1 : 0;
        var x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        var x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1), x3 = cx + r * Math.cos(a0), y3 = cy + r * Math.sin(a0);
        s += '<path d="M' + x0 + ' ' + y0 + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + x3 + ' ' + y3 + ' Z" fill="' + it.color + '"><title>' + esc(it.label + ': ' + fmt(it.value, 0)) + '</title></path>';
      }
      a0 = a1;
    });
    s += '<text x="100" y="98" text-anchor="middle" style="font-size:20px;font-weight:700;fill:#0b2a55">' + esc(fmt(tot, 0)) + '</text>';
    s += '<text x="100" y="116" text-anchor="middle" style="font-size:10.5px">' + esc(centerLabel) + '</text></svg>';
    return s;
  }

  /* ------------------------------------------------------------------ VAT aggregation */
  var RT = [
    ['VAT on Sales', 'ضريبة المبيعات'], ['Standard rated sales', 'المبيعات الخاضعة للنسبة الأساسية 15%'], ['VAT on Purchases', 'ضريبة المشتريات'],
    ['Custom and Clearing', 'رسوم الجمارك والتخليص'], ['Import subject to VAT', 'استيراد خاضع للضريبة بالاحتساب العكسي'], ['Standard rated purchases', 'المشتريات الخاضعة للنسبة الأساسية 15%'],
    ['Expenses with VAT', 'المصروفات الخاضعة للضريبة 15%'], ['Grand Total', 'الإجمالي'], ['Difference', 'مبلغ الفرق (المخرجات - المدخلات)']
  ];
  function rtTitle(s) {
    if (S.lang !== 'ar') { return s; }
    for (var i = 0; i < RT.length; i++) { if (String(s).indexOf(RT[i][0]) === 0) { return RT[i][1]; } }
    return s;
  }
  function vatAgg(src, comps) {
    var a = { n: comps.length, ok: 0, verified: 0, errors: 0, loading: 0, unverified: [], sales_base: 0, sales_adj: 0, taxable: 0, output: 0, input: 0, net: 0,
      customs: 0, import_rc: 0, purch_vat: 0, exp_vat: 0, doc_output: 0 };
    comps.forEach(function (c) {
      var r = src[c];
      if (!r || r.st === 'loading') { a.loading++; return; }
      if (r.st === 'error') { a.errors++; a.unverified.push({ company: c, status: 'error', reasons: [r.err] }); return; }
      a.ok++;
      var d = r.data, k = d.ksa_summary, v = d.verdict;
      if (v.status === 'reconciled') {
        a.verified++; a.sales_base += k.sales_base; a.sales_adj += k.sales_adj; a.taxable += k.taxable_sales_net_of_returns;
        a.output += k.output_vat; a.input += k.input_vat; a.customs += k.customs; a.import_rc += k.import_rc; a.purch_vat += k.purch_vat; a.exp_vat += k.exp_vat;
      } else {
        a.unverified.push({ company: c, status: v.status, reasons: v.reasons || [], doc_output: d.documents && d.documents.sales_invoice ? d.documents.sales_invoice.vat_total : null });
      }
    });
    a.net = a.output - a.input;
    return a;
  }
  function vStatusBadge(s) {
    var m = { reconciled: ['green', 'v_status_reconciled'], mismatch: ['red', 'v_status_mismatch'], not_covered: ['amber', 'v_status_not_covered'], error: ['red', 'v_status_error'], unverified: ['grey', 'v_status_unverified'] };
    var x = m[s] || m.unverified;
    return '<span class="vz-badge b-' + x[0] + '">' + esc(t(x[1])) + '</span>';
  }
  function cnt(st) { var z = S.zatca; return (z && z.st === 'ok' && z.data.by_status[st]) ? z.data.by_status[st].count : 0; }
  function amtOf(st) { var z = S.zatca; return (z && z.st === 'ok' && z.data.by_status[st]) ? z.data.by_status[st].grand_total : 0; }
  function excTotal(k) { var e = S.exc; return (e && e.st === 'ok' && e.data.counts[k]) ? e.data.counts[k].total : 0; }

  /* ------------------------------------------------------------------ links */
  function erpFilterLink(spec) {
    var q = [], p = spec.preset || '', st = spec.status || '';
    var allDates = ['pending_all', 'stuck_draft', 'rejected_all', 'cn_unresolved'].indexOf(p) >= 0;
    var unsupported = ['zero_vat', 'rate_mismatch'].indexOf(p) >= 0;
    function add(k, v) { q.push(k + '=' + encodeURIComponent(typeof v === 'string' ? v : JSON.stringify(v))); }
    add('docstatus', '1');
    var comps = spec.company ? [spec.company] : scopeCompanies();
    if (comps.length === 1) { add('company', comps[0]); } else if (comps.length > 1) { add('company', ['in', comps]); }
    if (!allDates) { add('posting_date', ['Between', [S.f.from, S.f.to]]); }
    if (p === 'pending' || p === 'pending_all') { add('zatca_status', 'Pending'); }
    else if (p === 'stuck_draft') { add('zatca_status', 'Draft'); }
    else if (p === 'rejected_all') { add('zatca_status', ['in', ['Rejected', 'Overdue']]); }
    else if (p === 'warnings') { add('zatca_status', ['in', ['Cleared with warnings', 'Reported with warnings']]); }
    else if (p === 'with_status') { add('zatca_status', ['is', 'set']); }
    else if (p === 'missing_uuid') { add('zatca_status', ['is', 'set']); add('uuid', ['is', 'not set']); }
    else if (p === 'missing_buyer_vat') { add('zatca_status', ['is', 'set']); add('customer_vat_id', ['is', 'not set']); }
    else if (p === 'cn_no_return') { add('is_return', '1'); add('return_against', ['is', 'not set']); }
    else if (p === 'cn_unresolved') { add('is_return', '1'); add('zatca_status', ['in', ['Pending', 'Draft', 'Rejected', 'Overdue']]); }
    else if (p === 'no_status') { add('zatca_status', ['is', 'not set']); }
    else if (st && st !== '__none__' && st !== 'Cancelled') { add('zatca_status', st.indexOf(',') >= 0 ? ['in', st.split(',')] : st); }
    else if (st === '__none__') { add('zatca_status', ['is', 'not set']); }
    if (unsupported) { return ''; }
    return '/app/sales-invoice?' + q.join('&');
  }
  function reportLink(company) {
    return '/app/query-report/' + encodeURIComponent(KSA_REPORT) + '?company=' + encodeURIComponent(company || '') +
      '&from_date=' + encodeURIComponent(S.f.from) + '&to_date=' + encodeURIComponent(S.f.to);
  }
  function piLink(company) {
    return '/app/purchase-invoice?docstatus=1&company=' + encodeURIComponent(company) + '&posting_date=' + encodeURIComponent(JSON.stringify(['Between', [S.f.from, S.f.to]]));
  }

  /* ------------------------------------------------------------------ small renderers */
  function secTitle(title, sub, right) {
    return '<div class="vz-sec-title"><div><h3>' + esc(title) + '</h3>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (right || '') + '</div>';
  }
  function kpi(o) {
    var cls = 'vz-kpi' + (o.tone ? ' t-' + o.tone : '') + (o.loading ? ' is-loading' : '');
    var inner = '<span class="k-label">' + esc(o.label) + '</span><span class="k-value">' + (o.loading ? '&nbsp;' : o.value) + '</span>' + (o.sub ? '<span class="k-sub">' + esc(o.sub) + '</span>' : '');
    if (o.attrs && !o.loading) { return '<button type="button" class="' + cls + '" ' + o.attrs + ' aria-label="' + esc(o.label) + '">' + inner + '</button>'; }
    return '<div class="' + cls + '">' + inner + '</div>';
  }
  function errBox(msg, retryAttr) {
    return '<div class="vz-note n-red vz-err"><span>' + esc(t('err_section')) + ': ' + esc(msg) + '</span>' +
      (retryAttr === false ? '' : '<button type="button" class="vz-btn vz-btn-sm" data-act="refresh">' + esc(t('retry')) + '</button>') + '</div>';
  }
  function skel() { return '<div class="vz-skel"></div>'; }
  function drillAttrs(o) {
    var a = 'data-act="drill"';
    ['preset', 'status', 'company', 'title'].forEach(function (k) { if (o[k]) { a += ' data-' + k + '="' + esc(o[k]) + '"'; } });
    return a;
  }
  function stateOf(x) { return x ? x.st : 'loading'; }

  /* ------------------------------------------------------------------ OVERVIEW */
  function buildAlerts(A) {
    var out = [], z = S.zatca, e = S.exc, i;
    A.unverified.slice(0, 6).forEach(function (u) {
      out.push({ tone: u.status === 'not_covered' || u.status === 'error' ? 'red' : 'amber', title: t('al_unrecon') + ' ' + u.company,
        sub: (u.reasons && u.reasons.length ? u.reasons.join(' ') : t('al_unrecon_sub')), act: 'data-act="tab" data-tab="vat"' });
    });
    if (z && z.st === 'ok') {
      var old = 0, ag = z.data.ageing;
      for (i = 3; i < 6; i++) { old += (ag.pending[i] || 0); }
      if (old > 0) { out.push({ tone: 'red', title: t('al_backlog') + ': ' + fmt(old, 0), sub: t('al_backlog_sub') + ' ' + (ag.oldest_posting_date || '-'), act: drillAttrs({ preset: 'pending_all', title: t('ex_pending_all') }) }); }
      var tot = z.data.total_with_status, w = cnt('Cleared with warnings') + cnt('Reported with warnings');
      if (tot > 0 && w / tot > 0.2) { out.push({ tone: 'amber', title: t('al_warn_pct') + ' ' + fmt(w / tot * 100, 1) + '%', sub: fmt(w, 0) + ' / ' + fmt(tot, 0) + ' ' + t('al_warn_pct_sub'), act: drillAttrs({ preset: 'warnings', title: t('ex_warnings') }) }); }
    }
    if (e && e.st === 'ok') {
      var c = e.data.counts;
      if (c.rejected_all && c.rejected_all.total > 0) { out.push({ tone: 'red', title: t('al_rejected') + ': ' + fmt(c.rejected_all.total, 0), sub: t('exd_rejected_all'), act: drillAttrs({ preset: 'rejected_all', title: t('ex_rejected_all') }) }); }
      if (c.missing_uuid && c.missing_uuid.total > 0) { out.push({ tone: 'red', title: t('al_missing') + ': ' + fmt(c.missing_uuid.total, 0), sub: t('exd_missing_uuid'), act: drillAttrs({ preset: 'missing_uuid', title: t('ex_missing_uuid') }) }); }
      var cn = (c.cn_no_return ? c.cn_no_return.total : 0) + (c.cn_unresolved ? c.cn_unresolved.total : 0);
      if (cn > 0) { out.push({ tone: 'red', title: t('al_cn') + ': ' + fmt(cn, 0), sub: t('exd_cn_no_return') + ' / ' + t('exd_cn_unresolved'), act: 'data-act="tab" data-tab="compliance"' }); }
    }
    out.push({ tone: 'amber', title: t('al_filing'), sub: t('al_filing_sub'), act: 'data-act="tab" data-tab="compliance"' });
    out.push({ tone: 'blue', title: t('al_report_bug'), sub: t('al_report_bug_sub') });
    return out;
  }
  function alertsHtml(list) {
    if (!list.length) { return '<div class="vz-empty">' + esc(t('al_none')) + '</div>'; }
    return '<ul class="vz-alerts">' + list.map(function (a) {
      var inner = '<span class="dot ' + (a.tone === 'red' ? 'red' : a.tone === 'amber' ? 'amber' : a.tone === 'green' ? 'green' : 'blue') + '"></span><span><b>' + esc(a.title) + '</b><small>' + esc(a.sub || '') + '</small></span>';
      return '<li>' + (a.act ? '<button type="button" class="vz-alert" ' + a.act + '>' + inner + '</button>' : '<div class="vz-alert">' + inner + '</div>') + '</li>';
    }).join('') + '</ul>';
  }
  function attentionHtml() {
    var e = S.exc;
    if (!e || e.st === 'loading') { return skel(); }
    if (e.st === 'error') { return errBox(e.err); }
    var order = ['rejected_all', 'missing_uuid', 'cn_no_return', 'rate_mismatch', 'pending_all', 'stuck_draft', 'cn_unresolved', 'warnings', 'missing_buyer_vat', 'zero_vat'];
    var rows = '';
    order.forEach(function (k) {
      var c = e.data.counts[k]; if (!c || c.error || !(c.total > 0)) { return; }
      rows += '<tr class="is-click" ' + drillAttrs({ preset: k, title: t('ex_' + k) }) + '><td>' + esc(t('ex_' + k)) +
        ((['pending_all', 'stuck_draft', 'rejected_all', 'cn_unresolved'].indexOf(k) >= 0) ? ' <span class="vz-badge b-grey">' + esc(t('x_all_dates_tag')) + '</span>' : '') +
        '</td><td class="r">' + num(c.total, 0) + '</td><td class="r">' + money(c.grand_total) + '</td><td class="r"><button type="button" class="vz-btn vz-btn-sm" ' + drillAttrs({ preset: k, title: t('ex_' + k) }) + '>' + esc(t('x_view')) + '</button></td></tr>';
    });
    if (!rows) { return '<div class="vz-note n-green">' + esc(t('x_ok')) + '</div>'; }
    return '<div class="vz-tablewrap"><table><thead><tr><th>' + esc(t('x_category')) + '</th><th class="r">' + esc(t('x_count')) + '</th><th class="r">' + esc(t('x_amount')) + ' (' + esc(t('sar')) + ')</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function outInChart(A, comps) {
    var cats = [], o = [], i = [];
    comps.forEach(function (c) {
      var r = S.vat[c]; if (!r || r.st !== 'ok' || r.data.verdict.status !== 'reconciled') { return; }
      var ab = c; S.meta.companies.forEach(function (x) { if (x.name === c && x.abbr) { ab = x.abbr; } });
      cats.push(ab); o.push(r.data.ksa_summary.output_vat); i.push(r.data.ksa_summary.input_vat);
    });
    if (!cats.length) { return '<div class="vz-empty">' + esc(S.vatLoading ? t('loading') : t('v_no_verified')) + '</div>'; }
    if (cats.length > 1) { cats.push(S.lang === 'ar' ? 'الإجمالي' : 'Total'); o.push(A.output); i.push(A.input); }
    return '<div class="vz-chart">' + barChart({ cats: cats, series: [{ name: t('k_output'), color: '#0b2a55', vals: o }, { name: t('k_input'), color: '#5b8def', vals: i }], label: t('s_out_in') }) + '</div>' +
      legend([{ label: t('k_output'), color: '#0b2a55' }, { label: t('k_input'), color: '#5b8def' }]);
  }
  function trendChart() {
    var T = S.trend;
    if (!T || T.st === 'loading') { return skel(); }
    if (T.st === 'error') { return errBox(T.err); }
    var m = T.data.months; if (!m.length) { return '<div class="vz-empty">' + esc(t('no_data')) + '</div>'; }
    var cats = m.map(function (x) { return x.month; });
    return '<div class="vz-chart">' + barChart({ cats: cats, series: [{ name: t('k_output'), color: '#0b2a55', vals: m.map(function (x) { return x.output_vat; }) },
      { name: t('k_input'), color: '#5b8def', vals: m.map(function (x) { return x.input_vat; }) }], line: { name: t('v_net'), color: '#d9a400', vals: m.map(function (x) { return x.net_vat; }) }, label: t('s_trend') }) + '</div>' +
      legend([{ label: t('k_output'), color: '#0b2a55' }, { label: t('k_input'), color: '#5b8def' }, { label: t('v_net'), color: '#d9a400' }]) +
      ((T.data.sales_error || T.data.purchase_error) ? '<div class="vz-note n-amber">' + esc(T.data.sales_error || T.data.purchase_error) + '</div>' : '');
  }
  function donutBlock() {
    var z = S.zatca;
    if (!z || z.st === 'loading') { return skel(); }
    if (z.st === 'error') { return errBox(z.err); }
    var items = [], used = {};
    STATUS_ORDER.forEach(function (s) {
      var c = cnt(s); used[s] = 1;
      if (c > 0) { items.push({ label: stLabel(s), value: c, color: STATUS_COLOR[s], attrs: drillAttrs({ status: s, title: stLabel(s) }) }); }
    });
    var other = 0;
    Object.keys(z.data.by_status).forEach(function (s) { if (!used[s] && s !== '__none__') { other += z.data.by_status[s].count; } });
    if (other > 0) { items.push({ label: stLabel('other'), value: other, color: STATUS_COLOR.other }); }
    var none = cnt('__none__');
    if (none > 0) { items.push({ label: stLabel('__none__'), value: none, color: STATUS_COLOR.__none__, attrs: drillAttrs({ status: '__none__', title: stLabel('__none__') }) }); }
    if (!items.length) { return '<div class="vz-empty">' + esc(t('no_data')) + '</div>'; }
    return '<div class="vz-chart">' + donut(items, t('invoices')) + '</div>' + legend(items);
  }
  function renderOverview() {
    var el = $('#vz-p-overview'), comps = scopeCompanies(), A = vatAgg(S.vat, comps), h = '', z = S.zatca;
    S.vatLoading = A.loading > 0;
    if (S.metaErr) { el.innerHTML = errBox(S.metaErr); return; }
    if (S.meta && !S.meta.can_run_ksa_vat_report) { h += '<div class="vz-note n-amber">' + esc(S.lang === 'ar' ? 'ليس لديك صلاحية تشغيل تقرير DM KSA VAT Report؛ ستظهر أرقام الإقرار كخطأ. أرقام زاتكا والمستندات متاحة.' : 'Your user cannot run the "DM KSA VAT Report" report, so VAT return figures will show an error. ZATCA and document figures are still available.') + '</div>'; }
    h += secTitle(t('s_vat_kpis'), S.lang === 'ar' ? 'المصدر: تقرير DM KSA VAT Report (مباشر) مع مطابقة المستندات' : 'Source: live "DM KSA VAT Report", cross-checked to documents');
    h += '<div class="vz-note n-amber">' + esc(t('cov_note')) + '</div>';
    var vl = A.ok === 0 && A.loading > 0, vsub = A.verified + '/' + A.n + ' ' + t('k_verified_of'), vtone = (A.n && A.verified === A.n) ? '' : (A.verified === 0 ? 'red' : 'amber');
    function vv(x) { return A.verified > 0 ? money(x) : '<span class="muted">-</span>'; }
    var netLabel = A.verified > 0 ? (A.net >= 0 ? t('k_net_pay') : t('k_net_ref')) : t('k_net');
    h += '<div class="vz-grid">' +
      kpi({ label: t('k_taxable'), value: vv(A.taxable), sub: vsub + ' - ' + t('k_taxable_sub'), tone: vtone, loading: vl, attrs: 'data-act="vatdrill" data-kind="taxable"' }) +
      kpi({ label: t('k_output'), value: vv(A.output), sub: vsub, tone: vtone, loading: vl, attrs: 'data-act="vatdrill" data-kind="output"' }) +
      kpi({ label: t('k_input'), value: vv(A.input), sub: vsub, tone: vtone, loading: vl, attrs: 'data-act="vatdrill" data-kind="input"' }) +
      kpi({ label: netLabel, value: A.verified > 0 ? money(Math.abs(A.net)) : '<span class="muted">-</span>', sub: A.verified > 0 ? (A.verified < A.n ? t('partial') + ' - ' + vsub : t('verified') + ' - ' + t('k_net_sub')) : t('k_not_verified'), tone: A.verified === A.n && A.n ? (A.net >= 0 ? 'amber' : 'green') : 'red', loading: vl, attrs: 'data-act="vatdrill" data-kind="net"' }) +
      '</div>';
    h += secTitle(t('s_zatca_kpis'));
    if (z && z.st === 'error') { h += errBox(z.err); }
    else {
      var L = !z || z.st === 'loading';
      var rej = cnt('Rejected') + cnt('Overdue');
      h += '<div class="vz-grid">' +
        kpi({ label: t('k_total'), value: num(z && z.st === 'ok' ? z.data.total_with_status : 0, 0), sub: t('k_total_sub'), loading: L, attrs: drillAttrs({ preset: 'with_status', title: t('k_total') }) }) +
        kpi({ label: t('k_cleared'), value: num(cnt('Cleared'), 0), tone: 'green', loading: L, attrs: drillAttrs({ status: 'Cleared', title: t('k_cleared') }) }) +
        kpi({ label: t('k_cleared_w'), value: num(cnt('Cleared with warnings'), 0), sub: t('k_cleared_w_sub'), tone: 'amber', loading: L, attrs: drillAttrs({ status: 'Cleared with warnings', title: t('k_cleared_w') }) }) +
        kpi({ label: t('k_pending'), value: num(cnt('Pending'), 0), sub: z && z.st === 'ok' ? t('k_pending_sub') + ': ' + fmt(z.data.ageing.pending.reduce(function (a, b) { return a + b; }, 0), 0) : '', tone: 'amber', loading: L, attrs: drillAttrs({ preset: 'pending', title: t('k_pending') }) }) +
        kpi({ label: t('k_rejected'), value: num(rej, 0), sub: t('k_rejected_sub'), tone: rej > 0 ? 'red' : 'green', loading: L, attrs: drillAttrs({ status: 'Rejected,Overdue', title: t('k_rejected') }) }) +
        '</div>';
    }
    h += '<div class="vz-grid-2" style="margin-top:14px">' +
      '<div class="vz-card"><div class="vz-chart-title">' + esc(t('s_out_in')) + '</div><div class="vz-chart-sub">' + esc(t('s_out_in_sub')) + '</div>' + outInChart(A, comps) + '</div>' +
      '<div class="vz-card"><div class="vz-chart-title">' + esc(t('s_status_dist')) + '</div>' + donutBlock() + '</div></div>';
    h += '<div class="vz-card" style="margin-top:12px"><div class="vz-chart-title">' + esc(t('s_trend')) + '</div><div class="vz-chart-sub">' + esc(t('s_trend_sub')) + '</div>' + trendChart() + '</div>';
    h += '<div class="vz-grid-2" style="margin-top:12px"><div>' + secTitle(t('s_alerts')) + alertsHtml(buildAlerts(A)) + '</div><div>' + secTitle(t('s_attention')) + attentionHtml() + '</div></div>';
    el.innerHTML = h;
  }

  /* ------------------------------------------------------------------ VAT RETURNS */
  function companyAbbr(c) { var a = c; if (S.meta) { S.meta.companies.forEach(function (x) { if (x.name === c) { a = x.name; } }); } return a; }
  function taxIdOf(c) { var a = ''; if (S.meta) { S.meta.companies.forEach(function (x) { if (x.name === c) { a = x.tax_id; } }); } return a; }
  function rowForCompany(c) {
    var r = S.vat[c], p = S.vatPrev[c], row = '<tr class="is-click" data-act="pickco" data-company="' + esc(c) + '"><td><b>' + esc(c) + '</b></td><td><span class="num">' + esc(taxIdOf(c)) + '</span></td>';
    var cols = S.compare ? 10 : 8;
    if (!r || r.st === 'loading') { return row + '<td colspan="' + (cols - 2) + '" class="muted">' + esc(t('v_loading_company')) + '</td></tr>'; }
    if (r.st === 'error') { return row + '<td colspan="' + (cols - 2) + '"><span class="vz-badge b-red">' + esc(t('v_status_error')) + '</span> <span class="muted">' + esc(r.err) + '</span></td></tr>'; }
    var k = r.data.ksa_summary, v = r.data.verdict.status, ok = v === 'reconciled', net = k.output_vat - k.input_vat;
    var cls = ok ? '' : ' class="muted"';
    row += '<td class="r"' + cls + '>' + money(k.taxable_sales_net_of_returns) + '</td><td class="r"' + cls + '>' + money(k.sales_adj) + '</td><td class="r"' + cls + '>' + money(k.output_vat) + '</td><td class="r"' + cls + '>' + money(k.input_vat) + '</td><td class="r"' + cls + '>' + money(net) + '</td><td>' + vStatusBadge(v) + '</td>';
    if (S.compare) {
      if (p && p.st === 'ok') { var pn = p.data.ksa_summary.output_vat - p.data.ksa_summary.input_vat; row += '<td class="r">' + money(pn) + '</td><td class="r">' + money(net - pn) + '</td>'; }
      else { row += '<td class="r muted" colspan="2">' + esc(p && p.st === 'error' ? t('v_status_error') : t('loading')) + '</td>'; }
    }
    return row + '</tr>';
  }
  function comparisonTable(comps, A) {
    var head = '<tr><th>' + esc(t('v_company')) + '</th><th>' + esc(t('v_group_tax')) + '</th><th class="r">' + esc(t('k_taxable')) + '</th><th class="r">' + esc(t('v_adjust')) + '</th><th class="r">' + esc(t('k_output')) + '</th><th class="r">' + esc(t('k_input')) + '</th><th class="r">' + esc(t('v_net')) + '</th><th>' + esc(t('v_status')) + '</th>' +
      (S.compare ? '<th class="r">' + esc(t('v_prev')) + ' - ' + esc(t('v_net')) + '</th><th class="r">' + esc(t('v_delta')) + '</th>' : '') + '</tr>';
    var body = comps.map(rowForCompany).join('');
    var tot = '<tr class="is-total"><td colspan="2">' + esc(t('v_scope_total')) + ' (' + A.verified + '/' + A.n + ')</td><td class="r">' + money(A.taxable) + '</td><td class="r">' + money(A.sales_adj) + '</td><td class="r">' + money(A.output) + '</td><td class="r">' + money(A.input) + '</td><td class="r">' + money(A.net) + '</td><td></td>' + (S.compare ? '<td></td><td></td>' : '') + '</tr>';
    return '<div class="vz-tablewrap"><table><thead>' + head + '</thead><tbody>' + body + tot + '</tbody></table></div>';
  }
  function groupsTable(comps) {
    if (!S.meta) { return skel(); }
    var rows = '';
    S.meta.vat_groups.forEach(function (g) {
      var members = g.companies.filter(function (c) { return comps.indexOf(c) >= 0; });
      if (!members.length) { return; }
      var A = vatAgg(S.vat, members), ic = 0;
      members.forEach(function (c) { var r = S.vat[c]; if (r && r.st === 'ok' && r.data.documents.sales_invoice) { ic += r.data.documents.sales_invoice.intercompany_invoices || 0; } });
      rows += '<tr class="is-click" data-act="pickgroup" data-group="' + esc(g.tax_id) + '"><td><span class="num">' + esc(g.tax_id || '-') + '</span></td><td>' + members.map(esc).join('<br>') + '</td>' +
        '<td class="r">' + A.verified + '/' + A.n + '</td><td class="r">' + money(A.taxable) + '</td><td class="r">' + money(A.output) + '</td><td class="r">' + money(A.input) + '</td><td class="r">' + money(A.net) + '</td>' +
        '<td>' + (A.loading ? '<span class="muted">' + esc(t('loading')) + '</span>' : (A.verified === A.n ? '<span class="vz-badge b-green">' + esc(t('verified')) + '</span>' : '<span class="vz-badge b-amber">' + esc(t('partial')) + '</span>')) +
        (ic ? '<br><small class="muted">' + esc(t('v_intercompany')) + ': ' + ic + '</small>' : '') + '</td></tr>';
    });
    return '<div class="vz-note n-blue">' + esc(t('v_group_note')) + '</div><div class="vz-tablewrap"><table><thead><tr><th>' + esc(t('v_group_tax')) + '</th><th>' + esc(t('v_group_members')) + '</th><th class="r">' + esc(t('k_verified_of')) + '</th><th class="r">' + esc(t('k_taxable')) + '</th><th class="r">' + esc(t('k_output')) + '</th><th class="r">' + esc(t('k_input')) + '</th><th class="r">' + esc(t('v_net')) + '</th><th>' + esc(t('v_status')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function breakdownTable(comps) {
    var single = comps.length === 1, list = comps.filter(function (c) { var r = S.vat[c]; return r && r.st === 'ok' && (single || r.data.verdict.status === 'reconciled'); });
    if (!list.length) { return '<div class="vz-empty">' + esc(t('v_no_verified')) + '</div>'; }
    var order = [], map = {};
    list.forEach(function (c) {
      var seen = {};
      S.vat[c].data.ksa.rows.forEach(function (r) {
        if (!r.title) { return; }
        var base = r.section + '|' + r.title; seen[base] = (seen[base] || 0) + 1; var key = base + '#' + seen[base];
        if (!map[key]) { map[key] = { section: r.section, title: r.title, header: r.header, amount: 0, adjustment: 0, vat: 0 }; order.push(key); }
        map[key].amount += r.amount; map[key].adjustment += r.adjustment; map[key].vat += r.vat;
      });
    });
    var body = order.map(function (k) {
      var m = map[k];
      if (m.header) { return '<tr class="is-head"><td colspan="4">' + esc(rtTitle(m.title)) + '</td></tr>'; }
      var tot = m.title.indexOf('Grand Total') === 0 || m.title.indexOf('Difference') === 0;
      return '<tr' + (tot ? ' class="is-total"' : '') + '><td>' + esc(rtTitle(m.title)) + '</td><td class="r">' + (m.title.indexOf('Difference') === 0 ? '' : money(m.amount)) + '</td><td class="r">' + (m.adjustment ? money(m.adjustment) : '<span class="muted">-</span>') + '</td><td class="r">' + money(m.vat) + '</td></tr>';
    }).join('');
    return '<div class="vz-tablewrap"><table><thead><tr><th>' + esc(t('v_line')) + '</th><th class="r">' + esc(t('v_taxable_base')) + '</th><th class="r">' + esc(t('v_adjust')) + '</th><th class="r">' + esc(t('v_vat')) + '</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="vz-note n-blue">' + esc(t('v_base_note')) + '</div>';
  }
  function reconTable(comps) {
    var body = '';
    comps.forEach(function (c) {
      var r = S.vat[c]; if (!r || r.st !== 'ok') { return; }
      var v = r.data.verdict, sc = v.sales_check, pc = v.purchase_check;
      function cell(x) { return x ? '<td class="r">' + money(x.report) + '</td><td class="r">' + money(x.documents) + '</td><td class="r" style="' + (x.ok ? '' : 'color:#b42318;font-weight:700') + '">' + money(x.difference) + '</td>' : '<td colspan="3" class="muted">' + esc(t('unavailable')) + '</td>'; }
      body += '<tr><td>' + esc(c) + '</td>' + cell(sc) + cell(pc) + '<td>' + vStatusBadge(v.status) + '</td></tr>';
    });
    if (!body) { return '<div class="vz-empty">' + esc(t('loading')) + '</div>'; }
    return '<div class="vz-tablewrap"><table><thead><tr><th>' + esc(t('v_company')) + '</th><th class="r">' + esc(t('v_sales_vat')) + '</th><th class="r">' + esc(t('v_si_vat')) + '</th><th class="r">' + esc(t('v_diff')) + '</th><th class="r">' + esc(t('v_purch_vat')) + '</th><th class="r">' + esc(t('v_pi_vat')) + '</th><th class="r">' + esc(t('v_diff')) + '</th><th>' + esc(t('v_status')) + '</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="vz-note">' + esc(t('v_tol')) + ': 5.00 ' + esc(t('sar')) + '</div>';
  }
  function renderVat() {
    var el = $('#vz-p-vat'), comps = scopeCompanies(), A = vatAgg(S.vat, comps), h = '';
    if (S.metaErr) { el.innerHTML = errBox(S.metaErr); return; }
    h += '<div class="vz-toolbar"><div class="vz-fgroup" role="group"><button type="button" class="vz-chip' + (S.vatView === 'companies' ? ' is-on' : '') + '" data-act="vatview" data-view="companies">' + esc(t('v_view_companies')) + '</button>' +
      '<button type="button" class="vz-chip' + (S.vatView === 'groups' ? ' is-on' : '') + '" data-act="vatview" data-view="groups">' + esc(t('v_view_groups')) + '</button></div>' +
      '<label class="vz-field" style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="vz-compare"' + (S.compare ? ' checked' : '') + ' style="min-width:0;height:auto"> <span>' + esc(t('v_compare_prev')) + '</span></label>' +
      '<a class="vz-btn vz-btn-sm" href="' + esc(reportLink(S.f.company || (comps.length === 1 ? comps[0] : ''))) + '" target="_blank" rel="noopener">' + esc(t('v_native_report')) + '</a></div>';
    h += '<div class="vz-note n-amber">' + esc(t('cov_note')) + '</div>';
    if (A.verified === 0 && A.loading === 0) { h += '<div class="vz-note n-amber">' + esc(t('v_no_verified')) + '</div>'; }
    h += secTitle(S.vatView === 'groups' ? t('s_groups') : t('s_compare'), S.f.from + ' → ' + S.f.to);
    h += S.vatView === 'groups' ? groupsTable(comps) : comparisonTable(comps, A);
    h += secTitle(t('s_breakdown'), comps.length === 1 ? comps[0] : t('v_scope_total')) + breakdownTable(comps);
    h += secTitle(t('s_recon')) + reconTable(comps);
    el.innerHTML = h;
  }

  /* ------------------------------------------------------------------ record tables */
  function regTable(rows, o) {
    o = o || {};
    if (!rows || !rows.length) { return '<div class="vz-empty">' + esc(t('no_data')) + '</div>'; }
    function th(label, key, cls) {
      if (!o.sortable) { return '<th class="' + (cls || '') + '">' + esc(label) + '</th>'; }
      var arrow = S.reg.sort === key ? (S.reg.dir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th class="sortable ' + (cls || '') + '" data-act="sort" data-key="' + key + '">' + esc(label) + arrow + '</th>';
    }
    var head = '<tr>' + th(t('c_invoice'), 'name') + th(t('c_customer'), 'customer_name') + th(t('c_company'), 'company') + th(t('c_date'), 'posting_date') + '<th>' + esc(t('c_type')) + '</th>' +
      '<th class="r">' + esc(t('c_taxable')) + '</th><th class="r">' + esc(t('c_vat')) + '</th>' + th(t('c_total'), 'base_grand_total', 'r') + th(t('c_status'), 'zatca_status') + '<th>' + esc(t('c_time')) + '</th>' + '<th>' + esc(t('c_owner')) + '</th>' + (o.reason ? '<th>' + esc(t('c_reason')) + '</th>' : '') + (o.warnings ? '<th>' + esc(t('c_warning')) + '</th>' : '') + '<th>' + esc(t('c_action')) + '</th></tr>';
    var body = rows.map(function (r) {
      var href = invLink(r.name);
      return '<tr><td><a href="' + esc(href) + '" target="_blank" rel="noopener"><span class="num">' + esc(r.name) + '</span></a></td><td>' + esc(r.customer_name || r.customer) + '</td><td>' + esc(r.company) + '</td><td><span class="num">' + esc(r.posting_date) + '</span></td>' +
        '<td>' + esc(r.invoice_type === 'Credit Note' ? t('t_credit') : t('t_invoice')) + '</td><td class="r">' + money(r.taxable) + '</td><td class="r">' + money(r.vat) + '</td><td class="r">' + money(r.grand_total) + '</td><td>' + stBadge(r.zatca_status) + '</td>' +
        '<td>' + (r.zatca_time ? '<span class="num">' + esc(fmtTime(r.zatca_time)) + '</span><br><small class="muted">' + esc(r.time_kind === 'clearing' ? t('c_clearing') : t('c_reporting')) + '</small>' : '<span class="muted">-</span>') + '</td>' +
        '<td>' + esc(r.owner || '-') + '</td>' + (o.reason ? '<td class="warn-text">' + esc(o.reason) + '</td>' : '') +
        (o.warnings ? '<td class="warn-text">' + esc(htmlToText(r.warnings).slice(0, 220)) + '</td>' : '') +
        '<td><a class="vz-btn vz-btn-sm" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(t('details')) + '</a></td></tr>';
    }).join('');
    return '<div class="vz-tablewrap"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }
  function pager(d, act) {
    if (!d || !d.total) { return ''; }
    var from = (d.page - 1) * d.page_size + 1, to = Math.min(d.total, d.page * d.page_size);
    return '<div class="vz-pager"><span>' + esc(t('r_showing')) + ' <span class="num">' + from + '-' + to + '</span> ' + esc(t('r_of')) + ' <span class="num">' + fmt(d.total, 0) + '</span></span><span class="pg">' +
      '<button type="button" class="vz-btn vz-btn-sm" data-act="' + act + '" data-dir="-1"' + (d.page <= 1 ? ' disabled' : '') + '>' + esc(t('r_prev')) + '</button>' +
      '<span>' + esc(t('r_page')) + ' <span class="num">' + d.page + ' / ' + d.pages + '</span></span>' +
      '<button type="button" class="vz-btn vz-btn-sm" data-act="' + act + '" data-dir="1"' + (d.page >= d.pages ? ' disabled' : '') + '>' + esc(t('r_next')) + '</button></span></div>';
  }

  /* ------------------------------------------------------------------ ZATCA tab */
  function ageingChart(z) {
    var ag = z.data.ageing;
    return '<div class="vz-chart">' + barChart({ cats: ag.labels, series: [{ name: t('st_Pending'), color: '#f08c00', vals: ag.pending }, { name: t('st_Draft'), color: '#6b7686', vals: ag.stuck_draft }], label: t('s_ageing'), height: 210 }) + '</div>' +
      legend([{ label: t('st_Pending'), color: '#f08c00' }, { label: t('st_Draft'), color: '#6b7686' }]) +
      '<div class="vz-note n-blue">' + esc(t('z_ageing_note')) + (ag.oldest_posting_date ? ' ' + esc(t('z_oldest')) + ': ' + esc(ag.oldest_posting_date) : '') + '</div>';
  }
  function byCompanyTable(z, comps) {
    var cols = STATUS_ORDER.slice(0, 8).concat(['__none__']);
    var head = '<tr><th>' + esc(t('v_company')) + '</th>' + cols.map(function (c) { return '<th class="r">' + esc(stLabel(c)) + '</th>'; }).join('') + '</tr>';
    var body = comps.map(function (c) {
      var row = z.data.by_company[c] || {}, cells = cols.map(function (s) {
        var n = row[s] || 0;
        return '<td class="r">' + (n ? '<button type="button" class="link-btn" ' + drillAttrs({ company: c, status: s, title: c + ' - ' + stLabel(s) }) + '><span class="num">' + fmt(n, 0) + '</span></button>' : '<span class="muted">0</span>') + '</td>';
      }).join('');
      return '<tr><td><button type="button" class="link-btn" data-act="pickco" data-company="' + esc(c) + '">' + esc(c) + '</button></td>' + cells + '</tr>';
    }).join('');
    return '<div class="vz-tablewrap"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }
  function warnBlock() {
    var w = S.warn;
    if (!w) { return '<button type="button" class="vz-btn" data-act="loadwarn">' + esc(t('z_load_warn')) + '</button>'; }
    if (w.st === 'loading') { return skel(); }
    if (w.st === 'error') { return errBox(w.err, false); }
    if (!w.data.groups.length) { return '<div class="vz-empty">' + esc(t('z_warn_none')) + '</div>'; }
    return '<div class="vz-tablewrap"><table><thead><tr><th class="r">' + esc(t('z_warn_count')) + '</th><th>' + esc(t('s_warnings')) + '</th></tr></thead><tbody>' + w.data.groups.map(function (g) {
      return '<tr><td class="r">' + num(g.count, 0) + '</td><td class="warn-text" style="max-width:none;white-space:pre-wrap">' + esc(htmlToText(g.html) || '-') + '</td></tr>';
    }).join('') + '</tbody></table></div><div class="vz-note">' + esc(w.data.note) + '</div>';
  }
  function miniList(x) {
    if (!x || x.st === 'loading') { return skel(); }
    if (x.st === 'error') { return errBox(x.err, false); }
    return regTable(x.data.rows, {}) + (x.data.total > x.data.rows.length ? '<div class="vz-pager"><span>' + fmt(x.data.total, 0) + ' ' + esc(t('d_records')) + '</span></div>' : '');
  }
  /* oldest pending invoices: all rows, paginated */
  function pendBlock() {
    var x = S.pendList;
    if (!x || (x.st === 'loading' && !x.data)) { return skel(); }
    if (x.st === 'error') { return errBox(x.err, false); }
    return (x.st === 'loading' ? '<div class="vz-note">' + esc(t('loading')) + '</div>' : '') + regTable(x.data.rows, {}) + pager(x.data, 'pendpage');
  }
  function renderZatca() {
    var el = $('#vz-p-zatca'), comps = scopeCompanies(), z = S.zatca, h = '';
    if (S.metaErr) { el.innerHTML = errBox(S.metaErr); return; }
    if (!z || z.st === 'loading') { el.innerHTML = '<div class="vz-grid">' + [1, 2, 3, 4, 5, 6].map(function () { return kpi({ label: '', value: '', loading: true }); }).join('') + '</div>'; return; }
    if (z.st === 'error') { el.innerHTML = errBox(z.err); return; }
    var d = z.data, cards = [
      ['k_total', d.total_with_status, '', 'k_total_sub', { preset: 'with_status' }],
      ['k_cleared', cnt('Cleared'), 'green', '', { status: 'Cleared' }],
      ['k_cleared_w', cnt('Cleared with warnings'), 'amber', 'k_cleared_w_sub', { status: 'Cleared with warnings' }],
      ['k_reported', cnt('Reported'), '', '', { status: 'Reported' }],
      ['k_reported_w', cnt('Reported with warnings'), 'amber', '', { status: 'Reported with warnings' }],
      ['k_pending', cnt('Pending'), 'amber', '', { preset: 'pending' }],
      ['st_Rejected', cnt('Rejected'), cnt('Rejected') ? 'red' : 'green', '', { status: 'Rejected' }],
      ['k_overdue', cnt('Overdue'), cnt('Overdue') ? 'red' : 'green', '', { status: 'Overdue' }],
      ['k_draft', cnt('Draft'), cnt('Draft') ? 'red' : 'grey', 'k_draft_sub', { status: 'Draft' }],
      ['k_nostatus', d.no_status_count, 'grey', 'k_nostatus_sub', { status: '__none__' }]
    ];
    h += secTitle(t('s_status_cards'), S.f.from + ' → ' + S.f.to) + '<div class="vz-grid">' + cards.map(function (c) {
      var spec = c[4] ? { preset: c[4].preset, status: c[4].status, title: t(c[0]) } : null;
      return kpi({ label: t(c[0]), value: c[1] === null ? '<span class="muted">n/a</span>' : num(c[1], 0), sub: c[3] ? t(c[3]) : '', tone: c[2], attrs: spec && c[1] ? drillAttrs(spec) : '' });
    }).join('') + '</div>';
    h += '<div class="vz-note">' + esc(d.status_note ? t('z_status_note') : '') + ' ' + esc(t('k_draft_unsub')) + ': <b class="num">' + fmt(d.excluded.draft_unsubmitted, 0) + '</b> · ' + esc(t('k_cancelled')) + ': <b class="num">' + fmt(d.excluded.cancelled, 0) + '</b></div>';
    var months = d.monthly_status.map(function (m) { return m.month; });
    var present = STATUS_ORDER.concat(['__none__']).filter(function (s) { return d.monthly_status.some(function (m) { return m.counts[s]; }); });
    h += '<div class="vz-grid-2" style="margin-top:12px"><div class="vz-card"><div class="vz-chart-title">' + esc(t('s_status_dist')) + '</div>' + donutBlock() + '</div>' +
      '<div class="vz-card"><div class="vz-chart-title">' + esc(t('s_monthly_status')) + '</div>' + (months.length ? '<div class="vz-chart">' + barChart({ cats: months, stacked: true, label: t('s_monthly_status'), series: present.map(function (s) { return { name: stLabel(s), color: STATUS_COLOR[s], vals: d.monthly_status.map(function (m) { return m.counts[s] || 0; }) }; }) }) + '</div>' + legend(present.map(function (s) { return { label: stLabel(s), color: STATUS_COLOR[s] }; })) : '<div class="vz-empty">' + esc(t('no_data')) + '</div>') + '</div></div>';
    h += '<div class="vz-grid-2" style="margin-top:12px"><div class="vz-card"><div class="vz-chart-title">' + esc(t('s_ageing')) + ' <span class="vz-badge b-grey">' + esc(t('z_all_dates')) + '</span></div>' + ageingChart(z) + '</div>' +
      '<div class="vz-card"><div class="vz-chart-title">' + esc(t('s_timestamps')) + '</div><div class="vz-tablewrap"><table><tbody>' +
      '<tr><td>' + esc(t('z_last_clear')) + '</td><td class="r">' + (d.last_clearing_time ? '<span class="num">' + esc(fmtTime(d.last_clearing_time)) + '</span>' : '-') + '</td></tr>' +
      '<tr><td>' + esc(t('z_last_report')) + '</td><td class="r">' + (d.last_reporting_time ? '<span class="num">' + esc(fmtTime(d.last_reporting_time)) + '</span>' : '-') + '</td></tr>' +
      '<tr><td>' + esc(t('z_cleared_nots')) + '</td><td class="r">' + num(d.cleared_without_timestamp, 0) + '</td></tr>' +
      '<tr><td>' + esc(t('z_reported_nots')) + '</td><td class="r">' + num(d.reported_without_timestamp, 0) + '</td></tr></tbody></table></div></div></div>';
    h += secTitle(t('s_by_company')) + byCompanyTable(z, comps);
    h += secTitle(t('s_warnings')) + '<div id="vz-warn">' + warnBlock() + '</div>';
    h += secTitle(t('s_rejected_list'), t('z_all_dates')) + miniList(S.rejList);
    h += secTitle(t('s_pending_list'), t('z_all_dates')) + pendBlock();
    h += secTitle(t('s_meanings')) + '<ul style="margin:0;padding-inline-start:20px;line-height:1.8">' + ['cleared', 'cleared_w', 'reported', 'reported_w', 'pending', 'rejected', 'overdue', 'draft', 'cancelled', 'failed'].map(function (k) { return '<li>' + esc(t('m_' + k)) + '</li>'; }).join('') + '</ul>';
    el.innerHTML = h;
  }

  /* ------------------------------------------------------------------ REGISTER */
  function renderRegister() {
    var el = $('#vz-p-register'), R = S.reg;
    var opts = '<option value="">' + esc(t('r_all_status')) + '</option>' + STATUS_ORDER.map(function (s) { return '<option value="' + esc(s) + '"' + (R.status === s ? ' selected' : '') + '>' + esc(stLabel(s)) + '</option>'; }).join('') + '<option value="__none__"' + (R.status === '__none__' ? ' selected' : '') + '>' + esc(stLabel('__none__')) + '</option>';
    el.innerHTML = '<div class="vz-toolbar"><label class="vz-field"><span>' + esc(t('r_search')) + '</span><input type="search" id="vz-reg-search" class="vz-search" value="' + esc(R.search) + '" maxlength="60" autocomplete="off"></label>' +
      '<label class="vz-field"><span>' + esc(t('r_status')) + '</span><select id="vz-reg-status">' + opts + '</select></label>' +
      '<label class="vz-field"><span>' + esc(t('r_page_size')) + '</span><select id="vz-reg-ps">' + [25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (R.ps === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      '<a class="vz-btn vz-btn-sm" id="vz-reg-erp" href="#" target="_blank" rel="noopener">' + esc(t('open_erp')) + '</a></div><div id="vz-reg-body"></div>';
    renderRegBody();
  }
  function renderRegBody() {
    var b = $('#vz-reg-body'); if (!b) { return; }
    var R = S.reg, h = '';
    var erp = $('#vz-reg-erp'); if (erp) { erp.setAttribute('href', erpFilterLink({ status: R.status, preset: R.status ? '' : 'with_status' }) || '#'); }
    if (R.st === 'error') { b.innerHTML = errBox(R.err); return; }
    if (R.st === 'loading' && !R.data) { b.innerHTML = skel(); return; }
    if (!R.data) { b.innerHTML = ''; return; }
    h += (R.st === 'loading' ? '<div class="vz-note">' + esc(t('loading')) + '</div>' : '') + regTable(R.data.rows, { sortable: true }) + pager(R.data, 'regpage');
    b.innerHTML = h;
  }

  /* ------------------------------------------------------------------ COMPLIANCE */
  var EXC_ORDER = [['rejected_all', 'red', 1], ['stuck_draft', 'amber', 1], ['pending_all', 'amber', 1], ['warnings', 'amber', 0], ['missing_uuid', 'red', 0], ['missing_buyer_vat', 'amber', 0],
    ['cn_no_return', 'red', 0], ['cn_unresolved', 'amber', 1], ['zero_vat', 'amber', 0], ['rate_mismatch', 'red', 0], ['no_status', 'grey', 0]];
  function renderCompliance() {
    var el = $('#vz-p-compliance'), comps = scopeCompanies(), A = vatAgg(S.vat, comps), e = S.exc, z = S.zatca, h = '';
    if (S.metaErr) { el.innerHTML = errBox(S.metaErr); return; }
    h += secTitle(t('s_exceptions'), S.f.from + ' → ' + S.f.to);
    if (!e || e.st === 'loading') { h += '<div class="vz-grid">' + [1, 2, 3, 4].map(function () { return kpi({ label: '', value: '', loading: true }); }).join('') + '</div>'; }
    else if (e.st === 'error') { h += errBox(e.err); }
    else {
      h += '<div class="vz-grid">' + EXC_ORDER.map(function (x) {
        var c = e.data.counts[x[0]] || {}, failed = !!c.error, n = c.total || 0;
        if (x[0] === 'rate_mismatch') { return rateCard(); }
        var tone = failed ? 'red' : (n > 0 ? x[1] : 'green');
        return kpi({ label: t('ex_' + x[0]), value: failed ? '<span class="muted">' + esc(t('x_failed')) + '</span>' : num(n, 0), tone: tone,
          sub: (failed ? c.error : t('exd_' + x[0])) + (x[2] ? ' [' + t('x_all_dates_tag') + ']' : ''), attrs: (!failed && n > 0) ? drillAttrs({ preset: x[0], title: t('ex_' + x[0]) }) : '' });
      }).join('') + '</div>';
    }
    h += secTitle(t('s_ageing')) + '<div class="vz-card">' + (z && z.st === 'ok' ? ageingChart(z) : (z && z.st === 'error' ? errBox(z.err) : skel())) + '</div>';
    h += secTitle(t('s_tax_recon'));
    if (A.loading && !A.ok) { h += skel(); }
    else if (!A.unverified.length) { h += '<div class="vz-note n-green">' + esc(t('tx_none')) + '</div>'; }
    else {
      h += '<div class="vz-tablewrap"><table><thead><tr><th>' + esc(t('v_company')) + '</th><th>' + esc(t('v_status')) + '</th><th>' + esc(t('tx_reason')) + '</th></tr></thead><tbody>' + A.unverified.map(function (u) {
        return '<tr class="is-click" data-act="pickco" data-company="' + esc(u.company) + '"><td>' + esc(u.company) + '</td><td>' + vStatusBadge(u.status) + '</td><td>' + esc((u.reasons || []).join(' ')) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    el.innerHTML = h;
  }
  function rateCard() {
    var R = S.rate, L = t('ex_rate_mismatch'), d = t('exd_rate_mismatch');
    if (!R) { return kpi({ label: L, value: '<span class="muted">' + esc(t('x_unavail')) + '</span>', sub: d + ' - ' + t('x_run'), tone: 'grey', attrs: 'data-act="runrate"' }); }
    if (R.st === 'scanning') { return kpi({ label: L, value: '<span class="muted">' + esc(t('x_scanning')) + '</span>', sub: R.total ? fmt(R.done, 0) + ' / ' + fmt(R.total, 0) : '', tone: 'grey' }); }
    if (R.st === 'unavailable') { return kpi({ label: L, value: '<span class="muted">' + esc(t('x_unavail')) + '</span>', sub: t('x_rate_cap') + ' (' + fmt(R.total, 0) + ')', tone: 'grey' }); }
    if (R.st === 'error') { return kpi({ label: L, value: '<span class="muted">' + esc(t('x_failed')) + '</span>', sub: R.err, tone: 'red', attrs: 'data-act="runrate"' }); }
    var n = R.rows.length;
    return kpi({ label: L, value: num(n, 0), sub: d + ' [' + t('x_rate_done') + ' ' + fmt(R.scanned, 0) + ']', tone: n ? 'red' : 'green', attrs: n ? drillAttrs({ preset: 'rate_mismatch', title: L }) : '' });
  }
  function runRate() {
    if (S.rate && S.rate.st === 'scanning') { return; }
    var run = S.run, a = scopeArgs(); a.scope = scopeCompanies(); S.rate = { st: 'scanning', done: 0, total: 0 }; renderCompliance();
    engRateScan(a, function (d, tot) { if (run === S.run && S.rate && S.rate.st === 'scanning') { S.rate.done = d; S.rate.total = tot; if (S.tab === 'compliance') { renderCompliance(); } } }).then(function (r) {
      if (run !== S.run) { return; }
      S.rate = r;
      if (r.st === 'ok' && S.exc && S.exc.st === 'ok') { var g = 0; r.rows.forEach(function (x) { g += x.grand_total; }); S.exc.data.counts.rate_mismatch = { preset: 'rate_mismatch', total: r.rows.length, grand_total: r2(g) }; }
      renderAll();
    }, function (e) { if (run !== S.run) { return; } S.rate = { st: 'error', err: e.message }; renderAll(); });
  }

  /* ------------------------------------------------------------------ MODAL */
  function openDrill(spec) {
    S.M = { mode: 'records', title: spec.title || '', preset: spec.preset || '', status: spec.status || '', company: spec.company || '', page: 1, ps: 25, st: 'loading', data: null, err: '' };
    showModal(); loadModal();
  }
  function showModal() { $('#vz-modal').hidden = false; renderModal(); var x = $('#vz-modal .vz-x'); if (x) { x.focus(); } }
  function closeModal() { S.M = null; S.modalId++; $('#vz-modal').hidden = true; }
  function loadModal() {
    var M = S.M; if (!M || M.mode !== 'records') { return; }
    var id = ++S.modalId; M.st = 'loading'; renderModal();
    var a = scopeArgs();
    if (M.company) { a.company = M.company; a.vat_group = ''; }
    a.preset = M.preset; a.status = M.status; a.page = M.page; a.page_size = M.ps;
    api('register', a).then(function (r) { if (id !== S.modalId || !S.M) { return; } M.st = 'ok'; M.data = r; renderModal(); },
      function (e) { if (id !== S.modalId || !S.M) { return; } M.st = 'error'; M.err = e.message; renderModal(); });
  }
  function renderModal() {
    var M = S.M; if (!M) { return; }
    var body = $('#vz-modal-body'), title = $('#vz-modal-title'), sub = $('#vz-modal-sub');
    title.textContent = M.title;
    if (M.mode === 'vat') { sub.textContent = S.f.from + ' → ' + S.f.to; body.innerHTML = M.html; return; }
    var allDates = ['pending_all', 'stuck_draft', 'rejected_all', 'cn_unresolved'].indexOf(M.preset) >= 0;
    sub.textContent = (M.company || (S.f.company || (S.f.group ? t('vat_group_scope') + ' ' + S.f.group : t('all_permitted')))) + ' · ' + (allDates ? t('d_all_dates') : S.f.from + ' → ' + S.f.to) + (M.data ? ' · ' + fmt(M.data.total, 0) + ' ' + t('d_records') : '');
    var link = erpFilterLink({ preset: M.preset, status: M.status, company: M.company });
    var h = (link ? '<div class="vz-toolbar"><a class="vz-btn vz-btn-sm" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(t('open_erp')) + '</a></div>' : '');
    if (M.st === 'error') { h += errBox(M.err, false); }
    else if (M.st === 'loading' && !M.data) { h += skel(); }
    else if (M.data) {
      if (M.data.error) { h += '<div class="vz-note n-red">' + esc(M.data.error) + '</div>'; }
      h += (M.st === 'loading' ? '<div class="vz-note">' + esc(t('loading')) + '</div>' : '') + regTable(M.data.rows, { warnings: M.preset === 'warnings', reason: M.preset === 'missing_uuid' ? t('exd_missing_uuid') : (M.preset === 'missing_buyer_vat' ? t('exd_missing_buyer_vat') : '') }) + pager(M.data, 'modalpage');
    }
    body.innerHTML = h;
  }
  function openVatDrill(kind) {
    var comps = scopeCompanies(), A = vatAgg(S.vat, comps), titleKey = { taxable: 'k_taxable', output: 'k_output', input: 'k_input', net: 'k_net' }[kind];
    var rows = comps.map(function (c) {
      var r = S.vat[c]; if (!r || r.st !== 'ok') { return '<tr><td>' + esc(c) + '</td><td colspan="3" class="muted">' + esc(r && r.st === 'error' ? r.err : t('loading')) + '</td><td></td></tr>'; }
      var k = r.data.ksa_summary, v = r.data.verdict, val = kind === 'taxable' ? k.taxable_sales_net_of_returns : kind === 'output' ? k.output_vat : kind === 'input' ? k.input_vat : k.output_vat - k.input_vat;
      var docs = r.data.documents, docv = kind === 'output' || kind === 'taxable' ? (docs.sales_invoice ? (kind === 'output' ? docs.sales_invoice.vat_total : docs.sales_invoice.net_total) : null) : kind === 'input' ? (docs.purchase_invoice ? docs.purchase_invoice.vat_total : null) : null;
      var act = (kind === 'output' || kind === 'taxable') ? '<button type="button" class="vz-btn vz-btn-sm" ' + drillAttrs({ company: c, preset: '', status: '', title: c }).replace('data-act="drill"', 'data-act="drill"') + '>' + esc(t('x_view')) + '</button> ' : '';
      if (kind === 'input') { act = '<a class="vz-btn vz-btn-sm" href="' + esc(piLink(c)) + '" target="_blank" rel="noopener">' + esc(t('d_open_pi')) + '</a> '; }
      act += '<a class="vz-btn vz-btn-sm" href="' + esc(reportLink(c)) + '" target="_blank" rel="noopener">' + esc(t('open_report')) + '</a>';
      return '<tr><td>' + esc(c) + '</td><td class="r">' + money(val) + '</td><td class="r">' + (docv === null ? '<span class="muted">-</span>' : money(docv)) + '</td><td>' + vStatusBadge(v.status) + '</td><td>' + act + '</td></tr>';
    }).join('');
    var h = '<div class="vz-tablewrap"><table><thead><tr><th>' + esc(t('v_company')) + '</th><th class="r">' + esc(t(titleKey)) + ' (' + esc(t('v_vat')) + ' / ' + esc(t('v_taxable_base')) + ')</th><th class="r">' + esc(S.lang === 'ar' ? 'من المستندات' : 'From documents') + '</th><th>' + esc(t('v_status')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="vz-note n-blue">' + esc(t('v_group_note')) + '</div>' + (A.unverified.length ? '<div class="vz-note n-amber">' + esc(t('v_net_unverified')) + ': ' + A.unverified.map(function (u) { return esc(u.company); }).join(', ') + '</div>' : '');
    S.M = { mode: 'vat', title: t(titleKey), html: h };
    showModal();
  }

  /* ------------------------------------------------------------------ chrome: selectors, scope bar, stamp, language */
  function fillSelectors() {
    if (!S.meta) { return; }
    var cs = $('#vz-company'), gs = $('#vz-group');
    cs.innerHTML = '<option value="">' + esc(t('all_companies')) + '</option>' + S.meta.companies.map(function (c) { return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>'; }).join('');
    gs.innerHTML = '<option value="">' + esc(t('all_groups')) + '</option>' + S.meta.vat_groups.map(function (g) {
      return '<option value="' + esc(g.tax_id) + '">' + esc((g.tax_id || '-') + ' (' + g.companies.length + ' ' + t('companies_n') + ')') + '</option>';
    }).join('');
    cs.value = S.f.company; gs.value = S.f.group;
  }
  function updateScopebar() {
    var comps = scopeCompanies(), sc;
    if (S.f.company) { sc = S.f.company; } else if (S.f.group) { sc = t('vat_group_scope') + ' ' + S.f.group + ' (' + comps.length + ')'; } else { sc = t('all_permitted') + ' (' + comps.length + ')'; }
    $('#vz-scopebar').innerHTML = '<span>' + esc(t('scope')) + ': <b>' + esc(sc) + '</b></span><span>' + esc(t('period')) + ': <b class="num">' + esc(S.f.from + ' → ' + S.f.to) + '</b></span><span>' + esc(t('basis')) + '</span><span>' + esc(t('arch_note')) + '</span>';
  }
  function updateStamp() {
    var s = S.busy ? t('refreshing') : (S.lastOk ? t('last_refresh') + ': ' + ymd(S.lastOk) + ' ' + pad(S.lastOk.getHours()) + ':' + pad(S.lastOk.getMinutes()) + ':' + pad(S.lastOk.getSeconds()) : t('never'));
    if (!S.busy && S.failed) { s += ' · ' + S.failed + ' ' + t('partial_fail'); }
    var el = $('#vz-stamp'); el.textContent = s; el.style.color = (!S.busy && S.failed) ? '#b42318' : '';
  }
  function applyLang() {
    V.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr'); V.setAttribute('data-lang', S.lang); V.setAttribute('lang', S.lang);
    $$('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    $$('.vz-lang-btn').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-lang') === S.lang); });
    fillSelectors(); updateScopebar(); updateStamp();
    $('#vz-from').value = S.f.from; $('#vz-to').value = S.f.to;
  }
  function renderTab(tab) {
    ({ overview: renderOverview, vat: renderVat, zatca: renderZatca, register: renderRegister, compliance: renderCompliance })[tab]();
  }
  var rafPending = false;
  function scheduleRender() {
    if (rafPending) { return; }
    rafPending = true;
    (window.requestAnimationFrame || setTimeout)(function () {
      rafPending = false;
      if (S.tab === 'register') { renderRegBody(); } else { renderTab(S.tab); }
      updateScopebar(); updateStamp();
      if (S.M && S.M.mode === 'vat') { /* keep static */ }
    });
  }
  function renderAll() { renderTab(S.tab); updateScopebar(); updateStamp(); if (S.M) { renderModal(); } }
  function showTab(tab) {
    S.tab = tab;
    $$('.vz-tab').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tab') === tab); b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false'); });
    $$('.vz-panel').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== tab; });
    renderTab(tab);
  }

  /* ------------------------------------------------------------------ loading */
  function loadRegister() {
    var id = ++S.regId, R = S.reg; R.st = 'loading'; if (S.tab === 'register') { renderRegBody(); }
    var a = scopeArgs(); a.status = R.status; a.search = R.search; a.page = R.page; a.page_size = R.ps; a.sort_by = R.sort; a.sort_dir = R.dir;
    return api('register', a).then(function (r) { if (id !== S.regId) { return; } R.st = 'ok'; R.data = r; R.err = ''; if (S.tab === 'register') { renderRegBody(); } },
      function (e) { if (id !== S.regId) { return; } R.st = 'error'; R.err = e.message; S.failed++; if (S.tab === 'register') { renderRegBody(); } });
  }
  /* oldest pending invoices: paginated, all dates, oldest first */
  function loadPending() {
    var id = ++S.pendId;
    if (S.pendList && S.pendList.data) { S.pendList.st = 'loading'; } else { S.pendList = { st: 'loading' }; }
    var a = scopeArgs(); a.preset = 'pending_all'; a.page = S.pendPage; a.page_size = 25; a.sort_by = 'posting_date'; a.sort_dir = 'asc';
    return api('register', a).then(function (r) { if (id !== S.pendId) { return; } S.pendList = { st: 'ok', data: r }; scheduleRender(); },
      function (e) { if (id !== S.pendId) { return; } S.pendList = { st: 'error', err: e.message }; S.failed++; scheduleRender(); });
  }
  function loadVatFor(comps, store, range, id) {
    return pool(comps, 3, function (c) {
      return api('vat_company', { company: c, from_date: range.from, to_date: range.to }).then(function (r) { if (id !== S.run) { return; } store[c] = { st: 'ok', data: r }; scheduleRender(); },
        function (e) { if (id !== S.run) { return; } store[c] = { st: 'error', err: e.message }; if (store === S.vat) { S.failed++; } scheduleRender(); });
    });
  }
  function track(id, p, ok, bad) {
    return p.then(function (r) { if (id !== S.run) { return; } ok(r); scheduleRender(); }, function (e) { if (id !== S.run) { return; } S.failed++; bad(e.message); scheduleRender(); });
  }
  function loadAll() {
    var id = ++S.run; S.busy = true; S.failed = 0; S.metaErr = ''; V.classList.add('is-loading'); $('#vz-refresh').disabled = true; updateStamp();
    return api('meta').then(function (meta) {
      if (id !== S.run) { return; }
      S.meta = meta; fillSelectors();
      var scope = scopeCompanies();
      if (!scope.length) { S.f.company = ''; S.f.group = ''; fillSelectors(); scope = scopeCompanies(); }
      S.zatca = { st: 'loading' }; S.trend = { st: 'loading' }; S.filing = { st: 'loading' }; S.exc = { st: 'loading' }; S.warn = null; S.rate = null; S.rejList = { st: 'loading' }; S.pendList = { st: 'loading' }; S.pendPage = 1;
      S.vat = {}; S.vatPrev = {}; scope.forEach(function (c) { S.vat[c] = { st: 'loading' }; });
      renderAll();
      var sa = scopeArgs(), jobs = [];
      jobs.push(track(id, api('zatca', sa), function (r) { S.zatca = { st: 'ok', data: r }; }, function (m) { S.zatca = { st: 'error', err: m }; }));
      jobs.push(track(id, api('trend', sa), function (r) { S.trend = { st: 'ok', data: r }; }, function (m) { S.trend = { st: 'error', err: m }; }));
      jobs.push(track(id, api('filing', sa), function (r) { S.filing = { st: 'ok', data: r }; }, function (m) { S.filing = { st: 'error', err: m }; }));
      jobs.push(track(id, api('exceptions', sa), function (r) { S.exc = { st: 'ok', data: r }; }, function (m) { S.exc = { st: 'error', err: m }; }));
      var ra = Object.assign({}, sa, { preset: 'rejected_all', page: 1, page_size: 10, sort_by: 'posting_date', sort_dir: 'desc' });
      jobs.push(track(id, api('register', ra), function (r) { S.rejList = { st: 'ok', data: r }; }, function (m) { S.rejList = { st: 'error', err: m }; }));
      jobs.push(loadPending());
      jobs.push(loadVatFor(scope, S.vat, { from: S.f.from, to: S.f.to }, id));
      if (S.compare) { var pr = prevRange(S.f.from, S.f.to); scope.forEach(function (c) { S.vatPrev[c] = { st: 'loading' }; }); jobs.push(loadVatFor(scope, S.vatPrev, pr, id)); }
      S.reg.page = 1; jobs.push(loadRegister());
      return Promise.all(jobs).then(function () {
        if (id !== S.run) { return; }
        S.busy = false; if (S.failed === 0) { S.lastOk = new Date(); }
        V.classList.remove('is-loading'); $('#vz-refresh').disabled = false; renderAll();
      });
    }, function (e) {
      if (id !== S.run) { return; }
      S.metaErr = e.message; S.busy = false; S.failed++; V.classList.remove('is-loading'); $('#vz-refresh').disabled = false; renderAll();
    });
  }
  function loadCompare() {
    var id = S.run, pr = prevRange(S.f.from, S.f.to), scope = scopeCompanies();
    scope.forEach(function (c) { S.vatPrev[c] = { st: 'loading' }; }); scheduleRender();
    loadVatFor(scope, S.vatPrev, pr, id);
  }
  function setPeriod(p) {
    S.f.preset = p;
    var r = periodRange(p); if (r) { S.f.from = r.from; S.f.to = r.to; }
    $$('.vz-chip[data-p]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-p') === p); });
    $('#vz-from').value = S.f.from; $('#vz-to').value = S.f.to;
  }

  /* ------------------------------------------------------------------ events */
  var dateTimer = null, searchTimer = null;
  V.addEventListener('click', function (ev) {
    var n = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!n || !V.contains(n)) { return; }
    var act = n.getAttribute('data-act');
    if (act === 'lang') { S.lang = n.getAttribute('data-lang'); try { window.localStorage.setItem('vz_lang', S.lang); } catch (e) { /* ignore */ } applyLang(); renderAll(); return; }
    if (act === 'tab') { showTab(n.getAttribute('data-tab')); if (S.M) { closeModal(); } return; }
    if (act === 'refresh') { if (!S.busy) { loadAll(); } return; }
    if (act === 'period') { var p = n.getAttribute('data-p'); setPeriod(p); if (p !== 'custom') { loadAll(); } return; }
    if (act === 'close-modal') { closeModal(); return; }
    if (act === 'drill') { ev.preventDefault(); openDrill({ title: n.getAttribute('data-title'), preset: n.getAttribute('data-preset'), status: n.getAttribute('data-status'), company: n.getAttribute('data-company') }); return; }
    if (act === 'vatdrill') { openVatDrill(n.getAttribute('data-kind')); return; }
    if (act === 'pickco') { if (S.M) { closeModal(); } S.f.company = n.getAttribute('data-company'); S.f.group = ''; fillSelectors(); loadAll(); return; }
    if (act === 'pickgroup') { S.f.group = n.getAttribute('data-group'); S.f.company = ''; fillSelectors(); loadAll(); return; }
    if (act === 'runrate') { runRate(); return; }
    if (act === 'vatview') { S.vatView = n.getAttribute('data-view'); renderVat(); return; }
    if (act === 'sort') { var k = n.getAttribute('data-key'); if (S.reg.sort === k) { S.reg.dir = S.reg.dir === 'asc' ? 'desc' : 'asc'; } else { S.reg.sort = k; S.reg.dir = 'desc'; } S.reg.page = 1; loadRegister(); return; }
    if (act === 'regpage') { S.reg.page = Math.max(1, S.reg.page + parseInt(n.getAttribute('data-dir'), 10)); loadRegister(); return; }
    if (act === 'pendpage') { S.pendPage = Math.max(1, S.pendPage + parseInt(n.getAttribute('data-dir'), 10)); loadPending(); scheduleRender(); return; }
    if (act === 'modalpage') { if (S.M) { S.M.page = Math.max(1, S.M.page + parseInt(n.getAttribute('data-dir'), 10)); loadModal(); } return; }
    if (act === 'loadwarn') {
      S.warn = { st: 'loading' }; var w = $('#vz-warn'); if (w) { w.innerHTML = warnBlock(); }
      api('warnings', scopeArgs()).then(function (r) { S.warn = { st: 'ok', data: r }; var w2 = $('#vz-warn'); if (w2) { w2.innerHTML = warnBlock(); } },
        function (e) { S.warn = { st: 'error', err: e.message }; var w3 = $('#vz-warn'); if (w3) { w3.innerHTML = warnBlock(); } });
    }
  });
  V.addEventListener('change', function (ev) {
    var id = ev.target.id;
    if (id === 'vz-company') { S.f.company = ev.target.value; S.f.group = ''; fillSelectors(); loadAll(); }
    else if (id === 'vz-group') { S.f.group = ev.target.value; S.f.company = ''; fillSelectors(); loadAll(); }
    else if (id === 'vz-from' || id === 'vz-to') {
      var f = $('#vz-from').value, to = $('#vz-to').value;
      if (!f || !to) { return; }
      if (f > to) { $('#vz-stamp').textContent = S.lang === 'ar' ? 'تاريخ البداية يجب أن يسبق النهاية' : 'Start date must be on or before end date'; return; }
      if (daysBetween(f, to) > 400) { $('#vz-stamp').textContent = S.lang === 'ar' ? 'الحد الأقصى للفترة 400 يوم' : 'Maximum period is 400 days'; return; }
      S.f.from = f; S.f.to = to; setPeriod('custom'); S.f.from = f; S.f.to = to;
      clearTimeout(dateTimer); dateTimer = setTimeout(loadAll, 300);
    }
    else if (id === 'vz-reg-status') { S.reg.status = ev.target.value; S.reg.page = 1; loadRegister(); }
    else if (id === 'vz-reg-ps') { S.reg.ps = parseInt(ev.target.value, 10) || 25; S.reg.page = 1; loadRegister(); }
    else if (id === 'vz-compare') { S.compare = ev.target.checked; if (S.compare) { loadCompare(); } else { S.vatPrev = {}; renderVat(); } }
  });
  V.addEventListener('input', function (ev) {
    if (ev.target.id === 'vz-reg-search') {
      var v = ev.target.value; clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { S.reg.search = v.trim(); S.reg.page = 1; loadRegister(); }, 350);
    }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && S.M) { closeModal(); } });

  /* ------------------------------------------------------------------ init */
  var ALLOWED_ROLES = ['System Manager', 'CEO', 'Internal Controller', 'Accounts Manager', 'Dashboard Manager'];
  function roleOk() {
    try {
      if (frappe.session && frappe.session.user === 'Administrator') { return true; }
      var ur = frappe.user_roles || [];
      return ALLOWED_ROLES.some(function (r) { return ur.indexOf(r) >= 0; });
    } catch (e) { return false; }
  }
  setPeriod('month');
  applyLang();
  showTab('overview');
  if (!roleOk()) {
    $('#vz-p-overview').innerHTML = '<div class="vz-note n-red">' + esc(t('restricted')) + '</div>';
    $('#vz-refresh').disabled = true;
  } else { loadAll(); }
})();


/* ===== Withholding Tax tab (added 2026-11-04). Read-only; permitted Frappe APIs only (get_list, get_balance_on); no Server Script. ===== */
(function () {
  'use strict';
  var root = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
  var V = root.querySelector('#vz');
  if (!V || V.__whtInit) { return; }
  var nav = V.querySelector('.vz-tabs'), main = V.querySelector('.vz-main');
  if (!nav || !main) { return; }
  V.__whtInit = true;

  var ALLOWED_ROLES = ['System Manager', 'CEO', 'Internal Controller', 'Accounts Manager', 'Dashboard Manager'];
  var PAGE = 500, ROW_CAP = 5000, CTX_CHUNK = 80, CTX_LIMIT = 5000, TIMEOUT = 60000;
  var WHT_LIKE = ['%with holding tax%', '%withholding tax%', '%withhold%', '%wht%'];
  var MEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MAR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  var I18N = {
    en: {
      tab: 'Withholding Tax', title: 'Withholding Tax (WHT)', sub: 'General Ledger view of the WHT liability: recorded, paid and outstanding, by company, account and supplier',
      restricted: 'Access to this section is limited to authorised finance roles.', loading: 'Loading withholding tax data...',
      f_company: 'Company', all_co: 'All companies', f_from: 'From date', f_to: 'To date', f_acc: 'GL account', all_acc: 'All WHT accounts', f_sup: 'Supplier', all_sup: 'All suppliers',
      sup_none: 'Unassigned (no supplier link)', sup_multi: 'Multiple suppliers', p_year: 'This year', p_last: 'Last year', p_12m: 'Last 12 months', p_all: 'All history',
      refresh: 'Refresh', updated: 'Last updated', never: 'not yet', retry: 'Retry',
      k_rec: 'Total WHT Recorded', k_paid: 'Total WHT Paid', k_bal: 'WHT GL Balance', k_out: 'Outstanding WHT Payable', k_cnt: 'WHT Transaction Count', k_adj: 'WHT Adjustments', na: 'Not Available',
      s_rec: 'Credit entries in period: {n}', s_recb: 'incl. {x} on bank/cash-linked credits (possible reversals)', s_paid: 'Bank/cash-linked debits: {n} (settlement not confirmed)',
      s_bal: 'Opening {o} / period net {p}', s_out: 'Reconciled credit balance, not necessarily overdue', s_over: 'Net debit balance (advance / overpaid)', s_cnt: 'GL entries in period',
      s_adj: 'Debits with no bank/cash link: {n}', s_noadj: 'No adjustments in period',
      na_cls: 'Debit classification could not be verified', na_trunc: 'Too many rows to verify in one load', na_sup: 'Not defined per supplier', na_recon: 'Could not be reconciled to get_balance_on', na_err: 'Data unavailable',
      sec_over: 'WHT Overview', sec_co: 'WHT by Company', sec_acc: 'WHT by GL Account', sec_sup: 'WHT by Supplier', sec_trend: 'WHT Trends', sec_tx: 'WHT Transaction Details',
      r_open: 'Opening balance', r_rec: 'Recorded (credits)', r_paid: 'Paid (bank/cash-linked)', r_adj: 'Adjustments', r_deb: 'Debits (unclassified)', r_close: 'Closing balance',
      r_ok: 'Reconciled to ERPNext get_balance_on', r_bad: 'Difference to get_balance_on - investigate', r_unv: 'Not verified', r_liab: 'Credit balance = liability to the tax authority',
      c_company: 'Company', c_account: 'GL account', c_open: 'Opening', c_dr: 'Debit', c_cr: 'Credit', c_close: 'Closing (credit)', c_cnt: 'Entries', c_paid: 'Paid', c_adj: 'Adjust.', c_check: 'GL check',
      c_supplier: 'Supplier', c_vouchers: 'Vouchers', c_net: 'Net (Cr-Dr)', c_last: 'Last posting', c_date: 'Posting date', c_vtype: 'Voucher type', c_vno: 'Voucher no.', c_class: 'Type',
      cl_rec: 'Recorded', cl_paid: 'Paid (bank/cash)', cl_adj: 'Adjustment', cl_deb: 'Debit', cl_zero: 'Zero',
      search: 'Search...', per_page: 'Rows', showing: 'Showing {a}-{b} of {n}', prev: 'Previous', next: 'Next', export: 'Export CSV',
      empty: 'No records match.', empty_tx: 'No WHT transactions for the selected company, account and period.', empty_acc: 'No WHT liability account was found (or none is permitted for your user).',
      empty_sup: 'No supplier-linked WHT in this period.', empty_chart: 'No WHT activity in this period to chart.', view_all: 'All transactions', view_rec: 'Recorded (credits)', view_paid: 'Paid (bank/cash-linked debits)', view_adj: 'Adjustments', view_bal: 'Ledger: opening balance, period entries, closing balance',
      showing_view: 'Showing', clear: 'Clear', month: 'Month', ch_act: 'Monthly WHT activity', ch_bal: 'Month-end WHT liability balance', ch_na: 'Not available with a supplier filter',
      lg_rec: 'Recorded', lg_paid: 'Paid (bank/cash)', lg_adj: 'Adjustments', lg_deb: 'Debits', lg_bal: 'Closing balance',
      n_trunc: 'More than {n} entries matched; detail tables and classification are limited, totals still come from GL aggregates.', n_mismatch: 'Row detail did not agree with GL totals (data changed during load). Press Refresh.',
      n_ctx: 'Voucher context was incomplete, so Paid / Adjustment classification is not shown.', n_mixed: 'Companies in scope use different currencies, so totals are not combined.',
      n_sup: 'Supplier filter active: balances are not defined per supplier and are not shown.', n_scope: 'Scope', n_range: 'From date is after To date.', n_nopay: 'Not a ZATCA settlement confirmation: classification is based on the Journal Entry posting a bank or cash account.',
      m_title: 'How figures are calculated',
      m_1: 'Source: GL Entry on WHT liability accounts discovered at run time (non-group Liability accounts whose name contains withholding / with holding tax / WHT), cancelled entries excluded.',
      m_2: 'Closing balance = opening balance + credits - debits (credit shown positive). Every account is checked against ERPNext get_balance_on; unverified balances show Not Available.',
      m_3: 'Paid = debit entries whose voucher also credits a Bank/Cash account. Adjustments = other debits. Neither is proof of settlement with the tax authority.',
      m_4: 'Supplier comes from the Supplier party on the same voucher; entries without one are Unassigned. Period figures are shown separately from cumulative balances.',
      err_timeout: 'The request timed out', err_perm: 'You do not have permission to read this data', err_generic: 'Request failed', err_section: 'Could not load WHT data'
    },
    ar: {
      tab: 'ضريبة الاستقطاع', title: 'ضريبة الاستقطاع (WHT)', sub: 'عرض دفتر الأستاذ لالتزام ضريبة الاستقطاع: المسجّل والمسدّد والمستحق، حسب الشركة والحساب والمورد',
      restricted: 'الوصول إلى هذا القسم مقتصر على أدوار المالية المصرّح لها.', loading: 'جارٍ تحميل بيانات ضريبة الاستقطاع...',
      f_company: 'الشركة', all_co: 'جميع الشركات', f_from: 'من تاريخ', f_to: 'إلى تاريخ', f_acc: 'حساب الأستاذ', all_acc: 'جميع حسابات الاستقطاع', f_sup: 'المورد', all_sup: 'جميع الموردين',
      sup_none: 'غير مرتبط بمورد', sup_multi: 'عدة موردين', p_year: 'هذه السنة', p_last: 'السنة الماضية', p_12m: 'آخر 12 شهراً', p_all: 'كل الفترات',
      refresh: 'تحديث', updated: 'آخر تحديث', never: 'لم يتم بعد', retry: 'إعادة المحاولة',
      k_rec: 'إجمالي الاستقطاع المسجّل', k_paid: 'إجمالي الاستقطاع المسدّد', k_bal: 'رصيد دفتر الأستاذ', k_out: 'الاستقطاع المستحق غير المسدّد', k_cnt: 'عدد حركات الاستقطاع', k_adj: 'تسويات الاستقطاع', na: 'غير متاح',
      s_rec: 'القيود الدائنة في الفترة: {n}', s_recb: 'منها {x} دائن مرتبط بالبنك/النقد (احتمال عكس)', s_paid: 'مدين مرتبط بالبنك/النقد: {n} (السداد غير مؤكد)',
      s_bal: 'افتتاحي {o} / صافي الفترة {p}', s_out: 'رصيد دائن مطابق، وليس بالضرورة متأخراً', s_over: 'رصيد مدين صافٍ (دفعة مقدمة / زيادة سداد)', s_cnt: 'قيود الأستاذ في الفترة',
      s_adj: 'مدين غير مرتبط بالبنك/النقد: {n}', s_noadj: 'لا توجد تسويات في الفترة',
      na_cls: 'تعذّر التحقق من تصنيف المدين', na_trunc: 'عدد الصفوف أكبر من أن يُتحقق منه في تحميل واحد', na_sup: 'غير محدد حسب المورد', na_recon: 'تعذّرت المطابقة مع get_balance_on', na_err: 'البيانات غير متاحة',
      sec_over: 'نظرة عامة على الاستقطاع', sec_co: 'الاستقطاع حسب الشركة', sec_acc: 'الاستقطاع حسب حساب الأستاذ', sec_sup: 'الاستقطاع حسب المورد', sec_trend: 'اتجاهات الاستقطاع', sec_tx: 'تفاصيل حركات الاستقطاع',
      r_open: 'الرصيد الافتتاحي', r_rec: 'المسجّل (دائن)', r_paid: 'المسدّد (مرتبط بالبنك/النقد)', r_adj: 'التسويات', r_deb: 'المدين (غير مصنّف)', r_close: 'الرصيد الختامي',
      r_ok: 'مطابق لـ get_balance_on في ERPNext', r_bad: 'فرق عن get_balance_on - يلزم التحقق', r_unv: 'غير محقق', r_liab: 'الرصيد الدائن = التزام تجاه الجهة الضريبية',
      c_company: 'الشركة', c_account: 'حساب الأستاذ', c_open: 'افتتاحي', c_dr: 'مدين', c_cr: 'دائن', c_close: 'ختامي (دائن)', c_cnt: 'القيود', c_paid: 'مسدّد', c_adj: 'تسويات', c_check: 'مطابقة الأستاذ',
      c_supplier: 'المورد', c_vouchers: 'المستندات', c_net: 'الصافي (دائن-مدين)', c_last: 'آخر ترحيل', c_date: 'تاريخ الترحيل', c_vtype: 'نوع المستند', c_vno: 'رقم المستند', c_class: 'النوع',
      cl_rec: 'مسجّل', cl_paid: 'مسدّد (بنك/نقد)', cl_adj: 'تسوية', cl_deb: 'مدين', cl_zero: 'صفر',
      search: 'بحث...', per_page: 'الصفوف', showing: 'عرض {a}-{b} من {n}', prev: 'السابق', next: 'التالي', export: 'تصدير CSV',
      empty: 'لا توجد سجلات مطابقة.', empty_tx: 'لا توجد حركات استقطاع للشركة والحساب والفترة المحددة.', empty_acc: 'لم يُعثر على حساب التزام ضريبة استقطاع (أو غير مصرّح به لمستخدمك).',
      empty_sup: 'لا توجد ضريبة استقطاع مرتبطة بموردين في هذه الفترة.', empty_chart: 'لا توجد حركة استقطاع في هذه الفترة لعرضها.', view_all: 'جميع الحركات', view_rec: 'المسجّل (دائن)', view_paid: 'المسدّد (مدين مرتبط بالبنك/النقد)', view_adj: 'التسويات', view_bal: 'الأستاذ: الرصيد الافتتاحي وقيود الفترة والرصيد الختامي',
      showing_view: 'المعروض', clear: 'مسح', month: 'الشهر', ch_act: 'نشاط الاستقطاع الشهري', ch_bal: 'رصيد التزام الاستقطاع في نهاية كل شهر', ch_na: 'غير متاح مع فلتر المورد',
      lg_rec: 'مسجّل', lg_paid: 'مسدّد (بنك/نقد)', lg_adj: 'تسويات', lg_deb: 'مدين', lg_bal: 'الرصيد الختامي',
      n_trunc: 'تجاوز عدد القيود {n}؛ جداول التفاصيل والتصنيف محدودة، بينما الإجماليات من تجميع الأستاذ.', n_mismatch: 'تفاصيل الصفوف لا تطابق إجماليات الأستاذ (تغيّرت البيانات أثناء التحميل). اضغط تحديث.',
      n_ctx: 'سياق المستندات غير مكتمل، لذلك لا يُعرض تصنيف المسدّد / التسويات.', n_mixed: 'الشركات ضمن النطاق تستخدم عملات مختلفة، لذلك لا تُجمع الإجماليات.',
      n_sup: 'فلتر المورد مفعّل: الأرصدة غير محددة حسب المورد ولذلك لا تُعرض.', n_scope: 'النطاق', n_range: 'تاريخ البداية بعد تاريخ النهاية.', n_nopay: 'ليس تأكيداً للسداد إلى الهيئة: التصنيف مبني على قيد اليومية الذي يرحّل حساب بنك أو نقد.',
      m_title: 'كيف تُحسب الأرقام',
      m_1: 'المصدر: قيود الأستاذ (GL Entry) على حسابات التزام الاستقطاع المكتشفة وقت التشغيل (حسابات التزامات غير مجمّعة يتضمن اسمها ضريبة الاستقطاع / WHT)، مع استبعاد القيود الملغاة.',
      m_2: 'الرصيد الختامي = الافتتاحي + الدائن - المدين (الدائن موجب). تتم مطابقة كل حساب مع get_balance_on في ERPNext، والأرصدة غير المحققة تظهر غير متاح.',
      m_3: 'المسدّد = قيود مدينة يرحّل مستندها أيضاً دائناً على حساب بنك/نقد. التسويات = بقية القيود المدينة. وليس أي منهما إثباتاً للسداد إلى الجهة الضريبية.',
      m_4: 'المورد يؤخذ من طرف المورد في المستند نفسه، والقيود بدونه تظهر غير مرتبطة. وتُعرض أرقام الفترة منفصلة عن الأرصدة التراكمية.',
      err_timeout: 'انتهت مهلة الطلب', err_perm: 'ليست لديك صلاحية قراءة هذه البيانات', err_generic: 'فشل الطلب', err_section: 'تعذّر تحميل بيانات الاستقطاع'
    }
  };

  var S = {
    lang: 'en', co: '', from: '', to: '', acc: '', sup: '', preset: 'year', k: 'all', mon: '',
    accounts: [], companies: [], data: null, st: 'idle', err: '', stamp: null, rid: 0, active: false, started: false, supNames: {},
    tb: { co: { q: '', page: 1, ps: 10 }, acc: { q: '', page: 1, ps: 10 }, sup: { q: '', page: 1, ps: 10 }, tx: { q: '', page: 1, ps: 25 } }
  };
  var TBL = {};

  function $(s) { return root.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
  function lang() { return V.getAttribute('data-lang') === 'ar' ? 'ar' : 'en'; }
  function t(k) { var d = I18N[S.lang] || I18N.en; return d[k] !== undefined ? d[k] : (I18N.en[k] !== undefined ? I18N.en[k] : k); }
  function tf(k, m) { var s = t(k); Object.keys(m).forEach(function (x) { s = s.split('{' + x + '}').join(m[x]); }); return s; }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function ltr(s) { return '<bdi dir="ltr">' + esc(s) + '</bdi>'; }
  function r2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
  var NF = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function money(x) { return NF.format(r2(x)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(s, n) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return ymd(d); }
  function setPreset(p) {
    var now = new Date(), y = now.getFullYear();
    S.preset = p;
    if (p === 'year') { S.from = y + '-01-01'; S.to = ymd(now); }
    else if (p === 'last') { S.from = (y - 1) + '-01-01'; S.to = (y - 1) + '-12-31'; }
    else if (p === '12m') { var d = new Date(now); d.setFullYear(y - 1); d.setDate(d.getDate() + 1); S.from = ymd(d); S.to = ymd(now); }
    else if (p === 'all') { S.from = ''; S.to = ymd(now); }
  }
  function monthsBetween(a, b) {
    var out = [], y = +a.slice(0, 4), m = +a.slice(5, 7), ey = +b.slice(0, 4), em = +b.slice(5, 7);
    while ((y < ey || (y === ey && m <= em)) && out.length < 600) { out.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } }
    return out;
  }
  function monthLabel(m) { var names = S.lang === 'ar' ? MAR : MEN; return names[+m.slice(5, 7) - 1] + ' ' + m.slice(2, 4); }
  function niceMax(v) { if (v <= 0) { return 1; } var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function slug(vt) { try { if (frappe.router && frappe.router.slug) { return frappe.router.slug(vt); } } catch (e) { /* fall through */ } return String(vt).toLowerCase().replace(/ /g, '-'); }
  function vLink(vt, vn) { return '<a class="wh-link" href="/app/' + esc(slug(vt)) + '/' + encodeURIComponent(vn) + '" target="_blank" rel="noopener">' + esc(vn) + '</a>'; }
  function allowed() { try { return (frappe.user_roles || []).some(function (r) { return ALLOWED_ROLES.indexOf(r) > -1; }); } catch (e) { return false; } }

  /* ------------------------------------------------------------------ data layer */
  function errText(x) {
    try {
      var j = x && x.responseJSON;
      if (j && j._server_messages) { var m = JSON.parse(j._server_messages); return m.map(function (s) { try { return JSON.parse(s).message; } catch (e) { return s; } }).join(' ').replace(/<[^>]+>/g, ''); }
      if (x && x.status === 403) { return t('err_perm'); }
      if (j && j.exception) { return String(j.exception).split('\n')[0]; }
      if (x && x.status) { return 'HTTP ' + x.status; }
    } catch (e) { /* ignore */ }
    return t('err_generic');
  }
  function call(method, args) {
    return new Promise(function (resolve, reject) {
      var done = false, tm = setTimeout(function () { if (!done) { done = true; reject(new Error(t('err_timeout'))); } }, TIMEOUT);
      frappe.call({
        method: method, type: 'POST', args: args, silent: true,
        callback: function (r) { if (done) { return; } done = true; clearTimeout(tm); resolve(r ? r.message : undefined); },
        error: function (x) { if (done) { return; } done = true; clearTimeout(tm); reject(new Error(errText(x))); }
      });
    });
  }
  function list(doctype, fields, filters, o) {
    o = o || {};
    var a = { doctype: doctype, fields: fields, filters: filters, limit_page_length: o.limit || PAGE, limit_start: o.start || 0 };
    if (o.group_by) { a.group_by = o.group_by; }
    if (o.order_by) { a.order_by = o.order_by; }
    if (o.or_filters) { a.or_filters = o.or_filters; }
    if (o.parent) { a.parent = o.parent; }
    return call('frappe.client.get_list', a).then(function (r) { return r || []; });
  }

  function discover() {
    var or = WHT_LIKE.map(function (p) { return ['name', 'like', p]; });
    return list('Account', ['name', 'company', 'account_type', 'root_type', 'disabled'], [['is_group', '=', 0], ['root_type', '=', 'Liability']], { or_filters: or, limit: 500, order_by: 'company asc, name asc' }).then(function (a) {
      S.accounts = a;
      var seen = {}; a.forEach(function (x) { seen[x.company] = 1; });
      var names = Object.keys(seen).sort();
      if (!names.length) { S.companies = []; return; }
      return list('Company', ['name', 'abbr', 'default_currency'], [['name', 'in', names]], { limit: 200 }).catch(function () { return []; }).then(function (c) {
        S.companies = names.map(function (n) { var r = c.filter(function (z) { return z.name === n; })[0] || {}; return { name: n, abbr: r.abbr || '', cur: r.default_currency || '' }; });
      });
    });
  }
  function scopeAccounts() {
    return S.accounts.filter(function (a) { return (!S.co || a.company === S.co) && (!S.acc || a.name === S.acc); });
  }
  var ROW_FIELDS = ['name', 'posting_date', 'company', 'account', 'voucher_type', 'voucher_no', 'debit', 'credit'];
  function pagedRows(filters) {
    var all = [], seen = {};
    function step(start) {
      return list('GL Entry', ROW_FIELDS, filters, { limit: PAGE, start: start, order_by: 'posting_date asc, creation asc, name asc' }).then(function (r) {
        r.forEach(function (x) { if (!seen[x.name]) { seen[x.name] = 1; all.push(x); } });
        if (r.length < PAGE) { return { rows: all, truncated: false }; }
        if (all.length >= ROW_CAP) { return { rows: all, truncated: true }; }
        return step(start + PAGE);
      });
    }
    return step(0);
  }
  function fetchCtx(rows) {
    var seen = {}, vs = [], types = {};
    rows.forEach(function (r) { if (!seen[r.voucher_type + '|' + r.voucher_no]) { seen[r.voucher_type + '|' + r.voucher_no] = 1; vs.push(r.voucher_no); types[r.voucher_type] = 1; } });
    var chunks = []; for (var i = 0; i < vs.length; i += CTX_CHUNK) { chunks.push(vs.slice(i, i + CTX_CHUNK)); }
    var map = {}, incomplete = false, tl = Object.keys(types);
    return chunks.reduce(function (p, ch) {
      return p.then(function () {
        return list('GL Entry', ['voucher_type', 'voucher_no', 'account', 'party_type', 'party', 'debit', 'credit'], [['voucher_no', 'in', ch], ['voucher_type', 'in', tl], ['is_cancelled', '=', 0]], { limit: CTX_LIMIT }).then(function (r) {
          if (r.length >= CTX_LIMIT) { incomplete = true; }
          r.forEach(function (l) { var k = l.voucher_type + '|' + l.voucher_no; (map[k] = map[k] || []).push(l); });
        });
      });
    }, Promise.resolve()).then(function () { return { map: map, incomplete: incomplete }; });
  }
  function balOn(a, date) {
    return call('erpnext.accounts.utils.get_balance_on', { account: a.name, date: date, company: a.company }).then(function (v) { return (v === undefined || v === null) ? null : Number(v); }).catch(function () { return null; });
  }
  function fetchAll() {
    var acs = scopeAccounts();
    var D = { accs: [], rows: [], cur: '', mixed: false, truncated: false, clsOk: true, aggMismatch: false, from: S.from, to: S.to, noAccounts: !acs.length };
    var cos = {}; acs.forEach(function (a) { cos[a.company] = 1; });
    var cur = {}; Object.keys(cos).forEach(function (c) { var o = S.companies.filter(function (z) { return z.name === c; })[0]; if (o && o.cur) { cur[o.cur] = 1; } });
    var cl = Object.keys(cur); D.cur = cl.length === 1 ? cl[0] : ''; D.mixed = cl.length > 1;
    if (!acs.length) { return Promise.resolve(D); }
    var names = acs.map(function (a) { return a.name; });
    var base = [['is_cancelled', '=', 0], ['account', 'in', names]];
    var per = base.slice(); if (S.from) { per.push(['posting_date', '>=', S.from]); } per.push(['posting_date', '<=', S.to]);
    var AG = ['account', 'sum(debit) as dr', 'sum(credit) as cr', 'count(name) as n'];
    var pOpen = S.from ? list('GL Entry', AG, base.concat([['posting_date', '<', S.from]]), { group_by: 'account', limit: 500 }) : Promise.resolve([]);
    var pPer = list('GL Entry', AG, per, { group_by: 'account', limit: 500 });
    var pRows = pagedRows(per);
    var pBank = list('Account', ['name'], [['account_type', 'in', ['Bank', 'Cash']], ['company', 'in', Object.keys(cos)]], { limit: 3000 }).catch(function () { return null; });
    var pClose = Promise.all(acs.map(function (a) { return balOn(a, S.to); }));
    var pOpenB = Promise.all(acs.map(function (a) { return S.from ? balOn(a, addDays(S.from, -1)) : Promise.resolve(0); }));
    return Promise.all([pOpen, pPer, pRows, pBank, pClose, pOpenB]).then(function (x) {
      var om = {}, pm = {};
      x[0].forEach(function (g) { om[g.account] = g; }); x[1].forEach(function (g) { pm[g.account] = g; });
      D.accs = acs.map(function (a, i) {
        var o = om[a.name] || {}, p = pm[a.name] || {};
        var open = r2(r2(o.cr) - r2(o.dr)), close = r2(open + r2(p.cr) - r2(p.dr));
        return { name: a.name, company: a.company, disabled: a.disabled, open: open, dr: r2(p.dr), cr: r2(p.cr), n: +p.n || 0, close: close,
          okClose: x[4][i] !== null && Math.abs(r2(-x[4][i]) - close) < 0.01, okOpen: x[5][i] !== null && Math.abs(r2(-x[5][i]) - open) < 0.01 };
      });
      D.rows = x[2].rows; D.truncated = x[2].truncated;
      if (!D.truncated) {
        var sd = 0, sc = 0, ad = 0, ac = 0;
        D.rows.forEach(function (r) { sd += r.debit; sc += r.credit; });
        D.accs.forEach(function (a) { ad += a.dr; ac += a.cr; });
        if (Math.abs(r2(sd) - r2(ad)) > 0.01 || Math.abs(r2(sc) - r2(ac)) > 0.01 || D.rows.length !== D.accs.reduce(function (s, a) { return s + a.n; }, 0)) { D.aggMismatch = true; }
      }
      var bank = {}; if (x[3] === null) { D.clsOk = false; } else { x[3].forEach(function (b) { bank[b.name] = 1; }); }
      if (!D.rows.length) { return D; }
      return fetchCtx(D.rows).then(function (ctx) {
        var wht = {}; S.accounts.forEach(function (a) { wht[a.name] = 1; });
        if (ctx.incomplete) { D.clsOk = false; }
        D.rows.forEach(function (r) {
          var L = ctx.map[r.voucher_type + '|' + r.voucher_no] || [], other = L.filter(function (l) { return !wht[l.account]; }), sp = {};
          L.forEach(function (l) { if (l.party_type === 'Supplier' && l.party) { sp[l.party] = 1; } });
          r.sups = Object.keys(sp);
          var bcr = other.some(function (l) { return l.credit > 0 && bank[l.account]; }), bdr = other.some(function (l) { return l.debit > 0 && bank[l.account]; });
          r.cls = r.debit > 0 ? (bcr ? 'paid' : 'adj') : (r.credit > 0 ? 'rec' : 'zero');
          r.bankCr = r.credit > 0 && bdr;
          r.net = r2(r.credit - r.debit);
        });
        return D;
      }).catch(function () { D.clsOk = false; D.rows.forEach(function (r) { r.sups = []; r.cls = r.debit > 0 ? 'deb' : 'rec'; r.net = r2(r.credit - r.debit); }); return D; });
    });
  }
  function loadSupNames(D) {
    var ids = {}; D.rows.forEach(function (r) { (r.sups || []).forEach(function (s) { if (!S.supNames[s]) { ids[s] = 1; } }); });
    var l = Object.keys(ids); if (!l.length) { return Promise.resolve(); }
    return list('Supplier', ['name', 'supplier_name'], [['name', 'in', l]], { limit: 1000 }).then(function (r) { r.forEach(function (s) { S.supNames[s.name] = s.supplier_name || s.name; }); }).catch(function () { l.forEach(function (s) { S.supNames[s] = s; }); });
  }
  function load() {
    if (!allowed()) { paint(); return Promise.resolve(); }
    if (S.from && S.to && S.from > S.to) { S.st = 'err'; S.err = t('n_range'); paint(); return Promise.resolve(); }
    var id = ++S.rid; S.st = 'loading'; S.err = ''; paint();
    return discover().then(function () {
      if (S.co && !S.accounts.some(function (a) { return a.company === S.co; })) { S.co = ''; }
      if (S.acc && !S.accounts.some(function (a) { return a.name === S.acc; })) { S.acc = ''; }
      return fetchAll();
    }).then(function (D) {
      if (id !== S.rid) { return; }
      return loadSupNames(D).then(function () { if (id !== S.rid) { return; } S.data = D; S.st = 'ok'; S.stamp = new Date(); if (S.sup && !supOptions().some(function (o) { return o.v === S.sup; })) { S.sup = ''; } paint(); });
    }).catch(function (e) { if (id !== S.rid) { return; } S.st = 'err'; S.err = e && e.message ? e.message : t('err_generic'); paint(); });
  }

  /* ------------------------------------------------------------------ model */
  function supKey(r) { var s = r.sups || []; return s.length === 0 ? '__none__' : (s.length > 1 ? '__multi__' : s[0]); }
  function supLabel(k) { if (k === '__none__') { return t('sup_none'); } if (k === '__multi__') { return t('sup_multi'); } var n = S.supNames[k]; return n && n !== k ? k + ' - ' + n : k; }
  function supOptions() {
    var D = S.data; if (!D) { return []; }
    var m = {}; D.rows.forEach(function (r) { m[supKey(r)] = 1; });
    var out = Object.keys(m).filter(function (k) { return k.indexOf('__') !== 0; }).sort().map(function (k) { return { v: k, l: supLabel(k) }; });
    if (m.__multi__) { out.push({ v: '__multi__', l: t('sup_multi') }); }
    if (m.__none__) { out.push({ v: '__none__', l: t('sup_none') }); }
    return out;
  }
  function sumBy(rows, f) { var s = 0; rows.forEach(function (r) { s += f(r); }); return r2(s); }
  function sumAcc(accs, k) { var s = 0; accs.forEach(function (a) { s += a[k]; }); return r2(s); }
  function model() {
    var D = S.data, M = {}, supOn = !!S.sup, mixed = D.mixed;
    M.supOn = supOn; M.rowsOk = !D.truncated && !D.aggMismatch; M.clsOk = D.clsOk && M.rowsOk && !D.noAccounts;
    M.rs = supOn ? D.rows.filter(function (r) { return supKey(r) === S.sup; }) : D.rows;
    var rs = M.rs;
    function nz(v) { return mixed ? null : v; }
    M.cnt = nz(supOn ? (M.rowsOk ? rs.length : null) : D.accs.reduce(function (s, a) { return s + a.n; }, 0));
    M.rec = nz(supOn ? (M.rowsOk ? sumBy(rs, function (r) { return r.credit; }) : null) : sumAcc(D.accs, 'cr'));
    M.deb = nz(supOn ? (M.rowsOk ? sumBy(rs, function (r) { return r.debit; }) : null) : sumAcc(D.accs, 'dr'));
    M.paid = nz(M.clsOk ? sumBy(rs, function (r) { return r.cls === 'paid' ? r.debit : 0; }) : null);
    M.adj = nz(M.clsOk ? sumBy(rs, function (r) { return r.cls === 'adj' ? r.debit : 0; }) : null);
    M.nPaid = M.clsOk ? rs.filter(function (r) { return r.cls === 'paid'; }).length : 0;
    M.nAdj = M.clsOk ? rs.filter(function (r) { return r.cls === 'adj'; }).length : 0;
    M.nRec = rs.filter(function (r) { return r.credit > 0; }).length;
    M.recBank = M.clsOk ? sumBy(rs, function (r) { return r.bankCr ? r.credit : 0; }) : 0;
    var allClose = D.accs.length > 0 && D.accs.every(function (a) { return a.okClose; });
    var allOpen = D.accs.every(function (a) { return a.okOpen; });
    M.reconClose = allClose; M.reconOpen = allOpen;
    M.open = nz(supOn ? null : sumAcc(D.accs, 'open'));
    M.close = nz(supOn || !allClose ? null : sumAcc(D.accs, 'close'));
    M.out = M.close === null ? null : Math.max(M.close, 0);
    M.net = (M.rec !== null && M.deb !== null) ? r2(M.rec - M.deb) : null;
    return M;
  }
  function why(M, kind) {
    var D = S.data;
    if (D.mixed) { return t('n_mixed'); }
    if (kind === 'cls') { return D.truncated ? t('na_trunc') : (D.aggMismatch ? t('n_mismatch') : t('na_cls')); }
    if (kind === 'bal') { return M.supOn ? t('na_sup') : t('na_recon'); }
    if (kind === 'sup') { return D.truncated ? t('na_trunc') : t('na_err'); }
    return t('na_err');
  }
  function cur() { return S.data && S.data.cur ? S.data.cur + ' ' : ''; }
  function cell(x) { return x === null || x === undefined ? '<span class="wh-na">' + esc(t('na')) + '</span>' : esc(money(x)); }
  function chk(a) { return a ? '<span class="wh-badge ok" title="' + esc(t('r_ok')) + '">OK</span>' : '<span class="wh-badge bad" title="' + esc(t('r_bad')) + '">!</span>'; }

  /* ------------------------------------------------------------------ KPI cards */
  function kpiBtn(k, label, valText, isNa, sub, tone) {
    var cls = 'vz-kpi wh-kpi' + (!isNa && tone ? ' t-' + tone : '') + (isNa ? ' is-na' : '') + (S.k === k ? ' is-sel' : '');
    return '<button type="button" class="' + cls + '" data-wact="kpi" data-k="' + k + '" aria-label="' + esc(label) + '"><span class="k-label">' + esc(label) + '</span><span class="k-value">' + esc(isNa ? t('na') : valText) + '</span><span class="k-sub">' + esc(sub) + '</span></button>';
  }
  function kpis(M) {
    var c = cur(), h = '';
    h += kpiBtn('rec', t('k_rec'), c + money(M.rec), M.rec === null, M.rec === null ? why(M, 'sup') : tf('s_rec', { n: M.rowsOk ? M.nRec : '' }).replace('  ', ' ') + (M.recBank > 0 ? ' - ' + tf('s_recb', { x: money(M.recBank) }) : ''), 'blue');
    h += kpiBtn('paid', t('k_paid'), c + money(M.paid), M.paid === null, M.paid === null ? why(M, 'cls') : tf('s_paid', { n: M.nPaid }), 'green');
    h += kpiBtn('bal', t('k_bal'), c + money(M.close), M.close === null, M.close === null ? why(M, 'bal') : tf('s_bal', { o: money(M.open), p: money(M.net) }), '');
    var over = M.close !== null && M.close < 0;
    h += kpiBtn('out', t('k_out'), c + money(M.out), M.out === null, M.out === null ? why(M, 'bal') : (over ? t('s_over') + ': ' + money(-M.close) : t('s_out')), 'amber');
    h += kpiBtn('cnt', t('k_cnt'), M.cnt === null ? '' : String(M.cnt), M.cnt === null, t('s_cnt'), '');
    h += kpiBtn('adj', t('k_adj'), c + money(M.adj), M.adj === null, M.adj === null ? why(M, 'cls') : (M.nAdj ? tf('s_adj', { n: M.nAdj }) : t('s_noadj')), 'red');
    return '<div class="vz-grid wh-kpis">' + h + '</div>';
  }

  /* ------------------------------------------------------------------ tables */
  function tbl(id, cols, rows, o) {
    o = o || {};
    var st = S.tb[id], q = (st.q || '').toLowerCase();
    var f = q ? rows.filter(function (r) { return o.text(r).toLowerCase().indexOf(q) > -1; }) : rows;
    var pages = Math.max(1, Math.ceil(f.length / st.ps)); if (st.page > pages) { st.page = pages; }
    var s = (st.page - 1) * st.ps, pg = f.slice(s, s + st.ps);
    var head = '<tr>' + cols.map(function (c) { return '<th class="' + (c.cls || '') + '">' + esc(c.label) + '</th>'; }).join('') + '</tr>';
    var body = pg.length ? pg.map(function (r) { return '<tr' + (o.rowAttr ? o.rowAttr(r) : '') + '>' + cols.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.f(r) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + cols.length + '" class="wh-empty-cell">' + esc(o.empty || t('empty')) + '</td></tr>';
    var foot = o.foot && f.length ? '<tfoot>' + o.foot(f) + '</tfoot>' : '';
    var pager = '<div class="wh-pager"><span class="wh-muted">' + esc(f.length ? tf('showing', { a: s + 1, b: Math.min(s + st.ps, f.length), n: f.length }) : '') + '</span><span class="wh-pgbtns">' +
      '<button type="button" class="vz-btn vz-btn-sm" data-wact="page" data-t="' + id + '" data-d="-1"' + (st.page <= 1 ? ' disabled' : '') + '>' + esc(t('prev')) + '</button>' +
      '<span class="wh-muted">' + st.page + ' / ' + pages + '</span>' +
      '<button type="button" class="vz-btn vz-btn-sm" data-wact="page" data-t="' + id + '" data-d="1"' + (st.page >= pages ? ' disabled' : '') + '>' + esc(t('next')) + '</button></span></div>';
    return '<div class="vz-tablewrap"><table class="wh-table"><thead>' + head + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div>' + pager;
  }
  function toolbar(id, extra) {
    var st = S.tb[id];
    return '<div class="wh-toolbar"><input type="search" class="wh-search" data-wsearch="' + id + '" placeholder="' + esc(t('search')) + '" value="' + esc(st.q) + '" aria-label="' + esc(t('search')) + '">' +
      '<label class="wh-ps"><span>' + esc(t('per_page')) + '</span><select data-wf="ps" data-t="' + id + '">' + [10, 25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (st.ps === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' + (extra || '') + '</div>';
    }
  function tbWrap(id) { return '<div data-tb="' + id + '">' + TBL[id]() + '</div>'; }
  function renderTb(id) { var el = panel.querySelector('[data-tb="' + id + '"]'); if (el && TBL[id]) { el.innerHTML = TBL[id](); } }
  function coLabel(n) { var c = S.companies.filter(function (z) { return z.name === n; })[0]; return c && c.abbr ? c.abbr + ' - ' + n : n; }
  function sec(title, inner, id) { return '<section class="wh-sec"' + (id ? ' data-wsec="' + id + '"' : '') + '><h3 class="vz-sec-title">' + esc(title) + '</h3>' + inner + '</section>'; }

  function buildCompany(M) {
    var D = S.data, names = S.co ? [S.co] : S.companies.map(function (c) { return c.name; });
    var rows = names.map(function (n) {
      var A = D.accs.filter(function (a) { return a.company === n; }), R = M.rs.filter(function (r) { return r.company === n; });
      var allOk = A.length && A.every(function (a) { return a.okClose; });
      return { n: n, open: (M.supOn || D.mixed) ? null : sumAcc(A, 'open'), cr: M.supOn ? (M.rowsOk ? sumBy(R, function (r) { return r.credit; }) : null) : sumAcc(A, 'cr'), dr: M.supOn ? (M.rowsOk ? sumBy(R, function (r) { return r.debit; }) : null) : sumAcc(A, 'dr'),
        paid: M.clsOk ? sumBy(R, function (r) { return r.cls === 'paid' ? r.debit : 0; }) : null, adj: M.clsOk ? sumBy(R, function (r) { return r.cls === 'adj' ? r.debit : 0; }) : null,
        close: (M.supOn || D.mixed || !allOk) ? null : sumAcc(A, 'close'), cnt: M.supOn ? R.length : sumAcc(A, 'n'), ok: !!allOk, hasAcc: A.length > 0 };
    });
    TBL.co = function () {
      return tbl('co', [
        { label: t('c_company'), f: function (r) { return '<button type="button" class="wh-linkbtn" data-wact="pick-co" data-v="' + esc(r.n) + '">' + ltr(coLabel(r.n)) + '</button>'; } },
        { label: t('c_open'), cls: 'wh-n', f: function (r) { return cell(r.open); } }, { label: t('c_cr'), cls: 'wh-n', f: function (r) { return cell(r.cr); } }, { label: t('c_dr'), cls: 'wh-n', f: function (r) { return cell(r.dr); } },
        { label: t('c_paid'), cls: 'wh-n', f: function (r) { return cell(r.paid); } }, { label: t('c_adj'), cls: 'wh-n', f: function (r) { return cell(r.adj); } },
        { label: t('c_close'), cls: 'wh-n wh-st', f: function (r) { return cell(r.close); } }, { label: t('c_cnt'), cls: 'wh-n', f: function (r) { return String(r.cnt); } },
        { label: t('c_check'), cls: 'wh-c', f: function (r) { return r.hasAcc ? chk(r.ok) : ''; } }
      ], rows, { text: function (r) { return coLabel(r.n); }, empty: t('empty_acc') });
    };
    return sec(t('sec_co'), toolbar('co') + tbWrap('co'));
  }
  function buildAccount(M) {
    var D = S.data;
    TBL.acc = function () {
      return tbl('acc', [
        { label: t('c_account'), f: function (a) { return '<button type="button" class="wh-linkbtn" data-wact="pick-acc" data-v="' + esc(a.name) + '">' + ltr(a.name) + '</button>' + (a.disabled ? ' <span class="wh-muted">(disabled)</span>' : ''); } },
        { label: t('c_company'), f: function (a) { return ltr(coLabel(a.company)); } },
        { label: t('c_open'), cls: 'wh-n', f: function (a) { return M.supOn ? cell(null) : cell(a.open); } }, { label: t('c_dr'), cls: 'wh-n', f: function (a) { return cell(a.dr); } }, { label: t('c_cr'), cls: 'wh-n', f: function (a) { return cell(a.cr); } },
        { label: t('c_close'), cls: 'wh-n wh-st', f: function (a) { return (M.supOn || !a.okClose) ? cell(null) : cell(a.close); } }, { label: t('c_cnt'), cls: 'wh-n', f: function (a) { return String(a.n); } },
        { label: t('c_check'), cls: 'wh-c', f: function (a) { return chk(a.okClose); } }
      ], D.accs, { text: function (a) { return a.name + ' ' + a.company; }, empty: t('empty_acc'), foot: function (f) {
        if (D.mixed) { return ''; }
        return '<tr><td colspan="2">Total</td><td class="wh-n">' + (M.supOn ? cell(null) : cell(sumAcc(f, 'open'))) + '</td><td class="wh-n">' + cell(sumAcc(f, 'dr')) + '</td><td class="wh-n">' + cell(sumAcc(f, 'cr')) + '</td><td class="wh-n wh-st">' + ((M.supOn || !f.every(function (a) { return a.okClose; })) ? cell(null) : cell(sumAcc(f, 'close'))) + '</td><td class="wh-n">' + sumAcc(f, 'n') + '</td><td></td></tr>';
      } });
    };
    return sec(t('sec_acc'), toolbar('acc') + tbWrap('acc'));
  }
  function buildSupplier(M) {
    var g = {};
    M.rs.forEach(function (r) { var k = supKey(r), o = g[k] || (g[k] = { k: k, cr: 0, dr: 0, v: {}, last: '' }); o.cr += r.credit; o.dr += r.debit; o.v[r.voucher_type + r.voucher_no] = 1; if (r.posting_date > o.last) { o.last = r.posting_date; } });
    var rows = Object.keys(g).map(function (k) { var o = g[k]; return { k: k, cr: r2(o.cr), dr: r2(o.dr), net: r2(o.cr - o.dr), vc: Object.keys(o.v).length, last: o.last }; });
    rows.sort(function (a, b) { var ra = a.k.indexOf('__') === 0 ? 1 : 0, rb = b.k.indexOf('__') === 0 ? 1 : 0; return ra - rb || b.cr - a.cr; });
    TBL.sup = function () {
      return tbl('sup', [
        { label: t('c_supplier'), f: function (r) { return '<button type="button" class="wh-linkbtn" data-wact="pick-sup" data-v="' + esc(r.k) + '">' + esc(supLabel(r.k)) + '</button>'; } },
        { label: t('c_vouchers'), cls: 'wh-n', f: function (r) { return String(r.vc); } }, { label: t('c_cr'), cls: 'wh-n', f: function (r) { return cell(r.cr); } }, { label: t('c_dr'), cls: 'wh-n', f: function (r) { return cell(r.dr); } },
        { label: t('c_net'), cls: 'wh-n wh-st', f: function (r) { return cell(r.net); } }, { label: t('c_last'), f: function (r) { return ltr(r.last); } }
      ], rows, { text: function (r) { return supLabel(r.k); }, empty: t('empty_sup') });
    };
    return sec(t('sec_sup'), (M.rowsOk ? '' : '<div class="vz-note n-amber">' + esc(t('na_trunc')) + '</div>') + toolbar('sup') + tbWrap('sup') + '<p class="wh-muted wh-small">' + esc(t('m_4')) + '</p>');
  }

  function periodText() { return (S.from || '...') + '  ->  ' + S.to; }
  function buildOverview(M) {
    var D = S.data, c = cur();
    function box(l, v, op, cls) { return (op ? '<span class="wh-op">' + op + '</span>' : '') + '<div class="wh-rf ' + (cls || '') + '"><span>' + esc(l) + '</span><b>' + (v === null ? '<span class="wh-na">' + esc(t('na')) + '</span>' : esc(c + money(v))) + '</b></div>'; }
    var mid = M.clsOk ? box(t('r_paid'), M.paid, '-') + box(t('r_adj'), M.adj, '-') : box(t('r_deb'), M.deb, '-');
    var roll = '<div class="wh-roll">' + box(t('r_open'), M.open, '') + box(t('r_rec'), M.rec, '+') + mid + box(t('r_close'), M.close, '=', 'strong') + '</div>';
    var st = M.supOn ? t('n_sup') : (M.reconClose ? t('r_ok') : (D.accs.length ? t('r_bad') : t('r_unv')));
    var act = {}; D.accs.forEach(function (a) { if (a.n > 0) { act[a.company] = 1; } });
    var nco = M.supOn ? '' : Object.keys(act).length + ' / ' + S.companies.filter(function (x) { return !S.co || x.name === S.co; }).length;
    var facts = '<ul class="wh-facts"><li><span>' + esc(t('n_scope')) + '</span><b>' + (S.co ? ltr(coLabel(S.co)) : esc(t('all_co'))) + ' | ' + (S.acc ? ltr(S.acc) : esc(t('all_acc'))) + ' | ' + ltr(periodText()) + '</b></li>' +
      '<li><span>' + esc(t('c_check')) + '</span><b class="' + (M.reconClose && !M.supOn ? 'wh-okt' : 'wh-warnt') + '">' + esc(st) + '</b></li>' +
      (nco ? '<li><span>' + esc(t('c_company')) + '</span><b>' + ltr(nco) + '</b></li>' : '') +
      '<li><span>' + esc(t('r_liab')) + '</span><b>' + (M.close === null ? '' : esc(c + money(M.close))) + '</b></li></ul>';
    return sec(t('sec_over'), '<div class="vz-card wh-card">' + roll + facts + '<p class="wh-muted wh-small">' + esc(t('n_nopay')) + '</p></div>');
  }

  /* ------------------------------------------------------------------ charts (inline SVG) */
  function compact(v) { v = Math.abs(v); return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v / 1e3).toFixed(v % 1e3 ? 1 : 0) + 'k' : String(Math.round(v))); }
  function series(M) {
    var D = S.data, first = S.from ? S.from.slice(0, 7) : (D.rows.length ? D.rows[0].posting_date.slice(0, 7) : S.to.slice(0, 7)), last = S.to.slice(0, 7);
    var ms = monthsBetween(first, last), by = {};
    M.rs.forEach(function (r) { var m = r.posting_date.slice(0, 7), o = by[m] || (by[m] = { rec: 0, paid: 0, adj: 0, deb: 0 }); o.rec += r.credit; if (r.debit > 0) { if (M.clsOk) { o[r.cls === 'paid' ? 'paid' : 'adj'] += r.debit; } else { o.deb += r.debit; } } });
    var run = M.open === null ? null : M.open, out = ms.map(function (m) {
      var o = by[m] || { rec: 0, paid: 0, adj: 0, deb: 0 };
      if (run !== null) { run = r2(run + o.rec - o.paid - o.adj - o.deb); }
      return { m: m, rec: r2(o.rec), paid: r2(o.paid), adj: r2(o.adj), deb: r2(o.deb), bal: run };
    });
    var cut = out.length > 60; return { s: cut ? out.slice(out.length - 60) : out, cut: cut };
  }
  function barChart(ser) {
    var W = 720, H = 270, L = 58, R = 10, T = 12, B = 40, iw = W - L - R, ih = H - T - B, n = ser.length, mx = 0;
    ser.forEach(function (s) { mx = Math.max(mx, s.rec, s.paid + s.adj + s.deb); });
    var top = niceMax(mx), g = '', i, gw = iw / n, bw = Math.max(3, Math.min(22, gw * 0.32)), step = Math.ceil(n / 12);
    for (i = 0; i <= 4; i++) { var y = T + ih - ih * i / 4; g += '<line class="wh-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="wh-ax" x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + compact(top * i / 4) + '</text>'; }
    ser.forEach(function (s, i) {
      var cx = L + gw * i + gw / 2, hr = ih * s.rec / top, tip = monthLabel(s.m) + ' | ' + t('lg_rec') + ': ' + money(s.rec) + ' | ' + t('lg_paid') + ': ' + money(s.paid) + ' | ' + t('lg_adj') + ': ' + money(s.adj) + (s.deb ? ' | ' + t('lg_deb') + ': ' + money(s.deb) : '');
      g += '<g class="wh-bar" data-wact="month" data-m="' + s.m + '" tabindex="0" role="button" aria-label="' + esc(tip) + '"><title>' + esc(tip) + '</title><rect class="wh-hit" x="' + (L + gw * i) + '" y="' + T + '" width="' + gw + '" height="' + ih + '"/>';
      if (hr > 0) { g += '<rect class="wh-b-rec" x="' + (cx - bw - 1) + '" y="' + (T + ih - hr) + '" width="' + bw + '" height="' + hr + '" rx="2"/>'; }
      var y0 = T + ih;
      [['paid', 'wh-b-paid'], ['adj', 'wh-b-adj'], ['deb', 'wh-b-deb']].forEach(function (p) { var h = ih * s[p[0]] / top; if (h > 0) { y0 -= h; g += '<rect class="' + p[1] + '" x="' + (cx + 1) + '" y="' + y0 + '" width="' + bw + '" height="' + h + '" rx="2"/>'; } });
      g += '</g>';
      if (i % step === 0) { g += '<text class="wh-ax' + (S.mon === s.m ? ' wh-axsel' : '') + '" x="' + cx + '" y="' + (H - 18) + '" text-anchor="middle">' + esc(monthLabel(s.m)) + '</text>'; }
    });
    return '<svg class="wh-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('ch_act')) + '" preserveAspectRatio="xMidYMid meet">' + g + '</svg>';
  }
  function lineChart(ser) {
    var W = 720, H = 270, L = 58, R = 30, T = 12, B = 40, iw = W - L - R, ih = H - T - B, n = ser.length, mn = 0, mx = 0, i;
    ser.forEach(function (s) { mn = Math.min(mn, s.bal); mx = Math.max(mx, s.bal); });
    var top = mx > 0 ? niceMax(mx) : (mn < 0 ? 0 : 1), bot = mn < 0 ? -niceMax(-mn) : 0;
    var rg = (top - bot) || 1, g = '', pts = [], step = Math.ceil(n / 12);
    for (i = 0; i <= 4; i++) { var y = T + ih - ih * i / 4; g += '<line class="wh-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="wh-ax" x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + compact(bot + rg * i / 4) + '</text>'; }
    ser.forEach(function (s, i) {
      var x = n === 1 ? L + iw / 2 : L + iw * i / (n - 1), yv = T + ih - ih * (s.bal - bot) / rg; pts.push(x + ',' + yv);
      g += '<g class="wh-pt"><title>' + esc(monthLabel(s.m) + ' | ' + t('lg_bal') + ': ' + money(s.bal)) + '</title><circle cx="' + x + '" cy="' + yv + '" r="4"/><circle class="wh-hit" cx="' + x + '" cy="' + yv + '" r="11"/></g>';
      if (i % step === 0) { g += '<text class="wh-ax" x="' + x + '" y="' + (H - 18) + '" text-anchor="middle">' + esc(monthLabel(s.m)) + '</text>'; }
    });
    return '<svg class="wh-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('ch_bal')) + '"><polyline class="wh-line" points="' + pts.join(' ') + '" fill="none"/>' + g + '</svg>';
  }
  function buildTrends(M) {
    var sr = series(M), ser = sr.s, any = ser.some(function (s) { return s.rec || s.paid || s.adj || s.deb; });
    if (!M.rowsOk) { return sec(t('sec_trend'), '<div class="vz-note n-amber">' + esc(t('na_trunc')) + '</div>'); }
    if (!any) { return sec(t('sec_trend'), '<div class="vz-empty wh-empty">' + esc(t('empty_chart')) + '</div>'); }
    var leg = '<div class="wh-legend"><span><i class="sw wh-b-rec"></i>' + esc(t('lg_rec')) + '</span>' + (M.clsOk ? '<span><i class="sw wh-b-paid"></i>' + esc(t('lg_paid')) + '</span><span><i class="sw wh-b-adj"></i>' + esc(t('lg_adj')) + '</span>' : '<span><i class="sw wh-b-deb"></i>' + esc(t('lg_deb')) + '</span>') + '</div>';
    var balOk = M.open !== null && M.close !== null;
    var c1 = '<div class="vz-card wh-card"><div class="wh-ctitle">' + esc(t('ch_act')) + ' <span class="wh-muted">(' + esc(S.data.cur || '') + ')</span></div>' + leg + barChart(ser) + '</div>';
    var c2 = '<div class="vz-card wh-card"><div class="wh-ctitle">' + esc(t('ch_bal')) + ' <span class="wh-muted">(' + esc(S.data.cur || '') + ')</span></div>' + (balOk ? lineChart(ser) : '<div class="vz-empty wh-empty">' + esc(M.supOn ? t('ch_na') : t('na')) + '</div>') + '</div>';
    return sec(t('sec_trend'), '<div class="vz-grid-2">' + c1 + c2 + '</div>' + (sr.cut ? '<p class="wh-muted wh-small">60 / ' + esc(periodText()) + '</p>' : ''));
  }

  /* ------------------------------------------------------------------ transactions */
  var CLS = { rec: 'cl_rec', paid: 'cl_paid', adj: 'cl_adj', deb: 'cl_deb', zero: 'cl_zero' };
  function viewRows(M) {
    var rows = M.rs.filter(function (r) {
      if (S.mon && r.posting_date.slice(0, 7) !== S.mon) { return false; }
      if (S.k === 'rec') { return r.credit > 0; }
      if (S.k === 'paid') { return M.clsOk ? r.cls === 'paid' : r.debit > 0; }
      if (S.k === 'adj') { return M.clsOk ? r.cls === 'adj' : r.debit > 0; }
      return true;
    });
    var asc = S.k === 'bal' || S.k === 'out';
    return rows.slice().sort(function (a, b) { var d = a.posting_date < b.posting_date ? -1 : (a.posting_date > b.posting_date ? 1 : 0); if (!d) { d = a.voucher_no < b.voucher_no ? -1 : (a.voucher_no > b.voucher_no ? 1 : 0); } return asc ? d : -d; });
  }
  function viewTitle() { return t({ all: 'view_all', cnt: 'view_all', rec: 'view_rec', paid: 'view_paid', adj: 'view_adj', bal: 'view_bal', out: 'view_bal' }[S.k] || 'view_all'); }
  function buildTx(M) {
    var rows = viewRows(M);
    function sp(r) { var k = supKey(r); return k === '__none__' ? '' : supLabel(k); }
    TBL.tx = function () {
      return tbl('tx', [
        { label: t('c_date'), f: function (r) { return ltr(r.posting_date); } }, { label: t('c_company'), f: function (r) { return ltr(coLabel(r.company)); } }, { label: t('c_account'), f: function (r) { return ltr(r.account); } },
        { label: t('c_vtype'), f: function (r) { return esc(r.voucher_type); } }, { label: t('c_vno'), f: function (r) { return vLink(r.voucher_type, r.voucher_no); } },
        { label: t('c_supplier'), f: function (r) { return sp(r) ? ltr(sp(r)) : '-'; } },
        { label: t('c_dr'), cls: 'wh-n', f: function (r) { return r.debit ? esc(money(r.debit)) : '-'; } }, { label: t('c_cr'), cls: 'wh-n', f: function (r) { return r.credit ? esc(money(r.credit)) : '-'; } },
        { label: t('c_net'), cls: 'wh-n wh-st', f: function (r) { return esc(money(r.net)); } },
        { label: t('c_class'), f: function (r) { return '<span class="wh-badge t-' + r.cls + '">' + esc(t(CLS[r.cls] || 'cl_deb')) + '</span>'; } }
      ], rows, { text: function (r) { return [r.posting_date, r.company, coLabel(r.company), r.account, r.voucher_type, r.voucher_no, sp(r), t(CLS[r.cls] || 'cl_deb')].join(' '); }, empty: t('empty_tx'),
        foot: function (f) { var d = sumBy(f, function (r) { return r.debit; }), c = sumBy(f, function (r) { return r.credit; }); return '<tr><td colspan="6">Total (' + f.length + ')</td><td class="wh-n">' + esc(money(d)) + '</td><td class="wh-n">' + esc(money(c)) + '</td><td class="wh-n wh-st">' + esc(money(c - d)) + '</td><td></td></tr>'; } });
    };
    var chip = '<div class="wh-view"><span class="wh-muted">' + esc(t('showing_view')) + ':</span> <b>' + esc(viewTitle()) + '</b>' + (S.mon ? ' <span class="wh-pill">' + esc(t('month')) + ': ' + esc(monthLabel(S.mon)) + '</span>' : '') + (S.k !== 'all' || S.mon ? ' <button type="button" class="vz-btn vz-btn-sm" data-wact="clearview">' + esc(t('clear')) + '</button>' : '') + '</div>';
    var ledger = (S.k === 'bal' || S.k === 'out') && M.open !== null ? '<p class="wh-ledger">' + esc(t('r_open') + ': ' + cur() + money(M.open) + '   +   ' + t('r_rec') + ': ' + money(M.rec) + '   -   ' + t('lg_deb') + ': ' + money(M.deb) + '   =   ' + t('r_close') + ': ' + (M.close === null ? t('na') : money(M.close))) + '</p>' : '';
    var note = (S.k === 'paid' || S.k === 'adj') && M.clsOk ? '<p class="wh-muted wh-small">' + esc(t('n_nopay')) + '</p>' : '';
    return sec(t('sec_tx'), chip + ledger + note + toolbar('tx', '<button type="button" class="vz-btn vz-btn-sm" data-wact="export">' + esc(t('export')) + '</button>') + tbWrap('tx'), 'tx');
  }

  /* ------------------------------------------------------------------ layout */
  var tabBtn = document.createElement('button');
  tabBtn.type = 'button'; tabBtn.className = 'vz-tab'; tabBtn.setAttribute('role', 'tab'); tabBtn.setAttribute('aria-selected', 'false'); tabBtn.setAttribute('data-wtab', 'wht');
  nav.appendChild(tabBtn);
  var panel = document.createElement('section');
  panel.className = 'vz-panel wh-panel'; panel.setAttribute('data-panel', 'wht'); panel.id = 'vz-p-wht'; panel.hidden = true;
  main.appendChild(panel);

  function stampText(d) { return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function opt(v, l, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(l) + '</option>'; }
  function filters() {
    var coO = opt('', t('all_co'), !S.co) + S.companies.map(function (c) { return opt(c.name, coLabel(c.name), S.co === c.name); }).join('');
    var acO = opt('', t('all_acc'), !S.acc) + S.accounts.filter(function (a) { return !S.co || a.company === S.co; }).map(function (a) { return opt(a.name, a.name, S.acc === a.name); }).join('');
    var suO = opt('', t('all_sup'), !S.sup) + supOptions().map(function (o) { return opt(o.v, o.l, S.sup === o.v); }).join('');
    var chips = [['year', 'p_year'], ['last', 'p_last'], ['12m', 'p_12m'], ['all', 'p_all']].map(function (p) { return '<button type="button" class="vz-chip' + (S.preset === p[0] ? ' is-on' : '') + '" data-wact="preset" data-p="' + p[0] + '">' + esc(t(p[1])) + '</button>'; }).join('');
    return '<section class="vz-filters wh-filters" aria-label="Filters"><div class="vz-fgroup">' +
      '<label class="vz-field"><span>' + esc(t('f_company')) + '</span><select data-wf="co">' + coO + '</select></label>' +
      '<label class="vz-field"><span>' + esc(t('f_acc')) + '</span><select data-wf="acc">' + acO + '</select></label>' +
      '<label class="vz-field"><span>' + esc(t('f_sup')) + '</span><select data-wf="sup"' + (S.data ? '' : ' disabled') + '>' + suO + '</select></label></div>' +
      '<div class="vz-fgroup vz-periods" role="group">' + chips + '</div>' +
      '<div class="vz-fgroup"><label class="vz-field"><span>' + esc(t('f_from')) + '</span><input type="date" data-wf="from" value="' + esc(S.from) + '"></label>' +
      '<label class="vz-field"><span>' + esc(t('f_to')) + '</span><input type="date" data-wf="to" value="' + esc(S.to) + '"></label></div></section>';
  }
  function build() {
    var h = '<div class="wh-head"><div><h3 class="wh-title">' + esc(t('title')) + '</h3><p class="wh-sub">' + esc(t('sub')) + '</p></div><div class="wh-hright"><div class="wh-stamp" role="status" aria-live="polite">' + esc(t('updated')) + ': <b>' + esc(S.stamp ? stampText(S.stamp) : t('never')) + '</b></div>' +
      '<button type="button" class="vz-btn vz-btn-primary" data-wact="refresh"' + (S.st === 'loading' ? ' disabled' : '') + '>' + (S.st === 'loading' ? '<span class="wh-spin"></span>' : '') + esc(t('refresh')) + '</button></div></div>';
    h += filters();
    if (S.st === 'err') { h += '<div class="vz-note n-red vz-err"><span>' + esc(t('err_section')) + ': ' + esc(S.err) + '</span><button type="button" class="vz-btn vz-btn-sm" data-wact="refresh">' + esc(t('retry')) + '</button></div>'; }
    if (!S.data) { return h + (S.st === 'loading' ? '<div class="vz-skel"></div><div class="vz-skel"></div><p class="wh-muted">' + esc(t('loading')) + '</p>' : ''); }
    var D = S.data;
    if (D.noAccounts) { return h + '<div class="vz-empty wh-empty">' + esc(t('empty_acc')) + '</div>'; }
    var M = model(), notes = '';
    if (D.truncated) { notes += '<div class="vz-note n-amber">' + esc(tf('n_trunc', { n: ROW_CAP })) + '</div>'; }
    else if (D.aggMismatch) { notes += '<div class="vz-note n-amber">' + esc(t('n_mismatch')) + '</div>'; }
    else if (!D.clsOk) { notes += '<div class="vz-note n-amber">' + esc(t('n_ctx')) + '</div>'; }
    if (D.mixed) { notes += '<div class="vz-note n-amber">' + esc(t('n_mixed')) + '</div>'; }
    if (M.supOn) { notes += '<div class="vz-note n-blue">' + esc(t('n_sup')) + '</div>'; }
    var body = notes + kpis(M) + buildOverview(M) + buildCompany(M) + buildAccount(M) + buildSupplier(M) + buildTrends(M) + buildTx(M) +
      '<details class="wh-method"><summary>' + esc(t('m_title')) + '</summary><ul><li>' + esc(t('m_1')) + '</li><li>' + esc(t('m_2')) + '</li><li>' + esc(t('m_3')) + '</li><li>' + esc(t('m_4')) + '</li></ul></details>';
    return h + '<div class="wh-wrap' + (S.st === 'loading' ? ' is-busy' : '') + '">' + body + '</div>';
  }
  function paint() {
    if (!S.active) { return; }
    if (!allowed()) { panel.innerHTML = '<div class="vz-note n-red">' + esc(t('restricted')) + '</div>'; return; }
    try { panel.innerHTML = build(); }
    catch (e) { panel.innerHTML = '<div class="vz-note n-red vz-err">' + esc(t('err_section')) + ': ' + esc(e && e.message) + '</div>'; try { console.error('[WHT]', e); } catch (x) { /* ignore */ } }
  }
  function toTx() { var el = panel.querySelector('[data-wsec="tx"]'); if (el && el.scrollIntoView) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }

  function csvq(v) { v = String(v === null || v === undefined ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    if (!S.data) { return; }
    var M = model(), rows = viewRows(M), out = [['Posting Date', 'Company', 'GL Account', 'Voucher Type', 'Voucher No', 'Supplier', 'Debit', 'Credit', 'Net (Cr-Dr)', 'Type']];
    rows.forEach(function (r) { var k = supKey(r); out.push([r.posting_date, r.company, r.account, r.voucher_type, r.voucher_no, k === '__none__' ? '' : supLabel(k), r.debit, r.credit, r.net, r.cls]); });
    var csv = '﻿' + out.map(function (r) { return r.map(csvq).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'wht_transactions_' + S.to + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ------------------------------------------------------------------ events */
  var searchTimer = null;
  panel.addEventListener('click', function (ev) {
    var n = ev.target.closest ? ev.target.closest('[data-wact]') : null;
    if (!n || !panel.contains(n)) { return; }
    var a = n.getAttribute('data-wact'), v = n.getAttribute('data-v');
    if (a === 'refresh') { if (S.st !== 'loading') { load(); } }
    else if (a === 'preset') { setPreset(n.getAttribute('data-p')); S.mon = ''; load(); }
    else if (a === 'kpi') { S.k = n.getAttribute('data-k'); S.mon = ''; S.tb.tx.page = 1; paint(); toTx(); }
    else if (a === 'clearview') { S.k = 'all'; S.mon = ''; S.tb.tx.page = 1; paint(); }
    else if (a === 'month') { var m = n.getAttribute('data-m'); S.mon = S.mon === m ? '' : m; S.tb.tx.page = 1; paint(); toTx(); }
    else if (a === 'pick-co') { S.co = S.co === v ? '' : v; S.acc = ''; load(); }
    else if (a === 'pick-acc') { S.acc = S.acc === v ? '' : v; load(); }
    else if (a === 'pick-sup') { S.sup = S.sup === v ? '' : v; S.tb.tx.page = 1; paint(); }
    else if (a === 'page') { var id = n.getAttribute('data-t'); S.tb[id].page = Math.max(1, S.tb[id].page + (+n.getAttribute('data-d'))); renderTb(id); }
    else if (a === 'export') { exportCsv(); }
  });
  panel.addEventListener('keydown', function (ev) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.getAttribute && ev.target.getAttribute('data-wact') === 'month') { ev.preventDefault(); ev.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  panel.addEventListener('change', function (ev) {
    var n = ev.target, f = n.getAttribute ? n.getAttribute('data-wf') : null;
    if (!f) { return; }
    if (f === 'co') { S.co = n.value; S.acc = ''; load(); }
    else if (f === 'acc') { S.acc = n.value; load(); }
    else if (f === 'sup') { S.sup = n.value; S.tb.tx.page = 1; S.tb.sup.page = 1; paint(); }
    else if (f === 'from') { S.from = n.value; S.preset = 'custom'; load(); }
    else if (f === 'to') { S.to = n.value || ymd(new Date()); S.preset = 'custom'; load(); }
    else if (f === 'ps') { var id = n.getAttribute('data-t'); S.tb[id].ps = +n.value; S.tb[id].page = 1; renderTb(id); }
  });
  panel.addEventListener('input', function (ev) {
    var id = ev.target.getAttribute ? ev.target.getAttribute('data-wsearch') : null;
    if (!id) { return; }
    var val = ev.target.value; clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { S.tb[id].q = val; S.tb[id].page = 1; renderTb(id); }, 200);
  });

  function activate() {
    S.active = true;
    $$('.vz-tab').forEach(function (b) { var on = b === tabBtn; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $$('.vz-panel').forEach(function (p) { p.hidden = p !== panel; });
    V.classList.add('vz-wht-on');
    if (!S.started) { S.started = true; load(); } else { paint(); }
  }
  tabBtn.addEventListener('click', activate);
  V.addEventListener('click', function (ev) {
    var n = ev.target.closest ? ev.target.closest('[data-act="tab"]') : null;
    if (n && V.contains(n)) { S.active = false; V.classList.remove('vz-wht-on'); }
  }, true);
  function syncLang() { var l = lang(); S.lang = l; tabBtn.textContent = t('tab'); if (S.active) { paint(); } }
  try { new MutationObserver(function () { if (lang() !== S.lang) { syncLang(); } }).observe(V, { attributes: true, attributeFilter: ['data-lang', 'dir'] }); } catch (e) { /* ignore */ }
  setPreset('year');
  syncLang();
})();