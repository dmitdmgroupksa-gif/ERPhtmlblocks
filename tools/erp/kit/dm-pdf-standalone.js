  /* ==== DM PDF export v1 · same as the DMS kit exportPdf, for dashboards not built on the kit (tools/erp/kit/dm-pdf-standalone.js) ====
     Tables print as a PDF on the DM Letter Head: the HTML is rendered by ERPNext (frappe.utils.print_format.report_to_pdf,
     the route Desk reports use) and the browser saves the file. Replaces the CSV exports. */
  function dmPdfExport(name, title, head, rows, o) {
    o = o || {};
    var W = window, F = W.frappe, LH = { name: '2026 DMG - NEW', img: '/files/WhatsApp Image 2026-08-20 at 3.32.18 PM.jpeg', foot: '/files/erp footer.jpeg' };
    var e = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var abs = function (h) { return String(h || '').replace(/(src|href)=(["'])\/(?!\/)/g, '$1=$2' + W.location.origin + '/'); };
    var lh = F && F.boot && F.boot.letter_heads && F.boot.letter_heads[o.letterHead || LH.name];
    var top = abs(lh && lh.header ? lh.header : '<div style="text-align:center"><img src="' + encodeURI(LH.img) + '" style="max-width:100%"></div>');
    var bottom = abs(String(lh && lh.footer ? lh.footer : '<div style="text-align:center"><img src="' + encodeURI(LH.foot) + '" style="max-width:100%"></div>').replace(/position\s*:\s*fixed;?/gi, ''));
    var rtl = !!o.rtl, al = rtl ? 'right' : 'left', today = new Date().toISOString().slice(0, 10), max = 2000, cut = rows.slice(0, max);
    var isNum = head.map(function (_, i) { var vals = cut.map(function (r) { return r[i]; }).filter(function (v) { return v !== '' && v != null; }); return vals.length > 0 && vals.every(function (v) { return typeof v === 'number' || /^-?[\d,]+(\.\d+)?$/.test(String(v)); }); });
    var cell = function (v, n) { if (v == null) { return ''; } if (n && !isNaN(String(v).replace(/,/g, ''))) { return Number(String(v).replace(/,/g, '')).toLocaleString('en-US', { maximumFractionDigits: 2 }); } return String(v).replace(/\s+/g, ' ').trim(); };
    var sub = [o.sub, cut.length + (rows.length > cut.length ? ' of ' + rows.length : '') + ' rows', 'Printed ' + today].filter(Boolean).join(' · ');
    var html = '<!DOCTYPE html><html dir="' + (rtl ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><style>body{font-family:Arial,"DejaVu Sans","Noto Naskh Arabic",sans-serif;font-size:10px;color:#1b2430;margin:0}' +
      '.t{font-size:15px;font-weight:bold;margin:12px 0 2px;color:#0f2147}.s{color:#5b6678;margin:0 0 10px;font-size:9.5px}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid}' +
      'th{background:#0f2147;color:#fff;text-align:' + al + ';padding:5px 6px;font-size:9.5px}td{padding:4px 6px;border-bottom:1px solid #dde2ea;vertical-align:top;text-align:' + al + '}tbody tr:nth-child(even) td{background:#f4f6fa}.n{text-align:right;white-space:nowrap}.f{margin-top:16px}</style></head><body>' +
      top + '<div class="t">' + e(title) + '</div><div class="s">' + e(sub) + '</div><table><thead><tr>' + head.map(function (h, i) { return '<th' + (isNum[i] ? ' class="n"' : '') + '>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cut.map(function (r) { return '<tr>' + head.map(function (_, i) { return '<td' + (isNum[i] ? ' class="n"' : '') + '>' + e(cell(r[i], isNum[i])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      (o.note ? '<div class="s" style="margin-top:8px">' + e(o.note) + '</div>' : '') + (rows.length > cut.length ? '<div class="s">Only the first ' + max + ' rows are included. Narrow the filters to print the rest.</div>' : '') + '<div class="f">' + bottom + '</div></body></html>';
    var done = function (msg, bad) { if (F && F.show_alert) { F.show_alert({ message: msg, indicator: bad ? 'red' : 'blue' }); } };
    done(rtl ? 'جارٍ تجهيز ملف PDF…' : 'Preparing PDF…');
    return fetch('/api/method/frappe.utils.print_format.report_to_pdf', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Frappe-CSRF-Token': (F && F.csrf_token) || '', 'Accept': 'application/pdf' },
      body: 'html=' + encodeURIComponent(html) + '&orientation=' + (head.length > 6 ? 'Landscape' : 'Portrait') })
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.blob(); })
      .then(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b.type === 'application/pdf' ? b : new Blob([b], { type: 'application/pdf' }));
        a.download = String(name || 'export').replace(/[^\w-]+/g, '_') + '_' + today + '.pdf'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }, function () { done(rtl ? 'تعذر تصدير PDF.' : 'PDF export failed. Try again or narrow the list.', true); });
  }
  /* ==== end DM PDF export ==== */
