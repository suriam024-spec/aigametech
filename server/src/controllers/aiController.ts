import type { Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { aiSearch } from "../services/aiSearchService";

const userIdOf = (res: Response): number | undefined => res.locals.userId;

export async function search(req: Request, res: Response) {
  const raw = req.body?.query;
  const query = typeof raw === "string" ? raw.trim() : "";
  if (query.length < 2 || query.length > 300) {
    throw new HttpError(400, "กรุณาพิมพ์ประโยคค้นหา 2-300 ตัวอักษร");
  }
  res.json(await aiSearch(query, userIdOf(res)));
}