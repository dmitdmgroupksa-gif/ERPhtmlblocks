(function () {
    const root = root_element;

    const MP_REPORT = "MP - Blocked Customers";
    const BLOCKED_PCT_REPORT = "Blocked Customer Percent - MP";

    const $ = (sel) => root.querySelector(sel);

    const mp = {
        countEl: $("#mp-blocked-count"),
        outEl: $("#mp-blocked-outstanding"),
        countCard: $("#mp-blocked-count-card"),
        outCard: $("#mp-blocked-outstanding-card")
    };
    const bp = {
        outEl: $("#cp-actual-outstanding"),
        actualEl: $("#cp-actual-count"),
        blockedEl: $("#cp-blocked-count"),
        pctEl: $("#cp-blocked-percent"),
        cards: root.querySelectorAll(".cp-card")
    };
    const runningEl = $("#mp-running-outstanding");

    if (!mp.countEl || !mp.outEl || !mp.countCard || !mp.outCard) return;

    [mp.countEl, mp.outEl, bp.outEl, bp.actualEl, bp.blockedEl, bp.pctEl, runningEl]
        .filter(Boolean).forEach(el => (el.textContent = "Loading..."));

    const setError = (els) => els.forEach(el => el && (el.textContent = "Error"));

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

    // ---- Click routes ----
    const openMP = () => frappe.set_route("query-report", MP_REPORT);
    const openBP = () => frappe.set_route("query-report", BLOCKED_PCT_REPORT);

    mp.countCard.addEventListener("click", openMP);
    mp.outCard.addEventListener("click", openMP);
    bp.cards.forEach(card => card.addEventListener("click", openBP));

    // ---- MP - Blocked Customers ----

    function uniqueCustomers(rows){
        const byId=new Map();
        rows.filter(isDataRow).forEach(row=>{
            const id=row.customer_id||row.customer;
            if(!id)throw new Error('Customer ID missing from report; unique totals unavailable');
            const old=byId.get(id);
            if(old && ['actual_outstanding','outstanding_of_blocked_customers','is_blocked'].some(k=>Number(old[k]||0)!==Number(row[k]||0)))throw new Error('Conflicting customer balances in report');
            if(!old)byId.set(id,row);
        });
        return Array.from(byId.values());
    }

    frappe.call({
        method: "frappe.desk.query_report.run",
        args: {
            report_name: MP_REPORT,
            filters: { as_of_date: frappe.datetime.get_today() }
        },
        callback: function (r) {
            const rows = r.message && r.message.result;
            if (!Array.isArray(rows)) return setError([mp.countEl, mp.outEl]);

            const customers = rows.filter(isDataRow);

            const hasCountCol = customers.some(row => row.customer_count !== undefined);
            const count = hasCountCol
                ? customers.reduce((s, row) => s + (Number(row.customer_count) || 0), 0)
                : customers.length;
            const outstanding = customers.reduce((s, row) => s + (Number(row.actual_outstanding) || 0), 0);

            mp.countEl.textContent = count.toLocaleString("en-SA");
            mp.outEl.textContent = formatAmount(outstanding);
        },
        error: () => setError([mp.countEl, mp.outEl])
    });

    // ---- Blocked Customer Percent - MP ----
    frappe.call({
        method: "frappe.desk.query_report.run",
        args: {
            report_name: BLOCKED_PCT_REPORT,
            filters: { as_of_date: frappe.datetime.get_today() }
        },
        callback: function (r) {
            const rows = r.message && r.message.result;
            if (!Array.isArray(rows)) return setError([bp.outEl, bp.actualEl, bp.blockedEl, bp.pctEl, runningEl]);

            let data;try{data=uniqueCustomers(rows);}catch(e){return setError([bp.outEl,bp.actualEl,bp.blockedEl,bp.pctEl,runningEl]);}

            const actualOutstanding = data.reduce((s, row) => s + (Number(row.actual_outstanding) || 0), 0);
            const blockedOutstanding = data.reduce((s, row) => s + (Number(row.outstanding_of_blocked_customers) || 0), 0);
            const actualCount = data.length;
            const blockedCount = data.reduce((s, row) => s + (Number(row.is_blocked) || 0), 0);
            const percent = actualCount > 0 ? (blockedCount / actualCount) * 100 : 0;

            bp.outEl.textContent = formatAmount(actualOutstanding);
            bp.actualEl.textContent = actualCount.toLocaleString("en-SA");
            bp.blockedEl.textContent = blockedCount.toLocaleString("en-SA");
            bp.pctEl.textContent = percent.toFixed(2) + "%";
            if (runningEl) runningEl.textContent = formatAmount(actualOutstanding - blockedOutstanding);
        },
        error: () => setError([bp.outEl, bp.actualEl, bp.blockedEl, bp.pctEl, runningEl])
    });
})();