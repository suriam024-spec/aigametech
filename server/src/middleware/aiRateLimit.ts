import { rateLimit } from "express-rate-limit";

// จำกัด /ai/* ที่ 10 ครั้งต่อนาทีต่อ IP (กันโควตา free tier หมด)
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "ส่งคำขอ AI ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" });
  },
});