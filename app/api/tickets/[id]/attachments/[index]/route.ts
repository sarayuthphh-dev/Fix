import {identity,json,findTicket,unpack,env} from '../../../shared';
export async function GET(request:Request,ctx:{params:Promise<{id:string;index:string}>}){
 if(!identity(request))return json({error:'กรุณาเข้าสู่ระบบก่อนดาวน์โหลดไฟล์'},401);
 try{const {id,index}=await ctx.params;if(!/^\d+$/.test(index))return json({error:'ไม่พบไฟล์'},404);const t=await findTicket(id);if(!t)return json({error:'ไม่พบรายการ'},404);const f=unpack(t).attachments[Number(index)];if(!f)return json({error:'ไม่พบไฟล์'},404);const object=await env.BUCKET?.get(f.key);if(!object)return json({error:'ไม่พบไฟล์'},404);return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(f.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch(e){console.error('Attachment read failed',e);return json({error:'ไม่สามารถดาวน์โหลดไฟล์ได้'},503);}
}
