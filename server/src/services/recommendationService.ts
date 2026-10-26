import type { Game } from "@prisma/client";
import { prisma } from "../db";
import { getFavoriteIds, getPopularityMap, toDto } from "./gameService";
import { loadUserSpec } from "./specCheckService";

const LIMIT = 8;
const W_SEARCH = 1;
const W_VIEW = 2;
const W_FAVORITE = 4;

function parseList(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

const norm = (s: string) => s.trim().toLowerCase();

// Interest ต่อ Genre (key = ชื่อ Genre ตัวพิมพ์เล็ก) คำนวณสดทุกครั้ง ไม่มีตารางเก็บ
export async function computeInterest(userId: number, games: Game[]) {
  const interest = new Map<string, number>();
  const display = new Map<string, string>(); // key -> ชื่อที่ใช้แสดง
  const genresOfGame = new Map<number, string[]>(); // gameId -> key ของ Genre

  for (const g of games) {
    const keys: string[] = [];
    for (const name of parseList(g.genres)) {
      const k = norm(name);
      if (!k) continue;
      keys.push(k);
      if (!display.has(k)) display.set(k, name);
    }
    genresOfGame.set(g.id, keys);
  }

  const add = (k: string, n: number) => interest.set(k, (interest.get(k) ?? 0) + n);

  const [views, favs, searches] = await Promise.all([
    prisma.gameView.findMany({ where: { userId }, select: { gameId: true } }),
    prisma.favorite.findMany({ where: { userId }, select: { gameId: true } }),
    prisma.searchHistory.findMany({ where: { userId }, select: { query: true } }),
  ]);

  for (const v of views) for (const k of genresOfGame.get(v.gameId) ?? []) add(k, W_VIEW);
  for (const f of favs) for (const k of genresOfGame.get(f.gameId) ?? []) add(k, W_FAVORITE);

  // Search -> Genre: (ก) query มีชื่อ Genre อยู่ข้างใน (ข) query (>=3 ตัวอักษร) เป็นส่วนหนึ่งของชื่อเกม
  // คำค้น 1 แถว นับแต่ละ Genre ได้ไม่เกิน +1
  for (const s of searches) {
    const q = norm(s.query);
    if (!q) continue;
    const hit = new Set<string>();
    for (const k of display.keys()) if (q.includes(k)) hit.add(k);
    if (q.length >= 3) {
      for (const g of games) {
        if (norm(g.name).includes(q)) for (const k of genresOfGame.get(g.id) ?? []) hit.add(k);
      }
    }
    for (const k of hit) add(k, W_SEARCH);
  }

  return { interest, display };
}

export async function getRecommendations(userId?: number, limit = LIMIT) {
  const spec = userId ? await loadUserSpec(userId) : null;
  const favIds = await getFavoriteIds(userId);
  const [games, popMap] = await Promise.all([prisma.game.findMany(), getPopularityMap()]);

  const { interest, display } = userId
    ? await computeInterest(userId, games)
    : { interest: new Map<string, number>(), display: new Map<string, string>() };

  const hasInterest = [...interest.values()].some((v) => v > 0);

  const scored = games
    .map((g) => ({
      dto: toDto(g, popMap.get(g.id) ?? 0, spec, favIds),
      score: parseList(g.genres).reduce((sum, name) => sum + (interest.get(norm(name)) ?? 0), 0),
    }))
    // ไม่แนะนำเกมที่ไม่ผ่าน (specCheck เป็น null = ไม่ใช่ fail) และเกมที่เป็น Favorite แล้ว
    .filter((x) => x.dto.specCheck?.status !== "fail" && !x.dto.isFavorite);

  scored.sort((a, b) => {
    const byScore = hasInterest ? b.score - a.score : 0;
    return byScore || b.dto.popularity - a.dto.popularity || a.dto.name.localeCompare(b.dto.name);
  });

  const topGenres = hasInterest
    ? [...interest.entries()]
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 2)
        .map(([k]) => display.get(k) ?? k)
    : [];

  return {
    items: scored.slice(0, limit).map((x) => x.dto),
    specReady: spec !== null,
    basedOn: hasInterest ? ("interest" as const) : ("popular" as const),
    topGenres,
  };
}