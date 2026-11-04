import {env} from 'cloudflare:workers';
import {and,eq} from 'drizzle-orm';
import {getDb} from '../db';
import {contacts,cooperatives,staffMembers} from '../db/schema';
export type Actor={id:string;email:string;name:string;role:'admin'|'agent'|'contact';cooperativeIds:string[];authMethod:'chatgpt'|'email'};
export function nativeIdentity(request:Request){const id=request.headers.get('oai-authenticated-user-id');if(!id)return null;const email=(request.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase();let name=request.headers.get('oai-authenticated-user-full-name')||email||'ผู้ใช้งาน';if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name);}catch{}}return {id,email,name};}
export function authConfig(){if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)return null;let url:URL;try{url=new URL(env.SUPABASE_URL);}catch{return null;}const local=url.hostname==='127.0.0.1'||url.hostname==='localhost';if(url.protocol!=='https:'&&!(local&&env.PUBLIC_APP_ORIGIN?.startsWith('http://127.0.0.1:')))return null;return {url:url.origin,key:env.SUPABASE_ANON_KEY};}
export function cookieName(request:Request,name:string){return (new URL(request.url).protocol==='https:'?'__Host-cad_':'cad_')+name;}
export function readCookie(request:Request,name:string){const prefix=cookieName(request,name)+'=';return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(prefix))?.slice(prefix.length)||'';}
export function setCookie(request:Request,name:string,value:string,seconds:number){return cookieName(request,name)+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+seconds+(new URL(request.url).protocol==='https:'?'; Secure':'');}
export async function provider(path:string,init:RequestInit={}){const config=authConfig();if(!config)throw new Error('EMAIL_AUTH_NOT_CONFIGURED');return fetch(config.url+'/auth/v1'+path,{...init,headers:{apikey:config.key,'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(10000)});}
export async function memberships(email:string){return getDb().select({id:cooperatives.id,code:cooperatives.code,name:cooperatives.name,province:cooperatives.province,contactName:contacts.name}).from(contacts).innerJoin(cooperatives,eq(contacts.cooperativeId,cooperatives.id)).where(and(eq(contacts.email,email),eq(contacts.status,'active'),eq(cooperatives.active,1))).all();}
export async function resolveActor(request:Request):Promise<Actor|null>{
 const native=nativeIdentity(request);
 if(native){
  const admins=(env.SUPPORT_ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(admins.includes(native.email))return {...native,role:'admin',cooperativeIds:[],authMethod:'chatgpt'};
  const staff=await getDb().select().from(staffMembers).where(and(eq(staffMembers.email,native.email),eq(staffMembers.active,1))).get();
  if(staff)return {...native,name:staff.name,role:staff.role==='admin'?'admin':'agent',cooperativeIds:[],authMethod:'chatgpt'};
  const member=await memberships(native.email);if(member.length)return {...native,name:member[0].contactName,role:'contact',cooperativeIds:member.map(c=>c.id),authMethod:'chatgpt'};
 }
 const token=readCookie(request,'access');if(!token||token.length>5000||!authConfig())return null;
 try{const res=await provider('/user',{headers:{Authorization:'Bearer '+token}});if(!res.ok)return null;const u=await res.json() as {id?:string;email?:string;email_confirmed_at?:string};if(!u.id||!u.email||!u.email_confirmed_at)return null;const email=u.email.toLowerCase();const member=await memberships(email);if(!member.length)return null;return {id:'supabase:'+u.id,email,name:member[0].contactName,role:'contact',cooperativeIds:member.map(c=>c.id),authMethod:'email'};}catch{return null;}
}
export function isStaff(actor:Actor|null){return actor?.role==='admin'||actor?.role==='agent';}
export function canRead(actor:Actor|null,t:{cooperativeId:string|null}){return !!actor&&(isStaff(actor)||!!t.cooperativeId&&actor.cooperativeIds.includes(t.cooperativeId));}
