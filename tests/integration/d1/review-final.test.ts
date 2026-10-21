import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { app } from '../../../src/worker/app';
import type { Env } from '../../../src/worker/env';
import { signJwt } from '../../../src/worker/jwt';
import { buildReport } from '../../../src/worker/reports';
import { runDailyExpiry } from '../../../src/worker/expiry';

const ts='2026-10-20T00:00:00.000Z',secret='final-review-access-secret-at-least-32-bytes';
let mf:Miniflare,db:D1Database,env:Env,headers:Record<string,string>;
async function applySql(source:string){let remaining=source.trim();while(remaining){let end:number;if(/^CREATE TRIGGER\b/i.test(remaining)){const match=/END;\s*(?=(?:CREATE|INSERT|$))/i.exec(remaining);if(!match)throw new Error('Could not split trigger migration');end=(match.index??0)+match[0].indexOf(';')+1;}else{end=remaining.indexOf(';')+1;if(end===0)throw new Error('Could not split migration statement');}await db.prepare(remaining.slice(0,end).trim()).run();remaining=remaining.slice(end).trim();}}
const json=(path:string,body:Record<string,unknown>,method='POST')=>app.request(path,{method,headers,body:JSON.stringify(body)},env);

beforeAll(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2025-09-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'44444444-4444-4444-8444-444444444444'}});db=(await mf.getBindings()).DB as D1Database;await applySql(await readFile(new URL('../../../migrations/d1/0001_fresh_schema.sql',import.meta.url),'utf8'));await applySql(await readFile(new URL('../../../migrations/d1/0002_seed_definitions.sql',import.meta.url),'utf8'));env={DB:db,APP_ENV:'local',ALLOWED_ORIGINS:'https://app.mtechcare.com',COOKIE_DOMAIN:'',COOKIE_SAME_SITE:'Lax',BUSINESS_TIME_ZONE:'Asia/Riyadh',REPORT_DEFAULT_DAYS:'30',REPORT_MAX_DAYS:'366',SELLER_NAME:'Fixture',SELLER_VAT_NUMBER:'000000000000000',SELLER_CR_NUMBER:'0000000000',SELLER_ADDRESS:'Fixture',JWT_ACCESS_SECRET:secret,JWT_REFRESH_SECRET:'final-review-refresh-secret-at-least-32-bytes',RATE_LIMIT_HMAC_SECRET:'final-review-rate-secret-at-least-32-bytes'};await db.prepare("INSERT INTO admin_users(id,name,email,password_hash,is_active,created_at,role,view_only) VALUES(1,'Admin','admin@example.test','unused',1,?,'SUPER_ADMIN',0),(2,'Limited','limited@example.test','unused',1,?,'ADMIN',0)").bind(ts,ts).run();headers={authorization:`Bearer ${await signJwt(secret,{sub:1,kind:'admin'},900)}`,'content-type':'application/json'};});
afterAll(async()=>mf.dispose());

describe.sequential('final review correctness findings',()=>{
  it('returns message-array 400s and rejects invalid CRUD DTO values before D1 writes',async()=>{
    for(const [path,body] of [
      ['/api/store',{storeName:7,storeCode:'MTCSA01',storeLocation:'Riyadh'}],
      ['/api/enquire/b2c',{customerName:7,enquiredDate:'2026-10-20',requirement:'Repair'}],
      ['/api/enquire/corporate',{corporateName:'Fixture',enquiredDate:'2026-02-30',requirement:'Support'}],
    ] as const){const response=await json(path,body);expect(response.status,path).toBe(400);expect(await response.json()).toMatchObject({statusCode:400,message:expect.any(Array),error:'Bad Request'});}
    const store=await json('/api/store',{storeName:'Riyadh',storeCode:'MTCSA01',storeLocation:'Riyadh'});expect(store.status).toBe(201);
    const invalidStaff=await json('/api/staff',{empCode:'MTC0100',name:'Technician',storeId:1,yearsOfExperience:-1});expect(invalidStaff.status).toBe(400);expect(await invalidStaff.json()).toMatchObject({message:['Invalid yearsOfExperience']});
    const invalidUpdate=await json('/api/store/1',{storeName:null},'PUT');expect(invalidUpdate.status).toBe(400);
    expect((await db.prepare('SELECT count(*) count FROM staff').first<{count:number}>())?.count).toBe(0);
  });

  it('rejects duplicate permission replacements and missing reset targets without partial writes',async()=>{
    await db.prepare("INSERT INTO user_modules(user_id,module_code,created_at) VALUES(2,'CLIENTS',?)").bind(ts).run();
    const duplicate=await json('/api/auth/admin/users/modules',{userId:2,modules:['AUTH','AUTH']});expect(duplicate.status).toBe(400);expect(await duplicate.json()).toMatchObject({message:['Invalid permissions']});
    expect((await db.prepare('SELECT module_code FROM user_modules WHERE user_id=2').all<{module_code:string}>()).results).toEqual([{module_code:'CLIENTS'}]);
    expect((await json('/api/auth/admin/users/modules',{userId:999,modules:[]})).status).toBe(404);
    expect((await json('/api/auth/admin/users/999/reset-modules',{})).status).toBe(404);
  });

  it('paginates growing organization collections and aggregates notification status in SQL',async()=>{
    const vehicleStatements=Array.from({length:25},(_,index)=>db.prepare("INSERT INTO vehicles(vehicle_number,model,fuel_type,store_id,status,created_at,updated_at) VALUES(?,?,'PETROL',1,'ACTIVE',?,?)").bind(`VEH-${index}`,`Model ${index}`,ts,ts));await db.batch(vehicleStatements);
    const vehicles=await app.request('/api/organization/vehicles?page=2&limit=10',{headers:{authorization:headers.authorization}},env);expect(vehicles.status).toBe(200);expect(await vehicles.json()).toMatchObject({count:25,page:2,limit:10,totalPages:3,data:expect.arrayContaining([expect.any(Object)])});
    for(let start=0;start<250;start+=50){const statements=Array.from({length:50},(_,offset)=>db.prepare("INSERT INTO notifications(type,source_key,payload_json,created_at) VALUES('new-request',?,'{}',?)").bind(`status-${start+offset}`,ts));await db.batch(statements);}
    const status=await app.request('/api/notifications/status',{headers:{authorization:headers.authorization}},env);expect(status.status).toBe(200);expect(await status.json()).toMatchObject({success:true,latestCursor:250,unreadCount:250});
  });

  it('pre-aggregates store report relationships without multiplying parts cost',async()=>{
    await db.prepare("INSERT INTO staff(id,emp_code,name,store_id,created_at) VALUES(10,'MTC0200','Report Tech',1,?)").bind(ts).run();
    for(let index=0;index<2;index++)await db.prepare("INSERT INTO service_requests(uuid,reference_number,name,mobile,device,device_display_name,location_type,location,language,date_time,timestamp,status,assigned_staff_id,created_at) VALUES(?,?, 'Customer','0500000000','Phone','Phone','manual','Riyadh','en',?,?,'Request received',10,?)").bind(`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,`SR-2026-99${index}`,ts,ts,ts).run();
    await db.prepare("INSERT INTO job_sheets(id,job_sheet_number,customer_name,assigned_technician_id,status,received_date,created_at,updated_at) VALUES(10,'JS-9900','Customer',10,'received','2026-10-20',?,?)").bind(ts,ts).run();
    await db.prepare("INSERT INTO job_sheet_items(job_sheet_id,part_name,quantity,unit_cost_halalas,total_halalas) VALUES(10,'One',1,100,100),(10,'Two',1,200,200)").run();
    const report:any=await buildReport(db,'store',name=>({startDate:'2026-10-01',endDate:'2026-10-31'} as Record<string,string>)[name]);expect(report.data.stores[0]).toMatchObject({serviceRequestCount:2,jobSheetCount:1,jobSheetPartsCost:3});
  });

  it('keeps empty-role HTTP access closed and view-only writes denied',async()=>{
    const limited=await signJwt(secret,{sub:2,kind:'admin'},900),denied=await app.request('/api/store',{headers:{authorization:`Bearer ${limited}`}},env);expect(denied.status).toBe(403);
    await db.prepare("INSERT INTO admin_users(id,name,email,password_hash,is_active,created_at,role,view_only) VALUES(3,'Viewer','viewer@example.test','unused',1,?,'ADMIN',1)").bind(ts).run();await db.prepare("INSERT INTO user_modules(user_id,module_code,created_at) VALUES(3,'ORGANIZATION',?)").bind(ts).run();await db.prepare("INSERT INTO user_submodules(user_id,submodule_code,created_at) VALUES(3,'STORE_DETAILS',?)").bind(ts).run();const viewer=await signJwt(secret,{sub:3,kind:'admin'},900),write=await app.request('/api/store',{method:'POST',headers:{authorization:`Bearer ${viewer}`,'content-type':'application/json'},body:JSON.stringify({storeName:'Blocked',storeCode:'MTCSA99',storeLocation:'Riyadh'})},env);expect(write.status).toBe(403);
  });

  it('enforces service-request route DTOs, staff references, and legacy envelopes',async()=>{
    await db.prepare("INSERT OR IGNORE INTO stores(id,store_name,store_code,store_location,created_at) VALUES(1,'Service Store','MTCSA01','Riyadh',?)").bind(ts).run();
    await db.prepare("INSERT OR IGNORE INTO staff(id,emp_code,name,store_id,created_at) VALUES(10,'MTC0200','Service Tech',1,?)").bind(ts).run();
    const standard={name:'Customer',mobile:'0500000000',device:'Phone',deviceDisplayName:'Phone',locationType:'manual',location:'Riyadh',language:'en',dateTime:'10/20/2026',timestamp:ts};
    const before=(await db.prepare('SELECT count(*) n FROM service_requests').first<{n:number}>())!.n,limitsBefore=(await db.prepare('SELECT count(*) n FROM auth_rate_limits').first<{n:number}>())!.n;
    for(const [path,body] of [['/api/service-request',{...standard,assignedStaffId:10}],['/api/admin/service-request',{...standard,uuid:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]] as const){const response=await json(path,body);expect(response.status).toBe(400);expect(await response.json()).toMatchObject({message:expect.any(Array)});}
    expect((await db.prepare('SELECT count(*) n FROM service_requests').first<{n:number}>())!.n).toBe(before);expect((await db.prepare('SELECT count(*) n FROM auth_rate_limits').first<{n:number}>())!.n).toBe(limitsBefore);
    expect((await json('/api/admin/service-request/manual',{name:'Manual',mobile:'0500000001',device:'Phone',location:'Riyadh',assignedStaffId:999})).status).toBe(404);
    const manual=await json('/api/admin/service-request/manual',{name:'Manual',mobile:'0500000001',device:'Phone',location:'Riyadh',assignedStaffId:10});expect(manual.status).toBe(201);
    const created=await json('/api/admin/service-request',standard);expect(created.status).toBe(201);const createdBody:any=await created.json();
    const lookup=await app.request('/api/service-request/by-mobile?mobile=0500000000',{headers:{'cf-connecting-ip':'198.51.100.77'}},env);expect(lookup.status).toBe(200);expect(await lookup.json()).toMatchObject({success:true,count:expect.any(Number),data:expect.arrayContaining([expect.objectContaining({id:createdBody.data.id})])});
    const detail=await app.request(`/api/admin/service-request/${createdBody.data.id}`,{headers:{authorization:headers.authorization}},env);expect(await detail.json()).toMatchObject({success:true,data:{id:createdBody.data.id}});
    const invalidUpdate=await json(`/api/admin/service-request/${createdBody.data.id}`,{assignedStaffId:'10'},'PUT');expect(invalidUpdate.status).toBe(400);
    const update=await json(`/api/admin/service-request/${createdBody.data.id}`,{status:'IN_PROGRESS',assignedStaffId:10},'PUT');expect(await update.json()).toMatchObject({message:'Service request updated successfully',request:{status:'IN_PROGRESS',assignedStaffId:10},data:{status:'IN_PROGRESS',assignedStaffId:10}});
  });

  it('rejects missing or invalid document prices and parent types before persistence',async()=>{
    const base={invoiceDate:'2026-10-20',customerName:'Customer'};
    for(const body of [
      {...base,items:[{product:'Part',quantity:1}]},
      {...base,paymentMethod:7,items:[{product:'Part',quantity:1,unitPrice:10}]},
      {...base,serviceRequestId:10,items:[{product:'Part',quantity:1,unitPrice:10}]},
      {...base,items:[{product:'Part',quantity:1,unitPrice:100_000_000}]},
      {...base,items:[{product:'Part',quantity:2,unitPrice:99_999_999.99}]},
      {...base,status:'draft',items:[{product:'Part',quantity:1,unitPrice:10}]},
    ]){const response=await json('/api/bill/invoice',body);expect(response.status).toBe(400);expect(await response.json()).toMatchObject({statusCode:400,message:expect.any(Array)});}
    expect((await db.prepare('SELECT count(*) n FROM invoices').first<{n:number}>())!.n).toBe(0);
    expect((await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoice_items'").first<{sql:string}>())!.sql).toContain('unit_price_halalas BETWEEN 0 AND 9999999999');
  });

  it('does not manufacture future notification cursors',async()=>{
    const current=await db.prepare("INSERT INTO notifications(type,source_key,payload_json,created_at) VALUES('new-request','cursor-current','{}',?) RETURNING id").bind(ts).first<{id:number}>();
    const first=await json('/api/notifications/read-through',{cursor:current!.id});expect(first.status).toBe(200);
    const future=await json('/api/notifications/read-through',{cursor:1_000_000_000});expect(await future.json()).toMatchObject({processedThrough:current!.id,markedCount:0});
    const later=await db.prepare("INSERT INTO notifications(type,source_key,payload_json,created_at) VALUES('new-request','cursor-later','{}',?) RETURNING id").bind(ts).first<{id:number}>();
    const poll=await app.request(`/api/notifications?after=${current!.id}`,{headers:{authorization:headers.authorization}},env);expect(await poll.json()).toMatchObject({data:[expect.objectContaining({id:later!.id})]});
  });

  it('returns complete expired and expiring credential totals beyond one page',async()=>{
    await db.prepare("INSERT OR IGNORE INTO stores(id,store_name,store_code,store_location,created_at) VALUES(90,'Expiry Store','MTCSA90','Riyadh',?)").bind(ts).run();
    const statements=Array.from({length:105},(_,index)=>db.prepare('INSERT INTO staff(id,emp_code,name,store_id,passport_expiry_date,iqama_expiry_date,created_at) VALUES(?,?,?,?,?,?,?)').bind(200+index,`EXP${index}`,`Expiry ${index}`,90,index===0?'0001-01-01':'0002-01-01',index===0?'0001-01-02':null,ts));
    for(let start=0;start<statements.length;start+=50)await db.batch(statements.slice(start,start+50));
    const response=await app.request('/api/notifications/expiry-alerts?days=30&page=1&limit=100',{headers:{authorization:headers.authorization}},env),body:any=await response.json();expect(response.status).toBe(200);expect(body).toMatchObject({success:true,message:'Expiry alerts fetched successfully',count:105,page:1,limit:100,totalPages:2});expect(body.data).toHaveLength(100);expect(body.data.find((entry:any)=>entry.staffId===200).notifications).toEqual(expect.arrayContaining([expect.objectContaining({field:'passportExpiryDate',status:'expired'}),expect.objectContaining({field:'iqamaExpiryDate',status:'expired'})]));
    const scheduled=await runDailyExpiry(env,Date.parse('2026-10-20T05:00:00.000Z'));expect(scheduled).toMatchObject({state:'completed',alertCount:105});
  });

  it('replaces sensitive non-UUID request IDs before logging or responding and fails closed on invalid production config',async()=>{
    for(const invalid of [{...env,APP_ENV:'prodution'},{...env,SELLER_NAME:'REPLACE_WITH_SELLER_NAME'}]){const unavailable=await app.request('/api',{},invalid);expect(unavailable.status).toBe(503);expect(await unavailable.json()).toMatchObject({statusCode:503,message:'Configuration unavailable'});}
    const marker='customer@example.test',logs:string[]=[],spy=console.log;console.log=(value?:unknown)=>{logs.push(String(value));};
    try{const response=await app.request('/api',{headers:{'x-request-id':marker}},env),requestId=response.headers.get('x-request-id');expect(requestId).toMatch(/^[0-9a-f-]{36}$/);expect(requestId).not.toBe(marker);expect(await response.json()).toEqual({message:'Hello World!'});expect(logs.join('\n')).not.toContain(marker);}finally{console.log=spy;}
  });
});
