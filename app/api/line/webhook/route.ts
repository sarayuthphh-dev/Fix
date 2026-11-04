import {z} from 'zod';
import {eq,and} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {lineGroups,lineSettings} from '../../../../db/schema';
import {getLineCredentials,verifyLineSignature,lineRequest} from '../../../../lib/line';
import {json,boundedBody,HttpError,failure} from '../../../../lib/http';
const eventSchema=z.object({events:z.array(z.object({type:z.string().max(50),source:z.object({type:z.string().max(20),groupId:z.string().max(100).optional()}).optional(),timestamp:z.number().optional()})).max(100)});
export async function POST(request:Request){try{
 const signature=request.headers.get('x-line-signature');if(!signature)throw new HttpError(401,'ไม่มีลายเซ็น LINE');const cfg=await getLineCredentials();if(!cfg)throw new HttpError(503,'ยังไม่ได้ตั้งค่า LINE');const bytes=await boundedBody(request,256000);if(!await verifyLineSignature(bytes,signature,cfg.channelSecret))throw new HttpError(401,'ลายเซ็น LINE ไม่ถูกต้อง');
 let raw;try{raw=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'ข้อมูล Webhook ไม่ถูกต้อง');}const p=eventSchema.safeParse(raw);if(!p.success)throw new HttpError(400,'ข้อมูล Webhook ไม่ถูกต้อง');
 const events=new Map<string,typeof p.data.events[number]>();for(const event of p.data.events){const id=event.source?.groupId;if(event.source?.type==='group'&&id&&/^C[0-9a-f]{32}$/i.test(id))events.set(id,event);}
 const db=getDb();for(const [id,event] of events){const now=Date.now();const prior=await db.select().from(lineGroups).where(eq(lineGroups.id,id)).get();if(event.type==='leave'){await db.update(lineGroups).set({active:0,lastSeenAt:now}).where(eq(lineGroups.id,id)).run();await db.update(lineSettings).set({enabled:0,testAcceptedAt:null,testAttemptAt:null,testRetryKey:crypto.randomUUID(),updatedAt:now}).where(and(eq(lineSettings.id,'default'),eq(lineSettings.destinationId,id))).run();continue;}
  let name=prior?.name||'กลุ่ม LINE …'+id.slice(-6);if(!prior){try{const res=await lineRequest('/v2/bot/group/'+encodeURIComponent(id)+'/summary',cfg.accessToken);if(res.ok){const d=await res.json() as {groupName?:string};if(d.groupName)name=d.groupName.slice(0,150);}}catch{}}
  await db.insert(lineGroups).values({id,name,active:1,lastSeenAt:now}).onConflictDoUpdate({target:lineGroups.id,set:{name,active:1,lastSeenAt:now}}).run();
 }
 return json({ok:true});
}catch(e){return failure(e);}}
