import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

// รูปแบบ error ทั้งระบบ: { error: "ข้อความ" }
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "รูปแบบ JSON ไม่ถูกต้อง" });
  }
  console.error(err);
  res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
}
