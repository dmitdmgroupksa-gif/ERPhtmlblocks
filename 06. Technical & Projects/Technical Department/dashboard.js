(function(){
const R = root_element;
if (R.__tccInit) { try { R.__tccInit.destroy(); } catch(e){} }
const S = { lang: 'en', tab:'overview', f:{from:'',to:'',sp:'',loc:'',status:'',project:'',cust:'',q:''}, page:{}, sort:{}, data:null, loading:false, err:null };
try { S.lang = localStorage.getItem('tcc_lang') || 'en'; } catch(e){}

/* ---------- i18n ---------- */
const T = {
en:{title:'Technical Department Command Center',sub:'Live ERPNext data · Submittals · Approvals · Pre-Qualification · DMS workflow',refresh:'Refresh',clear:'Clear filters',from:'From',to:'To',sp:'Salesperson',loc:'Location',status:'Status',project:'Project',cust:'Customer',q:'Search',all:'All',
 overview:'Executive Overview',subs:'Submittals',apps:'Approvals',pqs:'Pre-Qualification',team:'Salesperson Performance',locprod:'Location & Product',dms:'DMS Workflow',
 k_sub:'Total Submittals',k_app:'Approvals',k_conv:'Conversion',k_pq:'Pre-Qualifications',k_ach:'Avg Achievement vs 5-unit target',k_reps:'Reps with approvals',k_repsof:'of {n} with any activity',k_top:'Top Performer',k_pend:'Pending (not converted)',k_rej:'Rejected / Not approved',k_under:'Under approval',
 monthly:'Monthly activity',mix:'Activity mix',funnel:'Conversion funnel',bystatus:'Submittals by approval status',byloc:'Location distribution',top5:'Top 5 by approvals',perf:'Salesperson performance',ach:'Achievement table',locact:'Location activity',topprod:'Top products',
 date:'Date',doc:'Document',customer:'Customer',product:'Product',ref:'Salesperson',dmst:'DM status',appst:'Approval status',appdate:'Approval date',subdate:'Submittal date',remarks:'Remarks',
 sub_s:'Sub',pq_s:'PQ',app_s:'App',target:'Target',achv:'Achievement',rows:'records',prev:'Prev',next:'Next',page:'Page',none:'No matching records',loading:'Loading live data…',failed:'Could not load',updated:'Updated',open:'Open',export:'Export CSV',
 d_total:'DMS submittals',d_active:'Active',d_overdue:'Overdue',d_approved:'Approved',required:'Required',priority:'Priority',engineer:'Submitted by',revision:'Revision',days:'days',unattr:'Unattributed',clickhint:'Click a chart or card to filter',noaccess:'No permission for'},
ar:{title:'مركز قيادة القسم الفني',sub:'بيانات ERPNext المباشرة · التقديمات · الاعتمادات · التأهيل المسبق · سير عمل DMS',refresh:'تحديث',clear:'مسح الفلاتر',from:'من',to:'إلى',sp:'مندوب المبيعات',loc:'الموقع',status:'الحالة',project:'المشروع',cust:'العميل',q:'بحث',all:'الكل',
 overview:'النظرة التنفيذية',subs:'التقديمات',apps:'الاعتمادات',pqs:'التأهيل المسبق',team:'أداء المندوبين',locprod:'الموقع والمنتج',dms:'سير عمل DMS',
 k_sub:'إجمالي التقديمات',k_app:'الاعتمادات',k_conv:'نسبة التحويل',k_pq:'التأهيل المسبق',k_ach:'متوسط الإنجاز مقابل هدف 5',k_reps:'مندوبون لديهم اعتمادات',k_repsof:'من أصل {n} لديهم نشاط',k_top:'الأفضل أداءً',k_pend:'معلّق (غير محوّل)',k_rej:'مرفوض / غير معتمد',k_under:'قيد الاعتماد',
 monthly:'النشاط الشهري',mix:'توزيع النشاط',funnel:'قمع التحويل',bystatus:'التقديمات حسب حالة الاعتماد',byloc:'التوزيع حسب الموقع',top5:'أفضل 5 حسب الاعتمادات',perf:'أداء المندوبين',ach:'جدول الإنجاز',locact:'نشاط المواقع',topprod:'أهم المنتجات',
 date:'التاريخ',doc:'المستند',customer:'العميل',product:'المنتج',ref:'المندوب',dmst:'حالة DM',appst:'حالة الاعتماد',appdate:'تاريخ الاعتماد',subdate:'تاريخ التقديم',remarks:'ملاحظات',
 sub_s:'تقديم',pq_s:'تأهيل',app_s:'اعتماد',target:'الهدف',achv:'الإنجاز',rows:'سجل',prev:'السابق',next:'التالي',page:'صفحة',none:'لا توجد سجلات مطابقة',loading:'جارٍ تحميل البيانات…',failed:'تعذّر التحميل',updated:'آخر تحديث',open:'فتح',export:'تصدير CSV',
 d_total:'تقديمات DMS',d_active:'نشطة',d_overdue:'متأخرة',d_approved:'معتمدة',required:'المطلوب',priority:'الأولوية',engineer:'مقدّم من',revision:'المراجعة',days:'أيام',unattr:'غير منسوب',clickhint:'انقر على الرسم أو البطاقة للتصفية',noaccess:'لا توجد صلاحية لـ'}};
const ST_AR = {'SUBMITTED':'مقدّم','REQUESTED':'مطلوب','RESUBMIT':'إعادة تقديم','REJECTED':'مرفوض','PENDING':'معلّق','APPROVED':'معتمد','UNDER APPROVAL':'قيد الاعتماد','HOLD':'معلّق مؤقتاً','NOT APPROVED':'غير معتمد','UNDER PROCESS':'قيد المعالجة','REJECTED & RETURNED':'مرفوض ومُعاد','APPROVED & RETURN':'معتمد ومُعاد','RETURNED':'مُعاد','(BLANK)':'(فارغ)',
 'Requested':'مطلوب','In Preparation':'قيد الإعداد','Submitted':'مقدّم','Under Review':'قيد المراجعة','Approved':'معتمد','Approved with Comments':'معتمد بملاحظات','Revision Required':'مطلوب مراجعة','Rejected':'مرفوض','Cancelled':'ملغى','Normal':'عادي','High':'عالية','Urgent':'عاجل','Submittals':'التقديمات','Approvals':'الاعتمادات','Pre-Qual':'التأهيل','Pending':'معلّق'};
const t = k => (T[S.lang][k] ?? T.en[k] ?? k);
const tv = v => S.lang==='ar' ? (ST_AR[v] || v) : v;
const nf = n => (n==null||isNaN(n)) ? '–' : Number(n).toLocaleString('en-US', {maximumFractionDigits:1});
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = v => String(v ?? '').trim().toUpperCase();

/* ---------- data ---------- */
async function getList(doctype, fields, extra){
  try {
    const r = await frappe.call({ method:'frappe.client.get_list', args:Object.assign({doctype, fields, limit_page_length:0}, extra||{}), freeze:false });
    return { rows:r.message||[] };
  } catch(e){ return { rows:[], err:doctype }; }
}
async function load(){
  S.loading = true; S.err = null; render();
  const [sr, ap, pq, dms, sp] = await Promise.all([
    getList('Submittal Request', ['name','docstatus','submitals.name as cn','submitals.date as d','submitals.submittal_date as sd','submitals.reference_srt as ref','submitals.location_srt as loc','submitals.dm_status as dms','submitals.approval_status as aps','submitals.project as project','submitals.company_srt as cust','submitals.company_new as cust2','submitals.product_name as product','submitals.remarks as remarks']),
    getList('Approvals', ['name','docstatus','date_approval','approval_type','approvals_table.name as cn','approvals_table.date as d','approvals_table.approval_date as ad','approvals_table.reference as ref','approvals_table.location_art as loc','approvals_table.approval_status as aps','approvals_table.project as project','approvals_table.company_art as cust','approvals_table.new_company as cust2','approvals_table.product_name as product','approvals_table.remarks as remarks']),
    getList('Pre - Qualification Submittals', ['name','docstatus','date','submitted_date','reference','location','project','company']),
    getList('DMS Technical Submittal', ['name','status','priority','dms_project','project_name','client','city','required_date','submittal_date','approval_date','submitted_by','sales_person','revision_no','submission_type','modified'], {order_by:'modified desc'}),
    getList('Sales Person', ['name'])
  ]);
  const errs = [sr,ap,pq,dms,sp].filter(x=>x.err).map(x=>x.err);
  const spMap = {}; sp.rows.forEach(r => spMap[norm(r.name)] = r.name);
  const canon = v => spMap[norm(v)] || null;
  const day = v => v ? String(v).slice(0,10) : '';
  S.data = {
    sub: sr.rows.filter(r=>r.cn).map(r => ({dt:'Submittal Request', name:r.name, date:day(r.d), sd:day(r.sd), rawref:r.ref||'', ref:canon(r.ref), loc:(r.loc||'').trim(), st:norm(r.dms)||'(BLANK)', aps:norm(r.aps)||'(BLANK)', project:r.project||'', cust:r.cust||r.cust2||'', product:r.product||'', remarks:r.remarks||''})),
    app: ap.rows.filter(r=>r.cn).map(r => ({dt:'Approvals', name:r.name, date:day(r.d), ad:day(r.ad||r.date_approval), rawref:r.ref||'', ref:canon(r.ref), loc:(r.loc||'').trim(), st:norm(r.aps)||'(BLANK)', aps:norm(r.aps)||'(BLANK)', project:r.project||'', cust:r.cust||r.cust2||'', product:r.product||'', remarks:r.remarks||''})),
    pq: pq.rows.map(r => ({dt:'Pre - Qualification Submittals', name:r.name, date:day(r.date), sd:day(r.submitted_date), rawref:r.reference||'', ref:canon(r.reference), loc:(r.location||'').trim(), st:'', aps:'', project:r.project||'', cust:r.company||'', product:''})),
    dms: dms.rows, spCount: sp.rows.length, errs, at:new Date()
  };
  S.loading = false; render();
}

/* ---------- filtering ---------- */
function pass(r, skip){
  const f = S.f;
  if (f.from && (!r.date || r.date < f.from)) return false;
  if (f.to && (!r.date || r.date > f.to)) return false;
  if (f.sp && skip!=='sp' && r.ref !== f.sp) return false;
  if (f.loc && skip!=='loc' && r.loc !== f.loc) return false;
  if (f.status && skip!=='status' && r.aps !== f.status) return false;
  if (f.project && r.project !== f.project) return false;
  if (f.cust && r.cust !== f.cust) return false;
  if (f.q) { const q = f.q.toLowerCase(); if (![r.name,r.rawref,r.project,r.cust,r.product,r.loc,r.st,r.aps,r.remarks].some(x => String(x||'').toLowerCase().includes(q))) return false; }
  return true;
}
function filtered(){
  const d = S.data; if (!d) return null;
  const pqStatusSkip = r => { const s=S.f.status; S.f.status=''; const ok=pass(r); S.f.status=s; return ok; };
  return { sub:d.sub.filter(r=>pass(r)), app:d.app.filter(r=>pass(r)), pq:d.pq.filter(pqStatusSkip) };
}
const countBy = (rows, fn) => rows.reduce((o,r)=>{ const k=fn(r); o[k]=(o[k]||0)+1; return o; }, {});
const sorted = o => Object.entries(o).sort((a,b)=>b[1]-a[1]);

function metrics(F){
  const people = {};
  const add = (rows,k) => rows.forEach(r => { if(!r.ref) return; (people[r.ref] = people[r.ref] || {sub:0,pq:0,app:0})[k]++; });
  add(F.sub,'sub'); add(F.pq,'pq'); add(F.app,'app');
  const reps = Object.entries(people).map(([n,v]) => ({name:n, ...v, target:5, achv: v.app/5*100})).sort((a,b)=>b.app-a.app || b.sub-a.sub);
  const active = reps.filter(r=>r.app>0).length;
  // SOURCE (Metabase card 664): sum of in-range achievement % / number of reps with >=1 approval ever (unfiltered)
  const baseReps = new Set(S.data.app.filter(r=>r.ref).map(r=>r.ref)).size;
  const avgAch = baseReps ? reps.reduce((s,r)=>s+r.achv,0)/baseReps : 0;
  const conv = F.sub.length ? F.app.length/F.sub.length*100 : 0;
  const aps = countBy(F.sub, r=>r.aps);
  return { reps, active, avgAch, conv, top:reps[0], aps,
    rejected:(aps['REJECTED']||0)+(aps['NOT APPROVED']||0), under:(aps['UNDER APPROVAL']||0)+(aps['UNDER PROCESS']||0) };
}

/* ---------- charts (SVG, clickable) ---------- */
const PAL = ['#2563eb','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#475569'];
function barChart(items, opt){
  opt = opt||{}; const series = opt.series || ['v'];
  if (!items.length) return `<div class="empty">${t('none')}</div>`;
  const W=560, H=opt.h||220, P=34, bw=(W-P*2)/items.length, max=Math.max(1,...items.flatMap(i=>i.values));
  let g='';
  items.forEach((it,i)=>{ const gw=bw*0.75/series.length;
    it.values.forEach((v,j)=>{ const h=(H-P*1.6)*v/max, x=P+i*bw+bw*0.125+j*gw, y=H-P-h;
      g+=`<rect class="clk" data-act="${esc(opt.act||'')}" data-val="${esc(it.key??it.label)}" x="${x}" y="${y}" width="${Math.max(gw-2,2)}" height="${h}" fill="${PAL[j%PAL.length]}" rx="3"><title>${esc(it.label)}: ${nf(v)}</title></rect>`;});
    if (items.length<=16) g+=`<text x="${P+i*bw+bw/2}" y="${H-P+14}" text-anchor="middle" class="ax">${esc(String(it.label).slice(0,10))}</text>`;
  });
  const leg = series.length>1 ? `<div class="leg">${series.map((s,j)=>`<span><i style="background:${PAL[j]}"></i>${esc(s)}</span>`).join('')}</div>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none"><line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="axl"/>${g}<text x="${P}" y="14" class="ax">${nf(max)}</text></svg>${leg}`;
}
function lineChart(labels, series, names){
  if (!labels.length) return `<div class="empty">${t('none')}</div>`;
  const W=560,H=220,P=34, max=Math.max(1,...series.flat()), step=(W-P*2)/Math.max(1,labels.length-1);
  const path = s => s.map((v,i)=>`${i?'L':'M'}${P+i*step},${H-P-(H-P*1.6)*v/max}`).join(' ');
  const every = Math.ceil(labels.length/8);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none"><line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="axl"/>${series.map((s,j)=>`<path d="${path(s)}" fill="none" stroke="${PAL[j]}" stroke-width="2.2"/>`+s.map((v,i)=>`<circle class="clk" data-act="month" data-val="${esc(labels[i])}" cx="${P+i*step}" cy="${H-P-(H-P*1.6)*v/max}" r="3.5" fill="${PAL[j]}"><title>${esc(labels[i])} · ${esc(names[j])}: ${nf(v)}</title></circle>`).join('')).join('')}${labels.map((l,i)=>i%every?'':`<text x="${P+i*step}" y="${H-P+14}" text-anchor="middle" class="ax">${esc(l)}</text>`).join('')}<text x="${P}" y="14" class="ax">${nf(max)}</text></svg><div class="leg">${names.map((n,j)=>`<span><i style="background:${PAL[j]}"></i>${esc(n)}</span>`).join('')}</div>`;
}
function donut(entries, act){
  const total = entries.reduce((s,e)=>s+e[1],0); if(!total) return `<div class="empty">${t('none')}</div>`;
  let a=0, segs='';
  entries.forEach(([k,v],i)=>{ const a2=a+v/total*Math.PI*2, large=a2-a>Math.PI?1:0, r=70, c=90;
    const p=(ang)=>`${c+r*Math.sin(ang)},${c-r*Math.cos(ang)}`;
    segs += v===total ? `<circle class="clk" data-act="${esc(act||'')}" data-val="${esc(k)}" cx="90" cy="90" r="70" fill="none" stroke="${PAL[i%10]}" stroke-width="26"/>`
      : `<path class="clk" data-act="${esc(act||'')}" data-val="${esc(k)}" d="M${p(a)} A70 70 0 ${large} 1 ${p(a2)}" fill="none" stroke="${PAL[i%10]}" stroke-width="26"><title>${esc(tv(k))}: ${nf(v)}</title></path>`; a=a2; });
  return `<div class="donut"><svg viewBox="0 0 180 180">${segs}<text x="90" y="88" text-anchor="middle" class="dt">${nf(total)}</text><text x="90" y="106" text-anchor="middle" class="ax">${t('rows')}</text></svg><div class="leg col">${entries.map(([k,v],i)=>`<span class="clk" data-act="${esc(act||'')}" data-val="${esc(k)}"><i style="background:${PAL[i%10]}"></i>${esc(tv(k))} <b>${nf(v)}</b> <small>${nf(v/total*100)}%</small></span>`).join('')}</div></div>`;
}

/* ---------- tables ---------- */
function table(id, rows, cols){
  const s = S.sort[id] || {}; if (s.k) rows = rows.slice().sort((a,b)=>{ const x=a[s.k]??'', y=b[s.k]??''; return (x>y?1:x<y?-1:0)*(s.d||1); });
  const per = 25, pages = Math.max(1, Math.ceil(rows.length/per)), p = Math.min(S.page[id]||1, pages); S.page[id]=p;
  const body = rows.slice((p-1)*per, p*per).map(r => `<tr>${cols.map(c => {
    const v = c.f ? c.f(r) : r[c.k];
    if (c.link) return `<td><a class="lnk" data-act="open" data-dt="${esc(r.dt||c.dt)}" data-val="${esc(r.name)}">${esc(r.name)}</a></td>`;
    if (c.badge) return `<td><span class="bdg b-${esc(String(v).replace(/[^A-Za-z]/g,'').toLowerCase())}">${esc(tv(v))}</span></td>`;
    return `<td>${esc(v)}</td>`; }).join('')}</tr>`).join('');
  return `<div class="tblwrap"><div class="tbltools"><span>${nf(rows.length)} ${t('rows')}</span><button class="btn sm" data-act="csv" data-val="${id}">${t('export')}</button></div>
  <div class="scroll"><table><thead><tr>${cols.map(c=>`<th class="clk" data-act="sort" data-tbl="${id}" data-val="${c.k}">${esc(t(c.h))}${s.k===c.k?(s.d>0?' ▲':' ▼'):''}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" class="empty">${t('none')}</td></tr>`}</tbody></table></div>
  <div class="pager"><button class="btn sm" data-act="pg" data-tbl="${id}" data-val="${p-1}" ${p<=1?'disabled':''}>${t('prev')}</button><span>${t('page')} ${p} / ${pages}</span><button class="btn sm" data-act="pg" data-tbl="${id}" data-val="${p+1}" ${p>=pages?'disabled':''}>${t('next')}</button></div></div>`;
}
const COLS = {
  sub:[{k:'name',h:'doc',link:1},{k:'date',h:'date'},{k:'rawref',h:'ref'},{k:'loc',h:'loc'},{k:'cust',h:'customer'},{k:'project',h:'project'},{k:'product',h:'product'},{k:'st',h:'dmst',badge:1},{k:'aps',h:'appst',badge:1}],
  app:[{k:'name',h:'doc',link:1},{k:'date',h:'date'},{k:'ad',h:'appdate'},{k:'rawref',h:'ref'},{k:'loc',h:'loc'},{k:'cust',h:'customer'},{k:'project',h:'project'},{k:'product',h:'product'},{k:'aps',h:'appst',badge:1}],
  pq:[{k:'name',h:'doc',link:1},{k:'date',h:'date'},{k:'sd',h:'subdate'},{k:'rawref',h:'ref'},{k:'loc',h:'loc'},{k:'cust',h:'customer'},{k:'project',h:'project'}],
  dms:[{k:'name',h:'doc',link:1,dt:'DMS Technical Submittal'},{k:'project_name',h:'project'},{k:'client',h:'customer'},{k:'required_date',h:'required'},{k:'priority',h:'priority',badge:1},{k:'submitted_by',h:'engineer'},{k:'revision_no',h:'revision'},{k:'status',h:'status',badge:1},{k:'od',h:'d_overdue'}]
};

/* ---------- render ---------- */
function opts(vals, cur){ return `<option value="">${t('all')}</option>` + vals.map(v=>`<option value="${esc(v)}" ${v===cur?'selected':''}>${esc(tv(v))}</option>`).join(''); }
function kpi(label, val, sub, act, v, tone){ return `<div class="kpi ${tone||''} ${act?'clk':''}" ${act?`data-act="${act}" data-val="${esc(v||'')}"`:''}><div class="kl">${esc(label)}</div><div class="kv">${esc(val)}</div>${sub?`<div class="ks">${esc(sub)}</div>`:''}</div>`; }
function card(title, inner, cls){ return `<div class="card ${cls||''}"><div class="ct">${esc(title)}</div>${inner}</div>`; }

function render(){
  const root = R.querySelector('.tcc') || (()=>{ const d=document.createElement('div'); d.className='tcc'; R.appendChild(d); return d; })();
  root.setAttribute('dir', S.lang==='ar'?'rtl':'ltr'); root.setAttribute('lang', S.lang);
  const D = S.data;
  const tabs = ['overview','subs','apps','pqs','team','locprod','dms'];
  let head = `<div class="hdr"><div><div class="eyebrow">DM GROUP · TECHNICAL</div><h2>${t('title')}</h2><div class="subt">${t('sub')}</div></div>
   <div class="hact">${D?`<span class="live">● ${t('updated')} ${D.at.toLocaleTimeString('en-GB')}</span>`:''}<button class="btn ghost" data-act="lang">${S.lang==='ar'?'English':'العربية'}</button><button class="btn" data-act="refresh">⟳ ${t('refresh')}</button></div></div>
   <div class="tabs">${tabs.map(k=>`<button class="tab ${S.tab===k?'on':''}" data-act="tab" data-val="${k}">${t(k)}</button>`).join('')}</div>`;
  if (S.loading || !D) { root.innerHTML = head + `<div class="loading"><div class="spin"></div>${t('loading')}</div>`; return; }
  const all = [...D.sub, ...D.app, ...D.pq];
  const uniq = k => [...new Set(all.map(r=>r[k]).filter(Boolean))].sort();
  const statuses = [...new Set([...D.sub, ...D.app].map(r=>r.aps))].sort();
  const f = S.f;
  const filt = `<div class="filters">
   <label>${t('from')}<input type="date" data-f="from" value="${esc(f.from)}"></label>
   <label>${t('to')}<input type="date" data-f="to" value="${esc(f.to)}"></label>
   <label>${t('sp')}<select data-f="sp">${opts(uniq('ref'), f.sp)}</select></label>
   <label>${t('loc')}<select data-f="loc">${opts(uniq('loc'), f.loc)}</select></label>
   <label>${t('status')}<select data-f="status">${opts(statuses, f.status)}</select></label>
   <label>${t('project')}<select data-f="project">${opts(uniq('project').slice(0,800), f.project)}</select></label>
   <label>${t('cust')}<select data-f="cust">${opts(uniq('cust').slice(0,800), f.cust)}</select></label>
   <label class="grow">${t('q')}<input type="search" data-f="q" value="${esc(f.q)}" placeholder="${t('q')}…"></label>
   <button class="btn ghost" data-act="clear">${t('clear')}</button></div>
   ${D.errs.length?`<div class="warn">${t('noaccess')}: ${esc(D.errs.join(', '))}</div>`:''}
   <div class="hint">${t('clickhint')}</div>`;
  const F = filtered(), M = metrics(F);
  let body = '';
  if (S.tab==='overview') {
    const months = {}; [['sub',0],['app',1],['pq',2]].forEach(([k,j]) => F[k].forEach(r => { const m=(r.date||'').slice(0,7); if(!m) return; (months[m]=months[m]||[0,0,0])[j]++; }));
    const ml = Object.keys(months).sort().slice(-24);
    body = `<div class="kpis">
      ${kpi(t('k_sub'), nf(F.sub.length), '', 'tab','subs')}
      ${kpi(t('k_app'), nf(F.app.length), `${t('k_conv')} ${nf(M.conv)}%`, 'tab','apps','ok')}
      ${kpi(t('k_pq'), nf(F.pq.length), '', 'tab','pqs')}
      ${kpi(t('k_ach'), nf(M.avgAch)+'%', '', 'tab','team')}
      ${kpi(t('k_reps'), nf(M.active), t('k_repsof').replace('{n}', M.reps.length), 'tab','team')}
      ${kpi(t('k_top'), M.top?M.top.name:'–', M.top?`${nf(M.top.app)} ${t('apps')}`:'', M.top?'sp':'', M.top?M.top.name:'')}
      ${kpi(t('k_pend'), nf(Math.max(0,F.sub.length-F.app.length)), '', '', '', 'warnk')}
      ${kpi(t('k_under'), nf(M.under), '', 'status','UNDER APPROVAL','warnk')}
      ${kpi(t('k_rej'), nf(M.rejected), '', 'status','REJECTED','bad')}
     </div>
     <div class="grid">
      ${card(t('monthly'), lineChart(ml, [ml.map(m=>months[m][0]), ml.map(m=>months[m][1]), ml.map(m=>months[m][2])], [t('subs'),t('apps'),t('pqs')]), 'w2')}
      ${card(t('mix'), donut([['Submittals',F.sub.length],['Approvals',F.app.length],['Pre-Qual',F.pq.length]], 'mixtab'))}
      ${card(t('funnel'), donut([['Approved',F.app.length],['Pending',Math.max(0,F.sub.length-F.app.length)]]))}
      ${card(t('bystatus'), donut(sorted(M.aps).slice(0,9), 'status'))}
      ${card(t('byloc'), donut(sorted(countBy(F.sub, r=>r.loc||'(BLANK)')), 'loc'))}
      ${card(t('top5'), barChart(M.reps.slice(0,5).map(r=>({label:r.name, key:r.name, values:[r.app]})), {act:'sp'}), 'w2')}
     </div>`;
  } else if (S.tab==='subs') {
    body = `<div class="grid">${card(t('bystatus'), donut(sorted(M.aps).slice(0,9),'status'))}${card(t('dmst'), donut(sorted(countBy(F.sub,r=>r.st)).slice(0,9)))}</div>` + card(t('subs'), table('sub', F.sub, COLS.sub));
  } else if (S.tab==='apps') {
    body = `<div class="grid">${card(t('appst'), donut(sorted(countBy(F.app,r=>r.aps)).slice(0,9),'status'))}${card(t('byloc'), donut(sorted(countBy(F.app,r=>r.loc||'(BLANK)')),'loc'))}</div>` + card(t('apps'), table('app', F.app, COLS.app));
  } else if (S.tab==='pqs') {
    body = `<div class="grid">${card(t('byloc'), donut(sorted(countBy(F.pq,r=>r.loc||'(BLANK)')),'loc'))}${card(t('sp'), barChart(sorted(countBy(F.pq.filter(r=>r.ref),r=>r.ref)).slice(0,10).map(([k,v])=>({label:k,key:k,values:[v]})),{act:'sp'}))}</div>` + card(t('pqs'), table('pq', F.pq, COLS.pq));
  } else if (S.tab==='team') {
    const rows = M.reps.map(r=>({dt:'Sales Person', name:r.name, sub:r.sub, pq:r.pq, app:r.app, target:r.target, achv:Math.round(r.achv)+'%'}));
    body = `<div class="grid">${card(t('perf'), barChart(M.reps.slice(0,15).map(r=>({label:r.name,key:r.name,values:[r.sub,r.app,r.pq]})),{series:[t('sub_s'),t('app_s'),t('pq_s')],act:'sp',h:260}),'w3')}</div>` +
      card(t('ach'), table('team', rows, [{k:'name',h:'ref',link:1},{k:'sub',h:'sub_s'},{k:'pq',h:'pq_s'},{k:'app',h:'app_s'},{k:'target',h:'target'},{k:'achv',h:'achv'}]));
  } else if (S.tab==='locprod') {
    const locs = [...new Set([...F.sub,...F.app,...F.pq].map(r=>r.loc).filter(Boolean))];
    const ls = countBy(F.sub,r=>r.loc), la = countBy(F.app,r=>r.loc), lp = countBy(F.pq,r=>r.loc);
    const ps = countBy(F.sub.filter(r=>r.product),r=>r.product), pa = countBy(F.app.filter(r=>r.product),r=>r.product);
    const prods = sorted(ps).slice(0,12).map(([k])=>k);
    body = `<div class="grid">${card(t('locact'), barChart(locs.sort((a,b)=>(ls[b]||0)-(ls[a]||0)).map(l=>({label:l,key:l,values:[ls[l]||0,la[l]||0,lp[l]||0]})),{series:[t('sub_s'),t('app_s'),t('pq_s')],act:'loc'}),'w2')}
      ${card(t('byloc'), donut(sorted(ls),'loc'))}
      ${card(t('topprod'), barChart(prods.map(p=>({label:p,key:p,values:[ps[p]||0,pa[p]||0]})),{series:[t('sub_s'),t('app_s')],act:'q',h:260}),'w3')}</div>` +
      card(t('locact'), table('loc', locs.map(l=>({name:l, sub:ls[l]||0, app:la[l]||0, pq:lp[l]||0, conv:(ls[l]?Math.round((la[l]||0)/ls[l]*1000)/10:0)+'%'})), [{k:'name',h:'loc'},{k:'sub',h:'sub_s'},{k:'app',h:'app_s'},{k:'pq',h:'pq_s'},{k:'conv',h:'k_conv'}]));
  } else if (S.tab==='dms') {
    const today = frappe.datetime.get_today(); const closed = ['Approved','Approved with Comments','Rejected','Cancelled'];
    const rows = D.dms.map(r=>({...r, dt:'DMS Technical Submittal', od: (!closed.includes(r.status) && r.required_date && r.required_date < today) ? frappe.datetime.get_diff(today, r.required_date) : ''}))
      .filter(r => !f.q || JSON.stringify(r).toLowerCase().includes(f.q.toLowerCase()));
    body = `<div class="kpis">${kpi(t('d_total'), nf(rows.length))}${kpi(t('d_active'), nf(rows.filter(r=>!closed.includes(r.status)).length),'', '', '', 'warnk')}${kpi(t('d_overdue'), nf(rows.filter(r=>r.od!=='').length),'', '', '', 'bad')}${kpi(t('d_approved'), nf(rows.filter(r=>/^Approved/.test(r.status)).length),'', '', '', 'ok')}</div>
     <div class="grid">${card(t('status'), donut(sorted(countBy(rows,r=>r.status||'(BLANK)'))))}${card(t('priority'), donut(sorted(countBy(rows,r=>r.priority||'(BLANK)'))))}</div>` + card(t('dms'), table('dms', rows, COLS.dms));
  }
  S._last = F; root.innerHTML = head + filt + body;
}

/* ---------- events (single delegated listener) ---------- */
function csv(id){
  const F = S._last, M = metrics(F);
  const map = {sub:[F.sub,COLS.sub], app:[F.app,COLS.app], pq:[F.pq,COLS.pq], dms:[S.data.dms,COLS.dms], team:[M.reps,[{k:'name'},{k:'sub'},{k:'pq'},{k:'app'},{k:'target'},{k:'achv'}]]};
  const [rows, cols] = map[id] || []; if (!rows) return;
  const q = v => `"${String(v??'').replace(/"/g,'""')}"`;
  const txt = [cols.map(c=>q(c.k)).join(','), ...rows.map(r=>cols.map(c=>q(r[c.k])).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+txt],{type:'text/csv'})); a.download = `technical_${id}_${frappe.datetime.get_today()}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
function onClick(e){
  const el = e.target.closest('[data-act]'); if (!el || !R.contains(el)) return;
  const a = el.dataset.act, v = el.dataset.val;
  if (a==='tab') { S.tab=v; }
  else if (a==='refresh') { load(); return; }
  else if (a==='lang') { S.lang = S.lang==='ar'?'en':'ar'; try{localStorage.setItem('tcc_lang',S.lang);}catch(_){} }
  else if (a==='clear') { S.f={from:'',to:'',sp:'',loc:'',status:'',project:'',cust:'',q:''}; S.page={}; }
  else if (a==='sp') { if(!v) return; S.f.sp = S.f.sp===v?'':v; S.page={}; }
  else if (a==='loc') { const val=v==='(BLANK)'?'':v; S.f.loc = S.f.loc===val?'':val; S.page={}; }
  else if (a==='status') { S.f.status = S.f.status===v?'':v; S.page={}; if(S.tab==='overview') S.tab='subs'; }
  else if (a==='q') { S.f.q = v; S.page={}; }
  else if (a==='month') { const [y,m]=v.split('-').map(Number); S.f.from=`${v}-01`; S.f.to=frappe.datetime.obj_to_str(new Date(y,m,0)); S.page={}; }
  else if (a==='mixtab') { S.tab = {Submittals:'subs',Approvals:'apps','Pre-Qual':'pqs'}[v]||S.tab; }
  else if (a==='sort') { const s=S.sort[el.dataset.tbl]||{}; S.sort[el.dataset.tbl] = {k:v, d: s.k===v ? -(s.d||1) : 1}; }
  else if (a==='pg') { S.page[el.dataset.tbl] = Number(v); }
  else if (a==='csv') { csv(v); return; }
  else if (a==='open') { const dt = el.dataset.dt; if (dt && v) frappe.set_route('Form', dt, v); return; }
  else return;
  render();
}
let qt;
function onChange(e){
  const el = e.target.closest('[data-f]'); if (!el || !R.contains(el)) return;
  const k = el.dataset.f;
  if (k==='q' && e.type==='input') { clearTimeout(qt); qt=setTimeout(()=>{ S.f.q=el.value; S.page={}; render(); const n=R.querySelector('[data-f="q"]'); if(n){n.focus(); n.setSelectionRange(n.value.length,n.value.length);} }, 300); return; }
  if (e.type==='change') { S.f[k]=el.value; S.page={}; render(); }
}
R.addEventListener('click', onClick); R.addEventListener('change', onChange); R.addEventListener('input', onChange);
R.__tccTest = { get S(){return S;}, filtered, metrics, render };
R.__tccInit = { destroy(){ R.removeEventListener('click', onClick); R.removeEventListener('change', onChange); R.removeEventListener('input', onChange); clearTimeout(qt); } };
load();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
