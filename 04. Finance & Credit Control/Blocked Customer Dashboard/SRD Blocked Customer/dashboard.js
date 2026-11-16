(function () {
    const root = root_element;
    const REPORT = "Blocked Customer Percent - SRD";

    const $ = (sel) => root.querySelector(sel);

    const els = {
        blockedCustomers: $("#srd-blocked-customers"),
        blockedOutstanding: $("#srd-blocked-outstanding"),
        actualOutstanding: $("#srd-actual-outstanding"),
        actualCount: $("#srd-actual-count"),
        blockedCount: $("#srd-blocked-count"),
        blockedPercent: $("#srd-blocked-percent")
    };
    const allEls = Object.values(els);
    const runningEl = $("#srd-running-outstanding");

    if (allEls.some(el => !el)) return;

    allEls.forEach(el => (el.textContent = "Loading..."));
    if (runningEl) runningEl.textContent = "Loading...";

    const setError = () => {
        allEls.forEach(el => (el.textContent = "Error"));
        if (runningEl) runningEl.textContent = "Error";
    };

    function formatAmount(v) {
        return v >= 1000000
            ? (v / 1000000).toFixed(2) + "M"
            : v >= 1000
                ? (v / 1000).toFixed(2) + "K"
                : v.toFixed(2);
    }

    const isDataRow = (row) =>
        row && !Array.isArray(row) && row.customer_name &&
        String(row.customer_name).trim().toLowerCase() !== "total";

    root.querySelectorAll(".mp-dashboard-card").forEach(card =>
        card.addEventListener("click", () => frappe.set_route("query-report", REPORT))
    );

    frappe.call({
        method: "frappe.desk.query_report.run",
        args: {
            report_name: REPORT,
            filters: { as_of_date: frappe.datetime.get_today() }
        },
        callback: function (r) {
            const rows = r.message && r.message.result;
            if (!Array.isArray(rows)) return setError();

            const data = rows.filter(isDataRow);

            const actualOutstanding = data.reduce((s, row) => s + (Number(row.actual_outstanding) || 0), 0);
            const blockedOutstanding = data.reduce((s, row) => s + (Number(row.outstanding_of_blocked_customers) || 0), 0);
            const actualCount = data.length;
            const blockedCount = data.reduce((s, row) => s + (Number(row.is_blocked) || 0), 0);
            const percent = actualCount > 0 ? (blockedCount / actualCount) * 100 : 0;

            els.blockedCustomers.textContent = blockedCount.toLocaleString("en-SA");
            els.blockedOutstanding.textContent = formatAmount(blockedOutstanding);
            els.actualOutstanding.textContent = formatAmount(actualOutstanding);
            els.actualCount.textContent = actualCount.toLocaleString("en-SA");
            els.blockedCount.textContent = blockedCount.toLocaleString("en-SA");
            els.blockedPercent.textContent = percent.toFixed(2) + "%";
            if (runningEl) runningEl.textContent = formatAmount(actualOutstanding - blockedOutstanding);
        },
        error: setError
    });
})();