import { HttpError, nowIso } from './http';
export async function one<T>(stmt:D1PreparedStatement):Promise<T|null>{ try{return (await stmt.first<T>())??null;}catch(e){throw dbError(e);} }
export async function all<T>(stmt:D1PreparedStatement):Promise<T[]>{ try{return (await stmt.all<T>()).results;}catch(e){throw dbError(e);} }
export async function run(stmt:D1PreparedStatement):Promise<D1Result>{try{return await stmt.run();}catch(e){throw dbError(e);} }
export async function batch(db:D1Database,statements:D1PreparedStatement[]):Promise<D1Result[]>{try{return await db.batch(statements);}catch(e){throw dbError(e);} }
export function dbError(error:unknown):HttpError {
  if(error instanceof HttpError)return error;
  const m=error instanceof Error?error.message:'';
  if(m.includes('invoice_chain_conflict'))return new HttpError(409,'Invoice chain changed; retry the request','invoice_chain_conflict');
  if(m.includes('UNIQUE'))return new HttpError(409,'Resource already exists','conflict');
  if(m.includes('FOREIGN KEY')||m.includes('CHECK')||m.includes('NOT NULL')||m.includes('missing_enquiry_parent')||m.includes('SQLITE_CONSTRAINT'))return new HttpError(409,'Referenced resource changed','reference_changed');
  if(m.toLowerCase().includes('quota')||m.includes('D1_ERROR'))return new HttpError(503,'Service temporarily unavailable','database_unavailable');
  return new HttpError(500,'Internal server error','database');
}
export async function counter(db:D1Database,kind:string,scope=''):Promise<number>{ const t=nowIso(); await run(db.prepare('INSERT INTO number_counters(kind,scope,next_value,updated_at) VALUES(?,?,1,?) ON CONFLICT(kind,scope) DO NOTHING').bind(kind,scope,t)); const row=await one<{value:number}>(db.prepare('UPDATE number_counters SET next_value=next_value+1,updated_at=? WHERE kind=? AND scope=? AND next_value<2147483647 RETURNING next_value-1 AS value').bind(t,kind,scope)); if(!row) throw new HttpError(409,'Sequence exhausted','sequence_exhausted'); return row.value; }
export function placeholders(count:number){return Array.from({length:count},()=>'?').join(',');}
