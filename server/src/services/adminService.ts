import { prisma } from "../db";
import { HttpError } from "../utils/httpError";

export interface RequirementSet {
  cpuTier: number;
  gpuTier: number;
  ramGb: number;
}

export interface GameInput {
  name: string;
  description: string;
  genres: string[];
  tags: string[];
  platforms: string[];
  price: number;
  releaseDate: string; // YYYY-MM-DD
  difficulty: "Easy" | "Medium" | "Hard";
  multiplayer: boolean;
  playTime: number;
  isIndie: boolean;
  image?: string;
  // null/ไม่ส่ง = ไม่ใช่เกม PC
  requirements?: { min: RequirementSet; rec: RequirementSet } | null;
}

function parseList(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// ตัดรายการซ้ำ (ไม่สนตัวพิมพ์เล็กใหญ่) แต่คงการสะกดของรายการแรกไว้
function unique(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

// ---------------------------------------------------------------- สถิติ
export async function getStats() {
  const [users, games, searches, views, favorites, gameRows, viewRows, favRows] = await Promise.all([
    prisma.user.count(),
    prisma.game.count(),
    prisma.searchHistory.count(),
    prisma.gameView.count(),
    prisma.favorite.count(),
    prisma.game.findMany({ select: { id: true, name: true, genres: true } }),
    prisma.gameView.findMany({ select: { gameId: true } }),
    prisma.favorite.findMany({ select: { gameId: true } }),
  ]);

  const viewCount = new Map<number, number>();
  for (const v of viewRows) viewCount.set(v.gameId, (viewCount.get(v.gameId) ?? 0) + 1);
  const favCount = new Map<number, number>();
  for (const f of favRows) favCount.set(f.gameId, (favCount.get(f.gameId) ?? 0) + 1);

  const perGame = gameRows.map((g) => {
    const v = viewCount.get(g.id) ?? 0;
    const f = favCount.get(g.id) ?? 0;
    return { id: g.id, name: g.name, genres: parseList(g.genres), views: v, favorites: f, popularity: v + f };
  });

  // Top Games = popularity (View + Favorite) 5 อันดับ
  const topGames = perGame
    .filter((g) => g.popularity > 0)
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((g) => ({ id: g.id, name: g.name, views: g.views, favorites: g.favorites, popularity: g.popularity }));

  // Top Genres = รวม popularity ของเกมในแต่ละ Genre 5 อันดับ
  const genreScore = new Map<string, number>();
  for (const g of perGame) {
    for (const genre of g.genres) genreScore.set(genre, (genreScore.get(genre) ?? 0) + g.popularity);
  }
  const topGenres = Array.from(genreScore.entries())
    .filter((entry) => entry[1] > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map((entry) => ({ genre: entry[0], score: entry[1] }));

  return { totals: { users, games, searches, views, favorites }, topGames, topGenres };
}

// ---------------------------------------------------------------- เพิ่ม/แก้/ลบเกม
function buildData(input: GameInput) {
  const date = new Date(`${input.releaseDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.releaseDate) {
    throw new HttpError(400, "วันที่วางขายไม่ถูกต้อง");
  }

  let image = (input.image ?? "").trim();
  if (image && !/^https?:\/\//i.test(image)) {
    throw new HttpError(400, "ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://");
  }
  if (!image) image = `https://picsum.photos/seed/game-${Date.now()}/600/400`;

  const req = input.requirements ?? null;
  if (req) {
    if (
      req.rec.cpuTier < req.min.cpuTier ||
      req.rec.gpuTier < req.min.gpuTier ||
      req.rec.ramGb < req.min.ramGb
    ) {
      throw new HttpError(400, "ค่าที่แนะนำ (Rec) ต้องไม่ต่ำกว่าค่าขั้นต่ำ (Min) ในทุกด้าน");
    }
  }

  return {
    name: input.name,
    description: input.description,
    genres: JSON.stringify(unique(input.genres)),
    tags: JSON.stringify(unique(input.tags)),
    platforms: JSON.stringify(unique(input.platforms)),
    price: input.price,
    releaseDate: date,
    difficulty: input.difficulty,
    multiplayer: input.multiplayer,
    playTime: input.playTime,
    isIndie: input.isIndie,
    image,
    minCpuTier: req ? req.min.cpuTier : null,
    minGpuTier: req ? req.min.gpuTier : null,
    minRamGb: req ? req.min.ramGb : null,
    recCpuTier: req ? req.rec.cpuTier : null,
    recGpuTier: req ? req.rec.gpuTier : null,
    recRamGb: req ? req.rec.ramGb : null,
  };
}

async function assertNameFree(name: string, ignoreId?: number) {
  const found = await prisma.game.findUnique({ where: { name } });
  if (found && found.id !== ignoreId) throw new HttpError(409, "มีเกมชื่อนี้อยู่แล้ว");
}

export async function createGame(input: GameInput) {
  const data = buildData(input);
  await assertNameFree(data.name);
  const game = await prisma.game.create({ data });
  return { id: game.id, name: game.name };
}

export async function updateGame(id: number, input: GameInput) {
  const existing = await prisma.game.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "ไม่พบเกมนี้");
  const data = buildData(input);
  await assertNameFree(data.name, id);
  const game = await prisma.game.update({ where: { id }, data });
  return { id: game.id, name: game.name };
}

export async function deleteGame(id: number) {
  const existing = await prisma.game.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "ไม่พบเกมนี้");

  // ลบข้อมูลลูกก่อน แล้วลบเกม (ในธุรกรรมเดียว)
  const results = await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { gameId: id } }),
    prisma.gameView.deleteMany({ where: { gameId: id } }),
    prisma.game.delete({ where: { id } }),
  ]);

  return {
    deleted: true,
    id,
    name: existing.name,
    removedFavorites: results[0].count,
    removedViews: results[1].count,
  };
}