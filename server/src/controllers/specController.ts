import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../utils/httpError";
import {
  RAM_MAX,
  RAM_MIN,
  clearMySpec,
  getMySpec,
  getOptions,
  saveMySpec,
} from "../services/specService";

const requireUserId = (res: Response): number => {
  const userId: number | undefined = res.locals.userId;
  if (userId === undefined) {
    throw new HttpError(401, "กรุณาเข้าสู่ระบบก่อน");
  }
  return userId;
};

const saveSchema = z.object({
  cpuId: z.number().int().positive(),
  gpuId: z.number().int().positive(),
  ramGb: z.number().int().min(RAM_MIN).max(RAM_MAX),
});

export async function options(_req: Request, res: Response) {
  res.json(await getOptions());
}

export async function mine(_req: Request, res: Response) {
  res.json(await getMySpec(requireUserId(res)));
}

export async function save(req: Request, res: Response) {
  const userId = requireUserId(res);
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(
      400,
      `กรุณาเลือก CPU, การ์ดจอ และ RAM ให้ครบ (RAM ${RAM_MIN}-${RAM_MAX} GB)`,
    );
  }
  const { cpuId, gpuId, ramGb } = parsed.data;
  res.json(await saveMySpec(userId, { cpuId, gpuId, ramGb }));
}

export async function clear(_req: Request, res: Response) {
  res.json(await clearMySpec(requireUserId(res)));
}