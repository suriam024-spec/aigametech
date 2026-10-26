import type { Game } from "@prisma/client";
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";
import { checkSpec, loadUserSpec, UserSpec } from "./specCheckService";


export type SortKey = "name" | "price_asc" | "price_desc" | "newest" | "popular";

export interface GameFilters {
  search?: string;
  genres?: string[];
  platforms?: string[];
  multiplayer?: boolean;
  difficulty?: string[];
  isIndie?: boolean;
  sort: SortKey;
  compatibleOnly: boolean;
}

function parseList(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

const norm = (s: string) => s.trim().toLowerCase();

// ความนิยม = จำนวน View + Favorite รวม (นับสด)
export async function getPopularityMap(): Promise<Map<number, number>> {
  const [views, favs] = await Promise.all([
    prisma.gameView.groupBy({ by: ["gameId"], _count: { _all: true } }),
    prisma.favorite.groupBy({ by: ["gameId"], _count: { _all: true } }),
  ]);
  const map = new Map<number, number>();
  for (const v of views) map.set(v.gameId, (map.get(v.gameId) ?? 0) + v._count._all);
  for (const f of favs) map.set(f.gameId, (map.get(f.gameId) ?? 0) + f._count._all);
  return map;
}

export async function getFavoriteIds(userId?: number): Promise<Set<number>> {
  if (!userId) return new Set();
  const favs = await prisma.favorite.findMany({ where: { userId }, select: { gameId: true } });
  return new Set(favs.map((f) => f.gameId));
}

export function toDto(game: Game, popularity: number, spec: UserSpec | null, favIds: Set<number>) {
  const isPc = game.minCpuTier != null && game.minGpuTier != null && game.minRamGb != null;
  return {
    id: game.id,
    name: game.name,
    description: game.description,
    genres: parseList(game.genres),
    tags: parseList(game.tags),
    platforms: parseList(game.platforms),
    price: game.price,
    releaseDate: game.releaseDate,
    difficulty: game.difficulty,
    multiplayer: game.multiplayer,
    playTime: game.playTime,
    isIndie: game.isIndie,
    image: game.image,
    popularity,
    isFavorite: favIds.has(game.id),
    requirements: isPc
      ? {
          min: { cpuTier: game.minCpuTier, gpuTier: game.minGpuTier, ramGb: game.minRamGb },
          rec: {
            cpuTier: game.recCpuTier ?? game.minCpuTier,
            gpuTier: game.recGpuTier ?? game.minGpuTier,
            ramGb: game.recRamGb ?? game.minRamGb,
          },
        }
      : null,
    // null = ไม่ใช่เกม PC หรือผู้ใช้ยังไม่ได้ตั้งสเปค/ไม่ได้ล็อกอิน
    specCheck: spec ? checkSpec(game, spec) : null,
  };
}

type GameDto = ReturnType<typeof toDto>;

export async function listGames(filters: GameFilters, userId?: number) {
  const spec = userId ? await loadUserSpec(userId) : null;
  const favIds = await getFavoriteIds(userId);

  if (filters.compatibleOnly && !spec) {
    if (!userId) throw new HttpError(401, "กรุณาเข้าสู่ระบบก่อนใช้ตัวกรองนี้");
    throw new HttpError(400, "กรุณาตั้งสเปคเครื่องก่อนใช้ตัวกรองนี้");
  }

  const [games, popMap] = await Promise.all([prisma.game.findMany(), getPopularityMap()]);
  let items: GameDto[] = games.map((g) => toDto(g, popMap.get(g.id) ?? 0, spec, favIds));

  if (filters.search) {
    const q = norm(filters.search);
    items = items.filter((g) => norm(g.name).includes(q));
  }
  if (filters.genres?.length) {
    const want = filters.genres.map(norm);
    items = items.filter((g) => g.genres.some((x) => want.includes(norm(x))));
  }
  if (filters.platforms?.length) {
    const want = filters.platforms.map(norm);
    items = items.filter((g) => g.platforms.some((x) => want.includes(norm(x))));
  }
  if (filters.difficulty?.length) {
    const want = filters.difficulty.map(norm);
    items = items.filter((g) => want.includes(norm(g.difficulty)));
  }
  if (filters.multiplayer !== undefined) {
    items = items.filter((g) => g.multiplayer === filters.multiplayer);
  }
  if (filters.isIndie !== undefined) {
    items = items.filter((g) => g.isIndie === filters.isIndie);
  }
  if (filters.compatibleOnly) {
    items = items.filter((g) => g.specCheck && g.specCheck.status !== "fail");
  }

  const time = (g: GameDto) => new Date(g.releaseDate as unknown as string).getTime();
  const byName = (a: GameDto, b: GameDto) => a.name.localeCompare(b.name);
  switch (filters.sort) {
    case "price_asc":
      items.sort((a, b) => a.price - b.price || byName(a, b));
      break;
    case "price_desc":
      items.sort((a, b) => b.price - a.price || byName(a, b));
      break;
    case "newest":
      items.sort((a, b) => time(b) - time(a) || byName(a, b));
      break;
    case "popular":
      items.sort((a, b) => b.popularity - a.popularity || byName(a, b));
      break;
    default:
      items.sort(byName);
  }

  return { items, total: items.length, specReady: spec !== null };
}

export async function getTrending(userId?: number, limit = 8) {
  const spec = userId ? await loadUserSpec(userId) : null;
  const favIds = await getFavoriteIds(userId);
  const [games, popMap] = await Promise.all([prisma.game.findMany(), getPopularityMap()]);
  const items = games
    .map((g) => toDto(g, popMap.get(g.id) ?? 0, spec, favIds))
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
    .slice(0, limit);
  return { items, specReady: spec !== null };
}

export async function getGameDetails(id: number, userId?: number) {
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) throw new HttpError(404, "ไม่พบเกมนี้");

  const spec = userId ? await loadUserSpec(userId) : null;
  const favIds = await getFavoriteIds(userId);
  const [others, popMap] = await Promise.all([
    prisma.game.findMany({ where: { id: { not: id } } }),
    getPopularityMap(),
  ]);

  const myGenres = new Set(parseList(game.genres).map(norm));
  const similar = others
    .map((g) => {
      const shared = parseList(g.genres).filter((x) => myGenres.has(norm(x))).length;
      return { g, shared };
    })
    .filter((x) => x.shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        (popMap.get(b.g.id) ?? 0) - (popMap.get(a.g.id) ?? 0) ||
        a.g.name.localeCompare(b.g.name)
    )
    .slice(0, 4)
    .map((x) => toDto(x.g, popMap.get(x.g.id) ?? 0, spec, favIds));

  return {
    ...toDto(game, popMap.get(game.id) ?? 0, spec, favIds),
    similar,
    specReady: spec !== null,
  };
}