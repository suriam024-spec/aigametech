import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { config } from "../config";
import { HttpError } from "../utils/httpError";

export type Role = "user" | "admin";

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

function toAuthUser(u: { id: number; email: string; role: string }): AuthUser {
  return { id: u.id, email: u.email, role: u.role as Role };
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ email: user.email, role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    const p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    return { id: Number(p.sub), email: p.email, role: p.role };
  } catch {
    throw new HttpError(401, "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่");
  }
}

export async function register(email: string, password: string) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new HttpError(409, "อีเมลนี้ถูกใช้งานแล้ว");

  try {
    // role ตั้งเป็น "user" เสมอ (ค่า default ใน schema) ไม่รับจาก request
    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 10) },
    });
    const authUser = toAuthUser(user);
    return { token: signToken(authUser), user: authUser };
  } catch (e: any) {
    if (e?.code === "P2002") throw new HttpError(409, "อีเมลนี้ถูกใช้งานแล้ว");
    throw e;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  // ข้อความเดียวกันทั้งกรณีไม่พบอีเมลและรหัสผิด (ไม่บอกใบ้ว่ามีอีเมลนี้ในระบบ)
  if (!user || !ok) throw new HttpError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");

  const authUser = toAuthUser(user);
  return { token: signToken(authUser), user: authUser };
}

export async function getMe(userId: number): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, "ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
  return toAuthUser(user);
}
