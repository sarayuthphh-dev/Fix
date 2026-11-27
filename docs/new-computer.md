# ย้ายโปรเจกต์ไปทำงานบนเครื่องใหม่

GitHub เก็บซอร์สและประวัติการแก้ไข ไม่รวมรหัสลับ ฐานข้อมูล หรือไฟล์แนบจริง เว็บไซต์เดิมอยู่ที่ https://cad-support-desk-nov26.sarayuthphh.chatgpt.site และข้อมูลบนโฮสต์ยังอยู่ที่เดิม การ clone โค้ดไม่ทำสำเนาฐานข้อมูลจริงลงเครื่องใหม่

## ติดตั้งและเปิดโปรเจกต์

เตรียม Git และ Node.js 22.13 ขึ้นไป พร้อมสิทธิ์เข้าถึง GitHub repository ของโปรเจกต์:

```powershell
git clone https://github.com/sarayuthphh-dev/Fix.git cad-support
cd cad-support
npm run install:ci
Copy-Item .dev.vars.example .dev.vars
npm run build
```

`Copy-Item` ใช้เมื่อยังไม่มี `.dev.vars` เท่านั้น หากมีไฟล์แล้วให้เก็บค่าปัจจุบันไว้ ตัวอย่างตั้งผู้ดูแลจำลอง `seedy@sites.test` สำหรับพัฒนาบน localhost โดยไม่ใช้รหัสลับจริง

สร้างฐานข้อมูลท้องถิ่นที่ว่างใหม่ด้วย migration ทั้งห้าตามลำดับ **ทำเฉพาะครั้งแรกบนฐานข้อมูลใหม่** ไม่ใช้คำสั่งนี้ซ้ำกับฐานข้อมูลที่เคยใช้ migration แล้ว:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_unique_ink.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_chilly_wasp.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_dizzy_supreme_intelligence.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_cultured_patriot.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_milky_speed.sql
npm run dev
```

เปิด URL ที่คำสั่งแสดง โดยปกติคือ `http://127.0.0.1:5173` ลงชื่อเข้าใช้จำลองที่ `http://127.0.0.1:5173/signin-with-chatgpt?return_to=/manage` แล้วเพิ่มทะเบียนสหกรณ์สำหรับทดสอบ หน้ารายงานเปิดที่ `/manage?view=reports` ฐานข้อมูลเริ่มว่างจริง ข้อมูลตัวอย่างในหน้าจอไม่ใช่รายการที่บันทึกไว้

ตรวจโค้ดได้ด้วย `npx tsc --noEmit` และ `npm run build` สคริปต์ทดสอบด้วยเบราว์เซอร์ใน `scripts/verify-*.mjs` ต้องตั้งตำแหน่ง Playwright และ Chrome ให้ตรงเครื่องใหม่ และบางชุดต้องใช้บริการจำลองตาม README

## LINE และอีเมล

ค่าตั้งต้นเปิดหน้าเว็บและรายงานได้โดยไม่เชื่อม LINE หรือ Supabase หากต้องทดสอบบริการเหล่านี้ ให้ตั้งค่าใน `.dev.vars` เฉพาะเครื่อง และทำตาม [ตั้งค่า LINE](line-setup.md) และ [ตั้งค่าอีเมล](email-setup.md)

ห้ามใส่ Channel access token, Channel secret, กุญแจ LINE_SETTINGS_KEY ของโฮสต์, รหัสผ่าน หรือฐานข้อมูลจริงใน GitHub การตั้ง LINE ใหม่ในเครื่องทดสอบควรใช้กุญแจแยกจากโฮสต์ อย่าเปลี่ยนกุญแจของเว็บจริงเพียงเพราะย้ายเครื่อง มิฉะนั้นข้อมูลเชื่อมต่อที่เข้ารหัสไว้จะอ่านไม่ได้

## ทำงานต่อกับเว็บเดิม

เก็บ `.openai/hosting.json` ไว้ตามเดิม เพราะระบุเว็บไซต์และ D1/R2 ที่โปรเจกต์ใช้ เมื่อต้องเผยแพร่ผ่าน Sites ให้เปิดโปรเจกต์เดิมจากบัญชีที่ได้รับสิทธิ์ การ push GitHub เป็นการสำรองและส่งต่อซอร์ส **ยังไม่เผยแพร่เว็บโดยอัตโนมัติ** โปรเจกต์นี้ไม่ได้ตั้ง GitHub Actions สำหรับ deploy

ซอร์สที่เผยแพร่กับ Sites และ repository บน GitHub เป็นคนละปลายทาง หลังแก้โค้ดให้ commit/push GitHub และเผยแพร่เวอร์ชันผ่าน workflow ของ Sites ตามที่ใช้งาน อย่าแทนที่ project_id หรือสร้าง Site ใหม่สำหรับงานเดิมโดยไม่ได้ตั้งใจ

## ไฟล์ที่ไม่ขึ้น GitHub

- `.dev.vars`, `.env*`, ไฟล์รหัสลับ: ใช้ตัวอย่าง `.dev.vars.example` แล้วกรอกผ่านช่องทางที่ปลอดภัย
- `.wrangler/`: ฐานข้อมูลและไฟล์ทดสอบในเครื่อง ไม่ใช่ฐานข้อมูลเว็บจริง
- `node_modules/`, `dist/`, `.sites-runtime/`, `outputs/`: ติดตั้งหรือสร้างใหม่ในเครื่องปลายทาง

ใช้ `git pull` รับโค้ดล่าสุดก่อนเริ่มงาน และ `git add`, `git commit`, `git push` เก็บงานหลังแก้ไข
