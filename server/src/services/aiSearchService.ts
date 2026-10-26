import { z } from "zod";
import { prisma } from "../db";
import { askGeminiJson } from "../ai/aiClient";
import {
  buildSearchSystemPrompt,
  buildSearchUserMessage,
  type Catalog,
} from "../ai/searchPrompt";
import { getFavoriteIds, getPopularityMap, toDto } from "./gameService";
import { loadUserSpec } from "./specCheckService";

type GameDto = ReturnType<typeof toDto>;

export interface AiFilters {
  genres: string[] | null;
  platforms: string[] | null;
  multiplayer: boolean | null;
  difficulty: string[] | null;
  isIndie: boolean | null;
  maxPrice: number | null;
  tags: string[] | null;
  compatibleWithMySpec: boolean | null;
}

const MAX_RESULTS = 12;
const norm = (s: string) => s.trim().toLowerCase();

// ---------- ตรวจ JSON ที่ AI ตอบ ----------
const strList = z.array(z.string()).nullable().optional();
const rawSchema = z.object({
  genres: strList,
  platforms: strList,
  multiplayer: z.boolean().nullable().optional(),
  difficulty: strList,
  isIndie: z.boolean().nullable().optional(),
  maxPrice: z.number().nullable().optional(),
  tags: strList,
  compatibleWithMySpec: z.boolean().nullable().optional(),
});

function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

// เก็บเฉพาะค่าที่มีจริงในข้อมูล (แปลงตัวพิมพ์ให้ตรงกับของจริง)
function pickKnown(values: string[] | null | undefined, known: string[]): string[] | null {
  if (!values) return null;
  const map = new Map(known.map((k): [string, string] => [norm(k), k]));
  const out: string[] = [];
  for (const v of values) {
    const hit = map.get(norm(v));
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out.length > 0 ? out : null;
}

function sanitize(raw: z.infer<typeof rawSchema>, catalog: Catalog): AiFilters {
  const price = raw.maxPrice;
  return {
    genres: pickKnown(raw.genres, catalog.genres),
    platforms: pickKnown(raw.platforms, catalog.platforms),
    multiplayer: raw.multiplayer ?? null,
    difficulty: pickKnown(raw.difficulty, ["Easy", "Medium", "Hard"]),
    isIndie: raw.isIndie ?? null,
    maxPrice: typeof price === "number" && Number.isFinite(price) && price >= 0 ? Math.floor(price) : null,
    tags: pickKnown(raw.tags, catalog.tags),
    compatibleWithMySpec: raw.compatibleWithMySpec ?? null,
  };
}

function hasAnyFilter(f: AiFilters): boolean {
  return Object.values(f).some((v) => v !== null);
}

function buildCatalog(dtos: GameDto[]): Catalog {
  const uniq = (xs: string[]) => Array.from(new Set(xs)).sort();
  return {
    genres: uniq(dtos.flatMap((g) => g.genres)),
    platforms: uniq(dtos.flatMap((g) => g.platforms)),
    tags: uniq(dtos.flatMap((g) => g.tags)),
  };
}

async function askForFilters(query: string, catalog: Catalog): Promise<AiFilters> {
  const text = await askGeminiJson(
    buildSearchSystemPrompt(catalog),
    buildSearchUserMessage(query)
  );
  const parsed = rawSchema.safeParse(parseJson(text));
  if (!parsed.success) throw new Error("AI ตอบ JSON ผิดรูป");
  return sanitize(parsed.data, catalog);
}

// ---------- ค้นจาก DB ----------
function applyFilters(dtos: GameDto[], f: AiFilters, useSpec: boolean): GameDto[] {
  const { genres, platforms, multiplayer, difficulty, isIndie, maxPrice, tags } = f;
  let items = dtos;

  if (genres) {
    const want = genres.map(norm);
    items = items.filter((g) => g.genres.some((x) => want.includes(norm(x))));
  }
  if (platforms) {
    const want = platforms.map(norm);
    items = items.filter((g) => g.platforms.some((x) => want.includes(norm(x))));
  }
  if (difficulty) {
    const want = difficulty.map(norm);
    items = items.filter((g) => want.includes(norm(g.difficulty)));
  }
  if (multiplayer !== null) items = items.filter((g) => g.multiplayer === multiplayer);
  if (isIndie !== null) items = items.filter((g) => g.isIndie === isIndie);
  if (maxPrice !== null) items = items.filter((g) => g.price <= maxPrice);
  if (useSpec) items = items.filter((g) => g.specCheck && g.specCheck.status !== "fail");

  // tags ใช้จัดอันดับ ไม่ใช่ตัวกรอง
  const wantTags = (tags ?? []).map(norm);
  const tagScore = (g: GameDto) => g.tags.filter((t) => wantTags.includes(norm(t))).length;

  return [...items].sort(
    (a, b) =>
      tagScore(b) - tagScore(a) ||
      b.popularity - a.popularity ||
      a.name.localeCompare(b.name)
  );
}

// ---------- Fallback: keyword ----------
function keywordSearch(dtos: GameDto[], query: string): GameDto[] {
  const q = norm(query);
  const words = q.split(/\s+/).filter((w) => w.length >= 3);
  return dtos
    .map((g) => {
      const name = norm(g.name);
      let score = 0;
      if (name.includes(q)) score += 5;
      for (const w of words) if (name.includes(w)) score += 2;
      for (const x of [...g.genres, ...g.tags, ...g.platforms]) {
        if (x.length >= 2 && q.includes(norm(x))) score += 1;
      }
      return { g, score };
    })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.g.popularity - a.g.popularity ||
        a.g.name.localeCompare(b.g.name)
    )
    .map((x) => x.g);
}

// บันทึกประวัติค้นหา (ซ้ำใน 10 นาทีไม่บันทึก, error ไม่ทำให้การค้นล้ม)
async function saveSearch(userId: number, query: string): Promise<void> {
  try {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const dup = await prisma.searchHistory.findFirst({
      where: { userId, query, createdAt: { gte: since } },
    });
    if (!dup) await prisma.searchHistory.create({ data: { userId, query } });
  } catch (err) {
    console.error("[ai/search] บันทึก SearchHistory ไม่สำเร็จ:", err);
  }
}

export async function aiSearch(query: string, userId?: number) {
  const spec = userId ? await loadUserSpec(userId) : null;
  const favIds = await getFavoriteIds(userId);
  const [games, popMap] = await Promise.all([prisma.game.findMany(), getPopularityMap()]);
  const dtos = games.map((g) => toDto(g, popMap.get(g.id) ?? 0, spec, favIds));
  const specReady = spec !== null;

  if (userId) await saveSearch(userId, query);

  let filters: AiFilters | null = null;
  try {
    filters = await askForFilters(query, buildCatalog(dtos));
  } catch (err) {
    console.error("[ai/search] AI ใช้ไม่ได้ จึงใช้ keyword แทน:", err instanceof Error ? err.message : err);
  }

  if (!filters) {
    const found = keywordSearch(dtos, query);
    return {
      items: found.slice(0, MAX_RESULTS),
      total: found.length,
      specReady,
      usedAi: false,
      understood: null,
      needSpec: false,
      notice: "AI ไม่พร้อมใช้งานตอนนี้ จึงค้นด้วยคำสำคัญแทน (ตรงกับชื่อเกม/ประเภท/แท็ก)",
    };
  }

  if (!hasAnyFilter(filters)) {
    return {
      items: [] as GameDto[],
      total: 0,
      specReady,
      usedAi: true,
      understood: filters,
      needSpec: false,
      notice: "AI ยังจับเงื่อนไขที่ชัดเจนจากประโยคนี้ไม่ได้ ลองระบุประเภทเกม ราคา หรือแพลตฟอร์ม",
    };
  }

  const wantsSpec = filters.compatibleWithMySpec === true;
  const needSpec = wantsSpec && !spec;
  const found = applyFilters(dtos, filters, wantsSpec && !!spec);

  return {
    items: found.slice(0, MAX_RESULTS),
    total: found.length,
    specReady,
    usedAi: true,
    understood: filters,
    needSpec,
    notice: needSpec
      ? "คุณต้องการเกมที่เครื่องเล่นได้ แต่ยังไม่ได้ตั้งสเปค (หรือยังไม่ได้เข้าสู่ระบบ) จึงยังไม่ได้กรองตามสเปค"
      : null,
  };
}