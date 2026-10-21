import { describe,expect,it } from 'vitest';
import { app } from '../../src/worker/app';
import type { Env } from '../../src/worker/env';
import { openapi,routeManifest } from '../../src/worker/openapi';

const env:Env={DB:{} as D1Database,APP_ENV:'local',ALLOWED_ORIGINS:'https://app.mtechcare.com',COOKIE_DOMAIN:'',COOKIE_SAME_SITE:'Lax',BUSINESS_TIME_ZONE:'Asia/Riyadh',REPORT_DEFAULT_DAYS:'30',REPORT_MAX_DAYS:'366',SELLER_NAME:'Fixture',SELLER_VAT_NUMBER:'000000000000000',SELLER_CR_NUMBER:'0000000000',SELLER_ADDRESS:'Fixture',JWT_ACCESS_SECRET:'contract-access-secret-at-least-32-bytes',JWT_REFRESH_SECRET:'contract-refresh-secret-at-least-32-bytes',RATE_LIMIT_HMAC_SECRET:'contract-rate-secret-at-least-32-bytes'};
const concrete=(path:string)=>`/api${path.replace('{userId}','1').replace('{serviceRequestId}','1').replace('{expenseId}','1').replace('{businessDate}','2026-10-20').replace('{mobile}','0500000000').replace('{id}','1')}`;

describe('route-wide Worker contract',()=>{
  it('keeps OpenAPI methods in one-to-one agreement with the route manifest',()=>{
    const expected=routeManifest.map(([method,path])=>`${method} ${path}`),documented=Object.entries(openapi.paths).flatMap(([path,methods])=>Object.keys(methods).map(method=>`${method} ${path}`));
    expect(new Set(expected).size).toBe(expected.length);expect(documented.sort()).toEqual([...expected].sort());
  });

  it('registers every protected method and path behind authentication',async()=>{
    for(const [method,path] of routeManifest){
      const operation=(openapi.paths as Record<string,Record<string,{security:unknown[]}>>)[path][method];if(operation.security.length===0)continue;
      const response=await app.request(concrete(path),{method:method.toUpperCase()},env);
      expect(response.status,`${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  it('documents path parameters, CRUD DTOs, and message-array validation errors',()=>{
    const paths=openapi.paths as Record<string,Record<string,any>>,store=paths['/store'].post,staff=paths['/staff'].post,service=paths['/admin/service-request/{id}'].get;
    expect(store.requestBody.content['application/json'].schema).toMatchObject({additionalProperties:false,required:['storeName','storeCode','storeLocation'],properties:{storeName:{maxLength:255},storeCode:{maxLength:20}}});
    expect(staff.requestBody.content['application/json'].schema.properties).toMatchObject({yearsOfExperience:{minimum:0},salary:{maximum:99999999.99},passportExpiryDate:{format:'date'}});
    expect(service.parameters).toEqual([{name:'id',in:'path',required:true,schema:{type:'string'}}]);
    expect(store.responses['400'].content['application/json'].schema).toEqual({$ref:'#/components/schemas/ValidationError'});
  });

  it('serves the public utility contract without database access',async()=>{
    const root=await app.request('/api',{},env);expect(root.status).toBe(200);expect(await root.json()).toEqual({message:'Hello World!'});
    const spec=await app.request('/api/openapi.json',{},env);expect(spec.status).toBe(200);expect(((await spec.json()) as {openapi:string}).openapi).toBe('3.1.0');
    const docs=await app.request('/api/docs',{},env);expect(docs.status).toBe(200);expect(await docs.text()).toContain('MyTechCare API');
  });
});
