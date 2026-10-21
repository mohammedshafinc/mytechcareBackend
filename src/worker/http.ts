import type { Context } from 'hono';

export class HttpError extends Error { constructor(public status: number, message: string, public code = 'request_error', public headers?: Record<string,string>) { super(message); } }
export const nowIso = () => new Date().toISOString();
export const id = (value: string): number => { const n=Number(value); if (!Number.isInteger(n)||n<1||n>2147483647) throw new HttpError(400,'Invalid id'); return n; };
export const uuid = (value: unknown): string => { if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))throw new HttpError(400,'Invalid UUID');return value; };
export const email = (value: unknown): string => { if(typeof value!=='string')throw new HttpError(400,'Invalid email');const normalized=value.trim().toLowerCase();if(normalized.length>254||!/^\S+@\S+\.\S+$/.test(normalized))throw new HttpError(400,'Invalid email');return normalized; };
export const date = (value: unknown): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400,'Invalid date');
  const [y,m,d]=value.split('-').map(Number); const dim=new Date(Date.UTC(y,m,0)).getUTCDate();
  if (y<1||m<1||m>12||d<1||d>dim) throw new HttpError(400,'Invalid date'); return value;
};
export const timestamp = (value: unknown): string => {
  if (typeof value !== 'string') throw new HttpError(400,'Invalid timestamp');
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if(!match)throw new HttpError(400,'Invalid timestamp');
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]),hour=Number(match[4]),minute=Number(match[5]),second=Number(match[6]),offsetHour=Number(match[10]??0),offsetMinute=Number(match[11]??0);
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
  if(year<1||month<1||month>12||day<1||day>daysInMonth||hour>23||minute>59||second>59||offsetHour>14||offsetMinute>59||(offsetHour===14&&offsetMinute!==0))throw new HttpError(400,'Invalid timestamp');
  const normalized=new Date(value);
  if(!Number.isFinite(normalized.valueOf()))throw new HttpError(400,'Invalid timestamp');
  return normalized.toISOString();
};
export const money = (value: unknown): number => { const n=typeof value==='string'?Number(value):value; if(typeof n!=='number'||!Number.isFinite(n)||n<0||!/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new HttpError(400,'Invalid money value'); return Math.round(n*100); };
export async function jsonBody(c: Context, max=262144): Promise<Record<string,unknown>> {
  if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415,'Unsupported Media Type');
  const raw=await c.req.text(); if(new TextEncoder().encode(raw).length>max) throw new HttpError(413,'Payload Too Large');
  try { const v=JSON.parse(raw) as unknown; if(!v||typeof v!=='object'||Array.isArray(v)) throw new Error(); return v as Record<string,unknown>; } catch { throw new HttpError(400,'Invalid JSON'); }
}
export const requiredString=(body:Record<string,unknown>,key:string,max=10000):string=>{ const v=body[key]; if(typeof v!=='string'||!v.trim()||new TextEncoder().encode(v).length>max) throw new HttpError(400,`${key} must be a non-empty string`); return v; };
export function errorResponse(c: Context, error: unknown): Response {
  const e=error instanceof HttpError?error:new HttpError(error instanceof Error&&error.message==='configuration_unavailable'?503:500,error instanceof Error&&error.message==='configuration_unavailable'?'Configuration unavailable':'Internal server error',error instanceof Error&&error.message==='configuration_unavailable'?'configuration':'internal');
  Object.entries(e.headers??{}).forEach(([k,v])=>c.header(k,v)); return c.json({statusCode:e.status,message:e.status===400?[e.message]:e.message,error:statusText(e.status),requestId:c.get('requestId')},e.status as any);
}
function statusText(status:number){ return ({400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',409:'Conflict',413:'Payload Too Large',415:'Unsupported Media Type',429:'Too Many Requests',500:'Internal Server Error',503:'Service Unavailable'} as Record<number,string>)[status]??'Error'; }
export function riyadhDate(instant:Date):string { const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant); const p=Object.fromEntries(parts.map(x=>[x.type,x.value])); return `${p.year}-${p.month}-${p.day}`; }
export const camel=(row:Record<string,unknown>):Record<string,unknown>=>Object.fromEntries(Object.entries(row).map(([key,value])=>{let publicKey=key.replace(/_([a-z])/g,(_,letter:string)=>letter.toUpperCase()),publicValue=value;if(key.endsWith('_halalas')){publicKey=publicKey.slice(0,-7);if(typeof value==='number')publicValue=value/100;}else if(key.endsWith('_tenths')){publicKey=publicKey.slice(0,-6);if(typeof value==='number')publicValue=value/10;}else if(key.endsWith('_bps')){publicKey=publicKey.slice(0,-3);if(typeof value==='number')publicValue=value/100;}else if(typeof value==='number'&&(/^(?:is_|view_only$)/.test(key)))publicValue=Boolean(value);return[publicKey,publicValue];}));
