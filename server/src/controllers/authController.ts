import type { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../services/authService";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("รูปแบบอีเมลไม่ถูกต้อง")
  .max(254, "อีเมลยาวเกินไป");

const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร")
    .max(72, "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร"),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน").max(72, "รหัสผ่านไม่ถูกต้อง"),
});

export async function register(req: Request, res: Response) {
  const { email, password } = registerSchema.parse(req.body);
  res.status(201).json(await authService.register(email, password));
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  res.json(await authService.login(email, password));
}

export async function me(req: Request, res: Response) {
  res.json({ user: await authService.getMe(req.user!.id) });
}
