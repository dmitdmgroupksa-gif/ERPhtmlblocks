/* Custom HTML Block: Finance Manager Dashboard. Paste matching CSS in Style; leave HTML empty. */
(function () {
    'use strict';
    const root = root_element;
    const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const state = {kind:'Advance Report',date:'',end:'',company:'',note:'',boot:null,requests:[],busy:false,error:''};
    let timer, loading = false;
    const wrap = document.createElement('div'); wrap.className = 'soa finance-dashboard'; root.appendChild(wrap);
    const errorText = error => {
        try { const messages=JSON.parse(error._server_messages || '[]'); if(messages.length) return String(JSON.parse(messages[0]).message).replace(/<[^>]*>/g,''); } catch (_) {}
        return error.message || 'Could not load Finance reports. Check workflow setup and access.';
    };
    const api = (action,args={}) => new Promise((resolve,reject) => frappe.call({method:'soa_workflow_api',args:{action,...args},timeout:60000,
        callback:r => r && r.message != null ? resolve(r.message) : reject(new Error('No workflow response.')),error:reject}));
    function render() {
        const busy=state.busy?'disabled':'';
        wrap.innerHTML=`<header class="soa-top"><h2>Finance Manager Dashboard</h2><button type="button" class="soa-btn" data-action="refresh" ${busy}>Refresh</button></header>
        ${state.error?`<div class="soa-card soa-empty" role="alert">${esc(state.error)}</div>`:''}
        ${!state.boot?'':`<section class="soa-card soa-cpad"><div class="soa-tabs" role="tablist">${['Advance Report','Sales vs Target Report'].map(kind=>`<button type="button" class="soa-chipbtn ${kind===state.kind?'on':''}" role="tab" aria-selected="${kind===state.kind}" data-kind="${kind}" ${busy}>${kind}</button>`).join('')}</div>
        <h3>${esc(state.kind)}</h3><p>Send a request to Azrah. Once approved, the report PDF will be emailed to your user account.</p>
        <div class="finance-fields"><label>${state.kind==='Advance Report'?'As-of date':'From date'}<input class="soa-in" type="date" data-field="date" value="${esc(state.date)}" max="${esc(state.boot.today)}" ${busy}></label>
        ${state.kind==='Sales vs Target Report'?`<label>To date<input class="soa-in" type="date" data-field="end" value="${esc(state.end)}" max="${esc(state.boot.today)}" ${busy}></label>`:`<label>Company<select class="soa-sel" data-field="company" ${busy}><option value="">Choose company</option>${state.boot.companies.map(name=>`<option value="${esc(name)}" ${state.company===name?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`}</div>
        <label>Note to Azrah<textarea class="soa-ta" data-field="note" maxlength="500" ${busy}>${esc(state.note)}</textarea></label>
        <p><button type="button" class="soa-btn pri" data-action="request" ${busy}>${state.busy?'Sending…':'Request '+esc(state.kind)}</button></p>
        <div role="status">${esc(state.message || '')}</div></section>
        <section class="soa-card soa-cpad"><h3>My Finance requests</h3>${state.requests.length?state.requests.map(request=>`<article class="finance-request"><b>${esc(request.kind)}</b> · <span>${esc(request.status)}</span><p>${esc(request.report_date)}${request.to_date&&request.kind==='Sales vs Target Report'?' → '+esc(request.to_date):''} ${esc(request.company)}</p>${request.review_note?`<p>${esc(request.review_note)}</p>`:''}${request.status==='Approved'?'<small>Approved report PDF queued for email.</small>':''}</article>`).join(''):'<p>No Finance report requests yet.</p>'}</section>`}`;
    }
    async function load(quiet=false) {
        if (loading) return;
        loading=true;
        try {
            const [boot,data]=await Promise.all([api('finance_bootstrap'),api('mine')]);
            state.boot=boot;state.date=state.date||boot.today;state.end=state.end||boot.today;
            state.requests=(data.requests||[]).filter(r=>['Advance Report','Sales vs Target Report'].includes(r.kind));state.error='';
            if(!quiet || !(wrap.contains(document.activeElement) && document.activeElement.matches('input,textarea,select'))) render();
        } catch(error) {state.error=errorText(error);if(!quiet||!state.boot)render();}
        finally {loading=false;}
    }
    wrap.addEventListener('input',event=>{if(event.target.dataset.field)state[event.target.dataset.field]=event.target.value;});
    wrap.addEventListener('change',event=>{if(event.target.dataset.field)state[event.target.dataset.field]=event.target.value;});
    wrap.addEventListener('click',async event=>{
        const button=event.target.closest('button');if(!button||state.busy)return;
        if(button.dataset.kind){state.kind=button.dataset.kind;state.error='';state.message='';render();return;}
        if(button.dataset.action==='refresh')return load();
        if(button.dataset.action!=='request')return;
        if(!state.date || (state.kind==='Advance Report'&&!state.company) || (state.kind==='Sales vs Target Report'&&(!state.end||state.end<state.date))){state.error='Choose the required company and valid dates.';render();return;}
        state.busy=true;state.error='';state.message='';render();
        try {await api('request_finance',{kind:state.kind,date:state.date,to_date:state.kind==='Advance Report'?state.date:state.end,company:state.company,note:state.note});state.note='';state.message='Request sent to Azrah for approval.';await load();}
        catch(error){state.error=errorText(error);}
        finally{state.busy=false;render();}
    });
    render();load();
    timer=setInterval(()=>{if(!wrap.isConnected){clearInterval(timer);return;}if(!document.hidden&&!state.busy&&!(wrap.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')))load(true);},15000);
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */

/* ==== DM language v1 · generated by tools/erp/shell/i18n.py ==== */
;(function () {
  var root = typeof root_element !== 'undefined' ? root_element : document;
  var AR = {"Advance Report": "تقرير الدفعات المقدمة", "Approved": "معتمد", "Approved report PDF queued for email.": "تمت جدولة إرسال التقرير المعتمد بصيغة PDF بالبريد.", "As-of date": "تاريخ الاحتساب", "Choose company": "اختر الشركة", "Choose the required company and valid dates.": "اختر الشركة المطلوبة وتواريخ صالحة.", "Company": "الشركة", "Could not load Finance reports. Check workflow setup and access.": "تعذر تحميل التقارير المالية. تحقق من إعداد سير العمل والصلاحيات.", "Custom": "مخصص", "Finance": "المالية", "Finance Manager Dashboard": "لوحة المدير المالي", "From": "من", "From date": "من تاريخ", "My Finance requests": "طلباتي المالية", "Name": "الاسم", "No": "لا", "No Finance report requests yet.": "لا توجد طلبات تقارير مالية بعد.", "No workflow response.": "لا توجد استجابة من سير العمل.", "Note": "ملاحظة", "Refresh": "تحديث", "Request": "الطلب", "Request sent to Azrah for approval.": "تم إرسال الطلب إلى أزرة للاعتماد.", "Sales": "المبيعات", "Sales vs Target Report": "تقرير المبيعات مقابل المستهدف", "Send a request to Azrah. Once approved, the report PDF will be emailed to your user account.": "أرسل طلبًا إلى أزرة. بعد الاعتماد سيُرسل التقرير بصيغة PDF إلى بريد حسابك.", "Sending…": "جارٍ الإرسال…", "Target": "المستهدف", "To": "إلى", "to": "إلى"}, SEL = ".soa", SLOT = ".soa-top", KEY = 'dms-lang', ATTRS = ['placeholder', 'title', 'aria-label'];
  var lang = 'en'; try { lang = localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { /* storage blocked */ }
  var orig = new WeakMap(), busy = false, timer = 0;
  function host() { return root.querySelector(SEL); }
  function has(k) { return !!k && Object.prototype.hasOwnProperty.call(AR, k); }
  function text(h) {
    var w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var p = n.parentElement; if (!p || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(p.tagName) || p.closest('.dms-lang-btn')) continue;
      if (lang === 'ar') { var t = n.nodeValue.trim(), m = t.match(/^([^A-Za-z0-9(]*)(.*?)([\s:.…·-]*)$/), k = has(t) ? t : (m && has(m[2]) ? m[2] : '');
        if (k) { if (!orig.has(n)) orig.set(n, n.nodeValue); n.nodeValue = n.nodeValue.replace(k, AR[k]); } }
      else if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); }
    }
    h.querySelectorAll('[placeholder],[title],[aria-label]').forEach(function (e) {
      ATTRS.forEach(function (a) {
        var v = e.getAttribute(a), k = 'data-dms-' + a; if (v == null) return;
        if (lang === 'ar') { var t = v.trim(); if (Object.prototype.hasOwnProperty.call(AR, t)) { if (!e.hasAttribute(k)) e.setAttribute(k, v); e.setAttribute(a, AR[t]); } }
        else if (e.hasAttribute(k)) { e.setAttribute(a, e.getAttribute(k)); e.removeAttribute(k); }
      });
    });
  }
  function button(h) {
    var slot = SLOT === '&' ? h : h.querySelector(SLOT); if (!slot) return;
    var b = slot.querySelector('.dms-lang-btn');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'dms-lang-btn';
      b.addEventListener('click', function () { lang = lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem(KEY, lang); } catch (e) { /* optional */ } apply(); });
      var first = slot.querySelector(':scope > button, :scope > a, :scope > div > button'); first ? first.parentNode.insertBefore(b, first) : slot.appendChild(b);
    }
    b.textContent = lang === 'ar' ? 'English' : 'العربية'; b.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'); b.lang = lang === 'ar' ? 'en' : 'ar';
  }
  function apply() {
    var h = host(); if (!h) return;
    busy = true;
    try { button(h); text(h); h.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr'); h.setAttribute('lang', lang); } finally { mo.takeRecords(); busy = false; }
  }
  var mo = new MutationObserver(function () { if (busy) return; clearTimeout(timer); timer = setTimeout(apply, 25); });
  mo.observe(root === document ? (document.body || document.documentElement) : root, { childList: true, subtree: true, characterData: false });
  apply();
})();
/* ==== end DM language v1 ==== */
