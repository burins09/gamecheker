# RC Game Load Checker (Express + Playwright)

หน้าเว็บสำหรับทดสอบว่าเพจโหลดสมบูรณ์ไหมและเกมใน `<iframe>` โหลดขึ้นจริงหรือไม่
- ตรวจ `page load` + `network idle`
- ไล่ดู iframes ทั้งหมด: ตรวจว่าออกจาก `about:blank` แล้ว, `load` สำเร็จหรือไม่
- เก็บสกรีนช็อตทั้งหน้า + เฉพาะกรอบ iframe
- แสดงผลสรุป PASS/FAIL ในหน้าเว็บ พร้อมลิงก์ artifacts (`result.json`, รูปภาพ)

## รันบนเครื่อง

```bash
npm init -y
npm i express playwright
npx playwright install
node server.js
# เปิด http://localhost:3000
```

## Deploy บน Render (แนะนำ Docker)

ไฟล์สำคัญ:
- `Dockerfile` (ใช้ base image ของ Playwright พร้อมเบราว์เซอร์)
- `render.yaml` (ประกาศบริการแบบ Blueprint)
- `package.json`
- `server.js`

ขั้นตอน:
1. Push โค้ดทั้งหมดขึ้น GitHub
2. Render → New → **Blueprint** → เลือก repo ที่มี `render.yaml`
3. Deploy
4. เปิดโดเมนที่ได้จาก Render → กรอก URL เกมแล้วกด **ตรวจสอบ**

### การเก็บไฟล์ artifacts ให้ไม่หายตอนรีดีพลอย
- ใน `render.yaml` มีการ mount disk ไปที่ `/data` แล้วตั้ง env `ART_DIR=/data`
- ตัวแอปจะเขียนผลทดสอบ (สกรีนช็อต/JSON) ลงในโฟลเดอร์นี้
- ดาวน์โหลดได้จาก `/artifacts/run_<timestamp>/...`

## การใช้งาน
- หน้าแรกมีช่องกรอก URL + ปุ่ม “ตรวจสอบ”
- ส่วนแสดงผลจะขึ้น PASS/FAIL, รายละเอียด iframes, และรูปภาพ
- API: `GET /api/check?url=<encoded URL>` (ตอบ JSON)

## ปรับแต่ง
- เพิ่ม Basic Auth: ครอบ `app.use()` ด้วยมิดเดิลแวร์ตรวจ user/pass
- ส่งผลเข้า Slack: เพิ่ม fetch ไปเว็บฮุคพร้อมสรุป `payload.summary` และแนบลิงก์ artifacts
- ปรับ timeout: ดูตัวแปร `globalTimeout` และ timeout ใน `waitForLoadState`
