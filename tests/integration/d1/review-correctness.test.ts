import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { afterAll,beforeAll,describe,expect,it,vi } from 'vitest';
import { app } from '../../../src/worker/app';
import { createDocument,deleteDocument,documentConfigs,getDocument,updateDocument } from '../../../src/worker/documents';
import type { Env } from '../../../src/worker/env';
import type { Claims } from '../../../src/worker/jwt';
import { signJwt } from '../../../src/worker/jwt';
import { permissions } from '../../../src/worker/auth';
import { getVehicle,listVehicles,vehicleReport } from '../../../src/worker/organization';
import { batch as safeBatch } from '../../../src/worker/db';
import { limitAdminLogin } from '../../../src/worker/rate-limit';
import { buildReport } from '../../../src/worker/reports';

const ts='2026-10-20T00:00:00.000Z';
const accessSecret='integration-access-secret-at-least-32-bytes';
let mf:Miniflare,db:D1Database,env:Env;
const superClaims:Claims={sub:1,kind:'admin',role:'SUPER_ADMIN',modules:[],submodules:[],viewOnly:false,iat:1,exp:2147483647};

async function applySql(source:string){let remaining=source.trim();while(remaining){let end:number;if(/^CREATE TRIGGER\b/i.test(remaining)){const match=/END;\s*(?=(?:CREATE|INSERT|$))/i.exec(remaining);if(!match)throw new Error('Could not split trigger migration');end=(match.index??0)+match[0].indexOf(';')+1;}else{end=remaining.indexOf(';')+1;if(end===0)throw new Error('Could not split migration statement');}const statement=remaining.slice(0,end).trim();remaining=remaining.slice(end).trim();await db.prepare(statement).run();}}

beforeAll(async()=>{
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2025-09-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'11111111-1111-1111-1111-111111111111'}});
  db=(await mf.getBindings()).DB as D1Database;
  await applySql(await readFile(new URL('../../../migrations/d1/0001_fresh_schema.sql',import.meta.url),'utf8'));
  await applySql(await readFile(new URL('../../../migrations/d1/0002_seed_definitions.sql',import.meta.url),'utf8'));
  env={DB:db,APP_ENV:'local',ALLOWED_ORIGINS:'https://app.mtechcare.com',COOKIE_DOMAIN:'',COOKIE_SAME_SITE:'Lax',BUSINESS_TIME_ZONE:'Asia/Riyadh',REPORT_DEFAULT_DAYS:'30',REPORT_MAX_DAYS:'366',SELLER_NAME:'Fixture Seller',SELLER_VAT_NUMBER:'000000000000000',SELLER_CR_NUMBER:'0000000000',SELLER_ADDRESS:'Fixture Address',JWT_ACCESS_SECRET:accessSecret,JWT_REFRESH_SECRET:'integration-refresh-secret-at-least-32-bytes',RATE_LIMIT_HMAC_SECRET:'integration-rate-secret-at-least-32-bytes'};
  await db.prepare("INSERT INTO admin_users(id,name,email,password_hash,is_active,created_at,role,view_only) VALUES(1,'Fixture Admin','fixture@example.test','not-used',1,?,'SUPER_ADMIN',0)").bind(ts).run();
});
afterAll(async()=>mf.dispose());

describe.sequential('reviewed Worker D1 correctness',()=>{
  it('rejects arbitrary document keys and atomically replaces 100 children',async()=>{
    const items=Array.from({length:100},(_,index)=>({product:`Part ${index+1}`,quantity:1,unitPrice:1}));
    const created=await createDocument(db,documentConfigs[0],{invoiceDate:'2026-10-20',customerName:'Fixture Customer',items}),createdData=created.data as Record<string,unknown>&{items:Record<string,unknown>[]};
    expect(createdData.items).toHaveLength(100);
    await expect(updateDocument(db,documentConfigs[0],createdData.id as number,{'customer_name=?, status=? WHERE id=id --':'attack'})).rejects.toMatchObject({status:400});
    const updated=await updateDocument(db,documentConfigs[0],createdData.id as number,{items:[{product:'Replacement',quantity:2,unitPrice:10}]});
    expect(updated.data).toMatchObject({subtotal:20,vatAmount:3,grandTotal:23});
    expect(updated.data.items).toHaveLength(1);
    const persisted=await getDocument(db,documentConfigs[0],createdData.id as number);
    expect(persisted.items).toHaveLength(1);
    const token=await signJwt(accessSecret,{sub:1,kind:'admin'},900),listed=await app.request('/api/bill/invoice',{headers:{authorization:`Bearer ${token}`}},env);expect(listed.status).toBe(200);expect(await listed.json()).toMatchObject({success:true,count:1,data:[{id:createdData.id}]});
    const fk=await db.prepare('PRAGMA foreign_key_check').all();expect(fk.results).toEqual([]);
  });

  it('keeps invoice chain ownership coherent under contention, update, and delete',async()=>{
    const created=await Promise.all(Array.from({length:3},(_,index)=>createDocument(db,documentConfigs[0],{invoiceDate:'2026-10-20',customerName:`Chain ${index}`,items:[{product:'Part',quantity:1,unitPrice:index+1}]}))),ids=created.map(result=>(result.data as unknown as {id:number}).id);
    expect(new Set(created.map(result=>(result.data as unknown as {invoiceNumber:string}).invoiceNumber)).size).toBe(3);
    let state=await db.prepare('SELECT last_invoice_id,last_hash FROM invoice_chain_state WHERE id=1').first<{last_invoice_id:number;last_hash:string}>();const latest=Math.max(...ids);expect(state?.last_invoice_id).toBe(latest);
    const updated=await updateDocument(db,documentConfigs[0],latest,{items:[{product:'Updated',quantity:2,unitPrice:5}]});state=await db.prepare('SELECT last_invoice_id,last_hash FROM invoice_chain_state WHERE id=1').first<{last_invoice_id:number;last_hash:string}>();expect(state).toMatchObject({last_invoice_id:latest,last_hash:(updated.data as unknown as {invoiceHash:string}).invoiceHash});
    await deleteDocument(db,documentConfigs[0],latest);state=await db.prepare('SELECT last_invoice_id,last_hash FROM invoice_chain_state WHERE id=1').first<{last_invoice_id:number;last_hash:string}>();expect(state?.last_invoice_id).toBe(Math.max(...ids.filter(value=>value!==latest)));
  });

  it('allows job sheets without items and advances store/staff counters transactionally',async()=>{
    await db.prepare("INSERT INTO stores(id,store_name,store_code,store_location,created_at) VALUES(1,'One','MTCSA09','Riyadh',?), (2,'Two','OTHER','Jeddah',?)").bind(ts,ts).run();
    await db.prepare("INSERT INTO staff(id,emp_code,name,store_id,created_at) VALUES(1,'MTC0199','Fixture Staff',1,?)").bind(ts).run();
    const job=await createDocument(db,documentConfigs[2],{customerName:'Fixture Customer',receivedDate:'2026-10-20'});
    expect(job.data.items).toEqual([]);
    const counters=await db.prepare("SELECT kind,next_value FROM number_counters WHERE kind IN ('store','staff') ORDER BY kind").all<{kind:string;next_value:number}>();
    expect(counters.results).toEqual([{kind:'staff',next_value:200},{kind:'store',next_value:10}]);
  });

  it('enforces non-super-admin store scope on list and direct records',async()=>{
    await db.prepare("INSERT INTO admin_users(id,name,email,password_hash,is_active,created_at,role,store_id,view_only) VALUES(2,'Scoped','scoped@example.test','not-used',1,?,'ADMIN',1,0)").bind(ts).run();
    await db.prepare("INSERT INTO vehicles(id,vehicle_number,model,fuel_type,store_id,status,created_at,updated_at) VALUES(1,'ONE','Model','PETROL',1,'ACTIVE',?,?),(2,'TWO','Model','PETROL',2,'ACTIVE',?,?)").bind(ts,ts,ts,ts).run();
    const claims:Claims={...superClaims,sub:2,role:'ADMIN'};
    const list=await listVehicles(db,claims);expect(list.count).toBe(1);expect(list.data[0]).toMatchObject({vehicleNumber:'ONE',storeId:1});
    await expect(getVehicle(db,claims,2)).rejects.toMatchObject({status:403});
  });

  it('progresses notification read-through beyond 500 rows and honors unreadOnly',async()=>{
    for(let start=1;start<=501;start+=100){const end=Math.min(501,start+99),values=Array.from({length:end-start+1},(_,offset)=>`('new-request','review-notification-${start+offset}','{}','${ts}')`).join(',');await db.exec(`INSERT INTO notifications(type,source_key,payload_json,created_at) VALUES ${values}`);}
    const token=await signJwt(accessSecret,{sub:1,kind:'admin'},900),headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
    const first=await app.request('/api/notifications/read-through',{method:'POST',headers,body:JSON.stringify({cursor:501,limit:500})},env);expect(first.status).toBe(200);expect(await first.json()).toMatchObject({markedCount:500,hasMore:true});
    const second=await app.request('/api/notifications/read-through',{method:'POST',headers,body:JSON.stringify({cursor:501,limit:500})},env);expect(second.status).toBe(200);expect(await second.json()).toMatchObject({markedCount:1,unreadCount:0,hasMore:false});
    const unread=await app.request('/api/notifications?after=0&unreadOnly=true',{headers:{authorization:`Bearer ${token}`}},env);expect(unread.status).toBe(200);expect(await unread.json()).toMatchObject({data:[]});
  });

  it('returns endpoint-specific reports with indexed timestamp predicates',async()=>{
    await db.prepare("INSERT INTO bills(user_id,cost_price_halalas,selling_price_halalas,mobile,name,created_at) VALUES(NULL,1000,2000,'0500000000','Fixture',?)").bind(ts).run();
    const query=(name:string)=>({startDate:'2026-10-01',endDate:'2026-10-31'} as Record<string,string>)[name],financial=await buildReport(db,'financial',query);
    expect(financial).toMatchObject({success:true,data:{summary:{totalRevenue:20,totalCost:10,totalProfit:10,totalBills:1}}});
    for(const kind of ['dashboard','service','customer','quotation','invoice','jobsheet','staff-performance','store'])expect(await buildReport(db,kind,query)).toMatchObject({success:true,data:{dateRange:{startDate:'2026-10-01',endDate:'2026-10-31'}}});
    const plan=await db.prepare("EXPLAIN QUERY PLAN SELECT count(*) FROM bills WHERE created_at>='2026-10-01T00:00:00.000Z' AND created_at<'2026-11-01T00:00:00.000Z'").all<{detail:string}>();
    expect(plan.results.some(row=>row.detail.includes('idx_bills_created'))).toBe(true);
  });

  it('preserves repair billing and rejects invalid route boundaries before writes',async()=>{
    await db.prepare("INSERT INTO service_requests(uuid,reference_number,name,mobile,device,device_display_name,location_type,location,language,date_time,timestamp,status,created_at) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SR-2026-9001','Repair Customer','0500000001','phone','Phone','manual','Riyadh','en',?,?, 'Request received',?)").bind(ts,ts,ts).run();
    const token=await signJwt(accessSecret,{sub:1,kind:'admin'},900),headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
    const response=await app.request('/api/repair-item/bill',{method:'POST',headers,body:JSON.stringify({id:'1',costPrice:'10.00',customerPrice:'15.00',notes:'fixture'})},env);
    expect(response.status).toBe(201);expect(await response.json()).toMatchObject({success:true,message:'Bill created successfully',data:{costPrice:10,sellingPrice:15}});
    expect((await db.prepare('SELECT count(*) count FROM repair_items').first<{count:number}>())?.count).toBe(0);
    const unknown=await app.request('/api/repair-item/bill',{method:'POST',headers,body:JSON.stringify({id:'1',costPrice:'10.00',customerPrice:'15.00',unexpected:true})},env);expect(unknown.status).toBe(400);
    const shortPassword=await app.request('/api/auth/admin/users',{method:'POST',headers,body:JSON.stringify({name:'Invalid',email:'invalid@example.test',password:'short'})},env);expect(shortPassword.status).toBe(400);
    const badUuid=await app.request('/api/admin/service-request/not-a-uuid',{headers:{authorization:`Bearer ${token}`}},env);expect(badUuid.status).toBe(400);
  });

  it('acquires both admin login buckets atomically and maps batch constraints',async()=>{
    await db.prepare('DELETE FROM auth_rate_limits').run();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-20T00:00:00.000Z'));
    try{
      const attempts=await Promise.allSettled(Array.from({length:6},()=>limitAdminLogin(db,env.RATE_LIMIT_HMAC_SECRET!,'192.0.2.1','rate@example.test')));
      expect(attempts.filter(result=>result.status==='rejected')).toHaveLength(1);
      const rejected=attempts.find(result=>result.status==='rejected') as PromiseRejectedResult;expect(rejected.reason).toMatchObject({status:429,headers:{'Retry-After':'900'}});
      const rows=await db.prepare('SELECT key_hash,attempt_count FROM auth_rate_limits ORDER BY window_seconds').all<{key_hash:string;attempt_count:number}>();expect(rows.results.map(row=>row.attempt_count)).toEqual([6,6]);expect(JSON.stringify(rows.results)).not.toContain('rate@example.test');expect(JSON.stringify(rows.results)).not.toContain('192.0.2.1');
    }finally{vi.useRealTimers();}
    await expect(safeBatch(db,[db.prepare("INSERT INTO bills(user_id,cost_price_halalas,selling_price_halalas,name,created_at) VALUES(999999,1,1,'Broken',?)").bind(ts)])).rejects.toMatchObject({status:409,code:'reference_changed'});
  });

  it('terminates at a suppressed notification barrier without advancing through it',async()=>{
    await db.prepare("INSERT INTO admin_users(id,name,email,password_hash,is_active,created_at,role,view_only) VALUES(3,'Barrier','barrier@example.test','not-used',1,?,'ADMIN',0)").bind(ts).run();
    for(const module of ['CLIENTS','ORGANIZATION'])await db.prepare('INSERT INTO user_modules(user_id,module_code,created_at) VALUES(3,?,?)').bind(module,ts).run();
    for(const submodule of ['SERVICE_REQUESTS','STAFF'])await db.prepare('INSERT INTO user_submodules(user_id,submodule_code,created_at) VALUES(3,?,?)').bind(submodule,ts).run();
    await db.prepare("INSERT INTO notifications(type,source_key,payload_json,created_at) VALUES('new-request','barrier-new','{}',?),('expiry-alerts','barrier-expiry','{}',?)").bind(ts,ts).run();
    const barrier=await db.prepare("SELECT id FROM notifications WHERE source_key='barrier-expiry'").first<{id:number}>();await db.prepare("DELETE FROM user_submodules WHERE user_id=3 AND submodule_code='STAFF'").run();
    const token=await signJwt(accessSecret,{sub:3,kind:'admin'},900),headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
    for(const marked of [1,0]){const response=await app.request('/api/notifications/read-through',{method:'POST',headers,body:JSON.stringify({cursor:barrier!.id,limit:500})},env);expect(response.status).toBe(200);expect(await response.json()).toMatchObject({markedCount:marked,hasMore:false,processedThrough:barrier!.id-1});}
    await db.prepare("INSERT INTO user_submodules(user_id,submodule_code,created_at) VALUES(3,'STAFF',?)").bind(ts).run();
    const restored=await app.request('/api/notifications/read-through',{method:'POST',headers,body:JSON.stringify({cursor:barrier!.id,limit:500})},env);expect(await restored.json()).toMatchObject({markedCount:1,hasMore:false,processedThrough:barrier!.id});
    await db.prepare('UPDATE admin_users SET is_active=0 WHERE id=3').run();await db.prepare("INSERT INTO notifications(type,source_key,payload_json,created_at) VALUES('expiry-alerts','barrier-inactive','{}',?)").bind(ts).run();const inactive=await db.prepare("SELECT count(*) count FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.admin_user_id=3 AND n.source_key='barrier-inactive'").first<{count:number}>();expect(inactive?.count).toBe(0);
    await db.prepare('UPDATE admin_users SET is_active=1 WHERE id=3').run();const noBackfill=await db.prepare("SELECT count(*) count FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.admin_user_id=3 AND n.source_key='barrier-inactive'").first<{count:number}>();expect(noBackfill?.count).toBe(0);
    expect((await permissions(db,{id:2,role:'ADMIN'})).modules).toEqual([]);expect((await permissions(db,{id:3,role:'ADMIN'})).modules.sort()).toEqual(['CLIENTS','ORGANIZATION']);
  });

  it('keeps report aggregates page-independent and populates vehicle breakdowns',async()=>{
    await db.prepare("INSERT INTO bills(user_id,cost_price_halalas,selling_price_halalas,mobile,name,created_at) VALUES(NULL,100,1000,'0500000101','Page One',?),(NULL,200,2000,'0500000102','Page Two',?)").bind(ts,ts).run();
    await db.prepare("INSERT INTO staff(id,emp_code,name,store_id,department,employee_status,created_at) VALUES(10,'MTC9010','Report One',1,'Ops','Active',?),(11,'MTC9011','Report Two',2,'Sales','Inactive',?)").bind(ts,ts).run();
    const query=(page:string)=>(name:string)=>({startDate:'2026-10-01',endDate:'2026-10-31',page,limit:'1'} as Record<string,string>)[name];
    const customer1:any=await buildReport(db,'customer',query('1')),customer2:any=await buildReport(db,'customer',query('2'));expect(customer1.data.overview).toEqual(customer2.data.overview);expect(customer1.data.byLocation).toEqual(customer2.data.byLocation);expect(customer1.data.topCustomers).toEqual(customer2.data.topCustomers);expect(customer1.data.allCustomers).not.toEqual(customer2.data.allCustomers);
    const staff1:any=await buildReport(db,'staff-performance',query('1')),staff2:any=await buildReport(db,'staff-performance',query('2'));expect(staff1.data.summary).toEqual(staff2.data.summary);expect(staff1.data.byDepartment).toEqual(staff2.data.byDepartment);expect(staff1.data.topPerformers).toEqual(staff2.data.topPerformers);expect(staff1.data.summary.totalStaff).toBeGreaterThan(1);
    await db.prepare("INSERT INTO vehicle_expenses(vehicle_id,store_id,expense_type,amount_halalas,expense_date,added_by,created_at,updated_at) VALUES(1,1,'FUEL',2500,'2026-10-20',1,?,?)").bind(ts,ts).run();
    await db.prepare("INSERT INTO rental_vehicles(vehicle_number,model,fuel_type,rental_company,start_date,end_date,daily_rate_halalas,total_cost_halalas,deposit_amount_halalas,payment_status,store_id,status,created_at,updated_at) VALUES('RENT-1','Rental','PETROL','Fixture Rentals','2026-10-01','2026-10-31',1000,31000,5000,'PAID',1,'ACTIVE',?,?)").bind(ts,ts).run();
    const vehicles:any=await vehicleReport(db,superClaims,'2026-10-01','2026-10-31');expect(vehicles.data.expenses.byStore).toHaveLength(1);expect(vehicles.data.expenses.byVehicle).toHaveLength(1);expect(vehicles.data.rental.byPaymentStatus).toEqual({PAID:1});expect(vehicles.data.rental.byCompany).toHaveLength(1);expect(vehicles.data.rental.byStore).toHaveLength(1);expect(vehicles.data.rental.vehicles).toHaveLength(1);
  });
});
