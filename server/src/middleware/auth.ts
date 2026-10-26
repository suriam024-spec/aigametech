import type { NextFunction, Request, Response } from "express";
import { AuthUser, verifyToken } from "../services/authService";
import { HttpError } from "../utils/httpError";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ต้องล็อกอิน: อ่าน "Authorization: Bearer <token>" แล้วใส่ req.user
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "กรุณาเข้าสู่ระบบ");
  req.user = verifyToken(header.slice(7));
  next();
}

// ใช้ต่อจาก requireAuth เท่านั้น
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") throw new HttpError(403, "เฉพาะผู้ดูแลระบบเท่านั้น");
  next();
}
