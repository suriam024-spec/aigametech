import type { Request, Response } from "express";
import { z } from "zod";
import * as admin from "../services/adminService";
import { HttpError } from "../utils/httpError";

const listOf = (label: string, min: number, max: number) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1, `${label}ห้ามมีค่าว่าง`)
        .max(40, `${label}แต่ละรายการยาวไม่เกิน 40 ตัวอักษร`),
    )
        .min(min, `กรุณากรอก ${label} อย่างน้อย ${min} รายการ`)
    .max(max, `${label}ใส่ได้ไม่เกิน ${max} รายการ`);

const tierField = z
  .number()
  .int("tier ต้องเป็นจำนวนเต็ม 1-5")
  .min(1, "tier ต้องอยู่ระหว่าง 1-5")
  .max(5, "tier ต้องอยู่ระหว่าง 1-5");

const ramField = z
  .number()
  .int("RAM ต้องเป็นจำนวนเต็ม 1-128 GB")
  .min(1, "RAM ต้องอยู่ระหว่าง 1-128 GB")
  .max(128, "RAM ต้องอยู่ระหว่าง 1-128 GB");

const requirementSet = z.object({ cpuTier: tierField, gpuTier: tierField, ramGb: ramField });

const gameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อเกม").max(100, "ชื่อเกมยาวไม่เกิน 100 ตัวอักษร"),
  description: z
    .string()
    .trim()
    .min(1, "กรุณากรอกคำอธิบายเกม")
    .max(1000, "คำอธิบายยาวไม่เกิน 1000 ตัวอักษร"),
  genres: listOf("Genre", 1, 6),
  tags: listOf("แท็ก", 0, 12),
  platforms: listOf("แพลตฟอร์ม", 1, 6),
  price: z.number().int("ราคาต้องเป็นจำนวนเต็ม").min(0, "ราคาต้องไม่ติดลบ").max(100000, "ราคาสูงเกินไป"),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่วางขายต้องเป็นรูปแบบ ปปปป-ดด-วว"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  multiplayer: z.boolean(),
  playTime: z
    .number()
    .int("เวลาเล่นต้องเป็นจำนวนเต็ม")
    .min(1, "เวลาเล่นต้องอย่างน้อย 1 ชั่วโมง")
    .max(5000, "เวลาเล่นสูงเกินไป"),
  isIndie: z.boolean(),
  image: z.string().trim().max(500, "ลิงก์รูปยาวไม่เกิน 500 ตัวอักษร").optional(),
  requirements: z.object({ min: requirementSet, rec: requirementSet }).nullable().optional(),
});

// ถ้า zod ให้ข้อความไทยที่เราเขียนไว้ ใช้ตามนั้น ถ้าเป็นข้อความอังกฤษเริ่มต้นให้แทนด้วยข้อความไทยทั่วไป
function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue && /[\u0E00-\u0E7F]/.test(issue.message)) return issue.message;
  const field = issue ? issue.path.join(".") : "";
  return field ? `ข้อมูลช่อง ${field} ไม่ถูกต้อง` : "ข้อมูลที่ส่งมาไม่ถูกต้อง";
}

function parseId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "รหัสเกมไม่ถูกต้อง");
  return id;
}

function parseBody(req: Request): admin.GameInput {
  const parsed = gameSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, firstError(parsed.error));
  return parsed.data as admin.GameInput;
}

export async function stats(_req: Request, res: Response) {
  res.json(await admin.getStats());
}

export async function create(req: Request, res: Response) {
  const game = await admin.createGame(parseBody(req));
  res.status(201).json(game);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req);
  const game = await admin.updateGame(id, parseBody(req));
  res.json(game);
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req);
  res.json(await admin.deleteGame(id));
}