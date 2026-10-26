import { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../utils/httpError";
import { getGameDetails, getTrending, listGames } from "../services/gameService";
import { recordSearch, recordView } from "../services/activityService";

const boolStr = z.enum(["true", "false"]).transform((v) => v === "true");

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  genre: z.string().optional(), // คั่นด้วย , ได้ เช่น RPG,Action
  platform: z.string().optional(),
  difficulty: z.string().optional(),
  multiplayer: boolStr.optional(),
  isIndie: boolStr.optional(),
  sort: z.enum(["name", "price_asc", "price_desc", "newest", "popular"]).optional(),
  compatibleOnly: boolStr.optional(),
});

const splitList = (s?: string) => {
  const arr = s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
  return arr.length ? arr : undefined;
};

const userIdOf = (res: Response): number | undefined => res.locals.userId;

export async function list(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, "พารามิเตอร์การค้นหาไม่ถูกต้อง");
  const q = parsed.data;

  const result = await listGames(
    {
      search: q.search || undefined,
      genres: splitList(q.genre),
      platforms: splitList(q.platform),
      difficulty: splitList(q.difficulty),
      multiplayer: q.multiplayer,
      isIndie: q.isIndie,
      sort: q.sort ?? "name",
      compatibleOnly: q.compatibleOnly ?? false,
    },
    userIdOf(res)
  );
  const uid = userIdOf(res);
  if (uid && q.search) await recordSearch(uid, q.search);
  res.json(result);
}

export async function trending(_req: Request, res: Response) {
  res.json(await getTrending(userIdOf(res)));
  
}

export async function details(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "รหัสเกมไม่ถูกต้อง");
  const uid = userIdOf(res);
  const result = await getGameDetails(id, uid);
  if (uid) await recordView(uid, id);
  res.json(result);
}