import { prisma } from "../db";
import { HttpError } from "../utils/httpError";
import { getPopularityMap, toDto } from "./gameService";
import { loadUserSpec } from "./specCheckService";

export async function addFavorite(userId: number, gameId: number) {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
  if (!game) throw new HttpError(404, "ไม่พบเกมนี้");

  const existing = await prisma.favorite.findFirst({ where: { userId, gameId } });
  if (!existing) await prisma.favorite.create({ data: { userId, gameId } });
  return { isFavorite: true };
}

export async function removeFavorite(userId: number, gameId: number) {
  await prisma.favorite.deleteMany({ where: { userId, gameId } });
  return { isFavorite: false };
}

export async function listFavorites(userId: number) {
  const favs = await prisma.favorite.findMany({ where: { userId } });
  const ids = favs.map((f) => f.gameId);
  const favIds = new Set(ids);

  const spec = await loadUserSpec(userId);
  const [games, popMap] = await Promise.all([
    prisma.game.findMany({ where: { id: { in: ids } } }),
    getPopularityMap(),
  ]);

  const items = games
    .map((g) => toDto(g, popMap.get(g.id) ?? 0, spec, favIds))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { items, total: items.length, specReady: spec !== null };
}