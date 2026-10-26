# AI GameTech – server

## ขั้นที่ 1: DB schema + seed

```bash
cd server
npm install
cp .env.example .env       # (Windows: copy .env.example .env)
npm run check:data         # ตรวจข้อมูล seed (ไม่ต้องใช้ DB)
npm run db:reset           # สร้าง dev.db ใหม่ + seed
npm run db:studio          # เปิดดูข้อมูลในเบราว์เซอร์
```

รัน `db:reset` ซ้ำได้เสมอ (ล้างแล้วใส่ใหม่)

## บัญชีตัวอย่าง
| role  | email          | password  | สเปค |
|-------|----------------|-----------|------|
| admin | admin@demo.com | admin1234 | - |
| user  | low@demo.com   | demo1234  | i5-7400 / GTX 750 Ti / 8GB (tier 2/2) |
| user  | high@demo.com  | demo1234  | Ryzen 5 5600 / RTX 3060 / 16GB (tier 4/4) |

## ข้อมูลที่ seed
- CPU 10 รุ่น + GPU 10 รุ่น (tier 1-5 ครบ)
- 21 เกม (18 เกม PC, 3 เกมคอนโซลล้วน), Indie 9, Multiplayer 11
- low@demo.com: 🟢 11 / 🟡 3 / 🔴 4 (Elden Ring, Cyberpunk, BG3, RDR2)
- Elden Ring: low user ติดแค่ GPU (CPU/RAM ผ่าน) -> ใช้ demo AI Upgrade Advisor
- high@demo.com: ผ่านทุกเกม PC

## หมายเหตุ
- genres/tags/platforms เก็บเป็น JSON string ต้อง `JSON.parse` ตอนอ่าน
- multiplayer = มีโหมดเล่นกับคนอื่น (ออนไลน์/co-op/local)
- เกมที่ min/rec เป็น null = ไม่ใช่เกม PC -> ข้ามการเช็คสเปค
- ราคา/วันที่/requirements เป็นค่าประมาณสำหรับ demo
- รูปเกมเป็น placeholder จาก picsum.photos (เปลี่ยนเป็นรูปจริงได้ใน seed)
