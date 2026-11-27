import ExcelJS from 'exceljs';
import {and,eq,gte,lt,ne,isNull,desc,or,sql} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {tickets} from '../../../../db/schema';
import {resolveActor,isStaff} from '../../../../lib/auth';
import {failure,HttpError} from '../../../../lib/http';
import {reportFilterSchema,reportDayStart,reportSummary,reportStatus,reportConditions,approvalLabels} from '../../../../lib/reporting';
import {unpack} from '../../tickets/shared';
import {requestTypes} from '../../../../lib/ticket-options';
import type {TicketData} from '../../../types';

const stamp=(n:number)=>new Date(n).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'short',timeStyle:'short'});
export async function GET(request:Request){try{
 const actor=await resolveActor(request);if(!isStaff(actor))throw new HttpError(actor?403:401,'เฉพาะเจ้าหน้าที่ที่ได้รับสิทธิ์ดูรายงานสหกรณ์');
 const parsed=reportFilterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!parsed.success)throw new HttpError(400,parsed.error.issues[0]?.message||'เงื่อนไขรายงานไม่ถูกต้อง');const f=parsed.data;
 const conditions=[];if(f.from)conditions.push(gte(tickets.createdAt,reportDayStart(f.from)));if(f.to)conditions.push(lt(tickets.createdAt,reportDayStart(f.to)+86400000));if(f.program)conditions.push(eq(tickets.program,f.program));if(f.requestType)conditions.push(eq(tickets.requestType,f.requestType));if(f.status)conditions.push(f.status==='open'?ne(tickets.status,'resolved'):eq(tickets.status,f.status));if(f.approval)conditions.push(eq(tickets.approvalStatus,f.approval));
 if(f.cooperative.startsWith('id:'))conditions.push(eq(tickets.cooperativeId,f.cooperative.slice(3)));else if(f.cooperative.startsWith('legacy:'))conditions.push(and(isNull(tickets.cooperativeId),eq(tickets.office,f.cooperative.slice(7))));else if(f.cooperative)throw new HttpError(400,'ตัวกรองสหกรณ์ไม่ถูกต้อง');
 if(f.q)conditions.push(or(...[tickets.number,tickets.title,tickets.office,tickets.reporter,tickets.assignee].map(c=>sql`instr(lower(${c}), lower(${f.q})) > 0`)));
 const records=await getDb().select().from(tickets).where(and(...conditions)).orderBy(desc(tickets.createdAt),desc(tickets.id)).limit(5001).all();if(records.length>5000)throw new HttpError(413,'รายงานมีมากกว่า 5,000 เรื่อง กรุณาลดช่วงวันที่หรือเลือกสหกรณ์ก่อนส่งออก');
 const rows=records.map(unpack) as TicketData[];const book=new ExcelJS.Workbook();book.creator='CAD Support';book.created=new Date();
 function sheet(name:string,headers:string[],values:(string|number)[][],widths:number[]){const ws=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});ws.columns=headers.map((header,i)=>({header,width:widths[i]||22}));for(const value of values)ws.addRow(value);ws.getRow(1).font={name:'Tahoma',bold:true,color:{argb:'FFFFFFFF'},size:12};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF154E56'}};ws.getRow(1).height=30;ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:headers.length}};ws.eachRow((r,i)=>{if(i>1){r.font={name:'Tahoma',size:11};r.alignment={vertical:'top',wrapText:true};}});return ws;}
 const groups=reportSummary(rows);
 sheet('สรุปรายสหกรณ์',['สหกรณ์','เรื่องทั้งหมด','ขอแก้ไข','แจ้งปัญหา','รออนุมัติ','ยังไม่ปิดเรื่อง','ปิดเรื่องแล้ว'],groups.map(g=>[g.name,g.total,g.changes,g.issues,g.pending,g.open,g.closed]),[55,18,16,16,18,20,18]);
 sheet('รายการคำขอ',['เลขอ้างอิง','สหกรณ์','ประเภทเรื่อง','โปรแกรม','หัวข้อ','สถานะดำเนินการ','การอนุมัติ','ความเร่งด่วน','ผู้รับผิดชอบ','ผู้แจ้ง','วันที่แจ้ง (ไทย)','อัปเดตล่าสุด (ไทย)','รายละเอียด','การดำเนินงานล่าสุด','จำนวนไฟล์แนบ','เบอร์โทรศัพท์ติดต่อกลับ'],rows.map(t=>[t.number,t.office,requestTypes[t.requestType],t.program,t.title,reportStatus(t),approvalLabels[t.approvalStatus]||t.approvalStatus,t.priority==='high'?'สูง':t.priority==='low'?'ต่ำ':'ปานกลาง',t.assignee||'ยังไม่มอบหมาย',t.reporter,stamp(t.createdAt),stamp(t.updatedAt),t.description.slice(0,32000),t.events.at(-1)?.text.slice(0,32000)||'',t.attachments.length,t.phone||'']),[29,50,18,30,55,25,20,18,25,25,26,26,65,65,18,25]);
 sheet('ประวัติการดำเนินงาน',['เลขอ้างอิง','สหกรณ์','วันเวลา (ไทย)','ผู้ดำเนินการ','รายละเอียดการดำเนินงาน'],rows.flatMap(t=>t.events.map(e=>[t.number,t.office,stamp(e.at),e.author,e.text.slice(0,32000)])),[29,50,26,30,90]);
 const now=Date.now();sheet('เงื่อนไขรายงาน',['รายการ','ค่า'],[['ชื่อรายงาน','รายงานคำขอแก้ไขและปัญหาสหกรณ์'],['จัดทำเมื่อ (เวลาไทย)',stamp(now)],['จัดทำโดย',actor!.name],...reportConditions(f,rows),['จำนวนเรื่อง',rows.length],['จำนวนสหกรณ์ที่มีเรื่อง',groups.length],['หลักการนับ','เลือกตามวันที่แจ้ง นับสถานะปัจจุบัน ณ เวลาจัดทำรายงาน'],['การปิดเรื่อง','รวมเรื่องแก้ไขแล้วและคำขอที่ไม่อนุมัติ ไม่ใช่จำนวนที่แก้ไขสำเร็จทั้งหมด'],['ขอบเขต','เฉพาะรายการจริงที่ตรงตัวกรอง ไม่รวมข้อมูลตัวอย่าง']], [35,95]);
 const buffer=await book.xlsx.writeBuffer();const day=new Date(now+7*3600000).toISOString().slice(0,10);return new Response(new Uint8Array(buffer),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="CAD-cooperative-report-'+day+'.xlsx"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}catch(e){return failure(e);}}
