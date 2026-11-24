import {z} from 'zod';
import {and,eq,asc,desc,inArray,sql} from 'drizzle-orm';
import {getDb} from '../../../db';
import {cooperatives,contacts,staffMembers,registryEvents} from '../../../db/schema';
import {resolveActor,isStaff,authConfig} from '../../../lib/auth';
import {json,readJson,failure,HttpError} from '../../../lib/http';
const email=z.string().trim().email().max(150).transform(s=>s.toLowerCase());
const coopFields={code:z.string().trim().min(1).max(50),name:z.string().trim().min(2).max(200),province:z.string().trim().max(100).default('')};
const importRow=z.object({code:coopFields.code,name:coopFields.name});
const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('cooperative.save'),id:z.string().uuid().optional(),...coopFields,active:z.boolean().default(true)}),
 z.object({action:z.literal('cooperative.status'),id:z.string().uuid(),active:z.boolean()}),
 z.object({action:z.literal('contact.save'),cooperativeId:z.string().uuid(),name:z.string().trim().min(2).max(100),email,phone:z.string().trim().max(30).default(''),status:z.enum(['pending','active']).default('pending')}),
 z.object({action:z.literal('contact.status'),id:z.string().uuid(),status:z.enum(['active','suspended'])}),
 z.object({action:z.literal('staff.save'),email,name:z.string().trim().min(2).max(100),role:z.enum(['admin','agent']),active:z.boolean()}),
 z.object({action:z.literal('import'),rows:z.array(importRow).min(1).max(500)})
]);
export async function GET(request:Request){try{const actor=await resolveActor(request);if(!isStaff(actor))throw new HttpError(actor?403:401,'เฉพาะเจ้าหน้าที่ที่ได้รับสิทธิ์');const db=getDb();const [coops,members,staff]=await Promise.all([db.select().from(cooperatives).orderBy(asc(cooperatives.name)).all(),db.select().from(contacts).orderBy(desc(contacts.createdAt)).all(),actor!.role==='admin'?db.select().from(staffMembers).orderBy(asc(staffMembers.name)).all():Promise.resolve([])]);return json({cooperatives:coops,contacts:members,staff,user:actor,emailLoginReady:!!authConfig()});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const actor=await resolveActor(request);if(actor?.role!=='admin')throw new HttpError(actor?403:401,'เฉพาะผู้ดูแลระบบที่จัดการทะเบียนได้');const parsed=actionSchema.safeParse(await readJson(request,1500000));if(!parsed.success)throw new HttpError(400,'ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง กรุณาตรวจสอบชื่อ รหัส และอีเมล');const d=parsed.data;const db=getDb();const now=Date.now();let target='';let result:unknown;
 if(d.action==='cooperative.save'){
  if(d.id){const row=await db.update(cooperatives).set({code:d.code,name:d.name,province:d.province,active:d.active?1:0}).where(eq(cooperatives.id,d.id)).returning().get();if(!row)throw new HttpError(404,'ไม่พบสหกรณ์');result=row;target=row.id;}
  else{const row={id:crypto.randomUUID(),code:d.code,name:d.name,province:d.province,active:d.active?1:0,createdAt:now};await db.insert(cooperatives).values(row).run();result=row;target=row.id;}
 }else if(d.action==='cooperative.status'){
  const row=await db.update(cooperatives).set({active:d.active?1:0}).where(eq(cooperatives.id,d.id)).returning().get();if(!row)throw new HttpError(404,'ไม่พบสหกรณ์');result=row;target=d.id;
 }else if(d.action==='contact.save'){
  const coop=await db.select().from(cooperatives).where(eq(cooperatives.id,d.cooperativeId)).get();if(!coop)throw new HttpError(400,'ไม่พบสหกรณ์');const row={id:crypto.randomUUID(),cooperativeId:d.cooperativeId,name:d.name,email:d.email,phone:d.phone,status:d.status,approvedBy:d.status==='active'?actor.email:null,approvedAt:d.status==='active'?now:null,createdAt:now};
  result=await db.insert(contacts).values(row).onConflictDoUpdate({target:[contacts.cooperativeId,contacts.email],set:{name:row.name,phone:row.phone,status:row.status,approvedBy:row.approvedBy,approvedAt:row.approvedAt}}).returning().get();target=d.cooperativeId+':'+d.email;
 }else if(d.action==='contact.status'){
  const row=await db.update(contacts).set({status:d.status,approvedBy:actor.email,approvedAt:now}).where(eq(contacts.id,d.id)).returning().get();if(!row)throw new HttpError(404,'ไม่พบผู้ติดต่อ');result=row;target=d.id;
 }else if(d.action==='staff.save'){
  result=await db.insert(staffMembers).values({email:d.email,name:d.name,role:d.role,active:d.active?1:0}).onConflictDoUpdate({target:staffMembers.email,set:{name:d.name,role:d.role,active:d.active?1:0}}).returning().get();target=d.email;
 }else{
  const byCode=new Map<string,z.infer<typeof importRow>>();for(const row of d.rows){const prior=byCode.get(row.code);if(prior&&prior.name!==row.name)throw new HttpError(400,'รหัสสหกรณ์ซ้ำแต่ชื่อไม่ตรงกัน: '+row.code);byCode.set(row.code,row);}
  const existing=await db.select().from(cooperatives).where(inArray(cooperatives.code,[...byCode.keys()])).all();const ids=new Map(existing.map(c=>[c.code,c.id]));const values=[...byCode.values()].map(row=>({id:ids.get(row.code)||crypto.randomUUID(),code:row.code,name:row.name,createdAt:now,active:1}));
  const statements=[];for(let i=0;i<values.length;i+=10)statements.push(db.insert(cooperatives).values(values.slice(i,i+10)).onConflictDoUpdate({target:cooperatives.code,set:{name:sql`excluded.name`}}));
  // D1 batch applies the validated import atomically. Existing approvals are preserved.
  await db.batch(statements as [typeof statements[number],...typeof statements]);target='import:'+values.length;result={cooperatives:values.length,contacts:0};
 }
 await db.insert(registryEvents).values({id:crypto.randomUUID(),actor:actor.email,action:d.action,target,at:now}).run();return json({ok:true,result});
}catch(e){if(e instanceof Error&&e.message.includes('UNIQUE constraint'))return json({error:'รหัสหรืออีเมลนี้มีอยู่แล้ว กรุณาตรวจสอบทะเบียน'},409);return failure(e);}}
