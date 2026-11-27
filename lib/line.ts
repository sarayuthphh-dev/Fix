import {env} from 'cloudflare:workers';
import {and,eq,inArray,lt,sql} from 'drizzle-orm';
import {getDb} from '../db';
import {lineSettings,lineNotifications,lineGroups,lineUsers,tickets} from '../db/schema';
import {HttpError} from './http';
const enc=new TextEncoder();const dec=new TextDecoder();
const to64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const from64=(text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function encryptionKey(){try{const bytes=from64(env.LINE_SETTINGS_KEY||'');if(bytes.length!==32)throw new Error();return await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}catch{throw new HttpError(503,'ยังไม่ได้ตั้งค่ากุญแจปกป้องข้อมูล LINE ที่โฮสต์');}}
export async function encryptLineSecret(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('CAD-LINE-v1')},await encryptionKey(),enc.encode(value));return to64(iv)+'.'+to64(new Uint8Array(data));}
async function decryptLineSecret(value:string){const [iv,data]=value.split('.');try{return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(iv),additionalData:enc.encode('CAD-LINE-v1')},await encryptionKey(),from64(data)));}catch{throw new HttpError(503,'อ่านข้อมูลเชื่อมต่อ LINE ไม่ได้ กรุณาตรวจสอบการตั้งค่ากุญแจ');}}
export async function getLineSettings(){return getDb().select().from(lineSettings).where(eq(lineSettings.id,'default')).get();}
export async function getLineRecipient(id:string){const table=id.startsWith('U')?lineUsers:lineGroups;return getDb().select().from(table).where(eq(table.id,id)).get();}
export async function getLineCredentials(){const settings=await getLineSettings();if(!settings?.encryptedAccessToken||!settings.encryptedChannelSecret)return null;return {...settings,accessToken:await decryptLineSecret(settings.encryptedAccessToken),channelSecret:await decryptLineSecret(settings.encryptedChannelSecret)};}
export function lineApiBase(){const mock=env.LINE_API_BASE_URL;if(mock&&env.PUBLIC_APP_ORIGIN?.startsWith('http://127.0.0.1:')){try{const u=new URL(mock);if(u.protocol==='http:'&&u.hostname==='127.0.0.1')return u.origin;}catch{}}return 'https://api.line.me';}
export async function lineRequest(path:string,accessToken:string,init:RequestInit={}){return fetch(lineApiBase()+path,{...init,headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(4000)});}
export function lineError(status:number){if(status===401||status===403)return 'LINE ปฏิเสธบัญชีหรือ Token กรุณาตรวจสอบการเชื่อมต่อ';if(status===429)return 'LINE จำกัดการส่งหรือโควตาเต็ม กรุณาตรวจสอบแพ็กเกจและลองใหม่ภายหลัง';if(status===400||status===404)return 'ส่งถึงผู้รับนี้ไม่ได้ กรุณาตรวจสอบการเพิ่มเพื่อน OA หรือการเชิญ OA เข้ากลุ่ม';return 'LINE ขัดข้องหรือเชื่อมต่อไม่ได้ กรุณาลองใหม่';}
export async function verifyLineSignature(bytes:Uint8Array,signature:string,secret:string){try{const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);return await crypto.subtle.verify('HMAC',key,from64(signature),new Uint8Array(bytes));}catch{return false;}}
const oneLine=(s:string,max=200)=>s.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,max).trim();
export function lineTicketMessage(t:Pick<typeof tickets.$inferSelect,'id'|'number'|'office'|'program'|'requestType'|'priority'|'title'|'createdAt'>,origin:string){const url=new URL('/manage',origin);url.searchParams.set('ticket',t.id);const priority=t.priority==='high'?'สูง':t.priority==='low'?'ต่ำ':'ปานกลาง';return ['📩 CAD Support — รับเรื่องใหม่','เลขอ้างอิง: '+oneLine(t.number),'สหกรณ์: '+oneLine(t.office),'โปรแกรม: '+oneLine(t.program),'ประเภท: '+(t.requestType==='change'?'ขอแก้ไข':'แจ้งปัญหา'),'ความเร่งด่วน: '+priority,'หัวข้อ: '+oneLine(t.title),'แจ้งเมื่อ: '+new Date(t.createdAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}),'เปิดรายละเอียด (ต้องเข้าสู่ระบบเจ้าหน้าที่):',url.toString()].join('\n');}
export function newLineNotification(ticketId:string,now=Date.now()){return {ticketId,retryKey:crypto.randomUUID(),status:'waiting_config',createdAt:now,updatedAt:now};}
export async function dispatchLineNotification(ticketId:string){
 const db=getDb();let claimed=false;
 try{
  let item=await db.select().from(lineNotifications).where(eq(lineNotifications.ticketId,ticketId)).get();if(!item||item.status==='accepted')return;
  const cfg=await getLineCredentials();const recipient=cfg?.destinationId?await getLineRecipient(cfg.destinationId):null;
  if(!cfg?.enabled||!cfg.botId||!cfg.destinationId||!cfg.testAcceptedAt||!recipient?.active){if(item.status!=='sending')await db.update(lineNotifications).set({status:'waiting_config',lastError:'ยังไม่เปิดแจ้งเตือน LINE หรือยังไม่ได้เลือกและทดสอบผู้รับ',updatedAt:Date.now()}).where(eq(lineNotifications.ticketId,ticketId)).run();return;}
  const now=Date.now();if(item.firstAttemptAt&&now-item.firstAttemptAt>=23*3600000){await db.update(lineNotifications).set({status:'failed',lastError:'คำขอเดิมเกินช่วงส่งซ้ำอย่างปลอดภัย กรุณาตรวจสอบในกลุ่มก่อนดำเนินการ',updatedAt:now}).where(eq(lineNotifications.ticketId,ticketId)).run();return;}
  if(item.destinationId&&(item.destinationId!==cfg.destinationId||item.botId!==cfg.botId)){await db.update(lineNotifications).set({status:'failed',lastError:'บัญชีหรือกลุ่มปลายทางเปลี่ยน จึงไม่ส่งเรื่องเดิมข้ามปลายทาง',updatedAt:now}).where(eq(lineNotifications.ticketId,ticketId)).run();return;}
  const lock=await db.update(lineNotifications).set({status:'sending',lockUntil:now+30000,updatedAt:now}).where(and(eq(lineNotifications.ticketId,ticketId),inArray(lineNotifications.status,['waiting_config','pending','failed','sending']),lt(lineNotifications.lockUntil,now))).returning().get();if(!lock)return;claimed=true;item=lock;
  const ticket=await db.select().from(tickets).where(eq(tickets.id,ticketId)).get();if(!ticket)throw new Error('Ticket no longer exists');const origin=env.PUBLIC_APP_ORIGIN;if(!origin)throw new Error('Missing application origin');const message=item.message||lineTicketMessage(ticket,origin);
  await db.update(lineNotifications).set({destinationId:cfg.destinationId,botId:cfg.botId,message,firstAttemptAt:item.firstAttemptAt||now,lastAttemptAt:now,attempts:sql`${lineNotifications.attempts}+1`}).where(eq(lineNotifications.ticketId,ticketId)).run();
  const response=await lineRequest('/v2/bot/message/push',cfg.accessToken,{method:'POST',headers:{'X-Line-Retry-Key':item.retryKey},body:JSON.stringify({to:cfg.destinationId,messages:[{type:'text',text:message}]})});
  const accepted=response.ok||(response.status===409&&!!response.headers.get('x-line-accepted-request-id'));
  await db.update(lineNotifications).set({status:accepted?'accepted':'failed',acceptedAt:accepted?Date.now():null,lastHttpStatus:response.status,lastError:accepted?null:lineError(response.status),lockUntil:0,updatedAt:Date.now()}).where(eq(lineNotifications.ticketId,ticketId)).run();
 }catch{
  if(claimed)await db.update(lineNotifications).set({status:'failed',lastError:'ส่ง LINE ไม่สำเร็จหรือหมดเวลารอ เรื่องยังถูกบันทึกในระบบ สามารถกดลองส่งอีกครั้งได้',lockUntil:0,updatedAt:Date.now()}).where(eq(lineNotifications.ticketId,ticketId)).run();
 }
}
