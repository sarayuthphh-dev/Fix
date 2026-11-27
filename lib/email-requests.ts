import {desc,eq,inArray} from 'drizzle-orm';
import {getDb} from '../db';
import {registryEvents} from '../db/schema';

const action='email.link.request';
export type EmailRequestStatus='processing'|'unapproved'|'unavailable'|'sent'|'failed'|'legacy';
export type EmailRequest={id:string;at:number;email:string;name:string;cooperatives:string;status:EmailRequestStatus;lineStatus:string;legacy:boolean};
type Member={name:string;contactName:string};
export async function recordEmailRequest(id:string,email:string,members:Member[],at:number){
 const data={email,name:members[0]?.contactName||'',cooperatives:[...new Set(members.map(m=>m.name))].join(' / '),status:'processing'};
 await getDb().insert(registryEvents).values({id:'email:'+id,actor:'system',action,target:JSON.stringify(data),at}).run();
}
export async function finishEmailRequest(id:string,status:EmailRequestStatus){
 const db=getDb();const row=await db.select().from(registryEvents).where(eq(registryEvents.id,'email:'+id)).get();if(!row)return;
 await db.update(registryEvents).set({target:JSON.stringify({...JSON.parse(row.target),status})}).where(eq(registryEvents.id,row.id)).run();
}
// Private staff history. Older LINE events only contain masked email addresses.
export async function emailRequestHistory():Promise<EmailRequest[]>{
 const rows=await getDb().select().from(registryEvents).where(inArray(registryEvents.action,[action,'line.email.accepted','line.email.failed','line.email.skipped'])).orderBy(desc(registryEvents.at)).limit(1000).all();
 const line=new Map(rows.filter(r=>r.action.startsWith('line.email.')).map(r=>[r.id,r.action.slice('line.email.'.length)]));
 const known=new Set(rows.filter(r=>r.action===action).map(r=>r.id.slice(6)));
 return rows.flatMap(row=>{try{const d=JSON.parse(row.target);if(row.action===action)return [{id:row.id,at:row.at,email:String(d.email||''),name:String(d.name||''),cooperatives:String(d.cooperatives||''),status:d.status as EmailRequestStatus,lineStatus:line.get(row.id.slice(6))||'processing',legacy:false}];
  if(known.has(row.id))return [];return [{id:row.id,at:row.at,email:String(d.email||''),name:'',cooperatives:String(d.cooperatives||''),status:'legacy' as const,lineStatus:line.get(row.id)||'',legacy:true}];
 }catch{return [];}}).slice(0,500);
}
