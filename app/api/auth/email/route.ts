import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {authConfig,memberships,provider,setCookie} from '../../../../lib/auth';
import {limited} from '../../../../lib/limits';
import {json,readJson,failure,HttpError} from '../../../../lib/http';
import {backgroundTask} from '../../../../lib/background';
import {notifyEmailLinkRequest} from '../../../../lib/line-email';
import {recordEmailRequest,finishEmailRequest} from '../../../../lib/email-requests';
function b64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function POST(request:Request){let requestId:string|undefined;try{
 const data=z.object({email:z.string().trim().email().max(150)}).safeParse(await readJson(request,1000));if(!data.success)throw new HttpError(400,'กรุณากรอกอีเมลให้ถูกต้อง');
 const email=data.data.email.toLowerCase();if(await limited(request,'email-login',10,900000)||await limited(request,'email:'+email,3,900000))throw new HttpError(429,'ขอลิงก์บ่อยเกินไป กรุณารอสักครู่');
 const requestedAt=Date.now();const member=await memberships(email);requestId=crypto.randomUUID();await recordEmailRequest(requestId,email,member,requestedAt);await backgroundTask(()=>notifyEmailLinkRequest(email,member,requestId!,requestedAt));
 if(!authConfig()){await finishEmailRequest(requestId,'unavailable');requestId=undefined;throw new HttpError(503,'การเข้าสู่ระบบด้วยอีเมลยังไม่เปิดให้บริการ กรุณาติดต่อผู้ดูแล');}
 const response=json({message:'หากอีเมลนี้ได้รับอนุมัติ ระบบจะส่งลิงก์เข้าสู่ระบบให้ กรุณาเปิดลิงก์ด้วยเบราว์เซอร์ที่ใช้ขอครั้งนี้'});
 if(!member.length){await finishEmailRequest(requestId,'unapproved');return response;}
 const verifier=b64(crypto.getRandomValues(new Uint8Array(48)));const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 const origin=env.PUBLIC_APP_ORIGIN;if(!origin||new URL(origin).origin!==new URL(request.url).origin)throw new HttpError(503,'ที่อยู่เว็บไซต์สำหรับเข้าสู่ระบบยังไม่ได้ตั้งค่า');
 const res=await provider('/otp?redirect_to='+encodeURIComponent(origin+'/auth/finish'),{method:'POST',body:JSON.stringify({email,create_user:true,code_challenge:challenge,code_challenge_method:'s256'})});
 if(!res.ok)throw new HttpError(res.status===429?429:503,'ยังส่งอีเมลไม่ได้ กรุณารอสักครู่แล้วลองใหม่');await finishEmailRequest(requestId,'sent');response.headers.append('Set-Cookie',setCookie(request,'pkce',verifier,1800));return response;
}catch(e){if(requestId)try{await finishEmailRequest(requestId,'failed');}catch{console.error('Unable to update email request status.');}return failure(e);}}
