
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

  const BLOCK_ROOT = typeof root_element !== "undefined" ? root_element : document;
  const ROOT = BLOCK_ROOT.querySelector(".pcc");
  if (!ROOT || ROOT.dataset.pccLiveV2 === "yes") return;
  ROOT.dataset.pccLiveV2 = "yes";

  const $ = (q, host = ROOT) => host.querySelector(q);
  const $$ = (q, host = ROOT) =>
    Array.from(host.querySelectorAll(q));

  let tableSequence=0;
  const TABLE_PAGES={},TABLE_SIZES={};
  const PAGE_SIZE = 100;

  let FACTORIES = [], COMPANIES = {};
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
        "name", "docstatus", "company", "status", "production_item", "stock_uom", "total_operating_cost",
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
        "name", "company", "posting_date", "to_warehouse",
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
      date: "date",
      fields: ["name", "date", "branch", "docstatus", "total_cost_summary", "modified"]
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
    const labels={"All factories": "\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0635\u0627\u0646\u0639", "This month": "\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631", "Today": "\u0627\u0644\u064a\u0648\u0645", "This week": "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639", "This year": "\u0647\u0630\u0647 \u0627\u0644\u0633\u0646\u0629", "Custom": "\u0645\u062e\u0635\u0635", "Source": "\u0627\u0644\u0645\u0635\u062f\u0631", "Finding": "\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629", "Document": "\u0627\u0644\u0645\u0633\u062a\u0646\u062f", "Date": "\u0627\u0644\u062a\u0627\u0631\u064a\u062e", "Branch": "\u0627\u0644\u0641\u0631\u0639", "Group": "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629", "Recorded total": "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062c\u0644", "Recorded total cost": "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0633\u062c\u0644", "Employees with recorded activity": "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646 \u0630\u0648\u0648 \u0646\u0634\u0627\u0637 \u0645\u0633\u062c\u0644", "Recorded duty hours": "\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u0633\u062c\u0644\u0629", "Recorded overtime hours": "\u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u064a\u0629 \u0627\u0644\u0645\u0633\u062c\u0644\u0629", "Linked quality inspections": "\u0641\u062d\u0648\u0635\u0627\u062a \u0627\u0644\u062c\u0648\u062f\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629", "Source and mapping checks": "\u0641\u062d\u0635 \u0627\u0644\u0645\u0635\u0627\u062f\u0631 \u0648\u0627\u0644\u0631\u0628\u0637", "Inspection": "\u0627\u0644\u0641\u062d\u0635", "Status": "\u0627\u0644\u062d\u0627\u0644\u0629", "Item": "\u0627\u0644\u0635\u0646\u0641", "Finished output by item and stock UOM": "\u0627\u0644\u0625\u0646\u062a\u0627\u062c \u0627\u0644\u0646\u0647\u0627\u0626\u064a \u062d\u0633\u0628 \u0627\u0644\u0635\u0646\u0641 \u0648\u0648\u062d\u062f\u0629 \u0627\u0644\u0645\u062e\u0632\u0648\u0646", "Finished valuation by company currency": "\u0642\u064a\u0645\u0629 \u0627\u0644\u0625\u0646\u062a\u0627\u062c \u062d\u0633\u0628 \u0639\u0645\u0644\u0629 \u0627\u0644\u0634\u0631\u0643\u0629", "Consumed materials by item and stock UOM": "\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0645\u0633\u062a\u0647\u0644\u0643\u0629 \u062d\u0633\u0628 \u0627\u0644\u0635\u0646\u0641 \u0648\u0627\u0644\u0648\u062d\u062f\u0629", "Scrap receipts by item and stock UOM": "\u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u062e\u0631\u062f\u0629 \u062d\u0633\u0628 \u0627\u0644\u0635\u0646\u0641 \u0648\u0627\u0644\u0648\u062d\u062f\u0629", "Production targets by item and UOM": "\u0623\u0647\u062f\u0627\u0641 \u0627\u0644\u0625\u0646\u062a\u0627\u062c \u062d\u0633\u0628 \u0627\u0644\u0635\u0646\u0641 \u0648\u0627\u0644\u0648\u062d\u062f\u0629", "Job rows without employee assignment": "\u0635\u0641\u0648\u0641 \u0639\u0645\u0644 \u062f\u0648\u0646 \u062a\u0639\u064a\u064a\u0646 \u0645\u0648\u0638\u0641", "Achieved process amount by branch": "\u0642\u064a\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0646\u062c\u0632\u0629 \u062d\u0633\u0628 \u0627\u0644\u0641\u0631\u0639", "Recorded process costs by branch and activity": "\u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062c\u0644\u0629 \u062d\u0633\u0628 \u0627\u0644\u0641\u0631\u0639 \u0648\u0627\u0644\u0646\u0634\u0627\u0637", "Basis": "\u0623\u0633\u0627\u0633 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a", "Planning basis": "\u0623\u0633\u0627\u0633 \u0627\u0644\u062a\u062e\u0637\u064a\u0637", "The source is incomplete. Complete totals are suppressed.": "\u0627\u0644\u0645\u0635\u062f\u0631 \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644. \u0644\u0627 \u062a\u0639\u0631\u0636 \u0625\u062c\u0645\u0627\u0644\u064a\u0627\u062a \u062c\u0632\u0626\u064a\u0629."};
    return state.lang === "AR" ? (ar || labels[en] || en) : en;
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
    const today = new Date((typeof frappe!=="undefined"&&frappe.datetime?frappe.datetime.get_today():new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh"}).format(new Date()))+"T12:00:00");
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
        timeout: 60000,
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
    const filters = [...(config.filters || []), ["docstatus", "=", 1]];

    if (config.date && config.key !== "daily") {
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

    // Read every page with stable ordering; never silently truncate totals.
    while (true) {
      const limit = PAGE_SIZE;

      const batch = await callERP("frappe.client.get_list", {
        doctype: config.doctype,
        fields: config.fields,
        filters,
        order_by: "name asc",
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

    }
  }

  function source(key) {
    return state.data[key] || {
      rows: [],
      complete: false,
      error: tr("Not loaded", "لم يتم التحميل")
    };
  }

  function belongsToFactory(row,key){
    if(state.factory==='all')return true;
    const f=FACTORIES.find(f=>f.name===state.factory);if(!f)return false;
    if(key==='targets')return row.factory===f.name;
    if(key==='stock')return (row.items||[]).some(i=>f.confirmedWarehouses.includes(i.t_warehouse)||f.confirmedWarehouses.includes(i.s_warehouse));
    if(key==='wo')return row.company===f.company&&f.confirmedWarehouses.includes(row.fg_warehouse);
    return !!f.legacy_branch_label && row.branch===f.legacy_branch_label;
  }
  function details(key,field){return rows(key).flatMap(d=>(d[field||'details']||[]).map(r=>Object.assign({_document:d.name,_company:d.company,_branch:d.branch},r)));}
  function groupValues(records,key,value){const m=new Map();records.forEach(r=>{const k=key(r);m.set(k,(m.get(k)||0)+(Number(value(r))||0));});return [...m].map(([group,total])=>({group,total}));}
  function groupedPanel(title,records,key,value){return panel(title,table([{key:'group',en:'Group',ar:'المجموعة'},{key:'total',en:'Recorded total',ar:'الإجمالي المسجل'}],groupValues(records,key,value),null));}
  function itemRows(){const f=FACTORIES.find(f=>f.name===state.factory);return details('stock','items').filter(i=>!f||f.confirmedWarehouses.includes(i.t_warehouse)||f.confirmedWarehouses.includes(i.s_warehouse));}
  async function enrich(config,result,from,to){
    if(!['stock','daily','costs','jobs'].includes(config.key))return result;
    const docs=[];let cursor=0;
    async function worker(){while(cursor<result.rows.length){const row=result.rows[cursor++];docs.push(await callERP('frappe.client.get',{doctype:config.doctype,name:row.name}));}}
    await Promise.all([worker(),worker(),worker(),worker()]);
    if(config.key==='daily')for(const d of docs)d.details=(d.details||[]).filter(r=>r.date&&r.date>=from&&r.date<=to);
    return Object.assign({},result,{rows:config.key==='daily'?docs.filter(d=>d.details.length):docs});
  }
  async function factoryMetadata(){
    const [factories,companies]=await Promise.all([callERP('frappe.client.get_list',{doctype:'Manufacturing Factory',fields:['name','factory_name','company','legacy_branch_label'],filters:{is_active:1},limit_page_length:0}),callERP('frappe.client.get_list',{doctype:'Company',fields:['name','default_currency'],limit_page_length:0})]);
    COMPANIES=Object.fromEntries(companies.map(c=>[c.name,c.default_currency]));
    const docs=[];for(const f of factories)docs.push(await callERP('frappe.client.get',{doctype:'Manufacturing Factory',name:f.name}));
    FACTORIES=docs.map(f=>Object.assign(f,{confirmedWarehouses:(f.warehouses||[]).filter(w=>w.mapping_status==='Confirmed').map(w=>w.warehouse)}));
    const select=$('.pcc-filterbar select');if(select)select.innerHTML='<option value="all">All factories</option>'+FACTORIES.map(f=>'<option value="'+esc(f.name)+'">'+esc(f.factory_name||f.name)+'</option>').join('');
    if(select){if(state.factory!=='all'&&!FACTORIES.some(f=>f.name===state.factory)){state.factory='all';}select.value=state.factory;}
  }
  function rows(key) {
    return source(key).rows.filter(row =>
      belongsToFactory(row, key)
    );
  }

  function verified(key) {
    const f=FACTORIES.find(f=>f.name===state.factory);
    if(f&&['stock','wo'].includes(key)&&!f.confirmedWarehouses.length)return false;
    if(f&&['jobs','daily','costs'].includes(key)&&(!f.legacy_branch_label||FACTORIES.filter(x=>x.legacy_branch_label===f.legacy_branch_label).length!==1))return false;
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

    const tableId="table-"+(++tableSequence),size=50;
    TABLE_SIZES[tableId]=Math.ceil(records.length/size);
    const current=Math.min(TABLE_PAGES[tableId]||1,TABLE_SIZES[tableId]);
    const headers = columns.map(c =>
      `<th>${esc(tr(c.en, c.ar))}</th>`
    ).join("");

    const body = records.slice((current-1)*size,current*size).map(record => {
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

        return `<td>${esc(value == null ? "—" : typeof value==="number"?Number(value).toLocaleString(state.lang==="AR"?"ar-SA":"en-US",{maximumFractionDigits:2}):value)}</td>`;
      }).join("")}</tr>`;
    }).join("");

    return `<div class="pcc-tablewrap">
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>` +
    `<div class="pcc-pager"><button type="button" data-page-table="${tableId}" data-page-delta="-1" ${current===1?'disabled':''}>${tr('Previous','السابق')}</button><span>${current} / ${TABLE_SIZES[tableId]} · ${records.length} ${tr('records','سجل')}</span><button type="button" data-page-table="${tableId}" data-page-delta="1" ${current===TABLE_SIZES[tableId]?'disabled':''}>${tr('Next','التالي')}</button></div>`;
  }

  function metric(title, value, description, key) {
    const partial = key && !verified(key);

    return `<div class="pcc-live-metric">
      <div class="pcc-live-metric-label">${esc(tr(title))}</div>
      <strong>${esc(partial ? "—" : value)}</strong>
      <small>${esc(
        partial
          ? tr("Unavailable or incomplete source",
               "المصدر غير متاح أو غير مكتمل")
          : tr(description)
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
      <div class="pcc-panel-head"><h4>${esc(tr(title))}</h4></div>
      ${content}
    </div>`;
  }

  function sourceWarning(key) {
    const s = source(key);
    const factory=FACTORIES.find(f=>f.name===state.factory);
    if(factory&&["jobs","daily","costs"].includes(key)&&(!factory.legacy_branch_label||FACTORIES.filter(f=>f.legacy_branch_label===factory.legacy_branch_label).length!==1))return '<div class="pcc-live-warning">'+esc(tr("A unique legacy branch mapping is required for this factory.","يلزم ربط فريد لفرع هذا المصنع."))+'</div>';
    if(["stock","wo"].includes(key)&&factory&&!factory.confirmedWarehouses.length)return '<div class="pcc-live-warning">This factory has no confirmed warehouse mapping. Warehouse metrics are unavailable.</div>';

    if (s.error) {
      return `<div class="pcc-live-warning">
        ${esc(tr("Source unavailable:", "المصدر غير متاح:"))}
        ${esc(s.error)}
      </div>`;
    }

    if (!s.complete) {
      return `<div class="pcc-live-warning">${esc(tr(
        "The source is incomplete. Complete totals are suppressed.",
        "\u0627\u0644\u0645\u0635\u062f\u0631 \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644. \u0644\u0627 \u062a\u0639\u0631\u0636 \u0625\u062c\u0645\u0627\u0644\u064a\u0627\u062a \u062c\u0632\u0626\u064a\u0629."
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
        fmt(daily.length), "Activity dates within the selected period", "daily"),
      metric(tr("Production Targets","أهداف الإنتاج"),
        verified("targets") && rows("targets").length === 0
          ? tr("Not Set","غير محدد") : fmt(rows("targets").length),
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

  function renderOutput(){if(!verified("stock"))return sourceWarning("stock");const records=itemRows().filter(i=>i.is_finished_item&&!i.is_scrap_item);return sourceWarning('stock')+groupedPanel('Finished output by item and stock UOM',records,i=>i.item_code+' / '+i.stock_uom,i=>i.transfer_qty)+groupedPanel('Finished valuation by company currency',records,i=>i._company+' / '+(COMPANIES[i._company]||'Currency unavailable'),i=>i.amount); }

  function renderWorkOrders() {
    const data = rows("wo");
    if(!verified("wo"))return sourceWarning("wo");
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
      metric(tr("Distinct production items","أصناف الإنتاج"),
        fmt(new Set(data.map(r=>r.production_item)).size),"See remaining quantity by item and UOM below","wo")
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
      ],data,"Work Order"))+groupedPanel(tr("Remaining quantity by item and stock UOM","الكميات المتبقية حسب الصنف والوحدة"),data,r=>r.production_item+" / "+(r.stock_uom||tr("Unit not recorded","الوحدة غير مسجلة")),r=>Math.max(0,Number(r.qty)-Number(r.produced_qty)));
  }

  function renderJobs() {
    const data = rows("jobs");
    if(!verified("jobs"))return sourceWarning("jobs");
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

  function renderCosts(){if(!verified("costs"))return sourceWarning("costs");const docs=rows('costs'), data=details('costs');return sourceWarning('costs')+panel('Recorded Daily Production Cost — submitted documents in selected period',table([{key:'name',en:'Document'},{key:'date',en:'Date'},{key:'branch',en:'Branch'},{key:'total_cost_summary',en:'Recorded total cost'}],docs,'Daily Production Cost'))+groupedPanel('Recorded process costs by branch and activity',data,r=>r._branch+' / '+r.activity,r=>r.total_cost)+panel('Basis','Recorded Daily Production Cost amounts; this is not a full inventory valuation or a reconciled financial manufacturing-cost statement.'); }

  function renderMaterials(){if(!verified("stock"))return sourceWarning("stock");const data=itemRows();return sourceWarning('stock')+groupedPanel('Consumed materials by item and stock UOM',data.filter(i=>i.s_warehouse&&!i.t_warehouse),i=>i.item_code+' / '+i.stock_uom,i=>i.transfer_qty)+groupedPanel('Scrap receipts by item and stock UOM',data.filter(i=>i.is_scrap_item&&i.t_warehouse),i=>i.item_code+' / '+i.stock_uom,i=>i.transfer_qty); }

  function renderWorkforce(){if(!verified("daily"))return sourceWarning("daily");const data=details('daily');return sourceWarning('daily')+metrics([metric('Employees with recorded activity',fmt(new Set(data.map(r=>r.employee).filter(Boolean)).size),'Distinct employees in activity-date range','daily'),metric('Recorded duty hours',fmt(data.reduce((s,r)=>s+(Number(r.duty_hours)||0),0)),'Recorded hours; not attendance-derived','daily'),metric('Recorded overtime hours',fmt(data.reduce((s,r)=>s+(Number(r.ot_hrs)||0),0)),'Recorded activity overtime','daily')])+groupedPanel('Achieved process amount by branch',data,r=>r._branch,r=>r.total_price); }

  function renderPlanning(){if(!verified("targets"))return sourceWarning("targets");const targets=rows('targets'),jobs=details('jobs');return sourceWarning('targets')+sourceWarning('jobs')+groupedPanel('Production targets by item and UOM',targets,r=>r.item_code+' / '+r.uom,r=>r.target_qty)+metrics([metric('Job rows without employee assignment',fmt(jobs.filter(r=>!r.employee).length),'Submitted job documents in selected issue period','jobs')])+panel('Planning basis','Targets are planning records. Capacity and material availability require an agreed capacity calendar and BOM/stock calculation; they are not inferred from job counts.'); }

  async function loadQualityReferences(){
    const token=state.requestId;
    if(!source('stock').complete||source('stock').error){state.data.quality={rows:[],complete:false,error:'Stock source unavailable'};return;}
    const ids=[...new Set(source('stock').rows.flatMap(d=>(d.items||[]).map(i=>i.quality_inspection)).filter(Boolean))],records=[];
    try{for(let i=0;i<ids.length;i+=100){let offset=0;while(true){const page=await callERP('frappe.client.get_list',{doctype:'Quality Inspection',fields:['name','status','report_date','item_code','reference_name','docstatus'],filters:[['name','in',ids.slice(i,i+100)],['docstatus','<',2]],limit_start:offset,limit_page_length:100,order_by:'name asc'});records.push(...page);if(page.length<100)break;offset+=page.length;}}
      if(token!==state.requestId)return;state.data.quality={rows:records,complete:true,error:null};
    }catch(e){if(token!==state.requestId)return;state.data.quality={rows:[],complete:false,error:errorMessage(e)};}
  }
  function renderQuality(){
    const issues=[];for(const cfg of SOURCES){if(!verified(cfg.key))issues.push({issue:cfg.doctype,detail:source(cfg.key).error||tr('Incomplete source or factory mapping','مصدر أو ربط مصنع غير مكتمل')});}
    if(verified('targets')&&!rows('targets').length)issues.push({issue:'Manufacturing Production Target',detail:tr('No targets in the selected period','لا توجد أهداف للفترة المحددة')});
    const refs=new Set(itemRows().map(i=>i.quality_inspection).filter(Boolean)),q=source('quality'),visible=q.rows.filter(r=>refs.has(r.name));
    if(q.complete&&visible.length<refs.size)issues.push({issue:'Quality Inspection',detail:tr('Some linked inspections are cancelled, missing or inaccessible','بعض الفحوصات المرتبطة ملغاة أو مفقودة أو غير متاحة')});
    return panel(tr('Source and mapping checks','فحص المصادر والربط'),table([{key:'issue',en:'Source',ar:'المصدر'},{key:'detail',en:'Finding',ar:'الملاحظة'}],issues,null))+
      (q.error?sourceWarning('quality'):panel(tr('Linked quality inspections','فحوصات الجودة المرتبطة'),table([{key:'name',en:'Inspection',ar:'الفحص'},{key:'report_date',en:'Date',ar:'التاريخ'},{key:'item_code',en:'Item',ar:'الصنف'},{key:'status',en:'Status',ar:'الحالة'}],visible,'Quality Inspection')));
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
    tableSequence=0;
    const periodLabels={month:tr('This month'),today:tr('Today'),week:tr('This week'),year:tr('This year'),custom:tr('Custom')};
    for(const option of $$('.pcc-filterbar select[data-filter="period"] option'))option.textContent=periodLabels[option.value];
    const allOption=$('.pcc-filterbar select[data-filter="factory"] option[value="all"]');if(allOption)allOption.textContent=tr('All factories');
    for (const label of $$(".pcc-nav label"))label.setAttribute("aria-selected",String($("#"+label.htmlFor).checked));
    for (const [tab, fn] of Object.entries(renderers)) {
      const page = $(".pcc-page-" + tab);
      if (!page) continue;

      let host = $(".pcc-live-container",page);
      if (!host) {
        host = document.createElement("div");
        host.className = "pcc-live-container";
        page.appendChild(host);
      }

      try{host.innerHTML=state.busy?'<div class="pcc-live-empty">'+esc(tr("Loading current selection…","جار تحميل النطاق المحدد…"))+'</div>':fn();}catch(e){host.innerHTML='<div class="pcc-live-warning">'+esc(errorMessage(e))+'</div>';}
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
    render();
    setStatus(tr(
      "Loading ERP data...",
      "جار تحميل بيانات النظام..."
    ),"loading");

    Object.keys(TABLE_PAGES).forEach(k=>delete TABLE_PAGES[k]);
    const from = state.from;
    const to = state.to;

    try{await factoryMetadata();}catch(e){if(id!==state.requestId)return;state.busy=false;state.data={};updateRefreshButton();render();setStatus(errorMessage(e),"error");return;}
    if(id!==state.requestId)return;
    const fetched = await Promise.allSettled(
      SOURCES.map(async cfg => enrich(cfg, await fetchSource(cfg, from, to), from, to))
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

    await loadQualityReferences();
    if(id!==state.requestId)return;
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
      errors || capped ? "warning" : "success"
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
        state.factory = this.value;

        // Factory filtering uses already fetched rows.
        Object.keys(TABLE_PAGES).forEach(k=>delete TABLE_PAGES[k]);
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

        state.period = this.value || choices[this.selectedIndex] || "month";

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
      actions.appendChild(button);
    }

    const refreshButton=$(".pcc-refresh-live");if(refreshButton)refreshButton.addEventListener("click",refresh);
    updateRefreshButton();
    $(".pcc-preview")?.remove();

    // Live scope notice.
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

    ROOT.addEventListener('click',e=>{const button=e.target.closest('[data-page-table]');if(!button)return;const key=button.dataset.pageTable;TABLE_PAGES[key]=Math.max(1,Math.min(TABLE_SIZES[key],(TABLE_PAGES[key]||1)+Number(button.dataset.pageDelta)));render();});
    ROOT.addEventListener('keydown',e=>{const label=e.target.closest('label[for]');if(label&&['Enter',' '].includes(e.key)){e.preventDefault();const radio=$('#'+label.htmlFor);radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));render();}});
    for(const radio of $$('.pcc-toggle[name="pcc-tab"]'))radio.addEventListener('change',render);
    ROOT.classList.add("pcc-live-mode");
  }

  // Initialize
  dateRange("month");
  mountControls();
  refresh();

})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
