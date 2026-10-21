import type { Env } from './env';
import { batch, one, run } from './db';
import { riyadhDate } from './http';

export async function runDailyExpiry(env:Env,scheduledTime:number,requestedDate?:string){
  const now=new Date(scheduledTime),today=riyadhDate(now),businessDate=requestedDate??today,ts=now.toISOString(),lease=new Date(now.valueOf()+300000).toISOString(),token=crypto.randomUUID();
  if(!requestedDate){
    await run(env.DB.prepare("INSERT INTO scheduled_runs(job_name,business_date,state,attempt_count,attempt_token,lease_expires_at,started_at) VALUES('staff-expiry',?,'running',1,?,?,?) ON CONFLICT(job_name,business_date) DO NOTHING").bind(businessDate,token,lease,ts));
    await run(env.DB.prepare("UPDATE scheduled_runs SET state='running',attempt_count=attempt_count+1,attempt_token=?,lease_expires_at=?,started_at=?,failed_at=NULL,error_code=NULL WHERE job_name='staff-expiry' AND business_date=? AND (state='failed' OR (state='running' AND lease_expires_at<=?))").bind(token,lease,ts,businessDate,ts));
  }else{
    await run(env.DB.prepare("UPDATE scheduled_runs SET state='running',attempt_count=attempt_count+1,attempt_token=?,lease_expires_at=?,started_at=?,failed_at=NULL,error_code=NULL WHERE job_name='staff-expiry' AND business_date=? AND (state='failed' OR (state='running' AND lease_expires_at<=?))").bind(token,lease,ts,businessDate,ts));
  }
  const claimed=await one<{attempt_token:string;state:string}>(env.DB.prepare("SELECT attempt_token,state FROM scheduled_runs WHERE job_name='staff-expiry' AND business_date=?").bind(businessDate));
  if(!claimed||claimed.state!=='running'||claimed.attempt_token!==token){if(requestedDate)throw new Error('run_not_claimable');return{businessDate,state:claimed?.state??'unknown'};}
  try{
    const alertTotal=await one<{count:number}>(env.DB.prepare("SELECT count(*) count FROM staff WHERE (passport_expiry_date IS NOT NULL AND passport_expiry_date<=date(?, '+30 days')) OR (iqama_expiry_date IS NOT NULL AND iqama_expiry_date<=date(?, '+30 days'))").bind(businessDate,businessDate));
    const alertCount=alertTotal?.count??0;
    const statements:D1PreparedStatement[]=[];
    if(alertCount)statements.push(env.DB.prepare("INSERT INTO notifications(type,source_key,payload_json,created_at) SELECT 'expiry-alerts',?,json_object('businessDate',?,'count',?),? WHERE EXISTS(SELECT 1 FROM scheduled_runs WHERE job_name='staff-expiry' AND business_date=? AND state='running' AND attempt_token=?) ON CONFLICT(source_key) DO NOTHING").bind(`expiry-alerts:${businessDate}`,businessDate,alertCount,ts,businessDate,token));
    statements.push(env.DB.prepare("UPDATE scheduled_runs SET state='completed',completed_at=?,alert_count=?,attempt_token=NULL,lease_expires_at=NULL WHERE job_name='staff-expiry' AND business_date=? AND state='running' AND attempt_token=? RETURNING state").bind(ts,alertCount,businessDate,token));
    const results=await batch(env.DB,statements),completion=results.at(-1);
    if(!completion?.meta.changes)throw new Error('lease_lost');
    let cleanup:'completed'|'failed'='completed';
    try{await run(env.DB.prepare('DELETE FROM auth_rate_limits WHERE rowid IN (SELECT rowid FROM auth_rate_limits WHERE expires_at<=? ORDER BY expires_at LIMIT 500)').bind(ts));}catch{cleanup='failed';console.warn(JSON.stringify({event:'scheduled_cleanup',job:'staff-expiry',businessDate,outcome:'failed'}));}
    return{businessDate,state:'completed',alertCount,cleanup};
  }catch(error){
    if(error instanceof Error&&error.message==='lease_lost')throw error;
    await run(env.DB.prepare("UPDATE scheduled_runs SET state='failed',failed_at=?,error_code='processing_failed',attempt_token=NULL,lease_expires_at=NULL WHERE job_name='staff-expiry' AND business_date=? AND state='running' AND attempt_token=?").bind(ts,businessDate,token));
    throw error;
  }
}
