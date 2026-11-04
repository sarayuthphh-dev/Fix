import {getDb} from '../../../../db';
import {cooperatives} from '../../../../db/schema';
import {and,eq,like,or,asc} from 'drizzle-orm';
import {json,failure} from '../../../../lib/http';
export async function GET(request:Request){try{const url=new URL(request.url);const q=(url.searchParams.get('q')||'').trim().slice(0,100);const code=(url.searchParams.get('code')||'').slice(0,50);const rows=await getDb().select({id:cooperatives.id,code:cooperatives.code,name:cooperatives.name,province:cooperatives.province}).from(cooperatives).where(and(eq(cooperatives.active,1),code?eq(cooperatives.code,code):q?or(like(cooperatives.name,'%'+q+'%'),like(cooperatives.code,'%'+q+'%')):undefined)).orderBy(asc(cooperatives.name)).limit(50).all();return json({cooperatives:rows});}catch(e){return failure(e);}}
