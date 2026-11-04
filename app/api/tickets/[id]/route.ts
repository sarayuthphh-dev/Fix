import {identity,json,sameOrigin,patchSchema,findTicket,getDb,tickets,unpack,statusLabels,eq} from '../shared';
import {and} from 'drizzle-orm';
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){
 const user=identity(request);if(!user)return json({error:'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล'},401);if(!sameOrigin(request))return json({error:'ไม่อนุญาตให้ส่งข้อมูลจากเว็บไซต์อื่น'},403);
 try{
  if(Number(request.headers.get('Content-Length')||0)>16000)return json({error:'ข้อมูลมีขนาดเกินกำหนด'},413);
  const p=patchSchema.safeParse(await request.json());if(!p.success)return json({error:'รูปแบบข้อมูลไม่ถูกต้อง'},400);const {id}=await ctx.params;const current=await findTicket(id);if(!current)return json({error:'ไม่พบรายการนี้'},404);
  if(current.updatedAt!==p.data.updatedAt)return json({error:'รายการถูกเปลี่ยนแปลงแล้ว กรุณาปิดหน้าต่างและโหลดข้อมูลใหม่ก่อนแก้ไข'},409);
  const events=JSON.parse(current.events);const at=Math.max(Date.now(),current.updatedAt+1);if(current.status!==p.data.status)events.push({text:'ปรับสถานะเป็น '+statusLabels[p.data.status],at,author:user.name});if(current.assignee!==p.data.assignee)events.push({text:'กำหนดผู้รับผิดชอบ: '+(p.data.assignee||'ยังไม่ระบุ'),at,author:user.name});if(p.data.comment)events.push({text:p.data.comment,at,author:user.name});
  const values={status:p.data.status,assignee:p.data.assignee,updatedAt:at,events:JSON.stringify(events)};const result=await getDb().update(tickets).set(values).where(and(eq(tickets.id,id),eq(tickets.updatedAt,current.updatedAt))).returning().get();if(!result)return json({error:'มีการเปลี่ยนแปลงพร้อมกัน กรุณาโหลดข้อมูลใหม่'},409);return json({ticket:unpack(result)});
 }catch(e){console.error('Ticket update failed',e);return json({error:'ไม่สามารถบันทึกการเปลี่ยนแปลงได้ กรุณาลองใหม่'},503);}
}
