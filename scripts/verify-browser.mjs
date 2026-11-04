import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
await mkdir('outputs',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1150},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:5173';
try{
 await page.goto(base,{waitUntil:'networkidle'});assert.equal((await page.request.get(base+'/api/tickets')).status(),401);
 await page.goto(base+'/signin-with-chatgpt?return_to=/',{waitUntil:'networkidle'});
 const baseline=await (await page.request.get(base+'/api/tickets')).json(); if(baseline.tickets.length){await page.getByRole('button',{name:'ตั้งค่าการใช้งาน',exact:true}).click();await page.getByRole('button',{name:'ทดลองด้วยข้อมูลตัวอย่าง',exact:true}).click();await page.getByRole('button',{name:'ภาพรวมระบบ',exact:true}).click();} await page.getByText('ข้อมูลตัวอย่าง',{exact:true}).first().waitFor();
 await page.screenshot({path:'outputs/dashboard-desktop.png',fullPage:true,animations:'disabled'});
 await page.getByRole('textbox',{name:'ค้นหาปัญหา'}).fill('งบทดลอง');assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('textbox',{name:'ค้นหาปัญหา'}).fill('');
 await page.getByRole('button',{name:'หน้าถัดไป'}).click();assert.equal(await page.locator('tbody tr').count(),2);
 await page.getByRole('button',{name:'หน้าก่อนหน้า'}).click();
 await page.getByRole('tab',{name:'รอรับเรื่อง',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),1);
 await page.locator('tbody tr').first().click();await page.getByRole('dialog').waitFor();
 await page.getByRole('dialog').getByLabel('สถานะปัญหา',{exact:true}).selectOption('progress');await page.getByLabel('ผู้รับผิดชอบ',{exact:true}).fill('ทีมทดสอบ');await page.getByRole('button',{name:'บันทึกการเปลี่ยนแปลง'}).click();await page.getByText('อัปเดตข้อมูลตัวอย่างแล้ว (ไม่บันทึกลงฐานข้อมูล)',{exact:true}).waitFor();await page.getByRole('button',{name:'ปิดหน้าต่าง'}).click();
 const initial=await (await page.request.get(base+'/api/tickets')).json();assert.equal(initial.tickets.length,baseline.tickets.length,'Demo changes must not create database rows');
 await page.getByRole('button',{name:'แจ้งเรื่องใหม่',exact:true}).click();
 const expectedPrograms=['ระบบบัญชีแยกประเภท','ระบบเงินรับฝาก','ระบบสินค้า','ระบบสมาชิกและหุ้น'];
 assert.deepEqual(await page.locator('#new-program option:not([disabled])').allTextContents(),expectedPrograms);
 assert.deepEqual(await page.locator('#new-request-type option').allTextContents(),['แจ้งปัญหา','ขอแก้ไข']);
 await page.locator('#new-request-type').selectOption('change');
 await page.locator('#new-program').selectOption('ระบบบัญชีแยกประเภท');await page.getByLabel('ประเภทปัญหา').selectOption('การเข้าใช้งาน');await page.getByLabel('หัวข้อเรื่อง').fill('ทดสอบการแจ้งปัญหาและการแนบไฟล์');await page.getByLabel('รายละเอียดเรื่อง').fill('ทดสอบระบบจริงในฐานข้อมูลท้องถิ่น ตรวจสอบการบันทึกและการติดตามสถานะ');await page.locator('#new-office').fill('หน่วยงานทดสอบ');
 await page.getByLabel('เลือกไฟล์แนบ').setInputFiles({name:'screenshot.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGAAAAABJRU5ErkJggg==','base64')});
 await page.getByRole('button',{name:'ส่งเรื่อง',exact:true}).click();await page.getByText('ส่งเรื่องสำเร็จ',{exact:true}).waitFor({timeout:20000});const number=await page.locator('.success-number').textContent();assert.match(number,/^CAD-/);
 await page.getByRole('button',{name:'ดูรายการแจ้งปัญหา',exact:true}).click();await page.getByRole('button',{name:'เปิดปัญหา '+number}).click();
 await page.getByRole('dialog').getByLabel('สถานะปัญหา',{exact:true}).selectOption('progress');await page.getByLabel('ผู้รับผิดชอบ',{exact:true}).fill('ผู้ดูแลทดสอบ');await page.getByLabel('เพิ่มข้อมูล / ความคิดเห็น').fill('รับเรื่องและตรวจสอบระบบแล้ว');await page.getByRole('button',{name:'บันทึกการเปลี่ยนแปลง'}).click();await page.getByText('บันทึกการดำเนินงานแล้ว',{exact:true}).waitFor();
 const list=await (await page.request.get(base+'/api/tickets')).json();assert.equal(list.tickets.length,baseline.tickets.length+1);const ticket=list.tickets.find(t=>t.number===number);assert.equal(ticket.status,'progress');assert.equal(ticket.assignee,'ผู้ดูแลทดสอบ');assert.equal(ticket.attachments.length,1);assert(ticket.events.some(e=>e.text==='รับเรื่องและตรวจสอบระบบแล้ว'));
 const file=await page.request.get(base+'/api/tickets/'+ticket.id+'/attachments/0');assert.equal(file.status(),200);assert.equal(file.headers()['content-type'],'image/png');
 const stale=await page.request.patch(base+'/api/tickets/'+ticket.id,{data:{status:'new',assignee:'',comment:'',updatedAt:1}});assert.equal(stale.status(),409);
 const cross=await page.request.patch(base+'/api/tickets/'+ticket.id,{headers:{Origin:'https://example.invalid'},data:{status:'new',assignee:'',comment:'',updatedAt:ticket.updatedAt}});assert.equal(cross.status(),403);
 const invalid=await page.request.post(base+'/api/tickets',{multipart:{title:'x',program:'invalid'}});assert.equal(invalid.status(),400);
 await page.getByRole('button',{name:'ปิดหน้าต่าง'}).click();await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'เปิดปัญหา '+number}).waitFor();
 const downloadReady=page.waitForEvent('download');await page.getByRole('button',{name:'ส่งออกข้อมูล',exact:true}).click();const download=await downloadReady;const csv=await readFile(await download.path(),'utf8');assert(csv.includes('ประเภทเรื่อง'));assert(csv.includes('ขอแก้ไข'));
 await page.getByRole('button',{name:'คลังความรู้',exact:true}).click();await page.getByRole('button',{name:/แจ้งปัญหาอย่างไร/}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'รายงานและสถิติ',exact:true}).click();await page.getByText('รายการแยกตามโปรแกรม',{exact:true}).waitFor();
 await page.getByRole('button',{name:'ตั้งค่าการใช้งาน',exact:true}).click();await page.getByLabel('ชื่อผู้แจ้ง',{exact:true}).fill('ผู้ทดสอบระบบ');await page.getByRole('button',{name:'บันทึกข้อมูล',exact:true}).click();assert.match(await page.evaluate(()=>localStorage.getItem('cad-support-profile')),/ผู้ทดสอบระบบ/);
 await page.getByRole('button',{name:'ทดลองด้วยข้อมูลตัวอย่าง',exact:true}).click();await page.getByRole('button',{name:'ภาพรวมระบบ',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/dashboard-mobile.png',fullPage:true,animations:'disabled',style:'.toast{display:none}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile document should not overflow');
 await page.getByRole('button',{name:'เปิดเมนู',exact:true}).click();await page.getByRole('button',{name:'รายการแจ้งปัญหา',exact:true}).click();await page.getByRole('heading',{name:'รายการแจ้งปัญหา',exact:true}).waitFor();
 await page.getByRole('button',{name:'แจ้งเรื่องใหม่',exact:true}).click();await page.screenshot({path:'outputs/form-mobile.png',animations:'disabled',style:'.toast{display:none}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.keyboard.press('Escape');
 // Exercise both request types for every supported program against local D1.
 const created=[];
 for(const program of expectedPrograms){for(const requestType of ['issue','change']){
  const response=await page.request.post(base+'/api/tickets',{multipart:{program,requestType,title:'ทดสอบประเภทเรื่อง '+program,category:'ข้อมูลและรายงาน',priority:'medium',reporter:'ผู้ทดสอบระบบ',office:'หน่วยงานทดสอบ',email:'test@example.com',description:'ตรวจสอบการรับแจ้งปัญหาและคำขอแก้ไขแยกตามโปรแกรม'}});
  assert.equal(response.status(),201);const result=await response.json();assert.equal(result.ticket.requestType,requestType);assert.equal(result.ticket.program,program);created.push(result.ticket.id);
 }}
 const persisted=await (await page.request.get(base+'/api/tickets')).json();for(const id of created)assert(persisted.tickets.some(t=>t.id===id));for(const old of baseline.tickets){const kept=persisted.tickets.find(t=>t.id===old.id);assert(kept);assert.equal(kept.program,old.program);assert.equal(kept.requestType,old.requestType);}
 for(const bad of [{program:'ระบบบัญชีสหกรณ์',requestType:'issue'},{program:expectedPrograms[0],requestType:'invalid'}]){const response=await page.request.post(base+'/api/tickets',{multipart:{...bad,title:'ตรวจสอบข้อมูลไม่ถูกต้อง',category:'ข้อมูลและรายงาน',priority:'medium',reporter:'ผู้ทดสอบ',office:'หน่วยงานทดสอบ',email:'test@example.com',description:'ข้อมูลทดสอบการตรวจสอบโปรแกรมและประเภทเรื่อง'}});assert.equal(response.status(),400);}
 await page.setViewportSize({width:1440,height:1150});await page.getByRole('button',{name:'รายการแจ้งปัญหา',exact:true}).click();await page.getByRole('button',{name:'ตัวกรอง',exact:true}).click();await page.getByLabel('กรองประเภทเรื่อง').selectOption('change');await page.getByLabel('กรองตามโปรแกรม').selectOption('ระบบสมาชิกและหุ้น');assert.equal(await page.locator('tbody tr').count(),1);assert((await page.locator('tbody tr').textContent()).includes('ขอแก้ไข'));
 assert.deepEqual(errors,[],'Browser runtime errors');console.log(JSON.stringify({result:'passed',checks:['authentication','demo isolation','four exact program choices','both request types in form','search','pagination','status filter','demo workflow','create change request','attachment upload and download','assignment','status and audit history','conflict protection','cross-origin protection','validation','persistence after reload','CSV includes request type','knowledge articles','reports','preferences','responsive layout','mobile navigation','mobile dialog','eight program/type combinations persisted','existing records preserved','unsupported program and request type rejected','program and request-type filters'],screenshots:['outputs/dashboard-desktop.png','outputs/dashboard-mobile.png','outputs/form-mobile.png']},null,2));
}finally{await browser.close();}
