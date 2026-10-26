import type { Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { getUpgradeAdvice } from "../services/upgradeService";

export async function upgradeAdvice(req: Request, res: Response) {
  const userId: number | undefined = res.locals.userId;
  if (userId === undefined) throw new HttpError(401, "กรุณาเข้าสู่ระบบก่อน");

  const raw: unknown = req.body?.gameId;
  const gameId =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d+$/.test(raw)
        ? Number(raw)
        : NaN;
  if (!Number.isInteger(gameId) || gameId <= 0) {
    throw new HttpError(400, "รหัสเกมไม่ถูกต้อง");
  }

  res.json(await getUpgradeAdvice(userId, gameId));
}