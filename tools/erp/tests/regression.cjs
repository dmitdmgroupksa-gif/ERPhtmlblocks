const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
let acorn;try{acorn=require('acorn');}catch{acorn=require('../../../.local/audit/node_modules/acorn');}
const root=path.resolve(__dirname,'../../..');
function code(file){return fs.readFileSync(path.join(root,file),'utf8');}
function functions(file,names,context){
 const source=code(file),ast=acorn.parse(source,{ecmaVersion:'latest'}),found={};
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&names.includes(n.id.name))found[n.id.name]=source.slice(n.start,n.end);for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
 walk(ast);for(const name of names)assert(found[name],name+' missing');
 return vm.runInNewContext(Object.values(found).join('\n')+';({'+names.join(',')+'})',context);
}
const finance='04. Finance & Credit Control/';let checks=0;
function test(name,fn){fn();checks++;process.stdout.write('PASS '+name+'\n');}
const ap=functions(finance+'Accounts Payable/dashboard.js',['invoiceBalance'],{curOf:()=> 'SAR'}).invoiceBalance;
test('SAR party balances are not converted a second time',()=>assert.equal(ap({company:'DM',party_account_currency:'SAR',currency:'USD',conversion_rate:3.755,outstanding_amount:100}),100));
test('Foreign party balances convert only from their verified invoice currency',()=>assert.equal(ap({company:'DM',party_account_currency:'USD',currency:'USD',conversion_rate:3.75,outstanding_amount:100}),375));
test('Unknown currency basis fails instead of assuming a rate',()=>assert.throws(()=>ap({company:'DM',party_account_currency:'EUR',currency:'USD',conversion_rate:3.75,outstanding_amount:100})));
const base=functions(finance+'Finance Internal Controller/dashboard.js',['baseBalance'],{COMPANY_CURRENCIES:{DM:'SAR',Foreign:'USD'},CUR:'SAR'}).baseBalance;
test('Grouped outstanding respects party currency',()=>assert.equal(base({company:'DM',party_account_currency:'SAR',currency:'AED',conversion_rate:1.024,o:500}),500));
test('Mixed company-base currencies fail instead of being added',()=>assert.throws(()=>base({company:'Foreign',party_account_currency:'USD',currency:'USD',conversion_rate:1,o:500})));
const unique=functions(finance+'Blocked Customer Dashboard/CP Blocked Customer/dashboard.js',['uniqueCustomers'],{isDataRow:r=>r.customer_name&&r.customer_name!=='Total'}).uniqueCustomers;
test('Customer balances count once across salesperson rows',()=>{const row={customer_id:'C1',customer_name:'Same',actual_outstanding:100,is_blocked:1};assert.equal(unique([row,{...row}]).length,1);});
test('Different customer IDs with the same display name stay separate',()=>assert.equal(unique([{customer_id:'C1',customer_name:'Same'},{customer_id:'C2',customer_name:'Same'}]).length,2));
test('Conflicting duplicated amounts are rejected',()=>assert.throws(()=>unique([{customer_id:'C1',customer_name:'A',actual_outstanding:1},{customer_id:'C1',customer_name:'A',actual_outstanding:2}])));
const production=functions('08. Operations & Logistics/Production Dashboard/dashboard.js',['belongsToFactory','groupValues'],{state:{factory:'F1'},FACTORIES:[{name:'F1',company:'DM',legacy_branch_label:'Factory 1',confirmedWarehouses:['WH1']} ]});
test('Production finds child warehouse receipts without a header warehouse',()=>assert.equal(production.belongsToFactory({items:[{t_warehouse:'WH1'}]},'stock'),true));
test('Production excludes unconfirmed/unmapped warehouses',()=>assert.equal(production.belongsToFactory({items:[{t_warehouse:'WH2'}]},'stock'),false));
test('Production groups quantities by item and unit',()=>{const groups=production.groupValues([{item:'A',uom:'Kg',qty:2},{item:'A',uom:'Nos',qty:3}],r=>r.item+'/'+r.uom,r=>r.qty);assert.equal(groups.length,2);});
const period=functions(finance+'Finance Internal Controller/dashboard.js',['periodHits'],{S:{company:'',from:'',to:''},gl:(dt,options)=>{assert(!options.filters.some(f=>f[0]==='disabled'));return Promise.resolve([]);}}).periodHits;
const reference=functions(finance+'Credit Controller Dashboard/dashboard.js',['reportReferenceTotal'],{}).reportReferenceTotal;
test('Native report reference excludes its generated total row',()=>assert.equal(reference({columns:[{fieldname:'sales_person'}],result:[{sales_person:'A',total_collection:100},{sales_person:'B',total_collection:200},{sales_person:'Total',total_collection:300}]},'total_collection'),300));
test('Unavailable reference fields never become a false zero',()=>assert.throws(()=>reference({columns:[{fieldname:'customer'}],result:[{customer:'C1'}]},'over_credit_limit_customer_count')));
const heading=functions('06. Technical & Projects/DM Contracting Dashboard/dashboard.js',['repairBlockHeading'],{}).repairBlockHeading;
const ceoJs=code('01. Leadership & Corporate/CEO Command Center/dashboard.js'),ceoApi=code('01. Leadership & Corporate/CEO Command Center/server_scripts/ceo_command_center_api.py');
test('CEO Command Centre calls only the single CEO API for dashboard data',()=>{const methods=[...ceoJs.matchAll(/ceo_command_center_[a-z_]+/g)].map(m=>m[0]);assert.deepEqual([...new Set(methods)],['ceo_command_center_api']);assert(!/frappe\.call\(|frappe\.client\.get_list|ar_asof/.test(ceoJs));});
test('CEO approvals write only through native workflow and comment endpoints',()=>{const m=[...ceoJs.matchAll(/post\('([\w.]+)'/g)].map(x=>x[1]);assert.deepEqual([...new Set(m)].sort(),['frappe.desk.form.utils.add_comment','frappe.model.workflow.apply_workflow']);assert(/reject\/i\.test\(c\.action\) && !c\.comment/.test(ceoJs),'reject requires a reason');});
test('CEO API is read-only (no insert/save/submit/delete/set_value/db.sql)',()=>assert(!/\.(insert|save|submit|delete_doc|set_value|db\.sql|db\.commit)\(/.test(ceoApi)));
test('CEO API avoids min()/max() aggregates this ERP rejects in get_list fields',()=>assert(!/"(min|max)\(/.test(ceoApi)));
test('CEO API avoids augmented assignment that safe_exec refuses',()=>assert(!/^[^#\n"]*[^=!<>]\+=|-=/m.test(ceoApi)));
test('Undefined heading is repaired only on the owning widget',()=>{const h={textContent:'undefined',setAttribute(){}};const widget={querySelector:()=>h};heading({getRootNode:()=>({host:{closest:()=>widget}})},'Contracting');assert.equal(h.textContent,'Contracting');});
test('An intentional custom widget heading is preserved',()=>{const h={textContent:'My custom heading',setAttribute(){throw Error('must not change');}};heading({getRootNode:()=>({host:{closest:()=>({querySelector:()=>h})}})},'Contracting');assert.equal(h.textContent,'My custom heading');});
test('Heading repair does not scan the document when no owning widget exists',()=>assert.doesNotThrow(()=>heading({getRootNode:()=>({})},'Contracting')));
async function main(){
 await period();checks++;console.log('PASS Accounting Period query has no nonexistent disabled filter');
 const fetched=functions('08. Operations & Logistics/Production Dashboard/dashboard.js',['fetchSource'],{PAGE_SIZE:100,callERP:async(method,args)=>Array.from({length:Math.min(args.limit_page_length,Math.max(0,1005-args.limit_start))},(_,i)=>({name:'WO'+(args.limit_start+i)}))}).fetchSource;
 const result=await fetched({doctype:'Work Order',key:'wo',date:'planned_start_date'},'2026-11-01','2026-11-16');assert.equal(result.rows.length,1005);assert.equal(result.complete,true);checks++;console.log('PASS Production loads complete sources beyond the former 1000-row ceiling');
 console.log(checks+' regression checks passed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
