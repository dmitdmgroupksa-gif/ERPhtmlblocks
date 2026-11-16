const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let engine;try{engine=require('playwright');}catch{engine=require('../../../.local/audit/node_modules/playwright');}
const {chromium}=engine;
const repo=path.resolve(__dirname,'../../..');
const base=path.join(repo,'08. Operations & Logistics/Production Dashboard')+path.sep;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PRODUCTION_TEST_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});const page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<div id="test"></div>');
 await page.evaluate(({html,css})=>{const shadow=document.querySelector('#test').attachShadow({mode:'open'});shadow.innerHTML='<style>'+css+'</style>'+html;window.root_element=shadow;
  window.calls=[];window.failStock=false;window.frappe={datetime:{get_today:()=> '2026-11-16'},call:({method,args,callback,error})=>{
   window.calls.push({method,args});setTimeout(()=>{try{
    if(args.doctype==='Stock Entry'&&window.failStock){error({message:'Stock permission denied'});return;}
    const names={F1:{name:'F1',factory_name:'Factory One',company:'DM',legacy_branch_label:'28 Factory',warehouses:[{warehouse:'WH1',mapping_status:'Confirmed'}]},F2:{name:'F2',factory_name:'Factory Two',company:'DM',legacy_branch_label:'34 Factory',warehouses:[{warehouse:'WH2',mapping_status:'Confirmed'}]}};
    const stock={name:'SE1',company:'DM',items:[{item_code:'A',stock_uom:'Kg',transfer_qty:7,is_finished_item:1,t_warehouse:'WH1',amount:70,quality_inspection:'QI1'},{item_code:'Raw',stock_uom:'Kg',transfer_qty:9,s_warehouse:'WH1',amount:50}]};
    const tables={'Manufacturing Factory':Object.values(names),'Company':[{name:'DM',default_currency:'SAR'}],'Work Order':Array.from({length:125},(_,i)=>({name:'WO'+String(i).padStart(3,'0'),production_item:'A',stock_uom:'Kg',qty:10,produced_qty:2,fg_warehouse:i%2?'WH2':'WH1',company:'DM',status:'In Process'})),'Stock Entry':[stock],'Factory Job Order':[{name:'J1',branch:'28 Factory',date:'2026-11-01',jo_status:'Open',details:[{employee:'E1'}]}],'Factory Daily Production':[{name:'D1',branch:'28 Factory',details:[{date:'2026-11-01',employee:'E1',duty_hours:8,ot_hrs:2,total_price:20}]}],'Daily Production Cost':[{name:'C1',date:'2026-11-01',branch:'28 Factory',total_cost_summary:20,details:[{total_cost:20,activity:'Cutting'}]}],'Manufacturing Production Target':[{name:'T1',factory:'F1',target_qty:10,item_code:'A',uom:'Kg'}],'Quality Inspection':[{name:'QI1',status:'Accepted',item_code:'A',report_date:'2026-11-01'}]};
    let result;if(method==='frappe.client.get'){result=args.doctype==='Manufacturing Factory'?names[args.name]:(tables[args.doctype]||[]).find(d=>d.name===args.name);}else{const list=tables[args.doctype]||[];const start=args.limit_start||0;result=list.slice(start,args.limit_page_length?start+args.limit_page_length:undefined);}
    callback({message:result});
   }catch(e){error(e);}},1);
  }};
 },{html:fs.readFileSync(base+'dashboard.html','utf8'),css:fs.readFileSync(base+'dashboard.css','utf8')});
 await page.addScriptTag({content:fs.readFileSync(base+'dashboard.js','utf8')});
 await page.waitForFunction(()=>root_element.querySelector('.pcc-current-status')?.classList.contains('success'));
 assert.equal(await page.locator('.pcc-filterbar input[type=date]').first().inputValue(),'2026-11-01');
 assert.equal(await page.locator('.pcc-filterbar select').nth(1).inputValue(),'month');
 assert(!(await page.locator('.pcc-shell').innerText()).includes('Filters not connected'));
 const before=await page.evaluate(()=>calls.length);await page.locator('.pcc-refresh-live').click();await page.waitForFunction(n=>calls.length>n,before);await page.waitForFunction(()=>!root_element.querySelector('.pcc-refresh-live').disabled);
 await page.locator('.pcc-nav label[for=pcc-workorders]').click();assert((await page.locator('.pcc-page-workorders .pcc-pager').first().innerText()).includes('125'));
 await page.locator('.pcc-page-workorders [data-page-delta="1"]').first().click();assert((await page.locator('.pcc-page-workorders .pcc-pager').first().innerText()).includes('2 / 3'));
 await page.locator('select[data-filter=factory]').selectOption('F1');assert((await page.locator('.pcc-page-workorders .pcc-pager').first().innerText()).includes('63'));
 await page.locator('select[data-filter=period]').selectOption('today');await page.waitForTimeout(400);await page.waitForFunction(()=>!root_element.querySelector('.pcc-refresh-live').disabled);assert.equal(await page.locator('input[aria-label="From date"]').inputValue(),'2026-11-16');
 await page.locator('input[aria-label="From date"]').fill('2026-11-01');await page.locator('input[aria-label="From date"]').dispatchEvent('change');assert.equal(await page.locator('select[data-filter=period]').inputValue(),'custom');await page.waitForTimeout(400);await page.waitForFunction(()=>!root_element.querySelector('.pcc-refresh-live').disabled);
 await page.locator('.pcc-language label[for=pcc-ar]').click();assert.equal(await page.locator('.pcc-shell').evaluate(el=>getComputedStyle(el).direction),'rtl');assert.equal(await page.locator('select[data-filter=period] option[value=custom]').textContent(),'مخصص');
 await page.locator('.pcc-nav label[for=pcc-quality]').click();assert((await page.locator('.pcc-page-quality').innerText()).includes('QI1'));
 await page.evaluate(()=>{window.failStock=true;});await page.locator('.pcc-refresh-live').click();await page.waitForFunction(()=>root_element.querySelector('.pcc-current-status')?.classList.contains('warning'));
 await page.locator('.pcc-nav label[for=pcc-output]').click();assert((await page.locator('.pcc-page-output').innerText()).includes('Stock permission denied'));
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(repo,'.local/audit/production-checked.png'),fullPage:true});
 await browser.close();console.log('PASS browser: initial dates, refresh, 125-row pagination, factory filtering, period/custom date changes, RTL, quality records, isolated permission failure; no page errors.');
})().catch(e=>{console.error(e);process.exit(1);});
