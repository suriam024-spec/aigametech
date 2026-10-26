import { Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { addFavorite, listFavorites, removeFavorite } from "../services/favoriteService";

function needUser(res: Response): number {
  const id = res.locals.userId as number | undefined;
  if (!id) throw new HttpError(401, "กรุณาเข้าสู่ระบบก่อน");
  return id;
}

function gameIdOf(req: Request): number {
  const id = Number(req.params.gameId);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "รหัสเกมไม่ถูกต้อง");
  return id;
}

export async function list(_req: Request, res: Response) {
  res.json(await listFavorites(needUser(res)));
}

export async function add(req: Request, res: Response) {
  const userId = needUser(res);
  res.json(await addFavorite(userId, gameIdOf(req)));
}

export async function remove(req: Request, res: Response) {
  const userId = needUser(res);
  res.json(await removeFavorite(userId, gameIdOf(req)));
}