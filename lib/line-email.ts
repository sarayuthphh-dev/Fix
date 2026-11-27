import {env} from 'cloudflare:workers';
import {desc,inArray} from 'drizzle-orm';
import {getDb} from '../db';
import {registryEvents} from '../db/schema';
import {getLineCredentials,getLineRecipient,lineRequest,lineError} from './line';

type Member={id:string;name:string;contactName:string};
type Result='accepted'|'failed'|'skipped';
const actions=['line.email.accepted','line.email.failed','line.email.skipped'];
const text=(s:string,max=180)=>s.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,max);
export function maskEmail(email:string){const at=email.lastIndexOf('@');return email.slice(0,1)+'***'+email.slice(at);}
// Best-effort alert: failure must never prevent issuing the email link or its PKCE cookie.
// Triggered before approval/provider decisions. One validated, rate-limited click gets one alert.
export async function notifyEmailLinkRequest(email:string,members:Member[],requestId=crypto.randomUUID(),at=Date.now()){
 let status:Result='skipped';let reason='ยังไม่เปิดแจ้งเตือน LINE';const masked=maskEmail(email);const coops=[...new Map(members.map(m=>[m.id,text(m.name)])).values()];
 try{
  const cfg=await getLineCredentials();
  if(cfg?.enabled&&cfg.botId&&cfg.destinationId?.startsWith('U')&&cfg.testAcceptedAt){
   const recipient=await getLineRecipient(cfg.destinationId);
   if(recipient?.active){
    const origin=env.PUBLIC_APP_ORIGIN;if(!origin)throw new Error('Missing origin');const url=new URL('/manage?view=registry&tab=email-requests',origin);
    const message=['✉️ CAD Support — มีการกดขอรับลิงก์เข้าใช้งาน','ผู้ขอ: '+text(members[0]?.contactName||'ยังไม่พบผู้ติดต่อที่ได้รับอนุมัติ'),
     'อีเมล: '+masked,'สหกรณ์: '+(coops.length?coops.slice(0,5).join(' / ')+(coops.length>5?' และอีก '+(coops.length-5)+' แห่ง':''):'ยังไม่พบสหกรณ์ที่ได้รับอนุมัติ'),
     'เวลา: '+new Date(at).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}),
     'แจ้งเมื่อกดปุ่มรับลิงก์ ยังไม่ยืนยันสิทธิ์ ผลส่งอีเมล หรือการเข้าสู่ระบบ',
     'ดูประวัติคำขอรับลิงก์ (ต้องเข้าสู่ระบบเจ้าหน้าที่):',url.toString()].join('\n');
    status='failed';reason='เชื่อมต่อ LINE ไม่สำเร็จ';
    const res=await lineRequest('/v2/bot/message/push',cfg.accessToken,{method:'POST',headers:{'X-Line-Retry-Key':requestId},body:JSON.stringify({to:cfg.destinationId,messages:[{type:'text',text:message}]})});
    const accepted=res.ok||(res.status===409&&!!res.headers.get('x-line-accepted-request-id'));status=accepted?'accepted':'failed';reason=accepted?'LINE รับคำขอแล้ว':lineError(res.status);
   }else reason='ผู้รับแชทส่วนตัวติดต่อไม่ได้';
  }else if(cfg?.enabled)reason='ต้องเลือกและทดสอบผู้รับแชทส่วนตัวก่อนแจ้งคำขอลิงก์อีเมล';
 }catch{status='failed';reason='ส่ง LINE ไม่สำเร็จ การขอลิงก์อีเมลยังดำเนินการตามปกติ';}
 try{await getDb().insert(registryEvents).values({id:requestId,actor:'system',action:'line.email.'+status,target:JSON.stringify({email:masked,cooperatives:coops.slice(0,5).join(' / ')||'ยังไม่พบสหกรณ์ที่ได้รับอนุมัติ',reason}),at}).run();}catch{console.error('Unable to record email-link LINE notification result.');}
}
export async function emailLinkLineHistory(){const rows=await getDb().select().from(registryEvents).where(inArray(registryEvents.action,actions)).orderBy(desc(registryEvents.at)).limit(20).all();return rows.flatMap(row=>{try{const data=JSON.parse(row.target) as {email:string;cooperatives:string;reason:string};return [{id:row.id,at:row.at,status:row.action.slice('line.email.'.length),email:data.email,cooperatives:data.cooperatives,reason:data.reason}];}catch{return [];}});}
