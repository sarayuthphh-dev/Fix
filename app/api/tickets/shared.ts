import { env } from 'cloudflare:workers';
import { z } from 'zod';
import {programs,categories,requestTypeValues} from '../../../lib/ticket-options';
import { getDb } from '../../../db';
import { tickets } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import {resolveActor,isStaff,canRead} from '../../../lib/auth';
import {json,sameOrigin,HttpError,failure} from '../../../lib/http';
export {env,getDb,tickets,eq,json,sameOrigin,HttpError,failure,isStaff,canRead};
export const identity=resolveActor;
export function unpack(t:typeof tickets.$inferSelect){return {...t,events:JSON.parse(t.events),attachments:JSON.parse(t.attachments)};}
export const createSchema=z.object({title:z.string().trim().min(5).max(200),cooperativeId:z.string().uuid(),requestType:z.enum(requestTypeValues).default('issue'),program:z.enum(programs),category:z.enum(categories),priority:z.enum(['low','medium','high']),reporter:z.string().trim().min(1).max(100),email:z.string().trim().email().max(150),description:z.string().trim().min(10).max(10000),website:z.string().max(0).optional()});
export const patchSchema=z.object({status:z.enum(['new','progress','waiting','resolved']).optional(),assignee:z.string().trim().max(100).optional(),comment:z.string().trim().max(3000).default(''),updatedAt:z.number().int().positive(),approvalStatus:z.enum(['approved','rejected']).optional()});
export const statusLabels={new:'รอรับเรื่อง',progress:'กำลังดำเนินการ',waiting:'รอข้อมูลเพิ่มเติม',resolved:'แก้ไขแล้ว'};
export async function findTicket(id:string){return getDb().select().from(tickets).where(eq(tickets.id,id)).get();}
