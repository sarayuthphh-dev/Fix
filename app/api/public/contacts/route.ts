import {z} from 'zod';
import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {contacts,cooperatives} from '../../../../db/schema';
import {json,failure,readJson,HttpError} from '../../../../lib/http';
import {limited} from '../../../../lib/limits';
export async function POST(request:Request){try{
 const p=z.object({cooperativeId:z.string().uuid(),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(150),phone:z.string().trim().min(8).max(30),website:z.string().max(0).optional()}).safeParse(await readJson(request,3000));if(!p.success)throw new HttpError(400,'กรุณาระบุสหกรณ์ ชื่อ อีเมล และเบอร์โทรศัพท์ให้ครบ');if(await limited(request,'contact-request',5))throw new HttpError(429,'ส่งคำขอบ่อยเกินไป กรุณาติดต่อเจ้าหน้าที่');
 const d=p.data;const coop=await getDb().select().from(cooperatives).where(and(eq(cooperatives.id,d.cooperativeId),eq(cooperatives.active,1))).get();if(!coop)throw new HttpError(400,'ไม่พบสหกรณ์ที่เลือก');
 await getDb().insert(contacts).values({id:crypto.randomUUID(),cooperativeId:d.cooperativeId,name:d.name,email:d.email.toLowerCase(),phone:d.phone,status:'pending',createdAt:Date.now()}).onConflictDoNothing({target:[contacts.cooperativeId,contacts.email]}).run();return json({message:'รับคำขอแล้ว ผู้ดูแลจะตรวจสอบกับสหกรณ์ก่อนอนุมัติการเข้าถึง'});
}catch(e){return failure(e);}}
