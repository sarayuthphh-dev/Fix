import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { getDb } from '../../../db';
import { tickets } from '../../../db/schema';
import { eq } from 'drizzle-orm';
export {env,getDb,tickets,eq};
export function identity(request:Request){const id=request.headers.get('oai-authenticated-user-id');if(!id)return null;const email=request.headers.get('oai-authenticated-user-email')||'';let name=request.headers.get('oai-authenticated-user-full-name')||email||'ผู้ใช้งาน';if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name);}catch{}}return {id,email,name};}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
export function sameOrigin(request:Request){const origin=request.headers.get('Origin');return !origin||origin===new URL(request.url).origin;}
export function unpack(t:typeof tickets.$inferSelect){return {...t,events:JSON.parse(t.events),attachments:JSON.parse(t.attachments)};}
export const createSchema=z.object({title:z.string().trim().min(5).max(200),program:z.enum(['ระบบบัญชีสหกรณ์','ระบบบริหารงานสอบบัญชี','ระบบรายงานข้อมูล','โปรแกรมอื่น ๆ']),category:z.enum(['การเข้าใช้งาน','ข้อมูลและรายงาน','การติดตั้งโปรแกรม','การใช้งานทั่วไป']),priority:z.enum(['low','medium','high']),reporter:z.string().trim().min(1).max(100),office:z.string().trim().min(1).max(200),email:z.string().trim().email().max(150),description:z.string().trim().min(10).max(10000)});
export const patchSchema=z.object({status:z.enum(['new','progress','waiting','resolved']),assignee:z.string().trim().max(100),comment:z.string().trim().max(3000),updatedAt:z.number().int().positive()});
export const statusLabels={new:'รอรับเรื่อง',progress:'กำลังดำเนินการ',waiting:'รอข้อมูลเพิ่มเติม',resolved:'แก้ไขแล้ว'};
export async function findTicket(id:string){return getDb().select().from(tickets).where(eq(tickets.id,id)).get();}
