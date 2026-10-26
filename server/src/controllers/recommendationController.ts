import { Request, Response } from "express";
import { getRecommendations } from "../services/recommendationService";

export async function recommendations(_req: Request, res: Response) {
  const uid: number | undefined = res.locals.userId;
  res.json(await getRecommendations(uid));
}