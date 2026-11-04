import {getDb} from '../db';
import {rateLimits} from '../db/schema';
import {lt,sql} from 'drizzle-orm';
export async function limited(request:Request,action:string,max:number,windowMs=3600000){const now=Date.now();const source=action+'|'+(request.headers.get('cf-connecting-ip')||'local');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))).map(b=>b.toString(16).padStart(2,'0')).join('');const key=hash+':'+Math.floor(now/windowMs);const db=getDb();await db.delete(rateLimits).where(lt(rateLimits.expiresAt,now)).run();const row=await db.insert(rateLimits).values({key,count:1,expiresAt:now+windowMs}).onConflictDoUpdate({target:rateLimits.key,set:{count:sql`${rateLimits.count}+1`}}).returning().get();return (row?.count||max+1)>max;}
