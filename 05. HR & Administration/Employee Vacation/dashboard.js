(function () {

const R = root_element;
const SNAP = frappe.datetime.get_today();
let DATA = [], EMP = [], COMPANIES = [];
const $ = (s,r=R)=>r.querySelector(s);
const esc = v=>String(v==null?"":v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const D = s=>s?new Date(s+"T00:00:00"):null;
const iso = d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10)};
const addDays=(s,n)=>{const d=D(s);d.setDate(d.getDate()+n);return iso(d)};
const days=(a,b)=>Math.round((D(b)-D(a))/864e5);
const fmt=s=>s?D(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"–";
const fmtS=s=>s?D(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):"–";
const sar=n=>(Number(n)||0).toLocaleString("en-US",{maximumFractionDigits:0});
const dShort=d=>(d||"None").split(" - ")[0];
const dLong=d=>{const p=(d||"").split(" - ");return p.length>1?p[1].toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/ Dmg$/,""):d};
const ST={"Overdue":"crit","On Vacation":"info","Not Yet Departed":"warn","Upcoming":"mute","Re-joined":"good","Completed":"good"};
const ST_ORDER=["Overdue","On Vacation","Not Yet Departed","Upcoming","Re-joined","Completed"];
const COL={crit:"var(--crit)",warn:"var(--warn)",good:"var(--good)",info:"var(--info)",mute:"var(--mute)",accent:"var(--accent)"};
const chip=(t,c)=>`<span class="chip c-${c}">${esc(t)}</span>`;
const sChip=s=>s?chip(s==="Completed"?"Completed":s,ST[s]||"mute"):"–";
const reChip=s=>!s?"–":chip(s,{"Returned":"good","Valid":"good","Expiring in 7 Days":"warn","Expired":"crit","Not Recorded":"crit"}[s]||"mute");
const away=r=>r.st==="On Vacation"||r.st==="Overdue";
const open=r=>!["Re-joined","Completed"].includes(r.st);


const VIEWS=[["overview","Overview"],["followup","Follow-up list"],["timeline","Timeline"],["depts","Departments"],["travel","Tickets & refunds"],["reentry","Exit re-entry"]];
const S={kpi:null,view:"overview",from:addDays(SNAP,-60),to:addDays(SNAP,60),co:"",loc:"",dept:"",q:"",ftab:"All",sort:{k:"over",dir:-1},open:null,ttab:"Active",calM:SNAP.slice(0,7),calDay:null};

function rows(){
  const q=S.q.trim().toLowerCase();
  return DATA.filter(r=>(!S.co||r.company===S.co)&&(!S.loc||r.loc===S.loc)&&(!S.dept||r.dept===S.dept)
    &&(!q||(r.name+" "+r.employee).toLowerCase().includes(q))
    &&((r.frm<=S.to&&r.to>=S.from)||r.st==="Overdue"));
}

/* ---------- job location names (display only; filter values and grouping stay on the stored code) ---------- */
let LOC={};
const ln=c=>(c!=null&&Object.prototype.hasOwnProperty.call(LOC,c)&&LOC[c])||c;
function locLoad(){
  const done=m=>{LOC=m||{};if(Object.keys(LOC).length){try{fillFilters();render()}catch(e){console.error(e)}}};
  try{
    frappe.model.with_doctype("Employee",()=>{
      try{
        const f=frappe.get_meta("Employee").fields.find(x=>x.fieldname==="custom_job_location");
        if(!f||f.fieldtype!=="Link"||!f.options)return done({});
        const t=f.options;
        frappe.model.with_doctype(t,()=>{
          try{
            const meta=frappe.get_meta(t);let tf=meta.title_field||"";
            if(!tf)tf=["location_name","job_location_name","location","title","description","name1"].find(n=>meta.fields.some(x=>x.fieldname===n))||"";
            if(!tf){const d=meta.fields.find(x=>/^(Data|Small Text)$/.test(x.fieldtype)&&(x.reqd||x.in_list_view));if(d)tf=d.fieldname}
            if(!tf)return done({});
            frappe.xcall("frappe.client.get_list",{doctype:t,fields:["name",tf],limit_page_length:1000}).then(rs=>{
              const m={},seen={};
              (rs||[]).forEach(r=>{const n=String(r[tf]||"").trim();if(n&&n!==r.name){m[r.name]=n;seen[n]=(seen[n]||0)+1}});
              Object.keys(m).forEach(k=>{if(seen[m[k]]>1)m[k]=m[k]+" ("+k+")"});
              done(m);
            }).catch(()=>done({}));
          }catch(e){done({})}
        });
      }catch(e){done({})}
    });
  }catch(e){}
}
const uniq=a=>[...new Set(a.filter(Boolean))].sort();

function chrome(){
  $("#tabs").innerHTML=VIEWS.map(v=>`<button type="button" data-v="${v[0]}">${v[1]}${v[0]==="followup"?'<span class="cnt" id="navcnt"></span>':""}</button>`).join("");
  $("#tabs").onclick=e=>{const b=e.target.closest("button");if(b)go(b.dataset.v)};
  const cc=COMPANIES.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("#fc").innerHTML='<option value="">All companies</option>'+cc;
  $("#fl").innerHTML='<option value="">All locations</option>'+uniq([...DATA.map(r=>r.loc),...EMP.map(e=>e.loc)]).sort((a,b)=>String(ln(a)).localeCompare(String(ln(b)))).map(c=>`<option value="${esc(c)}">${esc(ln(c))}</option>`).join("");
  $("#fd").innerHTML='<option value="">All departments</option>'+uniq(DATA.map(r=>r.dept)).map(c=>`<option value="${esc(c)}">${esc(dLong(c))}</option>`).join("");
  const bind=(id,k)=>$(id).onchange=e=>{S[k]=e.target.value;render()};
  bind("#fc","co");bind("#fl","loc");bind("#fd","dept");bind("#ffrom","from");bind("#fto","to");
  $("#q").oninput=e=>{S.q=e.target.value;render()};
  $("#refresh").onclick=load;
  $("#reset").onclick=()=>{Object.assign(S,{from:addDays(SNAP,-60),to:addDays(SNAP,60),co:"",loc:"",dept:"",q:""});sync();render()};
  $("#ovx").onclick=closeOv;$("#ov").onclick=e=>{if(e.target.id==="ov")closeOv()};
  addEventListener("keydown",e=>{if(e.key==="Escape")closeOv()});
  sync();
}
function sync(){$("#ffrom").value=S.from;$("#fto").value=S.to;$("#fc").value=S.co;$("#fl").value=S.loc;$("#fd").value=S.dept;$("#q").value=S.q}
function go(v){S.view=v;render()}
function openOv(title,html){$("#ovt").textContent=title;$("#ovb").innerHTML=html;$("#ov").hidden=false;wire($("#ovb"))}
function closeOv(){$("#ov").hidden=true}

/* ---------- shared pieces ---------- */
function bars(items){const mx=Math.max(1,...items.map(i=>i.v));return `<div class="bars">`+items.map(i=>`<div class="bar" data-tip="${esc(i.n)}: ${i.v}${i.tip?" · "+esc(i.tip):""}"><span class="n" title="${esc(i.n)}">${esc(i.n)}</span><span class="t"><span class="f" style="width:${i.v?Math.max(2,i.v/mx*100):0}%;background:${COL[i.c]||i.c}"></span></span><span class="c">${i.fmt||i.v}</span></div>`).join("")+`</div>`}
const empty=t=>`<div class="empty">${t}</div>`;
function miniTable(rs){
  if(!rs.length)return empty("No employees in this group.");
  return `<div class="tw" style="max-height:60vh"><table><thead><tr><th class="ns">Employee</th><th class="ns">Vacation</th><th class="ns">Expected re-join</th><th class="ns num">Overdue</th><th class="ns">Status</th></tr></thead><tbody>${rs.map(r=>`<tr data-go-row="${esc(r.id)}" style="cursor:pointer"><td>${esc(r.name)}<small>${esc(r.employee.split(/\s*-\s*|\s+/)[0])} · ${esc(dShort(r.dept))}</small></td><td>${fmtS(r.frm)} → ${fmt(r.to)}</td><td>${fmt(r.rejoin)}</td><td class="num" style="${r.over?"color:var(--crit);font-weight:600":""}">${r.over||0}</td><td>${sChip(r.st)}</td></tr>`).join("")}</tbody></table></div>`;
}
function deptStack(rs){
  const ds=uniq(rs.map(r=>r.dept)).sort((a,b)=>rs.filter(r=>r.dept===b).length-rs.filter(r=>r.dept===a).length);
  if(!ds.length)return empty("No data.");
  const mx=Math.max(...ds.map(d=>rs.filter(r=>r.dept===d).length));
  return `<div class="bars">`+ds.map(d=>{const x=rs.filter(r=>r.dept===d);return `<div class="bar" style="grid-template-columns:minmax(60px,110px) 1fr 34px"><span class="n" title="${esc(dLong(d))}">${esc(dShort(d))}</span><span class="stack" style="width:${x.length/mx*100}%">${ST_ORDER.map(s=>{const n=x.filter(r=>r.st===s).length;return n?`<span style="flex:${n};background:${COL[ST[s]]}" data-tip="${esc(dLong(d))} · ${s}: ${n}"></span>`:""}).join("")}</span><span class="c">${x.length}</span></div>`}).join("")+`</div><div class="legend">${ST_ORDER.map(s=>`<span><i style="background:${COL[ST[s]]}"></i>${s}</span>`).join("")}</div>`;
}

/* ---------- KPI definitions ---------- */
function kpiDefs(rs){
  const o=rs.filter(open);
  const g=f=>rs.filter(f);
  return [
    ["Vacations",rs.length,"",()=>rs,"All annual leave over 2 days in the period"],
    ["On vacation",g(r=>r.st==="On Vacation").length,"info",()=>g(r=>r.st==="On Vacation")],
    ["Overdue",g(r=>r.st==="Overdue").length,"crit",()=>g(r=>r.st==="Overdue")],
    ["Not yet departed",g(r=>r.st==="Not Yet Departed").length,"warn",()=>g(r=>r.st==="Not Yet Departed")],
    ["Upcoming",g(r=>r.st==="Upcoming").length,"",()=>g(r=>r.st==="Upcoming")],
    ["Re-entry not recorded",o.filter(r=>r.re==="Not Recorded").length,"crit",()=>o.filter(r=>r.re==="Not Recorded"),"",1],
    ["Re-entry expired",o.filter(r=>r.re==="Expired").length,"crit",()=>o.filter(r=>r.re==="Expired")],
    ["Expiring in 7 days",o.filter(r=>r.re==="Expiring in 7 Days").length,"warn",()=>o.filter(r=>r.re==="Expiring in 7 Days")],
    ["Refund claimed · SAR",sar(rs.reduce((a,r)=>a+r.cl,0)),"",()=>g(r=>r.cl>0)],
    ["Refund received · SAR",sar(rs.reduce((a,r)=>a+r.rc,0)),"good",()=>g(r=>r.rc>0)],
    ["Refund pending · SAR",sar(rs.reduce((a,r)=>a+r.pd,0)),"crit",()=>g(r=>r.pd>0)],
  ];
}

/* ---------- views ---------- */
function vOverview(){
  const rs=rows(),defs=kpiDefs(rs);
  S._defs=defs;
  const kp=defs.map((k,i)=>`<button type="button" class="kpi ${k[5]&&k[1]?"kalert":""} ${S.kpi===k[0]?"sel":""}" data-kpi="${i}" aria-expanded="${S.kpi===k[0]}"><span class="l">${k[0]}</span><span class="v ${k[2]}">${k[1]}</span><span class="n">${S.kpi===k[0]?"Hide ▴":"Details ↗"}</span></button>`).join("");
  const sk=defs.find(k=>k[0]===S.kpi);
  const kpanel=sk?`<div class="kpanel"><header><h2>${esc(sk[0])} <span class="ct">${sk[3]().length} records</span></h2><button type="button" data-kclose>Close ✕</button></header>${miniTable(sk[3]())}</div>`:"";
  const o=rs.filter(open);
  const reBars=bars(["Expired","Expiring in 7 Days","Valid","Not Recorded"].map(n=>({n,v:o.filter(r=>r.re===n).length,c:{"Expired":"crit","Expiring in 7 Days":"warn","Valid":"good","Not Recorded":"mute"}[n]})));
  const stBars=bars(["Re-joined","On Vacation","Not Yet Departed","Upcoming","Overdue"].map(n=>({n,v:rs.filter(r=>r.st===n).length,c:ST[n]})).concat([{n:"Completed",v:rs.filter(r=>r.st==="Completed").length,c:"good",tip:"no re-join record"}]));
  const rfBars=bars(["Awaiting Airline","Claim Submitted","Partially Received","To Be Claimed"].map(n=>({n,v:rs.filter(r=>r.rf===n).reduce((a,r)=>a+r.pd,0),c:"accent",fmt:sar(rs.filter(r=>r.rf===n).reduce((a,r)=>a+r.pd,0))})));
  const act=rs.filter(r=>r.cm).sort((a,b)=>b.over-a.over);
  const actHtml=act.length?`<div class="act-box"><span class="t">ACTION NEEDED</span><ul>${act.map(r=>`<li><button type="button" data-go-row="${esc(r.id)}">${esc(r.cm)}</button></li>`).join("")}</ul></div>`:`<div class="act-box ok">No action needed for this selection.</div>`;
  const list=rs.slice().sort((a,b)=>(b.over-a.over)||(a.frm<b.frm?1:-1)).slice(0,12);
  const none=!rs.length&&S.co&&!DATA.some(r=>r.company===S.co)?`<div class="act-box" style="background:var(--warn-soft)"><span class="t" style="color:var(--warn)">NO DATA</span><span>ERPNext returned no annual leave records for ${esc(S.co)}. This account only has access to Durar Masagh Trading Company data.</span></div>`:"";
  return `${none}<div class="grid kpis one">${kp}</div>${kpanel}
  <div class="cols"><div class="card">${calendar(rs)}</div><div class="card"><h2>Location coverage</h2><div class="hint">Availability among active employees as of ${fmt(SNAP)}. On vacation and overdue count as away.</div>${coverage(rs)}</div></div>
  <div class="charts"><div><h3>Employees by vacation status</h3>${stBars}</div><div><h3>Exit re-entry (not yet returned)</h3>${reBars}</div><div><h3>Refund pending by status · SAR</h3>${rfBars}</div></div>
  ${actHtml}
  <h3 class="sec" style="display:flex;justify-content:space-between;align-items:baseline">Follow-up list: vacation, ticket, re-entry and refund <span style="font-weight:400;font-size:12px;color:var(--ink-3)">${rs.length} records · <a href="#followup" data-go="followup" style="color:var(--accent)">see all</a></span></h3>
  ${followTable(list,false)}`;
}
function coverage(rs){
  const q=S.co;
  const emps=EMP.filter(e=>!q||e.company===q);
  const locs=uniq([...emps.map(e=>e.loc),...rs.map(r=>r.loc)]);
  const items=locs.map(l=>{
    const tot=emps.filter(e=>e.loc===l).length;
    const aw=new Set(rs.filter(r=>r.loc===l&&away(r)).map(r=>r.employee)).size;
    const t=Math.max(tot,aw);return{l,t,aw,pct:t?Math.round((t-aw)/t*100):100};
  }).filter(i=>i.t).sort((a,b)=>b.t-a.t);
  if(!items.length)return empty("No employees for this selection.");
  return `<div class="cov">${items.map(i=>`<div class="cov-row" data-tip="${esc(ln(i.l))}: ${i.t-i.aw} available, ${i.aw} away"><div class="t"><span>${esc(ln(i.l))}</span><span>${i.pct}% available</span></div><div class="s">${i.t-i.aw} available · ${i.aw} away · ${i.t} employees</div><div class="meter"><i style="width:${i.pct}%;background:${i.pct>=75?"var(--good)":i.pct>=50?"var(--warn)":"var(--crit)"}"></i></div></div>`).join("")}</div>`;
}
function calendar(rs){
  const [Y,M]=S.calM.split("-").map(Number);
  const first=new Date(Y,M-1,1),n=new Date(Y,M,0).getDate();
  const cnt=d=>rs.filter(r=>r.frm<=d&&r.to>=d);
  let cells="";
  for(let i=0;i<first.getDay();i++)cells+=`<div class="day off"></div>`;
  for(let d=1;d<=n;d++){
    const s=`${Y}-${String(M).padStart(2,"0")}-${String(d).padStart(2,"0")}`,c=cnt(s).length;
    cells+=`<button type="button" class="day ${c>=9?"h3":c>=6?"h2":c>=1?"h1":""} ${s===SNAP?"today":""} ${S.calDay===s?"sel":""}" data-day="${s}"><b>${d}</b><small>${c?c+" on leave":""}</small></button>`;
  }
  const title=first.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
  let list="";
  if(S.calDay){const x=cnt(S.calDay);list=`<div class="day-list"><h3>${fmt(S.calDay)}: ${x.length} on annual leave</h3>${x.length?`<div class="pill-row">${x.map(r=>`<button class="pill" type="button" data-go-row="${esc(r.id)}">${esc(r.name)} · ${esc(dShort(r.dept))}</button>`).join("")}</div>`:empty("Nobody scheduled.")}</div>`}
  return `<div class="cal-head"><div><h2>Leave calendar</h2><div class="hint">Employees on annual leave per day. Click a day to see who.</div></div><div class="cal-nav"><button type="button" data-cal="-1" aria-label="Previous month">‹</button><span>${title}</span><button type="button" data-cal="1" aria-label="Next month">›</button></div></div>
  <div class="cal">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="dow">${d}</div>`).join("")}${cells}</div>${list}`;
}

function followTable(rs,sortable){
  const cols=[["name","Employee / Location"],["frm","Vacation"],["rejoin","Expected re-join"],["over","Days overdue","num"],["tk","Ticket status"],["reexp","Re-entry expiry"],["re","Re-entry status"],["rf","Refund status"],["cl","Claimed SAR","num"],["rc","Received SAR","num"],["pd","Pending SAR","num"],["x","Record","ns"]];
  const head=cols.map(c=>`<th data-k="${sortable&&c[2]!=="ns"?c[0]:""}" class="${c[2]||""} ${sortable&&c[2]!=="ns"?"":"ns"}" ${sortable&&S.sort.k===c[0]?`aria-sort="${S.sort.dir>0?"ascending":"descending"}"`:""}>${c[1]}</th>`).join("");
  const body=rs.map(r=>{
    
    return `<tr data-row="${esc(r.id)}" class="${r.prio==="High"?"hi":""}"><td><b style="font-weight:600">${esc(r.name)}</b><small>${esc(r.employee.split(/\s*-\s*|\s+/)[0])} · ${esc(ln(r.loc))}<br>${esc(dLong(r.dept))}</small></td><td>${fmtS(r.frm)} → ${fmt(r.to)}<br>${sChip(r.st)}</td><td>${fmt(r.rejoin)}${r.rev?" (rev.)":""}</td><td class="num" style="${r.over?"color:var(--crit);font-weight:600":""}">${r.over||0}</td><td>${esc(r.tk&&r.tk!=="No Ticket Record"?r.tk:"No Ticket Record")}</td><td>${fmt(r.reexp)}</td><td>${r.re==="Not Recorded"&&!open(r)?"–":reChip(r.re)}</td><td>${r.rf&&r.rf!=="Not Applicable"?esc(r.rf):"Not Applicable"}</td><td class="num">${sar(r.cl)}</td><td class="num">${sar(r.rc)}</td><td class="num">${sar(r.pd)}</td><td><a class="btn" data-erp="${esc(r.id)}" >Open ↗</a> <button class="btn" type="button" data-more="${esc(r.id)}">Details</button></td></tr>`;
  }).join("");
  return `<div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body||`<tr><td colspan="${cols.length}">${empty("No records match the filters.")}</td></tr>`}</tbody></table></div>`;
}
function detail(r){return `<div class="dl"><div><span>Leave application</span>${esc(r.id)}</div><div><span>Leave type</span>${esc(r.leave_type)} · ${r.days} days</div><div><span>Employee</span>${esc(r.employee)}</div><div><span>Company</span>${esc(r.company)}</div><div><span>Destination</span>${esc(r.dest||"–")}</div><div><span>Actual re-join</span>${fmt(r.act)}${r.late?` <b style="color:var(--warn)">(${r.late} d late)</b>`:""}</div><div><span>Re-entry (exit/entry)</span>${fmt(r.exit_reentry)}</div><div><span>Re-entry days left</span>${r.reexp?r.redays:"–"}</div><div><span>Ticket</span>${esc(r.tkno||"–")} ${r.air?"· "+esc(r.air):""}</div><div><span>Absence reported</span>${r.abs?"Yes":"No"}</div>${r.cm?`<div class="full"><span>Action comment</span>${esc(r.cm)}</div>`:""}${!r.matched?`<div class="full"><span>Note</span>No Employee Vacation Record exists for this leave, so status is derived from the leave dates.</div>`:""}</div><div class="dfoot">${sChip(r.st)} <button type="button" class="btn pri" data-go-row="${esc(r.id)}">Open ${r.evr?"Employee Vacation Record":"Leave Application"} ↗</button></div>`}

function vFollow(){
  let rs=rows();
  const tabs=["All","Needs action","Not back yet","Re-joined"];
  if(S.ftab==="Needs action")rs=rs.filter(r=>r.cm);
  if(S.ftab==="Not back yet")rs=rs.filter(open);
  if(S.ftab==="Re-joined")rs=rs.filter(r=>!open(r));
  const{k,dir}=S.sort;
  rs=[...rs].sort((a,b)=>{let x=a[k],y=b[k];if(x==null)x="";if(y==null)y="";return(x>y?1:x<y?-1:0)*dir});
  return `<div class="sub-tabs">${tabs.map(t=>`<button type="button" data-ft="${t}" aria-pressed="${S.ftab===t}">${t}</button>`).join("")}<span class="ct">${rs.length} records</span></div>${followTable(rs,true)}<div class="note">Click a row to open its Employee Vacation Record. Details opens a quick summary. Click a column header to sort.</div>
  <h3 class="sec" style="margin-top:22px">Airfare refund claims</h3>${refundTable(rows())}`;
}
function refundTable(rs){
  const x=rs.filter(r=>r.rf&&r.rf!=="Not Applicable");
  if(!x.length)return `<div class="card">${empty("No airfare refund claims for this selection.")}</div>`;
  return `<div class="tw"><table><thead><tr><th class="ns">Claim / Employee</th><th class="ns">Location</th><th class="ns">Vacation</th><th class="ns">Ticket</th><th class="ns">Status</th><th class="ns num">Claimed SAR</th><th class="ns num">Received SAR</th><th class="ns num">Pending SAR</th><th class="ns">Action required</th></tr></thead><tbody>${x.map(r=>`<tr data-go-row="${esc(r.id)}" style="cursor:pointer"><td>${esc(r.name)}<small>${esc(r.id)}</small></td><td>${esc(ln(r.loc))}</td><td>${fmtS(r.frm)} → ${fmt(r.to)}</td><td>${chip(r.tk,/Cancelled/.test(r.tk)?"crit":"info")}</td><td>${chip(r.rf,"warn")}</td><td class="num">${sar(r.cl)}</td><td class="num">${sar(r.rc)}</td><td class="num">${sar(r.pd)}</td><td>${esc(r.prio?"Follow up ("+r.prio+")":"–")}</td></tr>`).join("")}</tbody></table></div>`;
}

function vTimeline(){
  const all=rows(),tabs=["Active","Upcoming","Recently back"];
  const hdr=`<div class="sub-tabs">${tabs.map(t=>`<button type="button" data-tt="${t}" aria-pressed="${S.ttab===t}">${t}</button>`).join("")}</div>`;
  let rs;
  if(S.ttab==="Active")rs=all.filter(away);
  else if(S.ttab==="Upcoming")rs=all.filter(r=>["Not Yet Departed","Upcoming"].includes(r.st));
  else rs=all.filter(r=>!open(r)&&days(r.act||r.to,SNAP)<=60&&days(r.act||r.to,SNAP)>=0);
  rs=[...rs].sort((a,b)=>a.frm>b.frm?1:-1);
  if(!rs.length)return hdr+`<div class="card">${empty("Nothing in this group for the current filters.")}</div>`;
  const pts=rs.flatMap(r=>[r.frm,r.act||r.rejoin,SNAP,r.to]);
  const lo=addDays(pts.reduce((a,b)=>a<b?a:b),-4),hi=addDays(pts.reduce((a,b)=>a>b?a:b),6);
  const avail=($("#v-timeline").clientWidth||1100)-44;
  const W=Math.max(720,Math.min(avail,1500)),L=190,RH=34,TOP=40,H=rs.length*RH+TOP+10,RX=W-14;
  const span=Math.max(30,days(lo,hi));
  const x=d=>L+(days(lo,d)/span)*(RX-L);
  let grid="";
  const t=new Date(D(lo).getFullYear(),D(lo).getMonth(),1);
  for(;t<=D(hi);t.setMonth(t.getMonth()+1)){
    const xa=Math.max(L,x(iso(t)));if(xa>=RX)continue;
    grid+=`<line x1="${xa}" x2="${xa}" y1="${TOP-10}" y2="${H}" stroke="var(--line)"/><text x="${xa+6}" y="${TOP-16}" class="gm">${t.toLocaleDateString("en-GB",{month:"short",year:"numeric"})}</text>`;
  }
  const rowsSvg=rs.map((r,i)=>{
    const y=TOP+i*RH,c=COL[ST[r.st]],bx=x(r.frm),bw=Math.max(5,x(addDays(r.to,1))-bx);
    const sep=`<line x1="0" x2="${W}" y1="${y+RH}" y2="${y+RH}" stroke="var(--line)" opacity=".6"/>`;
    const over=r.st==="Overdue"?`<rect x="${x(addDays(r.to,1))}" y="${y+11}" width="${Math.max(3,x(SNAP)-x(addDays(r.to,1)))}" height="12" rx="6" fill="var(--crit)" fill-opacity=".15" stroke="var(--crit)" stroke-dasharray="3 3"/>`:"";
    const back=r.act?`<path d="M${x(r.act)} ${y+11} l6 6 l-6 6 l-6 -6 z" fill="${r.late?"var(--warn)":"var(--good)"}" stroke="var(--sheet)" stroke-width="1.5"/>`:"";
    const lbl=bw>34?`<text x="${bx+bw/2}" y="${y+21}" text-anchor="middle" class="gb">${r.days}d</text>`:"";
    const nm=r.name.length>24?r.name.slice(0,23)+"…":r.name;
    return `${sep}<g data-go-row="${esc(r.id)}" style="cursor:pointer"><rect x="0" y="${y}" width="${W}" height="${RH}" fill="transparent"/><text x="12" y="${y+15}" class="gn">${esc(nm)}</text><text x="12" y="${y+27}" class="gs">${esc(dShort(r.dept))} · ${esc(ln(r.loc))}</text>${over}<rect x="${bx}" y="${y+9}" width="${bw}" height="16" rx="8" fill="${c}" data-tip="${esc(r.name)} · ${fmt(r.frm)} → ${fmt(r.to)} (${r.days} d) · ${r.st}${r.over?" · "+r.over+" d overdue":""}${r.act?" · back "+fmt(r.act):""}"/>${lbl}${back}</g>`}).join("");
  const tx=x(SNAP);
  const longest=Math.max(...rs.map(r=>r.days)),ov=rs.filter(r=>r.st==="Overdue").length;
  const sum=`<div class="gsum"><div><b>${rs.length}</b><span>vacations shown</span></div><div><b>${Math.round(rs.reduce((a,r)=>a+r.days,0)/rs.length)}</b><span>avg. days</span></div><div><b>${longest}</b><span>longest (days)</span></div><div><b style="color:${ov?"var(--crit)":"inherit"}">${ov}</b><span>overdue</span></div></div>`;
  const leg=`<div class="legend">${["On Vacation","Not Yet Departed","Upcoming","Overdue","Re-joined","Completed"].map(s=>`<span><i style="background:${COL[ST[s]]};border-radius:6px;width:16px"></i>${s}</span>`).join("")}<span><i style="border:1px dashed var(--crit);background:transparent;border-radius:6px;width:16px"></i>Past expected re-join</span><span><i style="background:var(--warn);transform:rotate(45deg);width:8px;height:8px"></i>Returned late</span><span><i style="background:var(--good);transform:rotate(45deg);width:8px;height:8px"></i>On time</span></div>`;
  return hdr+sum+`<div class="card"><h2>${S.ttab} vacations</h2><div class="hint">Hover a bar for details, click to open the record. Today is ${fmt(SNAP)}.</div><div class="gantt"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vacation timeline">${grid}${rowsSvg}<line x1="${tx}" x2="${tx}" y1="${TOP-10}" y2="${H}" stroke="var(--accent)" stroke-width="1.5"/><rect x="${tx-21}" y="${TOP-30}" width="42" height="15" rx="7.5" fill="var(--accent)"/><text x="${tx}" y="${TOP-19}" text-anchor="middle" style="fill:#fff;font-size:10px;font-weight:600">Today</text></svg></div>${leg}</div>`;
}

function vDepts(){
  const rs=rows(),ds=uniq(rs.map(r=>r.dept));
  const st=ds.map(d=>{const x=rs.filter(r=>r.dept===d),b=x.filter(r=>!open(r)&&r.act);return{d,n:x.length,away:x.filter(r=>r.st==="On Vacation").length,over:x.filter(r=>r.st==="Overdue").length,soon:x.filter(r=>["Not Yet Departed","Upcoming"].includes(r.st)).length,late:b.filter(r=>r.late>0).length,back:b.length,dl:b.reduce((a,r)=>a+r.late,0),len:x.reduce((a,r)=>a+r.days,0)}}).sort((a,b)=>b.n-a.n);
  return `<div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))"><div class="card"><h2>Status mix by department</h2><div class="hint">Annual leave records in the selection</div>${deptStack(rs)}</div><div class="card"><h2>Vacation days per department</h2><div class="hint">Total leave days taken or booked</div>${bars(st.slice().sort((a,b)=>b.len-a.len).map(s=>({n:dShort(s.d),v:s.len,c:"accent",tip:dLong(s.d)})))}</div></div>
  <div class="tw"><table><thead><tr><th class="ns">Department</th><th class="ns num">Records</th><th class="ns num">Away now</th><th class="ns num">Overdue</th><th class="ns num">Upcoming</th><th class="ns num">Returned late</th><th class="ns num">Late days</th><th class="ns num">Vacation days</th></tr></thead><tbody>${st.map(s=>`<tr><td>${esc(dLong(s.d))}</td><td class="num">${s.n}</td><td class="num">${s.away}</td><td class="num" style="${s.over?"color:var(--crit);font-weight:600":""}">${s.over}</td><td class="num">${s.soon}</td><td class="num">${s.late}/${s.back}</td><td class="num">${s.dl}</td><td class="num">${s.len}</td></tr>`).join("")||`<tr><td colspan="8">${empty("No data.")}</td></tr>`}</tbody></table></div>
  <div class="note">Returned late counts re-joined records where the actual re-join date is after the expected date.</div>`;
}

function vTravel(){
  const rs=rows(),wt=rs.filter(r=>r.tk&&r.tk!=="No Ticket Record"),wr=rs.filter(r=>r.rf&&r.rf!=="Not Applicable");
  const o=rs.filter(open),noT=o.filter(r=>r.tk==="No Ticket Record").length;
  const cl=wr.reduce((a,r)=>a+r.cl,0),rc=wr.reduce((a,r)=>a+r.rc,0),pd=wr.reduce((a,r)=>a+r.pd,0);
  const kp=[["Tickets recorded",wt.length,"info",`${noT} of ${o.length} open vacations have none`],["Refund claimed · SAR",sar(cl),"",""],["Refund received · SAR",sar(rc),"good",""],["Refund pending · SAR",sar(pd),pd?"crit":"",""]];
  const cnt=(a,k)=>{const m={};a.forEach(r=>m[r[k]||"–"]=(m[r[k]||"–"]||0)+1);return Object.entries(m).map(([n,v])=>({n,v,c:n==="No Ticket Record"?"mute":"info"}))};
  return `<div class="grid kpis one" style="--kn:4">${kp.map(k=>`<div class="kpi" style="cursor:default"><span class="l">${k[0]}</span><span class="v ${k[2]}">${k[1]}</span><span class="n" style="color:var(--ink-3)">${k[3]||"&nbsp;"}</span></div>`).join("")}</div>
  <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))"><div class="card"><h2>Ticket status</h2><div class="hint">Vacations not yet re-joined</div>${o.length?bars(cnt(o,"tk")):empty("None.")}</div><div class="card"><h2>Refund status</h2><div class="hint">Records with a refund claim</div>${wr.length?bars(cnt(wr,"rf").map(i=>({...i,c:"warn"}))):empty("No refunds to track.")}</div></div>
  <h3 class="sec">Airfare refund claims</h3>${refundTable(rs)}<div class="note">Amounts in SAR. Ticket and refund data is entered on the Employee Vacation Record; most records have none yet.</div>`;
}

function vReentry(){
  const rs=rows(),o=rs.filter(open),c=n=>o.filter(r=>r.re===n).length;
  const kp=[["Not yet back",o.length,"",""],["Not recorded",c("Not Recorded"),c("Not Recorded")?"crit":"","re-entry details missing"],["Valid",c("Valid"),"good",""],["Expiring in 7 days",c("Expiring in 7 Days"),"warn",""],["Expired",c("Expired"),"crit",""]];
  const need=o.filter(r=>r.re!=="Valid").sort((a,b)=>(b.over-a.over)||(a.frm>b.frm?1:-1));
  return `<div class="grid kpis one" style="--kn:5">${kp.map(k=>`<div class="kpi ${k[2]&&k[1]?"kalert":""}" style="cursor:default"><span class="l">${k[0]}</span><span class="v ${k[2]}">${k[1]}</span><span class="n" style="color:var(--ink-3)">${k[3]||"&nbsp;"}</span></div>`).join("")}</div>
  <h3 class="sec">Exit re-entry visas to record or renew</h3>${need.length?`<div class="tw"><table><thead><tr><th class="ns">Employee</th><th class="ns">Vacation</th><th class="ns">Status</th><th class="ns num">Overdue</th><th class="ns">Re-entry</th><th class="ns">Expiry</th><th class="ns num">Days left</th></tr></thead><tbody>${need.map(r=>`<tr data-go-row="${esc(r.id)}" style="cursor:pointer"><td>${esc(r.name)}<small>${esc(ln(r.loc))}</small></td><td>${fmtS(r.frm)} → ${fmt(r.to)}</td><td>${sChip(r.st)}</td><td class="num">${r.over||0}</td><td>${reChip(r.re)}</td><td>${fmt(r.reexp)}</td><td class="num">${r.reexp?r.redays:"–"}</td></tr>`).join("")}</tbody></table></div>`:`<div class="card">${empty("Every employee away has a valid re-entry visa.")}</div>`}`;
}


/* ---------- open the record in ERPNext ---------- */
const byId=id=>DATA.find(r=>r.id===id);
function openRecord(id){
  const r=byId(id);if(!r)return;closeOv();
  if(r.evr)frappe.set_route("Form","Employee Vacation Record",r.evr);
  else frappe.set_route("Form","Leave Application",r.id);
}

/* ---------- render ---------- */
const RENDER={overview:vOverview,followup:vFollow,timeline:vTimeline,depts:vDepts,travel:vTravel,reentry:vReentry};
function render(){
  VIEWS.forEach(v=>$("#v-"+v[0]).hidden=v[0]!==S.view);
  R.querySelectorAll("#tabs button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===S.view?"page":"false"));
  const rs=rows();
  $("#sub").textContent=`HR dashboard | as of ${fmt(SNAP)}`;
  $("#period").textContent=`Period: ${fmt(S.from)} – ${fmt(S.to)}`;
  const n=rs.filter(r=>r.cm).length;$("#navcnt").textContent=n;$("#navcnt").hidden=!n;
  const el=$("#v-"+S.view);el.innerHTML=RENDER[S.view]();wire(el);
}
function wire(el){
  el.querySelectorAll("[data-kpi]").forEach(b=>b.onclick=()=>{const k=S._defs[+b.dataset.kpi];S.kpi=S.kpi===k[0]?null:k[0];render();if(S.kpi){const p=$(".kpanel");if(p&&p.scrollIntoView)p.scrollIntoView({block:"nearest",behavior:"smooth"})}});
  el.querySelectorAll("[data-kclose]").forEach(b=>b.onclick=()=>{S.kpi=null;render()});
  el.querySelectorAll("[data-go]").forEach(b=>b.onclick=e=>{e.preventDefault();go(b.dataset.go)});
  el.querySelectorAll("[data-go-row]").forEach(b=>b.onclick=()=>openRecord(b.dataset.goRow));
  el.querySelectorAll("[data-ft]").forEach(b=>b.onclick=()=>{S.ftab=b.dataset.ft;render()});
  el.querySelectorAll("[data-tt]").forEach(b=>b.onclick=()=>{S.ttab=b.dataset.tt;render()});
  el.querySelectorAll("[data-more]").forEach(b=>b.onclick=e=>{e.stopPropagation();const r=byId(b.dataset.more);if(r)openOv(r.name+" · "+fmtS(r.frm)+" → "+fmt(r.to),detail(r))});
  el.querySelectorAll("tr[data-row]").forEach(t=>t.onclick=e=>{if(e.target.closest("button,a"))return;openRecord(t.dataset.row)});
  el.querySelectorAll("a[data-erp]").forEach(a=>a.onclick=e=>{e.preventDefault();e.stopPropagation();openRecord(a.dataset.erp)});
  el.querySelectorAll("th[data-k]").forEach(h=>{if(!h.dataset.k)return;h.onclick=()=>{const k=h.dataset.k;S.sort=S.sort.k===k?{k,dir:-S.sort.dir}:{k,dir:1};if(S.view==="overview")go("followup");else render()}});
  el.querySelectorAll("[data-cal]").forEach(b=>b.onclick=()=>{const[Y,M]=S.calM.split("-").map(Number);const d=new Date(Y,M-1+ +b.dataset.cal,1);S.calM=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;S.calDay=null;render()});
  el.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{S.calDay=S.calDay===b.dataset.day?null:b.dataset.day;render()});
}
const tip=$("#tip");
R.addEventListener("pointermove",e=>{const t=e.target.closest&&e.target.closest("[data-tip]");if(!t){tip.hidden=true;return}tip.textContent=t.dataset.tip;tip.hidden=false;tip.style.left=Math.min(e.clientX+14,innerWidth-270)+"px";tip.style.top=(e.clientY+14)+"px"});

/* ---------- data from ERPNext doctypes ---------- */
const LEAVE_TYPES=["Annual Leave DIRECT","Annual Leave INDIRECT"], MIN_DAYS=2, EX_LOC=["back office","work at home","work from home","work at site"];
const exLoc=l=>EX_LOC.includes(String(l||"").trim().toLowerCase());
const get=(doctype,fields,filters)=>frappe.xcall("frappe.client.get_list",{doctype,fields,filters:filters||[],limit_page_length:0});

function build(leave,evr,emps,comps){
  const empBy={};emps.forEach(e=>empBy[e.name]=e);
  EMP=emps.filter(e=>e.status!=="Left"&&!exLoc(e.custom_job_location)&&!/^test/i.test(e.employee_name||e.name))
    .map(e=>({id:e.name,company:e.company,dept:e.department,loc:e.custom_job_location||"Unassigned",status:e.status}));
  const byLA={},byKey={};
  evr.forEach(e=>{if(e.leave_application)byLA[e.leave_application]=e;byKey[e.employee+"|"+e.vacation_from]=e});
  DATA=leave.filter(l=>{const e=empBy[l.employee];
      return !(e&&e.status==="Left")&&!exLoc(l.custom_job_location)&&!(e&&exLoc(e.custom_job_location))})
    .map(l=>{
      const e=byLA[l.name]||byKey[l.employee+"|"+l.from_date]||null;
      const r={id:l.name,evr:e?e.name:null,matched:e?1:0,employee:l.employee,name:(l.employee_name||"").split(/\s+/).filter(Boolean).join(" "),
        company:l.company,dept:l.department,loc:l.custom_job_location||"Unassigned",leave_type:l.leave_type,frm:l.from_date,to:l.to_date,days:l.total_leave_days,
        dest:(l.custom_destination||"").trim()||null,exit_reentry:l.custom_reentry_date_as_per_exitentry,wf:l.workflow_state};
      if(e){
        Object.assign(r,{st:e.vacation_status,exp:e.expected_rejoin_date,rev:e.revised_rejoin_date,act:e.actual_rejoin_date,over:e.days_overdue||0,
          tk:e.ticket_status,tkno:e.ticket_no,air:e.airline,cl:e.refund_claimed||0,rc:e.refund_received||0,pd:e.refund_pending||0,rf:e.refund_status,
          re:e.reentry_status,reexp:e.reentry_expiry_date,redays:e.reentry_days_left,prio:e.action_priority||"",cm:e.action_comment||"",abs:e.absence_reported});
      }else{
        Object.assign(r,{exp:addDays(l.to_date,1),rev:null,act:null,over:0,tk:"No Ticket Record",tkno:null,air:null,cl:0,rc:0,pd:0,rf:"Not Applicable",re:null,reexp:null,redays:0,prio:"",cm:"",abs:0,
          st:SNAP<l.from_date?"Upcoming":SNAP<=l.to_date?"On Vacation":"Completed"});
      }
      r.late=(r.act&&r.exp)?Math.max(0,days(r.exp,r.act)):0;r.rejoin=r.rev||r.exp;
      return r;
    });
  // an employee with several overdue records: only the latest stays overdue
  const latest={};
  DATA.filter(r=>r.st==="Overdue").forEach(r=>{if(!latest[r.employee]||r.frm>latest[r.employee].frm)latest[r.employee]=r});
  DATA.forEach(r=>{if(r.st==="Overdue"&&latest[r.employee]!==r){r.st="Completed";r.over=0;r.prio="";r.cm=""}});
  COMPANIES=comps.map(c=>c.name).sort();
}
function fillFilters(){
  const keep={co:S.co,loc:S.loc,dept:S.dept};
  $("#fc").innerHTML='<option value="">All companies</option>'+COMPANIES.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("#fl").innerHTML='<option value="">All locations</option>'+uniq([...DATA.map(r=>r.loc),...EMP.map(e=>e.loc)]).sort((a,b)=>String(ln(a)).localeCompare(String(ln(b)))).map(c=>`<option value="${esc(c)}">${esc(ln(c))}</option>`).join("");
  $("#fd").innerHTML='<option value="">All departments</option>'+uniq(DATA.map(r=>r.dept)).map(c=>`<option value="${esc(c)}">${esc(dLong(c))}</option>`).join("");
  Object.assign(S,keep);sync();
}
function message(html){VIEWS.forEach(v=>{$("#v-"+v[0]).innerHTML=v[0]===S.view?`<div class="empty">${html}</div>`:""})}
async function load(){
  message("Loading vacation data from ERPNext…");
  try{
    const [leave,evr,emps,comps]=await Promise.all([
      get("Leave Application",["name","employee","employee_name","company","department","leave_type","from_date","to_date","total_leave_days","status","docstatus","workflow_state","custom_destination","custom_reentry_date_as_per_exitentry","custom_job_location"],
        [["leave_type","in",LEAVE_TYPES],["total_leave_days",">",MIN_DAYS],["status","=","Approved"],["docstatus","=",1],["to_date",">=",SNAP.slice(0,4)+"-01-01"]]),
      get("Employee Vacation Record",["name","employee","leave_application","vacation_from","vacation_to","revised_rejoin_date","expected_rejoin_date","actual_rejoin_date","vacation_status","days_overdue","ticket_no","airline","ticket_status","refund_claimed","refund_received","refund_pending","refund_status","reentry_expiry_date","reentry_status","reentry_days_left","absence_reported","action_priority","action_comment"]),
      get("Employee",["name","employee_name","company","department","custom_job_location","status"]),
      get("Company",["name"])
    ]);
    build(leave,evr,emps,comps);fillFilters();render();
  }catch(err){
    console.error(err);
    message("Could not load the data. Check that your user can read Leave Application, Employee Vacation Record, Employee and Company.");
  }
}

/* ---------- theme: follow the desk theme ---------- */
function applyTheme(){const dark=document.documentElement.getAttribute("data-theme")==="dark";$(".vt").classList.toggle("dark",dark)}

function init(){
  applyTheme();
  try{new MutationObserver(applyTheme).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}
  chrome();load();locLoad();
}
init();

})();

/* ===== i18n EN/AR — added 2026-11-15 (Phase 1D). Follows ERP User.language (frappe.boot.lang). English path is untouched. ===== */
(function (root, lang) {
  if (lang !== 'ar' || !root) return;
  var D = {
    "Vacation, Air Ticket, Refund & Exit Re-entry Tracker": "متتبع الإجازات وتذاكر الطيران والمبالغ المستردة وتأشيرات الخروج والعودة",
    "HR dashboard": "لوحة الموارد البشرية",
    "Overview": "نظرة عامة", "Follow-up list": "قائمة المتابعة", "Timeline": "الجدول الزمني", "Departments": "الأقسام",
    "Tickets & refunds": "التذاكر والمبالغ المستردة", "Exit re-entry": "الخروج والعودة",
    "From": "من", "To": "إلى", "Company": "الشركة", "All companies": "كل الشركات", "Location": "الموقع", "All locations": "كل المواقع",
    "Department": "القسم", "All departments": "كل الأقسام", "Search": "بحث", "Refresh": "تحديث", "Reset": "إعادة تعيين",
    "Vacations": "الإجازات", "Details ↗": "التفاصيل ↗", "On vacation": "في إجازة", "Overdue": "متأخر عن العودة", "Not yet departed": "لم يغادر بعد",
    "Upcoming": "قادمة", "Re-entry not recorded": "الخروج والعودة غير مسجل", "Re-entry expired": "انتهت تأشيرة الخروج والعودة",
    "Expiring in 7 days": "تنتهي خلال 7 أيام", "Refund claimed · SAR": "المبالغ المطالب باستردادها · ريال", "Refund received · SAR": "المبالغ المستردة · ريال",
    "Refund pending · SAR": "المبالغ المعلقة · ريال", "Leave calendar": "تقويم الإجازات",
    "Employees on annual leave per day. Click a day to see who.": "الموظفون في إجازة سنوية لكل يوم. انقر على يوم لعرض أسمائهم.",
    "Sun": "أحد", "Mon": "إثنين", "Tue": "ثلاثاء", "Wed": "أربعاء", "Thu": "خميس", "Fri": "جمعة", "Sat": "سبت",
    "Location coverage": "تغطية المواقع", "Employees by vacation status": "الموظفون حسب حالة الإجازة", "Re-joined": "عاد للعمل",
    "On Vacation": "في إجازة", "Not Yet Departed": "لم يغادر بعد", "Completed": "مكتملة", "Exit re-entry (not yet returned)": "الخروج والعودة (لم يعودوا بعد)",
    "Expired": "منتهية", "Expiring in 7 Days": "تنتهي خلال 7 أيام", "Valid": "سارية", "Not Recorded": "غير مسجلة",
    "Refund pending by status · SAR": "المبالغ المعلقة حسب الحالة · ريال", "Awaiting Airline": "بانتظار شركة الطيران", "Claim Submitted": "تم تقديم المطالبة",
    "Partially Received": "مستلمة جزئيًا", "To Be Claimed": "لم يُطالب بها بعد", "ACTION NEEDED": "يتطلب إجراء",
    "Follow-up list: vacation, ticket, re-entry and refund": "قائمة المتابعة: الإجازة والتذكرة والخروج والعودة والاسترداد",
    "see all": "عرض الكل", "Employee / Location": "الموظف / الموقع", "Vacation": "الإجازة", "Expected re-join": "تاريخ العودة المتوقع",
    "Days overdue": "أيام التأخير", "Ticket status": "حالة التذكرة", "Re-entry expiry": "انتهاء الخروج والعودة", "Re-entry status": "حالة الخروج والعودة",
    "Refund status": "حالة الاسترداد", "Claimed SAR": "المطالب به (ريال)", "Received SAR": "المستلم (ريال)", "Pending SAR": "المعلق (ريال)",
    "Record": "السجل", "No Ticket Record": "لا يوجد سجل تذكرة", "Not Applicable": "لا ينطبق", "Open ↗": "فتح ↗", "Details": "التفاصيل",
    "Close": "إغلاق", "Close ✕": "إغلاق ✕", "Views": "العروض", "Employee name or ID": "اسم الموظف أو رقمه", "Previous month": "الشهر السابق",
    "Next month": "الشهر التالي", "All": "الكل", "Needs action": "يتطلب إجراء", "Not back yet": "لم يعد بعد", "Returned": "عاد",
    "Click a row to open its Employee Vacation Record. Details opens a quick summary. Click a column header to sort.": "انقر على صف لفتح سجل إجازة الموظف. يعرض زر «التفاصيل» ملخصًا سريعًا. انقر على عنوان عمود للفرز.",
    "Airfare refund claims": "مطالبات استرداد قيمة التذاكر", "No airfare refund claims for this selection.": "لا توجد مطالبات استرداد لهذا التحديد.",
    "Active": "نشط", "Recently back": "عاد مؤخرًا", "vacations shown": "إجازة معروضة", "avg. days": "متوسط الأيام", "longest (days)": "الأطول (أيام)",
    "overdue": "متأخر", "Today": "اليوم", "Past expected re-join": "تجاوز تاريخ العودة المتوقع", "Returned late": "عاد متأخرًا", "On time": "في الموعد",
    "Vacation timeline": "الجدول الزمني للإجازات", "Status mix by department": "توزيع الحالات حسب القسم",
    "Annual leave records in the selection": "سجلات الإجازة السنوية ضمن التحديد", "Vacation days per department": "أيام الإجازة لكل قسم",
    "Total leave days taken or booked": "إجمالي أيام الإجازة المأخوذة أو المحجوزة", "Records": "السجلات", "Away now": "غائب حاليًا",
    "Late days": "أيام التأخير", "Vacation days": "أيام الإجازة",
    "Returned late counts re-joined records where the actual re-join date is after the expected date.": "يحتسب «عاد متأخرًا» السجلات التي كان فيها تاريخ العودة الفعلي بعد التاريخ المتوقع.",
    "Tickets recorded": "التذاكر المسجلة", "Vacations not yet re-joined": "إجازات لم يعد أصحابها بعد", "Records with a refund claim": "سجلات بها مطالبة استرداد",
    "No refunds to track.": "لا توجد مبالغ مستردة للمتابعة.",
    "Amounts in SAR. Ticket and refund data is entered on the Employee Vacation Record; most records have none yet.": "المبالغ بالريال السعودي. تُدخل بيانات التذاكر والاسترداد في سجل إجازة الموظف، ومعظم السجلات لا تحتوي عليها بعد.",
    "Not yet back": "لم يعد بعد", "Not recorded": "غير مسجل", "re-entry details missing": "بيانات الخروج والعودة ناقصة",
    "Exit re-entry visas to record or renew": "تأشيرات خروج وعودة يلزم تسجيلها أو تجديدها", "Employee": "الموظف", "Status": "الحالة",
    "Re-entry": "الخروج والعودة", "Expiry": "الانتهاء", "Days left": "الأيام المتبقية",
    "None": "لا يوجد", "No employees in this group.": "لا يوجد موظفون في هذه المجموعة.", "No data.": "لا توجد بيانات.",
    "No employees for this selection.": "لا يوجد موظفون لهذا التحديد.", "Nothing in this group for the current filters.": "لا يوجد شيء في هذه المجموعة وفق عوامل التصفية الحالية.",
    "Left": "غادر", "Unassigned": "غير محدد", "Loading vacation data from ERPNext…": "جارٍ تحميل بيانات الإجازات من ERPNext…", "Approved": "معتمد",
    "Could not load the data. Check that your user can read Leave Application, Employee Vacation Record, Employee and Company.": "تعذّر تحميل البيانات. تأكد من أن لديك صلاحية قراءة طلب الإجازة وسجل إجازة الموظف والموظف والشركة.",
    "No action needed for this selection.": "لا يلزم أي إجراء لهذا التحديد.", "NO DATA": "لا توجد بيانات", "Leave application": "طلب الإجازة",
    "Leave type": "نوع الإجازة", "Destination": "الوجهة", "Actual re-join": "تاريخ العودة الفعلي", "Re-entry (exit/entry)": "الخروج والعودة",
    "Re-entry days left": "الأيام المتبقية للخروج والعودة", "Ticket": "التذكرة", "Absence reported": "تم الإبلاغ عن الغياب",
    "Action comment": "ملاحظة الإجراء", "Note": "ملاحظة",
    "No Employee Vacation Record exists for this leave, so status is derived from the leave dates.": "لا يوجد سجل إجازة موظف لهذه الإجازة، لذا تُستنتج الحالة من تواريخ الإجازة.",
    "Claim / Employee": "المطالبة / الموظف", "Action required": "يتطلب إجراء"
  };
  var MONTHS = {January:"يناير",February:"فبراير",March:"مارس",April:"أبريل",May:"مايو",June:"يونيو",July:"يوليو",August:"أغسطس",September:"سبتمبر",October:"أكتوبر",November:"نوفمبر",December:"ديسمبر",
    Jan:"يناير",Feb:"فبراير",Mar:"مارس",Apr:"أبريل",Jun:"يونيو",Jul:"يوليو",Aug:"أغسطس",Sept:"سبتمبر",Sep:"سبتمبر",Oct:"أكتوبر",Nov:"نوفمبر",Dec:"ديسمبر"};
  var R = [
    [/\bHR dashboard\b/, "لوحة الموارد البشرية"], [/\bas of\b/g, "حتى"], [/^Period: (.+)$/, "الفترة: $1"], [/^(\d+) on leave$/, "$1 في إجازة"],
    [/Availability among active employees as of/, "نسبة التوفر بين الموظفين النشطين حتى"],
    [/On vacation and overdue count as away\./, "يُحتسب من هم في إجازة والمتأخرون عن العودة كغائبين."],
    [/(\d+)% available/, "$1% متاح"], [/(\d+) available · (\d+) away · (\d+) employees/, "$1 متاح · $2 غائب · $3 موظف"],
    [/ days overdue \(expected re-join /, " يوم تأخير (العودة المتوقعة "], [/exit re-entry not recorded/g, "الخروج والعودة غير مسجل"],
    [/Report status: No\./, "حالة الإبلاغ: لا."], [/Report status: Yes\./, "حالة الإبلاغ: نعم."],
    [/^(\d+) records( ·)?$/, "$1 سجل$2"], [/^Hover a bar for details, click to open the record\. Today is (.+)$/, "مرّر المؤشر فوق شريط لعرض التفاصيل، وانقر لفتح السجل. اليوم هو $1"],
    [/^(\d+) of (\d+) open vacations have none$/, "$1 من $2 إجازة مفتوحة بلا بيانات"], [/^Follow up \((\d+)\)$/, "متابعة ($1)"], [/^Follow up \($/, "متابعة ("]
  ];
  var MRX = /(\d{1,2}\s)?\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b(\s\d{2,4})?/g;
  function t(s) {
    var k = s.replace(/\s+/g, " ").trim(); if (!k) return s;
    var out = null;
    if (Object.prototype.hasOwnProperty.call(D, k)) out = D[k];
    else {
      var v = k, hit = false;
      for (var i = 0; i < R.length; i++) { if (R[i][0].test(v)) { v = v.replace(R[i][0], R[i][1]); hit = true; } R[i][0].lastIndex = 0; }
      if (/\d/.test(v)) v = v.replace(MRX, function (m, d, mon, y) { if (!d && !y) return m; hit = true; return (d || "") + MONTHS[mon] + (y || ""); });
      if (hit) out = v;
    }
    if (out === null || out === k) return s;
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    return lead + out + trail;
  }
  var ATTRS = ["placeholder", "title", "aria-label"];
  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) { var nv = t(node.nodeValue); if (nv !== node.nodeValue) node.nodeValue = nv; return; }
    if (node.nodeType !== 1 && node.nodeType !== 11) return;
    if (node.nodeType === 1) {
      var tag = node.tagName; if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" && node.type !== "button" && node.type !== "submit" && false) return;
      for (var a = 0; a < ATTRS.length; a++) { var av = node.getAttribute && node.getAttribute(ATTRS[a]); if (av) { var na = t(av); if (na !== av) node.setAttribute(ATTRS[a], na); } }
    }
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  var vt = root.querySelector ? root.querySelector(".vt") : null; if (!vt) return;
  vt.setAttribute("dir", "rtl"); vt.setAttribute("lang", "ar"); vt.classList.add("vt-ar");
  var st = document.createElement("style");
  st.textContent = ".vt.vt-ar{text-align:right}.vt.vt-ar th,.vt.vt-ar td{text-align:right}.vt.vt-ar input,.vt.vt-ar select{direction:rtl}.vt.vt-ar svg{direction:ltr}.vt.vt-ar input[type=date]{direction:ltr;text-align:right}";
  (root.appendChild ? root : vt).appendChild(st);
  walk(vt);
  var busy = false;
  try {
    new MutationObserver(function (muts) {
      if (busy) return; busy = true;
      try { for (var i = 0; i < muts.length; i++) { var m = muts[i]; if (m.type === "characterData") walk(m.target); else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); if (m.type === "attributes") walk(m.target); } }
      finally { busy = false; }
    }).observe(vt, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  } catch (e) {}
  window.__vt_i18n_keys = Object.keys(D).length;
})(typeof root_element !== "undefined" ? root_element : null, (window.frappe && frappe.boot && frappe.boot.lang === "ar") ? "ar" : "en");
