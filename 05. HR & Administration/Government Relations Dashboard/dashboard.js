/* ------------------------------------------------------------------
   Govt Relation Dashboard - LIVE data (read-only).
   Sources:  DM Companies Management, DM Facilities Management (EJAR contracts + licences), Prepaid Expense.
   Read with frappe.client.get_list under the logged-in user's permissions. 10 s timeout per request.
   A source the user cannot read is reported on the page; stale data is never substituted.
------------------------------------------------------------------- */
window.GOV_DATA = {
  meta: { source: "DM ERPNext (live)", retrievedAt: null, note: "Loading live data from ERPNext…", warn: false },
  settings: {
    expiringSoonDays: 60,
    currency: "SAR",
    erpBaseUrl: ""   // "" = same site (use inside ERP). Standalone: e.g. "https://erp.yourcompany.com"
  },
  entities: [],     /* DM Companies Management */
  facilities: [],   /* DM Facilities Management (rent agreements = EJAR contracts) */
  prepaid: []       /* Prepaid Expense */
};

function __govMain() {
  "use strict";
  var D = window.GOV_DATA, S = D.settings;
  var DAY = 86400000;
  var COLORS = { ok: "#1e9e5a", warn: "#e8a317", danger: "#d93f3f", info: "#2b7de9", muted: "#9aa6b6" };
  var PALETTE = ["#2b7de9", "#7b5cd6", "#12a5a5", "#e8a317", "#d9568f", "#6b8e23", "#e2712b", "#5a6b7d"];

  var ROOT = (typeof root_element !== "undefined") ? root_element : document;
  var HOSTEL = ROOT.querySelector("#gov-root") || document.documentElement;
  function $(id) { return ROOT.querySelector("#" + id); }

  /* ---------- helpers ---------- */
  var TODAY = (function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  function pd(s) { return s ? new Date(s + "T00:00:00") : null; }
  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }
  function daysTo(d) { return d ? Math.round((d - TODAY) / DAY) : null; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fmtDate(d) { return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
  function money(n) { return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " " + S.currency; }
  function compact(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(Math.round(n)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function cls(st) { return st === "Expired" ? "danger" : st === "Expiring Soon" ? "warn" : st === "Valid" ? "ok" : "muted"; }
  function badge(st) { return '<span class="badge b-' + cls(st) + '">' + esc(st) + "</span>"; }
  function daysText(x) { return x.days == null ? "—" : x.days < 0 ? Math.abs(x.days) + " days overdue" : x.days === 0 ? "Today" : x.days + " days"; }
  function cssVar(n) { return getComputedStyle(HOSTEL).getPropertyValue(n).trim(); }
  function dayPill(x) { return counted(x) ? '<span class="dp dp-' + cls(x.status) + '">' + daysText(x) + "</span>" : "—"; }
  function counted(x) { return x.status === "Valid" || x.status === "Expiring Soon" || x.status === "Expired"; }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.add("hidden"); }, 2600);
  }

  /* ---------- ERP links ---------- */
  var FAC = "DM Facilities Management", COM = "DM Companies Management";
  var SRC = {
    ejar:     { dt: FAC, field: "rentdate_to", extra: { facility_contract_status: "Active" }, label: "Rent agreements – Agreement Date To" },
    licExp:   { dt: FAC, field: "com_lic_exp", extra: { facility_contract_status: "Active" }, label: "Commercial Licence Expiry" },
    cdExp:    { dt: FAC, field: "cd_date_to", extra: { facility_contract_status: "Active" }, label: "Civil Defense – Date To" },
    naExp:    { dt: FAC, field: "national_adress_expiry", extra: { facility_contract_status: "Active" }, label: "National Address Expiry (facilities)" },
    indExp:   { dt: FAC, field: "industrial_expiry", extra: { facility_contract_status: "Active" }, label: "Industrial License Expiry" },
    envConExp:{ dt: FAC, field: "construction_environmental_permit_expiry", extra: { facility_contract_status: "Active" }, label: "Construction Environmental Permit Expiry" },
    envOpExp: { dt: FAC, field: "operational_environmental_permit_expiry", extra: { facility_contract_status: "Active" }, label: "Operational Environmental Permit Expiry" },
    fireExp:  { dt: FAC, field: "fire_expiry", extra: { facility_contract_status: "Active" }, label: "Fire Maintenance Expiry" },
    camExp:   { dt: FAC, field: "camera_expiry", extra: { facility_contract_status: "Active" }, label: "Camera Maintenance Expiry" },
    cleanExp: { dt: FAC, field: "cleanig_exp_date", extra: { facility_contract_status: "Active" }, label: "Cleaning Contract Expiry" },
    cr:       { dt: COM, field: "cr_expiry", extra: { cr_cancelled: 0 }, label: "CR Expiry (active CRs)" },
    misa:     { dt: COM, field: "misa_expiry", extra: { cr_cancelled: 0 }, label: "MISA Expiry" }
  };
  var GOV_SRCS = ["ejar", "licExp", "cdExp", "naExp", "indExp", "envConExp", "envOpExp", "cr", "misa"];
  var LIC_SRCS = ["licExp", "cdExp", "naExp", "indExp", "envConExp", "envOpExp", "fireExp", "camExp", "cleanExp"];

  function slug(dt) { return dt.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
  function base() { return String(S.erpBaseUrl || "").replace(/\/$/, ""); }
  function docUrl(dt, name) { return base() + "/app/" + slug(dt) + "/" + encodeURIComponent(name); }
  function listUrl(dt, f) {
    var q = Object.keys(f).map(function (k) {
      var v = f[k]; return encodeURIComponent(k) + "=" + encodeURIComponent(typeof v === "object" ? JSON.stringify(v) : v);
    }).join("&");
    return base() + "/app/" + slug(dt) + (q ? "?" + q : "");
  }
  function erpLink(dt, name) { return dt && name ? '<a class="erp" target="_blank" rel="noopener" href="' + esc(docUrl(dt, name)) + '">Open ↗</a>' : ""; }
  function go(url) { window.open(url, "_blank", "noopener"); }

  /* ---------- date range ---------- */
  var state = { tab: "overview", q: "", sort: {}, page: {}, psize: {}, range: { from: null, to: null, preset: "all" } };
  function inRange(x) {
    var r = state.range;
    if (!r.from && !r.to) return true;
    if (!x.expiry) return false;
    if (r.from && x.expiry < r.from) return false;
    if (r.to && x.expiry > r.to) return false;
    return true;
  }
  function setPreset(p) {
    var r = state.range, t = TODAY, y = t.getFullYear(), m = t.getMonth();
    r.preset = p; r.from = null; r.to = null;
    if (p === "overdue") r.to = addDays(t, -1);
    else if (p === "n30") { r.from = t; r.to = addDays(t, 30); }
    else if (p === "n60") { r.from = t; r.to = addDays(t, 60); }
    else if (p === "n90") { r.from = t; r.to = addDays(t, 90); }
    else if (p === "month") { r.from = new Date(y, m, 1); r.to = new Date(y, m + 1, 0); }
    else if (p === "quarter") { var q = Math.floor(m / 3) * 3; r.from = new Date(y, q, 1); r.to = new Date(y, q + 3, 0); }
    else if (p === "year") { r.from = new Date(y, 0, 1); r.to = new Date(y, 11, 31); }
    $("rFrom").value = r.from ? iso(r.from) : ""; $("rTo").value = r.to ? iso(r.to) : "";
    state.page = {}; render();
  }

  /* ---------- items from ERP data ---------- */
  var ITEMS = { ejar: [], lic: [], cr: [], misa: [] }, VIS = { ejar: [], lic: [], cr: [], misa: [] };
  function item(o) { o.expiry = pd(o.expiryStr); o.days = daysTo(o.expiry); return o; }
  var LIC_FIELDS = [
    ["licExp", "Commercial Licence", "Government", "licNo"], ["cdExp", "Civil Defense Certificate", "Government", "cdNo"],
    ["naExp", "National Address", "Government", null], ["indExp", "Industrial License", "Government", null],
    ["envConExp", "Construction Env. Permit", "Government", null], ["envOpExp", "Operational Env. Permit", "Government", null],
    ["fireExp", "Fire Maintenance Contract", "Service Contract", null], ["camExp", "Camera Maintenance Contract", "Service Contract", null],
    ["cleanExp", "Cleaning Contract", "Service Contract", null]
  ];
  D.facilities.forEach(function (f) {
    var active = f.status === "Active";
    ITEMS.ejar.push(item({ category: "EJAR", src: "ejar", dt: FAC, doc: f.id, entity: f.name, company: f.company || "—", name: f.detail + " • " + f.ftype,
      detail: f.detail, ftype: f.ftype, ref: f.contract || "—", expiryStr: f.to, fromStr: f.from, rent: f.rent, auto: f.auto || "—", fstatus: f.status, active: active, loc: f.loc }));
    if (!active) return;
    LIC_FIELDS.forEach(function (lf) {
      if (!f[lf[0]]) return;
      ITEMS.lic.push(item({ category: "License", src: lf[0], dt: FAC, doc: f.id, group: lf[2], entity: f.name, company: f.company || "—", name: lf[1],
        ref: (lf[3] && f[lf[3]]) || "—", authority: (lf[0] === "licExp" || lf[0] === "naExp") ? (f.muni || "") : "", expiryStr: f[lf[0]] }));
    });
  });
  D.entities.forEach(function (e) {
    // Cancelled Commercial Registrations are excluded from the CR dashboard.
    if (!e.canc) ITEMS.cr.push(item({ category: "CR", src: "cr", dt: COM, doc: e.id || e.n, entity: e.n, name: e.type, loc: e.loc, ref: e.cr, uni: e.uni, chamber: e.ch, expiryStr: e.crExp }));
    if (e.misa) ITEMS.misa.push(item({ category: "MISA", src: "misa", dt: COM, doc: e.id || e.n, entity: e.n, name: e.type, ref: e.misa, expiryStr: e.misaExp, cancelled: e.canc, cancDate: e.cancDate, loc: e.loc }));
  });

  function refresh() {
    var w = S.expiringSoonDays;
    ["ejar", "lic", "cr", "misa"].forEach(function (k) {
      ITEMS[k].forEach(function (x) {
        x.status = x.cancelled ? "Cancelled" : (x.category === "EJAR" && !x.active) ? x.fstatus : x.days == null ? "No Date" : x.days < 0 ? "Expired" : x.days <= w ? "Expiring Soon" : "Valid";
      });
      VIS[k] = ITEMS[k].filter(inRange);
    });
  }
  function allCounted() {
    return VIS.ejar.filter(function (x) { return x.active; }).concat(VIS.lic.filter(function (x) { return x.group === "Government"; }), VIS.cr, VIS.misa).filter(counted);
  }
  function allVis() { return VIS.ejar.concat(VIS.lic, VIS.cr, VIS.misa); }

  /* ---------- KPI -> ERP drill-through ---------- */
  function statusRange(status) {
    var w = S.expiringSoonDays, lo = null, hi = null, r = state.range;
    if (status === "Expired") hi = addDays(TODAY, -1);
    else if (status === "Expiring Soon") { lo = TODAY; hi = addDays(TODAY, w); }
    else if (status === "Valid") lo = addDays(TODAY, w + 1);
    if (r.from && (!lo || r.from > lo)) lo = r.from;
    if (r.to && (!hi || r.to < hi)) hi = r.to;
    if (lo && hi && lo > hi) return null;
    return { lo: lo, hi: hi };
  }
  function srcUrl(src, status) {
    var s = SRC[src], rg = statusRange(status);
    if (!rg) return null;
    var f = {}, k;
    for (k in s.extra) f[k] = s.extra[k];
    f[s.field] = rg.lo && rg.hi ? ["Between", [iso(rg.lo), iso(rg.hi)]] : rg.hi ? ["<=", iso(rg.hi)] : rg.lo ? [">=", iso(rg.lo)] : ["is", "set"];
    return listUrl(s.dt, f);
  }
  function openTargets(title, srcs, status) {
    var vis = allVis(), targets = [];
    srcs.forEach(function (k) {
      var n = vis.filter(function (x) { return x.src === k && (status === "all" ? counted(x) : x.status === status); }).length;
      var u = n ? srcUrl(k, status) : null;
      if (u) targets.push({ label: SRC[k].label, count: n, url: u });
    });
    if (!targets.length) { toast("No matching records to open in ERP."); return; }
    if (targets.length === 1) { go(targets[0].url); return; }
    $("mTitle").textContent = title + " — open in ERP";
    $("mBody").innerHTML = '<div class="note">These records live in different ERP lists. Pick one to open:</div>' + targets.map(function (t) {
      return '<div class="mrow"><div>' + esc(t.label) + '<span class="sm">' + esc(slug(SRC[Object.keys(SRC).filter(function (k) { return SRC[k].label === t.label; })[0]].dt)) + '</span></div><div><span class="cnt">' + t.count +
        '</span> &nbsp;<a class="erp" target="_blank" rel="noopener" href="' + esc(t.url) + '">Open list ↗</a></div></div>';
    }).join("");
    $("modal").classList.remove("hidden");
  }

  /* ---------- canvas charts ---------- */
  var HITS = {}, PN = {};
  PN[COLORS.danger] = "Expired"; PN[COLORS.warn] = "Expiring soon"; PN[COLORS.ok] = "Valid";
  function hit(id, o) { (HITS[id] = HITS[id] || []).push(o); }
  function tipFor(id, x, y) {
    var a = HITS[id] || [];
    for (var i = 0; i < a.length; i++) {
      var q = a[i];
      if (q.arc) {
        var dx = x - q.cx, dy = y - q.cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d >= q.r0 && d <= q.r1) { var ang = Math.atan2(dy, dx); if (ang < -Math.PI / 2) ang += 2 * Math.PI; if (ang >= q.a0 && ang < q.a1) return q.text; }
      } else if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) return q.text;
    }
    return null;
  }
  function prep(id) {
    HITS[id] = [];
    var canvas = $(id), r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    var c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, r.width, r.height);
    return { c: c, w: r.width, h: r.height };
  }
  function noData(p) { p.c.fillStyle = cssVar("--muted"); p.c.textAlign = "center"; p.c.font = "13px Segoe UI, Arial"; p.c.fillText("No data", p.w / 2, p.h / 2); }
  function doughnut(id, items, centerLabel, centerText) {
    var p = prep(id), c = p.c, total = items.reduce(function (a, b) { return a + b.value; }, 0);
    var cx = p.w / 2, cy = p.h / 2, R = Math.min(p.w, p.h) / 2 - 8, r = R * 0.62, a = -Math.PI / 2;
    if (!total) { noData(p); return; }
    items.forEach(function (it) {
      if (!it.value) return;
      var s = it.value / total * Math.PI * 2;
      c.beginPath(); c.arc(cx, cy, R, a, a + s); c.arc(cx, cy, r, a + s, a, true); c.closePath();
      c.fillStyle = it.color; c.fill();
      hit(id, { arc: 1, cx: cx, cy: cy, r0: r, r1: R, a0: a, a1: a + s, text: "<b>" + esc(it.label) + "</b><br>" + it.value + " (" + Math.round(it.value / total * 100) + "%)" }); a += s;
    });
    c.fillStyle = cssVar("--ink"); c.textAlign = "center"; c.font = "700 24px Segoe UI, Arial";
    c.fillText(centerText != null ? centerText : total, cx, cy + 4);
    c.fillStyle = cssVar("--muted"); c.font = "12px Segoe UI, Arial"; c.fillText(centerLabel || "total", cx, cy + 22);
  }
  function legend(id, items, fmt) {
    $(id).innerHTML = items.filter(function (i) { return i.value; }).map(function (i) {
      return '<span><i style="background:' + i.color + '"></i>' + esc(i.label) + " (" + (fmt ? fmt(i.value) : i.value) + ")</span>";
    }).join("");
  }
  function statusLegend(id) {
    $(id).innerHTML = '<span><i style="background:' + COLORS.danger + '"></i>Expired</span><span><i style="background:' + COLORS.warn + '"></i>Expiring soon</span><span><i style="background:' + COLORS.ok + '"></i>Valid</span>';
  }
  function vbars(id, labels, series) {
    var p = prep(id), c = p.c, padL = 30, padB = 28, padT = 10, W = p.w - padL - 6, H = p.h - padB - padT;
    var n = labels.length, max = 1, tot = 0;
    for (var i = 0; i < n; i++) { var t = 0; series.forEach(function (s) { t += s.values[i]; }); tot += t; if (t > max) max = t; }
    if (!tot) { noData(p); return; }
    c.font = "11px Segoe UI, Arial"; c.strokeStyle = cssVar("--line"); c.fillStyle = cssVar("--muted"); c.textAlign = "right";
    var step = max > 8 ? Math.ceil(max / 5) : 1;
    for (var g = 0; g <= max; g += step) {
      var y = padT + H - g / max * H;
      c.beginPath(); c.moveTo(padL, y); c.lineTo(padL + W, y); c.stroke(); c.fillText(g, padL - 6, y + 3);
    }
    var bw = Math.min(34, W / n * 0.6);
    for (var j = 0; j < n; j++) {
      var x = padL + W / n * j + (W / n - bw) / 2, base = padT + H;
      var tp = series.filter(function (s) { return s.values[j]; }).map(function (s) { return '<span style="color:' + s.color + '">●</span> ' + (s.name || "") + ": <b>" + s.values[j] + "</b>"; });
      if (tp.length) hit(id, { x: padL + W / n * j, y: padT, w: W / n, h: H, text: "<b>" + esc(labels[j]) + "</b><br>" + tp.join("<br>") });
      series.forEach(function (s) {
        var h = s.values[j] / max * H;
        c.fillStyle = s.color; c.fillRect(x, base - h, bw, h); base -= h;
      });
      c.fillStyle = cssVar("--muted"); c.textAlign = "center"; c.fillText(labels[j], x + bw / 2, p.h - 10);
    }
  }
  function hbars(id, rows, fmt, labW) {
    var p = prep(id), c = p.c; labW = labW || 190;
    var pad = 8, n = rows.length || 1, rowH = Math.min(30, (p.h - pad * 2) / n);
    if (!rows.length) { noData(p); return; }
    var vals = rows.map(function (r) { return r.value; });
    var min = Math.min(0, Math.min.apply(null, vals)), max = Math.max(1, Math.max.apply(null, vals));
    var span = max - min, W = p.w - labW - 80, zero = labW + (0 - min) / span * W, maxChars = Math.floor(labW / 6.4);
    c.font = "12px Segoe UI, Arial";
    rows.forEach(function (r, i) {
      var y = pad + i * rowH, bh = rowH * 0.58, x0 = labW + (Math.min(0, r.value) - min) / span * W, w = Math.abs(r.value) / span * W;
      c.fillStyle = cssVar("--ink"); c.textAlign = "right";
      c.fillText(r.label.length > maxChars ? r.label.slice(0, maxChars - 1) + "…" : r.label, labW - 8, y + bh / 2 + 4);
      c.fillStyle = r.color; c.fillRect(x0, y, Math.max(w, 2), bh);
      hit(id, { x: 0, y: y - 2, w: p.w, h: rowH, text: "<b>" + esc(r.label) + "</b><br>" + (fmt ? fmt(r.value) : r.value) });
      c.fillStyle = cssVar("--muted"); c.textAlign = "left";
      c.fillText(fmt ? fmt(r.value) : r.value, Math.max(x0 + w, zero) + 6, y + bh / 2 + 4);
    });
    c.strokeStyle = cssVar("--line"); c.beginPath(); c.moveTo(zero, 0); c.lineTo(zero, p.h); c.stroke();
  }
  function stackedH(id, rows, labW) { // rows: [{label, parts:[{value,color}]}]
    var p = prep(id), c = p.c; labW = labW || 130;
    var pad = 8, n = rows.length || 1, rowH = Math.min(30, (p.h - pad * 2) / n);
    if (!rows.length) { noData(p); return; }
    var max = Math.max.apply(null, rows.map(function (r) { return r.parts.reduce(function (a, b) { return a + b.value; }, 0); }).concat([1]));
    var W = p.w - labW - 40, maxChars = Math.floor(labW / 6.4);
    c.font = "12px Segoe UI, Arial";
    rows.forEach(function (r, i) {
      var y = pad + i * rowH, bh = rowH * 0.6, x = labW, tot = 0;
      c.fillStyle = cssVar("--ink"); c.textAlign = "right";
      c.fillText(r.label.length > maxChars ? r.label.slice(0, maxChars - 1) + "…" : r.label, labW - 8, y + bh / 2 + 4);
      r.parts.forEach(function (s) { var w = s.value / max * W; c.fillStyle = s.color; c.fillRect(x, y, w, bh); x += w; tot += s.value; });
      hit(id, { x: 0, y: y - 2, w: p.w, h: rowH, text: "<b>" + esc(r.label) + "</b><br>" + r.parts.filter(function (s) { return s.value; }).map(function (s) { return '<span style="color:' + s.color + '">●</span> ' + (PN[s.color] || "") + ": <b>" + s.value + "</b>"; }).join("<br>") });
      c.fillStyle = cssVar("--muted"); c.textAlign = "left"; c.fillText(tot, x + 6, y + bh / 2 + 4);
    });
  }
  function lineChart(id, labels, values, color) {
    var p = prep(id), c = p.c, padL = 30, padB = 26, padT = 12, W = p.w - padL - 10, H = p.h - padB - padT;
    var max = Math.max.apply(null, values.concat([1]));
    if (!values.some(function (v) { return v > 0; })) { noData(p); return; }
    c.font = "11px Segoe UI, Arial"; c.strokeStyle = cssVar("--line"); c.fillStyle = cssVar("--muted"); c.textAlign = "right";
    var step = max > 8 ? Math.ceil(max / 5) : 1;
    for (var g = 0; g <= max; g += step) { var y = padT + H - g / max * H; c.beginPath(); c.moveTo(padL, y); c.lineTo(padL + W, y); c.stroke(); c.fillText(g, padL - 5, y + 3); }
    var n = values.length, pts = values.map(function (v, i) { return [padL + (n === 1 ? W / 2 : i / (n - 1) * W), padT + H - v / max * H]; });
    c.beginPath(); pts.forEach(function (q, i) { i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); });
    c.lineTo(pts[n - 1][0], padT + H); c.lineTo(pts[0][0], padT + H); c.closePath(); c.globalAlpha = .15; c.fillStyle = color; c.fill(); c.globalAlpha = 1;
    c.beginPath(); pts.forEach(function (q, i) { i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.strokeStyle = color; c.lineWidth = 2.2; c.stroke(); c.lineWidth = 1;
    c.fillStyle = color; pts.forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], 3, 0, 7); c.fill(); });
    pts.forEach(function (q, i) { hit(id, { x: q[0] - 14, y: 0, w: 28, h: p.h, text: "<b>" + esc(labels[i]) + "</b><br>Cumulative: <b>" + values[i] + "</b>" }); });
    c.fillStyle = cssVar("--muted"); c.textAlign = "center";
    labels.forEach(function (l, i) { if (n <= 8 || i % 2 === 0) c.fillText(l, pts[i][0], p.h - 8); });
  }
  function gauge(id, pct) {
    var p = prep(id), c = p.c, cx = p.w / 2, cy = p.h * 0.72, R = Math.min(p.w / 2 - 14, p.h * 0.62), lw = R * 0.24;
    c.lineWidth = lw; c.lineCap = "round";
    c.strokeStyle = cssVar("--line"); c.beginPath(); c.arc(cx, cy, R, Math.PI, 2 * Math.PI); c.stroke();
    if (pct == null) { noData(p); return; }
    var col = pct >= 90 ? COLORS.ok : pct >= 70 ? COLORS.warn : COLORS.danger;
    c.strokeStyle = col; c.beginPath(); c.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * pct / 100); c.stroke();
    c.lineWidth = 1; c.fillStyle = cssVar("--ink"); c.textAlign = "center"; c.font = "700 30px Segoe UI, Arial"; c.fillText(Math.round(pct) + "%", cx, cy - 4);
    c.fillStyle = cssVar("--muted"); c.font = "12px Segoe UI, Arial"; c.fillText(pct >= 90 ? "Healthy" : pct >= 70 ? "Needs attention" : "At risk", cx, cy + 16);
  }
  function statusItems(arr) {
    function n(s) { return arr.filter(function (x) { return x.status === s; }).length; }
    return [
      { label: "Valid", value: n("Valid"), color: COLORS.ok }, { label: "Expiring Soon", value: n("Expiring Soon"), color: COLORS.warn },
      { label: "Expired", value: n("Expired"), color: COLORS.danger },
      { label: "Inactive / no date", value: arr.filter(function (x) { return !counted(x); }).length, color: COLORS.muted }
    ];
  }
  function dayRows(arr, limit) {
    return arr.filter(counted).sort(function (a, b) { return a.days - b.days; }).slice(0, limit || 99).map(function (x) {
      return { label: x.entity + (x.category === "License" ? " – " + x.name : ""), value: x.days, color: COLORS[cls(x.status)] };
    });
  }
  function monthSeries(arr) {
    var labels = ["Overdue"], keys = [null], red = [0], soon = [0], ok = [0];
    for (var i = 0; i < 12; i++) {
      var d = new Date(TODAY.getFullYear(), TODAY.getMonth() + i, 1);
      labels.push(d.toLocaleDateString("en-GB", { month: "short" })); keys.push(d.getFullYear() * 12 + d.getMonth()); red.push(0); soon.push(0); ok.push(0);
    }
    arr.forEach(function (x) {
      if (!counted(x)) return;
      var idx = x.days < 0 ? 0 : keys.indexOf(x.expiry.getFullYear() * 12 + x.expiry.getMonth());
      if (idx < 0) return;
      (x.status === "Expired" ? red : x.status === "Expiring Soon" ? soon : ok)[idx]++;
    });
    return { labels: labels, red: red, soon: soon, ok: ok };
  }
  function monthChart(chartId, lgId, arr) {
    var m = monthSeries(arr);
    vbars(chartId, m.labels, [{ name: "Expired", color: COLORS.danger, values: m.red }, { name: "Expiring soon", color: COLORS.warn, values: m.soon }, { name: "Valid", color: COLORS.ok, values: m.ok }]);
    statusLegend(lgId);
    return m;
  }
  function groupSum(arr, keyFn, valFn) {
    var m = {}; arr.forEach(function (x) { var k = keyFn(x) || "Unassigned"; m[k] = (m[k] || 0) + valFn(x); });
    return Object.keys(m).map(function (k) { return { label: k, value: m[k] }; }).sort(function (a, b) { return b.value - a.value; });
  }

  /* ---------- tables + pagination ---------- */
  function matches(o) { return !state.q || JSON.stringify(o).toLowerCase().indexOf(state.q) > -1; }
  function renderPager(id, total, page, pages, ps) {
    var el = $("pg-" + id);
    if (!el) return;
    if (total <= 10) { el.innerHTML = ""; return; }
    var a = (page - 1) * ps + 1, b = Math.min(total, page * ps);
    el.innerHTML = '<span class="pinfo">Showing ' + a + "–" + b + " of " + total + "</span>" +
      '<select data-ps="1">' + [10, 25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (n === ps ? " selected" : "") + ">" + n + " / page</option>"; }).join("") + "</select>" +
      '<button data-p="first"' + (page === 1 ? " disabled" : "") + ">«</button><button data-p=\"prev\"" + (page === 1 ? " disabled" : "") + ">‹ Prev</button>" +
      "<span>Page " + page + " / " + pages + "</span>" +
      '<button data-p="next"' + (page === pages ? " disabled" : "") + ">Next ›</button><button data-p=\"last\"" + (page === pages ? " disabled" : "") + ">»</button>";
    el.querySelectorAll("button").forEach(function (btn) {
      btn.onclick = function () {
        var d = btn.getAttribute("data-p");
        state.page[id] = d === "first" ? 1 : d === "prev" ? page - 1 : d === "next" ? page + 1 : pages; render();
      };
    });
    el.querySelectorAll("select").forEach(function (s) {
      s.onchange = function () { state.psize[id] = +s.value; state.page[id] = 1; render(); };
    });
  }
  function renderTable(id, cols, rows) {
    var st = state.sort[id] || {};
    var data = rows.filter(matches);
    if (st.col) {
      var col = cols.filter(function (c) { return c.key === st.col; })[0];
      data = data.slice().sort(function (a, b) {
        var x = col.sort ? col.sort(a) : a[col.key], y = col.sort ? col.sort(b) : b[col.key];
        if (x == null) x = Infinity; if (y == null) y = Infinity;
        return (x > y ? 1 : x < y ? -1 : 0) * st.dir;
      });
    }
    var ps = state.psize[id] || 10, pages = Math.max(1, Math.ceil(data.length / ps)), page = Math.min(Math.max(1, state.page[id] || 1), pages);
    state.page[id] = page;
    var slice = data.slice((page - 1) * ps, page * ps);
    var head = "<thead><tr>" + cols.map(function (c) { return '<th data-col="' + c.key + '">' + c.title + (st.col === c.key ? (st.dir > 0 ? " ▲" : " ▼") : "") + "</th>"; }).join("") + "</tr></thead>";
    var body = slice.length ? slice.map(function (r) { return "<tr>" + cols.map(function (c) { return "<td>" + c.render(r) + "</td>"; }).join("") + "</tr>"; }).join("")
      : '<tr><td colspan="' + cols.length + '" class="empty">No records.</td></tr>';
    var t = $(id); t.innerHTML = head + "<tbody>" + body + "</tbody>";
    t.querySelectorAll("th").forEach(function (th) {
      th.onclick = function () {
        var c = th.getAttribute("data-col"), s = state.sort[id] || {};
        state.sort[id] = { col: c, dir: s.col === c ? -s.dir : 1 }; render();
      };
    });
    renderPager(id, data.length, page, pages, ps);
    t._rows = data; t._cols = cols;
    return data.length;
  }
  var C = {
    entity: { key: "entity", title: "Entity / Facility", render: function (r) { return "<b>" + esc(r.entity) + "</b>"; } },
    expiry: function (title) { return { key: "expiry", title: title || "Expiry Date", render: function (r) { return fmtDate(r.expiry); }, sort: function (r) { return r.expiry ? r.expiry.getTime() : null; } }; },
    days: { key: "days", title: "Days Left", render: function (r) { return dayPill(r); }, sort: function (r) { return r.days; } },
    life: { key: "life", title: "Validity", render: function (r) {
        if (!counted(r)) return "";
        var pct = Math.max(0, Math.min(100, r.days / 365 * 100));
        return '<div class="bar"><span style="width:' + pct + "%;background:" + COLORS[cls(r.status)] + '"></span></div>';
      }, sort: function (r) { return r.days; } },
    status: { key: "status", title: "Status", render: function (r) { return badge(r.status); } },
    cat: { key: "category", title: "Category", render: function (r) { return '<span class="badge b-info">' + r.category + "</span>"; } },
    erp: { key: "erp", title: "ERP", render: function (r) { return erpLink(r.dt, r.doc); }, sort: function () { return ""; } }
  };

  /* ---------- KPIs ---------- */
  var KPIA = [];
  var ICON = {
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>'
  };
  function kpi(label, value, sub, tone, act) {
    KPIA.push(act || null);
    return '<div class="kpi ' + tone + (act ? " click" : "") + '" data-i="' + (KPIA.length - 1) + '" style="animation-delay:' + (KPIA.length * 0.05) + 's"><div class="khead"><div class="label">' + label + '</div><div class="ico">' + (ICON[tone] || ICON.info) + '</div></div><div class="value">' + value + '</div><div class="sub">' + (sub || "") + "</div></div>";
  }
  function cnt(a, s) { return a.filter(function (x) { return x.status === s; }).length; }
  function renderKPIs() {
    var w = S.expiringSoonDays, h = "", a, next; KPIA = [];
    function open(title, srcs, status) { return function () { openTargets(title, srcs, status); }; }
    if (state.tab === "overview") {
      a = allCounted();
      var act = VIS.ejar.filter(function (x) { return x.active; });
      h = kpi("Tracked items", a.length, "EJAR + licences + CR + MISA", "info", open("Tracked items", GOV_SRCS, "all")) +
        kpi("Expired", cnt(a, "Expired"), "renew immediately", "danger", open("Expired items", GOV_SRCS, "Expired")) +
        kpi("Expiring soon", cnt(a, "Expiring Soon"), "within " + w + " days", "warn", open("Expiring soon", GOV_SRCS, "Expiring Soon")) +
        kpi("Valid", cnt(a, "Valid"), "no action needed", "ok", open("Valid items", GOV_SRCS, "Valid")) +
        kpi("Active EJAR contracts", act.length, money(act.reduce(function (s, x) { return s + x.rent; }, 0)) + " total rent", "info", open("Active EJAR contracts", ["ejar"], "all"));
    } else if (state.tab === "ejar") {
      a = VIS.ejar.filter(function (x) { return x.active; });
      h = kpi("Active contracts", a.length, VIS.ejar.length - a.length + " closed / inactive", "info", open("Active contracts", ["ejar"], "all")) +
        kpi("Past end date", cnt(a, "Expired"), "active but overdue", "danger", open("Contracts past end date", ["ejar"], "Expired")) +
        kpi("Ending soon", cnt(a, "Expiring Soon"), "within " + w + " days", "warn", open("Contracts ending soon", ["ejar"], "Expiring Soon")) +
        kpi("Auto-renew off", a.filter(function (x) { return x.auto === "No"; }).length, "need manual renewal", "warn", function () { go(listUrl(FAC, { facility_contract_status: "Active", auto_renewal: "No" })); }) +
        kpi("Prepaid records", D.prepaid.length, D.prepaid.length ? "in ERP" : "none in ERP yet", "info", function () { go(listUrl("Prepaid Expense", {})); });
    } else {
      var key = state.tab, srcs = key === "licenses" ? LIC_SRCS : key === "cr" ? ["cr"] : ["misa"];
      a = key === "licenses" ? VIS.lic : key === "cr" ? VIS.cr : VIS.misa;
      next = a.filter(function (x) { return counted(x) && x.days >= 0; }).sort(function (x, y) { return x.days - y.days; })[0];
      var inactive = a.filter(function (x) { return !counted(x); }).length;
      h = kpi("Total records", a.length, inactive ? inactive + " inactive / no date" : "", "info", open("All records", srcs, "all")) +
        kpi("Expired", cnt(a, "Expired"), "renew immediately", "danger", open("Expired", srcs, "Expired")) +
        kpi("Expiring soon", cnt(a, "Expiring Soon"), "within " + w + " days", "warn", open("Expiring soon", srcs, "Expiring Soon")) +
        kpi("Valid", cnt(a, "Valid"), "no action needed", "ok", open("Valid", srcs, "Valid")) +
        kpi("Next to expire", next ? next.days + " d" : "–", next ? esc(next.entity) : "", "info", next ? function () { go(docUrl(next.dt, next.doc)); } : null);
    }
    $("kpis").innerHTML = h;
    $("kpis").querySelectorAll(".kpi").forEach(function (k) {
      var f = KPIA[+k.getAttribute("data-i")];
      if (f) k.onclick = f;
    });
  }

  /* ---------- overview ---------- */
  function dateCell(dateStr, cancelled) {
    if (cancelled) return '<span class="badge b-muted">Cancelled</span>';
    if (!dateStr) return '<span class="badge b-muted">No date</span>';
    var d = pd(dateStr), dl = daysTo(d), st = dl < 0 ? "Expired" : dl <= S.expiringSoonDays ? "Expiring Soon" : "Valid";
    return '<div class="cellrow">' + fmtDate(d) + badge(st) + "</div>";
  }
  function renderMatrix() {
    renderTable("tblMatrix", [
      { key: "n", title: "Entity", render: function (e) { return "<b>" + esc(e.n) + '</b><span class="sm">' + esc(e.type) + " • " + esc(e.loc) + "</span>"; } },
      { key: "crExp", title: "CR Expiry", render: function (e) { return e.canc ? '<span class="badge b-muted">—</span>' : dateCell(e.crExp, false); } },
      { key: "naExp", title: "National Address Expiry", render: function (e) { return dateCell(e.naExp, e.canc); } },
      { key: "misaExp", title: "MISA Expiry", render: function (e) { return e.misaExp ? dateCell(e.misaExp, e.canc) : (e.canc ? dateCell(null, true) : '<span class="badge b-muted">No date</span>'); } },
      { key: "ind", title: "Industrial License (date)", render: function (e) { return e.ind ? fmtDate(pd(e.ind)) : '<span class="badge b-muted">—</span>'; } },
      { key: "ch", title: "Chamber No.", render: function (e) { return esc(e.ch); } },
      { key: "erp", title: "ERP", render: function (e) { return erpLink(COM, e.n); }, sort: function () { return ""; } }
    ], D.entities.filter(function (e) { return !e.canc; }));
  }
  function gaps() {
    var act = D.entities.filter(function (e) { return !e.canc; });
    var comm = D.facilities.filter(function (f) { return f.status === "Active" && f.detail !== "Accomadation"; });
    var out = [
      [D.entities.filter(function (e) { return !e.zakat; }).length, "Zakat details empty", "of " + D.entities.length + " entities", COM, {}],
      [act.filter(function (e) { return e.misa && !e.misaExp; }).length, "MISA expiry missing", "active entities with a MISA no. but no expiry (branches share the HQ MISA no.)", COM, { cr_cancelled: 0, misa_expiry: ["is", "not set"] }],
      [act.filter(function (e) { return !e.naExp; }).length, "National Address expiry missing", "active entities", COM, { cr_cancelled: 0, national_address_expiry: ["is", "not set"] }],
      [comm.filter(function (f) { return !f.licExp; }).length, "Commercial Licence expiry missing", "active non-accommodation facilities", FAC, { facility_contract_status: "Active", com_lic_exp: ["is", "not set"] }],
      [comm.filter(function (f) { return !f.cdExp; }).length, "Civil Defense date missing", "active non-accommodation facilities", FAC, { facility_contract_status: "Active", cd_date_to: ["is", "not set"] }],
      [D.prepaid.length === 0 ? 1 : 0, "No Prepaid Expense records", "nothing to track under EJAR prepaid yet", "Prepaid Expense", {}],
      [act.filter(function (e) { return /^0+$/.test(e.cr); }).length, "Placeholder CR number (0000000000)", "check entity record", COM, { cr_number: "0000000000" }],
      [D.entities.filter(function (e) { return e.ind; }).length, "Industrial License field has dates only", "field is not labelled 'expiry' — confirm meaning before alerting", COM, { industrial_license1: ["is", "set"] }]
    ].filter(function (g) { return g[0]; });
    $("gapList").innerHTML = out.length ? out.map(function (g, i) {
      return '<li><div><div class="t">' + g[1] + '</div><div class="s">' + g[2] + '</div></div><span><a class="erp" target="_blank" rel="noopener" href="' + esc(listUrl(g[3], g[4])) + '">Open ↗</a> <span class="badge b-warn gap-n">' + g[0] + "</span></span></li>";
    }).join("") : '<li class="empty">No gaps found.</li>';
  }
  function renderHeat(a) {
    var rows = [["EJAR contracts", "EJAR"], ["Licences", "License"], ["Commercial Reg.", "CR"], ["MISA", "MISA"]];
    var cols = monthSeries([]).labels, html = '<table class="heat"><thead><tr><th></th>' + cols.map(function (l) { return "<th>" + l + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      var m = monthSeries(a.filter(function (x) { return x.category === r[1]; }));
      html += '<tr><td class="rowlab">' + r[0] + "</td>" + cols.map(function (l, i) {
        var n = m.red[i] + m.soon[i] + m.ok[i];
        if (!n) return "<td>·</td>";
        var al = Math.min(0.95, 0.6 + n * 0.1), rgb = i === 0 ? "217,63,63" : "29,126,214";
        return '<td style="background:rgba(' + rgb + "," + al + ') !important;color:#fff !important;text-shadow:0 1px 2px rgba(0,0,0,.25)">' + n + "</td>";
      }).join("") + "</tr>";
    });
    $("heatmap").innerHTML = html + "</tbody></table>";
  }
  function renderOverview() {
    var a = allCounted(), si = statusItems(a);
    doughnut("chStatus", si, "items"); legend("lgStatus", si);
    var m = monthChart("chMonth", "lgMonth", a);
    var valid = cnt(a, "Valid");
    gauge("chGauge", a.length ? valid / a.length * 100 : null);
    var cats = [["EJAR", "EJAR"], ["Licences", "License"], ["CR", "CR"], ["MISA", "MISA"]];
    stackedH("chCatStack", cats.map(function (c) {
      var arr = a.filter(function (x) { return x.category === c[1]; });
      return { label: c[0], parts: [{ value: cnt(arr, "Expired"), color: COLORS.danger }, { value: cnt(arr, "Expiring Soon"), color: COLORS.warn }, { value: cnt(arr, "Valid"), color: COLORS.ok }] };
    }), 70);
    statusLegend("lgCat");
    var run = 0, cum = m.labels.map(function (l, i) { run += m.red[i] + m.soon[i] + m.ok[i]; return run; });
    lineChart("chCum", m.labels, cum, COLORS.info);
    renderHeat(a);
    var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var nxt = a.filter(function (x) { return x.days >= 0; }).sort(function (x, y) { return x.days - y.days; }).filter(matches).slice(0, 8);
    $("nextList").innerHTML = nxt.length ? nxt.map(function (x) {
      return '<li><div class="datetile"><b>' + x.expiry.getDate() + "</b><span>" + MON[x.expiry.getMonth()] + '</span></div><div style="flex:1;min-width:0"><div class="t">' + esc(x.entity) + '</div><div class="s">' + esc(x.category + " • " + x.name) + '</div></div><div style="text-align:right">' + dayPill(x) + '<div class="s">' + erpLink(x.dt, x.doc) + "</div></div></li>";
    }).join("") : '<li class="empty">No upcoming renewals in this range.</li>';
    var tmap = {};
    a.forEach(function (x) { var k = x.category === "EJAR" ? "EJAR Contract" : x.category === "CR" ? "Commercial Registration" : x.category === "MISA" ? "MISA License" : x.name; (tmap[k] = tmap[k] || []).push(x); });
    var trows = Object.keys(tmap).map(function (k) {
      var arr = tmap[k];
      return { label: k, parts: [{ value: cnt(arr, "Expired"), color: COLORS.danger }, { value: cnt(arr, "Expiring Soon"), color: COLORS.warn }, { value: cnt(arr, "Valid"), color: COLORS.ok }] };
    }).sort(function (x, y) { return y.parts.reduce(function (q, p) { return q + p.value; }, 0) - x.parts.reduce(function (q, p) { return q + p.value; }, 0); }).slice(0, 10);
    stackedH("chTypeAll", trows, 170); statusLegend("lgTypeAll");
    var urgent = a.filter(function (x) { return x.status !== "Valid"; }).sort(function (x, y) { return x.days - y.days; }).filter(matches);
    $("alertList").innerHTML = urgent.length ? urgent.map(function (x) {
      return '<li><div><div class="t">' + esc(x.entity) + '</div><div class="s">' + esc(x.category + " • " + x.name) + " • " + fmtDate(x.expiry) + '</div></div><div style="text-align:right">' + badge(x.status) + '<div class="s">' + daysText(x) + " &nbsp;" + erpLink(x.dt, x.doc) + "</div></div></li>";
    }).join("") : '<li class="empty">Nothing urgent in this range.</li>';
    gaps(); renderMatrix();
    var n = renderTable("tblAll", [C.cat, C.entity, { key: "name", title: "Type / Detail", render: function (r) { return esc(r.name); } },
      { key: "ref", title: "Number", render: function (r) { return esc(r.ref); } }, C.expiry(), C.days, C.life, C.status, C.erp], a.slice().sort(function (x, y) { return x.days - y.days; }));
    $("allCount").textContent = n + " items";
  }

  /* ---------- EJAR ---------- */
  function fillSelect(id, values, firstLabel) {
    var sel = $(id), cur = sel.value;
    sel.innerHTML = '<option value="">' + firstLabel + "</option>" + values.map(function (v) { return "<option>" + esc(v) + "</option>"; }).join("");
    sel.value = cur;
  }
  function uniq(arr, key) { var m = {}; arr.forEach(function (x) { if (x[key]) m[x[key]] = 1; }); return Object.keys(m).sort(); }
  function renderEjar() {
    var onlyActive = $("fEjStatus").value === "active", det = $("fEjDetail").value;
    var rows = VIS.ejar.filter(function (x) { return (!onlyActive || x.active) && (!det || x.detail === det); });
    var si = statusItems(rows); doughnut("chEjar", si, "contracts"); legend("lgEjar", si);
    hbars("chEjarDays", dayRows(rows, 9), function (v) { return v + " d"; });
    monthChart("chEjMonth", "lgEjMonth", rows);
    var byType = groupSum(rows, function (x) { return x.detail === "Accomadation" ? "Accommodation" : x.detail; }, function (x) { return x.rent; });
    var items = byType.map(function (t, i) { return { label: t.label, value: t.value, color: PALETTE[i % PALETTE.length] }; });
    doughnut("chEjType", items, "total rent", compact(items.reduce(function (s, i) { return s + i.value; }, 0))); legend("lgEjType", items, compact);
    hbars("chEjCompany", groupSum(rows, function (x) { return x.company === "—" ? "" : x.company; }, function (x) { return x.rent; }).slice(0, 8).map(function (t, i) { return { label: t.label, value: t.value, color: PALETTE[i % PALETTE.length] }; }), compact, 120);
    renderTable("tblEjar", [
      C.entity, { key: "company", title: "Company", render: function (r) { return esc(r.company); } },
      { key: "name", title: "Facility", render: function (r) { return esc(r.name); } },
      { key: "ref", title: "EJAR Contract No.", render: function (r) { return esc(r.ref); } },
      { key: "from", title: "From", render: function (r) { return fmtDate(pd(r.fromStr)); }, sort: function (r) { return r.fromStr; } },
      C.expiry("Agreement End"), C.days,
      { key: "rent", title: "Total Rent", render: function (r) { return money(r.rent); } },
      { key: "auto", title: "Auto Renewal", render: function (r) { return esc(r.auto); } }, C.status, C.erp
    ], rows.slice().sort(function (a, b) { return (a.active === b.active ? 0 : a.active ? -1 : 1) || (a.days - b.days); }));
    var pp = D.prepaid;
    $("prepaidNote").textContent = pp.length ? pp.length + " Prepaid Expense record(s) in ERP." :
      "No Prepaid Expense records exist in ERP yet. Once prepaid rent / EJAR fees are booked in the Prepaid Expense doctype, they will list here (amount, start/end date, status).";
    renderTable("tblPrepaid", [
      { key: "name", title: "Record", render: function (r) { return esc(r.name); } }, { key: "company", title: "Company", render: function (r) { return esc(r.company); } },
      { key: "total_amount", title: "Total Amount", render: function (r) { return money(r.total_amount); } },
      { key: "start_date", title: "Start", render: function (r) { return esc(r.start_date); } }, { key: "end_date", title: "End", render: function (r) { return esc(r.end_date); } },
      { key: "status", title: "Status", render: function (r) { return esc(r.status); } },
      { key: "erp", title: "ERP", render: function (r) { return erpLink("Prepaid Expense", r.name); }, sort: function () { return ""; } }
    ], pp);
  }

  /* ---------- licenses ---------- */
  function renderLicenses() {
    var st = $("fLicStatus").value, ty = $("fLicType").value, gr = $("fLicGroup").value;
    var rows = VIS.lic.filter(function (l) { return (!st || l.status === st) && (!ty || l.name === ty) && (!gr || l.group === gr); });
    var si = statusItems(rows); doughnut("chLic", si, "licenses"); legend("lgLic", si);
    hbars("chLicDays", dayRows(rows, 8), function (v) { return v + " d"; });
    var types = {}; rows.forEach(function (x) { if (counted(x)) (types[x.name] = types[x.name] || []).push(x); });
    var trows = Object.keys(types).map(function (k) {
      var arr = types[k];
      return { label: k, parts: [{ value: cnt(arr, "Expired"), color: COLORS.danger }, { value: cnt(arr, "Expiring Soon"), color: COLORS.warn }, { value: cnt(arr, "Valid"), color: COLORS.ok }] };
    }).sort(function (a, b) { return b.parts.reduce(function (s, p) { return s + p.value; }, 0) - a.parts.reduce(function (s, p) { return s + p.value; }, 0); });
    stackedH("chLicType", trows, 170); statusLegend("lgLicType");
    monthChart("chLicMonth", "lgLicMonth", rows);
    renderTable("tblLic", [
      C.entity, { key: "company", title: "Company", render: function (r) { return esc(r.company); } },
      { key: "name", title: "License Type", render: function (r) { return esc(r.name) + '<span class="sm">' + esc(r.group) + "</span>"; } },
      { key: "ref", title: "Number", render: function (r) { return esc(r.ref); } },
      { key: "authority", title: "Authority", render: function (r) { return esc(r.authority || "—"); } },
      C.expiry(), C.days, C.life, C.status, C.erp
    ], rows.slice().sort(function (a, b) { return a.days - b.days; }));
  }

  /* ---------- CR ---------- */
  function renderCR() {
    var rows = VIS.cr, si = statusItems(rows); doughnut("chCR", si, "entities"); legend("lgCR", si);
    hbars("chCRDays", dayRows(rows), function (v) { return v + " d"; });
    var loc = groupSum(rows, function (x) { return x.loc; }, function () { return 1; }).map(function (t, i) { return { label: t.label, value: t.value, color: PALETTE[i % PALETTE.length] }; });
    doughnut("chCRLoc", loc, "entities"); legend("lgCRLoc", loc);
    monthChart("chCRMonth", "lgCRMonth", rows);
    renderTable("tblCR", [
      C.entity, { key: "name", title: "Type", render: function (r) { return esc(r.name); } }, { key: "loc", title: "Location", render: function (r) { return esc(r.loc); } },
      { key: "ref", title: "CR Number", render: function (r) { return esc(r.ref); } }, { key: "uni", title: "Unified No.", render: function (r) { return esc(r.uni); } },
      { key: "chamber", title: "Chamber No.", render: function (r) { return esc(r.chamber); } }, C.expiry("CR Expiry"),
      { key: "days", title: "Days Left", render: function (r) { return r.cancelled ? "Cancelled " + fmtDate(pd(r.cancDate)) : dayPill(r); }, sort: function (r) { return r.days; } },
      C.life, C.status, C.erp
    ], rows.slice().sort(function (a, b) { return (a.cancelled === b.cancelled ? 0 : a.cancelled ? 1 : -1) || (a.days - b.days); }));
  }

  /* ---------- MISA ---------- */
  function renderMisa() {
    var rows = VIS.misa, si = statusItems(rows); doughnut("chMisa", si, "entities"); legend("lgMisa", si);
    hbars("chMisaDays", dayRows(rows), function (v) { return v + " d"; });
    var cov = [
      { label: "Has expiry date", value: rows.filter(function (x) { return !x.cancelled && x.expiry; }).length, color: COLORS.ok },
      { label: "No expiry on record", value: rows.filter(function (x) { return !x.cancelled && !x.expiry; }).length, color: COLORS.warn },
      { label: "CR cancelled", value: rows.filter(function (x) { return x.cancelled; }).length, color: COLORS.muted }
    ];
    doughnut("chMisaCov", cov, "entities"); legend("lgMisaCov", cov);
    monthChart("chMisaMonth", "lgMisaMonth", rows);
    renderTable("tblMisa", [
      C.entity, { key: "name", title: "Type", render: function (r) { return esc(r.name); } }, { key: "ref", title: "MISA No.", render: function (r) { return esc(r.ref); } },
      C.expiry("MISA Expiry"), C.days, C.life, C.status,
      { key: "note", title: "Note", render: function (r) { return r.cancelled ? "CR cancelled " + fmtDate(pd(r.cancDate)) : !r.expiry ? "No MISA expiry on record in ERP" : ""; } }, C.erp
    ], rows.slice().sort(function (a, b) { return (a.days == null) - (b.days == null) || (a.days - b.days); }));
  }

  /* ---------- header summary (ignores date range) ---------- */
  function renderHero() {
    var arr = ITEMS.ejar.filter(function (x) { return x.active; }).concat(ITEMS.lic.filter(function (x) { return x.group === "Government"; }), ITEMS.cr, ITEMS.misa).filter(counted);
    var ex = cnt(arr, "Expired"), so = cnt(arr, "Expiring Soon"), va = cnt(arr, "Valid"), pct = arr.length ? Math.round(va / arr.length * 100) : 0;
    var col = pct >= 90 ? "#22c55e" : pct >= 70 ? "#fbbf24" : "#fb7185";
    function tile(dot, num, lab) { return '<div class="hs"><span class="dot" style="background:' + dot + '"></span><div><div class="num">' + num + '</div><div class="lab">' + lab + "</div></div></div>"; }
    $("heroStats").innerHTML = '<div class="hs"><div class="ring" style="--p:' + pct + ";--c:" + col + '"><span>' + pct + '%</span></div><div><div class="num">' + va + "/" + arr.length + '</div><div class="lab">Compliance (valid items)</div></div></div>' +
      tile("#fb7185", ex, "Expired – renew now") + tile("#fbbf24", so, "Expiring in " + S.expiringSoonDays + " days") +
      tile("#38bdf8", ITEMS.ejar.filter(function (x) { return x.active; }).length, "Active EJAR contracts") +
      tile("#a78bfa", ITEMS.cr.length, "Active CRs");
  }

  /* ---------- render / nav ---------- */
  function rangeInfo() {
    var r = state.range;
    $("rangeInfo").textContent = (!r.from && !r.to) ? "Showing all dates" :
      "Showing items expiring " + (r.from ? "from " + fmtDate(r.from) : "up to") + (r.from && r.to ? " to " : " ") + (r.to ? (r.from ? "" : "") + fmtDate(r.to) : "onwards");
    ROOT.querySelectorAll(".chip[data-r]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-r") === state.range.preset); });
  }
  function renderTabCounts() {
    var m = { overview: allCounted(), ejar: VIS.ejar.filter(function (x) { return x.active; }), licenses: VIS.lic, cr: VIS.cr, misa: VIS.misa };
    ROOT.querySelectorAll(".tc").forEach(function (el) {
      var arr = (m[el.getAttribute("data-for")] || []).filter(counted), ex = cnt(arr, "Expired"), so = cnt(arr, "Expiring Soon");
      el.className = "tc " + (ex ? "tc-danger" : so ? "tc-warn" : "tc-ok");
      el.textContent = ex + so; el.title = ex + " expired, " + so + " expiring soon";
    });
  }
  function render() {
    refresh(); rangeInfo(); renderHero(); renderTabCounts(); renderKPIs();
    ["overview", "ejar", "licenses", "cr", "misa"].forEach(function (t) { $("view-" + t).classList.toggle("hidden", t !== state.tab); });
    ROOT.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === state.tab); });
    ({ overview: renderOverview, ejar: renderEjar, licenses: renderLicenses, cr: renderCR, misa: renderMisa })[state.tab]();
  }
  function setTab(t) { state.tab = t; state.page = {}; render(); window.scrollTo(0, 0); }

  /* ---------- init ---------- */
  $("today").textContent = TODAY.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  $("snap").textContent = D.meta.note || "";
  if (D.meta.warn) { $("snap").style.color = COLORS.danger; }
  fillSelect("fEjDetail", uniq(ITEMS.ejar, "detail"), "All facility types");
  fillSelect("fLicType", uniq(ITEMS.lic, "name"), "All license types");
  $("winSel").value = String(S.expiringSoonDays);
  $("winSel").onchange = function (e) { S.expiringSoonDays = +e.target.value; state.page = {}; render(); };
  ROOT.querySelectorAll(".tab").forEach(function (b) { b.onclick = function () { setTab(b.getAttribute("data-tab")); }; });
  ROOT.querySelectorAll(".chip[data-r]").forEach(function (b) { b.onclick = function () { setPreset(b.getAttribute("data-r")); }; });
  function customRange() {
    var f = $("rFrom").value, t = $("rTo").value;
    state.range = { from: pd(f), to: pd(t), preset: (f || t) ? "custom" : "all" }; state.page = {}; render();
  }
  $("rFrom").onchange = customRange; $("rTo").onchange = customRange; $("rClear").onclick = function () { setPreset("all"); };
  $("search").oninput = function (e) { state.q = e.target.value.trim().toLowerCase(); state.page = {}; render(); };
  ["fEjStatus", "fEjDetail", "fLicStatus", "fLicType", "fLicGroup"].forEach(function (id) { $(id).onchange = function () { state.page = {}; render(); }; });
  $("mClose").onclick = function () { $("modal").classList.add("hidden"); };
  $("modal").onclick = function (e) { if (e.target === $("modal")) $("modal").classList.add("hidden"); };
  $("themeBtn").onclick = function () {
    var dark = HOSTEL.getAttribute("data-theme") === "dark";
    HOSTEL.setAttribute("data-theme", dark ? "light" : "dark");
    try { localStorage.setItem("gov-theme", dark ? "light" : "dark"); } catch (e) {}
    render();
  };
  try { var th = localStorage.getItem("gov-theme"); if (th) HOSTEL.setAttribute("data-theme", th); } catch (e) {}
  ROOT.querySelectorAll("canvas").forEach(function (cv) {
    cv.onmousemove = function (e) {
      var r = cv.getBoundingClientRect(), t = tipFor(cv.id, e.clientX - r.left, e.clientY - r.top), tp = $("tip");
      if (t) { tp.innerHTML = t; tp.classList.remove("hidden"); tp.style.left = Math.min(e.clientX + 14, window.innerWidth - 220) + "px"; tp.style.top = (e.clientY + 14) + "px"; }
      else tp.classList.add("hidden");
    };
    cv.onmouseleave = function () { $("tip").classList.add("hidden"); };
  });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(render, 150); });

  /* ---------- language option (English / Arabic) ---------- */
  var AR_TEXT = {
    "Government Relations": "العلاقات الحكومية",
    "Government Relations Dashboard": "لوحة معلومات العلاقات الحكومية",
    "EJAR Contracts & Prepaid": "عقود إيجار والمصروفات المدفوعة مقدماً",
    "License Expiry": "انتهاء التراخيص",
    "Commercial Registration": "السجل التجاري",
    "MISA": "وزارة الاستثمار",
    "Search entity, number, company...": "ابحث عن الكيان أو الرقم أو الشركة...",
    "Alert: 30 days": "تنبيه: 30 يوماً",
    "Alert: 60 days": "تنبيه: 60 يوماً",
    "Alert: 90 days": "تنبيه: 90 يوماً",
    "Dark / Light": "داكن / فاتح",
    "Expiry date range": "نطاق تاريخ الانتهاء",
    "All time": "كل الفترات",
    "Overdue": "متأخر",
    "Next 30 days": "خلال 30 يوماً",
    "Next 60 days": "خلال 60 يوماً",
    "Next 90 days": "خلال 90 يوماً",
    "This month": "هذا الشهر",
    "This quarter": "هذا الربع",
    "This year": "هذه السنة",
    "From": "من",
    "To": "إلى",
    "Clear": "مسح",
    "Overview": "نظرة عامة",
    "EJAR & Prepaid": "إيجار والمدفوعات المقدمة",
    "Commercial Registration": "السجل التجاري",
    "Tip: click any KPI tile to open the matching records in ERP.": "ملاحظة: اضغط على أي مؤشر لفتح السجلات المرتبطة في النظام.",
    "Overall status": "الحالة العامة",
    "counted items": "العناصر المحتسبة",
    "Expiries by month": "حالات الانتهاء حسب الشهر",
    "overdue + next 12 months": "المتأخر + الاثنا عشر شهراً القادمة",
    "Compliance score": "مؤشر الامتثال",
    "valid ÷ counted": "الصالح ÷ المحتسب",
    "Status by category": "الحالة حسب الفئة",
    "Cumulative expiries": "إجمالي حالات الانتهاء",
    "next 12 months": "الاثنا عشر شهراً القادمة",
    "Next renewals": "التجديدات القادمة",
    "soonest upcoming": "الأقرب موعداً",
    "Items by type": "العناصر حسب النوع",
    "status mix": "توزيع الحالات",
    "Renewal heatmap": "خريطة التجديد الحرارية",
    "items expiring per month": "العناصر التي تنتهي شهرياً",
    "Needs action now": "يتطلب إجراءً الآن",
    "expired or within alert window": "منتهي أو ضمن فترة التنبيه",
    "Data gaps in ERP": "نواقص البيانات في النظام",
    "fix at source": "يرجى التصحيح من المصدر",
    "Entity compliance matrix": "مصفوفة امتثال الكيانات",
    "All tracked items": "جميع العناصر المتابعة",
    "Active contracts only": "العقود النشطة فقط",
    "All contracts (incl. closed)": "جميع العقود (بما فيها المغلقة)",
    "All facility types": "جميع أنواع المنشآت",
    "Contract status": "حالة العقد",
    "Days to contract end": "الأيام المتبقية لانتهاء العقد",
    "soonest first": "الأقرب أولاً",
    "Contracts ending by month": "العقود المنتهية حسب الشهر",
    "Total rent by facility type": "إجمالي الإيجار حسب نوع المنشأة",
    "Total rent by company": "إجمالي الإيجار حسب الشركة",
    "EJAR rent contracts": "عقود إيجار",
    "Prepaid expenses": "المصروفات المدفوعة مقدماً",
    "Prepaid Expense doctype": "مستند المصروفات المدفوعة مقدماً",
    "All statuses": "جميع الحالات",
    "All license types": "جميع أنواع التراخيص",
    "Government + service contracts": "العقود الحكومية والخدمية",
    "Government": "حكومي",
    "Service Contract": "عقد خدمة",
    "License status": "حالة الترخيص",
    "Days remaining": "الأيام المتبقية",
    "Status by license type": "الحالة حسب نوع الترخيص",
    "License register": "سجل التراخيص",
    "active facilities": "المنشآت النشطة",
    "CR status": "حالة السجل التجاري",
    "Days to CR expiry": "الأيام المتبقية لانتهاء السجل التجاري",
    "active CRs": "السجلات التجارية النشطة",
    "Entities by location": "الكيانات حسب الموقع",
    "CR expiries by month": "انتهاء السجلات التجارية حسب الشهر",
    "Commercial registrations": "السجلات التجارية",
    "field: CR Expiry": "الحقل: تاريخ انتهاء السجل التجاري",
    "MISA status": "حالة وزارة الاستثمار",
    "Days to MISA expiry": "الأيام المتبقية لانتهاء ترخيص الاستثمار",
    "entities with a date": "الكيانات التي لديها تاريخ",
    "MISA expiry coverage": "تغطية تواريخ انتهاء تراخيص الاستثمار",
    "MISA expiries by month": "انتهاء تراخيص الاستثمار حسب الشهر",
    "MISA licenses": "تراخيص الاستثمار",
    "field: MISA Expiry": "الحقل: تاريخ انتهاء ترخيص الاستثمار",
    "Entity": "الكيان",
    "CR Expiry": "انتهاء السجل التجاري",
    "National Address Expiry": "انتهاء العنوان الوطني",
    "MISA Expiry": "انتهاء ترخيص الاستثمار",
    "Industrial License (date)": "تاريخ الرخصة الصناعية",
    "Chamber No.": "رقم الغرفة التجارية",
    "ERP": "النظام",
    "Cancelled": "ملغى",
    "No date": "لا يوجد تاريخ",
    "Expired": "منتهي",
    "Expiring Soon": "ينتهي قريباً",
    "Valid": "ساري",
    "Tracked items": "العناصر المتابعة",
    "Expired – renew now": "منتهي – يرجى التجديد",
    "Expiring in": "ينتهي خلال",
    "Active EJAR contracts": "عقود إيجار النشطة",
    "Active CRs": "السجلات التجارية النشطة",
    "Compliance (valid items)": "الامتثال (العناصر السارية)",
    "Showing all dates": "عرض جميع التواريخ",
    "No gaps found.": "لا توجد نواقص.",
    "No expiry on record": "لا يوجد تاريخ انتهاء مسجل",
    "Has expiry date": "يوجد تاريخ انتهاء",
    "CR cancelled": "السجل التجاري ملغى",
    "Days Left": "الأيام المتبقية",
    "CR Number": "رقم السجل التجاري",
    "Unified No.": "الرقم الموحد",
    "Location": "الموقع",
    "Type": "النوع",
    "Status": "الحالة",
    "Note": "ملاحظة",
    "Open": "فتح",
    "Close": "إغلاق",
    "No date on record": "لا يوجد تاريخ مسجل",
    "All records": "جميع السجلات",
    "Total records": "إجمالي السجلات",
    "Next to expire": "الأقرب انتهاءً",
    "No action needed": "لا يلزم إجراء",
    "renew immediately": "يرجى التجديد فوراً",
    "within": "خلال",
    "days": "أيام",
    "items": "عناصر",
    "Showing": "عرض",
    "of": "من",
    "Data:": "البيانات:",
    "snapshot, retrieved": "لقطة بيانات، تم جلبها",
    "Government Relations Dashboard • Data: DM ERPNext snapshot (see data.js)": "لوحة معلومات العلاقات الحكومية • البيانات: لقطة من نظام DM ERPNext (راجع data.js)"
  };

  var LANG = "en";
  // Keep the source-language text for every node so switching back to English
  // restores the exact original text, including dynamically generated labels.
  var originalTextNodes = new WeakMap();
  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    var current = node.nodeValue;
    if (!current || !current.trim()) return;

    if (!originalTextNodes.has(node)) originalTextNodes.set(node, current);
    var original = originalTextNodes.get(node);
    var trimmed = original.trim();

    if (LANG === "en") {
      if (current !== original) node.nodeValue = original;
      return;
    }

    var translated = AR_TEXT[trimmed];
    if (!translated) {
      translated = trimmed;
      Object.keys(AR_TEXT).sort(function(a,b){return b.length-a.length;}).forEach(function(key) {
        if (translated.indexOf(key) !== -1) translated = translated.split(key).join(AR_TEXT[key]);
      });
    }
    var result = original.replace(trimmed, translated);
    if (result !== current) node.nodeValue = result;
  }
  function applyLanguage() {
    var ar = LANG === "ar";
    HOSTEL.setAttribute("dir", ar ? "rtl" : "ltr");
    HOSTEL.setAttribute("lang", ar ? "ar" : "en");
    if (ar) HOSTEL.classList.add("arabic-ui");
    else HOSTEL.classList.remove("arabic-ui");
    var walker = document.createTreeWalker(HOSTEL, NodeFilter.SHOW_TEXT);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function(node) { translateTextNode(node); });
    HOSTEL.querySelectorAll("[placeholder],[title],[aria-label]").forEach(function(el) {
      ["placeholder","title","aria-label"].forEach(function(attr) {
        var v = el.getAttribute(attr);
        if (!v) return;
        var key = "original" + attr;
        if (ar) {
          if (!el.dataset[key]) el.dataset[key] = v;
          if (AR_TEXT[v]) el.setAttribute(attr, AR_TEXT[v]);
        } else if (el.dataset[key]) {
          el.setAttribute(attr, el.dataset[key]);
        }
      });
    });
  }
  var langObserver = new MutationObserver(function(mutations) {
    if (LANG !== "ar") return;
    mutations.forEach(function(m) {
      if (m.type === "characterData") translateTextNode(m.target);
      else m.addedNodes.forEach(function(node) {
        if (node.nodeType === 3) translateTextNode(node);
        else if (node.nodeType === 1) {
          var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), x;
          while ((x = w.nextNode())) translateTextNode(x);
        }
      });
    });
  });
  langObserver.observe(HOSTEL, {subtree:true, childList:true, characterData:true});
  var langSel = $("langSel");
  if (langSel) {
    langSel.onchange = function() {
      LANG = langSel.value;
      // Re-render generated dashboard content in its source language before applying Arabic.
      render();
      applyLanguage();
    };
  }
  render();
}

/* ---------- live loader ---------- */
(function () {
  var D = window.GOV_DATA, TIMEOUT = 10000;
  var FAC = "DM Facilities Management", COM = "DM Companies Management", PRE = "Prepaid Expense";
  var FAC_F = ["name", "facility_name", "company", "facility_detail", "facility_type", "location", "contract_number", "agreement_type", "date_frm", "rentdate_to",
    "rent_amount", "auto_renewal", "facility_contract_status", "com_act_no", "com_lic_exp", "municipality", "civil_def_no", "cd_date_to", "national_adress_expiry",
    "industrial_expiry", "construction_environmental_permit_expiry", "operational_environmental_permit_expiry", "fire_expiry", "camera_expiry", "cleanig_exp_date"];
  var COM_F = ["name", "company_name", "type", "location", "cr_number", "unified_number", "riyadh_chamber", "cr_expiry", "national_address_expiry", "misa",
    "misa_expiry", "zakat_details", "industrial_license1", "cr_cancelled", "cancellation_date"];
  var PRE_F = ["name", "company", "total_amount", "start_date", "end_date", "status"];

  function call(method, args) {
    return new Promise(function (resolve, reject) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; reject({ timeout: true }); } }, TIMEOUT);
      function fin(fn, v) { if (done) { return; } done = true; clearTimeout(t); fn(v); }
      try {
        frappe.call({ method: method, args: args, silent: true, freeze: false,
          callback: function (r) { fin(resolve, r ? r.message : null); }, error: function (e) { fin(reject, e || {}); } });
      } catch (x) { fin(reject, x); }
    });
  }
  function kind(e) {
    if (e && e.timeout) { return "timeout"; }
    var txt = ""; try { txt = (e && (e.responseText || e.statusText || e.message)) || ""; } catch (x) { /* ignore */ }
    return (/PermissionError|not permitted|403/i.test(String(txt)) || (e && e.status === 403)) ? "perm" : "tech";
  }
  function read(dt, fields) {
    return call("frappe.client.get_list", { doctype: dt, fields: fields, limit_page_length: 0, order_by: "name asc" }).then(function (rows) {
      return call("frappe.client.get_count", { doctype: dt }).then(function (n) { return { ok: true, rows: rows || [], n: n }; },
        function () { return { ok: true, rows: rows || [], n: null }; });
    }).catch(function (e) { return { ok: false, kind: kind(e) }; });
  }
  var d = function (v) { return v || null; };
  function finish(res) {
    var warns = [], parts = [];
    [[FAC, res[0]], [COM, res[1]], [PRE, res[2]]].forEach(function (p) {
      var r = p[1];
      if (!r.ok) { warns.push(r.kind === "perm" ? "No access to " + p[0] : r.kind === "timeout" ? p[0] + ": no response within 10 seconds - reload to retry" : p[0] + ": technical error while reading"); return; }
      parts.push(p[0].replace("DM ", "").replace(" Management", "") + " " + r.rows.length + (r.n != null ? "/" + r.n : ""));
      if (r.n != null && r.n !== r.rows.length) { warns.push("Counts may be incomplete for " + p[0] + " (" + r.rows.length + " of " + r.n + ")"); }
    });
    if (res[0].ok) {
      D.facilities = res[0].rows.map(function (r) {
        return { id: r.name, name: r.facility_name || r.name, company: r.company || "", detail: r.facility_detail || "", ftype: r.facility_type || "", loc: r.location || "",
          contract: r.contract_number || "", agr: r.agreement_type || "", from: d(r.date_frm), to: d(r.rentdate_to), rent: r.rent_amount || 0, auto: r.auto_renewal || "",
          status: r.facility_contract_status || "Not set", licNo: r.com_act_no || null, licExp: d(r.com_lic_exp), muni: r.municipality || "", cdNo: r.civil_def_no || null,
          cdExp: d(r.cd_date_to), naExp: d(r.national_adress_expiry), indExp: d(r.industrial_expiry), envConExp: d(r.construction_environmental_permit_expiry),
          envOpExp: d(r.operational_environmental_permit_expiry), fireExp: d(r.fire_expiry), camExp: d(r.camera_expiry), cleanExp: d(r.cleanig_exp_date) };
      });
    }
    if (res[1].ok) {
      D.entities = res[1].rows.map(function (r) {
        return { id: r.name, n: r.company_name || r.name, type: r.type || "", loc: r.location || "", cr: r.cr_number || "", uni: r.unified_number || "", ch: r.riyadh_chamber || "",
          crExp: d(r.cr_expiry), naExp: d(r.national_address_expiry), misa: r.misa || "", misaExp: d(r.misa_expiry), zakat: r.zakat_details || null,
          ind: d(r.industrial_license1), canc: !!r.cr_cancelled, cancDate: d(r.cancellation_date) };
      });
    }
    if (res[2].ok) { D.prepaid = res[2].rows; }
    D.meta.retrievedAt = new Date().toISOString();
    var when = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    D.meta.warn = warns.length > 0;
    D.meta.note = "Data: live from ERPNext, loaded " + when + (parts.length ? " · records read: " + parts.join(", ") : "") + (warns.length ? " · ⚠ " + warns.join(" · ") : "");
    __govMain();
  }
  if (!window.frappe || !frappe.call) {
    D.meta.warn = true; D.meta.note = "⚠ Live data is not available outside ERPNext - nothing to show."; __govMain(); return;
  }
  Promise.all([read(FAC, FAC_F), read(COM, COM_F), read(PRE, PRE_F)]).then(finish).catch(function () {
    D.meta.warn = true; D.meta.note = "⚠ The dashboard could not read ERPNext data."; __govMain();
  });
})();