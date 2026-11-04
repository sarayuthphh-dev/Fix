import {identity,json,sameOrigin,createSchema,getDb,tickets,unpack,env,isStaff,HttpError,failure} from './shared';
import {desc,and,eq,inArray} from 'drizzle-orm';
import {cooperatives,lineNotifications} from '../../../db/schema';
import {newLineNotification,dispatchLineNotification} from '../../../lib/line';
import {backgroundTask} from '../../../lib/background';
import {limited} from '../../../lib/limits';
import {readForm} from '../../../lib/http';
export async function GET(request:Request){try{
 const user=await identity(request);if(!user)throw new HttpError(401,'กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ');
 const scope=isStaff(user)?undefined:inArray(tickets.cooperativeId,user.cooperativeIds);
 const list=await getDb().select().from(tickets).where(scope).orderBy(desc(tickets.createdAt)).all();return json({tickets:list.map(unpack),user});
}catch(e){return failure(e);}}
export async function POST(request:Request){
 const uploaded:string[]=[];let committed=false;
 try{
  if(!sameOrigin(request))throw new HttpError(403,'ไม่อนุญาตคำขอจากเว็บไซต์อื่น');
  const user=await identity(request);if(!isStaff(user)&&await limited(request,'ticket-create',20))throw new HttpError(429,'ส่งเรื่องบ่อยเกินไป กรุณารอสักครู่');
  const length=Number(request.headers.get('Content-Length')||0);if(length>16*1024*1024)throw new HttpError(413,'ไฟล์แนบมีขนาดรวมเกินกำหนด');
  const form=await readForm(request);const parsed=createSchema.safeParse(Object.fromEntries(Array.from(form.entries()).filter(([k])=>k!=='files')));if(!parsed.success)throw new HttpError(400,'กรุณาเลือกสหกรณ์และกรอกข้อมูลให้ครบ หัวข้ออย่างน้อย 5 ตัวอักษร รายละเอียดอย่างน้อย 10 ตัวอักษร');
  const d=parsed.data;const coop=await getDb().select().from(cooperatives).where(and(eq(cooperatives.id,d.cooperativeId),eq(cooperatives.active,1))).get();if(!coop)throw new HttpError(400,'ไม่พบสหกรณ์ที่เลือกหรือสหกรณ์ถูกระงับการใช้งาน');
  if(user&&!isStaff(user)&&!user.cooperativeIds.includes(coop.id))throw new HttpError(403,'คุณไม่ได้รับสิทธิ์ของสหกรณ์นี้');
  if(d.requestType==='change'&&!user)throw new HttpError(403,'คำขอแก้ไขต้องเข้าสู่ระบบด้วยผู้ติดต่อที่ได้รับอนุมัติ');
  const files=form.getAll('files');if(files.length>3||files.some(f=>typeof f==='string'||f.size>5*1024*1024||!['image/png','image/jpeg','image/webp','application/pdf'].includes(f.type)))throw new HttpError(400,'รองรับ PNG, JPG, WEBP และ PDF สูงสุด 3 ไฟล์ ไฟล์ละไม่เกิน 5 MB');
  const id=crypto.randomUUID();const now=Date.now();const attachments:{key:string;name:string;size:number}[]=[];
  if(files.length&&!env.BUCKET)throw new Error('Attachment storage unavailable');
  for(const value of files){const file=value as File;const key='attachments/'+id+'/'+crypto.randomUUID();await env.BUCKET!.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});uploaded.push(key);attachments.push({key,name:file.name.slice(0,250),size:file.size});}
  const {website,...fields}=d;const record={...fields,email:user&&!isStaff(user)?user.email:d.email,reporter:user&&!isStaff(user)?user.name:d.reporter,office:coop.name,id,number:'CAD-'+(new Date(now).getUTCFullYear()+543)+'-'+id.slice(0,8).toUpperCase(),status:'new',assignee:'',approvalStatus:d.requestType==='change'?'pending':'not_required',submitterVerified:user?1:0,createdAt:now,updatedAt:now,creatorId:user?.id||'guest:'+id,events:JSON.stringify([{text:d.requestType==='change'?'ส่งคำขอแก้ไข รอผู้ดูแลอนุมัติ':'แจ้งปัญหาเข้าสู่ระบบ',at:now,author:user&&!isStaff(user)?user.name:d.reporter}]),attachments:JSON.stringify(attachments)};
  await getDb().batch([getDb().insert(tickets).values(record),getDb().insert(lineNotifications).values(newLineNotification(id,now))]);committed=true;
  await backgroundTask(()=>dispatchLineNotification(id));return user?json({ticket:unpack(record)},201):json({receipt:{number:record.number,program:record.program,cooperative:coop.name,status:'new'}},201);
 }catch(e){for(const key of committed?[]:uploaded){try{await env.BUCKET?.delete(key);}catch{}}return failure(e);}
}