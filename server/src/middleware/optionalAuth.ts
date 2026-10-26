import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService";
import { HttpError } from "../utils/httpError";

// ไม่มี token -> ผ่านเป็น guest | มี token แต่ผิด/หมดอายุ -> 401
// ถ้าผ่าน จะใส่ userId ไว้ที่ res.locals.userId
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return next();

  const [scheme, token] = header.split(" ");
  const invalid = new HttpError(401, "โทเคนไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  if (scheme !== "Bearer" || !token) throw invalid;

  try {
    const payload: any = await verifyToken(token);
    const id = Number(payload?.sub ?? payload?.id);
    if (!Number.isInteger(id)) throw invalid;
    res.locals.userId = id;
  } catch {
    throw invalid;
  }
  next();
}