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
