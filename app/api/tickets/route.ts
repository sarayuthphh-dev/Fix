import { identity,json,sameOrigin,createSchema,getDb,tickets,unpack,env } from './shared';
import { desc } from 'drizzle-orm';
export async function GET(request:Request){const user=identity(request);if(!user)return json({error:'กรุณาเข้าสู่ระบบเพื่อดูรายการแจ้งปัญหา'},401);try{const list=await getDb().select().from(tickets).orderBy(desc(tickets.createdAt)).all();return json({tickets:list.map(unpack),user});}catch(e){console.error('Ticket list failed',e);return json({error:'ไม่สามารถอ่านข้อมูลได้ กรุณาลองใหม่'},503);}}
export async function POST(request:Request){
 const user=identity(request);if(!user)return json({error:'กรุณาเข้าสู่ระบบก่อนส่งเรื่อง'},401);if(!sameOrigin(request))return json({error:'ไม่อนุญาตให้ส่งข้อมูลจากเว็บไซต์อื่น'},403);
 const uploaded:string[]=[];
 try{
  const length=Number(request.headers.get('Content-Length')||0);if(length>16*1024*1024)return json({error:'ไฟล์แนบมีขนาดรวมเกินกำหนด'},413);
  const form=await request.formData();const parsed=createSchema.safeParse(Object.fromEntries(Array.from(form.entries()).filter(([k])=>k!=='files')));if(!parsed.success)return json({error:'กรุณาตรวจสอบข้อมูลให้ครบ หัวข้ออย่างน้อย 5 ตัวอักษร และรายละเอียดอย่างน้อย 10 ตัวอักษร'},400);
  const files=form.getAll('files');if(files.length>3||files.some(f=>typeof f==='string'||f.size>5*1024*1024||!['image/png','image/jpeg','image/webp','application/pdf'].includes(f.type)))return json({error:'รองรับภาพ PNG, JPG, WEBP และ PDF สูงสุด 3 ไฟล์ ไม่เกิน 5 MB ต่อไฟล์'},400);
  const id=crypto.randomUUID();const now=Date.now();const attachments:{key:string;name:string;size:number}[]=[];
  if(files.length&&!env.BUCKET)throw new Error('Attachment storage unavailable');
  for(const value of files){const file=value as File;const key='attachments/'+id+'/'+crypto.randomUUID();await env.BUCKET!.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});uploaded.push(key);attachments.push({key,name:file.name.slice(0,250),size:file.size});}
  const record={...parsed.data,id,number:'CAD-'+(new Date(now).getUTCFullYear()+543)+'-'+id.slice(0,8).toUpperCase(),status:'new',assignee:'',createdAt:now,updatedAt:now,creatorId:user.id,events:JSON.stringify([{text:'แจ้งปัญหาเข้าสู่ระบบ',at:now,author:parsed.data.reporter}]),attachments:JSON.stringify(attachments)};
  await getDb().insert(tickets).values(record).run();return json({ticket:unpack(record)},201);
 }catch(e){for(const key of uploaded){try{await env.BUCKET?.delete(key);}catch{}}console.error('Ticket creation failed',e);return json({error:'ไม่สามารถบันทึกเรื่องได้ กรุณาลองใหม่ ข้อมูลของคุณยังไม่ถูกบันทึก'},503);}
}
