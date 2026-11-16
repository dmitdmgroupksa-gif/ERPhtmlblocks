
(function () {
  "use strict";

  /*
   * DM GROUP KSA
   * PRODUCTION COMMAND CENTER
   * ERPNext / Frappe 14
   *
   * Live filters + refresh + bilingual display
   * Uses existing nine-tab .pcc HTML layout.
   * Read-only.
   */

  const ROOT = document.querySelector(".pcc");
  if (!ROOT || ROOT.dataset.pccLiveV2 === "yes") return;
  ROOT.dataset.pccLiveV2 = "yes";

  const $ = (q, host = ROOT) => host.querySelector(q);
  const $$ = (q, host = ROOT) =>
    Array.from(host.querySelectorAll(q));

  const MAX_RECORDS = 1000;
  const PAGE_SIZE = 100;

  const WH = {
    "28": "28 DM FACTORY - DMG",
    "34": "34 DM STORE - DMG"
  };

  const state = {
    factory: "all",
    period: "month",
    from: "",
    to: "",
    lang: $("#pcc-ar")?.checked ? "AR" : "EN",
    data: {},
    busy: false,
    requestId: 0,
    filterTimer: null
  };

  const SOURCES = [
    {
      key: "wo",
      doctype: "Work Order",
      date: "planned_start_date",
      fields: [
        "name", "status", "production_item",
        "qty", "produced_qty", "fg_warehouse",
        "planned_start_date"
      ]
    },
    {
      key: "jobs",
      doctype: "Factory Job Order",
      date: "date",
      fields: [
        "name", "date", "start_date",
        "end_date", "branch", "jo_status",
        "docstatus"
      ]
    },
    {
      key: "stock",
      doctype: "Stock Entry",
      date: "posting_date",
      fields: [
        "name", "posting_date", "to_warehouse",
        "stock_entry_type", "docstatus"
      ],
      filters: [
        ["stock_entry_type", "=", "Manufacture"],
        ["docstatus", "=", 1]
      ]
    },
    {
      key: "daily",
      doctype: "Factory Daily Production",
      date: "date",
      fields: [
        "name", "date", "branch",
        "workflow_state", "docstatus"
      ]
    },
    {
      key: "costs",
      doctype: "Daily Production Cost",
      date: null,
      fields: ["name", "modified"]
    },
    {
      key: "targets",
      doctype: "Manufacturing Production Target",
      date: "target_date",
      fields: [
        "name", "factory", "target_date",
        "target_qty"
      ]
    }
  ];

  function tr(en, ar) {
    return state.lang === "AR" ? ar : en;
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmt(v) {
    return Number(v || 0).toLocaleString("en-US");
  }

  function localISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateRange(period) {
    const today = new Date();
    const start = new Date(today.getFullYear(),
      today.getMonth(), today.getDate());

    if (period === "today") {
      // Same day
    } else if (period === "week") {
      // Saudi working calendar: week starts Sunday.
      start.setDate(start.getDate() - start.getDay());
    } else if (period === "month") {
      start.setDate(1);
    } else if (period === "year") {
      start.setMonth(0, 1);
    } else {
      return;
    }

    state.from = localISO(start);
    state.to = localISO(today);

    setDateInputs();
  }

  function setDateInputs() {
    const inputs = $$('.pcc-filterbar input[type="date"]');
    if (inputs[0]) inputs[0].value = state.from;
    if (inputs[1]) inputs[1].value = state.to;
  }

  function errorMessage(err) {
    if (typeof err === "string") return err.slice(0, 140);
    return String(
      err?.message || err?.statusText || "ERP request failed"
    ).slice(0, 140);
  }

  function callERP(method, args) {
    return new Promise((resolve, reject) => {
      if (!window.frappe ||
          typeof window.frappe.call !== "function") {
        reject(new Error("Frappe JavaScript API is unavailable"));
        return;
      }

      window.frappe.call({
        method,
        args,
        callback: function (res) {
          if (res?.exc) {
            reject(new Error("ERP returned an exception"));
          } else {
            resolve(res?.message);
          }
        },
        error: function (err) {
          reject(err);
        }
      });
    });
  }

  async function fetchSource(config, from, to) {
    const filters = [...(config.filters || [])];

    if (config.date) {
      filters.push([
        config.date,
        "between",
        config.date === "planned_start_date"
          ? [from + " 00:00:00", to + " 23:59:59"]
          : [from, to]
      ]);
    }

    let rows = [];
    let offset = 0;

    // One extra record establishes whether a result is capped.
    while (rows.length <= MAX_RECORDS) {
      const remaining = MAX_RECORDS + 1 - rows.length;
      const limit = Math.min(PAGE_SIZE, remaining);

      const batch = await callERP("frappe.client.get_list", {
        doctype: config.doctype,
        fields: config.fields,
        filters,
        order_by: "modified desc",
        limit_start: offset,
        limit_page_length: limit
      });

      if (!Array.isArray(batch)) {
        throw new Error("Unexpected result for " + config.doctype);
      }

      rows.push(...batch);
      offset += batch.length;

      if (batch.length < limit) {
        return {
          rows,
          complete: true,
          error: null
        };
      }

      if (rows.length > MAX_RECORDS) {
        return {
          rows: rows.slice(0, MAX_RECORDS),
          complete: false,
          error: null
        };
      }
    }

    return {
      rows: rows.slice(0, MAX_RECORDS),
      complete: false,
      error: null
    };
  }

  function source(key) {
    return state.data[key] || {
      rows: [],
      complete: false,
      error: tr("Not loaded", "لم يتم التحميل")
    };
  }

  function belongsToFactory(row, key) {
    if (state.factory === "all") return true;

    if (key === "wo") {
      return row.fg_warehouse === WH[state.factory];
    }

    if (key === "stock") {
      return row.to_warehouse === WH[state.factory];
    }

    if (key === "jobs" || key === "daily") {
      const branch = String(row.branch || "")
        .trim().toLowerCase();

      const accepted = state.factory === "28"
        ? ["28 factory"]
        : ["34 factory", "34 store", "34 stores"];

      // Mixed branches are intentionally excluded.
      return accepted.includes(branch);
    }

    if (key === "targets") {
      const factory = String(row.factory || "").toLowerCase();
      return factory.includes(state.factory);
    }

    // Factory mapping for Daily Production Cost is not
    // verified, so never assign all costs to one factory.
    return false;
  }

  function rows(key) {
    return source(key).rows.filter(row =>
      belongsToFactory(row, key)
    );
  }

  function verified(key) {
    return source(key).complete && !source(key).error;
  }

  function count(key, subset) {
    return verified(key) ? fmt(subset.length) : "—";
  }

  function linkFor(doctype, name) {
    const slug = doctype.toLowerCase().replace(/\s+/g, "-");
    const url = "/app/" + slug +
      (name ? "/" + encodeURIComponent(name) : "");
    return esc(url);
  }

  function badge(value) {
    const text = String(value || "—");
    const lower = text.toLowerCase();
    let cls = "";

    if (/completed|approved/.test(lower)) cls = "good";
    else if (/open|draft|pending|assigned|process/.test(lower))
      cls = "warn";
    else if (/cancelled|rejected/.test(lower)) cls = "bad";

    return `<span class="pcc-status ${cls}">${esc(text)}</span>`;
  }

  function table(columns, records, doctype) {
    if (!records.length) {
      return `<div class="pcc-live-empty">${esc(tr(
        "No matching records in the loaded data.",
        "لا توجد سجلات مطابقة في البيانات المحملة."
      ))}</div>`;
    }

    const headers = columns.map(c =>
      `<th>${esc(tr(c.en, c.ar))}</th>`
    ).join("");

    const body = records.slice(0, 100).map(record => {
      return `<tr>${columns.map(c => {
        const value = record[c.key];

        if (c.key === "name" && value) {
          return `<td><a href="${linkFor(doctype, value)}"
            target="_blank" rel="noopener noreferrer">
            ${esc(value)} ↗</a></td>`;
        }

        if (c.status) {
          return `<td>${badge(value)}</td>`;
        }

        return `<td>${esc(value == null ? "—" : value)}</td>`;
      }).join("")}</tr>`;
    }).join("");

    return `<div class="pcc-tablewrap">
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>` +
    (records.length > 100
      ? `<p class="pcc-note">${esc(tr(
          "Showing first 100 loaded records.",
          "عرض أول 100 سجل محمل."
        ))}</p>`
      : "");
  }

  function metric(title, value, description, key) {
    const partial = key && !verified(key);

    return `<div class="pcc-live-metric">
      <div class="pcc-live-metric-label">${esc(title)}</div>
      <strong>${esc(partial ? "—" : value)}</strong>
      <small>${esc(
        partial
          ? tr("Unavailable or incomplete source",
               "المصدر غير متاح أو غير مكتمل")
          : description
      )}</small>
    </div>`;
  }

  function metrics(items) {
    return `<div class="pcc-live-metrics">
      ${items.join("")}
    </div>`;
  }

  function panel(title, content) {
    return `<div class="pcc-panel">
      <div class="pcc-panel-head"><h4>${esc(title)}</h4></div>
      ${content}
    </div>`;
  }

  function sourceWarning(key) {
    const s = source(key);

    if (s.error) {
      return `<div class="pcc-live-warning">
        ${esc(tr("Source unavailable:", "المصدر غير متاح:"))}
        ${esc(s.error)}
      </div>`;
    }

    if (!s.complete) {
      return `<div class="pcc-live-warning">${esc(tr(
        "Only a 1,000-record sample was loaded. Complete totals are suppressed.",
        "تم تحميل عينة من 1000 سجل فقط. الإجماليات الكاملة غير معروضة."
      ))}</div>`;
    }

    return "";
  }

  function statusCounts(records, field) {
    const groups = new Map();

    records.forEach(r => {
      const value = String(r[field] || "Unspecified");
      groups.set(value, (groups.get(value) || 0) + 1);
    });

    if (!records.length) {
      return `<p class="pcc-note">${esc(tr(
        "No data for this selection.",
        "لا توجد بيانات لهذا الاختيار."
      ))}</p>`;
    }

    return [...groups.entries()].sort((a,b) => b[1] - a[1])
      .map(([name, value]) =>
        `<div class="pcc-live-bar">
          <span>${esc(name)}</span>
          <div><i style="width:${(value/records.length*100).toFixed(2)}%"></i></div>
          <b>${fmt(value)}</b>
        </div>`
      ).join("");
  }

  function renderOverview() {
    const wo = rows("wo");
    const jobs = rows("jobs");
    const stock = rows("stock");
    const daily = rows("daily");

    const completedWO = wo.filter(r =>
      String(r.status).toLowerCase() === "completed"
    );

    const openWO = wo.filter(r =>
      !["completed","closed","cancelled"].includes(
        String(r.status || "").toLowerCase()
      )
    );

    const completedJobs = jobs.filter(r =>
      String(r.jo_status).toLowerCase() === "completed"
    );

    return metrics([
      metric(tr("Work Orders","أوامر التصنيع"),
        fmt(wo.length), "Selected date range", "wo"),
      metric(tr("Completed Work Orders","أوامر التصنيع المكتملة"),
        fmt(completedWO.length), "Native status", "wo"),
      metric(tr("Open Work Orders","أوامر التصنيع المفتوحة"),
        fmt(openWO.length), "Not completed / closed", "wo"),
      metric(tr("Factory Job Orders","أوامر عمل المصنع"),
        fmt(jobs.length), "Selected date range", "jobs"),
      metric(tr("Completed Factory Jobs","أعمال المصنع المكتملة"),
        fmt(completedJobs.length), "JO Status Completed", "jobs"),
      metric(tr("Manufacture Entry Headers","قيود التصنيع"),
        fmt(stock.length), "Header selection only", "stock"),
      metric(tr("Daily Production Documents","مستندات الإنتاج اليومية"),
        fmt(daily.length), "Header date basis", "daily"),
      metric(tr("Production Targets","أهداف الإنتاج"),
        verified("targets") && rows("targets").length === 0
          ? tr("Not Set","غير محدد") : "—",
        "Target records", "targets")
    ]) +
    `<div class="pcc-grid2">
      ${panel(tr("Work Order Status","حالات أوامر التصنيع"),
        sourceWarning("wo") + statusCounts(wo,"status"))}
      ${panel(tr("Factory Job Status","حالات أعمال المصنع"),
        sourceWarning("jobs") + statusCounts(jobs,"jo_status"))}
    </div>` +
    panel(tr("Recent Factory Job Orders","أحدث أوامر عمل المصنع"),
      table([
        {key:"name",en:"Job Order",ar:"أمر العمل"},
        {key:"date",en:"Date",ar:"التاريخ"},
        {key:"branch",en:"Factory",ar:"المصنع"},
        {key:"jo_status",en:"Status",ar:"الحالة",status:true}
      ],jobs,"Factory Job Order"));
  }

  function renderOutput() {
    const stock = rows("stock");

    return metrics([
      metric(tr("Manufacture Entry Headers","قيود التصنيع"),
        fmt(stock.length), "Submitted Manufacture entries", "stock"),
      metric(tr("Finished Quantity","كمية الإنتاج النهائي"),
        "—", tr("Requires child-row calculation",
          "تتطلب حساب الصفوف الفرعية")),
      metric(tr("Finished Production Value","قيمة الإنتاج النهائي"),
        "—", tr("Pending valuation review",
          "بانتظار التحقق من القيمة")),
      metric(tr("Output by UOM","الإنتاج حسب الوحدة"),
        "—", tr("Requires item details",
          "تتطلب تفاصيل الأصناف"))
    ]) +
    sourceWarning("stock") +
    panel(tr("Manufacture Entry Register","سجل قيود التصنيع"),
      `<p class="pcc-note">${esc(tr(
        "These are Stock Entry headers. Some valid production receipts may use child warehouses rather than the header destination.",
        "هذه رؤوس قيود المخزون. قد توجد استلامات إنتاج صحيحة في مستودعات الصفوف الفرعية وليس في وجهة المستند."
      ))}</p>` +
      table([
        {key:"name",en:"Stock Entry",ar:"قيد المخزون"},
        {key:"posting_date",en:"Date",ar:"التاريخ"},
        {key:"to_warehouse",en:"Destination",ar:"الوجهة"},
        {key:"stock_entry_type",en:"Type",ar:"النوع"}
      ],stock,"Stock Entry"));
  }

  function renderWorkOrders() {
    const data = rows("wo");
    const completed = data.filter(r =>
      String(r.status).toLowerCase() === "completed"
    );
    const inProcess = data.filter(r =>
      /process|progress/i.test(r.status)
    );

    return metrics([
      metric(tr("Work Orders","أوامر التصنيع"),
        fmt(data.length),"Period total","wo"),
      metric(tr("Completed","مكتمل"),
        fmt(completed.length),"Native status","wo"),
      metric(tr("In Process","قيد التنفيذ"),
        fmt(inProcess.length),"Native status","wo"),
      metric(tr("Remaining Quantity","الكمية المتبقية"),
        "—","Mixed UOM cannot be summed")
    ]) +
    sourceWarning("wo") +
    panel(tr("Work Order Register","سجل أوامر التصنيع"),
      table([
        {key:"name",en:"Work Order",ar:"أمر التصنيع"},
        {key:"production_item",en:"Item",ar:"الصنف"},
        {key:"qty",en:"Planned Qty",ar:"الكمية المخططة"},
        {key:"produced_qty",en:"Produced Qty",ar:"الكمية المنتجة"},
        {key:"fg_warehouse",en:"Warehouse",ar:"المستودع"},
        {key:"status",en:"Status",ar:"الحالة",status:true}
      ],data,"Work Order"));
  }

  function renderJobs() {
    const data = rows("jobs");
    const completed = data.filter(r =>
      String(r.jo_status).toLowerCase() === "completed"
    );
    const open = data.filter(r =>
      String(r.jo_status).toLowerCase() === "open"
    );
    const today = localISO(new Date());
    const overdue = data.filter(r =>
      r.end_date && r.end_date < today &&
      String(r.jo_status).toLowerCase() !== "completed"
    );

    return metrics([
      metric(tr("Job Orders","أوامر عمل المصنع"),
        fmt(data.length),"Issue date basis","jobs"),
      metric(tr("Open Jobs","أعمال مفتوحة"),
        fmt(open.length),"JO Status Open","jobs"),
      metric(tr("Completed Jobs","أعمال مكتملة"),
        fmt(completed.length),"JO Status Completed","jobs"),
      metric(tr("Overdue Jobs","أعمال متأخرة"),
        fmt(overdue.length),"Past end date","jobs")
    ]) +
    sourceWarning("jobs") +
    panel(tr("Factory Job Order Register","سجل أوامر عمل المصنع"),
      table([
        {key:"name",en:"Job Order",ar:"أمر العمل"},
        {key:"branch",en:"Factory",ar:"المصنع"},
        {key:"date",en:"Issue Date",ar:"تاريخ الإصدار"},
        {key:"start_date",en:"Start",ar:"البداية"},
        {key:"end_date",en:"End",ar:"النهاية"},
        {key:"jo_status",en:"Status",ar:"الحالة",status:true}
      ],data,"Factory Job Order"));
  }

  function renderCosts() {
    const data = rows("costs");

    return metrics([
      metric(tr("Manufacturing Cost","تكلفة التصنيع"),
        "—","Pending value reconciliation"),
      metric(tr("Material Cost","تكلفة المواد"),
        "—","Pending item valuation"),
      metric(tr("Labour / Process Cost","تكلفة العمالة والعمليات"),
        "—","Child-row calculation required"),
      metric(tr("Daily Cost Documents","مستندات التكلفة اليومية"),
        state.factory === "all" ? fmt(data.length) : "—",
        "All-date documents; not selected period",
        state.factory === "all" ? "costs" : null)
    ]) +
    `<div class="pcc-live-warning">${esc(tr(
      "Daily Production Cost date and factory mappings are not verified. These records are not used for period-specific SAR totals.",
      "لم يتم التحقق من تاريخ التكلفة وربطها بالمصنع. لذلك لا تستخدم لحساب التكاليف المالية للفترة."
    ))}</div>` +
    (state.factory === "all"
      ? panel(tr("Cost Documents — All Dates","مستندات التكلفة - جميع التواريخ"),
          sourceWarning("costs") +
          table([
            {key:"name",en:"Document",ar:"المستند"},
            {key:"modified",en:"Modified",ar:"آخر تعديل"}
          ],data,"Daily Production Cost"))
      : "");
  }

  function renderMaterials() {
    return metrics([
      metric(tr("Material Consumption","استهلاك المواد"),
        "—","Requires Stock Entry Detail"),
      metric(tr("Material Value","قيمة المواد"),
        "—","Not yet reconciled"),
      metric(tr("Scrap Quantity","كمية الخردة"),
        "—","Requires item/UOM aggregation"),
      metric(tr("Shortages","النواقص"),
        "—","Requires stock balance")
    ]) +
    panel(tr("Material Analysis","تحليل المواد"),
      `<p class="pcc-note">${esc(tr(
        "The audit confirmed scrap receipts in both factories. The child-row aggregation API must distinguish finished goods, consumed materials and scrap.",
        "أكد التدقيق وجود استلامات خردة في المصنعين. يجب أن تفصل واجهة التجميع بين المنتجات النهائية والمواد المستهلكة والخردة."
      ))}</p>`);
  }

  function renderWorkforce() {
    const data = rows("daily");

    return metrics([
      metric(tr("Production Documents","مستندات الإنتاج"),
        fmt(data.length),"Header-date records","daily"),
      metric(tr("Recorded Employees","الموظفون المسجلون"),
        "—","Child rows required"),
      metric(tr("Process Achieved Amount","قيمة العمليات المنجزة"),
        "—","Child rows required"),
      metric(tr("Overtime Hours","الساعات الإضافية"),
        "—","Child rows required")
    ]) +
    sourceWarning("daily") +
    panel(tr("Daily Production Documents","مستندات الإنتاج اليومية"),
      `<p class="pcc-note">${esc(tr(
        "Factory Daily Production uses header Month and child-row activity dates. The selected period currently applies to the header date only.",
        "يستخدم مستند الإنتاج اليومي تاريخ الشهر في الرأس وتواريخ النشاط في الصفوف الفرعية. يتم تطبيق الفترة حاليًا على تاريخ الرأس فقط."
      ))}</p>` +
      table([
        {key:"name",en:"Document",ar:"المستند"},
        {key:"date",en:"Header Date",ar:"تاريخ المستند"},
        {key:"branch",en:"Branch",ar:"الفرع"},
        {key:"workflow_state",en:"Workflow",ar:"حالة الاعتماد",status:true}
      ],data,"Factory Daily Production"));
  }

  function renderPlanning() {
    const data = rows("jobs");
    const today = localISO(new Date());
    const upcoming = data.filter(r =>
      r.start_date && r.start_date >= today
    ).sort((a,b) =>
      String(a.start_date).localeCompare(String(b.start_date))
    );

    return metrics([
      metric(tr("Upcoming Jobs in Selected Issue Period",
        "الأعمال القادمة ضمن فترة الإصدار المحددة"),
        fmt(upcoming.length),"Based on job start date","jobs"),
      metric(tr("Material Ready","المواد الجاهزة"),
        "—","Requires warehouse stock"),
      metric(tr("Available Capacity","الطاقة المتاحة"),
        "—","Capacity not configured"),
      metric(tr("Unassigned Jobs","الأعمال غير المسندة"),
        "—","Requires job child rows")
    ]) +
    sourceWarning("jobs") +
    panel(tr("Upcoming Factory Jobs","أعمال المصنع القادمة"),
      table([
        {key:"name",en:"Job Order",ar:"أمر العمل"},
        {key:"branch",en:"Factory",ar:"المصنع"},
        {key:"start_date",en:"Start",ar:"البداية"},
        {key:"end_date",en:"End",ar:"النهاية"},
        {key:"jo_status",en:"Status",ar:"الحالة",status:true}
      ],upcoming,"Factory Job Order"));
  }

  function renderQuality() {
    const issues = [];

    SOURCES.forEach(cfg => {
      const s = source(cfg.key);

      if (s.error) {
        issues.push({
          issue:cfg.doctype,
          detail:tr("Source unavailable","المصدر غير متاح"),
          severity:"Review"
        });
      } else if (!s.complete) {
        issues.push({
          issue:cfg.doctype,
          detail:tr("Source capped at 1,000","المصدر محدود بـ 1000"),
          severity:"Review"
        });
      }
    });

    if (verified("targets") && rows("targets").length === 0) {
      issues.push({
        issue:"Manufacturing Production Target",
        detail:tr("No targets configured in selection",
          "لا توجد أهداف في النطاق المحدد"),
        severity:"Review"
      });
    }

    return metrics([
      metric(tr("Visible Data Exceptions","ملاحظات البيانات"),
        fmt(issues.length),"Data-source checks"),
      metric(tr("Quality Inspections","فحوصات الجودة"),
        "—","Source unverified"),
      metric(tr("Cost Reconciliation","مطابقة التكلفة"),
        "—","Pending audit"),
      metric(tr("Material Exceptions","ملاحظات المواد"),
        "—","Requires detail API")
    ]) +
    panel(tr("Data Exceptions Register","سجل ملاحظات البيانات"),
      table([
        {key:"issue",en:"Source",ar:"المصدر"},
        {key:"detail",en:"Finding",ar:"الملاحظة"},
        {key:"severity",en:"Severity",ar:"الأهمية",status:true}
      ],issues,null));
  }

  const renderers = {
    overview: renderOverview,
    output: renderOutput,
    workorders: renderWorkOrders,
    jobs: renderJobs,
    cost: renderCosts,
    materials: renderMaterials,
    workforce: renderWorkforce,
    planning: renderPlanning,
    quality: renderQuality
  };

  function render() {
    for (const [tab, fn] of Object.entries(renderers)) {
      const page = $(".pcc-page-" + tab);
      if (!page) continue;

      let host = $(".pcc-live-container",page);
      if (!host) {
        host = document.createElement("div");
        host.className = "pcc-live-container";
        page.appendChild(host);
      }

      host.innerHTML = fn();
    }
  }

  function setStatus(message, type = "") {
    let status = $(".pcc-current-status");

    if (!status) {
      status = document.createElement("div");
      status.className = "pcc-current-status";
      $(".pcc-filterbar").insertAdjacentElement(
        "afterend",status
      );
    }

    status.className = "pcc-current-status " + type;
    status.textContent = message;
  }

  function updateRefreshButton() {
    const btn = $(".pcc-refresh-live");
    if (!btn) return;

    btn.disabled = state.busy;
    btn.textContent = state.busy
      ? tr("Loading...", "جار التحميل...")
      : tr("↻ Refresh Live Data", "↻ تحديث البيانات");
  }

  async function refresh() {
    if (!state.from || !state.to || state.from > state.to) {
      setStatus(tr(
        "Please select a valid date range.",
        "يرجى تحديد فترة تاريخ صحيحة."
      ),"error");
      return;
    }

    if (state.busy) {
      // A subsequent refresh may supersede a running request.
      state.requestId++;
    }

    const id = ++state.requestId;
    state.busy = true;
    updateRefreshButton();

    setStatus(tr(
      "Loading ERP data...",
      "جار تحميل بيانات النظام..."
    ),"loading");

    const from = state.from;
    const to = state.to;

    const fetched = await Promise.allSettled(
      SOURCES.map(cfg => fetchSource(cfg, from, to))
    );

    if (id !== state.requestId) return;

    fetched.forEach((r,index) => {
      const key = SOURCES[index].key;

      state.data[key] = r.status === "fulfilled"
        ? r.value
        : {
            rows: [],
            complete: false,
            error: errorMessage(r.reason)
          };
    });

    state.busy = false;
    updateRefreshButton();
    render();

    const errors = SOURCES.filter(s =>
      source(s.key).error
    ).length;

    const capped = SOURCES.filter(s =>
      !source(s.key).complete && !source(s.key).error
    ).length;

    setStatus(
      tr("ERP refreshed","تم تحديث بيانات النظام") +
      " · " + from + " → " + to +
      " · " + tr("Factory","المصنع") + ": " +
      (state.factory === "all" ? tr("All","الكل") : state.factory) +
      " · " + tr("Failed","فشل") + ": " + errors +
      " · " + tr("Capped","جزئي") + ": " + capped +
      " · " + new Date().toLocaleTimeString(),
      errors ? "warning" : "success"
    );
  }

  function scheduleRefresh() {
    clearTimeout(state.filterTimer);

    state.filterTimer = setTimeout(() => {
      refresh();
    },250);
  }

  function mountControls() {
    const bar = $(".pcc-filterbar");
    if (!bar) return;

    const selects = $$("select",bar);
    const dates = $$('input[type="date"]',bar);

    // Factory filter
    if (selects[0]) {
      selects[0].selectedIndex = 0;

      selects[0].addEventListener("change",function () {
        state.factory = this.selectedIndex === 1
          ? "28"
          : this.selectedIndex === 2 ? "34" : "all";

        // Factory filtering uses already fetched rows.
        render();

        setStatus(tr(
          "Factory filter applied to loaded data.",
          "تم تطبيق فلتر المصنع على البيانات المحملة."
        ) + " " + state.factory,"success");
      });
    }

    // Reporting period
    if (selects[1]) {
      selects[1].addEventListener("change",function () {
        const choices = [
          "month","today","week","year","custom"
        ];

        state.period = choices[this.selectedIndex] || "month";

        if (state.period !== "custom") {
          dateRange(state.period);
          scheduleRefresh();
        }
      });
    }

    // Date filters
    dates.forEach((input,index) => {
      input.addEventListener("change",function () {
        if (index === 0) state.from = this.value;
        else state.to = this.value;

        state.period = "custom";

        if (selects[1]) selects[1].selectedIndex = 4;

        if (state.from && state.to && state.from <= state.to) {
          scheduleRefresh();
        } else {
          setStatus(tr(
            "Invalid date range.",
            "فترة التاريخ غير صحيحة."
          ),"error");
        }
      });
    });

    // English/Arabic live panel refresh
    ["pcc-en","pcc-ar"].forEach(id => {
      const radio = $("#" + id);

      if (radio) {
        radio.addEventListener("change",function () {
          state.lang = id === "pcc-ar" ? "AR" : "EN";
          updateRefreshButton();
          render();
        });
      }
    });

    // Create refresh button in header
    const actions = $(".pcc-head-actions");

    if (actions && !$(".pcc-refresh-live")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pcc-refresh-live";
      button.addEventListener("click",refresh);
      actions.appendChild(button);
    }

    // Replace static notice with accurate scope information.
    const notice = $(".pcc-notice");

    if (notice) {
      notice.innerHTML = `
        <span class="en">
          Live dashboard · Factory/date filters apply to supported
          source records. Unavailable financial and mixed-UOM totals
          remain blank.
        </span>
        <span class="ar">
          لوحة بيانات مباشرة · تطبق فلاتر المصنع والتاريخ على
          السجلات المدعومة. تبقى التكاليف غير المؤكدة وكميات
          الوحدات المختلفة بدون إجماليات.
        </span>`;
    }

    ROOT.classList.add("pcc-live-mode");
  }

  // Initialize
  dateRange("month");
  mountControls();
  refresh();

})();
