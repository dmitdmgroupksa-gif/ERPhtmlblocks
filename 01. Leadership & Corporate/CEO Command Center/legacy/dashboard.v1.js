(function () {
  var host = root_element.querySelector("#ceo-command-center");
  if (!host) return;

  if (host.dataset.ccInitialized === "1") return;
  host.dataset.ccInitialized = "1";

  var departments = [
    {
      name: "Sales",
      metrics: [
        "Net invoiced sales",
        "Previous-period change",
        "Same dates last year",
        "Sales target"
      ],
      hierarchy: ["Location", "Salesperson", "Records"]
    },
    {
      name: "Sales Support",
      metrics: [
        "Open enquiries",
        "Completed within one hour",
        "Overdue enquiries",
        "Paused enquiries"
      ],
      hierarchy: ["Status", "Preparer", "Enquiry", "Quotation"]
    },
    {
      name: "Collections",
      metrics: [
        "Outstanding balance",
        "Overdue balance",
        "Collections",
        "Overdue customers"
      ],
      hierarchy: ["Location", "Salesperson", "Customer", "Invoices"]
    },
    { name: "Finance", metrics: [], hierarchy: [] },
    {
      name: "Procurement",
      metrics: [
        "Purchase order value",
        "Open purchase orders",
        "Delayed orders",
        "Pending approvals"
      ],
      hierarchy: ["Division", "Buyer", "Supplier", "Purchase Orders"]
    },
    {
      name: "Inventory",
      metrics: [
        "Recorded stock value",
        "Items in stock",
        "Warehouses with stock",
        "Negative stock positions"
      ],
      hierarchy: ["Company", "Warehouse", "Items"]
    },
    {
      name: "Projects / DMS",
      metrics: [
        "Total projects",
        "Allocated projects",
        "Overdue follow-ups",
        "Pending submittals"
      ],
      hierarchy: ["Region", "Salesperson", "Project", "Activity"]
    },
    {
      name: "HR",
      metrics: [
        "Active employees",
        "Attendance exceptions",
        "Pending leave",
        "Incomplete training"
      ],
      hierarchy: ["Location", "Department", "Employee", "Records"]
    },
    {
      name: "Internal Services",
      metrics: [
        "Open requests",
        "Overdue requests",
        "Resolved requests",
        "Unassigned requests"
      ],
      hierarchy: ["Category", "Technician", "Request", "Details"]
    },
    { name: 'Manufacturing', metrics: [], hierarchy: [] },
    { name: 'Delivery & Forklift', metrics: [], hierarchy: [] }
  ];

  var state = {
    department: "Sales",
    company: "",
    period: "Monthly",
    reference: frappe.datetime.get_today(),
    from: "",
    to: "",
    measure: "invoiced",
    path: [],
    page: 0,
    backlog: ""
  };

  var content = host.querySelector(".cc-content");
  var tabs = host.querySelector(".cc-tabs");
  var badge = host.querySelector(".cc-status");
  var companySelect = host.querySelector('[data-filter="company"]');

  var requestId = 0;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function number(value) {
    return Number(value) || 0;
  }

  function money(value, currency) {
    return (currency ? currency + " " : "") +
      number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
  }

  function change(current, previous) {
    current = number(current);
    previous = number(previous);

    if (previous === 0) {
      return current === 0 ? "No change" : "No baseline";
    }

    var percentage = (current - previous) / Math.abs(previous) * 100;

    return (percentage > 0 ? "+" : "") +
      percentage.toFixed(1) + "%";
  }

  function parseDate(value) {
    return new Date(value + "T12:00:00Z");
  }

  function formatDate(value) {
    return value.toISOString().slice(0, 10);
  }

  function addDays(value, days) {
    var result = parseDate(value);
    result.setUTCDate(result.getUTCDate() + days);
    return formatDate(result);
  }

  function dateRange() {
    if (state.period === "Custom") {
      return {
        from: state.from,
        to: state.to
      };
    }

    var reference = state.reference;
    var today = frappe.datetime.get_today();
    var date = parseDate(reference);
    var from = reference;
    var to = reference;

    if (state.period === "Weekly") {
      // Saturday is the first day of the reporting week.
      from = addDays(reference, -((date.getUTCDay() + 1) % 7));
      to = addDays(from, 6);
    }

    if (state.period === "Monthly") {
      from = reference.slice(0, 7) + "-01";

      to = formatDate(new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        0,
        12
      )));
    }

    if (state.period === "Yearly") {
      from = reference.slice(0, 4) + "-01-01";
      to = reference.slice(0, 4) + "-12-31";
    }

    // Current week/month/year displays through today.
    if (from <= today && to > today) {
      to = today;
    }

    return {
      from: from,
      to: to
    };
  }

  function companyLabel() {
    for (var i = 0; i < companySelect.options.length; i++) {
      if (companySelect.options[i].value === state.company) {
        return companySelect.options[i].text;
      }
    }

    return state.company || "All permitted companies";
  }

  function departmentConfig() {
    return departments.find(function (department) {
      return department.name === state.department;
    });
  }

  var DEPT_META = {
    "Sales": ["sales", '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'],
    "Sales Support": ["support", '<path d="M9 3h6v3H9z"/><path d="M7 4.5H5V21h14V4.5h-2"/><path d="M9 14l2 2 4-4"/>'],
    "Collections": ["collections", '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.4c-.5-.9-1.5-1.4-2.6-1.4-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.5-2.6-1.4M12 6.5v11"/>'],
    "Finance": ["finance", '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20.5h18"/>'],
    "Procurement": ["procurement", '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 11h11l2-8H6.2"/>'],
    "Inventory": ["inventory", '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>'],
    "Projects / DMS": ["projects", '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/><path d="M3 13h18"/>'],
    "HR": ["hr", '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M18 14.7c1.8.7 3 2.5 3.5 5.3"/>'],
    "Internal Services": ["services", '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'],
    "Manufacturing": ["manufacturing", '<path d="M3 21V10l6 4v-4l6 4V5h6v16z"/><path d="M7 17.5h2M12 17.5h2M17 17.5h2"/>'],
    "Delivery & Forklift": ["delivery", '<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>']
  };

  function deptSlug(name) {
    return (DEPT_META[name] || ["other"])[0];
  }

  function renderTabs() {
    var hadFocus = !!(root_element.activeElement && tabs.contains(root_element.activeElement));
    host.setAttribute("data-dept", deptSlug(state.department));
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = departments.map(function (department) {
      var active = department.name === state.department;
      var meta = DEPT_META[department.name] || ["other", ""];
      return '<button type="button" role="tab" class="cc-tab' + (active ? ' active' : '') +
        '" data-department="' + esc(department.name) + '" data-dept="' + meta[0] +
        '" aria-selected="' + active + '" tabindex="' + (active ? '0' : '-1') + '">' +
        '<svg class="cc-tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + meta[1] + '</svg>' +
        '<span>' + esc(department.name) + '</span></button>';
    }).join("");
    var act = tabs.querySelector(".cc-tab.active");
    if (act) {
      if (tabs.scrollWidth > tabs.clientWidth) {
        var left = act.offsetLeft;
        var right = left + act.offsetWidth;
        if (left < tabs.scrollLeft) tabs.scrollLeft = Math.max(0, left - 8);
        else if (right > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = right - tabs.clientWidth + 8;
      }
      if (hadFocus) act.focus();
    }
  }

  // Department tabs: arrow keys / Home / End move focus; Enter or Space opens the tab.
  tabs.addEventListener("keydown", function (event) {
    var list = Array.prototype.slice.call(tabs.querySelectorAll(".cc-tab"));
    var current = event.target.closest ? event.target.closest(".cc-tab") : null;
    var i = list.indexOf(current);
    if (i < 0) return;
    var j = -1;
    if (event.key === "ArrowRight") j = (i + 1) % list.length;
    else if (event.key === "ArrowLeft") j = (i - 1 + list.length) % list.length;
    else if (event.key === "Home") j = 0;
    else if (event.key === "End") j = list.length - 1;
    if (j < 0) return;
    event.preventDefault();
    list.forEach(function (b, k) { b.tabIndex = k === j ? 0 : -1; });
    list[j].focus();
  });

  // Follow the ERP light / dark theme.
  function syncCcTheme() {
    host.setAttribute("data-theme",
      document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }
  syncCcTheme();
  var ccThemeObserver = new MutationObserver(function () {
    if (!host.isConnected && root_element.host && !root_element.host.isConnected) {
      ccThemeObserver.disconnect();
      return;
    }
    syncCcTheme();
  });
  ccThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

function header(range) {
    var measures = "";

    if (state.department === "Sales") {
      measures =
        '<div class="cc-measures">' +
          '<button type="button" class="cc-button' +
          (state.measure === "invoiced" ? ' active' : '') +
          '" data-measure="invoiced">Net Invoiced Sales</button>' +
          '<button type="button" class="cc-button' +
          (state.measure === "booked" ? ' active' : '') +
          '" data-measure="booked">Booked Sales</button>' +
        '</div>';
    }

    return '<div class="cc-section-heading">' +
      '<div><h3>' + esc(state.department) + ' overview</h3>' +
      '<div class="cc-caption">' + esc(companyLabel()) +
      ' · ' + esc(range.from) + ' to ' + esc(range.to) +
      '</div></div>' + measures +
      '</div>';
  }

  function renderPending(range) {
    content.style.minHeight = "";
    content.removeAttribute("aria-busy");
    var department = departmentConfig();

    badge.textContent = "Department connection pending";

    content.innerHTML = header(range) +
      '<div class="cc-kpis">' +
      department.metrics.map(function (metric) {
        return '<div class="cc-kpi">' +
          '<div class="cc-kpi-label">' + esc(metric) + '</div>' +
          '<div class="cc-kpi-value">—</div>' +
          '<div class="cc-kpi-note">Not connected</div>' +
        '</div>';
      }).join("") +
      '</div>' +
      '<div class="cc-breadcrumbs">' +
        '<span class="cc-caption">Planned drill-down:</span> ' +
        esc(department.hierarchy.join(" → ")) +
      '</div>' +
      '<div class="cc-panel"><div class="cc-empty">' +
        '<strong>' + esc(state.department) + '</strong>' +
        '<span>This department will connect here on the same dashboard.</span>' +
      '</div></div>';
  }

  function trendMarkup(data, currency) {
    var current = data.current;
    var daily = {};

    (current.trend || []).forEach(function (row) {
      daily[row.date] = number(row.amount);
    });

    var grouped = {};
    var date = current.from_date;
    var monthly = trendMonthly(current);

    // Include days without sales as zero.
    while (date <= current.to_date) {
      var label = monthly ? date.slice(0, 7) : date;

      grouped[label] = number(grouped[label]) + number(daily[date]);
      date = addDays(date, 1);
    }

    var labels = Object.keys(grouped).sort();

    if (!labels.length) {
      return '<div class="cc-empty">No trend data.</div>';
    }

    var values = labels.map(function (label) {
      return grouped[label];
    });

    var maximum = Math.max.apply(null, values.concat([0]));
    var minimum = Math.min.apply(null, values.concat([0]));

    if (maximum === minimum) {
      maximum = minimum + 1;
    }

    var left = 95;
    var right = 605;
    var top = 35;
    var bottom = 210;

    function x(index) {
      return labels.length === 1
        ? (left + right) / 2
        : left + index * (right - left) / (labels.length - 1);
    }

    function y(value) {
      return bottom -
        (value - minimum) / (maximum - minimum) * (bottom - top);
    }

    var svg =
      '<svg class="cc-trend" viewBox="0 0 640 265" ' +
      'role="img" aria-label="Sales trend in company currency">' +
      '<text x="95" y="18" fill="var(--cc-muted)" font-size="12">' +
      esc(currency || "Company currency") + '</text>';

    for (var i = 0; i <= 3; i++) {
      var tick = minimum + (maximum - minimum) * i / 3;

      var tickLabel = Math.abs(tick) >= 1000000
        ? (tick / 1000000).toFixed(1) + "M"
        : Math.abs(tick) >= 1000
          ? (tick / 1000).toFixed(1) + "K"
          : tick.toFixed(0);

      svg +=
        '<line x1="' + left + '" x2="' + right +
        '" y1="' + y(tick) + '" y2="' + y(tick) +
        '" stroke="var(--cc-border)"/>' +
        '<text x="85" y="' + (y(tick) + 4) +
        '" text-anchor="end" fill="var(--cc-muted)" font-size="12">' +
        esc(tickLabel) + '</text>';
    }

    svg +=
      '<polyline points="' +
      values.map(function (value, index) {
        return x(index) + "," + y(value);
      }).join(" ") +
      '" fill="none" stroke="var(--cc-blue)" stroke-width="3"/>';

    values.forEach(function (value, index) {
      svg +=
        '<circle cx="' + x(index) + '" cy="' + y(value) +
        '" r="3" fill="var(--cc-blue)"><title>' +
        esc(labels[index] + " · " + money(value, currency)) +
        '</title></circle>';
    });

    svg +=
      '<text x="' + left +
      '" y="238" fill="var(--cc-muted)" font-size="12">' +
      esc(labels[0]) + '</text>';

    if (labels.length > 1) {
      svg +=
        '<text x="' + right +
        '" y="238" text-anchor="end" fill="var(--cc-muted)" font-size="12">' +
        esc(labels[labels.length - 1]) + '</text>';
    }

    svg +=
      '<text x="350" y="260" text-anchor="middle" ' +
      'fill="var(--cc-muted)" font-size="12">' +
      (monthly ? "Month" : "Date") + '</text></svg>';

    return svg;
  }

  function salesCardsMarkup(data, depth) {
    var current = data.current;
    var currency = data.currency;

    var title = state.measure === "invoiced"
      ? "Net invoiced sales"
      : "Booked sales";

    var cards = [
      {
        label: title,
        value: money(current.amount, currency),
        note: current.count + " submitted " +
          (state.measure === "invoiced" ? "invoices" : "orders")
      },
      {
        label: data.previous.label || "Previous equal-length period",
        value: change(current.amount, data.previous.amount),
        note: money(data.previous.amount, currency) + " · " +
          data.previous.from_date + " to " + data.previous.to_date
      },
      {
        label: "Same dates last year",
        value: change(current.amount, data.last_year.amount),
        note: money(data.last_year.amount, currency) + " · " +
          data.last_year.from_date + " to " + data.last_year.to_date
      },
      {
        label: "Sales target",
        value: "Pending",
        note: "Target year and Division/Location mapping need validation"
      }
    ];

    // Historical Division coverage is incomplete.
    // Retain overall comparisons, but suppress them below the overall level.
    if (depth > 0 || data.comparisons_available === false) {
      cards[1].value = "Not comparable";
      cards[1].note =
        "Historical Division coverage is incomplete; comparison withheld.";

      cards[2].value = "Not comparable";
      cards[2].note =
        "Historical Division coverage is incomplete; comparison withheld.";
    }

    return '<div class="cc-kpis">' +
      cards.map(function (card) {
        return '<div class="cc-kpi">' +
          '<div class="cc-kpi-label">' + esc(card.label) + '</div>' +
          '<div class="cc-kpi-value">' + esc(card.value) + '</div>' +
          '<div class="cc-kpi-note">' + esc(card.note) + '</div>' +
        '</div>';
      }).join("") +
      '</div>';
  }

  function trendMonthly(current) {
    if (state.period === "Yearly") return true;
    var days = (parseDate(current.to_date) - parseDate(current.from_date)) / 86400000 + 1;
    return days > 62;
  }

  // Scope shown on the trend: company plus any selected drill-down levels.
  function trendScopeLabel() {
    var parts = [];
    if (state.company || !state.path.length) parts.push(companyLabel());
    state.path.forEach(function (item) { parts.push(item.label); });
    return parts.join(" › ");
  }

  function renderScopedTrend(shell, data) {
    shell.querySelector(".cc-sales-trend").innerHTML = salesTrendPanel(data);
  }

  function loadScopedTrend(id, range, shell, scope) {
    function failed() {
      if (id !== requestId) return;
      shell.querySelector(".cc-sales-trend").innerHTML =
        '<section class="cc-panel cc-records"><h3>Sales trend</h3>' +
        '<div class="cc-error">The Sales trend could not be loaded for this selection.</div></section>';
    }

    frappe.call({
      method: "ceo_command_center_sales",
      args: {
        period: state.period,
        measure: state.measure,
        from_date: range.from,
        to_date: range.to,
        company: scope.company || "",
        division: scope.division || "",
        location: scope.location || "",
        salesperson: scope.salesperson || "",
        level: "records",
        record_page: 0
      },
      callback: function (response) {
        if (id !== requestId) return;
        if (response.exc || !response.message || !response.message.current) return failed();
        renderScopedTrend(shell, response.message);
      },
      error: failed
    });
  }

  function salesTrendPanel(data) {
    var current = data.current;
    return '<section class="cc-panel cc-records">' +
      '<h3>Sales trend</h3>' +
      '<div class="cc-caption">' +
      (state.measure === "invoiced" ? "Net invoiced sales" : "Booked sales") +
      ' · ' + esc(trendScopeLabel()) +
      ' · ' + esc(current.from_date) + ' to ' + esc(current.to_date) +
      ' · ' + (trendMonthly(current) ? 'Monthly totals' : 'Daily totals') +
      ' · Total ' + esc(money(current.amount, data.currency)) +
      '</div>' +
      trendMarkup(data, data.currency) +
      '</section>';
  }


  // Sales tab: summary cards, horizontal Sales view tabs, full-width detail,
  // full-width trend. Reuses the existing Sales and Sales Backlog APIs.
  var salesViews = [
    { key: "", label: "Sales Breakdown" },
    { key: "orders", label: "Pending Sales Orders" },
    { key: "delivery", label: "Pending Delivery" },
    { key: "invoice", label: "Delivered, Awaiting Invoice" },
    { key: "quotations", label: "Pending Quotations" },
    { key: "sales_order", label: "Sales Order", noCount: true }
  ];

  var salesCache = {
    summary: {},
    countsKey: null,
    counts: null,
    countsFailed: false,
    countsSeq: 0
  };

  function salesViewLabel(key) {
    for (var i = 0; i < salesViews.length; i++) {
      if (salesViews[i].key === key) return salesViews[i].label;
    }
    return "Sales Breakdown";
  }

  function salesSummaryKey(range) {
    return [state.company, state.measure, state.period, range.from, range.to]
      .join("|");
  }

  function salesShell(range) {
    var shell = content.querySelector("[data-sales-shell]");

    if (!shell) {
      content.innerHTML =
        '<div data-sales-shell>' +
        '<div class="cc-sales-head"></div>' +
        '<div class="cc-sales-cards"></div>' +
        '<nav class="cc-views" aria-label="Sales views"></nav>' +
        '<section class="cc-sales-detail" aria-live="polite"></section>' +
        '<section class="cc-sales-trend"></section>' +
        '<div class="cc-sales-notes"></div>' +
        '</div>';
      shell = content.querySelector("[data-sales-shell]");
    }

    shell.querySelector(".cc-sales-head").innerHTML = header(range);
    renderViewTabs();
    return shell;
  }

  // Tab counts are cached per company and date range.
  function countsScope() {
    var r = dateRange();
    return [state.company, r.from, r.to].join("|");
  }

  function viewCount(key) {
    var counts = salesCache.counts;

    if (!counts || salesCache.countsKey !== countsScope()) return null;

    if (key === "quotations") {
      return counts.quotations ? counts.quotations.summary.count : null;
    }

    if (!counts.orders) return null;
    if (key === "orders") return counts.orders.summary.count;
    if (key === "delivery") return counts.orders.categories[0].count;
    if (key === "invoice") return counts.orders.categories[1].count;
    return null;
  }

  function renderViewTabs() {
    var nav = content.querySelector(".cc-views");
    if (!nav) return;

    var current = salesCache.countsKey === countsScope();

    nav.innerHTML = salesViews.map(function (view) {
      var active = state.backlog === view.key;
      var count = view.key && !view.noCount ? viewCount(view.key) : null;
      var countText = "";

      if (view.key && !view.noCount) {
        countText = count !== null
          ? number(count).toLocaleString("en-US")
          : (current && salesCache.countsFailed ? "—" : "…");
      }

      return '<button type="button" class="cc-view' +
        (active ? ' active' : '') + '" data-sales-view="' + view.key +
        '" aria-pressed="' + active + '">' +
        '<span>' + esc(view.label) + '</span>' +
        (view.key && !view.noCount
          ? ' <span class="cc-view-count" title="Still pending · documents dated in the selected range">' +
            countText + '</span>'
          : '') +
        '</button>';
    }).join("");
  }

  function loadViewCounts(force) {
    if (!force && salesCache.countsKey === countsScope() && salesCache.counts) return;

    var key = countsScope();
    var countsRange = dateRange();
    var countsCompany = state.company;
    var token = ++salesCache.countsSeq;
    var results = {};
    var failed = false;
    var pending = 2;

    // A forced refresh keeps the current badges visible until fresh counts arrive.
    if (!force || salesCache.countsKey !== key) salesCache.counts = null;
    salesCache.countsKey = key;
    salesCache.countsFailed = false;

    function done() {
      pending = pending - 1;
      if (pending > 0 || token !== salesCache.countsSeq) return;

      salesCache.counts = results;
      salesCache.countsFailed = failed || !results.orders || !results.quotations;
      if (state.department === "Sales") renderViewTabs();
    }

    ["orders", "quotations"].forEach(function (kind) {
      frappe.call({
        method: "ceo_command_center_sales_backlog",
        args: {
          kind: kind, company: countsCompany, summary_only: 1,
          from_date: countsRange.from, to_date: countsRange.to
        },
        callback: function (response) {
          if (!response.exc && response.message && response.message.summary) {
            results[kind] = response.message;
          } else {
            failed = true;
          }
          done();
        },
        error: function () {
          failed = true;
          done();
        }
      });
    });
  }

  function renderSalesSummary(shell, data) {
    shell.querySelector(".cc-sales-cards").innerHTML =
      salesCardsMarkup(data, 0);
    // At the top level the trend is the overall trend; drill-downs set their own.
    if (!state.path.length) {
      shell.querySelector(".cc-sales-trend").innerHTML = salesTrendPanel(data);
    }
  }

  function renderSalesSummaryError(shell) {
    shell.querySelector(".cc-sales-cards").innerHTML =
      '<div class="cc-error">Sales totals could not be loaded. ' +
      'No partial totals are displayed.</div>';
    shell.querySelector(".cc-sales-trend").innerHTML = "";
  }

  function releaseSalesHeights(detail) {
    if (detail) {
      detail.style.minHeight = "";
      detail.removeAttribute("aria-busy");
    }
    content.style.minHeight = "";
    content.removeAttribute("aria-busy");
  }

  function salesNotes(shell, html) {
    shell.querySelector(".cc-sales-notes").innerHTML =
      '<details class="cc-rules"><summary>Definitions and data notes</summary>' +
      '<div class="cc-note">' + html + '</div></details>';
  }

  // Sales Breakdown levels: Company (when all companies are in scope) -> Location -> Salesperson -> Records.
  function salesLevels() {
    return state.company
      ? ["location", "salesperson", "records"]
      : ["company", "location", "salesperson", "records"];
  }
  function salesPathKey(level) {
    for (var i = 0; i < state.path.length; i++) {
      if (state.path[i].level === level) return state.path[i].key;
    }
    return "";
  }
  function bdMeasure() {
    return state.backlog === "sales_order" ? "booked" : state.measure;
  }

  function renderBreakdownDetail(shell, data, target) {
    var detail = target || shell.querySelector(".cc-sales-detail");
    var current = data.current;
    var currency = data.currency;
    var depth = state.path.length;
    var levels = salesLevels();
    var isRecords = levels[depth] === "records";
    var levelLabel = { company: "Company", location: "Location", salesperson: "Salesperson", records: "Records" }[levels[depth]];
    var measureLabel = bdMeasure() === "invoiced"
      ? "Net invoiced sales"
      : "Booked sales";

    var groups = (current.groups || []).slice().sort(function (a, b) {
      return number(b.amount) - number(a.amount);
    });

    var maximum = Math.max.apply(
      null,
      groups.map(function (group) {
        return Math.abs(number(group.amount));
      }).concat([1])
    );

    var breadcrumbs =
      '<button class="cc-button" type="button" ' +
      'data-depth="0">' + (levels[0] === "company" ? "All Companies" : "All Locations") + '</button>';

    state.path.forEach(function (item, index) {
      breadcrumbs +=
        '<span>›</span>' +
        '<button class="cc-button" type="button" data-depth="' +
        (index + 1) + '">' + esc(item.label) + '</button>';
    });

    var bars = groups.map(function (group, index) {
      var amount = number(group.amount);

      return '<button type="button" class="cc-bar" data-group="' +
        index + '">' +
        '<span>' + esc(group.label) + '</span>' +
        '<span class="cc-track"><span class="cc-fill' +
        (amount < 0 ? ' negative' : '') +
        '" style="width:' + Math.abs(amount) / maximum * 100 +
        '%"></span></span>' +
        '<span class="cc-number">' + money(amount, currency) + '</span>' +
      '</button>';
    }).join("");

    var table = "";

    if (!isRecords) {
      table =
        '<div class="cc-panel cc-records">' +
        '<table class="cc-table"><thead><tr>' +
        '<th>' + levelLabel + '</th><th>Documents</th>' +
        '<th class="cc-number">Net value</th>' +
        '</tr></thead><tbody>' +
        groups.map(function (group, index) {
          return '<tr><td><button type="button" class="cc-button" ' +
            'data-group="' + index + '">' + esc(group.label) +
            '</button></td><td>' + group.count + '</td>' +
            '<td class="cc-number">' +
            money(group.amount, currency) + '</td></tr>';
        }).join("") +
        '</tbody><tfoot><tr><th>Total</th><th>' +
        current.count + '</th><th class="cc-number">' +
        money(current.amount, currency) +
        '</th></tr></tfoot></table></div>';
    } else {
      var route = bdMeasure() === "invoiced" ? "sales-invoice" : "sales-order";
      var pageSize = current.record_page_size || 50;
      var pages = Math.max(1, Math.ceil(current.count / pageSize));
      var records = current.records || [];
      var firstRecord = current.count ? state.page * pageSize + 1 : 0;
      var lastRecord = state.page * pageSize + records.length;

      table =
        '<div class="cc-panel cc-records">' +
        '<h3>Underlying records</h3>' +
        '<div class="cc-caption">Showing ' + firstRecord +
        '–' + lastRecord + ' of ' + current.count + '</div>' +
        '<table class="cc-table"><thead><tr>' +
        '<th>Document</th><th>Date</th><th>Customer</th><th>Company</th>' +
        '<th class="cc-number">Net value</th>' +
        '</tr></thead><tbody>' +
        records.map(function (record) {
          return '<tr><td><a href="/app/' + route + '/' +
            encodeURIComponent(record.name) +
            '" target="_blank" rel="noopener">' +
            esc(record.name) + '</a>' +
            (record.is_return ? ' <small>Return</small>' : '') +
            '</td><td>' + esc(record.date) +
            '</td><td>' + esc(record.customer) +
            '</td><td>' + esc(record.company) +
            '</td><td class="cc-number">' +
            money(record.amount, currency) + '</td></tr>';
        }).join("") +
        '</tbody><tfoot><tr>' +
        '<th colspan="4">All matching records: ' + current.count + '</th>' +
        '<th class="cc-number">' + money(current.amount, currency) +
        '</th></tr></tfoot></table>' +
        '<div class="cc-pager">' +
        '<button type="button" class="cc-button" data-page="previous" ' +
        (state.page === 0 ? 'disabled' : '') + '>Previous</button>' +
        '<span>Page ' + (state.page + 1) + ' of ' + pages + '</span>' +
        '<button type="button" class="cc-button" data-page="next" ' +
        (state.page + 1 >= pages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    detail.innerHTML =
      '<div class="cc-detail-head"><h3>Location & Item Department · ' + measureLabel +
      '</h3><div class="cc-caption">Selected period · ' +
      esc(data.current.from_date) + ' to ' + esc(data.current.to_date) +
      ' · In scope: ' + number(current.count).toLocaleString("en-US") + ' ' +
      (bdMeasure() === "invoiced" ? 'invoices' : 'orders') + ' · ' +
      esc(money(current.amount, currency)) +
      (target ? ' · Each order is credited 100% to its header salesperson' + (state.soLocation ? ' · salesperson location ' + esc(state.soLocation) : '') + '; the salesperson location filter applies here, the salesperson and brand filters do not.' : (depth > 0 ? ' · Comparisons are shown for the overall view only.' : '')) +
      '</div></div>' +
      '<div class="cc-breadcrumbs">' + breadcrumbs + '</div>' +
      '<div class="cc-grid cc-loc-dept"><section class="cc-panel">' +
        '<h3>' + levelLabel + (!isRecords ? ' breakdown' : '') + '</h3>' +
        '<div class="cc-caption">' +
        (!isRecords ? 'Click a bar to drill down.' : 'Open records below.') +
        '</div>' +
        (!isRecords
          ? bars || '<div class="cc-empty">No submitted transactions.</div>'
          : '<div class="cc-empty"><strong>' + current.count +
            ' matching records</strong><span>' +
            esc(money(current.amount, currency)) + '</span></div>') +
      '</section>' +
      '<section class="cc-panel cc-dept" data-dept-panel aria-live="polite"><div class="cc-empty">Loading Item Department…</div></section></div>' +
      '<div data-dept-records></div>' +
      table;

    if (!target) salesNotes(shell,
      (bdMeasure() === "invoiced"
        ? 'Returns included: ' + current.returns_count + ' · ' +
          esc(money(current.returns_amount, currency)) + '. '
        : 'Booked Sales includes all submitted order statuses. ') +
      'Values exclude taxes and use company currency. ' +
      'Summary cards, Sales Breakdown and Sales trend follow the selected period. ' +
      'Pending tabs show documents dated within the range that are still pending. ' +
      'Fence/CSD location mapping and sales targets remain pending. ' +
      'Totals respect the logged-in user’s ERP record permissions.');

    loadDeptPanel(detail, data);

    detail.querySelectorAll("[data-group]").forEach(function (button) {
      button.onclick = function () {
        var group = groups[Number(button.dataset.group)];

        // Preserve the API key verbatim, including ~unassigned~.
        state.path.push({ level: levels[depth], key: group.key, label: group.label });
        state.page = 0;
        render();
      };
    });
  }

  function supportTrendMarkup(data) {
    var daily = {};

    (data.trend || []).forEach(function (row) {
      daily[row.date] = number(row.count);
    });

    var grouped = {};
    var date = data.from_date;
    var monthly = state.period === "Yearly";

    while (date <= data.to_date) {
      var label = monthly ? date.slice(0, 7) : date;
      grouped[label] = number(grouped[label]) + number(daily[date]);
      date = addDays(date, 1);
    }

    var labels = Object.keys(grouped).sort();

    if (!labels.length) {
      return '<div class="cc-empty">No quotation activity.</div>';
    }

    var values = labels.map(function (label) {
      return grouped[label];
    });

    var maximum = Math.max.apply(null, values.concat([1]));
    var tickStep = Math.max(1, Math.ceil(maximum / 3));
    maximum = tickStep * 3;

    var left = 75;
    var right = 605;
    var top = 35;
    var bottom = 210;

    function x(index) {
      return labels.length === 1
        ? (left + right) / 2
        : left + index * (right - left) / (labels.length - 1);
    }

    function y(value) {
      return bottom - value / maximum * (bottom - top);
    }

    var svg =
      '<svg class="cc-trend" viewBox="0 0 640 265" ' +
      'role="img" aria-label="Quotation counts by issue date">' +
      '<text x="75" y="18" fill="var(--cc-muted)" font-size="12">' +
      'Quotations</text>';

    for (var i = 0; i <= 3; i++) {
      var tick = tickStep * i;

      svg +=
        '<line x1="' + left + '" x2="' + right +
        '" y1="' + y(tick) + '" y2="' + y(tick) +
        '" stroke="var(--cc-border)"/>' +
        '<text x="65" y="' + (y(tick) + 4) +
        '" text-anchor="end" fill="var(--cc-muted)" font-size="12">' +
        Math.round(tick).toLocaleString("en-US") + '</text>';
    }

    svg +=
      '<polyline points="' +
      values.map(function (value, index) {
        return x(index) + "," + y(value);
      }).join(" ") +
      '" fill="none" stroke="var(--cc-blue)" stroke-width="3"/>';

    values.forEach(function (value, index) {
      svg +=
        '<circle cx="' + x(index) + '" cy="' + y(value) +
        '" r="3" fill="var(--cc-blue)"><title>' +
        esc(labels[index] + " · " + value + " quotations") +
        '</title></circle>';
    });

    svg +=
      '<text x="' + left +
      '" y="238" fill="var(--cc-muted)" font-size="12">' +
      esc(labels[0]) + '</text>';

    if (labels.length > 1) {
      svg +=
        '<text x="' + right +
        '" y="238" text-anchor="end" fill="var(--cc-muted)" font-size="12">' +
        esc(labels[labels.length - 1]) + '</text>';
    }

    svg +=
      '<text x="350" y="260" text-anchor="middle" ' +
      'fill="var(--cc-muted)" font-size="12">' +
      (monthly ? "Month" : "Quotation issue date") +
      '</text></svg>';

    return svg;
  }

  function renderSalesSupport(data, range) {
    content.style.minHeight = "";
    content.removeAttribute("aria-busy");
    var depth = state.path.length;
    var currency = data.currency;
    var summary = data.summary;

    var groups = (
      depth === 0 ? data.status_groups : data.creator_groups
    ) || [];

    groups = groups.slice().sort(function (a, b) {
      return number(b.count) - number(a.count);
    });

    var maximum = Math.max.apply(
      null,
      groups.map(function (group) {
        return number(group.count);
      }).concat([1])
    );

    var breadcrumbs =
      '<button type="button" class="cc-button" data-depth="0">' +
      'All Quotation States</button>';

    state.path.forEach(function (item, index) {
      breadcrumbs +=
        '<span>›</span>' +
        '<button type="button" class="cc-button" data-depth="' +
        (index + 1) + '">' + esc(item.label) + '</button>';
    });

    var cards = (data.cards || []).map(function (card) {
      return '<div class="cc-kpi">' +
        '<div class="cc-kpi-label">' + esc(card.label) + '</div>' +
        '<div class="cc-kpi-value">' +
        number(card.count).toLocaleString("en-US") +
        '</div>' +
        '<div class="cc-kpi-note">' +
        esc(money(card.amount, currency)) +
        ' · Net quotation value</div>' +
        (depth === 0
          ? '<button type="button" class="cc-button" ' +
            'data-support-card="' + esc(card.key) + '">View quotations</button>'
          : '') +
        '</div>';
    }).join("");

    var chartTitle = depth === 0
      ? "Quotation state breakdown"
      : depth === 1
        ? "Created By breakdown"
        : "Quotation records";

    var bars = groups.map(function (group, index) {
      return '<button type="button" class="cc-bar" ' +
        'data-support-group="' + index + '">' +
        '<span>' + esc(group.label) + '</span>' +
        '<span class="cc-track"><span class="cc-fill" style="width:' +
        number(group.count) / maximum * 100 + '%"></span></span>' +
        '<span class="cc-number">' +
        number(group.count).toLocaleString("en-US") +
        (number(group.count) === 1
        ? ' quotation</span>'
        : ' quotations</span>') +
        '</button>';
    }).join("");

    var table = "";

    if (depth < 2) {
      table =
        '<div class="cc-panel cc-records">' +
        '<table class="cc-table"><thead><tr>' +
        '<th>' + (depth === 0 ? "Quotation state" : "Created By") + '</th>' +
        '<th class="cc-number">Quotations</th>' +
        '<th class="cc-number">Net quotation value</th>' +
        (depth === 0 ? '<th>Inconsistent</th>' : '') +
        '</tr></thead><tbody>' +
        groups.map(function (group, index) {
          return '<tr><td><button type="button" class="cc-button" ' +
            'data-support-group="' + index + '">' +
            esc(group.label) + '</button></td>' +
            '<td class="cc-number">' +
            number(group.count).toLocaleString("en-US") + '</td>' +
            '<td class="cc-number">' +
            esc(money(group.amount, currency)) + '</td>' +
            (depth === 0
              ? '<td>' + number(group.inconsistent_count) + '</td>'
              : '') +
            '</tr>';
        }).join("") +
        '</tbody><tfoot><tr><th>Selected scope total</th>' +
        '<th class="cc-number">' +
        number(summary.count).toLocaleString("en-US") + '</th>' +
        '<th class="cc-number">' +
        esc(money(summary.amount, currency)) + '</th>' +
        (depth === 0
          ? '<th>' + number(summary.inconsistent_count) + '</th>'
          : '') +
        '</tr></tfoot></table></div>';
    } else {
      var records = data.records || [];
      var pageSize = data.record_page_size || 50;
      var pages = Math.max(1, Math.ceil(summary.count / pageSize));

      var firstRecord = summary.count
        ? state.page * pageSize + 1
        : 0;

      var lastRecord = state.page * pageSize + records.length;

      table =
        '<div class="cc-panel cc-records">' +
        '<h3>Underlying quotations</h3>' +
        '<div class="cc-caption">Showing ' + firstRecord +
        '–' + lastRecord + ' of ' + summary.count + '</div>' +
        '<table class="cc-table"><thead><tr>' +
        '<th>Quotation</th><th>Issue date</th><th>Customer / Lead</th>' +
        '<th>Workflow state</th><th>Document state</th>' +
        '<th class="cc-number">Net value</th>' +
        '</tr></thead><tbody>' +
        records.map(function (record) {
          var documentState = ["Draft", "Submitted", "Cancelled"][
            number(record.docstatus)
          ] || "Other";

          return '<tr><td><a href="/app/quotation/' +
            encodeURIComponent(record.name) +
            '" target="_blank" rel="noopener">' +
            esc(record.name) + '</a></td>' +
            '<td>' + esc(record.date) + '</td>' +
            '<td>' + esc(record.party) + '</td>' +
            '<td>' + esc(record.workflow_state || "Unassigned") + '</td>' +
            '<td>' + esc(documentState) + '</td>' +
            '<td class="cc-number">' +
            esc(money(record.amount, currency)) + '</td></tr>';
        }).join("") +
        '</tbody><tfoot><tr>' +
        '<th colspan="5">All matching quotations: ' + summary.count + '</th>' +
        '<th class="cc-number">' +
        esc(money(summary.amount, currency)) + '</th>' +
        '</tr></tfoot></table>' +
        '<div class="cc-pager">' +
        '<button type="button" class="cc-button" data-page="previous" ' +
        (state.page === 0 ? 'disabled' : '') + '>Previous</button>' +
        '<span>Page ' + (state.page + 1) + ' of ' + pages + '</span>' +
        '<button type="button" class="cc-button" data-page="next" ' +
        (state.page + 1 >= pages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    var workflows = (data.workflow_combinations || []).map(function (row) {
      return '<tr><td>' + esc(row.company) + '</td>' +
        '<td>' + esc(["Draft", "Submitted", "Cancelled"][
          number(row.docstatus)
        ] || "Other") + '</td>' +
        '<td>' + esc(row.workflow_state) + '</td>' +
        '<td class="cc-number">' + number(row.count) + '</td>' +
        '<td>' + (row.inconsistent ? "Check required" : "—") +
        '</td></tr>';
    }).join("");

    var conversion = (data.order_conversion || []).map(function (row) {
      return esc(row.status) + ": " +
        number(row.count).toLocaleString("en-US");
    }).join(" · ");

    content.innerHTML =
      header(range) +
      '<div class="cc-caption">' +
      number(summary.count).toLocaleString("en-US") +
      ' quotations in selected scope · Draft: ' + summary.draft_count +
      ' · Submitted: ' + summary.submitted_count +
      ' · Cancelled: ' + summary.cancelled_count +
      ' · Inconsistent: ' + summary.inconsistent_count +
      '</div>' +
      '<div class="cc-kpis" style="margin-top:16px">' + cards + '</div>' +
      '<div class="cc-caption">' +
      (depth === 0
        ? 'Cards cover the selected date and company.'
        : 'Cards are filtered to the selected state and creator; other categories show zero.') +
      '</div>' +
      '<div class="cc-breadcrumbs" style="margin-top:16px">' +
      breadcrumbs + '</div>' +
      '<div class="cc-grid">' +
        '<section class="cc-panel"><h3>' + chartTitle + '</h3>' +
        '<div class="cc-caption">' +
        (depth < 2
          ? 'Click a bar to drill down. Bars show quotation counts.'
          : 'Open the underlying quotation records below.') +
        '</div>' +
        (depth < 2
          ? bars || '<div class="cc-empty">No matching quotations.</div>'
          : '<div class="cc-empty"><strong>' + summary.count +
            ' matching quotations</strong><span>' +
            esc(money(summary.amount, currency)) + '</span></div>') +
        '</section>' +
        '<section class="cc-panel"><h3>Quotation activity</h3>' +
        '<div class="cc-caption">By quotation issue date · ' +
        (state.period === "Yearly" ? "Monthly counts" : "Daily counts") +
        '</div>' + supportTrendMarkup(data) + '</section>' +
      '</div>' +
      table +
      '<div class="cc-panel cc-records">' +
      '<h3>Workflow detail</h3>' +
      '<table class="cc-table"><thead><tr>' +
      '<th>Company</th><th>Document state</th><th>Workflow state</th>' +
      '<th class="cc-number">Count</th><th>Check</th>' +
      '</tr></thead><tbody>' + workflows + '</tbody></table></div>' +
      '<div class="cc-note">' +
      'Created By uses the document owner, not a dedicated preparer field. ' +
      'Values are net quotation values, not revenue, and include all states in the selected scope. ' +
      'Approval and cancellation states are current states of quotations issued in the selected period, ' +
      'not historical snapshots. Approved drafts are not finalized completion. ' +
      'Enquiry timing and one-hour SLA metrics remain pending.' +
      (conversion
        ? '<br>Submitted order-status indicators in this scope: ' + conversion +
          '. Customer acceptance alone does not prove an order exists.'
        : '') +
      '</div>';

    badge.textContent =
      "Sales and Sales Support connected · Other departments pending";

    content.querySelectorAll("[data-support-group]").forEach(function (button) {
      button.onclick = function () {
        var group = groups[Number(button.dataset.supportGroup)];

        state.path.push({
          key: group.key,
          label: group.label
        });

        state.page = 0;
        render();
      };
    });

    content.querySelectorAll("[data-support-card]").forEach(function (button) {
      button.onclick = function () {
        var card = (data.cards || []).find(function (item) {
          return item.key === button.dataset.supportCard;
        });

        if (!card) return;

        state.path = [{
          key: card.key,
          label: card.label
        }];

        state.page = 0;
        render();
      };
    });
  }

  function loadSalesSupport(id, range) {
    content.innerHTML =
      header(range) +
      '<div class="cc-empty"><strong>Loading Sales Support…</strong>' +
      '<span>Reading quotation workflow states and creator groups.</span></div>';

    badge.textContent = "Loading Sales Support";

    function failed() {
      if (id !== requestId) return;

      badge.textContent = "Sales Support connection error";
      content.style.minHeight = "";
      content.removeAttribute("aria-busy");

      content.innerHTML =
        header(range) +
        '<div class="cc-error">' +
        'Quotation data could not be loaded. Check the ERP error message ' +
        'and API permissions. No partial results are displayed.</div>';
    }

    frappe.call({
      method: "ceo_command_center_sales_support",
      args: {
        from_date: range.from,
        to_date: range.to,
        company: state.company,
        level: ["status", "creator", "records"][state.path.length],
        status_key: state.path[0] ? state.path[0].key : "",
        created_by: state.path[1] ? state.path[1].key : "",
        record_page: state.page
      },
      callback: function (response) {
        if (id !== requestId) return;

        if (response.exc || !response.message || !response.message.summary) {
          failed();
          return;
        }

        renderSalesSupport(response.message, range);
      },
      error: failed
    });
  }

  var backlogTitles = {
    orders: "Pending Sales Orders",
    delivery: "Pending Delivery",
    invoice: "Delivered, Awaiting Invoice",
    quotations: "Pending Quotations"
  };

  var backlogLevelLabels = {
    company: "Company",
    division: "Division",
    location: "Location",
    salesperson: "Salesperson",
    records: "Records"
  };

  function backlogLevels() {
    return state.company
      ? ["location", "salesperson", "records"]
      : ["company", "location", "salesperson", "records"];
  }

  function backlogPathKey(level) {
    for (var i = 0; i < state.path.length; i++) {
      if (state.path[i].level === level) return state.path[i].key;
    }

    return "";
  }

  function backlogCount(value, singular, plural) {
    return number(value).toLocaleString("en-US") + " " +
      (number(value) === 1 ? singular : plural);
  }

  function statusLine(statuses) {
    return (statuses || []).map(function (item) {
      return esc(item.status) + ": " +
        number(item.count).toLocaleString("en-US");
    }).join(" · ");
  }

  function renderPendingDetail(shell, data) {
    var detail = shell.querySelector(".cc-sales-detail");
    var levels = backlogLevels();
    var depth = state.path.length;
    var level = levels[depth];
    var isRecords = level === "records";
    var kind = state.backlog;
    var currency = data.currency;
    var summary = data.summary;
    var isQuotation = kind === "quotations";
    var singular = isQuotation ? "quotation" : "order";
    var plural = isQuotation ? "quotations" : "orders";
    var levelLabel = backlogLevelLabels[level];

    var groups = (data.groups || []).slice().sort(function (a, b) {
      return number(b.count) - number(a.count);
    });

    var maximum = Math.max.apply(
      null,
      groups.map(function (group) {
        return number(group.count);
      }).concat([1])
    );

    var breadcrumbs =
      '<button type="button" class="cc-button" data-depth="0">' +
      'All ' + (levels[0] === "company" ? 'Companies' : 'Locations') +
      '</button>';

    state.path.forEach(function (item, index) {
      breadcrumbs +=
        '<span>›</span>' +
        '<button type="button" class="cc-button" data-depth="' +
        (index + 1) + '">' + esc(item.label) + '</button>';
    });

    var relation = "";

    if (kind === "orders") {
      var deliveryCat = data.categories[0];
      var invoiceCat = data.categories[1];

      relation =
        '<div class="cc-relation"><strong>Pending Sales Orders ' +
        number(summary.count).toLocaleString("en-US") +
        '</strong> = Pending Delivery ' +
        number(deliveryCat.count).toLocaleString("en-US") +
        ' + Delivered, Awaiting Invoice ' +
        number(invoiceCat.count).toLocaleString("en-US") +
        ' · ' + esc(money(summary.amount, currency)) + ' = ' +
        esc(money(deliveryCat.amount, currency)) + ' + ' +
        esc(money(invoiceCat.amount, currency)) +
        '<br><span class="cc-caption">Parent total of the Pending Delivery ' +
        'and Delivered, Awaiting Invoice tabs. The two parts do not overlap; ' +
        'do not add the parent to them.</span></div>';
    } else if (kind === "delivery" || kind === "invoice") {
      relation =
        '<div class="cc-relation"><span class="cc-caption">Part of ' +
        'Pending Sales Orders: Pending Sales Orders = Pending Delivery + ' +
        'Delivered, Awaiting Invoice. The two parts do not overlap.</span></div>';
    }

    var scopeCards = data.categories.map(function (category) {
      return '<div class="cc-kpi"><div class="cc-kpi-label">' +
        esc(category.label) + ' · in scope</div>' +
        '<div class="cc-kpi-value">' +
        number(category.count).toLocaleString("en-US") + '</div>' +
        '<div class="cc-kpi-note">' +
        esc(money(category.amount, currency)) + '</div>' +
        '<div class="cc-kpi-note" style="margin-top:6px">' +
        statusLine(category.statuses) + '</div></div>';
    }).join("");

    if (isQuotation && (data.age_buckets || []).length) {
      scopeCards +=
        '<div class="cc-kpi"><div class="cc-kpi-label">' +
        'Age of approved, not submitted · in scope</div>' +
        '<div class="cc-kpi-note">By quotation issue date</div>' +
        '<div class="cc-kpi-note" style="margin-top:6px">' +
        data.age_buckets.map(function (bucket) {
          return esc(bucket.label) + ": " +
            number(bucket.count).toLocaleString("en-US");
        }).join("<br>") +
        '</div></div>';
    }

    var bars = groups.map(function (group, index) {
      return '<button type="button" class="cc-bar" ' +
        'data-backlog-group="' + index + '">' +
        '<span>' + esc(group.label) + '</span>' +
        '<span class="cc-track"><span class="cc-fill" style="width:' +
        number(group.count) / maximum * 100 + '%"></span></span>' +
        '<span class="cc-number">' +
        backlogCount(group.count, singular, plural) + '<br>' +
        esc(money(group.amount, currency)) + '</span>' +
        '</button>';
    }).join("");

    var splitColumns = data.categories.length > 1;
    var table = "";

    if (!isRecords) {
      table =
        '<div class="cc-panel cc-records">' +
        '<table class="cc-table"><thead><tr>' +
        '<th>' + levelLabel + '</th>' +
        (splitColumns
          ? data.categories.map(function (category) {
              return '<th class="cc-number">' + esc(category.label) + '</th>';
            }).join("")
          : '') +
        '<th class="cc-number">' + esc(backlogTitles[kind]) + '</th>' +
        '<th class="cc-number">Net value</th>' +
        '</tr></thead><tbody>' +
        groups.map(function (group, index) {
          var split = group.by_category || {};

          return '<tr><td><button type="button" class="cc-button" ' +
            'data-backlog-group="' + index + '">' +
            esc(group.label) + '</button></td>' +
            (splitColumns
              ? data.categories.map(function (category) {
                  return '<td class="cc-number">' +
                    number(split[category.key]).toLocaleString("en-US") +
                    '</td>';
                }).join("")
              : '') +
            '<td class="cc-number">' +
            number(group.count).toLocaleString("en-US") + '</td>' +
            '<td class="cc-number">' +
            esc(money(group.amount, currency)) + '</td></tr>';
        }).join("") +
        '</tbody><tfoot><tr><th>Total in scope</th>' +
        (splitColumns
          ? data.categories.map(function (category) {
              return '<th class="cc-number">' +
                number(category.count).toLocaleString("en-US") + '</th>';
            }).join("")
          : '') +
        '<th class="cc-number">' +
        number(summary.count).toLocaleString("en-US") + '</th>' +
        '<th class="cc-number">' + esc(money(summary.amount, currency)) +
        '</th></tr></tfoot></table></div>';
    } else {
      var records = data.records || [];
      var pageSize = data.record_page_size || 50;
      var pages = Math.max(1, Math.ceil(summary.count / pageSize));
      var firstRecord = summary.count ? state.page * pageSize + 1 : 0;
      var lastRecord = state.page * pageSize + records.length;
      var route = isQuotation ? "quotation" : "sales-order";

      table =
        '<div class="cc-panel cc-records">' +
        '<h3>' + esc(backlogTitles[kind]) + ' · records</h3>' +
        '<div class="cc-caption">Showing ' + firstRecord + '–' +
        lastRecord + ' of ' + summary.count + '</div>' +
        '<table class="cc-table"><thead><tr>' +
        '<th>Document</th><th>Date</th><th>Customer</th>' +
        '<th>Category</th><th>Status</th><th>Detail</th>' +
        '<th class="cc-number">Net value</th>' +
        '</tr></thead><tbody>' +
        records.map(function (record) {
          return '<tr><td><a href="/app/' + route + '/' +
            encodeURIComponent(record.name) +
            '" target="_blank" rel="noopener">' + esc(record.name) +
            '</a></td><td>' + esc(record.date) + '</td>' +
            '<td>' + esc(record.customer) + '</td>' +
            '<td>' + esc(record.category) + '</td>' +
            '<td>' + esc(record.status) + '</td>' +
            '<td>' + esc(record.detail) + '</td>' +
            '<td class="cc-number">' + esc(money(record.amount, currency)) +
            '</td></tr>';
        }).join("") +
        '</tbody><tfoot><tr><th colspan="6">All matching ' + plural + ': ' +
        summary.count + '</th><th class="cc-number">' +
        esc(money(summary.amount, currency)) + '</th></tr></tfoot></table>' +
        '<div class="cc-pager">' +
        '<button type="button" class="cc-button" data-page="previous" ' +
        (state.page === 0 ? 'disabled' : '') + '>Previous</button>' +
        '<span>Page ' + (state.page + 1) + ' of ' + pages + '</span>' +
        '<button type="button" class="cc-button" data-page="next" ' +
        (state.page + 1 >= pages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    var definition = {
      orders: 'Pending Sales Orders: submitted orders, excluding Closed ' +
        'and Cancelled, that are not fully delivered or not fully invoiced. ' +
        'It is the parent total of Pending Delivery and Delivered, Awaiting ' +
        'Invoice, which do not overlap.',
      delivery: 'Pending Delivery: submitted orders not fully delivered, ' +
        'excluding Closed and Cancelled. On Hold orders are included and ' +
        'identified separately. Orders billed before delivery are labelled.',
      invoice: 'Delivered, Awaiting Invoice: submitted orders fully ' +
        'delivered but not fully invoiced, excluding Closed and Cancelled.',
      quotations: 'Pending Quotations: approved drafts plus submitted ' +
        'quotations not Ordered, Lost, Rejected By Customer or Cancelled. ' +
        'Partially Ordered and Expired quotations are included and shown ' +
        'separately. Drafts awaiting internal approval remain in Sales Support.'
    }[kind];

    detail.innerHTML =
      '<div class="cc-detail-head"><h3>' + esc(backlogTitles[kind]) + '</h3>' +
      '<div class="cc-caption"><strong>Still pending · ' +
      (isQuotation ? 'quotations' : 'orders') + ' dated ' +
      esc(dateRange().from) + ' to ' + esc(dateRange().to) + '</strong>' +
      ' · Company, date range and selected levels applied · ' +
      (isQuotation ? 'Net quotation value' : 'Full order net value') +
      '</div></div>' +
      relation +
      '<div class="cc-breadcrumbs">' + breadcrumbs + '</div>' +
      '<div class="cc-kpis">' + scopeCards + '</div>' +
      '<section class="cc-panel"><h3>' +
      (isRecords ? 'Records' : levelLabel + ' breakdown') + '</h3>' +
      '<div class="cc-caption">' +
      (isRecords
        ? 'Open the underlying documents below.'
        : 'Click a bar to drill down. Each level shows count and net value.') +
      '</div>' +
      (isRecords
        ? '<div class="cc-empty"><strong>' +
          backlogCount(summary.count, singular, plural) + '</strong><span>' +
          esc(money(summary.amount, currency)) + '</span></div>'
        : bars || '<div class="cc-empty">No pending ' + plural + '.</div>') +
      '</section>' +
      table;

    salesNotes(shell, definition +
      ' Everything on this tab follows the selected company and date range. ' +
      'This view lists documents dated within the range (order or quotation ' +
      'date) that are still pending today. ' +
      'Totals respect the logged-in user’s ERP record permissions.');

    detail.querySelectorAll("[data-backlog-group]").forEach(function (button) {
      button.onclick = function () {
        var group = groups[Number(button.dataset.backlogGroup)];

        state.path.push({ level: level, key: group.key, label: group.label });
        state.page = 0;
        render();
      };
    });
  }

  function renderSalesArea(id, range) {
    var shell = salesShell(range);
    var detail = shell.querySelector(".cc-sales-detail");
    var summaryKey = salesSummaryKey(range);
    var cached = salesCache.summary[summaryKey];
    var view = state.backlog;
    // The Sales Order tab has its own order trend; hide the invoiced/booked trend there.
    shell.querySelector(".cc-sales-trend").hidden = view === "sales_order";
    var shareSummary = view === "" && state.path.length === 0 && state.page === 0;

    badge.textContent = "Loading Sales";

    // Preserve the detail area's height while it loads.
    detail.style.minHeight =
      Math.ceil(detail.getBoundingClientRect().height) + "px";
    detail.setAttribute("aria-busy", "true");
    detail.innerHTML =
      '<div class="cc-empty"><strong>Loading ' + esc(salesViewLabel(view)) +
      '…</strong><span>' +
      (view === 'sales_order' ? 'Reading submitted Sales Orders.' : view ? 'Reading the current backlog.' : 'Reading submitted documents.') +
      '</span></div>';

    loadViewCounts();

    // While drilled down, the trend shows only the selected scope.
    if (state.path.length) {
      shell.querySelector(".cc-sales-trend").innerHTML =
        '<section class="cc-panel cc-records"><h3>Sales trend</h3>' +
        '<div class="cc-caption">Loading the trend for ' +
        esc(trendScopeLabel()) + '…</div></section>';
    }

    function finishDetail() {
      releaseSalesHeights(detail);
      badge.textContent =
        "Sales and Sales Support connected · Other departments pending";
    }

    function detailError(message) {
      if (id !== requestId) return;
      detail.innerHTML = '<div class="cc-error">' + message +
        ' Check the ERP error message and API permissions. ' +
        'No partial totals are displayed.</div>';
      releaseSalesHeights(detail);
      badge.textContent = "Sales connection error";
    }

    // Summary cards and trend (selected period).
    if (cached) {
      renderSalesSummary(shell, cached);
    } else {
      shell.querySelector(".cc-sales-cards").innerHTML =
        '<div class="cc-caption">Loading Sales totals…</div>';
        if (!state.path.length) shell.querySelector(".cc-sales-trend").innerHTML = "";
    }

    var summaryArgs = {
      period: state.period,
      measure: state.measure,
      from_date: range.from,
      to_date: range.to,
      company: state.company,
      level: salesLevels()[0],
      record_page: 0
    };

    if (!cached) {
      frappe.call({
        method: "ceo_command_center_sales",
        args: summaryArgs,
        callback: function (response) {
          var ok = !response.exc && response.message && response.message.current;
          if (ok) salesCache.summary[summaryKey] = response.message;
          if (id !== requestId) return;

          if (!ok) {
            renderSalesSummaryError(shell);
            if (shareSummary) detailError('Sales data could not be loaded.');
            return;
          }

          renderSalesSummary(shell, response.message);

          if (shareSummary) {
            renderBreakdownDetail(shell, response.message);
            finishDetail();
          }
        },
        error: function () {
          if (id !== requestId) return;
          renderSalesSummaryError(shell);
          if (shareSummary) detailError('Sales data could not be loaded.');
        }
      });
    } else if (shareSummary) {
      renderBreakdownDetail(shell, cached);
      finishDetail();
      return;
    }

    if (shareSummary) return;

    if (view === "") {
      frappe.call({
        method: "ceo_command_center_sales",
        args: {
          period: state.period,
          measure: state.measure,
          from_date: range.from,
          to_date: range.to,
          company: state.company || salesPathKey("company"),
          level: salesLevels()[state.path.length],
          division: "",
          location: salesPathKey("location"),
          salesperson: salesPathKey("salesperson"),
          record_page: state.page
        },
        callback: function (response) {
          if (id !== requestId) return;

          if (response.exc || !response.message || !response.message.current) {
            detailError('Sales Breakdown could not be loaded.');
            return;
          }

          renderBreakdownDetail(shell, response.message);
          renderScopedTrend(shell, response.message);
          finishDetail();
        },
        error: function () {
          detailError('Sales Breakdown could not be loaded.');
        }
      });
      return;
    }

    if (view === "sales_order") {
      renderSalesOrderView(id, range, shell, detail, finishDetail, detailError);
      return;
    }

    // Sales trend follows the selected pending drill-down (company, division, location, salesperson).
    if (state.path.length) {
      loadScopedTrend(id, range, shell, {
        company: state.company || backlogPathKey("company"),
        division: backlogPathKey("division"),
        location: backlogPathKey("location"),
        salesperson: backlogPathKey("salesperson")
      });
    }

    var levels = backlogLevels();

    frappe.call({
      method: "ceo_command_center_sales_backlog",
      args: {
        kind: view,
        company: state.company || backlogPathKey("company"),
        division: backlogPathKey("division"),
        location: backlogPathKey("location"),
        salesperson: backlogPathKey("salesperson"),
        level: levels[state.path.length],
        from_date: range.from,
        to_date: range.to,
        record_page: state.page
      },
      callback: function (response) {
        if (id !== requestId) return;

        if (response.exc || !response.message || !response.message.summary) {
          detailError(esc(backlogTitles[view]) + ' could not be loaded.');
          return;
        }

        renderPendingDetail(shell, response.message);
        finishDetail();

        // Keep tab counts in step with the backlog just displayed.
        if (!state.path.length && !state.page) {
          if ((view === "orders" || view === "quotations") &&
              salesCache.counts && salesCache.countsKey === countsScope()) {
            salesCache.counts[view] = response.message;
            renderViewTabs();
          } else {
            loadViewCounts(true);
          }
        }
      },
      error: function () {
        detailError(esc(backlogTitles[view]) + ' could not be loaded.');
      }
    });
  }

  // Embedded department blocks (Manufacturing, Delivery & Forklift, Inventory).
  // Each department maps to one named block on this workspace
  // ([custom_block_name] wrapper + a marker inside that block's shadow root).
  // Discovery is limited to this CEO block's own workspace editor (never the
  // whole document), each host is claimed by exactly one CEO instance, and a
  // host is mounted only while its department is selected and this instance
  // is still on the page. Stale instances (from earlier workspace renders)
  // stop polling and never mount anything.
  var EMBEDS = {
    "Manufacturing": { block: "Manufacturing Dashboard", marker: ".mfd", label: "Manufacturing Dashboard" },
    "Delivery & Forklift": { block: "Delivery Forklift Dashboard", marker: "#dfd-dashboard", label: "Delivery & Forklift Dashboard" },
    "Inventory": { block: "CEO Inventory Dashboard", marker: "#ceo-inventory", label: "Inventory section" }
  };
  var ceoInstanceId = "ceo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  var embedHosts = {};
  var embedTries = 0;
  var embedGiveUp = false;
  var embedWasConnected = false;
  var invFresh = false;
  var mountedDepartment = "";
  function instanceAlive() {
    var self = root_element.host;
    var connected = !!(self && self.isConnected);
    if (connected) embedWasConnected = true;
    return connected;
  }
  function instanceRetired() { return embedWasConnected && !instanceAlive(); }
  function editorScope() {
    if (!instanceAlive()) return null;
    var self = root_element.host;
    return self.closest(".codex-editor") || self.closest(".layout-main-section") || null;
  }
  function blockHost(wrapper, marker) {
    var els = wrapper.getElementsByTagName("*");
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.shadowRoot && e.tagName.indexOf("CUSTOM-BLOCK") === 0 && e.shadowRoot.querySelector(marker)) return e;
    }
    return null;
  }
  function findEmbed(dep) {
    var cfg = EMBEDS[dep];
    if (!cfg) return null;
    var h = embedHosts[dep];
    if (h && h.__ceoOwner === ceoInstanceId) return h;
    var scope = editorScope();
    if (!scope) return null;
    var wrappers = scope.querySelectorAll("[custom_block_name]");
    var wrapper = null;
    for (var i = 0; i < wrappers.length; i++) {
      if (wrappers[i].getAttribute("custom_block_name") === cfg.block) { wrapper = wrappers[i]; break; }
    }
    if (!wrapper) return null;
    h = blockHost(wrapper, cfg.marker);
    if (!h || (h.__ceoOwner && h.__ceoOwner !== ceoInstanceId)) return null;
    h.__ceoOwner = ceoInstanceId;
    h.setAttribute("data-ceo-embed", dep);
    var w = wrapper.closest(".ce-block") || wrapper;
    w.style.display = "none";
    h.style.display = "block";
    embedHosts[dep] = h;
    return h;
  }
  function embedPlaceholder(dep, unavailable) {
    var cfg = EMBEDS[dep];
    content.innerHTML = '<div class="cc-panel"><div class="cc-empty"><strong>' + esc(dep) + '</strong><span>' +
      (unavailable ? 'The ' + esc(cfg.label) + ' is not available for your account.' : 'Loading the ' + esc(cfg.label) + '…') +
      '</span></div></div>';
  }
  function mountEmbed(dep, range) {
    if (instanceRetired() || state.department !== dep || !EMBEDS[dep]) return;
    content.style.minHeight = "";
    content.removeAttribute("aria-busy");
    badge.textContent = dep;
    var h = findEmbed(dep);
    if (!h || (dep === "Inventory" && !h.ceoInventory)) {
      mountedDepartment = "";
      embedPlaceholder(dep, embedGiveUp || !!h);
      return;
    }
    if (content.childNodes.length !== 1 || content.firstChild !== h) {
      content.innerHTML = "";
      content.appendChild(h);
    }
    mountedDepartment = dep;
    if (dep === "Inventory") {
      var r = range || dateRange();
      var fresh = invFresh;
      invFresh = false;
      h.ceoInventory.update({
        company: state.company,
        companyLabel: companyLabel(),
        from: r.from,
        to: r.to,
        period: state.period,
        fresh: fresh,
        user: frappe.session.user
      });
    }
  }
  function leaveEmbeds(nextDep) {
    if (mountedDepartment === "Inventory" && nextDep !== "Inventory") {
      var ih = embedHosts["Inventory"];
      if (ih && ih.__ceoOwner === ceoInstanceId && ih.ceoInventory && ih.ceoInventory.suspend) ih.ceoInventory.suspend();
    }
    if (mountedDepartment !== nextDep) mountedDepartment = "";
  }
  (function discoverEmbeds() {
    if (instanceRetired()) return;
    var pending = false;
    Object.keys(EMBEDS).forEach(function (dep) { if (!findEmbed(dep)) pending = true; });
    if (pending && ++embedTries < 40) {
      setTimeout(discoverEmbeds, 500);
    } else if (pending) {
      embedGiveUp = true;
    }
    if (EMBEDS[state.department] && mountedDepartment !== state.department) mountEmbed(state.department);
  })();
  // Each department tab keeps its own date range.
  var tabDates = {};
  function syncDateFields() {
    host.querySelector('[data-filter="period"]').value = state.period;
    host.querySelector('[data-filter="reference"]').value = state.reference;
    var shown = dateRange();
    host.querySelector('[data-filter="from"]').value = shown.from;
    host.querySelector('[data-filter="to"]').value = shown.to;
    updateDateFields();
  }
  // Finance phase 1: real receipts and current invoice balances only.
  // Collections tab: overview, collections, ageing, plans. Finance tab: payables, cash, profit.
  var FIN_DEPT_VIEWS = { 'Collections': ['overview','collections','ageing','plans','legal','taradhi'], 'Finance': ['payables','cash','profit'] };
  function isFinanceDept(){ return state.department === 'Collections' || state.department === 'Finance'; }
  function finViewAllowed(v){ return (FIN_DEPT_VIEWS[state.department] || []).indexOf(v) !== -1; }
  function finEnsureView(){ if(!finViewAllowed(financeState.view)){ financeState.view = FIN_DEPT_VIEWS[state.department][0]; financeState.path = []; financeState.page = 0; } }
  var financeState = {view:'overview', path:[], page:0, measure:'outstanding', receiptMeasure:'receipts', filterKey:''};
  var financeViews = [['overview','Overview'],['collections','Collections'],['ageing','Outstanding & Ageing'],['plans','Collection Plans'],['legal','Legal'],['taradhi','Taradhi'],['payables','Supplier Payables'],['cash','Cash & Treasury'],['profit','Financial Performance']];
  function financeNav() {
    return '<nav class="cc-fin-tabs" aria-label="' + esc(state.department) + ' views">' + financeViews.filter(function(v){return finViewAllowed(v[0]);}).map(function(v){return '<button type="button" class="cc-button'+(financeState.view===v[0]?' active':'')+'" aria-pressed="'+(financeState.view===v[0])+'" data-fin-view="'+v[0]+'">'+v[1]+'</button>';}).join('')+'</nav>';
  }
  function financeLevels(){
    var levels=financeState.view==='collections'?['company','location','salesperson','customer','records']:['company','division','location','salesperson','customer','records'];
    return state.company?levels.slice(1):levels;
  }
  function financeScope(){var a={};financeState.path.forEach(function(p){a[p.level]=p.key;});return a;}
  function financeCard(label,value,note){return '<div class="cc-kpi"><div class="cc-kpi-label">'+esc(label)+'</div><div class="cc-kpi-value">'+value+'</div><div class="cc-kpi-note">'+esc(note)+'</div></div>';}
  function financeBars(groups,clickable,currency){
    var max=Math.max.apply(null,groups.map(function(g){return Math.abs(number(g.amount));}).concat([1]));
    return groups.map(function(g,i){var tag=clickable?'button':'div';return '<'+tag+(clickable?' type="button" data-fin-group="'+i+'"':'')+' class="cc-bar"><span>'+esc(g.label)+'</span><span class="cc-track"><span class="cc-fill'+(number(g.amount)<0?' negative':'')+'" style="width:'+Math.abs(number(g.amount))/max*100+'%"></span></span><span class="cc-number">'+esc(money(g.amount,currency))+'<br><small>'+number(g.count).toLocaleString()+(number(g.count)===1?' document':' documents')+'</small></span></'+tag+'>';}).join('')||'<div class="cc-empty">No matching records.</div>';
  }
  function loadFinance(id,range){
    var key=[state.company,range.from,range.to].join('|');
    var keyChanged=key!==financeState.filterKey;
    if(keyChanged){financeState.path=[];financeState.page=0;financeState.filterKey=key;}
    var currentBody=content.querySelector('.cc-fin-body');
    // A new date range or company never keeps the previous cards or as-of labels on screen.
    if(!keyChanged&&currentBody&&content.querySelector('.cc-kpis')){
      content.querySelector('.cc-fin-tabs').outerHTML=financeNav();
      currentBody.innerHTML='<div class="cc-empty">Loading '+esc(state.department)+'…</div>';
    }else{
      content.innerHTML=header(range)+financeNav()+'<div class="cc-fin-body"><div class="cc-empty">Loading '+esc(state.department)+'…</div></div>';
    }
    badge.textContent='Loading '+state.department;
    var receipts=null,balances=null,detail=null,errors={},pending=2;
    var isCollection=financeState.view==='collections';
    var needsDetail=(isCollection||financeState.view==='ageing')&&(financeState.path.length>0||(isCollection?financeState.receiptMeasure!=='receipts':financeState.measure!=='outstanding'));
    if(needsDetail)pending++;
    function request(method,args,label,assign){var settled=false;function done(response){if(settled)return;settled=true;if(id!==requestId)return;if(response&&!response.exc&&response.message){assign(response.message);}else{errors[label]=true;}pending--;if(!pending)drawFinance(receipts,balances,detail,errors,range,id);}
      if(method==='ar_asof'){arCompute(args,function(m){done(m?{message:m}:null);});return;}
      frappe.call({method:method,args:args,callback:done,error:function(){done(null);}});
    }
    request('ceo_command_center_collections',{company:state.company,from_date:range.from,to_date:range.to,level:state.company?'location':'company'},'collections',function(d){receipts=d;});
    request('ar_asof',{company:state.company,level:state.company?'division':'company',as_of:range.to},'balances',function(d){balances=d;});
    if(needsDetail){var a=Object.assign({},financeScope());a.company=state.company||a.company||'';a.level=financeLevels()[financeState.path.length];a.record_page=financeState.page;
      if(isCollection){a.from_date=range.from;a.to_date=range.to;a.measure=financeState.receiptMeasure;}else a.measure=financeState.measure;
      if(!isCollection)a.as_of=range.to;
      request(isCollection?'ceo_command_center_collections':'ar_asof',a,'detail',function(d){detail=d;});
    }
  }
  // ---------------------------------------------------------------------------
  // Collections balances AS OF the selected End Date, from ERPNext's standard
  // Accounts Receivable report (Payment Ledger based; report_date = End Date).
  // Never uses today's Sales Invoice outstanding_amount. Report access and
  // Sales Invoice read permission are both required; otherwise "unavailable".
  var arStore = { key: "", data: null, waiting: null, error: "" };
  var AR_UN = "~unassigned~";
  var AR_ROUTE = { "Sales Invoice": "sales-invoice", "Payment Entry": "payment-entry", "Journal Entry": "journal-entry", "Sales Order": "sales-order" };
  var AR_BUCKETS = [["not_due", "Not due"], ["days_1_30", "1–30 days overdue"], ["days_31_60", "31–60 days overdue"], ["days_61_90", "61–90 days overdue"],
    ["days_91_120", "91–120 days overdue"], ["days_120_plus", "Over 120 days overdue"], ["unknown", "Missing due date"]];

  function arLoadAll(company, asOf, cb) {
    var comps = company ? [company] : Array.prototype.slice.call(companySelect.options).map(function (o) { return o.value; }).filter(Boolean);
    var key = comps.join(",") + "|" + asOf;
    if (arStore.key === key && arStore.data) { cb(arStore.data); return; }
    if (arStore.key === key && arStore.waiting) { arStore.waiting.push(cb); return; }
    arStore = { key: key, data: null, waiting: [cb], error: "" };
    var store = arStore;
    function finish(data) {
      if (arStore !== store) return;
      store.data = data;
      var w = store.waiting || [];
      store.waiting = null;
      if (data.error) { store.key = ""; store.error = data.error; }
      w.forEach(function (f) { f(data); });
    }
    var results = {}, left = comps.length, failed = [];
    if (!left) { finish({ error: "No permitted company is available." }); return; }
    comps.forEach(function (c) {
      frappe.call({
        method: "frappe.desk.query_report.run",
        args: { report_name: "Accounts Receivable", filters: JSON.stringify({ company: c, report_date: asOf, ageing_based_on: "Due Date", range1: 30, range2: 60, range3: 90, range4: 120 }), ignore_prepared_report: 1 },
        callback: function (r) { if (r.exc || !r.message || !Array.isArray(r.message.result)) failed.push(c); else results[c] = r.message.result; if (!--left) enrich(); },
        error: function () { failed.push(c); if (!--left) enrich(); }
      });
    });
    function enrich() {
      if (failed.length) {
        finish({ error: "The standard Accounts Receivable report could not be run as of " + asOf + " for " + failed.join(", ") + ". Historical balances are unavailable; current balances are not substituted." });
        return;
      }
      var rows = [], cur = {}, siNames = [];
      comps.forEach(function (c) {
        (results[c] || []).forEach(function (r) {
          if (!r || !r.voucher_type || !r.voucher_no) return;
          var amt = number(r.outstanding);
          if (Math.abs(amt) < 0.005) return;
          if (r.currency) cur[r.currency] = 1;
          var isSi = r.voucher_type === "Sales Invoice";
          rows.push({ vt: r.voucher_type, vn: r.voucher_no, company: c, party: r.party || "", party_name: r.customer_name || r.party || "",
            posting_date: r.posting_date ? String(r.posting_date) : "", due_date: r.due_date ? String(r.due_date) : "", amount: amt,
            cat: isSi ? (amt > 0 ? "inv_pos" : "inv_neg") : (amt < 0 ? "unalloc" : "other"), division: "", location: "", salesperson: "", terms: 0 });
          if (isSi) siNames.push(r.voucher_no);
        });
      });
      var curs = Object.keys(cur);
      if (curs.length > 1) { finish({ error: "Companies use different currencies (" + curs.join(", ") + "). Select one company." }); return; }
      var attrs = {}, terms = {}, chunks = [];
      for (var i = 0; i < siNames.length; i += 300) chunks.push(siNames.slice(i, i + 300));
      var pend = chunks.length * 2, bad = false;
      if (!pend) build();
      chunks.forEach(function (ch) {
        frappe.call({ method: "frappe.client.get_list", args: { doctype: "Sales Invoice", filters: [["name", "in", ch]],
          fields: ["name", "custom_division", "location", "sales_person", "customer_name"], limit_page_length: 0 },
          callback: function (r) { if (r.exc || !r.message) bad = true; else r.message.forEach(function (x) { attrs[x.name] = x; }); if (!--pend) build(); },
          error: function () { bad = true; if (!--pend) build(); } });
        frappe.call({ method: "frappe.client.get_list", args: { doctype: "Sales Invoice", filters: [["name", "in", ch]],
          fields: ["name", "`tabPayment Schedule`.due_date as psd"], limit_page_length: 0 },
          callback: function (r) { if (!r.exc && r.message) r.message.forEach(function (x) { if (x.psd) terms[x.name] = (terms[x.name] || 0) + 1; }); if (!--pend) build(); },
          error: function () { if (!--pend) build(); } });
      });
      function build() {
        if (bad) { finish({ error: "Sales Invoice details could not be read for the as-of balances. Historical balances are unavailable." }); return; }
        var out = [], hidden = 0, hiddenAmt = 0;
        rows.forEach(function (r) {
          if (r.vt === "Sales Invoice") {
            var a = attrs[r.vn];
            if (!a) { hidden++; hiddenAmt += r.amount; return; }
            r.division = a.custom_division || ""; r.location = a.location || ""; r.salesperson = a.sales_person || "";
            r.party_name = a.customer_name || r.party_name; r.terms = terms[r.vn] || 0;
          }
          out.push(r);
        });
        finish({ rows: out, currency: curs[0] || "", as_of: asOf, hidden: hidden, hidden_amount: hiddenAmt, companies: comps });
      }
    }
  }

  function arBuild(data, args) {
    var asOf = data.as_of, measure = args.measure || "outstanding", level = args.level, page = Number(args.record_page || 0);
    var rows = data.rows.filter(function (r) {
      if (args.company && r.company !== args.company) return false;
      var ks = ["division", "location", "salesperson", "customer"];
      for (var i = 0; i < ks.length; i++) {
        var v = args[ks[i]];
        if (!v) continue;
        var rv = (ks[i] === "customer" ? r.party : r[ks[i]]) || "";
        if (v === AR_UN ? rv !== "" : rv !== v) return false;
      }
      return true;
    });
    var s = { outstanding_amount: 0, outstanding_count: 0, overdue_amount: 0, overdue_count: 0, credits_amount: 0, credits_count: 0,
      unallocated_amount: 0, unallocated_count: 0, other_debit_amount: 0, other_debit_count: 0, net_amount: 0,
      missing_due_count: 0, missing_due_amount: 0, split_terms_count: 0, split_terms_amount: 0,
      hidden_count: data.hidden, hidden_amount: data.hidden_amount };
    var buckets = {};
    AR_BUCKETS.forEach(function (b) { buckets[b[0]] = { key: b[0], label: b[1], amount: 0, count: 0 }; });
    var selected = [];
    rows.forEach(function (r) {
      var days = r.due_date ? frappe.datetime.get_day_diff(asOf, r.due_date) : null;
      s.net_amount += r.amount;
      if (r.cat === "inv_pos") {
        s.outstanding_amount += r.amount; s.outstanding_count++;
        if (r.terms > 1) { s.split_terms_count++; s.split_terms_amount += r.amount; }
        var b = "not_due";
        if (days === null) { b = "unknown"; s.missing_due_count++; s.missing_due_amount += r.amount; }
        else if (days > 0) {
          s.overdue_amount += r.amount; s.overdue_count++;
          b = days <= 30 ? "days_1_30" : days <= 60 ? "days_31_60" : days <= 90 ? "days_61_90" : days <= 120 ? "days_91_120" : "days_120_plus";
        }
        buckets[b].amount += r.amount; buckets[b].count++;
      } else if (r.cat === "inv_neg") { s.credits_amount += r.amount; s.credits_count++; }
      else if (r.cat === "unalloc") { s.unallocated_amount += r.amount; s.unallocated_count++; }
      else { s.other_debit_amount += r.amount; s.other_debit_count++; }
      var inc = (measure === "outstanding" && r.cat === "inv_pos") || (measure === "overdue" && r.cat === "inv_pos" && days !== null && days > 0) ||
        (measure === "credits" && r.cat === "inv_neg") || (measure === "unallocated" && r.cat === "unalloc") || (measure === "other" && r.cat === "other");
      if (inc) selected.push({ name: r.vn, doctype: r.vt, route: AR_ROUTE[r.vt] || "", date: r.posting_date, due_date: r.due_date, company: r.company,
        division: r.division, location: r.location, salesperson: r.salesperson, customer: r.party, customer_name: r.party_name, amount: r.amount,
        days_overdue: days === null ? null : Math.max(0, days), split_terms: r.terms > 1 ? 1 : 0 });
    });
    selected.sort(function (a, b) { return (a.due_date || "9999") < (b.due_date || "9999") ? -1 : (a.due_date || "9999") > (b.due_date || "9999") ? 1 : (a.name < b.name ? -1 : 1); });
    var total = 0, grouped = {}, glist = [];
    selected.forEach(function (r) {
      total += r.amount;
      if (level !== "records") {
        var v = r[level] || AR_UN;
        if (!grouped[v]) { grouped[v] = { key: v, label: v === AR_UN ? "Unassigned" : (level === "customer" ? (r.customer_name || v) : v), amount: 0, count: 0 }; glist.push(grouped[v]); }
        grouped[v].amount += r.amount; grouped[v].count++;
      }
    });
    return { as_of: asOf, currency: data.currency, measure: measure, level: level, summary: s, selected: { count: selected.length, amount: total },
      groups: glist, ageing: AR_BUCKETS.map(function (b) { return buckets[b[0]]; }),
      records: level === "records" ? selected.slice(page * 50, (page + 1) * 50) : [], record_page: page, record_page_size: 50,
      basis: "Standard Accounts Receivable report as of " + asOf + " (ledger entries posted up to that date). Overdue = due date strictly before " + asOf + ".",
      permission_scope: "Records accessible to the requesting user" };
  }

  function arCompute(args, cb) {
    if (!args.as_of) { cb(null); return; }
    arLoadAll(state.company || "", args.as_of, function (data) {
      if (!data || data.error) { cb(null); return; }
      cb(arBuild(data, args));
    });
  }

  function arReconNote(b) {
    if (!b || !b.summary) return '';
    var s = b.summary, cur = b.currency;
    return '<div class="cc-note cc-ar-recon"><strong>Receivables as of ' + esc(b.as_of) + '</strong> (standard Accounts Receivable report): ' +
      'gross invoice outstanding ' + esc(money(s.outstanding_amount, cur)) + ' · invoice credits ' + esc(money(s.credits_amount, cur)) +
      ' · unallocated payments / credits ' + esc(money(s.unallocated_amount, cur)) + ' (' + number(s.unallocated_count) + ')' +
      ' · other ledger debits ' + esc(money(s.other_debit_amount, cur)) + ' (' + number(s.other_debit_count) + ')' +
      ' = <strong>net receivables ' + esc(money(s.net_amount, cur)) + '</strong>. Gross outstanding counts positive invoice balances only; credits, unallocated payments and other ledger items are kept separate. ' +
      'Invoices posted after the End Date and payments or adjustments posted after it are excluded; the Start Date does not limit older unpaid invoices. ' +
      (s.split_terms_count ? number(s.split_terms_count) + ' outstanding invoice(s) (' + esc(money(s.split_terms_amount, cur)) + ') have split payment terms; overdue status uses the invoice due date, so an earlier instalment may already be overdue. ' : '') +
      (s.hidden_count ? number(s.hidden_count) + ' invoice balance(s) are excluded because your permissions do not allow reading them. ' : '') + '</div>';
  }

function drawFinanceBase(receipts,balances,detail,errors,range,id){
    if(id!==requestId)return;
    // As-of balances must belong to this request's End Date; otherwise show them as unavailable.
    if(balances&&balances.as_of!==range.to){balances=null;errors.balances=true;}
    if(financeState.view==='ageing'&&detail&&detail.as_of!==undefined&&detail.as_of!==range.to){detail=null;errors.detail=true;}
    var currency=(receipts&&receipts.currency)||(balances&&balances.currency)||'';
    var rs=receipts?receipts.summary:null, bs=balances?balances.summary:null;
    var cards='<div class="cc-kpis">'+financeCard('Customer collections',rs?esc(money(rs.receipts_amount,receipts.currency)):'Unavailable',rs?rs.receipts_count+' submitted customer receipts · Selected period':'Payment Entry access or API error')+
      financeCard('Invoice outstanding · As of '+(bs?balances.as_of:range.to),bs?esc(money(bs.outstanding_amount,balances.currency)):'Unavailable',bs?'Positive invoice balances · all invoice dates up to '+balances.as_of:(arStore.error||'Accounts Receivable report unavailable'))+
      financeCard('Overdue invoice balance · As of '+(bs?balances.as_of:range.to),bs?esc(money(bs.overdue_amount,balances.currency)):'Unavailable',bs?'Part of outstanding · due date before '+balances.as_of:'Historical balance unavailable')+
      financeCard('Invoice credits · As of '+(bs?balances.as_of:range.to),bs?esc(money(bs.credits_amount,balances.currency)):'Unavailable',bs?'Negative invoice balances · unallocated payments / credits '+money(bs.unallocated_amount,balances.currency)+' shown separately':'Historical balance unavailable')+'</div>';
    if(bs&&(financeState.view==='overview'||financeState.view==='ageing'))cards+=arReconNote(balances);
    var body='',groups=[],view=financeState.view;
    if(view==='overview'){
      body='<div class="cc-grid"><section class="cc-panel"><h3>Collections by '+(state.company?'Location':'Company')+'</h3><div class="cc-caption">Selected receipt period</div>'+(receipts?financeBars(receipts.groups,false,receipts.currency):'<div class="cc-error">Collections unavailable. Check Payment Entry access and API error.</div>')+'</section><section class="cc-panel"><h3>Invoice balances by ageing</h3><div class="cc-caption">Balances as of '+esc(balances?balances.as_of:range.to)+'</div>'+(balances?financeBars(balances.ageing,false,balances.currency):'<div class="cc-error">'+esc(arStore.error||'Historical invoice balances are unavailable. Check Accounts Receivable report and Sales Invoice access.')+' Current balances are not substituted.</div>')+'</section></div>';
    }else if(view==='collections'||view==='ageing'){
      var selected=errors.detail?null:(detail||(view==='collections'?receipts:balances));
      var levels=financeLevels(),level=levels[financeState.path.length];
      var controls=view==='collections'?[['receipts','Customer receipts'],['refunds','Customer refunds']]:[['outstanding','Outstanding'],['overdue','Overdue only'],['credits','Invoice credits'],['unallocated','Unallocated payments / credits'],['other','Other ledger debits']];
      body='<section class="cc-panel"><div class="cc-section-heading"><div><h3>'+(view==='collections'?'Collections':'Outstanding & Ageing')+'</h3><div class="cc-caption">'+(view==='collections'?'Selected receipt period · Posting date':'Accounts Receivable report balances · All invoice dates · As of '+esc(balances?balances.as_of:range.to))+'</div></div><div class="cc-measures">'+controls.map(function(c){return '<button type="button" class="cc-button'+((view==='collections'?financeState.receiptMeasure:financeState.measure)===c[0]?' active':'')+'" data-fin-measure="'+c[0]+'">'+c[1]+'</button>';}).join('')+'</div></div>';
      body+='<div class="cc-breadcrumbs"><button type="button" class="cc-button" data-fin-depth="0">'+(state.company?'Selected company':'All Companies')+'</button>'+financeState.path.map(function(p,i){return '<span>›</span><button type="button" class="cc-button" data-fin-depth="'+(i+1)+'">'+esc(p.label)+'</button>';}).join('')+'</div>';
      if(!selected)body+='<div class="cc-error">This view could not be loaded. No missing data is displayed as zero. Check ERP permissions and the API error.</div>';
      else {
        body+='<div class="cc-caption">In scope: '+number(selected.selected.count).toLocaleString()+' documents · '+esc(money(selected.selected.amount,selected.currency))+'</div>';
        if(level!=='records'){
          groups=(selected.groups||[]).slice().sort(function(a,b){return Math.abs(number(b.amount))-Math.abs(number(a.amount));});
          body+='<h3 style="margin-top:16px">'+esc(level.charAt(0).toUpperCase()+level.slice(1))+' breakdown</h3>'+financeBars(groups,true,selected.currency);
        } else {
          var rows=selected.records||[],count=number(selected.selected.count),start=financeState.page*50;
          body+='<div class="cc-records"><table class="cc-table"><thead><tr><th>Document</th><th>Date</th><th>Customer</th><th>'+(view==='collections'?'Currently unallocated':'Due date / days overdue')+'</th><th class="cc-number">Amount</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td><a target="_blank" rel="noopener noreferrer" href="/app/'+(view==='collections'?'payment-entry':(r.route||'sales-invoice'))+'/'+encodeURIComponent(r.name)+'">'+esc(r.name)+'</a></td><td>'+esc(r.date)+'</td><td>'+esc(r.customer_name||r.customer)+'</td><td>'+(view==='collections'?(financeState.receiptMeasure==='receipts'?esc(money(r.unallocated_amount,selected.currency)):'—'):esc(r.due_date||'Missing due date')+' / '+(r.days_overdue===null?'Unknown':number(r.days_overdue)))+'</td><td class="cc-number">'+esc(money(r.amount,selected.currency))+'</td></tr>';}).join('')+'</tbody><tfoot><tr><th colspan="4">All matching records</th><th class="cc-number">'+esc(money(selected.selected.amount,selected.currency))+'</th></tr></tfoot></table></div><div class="cc-pager"><button type="button" class="cc-button" data-fin-page="previous" '+(!start?'disabled':'')+'>Previous</button><span>'+(count?start+1:0)+'–'+Math.min(start+50,count)+' of '+count+'</span><button type="button" class="cc-button" data-fin-page="next" '+(start+50>=count?'disabled':'')+'>Next</button></div>';
        }
        if(view==='collections'&&selected.summary)body+='<div class="cc-note">Currently unallocated from receipts in this scope: '+esc(money(selected.summary.unallocated_amount,selected.currency))+'. This is the current allocation position, not the position when received. Customer refunds: '+esc(money(selected.summary.refunds_amount,selected.currency))+'. Journal Entries excluded.</div>';
      }
      body+='</section>';
    }else{
      var next={legal:['Legal','/app/journal-entry/JV-DM-2026-39728','Open Reference Journal Entry','Loading the static reference…'],taradhi:['Taradhi','/app/journal-entry/JV-DM-2026-39728','Open Reference Journal Entry','Loading the static reference…'],plans:['Collection Plans','/app/sales-person-weekly-collection---invoice-wise','Open invoice-wise weekly collection plans','Plan fields and receipt matching need validation before achievement metrics can be displayed.'],payables:['Supplier Payables','/app/query-report/Accounts Payable','Open Accounts Payable','Supplier balances and ageing are not connected to this dashboard yet.'],cash:['Cash & Treasury','/app/treasury-dashboard','Open existing Treasury Dashboard','The existing Treasury view contains bank balances, supplier dues and forecasts. Its totals need reconciliation before they are embedded here.'],profit:['Financial Performance','/app/query-report/Profit and Loss Statement','Open Profit and Loss Statement','Ledger-based revenue, expenses and profit will be connected after report reconciliation.']}[view];
      body='<section class="cc-panel"><h3>'+next[0]+'</h3><div class="cc-note">Next phase · '+next[3]+'</div><p><a target="_blank" rel="noopener noreferrer" href="'+next[1]+'">'+next[2]+' →</a></p></section>';
    }
    var trend='';if(receipts&&!errors.detail){var trendData=detail&&view==='collections'?detail:receipts;trend='<section class="cc-panel cc-records"><h3>'+(view==='collections'&&financeState.receiptMeasure==='refunds'?'Customer refund trend':'Collection trend')+'</h3><div class="cc-caption">'+esc(range.from)+' to '+esc(range.to)+' · '+esc(view==='collections'&&financeState.path.length?'Selected drill-down scope':companyLabel())+' · '+esc(trendData.currency||'No currency in empty scope')+'</div>'+trendMarkup({current:{trend:trendData.trend,from_date:range.from,to_date:range.to}},trendData.currency).replace('aria-label="Sales trend in company currency"','aria-label="Customer receipt or refund trend in company currency"')+'</section>';}
    content.innerHTML=header(range)+cards+financeNav()+'<div class="cc-fin-body">'+body+'</div>'+trend+'<div class="cc-note">Invoice balances as of '+esc(bs?balances.as_of:range.to)+' come from the standard Accounts Receivable report (ledger entries posted up to that date); unallocated payments, credits and other ledger items are shown separately. The Start Date does not limit these balances; Customer collections cover the selected Start–End period. Missing due dates are separate. Overdue is part of outstanding. Each section respects ERP record permissions. '+(bs?'Missing due date: '+bs.missing_due_count+' invoices · '+esc(money(bs.missing_due_amount,balances.currency))+'.':'')+'</div>';
    content.style.minHeight='';content.removeAttribute('aria-busy');badge.textContent=Object.keys(errors).length?'Collections partially unavailable · Check errors':'Collections & invoice balances connected';
    content.querySelectorAll('[data-fin-group]').forEach(function(b){b.onclick=function(){var g=groups[Number(b.dataset.finGroup)];financeState.path.push({level:financeLevels()[financeState.path.length],key:g.key,label:g.label});financeState.page=0;render();};});
  }
  host.addEventListener('click',function(event){var b=event.target.closest('button');if(!b||!host.contains(b)||b.disabled)return;
    if(b.hasAttribute('data-fin-view')){financeState.view=b.dataset.finView;financeState.path=[];financeState.page=0;render();}
    else if(b.hasAttribute('data-fin-depth')){financeState.path=financeState.path.slice(0,Number(b.dataset.finDepth));financeState.page=0;render();}
    else if(b.hasAttribute('data-fin-measure')){if(financeState.view==='collections')financeState.receiptMeasure=b.dataset.finMeasure;else financeState.measure=b.dataset.finMeasure;financeState.path=[];financeState.page=0;render();}
    else if(b.hasAttribute('data-fin-page')){financeState.page=Math.max(0,financeState.page+(b.dataset.finPage==='next'?1:-1));render();}
  });

  // ---------------------------------------------------------------------------
  // Sales Order tab: submitted Sales Orders by transaction date, salesperson
  // allocation (Sales Team contribution %), brand performance and targets from
  // CEO Sales Target. Data: ceo_command_center_sales_orders (server-side
  // permissions; no figures are computed or invented in the browser).
  state.soSalesperson = "";
  state.soBrand = "";
  state.soLocation = "";
  state.path = [];
  state.page = 0;
  state.soPage = 0;
  var soScopeKey = "";

  function soMoney(value, currency) {
    return value === null || value === undefined ? "—" : money(value, currency);
  }

  function soPct(value) {
    return value === null || value === undefined ? "—" : number(value).toFixed(1) + "%";
  }

  function soTargetCells(row, currency) {
    if (row.target_state === "partial") {
      return '<td class="cc-number" title="' + esc('Missing: ' + row.coverage.missing.join('; ')) + '">' +
        '<span class="cc-badge warn">Partial target coverage</span><br><small>' +
        esc(money(row.target, currency)) + ' set · ' + row.coverage.missing_count + ' missing</small></td>' +
        '<td class="cc-number"><span class="cc-badge">Not comparable</span></td>' +
        '<td class="cc-number">—</td><td class="cc-number">—</td>';
    }
    if (row.target_state === "not_applicable") {
      return '<td><span class="cc-badge">No target (unassigned brand)</span></td>' +
        '<td class="cc-number">—</td><td class="cc-number">—</td><td class="cc-number">—</td>';
    }
    if (row.target_state === "not_set") {
      return '<td><span class="cc-badge">Target not set</span></td>' +
        '<td class="cc-number">—</td><td class="cc-number">—</td><td class="cc-number">—</td>';
    }
    if (row.target_state === "zero") {
      return '<td class="cc-number">' + money(0, currency) + '</td>' +
        '<td class="cc-number"><span class="cc-badge">Target is zero</span></td>' +
        '<td class="cc-number">' + money(0, currency) + '</td>' +
        '<td class="cc-number">' + money(row.excess, currency) + '</td>';
    }
    return '<td class="cc-number">' + money(row.target, currency) + '</td>' +
      '<td class="cc-number">' + soPct(row.achievement) + '</td>' +
      '<td class="cc-number">' + money(row.remaining, currency) + '</td>' +
      '<td class="cc-number">' + money(row.excess, currency) + '</td>';
  }

  function soCards(data) {
    var cur = data.currency;
    var s = data.summary;
    var t = data.target;
    var partial = data.targets_info.partial_months.length > 0;
    var basis = t.target_basis === "brand"
      ? "Sum of " + (data.sales_person ? data.sales_person + "'s " : "") +
        "brand targets for " + data.brand
      : (data.sales_person ? data.sales_person + "'s overall target" :
        "Sum of overall salesperson targets");

    var targetValue = "Target not set";
    var targetNote = "No CEO Sales Target records for this view";
    var achValue = "—";
    var achNote = "Requires a target";
    var balValue = "—";
    var balNote = "Requires a target";

    if (t.target_state === "set") {
      targetValue = money(t.target, cur);
      targetNote = basis + (partial ? " · full-month, not prorated" : "");
      achValue = soPct(t.achievement);
      achNote = "Net order value ÷ target";
      if (t.excess > 0) {
        balValue = "+" + money(t.excess, cur);
        balNote = "Above target (excess achievement)";
      } else {
        balValue = money(t.remaining, cur);
        balNote = "Remaining to reach target";
      }
    } else if (t.target_state === "zero") {
      targetValue = money(0, cur);
      targetNote = basis + " · target is zero";
      achNote = "Not calculated for a zero target";
      balValue = "+" + money(t.excess, cur);
      balNote = "Excess achievement";
    }

    if (t.target_state === "partial") {
      var cov = t.coverage;
      var sub = t.comparable_subset;
      targetValue = "Partial target coverage";
      targetNote = money(t.target, cur) + " set for " + cov.present + " of " + cov.expected +
        " salesperson-months" + (cov.missing_count ? " · " + cov.missing_count + " missing" : "") +
        (cov.uncovered_value >= 0.005 ? " · " + money(cov.uncovered_value, cur) +
          " unallocated value has no target" : "");
      achValue = "Not comparable";
      achNote = sub && sub.achievement !== null
        ? "Salespersons with complete targets only: " + soPct(sub.achievement) +
          " (" + sub.salespersons + " of " + sub.of + ")"
        : "Targets are incomplete for this view";
      balValue = "—";
      balNote = "Not shown while targets are incomplete";
    } else if (t.target_state === "not_applicable") {
      targetValue = "Not applicable";
      targetNote = "Unassigned Brand has no target";
    }

    var cards = [
      { label: "Net Order Value", value: money(s.value, cur),
        note: (data.sales_person || data.restricted ? "Allocated share · " : "") +
          "Closed included: " + s.closed.count + " · " + money(s.closed.value, cur) },
      { label: "Sales Order Count", value: number(s.count).toLocaleString("en-US"),
        note: "On Hold: " + s.on_hold.count + " · Amended: " + s.amended },
      { label: "Target", value: targetValue, note: targetNote },
      { label: "Achievement %", value: achValue, note: achNote },
      { label: "Target Balance", value: balValue, note: balNote }
    ];

    return '<div class="cc-kpis cc-so-kpis">' + cards.map(function (card) {
      return '<div class="cc-kpi"><div class="cc-kpi-label">' + esc(card.label) + '</div>' +
        '<div class="cc-kpi-value">' + esc(card.value) + '</div>' +
        '<div class="cc-kpi-note">' + esc(card.note) + '</div></div>';
    }).join("") + '</div>';
  }

  function soFilters(data) {
    var canManage = (frappe.boot.user.can_write || []).indexOf("CEO Sales Target") !== -1;
    var spOptions = data.options.sales_persons.map(function (name) {
      return '<option value="' + esc(name) + '"' + (name === data.sales_person ? ' selected' : '') +
        '>' + esc(name) + '</option>';
    }).join("");
    var brands = data.options.brands.slice();
    brands.push("Unassigned Brand");
    var brandOptions = brands.map(function (name) {
      return '<option value="' + esc(name) + '"' + (name === data.brand ? ' selected' : '') +
        '>' + esc(name) + '</option>';
    }).join("");

    return '<div class="cc-so-filters">' +
      '<label>Salesperson location<select data-so="sp_location"><option value="">All locations</option>' +
      ((data.options && data.options.sp_locations) || []).map(function (name) {
        return '<option value="' + esc(name) + '"' + (name === data.sp_location ? ' selected' : '') + '>' + esc(name) + '</option>';
      }).join("") + '</select></label>' +
      '<label>Salesperson<select data-so="sales_person"><option value="">' +
      (data.restricted ? 'All my salespersons' : 'All salespersons') + '</option>' +
      spOptions + '</select></label>' +
      '<label>Brand<select data-so="brand"><option value="">All brands</option>' +
      brandOptions + '</select></label>' +
      (data.sales_person || data.brand || data.sp_location
        ? '<button type="button" class="cc-button" data-so-clear="1">Clear filters</button>'
        : '') +
      (canManage
        ? '<a class="cc-button" href="/app/ceo-sales-target" target="_blank" rel="noopener">Manage targets</a>'
        : '') +
      '</div>';
  }

  function soSalespersonSection(data) {
    var cur = data.currency;
    var brandView = !!data.brand;
    var rows = data.sales_persons;
    var un = data.unallocated;
    var inv = data.invalid_allocation;
    var rec = data.reconciliation;

    var head = '<tr><th>Salesperson</th><th class="cc-number">Orders</th>' +
      '<th class="cc-number">Achieved Sales Order Value</th><th class="cc-number">Period Target</th>' +
      '<th class="cc-number">Achievement %</th><th class="cc-number">Remaining Target</th>' +
      '<th class="cc-number">Excess Achievement</th>' +
      (brandView ? '' : '<th class="cc-number">Sum of brand targets</th>' +
        '<th class="cc-number">Overall − brand targets</th>') + '</tr>';

    var body = rows.map(function (row) {
      return '<tr><td><button type="button" class="cc-button" data-so-sp="' + esc(row.sales_person) +
        '">' + esc(row.sales_person) + '</button></td>' +
        '<td class="cc-number">' + row.orders + '</td>' +
        '<td class="cc-number">' + money(row.achieved, cur) + '</td>' +
        soTargetCells(row, cur) +
        (brandView ? '' :
          '<td class="cc-number">' + soMoney(row.brand_target_sum, cur) + '</td>' +
          '<td class="cc-number">' + (row.overall_vs_brand_difference === null
            ? '—'
            : '<span class="cc-badge' + (Math.abs(row.overall_vs_brand_difference) >= 0.01 ? ' warn' : '') +
              '">' + esc(money(row.overall_vs_brand_difference, cur)) + '</span>') + '</td>') +
        '</tr>';
    }).join("");

    var extraCols = brandView ? 4 : 6;

    if (un.value || un.orders || un.partial_orders) {
      body += '<tr><td><span class="cc-badge warn">Unallocated</span></td>' +
        '<td class="cc-number">' + (un.orders + un.partial_orders) + '</td>' +
        '<td class="cc-number">' + money(un.value, cur) + '</td>' +
        '<td colspan="' + extraCols + '" class="cc-caption">No Sales Team allocation (' + un.orders +
        ' orders) or allocation below 100% (' + un.partial_orders + ' orders). Not credited to anyone.</td></tr>';
    }
    if (inv.value || inv.orders) {
      body += '<tr><td><span class="cc-badge warn">Invalid allocation</span></td>' +
        '<td class="cc-number">' + inv.orders + '</td>' +
        '<td class="cc-number">' + money(inv.value, cur) + '</td>' +
        '<td colspan="' + extraCols + '" class="cc-caption">Contribution above 100% or a row without a ' +
        'salesperson; excluded from salesperson totals. Examples: ' + esc(inv.examples.join(", ")) +
        '</td></tr>';
    }

    var allocatedPlus = rec.salesperson_allocated + rec.unallocated + rec.invalid_allocation;
    var balanced = Math.abs(allocatedPlus - rec.orders_total) < 0.01;

    return '<section class="cc-panel cc-records"><h3>Salesperson-wise order performance</h3>' +
      '<div class="cc-caption">Order value is split by the saved Sales Team contribution %; an order ' +
      'is never counted in full for each salesperson. ' +
      (brandView ? 'Targets shown are each salesperson\'s brand target for ' + esc(data.brand) + '. '
        : 'Targets shown are overall salesperson targets; brand targets are a breakdown of the same goal and are not added. ') +
      'Click a name to filter.</div>' +
      (rows.length || un.value || inv.value
        ? '<div class="cc-records"><table class="cc-table"><thead>' + head + '</thead><tbody>' + body +
          '</tbody></table></div>'
        : '<div class="cc-empty">No submitted Sales Orders for this selection.</div>') +
      '<div class="cc-caption" style="margin-top:8px">Reconciliation: allocated ' +
      esc(money(rec.salesperson_allocated, cur)) + ' + unallocated ' + esc(money(rec.unallocated, cur)) +
      ' + invalid ' + esc(money(rec.invalid_allocation, cur)) + ' = ' + esc(money(allocatedPlus, cur)) +
      ' · Net Order Value ' + esc(money(rec.orders_total, cur)) +
      (balanced ? ' · Reconciled' : ' · <strong>Difference</strong>') + '</div>' +
      '</section>';
  }

  function soBrandSection(data) {
    var cur = data.currency;
    var rows = data.brands;
    var rec = data.reconciliation;

    var chartRows = rows.slice().sort(function (a, b) {
      return Math.max(number(b.achieved), number(b.target)) - Math.max(number(a.achieved), number(a.target));
    }).slice(0, 15);
    var maximum = Math.max.apply(null, chartRows.map(function (row) {
      return Math.max(Math.abs(number(row.achieved)), number(row.target));
    }).concat([1]));

    var chart = chartRows.map(function (row) {
      var hasTarget = row.target_state === "set" || row.target_state === "zero";
      return '<div class="cc-tvb"><span>' + esc(row.brand) + '</span>' +
        '<span class="cc-tvb-bars" aria-hidden="true">' +
        '<span class="cc-track"><span class="cc-fill' + (row.achieved < 0 ? ' negative' : '') +
        '" style="width:' + (Math.abs(number(row.achieved)) / maximum * 100) + '%"></span></span>' +
        (hasTarget
          ? '<span class="cc-track"><span class="cc-tvb-target" style="width:' +
            (number(row.target) / maximum * 100) + '%"></span></span>'
          : '') +
        '</span><span class="cc-number">' + esc(money(row.achieved, cur)) + '<br><small>' +
        (hasTarget ? 'Target ' + esc(money(row.target, cur)) + (row.achievement !== null ? ' · ' +
          soPct(row.achievement) : '') : row.target_state === 'partial' ? 'Partial target coverage · ' +
          esc(money(row.target, cur)) + ' set' : row.target_state === 'not_applicable' ? 'No target' :
          'Target not set') + '</small></span></div>';
    }).join("");

    var body = rows.map(function (row) {
      return '<tr><td><button type="button" class="cc-button" data-so-brand="' + esc(row.brand) + '">' +
        esc(row.brand) + '</button></td>' +
        '<td class="cc-number">' + row.orders + '</td>' +
        '<td class="cc-number">' + money(row.achieved, cur) + '</td>' +
        soTargetCells(row, cur) + '</tr>';
    }).join("");

    var fb = data.brand_source;
    var balanced = Math.abs(rec.brand_total - rec.orders_total) < 0.01;

    return '<section class="cc-panel cc-records"><h3>Brand-wise order performance</h3>' +
      '<div class="cc-caption">Brand achievement uses Sales Order item net values (before tax). ' +
      'Brand is taken from the order item as saved; item rows without a brand use the Item\'s ' +
      'current brand' + (fb.fallback_value !== null && fb.fallback_value
        ? ' (' + esc(money(fb.fallback_value, cur)) + ' in this view)' : '') +
      '; anything else is shown as Unassigned Brand. ' +
      (data.sales_person ? 'Values are ' + esc(data.sales_person) + '\'s allocated share. ' : '') +
      'Targets are brand targets (CEO Sales Target, type Brand).</div>' +
      (rows.length
        ? '<div class="cc-legend"><span><i style="background:var(--cc-blue)"></i>Achieved</span>' +
          '<span><i style="background:#b9c4cc"></i>Target</span><span>Top ' + chartRows.length +
          ' brands by value</span></div>' + chart +
          '<div class="cc-records"><table class="cc-table"><thead><tr><th>Brand</th>' +
          '<th class="cc-number">Orders</th><th class="cc-number">Achieved Sales Order Value</th>' +
          '<th class="cc-number">Period Target</th><th class="cc-number">Achievement %</th>' +
          '<th class="cc-number">Remaining Target</th><th class="cc-number">Excess Achievement</th>' +
          '</tr></thead><tbody>' + body + '</tbody><tfoot><tr><th>Total</th><th></th>' +
          '<th class="cc-number">' + money(rec.brand_total, cur) + '</th><th colspan="4" class="cc-caption">' +
          (balanced ? 'Reconciles with Net Order Value' : 'Differs from Net Order Value ' +
            esc(money(rec.orders_total, cur))) + '</th></tr></tfoot></table></div>'
        : '<div class="cc-empty">No brand values for this selection.</div>') +
      '</section>';
  }

  function soOrdersSection(data) {
    var cur = data.currency;
    var list = data.orders;
    var filtered = !!(data.sales_person || data.brand || data.restricted);
    var pages = Math.max(1, Math.ceil(list.total / list.page_size));
    var first = list.total ? list.page * list.page_size + 1 : 0;
    var last = list.page * list.page_size + list.rows.length;

    var body = list.rows.map(function (row) {
      var team = row.alloc === "missing"
        ? '<span class="cc-badge warn">Not allocated</span>'
        : row.alloc === "invalid"
          ? '<span class="cc-badge warn">Invalid allocation</span>'
          : esc(row.team.map(function (member) {
              return member.sales_person + (Math.abs(member.pct - 100) < 0.001 ? '' :
                ' (' + number(member.pct).toFixed(1) + '%)');
            }).join(", "));
      return '<tr><td><a href="/app/sales-order/' + encodeURIComponent(row.name) +
        '" target="_blank" rel="noopener">' + esc(row.name) + '</a></td>' +
        '<td>' + esc(row.date) + '</td><td>' + esc(row.customer) + '</td><td>' + team + '</td>' +
        '<td>' + esc(row.status) + '</td>' +
        '<td class="cc-number">' + (row.value === null ? '—' : money(row.value, cur)) + '</td>' +
        (filtered ? '<td class="cc-number">' + money(row.view_value, cur) + '</td>' : '') +
        '<td>' + esc(row.delivery_date || '—') + '</td></tr>';
    }).join("");

    return '<section class="cc-panel cc-records"><h3>Sales Orders</h3>' +
      '<div class="cc-caption">Showing ' + first + '–' + last + ' of ' + list.total +
      ' · newest first' + (filtered ? ' · "Value in view" is the share counted for the selected ' +
      'salesperson/brand' : '') + '</div>' +
      (list.total
        ? '<div class="cc-records"><table class="cc-table"><thead><tr><th>Order Number</th>' +
          '<th>Date</th><th>Customer</th><th>Salesperson</th><th>Status</th>' +
          '<th class="cc-number">Net Order Value</th>' +
          (filtered ? '<th class="cc-number">Value in view</th>' : '') +
          '<th>Delivery Date</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
          '<div class="cc-pager"><button type="button" class="cc-button" data-so-page="-1"' +
          (list.page === 0 ? ' disabled' : '') + '>Previous</button><span>Page ' + (list.page + 1) +
          ' of ' + pages + '</span><button type="button" class="cc-button" data-so-page="1"' +
          (list.page + 1 >= pages ? ' disabled' : '') + '>Next</button></div>'
        : '<div class="cc-empty">No submitted Sales Orders for this selection.</div>') +
      '</section>';
  }

  function soNotes(data) {
    var s = data.summary;
    var cur = data.currency;
    var info = data.targets_info;
    return 'Sales Order tab: submitted Sales Orders only, by transaction date; drafts and cancelled ' +
      'orders are excluded. When an order is amended, the cancelled original is excluded and the ' +
      'amendment counts (' + s.amended + ' amended orders in this view). Closed orders are included at ' +
      'their booked net value (' + s.closed.count + ' · ' + esc(money(s.closed.value, cur)) +
      '); undelivered quantities on closed orders are not deducted. Sales Orders have no returns — ' +
      'returns are recorded on Delivery Notes and Sales Invoices and do not reduce these figures. ' +
      'Values are net of tax in company currency. Targets come from CEO Sales Target: monthly targets ' +
      'are summed for every calendar month the range touches and are never prorated; overall and brand ' +
      'targets are separate views of the same goal and are never added together. ' +
      'A target comparison is shown only when every salesperson, company and month in the view has a ' +
      'target record (zero counts as a set target); otherwise it is marked Partial target coverage. ' +
      (info.duplicates_ignored.length ? 'Duplicate target records ignored: ' +
        esc(info.duplicates_ignored.join(", ")) + '. ' : '') +
      (info.wrong_currency_ignored.length ? 'Targets in another currency ignored: ' +
        esc(info.wrong_currency_ignored.join(", ")) + '. ' : '') +
      (info.readable ? '' : 'Target records are not readable for your account. ') +
      'Figures respect the logged-in user\'s ERP permissions' +
      (data.restricted ? '; you see only your permitted salespersons\' allocated share.' : '.');
  }

  function soCoverage(data) {
    var t = data.target;
    var cov = t.coverage;
    var cur = data.currency;
    if (!cov || (t.target_state !== "partial" && !cov.zero_count)) return "";
    return '<div class="cc-note cc-coverage"><strong>' +
      (t.target_state === "partial" ? 'Partial target coverage' : 'Explicit zero targets') + '</strong>' +
      (t.target_state === "partial"
        ? ' — some salesperson-months in this view have no target, so achievement is not a complete comparison.'
        : '') +
      (cov.missing_count ? '<div>Missing targets (' + cov.missing_count + '): ' + esc(cov.missing.join("; ")) +
        (cov.missing_count > cov.missing.length ? '; …' : '') + '</div>' : '') +
      (cov.zero_count ? '<div>Explicit zero targets (' + cov.zero_count + '): ' + esc(cov.zero.join("; ")) +
        (cov.zero_count > cov.zero.length ? '; …' : '') + '</div>' : '') +
      (cov.uncovered_value >= 0.005 ? '<div>Unallocated or invalid-allocation value with no salesperson target: ' +
        esc(money(cov.uncovered_value, cur)) + '</div>' : '') +
      '</div>';
  }

  function soMarkup(data) {
    var cur = data.currency;
    var info = data.targets_info;
    var scope = [companyLabel()];
    if (data.sales_person) scope.push("Salesperson: " + data.sales_person);
    if (data.brand) scope.push("Brand: " + data.brand);

    return '<div class="cc-detail-head"><h3>Sales Order performance</h3>' +
      '<div class="cc-caption"><strong>Submitted Sales Orders · transaction date ' +
      esc(data.from_date) + ' to ' + esc(data.to_date) + '</strong> · ' + esc(scope.join(" · ")) +
      ' · Net of tax, ' + esc(cur) + '</div></div>' +
      soFilters(data) +
      soCards(data) +
      soCoverage(data) +
      '<div class="cc-note">Target months: ' + esc(data.months.map(function (m) { return m.label; }).join(", ")) +
      '. ' + (info.partial_months.length
        ? 'The range covers only part of ' + esc(info.partial_months.join(", ")) +
          '. Targets are full-month targets and are not prorated, so achievement compares a partial ' +
          'period with the full-month target.'
        : 'All months are fully covered by the range.') +
      (info.records_in_period ? '' : ' No target records exist for this period yet — targets show "Target not set".') +
      '</div>' +
      '<div data-so-breakdown-slot></div>' +
      '<section class="cc-panel cc-records"><h3>Sales order trend</h3>' +
      '<div class="cc-caption">Net order value' + (data.sales_person || data.brand || data.sp_location ? ' in this view' : '') +
      ' · ' + esc(scope.join(" · ")) + ' · ' + esc(data.from_date) + ' to ' + esc(data.to_date) + '</div>' +
      trendMarkup({ current: { trend: data.trend, from_date: data.from_date, to_date: data.to_date } }, cur) +
      '</section>' +
      soSalespersonSection(data) +
      soBrandSection(data) +
      soOrdersSection(data);
  }

  function soBind(detail) {
    detail.querySelectorAll("select[data-so]").forEach(function (select) {
      select.onchange = function () {
        if (select.dataset.so === "sales_person") state.soSalesperson = select.value;
        if (select.dataset.so === "brand") state.soBrand = select.value;
          if (select.dataset.so === "sp_location") { state.soLocation = select.value; state.soSalesperson = ""; state.path = []; state.page = 0; }
        state.soPage = 0;
        render();
      };
    });
    detail.querySelectorAll("[data-so-clear]").forEach(function (button) {
      button.onclick = function () {
        state.soSalesperson = "";
        state.soBrand = "";
        state.soLocation = "";
        state.path = [];
        state.page = 0;
        state.soPage = 0;
        render();
      };
    });
    detail.querySelectorAll("[data-so-sp]").forEach(function (button) {
      button.onclick = function () {
        state.soSalesperson = button.dataset.soSp;
        state.soPage = 0;
        render();
      };
    });
    detail.querySelectorAll("[data-so-brand]").forEach(function (button) {
      button.onclick = function () {
        state.soBrand = button.dataset.soBrand;
        state.soPage = 0;
        render();
      };
    });
    detail.querySelectorAll("[data-so-page]").forEach(function (button) {
      button.onclick = function () {
        state.soPage = Math.max(0, state.soPage + Number(button.dataset.soPage));
        render();
      };
    });
  }

  function renderSalesMovedNote(shell, data) {
    var detail = shell.querySelector(".cc-sales-detail");
    var current = data.current;
    var currency = data.currency;
    detail.innerHTML = '<div class="cc-empty"><strong>Location and Item Department breakdowns are on the Sales Order tab</strong>' +
      '<span>Selected period ' + esc(current.from_date) + ' to ' + esc(current.to_date) + ' · ' +
      number(current.count).toLocaleString("en-US") + ' ' + (state.measure === "invoiced" ? 'invoices' : 'orders') + ' · ' +
      esc(money(current.amount, currency)) + '</span>' +
      '<button type="button" class="cc-button" data-sales-view="sales_order">Open Sales Order</button></div>';
    salesNotes(shell,
      (state.measure === "invoiced"
        ? 'Returns included: ' + current.returns_count + ' · ' + esc(money(current.returns_amount, currency)) + '. '
        : 'Booked Sales includes all submitted order statuses. ') +
      'Values exclude taxes and use company currency. ' +
      'Summary cards and Sales trend follow the selected period. ' +
      'The Location and Item Department breakdowns (booked sales) are on the Sales Order tab. ' +
      'Totals respect the logged-in user\u2019s ERP record permissions.');
  }

  function loadSoBreakdown(id, range, shell, detail) {
    var box = document.createElement("div");
    box.className = "cc-so-breakdown";
    box.innerHTML = '<div class="cc-empty">Loading Location and Item Department breakdown…</div>';
    var slot = detail.querySelector("[data-so-breakdown-slot]");
    (slot || detail).appendChild(box);
    function fail() {
      if (id !== requestId || !box.isConnected) return;
      box.innerHTML = '<div class="cc-error">Location and Item Department breakdown could not be loaded. No partial totals are displayed.</div>';
    }
    frappe.call({
      method: "ceo_command_center_sales",
      args: {
        period: state.period,
        measure: "booked",
        sp_location: state.soLocation || "",
        from_date: range.from,
        to_date: range.to,
        company: state.company || salesPathKey("company"),
        level: salesLevels()[state.path.length],
        division: "",
        location: salesPathKey("location"),
        salesperson: salesPathKey("salesperson"),
        record_page: state.page
      },
      callback: function (response) {
        if (id !== requestId || !box.isConnected) return;
        if (response.exc || !response.message || !response.message.current) { fail(); return; }
        renderBreakdownDetail(shell, response.message, box);
      },
      error: fail
    });
  }

  function renderSalesOrderView(id, range, shell, detail, finishDetail, detailError) {
    var key = [state.company, range.from, range.to].join("|");
    if (key !== soScopeKey) {
      state.soPage = 0;
      soScopeKey = key;
    }

    frappe.call({
      method: "ceo_command_center_sales_orders",
      args: {
        company: state.company,
        from_date: range.from,
        to_date: range.to,
        sales_person: state.soSalesperson,
        brand: state.soBrand,
        sp_location: state.soLocation || "",
        page: state.soPage
      },
      callback: function (response) {
        if (id !== requestId) return;
        if (response.exc || !response.message) {
          detailError("Sales Order data could not be loaded.");
          return;
        }
        var data = response.message;
        if (data.currency_conflict) {
          detail.innerHTML = '<div class="cc-error">' + esc(data.message) + '</div>';
          finishDetail();
          return;
        }
        detail.innerHTML = soMarkup(data);
        soBind(detail);
        salesNotes(shell, soNotes(data));
        loadSoBreakdown(id, range, shell, detail);
        finishDetail();
      },
      error: function () {
        if (id !== requestId) return;
        detailError("Sales Order data could not be loaded.");
      }
    });
  }

  var financeExtra={key:'',supplier:'',account:'',page:0,profitCompany:'',costCenter:'',data:null,profitData:null};
  function finIsNum(c){var s=String(c==null?'':c).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();return s!==''&&/^(?:[A-Z]{3}\s?)?[-\u2212(]?[\d,]+(?:\.\d+)?\)?%?(?:\s?[A-Z]{3})?$/.test(s);}
  function finTable(headers,rows){var num=headers.map(function(h,i){var seen=0,ok=0;rows.forEach(function(r){var s=String(r[i]==null?'':r[i]).replace(/<[^>]*>/g,'').trim();if(s&&s!=='\u2014'&&s!=='-'){seen++;if(finIsNum(r[i]))ok++;}});return seen>0&&ok===seen;});return '<div class="cc-records"><table class="cc-table"><thead><tr>'+headers.map(function(h,i){return '<th'+(num[i]?' class="cc-number"':'')+'>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td'+(num[i]?' class="cc-number"':'')+'>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
  function finDoc(dt,name,label){return '<a target="_blank" rel="noopener noreferrer" href="/app/'+dt+'/'+encodeURIComponent(name)+'">'+esc(label||name)+'</a>';}
  function finPager(count){var start=financeExtra.page*50;return '<div class="cc-pager"><button type="button" class="cc-button" data-fx-page="previous" '+(!start?'disabled':'')+'>Previous</button><span>'+(count?start+1:0)+'–'+Math.min(start+50,count)+' of '+count+'</span><button type="button" class="cc-button" data-fx-page="next" '+(start+50>=count?'disabled':'')+'>Next</button></div>';}
  function finExtraPaint(data,id,range){if(id!==requestId||!isFinanceDept())return;var target=content.querySelector('.cc-fin-body');if(!target)return;var v=financeState.view,cur=data.currency,html='';financeExtra.data=data;
    if(v==='payables'){
      var s=data.summary;html='<section class="cc-panel"><h3>Supplier Payables</h3><div class="cc-caption">Current invoice balances · As of '+esc(data.as_of)+' · All invoice dates</div><div class="cc-kpis" style="margin-top:16px">'+financeCard('Positive invoice payables',esc(money(s.amount,cur)),s.count+' invoices')+financeCard('Overdue payables',esc(money(s.overdue,cur)),s.overdue_count+' invoices · Included in total')+financeCard('On hold',esc(money(s.on_hold,cur)),'Included in payables')+financeCard('Supplier credits',esc(money(s.credits,cur)),s.credit_count+' negative balances · Separate')+'</div>';
      if(financeExtra.supplier){var g=(data.groups||[]).filter(function(g){return g.key===financeExtra.supplier;})[0];var rs=(data.records||[]).filter(function(r){return r.company+' | '+r.supplier===financeExtra.supplier;});html+='<button type="button" class="cc-button" data-fx-back="1">← All suppliers</button><h3 style="margin-top:15px">'+esc(g?g.label:financeExtra.supplier)+'</h3><div class="cc-caption">'+(g?g.count+' invoices · '+esc(money(g.amount,cur)):'')+'</div>'+finTable(['Invoice','Company','Due date','On hold','Outstanding'],rs.slice(financeExtra.page*50,(financeExtra.page+1)*50).map(function(r){return [finDoc('purchase-invoice',r.name),esc(r.company),esc(r.due_date||'Missing'),r.on_hold?'Yes':'No',esc(money(r.amount,cur))];}))+finPager(rs.length);
      }else{
        var gs=(data.groups||[]).slice().sort(function(a,b){return b.amount-a.amount;});html+='<div class="cc-grid"><section><h3>Supplier balances</h3>'+finTable(['Supplier','Company','Invoices','Overdue','Outstanding'],gs.slice(financeExtra.page*50,(financeExtra.page+1)*50).map(function(g){return ['<button type="button" class="cc-button" data-fx-supplier="'+esc(g.key)+'">'+esc(g.label)+'</button>',esc(g.company),g.count,esc(money(g.overdue,cur)),esc(money(g.amount,cur))];}))+finPager(gs.length)+'</section><section><h3>Due-date ageing</h3>'+financeBars(data.ageing,false,cur)+'</section></div>';
      }html+='<div class="cc-note">'+esc(data.basis)+'</div></section>';
    }else if(v==='cash'){
      var s=data.summary;html='<section class="cc-panel"><h3>Cash & Treasury</h3><div class="cc-caption">Balances as of '+esc(data.as_of)+' · Movements '+esc(range.from)+' to '+esc(range.to)+'</div><div class="cc-kpis" style="margin-top:16px">'+financeCard('Bank & cash GL balance',esc(money(s.balance,cur)),s.account_count+' readable bank/cash accounts')+financeCard('Period bank/cash debits',esc(money(s.debit,cur)),'Transfers included')+financeCard('Period bank/cash credits',esc(money(s.credit,cur)),'Transfers included')+financeCard('Net bank/cash movement',esc(money(s.net,cur)),'Period debits less credits')+'</div>';
      if(financeExtra.account){html+='<button type="button" class="cc-button" data-fx-back="1">← All bank/cash accounts</button><h3 style="margin-top:15px">'+esc(financeExtra.account)+'</h3>'+finTable(['Date','Voucher','Party','Debit','Credit'],(data.records||[]).map(function(r){var slug=String(r.voucher_type||'').toLowerCase().replace(/ /g,'-');return [esc(r.posting_date),finDoc(slug,r.voucher_no),esc(r.party||'—'),esc(money(r.debit,cur)),esc(money(r.credit,cur))];}))+finPager(data.record_count||0);
      }else html+=finTable(['Account','Company','Type','Current GL balance'],(data.accounts||[]).slice().sort(function(a,b){return b.amount-a.amount;}).slice(financeExtra.page*50,(financeExtra.page+1)*50).map(function(a){return ['<button type="button" class="cc-button" data-fx-account="'+esc(a.name)+'">'+esc(a.name)+'</button>',esc(a.company),esc(a.type),esc(money(a.amount,cur))];}))+finPager((data.accounts||[]).length);
      html+='<div class="cc-note">'+esc(data.basis)+'</div><h3 style="margin-top:22px">13-week invoice due-date scenario</h3>'+(data.scenario_available?finTable(['Week','Dates','Invoice receipts','Invoice payments','Projected balance'],data.weeks.map(function(w){return [w.week,esc(w.from)+' to '+esc(w.to),esc(money(w.receipts,cur)),esc(money(w.payments,cur)),esc(money(w.closing,cur))];})):'<div class="cc-error">'+esc(data.scenario_error)+'</div>')+'<div class="cc-note">'+esc(data.scenario_basis)+'</div></section>';
    }else if(v==='plans'){
      html='<section class="cc-panel"><h3>Collection Plans</h3><div class="cc-caption">Latest submitted plan per salesperson issued '+esc(range.from)+' to '+esc(range.to)+'</div><div class="cc-kpis" style="margin-top:16px">'+financeCard('Submitted plans',data.summary.plan_count,'Latest snapshot per salesperson')+financeCard('Plan rows',data.summary.row_count,'Company mapped through invoices')+financeCard('Unresolved invoice rows',data.unresolved_rows,'Not assigned to a company when unresolved')+financeCard('Duplicate invoice rows',data.duplicate_rows,'Excluded from estimate-field totals')+'</div>';
      html+='<div class="cc-note">Matched allocated customer receipts in selected dates: '+(data.allocations_available?esc(money(data.matched_allocated_receipts,cur)):'Unavailable — receipt permission, scope or currency validation failed')+'.</div><h3>Saved estimates by source field</h3>'+(data.estimates.length?finTable(['Estimate field','Saved amount'],data.estimates.map(function(e){return [esc(e.field.replace(/_/g,' ')),esc(money(e.amount,cur))];})):'<div class="cc-note">No nonzero saved estimates in this plan scope.</div>');
      html+=finTable(['Plan / salesperson','Customer / invoice','Saved outstanding','Current outstanding','Allocated receipts in period','Remarks'],data.rows.slice(financeExtra.page*50,(financeExtra.page+1)*50).map(function(r){return [finDoc('sales-person-weekly-collection---invoice-wise',r.plan)+'<br>'+esc(r.salesperson)+'<br>'+esc(r.plan_date),esc(r.customer)+'<br>'+esc(r.invoice)+(r.duplicate?'<br>Duplicate invoice row':''),esc(money(r.saved_outstanding,cur)),r.current_outstanding===null?'Unavailable':esc(money(r.current_outstanding,cur)),r.allocated_receipts===null?'Unavailable / duplicate':esc(money(r.allocated_receipts,cur)),esc(r.remarks)];}))+finPager(data.rows.length)+'<div class="cc-note">'+esc(data.basis)+'</div></section>';
    }
    target.innerHTML=html;badge.textContent='Finance views connected · Record permissions applied';content.style.minHeight='';content.removeAttribute('aria-busy');
  }
  function finLoadLegal(id,cat){
    const target=content.querySelector('.cc-fin-body');if(!target)return;
    const finish=()=>{content.style.minHeight='';content.removeAttribute('aria-busy');};
    frappe.call({method:'ceo_command_center_legal_taradhi',args:{company:state.company||'',category:cat},callback:function(r){
      if(id!==requestId)return;if(r.exc||!r.message){finExtraError(id);return;}
      const d=r.message;
      target.innerHTML='<section class="cc-panel"><h3>'+esc(cat==='taradhi'?'Taradhi — live cases':'Legal — live cases')+'</h3><p>'+esc(d.basis)+'</p>'+financeCard('Visible case records',number(d.count),'Native record permissions')+'<p>Unresolved company links excluded from company selection: '+number(d.unresolved_company)+'</p><table class="cc-table"><thead><tr><th>Case</th><th>Customer</th><th>Status</th><th>Recorded case amount (currency unspecified)</th></tr></thead><tbody>'+(d.rows||[]).map(x=>'<tr><td><a href="/app/'+esc(x.doctype.toLowerCase().replace(/ /g,'-'))+'/'+encodeURIComponent(x.name)+'" target="_blank" rel="noopener">'+esc(x.name)+'</a></td><td>'+esc(x.label)+'</td><td>'+esc(x.status||'Unspecified')+'</td><td>'+esc(x.recorded_amount)+'</td></tr>').join('')+'</tbody></table></section>';
      finish();
    },error:function(){if(id===requestId)finExtraError(id);}});
  }

function finLoadExtra(id,range){
    var v=financeState.view;if(['plans','payables','cash','profit','legal','taradhi'].indexOf(v)<0)return;
    var key=[v,state.company,range.from,range.to].join('|');if(key!==financeExtra.key){financeExtra.key=key;financeExtra.supplier='';financeExtra.account='';financeExtra.page=0;financeExtra.profitCompany='';financeExtra.costCenter='';}
    var target=content.querySelector('.cc-fin-body');if(!target)return;target.innerHTML='<section class="cc-panel"><h3>'+esc(financeViews.filter(function(x){return x[0]===v;})[0][1])+'</h3><div class="cc-empty">Loading live Finance data…</div></section>';
    if(v==='legal'||v==='taradhi'){finLoadLegal(id,v);return;}
    if(v==='profit'){finLoadProfit(id,range);return;}
    frappe.call({method:'ceo_command_center_finance_details',args:{mode:v,company:state.company,from_date:range.from,to_date:range.to,account:financeExtra.account,record_page:financeExtra.page},callback:function(r){if(id!==requestId)return;if(r.exc||!r.message){finExtraError(id);return;}finExtraPaint(r.message,id,range);},error:function(){finExtraError(id);}});
  }
  function finExtraError(id){if(id!==requestId||!isFinanceDept())return;var t=content.querySelector('.cc-fin-body');if(t)t.innerHTML='<div class="cc-error">This Finance section is unavailable. Check the ERP error message, source read permissions and supported scope. No missing figures have been replaced with zero.</div>';badge.textContent='Finance section unavailable';content.style.minHeight='';content.removeAttribute('aria-busy');}
  function finLoadProfit(id,range){
    var company=state.company||financeExtra.profitCompany;
    var t=content.querySelector('.cc-fin-body');
    if(!company){t.innerHTML='<section class="cc-panel"><h3>Financial Performance · Select a company</h3><div class="cc-caption">Uses ERPNext’s Profit and Loss report. Company figures are not silently consolidated.</div><div class="cc-fin-company-list">'+Array.prototype.slice.call(companySelect.options).filter(function(o){return o.value;}).map(function(o){return '<button type="button" class="cc-button" data-fx-profit-company="'+esc(o.value)+'">'+esc(o.textContent)+'</button>';}).join('')+'</div></section>';return;}
    var filters={company:company,filter_based_on:'Date Range',period_start_date:range.from,period_end_date:range.to,from_fiscal_year:range.from.slice(0,4),to_fiscal_year:range.to.slice(0,4),periodicity:'Monthly',include_default_book_entries:1,accumulated_values:0,selected_view:'Report'};
    if(financeExtra.costCenter)filters.cost_center=[financeExtra.costCenter];
    frappe.call({method:'frappe.desk.query_report.run',args:{report_name:'Profit and Loss Statement',filters:JSON.stringify(filters),ignore_prepared_report:1},callback:function(r){if(id!==requestId)return;var d=r.message;if(r.exc||!d||!Array.isArray(d.result)){finExtraError(id);return;}financeExtra.profitData=d;finPaintProfit(d,company,id,range);},error:function(){finExtraError(id);}});
  }
  function finPaintProfit(d,company,id,range){if(id!==requestId)return;var target=content.querySelector('.cc-fin-body');if(!target)return;var cols=(d.columns||[]).filter(function(c){return c.fieldname!=='currency'&&!c.hidden;});var rows=(d.result||[]).filter(function(r){return r&&Object.keys(r).length;});var currencies={};rows.forEach(function(r){if(r.currency)currencies[r.currency]=1;});var currency=Object.keys(currencies).length===1?Object.keys(currencies)[0]:'';
    var html='<section class="cc-panel"><div class="cc-section-heading"><div><h3>Financial Performance</h3><div class="cc-caption">'+esc(company)+' · '+esc(range.from)+' to '+esc(range.to)+' · Official Profit and Loss report</div></div>'+(!state.company?'<button type="button" class="cc-button" data-fx-profit-back="1">← Companies</button>':'')+'</div><div class="cc-kpis">'+(d.report_summary||[]).filter(function(s){return s.label&&s.datatype==='Currency';}).map(function(s){return financeCard(s.label||'Report summary',esc(s.datatype==='Currency'?money(s.value,s.currency||currency):String(s.value===undefined?'—':s.value)),'From ERPNext report');}).join('')+'</div><div class="cc-caption">Cost Centre: '+esc(financeExtra.costCenter||'All permitted cost centres')+'</div><div class="cc-fin-cost-centres"></div>';
    html+=finTable(cols.map(function(c){return c.label||c.fieldname;}),rows.slice(financeExtra.page*50,(financeExtra.page+1)*50).map(function(row){return cols.map(function(c){var val=row[c.fieldname];if(c.fieldname==='account'&&val&&!/^(Total |Profit |Net Profit)/i.test(val)){return '<button type="button" class="cc-button" data-fx-profit-account="'+esc(val)+'">'+esc(val)+'</button>';}if(c.fieldtype==='Currency'||c.fieldtype==='Float')return val===undefined||val===null?'':esc(money(val,row.currency||currency));return esc(val===undefined||val===null?'':val);});}))+finPager(rows.length)+'<div class="cc-note">Values are returned directly by the standard Profit and Loss report for the selected dates, with default finance-book entries included. Account buttons open the General Ledger for that company and period. Consolidated statements and eliminations are not inferred.</div></section>';target.innerHTML=html;badge.textContent='Financial Performance connected · Official ERP report';content.style.minHeight='';content.removeAttribute('aria-busy');
    frappe.call({method:'frappe.client.get_list',args:{doctype:'Cost Center',fields:['name'],filters:{company:company,is_group:0},order_by:'name asc',limit_page_length:501},callback:function(r){if(id!==requestId||!content.querySelector('.cc-fin-cost-centres'))return;if(r.exc)return;var holder=content.querySelector('.cc-fin-cost-centres');if((r.message||[]).length>=501){holder.textContent='Use the standard report for a larger cost-centre selection.';return;}holder.innerHTML='<label class="cc-caption">Cost Centre <select data-fx-cost-centre><option value="">All permitted cost centres</option>'+(r.message||[]).map(function(c){return '<option value="'+esc(c.name)+'"'+(c.name===financeExtra.costCenter?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select></label>';holder.querySelector('select').onchange=function(e){financeExtra.costCenter=e.target.value;financeExtra.page=0;render();};}});
  }
  function drawFinance(receipts,balances,detail,errors,range,id){
    drawFinanceBase(receipts,balances,detail,errors,range,id);
    // Finance tab: only Payables, Cash & Treasury and Financial Performance (no collections cards).
    if(id===requestId&&state.department==='Finance'){
      content.innerHTML=header(range)+financeNav()+'<div class="cc-fin-body"></div>';
      content.style.minHeight='';content.removeAttribute('aria-busy');
      badge.textContent='Finance';
    }
    if(id===requestId){
      finLoadExtra(id,range);
      if(financeState.view==='overview'){
        var b=content.querySelector('.cc-fin-body');
        if(b)b.insertAdjacentHTML('beforeend','<div class="cc-note">'+(state.company&&range.to===frappe.datetime.get_today()?'<button type="button" class="cc-button" data-fx-reconcile>Reconcile with Accounts Receivable</button>':(state.company?'The current-field reconciliation check compares today\'s invoice fields with the report and is available only when the End Date is today. The balances above already come from the Accounts Receivable report as of '+esc(range.to)+'.':'Select one company to reconcile invoice balances against Accounts Receivable.'))+'</div><div class="cc-fin-reconciliation"></div>');
      }
    }
  }
  host.addEventListener('click',function(event){var b=event.target.closest('button');if(!b||!host.contains(b)||b.disabled)return;
    if(b.hasAttribute('data-fx-reconcile')){finReconcile(requestId);}
    else if(b.hasAttribute('data-fx-supplier')){financeExtra.supplier=b.dataset.fxSupplier;financeExtra.page=0;finExtraPaint(financeExtra.data,requestId,dateRange());}
    else if(b.hasAttribute('data-fx-account')){financeExtra.account=b.dataset.fxAccount;financeExtra.page=0;render();}
    else if(b.hasAttribute('data-fx-back')){financeExtra.supplier='';financeExtra.account='';financeExtra.page=0;render();}
    else if(b.hasAttribute('data-fx-page')){financeExtra.page=Math.max(0,financeExtra.page+(b.dataset.fxPage==='next'?1:-1));if(financeState.view==='profit')finPaintProfit(financeExtra.profitData,state.company||financeExtra.profitCompany,requestId,dateRange());else if(financeState.view==='cash')render();else finExtraPaint(financeExtra.data,requestId,dateRange());}
    else if(b.hasAttribute('data-fx-profit-company')){financeExtra.profitCompany=b.dataset.fxProfitCompany;financeExtra.page=0;render();}
    else if(b.hasAttribute('data-fx-profit-back')){financeExtra.profitCompany='';financeExtra.page=0;render();}
    else if(b.hasAttribute('data-fx-profit-account')){var f={company:state.company||financeExtra.profitCompany,from_date:dateRange().from,to_date:dateRange().to,account:[b.dataset.fxProfitAccount],group_by:'Group by Voucher (Consolidated)'};if(financeExtra.costCenter)f.cost_center=[financeExtra.costCenter];window.open('/app/query-report/General%20Ledger?'+Object.keys(f).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(Array.isArray(f[k])?JSON.stringify(f[k]):f[k]);}).join('&'),'_blank','noopener');}
  });

  function finReconcile(id){
    if(!state.company)return;var company=state.company,t=content.querySelector('.cc-fin-reconciliation');if(!t)return;t.innerHTML='<div class="cc-note">Reconciling current invoice balances against the standard Accounts Receivable report…</div>';
    var invoices=null,report=null,pending=2,failed=false;
    function finish(){pending--;if(id!==requestId||pending)return;if(failed){t.innerHTML='<div class="cc-error">Reconciliation unavailable. Check invoice and Accounts Receivable report permissions. No partial check is labelled as reconciled.</div>';return;}
      var pos=0,neg=0,other=0,types={},reportInvoices={};(report.result||[]).forEach(function(r){if(!r.voucher_type||!r.voucher_no)return;var amount=number(r.outstanding);if(r.voucher_type==='Sales Invoice'){reportInvoices[r.voucher_no]=number(reportInvoices[r.voucher_no])+amount;if(amount>0)pos+=amount;else neg+=amount;}else{other+=amount;types[r.voucher_type]=number(types[r.voucher_type])+amount;}});
      var s=invoices.summary,cur=invoices.currency,diff=number(s.outstanding_amount)-pos;
      var total=pos+neg+other;
      var fieldInvoices={};(invoices.reconciliation_records||[]).forEach(function(r){fieldInvoices[r.name]=number(r.amount);});
      var keys=Object.keys(fieldInvoices);Object.keys(reportInvoices).forEach(function(k){if(keys.indexOf(k)<0)keys.push(k);});
      var differences=keys.map(function(k){return {name:k,field:number(fieldInvoices[k]),report:number(reportInvoices[k]),difference:number(fieldInvoices[k])-number(reportInvoices[k])};}).filter(function(r){return Math.abs(r.difference)>=0.005;}).sort(function(a,b){return Math.abs(b.difference)-Math.abs(a.difference);});
      t.innerHTML='<section class="cc-panel"><h3>Accounts Receivable reconciliation · '+esc(company)+'</h3><div class="cc-caption">As of '+esc(invoices.as_of)+' · Standard report · Due-date basis</div>'+finTable(['Measure','Amount'],[['Dashboard positive invoice balance',esc(money(s.outstanding_amount,cur))],['Report positive Sales Invoice balance',esc(money(pos,cur))],['Positive invoice difference',esc(money(diff,cur))],['Report negative invoice balances',esc(money(neg,cur))],['Report other vouchers / advances / adjustments',esc(money(other,cur))],['Report net receivables',esc(money(total,cur))]])+'<div class="cc-note">'+(Math.abs(diff)<0.01?'Positive invoice balances match the standard Accounts Receivable report.':'Positive invoice balances differ from the standard Accounts Receivable report; investigation is required before calling this reconciled.')+' The report net includes other voucher types and is not the dashboard’s positive-invoice measure. '+Object.keys(types).map(function(k){return esc(k)+': '+esc(money(types[k],cur));}).join(' · ')+'</div>'+(differences.length?'<h3 style="margin-top:16px">Invoice exceptions ('+differences.length+')</h3>'+finTable(['Invoice','Invoice field','Receivables report','Difference'],differences.slice(0,50).map(function(r){return [finDoc('sales-invoice',r.name),esc(money(r.field,cur)),esc(money(r.report,cur)),esc(money(r.difference,cur))];})): '<div class="cc-note">No invoice-level exceptions of 0.005 or more.</div>')+'</section>';
    }
    frappe.call({method:'ceo_command_center_receivables',args:{company:company,level:'company',reconcile:1},callback:function(r){if(r.exc||!r.message)failed=true;else invoices=r.message;finish();},error:function(){failed=true;finish();}});
    frappe.call({method:'frappe.desk.query_report.run',args:{report_name:'Accounts Receivable',filters:JSON.stringify({company:company,report_date:frappe.datetime.get_today(),ageing_based_on:'Due Date',range1:30,range2:60,range3:90,range4:120}),ignore_prepared_report:1},callback:function(r){if(r.exc||!r.message||!Array.isArray(r.message.result))failed=true;else report=r.message;finish();},error:function(){failed=true;finish();}});
  }

  // ---------------------------------------------------------------------------
  // Sales Support operations desk: heading, four cards, tabs below the cards,
  // full-width detail. Data: ceo_command_center_sales_support (existing requests)
  // and its view="expired" branch. Read-only; stale responses are ignored.
  var ssTabs = [
    { key: "overview", label: "Overview" },
    { key: "queue", label: "Approval Queue", status: "draft_review", statusLabel: "Awaiting approval / In review" },
    { key: "approved", label: "Approved, Not Submitted", status: "draft_approved", statusLabel: "Approved, not submitted" },
    { key: "expired", label: "Expired Quotations" },
    { key: "all", label: "All Quotations" }
  ];
  var ssDesk = {
    tab: "overview", path: [], page: 0,
    exScope: "actionable", exPath: [], exPage: 0,
    scopeKey: "", exCompany: null, cards: {}, bound: false
  };
  var SS_UN = "~unassigned~";
  var ssCatLabels = {
    approved_draft: "Approved draft (not submitted)",
    other_draft: "Draft in approval / other draft state",
    submitted: "Submitted (open, replied or expired status)",
    partially_ordered: "Partially ordered",
    lost_draft: "Lost draft",
    closed_outcome: "Closed outcome (ordered, lost or rejected)",
    cancelled: "Cancelled"
  };

  function ssTabInfo(key) {
    for (var i = 0; i < ssTabs.length; i++) if (ssTabs[i].key === key) return ssTabs[i];
    return ssTabs[0];
  }

  function ssDocStatus(ds) {
    return ds === 0 ? "Draft" : ds === 1 ? "Submitted" : ds === 2 ? "Cancelled" : String(ds);
  }

  function ssShell(range) {
    var shell = content.querySelector("[data-ss-shell]");
    if (!shell) {
      content.innerHTML =
        '<div data-ss-shell>' +
        '<div class="cc-ss-head"></div>' +
        '<div class="cc-ss-cards"></div>' +
        '<nav class="cc-views cc-ss-tabs" aria-label="Sales Support views"></nav>' +
        '<section class="cc-ss-detail" aria-live="polite"></section>' +
        '<div class="cc-ss-notes"></div>' +
        '</div>';
      shell = content.querySelector("[data-ss-shell]");
      shell.addEventListener("click", ssClick);
    }
    shell.querySelector(".cc-ss-head").innerHTML = header(range);
    shell.querySelector(".cc-ss-tabs").innerHTML = ssTabs.map(function (t) {
      var on = ssDesk.tab === t.key;
      return '<button type="button" class="cc-view' + (on ? ' active' : '') + '" data-ss-tab="' + t.key +
        '" aria-pressed="' + on + '"><span>' + esc(t.label) + '</span></button>';
    }).join("");
    return shell;
  }

  function ssCardsMarkup(data) {
    var cur = data.currency;
    return '<div class="cc-kpis">' + (data.cards || []).map(function (c) {
      return '<button type="button" class="cc-kpi cc-ss-card" data-ss-card="' + esc(c.key) + '">' +
        '<div class="cc-kpi-label">' + esc(c.label) + '</div>' +
        '<div class="cc-kpi-value">' + number(c.count).toLocaleString("en-US") + '</div>' +
        '<div class="cc-kpi-note">' + esc(money(c.amount, cur)) + ' · Net quotation value</div></button>';
    }).join("") + '</div>';
  }

  function ssBars(groups, cur, attr) {
    var max = Math.max.apply(null, groups.map(function (g) { return Math.abs(number(g.amount)); }).concat([1]));
    return groups.map(function (g, i) {
      return '<button type="button" class="cc-bar" ' + attr + '="' + i + '"><span>' + esc(g.label) +
        ' <small>(' + number(g.count).toLocaleString("en-US") + ')</small></span>' +
        '<span class="cc-track"><span class="cc-fill" style="width:' + (Math.abs(number(g.amount)) / max * 100) +
        '%"></span></span><span class="cc-number">' + esc(money(g.amount, cur)) + '</span></button>';
    }).join("");
  }

  function ssPager(page, size, total) {
    var pages = Math.max(1, Math.ceil(total / size));
    var first = total ? page * size + 1 : 0;
    var last = Math.min(total, (page + 1) * size);
    return '<div class="cc-pager"><button type="button" class="cc-button" data-ss-page="-1"' +
      (page === 0 ? ' disabled' : '') + '>Previous</button><span>Showing ' + first + '–' + last + ' of ' +
      number(total).toLocaleString("en-US") + ' · Page ' + (page + 1) + ' of ' + pages +
      '</span><button type="button" class="cc-button" data-ss-page="1"' +
      (page + 1 >= pages ? ' disabled' : '') + '>Next</button></div>';
  }

  function ssCrumbs(rootLabel, path) {
    return '<div class="cc-breadcrumbs"><button type="button" class="cc-button" data-ss-depth="0">' +
      esc(rootLabel) + '</button>' + path.map(function (p, i) {
        return '<span>›</span><button type="button" class="cc-button" data-ss-depth="' + (i + 1) + '">' +
          esc(p.label) + '</button>';
      }).join("") + '</div>';
  }

  // ---- Overview / Approval Queue / Approved, Not Submitted / All Quotations
  function ssLevels() {
    var t = ssTabInfo(ssDesk.tab);
    return t.status ? ["creator", "records"] : ["status", "creator", "records"];
  }

  function ssArgs(range) {
    var t = ssTabInfo(ssDesk.tab);
    var full = t.status ? [{ key: t.status, label: t.statusLabel }].concat(ssDesk.path) : ssDesk.path;
    var level = ssDesk.tab === "overview" ? "status" : ssLevels()[ssDesk.path.length];
    return {
      from_date: range.from, to_date: range.to, company: state.company, level: level,
      status_key: full[0] ? full[0].key : "", created_by: full[1] ? full[1].key : "",
      record_page: ssDesk.page
    };
  }

  function ssRecordsTable(data) {
    var cur = data.currency;
    var rows = data.records || [];
    var total = number((data.summary || {}).count);
    return '<div class="cc-records"><table class="cc-table"><thead><tr><th>Quotation</th><th>Date</th>' +
      '<th>Customer</th><th>Company</th><th>Workflow state</th><th>Document status</th><th>Created By</th>' +
      '<th>Division</th><th>Location</th><th>Salesperson</th><th class="cc-number">Net value</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) {
        return '<tr><td><a href="/app/quotation/' + encodeURIComponent(r.name) + '" target="_blank" rel="noopener">' +
          esc(r.name) + '</a></td><td>' + esc(r.date) + '</td><td>' + esc(r.party || '') + '</td><td>' +
          esc(r.company || '') + '</td><td>' + esc(r.workflow_state || '—') +
          (r.docstatus === 0 && r.workflow_state === 'Approved' ? ' <span class="cc-badge">Approved, not submitted</span>' : '') +
          '</td><td>' + esc(ssDocStatus(r.docstatus)) + (r.status ? ' · ' + esc(r.status) : '') + '</td><td>' +
          esc(r.created_by || '') + '</td><td>' + esc(r.division || 'Unassigned') + '</td><td>' +
          esc(r.location || 'Unassigned') + '</td><td>' + esc(r.salesperson || 'Unassigned') +
          '</td><td class="cc-number">' + esc(money(r.amount, cur)) + '</td></tr>';
      }).join("") : '<tr><td colspan="11"><div class="cc-empty">No quotations for this selection.</div></td></tr>') +
      '</tbody><tfoot><tr><th colspan="10">All matching quotations: ' + total.toLocaleString("en-US") +
      '</th><th class="cc-number">' + esc(money((data.summary || {}).amount, cur)) + '</th></tr></tfoot></table></div>' +
      ssPager(ssDesk.page, data.record_page_size || 50, total);
  }

  function ssOverview(data) {
    var cur = data.currency;
    var s = data.summary || {};
    var combos = data.workflow_combinations || [];
    var flagged = combos.filter(function (c) { return c.inconsistent || !c.bucket || c.bucket === "unmapped"; });
    var conv = data.order_conversion || [];
    return '<div class="cc-detail-head"><h3>Overview</h3><div class="cc-caption">Selected period · ' +
      esc(data.from_date) + ' to ' + esc(data.to_date) + ' · ' + number(s.count).toLocaleString("en-US") +
      ' quotations · ' + esc(money(s.amount, cur)) + ' net (company currency) · Draft ' + number(s.draft_count) +
      ' · Submitted ' + number(s.submitted_count) + ' · Cancelled ' + number(s.cancelled_count) +
      ' · Inconsistent ' + number(s.inconsistent_count) + '</div></div>' +
      '<div class="cc-grid">' +
      '<section class="cc-panel"><h3>Workflow breakdown</h3><div class="cc-caption">Click a state to list its quotations under All Quotations.</div>' +
      ((data.status_groups || []).length ? ssBars(data.status_groups, cur, 'data-ss-status') :
        '<div class="cc-empty">No quotations in this period.</div>') + '</section>' +
      '<section class="cc-panel"><h3>Quotation activity</h3><div class="cc-caption">Quotations created per ' +
      (state.period === "Yearly" ? 'month' : 'day') + ' · quotation date</div>' + supportTrendMarkup(data) + '</section>' +
      '</div>' +
      '<section class="cc-panel cc-records"><h3>Workflow combinations</h3><div class="cc-caption">Document status × workflow state as stored. ' +
      (flagged.length ? '<strong>' + flagged.length + ' inconsistent or unmapped combination(s) are highlighted.</strong>' :
        'No inconsistent or unmapped combinations.') + '</div>' +
      '<table class="cc-table"><thead><tr><th>Company</th><th>Document status</th><th>Workflow state</th><th>Reported as</th>' +
      '<th class="cc-number">Quotations</th><th class="cc-number">Net value</th></tr></thead><tbody>' +
      combos.map(function (c) {
        var bad = c.inconsistent || !c.bucket || c.bucket === "unmapped";
        var g = (data.status_groups || []).filter(function (x) { return x.key === c.bucket; })[0];
        return '<tr' + (bad ? ' class="cc-flag"' : '') + '><td>' + esc(c.company || '') + '</td><td>' +
          esc(ssDocStatus(c.docstatus)) + '</td><td>' + esc(c.workflow_state || '(blank)') + '</td><td>' +
          (bad ? '<span class="cc-badge warn">' + esc(c.inconsistent ? 'Inconsistent' : 'Unmapped') + '</span> ' : '') +
          esc(g ? g.label : (c.bucket || 'Unmapped')) + '</td><td class="cc-number">' + number(c.count).toLocaleString("en-US") +
          '</td><td class="cc-number">' + esc(money(c.amount, cur)) + '</td></tr>';
      }).join("") + '</tbody></table></section>' +
      (conv.length ? '<section class="cc-panel cc-records"><h3>Order conversion of submitted quotations</h3><table class="cc-table"><thead><tr>' +
        '<th>Status</th><th class="cc-number">Quotations</th><th class="cc-number">Net value</th></tr></thead><tbody>' +
        conv.map(function (c) {
          return '<tr><td>' + esc(c.status) + '</td><td class="cc-number">' + number(c.count).toLocaleString("en-US") +
            '</td><td class="cc-number">' + esc(money(c.amount, cur)) + '</td></tr>';
        }).join("") + '</tbody></table></section>' : '');
  }

  function ssDrill(data) {
    var cur = data.currency;
    var t = ssTabInfo(ssDesk.tab);
    var levels = ssLevels();
    var level = levels[ssDesk.path.length];
    var root = t.status ? t.statusLabel : "All quotations";
    var head = '<div class="cc-detail-head"><h3>' + esc(t.label) + '</h3><div class="cc-caption">Selected period · ' +
      esc(data.from_date) + ' to ' + esc(data.to_date) + ' · ' + esc(companyLabel()) + ' · ' +
      number((data.summary || {}).count).toLocaleString("en-US") + ' quotations · ' +
      esc(money((data.summary || {}).amount, cur)) + ' net</div></div>' + ssCrumbs(root, ssDesk.path);
    if (level === "records") return head + ssRecordsTable(data);
    var groups = level === "status" ? (data.status_groups || []) : (data.creator_groups || []);
    var lbl = level === "status" ? "Workflow group" : "Created By";
    return head + '<section class="cc-panel"><h3>' + lbl + ' breakdown</h3><div class="cc-caption">' +
      (level === "creator" ? 'Created By = the user who created the quotation (document owner). ' : '') +
      'Click to drill down.</div>' +
      (groups.length ? ssBars(groups, cur, 'data-ss-group') : '<div class="cc-empty">No quotations for this selection.</div>') +
      '</section>' + (groups.length ? '<div class="cc-records"><table class="cc-table"><thead><tr><th>' + lbl +
      '</th><th class="cc-number">Quotations</th><th class="cc-number">Net value</th></tr></thead><tbody>' +
      groups.map(function (g, i) {
        return '<tr><td><button type="button" class="cc-button" data-ss-group="' + i + '">' + esc(g.label) +
          '</button></td><td class="cc-number">' + number(g.count).toLocaleString("en-US") + '</td><td class="cc-number">' +
          esc(money(g.amount, cur)) + '</td></tr>';
      }).join("") + '</tbody><tfoot><tr><th>Total</th><th class="cc-number">' +
      number((data.summary || {}).count).toLocaleString("en-US") + '</th><th class="cc-number">' +
      esc(money((data.summary || {}).amount, cur)) + '</th></tr></tfoot></table></div>' : '');
  }

  // ---- Expired Quotations
  function exLevels() {
    return state.company ? ["division", "location", "salesperson", "records"]
      : ["company", "division", "location", "salesperson", "records"];
  }

  function exKey(level) {
    var lv = exLevels();
    for (var i = 0; i < ssDesk.exPath.length; i++) if (lv[i] === level) return ssDesk.exPath[i].key;
    return "";
  }

  function exMarkup(data) {
    var cur = data.currency;
    var s = data.summary;
    var lv = exLevels();
    var level = lv[ssDesk.exPath.length];
    var actionable = data.scope === "actionable";
    var b = {};
    (data.buckets || []).forEach(function (x) { b[x.key] = x; });
    var cats = data.categories || [];
    function mini(label, count, amount, note) {
      return '<div class="cc-kpi"><div class="cc-kpi-label">' + esc(label) + '</div><div class="cc-kpi-value">' +
        number(count).toLocaleString("en-US") + '</div><div class="cc-kpi-note">' + esc(money(amount, cur)) +
        (note ? ' · ' + esc(note) : '') + '</div></div>';
    }
    var levelLabel = { company: "Company", division: "Division", location: "Location", salesperson: "Salesperson", records: "Quotations" }[level];
    var groups = data.groups || [];
    var html = '<div class="cc-detail-head"><h3>Expired Quotations</h3><div class="cc-caption"><strong>Current backlog as of ' +
      esc(data.as_of) + ' · All issue dates</strong> · ' + esc(companyLabel()) +
      ' · The period filter does not limit this backlog.</div></div>' +
      '<div class="cc-seg" role="group" aria-label="Expired scope">' +
      '<button type="button" class="cc-button' + (actionable ? ' cc-on' : '') + '" data-ex-scope="actionable" aria-pressed="' + actionable +
      '">Expired, still actionable</button><button type="button" class="cc-button' + (!actionable ? ' cc-on' : '') +
      '" data-ex-scope="all" aria-pressed="' + (!actionable) + '">All expired (incl. outcomes)</button></div>' +
      '<div class="cc-note">' + esc(data.definition) + ' Values are the full net quotation value, not the remaining value. ' +
      'Not expired: ' + number(data.valid_today.count).toLocaleString("en-US") + ' valid through today · ' +
      number(data.missing_validity.count).toLocaleString("en-US") + ' with no Valid Till (' +
      esc(money(data.missing_validity.amount, cur)) + ').</div>' +
      '<div class="cc-kpis cc-ex-kpis">' +
      mini(actionable ? "Expired, actionable" : "All expired", s.count, s.amount, "full quotation value") +
      mini("Expired 1–30 days", (b.d1_30 || {}).count, (b.d1_30 || {}).amount) +
      mini("Expired 31–90 days", (b.d31_90 || {}).count, (b.d31_90 || {}).amount) +
      mini("Expired more than 90 days", (b.d90 || {}).count, (b.d90 || {}).amount) +
      '</div>' +
      '<div class="cc-records"><table class="cc-table cc-ex-cats"><thead><tr><th>Breakdown</th><th class="cc-number">Quotations</th>' +
      '<th class="cc-number">Full net value</th></tr></thead><tbody>' +
      cats.map(function (c) {
        return '<tr><td>' + esc(ssCatLabels[c.key] || c.key) + '</td><td class="cc-number">' +
          number(c.count).toLocaleString("en-US") + '</td><td class="cc-number">' + esc(money(c.amount, cur)) + '</td></tr>';
      }).join("") + '</tbody></table></div>' +
      (!actionable && (data.combinations || []).length ? '<div class="cc-records"><table class="cc-table"><thead><tr>' +
        '<th>Document status</th><th>Status</th><th>Workflow state</th><th class="cc-number">Quotations</th><th class="cc-number">Full net value</th>' +
        '</tr></thead><tbody>' + data.combinations.map(function (c) {
          return '<tr><td>' + esc(ssDocStatus(c.docstatus)) + '</td><td>' + esc(c.status || '') + '</td><td>' +
            esc(c.workflow_state || '(blank)') + '</td><td class="cc-number">' + number(c.count).toLocaleString("en-US") +
            '</td><td class="cc-number">' + esc(money(c.amount, cur)) + '</td></tr>';
        }).join("") + '</tbody></table></div>' : '') +
      ssCrumbs(state.company ? "All divisions" : "All companies", ssDesk.exPath);

    if (level !== "records") {
      html += '<section class="cc-panel"><h3>' + levelLabel + ' breakdown</h3><div class="cc-caption">Blank values are grouped as Unassigned so totals reconcile. Click to drill down.</div>' +
        (groups.length ? ssBars(groups, cur, 'data-ex-group') : '<div class="cc-empty">No expired quotations for this selection.</div>') +
        '</section>' + (groups.length ? '<div class="cc-records"><table class="cc-table"><thead><tr><th>' + levelLabel +
        '</th><th class="cc-number">Quotations</th><th class="cc-number">Approved drafts</th><th class="cc-number">Partially ordered</th>' +
        '<th class="cc-number">Full net value</th></tr></thead><tbody>' + groups.map(function (g, i) {
          return '<tr><td><button type="button" class="cc-button" data-ex-group="' + i + '">' + esc(g.label) +
            '</button></td><td class="cc-number">' + number(g.count).toLocaleString("en-US") + '</td><td class="cc-number">' +
            number(g.approved_draft_count).toLocaleString("en-US") + '</td><td class="cc-number">' +
            number(g.partially_ordered_count).toLocaleString("en-US") + '</td><td class="cc-number">' +
            esc(money(g.amount, cur)) + '</td></tr>';
        }).join("") + '</tbody><tfoot><tr><th>Total</th><th class="cc-number">' + number(s.count).toLocaleString("en-US") +
        '</th><th></th><th></th><th class="cc-number">' + esc(money(s.amount, cur)) + '</th></tr></tfoot></table></div>' : '');
    } else {
      var rows = data.records || [];
      html += '<div class="cc-records"><table class="cc-table"><thead><tr><th>Quotation</th><th>Customer</th><th>Issue date</th>' +
        '<th>Valid until</th><th class="cc-number">Days expired</th><th>Workflow state</th><th>Document status</th><th>Division</th>' +
        '<th>Location</th><th>Salesperson</th><th>Created By</th><th class="cc-number">Full net value</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r) {
          var tag = r.category === "approved_draft" ? ' <span class="cc-badge">Approved, not submitted</span>'
            : r.category === "partially_ordered" ? ' <span class="cc-badge warn">Partially ordered</span>' : '';
          return '<tr><td><a href="/app/quotation/' + encodeURIComponent(r.name) + '" target="_blank" rel="noopener">' +
            esc(r.name) + '</a></td><td>' + esc(r.customer || '') + '</td><td>' + esc(r.date) + '</td><td>' +
            esc(r.valid_till) + '</td><td class="cc-number">' + number(r.days_expired) + '</td><td>' +
            esc(r.workflow_state || '—') + tag + '</td><td>' + esc(ssDocStatus(r.docstatus)) + (r.status ? ' · ' + esc(r.status) : '') +
            '</td><td>' + esc(r.division || 'Unassigned') + '</td><td>' + esc(r.location || 'Unassigned') + '</td><td>' +
            esc(r.salesperson || 'Unassigned') + '</td><td>' + esc(r.created_by || '') + '</td><td class="cc-number">' +
            esc(money(r.amount, cur)) + '</td></tr>';
        }).join("") : '<tr><td colspan="12"><div class="cc-empty">No expired quotations for this selection.</div></td></tr>') +
        '</tbody><tfoot><tr><th colspan="11">All matching expired quotations: ' + number(s.count).toLocaleString("en-US") +
        '</th><th class="cc-number">' + esc(money(s.amount, cur)) + '</th></tr></tfoot></table></div>' +
        ssPager(ssDesk.exPage, data.record_page_size || 50, number(s.count));
    }
    return html;
  }

  function ssNotes(shell, html) {
    shell.querySelector(".cc-ss-notes").innerHTML =
      '<details class="cc-rules"><summary>Definitions and data notes</summary><div class="cc-note">' + html + '</div></details>';
  }

  // ---- data loading
  function loadSupportDesk(id, range) {
    var key = [state.company, range.from, range.to].join("|");
    if (key !== ssDesk.scopeKey) {
      ssDesk.scopeKey = key;
      ssDesk.path = [];
      ssDesk.page = 0;
    }
    if (ssDesk.exCompany !== state.company) {
      ssDesk.exCompany = state.company;
      ssDesk.exPath = [];
      ssDesk.exPage = 0;
    }
    var shell = ssShell(range);
    var detail = shell.querySelector(".cc-ss-detail");
    var cardsBox = shell.querySelector(".cc-ss-cards");
    content.style.minHeight = "";
    content.removeAttribute("aria-busy");
    detail.style.minHeight = Math.ceil(detail.getBoundingClientRect().height) + "px";
    detail.setAttribute("aria-busy", "true");
    detail.innerHTML = '<div class="cc-empty"><strong>Loading ' + esc(ssTabInfo(ssDesk.tab).label) + '…</strong>' +
      '<span>Reading quotations with your record permissions.</span></div>';
    badge.textContent = "Loading Sales Support";

    function done() {
      detail.style.minHeight = "";
      detail.removeAttribute("aria-busy");
      badge.textContent = "Sales and Sales Support connected · Updated " +
        new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    function fail(message) {
      if (id !== requestId) return;
      detail.innerHTML = '<div class="cc-error">' + esc(message) + ' Check the ERP error message and API permissions. ' +
        'No partial results are displayed.</div>';
      detail.style.minHeight = "";
      detail.removeAttribute("aria-busy");
      badge.textContent = "Sales Support connection error";
    }

    // Cards always show the top-level period totals (cached per company and period).
    var cached = ssDesk.cards[key];
    if (cached) cardsBox.innerHTML = ssCardsMarkup(cached);
    else cardsBox.innerHTML = '<div class="cc-caption">Loading quotation cards…</div>';
    var needTop = !cached || ssDesk.tab === "overview" || (ssDesk.tab === "all" && !ssDesk.path.length);

    if (needTop) {
      frappe.call({
        method: "ceo_command_center_sales_support",
        args: { from_date: range.from, to_date: range.to, company: state.company, level: "status", status_key: "", created_by: "", record_page: 0 },
        callback: function (r) {
          if (id !== requestId) return;
          if (r.exc || !r.message || !r.message.summary) {
            cardsBox.innerHTML = '<div class="cc-error">Quotation cards could not be loaded.</div>';
            if (ssDesk.tab === "overview" || ssDesk.tab === "all") fail("Quotation data could not be loaded.");
            return;
          }
          ssDesk.cards[key] = r.message;
          cardsBox.innerHTML = ssCardsMarkup(r.message);
          if (ssDesk.tab === "overview") {
            detail.innerHTML = ssOverview(r.message); done();
          } else if (ssDesk.tab === "all" && !ssDesk.path.length) {
            detail.innerHTML = ssDrill(r.message); done();
          }
          ssNotes(shell, 'Quotation date (transaction date) decides the period for every tab except Expired Quotations. ' +
            'Values are net quotation values in company currency. Created By is the document owner. ' +
            'Approved drafts stay “Approved, not submitted” until submitted. Workflow state is interpreted together with ' +
            'document status; inconsistent combinations remain visible. Enquiry SLA performance is not shown because the ' +
            'enquiry timer is not connected. Totals respect your ERP record permissions.');
        },
        error: function () {
          if (id !== requestId) return;
          cardsBox.innerHTML = '<div class="cc-error">Quotation cards could not be loaded.</div>';
          if (ssDesk.tab === "overview" || ssDesk.tab === "all") fail("Quotation data could not be loaded.");
        }
      });
    }
    if (ssDesk.tab === "overview" || (ssDesk.tab === "all" && !ssDesk.path.length)) return;

    if (ssDesk.tab === "expired") {
      var lv = exLevels();
      frappe.call({
        method: "ceo_command_center_sales_support",
        args: {
          view: "expired", scope: ssDesk.exScope, company: state.company || exKey("company"),
          division: exKey("division"), location: exKey("location"), salesperson: exKey("salesperson"),
          level: lv[ssDesk.exPath.length], record_page: ssDesk.exPage
        },
        callback: function (r) {
          if (id !== requestId) return;
          if (r.exc || !r.message || r.message.view !== "expired") { fail("Expired quotations could not be loaded."); return; }
          ssDesk.exData = r.message;
          detail.innerHTML = exMarkup(r.message);
          done();
        },
        error: function () { fail("Expired quotations could not be loaded."); }
      });
      return;
    }

    frappe.call({
      method: "ceo_command_center_sales_support",
      args: ssArgs(range),
      callback: function (r) {
        if (id !== requestId) return;
        if (r.exc || !r.message || !r.message.summary) { fail("Quotation data could not be loaded."); return; }
        ssDesk.data = r.message;
        detail.innerHTML = ssDrill(r.message);
        done();
      },
      error: function () { fail("Quotation data could not be loaded."); }
    });
  }

  function ssClick(event) {
    var b = event.target.closest("button");
    if (!b || b.disabled) return;
    var t = ssTabInfo(ssDesk.tab);
    if (b.hasAttribute("data-ss-tab")) {
      ssDesk.tab = b.getAttribute("data-ss-tab");
      ssDesk.path = []; ssDesk.page = 0; ssDesk.exPath = []; ssDesk.exPage = 0;
    } else if (b.hasAttribute("data-ss-card")) {
      var k = b.getAttribute("data-ss-card");
      ssDesk.tab = k === "draft_review" ? "queue" : k === "draft_approved" ? "approved" : "all";
      ssDesk.path = [];
      if (ssDesk.tab === "all") {
        var lab = ((ssDesk.cards[ssDesk.scopeKey] || {}).cards || []).filter(function (c) { return c.key === k; })[0];
        ssDesk.path = [{ key: k, label: lab ? lab.label : k }];
      }
      ssDesk.page = 0;
    } else if (b.hasAttribute("data-ss-status")) {
      var g = ((ssDesk.cards[ssDesk.scopeKey] || {}).status_groups || [])[Number(b.getAttribute("data-ss-status"))];
      if (!g) return;
      ssDesk.tab = "all"; ssDesk.path = [{ key: g.key, label: g.label }]; ssDesk.page = 0;
    } else if (b.hasAttribute("data-ss-group")) {
      var src = ssDesk.tab === "all" && !ssDesk.path.length ? (ssDesk.cards[ssDesk.scopeKey] || {}) : (ssDesk.data || {});
      var level = ssLevels()[ssDesk.path.length];
      var list = level === "status" ? (src.status_groups || []) : (src.creator_groups || []);
      var grp = list[Number(b.getAttribute("data-ss-group"))];
      if (!grp) return;
      ssDesk.path = ssDesk.path.concat([{ key: grp.key, label: grp.label }]); ssDesk.page = 0;
    } else if (b.hasAttribute("data-ss-depth")) {
      var depth = Number(b.getAttribute("data-ss-depth"));
      if (ssDesk.tab === "expired") { ssDesk.exPath = ssDesk.exPath.slice(0, depth); ssDesk.exPage = 0; }
      else { ssDesk.path = ssDesk.path.slice(0, depth); ssDesk.page = 0; }
    } else if (b.hasAttribute("data-ss-page")) {
      if (ssDesk.tab === "expired") ssDesk.exPage = Math.max(0, ssDesk.exPage + Number(b.getAttribute("data-ss-page")));
      else ssDesk.page = Math.max(0, ssDesk.page + Number(b.getAttribute("data-ss-page")));
    } else if (b.hasAttribute("data-ex-scope")) {
      ssDesk.exScope = b.getAttribute("data-ex-scope"); ssDesk.exPath = []; ssDesk.exPage = 0;
    } else if (b.hasAttribute("data-ex-group")) {
      var eg = ((ssDesk.exData || {}).groups || [])[Number(b.getAttribute("data-ex-group"))];
      if (!eg) return;
      ssDesk.exPath = ssDesk.exPath.concat([{ key: eg.key, label: eg.label }]); ssDesk.exPage = 0;
    } else {
      return;
    }
    render();
  }

  // ---------------------------------------------------------------------------
  // Item Department breakdown beside the Location breakdown (Sales Breakdown).
  // Data: ceo_command_center_sales view="department" (line-level, same filters).
  var deptState = { key: "", path: [], page: 0, seq: 0, data: null };

  function deptScopeKey(data) {
    return [state.company, bdMeasure(), state.backlog === "sales_order" ? (state.soLocation || "") : "", data.current.from_date, data.current.to_date,
      salesPathKey("company"), salesPathKey("location"), salesPathKey("salesperson")].join("|");
  }

  function deptQty(list) {
    return (list || []).map(function (u) {
      return number(u.qty).toLocaleString("en-US", { maximumFractionDigits: 3 }) + ' ' + esc(u.uom || '');
    }).join('<br>');
  }

  // Display-only short names for Item Departments (keys and requests keep the original name).
  var DEPT_SHORT = { "Building Materials": "BMD", "Scaffolding": "SCF", "Commercial Steel": "CS", "Commercial Products": "CP", "Architectural Material Division": "AMD", "Industrial Supply & Tools": "ISD", "Packaging Material Division": "PMD", "Safety": "Safety" };
  function deptShort(label) { return Object.prototype.hasOwnProperty.call(DEPT_SHORT, label) ? DEPT_SHORT[label] : label; }

  function deptCrumbs() {
    return '<div class="cc-breadcrumbs"><button type="button" class="cc-button" data-dept-depth="0">All departments</button>' +
      deptState.path.map(function (p, i) {
        return '<span>›</span><button type="button" class="cc-button" data-dept-depth="' + (i + 1) + '"' + (i === 0 ? ' title="' + esc(p.label) + '"' : '') + '>' + esc(i === 0 ? deptShort(p.label) : p.label) + '</button>';
      }).join("") + '</div>';
  }

  function deptPanelMarkup(r) {
    var cur = r.currency;
    var level = r.level;
    var rec = Math.abs(number(r.difference)) < 0.01;
    var head = '<h3>Item Department' + (level === "department" ? ' breakdown' : '') + '</h3>' +
      '<div class="cc-caption">Net line value excl. tax · same company, period and Location drill-down · ' +
      'line total ' + esc(money(r.line_total, cur)) + (rec ? ' = Sales total (reconciled)' :
        ' vs Sales total ' + esc(money(r.header_total, cur)) + ' <strong>(difference ' + esc(money(r.difference, cur)) + ')</strong>') +
      '</div>' + deptCrumbs();
    if (level === "department") {
      var groups = r.departments || [];
      var max = Math.max.apply(null, groups.map(function (g) { return Math.abs(number(g.amount)); }).concat([1]));
      return head + (groups.length ? groups.map(function (g, i) {
        return '<button type="button" class="cc-bar" data-dept-group="' + i + '" title="' + esc(g.label) + '"><span>' + esc(deptShort(g.label)) +
          ' <small>(' + number(g.docs).toLocaleString("en-US") + ' docs)</small></span><span class="cc-track"><span class="cc-fill' +
          (g.amount < 0 ? ' negative' : '') + '" style="width:' + (Math.abs(number(g.amount)) / max * 100) +
          '%"></span></span><span class="cc-number">' + esc(money(g.amount, cur)) + '</span></button>';
      }).join("") : '<div class="cc-empty">No submitted transaction lines.</div>');
    }
    var d = r.selected_department || { label: deptState.path[0] ? deptState.path[0].label : '', amount: 0, docs: 0 };
    if (level === "salesperson") {
      var sps = r.salespersons || [];
      var ti = r.target_info || {};
      var dash = '<span class="cc-caption">—</span>';
      return head + '<div class="cc-caption"><strong title="' + esc(d.label) + '">' + esc(deptShort(d.label)) + '</strong> · ' + esc(money(d.amount, cur)) + ' · ' +
        sps.length + ' salespeople · target basis: ' + esc(ti.basis || '') + '</div>' +
        '<div class="cc-records"><table class="cc-table cc-dept-sp"><thead><tr><th>Salesperson</th><th class="cc-number">Target</th>' +
        '<th class="cc-number">Actual (' + esc(ti.basis || '') + ')</th><th class="cc-number">Achievement</th>' +
        '<th class="cc-number">Remaining to target</th><th class="cc-number">Above target</th></tr></thead><tbody>' +
        (sps.length ? sps.map(function (s, i) {
          var t = s.target, tc, ac = dash, rc = dash, oc = dash;
          if (t === null || t === undefined || s.target_status === "not_set") {
            tc = '<span class="cc-caption">Target not set</span>';
          } else if (number(t) <= 0) {
            tc = esc(money(t, cur));
            ac = '<span class="cc-caption">No positive target</span>';
          } else {
            tc = esc(money(t, cur));
            ac = (number(s.amount) / number(t) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%';
            rc = number(s.amount) < number(t) ? esc(money(number(t) - number(s.amount), cur)) : esc(money(0, cur));
            oc = number(s.amount) >= number(t) ? esc(money(number(s.amount) - number(t), cur)) : dash;
          }
          return '<tr><td><button type="button" class="cc-button" data-dept-sp="' + i + '">' + esc(s.label) +
            '</button><div class="cc-caption">' + number(s.docs).toLocaleString("en-US") + ' docs</div></td><td class="cc-number">' + tc +
            '</td><td class="cc-number">' + esc(money(s.amount, cur)) + '</td><td class="cc-number">' + ac + '</td><td class="cc-number">' +
            rc + '</td><td class="cc-number">' + oc + '</td></tr>';
        }).join("") : '<tr><td colspan="6"><div class="cc-empty">No salespeople.</div></td></tr>') +
        '</tbody><tfoot><tr><th>Total</th><th class="cc-number">' + dash + '</th><th class="cc-number">' + esc(money(d.amount, cur)) +
        '</th><th colspan="3"></th></tr></tfoot></table></div>';
    }
    if (level === "item") {
      var items = r.items || [];
      var spSel = r.selected_salesperson || { label: deptState.path[1] ? deptState.path[1].label : '', amount: 0, docs: 0 };
      d = { label: deptShort(d.label) + ' › ' + spSel.label, amount: spSel.amount, docs: spSel.docs };
      return head + '<div class="cc-caption"><strong>' + esc(d.label) + '</strong> · ' + esc(money(d.amount, cur)) + ' · ' +
        number(d.docs).toLocaleString("en-US") + ' documents · ' + items.length + ' items</div>' +
        '<div class="cc-records"><table class="cc-table"><thead><tr><th>Item</th><th class="cc-number">Qty (stock UOM)</th>' +
        '<th class="cc-number">Docs</th><th class="cc-number">Net value</th></tr></thead><tbody>' +
        (items.length ? items.map(function (it, i) {
          return '<tr><td><button type="button" class="cc-button" data-dept-item="' + i + '">' + esc(it.item_code) +
            '</button><div class="cc-caption">' + esc(it.item_name || '') + '</div></td><td class="cc-number">' + deptQty(it.qty_by_uom) +
            '</td><td class="cc-number">' + number(it.docs).toLocaleString("en-US") + '</td><td class="cc-number">' +
            esc(money(it.amount, cur)) + '</td></tr>';
        }).join("") : '<tr><td colspan="4"><div class="cc-empty">No items.</div></td></tr>') +
        '</tbody><tfoot><tr><th>Total</th><th></th><th class="cc-number">' + number(d.docs).toLocaleString("en-US") +
        '</th><th class="cc-number">' + esc(money(d.amount, cur)) + '</th></tr></tfoot></table></div>';
    }
    return head + '<div class="cc-empty"><strong>' + number((r.record_total || {}).count).toLocaleString("en-US") +
      ' transaction lines</strong><span>' + esc(money((r.record_total || {}).amount, cur)) + ' · listed below</span></div>';
  }

  function deptRecordsMarkup(r) {
    if (r.level !== "records") return "";
    var cur = r.currency;
    var total = number((r.record_total || {}).count);
    var size = r.record_page_size || 50;
    var pages = Math.max(1, Math.ceil(total / size));
    var first = total ? r.record_page * size + 1 : 0;
    var last = Math.min(total, (r.record_page + 1) * size);
    var route = r.doctype === "Sales Invoice" ? "sales-invoice" : "sales-order";
    return '<section class="cc-panel cc-records"><h3>Transaction lines · ' + esc(deptState.path[2] ? deptState.path[2].label : '') + ' · ' + esc(deptState.path[1] ? deptState.path[1].label : '') +
      ' · ' + esc(deptState.path[0] ? deptShort(deptState.path[0].label) : '') + '</h3><div class="cc-caption">Showing ' + first + '–' + last +
      ' of ' + total.toLocaleString("en-US") + ' lines · quantities in the line UOM · returns are negative</div>' +
      '<table class="cc-table"><thead><tr><th>Document</th><th>Date</th><th>Customer</th><th>Item</th><th class="cc-number">Qty</th>' +
      '<th>UOM</th><th>Location</th><th>Salesperson</th><th class="cc-number">Net line value</th></tr></thead><tbody>' +
      (r.records || []).map(function (x) {
        return '<tr><td><a href="/app/' + route + '/' + encodeURIComponent(x.doc) + '" target="_blank" rel="noopener">' + esc(x.doc) +
          '</a>' + (x.is_return ? ' <small>Return</small>' : '') + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.customer || '') +
          '</td><td>' + esc(x.item_code) + '<div class="cc-caption">' + esc(x.item_name || '') + '</div></td><td class="cc-number">' +
          number(x.qty).toLocaleString("en-US", { maximumFractionDigits: 3 }) + '</td><td>' + esc(x.uom || '') + '</td><td>' +
          esc(x.location || 'Unassigned') + '</td><td>' + esc(x.salesperson || 'Unassigned') + '</td><td class="cc-number">' +
          esc(money(x.amount, cur)) + '</td></tr>';
      }).join("") + '</tbody><tfoot><tr><th colspan="8">All matching lines: ' + total.toLocaleString("en-US") +
      '</th><th class="cc-number">' + esc(money((r.record_total || {}).amount, cur)) + '</th></tr></tfoot></table>' +
      '<div class="cc-pager"><button type="button" class="cc-button" data-dept-page="-1"' + (r.record_page === 0 ? ' disabled' : '') +
      '>Previous</button><span>Page ' + (r.record_page + 1) + ' of ' + pages + '</span><button type="button" class="cc-button" data-dept-page="1"' +
      (r.record_page + 1 >= pages ? ' disabled' : '') + '>Next</button></div></section>';
  }

  function deptNote(r) {
    return '<div class="cc-caption cc-dept-note">' + (r.level !== "department" && r.target_info ?
      '<strong>Targets: not set.</strong> ' + esc(r.target_info.message) + ' Targets will be read only when defined per Company, Salesperson, Item Department and period (' +
      esc(r.target_info.basis) + ' basis); no allocation or proration is applied. ' +
      'Salesperson = ' + esc(r.salesperson_source) + '; the Sales Order tab splits by the Sales Team table instead, so per-person figures can differ there. ' : '') +
      'Department source: ' + esc(r.department_source) + '. ' +
      (r.measure === "booked"
        ? 'Sales Order lines do not store a department, so historical orders reflect the current Item classification. '
        : (number(r.fallback_lines) ? number(r.fallback_lines) + ' invoice lines without a saved department use the Item\'s current department (' +
          esc(money(r.fallback_value, r.currency)) + '). ' : '')) +
      'Missing classifications appear as “Unassigned Item Department”. Document counts cannot be added across departments because one document can contain several departments.</div>';
  }

  function loadDeptPanel(detail, data) {
    var panel = detail.querySelector("[data-dept-panel]");
    var recBox = detail.querySelector("[data-dept-records]");
    if (!panel) return;
    var key = deptScopeKey(data);
    if (key !== deptState.key) { deptState.key = key; deptState.path = []; deptState.page = 0; }
    var my = ++deptState.seq;
    var outer = requestId;
    panel.style.minHeight = Math.ceil(panel.getBoundingClientRect().height) + "px";
    panel.setAttribute("aria-busy", "true");
    if (!panel.innerHTML) panel.innerHTML = '<div class="cc-empty">Loading Item Department…</div>';
    frappe.call({
      method: "ceo_command_center_sales",
      args: {
        view: "department", period: state.period, measure: bdMeasure(), sp_location: state.backlog === "sales_order" ? (state.soLocation || "") : "",
        from_date: data.current.from_date, to_date: data.current.to_date,
        company: state.company || salesPathKey("company"), division: "",
        location: salesPathKey("location"), salesperson: salesPathKey("salesperson"),
        dept_level: ["department", "salesperson", "item", "records"][deptState.path.length],
        department: deptState.path[0] ? deptState.path[0].key : "",
        dept_salesperson: deptState.path[1] ? deptState.path[1].key : "",
        item: deptState.path[2] ? deptState.path[2].key : "",
        record_page: deptState.page
      },
      callback: function (resp) {
        if (my !== deptState.seq || outer !== requestId || !panel.isConnected) return;
        panel.removeAttribute("aria-busy");
        panel.style.minHeight = "";
        if (resp.exc || !resp.message || resp.message.view !== "department") {
          panel.innerHTML = '<h3>Item Department</h3><div class="cc-error">Item Department breakdown could not be loaded. No partial totals are displayed.</div>';
          if (recBox) recBox.innerHTML = "";
          return;
        }
        var r = resp.message;
        deptState.data = r;
        panel.innerHTML = deptPanelMarkup(r) + deptNote(r);
        if (recBox) recBox.innerHTML = deptRecordsMarkup(r);
        function rerun() { loadDeptPanel(detail, data); }
        detail.querySelectorAll("[data-dept-group]").forEach(function (b) {
          b.onclick = function () { var g = r.departments[Number(b.dataset.deptGroup)]; deptState.path = [{ key: g.key, label: g.label }]; deptState.page = 0; rerun(); };
        });
        detail.querySelectorAll("[data-dept-sp]").forEach(function (b) {
          b.onclick = function () { var s = r.salespersons[Number(b.dataset.deptSp)]; deptState.path = deptState.path.slice(0, 1).concat([{ key: s.key, label: s.label }]); deptState.page = 0; rerun(); };
        });
        detail.querySelectorAll("[data-dept-item]").forEach(function (b) {
          b.onclick = function () { var it = r.items[Number(b.dataset.deptItem)]; deptState.path = deptState.path.slice(0, 2).concat([{ key: it.key, label: it.item_code }]); deptState.page = 0; rerun(); };
        });
        detail.querySelectorAll("[data-dept-depth]").forEach(function (b) {
          b.onclick = function () { deptState.path = deptState.path.slice(0, Number(b.dataset.deptDepth)); deptState.page = 0; rerun(); };
        });
        detail.querySelectorAll("[data-dept-page]").forEach(function (b) {
          b.onclick = function () { deptState.page = Math.max(0, deptState.page + Number(b.dataset.deptPage)); rerun(); };
        });
      },
      error: function () {
        if (my !== deptState.seq || outer !== requestId || !panel.isConnected) return;
        panel.removeAttribute("aria-busy");
        panel.style.minHeight = "";
        panel.innerHTML = '<h3>Item Department</h3><div class="cc-error">Item Department breakdown could not be loaded. No partial totals are displayed.</div>';
      }
    });
  }

// ---------------------------------------------------------------------------
  // Procurement (Phase 1): summary cards + Overview + Purchase Order explorer.
  // Data: ceo_command_center_procurement (read-only, ERP permissions apply).
  var procState = { view: "overview", measure: "placed", path: [], page: 0, location: "", key: "", summary: null, summaryKey: "" };
  var PROC_UN = "~unassigned~";
  var PROC_MEASURES = [
    ["placed", "Orders Placed", "Selected period"],
    ["receipt", "Awaiting Receipt", "Current backlog · All dates"],
    ["overdue", "Overdue Receipt", "Current backlog · All dates"],
    ["billing", "Awaiting Billing", "Current backlog · All dates"]
  ];
  var PROC_LEVEL_LABEL = { company: "Company", purchaser: "Purchaser", supplier: "Supplier", orders: "Orders", items: "Items" };

  function procLevels() {
    var l = ["company", "purchaser", "supplier", "orders", "items"];
    return state.company ? l.slice(1) : l;
  }
  function procPathKey(level) {
    for (var i = 0; i < procState.path.length; i++) if (procState.path[i].level === level) return procState.path[i].key;
    return "";
  }
  function procQty(v) { return number(v).toLocaleString("en-US", { maximumFractionDigits: 3 }); }
  function procPct(v) { return number(v).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "%"; }
  function procMeasureMeta(m) { for (var i = 0; i < PROC_MEASURES.length; i++) if (PROC_MEASURES[i][0] === m) return PROC_MEASURES[i]; return PROC_MEASURES[0]; }
  function procLink(name) { return '<a href="/app/purchase-order/' + encodeURIComponent(name) + '" target="_blank" rel="noopener noreferrer">' + esc(name) + '</a>'; }
  function procScope(text) { return '<span class="cc-proc-scope">' + esc(text) + '</span>'; }
  function procCard(label, scope, value, note, extra) {
    return '<div class="cc-kpi"><div class="cc-kpi-label">' + esc(label) + '</div>' + procScope(scope) +
      '<div class="cc-kpi-value">' + value + '</div><div class="cc-kpi-note">' + note + '</div>' + (extra || '') + '</div>';
  }

  function procCardsMarkup(s) {
    var c = s.cards, cur = s.currency;
    return '<div class="cc-kpis cc-proc-cards">' +
      procCard("Purchase Orders Placed", "Selected period", number(c.placed.count).toLocaleString("en-US"),
        esc(money(c.placed.amount, cur)) + ' · net, excl. tax') +
      procCard("Orders Awaiting Receipt", "Current backlog · All dates", number(c.receipt.orders).toLocaleString("en-US"),
        esc(money(c.receipt.amount, cur)) + ' remaining to receive · ' + number(c.receipt.lines).toLocaleString("en-US") + ' lines',
        '<div class="cc-kpi-note">On Hold: ' + number(c.receipt.hold_orders) + ' orders · ' + esc(money(c.receipt.hold_amount, cur)) + ' (included)</div>') +
      procCard("Overdue Receipt Lines", "Current backlog · All dates", number(c.overdue.lines).toLocaleString("en-US"),
        number(c.overdue.orders).toLocaleString("en-US") + ' orders · ' + esc(money(c.overdue.amount, cur)) + ' remaining',
        '<div class="cc-kpi-note">Required date missing: ' + number(c.missing_required.lines) + ' lines (not counted as overdue)</div>') +
      procCard("Orders Awaiting Billing", "Current backlog · All dates", number(c.billing.orders).toLocaleString("en-US"),
        esc(money(c.billing.amount, cur)) + ' remaining to bill',
        '<div class="cc-kpi-note">On Hold: ' + number(c.billing.hold_orders) + ' orders · ' + esc(money(c.billing.hold_amount, cur)) + ' (included)</div>') +
      '</div><div class="cc-caption cc-proc-overlap">Receipt and billing backlogs overlap (an order can await both) and cannot be added together. ' +
      'Remaining values are company-currency net amounts excluding taxes, calculated per line.</div>';
  }

  function procNav() {
    return '<nav class="cc-views cc-proc-tabs" aria-label="Procurement views">' +
      [["overview", "Overview"], ["orders", "Purchase Orders"]].map(function (v) {
        return '<button type="button" class="cc-view' + (procState.view === v[0] ? ' active' : '') + '" data-proc-view="' + v[0] + '"><span>' + v[1] + '</span></button>';
      }).join("") + '</nav>';
  }

  function procBars(rows, cur, limit) {
    var list = rows.slice(0, limit);
    var rest = rows.slice(limit);
    if (rest.length) {
      list.push({ label: "Other suppliers (" + rest.length + ")", count: rest.reduce(function (a, r) { return a + number(r.count); }, 0),
        amount: rest.reduce(function (a, r) { return a + number(r.amount); }, 0) });
    }
    var max = Math.max.apply(null, list.map(function (r) { return Math.abs(number(r.amount)); }).concat([1]));
    return list.length ? list.map(function (r) {
      return '<div class="cc-bar"><span>' + esc(r.label) + ' <small>(' + number(r.count) + ' orders)</small></span><span class="cc-track"><span class="cc-fill" style="width:' +
        (Math.abs(number(r.amount)) / max * 100) + '%"></span></span><span class="cc-number">' + esc(money(r.amount, cur)) + '</span></div>';
    }).join("") : '<div class="cc-empty">No purchase orders placed in this period.</div>';
  }

  function procOverviewMarkup(s) {
    var cur = s.currency, q = s.quality || {}, c = s.cards;
    var pur = s.purchasers || [];
    var notices = [];
    if (q.placed_missing_location) notices.push(q.placed_missing_location + ' order(s) placed in the period have no Delivery Location (shown as Unassigned).');
    if (q.placed_missing_incharge) notices.push(q.placed_missing_incharge + ' order(s) placed in the period have no PO In charge.');
    if (q.backlog_missing_required) notices.push(q.backlog_missing_required + ' backlog line(s) have no Required Date and are not counted as overdue.');
    if (q.backlog_returned_lines) notices.push(q.backlog_returned_lines + ' backlog line(s) include returned quantities; as in ERPNext, returned quantity is receivable again.');
    if (q.zero_amount_lines) notices.push(q.zero_amount_lines + ' open line(s) have a zero amount; they carry no remaining value.');
    if (q.legacy_workflow_states) notices.push(q.legacy_workflow_states + ' submitted open order(s) still carry a legacy workflow state (' + esc((q.legacy_workflow_examples || []).join(', ')) + '); no Purchase Order workflow is active, so ERP status is used.');
    notices.push('Purchaser Name, PO In charge and Created By are separate fields and are reported separately.');
    notices.push('Non-stock (service) lines are included in receipt figures because ERPNext includes them in % Received.');
    var fu = s.follow_up || [];
    return '<div class="cc-grid"><section class="cc-panel"><h3>Purchasing trend</h3><div class="cc-caption">Orders placed · net value · ' +
      esc(s.from_date) + ' to ' + esc(s.to_date) + '</div>' +
      trendMarkup({ current: { trend: s.trend || [], from_date: s.from_date, to_date: s.to_date } }, cur) + '</section>' +
      '<section class="cc-panel"><h3>Order value by supplier</h3><div class="cc-caption">Orders placed in the selected period · top 8</div>' +
      procBars(s.suppliers || [], cur, 8) + '</section></div>' +
      '<div class="cc-grid"><section class="cc-panel"><h3>Orders by purchaser</h3><div class="cc-caption">Purchaser Name on the order · selected period</div>' +
      '<div class="cc-records"><table class="cc-table"><thead><tr><th>Purchaser</th><th class="cc-number">Orders</th><th class="cc-number">Net value</th></tr></thead><tbody>' +
      (pur.length ? pur.map(function (p) { return '<tr><td>' + esc(p.label) + '</td><td class="cc-number">' + number(p.count) + '</td><td class="cc-number">' + esc(money(p.amount, cur)) + '</td></tr>'; }).join("")
        : '<tr><td colspan="3"><div class="cc-caption">No orders placed.</div></td></tr>') +
      '</tbody><tfoot><tr><th>Total</th><th class="cc-number">' + number(c.placed.count) + '</th><th class="cc-number">' + esc(money(c.placed.amount, cur)) + '</th></tr></tfoot></table></div></section>' +
      '<section class="cc-panel"><h3>On Hold</h3><div class="cc-caption">Current backlog · ERP status On Hold</div>' +
      '<table class="cc-table"><tbody><tr><td>Awaiting receipt</td><td class="cc-number">' + number(c.receipt.hold_orders) + ' orders</td><td class="cc-number">' + esc(money(c.receipt.hold_amount, cur)) + '</td></tr>' +
      '<tr><td>Awaiting billing</td><td class="cc-number">' + number(c.billing.hold_orders) + ' orders</td><td class="cc-number">' + esc(money(c.billing.hold_amount, cur)) + '</td></tr></tbody></table>' +
      (number(c.receipt.hold_orders) + number(c.billing.hold_orders) ? '' : '<div class="cc-caption">No backlog orders are currently On Hold.</div>') +
      '<h3 class="cc-proc-dq-title">Data quality</h3><ul class="cc-proc-dq">' + notices.map(function (n) { return '<li>' + n + '</li>'; }).join("") + '</ul></section></div>' +
      '<section class="cc-panel cc-records"><h3>Overdue receipt follow-up</h3><div class="cc-caption">Current backlog · Required Date before ' + esc(s.today) +
      ' (due today is not overdue) · oldest first · showing ' + fu.length + ' of ' + number(s.follow_up_total).toLocaleString("en-US") + ' lines</div>' +
      '<div class="cc-proc-scroll"><table class="cc-table"><thead><tr><th>Order</th><th>Supplier</th><th>Purchaser</th><th>Item</th><th>Required</th><th class="cc-number">Days overdue</th>' +
      '<th class="cc-number">Remaining qty</th><th>UOM</th><th class="cc-number">Remaining value</th></tr></thead><tbody>' +
      (fu.length ? fu.map(function (r) {
        return '<tr><td>' + procLink(r.order) + '</td><td>' + esc(r.supplier) + '</td><td>' + esc(r.purchaser || 'Unassigned') + '</td><td>' + esc(r.item) +
          '<div class="cc-caption">' + esc(r.item_name || '') + '</div></td><td>' + esc(r.required) + '</td><td class="cc-number">' + number(r.days) +
          '</td><td class="cc-number">' + procQty(r.remaining_qty) + '</td><td>' + esc(r.uom || '') + '</td><td class="cc-number">' + esc(money(r.amount, cur)) + '</td></tr>';
      }).join("") : '<tr><td colspan="9"><div class="cc-caption">No overdue receipt lines.</div></td></tr>') +
      '</tbody></table></div>' + (number(s.follow_up_total) > fu.length ? '<div class="cc-caption">Open Purchase Orders → Overdue Receipt for every line, with pagination.</div>' : '') +
      '</section>';
  }

  function procExplorerControls(s) {
    var locs = (s && s.locations) || [];
    return '<div class="cc-proc-controls"><div class="cc-seg" role="group" aria-label="Purchase order measure">' +
      PROC_MEASURES.map(function (m) {
        return '<button type="button" class="cc-button' + (procState.measure === m[0] ? ' cc-on' : '') + '" data-proc-measure="' + m[0] + '" aria-pressed="' + (procState.measure === m[0]) + '">' + m[1] + '</button>';
      }).join("") + '</div><label class="cc-proc-loc">Delivery Location<select data-proc-location><option value="">All delivery locations</option>' +
      locs.map(function (l) { return '<option value="' + esc(l) + '"' + (procState.location === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join("") +
      '<option value="' + PROC_UN + '"' + (procState.location === PROC_UN ? ' selected' : '') + '>Unassigned</option></select></label></div>';
  }

  function procCrumbs() {
    return '<div class="cc-breadcrumbs"><button type="button" class="cc-button" data-proc-depth="0">' + (state.company ? 'All purchasers' : 'All companies') + '</button>' +
      procState.path.map(function (p, i) {
        return '<span>›</span><button type="button" class="cc-button" data-proc-depth="' + (i + 1) + '">' + esc(p.label) + '</button>';
      }).join("") + '</div>';
  }

  function procPager(d) {
    var total = number(d.total.count), size = d.page_size || 50;
    var pages = Math.max(1, Math.ceil(total / size));
    if (pages <= 1) return '';
    return '<div class="cc-pager"><button type="button" class="cc-button" data-proc-page="-1"' + (d.page === 0 ? ' disabled' : '') + '>Previous</button><span>' +
      (d.page * size + 1) + '–' + Math.min(total, (d.page + 1) * size) + ' of ' + total.toLocaleString("en-US") + '</span><button type="button" class="cc-button" data-proc-page="1"' +
      (d.page + 1 >= pages ? ' disabled' : '') + '>Next</button></div>';
  }

  function procExplorerMarkup(d) {
    var cur = d.currency, meta = procMeasureMeta(d.measure), level = d.level;
    var valLabel = d.measure === "placed" ? "Net order value" : (d.measure === "billing" ? "Remaining to bill" : "Remaining to receive");
    var head = '<div class="cc-caption cc-proc-meta">' + procScope(meta[2]) + ' ' + esc(meta[1]) +
      (d.measure === "placed" ? ' · issued ' + esc(d.from_date) + ' to ' + esc(d.to_date) : ' · submitted orders, excluding Closed and Cancelled') +
      (procState.location ? ' · Delivery Location: ' + esc(procState.location === PROC_UN ? 'Unassigned' : procState.location) : '') +
      ' · total ' + number(d.total.count).toLocaleString("en-US") + (level === "items" ? ' lines' : ' orders') +
      (d.measure !== "placed" && level !== "items" ? ' / ' + number(d.total.lines).toLocaleString("en-US") + ' lines' : '') +
      ' · ' + esc(money(d.total.amount, cur)) + '</div>';
    if (level !== "orders" && level !== "items") {
      var g = d.groups || [];
      var max = Math.max.apply(null, g.map(function (x) { return Math.abs(number(x.amount)); }).concat([1]));
      return head + '<section class="cc-panel"><h3>' + PROC_LEVEL_LABEL[level] + ' · ' + esc(valLabel) + '</h3><div class="cc-caption">Click a row to drill down.</div>' +
        (g.length ? g.map(function (x, i) {
          return '<button type="button" class="cc-bar" data-proc-group="' + i + '"><span>' + esc(x.label) + ' <small>(' + number(x.count) + ' orders' +
            (x.lines ? ' · ' + number(x.lines) + ' lines' : '') + ')</small></span><span class="cc-track"><span class="cc-fill" style="width:' +
            (Math.abs(number(x.amount)) / max * 100) + '%"></span></span><span class="cc-number">' + esc(money(x.amount, cur)) + '</span></button>';
        }).join("") : '<div class="cc-empty">No purchase orders match this view.</div>') +
        '<div class="cc-proc-total"><span>Total</span><span class="cc-number">' + number(d.total.count).toLocaleString("en-US") + ' orders · ' + esc(money(d.total.amount, cur)) + '</span></div></section>';
    }
    if (level === "orders") {
      var recs = d.records || [];
      return head + '<section class="cc-panel cc-records"><h3>Purchase orders</h3><div class="cc-proc-scroll"><table class="cc-table"><thead><tr><th>Order</th><th>Supplier</th><th>Purchaser</th><th>PO In charge</th>' +
        '<th>Issued</th><th>Delivery Location</th><th>Status</th><th class="cc-number">Net order value</th><th class="cc-number">' + esc(d.measure === "placed" ? "Remaining" : valLabel) +
        '</th><th class="cc-number">% Received</th><th class="cc-number">% Billed</th></tr></thead><tbody>' +
        (recs.length ? recs.map(function (r, i) {
          return '<tr><td class="cc-proc-order">' + procLink(r.order) + '<button type="button" class="cc-button" data-proc-order="' + i + '" aria-label="Items of ' + esc(r.order) + '">Items \u203a</button></td><td>' + esc(r.supplier) +
            '</td><td>' + esc(r.purchaser || 'Unassigned') + '</td><td>' + esc(r.incharge || 'Unassigned') + '</td><td>' + esc(r.date) + '</td><td>' + esc(r.location || 'Unassigned') +
            '</td><td>' + esc(r.status) + '</td><td class="cc-number">' + esc(money(r.total, cur)) + '</td><td class="cc-number">' +
            (d.measure === "placed" ? '<span class="cc-caption">n/a</span>' : esc(money(r.amount, cur))) + '</td><td class="cc-number">' + procPct(r.per_received) +
            '</td><td class="cc-number">' + procPct(r.per_billed) + '</td></tr>';
        }).join("") : '<tr><td colspan="11"><div class="cc-empty">No purchase orders match this view.</div></td></tr>') +
        '</tbody><tfoot><tr><th colspan="7">All matching orders: ' + number(d.total.count).toLocaleString("en-US") + '</th><th class="cc-number">' +
        (d.measure === "placed" ? esc(money(d.total.amount, cur)) : '') + '</th><th class="cc-number">' + (d.measure === "placed" ? '' : esc(money(d.total.amount, cur))) +
        '</th><th></th><th></th></tr></tfoot></table></div>' + procPager(d) + '</section>';
    }
    var items = d.records || [];
    return head + '<section class="cc-panel cc-records"><h3>Items · ' + esc(procPathKey("order")) + ' ' + procLink(procPathKey("order")) + '</h3>' +
      '<div class="cc-caption">Quantities are in each line’s UOM and are never added across UOMs.</div><div class="cc-proc-scroll"><table class="cc-table"><thead><tr><th>Item</th><th>Required</th>' +
      '<th class="cc-number">Ordered</th><th class="cc-number">Received</th><th class="cc-number">Remaining</th><th>UOM</th><th class="cc-number">' +
      esc(d.measure === "placed" ? "Line net value" : valLabel) + '</th></tr></thead><tbody>' +
      (items.length ? items.map(function (r) {
        return '<tr' + (r.overdue ? ' class="cc-flag"' : '') + '><td>' + esc(r.item) + '<div class="cc-caption">' + esc(r.item_name || '') + '</div></td><td>' + esc(r.required || 'Missing') +
          (r.overdue ? ' <small>Overdue</small>' : '') + '</td><td class="cc-number">' + procQty(r.qty) + '</td><td class="cc-number">' + procQty(r.received) +
          '</td><td class="cc-number">' + procQty(r.remaining_qty) + '</td><td>' + esc(r.uom || '') + '</td><td class="cc-number">' + esc(money(r.amount, cur)) + '</td></tr>';
      }).join("") : '<tr><td colspan="7"><div class="cc-empty">No lines match this view.</div></td></tr>') +
      '</tbody><tfoot><tr><th colspan="6">All matching lines: ' + number(d.total.count) + '</th><th class="cc-number">' + esc(money(d.total.amount, cur)) + '</th></tr></tfoot></table></div>' +
      procPager(d) + '</section>';
  }

  function loadProcurement(id, range) {
    var key = [state.company, range.from, range.to].join("|");
    // Internal navigation reuses the summary; Apply filters / department switches refresh it.
    if (!procState.internal) procState.summaryKey = "";
    procState.internal = false;
    if (key !== procState.key) { procState.key = key; procState.path = []; procState.page = 0; }
    var still = function () { return id === requestId && state.department === "Procurement"; };
    var body = content.querySelector(".cc-proc-body");
    if (body && content.querySelector(".cc-proc-cards") && procState.summaryKey === key) {
      content.querySelector(".cc-proc-tabs").outerHTML = procNav();
      body.style.minHeight = Math.ceil(body.getBoundingClientRect().height) + "px";
      body.innerHTML = '<div class="cc-empty">Loading Procurement…</div>';
    } else {
      content.innerHTML = '<div class="cc-section-heading"><div><h3>Procurement overview</h3><div class="cc-caption">' + esc(companyLabel()) + ' · ' +
        esc(range.from) + ' to ' + esc(range.to) + '</div></div></div><div class="cc-proc-cards-slot"><div class="cc-empty">Loading Procurement…</div></div>' +
        procNav() + '<div class="cc-proc-body"></div>';
    }
    badge.textContent = "Loading Procurement";
    function done() {
      content.style.minHeight = "";
      content.removeAttribute("aria-busy");
      var b = content.querySelector(".cc-proc-body");
      if (b) b.style.minHeight = "";
      badge.textContent = "Procurement connected · Record permissions applied";
    }
    function fail(r) {
      if (!still()) return;
      var perm = r && /Permission/i.test(String(r.exc_type || r.exc || ""));
      var msg = perm ? 'Your ERP permissions do not allow reading Purchase Orders, so no Procurement figures are displayed.'
        : 'Procurement data could not be loaded. Check the ERP error message and API permissions. No partial totals are displayed.';
      var slot = content.querySelector(".cc-proc-cards-slot");
      if (slot) slot.innerHTML = '';
      var b = content.querySelector(".cc-proc-body");
      if (b) b.innerHTML = '<div class="cc-error">' + msg + '</div>';
      done();
    }
    function withSummary(next) {
      if (procState.summary && procState.summaryKey === key) { next(procState.summary); return; }
      frappe.call({
        method: "ceo_command_center_procurement",
        args: { view: "summary", company: state.company, from_date: range.from, to_date: range.to },
        callback: function (r) {
          if (!still()) return;
          if (r.exc || !r.message) { fail(r); return; }
          if (r.message.currency_conflict) {
            content.querySelector(".cc-proc-cards-slot").innerHTML = '<div class="cc-error">' + esc(r.message.message) + '</div>';
            content.querySelector(".cc-proc-body").innerHTML = '';
            done();
            return;
          }
          procState.summary = r.message;
          procState.summaryKey = key;
          next(r.message);
        },
        error: function (r) { fail(r); }
      });
    }
    withSummary(function (s) {
      if (!still()) return;
      var slot = content.querySelector(".cc-proc-cards-slot");
      if (slot && !slot.querySelector(".cc-proc-cards")) slot.innerHTML = procCardsMarkup(s);
      var bodyEl = content.querySelector(".cc-proc-body");
      if (procState.view === "overview") {
        bodyEl.innerHTML = procOverviewMarkup(s);
        done();
        procBind(s);
        return;
      }
      var levels = procLevels();
      var args = { view: "explorer", measure: procState.measure, level: levels[procState.path.length], company: state.company || procPathKey("company"),
        from_date: range.from, to_date: range.to, location: procState.location, purchaser: procPathKey("purchaser"),
        supplier: procPathKey("supplier"), order: procPathKey("order"), page: procState.page };
      if (!state.company && procPathKey("company")) args.company = procPathKey("company");
      frappe.call({
        method: "ceo_command_center_procurement",
        args: args,
        callback: function (r) {
          if (!still()) return;
          if (r.exc || !r.message) { fail(r); return; }
          if (r.message.currency_conflict) { bodyEl.innerHTML = '<div class="cc-error">' + esc(r.message.message) + '</div>'; done(); return; }
          procState.data = r.message;
          bodyEl.innerHTML = procExplorerControls(s) + procCrumbs() + procExplorerMarkup(r.message);
          done();
          procBind(s);
        },
        error: function (r) { fail(r); }
      });
    });
  }

  function procBind(s) {
    content.querySelectorAll("[data-proc-view]").forEach(function (b) {
      b.onclick = function () { if (procState.view === b.dataset.procView) return; procState.view = b.dataset.procView; procState.page = 0; procState.internal = true; render(); };
    });
    content.querySelectorAll("[data-proc-measure]").forEach(function (b) {
      b.onclick = function () { procState.measure = b.dataset.procMeasure; procState.path = []; procState.page = 0; procState.internal = true; render(); };
    });
    content.querySelectorAll("[data-proc-location]").forEach(function (sel) {
      sel.onchange = function () { procState.location = sel.value; procState.path = []; procState.page = 0; procState.internal = true; render(); };
    });
    content.querySelectorAll("[data-proc-depth]").forEach(function (b) {
      b.onclick = function () { procState.path = procState.path.slice(0, Number(b.dataset.procDepth)); procState.page = 0; procState.internal = true; render(); };
    });
    content.querySelectorAll("[data-proc-page]").forEach(function (b) {
      b.onclick = function () { procState.page = Math.max(0, procState.page + Number(b.dataset.procPage)); procState.internal = true; render(); };
    });
    var d = procState.data;
    content.querySelectorAll("[data-proc-group]").forEach(function (b) {
      b.onclick = function () { var g = d.groups[Number(b.dataset.procGroup)]; procState.path.push({ level: d.level, key: g.key, label: g.label }); procState.page = 0; procState.internal = true; render(); };
    });
    content.querySelectorAll("[data-proc-order]").forEach(function (b) {
      b.onclick = function () { var o = d.records[Number(b.dataset.procOrder)]; procState.path.push({ level: "order", key: o.order, label: o.order }); procState.page = 0; procState.internal = true; render(); };
    });
  }

  function render() {
    // Ignore stale responses after filters or department changes.
    var id = ++requestId;
    var range = dateRange();

    content.style.minHeight = content.getBoundingClientRect().height + "px";
    content.setAttribute("aria-busy", "true");
    renderTabs();
    // Manufacturing and Delivery & Forklift use their own date filters.
    host.querySelector('.cc-filters').hidden =
      state.department === 'Manufacturing' || state.department === 'Delivery & Forklift';
    leaveEmbeds(state.department);
    if (EMBEDS[state.department]) { mountEmbed(state.department, range); return; }

    if (isFinanceDept()) { finEnsureView(); loadFinance(id, range); return; }

    if (state.department === "Sales Support") {
      loadSupportDesk(id, range);
      return;
    }

    if (state.department === "Procurement") {
      loadProcurement(id, range);
      return;
    }

    if (state.department !== "Sales") {
      renderPending(range);
      return;
    }

    renderSalesArea(id, range);
  }

  // Start and end dates are always shown. A preset fills them for the
  // period containing the end date; editing a date switches to Custom.
  function updateDateFields() {
    host.querySelectorAll("[data-custom-date]").forEach(function (label) {
      label.hidden = false;
    });

    host.querySelector('[data-filter="reference"]').parentElement.hidden = true;
  }

  function presetRange(period, reference) {
    var saved = { period: state.period, reference: state.reference };
    state.period = period;
    state.reference = reference;
    var result = dateRange();
    state.period = saved.period;
    state.reference = saved.reference;
    return result;
  }

  host.querySelector('[data-filter="reference"]').value =
    state.reference;

  (function () {
    var initial = dateRange();
    host.querySelector('[data-filter="from"]').value = initial.from;
    host.querySelector('[data-filter="to"]').value = initial.to;
  })();

  host.querySelector('[data-filter="period"]').addEventListener(
    "change",
    function () {
      var period = host.querySelector('[data-filter="period"]').value;
      if (period !== "Custom") {
        var r = presetRange(
          period,
          host.querySelector('[data-filter="to"]').value ||
            frappe.datetime.get_today()
        );
        host.querySelector('[data-filter="from"]').value = r.from;
        host.querySelector('[data-filter="to"]').value = r.to;
      }
      updateDateFields();
    }
  );

  ["from", "to"].forEach(function (name) {
    host.querySelector('[data-filter="' + name + '"]').addEventListener(
      "change",
      function () {
        host.querySelector('[data-filter="period"]').value = "Custom";
      }
    );
  });

  host.addEventListener("click", function (event) {
    var button = event.target.closest("button");

    if (!button || !host.contains(button) || button.disabled) return;

    if (button.hasAttribute("data-sales-view")) {
      state.backlog = button.getAttribute("data-sales-view");
      state.path = [];
      state.page = 0;
      render();
      return;
    }

    if (button.dataset.department) {
      if (button.dataset.department !== state.department) {
        tabDates[state.department] = {
          period: state.period, reference: state.reference,
          from: state.from, to: state.to
        };
        state.department = button.dataset.department;
        Object.assign(state, tabDates[state.department] || {
          period: "Monthly", reference: frappe.datetime.get_today(),
          from: "", to: ""
        });
        syncDateFields();
      }
      state.backlog = "";
      state.path = [];
      state.page = 0;
      render();
      return;
    }

    if (button.dataset.measure) {
      state.measure = button.dataset.measure;
      state.path = [];
      state.page = 0;
      render();
      return;
    }

    if (button.hasAttribute("data-depth")) {
      state.path = state.path.slice(
        0,
        Number(button.dataset.depth)
      );

      state.page = 0;
      render();
      return;
    }

    if (button.dataset.page) {
      state.page = Math.max(
        0,
        state.page +
        (button.dataset.page === "next" ? 1 : -1)
      );

      render();
      return;
    }

    if (button.dataset.action === "apply") {
      var candidate = {};

      host.querySelectorAll("[data-filter]").forEach(function (field) {
        candidate[field.dataset.filter] = field.value;
      });

      // Presets use the end date as their reference date.
      if (candidate.period !== "Custom") {
        candidate.reference = candidate.to || candidate.from || candidate.reference;
      }

      if (candidate.period !== "Custom" && !candidate.reference) {
        frappe.msgprint("Please select a reference date.");
        return;
      }

      if (candidate.period === "Custom") {
        if (!candidate.from ||
            !candidate.to ||
            candidate.from > candidate.to) {
          frappe.msgprint("Please select valid From and To dates.");
          return;
        }

        var days =
          (parseDate(candidate.to) - parseDate(candidate.from)) /
          86400000 + 1;

        if (days > 366) {
          frappe.msgprint("Select a date range of 366 days or less.");
          return;
        }
      }

      Object.assign(state, candidate);
      state.path = [];
      state.page = 0;
      // Apply always reads fresh figures.
      salesCache.summary = {};
      invFresh = true;
      loadViewCounts(true);
      render();
    }
  });

  updateDateFields();

  // Default company on every fresh load: Durar Masagh Trading Company when the user can access it,
  // otherwise the first company the user is permitted to see. Data is requested only after this.
  var DEFAULT_COMPANY = "Durar Masagh Trading Company";
  var companiesLoaded = false;
  function startWithCompanies(list) {
    if (companiesLoaded) return;
    companiesLoaded = true;
    var names = [];
    list.forEach(function (company) {
      var option = document.createElement("option");
      option.value = company.name;
      option.textContent = company.name;
      companySelect.appendChild(option);
      names.push(company.name);
    });
    if (names.indexOf(DEFAULT_COMPANY) !== -1) state.company = DEFAULT_COMPANY;
    else if (names.length) state.company = names[0];
    else state.company = "";
    companySelect.value = state.company;
    render();
  }

  renderTabs();
  content.innerHTML = '<div class="cc-empty"><strong>Loading permitted companies…</strong></div>';

  // Load only companies accessible to the logged-in user.
  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Company",
      fields: ["name"],
      order_by: "name asc",
      limit_page_length: 500
    },
    callback: function (response) {
      startWithCompanies(response.exc ? [] : (response.message || []));
    },
    error: function () {
      startWithCompanies([]);
    }
  });
})();