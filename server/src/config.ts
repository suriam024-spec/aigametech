import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`ไม่พบ ${name} ในไฟล์ .env (ดู .env.example)`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET"),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  // AI: ไม่บังคับ ถ้าไม่มี key ระบบจะใช้ fallback keyword search
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "gemini-3.5-flash-lite",
};